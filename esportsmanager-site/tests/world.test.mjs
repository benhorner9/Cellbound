import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 VERSION,GAME_KEY,createGame,perform,advanceWeek,restoreSave,validateSave,
 nextOpponent
} from '../src/engine.js';

const legacy=()=>JSON.parse(readFileSync(new URL('./fixtures/starter-v1-founder-week3.json',import.meta.url),'utf8'));
const copy=x=>JSON.parse(JSON.stringify(x));
const stats=r=>({week:r.week,year:r.year,revenue:r.revenue,expenses:r.expenses,net:r.net,
 fanGain:r.fanGain,merchRevenue:r.merchRevenue,creatorRevenue:r.creatorRevenue,
 sponsorRevenue:r.sponsorRevenue,contentViews:r.contentViews,match:r.match?.score});

test('B0.2: canonical world contains eight fully identified organisations and controllers',()=>{
 const s=createGame('Victory Union','VU','#8b51e1');
 assert.equal(VERSION,2);
 assert.equal(GAME_KEY,'esports-empire-save-v1');
 assert.ok(validateSave(s));
 assert.equal(s.world.organisations[s.activeOrganisationId].name,'Victory Union');
 assert.equal(s.world.controllers[s.world.organisations[s.activeOrganisationId].controllerId].type,'human');
 assert.equal(Object.values(s.world.organisations).length,8);
 assert.equal(Object.values(s.world.controllers).length,8);
 assert.equal(Object.values(s.world.controllers).filter(x=>x.type==='cpu').length,7);
 assert.ok(Object.values(s.world.organisations).every(o=>Number.isSafeInteger(o.cash)&&
    Array.isArray(o.playerIds)&&Array.isArray(o.creatorIds)&&Array.isArray(o.staff)&&
    Array.isArray(o.sponsors)&&o.controllerId));
 const season=Object.values(s.world.seasons)[0];
 const league=Object.values(s.world.leagues)[0];
 assert.equal(league.seasonId,season.id);
 assert.equal(league.participantIds.length,8);
 assert.equal(league.participantIds[0],s.activeOrganisationId);
 assert.equal(new Set(league.participantIds).size,8);
 assert.equal(s.league[0].name,'Vertex Esports');
 assert.equal(nextOpponent(s),s.league[0]);
});

test('B0.2: version 1 founder migration preserves every gameplay field and golden outcome',()=>{
 const old=legacy(),oldBaseline=copy(old);
 const s=restoreSave(copy(old));
 const id=s.world.id;
 assert.equal(s.version,2);
 assert.equal(s.week,3);
 assert.equal(s.year,1);
 assert.equal(s.cash,old.cash);
 assert.equal(s.fans,old.fans);
 assert.equal(s.teamWins,old.teamWins);
 assert.equal(s.tactic,old.tactic);
 assert.equal(s.training,old.training);
 assert.equal(s.createdAt,old.createdAt);
 assert.equal(s.players[0].skill,old.players[0].skill);
 assert.deepEqual(s.scheduled,old.scheduled);
 assert.deepEqual(s.results,old.results);
 assert.deepEqual(s.weeklyRecords,old.weeklyRecords);
 assert.equal(s.league.length,old.league.length);
 assert.deepEqual(old,oldBaseline,'Conversion must not mutate imported save.');
 assert.equal(restoreSave(copy(old)).world.id,id,'Migration IDs should be stable across devices.');
 const former=advanceWeek(old);
 const migrated=advanceWeek(s);
 assert.deepEqual(stats(migrated),stats(former));
 assert.equal(migrated.revenue,240435);
 assert.equal(migrated.net,37935);
 assert.equal(migrated.match.score,'2–1');
 assert.equal(s.cash,old.cash);
});

test('B0.2: showcase-style v1 legacy data migrates without changing funds or creator reach',()=>{
 const old=legacy();
 old.mode='Showcase';old.cash=248000000;old.fans=1260000;
 old.creators[0].audience=2800000;old.teamChemistry=88;
 old.sponsors[0].amount=4100000;
 const s=restoreSave(old);
 assert.equal(s.mode,'Showcase');
 assert.equal(s.cash,248000000);
 assert.equal(s.fans,1260000);
 assert.equal(s.creators[0].audience,2800000);
 assert.equal(s.teamChemistry,88);
 assert.equal(s.sponsors[0].amount,4100000);
 assert.ok(validateSave(s));
});

test('B0.2: JSON export stores only canonical entities; rehydrate restores all screen fields',()=>{
 const s=createGame();
 const raw=JSON.stringify(s),parsed=JSON.parse(raw);
 assert.equal(parsed.version,2);
 assert.equal(Object.hasOwn(parsed,'players'),false);
 assert.equal(Object.hasOwn(parsed,'cash'),false);
 assert.equal(parsed.world.organisations[parsed.activeOrganisationId].cash,4500000);
 assert.ok(validateSave(parsed));
 const reloaded=restoreSave(parsed);
 assert.equal(reloaded.cash,4500000);
 assert.equal(reloaded.players.length,5);
 assert.equal(reloaded.creators.length,2);
 assert.equal(reloaded.league.length,7);
 assert.equal(reloaded.world.id,s.world.id);
 assert.equal(reloaded.activeOrganisationId,s.activeOrganisationId);
 assert.deepEqual(copy(reloaded),parsed);
});

