(()=>{
'use strict';
/*
 * Game Build Hub
 * The source-of-truth for executable game logic remains the tested game code.
 * This hub does not pretend locally authored system briefs alter the runtime.
 */
const ROOT='#dboDirectorMount',PREFIX='cellbound-owner-game-build-hub-v1';
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const copy=x=>JSON.parse(JSON.stringify(x));
const owner=()=>Boolean(window.CellboundAdmin?.isAdmin)&&window.CellboundAdmin?.role==='owner';
const userKey=()=>PREFIX+':'+String(window.CellboundGame?.getUser?.()?.id||'owner');
const AREAS=[
 ['adventures','Adventures','Quest, dungeon and raid stage builder','Playable creator','build','CellboundDesignedContent','Adventure Blueprint'],
 ['content','Reusable content','New rooms, encounters, comics, puzzles and balanced equipment','Playable creator','library','CellboundDesignLibrary','Content Template'],
 ['rooms','Dungeon & raid rooms','Move spawns, entrances, exits, enemies and room artwork','Runtime layout','rooms','CellboundRoomEditor','Room Layout'],
 ['comics','Comic story artwork','Panel coverage, missing art, preview and upload','Art publishing','comics','CellboundComicSceneEditor','Comic Scene'],
 ['drops','Boss drop tables','Existing boss rewards and configured drop percentages','Reward editor','drops','CellboundBossDropTables','Boss Loot'],
 ['items','Item catalogue','Search tier, class, source and CSV item records','Read only','items','CellboundItemCatalog','Item Data'],
 ['models','Character models','Race/body/sex variations and equipment fitting','Visual QA','models','CellboundCharacterFitViewer','Character Visual'],
 ['minigames','Minigames','Choice and sequence templates; additional mechanics require code','Templates','templates','CellboundDesignedContent','Minigame'],
 ['pvp-maps','PvP maps','Spawns, flags, hills, storm, blockers and artwork','Runtime layout','pvp-maps','CellboundPvPMapEditor','PvP Map'],
 ['combat-ui','Combat interface','Drag, resize, hide and preview PvE/PvP panels','Device preview','combat-ui','CellboundCombatUILayoutEditor','Combat UI'],
 ['dungeon-plan','Dungeon planner','Advanced generator and existing encounter stages','Planner','generator','CellboundDungeonGenerator','Dungeon Plan'],
 ['world','Living world & buildings','Town locations, shops, NPC interactions and interiors','Design brief only',null,'CellboundLivingWorld','World Area'],
 ['abilities','Classes, abilities & talents','Role balance, cooldowns, talent unlocks and skill definitions','Design brief only',null,null,'Class & Ability'],
 ['enemies','Enemy AI & bosses','Combat rules, hazards, behaviours and telegraphs','Design brief only',null,null,'Enemy AI'],
 ['progression','Level and gear progression','XP rates, gates, tier stats and item power','Design brief only',null,null,'Progression'],
 ['professions','Professions & recipes','Recipe outputs, materials, costs and unlocks','Design brief only',null,null,'Profession'],
 ['economy','Trading & economy','Merchant prices, currency sinks, marketplaces','Design brief only',null,null,'Economy'],
 ['social','Guilds, chat & groups','Guild progression, permissions and party-finder systems','Design brief only',null,null,'Social System'],
 ['events','Events & seasons','Events, rotations, limited rewards and scheduling','Design brief only',null,null,'World Event'],
 ['operations','Accounts & beta operations','Membership, admin tools, analytics, support and release QA','Design brief only',null,null,'Operations']
].map(([id,label,detail,capability,tab,api,kind])=>({id,label,detail,capability,tab,api,kind}));
const WORKFLOWS=[
 {id:'dungeon',title:'Build a dungeon or raid',subtitle:'From first room to an approved playable adventure',steps:[['content','Reusable room / boss / comic assets'],['build','Adventure stages and rewards'],['rooms','Spatial layout and artwork'],['drops','Boss drop checks'],['comics','Story illustration checks'],['combat-ui','Combat screen fit'],['audit','Run end-to-end test before Publish']]},
 {id:'quest',title:'Create a quest storyline',subtitle:'Stories, interactions, illustrations and rewards',steps:[['content','Reusable comic and scenes'],['build','Quest stages and test'],['comics','Review every existing story panel'],['drops','Inspect reward opportunities'],['audit','Test from the first to last stage']]},
 {id:'pvp',title:'Make a PvP battleground',subtitle:'Playable map geometry, objectives and the visual screen',steps:[['pvp-maps','Map and objective positions'],['combat-ui','Responsive HUD and team information'],['audit','Owner practice: objectives, respawns and win state']]},
 {id:'gear',title:'Develop equipment and rewards',subtitle:'Craft new items while preserving equipment balance',steps:[['content','Create balanced equipment template'],['models','Inspect race/body gear fit'],['items','Search existing equipment and item IDs'],['drops','Assign boss drops'],['audit','Confirm Bank, crafting and dismantle pathways']]},
 {id:'system',title:'Design a new game system',subtitle:'A controlled brief for a feature not yet runtime editable',steps:[['brief','Create a system design and acceptance criteria'],['audit','Track implementation dependencies and test requirements'],['content','Create supporting assets when possible']]}
];
const QA=[
 ['scope','The scope, unlock rules and dependencies are documented'],
 ['art','Artwork fits Cellbound and every required panel/room has art'],
 ['layout','iPad, desktop and mobile layouts checked'],
 ['mechanics','Core mechanics, goals, failure states and end-of-run verified'],
 ['rewards','Drop chances, Bank grants and duplication protections verified'],
 ['access','Owner preview, role permissions and published access confirmed'],
 ['recovery','Close, exit, re-entry and reconnection cases tested'],
 ['publish','Published output checked in the actual dev game']
];
const STATUS=['Idea','Planned','Ready to build','In development','QA','Completed'];
const MAX_BRIEFS=70;
let active=false,filter='',workflow='dungeon',selected='',area='all',note='',auditData=null;
let briefs=[],checklists={},dirty=false,loaded=false;
function empty(id='world'){
 const d=AREAS.find(a=>a.id===id)||AREAS[11];
 return {id:'build-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),area:d.id,title:'New '+d.kind,summary:'',requirements:'',assets:'',dependencies:'',acceptance:'',risk:'',status:'Idea',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}
}
function safeString(x,limit=12000){return String(x??'').slice(0,limit)}
function normaliseBrief(raw){
 if(!raw||typeof raw!=='object'||!AREAS.some(a=>a.id===raw.area))throw Error('Unrecognised game system');
 const b=empty(raw.area);b.id=/^build-[a-z0-9-]{3,70}$/i.test(String(raw.id||''))?raw.id:b.id;
 for(const k of ['title','summary','requirements','assets','dependencies','acceptance','risk'])b[k]=safeString(raw[k],k==='title'?120:12000);
 b.status=STATUS.includes(raw.status)?raw.status:'Idea';
 b.createdAt=safeString(raw.createdAt,35)||b.createdAt;b.updatedAt=safeString(raw.updatedAt,35)||b.updatedAt;
 return b
}
function load(){
 if(loaded)return;loaded=true;
 try{
  const s=JSON.parse(localStorage.getItem(userKey())||'{}');
  briefs=(Array.isArray(s.briefs)?s.briefs:[]).slice(0,MAX_BRIEFS).map(x=>{try{return normaliseBrief(x)}catch{return null}}).filter(Boolean);
  if(s.checklists&&typeof s.checklists==='object')checklists=s.checklists;
 }catch{briefs=[];checklists={}}
}
function persist(){
 if(!owner())return false;
 try{localStorage.setItem(userKey(),JSON.stringify({version:1,briefs,checklists}));dirty=false;return true}
 catch{announce('Device storage is full. Export your build plan to keep a copy.');return false}
}
function announce(s){note=String(s);const e=$('#gdhNote');if(e)e.textContent=note}
function selectedBrief(){return briefs.find(x=>x.id===selected)||null}
function report(){
 const room=window.CellboundRoomEditor,items=window.CellboundItemCatalog,comic=window.CellboundComicSceneEditor;
 const areas=AREAS.filter(a=>a.tab),unavailable=areas.filter(a=>!a.api||!window[a.api]);
 const roomCatalog=room?.catalog?.()||[],knownRooms=roomCatalog.reduce((n,g)=>n+(g.rooms?.length||0),0);
 const catalog=items?.catalogue?.()||[],bosses=window.CellboundBossDropTables?.bosses?.()||[];
 const scenes=comic?.list?.()||[],panels=scenes.reduce((n,s)=>n+(s.panels?.length||0),0);
 const missing=scenes.reduce((n,s)=>n+(s.panels||[]).filter(p=>!String(p.artwork||'').trim()).length,0);
 return{available:areas.length-unavailable.length,total:areas.length,unavailable,knownRooms,roomGroups:roomCatalog.length,itemCount:catalog.length,bossCount:bosses.length,sceneCount:scenes.length,panels,missing,scanned:scenes.length>0,briefCount:briefs.length};
}
const badge=(type,name)=>'<span class="gdh-tag '+type+'">'+esc(name)+'</span>';
function domainCard(d){
 const existing=Boolean(d.tab),ready=existing&&(!d.api||Boolean(window[d.api]));
 const kind=existing?(ready?'editing':'unavailable'):'planned';
 return '<article class="gdh-domain"><div class="gdh-domain-top">'+badge(kind,d.capability)+'</div><h4>'+esc(d.label)+'</h4><p>'+esc(d.detail)+'</p>'+
 (existing?'<button type="button" data-gdh-go="'+esc(d.tab)+'" '+(!ready?'disabled title="Module unavailable"':'')+'>OPEN EDITOR ↗</button>':
 '<button type="button" data-gdh-plan="'+esc(d.id)+'">DESIGN SYSTEM →</button>')+'</article>'
}
function stats(){
 const x=report();return '<div class="gdh-stats"><div><b>'+x.available+'/'+x.total+'</b><span>editor modules loaded</span></div><div><b>'+x.knownRooms+'</b><span>mapped dungeon/raid rooms</span></div><div><b>'+x.bossCount+'</b><span>boss reward entries</span></div><div><b>'+x.itemCount+'</b><span>catalogued items</span></div></div>'+
 (x.unavailable.length?'<p class="gdh-warning">Some editor modules are unavailable: '+esc(x.unavailable.map(a=>a.label).join(', '))+'. Open the game again if an asset failed to load.</p>':'')+
 '<p class="gdh-muted">Counts are read from the currently loaded game registries. They do not measure content quality, finished quests or release readiness.</p>'
}
function workflowMarkup(){
 const w=WORKFLOWS.find(x=>x.id===workflow)||WORKFLOWS[0];
 return '<div class="gdh-workflow"><header><h3>Suggested build order</h3><label>Workflow <select id="gdhWorkflow">'+WORKFLOWS.map(a=>'<option value="'+a.id+'" '+(a.id===workflow?'selected':'')+'>'+esc(a.title)+'</option>').join('')+'</select></label></header><p>'+esc(w.subtitle)+'</p>'+
 '<ol class="gdh-steps">'+w.steps.map(([id,label],i)=>'<li><span>'+(i+1)+'</span><div>'+esc(label)+'</div>'+(id==='audit'?'<button data-gdh-audit type="button">CHECK QA</button>':id==='brief'?'<button data-gdh-plan="world" type="button">NEW BRIEF</button>':'<button data-gdh-go="'+esc(id)+'" type="button">OPEN →</button>')+'</li>').join('')+'</ol></div>'
}
function coverage(){
 const data=AREAS.filter(a=>(area==='all'||a.capability===area)&&(!filter||[a.label,a.detail,a.capability].join(' ').toLowerCase().includes(filter.toLowerCase())));
 return '<section class="gdh-section"><div class="gdh-section-head"><div><h3>Build Cellbound by system</h3><p>Select an editor to change gameplay content, or create a brief for systems not yet connected to authoring tools.</p></div><div class="gdh-filters"><input type="search" id="gdhSearch" placeholder="Find skills, maps, economy…" value="'+esc(filter)+'"><select id="gdhCapability"><option value="all">All systems</option>'+[...new Set(AREAS.map(a=>a.capability))].map(a=>'<option value="'+esc(a)+'" '+(a===area?'selected':'')+'>'+esc(a)+'</option>').join('')+'</select></div></div>'+
 '<div class="gdh-domains">'+data.map(domainCard).join('')+'</div>'+(!data.length?'<p>No matching build areas.</p>':'')+'</section>'
}
function listBriefs(){
 return briefs.slice().sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).map(b=>'<button type="button" data-gdh-brief="'+esc(b.id)+'" class="'+(b.id===selected?'selected':'')+'"><b>'+esc(b.title||'Untitled')+'</b><small>'+esc(AREAS.find(a=>a.id===b.area)?.label||'System')+' · '+esc(b.status)+'</small></button>').join('')||'<p class="gdh-muted">No system briefs yet. Pick a system above to create one.</p>'
}
function editor(){
 const b=selectedBrief();return '<section class="gdh-section gdh-author" id="gdhAuthor"><div class="gdh-section-head"><div><h3>Game system designs</h3><p>Structured briefs for areas that need new game logic. These do not modify combat, skills, economies or player progression until implemented and tested.</p></div><div><button id="gdhAdd" type="button">+ NEW BRIEF</button><button id="gdhExport" type="button">EXPORT BUILD PLAN</button><button id="gdhImport" type="button">IMPORT</button><input id="gdhImportFile" type="file" accept=".json,application/json" hidden></div></div>'+
 '<div class="gdh-author-grid"><aside class="gdh-brief-list">'+listBriefs()+'</aside><main class="gdh-editor">'+(b?'<label>Game system<select data-gdh-field="area">'+AREAS.map(a=>'<option value="'+esc(a.id)+'" '+(a.id===b.area?'selected':'')+'>'+esc(a.label)+'</option>').join('')+'</select></label>'+
 '<label>Design title<input data-gdh-field="title" maxlength="120" value="'+esc(b.title)+'"></label>'+
 '<label>Development stage<select data-gdh-field="status">'+STATUS.map(v=>'<option value="'+esc(v)+'" '+(v===b.status?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></label>'+
 [['summary','What are we building?','What will players see and do?'],['requirements','Mechanics, numbers and rules','Controls, actions, enemy behaviour, success/failure, values'],['assets','Artwork, UI and content requirements','Images, characters, sounds, effects, panels, rooms'],['dependencies','What must already exist?','Systems, quests, levels, APIs, database needs'],['acceptance','How do we know it works?','Player flows, edge cases, platform checks and fairness'],['risk','Safety and rollback notes','Duplication, economy, save compatibility, abuse, old clients']].map(([key,title,help])=>'<label>'+title+'<small>'+help+'</small><textarea data-gdh-field="'+key+'" rows="3" maxlength="12000">'+esc(b[key])+'</textarea></label>').join('')+
 '<div class="gdh-editor-actions"><button type="button" data-gdh-save>SAVE ON THIS DEVICE</button><button type="button" data-gdh-copy>DUPLICATE</button><button type="button" data-gdh-delete>DELETE BRIEF</button></div><p class="gdh-muted">Last edited '+esc(b.updatedAt)+'. Export JSON to share these plans with a developer or transfer them to another iPad.</p>':
 '<div class="gdh-empty">Choose an existing plan or add a game system brief. Working editors are launched from the cards above.</div>')+'</main></div></section>'
}
function readiness(){
 const results=report();const list=QA.map(([id,title])=>{const on=Boolean(checklists[id]);return '<label class="gdh-check"><input type="checkbox" data-gdh-check="'+id+'" '+(on?'checked':'')+'><span>'+esc(title)+'</span></label>'}).join('');
 const completed=QA.filter(([id])=>Boolean(checklists[id])).length;
 return '<section class="gdh-section" id="gdhAudit"><div class="gdh-section-head"><div><h3>Release and completeness checks</h3><p>This is a manually maintained owner checklist, not an automatic certification. All eight items must be reviewed for each release.</p></div><button id="gdhRefresh" type="button">REFRESH AUDIT</button></div>'+
 '<div class="gdh-audit-columns"><div><div class="gdh-progress"><b>'+completed+' / '+QA.length+' checked</b><div><i style="width:'+(completed/QA.length*100)+'%"></i></div></div>'+list+
 '<button id="gdhResetQA" type="button">RESET QA CHECKS</button></div><div><h4>Project diagnostics</h4><p>'+results.roomGroups+' location groups, '+results.knownRooms+' predefined rooms, '+results.bossCount+' boss entries, '+results.itemCount+' item records.</p>'+
 (results.scanned?'<p>'+results.sceneCount+' discovered comic scenes with '+results.panels+' panels. '+results.missing+' have no artwork path (broken or reused images may need additional review).</p>':'<p>Comic scan not loaded. Open Comic Art to run its source scanner and review missing or reused artwork.</p>')+
 '<p>Missing feature areas are visible as <b>Design brief only</b> cards. They are tracked, not silently treated as implemented.</p><p class="gdh-warning">Publishing is tool-specific. The Build Hub cannot bypass player safety, database permissions or staging release checks.</p></div></div></section>'
}
function render(){
 const host=$(ROOT);if(!host||!active||!owner())return;load();const x=report();
 host.innerHTML='<section class="gdh-shell"><header class="gdh-head"><div><small>DESIGN BOOTH · FULL GAME BUILD</small><h2>Game Build Hub</h2><p>Every editor, system plan and QA handoff in one owner workspace. Start with a workflow or search for what you need.</p></div><div>'+badge('editing',x.available+' editable modules')+badge('planned',(AREAS.length-x.total)+' systems to expand')+'</div></header>'+
 '<div class="gdh-content">'+stats()+workflowMarkup()+coverage()+editor()+readiness()+'<p class="gdh-message" id="gdhNote" role="status">'+esc(note)+'</p></div></section>';
 bind(host)
}
function saveInputs(host){
 const b=selectedBrief();if(!b)return;
 $$('[data-gdh-field]',host).forEach(node=>{
  if(!Object.hasOwn(b,node.dataset.gdhField))return;
  const key=node.dataset.gdhField,val=safeString(node.value,key==='title'?120:12000);
  if(key==='area'&&!AREAS.some(a=>a.id===val))return;
  if(key==='status'&&!STATUS.includes(val))return;
  b[key]=val
 });
 b.updatedAt=new Date().toISOString();
 dirty=true
}
function newBrief(kind){load();if(briefs.length>=MAX_BRIEFS){announce('Maximum '+MAX_BRIEFS+' briefs reached; export and archive before creating more.');return}const b=empty(kind);briefs.push(b);selected=b.id;persist();render();$('#gdhAuthor')?.scrollIntoView?.({block:'start',behavior:'smooth'})}
function exportPlan(){
 saveInputs($(ROOT));persist();
 const json=JSON.stringify({format:'cellbound-game-build-plan',version:1,exportedAt:new Date().toISOString(),briefs,qa:checklists},null,2);
 const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='cellbound-game-build-plan.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);announce('Build plan exported. This file does not contain executable changes.')
}
async function importPlan(file){
 if(!owner()||!file||file.size>900000){announce('Select a JSON build plan smaller than 900 KB.');return}
 try{
  const data=JSON.parse(await file.text());
  if(data?.format!=='cellbound-game-build-plan'||data.version!==1||!Array.isArray(data.briefs))throw Error('Not a supported Cellbound build-plan export.');
  const incoming=data.briefs.slice(0,MAX_BRIEFS).map(normaliseBrief),map=new Map(briefs.map(b=>[b.id,b]));
  for(const b of incoming)map.set(b.id,b);
  if(map.size>MAX_BRIEFS)throw Error('Import would exceed '+MAX_BRIEFS+' saved briefs.');
  if(!confirm('Import '+incoming.length+' briefs? Existing briefs with matching IDs will be updated.'))return;
  briefs=[...map.values()];persist();selected=incoming[0]?.id||selected;render();announce('Imported '+incoming.length+' game build briefs. No gameplay changes were published.')
 }catch(e){announce('Import failed: '+e.message)}
}
function navigate(tab){
 if(!owner())return;
 const host=$(ROOT);saveInputs(host);persist();
 const api=window.CellboundDesignBooth;if(!api?.setTab)return announce('The Design Booth navigation service is unavailable.');
 api.setTab(tab)
}
function bind(host){
 $$('[data-gdh-go]',host).forEach(el=>el.onclick=()=>navigate(el.dataset.gdhGo));
 $$('[data-gdh-plan]',host).forEach(el=>el.onclick=()=>{saveInputs(host);persist();newBrief(el.dataset.gdhPlan)});
 $$('[data-gdh-audit]',host).forEach(el=>el.onclick=()=>$('#gdhAudit')?.scrollIntoView?.({behavior:'smooth',block:'start'}));
 $('#gdhWorkflow',host).onchange=e=>{saveInputs(host);workflow=e.target.value;persist();render()};
 $('#gdhSearch',host).oninput=e=>{filter=e.target.value;const caret=e.target.selectionStart;saveInputs(host);render();const x=$('#gdhSearch');x?.focus();x?.setSelectionRange(caret,caret)};
 $('#gdhCapability',host).onchange=e=>{saveInputs(host);area=e.target.value;render()};
 $$('[data-gdh-brief]',host).forEach(el=>el.onclick=()=>{saveInputs(host);persist();selected=el.dataset.gdhBrief;render()});
 $('#gdhAdd',host).onclick=()=>{saveInputs(host);persist();newBrief('world')};
 $$('[data-gdh-field]',host).forEach(el=>{el.onchange=()=>{saveInputs(host);persist()};el.oninput=()=>{saveInputs(host)}})
 $$('[data-gdh-save]',host).forEach(el=>el.onclick=()=>{saveInputs(host);if(persist())announce('Game system design saved on this device. No game changes published.')});
 $$('[data-gdh-copy]',host).forEach(el=>el.onclick=()=>{saveInputs(host);const b=selectedBrief();if(!b||briefs.length>=MAX_BRIEFS)return;const n=empty(b.area);Object.assign(n,copy(b),{id:n.id,title:(b.title+' (copy)').slice(0,120),status:'Idea',updatedAt:new Date().toISOString()});briefs.push(n);selected=n.id;persist();render()});
 $$('[data-gdh-delete]',host).forEach(el=>el.onclick=()=>{if(!confirm('Delete this local game system brief?'))return;briefs=briefs.filter(x=>x.id!==selected);selected=briefs[0]?.id||'';persist();render()});
 $('#gdhExport',host).onclick=exportPlan;
 $('#gdhImport',host).onclick=()=>$('#gdhImportFile',host).click();
 $('#gdhImportFile',host).onchange=e=>{importPlan(e.target.files?.[0]);e.target.value=''};
 $$('[data-gdh-check]',host).forEach(el=>el.onchange=()=>{checklists[el.dataset.gdhCheck]=el.checked;persist();const scrollY=window.scrollY;render();window.scrollTo(0,scrollY)});
 $('#gdhResetQA',host).onclick=()=>{if(!confirm('Reset the local release QA checklist?'))return;checklists={};persist();render()};
 $('#gdhRefresh',host).onclick=()=>{render();announce('Game registry and QA diagnostics refreshed.')};
}
function open(){if(!owner())return;active=true;load();render()}
function close(){if(dirty){saveInputs($(ROOT));persist()}active=false;const host=$(ROOT);if(host){host.hidden=true;host.innerHTML=''}}
function canLeave(){if(!active)return true;saveInputs($(ROOT));persist();return true}
window.CellboundGameBuildHub={open,close,canLeave,render,report,areas:()=>copy(AREAS),briefs:()=>copy(briefs),add:newBrief,exportPlan};
})();