update public.analytics_events
set session_id=''
where channel='staging'
  and build_id='analytics-rollout'
  and session_id='server-baseline';

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
    'active_testers',count(distinct user_id) filter(where event_name='app_open'),
    'sessions',count(distinct nullif(session_id,'')) filter(where event_name='app_open'),
    'events',count(*),
    'characters_tracked',count(*) filter(where event_name='character_created'),
    'quests_completed',count(*) filter(where event_name='quest_completed'),
    'crafts_completed',coalesce(sum(case when event_name='craft_completed' then greatest(1,coalesce((properties->>'quantity')::integer,1)) else 0 end),0),
    'items_equipped',count(*) filter(where event_name='item_equipped'),
    'items_dismantled',coalesce(sum(case when event_name='item_dismantled' then greatest(1,coalesce((properties->>'quantity')::integer,1)) else 0 end),0)
  )
  into v_overview
  from public.analytics_events
  where channel=v_channel and created_at>=v_since;

  select coalesce(jsonb_agg(x order by (x->>'count')::int desc),'[]'::jsonb) into v_classes
  from (select jsonb_build_object('name',coalesce(properties->>'class','Unknown'),'count',count(*)) x
    from public.analytics_events where channel=v_channel and created_at>=v_since and event_name='character_created'
    group by coalesce(properties->>'class','Unknown')) q;

  select coalesce(jsonb_agg(x order by (x->>'count')::int desc),'[]'::jsonb) into v_races
  from (select jsonb_build_object('name',coalesce(properties->>'race','Unknown'),'count',count(*)) x
    from public.analytics_events where channel=v_channel and created_at>=v_since and event_name='character_created'
    group by coalesce(properties->>'race','Unknown')) q;

  select coalesce(jsonb_agg(x order by (x->>'count')::int desc),'[]'::jsonb) into v_combos
  from (select jsonb_build_object('class',coalesce(properties->>'class','Unknown'),'race',coalesce(properties->>'race','Unknown'),'count',count(*)) x
    from public.analytics_events where channel=v_channel and created_at>=v_since and event_name='character_created'
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
    where channel=v_channel and created_at>=v_since and event_name in ('dungeon_started','dungeon_completed') and coalesce(properties->>'dungeon_id','')<>''
    group by properties->>'dungeon_id'
  ) q;

  select coalesce(jsonb_agg(x order by (x->>'completions')::int desc),'[]'::jsonb) into v_quests
  from (
    select jsonb_build_object('id',coalesce(properties->>'quest_id','unknown'),'name',coalesce(max(properties->>'quest_name'),min(coalesce(properties->>'quest_id','unknown')),'Unknown quest'),'completions',count(*),'unique_players',count(distinct user_id)) x
    from public.analytics_events
    where channel=v_channel and created_at>=v_since and event_name='quest_completed'
    group by coalesce(properties->>'quest_id','unknown')
  ) q;

  select coalesce(jsonb_agg(x order by (x->>'opens')::int desc),'[]'::jsonb) into v_features
  from (
    select jsonb_build_object('name',coalesce(properties->>'view','unknown'),'opens',count(*),'unique_players',count(distinct user_id)) x
    from public.analytics_events
    where channel=v_channel and created_at>=v_since and event_name='view_opened'
    group by coalesce(properties->>'view','unknown') order by count(*) desc limit 20
  ) q;

  select coalesce(jsonb_agg(x order by (x->>'level')::int),'[]'::jsonb) into v_levels
  from (
    select jsonb_build_object('level',greatest(1,coalesce((properties->>'level')::integer,1)),'characters',count(*),'players',count(distinct user_id)) x
    from public.analytics_events
    where channel=v_channel and created_at>=v_since and event_name='level_reached'
    group by greatest(1,coalesce((properties->>'level')::integer,1))
  ) q;

  select coalesce(jsonb_agg(x order by (x->>'learned')::int desc),'[]'::jsonb) into v_professions
  from (
    select jsonb_build_object('name',coalesce(properties->>'profession','Unknown'),'learned',count(*) filter(where event_name='profession_learned'),'crafts',coalesce(sum(case when event_name='craft_completed' then greatest(1,coalesce((properties->>'quantity')::integer,1)) else 0 end),0),'players',count(distinct user_id)) x
    from public.analytics_events
    where channel=v_channel and created_at>=v_since and event_name in ('profession_learned','craft_completed')
    group by coalesce(properties->>'profession','Unknown')
  ) q;

  select coalesce(jsonb_agg(x order by x->>'date'),'[]'::jsonb) into v_daily
  from (
    select jsonb_build_object('date',created_at::date,'players',count(distinct user_id),'sessions',count(distinct nullif(session_id,''))) x
    from public.analytics_events
    where channel=v_channel and created_at>=v_since and event_name='app_open'
    group by created_at::date
  ) q;

  return jsonb_build_object(
    'channel',v_channel,'days',v_days,'since',v_since,'overview',coalesce(v_overview,'{}'::jsonb),
    'classes',v_classes,'races',v_races,'class_race',v_combos,'dungeons',v_dungeons,'quests',v_quests,
    'features',v_features,'levels',v_levels,'professions',v_professions,'daily_activity',v_daily
  );
end;
$function$;

