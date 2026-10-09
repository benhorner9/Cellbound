'use strict';

/**
 * Trusted matchmaking coordinator, intended for a future server worker only.
 * The actual atomic pairing is in public.cellbound_pvp_pair_waiting, which is
 * EXECUTE-granted solely to service_role. It returns a forming match id.
 *
 * This coordinator never accepts client-roster JSON and NEVER marks a match
 * active or settles rewards: those require the authoritative tick worker.
 */
const MODES=new Set(['arena','capture-the-flag','king-of-the-hill']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clone=o=>JSON.parse(JSON.stringify(o));
const check=(ok,msg)=>{if(!ok)throw new Error(msg)};
function assertFormat(mode,size){
 check(MODES.has(mode),'Invalid PvP queue mode');
 check(Number.isInteger(size)&&(mode==='arena'?[2,3,5].includes(size):size===5),'Invalid PvP queue size')
}
function validatedRoster(raw,size){
 check(Array.isArray(raw)&&raw.length===size,'Server roster did not match requested PvP size');
 const ids=new Set();
 const result=clone(raw);
 for(const u of result){
  check(u&&typeof u==='object'&&typeof u.id==='string'&&u.id.length>=1,'Missing server character id');
  check(typeof u.class==='string'&&u.class.length>=2&&typeof u.spec==='string'&&u.spec.length>=2,'Incomplete canonical character class');
  check(!ids.has(u.id),'Duplicate characters in sealed squad');
  check(Number.isFinite(Number(u.level))&&Number(u.level)>=1,'Unlevelled character in PvP squad');
  ids.add(u.id)
 }
 return result
}
function unwrap(response,where){
 if(response?.error)throw new Error(where+': '+String(response.error.message||response.error));
 return response?.data
}
function createMatchmakingCoordinator({serviceDb,loadVerifiedRoster,loadPublishedMap,logger=console}={}){
 check(serviceDb&&typeof serviceDb.rpc==='function'&&typeof serviceDb.from==='function','Trusted service database client required');
 check(typeof loadVerifiedRoster==='function','Trusted server roster loader required');
 check(typeof loadPublishedMap==='function','Trusted published-map loader required');
 const active=new Set();
 async function pair({mode,size}={}){
  assertFormat(mode,size);
  // This must run as service_role; a client JWT cannot call the pairing RPC.
  const matchId=unwrap(await serviceDb.rpc('cellbound_pvp_pair_waiting',{p_mode:mode,p_squad_size:size}),'Queue pair');
  if(!matchId)return null;
  check(UUID.test(String(matchId)),'Pairing RPC returned invalid match id');
  return matchId
 }
 async function prepare({matchId}={}){
  check(UUID.test(String(matchId)),'Valid matched id required');
  if(active.has(matchId))throw new Error('Match already being prepared by this worker');
  active.add(matchId);
  let participants;
  try{
   const match=unwrap(await serviceDb.from('cellbound_pvp_matches').select('id,mode,squad_size,status,map_id').eq('id',matchId).single(),'Load match');
   check(match&&match.status==='forming','Only forming matches may be prepared');
   assertFormat(match.mode,match.squad_size);
   participants=unwrap(await serviceDb.from('cellbound_pvp_match_participants').select('match_id,user_id,team').eq('match_id',matchId),'Load participants');
   check(Array.isArray(participants)&&participants.length===2,'Online match must have two distinct commanders');
   const blue=participants.find(p=>p.team==='blue'),red=participants.find(p=>p.team==='red');
   check(blue&&red&&UUID.test(blue.user_id)&&UUID.test(red.user_id)&&blue.user_id!==red.user_id,'Invalid match team identity');
   const squads=await Promise.all([blue,red].map(async p=>({
    userId:p.user_id,team:p.team,roster:validatedRoster(await loadVerifiedRoster({
     userId:p.user_id,size:match.squad_size,mode:match.mode,matchId
    }),match.squad_size)
   })));
   const allIds=squads.flatMap(s=>s.roster.map(u=>u.id));
   check(new Set(allIds).size===allIds.length,'Character assigned to both PvP teams');
   const map=await loadPublishedMap({mode:match.mode,matchId});
   check(map&&typeof map==='object'&&typeof map.id==='string'&&map.mode===match.mode&&map.layout&&typeof map.layout==='object','Trusted published PvP map required');
   const sealed=squads.map(s=>({match_id:matchId,user_id:s.userId,sealed_roster:s.roster}));
   unwrap(await serviceDb.from('cellbound_pvp_match_rosters').upsert(sealed,{onConflict:'match_id,user_id'}),'Seal squads');
   // Metadata only. Never send the raw server roster or hidden match seed
   // over publicly subscribable snapshots.
   unwrap(await serviceDb.from('cellbound_pvp_matches').update({
    map_id:map.id,map_snapshot:clone(map.layout),status:'ready'
   }).eq('id',matchId).eq('status','forming').select('id').single(),'Prepare lobby');
   return{matchId,mode:match.mode,size:match.squad_size,mapId:map.id,teams:squads.map(s=>({userId:s.userId,team:s.team}))}
  }catch(error){
   // Fail closed: no partial lobby can transition to an active PvP match.
   try{
    await serviceDb.from('cellbound_pvp_matches').update({
     status:'cancelled',reason:'match-preparation-failed',completed_at:new Date().toISOString()
    }).eq('id',matchId).eq('status','forming')
   }catch(cleanupError){logger.warn?.('PvP match cancellation failed',matchId,cleanupError)}
   throw error
  }finally{active.delete(matchId)}
 }
 return Object.freeze({pair,prepare})
}
module.exports={createMatchmakingCoordinator,assertFormat,validatedRoster};
