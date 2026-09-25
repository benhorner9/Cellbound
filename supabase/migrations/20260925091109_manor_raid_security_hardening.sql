revoke execute on function public.sync_party_finder_party(uuid,jsonb,numeric) from anon;
revoke execute on function public.start_manor_raid(uuid) from anon;
revoke execute on function public.advance_manor_raid(uuid,text,text,jsonb) from anon;
revoke execute on function public.manor_screech_result(uuid,boolean) from anon;
revoke execute on function public.claim_manor_raid_rewards(uuid) from anon;
revoke execute on function public.manor_lockout_status() from anon;

create index if not exists raid_sessions_leader_idx on public.raid_sessions(leader_id);
create index if not exists raid_reward_claims_user_idx on public.raid_reward_claims(user_id);
