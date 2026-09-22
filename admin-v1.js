(()=>{
'use strict';

const $=s=>document.querySelector(s);
let Game=null;
let db=null;
let status={is_admin:false,role:null,auto_clear_cell_shock:false};
let bound=false;
let releaseStatus=null;
let marketStatus=null;

window.CellboundAdmin={autoClear:false,role:null,isAdmin:false};

function rosterStats(){
  const roster=Game?.getState?.()?.roster||[];
  const affected=roster.filter(c=>(Number(c.cellShock)||0)>0||c.cellShockLockedUntil).length;
  const peak=roster.reduce((n,c)=>Math.max(n,Number(c.cellShock)||0),0);
  return{roster,affected,peak};
}
function render(){
  const nav=$('#adminNav'),view=$('#admin'),badge=$('#adminRole'),auto=$('#adminAutoState'),shock=$('#adminShockSummary'),account=$('#adminAccount'),toggle=$('#adminAutoToggle'),build=$('#adminCurrentBuild'),published=$('#adminPublishedBuild');
  if(!status.is_admin){if(nav)nav.hidden=true;return}
  if(nav)nav.hidden=false;
  if(view)view.dataset.adminReady='1';
  if(badge)badge.textContent=String(status.role||'admin').toUpperCase();
  if(auto)auto.textContent=status.auto_clear_cell_shock?'ENABLED':'DISABLED';
  const twelve=$('#adminTwelveState'),tb=Game?.getState?.()?.twelveBelow||{},used=Math.max(0,Math.min(3,Number(tb.attemptsUsed)||0));
  if(twelve)twelve.textContent=used+' / 3 used · '+(3-used)+' remaining';
  const rs=rosterStats();
  if(shock)shock.textContent=rs.affected?rs.affected+' affected · peak '+rs.peak+'%':'All clear · 0% Cell Shock';
  if(account)account.textContent=Game?.getUser?.()?.email||'Authenticated admin';
  if(toggle){
    toggle.textContent=status.auto_clear_cell_shock?'DISABLE AUTO-CLEAR':'ENABLE AUTO-CLEAR';
    toggle.dataset.enabled=status.auto_clear_cell_shock?'1':'0';
  }
  if(build)build.textContent=String(window.CELLBOUND_BUILD||'development').slice(0,12)+' · #'+(Number(window.CELLBOUND_BUILD_NUMBER||0)||'—');
  if(published)published.textContent=releaseStatus?.build_id?(String(releaseStatus.build_id).slice(0,12)+' · #'+(releaseStatus.build_number||'—')):'Not published yet';
  const mg=$('#adminMarketGear'),mo=$('#adminMarketOrders'),mt=$('#adminMarketTrades'),mv=$('#adminMarketVolume'),mx=$('#adminMarketTax'),top=$('#adminMarketTop');
  if(mg)mg.textContent=marketStatus?String(Number(marketStatus.active_gear)||0):'—';
  if(mo)mo.textContent=marketStatus?((Number(marketStatus.buy_orders)||0)+' buy · '+(Number(marketStatus.sell_orders)||0)+' sell'):'—';
  if(mt)mt.textContent=marketStatus?String(Number(marketStatus.trades_24)||0):'—';
  if(mv)mv.textContent=marketStatus?(Number(marketStatus.volume_24)||0).toLocaleString()+'g':'—';
  if(mx)mx.textContent=marketStatus?(Number(marketStatus.tax_24)||0).toLocaleString()+'g':'—';
  if(top){
    const rows=Array.isArray(marketStatus?.top_items)?marketStatus.top_items:[];
    top.innerHTML=rows.length?rows.map((x,i)=>'<div><span>#'+(i+1)+' '+String(x.item_name||x.item_key||'Item')+'</span><b>'+Number(x.units||0).toLocaleString()+' units</b><em>'+Number(x.volume||0).toLocaleString()+'g</em></div>').join(''):'<span>No market history yet.</span>';
  }
}
function message(text,tone='ok'){
  const el=$('#adminMessage');if(!el)return;
  el.hidden=false;el.dataset.tone=tone;el.textContent=text;
}
function clearLocalShock(){
  if(!status.is_admin||!status.auto_clear_cell_shock||!Game?.ready)return false;
  const s=Game.getState(),roster=s?.roster||[];let changed=false;
  roster.forEach(c=>{
    if((Number(c.cellShock)||0)!==0||c.cellShockLockedUntil){
      c.cellShock=0;c.cellShockLockedUntil=null;changed=true;
    }
  });
  if(changed){Game.save();Game.renderAll();render()}
  return changed;
}
async function resetShock(){
  const btn=$('#adminResetShock');if(btn)btn.disabled=true;
  const {data,error}=await db.rpc('cellbound_admin_reset_my_cell_shock');
  if(btn)btn.disabled=false;
  if(error){message(error.message||'Could not reset Cell Shock.','error');return}
  if(data&&typeof data==='object')Game.replaceState(data);
  message('Cell Shock cleared for your entire roster.','ok');render();
}
function resetTwelveBelow(){
  if(!status.is_admin||!Game?.ready)return;
  const btn=$('#adminResetTwelve');
  if(btn){btn.disabled=true;btn.firstChild.textContent='RESETTING…'}
  try{
    const s=Game.getState();
    s.twelveBelow=s.twelveBelow&&typeof s.twelveBelow==='object'?s.twelveBelow:{};
    {const d=new Date();s.twelveBelow.date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
    s.twelveBelow.attemptsUsed=0;
    Game.save?.();
    Game.renderAll?.();
    window.CellboundTwelveBelow?.render?.();
    message('The Twelve Below daily timer has been reset. 3 / 3 attempts are available again.','ok');
    try{
      const task=Game.persistState?.();
      if(task&&typeof task.catch==='function')task.catch(error=>console.warn('Twelve Below admin reset background save failed',error));
    }catch(error){console.warn('Twelve Below admin reset background save failed',error)}
  }catch(error){
    message(error?.message||'Could not reset The Twelve Below timer.','error');
  }finally{
    if(btn){btn.disabled=false;btn.firstChild.textContent='RESET TWELVE BELOW TIMER'}
    render();
  }
}
async function freshStart(){
  const typed=prompt('This resets YOUR Cellbound testing account to a brand-new playable state.\n\nYour login and Admin access are preserved.\n\nType FRESH START to continue.');
  if(typed===null)return;
  if(String(typed).trim().toUpperCase()!=='FRESH START'){
    message('Fresh Start cancelled. The confirmation text did not match.','error');
    return;
  }
  if(!confirm('Final confirmation: reset your guild, character/tutorial progress, listings, groups and personal world-boss state?'))return;
  const btn=$('#adminFreshStart');
  if(btn){btn.disabled=true;btn.textContent='RESETTING ACCOUNT…'}
  try{
    await Game.persistState?.();
    const {data,error}=await db.rpc('cellbound_admin_fresh_start',{p_confirmation:'FRESH START'});
    if(error)throw error;
    localStorage.removeItem('cellbound-management-reboot-v3');
    localStorage.removeItem('cellbound-management-reboot-v2');
    sessionStorage.removeItem('cellbound-management-reboot-v3');
    sessionStorage.removeItem('cellbound-management-reboot-v2');
    location.replace('./guild.html?freshStart='+Date.now());
  }catch(error){
    if(btn){btn.disabled=false;btn.innerHTML='FRESH START<small>Reset your own account so onboarding and starting zones can be tested again.</small>'}
    message(error?.message||'Fresh Start failed. No reset was completed.','error');
  }
}
async function toggleAuto(){
  const btn=$('#adminAutoToggle'),next=!status.auto_clear_cell_shock;if(btn)btn.disabled=true;
  const {data,error}=await db.rpc('cellbound_admin_set_auto_clear_cell_shock',{p_enabled:next});
  if(btn)btn.disabled=false;
  if(error){message(error.message||'Could not change auto-clear.','error');return}
  status=data||{...status,auto_clear_cell_shock:next};
  window.CellboundAdmin.autoClear=Boolean(status.auto_clear_cell_shock);
  if(status.auto_clear_cell_shock)clearLocalShock();
  message(status.auto_clear_cell_shock?'Auto-clear enabled. Cell Shock will be removed while you test.':'Auto-clear disabled. Cell Shock will behave normally.','ok');
  render();
}
async function refreshStatus(){
  const {data,error}=await db.rpc('cellbound_admin_status');
  if(error){console.warn('Cellbound admin status unavailable',error);return}
  status=data||status;
  window.CellboundAdmin.isAdmin=Boolean(status.is_admin);
  window.CellboundAdmin.role=status.role||null;
  window.CellboundAdmin.autoClear=Boolean(status.auto_clear_cell_shock);
  render();
}
async function refreshRelease(){
  const {data,error}=await db.rpc('cellbound_release_status');
  if(error){console.warn('Release status unavailable',error);return}
  releaseStatus=data||null;
  render();
}
async function refreshMarket(){
  if(!status.is_admin)return;
  const {data,error}=await db.rpc('cellbound_admin_market_summary');
  if(error){console.warn('Market analytics unavailable',error);return}
  marketStatus=data||null;
  render();
}
async function publishUpdate(){
  const btn=$('#adminPublishUpdate'),input=$('#adminUpdateMessage');
  const build=String(window.CELLBOUND_BUILD||'').trim();
  const buildNumber=Number(window.CELLBOUND_BUILD_NUMBER||0)||0;
  if(!build||build==='development'||build.includes('__CELLBOUND_BUILD__')||buildNumber<=0){
    message('This build does not have a production release ID yet. Refresh after deployment finishes, then publish the update.','error');
    return;
  }
  if(!confirm('Publish this Cellbound build as required for all players? Active dungeon runs will be allowed to finish first.'))return;
  if(btn)btn.disabled=true;
  const note=(input?.value||'').trim()||'Cellbound has been updated. Load the latest version to continue.';
  const {data,error}=await db.rpc('cellbound_admin_publish_release',{p_build_id:build,p_build_number:buildNumber,p_message:note});
  if(btn)btn.disabled=false;
  if(error){message(error.message||'Could not publish update.','error');return}
  releaseStatus=data||{build_id:build,message:note};
  message('Update published. Older clients will be prompted as soon as they are out of active gameplay.','ok');
  render();
}
function bind(){
  if(bound)return;bound=true;
  $('#adminResetShock')?.addEventListener('click',resetShock);
  $('#adminResetTwelve')?.addEventListener('click',resetTwelveBelow);
  $('#adminFreshStart')?.addEventListener('click',freshStart);
  $('#adminAutoToggle')?.addEventListener('click',toggleAuto);
  $('#adminRefresh')?.addEventListener('click',async()=>{await refreshStatus();await Promise.all([refreshRelease(),refreshMarket()]);clearLocalShock();message('Admin status refreshed.','ok')});
  $('#adminPublishUpdate')?.addEventListener('click',publishUpdate);
  window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='admin')setTimeout(render,0)});
}
async function init(){
  Game=window.CellboundGame;
  if(!Game?.ready){setTimeout(init,120);return}
  db=Game.getSupabase?.();
  if(!db)return;
  bind();
  await refreshStatus();
  await Promise.all([refreshRelease(),refreshMarket()]);
  setInterval(()=>{if(status.auto_clear_cell_shock)clearLocalShock()},500);
}
init();
})();