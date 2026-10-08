(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clone=x=>JSON.parse(JSON.stringify(x));
const owner=()=>Boolean(window.CellboundAdmin?.isAdmin)&&String(window.CellboundAdmin?.role||'').toLowerCase()==='owner';
const db=()=>window.CellboundGame?.getSupabase?.();
const runtime=()=>window.CellboundDesignedContent;
const STORE='cellbound-design-booth-workspace-v1';
const STASH='cellbound-design-booth-project-backups-v2';
const TOOLS=[
 {id:'library',label:'Content Creator',sub:'New rooms · bosses · items'},
 {id:'build',label:'Adventure Builder',sub:'Quest · dungeon · raid'},
 {id:'drops',label:'Drop Tables',sub:'Boss loot · chances'},
 {id:'items',label:'Item Catalogue',sub:'All tiers · classes · export'},
 {id:'comics',label:'Comic Art',sub:'Existing story scenes'},
 {id:'rooms',label:'Room Layouts',sub:'Existing dungeons & raid'},
 {id:'generator',label:'Dungeon Planner',sub:'Legacy advanced generator'},
 {id:'models',label:'Character Models',sub:'Equipment fit & visual QA'},
 {id:'templates',label:'Minigame Library',sub:'Reusable mechanics'}
];
const GUIDANCE={
 "library": {
  "title": "Create → Save Cloud Draft → Reuse → Publish",
  "detail": "Create a new room, boss encounter, comic strip, puzzle or balanced equipment item. Cloud drafts are private; published items become selectable in approved boss drop tables. Add scene templates to any Adventure Builder project."
 },
 "build": {
  "title": "Create → Save Draft → Test → Publish",
  "detail": "Build a quest, dungeon or raid. Save a cloud draft first; only Publish makes the new adventure available to players."
 },
 "drops": {
  "title": "Choose boss → Edit items → Save",
  "detail": "Existing game bosses: Save Boss Drops applies extra rewards straight away. Custom adventure bosses: Save Cloud Draft, then Publish Loot Changes. Existing dungeon rewards are not overwritten."
 },
 "items": {
  "title": "Search → Check item → Export if needed",
  "detail": "Read-only catalogue. Find an item’s ID, tier, class and source, or export CSV. Viewing items does not change gear or loot."
 },
 "comics": {
  "title": "Find scene → Review → Replace artwork",
  "detail": "Comic artwork: Upload & Publish changes player-visible images immediately. Story text: Save Draft is LOCAL ONLY; export it for a developer to apply. Do not assume captions are published."
 },
 "rooms": {
  "title": "Choose room → Adjust → Test → Publish",
  "detail": "Save Draft stays on your device. Test Layout affects only your owner session. Publish Layout changes staging for players; background artwork has its OWN Publish button."
 },
 "generator": {
  "title": "Plan content → Review before using",
  "detail": "Advanced planning tool. Confirm where output is saved and test any generated content before considering a release."
 },
 "models": {
  "title": "Choose model → Inspect equipment fit",
  "detail": "Visual inspection tool. This does not create or publish new character assets."
 },
 "templates": {
  "title": "Browse reusable puzzles",
  "detail": "Pick an existing template inside an adventure minigame stage. Creating a new mechanic still requires game code and testing."
 }
};
const plugins={library:'CellboundDesignLibrary',comics:'CellboundComicSceneEditor',rooms:'CellboundRoomEditor',generator:'CellboundDungeonGenerator',models:'CellboundCharacterFitViewer'};
const mountIds={library:'dboLibrary',comics:'comicSceneEditorMount',rooms:'roomEditorMount',generator:'dungeonGeneratorMount',models:'characterFitViewerMount'};
let opened=false,active='build',records=[],selectedId=null,project=null,stepIndex=0,busy=false,uploadBusy=false,message='',lastLocal='',initDone=false,selectedDropBoss='',nativeDrops=[],nativeSaving=false,nativeLoadedKey='',nativeBaseline='[]',dropEditIndex=-1,dropSearch='',dropTier='all',dropSort='tier',moreOpen=false;
let workspace={},baseline='',cloudUpdatedAt=null;
const keyFor=p=>p?.id?'cloud:'+p.id:'local:'+p?.slug;
const changed=()=>Boolean(project)&&JSON.stringify(project)!==baseline;
const nativeChanged=()=>nativeLoadedKey!==''&&JSON.stringify(nativeDrops)!==nativeBaseline;
function announce(s){message=s;document.querySelectorAll('[data-dbo-message]').forEach(slot=>slot.textContent=s)}
function updateSaveState(){
 const dirty=changed();
 document.querySelectorAll('[data-dbo-save-state]').forEach(el=>{el.textContent=dirty?'● Unsaved on this device':(!project?.id?'○ Not yet saved to cloud':'✓ Cloud draft up to date');el.classList.toggle('dirty',dirty)});
}
function loadWorkspace(){
 try{const v=JSON.parse(localStorage.getItem(STASH)||'{}');workspace=v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{workspace={}}
}
function setBaseline(){baseline=JSON.stringify(project);updateSaveState()}
function canLeave({checkNative=true}={}){
 if(busy||uploadBusy||nativeSaving){announce('Finish saving or uploading before switching tools.');return false}
 if(checkNative&&active==='drops'&&selectedDropBoss.startsWith('native:')&&nativeChanged()){
  if(!confirm('This boss has unsaved drop changes. OK discards those changes. Cancel keeps you here so you can save.'))return false;
  nativeDrops=JSON.parse(nativeBaseline);nativeLoadedKey=''
 }
 return true
}
function openLocalDraft(key){
 const saved=workspace[key];if(!saved?.project)return;
 if(project)storageBackup();
 project=clone(saved.project);selectedId=null;
 stepIndex=Math.min(saved.stepIndex||0,Math.max(0,project.steps.length-1));
 baseline=saved.baseline||JSON.stringify(project);cloudUpdatedAt=null;
 message='Local draft restored. Save Cloud Draft to share it across devices.';
 storageBackup();renderBuilder()
}
function newStep(type='room'){
 return{id:'step-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),type,title:type==='comic'?'Story Scene':type==='fight'?'Encounter':type==='minigame'?'Minigame':'New Room',text:'',artPath:'',
  panels:type==='comic'?[{title:'Panel 1',text:'',artPath:''}]:[],enemies:'Enemy',enemyHealth:750,mechanic:'none',
  template:'choice',prompt:'',choices:['Left','Centre','Right'],answer:0,sequence:[0,1,2],drops:[]}
}
function copyAsNewDraft(source){
 const original=clone(source),type=original.content_type||'quest';
 const root=String(original.title||'Untitled '+type).replace(/^Copy of /,'');
 return {...original,id:null,slug:type+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),
  title:('Copy of '+root).slice(0,120),status:'draft',version:1,
  steps:(original.steps||[]).map(stage=>({...stage,id:newStep(stage.type).id}))};
}
function fresh(type='quest'){
 return{title:'Untitled '+type,slug:type+'-'+Date.now().toString(36),content_type:type,level:1,summary:'',steps:[newStep('comic'),newStep('fight')],status:'draft',id:null,version:1}
}
function clean(){
 const b=runtime()?.cleanBlueprint?.(project)||{version:1,summary:project?.summary||'',level:project?.level||1,steps:project?.steps||[]};
 return{...b,title:String(project?.title||'').slice(0,120),content_type:project?.content_type||'quest'}
}
function storageBackup(){
 if(!project)return;
 try{
  const key=keyFor(project);
  // Do not clutter the project list with untouched new-project placeholders.
  if(!project.id&&!changed()&&/^Untitled (quest|dungeon|raid)$/.test(String(project.title)))delete workspace[key];
  else workspace[key]={project:clone(project),stepIndex,baseline,dirty:changed(),cloudUpdatedAt,updatedAt:Date.now()};
  // Keep the latest 30 projects, without evicting unsaved drafts.
  const keys=Object.keys(workspace).sort((a,b)=>(workspace[a].updatedAt||0)-(workspace[b].updatedAt||0));
  for(const old of keys.slice(0,Math.max(0,keys.length-30)))if(!workspace[old].dirty)delete workspace[old];
  localStorage.setItem(STASH,JSON.stringify(workspace));
  localStorage.setItem(STORE,JSON.stringify({project,selectedId,stepIndex,updatedAt:Date.now()}));
  lastLocal=project.slug;updateSaveState()
 }catch(e){console.warn('Design Booth local backup failed',e)}
}
function restoreBackup(){
 loadWorkspace();
 try{
  const v=JSON.parse(localStorage.getItem(STORE)||'null');
  if(v?.project&&Array.isArray(v.project.steps)){
   const saved=workspace[keyFor(v.project)];
   project=saved?.project?clone(saved.project):v.project;
   selectedId=project.id||null;stepIndex=Math.min(Number(saved?.stepIndex??v.stepIndex)||0,Math.max(0,project.steps.length-1));
   baseline=saved?.baseline||JSON.stringify(project);cloudUpdatedAt=saved?.cloudUpdatedAt||null;
   lastLocal=project.slug;return true
  }
 }catch{}
 return false
}
function loadRecord(r,{renderNow=true}={}){
 if(project)storageBackup();
 const b=r.draft_blueprint&&Array.isArray(r.draft_blueprint.steps)?r.draft_blueprint:r.blueprint||{};
 const cloud={...clone(b),id:r.id,slug:r.slug,title:b.title||r.title,content_type:b.content_type||r.content_type,status:r.status,version:r.version};
 const saved=workspace['cloud:'+r.id];
 let restore=Boolean(saved?.dirty&&saved.project);
 if(restore&&saved.cloudUpdatedAt&&saved.cloudUpdatedAt!==r.updated_at){
  restore=confirm('This project changed in the cloud since your local edits. OK: keep your local edits. Cancel: load the newer cloud copy.');
 }
 project=restore?clone(saved.project):cloud;
 selectedId=r.id;stepIndex=restore?Math.min(saved.stepIndex||0,Math.max(0,project.steps.length-1)):0;
 baseline=restore?saved.baseline:JSON.stringify(project);
 cloudUpdatedAt=r.updated_at||null;
 message=restore?'Recovered unsaved edits from this device. Save Cloud Draft before leaving.':'Opened '+r.title;
 storageBackup();if(renderNow)render()
}
async function fetchRecords(){
 if(!db()||!owner())return;
 const {data,error}=await db().from('cellbound_design_blueprints').select('id,slug,title,content_type,status,version,blueprint,draft_blueprint,updated_at').order('updated_at',{ascending:false});
 if(error)throw error;records=data||[]
}
function validate(){
 if(!project)return['Create or select a design.'];
 const errors=[],b=clean(),title=String(project.title||'').trim();
 if(title.length<3)errors.push('Give the adventure a title (at least three characters).');
 if(!b.steps.length)errors.push('Add at least one stage.');
 if(b.steps.length>30)errors.push('A blueprint supports up to 30 stages.');
 b.steps.forEach((s,i)=>{
  const label='Stage '+(i+1);
  if(!s.title.trim())errors.push(label+': title missing.');
  if(s.type==='comic'&&!s.panels?.length)errors.push(label+': add a comic panel.');
  if(s.type==='comic'&&s.panels.some(p=>!p.artPath))errors.push(label+': comic artwork missing.');
  if((s.type==='room'||s.type==='fight')&&!s.artPath)errors.push(label+': room or battle background missing.');
  if(s.type==='fight'&&!s.enemies.trim())errors.push(label+': add enemy names.');
  if(s.type==='minigame'){
   if(!runtime()?.templates?.().some(t=>t.id===s.template))errors.push(label+': choose a supported minigame.');
   if(!Array.isArray(s.choices)||s.choices.length<2)errors.push(label+': enter at least two choices, one per line.');
   if(s.template==='choice'&&(!Number.isInteger(s.answer)||s.answer<0||s.answer>=(s.choices?.length||0)))errors.push(label+': select a correct answer within the available choices.');
   if(s.template==='sequence'&&(!s.sequence?.length||s.sequence.some(i=>!Number.isInteger(i)||i<0||i>=(s.choices?.length||0))))errors.push(label+': correct order must refer to the choices you listed.');
  }
  if(s.type==='fight'){
   const raw=project.steps[i]?.drops||[],valid=s.drops||[];
   if(raw.length>6)errors.push(label+': maximum six drop rows per boss.');
   if(raw.length!==valid.length)errors.push(label+': choose valid items and drop chances for every loot row.');
   if(valid.some(d=>d.chance<1||d.chance>100))errors.push(label+': drop chance must be between 1% and 100%.');
   const gear=valid.filter(d=>d.kind==='gear');
   if(gear.length>2)errors.push(label+': maximum two equipment drops per boss.');
   if(gear.reduce((sum,d)=>sum+d.chance,0)>100)errors.push(label+': equipment drop chances must total 100% or less.');
  }
 });
 return errors
}
async function save(publish=false){
 if(!owner()||busy||uploadBusy||!project)return;
 collect();const problems=validate();
 if(publish&&problems.length){announce('Cannot publish: '+problems[0]+' ('+problems.length+' issues)');render();return}
 busy=true;announce(publish?'Publishing adventure…':'Saving draft to Cellbound…');
 const b=clean(),title=String(project.title||'Untitled').trim(),previousKey=keyFor(project);
 document.querySelectorAll('#dboWorkbench input,#dboWorkbench select,#dboWorkbench textarea,#dboWorkbench button,#dboDrops input,#dboDrops select,#dboDrops button').forEach(el=>el.disabled=true);
 try{
  const user=await db().auth.getUser();
  if(user.error||!user.data?.user?.id)throw new Error('Sign in using your owner account.');
  const stamp=new Date().toISOString();
  if(project.id){
   const record=records.find(r=>r.id===project.id);
   const payload={draft_blueprint:b,updated_by:user.data.user.id,updated_at:stamp};
   if(publish){payload.title=title;payload.content_type=project.content_type;payload.blueprint=b;payload.status='published';payload.published_at=stamp;payload.version=(Number(record?.version)||1)+1}
   else if(record?.status!=='published'){payload.title=title;payload.content_type=project.content_type}
   const {data,error}=await db().from('cellbound_design_blueprints').update(payload).eq('id',project.id).select().single();
   if(error)throw error;project.status=data.status;project.version=data.version;
  }else{
   const payload={slug:project.slug,title,content_type:project.content_type,draft_blueprint:b,blueprint:publish?b:{},status:publish?'published':'draft',created_by:user.data.user.id,updated_by:user.data.user.id};
   if(publish)payload.published_at=stamp;
   const {data,error}=await db().from('cellbound_design_blueprints').insert(payload).select().single();
   if(error)throw error;project.id=data.id;project.status=data.status;project.version=data.version;selectedId=data.id
  }
  await fetchRecords();
  if(previousKey!==keyFor(project))delete workspace[previousKey];
  cloudUpdatedAt=records.find(r=>r.id===project.id)?.updated_at||null;
  setBaseline();storageBackup();
  if(publish){window.dispatchEvent(new CustomEvent('cellbound:design-published'));announce('PUBLISHED · players can now start this '+project.content_type+' in their game tab.')}
  else announce('DRAFT SAVED · published players still see the previous version, if any.');
 }catch(e){announce('Save failed: '+String(e?.message||e))}
 finally{busy=false;render()}
}
async function remove(){
 if(!owner()||!project?.id||busy||uploadBusy||!confirm('Delete this design from Cellbound? A published adventure will disappear from player lists.'))return;
 busy=true;
 try{
  const {error}=await db().from('cellbound_design_blueprints').delete().eq('id',project.id);if(error)throw error;
  await fetchRecords();delete workspace[keyFor(project)];project=fresh();selectedId=null;stepIndex=0;cloudUpdatedAt=null;setBaseline();storageBackup();window.dispatchEvent(new CustomEvent('cellbound:design-published'));announce('Design deleted.');render()
 }catch(e){announce(String(e?.message||e))}
 finally{busy=false}
}
async function upload(stepId,panelIndex,file){
 if(!file||!owner()||!project||uploadBusy||busy)return;
 if(!['image/webp','image/jpeg','image/png','image/avif'].includes(file.type)){announce('Use WebP, PNG, JPEG or AVIF.');return}
 if(file.size>10*1024*1024){announce('Image must be at most 10 MB.');return}
 const target=project.steps.find(s=>s.id===stepId);
 if(!target)return;
 const ext={'image/webp':'webp','image/png':'png','image/jpeg':'jpg','image/avif':'avif'}[file.type];
 const path=project.slug+'/'+target.id+'/'+(panelIndex===null?'stage':'panel-'+panelIndex)+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+ext;
 uploadBusy=true;announce('Uploading '+file.name+'…');
 try{
  const {error}=await db().storage.from('cellbound-design-art').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'31536000'});
  if(error)throw error;
  if(panelIndex===null)target.artPath=path;else if(target.panels?.[panelIndex])target.panels[panelIndex].artPath=path;
  storageBackup();announce('Artwork uploaded to the design draft. Publish the adventure to make it playable for everyone.');render()
 }catch(e){announce('Artwork upload failed: '+String(e?.message||e))}
 finally{uploadBusy=false;if(opened&&active==='build')renderBuilder()}
}
function collect(){
 if(!['build','drops'].includes(active)||!project)return;
 const form=$(active==='drops'?'#dboDrops':'#dboFields');if(!form)return;
 for(const field of form.querySelectorAll('[data-db-field]')){
  const key=field.dataset.dbField,value=field.value;
  if(key==='title'||key==='summary'||key==='content_type'||key==='level'){project[key]=key==='level'?Math.max(1,Math.min(75,Number(value)||1)):value}
  else if(key.startsWith('step.')){
   const s=project.steps[stepIndex];if(!s)continue;
   const sub=key.slice(5);
   if(sub==='choices')s.choices=value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,5);
    else if(sub==='answerFriendly')s.answer=Number(value)-1;
    else if(sub==='sequenceFriendly')s.sequence=value.split(/[,\s]+/).filter(Boolean).map(v=>Number(v)-1).slice(0,8);
   else if(sub==='sequence')s.sequence=value.split(',').map(Number).filter(Number.isFinite).map(x=>Math.round(x)).slice(0,8);
   else if(['enemyHealth','answer'].includes(sub))s[sub]=Number(value)||0;
   else s[sub]=value;
  }else if(key.startsWith('drop.')){
   const s=project.steps[stepIndex],parts=key.split('.'),i=Number(parts[1]),prop=parts[2];
   if(s?.drops?.[i])s.drops[i][prop]=['chance','quantity'].includes(prop)?Number(value)||0:value
  }else if(key.startsWith('panel.')){
   const s=project.steps[stepIndex],parts=key.split('.'),i=Number(parts[1]),attr=parts[2];
   if(s?.panels?.[i])s.panels[i][attr]=value
  }
 }
 for(const input of form.querySelectorAll('[data-db-drop]')){
  const items=active==='drops'&&selectedDropBoss.startsWith('native:')?nativeDrops:project.steps[stepIndex]?.drops;
  const parts=input.dataset.dbDrop.split('.'),i=Number(parts[0]),prop=parts[1];
  if(items?.[i])items[i][prop]=['chance','quantity'].includes(prop)?Number(input.value)||0:input.value
 }
 storageBackup()
}
function field(name,key,value,{kind='text',opts=[]}={}){
 const val=String(value??'');
 const title='<span>'+esc(name)+'</span>';
 if(kind==='textarea')return'<label class="dbo-field">'+title+'<textarea data-db-field="'+esc(key)+'" rows="3">'+esc(val)+'</textarea></label>';
 if(kind==='select')return'<label class="dbo-field">'+title+'<select data-db-field="'+esc(key)+'">'+opts.map(o=>'<option value="'+esc(o.value||o)+'" '+((o.value||o)===val?'selected':'')+'>'+esc(o.label||o)+'</option>').join('')+'</select></label>';
 return'<label class="dbo-field">'+title+'<input type="'+(kind==='number'?'number':'text')+'" data-db-field="'+esc(key)+'" value="'+esc(val)+'" '+(kind==='number'?'min="0" max="50000"':'')+'></label>'
}
function imageControl(s,panel=null){
 const path=panel===null?s.artPath:s.panels?.[panel]?.artPath,src=runtime()?.artUrl?.(path),index=panel===null?'stage':String(panel);
 return'<div class="dbo-image-control">'+(src?'<img src="'+esc(src)+'" alt="Uploaded artwork">':'<div class="dbo-art-missing">Artwork not uploaded</div>')+
 '<label>UPLOAD ARTWORK<input type="file" accept="image/webp,image/png,image/jpeg,image/avif" data-db-upload="'+esc(s.id)+'" data-db-panel="'+index+'"></label><small>16:9 recommended · 10 MB max. Uploaded image stays in draft until publishing.</small></div>'
}

