create table if not exists public.cellbound_design_blueprints(
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (length(slug) between 3 and 80 and slug ~ '^[a-z0-9-]+$'),
 content_type text not null check(content_type in('quest','dungeon','raid')),
 title text not null check(length(title) between 1 and 120),
 status text not null default 'draft' check(status in('draft','published')),
 blueprint jsonb not null default '{}'::jsonb check(jsonb_typeof(blueprint)='object' and pg_column_size(blueprint)<=131072),
 draft_blueprint jsonb not null default '{}'::jsonb check(jsonb_typeof(draft_blueprint)='object' and pg_column_size(draft_blueprint)<=131072),
 version integer not null default 1 check(version between 1 and 1000000),
 created_by uuid not null default auth.uid() references auth.users(id),
 updated_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 published_at timestamptz
);
alter table public.cellbound_design_blueprints enable row level security;
grant select,insert,update,delete on public.cellbound_design_blueprints to authenticated;
create policy "Published designs visible to players and owners see drafts" on public.cellbound_design_blueprints for select to authenticated
 using(status='published' or (select public.cellbound_is_owner()));
create policy "Only owner creates designs" on public.cellbound_design_blueprints for insert to authenticated
 with check((select public.cellbound_is_owner()) and created_by=(select auth.uid()) and updated_by=(select auth.uid()));
create policy "Only owner updates designs" on public.cellbound_design_blueprints for update to authenticated
 using((select public.cellbound_is_owner()))
 with check((select public.cellbound_is_owner()) and updated_by=(select auth.uid()));
create policy "Only owner deletes designs" on public.cellbound_design_blueprints for delete to authenticated
 using((select public.cellbound_is_owner()));
create index if not exists cellbound_design_blueprints_published_idx on public.cellbound_design_blueprints(content_type,updated_at desc) where status='published';
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cellbound-design-art','cellbound-design-art',true,10485760,array['image/webp','image/png','image/jpeg','image/avif'])
on conflict(id) do nothing;
create policy "Owner uploads design booth artwork" on storage.objects for insert to authenticated
 with check(bucket_id='cellbound-design-art' and (select public.cellbound_is_owner()));