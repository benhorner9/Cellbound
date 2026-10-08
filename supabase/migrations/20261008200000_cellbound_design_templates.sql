-- New reusable Design Booth content; owner-authored only until staff roles are audited.
create table if not exists public.cellbound_design_templates (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check(length(slug) between 3 and 100 and slug ~ '^[a-z0-9-]+$'),
 kind text not null check(kind in ('room','fight','comic','minigame','item')),
 title text not null check(length(title) between 1 and 120),
 status text not null default 'draft' check(status in ('draft','published')),
 blueprint jsonb not null default '{}'::jsonb check(jsonb_typeof(blueprint)='object' and pg_column_size(blueprint)<=65536),
 draft_blueprint jsonb not null default '{}'::jsonb check(jsonb_typeof(draft_blueprint)='object' and pg_column_size(draft_blueprint)<=65536),
 version integer not null default 1 check(version between 1 and 1000000),
 created_by uuid not null default auth.uid() references auth.users(id),
 updated_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 published_at timestamptz
);
alter table public.cellbound_design_templates enable row level security;
grant select, insert, update, delete on public.cellbound_design_templates to authenticated;
create policy "Published content templates visible to players" on public.cellbound_design_templates
 for select to authenticated
 using(status='published' or (select public.cellbound_is_owner()));
create policy "Only owner creates content templates" on public.cellbound_design_templates
 for insert to authenticated
 with check((select public.cellbound_is_owner()) and created_by=(select auth.uid()) and updated_by=(select auth.uid()));
create policy "Only owner updates content templates" on public.cellbound_design_templates
 for update to authenticated
 using((select public.cellbound_is_owner()))
 with check((select public.cellbound_is_owner()) and updated_by=(select auth.uid()));
create policy "Only owner removes content templates" on public.cellbound_design_templates
 for delete to authenticated
 using((select public.cellbound_is_owner()));
create index if not exists cellbound_design_templates_public_idx
 on public.cellbound_design_templates(kind,updated_at desc) where status='published';