function lootDropOptions(kind,selected=''){
 const catalog=runtime()?.lootCatalog?.()||{gear:[],materials:[]};
 const rows=(kind==='gear'?catalog.gear:catalog.materials);
 return rows.map(it=>'<option value="'+esc(it.key)+'" '+(selected===it.key?'selected':'')+'>'+esc(kind==='gear'?'T'+it.tier+' · '+it.klass+' · '+it.label:it.label+' · '+it.rarity)+'</option>').join('')
}
function describeDrop(drop){
 const catalog=runtime()?.lootCatalog?.()||{gear:[],materials:[]};
 const material=drop.kind==='material',entry=(material?catalog.materials:catalog.gear).find(x=>x.key===drop.key);
 return{tier:material?'MATERIAL':'T'+(entry?.tier||'?'),
  category:material?'material':'gear',
  name:entry?.label||drop.key||'Unknown item',
  detail:material?(entry?.rarity||'Material')+' · Quantity ×'+(Number(drop.quantity)||1):(entry?.klass||'Equipment')+' · '+(entry?.slot||'Gear'),
  chance:Math.max(0,Math.min(100,Number(drop.chance)||0)),
  search:[entry?.label,drop.key,entry?.tier&&'tier '+entry.tier,entry?.klass,entry?.slot,entry?.rarity,material?'material':'equipment'].filter(Boolean).join(' ').toLowerCase()}
}
function lootOverview(items){
 const sorted=items.map((item,index)=>({...describeDrop(item),index}));
 const cmp=(a,b)=>dropSort==='chance'?b.chance-a.chance||a.name.localeCompare(b.name)
  :dropSort==='name'?a.name.localeCompare(b.name)
  :a.category.localeCompare(b.category)||a.tier.localeCompare(b.tier,undefined,{numeric:true})||a.name.localeCompare(b.name);
 sorted.sort(cmp);
 return'<section class="dbo-loot-overview"><header><div><small>SELECTED BOSS · ASSIGNED LOOT</small><h4>Drop list <span>'+items.length+' / 6</span></h4></div><button type="button" id="dboAddLoot" '+(items.length>=6?'disabled':'')+'>+ ADD ITEM</button></header>'+
 '<div class="dbo-loot-controls"><label>FIND AN ITEM<input id="dboLootSearch" type="search" autocomplete="off" placeholder="Search by item name, class or slot…" value="'+esc(dropSearch)+'"></label>'+
 '<label>ITEM TIER<select id="dboLootTierFilter"><option value="all" '+(dropTier==='all'?'selected':'')+'>All tiers</option><option value="T1" '+(dropTier==='T1'?'selected':'')+'>Tier 1</option><option value="T2" '+(dropTier==='T2'?'selected':'')+'>Tier 2</option><option value="MATERIAL" '+(dropTier==='MATERIAL'?'selected':'')+'>Materials</option></select></label>'+
 '<label>SORT BY<select id="dboLootSort"><option value="tier" '+(dropSort==='tier'?'selected':'')+'>Tier & item</option><option value="name" '+(dropSort==='name'?'selected':'')+'>Item name A–Z</option><option value="chance" '+(dropSort==='chance'?'selected':'')+'>Highest chance</option></select></label></div>'+
 '<div class="dbo-loot-table" role="table" aria-label="Selected boss drops"><div class="dbo-loot-table-head" role="row"><span role="columnheader">TIER</span><span role="columnheader">ITEM NAME</span><span role="columnheader">DROP CHANCE</span><span role="columnheader">MANAGE</span></div>'+
 sorted.map(d=>'<div class="dbo-loot-table-row '+(d.index===dropEditIndex?'editing':'')+'" role="row" data-db-loot-row="'+d.index+'" data-db-search="'+esc(d.search)+'" data-db-tier="'+esc(d.tier)+'">'+
 '<span role="cell"><b class="dbo-loot-tier '+(d.category==='material'?'material':'')+'">'+esc(d.tier)+'</b></span>'+
 '<span role="cell" class="dbo-loot-name"><strong>'+esc(d.name)+'</strong><small>'+esc(d.detail)+'</small></span>'+
 '<span role="cell" class="dbo-loot-prob"><b>'+d.chance+'%</b></span>'+
 '<span role="cell" class="dbo-loot-actions"><button type="button" data-db-edit-row="'+d.index+'" aria-label="Edit '+esc(d.name)+'">EDIT</button><button type="button" data-db-remove-drop="'+d.index+'" aria-label="Remove '+esc(d.name)+'">REMOVE</button></span></div>').join('')+
 '</div><p class="dbo-loot-empty-search" id="dboLootNoMatches" hidden>No matching items for this boss.</p>'+
 (!items.length?'<p class="dbo-loot-blank">No extra drops configured for this boss. Select Add Item to create a drop.</p>':'')+
 '<small class="dbo-loot-hint">Each row rolls independently after the boss is defeated. Search and filters only change the view, not your saved rewards.</small></section>'
}
function lootEditor(step,{raid=false,editIndex=-1}={}){
 const items=Array.isArray(step.drops)?step.drops:[];
 const drop=items[editIndex];if(!drop)return'';
 const kind=drop.kind==='material'?'material':'gear';
 return'<section class="dbo-boss-loot dbo-loot-edit-panel"><header><div><small>EDITING DROP '+(editIndex+1)+'</small><h4>'+esc(describeDrop(drop).name)+'</h4><p>Choose the item and set its individual drop chance. Changes appear in the loot list above.</p></div><button type="button" id="dboCloseLootEdit">DONE ×</button></header>'+
 (raid?'<p class="dbo-loot-notice">Raid prototype rewards are not yet awarded to players.</p>':'')+
 '<div class="dbo-drop-list"><div class="dbo-drop-row" data-db-drop-row="'+editIndex+'"><div class="dbo-drop-grid">'+
 '<label>REWARD TYPE<select data-db-drop="'+editIndex+'.kind"><option value="gear" '+(kind==='gear'?'selected':'')+'>Equipment</option><option value="material" '+(kind==='material'?'selected':'')+'>Profession reagent</option></select></label>'+
 '<label>ITEM<select data-db-drop="'+editIndex+'.key">'+lootDropOptions(kind,drop.key)+'</select></label>'+
 '<label>DROP CHANCE (%)<input type="number" min="1" max="100" step="1" inputmode="numeric" data-db-drop="'+editIndex+'.chance" value="'+esc(drop.chance??25)+'"></label>'+
 '<label>QUANTITY<input type="number" min="1" max="'+(kind==='gear'?1:5)+'" step="1" inputmode="numeric" data-db-drop="'+editIndex+'.quantity" value="'+esc(kind==='gear'?1:(drop.quantity||1))+'" '+(kind==='gear'?'disabled':'')+'></label></div></div></div>'+
 '<p class="dbo-loot-footnote">Equipment is limited to available Tier 1–2 gear. Higher-tier gear and raid-exclusive items are not unlocked by this editor.</p></section>'
}

