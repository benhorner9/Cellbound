-- Security hardening of the Block 3 schema, safe to re-run.
-- Built-in arena/CTF/KOTH maps exist as trusted code fallbacks and therefore
-- need not appear in the owner-published map override table.
alter table public.cellbound_pvp_matches
 drop constraint if exists cellbound_pvp_matches_map_id_fkey;
alter table public.cellbound_pvp_matches
 add constraint cellbound_pvp_match_map_slug
 check(map_id is null or map_id ~ '^[a-z0-9-]{3,64}$');
-- Do not allow a client to override the server's queue timestamps, state,
-- match assignment or identifiers by submitting them on INSERT.
revoke insert on public.cellbound_pvp_queue_entries from authenticated;
grant insert(user_id,mode,squad_size) on public.cellbound_pvp_queue_entries to authenticated;
