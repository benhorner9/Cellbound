/* Cellbound Town Scene v2
   Sector-based world navigation: the Town is larger than one screen.
   First interaction selects a physical object; second enters a system or travels to a district.
   The legacy sidebar remains available while this direction is tested. */
(()=>{
'use strict';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const game=()=>window.CellboundGame;
const root=$('[data-town-scene]');
if(!root)return;

const panel=root.querySelector('[data-town-selection]');
const panelTitle=root.querySelector('[data-town-selection-title]');
const panelCopy=root.querySelector('[data-town-selection-copy]');
const panelStatus=root.querySelector('[data-town-selection-status]');
const panelAction=root.querySelector('[data-town-selection-action]');
const board=root.querySelector('[data-town-board-focus]');
const boardMount=root.querySelector('[data-town-board-mount]');
const boardClose=root.querySelector('[data-town-board-close]');
const questView=$('#quests');
const track=root.querySelector('[data-town-sector-track]');
const headingKicker=root.querySelector('[data-town-sector-kicker]');
const headingTitle=root.querySelector('[data-town-sector-title]');
const headingCopy=root.querySelector('[data-town-sector-copy]');
const travelParty=root.querySelector('[data-town-travel-party]');
const questNavBadge=$('#questNavBadge');
const expeditionFocus=root.querySelector('[data-town-expedition-focus]');
const expeditionMount=root.querySelector('[data-town-expedition-mount]');
const expeditionClose=root.querySelector('[data-town-expedition-close]');
const expeditionTitle=root.querySelector('[data-town-expedition-title]');
const expeditionKicker=root.querySelector('[data-town-expedition-kicker]');

let selected='';
let sector='square';
let questChildren=[];
let boardOpen=false;
let entering=false;
let sectorTimer=0;
let boardTimer=0;
let expeditionPopupOpen=false;
let expeditionPopupId='';
let expeditionPopupView=null;
let expeditionPopupOriginParent=null;
let expeditionPopupOriginNext=null;
let expeditionTimer=0;

const sectorOrder={square:0,merchant:1,expedition:2,harbour:3};
const sectorCopy={
  square:{
    kicker:'THE GUILD QUARTER',
    title:'Central Square',
    copy:'The heart of your guild town. Choose a place, or follow a road into another district.'
  },
  merchant:{
    kicker:'WEST DISTRICT',
    title:'Merchant Quarter',
    copy:'Trade, craft and store the spoils of your adventures.'
  },
  expedition:{
    kicker:'EAST DISTRICT',
    title:'Expedition Ward',
    copy:'Prepare dungeon runs, enter the Crucible or visit the activity grounds.'
  },
  harbour:{
    kicker:'SOUTHERN DOCKS',
    title:'Greywake Harbour',
    copy:'Raid parties gather here before leaving the town by sea.'
  }
};

const objectCopy={
  inn:{
    title:'The Lantern Inn',
    copy:'Manage your adventurers, equipment and active party.',
    action:'Enter the Inn',
    status(){
      const roster=game()?.getState?.()?.roster||[];
      const party=game()?.getPartyCharacters?.()||[];
      return party.length+' preparing · '+Math.max(0,roster.length-party.length)+' resting';
    }
  },
  board:{
    title:'Town Notice Board',
    copy:'Read available quests, contracts and story leads.',
    action:'Open Quests',
    status(){
      const count=String($('#questNavBadge')?.textContent||'').trim();
      return count?count+' lead'+(count==='1'?'':'s')+' waiting':'Review current and completed adventures';
    }
  },
  merchantRoad:{
    title:'Merchant Quarter',
    copy:'Trading, crafting and guild storage.',
    action:'Enter Merchant Quarter',
    status(){return 'Marketplace · Crafting Quarter · Guild Vault'}
  },
  expeditionRoad:{
    title:'Expedition Ward',
    copy:'Dungeons, the Crucible and expedition activities.',
    action:'Enter Expedition Ward',
    status(){return 'Dungeons · The Crucible · Activities'}
  },
  harbourRoad:{
    title:'Greywake Harbour',
    copy:'Raid staging and departures for The Manor.',
    action:'Enter Greywake Harbour',
    status(){return String($('#homeRaidStatus')?.textContent||'').trim()||'The Manor · raid staging'}
  },
  market:{
    title:'The Marketplace',
    copy:'Merchant stalls and the guild Trading Post. Buy, sell and search the goods moving through Cellbound.',
    action:'Enter the Marketplace',
    status(){return 'Trading Post · equipment, materials and reagents'}
  },
  forge:{
    title:'Crafting Quarter',
    copy:'The forge and workshops used by your adventurers. Refine materials and advance your professions here.',
    action:'Enter the workshops',
    status(){return 'Profession projects · crafting progression'}
  },
  vault:{
    title:'The Guild Vault',
    copy:'A fortified storehouse for equipment, reagents and valuables gathered by your company.',
    action:'Enter the Vault',
    status(){
      const count=String($('#bankCount')?.textContent||'').trim();
      return count&&count!=='—'?count+' stored items':'Bank & guild storage';
    }
  },
  cart:{
    title:'Expedition Cart',
    copy:'Maps, supplies and routes into dangerous territory. This is where your party leaves for dungeons.',
    action:'Prepare an expedition',
    status(){
      const next=String($('#homeDungeonStatus')?.textContent||'').trim();
      return next||'Choose a dungeon route';
    }
  },
  arena:{
    title:'The Crucible',
    copy:'A stone colosseum where guilds test their parties against other players in organised combat.',
    action:'Enter the Colosseum',
    status(){return 'Battlegrounds · ranked arenas · seasonal PvP'}
  },
  grounds:{
    title:'Festival Grounds',
    copy:'Travellers, challenges and unusual events gather here between major expeditions.',
    action:'Visit the Grounds',
    status(){
      const event=String($('#homeEventStatus')?.textContent||'').trim();
      return event||'Activities · events · special challenges';
    }
  },
  harbour:{
    title:'Greywake Raid Pier',
    copy:'Your raid party boards here. Gather both commanders, ready the group and sail for major encounters.',
    action:'Go to raid staging',
    status(){return String($('#homeRaidStatus')?.textContent||'').trim()||'The Manor · group raid staging'}
  },
  squareFromMerchant:{
    title:'Road to Central Square',
    copy:'Return through the merchant archway to the heart of town.',
    action:'Walk back to the Square',
    status(){return 'Lantern Inn · Notice Board · district roads'}
  },
  squareFromExpedition:{
    title:'Road to Central Square',
    copy:'Return through the ward gate to the heart of town.',
    action:'Walk back to the Square',
    status(){return 'Lantern Inn · Notice Board · district roads'}
  },
  squareFromHarbour:{
    title:'Steps to Central Square',
    copy:'Climb back from the docks to the guild quarter.',
    action:'Walk back to the Square',
    status(){return 'Lantern Inn · Notice Board · district roads'}
  }
};

const viewRoutes={
  inn:'roster',
  cart:'content',
  market:'trading',
  forge:'professions',
  vault:'bank',
  arena:'pvp',
  harbour:'raids',
  grounds:'world'
};

const sectorRoutes={
  merchantRoad:'merchant',
  expeditionRoad:'expedition',
  harbourRoad:'harbour',
  squareFromMerchant:'square',
  squareFromExpedition:'square',
  squareFromHarbour:'square'
};

function locationNode(id){return root.querySelector('[data-town-object="'+id+'"]')}

function syncQuestMarker(){
  const count=Number.parseInt(String(questNavBadge?.textContent||'').trim(),10)||0;
  root.classList.toggle('has-available-quests',count>0);
  if(count>0)root.dataset.townQuestCount=String(count);else delete root.dataset.townQuestCount;
}

function renderTravelParty(){
  if(!travelParty)return;
  const chars=(game()?.getPartyCharacters?.()||[]).slice(0,5);
  travelParty.innerHTML=chars.map((c,i)=>{
    const portrait=window.CellboundPortraits?.portraitHTML?.(c,{size:'fill',label:c.name});
    return '<span class="town-travel-hero" style="--travel-order:'+i+'">'+(portrait||'<b>'+String(c.name||'?').charAt(0)+'</b>')+'</span>';
  }).join('');
}

function updateHeading(){
  const info=sectorCopy[sector]||sectorCopy.square;
  if(headingKicker)headingKicker.textContent=info.kicker;
  if(headingTitle)headingTitle.textContent=info.title;
  if(headingCopy)headingCopy.textContent=info.copy;
}

function setSelected(id,focusPanel=true){
  selected=id||'';
  if(selected)root.dataset.selectedTownObject=selected;else delete root.dataset.selectedTownObject;
  root.querySelectorAll('[data-town-object]').forEach(n=>{
    const on=n.dataset.townObject===selected;
    n.classList.toggle('is-selected',on);
    n.setAttribute('aria-pressed',String(on));
  });
  root.querySelectorAll('[data-town-layer]').forEach(n=>{
    n.classList.toggle('is-selected',n.dataset.townLayer===selected);
  });
  if(!selected){
    panel.hidden=true;
    root.classList.remove('has-selection');
    return;
  }
  const def=objectCopy[selected];
  if(!def)return;
  panelTitle.textContent=def.title;
  panelCopy.textContent=def.copy;
  panelStatus.textContent=def.status();
  panelAction.textContent=def.action+' →';
  panelAction.dataset.enterTownObject=selected;
  panel.hidden=false;
  root.classList.add('has-selection');
  if(focusPanel)panelAction.focus({preventScroll:true});
}

function setSector(next,{instant=false,focus=true}={}){
  if(!sectorOrder.hasOwnProperty(next)||next===sector)return;
  clearTimeout(sectorTimer);
  const from=sector;
  sector=next;
  setSelected('');
  root.dataset.townSector=sector;
  root.classList.add('is-sector-travelling');
  root.dataset.travelDirection=sectorOrder[next]>sectorOrder[from]?'forward':'back';
  renderTravelParty();
  if(track){
    track.style.transition=instant?'none':'';
    track.style.transform='translateX(-'+(sectorOrder[next]*25)+'%)';
    if(instant)requestAnimationFrame(()=>track.style.transition='');
  }
  updateHeading();
  sectorTimer=setTimeout(()=>{
    root.classList.remove('is-sector-travelling');
    delete root.dataset.travelDirection;
    if(focus){
      root.querySelector('[data-town-sector="'+sector+'"] [data-town-object]')?.focus({preventScroll:true});
    }
  },instant?0:520);
}

function restoreQuests(){
  if(!questChildren.length||!questView)return;
  questChildren.forEach(node=>questView.appendChild(node));
  questChildren=[];
  boardMount.replaceChildren();
}

function closeBoard({focus=true,instant=false}={}){
  if(!boardOpen&&!root.classList.contains('is-opening-board'))return;
  clearTimeout(boardTimer);
  boardOpen=false;
  entering=true;
  root.classList.remove('is-opening-board');
  board.classList.remove('is-visible');
  document.body.classList.remove('town-board-focus-open');

  const finishInstant=()=>{
    board.hidden=true;
    root.classList.remove('town-board-open','is-closing-board','is-returning-board','is-returning-board-home');
    restoreQuests();
    syncQuestMarker();
    entering=false;
    if(focus)locationNode('board')?.focus({preventScroll:true});
  };

  if(instant){finishInstant();return}

  root.classList.add('is-closing-board');
  boardTimer=setTimeout(()=>{
    board.hidden=true;
    root.classList.remove('town-board-open','is-closing-board');
    root.classList.add('is-returning-board');
    restoreQuests();
    syncQuestMarker();

    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>root.classList.add('is-returning-board-home'));
    });

    boardTimer=setTimeout(()=>{
      root.classList.remove('is-returning-board','is-returning-board-home');
      entering=false;
      if(focus)locationNode('board')?.focus({preventScroll:true});
    },720);
  },260);
}

