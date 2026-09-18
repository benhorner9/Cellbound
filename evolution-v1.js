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
let bankObserver=null,rosterObserver=null,professionObserver=null,worldObserver=null,reportsObserver=null;

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

let expeditionBattle=null;
function expeditionModal(){
  let root=$('#evoExpeditionBackdrop');
  if(!root){root=document.createElement('div');root.id='evoExpeditionBackdrop';root.className='evo-expedition-backdrop';root.hidden=true;document.body.appendChild(root)}
  return root;
}
function dungeonRole(c){return roleOf(c)}
function dungeonRoleLabel(role){return role==='tank'?'TANK':role==='healer'?'HEALER':'DPS'}
function battleAbility(c,kind='attack'){
  const key=`${c?.class||''}:${c?.spec||''}`;
  const sets={
    'Warrior:Protection':{attack:'Shield Slam',defensive:'Iron Wall',interrupt:'Shield Bash',taunt:'Challenging Roar'},
    'Warrior:Arms':{attack:'Mortal Strike',defensive:'Die by the Sword',interrupt:'Pummel',burst:'Execute'},
    'Paladin:Protection':{attack:'Avenger Strike',defensive:'Guardian Oath',interrupt:'Rebuke',taunt:'Radiant Challenge'},
    'Paladin:Holy':{attack:'Judgement',heal:'Divine Light',groupHeal:'Grace',defensive:'Blessing of Shelter'},
    'Priest:Holy':{attack:'Smite',heal:'Greater Mend',groupHeal:'Divine Hymn',defensive:'Serenity'},
    'Druid:Restoration':{attack:'Wrath',heal:'Regrowth',groupHeal:'Tranquility',defensive:'Barkskin'},
    'Hunter:Marksman':{attack:'Aimed Shot',interrupt:'Concussive Shot',burst:'Rapid Fire',defensive:'Disengage'},
    'Rogue:Assassination':{attack:'Eviscerate',interrupt:'Kick',burst:'Envenom',defensive:'Feint'},
    'Mage:Arcane':{attack:'Arcane Bolt',interrupt:'Counterspell',burst:'Arcane Barrage',defensive:'Prismatic Ward'}
  };
  const fallback={attack:'Strike',heal:'Mend',groupHeal:'Restoration',defensive:'Guard',interrupt:'Interrupt',taunt:'Taunt',burst:'Burst'};
  return sets[key]?.[kind]||fallback[kind]||fallback.attack;
}
function battlePartyModels(){
  const ps=party();
  const ranged=new Set(['Hunter','Mage','Priest','Druid']);
  let meleeIndex=0,rangedIndex=0;
  const meleePos=[[47,61],[46,38],[43,69]],rangedPos=[[26,33],[27,67],[34,78]];
  return ps.map(c=>{
    const role=dungeonRole(c);let pos;
    if(role==='tank')pos=[45,50];
    else if(role==='healer')pos=[24,60];
    else if(ranged.has(c.class)){pos=rangedPos[rangedIndex%rangedPos.length];rangedIndex++}
    else{pos=meleePos[meleeIndex%meleePos.length];meleeIndex++}
    return{id:`party-${c.id}`,charId:c.id,name:c.name,role,className:c.class,spec:c.spec,x:pos[0],y:pos[1],hp:Math.max(18,expeditionCondition(c.id)),maxHp:100};
  });
}
function battleEnemyModels(stage){
  if(stage.kind==='boss'||stage.kind==='final'){
    const name=stage.enemies?.[0]?.[0]||stage.title;
    return[{id:'boss',name,detail:stage.enemies?.[0]?.[1]||'',x:65,y:50,hp:100,maxHp:100,size:stage.kind==='final'?'final':'boss'}];
  }
  const out=[],names=stage.enemies||[];
  const count=stage.kind==='event'?4:5;
  for(let i=0;i<count;i++){
    const src=names[i%Math.max(1,names.length)]||['Ashbound','Hostile'];
    out.push({id:`mob-${i}`,name:src[0],detail:src[1],x:62+(i%2)*8,y:26+(i*14)%58,hp:100,maxHp:100,size:i===0&&stage.id==='vault-depths'?'elite':'trash'});
  }
  return out;
}
function battleMechanicNames(stage){
  const map={
    'broken-gate':{cone:'Hound Rush',ground:'Cinder Trap',cast:'Ash Channel',adds:'Cinder Reinforcements',tank:'Pack Maul'},
    'hall-embers':{cone:'Guardian Sweep',ground:'Ember Sigils',cast:'Molten Invocation',adds:'Acolyte Reinforcements',tank:'Shield Crush'},
    kael:{cone:'Warden Cleave',ground:'Ashen Brand',cast:'Call the Furnace',adds:'Ashbound Wardens',tank:'Furnace Hammer'},
    furnace:{cone:'Heat Vent',ground:'Furnace Eruption',cast:'Pressure Surge',adds:'Cinder Hounds',tank:'Scalding Rush'},
    embermaw:{cone:'Furnace Breath',ground:'Burning Ground',cast:'Scorching Roar',adds:'Cinderlings',tank:'Molten Bite'},
    'vault-depths':{cone:'Guardian Cleave',ground:'Soul Snare',cast:'Bind Essence',adds:'Ash Guardians',tank:'Soul Crush'},
    vaultheart:{cone:'Core Beam',ground:'Cell Fracture',cast:'Heartflare',adds:'Cellspawn',tank:'Core Impact'}
  };
  return map[stage.id]||{cone:'Frontal Assault',ground:'Danger Zone',cast:'Lethal Cast',adds:'Reinforcements',tank:'Heavy Strike'};
}
function battleTimeline(stage,success){
  const boss=stage.kind==='boss'||stage.kind==='final';
  if(!boss){
    return[
      {at:.25,type:'engage'},
      {at:1.1,type:'partyAttack'},
      {at:2.0,type:'packGather'},
      {at:3.0,type:'heal'},
      {at:4.0,type:'groundStart'},
      {at:5.4,type:'groundResolve',fail:!success},
      {at:6.1,type:'enemyCast'},
      {at:7.5,type:'interrupt',fail:!success},
      {at:8.4,type:'partyBurst'},
      {at:10.2,type:'packFinish',fail:!success},
      {at:11.2,type:'finish'}
    ];
  }
  const tl=[
    {at:.25,type:'engage'},
    {at:1.1,type:'partyAttack'},
    {at:2.2,type:'tankBuster'},
    {at:3.4,type:'heal'},
    {at:4.6,type:'coneStart'},
    {at:6.8,type:'coneResolve',fail:!success&&stage.id==='kael'},
    {at:7.5,type:'partyAttack'},
    {at:8.7,type:'groundStart'},
    {at:10.5,type:'groundResolve',fail:!success&&stage.id!=='kael'},
    {at:11.3,type:'addsSpawn'},
    {at:12.4,type:'addsGather'},
    {at:13.7,type:'addsBurn'},
    {at:14.6,type:'enemyCast'},
    {at:16.4,type:'interrupt',fail:!success},
    {at:17.2,type:'phase'},
    {at:18.1,type:'partyBurst'},
    {at:20.1,type:'tankBuster',late:true},
    {at:21.0,type:'heal'},
    {at:22.0,type:'finalBurn',fail:!success},
    {at:23.5,type:'finish'}
  ];
  if(stage.kind==='final')tl.splice(11,0,{at:13.1,type:'lineStart'},{at:14.1,type:'lineResolve',fail:!success});
  return tl.sort((a,b)=>a.at-b.at);
}
function battleDom(){return expeditionBattle?.root||null}
function battleUnit(id){return battleDom()?.querySelector(`[data-battle-unit="${id}"]`)}
function battlePartyUnit(charId){return battleUnit(`party-${charId}`)}
function setBattlePos(id,x,y,ms=650){
  const el=battleUnit(id);if(!el)return;
  el.style.setProperty('--move-ms',`${ms}ms`);el.style.left=`${x}%`;el.style.top=`${y}%`;
}
function setBattleFacing(deg){
  const boss=battleUnit('boss');if(boss)boss.style.setProperty('--facing',`${deg}deg`);
  if(expeditionBattle)expeditionBattle.facing=deg;
}
function setBattleHp(id,hp){
  if(!expeditionBattle)return;
  const unit=expeditionBattle.units.find(x=>x.id===id);if(unit)unit.hp=clamp(hp,0,100);
  const el=battleUnit(id);if(el){const bar=el.querySelector('.evo2d-unit-hp i');if(bar)bar.style.width=`${clamp(hp,0,100)}%`;el.classList.toggle('critical',hp<=25);el.classList.toggle('dead',hp<=0)}
  const frame=battleDom()?.querySelector(`[data-frame="${id}"]`);if(frame){const bar=frame.querySelector('i');if(bar)bar.style.width=`${clamp(hp,0,100)}%`;const n=frame.querySelector('strong');if(n)n.textContent=`${Math.max(0,Math.round(hp))}%`}
}
function damageBattle(id,amount,label=''){
  const unit=expeditionBattle?.units.find(x=>x.id===id);if(!unit)return;
  setBattleHp(id,unit.hp-amount);floatBattleText(id,`-${Math.round(amount)}${label?` · ${label}`:''}`,'damage');
}
function healBattle(id,amount,label=''){
  const unit=expeditionBattle?.units.find(x=>x.id===id);if(!unit)return;
  setBattleHp(id,Math.min(100,unit.hp+amount));floatBattleText(id,`+${Math.round(amount)}${label?` · ${label}`:''}`,'heal');
}
function setBossHp(hp){
  if(!expeditionBattle)return;
  expeditionBattle.bossHp=clamp(hp,0,100);
  setBattleHp('boss',expeditionBattle.bossHp);
  const top=battleDom()?.querySelector('#evo2dBossHp');if(top)top.style.width=`${expeditionBattle.bossHp}%`;
  const txt=battleDom()?.querySelector('#evo2dBossHpText');if(txt)txt.textContent=`${Math.round(expeditionBattle.bossHp)}%`;
}
function battleAction(id,text,tone=''){
  const el=battleUnit(id);if(!el)return;const chip=el.querySelector('.evo2d-unit-action');if(!chip)return;
  chip.textContent=text;chip.dataset.tone=tone;clearTimeout(el._actionTimer);el._actionTimer=setTimeout(()=>{chip.textContent='';chip.dataset.tone=''},1600/Math.max(1,expeditionBattle?.speed||1));
}
function battleLog(text,tone=''){
  if(!expeditionBattle)return;
  const stamp=Math.max(0,expeditionBattle.elapsed).toFixed(1).padStart(4,'0');
  expeditionBattle.log.push({stamp,text,tone});expeditionBattle.log=expeditionBattle.log.slice(-8);
  const box=battleDom()?.querySelector('#evo2dFeed');if(box)box.innerHTML=expeditionBattle.log.slice().reverse().map(x=>`<div data-tone="${x.tone}"><span>${x.stamp}s</span><b>${esc(x.text)}</b></div>`).join('');
}
function floatBattleText(id,text,tone=''){
  const el=battleUnit(id),arena=battleDom()?.querySelector('.evo2d-arena');if(!el||!arena)return;
  const f=document.createElement('span');f.className=`evo2d-float ${tone}`;f.textContent=text;
  const er=el.getBoundingClientRect(),ar=arena.getBoundingClientRect();f.style.left=`${er.left-ar.left+er.width/2}px`;f.style.top=`${er.top-ar.top}px`;arena.appendChild(f);setTimeout(()=>f.remove(),1200);
}
function flashBattle(text,tone=''){
  const arena=battleDom()?.querySelector('.evo2d-arena');if(!arena)return;
  const f=document.createElement('div');f.className=`evo2d-flash ${tone}`;f.textContent=text;arena.appendChild(f);setTimeout(()=>f.remove(),1050);
}
function clearTelegraphs(kind=''){
  const arena=battleDom()?.querySelector('.evo2d-arena');if(!arena)return;
  arena.querySelectorAll(kind?`.evo2d-telegraph[data-kind="${kind}"]`:'.evo2d-telegraph').forEach(x=>x.remove());
}
function addCircleTelegraph(x,y,size=82,label=''){
  const arena=battleDom()?.querySelector('.evo2d-arena');if(!arena)return;
  const t=document.createElement('div');t.className='evo2d-telegraph evo2d-circle';t.dataset.kind='circle';t.style.left=`${x}%`;t.style.top=`${y}%`;t.style.width=`${size}px`;t.style.height=`${size}px`;if(label)t.innerHTML=`<span>${esc(label)}</span>`;arena.appendChild(t);
}
function addConeTelegraph(label=''){
  const arena=battleDom()?.querySelector('.evo2d-arena'),boss=battleUnit('boss');if(!arena||!boss)return;
  const t=document.createElement('div');t.className='evo2d-telegraph evo2d-cone';t.dataset.kind='cone';t.style.left=boss.style.left||'65%';t.style.top=boss.style.top||'50%';t.style.transform=`translateY(-50%) rotate(${expeditionBattle?.facing||180}deg)`;if(label)t.innerHTML=`<span>${esc(label)}</span>`;arena.appendChild(t);
}
function addLineTelegraph(label=''){
  const arena=battleDom()?.querySelector('.evo2d-arena');if(!arena)return;
  const t=document.createElement('div');t.className='evo2d-telegraph evo2d-line';t.dataset.kind='line';t.style.left='15%';t.style.top='46%';t.style.transform='rotate(-8deg)';if(label)t.innerHTML=`<span>${esc(label)}</span>`;arena.appendChild(t);
}
function startBattleCast(name,duration,interruptible=false,source='boss'){
  if(!expeditionBattle)return;
  expeditionBattle.cast={name,duration,start:expeditionBattle.elapsed,interruptible,source};
  const box=battleDom()?.querySelector('#evo2dActionBox');if(box){box.hidden=false;box.dataset.interruptible=interruptible?'1':'0';box.querySelector('b').textContent=name;box.querySelector('small').textContent=interruptible?'INTERRUPTIBLE CAST':'ENEMY CAST';}
  battleAction(source,name,interruptible?'warning':'');
  battleLog(`${expeditionBattle.stage.title}: ${name} begins casting.`,interruptible?'warning':'');
}
function stopBattleCast(interrupted=false){
  if(!expeditionBattle?.cast)return;
  const name=expeditionBattle.cast.name;expeditionBattle.cast=null;
  const box=battleDom()?.querySelector('#evo2dActionBox');if(box){box.hidden=true;box.dataset.interruptible='0'}
  if(interrupted){flashBattle('INTERRUPTED','success');battleLog(`${name} interrupted.`,'success')}
}
function updateBattleCast(){
  const cast=expeditionBattle?.cast,box=battleDom()?.querySelector('#evo2dActionBox');if(!cast||!box)return;
  const pct=clamp(((expeditionBattle.elapsed-cast.start)/cast.duration)*100,0,100);
  const fill=box.querySelector('i');if(fill)fill.style.width=`${pct}%`;
  const left=box.querySelector('em');if(left)left.textContent=`${Math.max(0,cast.duration-(expeditionBattle.elapsed-cast.start)).toFixed(1)}s`;
  if(pct>=100)stopBattleCast(false);
}
function spawnBattleAdds(){
  if(!expeditionBattle)return;
  const arena=battleDom()?.querySelector('.evo2d-units');if(!arena)return;
  for(let i=0;i<3;i++){
    const id=`add-${i}`;if(expeditionBattle.units.some(x=>x.id===id))continue;
    const unit={id,name:'Cellspawn',role:'enemy',x:82,y:28+i*21,hp:100,maxHp:100,size:'trash',add:true};
    expeditionBattle.units.push(unit);
    const el=document.createElement('div');el.className='evo2d-unit enemy trash add';el.dataset.battleUnit=id;el.style.left=`${unit.x}%`;el.style.top=`${unit.y}%`;
    el.innerHTML=`<div class="evo2d-unit-cast"></div><div class="evo2d-dot"><span class="evo2d-facing"></span></div><div class="evo2d-unit-label"><b>Cellspawn</b><small>ADD</small></div><div class="evo2d-unit-hp"><i style="width:100%"></i></div><div class="evo2d-unit-action"></div>`;
    arena.appendChild(el);
  }
}
function killBattleAdds(){
  if(!expeditionBattle)return;
  expeditionBattle.units.filter(x=>x.add).forEach(x=>{setBattleHp(x.id,0);battleAction(x.id,'DEFEATED','success')});
  setTimeout(()=>battleDom()?.querySelectorAll('.evo2d-unit.add').forEach(x=>x.remove()),700);
  expeditionBattle.units=expeditionBattle.units.filter(x=>!x.add);
}
function partyByRole(role){return expeditionBattle?.party.find(x=>x.role===role)}
function dpsUnits(){return expeditionBattle?.party.filter(x=>x.role==='dps')||[]}
function battleEvent(ev){
  const b=expeditionBattle;if(!b)return;
  const m=b.mechanics,tank=partyByRole('tank'),healer=partyByRole('healer'),dps=dpsUnits(),boss=b.stage.kind==='boss'||b.stage.kind==='final';
  switch(ev.type){
    case'engage':
      battleLog(`${tank?.name||'The tank'} establishes threat.`,'tank');
      if(boss){setBattleFacing(180);battleAction('boss','TARGET: TANK','warning');battleAction(tank?.id,battleAbility(party().find(c=>c.id===tank?.charId),'taunt'),'tank')}
      else b.enemies.forEach((e,i)=>setBattlePos(e.id,58+(i%2)*6,34+(i*12)%40,650));
      break;
    case'partyAttack':
      dps.forEach((u,i)=>{const c=party().find(x=>x.id===u.charId);battleAction(u.id,battleAbility(c,'attack'),'dps')});
      if(tank){const c=party().find(x=>x.id===tank.charId);battleAction(tank.id,battleAbility(c,'attack'),'tank')}
      if(boss)setBossHp(Math.max(4,b.bossHp-(ev.late?15:13)));else b.enemies.forEach((e,i)=>setBattleHp(e.id,Math.max(8,e.hp-(22+i*2))));
      battleLog('Damage rotation begins.','dps');
      break;
    case'packGather':
      battleLog(`${tank?.name||'Tank'} gathers the pack and turns it away from the group.`,'tank');
      if(tank){setBattlePos(tank.id,48,50);battleAction(tank.id,battleAbility(party().find(c=>c.id===tank.charId),'taunt'),'tank')}
      b.enemies.forEach((e,i)=>setBattlePos(e.id,56+(i%2)*4,39+(i%3)*11,500));
      break;
    case'tankBuster':
      if(!tank)return;
      startBattleCast(m.tank,1.35,false,'boss');
      battleAction(tank.id,battleAbility(party().find(c=>c.id===tank.charId),'defensive'),'tank');
      battleLog(`${tank.name} commits a defensive cooldown for ${m.tank}.`,'tank');
      setTimeout(()=>{if(expeditionBattle!==b)return;stopBattleCast(false);damageBattle(tank.id,ev.late?22:17,m.tank);flashBattle('BLOCKED','tank')},780/Math.max(1,b.speed));
      break;
    case'heal':
      if(!healer)return;
      const hc=party().find(c=>c.id===healer.charId),targets=[tank,...dps].filter(Boolean).sort((a,z)=>a.hp-z.hp);
      battleAction(healer.id,battleAbility(hc,targets[0]?.hp<55?'groupHeal':'heal'),'heal');
      targets.slice(0,targets[0]?.hp<55?4:2).forEach((u,i)=>healBattle(u.id,i?8:16,battleAbility(hc,'heal')));
      battleLog(`${healer.name} stabilises the party.`,'heal');
      break;
    case'coneStart':
      startBattleCast(m.cone,2.2,false,'boss');addConeTelegraph(m.cone);
      if(tank){setBattlePos(tank.id,53,24);setBattlePos('boss',63,39);setBattleFacing(215);battleAction(tank.id,'REPOSITIONING','tank')}
      battleLog(`${tank?.name||'Tank'} rotates the enemy away from the party.`,'tank');
      break;
    case'coneResolve':
      stopBattleCast(false);clearTelegraphs('cone');flashBattle(m.cone,ev.fail?'danger':'warning');
      if(tank)damageBattle(tank.id,18,m.cone);
      if(ev.fail&&dps[0]){damageBattle(dps[0].id,42,'CAUGHT IN CONE');battleLog(`${dps[0].name} is caught by ${m.cone}.`,'danger')}
      else battleLog(`${m.cone} is contained on the tank.`,'success');
      if(tank)setBattlePos(tank.id,45,50);setBattlePos('boss',65,50);setBattleFacing(180);
      if(boss)setBossHp(b.bossHp-9);
      break;
    case'groundStart':
      startBattleCast(m.ground,1.8,false,'boss');
      [...dps,healer].filter(Boolean).forEach((u,i)=>{addCircleTelegraph(u.x,u.y,76,m.ground);setBattlePos(u.id,20+(i*13)%45,18+(i%2)*62,650)});
      battleLog('Ground markers appear. The party spreads.','warning');
      break;
    case'groundResolve':
      stopBattleCast(false);flashBattle(m.ground,ev.fail?'danger':'warning');
      if(ev.fail&&dps[1]){damageBattle(dps[1].id,48,m.ground);battleLog(`${dps[1].name} reacts late and is hit.`,'danger')}
      else battleLog('All marked players clear the danger zones.','success');
      clearTelegraphs('circle');
      b.party.forEach(u=>{const start=b.startPos[u.id];if(start)setBattlePos(u.id,start[0],start[1],700)});
      if(boss)setBossHp(b.bossHp-10);
      break;
    case'addsSpawn':
      spawnBattleAdds();battleLog(`${m.adds} enter the arena.`,'warning');flashBattle('ADDS SPAWN','warning');
      break;
    case'addsGather':
      if(tank){setBattlePos(tank.id,67,50);battleAction(tank.id,battleAbility(party().find(c=>c.id===tank.charId),'taunt'),'tank')}
      b.units.filter(x=>x.add).forEach((u,i)=>setBattlePos(u.id,64+(i%2)*4,43+i*7,550));
      battleLog(`${tank?.name||'Tank'} taunts and gathers the adds.`,'tank');
      break;
    case'addsBurn':
      dps.forEach(u=>battleAction(u.id,'AOE BURST','dps'));killBattleAdds();if(tank)setBattlePos(tank.id,45,50);battleLog('The damage dealers burn the add pack down.','success');if(boss)setBossHp(b.bossHp-8);break;
    case'enemyCast':
      startBattleCast(m.cast,2.5,true,'boss');battleLog(`Priority cast: ${m.cast}.`,'warning');break;
    case'interrupt':{
      const interrupter=dps.find(u=>party().find(c=>c.id===u.charId)?.class!=='Priest')||dps[0];
      if(ev.fail){
        battleLog(`${m.cast} completes — interrupt missed.`,'danger');stopBattleCast(false);flashBattle('CAST COMPLETED','danger');
        b.party.forEach(u=>damageBattle(u.id,u.role==='tank'?18:28,m.cast));
      }else{
        if(interrupter){const c=party().find(x=>x.id===interrupter.charId);battleAction(interrupter.id,battleAbility(c,'interrupt'),'success')}
        stopBattleCast(true);battleLog(`${interrupter?.name||'DPS'} lands the interrupt.`,'success');
      }
      if(boss)setBossHp(b.bossHp-8);
      break;
    }
    case'lineStart':
      startBattleCast(m.cone,1.7,false,'boss');addLineTelegraph(m.cone);battleLog('A lethal beam tracks across the room.','warning');
      b.party.forEach((u,i)=>setBattlePos(u.id,u.x,15+(i*17)%70,600));break;
    case'lineResolve':
      stopBattleCast(false);clearTelegraphs('line');flashBattle('CORE BEAM',ev.fail?'danger':'warning');
      if(ev.fail&&dps[2]){damageBattle(dps[2].id,55,'CORE BEAM');battleLog(`${dps[2].name} is clipped by the beam.`,'danger')}else battleLog('The party clears the beam path.','success');
      b.party.forEach(u=>{const p=b.startPos[u.id];if(p)setBattlePos(u.id,p[0],p[1],700)});setBossHp(b.bossHp-8);break;
    case'phase':
      if(b.stage.kind==='final'){flashBattle('PHASE 2 · CORE EXPOSED','phase');battleLog('The Vaultheart fractures. The core is exposed.','phase');battleDom()?.querySelector('.evo2d-arena')?.classList.add('phase-two')}
      else{flashBattle('PHASE SHIFT','phase');battleLog(`${b.stage.title} becomes more aggressive.`,'phase')}
      break;
    case'partyBurst':
      dps.forEach(u=>{const c=party().find(x=>x.id===u.charId);battleAction(u.id,battleAbility(c,'burst'),'dps')});if(boss)setBossHp(b.bossHp-18);else b.enemies.forEach(u=>setBattleHp(u.id,Math.max(0,u.hp-35)));battleLog('The party commits its burst window.','dps');break;
    case'finalBurn':
      if(ev.fail){
        battleLog('The formation collapses under overlapping mechanics.','danger');flashBattle('FORMATION BREAK','danger');
        b.party.filter(u=>u.role!=='tank').forEach((u,i)=>damageBattle(u.id,35+i*4,'OVERWHELMED'));
        setBossHp(Math.max(5,b.bossHp-6));
      }else{
        dps.forEach(u=>battleAction(u.id,'FINISHER','success'));setBossHp(0);flashBattle('BOSS DEFEATED','success');battleLog(`${b.stage.title} is defeated.`,'success');
      }
      break;
    case'packFinish':
      if(ev.fail){
        battleLog('The pack breaks through the formation.','danger');b.party.forEach((u,i)=>damageBattle(u.id,18+i*3,'PRESSURE'));
      }else{
        b.enemies.forEach(u=>setBattleHp(u.id,0));flashBattle('PACK CLEARED','success');battleLog('Enemy pack cleared.','success');
      }
      break;
    case'finish':
      if(boss&&b.success&&b.bossHp>0)setBossHp(0);
      finishBattlePresentation();break;
  }
}
function battleFrame(ts){
  const b=expeditionBattle;if(!b||!b.running)return;
  if(!b.lastTs)b.lastTs=ts;
  const delta=Math.min(80,ts-b.lastTs);b.lastTs=ts;
  if(!b.paused)b.elapsed+=delta/1000*b.speed;
  updateBattleCast();
  while(b.eventIndex<b.timeline.length&&b.timeline[b.eventIndex].at<=b.elapsed){battleEvent(b.timeline[b.eventIndex]);b.eventIndex++}
  if(b.running)b.raf=requestAnimationFrame(battleFrame);
}
function finishBattlePresentation(){
  const b=expeditionBattle;if(!b||b.finishing)return;b.finishing=true;b.running=false;cancelAnimationFrame(b.raf);
  stopBattleCast(false);clearTelegraphs();
  setTimeout(()=>{if(expeditionBattle===b)resolveExpeditionStage('auto',b.success)},450);
}
function startBattleEngine(stage){
  const root=expeditionModal(),partyModels=battlePartyModels(),enemyModels=battleEnemyModels(stage),success=Math.random()*100<stageChance(stage,stage.best);
  const units=[...partyModels,...enemyModels];
  expeditionBattle={root,stage,party:partyModels,enemies:enemyModels,units,success,bossHp:100,facing:180,elapsed:0,lastTs:0,eventIndex:0,timeline:battleTimeline(stage,success),running:true,paused:false,speed:1,cast:null,log:[],finishing:false,startPos:Object.fromEntries(partyModels.map(x=>[x.id,[x.x,x.y]])),raf:0,mechanics:battleMechanicNames(stage)};
  const arena=root.querySelector('.evo2d-arena');if(arena)arena.dataset.stage=stage.id;
  battleLog('Party enters combat.','phase');
  expeditionBattle.raf=requestAnimationFrame(battleFrame);
}
function cancelBattle(){
  if(expeditionBattle){expeditionBattle.running=false;cancelAnimationFrame(expeditionBattle.raf);expeditionBattle=null}
}
function renderBattleUnit(unit){
  const enemy=unit.role==='enemy'||unit.id==='boss'||unit.id.startsWith('mob-');
  const role=enemy?'enemy':unit.role,size=unit.size||'player';
  return `<div class="evo2d-unit ${enemy?'enemy':'party'} role-${role} ${size}" data-battle-unit="${unit.id}" style="left:${unit.x}%;top:${unit.y}%">
    <div class="evo2d-unit-cast"></div><div class="evo2d-dot"><span class="evo2d-facing"></span></div>
    <div class="evo2d-unit-label"><b>${esc(unit.name)}</b><small>${enemy?(unit.size==='trash'?'ENEMY':unit.size==='elite'?'ELITE':'BOSS'):dungeonRoleLabel(unit.role)}</small></div>
    <div class="evo2d-unit-hp"><i style="width:${unit.hp}%"></i></div><div class="evo2d-unit-action"></div>
  </div>`;
}
function renderPartyFrame(unit){
  const c=party().find(x=>x.id===unit.charId);
  return `<div class="evo2d-party-frame role-${unit.role}" data-frame="${unit.id}"><span class="evo2d-role-pip"></span><div><b>${esc(unit.name)}</b><small>${esc(c?.class||'')} · ${esc(c?.spec||'')} · ${dungeonRoleLabel(unit.role)}</small><div class="evo2d-frame-hp"><i style="width:${unit.hp}%"></i></div></div><strong>${Math.round(unit.hp)}%</strong></div>`;
}
function startExpedition(){
  if(!partyAvailable()||partyIlvl()<DUNGEON.requiredIlvl)return;
  ensureState();cancelBattle();
  expedition={stage:0,condition:Object.fromEntries(party().map(c=>[c.id,100])),log:['The party crosses the Broken Gate.'],resolved:false};
  renderExpedition();
}
function renderExpedition(){
  const root=expeditionModal();if(!expedition){cancelBattle();root.hidden=true;return}
  cancelBattle();root.hidden=false;
  const stage=DUNGEON.stages[expedition.stage],partyModels=battlePartyModels(),enemyModels=battleEnemyModels(stage),boss=stage.kind==='boss'||stage.kind==='final';
  root.innerHTML=`<section class="evo-expedition evo2d-expedition">
    <header class="evo-expedition-head evo2d-head"><div><small>${DUNGEON.name.toUpperCase()} · LIVE COMBAT</small><h2>${stage.title}</h2></div><div class="evo2d-head-actions"><button id="evo2dPause" title="Pause battle">Ⅱ</button><button id="evo2dSpeed" title="Battle speed">1×</button><button data-expedition-close title="Leave dungeon">×</button></div></header>
    <div class="evo-expedition-map">${DUNGEON.stages.map((s,i)=>`<span class="evo-map-node ${i<expedition.stage?'done':i===expedition.stage?'current':''}">${i+1}. ${s.title}</span>`).join('')}</div>
    <div class="evo2d-layout">
      <div class="evo2d-combat-column">
        ${boss?`<div class="evo2d-boss-frame"><div><small>${stage.kind==='final'?'FINAL BOSS':'BOSS'}</small><b>${esc(stage.title)}</b></div><div class="evo2d-boss-hp"><i id="evo2dBossHp" style="width:100%"></i></div><strong id="evo2dBossHpText">100%</strong></div>`:''}
        <div class="evo2d-arena" data-stage="${stage.id}">
          <div class="evo2d-grid"></div><div class="evo2d-rune rune-a">◇</div><div class="evo2d-rune rune-b">◇</div>
          <div id="evo2dActionBox" class="evo2d-action-box" hidden><small>ENEMY CAST</small><div><b>Ability</b><em>0.0s</em></div><span><i></i></span></div>
          <div class="evo2d-units">${[...partyModels,...enemyModels].map(renderBattleUnit).join('')}</div>
          <div class="evo2d-legend"><span class="tank">● Tank</span><span class="healer">● Healer</span><span class="dps">● DPS</span><span class="enemy">● Enemy</span></div>
          <div id="evo2dStageResult" class="evo2d-stage-result" hidden></div>
        </div>
        <div class="evo2d-mechanic-note"><small>LIVE ENCOUNTER</small><b>${esc(stage.desc)}</b><span>Movement is role-driven: threat, healing range, target priority and encounter mechanics determine every reposition.</span></div>
      </div>
      <aside class="evo2d-side">
        <div class="evo2d-side-title"><small>ACTIVE FIVE · PARTY ILVL ${partyIlvl()}</small><b>Party Frames</b></div>
        <div id="evo2dPartyFrames">${partyModels.map(renderPartyFrame).join('')}</div>
        <div class="evo2d-feed-head"><small>COMBAT EVENTS</small><b>Action Feed</b></div>
        <div id="evo2dFeed" class="evo2d-feed"></div>
        <div class="evo2d-intel"><span>Encounter knowledge</span><b>${avgKnowledge(stage.knowledge)}%</b><small>${esc(currentHint(stage.knowledge).text)}</small></div>
        <div id="evoExpeditionResult"></div>
      </aside>
    </div>
  </section>`;
  root.querySelector('[data-expedition-close]')?.addEventListener('click',()=>{cancelBattle();expedition=null;renderExpedition()});
  root.querySelector('#evo2dPause')?.addEventListener('click',e=>{if(!expeditionBattle)return;expeditionBattle.paused=!expeditionBattle.paused;e.currentTarget.textContent=expeditionBattle.paused?'▶':'Ⅱ';battleLog(expeditionBattle.paused?'Combat paused.':'Combat resumed.','phase')});
  root.querySelector('#evo2dSpeed')?.addEventListener('click',e=>{if(!expeditionBattle)return;expeditionBattle.speed=expeditionBattle.speed===1?2:1;e.currentTarget.textContent=`${expeditionBattle.speed}×`;battleLog(`Combat speed ${expeditionBattle.speed}×.`,'phase')});
  startBattleEngine(stage);
}
async function resolveExpeditionStage(command='auto',forcedSuccess=null){
  if(!expedition||expedition.resolved)return;
  expedition.resolved=true;
  const stage=DUNGEON.stages[expedition.stage],success=forcedSuccess??expeditionBattle?.success??(Math.random()*100<stageChance(stage,stage.best));
  const result=$('#evoExpeditionResult');
  if(success){
    const dmg=Math.floor(Math.random()*8)+5;
    party().forEach(c=>expedition.condition[c.id]=clamp(expeditionCondition(c.id)-dmg,10,100));
    const knowledge=gainKnowledge(stage,true),reward=stage.bossId?expeditionLoot(stage):{loot:null,reagents:[]};
    if(stage.bossId)state().bossKills[stage.bossId]=true;
    if(stage.id==='kael')state().gold+=35;
    if(stage.id==='embermaw')state().gold+=55;
    expedition.log.push(`${stage.title} cleared by the party.`);
    state().activity.push(`${stage.title} cleared during ${DUNGEON.name}.`);
    await persist(false);
    const final=expedition.stage===DUNGEON.stages.length-1;
    if(final){
      state().gold+=120;state().renown+=60;state().dungeonCompletions++;state().dungeonHistory.unshift({at:new Date().toISOString(),result:'complete',partyIlvl:partyIlvl()});state().dungeonHistory=state().dungeonHistory.slice(0,20);
      state().activity.push(`${DUNGEON.name} cleared. The Vaultheart has fallen.`);
      await persist();
    }
    if(result)result.innerHTML=`<div class="evo-expedition-result evo2d-result success"><h4>${final?'DUNGEON COMPLETE':'ENCOUNTER CLEARED'}</h4><p>Encounter knowledge +${knowledge}%.${reward.loot?` ${esc(reward.loot.name)} was sent to the Guild Bank.`:''}${reward.reagents.length?` Reagents: ${reward.reagents.map(r=>`${P.MATERIALS?.[r.key]?.name||r.key} ×${r.quantity}`).join(', ')}.`:''}</p><button data-expedition-next>${final?'RETURN TO GUILD':'CONTINUE DEEPER →'}</button></div>`;
    result?.querySelector('[data-expedition-next]')?.addEventListener('click',()=>{if(final){cancelBattle();expedition=null;renderExpedition();Game.switchView('content');renderDungeonJournal()}else{expedition.stage++;expedition.resolved=false;renderExpedition()}});
  }else{
    gainKnowledge(stage,false);
    party().forEach(c=>expedition.condition[c.id]=clamp(expeditionCondition(c.id)-34,0,100));
    const wiped=stage.kind==='boss'||stage.kind==='final'||party().some(c=>expeditionCondition(c.id)<=0);
    expedition.log.push(wiped?`${stage.title} breaks the formation. The expedition ends in a wipe.`:'The formation is damaged but still standing.');
    if(wiped){
      Game.applyPartyCellShock(25);
      state().dungeonHistory.unshift({at:new Date().toISOString(),result:'wipe',stage:stage.id,partyIlvl:partyIlvl()});state().dungeonHistory=state().dungeonHistory.slice(0,20);
      state().activity.push(`The guild wiped at ${stage.title}. All five gained 25% Cell Shock.`);
      await persist();
    }else await persist(false);
    if(result)result.innerHTML=`<div class="evo-expedition-result evo2d-result danger"><h4>${wiped?'EXPEDITION FAILED':'PARTY STAGGERED'}</h4><p>${wiped?'The failed mechanic was visible in the combat replay. All five adventurers gain 25% Cell Shock.':'The party survives the mistake, but carries damage into the next attempt.'}</p><button data-expedition-recover>${wiped?'RETURN TO GUILD':'RETRY ENCOUNTER'}</button></div>`;
    result?.querySelector('[data-expedition-recover]')?.addEventListener('click',()=>{if(wiped){cancelBattle();expedition=null;renderExpedition();Game.switchView('content');renderDungeonJournal()}else{expedition.resolved=false;renderExpedition()}});
  }
  const stageResult=$('#evo2dStageResult');if(stageResult){stageResult.hidden=false;stageResult.dataset.tone=success?'success':'danger';stageResult.innerHTML=`<b>${success?'ENCOUNTER COMPLETE':'MECHANIC FAILURE'}</b><span>${success?'Formation intact. Review the feed or continue.':'The action feed shows where the formation broke.'}</span>`}
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
  document.querySelector('.nav-btn[data-view="world"]')?.addEventListener('click',()=>setTimeout(enhanceWorldCards,0));
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
  requestAnimationFrame(()=>{enhanceRoster();enhanceBank();enhanceProfessions();renderDungeonJournal();renderDungeonHistory();enhanceWorldCards()});
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
  bindRoster();bindBank();bindProfessions();bindWorldEnhancement();bindReportEnhancement();bindGlobal();interceptWorldActions();dock();queueEnhance();enhanceWorldCards();
  clearInterval(dockTimer);dockTimer=setInterval(()=>{if(!dockMinimized)loadDockChat()},8000);
  window.addEventListener('beforeunload',()=>clearInterval(dockTimer),{once:true});
  window.CellboundEvolution={renderDungeonJournal,startExpedition,enhanceRoster,enhanceBank,openWorldEncounter};
}
init();
})();