-- Cellbound public player figures always exclude staff and admin testers.
-- Does not delete, alter or reveal private account identity/auth data.
alter table public.cellbound_profession_highscores add column if not exists owner_user_id uuid;
with actual_scores as (
 select encode(sha256(convert_to(ga.user_id::text || ':' ||
   coalesce(nullif(ch.item->>'id',''), ch.n::text) || ':' || prof.item->>'name', 'UTF8')), 'hex') as score_key,ga.user_id
 from public.guild_accounts ga
 cross join lateral jsonb_array_elements(case when jsonb_typeof(ga.game_state->'roster')='array' then ga.game_state->'roster' else '[]'::jsonb end) with ordinality ch(item,n)
 cross join lateral jsonb_array_elements(case when jsonb_typeof(ch.item->'professions')='array' then ch.item->'professions' else '[]'::jsonb end) prof(item)
 where prof.item->>'name' is not null
)
update public.cellbound_profession_highscores s set owner_user_id=a.user_id
from actual_scores a where s.score_key=a.score_key and s.owner_user_id is distinct from a.user_id;

create or replace function cellbound_internal.is_public_player_score(p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select p_user_id is not null and not exists(select 1 from public.cellbound_admins ca where ca.user_id=p_user_id); $$;
revoke all on function cellbound_internal.is_public_player_score(uuid) from public;
grant usage on schema cellbound_internal to anon, authenticated;
grant execute on function cellbound_internal.is_public_player_score(uuid) to anon, authenticated;
drop policy if exists cellbound_scores_public_read on public.cellbound_profession_highscores;
create policy cellbound_scores_public_read on public.cellbound_profession_highscores
for select to anon,authenticated using (cellbound_internal.is_public_player_score(owner_user_id));
revoke all on public.cellbound_profession_highscores from public, anon, authenticated;
grant select (guild_name,character_name,profession,level,xp,updated_at) on public.cellbound_profession_highscores to anon,authenticated;

-- Never recreate staff entries when an admin saves game progress.
create or replace function cellbound_internal.refresh_profession_highscores()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_scores jsonb := '[]'::jsonb;
  new_scores jsonb := '[]'::jsonb;
  old_roster jsonb := '[]'::jsonb;
  new_roster jsonb := '[]'::jsonb;
begin
  if tg_op <> 'INSERT' then
    old_roster := case when jsonb_typeof(old.game_state->'roster') = 'array'
      then old.game_state->'roster' else '[]'::jsonb end;
    select coalesce(jsonb_agg(jsonb_build_array(ch.item->>'id', ch.item->>'name',
      prof.item->>'name', prof.item->>'level', prof.item->>'xp')
      order by ch.n, prof.n), '[]'::jsonb) into old_scores
    from jsonb_array_elements(old_roster) with ordinality as ch(item,n)
    cross join lateral jsonb_array_elements(case when jsonb_typeof(ch.item->'professions')='array'
      then ch.item->'professions' else '[]'::jsonb end) with ordinality as prof(item,n)
    where prof.item->>'name' is not null;
  end if;
  if tg_op <> 'DELETE' then
    new_roster := case when jsonb_typeof(new.game_state->'roster') = 'array'
      then new.game_state->'roster' else '[]'::jsonb end;
    select coalesce(jsonb_agg(jsonb_build_array(ch.item->>'id', ch.item->>'name',
      prof.item->>'name', prof.item->>'level', prof.item->>'xp')
      order by ch.n, prof.n), '[]'::jsonb) into new_scores
    from jsonb_array_elements(new_roster) with ordinality as ch(item,n)
    cross join lateral jsonb_array_elements(case when jsonb_typeof(ch.item->'professions')='array'
      then ch.item->'professions' else '[]'::jsonb end) with ordinality as prof(item,n)
    where prof.item->>'name' is not null;
  end if;
  -- Frequent gameplay saves do not touch the scoreboard unless public scores change.
  if tg_op = 'UPDATE'
     and new.guild_name is not distinct from old.guild_name
     and old_scores = new_scores then
    return new;
  end if;

  if tg_op <> 'INSERT' then
    delete from public.cellbound_profession_highscores as scores
    where scores.score_key in (
      select encode(sha256(convert_to(old.user_id::text || ':' ||
        coalesce(nullif(ch.item->>'id',''), ch.n::text) || ':' ||
        (prof.item->>'name'), 'UTF8')), 'hex')
      from jsonb_array_elements(old_roster) with ordinality as ch(item,n)
      cross join lateral jsonb_array_elements(case when jsonb_typeof(ch.item->'professions')='array'
        then ch.item->'professions' else '[]'::jsonb end) as prof(item)
      where prof.item->>'name' is not null
    );
  end if;
  if tg_op <> 'DELETE' and not exists(select 1 from public.cellbound_admins a where a.user_id=new.user_id) then
    insert into public.cellbound_profession_highscores
      (score_key, owner_user_id, guild_name, character_name, profession, level, xp, updated_at)
    select
      encode(sha256(convert_to(new.user_id::text || ':' ||
        coalesce(nullif(ch.item->>'id',''), ch.n::text) || ':' ||
        (prof.item->>'name'), 'UTF8')), 'hex'),
      new.user_id,
      left(coalesce(nullif(btrim(new.guild_name),''),nullif(btrim(new.game_state->>'socialDisplayName'),''),'Unnamed Guild'),48),
      left(btrim(ch.item->>'name'),48),
      prof.item->>'name',
      least(100, greatest(1, (prof.item->>'level')::integer)),
      greatest(0, (prof.item->>'xp')::bigint),
      coalesce(new.updated_at, now())
    from jsonb_array_elements(new_roster) with ordinality as ch(item,n)
    cross join lateral jsonb_array_elements(case when jsonb_typeof(ch.item->'professions')='array'
      then ch.item->'professions' else '[]'::jsonb end) as prof(item)
    where nullif(btrim(ch.item->>'name'),'') is not null
      and prof.item->>'name' in ('Alchemy','Enchanting','Blacksmithing','Leatherworking','Tailoring',
                 'Jewelcrafting','Engineering','Cooking','Reliccrafting','Scribing')
      and (prof.item->>'level') ~ '^[0-9]{1,3}$'
      and (prof.item->>'xp') ~ '^[0-9]{1,15}$'
    on conflict (score_key) do update set
      owner_user_id = excluded.owner_user_id, guild_name = excluded.guild_name, character_name = excluded.character_name,
      profession = excluded.profession, level = excluded.level, xp = excluded.xp,
      updated_at = excluded.updated_at;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- All dashboard aggregations exclude existing and future staff activity.
create or replace function public.cellbound_admin_analytics_summary(
  p_days integer default 30,
  p_channel text default 'staging'
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_days integer := greatest(1,least(coalesce(p_days,30),365));
  v_channel text := lower(btrim(coalesce(p_channel,'staging')));
  v_since timestamptz;
  v_overview jsonb;
  v_classes jsonb;
  v_races jsonb;
  v_combos jsonb;
  v_dungeons jsonb;
  v_quests jsonb;
  v_features jsonb;
  v_levels jsonb;
  v_professions jsonb;
  v_daily jsonb;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.cellbound_admins a where a.user_id=v_uid) then raise exception 'Admin access required'; end if;
  if v_channel not in ('staging','production','local','unknown') then raise exception 'Invalid analytics channel'; end if;
  v_since := now() - make_interval(days=>v_days);

  select jsonb_build_object(
    'active_testers',count(distinct user_id),
    'sessions',count(distinct nullif(session_id,'')),
    'events',count(*),
    'characters_tracked',count(*) filter(where event_name='character_created'),
    'quests_completed',count(*) filter(where event_name='quest_completed'),
    'crafts_completed',coalesce(sum(case when event_name='craft_completed' then greatest(1,coalesce((properties->>'quantity')::integer,1)) else 0 end),0),
    'items_equipped',count(*) filter(where event_name='item_equipped'),
    'items_dismantled',coalesce(sum(case when event_name='item_dismantled' then greatest(1,coalesce((properties->>'quantity')::integer,1)) else 0 end),0)
  )
  into v_overview
  from public.analytics_events
  where not exists(select 1 from public.cellbound_admins hidden_admin where hidden_admin.user_id=analytics_events.user_id) and channel=v_channel and created_at>=v_since;

  select coalesce(jsonb_agg(x order by (x->>'count')::int desc),'[]'::jsonb) into v_classes
  from (select jsonb_build_object('name',coalesce(properties->>'class','Unknown'),'count',count(*)) x
    from public.analytics_events where not exists(select 1 from public.cellbound_admins hidden_admin where hidden_admin.user_id=analytics_events.user_id) and channel=v_channel and created_at>=v_since and event_name='character_created'
    group by coalesce(properties->>'class','Unknown')) q;

  select coalesce(jsonb_agg(x order by (x->>'count')::int desc),'[]'::jsonb) into v_races
  from (select jsonb_build_object('name',coalesce(properties->>'race','Unknown'),'count',count(*)) x
    from public.analytics_events where not exists(select 1 from public.cellbound_admins hidden_admin where hidden_admin.user_id=analytics_events.user_id) and channel=v_channel and created_at>=v_since and event_name='character_created'
    group by coalesce(properties->>'race','Unknown')) q;

  select coalesce(jsonb_agg(x order by (x->>'count')::int desc),'[]'::jsonb) into v_combos
  from (select jsonb_build_object('class',coalesce(properties->>'class','Unknown'),'race',coalesce(properties->>'race','Unknown'),'count',count(*)) x
    from public.analytics_events where not exists(select 1 from public.cellbound_admins hidden_admin where hidden_admin.user_id=analytics_events.user_id) and channel=v_channel and created_at>=v_since and event_name='character_created'
    group by coalesce(properties->>'class','Unknown'),coalesce(properties->>'race','Unknown')
    order by count(*) desc limit 12) q;

  select coalesce(jsonb_agg(x order by (x->>'starts')::int desc),'[]'::jsonb) into v_dungeons
  from (
    select jsonb_build_object(
      'id',properties->>'dungeon_id',
      'name',coalesce(max(properties->>'dungeon_name'),properties->>'dungeon_id'),
      'starts',count(*) filter(where event_name='dungeon_started'),
      'completions',count(*) filter(where event_name='dungeon_completed'),
      'unique_players',count(distinct user_id),
      'completion_rate',case when count(*) filter(where event_name='dungeon_started')=0 then 0 else round(100.0*(count(*) filter(where event_name='dungeon_completed'))/(count(*) filter(where event_name='dungeon_started')),1) end
    ) x
    from public.analytics_events
    where not exists(select 1 from public.cellbound_admins hidden_admin where hidden_admin.user_id=analytics_events.user_id) and channel=v_channel and created_at>=v_since and event_name in ('dungeon_started','dungeon_completed') and coalesce(properties->>'dungeon_id','')<>''
    group by properties->>'dungeon_id'
  ) q;

  select coalesce(jsonb_agg(x order by (x->>'completions')::int desc),'[]'::jsonb) into v_quests
  from (
    select jsonb_build_object('id',coalesce(properties->>'quest_id','unknown'),'name',coalesce(max(properties->>'quest_name'),min(coalesce(properties->>'quest_id','unknown')),'Unknown quest'),'completions',count(*),'unique_players',count(distinct user_id)) x
    from public.analytics_events
    where not exists(select 1 from public.cellbound_admins hidden_admin where hidden_admin.user_id=analytics_events.user_id) and channel=v_channel and created_at>=v_since and event_name='quest_completed'
    group by coalesce(properties->>'quest_id','unknown')
  ) q;

  select coalesce(jsonb_agg(x order by (x->>'opens')::int desc),'[]'::jsonb) into v_features
  from (
    select jsonb_build_object('name',coalesce(properties->>'view','unknown'),'opens',count(*),'unique_players',count(distinct user_id)) x
    from public.analytics_events
    where not exists(select 1 from public.cellbound_admins hidden_admin where hidden_admin.user_id=analytics_events.user_id) and channel=v_channel and created_at>=v_since and event_name='view_opened'
    group by coalesce(properties->>'view','unknown') order by count(*) desc limit 20
  ) q;

  select coalesce(jsonb_agg(x order by (x->>'level')::int),'[]'::jsonb) into v_levels
  from (
    select jsonb_build_object('level',greatest(1,coalesce((properties->>'level')::integer,1)),'characters',count(*),'players',count(distinct user_id)) x
    from public.analytics_events
    where not exists(select 1 from public.cellbound_admins hidden_admin where hidden_admin.user_id=analytics_events.user_id) and channel=v_channel and created_at>=v_since and event_name='level_reached'
    group by greatest(1,coalesce((properties->>'level')::integer,1))
  ) q;

  select coalesce(jsonb_agg(x order by (x->>'learned')::int desc),'[]'::jsonb) into v_professions
  from (
    select jsonb_build_object('name',coalesce(properties->>'profession','Unknown'),'learned',count(*) filter(where event_name='profession_learned'),'crafts',coalesce(sum(case when event_name='craft_completed' then greatest(1,coalesce((properties->>'quantity')::integer,1)) else 0 end),0),'players',count(distinct user_id)) x
    from public.analytics_events
    where not exists(select 1 from public.cellbound_admins hidden_admin where hidden_admin.user_id=analytics_events.user_id) and channel=v_channel and created_at>=v_since and event_name in ('profession_learned','craft_completed')
    group by coalesce(properties->>'profession','Unknown')
  ) q;

  select coalesce(jsonb_agg(x order by x->>'date'),'[]'::jsonb) into v_daily
  from (
    select jsonb_build_object('date',created_at::date,'players',count(distinct user_id),'sessions',count(distinct nullif(session_id,''))) x
    from public.analytics_events
    where not exists(select 1 from public.cellbound_admins hidden_admin where hidden_admin.user_id=analytics_events.user_id) and channel=v_channel and created_at>=v_since and event_name='app_open'
    group by created_at::date
  ) q;

  return jsonb_build_object(
    'channel',v_channel,'days',v_days,'since',v_since,'overview',coalesce(v_overview,'{}'::jsonb),
    'classes',v_classes,'races',v_races,'class_race',v_combos,'dungeons',v_dungeons,'quests',v_quests,
    'features',v_features,'levels',v_levels,'professions',v_professions,'daily_activity',v_daily
  );
end;
$function$;


-- Trusted event writer refuses events from admin accounts.
CREATE OR REPLACE FUNCTION public.cellbound_record_analytics_event(p_event_name text, p_event_key text DEFAULT NULL::text, p_session_id text DEFAULT ''::text, p_channel text DEFAULT 'unknown'::text, p_build_id text DEFAULT ''::text, p_build_number bigint DEFAULT 0, p_page_view text DEFAULT ''::text, p_properties jsonb DEFAULT '{}'::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_inserted boolean := false;
  v_event_name text := lower(btrim(coalesce(p_event_name,'')));
  v_event_key text := nullif(left(btrim(coalesce(p_event_key,'')),160),'');
  v_channel text := lower(btrim(coalesce(p_channel,'unknown')));
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if exists(select 1 from public.cellbound_admins admin where admin.user_id=v_uid) then return false; end if;
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

-- Both dungeon leaderboards filter admins before assigning ranks.
CREATE OR REPLACE FUNCTION public.get_dungeon_leaderboard(p_dungeon_id text, p_season_id text DEFAULT 'foundations-1'::text, p_limit integer DEFAULT 50)
 RETURNS TABLE(rank bigint, guild_label text, difficulty text, tier integer, score integer, completion_time_ms integer, deaths integer, mechanics_failed integer, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 return query select * from(
  select row_number() over(order by r.score desc,r.tier desc,r.completion_time_ms asc,r.created_at asc) rank,r.guild_label,r.difficulty,r.tier,r.score,r.completion_time_ms,r.deaths,r.mechanics_failed,r.created_at
  from public.dungeon_runs r where r.valid=true and not exists(select 1 from public.cellbound_admins hidden_admin where hidden_admin.user_id=r.user_id) and r.dungeon_id=p_dungeon_id and r.season_id=p_season_id
 )ranked order by rank limit greatest(1,least(coalesce(p_limit,50),100));
end $function$;

CREATE OR REPLACE FUNCTION public.get_dungeon_leaderboard_v2(p_dungeon_id text, p_season_id text DEFAULT 'foundations-1'::text, p_scope text DEFAULT 'overall'::text, p_tier integer DEFAULT NULL::integer, p_class text DEFAULT NULL::text, p_limit integer DEFAULT 50)
 RETURNS TABLE(rank bigint, guild_label text, difficulty text, tier integer, score integer, completion_time_ms integer, deaths integer, mechanics_failed integer, party_classes text[], created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_party_sig text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_scope not in ('overall','tier','class','party') then raise exception 'Invalid leaderboard scope'; end if;
  if p_scope='party' then v_party_sig:=md5(public.endgame_party_snapshot(v_uid)::text); end if;

  return query
  select * from (
    select row_number() over(order by r.score desc,r.tier desc,r.completion_time_ms asc,r.created_at asc) as rank,
      r.guild_label,r.difficulty,r.tier,r.score,r.completion_time_ms,r.deaths,r.mechanics_failed,r.party_classes,r.created_at
    from public.dungeon_runs r
    where r.valid=true and not exists(select 1 from public.cellbound_admins hidden_admin where hidden_admin.user_id=r.user_id)
      and r.dungeon_id=p_dungeon_id
      and r.season_id=p_season_id
      and (p_scope<>'tier' or (r.difficulty='cellbound' and r.tier=coalesce(p_tier,r.tier)))
      and (p_scope<>'class' or (p_class is not null and p_class=any(r.party_classes)))
      and (p_scope<>'party' or r.party_signature=v_party_sig)
  ) ranked
  order by rank
  limit greatest(1,least(coalesce(p_limit,50),100));
end
$function$;

