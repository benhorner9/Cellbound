(()=>{
'use strict';
const G=window.CellboundGear,P=window.CellboundProfessions;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let Game=null,db=null,user=null,selectedChar=null,selectedSlot=0,tradeFilter='all',market=[],lastCraftMessage='';

const clone=x=>JSON.parse(JSON.stringify(x));
const state=()=>Game?.getState?.();
const ent=()=>Game?.getEntitlements?.()||{professionSlots:1};
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
function recipeInputs(recipe){return Object.entries(recipe.inputs).map(([k,q])=>`${materialName(k)} ×${q}`).join(' · ');}
async function craft(recipeId){
  const s=state(),c=s.roster.find(x=>x.id===selectedChar),prof=c?.professions?.[selectedSlot],def=professionDef(prof?.name),recipe=def?.recipes.find(r=>r.id===recipeId);
  if(!recipe||!canCraft(recipe,prof))return;
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
  if(!c||slot>=slots||!P.PROFESSIONS[name]||c.professions.some(p=>p?.name===name))return;
  c.professions[slot]={name,level:1,xp:0};selectedChar=charId;selectedSlot=slot;s.activity.push(`${c.name} learned ${name}.`);await commit();
}
function renderProfessions(){
  if(!Game?.ready)return;normalise();const s=state(),list=$('#professionCharacterList'),work=$('#professionWorkshop'),grid=$('#reagentGrid');if(!list||!work||!grid)return;
  if(!selectedChar||!s.roster.some(c=>c.id===selectedChar))selectedChar=s.roster[0]?.id||null;
  grid.innerHTML=Object.entries(P.MATERIALS).map(([k,m])=>`<div class="reagent-card" data-endgame="${m.endgame?'1':'0'}"><div class="reagent-icon">${m.icon}</div><div><b>${m.name}</b><small>${m.source}</small></div><strong>${Number(s.materials[k])||0}</strong></div>`).join('');
  list.innerHTML=s.roster.slice(0,ent().rosterCap).map(c=>{const ps=c.professions.filter(Boolean);return `<button class="profession-char ${c.id===selectedChar?'active':''}" data-prof-char="${c.id}"><span class="avatar">${c.portrait}</span><span><b>${c.name}</b><small>${c.class} · ${c.spec}</small></span><em>${ps.length?ps.map(p=>`${p.name} ${p.level}`).join(' / '):'Untrained'}</em></button>`;}).join('');
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
  if(!stack||payload.effect!=='gear-enhancement'||!c||!slot)return;
  const item=c.equipment?.[slot],signature=equippedTargetKey(c,slot);if(!item?.name||!signature){lastCraftMessage=c.name+' has no equipped '+slot+' item.';renderCrafted();return}
  c.activeEnhancements=c.activeEnhancements&&typeof c.activeEnhancements==='object'?c.activeEnhancements:{};
  c.activeEnhancements[slot]={key:stack.key,name:stack.name,slot,bonuses:{...(payload.bonuses||{})},remainingBosses:Math.max(1,Number(payload.charges)||3),targetSignature:signature,appliedAt:new Date().toISOString()};
  consumeStack(key);s.activity.push(stack.name+' applied to '+c.name+'’s '+slot+'.');lastCraftMessage=stack.name+' applied to '+c.name+' for '+(payload.charges||3)+' boss encounters.';await commit();
}
async function drinkFlask(key,charId){
  const s=state(),stack=s.consumables.find(x=>x.key===key),payload=stack?.payload||{},c=s.roster.find(x=>x.id===charId);
  if(!stack||payload.effect!=='character-flask'||!c)return;
  c.activeProfessionBuffs=Array.isArray(c.activeProfessionBuffs)?c.activeProfessionBuffs.filter(x=>x.kind!=='flask'):[];
  c.activeProfessionBuffs.push({kind:'flask',key:stack.key,name:stack.name,bonuses:{...(payload.bonuses||{})},remainingBosses:Math.max(1,Number(payload.charges)||3),appliedAt:new Date().toISOString()});
  consumeStack(key);s.activity.push(c.name+' drank '+stack.name+'.');lastCraftMessage=c.name+' gained '+stack.name+' for '+(payload.charges||3)+' boss encounters.';await commit();
}
async function useCellShockDraught(key,charId){
  const s=state(),stack=s.consumables.find(x=>x.key===key),c=s.roster.find(x=>x.id===charId);if(!stack||!c)return;
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
      action='<select data-craft-target="'+x.key+'">'+s.roster.map(c=>'<option value="'+c.id+'">'+c.name+' · '+(c.equipment?.[p.slot]?.name||'No '+p.slot)+'</option>').join('')+'</select><button data-apply-enhancement="'+x.key+'">APPLY TO '+String(p.slot||'ITEM').toUpperCase()+'</button>';
    }else if(p.effect==='character-flask'){
      action='<select data-craft-target="'+x.key+'">'+s.roster.map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('')+'</select><button data-drink-flask="'+x.key+'">DRINK FLASK</button>';
    }else if(p.effect==='clear-cell-shock'){
      action='<select data-craft-target="'+x.key+'">'+s.roster.map(c=>'<option value="'+c.id+'">'+c.name+' · Shock '+(c.cellShock||0)+'%</option>').join('')+'</select><button data-clear-shock="'+x.key+'">USE</button>';
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
function sellOptions(){
  const s=state(),out=[];
  s.bank.filter(x=>x.tradeState!=='soulbound').forEach(x=>out.push({type:'gear',id:x.id,key:x.itemId,name:x.name,qty:x.quantity||1,payload:Game.canonicalItem(x)}));
  Object.entries(s.materials).filter(([,q])=>Number(q)>0).forEach(([k,q])=>out.push({type:'material',id:k,key:k,name:materialName(k),qty:Number(q),payload:P.MATERIALS[k]}));
  s.consumables.filter(x=>(x.quantity||0)>0).forEach(x=>out.push({type:'consumable',id:x.key,key:x.key,name:x.name,qty:x.quantity||1,payload:x.payload||{}}));
  s.recipeScrolls.filter(x=>(x.quantity||0)>0).forEach(x=>out.push({type:'recipe',id:x.recipeId,key:x.recipeId,name:x.name,qty:x.quantity||1,payload:{recipeId:x.recipeId}}));
  return out;
}
function selectedSellOption(){
  const sel=$('#tradeSellItem'),[type,id]=(sel?.value||'').split('|');
  return sellOptions().find(o=>o.type===type&&o.id===id)||null;
}
function sellPreviewArt(item){
  if(!item)return'';
  if(item.type==='gear'){
    const gear=G.byId(item.key)||G.byName(item.name)||item.payload;
    return G.artHTML(gear,82,'trade-sell-gear-art');
  }
  if(item.type==='material')return P?.materialArtHTML?P.materialArtHTML(item.key,76,'trade-sell-material-art'):(P?.MATERIALS?.[item.key]?.icon||'◇');
  if(item.type==='recipe')return'<span class="trade-preview-symbol">▤</span>';
  return'<span class="trade-preview-symbol">⚗</span>';
}
function sellPreviewMeta(item){
  const p=item?.payload||{};
  if(!item)return{eyebrow:'',detail:'',sub:''};
  if(item.type==='gear'){
    const base=G.byId(item.key)||G.byName(item.name)||{},gear={...base,...p};
    const rarity=gear.rarity||'Common',slot=gear.slot||'Gear',ilvl=Number(gear.itemLevel)||0,power=Number(gear.power)||0;
    const classes=gear.classes==='all'||!gear.classes?'All classes':Array.isArray(gear.classes)?gear.classes.join(', '):String(gear.classes);
    const roll=(G.statLines?.(gear)||[]).map(s=>s.text).join(' · ');
    return{eyebrow:`${rarity} · ${slot}`,detail:`Item Level ${ilvl}${power?` · +${power} Power`:''}${roll?` · ${roll}`:''}`,sub:`${classes}${gear.source?` · ${gear.source}`:''}`};
  }
  if(item.type==='material'){
    const mat=P?.MATERIALS?.[item.key]||p;
    return{eyebrow:`${mat?.rarity||'Common'} · Reagent`,detail:mat?.source||'Dungeon reagent',sub:'Tradeable profession material'};
  }
  if(item.type==='recipe'){
    const recipe=P?.recipeById?.(item.key);
    return{eyebrow:'Rare · Recipe Scroll',detail:recipe?.name||item.name,sub:recipe?`Required skill ${recipe.level||1}`:'Tradeable crafting recipe'};
  }
  return{eyebrow:p.effect==='gear-enhancement'?'Crafted · Item Enhancement':p.effect==='character-flask'?'Crafted · Flask':'Crafted · Consumable',detail:p.description||p.effect||'Tradeable crafted item',sub:p.charges?'Consumed after '+p.charges+' boss encounters':'Created through a profession'};
}
function renderSellPreview(){
  const root=$('#tradeSellPreview'),summary=$('#tradeSellSummary'),qtyInput=$('#tradeSellQuantity'),priceInput=$('#tradeSellPrice');
  if(!root||!summary)return;
  const item=selectedSellOption();
  if(!item){
    root.innerHTML='<div class="trade-preview-empty">Choose an item to preview the listing.</div>';
    summary.innerHTML='';if(qtyInput)qtyInput.max='1';return;
  }
  const meta=sellPreviewMeta(item),qty=Math.max(1,Math.min(item.qty,Number(qtyInput?.value)||1)),price=Math.max(1,Number(priceInput?.value)||1);
  if(qtyInput){qtyInput.max=String(item.qty);if(Number(qtyInput.value)!==qty)qtyInput.value=String(qty)}
  const gross=qty*price,tax=Math.ceil(gross*.05),net=Math.max(0,gross-tax);
  root.innerHTML=`<article class="trade-preview-card trade-preview-${item.type}">
    <div class="trade-preview-art">${sellPreviewArt(item)}</div>
    <div class="trade-preview-copy"><small>${meta.eyebrow}</small><h4>${item.name}</h4><p>${meta.detail}</p><em>${meta.sub}</em></div>
    <div class="trade-preview-owned"><span>OWNED</span><b>×${item.qty}</b></div>
  </article>`;
  summary.innerHTML=`<div><span>Listing value</span><b>${gross.toLocaleString()}g</b></div><div><span>5% sale tax</span><b>−${tax.toLocaleString()}g</b></div><div class="net"><span>Expected proceeds</span><b>${net.toLocaleString()}g</b></div>`;
}
function renderSellOptions(){
  const sel=$('#tradeSellItem');if(!sel||!state())return;const opts=sellOptions(),previous=sel.value;
  sel.innerHTML=opts.length?opts.map(o=>`<option value="${o.type}|${o.id}">${o.name} · ${o.type} · ×${o.qty}</option>`).join(''):'<option value="">No tradeable items available</option>';
  if(previous&&opts.some(o=>`${o.type}|${o.id}`===previous))sel.value=previous;
  renderSellPreview();
}
async function createListing(e){
  e.preventDefault();const s=state(),sel=$('#tradeSellItem'),qty=Math.max(1,Number($('#tradeSellQuantity')?.value)||1),price=Math.max(1,Number($('#tradeSellPrice')?.value)||1),[type,id]=(sel?.value||'').split('|'),item=sellOptions().find(o=>o.type===type&&o.id===id);
  if(!item||qty>item.qty)return;
  const before=clone(s);
  if(type==='gear'){const x=s.bank.find(v=>v.id===id);x.quantity=(x.quantity||1)-qty;if(x.quantity<=0)s.bank=s.bank.filter(v=>v.id!==id);}
  else if(type==='material')s.materials[id]-=qty;
  else if(type==='consumable'){const x=s.consumables.find(v=>v.key===id);x.quantity-=qty;if(x.quantity<=0)s.consumables=s.consumables.filter(v=>v!==x);}else if(type==='recipe'){const x=s.recipeScrolls.find(v=>v.recipeId===id);x.quantity-=qty;if(x.quantity<=0)s.recipeScrolls=s.recipeScrolls.filter(v=>v!==x);}
  await commit(false);
  const {error}=await db.from('trading_post_listings').insert({seller_id:user.id,seller_label:`Guild ${user.id.slice(0,4).toUpperCase()}`,category:type,item_key:item.key,item_name:item.name,payload:item.payload||{},quantity:qty,unit_price:price});
  if(error){console.error(error);Game.replaceState(before);$('#tradeSellHint').textContent='Listing failed. Your item was returned.';return;}
  s.activity.push(`Listed ${item.name} ×${qty} for ${price} gold each.`);await commit();$('#tradeSellHint').textContent='Listing created.';renderSellOptions();await loadMarket();
}
function craftedLabel(payload={}){return payload.effect==='gear-enhancement'?'ENHANCEMENT':payload.effect==='character-flask'?'FLASK':payload.effect==='combat-potion'?'POTION':payload.effect==='clear-cell-shock'?'RECOVERY':'CRAFTED'}
function tradeArt(l){if(l.category==='gear'){const gear=G.byId(l.item_key)||G.byName(l.item_name)||l.payload;return G.artHTML(gear,48);}if(l.category==='material')return P?.materialArtHTML?P.materialArtHTML(l.item_key,46,'trade-material-art'):(P.MATERIALS[l.item_key]?.icon||'◇');if(l.category==='recipe')return'▤';if(l.payload?.effect==='gear-enhancement')return'✥';return'⚗';}
async function loadMarket(){
  if(!db||!user)return;const {data,error}=await db.from('trading_post_listings').select('*').order('created_at',{ascending:false}).limit(100);
  if(error){console.error(error);market=[];}else market=data||[];
  renderMarket();renderMyListings();
}
function renderMarket(){
  const root=$('#tradeListings');if(!root)return;const rows=market.filter(l=>l.status==='active'&&(tradeFilter==='all'||l.category===tradeFilter));
  if(!rows.length){root.innerHTML='<div class="market-empty">No active listings in this category.</div>';return;}
  root.innerHTML=rows.map(l=>{const base=l.category==='gear'?(G.byId(l.item_key)||G.byName(l.item_name)||{}):{},gear=l.category==='gear'?{...base,...(l.payload||{})}:null,roll=gear?(G.statLines?.(gear)||[]):[];return `<article class="trade-card"><div class="trade-art">${tradeArt(l)}</div><div><h4>${l.item_name}</h4><small>${l.category==='consumable'?craftedLabel(l.payload||{}):l.category.toUpperCase()} · ×${l.quantity} · ${l.seller_label}</small>${roll.length?`<div class="trade-roll-stats">${roll.map(s=>`<span>${s.text}</span>`).join('')}</div>`:''}</div><div class="trade-price"><b>${Number(l.unit_price).toLocaleString()}g</b><small>each</small></div><button data-buy="${l.id}" ${l.seller_id===user.id?'disabled':''}>${l.seller_id===user.id?'YOUR LISTING':'BUY 1'}</button></article>`}).join('');
  root.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>buyListing(b.dataset.buy));
}
function renderMyListings(){
  const root=$('#myTradeListings');if(!root)return;const rows=market.filter(l=>l.seller_id===user.id&&l.status==='active');
  root.innerHTML=rows.length?rows.map(l=>`<div class="trade-card"><div class="trade-art">${tradeArt(l)}</div><div><h4>${l.item_name}</h4><small>×${l.quantity} · ${l.unit_price}g each</small></div><button data-cancel-listing="${l.id}">CANCEL</button></div>`).join(''):'<div class="market-empty">No active listings.</div>';
  root.querySelectorAll('[data-cancel-listing]').forEach(b=>b.onclick=()=>cancelListing(b.dataset.cancelListing));
}
async function buyListing(id){
  const listing=market.find(x=>x.id===id);if(!listing||listing.seller_id===user.id)return;
  const {data,error}=await db.rpc('purchase_trading_listing',{p_listing_id:id,p_quantity:1});
  if(error){alert(error.message||'Purchase failed');await loadMarket();return;}
  location.reload();
}
async function cancelListing(id){
  const l=market.find(x=>x.id===id&&x.seller_id===user.id&&x.status==='active');if(!l)return;
  const {error}=await db.from('trading_post_listings').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('id',id).eq('seller_id',user.id);
  if(error){console.error(error);return;}
  if(l.category==='gear'){const base=G.byId(l.item_key)||G.byName(l.item_name)||{},gear={...base,...(l.payload||{})};for(let i=0;i<l.quantity;i++)Game.addBankItem({...gear,source:'Trading Post cancellation'});}
  else if(l.category==='material')Game.addMaterial(l.item_key,l.quantity);
  else if(l.category==='consumable')addConsumable({key:l.item_key,name:l.item_name,payload:l.payload},l.quantity);else if(l.category==='recipe'){const x=state().recipeScrolls.find(v=>v.recipeId===l.item_key);if(x)x.quantity=(x.quantity||1)+l.quantity;else state().recipeScrolls.push({recipeId:l.item_key,name:l.item_name,quantity:l.quantity});}
  state().activity.push(`Cancelled Trading Post listing: ${l.item_name}.`);await commit();await loadMarket();
}
function bind(){
  $$('.nav-btn[data-view="professions"]').forEach(b=>b.addEventListener('click',renderProfessions));
  $$('.nav-btn[data-view="trading"]').forEach(b=>b.addEventListener('click',()=>{renderSellOptions();loadMarket();}));
  $('#refreshTrading')?.addEventListener('click',loadMarket);
  $('#tradeSellForm')?.addEventListener('submit',createListing);
  $('#tradeSellItem')?.addEventListener('change',renderSellPreview);
  $('#tradeSellQuantity')?.addEventListener('input',renderSellPreview);
  $('#tradeSellPrice')?.addEventListener('input',renderSellPreview);
  $('#tradeFilters [data-trade-filter]').forEach(b=>b.addEventListener('click',()=>{$('#tradeFilters [data-trade-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');tradeFilter=b.dataset.tradeFilter;renderMarket();}));
}
async function init(){
  Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,80);return;}P&&normalise();db=Game.getSupabase();user=Game.getUser();if(!db||!user)return;
  const claimed=await claimProceeds();if(claimed>0){location.reload();return;}
  const delivered=await processInbox();if(delivered){Game.renderAll();}
  bind();renderProfessions();renderSellOptions();
  window.CellboundEconomy={renderProfessions,loadMarket};
}
init();
})();