/* Cellbound World Venues v1
   Arrival scenes make every major system feel like a place.
   The existing working UI remains authoritative and opens only after interacting
   with an NPC/station. Sidebar stays available while the flow is being tested. */
(()=>{
'use strict';

const $=s=>document.querySelector(s);
const game=()=>window.CellboundGame;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

const VENUES={
  pvp:{
    name:'The Crucible',
    kicker:'PVP STAGING · COLOSSEUM YARD',
    copy:'The roar of the arena carries over the stone walls. Speak to the officials here before entering combat.',
    theme:'arena',
    actors:[
      {id:'marshal',kind:'guard',x:22,y:58,name:'Gate Marshal',role:'Battleground Registrar',copy:'The marshal registers full parties for objective battlegrounds and explains the current formats.',action:'Choose Battleground',tab:'battlegrounds'},
      {id:'warden',kind:'warden',x:43,y:52,name:'Arena Warden',role:'Rated Match Official',copy:'The warden handles rated Arena licences, squad formats and seasonal matchmaking.',action:'Choose Arena',tab:'arena'},
      {id:'quartermaster',kind:'merchant',x:70,y:57,name:'Crucible Quartermaster',role:'PvP Equipment Vendor',copy:'Spend War Marks, Arena Seals and Season Crests on equipment used only in PvP.',action:'Browse PvP Gear',tab:'armoury'},
      {id:'ladder',kind:'board',x:88,y:43,name:'Season Board',role:'Crucible Rankings',copy:'Guild standings, ratings and the current season are posted on the arena wall.',action:'View Season Ladder',tab:'leaderboard'}
    ]
  },
  trading:{
    name:'The Marketplace',
    kicker:'MERCHANT QUARTER · TRADING POST',
    copy:'Stalls crowd the lane while brokers call out prices. Trade through the people who keep the market moving.',
    theme:'market',
    actors:[
      {id:'broker',kind:'merchant',x:27,y:57,name:'Market Broker',role:'Live Listings',copy:'Browse live equipment, reagents, recipes and commodities from other guilds.',action:'Browse the Market',tab:'browse'},
      {id:'consignment',kind:'clerk',x:55,y:54,name:'Consignment Clerk',role:'Your Trading Desk',copy:'List goods for sale, manage open orders and collect proceeds from completed trades.',action:'Manage My Trading',tab:'my'},
      {id:'watch',kind:'board',x:82,y:47,name:'Price Board',role:'Watchlist & History',copy:'Review watched goods and recent market movement before spending your gold.',action:'Open Watchlist',tab:'watch'}
    ]
  },
  professions:{
    name:'Crafting Quarter',
    kicker:'WORKSHOPS · PROFESSIONS',
    copy:'Heat, smoke and hammer blows fill the workshops. Choose an artisan before beginning a project.',
    theme:'workshop',
    actors:[
      {id:'artisan',kind:'artisan',x:34,y:57,name:'Master Artisan',role:'Profession Projects',copy:'Choose an adventurer, select one of their professions and begin a hands-on work order.',action:'Enter the Workshop',focus:'#professionCharacterList'},
      {id:'stores',kind:'keeper',x:72,y:58,name:'Material Keeper',role:'Reagent Stores',copy:'Review the materials your guild has gathered and what the current profession can use.',action:'Inspect Reagents',focus:'#reagentGrid'}
    ]
  },
  bank:{
    name:'The Guild Vault',
    kicker:'STOREHOUSE · GUILD BANK',
    copy:'Heavy doors seal behind you. The guild’s equipment, reagents and valuables are kept under watch.',
    theme:'vault',
    actors:[
      {id:'keeper',kind:'keeper',x:35,y:55,name:'Vault Keeper',role:'Shared Storage',copy:'Open the guild stores to deposit, inspect and retrieve equipment and materials.',action:'Open the Vault',focus:'#bankGrid'},
      {id:'steward',kind:'clerk',x:72,y:55,name:'Vault Steward',role:'Inventory Stewardship',copy:'Review the bank overview and organise stored items before the next expedition.',action:'Manage Storage',focus:'.bank-overview-strip'}
    ]
  },
  content:{
    name:'Expedition Staging',
    kicker:'DUNGEONS · ROUTE PLANNING',
    copy:'Carts are loaded beside a wall of maps. Scouts mark the routes your party is ready to attempt.',
    theme:'expedition',
    actors:[
      {id:'pathfinder',kind:'cartographer',x:32,y:55,name:'Pathfinder',role:'Dungeon Routes',copy:'Choose an unlocked dungeon, inspect its threats and check your party’s entry requirements.',action:'Choose a Dungeon',focus:'#dungeonBrowser'},
      {id:'map',kind:'map',x:71,y:48,name:'Expedition Map',role:'Known Routes',copy:'The guild’s discovered routes, bosses and destination notes are pinned here.',action:'Inspect Routes',focus:'#dungeonBrowser'}
    ]
  },
  raids:{
    name:'Greywake Harbour',
    kicker:'RAID STAGING · SOUTHERN DOCKS',
    copy:'The raid ship waits against the quay. Assemble both parties before the tide turns.',
    theme:'harbour',
    actors:[
      {id:'dockmaster',kind:'dockmaster',x:31,y:56,name:'Dockmaster',role:'Raid Assembly',copy:'Form the raid group, check both parties and confirm that every commander is ready to sail.',action:'Assemble the Raid',focus:'#manorRaidMount'},
      {id:'boat',kind:'boat',x:72,y:51,name:'The Greywake',role:'Raid Vessel',copy:'The ship carries your combined parties to The Manor once the raid is formed and ready.',action:'Prepare to Sail',focus:'#manorRaidMount'}
    ]
  },
  world:{
    name:'Festival Grounds',
    kicker:'ACTIVITIES · EVENTS & CHALLENGES',
    copy:'Travellers set up tents beyond the main square. Repeatable challenges and unusual events gather here.',
    theme:'grounds',
    actors:[
      {id:'herald',kind:'herald',x:34,y:57,name:'Event Herald',role:'Current Activities',copy:'Ask what challenges are active and enter the special activity currently available.',action:'See Current Activity',focus:'#twelveBelowMount'},
      {id:'tent',kind:'tent',x:72,y:52,name:'Challenge Pavilion',role:'Special Encounters',copy:'The pavilion hosts repeatable challenges, minigames and future seasonal encounters.',action:'Enter the Pavilion',focus:'#twelveBelowMount'}
    ]
  }
};

function personSvg(kind){
  const prop={
    guard:'<path d="M31 39H69L64 78H36Z" fill="#5c6464"/><path d="M39 34L45 17H58L65 34Z" fill="#777b77"/><path d="M49 42V70" stroke="#c49a58" stroke-width="5"/><path d="M25 42V76" stroke="#b7a270" stroke-width="4"/>',
    warden:'<path d="M31 39H69L66 80H34Z" fill="#4f4545"/><path d="M36 35L43 18H59L66 35Z" fill="#6d5652"/><path d="M50 42V71M38 54H62" stroke="#c7a36a" stroke-width="4"/>',
    merchant:'<path d="M29 42Q50 30 71 42L67 79H33Z" fill="#66523c"/><path d="M35 41Q50 28 65 41" fill="#876f4e"/><path d="M68 58L82 48V76H68Z" fill="#9a7546"/><circle cx="78" cy="44" r="6" fill="#c6a56b"/>',
    clerk:'<path d="M31 42H69L66 79H34Z" fill="#4b514d"/><path d="M35 43L50 35L65 43" fill="#806a4b"/><path d="M70 58H88V75H70Z" fill="#b99a65"/><path d="M74 62H84" stroke="#453321" stroke-width="2"/>',
    artisan:'<path d="M31 42H69L66 79H34Z" fill="#55493d"/><path d="M26 52L41 45M74 52L59 45" stroke="#9d7853" stroke-width="7"/><path d="M73 37L89 61" stroke="#a6a7a1" stroke-width="5"/><path d="M83 56L94 47" stroke="#696963" stroke-width="7"/>',
    keeper:'<path d="M31 41H69L66 79H34Z" fill="#454b4c"/><path d="M34 44L50 34L66 44" fill="#6c6048"/><path d="M72 51H88V75H72Z" fill="#6d5639" stroke="#c2a36b" stroke-width="2"/><circle cx="80" cy="61" r="4" fill="#c6a76b"/>',
    cartographer:'<path d="M31 42H69L66 79H34Z" fill="#43545a"/><path d="M35 44L50 34L65 44" fill="#6e6045"/><path d="M68 50L91 45L94 72L70 76Z" fill="#d0bd8c" stroke="#57432c" stroke-width="2"/><path d="M73 56L88 53M74 62L86 60" stroke="#735a3d" stroke-width="2"/>',
    dockmaster:'<path d="M31 42H69L66 79H34Z" fill="#3f4c50"/><path d="M34 41Q50 29 66 41" fill="#71624b"/><path d="M70 48Q88 57 76 79" fill="none" stroke="#b49766" stroke-width="5"/>',
    herald:'<path d="M31 42H69L66 79H34Z" fill="#594244"/><path d="M35 42L50 33L65 42" fill="#7b6045"/><path d="M72 48L88 43L91 65L75 68Z" fill="#9e7445"/><path d="M88 44L96 34" stroke="#c0a36c" stroke-width="3"/>'
  };
  if(kind==='board')return '<svg viewBox="0 0 100 90"><path d="M15 18H85V68H15Z" fill="#6b4d33" stroke="#21160f" stroke-width="5"/><path d="M23 27H46V49H23ZM51 25H76V54H51ZM31 53H58V63H31Z" fill="#d2bd8e"/><path d="M27 68V88M73 68V88" stroke="#3b281b" stroke-width="7"/></svg>';
  if(kind==='map')return '<svg viewBox="0 0 100 90"><path d="M12 25L36 17L62 24L88 15V69L62 78L36 70L12 79Z" fill="#cfbd91" stroke="#4e3827" stroke-width="4"/><path d="M36 18V70M62 24V78M20 54Q33 35 48 48T78 37" fill="none" stroke="#76533a" stroke-width="3"/><circle cx="77" cy="37" r="5" fill="#7b4139"/></svg>';
  if(kind==='boat')return '<svg viewBox="0 0 120 90"><path d="M13 57H105L89 78H30Z" fill="#765237" stroke="#201711" stroke-width="5"/><path d="M60 58V10" stroke="#bca576" stroke-width="5"/><path d="M64 14L95 52H64Z" fill="#b8b29d" stroke="#40382d" stroke-width="2"/><path d="M56 21L30 52H56Z" fill="#777467" stroke="#40382d" stroke-width="2"/></svg>';
  if(kind==='tent')return '<svg viewBox="0 0 100 90"><path d="M12 72L50 18L88 72Z" fill="#6b4d45" stroke="#241817" stroke-width="5"/><path d="M50 18V78M33 72L50 48L67 72" fill="none" stroke="#c1a171" stroke-width="4"/><path d="M20 72H80" stroke="#3f2b20" stroke-width="7"/></svg>';
  return '<svg viewBox="0 0 100 90"><circle cx="50" cy="25" r="14" fill="#b58c70" stroke="#171414" stroke-width="4"/>'+ (prop[kind]||prop.guard) +'</svg>';
}

function scenery(theme){
  const arena='<path d="M60 210V105Q150 20 500 18Q850 20 940 105V210Z" fill="#393a37" stroke="#7d715d" stroke-width="12"/><path d="M140 210V145Q185 86 230 145V210M445 210V122Q500 53 555 122V210M770 210V145Q815 86 860 145V210" fill="#151919" stroke="#9b8564" stroke-width="8"/><path d="M0 235H1000V340H0Z" fill="#4a4034"/><path d="M125 105L92 54L151 73M875 105L908 54L850 73" fill="#7b403a"/>';
  const market='<path d="M50 215V80H390V215M610 215V80H950V215" fill="#453b31" stroke="#6f553b" stroke-width="10"/><path d="M26 85L92 28H355L416 85ZM584 85L650 28H918L974 85Z" fill="#53675b" stroke="#202523" stroke-width="6"/><path d="M24 86H417V119H24ZM583 86H974V119H583Z" fill="#a27a4e"/><path d="M88 220H382V258H88ZM620 220H915V258H620Z" fill="#694c31"/><path d="M0 258H1000V340H0Z" fill="#4d4235"/>';
  const workshop='<path d="M70 228V70H330V228Z" fill="#424541" stroke="#777065" stroke-width="8"/><path d="M120 220V155Q200 70 280 155V220" fill="#e08b42"/><path d="M405 225L450 169H575L615 225ZM475 169V133H568V169" fill="#727a79"/><path d="M695 218V165H935V218M725 218V273M905 218V273" stroke="#7b6349" stroke-width="12"/><path d="M0 270H1000V340H0Z" fill="#3b342c"/>';
  const vault='<path d="M70 238V118Q170 46 270 118V238M730 238V118Q830 46 930 118V238" fill="#323531" stroke="#8d7a58" stroke-width="8"/><path d="M405 238V65Q500 -5 595 65V238Z" fill="#242927" stroke="#9c845d" stroke-width="10"/><path d="M442 236V111Q500 65 558 111V236" fill="#151a19" stroke="#8a7451" stroke-width="8"/><path d="M458 119V229M486 98V231M514 98V231M542 119V229M447 157H553M445 197H555" stroke="#9d865d" stroke-width="7"/>';
  const expedition='<path d="M80 236L142 90L270 236Z" fill="#4c453d" stroke="#8a7453" stroke-width="7"/><path d="M730 236L810 105L925 236Z" fill="#3d4547" stroke="#7e745d" stroke-width="7"/><path d="M350 236V98H650V236Z" fill="#5c4934" stroke="#987b51" stroke-width="8"/><path d="M385 122H615M395 154H604" stroke="#baa36f" stroke-width="5"/><path d="M0 260H1000V340H0Z" fill="#464038"/>';
  const harbour='<path d="M0 125Q220 108 405 135T1000 125V340H0Z" fill="#24414a"/><path d="M0 235L560 202L675 260L0 318Z" fill="#70573f"/><path d="M48 218V320M202 208V300M365 199V284" stroke="#a88a62" stroke-width="11"/><path d="M690 210H930L900 250H730Z" fill="#795b3e"/><path d="M810 210V80" stroke="#c0aa80" stroke-width="6"/><path d="M817 88L892 199H817Z" fill="#b6b29f"/>';
  const grounds='<path d="M65 235L165 75L265 235Z" fill="#5e453c" stroke="#9b7953" stroke-width="7"/><path d="M735 235L835 75L935 235Z" fill="#403d4a" stroke="#887357" stroke-width="7"/><path d="M165 75V25M835 75V25" stroke="#b49d70" stroke-width="8"/><path d="M170 30L245 55L170 82ZM830 30L755 55L830 82Z" fill="#7a413b"/><path d="M355 235V128H645V235Z" fill="#4b3e31" stroke="#91744f" stroke-width="7"/>';
  const svg={arena,market,workshop,vault,expedition,harbour,grounds}[theme]||market;
  return '<svg class="cb-venue-scenery" viewBox="0 0 1000 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+svg+'</svg>';
}

function actorMarkup(actor){
  return '<button type="button" class="cb-venue-actor" data-venue-actor="'+esc(actor.id)+'" style="--venue-x:'+actor.x+'%;--venue-y:'+actor.y+'%" aria-pressed="false" aria-label="'+esc(actor.name)+'">'+
    '<span class="cb-venue-actor-visual" data-kind="'+esc(actor.kind)+'">'+personSvg(actor.kind)+'</span>'+
    '<span class="cb-venue-actor-plaque"><b>'+esc(actor.name)+'</b><small>'+esc(actor.role)+'</small></span>'+
  '</button>';
}

function stageMarkup(config){
  return '<section class="cb-venue-stage" data-venue-stage data-theme="'+esc(config.theme)+'">'+
    '<div class="cb-venue-depth" aria-hidden="true"></div>'+scenery(config.theme)+
    '<header class="cb-venue-header"><small>'+esc(config.kicker)+'</small><h2>'+esc(config.name)+'</h2><p>'+esc(config.copy)+'</p></header>'+
    '<button type="button" class="cb-venue-town" data-venue-town>← Return to Town</button>'+
    '<div class="cb-venue-actors">'+config.actors.map(actorMarkup).join('')+'</div>'+
    '<aside class="cb-venue-dialogue" data-venue-dialogue hidden aria-live="polite"><div><small data-venue-role></small><h3 data-venue-name></h3><p data-venue-copy></p></div><button type="button" data-venue-action></button></aside>'+
    '<section class="cb-venue-system-surface" data-venue-system-surface hidden aria-label="'+esc(config.name)+' interface">'+
      '<div class="cb-venue-system-bar" data-venue-system-bar><button type="button" data-venue-back>← Back to '+esc(config.name)+'</button><div><small>INTERACTING WITH</small><b data-venue-system-name>'+esc(config.name)+'</b></div><button type="button" data-venue-town>Return to Town →</button></div>'+
      '<div class="cb-venue-system-slot" data-venue-system-slot></div>'+
    '</section>'+
  '</section>';
}

const installed=new Map();

function markSystemChildren(host){
  [...host.children].forEach(node=>{
    if(node.matches?.('.cb-venue-stage,.lw-room-depth,.lw-scene'))return;
    node.classList?.add('cb-venue-system-content');
  });
}

function selectActor(entry,id){
  const {host,config,stage}=entry;
  const actor=config.actors.find(a=>a.id===id);
  if(!actor)return;
  entry.selected=id;
  stage.querySelectorAll('[data-venue-actor]').forEach(n=>{
    const on=n.dataset.venueActor===id;
    n.classList.toggle('is-selected',on);
    n.setAttribute('aria-pressed',String(on));
  });
  const dialogue=stage.querySelector('[data-venue-dialogue]');
  dialogue.querySelector('[data-venue-role]').textContent=actor.role;
  dialogue.querySelector('[data-venue-name]').textContent=actor.name;
  dialogue.querySelector('[data-venue-copy]').textContent=actor.copy;
  const action=dialogue.querySelector('[data-venue-action]');
  action.textContent=actor.action+' →';
  action.dataset.venueOpen=id;
  dialogue.hidden=false;
  host.dataset.venueState='arrival';
}

function restoreSystem(entry){
  if(!entry.portalNodes?.length)return;
  entry.portalNodes.forEach(node=>entry.host.appendChild(node));
  entry.portalNodes=[];
  const surface=entry.stage.querySelector('[data-venue-system-surface]');
  if(surface)surface.hidden=true;
}
function resetArrival(entry){
  restoreSystem(entry);
  entry.selected='';
  entry.host.dataset.venueState='arrival';
  delete entry.host.dataset.venueActor;
  entry.stage.querySelector('[data-venue-dialogue]').hidden=true;
  entry.stage.querySelectorAll('[data-venue-actor]').forEach(n=>{n.classList.remove('is-selected');n.setAttribute('aria-pressed','false')});
}

function clickTab(view,actor){
  if(view==='pvp'&&actor.tab){
    window.CellboundPvP?.render?.();
    requestAnimationFrame(()=>document.querySelector('#pvp [data-pvp-tab="'+actor.tab+'"]')?.click());
  }
  if(view==='trading'&&actor.tab){
    requestAnimationFrame(()=>document.querySelector('#trading [data-tp-tab="'+actor.tab+'"]')?.click());
  }
}

function openSystem(entry,id){
  const {host,config,stage,view}=entry;
  const actor=config.actors.find(a=>a.id===id);
  if(!actor)return;
  restoreSystem(entry);
  markSystemChildren(host);
  entry.selected=id;
  host.dataset.venueState='system';
  host.dataset.venueActor=id;
  stage.querySelector('[data-venue-dialogue]').hidden=true;
  const surface=stage.querySelector('[data-venue-system-surface]');
  const slot=stage.querySelector('[data-venue-system-slot]');
  const bar=stage.querySelector('[data-venue-system-bar]');
  const nodes=[...host.children].filter(node=>node!==stage && node.classList?.contains('cb-venue-system-content'));
  entry.portalNodes=nodes;
  nodes.forEach(node=>slot.appendChild(node));
  surface.hidden=false;
  bar.querySelector('[data-venue-system-name]').textContent=actor.name+' · '+actor.role;
  clickTab(view,actor);
  if(actor.focus){
    requestAnimationFrame(()=>setTimeout(()=>{
      const target=slot.querySelector(actor.focus)||host.querySelector(actor.focus);
      target?.scrollIntoView?.({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
    },60));
  }
}

function goTown(entry){
  resetArrival(entry);
  game()?.switchView?.('overview');
}

function install(view,config){
  const host=document.getElementById(view);
  if(!host||installed.has(view))return;
  host.classList.add('cb-venue-location');
  host.dataset.venue=config.theme;
  host.dataset.venueState='arrival';
  markSystemChildren(host);
  const stage=document.createElement('div');
  stage.innerHTML=stageMarkup(config);
  const stageEl=stage.firstElementChild;
  host.insertBefore(stageEl,host.firstChild);
  const entry={view,host,config,stage:stageEl,selected:'',portalNodes:[]};
  installed.set(view,entry);

  stageEl.addEventListener('click',e=>{
    const town=e.target.closest('[data-venue-town]');
    if(town){goTown(entry);return}
    const back=e.target.closest('[data-venue-back]');
    if(back){resetArrival(entry);stageEl.scrollIntoView?.({block:'start'});return}
    const open=e.target.closest('[data-venue-open]');
    if(open){openSystem(entry,open.dataset.venueOpen);return}
    const actorNode=e.target.closest('[data-venue-actor]');
    if(!actorNode)return;
    const id=actorNode.dataset.venueActor;
    if(entry.selected===id){openSystem(entry,id);return}
    selectActor(entry,id);
  });

  stageEl.addEventListener('keydown',e=>{
    if(!['Enter',' '].includes(e.key))return;
    const actorNode=e.target.closest?.('[data-venue-actor]');
    if(!actorNode)return;
    e.preventDefault();
    const id=actorNode.dataset.venueActor;
    if(entry.selected===id)openSystem(entry,id);else selectActor(entry,id);
  });

  new MutationObserver(()=>markSystemChildren(host)).observe(host,{childList:true});
}

function activate(view){
  const entry=installed.get(view);
  if(!entry)return;
  resetArrival(entry);
  markSystemChildren(entry.host);
  entry.stage.scrollIntoView?.({block:'start'});
}

Object.entries(VENUES).forEach(([view,config])=>install(view,config));

window.addEventListener('cellbound:view-changed',e=>{
  const view=e.detail?.view;
  if(VENUES[view])activate(view);
});
window.addEventListener('cellbound:state-rendered',()=>{
  installed.forEach(entry=>markSystemChildren(entry.host));
});

window.CellboundWorldVenues={
  version:'1.1.0',
  venues:VENUES,
  open(view,actorId){const entry=installed.get(view);if(entry)openSystem(entry,actorId)},
  back(view){const entry=installed.get(view);if(entry)resetArrival(entry)},
  town(view){const entry=installed.get(view);if(entry)goTown(entry)}
};
})();