(()=>{
'use strict';
/* Job 11A — render-only Ashen Vault atmosphere. Never schedules or edits combat
   outcomes. The authoritative Combat Reborn event renderer remains untouched. */
const SELECTOR='#cb2dArena.theme-ashen[data-bespoke-battlefield="1"]';
const MAX_BURSTS=7;
const mounted=new WeakSet();
const reduce=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||navigator.connection?.saveData);
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
function mount(arena,options={}){
 if(!arena?.matches?.(SELECTOR))return false;
 arena.querySelector(':scope > .cbcin-atmosphere')?.remove();
 const layer=document.createElement('div');
 layer.className='cbcin-atmosphere';
 layer.setAttribute('aria-hidden','true');
 layer.innerHTML='<i class="cbcin-ray left"></i><i class="cbcin-ray right"></i><i class="cbcin-haze"></i><div class="cbcin-burst-layer"></div>';
 if(!reduce())for(let i=0;i<13;i++){
  const p=document.createElement('i');p.className='cbcin-ember';
  p.style.setProperty('--x',(6+(i*37)%89)+'%');
  p.style.setProperty('--size',i%4===0?'3px':'2px');
  p.style.setProperty('--drift',((i%5)-2)*19+'px');
  p.style.setProperty('--delay',(-i*.73).toFixed(2)+'s');
  p.style.setProperty('--duration',(7+i%5*1.1).toFixed(1)+'s');
  layer.appendChild(p);
 }
 arena.appendChild(layer);
 arena.dataset.cinematic='ashen-v1';
 arena.dataset.cinematicRoom=String(options.room||arena.dataset.collisionProfile||'ashen').replace(/[^a-z0-9-]/g,'');
 mounted.add(arena);
 return true;
}
function point(arena,target){
 const r=arena.getBoundingClientRect(),t=target?.getBoundingClientRect?.();
 if(!t||!r.width||!r.height)return{x:50,y:50};
 return{x:clamp((t.left+t.width/2-r.left)/r.width*100,5,95),y:clamp((t.top+t.height/2-r.top)/r.height*100,8,92)};
}
function burst(arena,kind,target){
 if(reduce()||document.hidden)return null;
 const layer=arena.querySelector('.cbcin-burst-layer');if(!layer)return null;
 const existing=layer.querySelectorAll('.cbcin-burst');
 if(existing.length>=MAX_BURSTS)existing[0].remove();
 const el=document.createElement('i'),pos=point(arena,target);
 el.className='cbcin-burst '+kind;
 el.style.setProperty('--x',pos.x+'%');el.style.setProperty('--y',pos.y+'%');
 layer.appendChild(el);
 el.addEventListener('animationend',()=>el.remove(),{once:true});
 setTimeout(()=>el.remove(),kind==='phase'?1450:750);
 return el;
}
function omen(arena,message){
 if(reduce()||document.hidden)return;
 const layer=arena.querySelector('.cbcin-burst-layer');if(!layer)return;
 layer.querySelector('.cbcin-omen')?.remove();
 const e=document.createElement('strong');e.className='cbcin-omen';e.textContent=message;
 layer.appendChild(e);e.addEventListener('animationend',()=>e.remove(),{once:true});
 setTimeout(()=>e.remove(),2200);
}
let lastImpact=0;
function visual(event){
 const d=event?.detail,arena=d?.arena;
 if(!arena?.matches?.(SELECTOR)||arena.dataset.cinematic!=='ashen-v1'||!mounted.has(arena))return;
 const type=d.type,target=d.target||d.source;
 if(type==='PHASE_CHANGE'){
  burst(arena,'phase',d.source||d.target);
  omen(arena,'THE VAULT STIRS');return;
 }
 if(type==='MECHANIC_TELEGRAPH'){
  // Subtle environmental glow, underneath all actual telegraph geometry.
  if(!reduce())burst(arena,'phase',target);
  return;
 }
 if(type==='INTERRUPT'&&d.event?.result==='success'){burst(arena,'interrupt',target);return}
 if(type==='ENEMY_DEFEATED'&&d.target?.classList?.contains('boss')){burst(arena,'phase',d.target);return}
 if(type==='DAMAGE_DEALT'&&d.event?.result==='critical'){
  const now=Date.now();if(now-lastImpact>180){lastImpact=now;burst(arena,'hit',target)}
 }
}
window.addEventListener('cellbound:combat-visual',visual,{passive:true});
window.CellboundCinematicAshen=Object.freeze({mount,version:'11A.1'});
})();
