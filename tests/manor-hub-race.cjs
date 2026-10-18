'use strict';
// Run the actual Manor lobby refresh function with simulated two-player/session
// state. This is a deterministic race regression, not a live account test.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../manor-raid-v1.js'),'utf8');
const start=src.indexOf('function manorRaidViewBusy(){');
const end=src.indexOf('\nfunction renderError(',start);
assert(start>=0&&end>start,'Manor protected hub refresh must exist');
let serverCalls=0,draws=0,errors=0;
let deferred=null;
const listing={id:'new-group',leader_id:'commander-a'};
const nextMember={user_id:'commander-a',listing_id:'new-group',party_snapshot:Array(5).fill({class:'Warrior'})};
const data={
 party_finder_listings:[listing],
 party_finder_members:[nextMember],
 raid_sessions:[]
};
const fakeDb={
 rpc:async(name)=>{
  serverCalls++;
  if(deferred)await deferred.promise;
  assert.equal(name,'manor_lockout_status');
  return{data:{runsRemaining:3},error:null};
 },
 from:(table)=>{
  const q={};
  for(const op of ['select','eq','in','gt','order','limit'])q[op]=()=>q;
  q.then=(resolve,reject)=>Promise.resolve({data:table==='raid_sessions'?[]:(data[table]||[]),error:null}).then(resolve,reject);
  return q;
 }
};
const ctx={
 db:fakeDb,user:{id:'commander-a'},ownerSoloQa:false,raidTimer:null,
 paintTimer:null,raidOpening:false,Date,console,
 groups:[{id:'original-group'}],members:[{user_id:'commander-a',listing_id:'original-group'}],
 myGroup:{id:'original-group'},session:{id:'active-manor',stage:'butler',status:'active'},
 pendingRewardSession:null,lockout:{runsRemaining:2},
 partyReady:()=>false,syncParty:async()=>{},
 markManorCleared:async()=>{},state:()=>({raidRewardClaims:{}}),
 renderHub:()=>{draws++},renderError:()=>{errors++}
};
vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
(async()=>{
 // Active two-player raid: a five-second hub timer must NOT null or replace
 // its session, listing or member snapshots.
 ctx.raidTimer=42;
 await ctx.fetchHub();
 assert.equal(serverCalls,0);
 assert.equal(ctx.session.id,'active-manor');
 assert.equal(ctx.myGroup.id,'original-group');
 assert.equal(draws,0);
 // The very same rule applies to owner QA and to a raid that is opening.
 ctx.raidTimer=null;ctx.ownerSoloQa=true;
 await ctx.fetchHub();
 ctx.ownerSoloQa=false;ctx.raidOpening=true;
 await ctx.fetchHub();
 assert.equal(serverCalls,0);
 assert.equal(ctx.session.id,'active-manor');

 // An outstanding request, begun in the lobby, must not overwrite the
 // combat session when a raid opens while network calls are still pending.
 let release;
 deferred={promise:new Promise(resolve=>{release=resolve})};
 ctx.raidOpening=false;
 const pending=ctx.fetchHub();
 await Promise.resolve();
 ctx.raidOpening=true;
 ctx.raidTimer=45;
 release();
 await pending;
 assert.equal(ctx.session.id,'active-manor','in-flight hub response must not replace a new combat session');
 assert.equal(ctx.myGroup.id,'original-group');
 assert.equal(draws,0);
 deferred=null;
 
 // Once the raid closes and is no longer opening, the normal lobby refresh
 // must resume to show the correct guild, listing and rewards.
 ctx.raidOpening=false;ctx.raidTimer=null;ctx.paintTimer=null;
 await ctx.fetchHub();
 assert.equal(ctx.myGroup.id,'new-group');
 assert.equal(ctx.session,null);
 assert.equal(ctx.lockout.runsRemaining,3);
 assert.equal(draws,1);
 assert.equal(errors,0);
 console.log('Manor hub two-player regression passed: protected during raid, owner QA, opening and in-flight refresh; lobby resumes after close.');
})().catch(err=>{console.error(err);process.exitCode=1});
