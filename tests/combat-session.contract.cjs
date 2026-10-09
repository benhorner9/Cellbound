'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const sandbox={window:{},console};
vm.createContext(sandbox);
for(const file of ['combat-reborn-v1.js','combat-standard-v1.js']){
 vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
}
const engine=sandbox.window.CellboundCombatReborn;
const standard=sandbox.window.CellboundCombatStandard;
assert.equal(typeof engine.createSession,'function','Combat Reborn must expose a single shared tick session');
assert.equal(typeof standard.createSession,'function','Shared gateway must expose the same session');
assert.equal(standard.audit().sessionReady,true,'Audit must report a session-ready engine');

const characters=[
 {id:'tank',name:'Warrior',class:'Warrior',spec:'Protection',power:15,level:12},
 {id:'healer',name:'Priest',class:'Priest',spec:'Holy',power:14,level:12},
 {id:'dps',name:'Mage',class:'Mage',spec:'Arcane',power:17,level:12}
];
const encounters=[
 {name:'ordinary victory',options:{party:characters,encounter:{id:'session-easy',kind:'trash',enemies:['Dummy'],enemyHealth:250,mechanics:[]},seed:'session-easy'}},
 {name:'long encounter with a time slice',options:{party:characters,encounter:{id:'session-slice',kind:'world-boss',enemies:['World Boss'],enemyHealth:90000,mechanicIntervalMs:1200,mechanics:[['Storm','circle',900]]},seed:'session-slice',maxDurationMs:6500}},
 {name:'player defeat',options:{party:[{id:'alone',name:'Rogue',class:'Rogue',spec:'Assassination',power:4,level:1}],encounter:{id:'session-defeat',kind:'boss',enemies:['Titan'],enemyHealth:30000,scaling:{enemyDamage:2},mechanics:[]},seed:'session-defeat'}},
 {name:'healer and threat targeting',options:{party:characters,encounter:{id:'session-healing',kind:'boss',enemies:['Heavy'],enemyHealth:4300,mechanicIntervalMs:1500,mechanics:[['Frontal','cone',1100]]},seed:'session-healing',maxDurationMs:9000}}
];
for(const example of encounters){
 const flat=standard.simulate(example.options,{zone:'regression'});
 const session=standard.createSession(example.options,{zone:'regression'});
 assert.equal(session.result(),null,example.name+' must not have a result before completion');
 const events=[];
 for(let i=0;i<2500;i++){
  const tick=session.advance((i%11)+1);
  events.push(...tick.events);
  if(tick.completed)break;
 }
 const chunked=session.result();
 assert(chunked,example.name+' should finish in bounded steps');
 assert.equal(JSON.stringify(chunked),JSON.stringify(flat),example.name+' must be bit-for-bit equivalent to existing simulate');
 assert.equal(JSON.stringify(events),JSON.stringify(flat.events),example.name+' must not lose or duplicate streamed events');
 assert.equal(session.snapshot().completed,true,example.name+' must report terminal state');
 assert.throws(()=>session.changeTactics({movementDiscipline:'safety'}),/ended/,example.name+' must reject late commands');
}

const changing=standard.createSession({party:characters,encounter:{id:'session-command',kind:'boss',enemies:['Unyielding'],enemyHealth:80000,mechanics:[]},seed:'session-command',maxDurationMs:5000});
const first=changing.advance(5);
assert.equal(first.elapsedMs,500,'100ms authoritative tick must be preserved');
const s0=changing.snapshot();
assert.equal(s0.tactics.movementDiscipline,'balanced');
const originalX=s0.players[0].position.x;
s0.players[0].position.x=-200;
assert.equal(changing.snapshot().players[0].position.x,originalX,'snapshots must not leak writable combat positions');
assert.throws(()=>changing.advance(0),/1–10000/);
assert.throws(()=>changing.advance(1.5),/1–10000/);
assert.throws(()=>changing.changeTactics({pvpCheat:'ignored'}),/Invalid combat tactic/);
assert.equal(changing.snapshot().tactics.movementDiscipline,'balanced','invalid changes cannot mutate the session');
const accepted=changing.changeTactics({movementDiscipline:'safety',interruptPriority:'high'});
assert.equal(accepted.accepted,true);
assert.equal(accepted.elapsedMs,500,'command accepted at the tick boundary');
const after=changing.advance(3);
assert.equal(after.events.filter(e=>e.type==='TACTIC_CHANGED').length,1,'accepted commands must enter authoritative event stream exactly once');
assert.equal(changing.snapshot().tactics.movementDiscipline,'safety');
const result=changing.runToCompletion();
assert.equal(result.combatModel,'Combat Reborn');
assert.equal(result.combatZone,undefined);
assert.equal(result.events.filter(e=>e.type==='TACTIC_CHANGED').length,1);
assert.equal(result.outcome,'ongoing','preconfigured PvE slices still end normally');
assert.equal(standard.audit().sessionApi,'1.0.0');
console.log('Combat session regression passed: shared gateway, deterministic stepped playback, live tactic event, immutable snapshots, invalid/late command rejection.');
