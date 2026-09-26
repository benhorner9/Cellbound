/* Cellbound Town World v1 — world objects replace sidebar navigation. */
(()=>{
'use strict';
const game=()=>window.CellboundGame;
const go=view=>{
  if(game()?.switchView){game().switchView(view);return true}
  const legacy=document.querySelector('.sidebar .nav-btn[data-view="'+view+'"]');
  if(legacy){legacy.click();return true}
  return false
};
function activeView(){return document.querySelector('.view.active')?.id||'overview'}
function syncView(id=activeView()){
  document.body.classList.toggle('town-home-active',id==='overview');
  document.body.dataset.worldView=id;
  const title=document.querySelector('#pageTitle');
  if(id==='overview'&&title)title.textContent='Town';
}
function addReturnButtons(){
  document.querySelectorAll('.view').forEach(view=>{
    if(['overview','roster'].includes(view.id)||view.querySelector(':scope > [data-town-return]'))return;
    const b=document.createElement('button');
    b.type='button';b.className='world-return-town';b.dataset.townReturn='';b.innerHTML='<span>←</span> Return to Town';
    view.prepend(b);
  });
}
function mirror(sourceId,targetKey,fallback){
  const source=document.querySelector('#'+sourceId),targets=[...document.querySelectorAll('[data-town-status="'+targetKey+'"]')];
  const update=()=>{const value=(source?.textContent||'').trim();targets.forEach(n=>n.textContent=value||fallback||'')};
  update();
  if(source)new MutationObserver(update).observe(source,{childList:true,characterData:true,subtree:true,attributes:true});
}
function syncAdmin(){
  const legacy=document.querySelector('#adminNav'),button=document.querySelector('#worldAdminUtility');
  if(!button)return;
  button.hidden=!legacy||legacy.hidden;
}
function syncChat(){
  const source=document.querySelector('#chatNavBadge'),target=document.querySelector('#worldChatBadge');
  if(!target)return;
  const value=(source?.textContent||'').trim();target.textContent=value;target.hidden=!value;
}
function wireObservers(){
  const admin=document.querySelector('#adminNav');if(admin)new MutationObserver(syncAdmin).observe(admin,{attributes:true,attributeFilter:['hidden']});
  const chat=document.querySelector('#chatNavBadge');if(chat)new MutationObserver(syncChat).observe(chat,{childList:true,characterData:true,subtree:true});
  mirror('questNavBadge','quests','');
  mirror('homeDungeonStatus','content','Choose a dungeon');
  mirror('homeEventStatus','world','Explore');
  mirror('homeRaidStatus','raids','The Manor');
  syncAdmin();syncChat();
}
document.addEventListener('click',e=>{
  const destination=e.target.closest('[data-town-target]');
  if(destination){go(destination.dataset.townTarget);return}
  if(e.target.closest('[data-town-return]')){go('overview');return}
  const utility=e.target.closest('[data-world-utility]');
  if(utility){go(utility.dataset.worldUtility==='social'?'chat':'overview');return}
  if(e.target.closest('#worldAdminUtility')){go('admin');return}
  if(e.target.closest('#worldSignOut'))document.querySelector('#signOut')?.click();
});
window.addEventListener('cellbound:view-changed',e=>syncView(e.detail?.view));
window.addEventListener('cellbound:state-rendered',()=>{syncView();syncAdmin();syncChat()});
addReturnButtons();wireObservers();syncView();
window.CellboundTown={go,sync:()=>{syncView();syncAdmin();syncChat()}};
})();