import {
 HERO_IDS,HERO_NAMES,ITEM_DEFS,TALENTS,PARTY_ROLES,PARTY_SIZE,TALENT_RESPEC_COST,partyOrder,swapPartyMembers,respecTalents,SLOTS,SLOT_NAMES,SLOT_ICONS,QUARTERMASTER,DROP_TABLE,MAX_LEVEL,BOSSES,bossDropTable,canChallenge,
 xpNeeded,talentPoints,itemOwner,chooseTalent,equip,unequip,sell,buy,itemBonusText,writeProfile,setProgress,SET_DEFS,itemSet,SKILL_CAP,SKILL_IDS,skillXpNeeded,CRAFT_RECIPES,FUTURE_CRAFTS,MATERIAL_DEFS,ALCHEMY_EFFECTS,craftingStatus,craftRecipe,prepareElixir
} from './progression.js?v=4.9.1';
import {
 readBuilds,writeBuilds,saveBuild,buildStatus,applyBuild,compareItem,itemDetails,deltaLabel,
 exportBackup,inspectBackup,restoreBackup
} from './builds.js?v=4.9.1';

// Pure DOM: no canvas dependencies. The workshop is local-only and never implies online ownership.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const pretty={knight:'Guardian',ranger:'Ranger',mage:'Arcanist',cleric:'Cleric'};
const slotTitle=SLOT_NAMES;
const rarityClass=name=>String(name).toLowerCase();
export function mountWorkshop({profile,storage,onOpen=()=>{},onClose=()=>{},onChange=()=>{}}){
 const root=document.getElementById('workshop'),body=document.getElementById('workshopBody'),
 title=document.getElementById('workshopHeading'),context=document.getElementById('workshopContext'),tabs=document.getElementById('workshopTabs');
 let returnFocus=null;
 let current='heroes',heroId='knight',partyPosition=0,selectedTalentId=null,confirmSpendId=null,confirmRespec=false,pendingSell=null,dropBoss='thornwarden',detailsId=null,selectedBagId=null,equipTarget=null,equipmentSlot=null,bagFilter='all',notice='',noticeBad=false,importText='',validatedImport=null,importConfirm=false,craftSkill='smithing',craftRecipeId=null,craftStage='idle',craftStartedAt=0,craftMix=[];
 const builds=readBuilds(storage);
 const tabNames={party:'Party',heroes:'Heroes & Gear',talents:'Talent Trees',pack:'Equipment Bag',craft:'Crafting',shop:'Quartermaster',loot:'Boss Drops',backup:'Save Backup'};
 const tabId=tab=>'workshopTab-'+tab;
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
 // Original lightweight vector hero illustration: visual only, never affects item ownership.
 function equipmentCharacterArt(id){
  const palette={
   knight:{cloth:'#305b77',light:'#a4c4d1',dark:'#1d374b',glow:'#86cbe7',metal:'#b2c2c3'},
   ranger:{cloth:'#476f48',light:'#9bb589',dark:'#243a30',glow:'#a7d991',metal:'#adbbb0'},
   mage:{cloth:'#584b91',light:'#bc9cdd',dark:'#27244e',glow:'#c4a6ff',metal:'#bac5d7'},
   cleric:{cloth:'#8b713e',light:'#f0d6a2',dark:'#424238',glow:'#e2d68d',metal:'#c2ced0'}
  }[id]||{cloth:'#456675',light:'#c2ccdc',dark:'#252f42',glow:'#d9c693',metal:'#aabfc5'};
  const gradient='emberfall-gear-'+id,accent=palette.glow;
  const crest={knight:'◆',ranger:'❧',mage:'✧',cleric:'✚'}[id]||'✦';
  return '<svg class="equipment-character-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 365" aria-hidden="true">'
   +'<defs><linearGradient id="'+gradient+'-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+palette.light+'"/><stop offset=".43" stop-color="'+palette.metal+'"/><stop offset="1" stop-color="'+palette.dark+'"/></linearGradient>'
   +'<linearGradient id="'+gradient+'-cloth" x1="0" y1="0" x2=".4" y2="1"><stop stop-color="'+palette.cloth+'"/><stop offset="1" stop-color="'+palette.dark+'"/></linearGradient>'
   +'<radialGradient id="'+gradient+'-aura"><stop stop-color="'+accent+'" stop-opacity=".35"/><stop offset="1" stop-color="'+accent+'" stop-opacity="0"/></radialGradient></defs>'
   +'<ellipse cx="130" cy="183" rx="116" ry="172" fill="url(#'+gradient+'-aura)"/>'
   +'<path d="M91 108Q61 129 48 234L39 323Q94 347 132 339Q173 351 219 320L208 231Q201 129 171 107Z" fill="url(#'+gradient+'-cloth)" stroke="'+palette.light+'" stroke-opacity=".48" stroke-width="2"/>'
   +'<path d="M102 208L92 316L118 327L132 226L145 329L174 318L158 208Z" fill="'+palette.dark+'" stroke="'+palette.metal+'" stroke-width="3"/>'
   +'<path d="M89 306L115 309L118 338Q114 352 81 349L82 335Z M147 309L177 307L181 336Q188 350 151 349L143 337Z" fill="#273039" stroke="'+palette.metal+'" stroke-width="3"/>'
   +'<path d="M89 111L70 136L59 212L72 223L94 172L109 127Z M168 111L190 140L205 213L189 226L163 166L150 127Z" fill="url(#'+gradient+'-metal)" stroke="#273136" stroke-width="3"/>'
   +'<path d="M72 212L86 220L75 245L59 235Z M189 217L203 208L214 233L195 245Z" fill="'+palette.dark+'" stroke="'+palette.metal+'" stroke-width="3"/>'
   +'<path d="M94 109Q123 96 164 109L182 180L158 218L100 218L77 181Z" fill="url(#'+gradient+'-metal)" stroke="#182c35" stroke-width="4"/>'
   +'<path d="M108 128L152 127L160 173L131 198L99 176Z" fill="url(#'+gradient+'-cloth)" stroke="'+palette.light+'" stroke-width="3"/>'
   +'<path d="M88 182L174 182L164 203L93 203Z" fill="#27383b" stroke="'+palette.metal+'" stroke-width="3"/>'
   +'<path d="M106 208L157 208L162 227L100 227Z" fill="'+palette.dark+'" stroke="'+palette.light+'" stroke-width="2"/>'
   +'<path d="M91 109L61 135L67 154L104 134Z M167 108L199 135L190 158L156 133Z" fill="url(#'+gradient+'-metal)" stroke="'+accent+'" stroke-opacity=".65" stroke-width="2"/>'
   +'<path d="M116 91L116 114Q130 126 145 114L145 90Z" fill="#b58c76" stroke="#493e3c" stroke-width="2"/>'
   +'<ellipse cx="130" cy="66" rx="30" ry="37" fill="#d6ad8b" stroke="#67554e" stroke-width="2"/>'
   +'<path d="M98 60Q97 18 128 22Q164 19 161 61L153 42L140 38L132 25L114 44L103 48Z" fill="'+palette.dark+'" stroke="'+palette.metal+'" stroke-width="3"/>'
   +'<path d="M109 67L118 65 M142 65L151 67" stroke="#343139" stroke-width="4" stroke-linecap="round"/>'
   +'<path d="M123 86Q131 90 138 86" stroke="#845c52" stroke-width="2" fill="none"/>'
   +'<path d="M128 145L143 161L131 183L117 161Z" fill="'+accent+'" stroke="#e9daae" stroke-width="2"/>'
   +'<path d="M130 128V145" stroke="'+accent+'" stroke-width="2" stroke-opacity=".75"/>'
   +'<text x="130" y="171" font-size="19" font-weight="bold" text-anchor="middle" fill="#ffffff">'+crest+'</text>'
   +'<circle cx="130" cy="334" r="2" fill="'+accent+'" opacity=".8"/>'
   +'</svg>';
 }
 function renderHeroes(){
  const hero=profile.heroes[heroId],level=hero.level,need=xpNeeded(level);
  let html='<div class="hero-picker">'+HERO_IDS.map(id=>'<button type="button" class="hero-picker-btn '+(id===heroId?'active':'')+'" data-action="hero" data-id="'+id+'">'+esc(HERO_NAMES[id])+'<small>Lv '+profile.heroes[id].level+'</small></button>').join('')+'</div>';
  html+='<div class="progress-hero"><div><span class="eyebrow">YOUR '+esc(pretty[heroId]).toUpperCase()+'</span><h3>'+esc(HERO_NAMES[heroId])+' <span>Level '+level+'</span></h3><p>Earn XP by defeating bosses. Talent choices improve your abilities in real combat.</p></div><div class="progress-stat">'+(need?hero.xp+' / '+need+' XP':'MAX LEVEL')+'</div></div>';
  html+='<div class="xp-track"><i style="width:'+(need?Math.min(100,Math.floor(hero.xp/need*100)):100)+'%"></i></div>';
  html+='<div class="workshop-subheading"><h3>Hero Equipment</h3><span>9 worn slots · '+esc(HERO_NAMES[heroId])+'</span></div>';
  const inspectedSlot=SLOTS.includes(equipmentSlot)?equipmentSlot:(SLOTS.find(slot=>hero.gear[slot])||'weapon');
  const inspectedId=hero.gear[inspectedSlot],inspectedInstance=inspectedId?profile.items.find(item=>item.id===inspectedId):null;
  const inspectedDef=inspectedInstance?ITEM_DEFS[inspectedInstance.defId]:null,inspectedInfo=inspectedInstance?itemDetails(inspectedInstance.defId):null;
  html+='<div class="equipment-paperdoll equipment-armory" data-armory-hero="'+heroId+'" aria-label="'+esc(HERO_NAMES[heroId])+' equipment on a character silhouette">'
   +'<div class="armory-titlebar"><span>EMBERGUARD · CHARACTER ARMORY</span><strong>'+esc(HERO_NAMES[heroId])+'</strong><small>Level '+level+' '+esc(pretty[heroId])+'</small></div>'
   +'<div class="armory-stage"><div class="armory-rune" aria-hidden="true">✦</div>'
   +'<div class="equipment-figure">'+equipmentCharacterArt(heroId)+'</div>'
   +'<div class="armory-hero-label"><strong>'+esc(HERO_NAMES[heroId])+'</strong><small>'+esc(pretty[heroId])+' · Level '+level+'</small></div>';
  // Nine real equipment slots; legacy Charm and Armour keep their original save keys.
  for(const slot of SLOTS){
   const itemId=hero.gear[slot],def=itemId?itemName(itemId):null;
   const symbol=SLOT_ICONS[slot];
   const selected=slot===inspectedSlot;
   html+='<section class="paperdoll-slot paperdoll-slot-'+slot+' '+(def?'is-equipped rarity-'+rarityClass(def.rarity):'is-empty')+(selected?' is-inspected':'')+'" data-slot="'+slot+'" aria-label="'+esc(slotTitle[slot])+' slot: '+esc(def?.name||'empty')+'">'
    +'<button type="button" class="armory-slot-select" data-action="inspect-gear-slot" data-slot="'+slot+'" aria-pressed="'+selected+'" aria-label="Inspect '+esc(slotTitle[slot])+(def?' · '+esc(def.name):' · empty')+'">'
    +'<span class="paperdoll-slot-symbol" aria-hidden="true">'+(def?esc(def.icon):symbol)+'</span>'
    +'<span class="paperdoll-slot-details"><strong>'+esc(slotTitle[slot])+'</strong><small>'+esc(def?.name||'Empty slot')+'</small></span></button>'
    +(itemId?'<button type="button" class="tiny-btn paperdoll-unequip" data-action="unequip" data-slot="'+slot+'" aria-label="Unequip '+esc(def.name)+' from '+esc(HERO_NAMES[heroId])+'">Unequip</button>':'')
    +'</section>';
  }
  html+='</div><div class="armory-inspection" aria-label="Selected equipment details" aria-live="polite">';
  if(inspectedDef&&inspectedInfo){
   html+='<div class="armory-inspection-icon rarity-'+rarityClass(inspectedDef.rarity)+'">'+esc(inspectedDef.icon)+'</div>'
    +'<div class="armory-inspection-copy"><span class="armory-item-rarity rarity-text-'+rarityClass(inspectedDef.rarity)+'">'+esc(inspectedDef.rarity)+' · '+esc(slotTitle[inspectedSlot])+'</span>'
    +'<strong>'+esc(inspectedInfo.name)+'</strong>'
    +'<p>'+esc(inspectedInfo.flavour)+'</p><small>'+esc(inspectedInfo.bonus)+(inspectedInfo.setName?' · '+esc(inspectedInfo.setName)+' Set':'')+'</small></div>'
    +'<div class="armory-inspection-actions"><button type="button" class="tiny-btn armory-remove" data-action="unequip" data-slot="'+inspectedSlot+'">Unequip</button></div>';
  }else{
   html+='<div class="armory-inspection-icon is-empty" aria-hidden="true">◇</div>'
    +'<div class="armory-inspection-copy"><span class="armory-item-rarity">EMPTY EQUIPMENT SLOT</span><strong>'+esc(slotTitle[inspectedSlot])+'</strong>'
    +'<p>No item equipped in this slot. Choose an eligible piece from your bag.</p></div>'
    +'<div class="armory-inspection-actions"><button type="button" class="tiny-btn" data-action="tab" data-tab="pack">Open Bag</button></div>';
  }
  html+='</div></div><p class="equipped-help">Tap a framed equipment slot to inspect it; unequipping returns the same item to your bag. Your nine equipment slots are usable; empty slots can be filled from the bag.</p>'
   +'<button type="button" class="mini-link" data-action="tab" data-tab="pack">Open your equipment bag →</button>';
  html+='<div class="workshop-subheading"><h3>Collection Bonuses</h3><span>2- and 4-piece sets</span></div>';
  html+='<div class="set-overview">'+setProgress(profile,heroId).map(group=>{
   const data=SET_DEFS[group.id];
   const next=group.next;
   const status=group.count>=4?'✦ Full set active':group.count>=2?'✓ 2-piece active · '+(4-group.count)+' more for 4-piece':'Collect '+Math.max(0,2-group.count)+' more to activate';
   return '<article class="set-summary '+(group.count>=2?'active':'')+'"><div><b>'+esc(data.icon+' '+data.name)+'</b><small>'+group.count+'/4 equipped · '+status+'</small></div><div class="set-bonuses"><small class="'+(group.count>=2?'active':'')+'">2 pieces: '+esc(itemBonusText({bonus:data.pieces2}))+'</small><small class="'+(group.count>=4?'active':'')+'">4 pieces: '+esc(itemBonusText({bonus:data.pieces4}))+'</small></div></article>';
  }).join('')+'</div>';
  html+='<div class="workshop-subheading"><h3>Saved Equipment Builds</h3><span>3 per hero</span></div>';
  html+='<p class="build-explainer">Save your current items as a build. Builds remember real items, not extra copies. Applying a build does not steal equipment from another hero.</p>';
  html+='<div class="build-grid">'+builds.heroes[heroId].map((preset,index)=>{
   const status=buildStatus(profile,builds,heroId,index);
   const name=preset?preset.name:'Empty Build '+(index+1);
   const preview=preset?SLOTS.map(slot=>{const inst=profile.items.find(it=>it.id===preset.gear[slot]);return inst?ITEM_DEFS[inst.defId].icon:(preset.gear[slot]?'×':'·');}).join(' '):'· · · · · · · · ·';
   return '<article class="build-preset"><div><b>'+esc(name)+'</b><small>'+esc(preview)+'</small></div><label class="build-label">Build name<input class="build-name-input" data-build-name="'+index+'" maxlength="30" value="'+esc(preset?.name||'Build '+(index+1))+'" aria-label="Name equipment build '+(index+1)+'"></label><p class="'+(preset&&!status.ok?'unavailable':'')+'">'+esc(status.reason)+'</p><div class="build-buttons"><button type="button" class="tiny-btn" data-action="save-build" data-index="'+index+'">'+(preset?'Update Saved Build':'Save Current Gear')+'</button><button type="button" class="tiny-btn ghost" data-action="apply-build" data-index="'+index+'" '+(status.ok?'':'disabled')+'>Equip Build</button></div></article>';
  }).join('')+'</div>';

  html+='<div class="workshop-subheading"><h3>Talent Builds</h3><span>Dedicated skill trees</span></div>'
   +'<p class="build-explainer">'+esc(HERO_NAMES[heroId])+' has '+talentPoints(hero)+' unspent talent '+(talentPoints(hero)===1?'point':'points')+'. Choose paths and inspect effects in the Talent Trees screen.</p>'
   +'<button type="button" class="tiny-btn" data-action="tab" data-tab="talents">Open Talent Trees →</button>'
   +'<p class="workshop-disclaimer">Equipment and talents are saved in this browser. You can respec a hero using gold in the Talent Trees screen.</p>';
  return html;
 }

 const partyPortraits={knight:'🛡',ranger:'🏹',mage:'✦',cleric:'✚'};
 function heroEquipPower(id){
  const h=profile.heroes[id];let power=0;
  for(const slot of SLOTS){
   const item=profile.items.find(it=>it.id===h.gear[slot]);
   const def=item&&ITEM_DEFS[item.defId];if(def)power+=Object.values(def.bonus||{}).reduce((a,v)=>a+Math.round(Math.abs(v)*10),0);
  }
  return power;
 }
 function renderParty(){
  const order=partyOrder(profile),active=order[partyPosition]||order[0];
  heroId=active;
  let html='<div class="party-intro"><div><span class="eyebrow">WAR ROOM · PARTY FORMATION</span><h3>Form Your Company</h3><p>Tap a formation position, then tap a hero in your roster to swap them into that position. Your selected order sets starting positions and the Q/W/E/R quick-select order in your next boss fight.</p></div><div class="party-ready"><b>4 / 4</b><small>Active heroes</small></div></div>';
  html+='<div class="party-manager"><section class="party-formation" aria-label="Four active party positions"><div class="party-section-title"><b>Active formation</b><small>Changes apply next encounter</small></div><div class="party-formation-grid">';
  for(let i=0;i<PARTY_SIZE;i++){
   const id=order[i],hero=profile.heroes[id],level=hero.level,need=xpNeeded(level),progress=need?Math.floor(hero.xp/need*100):100,gear=SLOTS.filter(slot=>!!hero.gear[slot]).length;
   html+='<button type="button" class="party-position '+(i===partyPosition?'active':'')+'" data-action="party-position" data-index="'+i+'" aria-pressed="'+(i===partyPosition)+'" aria-label="Position '+(i+1)+': '+HERO_NAMES[id]+'">'
    +'<span class="party-position-number">'+(i+1)+'</span><span class="party-portrait">'+partyPortraits[id]+'</span><span class="party-position-copy"><strong>'+esc(HERO_NAMES[id])+'</strong><small>'+esc(PARTY_ROLES[id])+'</small><small>Level '+level+' · '+gear+'/9 gear · '+heroEquipPower(id)+' gear power</small><span class="party-xp-track"><i style="width:'+progress+'%"></i></span></span></button>';
  }
  html+='</div><p class="party-formation-hint">Position '+(partyPosition+1)+' selected · Choose a hero from the roster to swap positions.</p></section>';
  html+='<section class="party-roster" aria-label="Owned hero roster"><div class="party-section-title"><b>Your roster</b><small>'+HERO_IDS.length+' recruited · 0 reserves</small></div><div class="party-roster-list">';
  for(const id of HERO_IDS){
   const hero=profile.heroes[id],position=order.indexOf(id)+1;
   html+='<button type="button" class="party-roster-hero '+(id===active?'active':'')+'" data-action="party-pick" data-id="'+id+'" aria-label="Swap '+HERO_NAMES[id]+' into position '+(partyPosition+1)+'"><span class="party-portrait">'+partyPortraits[id]+'</span><span><b>'+esc(HERO_NAMES[id])+'</b><small>'+esc(PARTY_ROLES[id])+' · Lv '+hero.level+'</small><small>Currently in slot '+position+'</small></span><span class="party-swap-icon">⇄</span></button>';
  }
  html+='</div><div class="party-roster-actions"><button type="button" class="tiny-btn" data-action="party-gear">View '+esc(HERO_NAMES[active])+' Equipment</button><button type="button" class="tiny-btn ghost" data-action="party-talents">Talent Tree</button></div></section></div>';
  html+='<p class="party-future-note">Your current roster has four founding heroes, so all four remain active. Recruitment and reserve heroes are not available yet. This screen manages real positions and selection order without inventing recruits or changing hero classes.</p>';
  return html;
 }
 function renderTalents(){
  const hero=profile.heroes[heroId],points=talentPoints(hero);
  const talent=selectedTalentId?TALENTS[heroId].find(t=>t.id===selectedTalentId):null;
  let html='<div class="talent-screen-head"><div><span class="eyebrow">FIX PACK 02 · HERO PROGRESSION</span><h3>Talent Paths</h3><p>Choose one talent per level tier. Examine each node and its combat effect before confirming. Routes can be mixed between levels 2 and 4.</p></div><div class="talent-points"><b>'+points+'</b><span>Point'+(points===1?'':'s')+' available</span></div></div>';
  html+='<div class="hero-picker talent-hero-picker">'+HERO_IDS.map(id=>'<button type="button" class="hero-picker-btn '+(id===heroId?'active':'')+'" data-action="hero" data-id="'+id+'">'+esc(HERO_NAMES[id])+'<small>Lv '+profile.heroes[id].level+' · '+esc(pretty[id])+'</small></button>').join('')+'</div>';
  html+='<div class="talent-screen-layout"><section class="talent-tree" aria-label="Branching talent tree for '+esc(HERO_NAMES[heroId])+'">'
   +'<div class="talent-tree-root"><span class="talent-root-symbol">'+partyPortraits[heroId]+'</span><strong>'+esc(HERO_NAMES[heroId])+'</strong><small>Level '+hero.level+' · '+esc(pretty[heroId])+'</small></div>';
  for(const tier of [2,4]){
   const options=TALENTS[heroId].filter(t=>t.tier===tier);
   const chosen=options.find(t=>hero.talents.includes(t.id));
   html+='<div class="talent-branches" aria-hidden="true"><span></span><span></span></div>'
    +'<div class="talent-tier-gate"><b>LEVEL '+tier+'</b><span>'+(chosen?'Path chosen':hero.level>=tier?'One choice available':'Unlocks at level '+tier)+'</span></div>'
    +'<div class="talent-node-row">';
   for(const node of options){
    const learned=hero.talents.includes(node.id),levelLocked=hero.level<tier,otherChosen=!!chosen&&!learned;
    const status=learned?'learned':levelLocked?'locked':otherChosen?'excluded':'available';
    html+='<button type="button" class="talent-node '+status+(selectedTalentId===node.id?' inspecting':'')+'" data-action="talent-node" data-id="'+node.id+'" aria-pressed="'+(selectedTalentId===node.id)+'" aria-label="'+esc(node.name+', '+status+(levelLocked?', level '+tier+' required':''))+'">'
     +'<span class="talent-node-icon">'+esc(node.icon)+'</span><strong>'+esc(node.name)+'</strong><small>'+esc(node.description)+'</small>'
     +'<span class="talent-node-state">'+(learned?'✓ Learned':levelLocked?'🔒 Level '+tier:otherChosen?'Alternative path':'✦ Available')+'</span></button>';
   }
   html+='</div>';
  }
  html+='</section><aside class="talent-inspector" aria-label="Talent details and spending">';
  if(talent){
   const learned=hero.talents.includes(talent.id),tierChosen=hero.talents.some(id=>TALENTS[heroId].find(t=>t.id===id)?.tier===talent.tier);
   const available=!learned&&!tierChosen&&hero.level>=talent.tier;
   html+='<div class="talent-inspector-icon">'+esc(talent.icon)+'</div><span class="eyebrow">LEVEL '+talent.tier+' TALENT</span><h4>'+esc(talent.name)+'</h4><p>'+esc(talent.description)+'</p>';
   html+='<div class="talent-effect-list"><strong>Actual combat effects</strong>'+esc(itemBonusText({bonus:talent.bonus}))+'</div>';
   html+='<p class="talent-inspector-status">'+(learned?'✓ Learned and active':hero.level<talent.tier?'Locked until level '+talent.tier:tierChosen?'Alternative talent already chosen at this level':'Ready to learn · consumes tier choice')+'</p>';
   if(available)html+='<button type="button" class="tiny-btn talent-spend" data-action="learn-talent" data-id="'+talent.id+'">'+(confirmSpendId===talent.id?'Confirm Spend — '+esc(talent.name):'Review Spend · '+esc(talent.name))+'</button>';
  }else html+='<div class="talent-inspector-empty"><span>✦</span><h4>Select a talent</h4><p>Tap any node to see its details, whether it is available and its exact in-combat effect.</p></div>';
  html+='<div class="talent-reset"><h4>Change your build</h4><p>Respec clears this hero’s selected talents and refunds tier choices for '+TALENT_RESPEC_COST+' gold. Equipment is unaffected.</p><button class="tiny-btn ghost" type="button" data-action="respec-talents" '+(!hero.talents.length||profile.gold<TALENT_RESPEC_COST?'disabled':'')+'>'+(confirmRespec?'Confirm Respec · '+TALENT_RESPEC_COST+' gold':'Respec Talents · '+TALENT_RESPEC_COST+' gold')+'</button><small>'+profile.gold+' gold available</small></div>';
  html+='</aside></div><p class="workshop-disclaimer">Talent choices apply to the next boss encounter. A confirmation is required to spend points or respec. Existing learned talents and local saves are preserved.</p>';
  return html;
 }
 function renderInspection(itemId,defId,persistent=false,compareHeroId=heroId){
  const info=itemDetails(defId);if(!info)return '';
  const comparison=itemId&&profile.items.some(x=>x.id===itemId)?compareItem(profile,compareHeroId,itemId):null;
  let html='<section class="item-inspector" id="itemInspector"><div class="inspection-head"><span class="inspection-icon">'+esc(info.icon)+'</span><div><span class="eyebrow">EXAMINE EQUIPMENT</span><h3>'+esc(info.name)+'</h3><small>'+esc(info.rarity+' · '+slotTitle[info.slot])+(info.setName?' · '+esc(info.setName):'')+'</small></div>'+(persistent?'':'<button class="tiny-btn ghost" type="button" data-action="close-inspect">Close</button>')+'</div><p class="inspection-flavour">'+esc(info.flavour)+'</p>';
  html+='<p class="inspection-line"><b>Base bonuses:</b> '+esc(info.bonus)+'</p>';
  html+='<p class="inspection-line"><b>Where to find:</b> '+esc(info.sources.length?info.sources.map(x=>x.name+' ('+x.rate+'% per victory)').join(' · '):info.shop?'Quartermaster · '+info.shop+' gold':CRAFT_RECIPES.some(r=>r.product===defId&&r.skill==='smithing')?'Smithing · boss reagents':'Boss rewards / relics')+'</p>';
  if(comparison){
   if(!comparison.eligible)html+='<div class="compare-warning">'+esc(comparison.reason)+'</div>';
   else{
    const old=comparison.currentDef?ITEM_DEFS[comparison.currentDef].name:'Empty slot';
    html+='<div class="inspection-compare"><strong>Comparing for '+esc(HERO_NAMES[compareHeroId])+'</strong><small>Current: '+esc(old)+' → '+esc(info.name)+'</small>';
    html+='<div class="compare-changes">'+(comparison.differences.length?comparison.differences.map(d=>'<span class="stat-delta '+(d.delta>0?'up':'down')+'">'+esc(deltaLabel(d.key,d.delta))+'</span>').join(''):'<span class="stat-delta">No combat stat change</span>')+'</div>';
    html+='<small>Includes set effects and character bonuses; new gear applies to the next boss encounter.</small>';
    if(comparison.owner&&comparison.owner!==compareHeroId)html+='<small class="compare-warning">Equipped by '+esc(HERO_NAMES[comparison.owner])+'. Equipping it here will transfer that one item.</small>';
    html+='</div>';
   }
  }
  return html+'</section>';
 }
  function renderPack(){
  // Equipped item instances remain in the canonical profile for save/build compatibility,
  // but do not occupy bag slots until they are unequipped.
  const all=profile.items.filter(item=>!itemOwner(profile,item.id)).slice().reverse();
  const visible=all.filter(item=>bagFilter==='all'||ITEM_DEFS[item.defId].slot===bagFilter);
  const selected=visible.find(item=>item.id===selectedBagId)||visible[0]||null;
  selectedBagId=selected?.id||null;
  const def=selected?ITEM_DEFS[selected.defId]:null;
  const eligible=def?(def.classes?HERO_IDS.filter(id=>def.classes.includes(id)):HERO_IDS):[];
  const target=eligible.includes(equipTarget)?equipTarget:eligible.includes(heroId)?heroId:eligible[0];
  equipTarget=target||null;
  let html='<div class="workshop-intro inventory-intro"><h3>Equipment Bag</h3><p>Select an item and then choose which hero will wear it. Equipped gear leaves your bag and returns when unequipped.</p></div>';
  // Prominent and always visible: the recipient must never be buried inside item details.
  html+='<section class="inventory-party-selector" aria-label="Choose hero to equip"><div class="inventory-party-caption"><div><span class="eyebrow">STEP 1 · CHOOSE HERO</span><h3>Who will wear this?</h3></div><span>'+(def&&eligible.length===1?'Class-locked gear · one eligible hero':'Tap a portrait to change the recipient')+'</span></div><div class="inventory-party-grid">';
  const portraits={knight:'🛡',ranger:'🏹',mage:'✦',cleric:'✚'};
  for(const id of HERO_IDS){
   const canWear=!def||eligible.includes(id),chosen=id===target;
   html+='<button type="button" class="inventory-recipient '+(chosen?'active':'')+(canWear?'':' incompatible')+'" data-action="target-hero" data-id="'+id+'" aria-pressed="'+chosen+'" aria-label="'+esc(HERO_NAMES[id]+' · '+pretty[id]+(canWear?'':', incompatible item'))+'" '+(canWear?'':'disabled')+'>'
    +'<span class="inventory-recipient-icon" aria-hidden="true">'+portraits[id]+'</span><span class="inventory-recipient-info"><b>'+esc(HERO_NAMES[id])+'</b><small>'+esc(canWear?(chosen?'✓ Selected · '+pretty[id]:pretty[id]):'Class restricted')+'</small></span></button>';
  }
  html+='</div></section>';
  html+='<div class="inventory-layout"><section class="inventory-collection" aria-label="Inventory slots">'
   +'<div class="inventory-section-head"><div><span class="eyebrow">STORAGE</span><h3>Your Bag</h3></div><span class="inventory-capacity" title="'+profile.items.length+' of 400 owned items">'+all.length+' in bag · '+(profile.items.length-all.length)+' equipped</span></div>'
   +'<div class="inventory-filters"><label for="bagFilter">Show items</label><select id="bagFilter" aria-label="Filter inventory items">'
   +[['all','All gear'],...SLOTS.map(slot=>[slot,slotTitle[slot]])].map(([value,name])=>'<option value="'+value+'" '+(bagFilter===value?'selected':'')+'>'+name+'</option>').join('')
   +'</select><span class="inventory-gold">'+profile.gold+' gold</span></div>'
   +'<div class="inventory-slot-scroll" id="inventoryScroll" tabindex="0" role="region" aria-label="Scrollable inventory"><div class="inventory-slot-grid" id="inventoryGrid">';
  for(const item of visible){
   const itemDef=ITEM_DEFS[item.defId],active=item.id===selectedBagId;
   html+='<button type="button" class="inventory-slot rarity-'+rarityClass(itemDef.rarity)+(active?' is-selected':'')+'" data-action="inspect" data-id="'+esc(item.id)+'" title="'+esc(itemDef.name)+'" aria-label="'+esc(itemDef.name+', '+itemDef.rarity+', in bag')+'" aria-pressed="'+active+'">'
    +'<span class="inventory-slot-icon" aria-hidden="true">'+esc(itemDef.icon)+'</span></button>';
  }
  for(let empty=0;empty<Math.max(0,24-visible.length);empty++)html+='<span class="inventory-slot inventory-slot-empty" aria-hidden="true"></span>';
  html+='</div></div>';
  if(!all.length)html+='<p class="inventory-empty-note">'+(profile.items.length?'All your items are equipped. Visit Heroes &amp; Talents to unequip them.':'Your bag is empty. Earn gear from a boss or visit the Quartermaster.')+'</p>';
  else if(!visible.length)html+='<p class="inventory-empty-note">No unequipped items match this filter.</p>';
  html+='</section><aside class="inventory-detail-panel" aria-label="Selected item details and actions">'
   +'<div class="inventory-detail-top"><div><span class="eyebrow">ITEM DETAILS</span><h3>Inspect &amp; equip</h3></div><button type="button" class="tiny-btn ghost" data-action="tab" data-tab="heroes">Equipped gear →</button></div>';
  if(selected&&def){
   html+='<div class="inventory-detail-scroll" tabindex="0" role="region" aria-label="Scroll item description and comparisons">';
   html+='<p class="inventory-auto-target">'+(eligible.length===1?'Only '+esc(HERO_NAMES[target])+' ('+esc(pretty[target])+') can wear this item.':'Selected hero: '+esc(HERO_NAMES[target])+' ('+esc(pretty[target])+'). Change using the portraits above.')+'</p>';
   html+=renderInspection(selected.id,selected.defId,true,target);
   html+='<div class="inventory-item-owner">In your bag · Sell value '+def.value+' gold</div>';
   html+='<p class="inventory-detail-note">Items are owned only once. Equipping an item replaces any gear in that hero’s slot; the replaced piece returns to your bag.</p></div>';
   html+='<div class="inventory-actions"><h4>Item actions</h4>'
    +'<button type="button" class="tiny-btn inventory-action-primary" data-action="equip" data-id="'+esc(selected.id)+'" data-hero="'+target+'">Equip to '+esc(HERO_NAMES[target])+'</button>'
    +'<button type="button" class="tiny-btn ghost danger" data-action="sell" data-id="'+esc(selected.id)+'">'+(pendingSell===selected.id?'Confirm sale for '+def.value+' gold':'Sell for '+def.value+' gold')+'</button></div>';
  }else html+='<div class="inventory-no-selection"><span aria-hidden="true">✦</span><h4>No item selected</h4><p>Choose a bag slot or adjust your filter. To remove equipped gear, open Heroes &amp; Talents.</p></div>';
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
  let html='<div class="workshop-intro"><h3>Boss Drop Tables</h3><p>Every victory awards XP, gold, one equipment roll and guaranteed crafting materials. Purple gear is crafted; orange gear is reserved for future PvP. Drop rates are per victory.</p></div>';
  html+='<label for="dropBoss">Choose a boss</label><select id="dropBoss" class="hero-select">'+Object.values(BOSSES).map(b=>'<option value="'+b.id+'" '+(b.id===dropBoss?'selected':'')+'>'+esc(b.name)+' · Recommended Lv '+b.unlock+'</option>').join('')+'</select>';
  html+='<div class="pack-stats"><span>'+esc(boss.place)+'</span><b>+'+boss.xp+' XP · '+boss.gold+' gold</b></div>';
  html+='<p class="workshop-disclaimer">'+esc(boss.mechanics)+'</p>';
  const prefix=dropBoss==='thornwarden'?'verdant':dropBoss==='cindermaw'?'ember':'tempest';
  const mats=Object.entries(MATERIAL_DEFS).filter(([id])=>id.startsWith(prefix));
  html+='<div class="craft-boss-reagents"><strong>Guaranteed every victory</strong>'+mats.map(([id,mat])=>'<span>'+mat.icon+' '+esc(mat.name)+' +'+(id.endsWith('-ore')?3:id.endsWith('-essence')?2:1)+'</span>').join('')+'</div>';
  for(const entry of table){
   const def=ITEM_DEFS[entry.id],prob=entry.weight/weight*100;
   html+='<article class="drop-row"><span class="loot-icon">'+esc(def.icon)+'</span><div><strong>'+esc(def.name)+'</strong><small>'+esc(def.rarity)+' · '+esc(slotTitle[def.slot])+' · '+esc(itemBonusText(def))+'</small><button class="tiny-btn ghost" type="button" data-action="inspect" data-id="drop-'+entry.id+'">Examine</button></div><b>'+prob.toFixed(prob<10?1:0)+'%</b></article>';
  }
  if(detailsId?.startsWith('drop-'))html+=renderInspection(null,detailsId.slice(5));
  html+='<p class="workshop-disclaimer">Rates are transparent and independent per win. All equipment is local to this browser; online ownership and trading remain future features.</p>';
  return html;
 }

 function renderCrafting(){
  const skill=profile.skills[craftSkill],needed=skillXpNeeded(skill.level);
  let html='<div class="workshop-intro craft-intro"><span class="eyebrow">FORGE · SMITHING & ALCHEMY</span><h3>Smithing &amp; Alchemy</h3><p>Bosses award ores, essences and marks. Forge selected equipment or brew battle elixirs; each successful craft earns immediate skill XP. Level cap: 20, with future unlocks visible beyond.</p></div>';
  html+='<div class="craft-skill-tabs">'+SKILL_IDS.map(id=>{
   const sk=profile.skills[id],need=skillXpNeeded(sk.level),pct=need?Math.min(100,Math.round(sk.xp/need*100)):100;
   return '<button type="button" data-action="craft-skill" data-skill="'+id+'" class="craft-skill-tab '+(craftSkill===id?'active':'')+'" aria-pressed="'+(craftSkill===id)+'"><b>'+(id==='smithing'?'⚒️ Smithing':'⚗️ Alchemy')+'</b><small>Level '+sk.level+'/'+SKILL_CAP+' · '+(need?sk.xp+' / '+need+' XP':'MAX LEVEL')+'</small><span class="craft-xp-track"><i style="width:'+pct+'%"></i></span></button>';
  }).join('')+'</div>';
  const recipes=CRAFT_RECIPES.filter(r=>r.skill===craftSkill);
  html+='<div class="craft-studio"><section class="craft-recipe-list" aria-label="Crafting recipes"><div class="party-section-title"><b>'+(craftSkill==='smithing'?'The Forge':'The Alchemy Table')+'</b><small>Level '+skill.level+'/'+SKILL_CAP+'</small></div>';
  for(const recipe of recipes){
   const status=craftingStatus(profile,recipe.id);
   html+='<button type="button" class="craft-recipe '+(craftRecipeId===recipe.id?'active':'')+(skill.level<recipe.level?' locked':'')+'" data-action="craft-select" data-id="'+recipe.id+'" aria-pressed="'+(craftRecipeId===recipe.id)+'"><span class="craft-product-icon">'+esc(recipe.icon)+'</span><span class="craft-recipe-name"><b>'+esc(recipe.name)+'</b><small>Lv '+recipe.level+' · +'+recipe.xp+' XP · '+esc(recipe.rarity)+'</small><small>'+esc(Object.entries(recipe.materials).filter(([,n])=>n>0).map(([id,n])=>MATERIAL_DEFS[id].name+' ×'+n).join(' · '))+'</small></span><span class="craft-recipe-state">'+(skill.level<recipe.level?'🔒':status.ok?'✓':'◇')+'</span></button>';
  }
  html+='<div class="craft-future"><strong>Beyond level '+SKILL_CAP+' · future unlocks</strong>'+FUTURE_CRAFTS.filter(r=>r.skill===craftSkill).map(r=>'<div>🔒 Lv '+r.level+' · '+r.icon+' '+esc(r.name)+'</div>').join('')+'<small>Preview only — unobtainable until a future level-cap increase.</small></div></section>';
  const recipe=CRAFT_RECIPES.find(r=>r.id===craftRecipeId&&r.skill===craftSkill);
  html+='<section class="craft-workbench" aria-label="Interactive crafting workbench">';
  if(!recipe){
   html+='<div class="craft-empty"><span>✦</span><h3>Select a recipe</h3><p>Choose an item to see its materials, level requirement and interactive crafting challenge.</p></div>';
  }else{
   const status=craftingStatus(profile,recipe.id);
   html+='<div class="craft-product-preview"><span>'+esc(recipe.icon)+'</span><div><small>'+esc(recipe.rarity)+' · LEVEL '+recipe.level+'</small><h3>'+esc(recipe.name)+'</h3><p>+ '+recipe.xp+' '+esc(craftSkill)+' XP per successful item</p></div></div>';
   html+='<div class="craft-ingredients"><strong>Ingredients in your stock</strong>'+Object.entries(recipe.materials).filter(([,count])=>count>0).map(([id,count])=>'<div class="'+(profile.materials[id]>=count?'owned':'missing')+'"><span>'+MATERIAL_DEFS[id].icon+' '+esc(MATERIAL_DEFS[id].name)+'</span><b>'+profile.materials[id]+' / '+count+'</b></div>').join('')+'</div>';
   if(skill.level<recipe.level)html+='<p class="craft-warning">Reach '+esc(craftSkill)+' level '+recipe.level+' to unlock this recipe.</p>';
   else if(!status.ok)html+='<p class="craft-warning">'+esc(status.reason)+'</p>';
   else if(craftSkill==='smithing'){
    html+='<p class="craft-instruction">Heat the metal, then strike as the moving needle enters the <strong>gold zone</strong>. Failed strikes consume no materials or XP.</p>';
    html+='<div class="craft-meter" aria-label="Timed forging minigame"><span class="craft-perfect-zone"></span><span class="craft-needle '+(craftStage==='heated'?'moving':'')+'"></span></div>';
    html+='<button type="button" class="tiny-btn craft-primary" data-action="'+(craftStage==='heated'?'craft-strike':'craft-heat')+'">'+(craftStage==='heated'?'⚒️ Strike Now':'🔥 Heat the Metal')+'</button>';
   }else{
    const options=[recipe.mix[0],recipe.mix[1],...Object.keys(MATERIAL_DEFS).filter(id=>id!==recipe.mix[0]&&id!==recipe.mix[1]).slice(0,1)];
    html+='<p class="craft-instruction">Combine the correct reagents in order: <strong>essence first, then ore.</strong> Incorrect mixing does not consume anything.</p>';
    html+='<div class="craft-mix-stages"><span class="'+(craftMix.length>=1?'done':'')+'">1 · Essence '+(craftMix[0]?'✓':'○')+'</span><span class="'+(craftMix.length>=2?'done':'')+'">2 · Ore '+(craftMix[1]?'✓':'○')+'</span></div>';
    html+='<div class="craft-mix-buttons">'+options.map(id=>'<button type="button" class="tiny-btn ghost" data-action="craft-add" data-id="'+id+'">'+MATERIAL_DEFS[id].icon+' '+esc(MATERIAL_DEFS[id].name)+'</button>').join('')+'</div>';
   }
  }
  html+='</section></div>';
  html+='<div class="craft-stock"><div class="party-section-title"><b>Materials &amp; Marks</b><small>Guaranteed every boss victory</small></div><div class="craft-stock-grid">'+Object.entries(MATERIAL_DEFS).map(([id,mat])=>'<span class="craft-stock-item">'+mat.icon+' '+esc(mat.name)+' <b>×'+profile.materials[id]+'</b></span>').join('')+'</div></div>';
  if(craftSkill==='alchemy'){
   html+='<div class="craft-stock"><div class="party-section-title"><b>Battle elixirs</b><small>One prepared for the next boss fight</small></div><div class="craft-potion-grid">'+Object.entries(ALCHEMY_EFFECTS).map(([id,info])=>'<div class="craft-potion"><strong>'+info.icon+' '+esc(info.name)+'</strong><small>'+esc(itemBonusText({bonus:info.bonus}))+' · In stock: '+profile.potions[id]+'</small><button type="button" class="tiny-btn" data-action="prepare-elixir" data-id="'+id+'" '+(profile.potions[id]<1?'disabled':'')+'>'+(profile.preparedElixir===id?'Prepared · Replace':'Prepare for Next Battle')+'</button></div>').join('')+'</div><p class="craft-prepared">Prepared: '+(profile.preparedElixir?esc(ALCHEMY_EFFECTS[profile.preparedElixir].name):'None')+'. Preparing a different potion returns the previous one to stock.</p></div>';
  }
  html+='<p class="workshop-disclaimer">Green equipment is obtainable from PvE and chosen-piece material exchanges. Blue items are rare boss drops, purple items require Smithing plus PvE materials, and orange gear will be PvP-only when PvP is implemented. Your crafted items, materials and potions are saved locally.</p>';
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
  title.textContent=tabNames[current];
  context.textContent='EMBERGUARD CAMP · '+tabNames[current].toUpperCase();
  for(const tab of tabs.querySelectorAll('button[data-tab]')){
   const active=tab.dataset.tab===current;
   tab.id=tabId(tab.dataset.tab);
   tab.setAttribute('role','tab');tab.setAttribute('aria-controls','workshopBody');
   tab.classList.toggle('selected',active);
   tab.setAttribute('aria-selected',String(active));tab.setAttribute('aria-pressed',String(active));
   tab.tabIndex=active?0:-1;
  }
  body.setAttribute('aria-labelledby',tabId(current));
  document.getElementById('goldTotal').textContent=profile.gold+' gold';
  document.getElementById('bagCount').textContent=String(profile.items.filter(item=>!itemOwner(profile,item.id)).length);
  body.classList.toggle('inventory-mode',current==='pack');
  body.innerHTML=(notice?'<div class="workshop-notice '+(noticeBad?'is-error':'')+'" role="status">'+esc(notice)+'</div>':'')
    +(current==='party'?renderParty():current==='heroes'?renderHeroes():current==='talents'?renderTalents():current==='pack'?renderPack():current==='craft'?renderCrafting():current==='shop'?renderShop():current==='loot'?renderDrops():renderBackup());
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
  returnFocus=document.activeElement;
  if(tabNames[tab])current=tab;
  if(HERO_IDS.includes(selected)){heroId=selected;equipmentSlot=null;selectedTalentId=null;partyPosition=Math.max(0,partyOrder(profile).indexOf(selected));}
  pendingSell=null;
  root.classList.remove('hidden');render();onOpen();
  root.querySelector('#workshopClose').focus({preventScroll:true});
 }
 function close(){
  if(root.classList.contains('hidden'))return;
  root.classList.add('hidden');pendingSell=null;onClose();
  const target=returnFocus?.isConnected&&returnFocus.getClientRects().length?returnFocus:document.getElementById('campNavHome');
  target?.focus({preventScroll:true});returnFocus=null;
 }
 tabs.addEventListener('click',e=>{
  const tab=e.target.closest('button[data-tab]')?.dataset.tab;
  if(tabNames[tab]){
   current=tab;pendingSell=null;notice='';detailsId=null;confirmSpendId=null;confirmRespec=false;importConfirm=false;render();
   if(root.classList.contains('camp-page'))window.scrollTo({top:0,behavior:'instant'});else body.scrollTop=0;
  }
 });
 tabs.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  const buttons=[...tabs.querySelectorAll('button[data-tab]')],index=buttons.findIndex(b=>b===document.activeElement);
  if(index<0)return;
  e.preventDefault();
  const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
  buttons[next].click();buttons[next].focus({preventScroll:true});
 });
 root.querySelector('#workshopClose').addEventListener('click',close);
 root.addEventListener('click',e=>{if(e.target===root&&!root.classList.contains('camp-page'))close();});
 root.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 body.addEventListener('input',e=>{
  if(e.target.id==='backupImport'){importText=e.target.value;validatedImport=null;importConfirm=false;notice='';}
 });
 body.addEventListener('change',e=>{
  if(e.target.id==='bagFilter'&&['all',...SLOTS].includes(e.target.value)){bagFilter=e.target.value;pendingSell=null;selectedBagId=null;rerenderBag();}
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
  if(action==='party-position'&&current==='party'){
   const position=Number(btn.dataset.index);
   if(Number.isInteger(position)&&position>=0&&position<PARTY_SIZE){partyPosition=position;heroId=partyOrder(profile)[position];render();}
   return;
  }
  if(action==='party-pick'&&current==='party'&&HERO_IDS.includes(id)){
   const src=partyOrder(profile).indexOf(id);
   if(src!==partyPosition&&swapPartyMembers(profile,partyPosition,src)){
    heroId=id;notice='Formation saved. New positions will apply to your next expedition.';noticeBad=false;save();
   }else {heroId=id;render();}
   return;
  }
  if(action==='party-gear'||action==='party-talents'){
   heroId=partyOrder(profile)[partyPosition];selectedTalentId=null;confirmSpendId=null;confirmRespec=false;
   current=action==='party-gear'?'heroes':'talents';render();return;
  }
  if(action==='talent-node'&&current==='talents'){
   if(TALENTS[heroId].some(t=>t.id===id)){selectedTalentId=id;confirmSpendId=null;confirmRespec=false;render();}
   return;
  }
  if(action==='learn-talent'&&current==='talents'){
   const choice=TALENTS[heroId].find(t=>t.id===id);
   if(!choice||selectedTalentId!==id)return;
   if(confirmSpendId!==id){confirmSpendId=id;confirmRespec=false;render();return;}
   if(chooseTalent(profile,heroId,id)){
    notice=HERO_NAMES[heroId]+' learned '+choice.name+'. It will apply to the next encounter.';noticeBad=false;
    confirmSpendId=null;save();
   }
   return;
  }
  if(action==='respec-talents'&&current==='talents'){
   if(!confirmRespec){confirmRespec=true;confirmSpendId=null;render();return;}
   if(respecTalents(profile,heroId)){
    confirmRespec=false;confirmSpendId=null;selectedTalentId=null;notice=HERO_NAMES[heroId]+' talents reset for '+TALENT_RESPEC_COST+' gold.';noticeBad=false;save();
   }
   return;
  }
  if(action==='craft-skill'&&current==='craft'&&SKILL_IDS.includes(btn.dataset.skill)){
   craftSkill=btn.dataset.skill;craftRecipeId=null;craftStage='idle';craftMix=[];notice='';render();return;
  }
  if(action==='craft-select'&&current==='craft'){
   if(CRAFT_RECIPES.some(r=>r.id===id&&r.skill===craftSkill)){
    craftRecipeId=id;craftStage='idle';craftMix=[];notice='';render();
   }return;
  }
  if(action==='craft-heat'&&current==='craft'&&craftSkill==='smithing'){
   if(!craftingStatus(profile,craftRecipeId).ok)return;
   craftStartedAt=performance.now();craftStage='heated';render();return;
  }
  if(action==='craft-strike'&&current==='craft'&&craftSkill==='smithing'&&craftStage==='heated'){
   const elapsed=Math.max(0,performance.now()-craftStartedAt);
   const position=Math.abs((elapsed%2000)/1000-1)*100;
   const result=craftRecipe(profile,craftRecipeId,{strike:position});
   craftStage='idle';craftMix=[];
   notice=result.ok?'Forged '+ITEM_DEFS[result.product].name+' · +'+result.xp+' Smithing XP'+(result.levelTo>result.levelFrom?' · LEVEL UP '+result.levelTo+'!':''):result.reason;
   noticeBad=!result.ok;if(result.ok)save();else render();return;
  }
  if(action==='craft-add'&&current==='craft'&&craftSkill==='alchemy'){
   const recipe=CRAFT_RECIPES.find(r=>r.id===craftRecipeId&&r.skill==='alchemy');
   if(!recipe||!craftingStatus(profile,recipe.id).ok)return;
   craftMix.push(id);
   if(craftMix.at(-1)!==recipe.mix[craftMix.length-1]){
    craftMix=[];notice='The mixture reacted poorly. Combine the correct essence first, then the ore.';noticeBad=true;render();return;
   }
   if(craftMix.length===2){
    const result=craftRecipe(profile,recipe.id,{mix:[...craftMix]});
    craftMix=[];notice=result.ok?'Brewed '+ALCHEMY_EFFECTS[result.product].name+' · +'+result.xp+' Alchemy XP'+(result.levelTo>result.levelFrom?' · LEVEL UP '+result.levelTo+'!':''):result.reason;
    noticeBad=!result.ok;if(result.ok)save();else render();
   }else render();
   return;
  }
  if(action==='prepare-elixir'&&current==='craft'&&Object.hasOwn(ALCHEMY_EFFECTS,id)){
   if(prepareElixir(profile,id)){
    notice=ALCHEMY_EFFECTS[id].name+' prepared for the next boss battle. It is consumed once when you start the fight.';noticeBad=false;save();
   }return;
  }
  if(action==='close-inspect'){detailsId=null;render();return;}
  if(action==='inspect-gear-slot'&&current==='heroes'&&SLOTS.includes(slot)){
   const offset=body.scrollTop;
   equipmentSlot=slot;render();body.scrollTop=offset;
   body.querySelector('.armory-slot-select[data-slot="'+slot+'"]')?.focus({preventScroll:true});
   return;
  }
  if(action==='target-hero'&&current==='pack'){
   const inst=profile.items.find(item=>item.id===selectedBagId);
   const def=inst&&ITEM_DEFS[inst.defId];
   if((!def||!def.classes||def.classes.includes(id))&&HERO_IDS.includes(id)){equipTarget=id;heroId=id;pendingSell=null;rerenderBag();}
   return;
  }
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
  if(action==='hero'&&HERO_IDS.includes(id)){heroId=id;equipmentSlot=null;selectedTalentId=null;confirmSpendId=null;confirmRespec=false;render();return;}
  if(action==='tab'&&tabNames[btn.dataset.tab]){current=btn.dataset.tab;notice='';detailsId=null;confirmSpendId=null;confirmRespec=false;render();return;}
  if(action==='talent'){if(chooseTalent(profile,heroId,id))save();return;}
  if(action==='equip'){
   if(current==='pack'){
    const inst=profile.items.find(item=>item.id===id),def=inst&&ITEM_DEFS[inst.defId],target=btn.dataset.hero;
    if(!inst||itemOwner(profile,id)||!HERO_IDS.includes(target)||(def.classes&&!def.classes.includes(target)))return;
    if(equip(profile,target,id)){selectedBagId=null;heroId=target;notice=def.name+' equipped to '+HERO_NAMES[target]+'. Unequip it from Hall of Heroes.';noticeBad=false;save();}
   }else if(equip(profile,heroId,id))save();
   return;
  }
  if(action==='unequip'){if(unequip(profile,heroId,slot))save();return;}
  if(action==='buy'){if(buy(profile,id))save();return;}
  if(action==='sell'){
   if(pendingSell!==id){pendingSell=id;rerenderBag();return;}
   if(sell(profile,id)){if(selectedBagId===id)selectedBagId=null;save();}
  }
 });
 return {open,close,render,selectHero(id){if(HERO_IDS.includes(id))heroId=id;},isOpen:()=>!root.classList.contains('hidden')};
}
