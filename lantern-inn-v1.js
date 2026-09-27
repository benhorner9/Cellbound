/* Lantern Inn prototype: world first, existing management controls on demand. */
(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const game=()=>window.CellboundGame;
// Foot positions in each independently composed environment. Reusable across locations.
const slots={
 'fireplace-right':{wide:[27,49],phone:[34,56]},
 'main-table-left':{wide:[20,77],phone:[16,75]},
 'main-table-right':{wide:[52,76],phone:[60,74]},
 'bar-left':{wide:[68,52],phone:[73,58]},
 doorway:{wide:[13,48],phone:[13,49]},
 window:{wide:[44,38],phone:[47,35]},
 'back-table':{wide:[55,40],phone:[55,46]},
 stairs:{wide:[91,66],phone:[92,50]},
 'bar-right':{wide:[83,53],phone:[82,42]},
 'fireplace-left':{wide:[16,42],phone:[25,42]}
};
const activeSlots=['fireplace-right','main-table-right','main-table-left','bar-left','doorway'];
const reserveSlots=['window','back-table','stairs','bar-right','fireplace-left'];
let root,world,ledger,partyDialog,partyMarker,partyNode,returnFocus=null,characterFocus=null,lastKey='';
function dialog(title,id){
 const d=document.createElement('dialog');d.className='inn-dialog';d.id=id;d.setAttribute('aria-labelledby',id+'-title');
 d.innerHTML='<header class="inn-dialog-head"><div><small>THE LANTERN INN</small><h2 id="'+id+'-title">'+title+'</h2></div><button type="button" data-inn-close aria-label="Close '+title+'">Back to Inn ×</button></header><div class="inn-dialog-body"></div>';
 d.querySelector('[data-inn-close]').onclick=()=>d.close();
 // Search inputs consume Escape in some browsers; closing the tool must remain consistent.
 d.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(d===partyDialog)restoreParty();d.close()}},true);
 d.addEventListener('cancel',()=>{if(d===partyDialog)restoreParty()});
 d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});
 d.addEventListener('close',()=>{if(d===partyDialog)restoreParty();const another=Boolean(ledger?.open||partyDialog?.open);document.body.classList.toggle('inn-tool-open',another);if(!another)returnFocus?.focus({preventScroll:true});refresh()});root.append(d);return d;
}
function restoreParty(){if(partyNode){partyNode.classList.remove('inn-party-content');partyMarker.replaceWith(partyNode);partyNode=null;partyMarker=null}}
function openTool(kind,trigger){
 returnFocus=trigger||document.activeElement;
 const d=kind==='party'?partyDialog:ledger;
 if(kind==='party'){
  partyNode=document.getElementById('party');if(!partyNode)return;
  partyMarker=document.createComment('Inn party return point');partyNode.before(partyMarker);
  partyNode.classList.add('inn-party-content');d.querySelector('.inn-dialog-body').append(partyNode);
  game()?.renderAll?.();
 }
 d.showModal();document.body.classList.add('inn-tool-open');d.querySelector('[data-inn-close]').focus();
}
function mount(){
 root=document.getElementById('roster');if(!root||world)return;
 // All original roster controls remain under #roster for existing delegated selectors.
 const original=[...root.children].filter(n=>!n.matches('.lw-scene,.lw-room-depth'));
 root.querySelectorAll(':scope > .lw-scene,:scope > .lw-room-depth').forEach(n=>n.remove());
 root.classList.remove('lw-room','lw-location');root.classList.add('inn-location');
 world=document.createElement('section');world.className='inn-world';world.setAttribute('aria-label','The Lantern Inn');
 world.innerHTML='<picture class="inn-art"><source media="(max-width:600px)" srcset="./assets/world/lantern-inn-portrait-v1.webp"><img src="./assets/world/lantern-inn-landscape-v1.webp" alt="Lantern-lit timber inn with a stone hearth, bar, stairs, planning table and open guild ledger" fetchpriority="high"></picture><div class="inn-hearth-light" aria-hidden="true"></div><div class="inn-window-light" aria-hidden="true"></div><header class="inn-heading"><small>YOUR ADVENTURING COMPANY</small><h2>The Lantern Inn</h2><p class="inn-company-status"></p></header><div class="inn-inhabitants"></div><a class="inn-door" href="./guild.html" aria-label="Leave the Inn — Town"><span>Town ↗</span></a><button type="button" class="inn-hotspot inn-table" data-inn-tool="party"><span>Party Table</span><small>Prepare your five</small></button><button type="button" class="inn-hotspot inn-ledger" data-inn-tool="ledger"><span>Guild Ledger</span><small>Search & manage roster</small></button><p class="inn-empty" hidden>Your company will gather here when you recruit your first adventurer.</p><footer class="inn-hint">Select an adventurer to inspect their equipment and talents.</footer>';
 const theme=window.CellboundInnTheme;if(theme){if(theme.landscape)world.querySelector('.inn-art img').src=theme.landscape;if(theme.portrait)world.querySelector('.inn-art source').srcset=theme.portrait;if(theme.hint)world.querySelector('.inn-hint').textContent=theme.hint;}
 root.prepend(world);ledger=dialog('Guild Ledger','innLedger');original.forEach(n=>ledger.querySelector('.inn-dialog-body').append(n));partyDialog=dialog('Party Table','innParty');
 world.addEventListener('click',e=>{if(e.target.closest('.inn-door')&&game()?.switchView){e.preventDefault();game().switchView('home');return}const b=e.target.closest('[data-inn-tool]');if(b)openTool(b.dataset.innTool,b)});
 // Existing jump buttons inside the Ledger still open the same party tools in this room.
 ledger.addEventListener('click',e=>{if(e.target.closest('[data-jump="party"]')){e.preventDefault();e.stopPropagation();ledger.close();openTool('party',world.querySelector('.inn-table'))}},true);
}
function assign(roster,party){
 const ids=new Set(party.map(c=>String(c.id))),active=party.filter(c=>roster.some(r=>String(r.id)===String(c.id)));
 // Membership is authoritative; class preferences only select a free room position.
 const preferred={Warrior:'fireplace-right',Paladin:'fireplace-right',Priest:'main-table-right',Druid:'main-table-right',Rogue:'bar-left',Mage:'main-table-left',Hunter:'doorway'};
 const used=new Set();
 const placed=active.map(c=>{const slot=[preferred[c.class],...activeSlots].find(s=>s&&!used.has(s));used.add(slot);return {c:roster.find(r=>String(r.id)===String(c.id)),slot,active:true}});
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
   const s=slots[slot],body=window.CellboundPortraits?.worldAvatarHTML?.(c,{size:'inn',label:c.name})||window.CellboundPortraits?.paperDollHTML?.(c,{size:'inn',label:c.name})||window.CellboundPortraits?.portraitHTML?.(c,{size:'hero'})||esc(c.name);
   return '<button type="button" class="inn-adventurer '+(active?'inn-traveller':'inn-resting')+'" data-char="'+esc(c.id)+'" data-inn-character="'+esc(c.id)+'" data-location-slot="'+slot+'" style="--slot-x:'+s.wide[0]+'%;--slot-y:'+s.wide[1]+'%;--phone-x:'+s.phone[0]+'%;--phone-y:'+s.phone[1]+'%;--depth:'+Math.round(s.wide[1])+'" aria-label="'+esc(c.name+', '+c.class+', '+c.spec+', '+(active?'active party':'reserve')+(Number(c.cellShock)>=100?', recovering':''))+'"><span class="inn-figure">'+body+'</span><span class="inn-name">'+esc(c.name)+'</span></button>';
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
if(modal)new MutationObserver(()=>{if(modal.hidden&&document.body.classList.contains('inn-character-open')){document.body.classList.remove('inn-character-open');const shell=document.querySelector('.app-shell');if(shell)shell.inert=false;refresh();const id=characterFocus?.dataset?.char;([...world.querySelectorAll('[data-inn-character]')].find(n=>n.dataset.char===id)||world.querySelector('.inn-ledger'))?.focus({preventScroll:true})}}).observe(modal,{attributes:true,attributeFilter:['hidden']});
window.addEventListener('keydown',e=>{
 if(!document.body.classList.contains('inn-character-open')||!modal||modal.hidden)return;
 if(e.key==='Escape'){e.preventDefault();modal.querySelector('[data-close]')?.click()}
 if(e.key==='Tab'){const list=[...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]')].filter(n=>n.getClientRects().length);const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}
});
window.addEventListener('cellbound:state-rendered',refresh);
window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view!=='roster'){document.body.classList.remove('inn-view-active');ledger?.close();partyDialog?.close()}else refresh()});
window.CellboundInn={refresh,openTool,slots,assign};refresh();
})();
