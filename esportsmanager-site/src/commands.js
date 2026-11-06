// B0.3 — Portable deterministic command boundary for the offline World v2.
// No DOM, browser storage, global RNG or dates. The same snapshot + command
// produces the same events, state and seeded match result on every device.
import {
  ACTIVITIES, TACTICS, perform, simulateOrganisationWeek, finishWorldWeek, validateSave, restoreSave
} from './engine.js?v=1.3.0';

export const COMMAND_TYPES = Object.freeze([
  'tactic','training','schedule','content','pitch','reorder','price',
  'createProduct','upgrade','hire','signCreator','signPlayer','renew','promo'
]);

const TRAINING = Object.freeze(['Aim','Teamwork','Strategy','Rest']);
const CONTENT = Object.freeze(['Behind the scenes','Player interview','Creator challenge','Tournament recap']);
const STAFF_ROLES = Object.freeze(['Content Producer','Commercial Manager','Scout','Merchandise Manager']);
const plain = value => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const textId = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
const reject = (message, state) => ({ok:false, message, state, events:[]});
const copy = state => restoreSave(JSON.parse(JSON.stringify(state)));

export function getControllerId(state){
  if(!state || !state.world || !state.activeOrganisationId)return null;
  return state.world.organisations[state.activeOrganisationId]?.controllerId || null;
}

// Resolve controllers against their OWN organisation. Human input is restricted
// to the active player's club; CPU commands can manage only that CPU's club.
// These are offline ownership rules, NOT remotely verifiable authentication.
function resolveActor(state,controllerId){
 if(!validateSave(state)||state.version!==2)return {error:'Load a valid World v2 game before managing it.'};
 if(!textId(controllerId))return {error:'Missing organisation controller.'};
 const controller=state.world.controllers[controllerId];
 const org=state.world.organisations[controller?.organisationId];
 if(!controller||!org||org.controllerId!==controllerId)return {error:'Unknown organisation controller.'};
 if(controller.type==='human'&&org.id!==state.activeOrganisationId)return {error:'This human does not own the active organisation.'};
 if(controller.type==='cpu'&&org.id===state.activeOrganisationId)return {error:'CPU cannot control the player organisation.'};
 if(!['cpu','human'].includes(controller.type))return {error:'Unsupported controller.'};
 return {controller,org};
}

// The existing legacy rules read a screen facade (state.cash, state.players).
// Temporarily resolve that facade to the actor's organisation on a private
// draft; restore the human view before returning it to the UI or saving.
function actAs(state,orgId,action){
 const founderId=state.activeOrganisationId;
 const cpu=orgId!==founderId;
 const founderSeed=state.seed;
 const org=state.world.organisations[orgId];
 state.activeOrganisationId=orgId;
 if(cpu)state.seed=org.simulationSeed;
 try{
  const outcome=action();
  if(cpu)org.simulationSeed=state.seed;
  return outcome;
 }finally{
  state.activeOrganisationId=founderId;
  if(cpu)state.seed=founderSeed;
 }
}

// Whitelist and normalise payload shape: nothing from an arbitrary browser
// object should be able to inject a rule, field or seed into the engine.
function normalise(command){
  if(!plain(command) || !COMMAND_TYPES.includes(command.type))return {error:'Unknown management command.'};
  const payload=command.payload===undefined?{}:command.payload;
  if(!plain(payload))return {error:'Invalid command parameters.'};
  const acceptedKeys={
    tactic:['value'],training:['value'],schedule:['id','value'],content:['value'],
    pitch:['id'],reorder:['id'],price:['id','value'],createProduct:['value'],
    upgrade:[],hire:['value'],signCreator:['id'],signPlayer:['id','replace'],
    renew:['id'],promo:[]
  }[command.type];
  if(Object.keys(payload).some(key=>!acceptedKeys.includes(key)))return {error:'Unexpected command parameter.'};
  const needsId=['schedule','pitch','reorder','price','signCreator','signPlayer','renew'];
  if(needsId.includes(command.type)&&!textId(payload.id))return {error:'Select an existing organisation item.'};
  if(command.type==='signPlayer'&&!textId(payload.replace))return {error:'Select a player to replace.'};
  if(command.type==='tactic'&&!TACTICS.includes(payload.value))return {error:'Choose a valid tactical setup.'};
  if(command.type==='training'&&!TRAINING.includes(payload.value))return {error:'Choose a valid training focus.'};
  if(command.type==='schedule'&&!ACTIVITIES.includes(payload.value))return {error:'Choose a valid creator activity.'};
  if(command.type==='content'&&!CONTENT.includes(payload.value))return {error:'Choose a valid content project.'};
  if(command.type==='hire'&&!STAFF_ROLES.includes(payload.value))return {error:'Choose a valid staff role.'};
  if(command.type==='createProduct'&&(typeof payload.value!=='string'||!payload.value.trim()||
    payload.value.length>28))return {error:'Choose a merchandise product name (1–28 characters).'};
  if(command.type==='price'){
    if((typeof payload.value!=='string'&&typeof payload.value!=='number')||
      (typeof payload.value==='string'&&!payload.value.trim()))return {error:'Choose a valid selling price.'};
    const n=Number(payload.value);
    if(!Number.isFinite(n)||n<10||n>250)return {error:'Choose a price from £10 to £250.'};
  }
  return {type:command.type,payload:Object.fromEntries(acceptedKeys
    .filter(key=>Object.hasOwn(payload,key)).map(key=>[key,payload[key]]))};
}

