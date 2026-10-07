(()=>{
'use strict';

const MODEL='Combat Reborn';
const CONTRACT_VERSION='1.1.0';
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
function simulate(options={},meta={}){
  const engine=core();
  const result=engine.simulate(meta?.zone?{...options,professionZone:meta.zone}:options);
  if(!result||!Array.isArray(result.events)||!result.finalState)throw new Error('Combat Reborn returned an invalid combat result');
  result.combatModel=MODEL;
  result.engineVersion=result.engineVersion||engineVersion();
  result.combatContract=CONTRACT_VERSION;
  if(meta?.zone)result.combatZone=meta.zone;
  return result
}
function dispatchCombatEvents(events,meta={}){
  if(!Array.isArray(events)||!events.length)return;
  events.forEach(event=>{
    try{window.dispatchEvent(new CustomEvent('cellbound:combat-event',{detail:{event,zone:meta?.zone||null,profile:meta?.profile||'pve'}}))}catch(_){}
  })
}
function instrumentLiveSession(session,meta={}){
  if(!session||session.__cellboundHudInstrumented)return session;
  session.__cellboundHudInstrumented=true;
  const wrap=name=>{
    if(typeof session[name]!=='function')return;
    const raw=session[name].bind(session);
    session[name]=(...args)=>{
      const out=raw(...args);
      dispatchCombatEvents(out?.events,meta);
      return out
    }
  };
  ['advance','drainEvents'].forEach(wrap);
  return session
}
function createLiveSession(options={},meta={}){
  const engine=core();
  if(typeof engine.createLiveSession!=='function')throw new Error('Combat Reborn live-session API is unavailable');
  const session=engine.createLiveSession(meta?.zone?{...options,professionZone:meta.zone}:options);
  if(!session||typeof session.advance!=='function'||typeof session.command!=='function')throw new Error('Combat Reborn returned an invalid live session');
  return instrumentLiveSession(session,meta)
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
    liveReady:!!window.CellboundCombatReborn?.createLiveSession,
    engineVersion:engineVersion(),
    zones:[...zones.values()]
  }
}

window.CellboundCombatStandard={
  MODEL,CONTRACT_VERSION,core,simulate,createLiveSession,assertServerPayload,register,audit,dispatchCombatEvents,
  UI:{
    shell:'shared CB2D combat shell',
    vitals:'HP above class resource',
    panels:['Enemy Cast','Damage Meter','Healing Meter','Threat Meter','Party Actions','Party Condition','Combat Feed'],
    rules:['real arena geometry','real positions','real line of sight','red harmful statuses','green beneficial statuses']
  }
};
})();