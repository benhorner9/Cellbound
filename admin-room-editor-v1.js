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
  ['broken-gate','The Broken Gate','./assets/ashen-vault/rooms/broken-gate.webp',[pt('entry','Entrance',21,92),pt('exit','Exit',90,23),pt('party','Party',45,56),pt('enemy','Enemy 1',61,37),pt('enemy','Enemy 2',68,45),pt('enemy','Enemy 3',69,58)]],
  ['hall-embers','Hall of Embers','./assets/ashen-vault/rooms/hall-embers.webp',[pt('entry','Entrance',50,94),pt('exit','Exit',50,3),pt('party','Party',50,60),pt('enemy','Enemy 1',50,32),pt('enemy','Enemy 2',39,40),pt('enemy','Enemy 3',61,40)]],
  ['kael','Ash Warden Kael','./assets/ashen-vault/rooms/kael.webp',[pt('entry','Entrance',50,95),pt('exit','Exit',50,2),pt('party','Party',50,61),pt('enemy','Kael',50,43)]],
  ['furnace','Furnace Passage','./assets/ashen-vault/rooms/furnace.webp',[pt('entry','Entrance',17,18),pt('exit','Exit',89,84),pt('party','Party',38,39),pt('enemy','Enemy 1',61,50),pt('enemy','Enemy 2',69,62)]],
  ['embermaw','Embermaw','./assets/ashen-vault/rooms/embermaw.webp',[pt('entry','Entrance',7,51),pt('exit','Exit',93,51),pt('party','Party',42,50),pt('enemy','Embermaw',62,50)]],
  ['vault-depths','Vault Depths','./assets/ashen-vault/rooms/vault-depths.webp',[pt('entry','Entrance',50,94),pt('exit','Exit',50,4),pt('party','Party',50,67),pt('enemy','Enemy 1',50,38),pt('enemy','Enemy 2',41,46),pt('enemy','Enemy 3',59,46)]],
  ['vaultheart','The Vaultheart','./assets/ashen-vault/rooms/vaultheart.webp',[pt('entry','Entrance',50,95),pt('party','Party',50,70),pt('enemy','Vaultheart',50,40)]]
 ]},
 {id:'hollow-sanctum',name:'Hollow Sanctum',type:'Dungeon',rooms:[
  ['gallery','Gallery of Echoes','./assets/hollow-sanctum/rooms/gallery-void-v2.webp',[pt('entry','Entrance',50,98),pt('exit','Exit',50,4),pt('party','Party',50,68),pt('enemy','Enemy 1',50,43),pt('enemy','Enemy 2',40,49),pt('enemy','Enemy 3',60,49)]],
  ['sentinel','Glassjaw Sentinel','./assets/hollow-sanctum/rooms/sentinel-void-v2.webp',[pt('entry','Entrance',50,98),pt('exit','Exit',50,5),pt('party','Party',50,70),pt('enemy','Sentinel',50,53)]],
  ['choir','The Bound Choir','./assets/hollow-sanctum/rooms/choir-void-v2.webp',[pt('entry','Entrance',50,98),pt('party','Party',50,72),pt('enemy','Choir',50,56),pt('add','Add L',35,57),pt('add','Add R',65,57)]]
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
  ['grid','Grid Alignment','./assets/dungeons/blackout-station.webp',[pt('entry','Entrance',50,92),pt('exit','Generator Hall',50,8),pt('party','Party',50,76)]],
  ['calder','Dr. Vex Calder','./assets/blackout-station/rooms/vex-calder-room.avif',[pt('entry','Entrance',10,50),pt('party','Party',30,50),pt('enemy','Dr. Calder',62,50),pt('mechanic','Tank',27,27),pt('mechanic','Damage',48,74),pt('mechanic','Healer',73,27)]]
 ]},
 {id:'fractured-ages',name:'The Fractured Ages',type:'Dungeon',rooms:[
  ['high-noon','High Noon','./assets/fractured-ages/rooms/high-noon.webp',[pt('entry','Entrance',12,78),pt('exit','Next fracture',88,18),pt('party','Party',34,65),pt('enemy','Deadeye Mercer',66,38)]],
  ['iron-kingdom','Iron Kingdom','./assets/fractured-ages/rooms/iron-kingdom.webp',[pt('entry','Entrance',50,90),pt('exit','Next fracture',50,8),pt('party','Party',50,68),pt('enemy','Hollow Knight',50,36)]],
  ['first-kingdom','First Kingdom','./assets/fractured-ages/rooms/first-kingdom.webp',[pt('entry','Entrance',50,90),pt('exit','Next fracture',50,8),pt('party','Party',50,70),pt('enemy','Amun-Rael',50,34)]],
  ['silent-frontier','Silent Frontier','./assets/fractured-ages/rooms/silent-frontier.webp',[pt('entry','Entrance',13,82),pt('exit','Next fracture',87,18),pt('party','Party',34,66),pt('enemy','Commander Veyra',68,38)]],
  ['funhouse','The Funhouse','./assets/fractured-ages/rooms/funhouse.webp',[pt('entry','Entrance',50,90),pt('party','Party',50,70),pt('enemy','Old Man',50,33),pt('add','Echo L',34,42),pt('add','Echo R',66,42)]]
 ]},
 {id:'the-manor',name:'The Manor',type:'Raid',rooms:[
  ['entrance-hall','Entrance Hall · Butler',null,[pt('entry','Entrance',50,92),pt('exit','Dining split',50,8),pt('party','Raid',34,66),pt('enemy','Butler',62,42)]],
  ['dining-room','Dining Room · Maid A',null,[pt('entry','Entrance',50,92),pt('exit','Rejoin',50,8),pt('party','Party A',34,66),pt('enemy','Maid',64,40)]],
  ['kitchen','Kitchen · Maid B',null,[pt('entry','Entrance',50,92),pt('exit','Rejoin',50,8),pt('party','Party B',34,66),pt('enemy','Maid',64,40)]],
  ['workshop','Upper Workshop · Engineer',null,[pt('entry','Entrance',50,92),pt('exit','West Bedroom',50,8),pt('party','Raid',36,67),pt('enemy','Engineer',64,40),pt('add','Turret L',55,28),pt('add','Turret R',73,30)]],
  ['bedroom','West Bedroom',null,[pt('entry','Entrance',50,92),pt('exit','Attic',50,8),pt('party','Raid',50,70),pt('enemy','Swarm',50,38)]],
  ['attic','The Attic · Master',null,[pt('entry','Entrance',50,92),pt('party','Raid',38,68),pt('enemy','Master',62,38)]]
 ]}
].map(group=>({...group,rooms:group.rooms.map(r=>({id:r[0],name:r[1],art:r[2],markers:r[3]}))}));

