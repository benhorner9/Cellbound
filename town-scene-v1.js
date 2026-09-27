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

let selected='';
let sector='square';
let questChildren=[];
let boardOpen=false;
let entering=false;
let sectorTimer=0;

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
    copy:'Your adventuring company rests here. Inspect characters, equipment and prepare the active party.',
    action:'Enter the Inn',
    status(){
      const roster=game()?.getState?.()?.roster||[];
      const party=game()?.getPartyCharacters?.()||[];
      return party.length+' preparing · '+Math.max(0,roster.length-party.length)+' resting';
    }
  },
  board:{
    title:'Town Notice Board',
    copy:'Letters, contracts and rumours from across Cellbound. Review the adventures currently available to your guild.',
    action:'Look closer',
    status(){
      const count=String($('#questNavBadge')?.textContent||'').trim();
      return count?count+' lead'+(count==='1'?'':'s')+' waiting':'Review current and completed adventures';
    }
  },
  merchantRoad:{
    title:'Merchant Quarter',
    copy:'A busy lane of merchants, workshops and guarded storehouses.',
    action:'Walk to the Merchant Quarter',
    status(){return 'Marketplace · Crafting Quarter · Guild Vault'}
  },
  expeditionRoad:{
    title:'Expedition Ward',
    copy:'The outer ward where parties prepare for dangerous journeys and organised combat.',
    action:'Walk to the Expedition Ward',
    status(){return 'Dungeons · The Crucible · Activities'}
  },
  harbourRoad:{
    title:'Road to Greywake Harbour',
    copy:'Follow the sloping road to the docks where raid parties gather beside the sea.',
    action:'Walk to the Harbour',
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
  root.querySelectorAll('[data-town-object]').forEach(n=>{
    const on=n.dataset.townObject===selected;
    n.classList.toggle('is-selected',on);
    n.setAttribute('aria-pressed',String(on));
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

function closeBoard({focus=true}={}){
  if(!boardOpen)return;
  boardOpen=false;
  board.classList.remove('is-visible');
  board.hidden=true;
  root.classList.remove('town-board-open');
  document.body.classList.remove('town-board-focus-open');
  restoreQuests();
  if(focus)locationNode('board')?.focus({preventScroll:true});
}

function openBoard(){
  if(!questView||boardOpen)return;
  window.CellboundQuests?.render?.();
  questChildren=[...questView.children];
  questChildren.forEach(node=>boardMount.appendChild(node));
  boardOpen=true;
  board.hidden=false;
  root.classList.add('town-board-open');
  document.body.classList.add('town-board-focus-open');
  requestAnimationFrame(()=>board.classList.add('is-visible'));
  boardClose?.focus({preventScroll:true});
  window.CellboundQuests?.render?.();
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

function enter(id){
  if(id==='board'){openBoard();return}
  if(sectorRoutes[id]){setSector(sectorRoutes[id]);return}
  const view=viewRoutes[id];
  if(view)travel(view);
}

function interact(id){
  if(boardOpen)return;
  if(selected===id){enter(id);return}
  setSelected(id,false);
}

function backgroundClick(e){
  if(boardOpen)return;
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
  }else{
    closeBoard({focus:false});
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
board?.addEventListener('click',e=>{
  if(e.target===board||e.target.closest('[data-town-board-backdrop]'))closeBoard();
});
window.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
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
  if(selected&&objectCopy[selected])panelStatus.textContent=objectCopy[selected].status();
});
window.addEventListener('beforeunload',()=>restoreQuests(),{once:true});

root.dataset.townSector='square';
if(track)track.style.transform='translateX(0%)';
updateHeading();
renderTravelParty();
syncHome();

window.CellboundTownScene={
  select:setSelected,
  enter,
  setSector,
  openBoard,
  closeBoard,
  get selected(){return selected},
  get sector(){return sector},
  get boardOpen(){return boardOpen}
};
})();