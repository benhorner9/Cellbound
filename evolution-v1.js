(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let Game=null,G=null,P=null,db=null,user=null;
let rosterRole='all',rosterStatus='all',rosterClass='all',rosterProfession='all',rosterSearch='',rosterSort='ilvl';
let bankSearch='',bankCategory='all',bankClass='all',bankRarity='all',bankTrade='all',bankSort='newest';
let profRecipeFilter='all';
let expedition=null;
let worldEncounterId=null;
let dockChannel='world',dockTimer=null,dockMinimized=true;
let bankObserver=null,rosterObserver=null,professionObserver=null,worldObserver=null;

const state=()=>Game?.getState?.();
const ent=()=>Game?.getEntitlements?.()||{rosterCap:5};
const activeIds=()=>new Set([
  state()?.party?.tank,
  state()?.party?.healer,
  ...(state()?.party?.dps||[])
].filter(Boolean));
const party=()=>Game?.getPartyCharacters?.()||[];
const partyIlvl=()=>Number(Game?.partyItemLevel?.())||0;
const roleOf=c=>Game?.classes?.[c?.class]?.specs?.[c?.spec]?.role||'dps';
const charIlvl=c=>Game?.characterItemLevel?.(c)||0;
const completeParty=()=>party().length===5;
const partyAvailable=()=>completeParty()&&!party().some(c=>Game.isUnavailable(c));

const WORLD_BOSS_META={
  'Gloamhide Behemoth':{lore:'A hulking relic of the old forest, its hide has fused with corrupted Cell growth.',reward:'Tier 1 equipment · personal drop on victory'},
  'The Hollow Wyrm':{lore:'An ember-fed wyrm nesting beneath the shattered trade road. Its roar destabilises entire formations.',reward:'Tier 2 equipment · personal drop on victory'},
  'Veyr, the Cell-Torn':{lore:'A commander once consumed by unstable Cells, now held together by raw arcane fracture.',reward:'Tier 3 equipment · personal drop on victory'}
};

const DUNGEON={
  id:'ashen-vault',name:'The Ashen Vault',requiredIlvl:18,recommendedIlvl:23,
  stages:[
    {id:'broken-gate',title:'The Broken Gate',kind:'trash',rune:'⌁',knowledge:'ashwarden',best:'focus',desc:'Ash Cultists channel into Cinder Hounds while the pack tests your back line.',enemies:[['Ash Cultist','Low-health caster. Dangerous if ignored.'],['Cinder Hound','Rushes vulnerable ranged adventurers.']],base:76},
    {id:'hall-embers',title:'Hall of Embers',kind:'trash',rune:'♜',knowledge:'ashwarden',best:'interrupt',desc:'Armoured Guardians screen the casters behind them.',enemies:[['Ash Guardian','Protects nearby cultists.'],['Ember Acolyte','Long cast that must be stopped.']],base:71},
    {id:'kael',title:'Ash Warden Kael',kind:'boss',rune:'♜',knowledge:'ashwarden',best:'defend',desc:'The Warden punishes exposed front lines with a brutal cleave.',enemies:[['Ash Warden Kael','Mini-boss · frontal cleave · armour pressure.']],base:66,bossId:'ashwarden'},
    {id:'furnace',title:'The Furnace Passage',kind:'event',rune:'♨',knowledge:'embermaw',best:'defend',desc:'Heat vents flare between packs while Cinder Hounds force the party to move.',enemies:[['Furnace Hazard','Sustained fire pressure.'],['Cinder Hound Pack','Targets weakened party members.']],base:69},
    {id:'embermaw',title:'Embermaw',kind:'boss',rune:'♨',knowledge:'embermaw',best:'interrupt',desc:'A furnace-born beast whose roar empowers a lethal flame burst.',enemies:[['Embermaw','Elite encounter · group damage · interrupt check.']],base:62,bossId:'embermaw'},
    {id:'vault-depths',title:'The Vault Depths',kind:'trash',rune:'◇',knowledge:'vaultheart',best:'focus',desc:'Soul Binders and Guardians combine control with heavy frontline pressure.',enemies:[['Soul Binder','Attempts to disable one adventurer.'],['Ash Guardian','Protects the Binder.']],base:66},
    {id:'vaultheart',title:'The Vaultheart',kind:'final',rune:'◇',knowledge:'vaultheart',best:'aggressive',desc:'The living forge core cycles through burst windows before destabilising.',enemies:[['The Vaultheart','Final boss · multi-phase burst encounter.']],base:58,bossId:'vaultheart'}
  ]
};

const HINTS={
  ashwarden:[
    [0,'Your scouts can only confirm that something heavily armoured holds the inner gate.'],
    [20,'The Warden uses a sweeping frontal attack. Keep vulnerable heroes away from his facing.'],
    [40,'His guard drops briefly after the cleave. Defensive timing creates a safe damage window.'],
    [60,'Ash Guardians protect nearby cultists. Removing the support line first shortens the fight.'],
    [80,'Kael is most vulnerable immediately after his heavy swing.'],
    [100,'Full field notes: absorb the cleave, then commit damage while his guard is open.']
  ],
  embermaw:[
    [0,'Heat signatures deepen beyond the furnace passage.'],
    [20,'Embermaw builds toward a party-wide flame burst.'],
    [40,'The roar immediately before the burst can be interrupted.'],
    [60,'Interrupting the roar weakens the following burn window.'],
    [80,'Save your strongest interruption for the second roar.'],
    [100,'Full field notes: interrupt each roar and stabilise before committing burst damage.']
  ],
  vaultheart:[
    [0,'The lowest chamber pulses like a heartbeat.'],
    [20,'The Vaultheart changes behaviour as its shell fractures.'],
    [40,'Its final phase creates short, high-value burst windows.'],
    [60,'Soul Binders in the approach are training for the control effect used in the final chamber.'],
    [80,'The final phase rewards an aggressive finish before instability overwhelms the party.'],
    [100,'Full field notes: conserve resources, then commit everything once the core is exposed.']
  ]
};

function ensureState(){
  const s=state();if(!s)return;
  s.dungeonHistory=Array.isArray(s.dungeonHistory)?s.dungeonHistory:[];
  s.dungeonCompletions=Number(s.dungeonCompletions)||0;
}
async function persist(render=true){
  Game.save();
  await Game.persistState();
  if(render)Game.renderAll();
  queueEnhance();
}

/* ---------- Roster ---------- */
function enhanceRoster(){
  const root=$('#rosterGrid'),s=state();if(!root||!s)return;
  const ids=activeIds();
  const chars=s.roster.slice(0,ent().rosterCap);
  const byId=new Map(chars.map(c=>[c.id,c]));
  const cards=[...root.querySelectorAll('.char-card')];
  cards.forEach(card=>{
    const id=card.querySelector('[data-char]')?.dataset.char;
    const c=byId.get(id);if(!c)return;
    card.dataset.charId=id;
    card.dataset.activeParty=ids.has(id)?'1':'0';
    card.dataset.status=Game.isUnavailable(c)?'recovering':'available';
    card.dataset.ilvl=String(charIlvl(c));
    card.dataset.level=String(c.level||1);
    card.dataset.shock=String(c.cellShock||0);
    card.dataset.name=(c.name||'').toLowerCase();
    card.dataset.class=(c.class||'').toLowerCase();
    const gearSlots=['Head','Chest','Weapon'].map(slot=>({slot,item:Game.canonicalItem(c.equipment?.[slot])}));
    gearSlots.sort((a,b)=>(Number(a.item?.itemLevel)||0)-(Number(b.item?.itemLevel)||0));
    const weakest=gearSlots[0],professions=(c.professions||[]).filter(Boolean);
    let footer=card.querySelector('.evo-roster-footer');
    if(!footer){footer=document.createElement('div');footer.className='evo-roster-footer';const action=card.querySelector('[data-char]');action?.insertAdjacentElement('beforebegin',footer)}
    if(footer)footer.innerHTML=`<div><span>Professions</span><b>${professions.length?professions.map(p=>`${esc(p.name)} ${p.level}`).join(' · '):'Untrained'}</b></div><div><span>Weakest Gear</span><b>${esc(weakest?.slot||'—')} · iLvl ${weakest?.item?.itemLevel||0}</b></div>`;
  });
  const filtered=cards.filter(card=>{
    const c=byId.get(card.dataset.charId);if(!c)return false;
    const roleOk=rosterRole==='all'||roleOf(c)===rosterRole;
    const q=rosterSearch.toLowerCase();
    const searchOk=!q||[c.name,c.class,c.spec,...(c.professions||[]).filter(Boolean).map(p=>p.name)].join(' ').toLowerCase().includes(q);
    const isActive=ids.has(c.id),recovering=Game.isUnavailable(c);
    const statusOk=rosterStatus==='all'||(rosterStatus==='active'&&isActive)||(rosterStatus==='reserve'&&!isActive)||(rosterStatus==='available'&&!recovering)||(rosterStatus==='recovering'&&recovering);
    const classOk=rosterClass==='all'||c.class===rosterClass;
    const profs=(c.professions||[]).filter(Boolean).map(p=>p.name);
    const professionOk=rosterProfession==='all'||(rosterProfession==='untrained'&&!profs.length)||profs.includes(rosterProfession);
    return roleOk&&searchOk&&statusOk&&classOk&&professionOk;
  });
  filtered.sort((a,b)=>{
    const ca=byId.get(a.dataset.charId),cb=byId.get(b.dataset.charId);
    if(rosterSort==='name')return ca.name.localeCompare(cb.name);
    if(rosterSort==='level')return (cb.level||0)-(ca.level||0);
    if(rosterSort==='shock')return (cb.cellShock||0)-(ca.cellShock||0);
    return charIlvl(cb)-charIlvl(ca);
  });
  cards.forEach(c=>c.style.display='none');
  const currentOrder=[...root.querySelectorAll('.char-card')].filter(c=>filtered.includes(c)).map(c=>c.dataset.charId).join('|');
  const targetOrder=filtered.map(c=>c.dataset.charId).join('|');
  filtered.forEach(c=>{c.style.display=''});
  if(currentOrder!==targetOrder)filtered.forEach(c=>root.appendChild(c));
  let empty=root.querySelector('.roster-empty-state');
  if(!filtered.length){if(!empty){empty=document.createElement('div');empty.className='roster-empty-state';empty.textContent='No adventurers match these filters.';root.appendChild(empty)}}else empty?.remove();
  const recovering=chars.filter(c=>Game.isUnavailable(c)).length;
  if($('#rosterActiveSummary'))$('#rosterActiveSummary').textContent=`${ids.size} / 5 deployed`;
  if($('#rosterRecoverySummary'))$('#rosterRecoverySummary').textContent=recovering?`${recovering} recovering from Cell Shock`:'All adventurers available';
}
function bindRoster(){
  $('#rosterSearch')?.addEventListener('input',e=>{rosterSearch=e.target.value;enhanceRoster()});
  $('#rosterStatusFilter')?.addEventListener('change',e=>{rosterStatus=e.target.value;enhanceRoster()});
  $('#rosterClassFilter')?.addEventListener('change',e=>{rosterClass=e.target.value;enhanceRoster()});
  $('#rosterProfessionFilter')?.addEventListener('change',e=>{rosterProfession=e.target.value;enhanceRoster()});
  $('#rosterSort')?.addEventListener('change',e=>{rosterSort=e.target.value;enhanceRoster()});
  $$('.roster-role-filters [data-filter]').forEach(b=>b.addEventListener('click',()=>{rosterRole=b.dataset.filter;setTimeout(enhanceRoster,0)}));
  const root=$('#rosterGrid');if(root){rosterObserver=new MutationObserver(()=>requestAnimationFrame(enhanceRoster));rosterObserver.observe(root,{childList:true})}
}

/* ---------- Bank ---------- */
const rarityRank={Epic:4,Rare:3,Uncommon:2,Common:1,Starter:0};
function bankUpgradeCount(item){
  return state().roster.slice(0,ent().rosterCap).filter(c=>{
    const can=item.class===c.class||item.classes==='all'||item.classes?.includes?.(c.class);
    if(!can)return false;
    const current=Game.canonicalItem(c.equipment?.[item.slot]);
    return (Number(item.itemLevel)||0)>(Number(current?.itemLevel)||0);
  }).length;
}
function enhanceBank(){
  const root=$('#bankGrid'),s=state();if(!root||!s)return;
  const byId=new Map(s.bank.map(x=>[x.id,x]));

  const resourceModels=[
    ...Object.entries(s.materials||{}).filter(([,q])=>Number(q)>0).map(([key,q])=>({key:`mat:${key}`,name:P?.MATERIALS?.[key]?.name||key,category:'Reagent',rarity:P?.MATERIALS?.[key]?.rarity||'Common',quantity:Number(q),source:P?.MATERIALS?.[key]?.source||'Dungeon reagent',icon:P?.MATERIALS?.[key]?.icon||'◇',tradeState:'tradeable'})),
    ...(s.consumables||[]).filter(x=>(x.quantity||0)>0).map(x=>({key:`con:${x.key}`,name:x.name,category:'Consumable',rarity:'Uncommon',quantity:x.quantity||1,source:'Crafted stock',icon:'⚗',tradeState:'tradeable'})),
    ...(s.recipeScrolls||[]).filter(x=>(x.quantity||0)>0).map(x=>({key:`rec:${x.recipeId}`,name:x.name,category:'Recipe',rarity:'Rare',quantity:x.quantity||1,source:'Rare recipe scroll',icon:'▤',tradeState:'tradeable'}))
  ];
  const resourceSignature=resourceModels.map(x=>`${x.key}:${x.quantity}`).join('|');
  if(root.dataset.resourceSignature!==resourceSignature||root.querySelectorAll('.evo-bank-resource').length!==resourceModels.length){
    root.dataset.resourceSignature=resourceSignature;
    root.querySelectorAll('.evo-bank-resource').forEach(x=>x.remove());
    if(resourceModels.length)root.querySelector('.bank-empty')?.remove();
    resourceModels.forEach(item=>{
      const card=document.createElement('article');
      card.className=`bank-item evo-bank-resource rarity-${String(item.rarity).toLowerCase()}`;
      card.dataset.evoKey=item.key;
      card.innerHTML=`<div class="bank-icon gear-bank-icon"><span class="evo-resource-icon">${esc(item.icon)}</span></div><div class="bank-copy"><small>${esc(item.category.toUpperCase())} · ${esc(item.rarity.toUpperCase())}</small><h3>${esc(item.name)}</h3><p>${esc(item.source)}</p></div><div class="bank-qty">×${item.quantity}</div><button data-resource-jump="professions">OPEN PROFESSIONS</button>`;
      root.appendChild(card);
    });
    root.querySelectorAll('[data-resource-jump]').forEach(btn=>btn.addEventListener('click',()=>Game.switchView('professions')));
  }

  const gearCards=[...root.querySelectorAll('[data-bank-item]')].map(b=>b.closest('.bank-item')).filter(Boolean);
  gearCards.forEach(card=>{
    const id=card.querySelector('[data-bank-item]')?.dataset.bankItem,item=byId.get(id);if(!item)return;
    card.dataset.itemId=id;card.dataset.evoKey=`gear:${id}`;
    const upgrades=bankUpgradeCount(item);
    let chip=card.querySelector('.bank-upgrade-chip');
    if(!chip){chip=document.createElement('span');chip.className='bank-upgrade-chip';card.appendChild(chip)}
    chip.classList.toggle('none',upgrades===0);chip.textContent=upgrades?`UPGRADE FOR ${upgrades}`:'NO DIRECT UPGRADE';
  });

  const resourceByKey=new Map(resourceModels.map(x=>[x.key,x]));
  const entries=[
    ...gearCards.map((card,index)=>({card,item:byId.get(card.dataset.itemId),category:'Gear',order:index})),
    ...[...root.querySelectorAll('.evo-bank-resource')].map((card,index)=>({card,item:resourceByKey.get(card.dataset.evoKey),category:resourceByKey.get(card.dataset.evoKey)?.category,order:10000+index}))
  ].filter(x=>x.item);

  const visible=entries.filter(({item,category})=>{
    const q=bankSearch.toLowerCase();
    const searchOk=!q||[item.name,item.class,item.slot,item.source,item.category].filter(Boolean).join(' ').toLowerCase().includes(q);
    let categoryOk=bankCategory==='all';
    if(!categoryOk&&category==='Gear'){
      categoryOk=bankCategory==='Armour'?['Head','Chest','Shoulders','Hands','Waist','Legs','Feet'].includes(item.slot):item.slot===bankCategory;
    }else if(!categoryOk)categoryOk=category===bankCategory;
    const classOk=bankClass==='all'||(category==='Gear'&&(item.class===bankClass||item.classes==='all'||item.classes?.includes?.(bankClass)));
    const rarityOk=bankRarity==='all'||item.rarity===bankRarity;
    const tradeOk=bankTrade==='all'||(item.tradeState||'tradeable')===bankTrade;
    return searchOk&&categoryOk&&classOk&&rarityOk&&tradeOk;
  });

  visible.sort((a,b)=>{
    const ia=a.item,ib=b.item;
    if(bankSort==='ilvl-desc')return (ib.itemLevel||0)-(ia.itemLevel||0);
    if(bankSort==='ilvl-asc')return (ia.itemLevel||0)-(ib.itemLevel||0);
    if(bankSort==='rarity')return (rarityRank[ib.rarity]||0)-(rarityRank[ia.rarity]||0);
    if(bankSort==='name')return ia.name.localeCompare(ib.name);
    return b.order-a.order;
  });

  entries.forEach(x=>x.card.dataset.hidden='1');
  const currentOrder=[...root.querySelectorAll('.bank-item')].filter(card=>visible.some(x=>x.card===card)).map(card=>card.dataset.evoKey).join('|');
  const targetOrder=visible.map(x=>x.card.dataset.evoKey).join('|');
  visible.forEach(x=>x.card.dataset.hidden='0');
  if(currentOrder!==targetOrder)visible.forEach(x=>root.appendChild(x.card));

  const craftTotal=resourceModels.reduce((n,x)=>n+x.quantity,0),summary=$('#bankSummary');
  if(summary){
    let box=summary.querySelector('.evo-bank-summary');
    if(!box){box=document.createElement('div');box.className='evo-bank-summary';summary.appendChild(box)}
    box.innerHTML=`<span>Crafting Stock</span><b>${craftTotal}</b>`;
  }
}
function bindBank(){
  const pairs=[['bankSearch','input',v=>bankSearch=v],['bankCategory','change',v=>bankCategory=v],['bankClass','change',v=>bankClass=v],['bankRarity','change',v=>bankRarity=v],['bankTrade','change',v=>bankTrade=v],['bankSort','change',v=>bankSort=v]];
  pairs.forEach(([id,ev,set])=>$('#'+id)?.addEventListener(ev,e=>{set(e.target.value);enhanceBank()}));
  const root=$('#bankGrid');if(root){bankObserver=new MutationObserver(()=>requestAnimationFrame(enhanceBank));bankObserver.observe(root,{childList:true})}
}

/* ---------- Professions ---------- */
function enhanceProfessions(){
  const root=$('#professionWorkshop');if(!root)return;
  root.querySelectorAll('.recipe-card').forEach(card=>{
    const btn=card.querySelector('[data-craft]'),id=btn?.dataset.craft,recipe=P?.recipeById?.(id);
    const ready=btn&&!btn.disabled&&!card.classList.contains('locked');
    const rare=Boolean(recipe?.requiresDiscovery||recipe?.endgame);
    card.dataset.evoHidden=(profRecipeFilter==='ready'&&!ready)||(profRecipeFilter==='locked'&&ready)||(profRecipeFilter==='rare'&&!rare)?'1':'0';
    if(recipe&&!card.querySelector('.evo-recipe-art')){
      const output=recipe.output||{},gear=output.category==='gear'?(G.byId(output.key)||G.byName(output.name)):null;
      const art=document.createElement('span');art.className='evo-recipe-art';
      art.innerHTML=gear?G.artHTML(gear,54):(output.category==='consumable'?'⚗':'◇');
      card.prepend(art);card.classList.add('has-art');
    }
    if(recipe&&!card.querySelector('.evo-recipe-owned')){
      const owned=document.createElement('div');owned.className='evo-recipe-owned';
      owned.innerHTML=Object.entries(recipe.inputs||{}).map(([k,q])=>{const m=P.MATERIALS?.[k],have=Number(state()?.materials?.[k])||0;return `<span class="${have>=q?'ready':'missing'}"><b>${esc(m?.name||k)}</b> ${have}/${q}</span>`}).join('');
      card.querySelector('div')?.appendChild(owned);
    }
    if(recipe&&!card.querySelector('.evo-recipe-sources')){
      const line=document.createElement('p');line.className='evo-recipe-sources';
      line.innerHTML=Object.keys(recipe.inputs||{}).map(k=>{
        const m=P.MATERIALS?.[k];return m?`<span title="${esc(m.source)}">${esc(m.name)} · ${esc(m.source)}</span>`:'';
      }).filter(Boolean).join('<br>');
      card.querySelector('div')?.appendChild(line);
    }
  });
}
function bindProfessions(){
  $$('#professionRecipeFilters [data-prof-recipe-filter]').forEach(b=>b.addEventListener('click',()=>{
    profRecipeFilter=b.dataset.profRecipeFilter;
    $$('#professionRecipeFilters [data-prof-recipe-filter]').forEach(x=>x.classList.toggle('active',x===b));
    enhanceProfessions();
  }));
  const root=$('#professionWorkshop');if(root){professionObserver=new MutationObserver(()=>requestAnimationFrame(enhanceProfessions));professionObserver.observe(root,{childList:true,subtree:true})}
}

/* ---------- Dungeon Journal ---------- */
function avgKnowledge(key){
  const ps=party();if(!ps.length)return 0;
  return Math.round(ps.reduce((n,c)=>n+(Number(c.knowledge?.[key])||0),0)/ps.length);
}
function currentHint(key){
  const k=avgKnowledge(key),list=HINTS[key]||[];
  let found=list[0]?.[1]||'No field notes available.';
  for(const [at,text] of list)if(k>=at)found=text;
  return {knowledge:k,text:found};
}
function renderDungeonJournal(){
  const route=$('#dungeonRoute'),intel=$('#dungeonIntel');if(!route||!intel||!state())return;
  ensureState();
  const kills=state().bossKills||{};
  route.innerHTML=DUNGEON.stages.map((st,i)=>{
    const complete=st.bossId?Boolean(kills[st.bossId]):false;
    const label=st.kind==='final'?'FINAL BOSS':st.kind==='boss'?'ENCOUNTER':st.kind==='event'?'DUNGEON EVENT':'ENEMY PACK';
    return `<div class="dungeon-stage ${complete?'complete':''}" data-kind="${st.kind}"><div class="dungeon-stage-rune">${complete?'✓':st.rune}</div><div class="dungeon-stage-copy"><b>${i+1}. ${st.title}</b><small>${st.desc}</small></div><span class="dungeon-stage-tag">${label}</span></div>`;
  }).join('');
  const intelKeys=[['ashwarden','Ash Warden Kael'],['embermaw','Embermaw'],['vaultheart','The Vaultheart']];
  const history=state().dungeonHistory||[],last=history[0];
  intel.innerHTML=intelKeys.map(([key,name])=>{const h=currentHint(key);return `<article class="intel-card"><div class="intel-card-head"><b>${name}</b><span>${h.knowledge}% known</span></div><p class="${h.knowledge<20?'intel-lock':''}">${esc(h.text)}</p></article>`}).join('')+
    `<article class="intel-card"><div class="intel-card-head"><b>Expedition Record</b><span>${state().dungeonCompletions||0} clears</span></div><p>${last?`Last expedition: ${last.result==='complete'?'Cleared':'Wiped at '+String(last.stage||'unknown').replaceAll('-',' ')} · Party iLvl ${Math.round(last.partyIlvl||0)}.`:'No expedition has been recorded yet.'}</p></article>`+
    `<article class="intel-card"><div class="intel-card-head"><b>Known Rewards</b><span>T1 / T2</span></div><p>Class equipment, Ashen Soul Fragments, Warden Iron, Ember Cores and Vaultheart Crystals. Rare profession discoveries can also emerge from the deepest chamber.</p></article>`;
  const pi=partyIlvl(),ready=partyAvailable()&&pi>=DUNGEON.requiredIlvl;
  if($('#journalPartyIlvl'))$('#journalPartyIlvl').textContent=`Party iLvl ${pi||'—'}`;
  if($('#journalEntryHint'))$('#journalEntryHint').textContent=!completeParty()?'Build a complete 5-character party first.':!partyAvailable()?'A party member is unavailable due to Cell Shock.':pi<DUNGEON.requiredIlvl?`Party iLvl ${pi}. You need ${DUNGEON.requiredIlvl}.`:`Ready. Recommended iLvl ${DUNGEON.recommendedIlvl}.`;
  if($('#enterDungeonBtn'))$('#enterDungeonBtn').disabled=!ready;
}
function expeditionCondition(id){return expedition?.condition?.[id]??100}
function commandLabel(id){return ({focus:['FOCUS PRIORITY','Burn the most dangerous target first.'],interrupt:['INTERRUPT','Hold control for the key cast.'],defend:['DEFENSIVE STANCE','Trade damage for stability.'],aggressive:['COMMIT DAMAGE','Push through the danger window.']})[id]}
function dungeonConsumable(){
  const stock=state()?.consumables||[],stage=DUNGEON.stages[expedition?.stage||0];
  const priority=stage?.id==='vaultheart'?['vaultheart-tonic','emberward-flask','minor-recovery-tonic']:stage?.id==='embermaw'||stage?.id==='furnace'?['emberward-flask','minor-recovery-tonic','vaultheart-tonic']:['minor-recovery-tonic','emberward-flask','vaultheart-tonic'];
  for(const key of priority){const item=stock.find(x=>x.key===key&&(x.quantity||0)>0);if(item)return item}
  return null;
}
async function useDungeonConsumable(){
  if(!expedition||expedition.resolved)return;
  const item=dungeonConsumable();if(!item){expedition.log.push('No usable expedition consumables remain.');renderExpedition();return}
  const stage=DUNGEON.stages[expedition.stage];
  if(item.key==='minor-recovery-tonic'){
    const lowest=party().slice().sort((a,b)=>expeditionCondition(a.id)-expeditionCondition(b.id))[0];
    if(lowest)expedition.condition[lowest.id]=clamp(expeditionCondition(lowest.id)+24,0,100);
    expedition.log.push(`${lowest?.name||'The party'} uses a Minor Recovery Tonic and steadies the formation.`);
  }else if(item.key==='emberward-flask'){
    party().forEach(ch=>expedition.condition[ch.id]=clamp(expeditionCondition(ch.id)+10,0,100));
    expedition.buff={kind:'emberward',stage:stage.id,bonus:stage.id==='embermaw'||stage.id==='furnace'?14:6};
    expedition.log.push('An Emberward Flask coats the party in heat-resistant alchemy.');
  }else{
    party().forEach(ch=>expedition.condition[ch.id]=clamp(expeditionCondition(ch.id)+7,0,100));
    expedition.buff={kind:'vaultheart',stage:stage.id,bonus:stage.id==='vaultheart'?17:7};
    expedition.log.push('A Vaultheart Tonic sharpens the party for the next command.');
  }
  item.quantity--;if(item.quantity<=0)state().consumables=state().consumables.filter(x=>x!==item);
  state().activity.push(`${item.name} used during ${DUNGEON.name}.`);
  await persist(false);renderExpedition();
}
function stageChance(stage,command){
  const pi=partyIlvl(),knowledge=avgKnowledge(stage.knowledge),adv=(pi-DUNGEON.requiredIlvl)*2.2,conditionAvg=party().reduce((n,c)=>n+expeditionCondition(c.id),0)/5;
  let chance=stage.base+adv+knowledge*.16+(conditionAvg-75)*.12;
  chance+=command===stage.best?17:-5;
  if(command==='defend')chance+=4;
  if(expedition?.buff?.stage===stage.id)chance+=Number(expedition.buff.bonus)||0;
  return clamp(Math.round(chance),24,96);
}
function expeditionLoot(stage){
  const s=state(),boss=Game.bosses.find(b=>b.id===stage.bossId);if(!boss)return{loot:null,reagents:[]};
  const reagents=P?.rollReagents?.(boss.id)||[];reagents.forEach(d=>Game.addMaterial(d.key,d.quantity));
  let loot=null;
  const guaranteed=stage.kind==='final',roll=guaranteed||Math.random()<(stage.id==='embermaw'?.55:.38);
  if(roll){loot=G.rollDungeonLoot(boss.name,boss.tier2Chance);Game.addBankItem({...loot,source:`${DUNGEON.name} · ${boss.name}`})}
  if(stage.id==='vaultheart'&&!state().discoveredRecipes.includes('enc-vault-glyph')&&!state().recipeScrolls.some(x=>x.recipeId==='enc-vault-glyph')&&Math.random()<.12){state().recipeScrolls.push({recipeId:'enc-vault-glyph',name:'Recipe: Vaultheart Glyph',quantity:1});reagents.push({key:'recipe:enc-vault-glyph',quantity:1,recipe:true});state().activity.push('Rare recipe scroll dropped: Vaultheart Glyph.');}
  return {loot,reagents};
}
function gainKnowledge(stage,success){
  const s=state(),amount=success?(stage.kind==='trash'||stage.kind==='event'?3+Math.floor(Math.random()*3):6+Math.floor(Math.random()*5)):5;
  party().forEach(c=>{c.knowledge=c.knowledge||{};c.knowledge[stage.knowledge]=clamp((Number(c.knowledge[stage.knowledge])||0)+amount,0,100)});
  return amount;
}
function expeditionModal(){
  let root=$('#evoExpeditionBackdrop');
  if(!root){root=document.createElement('div');root.id='evoExpeditionBackdrop';root.className='evo-expedition-backdrop';root.hidden=true;document.body.appendChild(root)}
  return root;
}
function startExpedition(){
  if(!partyAvailable()||partyIlvl()<DUNGEON.requiredIlvl)return;
  ensureState();
  expedition={stage:0,condition:Object.fromEntries(party().map(c=>[c.id,100])),log:['The party crosses the Broken Gate.'],resolved:false};
  renderExpedition();
}
function renderExpedition(){
  const root=expeditionModal();if(!expedition){root.hidden=true;return}
  root.hidden=false;
  const stage=DUNGEON.stages[expedition.stage],chancePreview=stageChance(stage,stage.best);
  root.innerHTML=`<section class="evo-expedition"><header class="evo-expedition-head"><div><small>${DUNGEON.name.toUpperCase()} · EXPEDITION</small><h2>${stage.title}</h2></div><button data-expedition-close title="Leave dungeon">×</button></header>
    <div class="evo-expedition-map">${DUNGEON.stages.map((s,i)=>`<span class="evo-map-node ${i<expedition.stage?'done':i===expedition.stage?'current':''}">${i+1}. ${s.title}</span>`).join('')}</div>
    <div class="evo-expedition-scene"><div class="evo-scene-main"><small class="evo-scene-kicker">${stage.kind==='final'?'FINAL BOSS':stage.kind==='boss'?'ENCOUNTER':stage.kind==='event'?'DUNGEON EVENT':'HOSTILE PACK'}</small><h3>${stage.title}</h3><p>${stage.desc}</p>
      <div class="evo-enemy-line">${stage.enemies.map(([n,d])=>`<div class="evo-enemy"><b>${n}</b><small>${d}</small></div>`).join('')}</div>
      <div class="evo-command-bar">${['focus','interrupt','defend','aggressive'].map(cmd=>{const [a,b]=commandLabel(cmd);return `<button data-expedition-command="${cmd}" ${expedition.resolved?'disabled':''}><b>${a}</b><small>${b}</small></button>`}).join('')}<button class="evo-consumable-command" data-expedition-consumable ${expedition.resolved||!dungeonConsumable()?'disabled':''}><b>USE CONSUMABLE</b><small>${dungeonConsumable()?esc(dungeonConsumable().name):'No usable consumables in stock.'}</small></button></div>
      <div class="evo-expedition-log">${expedition.log.slice(-4).map(x=>esc(x)).join('<br>')}</div><div id="evoExpeditionResult"></div>
    </div><aside class="evo-party-status"><small>ACTIVE FIVE · PARTY ILVL ${partyIlvl()}</small>${party().map(c=>`<div class="evo-party-member"><span class="avatar">${esc(c.portrait)}</span><div><b>${esc(c.name)}</b><small>${esc(c.class)} · ${esc(c.spec)}</small></div><strong>${expeditionCondition(c.id)}% condition</strong></div>`).join('')}<div class="evo-expedition-log">Field knowledge: ${avgKnowledge(stage.knowledge)}%<br>Best-known approach projects roughly ${chancePreview}% stability.</div></aside></div></section>`;
  root.querySelector('[data-expedition-close]')?.addEventListener('click',()=>{expedition=null;renderExpedition()});
  root.querySelectorAll('[data-expedition-command]').forEach(b=>b.addEventListener('click',()=>resolveExpeditionStage(b.dataset.expeditionCommand)));
  root.querySelector('[data-expedition-consumable]')?.addEventListener('click',useDungeonConsumable);
}
async function resolveExpeditionStage(command){
  if(!expedition||expedition.resolved)return;
  expedition.resolved=true;
  const stage=DUNGEON.stages[expedition.stage],chance=stageChance(stage,command),success=Math.random()*100<chance;
  const usedBuff=expedition.buff?.stage===stage.id; if(usedBuff)expedition.buff=null;
  const result=$('#evoExpeditionResult');
  if(success){
    const dmg=command===stage.best?Math.floor(Math.random()*9)+4:Math.floor(Math.random()*14)+8;
    party().forEach(c=>expedition.condition[c.id]=clamp(expeditionCondition(c.id)-dmg,10,100));
    const knowledge=gainKnowledge(stage,true),reward=stage.bossId?expeditionLoot(stage):{loot:null,reagents:[]};
    if(stage.bossId)state().bossKills[stage.bossId]=true;
    if(stage.id==='kael')state().gold+=35;
    if(stage.id==='embermaw')state().gold+=55;
    expedition.log.push(command===stage.best?`Command read correctly. ${stage.title} is cleared cleanly.`:`${stage.title} falls, but the party pays for an imperfect call.`);
    state().activity.push(`${stage.title} cleared during ${DUNGEON.name}.`);
    await persist(false);
    const final=expedition.stage===DUNGEON.stages.length-1;
    if(final){
      state().gold+=120;state().renown+=60;state().dungeonCompletions++;state().dungeonHistory.unshift({at:new Date().toISOString(),result:'complete',partyIlvl:partyIlvl()});state().dungeonHistory=state().dungeonHistory.slice(0,20);
      state().activity.push(`${DUNGEON.name} cleared. The Vaultheart has fallen.`);
      await persist();
    }
    if(result)result.innerHTML=`<div class="evo-expedition-result"><h4>${final?'DUNGEON COMPLETE':'PATH CLEARED'}</h4><p>Encounter knowledge +${knowledge}%.${reward.loot?` ${esc(reward.loot.name)} was sent to the Guild Bank.`:''}${reward.reagents.length?` Reagents: ${reward.reagents.map(r=>`${P.MATERIALS?.[r.key]?.name||r.key} ×${r.quantity}`).join(', ')}.`:''}</p><button data-expedition-next>${final?'RETURN TO GUILD':'CONTINUE DEEPER →'}</button></div>`;
    result?.querySelector('[data-expedition-next]')?.addEventListener('click',()=>{if(final){expedition=null;renderExpedition();Game.switchView('content');renderDungeonJournal()}else{expedition.stage++;expedition.resolved=false;renderExpedition()}});
  }else{
    gainKnowledge(stage,false);
    party().forEach(c=>expedition.condition[c.id]=clamp(expeditionCondition(c.id)-34,0,100));
    const wiped=stage.kind==='boss'||stage.kind==='final'||party().some(c=>expeditionCondition(c.id)<=0);
    expedition.log.push(wiped?`${stage.title} breaks the formation. The expedition ends in a wipe.`:`The command fails. The party regroups, badly shaken.`);
    if(wiped){
      Game.applyPartyCellShock(25);
      state().dungeonHistory.unshift({at:new Date().toISOString(),result:'wipe',stage:stage.id,partyIlvl:partyIlvl()});state().dungeonHistory=state().dungeonHistory.slice(0,20);
      state().activity.push(`The guild wiped at ${stage.title}. All five gained 25% Cell Shock.`);
      await persist();
    }else await persist(false);
    if(result)result.innerHTML=`<div class="evo-expedition-result"><h4>${wiped?'EXPEDITION FAILED':'PARTY STAGGERED'}</h4><p>${wiped?'All five adventurers gain 25% Cell Shock.':'You can push onward, but the party is carrying damage into the next encounter.'}</p><button data-expedition-recover>${wiped?'RETURN TO GUILD':'TRY A DIFFERENT COMMAND'}</button></div>`;
    result?.querySelector('[data-expedition-recover]')?.addEventListener('click',()=>{if(wiped){expedition=null;renderExpedition();Game.switchView('content');renderDungeonJournal()}else{expedition.resolved=false;renderExpedition()}});
  }
}

/* ---------- Persistent chat dock ---------- */
function dock(){
  let root=$('#evoChatDock');
  if(!root){
    root=document.createElement('aside');root.id='evoChatDock';root.className='evo-chat-dock minimized';
    root.innerHTML=`<div class="evo-chat-head"><b>Guild Chat</b><small id="evoChatStatus">WORLD</small><button data-dock-toggle>▴</button></div><div class="evo-chat-body"><div class="evo-chat-tabs"><button class="active" data-dock-channel="world">WORLD</button><button data-dock-channel="trade">TRADE</button><button data-dock-channel="party">GROUPS</button></div><div id="evoChatMessages" class="evo-chat-messages"></div><form id="evoChatForm" class="evo-chat-form"><input maxlength="300" autocomplete="off" placeholder="Message World…"><button>SEND</button></form></div>`;
    document.body.appendChild(root);
    root.querySelector('[data-dock-toggle]').addEventListener('click',e=>{e.stopPropagation();dockMinimized=!dockMinimized;root.classList.toggle('minimized',dockMinimized);e.currentTarget.textContent=dockMinimized?'▴':'▾';if(!dockMinimized)loadDockChat()});
    root.querySelector('.evo-chat-head').addEventListener('click',()=>{if(dockMinimized){dockMinimized=false;root.classList.remove('minimized');root.querySelector('[data-dock-toggle]').textContent='▾';loadDockChat()}});
    root.querySelectorAll('[data-dock-channel]').forEach(b=>b.addEventListener('click',()=>{dockChannel=b.dataset.dockChannel;root.querySelectorAll('[data-dock-channel]').forEach(x=>x.classList.toggle('active',x===b));$('#evoChatStatus').textContent=dockChannel.toUpperCase();root.querySelector('input').placeholder='Message '+(dockChannel==='party'?'Groups':dockChannel[0].toUpperCase()+dockChannel.slice(1))+'…';loadDockChat()}));
    root.querySelector('#evoChatForm').addEventListener('submit',sendDockChat);
  }
  return root;
}
async function loadDockChat(){
  if(!db||dockMinimized)return;
  const {data,error}=await db.from('chat_messages').select('guild_label,body,created_at').eq('channel',dockChannel).order('created_at',{ascending:false}).limit(35);
  if(error)return;
  const root=$('#evoChatMessages');if(!root)return;
  root.innerHTML=(data||[]).reverse().map(m=>`<div class="evo-chat-line"><b>${esc(m.guild_label)}</b><span>${esc(m.body)}</span></div>`).join('')||'<div class="evo-chat-line"><span>No messages yet.</span></div>';root.scrollTop=root.scrollHeight;
}
async function sendDockChat(e){
  e.preventDefault();const input=e.currentTarget.querySelector('input'),body=input.value.trim();if(!body)return;
  const {error}=await db.rpc('post_chat_message',{p_channel:dockChannel,p_body:body});
  if(error){input.setCustomValidity(error.message||'Could not send message');input.reportValidity();setTimeout(()=>input.setCustomValidity(''),1000);return}
  input.value='';await loadDockChat();
}

/* ---------- World screen presentation ---------- */
const WORLD_LORE={
  'gloamhide':{lore:'A colossal hide-plated beast has wandered out of the Gloamwood, carrying old Cell scars beneath its armour.',reward:'Tier 1 equipment · personal reward'},
  'hollow-wyrm':{lore:'The Hollow Wyrm coils beneath ruined roads, surfacing only when the ground begins to resonate with Cell energy.',reward:'Tier 2 equipment · personal reward'},
  'cell-torn':{lore:'Veyr was once something mortal. The Cell rupture inside it now tears at the world around every movement.',reward:'Tier 3 equipment · personal reward'}
};
function enhanceWorldCards(){
  const root=$('#worldBossGrid');if(!root)return;
  root.querySelectorAll('.world-boss-card').forEach(card=>{
    const attack=card.querySelector('[data-world-attack]'),join=card.querySelector('[data-world-join],[data-world-leave]');
    const id=attack?.dataset.worldAttack||join?.dataset.worldJoin||join?.dataset.worldLeave;
    if(!id)return;const info=WORLD_LORE[id];if(!info)return;
    if(attack&&!attack.disabled)attack.textContent='OPEN ENCOUNTER';
    let lore=card.querySelector('.evo-world-lore');
    if(!lore){lore=document.createElement('div');lore.className='evo-world-lore';const body=card.querySelector('.world-boss-body');body?.insertBefore(lore,body.querySelector('.world-actions'))}
    lore.innerHTML=`<p>${esc(info.lore)}</p><small>${esc(info.reward)}</small>`;
  });
}
function bindWorldEnhancement(){
  const root=$('#worldBossGrid');if(root){worldObserver=new MutationObserver(()=>requestAnimationFrame(enhanceWorldCards));worldObserver.observe(root,{childList:true})}
  document.querySelector('.nav-btn[data-view="world"]')?.addEventListener('click',()=>setTimeout(enhanceWorldCards,0));
}

/* ---------- World boss encounter ---------- */
function enhanceWorldCards(){
  const root=$('#worldBossGrid');if(!root)return;
  root.querySelectorAll('.world-boss-card').forEach(card=>{
    if(card.querySelector('.evo-world-preview'))return;
    const name=card.querySelector('h3')?.textContent?.trim(),meta=WORLD_BOSS_META[name];if(!meta)return;
    const preview=document.createElement('div');preview.className='evo-world-preview';
    preview.innerHTML=`<p>${esc(meta.lore)}</p><span>${esc(meta.reward)}</span>`;
    const body=card.querySelector('.world-boss-body');if(body)body.insertBefore(preview,body.querySelector('.world-actions')||body.lastChild);
  });
}
function bindWorldEnhancement(){
  const root=$('#worldBossGrid');if(!root)return;
  worldObserver=new MutationObserver(()=>requestAnimationFrame(enhanceWorldCards));
  worldObserver.observe(root,{childList:true,subtree:true});
  enhanceWorldCards();
}
function renderDungeonHistory(){
  const root=$('#reportsList'),s=state();if(!root||!s)return;
  let wrap=root.querySelector('.evo-dungeon-history');
  const rows=(s.dungeonHistory||[]).slice(0,12);
  if(!rows.length){wrap?.remove();return;}
  if(!wrap){wrap=document.createElement('section');wrap.className='evo-dungeon-history';root.prepend(wrap);}
  wrap.innerHTML=`<div class="evo-history-head"><small>DUNGEON EXPEDITIONS</small><h3>The Ashen Vault</h3></div><div class="evo-history-list">${rows.map(r=>`<article><b>${r.result==='complete'?'CLEARED':'FAILED'} · ${new Date(r.at).toLocaleString()}</b><span>Party iLvl ${Math.round(r.partyIlvl||0)}${r.stage?` · Ended at ${esc(DUNGEON.stages.find(s=>s.id===r.stage)?.title||r.stage)}`:''}</span></article>`).join('')}</div>`;
}
function bindReportEnhancement(){
  const root=$('#reportsList');if(!root)return;
  reportsObserver=new MutationObserver(()=>requestAnimationFrame(renderDungeonHistory));
  reportsObserver.observe(root,{childList:true});
  renderDungeonHistory();
}

function worldBackdrop(){
  let root=$('#evoWorldBackdrop');if(!root){root=document.createElement('div');root.id='evoWorldBackdrop';root.className='evo-world-backdrop';root.hidden=true;document.body.appendChild(root)}return root;
}
function worldPhase(b){
  const ratio=Number(b.current_hp)/Math.max(1,Number(b.max_hp));
  if(ratio>.70)return{n:1,name:'Breaking the Line',mechanic:'Crushing Sweep',best:'defend',desc:'The boss is testing every frontline. Brace before committing damage.'};
  if(ratio>.35)return{n:2,name:'Escalation',mechanic:'Rupture Cast',best:'interrupt',desc:'A dangerous cast is building. Command an interruption before it lands.'};
  return{n:3,name:'Cellstorm',mechanic:'Unstable Cell Surge',best:'cell',desc:'The creature is destabilising. Commit your Cell power to finish the fight.'};
}
async function openWorldEncounter(id){
  worldEncounterId=id;
  const [{data,error},{data:detail}]=await Promise.all([db.rpc('get_world_bosses'),db.rpc('get_world_boss_detail',{p_boss_id:id})]);if(error)return;
  const b=(data||[]).find(x=>x.id===id);if(!b||!b.joined)return;
  b.participants=Array.isArray(detail?.participants)?detail.participants:[];
  renderWorldEncounter(b);
}
function renderWorldEncounter(b,note=''){
  const root=worldBackdrop(),phase=worldPhase(b),pct=clamp(Math.round(Number(b.current_hp)/Math.max(1,Number(b.max_hp))*100),0,100);
  root.hidden=false;
  root.innerHTML=`<section class="evo-world-encounter"><header class="evo-world-head"><div><small>TIER ${b.tier} WORLD ENCOUNTER · ${phase.name.toUpperCase()}</small><h2>${esc(b.name)}</h2></div><button data-world-evo-close>×</button></header><div class="evo-world-body"><div class="evo-world-arena"><div class="evo-world-boss-mark">${b.tier===1?'♜':b.tier===2?'♨':'✦'}</div><div class="evo-world-phase"><span>Phase ${phase.n} · ${phase.name}</span><b>${Number(b.current_hp).toLocaleString()} / ${Number(b.max_hp).toLocaleString()}</b></div><div class="evo-world-hp"><i style="width:${pct}%"></i></div><div class="evo-world-mechanic"><small>MAJOR THREAT</small><b>${phase.mechanic}</b><p>${phase.desc}</p></div><div class="evo-world-command">${[['attack','ATTACK','Commit steady damage.'],['defend','DEFEND','Brace through heavy pressure.'],['interrupt','INTERRUPT','Stop a dangerous cast.'],['cell','CELL ABILITY','Spend Cell power for a burst.']].map(([id,a,d])=>`<button data-world-command="${id}"><b>${a}</b><small>${d}</small></button>`).join('')}</div><div class="evo-expedition-log">${esc(note||'Coordinate with the other commanders. The encounter state is shared for everyone.')}</div></div><aside class="evo-world-side"><h3>Your Company</h3><p>${party().length} adventurers · Party iLvl ${partyIlvl()} · ${b.participant_count}/${b.player_cap} commanders engaged</p>${party().map(c=>`<div class="evo-party-member"><span class="avatar">${esc(c.portrait)}</span><div><b>${esc(c.name)}</b><small>${esc(c.class)} · ${esc(c.spec)}</small></div><strong>Shock ${c.cellShock||0}%</strong></div>`).join('')}<h3 class="evo-commanders-title">Commanders Engaged</h3><div class="evo-commanders">${(b.participants||[]).map((p,i)=>`<div><span>${i+1}. ${esc(p.guildLabel)}</span><b>iLvl ${Number(p.partyIlvl||0).toFixed(1)}</b><small>${Number(p.damageDone||0).toLocaleString()} damage</small></div>`).join('')||'<p>No commander data available.</p>'}</div><p>Correct tactical calls reduce wipe risk and improve damage. Commands are resolved against the same shared boss for everyone.</p></aside></div></section>`;
  root.querySelector('[data-world-evo-close]').addEventListener('click',()=>{root.hidden=true;worldEncounterId=null});
  root.querySelectorAll('[data-world-command]').forEach(btn=>btn.addEventListener('click',()=>commandWorldBoss(b,btn.dataset.worldCommand,btn)));
}
async function commandWorldBoss(b,action,button){
  button.disabled=true;
  const {data,error}=await db.rpc('command_world_boss',{p_boss_id:b.id,p_action:action});
  if(error){renderWorldEncounter(b,error.message||'Your party could not act.');return}
  let note='';
  if(data.wiped){
    Game.applyPartyCellShock(25);await Game.persistState();
    await db.rpc('leave_world_boss',{p_boss_id:b.id});
    note='The command failed under pressure. Your company was forced out and all five gain 25% Cell Shock.';
    worldBackdrop().hidden=true;worldEncounterId=null;
    window.CellboundSocial?.loadWorld?.();
    return;
  }else{
    const right=data.action===data.recommended;
    note=`${right?'Tactical call executed cleanly.':'The party forces the action through.'} ${Number(data.damage||0).toLocaleString()} damage dealt.`;
  }
  if(data.killed){note+=' The world boss has fallen. Personal rewards have been issued.';worldBackdrop().hidden=true;worldEncounterId=null;setTimeout(()=>location.reload(),650);return}
  const [{data:fresh},{data:detail}]=await Promise.all([db.rpc('get_world_bosses'),db.rpc('get_world_boss_detail',{p_boss_id:b.id})]);const next=(fresh||[]).find(x=>x.id===b.id);
  if(next){next.participants=Array.isArray(detail?.participants)?detail.participants:[];renderWorldEncounter(next,note);}
}
function interceptWorldActions(){
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-world-attack]');if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();openWorldEncounter(btn.dataset.worldAttack);
  },true);
}

