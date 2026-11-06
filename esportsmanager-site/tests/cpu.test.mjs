// B0.4: living CPU businesses use the same command rules and weekly economics.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,restoreSave,advanceWeek,validateSave} from '../src/engine.js';
import {getControllerId,validateCommand,applyCommand,simulateWeek} from '../src/commands.js';

const deep=x=>JSON.parse(JSON.stringify(x));
const legacy=()=>JSON.parse(readFileSync(new URL('./fixtures/starter-v1-founder-week3.json',import.meta.url),'utf8'));
const cpuControllers=s=>Object.values(s.world.controllers).filter(c=>c.type==='cpu');
const cpuOrgs=s=>cpuControllers(s).map(c=>s.world.organisations[c.organisationId]);
const cashPence=4500000;

test('B0.4: all CPU clubs have full real businesses and globally unique talent identities',()=>{
 const s=createGame();
 const clubs=cpuOrgs(s);
 assert.equal(clubs.length,7);
 assert.equal(Object.keys(s.world.organisations).length,8);
 const ids=[];
 for(const org of clubs){
  assert.equal(org.cash,cashPence,'CPU must receive same initial £45k as founder');
  assert.equal(org.playerIds.length,5);
  assert.equal(org.prospectIds.length,3);
  assert.equal(org.creatorIds.length,2);
  assert.equal(org.creatorCandidateIds.length,2);
  assert.equal(org.staff.length,2);
  assert.equal(org.sponsors.length,1);
  assert.equal(org.products.length,1);
  assert.equal(org.sponsorOffers.length,2);
  assert.equal(org.decisions,4);
  assert.ok(Number.isSafeInteger(org.simulationSeed));
  assert.ok(org.playerIds.every(id=>s.world.talents[id]?.kind==='player'));
  assert.ok(org.creatorIds.every(id=>s.world.talents[id]?.kind==='creator'));
  assert.ok(org.playerIds.every(id=>s.world.contracts[s.world.talents[id].contractId]?.status==='active'));
  ids.push(...org.playerIds,...org.prospectIds,...org.creatorIds,...org.creatorCandidateIds);
 }
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(ids.every(id=>!s.world.organisations[s.activeOrganisationId].playerIds.includes(id)));
 assert.equal(s.cash,cashPence);
 assert.ok(validateSave(s));
});

test('B0.4: old v1 saves migrate and old v2 shells backfill without new founder funds',()=>{
 const v1=legacy(),s=restoreSave(v1);
 const founderId=s.activeOrganisationId,founderCash=s.cash,seed=s.seed;
 assert.equal(cpuOrgs(s).length,7);
 assert.ok(cpuOrgs(s).every(org=>org.playerIds.length===5));
 const baseline=deep(s),rehydrated=restoreSave(deep(s));
 assert.deepEqual(deep(rehydrated),baseline,'Rehydration must not recreate CPU assets');
 const source=deep(s);
 // Emulate previous B0.2 CPU shells, retaining the player's world unchanged.
 for(const org of Object.values(source.world.organisations).filter(x=>x.mode==='CPU')){
  for(const key of ['playerIds','prospectIds','creatorIds','creatorCandidateIds']){
   for(const id of org[key])delete source.world.talents[id];
   org[key]=[];
  }
  org.products=[];org.sponsors=[];org.sponsorOffers=[];org.staff=[];
  delete org.simulationSeed;
 }
 for(const [id,contract] of Object.entries(source.world.contracts)){
  if(contract.organisationId && contract.organisationId!==founderId)delete source.world.contracts[id];
 }
 assert.equal(validateSave(source),true,'Legacy CPU shells must still be readable');
 const updated=restoreSave(source);
 assert.ok(cpuOrgs(updated).every(org=>org.products.length===1&&org.playerIds.length===5));
 assert.equal(updated.cash,founderCash);
 assert.equal(updated.seed,seed);
 assert.equal(updated.world.organisations[founderId].cash,founderCash);
 assert.deepEqual(deep(restoreSave(deep(updated))),deep(updated));
});

