-- Owner-published dungeon and raid room artwork.
create table if not exists public.cellbound_room_art (
  content_id text not null check (length(content_id) between 1 and 90 and content_id ~ '^[a-z0-9-]+$'),
  room_id text not null check (length(room_id) between 1 and 90 and room_id ~ '^[a-z0-9-]+$'),
  object_path text not null check (length(object_path) between 1 and 255),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key(content_id,room_id)
);
alter table public.cellbound_room_art enable row level security;
grant select,insert,update,delete on public.cellbound_room_art to authenticated;
create policy "Players can read published room art" on public.cellbound_room_art for select to authenticated using (true);
create policy "Owner inserts room art" on public.cellbound_room_art for insert to authenticated
  with check ((select public.cellbound_is_owner()) and updated_by=(select auth.uid()));
create policy "Owner updates room art" on public.cellbound_room_art for update to authenticated
  using ((select public.cellbound_is_owner()))
  with check ((select public.cellbound_is_owner()) and updated_by=(select auth.uid()));
create policy "Owner restores original room art" on public.cellbound_room_art for delete to authenticated
  using ((select public.cellbound_is_owner()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cellbound-room-art','cellbound-room-art',true,10485760,array['image/webp','image/png','image/jpeg','image/avif'])
on conflict(id) do nothing;
create policy "Owner uploads dungeon room art" on storage.objects
 for insert to authenticated
 with check(bucket_id='cellbound-room-art' and (select public.cellbound_is_owner()));