/* Shared dungeon orders: local preparation, one combat contract for every dungeon. */
(function(){
 'use strict';
 const CHOICES={
  tank:[['all-aggro','Hold all threat','Protect the entire group'],['boss-lock','Lock down boss','Keep the boss focused on you'],['damage','Press damage','Keep threat, hit harder when safe']],
  dps:[['boss-burn','Burn boss','Stay on the main target'],['interrupt','Stop casts','Prioritise dangerous enemy casts'],['adds','Control adds','Clear adds before the boss']],
  healer:[['tank-first','Guard tank','Keep the tank stable first'],['group','Cover group','Use group healing sooner'],['triage','Emergency triage','Save the most injured first']]
 };
 const DEFAULT={tank:'all-aggro',dps:'adds',healer:'tank-first'};
 const storageKey=()=>{
  const user=window.CellboundGame?.getUser?.();
  return 'cellbound:party-orders:v1:'+String(user?.id||'local');
 };
 const role=c=>{
  const given=String(c?.role||'').toLowerCase();
  if(['tank','healer'].includes(given))return given;
  const inferred=window.CellboundGame?.classes?.[c?.class]?.specs?.[c?.spec]?.role;
  return ['tank','healer'].includes(String(inferred).toLowerCase())?String(inferred).toLowerCase():'dps';
 };
 const key=c=>String(c?.id||c?.characterId||c?.name||'').replace(/[^a-z0-9_-]/gi,'-');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function read(){try{const v=JSON.parse(localStorage.getItem(storageKey())||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(_){return{}}}
 function save(data){try{localStorage.setItem(storageKey(),JSON.stringify(data))}catch(_){}}
 function current(party=[]){
  const saved=read(),out={};
  for(const ch of party){
   const id=key(ch),r=role(ch),choice=saved[id];
   if(id)out[id]=CHOICES[r].some(x=>x[0]===choice)?choice:DEFAULT[r];
  }
  return out
 }
 function markup(party=[]){
  if(!party.length)return'';
  const values=current(party);
  return '<section class="cb-party-orders" data-party-orders><div class="cb-party-orders-head"><div><small>PARTY ORDERS</small><h3>Give each adventurer a job</h3><p>These orders change target, threat, interrupts and healing priorities. Change them before every run, or keep your last plan.</p></div><button type="button" data-orders-reset>Reset</button></div>'+
   '<div class="cb-party-orders-list">'+party.map(ch=>{
    const id=key(ch),r=role(ch),options=CHOICES[r],selected=values[id]||DEFAULT[r];
    return '<div class="cb-party-order" data-order-unit="'+esc(id)+'"><div class="cb-party-order-name"><b>'+esc(ch.name||'Adventurer')+'</b><small>'+esc(r.toUpperCase())+'</small></div><div class="cb-party-order-options" role="group" aria-label="'+esc(ch.name||'Character')+' tactic">'+options.map(([value,label,hint])=>'<button type="button" data-order-choice="'+esc(value)+'" aria-pressed="'+(selected===value)+'" class="'+(selected===value?'active':'')+'"><b>'+esc(label)+'</b><small>'+esc(hint)+'</small></button>').join('')+'</div></div>'
   }).join('')+'</div><p class="cb-party-orders-note">You can still give live commands during combat. These are your standing instructions.</p></section>';
 }
 function bind(root,party=[]){
  const panel=root?.querySelector?.('[data-party-orders]');if(!panel)return;
  panel.addEventListener('click',e=>{
   const reset=e.target.closest('[data-orders-reset]'),button=e.target.closest('[data-order-choice]');
   if(!reset&&!button)return;
   const data=read();
   if(reset)for(const ch of party)delete data[key(ch)];
   else{
    const row=button.closest('[data-order-unit]'),ch=party.find(c=>key(c)===row?.dataset.orderUnit);
    if(!ch||!CHOICES[role(ch)].some(x=>x[0]===button.dataset.orderChoice))return;
    data[key(ch)]=button.dataset.orderChoice;
   }
   save(data);
   const values=current(party);
   panel.querySelectorAll('[data-order-unit]').forEach(row=>{
    row.querySelectorAll('[data-order-choice]').forEach(b=>{
     const active=values[row.dataset.orderUnit]===b.dataset.orderChoice;
     b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))
    })
   })
  })
 }
 const STANCES=[
  ['defensive','Defensive','Control threats and keep the party alive'],
  ['balanced','Balanced','Handle threats without slowing every pull'],
  ['aggressive','Aggressive','Spend cooldowns and burn targets quickly']
 ];
 const stanceKey=id=>storageKey()+':stance:'+String(id);
 function stance(id){try{const v=localStorage.getItem(stanceKey(id));return STANCES.some(s=>s[0]===v)?v:'balanced'}catch(_){return'balanced'}}
 function stanceMarkup(id){
  const selected=stance(id);
  return '<div class="cb-party-stance" data-stance-dungeon="'+esc(id)+'"><small>PARTY APPROACH</small><div class="cb-party-stance-options">'+STANCES.map(([value,title,hint])=>'<button type="button" data-party-stance="'+value+'" aria-pressed="'+(selected===value)+'" class="'+(selected===value?'active':'')+'"><b>'+title+'</b><small>'+hint+'</small></button>').join('')+'</div></div>';
 }
 function bindStance(root,id){
  const panel=root?.querySelector?.('[data-stance-dungeon]');if(!panel)return;
  panel.addEventListener('click',e=>{
   const button=e.target.closest('[data-party-stance]');if(!button||!STANCES.some(s=>s[0]===button.dataset.partyStance))return;
   try{localStorage.setItem(stanceKey(id),button.dataset.partyStance)}catch(_){}
   panel.querySelectorAll('[data-party-stance]').forEach(el=>{
    const chosen=el===button;el.classList.toggle('active',chosen);el.setAttribute('aria-pressed',String(chosen))
   })
  })
 }
 function stanceTactics(id){
  const current=stance(id);
  return current==='defensive'?{pullStyle:'safe',cooldownUse:'difficult',interruptPriority:'high',interruptAssignment:'best',crowdControl:'priority-elites',defensiveUsage:'aggressive',addPriority:'immediate',movementDiscipline:'safety'}:
   current==='aggressive'?{pullStyle:'aggressive',cooldownUse:'free',interruptPriority:'standard',interruptAssignment:'best',crowdControl:'disabled',defensiveUsage:'standard',addPriority:'boss',movementDiscipline:'damage'}:
   {pullStyle:'normal',cooldownUse:'difficult',interruptPriority:'standard',interruptAssignment:'dps-rotation',crowdControl:'priority-elites',defensiveUsage:'standard',addPriority:'immediate',movementDiscipline:'balanced'};
 }
  window.CellboundPartyTactics={VERSION:1,CHOICES,role,key,current,markup,bind,stance,stanceMarkup,bindStance,stanceTactics};
 window.CellboundDungeonQuickEntry={open(id){
  const E=window.CellboundEndgame;
  if(E?.prepare){
   const current=E.getSelection?.(id)||{difficulty:'normal',tier:1};
   // An old saved Heroic/Cellbound+ selection must not turn a quick route
   // into a dead button when that difficulty has since become unavailable.
   if(E.difficultyUnlocked?.(id,current.difficulty||'normal',current.tier||1)===false)E.choose?.(id,'normal',1);
   E.prepare(id);
  }else window.CellboundDungeonBrowser?.open?.(id);
 }};
})();

