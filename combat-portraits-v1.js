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
const MONSTER_SELECTOR='.cb2d-unit.enemy,.quest-cb2d-unit.enemy,.tb-unit.enemy,.wb2d-unit.enemy';
const BOSS_ART=[
  {match:['silas vane'],name:'Silas Vane',art:'./assets/bosses/no-way-back-silas-vane-v3.jpg'},
  {match:['three hounds'],name:'The Three Hounds',art:'./assets/bosses/no-way-back-three-hounds-v3.jpg'},
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
  el.querySelector('.cb-combat-monster-portrait')?.remove();el.classList.remove('cb-combat-has-monster-portrait');
  el.classList.add('cb-combat-has-boss-portrait');
  const wrap=document.createElement('div');
  wrap.className='cb-combat-boss-portrait';
  wrap.setAttribute('aria-label',boss.name+' boss portrait');
  wrap.innerHTML='<img src="'+boss.art+'" alt="" draggable="false">';
  el.appendChild(wrap);
}

// Vector miniatures are a lightweight fallback only; dedicated encounter art wins.
const MONSTERS={
 spider:{match:/spider|arachn|weaver/,color:'#b1b67e',path:'M24 24L10 12M24 30L5 25M24 36L5 43M25 42L12 56M40 24L54 12M40 30L59 25M40 36L59 43M39 42L52 56',body:'<ellipse cx="32" cy="38" rx="12" ry="17"/><circle cx="32" cy="20" r="9"/>'},
 undead:{match:/undead|skeleton|bone|ghoul|wraith|hollow/,color:'#c7c7ac',path:'M22 43V53H42V43M27 44V52M36 44V52M22 27L28 30M42 27L36 30M29 39L32 35L35 39',body:'<path d="M16 29Q12 10 32 9Q52 10 48 29L42 43H22Z"/>'},
 demon:{match:/demon|fiend|fel|infernal/,color:'#bd756b',path:'M17 24L9 7L27 19M47 24L55 7L37 19M20 30L28 32M44 30L36 32M25 43L32 47L39 43',body:'<path d="M15 24L32 15L49 24L43 48L32 57L21 48Z"/>'},
 beast:{match:/hound|wolf|beast|rat|boar|claw|fang/,color:'#b99b79',path:'M18 28L12 8L28 22M46 28L52 8L36 22M22 33L27 35M42 33L37 35M26 46L32 50L38 46',body:'<path d="M15 29L32 20L49 29L43 48L32 57L21 48Z"/>'},
 machine:{match:/turret|machine|construct|drone|automaton|engine|sentry/,color:'#8daeb6',path:'M12 22H5M12 42H5M52 22H59M52 42H59M25 18V4H39V18M22 40H42M23 48H41',body:'<rect x="12" y="17" width="40" height="38" rx="7"/><circle cx="32" cy="29" r="7"/>'},
 caster:{match:/mage|caster|witch|cult|acolyte|priest|shaman|healer|sorcer/,color:'#b9a0cc',path:'M22 29L27 31M42 29L37 31M27 40H37M14 50L7 58M50 50L57 58',body:'<path d="M9 51L18 20L32 6L46 20L55 51L43 45L32 54L21 45Z"/><path d="M22 26H42L39 42H25Z"/>'},
 knight:{match:/knight|guard|sentinel|soldier|warden|armou?r/,color:'#a4afbd',path:'M16 28H48M32 11V45M20 33H44M22 47L32 55L42 47',body:'<path d="M13 28Q13 8 32 8Q51 8 51 28L45 48L32 58L19 48Z"/>'},
 brute:{match:/.*/,color:'#b9a18a',path:'M18 28L27 31M46 28L37 31M22 42L27 46H37L42 42M23 46V39M41 46V39',body:'<path d="M13 23L23 10H41L51 23L48 46L39 57H25L16 46Z"/>'}
};
function mountMonster(el){
 if(!el||el.querySelector('.cb-combat-boss-portrait,.cb-combat-monster-portrait,img,svg'))return;
 const name=unitName(el)||el.getAttribute('aria-label')||'Creature';
 const entry=Object.entries(MONSTERS).find(([,v])=>v.match.test(name.toLowerCase()));const [key,m]=entry;
 const n=document.createElement('div');n.className='cb-combat-monster-portrait';n.setAttribute('aria-label',name+' portrait');
 n.style.setProperty('--monster-color',m.color);n.dataset.monster=key;
 n.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="var(--monster-color)" stroke="#172128" stroke-width="2.5" stroke-linejoin="round">'+m.body+'<path d="'+m.path+'" fill="none" stroke="var(--monster-color)" stroke-width="3"/></g></svg>';
 el.classList.add('cb-combat-has-monster-portrait');el.appendChild(n);
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
  if(root?.nodeType===1&&root.matches?.(MONSTER_SELECTOR))mountMonster(root);
  root?.querySelectorAll?.(MONSTER_SELECTOR).forEach(mountMonster);
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

window.CellboundCombatPortraits={refresh,upgrade,bosses:BOSS_ART,monsters:MONSTERS,version:'1.2.0'};
})();