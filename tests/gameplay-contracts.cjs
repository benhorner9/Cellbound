const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const dungeons=[
  ['ashen-vault','src/dungeons/dungeon-2d-v1.js'],
  ['hollow-sanctum','src/dungeons/hollow-sanctum-v1.js'],
  ['chaos-canyon','src/dungeons/chaos-canyon-v1.js'],
  ['blackout-station','src/dungeons/blackout-station-v1.js'],
  ['fractured-ages','src/dungeons/fractured-ages-v1.js']
];

for(const [id,file] of dungeons){
  const src=read(file);
  assert(src.includes("CellboundCombatStandard?.register?.('"+id+"'"),id+' must register with the shared combat contract');
  assert(src.includes("ui:'shared-cb2d'"),id+' must use the shared CB2D UI');
  assert(src.includes("abandonAttempt?.('"+id+"')"),id+' close path must abandon an unfinished server attempt');
  assert(src.includes("cellbound:dungeon-complete"),id+' must emit the common dungeon completion event');
  assert(!/combat-3d-v1|CellboundCombat3D/.test(src),id+' must not depend on a standalone/legacy combat viewer');
  assert(/results-screen|cb2d-loot-screen|fa-results/.test(src),id+' must expose a completion/results presentation');
}

const blackout=read('src/dungeons/blackout-station-v1.js');
assert(blackout.includes('vex-calder-room.avif'),'Blackout Station must use the approved Dr. Vex room art');
assert(!blackout.includes('reactor-core.webp'),'Blackout Station must not reference the retired reactor room art');
assert(!blackout.includes('REACTOR CORE'),'Blackout Station must not expose the retired Reactor Core label');
assert(blackout.includes('data-bs-owner-start'),'Blackout Station must expose the owner start-at-Vex control');
assert(blackout.includes('data-bs-owner-skip'),'Blackout Station must expose the in-grid owner skip control');
assert(blackout.includes("powerOn('owner')"),'owner skip must enter the boss path without consuming override stock');
assert(blackout.includes("tank:{x:27,y:27")&&blackout.includes("dps:{x:48,y:74")&&blackout.includes("healer:{x:73,y:27"),'Dr. Vex role circuits must remain defined');

const manor=read('manor-raid-v1.js');
assert(manor.includes("CellboundCombatStandard?.register?.('manor-raid'"),'The Manor must register with shared combat');
assert(manor.includes("ui:'shared-cb2d'"),'The Manor must use the shared combat viewer');
assert(manor.includes('playSharedEncounter'),'The Manor must route live encounters through the shared viewer');
assert(manor.includes('10-CHARACTER RAID'),'The Manor must retain its two-player / ten-character presentation');
assert(manor.includes('claim_manor_raid_rewards'),'The Manor reward claim path must remain present');

const quests=read('quests-v2.js'),onboarding=read('onboarding-v1.js');
assert(quests.includes("CellboundCombatStandard?.register?.('quest-encounters'")&&quests.includes("ui:'shared-cb2d'"),'quest fights must use shared combat');
assert(onboarding.includes("CellboundCombatStandard?.register?.('zeltira-first-expedition'")&&onboarding.includes("ui:'shared-cb2d'"),'tutorial fights must use shared combat');

const social=read('social-v3.js');
for(const hook of ['create_party_finder_listing','join_party_finder_listing','leave_party_finder_listing','syncPartyToListing'])assert(social.includes(hook),'Party Finder contract missing '+hook);
for(const target of ['ashen-vault','hollow-sanctum','chaos-canyon','blackout-station','fractured-ages','manor'])assert(social.includes(target),'Party Finder target missing '+target);

const market=read('trading-post-v3.js');
for(const hook of ['market_create_listing','market_get_gear_listings','market_get_order_book','market_get_trade_history','market_sweep_my_expired'])assert(market.includes(hook),'Trading Post contract missing '+hook);

const guild=read('guild.html');
assert(guild.includes('id="twelveBelowMount"'),'Twelve Below activity mount is missing');
assert(guild.includes('id="nullComplexMount"'),'Null Complex activity mount is missing');
assert(guild.includes('combat-viewer-v1.js'),'canonical combat viewer is not loaded by the game shell');
assert(!guild.includes('combat-3d-v1.js'),'legacy 3D combat must not be loaded by the game shell');

console.log('Gameplay contracts passed: five dungeons, Blackout Station, Manor, quests/tutorial, Party Finder, Trading Post and activity mounts all use the expected shared runtime contracts.');
