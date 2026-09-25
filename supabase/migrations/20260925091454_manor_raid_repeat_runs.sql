alter table public.raid_sessions
  drop constraint if exists raid_sessions_listing_id_key;

create unique index if not exists raid_sessions_one_active_per_listing_idx
  on public.raid_sessions(listing_id)
  where status='active';

create index if not exists raid_sessions_listing_started_idx
  on public.raid_sessions(listing_id,started_at desc);
