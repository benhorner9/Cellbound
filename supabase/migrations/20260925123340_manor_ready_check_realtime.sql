do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='raid_sessions'
  ) then
    alter publication supabase_realtime add table public.raid_sessions;
  end if;
end
$$;

CREATE OR REPLACE FUNCTION public.start_manor_raid(p_listing_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid:=auth.uid();
  v_listing public.party_finder_listings%rowtype;
  v_count integer;
  v_ready integer;
  v_unlocked integer;
  v_start timestamptz:=to_timestamp(floor(extract(epoch from now())/172800)*172800);
  v_blocked integer;
  v_session uuid;
  v_last_completed uuid;
  v_claimed integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select * into v_listing from public.party_finder_listings where id=p_listing_id for update;
  if not found or v_listing.content_type<>'raid' or v_listing.target_id<>'manor'
    then raise exception 'The Manor raid group was not found';
  end if;
  if v_listing.leader_id<>v_user then raise exception 'Only the group leader can start the raid'; end if;

  select id into v_session from public.raid_sessions
   where listing_id=p_listing_id and status='active' limit 1;
  if v_session is not null then return v_session; end if;

  select count(*) into v_count from public.party_finder_members where listing_id=p_listing_id;
  if v_count<>2 then raise exception 'The Manor requires exactly 2 players'; end if;

  select count(*) into v_ready from public.party_finder_members
   where listing_id=p_listing_id
     and jsonb_typeof(party_snapshot)='array'
     and jsonb_array_length(party_snapshot)=5;
  if v_ready<>2 then raise exception 'Both players must lock in a complete five-character party'; end if;

  select count(*) into v_unlocked
  from public.party_finder_members m
  join public.guild_accounts g on g.user_id=m.user_id
  where m.listing_id=p_listing_id
    and lower(coalesce(g.game_state #>> '{progression,manorRaidUnlocked}','false'))='true';
  if v_unlocked<>2 then raise exception 'Both players must complete the Manor attunement'; end if;

  select id into v_last_completed
  from public.raid_sessions
  where listing_id=p_listing_id and status='completed'
  order by completed_at desc nulls last, started_at desc
  limit 1;

  if v_last_completed is not null then
    select count(*) into v_claimed
    from public.raid_reward_claims r
    where r.session_id=v_last_completed
      and r.user_id in (select user_id from public.party_finder_members where listing_id=p_listing_id);
    if v_claimed<2 then
      raise exception 'Both players must collect their previous Manor rewards before another run can begin';
    end if;
  end if;

  insert into public.raid_lockouts(user_id,raid_id,window_start,runs_used)
  select m.user_id,'manor',v_start,0 from public.party_finder_members m where m.listing_id=p_listing_id
  on conflict(user_id,raid_id) do update
    set window_start=excluded.window_start,
        runs_used=case when public.raid_lockouts.window_start=excluded.window_start then public.raid_lockouts.runs_used else 0 end,
        updated_at=now();

  select count(*) into v_blocked
  from public.raid_lockouts l
  join public.party_finder_members m on m.user_id=l.user_id
  where m.listing_id=p_listing_id and l.raid_id='manor'
    and l.window_start=v_start and l.runs_used>=3;
  if v_blocked>0 then raise exception 'A player in this group has used all Manor runs for this reset'; end if;

  update public.raid_lockouts l
     set runs_used=runs_used+1,updated_at=now()
   where l.raid_id='manor'
     and l.user_id in (select user_id from public.party_finder_members where listing_id=p_listing_id);

  insert into public.raid_sessions(listing_id,leader_id,state)
  values(
    p_listing_id,v_user,
    jsonb_build_object(
      'stageStartedAt',null,
      'readyStage','butler',
      'readyA',false,'readyB',false,
      'countdownStartedAt',null,'encounterStartAt',null,
      'maidPenaltyA',0,'maidPenaltyB',0,
      'screechCountA',0,'screechCountB',0,
      'screechSuccessA',0,'screechSuccessB',0,
      'events',jsonb_build_array('The Manor doors close behind the raid.')
    )
  ) returning id into v_session;

  return v_session;
end
$function$
;
CREATE OR REPLACE FUNCTION public.advance_manor_raid(p_session_id uuid, p_expected_stage text, p_next_stage text, p_patch jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  select * into v_session from public.raid_sessions where id=p_session_id for update;
  if not found then raise exception 'Raid session not found'; end if;
  if v_session.leader_id<>v_user then raise exception 'Only the raid leader can advance encounters'; end if;
  if v_session.status<>'active' then return jsonb_build_object('ok',true,'stage',v_session.stage,'status',v_session.status); end if;
  if v_session.stage<>p_expected_stage then return jsonb_build_object('ok',true,'stage',v_session.stage,'status',v_session.status,'stale',true); end if;

  v_expected_next:=case v_session.stage
    when 'butler' then 'maids'
    when 'maids' then 'engineer'
    when 'engineer' then 'bedroom'
    when 'bedroom' then 'housebound'
    when 'housebound' then 'victory'
    else null
  end;
  if v_expected_next is null or p_next_stage<>v_expected_next then raise exception 'Invalid Manor encounter transition'; end if;

  begin
    v_started:=nullif(v_session.state->>'stageStartedAt','')::timestamptz;
  exception when others then
    v_started:=null;
  end;
  if v_started is null or now()<v_started then raise exception 'Both commanders must ready up before the encounter can progress'; end if;

  v_elapsed:=extract(epoch from (now()-v_started));
  v_min_seconds:=case v_session.stage
    when 'butler' then 30
    when 'maids' then 30
    when 'engineer' then 40
    when 'bedroom' then 12
    when 'housebound' then 40
    else 0
  end;
  if v_elapsed<v_min_seconds then raise exception 'Encounter is still in progress'; end if;

  if v_session.stage='maids' then
    v_a:=coalesce((v_session.state->>'screechCountA')::integer,0);
    v_b:=coalesce((v_session.state->>'screechCountB')::integer,0);
    if v_a<1 or v_b<1 then raise exception 'Both players must resolve Screech before the Maids can fall'; end if;
  end if;

  if p_next_stage='victory' then
    v_status:='completed';
    v_completed:=now();
  end if;

  update public.raid_sessions
  set stage=p_next_stage,status=v_status,
      state=case
        when p_next_stage='victory' then state || coalesce(p_patch,'{}'::jsonb)
        else state || coalesce(p_patch,'{}'::jsonb) || jsonb_build_object(
          'stageStartedAt',null,
          'readyStage',p_next_stage,
          'readyA',false,
          'readyB',false,
          'countdownStartedAt',null,
          'encounterStartAt',null
        )
      end,
      updated_at=now(),completed_at=v_completed
  where id=p_session_id
  returning * into v_session;

  return jsonb_build_object('ok',true,'stage',v_session.stage,'status',v_session.status,'state',v_session.state);
end
$function$
;
CREATE OR REPLACE FUNCTION public.manor_set_ready(p_session_id uuid, p_ready boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid:=auth.uid();
  v_session public.raid_sessions%rowtype;
  v_is_leader boolean;
  v_ready_a boolean;
  v_ready_b boolean;
  v_start_at timestamptz;
  v_state jsonb;
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

  v_state:=jsonb_set(
    v_state,
    case when v_is_leader then '{readyA}' else '{readyB}' end,
    to_jsonb(coalesce(p_ready,false)),
    true
  );

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
$function$
;

revoke all on function public.manor_set_ready(uuid,boolean) from public;
revoke execute on function public.manor_set_ready(uuid,boolean) from anon;
grant execute on function public.manor_set_ready(uuid,boolean) to authenticated;

revoke all on function public.start_manor_raid(uuid) from public;
grant execute on function public.start_manor_raid(uuid) to authenticated;

revoke all on function public.advance_manor_raid(uuid,text,text,jsonb) from public;
grant execute on function public.advance_manor_raid(uuid,text,text,jsonb) to authenticated;
