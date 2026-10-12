'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const manifest=require('../tools/runtime-manifest.cjs');
const source=x=>fs.readFileSync(manifest.sourcePath(root,x),'utf8');
const onboarding=source('onboarding-v1.js'),style=source('onboarding-v1.css');
const nav=source('immersive-hub-v1.js'),header=source('top-navigation-v1.js');
const guild=source('guild.html'),build=source('build.js');
const uiBrowser=fs.readFileSync(path.join(__dirname,'ui-performance.browser.cjs'),'utf8');
const forgeBrowser=fs.readFileSync(path.join(__dirname,'blacksmith-forge.browser.cjs'),'utf8');
const livingBrowser=fs.readFileSync(path.join(__dirname,'living-combat.browser.cjs'),'utf8');
const stages=['guild-introduction','party-builder','first-expedition','gear',
'dungeon-briefing','loot-review','recovery-lesson','profession-choice','quest-lesson'];
const order=onboarding.slice(onboarding.indexOf('const steps=['),onboarding.indexOf('const objectives={'));
for(const stage of stages)assert(order.includes("['"+stage+"'"),'Chapter 0 missing '+stage);
for(const stage of ['recovery-lesson','craft','profession-use','departure']){
 assert(order.includes("'"+stage+"':"),'Chapter 0 progress must map '+stage);
}
assert(order.includes("'recovery-lesson':6")&&order.includes("'craft':7"),'Recovery and craft must no longer be hidden inside Loot');
assert(onboarding.includes('aria-current="step"')&&onboarding.includes('Chapter 0 lesson progress'),'Current tutorial stage must be accessible');
assert(onboarding.includes('OPEN QUEST JOURNAL →')&&onboarding.includes("Game.switchView('quests')"),'Tutorial must hand over to the real Quest Journal');
assert(onboarding.includes("if(!s.onboarding?.coreTrainingComplete){render();return}"),'Tutorial fundamentals must remain required');
assert(style.includes('onboard-progress span[aria-current="step"]'),'9-step tracker needs visible active state');
assert(style.includes('@media(max-width:700px)'),'Small-screen onboarding fallback missing');
const primary=header.slice(header.indexOf('const destinations = ['),header.indexOf('const original = id'));
assert(primary.includes("['content',")&&!primary.includes("['quests',"),'Primary navigation must remain six destinations');
assert(nav.includes("['quests','Quests']"),'Adventure contextual Quest Journal must exist');
assert(uiBrowser.includes('#cbContextNav [data-cb-go="quests"]'),'QA must use real Adventure subnavigation');
assert(!uiBrowser.includes('#cbGlobalNavigation [data-cb-nav="quests"]'),'QA must never depend on removed nav item');
assert(forgeBrowser.includes('perfect.heat>98')&&forgeBrowser.includes('rough.heat>=49'),'Forge QA must allow normal real-time cooling');
assert(livingBrowser.includes('timeout:10000,polling:50'),'Living combat FX cleanup must get bounded headroom');
const required=['ui-foundation-v1.css','guild-hall-v2.css','heroes-workspace-v1.css','adventure-combat-v1.css','workshop-economy-v1.css','community-workspace-v1.css'];
for(const asset of required){
 assert(guild.includes('./'+asset+'?v=1'),'Missing UI block '+asset);
 assert(manifest.files.includes(asset),'UI block asset not in runtime manifest '+asset);
 assert(build.includes("'"+asset+"'"),'UI asset not in consolidated bundle '+asset);
}
const ids=['#overview','#roster','#party','#bank','#professions','#quests','#content','#raids','#world','#trading','#pvp','#chat','#highscores','#support','#admin'];
for(const id of ids)assert(guild.includes('id="'+id.slice(1)+'"'),'Player/admin view missing '+id);
console.log('Block 7 acceptance: nine-step tutorial, cross-block navigation, live readiness, forge/FX timing and 15 routes covered.');
