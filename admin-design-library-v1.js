(()=>{
'use strict';
/* Reusable, owner-authored content templates. Templates are persisted to the
   same Supabase project as adventures. Only published records affect players. */
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x));
const owner=()=>Boolean(window.CellboundAdmin?.isAdmin)&&String(window.CellboundAdmin?.role||'').toLowerCase()==='owner';
const db=()=>window.CellboundGame?.getSupabase?.();
const table='cellbound_design_templates',KEY='cellbound-design-library-draft-v1';
const KINDS=[['room','Room / transition'],['fight','Boss or encounter'],['comic','Comic scene'],['minigame','Puzzle / minigame'],['item','Equipment item']];
let rows=[],kind='room',selected=null,draft=null,baseline='',busy=false,message='',loading=false,listFilter='all';
const typeName=k=>KINDS.find(x=>x[0]===k)?.[1]||k;
const changed=()=>draft&&JSON.stringify(draft)!==baseline;
const slug=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
const imageUrl=path=>path&&db()?.storage?.from('cellbound-design-art').getPublicUrl(path)?.data?.publicUrl||'';
function fresh(k){
 const title={room:'Untitled Room',fight:'Untitled Boss',comic:'Untitled Comic',minigame:'Untitled Puzzle',item:'Untitled Item'}[k]||'Untitled';
 const data=k==='item'?{baseItemId:'',description:''}:{
  type:k,title,text:'',artPath:'',enemies:'Enemy',enemyHealth:750,mechanic:'none',
  panels:k==='comic'?[{title:'Panel 1',text:'',artPath:''}]:[],
  template:'choice',prompt:'',choices:['Left','Centre','Right'],answer:0,sequence:[0,1,2],drops:[]};
 return {id:null,slug:'studio-'+k+'-'+slug(),kind:k,title,status:'draft',version:1,data};
}
function persist(){
 if(!draft||!owner())return;
 try{localStorage.setItem(KEY,JSON.stringify({draft,selectedId:selected?.id||null,baseline,updatedAt:Date.now()}))}catch{}
 const el=$('#dboLibraryDirty');
 if(el)el.textContent=changed()?'● Unsaved on this device':draft.id?'✓ Cloud draft up to date':'○ Not saved to cloud';
}
function clearLocal(){try{localStorage.removeItem(KEY)}catch{}}
function loadLocal(){
 try{const v=JSON.parse(localStorage.getItem(KEY)||'null');
  if(v?.draft&&KINDS.some(x=>x[0]===v.draft.kind)){draft=v.draft;baseline=v.baseline||'';kind=draft.kind;selected=null;return true}
 }catch{}return false
}
function newDraft(k,{copy=false}={}){
 if(busy)return;
 if(draft&&changed()&&!confirm('Switch projects? Unsaved changes to this template only exist on this device. Press Cancel to save first.'))return;
 const old=copy?clone(draft):null;
 draft=fresh(k);kind=k;selected=null;
 if(old){
  draft.title=('Copy of '+old.title.replace(/^Copy of /,'')).slice(0,120);
  draft.data=old.data;
 }
 baseline=JSON.stringify(draft);persist();render()
}
function openRecord(record){
 if(busy)return;
 if(draft&&changed()&&!confirm('Open a different template? Unsaved changes will be lost unless saved to cloud.'))return;
 selected=record;kind=record.kind;
 draft={id:record.id,slug:record.slug,kind,title:String(record.draft_blueprint?.title||record.title),status:record.status,version:record.version,
  data:clone(record.draft_blueprint&&Object.keys(record.draft_blueprint).length?record.draft_blueprint:record.blueprint||{}),cloudUpdatedAt:record.updated_at||null};
 baseline=JSON.stringify(draft);persist();render()
}
async function refresh(){
 if(!owner()||!db())return false;
 loading=true;
 try{
  const {data,error}=await db().from(table).select('id,slug,kind,title,status,version,blueprint,draft_blueprint,updated_at').order('updated_at',{ascending:false});
  if(error)throw error;rows=data||[];
  if(draft?.id){
   const match=rows.find(x=>x.id===draft.id);
   if(match){
    if(!selected&&changed()&&match.updated_at&&match.updated_at!==draft.cloudUpdatedAt)message='Recovered unsaved device edits. Review changes before overwriting cloud content.';
    selected=match;
   }
  }
  return true;
 }catch(e){message='Template cloud library unavailable: '+String(e.message||e);return false}
 finally{loading=false;render()}
}
function field(label,key,val,kindOf='text',opts=[]){
 const head='<span>'+esc(label)+'</span>';
 const data='data-lib-field="'+esc(key)+'"';
 if(kindOf==='textarea')return'<label class="dbo-field">'+head+'<textarea '+data+' rows="3">'+esc(val)+'</textarea></label>';
 if(kindOf==='select')return'<label class="dbo-field">'+head+'<select '+data+'>'+opts.map(([id,name])=>'<option value="'+esc(id)+'" '+(String(id)===String(val)?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label>';
 return'<label class="dbo-field">'+head+'<input '+data+' type="'+(kindOf==='number'?'number':'text')+'" '+(kindOf==='number'?'min="0" max="50000"':'')+' value="'+esc(val)+'"></label>'
}
function artEditor(index=null){
 const d=draft.data,entry=index===null?d:d.panels[index],path=entry?.artPath;
 return '<div class="dbo-image-control dbo-library-art">'+(imageUrl(path)?'<img src="'+esc(imageUrl(path))+'" alt="Scene artwork" draggable="false">':'<div class="dbo-art-missing">Upload the scene artwork</div>')+
  '<label>UPLOAD ARTWORK<input type="file" accept="image/png,image/webp,image/jpeg,image/avif" data-lib-upload="'+(index===null?'stage':index)+'"></label>'+
  '<small>WebP preferred · 10 MB maximum · scene art is kept with this template and can be reused in an adventure.</small></div>'
}
function gearOptions(){
 const gear=(window.CellboundGear?.items||[]).filter(x=>x.enabled&&x.dropEnabled&&x.tier<=2&&!x.raidExclusive&&!x.designedItem);
 return gear.map(x=>[x.itemId,'T'+x.tier+' · '+x.class+' · '+x.slot+' · '+x.name]);
}
function editorFields(){
 const d=draft.data||{};let extra='';
 if(kind==='item'){
  const options=[['','Select an existing balanced item as the starting point'],...gearOptions()];
  const base=(window.CellboundGear?.items||[]).find(x=>x.itemId===d.baseItemId);
  extra='<div class="dbo-form-grid">'+field('Equipment name','title',draft.title)+field('Base equipment · stats, class and tier','baseItemId',d.baseItemId,'select',options)+field('Item description / flavour text','description',d.description||'','textarea')+'</div>'+
   '<div class="dbo-native-default"><small>BALANCED GAME ITEM</small><p>'+(base?'Tier '+base.tier+' · '+esc(base.class)+' · '+esc(base.slot)+' · item level '+base.itemLevel+'. Inherits tested stats and artwork fit from '+esc(base.name)+'.': 'Choose an existing equipment template. This tool does not allow arbitrary stats or Tier 5 raid equipment.')+'</p></div>'+
   '<p class="dbo-loot-notice">On Publish, this named variant becomes usable in the item catalogue and approved T1–T2 boss drop picker. Existing artwork, class and combat balance are inherited from the base equipment.</p>';
 }else{
  extra='<div class="dbo-form-grid">'+field('Template name','title',draft.title)+field('Narration / description','text',d.text||'','textarea')+'</div>';
  if(kind==='room')extra+='<p>Use this as a reusable playable room or transition in any new adventure.</p>'+artEditor();
  if(kind==='fight')extra+='<div class="dbo-form-grid">'+field('Enemy names (comma-separated)','enemies',d.enemies||'', 'textarea')+field('Enemy health','enemyHealth',d.enemyHealth||750,'number')+field('Combat mechanic','mechanic',d.mechanic||'none','select',[['none','None'],['circle','Ground burst'],['line','Sweeping attack'],['interrupt','Interruptible cast'],['adds','Reinforcements']])+'</div>'+artEditor()+
  '<p>Boss loot is managed centrally after inserting this encounter into an adventure. The shared combat engine is used automatically.</p>';
  if(kind==='comic')extra+='<h4>Comic panels · '+(d.panels||[]).length+'/6</h4>'+(d.panels||[]).map((p,i)=>'<article class="dbo-library-panel"><header><b>Panel '+(i+1)+'</b><button type="button" data-lib-remove-panel="'+i+'">REMOVE</button></header>'+field('Panel heading','panel.'+i+'.title',p.title)+field('Story text / caption','panel.'+i+'.text',p.text,'textarea')+artEditor(i)+'</article>').join('')+'<button id="dboLibraryAddPanel" type="button" '+(d.panels?.length>=6?'disabled':'')+'>+ ADD PANEL</button>';
  if(kind==='minigame')extra+='<div class="dbo-form-grid">'+field('Puzzle mechanic','template',d.template||'choice','select',(window.CellboundDesignedContent?.templates?.()||[]).map(x=>[x.id,x.label]))+field('Instructions','prompt',d.prompt||'','textarea')+field('Choices (one per line)','choices',(d.choices||[]).join('\n'),'textarea')+field('Correct choice (1 = first)','answerFriendly',(Number(d.answer)||0)+1,'number')+field('Correct sequence (e.g. 1, 3, 2)','sequenceFriendly',(d.sequence||[]).map(n=>Number(n)+1).join(', '))+'</div>'+artEditor();
 }
 return extra
}
function collect(){
 if(!draft)return;
 const form=$('#dboLibraryFields');if(!form)return;
 for(const input of form.querySelectorAll('[data-lib-field]')){
  const name=input.dataset.libField,value=input.value;
  if(name==='title'){draft.title=value;draft.data.title=value;continue}
  if(name.startsWith('panel.')){const [,i,p]=name.split('.');if(draft.data.panels?.[Number(i)])draft.data.panels[Number(i)][p]=value;continue}
  if(name==='choices')draft.data.choices=value.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,5);
  else if(name==='answerFriendly')draft.data.answer=Number(value)-1;
  else if(name==='sequenceFriendly')draft.data.sequence=value.split(/[,\s]+/).filter(Boolean).map(x=>Number(x)-1).slice(0,8);
  else if(name==='enemyHealth')draft.data[name]=Number(value);
  else draft.data[name]=value;
 }
 persist()
}
function validation(){
 if(!draft)return['Select or create a template.'];
 const issues=[],d=draft.data,t=draft.title.trim();
 if(t.length<3||t.length>120||/^Untitled (Room|Boss|Comic|Puzzle|Item)$/.test(t))issues.push('Give it a descriptive name of 3–120 characters.');
 if(kind==='item'){
  const base=gearOptions().some(x=>x[0]===d.baseItemId);
  if(!base)issues.push('Choose a valid balanced T1–T2 equipment template.');
  const existing=window.CellboundGear?.items?.find(x=>x.name?.toLowerCase()===t.toLowerCase()&&x.designedSlug!==draft.slug);
  if(existing)issues.push('An item with this name already exists.');
 }else{
  if(['fight','room'].includes(kind)&&!d.artPath)issues.push('Upload the scene background first.');
  if(kind==='fight'&&!String(d.enemies||'').trim())issues.push('Enter at least one enemy name.');
  if(kind==='fight'&&!(Number(d.enemyHealth)>0&&Number(d.enemyHealth)<=50000))issues.push('Enemy health must be between 1 and 50,000.');
  if(kind==='comic'&&(!d.panels?.length||d.panels.some(p=>!p.artPath)))issues.push('Upload artwork for every comic panel.');
  if(kind==='minigame'){
   if(!window.CellboundDesignedContent?.templates?.().some(x=>x.id===d.template))issues.push('Choose a working minigame template.');
   if(!Array.isArray(d.choices)||d.choices.length<2)issues.push('Enter at least two choices.');
   if(d.template==='choice'&&(!Number.isInteger(d.answer)||d.answer<0||d.answer>=d.choices.length))issues.push('Correct answer must match a choice.');
   if(d.template==='sequence'&&(!d.sequence?.length||d.sequence.some(i=>!Number.isInteger(i)||i<0||i>=d.choices.length)))issues.push('Correct sequence must use available choices.');
  }
 }
 return issues
}
function render(){
 const host=$('#dboLibrary');if(!host||host.hidden||!owner())return;
 if(!draft){draft=fresh(kind);baseline=JSON.stringify(draft)}
 const issues=validation(),asset=selected?.status==='published';
 host.innerHTML='<section class="dbo-library-shell"><header class="dbo-library-header"><div><small>NEW CONTENT · REUSABLE LIBRARY</small><h3>Content Creator</h3><p>Create once, reuse across new quests, dungeons and raids. Saving a draft never changes what players see.</p></div><button id="dboLibraryRefresh" type="button">REFRESH CLOUD ↻</button></header>'+
 '<div class="dbo-library-actions">'+KINDS.map(([id,name])=>'<button type="button" data-lib-new="'+id+'">+ '+esc(name)+'</button>').join('')+'</div>'+
 '<div class="dbo-editor-layout"><aside class="dbo-projects"><h4>CONTENT LIBRARY <span>'+rows.length+'</span></h4><label class="dbo-field"><span>Filter content</span><select id="dboLibraryFilter"><option value="all" '+(listFilter==='all'?'selected':'')+'>All types</option>'+KINDS.map(([id,name])=>'<option value="'+id+'" '+(listFilter===id?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label>'+
 '<div class="dbo-project-list">'+rows.filter(row=>listFilter==='all'||listFilter===row.kind).map(row=>'<button type="button" data-lib-select="'+esc(row.id)+'" class="'+(row.id===selected?.id?'active':'')+'"><small>'+esc(typeName(row.kind).toUpperCase())+' · '+esc(row.status)+'</small><b>'+esc(row.title)+'</b></button>').join('')+'</div></aside>'+
 '<main class="dbo-project-editor"><div class="dbo-library-state"><small>'+esc(typeName(kind).toUpperCase())+' · '+(asset?'PUBLISHED · draft changes will not affect players':'UNPUBLISHED')+'</small><h3>'+esc(draft.title)+'</h3><span id="dboLibraryDirty"></span></div>'+
 '<section id="dboLibraryFields">'+editorFields()+'</section>'+
 '<section class="dbo-review"><h4>'+(issues.length?issues.length+' thing'+(issues.length===1?'':'s')+' to finish':'Ready to publish')+'</h4>'+(issues.length?'<ol>'+issues.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>':'<p>All required fields are ready. Add it to an adventure to test the gameplay.</p>')+'</section>'+
 '<div class="dbo-footer"><button type="button" id="dboLibrarySave" '+(busy?'disabled':'')+'>SAVE CLOUD DRAFT</button><button type="button" id="dboLibraryPublish" '+(busy||issues.length?'disabled':'')+'>PUBLISH CONTENT</button>'+
 (kind!=='item'?'<button type="button" id="dboLibraryInsert">+ ADD TO ADVENTURE</button>':'<button type="button" id="dboLibraryCatalogue">VIEW ITEM CATALOGUE →</button>')+
 '<button type="button" id="dboLibraryDuplicate">COPY AS NEW</button>'+(selected?.id&&!asset?'<button type="button" id="dboLibraryDelete">DELETE DRAFT</button>':'')+'</div><p role="status" id="dboLibraryMessage">'+esc(message||'Create, save, reuse and publish without editing game files.')+'</p>'+
 '</main></div></section>';
 bind();persist()
}
function bind(){
 const root=$('#dboLibrary');if(!root)return;
 root.querySelectorAll('[data-lib-new]').forEach(btn=>btn.onclick=()=>newDraft(btn.dataset.libNew));
 root.querySelectorAll('[data-lib-select]').forEach(btn=>btn.onclick=()=>{const row=rows.find(x=>x.id===btn.dataset.libSelect);if(row)openRecord(row)});
 root.querySelector('#dboLibraryRefresh')?.addEventListener('click',refresh);
 root.querySelector('#dboLibraryFilter')?.addEventListener('change',e=>{listFilter=e.target.value;render()});
 root.querySelectorAll('[data-lib-field]').forEach(el=>{
  el.addEventListener('input',()=>{collect();const title=root.querySelector('.dbo-library-state h3');if(title)title.textContent=draft.title;const b=root.querySelector('#dboLibraryPublish');if(b)b.disabled=busy||validation().length>0});
  if(['baseItemId','template'].includes(el.dataset.libField))el.addEventListener('change',()=>{collect();render()});
 });
 root.querySelectorAll('[data-lib-upload]').forEach(el=>el.addEventListener('change',e=>upload(e.target.files?.[0],el.dataset.libUpload)));
 root.querySelector('#dboLibraryAddPanel')?.addEventListener('click',()=>{collect();draft.data.panels.push({title:'Panel '+(draft.data.panels.length+1),text:'',artPath:''});persist();render()});
 root.querySelectorAll('[data-lib-remove-panel]').forEach(btn=>btn.onclick=()=>{collect();draft.data.panels.splice(Number(btn.dataset.libRemovePanel),1);persist();render()});
 root.querySelector('#dboLibrarySave')?.addEventListener('click',()=>save(false));
 root.querySelector('#dboLibraryPublish')?.addEventListener('click',()=>{collect();if(confirm('Publish this '+typeName(kind).toLowerCase()+'? Published items can appear in boss drop pickers and published templates become reusable.'))save(true)});
 root.querySelector('#dboLibraryInsert')?.addEventListener('click',()=>{collect();insertIntoAdventure()});
 root.querySelector('#dboLibraryDuplicate')?.addEventListener('click',()=>{collect();newDraft(kind,{copy:true})});
 root.querySelector('#dboLibraryDelete')?.addEventListener('click',remove);
 root.querySelector('#dboLibraryCatalogue')?.addEventListener('click',()=>window.CellboundDesignBooth?.setTab?.('items'))
}
function insertIntoAdventure(){
 if(kind==='item')return;
 // Adding to a private adventure draft is safe even when artwork or puzzle details are unfinished.
 // Adventure Builder validates every stage before the adventure can be published.
 if(!window.CellboundDesignBooth?.insertTemplate){message='Adventure Builder is unavailable.';render();return}
 if(window.CellboundDesignBooth.insertTemplate(clone(draft.data),draft.title)){
  message='Added to the Adventure Builder as a new stage. Save its cloud draft to keep the change.';
 }
}
async function upload(file,target){
 if(!owner()||busy||!file||!draft)return;
 if(!['image/webp','image/jpeg','image/png','image/avif'].includes(file.type)||file.size>10*1024*1024){message='Choose a WebP, PNG, JPEG or AVIF up to 10 MB.';render();return}
 collect();busy=true;message='Uploading artwork…';
 try{
  const ext={'image/webp':'webp','image/png':'png','image/jpeg':'jpg','image/avif':'avif'}[file.type];
  const path='templates/'+draft.slug+'/'+(target==='stage'?'scene':'panel-'+target)+'-'+slug()+'.'+ext;
  const {error}=await db().storage.from('cellbound-design-art').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'31536000'});
  if(error)throw error;
  if(target==='stage')draft.data.artPath=path;
  else if(draft.data.panels?.[Number(target)])draft.data.panels[Number(target)].artPath=path;
  persist();message='Artwork uploaded. Save Cloud Draft or Publish when ready.';
 }catch(e){message='Artwork upload failed: '+String(e.message||e)}
 finally{busy=false;render()}
}
async function save(publish=false){
 if(!owner()||busy||!draft||!db())return;
 collect();const errors=validation();
 if(publish&&errors.length){message=errors[0];render();return}
 busy=true;message=publish?'Publishing…':'Saving cloud draft…';render();
 try{
  const user=await db().auth.getUser();
  if(user.error||!user.data?.user?.id)throw new Error('Sign in with your owner account.');
  const payload={draft_blueprint:clone(draft.data),updated_by:user.data.user.id,updated_at:new Date().toISOString()};
  if(publish)Object.assign(payload,{title:draft.title.trim(),blueprint:clone(draft.data),status:'published',published_at:payload.updated_at,version:(Number(selected?.version)||0)+1});
  else if(selected?.status!=='published')payload.title=draft.title.trim();
  let response;
  if(selected?.id)response=await db().from(table).update(payload).eq('id',selected.id).select().single();
  else{
   Object.assign(payload,{slug:draft.slug,kind,created_by:user.data.user.id,status:publish?'published':'draft'});
   if(!publish){payload.blueprint={};payload.version=1}
   response=await db().from(table).insert(payload).select().single();
  }
  if(response.error||!response.data?.id)throw new Error(response.error?.message||'Cloud did not confirm the save.');
  const row=response.data;draft.id=row.id;draft.status=row.status;draft.version=row.version;draft.cloudUpdatedAt=row.updated_at||null;selected=row;baseline=JSON.stringify(draft);clearLocal();
  const {data,error}=await db().from(table).select('id,slug,kind,title,status,version,blueprint,draft_blueprint,updated_at').order('updated_at',{ascending:false});
  if(error)throw error;rows=data||[];
  message=publish?(kind==='item'?'ITEM PUBLISHED · assign it to a specific boss in Drop Tables. It will not enter random dungeon drops.':'TEMPLATE PUBLISHED · add it to an adventure and publish the adventure before players can encounter it.'):'CLOUD DRAFT SAVED · players still see the previously published version.';
  if(publish){await window.CellboundDesignedContent?.refresh?.(true);window.CellboundItemCatalog?.render?.()}
 }catch(e){message='Could not save content: '+String(e.message||e)}
 finally{busy=false;render()}
}
async function remove(){
 if(!selected?.id||selected.status==='published'||busy||!confirm('Delete this unpublished template from the cloud?'))return;
 busy=true;try{
  const {error}=await db().from(table).delete().eq('id',selected.id);if(error)throw error;
  selected=null;draft=fresh(kind);baseline=JSON.stringify(draft);clearLocal();message='Draft deleted.';
  await refresh()
 }catch(e){message='Delete failed: '+String(e.message||e)}
 finally{busy=false;render()}
}
function useStage(s){
 if(!s||!['room','fight','comic','minigame'].includes(s.type))return;
 if(!window.CellboundDesignBooth?.setTab)return;
 window.CellboundDesignBooth.setTab('library');
 kind=s.type;selected=null;draft=fresh(kind);draft.title=('Reusable '+String(s.title||typeName(kind))).slice(0,120);
 draft.data={...draft.data,...clone(s),title:draft.title};delete draft.data.id;
 baseline=JSON.stringify(draft);persist();render();
}
async function open(){
 if(!owner())return;
 const host=$('#dboLibrary');if(!host)return;
 host.hidden=false;
 if(!draft){if(!loadLocal()){draft=fresh(kind);baseline=JSON.stringify(draft)}}
 render();
 if(!loading)await refresh()
}
function close(){const host=$('#dboLibrary');if(host)host.hidden=true}
window.CellboundDesignLibrary={open,close,refresh,useStage,startNew:k=>{if(KINDS.some(x=>x[0]===k))newDraft(k)},current:()=>clone(draft||{}),validate:validation};
})();