/* Cellbound UI Block 4: an expedition-preparation panel using live
   values and the existing, permission-controlled game routes. */
(function () {
  'use strict';
  const dungeons=document.querySelector('#content');
  const quests=document.querySelector('#quests');
  const world=document.querySelector('#world');
  const raids=document.querySelector('#raids');
  const status=document.querySelector('#dungeonBrowserStatus');
  const intro=dungeons?.querySelector(':scope > .section-intro');
  if(!intro||!quests||!world||!raids||!status||document.querySelector('#cbAdventureBrief'))return;
  document.body.classList.add('cb-adventure-v4');
  const title=intro.querySelector('h2'),paragraph=intro.querySelector('p');
  if(title)title.textContent='Choose an Expedition';
  if(paragraph)paragraph.textContent='Pick a dungeon, set jobs for your five and enter.';
  const brief=document.createElement('section');
  brief.id='cbAdventureBrief';
  brief.className='cb-adventure-brief cb-adventure-quick';
  brief.setAttribute('aria-label','Quick dungeon entry');
  const routes=[['ashen-vault','Ashen Vault'],['hollow-sanctum','Hollow Sanctum'],['chaos-canyon','Chaos Canyon'],['blackout-station','Blackout Station'],['fractured-ages','Fractured Ages']];
  brief.innerHTML='<div class="cb-adventure-brief__copy"><small>READY TO GO?</small><h3>Choose a dungeon</h3><p>One preparation screen, then combat. Difficulty and party orders are on the next screen.</p></div>'+
   '<div class="cb-dungeon-quick-list">'+routes.map(([id,name])=>'<button type="button" data-cb-quick-dungeon="'+id+'">'+name+' <span aria-hidden="true">→</span></button>').join('')+'</div>';
  brief.addEventListener('click',e=>{
    const button=e.target.closest('[data-cb-quick-dungeon]');if(!button)return;
    const id=button.dataset.cbQuickDungeon;
    window.CellboundDungeonQuickEntry.open(id);
  });
  intro.insertAdjacentElement('afterend',brief);
  // Every card also gets a direct route. Journal lore remains optional.
  // Observe only card additions: the dungeon modules re-render unlocked
  // cards asynchronously after the account's progression is loaded.
  const browser=dungeons.querySelector('#dungeonBrowser');
  function syncDungeonCards(){
    if(!browser)return;
    browser.querySelectorAll('.dungeon-browser-card[data-dungeon-card]').forEach(card=>{
      const id=card.dataset.dungeonCard;
      if(!routes.some(route=>route[0]===id))return;
      let button=card.querySelector('[data-cb-card-launch]');
      if(!button){
        button=document.createElement('button');
        button.type='button';
        button.className='cb-dungeon-card-launch';
        button.dataset.cbCardLaunch=id;
        button.textContent='PLAN & ENTER →';
        const actions=card.querySelector('.dungeon-browser-actions')||card.querySelector('.dungeon-browser-copy')||card;
        actions.appendChild(button);
      }
      button.disabled=card.classList.contains('locked');
      button.title=button.disabled?'Unlock this dungeon through the campaign.':'Set tactics and enter';
    });
  }
  browser?.addEventListener('click',event=>{
    const button=event.target.closest('[data-cb-card-launch]');
    if(!button||button.disabled)return;
    event.preventDefault();event.stopPropagation();
    window.CellboundDungeonQuickEntry.open(button.dataset.cbCardLaunch);
  },true);
  if(browser){
    new MutationObserver(syncDungeonCards).observe(browser,{subtree:true,childList:true});
    syncDungeonCards();
  }

  const nav=document.querySelector('.sidebar .primary-nav');
  function sync(){
   brief.querySelectorAll('[data-cb-quick-dungeon]').forEach(button=>{
    const E=window.CellboundEndgame,id=button.dataset.cbQuickDungeon;
    const selection=E?.getSelection?.(id);
    const unlocked=E?.difficultyUnlocked?.(id,selection?.difficulty||'normal',selection?.tier||1);
    button.disabled=false;
    button.title=unlocked===false?'Open at Normal difficulty to choose a new plan.':'Open dungeon preparation';
   })
  }
  window.addEventListener('cellbound:view-changed',sync);
  sync();
  // Entrances, encounters, quest tracking and raid locks remain with their
  // original game systems, and the Design Booth retains its own UI editor.
})();
