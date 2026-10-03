const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const shell=read('guild.html');
for(const hook of ['data-view="support"','id="betaReportForm"','id="betaMyReports"','id="adminBetaReportQueue"','id="adminPlayerLookup"','data-recover-player="cell_shock"','beta-ops-v1.js','admin-beta-ops-v1.js']){
  assert(shell.includes(hook),'Beta operations shell is missing '+hook);
}

const player=read('beta-ops-v1.js');
for(const hook of ["db.from('beta_reports').insert(payload)",'contextSnapshot()','page_view:activeView()','PATCH_NOTES','Report sent']){
  assert(player.includes(hook),'Player beta support runtime is missing '+hook);
}

const admin=read('admin-beta-ops-v1.js');
for(const hook of ['cellbound_admin_beta_reports','cellbound_admin_update_beta_report','cellbound_admin_player_lookup','cellbound_admin_recover_player','data-beta-status','data-recover-player']){
  assert(admin.includes(hook),'Admin beta operations runtime is missing '+hook);
}

const migration=read('supabase/migrations/20261003181012_beta_operations_foundation.sql');
for(const hook of [
  'alter table public.beta_reports enable row level security',
  'grant insert (category,severity,summary,details,page_view,build_id,build_number,context)',
  'with check ((select auth.uid()) = user_id)',
  'public.cellbound_admin_beta_reports',
  'public.cellbound_admin_update_beta_report',
  'public.cellbound_admin_player_lookup',
  'public.cellbound_admin_recover_player',
  "v_action='dungeon_attempts'"
])assert(migration.includes(hook),'Beta operations database contract is missing '+hook);
assert(!migration.includes('grant update on table public.beta_reports to authenticated'),'Players must not receive direct beta report update rights');
assert(!migration.includes('grant delete on table public.beta_reports to authenticated'),'Players must not receive direct beta report delete rights');

const playbook=read('BETA_OPERATIONS.md'),log=read('BETA_CHANGELOG.md');
for(const hook of ['Daily loop','Severity','Recovery rules','Beta release checklist'])assert(playbook.includes(hook),'Beta operations playbook is missing '+hook);
assert(log.includes('Step 9: Beta Operations'),'Beta development log is missing the Step 9 entry');

console.log('Beta Step 9 operations regression passed: support intake, admin triage, recovery safety and release workflow are present.');
