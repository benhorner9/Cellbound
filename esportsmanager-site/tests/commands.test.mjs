// B0.3 command boundary: immutable replayable inputs and controller authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,perform,advanceWeek,restoreSave,validateSave} from '../src/engine.js';
import {COMMAND_TYPES,getControllerId,validateCommand,applyCommand,simulateWeek} from '../src/commands.js';

const copy=o=>JSON.parse(JSON.stringify(o));
const legacy=()=>JSON.parse(readFileSync(new URL('./fixtures/starter-v1-founder-week3.json',import.meta.url),'utf8'));
const actor=s=>getControllerId(s);

test('B0.3: explicit management commands exist independently of the browser',()=>{
 const s=createGame();
 assert.equal(COMMAND_TYPES.length,14);
 assert.equal(typeof applyCommand,'function');
 assert.equal(typeof validateCommand,'function');
 assert.equal(typeof simulateWeek,'function');
 assert.equal(s.world.controllers[actor(s)].type,'human');
 assert.ok(COMMAND_TYPES.includes('signPlayer'));
});

test('B0.3: dry-run validation cannot mutate input or consume its seed',()=>{
 const s=createGame(),snapshot=copy(s),id=actor(s);
 assert.equal(validateCommand(s,id,{type:'tactic',payload:{value:'Defensive'}}).ok,true);
 assert.equal(validateCommand(s,id,{type:'hire',payload:{value:'Scout'}}).ok,true);
 assert.equal(validateCommand(s,id,{type:'pitch',payload:{id:'s2'}}).ok,true);
 assert.equal(validateCommand(s,id,{type:'signPlayer',payload:{id:'p6',replace:'p2'}}).ok,true);
 assert.deepEqual(copy(s),snapshot);
 assert.equal(s.seed,snapshot.world.seed);
});

test('B0.3: immutable actions create new canonical worlds and deterministic events',()=>{
 const start=createGame(),snapshot=copy(start),id=actor(start);
 const command={type:'hire',payload:{value:'Scout'}};
 const a=applyCommand(start,id,command);
 const b=applyCommand(start,id,copy(command));
 assert.equal(a.ok,true);
 assert.equal(b.ok,true);
 assert.notEqual(a.state,start);
 assert.notEqual(a.state.world,start.world);
 assert.equal(a.state.staff.length,3);
 assert.equal(start.staff.length,2);
 assert.deepEqual(copy(start),snapshot);
 assert.deepEqual(copy(a.state),copy(b.state));
 assert.deepEqual(a.events,b.events);
 assert.equal(a.events.length,1);
 assert.equal(a.events[0].kind,'command.applied');
 assert.equal(a.events[0].organisationId,start.activeOrganisationId);
 assert.equal(a.events[0].action,'hire');
 assert.equal(a.events[0].decisionsUsed,1);
 assert.equal(a.events[0].cashChange,-35000);
 assert.notEqual(a.events[0].seedBefore,a.events[0].seedAfter);
 assert.ok(validateSave(a.state));
});

test('B0.3: wrong, CPU or unrelated controllers cannot manage the founder organisation',()=>{
 const s=createGame(),snapshot=copy(s);
 const cpu=Object.values(s.world.controllers).find(x=>x.type==='cpu').id;
 for(const who of [cpu,'missing',s.activeOrganisationId,undefined,null,'']){
  const valid=validateCommand(s,who,{type:'tactic',payload:{value:'Aggressive'}});
  assert.equal(valid.ok,false,String(who));
  const attempt=applyCommand(s,who,{type:'tactic',payload:{value:'Aggressive'}});
  assert.equal(attempt.ok,false);
  assert.strictEqual(attempt.state,s);
  assert.deepEqual(attempt.events,[]);
  const week=simulateWeek(s,who);
  assert.equal(week.ok,false);
  assert.strictEqual(week.state,s);
 }
 assert.deepEqual(copy(s),snapshot);
});

