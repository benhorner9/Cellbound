(()=>{
'use strict';

const VERSION='1.1.5';

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
function pvpMarkup(options={}){
 const shellClass=String(options.shellClass||'').replace(/[^a-z0-9_ -]/gi,'').trim();
 const header=options.header||'LIVE PVP COMBAT',title=options.title||'PvP';
 const center=String(options.headerCenterMarkup||''),actions=String(options.headerActionsMarkup||'');
 const left=String(options.leftMarkup||'<div class="cbpvp-squad-title">BLUE SQUAD</div><div data-pvp-team="blue"></div>'),
 arena=String(options.arenaMarkup||'<div class="cbpvp-stage" data-pvp-unit-stage aria-label="Live PvP battlefield"></div>'),
 right=String(options.rightMarkup||'<div class="cbpvp-squad-title">RED SQUAD</div><div data-pvp-team="red"></div>'),
 footer=String(options.footerMarkup||'<div class="cbpvp-feed" data-pvp-feed role="status" aria-live="polite">PvP development preview · no ratings or rewards</div>');
 const objective='<div class="cbpvp-objective-bar" data-pvp-objective-bar><span data-pvp-objective-title>LIVE OBJECTIVE</span><b data-pvp-objective-score>0 – 0</b><span data-pvp-objective-detail>Waiting for simulation</span></div>';
 return '<section class="cbcombat-shell cbcombat-pvp-shell '+esc(shellClass)+'" data-combat-view="canonical-v1" data-combat-profile="pvp">'+
  '<header class="cbcombat-header pvp2d-head"><div class="cbcombat-title"><small>'+esc(header)+'</small><h2>'+esc(title)+'</h2></div>'+center+'<div class="cbcombat-header-actions pvp2d-controls">'+actions+'</div></header>'+
  objective+'<div class="cbcombat-grid cbcombat-pvp-grid pvp2d-layout"><aside class="cbcombat-panel cbcombat-pvp-team blue">'+left+'</aside>'+
   '<main class="cbcombat-panel cbcombat-battle-panel pvp2d-arena" id="pvp2dArena">'+arena+'</main>'+
   '<aside class="cbcombat-panel cbcombat-pvp-team red">'+right+'</aside></div>'+
  footer+
 '</section>'
}
// Present objective snapshots inside the SINGLE canonical viewer; no duplicate combat renderer.
// This is a deterministic event-stream presentation adapter, not a match simulator.
function renderPvpFrame(root,result){
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
  const previous=new Map([...stage.querySelectorAll('[data-pvp-unit-id]')].map(el=>[el.dataset.pvpUnitId,el]));
  const retained=new Set();
  units.forEach(u=>{
   if(!u?.id||!['blue','red'].includes(u.team))return;
   retained.add(u.id);
   let node=previous.get(u.id);
   if(!node){
    node=document.createElement('div');node.className='cbpvp-combatant';node.dataset.pvpUnitId=u.id;
    const avatar=document.createElement('span');avatar.className='cbpvp-combatant-symbol';
    const label=document.createElement('small');label.className='cbpvp-combatant-name';
    const hp=document.createElement('span');hp.className='cbpvp-combatant-hp';const fill=document.createElement('i');hp.appendChild(fill);
    node.append(avatar,label,hp);stage.appendChild(node)
   }
   node.dataset.team=u.team;node.classList.toggle('is-dead',!u.alive);
   node.style.left=Math.max(0,Math.min(100,Number(u.position?.x)||0))+'%';
   node.style.top=Math.max(0,Math.min(100,Number(u.position?.y)||0))+'%';
   node.style.setProperty('--cbpvp-class-color',window.CellboundCombatReborn?.CLASS_COLORS?.[u.class]||'#d8c89b');
   node.querySelector('.cbpvp-combatant-symbol').textContent=(u.name||u.class||'?').slice(0,1).toUpperCase();
   node.querySelector('.cbpvp-combatant-name').textContent=u.name||u.class||'Fighter';
   node.querySelector('.cbpvp-combatant-hp i').style.width=Math.max(0,Math.min(100,(Number(u.health)||0)/Math.max(1,Number(u.maxHealth)||1)*100))+'%'
  });
  for(const [id,node] of previous)if(!retained.has(id))node.remove();
  const storm=stage.querySelector('[data-pvp-storm]');
  if(mode==='arena'&&data.storm){
   const ring=storm||document.createElement('div');if(!storm){ring.dataset.pvpStorm='';ring.className='cbpvp-storm-ring';stage.appendChild(ring)}
   const diameter=Math.max(0,Math.min(100,Number(data.storm.radius||0)*2));
   ring.style.width=diameter+'%';ring.style.height=diameter+'%'
  }else storm?.remove();
  const hill=stage.querySelector('[data-pvp-hill]');
  if(mode==='king-of-the-hill'&&data.hill){
   const pin=hill||document.createElement('div');if(!hill){pin.dataset.pvpHill='';pin.className='cbpvp-hill-ring';stage.appendChild(pin)}
   pin.style.left=data.hill.x+'%';pin.style.top=data.hill.y+'%'
  }else hill?.remove();
  stage.querySelectorAll('[data-pvp-flag]').forEach(el=>el.remove());
  if(mode==='capture-the-flag'&&data.flags)for(const team of ['blue','red']){
   const flag=data.flags[team];if(!flag?.position)continue;
   const pin=document.createElement('span');pin.className='cbpvp-flag';pin.dataset.pvpFlag=team;
   pin.textContent='⚑';pin.style.left=flag.position.x+'%';pin.style.top=flag.position.y+'%';pin.title=team+' flag';stage.appendChild(pin)
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
 const feed=shell.querySelector('[data-pvp-feed]');
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

window.CellboundCombatViewer={version:VERSION,mount,dismiss,normalise,setResults,renderPvpFrame,profiles:{pve:'canonical-v1',pvp:'canonical-v1'}};
})();