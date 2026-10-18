-- Cellbound PvP Block 3: persistent online matchmaking foundation.
-- No public match/reward service is enabled by this migration.
-- Clients may request/cancel their OWN waiting queue entry only.
-- A trusted service-role worker exclusively pairs players and writes matches,
-- commands, snapshots and outcomes. Never accept client-submitted results.
create table if not exists public.cellbound_pvp_queue_entries(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 mode text not null check(mode in ('arena','capture-the-flag','king-of-the-hill')),
 squad_size integer not null check((mode='arena' and squad_size in (2,3,5)) or (mode in ('capture-the-flag','king-of-the-hill') and squad_size=5)),
 status text not null default 'waiting' check(status in ('waiting','matched','cancelled','expired')),
 match_id uuid,
 joined_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '10 minutes'),
 constraint cellbound_pvp_queue_lifetime check(expires_at>joined_at and expires_at<=joined_at+interval '30 minutes')
);
create unique index if not exists cellbound_pvp_queue_one_waiting_user
 on public.cellbound_pvp_queue_entries(user_id) where status='waiting';
create index if not exists cellbound_pvp_queue_pairing
 on public.cellbound_pvp_queue_entries(mode,squad_size,joined_at,id) where status='waiting';

create table if not exists public.cellbound_pvp_matches(
 id uuid primary key default gen_random_uuid(),
 mode text not null check(mode in ('arena','capture-the-flag','king-of-the-hill')),
 squad_size integer not null check((mode='arena' and squad_size in (2,3,5)) or (mode in ('capture-the-flag','king-of-the-hill') and squad_size=5)),
 status text not null default 'forming' check(status in ('forming','ready','active','completed','cancelled','abandoned')),
 map_id text references public.cellbound_pvp_maps(id),
 -- Immutable map version and state are provided by the authoritative worker.
 map_snapshot jsonb check(map_snapshot is null or (jsonb_typeof(map_snapshot)='object' and pg_column_size(map_snapshot)<32768)),
 revision bigint not null default 1 check(revision>0),
 winning_team text check(winning_team in ('blue','red','draw')),
 created_at timestamptz not null default now(),
 ready_deadline timestamptz not null default (now()+interval '15 seconds'),
 started_at timestamptz,
 completed_at timestamptz,
 reason text,
 check(completed_at is null or status in ('completed','cancelled','abandoned'))
);
create index if not exists cellbound_pvp_matches_open on public.cellbound_pvp_matches(status,created_at)
 where status in ('forming','ready','active');

