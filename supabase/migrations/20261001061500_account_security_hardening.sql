-- Harden player account entitlements and remove anonymous RPC exposure.
-- Player game saves remain writable, but Membership fields are server-managed only.

create or replace function public.cellbound_protect_account_entitlements()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  -- Requests carrying an ordinary signed-in player JWT must never be able to
  -- grant or extend their own Membership, even if a future table grant regresses.
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' then
      new.membership_active_until := null;
      new.membership_override := false;
    else
      new.membership_active_until := old.membership_active_until;
      new.membership_override := old.membership_override;
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists cellbound_protect_account_entitlements on public.guild_accounts;
create trigger cellbound_protect_account_entitlements
before insert or update on public.guild_accounts
for each row
execute function public.cellbound_protect_account_entitlements();

-- Replace broad player table writes with only the columns the game client owns.
revoke insert, update on table public.guild_accounts from authenticated;
grant insert (user_id, game_state, updated_at) on public.guild_accounts to authenticated;
grant update (game_state, updated_at) on public.guild_accounts to authenticated;

-- The guild-name lock must be callable only by a signed-in player.
revoke execute on function public.cellbound_lock_guild_name(text) from public;
revoke execute on function public.cellbound_lock_guild_name(text) from anon;
grant execute on function public.cellbound_lock_guild_name(text) to authenticated;

-- Trigger helpers are internal implementation details, not public RPC endpoints.
revoke execute on function public.cellbound_enforce_guild_name_lock() from public;
revoke execute on function public.cellbound_enforce_guild_name_lock() from anon;
revoke execute on function public.cellbound_enforce_guild_name_lock() from authenticated;

revoke execute on function public.cellbound_protect_account_entitlements() from public;
revoke execute on function public.cellbound_protect_account_entitlements() from anon;
revoke execute on function public.cellbound_protect_account_entitlements() from authenticated;
