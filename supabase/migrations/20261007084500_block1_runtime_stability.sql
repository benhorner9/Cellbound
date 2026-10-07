-- Block 1 runtime stability fixes.
-- Fix world presence heartbeat ambiguity and make analytics event recording idempotent.

create or replace function public.cellbound_world_presence_heartbeat(p_zone text)
returns table (presence_key text,guild_name text,zone text,updated_at timestamptz,is_self boolean)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_zone text := lower(trim(coalesce(p_zone,'')));
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not (v_zone = any (array[
    'town'::text,'guild'::text,'inn'::text,'bank'::text,'craft'::text,
    'quests'::text,'dungeons'::text,'activities'::text,'raids'::text,
    'market'::text,'social'::text,'arena'::text
  ])) then raise exception 'Invalid world zone'; end if;

  insert into public.cellbound_world_presence as presence(user_id,zone,updated_at)
  values (v_uid,v_zone,now())
  on conflict (user_id) do update
    set zone=excluded.zone,
        updated_at=excluded.updated_at;

  delete from public.cellbound_world_presence as stale
  where stale.updated_at < now()-interval '5 minutes';

  return query
  select
    md5(p.user_id::text||':cellbound-world-presence-v1'),
    coalesce(nullif(trim(g.guild_name),''),'Unnamed Guild'),
    p.zone,
    p.updated_at,
    (p.user_id=v_uid)
  from public.cellbound_world_presence p
  left join public.guild_accounts g on g.user_id=p.user_id
  where p.updated_at > now()-interval '45 seconds'
  order by p.updated_at desc
  limit 40;
end;
$function$;

revoke execute on function public.cellbound_world_presence_heartbeat(text) from public;
revoke execute on function public.cellbound_world_presence_heartbeat(text) from anon;
grant execute on function public.cellbound_world_presence_heartbeat(text) to authenticated;

create or replace function public.cellbound_record_analytics_event(
  p_event_name text,
  p_event_key text default null,
  p_session_id text default '',
  p_channel text default 'unknown',
  p_build_id text default '',
  p_build_number bigint default 0,
  p_page_view text default '',
  p_properties jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_inserted boolean := false;
  v_event_name text := lower(btrim(coalesce(p_event_name,'')));
  v_event_key text := nullif(left(btrim(coalesce(p_event_key,'')),160),'');
  v_channel text := lower(btrim(coalesce(p_channel,'unknown')));
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if v_event_name !~ '^[a-z0-9_]{3,64}$' then raise exception 'Invalid analytics event name'; end if;
  if v_channel not in ('staging','production','local','unknown') then raise exception 'Invalid analytics channel'; end if;
  if jsonb_typeof(coalesce(p_properties,'{}'::jsonb)) <> 'object' then raise exception 'Analytics properties must be an object'; end if;

  insert into public.analytics_events(
    user_id,event_name,event_key,session_id,channel,build_id,build_number,page_view,properties
  )
  values(
    v_uid,
    v_event_name,
    v_event_key,
    left(coalesce(p_session_id,''),80),
    v_channel,
    left(coalesce(p_build_id,''),80),
    greatest(0,coalesce(p_build_number,0)),
    left(coalesce(p_page_view,''),80),
    coalesce(p_properties,'{}'::jsonb)
  )
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$function$;

revoke all on function public.cellbound_record_analytics_event(text,text,text,text,text,bigint,text,jsonb) from public;
revoke execute on function public.cellbound_record_analytics_event(text,text,text,text,text,bigint,text,jsonb) from anon;
grant execute on function public.cellbound_record_analytics_event(text,text,text,text,text,bigint,text,jsonb) to authenticated;