function stageFields(s){
 let extra='';
 if(s.type==='comic'){
  extra='<section class="dbo-panel-list"><h4>Comic panels · '+s.panels.length+'/6</h4>'+s.panels.map((p,i)=>'<article class="dbo-comic-panel"><header><b>Panel '+(i+1)+'</b><button type="button" data-db-remove-panel="'+i+'">REMOVE</button></header>'+field('Panel heading','panel.'+i+'.title',p.title)+field('Caption / dialogue','panel.'+i+'.text',p.text,{kind:'textarea'})+imageControl(s,i)+'</article>').join('')+
  '<button type="button" data-db-add-panel '+(s.panels.length>=6?'disabled':'')+'>+ ADD COMIC PANEL</button></section>'
 }
 if(s.type==='fight')extra='<div class="dbo-form-grid">'+field('Enemies · comma-separated','step.enemies',s.enemies,{kind:'textarea'})+field('Enemy health','step.enemyHealth',s.enemyHealth,{kind:'number'})+field('Combat mechanic','step.mechanic',s.mechanic,{kind:'select',opts:['none','circle','line','interrupt','adds']})+'</div>'+imageControl(s)+'<button type="button" class="dbo-manage-drops" id="dboGoToDrops">MANAGE THIS BOSS\'S LOOT →</button>';
 if(s.type==='room')extra=imageControl(s);
 if(s.type==='minigame')extra='<div class="dbo-form-grid">'+field('Template','step.template',s.template,{kind:'select',opts:(runtime()?.templates?.()||[]).map(t=>({value:t.id,label:t.label}))})+field('Puzzle instruction','step.prompt',s.prompt,{kind:'textarea'})+field('Choices (one per line)','step.choices',s.choices.join('\n'),{kind:'textarea'})+(s.template==='choice'?field('Which answer is correct? (1 = first choice)','step.answerFriendly',(Number(s.answer)||0)+1,{kind:'number'}):field('Correct order (example: 1, 3, 2)','step.sequenceFriendly',s.sequence.map(i=>Number(i)+1).join(', ')))+'</div>'+imageControl(s);
 return'<div class="dbo-stage-fields">'+field('Stage title','step.title',s.title)+field('Stage type','step.type',s.type,{kind:'select',opts:[{value:'comic',label:'Comic Strip'},{value:'room',label:'Room / Transition'},{value:'fight',label:'Combat Encounter'},{value:'minigame',label:'Minigame'}]})+field('Description / narration','step.text',s.text,{kind:'textarea'})+extra+'</div>'
}
function reviewHTML(){
 const issues=validate();
 return '<h4>'+(issues.length?issues.length+' thing'+(issues.length===1?'':'s')+' to finish before publishing':'Ready to publish')+'</h4>'+
 (issues.length?'<ol class="dbo-review-list">'+issues.map(issue=>{
  const match=/^Stage (\d+):/.exec(issue);
  return '<li>'+(match?'<button type="button" data-db-fix-step="'+(Number(match[1])-1)+'">'+esc(issue)+' →</button>':esc(issue))+'</li>'
 }).join('')+'</ol>':'<p>All required stages are ready. Test the adventure before publishing it.</p>')+
 '<small>Save Cloud Draft first to protect your work. Testing does not publish or award loot. Publishing changes what players can access.</small>'
}
function renderReview(){
 const panel=$('#dboReview');if(panel){
  panel.innerHTML=reviewHTML();
  panel.querySelectorAll('[data-db-fix-step]').forEach(button=>button.addEventListener('click',()=>{
   collect();stepIndex=Number(button.dataset.dbFixStep);storageBackup();renderBuilder();
   $('#dboFields .dbo-stage-editor-header')?.scrollIntoView?.({behavior:'smooth',block:'start'})
  }))
 }
 const btn=$('#dboWorkbench #dboPublish');if(btn)btn.disabled=busy||uploadBusy||validate().length>0;
 updateSaveState()
}
function renderBuilder(){
 const host=$('#dboWorkbench');if(!host||!project)return;
 const s=project.steps[stepIndex]||null,problems=validate(),selected=records.find(r=>r.id===project.id);
 const localDrafts=Object.entries(workspace).filter(([key,row])=>key.startsWith('local:')&&row?.project&&!row.project.id&&Array.isArray(row.project.steps)).sort((a,b)=>(b[1].updatedAt||0)-(a[1].updatedAt||0));
 host.innerHTML='<div class="dbo-builder-top"><div><small>DESIGN WORKSPACE · CLOUD DRAFTS</small><h3>'+esc(project.title)+'</h3><p>'+esc(project.status==='published'?'Published v'+project.version+' · edit without changing the version players see until Publish is pressed':'Unpublished draft · only you can see it')+'</p><span data-dbo-save-state class="dbo-save-state"></span></div><div class="dbo-buttons"><button type="button" id="dboNewQuest">+ QUEST</button><button type="button" id="dboNewDungeon">+ DUNGEON</button><button type="button" id="dboNewRaid">+ RAID</button><button type="button" id="dboCopyAdventure">COPY TO NEW DRAFT</button></div></div>'+
 '<div class="dbo-editor-layout"><aside class="dbo-projects"><h4>PROJECTS <span>'+(records.length+localDrafts.length)+'</span></h4><div class="dbo-project-list">'+records.map(r=>'<button type="button" data-db-project="'+esc(r.id)+'" class="'+(r.id===project.id?'active':'')+'"><small>'+esc(r.content_type.toUpperCase())+' · '+esc(r.status)+'</small><b>'+esc(r.title)+'</b></button>').join('')+localDrafts.map(([key,row])=>'<button type="button" data-db-local="'+esc(key)+'" class="'+(key===keyFor(project)?'active':'')+'"><small>ON THIS DEVICE · NOT CLOUD SAVED</small><b>'+esc(row.project.title||'Untitled')+'</b></button>').join('')+'</div><h4>ADVENTURE STAGES <span>'+project.steps.length+'/30</span></h4>'+
 '<div class="dbo-stage-list">'+project.steps.map((st,i)=>'<button type="button" data-db-step="'+i+'" class="'+(i===stepIndex?'active':'')+'"><i>'+String(i+1).padStart(2,'0')+'</i><span><b>'+esc(st.title)+'</b><small>'+esc(st.type)+'</small></span></button>').join('')+'</div>'+
 '<div class="dbo-add"><select id="dboAddType"><option value="comic">Comic strip</option><option value="room">Room / transition</option><option value="fight">Fight encounter</option><option value="minigame">Minigame</option></select><button type="button" id="dboAddStep" '+(project.steps.length>=30?'disabled':'')+'>+ ADD STAGE</button></div></aside>'+
 '<main id="dboFields" class="dbo-project-editor"><div class="dbo-form-grid">'+field('Adventure name','title',project.title)+field('Minimum party level','level',project.level,{kind:'number'})+field('Category','content_type',project.content_type,{kind:'select',opts:['quest','dungeon','raid']})+field('Short description','summary',project.summary,{kind:'textarea'})+'</div>'+
 (s?'<div class="dbo-stage-editor-header"><div><small>STAGE '+(stepIndex+1)+' OF '+project.steps.length+'</small><h3>'+esc(s.title)+'</h3></div><div class="dbo-stage-actions"><button data-db-move="-1" '+(stepIndex===0?'disabled':'')+'>↑</button><button data-db-move="1" '+(stepIndex===project.steps.length-1?'disabled':'')+'>↓</button><button id="dboCopyStage" '+(project.steps.length>=30?'disabled':'')+'>DUPLICATE STAGE</button><button id="dboSaveStageTemplate">SAVE AS TEMPLATE</button><button data-db-remove-stage>REMOVE</button></div></div>'+stageFields(s):'<div class="dbo-empty">Add a stage to start designing.</div>')+
 '<div class="dbo-review" id="dboReview" aria-live="polite">'+reviewHTML()+'</div><div class="dbo-footer"><button id="dboSave" '+(busy?'disabled':'')+'>SAVE CLOUD DRAFT</button><button id="dboTest" '+(busy?'disabled':'')+'>▶ TEST FROM STAGE</button><button class="primary" id="dboPublish" '+(busy||problems.length?'disabled':'')+'>PUBLISH TO GAME</button>'+(project.id?'<button id="dboDelete">DELETE</button>':'')+'</div><p data-dbo-message role="status">'+esc(message||'Changes back up automatically on this iPad; use Save Cloud Draft to sync across devices.')+'</p></main></div>';
 bindBuilder()
}
function bindBuilder(){
 const host=$('#dboWorkbench');if(!host)return;
 host.querySelectorAll('[data-db-field]').forEach(el=>{
  el.addEventListener('input',()=>{collect();renderReview();if(el.dataset.dbField==='title'){const h=host.querySelector('.dbo-builder-top h3');if(h)h.textContent=project.title;}});
  if(['step.type','content_type','step.template'].includes(el.dataset.dbField))el.addEventListener('change',()=>{collect();renderBuilder()})
 });
 host.querySelectorAll('[data-db-project]').forEach(btn=>btn.onclick=()=>{if(!canLeave({checkNative:false}))return;collect();const rec=records.find(r=>r.id===btn.dataset.dbProject);if(rec)loadRecord(rec)});
 host.querySelectorAll('[data-db-local]').forEach(btn=>btn.onclick=()=>{if(!canLeave({checkNative:false}))return;collect();openLocalDraft(btn.dataset.dbLocal)});
 host.querySelectorAll('[data-db-step]').forEach(btn=>btn.onclick=()=>{collect();stepIndex=Number(btn.dataset.dbStep);renderBuilder()});
 for(const type of ['quest','dungeon','raid'])host.querySelector('#dboNew'+type[0].toUpperCase()+type.slice(1))?.addEventListener('click',()=>{if(!confirm('Create a new '+type+'? The current work is backed up locally.'))return;collect();storageBackup();project=fresh(type);selectedId=null;stepIndex=0;cloudUpdatedAt=null;setBaseline();storageBackup();renderBuilder()});
 host.querySelector('#dboCopyAdventure')?.addEventListener('click',()=>{
  collect();
  if(!confirm('Create a separate, unpublished copy of this adventure? The original will not change. Save Cloud Draft when you are ready to share your new project.'))return;
  storageBackup();project=copyAsNewDraft(project);selectedId=null;stepIndex=0;cloudUpdatedAt=null;
  setBaseline();storageBackup();announce('Created a new, unpublished copy. The original is unchanged. Save Cloud Draft to share it.');renderBuilder();
 });
 host.querySelector('#dboSaveStageTemplate')?.addEventListener('click',()=>{
  collect();window.CellboundDesignLibrary?.useStage?.(clone(project.steps[stepIndex]));
 });
 host.querySelector('#dboCopyStage')?.addEventListener('click',()=>{
  collect();if(project.steps.length>=30)return;
  const original=project.steps[stepIndex];
  const duplicate={...clone(original),id:newStep(original.type).id,title:(String(original.title||'Stage')+' (copy)').slice(0,120)};
  project.steps.splice(stepIndex+1,0,duplicate);stepIndex+=1;storageBackup();renderBuilder();
 });
 host.querySelector('#dboAddStep')?.addEventListener('click',()=>{collect();project.steps.push(newStep($('#dboAddType').value));stepIndex=project.steps.length-1;storageBackup();renderBuilder()});
 host.querySelectorAll('[data-db-move]').forEach(btn=>btn.onclick=()=>{collect();const to=stepIndex+Number(btn.dataset.dbMove);if(to<0||to>=project.steps.length)return;[project.steps[stepIndex],project.steps[to]]=[project.steps[to],project.steps[stepIndex]];stepIndex=to;storageBackup();renderBuilder()});
 host.querySelector('[data-db-remove-stage]')?.addEventListener('click',()=>{if(!confirm('Remove this stage?'))return;collect();project.steps.splice(stepIndex,1);stepIndex=Math.max(0,Math.min(stepIndex,project.steps.length-1));storageBackup();renderBuilder()});
 host.querySelector('[data-db-add-panel]')?.addEventListener('click',()=>{collect();const s=project.steps[stepIndex];if(s.panels.length>=6)return;s.panels.push({title:'Panel '+(s.panels.length+1),text:'',artPath:''});storageBackup();renderBuilder()});
 host.querySelectorAll('[data-db-remove-panel]').forEach(btn=>btn.onclick=()=>{collect();const s=project.steps[stepIndex];s.panels.splice(Number(btn.dataset.dbRemovePanel),1);storageBackup();renderBuilder()});
 host.querySelectorAll('[data-db-upload]').forEach(el=>el.addEventListener('change',e=>{collect();upload(el.dataset.dbUpload,el.dataset.dbPanel==='stage'?null:Number(el.dataset.dbPanel),e.target.files?.[0])}));
 host.querySelector('#dboGoToDrops')?.addEventListener('click',()=>{collect();dropEditIndex=-1;dropSearch='';dropTier='all';selectedDropBoss=project.id?'project:'+project.id+':'+project.steps[stepIndex].id:'local:'+project.slug+':'+project.steps[stepIndex].id;setTab('drops')});
 host.querySelector('#dboSave')?.addEventListener('click',()=>save(false));
 host.querySelector('#dboPublish')?.addEventListener('click',()=>{if(confirm('Publish this '+project.content_type+' to the game for all players on staging?'))save(true)});
 host.querySelector('#dboDelete')?.addEventListener('click',remove);
 host.querySelector('#dboTest')?.addEventListener('click',()=>{collect();const preview={title:project.title,content_type:project.content_type,blueprint:{...clean(),steps:clean().steps.slice(stepIndex)}};runtime()?.play?.('local',preview)});
 renderReview();
}

