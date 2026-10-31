import {bonuses as heroBonuses} from './progression.js';
// Heroes of Emberfall — Block 01. Deterministic, renderer-independent PvE combat.
// Browser-owned demo only; the eventual PvP server must never trust this simulation.
export const WORLD={width:1200,height:640};
export const ABILITIES={
 knight:[
  {name:'Shield Wall',icon:'🛡',cooldown:14,description:'Shield nearby allies for 7 seconds and draw enemy attention.'},
  {name:'Heroic Strike',icon:'⚔',cooldown:7,description:'A heavy attack that briefly stuns the target.'}
 ],
 ranger:[
  {name:'Arrow Storm',icon:'➶',cooldown:9,description:'Rain arrows onto a target and nearby enemies.'},
  {name:'Evasive Step',icon:'↝',cooldown:10,description:'Leap away from danger and gain temporary protection.'}
 ],
 mage:[
  {name:'Emberburst',icon:'✹',cooldown:8,description:'Detonate a fire spell that burns clustered enemies.'},
  {name:'Frostbind',icon:'❄',cooldown:13,description:'Freeze nearby enemies and slow their attacks.'}
 ],
 cleric:[
  {name:'Radiant Mend',icon:'✚',cooldown:7,description:'Restore a large amount of health to the weakest ally.'},
  {name:'Sanctuary',icon:'✦',cooldown:16,description:'Grant the whole party a protective barrier and healing.'}
 ]
};
const clamp=(v,low,high)=>Math.min(high,Math.max(low,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const alive=a=>a&&a.hp>0;
function hero(id,name,role,x,y,hp,range,damage,speed,interval){
 return {id,name,role,faction:'ally',x,y,hp,maxHp:hp,shield:0,range,damage,speed,attackInterval:interval,attackClock:interval*0.45,moveTo:null,focus:null,cooldowns:[0,0],stun:0,slow:0,guard:0,taunt:0,burn:0,burnClock:0,hit:0,attackFlash:0,face:1,kills:0};
}
function enemy(id,name,role,x,y,hp,range,damage,speed,interval){
 return {...hero(id,name,role,x,y,hp,range,damage,speed,interval),faction:'enemy',attackClock:interval*0.7};
}
export function createEncounter(seed=1337,profile=null){
 const encounter={phase:'ready',time:0,seed:seed>>>0||1337,
 heroes:[
  hero('knight','Aldric','Guardian',240,342,164,76,15,122,1.2),
  hero('ranger','Briar','Ranger',144,231,112,270,13,128,1.45),
  hero('mage','Lyra','Arcanist',152,457,98,242,17,108,1.65),
  hero('cleric','Solen','Cleric',104,341,118,222,6,104,1.55)
 ],
 enemies:[
  enemy('boss','Thornwarden','Guardian',947,322,720,86,18,62,2.15),
  enemy('bramble-1','Bramblekin','Bramble',773,198,143,67,9,108,1.78),
  enemy('bramble-2','Bramblekin','Bramble',781,446,143,67,9,106,1.82)
 ],
 selected:'knight',telegraph:null,bossNext:7,reinforcements:false,events:[],
 result:null,stats:{damage:0,healing:0,kills:0},introPlayed:false};
 if(profile){
  for(const h of encounter.heroes){
   const b=heroBonuses(profile,h.id);
   h.level=profile.heroes[h.id]?.level||1;
   h.maxHp+=b.health;h.hp=h.maxHp;
   h.damage+=b.attack;h.speed=(h.speed+b.speed)*(1+b.speedMultiplier);
   h.armour=b.armour;h.damageMultiplier=1+b.damage;
   h.healingMultiplier=1+b.healing;h.shieldMultiplier=1+b.shielding;
   h.skillMultiplier=1+b.skillPower;h.fireMultiplier=1+b.fire;
   h.arrowMultiplier=1+b.arrowPower;h.frostBonus=b.frostDuration;
   h.cooldownMultiplier=Math.max(.67,1-b.cooldown);
  }
 }
 return encounter;
}
function random(g){g.seed=(Math.imul(1664525,g.seed)+1013904223)>>>0;return g.seed/4294967296;}
function emit(g,event){g.events.push(event);if(g.events.length>180)g.events.splice(0,g.events.length-180);}
export function drainEvents(g){return g.events.splice(0);}
export function getHero(g,id){return g.heroes.find(h=>h.id===id)||null;}
export function getUnit(g,id){return [...g.heroes,...g.enemies].find(h=>h.id===id)||null;}
export function startEncounter(g){if(g.phase==='ready'){g.phase='playing';emit(g,{type:'notice',text:'The Thornwarden has awakened!'});}return g;}
export function commandMove(g,id,x,y){
 const h=getHero(g,id);if(g.phase!=='playing'||!alive(h)||!Number.isFinite(x)||!Number.isFinite(y))return false;
 h.moveTo={x:clamp(x,46,WORLD.width-46),y:clamp(y,70,WORLD.height-49)};h.focus=null;
 emit(g,{type:'move',x:h.moveTo.x,y:h.moveTo.y,id});return true;
}
export function commandTarget(g,id,targetId){
 const h=getHero(g,id),target=getUnit(g,targetId);
 if(g.phase!=='playing'||!alive(h)||!alive(target)||target.faction!=='enemy')return false;
 h.focus=targetId;h.moveTo=null;emit(g,{type:'focus',id,targetId,x:target.x,y:target.y});return true;
}
function closest(from,group){let best=null,d=Infinity;for(const u of group)if(alive(u)){const dd=dist(from,u);if(dd<d){best=u;d=dd;}}return best;}
function seek(u,pos,dt,standoff=0){
 const dx=pos.x-u.x,dy=pos.y-u.y,d=Math.hypot(dx,dy);
 if(d<=standoff+3)return true;
 const move=Math.min(Math.max(0,d-standoff),u.speed*(u.slow>0?.47:1)*dt);
 if(move<=0)return false;
 u.x+=dx/d*move;u.y+=dy/d*move;u.face=dx<0?-1:1;
 u.x=clamp(u.x,34,1165);u.y=clamp(u.y,88,595);
 return false;
}
function damage(g,from,to,raw,kind='physical'){
 if(!alive(to))return 0;
 let amount=Math.max(1,Math.round(raw*(from?.damageMultiplier||1)*(0.92+random(g)*.17)));
 let absorbed=Math.min(to.shield,amount);to.shield-=absorbed;amount-=absorbed;
 if(to.guard>0)amount=Math.round(amount*.55);
 amount=Math.max(0,amount-(to.armour||0));
 const actual=Math.min(to.hp,amount);to.hp=Math.max(0,to.hp-actual);to.hit=.24;
 if(from?.faction==='ally')g.stats.damage+=actual;
 if(actual||absorbed)emit(g,{type:'damage',x:to.x,y:to.y-42,value:actual,shielded:absorbed,kind,from:from?.id,to:to.id});
 if(to.hp===0){emit(g,{type:'death',x:to.x,y:to.y,id:to.id,name:to.name});if(from?.faction==='ally'){from.kills++;g.stats.kills++;}}
 return actual;
}
function heal(g,from,to,amount){
 if(!alive(to))return 0;
 const gained=Math.min(to.maxHp-to.hp,Math.round(amount*(from?.healingMultiplier||1)));
 to.hp+=gained;
 if(gained){g.stats.healing+=gained;emit(g,{type:'heal',x:to.x,y:to.y-45,value:gained,from:from?.id,to:to.id});}
 return gained;
}
function shot(g,from,to,kind,amount){
 if(!alive(to))return;
 emit(g,{type:'projectile',fromX:from.x,fromY:from.y-32,toX:to.x,toY:to.y-29,kind});
 damage(g,from,to,amount,kind);
 from.attackFlash=.22;
}
function applyBurn(g,enemy,duration){enemy.burn=Math.max(enemy.burn,duration);enemy.burnClock=.7;}
function chooseTarget(g,h){
 const marked=h.focus?g.enemies.find(x=>x.id===h.focus&&alive(x)):null;
 if(marked)return marked;
 return closest(h,g.enemies);
}
function weakHero(g){return g.heroes.filter(alive).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]||null;}
export function castAbility(g,id,slot){
 const h=getHero(g,id),defs=ABILITIES[id];
 if(g.phase!=='playing'||!alive(h)||!defs||!Number.isInteger(slot)||slot<0||slot>1||h.cooldowns[slot]>0||h.stun>0)return false;
 const target=chooseTarget(g,h),used=defs[slot];let success=false;
 if(id==='knight'&&slot===0){
  for(const ally of g.heroes.filter(alive)){if(dist(ally,h)<230){ally.shield+=Math.round((ally.id===h.id?34:27)*(h.shieldMultiplier||1));ally.guard=Math.max(ally.guard,1.6);emit(g,{type:'shield',x:ally.x,y:ally.y,id:ally.id});}}
  h.taunt=4.4;success=true;
 }else if(id==='knight'&&slot===1&&target&&dist(h,target)<170){
  damage(g,h,target,Math.round(65*(h.skillMultiplier||1)),'strike');if(alive(target))target.stun=1.2;
  emit(g,{type:'burst',x:target.x,y:target.y,color:'#f4cd7e',radius:64});success=true;
 }else if(id==='ranger'&&slot===0&&target){
  for(const mob of g.enemies.filter(alive)){if(dist(mob,target)<165){shot(g,h,mob,'arrow',Math.round((mob.id===target.id?42:29)*(h.arrowMultiplier||1)*(h.skillMultiplier||1)));}}
  emit(g,{type:'burst',x:target.x,y:target.y,color:'#e8b96c',radius:135});success=true;
 }else if(id==='ranger'&&slot===1){
  const enemyNear=closest(h,g.enemies);
  const angle=enemyNear?Math.atan2(h.y-enemyNear.y,h.x-enemyNear.x):Math.PI;
  h.x=clamp(h.x+Math.cos(angle)*128,45,1150);
  h.y=clamp(h.y+Math.sin(angle)*128,85,582);
  h.moveTo=null;h.guard=3.5;emit(g,{type:'burst',x:h.x,y:h.y,color:'#97d9af',radius:75});success=true;
 }else if(id==='mage'&&slot===0&&target){
  for(const mob of g.enemies.filter(alive))if(dist(mob,target)<148){
    damage(g,h,mob,Math.round((mob.id===target.id?54:33)*(h.fireMultiplier||1)*(h.skillMultiplier||1)),'fire');if(alive(mob))applyBurn(g,mob,4.8);
  }
  emit(g,{type:'burst',x:target.x,y:target.y,color:'#ff9b53',radius:150});success=true;
 }else if(id==='mage'&&slot===1&&target){
  for(const mob of g.enemies.filter(alive))if(dist(mob,target)<185){
    damage(g,h,mob,Math.round(18*(h.skillMultiplier||1)),'frost');mob.slow=4.5+(h.frostBonus||0);mob.stun=Math.max(mob.stun,.75+(h.frostBonus||0));
  }
  emit(g,{type:'burst',x:target.x,y:target.y,color:'#9bdff2',radius:185});success=true;
 }else if(id==='cleric'&&slot===0){
  const victim=weakHero(g);if(victim){heal(g,h,victim,59);emit(g,{type:'burst',x:victim.x,y:victim.y,color:'#b9f5c0',radius:65});success=true;}
 }else if(id==='cleric'&&slot===1){
  for(const ally of g.heroes.filter(alive)){heal(g,h,ally,18);ally.shield+=Math.round(24*(h.shieldMultiplier||1));emit(g,{type:'shield',x:ally.x,y:ally.y,id:ally.id});}success=true;
 }
 if(!success)return false;
 h.cooldowns[slot]=used.cooldown*(h.cooldownMultiplier||1);
 emit(g,{type:'ability',id,slot,name:used.name,x:h.x,y:h.y});
 return true;
}
function hitAuto(g,unit,target){
 if(unit.faction==='ally'){
  if(unit.id==='cleric'){
   const victim=weakHero(g);
   if(victim&&victim.hp/victim.maxHp<.78&&dist(unit,victim)<260){heal(g,unit,victim,16);unit.attackFlash=.25;return;}
  }
  const kind=unit.id==='mage'?'magic':unit.id==='ranger'?'arrow':'physical';
  if(unit.range>150)shot(g,unit,target,kind,unit.damage);
  else {damage(g,unit,target,unit.damage,kind);unit.attackFlash=.25;}
 }else{
  damage(g,unit,target,unit.damage,unit.id==='boss'?'claw':'thorn');unit.attackFlash=.23;
 }
}
function resolveBoss(g,dt){
 const boss=g.enemies.find(e=>e.id==='boss');
 if(!alive(boss))return;
 if(!g.reinforcements&&boss.hp<boss.maxHp*.42){
  g.reinforcements=true;
  g.enemies.push(enemy('bramble-3','Bramblekin','Bramble',1000,195,96,67,8,116,1.75));
  g.enemies.push(enemy('bramble-4','Bramblekin','Bramble',1030,455,96,67,8,116,1.8));
  emit(g,{type:'notice',text:'The Thornwarden calls its bramblekin!'});
 }
 if(g.telegraph){
  g.telegraph.remaining-=dt;
  if(g.telegraph.remaining<=0){
   const t=g.telegraph;
   emit(g,{type:'burst',x:t.x,y:t.y,color:'#d57b55',radius:t.radius});
   for(const h of g.heroes.filter(alive))if(dist(h,t)<t.radius)damage(g,boss,h,39,'root slam');
   g.telegraph=null;
  }
 }else if(g.time>=g.bossNext&&boss.stun<=0){
  const target=closest(boss,g.heroes);
  if(target){g.telegraph={x:target.x,y:target.y,radius:120,remaining:1.45,max:1.45};g.bossNext=g.time+8.5;emit(g,{type:'notice',text:'THORN SLAM — move out of the danger circle!'});}
 }
}
function separate(g){
 const units=[...g.heroes,...g.enemies].filter(alive);
 for(let i=0;i<units.length;i++)for(let j=i+1;j<units.length;j++){
  const a=units[i],b=units[j];let dx=a.x-b.x,dy=a.y-b.y;
  const d=Math.hypot(dx,dy)||1, min=a.id==='boss'||b.id==='boss'?62:39;
  if(d<min){let push=Math.min((min-d)*.5,3);dx=dx/d*push;dy=dy/d*push;a.x=clamp(a.x+dx,35,1165);a.y=clamp(a.y+dy,85,590);b.x=clamp(b.x-dx,35,1165);b.y=clamp(b.y-dy,85,590);}
 }
}
export function updateEncounter(g,delta){
 if(g.phase!=='playing')return g;
 const dt=clamp(delta,0,.05);
 g.time+=dt;
 for(const unit of [...g.heroes,...g.enemies]){
  for(let i=0;i<unit.cooldowns.length;i++)unit.cooldowns[i]=Math.max(0,unit.cooldowns[i]-dt);
  for(const k of ['stun','slow','guard','taunt','hit','attackFlash'])unit[k]=Math.max(0,unit[k]-dt);
  if(!alive(unit))continue;
  if(unit.burn>0){
   unit.burn=Math.max(0,unit.burn-dt);unit.burnClock-=dt;
   if(unit.burnClock<=0){unit.burnClock=.85;damage(g,g.heroes.find(h=>h.id==='mage')||null,unit,8,'burn');}
  }
  if(!alive(unit)||unit.stun>0)continue;
  let target;
  if(unit.faction==='ally'){
   if(unit.moveTo){
    if(seek(unit,unit.moveTo,dt,0))unit.moveTo=null;
    continue;
   }
   target=chooseTarget(g,unit);
  }else{
   const taunter=g.heroes.find(h=>alive(h)&&h.taunt>0);
   target=taunter||closest(unit,g.heroes);
  }
  if(!target)continue;
  if(dist(unit,target)>unit.range)seek(unit,target,dt,Math.max(0,unit.range-12));
  else{unit.face=target.x<unit.x?-1:1;unit.attackClock-=dt;
   if(unit.attackClock<=0){hitAuto(g,unit,target);unit.attackClock=unit.attackInterval*(unit.slow>0?1.6:1);}
  }
 }
 resolveBoss(g,dt);
 separate(g);
 const aliveEnemies=g.enemies.some(alive),aliveHeroes=g.heroes.some(alive);
 if(!aliveEnemies){g.phase='victory';g.result='The Hollow Is Safe';emit(g,{type:'notice',text:'VICTORY — The Thornwarden is defeated!'});}
 else if(!aliveHeroes){g.phase='defeat';g.result='The Company Has Fallen';emit(g,{type:'notice',text:'DEFEAT — Your heroes were overwhelmed.'});}
 return g;
}