function showBoardPopup(){
  window.CellboundQuests?.render?.();
  questChildren=[...questView.children];
  questChildren.forEach(node=>boardMount.appendChild(node));
  boardOpen=true;
  board.hidden=false;
  root.classList.remove('is-opening-board');
  root.classList.add('town-board-open');
  document.body.classList.add('town-board-focus-open');
  requestAnimationFrame(()=>requestAnimationFrame(()=>board.classList.add('is-visible')));
  boardClose?.focus({preventScroll:true});
  window.CellboundQuests?.render?.();
  syncQuestMarker();
  entering=false;
}

function openBoard(){
  if(!questView||boardOpen||entering)return;
  clearTimeout(boardTimer);
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if(reduced){showBoardPopup();return}

  entering=true;
  root.classList.remove('is-returning-board','is-returning-board-home','is-closing-board');
  root.classList.add('is-opening-board');
  boardTimer=setTimeout(showBoardPopup,600);
}


const expeditionPopupConfig={
  cart:{view:'content',kicker:'DUNGEON EXPEDITIONS',title:'Choose a Dungeon'},
  grounds:{view:'world',kicker:'ACTIVITIES',title:'Activity Grounds'}
};

function restoreExpeditionPopup(){
  if(expeditionPopupView&&expeditionPopupOriginParent){
    const anchor=expeditionPopupOriginNext&&expeditionPopupOriginNext.parentNode===expeditionPopupOriginParent
      ?expeditionPopupOriginNext:null;
    expeditionPopupOriginParent.insertBefore(expeditionPopupView,anchor);
  }
  expeditionPopupView=null;
  expeditionPopupOriginParent=null;
  expeditionPopupOriginNext=null;
  expeditionMount?.replaceChildren();
}

