/* Lantern Inn prototype: world first, existing management controls on demand. */
(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const game=()=>window.CellboundGame;
// Foot positions in each independently composed environment. Reusable across locations.
/* Character staging map for the modular Inn.
   Each slot owns its floor anchor, visual scale and z-depth so actors can
   naturally disappear behind furniture instead of cutting through it.
   Prop depth: Door 24 · Bar 46 · Party Table 74. */
const slots={
 'party-back-left':{
  wide:[38.5,69],phone:[38.5,69],scale:.97,phoneScale:.93,depth:72,zone:'behind-table'
 },
 'party-back-centre':{
  wide:[50,67.5],phone:[50,67.5],scale:.95,phoneScale:.91,depth:72,zone:'behind-table'
 },
 'party-back-right':{
  wide:[61.5,69],phone:[61.5,69],scale:.97,phoneScale:.93,depth:72,zone:'behind-table'
 },
 'party-front-left':{
  wide:[25.8,84],phone:[25.8,84],scale:1.10,phoneScale:1.04,depth:82,zone:'floor'
 },
 'party-front-right':{
  wide:[74.2,84],phone:[74.2,84],scale:1.10,phoneScale:1.04,depth:82,zone:'floor'
 },
 'reserve-fireplace':{
  wide:[27,43],phone:[27,43],scale:.79,phoneScale:.75,depth:42,zone:'background'
 },
 'reserve-window-left':{
  wide:[39,39],phone:[39,39],scale:.75,phoneScale:.71,depth:40,zone:'background'
 },
 'reserve-window-right':{
  wide:[61,39],phone:[61,39],scale:.75,phoneScale:.71,depth:40,zone:'background'
 },
 'reserve-bar':{
  wide:[79,42],phone:[79,42],scale:.79,phoneScale:.75,depth:44,zone:'behind-bar'
 },
 'reserve-door':{
  wide:[18,42],phone:[18,42],scale:.77,phoneScale:.73,depth:41,zone:'background'
 }
}
const perspectiveFor=y=>Math.max(.82,Math.min(1.02,.70+(Number(y)||50)*.0042));
/* Party Table Ring V9: three behind the table, two outside its front corners. */
const activeSlots=['party-back-left','party-back-centre','party-back-right','party-front-left','party-front-right'];
const reserveSlots=['reserve-fireplace','reserve-window-left','reserve-window-right','reserve-bar','reserve-door'];
let root,world,ledger,partyDialog,partyMarker,partyNode,selectionPanel,selectionTitle,selectionCopy,selectionStatus,selectionAction,returnFocus=null,characterFocus=null,lastKey='',selectedObject='',exitTimer=0;
const objectCopy={
 party:{
  title:'Party Table',
  copy:'Choose and prepare the five adventurers who will travel together.',
  action:'Open Active Party',
  status(){
   const party=game()?.getPartyCharacters?.()||[];
   return party.length+' / 5 adventurers currently prepared';
  }
 },
 roster:{
  title:'The Bar',
  copy:'Open your company roster to inspect, recruit and manage adventurers.',
  action:'Open Roster',
  status(){
   const roster=game()?.getState?.()?.roster||[];
   return roster.length+' adventurer'+(roster.length===1?'':'s')+' in your company';
  }
 },
 door:{
  title:'Town Square',
  copy:'Leave the Lantern Inn and return to the guild quarter.',
  action:'Return to Town Square',
  status(){return 'The camera will move to the door before leaving the Inn'}
 }
};
function setObjectSelected(kind,{focusConfirm=false}={}){
 selectedObject=kind||'';
 if(!world)return;
 if(selectedObject)world.dataset.selectedInnObject=selectedObject;else delete world.dataset.selectedInnObject;
 world.querySelectorAll('[data-inn-object]').forEach(node=>{
  const on=node.dataset.innObject===selectedObject;
  node.classList.toggle('is-selected',on);
  node.setAttribute('aria-pressed',String(on));
 });
 if(!selectionPanel)return;
 if(!selectedObject||!objectCopy[selectedObject]){
  selectionPanel.hidden=true;
  world.classList.remove('has-selection');
  if(selectionAction)delete selectionAction.dataset.confirmInnObject;
  return;
 }
 const def=objectCopy[selectedObject];
 selectionTitle.textContent=def.title;
 selectionCopy.textContent=def.copy;
 selectionStatus.textContent=def.status();
 selectionAction.textContent=def.action+' →';
 selectionAction.dataset.confirmInnObject=selectedObject;
 selectionPanel.hidden=false;
 world.classList.add('has-selection');
 if(focusConfirm)selectionAction.focus({preventScroll:true});
}
function leaveToTown(trigger){
 if(!world||world.classList.contains('is-leaving-to-town'))return;
 returnFocus=trigger||document.activeElement;
 setObjectSelected('door');
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 if(reduced){
  game()?.switchView?.('overview');
  setObjectSelected('');
  return;
 }
 clearTimeout(exitTimer);
 world.classList.add('is-leaving-to-town');
 exitTimer=setTimeout(()=>world.classList.add('is-fading-to-town'),500);
 exitTimer=setTimeout(()=>{
  game()?.switchView?.('overview');
  world.classList.remove('is-leaving-to-town','is-fading-to-town');
  setObjectSelected('');
 },760);
}
function activateObject(kind,trigger){
 if(kind==='door'){leaveToTown(trigger);return}
 if(kind!=='party'&&kind!=='roster')return;
 setObjectSelected(kind);
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 setTimeout(()=>openTool(kind,trigger),reduced?0:120);
}
function dialog(title,id){
 const d=document.createElement('dialog');d.className='inn-dialog';d.id=id;d.setAttribute('aria-labelledby',id+'-title');
 d.innerHTML='<header class="inn-dialog-head"><div><small>THE LANTERN INN</small><h2 id="'+id+'-title">'+title+'</h2></div><button type="button" data-inn-close aria-label="Close '+title+'">Back to Inn ×</button></header><div class="inn-dialog-body"></div>';
 d.querySelector('[data-inn-close]').onclick=()=>d.close();
 // Search inputs consume Escape in some browsers; closing the tool must remain consistent.
 d.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(d===partyDialog)restoreParty();d.close()}},true);
 d.addEventListener('cancel',()=>{if(d===partyDialog)restoreParty()});
 d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});
 d.addEventListener('close',()=>{if(d===partyDialog)restoreParty();const another=Boolean(ledger?.open||partyDialog?.open);document.body.classList.toggle('inn-tool-open',another);if(!another){setObjectSelected('');returnFocus?.focus({preventScroll:true})}refresh()});root.append(d);return d;
}
function restoreParty(){if(partyNode){partyNode.classList.remove('inn-party-content');partyMarker.replaceWith(partyNode);partyNode=null;partyMarker=null}}
function openTool(kind,trigger){
 returnFocus=trigger||document.activeElement;
 const d=kind==='party'?partyDialog:ledger;
 if(!d)return;
 if(kind==='party'){
  partyNode=document.getElementById('party');if(!partyNode)return;
  partyMarker=document.createComment('Inn party return point');partyNode.before(partyMarker);
  partyNode.classList.add('inn-party-content');d.querySelector('.inn-dialog-body').append(partyNode);
  game()?.renderAll?.();
 }else{
  game()?.renderAll?.();
 }
 if(!d.open)d.showModal();
 document.body.classList.add('inn-tool-open');
 requestAnimationFrame(()=>d.querySelector('[data-inn-close]')?.focus({preventScroll:true}));
}
function mount(){
 root=document.getElementById('roster');if(!root||world)return;
 // Keep the live roster controls; the Bar moves them into a central modal.
 const original=[...root.children].filter(n=>!n.matches('.lw-scene,.lw-room-depth'));
 root.querySelectorAll(':scope > .lw-scene,:scope > .lw-room-depth').forEach(n=>n.remove());
 root.classList.remove('lw-room','lw-location');root.classList.add('inn-location');
 world=document.createElement('section');world.className='inn-world';world.setAttribute('aria-label','The Lantern Inn');
 world.innerHTML=
  '<div class="inn-scene-stage" data-inn-scene-stage>'+
   '<img class="inn-scene-bg" src="./assets/world/inn/lantern-inn-bg-v2.webp?v=1" alt="" fetchpriority="high">'+
   '<div class="inn-hearth-light" aria-hidden="true"></div><div class="inn-window-light" aria-hidden="true"></div>'+
   '<button type="button" class="inn-scene-object inn-object-door" data-inn-object="door" aria-label="Return to the Town Square">'+
    '<span class="inn-object-visual"><img class="inn-object-glow" src="./assets/world/inn/lantern-inn-door-v2.webp?v=1" alt=""><img class="inn-object-art" src="./assets/world/inn/lantern-inn-door-v2.webp?v=1" alt=""></span><span class="inn-object-hit" aria-hidden="true"></span>'+
    '<span class="inn-object-caption"><b>Town Square</b><small>Leave the Inn</small></span>'+
   '</button>'+
   '<button type="button" class="inn-scene-object inn-object-bar" data-inn-object="roster" aria-label="Open the roster at the bar">'+
    '<span class="inn-object-visual"><img class="inn-object-glow" src="./assets/world/inn/lantern-inn-bar-v2.webp?v=1" alt=""><img class="inn-object-art" src="./assets/world/inn/lantern-inn-bar-v2.webp?v=1" alt=""></span><span class="inn-object-hit" aria-hidden="true"></span>'+
    '<span class="inn-object-caption"><b>Roster</b><small>Manage your company</small></span>'+
   '</button>'+
   '<div class="inn-inhabitants"></div>'+
   '<button type="button" class="inn-scene-object inn-object-table" data-inn-object="party" aria-label="Open Active Party at the planning table">'+
    '<span class="inn-object-visual"><img class="inn-object-glow" src="./assets/world/inn/lantern-inn-table-v2.webp?v=1" alt=""><img class="inn-object-art" src="./assets/world/inn/lantern-inn-table-v2.webp?v=1" alt=""></span><span class="inn-object-hit" aria-hidden="true"></span>'+
    '<span class="inn-object-caption"><b>Party Table</b><small>Prepare your five</small></span>'+
   '</button>'+
  '</div>'+
  '<header class="inn-heading"><small>YOUR ADVENTURING COMPANY</small><h2>The Lantern Inn</h2><p class="inn-company-status"></p></header>'+
  '<aside class="inn-selection-panel" data-inn-selection hidden aria-live="polite"><div class="inn-selection-copy"><small>SELECTED</small><h3 data-inn-selection-title></h3><p data-inn-selection-copy></p><em data-inn-selection-status></em></div><button type="button" data-inn-selection-action data-confirm-inn-object=""></button></aside>'+
  '<p class="inn-empty" hidden>Your company will gather here when you recruit your first adventurer.</p>'+
  '<footer class="inn-hint">Tap once to select · then confirm</footer>';
 const theme=window.CellboundInnTheme;if(theme?.hint)world.querySelector('.inn-hint').textContent=theme.hint;
 root.prepend(world);
 selectionPanel=world.querySelector('[data-inn-selection]');
 selectionTitle=world.querySelector('[data-inn-selection-title]');
 selectionCopy=world.querySelector('[data-inn-selection-copy]');
 selectionStatus=world.querySelector('[data-inn-selection-status]');
 selectionAction=world.querySelector('[data-inn-selection-action]');
 ledger=dialog('Roster','innLedger');original.forEach(n=>ledger.querySelector('.inn-dialog-body').append(n));
 partyDialog=dialog('Active Party','innParty');
 world.addEventListener('click',e=>{
  const confirm=e.target.closest('[data-confirm-inn-object]');
  if(confirm){
   e.preventDefault();e.stopPropagation();
   const kind=confirm.dataset.confirmInnObject||selectedObject;
   const trigger=world.querySelector('[data-inn-object="'+kind+'"]');
   activateObject(kind,trigger||confirm);
   return;
  }
  const object=e.target.closest('[data-inn-object]');
  if(object){
   e.preventDefault();
   setObjectSelected(object.dataset.innObject,{focusConfirm:false});
   return;
  }
  if(e.target.closest('[data-inn-selection]'))return;
  if(!ledger?.open&&!partyDialog?.open)setObjectSelected('');
 });
 world.addEventListener('keydown',e=>{
  const object=e.target.closest?.('[data-inn-object]');
  if(!object||(e.key!=='Enter'&&e.key!==' '))return;
  e.preventDefault();
  setObjectSelected(object.dataset.innObject,{focusConfirm:true});
 });
 // Existing jump buttons inside the roster modal still open the Party Table.
 ledger.addEventListener('click',e=>{if(e.target.closest('[data-jump="party"]')){e.preventDefault();e.stopPropagation();ledger.close();setTimeout(()=>{setObjectSelected('party');openTool('party',world.querySelector('[data-inn-object="party"]'))},80)}},true);
}
function assign(roster,party){
 const ids=new Set(party.map(c=>String(c.id))),active=party.filter(c=>roster.some(r=>String(r.id)===String(c.id)));
 const placed=active.slice(0,activeSlots.length).map((c,i)=>({
  c:roster.find(r=>String(r.id)===String(c.id)),
  slot:activeSlots[i],
  active:true
 }));
 const used=new Set(placed.map(x=>x.slot));
 const free=[...reserveSlots,...activeSlots].filter(s=>!used.has(s));
 return placed.concat(roster.filter(c=>!ids.has(String(c.id))).map((c,i)=>({c,slot:free[i],active:false}))).filter(p=>p.slot);
}

