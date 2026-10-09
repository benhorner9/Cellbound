'use strict';

/**
 * Server-only match lifecycle for Cellbound PvP.
 *
 * This module is deliberately excluded from the browser runtime manifest.
 * The caller MUST authenticate accounts, load/validate their persisted squads,
 * allocate a server-generated match id/seed, and persist state under a
 * transactional lock before exposing an endpoint. No ranking/reward API exists.
 * Damage, movement, abilities and objectives are delegated ONLY to the
 * canonical Combat Reborn createPvpSession gateway.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODES=new Set(['arena','capture-the-flag','king-of-the-hill']);
const SIDES=['blue','red'];
const json=v=>JSON.parse(JSON.stringify(v));
const validId=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9_-]{5,100}$/i.test(v);
const finite=v=>typeof v==='number'&&Number.isFinite(v);
function assert(ok,message){if(!ok)throw new Error(message)}

function createAuthority({engine,clock=Date.now,acceptanceMs=15000,reconnectMs=30000,orderCooldownMs=3000}={}){
 assert(engine&&typeof engine.createPvpSession==='function','Canonical Combat Reborn PvP gateway required');
 assert(typeof clock==='function','Server clock required');
 for(const [name,value] of Object.entries({acceptanceMs,reconnectMs,orderCooldownMs})){
  assert(Number.isSafeInteger(value)&&value>=0&&value<=120000,'Invalid '+name);
 }
 const matches=new Map();
 const time=()=>{const n=clock();assert(finite(n)&&n>=0,'Invalid authoritative clock');return n};
 const userFor=(match,userId)=>{
  assert(UUID.test(String(userId||'')),'Authenticated account id required');
  const player=match.players.find(p=>p.userId===userId);
  assert(player,'Account is not a participant in this match');
  return player
 };
 const roomFor=id=>{const m=matches.get(id);assert(m,'Unknown match');return m};
 const publicState=m=>({
  id:m.id,mode:m.mode,size:m.size,status:m.status,createdAt:m.createdAt,
  readyDeadline:m.readyDeadline,startedAt:m.startedAt,finishedAt:m.finishedAt,
  reason:m.reason,winner:m.winner,revision:m.revision,
  players:m.players.map(p=>({userId:p.userId,team:p.team,ready:p.ready,connected:p.connected})),
  // Informational only. A client can never submit this as an authoritative result.
  snapshot:m.session?.snapshot()||null
 });
 function createMatch({id,mode,size,players,seed,maximumDurationMs=120000}={}){
  assert(validId(id)&&!matches.has(id),'Unique server-generated match id required');
  assert(MODES.has(mode),'Invalid PvP match mode');
  assert(Number.isInteger(size)&&(mode==='arena'?[2,3,5].includes(size):size===5),'Invalid squad format');
  assert(typeof seed==='string'&&seed.length>=12&&seed.length<=150,'Server-generated match seed required');
  assert(Array.isArray(players)&&players.length===2,'First online milestone requires two authenticated commanders');
  assert(Number.isSafeInteger(maximumDurationMs)&&maximumDurationMs>=10000&&maximumDurationMs<=360000,'Invalid match duration');
  const seenIds=new Set(),seenUnits=new Set();
  const chosen=players.map((p,index)=>{
   assert(p&&UUID.test(String(p.userId||''))&&!seenIds.has(p.userId),'Distinct authenticated account ids required');
   assert(p.team===SIDES[index],'Distinct blue and red sides required');
   assert(Array.isArray(p.sealedRoster)&&p.sealedRoster.length===size,'Server-sealed squad must match selected format');
   seenIds.add(p.userId);
   // Never accept client-supplied combat state on command or tick. These rosters
   // must already have been fetched and sealed by a trusted server-side loader.
   const roster=json(p.sealedRoster);
   roster.forEach(u=>{
    assert(u&&typeof u.id==='string'&&u.id.length>0&&typeof u.class==='string'&&u.class.length>0,'Invalid sealed character');
    assert(!seenUnits.has(u.id),'Character ids must be unique across both squads');
    seenUnits.add(u.id)
   });
   return{userId:p.userId,team:p.team,roster,ready:false,connected:true,lastSeq:0,lastOrderAt:-Infinity,disconnectedAt:null}
  });
  const t=time();
  const m={id,mode,size,players:chosen,seed,maximumDurationMs,status:'ready',createdAt:t,
   readyDeadline:t+acceptanceMs,startedAt:null,finishedAt:null,reason:null,winner:null,revision:1,session:null};
  matches.set(id,m);return publicState(m)
 }
 function accept({matchId,userId}={}){
  const m=roomFor(matchId),p=userFor(m,userId);
  assert(m.status==='ready','Match is not accepting players');
  if(time()>m.readyDeadline){m.status='cancelled';m.reason='ready-timeout';m.revision++;throw new Error('Ready acceptance expired')}
  assert(p.connected,'Disconnected player cannot accept');
  if(!p.ready){p.ready=true;m.revision++}
  if(m.players.every(x=>x.ready)){
   const [blue,red]=m.players;
   // All simulation state comes from the same engine used by dungeons and raids.
   m.session=engine.createPvpSession({
    pvp:{mode:m.mode,size:m.size,blue:json(blue.roster),red:json(red.roster)},
    encounter:{id:'online-'+m.id,environment:{blockers:[]}},
    seed:m.seed,maxDurationMs:m.maximumDurationMs
   },{zone:'online-pvp'});
   m.status='active';m.startedAt=time();m.revision++
  }
  return publicState(m)
 }
 function command({matchId,userId,sequence,category,value}={}){
  const m=roomFor(matchId),p=userFor(m,userId);
  assert(m.status==='active'&&m.session,'Match is not active');
  assert(p.connected,'Player disconnected');
  assert(Number.isSafeInteger(sequence)&&sequence>p.lastSeq&&sequence<=p.lastSeq+1000,'Non-monotonic command sequence');
  const at=time();
  assert(at-p.lastOrderAt>=orderCooldownMs,'PvP command cooldown active');
  const result=m.session.pvpCommand(p.team,category,value);
  if(result?.ok!==true)return{ok:false,reason:result?.reason||'invalid-command',revision:m.revision};
  p.lastSeq=sequence;p.lastOrderAt=at;m.revision++;
  return{ok:true,team:p.team,sequence,revision:m.revision,at};
 }
 function advance({matchId,deltaMs}={}){
  const m=roomFor(matchId);
  assert(m.status==='active'&&m.session,'Cannot advance inactive match');
  assert(Number.isSafeInteger(deltaMs)&&deltaMs>0&&deltaMs<=1000,'Server tick must be 1–1000 ms');
  // Only the authenticated worker may call advance. There is intentionally no
  // client RPC accepting elapsed time, simulation state, outcomes or rewards.
  const step=m.session.advance(deltaMs);m.revision++;
  if(step.finished){
   m.status='completed';m.finishedAt=time();m.reason='combat-reborn';
   m.winner=step.result?.pvp?.winner||m.session.snapshot()?.pvp?.winner||'draw';
  }
  return{finished:!!step.finished,revision:m.revision,events:json(step.events||[]),status:m.status,winner:m.winner}
 }
 function connection({matchId,userId,connected}={}){
  const m=roomFor(matchId),p=userFor(m,userId);
  assert(m.status==='active'||m.status==='ready','Match no longer permits reconnection');
  const t=time();
  if(!connected){if(p.connected){p.connected=false;p.disconnectedAt=t;m.revision++}}
  else{
   assert(p.disconnectedAt===null||t-p.disconnectedAt<=reconnectMs,'Reconnect grace period expired');
   if(!p.connected){p.connected=true;p.disconnectedAt=null;m.revision++}
  }
  return publicState(m)
 }
 function sweep(){
  const t=time(),changed=[];
  for(const m of matches.values()){
   if(m.status==='ready'&&t>m.readyDeadline){m.status='cancelled';m.reason='ready-timeout'}
   else if(m.status==='active'){
    const gone=m.players.filter(p=>!p.connected&&p.disconnectedAt!==null&&t-p.disconnectedAt>reconnectMs);
    if(gone.length){
     m.status='abandoned';m.reason='disconnect-timeout';
     m.winner=gone.length===2?'draw':gone[0].team==='blue'?'red':'blue';
     m.finishedAt=t
    }
   }
   if(m.status==='cancelled'||m.status==='abandoned'){m.revision++;changed.push({id:m.id,status:m.status,reason:m.reason})}
  }
  return changed
 }
 function view({matchId,userId}={}){
  const m=roomFor(matchId);userFor(m,userId);
  return publicState(m)
 }
 function status({matchId}={}){
  const m=roomFor(matchId);
  return{id:m.id,status:m.status,revision:m.revision,winner:m.winner,reason:m.reason}
 }
 return Object.freeze({createMatch,accept,command,advance,connection,sweep,view,status});
}
module.exports={createAuthority};
