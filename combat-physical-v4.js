(()=>{
'use strict';
/*
 * Cellbound Physical Combat & Class Identity v4
 * Presentation-only extension to Combat Visual Language v3.
 * Combat Reborn / authoritative PvP and server event streams remain the sole gameplay authority.
 */
const VERSION='4.0.0';
const FX=window.CellboundCombatFX=window.CellboundCombatFX||{};
const BASE_EVENT=typeof FX.combatEvent==='function'?FX.combatEvent.bind(FX):null;
const BASE_MOUNT=typeof FX.mount==='function'?FX.mount.bind(FX):null;
const ARENA_SELECTOR='.cb2d-arena,.quest-cb2d-arena,.wb2d-arena,.pvp2d-arena,#tbArena';
const UNIT_SELECTOR='.cb2d-unit,.quest-cb2d-unit,.wb2d-unit,.pvp2d-unit,.tb-unit';
const reduce=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const projectileCounts=new WeakMap();

const PROFILES={
 'class-warrior':{name:'Warrior',accent:'#C69B6D',motion:'heavy',projectile:'steel',cast:'brace',lunge:12,recoil:1.18,travel:245},
 'class-paladin':{name:'Paladin',accent:'#F48CBA',motion:'radiant',projectile:'holy',cast:'radiant',lunge:9,recoil:1.08,travel:280},
 'class-priest':{name:'Priest',accent:'#FFFFFF',motion:'support',projectile:'holy',cast:'holy',lunge:3,recoil:.92,travel:310},
 'class-druid':{name:'Druid',accent:'#FF7C0A',motion:'fluid',projectile:'nature',cast:'nature',lunge:5,recoil:.96,travel:300},
 'class-hunter':{name:'Hunter',accent:'#AAD372',motion:'marksman',projectile:'arrow',cast:'aim',lunge:2,recoil:.96,travel:225},
 'class-rogue':{name:'Rogue',accent:'#FFF468',motion:'dart',projectile:'blade',cast:'quick',lunge:15,recoil:.82,travel:210},
 'class-mage':{name:'Mage',accent:'#3FC7EB',motion:'caster',projectile:'arcane',cast:'arcane',lunge:2,recoil:.90,travel:300},
 'class-death-knight':{name:'Death Knight',accent:'#C41E3A',motion:'brutal',projectile:'death',cast:'death',lunge:11,recoil:1.22,travel:280},
 'class-demon-hunter':{name:'Demon Hunter',accent:'#A330C9',motion:'rush',projectile:'fel',cast:'fel',lunge:17,recoil:.78,travel:215},
 'class-evoker':{name:'Evoker',accent:'#33937F',motion:'breath',projectile:'emerald',cast:'essence',lunge:4,recoil:.94,travel:285},
 'class-monk':{name:'Monk',accent:'#00FF98',motion:'flow',projectile:'chi',cast:'chi',lunge:12,recoil:.84,travel:240},
 'class-shaman':{name:'Shaman',accent:'#0070DD',motion:'storm',projectile:'lightning',cast:'storm',lunge:4,recoil:.96,travel:235},
 'class-warlock':{name:'Warlock',accent:'#8788EE',motion:'occult',projectile:'shadow',cast:'shadow',lunge:2,recoil:.94,travel:315}
};
const ENEMY={name:'Enemy',accent:'#EF5C50',motion:'enemy',projectile:'hostile',cast:'hostile',lunge:10,recoil:1.08,travel:275};

function arenaFor(target){
 const el=typeof target==='string'?document.querySelector(target):target;
 if(el?.matches?.(ARENA_SELECTOR))return el;
 return el?.closest?.(ARENA_SELECTOR)||null
}
function resolveUnit(id,opts={},arena=null){
 if(!id)return null;
 if(typeof opts.resolve==='function'){
  try{
   const r=opts.resolve(id);
   if(Array.isArray(r)){const x=r.find(Boolean);return x?.el||x||null}
   return r?.el||r||null
  }catch(_){}
 }
 const root=opts.root||arena||document,s=String(id);
 const safe=window.CSS?.escape?CSS.escape(s):s.replace(/["\\]/g,'\\$&');
 const qs=[
  '[data-unit="'+safe+'"]','[data-q-unit="'+safe+'"]','[data-tb-unit="'+safe+'"]',
  '[data-pvp2d-unit="'+safe+'"]','[data-combat-id="'+safe+'"]'
 ];
 if(s.startsWith('tb-'))qs.unshift('[data-tb-boss="'+(window.CSS?.escape?CSS.escape(s.slice(3)):s.slice(3))+'"]');
 if(s==='boss')qs.unshift('#wb2dBoss');
 for(const q of qs){try{const n=root.querySelector?.(q)||document.querySelector(q);if(n)return n}catch(_){}}
 return null
}
function profileFor(el){
 if(!el?.classList)return ENEMY;
 for(const [key,p] of Object.entries(PROFILES))if(el.classList.contains(key))return p;
 return (el.classList.contains('enemy')||el.classList.contains('boss'))?ENEMY:ENEMY
}
function actorNode(unit){
 if(!unit)return null;
 return unit.querySelector?.('.pvp2d-token,.wb2d-unit-dot,:scope > i:first-child')||unit
}
function point(arena,el){
 if(!arena?.getBoundingClientRect||!el?.getBoundingClientRect)return{x:50,y:50,px:0,py:0};
 const a=arena.getBoundingClientRect(),r=el.getBoundingClientRect(),px=r.left+r.width/2-a.left,py=r.top+r.height/2-a.top;
 return{x:clamp(px/Math.max(1,a.width)*100,0,100),y:clamp(py/Math.max(1,a.height)*100,0,100),px,py}
}
function eventLayer(arena){
 let host=arena?.querySelector?.('.cbvfx4-events');
 if(host)return host;
 if(!arena)return null;
 host=document.createElement('div');host.className='cbvfx4-events';host.setAttribute('aria-hidden','true');arena.appendChild(host);
 return host
}
function pulse(el,cls,ms=500){
 if(!el||reduce())return;
 el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(()=>el?.classList?.remove(cls),ms)
}
function markProfile(unit){
 if(!unit||unit.dataset.cbvfx4Profile)return;
 const p=profileFor(unit);unit.dataset.cbvfx4Profile=p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
 unit.style.setProperty('--cbvfx4-accent',p.accent);
 unit.style.setProperty('--cbvfx4-recoil',String(p.recoil));
 ensureGround(unit)
}
function ensureGround(unit){
 if(!unit||unit.querySelector(':scope > .cbvfx4-ground'))return;
 const g=document.createElement('i');g.className='cbvfx4-ground';unit.appendChild(g)
}
function scanUnits(root=document){
 root.querySelectorAll?.(UNIT_SELECTOR).forEach(markProfile)
}
function mount(target){
 let arena=null;try{arena=BASE_MOUNT?BASE_MOUNT(target):arenaFor(target)}catch(_){arena=arenaFor(target)}
 arena=arena||arenaFor(target);if(!arena)return null;
 if(arena.dataset.cbvfx4Mounted!=='1'){
  arena.dataset.cbvfx4Mounted='1';eventLayer(arena);scanUnits(arena);requestAnimationFrame(()=>arena.classList.add('cbvfx4-ready'))
 }
 return arena
}
function setProjectileState(arena,on){
 const n=Math.max(0,(projectileCounts.get(arena)||0)+(on?1:-1));projectileCounts.set(arena,n);
 arena?.classList?.toggle('cbvfx4-profile-projectile',n>0)
}
function makeProjectile(arena,source,target,profile,type='damage',ability=''){
 if(!arena||!source||!target||reduce())return;
 const a=point(arena,source),b=point(arena,target),dx=b.px-a.px,dy=b.py-a.py,angle=Math.atan2(dy,dx)*180/Math.PI;
 const heal=type==='heal',hostile=profile===ENEMY;
 const p=document.createElement('i');
 p.className='cbvfx4-projectile '+(heal?'heal ':'')+(hostile?'hostile ':'')+profile.projectile;
 p.dataset.ability=String(ability||'');
 p.style.left=a.px+'px';p.style.top=a.py+'px';p.style.setProperty('--cbvfx4-accent',heal?'#6ff0aa':profile.accent);
 p.style.setProperty('--cbvfx4-angle',angle+'deg');
 const host=eventLayer(arena);if(!host)return;host.appendChild(p);setProjectileState(arena,true);
 const duration=Math.max(170,Number(profile.travel)||270);
 requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!p.isConnected)return;p.style.transitionDuration=duration+'ms';p.style.transform='translate3d('+dx+'px,'+dy+'px,0) rotate('+angle+'deg)'}));
 setTimeout(()=>{p.remove();setProjectileState(arena,false)},duration+90)
}
function actionKind(e,source,profile){
 const kind=String(e?.payload?.kind||'').toLowerCase(),ability=String(e?.ability||'').toLowerCase();
 const heal=/heal|group-heal/.test(kind)||/heal|rejuven|regrowth|growth|light|shock|embrace|blossom|breath|renew|prayer|tranquil/.test(ability);
 if(heal)return'heal';
 const ranged=/ranged|spell/.test(kind)||/shot|bolt|ball|wrath|judg|barrage|flame|nova|arrow|lightning|chain|breath|blast/.test(ability)||
  ['Hunter','Mage','Priest','Druid','Evoker','Shaman','Warlock'].includes(profile.name);
 return ranged?'ranged':'melee'
}
function physicalAction(source,target,e,arena){
 if(!source||!arena||reduce())return;
 markProfile(source);if(target)markProfile(target);
 const p=profileFor(source),kind=actionKind(e,source,p),actor=actorNode(source);
 source.dataset.cbvfx4Action=kind;source.style.setProperty('--cbvfx4-accent',kind==='heal'?'#6ff0aa':p.accent);
 if(actor&&target&&kind==='melee'){
  const a=point(arena,source),b=point(arena,target),len=Math.hypot(b.px-a.px,b.py-a.py)||1,dist=Math.min(p.lunge,Math.max(4,len*.10));
  actor.style.setProperty('--cbvfx4-lunge-x',((b.px-a.px)/len*dist).toFixed(1)+'px');
  actor.style.setProperty('--cbvfx4-lunge-y',((b.py-a.py)/len*dist).toFixed(1)+'px')
 }
 pulse(source,'cbvfx4-'+p.motion,kind==='melee'?430:560);
 pulse(source,'cbvfx4-'+kind,kind==='melee'?430:560);
 if(target)pulse(target,'cbvfx4-target',340);
 const castTime=Number(e?.payload?.castTime)||0;
 if(kind!=='melee'&&castTime<=0)makeProjectile(arena,source,target,p,kind,e?.ability)
}
function castCharge(source,e,arena){
 if(!source||!arena||reduce())return;
 markProfile(source);const p=profileFor(source),actor=actorNode(source),pos=point(arena,source),host=eventLayer(arena);if(!host)return;
 source.classList.add('cbvfx4-charging','cbvfx4-cast-'+p.cast);
 const orb=document.createElement('i');orb.className='cbvfx4-charge '+p.cast;orb.style.left=pos.px+'px';orb.style.top=pos.py+'px';orb.style.setProperty('--cbvfx4-accent',p.accent);host.appendChild(orb);
 const dur=Math.max(520,Math.min(2200,Number(e?.payload?.duration)||Number(e?.payload?.castTime)||1100));setTimeout(()=>orb.remove(),dur+100);
 if(actor)pulse(actor,'cbvfx4-cast-body',dur)
}
function endCharge(source){
 if(!source)return;[...source.classList].filter(x=>x==='cbvfx4-charging'||x.startsWith('cbvfx4-cast-')).forEach(x=>source.classList.remove(x))
}
function impact(target,e,arena){
 if(!target||reduce())return;markProfile(target);const actor=actorNode(target),amount=Math.max(0,Number(e?.amount)||0),crit=e?.result==='critical';
 const heavy=crit||amount>=120||/slam|smash|crush|obliterate|mortal|execute|barrage|storm|swipe|strike/i.test(String(e?.ability||''));
 pulse(target,heavy?'cbvfx4-impact-heavy':'cbvfx4-impact-light',heavy?520:330);
 if(actor){actor.style.setProperty('--cbvfx4-impact-x',(heavy?'-5px':'-2px'));actor.style.setProperty('--cbvfx4-impact-scale',heavy?'0.92':'0.97')}
 const p=point(arena,target),n=document.createElement('i');n.className='cbvfx4-impact '+(heavy?'heavy':'light')+(crit?' critical':'');n.style.left=p.px+'px';n.style.top=p.py+'px';eventLayer(arena)?.appendChild(n);setTimeout(()=>n.remove(),650)
}
function healingImpact(target,arena){
 if(!target||reduce())return;markProfile(target);pulse(target,'cbvfx4-heal-receive',640);
 const p=point(arena,target),n=document.createElement('i');n.className='cbvfx4-heal-impact';n.style.left=p.px+'px';n.style.top=p.py+'px';eventLayer(arena)?.appendChild(n);setTimeout(()=>n.remove(),800)
}
function enemyAttack(source,target,e,arena){
 if(!source||!target||reduce())return;markProfile(source);
 const ability=String(e?.ability||''),ranged=/shot|bolt|burst|barrage|flame|nail|plate|arrow|beam|breath|volley|missile/i.test(ability);
 const heavy=/slam|smash|crush|swipe|storm|cleave|heavy|massive|devour|maul/i.test(ability);
 pulse(source,heavy?'cbvfx4-enemy-heavy':'cbvfx4-enemy-strike',heavy?650:430);
 if(ranged)makeProjectile(arena,source,target,ENEMY,'damage',ability)
}
function bossTelegraph(e,arena,source){
 if(!arena||reduce())return;
 const boss=source||arena.querySelector('.boss,.enemy.big,#wb2dBoss,[data-tb-boss]');
 if(boss){markProfile(boss);pulse(boss,'cbvfx4-boss-intent',Math.max(700,Math.min(1600,Number(e?.payload?.duration)||1100)))}
 arena.classList.add('cbvfx4-telegraph-incoming');
 setTimeout(()=>arena?.classList?.remove('cbvfx4-telegraph-incoming'),Math.max(650,Math.min(1800,Number(e?.payload?.duration)||1000)))
}
function mechanicResolve(e,arena){
 if(!arena)return;arena.classList.remove('cbvfx4-telegraph-incoming');
 pulse(arena,e?.result==='avoided'||e?.result==='interrupted'?'cbvfx4-resolve-safe':'cbvfx4-resolve-impact',620)
}
function aggro(target,source){
 if(target){markProfile(target);pulse(target,'cbvfx4-aggro',1000)}
 if(source)pulse(source,'cbvfx4-turn',520)
}
function death(target,boss=false){
 if(!target)return;markProfile(target);target.classList.add('cbvfx4-dead');if(boss)target.classList.add('cbvfx4-boss-dead')
}
function revive(target,arena){
 if(!target)return;target.classList.remove('cbvfx4-dead','cbvfx4-boss-dead');pulse(target,'cbvfx4-revive',1100);
 if(reduce())return;const p=point(arena,target),n=document.createElement('i');n.className='cbvfx4-revive-ring';n.style.left=p.px+'px';n.style.top=p.py+'px';eventLayer(arena)?.appendChild(n);setTimeout(()=>n.remove(),1100)
}
function visualHook(type,e,arena,source,target){
 try{window.dispatchEvent(new CustomEvent('cellbound:combat-visual',{detail:{type,event:e,arena,source,target}}))}catch(_){}
}
function encounterBurst(arena,x,y,kind,life=900){
 if(!arena||reduce())return;
 const n=document.createElement('i');n.className='cbvfx4-encounter '+kind;n.style.left=x+'%';n.style.top=y+'%';eventLayer(arena)?.appendChild(n);setTimeout(()=>n.remove(),life)
}
function throwEncounterObject(arena,source,target,kind='plate',duration=430){
 if(!arena||!source||!target||reduce())return;
 const a=point(arena,source),b=point(arena,target),dx=b.px-a.px,dy=b.py-a.py,angle=Math.atan2(dy,dx)*180/Math.PI;
 const n=document.createElement('i');n.className='cbvfx4-thrown '+kind;n.style.left=a.px+'px';n.style.top=a.py+'px';n.style.setProperty('--cbvfx4-angle',angle+'deg');eventLayer(arena)?.appendChild(n);
 requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!n.isConnected)return;n.style.transitionDuration=duration+'ms';n.style.transform='translate3d('+dx+'px,'+dy+'px,0) rotate('+(angle+540)+'deg)'}));
 setTimeout(()=>n.remove(),duration+100)
}
function encounterSpecific(e,arena,source,target){
 const ability=String(e?.ability||'').toLowerCase();
 if(e.type==='MECHANIC_TELEGRAPH'&&ability.includes('thrown plate'))throwEncounterObject(arena,source,target,'plate',Math.max(320,Math.min(650,Number(e?.payload?.duration)||430)));
 if(e.type==='GROUND_HAZARD_SPAWNED'&&ability.includes('plate')){
  const x=clamp(Number(e?.position?.x)||50,0,100),y=clamp(Number(e?.position?.y)||50,0,100);encounterBurst(arena,x,y,'porcelain',1050)
 }
 if(e.type==='INTERACTION_REQUIRED'&&ability.includes('screech')){
  const p=point(arena,source||target||arena);encounterBurst(arena,p.x,p.y,'screech',1150)
 }
 if(e.type==='DAMAGE_DEALT'&&ability.includes('healer swipe')&&target){
  const p=point(arena,target);encounterBurst(arena,p.x,p.y,'swipe',700)
 }
 if(e.type==='MECHANIC_TELEGRAPH'&&ability.includes('nail storm')&&source){
  const p=point(arena,source);encounterBurst(arena,p.x,p.y,'nailstorm',Math.max(900,Number(e?.payload?.duration)||1200))
 }
}
function physicalEvent(e,opts={}){
 if(!e)return;
 const arena=mount(arenaFor(opts.arena||opts.root)||arenaFor(resolveUnit(e.source,opts))||arenaFor(resolveUnit(e.target,opts)));if(!arena)return;
 const source=resolveUnit(e.source,opts,arena),target=resolveUnit(e.target,opts,arena);if(source)markProfile(source);if(target)markProfile(target);visualHook(e.type,e,arena,source,target);encounterSpecific(e,arena,source,target);
 switch(e.type){
  case'COMBAT_START':scanUnits(arena);arena.classList.add('cbvfx4-live');break;
  case'ABILITY_START':
   if(source&&(source.classList.contains('enemy')||source.classList.contains('boss')||String(e.source||'').startsWith('tb-')||e.source==='boss'))enemyAttack(source,target,e,arena);
   else physicalAction(source,target,e,arena);
   break;
  case'CAST_START':castCharge(source,e,arena);if(source&&(source.classList.contains('enemy')||source.classList.contains('boss')))pulse(arena,'cbvfx4-boss-cast',Math.max(650,Math.min(1500,Number(e?.payload?.duration)||1000)));break;
  case'CAST_FINISH':case'CAST_CANCELLED':endCharge(source);break;
  case'ABILITY_FINISH':
   if(source&&target&&Number(e?.payload?.castTime)>0){const p=profileFor(source),kind=actionKind(e,source,p);if(kind!=='melee')makeProjectile(arena,source,target,p,kind,e?.ability)}break;
  case'DAMAGE_DEALT':impact(target,e,arena);break;
  case'HEAL_RECEIVED':healingImpact(target,arena);break;
  case'DEFENSIVE_ACTIVATED':if(target||source)pulse(target||source,'cbvfx4-defensive',850);break;
  case'CROWD_CONTROL':if(target)pulse(target,'cbvfx4-cc',Math.min(1200,Number(e?.payload?.duration)||900));break;
  case'INTERRUPT':if(e.result==='success'){endCharge(target);if(target)pulse(target,'cbvfx4-interrupt-break',650)}break;
  case'AGGRO_CHANGED':aggro(target,source);break;
  case'MECHANIC_TELEGRAPH':bossTelegraph(e,arena,source);break;
  case'MECHANIC_RESOLVE':mechanicResolve(e,arena);break;
  case'GROUND_HAZARD_SPAWNED':arena.classList.add('cbvfx4-hazard-live');break;
  case'GROUND_HAZARD_EXPIRED':if(!arena.querySelector('.cb2d-ground-hazard,.quest-ground-hazard,.wb2d-ground-hazard'))arena.classList.remove('cbvfx4-hazard-live');break;
  case'PHASE_CHANGE':pulse(arena,'cbvfx4-phase',1050);if(source)pulse(source,'cbvfx4-phase-boss',1050);break;
  case'ENRAGE':arena.classList.add('cbvfx4-enrage');pulse(arena,'cbvfx4-enrage-pulse',950);break;
  case'PLAYER_DEFEATED':case'ADD_DEFEATED':case'ENEMY_DEFEATED':death(target,e.type==='ENEMY_DEFEATED'&&target?.classList?.contains('boss'));break;
  case'PLAYER_REVIVED':case'ENEMY_REVIVED':revive(target,arena);break;
  case'COMBAT_END':arena.classList.remove('cbvfx4-live','cbvfx4-enrage','cbvfx4-telegraph-incoming','cbvfx4-hazard-live');break
 }
}
function combatEvent(e,opts={}){
 try{BASE_EVENT?.(e,opts)}catch(err){console.warn('Cellbound v3 visual event skipped',e?.type,err)}
 try{physicalEvent(e,opts)}catch(err){console.warn('Cellbound v4 physical visual event skipped',e?.type,err)}
}
function init(){
 document.querySelectorAll(ARENA_SELECTOR).forEach(mount);scanUnits();
 const observer=new MutationObserver(records=>{for(const rec of records)for(const node of rec.addedNodes){if(node.nodeType!==1)continue;if(node.matches?.(ARENA_SELECTOR))mount(node);if(node.matches?.(UNIT_SELECTOR))markProfile(node);node.querySelectorAll?.(ARENA_SELECTOR).forEach(mount);node.querySelectorAll?.(UNIT_SELECTOR).forEach(markProfile)}});
 observer.observe(document.documentElement,{childList:true,subtree:true})
}
FX.combatEvent=combatEvent;
FX.physicalEvent=physicalEvent;
FX.visualProfiles=PROFILES;
FX.VERSION_PHYSICAL=VERSION;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();