const AUDIT=[
 {level:'review',title:'Final beta UI cleanup',copy:'Global UI/combat style cleanup remains part of the hard Beta Gate after dungeon, story and Manor presentation are locked.'}
]

let opened=false;
let contentId='ashen-vault';
let roomId='broken-gate';
let showGrid=true;
let dirty=false;
let artFile=null,artPreview='',artBusy=false,artMessage='',activeDraft=null;
let state=load();

function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{}}catch{return{}}}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch{}}
function isOwner(){return Boolean(window.CellboundAdmin?.isAdmin)&&String(window.CellboundAdmin?.role||'').toLowerCase()==='owner'}
function group(){return CATALOG.find(x=>x.id===contentId)||CATALOG[0]}
function room(){return group().rooms.find(x=>x.id===roomId)||group().rooms[0]}
function roomKey(){return contentId+'::'+roomId}
function baseRoom(){
 const base=clone(room()),R=window.CellboundRoomLayouts,active=R?.get?.(contentId,roomId),defaults=R?.defaultMarkers?.(contentId,roomId);
  base.art=R?.artFor?.(contentId,roomId,base.art)||base.art;
 if(Array.isArray(active?.markers)&&active.markers.length)base.markers=clone(active.markers);
 else if(Array.isArray(defaults)&&defaults.length)base.markers=clone(defaults);
 return base
}
function roomDraft(){
 const base=baseRoom(),saved=state.rooms?.[roomKey()];
 return saved?{...clone(base),...saved,markers:Array.isArray(saved.markers)?clone(saved.markers):clone(base.markers)}:clone(base)
}
function storeRoom(draft,status){
 state.rooms=state.rooms||{};
 state.rooms[roomKey()]={...(state.rooms[roomKey()]||{}),markers:clone(draft.markers),review:status||state.rooms?.[roomKey()]?.review||'unreviewed',updatedAt:new Date().toISOString()};
 state.last={contentId,roomId};persist();dirty=false
}
function saveRoom(draft,status){storeRoom(draft,status);render()}
function resetRoom(){
 clearArtSelection();
 if(state.rooms){delete state.rooms[roomKey()];persist()}
 window.CellboundRoomLayouts?.clearTest?.(contentId,roomId);
 dirty=false;render()
}
function liveLayoutState(){
 const R=window.CellboundRoomLayouts,published=R?.publishedInfo?.(contentId,roomId),testing=Boolean(R?.isTesting?.(contentId,roomId));
 return{published,testing,mode:testing?'test':published?'published':'default'}
}
async function testRoom(draft,status){
 const R=window.CellboundRoomLayouts;if(!R?.setTest)return flash('Room layout runtime unavailable.');
 try{storeRoom(draft,status);R.setTest(contentId,roomId,{markers:clone(draft.markers)});render();flash('TEST ACTIVE · this owner account will use the draft in the dungeon.')}
 catch(error){flash(error?.message||'Could not activate test layout.')}
}
async function publishRoom(draft,status){
 const R=window.CellboundRoomLayouts;if(!R?.publish)return flash('Room layout publishing unavailable.');
 if(!confirm('Publish this room layout to staging for every player?'))return;
 const btn=$('#rqePublish');if(btn)btn.disabled=true;
 try{
  storeRoom(draft,status);
  const info=await R.publish(contentId,roomId,{markers:clone(draft.markers)});
  state.rooms[roomKey()]={...(state.rooms[roomKey()]||{}),markers:clone(draft.markers),publishedVersion:Number(info?.version)||1,publishedAt:info?.published_at||new Date().toISOString()};
  persist();dirty=false;render();flash('PUBLISHED · dungeon now uses this layout on staging.')
 }catch(error){if(btn)btn.disabled=false;flash(error?.message||'Could not publish room layout.')}
}
async function unpublishRoom(){
 const R=window.CellboundRoomLayouts;if(!R?.unpublish)return;
 if(!confirm('Restore this room to its built-in game layout for every player?'))return;
 const btn=$('#rqeUnpublish');if(btn)btn.disabled=true;
 try{await R.unpublish(contentId,roomId);if(state.rooms)delete state.rooms[roomKey()];persist();dirty=false;render();flash('BUILT-IN DEFAULT RESTORED.')}
 catch(error){if(btn)btn.disabled=false;flash(error?.message||'Could not restore built-in layout.')}
}
function clearArtSelection(){
 if(artPreview){URL.revokeObjectURL(artPreview);artPreview=''}
 artFile=null;artMessage=''
}
function chooseArt(file){
 clearArtSelection();
 if(file){
  if(!['image/webp','image/png','image/jpeg','image/avif'].includes(file.type))artMessage='Choose a WebP, JPEG, PNG or AVIF image.';
  else if(file.size>10*1024*1024)artMessage='Image exceeds the 10 MB limit.';
  else{artFile=file;artPreview=URL.createObjectURL(file);artMessage=file.name+' selected — preview only until published.'}
 }
 const btn=$('#rqeArtPublish');if(btn)btn.disabled=!artFile||artBusy;
 const status=$('#rqeArtMessage');if(status)status.textContent=artMessage||'No file selected.';
 const label=$('.rqe-art-upload header span');if(label)label.textContent=artPreview?'LOCAL PREVIEW':'ORIGINAL ART';
 if(artPreview){
  const canvas=$('#rqeCanvas');
  let img=canvas?.querySelector(':scope > img[data-room-art]');
  if(!img&&canvas){img=document.createElement('img');img.dataset.roomArt='1';img.alt='Selected room artwork';img.draggable=false;canvas.prepend(img)}
  if(img)img.src=artPreview;
  const manor=canvas?.querySelector('.rqe-manor-runtime');if(manor)manor.hidden=true;
 }
}
async function publishArtwork(){
 const R=window.CellboundRoomLayouts;if(artBusy||!artFile||!R?.publishArt||!isOwner())return;
 const targetContent=contentId,targetRoom=roomId;
 if(!confirm('Replace the background for '+room().name+' in the actual dungeon for all staging players?'))return;
 if(activeDraft)storeRoom(activeDraft,$('#rqeReview')?.value);
 artBusy=true;artMessage='Uploading artwork…';render();
 try{
  await R.publishArt(targetContent,targetRoom,artFile);
  clearArtSelection();artMessage='PUBLISHED · this dungeon room now uses your new background.';
  if(targetContent===contentId&&targetRoom===roomId)render()
 }catch(error){artMessage='Upload failed: '+(error?.message||String(error));render()}
 finally{artBusy=false;render()}
}
async function restoreArtwork(){
 const R=window.CellboundRoomLayouts;
 if(!isOwner()||artBusy||!R?.restoreArt||!confirm('Restore the built-in background for '+room().name+'?'))return;
 artBusy=true;render();
 try{await R.restoreArt(contentId,roomId);clearArtSelection();artMessage='Restored the original room background.'}
 catch(error){artMessage='Restore failed: '+(error?.message||String(error))}
 finally{artBusy=false;render()}
}
function reviewStatus(){return state.rooms?.[roomKey()]?.review||'unreviewed'}
function setDirty(){dirty=true;const e=$('#rqeSaveState');if(e){e.textContent='UNSAVED CHANGES';e.className='rqe-dirty'}}
function markerHTML(m,i){return '<button type="button" class="rqe-marker" data-marker="'+i+'" data-kind="'+esc(m.kind)+'" style="left:'+clamp(m.x)+'%;top:'+clamp(m.y)+'%" aria-label="'+esc(m.label)+'"><span>'+esc(String(i+1))+'</span><em>'+esc(m.label)+'</em></button>'}
function legend(){return '<div class="rqe-legend">'+[['entry','#1d8a63','Entrance'],['exit','#7258bd','Exit'],['party','#287eaa','Party'],['enemy','#b74242','Enemy/Boss'],['add','#b87827','Adds'],['mechanic','#8e3aa5','Mechanic']].map(x=>'<span><i style="background:'+x[1]+'"></i>'+x[2]+'</span>').join('')+'</div>'}
function auditHTML(){return '<div class="rqe-audit"><div class="rqe-audit-head"><div><small>BETA COMPLETION AUDIT</small><h3>Known work from first scan</h3></div><span>'+AUDIT.length+' findings</span></div><div class="rqe-audit-list">'+AUDIT.map(a=>'<article class="rqe-audit-item" data-level="'+a.level+'"><header><b>'+esc(a.title)+'</b><em>'+({blocker:'BLOCKER',work:'NEEDS WORK',review:'REVIEW'})[a.level]+'</em></header><p>'+esc(a.copy)+'</p></article>').join('')+'</div></div>'}
function statusOptions(v){return [['unreviewed','Unreviewed'],['complete','Complete'],['needs-work','Needs work'],['blocker','Blocker']].map(x=>'<option value="'+x[0]+'" '+(v===x[0]?'selected':'')+'>'+x[1]+'</option>').join('')}
function jsonFor(draft){return JSON.stringify({content:contentId,room:roomId,markers:draft.markers},null,2)}
function manorPreview(room){
 if(contentId!=='the-manor'||typeof window.CellboundManorRaid?.roomScene!=='function')return null;
 const map={
  'entrance-hall':['butler',0],
  'dining-room':['maids',0],
  'kitchen':['maids',1],
  'workshop':['engineer',0],
  'bedroom':['bedroom',0],
  'attic':['housebound',0]
 };
 const cfg=map[room?.id];if(!cfg)return null;
 return '<div class="rqe-manor-runtime" data-room-art>'+window.CellboundManorRaid.roomScene(cfg[0],cfg[1])+'</div>'
}
function render(){
 const mount=$('#roomEditorMount');if(!mount||!opened||!isOwner())return;
 const g=group(),r=room(),d=roomDraft(),idx=g.rooms.findIndex(x=>x.id===r.id),status=reviewStatus(),live=liveLayoutState();
 activeDraft=d;
  const contentOptions=CATALOG.map(x=>'<option value="'+x.id+'" '+(x.id===contentId?'selected':'')+'>'+esc(x.type+' · '+x.name)+'</option>').join('');
 const roomOptions=g.rooms.map(x=>'<option value="'+x.id+'" '+(x.id===roomId?'selected':'')+'>'+esc(x.name)+'</option>').join('');
 const runtimePreview=manorPreview(r),artwork=artPreview||d.art,hasArt=Boolean(artwork||runtimePreview),publishedArt=window.CellboundRoomLayouts?.publishedArtInfo?.(contentId,roomId);
 const art=runtimePreview&&!artPreview?runtimePreview:artwork?'<img src="'+esc(artwork)+'" alt="'+esc(d.name)+'" draggable="false" data-room-art>':runtimePreview||'<div class="rqe-missing"><div><b>No dedicated room artwork</b><span>No production room background is currently wired for this scene. Boss/key art is intentionally not substituted.</span></div></div>';
 mount.innerHTML='<section class="rqe-shell">'+
  '<header class="rqe-head"><div><small>OWNER CONTENT QA · BETA BUILD 1</small><h2>Room Editor</h2><p>Drag the live room anchors directly on the production artwork. Save keeps a local draft, Test applies it only to your owner account, and Publish makes it the shared staging layout used when the dungeon is played.</p></div><div class="rqe-head-actions"><button id="rqeCopyAll">COPY ALL DRAFTS</button><button id="rqeClose">CLOSE</button></div></header>'+
  '<div class="rqe-toolbar"><label><span>CONTENT</span><select id="rqeContent">'+contentOptions+'</select></label><label><span>ROOM / ENCOUNTER</span><select id="rqeRoom">'+roomOptions+'</select></label><button id="rqeGrid">'+(showGrid?'HIDE GRID':'SHOW GRID')+'</button><button id="rqeReset">RESET ROOM</button></div>'+
  '<div class="rqe-grid"><main class="rqe-main"><div id="rqeCanvas" class="rqe-canvas-wrap '+(showGrid?'rqe-show-grid ':'')+(hasArt?'':'missing-art')+'">'+art+'<div class="rqe-gridlines"></div><div class="rqe-axis"></div>'+d.markers.map(markerHTML).join('')+'</div>'+
  '<section class="rqe-art-upload"><header><div><small>ROOM BACKGROUND</small><h3>Replace artwork</h3></div><span>'+(artPreview?'LOCAL PREVIEW':publishedArt?'PUBLISHED ART':'ORIGINAL ART')+'</span></header><p>Upload a 16:9 image. Preview it here before publishing. Your room markers stay in place.</p><label class="rqe-art-file">CHOOSE BACKGROUND IMAGE<input id="rqeArtFile" type="file" accept="image/webp,image/png,image/jpeg,image/avif"></label><small>WebP, PNG, JPEG or AVIF · maximum 10 MB · 16:9 recommended.</small><div class="rqe-art-actions"><button id="rqeArtPublish" '+(!artFile||artBusy?'disabled':'')+'>'+(artBusy?'UPLOADING…':'UPLOAD & PUBLISH BACKGROUND')+'</button>'+(publishedArt?'<button id="rqeArtRestore" '+(artBusy?'disabled':'')+'>RESTORE ORIGINAL</button>':'')+'</div><p id="rqeArtMessage" role="status">'+esc(artMessage||'Uploads change the actual room background for players on staging. This is separate from publishing marker positions.')+'</p></section>'+
 '<div class="rqe-room-meta"><div class="rqe-room-copy"><b>'+esc(g.name+' · '+r.name)+'</b><span>'+(d.art?'Production art loaded from '+esc(d.art.replace('./','')):runtimePreview?'Live Manor runtime scene preview · same environment used in combat':'Dedicated room art missing')+'</span>'+legend()+'</div><div class="rqe-room-nav"><button id="rqePrev" '+(idx<=0?'disabled':'')+'>← PREV</button><button id="rqeNext" '+(idx>=g.rooms.length-1?'disabled':'')+'>NEXT →</button></div></div></main>'+
  '<aside class="rqe-side"><section class="rqe-inspector"><small>ROOM REVIEW</small><h3>Layout state</h3><label><small>STATUS</small><select id="rqeReview">'+statusOptions(status)+'</select></label><div class="rqe-inspector-grid"><div><b>'+d.markers.filter(x=>x.kind==='party').length+'</b><span>party anchors</span></div><div><b>'+d.markers.filter(x=>x.kind==='enemy'||x.kind==='add').length+'</b><span>hostile anchors</span></div><div><b>'+d.markers.filter(x=>x.kind==='entry').length+'</b><span>entrances</span></div><div><b>'+d.markers.filter(x=>x.kind==='exit').length+'</b><span>exits</span></div></div><div class="rqe-live-state" data-mode="'+live.mode+'"><small>ACTIVE DUNGEON LAYOUT</small><b>'+(live.mode==='test'?'OWNER TEST ACTIVE':live.mode==='published'?'PUBLISHED · VERSION '+Number(live.published?.version||1):'BUILT-IN DEFAULT')+'</b><span>'+(live.mode==='test'?'Only your owner account uses the current test layout.':live.mode==='published'?'All staging players use this published layout.':'No shared room override is published.')+'</span></div><div class="rqe-inspector-actions"><button class="primary" id="rqeSave">SAVE DRAFT</button><button class="test" id="rqeTest">TEST LAYOUT</button><button class="publish" id="rqePublish">PUBLISH LAYOUT</button>'+(live.testing?'<button id="rqeClearTest">STOP TESTING</button>':'')+(live.published?'<button class="danger" id="rqeUnpublish">RESTORE BUILT-IN DEFAULT</button>':'')+'<button id="rqeCopy">COPY ROOM JSON</button></div><div id="rqeSaveState" class="'+(dirty?'rqe-dirty':'rqe-dirty rqe-saved')+'">'+(dirty?'UNSAVED CHANGES':state.rooms?.[roomKey()]?.updatedAt?'DRAFT SAVED ON THIS DEVICE':live.mode==='published'?'VIEWING PUBLISHED LAYOUT':'VIEWING GAME DEFAULTS')+'</div><div class="rqe-json"><small>CURRENT COORDINATES</small><pre id="rqeJson">'+esc(jsonFor(d))+'</pre></div></section>'+auditHTML()+'</aside></div></section>';
 bind(d)
}
function bind(draft){
 $('#rqeClose')?.addEventListener('click',close);
 $('#rqeArtFile')?.addEventListener('change',e=>chooseArt(e.target.files?.[0]));
 $('#rqeArtPublish')?.addEventListener('click',publishArtwork);
 $('#rqeArtRestore')?.addEventListener('click',restoreArtwork);
 $('#rqeContent')?.addEventListener('change',e=>{clearArtSelection();contentId=e.target.value;roomId=group().rooms[0].id;dirty=false;render()});
 $('#rqeRoom')?.addEventListener('change',e=>{clearArtSelection();roomId=e.target.value;dirty=false;render()});
 $('#rqeGrid')?.addEventListener('click',()=>{showGrid=!showGrid;render()});
 $('#rqeReset')?.addEventListener('click',()=>{if(confirm('Discard the local draft and return to the current published/default layout?'))resetRoom()});
 $('#rqePrev')?.addEventListener('click',()=>moveRoom(-1));
 $('#rqeNext')?.addEventListener('click',()=>moveRoom(1));
 $('#rqeSave')?.addEventListener('click',()=>saveRoom(draft,$('#rqeReview')?.value));
 $('#rqeTest')?.addEventListener('click',()=>testRoom(draft,$('#rqeReview')?.value));
 $('#rqePublish')?.addEventListener('click',()=>publishRoom(draft,$('#rqeReview')?.value));
 $('#rqeClearTest')?.addEventListener('click',()=>{window.CellboundRoomLayouts?.clearTest?.(contentId,roomId);render();flash('TEST STOPPED · dungeon returned to the published/default layout.')});
 $('#rqeUnpublish')?.addEventListener('click',unpublishRoom);
 $('#rqeReview')?.addEventListener('change',()=>setDirty());
 $('#rqeCopy')?.addEventListener('click',()=>copyText(jsonFor(draft),'Room JSON copied.'));
 $('#rqeCopyAll')?.addEventListener('click',()=>copyText(JSON.stringify(state,null,2),'All room-editor drafts copied.'));
 const canvas=$('#rqeCanvas');
 if(canvas){
  const stopGesture=e=>{if(e.target?.closest?.('[data-marker]'))return;e.preventDefault()};
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('dragstart',e=>e.preventDefault());
  canvas.querySelectorAll('img').forEach(img=>{img.draggable=false;img.addEventListener('dragstart',e=>e.preventDefault())});
 }
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
  el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();dragging=true;el.setPointerCapture?.(e.pointerId);move(e)});
  el.addEventListener('pointermove',e=>{if(dragging){e.preventDefault();e.stopPropagation()}move(e)});
  el.addEventListener('pointerup',e=>{e.preventDefault();e.stopPropagation();dragging=false;el.releasePointerCapture?.(e.pointerId)});
  el.addEventListener('pointercancel',e=>{e.preventDefault();dragging=false});
  el.addEventListener('contextmenu',e=>e.preventDefault())
 })
 $('#rqeReview')?.addEventListener('change',e=>{state.rooms=state.rooms||{};state.rooms[roomKey()]={...(state.rooms[roomKey()]||{}),markers:clone(draft.markers),review:e.target.value};setDirty()})
}
function moveRoom(delta){
 const g=group(),i=g.rooms.findIndex(x=>x.id===roomId),n=Math.max(0,Math.min(g.rooms.length-1,i+delta));clearArtSelection();roomId=g.rooms[n].id;dirty=false;render()
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
 mount.hidden=false;render();window.CellboundRoomLayouts?.ready?.().then(()=>{if(opened)render()}).catch(()=>{});requestAnimationFrame(()=>mount.scrollIntoView({behavior:'smooth',block:'start'}))
}
function close(){opened=false;activeDraft=null;clearArtSelection();const mount=$('#roomEditorMount');if(mount){mount.hidden=true;mount.innerHTML=''}}
function syncAccess(){const entry=$('#roomEditorEntry'),mount=$('#roomEditorMount'),owner=isOwner();if(entry)entry.hidden=!owner;if(!owner&&mount)close()}
function init(){
 const entry=$('#roomEditorEntry');if(!entry){setTimeout(init,150);return}
 entry.querySelector('#openRoomEditor')?.addEventListener('click',open);
 window.addEventListener('cellbound:admin-status',syncAccess);
 window.addEventListener('cellbound:room-art-changed',()=>{if(opened&&!artFile)render()});
 window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='admin')setTimeout(syncAccess,0)});
 syncAccess()
}
window.CellboundRoomEditor={open,close,render,isOwner,catalog:()=>clone(CATALOG),audit:()=>clone(AUDIT)};
init()
})();