(()=>{
'use strict';

const VERSION='1.0.0';
const TICK=100;
const MAX_COMBAT_MS=180000;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot((a?.x||0)-(b?.x||0),(a?.y||0)-(b?.y||0));
const pct=(v,max)=>max>0?clamp(v/max*100,0,100):0;

const CLASS_COLORS={
 'Death Knight':'#C41E3A','Demon Hunter':'#A330C9','Druid':'#FF7C0A','Evoker':'#33937F',
 'Hunter':'#AAD372','Mage':'#69CCF0','Warrior':'#C79C6E','Paladin':'#F58CBA',
 'Priest':'#FFFFFF','Rogue':'#FFF569'
};

const RESOURCE_DEFS={
 'Death Knight':{name:'Runic Power',max:100,start:20,regen:6},
 'Demon Hunter':{name:'Fury',max:100,start:30,regen:9},
 Druid:{name:'Mana',max:100,start:100,regen:7},
 Evoker:{name:'Essence',max:5,start:5,regen:.45},
 Hunter:{name:'Focus',max:100,start:80,regen:9},
 Mage:{name:'Mana',max:100,start:100,regen:5},
 Warrior:{name:'Rage',max:100,start:20,regen:7},
 Paladin:{name:'Mana',max:100,start:100,regen:6},
 Priest:{name:'Mana',max:100,start:100,regen:7},
 Rogue:{name:'Energy',max:100,start:100,regen:13}
};

const ABILITIES={
 'Death Knight':[
  {id:'death-strike',name:'Death Strike',kind:'damage',range:5,damage:24,cost:35,gcd:1500,cd:4500,selfHeal:10,threat:1.35},
  {id:'heart-strike',name:'Heart Strike',kind:'damage',range:5,damage:15,cost:20,gcd:1500,cd:0,threat:1.5},
  {id:'death-grip',name:'Death Grip',kind:'taunt',range:30,cost:0,gcd:0,cd:18000,threat:4}
 ],
 'Demon Hunter':[
  {id:'chaos-strike',name:'Chaos Strike',kind:'damage',range:5,damage:27,cost:30,gcd:1000,cd:0},
  {id:'demons-bite',name:"Demon's Bite",kind:'damage',range:5,damage:13,cost:0,gain:22,gcd:1000,cd:0},
  {id:'disrupt',name:'Disrupt',kind:'interrupt',range:10,cost:0,gcd:0,cd:15000}
 ],
 Druid:[
  {id:'wrath',name:'Wrath',kind:'damage',range:30,damage:14,cost:4,gcd:1500,cast:1200,cd:0},
  {id:'rejuvenation',name:'Rejuvenation',kind:'heal',range:30,heal:22,cost:10,gcd:1500,cast:0,cd:0,hot:8},
  {id:'regrowth',name:'Regrowth',kind:'heal',range:30,heal:34,cost:18,gcd:1500,cast:1100,cd:0},
  {id:'skull-bash',name:'Skull Bash',kind:'interrupt',range:13,cost:0,gcd:0,cd:15000}
 ],
 Evoker:[
  {id:'living-flame',name:'Living Flame',kind:'damage',range:25,damage:22,cost:1,gcd:1500,cast:1300,cd:0},
  {id:'azure-strike',name:'Azure Strike',kind:'damage',range:25,damage:12,cost:0,gcd:1500,cd:0},
  {id:'quell',name:'Quell',kind:'interrupt',range:25,cost:0,gcd:0,cd:40000}
 ],
 Hunter:[
  {id:'aimed-shot',name:'Aimed Shot',kind:'damage',range:35,damage:31,cost:35,gcd:1500,cast:1500,cd:7000},
  {id:'arcane-shot',name:'Arcane Shot',kind:'damage',range:35,damage:17,cost:20,gcd:1500,cd:0},
  {id:'steady-shot',name:'Steady Shot',kind:'damage',range:35,damage:11,cost:0,gain:18,gcd:1500,cast:900,cd:0},
  {id:'counter-shot',name:'Counter Shot',kind:'interrupt',range:35,cost:0,gcd:0,cd:24000}
 ],
 Mage:[
  {id:'pyroblast',name:'Pyroblast',kind:'damage',range:35,damage:36,cost:14,gcd:1500,cast:2200,cd:8000},
  {id:'fireball',name:'Fireball',kind:'damage',range:35,damage:24,cost:8,gcd:1500,cast:1700,cd:0},
  {id:'fire-blast',name:'Fire Blast',kind:'damage',range:35,damage:16,cost:4,gcd:0,cast:0,cd:9000},
  {id:'counterspell',name:'Counterspell',kind:'interrupt',range:35,cost:0,gcd:0,cd:24000}
 ],
 Warrior:[
  {id:'shield-slam',name:'Shield Slam',kind:'damage',role:'tank',range:5,damage:21,cost:20,gain:8,gcd:1500,cd:6000,threat:3},
  {id:'revenge',name:'Revenge',kind:'damage',role:'tank',range:5,damage:16,cost:15,gcd:1500,cd:3000,threat:2.5},
  {id:'mortal-strike',name:'Mortal Strike',kind:'damage',role:'dps',range:5,damage:29,cost:30,gcd:1500,cd:6000},
  {id:'slam',name:'Slam',kind:'damage',role:'dps',range:5,damage:18,cost:18,gcd:1500,cd:0},
  {id:'pummel',name:'Pummel',kind:'interrupt',range:5,cost:0,gcd:0,cd:15000},
  {id:'taunt',name:'Taunt',kind:'taunt',role:'tank',range:30,cost:0,gcd:0,cd:8000,threat:5}
 ],
 Paladin:[
  {id:'avengers-shield',name:"Avenger's Shield",kind:'damage',role:'tank',range:30,damage:20,cost:5,gcd:1500,cd:6000,threat:3,cleave:2},
  {id:'judgement',name:'Judgement',kind:'damage',range:30,damage:17,cost:4,gcd:1500,cd:3500,threat:1.7},
  {id:'holy-light',name:'Holy Light',kind:'heal',role:'healer',range:30,heal:37,cost:14,gcd:1500,cast:1500,cd:0},
  {id:'holy-shock',name:'Holy Shock',kind:'heal',role:'healer',range:30,heal:25,cost:9,gcd:1500,cast:0,cd:6000},
  {id:'rebuke',name:'Rebuke',kind:'interrupt',range:5,cost:0,gcd:0,cd:15000},
  {id:'hand-reckoning',name:'Hand of Reckoning',kind:'taunt',role:'tank',range:30,cost:0,gcd:0,cd:8000,threat:5}
 ],
 Priest:[
  {id:'heal',name:'Heal',kind:'heal',role:'healer',range:30,heal:35,cost:13,gcd:1500,cast:1400,cd:0},
  {id:'flash-heal',name:'Flash Heal',kind:'heal',role:'healer',range:30,heal:29,cost:18,gcd:1500,cast:800,cd:0},
  {id:'smite',name:'Smite',kind:'damage',range:30,damage:13,cost:4,gcd:1500,cast:1200,cd:0},
  {id:'silence',name:'Silence',kind:'interrupt',range:30,cost:0,gcd:0,cd:30000}
 ],
 Rogue:[
  {id:'mutilate',name:'Mutilate',kind:'damage',range:5,damage:18,cost:35,gcd:1000,cd:0},
  {id:'eviscerate',name:'Eviscerate',kind:'damage',range:5,damage:30,cost:50,gcd:1000,cd:5000},
  {id:'kick',name:'Kick',kind:'interrupt',range:5,cost:0,gcd:0,cd:15000}
 ]
};

const ROLE_FALLBACKS={
 tank:[
  {id:'guard-strike',name:'Guard Strike',kind:'damage',range:5,damage:18,cost:0,gcd:1500,cd:0,threat:2.6},
  {id:'provoke',name:'Provoke',kind:'taunt',range:30,cost:0,gcd:0,cd:8000,threat:5}
 ],
 healer:[
  {id:'restore',name:'Restore',kind:'heal',range:30,heal:31,cost:10,gcd:1500,cast:1000,cd:0},
  {id:'light-bolt',name:'Light Bolt',kind:'damage',range:30,damage:11,cost:3,gcd:1500,cast:900,cd:0}
 ],
 dps:[
  {id:'strike',name:'Strike',kind:'damage',range:5,damage:18,cost:0,gcd:1500,cd:0},
  {id:'interrupt',name:'Interrupt',kind:'interrupt',range:10,cost:0,gcd:0,cd:18000}
 ]
};

function hashSeed(input){
 let h=2166136261>>>0,s=String(input||'cellbound');
 for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
 return h>>>0;
}
function rngFrom(seed){
 let a=hashSeed(seed)||1;
 return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
}
function copy(v){return JSON.parse(JSON.stringify(v))}
function inferredRole(c){
 const r=window.CellboundIdentities?.role?.(c);
 if(r)return r;
 const s=String(c?.spec||'').toLowerCase();
 if(/protect|guardian|blood|vengeance/.test(s))return'tank';
 if(/holy|restoration|discipline|preservation/.test(s))return'healer';
 return'dps';
}
function resourceDef(c){
 return RESOURCE_DEFS[c?.class]||{name:'Power',max:100,start:100,regen:8};
}
function talentRanks(c){
 const tree=c?.talents?.[c?.spec]||{};
 return Object.values(tree).reduce((n,v)=>n+Math.max(0,Number(v)||0),0);
}
function classMobility(c){
 if(c.class==='Demon Hunter')return 1.35;
 if(c.class==='Hunter'||c.class==='Druid'||c.class==='Evoker')return 1.18;
 if(c.class==='Death Knight')return .86;
 return 1;
}
function abilityPool(c,role){
 const pool=(ABILITIES[c.class]||ROLE_FALLBACKS[role]||ROLE_FALLBACKS.dps).filter(a=>!a.role||a.role===role);
 return pool.length?pool:ROLE_FALLBACKS[role]||ROLE_FALLBACKS.dps;
}
function normalisePlayer(c,i){
 const role=inferredRole(c),res=resourceDef(c),tank=role==='tank',healer=role==='healer';
 const baseHp=tank?185:healer?115:125;
 const power=Math.max(1,Number(c?.power)||1);
 const level=Math.max(1,Number(c?.level)||1);
 const maxHealth=Math.round(baseHp+(power*1.8)+(level-1)*3),startPct=clamp(c?._combatHealthPct==null?100:Number(c._combatHealthPct),0,100),startHealth=Math.round(maxHealth*startPct/100);
 return{
  id:'p-'+c.id,characterId:c.id,name:c.name||('Adventurer '+(i+1)),class:c.class||'Unknown',spec:c.spec||'',role,
  maxHealth,health:startHealth,alive:startHealth>0,position:{x:tank?42:role==='healer'?18:28,y:26+i*12},facing:0,
  target:null,focus:null,gcdUntil:0,currentCast:null,movingUntil:0,moveToken:0,nextResourceState:0,cooldowns:{},statuses:{},resource:{name:res.name,max:res.max,value:res.start,regen:res.regen},
  abilities:copy(abilityPool(c,role)),power,level,talents:talentRanks(c),knowledge:copy(c.knowledge||{}),
  defensiveUntil:0,nextDecision:0,nextRegen:0,original:c
 };
}
function normaliseEnemies(encounter){
 const names=encounter.enemies||['Enemy'];
 const max=Number(encounter.enemyHealth)||((encounter.kind==='final')?680:(encounter.kind==='boss'?480:(encounter.kind==='event'?220:120)));
 return names.map((name,i)=>({
  id:'e-'+i,name,role:'enemy',kind:(names.length===1&&(encounter.kind==='boss'||encounter.kind==='final'))?'boss':'enemy',
  maxHealth:max,health:max,alive:true,position:{x:68,y:names.length===1?50:30+i*(40/Math.max(1,names.length-1))},facing:180,
  target:null,threat:{},forcedTarget:null,forcedUntil:0,cooldowns:{},statuses:{},movingUntil:0,moveToken:0,nextAttack:900+i*220,currentCast:null,
  isAdd:false,priority:i===0?2:1
 }));
}
function makeStats(players){
 return{
  startedAt:0,endedAt:0,
  players:Object.fromEntries(players.map(p=>[p.id,{id:p.id,name:p.name,class:p.class,role:p.role,damage:0,healing:0,overhealing:0,damageTaken:0,avoidableDamage:0,deaths:0,interruptAttempts:0,interrupts:0,duplicateInterrupts:0,threatLost:0,resourcesSpent:0,resourcesGained:0,abilityDamage:{},abilityHealing:{}}])),
  interrupts:{attempts:0,success:0,missedCritical:0,duplicates:0},mechanics:{avoided:0,failed:0,byType:{}},deaths:0
 };
}
function audioCue(type,result){
 if(type==='ABILITY_START')return'ability-cast';if(type==='DAMAGE_DEALT')return result==='critical'?'critical-hit':'impact';if(type==='HEAL_RECEIVED')return'heal';if(type==='INTERRUPT')return'interrupt';if(type==='CAST_START')return'boss-warning';if(type==='PLAYER_DEFEATED')return'death';if(type==='COMBAT_END')return result==='victory'?'victory':'defeat';return null
}
function emit(ctx,type,data={}){
 const payload=data.payload?copy(data.payload):{},cue=audioCue(type,data.result);if(cue&&!payload.audioCue)payload.audioCue=cue;
 const e={
  timestamp:Math.round(ctx.time),type,
  source:data.source||null,target:data.target||null,ability:data.ability||null,
  amount:data.amount==null?null:Math.round(data.amount*100)/100,
  position:data.position?copy(data.position):null,result:data.result||null,
  statusEffects:data.statusEffects?copy(data.statusEffects):null,
  payload
 };
 ctx.events.push(e);
 if(ctx.onEvent)ctx.onEvent(e);
 return e;
}
function schedule(ctx,at,fn,label){
 ctx.queue.push({at:Math.max(ctx.time,at),fn,label:label||''});
}
function processQueue(ctx){
 if(!ctx.queue.length)return;
 ctx.queue.sort((a,b)=>a.at-b.at);
 while(ctx.queue.length&&ctx.queue[0].at<=ctx.time){
  const item=ctx.queue.shift();
  item.fn();
 }
}
function removeStatus(ctx,target,id,reason='expired'){
 const current=target?.statuses?.[id];if(!current)return;
 delete target.statuses[id];
 emit(ctx,current.kind==='debuff'?'DEBUFF_REMOVED':'BUFF_REMOVED',{source:current.source||null,target:target.id,ability:current.name,result:reason,statusEffects:[copy(current)]})
}
function applyStatus(ctx,source,target,status={}){
 if(!target?.alive)return null;
 const id=status.id||String(status.name||'status').toLowerCase().replace(/[^a-z0-9]+/g,'-'),duration=Math.max(0,Number(status.duration)||0);
 const current=target.statuses[id],st={id,name:status.name||id,kind:status.kind==='debuff'?'debuff':'buff',source:source?.id||status.source||null,stacks:clamp((current?.stacks||0)+(Number(status.stacks)||1),1,99),duration,expiresAt:ctx.time+duration,effect:copy(status.effect||{}),cc:status.cc||null,breakOnDamage:!!status.breakOnDamage};
 target.statuses[id]=st;
 emit(ctx,st.kind==='debuff'?'DEBUFF_APPLIED':'BUFF_APPLIED',{source:st.source,target:target.id,ability:st.name,result:'applied',statusEffects:[copy(st)]});
 if(duration>0)schedule(ctx,ctx.time+duration,()=>removeStatus(ctx,target,id,'expired'),'status-expire');
 return st
}
function livingPlayers(ctx){return ctx.players.filter(x=>x.alive)}
function livingEnemies(ctx){return ctx.enemies.filter(x=>x.alive)}
function getUnit(ctx,id){return ctx.units[id]||null}
function inRange(a,b,r){return dist(a.position,b.position)<=r}
function updateFacing(a,b){if(!a||!b)return;a.facing=Math.atan2(b.position.y-a.position.y,b.position.x-a.position.x)}
function moveTo(ctx,u,pos,duration=420,reason='positioning'){
 if(!u?.alive)return false;
 const from=copy(u.position),to={x:clamp(Number(pos.x)||50,4,96),y:clamp(Number(pos.y)||50,5,95)},travel=Math.max(80,Number(duration)||420);
 if(dist(from,to)<.5)return true;
 if(u.currentCast){
  emit(ctx,'CAST_CANCELLED',{source:u.id,target:u.currentCast.target,ability:u.currentCast.ability,result:'movement',position:from});
  u.currentCast=null;
 }
 const token=++u.moveToken;u.movingUntil=ctx.time+travel;
 emit(ctx,'MOVEMENT_START',{source:u.id,target:u.target,position:from,result:reason,payload:{to,duration:travel}});
 schedule(ctx,ctx.time+travel,()=>{
  if(!u.alive||u.moveToken!==token)return;
  u.position=to;u.movingUntil=0;
  emit(ctx,'MOVEMENT_END',{source:u.id,target:u.target,position:copy(to),result:reason,payload:{from,duration:travel}})
 },'movement-end');
 return false
}
function nearestMeleePoint(enemy,u){
 const angle=Math.atan2(u.position.y-enemy.position.y,u.position.x-enemy.position.x);
 return{x:enemy.position.x+Math.cos(angle)*4,y:enemy.position.y+Math.sin(angle)*4}
}
function stableUnitIndex(ctx,u,list){
 const idx=list.findIndex(x=>x.id===u.id);return idx<0?0:idx
}
function isMeleeCombatant(u){
 return (u?.abilities||[]).some(a=>a.kind==='damage'&&(Number(a.range)||5)<=7)
}
function meleeFormationPoint(ctx,u,target){
 const radius=u.role==='tank'?4.15:4.4;
 if(u.role==='tank'){
   // Tank owns the front of the enemy. With enemies entering from the right side of the arena,
   // this places the tank on the party-facing side and keeps the boss facing away from melee DPS.
   return{x:target.position.x-radius,y:target.position.y}
 }
 const melee=ctx.players.filter(p=>p.alive&&p.role!=='tank'&&isMeleeCombatant(p));
 const slot=stableUnitIndex(ctx,u,melee);
 // Rear arc slots: centre-rear first, then alternate upper/lower flanks.
 const angles=[0,-1.38,1.38,-0.82,0.82,-1.12,1.12];
 const angle=angles[slot%angles.length];
 const ring=radius+(Math.floor(slot/angles.length)*1.15);
 return{x:target.position.x+Math.cos(angle)*ring,y:target.position.y+Math.sin(angle)*ring}
}
function rangedFormationPoint(ctx,u,target,range){
 const ranged=ctx.players.filter(p=>p.alive&&!isMeleeCombatant(p)&&p.role!=='tank');
 const slot=stableUnitIndex(ctx,u,ranged);
 const angles=[Math.PI,-2.55,2.55,-2.2,2.2];
 const angle=angles[slot%angles.length],desired=Math.max(10,Math.min((Number(range)||25)*.72,22));
 return{x:target.position.x+Math.cos(angle)*desired,y:target.position.y+Math.sin(angle)*desired}
}
function moveIntoRange(ctx,u,target,range){
 const r=Math.max(2,Number(range)||5);
 if(r<=7){
   const desired=meleeFormationPoint(ctx,u,target),slotDistance=dist(u.position,desired),combatRange=inRange(u,target,r);
   const tolerance=u.role==='tank'?1.75:2.25;
   if(combatRange&&slotDistance<=tolerance)return true;
   if(combatRange&&target.movingUntil>ctx.time&&slotDistance<=3.25)return true;
   moveTo(ctx,u,desired,520,u.role==='tank'?'tank positioning':'melee formation');
   return false
 }
 const desired=rangedFormationPoint(ctx,u,target,r);
 if(inRange(u,target,r)&&dist(u.position,desired)<=3.5)return true;
 if(inRange(u,target,r)&&target.movingUntil>ctx.time)return true;
 moveTo(ctx,u,desired,520,'move into range');
 return false
}
function cooldownReady(u,a){return (u.cooldowns[a.id]||0)<=0}
function spendResource(ctx,u,a){
 const cost=Math.max(0,Number(a.cost)||0);
 if(cost>u.resource.value+.0001)return false;
 if(cost){
  u.resource.value=clamp(u.resource.value-cost,0,u.resource.max);
  ctx.stats.players[u.id].resourcesSpent+=cost;
  emit(ctx,'RESOURCE_SPENT',{source:u.id,ability:a.name,amount:cost,result:u.resource.name,payload:{resource:u.resource.name,value:u.resource.value,max:u.resource.max}});
 }
 return true;
}
function gainResource(ctx,u,a){
 const gain=Math.max(0,Number(a.gain)||0);
 if(!gain)return;
 const before=u.resource.value;u.resource.value=clamp(before+gain,0,u.resource.max);
 const actual=u.resource.value-before;
 if(actual>0){
  ctx.stats.players[u.id].resourcesGained+=actual;
  emit(ctx,'RESOURCE_GAINED',{source:u.id,ability:a.name,amount:actual,result:u.resource.name,payload:{resource:u.resource.name,value:u.resource.value,max:u.resource.max}});
 }
}
function emitResourceState(ctx,u,result='state'){
 emit(ctx,'RESOURCE_STATE',{source:u.id,target:u.id,result,payload:{resource:u.resource.name,value:u.resource.value,max:u.resource.max}})
}
function passiveResources(ctx){
 ctx.players.forEach(u=>{
  if(!u.alive)return;
  const perTick=(u.resource.regen||0)*(TICK/1000);
  if(perTick<=0||u.resource.value>=u.resource.max)return;
  const before=u.resource.value;
  u.resource.value=clamp(before+perTick,0,u.resource.max);
  if(ctx.time>=u.nextResourceState||u.resource.value>=u.resource.max){
   u.nextResourceState=ctx.time+1200;
   emitResourceState(ctx,u,'regeneration')
  }
 });
}
function threatMultiplier(u,a){
 if(u.role==='tank')return Number(a.threat)||2.5;
 return 1;
}
function topThreatTarget(ctx,e){
 const live=livingPlayers(ctx);
 if(!live.length)return null;
 if(e.forcedTarget&&e.forcedUntil>ctx.time){
  const forced=getUnit(ctx,e.forcedTarget);if(forced?.alive)return forced;
 }
 let best=live[0],score=-Infinity;
 live.forEach(p=>{const v=Number(e.threat[p.id])||0;if(v>score){score=v;best=p}});
 return best;
}
function setAggro(ctx,e,target,reason='threat'){
 const prev=e.target;
 e.target=target?.id||null;
 if(prev!==e.target&&target){
  if(prev&&target.role!=='tank')ctx.stats.players[target.id].threatLost++;
  emit(ctx,'AGGRO_CHANGED',{source:e.id,target:target.id,result:reason,payload:{previous:prev,threat:copy(e.threat)}});
 }
}
function addThreat(ctx,e,u,amount,reason='damage'){
 if(!e?.alive||!u?.alive)return;
 e.threat[u.id]=(Number(e.threat[u.id])||0)+Math.max(0,amount);
 emit(ctx,'THREAT_GENERATED',{source:u.id,target:e.id,amount,result:reason,payload:{total:e.threat[u.id]}});
 setAggro(ctx,e,topThreatTarget(ctx,e),reason);
}
function executeTaunt(ctx,u,e,a){
 const top=Math.max(0,...Object.values(e.threat).map(Number));
 e.threat[u.id]=Math.max(Number(e.threat[u.id])||0,top+120);
 e.forcedTarget=u.id;e.forcedUntil=ctx.time+3000;
 u.cooldowns[a.id]=Number(a.cd)||8000;
 emit(ctx,'ABILITY_START',{source:u.id,target:e.id,ability:a.name,result:'taunt',position:copy(u.position)});
 addThreat(ctx,e,u,80,'taunt');
 setAggro(ctx,e,u,'taunt');
 emit(ctx,'ABILITY_FINISH',{source:u.id,target:e.id,ability:a.name,result:'taunt'});
}
function rollDamage(ctx,u,a,target){
 const talent=1+Math.min(.18,u.talents*.012);
 const power=1+Math.min(.35,u.power*.012);
 const variance=.9+ctx.rng()*.2;
 let amount=(Number(a.damage)||12)*talent*power*variance;
 if(ctx.rng()<.12){amount*=1.5;return{amount,crit:true}}
 return{amount,crit:false};
}
function mitigation(target,damageType='physical'){
 if(target.role==='tank')return damageType==='magic'?0.74:0.68;
 return target.defensiveUntil>0?0.75:1;
}
function dealDamage(ctx,source,target,amount,ability,opts={}){
 if(!source?.alive||!target?.alive)return 0;
 let final=Math.max(0,amount);
 if(target.role!=='enemy')final*=mitigation(target,opts.damageType||'physical');
 final=Math.max(1,Math.round(final));
 const before=target.health;target.health=clamp(target.health-final,0,target.maxHealth);
 const dealt=before-target.health;
 emit(ctx,'DAMAGE_DEALT',{source:source.id,target:target.id,ability,amount:dealt,result:opts.crit?'critical':'hit',position:copy(target.position),payload:{targetHp:target.health,targetMax:target.maxHealth,targetHpPct:pct(target.health,target.maxHealth),avoidable:!!opts.avoidable,damageType:opts.damageType||'physical'}});
 if(source.role!=='enemy'){
  const st=ctx.stats.players[source.id];st.damage+=dealt;st.abilityDamage[ability]=(st.abilityDamage[ability]||0)+dealt;
  addThreat(ctx,target,source,dealt*threatMultiplier(source,opts.ability||{}),'damage');
 }else{
  const st=ctx.stats.players[target.id];if(st){st.damageTaken+=dealt;if(opts.avoidable)st.avoidableDamage+=dealt}
 }
 if(target.health<=0)killUnit(ctx,target,source,ability);
 return dealt;
}
function doHeal(ctx,healer,target,amount,ability){
 if(!healer?.alive||!target?.alive)return 0;
 const before=target.health,max=target.maxHealth;
 const raw=Math.max(1,Math.round(amount));
 target.health=clamp(before+raw,0,max);
 const effective=target.health-before,over=Math.max(0,raw-effective);
 const st=ctx.stats.players[healer.id];st.healing+=effective;st.overhealing+=over;st.abilityHealing[ability]=(st.abilityHealing[ability]||0)+effective;
 emit(ctx,'HEAL_RECEIVED',{source:healer.id,target:target.id,ability,amount:effective,result:over?'overheal':'heal',position:copy(target.position),payload:{overhealing:over,targetHp:target.health,targetMax:max,targetHpPct:pct(target.health,max)}});
 livingEnemies(ctx).forEach(e=>addThreat(ctx,e,healer,effective*.5,'healing'));
 return effective;
}
function killUnit(ctx,target,source,ability){
 if(!target.alive)return;
 target.alive=false;target.health=0;target.currentCast=null;
 emit(ctx,target.role==='enemy'?(target.isAdd?'ADD_DEFEATED':'ENEMY_DEFEATED'):'PLAYER_DEFEATED',{source:source?.id||null,target:target.id,ability,result:'dead',position:copy(target.position)});
 if(target.role!=='enemy'){
  const st=ctx.stats.players[target.id];st.deaths++;ctx.stats.deaths++;
  ctx.enemies.forEach(e=>{if(e.target===target.id)setAggro(ctx,e,topThreatTarget(ctx,e),'target died')});
 }
}
function pickDamageTarget(ctx,u){
 const adds=livingEnemies(ctx).filter(e=>e.isAdd);
 if(adds.length&&ctx.tactics.addPriority!=='boss'){
  return adds.sort((a,b)=>(b.priority||0)-(a.priority||0)||a.health-b.health)[0];
 }
 return livingEnemies(ctx).sort((a,b)=>(b.priority||0)-(a.priority||0)||a.health-b.health)[0]||null;
}
function healerTarget(ctx){
 return livingPlayers(ctx).sort((a,b)=>a.health/a.maxHealth-b.health/b.maxHealth)[0]||null;
}
function chooseAbility(ctx,u,target){
 const now=ctx.time,pool=u.abilities.filter(a=>a.kind!=='interrupt'&&a.kind!=='taunt'&&cooldownReady(u,a)&&(a.cost||0)<=u.resource.value);
 if(u.role==='healer'){
  const low=healerTarget(ctx);
  if(low&&low.health/low.maxHealth<.86){
   const heals=pool.filter(a=>a.kind==='heal').sort((a,b)=>(b.heal||0)-(a.heal||0));
   if(heals.length)return{ability:(low.health/low.maxHealth<.45?heals[0]:heals[heals.length-1]),target:low};
  }
  const dmg=pool.find(a=>a.kind==='damage');return dmg?{ability:dmg,target}:null;
 }
 const dmg=pool.filter(a=>a.kind==='damage').sort((a,b)=>(b.damage||0)-(a.damage||0));
 if(!dmg.length)return null;
 const usable=dmg.find(a=>(a.cost||0)<=u.resource.value&&cooldownReady(u,a))||dmg[dmg.length-1];
 return{ability:usable,target};
}
function startAbility(ctx,u,a,target){
 if(!u.alive||!target?.alive||u.currentCast||ctx.time<u.movingUntil||ctx.time<u.gcdUntil||!cooldownReady(u,a))return false;
 if(!moveIntoRange(ctx,u,target,Number(a.range)||5))return false;
 if(!spendResource(ctx,u,a))return false;
 const cast=Math.max(0,Number(a.cast)||0),gcd=Math.max(0,Number(a.gcd)||0);
 u.gcdUntil=ctx.time+gcd;u.cooldowns[a.id]=Math.max(Number(a.cd)||0,gcd);
 u.target=target.id;updateFacing(u,target);
 emit(ctx,'ABILITY_START',{source:u.id,target:target.id,ability:a.name,result:cast?'casting':'instant',position:copy(u.position),payload:{castTime:cast,range:a.range,kind:a.kind}});
 if(cast){
  u.currentCast={ability:a.name,target:target.id,ends:ctx.time+cast};
  emit(ctx,'CAST_START',{source:u.id,target:target.id,ability:a.name,result:'player',payload:{duration:cast,interruptible:false}});
  schedule(ctx,ctx.time+cast,()=>finishAbility(ctx,u,a,target),'player-cast');
 }else finishAbility(ctx,u,a,target);
 return true;
}
function finishAbility(ctx,u,a,target){
 if(!u.alive||!target?.alive)return;
 if(u.currentCast&&u.currentCast.ability!==a.name)return;
 u.currentCast=null;
 emit(ctx,'ABILITY_FINISH',{source:u.id,target:target.id,ability:a.name,result:'resolved',position:copy(u.position)});
 if(a.kind==='heal'){
  const amount=(a.heal||24)*(1+Math.min(.28,u.power*.01))*(.92+ctx.rng()*.16);
  doHeal(ctx,u,target,amount,a.name);
  if(a.hot){
   applyStatus(ctx,u,target,{id:a.id+'-hot',name:a.name,kind:'buff',duration:3400,effect:{healingOverTime:a.hot}});
   [1600,3200].forEach(t=>schedule(ctx,ctx.time+t,()=>{if(u.alive&&target.alive)doHeal(ctx,u,target,a.hot,a.name+' (HoT)')},'hot'));
  }
 }else if(a.kind==='damage'){
  const rolled=rollDamage(ctx,u,a,target);
  const dealt=dealDamage(ctx,u,target,rolled.amount,a.name,{crit:rolled.crit,ability:a,damageType:u.class==='Mage'||u.class==='Evoker'?'magic':'physical'});
  gainResource(ctx,u,a);
  if(a.selfHeal&&u.alive)doHeal(ctx,u,u,a.selfHeal,a.name);
  if(a.cleave&&dealt>0){
   livingEnemies(ctx).filter(e=>e.id!==target.id).slice(0,a.cleave).forEach(e=>dealDamage(ctx,u,e,dealt*.42,a.name+' cleave',{ability:a,damageType:'magic'}));
  }
 }
}
function tickCooldowns(ctx){
 ctx.players.forEach(u=>{
  Object.keys(u.cooldowns).forEach(k=>u.cooldowns[k]=Math.max(0,u.cooldowns[k]-TICK));
  if(u.defensiveUntil>0)u.defensiveUntil=Math.max(0,u.defensiveUntil-TICK);
 });
 ctx.enemies.forEach(e=>Object.keys(e.cooldowns).forEach(k=>e.cooldowns[k]=Math.max(0,e.cooldowns[k]-TICK)));
}
function tankNeedsTaunt(ctx,tank){
 return livingEnemies(ctx).find(e=>{
  const t=topThreatTarget(ctx,e);return t&&t.id!==tank.id;
 });
}
function playerAI(ctx,u){
 if(!u.alive||u.currentCast||ctx.time<u.movingUntil||ctx.time<u.nextDecision||ctx.time<u.gcdUntil)return;
 u.nextDecision=ctx.time+160;
 const target=pickDamageTarget(ctx,u);
 if(!target)return;
 if(u.role==='tank'){
  const loose=tankNeedsTaunt(ctx,u);
  if(loose){
   const taunt=u.abilities.find(a=>a.kind==='taunt'&&cooldownReady(u,a));
   if(taunt&&inRange(u,loose,taunt.range||30)){executeTaunt(ctx,u,loose,taunt);return}
  }
  if(u.health/u.maxHealth<.48&&u.defensiveUntil<=0){
   u.defensiveUntil=5000;applyStatus(ctx,u,u,{id:'major-defensive',name:'Major Defensive',kind:'buff',duration:5000,effect:{damageReduction:.25}});
   emit(ctx,'DEFENSIVE_ACTIVATED',{source:u.id,target:u.id,ability:'Major Defensive',result:'active',payload:{duration:5000}});
  }
 }
 const pick=chooseAbility(ctx,u,target);
 if(pick)startAbility(ctx,u,pick.ability,pick.target);
}
function enemyBasicAttack(ctx,e){
 if(!e.alive||ctx.time<e.movingUntil)return;
 const target=topThreatTarget(ctx,e)||livingPlayers(ctx)[0];if(!target)return;
 setAggro(ctx,e,target,'threat');
 if(!inRange(e,target,5)){
  moveTo(ctx,e,nearestMeleePoint(target,e),320,'chase target');
  e.nextAttack=ctx.time+450;return;
 }
 updateFacing(e,target);
 const base=e.kind==='boss'?13:e.isAdd?7:6;
 emit(ctx,'ABILITY_START',{source:e.id,target:target.id,ability:e.kind==='boss'?'Heavy Swing':'Attack',result:'enemy'});
 dealDamage(ctx,e,target,base*(.85+ctx.rng()*.3),e.kind==='boss'?'Heavy Swing':'Attack',{damageType:'physical'});
 e.nextAttack=ctx.time+(e.kind==='boss'?1650:2050)+Math.round(ctx.rng()*320);
}
function reactionChance(ctx,u,type){
 const safety=ctx.tactics.movementDiscipline==='safety'?1.14:ctx.tactics.movementDiscipline==='damage'?0.86:1;
 const knowledge=Object.values(u.knowledge||{}).reduce((n,v)=>n+(Number(v)||0),0)/Math.max(1,Object.keys(u.knowledge||{}).length||1);
 let base=.84*classMobility(u.original||u)*safety+Math.min(.1,knowledge/1000);
 if(type==='cone'&&u.role==='tank')base=.97;
 return clamp(base,.48,.99);
}
function mechanicStat(ctx,type,failed){
 const m=ctx.stats.mechanics;m.byType[type]=m.byType[type]||{avoided:0,failed:0};
 if(failed){m.failed++;m.byType[type].failed++}else{m.avoided++;m.byType[type].avoided++}
}
function planMovement(ctx,u,type,anchor){
 if(!u.alive)return;
 let to=copy(u.position);
 if(type==='cone'){
  if(u.role==='tank')to={x:58,y:50};
  else to={x:34,y:20+(ctx.players.indexOf(u)%4)*18};
 }else if(type==='circle'||type==='circles'){
  const i=ctx.players.indexOf(u);to={x:18+(i%3)*18,y:18+Math.floor(i/3)*58};
 }else if(type==='line'){
  to={x:u.position.x,y:u.position.y+(u.position.y<50?-14:14)};
 }
 moveTo(ctx,u,to,320,'mechanic response');
}
function tryInterrupt(ctx,e,mechanic,castToken){
 const policy=ctx.tactics.interruptPriority;
 const candidates=livingPlayers(ctx).map(u=>({u,a:u.abilities.find(a=>a.kind==='interrupt'&&cooldownReady(u,a))})).filter(x=>x.a&&inRange(x.u,e,x.a.range||10));
 ctx.stats.interrupts.attempts++;
 if(!candidates.length){ctx.stats.interrupts.missedCritical++;return}
 const chosen=candidates.sort((a,b)=>(a.a.cd||0)-(b.a.cd||0))[0],u=chosen.u,a=chosen.a;
 const should=policy==='high'||policy==='standard'||(policy==='low'&&ctx.encounter.kind==='final');
 if(!should){ctx.stats.interrupts.missedCritical++;return}
 const reaction=policy==='high'?380:policy==='standard'?650:900;
 const when=ctx.time+reaction;
 schedule(ctx,when,()=>{
  const cast=ctx.activeEnemyCast;
  const st=ctx.stats.players[u.id];st.interruptAttempts++;
  if(!cast||cast.token!==castToken||cast.interrupted){st.duplicateInterrupts++;ctx.stats.interrupts.duplicates++;emit(ctx,'INTERRUPT',{source:u.id,target:e.id,ability:a.name,result:'duplicate',payload:{interruptedAbility:mechanic.name,token:castToken}});return}
  if(!u.alive||!inRange(u,e,a.range||10)||!cooldownReady(u,a)){ctx.stats.interrupts.missedCritical++;emit(ctx,'INTERRUPT',{source:u.id,target:e.id,ability:a.name,result:'failed',payload:{interruptedAbility:mechanic.name,token:castToken}});return}
  u.cooldowns[a.id]=a.cd||15000;cast.interrupted=true;ctx.activeEnemyCast=null;st.interrupts++;ctx.stats.interrupts.success++;
  emit(ctx,'INTERRUPT',{source:u.id,target:e.id,ability:a.name,result:'success',payload:{interruptedAbility:mechanic.name,token:castToken}});
 },'interrupt');
}
function spawnAdds(ctx,e){
 const base=ctx.enemies.length;
 for(let i=0;i<2;i++){
  const id='add-'+ctx.addSeq++,add={id,name:'Cave Spawn',role:'enemy',kind:'enemy',maxHealth:72,health:72,alive:true,position:{x:74,y:i?66:34},facing:180,target:null,threat:{},forcedTarget:null,forcedUntil:0,cooldowns:{},statuses:{},nextAttack:ctx.time+600+i*150,currentCast:null,isAdd:true,priority:3};
  add.movingUntil=0;add.moveToken=0;ctx.enemies.push(add);ctx.units[id]=add;ctx.players.forEach(p=>add.threat[p.id]=0);
  const random=livingPlayers(ctx)[Math.floor(ctx.rng()*livingPlayers(ctx).length)];if(random)add.threat[random.id]=120;
  setAggro(ctx,add,topThreatTarget(ctx,add),'spawn');
  emit(ctx,'ADD_SPAWNED',{source:e.id,target:add.id,ability:'Summon',result:'spawned',position:copy(add.position),payload:{name:add.name,maxHealth:add.maxHealth,target:add.target}});
 }
}
function resolveMechanic(ctx,e,m,token){
 const cast=ctx.activeEnemyCast;
 if(m.type==='interrupt'){
  if(!cast||cast.token!==token||cast.interrupted){scheduleNextMechanic(ctx);return}
  ctx.activeEnemyCast=null;
  emit(ctx,'CAST_FINISH',{source:e.id,ability:m.name,result:'completed'});
  livingPlayers(ctx).forEach(p=>dealDamage(ctx,e,p,16,m.name,{damageType:'magic',avoidable:false}));
  ctx.stats.interrupts.missedCritical++;
  mechanicStat(ctx,'interrupt',true);scheduleNextMechanic(ctx);return;
 }
 if(!cast||cast.token!==token){scheduleNextMechanic(ctx);return}
 ctx.activeEnemyCast=null;
 emit(ctx,'MECHANIC_RESOLVE',{source:e.id,ability:m.name,result:'resolve',payload:{mechanicType:m.type,token}});
 if(m.type==='adds'){spawnAdds(ctx,e);mechanicStat(ctx,'adds',false);scheduleNextMechanic(ctx);return}
 if(m.type==='cone'){
  const tank=livingPlayers(ctx).find(p=>p.role==='tank');if(tank){e.target=tank.id;updateFacing(e,tank)}
  let failed=false;
  livingPlayers(ctx).forEach(p=>{
   if(p.role==='tank'){dealDamage(ctx,e,p,18,m.name,{damageType:'physical',avoidable:false});return}
   const success=cast.responses?.[p.id]!==false;
   if(!success){failed=true;dealDamage(ctx,e,p,22,m.name,{damageType:'physical',avoidable:true})}
  });
  mechanicStat(ctx,'cone',failed);scheduleNextMechanic(ctx);return;
 }
 if(m.type==='circle'||m.type==='circles'){
  let failed=false;
  livingPlayers(ctx).forEach(p=>{
   const success=cast.responses?.[p.id]!==false;
   if(!success){failed=true;dealDamage(ctx,e,p,m.type==='circles'?18:20,m.name,{damageType:'magic',avoidable:true})}
  });
  mechanicStat(ctx,m.type,failed);scheduleNextMechanic(ctx);return;
 }
 if(m.type==='line'){
  const target=getUnit(ctx,cast.targetId);
  if(target?.alive){
   const success=cast.responses?.[target.id]!==false;
   if(!success)dealDamage(ctx,e,target,26,m.name,{damageType:'physical',avoidable:true});
   mechanicStat(ctx,'line',!success);
  }else mechanicStat(ctx,'line',false);
  scheduleNextMechanic(ctx);return;
 }
 mechanicStat(ctx,m.type||'unknown',false);scheduleNextMechanic(ctx);
}
function startMechanic(ctx,m){
 const enemy=livingEnemies(ctx).find(x=>x.kind==='boss')||livingEnemies(ctx)[0];if(!enemy)return;
 const token='m'+(++ctx.mechanicSeq),duration=Math.max(700,Number(m.duration)||1600);
 const castState={token,enemy:enemy.id,name:m.name,type:m.type,interrupted:false,ends:ctx.time+duration,responses:{},targetId:null,targetIds:[]};
 const live=livingPlayers(ctx);
 if(m.type==='cone'){
  const tank=live.find(p=>p.role==='tank')||live[0];castState.targetId=tank?.id||null;castState.targetIds=tank?[tank.id]:[];
  live.forEach(p=>{if(p.role==='tank')castState.responses[p.id]=true;else castState.responses[p.id]=ctx.rng()<reactionChance(ctx,p,'cone')});
 }else if(m.type==='circle'){
  castState.targetId=enemy.id;castState.targetIds=[enemy.id];
  live.forEach(p=>castState.responses[p.id]=ctx.rng()<reactionChance(ctx,p,'circle'));
 }else if(m.type==='circles'){
  castState.targetIds=live.map(p=>p.id);
  live.forEach(p=>castState.responses[p.id]=ctx.rng()<reactionChance(ctx,p,'circles'));
 }else if(m.type==='line'){
  const candidates=live.filter(p=>p.role!=='tank'),target=candidates[Math.floor(ctx.rng()*Math.max(1,candidates.length))]||live[0];
  castState.targetId=target?.id||null;castState.targetIds=target?[target.id]:[];
  if(target)castState.responses[target.id]=ctx.rng()<reactionChance(ctx,target,'line');
 }
 emit(ctx,'MECHANIC_TELEGRAPH',{source:enemy.id,target:castState.targetId,ability:m.name,result:'telegraph',position:copy(enemy.position),payload:{mechanicType:m.type,duration,token,interruptible:m.type==='interrupt',targetId:castState.targetId,targetIds:copy(castState.targetIds),responses:copy(castState.responses)}});
 emit(ctx,'CAST_START',{source:enemy.id,target:castState.targetId,ability:m.name,result:'enemy',payload:{duration,interruptible:m.type==='interrupt',mechanicType:m.type,token,targetId:castState.targetId,targetIds:copy(castState.targetIds)}});
 ctx.activeEnemyCast=castState;
 if(m.type==='interrupt')tryInterrupt(ctx,enemy,m,token);
 else if(m.type==='cone'){
  const tank=getUnit(ctx,castState.targetId);
  live.forEach(p=>{if(p.role==='tank'||castState.responses[p.id])planMovement(ctx,p,'cone',enemy)});
  if(tank){enemy.target=tank.id;updateFacing(enemy,tank)}
 }else if(m.type==='circle'||m.type==='circles'){
  live.forEach(p=>{if(castState.responses[p.id])planMovement(ctx,p,m.type,enemy)});
 }else if(m.type==='line'){
  const target=getUnit(ctx,castState.targetId);if(target&&castState.responses[target.id])planMovement(ctx,target,'line',enemy)
 }
 schedule(ctx,ctx.time+duration,()=>resolveMechanic(ctx,enemy,m,token),'mechanic-resolve');
}
function scheduleNextMechanic(ctx){
 if(ctx.finished)return;
 const list=ctx.encounter.mechanics||[];if(!list.length)return;
 const delay=ctx.encounter.kind==='final'?3600:ctx.encounter.kind==='boss'?4200:5000;
 const m=list[ctx.mechanicIndex++%list.length];
 schedule(ctx,ctx.time+delay,()=>startMechanic(ctx,m),'mechanic-start');
}
function normaliseMechanics(encounter){
 return (encounter.mechanics||[]).map(x=>Array.isArray(x)?{name:x[0],type:x[1],duration:x[2]}:{
  name:x.name||'Mechanic',type:x.type||'circle',duration:x.duration||x.cast||1600
 });
}
function buildSummary(ctx,outcome){
 const duration=Math.max(1,ctx.time/1000);
 const players=Object.values(ctx.stats.players).map(s=>({
  ...copy(s),dps:Math.round(s.damage/duration),hps:Math.round(s.healing/duration)
 }));
 return{
  outcome,durationMs:Math.round(ctx.time),durationSeconds:Math.round(duration*10)/10,
  deaths:ctx.stats.deaths,totalDamage:players.reduce((n,p)=>n+p.damage,0),
  totalHealing:players.reduce((n,p)=>n+p.healing,0),interrupts:copy(ctx.stats.interrupts),
  mechanics:copy(ctx.stats.mechanics),players
 };
}
function simulate(options={}){
 const encounter=copy(options.encounter||{});
 encounter.mechanics=normaliseMechanics(encounter);
 const seed=options.seed||[encounter.id||'encounter',Date.now(),(options.party||[]).map(x=>x.id).join('-')].join(':');
 const players=(options.party||[]).map(normalisePlayer),enemies=normaliseEnemies(encounter),units={};
 [...players,...enemies].forEach(u=>units[u.id]=u);enemies.forEach(e=>players.forEach(p=>e.threat[p.id]=0));
 const tactics={
  interruptPriority:options.tactics?.interruptPriority||options.tactics?.interrupts||'standard',
  addPriority:options.tactics?.addPriority||options.tactics?.adds||'balanced',
  defensiveUsage:options.tactics?.defensiveUsage||options.tactics?.defensives||'standard',
  pullStyle:options.tactics?.pullStyle||options.tactics?.aggression||'normal',
  movementDiscipline:options.tactics?.movementDiscipline||'balanced'
 };
 const ctx={time:0,rng:rngFrom(seed),seed,encounter,tactics,players,enemies,units,events:[],queue:[],stats:makeStats(players),mechanicIndex:0,mechanicSeq:0,addSeq:0,activeEnemyCast:null,finished:false,onEvent:options.onEvent||null};
 emit(ctx,'COMBAT_START',{result:'started',payload:{encounter:encounter.id||encounter.title||'Encounter',seed,tactics}});
 players.forEach(u=>emitResourceState(ctx,u,'initial'));
 const tank=players.find(p=>p.role==='tank')||players[0];
 if(tank)enemies.forEach(e=>{e.threat[tank.id]=180;setAggro(ctx,e,tank,'pull')});
 scheduleNextMechanic(ctx);

 let outcome='defeat';
 while(ctx.time<=MAX_COMBAT_MS){
  processQueue(ctx);
  if(!livingEnemies(ctx).length){outcome='victory';break}
  if(!livingPlayers(ctx).length){outcome='defeat';break}
  tickCooldowns(ctx);passiveResources(ctx);
  players.forEach(u=>playerAI(ctx,u));
  enemies.forEach(e=>{if(e.alive&&ctx.time>=e.nextAttack)enemyBasicAttack(ctx,e)});
  ctx.time+=TICK;
 }
 if(ctx.time>MAX_COMBAT_MS)emit(ctx,'ENRAGE',{result:'timeout'});
 ctx.finished=true;ctx.queue.length=0;
 emit(ctx,'COMBAT_END',{result:outcome,payload:{durationMs:ctx.time}});
 ctx.stats.endedAt=ctx.time;
 const summary=buildSummary(ctx,outcome);
 return{
  version:VERSION,seed,outcome,durationMs:ctx.time,events:ctx.events,summary,
  finalState:{players:copy(players),enemies:copy(enemies)},
  replay:{version:VERSION,seed,encounter:copy(encounter),events:copy(ctx.events),summary:copy(summary)}
 };
}

function replay(replayData,onEvent,opts={}){
 const data=replayData?.events?replayData:null;if(!data)return Promise.reject(new Error('Invalid replay data'));
 const speed=Math.max(.25,Number(opts.speed)||1),events=data.events;
 return new Promise(async resolve=>{
  let last=0;
  for(const e of events){
   const wait=Math.max(0,(e.timestamp-last)/speed);
   if(wait)await new Promise(r=>setTimeout(r,wait));
   onEvent?.(copy(e));last=e.timestamp;
  }
  resolve(copy(data.summary||{}));
 });
}
function debugSnapshot(result){
 if(!result)return null;
 return{
  version:result.version,seed:result.seed,outcome:result.outcome,durationMs:result.durationMs,
  finalPlayers:(result.finalState?.players||[]).map(p=>({id:p.id,name:p.name,target:p.target,hp:p.health,resource:p.resource,cooldowns:p.cooldowns,position:p.position,statuses:p.statuses,currentCast:p.currentCast})),
  finalEnemies:(result.finalState?.enemies||[]).map(e=>({id:e.id,name:e.name,target:e.target,hp:e.health,threat:e.threat,position:e.position,statuses:e.statuses,currentCast:e.currentCast})),
  events:result.events?.length||0,summary:copy(result.summary||{})
 };
}
function mockParty(){
 return[
  {id:'tank',name:'Tank',class:'Warrior',spec:'Protection',power:8,level:10},
  {id:'heal',name:'Healer',class:'Priest',spec:'Holy',power:8,level:10},
  {id:'d1',name:'Mage',class:'Mage',spec:'Arcane',power:8,level:10},
  {id:'d2',name:'Hunter',class:'Hunter',spec:'Marksman',power:8,level:10},
  {id:'d3',name:'Rogue',class:'Rogue',spec:'Assassination',power:8,level:10}
 ];
}
function runSelfTests(){
 const base={id:'test',title:'Test Enemy',kind:'boss',enemies:['Test Boss'],enemyHealth:420,mechanics:[]},party=mockParty();
 const tests=[];
 const test=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(error){tests.push({name,pass:false,error:String(error?.message||error)})}};
 let r=simulate({party,encounter:{...base,mechanics:[['Critical Cast','interrupt',2200]]},tactics:{interruptPriority:'high'},seed:'interrupt'});
 test('Interrupt',()=>r.events.some(e=>e.type==='INTERRUPT'&&e.result==='success'));
 r=simulate({party,encounter:base,seed:'aggro'});
 test('Tank Aggro',()=>!r.events.some(e=>e.type==='AGGRO_CHANGED'&&e.target==='p-d1'&&e.timestamp>5000));
 r=simulate({party,encounter:{...base,mechanics:[['Frontal','cone',1400]]},seed:'cone'});
 test('Frontal Cone',()=>r.events.some(e=>e.type==='MECHANIC_TELEGRAPH'&&e.payload.mechanicType==='cone'));
 r=simulate({party,encounter:{...base,mechanics:[['Adds','adds',900]]},seed:'adds'});
 test('Adds',()=>r.events.some(e=>e.type==='ADD_SPAWNED')&&r.events.some(e=>e.type==='ADD_DEFEATED'));
 r=simulate({party,encounter:{...base,mechanics:[['Ground AoE','circle',1500]]},tactics:{movementDiscipline:'safety'},seed:'ground'});
 test('Ground AoE',()=>r.events.some(e=>e.type==='MOVEMENT_START'&&e.result==='mechanic response'));
 const weak=mockParty().map(x=>({...x,power:1,level:1}));
 r=simulate({party:[{id:'solo',name:'Solo Mage',class:'Mage',spec:'Arcane',power:1,level:1}],encounter:{...base,kind:'final',enemyHealth:5000,mechanics:[['Pulse','circle',700]]},seed:'death'});
 test('Player Death',()=>{const death=r.events.find(e=>e.type==='PLAYER_DEFEATED');if(!death)return false;return !r.events.some(e=>e.type==='ABILITY_START'&&e.source===death.target&&e.timestamp>death.timestamp)});
 r=simulate({party,encounter:{...base,kind:'final',enemyHealth:1600},seed:'healer'});
 test('Healer Logic',()=>r.events.some(e=>e.type==='HEAL_RECEIVED'&&e.source==='p-heal'));
 const mageOnly=[{id:'m',name:'Mage',class:'Mage',spec:'Arcane',power:2,level:2}];
 r=simulate({party:mageOnly,encounter:{...base,enemyHealth:900},seed:'resource'});
 test('Resource Starvation',()=>r.events.some(e=>e.type==='RESOURCE_SPENT'));
 r=simulate({party,encounter:base,seed:'cooldown'});
 test('Cooldown',()=>{
  const starts=r.events.filter(e=>e.type==='ABILITY_START'&&e.ability==='Aimed Shot');return starts.every((e,i)=>i===0||e.timestamp-starts[i-1].timestamp>=6500);
 });
 r=simulate({party,encounter:base,seed:'replay'});
 test('Replay Foundation',()=>JSON.stringify(r.replay.events)===JSON.stringify(r.events));
 r=simulate({party:[
  {id:'mt',name:'Tank',class:'Warrior',spec:'Protection',power:8,level:10},
  {id:'m1',name:'Melee One',class:'Warrior',spec:'Arms',power:8,level:10},
  {id:'m2',name:'Melee Two',class:'Rogue',spec:'Assassination',power:8,level:10},
  {id:'m3',name:'Melee Three',class:'Demon Hunter',spec:'Havoc',power:8,level:10},
  {id:'mh',name:'Healer',class:'Priest',spec:'Holy',power:8,level:10}
 ],encounter:{...base,enemyHealth:900},seed:'melee-formation'});
 test('Melee Formation',()=>{
  const ends=r.events.filter(e=>e.type==='MOVEMENT_END'&&e.result==='melee formation').map(e=>e.position);
  const unique=new Set(ends.map(p=>p?Math.round(p.x*10)+'/'+Math.round(p.y*10):''));
  return unique.size>=3
 });
 test('Resource Bars',()=>r.events.filter(e=>e.type==='RESOURCE_STATE'&&e.result==='initial').length===5);
 r=simulate({party:[
  {id:'jt',name:'Tank',class:'Warrior',spec:'Protection',power:10,level:10},
  {id:'j1',name:'Melee One',class:'Warrior',spec:'Arms',power:10,level:10},
  {id:'j2',name:'Melee Two',class:'Rogue',spec:'Assassination',power:10,level:10},
  {id:'j3',name:'Melee Three',class:'Demon Hunter',spec:'Havoc',power:10,level:10},
  {id:'jh',name:'Healer',class:'Priest',spec:'Holy',power:10,level:10}
 ],encounter:{...base,enemyHealth:1200,mechanics:[]},seed:'movement-smoothing'});
 test('Movement Smoothing',()=>r.events.filter(e=>e.type==='MOVEMENT_START'&&String(e.source||'').startsWith('p-')).length<45);


 return{version:VERSION,passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}

window.CellboundCombatReborn={
 VERSION,CLASS_COLORS,RESOURCE_DEFS,ABILITIES,simulate,replay,debugSnapshot,
 tests:{run:runSelfTests},utils:{hashSeed,rngFrom}
};
})();