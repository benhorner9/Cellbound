'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const manifest=require('../tools/runtime-manifest.cjs');
const read=name=>fs.readFileSync(manifest.sourcePath(root,name),'utf8');
const html=read('guild.html'),css=read('community-workspace-v1.css'),
 js=read('community-workspace-v1.js'),build=read('build.js'),
 pvp=read('pvp-v1.js'),social=read('social-v3.js'),ranking=read('highscores-v1.js');
for(const name of ['community-workspace-v1.css','community-workspace-v1.js']){
 assert(manifest.files.includes(name),'Community file absent from runtime: '+name);
 assert(html.includes('./'+name+'?v=1'),'Community file not linked: '+name);
}
assert(html.indexOf('workshop-economy-v1.css?v=1')<html.indexOf('community-workspace-v1.css?v=1'),
 'Block 6 stylesheet must follow Block 5');
assert(html.indexOf('workshop-economy-v1.js?v=1')<html.indexOf('community-workspace-v1.js?v=1'),
 'Community script must follow previous UI');
assert(html.lastIndexOf('<link rel="stylesheet"')===html.indexOf('<link rel="stylesheet" href="./community-workspace-v1.css'),
 'Community stylesheet must be final authored CSS layer');
assert(build.includes("'workshop-economy-v1.css','community-workspace-v1.css'"),'New CSS must be part of the UI bundle');
for(const view of ['pvp','chat','highscores','support','admin']){
 assert(js.includes("'"+view+"'"),'Missing page: '+view);
 assert(css.includes('#'+view),'Missing shared page styling: '+view);
}
assert(pvp.includes('const PVP_ENABLED=false'),'PvP must remain deliberately disabled');
assert(!js.includes('PVP_ENABLED=')&&!js.includes('pvpEnabled='),'No PvP unlock changes allowed');
assert(js.includes('!button.disabled')&&js.includes("classList.contains('locked')"),
 'Route shortcuts must honour game permissions');
assert(social.includes("data-chat-channel")&&js.includes('#partyFinderForm'),
 'Existing chat moderation and Party Finder must be reused');
assert(ranking.includes('level-a.level')||ranking.includes('b.level-a.level'),
 'Rank order must remain level then XP');
for(const id of ['#betaReportForm','#guildHighScores','#pvpMount','#chatMessages']){
 assert(html.includes(id.replace('#','id="')),'Original gameplay mount must survive '+id);
}
for(const selector of ['.chat-panel','.pvp-hero','.hs-table','.beta-panel','.dbo-shell',
 '.admin-workspace-nav','.cb-community-routes','@media(max-width:850px)']){
 assert(css.includes(selector),'Missing stable CSS layout: '+selector);
}
assert(!css.includes('.cbe-canvas{')&&!css.includes('.cbe-live{'),
 'Design Booth canvas geometry must not be overridden');
assert(!js.includes('persistState(')&&!js.includes('post_chat_message(')&&!js.includes('localStorage'),
 'UI layer cannot write player/community data');
new Function(js);
console.log('Block 6 Community contract passed: PvP lock, chat, leaderboard order, support and admin preservation.');