test('B0.4: CPU commands cost real money and CEO decisions without touching the founder',()=>{
 const s=createGame(),before=deep(s);
 const cpu=cpuControllers(s)[0],org=s.world.organisations[cpu.organisationId];
 org.products[0].stock=0;
 const snapshot=deep(s),beforeCash=org.cash;
 const order=applyCommand(s,cpu.id,{type:'reorder',payload:{id:org.products[0].id}});
 assert.equal(order.ok,true);
 assert.equal(order.events[0].organisationId,cpu.organisationId);
 assert.equal(order.events[0].cashChange,-170000);
 assert.equal(order.events[0].decisionsUsed,1);
 assert.equal(order.state.world.organisations[cpu.organisationId].cash,beforeCash-170000);
 assert.equal(order.state.world.organisations[cpu.organisationId].decisions,3);
 assert.equal(order.state.world.organisations[cpu.organisationId].products[0].producing,100);
 assert.equal(order.state.cash,before.world.organisations[s.activeOrganisationId].cash);
 assert.equal(order.state.seed,before.world.seed);
 assert.deepEqual(deep(s),snapshot);
 // A separate CPU signs talent through precisely the same validated contract path.
 const org2=order.state.world.organisations[cpu.organisationId];
 const agent=order.state.world.talents[org2.prospectIds[0]];
 const player=order.state.world.talents[org2.playerIds[0]];
 const transfer=applyCommand(order.state,cpu.id,{type:'signPlayer',payload:{id:agent.id,replace:player.id}});
 assert.equal(transfer.ok,true);
 const p=transfer.state.world.organisations[cpu.organisationId];
 assert.equal(p.playerIds.length,5);
 assert.equal(p.cash,org2.cash-agent.wage*4);
 assert.equal(transfer.state.world.contracts[agent.contractId].status,'active');
 assert.equal(transfer.state.world.organisations[transfer.state.activeOrganisationId].playerIds.length,5);
});

test('B0.4: CPU cannot issue commands on founder-owned talent or sponsor offers',()=>{
 const s=createGame(),cpu=cpuControllers(s)[0];
 const founderPlayer=s.players[0],founderOffer=s.sponsorOffers[0];
 const baseline=deep(s);
 for(const command of [
  {type:'renew',payload:{id:founderPlayer.id}},
  {type:'pitch',payload:{id:founderOffer.id}},
  {type:'signCreator',payload:{id:'c3'}},
  {type:'reorder',payload:{id:'m1'}}
 ]){
  assert.equal(validateCommand(s,cpu.id,command).ok,false);
  const r=applyCommand(s,cpu.id,command);
  assert.equal(r.ok,false);
  assert.strictEqual(r.state,s);
  assert.deepEqual(r.events,[]);
 }
 assert.deepEqual(deep(s),baseline);
});

test('B0.4: one world tick gives all eight organisations payroll, income and season records',()=>{
 const initial=createGame();
 const before=deep(initial),who=getControllerId(initial);
 const tick=simulateWeek(initial,who);
 assert.equal(tick.ok,true,tick.message);
 assert.equal(tick.cpuReports.length,7);
 assert.equal(tick.state.week,2);
 assert.equal(tick.state.year,1);
 assert.equal(tick.state.activeOrganisationId,initial.activeOrganisationId);
 assert.deepEqual(deep(initial),before);
 assert.equal(tick.state.cash,initial.cash+tick.report.net);
 assert.equal(tick.events.filter(x=>x.kind==='week.simulated').length,8);
 assert.equal(tick.events.filter(x=>x.kind==='finance.settled').length,8);
 const teams=[tick.state.world.organisations[tick.state.activeOrganisationId],...cpuOrgs(tick.state)];
 for(const org of teams){
  assert.equal(org.weeklyRecords.length,1);
  const r=org.weeklyRecords[0];
  assert.equal(r.net,r.revenue-r.expenses);
  assert.ok(r.expenses>0);
  assert.ok(r.revenue>=0);
  assert.equal(org.decisions,4);
  assert.ok(Number.isSafeInteger(org.cash));
  assert.ok(org.cash<cashPence+1000000,'No invented multi-million starting windfall');
 }
 const cpuBefore=cpuOrgs(initial),cpuAfter=cpuOrgs(tick.state);
 assert.ok(cpuBefore.every((o,i)=>o.simulationSeed!==cpuAfter[i].simulationSeed));
 assert.equal(tick.state.world.seed,tick.events.find(x=>x.kind==='week.simulated'&&x.organisationId===initial.activeOrganisationId).seedAfter);
});

