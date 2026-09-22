(()=>{
'use strict';
const G=window.CellboundGear,P=window.CellboundProfessions;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let Game=null,db=null,user=null,selectedChar=null,selectedSlot=0,tradeFilter='all',market=[],lastCraftMessage='';

const clone=x=>JSON.parse(JSON.stringify(x));
const state=()=>Game?.getState?.();
const ent=()=>Game?.getEntitlements?.()||{professionSlots:1};
const usableRoster=()=>state()?.roster?.filter(c=>Game?.isCharacterRosterUnlocked?.(c.id)!==false)||[];
const characterUsable=id=>Game?.isCharacterRosterUnlocked?.(id)!==false;
const materialName=k=>P?.MATERIALS?.[k]?.name||k;
const professionDef=n=>P?.PROFESSIONS?.[n]||null;

function normalise(){
  const s=state();if(!s)return;
  s.materials=s.materials&&typeof s.materials==='object'?s.materials:{};
  s.consumables=Array.isArray(s.consumables)?s.consumables:[];
  s.recipeScrolls=Array.isArray(s.recipeScrolls)?s.recipeScrolls:[];
  s.discoveredRecipes=Array.isArray(s.discoveredRecipes)?s.discoveredRecipes:[];
  s.tradeInbox=Array.isArray(s.tradeInbox)?s.tradeInbox:[];
  s.roster.forEach(c=>{c.professions=Array.isArray(c.professions)?c.professions.slice(0,2):[null,null];while(c.professions.length<2)c.professions.push(null);c.professions=c.professions.map(p=>p?{name:p.name,level:Math.max(1,Math.min(100,Number(p.level)||1)),xp:Math.max(0,Number(p.xp)||0)}:null);c.activeEnhancements=c.activeEnhancements&&typeof c.activeEnhancements==='object'?c.activeEnhancements:{};c.activeProfessionBuffs=Array.isArray(c.activeProfessionBuffs)?c.activeProfessionBuffs:[];});
}
function addConsumable(item,qty=1){
  const s=state(),key=item.key||item.itemKey,name=item.name||item.itemName||key,payload=item.payload||{};
  const found=s.consumables.find(x=>x.key===key);
  if(found)found.quantity=(found.quantity||1)+qty;
  else s.consumables.push({key,name,payload,quantity:qty});
}
async function commit(render=true){
  Game.save();await Game.persistState();if(render){Game.renderAll();renderProfessions();renderCrafted();renderSellOptions();}
}
async function processInbox(){
  const s=state();if(!s.tradeInbox.length)return false;
  for(const d of s.tradeInbox){
    const qty=Math.max(1,Number(d.quantity)||1);
    if(d.category==='material')Game.addMaterial(d.itemKey,qty);
    else if(d.category==='consumable')addConsumable({key:d.itemKey,name:d.itemName,payload:d.payload},qty);
    else if(d.category==='gear'){const base=G.byId(d.itemKey)||G.byName(d.itemName)||{},gear={...base,...(d.payload||{})},source=d.payload?.source||'Trading Post',worldBoss=['Gloamhide Behemoth','The Hollow Wyrm','Veyr, the Cell-Torn'].includes(source);for(let i=0;i<qty;i++){const delivered=worldBoss&&!gear.bonusStats?G.rollItemAffixes({...gear,source}):{...gear,source};Game.addBankItem(delivered);}}
    else if(d.category==='recipe'){const rid=d.payload?.recipeId||d.itemKey;if(rid){const x=s.recipeScrolls.find(v=>v.recipeId===rid);if(x)x.quantity=(x.quantity||1)+qty;else s.recipeScrolls.push({recipeId:rid,name:d.itemName||`Recipe: ${P.recipeById(rid)?.name||rid}`,quantity:qty});}}
    s.activity.push(`${d.payload?.source||'Trading Post'} delivery received: ${(G.byId(d.itemKey)?.name)||d.itemName} ×${qty}.`);
  }
  s.tradeInbox=[];await commit(false);return true;
}
async function claimProceeds(){
  const {data,error}=await db.rpc('claim_trading_proceeds');
  if(error){console.warn('Trade proceeds claim failed',error);return 0;}
  return Number(data?.claimedGold)||0;
}
function professionLevelUp(p,xp){
  if(!p)return; p.xp=(Number(p.xp)||0)+Math.max(0,xp);
  while(p.level<100){const need=P.skillThreshold(p.level);if(p.xp<need)break;p.xp-=need;p.level++;}
  if(p.level>=100){p.level=100;p.xp=0;}
}
function canCraft(recipe,prof){
  if(!prof||prof.level<recipe.level)return false;
  if(recipe.requiresDiscovery&&!state().discoveredRecipes.includes(recipe.id))return false;
  return Object.entries(recipe.inputs).every(([k,q])=>(Number(state().materials[k])||0)>=q);
}
function materialRaritySlug(k){return String(P?.MATERIALS?.[k]?.rarity||'Common').toLowerCase().replace(/[^a-z0-9]+/g,'-')}
function recipeInputs(recipe){return Object.entries(recipe.inputs).map(([k,q])=>`<span class="recipe-reagent rarity-${materialRaritySlug(k)}"><b>${materialName(k)}</b><em>×${q}</em></span>`).join(' ');}
async function craft(recipeId){
  const s=state(),c=s.roster.find(x=>x.id===selectedChar),prof=c?.professions?.[selectedSlot],def=professionDef(prof?.name),recipe=def?.recipes.find(r=>r.id===recipeId);
  if(!c||!characterUsable(c.id)||!recipe||!canCraft(recipe,prof))return;
  Object.entries(recipe.inputs).forEach(([k,q])=>s.materials[k]=Math.max(0,(Number(s.materials[k])||0)-q));
  const out=recipe.output,qty=out.quantity||1;
  if(out.category==='consumable')addConsumable(out,qty);
  else if(out.category==='material')Game.addMaterial(out.key,qty);
  professionLevelUp(prof,recipe.xp||0);
  s.activity.push(`${c.name} crafted ${out.name} using ${prof.name}.`);
  lastCraftMessage=`${out.name} crafted successfully.`;
  await commit();
}
async function learnProfession(charId,slot,name){
  const s=state(),c=s.roster.find(x=>x.id===charId),slots=ent().professionSlots;
  if(!c||!characterUsable(c.id)||slot>=slots||!P.PROFESSIONS[name]||c.professions.some(p=>p?.name===name))return;
  c.professions[slot]={name,level:1,xp:0};selectedChar=charId;selectedSlot=slot;s.activity.push(`${c.name} learned ${name}.`);await commit();
}
function renderProfessions(){
  if(!Game?.ready)return;normalise();const s=state(),list=$('#professionCharacterList'),work=$('#professionWorkshop'),grid=$('#reagentGrid');if(!list||!work||!grid)return;
  const usable=usableRoster();if(!selectedChar||!usable.some(c=>c.id===selectedChar))selectedChar=usable[0]?.id||null;
  grid.innerHTML=Object.entries(P.MATERIALS).map(([k,m])=>{const rarity=String(m.rarity||'Common'),slug=materialRaritySlug(k),art=P?.materialArtHTML?P.materialArtHTML(k,48,'reagent-material-art'):`<span class="reagent-symbol">${m.icon||'◇'}</span>`;return `<div class="reagent-card rarity-${slug}" data-rarity="${rarity}" data-endgame="${m.endgame?'1':'0'}"><div class="reagent-icon">${art}</div><div class="reagent-copy"><em class="reagent-rarity rarity-${slug}">${rarity}</em><b>${m.name}</b><small>${m.source}</small></div><strong>${Number(s.materials[k])||0}</strong></div>`}).join('');
  list.innerHTML=usable.map(c=>{const ps=c.professions.filter(Boolean);return `<button class="profession-char ${c.id===selectedChar?'active':''}" data-prof-char="${c.id}"><span class="avatar">${c.portrait}</span><span><b>${c.name}</b><small>${c.class} · ${c.spec}</small></span><em>${ps.length?ps.map(p=>`${p.name} ${p.level}`).join(' / '):'Untrained'}</em></button>`;}).join('');
  list.querySelectorAll('[data-prof-char]').forEach(b=>b.onclick=()=>{selectedChar=b.dataset.profChar;selectedSlot=0;lastCraftMessage='';renderProfessions();});
  const c=s.roster.find(x=>x.id===selectedChar);if(!c){work.innerHTML='<div class="profession-empty">No adventurer selected.</div>';return;}
  const slots=ent().professionSlots;$('#workshopTitle').textContent=`${c.name}'s Workshop`;
  const slotHtml=[0,1].map(i=>{const p=c.professions[i],locked=i>=slots;return `<button class="profession-slot-card ${locked?'locked':''} ${selectedSlot===i&&!locked?'active':''}" data-prof-slot="${i}" ${locked?'disabled':''}><small>PROFESSION ${i+1}</small><b>${locked?'Membership Slot':p?.name||'Unlearned'}</b><p>${locked?'Unlocks with membership':p?`Skill ${p.level}/100`:'Choose a trade skill for this adventurer.'}</p></button>`;}).join('');
  const prof=c.professions[selectedSlot];
  let body='';
  if(selectedSlot>=slots)body='<div class="profession-empty">This profession slot is available with membership.</div>';
  else if(!prof){
    const choices=Object.entries(P.PROFESSIONS).filter(([n])=>!c.professions.some(p=>p?.name===n));
    body=`<div class="profession-choices">${choices.map(([n,d])=>`<button class="profession-choice" data-learn-prof="${n}"><b>${d.icon} ${n}</b><small>${d.summary}</small></button>`).join('')}</div>`;
  }else{
    const def=professionDef(prof.name),need=prof.level>=100?1:P.skillThreshold(prof.level),pct=prof.level>=100?100:Math.min(100,Math.round((prof.xp/need)*100));
    body=`<div class="skill-line"><span>${def.icon} ${prof.name} · Skill ${prof.level}/100</span><b>${prof.level>=100?'MAX':`${prof.xp} / ${need} XP`}</b></div><div class="skill-bar"><i style="width:${pct}%"></i></div>${lastCraftMessage?`<p class="craft-message">${lastCraftMessage}</p>`:''}<div class="recipe-list">${def.recipes.map(r=>{const discovered=!r.requiresDiscovery||s.discoveredRecipes.includes(r.id),levelOk=prof.level>=r.level,materialsOk=Object.entries(r.inputs).every(([k,q])=>(Number(s.materials[k])||0)>=q),ok=discovered&&levelOk&&materialsOk;const lock=!discovered?'Recipe not discovered':!levelOk?`Requires skill ${r.level}`:!materialsOk?'Missing reagents':'';return `<article class="recipe-card ${ok?'':'locked'}"><div><small>${r.endgame?'END-GAME · ':''}SKILL ${r.level}</small><h4>${r.name}</h4><p>${recipeInputs(r)} → ${r.output.name}</p>${lock?`<p>${lock}</p>`:''}</div><button data-craft="${r.id}" ${ok?'':'disabled'}>CRAFT</button></article>`;}).join('')}</div>`;
  }
  work.innerHTML=`<div class="profession-slot-grid">${slotHtml}</div>${body}`;
  work.querySelectorAll('[data-prof-slot]').forEach(b=>b.onclick=()=>{selectedSlot=Number(b.dataset.profSlot);lastCraftMessage='';renderProfessions();});
  work.querySelectorAll('[data-learn-prof]').forEach(b=>b.onclick=()=>learnProfession(c.id,selectedSlot,b.dataset.learnProf));
  work.querySelectorAll('[data-craft]').forEach(b=>b.onclick=()=>craft(b.dataset.craft));
  renderCrafted();
}
function consumeStack(key){
  const s=state(),stack=s.consumables.find(x=>x.key===key);if(!stack)return null;
  stack.quantity=(Number(stack.quantity)||1)-1;if(stack.quantity<=0)s.consumables=s.consumables.filter(x=>x!==stack);return stack
}
function equippedTargetKey(c,slot){return P?.itemSignature?.(c?.equipment?.[slot])||null}
async function applyGearEnhancement(key,charId){
  const s=state(),stack=s.consumables.find(x=>x.key===key),payload=stack?.payload||{},c=s.roster.find(x=>x.id===charId),slot=payload.slot;
  if(!stack||payload.effect!=='gear-enhancement'||!c||!characterUsable(c.id)||!slot)return;
  const item=c.equipment?.[slot],signature=equippedTargetKey(c,slot);if(!item?.name||!signature){lastCraftMessage=c.name+' has no equipped '+slot+' item.';renderCrafted();return}
  c.activeEnhancements=c.activeEnhancements&&typeof c.activeEnhancements==='object'?c.activeEnhancements:{};
  c.activeEnhancements[slot]={key:stack.key,name:stack.name,slot,bonuses:{...(payload.bonuses||{})},remainingBosses:Math.max(1,Number(payload.charges)||3),targetSignature:signature,appliedAt:new Date().toISOString()};
  consumeStack(key);s.activity.push(stack.name+' applied to '+c.name+'’s '+slot+'.');lastCraftMessage=stack.name+' applied to '+c.name+' for '+(payload.charges||3)+' boss encounters.';await commit();
}
async function drinkFlask(key,charId){
  const s=state(),stack=s.consumables.find(x=>x.key===key),payload=stack?.payload||{},c=s.roster.find(x=>x.id===charId);
  if(!stack||payload.effect!=='character-flask'||!c||!characterUsable(c.id))return;
  c.activeProfessionBuffs=Array.isArray(c.activeProfessionBuffs)?c.activeProfessionBuffs.filter(x=>x.kind!=='flask'):[];
  c.activeProfessionBuffs.push({kind:'flask',key:stack.key,name:stack.name,bonuses:{...(payload.bonuses||{})},remainingBosses:Math.max(1,Number(payload.charges)||3),appliedAt:new Date().toISOString()});
  consumeStack(key);s.activity.push(c.name+' drank '+stack.name+'.');lastCraftMessage=c.name+' gained '+stack.name+' for '+(payload.charges||3)+' boss encounters.';await commit();
}
async function useCellShockDraught(key,charId){
  const s=state(),stack=s.consumables.find(x=>x.key===key),c=s.roster.find(x=>x.id===charId);if(!stack||!c||!characterUsable(c.id))return;
  c.cellShock=0;c.cellShockLockedUntil=null;consumeStack(key);s.activity.push(c.name+'’s Cell Shock was cleared with '+stack.name+'.');lastCraftMessage=c.name+' is fully recovered.';await commit();
}
function activeEffectText(c){
  const effects=P?.activeEffects?.(c)||[];
  return effects.map(x=>x.name+' · '+(P?.bonusText?.(x.bonuses)||'')+' · '+x.remainingBosses+' boss'+(x.remainingBosses===1?'':'es')).join('<br>');
}
function renderCrafted(){
  const root=$('#craftedInventory');if(!root||!state())return;const s=state();
  const active=s.roster.map(c=>{const txt=activeEffectText(c);return txt?'<article class="crafted-active"><b>'+c.name+'</b><small>'+txt+'</small></article>':''}).filter(Boolean).join('');
  if(!s.consumables.length&&!s.recipeScrolls.length&&!active){root.innerHTML='<div class="profession-empty">Nothing crafted yet.</div>';return;}
  const consumables=s.consumables.map(x=>{
    const p=x.payload||{},desc=p.description||P?.bonusText?.(p.bonuses)||'Tradeable crafted item';
    let action='';
    if(p.effect==='gear-enhancement'){
      action='<select data-craft-target="'+x.key+'">'+usableRoster().map(c=>'<option value="'+c.id+'">'+c.name+' · '+(c.equipment?.[p.slot]?.name||'No '+p.slot)+'</option>').join('')+'</select><button data-apply-enhancement="'+x.key+'">APPLY TO '+String(p.slot||'ITEM').toUpperCase()+'</button>';
    }else if(p.effect==='character-flask'){
      action='<select data-craft-target="'+x.key+'">'+usableRoster().map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('')+'</select><button data-drink-flask="'+x.key+'">DRINK FLASK</button>';
    }else if(p.effect==='clear-cell-shock'){
      action='<select data-craft-target="'+x.key+'">'+usableRoster().map(c=>'<option value="'+c.id+'">'+c.name+' · Shock '+(c.cellShock||0)+'%</option>').join('')+'</select><button data-clear-shock="'+x.key+'">USE</button>';
    }else if(p.effect==='combat-potion'){
      action='<em>Use during a dungeon with the USE CONSUMABLE combat command.</em>';
    }
    return '<div class="crafted-card"><strong>×'+(x.quantity||1)+'</strong><b>⚗ '+x.name+'</b><small>'+desc+'</small>'+action+'</div>';
  }).join('');
  const scrolls=s.recipeScrolls.map(x=>'<div class="crafted-card"><strong>×'+(x.quantity||1)+'</strong><b>▤ '+x.name+'</b><small>Rare tradeable recipe scroll</small><button data-learn-scroll="'+x.recipeId+'">LEARN</button></div>').join('');
  root.innerHTML=(lastCraftMessage?'<p class="craft-message">'+lastCraftMessage+'</p>':'')+(active?'<div class="crafted-active-grid"><small>ACTIVE PROFESSION EFFECTS</small>'+active+'</div>':'')+consumables+scrolls;
  root.querySelectorAll('[data-learn-scroll]').forEach(b=>b.onclick=async()=>{const x=s.recipeScrolls.find(v=>v.recipeId===b.dataset.learnScroll);if(!x)return;if(!s.discoveredRecipes.includes(x.recipeId))s.discoveredRecipes.push(x.recipeId);x.quantity--;if(x.quantity<=0)s.recipeScrolls=s.recipeScrolls.filter(v=>v!==x);s.activity.push(x.name+' learned.');await commit();});
  root.querySelectorAll('[data-apply-enhancement]').forEach(b=>b.onclick=()=>{const sel=root.querySelector('[data-craft-target="'+b.dataset.applyEnhancement+'"]');applyGearEnhancement(b.dataset.applyEnhancement,sel?.value)});
  root.querySelectorAll('[data-drink-flask]').forEach(b=>b.onclick=()=>{const sel=root.querySelector('[data-craft-target="'+b.dataset.drinkFlask+'"]');drinkFlask(b.dataset.drinkFlask,sel?.value)});
  root.querySelectorAll('[data-clear-shock]').forEach(b=>b.onclick=()=>{const sel=root.querySelector('[data-craft-target="'+b.dataset.clearShock+'"]');useCellShockDraught(b.dataset.clearShock,sel?.value)});
}
function renderSellOptions(){return window.CellboundTradingPostV3?.refresh?.(false)}
async function loadMarket(){return window.CellboundTradingPostV3?.refresh?.()}
function bind(){
  document.querySelectorAll('.nav-btn[data-view="professions"]').forEach(b=>b.addEventListener('click',renderProfessions));
  window.addEventListener('cellbound:view-changed',e=>{
    if(e.detail?.view==='professions')renderProfessions();
  });
}
async function init(){
  Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,80);return;}P&&normalise();db=Game.getSupabase();user=Game.getUser();if(!db||!user)return;
  bind();renderProfessions();renderCrafted();
  window.CellboundEconomy={
    renderProfessions,
    loadMarket,
    renderTrading:()=>window.CellboundTradingPostV3?.refresh?.(),
    processInbox,
    claimProceeds,
    renderCrafted
  };
}
init();
})();