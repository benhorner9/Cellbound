/* Cellbound Town Scene v1
   World objects are the navigation: first interaction selects, second enters/focuses.
   The sidebar remains available during this proof-of-direction. */
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
const sceneArt=root.querySelector('.town-scene-art');

let selected='';
let questChildren=[];
let boardOpen=false;
let entering=false;

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
  cart:{
    title:'Expedition Cart',
    copy:'Maps, supplies and routes into dangerous territory. This is where your party leaves for dungeons.',
    action:'Prepare an expedition',
    status(){
      const next=String($('#homeDungeonStatus')?.textContent||'').trim();
      return next||'Choose a dungeon route';
    }
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
  arena:{
    title:'The Crucible',
    copy:'A stone colosseum where guilds test their parties against other players in organised combat.',
    action:'Enter the Colosseum',
    status(){return 'Battlegrounds · ranked arenas · seasonal PvP'}
  },
  harbour:{
    title:'Greywake Harbour',
    copy:'Raid parties gather at the docks before sailing for threats beyond the town walls.',
    action:'Go to the docks',
    status(){
      const raid=String($('#homeRaidStatus')?.textContent||'').trim();
      return raid||'The Manor · group raid staging';
    }
  },
  grounds:{
    title:'Festival Grounds',
    copy:'Travellers, challenges and unusual events gather here between major expeditions.',
    action:'Visit the Grounds',
    status(){
      const event=String($('#homeEventStatus')?.textContent||'').trim();
      return event||'Activities · events · special challenges';
    }
  }
};

const routes={
  inn:'roster',
  cart:'content',
  market:'trading',
  forge:'professions',
  vault:'bank',
  arena:'pvp',
  harbour:'raids',
  grounds:'world'
};

function locationNode(id){return root.querySelector('[data-town-object="'+id+'"]')}
function setSelected(id,focusPanel=true){
  selected=id||'';
  $$('[data-town-object]').forEach(n=>{
    const on=n.dataset.townObject===selected;
    n.classList.toggle('is-selected',on);
    n.setAttribute('aria-pressed',String(on));
  });
  if(!selected){
    panel.hidden=true;
    root.classList.remove('has-selection');
    return;
  }
  const def=objectCopy[selected];if(!def)return;
  panelTitle.textContent=def.title;
  panelCopy.textContent=def.copy;
  panelStatus.textContent=def.status();
  panelAction.textContent=def.action+' →';
  panelAction.dataset.enterTownObject=selected;
  panel.hidden=false;
  root.classList.add('has-selection');
  if(focusPanel)panelAction.focus({preventScroll:true});
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
  const view=routes[id];
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
  const node=e.target.closest?.('[data-town-object]');if(!node)return;
  if(e.key==='Enter'||e.key===' '){
    e.preventDefault();
    interact(node.dataset.townObject);
  }
}
function syncHome(){
  const active=$('.view.active')?.id;
  document.body.classList.toggle('town-scene-active',active==='overview');
  if(active==='overview'){
    const title=$('#pageTitle');if(title)title.textContent='Town';
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
board?.addEventListener('click',e=>{if(e.target===board||e.target.closest('[data-town-board-backdrop]'))closeBoard()});
window.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(boardOpen){e.preventDefault();closeBoard();return}
  if(selected){e.preventDefault();const last=locationNode(selected);setSelected('');last?.focus({preventScroll:true})}
});
window.addEventListener('cellbound:view-changed',syncHome);
window.addEventListener('cellbound:state-rendered',()=>{
  if(selected&&objectCopy[selected])panelStatus.textContent=objectCopy[selected].status();
});
window.addEventListener('beforeunload',()=>restoreQuests(),{once:true});

syncHome();
window.CellboundTownScene={select:setSelected,enter,openBoard,closeBoard,get selected(){return selected},get boardOpen(){return boardOpen}};
})();