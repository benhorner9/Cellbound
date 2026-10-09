(()=>{
'use strict';
// Cellbound PvP rules contract — no independent combat simulator.
// The authoritative Combat Reborn match coordinator owns execution and rewards.
const VERSION='1.0.0';
const FORMATS=Object.freeze({arena:Object.freeze([2,3,5]),battleground:Object.freeze([5,10,20])});
const TARGET=Object.freeze(['balanced','attack-healer','attack-tank','attack-dps','focus-flag-carrier','focus-low-health','protect-healer']);
const POSITION=Object.freeze(['balanced','spread','group-up','fall-back','push-forward','hold-position','regroup']);
const OBJECTIVE=Object.freeze({
 arena:Object.freeze(['pressure-healer','peel-healer','kite','push','regroup']),
 'capture-the-flag':Object.freeze(['take-flag','escort-carrier','defend-base','recover-flag','intercept-carrier','route-left','route-mid','route-right']),
 'king-of-the-hill':Object.freeze(['capture-hill','hold-hill','contest-hill','rotate-early','defend-approach','split-pressure'])
});
const MODES=Object.freeze(Object.keys(OBJECTIVE));
const LABELS=Object.freeze({
 'balanced':'Balanced','attack-healer':'Attack Healer','attack-tank':'Attack Tank','attack-dps':'Attack DPS','focus-flag-carrier':'Focus Flag Carrier',
 'focus-low-health':'Focus Low HP','protect-healer':'Protect Healer','spread':'Spread','group-up':'Group Up','fall-back':'Fall Back',
 'push-forward':'Push Forward','hold-position':'Hold Position','regroup':'Regroup','pressure-healer':'Pressure Healer','peel-healer':'Peel for Healer',
 'kite':'Kite','push':'Push','take-flag':'Take Flag','escort-carrier':'Escort Carrier','defend-base':'Defend Base',
 'recover-flag':'Recover Our Flag','intercept-carrier':'Intercept Carrier','route-left':'Route Left','route-mid':'Route Mid','route-right':'Route Right',
 'capture-hill':'Capture Active Hill','hold-hill':'Hold Hill','contest-hill':'Contest Hill','rotate-early':'Rotate Early',
 'defend-approach':'Defend Approach','split-pressure':'Split Pressure'
});
const TARGET_ROLES=Object.freeze({'attack-healer':'healer','attack-tank':'tank','attack-dps':'dps'});
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
function rulesFor(mode){
 if(!MODES.includes(mode))throw new Error('Unknown PvP mode');
 return{mode,target:[...TARGET],position:[...POSITION],objective:[...OBJECTIVE[mode]]}
}
function validateCommand(mode,order){
 if(!MODES.includes(mode))return{ok:false,reason:'unknown-mode'};
 if(!order||typeof order!=='object'||Array.isArray(order))return{ok:false,reason:'invalid-command'};
 const {category,value}=order;
 if(typeof category!=='string'||typeof value!=='string')return{ok:false,reason:'invalid-command'};
 const allowed=category==='target'?TARGET:category==='position'?POSITION:category==='objective'?OBJECTIVE[mode]:null;
 if(!allowed)return{ok:false,reason:'unknown-category'};
 if(!allowed.includes(value))return{ok:false,reason:'not-available-in-mode'};
 return{ok:true,mode,category,value,label:LABELS[value]||value}
}
function isEligibleEnemy(unit,source,canSee){
 if(!unit||unit.alive===false||unit.targetable===false||unit.visible===false||unit.stealthed===true)return false;
 if(source?.team&&unit.team&&source.team===unit.team)return false;
 return typeof canSee!=='function'||canSee(source,unit)===true
}
function selectTarget(order,source,units,canSee){
 const value=typeof order==='string'?order:order?.value;
 if(!TARGET.includes(value))return null;
 const valid=(Array.isArray(units)?units:[]).filter(u=>isEligibleEnemy(u,source,canSee));
 if(!valid.length)return null;
 const hp=u=>Number(u.maxHealth)>0?clamp(Number(u.health)/Number(u.maxHealth),0,1):1;
 const distance=u=>Math.hypot((Number(u.position?.x)||0)-(Number(source?.position?.x)||0),(Number(u.position?.y)||0)-(Number(source?.position?.y)||0));
 const ranked=valid.map(u=>{
  let score=100*(1-hp(u));
  if(u.role==='healer')score+=16;
  if(u.carryingFlag)score+=25;
  if(value==='focus-low-health')score+=110*(1-hp(u));
  if(value==='focus-flag-carrier'&&u.carryingFlag)score+=200;
  if(TARGET_ROLES[value]&&u.role===TARGET_ROLES[value])score+=200;
  if(value==='protect-healer'&&(u.threatensHealer||u.targetRole==='healer'))score+=190;
  return{unit:u,score,d:distance(u)}
 });
 ranked.sort((a,b)=>b.score-a.score||a.d-b.d||String(a.unit.id).localeCompare(String(b.unit.id)));
 return ranked[0]?.unit||null
}
function expectedScore(rating,opponent){
 if(!Number.isFinite(rating)||!Number.isFinite(opponent))throw new Error('Invalid PvP rating');
 return 1/(1+Math.pow(10,(opponent-rating)/400))
}
function ratingChange(rating,opponent,won,k=32){
 if(!Number.isFinite(rating)||rating<0||!Number.isFinite(opponent)||opponent<0||!Number.isFinite(k)||k<=0)throw new Error('Invalid ranked result');
 if(typeof won!=='boolean')throw new Error('Ranked result must be win or loss');
 const change=Math.round(k*((won?1:0)-expectedScore(rating,opponent)));
 return{before:Math.round(rating),opponent:Math.round(opponent),delta:change,after:Math.max(0,Math.round(rating)+change),expected:expectedScore(rating,opponent)}
}
function queueRange(seconds,{initial=75,increment=50,interval=15,cap=500}={}){
 if(!Number.isFinite(seconds)||seconds<0)throw new Error('Invalid queue duration');
 if(!(Number.isFinite(initial)&&initial>=0&&Number.isFinite(increment)&&increment>=0&&Number.isFinite(interval)&&interval>0&&Number.isFinite(cap)&&cap>=initial))throw new Error('Invalid matchmaking configuration');
 return Math.min(cap,initial+Math.floor(seconds/interval)*increment)
}
function mutuallyMatchable(a,b){
 if(!a||!b||a.accountId==null||b.accountId==null||String(a.accountId)===String(b.accountId))return false;
 if(a.mode!==b.mode||!MODES.includes(a.mode)||a.format!==b.format)return false;
 const validFormats=a.mode==='arena'?FORMATS.arena:FORMATS.battleground;
 if(!validFormats.includes(Number(a.format)))return false;
 const ar=Number(a.rating),br=Number(b.rating);
 if(!Number.isFinite(ar)||!Number.isFinite(br)||ar<0||br<0)return false;
 return Math.abs(ar-br)<=queueRange(Math.max(0,Number(a.queuedSeconds)||0))
  &&Math.abs(ar-br)<=queueRange(Math.max(0,Number(b.queuedSeconds)||0))
}
function arenaUnlock({battlegroundWins=0,gearScores=[],format=0,minWins=20,minScore=90}={}){
 const wins=Math.max(0,Math.floor(Number(battlegroundWins)||0));
 const size=Number(format);
 const valid=FORMATS.arena.includes(size)&&Array.isArray(gearScores)&&gearScores.length===size&&gearScores.every(s=>Number.isFinite(s)&&s>=0);
 const average=valid?gearScores.reduce((total,score)=>total+score,0)/size:0;
 return{unlocked:valid&&wins>=minWins&&average>=minScore,wins,requiredWins:minWins,averageScore:Math.round(average*10)/10,requiredScore:minScore,validSquad:valid}
}
window.CellboundPvPRuleset=Object.freeze({VERSION,FORMATS,MODES,TARGET,POSITION,OBJECTIVE,rulesFor,validateCommand,selectTarget,expectedScore,ratingChange,queueRange,mutuallyMatchable,arenaUnlock});
})();
