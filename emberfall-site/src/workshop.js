import {
 HERO_IDS,HERO_NAMES,ITEM_DEFS,TALENTS,SLOTS,QUARTERMASTER,DROP_TABLE,MAX_LEVEL,BOSSES,bossDropTable,canChallenge,
 xpNeeded,talentPoints,itemOwner,chooseTalent,equip,unequip,sell,buy,itemBonusText,writeProfile
} from './progression.js';

// Pure DOM: no canvas dependencies. The workshop is local-only and never implies online ownership.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const pretty={knight:'Guardian',ranger:'Ranger',mage:'Arcanist',cleric:'Cleric'};
const slotTitle={weapon:'Weapon',armour:'Armour',charm:'Charm'};
const rarityClass=name=>String(name).toLowerCase();
export function mountWorkshop({profile,storage,onOpen=()=>{},onClose=()=>{},onChange=()=>{}}){
 const root=document.getElementById('workshop'),body=document.getElementById('workshopBody'),
 title=document.getElementById('workshopHeading'),tabs=document.getElementById('workshopTabs');
 let current='heroes',heroId='knight',pendingSell=null,dropBoss='thornwarden';
 const tabNames={heroes:'Heroes & Talents',pack:'Equipment Bag',shop:'Quartermaster',loot:'Boss Drops'};
 function itemName(itemId){
  const inst=profile.items.find(x=>x.id===itemId);return inst?ITEM_DEFS[inst.defId]:null;
 }
 function itemCard(item,actions=''){
  const def=ITEM_DEFS[item.defId],owner=itemOwner(profile,item.id);
  return '<article class="loot-card rarity-'+rarityClass(def.rarity)+'"><span class="loot-icon">'+esc(def.icon)+'</span>'
   +'<div class="loot-content"><div class="loot-top"><strong>'+esc(def.name)+'</strong><span class="rarity">'+esc(def.rarity)+'</span></div>'
   +'<span class="item-type">'+esc(slotTitle[def.slot])+(def.classes?' · '+def.classes.map(x=>pretty[x]).join(', '):' · Any hero')+'</span>'
   +'<small class="item-effects">'+esc(itemBonusText(def))+'</small>'
   +'<small class="item-owner">'+(item.id.startsWith('shop-')?'Quartermaster stock · Price '+def.shop+' gold':owner?'Equipped by '+esc(HERO_NAMES[owner])+' · Sell for '+def.value+' gold':'In your bag · Sell for '+def.value+' gold')+'</small>'
   +(actions?'<div class="loot-actions">'+actions+'</div>':'')+'</div></article>';
 }
 function renderHeroes(){
  const hero=profile.heroes[heroId],level=hero.level,need=xpNeeded(level);
  let html='<div class="hero-picker">'+HERO_IDS.map(id=>'<button type="button" class="hero-picker-btn '+(id===heroId?'active':'')+'" data-action="hero" data-id="'+id+'">'+esc(HERO_NAMES[id])+'<small>Lv '+profile.heroes[id].level+'</small></button>').join('')+'</div>';
  html+='<div class="progress-hero"><div><span class="eyebrow">YOUR '+esc(pretty[heroId]).toUpperCase()+'</span><h3>'+esc(HERO_NAMES[heroId])+' <span>Level '+level+'</span></h3><p>Earn XP by defeating bosses. Talent choices improve your abilities in real combat.</p></div><div class="progress-stat">'+(need?hero.xp+' / '+need+' XP':'MAX LEVEL')+'</div></div>';
  html+='<div class="xp-track"><i style="width:'+(need?Math.min(100,Math.floor(hero.xp/need*100)):100)+'%"></i></div>';
  html+='<div class="workshop-subheading"><h3>Hero Equipment</h3><span>3 available slots</span></div><div class="equipped-list">';
  for(const slot of SLOTS){
   const id=hero.gear[slot],def=id?itemName(id):null;
   html+='<div class="equipped-slot"><span class="slot-icon">'+(def?esc(def.icon):slot==='weapon'?'⚔️':slot==='armour'?'🛡':'✦')+'</span><div><b>'+esc(slotTitle[slot])+'</b><small>'+(def?esc(def.name)+' · '+esc(itemBonusText(def)):'Empty slot')+'</small></div>'+(id?'<button type="button" class="tiny-btn" data-action="unequip" data-slot="'+slot+'">Remove</button>':'')+'</div>';
  }
  html+='</div><button type="button" class="mini-link" data-action="tab" data-tab="pack">Open your equipment bag →</button>';
  html+='<div class="workshop-subheading"><h3>Talents</h3><span>'+(talentPoints(hero)>0?'✦ '+talentPoints(hero)+' choice available':'Choices at levels 2 and 4')+'</span></div>';
  for(const tier of [2,4]){
   const choices=TALENTS[heroId].filter(t=>t.tier===tier);
   const picked=choices.find(t=>hero.talents.includes(t.id));
   html+='<div class="talent-tier"><div class="talent-tier-title">LEVEL '+tier+' · '+(picked?'SELECTED: '+esc(picked.name):level<tier?'LOCKED':'CHOOSE ONE')+'</div><div class="talent-options">';
   for(const choice of choices){
    const selected=hero.talents.includes(choice.id),locked=!!picked||level<tier;
    html+='<button type="button" class="talent-choice '+(selected?'chosen':'')+'" data-action="talent" data-id="'+choice.id+'" '+(locked?'disabled':'')+'><span class="talent-icon">'+esc(choice.icon)+'</span><b>'+esc(choice.name)+'</b><small>'+esc(choice.description)+'</small><span class="talent-choose">'+(selected?'✓ Learned':level<tier?'Unlocks at '+tier:picked?'Other path':'Choose talent')+'</span></button>';
   }
   html+='</div></div>';
  }
  html+='<p class="workshop-disclaimer">Talent choices are permanent in this prototype. Equipment and talents are saved only in this browser—not in an online account.</p>';
  return html;
 }
 function renderPack(){
  let html='<div class="workshop-intro"><h3>Equipment Bag</h3><p>Select a hero, then equip compatible items. An item can only be held by one hero at a time. To move it, equip it on another hero.</p></div>';
  html+='<label for="equipHero">Equip items for</label><select id="equipHero" class="hero-select">'+HERO_IDS.map(id=>'<option value="'+id+'" '+(id===heroId?'selected':'')+'>'+esc(HERO_NAMES[id])+' · '+pretty[id]+'</option>').join('')+'</select>';
  html+='<div class="pack-stats"><span>'+profile.items.length+' / 400 items</span><span>'+profile.gold+' gold</span></div>';
  if(!profile.items.length)html+='<div class="pack-empty">Your bag is empty. Defeat a boss for a guaranteed item, or visit the Quartermaster for starter gear.</div>';
  for(const item of profile.items.slice().reverse()){
   const def=ITEM_DEFS[item.defId],owner=itemOwner(profile,item.id);
   const allowed=!def.classes||def.classes.includes(heroId);
   const action=owner===heroId?'<button type="button" class="tiny-btn" data-action="unequip" data-slot="'+def.slot+'">Unequip</button>':
    '<button type="button" class="tiny-btn" data-action="equip" data-id="'+item.id+'" '+(!allowed?'disabled':'')+'>'+(allowed?'Equip on '+esc(HERO_NAMES[heroId]):'Class restricted')+'</button>';
   const second=owner?'':'<button type="button" class="tiny-btn ghost danger" data-action="sell" data-id="'+item.id+'">'+(pendingSell===item.id?'Confirm sale?':'Sell')+'</button>';
   html+=itemCard(item,action+second);
  }
  return html;
 }
 function renderShop(){
  let html='<div class="workshop-intro"><h3>Quartermaster</h3><p>Buy inexpensive starter equipment using gold earned from bosses. Everything here is a fixed, local NPC offer—not another player’s listing.</p></div><div class="pack-stats"><span>Gold available</span><b>'+profile.gold+'</b></div>';
  for(const id of QUARTERMASTER){
   const def=ITEM_DEFS[id];
   const action='<button type="button" class="tiny-btn" data-action="buy" data-id="'+id+'" '+(profile.gold<def.shop||profile.items.length>=400?'disabled':'')+'>Buy · '+def.shop+' gold</button>';
   html+=itemCard({defId:id,id:'shop-'+id},action);
  }
  return html;
 }
 function renderDrops(){
  const boss=BOSSES[dropBoss],table=bossDropTable(dropBoss);
  const weight=table.reduce((a,x)=>a+x.weight,0);
  let html='<div class="workshop-intro"><h3>Boss Drop Tables</h3><p>Every victory awards XP, gold and exactly one item from that boss. Drop rates are per victory.</p></div>';
  html+='<label for="dropBoss">Choose a boss</label><select id="dropBoss" class="hero-select">'+Object.values(BOSSES).map(b=>'<option value="'+b.id+'" '+(b.id===dropBoss?'selected':'')+'>'+esc(b.name)+(canChallenge(profile,b.id)?'':' · Unlock level '+b.unlock)+'</option>').join('')+'</select>';
  html+='<div class="pack-stats"><span>'+esc(boss.place)+'</span><b>+'+boss.xp+' XP · '+boss.gold+' gold</b></div>';
  html+='<p class="workshop-disclaimer">'+esc(boss.mechanics)+'</p>';
  for(const entry of table){
   const def=ITEM_DEFS[entry.id],prob=entry.weight/weight*100;
   html+='<article class="drop-row"><span class="loot-icon">'+esc(def.icon)+'</span><div><strong>'+esc(def.name)+'</strong><small>'+esc(def.rarity)+' · '+esc(slotTitle[def.slot])+' · '+esc(itemBonusText(def))+'</small></div><b>'+prob.toFixed(prob<10?1:0)+'%</b></article>';
  }
  html+='<p class="workshop-disclaimer">Rates are transparent and independent per win. All equipment is local to this browser; online ownership and trading remain future features.</p>';
  return html;
 }
 function render(){
  title.textContent='The Emberguard · '+tabNames[current];
  for(const tab of tabs.querySelectorAll('button[data-tab]')){tab.classList.toggle('selected',tab.dataset.tab===current);tab.setAttribute('aria-pressed',String(tab.dataset.tab===current));}
  document.getElementById('goldTotal').textContent=profile.gold+' gold';
  document.getElementById('bagCount').textContent=String(profile.items.length);
  body.innerHTML=current==='heroes'?renderHeroes():current==='pack'?renderPack():current==='shop'?renderShop():renderDrops();
 }
 function save(){
  pendingSell=null;
  const success=writeProfile(storage,profile);
  root.classList.toggle('dirty',!success);
  onChange(profile);render();
 }
 function open(tab='heroes',selected='knight'){
  if(!root.classList.contains('hidden'))return;
  if(tabNames[tab])current=tab;
  if(HERO_IDS.includes(selected))heroId=selected;
  pendingSell=null;
  root.classList.remove('hidden');render();onOpen();
  root.querySelector('#workshopClose').focus();
 }
 function close(){
  if(root.classList.contains('hidden'))return;
  root.classList.add('hidden');pendingSell=null;onClose();
 }
 tabs.addEventListener('click',e=>{const tab=e.target.closest('button[data-tab]')?.dataset.tab;if(tabNames[tab]){current=tab;pendingSell=null;render();}});
 root.querySelector('#workshopClose').addEventListener('click',close);
 root.addEventListener('click',e=>{if(e.target===root)close();});
 root.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 body.addEventListener('change',e=>{
  if(e.target.id==='equipHero'&&HERO_IDS.includes(e.target.value)){heroId=e.target.value;render();}
  if(e.target.id==='dropBoss'&&Object.hasOwn(BOSSES,e.target.value)){dropBoss=e.target.value;render();}
 });
 body.addEventListener('click',e=>{
  const btn=e.target.closest('button[data-action]');if(!btn||btn.disabled)return;
  const action=btn.dataset.action,id=btn.dataset.id,slot=btn.dataset.slot;
  if(action==='hero'&&HERO_IDS.includes(id)){heroId=id;render();return;}
  if(action==='tab'&&tabNames[btn.dataset.tab]){current=btn.dataset.tab;render();return;}
  if(action==='talent'){if(chooseTalent(profile,heroId,id))save();return;}
  if(action==='equip'){if(equip(profile,heroId,id))save();return;}
  if(action==='unequip'){if(unequip(profile,heroId,slot))save();return;}
  if(action==='buy'){if(buy(profile,id))save();return;}
  if(action==='sell'){
   if(pendingSell!==id){pendingSell=id;render();return;}
   if(sell(profile,id))save();
  }
 });
 return {open,close,render,selectHero(id){if(HERO_IDS.includes(id))heroId=id;},isOpen:()=>!root.classList.contains('hidden')};
}
