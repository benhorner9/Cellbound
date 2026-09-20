(()=>{
'use strict';

const VERSION='1.1.0';
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

const LEVEL_RULES={
 healthPerLevel:.03,
 outputPerLevel:.02,
 levelDeltaPerLevel:.045,
 minLevelDeltaMultiplier:.72,
 maxLevelDeltaMultiplier:1.32
};
const ENEMY_CLASS_RULES={
 trash:{label:'TRASH',health:1,damage:1},
 elite:{label:'ELITE',health:1.12,damage:1.08},
 boss:{label:'BOSS',health:1.22,damage:1.18},
 'world-boss':{label:'WORLD BOSS',health:1.75,damage:1.35},
 add:{label:'ADD',health:.78,damage:.84}
};
function levelHealthScale(level){return 1+Math.max(0,(Number(level)||1)-1)*LEVEL_RULES.healthPerLevel}
function levelOutputScale(level){return 1+Math.max(0,(Number(level)||1)-1)*LEVEL_RULES.outputPerLevel}
function levelMatchMultiplier(sourceLevel,targetLevel){
 const delta=(Number(sourceLevel)||1)-(Number(targetLevel)||1);
 return clamp(1+delta*LEVEL_RULES.levelDeltaPerLevel,LEVEL_RULES.minLevelDeltaMultiplier,LEVEL_RULES.maxLevelDeltaMultiplier)
}
function enemyClassRule(kind){return ENEMY_CLASS_RULES[kind]||ENEMY_CLASS_RULES.trash}
function hasAffix(ctx,id){return Array.isArray(ctx?.encounter?.affixes)&&ctx.encounter.affixes.includes(id)}
function scalingValue(ctx,key,fallback=1){const v=Number(ctx?.encounter?.scaling?.[key]);return Number.isFinite(v)&&v>0?v:fallback}
function enemyPressure(ctx,e,target){
 let mult=levelOutputScale(e.level||1)*levelMatchMultiplier(e.level||1,target?.level||1)*(Number(e.damageScale)||1);
 if(hasAffix(ctx,'blood-moon')&&healthRatio(e)<=.30)mult*=1.25;
 if(Number(e.relentlessUntil)>ctx.time)mult*=1.18;
 return mult
}


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
  {id:'wild-growth',name:'Wild Growth',kind:'group-heal',role:'healer',range:30,heal:15,cost:22,gcd:1500,cast:0,cd:8000},
  {id:'skull-bash',name:'Skull Bash',kind:'interrupt',range:13,cost:0,gcd:0,cd:15000}
 ],
 Evoker:[
  {id:'verdant-embrace',name:'Verdant Embrace',kind:'heal',role:'healer',range:25,heal:34,cost:1,gcd:1500,cast:900,cd:6000},
  {id:'emerald-blossom',name:'Emerald Blossom',kind:'group-heal',role:'healer',range:25,heal:17,cost:2,gcd:1500,cast:1200,cd:8000},
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
  {id:'light-of-dawn',name:'Light of Dawn',kind:'group-heal',role:'healer',range:30,heal:16,cost:18,gcd:1500,cast:0,cd:7000},
  {id:'rebuke',name:'Rebuke',kind:'interrupt',range:5,cost:0,gcd:0,cd:15000},
  {id:'hand-reckoning',name:'Hand of Reckoning',kind:'taunt',role:'tank',range:30,cost:0,gcd:0,cd:8000,threat:5}
 ],
 Priest:[
  {id:'heal',name:'Heal',kind:'heal',role:'healer',range:30,heal:35,cost:13,gcd:1500,cast:1400,cd:0},
  {id:'flash-heal',name:'Flash Heal',kind:'heal',role:'healer',range:30,heal:29,cost:18,gcd:1500,cast:800,cd:0},
  {id:'prayer-healing',name:'Prayer of Healing',kind:'group-heal',role:'healer',range:30,heal:18,cost:22,gcd:1500,cast:1700,cd:6500},
  {id:'soul-recall',name:'Soul Recall',kind:'battle-rez',role:'healer',range:30,cost:32,gcd:1500,cast:5000,cd:600000},
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
  {id:'renewing-wave',name:'Renewing Wave',kind:'group-heal',range:30,heal:14,cost:18,gcd:1500,cast:1200,cd:8000},
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
 const level=Math.max(1,Number(c?.level)||1),baseHealth=Math.round(baseHp+(power*1.8)),healthScale=levelHealthScale(level),outputScale=levelOutputScale(level);
 const maxHealth=Math.round(baseHealth*healthScale),startPct=clamp(c?._combatHealthPct==null?100:Number(c._combatHealthPct),0,100),startHealth=Math.round(maxHealth*startPct/100);
 const carried=c?._combatResource,carriedValue=typeof carried==='number'?carried:Number(carried?.value);
 const resourceValue=Number.isFinite(carriedValue)?clamp(carriedValue,0,res.max):res.start;
 const resourceRegen=healer&&res.name==='Mana'?2.1:res.regen;
 const itemLevel=Math.max(0,Number(c?._combatItemLevel??c?.itemLevel??c?.gear)||0),carriedCooldowns=copy(c?._combatCooldowns||{});
 return{
  id:'p-'+c.id,characterId:c.id,name:c.name||('Adventurer '+(i+1)),class:c.class||'Unknown',spec:c.spec||'',role,
  maxHealth,health:startHealth,alive:startHealth>0,position:{x:tank?42:role==='healer'?18:28,y:26+i*12},facing:0,
  target:null,focus:null,gcdUntil:0,currentCast:null,movingUntil:0,moveToken:0,nextResourceState:0,cooldowns:carriedCooldowns,statuses:{},resource:{name:res.name,max:res.max,value:resourceValue,regen:resourceRegen},
  abilities:copy(abilityPool(c,role)),power,level,itemLevel,baseStats:{baseHealth,healthScale,outputScale},talents:talentRanks(c),knowledge:copy(c.knowledge||{}),
  defensiveUntil:0,nextDecision:100+(i*200),nextRegen:0,mistakeLocks:{},pendingTaunt:null,revivePenaltyUntil:Number(c?._reviveSicknessMs)||0,original:c
 };
}
function normaliseEnemies(encounter){
 const raw=encounter.enemies||['Enemy'],baseLevel=Math.max(1,Number(encounter.level)||Number(encounter.recommendedLevel)||1);
 const baseHealth=Number(encounter.enemyHealth)||((encounter.kind==='final')?680:(encounter.kind==='boss'?480:(encounter.kind==='event'?220:120)));
 return raw.map((entry,i)=>{
  const data=typeof entry==='object'&&entry?entry:{name:entry},name=data.name||('Enemy '+(i+1));
  const level=Math.max(1,Number(data.level)||Number(encounter.enemyLevels?.[i])||baseLevel);
  const inferred=data.classification||encounter.enemyTypes?.[i]||data.kind||((raw.length===1&&(encounter.kind==='boss'||encounter.kind==='final'))?'boss':(encounter.kind==='event'?'elite':'trash'));
  const classification=String(inferred||'trash').toLowerCase(),rule=enemyClassRule(classification);
  const rawMax=Number(data.health)||baseHealth,healthMult=Math.max(.25,Number(encounter.scaling?.enemyHealth)||1),damageMult=Math.max(.25,Number(encounter.scaling?.enemyDamage)||1),maxHealth=Math.round(rawMax*levelHealthScale(level)*rule.health*healthMult);
  return{
   id:'e-'+i,name,role:'enemy',kind:classification==='boss'||classification==='world-boss'?'boss':'enemy',classification,classificationLabel:rule.label,level,
   maxHealth,health:maxHealth,alive:true,position:{x:68,y:raw.length===1?50:30+i*(40/Math.max(1,raw.length-1))},facing:180,
   target:null,threat:{},forcedTarget:null,forcedUntil:0,cooldowns:{},statuses:{},movingUntil:0,moveToken:0,nextAttack:900+i*220,currentCast:null,
   isAdd:false,priority:i===0?2:1,damageScale:rule.damage*damageMult
  }
 })
}
function makeStats(players){
 return{
  startedAt:0,endedAt:0,
  players:Object.fromEntries(players.map(p=>[p.id,{id:p.id,name:p.name,class:p.class,role:p.role,level:p.level,itemLevel:p.itemLevel,damage:0,healing:0,overhealing:0,damageTaken:0,avoidableDamage:0,deaths:0,mistakes:0,mistakesByType:{},battleResurrections:0,interruptAttempts:0,interrupts:0,duplicateInterrupts:0,threatLost:0,resourcesSpent:0,resourcesGained:0,abilityDamage:{},abilityHealing:{}}])),
  interrupts:{attempts:0,success:0,missedCritical:0,duplicates:0},mechanics:{avoided:0,failed:0,byType:{}},mistakes:{total:0,byType:{}},battleResurrections:0,deaths:0
 };
}
function audioCue(type,result){
 if(type==='ABILITY_START')return'ability-cast';if(type==='DAMAGE_DEALT')return result==='critical'?'critical-hit':'impact';if(type==='HEAL_RECEIVED'||type==='PLAYER_REVIVED')return'heal';if(type==='INTERRUPT')return'interrupt';if(type==='CAST_START')return'boss-warning';if(type==='PLAYER_DEFEATED')return'death';if(type==='PLAYER_MISTAKE')return'boss-warning';if(type==='COMBAT_END')return result==='victory'?'victory':'defeat';return null
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

function environmentBlockers(ctx){return Array.isArray(ctx?.environment?.blockers)?ctx.environment.blockers:[]}
function blockerBounds(b,pad=0){
 const w=Math.max(0,Number(b?.w)||0)/2+pad,h=Math.max(0,Number(b?.h)||0)/2+pad,x=Number(b?.x)||0,y=Number(b?.y)||0;
 return{left:x-w,right:x+w,top:y-h,bottom:y+h}
}
function pointInRect(p,r){return !!p&&p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom}
function segmentsCross(a,b,c,d){
 const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
 const on=(p,q,r)=>Math.min(p.x,r.x)-.0001<=q.x&&q.x<=Math.max(p.x,r.x)+.0001&&Math.min(p.y,r.y)-.0001<=q.y&&q.y<=Math.max(p.y,r.y)+.0001;
 const o1=cross(a,b,c),o2=cross(a,b,d),o3=cross(c,d,a),o4=cross(c,d,b);
 if(((o1>0&&o2<0)||(o1<0&&o2>0))&&((o3>0&&o4<0)||(o3<0&&o4>0)))return true;
 if(Math.abs(o1)<.0001&&on(a,c,b))return true;if(Math.abs(o2)<.0001&&on(a,d,b))return true;
 if(Math.abs(o3)<.0001&&on(c,a,d))return true;if(Math.abs(o4)<.0001&&on(c,b,d))return true;
 return false
}
function lineHitsRect(a,b,r){
 if(pointInRect(a,r)||pointInRect(b,r))return true;
 const tl={x:r.left,y:r.top},tr={x:r.right,y:r.top},br={x:r.right,y:r.bottom},bl={x:r.left,y:r.bottom};
 return segmentsCross(a,b,tl,tr)||segmentsCross(a,b,tr,br)||segmentsCross(a,b,br,bl)||segmentsCross(a,b,bl,tl)
}
function segmentBlocker(ctx,a,b,kind='movement',pad=0){
 return environmentBlockers(ctx).find(blocker=>{
   if(kind==='los'&&blocker.blocksLos===false)return false;
   if(kind==='movement'&&blocker.blocksMovement===false)return false;
   return lineHitsRect(a,b,blockerBounds(blocker,pad))
 })||null
}
function hasLineOfSight(ctx,a,b){
 const ap=a?.position||a,bp=b?.position||b;if(!ap||!bp)return false;
 return !segmentBlocker(ctx,ap,bp,'los',0)
}
function openPosition(ctx,pos,pad=1.35){
 let p={x:clamp(Number(pos?.x)||50,4,96),y:clamp(Number(pos?.y)||50,5,95)};
 for(const blocker of environmentBlockers(ctx)){
   if(blocker.blocksMovement===false)continue;
   const r=blockerBounds(blocker,pad);if(!pointInRect(p,r))continue;
   const options=[
    {x:r.left-.2,y:p.y},{x:r.right+.2,y:p.y},{x:p.x,y:r.top-.2},{x:p.x,y:r.bottom+.2}
   ].map(q=>({x:clamp(q.x,4,96),y:clamp(q.y,5,95)}));
   p=options.sort((a,b)=>dist(a,pos)-dist(b,pos))[0]
 }
 return p
}
function navigationWaypoint(ctx,from,destination){
 const dest=openPosition(ctx,destination,1.35),hit=segmentBlocker(ctx,from,dest,'movement',1.25);
 if(!hit)return{point:dest,pathing:false,final:dest};
 const r=blockerBounds(hit,2.2),corners=[
  {x:r.left,y:r.top},{x:r.left,y:r.bottom},{x:r.right,y:r.top},{x:r.right,y:r.bottom}
 ].map(p=>({x:clamp(p.x,4,96),y:clamp(p.y,5,95)}))
  .filter(p=>!environmentBlockers(ctx).some(b=>b.blocksMovement!==false&&pointInRect(p,blockerBounds(b,.7))))
  .filter(p=>!segmentBlocker(ctx,from,p,'movement',.65));
 if(!corners.length)return{point:dest,pathing:false,final:dest};
 const point=corners.sort((a,b)=>{
   const ap=dist(from,a)+dist(a,dest)+(segmentBlocker(ctx,a,dest,'movement',.65)?18:0);
   const bp=dist(from,b)+dist(b,dest)+(segmentBlocker(ctx,b,dest,'movement',.65)?18:0);
   return ap-bp
 })[0];
 return{point,pathing:true,final:dest,blocker:hit.id||'environment'}
}
function visibleCastPoint(ctx,u,target,range,preferred){
 const maxRange=Math.max(2,Number(range)||5),pref=openPosition(ctx,preferred||u.position,1.35);
 const valid=p=>dist(p,target.position)<=maxRange&&!segmentBlocker(ctx,p,target.position,'los',0)&&!environmentBlockers(ctx).some(b=>b.blocksMovement!==false&&pointInRect(p,blockerBounds(b,1.1)));
 if(valid(pref))return pref;
 const base=Math.atan2(u.position.y-target.position.y,u.position.x-target.position.x),radius=maxRange<=7?Math.min(4.35,maxRange-.35):Math.min(20,Math.max(8,maxRange*.68));
 const offsets=[0,.38,-.38,.76,-.76,1.15,-1.15,1.55,-1.55,2.1,-2.1,Math.PI];
 const candidates=offsets.map(off=>openPosition(ctx,{x:target.position.x+Math.cos(base+off)*radius,y:target.position.y+Math.sin(base+off)*radius},1.35)).filter(valid);
 return candidates.sort((a,b)=>dist(u.position,a)-dist(u.position,b))[0]||pref
}

function moveTo(ctx,u,pos,duration=420,reason='positioning'){
 if(!u?.alive)return false;
 const from=copy(u.position),route=navigationWaypoint(ctx,from,pos),to=route.point,travel=Math.max(80,Number(duration)||420);
 if(dist(from,to)<.5)return true;
 if(u.currentCast){
  emit(ctx,'CAST_CANCELLED',{source:u.id,target:u.currentCast.target,ability:u.currentCast.ability,result:'movement',position:from});
  u.currentCast=null;
 }
 const token=++u.moveToken;u.movingUntil=ctx.time+travel;
 emit(ctx,'MOVEMENT_START',{source:u.id,target:u.target,position:from,result:reason,payload:{to,duration:travel,navigation:route.pathing?'waypoint':'direct',finalTo:route.final,blocker:route.blocker||null}});
 schedule(ctx,ctx.time+travel,()=>{
  if(!u.alive||u.moveToken!==token)return;
  u.position=to;u.movingUntil=0;
  emit(ctx,'MOVEMENT_END',{source:u.id,target:u.target,position:copy(to),result:reason,payload:{from,duration:travel,navigation:route.pathing?'waypoint':'direct',finalTo:route.final,blocker:route.blocker||null}})
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
 const r=Math.max(2,Number(range)||5),los=hasLineOfSight(ctx,u,target);
 if(r<=7){
   const formation=meleeFormationPoint(ctx,u,target),desired=visibleCastPoint(ctx,u,target,r,formation),slotDistance=dist(u.position,desired),combatRange=inRange(u,target,r);
   const tolerance=u.role==='tank'?1.75:2.25;
   if(combatRange&&los&&slotDistance<=tolerance)return true;
   if(combatRange&&los&&target.movingUntil>ctx.time&&slotDistance<=3.25)return true;
   moveTo(ctx,u,desired,520,!los?'line of sight':u.role==='tank'?'tank positioning':'melee formation');
   return false
 }
 const formation=rangedFormationPoint(ctx,u,target,r),desired=visibleCastPoint(ctx,u,target,r,formation);
 if(inRange(u,target,r)&&los&&dist(u.position,desired)<=3.5)return true;
 if(inRange(u,target,r)&&los&&target.movingUntil>ctx.time)return true;
 moveTo(ctx,u,desired,520,!los?'line of sight':'move into range');
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

function deadPlayers(ctx){return ctx.players.filter(p=>!p.alive)}
function encounterKnowledge(ctx,u){
 const key=ctx.encounter.knowledgeKey;
 if(key&&u.knowledge&&u.knowledge[key]!=null)return clamp(Number(u.knowledge[key])||0,0,100);
 const vals=Object.values(u.knowledge||{}).map(Number).filter(Number.isFinite);
 return vals.length?clamp(vals.reduce((a,b)=>a+b,0)/vals.length,0,100):0
}
function combatPressure(ctx){
 const live=livingPlayers(ctx),dead=ctx.players.length-live.length;
 const missing=live.length?live.reduce((n,p)=>n+(1-healthRatio(p)),0)/live.length:1;
 const loose=livingEnemies(ctx).filter(e=>{const t=topThreatTarget(ctx,e);return t&&t.role!=='tank'}).length;
 const adds=livingEnemies(ctx).filter(e=>e.isAdd).length;
 const healer=live.find(p=>p.role==='healer');
 const manaPressure=healer&&healer.resource?.name==='Mana'?clamp((35-healer.resource.value)/35,0,1):0;
 return clamp(missing*.38+(dead/Math.max(1,ctx.players.length))*.52+Math.min(.22,loose*.11)+Math.min(.16,adds*.06)+(ctx.activeEnemyCast?.type?0.08:0)+manaPressure*.14,0,1)
}
function executionQuality(ctx,u){
 const knowledge=encounterKnowledge(ctx,u)/100;
 const levelDelta=(Number(u.level)||1)-(Number(ctx.encounter.level)||1);
 const levelReadiness=clamp(.82+levelDelta*.08,.42,1);
 const recIlvl=Math.max(0,Number(ctx.encounter.recommendedItemLevel)||0);
 const gearReadiness=recIlvl>0?clamp((Number(u.itemLevel)||0)/recIlvl,.45,1.08):1;
 const pressure=combatPressure(ctx);
 return clamp(.44+knowledge*.30+levelReadiness*.13+Math.min(1,gearReadiness)*.13-pressure*.24,.12,.985)
}
function mistakeChance(ctx,u,type='general'){
 const q=executionQuality(ctx,u),pressure=combatPressure(ctx);
 const weights={movement:1.05,interrupt:1.0,threat:.82,triage:.72,tank:.68,defensive:.66};
 return clamp((.018+Math.pow(1-q,2)*.5+pressure*.10)*(weights[type]||1),.01,.48)
}
function executionReaction(ctx,u,type='movement'){
 const q=executionQuality(ctx,u),pressure=combatPressure(ctx);
 const roleBias=u.role==='tank'&&type==='movement'?-90:u.class==='Demon Hunter'?-80:0;
 return Math.max(220,Math.round(260+(1-q)*760+pressure*280+ctx.rng()*180+roleBias))
}
function recordMistake(ctx,u,type,detail,payload={}){
 if(!u)return null;
 const st=ctx.stats.players[u.id];if(st){st.mistakes++;st.mistakesByType[type]=(st.mistakesByType[type]||0)+1}
 ctx.stats.mistakes.total++;ctx.stats.mistakes.byType[type]=(ctx.stats.mistakes.byType[type]||0)+1;
 const token='err-'+(++ctx.mistakeSeq);u.lastMistakeToken=token;u.lastMistakeUntil=ctx.time+3500;
 emit(ctx,'PLAYER_MISTAKE',{source:u.id,target:payload.target||null,ability:payload.ability||null,result:type,payload:{token,type,detail,quality:Math.round(executionQuality(ctx,u)*100),knowledge:Math.round(encounterKnowledge(ctx,u)),pressure:Math.round(combatPressure(ctx)*100),...payload}});
 return token
}
function recentMistakeToken(ctx,u){
 return u&&u.lastMistakeUntil>ctx.time?u.lastMistakeToken:null
}
function shouldMistake(ctx,u,type,lockMs=0){
 if(!u?.alive)return false;
 if(lockMs&&Number(u.mistakeLocks?.[type]||0)>ctx.time)return false;
 const yes=ctx.rng()<mistakeChance(ctx,u,type);
 if(yes&&lockMs){u.mistakeLocks=u.mistakeLocks||{};u.mistakeLocks[type]=ctx.time+lockMs}
 return yes
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
 const power=1+Math.min(.35,u.power*.012),levelScale=u.baseStats?.outputScale||levelOutputScale(u.level),match=levelMatchMultiplier(u.level,target?.level||1);
 const variance=.9+ctx.rng()*.2;
 const revivePenalty=u.revivePenaltyUntil>ctx.time?.85:1;
 let amount=(Number(a.damage)||12)*talent*power*levelScale*match*variance*revivePenalty;
 if(ctx.rng()<.12){amount*=1.5;return{amount,crit:true}}
 return{amount,crit:false};
}
function mitigation(target,damageType='physical'){
 let value=target.role==='tank'?(damageType==='magic'?0.74:0.68):1;
 if(target.defensiveUntil>0)value*=target.role==='tank'?0.7:0.75;
 return value;
}
function dealDamage(ctx,source,target,amount,ability,opts={}){
 if(!source?.alive||!target?.alive)return 0;
 let final=Math.max(0,amount);
 if(target.role!=='enemy')final*=mitigation(target,opts.damageType||'physical');
 final=Math.max(1,Math.round(final));
 const before=target.health;target.health=clamp(target.health-final,0,target.maxHealth);
 const dealt=before-target.health;
 emit(ctx,'DAMAGE_DEALT',{source:source.id,target:target.id,ability,amount:dealt,result:opts.crit?'critical':'hit',position:copy(target.position),payload:{targetHp:target.health,targetMax:target.maxHealth,targetHpPct:pct(target.health,target.maxHealth),avoidable:!!opts.avoidable,damageType:opts.damageType||'physical',mistakeToken:recentMistakeToken(ctx,target)}});
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
 if(over>0&&hasAffix(ctx,'overflow')&&healer.resource?.name==='Mana'){
  const pressure=Math.min(4,Math.max(1,Math.round(over/12)));
  healer.resource.value=clamp(healer.resource.value-pressure,0,healer.resource.max);
  target.defensiveUntil=Math.max(Number(target.defensiveUntil)||0,1200);
  emit(ctx,'AFFIX_TRIGGER',{source:healer.id,target:target.id,ability:'Overflow',amount:pressure,result:'overflow',payload:{affix:'overflow',overhealing:over,manaPressure:pressure}});
  emitResourceState(ctx,healer,'overflow-pressure')
 }

 emit(ctx,'HEAL_RECEIVED',{source:healer.id,target:target.id,ability,amount:effective,result:over?'overheal':'heal',position:copy(target.position),payload:{overhealing:over,targetHp:target.health,targetMax:max,targetHpPct:pct(target.health,max)}});
 livingEnemies(ctx).forEach(e=>addThreat(ctx,e,healer,effective*.5,'healing'));
 return effective;
}
function killUnit(ctx,target,source,ability){
 if(!target.alive)return;
 target.alive=false;target.health=0;target.currentCast=null;
 emit(ctx,target.role==='enemy'?(target.isAdd?'ADD_DEFEATED':'ENEMY_DEFEATED'):'PLAYER_DEFEATED',{source:source?.id||null,target:target.id,ability,result:'dead',position:copy(target.position)});
 if(target.role==='enemy')onEnemyDeathAffixes(ctx,target);
 if(target.role!=='enemy'){
  const st=ctx.stats.players[target.id];st.deaths++;ctx.stats.deaths++;
  ctx.enemies.forEach(e=>{e.threat[target.id]=0;if(e.target===target.id)setAggro(ctx,e,topThreatTarget(ctx,e),'target died')});
 }
}

function reviveUnit(ctx,healer,target,ability,{healthPct=35,resourcePct=20,combat=true}={}){
 if(!healer?.alive||!target||target.alive)return false;
 target.alive=true;target.health=Math.max(1,Math.round(target.maxHealth*healthPct/100));
 target.resource.value=clamp(target.resource.max*resourcePct/100,0,target.resource.max);
 target.currentCast=null;target.movingUntil=0;target.nextDecision=ctx.time+700;target.revivePenaltyUntil=ctx.time+(combat?30000:15000);
 const st=ctx.stats.players[healer.id];if(st)st.battleResurrections++;
 ctx.stats.battleResurrections++;
 emit(ctx,'PLAYER_REVIVED',{source:healer.id,target:target.id,ability,result:combat?'battle-rez':'revive',position:copy(target.position),payload:{targetHp:target.health,targetMax:target.maxHealth,targetHpPct:pct(target.health,target.maxHealth),resource:target.resource.name,resourceValue:target.resource.value,resourceMax:target.resource.max,penaltyMs:combat?30000:15000}});
 emitResourceState(ctx,target,'revived');
 return true
}


function onEnemyDeathAffixes(ctx,target){
 if(!target||target.role!=='enemy')return;
 if(hasAffix(ctx,'volatile-cells')&&target.classification==='elite'){
  const source={...target,alive:true};
  emit(ctx,'AFFIX_TRIGGER',{source:target.id,ability:'Volatile Cells',result:'armed',position:copy(target.position),payload:{affix:'volatile-cells',delay:850}});
  schedule(ctx,ctx.time+850,()=>{
   emit(ctx,'AFFIX_TRIGGER',{source:target.id,ability:'Volatile Cells',result:'explode',position:copy(target.position),payload:{affix:'volatile-cells'}});
   livingPlayers(ctx).forEach(p=>dealDamage(ctx,source,p,18*enemyPressure(ctx,target,p),'Volatile Cells',{damageType:'magic',avoidable:true}))
  },'affix-volatile')
 }
 if(hasAffix(ctx,'relentless')){
  livingEnemies(ctx).forEach(e=>{e.relentlessUntil=ctx.time+5000});
  if(livingEnemies(ctx).length)emit(ctx,'AFFIX_TRIGGER',{source:target.id,ability:'Relentless',result:'empower',payload:{affix:'relentless',duration:5000,targets:livingEnemies(ctx).map(e=>e.id)}})
 }
 if(hasAffix(ctx,'necromantic')&&!target.necromanticUsed&&!target.isAdd&&target.classification!=='boss'&&target.classification!=='world-boss'){
  target.necromanticUsed=true;ctx.pendingResurrections++;
  emit(ctx,'AFFIX_TRIGGER',{source:target.id,ability:'Necromantic',result:'returning',position:copy(target.position),payload:{affix:'necromantic',delay:2400}});
  schedule(ctx,ctx.time+2400,()=>{
   ctx.pendingResurrections=Math.max(0,ctx.pendingResurrections-1);
   if(ctx.finished)return;
   target.alive=true;target.health=Math.max(1,Math.round(target.maxHealth*.35));target.currentCast=null;target.nextAttack=ctx.time+700;
   emit(ctx,'ENEMY_REVIVED',{source:target.id,target:target.id,ability:'Necromantic',result:'revived',position:copy(target.position),payload:{affix:'necromantic',targetHp:target.health,targetMax:target.maxHealth,targetHpPct:pct(target.health,target.maxHealth)}})
  },'affix-necromantic')
 }
}
function scheduleUnstableGround(ctx){
 if(!hasAffix(ctx,'unstable-ground'))return;
 schedule(ctx,ctx.time+5200,()=>{
  if(ctx.finished)return;
  const live=livingPlayers(ctx),enemy=livingEnemies(ctx)[0];if(!live.length||!enemy)return;
  const target=live[Math.floor(ctx.rng()*live.length)],duration=1250,token='affix-ground-'+(++ctx.mechanicSeq);
  const plan=mechanicResponse(ctx,target,'circle',duration,enemy);
  emit(ctx,'AFFIX_TRIGGER',{source:enemy.id,target:target.id,ability:'Unstable Ground',result:'telegraph',position:copy(target.position),payload:{affix:'unstable-ground',token,duration}});
  emit(ctx,'MECHANIC_TELEGRAPH',{source:enemy.id,target:target.id,ability:'Unstable Ground',result:'telegraph',position:copy(target.position),payload:{mechanicType:'circle',duration,token,targetId:target.id,targetIds:[target.id],responses:{[target.id]:plan.success}}});
  schedule(ctx,ctx.time+duration,()=>{
   emit(ctx,'MECHANIC_RESOLVE',{source:enemy.id,target:target.id,ability:'Unstable Ground',result:'resolve',payload:{mechanicType:'circle',token}});
   if(target.alive&&!plan.success)dealDamage(ctx,enemy,target,24*enemyPressure(ctx,enemy,target),'Unstable Ground',{damageType:'magic',avoidable:true});
   scheduleUnstableGround(ctx)
  },'affix-ground-resolve')
 },'affix-ground-start')
}

function pickDamageTarget(ctx,u){
 const adds=livingEnemies(ctx).filter(e=>e.isAdd);
 if(adds.length&&ctx.tactics.addPriority!=='boss'){
  return adds.sort((a,b)=>(b.priority||0)-(a.priority||0)||a.health-b.health)[0];
 }
 return livingEnemies(ctx).sort((a,b)=>(b.priority||0)-(a.priority||0)||a.health-b.health)[0]||null;
}
function healthRatio(u){return u?.maxHealth>0?u.health/u.maxHealth:0}
function healerTarget(ctx){
 const alive=livingPlayers(ctx);
 return alive.sort((a,b)=>{
   const ar=healthRatio(a),br=healthRatio(b);
   const aw=ar-(a.role==='tank'?.035:0),bw=br-(b.role==='tank'?.035:0);
   return aw-bw
 })[0]||null
}
function chooseAbility(ctx,u,target){
 const pool=u.abilities.filter(a=>a.kind!=='interrupt'&&a.kind!=='taunt'&&cooldownReady(u,a)&&(a.cost||0)<=u.resource.value);
 if(u.role==='healer'){
  const alive=livingPlayers(ctx),tank=alive.find(p=>p.role==='tank'),low=healerTarget(ctx),dead=deadPlayers(ctx);
  const battleRez=pool.find(a=>a.kind==='battle-rez');
  if(battleRez&&dead.length){
   const reviveTarget=[...dead].sort((a,b)=>(a.role==='tank'?-3:a.role==='healer'?-2:0)-(b.role==='tank'?-3:b.role==='healer'?-2:0)||b.power-a.power)[0];
   const tankSafe=!tank||healthRatio(tank)>.58,pressure=combatPressure(ctx);
   const badDecision=pressure>.78&&shouldMistake(ctx,u,'triage',7000);
   if((tankSafe&&pressure<.86)||badDecision){
    if(badDecision)recordMistake(ctx,u,'triage','committed to a combat resurrection under heavy pressure',{target:reviveTarget.id,ability:battleRez.name});
    return{ability:battleRez,target:reviveTarget}
   }
  }
  const single=pool.filter(a=>a.kind==='heal').sort((a,b)=>(b.heal||0)-(a.heal||0));
  const group=pool.filter(a=>a.kind==='group-heal').sort((a,b)=>(b.heal||0)-(a.heal||0));
  const injured=alive.filter(p=>healthRatio(p)<.94),deep=alive.filter(p=>healthRatio(p)<.84);
  const avg=alive.reduce((n,p)=>n+healthRatio(p),0)/Math.max(1,alive.length);
  const tankRatio=tank?healthRatio(tank):1;

  // Group pressure takes priority when mechanics/adds have hurt several players.
  if(group.length&&(deep.length>=2||injured.length>=3||avg<.88)){
   return{ability:group[0],target:low||u}
  }

  // Dungeon healers proactively maintain the tank instead of waiting for a crisis.
  const needsTank=tank&&tankRatio<((ctx.encounter.kind==='boss'||ctx.encounter.kind==='final')?.97:.92);
  const needsSingle=low&&healthRatio(low)<.90;
  if(single.length&&(needsTank||needsSingle)){
   let healTarget=needsSingle&&low&&healthRatio(low)<tankRatio?low:(tank||low);
   let ratio=healthRatio(healTarget),chosen=ratio<.58?single[0]:single[single.length-1];
   if(injured.length>=2&&shouldMistake(ctx,u,'triage',6500)){
    const alternatives=alive.filter(p=>p.id!==healTarget?.id&&healthRatio(p)<.98).sort((a,b)=>healthRatio(b)-healthRatio(a));
    if(alternatives.length){healTarget=alternatives[0];ratio=healthRatio(healTarget);chosen=single[0]}
    recordMistake(ctx,u,'triage','prioritised the wrong heal target',{target:healTarget?.id||null,ability:chosen?.name||'Heal'});
   }
   return{ability:chosen,target:healTarget}
  }

  // Healer preserves mana and watches incoming damage during safe windows.
  // Damage contribution is intentionally not part of the default healer loop.
  return null
 }
 const dmg=pool.filter(a=>a.kind==='damage').sort((a,b)=>(b.damage||0)-(a.damage||0));
 if(!dmg.length)return null;
 const usable=dmg.find(a=>(a.cost||0)<=u.resource.value&&cooldownReady(u,a))||dmg[dmg.length-1];
 return{ability:usable,target};
}
function startAbility(ctx,u,a,target){
 const deadTarget=a?.kind==='battle-rez'&&target&&!target.alive;
 if(!u.alive||(!target?.alive&&!deadTarget)||u.currentCast||ctx.time<u.movingUntil||ctx.time<u.gcdUntil||!cooldownReady(u,a))return false;
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
 const deadTarget=a?.kind==='battle-rez'&&target&&!target.alive;
 if(!u.alive||(!target?.alive&&!deadTarget))return;
 if(u.currentCast&&u.currentCast.ability!==a.name)return;
 u.currentCast=null;
 if(!hasLineOfSight(ctx,u,target)){emit(ctx,'ABILITY_FINISH',{source:u.id,target:target.id,ability:a.name,result:'failed-line-of-sight',position:copy(u.position),payload:{kind:a.kind,castTime:Number(a.cast)||0}});return}
 emit(ctx,'ABILITY_FINISH',{source:u.id,target:target.id,ability:a.name,result:'resolved',position:copy(u.position),payload:{kind:a.kind,castTime:Number(a.cast)||0}});
 if(a.kind==='battle-rez'){
  reviveUnit(ctx,u,target,a.name,{healthPct:35,resourcePct:20,combat:true});
 }else if(a.kind==='heal'||a.kind==='group-heal'){
  const revivePenalty=u.revivePenaltyUntil>ctx.time?.85:1;
  const amount=(a.heal||24)*(1+Math.min(.28,u.power*.01))*(u.baseStats?.outputScale||levelOutputScale(u.level))*(.92+ctx.rng()*.16)*revivePenalty;
  if(a.kind==='group-heal')livingPlayers(ctx).filter(p=>hasLineOfSight(ctx,u,p)).forEach(p=>doHeal(ctx,u,p,amount,a.name));
  else doHeal(ctx,u,target,amount,a.name);
  if(a.hot){
   applyStatus(ctx,u,target,{id:a.id+'-hot',name:a.name,kind:'buff',duration:3400,effect:{healingOverTime:a.hot}});
   [1600,3200].forEach(t=>schedule(ctx,ctx.time+t,()=>{if(u.alive&&target.alive)doHeal(ctx,u,target,a.hot,a.name+' (HoT)')},'hot'));
  }
 }else if(a.kind==='damage'){
  const rolled=rollDamage(ctx,u,a,target);
  const dealt=dealDamage(ctx,u,target,rolled.amount,a.name,{crit:rolled.crit,ability:a,damageType:u.class==='Mage'||u.class==='Evoker'?'magic':'physical'});
  if(dealt>0&&target.alive&&u.role==='dps'&&shouldMistake(ctx,u,'threat',12000)){
   recordMistake(ctx,u,'threat','overcommitted before threat was secure',{target:target.id,ability:a.name});
   addThreat(ctx,target,u,dealt*(1.8+ctx.rng()*.8),'overcommit');
  }
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
   if(taunt&&inRange(u,loose,taunt.range||30)&&hasLineOfSight(ctx,u,loose)){
    if(!u.pendingTaunt||u.pendingTaunt.target!==loose.id){
     let reaction=executionReaction(ctx,u,'tank');
     if(shouldMistake(ctx,u,'tank',5500)){
      reaction+=Math.round(300+ctx.rng()*650);
      recordMistake(ctx,u,'tank','was late reacting to lost threat',{target:loose.id,ability:taunt.name,reactionMs:reaction});
     }
     u.pendingTaunt={target:loose.id,readyAt:ctx.time+reaction}
    }
    if(ctx.time>=u.pendingTaunt.readyAt){u.pendingTaunt=null;executeTaunt(ctx,u,loose,taunt);return}
   }
  }else u.pendingTaunt=null;

  const defensiveThreshold=ctx.tactics.defensiveUsage==='aggressive'?.62:ctx.tactics.defensiveUsage==='conservative'?.38:.50;
  if(u.health/u.maxHealth<defensiveThreshold&&u.defensiveUntil<=0){
   if(shouldMistake(ctx,u,'defensive',7000)){
    recordMistake(ctx,u,'defensive','held a defensive too long',{target:u.id,ability:'Major Defensive'});
    u.nextDecision=Math.max(u.nextDecision,ctx.time+650+Math.round(ctx.rng()*450));
   }else{
    u.defensiveUntil=5000;applyStatus(ctx,u,u,{id:'major-defensive',name:'Major Defensive',kind:'buff',duration:5000,effect:{damageReduction:.25}});
    emit(ctx,'DEFENSIVE_ACTIVATED',{source:u.id,target:u.id,ability:'Major Defensive',result:'active',payload:{duration:5000}});
   }
  }
 }
 const pick=chooseAbility(ctx,u,target);
 if(pick)startAbility(ctx,u,pick.ability,pick.target);
}
function enemyBasicAttack(ctx,e){
 if(!e.alive||ctx.time<e.movingUntil)return;
 const target=topThreatTarget(ctx,e)||livingPlayers(ctx)[0];if(!target)return;
 setAggro(ctx,e,target,'threat');
 if(!inRange(e,target,5)||!hasLineOfSight(ctx,e,target)){
  moveTo(ctx,e,nearestMeleePoint(target,e),320,!hasLineOfSight(ctx,e,target)?'line of sight':'chase target');
  e.nextAttack=ctx.time+450;return;
 }
 updateFacing(e,target);
 const base=e.kind==='boss'?30:e.isAdd?11:8;
 const levelPressure=enemyPressure(ctx,e,target);
 emit(ctx,'ABILITY_START',{source:e.id,target:target.id,ability:e.kind==='boss'?'Heavy Swing':'Attack',result:'enemy'});
 dealDamage(ctx,e,target,base*levelPressure*(.85+ctx.rng()*.3),e.kind==='boss'?'Heavy Swing':'Attack',{damageType:'physical'});
 e.nextAttack=ctx.time+(e.kind==='boss'?1400:e.isAdd?1800:2050)+Math.round(ctx.rng()*(e.kind==='boss'?220:320));
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
function mechanicResponse(ctx,u,type,duration,enemy){
 const baseReaction=executionReaction(ctx,u,'movement');
 const error=shouldMistake(ctx,u,'movement',2200);
 const hesitation=error?Math.round(260+ctx.rng()*520):0;
 const reaction=baseReaction+hesitation;
 const success=reaction+320<=Math.max(520,duration-40);
 if(error){
  recordMistake(ctx,u,'movement',reaction>duration?'reacted too late':'hesitated on the mechanic',{target:enemy?.id||null,ability:ctx.activeEnemyCast?.name||null,reactionMs:reaction});
 }else if(!success){
  recordMistake(ctx,u,'movement','reaction was too slow for the mechanic',{target:enemy?.id||null,ability:ctx.activeEnemyCast?.name||null,reactionMs:reaction});
 }
 // Even failed players try to move. If they are late, the impact can land while they are still escaping.
 schedule(ctx,ctx.time+reaction,()=>{if(u.alive)planMovement(ctx,u,type,enemy)},'mechanic-reaction');
 return{success,reactionMs:reaction}
}
function tryInterrupt(ctx,e,mechanic,castToken){
 const policy=ctx.tactics.interruptPriority;
 const candidates=livingPlayers(ctx).map(u=>({u,a:u.abilities.find(a=>a.kind==='interrupt'&&cooldownReady(u,a))}))
  .filter(x=>x.a&&inRange(x.u,e,x.a.range||10)&&hasLineOfSight(ctx,x.u,e));
 ctx.stats.interrupts.attempts++;
 if(!candidates.length){ctx.stats.interrupts.missedCritical++;return}
 candidates.sort((a,b)=>executionQuality(ctx,b.u)-executionQuality(ctx,a.u)||(a.a.cd||0)-(b.a.cd||0));
 const chosen=candidates[0],u=chosen.u,a=chosen.a;
 const should=policy==='high'||policy==='standard'||(policy==='low'&&ctx.encounter.kind==='final');
 if(!should){ctx.stats.interrupts.missedCritical++;return}
 let reaction=executionReaction(ctx,u,'interrupt')+(policy==='high'?-120:policy==='low'?180:0);
 const error=shouldMistake(ctx,u,'interrupt',5000);
 if(error){
  reaction+=Math.round(350+ctx.rng()*750);
  recordMistake(ctx,u,'interrupt','late interrupt reaction',{target:e.id,ability:mechanic.name,reactionMs:reaction});
 }
 const when=ctx.time+Math.max(180,reaction);
 schedule(ctx,when,()=>{
  const cast=ctx.activeEnemyCast;
  const st=ctx.stats.players[u.id];st.interruptAttempts++;
  if(!cast||cast.token!==castToken||cast.interrupted){st.duplicateInterrupts++;ctx.stats.interrupts.duplicates++;emit(ctx,'INTERRUPT',{source:u.id,target:e.id,ability:a.name,result:'duplicate',payload:{interruptedAbility:mechanic.name,token:castToken}});return}
  if(!u.alive||!inRange(u,e,a.range||10)||!hasLineOfSight(ctx,u,e)||!cooldownReady(u,a)||ctx.time>=cast.ends){
   ctx.stats.interrupts.missedCritical++;emit(ctx,'INTERRUPT',{source:u.id,target:e.id,ability:a.name,result:'failed',payload:{interruptedAbility:mechanic.name,token:castToken}});return
  }
  u.cooldowns[a.id]=a.cd||15000;cast.interrupted=true;ctx.activeEnemyCast=null;st.interrupts++;ctx.stats.interrupts.success++;
  emit(ctx,'INTERRUPT',{source:u.id,target:e.id,ability:a.name,result:'success',payload:{interruptedAbility:mechanic.name,token:castToken}});
 },'interrupt');
 // Low knowledge / pressure can make a second player burn their interrupt a fraction later.
 const backup=candidates[1];
 if(backup&&ctx.rng()<mistakeChance(ctx,backup.u,'interrupt')*.55){
  const delay=Math.max(220,reaction+120+Math.round(ctx.rng()*220));
  recordMistake(ctx,backup.u,'interrupt','committed to the same interrupt',{target:e.id,ability:mechanic.name,reactionMs:delay});
  schedule(ctx,ctx.time+delay,()=>{
   const bu=backup.u,ba=backup.a,cast=ctx.activeEnemyCast,st=ctx.stats.players[bu.id];st.interruptAttempts++;
   if(!bu.alive||!cooldownReady(bu,ba))return;
   bu.cooldowns[ba.id]=ba.cd||15000;
   if(!cast||cast.token!==castToken||cast.interrupted){
    st.duplicateInterrupts++;ctx.stats.interrupts.duplicates++;
    emit(ctx,'INTERRUPT',{source:bu.id,target:e.id,ability:ba.name,result:'duplicate',payload:{interruptedAbility:mechanic.name,token:castToken}})
   }
  },'duplicate-interrupt')
 }
}
function spawnAdds(ctx,e){
 const base=ctx.enemies.length;
 const count=2+Math.max(0,Math.min(2,Number(ctx.encounter.scaling?.addCountBonus)||0));
 for(let i=0;i<count;i++){
  const id='add-'+ctx.addSeq++,level=Math.max(1,Number(e.level)||Number(ctx.encounter.level)||1),rule=enemyClassRule('add'),maxHealth=Math.round(72*levelHealthScale(level)*rule.health*scalingValue(ctx,'enemyHealth',1)),add={id,name:'Cave Spawn',role:'enemy',kind:'enemy',classification:'add',classificationLabel:rule.label,level,maxHealth,health:maxHealth,alive:true,position:{x:74,y:i?66:34},facing:180,target:null,threat:{},forcedTarget:null,forcedUntil:0,cooldowns:{},statuses:{},nextAttack:ctx.time+600+i*150,currentCast:null,isAdd:true,priority:3,damageScale:rule.damage*scalingValue(ctx,'enemyDamage',1)};
  add.movingUntil=0;add.moveToken=0;ctx.enemies.push(add);ctx.units[id]=add;ctx.players.forEach(p=>add.threat[p.id]=0);
  const random=livingPlayers(ctx)[Math.floor(ctx.rng()*livingPlayers(ctx).length)];if(random)add.threat[random.id]=120;
  setAggro(ctx,add,topThreatTarget(ctx,add),'spawn');
  emit(ctx,'ADD_SPAWNED',{source:e.id,target:add.id,ability:'Summon',result:'spawned',position:copy(add.position),payload:{name:add.name,maxHealth:add.maxHealth,target:add.target,level:add.level,classification:add.classification,classificationLabel:add.classificationLabel}});
 }
}
function resolveMechanic(ctx,e,m,token){
 const cast=ctx.activeEnemyCast;
 if(m.type==='interrupt'){
  if(!cast||cast.token!==token||cast.interrupted){scheduleNextMechanic(ctx);return}
  ctx.activeEnemyCast=null;
  emit(ctx,'CAST_FINISH',{source:e.id,ability:m.name,result:'completed'});
  livingPlayers(ctx).forEach(p=>dealDamage(ctx,e,p,24*enemyPressure(ctx,e,p),m.name,{damageType:'magic',avoidable:false}));
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
   if(p.role==='tank'){dealDamage(ctx,e,p,34*enemyPressure(ctx,e,p),m.name,{damageType:'physical',avoidable:false});return}
   const success=cast.responses?.[p.id]!==false;
   if(!success){failed=true;dealDamage(ctx,e,p,28*enemyPressure(ctx,e,p),m.name,{damageType:'physical',avoidable:true})}
  });
  mechanicStat(ctx,'cone',failed);scheduleNextMechanic(ctx);return;
 }
 if(m.type==='circle'||m.type==='circles'){
  let failed=false;
  livingPlayers(ctx).forEach(p=>{
   const success=cast.responses?.[p.id]!==false;
   if(!success){failed=true;dealDamage(ctx,e,p,(m.type==='circles'?24:28)*enemyPressure(ctx,e,p),m.name,{damageType:'magic',avoidable:true})}
  });
  mechanicStat(ctx,m.type,failed);scheduleNextMechanic(ctx);return;
 }
 if(m.type==='line'){
  const target=getUnit(ctx,cast.targetId);
  if(target?.alive){
   const success=cast.responses?.[target.id]!==false;
   if(!success)dealDamage(ctx,e,target,32*enemyPressure(ctx,e,target),m.name,{damageType:'physical',avoidable:true});
   mechanicStat(ctx,'line',!success);
  }else mechanicStat(ctx,'line',false);
  scheduleNextMechanic(ctx);return;
 }
 mechanicStat(ctx,m.type||'unknown',false);scheduleNextMechanic(ctx);
}
function startMechanic(ctx,m){
 const enemy=livingEnemies(ctx).find(x=>x.kind==='boss')||livingEnemies(ctx)[0];if(!enemy)return;
 const token='m'+(++ctx.mechanicSeq),duration=Math.max(520,Math.round((Number(m.duration)||1600)*scalingValue(ctx,'castSpeed',1)));
 const castState={token,enemy:enemy.id,name:m.name,type:m.type,interrupted:false,ends:ctx.time+duration,responses:{},reactionMs:{},targetId:null,targetIds:[]};
 const live=livingPlayers(ctx);
 ctx.activeEnemyCast=castState;

 if(m.type==='cone'){
  const tank=live.find(p=>p.role==='tank')||live[0];castState.targetId=tank?.id||null;castState.targetIds=tank?[tank.id]:[];
  let badFacing=false;
  if(tank&&shouldMistake(ctx,tank,'tank',6000)){
   badFacing=true;recordMistake(ctx,tank,'tank','turned the frontal through the group',{target:enemy.id,ability:m.name});
  }
  live.forEach(p=>{
   if(p.role==='tank'){castState.responses[p.id]=true;castState.reactionMs[p.id]=0;return}
   const plan=mechanicResponse(ctx,p,'cone',duration,enemy);castState.responses[p.id]=plan.success&&!badFacing;castState.reactionMs[p.id]=plan.reactionMs
  });
 }else if(m.type==='circle'){
  castState.targetId=enemy.id;castState.targetIds=[enemy.id];
  live.forEach(p=>{const plan=mechanicResponse(ctx,p,'circle',duration,enemy);castState.responses[p.id]=plan.success;castState.reactionMs[p.id]=plan.reactionMs});
 }else if(m.type==='circles'){
  castState.targetIds=live.map(p=>p.id);
  live.forEach(p=>{const plan=mechanicResponse(ctx,p,'circles',duration,enemy);castState.responses[p.id]=plan.success;castState.reactionMs[p.id]=plan.reactionMs});
 }else if(m.type==='line'){
  const candidates=live.filter(p=>p.role!=='tank'),target=candidates[Math.floor(ctx.rng()*Math.max(1,candidates.length))]||live[0];
  castState.targetId=target?.id||null;castState.targetIds=target?[target.id]:[];
  if(target){const plan=mechanicResponse(ctx,target,'line',duration,enemy);castState.responses[target.id]=plan.success;castState.reactionMs[target.id]=plan.reactionMs}
 }

 emit(ctx,'MECHANIC_TELEGRAPH',{source:enemy.id,target:castState.targetId,ability:m.name,result:'telegraph',position:copy(enemy.position),payload:{mechanicType:m.type,duration,token,interruptible:m.type==='interrupt',targetId:castState.targetId,targetIds:copy(castState.targetIds),responses:copy(castState.responses),reactionMs:copy(castState.reactionMs)}});
 emit(ctx,'CAST_START',{source:enemy.id,target:castState.targetId,ability:m.name,result:'enemy',payload:{duration,interruptible:m.type==='interrupt',mechanicType:m.type,token,targetId:castState.targetId,targetIds:copy(castState.targetIds)}});
 if(m.type==='interrupt')tryInterrupt(ctx,enemy,m,token);
 else if(m.type==='cone'){
  const tank=getUnit(ctx,castState.targetId);
  if(tank){enemy.target=tank.id;updateFacing(enemy,tank)}
 }
 schedule(ctx,ctx.time+duration,()=>resolveMechanic(ctx,enemy,m,token),'mechanic-resolve');
}
function scheduleNextMechanic(ctx){
 if(ctx.finished)return;
 const list=ctx.encounter.mechanics||[];if(!list.length)return;
 const delay=Math.max(1700,Math.round((ctx.encounter.kind==='final'?3600:ctx.encounter.kind==='boss'?4200:5000)*scalingValue(ctx,'mechanicFrequency',1)));
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
  mechanics:copy(ctx.stats.mechanics),mistakes:copy(ctx.stats.mistakes),battleResurrections:ctx.stats.battleResurrections,players
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
 const environment=copy(encounter.environment||{blockers:[]});
 const ctx={time:0,rng:rngFrom(seed),seed,encounter,environment,tactics,players,enemies,units,events:[],queue:[],stats:makeStats(players),mechanicIndex:0,mechanicSeq:0,addSeq:0,mistakeSeq:0,pendingResurrections:0,activeEnemyCast:null,finished:false,onEvent:options.onEvent||null};
 emit(ctx,'COMBAT_START',{result:'started',payload:{encounter:encounter.id||encounter.title||'Encounter',seed,tactics,scaling:copy(encounter.scaling||{}),affixes:copy(encounter.affixes||[]),partyLevels:players.map(p=>({id:p.id,level:p.level})),enemies:enemies.map(e=>({id:e.id,name:e.name,level:e.level,classification:e.classification,classificationLabel:e.classificationLabel}))}});
 players.forEach(u=>emitResourceState(ctx,u,'initial'));
 const tank=players.find(p=>p.role==='tank')||players[0];
 if(tank)enemies.forEach(e=>{e.threat[tank.id]=180;setAggro(ctx,e,tank,'pull')});
 scheduleNextMechanic(ctx);scheduleUnstableGround(ctx);

 let outcome='defeat';
 while(ctx.time<=MAX_COMBAT_MS){
  processQueue(ctx);
  if(!livingEnemies(ctx).length&&ctx.pendingResurrections<=0){outcome='victory';break}
  if(!livingPlayers(ctx).length){outcome='defeat';break}
  tickCooldowns(ctx);passiveResources(ctx);
  players.forEach(u=>playerAI(ctx,u));
  enemies.forEach(e=>{if(e.alive&&ctx.time>=e.nextAttack)enemyBasicAttack(ctx,e)});
  ctx.time+=TICK;
 }
 if(ctx.time>MAX_COMBAT_MS)emit(ctx,'ENRAGE',{result:'timeout'});
 ctx.finished=true;ctx.queue.length=0;
 players.filter(u=>u.alive).forEach(u=>emitResourceState(ctx,u,'final'));
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
  {id:'rt',name:'Tank',class:'Warrior',spec:'Protection',power:10,level:10,_combatResource:{value:44}},
  {id:'rh',name:'Healer',class:'Paladin',spec:'Holy',power:10,level:10,_combatResource:{value:37}},
  {id:'rd1',name:'DPS One',class:'Warrior',spec:'Arms',power:10,level:10},
  {id:'rd2',name:'DPS Two',class:'Rogue',spec:'Assassination',power:10,level:10},
  {id:'rd3',name:'DPS Three',class:'Hunter',spec:'Marksman',power:10,level:10}
 ],encounter:{...base,enemyHealth:600},seed:'resource-persistence'});
 test('Resource Persistence',()=>{
  const initial=r.events.find(e=>e.type==='RESOURCE_STATE'&&e.source==='p-rh'&&e.result==='initial');
  const healer=r.finalState.players.find(p=>p.id==='p-rh');
  return initial?.payload?.value===37&&healer?.resource?.value<100
 });

 r=simulate({party:[
  {id:'st',name:'Tank',class:'Warrior',spec:'Protection',power:18,level:10},
  {id:'sh',name:'Healer',class:'Paladin',spec:'Holy',power:18,level:10},
  {id:'sd1',name:'DPS One',class:'Warrior',spec:'Arms',power:18,level:10},
  {id:'sd2',name:'DPS Two',class:'Warrior',spec:'Arms',power:18,level:10},
  {id:'sd3',name:'DPS Three',class:'Warrior',spec:'Arms',power:18,level:10}
 ],encounter:{...base,enemyHealth:900},seed:'action-stagger'});
 test('Action Stagger',()=>{
  const first={};
  r.events.filter(e=>e.type==='ABILITY_START'&&String(e.source||'').startsWith('p-')).forEach(e=>{if(first[e.source]==null)first[e.source]=e.timestamp});
  return new Set(Object.values(first)).size>=4
 });
 r=simulate({party:[
  {id:'mt',name:'Tank',class:'Warrior',spec:'Protection',power:28,level:10},
  {id:'mh',name:'Healer',class:'Paladin',spec:'Holy',power:28,level:10},
  {id:'md1',name:'DPS One',class:'Warrior',spec:'Arms',power:28,level:10},
  {id:'md2',name:'DPS Two',class:'Rogue',spec:'Assassination',power:28,level:10},
  {id:'md3',name:'DPS Three',class:'Hunter',spec:'Marksman',power:28,level:10}
 ],encounter:{id:'mana-pressure',title:'Mana Pressure',kind:'boss',enemies:['Pressure Boss'],enemyHealth:1500,mechanics:[['Tank Cleave','cone',1400]]},seed:'mana-pressure'});
 test('Healer Mana Pressure',()=>{
  const healer=r.finalState.players.find(p=>p.id==='p-mh'),stats=r.summary.players.find(p=>p.id==='p-mh');
  return !!healer&&healer.resource.value<88&&stats.resourcesSpent>=25
 });

 r=simulate({party:[
  {id:'jt',name:'Tank',class:'Warrior',spec:'Protection',power:10,level:10},
  {id:'j1',name:'Melee One',class:'Warrior',spec:'Arms',power:10,level:10},
  {id:'j2',name:'Melee Two',class:'Rogue',spec:'Assassination',power:10,level:10},
  {id:'j3',name:'Melee Three',class:'Demon Hunter',spec:'Havoc',power:10,level:10},
  {id:'jh',name:'Healer',class:'Priest',spec:'Holy',power:10,level:10}
 ],encounter:{...base,enemyHealth:1200,mechanics:[]},seed:'movement-smoothing'});
 test('Movement Smoothing',()=>r.events.filter(e=>e.type==='MOVEMENT_START'&&String(e.source||'').startsWith('p-')).length<45);
 r=simulate({party:[
  {id:'ht',name:'Tank',class:'Warrior',spec:'Protection',power:28,level:10},
  {id:'hh',name:'Healer',class:'Paladin',spec:'Holy',power:28,level:10},
  {id:'hd1',name:'DPS One',class:'Warrior',spec:'Arms',power:28,level:10},
  {id:'hd2',name:'DPS Two',class:'Rogue',spec:'Assassination',power:28,level:10},
  {id:'hd3',name:'DPS Three',class:'Hunter',spec:'Marksman',power:28,level:10}
 ],encounter:{id:'healer-role',title:'Healer Role',kind:'boss',enemies:['Pressure Boss'],enemyHealth:1200,mechanics:[['Tank Cleave','cone',1500]]},seed:'healer-role'});
 test('Healer Role Priority',()=>{
  const h=r.summary.players.find(p=>p.id==='p-hh'),tank=r.summary.players.find(p=>p.id==='p-ht');
  return !!h&&h.damage===0&&h.healing>=100&&tank.damageTaken>=100
 });
 r=simulate({party:[
  {id:'gt',name:'Tank',class:'Warrior',spec:'Protection',power:28,level:10},
  {id:'gh',name:'Healer',class:'Paladin',spec:'Holy',power:28,level:10},
  {id:'gd1',name:'DPS One',class:'Death Knight',spec:'Frost',power:28,level:10},
  {id:'gd2',name:'DPS Two',class:'Death Knight',spec:'Frost',power:28,level:10},
  {id:'gd3',name:'DPS Three',class:'Death Knight',spec:'Frost',power:28,level:10}
 ],encounter:{id:'group-healing',title:'Group Healing',kind:'boss',enemies:['Pulse Boss'],enemyHealth:1500,mechanics:[['Raid Pulse','interrupt',1200]]},tactics:{interruptPriority:'low',movementDiscipline:'balanced'},seed:'group-healing'});
 test('Group Healing',()=>{
  const events=r.events.filter(e=>e.type==='HEAL_RECEIVED'&&e.source==='p-gh'&&e.ability==='Light of Dawn');
  return new Set(events.map(e=>e.target)).size>=3
 });
 r=simulate({party:[
  {id:'lt',name:'Tank',class:'Warrior',spec:'Protection',power:24,level:10},
  {id:'lh',name:'Healer',class:'Paladin',spec:'Holy',power:24,level:10},
  {id:'ld1',name:'DPS One',class:'Warrior',spec:'Arms',power:24,level:10},
  {id:'ld2',name:'DPS Two',class:'Rogue',spec:'Assassination',power:24,level:10},
  {id:'ld3',name:'DPS Three',class:'Hunter',spec:'Marksman',power:24,level:10}
 ],encounter:{id:'los-healing',title:'LOS Healing',kind:'boss',enemies:['Wall Boss'],enemyHealth:1400,mechanics:[['Tank Cleave','cone',1400]],environment:{blockers:[{id:'stone-wall',x:30,y:32,w:5,h:24,blocksLos:true,blocksMovement:true}]}},seed:'los-healing'});
 test('Environment Line of Sight',()=>{
  const firstHeal=r.events.find(e=>e.type==='HEAL_RECEIVED'&&e.source==='p-lh');
  const losMove=r.events.find(e=>e.type==='MOVEMENT_START'&&e.source==='p-lh'&&e.result==='line of sight');
  return !!firstHeal&&!!losMove&&losMove.timestamp<firstHeal.timestamp
 });
 r=simulate({party:[
  {id:'pt',name:'Tank',class:'Warrior',spec:'Protection',power:24,level:10},
  {id:'ph',name:'Healer',class:'Priest',spec:'Holy',power:24,level:10},
  {id:'pd1',name:'DPS One',class:'Warrior',spec:'Arms',power:24,level:10},
  {id:'pd2',name:'DPS Two',class:'Rogue',spec:'Assassination',power:24,level:10},
  {id:'pd3',name:'DPS Three',class:'Hunter',spec:'Marksman',power:24,level:10}
 ],encounter:{id:'wall-pathing',title:'Wall Pathing',kind:'boss',enemies:['Path Boss'],enemyHealth:900,mechanics:[],environment:{blockers:[{id:'central-wall',x:53,y:38,w:8,h:34,blocksLos:true,blocksMovement:true}]}},seed:'wall-pathing'});
 test('Environment Pathing',()=>r.events.some(e=>e.type==='MOVEMENT_START'&&e.payload?.navigation==='waypoint'));
 r=simulate({party:[{id:'l1',name:'L1',class:'Warrior',spec:'Arms',power:10,level:1},{id:'h1',name:'H',class:'Priest',spec:'Holy',power:10,level:1},{id:'a1',name:'A',class:'Warrior',spec:'Protection',power:10,level:1},{id:'b1',name:'B',class:'Rogue',spec:'Assassination',power:10,level:1},{id:'c1',name:'C',class:'Hunter',spec:'Marksman',power:10,level:1}],encounter:{...base,level:1,enemyHealth:900},seed:'level-one'});
 const l1=r.finalState.players.find(p=>p.id==='p-l1'),d1=r.summary.players.find(p=>p.id==='p-l1')?.damage||0;
 r=simulate({party:[{id:'l10',name:'L10',class:'Warrior',spec:'Arms',power:10,level:10},{id:'h10',name:'H',class:'Priest',spec:'Holy',power:10,level:10},{id:'a10',name:'A',class:'Warrior',spec:'Protection',power:10,level:10},{id:'b10',name:'B',class:'Rogue',spec:'Assassination',power:10,level:10},{id:'c10',name:'C',class:'Hunter',spec:'Marksman',power:10,level:10}],encounter:{...base,level:10,enemyHealth:900},seed:'level-ten'});
 const l10=r.finalState.players.find(p=>p.id==='p-l10'),d10=r.summary.players.find(p=>p.id==='p-l10')?.damage||0;
 test('Level Base Growth',()=>l10.maxHealth>l1.maxHealth*1.2&&d10>d1);
 r=simulate({party,encounter:{...base,level:8,enemyHealth:500,enemyTypes:['elite']},seed:'enemy-level-meta'});
 test('Enemy Level Metadata',()=>{const e=r.finalState.enemies[0];return e.level===8&&e.classification==='elite'&&e.classificationLabel==='ELITE'});
 {
  const encounter={id:'execution-check',kind:'boss',level:7,recommendedItemLevel:24,knowledgeKey:'danger',enemies:['Execution Boss'],enemyHealth:1800,mechanics:[['Pulse','circles',1400],['Scream','interrupt',1500],['Line','line',1400]]};
  const makeExecutionParty=prepared=>[
   {id:'xt',name:'Tank',class:'Warrior',spec:'Protection',power:22,level:prepared?7:2,_combatItemLevel:prepared?26:8,knowledge:{danger:prepared?100:0}},
   {id:'xh',name:'Healer',class:'Priest',spec:'Holy',power:22,level:prepared?7:2,_combatItemLevel:prepared?26:8,knowledge:{danger:prepared?100:0}},
   {id:'xd1',name:'DPS One',class:'Warrior',spec:'Arms',power:22,level:prepared?7:2,_combatItemLevel:prepared?26:8,knowledge:{danger:prepared?100:0}},
   {id:'xd2',name:'DPS Two',class:'Rogue',spec:'Assassination',power:22,level:prepared?7:2,_combatItemLevel:prepared?26:8,knowledge:{danger:prepared?100:0}},
   {id:'xd3',name:'DPS Three',class:'Hunter',spec:'Marksman',power:22,level:prepared?7:2,_combatItemLevel:prepared?26:8,knowledge:{danger:prepared?100:0}}
  ];
  const low=simulate({party:makeExecutionParty(false),encounter,seed:'compare'}),high=simulate({party:makeExecutionParty(true),encounter,seed:'compare'});
  test('Human Error Scaling',()=>low.summary.mistakes.total>high.summary.mistakes.total&&high.outcome==='victory');
  test('Threat Mistake',()=>low.events.some(e=>e.type==='PLAYER_MISTAKE'&&e.result==='threat'));
 }
 {
  const rezParty=[
   {id:'brt',name:'Tank',class:'Warrior',spec:'Protection',power:30,level:8,_combatItemLevel:30,knowledge:{rez:100}},
   {id:'brh',name:'Priest',class:'Priest',spec:'Holy',power:30,level:8,_combatItemLevel:30,knowledge:{rez:100}},
   {id:'brd1',name:'Fallen DPS',class:'Warrior',spec:'Arms',power:30,level:8,_combatItemLevel:30,_combatHealthPct:0,knowledge:{rez:100}},
   {id:'brd2',name:'DPS Two',class:'Rogue',spec:'Assassination',power:30,level:8,_combatItemLevel:30,knowledge:{rez:100}},
   {id:'brd3',name:'DPS Three',class:'Hunter',spec:'Marksman',power:30,level:8,_combatItemLevel:30,knowledge:{rez:100}}
  ];
  const rez=simulate({party:rezParty,encounter:{id:'rez',kind:'boss',level:8,recommendedItemLevel:28,knowledgeKey:'rez',enemies:['Resurrection Boss'],enemyHealth:2400,mechanics:[]},seed:'battle-rez-test'});
  test('Priest Battle Resurrection',()=>{
   const event=rez.events.find(e=>e.type==='PLAYER_REVIVED'&&e.target==='p-brd1'),priest=rez.finalState.players.find(p=>p.id==='p-brh');
   return !!event&&rez.summary.battleResurrections===1&&Number(priest?.cooldowns?.['soul-recall'])>0
  });
 }






 return{version:VERSION,passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}

window.CellboundCombatReborn={
 VERSION,CLASS_COLORS,RESOURCE_DEFS,ABILITIES,LEVEL_RULES,ENEMY_CLASS_RULES,simulate,replay,debugSnapshot,
 tests:{run:runSelfTests},utils:{hashSeed,rngFrom,levelHealthScale,levelOutputScale,levelMatchMultiplier}
};
})();