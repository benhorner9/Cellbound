'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const manifest=require('../tools/runtime-manifest.cjs');
const read=x=>fs.readFileSync(manifest.sourcePath(root,x),'utf8');
const html=read('guild.html'),css=read('adventure-combat-v1.css'),js=read('adventure-combat-v1.js'),build=read('build.js');
for(const name of ['adventure-combat-v1.js','adventure-combat-v1.css']){
 assert(manifest.files.includes(name),'Block 4 runtime missing '+name);
 assert(html.includes('./'+name+'?v=1'),'Block 4 asset missing '+name);
}
assert(html.indexOf('heroes-workspace-v1.css')<html.indexOf('adventure-combat-v1.css'),'Adventure must follow Heroes CSS');
assert(html.indexOf('heroes-workspace-v1.js')<html.indexOf('adventure-combat-v1.js'),'Adventure must load after Heroes JS');
assert(build.includes("'heroes-workspace-v1.css','adventure-combat-v1.css'"),'Adventure CSS must join last bundle');
for(const selector of ['#content','#quests','#raids','#world','#dungeonBrowserStatus','#partyItemLevelTop','#readinessText']){
 assert(js.includes(selector),'Must use existing game node '+selector);
}
assert(js.includes('!source.disabled')&&js.includes("classList.contains('locked')"),'Links must check permissions');
assert(!js.includes('save(')&&!js.includes('replaceChildren('),'Do not mutate progression or existing widgets');
for(const selector of ['.cb-adventure-brief','.dungeon-browser-card','.quest-tabs','.mr-hero','.cbcombat-shell','.cbcombat-chat','.cbcombat-arena-wrap']){
 assert(css.includes(selector),'Missing designed screen '+selector);
}
assert(css.includes(':not(.cbe-live)'),'Saved owner combat layouts must remain editable');
assert(css.includes('aspect-ratio:16 / 9'),'Native combat art ratio must remain');
assert(!css.includes('grid-template-columns:var(--cbcombat-left)'),'No canonical pane geometry changes');
new Function(js);
console.log('Block 4 Adventure and Combat UI contract passed.');
