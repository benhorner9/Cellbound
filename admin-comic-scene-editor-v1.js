(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=v=>JSON.parse(JSON.stringify(v));
const KEY='cellbound-comic-scene-editor-drafts-v1';
const SOURCES=[
 ['quests-v2.js','Main Quests',['showDialogue','nullComic','comic.show','window.CellboundComicScenes.show']],
 ['thirteenth-bell-v1.js','The Thirteenth Bell',['bellComic']],
 ['fourfold-lock-v1.js','The Fourfold Lock',['story']],
 ['no-way-back-v1.js','No Way Back',['story']]
];
const TUTORIAL=['arrival','west-wall','gear','hollows','loot','shock','craft','contract','departure'];
const NULL_ART={signal:'voss-signal',entry:'facility-entry',splice:'first-aberrant',orin:'orin-recording',zero:'subject-zero',teleporter:'teleporter',overseer:'overseer-awakens',prototype:'prototype-07',escape:'escape',sting:'subject-zero-awake'};
let scenes=[],selected='',filter='',group='all',gaps=false,opened=false,loading=false,warning='';
const broken=new Set();
let drafts={};try{drafts=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{}
const owner=()=>window.CellboundAdmin?.isAdmin===true&&String(window.CellboundAdmin?.role||'').toLowerCase()==='owner';
function quotedEnd(s,i){const q=s[i++];while(i<s.length){if(s[i]==='\\'){i+=2;continue}if(s[i++]===q)break}return i}
function bracket(s,i){
 const endings={'(':')','[':']','{':'}'},stack=[endings[s[i]]];if(!stack[0])return null;
 for(let j=i+1;j<s.length;j++){
  const c=s[j],n=s[j+1];
  if(c==="'"||c==='"'||c.charCodeAt(0)===96){j=quotedEnd(s,j)-1;continue}
  if(c==='/'&&n==='/'){j=s.indexOf('\n',j+2);if(j<0)return null;continue}
  if(c==='/'&&n==='*'){j=s.indexOf('*/',j+2);if(j<0)return null;j++;continue}
  if(endings[c])stack.push(endings[c]);
  else if(c===stack[stack.length-1]){stack.pop();if(!stack.length)return{body:s.slice(i+1,j),end:j+1}}
 }
 return null
}
function split(s){
 const out=[];let start=0,depth=0;
 for(let i=0;i<s.length;i++){
  const c=s[i],n=s[i+1];
  if(c==="'"||c==='"'||c.charCodeAt(0)===96){i=quotedEnd(s,i)-1;continue}
  if(c==='/'&&n==='/'){i=s.indexOf('\n',i+2);if(i<0)break;continue}
  if(c==='/'&&n==='*'){i=s.indexOf('*/',i+2);if(i<0)break;i++;continue}
  if('([{'.includes(c))depth++;
  if(')]}'.includes(c))depth--;
  if(c===','&&depth===0){out.push(s.slice(start,i).trim());start=i+1}
 }
 const last=s.slice(start).trim();if(last)out.push(last);return out
}
function literal(v){
 const s=String(v||'').trim(),q=s[0];if(q!=="'"&&q!=='"')return null;
 let out='';
 for(let i=1;i<s.length;i++){
  let c=s[i];if(c===q)return out;
  if(c==='\\'){c=s[++i];if(c==='n')out+='\n';else if(c==='t')out+='\t';else if(c==='r')out+='\r';else if(c==='u'&&/^[a-f0-9]{4}$/i.test(s.slice(i+1,i+5))){out+=String.fromCharCode(parseInt(s.slice(i+1,i+5),16));i+=4}else out+=c||''}
  else out+=c
 }
 return null
}
function property(src,key){const s=String(src||'').trim();const body=s[0]==='{'?s.slice(1,-1):s;const found=split(body).find(p=>p.startsWith(key+':'));return found?found.slice(found.indexOf(':')+1).trim():''}
function array(src){const s=String(src||'').trim();if(s[0]!=='[')return[];const b=bracket(s,0);return b?split(b.body).map(literal).filter(x=>x!==null):[]}
function fragments(src){const result=[];const re=/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g;for(const match of String(src||'').matchAll(re)){const v=literal(match[0]);if(v)result.push(v)}return result}
function calls(src,name){
 const all=[],key=name+'(';let from=0,at;
 while((at=src.indexOf(key,from))>=0){
  from=at+key.length;
  if(/[\w$]/.test(src[at-1]||'')||/function\s+$/.test(src.slice(Math.max(0,at-18),at))||(name==='story'&&src[at-1]==='.'))continue;
  const b=bracket(src,at+name.length);if(!b)continue;
  all.push({at,args:split(b.body)})
 }
 return all
}
function panel(text,title,art,index){return{kind:index?'dialogue':'location',title:index?'':title,text:String(text||''),artwork:art||'',wide:false}}
function questArt(src,title,speaker){
 // Match the live quest's story-specific artwork catalogue first. The old
 // inspector only scanned generic art sets, showing false gaps for published art.
 const dedicatedAt=src.indexOf('const QUEST_COMIC_STORY_ART=');
 const dedicatedOpen=src.indexOf('{',dedicatedAt);
 const dedicated=dedicatedAt<0?null:bracket(src,dedicatedOpen);
 if(dedicated){
  const line=split(dedicated.body).find(p=>p.startsWith("'"+title+"':")||p.startsWith('"'+title+'":'));
  if(line){const images=array(line.slice(line.indexOf(':')+1));if(images.length)return images}
 }
 const from=src.indexOf('const QUEST_COMIC_ART='),open=src.indexOf('{',from),b=from<0?null:bracket(src,open),sets={};
 if(b)for(const k of ['ashen','hollow','zeltira','trial'])sets[k]=array(property(b.body,k));
 const val=(title+' '+speaker).toLowerCase(),type=/trial|mentor/.test(val)?'trial':/vault|forge|ash|elara/.test(val)?'ashen':/seal|hollow|fragment|tessa|jory|bram|letter|bearer|pressure/.test(val)?'hollow':'zeltira';
 return sets[type]||[]
}
function scanDialogue(src,path,category,name,c){
 const isVoyage=path==='no-way-back-v1.js';
 const rawTitle=c.args[isVoyage?1:0];
 const title=literal(rawTitle)||(rawTitle?.trim()==='t.title'?'Class Trial · Character-specific':null);if(!title)return null;
 const speaker=literal(c.args[isVoyage?2:1])||'',lines=c.args[isVoyage?3:2];
 const text=array(lines),rawLines=String(lines||'').trim();
 // Keep dynamic dialogue such as characterName + '. Good. Hold it.' as one
 // authored panel. The former string-only scan dropped these live story beats.
 const bracketed=rawLines.startsWith('[')?bracket(rawLines,0):null;
 const scripted=name==='showDialogue'&&bracketed
  ?split(bracketed.body).map(raw=>literal(raw)||fragments(raw).join(' ')||'[Dynamic quest dialogue]')
  :null;
 const beats=scripted?.length?scripted:text.length?text:fragments(lines).filter(s=>s.length>7);
 if(!beats.length)beats.push('[Dynamic dialogue — inspect during gameplay]');
 let art=[],note='',origin='scripted dialogue';
 if(name==='showDialogue'){art=questArt(src,title,speaker);const dedicated=src.includes("'"+title+"':[");note=dedicated?'Dedicated illustrated comic sequence.':'This quest reuses generic artwork rather than having its own comic panels.';origin=dedicated?'dedicated comic':'generic comic'}
 if(name==='nullComic'){const match=String(c.args[3]).match(/NULL_ART\.([a-z]+)/);if(match&&NULL_ART[match[1]])art=['./assets/comics/null-complex/'+NULL_ART[match[1]]+'.webp'];origin='quest comic'}
 if(name==='story'){
  origin='reused comic';note='Comic panels exist, but artwork is reused from bosses and dungeons.';
  if(isVoyage){
   // The owner inspector must read the SAME scene-specific art data as gameplay.
   const catalogueStart=src.indexOf('const NWB_COMIC_STORY_ART=');
   const catalogueOpen=src.indexOf('{',catalogueStart);
   const catalogue=catalogueStart<0?null:bracket(src,catalogueOpen);
   const dedicated=catalogue&&split(catalogue.body).find(x=>x.startsWith("'"+title+"':")||x.startsWith('"'+title+'":'));
   if(dedicated){
    art=array(dedicated.slice(dedicated.indexOf(':')+1));
    note='Dedicated illustrated No Way Back comic sequence.';
    origin='dedicated comic';
   }else{
   const key=((literal(c.args[0])||'')+' '+title).toLowerCase();
   const silas='./assets/bosses/no-way-back-silas-vane-v3.jpg',manor='./assets/manor/manor-raid-hero.webp',hounds='./assets/bosses/no-way-back-three-hounds-v3.jpg',master='./assets/manor/manor-master.webp';
   art=/hounds|chase|iron gate/.test(key)?[hounds,manor]:/master|after the fight|understand/.test(key)?[silas,master,manor]:/manor island|homecoming/.test(key)?[manor,silas]:[silas,manor];
   }
  }else{
   // Resolve the same authored story-art lists as fourfoldStoryArt(), rather
   // than inventing unrelated boss/dungeon imagery for the editor preview.
   const start=src.indexOf('const FOURFOLD_STORY_ART='),open=src.indexOf('{',start);
   const def=start<0?null:bracket(src,open);
   const artKey=title.toLowerCase().includes('journey through the ages')?'journey':'box';
   art=def?array(property(def.body,artKey)):[];
   origin='dedicated comic';
   note='The live Fourfold comic uses its illustrated story panels.';
  }
 }
 const line=src.slice(0,c.at).split('\n').length;
 const panels=name==='story'?art.map((image,i)=>panel(beats.filter((_,j)=>j%art.length===i).join('\n'),title,image,i)):beats.map((text,i)=>panel(text,title,art.length?art[i%art.length]:'',i));
 const config={theme:name==='nullComic'?'null':name==='story'?(isVoyage?'manor':'fourfold'):'zeltira',page:name==='nullComic'?'SIGNAL FROM NOWHERE':path==='fourfold-lock-v1.js'?'THE FOURFOLD LOCK':isVoyage?'NO WAY BACK':'QUEST',title,subtitle:speaker,panels,progressive:true,storyOnly:true,panelOnly:name==='story'};
 return{id:path+':'+title.toLowerCase().replace(/[^a-z0-9]+/g,'-'),title,category,speaker,path,line,origin,note,panels,config}
}
function scanBell(src,path,category,c){
 const obj=c.args[0];if(!obj||obj.trim()[0]!=='{')return null;
 const title=literal(property(obj,'title'))||(property(obj,'title')==='TITLE'?'The Thirteenth Bell':'');
 if(!title)return null;
 const page=literal(property(obj,'page'))||'';
 const match=obj.match(/bellPanel\(\s*(['"])([^'"]+)\1/);
 const art=match?'./assets/comics/thirteenth-bell/'+match[2]+'.webp?v=8':'';
 const revealAt=obj.indexOf('reveals:');let caption='';
 if(revealAt>=0){const open=obj.indexOf('[',revealAt),b=bracket(obj,open);
  if(b)caption=split(b.body).map(x=>[literal(property(x,'title')),literal(property(x,'text'))].filter(Boolean).join(' — ')).filter(Boolean).join('\n');
 }
 const line=src.slice(0,c.at).split('\n').length;
 const panels=[panel(caption,title,art,0)],subtitle=literal(property(obj,'subtitle'))||'Greywake · The missing hour';
 const config={theme:'bell',page,title,subtitle,panels,panelOnly:true,progressive:true};
 return{id:path+':'+(page+'-'+title).toLowerCase().replace(/[^a-z0-9]+/g,'-'),title:page?page+' · '+title:title,category,speaker:'Greywake',path,line,origin:'dedicated comic',note:'The live strip displays a sequence of captions over its illustrated panel.',panels,config}
}
function scanDirect(src,path,category,c){
 const obj=c.args[0];if(!obj||obj.trim()[0]!=='{')return null;
 const title=literal(property(obj,'title'));if(!title)return null;
 const line=src.slice(0,c.at).split('\n').length,raw=property(obj,'panels');
 const b=raw&&raw[0]==='['?bracket(raw,0):null;
 let panels=b?split(b.body).map((p,i)=>{
  const ref=property(p,'artwork'),key=ref.match(/NULL_ART\.([a-z]+)/);
  const art=literal(ref)||(key&&NULL_ART[key[1]]?'./assets/comics/null-complex/'+NULL_ART[key[1]]+'.webp':'');
  return{kind:literal(property(p,'kind'))||'location',artwork:art,title:literal(property(p,'title'))||'',text:literal(property(p,'text'))||'',speaker:literal(property(p,'speaker'))||'',wide:true}
 }):[];
 if(!panels.length)panels=[panel('Dynamic scene: inspect this text in gameplay.',title,'',0)];
 const rawReveals=property(obj,'reveals'),reveals=rawReveals&&rawReveals[0]==='['?bracket(rawReveals,0):null;
 if(reveals){const captions=split(reveals.body).map(p=>literal(property(p,'text'))).filter(Boolean);
  if(captions.length&&panels.length){panels[0].text=[panels[0].text,...captions].filter(Boolean).join('\n')}
 }
 const subtitle=literal(property(obj,'subtitle'))||'';
 const config={theme:literal(property(obj,'theme'))||'zeltira',page:literal(property(obj,'page'))||'STORY',title,subtitle,panels,progressive:true,storyOnly:true};
 return{id:path+':'+title.toLowerCase().replace(/[^a-z0-9]+/g,'-'),title,category,speaker:subtitle,path,line,origin:'direct comic',note:'Some captions and images are dynamically assembled. Verify these in gameplay.',panels,config}
}
async function discover(){
 const found=[],cfg=window.CellboundOnboarding?.tutorialComicConfig;
 if(cfg)for(const id of TUTORIAL){const data=cfg(id);if(data)found.push({id:'tutorial:'+id,title:data.title,category:'Tutorial',speaker:data.speaker||'',path:'onboarding-v1.js',line:0,origin:'dedicated comic',note:'',panels:clone(data.panels||[]),config:clone(data)})}
 const read=await Promise.all(SOURCES.map(async ([path,category,names])=>{
  try{const result=await fetch('./'+path+'?scene-audit=1',{cache:'no-store'});if(!result.ok)throw new Error('HTTP '+result.status);return{path,category,names,src:await result.text()}}
  catch(e){return{path,error:String(e)}}
 }));
 const errors=[];
 for(const s of read){
  if(s.error){errors.push(s.path+' ('+s.error+')');continue}
  for(const name of s.names)for(const c of calls(s.src,name)){
   const scene=name==='bellComic'?scanBell(s.src,s.path,s.category,c):
    name==='comic.show'||name==='window.CellboundComicScenes.show'?scanDirect(s.src,s.path,s.category,c):scanDialogue(s.src,s.path,s.category,name,c);
   if(scene)found.push(scene)
  }
 }
 scenes=[...new Map(found.map(s=>[s.id,s])).values()];
 warning=errors.length?'Source scan incomplete: '+errors.join(', '):'';
 if(!scenes.some(s=>s.id===selected))selected=scenes[0]?.id||'';
 return scenes
}
function combined(s){
 const d=drafts[s.id]||{};
 const copy=clone(s);copy.panels=copy.panels.map((p,i)=>{const edited={...p,...(d.panels?.[i]||{})};return{...edited,artwork:window.CellboundComicScenes?.artworkFor?.(s.config||{},i,edited.artwork)||edited.artwork}});copy.review=d.review||'unreviewed';return copy
}
function state(p){
 const art=String(p.artwork||'').trim();
 if(!art||broken.has(art))return'missing';
 if(!/^(?:\.\/)?assets\/comics\//.test(art)&&!art.includes('/storage/v1/object/public/comic-scene-art/'))return'reused';
 return'ready'
}
function gapsIn(s){return s.panels.filter(p=>state(p)!=='ready').length}
function list(){
 return scenes.map(combined).filter(s=>(group==='all'||group===s.category)&&(!gaps||gapsIn(s))&&(!filter||[s.title,s.category,s.path].join(' ').toLowerCase().includes(filter.toLowerCase())))
}
function listMarkup(){
 return list().map(s=>'<button type="button" class="cse-scene '+(s.id===selected?'active':'')+'" data-scene="'+esc(s.id)+'"><span><b>'+esc(s.title)+'</b><small>'+esc(s.category)+' · '+s.panels.length+' panels</small></span><em class="'+(gapsIn(s)?'gap':'ok')+'">'+(gapsIn(s)?gapsIn(s)+' ART GAP(S)':s.review==='approved'?'APPROVED':'ART FOUND')+'</em></button>').join('')||'<p class="cse-empty">No matching scenes.</p>'
}
function showList(){
 const node=$('#cseSceneList');if(!node)return;node.innerHTML=listMarkup();
 node.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{selected=b.dataset.scene;render()})
}
function statusLabel(s){return s==='missing'?'NO ART':s==='reused'?'REUSED ART':'COMIC ART'}
function panelMarkup(p,i){
 const st=state(p);
 return'<article class="cse-panel"><div class="cse-art">'+(p.artwork?'<img data-cse-image src="'+esc(p.artwork)+'" alt="Comic panel '+(i+1)+'" loading="lazy">':'<div class="cse-no-art">NO ARTWORK</div>')+'<span>PANEL '+(i+1)+'</span><em class="'+st+'">'+statusLabel(st)+'</em></div>'+
 '<div class="cse-fields"><label>ARTWORK PATH<input data-art="'+i+'" value="'+esc(p.artwork||'')+'" placeholder="./assets/comics/…"></label><label>CAPTION TITLE<input data-title="'+i+'" value="'+esc(p.title||'')+'"></label><label>STORY TEXT<textarea data-text="'+i+'" rows="3">'+esc(p.text||'')+'</textarea></label><div class="cse-upload-tools"><label>UPLOAD ARTWORK<input data-upload-file="'+i+'" type="file" accept="image/webp,image/jpeg,image/png,image/avif"></label><button type="button" data-upload-publish="'+i+'" disabled>UPLOAD &amp; PUBLISH</button><small data-upload-status="'+i+'">Choose a WebP, JPEG, PNG or AVIF image (maximum 8 MB).</small></div></div></article>'
}
function render(){
 const root=$('#comicSceneEditorMount');if(!root||!opened||!owner())return;
 const all=scenes.map(combined),total=all.reduce((n,s)=>n+s.panels.length,0),missing=all.reduce((n,s)=>n+s.panels.filter(p=>state(p)==='missing').length,0),reused=all.reduce((n,s)=>n+s.panels.filter(p=>state(p)==='reused').length,0),approved=all.filter(s=>s.review==='approved').length;
 const selectedScene=scenes.find(x=>x.id===selected),s=selectedScene&&combined(selectedScene),categories=['all',...new Set(scenes.map(x=>x.category))];
 root.innerHTML='<section class="cse-shell"><header><div><small>OWNER QA · STORY PRESENTATION</small><h2>Comic Scene Editor</h2><p>Review all discovered story scenes without progressing a quest. Captions save as local drafts. Uploaded artwork publishes directly into the game.</p></div><div class="cse-actions"><button id="cseExport">EXPORT ALL DRAFTS</button><button id="cseClose">CLOSE</button></div></header>'+
 (warning?'<p class="cse-warning">'+esc(warning)+'</p>':'')+
 '<div class="cse-stats"><span><b>'+all.length+'</b> scenes</span><span><b>'+total+'</b> panels</span><span><b>'+missing+'</b> missing art</span><span><b>'+reused+'</b> reused art</span><span><b>'+approved+'</b> approved</span></div>'+
 '<div class="cse-columns"><aside class="cse-left"><div class="cse-filters"><input id="cseSearch" type="search" placeholder="Find a scene…" value="'+esc(filter)+'"><select id="cseGroup">'+categories.map(x=>'<option value="'+esc(x)+'" '+(x===group?'selected':'')+'>'+esc(x==='all'?'All story groups':x)+'</option>').join('')+'</select><label><input type="checkbox" id="cseGaps" '+(gaps?'checked':'')+'> Show artwork gaps only</label></div><div id="cseSceneList">'+listMarkup()+'</div></aside>'+
 '<main class="cse-right">'+(s?'<div class="cse-title"><small>'+esc(s.category)+' · '+esc(s.path)+(s.line?' : '+s.line:'')+'</small><h3>'+esc(s.title)+'</h3><p>'+esc(s.note||'Check every comic panel and its artwork.')+'</p></div><div class="cse-controls"><label>REVIEW<select id="cseReview"><option value="unreviewed" '+(s.review==='unreviewed'?'selected':'')+'>Unreviewed</option><option value="needs-work" '+(s.review==='needs-work'?'selected':'')+'>Needs work</option><option value="approved" '+(s.review==='approved'?'selected':'')+'>Approved</option></select></label><button id="csePreview">▶ PREVIEW STRIP</button><button id="cseSave" class="primary">SAVE DRAFT</button><button id="cseReset">RESET</button></div><div class="cse-panel-grid">'+s.panels.map(panelMarkup).join('')+'</div><footer><button id="cseCopy">COPY THIS SCENE</button><p id="cseMessage">Text drafts stay on this device; artwork uploads publish to all players.</p></footer>':'<p class="cse-empty">No scenes could be loaded.</p>')+'</main></div></section>';
 root.querySelectorAll('[data-cse-image]').forEach(img=>img.onerror=()=>{const art=img.getAttribute('src');if(!broken.has(art)){broken.add(art);render()}else{const badge=img.parentNode.querySelector('em');if(badge){badge.textContent='BROKEN IMAGE';badge.className='missing'}}});
 bind(s);showList()
}
function edited(){
 const raw=scenes.find(s=>s.id===selected);if(!raw)return null;
 const s=combined(raw);
 s.panels.forEach((p,i)=>{p.artwork=$('[data-art="'+i+'"]')?.value.trim()||'';p.title=$('[data-title="'+i+'"]')?.value||'';p.text=$('[data-text="'+i+'"]')?.value||''});
 s.review=$('#cseReview')?.value||'unreviewed';return s
}
function message(value){const m=$('#cseMessage');if(m)m.textContent=value}
function save(){
 const s=edited();if(!s)return;
 drafts[s.id]={review:s.review,panels:s.panels.map(p=>({artwork:p.artwork,title:p.title,text:p.text})),updatedAt:new Date().toISOString()};
 try{localStorage.setItem(KEY,JSON.stringify(drafts));render();message('Saved locally. Export drafts to update the source files.')}catch{message('Could not save locally; copy this scene to keep your edits.')}
}
async function copy(str){
 try{await navigator.clipboard.writeText(str);message('Copied to clipboard.')}catch{const t=document.createElement('textarea');t.value=str;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();message('Copied to clipboard.')}
}
function bindArtUploads(scene){
 const pending=new Map(),client=window.CellboundGame?.getSupabase?.();
 const root=$('#comicSceneEditorMount');
 const status=(index,text)=>{const item=root?.querySelector('[data-upload-status="'+index+'"]');if(item)item.textContent=text};
 root?.querySelectorAll('[data-upload-file]').forEach(input=>input.addEventListener('change',()=>{
  const index=Number(input.dataset.uploadFile),selectedFile=input.files?.[0];
  const button=root.querySelector('[data-upload-publish="'+index+'"]');
  if(button)button.disabled=true;
  pending.delete(index);
  if(!selectedFile)return;
  if(!['image/webp','image/jpeg','image/png','image/avif'].includes(selectedFile.type)){status(index,'Unsupported format. Use WebP, JPEG, PNG or AVIF.');return}
  if(selectedFile.size>8*1024*1024){status(index,'Image is too large. Maximum file size is 8 MB.');return}
  pending.set(index,selectedFile);if(button)button.disabled=false;
  status(index,'Selected '+selectedFile.name+'. Press Publish to replace this panel in the game.');
  const art=input.closest('.cse-panel')?.querySelector('.cse-art');
  if(art){
   let img=art.querySelector('img');
   if(!img){img=document.createElement('img');img.alt='Selected artwork preview';art.prepend(img)}
   const url=URL.createObjectURL(selectedFile);img.src=url;
   img.addEventListener('load',()=>URL.revokeObjectURL(url),{once:true})
  }
 }));
 root?.querySelectorAll('[data-upload-publish]').forEach(button=>button.addEventListener('click',async()=>{
  const index=Number(button.dataset.uploadPublish),chosen=pending.get(index),comic=window.CellboundComicScenes;
  if(!owner()||!chosen||!client||!comic?.sceneKey||!scene.config){status(index,'Scene is not linked to a live comic yet.');return}
  button.disabled=true;button.textContent='UPLOADING…';status(index,'Publishing comic artwork…');
  try{
   const user=await client.auth.getUser();
   if(user.error||!user.data?.user?.id)throw Error('Sign in as the owner to publish.');
   const sceneId=comic.sceneKey(scene.config),ext=({'image/webp':'webp','image/jpeg':'jpg','image/png':'png','image/avif':'avif'})[chosen.type];
   const path=sceneId+'/'+index+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,10)+'.'+ext;
   const stored=await client.storage.from('comic-scene-art').upload(path,chosen,{contentType:chosen.type,cacheControl:'31536000',upsert:false});
   if(stored.error)throw stored.error;
   const saved=await client.from('comic_scene_panel_art').upsert({scene_id:sceneId,panel_index:index,object_path:path,updated_by:user.data.user.id,updated_at:new Date().toISOString()},{onConflict:'scene_id,panel_index'});
   if(saved.error)throw saved.error;
   await comic.reloadArt();
   pending.delete(index);render();message('Artwork published. Players will see it the next time this story opens.');
  }catch(error){status(index,'Upload failed: '+(error?.message||String(error)));button.disabled=false;button.textContent='UPLOAD & PUBLISH'}
 }))
}
function bind(s){
 $('#cseClose').onclick=close;
 $('#cseExport').onclick=()=>copy(JSON.stringify({version:1,scenes:drafts},null,2));
 $('#cseSearch').oninput=e=>{filter=e.target.value;showList()};
 $('#cseGroup').onchange=e=>{group=e.target.value;showList()};
 $('#cseGaps').onchange=e=>{gaps=e.target.checked;showList()};
 if(!s)return;
 $('#cseSave').onclick=save;
 $('#cseReset').onclick=()=>{if(!confirm('Discard drafts for this scene?'))return;delete drafts[selected];localStorage.setItem(KEY,JSON.stringify(drafts));render()};
 $('#cseCopy').onclick=()=>{const value=edited();if(value)copy(JSON.stringify(value,null,2))};
 $('#csePreview').onclick=async()=>{
  if(!owner()||loading)return;
  const draft=edited(),renderer=window.CellboundComicScenes;
  if(!draft||!renderer?.show){message('Comic renderer unavailable.');return}
  loading=true;
  try{await renderer.show({...(s.config||{}),eyebrow:'OWNER PREVIEW · NO PROGRESS SAVED',
   title:s.config?.title||draft.title,subtitle:s.config?.subtitle||draft.speaker,panels:draft.panels,choices:[],reveals:[],
   progressive:true,storyOnly:true,allowSkip:true,skipLabel:'CLOSE',nextLabel:'NEXT →',continueLabel:'CLOSE PREVIEW →'})}
  finally{loading=false}
 }
}
async function open(){
 if(!owner()||loading)return;
 const root=$('#comicSceneEditorMount');if(!root)return;
 opened=true;root.hidden=false;loading=true;root.textContent='Scanning story scenes…';
 try{await window.CellboundComicScenes?.loadArt?.();await discover()}catch(e){warning=String(e)}
 loading=false;if(!opened)return;render();requestAnimationFrame(()=>root.scrollIntoView({behavior:'smooth',block:'start'}))
}
function close(){opened=false;const root=$('#comicSceneEditorMount');if(root){root.hidden=true;root.innerHTML=''}}
function access(){const e=$('#comicSceneEditorEntry');if(e)e.hidden=!owner();if(!owner())close()}
function init(){
 const e=$('#comicSceneEditorEntry');if(!e){setTimeout(init,150);return}
 e.querySelector('#openComicSceneEditor')?.addEventListener('click',open);
 window.addEventListener('cellbound:admin-status',access);
 window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='admin')access()});
 access()
}
window.CellboundComicSceneEditor={open,close,discover,list:()=>scenes.map(combined),isOwner:owner};
init()
})();
