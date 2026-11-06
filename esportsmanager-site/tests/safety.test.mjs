// B0.1 regression safety rails — preserve starter v1 economics and save format.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  createGame, perform, advanceWeek, validateSave, VERSION, GAME_KEY,
  nextOpponent, recentTotal
} from '../src/engine.js';

const copy=x=>JSON.parse(JSON.stringify(x));
const fixture=()=>JSON.parse(readFileSync(new URL('./fixtures/starter-v1-founder-week3.json',import.meta.url),'utf8'));
const nonNegative=x=>Number.isSafeInteger(x)&&x>=0;

test('B0.1: v2 migration retains the original browser storage namespace',()=>{
 assert.equal(VERSION,2);
 assert.equal(GAME_KEY,'esports-empire-save-v1');
 assert.ok(validateSave(createGame()));
 assert.ok(validateSave(createGame('Apex Esports','APX','#9d55ed',true)));
});

test('B0.1: legacy founder JSON save loads and advances with its prior decisions intact',()=>{
 const saved=fixture();
 assert.equal(saved.version,1);
 assert.equal(saved.org,'Baseline United');
 assert.equal(saved.week,3);
 assert.equal(saved.tactic,'Defensive');
 assert.equal(saved.training,'Aim');
 assert.equal(saved.scheduled.c1,'Rest week');
 assert.equal(saved.weeklyRecords.length,2);
 assert.ok(validateSave(saved));
 const reloaded=copy(saved);
 assert.deepEqual(reloaded,saved);
 const initialCash=reloaded.cash;
 const report=advanceWeek(reloaded);
 assert.deepEqual({
  week:report.week, revenue:report.revenue, expenses:report.expenses,
  net:report.net, fanGain:report.fanGain, merch:report.merchRevenue,
  creators:report.creatorRevenue, sponsors:report.sponsorRevenue,
  views:report.contentViews, match:report.match?.score
 },{
  week:3,revenue:240435,expenses:202500,net:37935,fanGain:420,
  merch:155800,creators:8935,sponsors:37700,views:15422,match:'2–1'
 });
 assert.equal(reloaded.cash,initialCash+37935);
 assert.equal(reloaded.week,4);
});

test('B0.1: denied and invalid business commands leave the save untouched',()=>{
 const s=createGame();
 const cases=[
  ['tactic',{value:'Cheat'}],
  ['training',{value:'Unrealistic'}],
  ['schedule',{id:'not-real',value:'Rest week'}],
  ['content',{value:'Invalid project'}],
  ['pitch',{id:'missing'}],
  ['reorder',{id:'missing'}],
  ['price',{id:'m1',value:'Infinity'}],
  ['price',{id:'m1',value:0}],
  ['signCreator',{id:'missing'}],
  ['signPlayer',{id:'p6',replace:'missing'}],
  ['renew',{id:'missing'}],
  ['unknown',{}]
 ];
 for(const [action,payload] of cases){
  const before=copy(s);
  const outcome=perform(s,action,payload);
  assert.equal(outcome.ok,false,action);
  assert.deepEqual(s,before,'Invalid action mutated state: '+action);
 }
});

test('B0.1: no funds or exhausted CEO decisions cannot spend or hire',()=>{
 const s=createGame();
 s.cash=0;
 for(const [action,payload] of [['pitch',{id:'s2'}],['reorder',{id:'m1'}],['hire',{value:'Scout'}],['upgrade',{}],['signCreator',{id:'c3'}],['signPlayer',{id:'p6',replace:'p2'}],['createProduct',{value:'New Hoodie'}]]){
  const before=copy(s);
  const result=perform(s,action,payload);
  assert.equal(result.ok,false,action);
  assert.deepEqual(s,before,'Insufficient funds charged for '+action);
 }
 s.cash=100000000;s.decisions=0;
 for(const [action,payload] of [['pitch',{id:'s2'}],['reorder',{id:'m1'}],['hire',{value:'Scout'}],['upgrade',{}],['signCreator',{id:'c3'}],['signPlayer',{id:'p6',replace:'p2'}],['createProduct',{value:'New Hoodie'}]]){
  const before=copy(s);
  assert.equal(perform(s,action,payload).ok,false,action);
  assert.deepEqual(s,before,'Exhausted decisions changed save: '+action);
 }
});

