begin;
-- Only the separately provisioned development project may receive this migration.
insert into episode_private.environment(singleton,name,build) values(true,'isolated-development','dev-opening-20261017');
create table episode_private.null_runs(user_id uuid primary key references auth.users(id),data jsonb not null);
alter table episode_private.null_runs enable row level security;
revoke all on episode_private.null_runs from public,anon,authenticated;
create or replace function public.cellbound_opening_load(p_user uuid) returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object('account',to_jsonb(s),'environment',to_jsonb(e),'episode',to_jsonb(r),
 'finaleProof',exists(select 1 from episode_private.story_proofs p where p.user_id=p_user and p.story='signal-from-nowhere'),
 'nullRun',(select data from episode_private.null_runs n where n.user_id=p_user),
 'attempt',(select data from episode_private.opening_attempts a where a.user_id=p_user))
 from episode_private.saves s cross join episode_private.environment e cross join episode_private.registry r where s.user_id=p_user and r.id='episode_2';
$$;
create function public.cellbound_null_commit(p_user uuid,p_revision bigint,p_build text,p_state jsonb,p_run jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s episode_private.saves;
begin
 if not exists(select 1 from episode_private.environment where name='isolated-development' and build=p_build) then raise exception 'Wrong story environment'; end if;
 select * into s from episode_private.saves where user_id=p_user for update;
 if not found or s.revision<>p_revision then raise exception 'Stale story state; reload required'; end if;
 update episode_private.saves set state=p_state,revision=revision+1,updated_at=now() where user_id=p_user returning * into s;
 insert into episode_private.null_runs values(p_user,p_run) on conflict(user_id) do update set data=excluded.data;
 if p_run->>'complete'='true' then
  insert into episode_private.story_proofs(user_id,story,proof_digest,verifier_build) values(p_user,'signal-from-nowhere',p_run->>'proof',p_build) on conflict do nothing;
 end if;
 return to_jsonb(s);
end $$;
revoke all on function public.cellbound_null_commit(uuid,bigint,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.cellbound_null_commit(uuid,bigint,text,jsonb,jsonb) to service_role;
-- Preserve legacy RPCs by mirroring trusted snapshots. Direct browser snapshot writes remain revoked.
create function episode_private.mirror_save() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if pg_trigger_depth()>1 then return new; end if;
 insert into public.guild_accounts(user_id,game_state,updated_at) values(new.user_id,new.state,now())
 on conflict(user_id) do update set game_state=excluded.game_state,updated_at=excluded.updated_at;
 return new;
end $$;
create trigger episode_save_mirror after insert or update on episode_private.saves for each row execute function episode_private.mirror_save();
create function episode_private.receive_legacy_mutation() returns trigger language plpgsql security definer set search_path='' as $$
declare s episode_private.saves; next_state jsonb;
begin
 if pg_trigger_depth()>1 then return new; end if;
 select * into s from episode_private.saves where user_id=new.user_id for update;
 if not found then return new; end if;
 next_state=new.game_state-'episode2';
 if s.state?'episode2' then next_state=jsonb_set(next_state,'{episode2}',s.state->'episode2'); end if;
 if exists(select 1 from episode_private.story_proofs where user_id=new.user_id and story='signal-from-nowhere') then
 next_state=jsonb_set(next_state,'{questSystem}',coalesce(next_state->'questSystem','{}')||jsonb_build_object('nullComplex',s.state#>'{questSystem,nullComplex}'));
 end if;
 -- Legacy RPCs may mutate inventory, but never downgrade Episode 2 characters.
 next_state=jsonb_set(next_state,'{roster}',coalesce((select jsonb_agg(case when (oldc->>'level')::int>15 then c||jsonb_build_object('level',oldc->'level','xp',oldc->'xp') else c end) from jsonb_array_elements(coalesce(next_state->'roster','[]')) c left join lateral (select v as oldc from jsonb_array_elements(coalesce(s.state->'roster','[]')) v where v->>'id'=c->>'id') o on true),'[]'));
 new.game_state=next_state;
 update episode_private.saves set state=next_state,revision=revision+1,updated_at=now() where user_id=new.user_id;
 return new;
end $$;
create trigger zz_episode_legacy_sync before update of game_state on public.guild_accounts for each row execute function episode_private.receive_legacy_mutation();
alter function episode_private.api(text,jsonb) rename to base_api;
create function episode_private.api(p_action text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); s episode_private.saves; n jsonb; c jsonb; oldc jsonb; e episode_private.environment;
begin
 if p_action<>'save' then return episode_private.base_api(p_action,p_payload); end if;
 if u is null then raise exception 'Authentication required'; end if;
 select * into e from episode_private.environment;
 if e.name<>'isolated-development' then return episode_private.base_api(p_action,p_payload); end if;
 if p_payload->>'build' is distinct from e.build or (p_payload->>'saveVersion')::int is distinct from e.min_save_version then raise exception 'Unsupported client; update required'; end if;
 select * into s from episode_private.saves where user_id=u for update;
 if not found or s.revision is distinct from (p_payload->>'revision')::bigint then raise exception 'Stale save; reload required'; end if;
 n=p_payload->'state';
 if jsonb_typeof(n) is distinct from 'object' or jsonb_typeof(n->'roster') is distinct from 'array' then raise exception 'Invalid save'; end if;
 if n->'episode2' is distinct from s.state->'episode2' then raise exception 'Episode progress requires verified settlement'; end if;
 for oldc in select value from jsonb_array_elements(coalesce(s.state->'roster','[]')) loop
  if (oldc->>'level')::int>15 then
   select value into c from jsonb_array_elements(n->'roster') where value->>'id'=oldc->>'id';
   if c is null or c->'level' is distinct from oldc->'level' or c->'xp' is distinct from oldc->'xp' then raise exception 'Protected progression requires verified settlement'; end if;
  end if;
 end loop;
 for c in select value from jsonb_array_elements(n->'roster') loop
  if (c->>'level')::int>15 and not exists(select 1 from jsonb_array_elements(coalesce(s.state->'roster','[]')) v where v->>'id'=c->>'id' and v->'level'=c->'level' and v->'xp'=c->'xp') then raise exception 'Level progression requires verified settlement'; end if;
 end loop;
 if exists(select 1 from episode_private.story_proofs where user_id=u and story='signal-from-nowhere') then
 n=jsonb_set(n,'{questSystem}',coalesce(n->'questSystem','{}')||jsonb_build_object('nullComplex',s.state#>'{questSystem,nullComplex}'));
 end if;
 update episode_private.saves set state=n,revision=revision+1,updated_at=now() where user_id=u returning * into s;
 return to_jsonb(s);
end $$;
revoke all on function episode_private.api(text,jsonb),episode_private.base_api(text,jsonb),episode_private.mirror_save(),episode_private.receive_legacy_mutation() from public,anon,authenticated;
-- SQL-language wrapper must be replaced after renaming its target.
create or replace function public.cellbound_episodes(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select episode_private.api(p_action,p_payload) $$;
grant execute on function episode_private.api(text,jsonb) to authenticated;
-- Restore the verified official owner's role only after that email is confirmed in dev.
create function episode_private.dev_owner() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email='playcellbound@gmail.com' and new.email_confirmed_at is not null then
 insert into public.cellbound_admins(user_id,role) values(new.id,'owner') on conflict(user_id) do update set role='owner';
 end if;return new;
end $$;
revoke all on function episode_private.dev_owner() from public,anon,authenticated;
create trigger cellbound_dev_owner after insert or update of email_confirmed_at on auth.users for each row execute function episode_private.dev_owner();
commit;
begin;
create table episode_private.imports(user_id uuid primary key references auth.users(id),source_id uuid not null unique,imported_at timestamptz not null default now());
alter table episode_private.imports enable row level security;
revoke all on episode_private.imports from public,anon,authenticated;
create function public.cellbound_development_import(p_user uuid,p_source uuid,p_state jsonb,p_name text) returns jsonb language plpgsql security definer set search_path='' as $$
declare copied boolean:=false; n jsonb;
begin
 if not exists(select 1 from episode_private.environment where name='isolated-development') then raise exception 'Development only'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 if not exists(select 1 from episode_private.saves where user_id=p_user) then
  n=coalesce(p_state,'{}')-'episode2';
  if n#>'{questSystem,nullComplex}' is not null then n=jsonb_set(n,'{questSystem,nullComplex}',(n#>'{questSystem,nullComplex}')-'authoritative'); end if;
  insert into episode_private.saves(user_id,save_version,state) values(p_user,6,n);
  copied=true;
 end if;
 insert into episode_private.imports(user_id,source_id) values(p_user,p_source) on conflict(user_id) do nothing;
 if p_name is not null and not exists(select 1 from public.guild_accounts where user_id<>p_user and lower(guild_name)=lower(p_name)) then
 update public.guild_accounts set guild_name=p_name where user_id=p_user and guild_name is null;
 end if;
 return jsonb_build_object('copied',copied,'separate',true);
end $$;
revoke all on function public.cellbound_development_import(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.cellbound_development_import(uuid,uuid,jsonb,text) to service_role;
commit;
