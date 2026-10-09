(()=>{
'use strict';

const MODEL='Combat Reborn';
const CONTRACT_VERSION='1.0.0';
const SESSION_API_VERSION='1.0.0';
const zones=new Map();

function core(){
  const engine=window.CellboundCombatReborn;
  if(!engine||typeof engine.simulate!=='function')throw new Error('Combat Reborn engine is unavailable');
  return engine
}
function engineVersion(){
  const engine=window.CellboundCombatReborn;
  return engine?.VERSION||engine?.version||'unknown'
}
function stampResult(result,meta={}){
 if(!result||!Array.isArray(result.events)||!result.finalState)throw new Error('Combat Reborn returned an invalid combat result');
 result.combatModel=MODEL;
 result.engineVersion=result.engineVersion||engineVersion();
 result.combatContract=CONTRACT_VERSION;
 if(meta?.zone)result.combatZone=meta.zone;
 return result
}
function simulate(options={},meta={}){
 const engine=core();
 return stampResult(engine.simulate(meta?.zone?{...options,professionZone:meta.zone}:options),meta)
}
// Same canonical Combat Reborn engine, exposed in tick-sized steps for interactive play.
// Not an authoritative multiplayer server. PvP match state must be hosted and validated server-side.
function createSession(options={},meta={}){
 const engine=core();
 if(typeof engine.createSession!=='function')throw new Error('Combat Reborn session API is unavailable');
 const session=engine.createSession(meta?.zone?{...options,professionZone:meta.zone}:options);
 return Object.freeze({
  advance:ticks=>session.advance(ticks),
  changeTactics:changes=>session.changeTactics(changes),
  snapshot:()=>session.snapshot(),
  result:()=>{const value=session.result();return value?stampResult(value,meta):null},
  runToCompletion:()=>stampResult(session.runToCompletion(),meta)
 })
}

function assertServerPayload(payload,zone='server-combat'){
  if(!payload||payload.combatModel!==MODEL){
    throw new Error(zone+' did not return the required Combat Reborn combat model');
  }
  return payload
}
function register(id,meta={}){
  const key=String(id||'').trim();
  if(!key)return;
  zones.set(key,{id:key,model:MODEL,contract:CONTRACT_VERSION,...meta})
}
function audit(){
  return{
    model:MODEL,
    contract:CONTRACT_VERSION,
    engineReady:!!window.CellboundCombatReborn?.simulate,
    sessionReady:!!window.CellboundCombatReborn?.createSession,
    sessionApi:SESSION_API_VERSION,
    engineVersion:engineVersion(),
    zones:[...zones.values()]
  }
}

window.CellboundCombatStandard={
  MODEL,CONTRACT_VERSION,SESSION_API_VERSION,core,simulate,createSession,assertServerPayload,register,audit,
  UI:{
    shell:'shared CB2D combat shell',
    vitals:'HP above class resource',
    panels:['Enemy Cast','Damage Meter','Healing Meter','Threat Meter','Party Actions','Party Condition','Combat Feed'],
    rules:['real arena geometry','real positions','real line of sight','red harmful statuses','green beneficial statuses']
  }
};
})();