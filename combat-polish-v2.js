(()=>{
'use strict';
const VERSION='2.0.0';
const reduce=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const ARENA_SELECTOR='.cb2d-arena,.quest-cb2d-arena,.wb2d-arena,.pvp2d-arena';
const THEMES=[
  ['#cb2dBackdrop','ashen'],['#hs2dBackdrop','hollow'],['#cc2dBackdrop','chaos'],['#bs2dBackdrop','blackout'],
  ['#fracturedAgesBackdrop','fractured'],['.fa-backdrop','fractured'],['.quest-cb2d-backdrop','quest'],
  ['.wb2d-backdrop','world'],['.pvp2d-backdrop','pvp'],['.pvp2d-shell','pvp']
];
function arenaFor(target){
  const el=typeof target==='string'?document.querySelector(target):target;
  if(!el)return null;
  return el.matches?.(ARENA_SELECTOR)?el:el.closest?.(ARENA_SELECTOR)||null
}
function themeFor(arena){
  for(const [sel,theme] of THEMES)if(arena.closest?.(sel))return theme;
  if(arena.classList?.contains('hs2d-arena'))return'hollow';
  if(arena.classList?.contains('cc2d-arena'))return'chaos';
  if(arena.classList?.contains('bs-arena'))return'blackout';
  if(arena.classList?.contains('wb2d-arena'))return'world';
  if(arena.classList?.contains('pvp2d-arena'))return'pvp';
  if(arena.classList?.contains('quest-cb2d-arena'))return'quest';
  return'cell'
}
function mount(target){
  const arena=arenaFor(target);if(!arena||arena.dataset.cbvfxMounted==='1'||arena.id==='tbArena')return arena;
  arena.dataset.cbvfxMounted='1';arena.dataset.cbvfxTheme=themeFor(arena);
  const layer=document.createElement('div');layer.className='cbvfx-layer';layer.setAttribute('aria-hidden','true');
  layer.innerHTML='<i class="cbvfx-haze h1"></i><i class="cbvfx-haze h2"></i><i class="cbvfx-motes"></i><i class="cbvfx-sweep"></i><div class="cbvfx-events"></div>';
  arena.insertBefore(layer,arena.firstChild);
  requestAnimationFrame(()=>arena.classList.add('cbvfx-ready'));
  return arena
}
function mountAll(root=document){
  root.querySelectorAll?.(ARENA_SELECTOR).forEach(mount)
}
function point(arena,target){
  const el=typeof target==='string'?arena.querySelector(target)||document.querySelector(target):target;
  if(!el?.getBoundingClientRect)return{x:50,y:50};
  const a=arena.getBoundingClientRect(),r=el.getBoundingClientRect();
  return{x:((r.left+r.width/2-a.left)/Math.max(1,a.width))*100,y:((r.top+r.height/2-a.top)/Math.max(1,a.height))*100}
}
function burst(target,kind='damage',opts={}){
  const arena=mount(arenaFor(target));if(!arena||reduce())return;
  const p=point(arena,target),events=arena.querySelector('.cbvfx-events');if(!events)return;
  const el=document.createElement('i');el.className='cbvfx-burst '+kind+(opts.critical?' critical':'');
  el.style.left=p.x+'%';el.style.top=p.y+'%';
  if(opts.scale)el.style.setProperty('--cbvfx-scale',String(opts.scale));
  events.appendChild(el);setTimeout(()=>el.remove(),kind==='death'?1050:760)
}
function impact(target,opts={}){burst(target,opts.kind||'damage',opts)}
function heal(target,opts={}){burst(target,'heal',opts)}
function interrupt(target,opts={}){burst(target,'interrupt',opts);const a=arenaFor(target);pulse(a,'interrupt')}
function death(target,opts={}){burst(target,'death',opts);const el=typeof target==='string'?document.querySelector(target):target;el?.classList?.add('cbvfx-fallen');setTimeout(()=>el?.classList?.remove('cbvfx-fallen'),900)}
function spawn(target,opts={}){burst(target,'spawn',opts)}
function pulse(target,kind='mechanic'){
  const arena=mount(arenaFor(target)||target);if(!arena||reduce())return;
  const cls='cbvfx-'+kind+'-pulse';arena.classList.remove(cls);void arena.offsetWidth;arena.classList.add(cls);
  setTimeout(()=>arena.classList.remove(cls),kind==='phase'?900:620)
}
function boss(target,name=''){
  const arena=mount(arenaFor(target)||target);if(!arena)return;
  pulse(arena,'boss');if(name)arena.dataset.cbvfxBoss=name;
  const events=arena.querySelector('.cbvfx-events');if(!events||reduce())return;
  const el=document.createElement('i');el.className='cbvfx-boss-ring';events.appendChild(el);setTimeout(()=>el.remove(),1200)
}
function phase(target){pulse(target,'phase')}
function mechanic(target,state='warning'){pulse(target,state==='safe'?'safe':'mechanic')}
function victory(target){
  const arena=mount(arenaFor(target)||target);if(!arena||reduce())return;
  pulse(arena,'victory');const events=arena.querySelector('.cbvfx-events');if(!events)return;
  for(let i=0;i<10;i++){const p=document.createElement('i');p.className='cbvfx-spark';p.style.setProperty('--i',i);events.appendChild(p);setTimeout(()=>p.remove(),1250)}
}
function event(target,type,opts={}){
  if(type==='damage'||type==='critical')return impact(target,{...opts,critical:type==='critical'});
  if(type==='heal')return heal(target,opts);
  if(type==='interrupt')return interrupt(target,opts);
  if(type==='death')return death(target,opts);
  if(type==='spawn')return spawn(target,opts);
  if(type==='phase')return phase(target);
  if(type==='boss')return boss(target,opts.name||'');
  if(type==='victory')return victory(target);
  return mechanic(target,type)
}
const observer=new MutationObserver(records=>{
  for(const rec of records)for(const node of rec.addedNodes){
    if(node.nodeType!==1)continue;
    if(node.matches?.(ARENA_SELECTOR))mount(node);
    node.querySelectorAll?.(ARENA_SELECTOR).forEach(mount)
  }
});
function init(){mountAll();observer.observe(document.documentElement,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CellboundCombatFX={VERSION,mount,mountAll,impact,heal,interrupt,death,spawn,pulse,boss,phase,mechanic,victory,event};
})();