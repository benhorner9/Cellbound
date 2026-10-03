const fs=require('fs');
const path=require('path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const shell=read('guild.html');
assert(!shell.includes('maximum-scale=1'),'beta shell must allow browser zoom');
assert(!shell.includes('user-scalable=no'),'beta shell must not disable pinch zoom');
assert(shell.includes('CHAPTER PATH'),'home screen uses player-facing chapter language');
assert(shell.includes('Clear quests and dungeons to push the guild deeper.'),'home chapter guidance is concrete');
assert(shell.includes('<b>Activities</b>'),'Activities must not be labelled Side Content');
assert(!shell.includes('<b>Side Content</b>'),'developer-facing Side Content label returned');
assert(shell.includes('<small>RAIDS</small><b>Raids</b>'),'raid shortcut uses the raid label');
assert(shell.includes('ui-polish-v3.css?v=3'),'beta interaction polish must be cache-busted');

const rosterFilter=(shell.match(/<select id="rosterClassFilter"[\s\S]*?<\/select>/)||[])[0]||'';
for(const klass of ['Warrior','Paladin','Hunter','Rogue','Mage'])assert(rosterFilter.includes('<option>'+klass+'</option>'),'beta roster filter missing '+klass);
for(const klass of ['Priest','Druid','Shaman','Warlock','Monk','Death Knight'])assert(!rosterFilter.includes('<option>'+klass+'</option>'),'locked class leaked into beta roster filter: '+klass);

const guild=read('guild-v4.js');
assert(!guild.includes("'CONTENT LOCKED'"),'home readiness must identify the quest gate instead of generic content');

const playerFiles=['quests-v2.js','hollow-sanctum-v1.js','chaos-canyon-v1.js','onboarding-v1.js','manor-raid-v1.js'];
const joined=playerFiles.map(read).join('\n');
for(const stale of [
  'Combat simulation live',
  'This is not a fake training window',
  'same Combat Reborn simulation and shared combat viewer',
  'same combat system as every dungeon',
  'harder content stops forgiving it',
  '<small>RUN PROGRESSION</small>'
])assert(!joined.includes(stale),'developer-facing beta copy returned: '+stale);

const onboarding=read('onboarding-v1.js');
assert(onboarding.includes('Your first real adventure starts here.'),'tutorial handoff should feel like the game, not a prototype');
assert(onboarding.includes('The fight could not start. Refresh and try this room again.'),'tutorial errors should be plain and actionable');

for(const file of ['dungeon-2d-v1.js','hollow-sanctum-v1.js','chaos-canyon-v1.js','blackout-station-v1.js','fractured-ages-v1.js']){
  assert(!read(file).includes("source:'Endgame Reward'"),file+' exposes the old reward source label');
}

const polish=read('ui-polish-v3.css');
for(const hook of [
  '-webkit-text-size-adjust:100%',
  'body :is(button,a,[role="button"],input,select,textarea):focus-visible',
  'touch-action:manipulation',
  'font-size:16px',
  '@media(prefers-reduced-motion:reduce)'
])assert(polish.includes(hook),'beta UI polish missing '+hook);

console.log('Beta UI/UX regression passed: player copy, beta filters, zoom, keyboard focus, touch handling, iPad form sizing and reduced motion are release-gated.');
