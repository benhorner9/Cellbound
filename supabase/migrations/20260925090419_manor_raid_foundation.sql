alter table public.party_finder_listings
  drop constraint if exists party_finder_listings_content_type_check;
alter table public.party_finder_listings
  add constraint party_finder_listings_content_type_check
  check (content_type = any (array['dungeon'::text,'world_boss'::text,'raid'::text]));

alter table public.party_finder_members
  add column if not exists party_snapshot jsonb not null default '[]'::jsonb;
alter table public.party_finder_members
  drop constraint if exists party_finder_members_party_snapshot_check;
alter table public.party_finder_members
  add constraint party_finder_members_party_snapshot_check
  check (jsonb_typeof(party_snapshot)='array' and jsonb_array_length(party_snapshot)<=5);

create table if not exists public.raid_sessions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references public.party_finder_listings(id) on delete cascade,
  raid_id text not null default 'manor' check (raid_id in ('manor')),
  leader_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','completed','failed','abandoned')),
  stage text not null default 'butler' check (stage in ('butler','maids','engineer','bedroom','housebound','victory')),
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state)='object'),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.raid_sessions enable row level security;
drop policy if exists "raid members can read sessions" on public.raid_sessions;
create policy "raid members can read sessions" on public.raid_sessions for select to authenticated
using (exists (select 1 from public.party_finder_members m where m.listing_id=raid_sessions.listing_id and m.user_id=(select auth.uid())));

create table if not exists public.raid_lockouts (
  user_id uuid not null references auth.users(id) on delete cascade,
  raid_id text not null default 'manor' check (raid_id in ('manor')),
  window_start timestamptz not null,
  runs_used integer not null default 0 check (runs_used between 0 and 3),
  updated_at timestamptz not null default now(),
  primary key(user_id,raid_id)
);
alter table public.raid_lockouts enable row level security;
drop policy if exists "users can read own raid lockouts" on public.raid_lockouts;
create policy "users can read own raid lockouts" on public.raid_lockouts for select to authenticated
using ((select auth.uid())=user_id);

create table if not exists public.raid_reward_claims (
  session_id uuid not null references public.raid_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_payload jsonb not null check (jsonb_typeof(reward_payload)='array'),
  claimed_at timestamptz not null default now(),
  primary key(session_id,user_id)
);
alter table public.raid_reward_claims enable row level security;
drop policy if exists "users can read own raid rewards" on public.raid_reward_claims;
create policy "users can read own raid rewards" on public.raid_reward_claims for select to authenticated
using ((select auth.uid())=user_id);

create or replace function public.create_party_finder_listing(
  p_content_type text,p_target_id text,p_target_label text,p_note text,p_party_ilvl numeric,p_player_cap integer
) returns uuid language plpgsql security definer set search_path='public' as $$
declare v_user uuid:=auth.uid();v_label text;v_id uuid;v_type text:=lower(coalesce(p_content_type,''));v_cap integer:=p_player_cap;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if v_type not in ('dungeon','raid') then raise exception 'Unsupported Party Finder activity'; end if;
  if v_type='raid' then
    if p_target_id<>'manor' then raise exception 'Unknown raid'; end if;
    v_cap:=2;
  elsif v_cap<2 or v_cap>8 then raise exception 'Player cap must be 2–8';
  end if;
  update public.party_finder_listings set status='closed' where leader_id=v_user and status in ('open','full');
  select nullif(btrim(game_state->>'socialDisplayName'),'') into v_label from public.guild_accounts where user_id=v_user;
  v_label:=coalesce(v_label,'Guild '||upper(substr(v_user::text,1,4)));
  insert into public.party_finder_listings(leader_id,guild_label,content_type,target_id,target_label,note,party_ilvl,player_cap)
  values(v_user,left(v_label,24),v_type,left(coalesce(p_target_id,''),80),left(coalesce(p_target_label,''),100),left(coalesce(p_note,''),180),greatest(0,p_party_ilvl),v_cap)
  returning id into v_id;
  insert into public.party_finder_members(listing_id,user_id,guild_label,party_ilvl)
  values(v_id,v_user,left(v_label,24),greatest(0,p_party_ilvl));
  return v_id;
end $$;