function bossChoices(){
 const all=[],included=new Set();
 // The current unsaved project takes precedence over the cloud version of that project.
 function projectBosses(p){
  const key=p.id?'project:'+p.id:'local:'+p.slug;
  if(included.has(key))return;included.add(key);
  (p.steps||[]).forEach((st,i)=>{
   if(st.type!=='fight')return;
   all.push({id:key+':'+st.id,title:(p.title||'Unpublished project')+' · '+(st.title||'Unnamed boss'),
    source:'design',projectId:p.id||null,stepId:st.id,stepIndex:i,type:p.content_type||'quest'})
  })
 }
 if(project)projectBosses(project);
 for(const r of records){
  const b=r.draft_blueprint&&Array.isArray(r.draft_blueprint.steps)?r.draft_blueprint:r.blueprint||{};
  projectBosses({...b,id:r.id,title:b.title||r.title,content_type:r.content_type})
 }
 const native=window.CellboundBossDropTables?.bosses?.()||[];
 native.forEach(b=>all.push({id:'native:'+b.key,title:b.dungeon+' · '+b.boss,source:'native',key:b.key,raid:b.raid}));
 return all
}
function activeLootRows(){
 return selectedDropBoss.startsWith('native:')?nativeDrops:(project?.steps?.[stepIndex]?.drops||[])
}
function validateLootRows(rows){
 const R=runtime(),clean=R?.cleanBlueprint?.({steps:[{type:'fight',drops:rows}]})?.steps?.[0]?.drops||[];
 if(rows.length!==clean.length)return 'An item is unavailable or restricted.';
 if(rows.length>6)return 'A boss can have up to six reward rows.';
 if(clean.some(x=>x.chance<1||x.chance>100))return 'Use a drop chance between 1% and 100%.';
 const gear=clean.filter(x=>x.kind==='gear');
 if(gear.length>2||gear.reduce((sum,x)=>sum+x.chance,0)>100)return 'Maximum two equipment rows, with combined chances no higher than 100%.';
 return''
}
function renderDrops(){
 const root=$('#dboDrops');if(!root)return;
 const opts=bossChoices();
 if(!opts.length){root.innerHTML='<section class="dbo-drops-main"><h3>Drop Tables</h3><p>No bosses found. Add a Fight Encounter in Adventure Builder to start assigning drops.</p></section>';return}
 if(!opts.some(o=>o.id===selectedDropBoss))selectedDropBoss=opts.find(o=>o.source==='design')?.id||opts[0].id;
 const target=opts.find(o=>o.id===selectedDropBoss),native=target.source==='native';
 if(!native&&(project?.id!==target.projectId||project.steps?.[stepIndex]?.id!==target.stepId)){
  const record=records.find(r=>r.id===target.projectId);
  if(record){
   const b=record.draft_blueprint&&Array.isArray(record.draft_blueprint.steps)?record.draft_blueprint:record.blueprint;
   loadRecord(record,{renderNow:false});
   stepIndex=project.steps.findIndex(st=>st.id===target.stepId);storageBackup();
  }else if(project)stepIndex=project.steps.findIndex(st=>st.id===target.stepId);
 }
 if(native&&nativeLoadedKey!==target.key){
  nativeDrops=clone(window.CellboundBossDropTables?.get?.(target.key)||[]);
  nativeLoadedKey=target.key;nativeBaseline=JSON.stringify(nativeDrops)
 }
 if(!native)nativeLoadedKey='';
 const current=native?{drops:nativeDrops}:project.steps?.[stepIndex];
 const groups=[
  ['Custom Quests, Dungeons & Raids',opts.filter(o=>o.source==='design')],
  ['Existing Game Dungeons & Raid',opts.filter(o=>o.source==='native')]
 ];
 const select=groups.map(([name,rows])=>rows.length?'<optgroup label="'+esc(name)+'">'+rows.map(o=>'<option value="'+esc(o.id)+'" '+(o.id===target.id?'selected':'')+'>'+esc(o.title)+'</option>').join('')+'</optgroup>':'').join('');
 const bad=validateLootRows(current?.drops||[]);
 root.innerHTML='<section class="dbo-drops-main"><header class="dbo-drops-head"><small>CELLBOUND · LOOT MANAGEMENT</small><h3>Drop Tables</h3><p>Select any boss, then add or remove the rewards assigned to that encounter. Each drop has its own chance and quantity.</p></header>'+
 '<label class="dbo-drops-picker"><span>SELECT BOSS</span><select id="dboBossPicker">'+select+'</select></label>'+
 '<div class="dbo-catalog-shortcut"><span>Need to check which items exist, their tier or class?</span><button type="button" id="dboGoToItemCatalog">BROWSE ITEM CATALOGUE →</button></div>'+
 '<div class="dbo-drops-status"><b>'+esc(target.title)+'</b><small>'+esc(native?(nativeChanged()?'UNSAVED EDITS · SAVE BOSS DROPS':'EXISTING GAME BOSS · ADDITIONAL DROP TABLE'):target.type.toUpperCase()+' · DESIGN BOOTH PROJECT')+'</small></div>'+
 (native?'<div class="dbo-native-default"><small>EXISTING GAME REWARDS · NOT OVERRIDDEN</small><p>'+esc((window.CellboundBossDropTables?.bosses?.()||[]).find(b=>b.key===target.key)?.baseRewards||'Original game rewards remain unchanged.')+'</p></div><p class="dbo-loot-notice">This screen manages <b>extra boss drops</b>. Original dungeon drops, rare items, guaranteed completion rewards and Tier 5 raid rewards still follow their existing game rules. '+(target.raid?'Manor raid bonus rewards are in planning mode and will not award to players yet.':'Additional drops are sent to the Bank when this boss is defeated.')+'</p>':
 '<p class="dbo-loot-notice">This is the full drop table for this designed encounter. Changes save to its project draft; press Publish to make them available in-game.</p>')+
 lootOverview(current?.drops||[])+lootEditor(current||{drops:[]},{raid:target.raid||target.type==='raid',editIndex:dropEditIndex})+
 '<div class="dbo-drops-footer"><p role="status" data-dbo-message>'+esc(message||'Choose a boss to edit its loot.')+'</p>'+
 (bad?'<p class="dbo-drop-error">'+esc(bad)+'</p>':'')+
 '<div class="dbo-buttons">'+(native?
 '<button id="dboSaveNative" class="primary" '+(nativeSaving||bad||!nativeChanged()?'disabled':'')+'>SAVE BOSS DROPS</button><button id="dboDiscardNative" '+(!nativeChanged()||nativeSaving?'disabled':'')+'>DISCARD EDITS</button>':
 '<button id="dboSave" '+(busy?'disabled':'')+'>SAVE CLOUD DRAFT</button><button id="dboPublish" class="primary" '+(busy||bad||validate().length?'disabled':'')+'>PUBLISH LOOT CHANGES</button>')+'</div></div></section>';
 bindDrops();applyLootFilters()
}
function applyLootFilters(){
 const host=$('#dboDrops');if(!host)return;
 const term=dropSearch.trim().toLowerCase();let shown=0;
 host.querySelectorAll('[data-db-loot-row]').forEach(row=>{
  const matches=(!term||String(row.dataset.dbSearch||'').includes(term))&&(dropTier==='all'||row.dataset.dbTier===dropTier);
  row.hidden=!matches;if(matches)shown++
 });
 const noMatches=host.querySelector('#dboLootNoMatches');
 if(noMatches)noMatches.hidden=shown>0||activeLootRows().length===0;
}

