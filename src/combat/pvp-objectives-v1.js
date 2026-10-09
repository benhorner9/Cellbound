(()=>{
'use strict';
// Objective state only. Damage, movement, combat ticks and match settlement belong to Combat Reborn.
// No client rewards, matchmaking, timers, or independently simulated combat.
const VERSION='1.0.0';
const MODES=['arena','capture-the-flag','king-of-the-hill'];
const TEAMS=['blue','red'];
const BASES=Object.freeze({blue:Object.freeze({x:16,y:50}),red:Object.freeze({x:84,y:50})});
const HILLS=Object.freeze([{id:'centre',x:50,y:50},{id:'north',x:50,y:24},{id:'east',x:72,y:50},{id:'south',x:50,y:76},{id:'west',x:28,y:50}].map(x=>Object.freeze(x)));
const dist=(a,b)=>Math.hypot((a?.x||0)-(b?.x||0),(a?.y||0)-(b?.y||0));
const opposite=t=>t==='blue'?'red':'blue';
const integer=(value,fallback,min,max)=>{const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback};
const clone=o=>JSON.parse(JSON.stringify(o));
function create(mode,config={}){
 if(!MODES.includes(mode))throw new Error('Unsupported PvP objective mode');
 const c={
  stormStartMs:integer(config.stormStartMs,30000,1000,180000),
  stormStepMs:integer(config.stormStepMs,6000,1000,30000),
  stormDamageIntervalMs:integer(config.stormDamageIntervalMs,1000,500,5000),
  stormDamagePct:integer(config.stormDamagePct,8,1,30),
  stormRadiusStart:integer(config.stormRadiusStart,42,20,65),
  stormRadiusMin:integer(config.stormRadiusMin,12,6,25),
  flagCaptureTarget:integer(config.flagCaptureTarget,2,1,5),
  flagReturnMs:integer(config.flagReturnMs,12000,3000,60000),
  hillRotationMs:integer(config.hillRotationMs,15000,3000,45000),
  hillScoreTarget:integer(config.hillScoreTarget,30,5,200),
  hillRadius:integer(config.hillRadius,15,5,25),
  respawnMs:integer(config.respawnMs,6000,1000,30000)
 };
 return{
  mode,config:c,winner:null,score:{blue:0,red:0},lastAt:0,
  storm:{radius:c.stormRadiusStart,nextShrink:c.stormStartMs,nextDamage:c.stormStartMs+1000,phase:0},
  flags:{blue:{holder:null,droppedAt:null,position:{...BASES.blue}},red:{holder:null,droppedAt:null,position:{...BASES.red}}},
  hill:{index:0,nextRotation:c.hillRotationMs,nextScore:1000},
  nextMove:{blue:0,red:0}
 }
}
function snapshot(state){
 return clone({
  mode:state.mode,winner:state.winner,score:state.score,
  storm:state.mode==='arena'?{radius:state.storm.radius,phase:state.storm.phase}:null,
  flags:state.mode==='capture-the-flag'?state.flags:null,
  hill:state.mode==='king-of-the-hill'?{...HILLS[state.hill.index],index:state.hill.index,nextRotationMs:Math.max(0,state.hill.nextRotation-state.lastAt)}:null
 })
}
function emit(frame,type,payload){frame.emit(type,payload)}
function stepTowards(from,to,maxStep=6){
 const length=dist(from,to);if(length<=maxStep)return{x:to.x,y:to.y};
 return{x:from.x+(to.x-from.x)*maxStep/length,y:from.y+(to.y-from.y)*maxStep/length}
}
function routeUnit(frame,state,team,target,reason){
 const members=frame.units.filter(u=>u.team===team&&u.alive);
 if(!members.length||!target||state.nextMove[team]>frame.now)return;
 const order=frame.orders?.[team]?.objective;
 let mover=members.find(u=>u.role==='dps')||members[0];
 if(state.mode==='capture-the-flag'){
  const ourFlag=state.flags[team],enemyFlag=state.flags[opposite(team)];
  mover=members.find(u=>enemyFlag.holder===u.id)||mover;
  if(order==='defend-base'||order==='recover-flag')target=ourFlag.holder?BASES[opposite(team)]:ourFlag.droppedAt?ourFlag.position:BASES[team];
  if(order==='escort-carrier'&&enemyFlag.holder&&enemyFlag.holder!==mover.id){
   const carrier=members.find(u=>u.id===enemyFlag.holder);
   if(carrier){mover=members.find(u=>u.id!==carrier.id)||carrier;target=carrier.position}
  }
 }
 if(dist(mover.position,target)>3){frame.move(mover,stepTowards(mover.position,target,7),'pvp objective '+reason);state.nextMove[team]=frame.now+800}
}
function tickArena(state,frame){
 const s=state.storm,c=state.config;
 while(frame.now>=s.nextShrink&&s.radius>c.stormRadiusMin){
  s.phase++;s.radius=Math.max(c.stormRadiusMin,s.radius-7);s.nextShrink+=c.stormStepMs;
  emit(frame,'PVP_STORM_SHRINK',{phase:s.phase,radius:s.radius,centre:{x:50,y:50}})
 }
 while(frame.now>=s.nextDamage){
  s.nextDamage+=c.stormDamageIntervalMs;
  for(const unit of frame.units){
   if(unit.alive&&dist(unit.position,{x:50,y:50})>s.radius){
    frame.damage(unit,c.stormDamagePct);
    emit(frame,'PVP_STORM_HIT',{target:unit.id,team:unit.team,radius:s.radius})
   }
  }
 }
}
function tickRespawns(state,frame){
 if(state.mode==='arena')return;
 const wait=state.config.respawnMs;
 frame.units.forEach(unit=>{
  if(unit.alive||!Number.isFinite(unit.pvpDeathAt)||frame.now-unit.pvpDeathAt<wait)return;
  frame.respawn(unit,BASES[unit.team]);
  emit(frame,'PVP_RESPAWN',{target:unit.id,team:unit.team,position:{...BASES[unit.team]}})
 })
}
function tickFlags(state,frame){
 const f=state.flags,c=state.config;
 for(const team of TEAMS){
  const flag=f[team];
  if(flag.holder){
   const carrier=frame.units.find(u=>u.id===flag.holder);
   if(!carrier?.alive){
    flag.position={...(carrier?.position||flag.position)};flag.holder=null;flag.droppedAt=frame.now;
    emit(frame,'PVP_FLAG_DROPPED',{team,position:{...flag.position}})
   }else flag.position={...carrier.position};
  }
  if(flag.droppedAt!==null&&frame.now-flag.droppedAt>=c.flagReturnMs){
   flag.droppedAt=null;flag.position={...BASES[team]};
   emit(frame,'PVP_FLAG_RETURNED',{team,reason:'timeout'})
  }
 }
 for(const team of TEAMS){
  const own=f[team],enemy=f[opposite(team)],members=frame.units.filter(u=>u.team===team&&u.alive);
  if(own.droppedAt!==null&&members.some(u=>dist(u.position,own.position)<=5)){
   own.droppedAt=null;own.position={...BASES[team]};
   emit(frame,'PVP_FLAG_RETURNED',{team,reason:'recovered'})
  }
  if(!enemy.holder&&members.length){
   const runner=members.find(u=>dist(u.position,enemy.position)<=5);
   if(runner){
    enemy.holder=runner.id;enemy.droppedAt=null;enemy.position={...runner.position};
    emit(frame,'PVP_FLAG_PICKED_UP',{team,flag:opposite(team),carrierId:runner.id})
   }
  }
  const carrier=members.find(u=>enemy.holder===u.id);
  if(carrier&&!own.holder&&own.droppedAt===null&&dist(carrier.position,BASES[team])<=6){
   state.score[team]++;enemy.holder=null;enemy.droppedAt=null;enemy.position={...BASES[opposite(team)]};
   emit(frame,'PVP_FLAG_CAPTURED',{team,score:{...state.score},carrierId:carrier.id});
   if(state.score[team]>=c.flagCaptureTarget)state.winner=team
  }
 }
 for(const team of TEAMS){
  const order=frame.orders?.[team]?.objective||'take-flag',enemy=f[opposite(team)];
  const carrier=frame.units.find(u=>u.id===enemy.holder);
  const target=carrier?.team===team?BASES[team]:BASES[opposite(team)];
  if(order!=='defend-base'&&order!=='recover-flag')routeUnit(frame,state,team,target,'flag');
  else routeUnit(frame,state,team,BASES[team],'defence')
 }
}
function tickHill(state,frame){
 const hill=state.hill,c=state.config;
 while(frame.now>=hill.nextRotation){
  hill.index=(hill.index+1)%HILLS.length;hill.nextRotation+=c.hillRotationMs;
  emit(frame,'PVP_HILL_ROTATED',{hill:{...HILLS[hill.index],index:hill.index}})
 }
 const point=HILLS[hill.index];
 while(frame.now>=hill.nextScore){
  hill.nextScore+=1000;
  const counts=Object.fromEntries(TEAMS.map(team=>[team,frame.units.filter(u=>u.alive&&u.team===team&&dist(u.position,point)<=c.hillRadius).length]));
  const owner=counts.blue>0&&counts.red===0?'blue':counts.red>0&&counts.blue===0?'red':null;
  if(owner){
   state.score[owner]++;
   emit(frame,'PVP_HILL_SCORED',{team:owner,score:{...state.score},hill:point.id,presence:counts});
   if(state.score[owner]>=c.hillScoreTarget){state.winner=owner;break}
  }
 }
 for(const team of TEAMS){
  const order=frame.orders?.[team]?.objective||'capture-hill';
  if(order==='defend-approach')continue;
  routeUnit(frame,state,team,point,'hill')
 }
}
function tick(state,frame){
 if(!state||!frame||!Number.isFinite(frame.now)||frame.now<state.lastAt)throw new Error('PvP objectives require monotonic simulation time');
 if(state.winner)return snapshot(state);
 state.lastAt=frame.now;
 tickRespawns(state,frame);
 if(state.mode==='arena')tickArena(state,frame);
 else if(state.mode==='capture-the-flag')tickFlags(state,frame);
 else tickHill(state,frame);
 return snapshot(state)
}
window.CellboundPvPObjectives=Object.freeze({VERSION,MODES,TEAMS,BASES,HILLS,create,tick,snapshot,stepTowards});
})();
