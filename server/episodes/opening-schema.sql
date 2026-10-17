-- LOCAL CANDIDATE ONLY. Apply after release-schema.sql in a disposable database.
-- No activation, migration of legacy claims, or production deployment is performed.
begin;
create table episode_private.story_proofs (
 user_id uuid references auth.users(id), story text not null, proof_digest text not null check(length(proof_digest)=64),
 verifier_build text not null, verified_at timestamptz not null default now(), primary key(user_id,story)
);
create table episode_private.opening_attempts (
 user_id uuid primary key references auth.users(id), data jsonb not null
);
alter table episode_private.story_proofs enable row level security;
alter table episode_private.opening_attempts enable row level security;
revoke all on episode_private.story_proofs,episode_private.opening_attempts from public,anon,authenticated;

-- Service-only RPCs: caller identity MUST be verified by the worker against Auth.
-- Browser callers cannot import a proof, seal a roster, or commit a snapshot.
create function public.cellbound_opening_load(p_user uuid) returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object('account',to_jsonb(s),'environment',to_jsonb(e),'episode',to_jsonb(r),
 'finaleProof',exists(select 1 from episode_private.story_proofs p where p.user_id=p_user and p.story='signal-from-nowhere'),
 'attempt',(select data from episode_private.opening_attempts a where a.user_id=p_user))
 from episode_private.saves s cross join episode_private.environment e cross join episode_private.registry r
 where s.user_id=p_user and r.id='episode_2';
$$;
create function public.cellbound_opening_commit(p_user uuid,p_revision bigint,p_build text,p_state jsonb,p_attempt jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s episode_private.saves; e episode_private.environment; r episode_private.registry;
begin
 select * into s from episode_private.saves where user_id=p_user for update;
 if not found or s.revision<>p_revision then raise exception 'Stale chapter state; reload required'; end if;
 select * into e from episode_private.environment;
 select * into r from episode_private.registry where id='episode_2';
 if e.build is distinct from p_build then raise exception 'Chapter build changed'; end if;
 if e.name is distinct from 'isolated-development' and r.state is distinct from 'live' then raise exception 'Episode unavailable'; end if;
 if not exists(select 1 from episode_private.story_proofs where user_id=p_user and story='signal-from-nowhere') then raise exception 'Trusted finale proof required'; end if;
 if p_state#>>'{episode2,accountId}' is distinct from p_user::text then raise exception 'Chapter account mismatch'; end if;
 update episode_private.saves set state=p_state,revision=revision+1,updated_at=now() where user_id=p_user returning * into s;
 insert into episode_private.opening_attempts values(p_user,p_attempt) on conflict(user_id) do update set data=excluded.data;
 return to_jsonb(s);
end $$;
revoke all on function public.cellbound_opening_load(uuid),public.cellbound_opening_commit(uuid,bigint,text,jsonb,jsonb) from public,anon,authenticated;
-- Supabase service_role exists on hosted installations. Local tests create it explicitly.
grant execute on function public.cellbound_opening_load(uuid),public.cellbound_opening_commit(uuid,bigint,text,jsonb,jsonb) to service_role;
commit;
