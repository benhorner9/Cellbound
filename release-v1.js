(()=>{
'use strict';
const $=s=>document.querySelector(s);
let Game=null,db=null,timer=null,busy=false,lastRequired=null;
const currentBuild=()=>String(window.CELLBOUND_BUILD||'development');

function overlay(){
  let el=$('#cellboundUpdateGate');
  if(el)return el;
  el=document.createElement('div');
  el.id='cellboundUpdateGate';
  el.className='release-gate';
  el.hidden=true;
  el.innerHTML='<section><small>CELLBOUND UPDATE</small><h2>A new version is ready.</h2><p id="releaseGateMessage">Load the latest version to continue.</p><div class="release-builds"><span>Current build <b id="releaseCurrentBuild">—</b></span><span>Required build <b id="releaseRequiredBuild">—</b></span></div><button id="releaseLoadUpdate">LOAD UPDATE →</button><em>Your session will stay signed in.</em></section>';
  document.body.appendChild(el);
  el.querySelector('#releaseLoadUpdate').addEventListener('click',loadUpdate);
  return el;
}
function short(v){return String(v||'—').slice(0,12)}
async function loadUpdate(){
  const btn=$('#releaseLoadUpdate');if(btn){btn.disabled=true;btn.textContent='LOADING UPDATE…'}
  try{await Promise.race([Game?.persistState?.()||Promise.resolve(),new Promise(r=>setTimeout(r,1200))])}catch{}
  const url=new URL('./guild.html',location.href);
  url.searchParams.set('update',lastRequired||Date.now().toString());
  url.searchParams.set('t',Date.now().toString());
  location.replace(url.href);
}
function showGate(info){
  const el=overlay();lastRequired=info.build_id;
  $('#releaseGateMessage').textContent=info.message||'A new Cellbound update is ready. Load the latest version to continue.';
  $('#releaseCurrentBuild').textContent=short(currentBuild());
  $('#releaseRequiredBuild').textContent=short(info.build_id);
  el.hidden=false;document.documentElement.dataset.updateRequired='1';
}
function hideGate(){
  const el=$('#cellboundUpdateGate');if(el)el.hidden=true;
  delete document.documentElement.dataset.updateRequired;
}
async function check(){
  if(busy||!db)return;busy=true;
  try{
    const {data,error}=await db.rpc('cellbound_release_status');
    if(error){console.warn('Release status check failed',error);return}
    const required=String(data?.build_id||'').trim();
    if(required&&required!==currentBuild())showGate(data);
    else hideGate();
    window.CellboundRelease={
      currentBuild:currentBuild(),
      requiredBuild:required||null,
      message:data?.message||null,
      publishedAt:data?.published_at||null,
      refresh:check
    };
  }finally{busy=false}
}
async function init(){
  Game=window.CellboundGame;
  if(!Game?.ready){setTimeout(init,120);return}
  db=Game.getSupabase?.();
  if(!db)return;
  await check();
  timer=setInterval(check,5000);
  window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
}
init();
})();