function bindDrops(){
 const host=$('#dboDrops');if(!host)return;
 host.querySelector('#dboGoToItemCatalog')?.addEventListener('click',()=>{collect();setTab('items')});
 host.querySelector('#dboBossPicker')?.addEventListener('change',e=>{
  collect();
  if(e.target.value!==selectedDropBoss&&!canLeave()){e.target.value=selectedDropBoss;return}
  selectedDropBoss=e.target.value;message='';dropEditIndex=-1;dropSearch='';dropTier='all';
  renderDrops()
 });
 host.querySelector('#dboLootSearch')?.addEventListener('input',event=>{dropSearch=event.target.value;applyLootFilters()});
 host.querySelector('#dboLootTierFilter')?.addEventListener('change',event=>{dropTier=event.target.value;applyLootFilters()});
 host.querySelector('#dboLootSort')?.addEventListener('change',event=>{collect();dropSort=event.target.value;renderDrops()});
 host.querySelectorAll('[data-db-edit-row]').forEach(btn=>btn.addEventListener('click',()=>{
  collect();dropEditIndex=Number(btn.dataset.dbEditRow);renderDrops();
  host.querySelector('[data-db-drop="'+dropEditIndex+'.key"]')?.focus()
 }));
 host.querySelector('#dboCloseLootEdit')?.addEventListener('click',()=>{collect();dropEditIndex=-1;renderDrops()});
 host.querySelectorAll('[data-db-drop]').forEach(input=>{
  input.addEventListener('input',collect);
  if(input.dataset.dbDrop.endsWith('.kind'))input.addEventListener('change',()=>{
   collect();
   const i=Number(input.dataset.dbDrop.split('.')[0]),item=activeLootRows()[i],catalog=runtime()?.lootCatalog?.();
   if(!item)return;
   item.key=(item.kind==='gear'?catalog?.gear:catalog?.materials)?.[0]?.key||'';
   item.quantity=1;storageBackup();renderDrops()
  })
 });
 host.querySelector('#dboAddLoot')?.addEventListener('click',()=>{
  collect();const rows=activeLootRows(),catalog=runtime()?.lootCatalog?.();
  if(rows.length>=6)return;
  rows.push({kind:'gear',key:catalog?.gear?.[0]?.key||'',chance:25,quantity:1});
  dropEditIndex=rows.length-1;dropSearch='';dropTier='all';storageBackup();renderDrops()
 });
 host.querySelectorAll('[data-db-remove-drop]').forEach(btn=>btn.addEventListener('click',()=>{
  collect();const removed=Number(btn.dataset.dbRemoveDrop);activeLootRows().splice(removed,1);
  if(dropEditIndex===removed)dropEditIndex=-1;else if(dropEditIndex>removed)dropEditIndex--;
  storageBackup();renderDrops()
 }));
 host.querySelector('#dboSave')?.addEventListener('click',()=>save(false));
 host.querySelector('#dboPublish')?.addEventListener('click',()=>{
  if(confirm('Publish these boss loot changes to the game?'))save(true)
 });
 host.querySelector('#dboDiscardNative')?.addEventListener('click',()=>{if(!confirm('Discard the unsaved changes for this boss?'))return;nativeDrops=JSON.parse(nativeBaseline);dropEditIndex=-1;announce('Edits discarded. Saved boss rewards were not changed.');renderDrops()});
 host.querySelector('#dboSaveNative')?.addEventListener('click',async()=>{
  collect();const target=bossChoices().find(o=>o.id===selectedDropBoss);
  if(!target||nativeSaving)return;
  const error=validateLootRows(nativeDrops);if(error){announce(error);return}
  nativeSaving=true;renderDrops();
  try{await window.CellboundBossDropTables.save(target.key,nativeDrops);nativeBaseline=JSON.stringify(nativeDrops);announce('Boss drop table saved. These optional drops now apply when '+target.title+' is defeated.')}
  catch(e){announce('Could not save boss drops: '+String(e?.message||e))}
  finally{nativeSaving=false;renderDrops()}
 })
}

