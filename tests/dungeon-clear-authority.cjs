'use strict';
// Job 6: reward authority audit.
// Exercise the actual server-response predicate and pin ordering of all final
// reward mutations; browser suites independently check the playable UI.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const endgame=read('endgame-v1.js');
const first=endgame.indexOf('function isVerifiedRunRecord(record){');
const last=endgame.indexOf('async function recordRun(dungeonId,metrics){',first);
assert(first>=0&&last>first,'The shared server-clear verifier must exist');
const errors=[],alerts=[];
const ctx={console:{warn:(...a)=>errors.push(a),error:(...a)=>errors.push(a)},alert:t=>alerts.push(t)};
vm.createContext(ctx);
vm.runInContext(endgame.slice(first,last),ctx);
for(const rejected of [null,undefined,false,{}, {error:new Error('offline')}, {valid:false,reason:'rejected'}, {valid:false,error:null}, {score:500}, {valid:'true'}]){
 ctx.value=rejected;
 assert.equal(vm.runInContext('isVerifiedRunRecord(value)',ctx),false,'Missing explicit valid:true must not authorise rewards');
}
for(const accepted of [{valid:true,score:1234},{valid:true,score:500}]){
 ctx.value=accepted;
 assert.equal(vm.runInContext('isVerifiedRunRecord(value)',ctx),true,'A successful, non-rejected server response may confirm a clear');
}
ctx.value={valid:false,reason:'integrity mismatch'};
assert.equal(vm.runInContext("reportUnverifiedClear('ashen-vault',value)",ctx),true);
assert.equal(alerts.length,1);
assert(alerts[0].includes('No completion XP')&&alerts[0].includes('Support'),'Players must be told no rewards were granted and where to report the issue');

const required=[
 {id:'ashen-vault',file:'src/dungeons/dungeon-2d-v1.js',grant:['st.gold+=gold','awardPartyXp(xp)','st.dungeonCompletions++']},
 {id:'hollow-sanctum',file:'src/dungeons/hollow-sanctum-v1.js',grant:['const gains=awardXp()','q.flags.hollowFirstClear=true','gearDrops.forEach(item=>Game.addBankItem']},
 {id:'chaos-canyon',file:'src/dungeons/chaos-canyon-v1.js',grant:['const gains=awardXp()','s.chaosCanyonCompletions=','gearDrops.forEach(item=>Game.addBankItem']},
 {id:'blackout-station',file:'src/dungeons/blackout-station-v1.js',grant:['BossDropTables?.award?.(\'blackout-station:vex-calder\'','const gains=awardXp()','s.blackoutStationCompletions=']},
 {id:'fractured-ages',file:'src/dungeons/fractured-ages-v1.js',grant:['const gains=awardXp()','s.fracturedAgesCompletions=','s.progression.fracturedAgesFirstClear=true']}
];
for(const {id,file,grant} of required){
 const src=read(file);
 const lastRecord=src.lastIndexOf("recordRun?.('"+id+"',metrics)");
 const guard=src.indexOf("if(!window.CellboundEndgame?.isVerifiedRunRecord?.(record))",lastRecord);
 const close=src.indexOf('close();return;',guard);
 assert(lastRecord>=0&&guard>lastRecord&&close>guard,'Unverified '+id+' clear must close without completing');
 for(const marker of grant){
  const index=src.indexOf(marker,lastRecord);
  assert(index>close,id+' rewards/unlocks must follow the server acceptance gate: '+marker);
 }
 assert(src.includes("reportUnverifiedClear?.('"+id+"',record)"),id+' must explain a rejected clear');
 assert(src.includes('cellbound:dungeon-complete'),id+' should retain normal accepted-run event');
}
const manor=read('manor-raid-v1.js');
const claim=manor.indexOf('async function claimLoot(id)');
const rpc=manor.indexOf("db.rpc('claim_manor_raid_rewards'",claim);
const proof=manor.indexOf('!Array.isArray(data)||data.length!==2',rpc);
const grant=manor.indexOf('items.forEach(x=>Game.addBankItem',rpc);
const progress=manor.indexOf('s.progression.manorRaidCleared=true',rpc);
assert(claim>=0&&rpc>claim&&proof>rpc&&progress>proof&&grant>progress,'Manor claims must validate two Tier 5 definitions before progressing or awarding items');
const sql=read('supabase/migrations/20260925090419_manor_raid_foundation.sql');
assert(sql.includes("create or replace function public.claim_manor_raid_rewards")&&sql.includes('v_payload:=jsonb_build_array('),'Manor server reward RPC contract exists');
console.log('Dungeon clear authority audit passed: five final reward gates, rejected result UX, no early completion mutations, and two-item Manor claim validation.');
