(()=>{
'use strict';
const KEY='cellbound-owner-combat-ui-layout-v1';
const MODES={pve:'PvE · Combat Reborn',arena:'PvP · Arena',ctf:'PvP · Capture the Flag',hill:'PvP · King of the Hill'};
const PROFILES={desktop:[1200,720],tablet:[1024,768],mobile:[390,844]};
const PVE=[['header','Window header','.cbcombat-header'],['route','Progress / objective','.cbcombat-route'],['battlefield','Combat battlefield','.cbcombat-arena-wrap'],['party','Party frames','.cbcombat-party-panel'],['meters','Damage / healing / threat','.cbcombat-meters-panel'],['controls','Command centre','.cbcombat-command-panel']];
const PVP=[['header','Match header','.cbcombat-header'],['route','Match objectives','.cbcombat-route'],['battlefield','Combat battlefield','.cbcombat-arena-wrap'],['party','Blue roster','.cbcombat-party-panel'],['meters','Red roster','.cbcombat-meters-panel'],['controls','PvP commands','.cbcombat-command-panel']];
const DEFAULT_PVE={header:[1,1,98,8],route:[1,10,98,5],party:[1,16,17,81],battlefield:[19,16,54,81],meters:[74,16,25,34],controls:[74,51,25,46]};
const DEFAULT_PVP={header:[1,1,98,8],route:[1,10,98,8],party:[1,19,17,78],battlefield:[19,19,54,78],meters:[74,19,25,38],controls:[74,58,25,39]};
const DEFAULT_MOBILE_PVE={header:[1,1,98,7],route:[1,9,98,5],party:[1,15,48,18],meters:[50,15,49,18],battlefield:[1,34,98,43],controls:[1,78,98,21]};
const DEFAULT_MOBILE_PVP={header:[1,1,98,7],route:[1,9,98,7],party:[1,17,48,17],meters:[50,17,49,17],battlefield:[1,35,98,43],controls:[1,79,98,20]};
const $=(s,p=document)=>p.querySelector(s),$$=(s,p=document)=>[...p.querySelectorAll(s)];
const copy=x=>JSON.parse(JSON.stringify(x));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
const owner=()=>Boolean(window.CellboundAdmin?.isAdmin)&&String(window.CellboundAdmin?.role||'').toLowerCase()==='owner';
const currentUser=()=>String(window.CellboundGame?.getUser?.()?.id||'');
const key=()=>KEY+'-'+currentUser();
const defaultSlot=(mode,profile,id)=>{
 const source=profile==='mobile'?(mode==='pve'?DEFAULT_MOBILE_PVE:DEFAULT_MOBILE_PVP):(mode==='pve'?DEFAULT_PVE:DEFAULT_PVP);
 let a=source[id]||[1,1,20,12];
 return{x:a[0],y:a[1],w:a[2],h:a[3],hidden:a[2]===0};
};
const slots=mode=>mode==='pve'?PVE:PVP;
function defaultLayout(mode,profile){
 const config={width:PROFILES[profile][0],height:PROFILES[profile][1],slots:{}};
 slots(mode).forEach(([id])=>config.slots[id]=defaultSlot(mode,profile,id));
 return config
}
function safeLayout(raw,mode,profile){
 const fallback=defaultLayout(mode,profile),next={width:clamp(raw?.width||fallback.width,320,1800),height:clamp(raw?.height||fallback.height,420,1500),slots:{}};
 slots(mode).forEach(([id])=>{
  const a=raw?.slots?.[id]||fallback.slots[id];
  const w=clamp(a.w,4,100),h=clamp(a.h,4,100);
  next.slots[id]={x:clamp(a.x,0,100-w),y:clamp(a.y,0,100-h),w,h,hidden:Boolean(a.hidden)};
 });
 return next
}
function load(){try{const raw=JSON.parse(localStorage.getItem(key())||'{}');return raw&&raw.version===1?{version:1,drafts:raw.drafts||{},applied:raw.applied||{}}:{version:1,drafts:{},applied:{}}}catch{return{version:1,drafts:{},applied:{}}}}
let state={version:1,drafts:{},applied:{}},mode='pve',profile='tablet',selected='battlefield',grid=true,opened=false,undo=[],redo=[],started=false,observer=null,scheduled=false;
function persist(){try{localStorage.setItem(key(),JSON.stringify(state));return true}catch{status('Device storage is unavailable. Export a backup before leaving.');return false}}
function getDraft(){state.drafts[mode] ||= {};state.drafts[mode][profile]=safeLayout(state.drafts[mode][profile],mode,profile);return state.drafts[mode][profile]}
function snapshot(){return copy(getDraft())}
function remember(){undo.push(snapshot());if(undo.length>40)undo.shift();redo=[]}
function status(msg){const el=$('#cbeStatus');if(el)el.textContent=msg}
function opt(values,active){return Object.entries(values).map(([id,name])=>'<option value="'+id+'" '+(id===active?'selected':'')+'>'+name+'</option>').join('')}
function sample(id){
 if(id==='battlefield')return'<div class="cbe-combat-demo"><i>⚔</i><i>✚</i><i>☠</i><i>☠</i></div>';
 if(id==='header')return'<b>CELLBOUND · LIVE COMBAT</b><span class="cbe-line"></span>';
 if(id==='route')return'<b>ENTRY → ENCOUNTER → BOSS</b>';
 if(id==='blue'||id==='red'||id==='party')return'<b>WARRIOR ████████</b><span class="cbe-line"></span><b>PRIEST ███████</b><span class="cbe-line"></span><b>MAGE █████████</b>';
 if(id==='meters')return'<b>1. Warrior · 2,430</b><span class="cbe-line"></span><b>2. Mage · 1,880</b><span class="cbe-line"></span><b>3. Priest · 930</b><span class="cbe-line"></span>';
 if(id==='feed')return'<b>Warrior interrupts</b><span class="cbe-line"></span><b>Mage casts Frostbolt</b><span class="cbe-line"></span>';
 if(id==='controls')return'<b>FOCUS TARGET · DEFEND · SPREAD · RETREAT</b><span class="cbe-line"></span>';
 if(id==='actions')return'<b>TANK · HEALER · DAMAGE</b><span class="cbe-line"></span>';
 if(id==='cast')return'<b>ENEMY CAST · 2.4s</b><span class="cbe-line"></span>';
 return'<b>TACTICAL ORDERS</b><span class="cbe-line"></span>'
}
function panelHtml(id,title,s){
 return '<div class="cbe-panel'+(s.hidden?' hidden-slot':'')+(id===selected?' selected':'')+'" tabindex="0" role="button" aria-label="Move or resize '+title+'" data-slot="'+id+'" style="left:'+s.x+'%;top:'+s.y+'%;width:'+s.w+'%;height:'+s.h+'%"><div class="cbe-panel-head">'+title+'</div><div class="cbe-panel-body">'+sample(id)+'</div><div class="cbe-resize" data-resize="1" aria-label="Resize '+title+'">⌟</div></div>'
}
function modal(){
 let node=$('#cbeOverlay');if(node)return node;
 node=document.createElement('div');node.id='cbeOverlay';node.className='cbe-overlay';node.hidden=true;
 node.innerHTML='<section class="cbe-editor" role="dialog" aria-modal="true" aria-label="Combat UI Editor">'+
 '<div class="cbe-toolbar"><div><small>DESIGN BOOTH · OWNER TOOLS</small><h2>Combat UI Editor</h2></div>'+
 '<label>Mode <select id="cbeMode"></select></label><label>Screen <select id="cbeProfile"></select></label>'+
 '<button id="cbeUndo" type="button">↶ Undo</button><button id="cbeRedo" type="button">↷ Redo</button>'+
 '<button id="cbeSave" type="button">Save draft</button><button id="cbePublish" data-accent type="button">Apply to this device</button><button id="cbeClose" class="cbe-close" type="button">Close ✕</button></div>'+
 '<div class="cbe-workspace"><section class="cbe-center"><div class="cbe-info"><span><strong>Touch a panel</strong> to select and drag. Pull its gold corner to resize.</span><span id="cbeInfo"></span></div><div class="cbe-stage"><div class="cbe-canvas" id="cbeCanvas"></div></div></section>'+
 '<aside class="cbe-aside"><h3 id="cbeSelectedName">Battlefield</h3><p>Positions and sizes are percentages of the entire combat window.</p><div class="cbe-fields" id="cbeFields"></div>'+
 '<div class="cbe-inline"><button id="cbeVisible" type="button">Hide panel</button><button id="cbeResetPanel" type="button">Reset panel</button></div><hr>'+
 '<h3>Whole window</h3><div class="cbe-fields"><label>Width (px)<input id="cbeWidth" type="number" min="320" max="1800" step="20"></label><label>Height (px)<input id="cbeHeight" type="number" min="420" max="1500" step="20"></label></div>'+
 '<div class="cbe-inline"><button id="cbeGrid" type="button">Grid: On</button><button id="cbeReset" type="button">Reset layout</button></div><hr>'+
 '<h3>Save and share</h3><p>Drafts and applied layouts stay on this device. Export JSON to back them up or move them to another device. Applying is not a global release.</p>'+
 '<div class="cbe-inline"><button id="cbeExport" type="button">Export JSON</button><button id="cbeImport" type="button">Import JSON</button></div>'+
 '<div class="cbe-inline"><button id="cbeRevert" type="button">Remove device layout</button></div><p id="cbeStatus" class="cbe-status" role="status"></p></aside></div>'+
 '<div class="cbe-foot">OWNER PREVIEW · The preview mirrors the canonical Combat Reborn panel structure. Applied layouts affect this device only and never change combat logic.</div></section>';
 document.body.appendChild(node);bindModal(node);return node
}
function renderCanvas(){
 const canvas=$('#cbeCanvas');if(!canvas)return;
 const layout=getDraft(),size=PROFILES[profile];
 canvas.style.width='min(100%,'+size[0]+'px)';
 canvas.style.aspectRatio=size[0]+' / '+size[1];
 canvas.dataset.grid=grid?'1':'0';
 canvas.innerHTML=slots(mode).map(([id,title])=>panelHtml(id,title,layout.slots[id])).join('');
 $('#cbeInfo').textContent=profile.toUpperCase()+' · '+layout.width+' × '+layout.height;
 $$('[data-slot]',canvas).forEach(bindPanel);
 renderInspector()
}
function renderInspector(){
 const layout=getDraft(),slot=layout.slots[selected],title=slots(mode).find(x=>x[0]===selected)?.[1]||selected;
 $('#cbeSelectedName').textContent=title;
 const fields=$('#cbeFields');fields.innerHTML=['x','y','w','h'].map(k=>'<label>'+({x:'X position %',y:'Y position %',w:'Width %',h:'Height %'}[k])+'<input type="number" min="0" max="100" step="1" data-field="'+k+'" value="'+slot[k]+'"></label>').join('');
 $$('[data-field]',fields).forEach(i=>i.addEventListener('change',()=>{
  remember();const s=getDraft().slots[selected];s[i.dataset.field]=clamp(i.value,0,100);
  Object.assign(s,safeLayout({slots:{[selected]:s}},mode,profile).slots[selected]);renderCanvas();status('Unsaved changes')
 }));
 $('#cbeWidth').value=layout.width;$('#cbeHeight').value=layout.height;
 $('#cbeVisible').textContent=slot.hidden?'Show panel':'Hide panel';
 $('#cbeGrid').textContent=grid?'Grid: On':'Grid: Off';
 $('#cbeUndo').disabled=!undo.length;$('#cbeRedo').disabled=!redo.length
}
function select(id){
 selected=id;
 $$('.cbe-panel','#cbeOverlay'&&$('#cbeOverlay')).forEach(p=>p.classList.toggle('selected',p.dataset.slot===id));
 renderInspector()
}
function updatePanel(el,id){
 const s=getDraft().slots[id];
 el.style.left=s.x+'%';el.style.top=s.y+'%';el.style.width=s.w+'%';el.style.height=s.h+'%'
}
function bindPanel(el){
 el.addEventListener('pointerdown',e=>{
  if(e.button!==undefined&&e.button!==0)return;
  e.preventDefault();e.stopPropagation();
  const id=el.dataset.slot,isResize=Boolean(e.target.closest('[data-resize]')),canvas=$('#cbeCanvas');
  select(id);remember();
  const start=copy(getDraft().slots[id]),sx=e.clientX,sy=e.clientY;
  el.setPointerCapture(e.pointerId);
  function move(ev){
   const rect=canvas.getBoundingClientRect(),dx=(ev.clientX-sx)/Math.max(1,rect.width)*100,dy=(ev.clientY-sy)/Math.max(1,rect.height)*100;
   const q=grid?1:0.1,r=v=>Math.round(v/q)*q,slot=getDraft().slots[id];
   if(isResize){slot.w=clamp(r(start.w+dx),4,100-start.x);slot.h=clamp(r(start.h+dy),4,100-start.y)}
   else{slot.x=clamp(r(start.x+dx),0,100-start.w);slot.y=clamp(r(start.y+dy),0,100-start.h)}
   updatePanel(el,id);
   // Do not rebuild the panel during pointer capture (especially on iPad).
   $$('[data-field]',$('#cbeFields')).forEach(input=>{input.value=slot[input.dataset.field]});
   status('Unsaved changes · Save draft to keep these positions')
  }
  function stop(ev){el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',stop);el.removeEventListener('pointercancel',stop);try{el.releasePointerCapture(ev.pointerId)}catch{};renderInspector()}
  el.addEventListener('pointermove',move);el.addEventListener('pointerup',stop);el.addEventListener('pointercancel',stop)
 });
 el.addEventListener('click',()=>select(el.dataset.slot));
 el.addEventListener('keydown',e=>{
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
  e.preventDefault();select(el.dataset.slot);remember();
  const s=getDraft().slots[selected],step=e.shiftKey?5:1;
  if(e.key==='ArrowUp')s.y=clamp(s.y-step,0,100-s.h);
  if(e.key==='ArrowDown')s.y=clamp(s.y+step,0,100-s.h);
  if(e.key==='ArrowLeft')s.x=clamp(s.x-step,0,100-s.w);
  if(e.key==='ArrowRight')s.x=clamp(s.x+step,0,100-s.w);
  updatePanel(el,selected);renderInspector()
 })
}
function changeMode(next){mode=next;selected='battlefield';undo=[];redo=[];renderCanvas()}
function changeProfile(next){profile=next;selected='battlefield';undo=[];redo=[];renderCanvas()}
function bindModal(node){
 $('#cbeMode',node).addEventListener('change',e=>changeMode(e.target.value));
 $('#cbeProfile',node).addEventListener('change',e=>changeProfile(e.target.value));
 $('#cbeClose',node).onclick=close;
 $('#cbeUndo',node).onclick=()=>{if(!undo.length)return;redo.push(snapshot());state.drafts[mode][profile]=undo.pop();renderCanvas()};
 $('#cbeRedo',node).onclick=()=>{if(!redo.length)return;undo.push(snapshot());state.drafts[mode][profile]=redo.pop();renderCanvas()};
 $('#cbeSave',node).onclick=()=>{persist();status('Draft saved on this device')};
 $('#cbePublish',node).onclick=()=>{
  if(!owner())return;
  state.applied[mode] ||= {};state.applied[mode][profile]=snapshot();
  persist();refreshLive();status('Applied on this device. Open a combat encounter to check it.')
 };
 $('#cbeVisible',node).onclick=()=>{remember();getDraft().slots[selected].hidden=!getDraft().slots[selected].hidden;renderCanvas()};
 $('#cbeResetPanel',node).onclick=()=>{remember();getDraft().slots[selected]=defaultSlot(mode,profile,selected);renderCanvas()};
 $('#cbeGrid',node).onclick=()=>{grid=!grid;renderCanvas()};
 $('#cbeReset',node).onclick=()=>{if(!confirm('Reset every panel in this draft?'))return;remember();state.drafts[mode][profile]=defaultLayout(mode,profile);renderCanvas()};
 ['width','height'].forEach(dim=>$('#cbe'+dim[0].toUpperCase()+dim.slice(1),node).addEventListener('change',e=>{remember();getDraft()[dim]=clamp(e.target.value,dim==='width'?320:420,dim==='width'?1800:1500);renderCanvas()}));
 $('#cbeExport',node).onclick=()=>{
  const value=JSON.stringify({version:1,mode,profile,layout:snapshot()},null,2);
  const file=new Blob([value],{type:'application/json'}),url=URL.createObjectURL(file),a=document.createElement('a');
  a.href=url;a.download='cellbound-combat-ui-'+mode+'-'+profile+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  status('JSON exported')
 };
 $('#cbeImport',node).onclick=()=>{
  const raw=prompt('Paste a Combat UI Editor JSON export:');if(!raw)return;
  try{const data=JSON.parse(raw);if(data.version!==1||data.mode!==mode||data.profile!==profile||!data.layout?.slots)throw Error('Choose the matching mode and screen first');
    remember();state.drafts[mode][profile]=safeLayout(data.layout,mode,profile);renderCanvas();status('Imported to draft. Save or apply when ready.')
  }catch(error){status('Invalid layout: '+error.message)}
 };
 $('#cbeRevert',node).onclick=()=>{
  if(!state.applied[mode]?.[profile])return;
  if(!confirm('Remove this device layout for '+MODES[mode]+' / '+profile+'?'))return;
  delete state.applied[mode][profile];persist();refreshLive();status('Device override removed')
 };
}
function open(){
 if(!owner())return false;
 const host=$('#combatUILayoutMount');
 if(host){host.hidden=false;host.innerHTML='<div class="cbe-reopen"><h3>Combat UI Layout Editor</h3><p>Drag and resize the complete combat window. Drafts and applied layouts are private to this device.</p><button type="button" id="cbeReopenEditor">OPEN VISUAL EDITOR</button></div>';$('#cbeReopenEditor',host)?.addEventListener('click',()=>open())}
 state=load();opened=true;
 const node=modal();node.hidden=false;
 $('#cbeMode').innerHTML=opt(MODES,mode);$('#cbeProfile').innerHTML=opt(Object.fromEntries(Object.keys(PROFILES).map(k=>[k,k[0].toUpperCase()+k.slice(1)])),profile);
 document.body.classList.add('cbe-editor-open');renderCanvas();status('Owner draft · No combat data is changed');
 return true
}
function close(){opened=false;const node=$('#cbeOverlay');if(node)node.hidden=true;document.body.classList.remove('cbe-editor-open')}
function syncAccess(){
 if(!owner())close()
}
function activeProfile(){const touch=window.matchMedia?.('(pointer:coarse)')?.matches||false;return window.innerWidth<=600?'mobile':(window.innerWidth<=1100||(touch&&window.innerWidth<=1500))?'tablet':'desktop'}
function liveMode(shell){
 if(shell.dataset.combatProfile!=='pvp')return'pve';
 const m=String(shell.querySelector('[data-pvp-mode]')?.dataset.pvpMode||'arena');
 return m==='capture-the-flag'?'ctf':m==='king-of-the-hill'?'hill':'arena'
}
const originals=new WeakMap();
function rememberStyle(el){if(el&&!originals.has(el))originals.set(el,el.getAttribute('style'))}
function restoreStyle(el){if(!el||!originals.has(el))return;const v=originals.get(el);if(v===null)el.removeAttribute('style');else el.setAttribute('style',v);originals.delete(el)}
function styleElement(el,s){
 if(!el)return;rememberStyle(el);
 for(const [k,v]of Object.entries({position:'absolute',left:s.x+'%',top:s.y+'%',right:'auto',bottom:'auto',width:s.w+'%',height:s.h+'%',minHeight:'0',maxHeight:'none',overflow:'auto',display:s.hidden?'none':null,zIndex:'2',margin:'0',boxSizing:'border-box'})){
  const name=k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());if(v===null)el.style.removeProperty(name);else el.style.setProperty(name,v,'important')
 }
}
function clearShell(shell){
 if(!shell.classList.contains('cbe-live'))return;
 for(const [,,selector]of PVE)restoreStyle(shell.querySelector(selector));
 restoreStyle(shell);shell.style.removeProperty('--cbe-width');shell.style.removeProperty('--cbe-height');
 shell.classList.remove('cbe-live');delete shell.dataset.cbeProfile;delete shell.dataset.cbeMode
}
function refreshLive(){
 document.querySelectorAll('.cbcombat-shell[data-combat-view="canonical-v1"]').forEach(shell=>{clearShell(shell);applyShell(shell)})
}
function applyShell(shell){
 if(!owner()||!shell||shell.classList.contains('results-mode')||!shell.querySelector('.cbcombat-arena-wrap'))return;
 const m=liveMode(shell),p=activeProfile(),raw=state.applied[m]?.[p];if(!raw)return;
 if(shell.classList.contains('cbe-live')&&shell.dataset.cbeProfile===p&&shell.dataset.cbeMode===m)return;
 clearShell(shell);const cfg=safeLayout(raw,m,p);rememberStyle(shell);
 shell.style.setProperty('--cbe-width',cfg.width+'px');shell.style.setProperty('--cbe-height',cfg.height+'px');
 shell.classList.add('cbe-live');shell.dataset.cbeMode=m;shell.dataset.cbeProfile=p;
 for(const [id,,selector]of slots(m))styleElement(shell.querySelector(selector),cfg.slots[id]);
}
function scan(){
 scheduled=false;
 if(!owner()||!Object.keys(state.applied).length)return;
 $('.cbcombat-shell[data-combat-view="canonical-v1"]').forEach(applyShell)
}
function scheduleScan(){if(scheduled)return;scheduled=true;requestAnimationFrame(scan)}
function init(){
 if(started)return;
 if(!document.body){setTimeout(init,150);return}
 started=true;state=load();profile=activeProfile();
 window.addEventListener('cellbound:admin-status',()=>{state=load();syncAccess();scheduleScan()});
 window.addEventListener('cellbound:view-changed',syncAccess);
 window.addEventListener('resize',()=>{scheduleScan()},{passive:true});
 observer=new MutationObserver(records=>{
  if(!owner()||!Object.keys(state.applied).length)return;
  if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.cbcombat-shell[data-combat-view="canonical-v1"]')||n.querySelector?.('.cbcombat-shell[data-combat-view="canonical-v1"]')))))scheduleScan()
 });
 observer.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened)close()});
 syncAccess();scheduleScan()
}
window.CellboundCombatUILayoutEditor={open,close,isOwner:owner,refreshLive,preview:()=>copy(getDraft()),validate:safeLayout};
init();
})();
