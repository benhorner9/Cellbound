(()=>{
'use strict';

const $=s=>document.querySelector(s);
let Game=null;
let db=null;
let status={is_admin:false,role:null,auto_clear_cell_shock:false};
let bound=false;

window.CellboundAdmin={autoClear:false,role:null,isAdmin:false};

function rosterStats(){
  const roster=Game?.getState?.()?.roster||[];
  const affected=roster.filter(c=>(Number(c.cellShock)||0)>0||c.cellShockLockedUntil).length;
  const peak=roster.reduce((n,c)=>Math.max(n,Number(c.cellShock)||0),0);
  return{roster,affected,peak};
}
function render(){
  const nav=$('#adminNav'),view=$('#admin'),badge=$('#adminRole'),auto=$('#adminAutoState'),shock=$('#adminShockSummary'),account=$('#adminAccount'),toggle=$('#adminAutoToggle');
  if(!status.is_admin){if(nav)nav.hidden=true;return}
  if(nav)nav.hidden=false;
  if(view)view.dataset.adminReady='1';
  if(badge)badge.textContent=String(status.role||'admin').toUpperCase();
  if(auto)auto.textContent=status.auto_clear_cell_shock?'ENABLED':'DISABLED';
  const rs=rosterStats();
  if(shock)shock.textContent=rs.affected?rs.affected+' affected · peak '+rs.peak+'%':'All clear · 0% Cell Shock';
  if(account)account.textContent=Game?.getUser?.()?.email||'Authenticated admin';
  if(toggle){
    toggle.textContent=status.auto_clear_cell_shock?'DISABLE AUTO-CLEAR':'ENABLE AUTO-CLEAR';
    toggle.dataset.enabled=status.auto_clear_cell_shock?'1':'0';
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
function bind(){
  if(bound)return;bound=true;
  $('#adminResetShock')?.addEventListener('click',resetShock);
  $('#adminAutoToggle')?.addEventListener('click',toggleAuto);
  $('#adminRefresh')?.addEventListener('click',async()=>{await refreshStatus();clearLocalShock();message('Admin status refreshed.','ok')});
  document.querySelector('.nav-btn[data-view="admin"]')?.addEventListener('click',()=>setTimeout(render,0));
}
async function init(){
  Game=window.CellboundGame;
  if(!Game?.ready){setTimeout(init,120);return}
  db=Game.getSupabase?.();
  if(!db)return;
  bind();
  await refreshStatus();
  setInterval(()=>{if(status.auto_clear_cell_shock)clearLocalShock()},500);
}
init();
})();