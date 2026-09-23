(()=>{
'use strict';

const VERSION='1.5.0';
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
const PVP_MAPS={
  'cellwind-bastion':{
    id:'cellwind-bastion',name:'Cellwind Bastion',mode:'capture-the-flag',
    bounds:{left:5,right:95,top:8,bottom:92},
    areas:[
      {id:'blue-keep',name:'BLUE KEEP',x:5,y:28,w:24,h:44,kind:'base',team:'blue'},
      {id:'red-keep',name:'RED KEEP',x:71,y:28,w:24,h:44,kind:'base',team:'red'},
      {id:'north-tunnel',name:'NORTH TUNNEL',x:32,y:10,w:36,h:17,kind:'tunnel'},
      {id:'mid-ruins',name:'SHATTERED COURTYARD',x:31,y:31,w:38,h:38,kind:'mid'},
      {id:'south-tunnel',name:'SOUTH TUNNEL',x:32,y:73,w:36,h:17,kind:'tunnel'}
    ],
    blockers:[
      {id:'blue-rampart-n',x:22,y:34,w:20,h:5},{id:'blue-rampart-s',x:22,y:66,w:20,h:5},
      {id:'red-rampart-n',x:78,y:34,w:20,h:5},{id:'red-rampart-s',x:78,y:66,w:20,h:5},
      {id:'north-tunnel-wall',x:50,y:28,w:36,h:5},{id:'south-tunnel-wall',x:50,y:72,w:36,h:5},
      {id:'centre-ruin-n',x:50,y:36,w:20,h:9},{id:'centre-ruin-s',x:50,y:64,w:20,h:9},
      {id:'west-pillar',x:36,y:50,w:5,h:12},{id:'east-pillar',x:64,y:50,w:5,h:12}
    ],
    nav:[
      {x:18,y:50},{x:27,y:42},{x:27,y:58},
      {x:27,y:18},{x:35,y:18},{x:50,y:18},{x:65,y:18},{x:73,y:18},
      {x:31,y:44},{x:43,y:48},{x:50,y:50},{x:57,y:52},{x:69,y:56},
      {x:27,y:82},{x:35,y:82},{x:50,y:82},{x:65,y:82},{x:73,y:82},
      {x:73,y:42},{x:73,y:58},{x:82,y:50}
    ]
  }
};

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
    respawnAt:0,kills:0,deaths:0,damage:0,healing:0,interrupts:0,cc:0,objectives:0,carryingFlag:null,flagIntent:null,objectiveRole:null,ctfSlot:index,lastObjectiveNotice:0
  }
}
function emit(ctx,type,data={}){ctx.events.push({timestamp:Math.max(0,Math.round(ctx.time)),type,...data})}
function living(ctx,team){return ctx.units.filter(u=>u.team===team&&u.alive)}
function allies(ctx,u){return living(ctx,u.team)}
function enemies(ctx,u){return living(ctx,u.team==='blue'?'red':'blue')}
function healthRatio(u){return u.maxHealth?u.health/u.maxHealth:0}
function distance(a,b){return Math.hypot((a.position.x-b.position.x),(a.position.y-b.position.y))}
function pointInRect(p,r,pad=0){return !!p&&p.x>=r.x-r.w/2-pad&&p.x<=r.x+r.w/2+pad&&p.y>=r.y-r.h/2-pad&&p.y<=r.y+r.h/2+pad}
function segmentsCross(a,b,c,d){
  const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  const on=(p,q,r)=>Math.min(p.x,r.x)-.0001<=q.x&&q.x<=Math.max(p.x,r.x)+.0001&&Math.min(p.y,r.y)-.0001<=q.y&&q.y<=Math.max(p.y,r.y)+.0001;
  const o1=cross(a,b,c),o2=cross(a,b,d),o3=cross(c,d,a),o4=cross(c,d,b);
  if(((o1>0&&o2<0)||(o1<0&&o2>0))&&((o3>0&&o4<0)||(o3<0&&o4>0)))return true;
  if(Math.abs(o1)<.0001&&on(a,c,b))return true;if(Math.abs(o2)<.0001&&on(a,d,b))return true;
  if(Math.abs(o3)<.0001&&on(c,a,d))return true;if(Math.abs(o4)<.0001&&on(c,b,d))return true;
  return false
}
function lineHitsRect(a,b,r,pad=0){
  const left=r.x-r.w/2-pad,right=r.x+r.w/2+pad,top=r.y-r.h/2-pad,bottom=r.y+r.h/2+pad;
  const box={x:r.x,y:r.y,w:r.w+pad*2,h:r.h+pad*2};
  if(pointInRect(a,box)||pointInRect(b,box))return true;
  const tl={x:left,y:top},tr={x:right,y:top},br={x:right,y:bottom},bl={x:left,y:bottom};
  return segmentsCross(a,b,tl,tr)||segmentsCross(a,b,tr,br)||segmentsCross(a,b,br,bl)||segmentsCross(a,b,bl,tl)
}
function mapBlockers(ctx){return Array.isArray(ctx?.map?.blockers)?ctx.map.blockers:[]}
function segmentBlocked(ctx,a,b,pad=0,kind='movement'){
  return mapBlockers(ctx).some(r=>(kind==='los'?r.blocksLos!==false:r.blocksMovement!==false)&&lineHitsRect(a,b,r,pad))
}
function hasLineOfSight(ctx,a,b){
  const ap=a?.position||a,bp=b?.position||b;if(!ap||!bp)return false;
  return !segmentBlocked(ctx,ap,bp,0,'los')
}
function openMapPoint(ctx,p,pad=1){
  const b=ctx?.map?.bounds||{left:5,right:95,top:8,bottom:92};
  let out={x:clamp(Number(p?.x)||50,b.left,b.right),y:clamp(Number(p?.y)||50,b.top,b.bottom)};
  for(const r of mapBlockers(ctx)){
    if(!pointInRect(out,r,pad))continue;
    const opts=[
      {x:r.x-r.w/2-pad-.3,y:out.y},{x:r.x+r.w/2+pad+.3,y:out.y},
      {x:out.x,y:r.y-r.h/2-pad-.3},{x:out.x,y:r.y+r.h/2+pad+.3}
    ].filter(q=>!mapBlockers(ctx).some(b=>pointInRect(q,b,pad*.6)));
    if(opts.length)out=opts.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]
  }
  return{x:clamp(out.x,b.left,b.right),y:clamp(out.y,b.top,b.bottom)}
}
function mapLane(p){return p.y<31?'top':p.y>69?'bottom':'mid'}
function routePressure(ctx,u,p){
  if(!u)return 0;
  const hostile=enemies(ctx,u).reduce((n,e)=>n+(Math.hypot(e.position.x-p.x,e.position.y-p.y)<18?1:0),0);
  const lane=u.routePreference&&mapLane(p)!==u.routePreference?12:0;
  return hostile*7+lane
}
function findMapPath(ctx,from,to,u=null){
  const dest=openMapPoint(ctx,to,1.2),start=openMapPoint(ctx,from,1.2);
  if(!ctx?.map||!segmentBlocked(ctx,start,dest,1.05,'movement'))return[start,dest];
  const nodes=[start,...(ctx.map.nav||[]).map(p=>openMapPoint(ctx,p,.8)),dest];
  const N=nodes.length,distances=Array(N).fill(Infinity),prev=Array(N).fill(-1),used=Array(N).fill(false);distances[0]=0;
  for(let step=0;step<N;step++){
    let at=-1,best=Infinity;for(let i=0;i<N;i++)if(!used[i]&&distances[i]<best){best=distances[i];at=i}
    if(at<0)break;used[at]=true;if(at===N-1)break;
    for(let j=0;j<N;j++){
      if(j===at||used[j]||segmentBlocked(ctx,nodes[at],nodes[j],.9,'movement'))continue;
      const d=Math.hypot(nodes[at].x-nodes[j].x,nodes[at].y-nodes[j].y),cost=d+routePressure(ctx,u,nodes[j]);
      if(distances[at]+cost<distances[j]){distances[j]=distances[at]+cost;prev[j]=at}
    }
  }
  if(!Number.isFinite(distances[N-1]))return[start,dest];
  const path=[];let cur=N-1;while(cur>=0){path.unshift(nodes[cur]);if(cur===0)break;cur=prev[cur]}
  return path.length>=2?path:[start,dest]
}
function nextMapWaypoint(ctx,u,to){
  const path=findMapPath(ctx,u.position,to,u);return path[1]||openMapPoint(ctx,to,1)
}
function move(ctx,u,to,duration=500,reason='position'){
  const from=copy(u.position),target=openMapPoint(ctx,to,1),end=ctx?.map?nextMapWaypoint(ctx,u,target):target;
  const travel=Math.max(180,Math.round((Number(duration)||500)*Math.max(.55,Math.min(1.65,Math.hypot(end.x-from.x,end.y-from.y)/14))));
  u.position=end;emit(ctx,'MOVEMENT_START',{source:u.id,result:reason,payload:{from,to:copy(end),final:copy(target),duration:travel,pathing:Boolean(ctx?.map&&Math.hypot(end.x-target.x,end.y-target.y)>1)}})
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
  if(!source?.alive||!target?.alive||!hasLineOfSight(ctx,source,target))return 0;
  const variance=.90+ctx.rng()*.20,powerScale=clamp(source.pvpPower/125,.68,1.8),guard=target.guardedUntil>ctx.time&&target.guardSource;
  let amount=Math.max(1,Math.round(raw*powerScale*variance*mitigation(target)*(critical?1.55:1)));
  target.health=Math.max(0,target.health-amount);source.damage+=amount;ctx.stats[source.team].damage+=amount;
  emit(ctx,'DAMAGE_DEALT',{source:source.id,target:target.id,ability,amount,result:critical?'critical':'hit',payload:{targetHp:target.health,targetMaxHealth:target.maxHealth,targetHpPct:target.maxHealth?target.health/target.maxHealth*100:0,pvp:true,guarded:Boolean(guard)}});
  if(guard){const protector=ctx.byId[guard];if(protector?.alive){const redirect=Math.max(1,Math.round(amount*.16));protector.health=Math.max(0,protector.health-redirect);emit(ctx,'DAMAGE_DEALT',{source:source.id,target:protector.id,ability:'Guard Redirect',amount:redirect,result:'redirect',payload:{targetHp:protector.health,targetMaxHealth:protector.maxHealth,targetHpPct:protector.health/protector.maxHealth*100,pvp:true,redirected:true}});if(protector.health<=0)defeat(ctx,source,protector)}}
  if(target.health<=0)defeat(ctx,source,target);return amount
}
function applyHeal(ctx,source,target,raw,ability){
  if(!source?.alive||!target?.alive||!hasLineOfSight(ctx,source,target))return 0;
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
  if(target.flagIntent){Object.values(ctx.flag||{}).forEach(flag=>{if(flag?.state==='contested'&&flag.contester===target.id){flag.state='dropped';flag.contester=null;flag.lastActionAt=ctx.time}})}
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
  const cc=kitFor(u).cc;if(!cc||ctx.time<u.nextControl||!target?.alive||!hasLineOfSight(ctx,u,target)||ctx.rng()>.24)return false;
  const duration=Math.round(1800*clamp(1-target.controlResistance/100,.35,1));target.disabledUntil=Math.max(target.disabledUntil,ctx.time+duration);u.nextControl=ctx.time+12000+ctx.rng()*5000;u.cc++;
  emit(ctx,'CROWD_CONTROL',{source:u.id,target:target.id,ability:cc,result:'applied',payload:{duration,pvp:true}});return true
}
function tryInterrupt(ctx,u,target,ability){
  const name=kitFor(u).interrupt;if(!name||!target?.alive||!hasLineOfSight(ctx,u,target)||ctx.rng()>.38)return false;u.interrupts++;
  emit(ctx,'INTERRUPT',{source:u.id,target:target.id,ability:name,result:'success',payload:{interruptedAbility:ability,pvp:true}});target.disabledUntil=Math.max(target.disabledUntil,ctx.time+700);return true
}
function healerAction(ctx,u){
  const target=selectHeal(ctx,u);if(!target)return false;
  const range=30;
  if(!hasLineOfSight(ctx,u,target)||distance(u,target)>range){
    move(ctx,u,target.position,520,!hasLineOfSight(ctx,u,target)?'reposition for healing line of sight':'move into healing range');
    emit(ctx,'LOS_BLOCKED',{source:u.id,target:target.id,result:'heal',payload:{kind:'heal'}});
    return true
  }
  const ability=abilityName(u,'heal'),strong=healthRatio(target)<.42,cost=strong?22:14;if(u.resource.value<cost)return false;
  emit(ctx,'ABILITY_START',{source:u.id,target:target.id,ability,result:'heal',payload:{kind:'heal',castTime:strong?850:0,pvp:true}});
  spendResource(ctx,u,cost);
  if(strong){
    emit(ctx,'CAST_START',{source:u.id,target:target.id,ability,result:'player',payload:{duration:850,interruptible:true,pvp:true}});
    const interrupter=enemies(ctx,u).filter(x=>x.alive&&ctx.time>=x.disabledUntil&&distance(x,u)<=actionRange(x)+6&&hasLineOfSight(ctx,x,u)).sort((a,b)=>distance(a,u)-distance(b,u))[0];
    if(interrupter&&tryInterrupt(ctx,interrupter,u,ability)){emit(ctx,'CAST_CANCELLED',{source:u.id,target:target.id,ability,result:'interrupted',payload:{pvp:true}});return true}
  }
  applyHeal(ctx,u,target,strong?175:118,ability);emit(ctx,'ABILITY_FINISH',{source:u.id,target:target.id,ability,result:'resolved',payload:{kind:'heal',pvp:true}});return true
}
function damageAction(ctx,u,target){
  if(!target?.alive)return false;
  const range=actionRange(u),d=distance(u,target),los=hasLineOfSight(ctx,u,target);
  if(d>range||!los){
    const stop=range>8?{x:u.team==='blue'?target.position.x-14:target.position.x+14,y:target.position.y}:{x:u.team==='blue'?target.position.x-3:target.position.x+3,y:target.position.y};
    move(ctx,u,stop,520,!los?'reposition for line of sight':'engage');
    if(!los)emit(ctx,'LOS_BLOCKED',{source:u.id,target:target.id,result:'attack',payload:{kind:'damage'}});
    return true
  }
  maybeControl(ctx,u,target);
  const kind=u.role==='tank'?'tank':'damage',ability=abilityName(u,kind),cost=u.resource.max<=5?1:18;
  if(u.resource.value<cost){const basic=u.role==='tank'?'Guard Strike':'Basic Attack';emit(ctx,'ABILITY_START',{source:u.id,target:target.id,ability:basic,result:'damage',payload:{kind:'damage',pvp:true}});applyDamage(ctx,u,target,u.role==='tank'?48:54,basic,false);gainResource(ctx,u,u.resource.max<=5?1:18,'builder');return true}
  const critical=ctx.rng()<.16,execute=healthRatio(target)<.28&&/Execute|Kill Shot|Eviscerate|Drain Soul|Finisher/.test(ability);emit(ctx,'ABILITY_START',{source:u.id,target:target.id,ability,result:'damage',payload:{kind:'damage',pvp:true}});spendResource(ctx,u,cost);
  applyDamage(ctx,u,target,(u.role==='tank'?58:76)*(execute?1.45:1),ability,critical);emit(ctx,'ABILITY_FINISH',{source:u.id,target:target.id,ability,result:'resolved',payload:{kind:'damage',pvp:true}});return true
}
function act(ctx,u){
  if(!u.alive||ctx.time<u.disabledUntil||ctx.time<u.nextAction)return;
  if(ctx.mode==='capture-the-flag'&&ctfAct(ctx,u))return;
  maybeDefensive(ctx,u);maybeGuard(ctx,u);
  let acted=false;if(u.role==='healer')acted=healerAction(ctx,u);
  if(!acted)acted=damageAction(ctx,u,selectTarget(ctx,u));
  u.nextAction=ctx.time+(u.role==='healer'?1300:1150)+Math.round(ctx.rng()*450)
}
function regen(ctx){
  ctx.units.forEach(u=>{if(!u.alive)return;const gain=(u.resource.regen||0)*(TICK/1000);if(gain>0&&u.resource.value<u.resource.max){u.resource.value=clamp(u.resource.value+gain,0,u.resource.max);if(ctx.time%1000===0)emit(ctx,'RESOURCE_STATE',{source:u.id,target:u.id,result:'regeneration',payload:{resource:u.resource.name,value:u.resource.value,max:u.resource.max}})}})
}
function teamCentroid(list){if(!list.length)return{x:50,y:50};return{x:list.reduce((n,u)=>n+u.position.x,0)/list.length,y:list.reduce((n,u)=>n+u.position.y,0)/list.length}}
function assignCtfRoles(ctx,team){
  const units=ctx.units.filter(u=>u.team===team),available=[...units],routes=['top','mid','bottom'];
  available.forEach((u,i)=>{u.objectiveRole='skirmisher';u.ctfSlot=i;u.routePreference=routes[(i+(team==='red'?1:0))%routes.length]});
  const tanks=available.filter(u=>u.role==='tank'),healers=available.filter(u=>u.role==='healer'),nonHealers=available.filter(u=>u.role!=='healer');
  const runner=tanks[0]||nonHealers.slice().sort((a,b)=>(b.pvpDefence+b.maxHealth/250)-(a.pvpDefence+a.maxHealth/250))[0]||available[0];
  if(runner){runner.objectiveRole='runner';runner.routePreference=routes[Math.floor(ctx.rng()*routes.length)]}
  const remaining=available.filter(u=>u!==runner&&u.role!=='healer');
  const defenderCount=Math.max(1,Math.round(available.length*.2));
  remaining.slice().sort((a,b)=>(b.role==='tank'?2:0)+(b.pvpDefence||0)/30-((a.role==='tank'?2:0)+(a.pvpDefence||0)/30)).slice(0,defenderCount).forEach(u=>{u.objectiveRole='defender';u.routePreference='mid'});
  healers.forEach(u=>{u.objectiveRole='support';u.routePreference=runner?.routePreference||'mid'});
  remaining.filter(u=>u.objectiveRole==='skirmisher').forEach((u,i)=>{u.objectiveRole=i%2===0?'escort':'skirmisher';if(u.objectiveRole==='escort')u.routePreference=runner?.routePreference||u.routePreference});
  emit(ctx,'OBJECTIVE_UPDATE',{result:'ctf-roles',payload:{team,runner:runner?.id||null,runnerRoute:runner?.routePreference||'mid',defenders:available.filter(u=>u.objectiveRole==='defender').map(u=>u.id),supports:healers.map(u=>u.id),escorts:available.filter(u=>u.objectiveRole==='escort').map(u=>u.id)}})
}
function ctfHomePoint(team){return team==='blue'?{x:16,y:50}:{x:84,y:50}}
function ctfHoldPoint(u){
  const x=u.team==='blue'?20:80,y=clamp(35+(Number(u.ctfSlot)||0)%3*15,22,78);return{x,y}
}
function ctfRolePoint(u){
  const side=u.team==='blue'?1:-1;
  if(u.objectiveRole==='defender')return{x:u.team==='blue'?23:77,y:clamp(35+(u.ctfSlot%3)*15,22,78)};
  if(u.objectiveRole==='runner')return{x:u.team==='blue'?40:60,y:clamp(42+(u.ctfSlot%2)*12,24,76)};
  if(u.objectiveRole==='support')return{x:u.team==='blue'?32:68,y:clamp(54+(u.ctfSlot%2)*12,24,80)};
  if(u.objectiveRole==='escort')return{x:u.team==='blue'?38:62,y:clamp(30+(u.ctfSlot%4)*14,18,82)};
  return{x:50-side*5,y:clamp(24+(u.ctfSlot%5)*13,16,84)}
}
function ctfRunner(ctx,team){
  const alive=living(ctx,team),assigned=alive.find(u=>u.objectiveRole==='runner');
  if(assigned)return assigned;
  const replacement=chooseCarrier(ctx,team);if(replacement)replacement.objectiveRole='runner';return replacement
}
function nearestToPoint(list,p){return list.slice().sort((a,b)=>pvpDistanceToPoint(a,p)-pvpDistanceToPoint(b,p))[0]||null}
function nearbyEnemies(ctx,u,radius=18){return enemies(ctx,u).filter(e=>distance(u,e)<=radius)}
function objectiveTravel(ctx,u,to,reason,onArrive=null){
  if(!u?.alive||u.flagIntent)return false;
  const end=openMapPoint(ctx,to,1.1),path=findMapPath(ctx,u.position,end,u);
  if(path.length<2||pvpDistanceToPoint(u,end)<2){onArrive?.();return true}
  u.flagIntent=reason;
  let elapsed=0,current=copy(u.position);
  for(let i=1;i<path.length;i++){
    const point=path[i],segment=Math.hypot(point.x-current.x,point.y-current.y),duration=Math.round(clamp(280+segment*38,480,2100)),startAt=ctx.time+elapsed,from=copy(current);
    ctx.events.push({timestamp:Math.round(startAt),type:'MOVEMENT_START',source:u.id,result:reason,payload:{from,to:copy(point),final:copy(end),duration,pvpObjective:true,pvpFlag:/flag/i.test(reason),pathIndex:i,pathLength:path.length-1,route:u.routePreference||'mid'}});
    elapsed+=duration;
    const isLast=i===path.length-1;
    ctx.scheduled.push({at:ctx.time+elapsed,fn:()=>{
      if(!u.alive)return;
      u.position=copy(point);
      if(isLast){u.flagIntent=null;u.nextAction=Math.max(u.nextAction,ctx.time+150);onArrive?.()}
    }});
    current=point
  }
  u.nextAction=Math.max(u.nextAction,ctx.time+elapsed+100);
  return true
}
function ctfCarrierAct(ctx,u){
  const stolen=ctx.flag?.[u.carryingFlag],own=ctx.flag?.[u.team];if(!stolen)return false;
  const home=flagBase(u.team);
  if(own?.state==='base'){
    if(pvpDistanceToPoint(u,home)>4){
      objectiveTravel(ctx,u,home,'flag carrier retreat',()=>{if(u.alive&&u.carryingFlag)stolen.position=copy(u.position)});
      return true
    }
    captureFlag(ctx,u,stolen);u.nextAction=ctx.time+1700;return true
  }
  // Own flag is missing: stay in a protected holding pocket and wait for the recovery team.
  const hold=ctfHoldPoint(u);
  if(pvpDistanceToPoint(u,hold)>5){objectiveTravel(ctx,u,hold,'flag carrier hold');return true}
  maybeDefensive(ctx,u);
  const pursuer=nearbyEnemies(ctx,u,9).sort((a,b)=>healthRatio(a)-healthRatio(b))[0];
  if(pursuer&&ctx.time>=u.nextControl)maybeControl(ctx,u,pursuer);
  if(ctx.time-u.lastObjectiveNotice>=3000){
    u.lastObjectiveNotice=ctx.time;
    emit(ctx,'OBJECTIVE_UPDATE',{source:u.id,result:'ctf-standoff',payload:{team:u.team,carrier:u.id,waitingFor:u.team,blue:ctx.objective.blue,red:ctx.objective.red}})
  }
  u.nextAction=ctx.time+850;return true
}
function ctfAct(ctx,u){
  if(u.flagIntent)return true;
  if(u.carryingFlag)return ctfCarrierAct(ctx,u);
  const own=ctx.flag?.[u.team],enemyFlag=ctx.flag?.[flagEnemy(u.team)];
  if(!own||!enemyFlag)return false;

  if(own.state==='carried'){
    const enemyCarrier=ctx.byId[own.carrier];
    if(enemyCarrier?.alive){
      if(u.role==='healer'){
        if(healerAction(ctx,u)){u.nextAction=ctx.time+1250;return true}
        const chaser=living(ctx,u.team).filter(x=>x.id!==u.id&&!x.carryingFlag).sort((a,b)=>distance(a,enemyCarrier)-distance(b,enemyCarrier))[0];
        if(chaser&&distance(u,chaser)>12)objectiveTravel(ctx,u,{x:chaser.position.x+(u.team==='blue'?-5:5),y:chaser.position.y},'support flag recovery');
        else u.nextAction=ctx.time+800;
        return true
      }
      maybeDefensive(ctx,u);maybeGuard(ctx,u);damageAction(ctx,u,enemyCarrier);u.nextAction=ctx.time+1050+Math.round(ctx.rng()*250);return true
    }
  }

  if(own.state==='dropped'){
    const returner=nearestToPoint(living(ctx,u.team).filter(x=>!x.carryingFlag),own.position);
    if(returner?.id===u.id){
      own.state='contested';own.contester=u.id;
      objectiveTravel(ctx,u,own.position,'return dropped flag',()=>{if(u.alive&&own.state==='contested'&&own.contester===u.id)resetFlag(ctx,own,'returned',u)});
      return true
    }
  }

  if(enemyFlag.state==='dropped'){
    const recoverer=nearestToPoint(living(ctx,u.team).filter(x=>!x.carryingFlag&&x.objectiveRole!=='defender'),enemyFlag.position);
    if(recoverer?.id===u.id){
      enemyFlag.state='contested';enemyFlag.contester=u.id;
      objectiveTravel(ctx,u,enemyFlag.position,'recover dropped flag',()=>{if(u.alive&&enemyFlag.state==='contested'&&enemyFlag.contester===u.id){enemyFlag.state='dropped';enemyFlag.contester=null;carryFlagHome(ctx,u,enemyFlag,'ground')}});
      return true
    }
  }

  if(u.objectiveRole==='defender'){
    const base=flagBase(u.team),intruder=enemies(ctx,u).filter(e=>pvpDistanceToPoint(e,base)<=25).sort((a,b)=>pvpDistanceToPoint(a,base)-pvpDistanceToPoint(b,base))[0];
    if(intruder){maybeDefensive(ctx,u);damageAction(ctx,u,intruder);u.nextAction=ctx.time+1100+Math.round(ctx.rng()*250);return true}
    const hold=ctfRolePoint(u);if(pvpDistanceToPoint(u,hold)>6)objectiveTravel(ctx,u,hold,'defend flag room');else u.nextAction=ctx.time+850;return true
  }

  if(u.objectiveRole==='runner'&&enemyFlag.state==='base'){
    const base=flagBase(enemyFlag.owner);
    objectiveTravel(ctx,u,base,'attack enemy flag',()=>{if(u.alive&&enemyFlag.state==='base')carryFlagHome(ctx,u,enemyFlag,'base')});
    return true
  }

  if(u.objectiveRole==='support'){
    if(healerAction(ctx,u)){u.nextAction=ctx.time+1250;return true}
    const runner=ctfRunner(ctx,u.team),anchor=runner?.carryingFlag?runner:living(ctx,u.team).find(x=>x.objectiveRole==='escort')||runner;
    if(anchor&&distance(u,anchor)>15)objectiveTravel(ctx,u,{x:anchor.position.x+(u.team==='blue'?-6:6),y:anchor.position.y+5},'support objective group');
    else u.nextAction=ctx.time+800;
    return true
  }

  if(u.objectiveRole==='escort'){
    const runner=ctfRunner(ctx,u.team);
    if(runner&&(runner.flagIntent||runner.carryingFlag)){
      const threats=enemies(ctx,u).filter(e=>distance(e,runner)<=24).sort((a,b)=>distance(a,runner)-distance(b,runner));
      if(threats[0]){damageAction(ctx,u,threats[0]);u.nextAction=ctx.time+1050+Math.round(ctx.rng()*250);return true}
      if(distance(u,runner)>13){objectiveTravel(ctx,u,{x:runner.position.x+(u.team==='blue'?-7:7),y:runner.position.y+(u.ctfSlot%2?7:-7)},'escort flag runner');return true}
    }
  }

  const midfield=enemies(ctx,u).filter(e=>e.objectiveRole!=='defender'||distance(u,e)<20).sort((a,b)=>distance(u,a)-distance(u,b))[0]||selectTarget(ctx,u);
  if(midfield){maybeDefensive(ctx,u);maybeGuard(ctx,u);damageAction(ctx,u,midfield);u.nextAction=ctx.time+1100+Math.round(ctx.rng()*300);return true}
  const point=ctfRolePoint(u);if(pvpDistanceToPoint(u,point)>7)objectiveTravel(ctx,u,point,'hold battleground lane');else u.nextAction=ctx.time+900;
  return true
}
function setupObjective(ctx){
  if(ctx.kind==='arena'){ctx.objective={type:'arena',blue:0,red:0};return}
  if(ctx.mode==='king-of-the-hill'){
    ctx.objective={type:'king-of-the-hill',blue:0,red:0,owner:null};
    ctx.units.forEach((u,i)=>move(ctx,u,{x:50+(u.team==='blue'?-5:5),y:26+(i%(Math.max(1,ctx.size/2)))*Math.min(9,48/Math.max(1,ctx.size/2))},700,'contest hill'))
  }else{
    ctx.objective={type:'capture-the-flag',blue:0,red:0};
    ctx.flag={
      blue:{owner:'blue',carrier:null,contester:null,state:'base',position:{x:12,y:50},droppedAt:0,lastActionAt:0},
      red:{owner:'red',carrier:null,contester:null,state:'base',position:{x:88,y:50},droppedAt:0,lastActionAt:0}
    };
    emit(ctx,'FLAG_STATE',{result:'reset',payload:{team:'blue',owner:'blue',x:12,y:50}});
    emit(ctx,'FLAG_STATE',{result:'reset',payload:{team:'red',owner:'red',x:88,y:50}});
    assignCtfRoles(ctx,'blue');assignCtfRoles(ctx,'red');
    // Let the battlefield render before the opening push so movement is visible.
    ctx.units.forEach((u,i)=>{u.nextAction=Math.max(u.nextAction,1800+i*45)});
    ctx.scheduled.push({at:650,fn:()=>{
      for(const u of ctx.units)move(ctx,u,ctfRolePoint(u),900,'ctf opening push');
      emit(ctx,'OBJECTIVE_UPDATE',{result:'ctf-opening',payload:{mode:'capture-the-flag',blue:0,red:0}})
    }})
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
  return objectiveTravel(ctx,u,to,reason,onArrive)
}
function resetFlag(ctx,flag,reason='returned',source=null){
  if(!flag)return;
  if(flag.carrier&&ctx.byId[flag.carrier])ctx.byId[flag.carrier].carryingFlag=null;
  flag.carrier=null;flag.contester=null;flag.state='base';flag.position=flagBase(flag.owner);flag.droppedAt=0;flag.lastActionAt=ctx.time;
  emit(ctx,'FLAG_STATE',{source:source?.id||null,result:reason,payload:{team:flag.owner,owner:flag.owner,x:flag.position.x,y:flag.position.y}})
}
function carryFlagHome(ctx,u,flag,from='base'){
  if(!u?.alive||!flag||u.team===flag.owner||u.carryingFlag)return false;
  flag.carrier=u.id;flag.contester=null;flag.state='carried';flag.position=copy(u.position);flag.lastActionAt=ctx.time;u.carryingFlag=flag.owner;u.objectives++;
  emit(ctx,'FLAG_STATE',{source:u.id,result:'picked-up',payload:{team:flag.owner,owner:flag.owner,carrier:u.id,from,x:u.position.x,y:u.position.y}});
  emit(ctx,'OBJECTIVE_UPDATE',{source:u.id,result:'ctf-carrier',payload:{team:u.team,carrier:u.id,flag:flag.owner,blue:ctx.objective.blue,red:ctx.objective.red}});
  objectiveTravel(ctx,u,flagBase(u.team),'flag carrier retreat',()=>{if(u.alive&&u.carryingFlag===flag.owner)flag.position=copy(u.position)});
  return true
}
function captureFlag(ctx,u,flag){
  if(!u?.alive||!flag||flag.carrier!==u.id||u.carryingFlag!==flag.owner)return false;
  const own=ctx.flag[u.team];if(!own||own.state!=='base')return false;
  u.carryingFlag=null;flag.carrier=null;flag.contester=null;flag.state='base';flag.position=flagBase(flag.owner);flag.lastActionAt=ctx.time;
  ctx.objective[u.team]++;ctx.stats[u.team].objectives++;
  emit(ctx,'FLAG_STATE',{source:u.id,result:'captured',payload:{team:flag.owner,owner:flag.owner,scoringTeam:u.team,blue:ctx.objective.blue,red:ctx.objective.red,x:flag.position.x,y:flag.position.y}});
  emit(ctx,'OBJECTIVE_UPDATE',{source:u.id,result:'ctf-score',payload:{team:u.team,blue:ctx.objective.blue,red:ctx.objective.red}});
  u.nextAction=Math.max(u.nextAction,ctx.time+1700);
  return true
}
function resolveDroppedFlag(ctx,flag){
  if(!flag||flag.state!=='dropped')return;
  const p=flag.position,defender=nearestToPoint(living(ctx,flag.owner).filter(u=>!u.carryingFlag),p),attackingTeam=flagEnemy(flag.owner),attacker=nearestToPoint(living(ctx,attackingTeam).filter(u=>!u.carryingFlag&&u.objectiveRole!=='defender'),p);
  if(!defender&&!attacker){flag.lastActionAt=ctx.time;return}
  const defenderDist=defender?pvpDistanceToPoint(defender,p):999,attackerDist=attacker?pvpDistanceToPoint(attacker,p):999;
  const returnWins=defender&&(!attacker||defenderDist<=attackerDist+3),actor=returnWins?defender:attacker;if(!actor)return;
  flag.state='contested';flag.contester=actor.id;flag.lastActionAt=ctx.time;
  objectiveTravel(ctx,actor,p,returnWins?'return dropped flag':'recover dropped flag',()=>{
    if(flag.state!=='contested'||flag.contester!==actor.id||!actor.alive)return;
    if(returnWins)resetFlag(ctx,flag,'returned',actor);
    else{flag.state='dropped';flag.contester=null;carryFlagHome(ctx,actor,flag,'ground')}
  })
}
function flagTick(ctx){
  if(ctx.time<1800||ctx.time%500!==0)return;
  for(const owner of ['blue','red']){
    const flag=ctx.flag[owner];if(!flag)continue;
    if(flag.state==='carried'){
      const carrier=ctx.byId[flag.carrier];
      if(!carrier?.alive)continue;
      flag.position=copy(carrier.position);
      if(pvpDistanceToPoint(carrier,flagBase(carrier.team))<=4&&ctx.flag[carrier.team]?.state==='base')captureFlag(ctx,carrier,flag);
      continue
    }
    if(flag.state==='dropped'&&ctx.time-flag.lastActionAt>=700)resolveDroppedFlag(ctx,flag)
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
  const ctx={kind,mode,size:Number(size)||Math.max(blue.length,red.length),time:0,rng:rngFrom(seed),events:[],scheduled:[],units:[],byId:{},map:mode==='capture-the-flag'?PVP_MAPS['cellwind-bastion']:null,stats:{blue:{kills:0,deaths:0,damage:0,healing:0,objectives:0},red:{kills:0,deaths:0,damage:0,healing:0,objectives:0}},objective:null,flag:{blue:{carrier:null},red:{carrier:null}}};
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
    version:VERSION,kind,mode,size:ctx.size,map:ctx.map?copy(ctx.map):null,winner:win,outcome:win==='blue'?'victory':'defeat',durationMs:ctx.time,events:ctx.events.sort((a,b)=>a.timestamp-b.timestamp),
    score,scoreText:score.blue+'–'+score.red,objective:copy(ctx.objective),summary:{blue:ctx.stats.blue,red:ctx.stats.red},finalState:{units:finalUnits}
  }
}
function selfTest(){
  const blue=[{id:'b1',name:'Blue Tank',class:'Warrior',spec:'Protection',role:'tank',level:10,pvpPower:130},{id:'b2',name:'Blue Healer',class:'Priest',spec:'Holy',role:'healer',level:10,pvpPower:130},{id:'b3',name:'Blue DPS',class:'Rogue',spec:'Assassination',role:'dps',level:10,pvpPower:130}];
  const red=[{id:'r1',name:'Red Tank',class:'Paladin',spec:'Protection',role:'tank',level:10,pvpPower:128},{id:'r2',name:'Red Healer',class:'Druid',spec:'Restoration',role:'healer',level:10,pvpPower:128},{id:'r3',name:'Red DPS',class:'Hunter',spec:'Marksman',role:'dps',level:10,pvpPower:128}];
  const a=simulate({blue,red,kind:'arena',mode:'arena',size:3,seed:'self-arena'}),b=simulate({blue:[...blue,...blue.map((x,i)=>({...x,id:'ba'+i,name:'Ally '+i}))],red:[...red,...red.map((x,i)=>({...x,id:'ra'+i,name:'Enemy '+i}))],kind:'battleground',mode:'king-of-the-hill',size:6,seed:'self-bg'}),c=simulate({blue:[...blue,...blue.map((x,i)=>({...x,id:'bc'+i,name:'Blue CTF '+i}))],red:[...red,...red.map((x,i)=>({...x,id:'rc'+i,name:'Red CTF '+i}))],kind:'battleground',mode:'capture-the-flag',size:6,seed:'self-ctf'});
  const flagEvents=c.events.filter(e=>e.type==='FLAG_STATE'),ctfMap=PVP_MAPS['cellwind-bastion'],mapCtx={map:ctfMap};
  const movementEvents=c.events.filter(e=>e.type==='MOVEMENT_START'&&e.payload?.from&&e.payload?.to);
  const tests=[
    {name:'Arena resolves',pass:['blue','red'].includes(a.winner)&&a.events.some(e=>e.type==='DAMAGE_DEALT')},
    {name:'Healing events',pass:a.events.some(e=>e.type==='HEAL_RECEIVED')},
    {name:'Movement events',pass:a.events.some(e=>e.type==='MOVEMENT_START')},
    {name:'PvP deaths',pass:a.events.some(e=>e.type==='PLAYER_DEFEATED')},
    {name:'Objective events',pass:b.events.some(e=>e.type==='OBJECTIVE_UPDATE')},
    {name:'Resources',pass:a.events.some(e=>e.type==='RESOURCE_SPENT')},
    {name:'CTF flag pickup is physical',pass:flagEvents.some(e=>e.result==='picked-up'&&e.source&&Number.isFinite(Number(e.payload?.x))&&Number.isFinite(Number(e.payload?.y)))},
    {name:'CTF flag lifecycle resolves',pass:flagEvents.some(e=>['captured','returned','dropped'].includes(e.result))||c.events.some(e=>e.type==='OBJECTIVE_UPDATE'&&e.result==='ctf-standoff')},
    {name:'CTF carriers hold during a flag standoff',pass:!c.events.some((e,i)=>e.type==='MOVEMENT_START'&&e.result==='flag carrier retreat'&&c.events.slice(Math.max(0,i-6),i).some(x=>x.type==='MOVEMENT_START'&&x.source===e.source&&x.result==='flag carrier hold'))},
    {name:'Cellwind Bastion map is attached to CTF',pass:c.map?.id==='cellwind-bastion'&&Array.isArray(c.map?.blockers)&&c.map.blockers.length>=8},
    {name:'CTF movement respects solid geometry',pass:movementEvents.every(e=>!segmentBlocked(mapCtx,e.payload.from,e.payload.to,.55,'movement'))},
    {name:'PvP walls block line of sight',pass:!hasLineOfSight(mapCtx,{position:{x:34,y:36}},{position:{x:66,y:36}})},
    {name:'CTF exposes alternate routes',pass:new Set(movementEvents.map(e=>e.payload?.route).filter(Boolean)).size>=2}
  ];return{version:VERSION,passed:tests.filter(x=>x.pass).length,total:tests.length,tests}
}
window.CellboundPvPCombat={VERSION,CLASS_COLORS,MAPS:PVP_MAPS,simulate,tests:{run:selfTest}};
})();