'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),sandbox={window:{},console};vm.createContext(sandbox);
for(const filename of ['src/combat/combat-data-v1.js','src/combat/pvp-ruleset-v1.js','src/combat/pvp-objectives-v1.js','src/combat/combat-reborn-v1.js','src/combat/combat-standard-v1.js'])
 vm.runInContext(fs.readFileSync(path.join(root,filename),'utf8'),sandbox,{filename});
const core=sandbox.window.CellboundCombatReborn,standard=sandbox.window.CellboundCombatStandard;
assert.equal(standard.audit().pvpPrototypeReady,true);
const roles=[['Warrior','Protection'],['Priest','Holy'],['Mage','Arcane'],['Rogue','Assassination'],['Hunter','Marksman']];
const roster=(side,n)=>roles.slice(0,n).map(([className,spec],i)=>({id:side+'-'+i,name:side+' '+className,class:className,spec,level:12,power:18}));
const options=size=>({pvp:{mode:'arena',size,blue:roster('blue',size),red:roster('red',size)},encounter:{id:'pvp-'+size,environment:{blockers:[]}},seed:'pvp-test-'+size,maxDurationMs:26000});
function play(size){
 const session=standard.createPvpSession(options(size),{zone:'pvp-test'});
 assert.equal(typeof session.command,'undefined','PvE commands must be hidden from PvP');
 assert.equal(typeof session.heal,'undefined','External heals must be unavailable');
 assert.equal(typeof session.spawnEnemy,'undefined','PvE spawning must be unavailable');
 assert.equal(session.pvpCommand('blue','target','attack-healer').ok,true);
 assert.equal(session.pvpCommand('red','target','attack-dps').ok,true);
 assert.equal(session.pvpCommand('blue','position','fall-back').reason,'cooldown');
 const events=[];let last;
 for(let i=0;i<290&&!session.finished;i++){
  if(i===16)assert.equal(session.pvpCommand('blue','position','spread').ok,true);
  last=session.advance(100);events.push(...last.events)
 }
 assert(last?.finished&&last.result,'Arena must finish');
 const final=last.result,byId=Object.fromEntries(final.finalState.players.map(p=>[p.id,p]));
 assert.equal(final.pvp.mode,'arena');assert.equal(final.pvp.size,size);
 assert.equal(final.finalState.players.length,2*size);assert.equal(final.finalState.enemies.length,0);
 assert(['blue','red','draw'].includes(final.pvp.winner));
 assert(events.some(e=>e.type==='ABILITY_START'));
 assert(events.some(e=>e.type==='DAMAGE_DEALT'));
 assert(events.some(e=>e.type==='PVP_COMMAND'));
 assert(events.some(e=>e.type==='MOVEMENT_START'&&e.result==='pvp spread'),'spread must change positions');
 assert.equal(JSON.stringify(events),JSON.stringify(final.events),'one shared event log with no gaps/duplicates');
 for(const e of events.filter(e=>e.type==='DAMAGE_DEALT'&&byId[e.source]&&byId[e.target]))
  assert.notEqual(byId[e.source].team,byId[e.target].team,'PvP friendly fire is forbidden');
 for(const e of events.filter(e=>e.type==='HEAL_RECEIVED'&&byId[e.source]&&byId[e.target]))
  assert.equal(byId[e.source].team,byId[e.target].team,'PvP cross-team healing is forbidden');
 assert.equal(session.pvpCommand('blue','target','attack-dps').reason,'finished');
 return JSON.stringify(final)
}
for(const size of [2,3,5])assert.equal(play(size),play(size),'same seed and commands produce same '+size+'v'+size+' result');
assert.throws(()=>standard.createPvpSession({pvp:{mode:'arena',size:2,blue:roster('blue',1),red:roster('red',2)}}),/full Arena squads/);
assert.throws(()=>standard.createPvpSession({pvp:{mode:'arena',size:2,blue:roster('blue',2),red:roster('blue',2)}}),/unique/);
assert.throws(()=>standard.createPvpSession({pvp:{mode:'capture-the-flag',size:5,blue:roster('blue',5),red:roster('red',5)}}),/rules/);
const ordinary=standard.createLiveSession({party:[{id:'a',name:'Tank',class:'Warrior',spec:'Protection',level:8,power:15}],encounter:{id:'pve',enemies:['Dummy'],enemyHealth:900},seed:'pve'});
assert.equal(typeof ordinary.command,'function');
assert.equal(typeof ordinary.pvpCommand,'undefined');
assert(ordinary.advance(100).events.some(e=>e.type==='COMBAT_START'));
const self=core.tests.run();assert.equal(self.passed,self.total,'PvE engine regressions');
console.log('PvP integration checks passed: symmetric 2v2, 3v3, 5v5, deterministic events, tactical movement, no friendly fire/cross-team healing, PvE command isolation, '+self.total+' engine self-tests.');
