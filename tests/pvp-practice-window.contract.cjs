'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('pvp-v1.js','utf8');
const styles=fs.readFileSync('layout-safety-v1.css','utf8');
const ownerCss=fs.readFileSync('src/combat/pvp-objectives-v1.css','utf8');
function harness(role){
 const mount={innerHTML:'old panel',replaceChildren(){this.innerHTML='';this.replaced=true}};
 const section={classList:{contains:c=>c==='active'}};
 const calls=[];
 const window={
  CellboundGame:{ready:true},
  CellboundAdmin:{role},
  CellboundPvPOwnerQA:{render(el){calls.push('render');if(role!=='owner')return false;el.innerHTML='<article class="cbpvp-qa">Owner practice</article>';return true},allowed(){return role==='owner'},stop(){}},
  addEventListener(name,cb){calls.push(name);this[name]=cb}
 };
 const document={
  querySelector(selector){if(selector==='#pvpMount')return mount;if(selector==='#pvp')return section;if(selector==='#pvpMount .cbpvp-qa')return mount.innerHTML.includes('cbpvp-qa')?{}:null;return null},
  querySelectorAll(){return[]}
 };
 vm.runInNewContext(source,{window,document,console,setInterval:()=>1,clearInterval:()=>{},setTimeout:()=>1,clearTimeout:()=>{}},{filename:'pvp-v1.js'});
 window.CellboundPvP.render();
 return{mount,window,calls}
}
const owner=harness('owner');
assert.equal(owner.calls.filter(c=>c==='render').length,1,'owner-only practice room must render');
assert(owner.mount.replaced,'PvP should clear its stale content on entering owner practice');
assert(owner.mount.innerHTML.includes('Owner practice'),'practice must be the first content');
assert(!owner.mount.innerHTML.includes('FEATURE PAUSED'),'owner should not be buried under locked panels');
owner.window['cellbound:admin-status']();
assert.equal(owner.calls.filter(c=>c==='render').length,1,'role-status refresh must not abort owner practice in progress');
const player=harness('player');
assert(player.mount.innerHTML.includes('FEATURE PAUSED'),'public PvP must remain gated');
assert(!player.mount.innerHTML.includes('Owner practice'),'public PvP must never expose owner practice');
assert(ownerCss.includes('.cbpvp-qa > header{'),'practice header CSS must not restyle combat header');
assert(styles.includes('#pvpMount .cbpvp-qa .cbcombat-pvp-shell[data-combat-view="canonical-v1"]'),'practice shell needs its own in-page sizing');
assert(styles.includes('grid-template-rows:auto auto auto!important'),'practice shell must have auto-height rows');
assert(styles.includes('@media(max-width:650px)'), 'mobile PvP layout required');
const qa=fs.readFileSync('src/combat/pvp-owner-qa-v1.js','utf8');
assert(qa.includes('CellboundPvPPreTactics?.markup?.'),'pre-match planner remains present in owner practice');
assert(qa.includes('window.CellboundAdmin?.role!==\'owner\''),'owner guard remains active');
const ownerSource=fs.readFileSync('src/combat/pvp-owner-qa-v1.js','utf8');
const viewerSource=fs.readFileSync('src/combat/combat-viewer-v1.js','utf8');
assert(ownerSource.includes("overlay.id='cbpvpPracticeWindow'"),'match must open in a dedicated dialog rather than inside the setup form');
assert(ownerSource.includes("overlay.setAttribute('aria-modal','true')"),'dialog must be accessible');
assert(ownerSource.includes("data-pvp-qa-exit"),'match must have a close control');
assert(ownerSource.includes("data-pvp-overlay-controls"),'tactics must be reachable while fighting');
assert(ownerSource.includes("document.body.classList.remove('cbpvp-practice-active')"),'match exit restores page scrolling');
assert(styles.includes('#cbpvpPracticeWindow.cbpvp-practice-window'),'PvP modal must fit the viewport');
assert(viewerSource.includes('(?:svg|webp|png|jpe?g|avif)'), 'dedicated painted SVG PvP maps must be accepted');
console.log('PvP practice window contract passed: immediate owner entry, public lock, role refresh, mobile/inline sizing, and planner access.');