function preview(snapshot,actorId,command){
 const actor=resolveActor(snapshot,actorId);
 if(actor.error)return {ok:false,message:actor.error};
 const sanitised=normalise(command);
 if(sanitised.error)return {ok:false,message:sanitised.error};
 try{
  const draft=copy(snapshot);
  const outcome=actAs(draft,actor.org.id,()=>perform(draft,sanitised.type,sanitised.payload));
  if(!outcome.ok)return {ok:false,message:outcome.message};
  if(!validateSave(draft))return {ok:false,message:'The command produced an invalid world state.'};
  return {ok:true,message:outcome.message,command:sanitised,orgId:actor.org.id};
 }catch(_error){
  return {ok:false,message:'Command could not be validated safely.'};
 }
}

// Pure business validation: performs a dry run on an isolated snapshot only.
export function validateCommand(snapshot,actorId,command){
  const check=preview(snapshot,actorId,command);
  return {ok:check.ok,message:check.message};
}

// Pure business command: never changes snapshot, even if the command fails.
export function applyCommand(snapshot,actorId,command){
 const check=preview(snapshot,actorId,command);
 if(!check.ok)return reject(check.message,snapshot);
 try{
  const state=copy(snapshot);
  const org=state.world.organisations[check.orgId];
  const before=org.cash,decisions=org.decisions;
  const seed=check.orgId===state.activeOrganisationId?state.seed:org.simulationSeed;
  const outcome=actAs(state,check.orgId,()=>perform(state,check.command.type,check.command.payload));
  if(!outcome.ok||!validateSave(state))return reject(outcome.message||'Command failed.',snapshot);
  const event={
   kind:'command.applied',organisationId:check.orgId,controllerId:actorId,
   year:state.year,week:state.week,action:check.command.type,payload:check.command.payload,
   cashChange:org.cash-before,decisionsUsed:decisions-org.decisions,
   seedBefore:seed,seedAfter:check.orgId===state.activeOrganisationId?state.seed:org.simulationSeed
  };
  return {ok:true,message:outcome.message,state,events:[event]};
 }catch(_error){
  return reject('Command failed without changing the save.',snapshot);
 }
}

function cpuPlan(state,orgId){
 const org=state.world.organisations[orgId],control=state.world.controllers[org.controllerId];
 const strategy=control.strategy||'balanced',calendar=state.world.calendar;
 const plans=[];
 const tactic={competitive:'Aggressive',creator:'Balanced',commercial:'Defensive',balanced:'Balanced'}[strategy];
 const training={competitive:'Aim',creator:'Rest',commercial:'Strategy',balanced:'Teamwork'}[strategy];
 plans.push({type:'tactic',payload:{value:tactic}});
 plans.push({type:'training',payload:{value:training}});
 plans.push({type:'content',payload:{value:strategy==='creator'?'Creator challenge':strategy==='commercial'?'Player interview':'Behind the scenes'}});
 for(const talentId of org.creatorIds){
  const c=state.world.talents[talentId];
  plans.push({type:'schedule',payload:{id:c.id,value:c.energy<40?'Rest week':strategy==='creator'?'Creator collaboration':'Ranked livestream'}});
 }
 // All spending uses the same CEO-decision budget and salary/inventory costs
 // as the human. No invisible money or free resources are injected.
 if(org.products.some(p=>p.stock<22&&p.producing===0)&&org.cash>750000&&org.decisions>0){
  const p=org.products.find(p=>p.stock<22&&p.producing===0);
  plans.push({type:'reorder',payload:{id:p.id}});
 }
 if(org.sponsors.length===0&&org.sponsorOffers.length&&org.cash>400000&&org.decisions>0){
  plans.push({type:'pitch',payload:{id:org.sponsorOffers[0].id}});
 }
 if(strategy==='competitive'&&calendar.week%7===0&&org.decisions>1&&org.prospectIds.length){
  const targetId=org.prospectIds[0],candidate=state.world.talents[targetId];
  const current=org.playerIds.map(x=>state.world.talents[x]).sort((a,b)=>a.skill-b.skill)[0];
  if(candidate.skill>current.skill&&org.cash>candidate.wage*8){
   plans.push({type:'signPlayer',payload:{id:candidate.id,replace:current.id}});
  }
 }
 if(strategy==='commercial'&&calendar.week%6===0&&org.staff.length<3&&org.cash>1600000){
  plans.push({type:'hire',payload:{value:'Commercial Manager'}});
 }
 return plans;
}

