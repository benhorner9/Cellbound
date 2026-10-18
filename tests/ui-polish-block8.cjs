'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const manifest=require('../tools/runtime-manifest.cjs');
const read=n=>fs.readFileSync(manifest.sourcePath(root,n),'utf8');
const html=read('guild.html'),build=read('build.js'),
 css=read('ui-polish-block8.css'),js=read('ui-polish-block8.js'),
 economy=read('economy-v2.js'),hall=read('guild-hall-v2.js'),
 cards=read('guild-v4.js');
for(const asset of ['ui-polish-block8.css','ui-polish-block8.js']){
 assert(manifest.files.includes(asset),'Block 8 runtime missing '+asset);
 assert(html.includes('./'+asset+'?v=1'),'Block 8 guild mount missing '+asset);
}
assert(html.lastIndexOf('<link rel="stylesheet"')===html.indexOf('<link rel="stylesheet" href="./ui-polish-block8.css'),'Polish CSS last');
assert(html.indexOf('ui-polish-block8.js?v=1')>html.indexOf('community-workspace-v1.js?v=1'),'Craft modal must load after existing UI and economy');
const bundle=build.slice(build.indexOf('const UI_BUNDLE_SOURCES='),build.indexOf('const bundle=UI_BUNDLE_SOURCES'));
assert(bundle.indexOf("'ui-polish-block8.css'")>bundle.indexOf("'community-workspace-v1.css'"),'Block 8 CSS follows community styles in consolidated bundle');
assert(build.includes('const polish8Link='),'Bundle guard must recognise Block 8 CSS');
assert(economy.includes('window.CellboundCraftOverlay.isReady()'),'Timer must wait for user-initiated modal start');
assert(economy.includes("document.querySelector('#professions.view.active')"),'Leaving workshop must still pause timer');
assert(js.includes("live.replaceChildren(node)")&&js.includes("makeReopen(node,isSummary)"),'Modal must reparent native work order rather than duplicate its engine');
assert(js.indexOf('makeReopen(node,isSummary);')<js.indexOf('live.replaceChildren(node);'),'Workshop resume control must remain in original page');
assert(js.includes("workshop.querySelector('.timed-craft-project')")&&js.includes("workshop.querySelector('[data-forge-job-summary]')"),'Both live minigame and completed result must move into window');
assert(js.includes('new MutationObserver(sync)'),'Forge phase rerenders must remain in focused modal');
assert(js.includes("window.dispatchEvent(new Event('blur'))"),'Closing modal must pause existing craft timer');
assert(js.includes('if(open&&e.key===\'Escape\')')&&js.includes("document.addEventListener('keydown'"),'Escape must close and pause even if forge rerender moves focus');
assert(js.includes('role')&&js.includes('aria-modal'),'Overlay requires dialog semantics');
assert(!js.includes('Game.save(')&&!js.includes('materials[')&&!js.includes('workshopCraftProject='),'Overlay cannot mutate game currencies, XP or saves');
assert(css.includes('.dungeon-browser-heading h3')&&css.includes('.dungeon-browser-art'),'Long dungeon titles must use a consistent full-width card');
assert(css.includes('.roster-search>input')&&css.includes('.roster-card-flags'),'Roster controls and badges must be cleanly aligned');
assert(css.includes('.beta-quick-report-trigger>b'),'Feedback launcher must no longer hide game cards');
assert(css.includes('@media(max-width:850px)')&&css.includes('@media(max-width:620px)'),'Responsive tablet and phone layouts required');
assert(cards.includes('function rosterCard(')&&hall.includes('cbGuildHallStage'),'Existing live roster and Guild Hall remain authoritative');
new Function(js);
console.log('Block 8 contract passed: eight UI layers, native crafting engine, modal pause/reopen/reheat, card polish and feedback.');
