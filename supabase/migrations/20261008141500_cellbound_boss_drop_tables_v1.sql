create table if not exists public.cellbound_boss_drop_tables (
 boss_key text primary key check (length(boss_key) between 5 and 120),
 drops jsonb not null default '[]'::jsonb check (jsonb_typeof(drops)='array' and jsonb_array_length(drops)<=6),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);
alter table public.cellbound_boss_drop_tables enable row level security;
grant select on public.cellbound_boss_drop_tables to authenticated;
grant insert,update,delete on public.cellbound_boss_drop_tables to authenticated;
drop policy if exists "All signed-in players read configured boss drops" on public.cellbound_boss_drop_tables;
create policy "All signed-in players read configured boss drops"
 on public.cellbound_boss_drop_tables for select to authenticated using (true);
drop policy if exists "Only Cellbound owner creates boss drop tables" on public.cellbound_boss_drop_tables;
create policy "Only Cellbound owner creates boss drop tables"
 on public.cellbound_boss_drop_tables for insert to authenticated with check (public.cellbound_is_owner());
drop policy if exists "Only Cellbound owner edits boss drop tables" on public.cellbound_boss_drop_tables;
create policy "Only Cellbound owner edits boss drop tables"
 on public.cellbound_boss_drop_tables for update to authenticated using (public.cellbound_is_owner()) with check (public.cellbound_is_owner());
drop policy if exists "Only Cellbound owner deletes boss drop tables" on public.cellbound_boss_drop_tables;
create policy "Only Cellbound owner deletes boss drop tables"
 on public.cellbound_boss_drop_tables for delete to authenticated using (public.cellbound_is_owner());