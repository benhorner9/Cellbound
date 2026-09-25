(()=>{
'use strict';
/*
 * Cellbound Combat Visual Language v3
 * Presentation only. Combat Reborn remains authoritative for every outcome.
 * This layer consumes engine events and gives every combat viewer the same
 * movement, reaction, cast, threat, death and mechanic animation language.
 */
const VERSION='3.0.0';
const FX=window.CellboundCombatFX=window.CellboundCombatFX||{};
const BASE_MOUNT=typeof FX.mount==='function'?FX.mount.bind(FX):null;
const ARENA_SELECTOR='.cb2d-arena,.quest-cb2d-arena,.wb2d-arena,.pvp2d-arena,#tbArena';
const UNIT_SELECTORS=['[data-unit]','[data-tb-unit]','[data-tb-boss]','[data-combat-id]','[data-pvp-unit]'];
const hpValues=new WeakMap();
const castTimers=new WeakMap();
const reduce=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const cssEscape=v=>window.CSS?.escape?CSS.escape(String(v)):String(v).replace(/["\\]/g,'\\$&');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

const CLASS_ACCENTS={
  'death-knight':'#C41E3A','demon-hunter':'#A330C9','druid':'#FF7C0A','evoker':'#33937F',
  'hunter':'#AAD372','mage':'#3FC7EB','monk':'#00FF98','paladin':'#F48CBA','priest':'#FFFFFF',
  'rogue':'#FFF468','shaman':'#0070DD','warlock':'#8788EE','warrior':'#C69B6D'
};

function arenaFor(target){
  const el=typeof target==='string'?document.querySelector(target):target;
  if(el?.matches?.(ARENA_SELECTOR))return el;
  if(el?.closest)return el.closest(ARENA_SELECTOR);
  return document.querySelector(ARENA_SELECTOR)
}
function point(arena,el){
  if(!arena?.getBoundingClientRect||!el?.getBoundingClientRect)return{x:50,y:50};
  const a=arena.getBoundingClientRect(),r=el.getBoundingClientRect();
  return{x:clamp((r.left+r.width/2-a.left)/Math.max(1,a.width)*100,0,100),y:clamp((r.top+r.height/2-a.top)/Math.max(1,a.height)*100,0,100)}
}
function classKey(el){
  if(!el?.classList)return'enemy';
  for(const k of Object.keys(CLASS_ACCENTS))if(el.classList.contains(k))return k;
  const cls=[...el.classList].find(x=>/^class-/.test(x));
  if(cls){
    const k=cls.replace(/^class-/,'');
    if(CLASS_ACCENTS[k])return k
  }
  return el.classList.contains('enemy')||el.classList.contains('boss')?'enemy':'cell'
}
function accentFor(el,kind=''){
  if(kind==='heal')return'#66efa3';
  if(kind==='enemy'||el?.classList?.contains('enemy')||el?.classList?.contains('boss'))return'#ef6a62';
  return CLASS_ACCENTS[classKey(el)]||'#78d7cf'
}
function unitFor(id,opts={},arena=null){
  if(!id)return null;
  if(typeof opts.resolve==='function'){
    try{
      const resolved=opts.resolve(id);
      if(Array.isArray(resolved))return resolved.find(Boolean)?.el||resolved.find(Boolean)||null;
      if(resolved?.el)return resolved.el;
      if(resolved)return resolved
    }catch(_){}
  }
  const root=opts.root||arena||document,s=String(id),esc=cssEscape(s);
  const queries=[
    '[data-unit="'+esc+'"]',
    '[data-tb-unit="'+esc+'"]',
    '[data-combat-id="'+esc+'"]',
    '[data-pvp-unit="'+esc+'"]'
  ];
  if(s.startsWith('tb-'))queries.unshift('[data-tb-boss="'+cssEscape(s.slice(3))+'"]');
  if(s==='boss')queries.unshift('#wb2dBoss');
  for(const q of queries){
    try{const el=root.querySelector?.(q)||document.querySelector(q);if(el)return el}catch(_){}
  }
  return null
}
function layer(arena){
  return arena?.querySelector?.('.cbvfx3-events')||null
}
function addEventNode(arena,className,x=50,y=50,life=800,html=''){
  if(!arena||reduce())return null;
  const host=layer(arena);if(!host)return null;
  const n=document.createElement('i');n.className=className;n.style.left=x+'%';n.style.top=y+'%';if(html)n.innerHTML=html;
  host.appendChild(n);setTimeout(()=>n.remove(),life);return n
}
function pulseClass(el,cls,ms=420){
  if(!el||reduce())return;
  el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(()=>el?.classList?.remove(cls),ms)
}
function labelAt(arena,target,text,kind='info'){
  if(!arena||!target||!text||reduce())return;
  const p=point(arena,target),n=addEventNode(arena,'cbvfx3-word '+kind,p.x,p.y,760);
  if(n)n.textContent=String(text)
}
function action(source,target,e,arena){
  if(!source||!arena||reduce())return;
  const kind=String(e?.payload?.kind||'').toLowerCase();
  const ranged=/ranged|spell|heal|group-heal/.test(kind)||/shot|bolt|ball|wrath|judgement|barrage|flame|light|heal|rejuv|growth|shock|embrace|blossom/i.test(String(e?.ability||''));
  const heal=/heal/.test(kind)||/rejuvenation|regrowth|wild growth|holy light|holy shock|light of dawn|verdant|emerald|dream breath|renew|flash heal|prayer/i.test(String(e?.ability||''));
  const melee=!ranged&&!heal;
  source.style.setProperty('--cbvfx3-accent',accentFor(source,heal?'heal':''));
  pulseClass(source,'cbvfx3-acting',melee?300:420);
  pulseClass(source,heal?'cbvfx3-heal-cast':ranged?'cbvfx3-ranged-cast':'cbvfx3-melee-cast',heal?520:ranged?460:320);
  const p=point(arena,source);
  addEventNode(arena,'cbvfx3-action-flare '+(heal?'heal':ranged?'ranged':'melee'),p.x,p.y,heal?620:520);
  if(target){
    target.style.setProperty('--cbvfx3-accent',accentFor(source,heal?'heal':''));
    pulseClass(target,'cbvfx3-targeted',360)
  }
}
function castStart(source,e,arena){
  if(!source||!arena)return;
  source.style.setProperty('--cbvfx3-accent',accentFor(source));
  source.classList.add('cbvfx3-casting');
  if(source.classList.contains('boss')||source.classList.contains('enemy')){
    arena.classList.add('cbvfx3-boss-windup');
    pulseClass(source,'cbvfx3-danger-windup',Math.max(500,Math.min(1800,Number(e?.payload?.duration)||1000)))
  }
  const p=point(arena,source);
  addEventNode(arena,'cbvfx3-cast-ring',p.x,p.y,Math.max(650,Math.min(2100,Number(e?.payload?.duration)||1200)));
  const old=castTimers.get(source);if(old)clearTimeout(old);
  castTimers.set(source,setTimeout(()=>castEnd(source,arena),Math.max(800,Number(e?.payload?.duration)||1600)+200))
}
function castEnd(source,arena){
  if(source){source.classList.remove('cbvfx3-casting','cbvfx3-danger-windup');const t=castTimers.get(source);if(t)clearTimeout(t);castTimers.delete(source)}
  arena?.classList?.remove('cbvfx3-boss-windup')
}
function react(target,e,arena){
  if(!target)return;
  const amount=Math.max(0,Number(e?.amount)||0),critical=e?.result==='critical';
  pulseClass(target,critical||amount>120?'cbvfx3-heavy-hit':'cbvfx3-hit',critical?520:360);
  if(critical)labelAt(arena,target,'CRIT','crit');
  if(['block','blocked'].includes(String(e?.result||'').toLowerCase())){pulseClass(target,'cbvfx3-block',500);labelAt(arena,target,'BLOCK','guard')}
  if(['dodge','dodged','miss','missed','immune'].includes(String(e?.result||'').toLowerCase())){pulseClass(target,'cbvfx3-dodge',440);labelAt(arena,target,String(e.result).toUpperCase(),'avoid')}
}
function healReact(target,arena){
  if(!target)return;target.style.setProperty('--cbvfx3-accent','#66efa3');pulseClass(target,'cbvfx3-healed',560);
  const p=point(arena,target);addEventNode(arena,'cbvfx3-heal-rise',p.x,p.y,760)
}
function defensive(target,arena){
  if(!target)return;target.style.setProperty('--cbvfx3-accent','#a7d8ff');pulseClass(target,'cbvfx3-defensive',760);
  const p=point(arena,target);addEventNode(arena,'cbvfx3-shield',p.x,p.y,900)
}
function aggro(target,source,arena){
  if(target){pulseClass(target,'cbvfx3-aggro-target',950);labelAt(arena,target,'AGGRO','aggro')}
  if(source)pulseClass(source,'cbvfx3-aggro-snap',520)
}
function fallen(target,boss=false){
  if(!target)return;target.classList.add('cbvfx3-fallen');if(boss)target.classList.add('cbvfx3-boss-fallen')
}
function revive(target,arena){
  if(!target)return;target.classList.remove('cbvfx3-fallen','cbvfx3-boss-fallen','dead','dying');pulseClass(target,'cbvfx3-revive',1100);
  const p=point(arena,target);addEventNode(arena,'cbvfx3-revive-pillar',p.x,p.y,1200)
}
function mechanicState(arena,state='warning',e=null){
  if(!arena)return;
  arena.classList.remove('cbvfx3-mechanic-warning','cbvfx3-mechanic-impact','cbvfx3-mechanic-safe','cbvfx3-hazard-active');
  const cls=state==='safe'?'cbvfx3-mechanic-safe':state==='impact'?'cbvfx3-mechanic-impact':state==='active'?'cbvfx3-hazard-active':'cbvfx3-mechanic-warning';
  pulseClass(arena,cls,state==='warning'?900:620);
  if(state==='warning'&&e?.ability){
    const n=addEventNode(arena,'cbvfx3-mechanic-name',50,10,1000);if(n)n.textContent=String(e.ability).toUpperCase()
  }
}
function observeHealth(arena){
  if(!arena||arena.dataset.cbvfx3HealthObserver==='1')return;
  arena.dataset.cbvfx3HealthObserver='1';
  const scan=el=>{
    const bars=[];
    if(el?.matches?.('.cb2d-unit-hp>i,.pvp2d-hp>i,.wb2d-unit-hp>i,.quest-cb2d-unit-hp>i'))bars.push(el);
    el?.querySelectorAll?.('.cb2d-unit-hp>i,.pvp2d-hp>i,.wb2d-unit-hp>i,.quest-cb2d-unit-hp>i').forEach(x=>bars.push(x));
    for(const bar of bars){
      const v=parseFloat(bar.style.width||'');if(!Number.isFinite(v))continue;
      const prev=hpValues.get(bar);hpValues.set(bar,v);
      if(Number.isFinite(prev)&&v<prev-.5){const host=bar.parentElement;pulseClass(host,'cbvfx3-health-drop',430)}
      else if(Number.isFinite(prev)&&v>prev+.5){const host=bar.parentElement;pulseClass(host,'cbvfx3-health-gain',430)}
    }
  };
  arena.querySelectorAll?.('.cb2d-unit-hp>i,.pvp2d-hp>i,.wb2d-unit-hp>i,.quest-cb2d-unit-hp>i').forEach(scan);
  const o=new MutationObserver(records=>{for(const r of records){if(r.type==='attributes')scan(r.target);for(const n of r.addedNodes||[])if(n.nodeType===1)scan(n)}});
  o.observe(arena,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});
  arena._cbvfx3HealthObserver=o
}
function mount(target){
  const arena=arenaFor(target);if(!arena)return null;
  if(arena.dataset.cbvfx3Mounted==='1')return arena;
  arena.dataset.cbvfx3Mounted='1';
  const host=document.createElement('div');host.className='cbvfx3-events';host.setAttribute('aria-hidden','true');
  host.innerHTML='<i class="cbvfx3-vignette"></i><i class="cbvfx3-depth"></i>';
  arena.appendChild(host);observeHealth(arena);requestAnimationFrame(()=>arena.classList.add('cbvfx3-ready'));return arena
}
function mountAll(root=document){root.querySelectorAll?.(ARENA_SELECTOR).forEach(mount)}
function combatEvent(e,opts={}){
  if(!e)return;
  const arena=mount(arenaFor(opts.arena||opts.root)||arenaFor(unitFor(e.source,opts))||arenaFor(unitFor(e.target,opts)));if(!arena)return;
  const source=unitFor(e.source,opts,arena),target=unitFor(e.target,opts,arena);
  try{
    switch(e.type){
      case'COMBAT_START': arena.classList.add('cbvfx3-combat-live');break;
      case'ABILITY_START':action(source,target,e,arena);break;
      case'CAST_START':castStart(source,e,arena);break;
      case'CAST_CANCELLED':case'CAST_FINISH':castEnd(source,arena);break;
      case'DAMAGE_DEALT':react(target,e,arena);break;
      case'HEAL_RECEIVED':healReact(target,arena);break;
      case'DEFENSIVE_ACTIVATED':defensive(target||source,arena);break;
      case'CROWD_CONTROL':if(target){pulseClass(target,'cbvfx3-controlled',Math.min(1200,Number(e.payload?.duration)||850));labelAt(arena,target,'CONTROL','control')}break;
      case'INTERRUPT':if(e.result==='success'){pulseClass(target,'cbvfx3-interrupted',620);labelAt(arena,target,'INTERRUPT','interrupt');castEnd(target,arena)}break;
      case'AGGRO_CHANGED':aggro(target,source,arena);break;
      case'MECHANIC_TELEGRAPH':mechanicState(arena,'warning',e);break;
      case'MECHANIC_RESOLVE':mechanicState(arena,e.result==='avoided'||e.result==='interrupted'?'safe':'impact',e);break;
      case'GROUND_HAZARD_SPAWNED':mechanicState(arena,'active',e);break;
      case'PHASE_CHANGE':pulseClass(arena,'cbvfx3-phase',900);break;
      case'ENRAGE':arena.classList.add('cbvfx3-enraged');pulseClass(arena,'cbvfx3-enrage-pulse',900);break;
      case'ADD_SPAWNED':if(target){const p=point(arena,target);addEventNode(arena,'cbvfx3-spawn-ring',p.x,p.y,900)}break;
      case'PLAYER_DEFEATED':case'ADD_DEFEATED':case'ENEMY_DEFEATED':fallen(target,e.type==='ENEMY_DEFEATED'&&target?.classList?.contains('boss'));break;
      case'PLAYER_REVIVED':case'ENEMY_REVIVED':revive(target,arena);break;
      case'COMBAT_END':arena.classList.remove('cbvfx3-combat-live','cbvfx3-enraged','cbvfx3-boss-windup');break;
    }
  }catch(err){console.warn('Cellbound visual event skipped',e?.type,err)}
}
function init(){
  mountAll();
  const observer=new MutationObserver(records=>{for(const rec of records)for(const node of rec.addedNodes){if(node.nodeType!==1)continue;if(node.matches?.(ARENA_SELECTOR))mount(node);node.querySelectorAll?.(ARENA_SELECTOR).forEach(mount)}});
  observer.observe(document.documentElement,{childList:true,subtree:true})
}

FX.mount=(target)=>{let arena=null;try{arena=BASE_MOUNT?BASE_MOUNT(target):arenaFor(target)}catch(_){arena=arenaFor(target)}return mount(arena||target)};
FX.mountV3=mount;
FX.mountAllV3=mountAll;
FX.combatEvent=combatEvent;
FX.action=action;
FX.revive=revive;
FX.mechanicState=mechanicState;
FX.VERSION_VISUAL=VERSION;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();