function showExpeditionPopup(id){
  const config=expeditionPopupConfig[id];
  const view=config?document.getElementById(config.view):null;
  if(!config||!view||!expeditionFocus||!expeditionMount){
    entering=false;
    root.classList.remove('is-opening-expedition');
    delete root.dataset.townEntry;
    return;
  }

  restoreExpeditionPopup();
  expeditionPopupId=id;
  expeditionPopupView=view;
  expeditionPopupOriginParent=view.parentNode;
  expeditionPopupOriginNext=view.nextSibling;
  expeditionMount.appendChild(view);

  if(expeditionKicker)expeditionKicker.textContent=config.kicker;
  if(expeditionTitle)expeditionTitle.textContent=config.title;

  expeditionPopupOpen=true;
  expeditionFocus.hidden=false;
  root.classList.remove('is-opening-expedition','is-returning-expedition','is-returning-expedition-home','is-closing-expedition');
  root.classList.add('town-expedition-open');
  document.body.classList.add('town-expedition-focus-open');
  requestAnimationFrame(()=>requestAnimationFrame(()=>expeditionFocus.classList.add('is-visible')));
  expeditionClose?.focus({preventScroll:true});
  entering=false;
}

function openExpeditionPopup(id){
  if(expeditionPopupOpen||entering||!expeditionPopupConfig[id])return;
  clearTimeout(expeditionTimer);
  entering=true;
  root.dataset.townEntry=id;
  root.classList.remove('is-returning-expedition','is-returning-expedition-home','is-closing-expedition');
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if(reduced){showExpeditionPopup(id);return}
  root.classList.add('is-opening-expedition');
  expeditionTimer=setTimeout(()=>showExpeditionPopup(id),620);
}