create table if not exists public.cellbound_pvp_match_participants(
 match_id uuid not null references public.cellbound_pvp_matches(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 team text not null check(team in ('blue','red')),
 ready boolean not null default false,
 connected boolean not null default true,
 last_command_sequence bigint not null default 0 check(last_command_sequence>=0),
 joined_at timestamptz not null default now(),
 disconnected_at timestamptz,
 primary key(match_id,user_id),
 unique(match_id,team)
);
create index if not exists cellbound_pvp_participants_account
 on public.cellbound_pvp_match_participants(user_id,match_id);

-- Trusted rosters must be loaded from server-validated player records, not
-- written by clients. Neither team can download this table over the Data API.
create table if not exists public.cellbound_pvp_match_rosters(
 match_id uuid not null,
 user_id uuid not null,
 sealed_roster jsonb not null check(jsonb_typeof(sealed_roster)='array' and pg_column_size(sealed_roster)<32768),
 sealed_at timestamptz not null default now(),
 primary key(match_id,user_id),
 foreign key(match_id,user_id) references public.cellbound_pvp_match_participants(match_id,user_id) on delete cascade
);

create table if not exists public.cellbound_pvp_commands(
 match_id uuid not null,
 user_id uuid not null,
 sequence bigint not null check(sequence>0),
 category text not null check(category in ('target','position','objective')),
 value text not null check(length(value) between 1 and 64),
 accepted boolean not null,
 rejection_reason text,
 received_at timestamptz not null default now(),
 primary key(match_id,user_id,sequence),
 foreign key(match_id,user_id) references public.cellbound_pvp_match_participants(match_id,user_id) on delete cascade
);

create table if not exists public.cellbound_pvp_match_snapshots(
 match_id uuid not null references public.cellbound_pvp_matches(id) on delete cascade,
 revision bigint not null check(revision>0),
 state jsonb not null check(jsonb_typeof(state)='object' and pg_column_size(state)<200000),
 recorded_at timestamptz not null default now(),
 primary key(match_id,revision)
);
create index if not exists cellbound_pvp_snapshots_latest on public.cellbound_pvp_match_snapshots(match_id,revision desc);

-- Client-readable event stream. Never insert a payout or private user data.
create table if not exists public.cellbound_pvp_match_events(
 match_id uuid not null references public.cellbound_pvp_matches(id) on delete cascade,
 sequence bigint not null check(sequence>0),
 kind text not null check(length(kind) between 1 and 80),
 payload jsonb not null check(jsonb_typeof(payload)='object' and pg_column_size(payload)<32768),
 recorded_at timestamptz not null default now(),
 primary key(match_id,sequence)
);

alter table public.cellbound_pvp_queue_entries enable row level security;
alter table public.cellbound_pvp_matches enable row level security;
alter table public.cellbound_pvp_match_participants enable row level security;
alter table public.cellbound_pvp_match_rosters enable row level security;
alter table public.cellbound_pvp_commands enable row level security;
alter table public.cellbound_pvp_match_snapshots enable row level security;
alter table public.cellbound_pvp_match_events enable row level security;

revoke all on public.cellbound_pvp_queue_entries from public,anon,authenticated;
revoke all on public.cellbound_pvp_matches from public,anon,authenticated;
revoke all on public.cellbound_pvp_match_participants from public,anon,authenticated;
revoke all on public.cellbound_pvp_match_rosters from public,anon,authenticated;
revoke all on public.cellbound_pvp_commands from public,anon,authenticated;
revoke all on public.cellbound_pvp_match_snapshots from public,anon,authenticated;
revoke all on public.cellbound_pvp_match_events from public,anon,authenticated;

grant select,insert,delete on public.cellbound_pvp_queue_entries to authenticated;
grant select on public.cellbound_pvp_matches to authenticated;
grant select on public.cellbound_pvp_match_participants to authenticated;
grant select on public.cellbound_pvp_match_snapshots to authenticated;
grant select on public.cellbound_pvp_match_events to authenticated;

drop policy if exists "Queue read own entries" on public.cellbound_pvp_queue_entries;
create policy "Queue read own entries" on public.cellbound_pvp_queue_entries for select to authenticated
 using(user_id=(select auth.uid()));
drop policy if exists "Queue insert own waiting request" on public.cellbound_pvp_queue_entries;
create policy "Queue insert own waiting request" on public.cellbound_pvp_queue_entries for insert to authenticated
 with check(user_id=(select auth.uid()) and status='waiting' and match_id is null
  and joined_at between now()-interval '2 minutes' and now()+interval '2 minutes'
  and expires_at>now() and expires_at<=now()+interval '12 minutes');
drop policy if exists "Queue withdraw own waiting request" on public.cellbound_pvp_queue_entries;
create policy "Queue withdraw own waiting request" on public.cellbound_pvp_queue_entries for delete to authenticated
 using(user_id=(select auth.uid()) and status='waiting');
drop policy if exists "Participants see own identity" on public.cellbound_pvp_match_participants;
create policy "Participants see own identity" on public.cellbound_pvp_match_participants for select to authenticated
 using(user_id=(select auth.uid()));
drop policy if exists "Participants see their matches" on public.cellbound_pvp_matches;
create policy "Participants see their matches" on public.cellbound_pvp_matches for select to authenticated
 using(exists(select 1 from public.cellbound_pvp_match_participants p where p.match_id=id and p.user_id=(select auth.uid())));
drop policy if exists "Participants see match snapshots" on public.cellbound_pvp_match_snapshots;
create policy "Participants see match snapshots" on public.cellbound_pvp_match_snapshots for select to authenticated
 using(exists(select 1 from public.cellbound_pvp_match_participants p where p.match_id=cellbound_pvp_match_snapshots.match_id and p.user_id=(select auth.uid())));
drop policy if exists "Participants see public combat events" on public.cellbound_pvp_match_events;
create policy "Participants see public combat events" on public.cellbound_pvp_match_events for select to authenticated
 using(exists(select 1 from public.cellbound_pvp_match_participants p where p.match_id=cellbound_pvp_match_events.match_id and p.user_id=(select auth.uid())));

-- Persistent queue pairing must be a single server-only database transaction.
-- SECURITY INVOKER + service_role grants: no public SECURITY DEFINER endpoint.
-- Row locks prevent two workers assigning the same waiting request twice.
create or replace function public.cellbound_pvp_pair_waiting(p_mode text,p_squad_size integer)
returns uuid language plpgsql security invoker set search_path=pg_catalog,public
as $function$
declare
 blue public.cellbound_pvp_queue_entries%rowtype;
 red public.cellbound_pvp_queue_entries%rowtype;
 created_match uuid;
begin
 if p_mode not in ('arena','capture-the-flag','king-of-the-hill')
    or not ((p_mode='arena' and p_squad_size in (2,3,5))
      or (p_mode in ('capture-the-flag','king-of-the-hill') and p_squad_size=5))
 then raise exception 'Invalid PvP matchmaking format'; end if;
 select * into blue from public.cellbound_pvp_queue_entries
 where status='waiting' and mode=p_mode and squad_size=p_squad_size and expires_at>now()
 and not exists(
  select 1 from public.cellbound_pvp_match_participants p
  join public.cellbound_pvp_matches m on m.id=p.match_id
  where p.user_id=cellbound_pvp_queue_entries.user_id and m.status in ('forming','ready','active'))
 order by joined_at,id for update skip locked limit 1;
 if blue.id is null then return null; end if;
 select * into red from public.cellbound_pvp_queue_entries
 where status='waiting' and mode=p_mode and squad_size=p_squad_size and expires_at>now()
 and user_id<>blue.user_id
 and not exists(
  select 1 from public.cellbound_pvp_match_participants p
  join public.cellbound_pvp_matches m on m.id=p.match_id
  where p.user_id=cellbound_pvp_queue_entries.user_id and m.status in ('forming','ready','active'))
 order by joined_at,id for update skip locked limit 1;
 if red.id is null then return null; end if;
 insert into public.cellbound_pvp_matches(mode,squad_size,status)
 values(p_mode,p_squad_size,'forming') returning id into created_match;
 insert into public.cellbound_pvp_match_participants(match_id,user_id,team)
 values(created_match,blue.user_id,'blue'),(created_match,red.user_id,'red');
 update public.cellbound_pvp_queue_entries set status='matched',match_id=created_match
 where id in (blue.id,red.id) and status='waiting';
 return created_match;
end;
$function$;
revoke all on function public.cellbound_pvp_pair_waiting(text,integer) from public,anon,authenticated;
grant execute on function public.cellbound_pvp_pair_waiting(text,integer) to service_role;

-- API permissions for service_role remain supplied by the managed platform.
-- There is deliberately NO client command submission or match settlement RPC.
