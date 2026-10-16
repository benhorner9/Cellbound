'use strict';
const assert=require('node:assert/strict');
const E=require('../src/episodes/episode-two-v1.js');
const clone=x=>JSON.parse(JSON.stringify(x));
const accountId='episode-two-test';
const stamp='2026-10-16T20:00:00.000Z';
function seed(eligible=true){return {gold:10,roster:['tank','heal','hunter','rogue','mage'].map(id=>({id,level:15,xp:0,equipment:{Weapon:{itemId:'legacy-'+id,tier:5}},professions:[null]})),party:{tank:'tank',healer:'heal',dps:['hunter','rogue','mage']},questSystem:{nullComplex:{complete:eligible,stage:eligible?'complete':'signal'}},progression:{nullComplexUnlocked:true},nullComplex:{highestFloor:99}}}
let account,serial=0;
function send(type,contentId,extra={}){
  const event={type,contentId,at:stamp,expectedRevision:account.episode2.revision,...extra};
  const old=clone(account),result=E.transition(account,accountId,event);
  assert.deepEqual(account,old,'Reducer never mutates the caller snapshot');
  account=result.state;return result;
}
function quest(id){
  send('quest-start',id);
  for(const o of E.CONTENT[id].objectives)send('objective-complete',id,{objectiveId:o.id});
}
function run(id,mode='story-assault',difficulty='normal'){
  const runId='test-run-'+(++serial);
  send('run-start',id,{runId,mode,difficulty});
  for(const roomId of E.CONTENT[id].rooms)send('room-clear',id,{runId,roomId,protectedTargetSurvived:true});
  send('run-complete',id,{runId});return runId;
}
function perform(id,mode){if(E.CONTENT[id].kind==='quest')quest(id);else run(id,mode)}
function orders(a,b){if(!a.length)return[b];if(!b.length)return[a];return orders(a.slice(1),b).map(xs=>[a[0],...xs]).concat(orders(a,b.slice(1)).map(xs=>[b[0],...xs]))}
assert.equal(Object.values(E.CONTENT).filter(x=>x.kind==='quest').length,7);
assert.equal(Object.values(E.CONTENT).filter(x=>x.kind==='dungeon').length,4);
assert.equal(Object.values(E.CONTENT).filter(x=>x.kind==='raid').length,2);
for(const def of Object.values(E.CONTENT)){
  for(const req of def.requires)assert(req===E.FINALE||E.CONTENT[req]);
  assert(!('minLevel' in def),'Recommended levels do not become locks');
  if(def.kind==='quest'){
    assert(new Set(def.objectives.map(o=>o.id)).size===def.objectives.length);
    assert(def.objectives.every(o=>o.text&&o.dialogue&&o.speaker&&o.type));
  }
}
// Legacy activity access, repeated floors and a partially played finale prove nothing.
for(const legacy of [seed(false),{...seed(false),questSystem:{nullComplex:{stage:'escape'}}},{...seed(false),progression:{nullComplexUnlocked:true,manorRaidCleared:true}}]){
  const migrated=E.migrate(legacy,accountId);
  assert.equal(migrated.episode2.unlocked.length,0);
  assert.equal(E.status(migrated,'e2_q01').missing[0].id,E.FINALE);
}
account=E.migrate(seed(),accountId);
assert.deepEqual(account.episode2.unlocked,['e2_q01']);
assert.deepEqual(E.migrate(account,accountId),account,'Migration is idempotent');
assert.throws(()=>E.migrate(account,'another-account'),/identity mismatch/);
assert.throws(()=>E.migrate({...account,episode2:{...account.episode2,version:999}},accountId),/Unsupported/);
assert.throws(()=>E.transition(account,accountId,{type:'quest-start',contentId:'e2_q01',at:stamp,expectedRevision:99}),/Stale/);
assert.throws(()=>send('quest-start','e2_q04'),/Missing prerequisites/);
send('quest-start','e2_q01');
assert.throws(()=>send('objective-complete','e2_q01',{objectiveId:'component'}),/current objective/);
send('objective-complete','e2_q01',{objectiveId:'transmission'});
const rev=account.episode2.revision;
assert.equal(send('objective-complete','e2_q01',{objectiveId:'transmission'}).changed,false);
assert.equal(account.episode2.revision,rev);
// Every legal ordering of each pair of branches, in each raid access mode.
let routes=0;
for(const early of orders(['e2_q02','e2_d01'],['e2_q03','e2_d02'])){
  for(const late of orders(['e2_q05','e2_d03'],['e2_q06','e2_d04'])){
    for(const mode of ['story-assault','guild-raid']){
      account=E.migrate(seed(),accountId);
      quest('e2_q01');assert.equal(account.roster[0].level,16);
      early.forEach(id=>perform(id,mode));
      assert.equal(account.roster[0].level,21);
      quest('e2_q04');assert.equal(account.roster[0].level,22);
      run('e2_r01',mode);assert.equal(account.roster[0].level,23);
      assert.equal(account.episode2.worldState,'harvest-awakening');
      late.forEach(id=>perform(id,mode));
      assert.equal(account.roster[0].level,28);
      quest('e2_q07');assert.equal(account.roster[0].level,30,'No repeat runs to reach final raid target');
      assert.equal(account.episode2.complete,false);
      run('e2_r02',mode);
      assert.equal(account.episode2.complete,true);
      assert.equal(account.episode2.endgameActive,true);
      assert.equal(account.episode2.worldState,'fields-reclaimed');
      assert.equal(Object.keys(account.episode2.rewardClaims).length,13);
      assert.equal(Object.values(account.episode2.rewardClaims).reduce((n,r)=>n+r.xp,0),90750);
      assert(account.roster.every(c=>c.level===30&&c.xp===0));
      assert.deepEqual(account.roster.map(c=>c.equipment),seed().roster.map(c=>c.equipment),'No Episode 1 gear replacement');
      assert.deepEqual(account.questSystem,seed().questSystem,'Episode 1 story flags unchanged');
      assert.deepEqual(E.migrate(JSON.parse(JSON.stringify(account)),accountId),account,'Save/load round trip');
      routes++;
    }
  }
}
// Repeat clears and duplicate delivery never repeat a story reward.
for(const id of ['e2_d01','e2_d02','e2_d03','e2_d04','e2_r01','e2_r02']){
  const before=account.gold,runId=run(id,'guild-raid');
  assert.equal(account.gold-before,E.CONTENT[id].gold);
  assert.equal(account.episode2.rewardClaims['run:'+runId].xp,E.CONTENT[id].repeatXp);
  const snapshot=clone(account);
  assert.equal(send('run-complete',id,{runId}).changed,false);
  assert.deepEqual(account,snapshot);
}
const duplicate=clone(account);
const last=E.CONTENT.e2_q07.objectives.at(-1).id;
assert.equal(send('objective-complete','e2_q07',{objectiveId:last}).changed,false);
assert.deepEqual(account,duplicate);
// Wipes, abandons, unknown runs, incomplete runs and resume are separate states.
send('run-start','e2_d01',{runId:'failure-run'});
assert.throws(()=>send('run-complete','e2_d01',{runId:'failure-run'}),/successful complete run/);
assert.throws(()=>send('room-clear','e2_d01',{runId:'failure-run',roomId:'growth-chamber'}),/current room/);
send('room-clear','e2_d01',{runId:'failure-run',roomId:'storage-hatch'});
account=E.migrate(JSON.parse(JSON.stringify(account)),accountId);
assert.equal(account.episode2.runs['failure-run'].rooms.length,1);
send('run-fail','e2_d01',{runId:'failure-run'});
assert.throws(()=>send('run-complete','e2_d01',{runId:'failure-run'}),/successful complete run/);
send('run-start','e2_d01',{runId:'abandon-run'});
send('run-abandon','e2_d01',{runId:'abandon-run'});
run('e2_d01');
send('run-start','e2_r02',{runId:'zero-rescue-run',mode:'story-assault'});
for(const roomId of E.CONTENT.e2_r02.rooms.slice(0,3))send('room-clear','e2_r02',{runId:'zero-rescue-run',roomId});
assert.throws(()=>send('room-clear','e2_r02',{runId:'zero-rescue-run',roomId:'subject-zero',protectedTargetSurvived:false}),/Subject Zero must survive/);
assert.throws(()=>send('room-clear','e2_r02',{runId:'zero-rescue-run',roomId:'subject-zero'}),/Subject Zero must survive/);
send('run-abandon','e2_r02',{runId:'zero-rescue-run'});
// A second account starts clean; there is no global/localStorage progression store.
const other=E.migrate(seed(false),'other-account');
assert.equal(other.episode2.unlocked.length,0);
assert.equal(Object.keys(other.episode2.rewardClaims).length,0);
assert.deepEqual(E.PVP_EQUIPMENT_LEVELS,{1:20,2:25,3:30});
assert.equal(E.EQUIPMENT_BANDS.length,3);
assert(E.EQUIPMENT_BANDS.every(x=>x.maxTier===5));
console.log('Episode 2 domain PASS: '+routes+' legal branch/mode routes; 90,750 XP, first/repeat claims, failure/resume, identity isolation and legacy preservation. This is reducer validation, not a playable campaign or multiplayer test.');
