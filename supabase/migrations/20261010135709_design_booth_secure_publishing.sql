-- Job 9. Apply ONLY to an isolated development database after copying published
-- content. Staging and production currently share a database: do not apply there.
begin;
do $$ begin
 if current_setting('cellbound.booth_environment',true) is distinct from 'isolated-development' then
 raise exception 'STOP: verify an isolated development database, then SET cellbound.booth_environment to isolated-development in this session. Never apply on the shared production project.';
 end if;
end $$;
create schema if not exists booth_private;
revoke all on schema booth_private from public, anon;
grant usage on schema booth_private to authenticated;
create table booth_private.members (
 user_id uuid primary key references auth.users(id),
 role text not null check(role in ('admin','editor','viewer')),
 scopes text[] not null default array['adventure','template'],
 can_publish boolean not null default false,
 updated_by uuid not null references auth.users(id), updated_at timestamptz not null default now()
);
create table booth_private.drafts (
 kind text not null, key text not null check(length(key) between 1 and 180),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=262144),
 revision bigint not null default 1,
 state text not null default 'draft' check(state in ('draft','review','approved','published')),
 base jsonb, created_by uuid not null references auth.users(id),
 updated_by uuid not null references auth.users(id), updated_at timestamptz not null default now(),
 approved_by uuid references auth.users(id), primary key(kind,key)
);
create table booth_private.history (
 id bigint generated always as identity primary key,
 kind text not null, key text not null, before_data jsonb, after_data jsonb,
 action text not null, actor uuid not null references auth.users(id), at timestamptz not null default now()
);
create index on booth_private.history(kind,key,id desc);
alter table booth_private.members enable row level security;
alter table booth_private.drafts enable row level security;
alter table booth_private.history enable row level security;
revoke all on all tables in schema booth_private from public,anon,authenticated;

create table public.cellbound_comic_text (
 scene_id text primary key check(scene_id ~ '^[a-z0-9-]{1,180}$'),
 panels jsonb not null check(jsonb_typeof(panels)='array' and jsonb_array_length(panels) between 1 and 50 and octet_length(panels::text)<65536),
 updated_by uuid not null references auth.users(id),updated_at timestamptz not null default now()
);
alter table public.cellbound_comic_text enable row level security;
revoke all on public.cellbound_comic_text from public,anon,authenticated;
grant select on public.cellbound_comic_text to authenticated;
create policy "Published comic captions" on public.cellbound_comic_text for select to authenticated using(true);

-- Fixed mapping: caller input is never interpolated as SQL identifiers.
create function booth_private.resource(p_kind text)
returns jsonb language sql immutable set search_path='' as $$
 select case p_kind
 when 'adventure' then '{"table":"cellbound_design_blueprints","keys":["slug"],"fields":["slug","title","content_type","blueprint"]}'::jsonb
 when 'template' then '{"table":"cellbound_design_templates","keys":["slug"],"fields":["slug","title","kind","blueprint"]}'::jsonb
 when 'room-layout' then '{"table":"cellbound_room_layouts","keys":["content_id","room_id"],"fields":["content_id","room_id","layout"]}'::jsonb
 when 'room-art' then '{"table":"cellbound_room_art","keys":["content_id","room_id"],"fields":["content_id","room_id","object_path"]}'::jsonb
 when 'comic-text' then '{"table":"cellbound_comic_text","keys":["scene_id"],"fields":["scene_id","panels"]}'::jsonb
 when 'comic-art' then '{"table":"comic_scene_panel_art","keys":["scene_id","panel_index"],"fields":["scene_id","panel_index","object_path"]}'::jsonb
 when 'pvp-map' then '{"table":"cellbound_pvp_maps","keys":["id"],"fields":["id","mode","title","layout","art_path"]}'::jsonb
 when 'boss-drops' then '{"table":"cellbound_boss_drop_tables","keys":["boss_key"],"fields":["boss_key","drops"]}'::jsonb end