create or replace function public.sync_party_finder_party(p_listing_id uuid,p_party_snapshot jsonb,p_party_ilvl numeric)
returns jsonb language plpgsql security definer set search_path='public' as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_party_snapshot)<>'array' or jsonb_array_length(p_party_snapshot)<>5 then raise exception 'A complete five-character party is required'; end if;
  update public.party_finder_members set party_snapshot=p_party_snapshot,party_ilvl=greatest(0,p_party_ilvl)
  where listing_id=p_listing_id and user_id=v_user;
  if not found then raise exception 'You are not a member of this group'; end if;
  return jsonb_build_object('ok',true);
end $$;

create or replace function public.manor_lockout_status()
returns jsonb language plpgsql security invoker set search_path='public' as $$
declare v_user uuid:=auth.uid();v_start timestamptz:=to_timestamp(floor(extract(epoch from now())/172800)*172800);v_used integer:=0;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select case when window_start=v_start then runs_used else 0 end into v_used from public.raid_lockouts where user_id=v_user and raid_id='manor';
  v_used:=coalesce(v_used,0);
  return jsonb_build_object('runsUsed',v_used,'runsRemaining',greatest(0,3-v_used),'windowStart',v_start,'resetAt',v_start+interval '2 days');
end $$;

create or replace function public.start_manor_raid(p_listing_id uuid)
returns uuid language plpgsql security definer set search_path='public' as $$
declare
  v_user uuid:=auth.uid();v_listing public.party_finder_listings%rowtype;v_count integer;v_ready integer;v_unlocked integer;
  v_start timestamptz:=to_timestamp(floor(extract(epoch from now())/172800)*172800);v_blocked integer;v_session uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_listing from public.party_finder_listings where id=p_listing_id for update;
  if not found or v_listing.content_type<>'raid' or v_listing.target_id<>'manor' then raise exception 'The Manor raid group was not found'; end if;
  if v_listing.leader_id<>v_user then raise exception 'Only the group leader can start the raid'; end if;
  select id into v_session from public.raid_sessions where listing_id=p_listing_id and status='active' limit 1;
  if v_session is not null then return v_session; end if;
  select count(*) into v_count from public.party_finder_members where listing_id=p_listing_id;
  if v_count<>2 then raise exception 'The Manor requires exactly 2 players'; end if;
  select count(*) into v_ready from public.party_finder_members where listing_id=p_listing_id and jsonb_typeof(party_snapshot)='array' and jsonb_array_length(party_snapshot)=5;
  if v_ready<>2 then raise exception 'Both players must lock in a complete five-character party'; end if;
  select count(*) into v_unlocked from public.party_finder_members m join public.guild_accounts g on g.user_id=m.user_id
  where m.listing_id=p_listing_id and lower(coalesce(g.game_state #>> '{progression,manorRaidUnlocked}','false'))='true';
  if v_unlocked<>2 then raise exception 'Both players must complete the Manor attunement'; end if;
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
end $$;

create or replace function public.advance_manor_raid(p_session_id uuid,p_expected_stage text,p_next_stage text,p_patch jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='public' as $$
declare v_user uuid:=auth.uid();v_session public.raid_sessions%rowtype;v_status text:='active';v_completed timestamptz:=null;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_session from public.raid_sessions where id=p_session_id for update;
  if not found then raise exception 'Raid session not found'; end if;
  if v_session.leader_id<>v_user then raise exception 'Only the raid leader can advance encounters'; end if;
  if v_session.status<>'active' then return jsonb_build_object('ok',true,'stage',v_session.stage,'status',v_session.status); end if;
  if v_session.stage<>p_expected_stage then return jsonb_build_object('ok',true,'stage',v_session.stage,'status',v_session.status,'stale',true); end if;
  if p_next_stage not in ('butler','maids','engineer','bedroom','housebound','victory') then raise exception 'Invalid raid stage'; end if;
  if p_next_stage='victory' then v_status:='completed';v_completed:=now(); end if;
  update public.raid_sessions set stage=p_next_stage,status=v_status,
    state=state || coalesce(p_patch,'{}'::jsonb) || jsonb_build_object('stageStartedAt',now()),updated_at=now(),completed_at=v_completed
  where id=p_session_id returning * into v_session;
  return jsonb_build_object('ok',true,'stage',v_session.stage,'status',v_session.status,'state',v_session.state);
end $$;

create or replace function public.manor_screech_result(p_session_id uuid,p_success boolean)
returns jsonb language plpgsql security definer set search_path='public' as $$
declare
  v_user uuid:=auth.uid();v_session public.raid_sessions%rowtype;v_leader boolean;v_own_count_key text;v_own_success_key text;
  v_other_penalty_key text;v_count integer;v_successes integer;v_penalty integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select r.* into v_session from public.raid_sessions r where r.id=p_session_id for update;
  if not found or v_session.status<>'active' or v_session.stage<>'maids' then raise exception 'Screech is not active'; end if;
  if not exists(select 1 from public.party_finder_members m where m.listing_id=v_session.listing_id and m.user_id=v_user) then raise exception 'You are not in this raid'; end if;
  v_leader:=v_user=v_session.leader_id;
  v_own_count_key:=case when v_leader then 'screechCountA' else 'screechCountB' end;
  v_own_success_key:=case when v_leader then 'screechSuccessA' else 'screechSuccessB' end;
  v_other_penalty_key:=case when v_leader then 'maidPenaltyB' else 'maidPenaltyA' end;
  v_count:=coalesce((v_session.state->>v_own_count_key)::integer,0)+1;
  v_successes:=coalesce((v_session.state->>v_own_success_key)::integer,0)+(case when p_success then 1 else 0 end);
  v_penalty:=coalesce((v_session.state->>v_other_penalty_key)::integer,0)+(case when p_success then 0 else 1 end);
  update public.raid_sessions set state=jsonb_set(jsonb_set(jsonb_set(state,array[v_own_count_key],to_jsonb(v_count),true),array[v_own_success_key],to_jsonb(v_successes),true),array[v_other_penalty_key],to_jsonb(v_penalty),true),updated_at=now()
  where id=p_session_id returning state into v_session.state;
  return jsonb_build_object('ok',true,'state',v_session.state);
end $$;

create or replace function public.claim_manor_raid_rewards(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path='public' as $$
declare
  v_user uuid:=auth.uid();v_session public.raid_sessions%rowtype;v_snapshot jsonb;v_existing jsonb;v_payload jsonb;
  v_slots text[]:=array['Head','Shoulders','Chest','Hands','Waist','Legs','Feet','Weapon','OffHand','Ring','Trinket','Relic'];
  v_i1 integer;v_i2 integer;v_c1 text;v_c2 text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_session from public.raid_sessions where id=p_session_id;
  if not found or v_session.status<>'completed' then raise exception 'The raid is not complete'; end if;
  select reward_payload into v_existing from public.raid_reward_claims where session_id=p_session_id and user_id=v_user;
  if v_existing is not null then return v_existing; end if;
  select party_snapshot into v_snapshot from public.party_finder_members where listing_id=v_session.listing_id and user_id=v_user;
  if v_snapshot is null or jsonb_array_length(v_snapshot)<>5 then raise exception 'Raid party snapshot missing'; end if;
  v_i1:=floor(random()*5)::integer;v_i2:=floor(random()*5)::integer;
  v_c1:=coalesce(v_snapshot->v_i1->>'class','Warrior');v_c2:=coalesce(v_snapshot->v_i2->>'class','Warrior');
  v_payload:=jsonb_build_array(
    jsonb_build_object('class',v_c1,'slot',v_slots[1+floor(random()*array_length(v_slots,1))::integer],'tier',5),
    jsonb_build_object('class',v_c2,'slot',v_slots[1+floor(random()*array_length(v_slots,1))::integer],'tier',5)
  );
  insert into public.raid_reward_claims(session_id,user_id,reward_payload) values(p_session_id,v_user,v_payload);
  return v_payload;
end $$;

revoke all on function public.create_party_finder_listing(text,text,text,text,numeric,integer) from public;
revoke all on function public.sync_party_finder_party(uuid,jsonb,numeric) from public;
revoke all on function public.manor_lockout_status() from public;
revoke all on function public.start_manor_raid(uuid) from public;
revoke all on function public.advance_manor_raid(uuid,text,text,jsonb) from public;
revoke all on function public.manor_screech_result(uuid,boolean) from public;
revoke all on function public.claim_manor_raid_rewards(uuid) from public;

grant execute on function public.create_party_finder_listing(text,text,text,text,numeric,integer) to authenticated;
grant execute on function public.sync_party_finder_party(uuid,jsonb,numeric) to authenticated;
grant execute on function public.manor_lockout_status() to authenticated;
grant execute on function public.start_manor_raid(uuid) to authenticated;
grant execute on function public.advance_manor_raid(uuid,text,text,jsonb) to authenticated;
grant execute on function public.manor_screech_result(uuid,boolean) to authenticated;
grant execute on function public.claim_manor_raid_rewards(uuid) to authenticated;