function insertTemplate(raw,title=''){
 if(!owner()||busy||uploadBusy)return false;
 if(!project){project=fresh('quest');setBaseline()}
 if(project.steps.length>=30){announce('The adventure can contain up to 30 stages.');return false}
 if(!raw||!['room','fight','comic','minigame'].includes(raw.type))return false;
 const stage={...newStep(raw.type),...clone(raw),id:newStep(raw.type).id,title:String(title||raw.title||'New stage').slice(0,100)};
 project.steps.push(stage);stepIndex=project.steps.length-1;storageBackup();
 announce('Reusable '+raw.type+' added as Stage '+(stepIndex+1)+'. Save Cloud Draft when ready.');
 setTab('build');return true
}
function renderTemplates(){
 const host=$('#dboTemplates');if(!host)return;
 const rows=runtime()?.templates?.()||[];
 host.innerHTML='<section class="dbo-template-library"><h3>Minigame Template Library</h3><p>Templates are reusable across quests, dungeons and raids. Choose one while editing a minigame stage. Future mechanics can be added through the central <code>CellboundDesignedContent.registerMinigame</code> interface.</p><div class="dbo-public-grid">'+rows.map(t=>'<article><small>ACTIVE TEMPLATE</small><h4>'+esc(t.label)+'</h4><p>'+esc(t.description)+'</p></article>').join('')+'</div><p>New templates still require tested gameplay logic to be added to the codebase. This is not an executable AI-code uploader.</p></section>'
}
function toolApi(id){return window[plugins[id]]}
function setTab(id){
 if(!TOOLS.some(x=>x.id===id))return;
 if(id!==active&&!canLeave())return;
 if(id!==active&&(active==='build'||active==='drops'))collect();
 for(const [tab,mount] of Object.entries(mountIds)){const el=$('#'+mount);if(el)el.hidden=true;if(tab!==id)toolApi(tab)?.close?.()}
 active=id;
 const info=GUIDANCE[id],infoBox=$('#dboToolGuide');
 if(infoBox&&info){infoBox.querySelector('b').textContent=info.title;infoBox.querySelector('span').textContent=info.detail}
 const panel=$('#dboWorkbench'),library=$('#dboTemplates'),drops=$('#dboDrops'),catalog=$('#dboCatalog');if(panel)panel.hidden=id!=='build';if(library)library.hidden=id!=='templates';if(drops)drops.hidden=id!=='drops';if(catalog)catalog.hidden=id!=='items';
 document.querySelectorAll('[data-dbo-tool]').forEach(el=>{el.classList.toggle('active',el.dataset.dboTool===id);el.setAttribute('aria-selected',el.dataset.dboTool===id?'true':'false')});
 document.querySelectorAll('[data-dbo-go]').forEach(el=>el.classList.toggle('active',el.dataset.dboGo===id));
 if(['generator','models','templates'].includes(id)){const more=$('.dbo-more');if(more)more.open=true;moreOpen=true}
 if(id==='build')renderBuilder();
 else if(id==='drops')renderDrops();
 else if(id==='items')window.CellboundItemCatalog?.render?.();
 else if(id==='templates')renderTemplates();
 else{const mount=$('#'+mountIds[id]);if(mount)mount.hidden=false;toolApi(id)?.open?.()}
}
function render(){
 const root=$('#designBoothMount');if(!root||!opened||!owner())return;
 const advanced=['generator','models','templates'];
 const tab=t=>'<button type="button" role="tab" data-dbo-tool="'+t.id+'" aria-selected="'+(active===t.id?'true':'false')+'" class="'+(active===t.id?'active':'')+'"><b>'+t.label+'</b><small>'+t.sub+'</small></button>';
 root.innerHTML='<section class="dbo-shell"><header class="dbo-master-head"><div><small>CELLBOUND · CREATIVE WORKSPACE</small><h2>Design Booth</h2><p>Build new Cellbound adventures, test ideas, manage rewards and refine existing scenes.</p></div><button id="dboClose" type="button">CLOSE ×</button></header>'+
 '<section class="dbo-quickstart" aria-label="Choose a task"><div><h3>What do you want to do?</h3><p>Choose a job. Adventures require Publish; existing-boss drops take effect when you press Save Boss Drops.</p></div><div class="dbo-quick-actions">'+
 [['library','Create game content'],['build','Build an adventure'],['drops','Edit boss loot'],['items','Find an item'],['comics','Edit comic art'],['rooms','Edit dungeon rooms']].map(([id,label])=>'<button type="button" data-dbo-go="'+id+'" class="'+(active===id?'active':'')+'">'+label+' →</button>').join('')+'</div></section>'+
 '<nav class="dbo-tabs" role="tablist" aria-label="Design Booth tools">'+TOOLS.filter(t=>!advanced.includes(t.id)).map(tab).join('')+'</nav>'+
 '<details class="dbo-more" '+(moreOpen||advanced.includes(active)?'open':'')+'><summary>More tools · Character fit, dungeon planner & minigame templates</summary><nav class="dbo-tabs dbo-tabs-more" role="tablist" aria-label="Advanced tools">'+TOOLS.filter(t=>advanced.includes(t.id)).map(tab).join('')+'</nav></details>'+
 '<details class="dbo-help"><summary>New here? See the four-step workflow</summary><ol><li>Pick a task, or create a new quest, dungeon or raid.</li><li>Add stages, background artwork and boss drops. Use the checklist to find missing details.</li><li>Save Cloud Draft and use Test From Stage to check your work without changing the live game.</li><li>Press Publish only when everything is ready. Existing published content stays unchanged until then.</li></ol><p>Local backups are for recovery on this device; only a cloud-saved draft is available on another device.</p></details>'+
 '<aside id="dboToolGuide" class="dbo-tool-guide" role="note"><b></b><span></span></aside><div id="dboWorkbench"></div><div id="dboLibrary" hidden></div><div id="dboDrops" hidden></div><div id="dboCatalog" hidden></div><div id="dboTemplates" hidden></div>'+
 '<div id="dungeonGeneratorMount" class="dungeon-generator-mount" hidden></div><div id="characterFitViewerMount" class="character-fit-viewer-mount" hidden></div><div id="roomEditorMount" class="room-editor-mount" hidden></div><div id="comicSceneEditorMount" class="comic-scene-editor-mount" hidden></div></section>';
 root.querySelector('#dboClose').onclick=close;
 root.querySelectorAll('[data-dbo-tool],[data-dbo-go]').forEach(btn=>btn.onclick=()=>setTab(btn.dataset.dboTool||btn.dataset.dboGo));
 root.querySelector('.dbo-more')?.addEventListener('toggle',e=>{moreOpen=e.target.open});
 setTab(active)
}
async function open(){
 if(!owner())return;
 const root=$('#designBoothMount');if(!root)return;
 opened=true;root.hidden=false;
 if(!project){restoreBackup();if(!project){project=fresh('quest');setBaseline()}}
 render();
 try{await Promise.all([fetchRecords(),window.CellboundBossDropTables?.refresh?.(true)]);if(project.id){const r=records.find(x=>x.id===project.id);if(r&&(!lastLocal||r.updated_at!==cloudUpdatedAt)){loadRecord(r);return}}if(!lastLocal&&records.length)loadRecord(records[0]);else render()}catch(e){announce('Cloud project list unavailable: '+String(e?.message||e))}
 root.scrollIntoView?.({behavior:'smooth',block:'start'})
}
function close({force=false}={}){
 if(!force&&!canLeave())return;
 for(const name of Object.keys(plugins))toolApi(name)?.close?.();
 if(active==='build'||active==='drops')collect();
 opened=false;const root=$('#designBoothMount');if(root){root.hidden=true;root.innerHTML=''}
}
function access(){
 const entry=$('#designBoothEntry');if(entry)entry.hidden=!owner();
 if(!owner())close({force:true})
}
function init(){
 if(initDone)return;initDone=true;
 const entry=$('#designBoothEntry');entry?.querySelector('#openDesignBooth')?.addEventListener('click',open);
 window.addEventListener('cellbound:admin-status',access);
 window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='admin')access()});
 access()
}
window.CellboundDesignBooth={open,close,setTab,insertTemplate,validate,save,current:()=>clone(project||{}),isOwner:owner};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init()
})();