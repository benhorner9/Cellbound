'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const manifest=require('../tools/runtime-manifest.cjs');
const read=n=>fs.readFileSync(manifest.sourcePath(root,n),'utf8');
const html=read('guild.html'),js=read('workshop-economy-v1.js'),
 css=read('workshop-economy-v1.css'),build=read('build.js');
for(const file of ['workshop-economy-v1.js','workshop-economy-v1.css']){
 assert(manifest.files.includes(file),'Runtime missing '+file);
 assert(html.includes('./'+file+'?v=1'),'Guild page missing '+file);
}
assert(html.indexOf('adventure-combat-v1.css')<html.indexOf('workshop-economy-v1.css'),
 'Economy styles must load after previous block');
assert(html.includes('<link rel="stylesheet" href="./workshop-economy-v1.css?v=1">'),
 'Economy stylesheet must stay linked and preserve its position after Adventure');
assert(html.indexOf('adventure-combat-v1.js')<html.indexOf('workshop-economy-v1.js'),
 'Economy script must load after navigation and previous UI');
assert(build.includes("'adventure-combat-v1.css','workshop-economy-v1.css'"),
 'Economy CSS must be bundled without another HTTP request');
for(const ref of ['#professions','#bank','#trading','#professionCharacterList',
 '#professionWorkshop','#workshopTitle','.profession-char.active']){
 assert(js.includes(ref),'Real artisan/shop selection is required: '+ref);
}
for(const route of ["'professions'","'bank'","'trading'"]){
 assert(js.includes(route),'Workshop journey route missing '+route);
}
assert(js.includes("source.disabled")&&js.includes("classList.contains('locked')"),
 'Links must reflect authentication and roster permission changes');
for(const selector of ['.profession-layout','.recipe-card','.reagent-card','.forge-workshop',
 '.tp-layout','.tp-category-list','.tp-inspector','.cb-workshop-context']){
 assert(css.includes(selector),'Profession/market UI missing '+selector);
}
assert(css.includes('@media(max-width:850px)')&&css.includes('@media(max-width:620px)'),
 'Both tablet and small screen layouts must exist');
assert(!css.includes('.forge-scene{')&&!css.includes('.forge-heat-glow{'),
 'Blacksmith forge mini-game scene and timing must remain intact');
assert(!js.includes('Game.save(')&&!js.includes('persistState(')&&
 !js.includes('fetch(')&&!js.includes('localStorage'),
 'UI must not write game inventories, accounts or commerce');
new Function(js);
console.log('Block 5: Workshop, selected artisan, original forge, storage/trading and permission-aware routes validated.');
