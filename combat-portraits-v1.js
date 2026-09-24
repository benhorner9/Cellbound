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

function roster(){
  const list=window.CellboundGame?.getState?.()?.roster;
  return Array.isArray(list)?list:[];
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
function mount(el,c){
  if(!el||!c||el.classList.contains('cb-combat-has-portrait'))return;
  const color=CP.CLASS_COLORS?.[c.class]||'#76d7d0';
  const html=CP.portraitHTML(c,{size:'fill',className:'cb-combat-face',label:(c.name||'Character')+' combat portrait'});
  if(!html)return;

  el.style.setProperty('--cb-combat-class',color);
  el.classList.add('cb-combat-has-portrait');

  if(el.matches('.pvp2d-unit')){
    const token=el.querySelector('.pvp2d-token');
    if(token)token.insertAdjacentHTML('beforeend','<span class="cb-combat-portrait">'+html+'</span>');
    return;
  }
  if(el.matches('.wb2d-unit')){
    el.insertAdjacentHTML('beforeend','<span class="cb-combat-portrait">'+html+'</span>');
    return;
  }
  el.insertAdjacentHTML('beforeend','<span class="cb-combat-portrait">'+html+'</span>');
}
function upgrade(root=document){
  if(root?.nodeType===1&&root.matches?.(PLAYER_SELECTORS)){
    const c=findCharacter(root);if(c)mount(root,c);
  }
  root?.querySelectorAll?.(PLAYER_SELECTORS).forEach(el=>{const c=findCharacter(el);if(c)mount(el,c)});
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

window.CellboundCombatPortraits={refresh,upgrade};
})();