test('B0.1: full founder season uses consistent match and cash accounting',()=>{
 const s=createGame();
 for(let i=0;i<12;i++){
  const oldCash=s.cash,previousWeek=s.week;
  const r=advanceWeek(s);
  assert.equal(r.week,previousWeek);
  assert.equal(s.week,previousWeek+1);
  assert.equal(r.net,r.revenue-r.expenses);
  assert.equal(s.cash,oldCash+r.net);
  assert.ok(nonNegative(r.revenue)&&nonNegative(r.expenses));
  assert.ok(nonNegative(s.fans)&&nonNegative(r.contentViews));
  assert.ok(s.products.every(p=>nonNegative(p.stock)&&nonNegative(p.sold)&&nonNegative(p.producing)));
  assert.ok(s.creators.every(c=>nonNegative(c.audience)&&c.energy>=0&&c.energy<=100));
  assert.ok(Number.isSafeInteger(s.cash));
 }
 assert.equal(s.results.length,9);
 assert.equal(s.teamWins+s.teamLosses,9);
 assert.equal(s.weeklyRecords.length,12);
 assert.equal(s.results.filter(x=>x.won).length,s.teamWins);
 assert.equal(s.results.filter(x=>!x.won).length,s.teamLosses);
 assert.equal(nextOpponent(s),null);
 assert.equal(recentTotal(s,'revenue'),s.weeklyRecords.slice(-4).reduce((sum,r)=>sum+r.revenue,0));
});

test('B0.1: deterministic replay after an exported and imported save',()=>{
 const a=fixture(),b=copy(a);
 for(let i=0;i<10;i++){
  if(i===2){perform(a,'content',{value:'Creator challenge'});perform(b,'content',{value:'Creator challenge'});}
  if(i===5){perform(a,'schedule',{id:'c1',value:'Ranked livestream'});perform(b,'schedule',{id:'c1',value:'Ranked livestream'});}
  assert.deepEqual(advanceWeek(a),advanceWeek(b));
 }
 assert.deepEqual(a,b);
 assert.ok(validateSave(copy(a)));
});

test('B0.1: team and talent IDs are unique within initial active and candidate pools',()=>{
 for(const s of [createGame(),createGame('Global Apex','GLB','#b465ee',true)]){
  const all=[...s.players,...s.prospects,...s.creators,...s.creatorCandidates];
  assert.equal(new Set(all.map(x=>x.id)).size,all.length);
  assert.equal(new Set(s.products.map(x=>x.id)).size,s.products.length);
  assert.equal(s.players.length,5);
  assert.equal(s.league.length,7);
  assert.ok(s.players.every(x=>x.role&&Number.isSafeInteger(x.wage)&&x.wage>=0));
 }
});

test('B0.1: invalid flat-v1 and nested-v2 saves are rejected',()=>{
 const founder=createGame();
 const base=JSON.parse(JSON.stringify(founder));
 const invalid=[
  null,0,{},[],
  {...base,version:99},
  {...base,world:null},
  {...base,world:{...base.world,calendar:null}},
  {...base,world:{...base.world,seed:'abc'}},
  {...base,world:{...base.world,organisations:null}},
  {...base,world:{...base.world,talents:{}}},
  {...base,world:{...base.world,calendar:{...base.world.calendar,week:0}}},
  {...base,world:{...base.world,calendar:{...base.world.calendar,week:'1'}}},
  {...base,world:{...base.world,organisations:{
   ...base.world.organisations,[base.activeOrganisationId]:{
    ...base.world.organisations[base.activeOrganisationId],cash:12.5
   }
  }}}
 ];
 for(const value of invalid){
  assert.equal(validateSave(value),false,'Accepted corrupted v2 save: '+JSON.stringify(value)?.slice(0,160));
 }
 const legacy=fixture();
 assert.equal(validateSave(legacy),true);
 for(const value of [
   {...legacy,version:99},
   {...legacy,players:null},
   {...legacy,creators:'fake'},
   {...legacy,weeklyRecords:{}},
   {...legacy,cash:NaN},
   {...legacy,cash:Infinity},
   {...legacy,cash:'1000'},
   {...legacy,cash:12.5},
   {...legacy,week:'1'},
   {...legacy,week:0},
   {...legacy,products:null},
   {...legacy,league:undefined}
 ]){
  assert.equal(validateSave(value),false,'Accepted damaged v1 save: '+JSON.stringify(value)?.slice(0,160));
 }
});
