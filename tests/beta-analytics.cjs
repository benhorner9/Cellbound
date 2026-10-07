const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const analytics=read('analytics-v1.js');
for(const hook of [
  "db.rpc('cellbound_record_analytics_event'",
  "track('app_open'",
  "track('view_opened'",
  "characterCreated(c,'existing_at_tracking_start')",
  "track('character_created'",
  "track('level_reached'",
  "if(host==='cb.athleticsmanagergame.com')return'staging'",
  "playcellbound\\.com"
])assert(analytics.includes(hook),'Analytics runtime is missing '+hook);

const guild=read('guild-v4.js');
for(const hook of [
  "CellboundAnalytics?.characterCreated?.(ch,'recruit')",
  "CellboundAnalytics?.levelReached?.(ch,level,source)",
  "track?.('item_equipped'",
  "track?.('item_dismantled'",
  "track?.('cell_shock_applied'"
])assert(guild.includes(hook),'Guild analytics hook is missing '+hook);

const onboarding=read('onboarding-v1.js');
for(const hook of [
  "characterCreated?.(ch,'onboarding')",
  "track?.('profession_learned'",
  "track?.('craft_completed'"
])assert(onboarding.includes(hook),'Onboarding analytics hook is missing '+hook);

const economy=read('economy-v2.js');
for(const hook of ["track?.('profession_learned'","track?.('craft_completed'"])
  assert(economy.includes(hook),'Economy analytics hook is missing '+hook);

const quests=read('quests-v2.js');
for(const hook of [
  "quest_completed:ashes-east-road",
  "quest_completed:echoes-beneath-zeltira",
  "quest_completed:signal-from-nowhere",
  "track?.('quest_completed'"
])assert(quests.includes(hook),'Quest analytics hook is missing '+hook);

const endgame=read('endgame-v1.js');
for(const hook of ["track?.('dungeon_started'","track?.('dungeon_completed'","dungeon_completed:'+attempt.attemptId"])
  assert(endgame.includes(hook),'Dungeon analytics hook is missing '+hook);

const manor=read('manor-raid-v1.js');
for(const hook of ["track?.('raid_started'","track?.('raid_completed'"])
  assert(manor.includes(hook),'Raid analytics hook is missing '+hook);

const twelve=read('twelve-below-v1.js');
for(const hook of ["track?.('activity_started'","track?.('activity_completed'"])
  assert(twelve.includes(hook),'Activity analytics hook is missing '+hook);

const shell=read('guild.html');
for(const hook of [
  'analytics-v1.js?v=2',
  'admin-analytics-v1.js?v=1',
  'admin-analytics-v1.css?v=1',
  'id="adminAnalyticsClasses"',
  'id="adminAnalyticsRaces"',
  'id="adminAnalyticsDungeons"',
  'id="adminAnalyticsFeatures"'
])assert(shell.includes(hook),'Analytics Admin UI is missing '+hook);

const admin=read('admin-analytics-v1.js');
for(const hook of [
  "cellbound_admin_analytics_summary",
  "adminAnalyticsChannel",
  "adminAnalyticsDays",
  "completion_rate",
  "daily_activity"
])assert(admin.includes(hook),'Admin analytics runtime is missing '+hook);

const migration=read('supabase/migrations/20261003195133_beta_analytics_foundation.sql');
for(const hook of [
  'alter table public.analytics_events enable row level security',
  'grant insert (event_name,event_key,session_id,channel,build_id,build_number,page_view,properties)',
  'with check ((select auth.uid()) = user_id)',
  'create unique index if not exists analytics_events_user_event_key_uidx',
  'public.cellbound_admin_analytics_summary',
  'Admin access required'
])assert(migration.includes(hook),'Analytics database contract is missing '+hook);
const stabilityMigration=read('supabase/migrations/20261007084500_block1_runtime_stability.sql');
for(const hook of [
  'public.cellbound_record_analytics_event',
  'on conflict do nothing',
  'grant execute on function public.cellbound_record_analytics_event',
  'delete from public.cellbound_world_presence as stale'
])assert(stabilityMigration.includes(hook),'Block 1 analytics/presence stability contract is missing '+hook);
assert(!migration.includes('grant select on table public.analytics_events to authenticated'),'Players must not be able to read the analytics event table directly');
assert(!migration.includes('grant update on table public.analytics_events to authenticated'),'Analytics events must be append-only for players');
assert(!migration.includes('grant delete on table public.analytics_events to authenticated'),'Analytics events must not be deletable by players');

console.log('Beta analytics regression passed: event collection, channel separation, Admin aggregation and privacy contracts are present.');
