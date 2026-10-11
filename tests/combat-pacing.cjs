'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=file=>fs.readFileSync(path.join(root,'dist',file),'utf8');
const sandbox={window:{}};vm.createContext(sandbox);
vm.runInContext(source('combat-standard-v1.js'),sandbox,{filename:'combat-standard-v1.js'});
const pace=sandbox.window.CellboundCombatStandard;
assert.equal(pace.NORMAL_PLAYBACK_RATE,.7,'normal is 30% slower than real-time simulation');
assert.equal(pace.playbackRate(1),.7,'default PvE and PvP owner sessions use 0.7x');
assert.equal(pace.playbackRate(2),1.4,'fast mode remains twice the normal presentation pace');
assert.equal(pace.playbackRate(.5),.35,'slow replay scales from the same baseline');
assert.equal(pace.playbackLabel(1),'0.7×','speed button displays its real playback rate');
assert.equal(pace.playbackLabel(2),'1.4×','fast button displays its real playback rate');
for(const file of ['dungeon-2d-v1.js','chaos-canyon-v1.js','hollow-sanctum-v1.js','blackout-station-v1.js']){
 const src=source(file);
 assert(src.includes('playbackRate?.('),file+' must use the central pace');
 assert(src.includes('session.advance(delta)'),file+' must retain live Combat Reborn sessions');
 assert(src.includes('speedLabel:'),file+' must label its actual speed');
}
assert(source('pvp-owner-qa-v1.js').includes('engine.playbackRate?.(1)'), 'PvP owner practice uses relaxed pace');
for(const file of ['quests-v2.js','twelve-below-v1.js','onboarding-v1.js']){
 const src=source(file);
 assert(src.includes('playbackRate?.('),file+' must use central combat pacing');
 assert(src.includes('session.advance(delta)'),file+' retains live engine progression');
}
assert(source('dungeon-2d-v1.js').includes("!replayMode&&run?.rebornSimulation?.meta?.zone==='manor-raid'?1"), 'synchronised two-player Manor raids retain authoritative server timing');
const engine=source('combat-reborn-v1.js');
assert(engine.includes('const TICK=100'),'authoritative simulation tick must stay at 100ms');
assert(engine.includes('COMMAND_POWER_REGEN_MS=8000'),'gameplay command cooldowns and balance are unchanged');
console.log('Shared relaxed combat playback contract passed: all live PvE views, raid authority safety, PvP owner practice and replay labels.');
