(()=>{
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const abilities={circle:'Ground burst',circles:'Spread circles',line:'Line attack',cone:'Frontal cone',interrupt:'Interruptible blast','self-heal':'Interruptible healing',knockback:'Knockback',pull:'Pull'};
const behaviours={bruiser:'Melee bruiser',artillery:'Ranged artillery',assassin:'Healer hunter',skirmisher:'Random skirmisher',support:'Ally support',coward:'Retreating enemy'};
const backgrounds=['assets/ashen-vault/rooms/broken-gate.webp','assets/ashen-vault/rooms/furnace.webp','assets/manor/manor-butler.webp'];
function fresh(){return{schema:1,name:'New boss',description:'',designation:'boss',level:1,health:1500,damageScale:1,defence:0,behaviour:'bruiser',targeting:'threat',location:'New dungeon',artPath:backgrounds[0],intervalMs:3000,abilities:[ability()],phases:[phase()]}}
function ability(){return{type:'circle',name:'Ground burst',duration:1800,cooldownMs:6000,belowPct:100,healPct:8,damage:20}}
function phase(){return{name:'Enraged',atPct:50,damageScale:1.25,allAttacksAoe:false,abilities:[{...ability(),type:'interrupt',name:'Dangerous cast'}]}}
function validate(x){
 const e=[];if(!x||x.schema!==1)return['Unsupported enemy configuration version.'];
 const text=(v,n,min,max)=>{if(typeof v!=='string'||v.trim().length<min||v.length>max)e.push(n+' needs '+min+'–'+max+' characters.')};
 const num=(v,n,min,max)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)e.push(n+' must be '+min+'–'+max+'.')};
 text(x.name,'Name',3,100);text(x.description,'Description',0,1500);text(x.location,'Location',0,120);
 if(!['boss','enemy'].includes(x.designation))e.push('Choose enemy or boss.');
 num(x.level,'Level',1,75);if(!Number.isInteger(x.level))e.push('Level must be a whole number.');
 num(x.health,'Health',30,50000);num(x.damageScale,'Damage multiplier',.25,3);num(x.defence,'Defence percentage',0,60);num(x.intervalMs,'Time between casts (ms)',1000,30000);
 if(!Object.hasOwn(behaviours,x.behaviour))e.push('Choose a supported AI pattern.');
 if(!['threat','random'].includes(x.targeting))e.push('Choose threat or random targeting.');
 if(typeof x.artPath!=='string'||x.artPath.length>255||!safeArt(x.artPath))e.push('Choose an existing background or upload artwork.');
 function check(list,label){
  if(!Array.isArray(list)||list.length>6){e.push(label+' supports at most six abilities.');return}
  list.forEach((a,i)=>{const n=label+' ability '+(i+1);if(!a||!Object.hasOwn(abilities,a.type)){e.push(n+': unsupported mechanic.');return}text(a.name,n+' name',3,80);num(a.duration,n+' warning (ms)',600,8000);num(a.cooldownMs,n+' cooldown (ms)',2000,60000);num(a.belowPct,n+' health condition',1,100);num(a.healPct,n+' heal percentage',1,35);num(a.damage,n+' movement damage',0,100)})
 }
 check(x.abilities,'Opening');
 if(!Array.isArray(x.phases)||x.phases.length>3)e.push('Use at most three phase changes.');
 else {let last=100,damage=1;x.phases.forEach((p,i)=>{if(!p){e.push('Invalid phase.');return}text(p.name,'Phase name',3,80);num(p.atPct,'Phase health',1,99);if(p.atPct>=last)e.push('Phase thresholds must decrease, for example 70%, then 40%.');last=p.atPct;num(p.damageScale,'Phase damage multiplier',1,3);if(p.damageScale<damage)e.push('Phase damage must stay the same or increase.');damage=p.damageScale;if(typeof p.allAttacksAoe!=='boolean')e.push('Invalid phase attack pattern.');check(p.abilities,'Phase '+(i+1))});}
 if(x.designation==='enemy'&&x.phases?.length)e.push('Phase changes require Boss designation.');
 return e
}
function safeArt(p){return typeof p==='string'&&p.length>0&&p.length<=255&&!p.includes('..')&&!/[<>"'\\?#:\s]/.test(p)&&/^(?:assets\/|[a-zA-Z0-9_-]+\/)[a-zA-Z0-9_./-]+\.(?:webp|png|jpe?g|avif)$/i.test(p)}
function clean(x){const errors=validate(x);if(errors.length)throw Error(errors.join(' '));return copy(x)}
function mechanic(a,id){return{id,name:a.name,type:a.type,duration:a.duration,cooldownMs:a.cooldownMs,belowPct:a.belowPct,healPct:a.healPct/100,damage:a.damage}}
function encounter(raw){const x=clean(raw);return{designerEnemy:true,kind:x.designation==='boss'?'boss':'trash',level:x.level,enemyHealth:x.health,scaling:{enemyDamage:x.damageScale},mechanicIntervalMs:x.intervalMs,fixedMechanicOrder:true,
 enemies:[{name:x.name,classification:x.designation==='boss'?'boss':'trash',level:x.level,absoluteHealth:true,maxHealth:x.health,designerDefence:x.defence,combatBehaviour:x.behaviour,targeting:x.targeting,attackRange:x.behaviour==='artillery'?28:5}],
 mechanics:x.abilities.map((a,i)=>mechanic(a,'opening-'+i)),phases:x.phases.map((p,i)=>({id:'designer-phase-'+i,name:p.name,atPct:p.atPct,damageScale:p.damageScale,allAttacksAoe:p.allAttacksAoe,addMechanics:p.abilities.map((a,j)=>mechanic(a,'phase-'+i+'-'+j))}))}}
function stage(raw,source={}){const x=clean(raw);return{type:'fight',title:x.name,text:x.description,artPath:x.artPath,enemies:x.name,enemyHealth:x.health,mechanic:'none',enemySpec:x,enemySource:{slug:String(source.slug||''),revision:Number(source.revision)||0},drops:[]}}
window.CellboundEnemyModel={fresh,ability,phase,validate,clean,encounter,stage,safeArt,abilities,behaviours,backgrounds};
})();
