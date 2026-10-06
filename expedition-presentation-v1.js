(()=>{
'use strict';
const VERSION='1.1.1';
const PROFILES={
  'ashen-vault':{name:'The Ashen Vault',eyebrow:'CURO HINTERLANDS · DUNGEON',tag:'THE OLD FORGE BREATHES AGAIN',theme:'ashen',motion:'forge',entry:'The party passes beneath the sealed forge doors and descends into the heat below.'},
  'hollow-sanctum':{name:'The Hollow Sanctum',eyebrow:'BLACKGLASS DEPTHS · DUNGEON',tag:'DESCEND BENEATH THE SANCTUM',theme:'hollow',motion:'descent',entry:'The seal gives way. Cold blackglass walls close around the party as the descent begins.'},
  'chaos-canyon':{name:'Chaos Canyon',eyebrow:'CANYON WILDS · DUNGEON',tag:'ENTER THE LIVING CANYON',theme:'canyon',motion:'canyon',entry:'The party moves between the canyon walls as corrupted roots twist across the path ahead.'},
  'blackout-station':{name:'Blackout Station',eyebrow:'ABANDONED GRID · DUNGEON',tag:'RESTORE POWER. SURVIVE THE STATION.',theme:'blackout',motion:'station',entry:'Emergency lights flicker awake as the party passes through the station bulkhead.'},
  'fractured-ages':{name:'The Fractured Ages',eyebrow:'TEMPORAL FRACTURE · DUNGEON',tag:'STEP BEYOND THE PRESENT',theme:'fractured',motion:'fracture',entry:'The lockbox tears open a path through time. The party steps through before the fracture can close.'}
};
let active=null,token=0;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function profile(id){return PROFILES[id]||{name:String(id||'Dungeon'),eyebrow:'CELLBOUND · EXPEDITION',tag:'BEGIN EXPEDITION',theme:'default',motion:'default',entry:'The party moves deeper into the expedition.'}}
function syncOpenClass(){
  const open=Boolean(document.querySelector('.cbx-transition'));
  document.body.classList.toggle('cbx-transition-open',open)
}
function remove(target=active){
  if(target?.isConnected)target.remove();
  if(active===target)active=null;
  syncOpenClass()
}
function clearAll(){
  document.querySelectorAll('.cbx-transition').forEach(node=>node.remove());
  active=null;document.body.classList.remove('cbx-transition-open')
}
function sceneMarkup(p){
  return '<div class="cbx-scene '+esc(p.motion)+'"><div class="cbx-depth far"></div><div class="cbx-depth mid"></div><div class="cbx-depth near"></div><div class="cbx-gate left"></div><div class="cbx-gate right"></div><div class="cbx-path"></div><div class="cbx-party"><i></i><i></i><i></i><i></i><i></i></div><div class="cbx-vignette"></div></div>'
}
async function enter(id,options={}){
  const my=++token;remove();const p=profile(id),difficulty=String(options.difficulty||'Normal');
  const root=document.createElement('div');root.className='cbx-transition cbx-enter theme-'+p.theme;root.dataset.expedition=id;root.dataset.startedAt=String(Date.now());
  root.innerHTML=sceneMarkup(p)+'<div class="cbx-copy"><small>'+esc(p.eyebrow)+'</small><h1>'+esc(p.name)+'</h1><b>'+esc(p.tag)+'</b><p>'+esc(p.entry)+'</p><span>'+esc(difficulty.toUpperCase())+' · EXPEDITION STARTING</span></div><div class="cbx-progress"><i></i></div>';
  document.body.appendChild(root);active=root;document.body.classList.add('cbx-transition-open');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(root.isConnected)root.classList.add('moving')}));
  const sequence=(async()=>{
    await wait(2150);
    if(my!==token||!root.isConnected)return;
    root.classList.add('arriving');
    await wait(550)
  })();
  try{
    await Promise.race([sequence,wait(3600)])
  }finally{
    remove(root)
  }
}
async function room(id,options={}){
  const rawKind=String(options.kind||'NEXT AREA'),isBoss=/boss|final/i.test(rawKind);
  if(options.index===0&&!options.force)return;
  if(!isBoss&&!options.force)return;
  const my=++token;remove();const p=profile(id),title=String(options.title||'Boss encounter'),index=Math.max(0,Number(options.index)||0),total=Math.max(index+1,Number(options.total)||index+1);
  const kind=isBoss?(/final/i.test(rawKind)?'FINAL BOSS':'BOSS AHEAD'):rawKind;
  const root=document.createElement('div');root.className='cbx-transition cbx-room cbx-boss-warning theme-'+p.theme;root.dataset.expedition=id;root.dataset.startedAt=String(Date.now());
  root.innerHTML='<div class="cbx-room-motion"><i></i><i></i><i></i></div><div class="cbx-room-copy"><small>'+esc(p.name.toUpperCase())+' · '+esc(kind)+'</small><h2>'+esc(title)+'</h2><span>'+(isBoss?'ENCOUNTER '+(index+1)+' / '+total+' · PREPARE':'AREA '+(index+1)+' / '+total)+'</span></div>';
  document.body.appendChild(root);active=root;document.body.classList.add('cbx-transition-open');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(root.isConnected)root.classList.add('moving')}));
  const duration=options.long?1100:720;
  const sequence=(async()=>{
    await wait(duration);
    if(my!==token||!root.isConnected)return;
    root.classList.add('arriving');
    await wait(220)
  })();
  try{
    await Promise.race([sequence,wait(duration+1500)])
  }finally{
    remove(root)
  }
}
function fullScreen(root){
  if(root?.classList)root.classList.add('cbx-expedition-host');
  document.body.classList.add('cbx-expedition-active')
}
function leave(root){
  if(root?.classList)root.classList.remove('cbx-expedition-host');
  const visible=[...document.querySelectorAll('.cb2d-backdrop,.hs2d-backdrop,.cc2d-backdrop,.bs2d-backdrop,.fa-backdrop,.quest-cb2d-backdrop')].some(x=>!x.hidden);
  if(!visible)document.body.classList.remove('cbx-expedition-active');
  remove()
}
window.addEventListener('pageshow',()=>{
  document.querySelectorAll('.cbx-transition').forEach(node=>{
    const started=Number(node.dataset.startedAt)||0;
    if(started&&Date.now()-started>5000)node.remove()
  });
  syncOpenClass()
});
window.addEventListener('pagehide',()=>{token++;clearAll()},{once:true});
window.CellboundExpeditionPresentation={VERSION,enter,room,fullScreen,leave,profiles:PROFILES};
})();