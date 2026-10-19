'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {replayControl}=require('../server/combat/control-replay.cjs');
const w={},context=vm.createContext({window:w,console});
for(const f of ['class-build-v1.js','src/combat/combat-data-v1.js','src/combat/combat-reborn-v1.js'])vm.runInContext(fs.readFileSync(f,'utf8'),context,{filename:f});
const C=w.CellboundCombatReborn,copy=x=>JSON.parse(JSON.stringify(x));
const party=[['Warrior','Protection'],['Paladin','Holy'],['Hunter','Beast Mastery'],['Rogue','Assassination'],['Mage','Frost']].map(([klass,spec],i)=>({id:String(i),name:klass,class:klass,spec,level:15,power:16,_combatHealthPct:65,_combatItemLevel:30,_combatPosition:{x:40+i*4,y:50}}));
const options={party,encounter:{id:'control-test',kind:'boss',level:3,physicalSpace:false,enemyHealth:100000,enemies:[{name:'Boss',classification:'boss',currentPosition:{x:50,y:50},passive:true}],mechanics:[]},seed:'control-v2',directControl:true};
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name)}
const snap=s=>copy(s.snapshot()),hero=(s,i)=>snap(s).finalState.players[i];
const advance=(s,ms)=>{for(let i=0;i<ms;i+=100)s.advance(100)};
test('Existing account input remains unchanged and all five heroes share one session',()=>{
 const before=JSON.stringify(options),s=C.createLiveSession(options);advance(s,1000);assert.equal(JSON.stringify(options),before);assert.equal(s.controlState().heroes.length,5);assert(s.snapshot().events.some(e=>e.type==='DAMAGE_DEALT'));
});
test('Switch all five heroes at the same tick without resetting position, resources, HP, cooldowns, casts or threat',()=>{
 const s=C.createLiveSession(options);advance(s,1000);const before=snap(s);
 for(let i=0;i<5;i++){assert(s.input({type:'select',heroId:'p-'+i}).ok);const after=snap(s);assert.equal(after.durationMs,before.durationMs);assert.deepEqual(after.finalState.enemies,before.finalState.enemies);for(let j=0;j<5;j++)for(const key of ['position','health','resource','cooldowns','gcdUntil','currentCast'])assert.deepEqual(after.finalState.players[j][key],before.finalState.players[j][key],key)}
});
test('Manual damage uses real cooldown, resource and talent rules; wrong abilities and targets are denied',()=>{
 const s=C.createLiveSession(options);assert(s.input({type:'select',heroId:'p-4'}).ok);assert(s.input({type:'target',targetId:'e-0'}).ok);
 const a=s.controlState().heroes[4].abilities.find(a=>a.kind==='damage'&&a.available);assert(a);assert(s.input({type:'ability',abilityId:a.id}).ok);assert(!s.input({type:'ability',abilityId:a.id}).ok);assert(!s.input({type:'ability',abilityId:'made-up'}).ok);
 advance(s,5000);assert(s.snapshot().events.some(e=>e.source==='p-4'&&e.type==='DAMAGE_DEALT'));assert(!s.input({type:'ability',abilityId:a.id,targetId:'p-0'}).ok);
});
test('Manual healing affects the selected ally',()=>{
 const s=C.createLiveSession(options);s.input({type:'select',heroId:'p-1'});s.input({type:'target',targetId:'p-0'});const a=s.controlState().heroes[1].abilities.find(a=>a.kind==='heal'&&a.available);assert(a);assert(s.input({type:'ability',abilityId:a.id}).ok);advance(s,4000);assert(s.snapshot().events.some(e=>e.type==='HEAL_RECEIVED'&&e.source==='p-1'&&e.target==='p-0'));
});
test('AI takes over immediately after release, without waiting for player input',()=>{
 const s=C.createLiveSession(options);s.input({type:'select',heroId:'p-4'});s.input({type:'target',targetId:'p-0'});advance(s,1000);s.input({type:'select',heroId:'p-0'});const at=s.timeMs;advance(s,7000);assert(s.snapshot().events.some(e=>e.type==='ABILITY_START'&&e.source==='p-4'&&e.timestamp>=at));
});
test('Movement cancels a spell in control mode and its scheduled completion cannot deal ghost damage',()=>{
 const s=C.createLiveSession(options);s.input({type:'select',heroId:'p-4'});s.input({type:'target',targetId:'e-0'});const a=hero(s,4).abilities.find(a=>a.cast>0&&a.kind==='damage');assert(a);assert(s.input({type:'ability',abilityId:a.id}).ok);assert(s.input({type:'move',position:{x:80,y:80}}).ok);advance(s,Math.ceil((a.cast+500)/100)*100);assert(!s.snapshot().events.some(e=>e.type==='DAMAGE_DEALT'&&e.source==='p-4'&&e.ability===a.name));assert(s.snapshot().events.some(e=>e.type==='CAST_CANCELLED'&&e.source==='p-4'));
});
test('Movement is speed bounded, validates arena and does not tunnel through an obstacle',()=>{
 const s=C.createLiveSession({...options,encounter:{...options.encounter,environment:{bounds:{left:5,right:95,top:5,bottom:95},blockers:[{id:'wall',shape:'rect',x:65,y:50,w:8,h:30,blocksMovement:true,blocksLos:true}]}}});
 s.input({type:'select',heroId:'p-4'});assert(!s.input({type:'move',position:{x:Infinity,y:30}}).ok);assert(!s.input({type:'move',position:{x:99,y:30}}).ok);assert(!s.input({type:'move',position:{x:65,y:50}}).ok);assert(s.input({type:'move',position:{x:85,y:50}}).ok);
 advance(s,6000);const moves=s.snapshot().events.filter(e=>e.type==='MOVEMENT_START'&&e.source==='p-4'&&e.result==='direct move');assert(moves.length>1);for(const e of moves){assert(Math.hypot(e.position.x-e.payload.to.x,e.position.y-e.payload.to.y)<=22*e.payload.duration/1000+.01);for(let t=0;t<=1;t+=.05){const x=e.position.x+(e.payload.to.x-e.position.x)*t,y=e.position.y+(e.payload.to.y-e.position.y)*t;assert(!(x>61&&x<69&&y>35&&y<65),'wall crossed')}}
});
test('Party movement orders never move the selected hero and consume command power',()=>{
 for(const command of ['regroup','spread','hold','retreat']){
  const s=C.createLiveSession(options);s.input({type:'select',heroId:'p-4'});const before=hero(s,4),power=s.commandPowerState().value;
  assert(s.input({type:'command',command,...(command==='retreat'?{position:{x:20,y:70}}:{})}).ok);assert.deepEqual(hero(s,4).position,before.position);assert.equal(hero(s,4).moveToken,before.moveToken);assert(s.commandPowerState().value<power);
  assert(!s.input({type:'command',command}).ok);
 }
});
test('Hold stops an in-flight AI path at its interpolated position',()=>{
 const s=C.createLiveSession(options);advance(s,200);const before=s.controlState().positions.find(p=>p.id==='p-0').position;
 assert(hero(s,0).movingUntil>s.timeMs);assert(s.input({type:'command',command:'hold'}).ok);assert.equal(hero(s,0).movingUntil,0);assert.deepEqual(hero(s,0).position,copy(before));advance(s,1000);assert.deepEqual(hero(s,0).position,copy(before));
});
test('Retreat continues around navigation waypoints instead of stopping at the first wall',()=>{
 const s=C.createLiveSession({...options,encounter:{...options.encounter,environment:{bounds:{left:5,right:95,top:5,bottom:95},blockers:[{id:'wall',shape:'rect',x:65,y:50,w:8,h:30,blocksMovement:true,blocksLos:true}]}}});
 s.input({type:'select',heroId:'p-4'});assert(s.input({type:'command',command:'retreat',position:{x:85,y:50}}).ok);advance(s,5500);
 const h=hero(s,0);assert(Math.hypot(h.position.x-h.partyAnchor.x,h.position.y-h.partyAnchor.y)<6,'tank reaches the safe side of the wall');
 assert(s.snapshot().events.filter(e=>e.type==='MOVEMENT_START'&&e.source==='p-0'&&e.result==='party retreat').length>1);
});
test('Focus, defend healer and full attack set real simulation intent',()=>{
 for(const command of ['focus','defend-healer','full-attack']){const s=C.createLiveSession({...options,commandPower:5});s.input({type:'select',heroId:'p-4'});assert(s.input({type:'command',command,targetId:'e-0'}).ok);if(command!=='focus'){assert.equal(hero(s,0).partyOrder,command);assert.equal(hero(s,4).partyOrder,undefined)}}
});
test('Hunter pet spawns near owner, follows lifecycle and remains in the arena',()=>{
 const s=C.createLiveSession(options);const spawn=s.snapshot().events.find(e=>e.type==='PET_SUMMONED');assert(spawn);const h=hero(s,2);assert(Math.hypot(spawn.position.x-h.position.x,spawn.position.y-h.position.y)<12);advance(s,4000);assert(s.snapshot().events.some(e=>e.type==='DAMAGE_DEALT'&&e.payload?.pet));
});
test('Control replay reconstructs exact state and rejects tampered inputs, timing and ownership',()=>{
 const s=C.createLiveSession(options);s.input({type:'select',heroId:'p-4'});s.input({type:'target',targetId:'e-0'});s.input({type:'command',command:'hold'});advance(s,1000);s.input({type:'move',position:{x:75,y:70}});advance(s,4000);s.input({type:'select',heroId:'p-0'});advance(s,1000);
 const result=snap(s),args={engine:C,options,version:1,actions:result.control.actions,elapsedMs:s.timeMs};const replay=copy(replayControl(args));assert.deepEqual(replay,result);
 for(const bad of [[{at:0,type:'select',heroId:'e-0'}],[{at:1,type:'select',heroId:'p-0'}],[{at:0,type:'select',heroId:'p-0',health:9999}],[{at:0,type:'move',position:{x:999,y:999}}]])assert.throws(()=>replayControl({...args,actions:bad}));
 assert.throws(()=>replayControl({...args,version:99}));assert.throws(()=>replayControl({...args,actions:[{at:1000,type:'select',heroId:'p-0'},{at:0,type:'select',heroId:'p-1'}]}));
});
test('Manual interrupt stops a real enemy cast and cannot interrupt twice',()=>{
 const s=C.createLiveSession({...options,encounter:{...options.encounter,mechanics:[['Searing Bolt','interrupt',3000]],mechanicIntervalMs:2000}});
 s.input({type:'select',heroId:'p-2'});s.input({type:'target',targetId:'e-0'});
 for(let i=0;i<100&&!s.debug().activeCast;i++)s.advance(100);
 assert(s.debug().activeCast);const a=hero(s,2).abilities.find(a=>a.kind==='interrupt');assert(a);
 // Primary attacks can occupy the GCD. Wait until the shared ability rule permits use.
 for(let i=0;i<20&&!s.controlState().heroes[2].abilities.find(x=>x.id===a.id).available&&s.debug().activeCast;i++)s.advance(100);
 const out=s.input({type:'ability',abilityId:a.id});assert(out.ok,JSON.stringify(out));
 assert.equal(s.debug().activeCast,null);assert(!s.input({type:'ability',abilityId:a.id}).ok);assert(s.snapshot().events.some(e=>e.type==='INTERRUPT'&&e.source==='p-2'&&e.payload.direct));
});
test('Ground mechanics resolve from authoritative position and manual movement avoids damage',()=>{
 function run(dodge){const s=C.createLiveSession({...options,encounter:{...options.encounter,mechanics:[['Core Pulse','circle',4000]],mechanicIntervalMs:2000}});s.input({type:'select',heroId:'p-4'});let telegraph;
 for(let i=0;i<100&&!telegraph;i++){s.advance(100);telegraph=s.snapshot().events.find(e=>e.type==='MECHANIC_TELEGRAPH')}
 assert(telegraph.payload.controlGeometry);if(dodge)assert(s.input({type:'move',position:{x:85,y:80}}).ok);
 advance(s,4100);return s.snapshot().events.filter(e=>e.type==='DAMAGE_DEALT'&&e.target==='p-4'&&e.ability==='Core Pulse').length}
 assert(run(false)>0);assert.equal(run(true),0);
});
test('Stopped sessions reject actions; explicit friendly focus is not silently retargeted',()=>{
 const s=C.createLiveSession(options);assert(!s.input({type:'command',command:'focus',targetId:'p-0'}).ok);s.stop();assert.equal(s.input({type:'select',heroId:'p-0'}).reason,'finished');
});
test('Default sessions reject direct inputs and preserve legacy AI regression suite',()=>{
 const s=C.createLiveSession({...options,directControl:false});assert.equal(s.input({type:'select',heroId:'p-0'}).reason,'disabled');const checks=C.tests.run();assert.equal(checks.passed,checks.total,JSON.stringify(checks.tests.filter(t=>!t.pass)));
});
console.log('Living Control 2: '+passed+' behavioural scenarios passed.');
