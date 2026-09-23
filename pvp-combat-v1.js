(()=>{
'use strict';

const VERSION='1.1.0';
const TICK=250;
const MAX_ARENA_MS=90000;
const MAX_BG_MS=120000;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const copy=o=>JSON.parse(JSON.stringify(o));
const CLASS_COLORS={
  'Death Knight':'#C41E3A','Demon Hunter':'#A330C9','Druid':'#FF7C0A','Evoker':'#33937F','Hunter':'#AAD372',
  'Mage':'#3FC7EB','Monk':'#00FF98','Paladin':'#F48CBA','Priest':'#FFFFFF','Rogue':'#FFF468','Shaman':'#0070DD',
  'Warlock':'#8788EE','Warrior':'#C69B6D'
};
const RESOURCE={
  Warrior:{name:'Rage',max:100,start:25,regen:8},Paladin:{name:'Mana',max:100,start:100,regen:6},Priest:{name:'Mana',max:100,start:100,regen:7},
  Druid:{name:'Mana',max:100,start:100,regen:7},Hunter:{name:'Focus',max:100,start:80,regen:10},Rogue:{name:'Energy',max:100,start:100,regen:14},
  Mage:{name:'Mana',max:100,start:100,regen:6},'Death Knight':{name:'Runic Power',max:100,start:25,regen:7},'Demon Hunter':{name:'Fury',max:100,start:30,regen:10},
  Evoker:{name:'Essence',max:5,start:5,regen:.55},Monk:{name:'Energy',max:100,start:100,regen:12},Shaman:{name:'Mana',max:100,start:100,regen:6},Warlock:{name:'Mana',max:100,start:100,regen:5}
};
const KIT={
  Warrior:{damage:['Mortal Strike','Slam','Execute'],tank:['Shield Slam','Revenge'],interrupt:'Pummel',cc:'Storm Bolt',defensive:'Shield Wall'},
  Paladin:{damage:['Judgement','Crusader Strike','Radiant Verdict'],tank:['Avenger\'s Shield','Consecration'],heal:['Holy Light','Holy Shock','Flash of Light'],interrupt:'Rebuke',cc:'Hammer of Justice',defensive:'Divine Protection'},
  Priest:{damage:['Smite','Mind Spike','Holy Fire'],heal:['Heal','Flash Heal','Prayer of Healing'],interrupt:'Silence',cc:'Psychic Scream',defensive:'Guardian Spirit'},
  Druid:{damage:['Wrath','Moonfire','Starfire'],heal:['Rejuvenation','Regrowth','Wild Growth'],interrupt:'Skull Bash',cc:'Entangling Roots',defensive:'Barkskin'},
  Hunter:{damage:['Aimed Shot','Arcane Shot','Kill Shot'],interrupt:'Counter Shot',cc:'Freezing Trap',defensive:'Survival Instincts'},
  Rogue:{damage:['Mutilate','Eviscerate','Envenom'],interrupt:'Kick',cc:'Kidney Shot',defensive:'Feint'},
  Mage:{damage:['Fireball','Pyroblast','Arcane Barrage'],interrupt:'Counterspell',cc:'Polymorph',defensive:'Arcane Ward'},
  'Death Knight':{damage:['Obliterate','Death Strike','Frost Strike'],tank:['Heart Strike','Death Strike'],interrupt:'Mind Freeze',cc:'Asphyxiate',defensive:'Icebound Fortitude'},
  'Demon Hunter':{damage:['Chaos Strike','Blade Dance','Fel Barrage'],interrupt:'Disrupt',cc:'Chaos Nova',defensive:'Blur'},
  Evoker:{damage:['Living Flame','Azure Strike','Disintegrate'],heal:['Verdant Embrace','Emerald Blossom','Dream Breath'],interrupt:'Quell',cc:'Tail Swipe',defensive:'Obsidian Scales'},
  Monk:{damage:['Tiger Palm','Rising Sun Kick','Blackout Kick'],heal:['Vivify','Enveloping Mist','Renewing Mist'],interrupt:'Spear Hand Strike',cc:'Leg Sweep',defensive:'Fortifying Brew'},
  Shaman:{damage:['Lightning Bolt','Lava Burst','Stormstrike'],heal:['Healing Wave','Riptide','Chain Heal'],interrupt:'Wind Shear',cc:'Hex',defensive:'Astral Shift'},
  Warlock:{damage:['Shadow Bolt','Chaos Bolt','Drain Soul'],interrupt:'Spell Lock',cc:'Fear',defensive:'Unending Resolve'}
};
const ROLE_FALLBACK={tank:['Shield Slam','Guard Breaker'],healer:['Mend','Radiant Mend'],dps:['Strike','Heavy Strike','Finisher']};

function hashSeed(input){
  let h=2166136261>>>0;for(const ch of String(input||'cellbound-pvp')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0
}
function rngFrom(seed){
  let s=hashSeed(seed)||1;return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
}
function roleOf(raw){
  if(raw?.role)return raw.role;
  const spec=String(raw?.spec||'').toLowerCase();
  if(/protection|guardian|blood|brewmaster|vengeance/.test(spec))return'tank';
  if(/holy|restoration|discipline|preservation|mistweaver/.test(spec))return'healer';
  return'dps'
}
function resourceDef(raw){return RESOURCE[raw?.class]||{name:'Power',max:100,start:100,regen:8}}
function unitId(team,raw,index){return team+'-'+String(raw?.id||raw?.characterId||index).replace(/[^a-zA-Z0-9_-]+/g,'-')}
function initialPoint(team,index,count,kind,mode){
  const spread=Math.max(1,count-1),y=18+(index/spread)*64;
  if(kind==='arena')return{x:team==='blue'?18:82,y};
  if(mode==='king-of-the-hill')return{x:team==='blue'?17:83,y};
  return{x:team==='blue'?12:88,y}
}
function normalize(raw,team,index,count,opts){
  const role=roleOf(raw),level=Math.max(1,Number(raw?.level)||1),pvpPower=Math.max(70,Number(raw?.pvpPower)||100+level*2),pvpDefence=Math.max(0,Number(raw?.pvpDefence)||0),control=Math.max(0,Number(raw?.controlResistance)||0);
  const maxHealth=Math.round((role==='tank'?1420:role==='healer'?1050:1120)*(1+(level-1)*.018)*(1+pvpDefence/420));
  const r=resourceDef(raw),position=initialPoint(team,index,count,opts.kind,opts.mode);
  return{
    id:unitId(team,raw,index),characterId:raw?.id||raw?.characterId||null,name:raw?.name||('Combatant '+(index+1)),portrait:raw?.portrait||'◆',class:raw?.class||'Warrior',spec:raw?.spec||'',role,team,
    level,pvpPower,pvpDefence,controlResistance:control,maxHealth,health:maxHealth,alive:true,position,resource:{name:r.name,max:r.max,value:r.start,regen:r.regen},
    nextAction:500+index*85,nextControl:5000+index*300,nextDefensive:9000+index*500,disabledUntil:0,guardedUntil:0,guardSource:null,defensiveUntil:0,
    respawnAt:0,kills:0,deaths:0,damage:0,healing:0,interrupts:0,cc:0,objectives:0,carryingFlag:null,flagIntent:null
  }
}
function emit(ctx,type,data={}){ctx.events.push({timestamp:Math.max(0,Math.round(ctx.time)),type,...data})}
function living(ctx,team){return ctx.units.filter(u=>u.team===team&&u.alive)}
function allies(ctx,u){return living(ctx,u.team)}
function enemies(ctx,u){return living(ctx,u.team==='blue'?'red':'blue')}
function healthRatio(u){return u.maxHealth?u.health/u.maxHealth:0}
function distance(a,b){return Math.hypot((a.position.x-b.position.x),(a.position.y-b.position.y))}
function move(ctx,u,to,duration=500,reason='position'){
  const end={x:clamp(Number(to.x)||50,5,95),y:clamp(Number(to.y)||50,8,92)};
  u.position=end;emit(ctx,'MOVEMENT_START',{source:u.id,result:reason,payload:{to:copy(end),duration}})
}
function actionRange(u){return ['Hunter','Mage','Priest','Druid','Evoker','Shaman','Warlock'].includes(u.class)?30:6}
function rolePriority(target,attacker){
  let score=(1-healthRatio(target))*100;
  if(target.role==='healer')score+=attacker.role==='dps'?36:22;
  if(target.carryingFlag)score+=46;
  if(target.role==='tank')score-=12;
  return score
}
function selectTarget(ctx,u){
  const list=enemies(ctx,u);if(!list.length)return null;
  return list.slice().sort((a,b)=>rolePriority(b,u)-rolePriority(a,u)||distance(u,a)-distance(u,b))[0]
}
function selectHeal(ctx,u){
  const list=allies(ctx,u).filter(x=>x.health<x.maxHealth*.96);if(!list.length)return null;
  return list.slice().sort((a,b)=>healthRatio(a)-healthRatio(b))[0]
}
function kitFor(u){return KIT[u.class]||{}}
function abilityName(u,kind='damage'){
  const k=kitFor(u),pool=kind==='heal'?k.heal:kind==='tank'?(k.tank||k.damage):k.damage;
  const p=pool?.length?pool:ROLE_FALLBACK[kind]||ROLE_FALLBACK.dps;
  const phase=Math.floor((u.damage+u.healing+u.kills*31)%p.length);return p[phase]||'Strike'
}
function spendResource(ctx,u,cost){
  const amount=Math.min(u.resource.value,Math.max(0,cost));u.resource.value=clamp(u.resource.value-amount,0,u.resource.max);
  emit(ctx,'RESOURCE_SPENT',{source:u.id,target:u.id,amount,result:'ability',payload:{resource:u.resource.name,value:u.resource.value,max:u.resource.max}});return amount
}
function gainResource(ctx,u,amount,reason='regeneration'){
  const before=u.resource.value;u.resource.value=clamp(before+amount,0,u.resource.max);if(u.resource.value!==before)emit(ctx,'RESOURCE_GAINED',{source:u.id,target:u.id,amount:u.resource.value-before,result:reason,payload:{resource:u.resource.name,value:u.resource.value,max:u.resource.max}})
}
function mitigation(target){
  let m=1/(1+target.pvpDefence/165);
  if(target.defensiveUntil>0)m*=.68;
  if(target.guardedUntil>0)m*=.82;
  return clamp(m,.42,1)
}
function applyDamage(ctx,source,target,raw,ability,critical=false){
  if(!source?.alive||!target?.alive)return 0;
  const variance=.90+ctx.rng()*.20,powerScale=clamp(source.pvpPower/125,.68,1.8),guard=target.guardedUntil>ctx.time&&target.guardSource;
  let amount=Math.max(1,Math.round(raw*powerScale*variance*mitigation(target)*(critical?1.55:1)));
  target.health=Math.max(0,target.health-amount);source.damage+=amount;ctx.stats[source.team].damage+=amount;
  emit(ctx,'DAMAGE_DEALT',{source:source.id,target:target.id,ability,amount,result:critical?'critical':'hit',payload:{targetHp:target.health,targetMaxHealth:target.maxHealth,targetHpPct:target.maxHealth?target.health/target.maxHealth*100:0,pvp:true,guarded:Boolean(guard)}});
  if(guard){const protector=ctx.byId[guard];if(protector?.alive){const redirect=Math.max(1,Math.round(amount*.16));protector.health=Math.max(0,protector.health-redirect);emit(ctx,'DAMAGE_DEALT',{source:source.id,target:protector.id,ability:'Guard Redirect',amount:redirect,result:'redirect',payload:{targetHp:protector.health,targetMaxHealth:protector.maxHealth,targetHpPct:protector.health/protector.maxHealth*100,pvp:true,redirected:true}});if(protector.health<=0)defeat(ctx,source,protector)}}
  if(target.health<=0)defeat(ctx,source,target);return amount
}
function applyHeal(ctx,source,target,raw,ability){
  if(!source?.alive||!target?.alive)return 0;
  const scale=clamp(source.pvpPower/120,.7,1.65),before=target.health,amount=Math.max(1,Math.round(raw*scale*(.9+ctx.rng()*.18)));
  target.health=Math.min(target.maxHealth,target.health+amount);const effective=target.health-before;source.healing+=effective;ctx.stats[source.team].healing+=effective;
  emit(ctx,'HEAL_RECEIVED',{source:source.id,target:target.id,ability,amount:effective,result:'pvp-heal',payload:{targetHp:target.health,targetMaxHealth:target.maxHealth,targetHpPct:target.health/target.maxHealth*100,overhealing:Math.max(0,amount-effective),pvp:true}});
  return effective
}
function defeat(ctx,killer,target){
  if(!target.alive)return;
  target.alive=false;target.health=0;target.deaths++;ctx.stats[target.team].deaths++;if(killer){killer.kills++;ctx.stats[killer.team].kills++}
  if(target.carryingFlag){
    const owner=target.carryingFlag,flag=ctx.flag?.[owner];
    if(flag){
      flag.carrier=null;flag.state='dropped';flag.position=copy(target.position);flag.droppedAt=ctx.time;flag.lastActionAt=ctx.time;
      emit(ctx,'FLAG_STATE',{source:target.id,result:'dropped',payload:{team:owner,owner,x:flag.position.x,y:flag.position.y}})
    }
    target.carryingFlag=null
  }
  target.flagIntent=null;
  emit(ctx,'PLAYER_DEFEATED',{source:killer?.id||null,target:target.id,ability:'PvP defeat',result:'defeated',payload:{team:target.team,killer:killer?.id||null}});
  if(ctx.kind==='battleground')target.respawnAt=ctx.time+7000+Math.round(ctx.rng()*2500)
}
function respawn(ctx,u){
  u.alive=true;u.health=u.maxHealth;u.resource.value=u.resource.max;u.respawnAt=0;u.disabledUntil=0;u.defensiveUntil=0;u.guardedUntil=0;
  const teamList=ctx.units.filter(x=>x.team===u.team),idx=teamList.indexOf(u);u.position=initialPoint(u.team,Math.max(0,idx),teamList.length,ctx.kind,ctx.mode);
  emit(ctx,'PLAYER_REVIVED',{target:u.id,result:'respawn',payload:{targetHpPct:100,resource:u.resource.name,resourceValue:u.resource.value,resourceMax:u.resource.max,pvpRespawn:true}});
  move(ctx,u,u.position,260,'respawn')
}
function maybeGuard(ctx,u){
  if(u.role!=='tank'||ctx.time<u.nextDefensive)return false;
  const candidate=allies(ctx,u).filter(x=>x.id!==u.id).sort((a,b)=>healthRatio(a)-healthRatio(b))[0];if(!candidate||healthRatio(candidate)>.72)return false;
  candidate.guardedUntil=ctx.time+5000;candidate.guardSource=u.id;u.nextDefensive=ctx.time+16000;
  emit(ctx,'DEFENSIVE_ACTIVATED',{source:u.id,target:candidate.id,ability:'Guard',result:'guard',payload:{duration:5000,pvp:true}});
  return true
}
function maybeDefensive(ctx,u){
  if(ctx.time<u.nextDefensive||healthRatio(u)>.42)return false;const name=kitFor(u).defensive||'Defensive';
  u.defensiveUntil=ctx.time+5000;u.nextDefensive=ctx.time+18000;emit(ctx,'DEFENSIVE_ACTIVATED',{source:u.id,target:u.id,ability:name,result:'defensive',payload:{duration:5000,pvp:true}});return true
}
function maybeControl(ctx,u,target){
  const cc=kitFor(u).cc;if(!cc||ctx.time<u.nextControl||!target?.alive||ctx.rng()>.24)return false;
  const duration=Math.round(1800*clamp(1-target.controlResistance/100,.35,1));target.disabledUntil=Math.max(target.disabledUntil,ctx.time+duration);u.nextControl=ctx.time+12000+ctx.rng()*5000;u.cc++;
  emit(ctx,'CROWD_CONTROL',{source:u.id,target:target.id,ability:cc,result:'applied',payload:{duration,pvp:true}});return true
}
function tryInterrupt(ctx,u,target,ability){
  const name=kitFor(u).interrupt;if(!name||!target?.alive||ctx.rng()>.38)return false;u.interrupts++;
  emit(ctx,'INTERRUPT',{source:u.id,target:target.id,ability:name,result:'success',payload:{interruptedAbility:ability,pvp:true}});target.disabledUntil=Math.max(target.disabledUntil,ctx.time+700);return true
}
function healerAction(ctx,u){
  const target=selectHeal(ctx,u);if(!target)return false;
  const ability=abilityName(u,'heal'),strong=healthRatio(target)<.42,cost=strong?22:14;if(u.resource.value<cost)return false;
  emit(ctx,'ABILITY_START',{source:u.id,target:target.id,ability,result:'heal',payload:{kind:'heal',castTime:strong?850:0,pvp:true}});
  spendResource(ctx,u,cost);
  if(strong){
    emit(ctx,'CAST_START',{source:u.id,target:target.id,ability,result:'player',payload:{duration:850,interruptible:true,pvp:true}});
    const interrupter=enemies(ctx,u).filter(x=>x.alive&&ctx.time>=x.disabledUntil&&distance(x,u)<=actionRange(x)+6).sort((a,b)=>distance(a,u)-distance(b,u))[0];
    if(interrupter&&tryInterrupt(ctx,interrupter,u,ability)){emit(ctx,'CAST_CANCELLED',{source:u.id,target:target.id,ability,result:'interrupted',payload:{pvp:true}});return true}
  }
  applyHeal(ctx,u,target,strong?175:118,ability);emit(ctx,'ABILITY_FINISH',{source:u.id,target:target.id,ability,result:'resolved',payload:{kind:'heal',pvp:true}});return true
}
function damageAction(ctx,u,target){
  if(!target?.alive)return false;
  const range=actionRange(u),d=distance(u,target);if(d>range){const stop=range>8?{x:u.team==='blue'?target.position.x-14:target.position.x+14,y:target.position.y}:{x:u.team==='blue'?target.position.x-3:target.position.x+3,y:target.position.y};move(ctx,u,stop,420,'engage');return true}
  maybeControl(ctx,u,target);
  const kind=u.role==='tank'?'tank':'damage',ability=abilityName(u,kind),cost=u.resource.max<=5?1:18;
  if(u.resource.value<cost){const basic=u.role==='tank'?'Guard Strike':'Basic Attack';emit(ctx,'ABILITY_START',{source:u.id,target:target.id,ability:basic,result:'damage',payload:{kind:'damage',pvp:true}});applyDamage(ctx,u,target,u.role==='tank'?48:54,basic,false);gainResource(ctx,u,u.resource.max<=5?1:18,'builder');return true}
  const critical=ctx.rng()<.16,execute=healthRatio(target)<.28&&/Execute|Kill Shot|Eviscerate|Drain Soul|Finisher/.test(ability);emit(ctx,'ABILITY_START',{source:u.id,target:target.id,ability,result:'damage',payload:{kind:'damage',pvp:true}});spendResource(ctx,u,cost);
  applyDamage(ctx,u,target,(u.role==='tank'?58:76)*(execute?1.45:1),ability,critical);emit(ctx,'ABILITY_FINISH',{source:u.id,target:target.id,ability,result:'resolved',payload:{kind:'damage',pvp:true}});return true
}
function act(ctx,u){
  if(!u.alive||ctx.time<u.disabledUntil||ctx.time<u.nextAction)return;
  maybeDefensive(ctx,u);maybeGuard(ctx,u);
  let acted=false;if(u.role==='healer')acted=healerAction(ctx,u);
  if(!acted)acted=damageAction(ctx,u,selectTarget(ctx,u));
  u.nextAction=ctx.time+(u.role==='healer'?1300:1150)+Math.round(ctx.rng()*450)
}
function regen(ctx){
  ctx.units.forEach(u=>{if(!u.alive)return;const gain=(u.resource.regen||0)*(TICK/1000);if(gain>0&&u.resource.value<u.resource.max){u.resource.value=clamp(u.resource.value+gain,0,u.resource.max);if(ctx.time%1000===0)emit(ctx,'RESOURCE_STATE',{source:u.id,target:u.id,result:'regeneration',payload:{resource:u.resource.name,value:u.resource.value,max:u.resource.max}})}})
}
function teamCentroid(list){if(!list.length)return{x:50,y:50};return{x:list.reduce((n,u)=>n+u.position.x,0)/list.length,y:list.reduce((n,u)=>n+u.position.y,0)/list.length}}
function setupObjective(ctx){
  if(ctx.kind==='arena'){ctx.objective={type:'arena',blue:0,red:0};return}
  if(ctx.mode==='king-of-the-hill'){
    ctx.objective={type:'king-of-the-hill',blue:0,red:0,owner:null};
    ctx.units.forEach((u,i)=>move(ctx,u,{x:50+(u.team==='blue'?-5:5),y:26+(i%(Math.max(1,ctx.size/2)))*Math.min(9,48/Math.max(1,ctx.size/2))},700,'contest hill'))
  }else{
    ctx.objective={type:'capture-the-flag',blue:0,red:0};
    ctx.flag={
      blue:{owner:'blue',carrier:null,state:'base',position:{x:12,y:50},droppedAt:0,lastActionAt:0},
      red:{owner:'red',carrier:null,state:'base',position:{x:88,y:50},droppedAt:0,lastActionAt:0}
    };
    emit(ctx,'FLAG_STATE',{result:'reset',payload:{team:'blue',owner:'blue',x:12,y:50}});
    emit(ctx,'FLAG_STATE',{result:'reset',payload:{team:'red',owner:'red',x:88,y:50}});
    ctx.units.forEach((u,i)=>move(ctx,u,{x:u.team==='blue'?30:70,y:20+(i%10)*6.5},700,'advance'))
  }
}
function hillTick(ctx){
  if(ctx.time%1000!==0)return;
  const centre={x:50,y:50},count=team=>living(ctx,team).reduce((n,u)=>n+(distance(u,{position:centre})<=26?(u.role==='tank'?1.35:u.role==='healer'?1.1:1):0),0);
  const b=count('blue'),r=count('red');let owner=null;if(b>r+.35)owner='blue';else if(r>b+.35)owner='red';
  if(owner){ctx.objective[owner]=Math.min(100,ctx.objective[owner]+2);living(ctx,owner).forEach(u=>{if(distance(u,{position:centre})<=26)u.objectives++});if(ctx.objective.owner!==owner){ctx.objective.owner=owner;emit(ctx,'OBJECTIVE_UPDATE',{result:'hill-control',payload:{mode:ctx.mode,owner,blue:ctx.objective.blue,red:ctx.objective.red}})}}
  if(ctx.time%5000===0)emit(ctx,'OBJECTIVE_UPDATE',{result:'hill-score',payload:{mode:ctx.mode,owner:ctx.objective.owner,blue:ctx.objective.blue,red:ctx.objective.red}})
}
function chooseCarrier(ctx,team){
  return living(ctx,team).filter(u=>!u.carryingFlag&&u.role!=='healer').sort((a,b)=>(b.role==='tank'?1:0)-(a.role==='tank'?1:0)||healthRatio(b)-healthRatio(a))[0]||living(ctx,team).find(u=>!u.carryingFlag)||null
}
function flagBase(team){return team==='blue'?{x:12,y:50}:{x:88,y:50}}
function flagEnemy(team){return team==='blue'?'red':'blue'}
function pvpDistanceToPoint(u,p){return Math.hypot((u.position.x-p.x),(u.position.y-p.y))}
function travelFlagRunner(ctx,u,to,duration,reason,onArrive){
  if(!u?.alive)return false;
  const end={x:clamp(Number(to.x)||50,5,95),y:clamp(Number(to.y)||50,8,92)};
  u.flagIntent=reason;u.nextAction=Math.max(u.nextAction,ctx.time+duration);
  emit(ctx,'MOVEMENT_START',{source:u.id,result:reason,payload:{to:copy(end),duration,pvpFlag:true}});
  ctx.scheduled.push({at:ctx.time+duration,fn:()=>{
    if(!u.alive)return;u.position=end;u.flagIntent=null;onArrive?.()
  }});
  return true
}
function resetFlag(ctx,flag,reason='returned',source=null){
  if(!flag)return;
  if(flag.carrier&&ctx.byId[flag.carrier])ctx.byId[flag.carrier].carryingFlag=null;
  flag.carrier=null;flag.state='base';flag.position=flagBase(flag.owner);flag.droppedAt=0;flag.lastActionAt=ctx.time;
  emit(ctx,'FLAG_STATE',{source:source?.id||null,result:reason,payload:{team:flag.owner,owner:flag.owner,x:flag.position.x,y:flag.position.y}})
}
function carryFlagHome(ctx,u,flag,from='base'){
  if(!u?.alive||!flag||u.team===flag.owner||u.carryingFlag)return false;
  flag.carrier=u.id;flag.state='carried';flag.position=copy(u.position);flag.lastActionAt=ctx.time;u.carryingFlag=flag.owner;u.objectives++;
  emit(ctx,'FLAG_STATE',{source:u.id,result:'picked-up',payload:{team:flag.owner,owner:flag.owner,carrier:u.id,from,x:u.position.x,y:u.position.y}});
  const home=flagBase(u.team);
  travelFlagRunner(ctx,u,home,2800,'carry flag home',()=>{flag.position=copy(u.position)});
  return true
}
function captureFlag(ctx,u,flag){
  if(!u?.alive||!flag||flag.carrier!==u.id||u.carryingFlag!==flag.owner)return false;
  const own=ctx.flag[u.team];if(!own||own.state!=='base')return false;
  u.carryingFlag=null;flag.carrier=null;flag.state='base';flag.position=flagBase(flag.owner);flag.lastActionAt=ctx.time;
  ctx.objective[u.team]++;ctx.stats[u.team].objectives++;
  emit(ctx,'FLAG_STATE',{source:u.id,result:'captured',payload:{team:flag.owner,owner:flag.owner,scoringTeam:u.team,blue:ctx.objective.blue,red:ctx.objective.red,x:flag.position.x,y:flag.position.y}});
  return true
}
function resolveDroppedFlag(ctx,flag){
  if(!flag||flag.state!=='dropped')return;
  const p=flag.position,defender=living(ctx,flag.owner).sort((a,b)=>pvpDistanceToPoint(a,p)-pvpDistanceToPoint(b,p))[0],attackingTeam=flagEnemy(flag.owner),attacker=living(ctx,attackingTeam).filter(u=>!u.carryingFlag).sort((a,b)=>pvpDistanceToPoint(a,p)-pvpDistanceToPoint(b,p))[0];
  if(!defender&&!attacker){flag.lastActionAt=ctx.time;return}
  const defenderDist=defender?pvpDistanceToPoint(defender,p):999,attackerDist=attacker?pvpDistanceToPoint(attacker,p):999;
  const returnWins=defender&&(!attacker||defenderDist<=attackerDist+4);
  const actor=returnWins?defender:attacker;if(!actor)return;
  flag.state='contested';flag.lastActionAt=ctx.time;
  travelFlagRunner(ctx,actor,p,700,returnWins?'return dropped flag':'recover dropped flag',()=>{
    if(flag.state!=='contested'||!actor.alive)return;
    if(returnWins)resetFlag(ctx,flag,'returned',actor);
    else{flag.state='dropped';carryFlagHome(ctx,actor,flag,'ground')}
  })
}
function flagTick(ctx){
  if(ctx.time<2500||ctx.time%500!==0)return;
  for(const owner of ['blue','red']){
    const flag=ctx.flag[owner];if(!flag)continue;
    if(flag.state==='carried'){
      const carrier=ctx.byId[flag.carrier];
      if(!carrier?.alive)continue;
      flag.position=copy(carrier.position);
      const home=flagBase(carrier.team);
      if(pvpDistanceToPoint(carrier,home)<=4)captureFlag(ctx,carrier,flag);
      continue
    }
    if(flag.state==='dropped'){
      if(ctx.time-flag.lastActionAt>=850)resolveDroppedFlag(ctx,flag);
      continue
    }
    if(flag.state==='contested')continue;
    if(flag.state!=='base'||ctx.time-flag.lastActionAt<3200)continue;
    const attackingTeam=flagEnemy(owner),alive=living(ctx,attackingTeam),defenders=living(ctx,owner);if(!alive.length)continue;
    const pressure=(alive.length-defenders.length)*.045+alive.filter(x=>x.role==='tank').length*.02;
    if(ctx.rng()>clamp(.22+pressure,.12,.48))continue;
    const runner=chooseCarrier(ctx,attackingTeam);if(!runner)continue;
    flag.lastActionAt=ctx.time;
    const base=flagBase(owner);
    travelFlagRunner(ctx,runner,base,1900,'attack enemy flag',()=>{
      if(!runner.alive||flag.state!=='base')return;
      runner.position=copy(base);carryFlagHome(ctx,runner,flag,'base')
    })
  }
}
function objectiveTick(ctx){if(ctx.mode==='king-of-the-hill')hillTick(ctx);else if(ctx.mode==='capture-the-flag')flagTick(ctx)}
function runScheduled(ctx){const due=ctx.scheduled.filter(x=>x.at<=ctx.time);ctx.scheduled=ctx.scheduled.filter(x=>x.at>ctx.time);due.forEach(x=>x.fn())}
function ended(ctx){
  const blue=living(ctx,'blue').length,red=living(ctx,'red').length;
  if(ctx.kind==='arena')return blue===0||red===0||ctx.time>=MAX_ARENA_MS;
  if(ctx.mode==='king-of-the-hill'&&(ctx.objective.blue>=100||ctx.objective.red>=100))return true;
  if(ctx.mode==='capture-the-flag'&&(ctx.objective.blue>=3||ctx.objective.red>=3))return true;
  return ctx.time>=MAX_BG_MS
}
function winner(ctx){
  if(ctx.kind==='arena'){
    const b=living(ctx,'blue'),r=living(ctx,'red');if(b.length!==r.length)return b.length>r.length?'blue':'red';
    const bh=b.reduce((n,u)=>n+healthRatio(u),0),rh=r.reduce((n,u)=>n+healthRatio(u),0);return bh===rh?(ctx.rng()<.5?'blue':'red'):(bh>rh?'blue':'red')
  }
  if(ctx.objective.blue!==ctx.objective.red)return ctx.objective.blue>ctx.objective.red?'blue':'red';
  if(ctx.stats.blue.kills!==ctx.stats.red.kills)return ctx.stats.blue.kills>ctx.stats.red.kills?'blue':'red';
  return ctx.rng()<.5?'blue':'red'
}
function simulate({blue=[],red=[],kind='arena',mode='arena',size=null,seed='cellbound-pvp'}={}){
  if(!Array.isArray(blue)||!Array.isArray(red)||!blue.length||!red.length)throw new Error('PvP combat requires two non-empty teams.');
  const ctx={kind,mode,size:Number(size)||Math.max(blue.length,red.length),time:0,rng:rngFrom(seed),events:[],scheduled:[],units:[],byId:{},stats:{blue:{kills:0,deaths:0,damage:0,healing:0,objectives:0},red:{kills:0,deaths:0,damage:0,healing:0,objectives:0}},objective:null,flag:{blue:{carrier:null},red:{carrier:null}}};
  ctx.units=[...blue.map((u,i)=>normalize(u,'blue',i,blue.length,{kind,mode})),...red.map((u,i)=>normalize(u,'red',i,red.length,{kind,mode}))];ctx.units.forEach(u=>ctx.byId[u.id]=u);
  emit(ctx,'COMBAT_START',{result:'pvp',payload:{kind,mode,size:ctx.size}});
  ctx.units.forEach(u=>emit(ctx,'RESOURCE_STATE',{source:u.id,target:u.id,result:'initial',payload:{resource:u.resource.name,value:u.resource.value,max:u.resource.max}}));
  setupObjective(ctx);
  while(!ended(ctx)){
    runScheduled(ctx);
    ctx.units.forEach(u=>{if(!u.alive&&u.respawnAt&&ctx.time>=u.respawnAt)respawn(ctx,u)});
    regen(ctx);objectiveTick(ctx);ctx.units.forEach(u=>act(ctx,u));ctx.time+=TICK
  }
  runScheduled(ctx);
  const win=winner(ctx),score=kind==='arena'?{blue:living(ctx,'blue').length,red:living(ctx,'red').length}:{blue:Math.round(ctx.objective.blue),red:Math.round(ctx.objective.red)};
  emit(ctx,'COMBAT_END',{result:win==='blue'?'victory':'defeat',payload:{winner:win,kind,mode,score:copy(score)}});
  const finalUnits=ctx.units.map(u=>({id:u.id,characterId:u.characterId,name:u.name,class:u.class,spec:u.spec,role:u.role,team:u.team,health:u.health,maxHealth:u.maxHealth,alive:u.alive,position:copy(u.position),kills:u.kills,deaths:u.deaths,damage:u.damage,healing:u.healing,objectives:u.objectives}));
  return{
    version:VERSION,kind,mode,size:ctx.size,winner:win,outcome:win==='blue'?'victory':'defeat',durationMs:ctx.time,events:ctx.events.sort((a,b)=>a.timestamp-b.timestamp),
    score,scoreText:score.blue+'–'+score.red,objective:copy(ctx.objective),summary:{blue:ctx.stats.blue,red:ctx.stats.red},finalState:{units:finalUnits}
  }
}
function selfTest(){
  const blue=[{id:'b1',name:'Blue Tank',class:'Warrior',spec:'Protection',role:'tank',level:10,pvpPower:130},{id:'b2',name:'Blue Healer',class:'Priest',spec:'Holy',role:'healer',level:10,pvpPower:130},{id:'b3',name:'Blue DPS',class:'Rogue',spec:'Assassination',role:'dps',level:10,pvpPower:130}];
  const red=[{id:'r1',name:'Red Tank',class:'Paladin',spec:'Protection',role:'tank',level:10,pvpPower:128},{id:'r2',name:'Red Healer',class:'Druid',spec:'Restoration',role:'healer',level:10,pvpPower:128},{id:'r3',name:'Red DPS',class:'Hunter',spec:'Marksman',role:'dps',level:10,pvpPower:128}];
  const a=simulate({blue,red,kind:'arena',mode:'arena',size:3,seed:'self-arena'}),b=simulate({blue:[...blue,...blue.map((x,i)=>({...x,id:'ba'+i,name:'Ally '+i}))],red:[...red,...red.map((x,i)=>({...x,id:'ra'+i,name:'Enemy '+i}))],kind:'battleground',mode:'king-of-the-hill',size:6,seed:'self-bg'});
  const tests=[
    {name:'Arena resolves',pass:['blue','red'].includes(a.winner)&&a.events.some(e=>e.type==='DAMAGE_DEALT')},
    {name:'Healing events',pass:a.events.some(e=>e.type==='HEAL_RECEIVED')},
    {name:'Movement events',pass:a.events.some(e=>e.type==='MOVEMENT_START')},
    {name:'PvP deaths',pass:a.events.some(e=>e.type==='PLAYER_DEFEATED')},
    {name:'Objective events',pass:b.events.some(e=>e.type==='OBJECTIVE_UPDATE')},
    {name:'Resources',pass:a.events.some(e=>e.type==='RESOURCE_SPENT')}
  ];return{version:VERSION,passed:tests.filter(x=>x.pass).length,total:tests.length,tests}
}
window.CellboundPvPCombat={VERSION,CLASS_COLORS,simulate,tests:{run:selfTest}};
})();