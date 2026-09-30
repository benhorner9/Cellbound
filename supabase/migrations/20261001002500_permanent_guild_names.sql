-- Make the chosen guild name permanent at account level.
-- Existing socialDisplayName values are promoted into the account-level lock.

alter table public.guild_accounts
  add column if not exists guild_name text;

update public.guild_accounts
set guild_name = nullif(regexp_replace(btrim(game_state->>'socialDisplayName'),'\s+',' ','g'),'')
where guild_name is null
  and nullif(btrim(game_state->>'socialDisplayName'),'') is not null;

alter table public.guild_accounts
  drop constraint if exists guild_accounts_guild_name_length_check;

alter table public.guild_accounts
  add constraint guild_accounts_guild_name_length_check
  check (
    guild_name is null
    or (
      char_length(guild_name) between 3 and 24
      and guild_name = btrim(guild_name)
    )
  );

create or replace function public.cellbound_enforce_guild_name_lock()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_candidate text;
begin
  if tg_op = 'UPDATE' and nullif(btrim(old.guild_name),'') is not null then
    new.guild_name := old.guild_name;
  else
    v_candidate := nullif(
      regexp_replace(
        btrim(coalesce(new.guild_name,new.game_state->>'socialDisplayName','')),
        '\s+',
        ' ',
        'g'
      ),
      ''
    );

    if v_candidate is not null then
      if char_length(v_candidate) < 3 or char_length(v_candidate) > 24 then
        raise exception 'Guild names must be 3–24 characters';
      end if;
      new.guild_name := v_candidate;
    end if;
  end if;

  if nullif(btrim(new.guild_name),'') is not null then
    new.game_state := jsonb_set(
      coalesce(new.game_state,'{}'::jsonb),
      '{socialDisplayName}',
      to_jsonb(new.guild_name),
      true
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists cellbound_enforce_guild_name_lock on public.guild_accounts;
create trigger cellbound_enforce_guild_name_lock
before insert or update on public.guild_accounts
for each row
execute function public.cellbound_enforce_guild_name_lock();

create or replace function public.cellbound_lock_guild_name(p_name text)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_name text := nullif(regexp_replace(btrim(coalesce(p_name,'')),'\s+',' ','g'),'');
  v_existing text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if v_name is null or char_length(v_name) < 3 or char_length(v_name) > 24 then
    raise exception 'Guild names must be 3–24 characters';
  end if;

  select guild_name
    into v_existing
  from public.guild_accounts
  where user_id = v_uid
  for update;

  if not found then
    insert into public.guild_accounts(user_id,guild_name,game_state,updated_at)
    values(
      v_uid,
      v_name,
      jsonb_build_object('socialDisplayName',v_name),
      now()
    );
    return v_name;
  end if;

  if nullif(btrim(v_existing),'') is not null then
    if v_existing = v_name then
      return v_existing;
    end if;
    raise exception 'Your guild name is permanent and cannot be changed';
  end if;

  update public.guild_accounts
  set guild_name = v_name,
      game_state = jsonb_set(
        coalesce(game_state,'{}'::jsonb),
        '{socialDisplayName}',
        to_jsonb(v_name),
        true
      ),
      updated_at = now()
  where user_id = v_uid;

  return v_name;
end;
$function$;

revoke all on function public.cellbound_lock_guild_name(text) from public;
grant execute on function public.cellbound_lock_guild_name(text) to authenticated;
