(()=>{
'use strict';

const CP=window.CellboundPortraits;
if(!CP?.portraitHTML)return;

const PLAYER_SELECTORS=[
  '[data-unit^="p-"]',
  '[data-hs^="p-"]',
  '[data-cc^="p-"]',
  '[data-bs^="p-"]',
  '[data-tb-unit^="p-"]',
  '[data-q-unit^="p-"]',
  '.wb2d-unit.own[data-unit-key]',
  '.pvp2d-unit[data-pvp2d-unit]'
].join(',');
const BOSS_SELECTOR='.cb2d-unit.enemy.boss';
const BOSS_ART=[
  {match:['the butler'],name:'The Butler',art:'./assets/manor/manor-butler.webp'},
  {match:['the maid','servant maid'],name:'The Maid',art:'./assets/manor/manor-maids.webp'},
  {match:['the engineer'],name:'The Engineer',art:'./assets/manor/manor-engineer.webp'},
  {match:['master of the manor'],name:'The Master of the Manor',art:'./assets/manor/manor-master.webp'},
  {match:['the vaultheart','vaultheart'],name:'The Vaultheart',art:'./assets/bosses/ashen-vault-vaultheart.webp'},
  {match:['the bound choir','bound choir'],name:'The Bound Choir',art:'./assets/bosses/hollow-sanctum-bound-choir.webp'},
  {match:['archdruid vorran','vorran'],name:'Archdruid Vorran',art:'./assets/bosses/chaos-canyon-vorran.webp'},
  {match:['dr. vex calder','dr vex calder','vex calder'],name:'Dr. Vex Calder',art:'./assets/bosses/blackout-station-calder.webp'},
  {match:['the old man','keeper of ages'],name:'The Old Man',art:'./assets/bosses/fractured-ages-old-man.webp'}
];

function roster(){
  const list=window.CellboundGame?.getState?.()?.roster,external=window.CellboundDungeon2D?.externalCharacters?.();
  const own=Array.isArray(list)?list:[],remote=Array.isArray(external)?external:[];
  return own.concat(remote.filter(c=>!own.some(x=>String(x?.id||'')===String(c?.id||''))));
}
function key(v){return String(v||'').trim().replace(/[^a-zA-Z0-9_-]+/g,'-')}
function unitName(el){
  const node=el.matches('.pvp2d-unit')?el.querySelector('.pvp2d-name>b'):
    el.matches('.wb2d-unit')?el.querySelector('.wb2d-unit-label'):
    el.querySelector(':scope > span');
  if(!node)return'';
  if(el.matches('.cb2d-unit')&&node.childNodes?.length)return String(node.childNodes[0]?.textContent||'').trim();
  return String(node.textContent||'').trim();
}
function refFor(el){
  if(el.dataset.unit?.startsWith('p-'))return el.dataset.unit.slice(2);
  if(el.dataset.hs?.startsWith('p-'))return el.dataset.hs.slice(2);
  if(el.dataset.cc?.startsWith('p-'))return el.dataset.cc.slice(2);
  if(el.dataset.bs?.startsWith('p-'))return el.dataset.bs.slice(2);
  if(el.dataset.tbUnit?.startsWith('p-'))return el.dataset.tbUnit.slice(2);
  if(el.dataset.qUnit?.startsWith('p-'))return el.dataset.qUnit.slice(2);
  if(el.matches('.wb2d-unit.own')&&el.dataset.unitKey?.startsWith('you-'))return el.dataset.unitKey.slice(4);
  if(el.matches('.pvp2d-unit')){
    const raw=String(el.dataset.pvp2dUnit||'');
    if(raw.startsWith('blue-'))return raw.slice(5);
    if(raw.startsWith('red-'))return raw.slice(4);
  }
  return'';
}
function findCharacter(el){
  const chars=roster(),ref=refFor(el),name=unitName(el);
  if(ref){
    const exact=chars.find(c=>String(c?.id||'')===ref);
    if(exact)return exact;
    const normalized=chars.find(c=>key(c?.id)===ref);
    if(normalized)return normalized;
  }
  if(name){
    const byName=chars.find(c=>String(c?.name||'').trim()===name);
    if(byName)return byName;
  }
  return null;
}
function bossProfile(el){
  if(!el?.matches?.(BOSS_SELECTOR))return null;
  const name=unitName(el).toLowerCase().replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
  return BOSS_ART.find(b=>b.match.some(alias=>name.includes(alias)))||null;
}
function mountBoss(el,boss){
  if(!el||!boss||el.classList.contains('cb-combat-has-boss-portrait'))return;
  el.classList.add('cb-combat-has-boss-portrait');
  const wrap=document.createElement('div');
  wrap.className='cb-combat-boss-portrait';
  wrap.setAttribute('aria-label',boss.name+' boss portrait');
  wrap.innerHTML='<img src="'+boss.art+'" alt="" draggable="false">';
  el.appendChild(wrap);
}

function mount(el,c){
  if(!el||!c||el.classList.contains('cb-combat-has-portrait'))return;
  const color=CP.CLASS_COLORS?.[c.class]||'#76d7d0';
  const html=CP.portraitHTML(c,{size:'fill',className:'cb-combat-face',label:(c.name||'Character')+' combat portrait'});
  if(!html)return;

  el.style.setProperty('--cb-combat-class',color);
  el.classList.add('cb-combat-has-portrait');

  if(el.matches('.pvp2d-unit')){
    const token=el.querySelector('.pvp2d-token');
    if(token)token.insertAdjacentHTML('beforeend','<div class="cb-combat-portrait">'+html+'</div>');
    return;
  }
  if(el.matches('.wb2d-unit')){
    el.insertAdjacentHTML('beforeend','<div class="cb-combat-portrait">'+html+'</div>');
    return;
  }
  el.insertAdjacentHTML('beforeend','<div class="cb-combat-portrait">'+html+'</div>');
}
function upgrade(root=document){
  if(root?.nodeType===1&&root.matches?.(PLAYER_SELECTORS)){
    const c=findCharacter(root);if(c)mount(root,c);
  }
  if(root?.nodeType===1&&root.matches?.(BOSS_SELECTOR)){
    const boss=bossProfile(root);if(boss)mountBoss(root,boss);
  }
  root?.querySelectorAll?.(PLAYER_SELECTORS).forEach(el=>{const c=findCharacter(el);if(c)mount(el,c)});
  root?.querySelectorAll?.(BOSS_SELECTOR).forEach(el=>{const boss=bossProfile(el);if(boss)mountBoss(el,boss)});
}
function refresh(){upgrade(document)}

const observer=new MutationObserver(records=>{
  records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1)upgrade(node)}));
});
function start(){
  observer.observe(document.body,{childList:true,subtree:true});
  refresh();
  setTimeout(refresh,350);
  setTimeout(refresh,1200);
}
if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});

window.CellboundCombatPortraits={refresh,upgrade,bosses:BOSS_ART,version:'1.1.0'};
})();