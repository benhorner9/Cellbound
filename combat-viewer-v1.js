(()=>{
'use strict';

const VERSION='1.1.4';

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
 const left=String(options.leftMarkup||''),arena=String(options.arenaMarkup||''),right=String(options.rightMarkup||''),footer=String(options.footerMarkup||'');
 return '<section class="cbcombat-shell cbcombat-pvp-shell '+esc(shellClass)+'" data-combat-view="canonical-v1" data-combat-profile="pvp">'+
  '<header class="cbcombat-header pvp2d-head"><div class="cbcombat-title"><small>'+esc(header)+'</small><h2>'+esc(title)+'</h2></div>'+center+'<div class="cbcombat-header-actions pvp2d-controls">'+actions+'</div></header>'+
  '<div class="cbcombat-grid cbcombat-pvp-grid pvp2d-layout"><aside class="cbcombat-panel cbcombat-pvp-team blue">'+left+'</aside>'+
   '<main class="cbcombat-panel cbcombat-battle-panel pvp2d-arena" id="pvp2dArena">'+arena+'</main>'+
   '<aside class="cbcombat-panel cbcombat-pvp-team red">'+right+'</aside></div>'+
  footer+
 '</section>'
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
 if(!shell)return null;shell.classList.toggle('results-mode',Boolean(enabled));return shell
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
 root.classList.add('cbcombat-backdrop');
 root.innerHTML=shellMarkup(options);
 const shell=normalise(root.querySelector(':scope > .cbcombat-shell')||root.querySelector('.cbcombat-shell'));
 window.CellboundCombatHUDStandard?.upgrade?.(shell);
 return shell
}

window.CellboundCombatViewer={version:VERSION,mount,dismiss,normalise,setResults,profiles:{pve:'canonical-v1'}};
})();