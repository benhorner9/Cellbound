-- Enable Blackout Station and The Fractured Ages in the shared Heroic / Cellbound+ progression service.

create or replace function public.begin_dungeon_attempt(
  p_dungeon_id text,
  p_difficulty text,
  p_tier integer,
  p_dungeon_version integer,
  p_season_id text default 'foundations-1'::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid:=auth.uid();
  v_progress public.dungeon_progress%rowtype;
  v_tier integer:=greatest(0,coalesce(p_tier,0));
  v_target integer;
  v_attempt uuid;
  v_seed text;
  v_snapshot jsonb;
  v_signature text;
  v_classes text[];
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_dungeon_id not in ('ashen-vault','hollow-sanctum','chaos-canyon','blackout-station','fractured-ages') then raise exception 'Unknown dungeon'; end if;
  if p_difficulty not in ('normal','heroic','cellbound') then raise exception 'Invalid difficulty'; end if;
  if p_difficulty<>'cellbound' then v_tier:=0; end if;
  if p_difficulty='cellbound' and v_tier not between 1 and 20 then raise exception 'Invalid Cellbound+ tier'; end if;
  if coalesce(p_dungeon_version,0)<1 then raise exception 'Invalid dungeon version'; end if;
  if not exists(select 1 from public.endgame_seasons where id=p_season_id and active=true) then raise exception 'Season is not active'; end if;

  select * into v_progress from public.dungeon_progress where user_id=v_uid and dungeon_id=p_dungeon_id;
  if p_difficulty='heroic' and (not found or not v_progress.heroic_unlocked) then raise exception 'Heroic is not unlocked'; end if;
  if p_difficulty='cellbound' and (not found or not v_progress.cellbound_unlocked or v_tier>greatest(1,v_progress.highest_tier)) then raise exception 'Cellbound+ tier is not unlocked'; end if;

  v_snapshot:=public.endgame_party_snapshot(v_uid);
  if jsonb_array_length(v_snapshot)<>5 or exists(
    select 1 from jsonb_array_elements(v_snapshot) x where coalesce(x->>'class','')=''
  ) then raise exception 'A complete five-character party is required'; end if;

  select array_agg(distinct x->>'class' order by x->>'class') into v_classes from jsonb_array_elements(v_snapshot) x;
  v_signature:=md5(v_snapshot::text);
  v_target:=case p_dungeon_id
    when 'ashen-vault' then 720000
    when 'hollow-sanctum' then 900000
    when 'chaos-canyon' then 1080000
    when 'blackout-station' then 840000
    when 'fractured-ages' then 1320000
    else 1080000
  end;
  v_seed:=replace(gen_random_uuid()::text,'-','');

  update public.dungeon_attempts set status='abandoned',completed_at=now(),invalid_reason='superseded'
  where user_id=v_uid and dungeon_id=p_dungeon_id and status='active';

  insert into public.dungeon_attempts(user_id,dungeon_id,difficulty,tier,season_id,dungeon_version,target_time_ms,seed,party_snapshot,party_signature,party_classes)
  values(v_uid,p_dungeon_id,p_difficulty,v_tier,p_season_id,p_dungeon_version,v_target,v_seed,v_snapshot,v_signature,coalesce(v_classes,'{}'::text[]))
  returning id into v_attempt;

  return jsonb_build_object('attemptId',v_attempt,'seed',v_seed,'targetTimeMs',v_target,'difficulty',p_difficulty,'tier',v_tier,'dungeonVersion',p_dungeon_version,'seasonId',p_season_id,'party',v_snapshot);
end
$function$;

create or replace function public.record_dungeon_run(
  p_dungeon_id text,
  p_difficulty text,
  p_tier integer,
  p_completion_time_ms integer,
  p_target_time_ms integer,
  p_deaths integer,
  p_mechanics_failed integer,
  p_mistakes integer,
  p_dungeon_version integer,
  p_season_id text default 'foundations-1'::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
 v_uid uuid:=auth.uid(); v_name text; v_progress public.dungeon_progress%rowtype; v_score integer; v_base integer;
 v_time_bonus integer:=0; v_tier integer:=greatest(0,coalesce(p_tier,0)); v_week date:=date_trunc('week',current_date)::date;
 v_week_points integer; v_timed boolean:=false; v_guild text; v_min_time integer; v_run_id bigint;
begin
 if v_uid is null then raise exception 'Authentication required'; end if;
 if p_dungeon_id not in ('ashen-vault','hollow-sanctum','chaos-canyon','blackout-station','fractured-ages') then raise exception 'Unknown dungeon'; end if;
 if p_difficulty not in ('normal','heroic','cellbound') then raise exception 'Invalid difficulty'; end if;
 if p_difficulty='cellbound' and (v_tier<1 or v_tier>20) then raise exception 'Cellbound+ tier must be 1–20'; end if;
 if p_difficulty<>'cellbound' then v_tier:=0; end if;
 if coalesce(p_dungeon_version,0)<1 then raise exception 'Invalid dungeon version'; end if;
 if coalesce(p_deaths,-1) not between 0 and 100 or coalesce(p_mechanics_failed,-1) not between 0 and 500 or coalesce(p_mistakes,-1) not between 0 and 500 then raise exception 'Invalid run metrics'; end if;
 v_min_time:=case when p_difficulty='normal' then 25000 when p_difficulty='heroic' then 35000 else 45000 end;
 if coalesce(p_completion_time_ms,0)<v_min_time or p_completion_time_ms>14400000 then raise exception 'Implausible completion time'; end if;
 if p_difficulty='cellbound' and coalesce(p_target_time_ms,0)<60000 then raise exception 'Invalid target time'; end if;

 select * into v_progress from public.dungeon_progress where user_id=v_uid and dungeon_id=p_dungeon_id;
 if not found then insert into public.dungeon_progress(user_id,dungeon_id) values(v_uid,p_dungeon_id) returning * into v_progress; end if;
 if p_difficulty='heroic' and not v_progress.heroic_unlocked then raise exception 'Heroic is not unlocked'; end if;
 if p_difficulty='cellbound' then
  if not v_progress.cellbound_unlocked then raise exception 'Cellbound+ is not unlocked'; end if;
  if v_tier>greatest(1,v_progress.highest_tier) then raise exception 'Cellbound+ tier is not unlocked'; end if;
 end if;

 v_name:=case p_dungeon_id
  when 'ashen-vault' then 'The Ashen Vault'
  when 'hollow-sanctum' then 'The Hollow Sanctum'
  when 'chaos-canyon' then 'Chaos Canyon'
  when 'blackout-station' then 'Blackout Station'
  when 'fractured-ages' then 'The Fractured Ages'
  else p_dungeon_id
 end;
 select coalesce(nullif(game_state->>'socialDisplayName',''),'Guild '||upper(left(v_uid::text,4))) into v_guild from public.guild_accounts where user_id=v_uid;
 v_guild:=coalesce(v_guild,'Guild '||upper(left(v_uid::text,4)));

 v_base:=case p_difficulty when 'normal' then 180 when 'heroic' then 360 else 500+v_tier*95 end;
 if p_difficulty='cellbound' then
  v_timed:=p_completion_time_ms<=p_target_time_ms;
  v_time_bonus:=greatest(-120,least(300,round((p_target_time_ms-p_completion_time_ms)::numeric/1000)*4));
 else
  v_time_bonus:=greatest(0,180-round(p_completion_time_ms::numeric/1000));
 end if;
 v_score:=greatest(0,v_base+v_time_bonus-(p_deaths*50)-(p_mechanics_failed*22)-(p_mistakes*8));

 insert into public.dungeon_runs(user_id,guild_label,dungeon_id,dungeon_name,difficulty,tier,season_id,dungeon_version,completion_time_ms,target_time_ms,deaths,mechanics_failed,mistakes,score,timed,valid)
 values(v_uid,v_guild,p_dungeon_id,v_name,p_difficulty,v_tier,p_season_id,p_dungeon_version,p_completion_time_ms,case when p_difficulty='cellbound' then p_target_time_ms else null end,p_deaths,p_mechanics_failed,p_mistakes,v_score,v_timed,true)
 returning id into v_run_id;

 update public.dungeon_progress set
  normal_clears=normal_clears+case when p_difficulty='normal' then 1 else 0 end,
  heroic_unlocked=heroic_unlocked or p_difficulty='normal',
  heroic_clears=heroic_clears+case when p_difficulty='heroic' then 1 else 0 end,
  cellbound_unlocked=cellbound_unlocked or p_difficulty='heroic',
  highest_tier=case when p_difficulty='heroic' then greatest(highest_tier,1) when p_difficulty='cellbound' then greatest(highest_tier,least(20,v_tier+1)) else highest_tier end,
  cellbound_clears=cellbound_clears+case when p_difficulty='cellbound' then 1 else 0 end,
  best_score=greatest(best_score,v_score),
  best_time_ms=case when best_time_ms is null then p_completion_time_ms else least(best_time_ms,p_completion_time_ms) end,
  updated_at=now()
 where user_id=v_uid and dungeon_id=p_dungeon_id returning * into v_progress;

 v_week_points:=case when p_difficulty='normal' then 10 when p_difficulty='heroic' then 25 else 30+v_tier*5 end;
 insert into public.dungeon_weekly_progress(user_id,week_start,season_id,progress_points,highest_tier,completed_runs)
 values(v_uid,v_week,p_season_id,v_week_points,v_tier,1)
 on conflict(user_id,week_start) do update set
  progress_points=public.dungeon_weekly_progress.progress_points+excluded.progress_points,
  highest_tier=greatest(public.dungeon_weekly_progress.highest_tier,excluded.highest_tier),
  completed_runs=public.dungeon_weekly_progress.completed_runs+1,updated_at=now();

 return jsonb_build_object('runId',v_run_id,'score',v_score,'timed',v_timed,'heroicUnlocked',v_progress.heroic_unlocked,'cellboundUnlocked',v_progress.cellbound_unlocked,'highestTier',v_progress.highest_tier,'weeklyPoints',(select progress_points from public.dungeon_weekly_progress where user_id=v_uid and week_start=v_week));
end
$function$;
