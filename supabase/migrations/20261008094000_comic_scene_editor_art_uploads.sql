
-- Comic Scene Editor: production art mapping, owner uploads, public artwork delivery.
create or replace function public.cellbound_is_owner()
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1 from public.cellbound_admins
    where user_id = (select auth.uid()) and role = 'owner'
  );
$function$;
revoke all on function public.cellbound_is_owner() from public, anon;
grant execute on function public.cellbound_is_owner() to authenticated;

create table if not exists public.comic_scene_panel_art (
  scene_id text not null check (length(scene_id) between 1 and 180 and scene_id ~ '^[a-z0-9-]+$'),
  panel_index integer not null check (panel_index between 0 and 50),
  object_path text not null check (length(object_path) between 1 and 255),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (scene_id, panel_index)
);
alter table public.comic_scene_panel_art enable row level security;
grant select, insert, update on public.comic_scene_panel_art to authenticated;
create policy "Read comic panel art" on public.comic_scene_panel_art
  for select to authenticated using (true);
create policy "Owner inserts comic art" on public.comic_scene_panel_art
  for insert to authenticated
  with check ((select public.cellbound_is_owner()) and updated_by = (select auth.uid()));
create policy "Owner updates comic art" on public.comic_scene_panel_art
  for update to authenticated
  using ((select public.cellbound_is_owner()))
  with check ((select public.cellbound_is_owner()) and updated_by = (select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('comic-scene-art','comic-scene-art',true,8388608,array['image/webp','image/png','image/jpeg','image/avif'])
on conflict (id) do nothing;
create policy "Owner uploads comic art" on storage.objects
  for insert to authenticated
  with check (bucket_id='comic-scene-art' and (select public.cellbound_is_owner()));
