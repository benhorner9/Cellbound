create or replace function public.manor_set_ready(
  p_session_id uuid,
  p_ready boolean
) returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid:=auth.uid();
  v_session public.raid_sessions%rowtype;
  v_is_leader boolean;
  v_ready_a boolean;
  v_ready_b boolean;
  v_start_at timestamptz;
  v_state jsonb;
  v_ready_path text[];
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select * into v_session
  from public.raid_sessions
  where id=p_session_id
  for update;

  if not found then raise exception 'Raid session not found'; end if;
  if v_session.status<>'active' then raise exception 'The raid is not active'; end if;

  if not exists (
    select 1 from public.party_finder_members m
    where m.listing_id=v_session.listing_id and m.user_id=v_user
  ) then
    raise exception 'You are not in this raid';
  end if;

  v_is_leader:=v_user=v_session.leader_id;
  v_state:=v_session.state;

  if coalesce(v_state->>'readyStage','')<>v_session.stage then
    v_state:=v_state || jsonb_build_object(
      'readyStage',v_session.stage,
      'readyA',false,
      'readyB',false,
      'countdownStartedAt',null,
      'encounterStartAt',null,
      'stageStartedAt',null
    );
  end if;

  if nullif(v_state->>'encounterStartAt','') is not null then
    return jsonb_build_object('ok',true,'state',v_state,'serverNow',now(),'locked',true);
  end if;

  v_ready_path:=case when v_is_leader then array['readyA']::text[] else array['readyB']::text[] end;
  v_state:=jsonb_set(v_state,v_ready_path,to_jsonb(coalesce(p_ready,false)),true);

  v_ready_a:=coalesce((v_state->>'readyA')::boolean,false);
  v_ready_b:=coalesce((v_state->>'readyB')::boolean,false);

  if v_ready_a and v_ready_b then
    v_start_at:=now()+interval '3 seconds';
    v_state:=v_state || jsonb_build_object(
      'countdownStartedAt',now(),
      'encounterStartAt',v_start_at,
      'stageStartedAt',v_start_at
    );
  end if;

  update public.raid_sessions
  set state=v_state, updated_at=now()
  where id=p_session_id
  returning state into v_state;

  return jsonb_build_object(
    'ok',true,
    'state',v_state,
    'serverNow',now(),
    'locked',v_ready_a and v_ready_b
  );
end
$$;

revoke all on function public.manor_set_ready(uuid,boolean) from public;
revoke execute on function public.manor_set_ready(uuid,boolean) from anon;
grant execute on function public.manor_set_ready(uuid,boolean) to authenticated;
