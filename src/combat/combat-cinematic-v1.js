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


/* Job 11B — shared cinematic appearance for every Combat Reborn battlefield.
   Existing Ashen showcase remains intact; all additional environments keep
   their own art, encounter geometry, physical FX and combat authority. */
(()=>{
'use strict';
const FX=window.CellboundCombatFX||{};
const oldMount=FX.mount;
const states=new WeakMap();
const MAX_GLOBAL_BURSTS=6;
const palettes=Object.freeze({
  hollow:{accent:'#9bdbed',glow:'rgba(88,199,224,.22)',mist:'rgba(81,138,189,.24)',edge:'rgba(8,21,40,.40)',mote:'rgba(146,224,244,.8)',name:'THE SANCTUM AWAKENS'},
  chaos:{accent:'#b6e19c',glow:'rgba(134,218,112,.19)',mist:'rgba(117,151,96,.22)',edge:'rgba(10,23,15,.41)',mote:'rgba(210,244,157,.78)',name:'THE CANYON SHIFTS'},
  blackout:{accent:'#93dff0',glow:'rgba(86,202,229,.22)',mist:'rgba(71,124,156,.24)',edge:'rgba(4,14,22,.43)',mote:'rgba(159,238,255,.88)',name:'THE REACTOR SURGES'},
  fractured:{accent:'#c9b3ef',glow:'rgba(183,116,219,.21)',mist:'rgba(124,114,177,.23)',edge:'rgba(17,10,27,.37)',mote:'rgba(224,194,255,.83)',name:'TIME FRACTURES'},
  manor:{accent:'#ecc69b',glow:'rgba(220,158,93,.17)',mist:'rgba(159,122,110,.21)',edge:'rgba(24,12,17,.42)',mote:'rgba(247,215,167,.75)',name:'THE MANOR STIRS'},
  pvp:{accent:'#e8b4a7',glow:'rgba(217,107,97,.17)',mist:'rgba(137,109,114,.16)',edge:'rgba(20,12,20,.40)',mote:'rgba(233,185,172,.68)',name:'BATTLE INTENSIFIES'},
  quest:{accent:'#edd3a4',glow:'rgba(215,160,89,.17)',mist:'rgba(147,127,100,.20)',edge:'rgba(19,18,21,.36)',mote:'rgba(237,201,147,.70)',name:'THE ENCOUNTER SHIFTS'},
  twelve:{accent:'#9bc6db',glow:'rgba(99,154,188,.21)',mist:'rgba(113,148,167,.19)',edge:'rgba(8,16,25,.42)',mote:'rgba(185,221,234,.73)',name:'THE DEPTHS ANSWER'},
  world:{accent:'#b4d2ad',glow:'rgba(134,184,135,.19)',mist:'rgba(112,164,152,.18)',edge:'rgba(8,24,23,.38)',mote:'rgba(197,238,203,.67)',name:'THE FOE UNLEASHES POWER'},
  null:{accent:'#97c3ed',glow:'rgba(116,142,232,.18)',mist:'rgba(100,118,186,.23)',edge:'rgba(14,13,35,.44)',mote:'rgba(195,192,247,.79)',name:'REALITY UNRAVELS'},
  shared:{accent:'#e6c59f',glow:'rgba(214,150,96,.17)',mist:'rgba(141,133,130,.17)',edge:'rgba(15,17,20,.36)',mote:'rgba(228,200,168,.68)',name:'THE BATTLE TURNS'}
});
const reduce=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||window.navigator?.connection?.saveData);
const bounded=(n,min,max)=>Math.min(max,Math.max(min,n));
const ARENA='.cb2d-arena,.quest-cb2d-arena,.wb2d-arena,.pvp2d-arena,#tbArena';
function themeFor(arena){
 if(!arena?.matches?.(ARENA))return null;
 // Job 11A already handles its approved stage art and event treatment.
 if(arena.matches('#cb2dArena.theme-ashen[data-bespoke-battlefield="1"]'))return null;
 if(arena.matches('.hs2d-arena'))return 'hollow';
 if(arena.matches('.cc2d-arena'))return 'chaos';
 if(arena.matches('.bs-arena,#bsArena'))return 'blackout';
 if(arena.matches('.cbpvp-stage,.pvp2d-arena,[data-pvp-unit-stage]'))return 'pvp';
 if(arena.matches('.wb2d-arena'))return 'world';
 if(arena.matches('#tbArena,.tb-arena'))return 'twelve';
 const classes=String(arena.className?.baseVal||arena.className||'');
 const shell=arena.closest?.('.cbcombat-shell');
 const context=classes+' '+String(shell?.className||'')+' '+String(shell?.dataset?.combatTheme||'');
 if(/(?:theme-|stage-|room-)(?:manor|maid|butler|engineer|attic)\b|manor/i.test(context))return 'manor';
 if(/(?:theme-|stage-|room-)null\b|null-complex/i.test(context))return 'null';
 if(/(?:theme-|stage-|room-)(?:fractured|high-noon|iron-kingdom|first-kingdom|silent-frontier|funhouse)\b|\bfa-(?:high|iron|first|silent|funhouse)/i.test(context)||arena.closest?.('[class*="fa-"]'))return 'fractured';
 if(arena.matches('.quest-cb2d-arena,#q2dArena'))return 'quest';
 if(/(?:theme-|room-)hollow\b/i.test(context))return 'hollow';
 if(/(?:theme-|room-)chaos\b/i.test(context))return 'chaos';
 if(/(?:theme-|room-)blackout\b/i.test(context))return 'blackout';
 if(/(?:theme-|room-)ashen\b/i.test(context))return 'shared';
 return 'shared';
}
function mount(target){
 const arena=typeof target==='string'?document.querySelector(target):target;
 const theme=themeFor(arena);
 if(!theme)return false;
 const current=states.get(arena),existing=arena.querySelector(':scope > .cbcin-world-stage');
 if(current?.theme===theme&&existing?.isConnected&&existing===current.layer)return true;
 existing?.remove();
 const colors=palettes[theme],layer=document.createElement('div');
 layer.className='cbcin-world-stage';
 layer.setAttribute('aria-hidden','true');
 layer.innerHTML='<i class="cbcin-world-ray"></i><i class="cbcin-world-ray second"></i><i class="cbcin-world-mist"></i><div class="cbcin-world-bursts"></div>';
 if(!reduce())for(let i=0;i<10;i++){
  const particle=document.createElement('i');
  particle.className='cbcin-world-mote';
  particle.style.setProperty('--x',(7+(i*31)%87)+'%');
  particle.style.setProperty('--delay',(-i*.9)+'s');
  particle.style.setProperty('--drift',((i%5)-2)*16+'px');
  particle.style.setProperty('--duration',(7+(i%4)*1.5)+'s');
  layer.appendChild(particle);
 }
 arena.appendChild(layer);
 arena.dataset.cinematic='global-v1';arena.dataset.cinematicTheme=theme;
 for(const [name,value]of Object.entries({'--cbcin-accent':colors.accent,'--cbcin-glow':colors.glow,'--cbcin-mist':colors.mist,'--cbcin-edge':colors.edge,'--cbcin-mote':colors.mote}))arena.style.setProperty(name,value);
 const shell=arena.closest?.('.cbcombat-shell');
 if(shell){shell.dataset.cinematicHud='1';shell.style.setProperty('--cbcin-hud-accent',colors.accent);shell.style.setProperty('--cbcin-hud-glow',colors.glow)}
 states.set(arena,{theme,layer,lastImpact:0});
 return true;
}
function locate(arena,element){
 const a=arena.getBoundingClientRect(),b=element?.getBoundingClientRect?.();
 if(!b||!a.width||!a.height)return{x:50,y:50};
 return{x:bounded((b.left+b.width/2-a.left)/a.width*100,5,95),y:bounded((b.top+b.height/2-a.top)/a.height*100,5,95)};
}
function burst(arena,kind,target){
 if(reduce()||document.hidden)return false;
 const layer=states.get(arena)?.layer?.querySelector('.cbcin-world-bursts');if(!layer)return false;
 const previous=layer.querySelectorAll('.cbcin-world-burst');
 if(previous.length>=MAX_GLOBAL_BURSTS)previous[0].remove();
 const el=document.createElement('i'),p=locate(arena,target);
 el.className='cbcin-world-burst '+kind;
 el.style.setProperty('--x',p.x+'%');el.style.setProperty('--y',p.y+'%');
 layer.appendChild(el);el.addEventListener('animationend',()=>el.remove(),{once:true});
 setTimeout(()=>el.remove(),kind==='phase'?1250:700);
 return true;
}
function announce(arena,message){
 if(reduce()||document.hidden)return;
 const layer=states.get(arena)?.layer?.querySelector('.cbcin-world-bursts');if(!layer)return;
 layer.querySelector('.cbcin-world-omen')?.remove();
 const el=document.createElement('strong');
 el.className='cbcin-world-omen';el.textContent=message;layer.appendChild(el);
 el.addEventListener('animationend',()=>el.remove(),{once:true});
 setTimeout(()=>el.remove(),2100);
}
function visual(evt){
 const info=evt?.detail,arena=info?.arena;
 if(!arena?.matches?.(ARENA)||!mount(arena))return;
 const state=states.get(arena),type=info.type,target=info.target||info.source;
 if(type==='COMBAT_START'){state.layer.querySelector('.cbcin-world-bursts')?.replaceChildren();return}
 if(type==='PHASE_CHANGE'||type==='ENRAGE'){
  burst(arena,'phase',info.source||target);
  announce(arena,palettes[state.theme].name);
 }else if(type==='MECHANIC_TELEGRAPH'){
  burst(arena,'warning',info.source||target);
 }else if(type==='INTERRUPT'&&info.event?.result==='success'){
  burst(arena,'interrupt',target);
 }else if(type==='HEAL_RECEIVED'&&Number(info.event?.amount)>0){
  const now=Date.now();if(now-state.lastImpact>200){state.lastImpact=now;burst(arena,'heal',target)}
 }else if(type==='DAMAGE_DEALT'&&info.event?.result==='critical'){
  const now=Date.now();if(now-state.lastImpact>150){state.lastImpact=now;burst(arena,'hit',target)}
 }else if(type==='ENEMY_DEFEATED'&&info.target?.classList?.contains('boss')){
  burst(arena,'phase',target);
 }
}
// Mount proactively for previews; real Combat Reborn events are the universal
// fallback even for engines invoking their local mount closure directly.
if(typeof oldMount==='function')FX.mount=function(target,...rest){
 const result=oldMount.call(this,target,...rest);
 try{mount(result||target)}catch(_){}
 return result;
};
window.addEventListener('cellbound:combat-visual',visual,{passive:true});
window.CellboundCinematicGlobal=Object.freeze({mount,themeFor,version:'11B.1'});
})();