function closeExpeditionPopup({focus=true,instant=false}={}){
  if(!expeditionPopupOpen&&!root.classList.contains('is-opening-expedition'))return;
  clearTimeout(expeditionTimer);
  const returnId=expeditionPopupId||root.dataset.townEntry||selected;
  expeditionPopupOpen=false;
  entering=true;
  root.classList.remove('is-opening-expedition');
  expeditionFocus?.classList.remove('is-visible');
  document.body.classList.remove('town-expedition-focus-open');

  const finish=()=>{
    if(expeditionFocus)expeditionFocus.hidden=true;
    restoreExpeditionPopup();
    root.classList.remove('town-expedition-open','is-closing-expedition','is-returning-expedition','is-returning-expedition-home');
    expeditionPopupId='';
    delete root.dataset.townEntry;
    entering=false;
    if(focus&&returnId)locationNode(returnId)?.focus({preventScroll:true});
  };

  if(instant){finish();return}

  root.classList.add('is-closing-expedition');
  expeditionTimer=setTimeout(()=>{
    if(expeditionFocus)expeditionFocus.hidden=true;
    restoreExpeditionPopup();
    root.classList.remove('town-expedition-open','is-closing-expedition');
    root.classList.add('is-returning-expedition');
    requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('is-returning-expedition-home')));
    expeditionTimer=setTimeout(finish,680);
  },220);
}

function enterCrucible(){
  if(entering)return;
  entering=true;
  root.dataset.townEntry='arena';
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const finish=()=>{
    game()?.switchView?.('pvp');
    root.classList.remove('is-entering-expedition');
    delete root.dataset.townEntry;
    entering=false;
  };
  if(reduced){finish();return}
  root.classList.add('is-entering-expedition');
  setTimeout(finish,720);
}

function travel(view){
  if(entering)return;
  entering=true;
  root.classList.add('is-travelling');
  setTimeout(()=>{
    game()?.switchView?.(view);
    root.classList.remove('is-travelling');
    entering=false;
  },220);
}

function enterInn(){
  if(entering)return;
  entering=true;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if(reduced){
    game()?.switchView?.('roster');
    entering=false;
    return;
  }
  root.classList.add('is-entering-inn');
  root.dataset.townEntry='inn';
  setTimeout(()=>{
    game()?.switchView?.('roster');
    root.classList.remove('is-entering-inn');
    delete root.dataset.townEntry;
    entering=false;
  },720);
}

