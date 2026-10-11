(()=>{
'use strict';
/* Job 12A: pure crafting mini-game rules. No inventory/XP mutation here. */
const STAGES=Object.freeze([
  Object.freeze({key:'heat',label:'HEAT THE BILLET',action:'SET THE HEAT',instruction:'Stop the furnace gauge inside the amber heat window.',target:38,period:1550,icon:'♨'}),
  Object.freeze({key:'strike',label:'SHAPE THE METAL',action:'STRIKE THE ANVIL',instruction:'Time the hammer blow while the steel is centred.',target:61,period:1275,icon:'⚒'}),
  Object.freeze({key:'temper',label:'TEMPER THE BLADE',action:'QUENCH THE STEEL',instruction:'Catch the cooling point before the metal loses its edge.',target:47,period:1740,icon:'◈'})
]);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
// Cooling applies only to focused crafting; a cold furnace stops workshop progress.
const HEAT_THRESHOLD=25,COOLING_PER_SECOND=1.9;
function needsReheat(heatPct){return Number(heatPct)<=HEAT_THRESHOLD}
function advance(heatPct,elapsedMs){
 const heat=Math.max(HEAT_THRESHOLD,Math.min(100,Number.isFinite(Number(heatPct))?Number(heatPct):100));
 const elapsed=Math.max(0,Math.min(60000,Number(elapsedMs)||0));
 const activeMs=Math.min(elapsed,Math.max(0,(heat-HEAT_THRESHOLD)*1000/COOLING_PER_SECOND));
 const next=Math.max(HEAT_THRESHOLD,heat-activeMs*COOLING_PER_SECOND/1000);
 return {heatPct:next,activeMs,needsReheat:needsReheat(next)};
}
function reheat(position,skillLevel=1){
 const action=record(create(),position,skillLevel);
 return action?{...action.results[0],heatPct:100}:null;
}
function create(){return {version:1,stage:0,results:[]}}
function isComplete(forge){return forge?.version===1&&forge.stage===3&&Array.isArray(forge.results)&&forge.results.length===3}
function record(forge,position,skillLevel=1){
 if(!forge||forge.version!==1||!Array.isArray(forge.results)||forge.stage!==forge.results.length||forge.stage<0||forge.stage>=STAGES.length)return null;
 if(!Number.isFinite(position))return null;
 const stage=STAGES[forge.stage],distance=Math.abs(clamp(position,0,100)-stage.target);
 const skillBonus=Math.min(4,Math.max(0,Math.floor((Number(skillLevel)||1)/25)));
 const points=clamp(Math.round(100-distance*2.35+skillBonus),35,100);
 const label=points>=90?'PERFECT':points>=65?'SOLID':'ROUGH';
 return {...forge,stage:forge.stage+1,results:[...forge.results,{key:stage.key,points,label}],version:1}
}
function quality(forge){
 if(!isComplete(forge))return null;
 return clamp(Math.round(forge.results.reduce((sum,x)=>sum+clamp(Number(x.points)||35,35,100),0)/3),35,100)
}
window.CellboundBlacksmithForge=Object.freeze({version:'12C.1',STAGES,HEAT_THRESHOLD,COOLING_PER_SECOND,needsReheat,advance,reheat,create,record,quality,isComplete});
})();