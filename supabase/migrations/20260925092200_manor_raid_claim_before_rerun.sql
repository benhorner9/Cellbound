create or replace function public.start_manor_raid(p_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path='public'
as $$
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
  if not found or v_listing.content_type<>'raid' or v_listing.target_id<>'manor' then raise exception 'The Manor raid group was not found'; end if;
  if v_listing.leader_id<>v_user then raise exception 'Only the group leader can start the raid'; end if;

  select id into v_session from public.raid_sessions where listing_id=p_listing_id and status='active' limit 1;
  if v_session is not null then return v_session; end if;

  select count(*) into v_count from public.party_finder_members where listing_id=p_listing_id;
  if v_count<>2 then raise exception 'The Manor requires exactly 2 players'; end if;
  select count(*) into v_ready from public.party_finder_members
  where listing_id=p_listing_id and jsonb_typeof(party_snapshot)='array' and jsonb_array_length(party_snapshot)=5;
  if v_ready<>2 then raise exception 'Both players must lock in a complete five-character party'; end if;

  select count(*) into v_unlocked
  from public.party_finder_members m join public.guild_accounts g on g.user_id=m.user_id
  where m.listing_id=p_listing_id and lower(coalesce(g.game_state #>> '{progression,manorRaidUnlocked}','false'))='true';
  if v_unlocked<>2 then raise exception 'Both players must complete the Manor attunement'; end if;

  select id into v_last_completed from public.raid_sessions
  where listing_id=p_listing_id and status='completed'
  order by completed_at desc nulls last,started_at desc limit 1;
  if v_last_completed is not null then
    select count(*) into v_claimed from public.raid_reward_claims r
    where r.session_id=v_last_completed
      and r.user_id in (select user_id from public.party_finder_members where listing_id=p_listing_id);
    if v_claimed<2 then raise exception 'Both players must collect their previous Manor rewards before another run can begin'; end if;
  end if;

  insert into public.raid_lockouts(user_id,raid_id,window_start,runs_used)
  select m.user_id,'manor',v_start,0 from public.party_finder_members m where m.listing_id=p_listing_id
  on conflict(user_id,raid_id) do update set window_start=excluded.window_start,
    runs_used=case when public.raid_lockouts.window_start=excluded.window_start then public.raid_lockouts.runs_used else 0 end,updated_at=now();

  select count(*) into v_blocked from public.raid_lockouts l join public.party_finder_members m on m.user_id=l.user_id
  where m.listing_id=p_listing_id and l.raid_id='manor' and l.window_start=v_start and l.runs_used>=3;
  if v_blocked>0 then raise exception 'A player in this group has used all Manor runs for this reset'; end if;

  update public.raid_lockouts l set runs_used=runs_used+1,updated_at=now()
  where l.raid_id='manor' and l.user_id in (select user_id from public.party_finder_members where listing_id=p_listing_id);

  insert into public.raid_sessions(listing_id,leader_id,state)
  values(p_listing_id,v_user,jsonb_build_object('stageStartedAt',now(),'maidPenaltyA',0,'maidPenaltyB',0,'screechCountA',0,'screechCountB',0,'screechSuccessA',0,'screechSuccessB',0,'events',jsonb_build_array('The Manor doors close behind the raid.')))
  returning id into v_session;
  return v_session;
end
$$;

revoke execute on function public.start_manor_raid(uuid) from anon;
grant execute on function public.start_manor_raid(uuid) to authenticated;
