create or replace function public.advance_manor_raid(
  p_session_id uuid,
  p_expected_stage text,
  p_next_stage text,
  p_patch jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_user uuid:=auth.uid();
  v_session public.raid_sessions%rowtype;
  v_status text:='active';
  v_completed timestamptz:=null;
  v_expected_next text;
  v_started timestamptz;
  v_elapsed numeric;
  v_min_seconds numeric;
  v_a integer;
  v_b integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select * into v_session
  from public.raid_sessions
  where id=p_session_id
  for update;

  if not found then raise exception 'Raid session not found'; end if;
  if v_session.leader_id<>v_user then raise exception 'Only the raid leader can advance encounters'; end if;

  if v_session.status<>'active' then
    return jsonb_build_object('ok',true,'stage',v_session.stage,'status',v_session.status);
  end if;

  if v_session.stage<>p_expected_stage then
    return jsonb_build_object('ok',true,'stage',v_session.stage,'status',v_session.status,'stale',true);
  end if;

  v_expected_next:=case v_session.stage
    when 'butler' then 'maids'
    when 'maids' then 'engineer'
    when 'engineer' then 'bedroom'
    when 'bedroom' then 'housebound'
    when 'housebound' then 'victory'
    else null
  end;

  if v_expected_next is null or p_next_stage<>v_expected_next then
    raise exception 'Invalid Manor encounter transition';
  end if;

  begin
    v_started:=(v_session.state->>'stageStartedAt')::timestamptz;
  exception when others then
    v_started:=v_session.updated_at;
  end;

  v_elapsed:=extract(epoch from (now()-coalesce(v_started,v_session.updated_at)));
  v_min_seconds:=case v_session.stage
    when 'butler' then 30
    when 'maids' then 30
    when 'engineer' then 40
    when 'bedroom' then 12
    when 'housebound' then 95
    else 0
  end;

  if v_elapsed<v_min_seconds then
    raise exception 'Encounter is still in progress';
  end if;

  if v_session.stage='maids' then
    v_a:=coalesce((v_session.state->>'screechCountA')::integer,0);
    v_b:=coalesce((v_session.state->>'screechCountB')::integer,0);
    if v_a<1 or v_b<1 then
      raise exception 'Both players must resolve Screech before the Maids can fall';
    end if;
  end if;

  if p_next_stage='victory' then
    v_status:='completed';
    v_completed:=now();
  end if;

  update public.raid_sessions
     set stage=p_next_stage,
         status=v_status,
         state=state || coalesce(p_patch,'{}'::jsonb) || jsonb_build_object('stageStartedAt',now()),
         updated_at=now(),
         completed_at=v_completed
   where id=p_session_id
   returning * into v_session;

  return jsonb_build_object('ok',true,'stage',v_session.stage,'status',v_session.status,'state',v_session.state);
end
$$;

revoke all on function public.advance_manor_raid(uuid,text,text,jsonb) from public;
grant execute on function public.advance_manor_raid(uuid,text,text,jsonb) to authenticated;
