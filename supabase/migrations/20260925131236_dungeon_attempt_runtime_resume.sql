alter table public.dungeon_attempts
  add column if not exists runtime_state jsonb not null default '{}'::jsonb,
  add column if not exists runtime_updated_at timestamptz;

alter table public.dungeon_attempts
  drop constraint if exists dungeon_attempts_runtime_state_object;
alter table public.dungeon_attempts
  add constraint dungeon_attempts_runtime_state_object
  check (jsonb_typeof(runtime_state)='object');

create or replace function public.save_dungeon_attempt_runtime(
  p_attempt_id uuid,
  p_runtime_state jsonb
) returns jsonb
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_uid uuid:=auth.uid();
  v_attempt public.dungeon_attempts%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_runtime_state is null or jsonb_typeof(p_runtime_state)<>'object' then raise exception 'Runtime state must be an object'; end if;
  if octet_length(p_runtime_state::text)>1048576 then raise exception 'Runtime state is too large'; end if;
  select * into v_attempt from public.dungeon_attempts where id=p_attempt_id and user_id=v_uid for update;
  if not found then raise exception 'Dungeon attempt not found'; end if;
  if v_attempt.status<>'active' then return jsonb_build_object('ok',false,'reason','attempt-not-active','status',v_attempt.status); end if;
  if now()-v_attempt.started_at>interval '4 hours' then
    update public.dungeon_attempts set status='invalid',completed_at=now(),invalid_reason='expired' where id=p_attempt_id;
    return jsonb_build_object('ok',false,'reason','expired');
  end if;
  update public.dungeon_attempts set runtime_state=p_runtime_state,runtime_updated_at=now() where id=p_attempt_id;
  return jsonb_build_object('ok',true,'attemptId',p_attempt_id,'serverNow',now());
end
$$;

create or replace function public.resume_dungeon_attempt(p_dungeon_id text) returns jsonb
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  v_uid uuid:=auth.uid();
  v_attempt public.dungeon_attempts%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_attempt
  from public.dungeon_attempts
  where user_id=v_uid and dungeon_id=p_dungeon_id and status='active'
  order by started_at desc limit 1 for update;
  if not found then return jsonb_build_object('active',false); end if;
  if now()-v_attempt.started_at>interval '4 hours' then
    update public.dungeon_attempts set status='invalid',completed_at=now(),invalid_reason='expired' where id=v_attempt.id;
    return jsonb_build_object('active',false,'reason','expired');
  end if;
  return jsonb_build_object(
    'active',true,'attemptId',v_attempt.id,'dungeonId',v_attempt.dungeon_id,
    'difficulty',v_attempt.difficulty,'tier',v_attempt.tier,'seasonId',v_attempt.season_id,
    'dungeonVersion',v_attempt.dungeon_version,'targetTimeMs',v_attempt.target_time_ms,
    'seed',v_attempt.seed,'party',v_attempt.party_snapshot,'startedAt',v_attempt.started_at,
    'runtimeState',v_attempt.runtime_state,'runtimeUpdatedAt',v_attempt.runtime_updated_at,'serverNow',now()
  );
end
$$;

revoke all on function public.save_dungeon_attempt_runtime(uuid,jsonb) from public;
revoke execute on function public.save_dungeon_attempt_runtime(uuid,jsonb) from anon;
grant execute on function public.save_dungeon_attempt_runtime(uuid,jsonb) to authenticated;

revoke all on function public.resume_dungeon_attempt(text) from public;
revoke execute on function public.resume_dungeon_attempt(text) from anon;
grant execute on function public.resume_dungeon_attempt(text) to authenticated;