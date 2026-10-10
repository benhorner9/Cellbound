(()=>{
'use strict';
const db=()=>window.CellboundGame?.getSupabase?.();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const snapshots=new Map(),pending=new Map();
let access={role:'none',scopes:[],can_publish:false},userId='',status='Connecting to secure publishing…';
const token=(kind,key)=>kind+':'+key;
const localKey=(kind,key)=>'cellbound-booth-recovery-v1:'+userId+':'+token(kind,key);
async function rpc(action,kind='',key='',revision=0,payload={}){
 const client=db();if(!client)throw Error('Sign in before using the Design Booth.');
 const {data,error}=await client.rpc('cellbound_booth',{p_action:action,p_kind:kind,p_key:key,p_revision:revision,p_payload:payload});
 if(error)throw Error(error.code==='40001'?'Conflict: another save exists. Your recovery copy is retained. Reload and compare before saving.':error.message||'Secure workflow unavailable. No content was changed.');
 if(data==null)throw Error('The server did not confirm the operation.');
 return data;
}
async function connect(){
 try{
  const res=await db()?.auth?.getUser?.();const next=res?.data?.user?.id||'';
  if(next!==userId){snapshots.clear();pending.clear();userId=next}
  access=await rpc('access');
  await Promise.all((access.scopes||[]).filter(k=>can(k)).map(list));
  status='Secure workflow connected · '+access.role;
 }catch(e){access={role:'none',scopes:[],can_publish:false};status=e.message}
 window.dispatchEvent(new CustomEvent('cellbound:booth-access'));
 entry();return access;
}
const can=(kind,action='read')=>access.role==='owner'||(access.scopes?.includes(kind)&&
 (action==='read'||action==='edit'&&['editor','admin'].includes(access.role)||action==='approve'&&access.role==='admin'||action==='publish'&&access.role==='admin'&&access.can_publish));
async function get(kind,key){const result=await rpc('get',kind,key);snapshots.set(token(kind,key),result.draft||{revision:0});return result}
async function list(kind){const rows=await rpc('list',kind);for(const row of rows)if(!snapshots.has(token(kind,row.key)))snapshots.set(token(kind,row.key),row);return rows}
async function save(kind,key,payload,expectedRevision){
 if(!can(kind,'edit'))throw Error('You do not have editing permission for this content.');
 const id=token(kind,key);if(pending.has(id))throw Error('A save is still in progress. Please wait.');
 // Never silently reload the revision immediately before a write: that would
 // turn stale edits into an overwrite. Unknown documents use revision zero.
 const revision=expectedRevision??snapshots.get(id)?.revision??0;
 try{localStorage.setItem(localKey(kind,key),JSON.stringify({payload,revision,at:Date.now()}))}catch(e){throw Error('Recovery storage is full. Copy or export your changes before continuing.')}
 pending.set(id,true);
 try{
  const result=await rpc('save',kind,key,revision,payload);snapshots.set(id,result);
  localStorage.removeItem(localKey(kind,key));return result;
 }finally{pending.delete(id)}
}
async function transition(action,kind,key,payload={},expectedRevision){
 const id=token(kind,key),current=snapshots.get(id);
 if(!current)throw Error('Open the current draft before changing its status.');
 const result=await rpc(action,kind,key,expectedRevision??current.revision,payload);snapshots.set(id,result);
 if(['publish','rollback','archive'].includes(action)){
  window.dispatchEvent(new CustomEvent('cellbound:design-published'));
  await Promise.allSettled([window.CellboundDesignedContent?.refresh?.(true),window.CellboundRoomLayouts?.refresh?.(),window.CellboundBossDropTables?.refresh?.(true),window.CellboundPvPMaps?.refresh?.(true),window.CellboundComicScenes?.reloadArt?.()]);
 }
 return result;
}
async function submit(kind,key,payload,expectedRevision){await save(kind,key,payload,expectedRevision);return transition('submit',kind,key)}
function recovery(kind,key){try{return JSON.parse(localStorage.getItem(localKey(kind,key))||'null')}catch{return null}}
function legacy(row){const p=row.payload;return{...p,id:row.base?.id||row.key,status:row.base?.status||'draft',version:row.base?.version||1,blueprint:row.base?.blueprint||{},draft_blueprint:{...p.blueprint,title:p.title},updated_at:row.updated_at,workflow_revision:row.revision}}
async function records(kind){return(await list(kind)).map(legacy)}
async function saveLegacy(kind,payload,review=false,expectedRevision=0){const d=await(review?submit:save)(kind,payload.slug,payload,expectedRevision);return legacy(d)}
function diff(a,b,path=''){
 const out=[];for(const key of new Set([...Object.keys(a||{}),...Object.keys(b||{})])){
  const x=a?.[key],y=b?.[key],name=path?path+'.'+key:key;
  if(JSON.stringify(x)===JSON.stringify(y))continue;
  if(x&&y&&typeof x==='object'&&typeof y==='object')out.push(...diff(x,y,name));
  else out.push({field:name,before:x,after:y});
 }return out;
}
function comparison(changes){
 const value=v=>v==null?'Not set':typeof v==='object'?JSON.stringify(v,null,2):String(v);
 const label=p=>p.replace(/^blueprint\./,'').replace(/steps\.(\d+)/g,(_,n)=>'Stage '+(Number(n)+1)).replace(/panels\.(\d+)/g,(_,n)=>'Panel '+(Number(n)+1)).replace(/_/g,' ').replace(/\./g,' → ');
 return changes.length?'<div style="overflow-x:auto"><table><thead><tr><th>Changed field</th><th>Before</th><th>After</th></tr></thead><tbody>'+changes.map(c=>'<tr><th>'+esc(label(c.field))+'</th><td><pre>'+esc(value(c.before))+'</pre></td><td><pre>'+esc(value(c.after))+'</pre></td></tr>').join('')+'</tbody></table></div>':'<p>No content differences.</p>';
}
async function panel(){
 const host=document.querySelector('#dboWorkflow');if(!host)return;
 host.innerHTML='<p role="status">'+esc(status)+'</p>';
 try{
  const rows=(await Promise.all((access.scopes||[]).filter(k=>can(k)).map(list))).flat();
  host.innerHTML='<h3>Review & publishing</h3><p>Create → Save Draft → Preview → Submit for Review → Approve → Publish. Only this panel publishes changes. Archiving restores built-in content where available; version history retains the removed override.</p><p role="status" id="boothWorkflowMessage">'+esc(status)+'</p>'+rows.map((r,i)=>'<article class="booth-review"><b>'+esc(r.payload.title||r.key)+'</b><small>'+esc(r.kind+' · '+r.state+' · revision '+r.revision+' · '+new Date(r.updated_at).toLocaleString())+'</small><div>'+['compare','history',...(access.role==='owner'&&r.base?['archive']:[]),...(r.state==='draft'&&can(r.kind,'edit')?['submit']:[]),...(r.state==='review'&&can(r.kind,'approve')?['approve']:[]),...(r.state==='approved'&&can(r.kind,'publish')?['publish']:[])].map(a=>'<button type="button" data-booth-action="'+a+'" data-row="'+i+'">'+a.toUpperCase()+'</button>').join('')+'</div><div data-booth-details="'+i+'"></div></article>').join('')+(access.role==='owner'?'<details><summary>Contributor permissions</summary><p>Use the contributor’s verified account UUID. These permissions never grant game admin access. Revoking access takes effect on the next server request.</p><label>Account UUID<input id="boothMemberId" autocomplete="off"></label><label>Role<select id="boothMemberRole"><option>viewer</option><option>editor</option><option>admin</option></select></label><label>Content scopes<select multiple id="boothMemberScopes">'+access.scopes.map(k=>'<option value="'+esc(k)+'">'+esc(k)+'</option>').join('')+'</select></label><label><input type="checkbox" id="boothMemberPublish"> Allow admin publishing</label><button id="boothGrant">SAVE PERMISSIONS</button><button id="boothRevoke">REVOKE ACCESS</button><pre id="boothMembers"></pre></details>':'');
  host.insertAdjacentHTML('afterbegin','<p role="note"><strong>Shared game database:</strong> publishing, archiving and rollback affect both dev and main game content. Drafts and previews remain unpublished.</p>');
  const message=text=>{const el=host.querySelector('#boothWorkflowMessage');if(el)el.textContent=text};
  host.querySelectorAll('[data-booth-action]').forEach(button=>button.onclick=async()=>{
   const index=Number(button.dataset.row),row=rows[index],action=button.dataset.boothAction,details=host.querySelector('[data-booth-details="'+index+'"]');button.disabled=true;
   try{
    if(action==='compare'){
     const changes=diff(row.base||{},row.payload);
     details.innerHTML='<h4>Published version → draft</h4>'+comparison(changes)+'<p>Use the editor’s Preview or Test action to check appearance before approval.</p>';
    }else if(action==='history'){
     const history=await rpc('history',row.kind,row.key);
     details.innerHTML=history.map((h,j)=>'<details><summary>'+esc(h.action+' · '+h.at+' · '+h.actor)+'</summary>'+comparison(diff(h.before_data,h.after_data))+(access.role==='owner'&&h.before_data?'<button data-rollback="'+j+'">RESTORE PREVIOUS VERSION</button>':'')+'</details>').join('')||'<p>No publications yet.</p>';
     details.querySelectorAll('[data-rollback]').forEach(b=>b.onclick=async()=>{
      const h=history[Number(b.dataset.rollback)];
      if(!confirm('Restore the version before '+h.at+' in the shared dev/main database? The current published version will also be preserved in history.'))return;
      b.disabled=true;try{await transition('rollback',row.kind,row.key,{history_id:h.id},row.revision);await panel()}catch(e){message(e.message);b.disabled=false}
     });
    }else{
     if(!confirm(action.toUpperCase()+' revision '+row.revision+' of '+(row.payload.title||row.key)+'?'+(['publish','archive'].includes(action)?' This changes shared dev AND main game content. Archiving retains history.':'')))return;
     await transition(action,row.kind,row.key,{},row.revision);await panel();
    }
   }catch(e){message(e.message)}finally{button.disabled=false}
  });
  if(access.role==='owner'){
   const members=await rpc('members');host.querySelector('#boothMembers').textContent=JSON.stringify(members,null,2);
   for(const action of ['grant','revoke'])host.querySelector(action==='grant'?'#boothGrant':'#boothRevoke').onclick=async()=>{
    const payload={user_id:host.querySelector('#boothMemberId').value.trim(),role:host.querySelector('#boothMemberRole').value,scopes:[...host.querySelector('#boothMemberScopes').selectedOptions].map(o=>o.value),can_publish:host.querySelector('#boothMemberPublish').checked};
    if(!/^[0-9a-f-]{36}$/i.test(payload.user_id)){message('Enter a verified account UUID.');return}
    if(!confirm('Confirm '+action+' for account '+payload.user_id+'?'))return;
    try{await rpc(action,'','',0,payload);await panel()}catch(e){message(e.message)}
   };
  }
 }catch(e){host.innerHTML='<p role="alert">'+esc(e.message)+'</p>'}
}
function entry(){
 let button=document.querySelector('#boothContributorEntry');
 const available=access.role!=='owner'&&(access.scopes||[]).some(k=>can(k));
 if(!button){button=document.createElement('button');button.id='boothContributorEntry';button.textContent='DESIGN BOOTH';document.body.appendChild(button);button.onclick=()=>{
  let overlay=document.querySelector('#boothContributorOverlay');
  if(!overlay){overlay=document.createElement('section');overlay.id='boothContributorOverlay';document.body.appendChild(overlay)}
  const mount=document.querySelector('#designBoothMount');if(!mount)return;
  overlay.appendChild(mount);overlay.hidden=false;window.CellboundDesignBooth.open();
 }}
 button.hidden=!available;
 if(!available&&access.role!=='owner'){const overlay=document.querySelector('#boothContributorOverlay');if(overlay)overlay.hidden=true}
}
window.CellboundBoothWorkflow={connect,can,get,list,save,submit,transition,records,saveLegacy,recovery,diff,panel,access:()=>({...access}),user:()=>userId,status:()=>status};
window.addEventListener('cellbound:admin-status',connect);
window.addEventListener('beforeunload',e=>{if(pending.size){e.preventDefault();e.returnValue=''}});
})();
