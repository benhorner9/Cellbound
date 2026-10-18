'use strict';
// Two separate commander JS runtimes exercising the actual Manor ready handler.
// Server RPC and Realtime delivery are deterministic fakes; no real accounts
// or raid charges are touched.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.resolve(__dirname,'../manor-raid-v1.js'),'utf8');
const begin=src.indexOf('function readyStartAt(){');
const end=src.indexOf('\nfunction bossBriefingMarkup(',begin);
assert(begin>=0&&end>begin,'Manor ready check functions must exist');
const readyCode=src.slice(begin,end);
const now=Date.now();
const shared={readyA:false,readyB:false,readyStage:'butler',encounterStartAt:null,stageStartedAt:null};
const clone=x=>JSON.parse(JSON.stringify(x));
let rpcCalls=0;
function commander(side){
 const alerts=[],renders=[],launches=[],timers=new Map();
 let counter=1;
 const ctx={
  ownerSoloQa:false,session:{id:'raid-test',status:'active',stage:'butler',state:clone(shared)},
  readyLaunchTimer:null,serverNow:()=>now,now:()=>now,
  stamp:s=>s?Date.parse(s):0,
  clearTimeout:t=>timers.delete(t),
  setTimeout:(fn,ms)=>{const id=counter++;timers.set(id,{fn,ms});return id},
  renderReadyGate:()=>renders.push(clone(ctx.session.state)),
  mountOwnerQaControls:()=>{},syncSharedRaidView:async()=>launches.push('combat'),
  syncServerClock:()=>{},alert:t=>alerts.push(String(t)),console,
  db:{rpc:async(name,args)=>{
    assert.equal(name,'manor_set_ready');
    assert.equal(args.p_session_id,'raid-test');
    rpcCalls++;
    shared[side===0?'readyA':'readyB']=Boolean(args.p_ready);
    if(shared.readyA&&shared.readyB){
      const when=new Date(now+3000).toISOString();
      shared.encounterStartAt=when;shared.stageStartedAt=when;
    }else{
      shared.encounterStartAt=null;shared.stageStartedAt=null;
    }
    return{data:{state:clone(shared),serverNow:new Date(now).toISOString()},error:null}
  }}
 };
 vm.createContext(ctx);vm.runInContext(readyCode,ctx);
 return{ctx,alerts,renders,launches,timers};
}
(async()=>{
 const a=commander(0),b=commander(1);
 await a.ctx.setRaidReady(true);
 assert.equal(a.ctx.session.state.readyA,true);
 assert.equal(a.ctx.session.state.readyB,false);
 assert.equal(a.ctx.readyStartAt(),0);
 assert.equal(a.timers.size,0,'One commander cannot start the encounter alone');
 // Cancelling readiness before the partner arrives must revoke the ready state.
 await a.ctx.setRaidReady(false);
 assert.equal(shared.readyA,false);
 await a.ctx.setRaidReady(true);
 await b.ctx.setRaidReady(true);
 assert.equal(shared.readyA,true);
 assert.equal(shared.readyB,true);
 assert.equal(b.ctx.readyStartAt(),Date.parse(shared.encounterStartAt));
 assert.equal(b.timers.size,1,'Second commander schedules the shared start');
 assert.equal([...b.timers.values()][0].ms,3020,'Start uses server-coordinated 3-second countdown');
 // Realtime delivers the same authoritative state to the other commander;
 // it must schedule the identical start rather than independently start now.
 a.ctx.session.state=clone(shared);
 a.ctx.scheduleReadyLaunch();
 assert.equal(a.ctx.readyStartAt(),b.ctx.readyStartAt());
 assert.equal(a.timers.size,1);
 assert.equal([...a.timers.values()][0].ms,3020);
 assert.equal(a.alerts.length+b.alerts.length,0);
 assert.equal(rpcCalls,4,'Both users only change their own readiness');
 console.log('Manor two-commander readiness passed: wait, cancel, re-ready, synchronized countdown and shared start.');
})().catch(e=>{console.error(e);process.exitCode=1});
