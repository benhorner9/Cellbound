-- Editable PvP map blueprints. Player-visible maps and private cloud drafts are
-- deliberately separate tables: published layouts must not expose owner drafts.
create table if not exists public.cellbound_pvp_maps (
 id text primary key check(id ~ '^[a-z0-9-]{3,64}$'),
 mode text not null check(mode in ('arena','capture-the-flag','king-of-the-hill')),
 title text not null check(length(title) between 2 and 100),
 layout jsonb not null check(jsonb_typeof(layout)='object' and pg_column_size(layout)<32768),
 art_path text check(art_path is null or length(art_path) between 5 and 255),
 version integer not null default 1 check(version between 1 and 99999),
 published_at timestamptz not null default now(),
 updated_by uuid not null references auth.users(id)
);
create table if not exists public.cellbound_pvp_map_drafts (
 id text primary key check(id ~ '^[a-z0-9-]{3,64}$'),
 mode text not null check(mode in ('arena','capture-the-flag','king-of-the-hill')),
 title text not null check(length(title) between 2 and 100),
 layout jsonb not null check(jsonb_typeof(layout)='object' and pg_column_size(layout)<32768),
 art_path text check(art_path is null or length(art_path) between 5 and 255),
 updated_at timestamptz not null default now(),
 updated_by uuid not null references auth.users(id)
);
alter table public.cellbound_pvp_maps enable row level security;
alter table public.cellbound_pvp_map_drafts enable row level security;
revoke all on public.cellbound_pvp_maps from anon,authenticated;
revoke all on public.cellbound_pvp_map_drafts from anon,authenticated;
grant select,insert,update,delete on public.cellbound_pvp_maps to authenticated;
grant select,insert,update,delete on public.cellbound_pvp_map_drafts to authenticated;
create policy "Players read published PvP maps" on public.cellbound_pvp_maps for select to authenticated using (true);
create policy "Owner publishes PvP maps" on public.cellbound_pvp_maps for insert to authenticated
 with check((select public.cellbound_is_owner()) and updated_by=(select auth.uid()));
create policy "Owner updates published PvP maps" on public.cellbound_pvp_maps for update to authenticated
 using((select public.cellbound_is_owner()))
 with check((select public.cellbound_is_owner()) and updated_by=(select auth.uid()));
create policy "Owner restores built-in PvP maps" on public.cellbound_pvp_maps for delete to authenticated
 using((select public.cellbound_is_owner()));
create policy "Owner reads PvP map drafts" on public.cellbound_pvp_map_drafts for select to authenticated
 using((select public.cellbound_is_owner()));
create policy "Owner creates PvP map drafts" on public.cellbound_pvp_map_drafts for insert to authenticated
 with check((select public.cellbound_is_owner()) and updated_by=(select auth.uid()));
create policy "Owner updates PvP map drafts" on public.cellbound_pvp_map_drafts for update to authenticated
 using((select public.cellbound_is_owner()))
 with check((select public.cellbound_is_owner()) and updated_by=(select auth.uid()));
create policy "Owner deletes PvP map drafts" on public.cellbound_pvp_map_drafts for delete to authenticated
 using((select public.cellbound_is_owner()));
create index if not exists cellbound_pvp_maps_mode_idx on public.cellbound_pvp_maps(mode,published_at desc);
