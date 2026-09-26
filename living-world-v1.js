(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const locations={
 roster:{name:'The Lantern Inn',tag:'ROSTER · GATHER YOUR ADVENTURERS',copy:'Your party gathers by the hearth. Others rest between expeditions.',theme:'inn'},
 party:{name:'The Gathering Table',tag:'ACTIVE PARTY · THE INN',copy:'Choose who travels together. Your next expedition starts here.',theme:'inn'},
 trading:{name:'The Marketplace',tag:'TRADING POST · MERCHANT ROW',copy:'Browse the stalls, inspect a find, or put your own goods up for sale.',theme:'market'},
 bank:{name:'The Guild Vault',tag:'BANK · THE STOREHOUSE',copy:'Equipment on the racks. Reagents on the shelves. Everything within reach.',theme:'vault'},
 professions:{name:'The Crafting Quarter',tag:'PROFESSIONS · THE WORKSHOPS',copy:'Forge, brew, stitch and enchant with your adventurers.',theme:'workshop'},
 quests:{name:'The Adventurer’s Hall',tag:'QUESTS · NOTICES & JOURNEYS',copy:'A fresh notice. An unfinished story. Somewhere that needs your party.',theme:'hall'},
 content:{name:'The Expedition Hall',tag:'DUNGEONS · CHOOSE YOUR DESTINATION',copy:'Pick an entrance below to inspect rewards, set your tactics and assemble the party.',theme:'hall'},
 raids:{name:'Greywake Harbour',tag:'RAIDS · THE MANOR',copy:'Gather both parties at the dock. The island waits across the water.',theme:'harbour'}
};
const stages={
 'ashen-vault':{name:'The Ashen Vault',theme:'forge',art:'assets/dungeons/ashen-vault.webp',cta:'Enter the Vault'},
 'hollow-sanctum':{name:'The Hollow Sanctum',theme:'frost',art:'assets/dungeons/hollow-sanctum.webp',cta:'Descend into the Sanctum'},
 'chaos-canyon':{name:'Chaos Canyon',theme:'wild',art:'assets/dungeons/chaos-canyon.webp',cta:'Enter the Canyon'},
 'blackout-station':{name:'Blackout Station',theme:'storm',art:'assets/dungeons/blackout-station.webp',cta:'Enter the Station'},
 'fractured-ages':{name:'The Fractured Ages',theme:'arcane',art:'assets/dungeons/fractured-ages.webp',cta:'Step through the Fracture'},
 'twelve-below':{name:'The Twelve Below',theme:'frost',art:'assets/world/twelve-below-key-art.webp',cta:'Enter the Sepulchre'}
};
const game=()=>window.CellboundGame;
const party=()=>game()?.getPartyCharacters?.()||[];
const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
let queued=false,crafter=null,craftName=null;
function architecture(theme){
 const harbour=theme==='harbour';
 const common='<path d="M0 250L220 160H780L1000 250V340H0Z" fill="#221b17"/><path d="M0 340L300 180M230 340L420 180M770 340L580 180M1000 340L700 180M0 280H1000M0 315H1000" stroke="#a38a5926"/>';
 const objects={
 inn:'<path d="M420 200V85Q500 10 580 85V200" fill="#231c19" stroke="#7c6244" stroke-width="18"/><path d="M455 200Q430 160 482 137Q471 170 510 150Q550 176 536 200" fill="#df8a40"/><path d="M50 242L280 230L320 252L70 272Z" fill="#695038"/><path d="M70 272V315M285 255V294" stroke="#3d2c20" stroke-width="13"/><path d="M750 252L965 232V253L755 278Z" fill="#584731"/>',
 market:'<path d="M90 195V72H380V195M620 195V72H910V195" fill="none" stroke="#6a5139" stroke-width="12"/><path d="M62 76L115 30H355L407 76ZM592 76L645 30H885L937 76Z" fill="#647766"/><path d="M62 76H407V101H62ZM592 76H937V101H592Z" fill="#bb9360"/><path d="M100 205V175H380V205ZM620 205V175H900V205Z" fill="#654b32"/><g fill="#a88859"><rect x="138" y="149" width="44" height="24"/><rect x="222" y="143" width="30" height="30"/><circle cx="712" cy="158" r="15"/><circle cx="760" cy="160" r="13"/></g>',
 vault:'<g fill="#3a352c" stroke="#a68f57" stroke-width="4"><path d="M100 205V148Q185 95 270 148V205ZM730 205V148Q815 95 900 148V205Z"/><path d="M470 190V55Q500 15 530 55V190Z"/></g><path d="M96 167H274M726 167H904M185 146V190M815 146V190" stroke="#b3955c" stroke-width="8"/><path d="M350 170V45H425V170M575 170V45H650V170M350 85H425M575 85H650M350 125H425M575 125H650" stroke="#776d52" fill="none" stroke-width="6"/>',
 workshop:'<path d="M90 200V80H300V200Z" fill="#4f4e46"/><path d="M130 190V140Q195 70 260 140V190" fill="#e4964f"/><path d="M355 210L385 173H472L498 210ZM402 173V150H467V173" fill="#7f8986"/><path d="M655 200V165H905V200M680 200V245M877 200V245" stroke="#8b7052" stroke-width="10" fill="#3b342c"/><g fill="#8dbdb1"><path d="M702 162L716 129V112H727V129L742 162Z"/><path d="M778 162L790 136V115H803V136L817 162Z"/></g>',
 hall:'<path d="M340 195V40H660V195Z" fill="#685238" stroke="#9b7d4f" stroke-width="7"/><g fill="#bca77c"><path d="M362 63L447 58L450 133L368 138Z"/><path d="M469 74L548 64L557 170L479 180Z"/><path d="M577 62H636V142H577Z"/></g><path d="M92 214L272 182L350 209L166 246Z" fill="#9d8b64"/><path d="M750 160V80M810 160V80M870 160V80" stroke="#bba368" stroke-width="6"/>',
 harbour:'<path d="M0 130Q220 113 400 138T1000 130V340H0Z" fill="#25414a"/><path d="M0 230L550 203L655 255L0 310Z" fill="#70573f"/><path d="M45 211V311M198 205V289M348 196V274" stroke="#ac8c63" stroke-width="10"/><g class="lw-boat"><path d="M510 210H775L730 256H560Z" fill="#806344"/><path d="M633 212V82" stroke="#c0aa80" stroke-width="5"/><path d="M640 88L717 198H640Z" fill="#b4b1a0"/></g><path d="M755 135L805 102L850 104L870 86L900 101L935 132Z" fill="#18262c"/><path d="M820 111V61H879V111M811 61L850 34L888 61M832 61V43M866 61V43" fill="#1c252c" stroke="#526068" stroke-width="2"/>'
 };
 return '<svg class="lw-architecture" viewBox="0 0 1000 340" preserveAspectRatio="'+(harbour?'none':'xMidYMid slice')+'" aria-hidden="true">'+(harbour?'':common)+(objects[theme]||objects.hall)+'</svg>';
}
function heroes(chars,activeIds,interactive=false){
 return chars.slice(0,10).map((c,i)=>{
  const active=activeIds.has(String(c.id)),color=window.CellboundPortraits?.CLASS_COLORS?.[c.class]||'#c9b787';
  const portrait=window.CellboundPortraits?.portraitHTML?.(c,{size:'fill',label:c.name})||'<span>'+esc((c.name||'?')[0])+'</span>';
  const tag=interactive?'button':'div';
  return '<'+tag+(interactive?' type="button" data-char="'+esc(c.id)+'"':'')+' class="lw-hero '+(active?'active-party':'reserve')+'" style="--hero-color:'+esc(color)+';--hero-order:'+i+'"'+(c._worldParty!=null?' data-world-party="'+esc(c._worldParty)+'"':'')+'><span class="lw-person">'+portrait+'</span><b>'+esc(c.name||'Adventurer')+'</b><small>'+esc(c._worldCommander|| (interactive?(active?'In party':'Resting'):c.role||c.class||''))+'</small></'+tag+'>';
 }).join('');
}
function scene(host,config,chars=party(),interactive=false){
 if(!host)return null;
 const key=JSON.stringify([config,chars.map(c=>[c.id,c.name,c.class,c.appearance,c.role,c._worldParty,c._worldCommander]),party().map(c=>c.id)]);
 let el=host.querySelector(':scope > .lw-scene');
 if(el?.dataset.key===key)return el;
 if(!el){el=document.createElement('section');el.className='lw-scene';const head=host.querySelector(':scope > header');if(head)head.after(el);else host.prepend(el)}
 el.dataset.key=key;el.dataset.location=config.theme;el.setAttribute('aria-label',config.name);
 el.innerHTML='<div class="lw-distance" aria-hidden="true"></div>'+architecture(config.theme)+'<div class="lw-light" aria-hidden="true"></div><div class="lw-atmosphere" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><header><small>'+esc(config.tag||'PARTY ASSEMBLY')+'</small><h2>'+esc(config.name)+'</h2><p>'+esc(config.copy||'Your adventurers are ready at the entrance. Review your plan below.')+'</p></header><div class="lw-company">'+heroes(chars,new Set(party().map(c=>String(c.id))),interactive)+'</div><div class="lw-foreground" aria-hidden="true"></div>';
 if(config.art)el.querySelector('.lw-distance').style.backgroundImage='url("./'+config.art+'")';
 return el;
}
function refresh(){
 queued=false;
 for(const [id,config]of Object.entries(locations)){
  const host=document.getElementById(id);if(!host||!host.classList.contains('active'))continue;
  host.classList.add('lw-location');host.dataset.worldLocation=config.theme;
  if(id==='raids'&&host.querySelector('.lw-scene[data-raid-assembly]'))continue;
  if(id==='professions'&&crafter){const station=scene(host,{...config,name:craftName?craftName+' Workshop':config.name},[crafter]);station.dataset.station=String(craftName||'').toLowerCase();continue}
  const chars=id==='roster'?(game()?.getState?.()?.roster||[]):party();scene(host,config,chars,id==='roster'||id==='party');
 }
 staging();
}
function schedule(){if(!queued){queued=true;requestAnimationFrame(refresh)}}
function staging(){
 const mappings=[['#cb2dBackdrop .cb2d-brief','ashen-vault'],['#hs2dBackdrop .cb2d-brief','hollow-sanctum'],['#cc2dBackdrop .cb2d-brief','chaos-canyon'],['#bs2dBackdrop .cb2d-brief','blackout-station'],['.tb-brief','twelve-below'],['.fa-brief','fractured-ages']];
 for(const [selector,id]of mappings){const host=document.querySelector(selector);if(!host)continue;host.classList.add('lw-staging');scene(host,{...stages[id],tag:'EXPEDITION · PARTY ASSEMBLED'});const start=host.querySelector('button[data-start],button[data-fa-start],button[data-tb-start]');if(start&&!start.disabled&&!start.dataset.worldLabel){start.textContent=stages[id].cta;start.dataset.worldLabel='1'}}
 const sheet=document.querySelector('#characterDetail .cb-sheet');if(sheet){sheet.classList.add('lw-armoury');sheet.setAttribute('aria-label','Armoury · character equipment and progression')}
}
function harbour(host,rows=[],departing=false,elapsed=0){
 const old=document.querySelector('#raids > .lw-scene');if(old&&host!==document.getElementById('raids'))old.remove();
 const chars=rows.length?rows.flatMap((r,i)=>(r.party_snapshot||[]).map(c=>({...c,_worldParty:i,_worldCommander:r.guild_label||'Party '+(i+1)}))):party();
 const el=scene(host,{...locations.raids,copy:rows.length>1?'Both parties are gathered. Confirm readiness below.':'Your party waits at the dock for the second commander.'},chars);
 if(el)el.dataset.raidAssembly='1';el?.classList.toggle('lw-departing',departing&&!reduce());if(el)el.style.setProperty('--departure-elapsed',-Math.min(2.8,Math.max(0,elapsed))+'s');
 if(el&&departing)el.querySelector('header p').textContent='Setting sail for the Manor. Combat begins at the shared start time.';
}
window.CellboundLivingWorld={refresh,scene,harbour,locations,stages,partyMarkup:()=>heroes(party(),new Set(party().map(c=>String(c.id)))),workstation:(c,prof)=>{crafter=c;craftName=prof?.name;schedule()},version:'1.0.0'};
window.addEventListener('cellbound:view-changed',e=>{const view=document.getElementById(e.detail?.view);if(view&&!reduce())view.animate([{opacity:.65},{opacity:1}],{duration:160});schedule()});
window.addEventListener('cellbound:state-rendered',schedule);
window.addEventListener('cellbound:crafted',e=>{const el=document.querySelector('#professions > .lw-scene');if(!el)return;const text=document.createElement('p');text.className='lw-craft-result';text.setAttribute('role','status');text.textContent=e.detail?.name+' completed';el.querySelector('.lw-craft-result')?.remove();el.appendChild(text);if(!reduce())el.animate([{boxShadow:'inset 0 0 65px #d5b77970'},{boxShadow:'inset 0 0 0 transparent'}],{duration:700});setTimeout(()=>text.remove(),2500)});
// Observe only structural insertions; ignore our own scene mutations and combat frame updates.
const observer=new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('.lw-scene')&&[...r.addedNodes].some(n=>n.nodeType===1&&!n.matches?.('.lw-scene')&&(n.matches?.('.cb2d-brief,.tb-brief,.fa-brief,.cb-sheet')||n.querySelector?.('.cb2d-brief,.tb-brief,.fa-brief,.cb-sheet')))))schedule()});
observer.observe(document.body,{childList:true,subtree:true});refresh();
})();