test('B0.2: signing talent transfers stable IDs and keeps contract registry in sync',()=>{
 const s=createGame(),player=s.prospects[0],creator=s.creatorCandidates[0];
 const playerId=player.talentId,creatorId=creator.talentId;
 assert.equal(perform(s,'signPlayer',{id:'p6',replace:'p2'}).ok,true);
 assert.equal(perform(s,'signCreator',{id:'c3'}).ok,true);
 assert.equal(s.players.length,5);
 assert.equal(s.prospects.length,3);
 assert.equal(s.creators.length,3);
 assert.equal(s.creatorCandidates.length,1);
 const hiredPlayer=s.players.find(x=>x.id==='p6');
 assert.equal(hiredPlayer.talentId,playerId);
 assert.equal(s.creators.find(x=>x.id==='c3').talentId,creatorId);
 assert.equal(s.world.contracts[hiredPlayer.contractId].status,'active');
 assert.equal(s.world.contracts[hiredPlayer.contractId].organisationId,s.activeOrganisationId);
 assert.equal(s.world.contracts[s.creators.find(x=>x.id==='c3').contractId].status,'active');
 const reloaded=restoreSave(copy(s));
 assert.equal(reloaded.players.find(x=>x.id==='p6').talentId,playerId);
 assert.equal(reloaded.creators.find(x=>x.id==='c3').talentId,creatorId);
 assert.equal(reloaded.prospects.find(x=>x.id==='p2').id,'p2');
 assert.ok(validateSave(reloaded));
 const before=reloaded.players[0].contract;
 assert.equal(perform(reloaded,'renew',{id:reloaded.players[0].id}).ok,true);
 assert.equal(reloaded.players[0].contract,before+24);
 assert.equal(reloaded.world.contracts[reloaded.players[0].contractId].weeksRemaining,before+24);
 advanceWeek(reloaded);
 assert.equal(reloaded.world.contracts[reloaded.players[0].contractId].weeksRemaining,before+23);
});

test('B0.2: Week 52 simulates once and then starts Year 2 Week 1',()=>{
 const s=createGame();
 s.week=52;s.year=1;s.season=1;
 const seedBefore=s.seed;
 const originalCash=s.cash;
 const r=advanceWeek(s);
 assert.equal(r.week,52);
 assert.equal(r.year,1);
 assert.equal(s.week,1);
 assert.equal(s.year,2);
 assert.equal(s.season,2);
 assert.equal(s.weeklyRecords.length,1);
 assert.equal(s.cash,originalCash+r.net);
 assert.equal(r.match,null);
 assert.ok(s.seed!==seedBefore);
 const seasons=Object.values(s.world.seasons);
 assert.equal(seasons.length,2);
 assert.equal(seasons.find(x=>x.number===1).status,'complete');
 assert.equal(seasons.find(x=>x.number===2).status,'active');
 assert.equal(Object.values(s.world.leagues)[0].seasonId,seasons.find(x=>x.number===2).id);
 assert.equal(nextOpponent(s).name,'Vertex Esports');
 const second=advanceWeek(s);
 assert.equal(second.week,1);
 assert.equal(second.year,2);
 assert.equal(s.week,2);
 assert.equal(s.year,2);
 assert.equal(s.weeklyRecords.length,2);
 assert.ok(validateSave(restoreSave(copy(s))));
});

test('B0.2: manufacturing and sponsorship orders resolve across year boundary',()=>{
 const s=createGame();
 s.week=51;
 assert.equal(perform(s,'reorder',{id:'m1'}).ok,true);
 const product=s.products[0];
 assert.equal(product.arrival,53);
 const initial=product.stock;
 advanceWeek(s);
 advanceWeek(s);
 assert.equal(s.year,2);
 assert.equal(s.week,1);
 assert.equal(product.producing,100);
 advanceWeek(s);
 assert.equal(product.producing,0);
 assert.equal(product.arrival,0);
 assert.ok(product.stock>initial-100);
 const b=createGame();
 b.week=52;
 assert.equal(perform(b,'pitch',{id:'s2'}).ok,true);
 assert.equal(b.pitches[0].resolve,53);
 advanceWeek(b);
 assert.equal(b.pitches.length,1);
 advanceWeek(b);
 assert.equal(b.pitches.length,0);
 assert.ok(validateSave(b));
});

test('B0.2: migration rejects corrupted reference graphs and unsupported save versions',()=>{
 const s=createGame(),raw=copy(s);
 assert.equal(validateSave({...raw,version:3}),false);
 assert.equal(validateSave({...raw,activeOrganisationId:'org:unknown'}),false);
 assert.equal(validateSave({...raw,world:{...raw.world,controllers:{}}}),false);
 assert.equal(validateSave({...raw,world:{...raw.world,talents:{}}}),false);
 assert.throws(()=>restoreSave({...raw,version:3}),/Unsupported or damaged/);
 assert.ok(validateSave(legacy()));
});
