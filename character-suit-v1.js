(()=>{
'use strict';

const VERSION=1;
const ENGINE='character-suit-v1';
const ATLAS='./assets/characters/character-suit-atlas-v1.webp';
const RACES={
  Veyren:{accent:'#8e69d7',label:'Arcane detail',trait:'Adaptable',crop:{male:[18,64,122,348],female:[126,64,124,348]}},
  Stoneborn:{accent:'#d5b675',label:'Stone ridge',trait:'Unyielding',crop:{male:[274,64,142,348],female:[402,64,108,348]}},
  Aelari:{accent:'#55c8ff',label:'Ear style',trait:'Soul Attuned',crop:{male:[529,64,128,348],female:[642,64,126,348]}},
  Thornkin:{accent:'#7ab969',label:'Growth',trait:'Living Guard',crop:{male:[783,64,126,348],female:[900,64,116,348]}},
  Emberkin:{accent:'#ff7548',label:'Flame crown',trait:'Fierce Blood',crop:{male:[1025,64,128,348],female:[1138,64,136,348]}},
  Nymari:{accent:'#58d8e8',label:'Fin crest',trait:'Quickmind',crop:{male:[1281,64,127,348],female:[1395,64,141,348]}}
};
const FIELDS={
  gender:2,frame:3,skinTone:6,face:4,hair:4,hairColor:6,marking:5,eyes:6,feature:4
};
const FRAME_NAMES=['Lean','Balanced','Strong'];
const GENDER_NAMES=['Male','Female'];
const HAIR_NAMES=['Natural','Swept','Long','Cropped'];

function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function clampIndex(v,max,fallback=0){const n=Number(v);return Number.isInteger(n)&&n>=0&&n<max?n:fallback}
function hash(s){let h=2166136261;for(const ch of String(s||'cellbound')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function seeded(seed,key,count){return hash(String(seed||'cellbound')+'|'+key)%count}
function raceDef(race){return RACES[race]||RACES.Veyren}
function genderName(v){return GENDER_NAMES[clampIndex(v,2,0)]}
function frameName(v){return FRAME_NAMES[clampIndex(v,3,1)]}

function normalizeAppearance(input,seed,raceOverride){
  const src=input&&typeof input==='object'?input:{};
  const race=RACES[raceOverride]?raceOverride:(RACES[src.race]?src.race:'Veyren');
  const out={...src,race,engine:ENGINE,version:VERSION};
  for(const [field,count] of Object.entries(FIELDS)){
    out[field]=clampIndex(src[field],count,seeded(seed||src.seed||race,field,count));
  }
  return out;
}
function randomAppearance(race='Veyren'){
  const out={race:RACES[race]?race:'Veyren',engine:ENGINE,version:VERSION};
  for(const [field,count] of Object.entries(FIELDS))out[field]=Math.floor(Math.random()*count);
  return out;
}
function migrateLegacy(input,seed,race){
  return normalizeAppearance(input,seed,race||input?.race);
}

function cropFor(a){
  const r=raceDef(a.race),g=a.gender===1?'female':'male';
  return r.crop[g];
}
function frameScale(a){return [0.92,1,1.08][clampIndex(a.frame,3,1)]}
function toneFilter(a){
  const tone=clampIndex(a.skinTone,6,2);
  const brightness=[.84,.92,1,1.06,1.12,1.18][tone];
  const saturation=[.88,.94,1,1.03,1.06,1.09][tone];
  return `brightness(${brightness}) saturate(${saturation})`;
}
function hairFilter(a){
  const idx=clampIndex(a.hairColor,6,0);
  const hue=[0,18,-14,34,-32,8][idx];
  return `hue-rotate(${hue}deg)`;
}
function markingSVG(a){
  const r=raceDef(a.race),m=clampIndex(a.marking,5,0);
  if(!m)return '';
  const o=[.32,.42,.52,.62][Math.min(3,m-1)],accent=r.accent;
  let paths='';
  if(a.race==='Stoneborn')paths='<path d="M39 55 l8 7 -6 8 8 9 -7 10 M61 53 l-7 8 7 8 -8 10 7 10 M42 136 l8 9 -7 12 9 10 M59 136 l-8 9 7 12 -9 10" />';
  else if(a.race==='Thornkin')paths='<path d="M35 54 q18 13 8 31 t4 31 M65 54 q-18 13 -8 31 t-4 31 M41 130 q-8 18 1 37 M59 130 q8 18 -1 37" /><path d="M40 73 l-7 -3 5 7 M59 86 l7 -3 -5 7 M43 151 l-7 2 5 5" />';
  else if(a.race==='Emberkin')paths='<path d="M39 53 l8 8 -6 9 9 9 -7 11 8 9 M62 53 l-8 8 6 9 -9 9 7 11 -8 9 M43 132 l7 10 -6 12 8 12 M57 132 l-7 10 6 12 -8 12" />';
  else if(a.race==='Nymari')paths='<path d="M37 60 q13 10 6 25 t4 25 M63 60 q-13 10 -6 25 t-4 25 M42 142 q10 8 2 20 M58 142 q-10 8 -2 20" /><circle cx="34" cy="83" r="1.5"/><circle cx="66" cy="83" r="1.5"/>';
  else if(a.race==='Aelari')paths='<path d="M41 54 l9 9 9 -9 M39 79 q11 10 22 0 M44 141 l6 7 6 -7 M44 162 l6 7 6 -7" />';
  else paths='<path d="M39 56 q11 10 22 0 M36 84 q14 13 28 0 M42 141 q8 10 1 21 M58 141 q-8 10 -1 21" />';
  return `<svg class="cs-marking" viewBox="0 0 100 200" aria-hidden="true"><g fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="${o}">${paths}</g></svg>`;
}
function featureOverlay(a){
  const level=clampIndex(a.feature,4,0);
  if(!level)return '';
  const r=raceDef(a.race),opacity=.16+level*.08;
  if(a.race==='Stoneborn')return `<span class="cs-feature cs-feature--stone" style="--f:${opacity}"></span>`;
  if(a.race==='Thornkin')return `<span class="cs-feature cs-feature--thorn" style="--f:${opacity}"></span>`;
  if(a.race==='Emberkin')return `<span class="cs-feature cs-feature--ember" style="--f:${opacity}"></span>`;
  if(a.race==='Nymari')return `<span class="cs-feature cs-feature--nymari" style="--f:${opacity}"></span>`;
  return `<span class="cs-feature cs-feature--arcane" style="--f:${opacity};--race-accent:${r.accent}"></span>`;
}

function spriteSVG(a,opts={}){
  const crop=cropFor(a),[x,y,w,h]=crop;
  const scale=frameScale(a);
  const vbPad=opts.portrait?18:0;
  const viewY=y;
  const viewH=opts.portrait?Math.min(112,h):h;
  return `<svg class="cs-sprite-svg" viewBox="${x-vbPad} ${viewY} ${w+vbPad*2} ${viewH}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(a.race+' '+genderName(a.gender))}"><g transform="translate(${x+w/2} 0) scale(${scale} 1) translate(${-(x+w/2)} 0)" style="filter:${toneFilter(a)}"><image href="${ATLAS}" x="0" y="0" width="1536" height="500" preserveAspectRatio="none"/></g></svg>`;
}
function previewHTML(subject,opts={}){
  const c=subject||{},race=c.race||c.appearance?.race||'Veyren';
  const a=normalizeAppearance(c.appearance||c,c.id||c.name||race,race);
  const r=raceDef(race);
  const classes=['cs-model',opts.compact?'cs-model--compact':'',opts.className||''].filter(Boolean).join(' ');
  return `<div class="${classes}" data-character-suit-model data-race="${esc(race)}" data-gender="${a.gender===1?'female':'male'}" style="--cs-accent:${r.accent};--cs-hair-filter:${hairFilter(a)}">${spriteSVG(a,opts)}${markingSVG(a)}${featureOverlay(a)}<span class="cs-ground-ring"></span></div>`;
}
function portraitHTML(subject,opts={}){
  const c=subject||{},race=c.race||c.appearance?.race||'Veyren';
  const a=normalizeAppearance(c.appearance||c,c.id||c.name||race,race),r=raceDef(race),size=opts.size||'md';
  return `<span class="cs-portrait cs-portrait--${esc(size)}" style="--cs-accent:${r.accent}" role="img" aria-label="${esc(c.name||race)}">${spriteSVG(a,{portrait:true})}</span>`;
}
function fieldLabel(field,a){
  if(field==='gender')return genderName(a.gender);
  if(field==='frame')return frameName(a.frame);
  if(field==='hair')return HAIR_NAMES[clampIndex(a.hair,4,0)];
  if(field==='skinTone')return String(a.skinTone+1).padStart(2,'0')+' / 06';
  if(field==='face')return String(a.face+1).padStart(2,'0')+' / 04';
  if(field==='hairColor')return String(a.hairColor+1).padStart(2,'0')+' / 06';
  if(field==='marking')return a.marking===0?'None':String(a.marking).padStart(2,'0')+' / 04';
  if(field==='eyes')return String(a.eyes+1).padStart(2,'0')+' / 06';
  if(field==='feature')return String(a.feature+1).padStart(2,'0')+' / 04';
  return '';
}
function control(field,label,a){
  return `<div class="cs-control" data-cs-control="${field}"><span>${esc(label)}</span><div><button type="button" data-cs-field="${field}" data-dir="-1" aria-label="Previous ${esc(label)}">‹</button><b>${esc(fieldLabel(field,a))}</b><button type="button" data-cs-field="${field}" data-dir="1" aria-label="Next ${esc(label)}">›</button></div></div>`;
}
function raceTabs(a){
  return Object.entries(RACES).map(([id,r])=>`<button type="button" class="${a.race===id?'active':''}" data-cs-race="${id}" style="--race:${r.accent}"><span>${id[0]}</span><b>${id}</b></button>`).join('');
}
function frameChoices(a){
  return FRAME_NAMES.map((name,i)=>`<button type="button" data-cs-frame="${i}" class="${a.frame===i?'active':''}"><span class="cs-frame-silhouette cs-frame-silhouette--${i}"></span><b>${name}</b></button>`).join('');
}
function editorHTML(appearance,opts={}){
  const a=normalizeAppearance(appearance,opts.seed||opts.name,appearance?.race||opts.race||'Veyren');
  const race=raceDef(a.race);
  return `<section class="character-suit" data-character-suit style="--cs-accent:${race.accent}">
    <header class="cs-head"><div><small>CHARACTER SUIT · V1</small><h2>Build the adventurer</h2><p>Race defines the body. Class and equipment are layered later.</p></div><span class="cs-engine-badge">ASSET-DRIVEN</span></header>
    <nav class="cs-races" aria-label="Race">${raceTabs(a)}</nav>
    <div class="cs-workspace">
      <section class="cs-stage">
        <div class="cs-stage-meta"><span>${esc(a.race)}</span><b>${esc(genderName(a.gender))} · ${esc(frameName(a.frame))}</b></div>
        ${previewHTML({race:a.race,appearance:a,name:opts.name||'Character'},{})}
        <div class="cs-stage-caption"><strong>${esc(a.race)}</strong><span>${esc(race.trait)}</span></div>
      </section>
      <aside class="cs-controls">
        <div class="cs-segment"><span>BODY TYPE</span><div><button type="button" data-cs-gender="0" class="${a.gender===0?'active':''}">MALE</button><button type="button" data-cs-gender="1" class="${a.gender===1?'active':''}">FEMALE</button></div></div>
        <div class="cs-frames"><span>BODY FRAME</span><div>${frameChoices(a)}</div></div>
        <div class="cs-control-grid">
          ${control('skinTone','Skin tone',a)}
          ${control('face','Face',a)}
          ${control('hair','Hair style',a)}
          ${control('hairColor','Hair colour',a)}
          ${control('marking','Markings',a)}
          ${control('eyes','Eye colour',a)}
          ${control('feature',race.label,a)}
        </div>
        <button type="button" class="cs-randomise" data-cs-randomise>✦ RANDOMISE CHARACTER</button>
      </aside>
    </div>
  </section>`;
}
function bindEditor(container,appearance,onChange,opts={}){
  if(!container||!appearance)return;
  const commit=(field)=>{appearance.engine=ENGINE;appearance.version=VERSION;if(typeof onChange==='function')onChange(appearance,field)};
  container.querySelectorAll('[data-cs-race]').forEach(btn=>btn.addEventListener('click',()=>{
    const race=btn.dataset.csRace;if(!RACES[race])return;appearance.race=race;commit('race');
  }));
  container.querySelectorAll('[data-cs-gender]').forEach(btn=>btn.addEventListener('click',()=>{appearance.gender=clampIndex(btn.dataset.csGender,2,0);commit('gender')}));
  container.querySelectorAll('[data-cs-frame]').forEach(btn=>btn.addEventListener('click',()=>{appearance.frame=clampIndex(btn.dataset.csFrame,3,1);commit('frame')}));
  container.querySelectorAll('[data-cs-field]').forEach(btn=>btn.addEventListener('click',()=>{
    const field=btn.dataset.csField,count=FIELDS[field]||1,dir=Number(btn.dataset.dir)||1;
    appearance[field]=(Number(appearance[field]||0)+dir+count)%count;commit(field);
  }));
  container.querySelector('[data-cs-randomise]')?.addEventListener('click',()=>{Object.assign(appearance,randomAppearance(appearance.race));commit('random')});
}

window.CellboundCharacterSuit={
  version:VERSION,engine:ENGINE,RACES,FIELDS,
  normalizeAppearance,randomAppearance,migrateLegacy,
  editorHTML,bindEditor,previewHTML,portraitHTML,spriteSVG
};
})();