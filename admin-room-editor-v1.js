(()=>{
'use strict';

const STORAGE_KEY='cellbound-owner-room-editor-v1';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Number(v)||0));
const clone=v=>JSON.parse(JSON.stringify(v));
const pt=(kind,label,x,y)=>({kind,label,x,y});

const CATALOG=[
 {id:'ashen-vault',name:'Ashen Vault',type:'Dungeon',rooms:[
  ['broken-gate','The Broken Gate','./assets/ashen-vault/battlefields/broken-gate.avif',[pt('entry','Entrance',21,92),pt('exit','Exit',90,23),pt('party','Party',45,56),pt('enemy','Enemy 1',61,37),pt('enemy','Enemy 2',68,45),pt('enemy','Enemy 3',69,58)]],
  ['hall-embers','Hall of Embers','./assets/ashen-vault/battlefields/hall-embers.avif',[pt('entry','Entrance',50,94),pt('exit','Exit',50,3),pt('party','Party',50,60),pt('enemy','Enemy 1',50,32),pt('enemy','Enemy 2',39,40),pt('enemy','Enemy 3',61,40)]],
  ['kael','Ash Warden Kael','./assets/ashen-vault/battlefields/kael.avif',[pt('entry','Entrance',50,95),pt('exit','Exit',50,2),pt('party','Party',50,61),pt('enemy','Kael',50,43)]],
  ['furnace','Furnace Passage','./assets/ashen-vault/battlefields/furnace.avif',[pt('entry','Entrance',17,18),pt('exit','Exit',89,84),pt('party','Party',38,39),pt('enemy','Enemy 1',61,50),pt('enemy','Enemy 2',69,62)]],
  ['embermaw','Embermaw','./assets/ashen-vault/battlefields/embermaw.avif',[pt('entry','Entrance',7,51),pt('exit','Exit',93,51),pt('party','Party',42,50),pt('enemy','Embermaw',62,50)]],
  ['vault-depths','Vault Depths','./assets/ashen-vault/battlefields/vault-depths.avif',[pt('entry','Entrance',50,94),pt('exit','Exit',50,4),pt('party','Party',50,67),pt('enemy','Enemy 1',50,38),pt('enemy','Enemy 2',41,46),pt('enemy','Enemy 3',59,46)]],
  ['vaultheart','The Vaultheart','./assets/ashen-vault/battlefields/vaultheart.avif',[pt('entry','Entrance',50,95),pt('party','Party',50,70),pt('enemy','Vaultheart',50,40)]]
 ]},
 {id:'hollow-sanctum',name:'Hollow Sanctum',type:'Dungeon',rooms:[
  ['gallery','Gallery of Echoes','./assets/hollow-sanctum/rooms/gallery.webp',[pt('entry','Entrance',50,98),pt('exit','Exit',50,4),pt('party','Party',50,68),pt('enemy','Enemy 1',50,43),pt('enemy','Enemy 2',40,49),pt('enemy','Enemy 3',60,49)]],
  ['sentinel','Glassjaw Sentinel','./assets/hollow-sanctum/rooms/sentinel.webp',[pt('entry','Entrance',50,98),pt('exit','Exit',50,5),pt('party','Party',50,70),pt('enemy','Sentinel',50,53)]],
  ['choir','The Bound Choir','./assets/hollow-sanctum/rooms/choir.webp',[pt('entry','Entrance',50,98),pt('party','Party',50,72),pt('enemy','Choir',50,56),pt('add','Add L',35,57),pt('add','Add R',65,57)]]
 ]},
 {id:'chaos-canyon',name:'Chaos Canyon',type:'Dungeon',rooms:[
  ['canyon-mouth','Canyon Mouth','./assets/chaos-canyon/rooms/canyon-mouth.webp',[pt('entry','Entrance',50,98),pt('exit','Exit',50,3),pt('party','Party',50,67),pt('enemy','Enemy 1',50,36),pt('enemy','Enemy 2',41,44),pt('enemy','Enemy 3',59,44)]],
  ['thorn-trail','Thorn Trail','./assets/chaos-canyon/rooms/thorn-trail.webp',[pt('entry','Entrance',50,98),pt('exit','Exit',50,3),pt('party','Party',50,67),pt('enemy','Enemy 1',50,36),pt('enemy','Enemy 2',42,44),pt('enemy','Enemy 3',58,44)]],
  ['sentinel','Sentinel Basin','./assets/chaos-canyon/rooms/sentinel.webp',[pt('entry','Entrance',50,98),pt('exit','Exit',50,3),pt('party','Party',50,68),pt('enemy','Sentinel',50,40)]],
  ['crossing','Chaos Crossing','./assets/chaos-canyon/rooms/crossing.webp',[pt('entry','Entrance',14,82),pt('exit','Exit',86,18),pt('party','Party',20,75),pt('mechanic','Stone 1',31,66),pt('mechanic','Stone 4',50,50),pt('mechanic','Stone 7',69,34)]],
  ['warden','The Chaos Warden','./assets/chaos-canyon/rooms/warden.webp',[pt('entry','Entrance',50,98),pt('exit','Exit',9,4),pt('party','Party',50,67),pt('enemy','Warden',58,42)]],
  ['wildheart','Wildheart Passage','./assets/chaos-canyon/rooms/wildheart.webp',[pt('entry','Entrance',50,98),pt('exit','Exit',50,3),pt('party','Party',50,68),pt('enemy','Enemy 1',50,38),pt('enemy','Enemy 2',41,46),pt('enemy','Enemy 3',59,46)]],
  ['vorran','Archdruid Vorran','./assets/chaos-canyon/rooms/vorran.webp',[pt('entry','Entrance',50,98),pt('party','Party',50,70),pt('enemy','Vorran',50,38)]]
 ]},
 {id:'blackout-station',name:'Blackout Station',type:'Dungeon',rooms:[
  ['grid','Grid Alignment',null,[pt('entry','Entrance',50,92),pt('exit','Generator Hall',50,8),pt('party','Party',50,76)]],
  ['calder','Dr. Vex Calder','./assets/blackout-station/rooms/vex-calder-room-v2.avif',[pt('entry','Entrance',10,50),pt('party','Party',30,50),pt('enemy','Dr. Calder',62,50),pt('mechanic','Tank',27,27),pt('mechanic','Damage',48,74),pt('mechanic','Healer',73,27)]]
 ]},
 {id:'fractured-ages',name:'The Fractured Ages',type:'Dungeon',rooms:[
  ['high-noon','High Noon','./assets/fractured-ages/rooms/high-noon.webp',[pt('entry','Entrance',12,78),pt('exit','Next fracture',88,18),pt('party','Party',34,65),pt('enemy','Deadeye Mercer',66,38)]],
  ['iron-kingdom','Iron Kingdom','./assets/fractured-ages/rooms/iron-kingdom.webp',[pt('entry','Entrance',50,90),pt('exit','Next fracture',50,8),pt('party','Party',50,68),pt('enemy','Hollow Knight',50,36)]],
  ['first-kingdom','First Kingdom','./assets/fractured-ages/rooms/first-kingdom.webp',[pt('entry','Entrance',50,90),pt('exit','Next fracture',50,8),pt('party','Party',50,70),pt('enemy','Amun-Rael',50,34)]],
  ['silent-frontier','Silent Frontier','./assets/fractured-ages/rooms/silent-frontier.webp',[pt('entry','Entrance',13,82),pt('exit','Next fracture',87,18),pt('party','Party',34,66),pt('enemy','Commander Veyra',68,38)]],
  ['funhouse','The Funhouse','./assets/fractured-ages/rooms/funhouse.webp',[pt('entry','Entrance',50,90),pt('party','Party',50,70),pt('enemy','Old Man',50,33),pt('add','Echo L',34,42),pt('add','Echo R',66,42)]]
 ]},
 {id:'the-manor',name:'The Manor',type:'Raid',rooms:[
  ['entrance-hall','Entrance Hall · Butler','./assets/manor/manor-butler.webp',[pt('entry','Entrance',50,92),pt('exit','Dining split',50,8),pt('party','Raid',34,66),pt('enemy','Butler',62,42)]],
  ['dining-room','Dining Room · Maid A','./assets/manor/manor-maids.webp',[pt('entry','Entrance',50,92),pt('exit','Rejoin',50,8),pt('party','Party A',34,66),pt('enemy','Maid',64,40)]],
  ['kitchen','Kitchen · Maid B','./assets/manor/manor-maids.webp',[pt('entry','Entrance',50,92),pt('exit','Rejoin',50,8),pt('party','Party B',34,66),pt('enemy','Maid',64,40)]],
  ['workshop','Upper Workshop · Engineer','./assets/manor/manor-engineer.webp',[pt('entry','Entrance',50,92),pt('exit','West Bedroom',50,8),pt('party','Raid',36,67),pt('enemy','Engineer',64,40),pt('add','Turret L',55,28),pt('add','Turret R',73,30)]],
  ['bedroom','West Bedroom',null,[pt('entry','Entrance',50,92),pt('exit','Attic',50,8),pt('party','Raid',50,70),pt('enemy','Swarm',50,38)]],
  ['attic','The Attic · Master','./assets/manor/manor-master.webp',[pt('entry','Entrance',50,92),pt('party','Raid',38,68),pt('enemy','Master',62,38)]]
 ]}
].map(group=>({...group,rooms:group.rooms.map(r=>({id:r[0],name:r[1],art:r[2],markers:r[3]}))}));