$$;
create function booth_private.allowed(p_kind text,p_action text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (public.cellbound_is_owner() or exists(
 select 1 from booth_private.members m where m.user_id=auth.uid() and p_kind=any(m.scopes)
 and case when p_action='read' then true
 when p_action='edit' then m.role in ('editor','admin')
 when p_action='approve' then m.role='admin'
 when p_action='publish' then m.role='admin' and m.can_publish
 else false end))
$$;
create function booth_private.current_row(p_kind text,p_key text)
returns jsonb language plpgsql set search_path='' as $$
declare spec jsonb:=booth_private.resource(p_kind); predicate text; result jsonb;
begin
 if spec is null then raise exception 'Unsupported content type'; end if;
 select string_agg(format('%I::text = split_part($1, ''/'', %s)',v,ord),' and ')
 into predicate from jsonb_array_elements_text(spec->'keys') with ordinality as k(v,ord);
 execute format('select to_jsonb(t) from public.%I t where %s',spec->>'table',predicate) into result using p_key;
 return result;
end $$;
create function booth_private.write_row(p_kind text,p_key text,p_payload jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare spec jsonb:=booth_private.resource(p_kind); body jsonb; columns_sql text; conflict_sql text; update_sql text; old jsonb; result jsonb; element jsonb;
begin
 if spec is null then raise exception 'Unsupported content type'; end if;
 if jsonb_typeof(p_payload)<>'object' then raise exception 'Expected content object'; end if;
 -- Only known content fields. Client actor, timestamps, status, version and IDs
 -- for UUID-backed designs cannot be forged.
 select jsonb_object_agg(k,p_payload->k) into body from jsonb_array_elements_text(spec->'fields') k;
 if (select string_agg(body->>k,'/' order by ord) from jsonb_array_elements_text(spec->'keys') with ordinality a(k,ord)) is distinct from p_key then
  raise exception 'Content key mismatch';
 end if;
 old:=booth_private.current_row(p_kind,p_key);
 if p_kind='comic-text' then
  if jsonb_typeof(body->'panels') is distinct from 'array' then raise exception 'Comic panels required'; end if;
  if exists(select 1 from jsonb_array_elements(body->'panels') x where jsonb_typeof(x) is distinct from 'object' or coalesce(length(x->>'title'),0)>120 or coalesce(length(x->>'text'),0)>2000 or (x-'title'-'text')<>'{}'::jsonb) then raise exception 'Captions support title and text only'; end if;
 elsif p_kind='adventure' then
  if jsonb_typeof(body->'blueprint'->'steps') is distinct from 'array' or jsonb_array_length(body->'blueprint'->'steps') not between 1 and 30 then raise exception 'Adventure needs 1–30 stages'; end if;
  if (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(body->'blueprint'->'steps') x) then raise exception 'Stage IDs must be unique'; end if;
  for element in select value from jsonb_array_elements(body->'blueprint'->'steps') loop
   if coalesce(element->>'type','') not in ('room','fight','comic','minigame') or coalesce(length(trim(element->>'title')),0)=0 or coalesce(length(element->>'id'),0)=0 then raise exception 'Stage type, ID and title are required'; end if;
   if element->>'type' in ('room','fight') and coalesce(length(element->>'artPath'),0)=0 then raise exception 'Room and fight artwork required'; end if;
   if element->>'type'='comic' and (jsonb_typeof(element->'panels') is distinct from 'array' or jsonb_array_length(element->'panels') not between 1 and 6) then raise exception 'Comic needs 1–6 panels'; end if;
  end loop;
 elsif p_kind='room-layout' then
  if jsonb_typeof(body->'layout'->'markers') is distinct from 'array' then raise exception 'Markers required'; end if;
  for element in select value from jsonb_array_elements(body->'layout'->'markers') loop
   if jsonb_typeof(element->'x') is distinct from 'number' or jsonb_typeof(element->'y') is distinct from 'number' or (element->>'x')::numeric not between 0 and 100 or (element->>'y')::numeric not between 0 and 100 then raise exception 'Marker coordinates must be between 0 and 100'; end if;
  end loop;
 elsif p_kind='boss-drops' then
  if jsonb_typeof(body->'drops') is distinct from 'array' then raise exception 'Drops must be a list'; end if;
  for element in select value from jsonb_array_elements(body->'drops') loop
   if coalesce(element->>'kind','') not in ('gear','material') or coalesce(length(element->>'key'),0)=0 or jsonb_typeof(element->'chance') is distinct from 'number' or (element->>'chance')::numeric not between 1 and 100 or jsonb_typeof(element->'quantity') is distinct from 'number' or (element->>'quantity')::numeric not between 1 and 5 then raise exception 'Invalid drop kind, item, chance or quantity'; end if;
  end loop;
 end if;

 if p_kind in ('adventure','template') then
  if length(trim(body->>'title'))<3 or jsonb_typeof(body->'blueprint')<>'object' then raise exception 'Title and blueprint required'; end if;
  body:=body||jsonb_build_object('status','published','draft_blueprint','{}'::jsonb,'version',coalesce((old->>'version')::bigint,0)+1,
    'updated_by',auth.uid(),'updated_at',now(),'published_at',now(),'created_by',coalesce(old->>'created_by',auth.uid()::text));
 elsif p_kind='room-layout' then
  if jsonb_typeof(body->'layout'->'markers') is distinct from 'array' then raise exception 'Room markers required'; end if;
  body:=body||jsonb_build_object('version',coalesce((old->>'version')::bigint,0)+1,'published_by',auth.uid(),'published_at',now());
 elsif p_kind='pvp-map' then
  body:=body||jsonb_build_object('version',coalesce((old->>'version')::bigint,0)+1,'updated_by',auth.uid(),'published_at',now());
 else
  body:=body||jsonb_build_object('updated_by',auth.uid(),'updated_at',now());
 end if;
 select string_agg(format('%I',k),',') into columns_sql from jsonb_object_keys(body) k;
 select string_agg(format('%I',k),',') into conflict_sql from jsonb_array_elements_text(spec->'keys') k;
 select string_agg(format('%I=excluded.%I',k,k),',') into update_sql from jsonb_object_keys(body) k
 where not (spec->'keys' ? k) and k<>'created_by';
 execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) on conflict (%s) do update set %s returning to_jsonb(%I.*)',
 spec->>'table',columns_sql,columns_sql,spec->>'table',conflict_sql,update_sql,spec->>'table') into result using body;
 return result;