test('B0.3: unknown actions, malformed parameters and suspicious payloads are rejected without mutation',()=>{
 const s=createGame(),id=actor(s),before=copy(s);
 const commands=[
  null,[],{},'tactic', {type:'no-such-action',payload:{}},
  {type:'tactic',payload:{value:'Cheat'}},
  {type:'tactic',payload:{value:'Balanced',cash:1000000}},
  {type:'schedule',payload:{id:'c1',value:'Invented livestream'}},
  {type:'price',payload:{id:'m1',value:'Infinity'}},
  {type:'price',payload:{id:'m1',value:''}},
  {type:'createProduct',payload:{value:' '}},
  {type:'signPlayer',payload:{id:'p6'}},
  {type:'hire',payload:{value:'CEO of Everything'}},
  {type:'promo',payload:{seed:0}},
  {type:'tactic',payload:null},
  {type:'upgrade',payload:[]}
 ];
 for(const command of commands){
  const check=validateCommand(s,id,command);
  assert.equal(check.ok,false,JSON.stringify(command));
  const result=applyCommand(s,id,command);
  assert.equal(result.ok,false,JSON.stringify(command));
  assert.strictEqual(result.state,s);
  assert.equal(result.events.length,0);
 }
 assert.deepEqual(copy(s),before);
});

test('B0.3: business failures are atomic, including insufficient funds and CEO decisions',()=>{
 const s=createGame();
 s.cash=0;
 const who=actor(s),snapshot=copy(s);
 const cmd={type:'signCreator',payload:{id:'c3'}};
 assert.equal(validateCommand(s,who,cmd).ok,false);
 const fail=applyCommand(s,who,cmd);
 assert.equal(fail.ok,false);
 assert.strictEqual(fail.state,s);
 assert.deepEqual(copy(s),snapshot);
 s.cash=100000000;
 s.decisions=0;
 const once=copy(s);
 const fail2=applyCommand(s,who,{type:'signPlayer',payload:{id:'p6',replace:'p2'}});
 assert.equal(fail2.ok,false);
 assert.deepEqual(copy(s),once);
});

test('B0.3: every UI management action uses the same command gateway',()=>{
 let s=createGame(),who=actor(s);
 const tasks=[
  {type:'tactic',payload:{value:'Aggressive'}},
  {type:'training',payload:{value:'Rest'}},
  {type:'schedule',payload:{id:'c1',value:'Community event'}},
  {type:'content',payload:{value:'Creator challenge'}},
  {type:'pitch',payload:{id:'s2'}},
  {type:'reorder',payload:{id:'m1'}},
  {type:'price',payload:{id:'m1',value:'45'}},
  {type:'createProduct',payload:{value:'Special Jersey'}},
  {type:'upgrade',payload:{}},
  {type:'signCreator',payload:{id:'c3'}},
  {type:'signPlayer',payload:{id:'p6',replace:'p2'}},
  {type:'renew',payload:{id:'p1'}},
  {type:'promo',payload:{}},
  {type:'hire',payload:{value:'Scout'}}
 ];
 // Major actions run across weeks to refresh decision points; this exercises
 // the full validated command list without mocking salaries or resources.
 for(const command of tasks){
  const validated=validateCommand(s,who,command);
  if(!validated.ok&&s.decisions===0){
   const w=simulateWeek(s,who);
   assert.equal(w.ok,true);
   s=w.state;who=actor(s);
  }
  const result=applyCommand(s,who,command);
  assert.equal(result.ok,true,command.type+': '+result.message);
  assert.ok(validateSave(result.state));
  s=result.state;
  assert.equal(s.world.controllers[who].organisationId,s.activeOrganisationId);
 }
});