// One shared calendar advance and one report per organisation. The founder is
// processed first, preserving its seeded match and economic path. CPU decisions
// and simulations use independent deterministic seeds, then return to the same
// saved human view. Coherent shared fixtures arrive in B1.5; this block gives
// all eight entrants real payroll, contracts, fans and company decisions.
export function simulateWeek(snapshot,actorId){
 const controller=resolveActor(snapshot,actorId);
 if(controller.error)return reject(controller.error,snapshot);
 if(controller.controller.type!=='human')return reject('Only the human manager may advance the offline world week.',snapshot);
 try{
  let state=copy(snapshot);
  const year=state.year,week=state.week,events=[];
  const humanOrgId=state.activeOrganisationId;
  const beforeHuman=state.world.organisations[humanOrgId];
  const cash=beforeHuman.cash,fans=beforeHuman.fans,seedBefore=state.seed;
  const report=simulateOrganisationWeek(state,humanOrgId);
  events.push({
   kind:'week.simulated',organisationId:humanOrgId,year,week,
   seedBefore,seedAfter:state.seed,cashChange:state.cash-cash,fanChange:state.fans-fans
  });
  events.push({kind:'finance.settled',organisationId:humanOrgId,year,week,
   revenue:report.revenue,expenses:report.expenses,net:report.net});
  if(report.match)events.push({kind:'match.resolved',organisationId:humanOrgId,year,week,
   opponent:report.match.opponent,score:report.match.score,won:report.match.won,
   prize:report.match.prize});
  const cpuReports=[];
  const controllers=Object.values(state.world.controllers).filter(x=>x.type==='cpu');
  for(const cpu of controllers){
   // The plan is regenerated from CURRENT state, so prior commands can spend
   // money, deplete CEO decisions or alter staff/talent availability.
   const commands=cpuPlan(state,cpu.organisationId);
   for(const command of commands){
    const outcome=applyCommand(state,cpu.id,command);
    if(outcome.ok){state=outcome.state;events.push(...outcome.events);}
   }
   const org=state.world.organisations[cpu.organisationId];
   const before=org.cash,oldSeed=org.simulationSeed;
   const cpuReport=simulateOrganisationWeek(state,cpu.organisationId);
   cpuReports.push({organisationId:cpu.organisationId,report:cpuReport});
   events.push({kind:'week.simulated',organisationId:cpu.organisationId,year,week,
    seedBefore:oldSeed,seedAfter:org.simulationSeed,cashChange:org.cash-before,
    fanChange:cpuReport.fanGain});
   events.push({kind:'finance.settled',organisationId:cpu.organisationId,year,week,
    revenue:cpuReport.revenue,expenses:cpuReport.expenses,net:cpuReport.net});
   if(cpuReport.match)events.push({kind:'match.resolved',organisationId:cpu.organisationId,
    year,week,opponent:cpuReport.match.opponent,score:cpuReport.match.score,
    won:cpuReport.match.won,prize:cpuReport.match.prize});
  }
  finishWorldWeek(state);
  if(!validateSave(state))return reject('Weekly simulation produced an invalid world state.',snapshot);
  return {ok:true,message:'Week '+week+' completed.',state,report,cpuReports,events};
 }catch(_error){
  return reject('Weekly simulation failed without changing the save.',snapshot);
 }
}
