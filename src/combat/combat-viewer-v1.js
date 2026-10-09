(()=>{
'use strict';

const VERSION='1.2.0';

function esc(v){
 return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))
}
function attrName(v,fallback){
 const raw=String(v||fallback||'').trim();
 return /^data-[a-z0-9-]+$/i.test(raw)?raw:String(fallback||'')
}
function idAttr(v){
 const raw=String(v||'').trim();return /^[A-Za-z][A-Za-z0-9_:-]*$/.test(raw)?' id="'+raw+'"':''
}
// One visual unit primitive for the PvE dungeon shell and PvP practice scene.
// Both modes are upgraded by CellboundCombatPortraits and animated by CellboundCombatFX.
function createCombatUnit(id,label,classes='',meta=''){
 const node=document.createElement('div');node.className='cb2d-unit '+String(classes||'');
 node.dataset.unit=String(id||'');
 node.innerHTML='<i></i><span>'+esc(label)+(meta?'<small class="cb2d-unit-meta">'+esc(meta)+'</small>':'')+'</span><em class="cb2d-unit-hp"><i></i></em>';
 return node
}
const pvpBackgrounds=Object.freeze({
 arena:'./assets/ashen-vault/rooms/broken-gate.webp',
 'capture-the-flag':'./assets/chaos-canyon/rooms/canyon-mouth.webp',
 'king-of-the-hill':'./assets/chaos-canyon/rooms/crossing.webp'
});
function pvpMarkup(options={}){
 const mode=['arena','capture-the-flag','king-of-the-hill'].includes(options.mode)?options.mode:'arena';
 const scene='<div class="cb2d-arena cbcombat-arena cbpvp-stage" data-combat-arena="canonical" data-pvp-unit-stage data-pvp-mode="'+mode+'" aria-label="Live illustrated PvP battlefield">'+
  '<div class="cb2d-floor"></div><div class="cb2d-environment cbpvp-environment"><img src="'+pvpBackgrounds[mode]+'" alt="" draggable="false" decoding="async"></div>'+
  '<div class="cbpvp-map-overlay" aria-hidden="true"></div><div class="cbpvp-units" data-pvp-units></div></div>';
 const base=shellMarkup({
  profile:'pve',header:options.header||'OWNER PRACTICE · NO REWARDS',title:options.title||'PvP',
  routeMarkup:'<div class="cbpvp-objective-bar" data-pvp-objective-bar><span data-pvp-objective-title>LIVE OBJECTIVE</span><b data-pvp-objective-score>0 – 0</b><span data-pvp-objective-detail>Waiting for simulation</span></div>',
  partyLabel:'BLUE SQUAD',partyMarkup:'<div data-pvp-team="blue" class="cbpvp-squad-roster"></div>',
  partySize:Math.max(2,Number(options.partySize)||5),
  battleTopbarMarkup:'<div class="cbcombat-battle-topbar cbpvp-battle-tag"><div class="cb2d-room-tag"><b>THE CRUCIBLE</b><small>Combat Reborn · same models and living combat FX as PvE</small></div></div>',
  arenaMarkup:scene,
  metersMarkup:'<div class="cbpvp-squad-title">RED SQUAD</div><div data-pvp-team="red" class="cbpvp-squad-roster"></div>',
  commandsMarkup:'<small>COMMAND CENTRE</small><p>Use the tactical controls above the battlefield to direct your squad.</p>',
  theme:'pvp',battleClass:'cbpvp-battle-wrap',showSpeed:false,showClose:false
 });
 return base.replace('cbcombat-shell cbcombat-standard-hud','cbcombat-shell cbcombat-standard-hud cbcombat-pvp-shell')
  .replace('data-combat-profile="pve"','data-combat-profile="pvp"')
  +'<div class="cbpvp-feed" data-pvp-feed role="status" aria-live="polite">Combat Reborn practice · no ranking or rewards</div>'
}
// Adapt the SAME Combat Reborn events consumed by PvE's living combat renderer.
// Objective overlays are additional UI only; no combat outcome is calculated here.
function renderPvpFrame(root,result,options={}){
 const shell=root?.matches?.('.cbcombat-pvp-shell')?root:root?.querySelector?.('.cbcombat-pvp-shell');
 if(!shell||!result?.pvp)return null;
 const data=result.pvp.objectives||{},mode=result.pvp.mode,score=data.score||{blue:0,red:0};
 const label=mode==='arena'?'ARENA · CELLSTORM':mode==='capture-the-flag'?'CAPTURE THE FLAG':'KING OF THE HILL';
 const display=mode==='arena'?'Arena '+(result.pvp.size||2)+'v'+(result.pvp.size||2):String(score.blue||0)+' – '+String(score.red||0);
 const detail=mode==='arena'?'Storm radius '+(data.storm?.radius??'—'):mode==='capture-the-flag'?'Capture the enemy flag and return to your own base':data.hill?.id?'Active hill: '+data.hill.id:'Holding active hill';
 const title=shell.querySelector('[data-pvp-objective-title]'),points=shell.querySelector('[data-pvp-objective-score]'),info=shell.querySelector('[data-pvp-objective-detail]');
 if(title)title.textContent=label;if(points)points.textContent=display;if(info)info.textContent=detail;
 const stage=shell.querySelector('[data-pvp-unit-stage]');
 const units=Array.isArray(result.finalState?.players)?result.finalState.players:[];
 if(stage){
  const host=stage.querySelector('[data-pvp-units]');
  const previous=new Map([...host.querySelectorAll('[data-pvp-unit-id]')].map(el=>[el.dataset.pvpUnitId,el]));
  const retained=new Set();
  units.forEach(u=>{
   if(!u?.id||!['blue','red'].includes(u.team))return;
   retained.add(u.id);
   let node=previous.get(u.id);
   if(!node){
    const cls='party '+(u.role==='tank'?'tank':u.role==='healer'?'healer':'dps')+' class-'+String(u.class||'warrior').toLowerCase().replace(/[^a-z0-9]+/g,'-');
    node=createCombatUnit(u.id,u.name||u.class||'Fighter',cls);
    node.dataset.pvpUnitId=u.id;host.appendChild(node)
   }
   node.dataset.team=u.team;node.classList.toggle('dead',!u.alive);
   node.style.left=Math.max(0,Math.min(100,Number(u.position?.x)||0))+'%';
   node.style.top=Math.max(0,Math.min(100,Number(u.position?.y)||0))+'%';
   const bar=node.querySelector('.cb2d-unit-hp i');
   if(bar)bar.style.width=Math.max(0,Math.min(100,(Number(u.health)||0)/Math.max(1,Number(u.maxHealth)||1)*100))+'%'
  });
  for(const [id,node] of previous)if(!retained.has(id))node.remove();
  window.CellboundCombatPortraits?.upgrade?.(host);
  const FX=window.CellboundCombatFX;
  if(FX?.combatEvent){
   FX.mount?.(stage);
   for(const event of Array.isArray(options.events)?options.events:[]){
    FX.combatEvent(event,{arena:stage,speed:1})
   }
  }
  const overlays=stage.querySelector('.cbpvp-map-overlay');
  if(overlays){
   const storm=overlays.querySelector('[data-pvp-storm]');
   if(mode==='arena'&&data.storm){
    const ring=storm||document.createElement('div');if(!storm){ring.dataset.pvpStorm='';ring.className='cbpvp-storm-ring';overlays.appendChild(ring)}
    const diameter=Math.max(0,Math.min(100,Number(data.storm.radius||0)*2));
    ring.style.width=diameter+'%';ring.style.height=diameter+'%'
   }else storm?.remove();
   const hill=overlays.querySelector('[data-pvp-hill]');
   if(mode==='king-of-the-hill'&&data.hill){
    const pin=hill||document.createElement('div');if(!hill){pin.dataset.pvpHill='';pin.className='cbpvp-hill-ring';overlays.appendChild(pin)}
    pin.style.left=data.hill.x+'%';pin.style.top=data.hill.y+'%'
   }else hill?.remove();
   overlays.querySelectorAll('[data-pvp-flag]').forEach(el=>el.remove());
   if(mode==='capture-the-flag'&&data.flags)for(const team of ['blue','red']){
    const flag=data.flags[team];if(!flag?.position)continue;
    const pin=document.createElement('span');pin.className='cbpvp-flag';pin.dataset.pvpFlag=team;
    pin.textContent='⚑';pin.style.left=flag.position.x+'%';pin.style.top=flag.position.y+'%';pin.title=team+' flag';overlays.appendChild(pin)
   }
  }
 }
 for(const team of ['blue','red']){
  const host=shell.querySelector('[data-pvp-team="'+team+'"]');if(!host)continue;
  host.replaceChildren();
  for(const u of units.filter(u=>u.team===team)){
   const row=document.createElement('div');row.className='cbpvp-team-row';row.textContent=(u.alive?'● ':'○ ')+(u.name||u.class||'Adventurer')+' · '+Math.round(Math.max(0,Number(u.health)||0)/Math.max(1,Number(u.maxHealth)||1)*100)+'%';
   host.appendChild(row)
  }
 }
 const feed=shell.parentElement?.querySelector('[data-pvp-feed]')||shell.querySelector('[data-pvp-feed]');
 if(feed)feed.textContent=result.pvp.winner?'Winner: '+result.pvp.winner.toUpperCase()+' · development-only preview':'Combat Reborn · '+Math.round(Number(result.durationMs||0)/1000)+'s · no rankings or rewards';
 return shell
}
function shellMarkup(options={}){
 if(options.profile==='pvp')return pvpMarkup(options);
 const header=options.header||'CELLBOUND · LIVE COMBAT';
 const title=options.title||'Combat';
 const route=String(options.routeMarkup??options.route??'');
 const partyLabel=options.partyLabel||'ACTIVE PARTY';
 const partyMarkup=String(options.partyMarkup||'');
 const petsMarkup=String(options.petsMarkup||'');
 const battleTopbar=String(options.battleTopbarMarkup||'');
 const arenaMarkup=String(options.arenaMarkup||'');
 const castMarkup=String(options.castMarkup||'');
 const metersMarkup=String(options.metersMarkup||'');
 const commandsMarkup=String(options.commandsMarkup||'');
 const rightExtra=String(options.rightExtraMarkup||'');
 const endMarkup=String(options.endMarkup||'');
 const battleClass=String(options.battleClass||options.shellClass||'').replace(/[^a-z0-9_ -]/gi,'').trim();
 const theme=String(options.theme||'default').replace(/[^a-z0-9_-]/gi,'').toLowerCase()||'default';
 const partySize=Math.max(1,Number(options.partySize)||5);
 const speedAttr=attrName(options.speedAttribute,'data-combat-speed');
 const closeAttr=attrName(options.closeAttribute,'data-combat-close');
 const speedLabel=esc(options.speedLabel||'1×');
 const showSpeed=options.showSpeed!==false;
 const showClose=options.showClose!==false;
 const closeLabel=esc(options.closeLabel||'Close combat');
 const commandGrouped=options.commandGrouped===true?' data-cbstd-grouped="1"':'';
 return '<section class="cbcombat-shell cbcombat-standard-hud" data-combat-view="canonical-v1" data-combat-profile="pve" data-combat-theme="'+esc(theme)+'" data-party-size="'+partySize+'">'+
  '<header class="cbcombat-header"><div class="cbcombat-title"><small>'+esc(header)+'</small><h2'+idAttr(options.titleId)+'>'+esc(title)+'</h2></div>'+
   '<div class="cbcombat-header-actions"><span class="cbcombat-live-dot"><i></i>LIVE</span>'+
    (showSpeed?'<button type="button" '+speedAttr+'>'+speedLabel+'</button>':'')+
    (showClose?'<button type="button" '+closeAttr+' aria-label="'+closeLabel+'">×</button>':'')+
   '</div></header>'+
  '<div class="cbcombat-route"'+idAttr(options.routeId)+'>'+route+'</div>'+
  '<div class="cbcombat-grid">'+
   '<div class="cbcombat-left-column"><section class="cbcombat-panel cbcombat-party-panel"><div class="cb2d-party cbcombat-party"><small>'+esc(partyLabel)+'</small><div class="cbcombat-party-rows" data-combat-party-rows'+idAttr(options.partyRowsId)+'>'+partyMarkup+'</div><div class="cbcombat-pet-rows" data-combat-pets'+idAttr(options.petsId)+' '+(petsMarkup?'':'hidden')+'>'+petsMarkup+'</div></div></section></div>'+
   '<main class="cbcombat-panel cbcombat-battle-panel">'+battleTopbar+'<div class="cbcombat-arena-wrap '+esc(battleClass)+'" data-combat-theme="'+esc(theme)+'">'+arenaMarkup+castMarkup+'</div></main>'+
   '<aside class="cbcombat-right-column"><section class="cbcombat-panel cbcombat-meters-panel">'+metersMarkup+'</section>'+
    '<section class="cbcombat-panel cbcombat-command-panel cb2d-controls cbr-command-panel"'+commandGrouped+'>'+commandsMarkup+'</section>'+rightExtra+'</aside>'+
  '</div>'+
  (endMarkup||'<div class="cb2d-end" data-combat-end'+idAttr(options.endId)+' hidden></div>')+
 '</section>'
}
function normalise(shell){
 if(!shell)return shell;
 const arena=shell.querySelector('.cbcombat-arena-wrap > .cb2d-arena,.cbcombat-arena-wrap > [data-combat-arena]');
 if(arena){arena.classList.add('cbcombat-arena');arena.dataset.combatArena='canonical'}
 const cast=shell.querySelector('.cbcombat-arena-wrap > .cb2d-cast');
 if(cast)cast.classList.add('cbcombat-cast');
 const meters=shell.querySelector('.cbcombat-meters-panel > .cb2d-combat-meters');
 if(meters)meters.classList.add('cbcombat-meter-stack');
 shell.querySelectorAll('[data-combat-party-rows] > .cb2d-party-row').forEach(row=>{
  const dot=row.querySelector(':scope > i.cb2d-dot');if(dot)dot.classList.add('cb2d-party-avatar');
  const main=[...row.children].find(node=>node.tagName==='SPAN'&&!node.classList.contains('cb2d-party-target')&&!node.classList.contains('cbstd-party-target'));
  if(main)main.classList.add('cb2d-party-main')
 });
 return shell
}
function setResults(root,enabled=true){
 const shell=root?.matches?.('.cbcombat-shell[data-combat-view="canonical-v1"]')?root:root?.querySelector?.('.cbcombat-shell[data-combat-view="canonical-v1"]');
 if(!shell)return null;
 const on=Boolean(enabled),live=[...shell.children].filter(node=>node.matches?.('.cbcombat-header,.cbcombat-route,.cbcombat-grid')),end=shell.querySelector(':scope > .cb2d-end');
 shell.classList.toggle('results-mode',on);
 live.forEach(node=>{
  if(on){node.setAttribute('aria-hidden','true');node.style.setProperty('display','none','important')}
  else{node.removeAttribute('aria-hidden');node.style.removeProperty('display')}
 });
 if(end){
  if(on){
   end.hidden=false;end.removeAttribute('hidden');end.removeAttribute('aria-hidden');
   end.style.setProperty('display','block','important');
   end.style.setProperty('position','absolute','important');
   end.style.setProperty('inset','0','important');
   end.style.setProperty('overflow-y','auto','important');
   end.scrollTop=0
  }else{
   end.style.removeProperty('display');end.style.removeProperty('position');end.style.removeProperty('inset');end.style.removeProperty('overflow-y')
  }
 }
 shell.scrollTop=0;
 return shell
}
function dismiss(root,{remove=true}={}){
 if(!root)return false;
 try{
  root.hidden=true;
  root.setAttribute('hidden','');
  root.setAttribute('aria-hidden','true');
  root.classList.remove('cbcombat-backdrop');
  root.replaceChildren();
  root.style.setProperty('display','none','important');
  if(remove&&root.isConnected)root.remove();
  return true
 }catch(error){
  console.warn('Canonical combat viewer close recovery',error);
  try{root.hidden=true;root.innerHTML='';root.remove?.()}catch(_){}
  return false
 }
}
function mount(root,options={}){
 if(!root)throw new Error('CellboundCombatViewer.mount requires a root element');
 root.style.removeProperty('display');
 root.removeAttribute('aria-hidden');
 root.removeAttribute('hidden');
 root.hidden=false;
 if(options.inline){root.classList.remove('cbcombat-backdrop');root.classList.add('cbcombat-inline')}else{root.classList.remove('cbcombat-inline');root.classList.add('cbcombat-backdrop')}
 root.innerHTML=shellMarkup(options);
 const shell=normalise(root.querySelector(':scope > .cbcombat-shell')||root.querySelector('.cbcombat-shell'));
 window.CellboundCombatHUDStandard?.upgrade?.(shell);
 return shell
}

window.CellboundCombatViewer={version:VERSION,mount,dismiss,normalise,setResults,createCombatUnit,renderPvpFrame,profiles:{pve:'canonical-v1',pvp:'canonical-v1'}};
})();