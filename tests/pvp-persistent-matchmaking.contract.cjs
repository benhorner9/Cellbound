'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createMatchmakingCoordinator,assertFormat,validatedRoster}=require('../server/pvp/matchmaking-coordinator.cjs');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const base=read('supabase/migrations/20261009195500_pvp_persistent_matchmaking_foundation.sql');
const hardening=read('supabase/migrations/20261009195700_pvp_queue_security_hardening.sql');
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const users=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
const roles=[['Warrior','Protection'],['Priest','Holy'],['Mage','Arcane'],['Rogue','Assassination'],['Hunter','Marksman']];
const squad=(userId,size)=>roles.slice(0,size).map(([klass,spec],i)=>({id:userId+'-'+i,name:klass+' '+i,class:klass,spec,level:15,power:18}));
for(const kind of ['queue_entries','matches','match_participants','match_rosters','commands','match_snapshots','match_events']){
 const table='cellbound_pvp_'+kind;
 assert(base.includes('create table if not exists public.'+table+'('),'Missing persistent server table '+table);
 assert(base.includes('alter table public.'+table+' enable row level security'),'Missing RLS for '+table)
}
for(const [name,patterns] of [
 ['queue access',["Queue read own entries","Queue insert own waiting request","Queue withdraw own waiting request"]],
 ['match privacy',["Participants see own identity","Participants see their matches","Participants see match snapshots","Participants see public combat events"]],
 ['trusted pairing',["for update skip locked","security invoker","grant execute on function public.cellbound_pvp_pair_waiting(text,integer) to service_role"]],
 ['roster and commands',["sealed_roster jsonb","primary key(match_id,user_id,sequence)","primary key(match_id,revision)"]]
])for(const pattern of patterns)assert(base.toLowerCase().includes(pattern.toLowerCase()),name+' missing: '+pattern);
assert(base.includes("revoke all on function public.cellbound_pvp_pair_waiting(text,integer) from public,anon,authenticated"),'No client role can pair users');
assert(hardening.includes('grant insert(user_id,mode,squad_size)'), 'Only queue identity/format may be client-written');
assert(hardening.includes('drop constraint if exists cellbound_pvp_matches_map_id_fkey'), 'Code-default maps must not depend on published overrides');
assert.throws(()=>assertFormat('arena',4),/size/);
assert.throws(()=>assertFormat('capture-the-flag',2),/size/);
assert.throws(()=>validatedRoster(squad(users[0],2),5),/size/);
assert.throws(()=>validatedRoster([squad(users[0],2)[0],squad(users[0],2)[0]],2),/Duplicate/);

let canceled=false,updates=[],pairCount=0,records=[];
const responder=(data)=>({data,error:null});
function makeDb({badRoster=false}={}){
 return{
  async rpc(name,args){
   assert.equal(name,'cellbound_pvp_pair_waiting');
   assert.equal(args.p_mode,'capture-the-flag');
   assert.equal(args.p_squad_size,5);
   pairCount++;
   return responder(pairCount===1?id:null)
  },
  from(table){
   if(table==='cellbound_pvp_matches')return{
    select:columns=>({eq:(column,value)=>({single:async()=>{
     assert.equal(column,'id');assert.equal(value,id);
     return responder({id,mode:'capture-the-flag',squad_size:5,status:'forming',map_id:null})
    }})}),
    update:fields=>({eq:(column,value)=>({
     eq:(nextCol,nextValue)=>{
      if(fields.status==='cancelled'){canceled=true;return Promise.resolve(responder(null))}
      assert.equal(column,'id');assert.equal(value,id);
      assert.equal(nextCol,'status');assert.equal(nextValue,'forming');
      assert.equal(fields.status,'ready');assert.equal(fields.map_id,'crucible-ctf');
      assert(typeof fields.ready_deadline==='string','Ready timer starts only after sealing');
      updates.push(fields);
      return{select:()=>({single:async()=>responder({id})})}
     }
    })})
   };
   if(table==='cellbound_pvp_match_participants')return{select:columns=>({eq:(column,value)=>Promise.resolve(responder([
    {match_id:id,user_id:users[0],team:'blue'},
    {match_id:id,user_id:users[1],team:'red'}
   ]))})};
   if(table==='cellbound_pvp_match_rosters')return{upsert:async values=>{
    if(badRoster)throw new Error('Bad roster must not reach DB');
    records=values;return responder(null)
   }};
   throw Error('Unexpected worker table: '+table)
  }
 }
}
(async()=>{
 const verified=[],maps=[];
 let db=makeDb();
 let worker=createMatchmakingCoordinator({
  serviceDb:db,
  loadVerifiedRoster:async arg=>{verified.push(arg.userId);return squad(arg.userId,arg.size)},
  loadPublishedMap:async arg=>{maps.push(arg.mode);return{id:'crucible-ctf',mode:arg.mode,layout:{spawns:{blue:[],red:[]}}}}
 });
 assert.equal(await worker.pair({mode:'capture-the-flag',size:5}),id);
 assert.equal(await worker.pair({mode:'capture-the-flag',size:5}),null,'No synthetic PvP opponent should be generated');
 const ready=await worker.prepare({matchId:id});
 assert.equal(ready.matchId,id);
 assert.equal(ready.teams.length,2);
 assert.equal(records.length,2,'Trusted worker seals both real account rosters');
 assert.equal(records[0].sealed_roster.length,5);
 assert.deepEqual(verified,users);
 assert.deepEqual(maps,['capture-the-flag']);
 assert.equal(updates.length,1);
 assert.equal(canceled,false);
 await assert.rejects(worker.prepare({matchId:'fake'}),/Valid matched id/);
 let failedWorker=createMatchmakingCoordinator({
  serviceDb:makeDb({badRoster:true}),
  loadVerifiedRoster:async arg=>arg.userId===users[0]?squad(arg.userId,5):[],
  loadPublishedMap:async arg=>({id:'crucible-ctf',mode:arg.mode,layout:{}})
 });
 await assert.rejects(failedWorker.prepare({matchId:id}),/Server roster did not match/);
 assert.equal(canceled,true,'Invalid rosters cancel the lobby before a combat session could begin');
 const serverCode=read('server/pvp/matchmaking-coordinator.cjs');
 for(const unsafe of ['window.','localStorage','warMarks+=','arenaSeals+=','result.pvp.winner='])
  assert(!serverCode.includes(unsafe),'Trusted match preparation must never mint client rewards or browser combat: '+unsafe);
 console.log('Persistent PvP matchmaking contract passed: private RLS, server-only pairing, atomic SQL locks, queue input hardening, trusted two-player roster sealing and failed-lobby cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1});
