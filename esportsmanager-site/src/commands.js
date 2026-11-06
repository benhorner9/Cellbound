// B0.3 — Portable deterministic command boundary for the offline World v2.
// No DOM, browser storage, global RNG or dates. The same snapshot + command
// produces the same events, state and seeded match result on every device.
import {
  ACTIVITIES, TACTICS, perform, advanceWeek, validateSave, restoreSave
} from './engine.js?v=1.2.0';

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

// Player actions can currently target only the active human organisation.
// Once CPU organisations can be independently simulated (B0.4), this resolver
// will be extended to resolve that controller's organisation without reusing
// the active-human compatibility facade. Browser IDs are NOT server auth.
function authorise(state, controllerId){
  if(!validateSave(state) || state.version !== 2)return 'Load a valid World v2 game before managing it.';
  if(!textId(controllerId))return 'Missing organisation controller.';
  const organisation = state.world.organisations[state.activeOrganisationId];
  const controller = state.world.controllers[controllerId];
  if(!organisation || !controller || controller.organisationId !== organisation.id ||
    controller.id !== organisation.controllerId || controller.type !== 'human'){
    return 'This controller cannot manage the active organisation.';
  }
  return null;
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

function preview(snapshot, actorId, command){
  const error=authorise(snapshot,actorId);
  if(error)return {ok:false,message:error};
  const sanitised=normalise(command);
  if(sanitised.error)return {ok:false,message:sanitised.error};
  try{
    const draft=copy(snapshot);
    const outcome=perform(draft,sanitised.type,sanitised.payload);
    if(!outcome.ok)return {ok:false,message:outcome.message};
    if(!validateSave(draft))return {ok:false,message:'The command produced an invalid world state.'};
    return {ok:true,message:outcome.message,command:sanitised};
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
    const before=state.cash,decisions=state.decisions,seed=state.seed;
    const outcome=perform(state,check.command.type,check.command.payload);
    if(!outcome.ok||!validateSave(state))return reject(outcome.message||'Command failed.',snapshot);
    const event={
      kind:'command.applied',organisationId:state.activeOrganisationId,controllerId:actorId,
      year:state.year,week:state.week,action:check.command.type,
      payload:check.command.payload,cashChange:state.cash-before,
      decisionsUsed:decisions-state.decisions,seedBefore:seed,seedAfter:state.seed
    };
    return {ok:true,message:outcome.message,state,events:[event]};
  }catch(_error){
    return reject('Command failed without changing the save.',snapshot);
  }
}

// Pure weekly turn: uses the seed already in the saved World, never Math.random.
// Server-side scheduling, transactional payouts and exactly-once processing are
// deliberately reserved for B0.5 and B7.
export function simulateWeek(snapshot,actorId){
  const error=authorise(snapshot,actorId);
  if(error)return reject(error,snapshot);
  try{
    const state=copy(snapshot);
    const seedBefore=state.seed,year=state.year,week=state.week;
    const cash=state.cash,fans=state.fans;
    const report=advanceWeek(state);
    if(!validateSave(state))return reject('Weekly simulation produced an invalid world state.',snapshot);
    const common={organisationId:state.activeOrganisationId,year,week};
    const events=[
      {kind:'week.simulated',...common,seedBefore,seedAfter:state.seed,
       cashChange:state.cash-cash,fanChange:state.fans-fans},
      {kind:'finance.settled',...common,revenue:report.revenue,expenses:report.expenses,net:report.net}
    ];
    if(report.match)events.push({
      kind:'match.resolved',...common,opponent:report.match.opponent,
      score:report.match.score,won:report.match.won,prize:report.match.prize
    });
    return {ok:true,message:'Week '+week+' completed.',state,report,events};
  }catch(_error){
    return reject('Weekly simulation failed without changing the save.',snapshot);
  }
}