/* ---------- Character shell additions ---------- */
function queueEnhance(){
  requestAnimationFrame(()=>{enhanceRoster();enhanceBank();enhanceProfessions();renderDungeonJournal()});
}
function bindGlobal(){
  $('#enterDungeonBtn')?.addEventListener('click',startExpedition);
  document.querySelector('.nav-btn[data-view="content"]')?.addEventListener('click',()=>setTimeout(renderDungeonJournal,0));
  document.querySelector('.nav-btn[data-view="roster"]')?.addEventListener('click',()=>setTimeout(enhanceRoster,0));
  document.querySelector('.nav-btn[data-view="bank"]')?.addEventListener('click',()=>setTimeout(enhanceBank,0));
  document.querySelector('.nav-btn[data-view="professions"]')?.addEventListener('click',()=>setTimeout(enhanceProfessions,0));
  window.addEventListener('resize',()=>{if(innerWidth<720&&dockMinimized===false){}});
}

async function init(){
  Game=window.CellboundGame;
  if(!Game?.ready){setTimeout(init,80);return}
  G=window.CellboundGear;P=window.CellboundProfessions;db=Game.getSupabase();user=Game.getUser();ensureState();
  bindRoster();bindBank();bindProfessions();bindWorldEnhancement();bindGlobal();interceptWorldActions();dock();queueEnhance();enhanceWorldCards();
  clearInterval(dockTimer);dockTimer=setInterval(()=>{if(!dockMinimized)loadDockChat()},8000);
  window.addEventListener('beforeunload',()=>clearInterval(dockTimer),{once:true});
  window.CellboundEvolution={renderDungeonJournal,startExpedition,enhanceRoster,enhanceBank,openWorldEncounter};
}
init();
})();