test('B0.4: 12 weeks process all eight companies without missing reports or negative stock',()=>{
 let s=createGame();
 for(let i=0;i<12;i++){
  const beforeYear=s.year,beforeWeek=s.week;
  const r=simulateWeek(s,getControllerId(s));
  assert.equal(r.ok,true,'Week '+beforeWeek+': '+r.message);
  assert.equal(r.report.week,beforeWeek);
  assert.equal(r.cpuReports.length,7);
  assert.equal(r.state.year,beforeYear);
  assert.equal(r.state.week,beforeWeek+1);
  assert.ok(validateSave(r.state));
  s=r.state;
 }
 for(const org of Object.values(s.world.organisations)){
  assert.equal(org.weeklyRecords.length,12,org.name);
  assert.ok(org.products.every(p=>p.stock>=0&&p.producing>=0),org.name);
  assert.ok(org.sponsors.every(p=>Number.isFinite(p.amount)),org.name);
  assert.ok(org.staff.every(p=>p.wage>=0),org.name);
  assert.equal(org.teamWins+org.teamLosses,9,org.name);
 }
 assert.equal(s.teamWins+s.teamLosses,9);
 const cpu=cpuOrgs(s);
 assert.ok(cpu.some(o=>o.products[0].sold>0));
 assert.ok(cpu.every(o=>o.cash!==cashPence));
 assert.ok(cpu.some(o=>o.results.length>0));
});

test('B0.4: all eight-company results and decisions replay exactly after save/restore',()=>{
 const s=createGame();
 function play(start){
  let state=restoreSave(deep(start)),events=[];
  for(let i=0;i<9;i++){
   const week=simulateWeek(state,getControllerId(state));
   assert.equal(week.ok,true,week.message);
   state=week.state;events.push(...week.events);
  }
  return {saved:deep(state),events};
 }
 const a=play(s),b=play(s);
 assert.deepEqual(a,b);
 assert.equal(a.saved.world.calendar.week,10);
 assert.equal(Object.values(a.saved.world.organisations).filter(o=>o.mode==='CPU').length,7);
});

test('B0.4: founder keeps original seeded financial rules when CPU world runs',()=>{
 const s=restoreSave(legacy()),old=restoreSave(legacy());
 let next=s,alone=old;
 for(let i=0;i<5;i++){
  const changed=simulateWeek(next,getControllerId(next));
  assert.equal(changed.ok,true,changed.message);
  const former=advanceWeek(alone);
  assert.deepEqual(changed.report,former,'Founder week '+i+' financial match must stay identical');
  assert.equal(changed.state.cash,alone.cash);
  assert.equal(changed.state.seed,alone.seed);
  next=changed.state;
 }
});

test('B0.4: Year 52 closes once for all clubs and new season starts together',()=>{
 const s=createGame();
 s.week=52;s.year=1;s.season=1;
 const a=simulateWeek(s,getControllerId(s));
 assert.equal(a.ok,true,a.message);
 assert.equal(a.report.week,52);
 assert.equal(a.cpuReports.length,7);
 assert.ok(a.cpuReports.every(x=>x.report.week===52&&x.report.year===1));
 assert.equal(a.state.week,1);
 assert.equal(a.state.year,2);
 assert.equal(a.state.season,2);
 assert.equal(Object.values(a.state.world.seasons).filter(x=>x.status==='active').length,1);
 assert.ok(Object.values(a.state.world.organisations).every(x=>x.weeklyRecords.length===1));
 const b=simulateWeek(a.state,getControllerId(a.state));
 assert.equal(b.ok,true,b.message);
 assert.ok(b.cpuReports.every(x=>x.report.week===1&&x.report.year===2));
 assert.equal(b.state.week,2);
 assert.equal(b.state.year,2);
 assert.ok(Object.values(b.state.world.organisations).every(x=>x.weeklyRecords.length===2));
});
