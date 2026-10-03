(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let Game=null,db=null,bound=false,reports=[],selectedPlayer=null,loading=false;
function adminReady(){return Boolean(window.CellboundAdmin?.isAdmin&&db)}
function opMessage(text,tone='ok'){const el=$('#adminBetaOpsMessage');if(!el)return;el.hidden=false;el.dataset.tone=tone;el.textContent=text}
function fmtDate(v){try{return new Date(v).toLocaleString()}catch{return''}}
function severity(v){return({low:'MINOR',medium:'NORMAL',high:'HIGH',blocker:'BLOCKER'})[v]||String(v||'').toUpperCase()}
function reportMarkup(r){
 const player=r.guild_name||r.email||String(r.user_id||'').slice(0,8);
 return '<article class="admin-beta-ticket" data-report="'+esc(r.id)+'" data-status="'+esc(r.status||'new')+'" data-severity="'+esc(r.severity||'medium')+'"><header><span><small>'+esc(severity(r.severity))+' · '+esc(String(r.category||'bug').toUpperCase())+'</small><b>'+esc(r.summary||'Report')+'</b><em>'+esc(player)+'</em></span><strong>'+esc(String(r.status||'new').replace('_',' ').toUpperCase())+'</strong></header><p>'+esc(r.details||'')+'</p><div class="admin-beta-meta"><span>'+esc(r.page_view||'unknown view')+'</span><span>'+esc(String(r.build_id||'').slice(0,12))+' #'+(Number(r.build_number)||0)+'</span><span>'+esc(fmtDate(r.created_at))+'</span></div><label><span>Team note</span><textarea data-admin-beta-note maxlength="2000">'+esc(r.admin_note||'')+'</textarea></label><div class="admin-beta-actions"><button data-beta-status="triaged">TRIAGE</button><button data-beta-status="in_progress">IN PROGRESS</button><button data-beta-status="fixed">FIXED</button><button data-beta-status="closed">CLOSE</button></div></article>'
}
function renderReports(){
 const root=$('#adminBetaReportQueue'),count=$('#adminBetaReportCount'),navCount=$('#adminNavReportCount');if(!root)return;
 const open=reports.filter(r=>!['fixed','closed'].includes(String(r.status||'new'))).length;
 const blockers=reports.filter(r=>String(r.severity)==='blocker'&&!['fixed','closed'].includes(String(r.status||'new'))).length;
 if(count)count.textContent=reports.length+' SHOWN';
 if(navCount)navCount.textContent=open+(open===1?' open':' open')+(blockers?' · '+blockers+' blocker'+(blockers===1?'':'s'):'');
 root.innerHTML=reports.length?reports.map(reportMarkup).join(''):'<div class="admin-beta-empty">No reports match this queue.</div>';
 root.querySelectorAll('[data-beta-status]').forEach(btn=>btn.addEventListener('click',()=>updateReport(btn.closest('[data-report]')?.dataset.report,btn.dataset.betaStatus,btn.closest('[data-report]')?.querySelector('[data-admin-beta-note]')?.value||'')))
}
async function refreshReports(){
 if(!adminReady()||loading)return;loading=true;
 const root=$('#adminBetaReportQueue');if(root)root.innerHTML='<div class="admin-beta-empty">Loading beta queue…</div>';
 try{
  const filter=$('#adminBetaStatus')?.value||'open',rpcStatus=filter==='open'?'':filter;
  const {data,error}=await db.rpc('cellbound_admin_beta_reports',{p_status:rpcStatus||null,p_limit:100});
  if(error)throw error;
  const rows=Array.isArray(data)?data:[];
  const severityRank={blocker:0,high:1,medium:2,low:3},statusRank={new:0,triaged:1,in_progress:2,fixed:3,closed:4};
  reports=rows
    .filter(r=>filter!=='open'||!['fixed','closed'].includes(String(r.status||'new')))
    .sort((a,b)=>(severityRank[a.severity]??9)-(severityRank[b.severity]??9)||(statusRank[a.status]??9)-(statusRank[b.status]??9)||new Date(b.created_at||0)-new Date(a.created_at||0));
  renderReports()
 }catch(error){reports=[];if(root)root.innerHTML='<div class="admin-beta-empty error">Could not load beta reports.</div>';console.warn('Admin beta queue unavailable',error)}
 finally{loading=false}
}
async function updateReport(id,status,note){
 if(!adminReady()||!id)return;
 const {error}=await db.rpc('cellbound_admin_update_beta_report',{p_report_id:id,p_status:status,p_note:note||''});
 if(error){opMessage(error.message||'Could not update beta report.','error');return}
 opMessage('Report moved to '+status.replace('_',' ')+'.','ok');await refreshReports()
}
function playerMarkup(p){
 return '<div class="admin-player-result"><header><span><small>SELECTED TESTER</small><b>'+esc(p.guild_name||'Unnamed guild')+'</b><em>'+esc(p.email||'')+'</em></span><strong>'+esc(String(p.user_id||'').slice(0,8))+'</strong></header><div><span><small>ROSTER</small><b>'+Number(p.roster_count||0)+'</b></span><span><small>CELL SHOCK</small><b>'+Number(p.cell_shock_affected||0)+' affected</b></span><span><small>ACTIVE DUNGEONS</small><b>'+Number(p.active_dungeon_attempts||0)+'</b></span><span><small>ONBOARDING</small><b>'+esc(p.onboarding_complete?'Complete':p.onboarding_stage||'Unknown')+'</b></span></div></div>'
}
function renderPlayer(){
 const root=$('#adminPlayerResult'),actions=$('#adminPlayerRecoveryActions');if(root)root.innerHTML=selectedPlayer?playerMarkup(selectedPlayer):'<div class="admin-beta-empty">Find a player by exact email, guild name or account ID.</div>';
 if(actions)actions.querySelectorAll('button').forEach(b=>b.disabled=!selectedPlayer)
}
async function lookupPlayer(){
 if(!adminReady())return;const input=$('#adminPlayerLookup'),value=String(input?.value||'').trim();if(value.length<3){opMessage('Enter an email, guild name or account ID.','error');return}
 const btn=$('#adminFindPlayer');if(btn)btn.disabled=true;
 try{
  const {data,error}=await db.rpc('cellbound_admin_player_lookup',{p_lookup:value});if(error)throw error;
  selectedPlayer=data||null;renderPlayer();opMessage('Tester account loaded. Recovery actions below only touch the selected problem area.','ok')
 }catch(error){selectedPlayer=null;renderPlayer();opMessage(error.message||'Player not found.','error')}
 finally{if(btn)btn.disabled=false}
}
async function recoverPlayer(action){
 if(!adminReady()||!selectedPlayer?.user_id)return;
 const labels={cell_shock:'clear Cell Shock',dungeon_attempts:'abandon stuck dungeon attempts',twelve_below:'restore Twelve Below attempts'};
 if(!confirm('Apply support recovery to '+(selectedPlayer.guild_name||selectedPlayer.email||'this tester')+'?\n\nAction: '+(labels[action]||action)+'\n\nThis is recorded by the account update timestamp.'))return;
 const root=$('#adminPlayerRecoveryActions');root?.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{
  const {data,error}=await db.rpc('cellbound_admin_recover_player',{p_user_id:selectedPlayer.user_id,p_action:action});if(error)throw error;
  selectedPlayer=data?.player||selectedPlayer;renderPlayer();opMessage('Recovery complete: '+(labels[action]||action)+'.','ok')
 }catch(error){opMessage(error.message||'Player recovery failed.','error')}
 finally{root?.querySelectorAll('button').forEach(b=>b.disabled=!selectedPlayer)}
}
function bind(){
 if(bound)return;bound=true;
 $('#adminBetaStatus')?.addEventListener('change',refreshReports);
 $('#adminBetaRefresh')?.addEventListener('click',refreshReports);
 $('#adminFindPlayer')?.addEventListener('click',lookupPlayer);
 $('#adminPlayerLookup')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();lookupPlayer()}});
 $('#adminPlayerRecoveryActions')?.querySelectorAll('[data-recover-player]').forEach(b=>b.addEventListener('click',()=>recoverPlayer(b.dataset.recoverPlayer)));
 window.addEventListener('cellbound:admin-status',e=>{if(e.detail?.isAdmin){refreshReports();renderPlayer()}});
 window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='admin'&&adminReady()){refreshReports();renderPlayer()}})
}
async function init(){
 Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,120);return}
 db=Game.getSupabase?.();if(!db)return;bind();renderPlayer();
 if(adminReady())refreshReports();
 window.CellboundAdminBetaOps={refreshReports,lookupPlayer}
}
init();
})();