test('B0.3: old legacy rules and pure gateway yield identical reports, cash and seed',()=>{
 const s=restoreSave(legacy()),before=copy(s),who=actor(s);
 const original=restoreSave(copy(s));
 const pure=simulateWeek(s,who);
 const old=advanceWeek(original);
 assert.equal(pure.ok,true);
 assert.deepEqual(pure.report,old);
 assert.deepEqual(copy(pure.state),copy(original));
 assert.deepEqual(copy(s),before);
 assert.equal(pure.report.revenue,240435);
 assert.equal(pure.report.net,37935);
 assert.equal(pure.report.match.score,'2–1');
 assert.ok(pure.events.some(e=>e.kind==='match.resolved'));
 assert.ok(pure.events.some(e=>e.kind==='finance.settled'));
});

test('B0.3: weekly simulation is deterministic, pure and produces stable events for replay',()=>{
 const start=createGame(),who=actor(start),raw=copy(start);
 const a=simulateWeek(start,who),b=simulateWeek(start,who);
 assert.equal(a.ok,true);
 assert.equal(b.ok,true);
 assert.deepEqual(a.report,b.report);
 assert.deepEqual(a.events,b.events);
 assert.deepEqual(copy(a.state),copy(b.state));
 assert.deepEqual(copy(start),raw);
 assert.equal(a.state.week,2);
 assert.equal(start.week,1);
 assert.equal(a.events[0].seedBefore,start.seed);
 assert.equal(a.events[0].seedAfter,a.state.seed);
 assert.equal(a.events[1].net,a.report.net);
 assert.equal(a.events[0].cashChange,a.report.net);
});

test('B0.3: sequenced commands and weeks replay exactly after save / restore',()=>{
 const initial=restoreSave(legacy());
 const actions=[
  {type:'tactic',payload:{value:'Defensive'}},
  {type:'schedule',payload:{id:'c1',value:'Ranked livestream'}},
  {type:'content',payload:{value:'Creator challenge'}},
  {type:'price',payload:{id:'m1',value:43}},
  {type:'training',payload:{value:'Aim'}}
 ];
 function replay(input){
  let s=restoreSave(copy(input)),all=[];
  for(let week=0;week<10;week++){
   for(const action of actions){
    const r=applyCommand(s,actor(s),action);
    assert.equal(r.ok,true);
    s=r.state;all.push(...r.events);
   }
   const w=simulateWeek(s,actor(s));assert.equal(w.ok,true);
   s=w.state;all.push(...w.events);
  }
  return {state:copy(s),events:all};
 }
 const a=replay(initial),b=replay(initial);
 assert.deepEqual(a,b);
 assert.equal(a.state.world.calendar.week,13);
 assert.equal(a.state.world.organisations[a.state.activeOrganisationId].weeklyRecords.length,12);
});

test('B0.3: deterministic year boundary and commercial orders retain their deadlines',()=>{
 const s=createGame(),who=actor(s);
 s.week=52;
 const order=applyCommand(s,who,{type:'reorder',payload:{id:'m1'}});
 assert.equal(order.ok,true);
 const before=copy(s);
 const a=simulateWeek(order.state,who);
 const b=simulateWeek(order.state,who);
 assert.deepEqual(a.report,b.report);
 assert.deepEqual(a.events,b.events);
 assert.deepEqual(copy(a.state),copy(b.state));
 assert.equal(a.report.week,52);
 assert.equal(a.report.year,1);
 assert.equal(a.state.week,1);
 assert.equal(a.state.year,2);
 assert.equal(a.state.season,2);
 assert.equal(a.state.products[0].producing,100);
 const yearTwoWeekOne=simulateWeek(a.state,who);
 assert.equal(yearTwoWeekOne.ok,true);
 assert.equal(yearTwoWeekOne.state.products[0].producing,100);
 const yearTwoWeekTwo=simulateWeek(yearTwoWeekOne.state,who);
 assert.equal(yearTwoWeekTwo.ok,true);
 assert.equal(yearTwoWeekTwo.state.products[0].producing,0);
 assert.deepEqual(copy(s),before);
});
