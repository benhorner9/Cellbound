import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,perform,advanceWeek,validateSave,pound,nextOpponent,runway} from '../src/engine.js';

test('all-round founder start includes every division and £45,000',()=>{
 const s=createGame('My Club','MC',' #aaaaaa'.trim());
 assert.equal(s.cash,4_500_000);assert.equal(s.players.length,5);
 assert.equal(s.creators.length,2);assert.equal(s.sponsors.length,1);
 assert.equal(s.products.length,1);assert.equal(s.staff.length,2);
 assert.equal(s.league.length,7);assert.equal(s.decisions,4);
 assert.ok(s.players.every(p=>p.contract>0));assert.equal(nextOpponent(s).name,'Vertex Esports');
});
test('tactics, training and scheduling are free and persist as state',()=>{
 const s=createGame();
 assert.equal(perform(s,'tactic',{value:'Aggressive'}).ok,true);
 assert.equal(perform(s,'training',{value:'Rest'}).ok,true);
 assert.equal(perform(s,'schedule',{id:'c1',value:'Creator collaboration'}).ok,true);
 assert.equal(perform(s,'content',{value:'Creator challenge'}).ok,true);
 assert.equal(s.decisions,4);
 assert.equal(s.scheduled.c1,'Creator collaboration');
 assert.equal(perform(s,'tactic',{value:'Invalid tactic'}).ok,false);
});
test('sponsorship proposals spend up front and resolve later',()=>{
 const s=createGame();
 const before=s.cash;
 assert.equal(perform(s,'pitch',{id:'s2'}).ok,true);
 assert.equal(s.decisions,3);
 assert.equal(s.cash,before-18000);
 assert.equal(s.pitches.length,1);
 advanceWeek(s);advanceWeek(s);
 assert.equal(s.pitches.length,0);
 assert.ok(s.industry.some(x=>x.text.includes('NitroTech')));
});
test('stock can be manufactured without creating inventory immediately',()=>{
 const s=createGame();
 const p=s.products[0],before=s.cash;
 assert.equal(perform(s,'reorder',{id:'m1'}).ok,true);
 assert.equal(p.producing,100);assert.equal(s.cash,before-p.cost*100);
 assert.equal(perform(s,'reorder',{id:'m1'}).ok,false);
 assert.equal(perform(s,'price',{id:'m1',value:45}).ok,true);
 assert.equal(p.price,4500);
 assert.equal(perform(s,'price',{id:'m1',value:450}).ok,false);
 advanceWeek(s);advanceWeek(s);advanceWeek(s);
 assert.equal(p.producing,0);
});
test('signing talent uses correct money and roster constraints',()=>{
 const s=createGame();
 const before=s.teamChemistry;
 assert.equal(perform(s,'signPlayer',{id:'p6',replace:'p2'}).ok,true);
 assert.equal(s.players.length,5);
 assert.equal(s.prospects.length,3);
 assert.equal(s.teamChemistry,before-12);
 assert.equal(perform(s,'signCreator',{id:'c3'}).ok,true);
 assert.equal(s.creators.length,3);
 assert.equal(s.decisions,2);
});
test('operations staff and merchandise launches create real state',()=>{
 const s=createGame();
 assert.equal(perform(s,'hire',{value:'Content Producer'}).ok,true);
 assert.equal(perform(s,'createProduct',{value:'Creator Hoodie'}).ok,true);
 assert.equal(perform(s,'upgrade').ok,true);
 assert.equal(s.staff.length,3);
 assert.equal(s.products.length,2);
 assert.equal(s.facilities,2);
 assert.equal(s.decisions,1);
});
test('12-week simulation has financial results, competition and save portability',()=>{
 const s=createGame('Harbour Wolves','HW','#9977ee');
 for(let i=0;i<12;i++){
   const prior=s.cash,week=s.week,r=advanceWeek(s);
   assert.equal(r.week,week);
   assert.equal(s.cash,prior+r.net);
   assert.ok(r.revenue>=0&&r.expenses>0);
   assert.ok(r.fanGain>=-s.fans);
   assert.equal(s.decisions,4);
 }
 assert.equal(s.week,13);
 assert.equal(s.weeklyRecords.length,12);
 assert.equal(s.results.length,9);
 assert.equal(s.teamWins+s.teamLosses,9);
 assert.equal(s.players.length,5);
 assert.equal(s.results[0].week,9);
 assert.equal(validateSave(JSON.parse(JSON.stringify(s))),true);
 assert.ok(Number.isFinite(s.cash));
 assert.match(pound(s.cash),/^[-£]/);
 assert.ok(runway(s)===null||Number.isFinite(runway(s)));
});
test('showcase mode creates a rich example, not the default starting economy',()=>{
 const s=createGame('Apex Esports','APX','#9955ef',true);
 assert.equal(s.mode,'Showcase');assert.ok(s.cash>2e8);
 assert.ok(s.creators.length>2&&s.products.length>1&&s.sponsors.length>1);
 assert.equal(createGame().mode,'Founder');
});