function refresh(){
 mount();if(!world)return;document.body.classList.toggle('inn-view-active',root.classList.contains('active'));
 const roster=game()?.getState?.()?.roster||[],party=game()?.getPartyCharacters?.()||[];
 const key=JSON.stringify([roster.map(c=>[c.id,c.name,c.class,c.spec,c.appearance,c.equipment,c.cellShock]),party.map(c=>c.id)]);
 if(key!==lastKey){
  lastKey=key;const focused=document.activeElement?.dataset?.innCharacter;
  world.querySelector('.inn-inhabitants').innerHTML=assign(roster,party).map(({c,slot,active})=>{
   const s=slots[slot],P=window.CellboundPortraits;
   const illustrated=Boolean(P?.usesIllustratedBody?.(c));
   const body=P?.worldAvatarHTML?.(c,{size:'inn',label:c.name})||P?.paperDollHTML?.(c,{size:'inn',label:c.name})||P?.portraitHTML?.(c,{size:'hero'})||esc(c.name);
   const wideScale=Number(s.scale||perspectiveFor(s.wide[1])),phoneScale=Number(s.phoneScale||s.scale||perspectiveFor(s.phone[1])),depth=Number(s.depth||Math.round(s.wide[1]));
   return '<button type="button" class="inn-adventurer '+(illustrated?'inn-illustrated-model ':'inn-fallback-model ')+'inn-zone-'+esc(s.zone||'floor')+' '+(active?'inn-traveller':'inn-resting')+'" data-char="'+esc(c.id)+'" data-inn-character="'+esc(c.id)+'" data-location-slot="'+slot+'" data-inn-zone="'+esc(s.zone||'floor')+'" style="--slot-x:'+s.wide[0]+'%;--slot-y:'+s.wide[1]+'%;--phone-x:'+s.phone[0]+'%;--phone-y:'+s.phone[1]+'%;--inn-scale-wide:'+wideScale.toFixed(3)+';--inn-scale-phone:'+phoneScale.toFixed(3)+';--depth:'+depth+'" aria-label="'+esc(c.name+', '+c.class+', '+c.spec+', '+(active?'active party':'reserve')+(Number(c.cellShock)>=100?', recovering':''))+'"><span class="inn-figure">'+body+'</span><span class="inn-name">'+esc(c.name)+'</span></button>';
  }).join('');
  if(focused)[...world.querySelectorAll('[data-inn-character]')].find(n=>n.dataset.innCharacter===focused)?.focus({preventScroll:true});
 }
 world.querySelector('.inn-company-status').textContent=party.length+' preparing to leave · '+Math.max(0,roster.length-party.length)+' resting';
 world.querySelector('.inn-empty').hidden=roster.length>0;
}
// Run before the existing character-sheet capture handler. It owns all gear and talent actions.
window.addEventListener('click',e=>{
 if(e.target.closest?.('[data-recruit-slot]')&&ledger?.open)ledger.close();
 const b=e.target.closest?.('[data-char]');if(!b||!root?.classList.contains('active')||!root.contains(b))return;
 characterFocus=b;document.body.classList.add('inn-character-open');
 // A non-native character modal must sit above the Ledger's native top layer.
 if(ledger.open)ledger.close();
 requestAnimationFrame(()=>{const m=document.getElementById('characterModal');if(m&&!m.hidden){const shell=document.querySelector('.app-shell');if(shell)shell.inert=true;m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label','Adventurer details');m.querySelector('[data-close]')?.focus()}});
},true);
const modal=document.getElementById('characterModal');
if(modal)new MutationObserver(()=>{if(modal.hidden&&document.body.classList.contains('inn-character-open')){document.body.classList.remove('inn-character-open');const shell=document.querySelector('.app-shell');if(shell)shell.inert=false;refresh();const id=characterFocus?.dataset?.char;([...world.querySelectorAll('[data-inn-character]')].find(n=>n.dataset.char===id)||world.querySelector('[data-inn-object="roster"]'))?.focus({preventScroll:true})}}).observe(modal,{attributes:true,attributeFilter:['hidden']});
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&selectedObject&&!ledger?.open&&!partyDialog?.open&&!document.body.classList.contains('inn-character-open')){
  e.preventDefault();
  const selected=world?.querySelector('[data-inn-object="'+selectedObject+'"]');
  setObjectSelected('');
  selected?.focus({preventScroll:true});
  return;
 }
 if(!document.body.classList.contains('inn-character-open')||!modal||modal.hidden)return;
 if(e.key==='Escape'){e.preventDefault();modal.querySelector('[data-close]')?.click()}
 if(e.key==='Tab'){const list=[...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]')].filter(n=>n.getClientRects().length);const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}
});
window.addEventListener('cellbound:state-rendered',refresh);
window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view!=='roster'){document.body.classList.remove('inn-view-active');ledger?.close();partyDialog?.close();clearTimeout(exitTimer);world?.classList.remove('is-leaving-to-town','is-fading-to-town');setObjectSelected('')}else refresh()});
window.CellboundInn={refresh,openTool,activateObject,leaveToTown,setObjectSelected,objectCopy,slots,assign,perspectiveFor};refresh();
})();
