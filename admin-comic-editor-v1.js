(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const C=()=>window.CellboundComicScenes,db=()=>window.CellboundGame?.getSupabase?.();
const owner=()=>Boolean(window.CellboundAdmin?.isAdmin)&&window.CellboundAdmin?.role==='owner';
const scenes=new Map(),checked=new Set(),broken=new Set(),reviewed=new Set();
try{(JSON.parse(localStorage.getItem('cellbound-comic-reviews')||'[]')||[]).forEach(id=>reviewed.add(id))}catch{}
let opened=false,current='',panel=0,filter='all',term='',file=null,blob='',busy=false,note='';
function add(group,config,source){
 if(!config?.title)return;
 const id=C()?.sceneKey?.(config);if(!id)return;
 scenes.set(id,{id,group,config,source:source||''})
}
function seed(){
 ['arrival','west-wall','gear','hollows','loot','shock','craft','contract','departure'].forEach(id=>{
  const c=window.CellboundOnboarding?.tutorialComicConfig?.(id);
  if(c)add('Tutorial',c,'onboarding-v1.js')
 });
 const bell=[
 ['I · THE LETTER','The Thirteenth Bell','A village erased from every living map','sealed_letter'],
 ['II · GREYWAKE','The road ends at Greywake','Loop 1 · 11:47 PM','greywake_arrival'],
 ['VI · THE LOCKED HOUSE','The house that was not there','Greywake · 12:01 AM','locked_house'],
 ['VII · THE FINAL LOOP','The final thirteen minutes','Greywake · 11:59 PM','final_run'],
 ['VIII · THE BELLKEEPER','Edrin Vale','Clocktower · 11:59 PM','bellkeeper'],
 ['IX · 12:01 AM','The bell is yours','The loop has stopped','bell_breaks'],
 ['X · GREYWAKE','The Thirteenth Bell','Quest complete','greywake_freed'],
 ['AFTERMATH','Greywake','Permanent world location','departure']];
 bell.forEach(([page,title,subtitle,name])=>add('The Thirteenth Bell',{theme:'bell',page,title,subtitle,panels:[{kind:'location',title,artwork:'./assets/comics/thirteenth-bell/'+name+'.jpg?v=7'}],panelOnly:true},'thirteenth-bell-v1.js'));
 const nullScenes=[
 ['The Signal','Dr. Elara Voss','voss-signal'],['The Forgotten Facility','Dr. Elara Voss','facility-entry'],
 ['First Contact','Dr. Elara Voss','first-aberrant'],['The First Recording','Director Cael Orin','orin-recording'],
 ['Subject Zero','Dr. Elara Voss','subject-zero'],['The Teleporter','Dr. Elara Voss','teleporter'],
 ['The Overseer','THE OVERSEER','overseer-awakens'],['Experiment Cycle','Dr. Elara Voss','prototype-07'],
 ['Modifications','Dr. Elara Voss','prototype-07'],['Escape','Dr. Elara Voss','escape'],
 ['After the Extraction','','subject-zero-awake']];
 nullScenes.forEach(([title,subtitle,name])=>add('Null Complex',{theme:'null',page:'SIGNAL FROM NOWHERE',title,subtitle,panels:[{kind:'location',title,artwork:'./assets/comics/null-complex/'+name+'.webp'}],storyOnly:true},'quests-v2.js'))
}
function literal(v){
 const s=String(v||'').trim(),q=s[0];if(q!=="'"&&q!=='"')return '';
 let out='';for(let i=1;i<s.length;i++){
  if(s[i]===q)return out;
  if(s[i]==='\\'){i++;out+=({'n':'\n','t':'\t','r':'\r'}[s[i]]||s[i]||'');continue}
  out+=s[i]
 }return out
}
function argsAt(src,pos){
 let depth=0,quote='',escape=false,begin=pos+1,args=[];
 for(let i=pos+1;i<src.length;i++){
  const ch=src[i];
  if(quote){if(escape){escape=false;continue}if(ch==='\\'){escape=true;continue}if(ch===quote)quote='';continue}
  if(ch==="'"||ch==='"'||ch===String.fromCharCode(96)){quote=ch;continue}
  if('([{'.includes(ch)){depth++;continue}
  if(')]}'.includes(ch)){
   if(ch===')'&&depth===0){args.push(src.slice(begin,i).trim());return args}
   depth--;continue
  }
  if(ch===','&&depth===0){args.push(src.slice(begin,i).trim());begin=i+1}
 }return []
}
function stringArray(v){
 if(!String(v||'').trim().startsWith('['))return [];
 const values=[],pattern=/(['"])(?:\\.|[^\\])*?\1/g;let m;
 while((m=pattern.exec(v)))values.push(literal(m[0]));
 return values.filter(Boolean)
}
async function sourceScenes(filename,fn,group,kind){
 try{
  const response=await fetch('./'+filename,{cache:'no-store'});if(!response.ok)throw Error(filename);
  const src=await response.text(),matcher=new RegExp('\\b'+fn+'\\s*\\(','g');let m;
  while((m=matcher.exec(src))){
   const a=argsAt(src,src.indexOf('(',m.index));
   const title=literal(a[kind==='voyage'?1:0]),speaker=literal(a[kind==='voyage'?2:1]);
   const lines=stringArray(a[kind==='voyage'?3:2]);
   if(!title||!lines.length)continue;
   const page=kind==='quest'?'QUEST':kind==='voyage'?'NO WAY BACK':'FOURFOLD LOCK';
   const key=(title+' '+speaker).toLowerCase();
   const groupKey=/trial|mentor/.test(key)?'trial':/vault|forge|ash|elara/.test(key)?'ashen':/seal|hollow|fragment|tessa|jory|bram|letter|bearer|pressure/.test(key)?'hollow':'zeltira';
   const sets={
    trial:['./assets/comics/tutorial/arcane_overload_a_warden_s_lesson.webp','./assets/comics/tutorial/the_warden_and_the_arcane_diadem.webp','./assets/comics/tutorial/arcane_forge_beneath_the_twilight_citadel.webp','./assets/comics/tutorial/moonlit_ruins_and_the_glowing_wardstone.webp'],
    ashen:['./assets/dungeons/ashen-vault.webp','./assets/bosses/ashen-vault-vaultheart.webp','./assets/comics/tutorial/dawn_briefing_on_the_ash_road.webp','./assets/comics/tutorial/dawn_departure_from_zeltira_citadel.webp'],
    hollow:['./assets/dungeons/hollow-sanctum.webp','./assets/bosses/hollow-sanctum-bound-choir.webp','./assets/comics/tutorial/moonlit_ruins_and_the_glowing_wardstone.webp','./assets/comics/tutorial/warden_s_descent_into_the_ruins.webp'],
    zeltira:['./assets/comics/tutorial/dawn_briefing_on_the_ash_road.webp','./assets/comics/tutorial/the_quartermaster_s_choice.webp','./assets/comics/tutorial/dawn_departure_from_zeltira_citadel.webp','./assets/comics/tutorial/wardens_at_the_twilight_city_gate.webp']
   };
   const artworks=kind==='quest'?sets[groupKey]:[];
   add(group,{theme:'zeltira',page,title,subtitle:speaker,panels:lines.map((text,i)=>({kind:i?'dialogue':'location',speaker,text,title:i?'':title,artwork:artworks.length?artworks[i%artworks.length]:''})),progressive:true,storyOnly:true},filename)
  }
 }catch(error){console.warn('Comic scene inventory',error);note='Could not index '+filename}
}
async function inventory(){
 scenes.clear();seed();
 await Promise.all([
  sourceScenes('quests-v2.js','showDialogue','Main quests','quest'),
  sourceScenes('fourfold-lock-v1.js','story','The Fourfold Lock','fourfold'),
  sourceScenes('no-way-back-v1.js','story','No Way Back','voyage')
 ]);
 (C()?.catalog?.()||[]).forEach(config=>{
  const existing=scenes.get(C().sceneKey(config));
  add(existing?.group||'Other stories',config,existing?.source||'Runtime scene')
 });
 if(!scenes.has(current))current=scenes.keys().next().value||''
}
function art(entry,i){return C()?.artworkFor?.(entry.config,i,entry.config.panels[i]?.artwork)||''}
function uploaded(entry,i){return art(entry,i)!==(entry.config.panels[i]?.artwork||'')}
function state(entry){
 const urls=entry.config.panels.map((_,i)=>art(entry,i));
 if(!urls.length||urls.some(x=>!x||broken.has(x)))return 'missing';
 if(entry.group==='Main quests'&&entry.config.panels.some((_,i)=>!uploaded(entry,i)))return 'reused';
 if(new Set(urls).size!==urls.length)return 'reused';
 return reviewed.has(entry.id)?'approved':'review'
}
function inspect(url){
 if(!url||checked.has(url))return;
 checked.add(url);const im=new Image();
 im.onerror=()=>{broken.add(url);if(opened)render()};
 im.onload=()=>{broken.delete(url);if(opened)render()};
 im.src=url
}
function matching(){
 return [...scenes.values()].filter(e=>(filter==='all'||state(e)===filter)&&(!term||(e.group+' '+e.config.title+' '+e.config.subtitle).toLowerCase().includes(term.toLowerCase()))).sort((a,b)=>a.group.localeCompare(b.group)||a.config.title.localeCompare(b.config.title))
}
function render(){
 const root=$('#comicEditorMount');if(!opened||!owner()||!root)return;
 const all=[...scenes.values()],shown=matching(),counts={missing:0,reused:0,review:0,approved:0};
 all.forEach(x=>counts[state(x)]++);
 const selected=scenes.get(current)||shown[0]||all[0];
 if(selected&&!scenes.has(current)){current=selected.id;panel=0}
 const panels=selected?.config.panels||[],p=panels[panel],picture=p?art(selected,panel):'';
 root.hidden=false;
 root.innerHTML='<section class="cse-shell">'+
 '<header class="cse-top"><div><small>OWNER TOOLS · STORY CONTENT</small><h2>Comic Scene Editor</h2><p>Review the comic strips, find missing artwork and publish images without replaying quests.</p></div><div><button id="cseRefresh">REFRESH</button><button id="cseClose">CLOSE</button></div></header>'+
 '<div class="cse-stats">'+[['all','SCENES',all.length],['missing','MISSING ART',counts.missing],['reused','REUSED ART',counts.reused],['review','TO REVIEW',counts.review],['approved','REVIEWED',counts.approved]].map(([id,label,v])=>'<button data-filter="'+id+'" class="'+(filter===id?'active':'')+'"><small>'+label+'</small><b>'+v+'</b></button>').join('')+'</div>'+
 '<div class="cse-layout"><aside class="cse-list"><label>SEARCH STORIES<input id="cseSearch" placeholder="Search scenes…" value="'+esc(term)+'"></label><div class="cse-list-scroll">'+shown.map(e=>'<button data-scene="'+esc(e.id)+'" class="'+(e.id===current?'active':'')+'"><small>'+esc(e.group)+'</small><b>'+esc(e.config.title)+'</b><span>'+esc(state(e)==='missing'?'Missing artwork':state(e)==='reused'?'Reused artwork':state(e)==='approved'?'Reviewed':'Needs review')+'</span></button>').join('')+'</div></aside>'+
 '<main class="cse-main">'+(selected?'<div class="cse-scene"><div><small>'+esc(selected.group)+' · '+esc(selected.source)+'</small><h3>'+esc(selected.config.title)+'</h3><p>'+esc(selected.config.subtitle||'Story')+' · '+panels.length+' panels</p></div><div><button id="csePlay">PLAY PREVIEW</button><button id="cseReview">'+(reviewed.has(selected.id)?'UNMARK REVIEWED':'MARK REVIEWED')+'</button></div></div>'+
 '<div class="cse-strip">'+panels.map((x,i)=>{const img=art(selected,i);if(img)inspect(img);return '<button class="cse-cell '+(i===panel?'active':'')+'" data-panel="'+i+'"><div class="cse-image">'+(img&&!broken.has(img)?'<img src="'+esc(img)+'" alt="" loading="lazy">':'<div>ARTWORK NEEDED</div>')+'</div><div class="cse-caption"><small>PANEL '+(i+1)+(uploaded(selected,i)?' · UPLOADED':'')+'</small><b>'+esc(x.title||x.speaker||selected.config.title)+'</b><p>'+esc(x.text||x.eyebrow||'Caption revealed in scene')+'</p></div></button>'}).join('')+'</div>'+
 (p?'<section class="cse-upload"><header><div><small>PANEL '+(panel+1)+' / '+panels.length+'</small><h4>Artwork upload</h4></div><span>'+ (uploaded(selected,panel)?'PUBLISHED IMAGE':picture?'SOURCE IMAGE':'MISSING IMAGE')+'</span></header><div class="cse-upload-grid"><div class="cse-preview">'+(blob?'<img src="'+esc(blob)+'" alt="New art preview">':picture?'<img src="'+esc(picture)+'" alt="Current art">':'<div>NO IMAGE</div>')+'</div><div><p>'+esc(p.text||p.title||'Artwork for this scene')+'</p><label class="cse-file">SELECT IMAGE<input id="cseFile" type="file" accept="image/webp,image/png,image/jpeg,image/avif"></label><small>WebP · PNG · JPEG · AVIF, maximum 8 MB. 16:9 landscape recommended.</small><button class="cse-primary" id="csePublish" '+(!file||busy?'disabled':'')+'>'+(busy?'UPLOADING…':'UPLOAD & PUBLISH')+'</button><p class="cse-notice">'+esc(note||'Uploading will replace the artwork used in this scene for all players.')+'</p></div></div></section>':'')+
 '</main>':'<p>No scenes indexed yet.</p>')+'</div></section>';
 bind()
}
function choose(next){
 if(blob){URL.revokeObjectURL(blob);blob=''}
 file=null;note='';
 if(next){
  if(!['image/webp','image/png','image/jpeg','image/avif'].includes(next.type))note='Please select a WebP, PNG, JPEG or AVIF image.';
  else if(next.size>8*1024*1024)note='Artwork must be below 8 MB.';
  else{file=next;blob=URL.createObjectURL(next);note=next.name+' ready to publish.'}
 }render()
}
async function publish(){
 const scene=scenes.get(current),chosen=file,idx=panel,client=db();
 if(!owner()||!scene||!chosen||!client||busy)return;
 busy=true;note='Uploading artwork…';render();
 try{
  const auth=await client.auth.getUser();if(auth.error||!auth.data?.user?.id)throw Error('Owner session required.');
  const extension={'image/webp':'webp','image/png':'png','image/jpeg':'jpg','image/avif':'avif'}[chosen.type];
  const path=scene.id+'/'+idx+'-'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+extension;
  const stored=await client.storage.from('comic-scene-art').upload(path,chosen,{contentType:chosen.type,cacheControl:'31536000',upsert:false});
  if(stored.error)throw stored.error;
  const saved=await client.from('comic_scene_panel_art').upsert({scene_id:scene.id,panel_index:idx,object_path:path,updated_by:auth.data.user.id,updated_at:new Date().toISOString()},{onConflict:'scene_id,panel_index'});
  if(saved.error)throw saved.error;
  await C().reloadArt();if(blob)URL.revokeObjectURL(blob);blob='';file=null;
  note='Published successfully. The live scene now uses this artwork.';
 }catch(error){note='Publish failed: '+(error?.message||String(error))}
 finally{busy=false;render()}
}
function bind(){
 $('#cseClose')?.addEventListener('click',close);
 $('#cseRefresh')?.addEventListener('click',async()=>{try{await C()?.reloadArt?.();await inventory()}catch(error){note=error.message}render()});
 $('#cseSearch')?.addEventListener('change',e=>{term=e.target.value;render()});
 document.querySelectorAll('#comicEditorMount [data-filter]').forEach(x=>x.addEventListener('click',()=>{filter=x.dataset.filter;render()}));
 document.querySelectorAll('#comicEditorMount [data-scene]').forEach(x=>x.addEventListener('click',()=>{current=x.dataset.scene;panel=0;choose(null)}));
 document.querySelectorAll('#comicEditorMount [data-panel]').forEach(x=>x.addEventListener('click',()=>{panel=Number(x.dataset.panel);choose(null)}));
 $('#cseFile')?.addEventListener('change',e=>choose(e.target.files?.[0]));
 $('#csePublish')?.addEventListener('click',publish);
 $('#cseReview')?.addEventListener('click',()=>{reviewed.has(current)?reviewed.delete(current):reviewed.add(current);localStorage.setItem('cellbound-comic-reviews',JSON.stringify([...reviewed]));render()});
 $('#csePlay')?.addEventListener('click',()=>{const scene=scenes.get(current);if(scene)C()?.show?.({...scene.config,allowSkip:true,skipLabel:'CLOSE PREVIEW',continueLabel:'CLOSE PREVIEW'})});
}
async function open(){
 if(!owner())return;
 const root=$('#comicEditorMount');if(!root)return;
 opened=true;root.hidden=false;await C()?.loadArt?.();await inventory();render();
 requestAnimationFrame(()=>root.scrollIntoView({behavior:'smooth',block:'start'}))
}
function close(){
 opened=false;file=null;if(blob)URL.revokeObjectURL(blob);blob='';
 const root=$('#comicEditorMount');if(root){root.hidden=true;root.innerHTML=''}
}
function sync(){
 const e=$('#comicEditorEntry');if(e)e.hidden=!owner();
 if(!owner())close()
}
function init(){
 const e=$('#comicEditorEntry');if(!e){setTimeout(init,150);return}
 e.querySelector('#openComicEditor')?.addEventListener('click',open);
 window.addEventListener('cellbound:admin-status',sync);
 window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='admin')sync()});
 sync()
}
window.CellboundComicEditor={open,close,inventory};
init()
})();