end $$;

create function booth_private.archive_row(p_kind text,p_key text)
returns void language plpgsql set search_path='' as $$
declare spec jsonb:=booth_private.resource(p_kind); predicate text;
begin
 if spec is null then raise exception 'Unsupported content type'; end if;
 select string_agg(format('%I::text = split_part($1, ''/'', %s)',v,ord),' and ') into predicate
 from jsonb_array_elements_text(spec->'keys') with ordinality as k(v,ord);
 execute format('delete from public.%I where %s',spec->>'table',predicate) using p_key;
end $$;

create function booth_private.command(p_action text,p_kind text,p_key text,p_revision bigint,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d booth_private.drafts; current_data jsonb; next_data jsonb; saved_id bigint; target booth_private.history; actor uuid:=auth.uid(); m booth_private.members;
begin
 if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_action='access' then
  if public.cellbound_is_owner() then return '{"role":"owner","scopes":["adventure","template","room-layout","room-art","comic-art","comic-text","pvp-map","boss-drops"],"can_publish":true}'::jsonb; end if;
  select * into m from booth_private.members where user_id=actor;
  return coalesce(to_jsonb(m)-'updated_by','{"role":"none","scopes":[]}'::jsonb);
 end if;
 if p_action in ('members','grant','revoke') then
  if not public.cellbound_is_owner() then raise exception 'Owner required' using errcode='42501'; end if;
  if p_action='members' then return coalesce((select jsonb_agg(to_jsonb(x)) from booth_private.members x),'[]'::jsonb); end if;
  if exists(select 1 from public.cellbound_admins where user_id=(p_payload->>'user_id')::uuid and role='owner') then raise exception 'Owner cannot be changed in the Booth'; end if;
  if p_action='revoke' then delete from booth_private.members where user_id=(p_payload->>'user_id')::uuid;
  else
   if exists(select 1 from jsonb_array_elements_text(p_payload->'scopes') s where booth_private.resource(s) is null) then raise exception 'Unknown permission scope'; end if;
   insert into booth_private.members(user_id,role,scopes,can_publish,updated_by)
   values((p_payload->>'user_id')::uuid,p_payload->>'role',array(select jsonb_array_elements_text(p_payload->'scopes')),
     (p_payload->>'role'='admin' and coalesce((p_payload->>'can_publish')::boolean,false)),actor)
   on conflict(user_id) do update set role=excluded.role,scopes=excluded.scopes,can_publish=excluded.can_publish,updated_by=actor,updated_at=now();
  end if;
  insert into booth_private.history(kind,key,action,actor,after_data) values('permissions',p_payload->>'user_id',p_action,actor,p_payload);
  return '{"ok":true}'::jsonb;
 end if;
 if booth_private.resource(p_kind) is null or not booth_private.allowed(p_kind,'read') then raise exception 'No content access' using errcode='42501'; end if;
 if p_action='list' then return coalesce((select jsonb_agg(to_jsonb(x) order by updated_at desc) from booth_private.drafts x where kind=p_kind),'[]'::jsonb); end if;
 if p_action='history' then return coalesce((select jsonb_agg(to_jsonb(x) order by id desc) from booth_private.history x where kind=p_kind and key=p_key),'[]'::jsonb); end if;
 -- Serialise first save as well as updates and publication on the same resource.
 perform pg_advisory_xact_lock(hashtextextended(p_kind||':'||p_key,0));
 select * into d from booth_private.drafts where kind=p_kind and key=p_key for update;
 current_data:=booth_private.current_row(p_kind,p_key);
 if p_action='get' then return jsonb_build_object('draft',to_jsonb(d),'published',current_data); end if;
 if p_revision is null or p_revision<>coalesce(d.revision,0) then raise exception 'Conflict: this content changed. Reload and compare before saving.' using errcode='40001'; end if;
 if p_action='save' then
  if not booth_private.allowed(p_kind,'edit') then raise exception 'Editing not permitted' using errcode='42501'; end if;
  insert into booth_private.drafts(kind,key,payload,base,created_by,updated_by)
  values(p_kind,p_key,p_payload,current_data,actor,actor)
  on conflict(kind,key) do update set payload=p_payload,revision=booth_private.drafts.revision+1,state='draft',approved_by=null,updated_by=actor,updated_at=now();
 elsif p_action='submit' then
  if not booth_private.allowed(p_kind,'edit') or d.state<>'draft' then raise exception 'Save a draft before submitting'; end if;
  update booth_private.drafts set state='review',revision=revision+1,updated_by=actor,updated_at=now() where kind=p_kind and key=p_key;
 elsif p_action='approve' then
  if not booth_private.allowed(p_kind,'approve') or d.state<>'review' then raise exception 'Review permission and submitted draft required' using errcode='42501'; end if;
  update booth_private.drafts set state='approved',approved_by=actor,revision=revision+1,updated_at=now() where kind=p_kind and key=p_key;
 elsif p_action in ('publish','rollback','archive') then
  if p_action='archive' then
   if not public.cellbound_is_owner() then raise exception 'Owner required' using errcode='42501'; end if;
   if current_data is null then raise exception 'No published override to archive'; end if;
   if d.kind is null then
    insert into booth_private.drafts(kind,key,payload,base,revision,created_by,updated_by) values(p_kind,p_key,current_data,current_data,0,actor,actor);
   end if;
   perform booth_private.archive_row(p_kind,p_key);next_data:=null;
  elsif p_action='rollback' then
   if not public.cellbound_is_owner() then raise exception 'Owner required' using errcode='42501'; end if;
   select * into target from booth_private.history where id=(p_payload->>'history_id')::bigint and kind=p_kind and key=p_key;
   if target.id is null or target.before_data is null then raise exception 'No previous published version to restore'; end if;
   next_data:=target.before_data;
  else
   if not booth_private.allowed(p_kind,'publish') or d.state<>'approved' then raise exception 'Approved draft and publishing permission required' using errcode='42501'; end if;
   if current_data is distinct from d.base then raise exception 'Published content changed. Rebase and review again.' using errcode='40001'; end if;
   next_data:=d.payload;
  end if;
  if p_action<>'archive' then next_data:=booth_private.write_row(p_kind,p_key,next_data); end if;
  insert into booth_private.history(kind,key,before_data,after_data,action,actor)
  values(p_kind,p_key,current_data,next_data,p_action,actor) returning id into saved_id;
  update booth_private.drafts set state=case when next_data is null then 'draft' else 'published' end,revision=revision+1,base=next_data,payload=coalesce(next_data,current_data),approved_by=null,updated_by=actor,updated_at=now() where kind=p_kind and key=p_key;
 else raise exception 'Unsupported action';
 end if;
 select * into d from booth_private.drafts where kind=p_kind and key=p_key;
 return to_jsonb(d);
end $$;
revoke all on all functions in schema booth_private from public,anon,authenticated;
grant execute on function booth_private.command(text,text,text,bigint,jsonb) to authenticated;
create function public.cellbound_booth(p_action text,p_kind text default '',p_key text default '',p_revision bigint default 0,p_payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select booth_private.command(p_action,p_kind,p_key,p_revision,p_payload)
$$;
revoke all on function public.cellbound_booth(text,text,text,bigint,jsonb) from public,anon;
grant execute on function public.cellbound_booth(text,text,text,bigint,jsonb) to authenticated;

-- Preserve all existing content. Import private working copies, including the
-- drafts previously embedded in publicly readable published rows.
insert into booth_private.drafts(kind,key,payload,base,created_by,updated_by,updated_at)
select 'adventure',slug,jsonb_build_object('slug',slug,'title',coalesce(draft_blueprint->>'title',title),'content_type',content_type,'blueprint',case when draft_blueprint<>'{}'::jsonb then draft_blueprint else blueprint end),
 to_jsonb(t),created_by,updated_by,updated_at from public.cellbound_design_blueprints t;
insert into booth_private.drafts(kind,key,payload,base,created_by,updated_by,updated_at)
select 'template',slug,jsonb_build_object('slug',slug,'title',coalesce(draft_blueprint->>'title',title),'kind',kind,'blueprint',case when draft_blueprint<>'{}'::jsonb then draft_blueprint else blueprint end),
 to_jsonb(t),created_by,updated_by,updated_at from public.cellbound_design_templates t;
insert into booth_private.drafts(kind,key,payload,base,created_by,updated_by,updated_at)
select 'pvp-map',id,to_jsonb(t),booth_private.current_row('pvp-map',id),updated_by,updated_by,updated_at from public.cellbound_pvp_map_drafts t;
-- Public runtime readers receive only published fields, never private drafts.
revoke select on public.cellbound_design_blueprints,public.cellbound_design_templates from authenticated;
grant select(id,slug,title,content_type,status,blueprint,version,published_at,updated_at) on public.cellbound_design_blueprints to authenticated;
grant select(id,slug,title,kind,status,blueprint,version,published_at,updated_at) on public.cellbound_design_templates to authenticated;
revoke insert,update,delete on public.cellbound_design_blueprints,public.cellbound_design_templates,
 public.cellbound_room_layouts,public.cellbound_room_art,public.comic_scene_panel_art,
 public.cellbound_pvp_maps,public.cellbound_pvp_map_drafts,public.cellbound_boss_drop_tables from authenticated;
-- Remove bypasses through the pre-workflow SECURITY DEFINER layout functions.
do $$ declare f record; begin
 for f in select oid::regprocedure sig from pg_proc where proname in ('cellbound_owner_publish_room_layout','cellbound_owner_unpublish_room_layout') loop
 execute format('revoke execute on function %s from public,anon,authenticated',f.sig);
 end loop;
end $$;

create function public.cellbound_booth_can_upload()
returns boolean language sql security definer set search_path='' as $$
 select booth_private.allowed('adventure','edit') or booth_private.allowed('template','edit')
$$;
revoke all on function public.cellbound_booth_can_upload() from public,anon;
grant execute on function public.cellbound_booth_can_upload() to authenticated;
create policy "Contributors append design artwork" on storage.objects for insert to authenticated
 with check(bucket_id='cellbound-design-art' and (select public.cellbound_booth_can_upload()));
commit;
