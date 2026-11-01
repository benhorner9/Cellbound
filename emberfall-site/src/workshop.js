import {
 HERO_IDS,HERO_NAMES,ITEM_DEFS,TALENTS,SLOTS,QUARTERMASTER,DROP_TABLE,MAX_LEVEL,BOSSES,bossDropTable,canChallenge,
 xpNeeded,talentPoints,itemOwner,chooseTalent,equip,unequip,sell,buy,itemBonusText,writeProfile,setProgress,SET_DEFS,itemSet
} from './progression.js?v=4.1.0';
import {
 readBuilds,writeBuilds,saveBuild,buildStatus,applyBuild,compareItem,itemDetails,deltaLabel,
 exportBackup,inspectBackup,restoreBackup
} from './builds.js?v=4.1.0';

// Pure DOM: no canvas dependencies. The workshop is local-only and never implies online ownership.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const pretty={knight:'Guardian',ranger:'Ranger',mage:'Arcanist',cleric:'Cleric'};
const slotTitle={weapon:'Weapon',armour:'Armour',charm:'Charm'};
const rarityClass=name=>String(name).toLowerCase();
export function mountWorkshop({profile,storage,onOpen=()=>{},onClose=()=>{},onChange=()=>{}}){
 const root=document.getElementById('workshop'),body=document.getElementById('workshopBody'),
 title=document.getElementById('workshopHeading'),tabs=document.getElementById('workshopTabs');
 let current='heroes',heroId='knight',pendingSell=null,dropBoss='thornwarden',detailsId=null,selectedBagId=null,bagFilter='all',notice='',noticeBad=false,importText='',validatedImport=null,importConfirm=false;
 const builds=readBuilds(storage);
 const tabNames={heroes:'Heroes & Talents',pack:'Equipment Bag',shop:'Quartermaster',loot:'Boss Drops',backup:'Save Backup'};
 function itemName(itemId){
  const inst=profile.items.find(x=>x.id===itemId);return inst?ITEM_DEFS[inst.defId]:null;
 }
 function itemCard(item,actions=''){
  const def=ITEM_DEFS[item.defId],owner=itemOwner(profile,item.id);
  return '<article class="loot-card rarity-'+rarityClass(def.rarity)+'"><span class="loot-icon">'+esc(def.icon)+'</span>'
   +'<div class="loot-content"><div class="loot-top"><strong>'+esc(def.name)+'</strong><span class="rarity">'+esc(def.rarity)+'</span></div>'
   +'<span class="item-type">'+esc(slotTitle[def.slot])+(def.classes?' · '+def.classes.map(x=>pretty[x]).join(', '):' · Any hero')+'</span>'
   +'<small class="item-effects">'+esc(itemBonusText(def))+'</small>'
   +(itemSet(item.defId)?'<small class="item-set-tag">'+esc(SET_DEFS[itemSet(item.defId)].icon+' '+SET_DEFS[itemSet(item.defId)].name)+' set</small>':'')
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
  html+='<div class="workshop-subheading"><h3>Collection Bonuses</h3><span>2- and 3-piece sets</span></div>';
  html+='<div class="set-overview">'+setProgress(profile,heroId).map(group=>{
   const data=SET_DEFS[group.id];
   const next=group.next;
   const status=group.count>=3?'✦ Full set active':group.count>=2?'✓ 2-piece active · 1 more for 3-piece':'Collect '+Math.max(0,2-group.count)+' more to activate';
   return '<article class="set-summary '+(group.count>=2?'active':'')+'"><div><b>'+esc(data.icon+' '+data.name)+'</b><small>'+group.count+'/3 equipped · '+status+'</small></div><div class="set-bonuses"><small class="'+(group.count>=2?'active':'')+'">2 pieces: '+esc(itemBonusText({bonus:data.pieces2}))+'</small><small class="'+(group.count>=3?'active':'')+'">3 pieces: '+esc(itemBonusText({bonus:data.pieces3}))+'</small></div></article>';
  }).join('')+'</div>';
  html+='<div class="workshop-subheading"><h3>Saved Equipment Builds</h3><span>3 per hero</span></div>';
  html+='<p class="build-explainer">Save your current items as a build. Builds remember real items, not extra copies. Applying a build does not steal equipment from another hero.</p>';
  html+='<div class="build-grid">'+builds.heroes[heroId].map((preset,index)=>{
   const status=buildStatus(profile,builds,heroId,index);
   const name=preset?preset.name:'Empty Build '+(index+1);
   const preview=preset?SLOTS.map(slot=>{const inst=profile.items.find(it=>it.id===preset.gear[slot]);return inst?ITEM_DEFS[inst.defId].icon:(preset.gear[slot]?'×':'—');}).join('  '):'—  —  —';
   return '<article class="build-preset"><div><b>'+esc(name)+'</b><small>'+esc(preview)+'</small></div><label class="build-label">Build name<input class="build-name-input" data-build-name="'+index+'" maxlength="30" value="'+esc(preset?.name||'Build '+(index+1))+'" aria-label="Name equipment build '+(index+1)+'"></label><p class="'+(preset&&!status.ok?'unavailable':'')+'">'+esc(status.reason)+'</p><div class="build-buttons"><button type="button" class="tiny-btn" data-action="save-build" data-index="'+index+'">'+(preset?'Update Saved Build':'Save Current Gear')+'</button><button type="button" class="tiny-btn ghost" data-action="apply-build" data-index="'+index+'" '+(status.ok?'':'disabled')+'>Equip Build</button></div></article>';
  }).join('')+'</div>';

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
 function renderInspection(itemId,defId,persistent=false){
  const info=itemDetails(defId);if(!info)return '';
  const comparison=itemId&&profile.items.some(x=>x.id===itemId)?compareItem(profile,heroId,itemId):null;
  let html='<section class="item-inspector" id="itemInspector"><div class="inspection-head"><span class="inspection-icon">'+esc(info.icon)+'</span><div><span class="eyebrow">EXAMINE EQUIPMENT</span><h3>'+esc(info.name)+'</h3><small>'+esc(info.rarity+' · '+slotTitle[info.slot])+(info.setName?' · '+esc(info.setName):'')+'</small></div>'+(persistent?'':'<button class="tiny-btn ghost" type="button" data-action="close-inspect">Close</button>')+'</div><p class="inspection-flavour">'+esc(info.flavour)+'</p>';
  html+='<p class="inspection-line"><b>Base bonuses:</b> '+esc(info.bonus)+'</p>';
  html+='<p class="inspection-line"><b>Where to find:</b> '+esc(info.sources.length?info.sources.map(x=>x.name+' ('+x.rate+'% per victory)').join(' · '):info.shop?'Quartermaster · '+info.shop+' gold':'Found in the world')+'</p>';
  if(comparison){
   if(!comparison.eligible)html+='<div class="compare-warning">'+esc(comparison.reason)+'</div>';
   else{
    const old=comparison.currentDef?ITEM_DEFS[comparison.currentDef].name:'Empty slot';
    html+='<div class="inspection-compare"><strong>Comparing for '+esc(HERO_NAMES[heroId])+'</strong><small>Current: '+esc(old)+' → '+esc(info.name)+'</small>';
    html+='<div class="compare-changes">'+(comparison.differences.length?comparison.differences.map(d=>'<span class="stat-delta '+(d.delta>0?'up':'down')+'">'+esc(deltaLabel(d.key,d.delta))+'</span>').join(''):'<span class="stat-delta">No combat stat change</span>')+'</div>';
    html+='<small>Includes set effects and character bonuses; new gear applies to the next boss encounter.</small>';
    if(comparison.owner&&comparison.owner!==heroId)html+='<small class="compare-warning">Equipped by '+esc(HERO_NAMES[comparison.owner])+'. Equipping it here will transfer that one item.</small>';
    html+='</div>';
   }
  }
  return html+'</section>';
 }
  function renderPack(){
  const all=profile.items.slice().reverse();
  const visible=all.filter(item=>{
   if(bagFilter==='all')return true;
   if(bagFilter==='unequipped')return !itemOwner(profile,item.id);
   return ITEM_DEFS[item.defId].slot===bagFilter;
  });
  const selected=visible.find(item=>item.id===selectedBagId)||visible[0]||null;
  selectedBagId=selected?.id||null;
  const owner=selected?itemOwner(profile,selected.id):null;
  const def=selected?ITEM_DEFS[selected.defId]:null;
  const allowed=def&&(!def.classes||def.classes.includes(heroId));
  let html='<div class="workshop-intro inventory-intro"><h3>Equipment Bag</h3><p>Choose an item on the left. Details, comparisons and actions stay open on the right. Gear is always a unique item, even when equipped.</p></div>';
  html+='<div class="inventory-layout"><section class="inventory-collection" aria-label="Inventory slots">'
   +'<div class="inventory-section-head"><div><span class="eyebrow">STORAGE</span><h3>Your Bag</h3></div><span class="inventory-capacity">'+profile.items.length+' / 400</span></div>'
   +'<div class="inventory-filters"><label for="bagFilter">Show items</label><select id="bagFilter" aria-label="Filter inventory items">'
   +[['all','All gear'],['weapon','Weapons'],['armour','Armour'],['charm','Charms'],['unequipped','Unequipped']].map(([value,name])=>'<option value="'+value+'" '+(bagFilter===value?'selected':'')+'>'+name+'</option>').join('')
   +'</select><span class="inventory-gold">'+profile.gold+' gold</span></div>'
   +'<div class="inventory-slot-scroll" id="inventoryScroll" tabindex="0" role="region" aria-label="Scrollable inventory">'
   +'<div class="inventory-slot-grid" id="inventoryGrid">';
  for(const item of visible){
   const itemDef=ITEM_DEFS[item.defId],equippedBy=itemOwner(profile,item.id),active=item.id===selectedBagId;
   html+='<button type="button" class="inventory-slot rarity-'+rarityClass(itemDef.rarity)+(active?' is-selected':'')+'" data-action="inspect" data-id="'+esc(item.id)+'" title="'+esc(itemDef.name)+'" aria-label="'+esc(itemDef.name+', '+itemDef.rarity+(equippedBy?', equipped by '+HERO_NAMES[equippedBy]:', in bag'))+'" aria-pressed="'+active+'">'
    +'<span class="inventory-slot-icon" aria-hidden="true">'+esc(itemDef.icon)+'</span>'
    +(equippedBy?'<span class="inventory-equipped-marker" aria-hidden="true">E</span>':'')
    +'</button>';
  }
  for(let empty=0;empty<Math.max(0,24-visible.length);empty++)html+='<span class="inventory-slot inventory-slot-empty" aria-hidden="true"></span>';
  html+='</div></div>';
  if(!profile.items.length)html+='<p class="inventory-empty-note">Your bag is empty. Earn gear from a boss or visit the Quartermaster.</p>';
  else if(!visible.length)html+='<p class="inventory-empty-note">No items match this filter.</p>';
  html+='</section><aside class="inventory-detail-panel" aria-label="Selected item details and actions">'
   +'<div class="inventory-detail-top"><div><span class="eyebrow">ITEM DETAILS</span><h3>Inspect &amp; equip</h3></div></div>'
   +'<label class="inventory-hero-label" for="equipHero">Managing equipment for</label>'
   +'<select id="equipHero" class="hero-select">'+HERO_IDS.map(id=>'<option value="'+id+'" '+(id===heroId?'selected':'')+'>'+esc(HERO_NAMES[id])+' · '+pretty[id]+'</option>').join('')+'</select>';
  if(selected&&def){
   html+=renderInspection(selected.id,selected.defId,true);
   html+='<div class="inventory-item-owner">'+(owner?'Equipped by '+esc(HERO_NAMES[owner]):'In your bag · Not equipped')+' · Sell value '+def.value+' gold</div>';
   html+='<div class="inventory-actions"><h4>Item actions</h4>';
   if(owner===heroId)html+='<button type="button" class="tiny-btn inventory-action-primary" data-action="unequip" data-slot="'+def.slot+'">Unequip from '+esc(HERO_NAMES[heroId])+'</button>';
   else html+='<button type="button" class="tiny-btn inventory-action-primary" data-action="equip" data-id="'+esc(selected.id)+'" '+(allowed?'':'disabled')+'>'+(allowed?(owner?'Transfer to ':'Equip on ')+esc(HERO_NAMES[heroId]):'Not usable by this hero')+'</button>';
   html+='<button type="button" class="tiny-btn ghost danger" data-action="sell" data-id="'+esc(selected.id)+'" '+(owner?'disabled':'')+'>'+(owner?'Unequip before selling':pendingSell===selected.id?'Confirm sale for '+def.value+' gold':'Sell for '+def.value+' gold')+'</button>';
   html+='</div><p class="inventory-detail-note">Equipped gear stays in your collection and is never duplicated. Gear changes apply to your next encounter.</p>';
  }else html+='<div class="inventory-no-selection"><span aria-hidden="true">✦</span><h4>No item selected</h4><p>Choose a bag slot or adjust your filter to inspect an item and see its actions.</p></div>';
  return html+'</aside></div>';
 }
 function renderShop(){
  let html='<div class="workshop-intro"><h3>Quartermaster</h3><p>Buy inexpensive starter equipment using gold earned from bosses. Everything here is a fixed, local NPC offer—not another player’s listing.</p></div><div class="pack-stats"><span>Gold available</span><b>'+profile.gold+'</b></div>';
  for(const id of QUARTERMASTER){
   const def=ITEM_DEFS[id];
   const action='<button type="button" class="tiny-btn" data-action="buy" data-id="'+id+'" '+(profile.gold<def.shop||profile.items.length>=400?'disabled':'')+'>Buy · '+def.shop+' gold</button>';
   html+=itemCard({defId:id,id:'shop-'+id},action+'<button type="button" class="tiny-btn ghost" data-action="inspect" data-id="shop-'+id+'">Examine</button>');
  }
  if(detailsId?.startsWith('shop-'))html+=renderInspection(null,detailsId.slice(5));
  return html;
 }
 function renderDrops(){
  const boss=BOSSES[dropBoss],table=bossDropTable(dropBoss);
  const weight=table.reduce((a,x)=>a+x.weight,0);
  let html='<div class="workshop-intro"><h3>Boss Drop Tables</h3><p>Every victory awards XP, gold and exactly one item from that boss. Drop rates are per victory.</p></div>';
  html+='<label for="dropBoss">Choose a boss</label><select id="dropBoss" class="hero-select">'+Object.values(BOSSES).map(b=>'<option value="'+b.id+'" '+(b.id===dropBoss?'selected':'')+'>'+esc(b.name)+' · Recommended Lv '+b.unlock+'</option>').join('')+'</select>';
  html+='<div class="pack-stats"><span>'+esc(boss.place)+'</span><b>+'+boss.xp+' XP · '+boss.gold+' gold</b></div>';
  html+='<p class="workshop-disclaimer">'+esc(boss.mechanics)+'</p>';
  for(const entry of table){
   const def=ITEM_DEFS[entry.id],prob=entry.weight/weight*100;
   html+='<article class="drop-row"><span class="loot-icon">'+esc(def.icon)+'</span><div><strong>'+esc(def.name)+'</strong><small>'+esc(def.rarity)+' · '+esc(slotTitle[def.slot])+' · '+esc(itemBonusText(def))+'</small><button class="tiny-btn ghost" type="button" data-action="inspect" data-id="drop-'+entry.id+'">Examine</button></div><b>'+prob.toFixed(prob<10?1:0)+'%</b></article>';
  }
  if(detailsId?.startsWith('drop-'))html+=renderInspection(null,detailsId.slice(5));
  html+='<p class="workshop-disclaimer">Rates are transparent and independent per win. All equipment is local to this browser; online ownership and trading remain future features.</p>';
  return html;
 }
 function renderBackup(){
  let backup='';
  try{backup=exportBackup(profile,builds);}catch{backup='Unable to export invalid save';}
  let html='<div class="workshop-intro"><h3>Keep Your Heroes Safe</h3><p>Progress is currently saved only on this device. Download a JSON backup before clearing Safari data or changing iPads. Backups preserve gold, levels, talents, real item IDs, equipment and saved builds.</p></div>';
  html+='<div class="backup-section"><div class="workshop-subheading"><h3>Export your current progress</h3><span>v1 profile compatible</span></div>';
  html+='<div class="backup-actions"><button type="button" class="tiny-btn" data-action="download-backup">↓ Download Backup JSON</button><button type="button" class="tiny-btn ghost" data-action="copy-backup">Copy Backup Text</button></div>';
  html+='<label class="backup-label" for="backupExport">Backup JSON (select and copy manually if needed)</label><textarea id="backupExport" class="backup-text" readonly rows="3">'+esc(backup)+'</textarea>';
  html+='<small class="workshop-disclaimer">Keep this file private. It represents your local game save, not a secure online account or tradeable inventory.</small></div>';
  html+='<div class="backup-section"><div class="workshop-subheading"><h3>Restore a previous backup</h3><span>Requires confirmation</span></div>';
  html+='<label class="backup-label" for="backupImport">Paste your earlier Emberfall JSON backup</label>';
  html+='<textarea id="backupImport" class="backup-text" rows="5" placeholder="Paste the backup JSON here. It will not replace your current progress until you confirm.">'+esc(importText)+'</textarea>';
  html+='<div class="backup-actions"><button type="button" class="tiny-btn" data-action="check-backup">1. Check Backup</button>';
  if(validatedImport){
   const d=validatedImport.summary;
   html+='<div class="backup-preview"><b>Backup checked ✓</b><span>'+d.items+' items · '+d.gold+' gold · '+d.wins+' wins</span><small>Heroes: '+Object.entries(d.levels).map(([id,lv])=>esc(HERO_NAMES[id])+' Lv'+lv).join(' · ')+'</small></div>';
   html+='<button type="button" class="tiny-btn danger" data-action="restore-backup">'+(importConfirm?'Confirm Restore — Replace My Current Save':'2. Restore Checked Backup')+'</button>';
  }
  html+='</div><p class="workshop-disclaimer">Restoring replaces your local company and saved builds after a second confirmation. Existing game saves are validated first; outdated plain company-v1 JSON can also be imported. No cloud sync is available.</p></div>';
  return html;
 }
 function render(){
  title.textContent='The Emberguard · '+tabNames[current];
  for(const tab of tabs.querySelectorAll('button[data-tab]')){tab.classList.toggle('selected',tab.dataset.tab===current);tab.setAttribute('aria-pressed',String(tab.dataset.tab===current));}
  document.getElementById('goldTotal').textContent=profile.gold+' gold';
  document.getElementById('bagCount').textContent=String(profile.items.length);
  body.classList.toggle('inventory-mode',current==='pack');
  body.innerHTML=(notice?'<div class="workshop-notice '+(noticeBad?'is-error':'')+'" role="status">'+esc(notice)+'</div>':'')
    +(current==='heroes'?renderHeroes():current==='pack'?renderPack():current==='shop'?renderShop():current==='loot'?renderDrops():renderBackup());
 }
 function rerenderBag(){
  const offset=body.querySelector('#inventoryScroll')?.scrollTop||0;
  render();
  const next=body.querySelector('#inventoryScroll');if(next)next.scrollTop=offset;
 }
 function save(){
  pendingSell=null;
  const success=writeProfile(storage,profile);
  root.classList.toggle('dirty',!success);
  onChange(profile);rerenderBag();
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
 tabs.addEventListener('click',e=>{const tab=e.target.closest('button[data-tab]')?.dataset.tab;if(tabNames[tab]){current=tab;pendingSell=null;notice='';detailsId=null;importConfirm=false;render();}});
 root.querySelector('#workshopClose').addEventListener('click',close);
 root.addEventListener('click',e=>{if(e.target===root)close();});
 root.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 body.addEventListener('input',e=>{
  if(e.target.id==='backupImport'){importText=e.target.value;validatedImport=null;importConfirm=false;notice='';}
 });
 body.addEventListener('change',e=>{
  if(e.target.id==='equipHero'&&HERO_IDS.includes(e.target.value)){heroId=e.target.value;pendingSell=null;rerenderBag();}
  if(e.target.id==='bagFilter'&&['all','weapon','armour','charm','unequipped'].includes(e.target.value)){bagFilter=e.target.value;pendingSell=null;selectedBagId=null;rerenderBag();}
  if(e.target.id==='dropBoss'&&Object.hasOwn(BOSSES,e.target.value)){dropBoss=e.target.value;render();}
 });
 body.addEventListener('click',e=>{
  const btn=e.target.closest('button[data-action]');if(!btn||btn.disabled)return;
  const action=btn.dataset.action,id=btn.dataset.id,slot=btn.dataset.slot;
  if(action==='inspect'){
   if(current==='pack'){
    selectedBagId=id;pendingSell=null;notice='';rerenderBag();
   }else{
    detailsId=id;notice='';render();
    body.querySelector('#itemInspector')?.scrollIntoView({block:'nearest',behavior:'instant'});
   }
   return;
  }
  if(action==='close-inspect'){detailsId=null;render();return;}
  if(action==='save-build'){
   const index=Number(btn.dataset.index);
   const old=structuredClone(builds.heroes[heroId][index]??null);
   const name=body.querySelector('[data-build-name="'+index+'"]')?.value||'Build '+(index+1);
   if(!saveBuild(profile,builds,heroId,index,name)){notice='Could not save this equipment build.';noticeBad=true;render();return;}
   if(!writeBuilds(storage,builds)){builds.heroes[heroId][index]=old;notice='Browser storage refused the build. Your previous build was kept.';noticeBad=true;}
   else {notice=HERO_NAMES[heroId]+' build '+(index+1)+' saved. No items were copied.';noticeBad=false;}
   render();return;
  }
  if(action==='apply-build'){
   const index=Number(btn.dataset.index),previous={...profile.heroes[heroId].gear};
   const result=applyBuild(profile,builds,heroId,index);
   if(!result.ok){notice=result.reason;noticeBad=true;render();return;}
   if(!writeProfile(storage,profile)){profile.heroes[heroId].gear=previous;notice='Storage refused the change. Current equipment was kept.';noticeBad=true;}
   else{notice='Equipped '+HERO_NAMES[heroId]+' build '+(index+1)+'. Effects apply next fight.';noticeBad=false;onChange(profile);}
   render();return;
  }
  if(action==='download-backup'){
   try{
    const contents=exportBackup(profile,builds);
    const objectUrl=URL.createObjectURL(new Blob([contents],{type:'application/json'}));
    const a=document.createElement('a');a.href=objectUrl;a.download='emberfall-company-backup.json';a.style.display='none';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),5000);
    notice='Backup prepared for download. Save it in Files or somewhere safe.';noticeBad=false;
   }catch{notice='Could not produce a valid backup.';noticeBad=true;}
   render();return;
  }
  if(action==='copy-backup'){
   const output=body.querySelector('#backupExport'),text=output?.value||'';
   if(!text){notice='No backup is available.';noticeBad=true;render();return;}
   if(navigator.clipboard?.writeText){
    navigator.clipboard.writeText(text).then(()=>{notice='Backup copied to clipboard.';noticeBad=false;render();}).catch(()=>{
     output.focus();output.select();notice='Clipboard unavailable. The backup text is selected for manual copying.';noticeBad=true;
    });
   }else{output.focus();output.select();notice='Backup text selected for manual copying.';noticeBad=false;}
   return;
  }
  if(action==='check-backup'){
   try{
    importText=body.querySelector('#backupImport')?.value||'';
    validatedImport=inspectBackup(importText);importConfirm=false;
    notice=validatedImport.legacy?'Valid older company save found. It contains no build presets.':'Valid complete save found. Review the summary before restoring.';
    noticeBad=false;
   }catch(e){validatedImport=null;importConfirm=false;notice=e.message;noticeBad=true;}
   render();return;
  }
  if(action==='restore-backup'){
   if(!validatedImport){notice='Check the JSON backup first.';noticeBad=true;render();return;}
   if(!importConfirm){importConfirm=true;notice='Final confirmation: this will replace the company saved on this device. Export your current save first.';noticeBad=true;render();return;}
   const status=restoreBackup(storage,profile,builds,validatedImport);
   notice=status.reason;noticeBad=!status.ok;
   if(status.ok){validatedImport=null;importText='';importConfirm=false;onChange(profile);}
   render();return;
  }
  if(action==='hero'&&HERO_IDS.includes(id)){heroId=id;render();return;}
  if(action==='tab'&&tabNames[btn.dataset.tab]){current=btn.dataset.tab;notice='';detailsId=null;render();return;}
  if(action==='talent'){if(chooseTalent(profile,heroId,id))save();return;}
  if(action==='equip'){if(equip(profile,heroId,id))save();return;}
  if(action==='unequip'){if(unequip(profile,heroId,slot))save();return;}
  if(action==='buy'){if(buy(profile,id))save();return;}
  if(action==='sell'){
   if(pendingSell!==id){pendingSell=id;rerenderBag();return;}
   if(sell(profile,id)){if(selectedBagId===id)selectedBagId=null;save();}
  }
 });
 return {open,close,render,selectHero(id){if(HERO_IDS.includes(id))heroId=id;},isOpen:()=>!root.classList.contains('hidden')};
}