function enterDistrictArch(id){
  const next=sectorRoutes[id];
  if(!next||entering)return;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if(reduced){setSector(next);return}

  entering=true;
  clearTimeout(sectorTimer);
  root.dataset.townEntry=id;
  root.classList.add('is-entering-district');

  // Hold on the selected arch long enough for the camera move to read, then
  // transition the district track only after the zoom has completed.
  sectorTimer=setTimeout(()=>{
    setSector(next,{focus:false});
    sectorTimer=setTimeout(()=>{
      root.classList.remove('is-entering-district');
      delete root.dataset.townEntry;
      entering=false;
      root.querySelector('[data-town-sector="'+sector+'"] [data-town-object]')?.focus({preventScroll:true});
    },560);
  },680);
}

function enter(id){
  if(id==='board'){openBoard();return}
  if(id==='inn'){enterInn();return}
  if(id==='merchantRoad'||id==='expeditionRoad'){enterDistrictArch(id);return}
  if(sectorRoutes[id]){setSector(sectorRoutes[id]);return}
  const view=viewRoutes[id];
  if(view)travel(view);
}

function interact(id){
  if(boardOpen||expeditionPopupOpen)return;
  if(selected===id){enter(id);return}
  setSelected(id,false);
}

function backgroundClick(e){
  if(boardOpen||expeditionPopupOpen)return;
  if(e.target.closest('[data-town-object]')||e.target.closest('[data-town-selection]'))return;
  setSelected('');
}

function keyboardObject(e){
  const node=e.target.closest?.('[data-town-object]');
  if(!node)return;
  if(e.key==='Enter'||e.key===' '){
    e.preventDefault();
    interact(node.dataset.townObject);
  }
}

function syncHome(){
  const active=$('.view.active')?.id;
  document.body.classList.toggle('town-scene-active',active==='overview');
  if(active==='overview'){
    const title=$('#pageTitle');
    if(title)title.textContent='Town';
    setSector('square',{instant:true,focus:false});
    sector='square';
    root.dataset.townSector='square';
    if(track)track.style.transform='translateX(0%)';
    updateHeading();
    renderTravelParty();
    syncQuestMarker();
  }else{
    closeBoard({focus:false,instant:true});
    closeExpeditionPopup({focus:false,instant:true});
    setSelected('');
  }
}

root.addEventListener('click',e=>{
  const object=e.target.closest('[data-town-object]');
  if(object){e.preventDefault();interact(object.dataset.townObject);return}
  const enterButton=e.target.closest('[data-enter-town-object]');
  if(enterButton){e.preventDefault();enter(enterButton.dataset.enterTownObject);return}
  backgroundClick(e);
});
root.addEventListener('keydown',keyboardObject);
boardClose?.addEventListener('click',()=>closeBoard());
expeditionClose?.addEventListener('click',()=>closeExpeditionPopup());
expeditionFocus?.addEventListener('click',e=>{
  if(e.target===expeditionFocus||e.target.closest('[data-town-expedition-backdrop]'))closeExpeditionPopup();
});
board?.addEventListener('click',e=>{
  if(e.target===board||e.target.closest('[data-town-board-backdrop]'))closeBoard();
});
window.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(expeditionPopupOpen||root.classList.contains('is-opening-expedition')){e.preventDefault();closeExpeditionPopup();return}
  if(boardOpen){e.preventDefault();closeBoard();return}
  if(selected){
    e.preventDefault();
    const last=locationNode(selected);
    setSelected('');
    last?.focus({preventScroll:true});
    return;
  }
  if(sector!=='square'){
    e.preventDefault();
    setSector('square');
  }
});
window.addEventListener('cellbound:view-changed',syncHome);
window.addEventListener('cellbound:state-rendered',()=>{
  renderTravelParty();
  syncQuestMarker();
  if(selected&&objectCopy[selected])panelStatus.textContent=objectCopy[selected].status();
});
window.addEventListener('beforeunload',()=>{
  restoreQuests();
  restoreExpeditionPopup();
},{once:true});

if(questNavBadge){
  new MutationObserver(syncQuestMarker).observe(questNavBadge,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden']});
}

root.dataset.townSector='square';
if(track)track.style.transform='translateX(0%)';
updateHeading();
renderTravelParty();
syncQuestMarker();
syncHome();

window.CellboundTownScene={
  select:setSelected,
  enter,
  setSector,
  openBoard,
  closeBoard,
  openExpeditionPopup,
  closeExpeditionPopup,
  get selected(){return selected},
  get sector(){return sector},
  get boardOpen(){return boardOpen},
  get expeditionPopupOpen(){return expeditionPopupOpen}
};
})();