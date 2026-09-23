(()=>{
'use strict';
const media=window.matchMedia('(max-width:720px)');
let observer=null;

const GROUPS=[
  ['Guild',[['roster','♟','Roster'],['chat','◌','Social'],['professions','⚒','Professions']]],
  ['Adventure',[['endgame','◇','Endgame'],['world','✦','Events']]],
  ['Market',[['trading','⇄','Trading Post']]],
  ['Combat',[['pvp','⚔','PvP']]]
];

function nav(){return document.querySelector('.sidebar nav')}
function more(){return document.querySelector('[data-mobile-more]')}
function active(){return document.querySelector('.sidebar .nav-btn[data-view].active')}

function sheet(){
  let root=document.querySelector('#mobileNavSheet');
  if(root)return root;
  root=document.createElement('div');
  root.id='mobileNavSheet';
  root.className='mobile-nav-sheet';
  root.hidden=true;
  root.innerHTML='<button class="mobile-nav-sheet-backdrop" type="button" data-mobile-sheet-close aria-label="Close menu"></button>'+
    '<section class="mobile-nav-sheet-panel" role="dialog" aria-modal="true" aria-label="More destinations">'+
      '<header><div><small>GUILD COMMAND</small><b>More destinations</b></div><button type="button" data-mobile-sheet-close aria-label="Close menu">×</button></header>'+
      '<div class="mobile-nav-sheet-groups">'+GROUPS.map(([label,items])=>
        '<div class="mobile-nav-sheet-group"><small>'+label+'</small>'+
        items.map(([view,icon,name])=>'<button type="button" data-mobile-sheet-view="'+view+'"><span>'+icon+'</span><b>'+name+'</b><em>→</em></button>').join('')+
        '</div>').join('')+
        '<div class="mobile-nav-sheet-group mobile-admin-group" hidden><small>DEVELOPER</small><button type="button" data-mobile-sheet-view="admin"><span>⚙</span><b>Admin</b><em>→</em></button></div>'+
      '</div>'+
    '</section>';
  document.body.appendChild(root);
  root.addEventListener('click',e=>{
    const close=e.target.closest('[data-mobile-sheet-close]');
    if(close){closeSheet();return}
    const target=e.target.closest('[data-mobile-sheet-view]');
    if(!target)return;
    const original=document.querySelector('.sidebar .nav-btn[data-view="'+target.dataset.mobileSheetView+'"]');
    if(original&&!original.hidden){original.click();closeSheet()}
  });
  return root
}

function syncAdmin(){
  const root=sheet(),group=root.querySelector('.mobile-admin-group'),admin=document.querySelector('#adminNav');
  if(group)group.hidden=!admin||admin.hidden;
}
function openSheet(){
  if(!media.matches)return;
  const root=sheet();syncAdmin();root.hidden=false;
  document.documentElement.classList.add('mobile-nav-open');
  const button=more();if(button)button.setAttribute('aria-expanded','true');
  root.querySelector('[data-mobile-sheet-view]:not([hidden])')?.focus();
}
function closeSheet(){
  const root=document.querySelector('#mobileNavSheet');if(root)root.hidden=true;
  document.documentElement.classList.remove('mobile-nav-open');
  const button=more();if(button)button.setAttribute('aria-expanded','false');
}
function syncMoreActive(){
  const a=active(),button=more();
  if(!button)return;
  button.classList.toggle('active',!!a&&!a.hasAttribute('data-mobile-core'));
}
function sync(){
  document.documentElement.classList.toggle('cb-phone',media.matches);
  if(!media.matches)closeSheet();
  syncMoreActive();
}
function init(){
  const n=nav();if(!n){setTimeout(init,100);return}
  const button=more();
  button?.addEventListener('click',()=>document.querySelector('#mobileNavSheet')?.hidden===false?closeSheet():openSheet());
  observer=new MutationObserver(list=>{
    if(list.some(x=>x.type==='attributes'&&x.attributeName==='class'))syncMoreActive();
  });
  n.querySelectorAll('.nav-btn[data-view]').forEach(b=>observer.observe(b,{attributes:true,attributeFilter:['class']}));
  n.addEventListener('click',e=>{if(e.target.closest('.nav-btn[data-view]'))closeSheet()});
  media.addEventListener?.('change',sync);
  window.addEventListener('orientationchange',()=>setTimeout(sync,180));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
  sync();
}
init();
})();