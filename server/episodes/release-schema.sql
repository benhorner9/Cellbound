-- Candidate schema; execute ONLY in a disposable local database until reviewed.
-- No production migration or remote application is authorised by this file.
begin;
create schema episode_private;
revoke all on schema episode_private from public, anon;
grant usage on schema episode_private to authenticated;
create table episode_private.environment (
 singleton boolean primary key default true check(singleton),
 name text not null check(name in ('isolated-development','production')),
 build text not null, schema_version integer not null default 1,
 min_save_version integer not null default 6
);
-- Deliberately not seeded: operator must identify the verified isolated backend.
create table episode_private.registry (
 id text primary key check(id ~ '^episode_[1-9][0-9]*$'), title text not null,
 description text not null default '', state text not null default 'in_development'
 check(state in ('in_development','private_testing','ready','live','paused')),
 built boolean not null default false, minimum_build text not null,
 preceding text references episode_private.registry(id), entry_point text,
 manifest jsonb not null default '{"quests":[],"dungeons":[],"raids":[]}',
 revision bigint not null default 0, activated_at timestamptz,
 modified_at timestamptz not null default now(), modified_by uuid references auth.users(id),
 check(id <> 'episode_1' or state='live')
);
create table episode_private.testers (
 episode text references episode_private.registry(id), user_id uuid references auth.users(id),
 primary key(episode,user_id)
);
create table episode_private.evidence (
 episode text references episode_private.registry(id), check_id text not null,
 build text not null, schema_version integer not null, manifest_revision bigint not null,
 passed boolean not null, kind text not null check(kind in ('automated','manual')),
 artifact text not null check(length(artifact)>10), recorded_at timestamptz not null default now(),
 primary key(episode,check_id)
);
create table episode_private.audit (
 id bigint generated always as identity primary key, episode text not null,
 actor uuid not null, environment text not null, action text not null,
 previous jsonb, result jsonb, at timestamptz not null default now()
);
create table episode_private.saves (
 user_id uuid primary key references auth.users(id), revision bigint not null default 0,
 save_version integer not null, state jsonb not null, updated_at timestamptz not null default now()
);
create table episode_private.sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 episode text not null references episode_private.registry(id), content text not null,
 build text not null, party jsonb not null, preview boolean not null,
 started_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '4 hours',
 status text not null default 'active' check(status in ('active','settled','failed'))
);
create index on episode_private.sessions(user_id,status);
-- Only a trusted authoritative encounter worker may insert a verified result.
-- There is intentionally NO client-callable "complete" or "verify" RPC.
create table episode_private.verified_results (
 session_id uuid primary key references episode_private.sessions(id),
 expected_revision bigint not null, state jsonb not null,
 verifier_build text not null, proof_digest text not null check(length(proof_digest)=64),
 verified_at timestamptz not null default now()
);
create table episode_private.claims (
 session_id uuid primary key references episode_private.sessions(id), user_id uuid not null,
 revision bigint not null, result jsonb not null, claimed_at timestamptz not null default now()
);
-- Existing clients can no longer write snapshots through the legacy Data API.
-- Read access is preserved; the new load/save RPC is mandatory after cutover.
revoke insert,update on public.guild_accounts from authenticated;
revoke insert(user_id,game_state,updated_at),update(game_state,updated_at) on public.guild_accounts from authenticated;
do $$ declare t text; begin
 foreach t in array array['environment','registry','testers','evidence','audit','saves','sessions','verified_results','claims'] loop
 execute format('alter table episode_private.%I enable row level security',t);
 execute format('revoke all on episode_private.%I from public,anon,authenticated',t);
 end loop;
end $$;
insert into episode_private.registry(id,title,state,built,minimum_build,preceding,entry_point,manifest)
values ('episode_1','Existing Episode 1 campaign','live',true,'legacy',null,null,'{"quests":[],"dungeons":[],"raids":[]}'),
('episode_2','Invasion on the Farm','in_development',false,'unreleased','episode_1','e2_q01',
'{"quests":["e2_q01","e2_q02","e2_q03","e2_q04","e2_q05","e2_q06","e2_q07"],"dungeons":["e2_d01","e2_d02","e2_d03","e2_d04"],"raids":["e2_r01","e2_r02"]}');
insert into episode_private.registry(id,title,minimum_build,preceding)
select 'episode_'||n,'Unannounced','unreleased','episode_'||(n-1) from generate_series(3,7)n;