const AUDIT=[
 {level:'blocker',title:'Hollow Sanctum quest card',copy:'quests-v2.js references assets/dungeons/hollow-sanctum.webp, but that file is not present in the repository.'},
 {level:'work',title:'Blackout Station room coverage',copy:'Only the Calder generator hall has dedicated playable room artwork. The grid/puzzle stage still needs its own production room scene.'},
 {level:'work',title:'The Manor room coverage',copy:'Current raid visuals are encounter/boss art. West Bedroom has no art at all; Dining Room and Kitchen currently share the Maids image.'},
 {level:'work',title:'Quest comic coverage',copy:'Tutorial and Null Complex have dedicated comic sets. Fourfold Lock and No Way Back currently have no comic presentation integration.'},
 {level:'review',title:'UI / combat style stack',copy:'The live shell still loads overlapping generations of combat polish and older quest/UI styles. These need a later cleanup pass before beta lock.'},
 {level:'review',title:'Fractured Ages placement',copy:'All five encounter images exist, but spawn/entrance/exit placement needs owner review because this content does not yet use one shared room-layout schema.'}
];

let opened=false;
let contentId='ashen-vault';
let roomId='broken-gate';
let showGrid=true;
let dirty=false;
let state=load();

function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{}}catch{return{}}}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch{}}
function isOwner(){return Boolean(window.CellboundAdmin?.isAdmin)&&String(window.CellboundAdmin?.role||'').toLowerCase()==='owner'}
function group(){return CATALOG.find(x=>x.id===contentId)||CATALOG[0]}
function room(){return group().rooms.find(x=>x.id===roomId)||group().rooms[0]}
function roomKey(){return contentId+'::'+roomId}
function roomDraft(){
 const base=room(),saved=state.rooms?.[roomKey()];
 return saved?{...clone(base),...saved,markers:Array.isArray(saved.markers)?saved.markers:clone(base.markers)}:clone(base)
}
function saveRoom(draft,status){
 state.rooms=state.rooms||{};
 state.rooms[roomKey()]={markers:clone(draft.markers),review:status||state.rooms?.[roomKey()]?.review||'unreviewed',updatedAt:new Date().toISOString()};
 state.last={contentId,roomId};
 persist();dirty=false;render()
}
function resetRoom(){
 if(state.rooms){delete state.rooms[roomKey()];persist()}
 dirty=false;render()
}
function reviewStatus(){return state.rooms?.[roomKey()]?.review||'unreviewed'}
function setDirty(){dirty=true;const e=$('#rqeSaveState');if(e){e.textContent='UNSAVED CHANGES';e.className='rqe-dirty'}}
function markerHTML(m,i){return '<button type="button" class="rqe-marker" data-marker="'+i+'" data-kind="'+esc(m.kind)+'" style="left:'+clamp(m.x)+'%;top:'+clamp(m.y)+'%" aria-label="'+esc(m.label)+'"><span>'+esc(String(i+1))+'</span><em>'+esc(m.label)+'</em></button>'}
function legend(){return '<div class="rqe-legend">'+[['entry','#1d8a63','Entrance'],['exit','#7258bd','Exit'],['party','#287eaa','Party'],['enemy','#b74242','Enemy/Boss'],['add','#b87827','Adds'],['mechanic','#8e3aa5','Mechanic']].map(x=>'<span><i style="background:'+x[1]+'"></i>'+x[2]+'</span>').join('')+'</div>'}
function auditHTML(){return '<div class="rqe-audit"><div class="rqe-audit-head"><div><small>BETA COMPLETION AUDIT</small><h3>Known work from first scan</h3></div><span>'+AUDIT.length+' findings</span></div><div class="rqe-audit-list">'+AUDIT.map(a=>'<article class="rqe-audit-item" data-level="'+a.level+'"><header><b>'+esc(a.title)+'</b><em>'+({blocker:'BLOCKER',work:'NEEDS WORK',review:'REVIEW'})[a.level]+'</em></header><p>'+esc(a.copy)+'</p></article>').join('')+'</div></div>'}
function statusOptions(v){return [['unreviewed','Unreviewed'],['complete','Complete'],['needs-work','Needs work'],['blocker','Blocker']].map(x=>'<option value="'+x[0]+'" '+(v===x[0]?'selected':'')+'>'+x[1]+'</option>').join('')}
function jsonFor(draft){return JSON.stringify({content:contentId,room:roomId,markers:draft.markers},null,2)}
function render(){
 const mount=$('#roomEditorMount');if(!mount||!opened||!isOwner())return;
 const g=group(),r=room(),d=roomDraft(),idx=g.rooms.findIndex(x=>x.id===r.id),status=reviewStatus();
 const contentOptions=CATALOG.map(x=>'<option value="'+x.id+'" '+(x.id===contentId?'selected':'')+'>'+esc(x.type+' · '+x.name)+'</option>').join('');
 const roomOptions=g.rooms.map(x=>'<option value="'+x.id+'" '+(x.id===roomId?'selected':'')+'>'+esc(x.name)+'</option>').join('');
 const art=d.art?'<img src="'+esc(d.art)+'" alt="'+esc(d.name)+'" draggable="false" data-room-art>':'<div class="rqe-missing"><div><b>No dedicated room artwork</b><span>This is a confirmed beta art gap, not an image loading error.</span></div></div>';
 mount.innerHTML='<section class="rqe-shell">'+
  '<header class="rqe-head"><div><small>OWNER CONTENT QA · BETA BUILD 1</small><h2>Room Editor</h2><p>Inspect every dungeon and raid room without playing through the run. Drag entrances, exits and spawn markers directly on the production artwork. Draft coordinates are stored on this device until they are promoted into the live room configuration.</p></div><div class="rqe-head-actions"><button id="rqeCopyAll">COPY ALL DRAFTS</button><button id="rqeClose">CLOSE</button></div></header>'+
  '<div class="rqe-toolbar"><label><span>CONTENT</span><select id="rqeContent">'+contentOptions+'</select></label><label><span>ROOM / ENCOUNTER</span><select id="rqeRoom">'+roomOptions+'</select></label><button id="rqeGrid">'+(showGrid?'HIDE GRID':'SHOW GRID')+'</button><button id="rqeReset">RESET ROOM</button></div>'+
  '<div class="rqe-grid"><main class="rqe-main"><div id="rqeCanvas" class="rqe-canvas-wrap '+(showGrid?'rqe-show-grid ':'')+(d.art?'':'missing-art')+'">'+art+'<div class="rqe-gridlines"></div><div class="rqe-axis"></div>'+d.markers.map(markerHTML).join('')+'</div>'+
  '<div class="rqe-room-meta"><div class="rqe-room-copy"><b>'+esc(g.name+' · '+r.name)+'</b><span>'+(d.art?'Production art loaded from '+esc(d.art.replace('./','')):'Dedicated room art missing')+'</span>'+legend()+'</div><div class="rqe-room-nav"><button id="rqePrev" '+(idx<=0?'disabled':'')+'>← PREV</button><button id="rqeNext" '+(idx>=g.rooms.length-1?'disabled':'')+'>NEXT →</button></div></div></main>'+
  '<aside class="rqe-side"><section class="rqe-inspector"><small>ROOM REVIEW</small><h3>Layout state</h3><label><small>STATUS</small><select id="rqeReview">'+statusOptions(status)+'</select></label><div class="rqe-inspector-grid"><div><b>'+d.markers.filter(x=>x.kind==='party').length+'</b><span>party anchors</span></div><div><b>'+d.markers.filter(x=>x.kind==='enemy'||x.kind==='add').length+'</b><span>hostile anchors</span></div><div><b>'+d.markers.filter(x=>x.kind==='entry').length+'</b><span>entrances</span></div><div><b>'+d.markers.filter(x=>x.kind==='exit').length+'</b><span>exits</span></div></div><div class="rqe-inspector-actions"><button class="primary" id="rqeSave">SAVE ROOM DRAFT</button><button id="rqeCopy">COPY ROOM JSON</button></div><div id="rqeSaveState" class="'+(dirty?'rqe-dirty':'rqe-dirty rqe-saved')+'">'+(dirty?'UNSAVED CHANGES':state.rooms?.[roomKey()]?.updatedAt?'SAVED ON THIS DEVICE':'USING CURRENT DEFAULTS')+'</div><div class="rqe-json"><small>CURRENT COORDINATES</small><pre id="rqeJson">'+esc(jsonFor(d))+'</pre></div></section>'+auditHTML()+'</aside></div></section>';
 bind(d)
}
function bind(draft){
 $('#rqeClose')?.addEventListener('click',close);
 $('#rqeContent')?.addEventListener('change',e=>{contentId=e.target.value;roomId=group().rooms[0].id;dirty=false;render()});
 $('#rqeRoom')?.addEventListener('change',e=>{roomId=e.target.value;dirty=false;render()});
 $('#rqeGrid')?.addEventListener('click',()=>{showGrid=!showGrid;render()});
 $('#rqeReset')?.addEventListener('click',()=>{if(confirm('Reset this room to the current game defaults?'))resetRoom()});
 $('#rqePrev')?.addEventListener('click',()=>moveRoom(-1));
 $('#rqeNext')?.addEventListener('click',()=>moveRoom(1));
 $('#rqeSave')?.addEventListener('click',()=>saveRoom(draft,$('#rqeReview')?.value));
 $('#rqeReview')?.addEventListener('change',()=>setDirty());
 $('#rqeCopy')?.addEventListener('click',()=>copyText(jsonFor(draft),'Room JSON copied.'));
 $('#rqeCopyAll')?.addEventListener('click',()=>copyText(JSON.stringify(state,null,2),'All room-editor drafts copied.'));
 const canvas=$('#rqeCanvas');
 canvas?.querySelectorAll('[data-marker]').forEach(el=>{
  let dragging=false;
  const move=e=>{
   if(!dragging)return;
   const rect=canvas.getBoundingClientRect(),x=clamp((e.clientX-rect.left)/rect.width*100),y=clamp((e.clientY-rect.top)/rect.height*100);
   const i=Number(el.dataset.marker),m=draft.markers[i];if(!m)return;
   m.x=Math.round(x*10)/10;m.y=Math.round(y*10)/10;
   el.style.left=m.x+'%';el.style.top=m.y+'%';
   const pre=$('#rqeJson');if(pre)pre.textContent=jsonFor(draft);
   setDirty();e.preventDefault()
  };
  el.addEventListener('pointerdown',e=>{dragging=true;el.setPointerCapture?.(e.pointerId);move(e)});
  el.addEventListener('pointermove',move);
  el.addEventListener('pointerup',e=>{dragging=false;el.releasePointerCapture?.(e.pointerId)});
  el.addEventListener('pointercancel',()=>{dragging=false})
 })
 $('#rqeReview')?.addEventListener('change',e=>{state.rooms=state.rooms||{};state.rooms[roomKey()]={...(state.rooms[roomKey()]||{}),markers:clone(draft.markers),review:e.target.value};setDirty()})
}
function moveRoom(delta){
 const g=group(),i=g.rooms.findIndex(x=>x.id===roomId),n=Math.max(0,Math.min(g.rooms.length-1,i+delta));roomId=g.rooms[n].id;dirty=false;render()
}
async function copyText(value,message){
 try{await navigator.clipboard.writeText(value);flash(message)}catch{const t=document.createElement('textarea');t.value=value;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();flash(message)}
}
function flash(message){const e=$('#rqeSaveState');if(e){e.textContent=message;e.className='rqe-dirty rqe-saved';setTimeout(()=>{if(e.isConnected)e.textContent=dirty?'UNSAVED CHANGES':'READY'},1200)}}
function open(){
 if(!isOwner())return;
 const mount=$('#roomEditorMount');if(!mount)return;
 opened=true;
 if(state.last?.contentId&&CATALOG.some(x=>x.id===state.last.contentId)){contentId=state.last.contentId;const g=group();roomId=g.rooms.some(x=>x.id===state.last.roomId)?state.last.roomId:g.rooms[0].id}
 mount.hidden=false;render();requestAnimationFrame(()=>mount.scrollIntoView({behavior:'smooth',block:'start'}))
}
function close(){opened=false;const mount=$('#roomEditorMount');if(mount){mount.hidden=true;mount.innerHTML=''}}
function syncAccess(){const entry=$('#roomEditorEntry'),mount=$('#roomEditorMount'),owner=isOwner();if(entry)entry.hidden=!owner;if(!owner&&mount)close()}
function init(){
 const entry=$('#roomEditorEntry');if(!entry){setTimeout(init,150);return}
 entry.querySelector('#openRoomEditor')?.addEventListener('click',open);
 window.addEventListener('cellbound:admin-status',syncAccess);
 window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='admin')setTimeout(syncAccess,0)});
 syncAccess()
}
window.CellboundRoomEditor={open,close,render,isOwner,catalog:()=>clone(CATALOG),audit:()=>clone(AUDIT)};
init()
})();