'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const manifest=require('../tools/runtime-manifest.cjs');
const read=name=>fs.readFileSync(manifest.sourcePath(root,name),'utf8');
const html=read('guild.html');
const css=read('heroes-workspace-v1.css');
const js=read('heroes-workspace-v1.js');
const sheet=read('character-sheet.js');
const build=read('build.js');
for(const file of ['heroes-workspace-v1.css','heroes-workspace-v1.js']){
  assert(manifest.files.includes(file),'Block 3 runtime missing '+file);
  assert(html.includes('./'+file+'?v=1'),'Block 3 source must be linked '+file);
}
assert(html.indexOf('guild-hall-v2.css?v=1')<html.indexOf('heroes-workspace-v1.css?v=1'),'new CSS must follow foundation and Guild Hall');
assert(html.indexOf('guild-hall-v2.js?v=1')<html.indexOf('heroes-workspace-v1.js?v=1'),'workspace must load after existing nav');
assert(build.includes("'guild-hall-v2.css','heroes-workspace-v1.css'"),'Block 3 CSS must be in existing bundle');
for(const id of ['#roster','#party','#bank','#rosterGrid','.roster-card-actions','data-char-equip']){
  assert(js.includes(id),'Missing real-data Heroes hook '+id);
}
for(const route of ['roster','party','bank','equipment']){
  assert((js+sheet).includes(route),'Missing Heroes destination '+route);
}
assert(sheet.includes("currentTab='equipment';armouryModelMode='equipped'"),'Direct Equipment action must open a real equipped view');
assert(sheet.includes("armouryModelMode='equipped';activeSkillSlot=0"),'Open character with real equipped appearance');
assert(js.includes("attributeFilter:['hidden','disabled','class']"),'Shortcut route permissions must be observed');
assert(css.includes('.cb-armoury-screen')&&css.includes('.cb-character-tabs'),'Character sheet must have designed armoury and navigation');
assert(css.includes('@media(max-width:620px)'),'Phone fallback must be included');
assert(!css.includes('.cbcombat-shell'),'Combat views must not be modified in Block 3');
new Function(js);
console.log('Block 3: responsive Heroes, equipment shortcut, real bank/party routes and live character controls verified.');