create function episode_private.owner() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.cellbound_admins where user_id=auth.uid() and role='owner');
$$;
create function episode_private.ready(p_id text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select r.built and not exists (
 select 1 from unnest(array['quest_stages','dungeon_encounters','raid_encounters','progression','rewards','blocking_bugs','migration','characters','equipment','account_isolation','browsers','artwork','deployment','campaign_playthrough']) c
 where not exists(select 1 from episode_private.evidence e where e.episode=r.id and e.check_id=c
 and e.passed and e.build=env.build and e.schema_version=env.schema_version and e.manifest_revision=r.revision
 and (c not in ('migration','account_isolation','rewards','progression','characters') or e.kind='automated')))
 from episode_private.registry r cross join episode_private.environment env where r.id=p_id),false);
$$;
create function episode_private.api(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); env episode_private.environment; r episode_private.registry;
 old jsonb; target text; allowed boolean; s episode_private.saves; run episode_private.sessions;
 result episode_private.verified_results; receipt episode_private.claims; next_state jsonb; c jsonb; previous_c jsonb;
begin
 if u is null then raise exception 'Authentication required'; end if;
 select * into env from episode_private.environment;
 if not found then raise exception 'Environment is not provisioned'; end if;
 if p_action='list' then
  return jsonb_build_object('environment',env.name,'accessMode',case when env.name='isolated-development' then 'development-open' else 'owner-release' end,'build',env.build,'schemaVersion',env.schema_version,'owner',episode_private.owner(),
   'episodes',(select jsonb_agg(to_jsonb(x)) from (
    select reg.*,episode_private.ready(reg.id) as ready from episode_private.registry reg
    where env.name='isolated-development' or episode_private.owner() or exists(select 1 from public.cellbound_admins where user_id=u)
     or reg.state='live' or (reg.state='private_testing' and exists(select 1 from episode_private.testers t where t.episode=reg.id and t.user_id=u))
    order by substring(reg.id from 9)::integer)x));
 end if;
 if p_action='load' then
  select * into s from episode_private.saves where user_id=u;
  if not found then
   select game_state into next_state from public.guild_accounts where user_id=u;
   if next_state is null then next_state:='{}'; end if;
   insert into episode_private.saves(user_id,save_version,state) values(u,env.min_save_version,next_state) on conflict do nothing;
   select * into s from episode_private.saves where user_id=u;
  end if;
  return to_jsonb(s)||jsonb_build_object('progression_cap',case when env.name='isolated-development' or exists(
   select 1 from episode_private.registry reg where reg.id='episode_2' and (reg.state='live' or
   (reg.state='private_testing' and (episode_private.owner() or exists(select 1 from episode_private.testers t where t.episode=reg.id and t.user_id=u))))) then 30 else 15 end);
 end if;
 if p_action='save' then
  if p_payload->>'build' is distinct from env.build or (p_payload->>'saveVersion')::integer is distinct from env.min_save_version then raise exception 'Unsupported client; update required'; end if;
  select * into s from episode_private.saves where user_id=u for update;
  if not found or s.revision is distinct from (p_payload->>'revision')::bigint then raise exception 'Stale save; reload required'; end if;
  next_state:=p_payload->'state';
  if jsonb_typeof(next_state) is distinct from 'object' then raise exception 'Invalid save'; end if;
  if next_state->'episode2' is distinct from s.state->'episode2' then raise exception 'Episode progress requires verified settlement'; end if;
  -- High-level characters cannot be overwritten by any whole-account browser save.
  -- Server settlement is the only writer of these protected character records.
  for previous_c in select value from jsonb_array_elements(coalesce(s.state->'roster','[]')) loop
   if (previous_c->>'level')::integer>15 then
    select value into c from jsonb_array_elements(coalesce(next_state->'roster','[]')) where value->>'id'=previous_c->>'id';
    if c is distinct from previous_c then raise exception 'Protected character requires authoritative mutation'; end if;
   end if;
  end loop;
  for c in select value from jsonb_array_elements(coalesce(next_state->'roster','[]')) loop
   if (c->>'level')::integer>15 and not exists(select 1 from jsonb_array_elements(coalesce(s.state->'roster','[]')) v where v=c) then raise exception 'Level progression requires verified settlement'; end if;
  end loop;
  update episode_private.saves set state=next_state,revision=revision+1,updated_at=now() where user_id=u returning * into s;
  return to_jsonb(s);
 end if;
 if p_action='settle' then
  select * into run from episode_private.sessions where id=(p_payload->>'session')::uuid and user_id=u for update;
  if not found then raise exception 'Unknown session'; end if;
  select * into receipt from episode_private.claims where session_id=run.id;
  if found then return receipt.result; end if;
  if run.preview or run.status<>'active' then raise exception 'Session cannot grant durable rewards'; end if;
  select * into result from episode_private.verified_results where session_id=run.id;
  if not found then raise exception 'Authoritative result not available'; end if;
  if result.verifier_build<>run.build then raise exception 'Verifier mismatch'; end if;
  if result.verified_at<run.started_at or result.verified_at>run.expires_at then raise exception 'Result outside session lifetime'; end if;
  select * into s from episode_private.saves where user_id=u for update;
  if not found or s.revision<>result.expected_revision then raise exception 'Stale verified result; worker must reconcile'; end if;
  update episode_private.saves set state=result.state,revision=revision+1,updated_at=now() where user_id=u returning * into s;
  insert into episode_private.claims values(run.id,u,s.revision,to_jsonb(s),now());
  update episode_private.sessions set status='settled' where id=run.id;
  return to_jsonb(s);
 end if;
 if p_action='register' then
  if not episode_private.owner() then raise exception 'Owner required'; end if;
  if p_payload->>'environment' is distinct from env.name then raise exception 'Wrong environment'; end if;
  if jsonb_typeof(p_payload#>'{manifest,quests}') is distinct from 'array' or jsonb_typeof(p_payload#>'{manifest,dungeons}') is distinct from 'array' or jsonb_typeof(p_payload#>'{manifest,raids}') is distinct from 'array' then raise exception 'Invalid content manifest'; end if;
  insert into episode_private.registry(id,title,description,minimum_build,preceding,entry_point,manifest,modified_by)
   values(p_payload->>'episode',p_payload->>'title',coalesce(p_payload->>'description',''),p_payload->>'minimum_build',p_payload->>'preceding',p_payload->>'entry_point',p_payload->'manifest',u) returning * into r;
  insert into episode_private.audit(episode,actor,environment,action,result) values(r.id,u,env.name,'register',to_jsonb(r));
  return to_jsonb(r);
 end if;
 select * into r from episode_private.registry where id=p_payload->>'episode' for update;
 if not found then raise exception 'Unknown episode'; end if;
 if p_action='tester' then
  if not episode_private.owner() then raise exception 'Owner required'; end if;
  if env.name<>'isolated-development' then raise exception 'Test access is restricted to the isolated environment'; end if;
  if p_payload->>'remove'='true' then delete from episode_private.testers where episode=r.id and user_id=(p_payload->>'user')::uuid;
  else insert into episode_private.testers values(r.id,(p_payload->>'user')::uuid) on conflict do nothing; end if;
  insert into episode_private.audit(episode,actor,environment,action,result) values(r.id,u,env.name,'tester',p_payload);
  return jsonb_build_object('updated',true);
 end if;
 if p_action='transition' then
  if not episode_private.owner() then raise exception 'Owner required'; end if;
  if env.name<>'production' then raise exception 'Public release controls belong to the official game; development access is already open'; end if;
  if r.id='episode_1' then raise exception 'Episode 1 is permanent'; end if;
  if p_payload->>'environment' is distinct from env.name or p_payload->>'confirm' is distinct from r.id then raise exception 'Confirm exact episode and environment'; end if;
  if (p_payload->>'revision')::bigint is distinct from r.revision then raise exception 'Conflicting release update'; end if;
  target:=p_payload->>'state';
  if not ((r.state='in_development' and target='private_testing') or (r.state='private_testing' and target in ('in_development','ready')) or (r.state='ready' and target in ('private_testing','live')) or (r.state='live' and target='paused') or (r.state='paused' and target in ('private_testing','live'))) then raise exception 'Invalid release transition'; end if;
  if target in ('ready','live') and not episode_private.ready(r.id) then raise exception 'Release evidence incomplete or stale'; end if;
  old:=to_jsonb(r);
  update episode_private.registry set state=target,revision=revision+1,modified_at=now(),modified_by=u,activated_at=case when target='live' then coalesce(activated_at,now()) else activated_at end where id=r.id returning * into r;
  -- Release-state edits do not invalidate content evidence; code/schema/manifest edits do.
  update episode_private.evidence set manifest_revision=r.revision where episode=r.id and manifest_revision=r.revision-1;
  insert into episode_private.audit(episode,actor,environment,action,previous,result) values(r.id,u,env.name,target,old,to_jsonb(r));
  return to_jsonb(r);
 end if;
 if p_action='start' then
  if p_payload->>'build' is distinct from env.build or (env.name='production' and r.minimum_build not in ('legacy',env.build)) then raise exception 'Incompatible episode build'; end if;
  allowed:=env.name='isolated-development' or r.state='live' or (r.state='private_testing' and (episode_private.owner() or exists(select 1 from episode_private.testers where episode=r.id and user_id=u)));
  if not allowed then raise exception 'Episode temporarily unavailable'; end if;
  select * into s from episode_private.saves where user_id=u for update;
  if not found then raise exception 'Load account first'; end if;
  if r.preceding='episode_1' and coalesce(s.state#>>'{questSystem,nullComplex,complete}','false')<>'true' then raise exception 'Complete the Null Complex narrative finale'; end if;
  if r.preceding is not null and r.preceding<>'episode_1' and coalesce(s.state#>>array['episodes',r.preceding,'complete'],'false')<>'true' then raise exception 'Complete preceding episode'; end if;
  if not exists(select 1 from jsonb_each(r.manifest) m cross join lateral jsonb_array_elements_text(m.value)v where v=p_payload->>'content') then raise exception 'Content not registered'; end if;
  if r.id='episode_2' and not (coalesce(s.state#>'{episode2,unlocked}','[]') ? (p_payload->>'content')) then raise exception 'Content prerequisites incomplete'; end if;
  -- Content implementation and objective prerequisites need the authoritative worker.
  -- No session is issued for unimplemented content, even to an owner.
  if not r.built then raise exception 'Encounter adapter is not implemented'; end if;
  if (select count(distinct id) from (
   select s.state#>>'{party,tank}' id union all select s.state#>>'{party,healer}' union all
   select jsonb_array_elements_text(coalesce(s.state#>'{party,dps}','[]'))) party
   where exists(select 1 from jsonb_array_elements(coalesce(s.state->'roster','[]')) roster_entry where roster_entry->>'id'=party.id))<>5 then raise exception 'Complete owned five-character party required'; end if;
  insert into episode_private.sessions(user_id,episode,content,build,party,preview)
   values(u,r.id,p_payload->>'content',env.build,coalesce(s.state->'party','[]'),env.name='production' and r.state<>'live') returning * into run;
  return to_jsonb(run);
 end if;
 raise exception 'Unknown operation';
end $$;
revoke all on all functions in schema episode_private from public,anon,authenticated;
grant execute on function episode_private.api(text,jsonb) to authenticated;
create function public.cellbound_episodes(p_action text,p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select episode_private.api(p_action,p_payload)$$;
revoke all on function public.cellbound_episodes(text,jsonb) from public,anon;
grant execute on function public.cellbound_episodes(text,jsonb) to authenticated;
commit;
