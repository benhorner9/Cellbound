(()=>{
'use strict';
// PvP Map Studio: owner-only authoring on the shared Combat Reborn map contract.
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x)),api=()=>window.CellboundPvPMaps;
const owner=()=>Boolean(window.CellboundAdmin?.isAdmin)&&String(window.CellboundAdmin?.role||'').toLowerCase()==='owner';
const LOCAL='cellbound-owner-pvp-map-editor-v1';
let opened=false,selected='crucible-arena',draft=null,baseline='',busy=false,message='',selectedMarker='spawn-blue-0',grid=true,initialized=false;
const getLocal=()=>{try{return JSON.parse(localStorage.getItem(LOCAL)||'{}')||{}}catch{return{}}};
const localDrafts=getLocal();
const persist=()=>{if(!draft)return;localDrafts[draft.id]=clone(draft);try{localStorage.setItem(LOCAL,JSON.stringify(localDrafts))}catch{}};
const dirty=()=>Boolean(draft)&&JSON.stringify(draft)!==baseline;
function note(txt){message=txt;const label=$('#pmeMessage');if(label)label.textContent=txt}
function markerList(m){
 if(!m)return[];
 const l=m.layout,points=[];
 for(const team of ['blue','red'])l.spawns[team].forEach((p,i)=>points.push({key:'spawn-'+team+'-'+i,label:(team==='blue'?'Blue':'Red')+' spawn '+(i+1),kind:'spawn-'+team,...p}));
 if(m.mode==='capture-the-flag')for(const team of ['blue','red'])points.push({key:'flag-'+team,label:(team==='blue'?'Blue':'Red')+' flag',kind:'flag-'+team,...l.flags[team]});
 if(m.mode==='king-of-the-hill')for(const h of l.hills)points.push({key:'hill-'+h.id,label:'Hill · '+h.id,kind:'hill',...h});
 if(m.mode==='arena')points.push({key:'storm',label:'Cellstorm centre',kind:'storm',...l.storm});
 if(m.mode==='capture-the-flag')for(const name of ['left','mid','right'])points.push({key:'lane-'+name,label:name.toUpperCase()+' route waypoint',kind:'lane',...l.lanes[name]});
 l.blockers.forEach((p,i)=>points.push({key:'blocker-'+i,label:'Obstacle '+(i+1),kind:'blocker',...p}));
 return points
}
function getMarker(m,key){
 const list=markerList(m);return list.find(x=>x.key===key)||list[0]||null
}
function setMarker(m,key,x,y){
 const p={x:Math.max(2,Math.min(98,Math.round(x*10)/10)),y:Math.max(2,Math.min(98,Math.round(y*10)/10))};
 const a=key.split('-');
 if(a[0]==='spawn'&&['blue','red'].includes(a[1])&&a[2]>=0&&a[2]<5)Object.assign(m.layout.spawns[a[1]][Number(a[2])],p);
 else if(a[0]==='flag'&&m.layout.flags[a[1]])Object.assign(m.layout.flags[a[1]],p);
 else if(a[0]==='hill'){const target=m.layout.hills.find(h=>h.id===a[1]);if(target)Object.assign(target,p)}
 else if(a[0]==='storm')Object.assign(m.layout.storm,p);
 else if(a[0]==='lane'&&m.layout.lanes[a[1]])Object.assign(m.layout.lanes[a[1]],p);
 else if(a[0]==='blocker'&&m.layout.blockers[Number(a[1])])Object.assign(m.layout.blockers[Number(a[1])],p);
 persist()
}
function choose(id,{force=false}={}){
 if(dirty()&&!force&&!confirm('This PvP map has unsaved changes. Switch maps without saving?'))return false;
 const cloud=api()?.draft?.(id),published=api()?.get?.(id);
 const next=cloud||published;
 if(!next)return false;
 selected=id;
 draft=api().clean(clone(localDrafts[id]||next));
 baseline=JSON.stringify(api().clean(clone(cloud||published)));
 selectedMarker=markerList(draft)[0]?.key||'';message='';
 render();return true
}
function canLeave(){
 if(!dirty())return true;
 if(confirm('Leave PvP Maps with an unsaved local draft? It stays on this device, but is not published.')){persist();return true}
 return false
}
function artImage(m){return api()?.artUrl?.(m)||''}
function statusInfo(m){return api()?.isTesting?.(m?.id)?'TESTING ON OWNER':api()?.draft?.(m?.id)?'CLOUD DRAFT':'BUILT-IN / PUBLISHED'}
function markerMarkup(p){
 const col=p.kind.startsWith('spawn-blue')||p.kind==='flag-blue'?'blue':p.kind.startsWith('spawn-red')||p.kind==='flag-red'?'red':p.kind;
 return '<button type="button" class="pme-marker '+(selectedMarker===p.key?'active':'')+'" data-pme-marker="'+esc(p.key)+'" data-marker-kind="'+esc(col)+'" style="left:'+p.x+'%;top:'+p.y+'%" aria-label="'+esc(p.label)+'" title="'+esc(p.label)+'">'+esc(p.kind==='hill'?'H':p.kind==='storm'?'◎':p.kind==='blocker'?'■':p.kind==='lane'?'→':p.kind.startsWith('flag')?'⚑':String(Number(p.key.split('-').pop())+1))+'</button>'
}
function render(){
 const host=$('#pvpMapEditorMount');if(!host||!opened||!owner()||!api())return;
 if(!draft){host.innerHTML='<p>Loading PvP Maps…</p>';return}
 const m=draft,points=markerList(m),chosen=getMarker(m,selectedMarker);if(chosen)selectedMarker=chosen.key;
 const list=api().list('',{includeDrafts:true}),issues=api().validate(m);
 for(const [id,map] of Object.entries(localDrafts))if(!list.some(x=>x.id===id))try{list.push(api().clean(map))}catch{}
 const activeTest=api().isTesting(m.id);
 const art=artImage(m),mapOptions=list.map(row=>'<option value="'+esc(row.id)+'"'+(row.id===selected?' selected':'')+'>'+esc(row.title)+' · '+esc(row.mode)+'</option>').join('');
 const markerPicker=points.map(p=>'<option value="'+esc(p.key)+'"'+(p.key===selectedMarker?' selected':'')+'>'+esc(p.label)+'</option>').join('');
 host.innerHTML='<section class="pme-shell">'+
 '<header class="pme-head"><div><small>PVP · DESIGN BOOTH</small><h3>Map Studio</h3><p>Create arenas and battlegrounds. Upload the illustrated map, drag positions, test privately, then publish.</p></div><b class="pme-status">'+esc(statusInfo(m))+'</b></header>'+
 '<div class="pme-toolbar"><label>Editing map<select id="pmeMap">'+mapOptions+'</select></label><button type="button" id="pmeRefresh">Refresh Cloud</button><button type="button" id="pmeGrid">'+(grid?'Hide':'Show')+' Grid</button></div>'+
 '<details class="pme-create"><summary>Create another map</summary><div class="pme-create-fields"><label>Name<input id="pmeNewTitle" placeholder="e.g. Citadel Arena" maxlength="100"></label><label>Mode<select id="pmeNewMode"><option value="arena">Arena</option><option value="capture-the-flag">Capture the Flag</option><option value="king-of-the-hill">King of the Hill</option></select></label><button type="button" id="pmeCreate">Create Draft</button></div></details>'+
 '<div class="pme-layout"><div class="pme-stage-column">'+
 '<div class="pme-canvas '+(grid?'show-grid':'')+'" id="pmeCanvas" role="group" aria-label="PvP map layout canvas">'+
 '<img src="'+esc(art)+'" alt="" draggable="false">'+
 points.filter(p=>p.kind==='blocker').map(p=>'<div class="pme-blocker-area" style="left:'+p.x+'%;top:'+p.y+'%;width:'+Number(p.width||8)+'%;height:'+Number(p.height||8)+'%" aria-hidden="true"></div>').join('')+
 points.map(markerMarkup).join('')+'</div>'+
 '<p class="pme-map-hint">Drag the markers with a finger or Apple Pencil, or choose one then tap its destination. Positions use the same 0–100 battlefield coordinates as Combat Reborn.</p>'+
 '<div class="pme-legend"><span class="blue">● Blue spawns/flag</span><span class="red">● Red spawns/flag</span><span>◎ Storm</span><span>H Hill</span><span>→ Flag route</span><span>■ Cover</span></div>'+
 '<div class="pme-artwork"><div><h4>Map artwork</h4><p>16:9 illustrated overhead art works best. WebP, PNG, JPG or AVIF; max 10 MB.</p></div><label>Replace map background<input type="file" id="pmeArt" accept="image/webp,image/png,image/jpeg,image/avif" '+(busy?'disabled':'')+'></label><button type="button" id="pmeDefaultArt">Use existing Cellbound fallback</button></div>'+
 '</div><aside class="pme-settings">'+
 '<label>Map name<input id="pmeTitle" value="'+esc(m.title)+'" maxlength="100"></label>'+
 '<div class="pme-mode">Mode <b>'+esc(m.mode==='capture-the-flag'?'Capture the Flag':m.mode==='king-of-the-hill'?'King of the Hill':'Arena')+'</b><small>Mode is fixed for an existing map. Create a new map for another mode.</small></div>'+
 '<label>Edit position<select id="pmeMarker">'+markerPicker+'</select></label>'+
 (chosen?'<div class="pme-xy"><label>X %<input id="pmeX" type="number" min="2" max="98" step=".1" value="'+chosen.x+'"></label><label>Y %<input id="pmeY" type="number" min="2" max="98" step=".1" value="'+chosen.y+'"></label></div><p>Selected: <b>'+esc(chosen.label)+'</b></p>':'')+
 (chosen?.kind==='blocker'?'<div class="pme-xy"><label>Width %<input id="pmeW" type="number" min="2" max="35" value="'+(chosen.width||8)+'"></label><label>Height %<input id="pmeH" type="number" min="2" max="35" value="'+(chosen.height||8)+'"></label></div><button type="button" id="pmeRemoveBlocker">Remove cover</button>':'')+
 '<div class="pme-cover"><h4>Collision cover</h4><p>Add rectangular obstacles that block movement and sight in this map.</p><button type="button" id="pmeAddBlocker" '+(m.layout.blockers.length>=20?'disabled':'')+'>+ Add cover (max 20)</button></div>'+
 '<div class="pme-check"><h4>Map checklist</h4><p>'+(!issues.length?'✓ Valid map layout · all team spawns and mode objectives are set':issues.map(x=>'• '+esc(x)).join(' ') )+'</p></div>'+
 '<div class="pme-actions"><button type="button" id="pmeSave" '+(busy?'disabled':'')+'>Save Cloud Draft</button><button type="button" id="pmeTest" '+(busy?'disabled':'')+'>Test in Practice</button><button type="button" id="pmePublish" '+(busy||issues.length?'disabled':'')+'>Publish Map</button><button type="button" id="pmeClearTest" '+(!activeTest?'disabled':'')+'>Stop Owner Test</button><button type="button" id="pmeUnpublish" '+(!api().isPublished(m.id)||busy?'disabled':'')+'>Restore Built-in / Unpublish</button></div>'+
 '<small class="pme-warning">Save Draft is private. Test only affects your owner account. Publish updates staging PvP maps; it does not open public PvP or award rewards.</small>'+
 '<p id="pmeMessage" aria-live="polite">'+esc(message|| (dirty()?'Unsaved draft changes on this device.':'Map is ready for editing.'))+'</p>'+
 '</aside></div></section>';
 bind()
}
function bind(){
 $('#pmeMap')?.addEventListener('change',e=>{if(!choose(e.target.value))e.target.value=selected});
 $('#pmeMarker')?.addEventListener('change',e=>{selectedMarker=e.target.value;render()});
 $('#pmeTitle')?.addEventListener('input',e=>{draft.title=e.target.value;persist();note('Unsaved map name. Save Cloud Draft to retain on other devices.')});
 $('#pmeX')?.addEventListener('change',e=>{setMarker(draft,selectedMarker,Number(e.target.value),getMarker(draft,selectedMarker)?.y||50);render()});
 $('#pmeY')?.addEventListener('change',e=>{setMarker(draft,selectedMarker,getMarker(draft,selectedMarker)?.x||50,Number(e.target.value));render()});
 $('#pmeW')?.addEventListener('change',e=>changeBlocker('width',e.target.value));
 $('#pmeH')?.addEventListener('change',e=>changeBlocker('height',e.target.value));
 $('#pmeRemoveBlocker')?.addEventListener('click',()=>{const idx=Number(selectedMarker.split('-')[1]);draft.layout.blockers.splice(idx,1);selectedMarker='spawn-blue-0';persist();render()});
 $('#pmeAddBlocker')?.addEventListener('click',()=>{if(draft.layout.blockers.length>=20)return;draft.layout.blockers.push({x:50,y:50,width:8,height:8,blocksMovement:true,blocksLos:true});selectedMarker='blocker-'+(draft.layout.blockers.length-1);persist();render()});
 $('#pmeGrid')?.addEventListener('click',()=>{grid=!grid;render()});
 $('#pmeRefresh')?.addEventListener('click',async()=>{if(dirty()&&!confirm('Refresh cloud and keep your local unsaved draft?'))return;try{await api().refresh(true);if(!dirty()){choose(selected,{force:true})}else render();note('PvP cloud maps refreshed.')}catch(e){note('Cloud refresh failed: '+e.message)}});
 $('#pmeCreate')?.addEventListener('click',()=>{
  if(dirty()&&!canLeave())return;
  const title=String($('#pmeNewTitle')?.value||'').trim(),mode=$('#pmeNewMode')?.value;
  if(title.length<2){note('Enter a new map name.');return}
  const base=api().builtins().find(x=>x.mode===mode);
  const id=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,54)+'-'+Date.now().toString(36).slice(-5);
  try{
   const next=api().clean({...clone(base),id,title,mode});selected=id;draft=next;baseline='';
   selectedMarker='spawn-blue-0';persist();render();note('New map created locally. Save Cloud Draft before testing or publishing.')
  }catch(e){note(e.message)}
 });
 $('#pmeSave')?.addEventListener('click',()=>action(async()=>{await api().saveDraft(draft);baseline=JSON.stringify(api().clean(draft));persist();return'Cloud draft saved. Other owner devices can access it.'}));
 $('#pmeTest')?.addEventListener('click',()=>{
  try{api().clean(draft);api().setTest(draft);persist();render();note('OWNER TEST ON · Open PvP → Crucible Practice Room and select '+draft.title+'. You will see these positions and artwork.') }
  catch(e){note(e.message)}
 });
 $('#pmeClearTest')?.addEventListener('click',()=>{api().clearTest(draft.id);render();note('Owner map test ended.')});
 $('#pmePublish')?.addEventListener('click',()=>action(async()=>{const errors=api().validate(draft);if(errors.length)throw Error(errors[0]);await api().publish(draft);baseline=JSON.stringify(api().clean(draft));persist();return'PUBLISHED · owner Practice Room now uses this map. Public PvP remains locked.'}));
 $('#pmeUnpublish')?.addEventListener('click',()=>{if(!confirm('Unpublish this PvP map? Built-in maps revert to their original positions; custom maps disappear from the selection list.'))return;action(async()=>{await api().unpublish(draft.id);baseline=JSON.stringify(api().clean(draft));return'Map unpublished. Built-in defaults restored.'})});
 $('#pmeDefaultArt')?.addEventListener('click',()=>{draft.artPath='';persist();render();note('Built-in artwork restored in draft. Publish the map to make this change available.')});
 $('#pmeArt')?.addEventListener('change',e=>{const file=e.target.files?.[0];if(file)action(async()=>{draft=await api().uploadArt(draft,file);persist();return'Artwork uploaded to the owner draft. Save Cloud Draft, then Publish Map when ready.'})});
 const canvas=$('#pmeCanvas');if(!canvas)return;
 canvas.addEventListener('dragstart',e=>e.preventDefault());canvas.addEventListener('contextmenu',e=>e.preventDefault());
 const coords=e=>{const r=canvas.getBoundingClientRect();return{x:Math.max(2,Math.min(98,(e.clientX-r.left)/Math.max(1,r.width)*100)),y:Math.max(2,Math.min(98,(e.clientY-r.top)/Math.max(1,r.height)*100))}};
 canvas.addEventListener('click',e=>{
  if(e.target.closest('[data-pme-marker]'))return;
  if(!selectedMarker)return;
  const xy=coords(e);setMarker(draft,selectedMarker,xy.x,xy.y);render()
 });
 canvas.querySelectorAll('[data-pme-marker]').forEach(el=>{
  let dragging=false;
  const move=e=>{
   const p=coords(e);setMarker(draft,el.dataset.pmeMarker,p.x,p.y);
   el.style.left=p.x+'%';el.style.top=p.y+'%';
   const chosen=getMarker(draft,el.dataset.pmeMarker),ex=$('#pmeX'),ey=$('#pmeY');
   if(ex)ex.value=String(chosen.x);if(ey)ey.value=String(chosen.y);
  };
  el.addEventListener('pointerdown',e=>{
   e.preventDefault();e.stopPropagation();dragging=true;selectedMarker=el.dataset.pmeMarker;
   el.setPointerCapture?.(e.pointerId);move(e);
   canvas.querySelectorAll('[data-pme-marker]').forEach(x=>x.classList.toggle('active',x===el))
  });
  el.addEventListener('pointermove',e=>{if(dragging){e.preventDefault();move(e)}});
  el.addEventListener('pointerup',e=>{if(!dragging)return;dragging=false;e.preventDefault();e.stopPropagation();el.releasePointerCapture?.(e.pointerId);render()});
  el.addEventListener('pointercancel',e=>{dragging=false;render()})
 })
}
function changeBlocker(which,value){
 const index=Number(selectedMarker.split('-')[1]),b=draft.layout.blockers[index];if(!b)return;
 b[which]=Math.max(2,Math.min(35,Number(value)||8));persist();render()
}
async function action(fn){
 if(busy)return;busy=true;const host=$('#pvpMapEditorMount');host?.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{message=await fn();render()}
 catch(e){message='Action failed: '+String(e?.message||e);render()}
 finally{busy=false;render()}
}
async function open(){
 if(!owner())return;
 const host=$('#pvpMapEditorMount');if(!host)return;opened=true;host.hidden=false;
 if(!draft)choose(selected,{force:true});
 render();
 try{await api()?.refresh?.(true);
  if(!draft||!dirty())choose(selected,{force:true});
  else render()
 }catch(e){note('Cloud maps unavailable. Local drafts are still editable: '+e.message)}
}
function close(){opened=false;const host=$('#pvpMapEditorMount');if(host){host.hidden=true;host.innerHTML=''}}
window.CellboundPvPMapEditor=Object.freeze({open,close,canLeave,render,current:()=>clone(draft||{}),markerList,setMarker});
})();
