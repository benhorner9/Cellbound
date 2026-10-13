(()=>{
'use strict';
// Visual identities only. Encounter rosters, mechanics and stats remain upstream.
const ART=/* MONSTER_ART_MANIFEST */[{"id":"deadeye-mercer","name":"Deadeye Mercer","aliases":["Deadeye Mercer — Echo"],"family":"ranged","size":120,"src":"assets/monsters/v1/deadeye-mercer.webp","socket":[0.2,0.39],"frames":6},{"id":"ash-cultist","name":"Ash Cultist","aliases":[],"family":"caster","size":100,"src":"assets/monsters/v1/ash-cultist.webp","socket":[0.24,0.52],"frames":6},{"id":"cinder-hound","name":"Cinder Hound","aliases":[],"family":"beast","size":104,"src":"assets/monsters/v1/cinder-hound.webp","socket":[0.24,0.52],"frames":6},{"id":"furnace-wisp","name":"Furnace Wisp","aliases":[],"family":"elemental","size":88,"src":"assets/monsters/v1/furnace-wisp.webp","socket":[0.24,0.52],"frames":6},{"id":"ash-guardian","name":"Ash Guardian","aliases":[],"family":"humanoid","size":108,"src":"assets/monsters/v1/ash-guardian.webp","socket":[0.24,0.52],"frames":6},{"id":"ember-acolyte","name":"Ember Acolyte","aliases":[],"family":"caster","size":100,"src":"assets/monsters/v1/ember-acolyte.webp","socket":[0.24,0.52],"frames":6},{"id":"soul-binder","name":"Soul Binder","aliases":[],"family":"caster","size":106,"src":"assets/monsters/v1/soul-binder.webp","socket":[0.24,0.52],"frames":6},{"id":"ash-warden-kael","name":"Ash Warden Kael","aliases":[],"family":"humanoid","size":142,"src":"assets/monsters/v1/ash-warden-kael.webp","socket":[0.24,0.52],"frames":6},{"id":"embermaw","name":"Embermaw","aliases":[],"family":"beast","size":152,"src":"assets/monsters/v1/embermaw.webp","socket":[0.24,0.52],"frames":6},{"id":"the-hollow-knight","name":"The Hollow Knight","aliases":["The Hollow Knight — Echo"],"family":"humanoid","size":142,"src":"assets/monsters/v1/the-hollow-knight.webp","socket":[0.24,0.52],"frames":6},{"id":"the-vaultheart","name":"The Vaultheart","aliases":[],"family":"elemental","size":150,"src":"assets/monsters/v1/the-vaultheart.webp","socket":[0.24,0.52],"frames":6},{"id":"cave-spawn","name":"Cave Spawn","aliases":[],"family":"beast","size":78,"src":"assets/monsters/v1/cave-spawn.webp","socket":[0.24,0.52],"frames":6},{"id":"amun-rael","name":"Amun-Rael","aliases":["Amun-Rael — Echo"],"family":"caster","size":138,"src":"assets/monsters/v1/amun-rael.webp","socket":[0.24,0.52],"frames":6},{"id":"commander-veyra","name":"Commander Veyra","aliases":["Commander Veyra — Echo"],"family":"ranged","size":132,"src":"assets/monsters/v1/commander-veyra.webp","socket":[0.23,0.38],"frames":6},{"id":"the-old-man-keeper-of-ages","name":"The Old Man, Keeper of Ages","aliases":[],"family":"caster","size":148,"src":"assets/monsters/v1/the-old-man-keeper-of-ages.webp","socket":[0.24,0.52],"frames":6},{"id":"sunbound-servant","name":"Sunbound Servant","aliases":[],"family":"humanoid","size":104,"src":"assets/monsters/v1/sunbound-servant.webp","socket":[0.24,0.52],"frames":6},{"id":"lunar-drone","name":"Lunar Drone","aliases":[],"family":"machine","size":88,"src":"assets/monsters/v1/lunar-drone.webp","socket":[0.24,0.64],"frames":6}];
const normalize=v=>String(v||'').normalize('NFKD').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const registry=new Map(),mounted=new WeakMap(),pending=new WeakMap(),cache=new Map();
for(const a of ART)for(const key of [a.id,a.name,...a.aliases])registry.set(normalize(key),a);
function resolve(value){const name=typeof value==='object'?value?.visualId||value?.name||value?.id:value;return registry.get(normalize(name))||(/^manor-thrall-\d+$/.test(normalize(name))?registry.get('manor-thrall'):null)||null}
// Bounded decoded-image LRU. Only requested encounters are loaded, never the catalogue.
function preload(values){return Promise.all([...new Set((values||[]).map(resolve).filter(Boolean))].map(a=>{
 if(cache.has(a.id)){const entry=cache.get(a.id);cache.delete(a.id);cache.set(a.id,entry);return entry.promise}
 const image=new Image();image.decoding='async';const entry={image,promise:null,ready:false};
 entry.promise=new Promise(resolve=>{let settled=false;const end=ok=>{entry.ready=ok;if(settled){if(ok)window.CellboundCombatPortraits?.refresh?.();return}settled=true;clearTimeout(timer);resolve(ok)};const timer=setTimeout(()=>end(false),1800);image.onload=()=>image.decode?.().then(()=>end(true),()=>end(true))||end(true);image.onerror=()=>end(false);image.src=a.src});
 cache.set(a.id,entry);while(cache.size>12)cache.delete(cache.keys().next().value);return entry.promise;
}))}
function nameFor(el){
 if(el.dataset.monsterId)return el.dataset.monsterId;
 if(el.dataset.tbBoss)return window.CellboundTwelveBelow?.bosses?.find(b=>b.id===el.dataset.tbBoss)?.name||el.dataset.tbBoss;
 if(el.id==='wb2dBoss')return el.dataset.enemyName||el.getAttribute('aria-label')||el.querySelector('.wb2d-unit-label')?.textContent;
 const label=el.querySelector(':scope > span,:scope > .wb2d-unit-label');return label?.childNodes[0]?.textContent?.trim()||el.getAttribute('aria-label')||'';
}
function mount(el,value){
 const a=resolve(value||nameFor(el));if(!a)return false;
 if(mounted.get(el)?.art===a)return true;
 // Keep the existing renderer visible until this encounter's atlas has decoded.
 if(!cache.get(a.id)?.ready){if(pending.get(el)!==a){pending.set(el,a);preload([a.id]).then(([ok])=>{if(ok&&el.isConnected&&pending.get(el)===a)mount(el,a.id)})}return false}
 el.querySelectorAll(':scope > .cb-combat-boss-portrait,:scope > .cb-combat-monster-portrait').forEach(n=>n.remove());
 el.classList.remove('cb-combat-has-boss-portrait');el.classList.add('cb-combat-has-monster-portrait','cb-monster-illustrated');
 const node=document.createElement('div');node.className='cb-combat-monster-portrait cb-monster-sprite';node.setAttribute('aria-label',a.name);node.dataset.creature=a.family;
 node.style.setProperty('--monster-size',a.size+'px');node.style.setProperty('--monster-sheet',`url("${a.src}")`);
 const sheet=document.createElement('i');sheet.className='cb-monster-frame';sheet.setAttribute('aria-hidden','true');node.appendChild(sheet);el.appendChild(node);
 el.dataset.monsterId=a.id;el.dataset.monsterFacing='left';el.dataset.monsterFamily=a.family;
 const instance={art:a,node,sheet,frame:-1};mounted.set(el,instance);setFrame(instance,0);preload([a.id]);window.CellboundCombatFX?.refreshFootprint?.(el);return true;
}
function setFrame(m,index){if(m.frame===index)return;m.frame=index;m.node.dataset.spriteFrame=String(index);m.sheet.style.backgroundPosition=(index%3)*50+'% '+Math.floor(index/3)*100+'%'}
const reactions=new Set(['hit','interrupt','control','dodge']);
function apply(el,state={}){
 const m=mounted.get(el);if(!m)return false;
 const {clip,progress=0,casting=false,dead=false,reduced=false,contact=.44}=state;
 let frame=0;
 if(clip==='death'||dead&&!clip)frame=reduced||progress>.55||!clip?5:4;
 else if(clip==='revive')frame=progress<.45?5:progress<.75?4:0;
 else if(reactions.has(clip))frame=4;
 else if(clip==='block')frame=3;
 else if(casting)frame=progress<.12?1:3;
 else if(clip&&clip!=='heal')frame=progress<.1?0:progress<contact?1:progress<Math.min(.88,contact+.24)?2:0;
 if(reduced&&!dead&&clip!=='death'&&clip!=='revive')frame=0;
 setFrame(m,frame);return true;
}
function react(el){const m=mounted.get(el);if(!m)return;m.reaction?.cancel();m.reaction=m.node.animate?.([{translate:'0 0'},{translate:'2px 0',offset:.3},{translate:'0 0'}],{duration:190,easing:'ease-out'})}
function reset(el,dead=false){const m=mounted.get(el);if(m){m.reaction?.cancel();setFrame(m,dead?5:0)}}
function profile(el,e={}){const a=mounted.get(el)?.art;if(!a)return null;const magic=a.family==='caster'||a.family==='elemental',ranged=a.family==='ranged'||a.family==='machine',ability=String(e.ability||'');return{clip:magic?'cast':ranged?'thrust':a.family==='beast'?'thrust':'swing',kind:magic?'magic':'damage',known:true,style:'monster-'+a.family,projectile:magic||ranged,socket:'main',abilityId:ability}}
function socket(el){const m=mounted.get(el);if(!m)return null;const b=m.node.getBoundingClientRect(),flip=Number(el.style.getPropertyValue('--cbs-face')||1)<0,[x,y]=m.art.socket;return{x:b.left+b.width*(flip?1-x:x),y:b.top+b.height*y}}
window.CellboundMonsterVisuals={version:1,resolve,mount,preload,apply,react,reset,profile,socket,art:ART,diagnostics:()=>({decoded:cache.size,maxDecoded:12,illustrated:ART.length})};
})();
