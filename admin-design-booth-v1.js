(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clone=x=>JSON.parse(JSON.stringify(x));
const owner=()=>Boolean(window.CellboundAdmin?.isAdmin)&&String(window.CellboundAdmin?.role||'').toLowerCase()==='owner';
const db=()=>window.CellboundGame?.getSupabase?.();
const runtime=()=>window.CellboundDesignedContent;
const STORE='cellbound-design-booth-workspace-v1';
const TOOLS=[
 {id:'build',label:'Adventure Builder',sub:'Quest · dungeon · raid'},
 {id:'comics',label:'Comic Art',sub:'Existing story scenes'},
 {id:'rooms',label:'Room Layouts',sub:'Existing dungeons & raid'},
 {id:'generator',label:'Dungeon Planner',sub:'Legacy advanced generator'},
 {id:'models',label:'Character Models',sub:'Equipment fit & visual QA'},
 {id:'templates',label:'Minigame Library',sub:'Reusable mechanics'}
];
const plugins={comics:'CellboundComicSceneEditor',rooms:'CellboundRoomEditor',generator:'CellboundDungeonGenerator',models:'CellboundCharacterFitViewer'};
const mountIds={comics:'comicSceneEditorMount',rooms:'roomEditorMount',generator:'dungeonGeneratorMount',models:'characterFitViewerMount'};
let opened=false,active='build',records=[],selectedId=null,project=null,stepIndex=0,busy=false,message='',lastLocal='',initDone=false;
function announce(s){message=s;const slot=$('#dboMessage');if(slot)slot.textContent=s}
function newStep(type='room'){
 return{id:'step-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),type,title:type==='comic'?'Story Scene':type==='fight'?'Encounter':type==='minigame'?'Minigame':'New Room',text:'',artPath:'',
  panels:type==='comic'?[{title:'Panel 1',text:'',artPath:''}]:[],enemies:'Enemy',enemyHealth:750,mechanic:'none',
  template:'choice',prompt:'',choices:['Left','Centre','Right'],answer:0,sequence:[0,1,2],drops:[]}
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
 try{localStorage.setItem(STORE,JSON.stringify({project,selectedId,stepIndex,updatedAt:Date.now()}));lastLocal=project.slug}catch(e){console.warn('Design Booth local backup failed',e)}
}
function restoreBackup(){
 try{const v=JSON.parse(localStorage.getItem(STORE)||'null');if(v?.project&&Array.isArray(v.project.steps)){project=v.project;selectedId=v.selectedId||null;stepIndex=Math.min(Number(v.stepIndex)||0,Math.max(0,project.steps.length-1));lastLocal=project.slug;return true}}catch{}
 return false
}
function loadRecord(r){
 const b=r.draft_blueprint&&Array.isArray(r.draft_blueprint.steps)?r.draft_blueprint:r.blueprint;
 project={...clone(b),id:r.id,slug:r.slug,title:b.title||r.title,content_type:b.content_type||r.content_type,status:r.status,version:r.version};
 selectedId=r.id;stepIndex=0;message='Editing '+r.title;storageBackup();render()
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
  if(s.type==='minigame'&&!runtime()?.templates().some(t=>t.id===s.template))errors.push(label+': unregistered minigame template '+s.template);
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
 if(!owner()||busy||!project)return;
 collect();const problems=validate();
 if(publish&&problems.length){announce('Cannot publish: '+problems[0]+' ('+problems.length+' issues)');render();return}
 busy=true;announce(publish?'Publishing adventure…':'Saving draft to Cellbound…');
 const b=clean(),title=String(project.title||'Untitled').trim();
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
  storageBackup();
  if(publish){window.dispatchEvent(new CustomEvent('cellbound:design-published'));announce('PUBLISHED · players can now start this '+project.content_type+' in their game tab.')}
  else announce('DRAFT SAVED · published players still see the previous version, if any.');
 }catch(e){announce('Save failed: '+String(e?.message||e))}
 finally{busy=false;render()}
}
async function remove(){
 if(!owner()||!project?.id||busy||!confirm('Delete this design from Cellbound? A published adventure will disappear from player lists.'))return;
 busy=true;
 try{
  const {error}=await db().from('cellbound_design_blueprints').delete().eq('id',project.id);if(error)throw error;
  await fetchRecords();project=fresh();selectedId=null;stepIndex=0;storageBackup();window.dispatchEvent(new CustomEvent('cellbound:design-published'));announce('Design deleted.');render()
 }catch(e){announce(String(e?.message||e))}
 finally{busy=false}
}
async function upload(stepId,panelIndex,file){
 if(!file||!owner()||!project)return;
 if(!['image/webp','image/jpeg','image/png','image/avif'].includes(file.type)){announce('Use WebP, PNG, JPEG or AVIF.');return}
 if(file.size>10*1024*1024){announce('Image must be at most 10 MB.');return}
 const target=project.steps.find(s=>s.id===stepId);
 if(!target)return;
 const ext={'image/webp':'webp','image/png':'png','image/jpeg':'jpg','image/avif':'avif'}[file.type];
 const path=project.slug+'/'+target.id+'/'+(panelIndex===null?'stage':'panel-'+panelIndex)+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+ext;
 announce('Uploading '+file.name+'…');
 try{
  const {error}=await db().storage.from('cellbound-design-art').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'31536000'});
  if(error)throw error;
  if(panelIndex===null)target.artPath=path;else if(target.panels?.[panelIndex])target.panels[panelIndex].artPath=path;
  storageBackup();announce('Artwork uploaded to the design draft. Publish the adventure to make it playable for everyone.');render()
 }catch(e){announce('Artwork upload failed: '+String(e?.message||e))}
}
function collect(){
 if(active!=='build'||!project)return;
 const form=$('#dboFields');if(!form)return;
 for(const field of form.querySelectorAll('[data-db-field]')){
  const key=field.dataset.dbField,value=field.value;
  if(key==='title'||key==='summary'||key==='content_type'||key==='level'){project[key]=key==='level'?Math.max(1,Math.min(75,Number(value)||1)):value}
  else if(key.startsWith('step.')){
   const s=project.steps[stepIndex];if(!s)continue;
   const sub=key.slice(5);
   if(sub==='choices')s.choices=value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,5);
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
  const s=project.steps[stepIndex],parts=input.dataset.dbDrop.split('.'),i=Number(parts[0]),prop=parts[1];
  if(s?.drops?.[i])s.drops[i][prop]=['chance','quantity'].includes(prop)?Number(input.value)||0:input.value
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
 return rows.map(it=>'<option value="'+esc(it.key)+'" '+(selected===it.key?'selected':'')+'>'+esc(kind==='gear'?'T'+it.tier+' · '+it.klass+' · '+it.name:it.name+' · '+it.rarity)+'</option>').join('')
}
function lootEditor(step){
 const items=Array.isArray(step.drops)?step.drops:[];
 const raid=project?.content_type==='raid';
 return '<section class="dbo-boss-loot"><header><div><small>INDIVIDUAL BOSS REWARDS</small><h4>Boss Drop Table</h4><p>Each row rolls independently when this encounter is defeated. Configure up to two gear rolls totalling 100% chance. Rewards go directly to the Guild Bank and appear in the end-of-run summary.</p></div><span>'+items.length+' / 6 DROPS</span></header>'+
 (raid?'<p class="dbo-loot-notice">Raid reward delivery is disabled in prototype raids. You may plan drop tables here, but they will not award gear until the multiplayer raid reward system is connected.</p>':'')+
 (items.length?'<div class="dbo-drop-list">'+items.map((drop,i)=>{
  const kind=drop.kind==='material'?'material':'gear';
  return '<div class="dbo-drop-row" data-db-drop-row="'+i+'"><div class="dbo-drop-row-top"><b>DROP '+(i+1)+'</b><button type="button" data-db-remove-drop="'+i+'">REMOVE</button></div><div class="dbo-drop-grid">'+
  '<label>REWARD TYPE<select data-db-drop="'+i+'.kind"><option value="gear" '+(kind==='gear'?'selected':'')+'>Equipment</option><option value="material" '+(kind==='material'?'selected':'')+'>Profession reagent</option></select></label>'+
  '<label>ITEM<select data-db-drop="'+i+'.key">'+lootDropOptions(kind,drop.key)+'</select></label>'+
  '<label>DROP CHANCE (%)<input type="number" min="1" max="100" step="1" inputmode="numeric" data-db-drop="'+i+'.chance" value="'+esc(drop.chance??25)+'"></label>'+
  '<label>QUANTITY<input type="number" min="1" max="'+(kind==='gear'?1:5)+'" step="1" inputmode="numeric" data-db-drop="'+i+'.quantity" value="'+esc(kind==='gear'?1:(drop.quantity||1))+'" '+(kind==='gear'?'disabled':'')+'></label></div></div>'
 }).join('')+'</div>':'<div class="dbo-no-drops">No drops configured. This boss currently awards no items.</div>')+
 '<button type="button" data-db-add-drop '+(items.length>=6?'disabled':'')+'>+ ADD BOSS DROP</button>'+
 '<p class="dbo-loot-footnote">Available equipment: approved Tier 1–2 gear. High-tier, raid-exclusive gear and endgame reagents remain restricted. No bonus equipment is automatically granted for completing a custom dungeon.</p></section>'
}

function stageFields(s){
 let extra='';
 if(s.type==='comic'){
  extra='<section class="dbo-panel-list"><h4>Comic panels · '+s.panels.length+'/6</h4>'+s.panels.map((p,i)=>'<article class="dbo-comic-panel"><header><b>Panel '+(i+1)+'</b><button type="button" data-db-remove-panel="'+i+'">REMOVE</button></header>'+field('Panel heading','panel.'+i+'.title',p.title)+field('Caption / dialogue','panel.'+i+'.text',p.text,{kind:'textarea'})+imageControl(s,i)+'</article>').join('')+
  '<button type="button" data-db-add-panel '+(s.panels.length>=6?'disabled':'')+'>+ ADD COMIC PANEL</button></section>'
 }
 if(s.type==='fight')extra='<div class="dbo-form-grid">'+field('Enemies · comma-separated','step.enemies',s.enemies,{kind:'textarea'})+field('Enemy health','step.enemyHealth',s.enemyHealth,{kind:'number'})+field('Combat mechanic','step.mechanic',s.mechanic,{kind:'select',opts:['none','circle','line','interrupt','adds']})+'</div>'+imageControl(s)+lootEditor(s);
 if(s.type==='room')extra=imageControl(s);
 if(s.type==='minigame')extra='<div class="dbo-form-grid">'+field('Template','step.template',s.template,{kind:'select',opts:(runtime()?.templates?.()||[]).map(t=>({value:t.id,label:t.label}))})+field('Puzzle instruction','step.prompt',s.prompt,{kind:'textarea'})+field('Choices (one per line)','step.choices',s.choices.join('\n'),{kind:'textarea'})+field('Correct choice index · starts at 0','step.answer',s.answer,{kind:'number'})+field('Sequence indices · comma-separated','step.sequence',s.sequence.join(','))+'</div>'+imageControl(s);
 return'<div class="dbo-stage-fields">'+field('Stage title','step.title',s.title)+field('Stage type','step.type',s.type,{kind:'select',opts:[{value:'comic',label:'Comic Strip'},{value:'room',label:'Room / Transition'},{value:'fight',label:'Combat Encounter'},{value:'minigame',label:'Minigame'}]})+field('Description / narration','step.text',s.text,{kind:'textarea'})+extra+'</div>'
}
function renderBuilder(){
 const host=$('#dboWorkbench');if(!host||!project)return;
 const s=project.steps[stepIndex]||null,problems=validate(),selected=records.find(r=>r.id===project.id);
 host.innerHTML='<div class="dbo-builder-top"><div><small>DESIGN WORKSPACE · CLOUD DRAFTS</small><h3>'+esc(project.title)+'</h3><p>'+esc(project.status==='published'?'Published v'+project.version+' · edit without changing the version players see until Publish is pressed':'Unpublished draft · only you can see it')+'</p></div><div class="dbo-buttons"><button type="button" id="dboNewQuest">+ QUEST</button><button type="button" id="dboNewDungeon">+ DUNGEON</button><button type="button" id="dboNewRaid">+ RAID</button></div></div>'+
 '<div class="dbo-editor-layout"><aside class="dbo-projects"><h4>PROJECTS <span>'+records.length+'</span></h4><div class="dbo-project-list">'+records.map(r=>'<button type="button" data-db-project="'+esc(r.id)+'" class="'+(r.id===project.id?'active':'')+'"><small>'+esc(r.content_type.toUpperCase())+' · '+esc(r.status)+'</small><b>'+esc(r.title)+'</b></button>').join('')+'</div><h4>ADVENTURE STAGES <span>'+project.steps.length+'/30</span></h4>'+
 '<div class="dbo-stage-list">'+project.steps.map((st,i)=>'<button type="button" data-db-step="'+i+'" class="'+(i===stepIndex?'active':'')+'"><i>'+String(i+1).padStart(2,'0')+'</i><span><b>'+esc(st.title)+'</b><small>'+esc(st.type)+'</small></span></button>').join('')+'</div>'+
 '<div class="dbo-add"><select id="dboAddType"><option value="comic">Comic strip</option><option value="room">Room / transition</option><option value="fight">Fight encounter</option><option value="minigame">Minigame</option></select><button type="button" id="dboAddStep" '+(project.steps.length>=30?'disabled':'')+'>+ ADD STAGE</button></div></aside>'+
 '<main id="dboFields" class="dbo-project-editor"><div class="dbo-form-grid">'+field('Adventure name','title',project.title)+field('Minimum party level','level',project.level,{kind:'number'})+field('Category','content_type',project.content_type,{kind:'select',opts:['quest','dungeon','raid']})+field('Short description','summary',project.summary,{kind:'textarea'})+'</div>'+
 (s?'<div class="dbo-stage-editor-header"><div><small>STAGE '+(stepIndex+1)+' OF '+project.steps.length+'</small><h3>'+esc(s.title)+'</h3></div><div class="dbo-stage-actions"><button data-db-move="-1" '+(stepIndex===0?'disabled':'')+'>↑</button><button data-db-move="1" '+(stepIndex===project.steps.length-1?'disabled':'')+'>↓</button><button data-db-remove-stage>REMOVE</button></div></div>'+stageFields(s):'<div class="dbo-empty">Add a stage to start designing.</div>')+
 '<div class="dbo-review"><h4>Publication check</h4><p>'+(!problems.length?'All required scenes and artwork are ready to publish.':problems.slice(0,6).map(esc).join(' · '))+'</p><small>Configured boss drops roll on victory and are sent immediately to the Guild Bank. Raid prototypes and owner tests award no loot. The existing dungeon reward tables remain unchanged.</small></div><div class="dbo-footer"><button id="dboSave" '+(busy?'disabled':'')+'>SAVE CLOUD DRAFT</button><button id="dboTest" '+(busy?'disabled':'')+'>▶ TEST FROM STAGE</button><button class="primary" id="dboPublish" '+(busy||problems.length?'disabled':'')+'>PUBLISH TO GAME</button>'+(project.id?'<button id="dboDelete">DELETE</button>':'')+'</div><p id="dboMessage" role="status">'+esc(message||'Changes back up automatically on this iPad; use Save Cloud Draft to sync across devices.')+'</p></main></div>';
 bindBuilder()
}
function bindBuilder(){
 const host=$('#dboWorkbench');if(!host)return;
 host.querySelectorAll('[data-db-field]').forEach(el=>{
  el.addEventListener('input',()=>{collect();if(el.dataset.dbField==='title')announce('Title updated. Save when ready.');});
  if(el.dataset.dbField==='step.type'||el.dataset.dbField==='content_type')el.addEventListener('change',()=>{collect();renderBuilder()})
 });
 host.querySelectorAll('[data-db-project]').forEach(btn=>btn.onclick=()=>{collect();const rec=records.find(r=>r.id===btn.dataset.dbProject);if(rec)loadRecord(rec)});
 host.querySelectorAll('[data-db-step]').forEach(btn=>btn.onclick=()=>{collect();stepIndex=Number(btn.dataset.dbStep);renderBuilder()});
 for(const type of ['quest','dungeon','raid'])host.querySelector('#dboNew'+type[0].toUpperCase()+type.slice(1))?.addEventListener('click',()=>{if(!confirm('Create a new '+type+'? The current work is backed up locally.'))return;collect();project=fresh(type);selectedId=null;stepIndex=0;storageBackup();renderBuilder()});
 host.querySelector('#dboAddStep')?.addEventListener('click',()=>{collect();project.steps.push(newStep($('#dboAddType').value));stepIndex=project.steps.length-1;storageBackup();renderBuilder()});
 host.querySelectorAll('[data-db-move]').forEach(btn=>btn.onclick=()=>{collect();const to=stepIndex+Number(btn.dataset.dbMove);if(to<0||to>=project.steps.length)return;[project.steps[stepIndex],project.steps[to]]=[project.steps[to],project.steps[stepIndex]];stepIndex=to;storageBackup();renderBuilder()});
 host.querySelector('[data-db-remove-stage]')?.addEventListener('click',()=>{if(!confirm('Remove this stage?'))return;collect();project.steps.splice(stepIndex,1);stepIndex=Math.max(0,Math.min(stepIndex,project.steps.length-1));storageBackup();renderBuilder()});
 host.querySelector('[data-db-add-panel]')?.addEventListener('click',()=>{collect();const s=project.steps[stepIndex];if(s.panels.length>=6)return;s.panels.push({title:'Panel '+(s.panels.length+1),text:'',artPath:''});storageBackup();renderBuilder()});
 host.querySelectorAll('[data-db-remove-panel]').forEach(btn=>btn.onclick=()=>{collect();const s=project.steps[stepIndex];s.panels.splice(Number(btn.dataset.dbRemovePanel),1);storageBackup();renderBuilder()});
 host.querySelectorAll('[data-db-upload]').forEach(el=>el.addEventListener('change',e=>{collect();upload(el.dataset.dbUpload,el.dataset.dbPanel==='stage'?null:Number(el.dataset.dbPanel),e.target.files?.[0])}));
 host.querySelectorAll('[data-db-drop]').forEach(input=>{
  input.addEventListener('input',()=>collect());
  if(input.dataset.dbDrop.endsWith('.kind'))input.addEventListener('change',()=>{
   collect();const s=project.steps[stepIndex],i=Number(input.dataset.dbDrop.split('.')[0]),drop=s.drops[i];
   const pool=runtime()?.lootCatalog?.()||{gear:[],materials:[]};
   drop.key=(drop.kind==='gear'?pool.gear:pool.materials)[0]?.key||'';
   drop.quantity=1;storageBackup();renderBuilder()
  });
 });
 host.querySelector('[data-db-add-drop]')?.addEventListener('click',()=>{
  collect();const s=project.steps[stepIndex],pool=runtime()?.lootCatalog?.();
  if(!s||s.type!=='fight'||(s.drops||[]).length>=6)return;
  s.drops=Array.isArray(s.drops)?s.drops:[];
  s.drops.push({kind:'gear',key:pool?.gear?.[0]?.key||'',chance:25,quantity:1});
  storageBackup();renderBuilder()
 });
 host.querySelectorAll('[data-db-remove-drop]').forEach(btn=>btn.addEventListener('click',()=>{
  collect();const s=project.steps[stepIndex];if(!s)return;
  s.drops.splice(Number(btn.dataset.dbRemoveDrop),1);storageBackup();renderBuilder()
 }));

 host.querySelector('#dboSave')?.addEventListener('click',()=>save(false));
 host.querySelector('#dboPublish')?.addEventListener('click',()=>{if(confirm('Publish this '+project.content_type+' to the game for all players on staging?'))save(true)});
 host.querySelector('#dboDelete')?.addEventListener('click',remove);
 host.querySelector('#dboTest')?.addEventListener('click',()=>{collect();const preview={title:project.title,content_type:project.content_type,blueprint:{...clean(),steps:clean().steps.slice(stepIndex)}};runtime()?.play?.('local',preview)});
}
function renderTemplates(){
 const host=$('#dboTemplates');if(!host)return;
 const rows=runtime()?.templates?.()||[];
 host.innerHTML='<section class="dbo-template-library"><h3>Minigame Template Library</h3><p>Templates are reusable across quests, dungeons and raids. Choose one while editing a minigame stage. Future mechanics can be added through the central <code>CellboundDesignedContent.registerMinigame</code> interface.</p><div class="dbo-public-grid">'+rows.map(t=>'<article><small>ACTIVE TEMPLATE</small><h4>'+esc(t.label)+'</h4><p>'+esc(t.description)+'</p></article>').join('')+'</div><p>New templates still require tested gameplay logic to be added to the codebase. This is not an executable AI-code uploader.</p></section>'
}
function toolApi(id){return window[plugins[id]]}
function setTab(id){
 if(!TOOLS.some(x=>x.id===id))return;
 if(id!==active&&active==='build')collect();
 for(const [tab,mount] of Object.entries(mountIds)){const el=$('#'+mount);if(el)el.hidden=true;if(tab!==id)toolApi(tab)?.close?.()}
 active=id;
 const panel=$('#dboWorkbench'),library=$('#dboTemplates');if(panel)panel.hidden=id!=='build';if(library)library.hidden=id!=='templates';
 document.querySelectorAll('[data-dbo-tool]').forEach(el=>{el.classList.toggle('active',el.dataset.dboTool===id);el.setAttribute('aria-selected',el.dataset.dboTool===id?'true':'false')});
 if(id==='build')renderBuilder();
 else if(id==='templates')renderTemplates();
 else{const mount=$('#'+mountIds[id]);if(mount)mount.hidden=false;toolApi(id)?.open?.()}
}
function render(){
 const root=$('#designBoothMount');if(!root||!opened||!owner())return;
 root.innerHTML='<section class="dbo-shell"><header class="dbo-master-head"><div><small>CELLBOUND · OWNER CREATIVE TOOLS</small><h2>Design Booth</h2><p>Build adventures stage by stage, inspect the existing game, and publish artwork and playable content from one place.</p></div><button id="dboClose" type="button">CLOSE DESIGN BOOTH ×</button></header>'+
 '<nav class="dbo-tabs" role="tablist">'+TOOLS.map(t=>'<button type="button" role="tab" data-dbo-tool="'+t.id+'" aria-selected="'+(active===t.id?'true':'false')+'" class="'+(active===t.id?'active':'')+'"><b>'+t.label+'</b><small>'+t.sub+'</small></button>').join('')+'</nav>'+
 '<div id="dboWorkbench"></div><div id="dboTemplates" hidden></div>'+
 '<div id="dungeonGeneratorMount" class="dungeon-generator-mount" hidden></div><div id="characterFitViewerMount" class="character-fit-viewer-mount" hidden></div><div id="roomEditorMount" class="room-editor-mount" hidden></div><div id="comicSceneEditorMount" class="comic-scene-editor-mount" hidden></div></section>';
 root.querySelector('#dboClose').onclick=close;
 root.querySelectorAll('[data-dbo-tool]').forEach(btn=>btn.onclick=()=>setTab(btn.dataset.dboTool));
 setTab(active)
}
async function open(){
 if(!owner())return;
 const root=$('#designBoothMount');if(!root)return;
 opened=true;root.hidden=false;
 if(!project){restoreBackup();if(!project)project=fresh('quest')}
 render();
 try{await fetchRecords();if(project.id){const r=records.find(x=>x.id===project.id);if(r&&!lastLocal){loadRecord(r);return}}if(!lastLocal&&records.length)loadRecord(records[0]);else render()}catch(e){announce('Cloud project list unavailable: '+String(e?.message||e))}
 root.scrollIntoView?.({behavior:'smooth',block:'start'})
}
function close(){
 for(const name of Object.keys(plugins))toolApi(name)?.close?.();
 if(active==='build')collect();
 opened=false;const root=$('#designBoothMount');if(root){root.hidden=true;root.innerHTML=''}
}
function access(){
 const entry=$('#designBoothEntry');if(entry)entry.hidden=!owner();
 if(!owner())close()
}
function init(){
 if(initDone)return;initDone=true;
 const entry=$('#designBoothEntry');entry?.querySelector('#openDesignBooth')?.addEventListener('click',open);
 window.addEventListener('cellbound:admin-status',access);
 window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='admin')access()});
 access()
}
window.CellboundDesignBooth={open,close,setTab,validate,save,current:()=>clone(project||{}),isOwner:owner};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init()
})();