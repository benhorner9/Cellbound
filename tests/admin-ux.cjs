const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const shell=read('guild.html');
for(const hook of [
  'class="admin-workspace-nav"',
  'data-admin-panel-tab="overview"',
  'data-admin-panel-tab="reports"',
  'data-admin-panel-tab="analytics"',
  'data-admin-panel-tab="players"',
  'data-admin-panel-tab="tools"',
  'data-admin-panel="overview"',
  'data-admin-panel="reports"',
  'data-admin-panel="analytics"',
  'data-admin-panel="players"',
  'data-admin-panel="tools"',
  '<option value="open" selected>Open reports</option>'
])assert(shell.includes(hook),'Admin UX shell is missing '+hook);

const admin=read('admin-v1.js');
for(const hook of [
  "cellbound-admin-panel-v1",
  "function setPanel(panel",
  "admin-panel-filtered",
  "cellbound:admin-panel-changed",
  "window.CellboundAdmin.panel=activePanel",
  "environmentLabel()"
])assert(admin.includes(hook),'Admin workspace runtime is missing '+hook);

const reports=read('admin-beta-ops-v1.js');
for(const hook of [
  "filter==='open'",
  "severityRank={blocker:0,high:1,medium:2,low:3}",
  "statusRank={new:0,triaged:1,in_progress:2,fixed:3,closed:4}",
  "adminNavReportCount",
  "cellbound:admin-panel-changed"
])assert(reports.includes(hook),'Admin report-flow optimization is missing '+hook);

const analytics=read('admin-analytics-v1.js');
assert(analytics.includes("e.detail?.panel==='analytics'"),'Analytics should refresh when its workspace opens');
assert(analytics.includes("window.CellboundAdmin?.panel==='analytics'"),'Analytics must stay lazy outside its workspace');

const css=read('admin-v1.css');
for(const hook of ['.admin-workspace-nav','.admin-panel-filtered','.admin-workspace-meta'])
  assert(css.includes(hook),'Admin workspace styling is missing '+hook);

console.log('Admin UX regression passed: focused workspaces, actionable report triage and lazy analytics are wired.');
