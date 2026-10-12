'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const manifest=require('../tools/runtime-manifest.cjs');
const read=name=>fs.readFileSync(manifest.sourcePath(root,name),'utf8');
const html=read('guild.html'),js=read('guild-hall-v2.js'),css=read('guild-hall-v2.css'),build=read('build.js');
for (const file of ['guild-hall-v2.js','guild-hall-v2.css']) {
  assert(manifest.files.includes(file),'new Guild Hall runtime must ship: '+file);
  assert(html.includes('./'+file+'?v=1'),'missing versioned Guild Hall reference '+file);
}
assert(html.indexOf('guild-hall-v2.css')>html.indexOf('ui-foundation-v1.css'),'home styling must follow UI foundation');
assert(html.indexOf('guild-hall-v2.js')>html.indexOf('top-navigation-v1.js'),'home enhancement must run after routes');
assert(build.includes("'ui-foundation-v1.css','guild-hall-v2.css'"),'home skin must be bundled last');
for(const name of ['#cbHubHero','.home-party-panel','#overviewNextDungeon',
'.home-objective-panel','.home-readiness-panel','.cb-hub-featured']){
  assert(js.includes(name),'missing existing live home widget '+name);
}
for(const needle of ['stage.append(party,mission)','grid.replaceChildren(objective,readiness,actions)',
'home.insertBefore(featured, progress.nextSibling)']){
  assert(js.includes(needle),'home must reparent existing nodes '+needle);
}
for(const route of ['quests','professions','bank','trading'])assert(js.includes("'"+route+"'"),'quick route missing '+route);
assert(js.includes('getAccount?.()')&&js.includes('nameHeading.textContent'),'guild identity must use real account data and safe text');
assert(js.includes("!route.disabled")&&js.includes("classList.contains('locked')"),'respect permissions');
for(const selector of ['.cb-guild-hall-stage','.cb-guildhall-noticeboard','@media(max-width:720px)']){
  assert(css.includes(selector),'required layout selector missing '+selector);
}
assert(!css.includes('.cbcombat-shell'),'Block 2 must not restyle encounters');
new Function(js);
console.log('Block 2 Guild Hall contracts passed.');
