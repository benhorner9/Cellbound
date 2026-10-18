'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const Manifest=require('../tools/runtime-manifest.cjs');
const read=name=>fs.readFileSync(Manifest.sourcePath(root,name),'utf8');
const html=read('guild.html');
const nav=read('top-navigation-v1.js');
const hub=read('immersive-hub-v1.js');
const css=read('ui-foundation-v1.css');
const build=read('build.js');
assert(Manifest.files.includes('ui-foundation-v1.css'),'shared foundation must ship in runtime');
assert(build.includes("'top-navigation-v1.css','ui-foundation-v1.css'"),'shared foundation must be last in the bundled UI cascade');
assert(html.includes('top-navigation-v1.css?v=9'), 'original top nav must remain');
assert(html.includes('ui-foundation-v1.css?v=1'),'new foundation needs a cache-busted link');
assert(html.indexOf('ui-foundation-v1.css?v=1')>html.indexOf('top-navigation-v1.css?v=9'),'foundation must follow the existing skin');
for(const [route,label] of [
 ['overview','Guild'],['content','Adventure'],['roster','Heroes'],
 ['professions','Professions'],['pvp','PvP'],['chat','Social']
]){
  assert(nav.includes("['"+route+"',")&&nav.includes("'"+label+"']"),'missing primary destination '+label);
}
const block=nav.match(/const destinations = \[([\s\S]*?)\];/);
assert(block,'navigation destinations missing');
assert.equal((block[1].match(/\['/g)||[]).length,6,'primary navigation should show exactly six sections');
for(const secondary of ["'admin'","'trading'","'quests'"]){
  assert(!block[1].includes(secondary),'secondary destination must remain in More/context menus: '+secondary);
}
assert(nav.includes("originalNav.querySelector"),'navigation must delegate to existing route handlers');
assert(nav.includes("originalNav, {"),'navigation permission changes must be watched');
assert(hub.includes("guild:{label:'Heroes'"),'sub-navigation label must match Heroes');
assert(hub.includes("professions:'professions'"),'professions must not be mis-grouped under Heroes');
for(const token of ['--cb-ui-ink','--cb-ui-panel','--cb-ui-accent','--cb-ui-text','--cb-ui-muted']){
  assert(css.includes(token),'foundation design token missing: '+token);
}
for(const item of ['.cb-global-header','.cb-subnav','#cbMorePanel','.main>.view .panel','@media (max-width:720px)','focus-visible']){
  assert(css.includes(item),'foundation is missing responsive or accessible shell control: '+item);
}
assert(!css.includes('.cbcombat-shell'),'Block 1 must leave combat internals alone');
console.log('Block 1 UI foundation: six routes, original navigation permissions, bundled styles, responsive design and combat isolation verified.');
