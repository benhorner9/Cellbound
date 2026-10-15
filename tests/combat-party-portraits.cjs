'use strict';
// Party HUD portraits must use real character faces, not full-body combat silhouettes.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const character={id:'hero-1',name:'Test Guardian',race:'Stoneborn',class:'Warrior',appearance:{gender:1,skinTone:3,face:2,hair:1},equipment:{Chest:{tier:3}}};
const calls={headshots:0,models:0};
const context={
 window:{
  CellboundGame:{getState:()=>({roster:[character]})},
  CellboundPortraits:{
   CLASS_COLORS:{Warrior:'#ca786d'},
   portraitHTML:(c,opts)=>{calls.headshots++;assert.equal(c.id,character.id);assert.equal(opts.size,'fill');return '<span class="cb-portrait cb-portrait--fill"><svg data-headshot></svg></span>'},
   paperDollHTML:(c,opts)=>{calls.models++;return '<span class="cb-paper-doll"><svg data-full-body></svg></span>'}
  }
 },
 document:{body:null,addEventListener:()=>{}},
 MutationObserver:class{observe(){}}
};vm.createContext(context);
vm.runInContext(fs.readFileSync('src/combat/combat-portraits-v1.js','utf8'),context);
const portrait=context.window.CellboundCombatPortraits;
assert(portrait&&portrait.upgrade);
function slot(){
 const s={portrait:null,insertions:0};
 s.querySelector=()=>s.portrait;
 s.insertAdjacentHTML=(pos,html)=>{assert.equal(pos,'beforeend');s.insertions++;s.html=html;s.portrait={remove(){s.portrait=null}}};
 return s;
}
function element(type){
 const classes=new Set(),photo=slot(),own=slot();
 const el={
  dataset:type==='hud'?{combatParty:'p-hero-1',row:'hero-1'}:type==='pvp'?{pvp2dUnit:'blue-hero-1'}:{unit:'p-hero-1'},
  style:{setProperty(){}},
  classList:{add:(...items)=>items.forEach(x=>classes.add(x)),remove:(...items)=>items.forEach(x=>classes.delete(x)),contains:x=>classes.has(x)},
  matches:s=>s==='.cb2d-party-row'?type==='hud':s==='.pvp2d-unit'?type==='pvp':s==='.wb2d-unit'?false:s.includes('data-combat-party')||s.includes('data-unit^=')||s.includes('pvp2d-unit'),
  querySelector:s=>s==='.cb2d-party-avatar'?photo:s==='.pvp2d-token'?photo:s==='.cb2d-party-name>b'?{textContent:character.name}:s==='.pvp2d-name>b'?{textContent:character.name}:s===':scope > .cb-combat-portrait'?own.portrait:null,
  querySelectorAll:()=>[],
  insertAdjacentHTML:(pos,html)=>own.insertAdjacentHTML(pos,html)
 };
 return{el,photo,own,classes};
}
const hud=element('hud');
portrait.upgrade(hud.el);
assert.equal(calls.headshots,1,'HUD generates a real head-and-shoulders profile');
assert.equal(calls.models,0,'HUD must never render the 3D/full-body model');
assert.match(hud.photo.html,/cb-combat-profile-image/);
assert.match(hud.photo.html,/data-headshot/);
assert(!hud.classes.has('cb-combat-full-model'));
portrait.upgrade(hud.el);
assert.equal(hud.photo.insertions,1,'Repeated observer upgrades may not duplicate the portrait');
hud.photo.portrait=null;portrait.upgrade(hud.el);
assert.equal(hud.photo.insertions,2,'If the avatar is replaced, the same row repairs its portrait');
const battle=element('battle');portrait.upgrade(battle.el);
assert.equal(calls.models,1,'Battlefield keeps its real full-body model');
assert.match(battle.own.html,/data-full-body/);
const pvp=element('pvp');portrait.upgrade(pvp.el);portrait.upgrade(pvp.el);
assert.equal(pvp.photo.insertions,1,'PvP must not duplicate the token model');
assert.equal(calls.models,2);
assert.equal(portrait.version,'1.4.0');
const css=fs.readFileSync('src/combat/combat-portraits-v1.css','utf8');
assert(css.includes('.cb-combat-profile-image svg'),'Headshots have clipped, full-size styles');
const layout=fs.readFileSync('adventure-combat-v1.css','utf8');
assert(layout.includes('grid-template-columns:38px minmax(0,1fr)'),'iPad portrait and name have separate columns');
console.log('Combat party portraits PASS: real race-specific HUD faces, stable replacements, full-body battle models, stable PvP tokens and iPad spacing.');
