-- Promote the PlayCellbound account to Owner and expose a distinct, server-verified
-- owner badge in chat while preserving full administrator permissions.

alter table public.chat_messages
  drop constraint if exists chat_messages_sender_badge_check;

alter table public.chat_messages
  add constraint chat_messages_sender_badge_check
  check (sender_badge = any (array['player'::text,'mod'::text,'player_mod'::text,'owner'::text]));

create or replace function public.cellbound_social_identity()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_badge text := 'player';
  v_staff_member boolean := false;
  v_admin_role text;
  v_mod_role text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select a.role
    into v_admin_role
  from public.cellbound_admins a
  where a.user_id = v_uid;

  if found then
    v_badge := case when v_admin_role = 'owner' then 'owner' else 'mod' end;
    v_staff_member := true;
  else
    select m.role into v_mod_role
    from public.cellbound_moderators m
    where m.user_id = v_uid and m.active = true;

    if found then
      v_badge := v_mod_role;
      v_staff_member := (v_mod_role = 'mod');
    end if;
  end if;

  return jsonb_build_object(
    'chat_badge', v_badge,
    'staff_member', v_staff_member,
    'player_mod_discount_eligible', v_badge = 'player_mod'
  );
end;
$function$;

create or replace function public.post_chat_message(p_channel text, p_body text)
returns public.chat_messages
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := auth.uid();
  v_label text;
  v_body text := btrim(coalesce(p_body,''));
  v_row public.chat_messages%rowtype;
  v_last timestamptz;
  v_badge text := 'player';
  v_admin_role text;
  v_mod_role text;
  v_reason text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_channel not in ('world','trade','party') then raise exception 'Invalid channel'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 300 then raise exception 'Messages must be 1–300 characters'; end if;

  v_reason := public.cellbound_chat_block_reason(v_body);
  if v_reason is not null then
    raise exception 'That message contains language blocked by the Cellbound chat filter';
  end if;

  select created_at into v_last
  from public.chat_messages
  where user_id = v_user
  order by created_at desc
  limit 1;

  if v_last is not null and v_last > now() - interval '2 seconds' then
    raise exception 'Please wait before sending another message';
  end if;

  select nullif(btrim(game_state->>'socialDisplayName'),'')
    into v_label
  from public.guild_accounts
  where user_id = v_user;

  v_label := coalesce(v_label,'Guild '||upper(substr(v_user::text,1,4)));

  select a.role
    into v_admin_role
  from public.cellbound_admins a
  where a.user_id = v_user;

  if found then
    v_badge := case when v_admin_role = 'owner' then 'owner' else 'mod' end;
  else
    select m.role into v_mod_role
    from public.cellbound_moderators m
    where m.user_id = v_user and m.active = true;
    if found then v_badge := v_mod_role; end if;
  end if;

  insert into public.chat_messages(user_id,guild_label,channel,body,sender_badge)
  values(v_user,left(v_label,24),p_channel,v_body,v_badge)
  returning * into v_row;

  return v_row;
end;
$function$;

do $$
declare
  v_owner_id uuid;
begin
  select id
    into v_owner_id
  from auth.users
  where lower(email) = lower('playcellbound@gmail.com')
  order by created_at asc
  limit 1;

  if v_owner_id is null then
    raise exception 'PlayCellbound owner account was not found';
  end if;

  insert into public.cellbound_admins(user_id,role)
  values(v_owner_id,'owner')
  on conflict (user_id) do update
    set role = 'owner',
        updated_at = now();

  update public.chat_messages
  set sender_badge = 'owner'
  where user_id = v_owner_id;
end
$$;
