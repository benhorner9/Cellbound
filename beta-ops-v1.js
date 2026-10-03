(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let Game=null,db=null,user=null,bound=false,loading=false,reportOrigin=null,launcherOpen=false;
const PATCH_NOTES=[
 {label:'Beta Operations',date:'3 Oct 2026',title:'Ready for real testers',items:[
  'Added an always-available Report Bug / Request button with automatic build and screen context.',
  'Added a private admin triage queue and safe recovery tools for stuck tester accounts.',
  'Hardened save recovery, repeated actions, dungeon resume and account verification links.',
  'Completed the beta progression, economy and UI polish passes.'
 ]},
 {label:'Founding Beta',date:'2 Oct 2026',title:'Launch content locked',items:[
  'Beta classes: Warrior, Paladin, Hunter, Rogue and Mage.',
  'All current dungeon content remains available as progression unlocks it.',
  'Null Complex opens after The Manor progression requirement is met.'
 ]}
];
function buildLabel(){
 const id=String(window.CELLBOUND_BUILD||'development'),number=Number(window.CELLBOUND_BUILD_NUMBER||0)||0;
 return id==='development'?'Development build':id.slice(0,12)+(number?' · #'+number:'')
}
function activeView(){return document.querySelector('.view.active')?.id||'unknown'}
function contextSnapshot(view=reportOrigin||activeView()){
 const state=Game?.getState?.()||{},party=Game?.getPartyCharacters?.()||[];
 return{url:location.pathname,view,viewport:{width:window.innerWidth,height:window.innerHeight},platform:navigator.platform||'',userAgent:String(navigator.userAgent||'').slice(0,320),rosterCount:Array.isArray(state.roster)?state.roster.length:0,partyCount:party.length,partyItemLevel:Number(Game?.partyItemLevel?.())||0,averagePartyLevel:Number(Game?.averagePartyLevel?.())||0,online:navigator.onLine!==false}
}
function statusLabel(v){return({new:'NEW',triaged:'TRIAGED',in_progress:'IN PROGRESS',fixed:'FIXED',closed:'CLOSED'})[v]||String(v||'NEW').toUpperCase()}
function severityLabel(v){return({low:'MINOR',medium:'NORMAL',high:'HIGH',blocker:'BLOCKER'})[v]||String(v||'NORMAL').toUpperCase()}
function setMessage(text,tone='ok'){const el=$('#betaReportMessage');if(!el)return;el.hidden=false;el.dataset.tone=tone;el.textContent=text}
function renderBuild(){
 const build=$('#betaSupportBuild');if(build)build.textContent=buildLabel();
 const current=$('#betaSupportView');if(current)current.textContent=(reportOrigin||activeView()).replace(/-/g,' ');
 const notes=$('#betaPatchNotes');if(notes)notes.innerHTML=PATCH_NOTES.map(note=>'<article class="beta-note"><header><span><small>'+esc(note.label)+'</small><b>'+esc(note.title)+'</b></span><em>'+esc(note.date)+'</em></header><ul>'+note.items.map(item=>'<li>'+esc(item)+'</li>').join('')+'</ul></article>').join('')
}
function setLauncherOpen(open){
 launcherOpen=Boolean(open);
 const root=$('#betaQuickReport'),trigger=$('#betaQuickReportTrigger'),menu=$('#betaQuickReportMenu');
 if(root)root.dataset.open=launcherOpen?'1':'0';
 if(trigger)trigger.setAttribute('aria-expanded',launcherOpen?'true':'false');
 if(menu)menu.hidden=!launcherOpen;
}
function ensureLauncher(){
 if($('#betaQuickReport'))return;
 const root=document.createElement('div');root.id='betaQuickReport';root.className='beta-quick-report';root.dataset.open='0';
 root.innerHTML='<button id="betaQuickReportTrigger" class="beta-quick-report-trigger" type="button" aria-expanded="false" aria-controls="betaQuickReportMenu"><span>!</span><b>REPORT BUG / REQUEST</b></button><div id="betaQuickReportMenu" class="beta-quick-report-menu" hidden><small>BETA FEEDBACK</small><button type="button" data-quick-report="bug"><span>!</span><div><b>Report a bug</b><em>Something is broken or not working.</em></div></button><button type="button" data-quick-report="feature"><span>+</span><div><b>Request a feature</b><em>Suggest an improvement or new idea.</em></div></button></div>';
 document.body.appendChild(root);
 root.querySelector('#betaQuickReportTrigger')?.addEventListener('click',()=>setLauncherOpen(!launcherOpen));
 root.querySelectorAll('[data-quick-report]').forEach(btn=>btn.addEventListener('click',()=>openReport(btn.dataset.quickReport)));
}
function openReport(kind='bug'){
 const from=activeView(),category=$('#betaReportCategory'),message=$('#betaReportMessage');
 if(from!=='support')reportOrigin=from;
 if(category)category.value=kind==='feature'?'feature':'bug';
 if(message)message.hidden=true;
 setLauncherOpen(false);
 Game?.switchView?.('support');
 renderBuild();
 setTimeout(()=>{
  const summary=$('#betaReportSummary');
  summary?.focus?.({preventScroll:true});
  $('#betaReportForm')?.scrollIntoView?.({behavior:'smooth',block:'start'});
 },40);
}
function reportCard(r){
 const stamp=r.created_at?new Date(r.created_at).toLocaleString():'';
 return '<article class="beta-ticket" data-status="'+esc(r.status)+'"><header><span><small>'+esc(severityLabel(r.severity))+' · '+esc(String(r.category||'bug').toUpperCase())+'</small><b>'+esc(r.summary||'Report')+'</b></span><em>'+esc(statusLabel(r.status))+'</em></header><p>'+esc(r.details||'No extra details supplied.')+'</p><footer><span>'+esc(stamp)+'</span><code>'+esc(String(r.id||'').slice(0,8))+'</code></footer>'+(r.admin_note?'<aside><small>TEAM NOTE</small>'+esc(r.admin_note)+'</aside>':'')+'</article>'
}
async function refreshReports(){
 if(loading||!db||!user)return;loading=true;
 const list=$('#betaMyReports'),count=$('#betaReportCount');if(list)list.innerHTML='<div class="beta-empty">Checking your reports…</div>';
 try{
  const {data,error}=await db.from('beta_reports').select('id,category,severity,summary,details,status,admin_note,created_at,updated_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20);
  if(error)throw error;const rows=Array.isArray(data)?data:[];
  if(count)count.textContent=rows.length?rows.length+' RECENT':'NONE YET';
  if(list)list.innerHTML=rows.length?rows.map(reportCard).join(''):'<div class="beta-empty"><b>No reports yet.</b><span>If something breaks, report it here rather than trying to work around it.</span></div>'
 }catch(error){if(list)list.innerHTML='<div class="beta-empty error">Could not load your beta reports.</div>';console.warn('Beta report history unavailable',error)}
 finally{loading=false}
}
async function submitReport(event){
 event?.preventDefault?.();if(!db||!user)return;
 const form=$('#betaReportForm'),submit=$('#betaReportSubmit'),category=$('#betaReportCategory')?.value||'bug',severity=$('#betaReportSeverity')?.value||'medium',summary=String($('#betaReportSummary')?.value||'').trim(),details=String($('#betaReportDetails')?.value||'').trim();
 if(summary.length<4){setMessage('Give the report a short title so we can find it later.','error');return}
 if(details.length<8){setMessage('Add a little more detail: what you did, what happened and what you expected.','error');return}
 if(submit){submit.disabled=true;submit.textContent='SENDING REPORT…'}
 const sourceView=reportOrigin||activeView();
 const payload={category,severity,summary,details,page_view:sourceView,build_id:String(window.CELLBOUND_BUILD||'development').slice(0,80),build_number:Number(window.CELLBOUND_BUILD_NUMBER||0)||0,context:contextSnapshot(sourceView)};
 try{
  const {data,error}=await db.from('beta_reports').insert(payload).select('id,created_at').single();if(error)throw error;
  if(form)form.reset();if($('#betaReportSeverity'))$('#betaReportSeverity').value='medium';
  setMessage('Report sent'+(data?.id?' · reference '+String(data.id).slice(0,8):'')+'. Thanks — it is now in the beta queue.','ok');reportOrigin=null;renderBuild();await refreshReports()
 }catch(error){setMessage(error?.message||'The report could not be sent. Try again after reconnecting.','error')}
 finally{if(submit){submit.disabled=false;submit.textContent='SEND BETA REPORT →'}}
}
function bind(){
 if(bound)return;bound=true;
 $('#betaReportForm')?.addEventListener('submit',submitReport);
 $('#betaRefreshReports')?.addEventListener('click',refreshReports);
 document.addEventListener('pointerdown',e=>{if(launcherOpen&&!e.target.closest?.('#betaQuickReport'))setLauncherOpen(false)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&launcherOpen)setLauncherOpen(false)});
 window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='support'){renderBuild();refreshReports()}});
 window.addEventListener('online',()=>{if(activeView()==='support')refreshReports()})
}
async function init(){
 Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,120);return}
 db=Game.getSupabase?.();user=Game.getUser?.();if(!db||!user)return;
 ensureLauncher();bind();renderBuild();refreshReports();window.CellboundBetaOps={refresh:refreshReports,patchNotes:PATCH_NOTES,contextSnapshot,openReport}
}
init();
})();