-- Reduce database privileges available through public API roles.
-- Cellbound requires authentication before game data is read or written.

revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon;

-- Runtime players never need schema-management style table privileges.
revoke truncate, trigger, references on all tables in schema public from authenticated;

-- Guild account deletion is not a client-side game operation.
revoke delete on table public.guild_accounts from authenticated;

-- Keep future objects closed by default. Migrations must explicitly grant only
-- the API access required by the game feature being added.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke truncate, trigger, references on tables from authenticated;
