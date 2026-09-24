(()=>{
'use strict';
const CLASS_ORDER=['Warrior','Paladin','Priest','Druid','Hunter','Rogue','Mage'];
const CORE_SLOT_ORDER=['Head','Chest','Weapon'];
const SLOT_ORDER=['Head','Shoulders','Chest','Hands','Waist','Legs','Feet','Weapon','OffHand','Ring','Trinket','Relic'];
const EQUIPMENT_POSITION_ORDER=['Head','Shoulders','Chest','Hands','Waist','Legs','Feet','Weapon','OffHand','Ring1','Ring2','Trinket1','Trinket2','Relic'];
const TIER_META={
  1:{rarity:'Common',label:'Tier 1',dropEnabled:true,color:'#e7e7df',statCount:1,chapter:1},
  2:{rarity:'Uncommon',label:'Tier 2',dropEnabled:true,color:'#55d56a',statCount:2,chapter:1},
  3:{rarity:'Rare',label:'Tier 3',dropEnabled:false,color:'#4b9fff',statCount:3,chapter:1},
  4:{rarity:'Epic',label:'Tier 4',dropEnabled:false,color:'#b06cff',statCount:3,setBonus:true,chapter:1,endgame:true},
  5:{rarity:'Epic',label:'Tier 5',dropEnabled:false,color:'#d18cff',statCount:4,setBonus:true,chapter:1,raidExclusive:true}
};
const ITEM_LEVELS={
  Head:[18,24,32,40,46],
  Shoulders:[18,24,32,40,46],
  Chest:[20,26,34,42,48],
  Hands:[18,24,32,40,46],
  Waist:[18,24,32,40,46],
  Legs:[20,26,34,42,48],
  Feet:[18,24,32,40,46],
  Weapon:[22,28,36,44,50],
  OffHand:[21,27,35,43,49],
  Ring:[19,25,33,41,47],
  Trinket:[20,26,34,42,48],
  Relic:[21,27,35,43,49]
};
const CHAPTER_GEAR={chapter:1,levelCap:15,dungeonTierCeiling:4,raidExclusiveTier:5};
const STAT_DEFS={
  strength:{label:'Strength',unit:'flat'},agility:{label:'Agility',unit:'flat'},intellect:{label:'Intellect',unit:'flat'},
  stamina:{label:'Stamina',unit:'flat'},armour:{label:'Armour',unit:'flat'},block:{label:'Block',unit:'percent'},
  threat:{label:'Threat',unit:'percent'},healing:{label:'Healing Power',unit:'percent'},crit:{label:'Critical Strike',unit:'percent'},haste:{label:'Haste',unit:'percent'}
};
// Full Gear Combat Rebalance: a 14-position loadout must add breadth without multiplying combat ratings fourfold.
// Big armour/weapon slots carry more of the stat budget; jewellery and utility slots carry less.
const SLOT_STAT_BUDGET={Head:.72,Shoulders:.48,Chest:.95,Hands:.42,Waist:.40,Legs:.85,Feet:.42,Weapon:1,OffHand:.55,Ring:.28,Trinket:.38,Relic:.42};
const STAT_TYPE_BUDGET={flat:1,percent:.85,armour:.90};
const CLASS_STAT_POOLS={
  Warrior:['strength','stamina','armour','block','threat','crit','haste'],
  Paladin:['strength','intellect','stamina','armour','block','threat','healing','crit','haste'],
  Priest:['intellect','stamina','healing','crit','haste'],
  Druid:['intellect','stamina','healing','crit','haste'],
  Hunter:['agility','stamina','crit','haste'],
  Rogue:['agility','stamina','crit','haste'],
  Mage:['intellect','stamina','crit','haste']
};
const SPEC_IDEALS={
  'Warrior|Protection':['block','threat','stamina','armour'],'Warrior|Arms':['strength','crit','haste'],
  'Paladin|Protection':['block','threat','stamina','armour'],'Paladin|Holy':['healing','intellect','haste','crit'],
  'Priest|Holy':['healing','intellect','haste','crit'],'Druid|Restoration':['healing','haste','intellect','crit'],
  'Hunter|Marksman':['agility','crit','haste'],'Rogue|Assassination':['agility','crit','haste'],'Mage|Arcane':['intellect','crit','haste']
};
const SET_META={
  Warrior:{name:'Warlord Set'},Paladin:{name:'Sunward Set'},Priest:{name:'Saintglass Set'},Druid:{name:'Moonbark Set'},
  Hunter:{name:'Hawkeye Set'},Rogue:{name:'Shadecoil Set'},Mage:{name:'Starweave Set'}
};
const SET_BONUS_RULES={
  pieces2:{threshold:2,name:'Resonant Pair',outputScale:1.05,short:'+5% damage & healing output',description:'All damaging and healing abilities are 5% stronger.'},
  pieces4:{threshold:4,name:'Cellbound Ensemble',resourceRegen:1.12,short:'+12% resource recovery',description:'Passive class-resource recovery is increased by 12%.'}
};
function setPieceCount(c,setId){
  if(!c||!setId)return 0;
  return Object.values(c.equipment||{}).filter(item=>item?.setId===setId).length
}
function setBonusState(c,setId){
  const pieces=setPieceCount(c,setId),r2=SET_BONUS_RULES.pieces2,r4=SET_BONUS_RULES.pieces4;
  return {setId,pieces,pieces2:pieces>=r2.threshold,pieces4:pieces>=r4.threshold,next:pieces<r2.threshold?r2.threshold:pieces<r4.threshold?r4.threshold:null}
}
const NAMES={
  Warrior:[['Militia Helm','Worn Breastplate','Training Sword'],['Ashguard Helm','Ashguard Plate','Embercleaver'],['Vaultforged Greathelm','Vaultforged Cuirass','Runic Greatblade'],['Warlord Greathelm','Warlord Warplate','Warlord Greatblade']],
  Paladin:[['Novice Crown','Oathbound Mail','Blessed Mace'],['Sunwarden Helm','Sunwarden Plate','Sunwarden Hammer'],['Radiant Aegis Crown','Radiant Aegis Plate','Dawnkeeper Hammer'],['Sunward Crown','Sunward Warplate','Sunward Maul']],
  Priest:[['Acolyte Hood','Prayer Vestments','Cedar Staff'],['Chapelweave Cowl','Chapelweave Robe','Lightwell Rod'],['Saintglass Halo','Saintglass Vestments','Seraphic Staff'],['Ascendant Halo','Ascendant Vestments','Ascendant Staff']],
  Druid:[['Rootwoven Hood','Barkhide Garb','Living Branch'],['Wildbloom Hood','Wildbloom Raiment','Thornstaff'],['Moonbark Crown','Moonbark Regalia','Starroot Scepter'],['Moonbark Antlers','Moonbark Vestments','Moonbark Scepter']],
  Hunter:[['Tracker Hood','Leather Jerkin','Ashwood Bow'],['Longshot Hood','Longshot Harness','Emberstring Bow'],['Hawkeye Visor','Hawkeye Brigandine','Stormflight Longbow'],['Hawkeye Warhood','Hawkeye Harness','Hawkeye Greatbow']],
  Rogue:[['Shadowcap','Duskleather Tunic','Twin Knives'],['Nightfang Hood','Nightfang Jerkin','Venomshivs'],['Shadecoil Mask','Shadecoil Vest','Ghostfang Daggers'],['Shadecoil Cowl','Shadecoil Leathers','Shadecoil Blades']],
  Mage:[['Novice Circlet','Blueweave Robe','Crystal Wand'],['Spellforge Circlet','Spellforge Mantle','Arcglass Rod'],['Starweave Crown','Starweave Vestment','Celestine Staff'],['Starweave Diadem','Starweave Robe','Starweave Focus']]
};
const TIER_PREFIX={
  Warrior:['Militia','Ashguard','Vaultforged','Warlord'],
  Paladin:['Oathbound','Sunwarden','Radiant Aegis','Sunward'],
  Priest:['Acolyte','Chapelweave','Saintglass','Ascendant'],
  Druid:['Rootwoven','Wildbloom','Moonbark','Elder Moonbark'],
  Hunter:['Tracker','Longshot','Hawkeye','Storm Hawkeye'],
  Rogue:['Shadow','Nightfang','Shadecoil','Master Shadecoil'],
  Mage:['Novice','Spellforge','Starweave','Ascendant Starweave']
};
const ARMOUR_NOUNS={
  plate:{Shoulders:'Shoulderguards',Hands:'Gauntlets',Waist:'Warbelt',Legs:'Legplates',Feet:'Greaves'},
  leather:{Shoulders:'Spaulders',Hands:'Grips',Waist:'Belt',Legs:'Legguards',Feet:'Boots'},
  cloth:{Shoulders:'Mantle',Hands:'Gloves',Waist:'Sash',Legs:'Leggings',Feet:'Slippers'}
};
const OFFHAND_NOUN={Warrior:'Shield',Paladin:'Bulwark',Priest:'Scripture',Druid:'Idol',Hunter:'Quiver',Rogue:'Parrying Blade',Mage:'Grimoire'};
const RELIC_NOUN={Warrior:'Crest',Paladin:'Libram',Priest:'Icon',Druid:'Totem',Hunter:'Trophy',Rogue:'Token',Mage:'Focus'};
const SLOT_GLYPHS={Head:'⛑',Shoulders:'⌃',Chest:'▣',Hands:'✋',Waist:'═',Legs:'║',Feet:'♟',Weapon:'⚔',OffHand:'🛡',Ring:'◉',Trinket:'◆',Relic:'◇'};
function armourFamily(klass){return ['Warrior','Paladin'].includes(klass)?'plate':['Priest','Mage'].includes(klass)?'cloth':'leather'}
function nameFor(klass,tier,slot){
  const core=CORE_SLOT_ORDER.indexOf(slot);if(core>=0)return NAMES[klass][tier-1][core];
  const prefix=TIER_PREFIX[klass]?.[tier-1]||klass;
  if(slot==='OffHand')return prefix+' '+(OFFHAND_NOUN[klass]||'Off-Hand');
  if(slot==='Ring')return prefix+' Band';
  if(slot==='Trinket')return prefix+' Charm';
  if(slot==='Relic')return prefix+' '+(RELIC_NOUN[klass]||'Relic');
  return prefix+' '+(ARMOUR_NOUNS[armourFamily(klass)]?.[slot]||slot)
}
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const items=[];
CLASS_ORDER.forEach((klass,classIndex)=>{[1,2,3,4].forEach(tier=>{SLOT_ORDER.forEach((slot,slotIndex)=>{
  const meta=TIER_META[tier],itemLevel=ITEM_LEVELS[slot]?.[tier-1]||18+(tier-1)*8;
  items.push({itemId:`${slug(klass)}-t${tier}-${slug(slot)}`,name:nameFor(klass,tier,slot),class:klass,classes:[klass],slot,tier,rarity:meta.rarity,tierLabel:meta.label,enabled:true,dropEnabled:meta.dropEnabled,itemLevel,power:0,classIndex,slotIndex,rowIndex:tier-1});
})})});
const byId=id=>items.find(x=>x.itemId===id)||null;
const byName=name=>items.find(x=>x.name===name)||null;
const starterSet=klass=>CORE_SLOT_ORDER.map(slot=>items.find(x=>x.class===klass&&x.tier===1&&x.slot===slot));
const poolForTier=tier=>items.filter(x=>x.tier===tier&&x.enabled&&x.dropEnabled);
const rand=(min,max)=>min+Math.floor(Math.random()*(max-min+1));
function statRange(key,tier){
  const t=Math.max(1,Math.min(5,Number(tier)||1));
  if(key==='armour')return [[10,16],[16,25],[25,38],[36,52],[48,68]][t-1];
  if(STAT_DEFS[key]?.unit==='percent')return [[2,4],[3,6],[5,8],[7,11],[9,14]][t-1];
  return [[3,6],[5,9],[8,13],[12,18],[16,23]][t-1];
}
function rollValue(key,tier,slot){
  const [min,max]=statRange(key,tier),mult=slot==='Weapon'?1.12:['Chest','Legs','Trinket'].includes(slot)?1.06:['OffHand','Relic'].includes(slot)?1.04:1;
  return Math.max(1,Math.round(rand(min,max)*mult));
}
function rollId(){return globalThis.crypto?.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}
function rollItemAffixes(raw){
  if(!raw)return raw;
  const item={...raw},tier=Math.max(1,Math.min(5,Number(item.tier)||1)),count=TIER_META[tier]?.statCount||1;
  const pool=[...(CLASS_STAT_POOLS[item.class]||['stamina','crit','haste'])],stats=[];
  while(stats.length<count&&pool.length){const i=Math.floor(Math.random()*pool.length),key=pool.splice(i,1)[0];stats.push({key,value:rollValue(key,tier,item.slot)})}
  item.bonusStats=stats;item.rollId=rollId();item.affixVersion=1;
  if(tier===4){item.setId=slug(item.class)+'-t4';item.setName=SET_META[item.class]?.name||item.class+' Tier 4 Set'}
  if(tier===5){item.setId=slug(item.class)+'-t5';item.setName=(SET_META[item.class]?.name||item.class)+' Raid Set';item.raidExclusive=true}
  return item;
}
function rollDungeonLoot(source='Dungeon',tier2Chance=.25){
  const tier=Math.random()<tier2Chance?2:1,pool=poolForTier(tier),base=pool[Math.floor(Math.random()*pool.length)];
  return rollItemAffixes({...base,source});
}
function effectiveStatBudget(item,key){
  const explicit=Number(item?.statBudgetMultiplier),slot=Number(SLOT_STAT_BUDGET[item?.slot]);
  const slotBudget=Number.isFinite(explicit)&&explicit>0?explicit:(Number.isFinite(slot)?slot:1);
  const d=STAT_DEFS[key]||{unit:'flat'},type=d.unit==='percent'?'percent':key==='armour'?'armour':'flat';
  return slotBudget*(Number(STAT_TYPE_BUDGET[type])||1)
}
function statLines(item){
  return (Array.isArray(item?.bonusStats)?item.bonusStats:[]).map(s=>{
    const d=STAT_DEFS[s.key]||{label:s.key,unit:'flat'},raw=Math.max(0,Number(s.value)||0),budget=effectiveStatBudget(item,s.key),value=raw>0?Math.max(1,Math.round(raw*budget)):0;
    return {key:s.key,label:d.label,value,rawValue:raw,budget,unit:d.unit,text:`+${value}${d.unit==='percent'?'%':''} ${d.label}`};
  });
}
function aggregateStats(c){
  const out={};Object.values(c?.equipment||{}).forEach(item=>statLines(item).forEach(s=>out[s.key]=(Number(out[s.key])||0)+s.value));return out;
}
function rollSignature(item){
  const stats=statLines(item).sort((a,b)=>a.key.localeCompare(b.key)).map(s=>s.key+':'+s.value).join('|');
  return stats+(item?.setId?'|set:'+item.setId:'');
}
function idealStats(c){return SPEC_IDEALS[`${c?.class||''}|${c?.spec||''}`]||[]}
function rollFit(c,item){
  const lines=statLines(item),ideal=new Set(idealStats(c)),matches=lines.filter(s=>ideal.has(s.key)).length,total=lines.length;
  if(!total)return{matches:0,total:0,label:'LEGACY ITEM',tone:'legacy'};
  if(matches===total)return{matches,total,label:'IDEAL ROLL',tone:'ideal'};
  if(matches>0)return{matches,total,label:'MIXED ROLL',tone:'mixed'};
  return{matches,total,label:'OFF-ROLL',tone:'off'};
}
function itemScoreFor(c,item){
  const ilvl=Math.max(0,Number(item?.itemLevel)||0),ideal=new Set(idealStats(c));
  const roll=statLines(item).reduce((n,s)=>n+s.value*(ideal.has(s.key)?4:.5),0);
  return ilvl*100+roll;
}
function questProfileStats(c,profile='specialist',tier=1){
  const count=TIER_META[Math.max(1,Math.min(4,Number(tier)||1))]?.statCount||1;
  const ideal=idealStats(c),primary=c?.class==='Warrior'?'strength':['Hunter','Rogue'].includes(c?.class)?'agility':'intellect';
  const defensive=['stamina',...(['Warrior','Paladin'].includes(c?.class)?['armour','block']:['haste','crit'])];
  const swift=['haste','crit',primary];
  const specialist=[...ideal,primary,'stamina'];
  const source=profile==='sturdy'?defensive:profile==='swift'?swift:specialist;
  return [...new Set(source)].slice(0,count);
}
function questStatValue(key,tier=1,slot='Head'){
  const t=Math.max(1,Math.min(4,Number(tier)||1)),weapon=slot==='Weapon'?1:0;
  if(key==='armour')return [8,13,21,30][t-1]+weapon*2;
  if(STAT_DEFS[key]?.unit==='percent')return [1,2,4,6][t-1]+weapon;
  return [2,4,7,10][t-1]+weapon;
}
function createQuestGear(c,slot,tier=1,profile='specialist',source='Quest Reward'){
  if(!c)return null;
  const base=items.find(x=>x.class===c.class&&x.tier===Math.max(1,Math.min(3,Number(tier)||1))&&x.slot===slot)||starterSet(c.class).find(x=>x.slot===slot);
  if(!base)return null;
  const keys=questProfileStats(c,profile,tier),profileName=profile==='sturdy'?'Stalwart':profile==='swift'?'Swift':'Specialist';
  return {
    ...base,
    itemId:'quest-'+base.itemId+'-'+profile,
    baseItemId:base.itemId,
    name:profileName+' '+base.name,
    tierLabel:'Quest Gear · Tier '+tier,
    rarity:base.rarity,
    dropEnabled:false,
    bonusStats:keys.map(key=>({key,value:questStatValue(key,tier,slot)})),
    rollId:'quest-'+slug(c.id||c.name||c.class)+'-'+slug(slot)+'-'+profile+'-'+Date.now().toString(36),
    affixVersion:1,
    questGear:true,
    tradeState:'soulbound',
    source
  };
}
const ART_FIT={
  Head:{default:.91,Priest:.88,Druid:.89,Mage:.88},
  Chest:{default:.86,Priest:.82,Druid:.83,Mage:.82,Hunter:.87,Rogue:.88},
  Weapon:{default:.76,Warrior:.80,Paladin:.78,Priest:.70,Druid:.72,Hunter:.68,Rogue:.82,Mage:.70}
};
function artFit(item){
  const canonical=byName(item?.name)||byId(item?.itemId)||item||{};
  const slot=canonical.slot||'Head',klass=canonical.class||'',tier=Math.max(1,Math.min(4,Number(canonical.tier)||1));
  const base=Number(ART_FIT[slot]?.[klass]??ART_FIT[slot]?.default??.86);
  const tierAdjust=tier>=3?.95:tier===2?.98:1;
  return Math.max(.64,Math.min(1,base*tierAdjust));
}
function artCoordinates(item,size=64){
  if(!item)return null;
  const canonical=byName(item.name)||byId(item.itemId)||item;
  const classIndex=Number.isInteger(canonical.classIndex)?canonical.classIndex:CLASS_ORDER.indexOf(canonical.class);
  const slotIndex=CORE_SLOT_ORDER.indexOf(canonical.slot);
  const rawRow=Number.isInteger(canonical.rowIndex)?canonical.rowIndex:Math.max(0,(canonical.tier||1)-1),rowIndex=Math.min(2,rawRow);
  if(classIndex<0||slotIndex<0||rawRow<0)return null;
  return {canonical,col:classIndex*3+slotIndex,row:rowIndex,size};
}
function artStyle(item,size=64){
  const pos=artCoordinates(item,size);
  return pos?`display:inline-block;position:relative;overflow:hidden;width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;background:#070b0e;`:''
}
function artHTML(item,size=64,extra=''){
  if(item?.questArtMaterial&&window.CellboundProfessions?.materialArtHTML)return window.CellboundProfessions.materialArtHTML(item.questArtMaterial,size,'gear-art quest-gear-art '+extra);
  const pos=artCoordinates(item,size),canonical=pos?.canonical||byName(item?.name)||byId(item?.itemId)||item;
  if(!canonical)return`<span class="gear-art gear-art-empty ${extra}" style="display:inline-grid;width:${size}px;height:${size}px;place-items:center">◇</span>`;
  if(!pos){const glyph=SLOT_GLYPHS[canonical.slot]||'◇';return`<span class="gear-art gear-art-fallback gear-slot-${slug(canonical.slot||'item')} ${extra}" style="display:inline-grid;width:${size}px;height:${size}px;place-items:center;font-size:${Math.max(18,Math.round(size*.42))}px" aria-label="${canonical.name||canonical.slot}" title="${canonical.name||canonical.slot}">${glyph}</span>`}
  const glyph=SLOT_GLYPHS[canonical.slot]||'◇',fit=artFit(canonical),cell=Math.max(1,Math.round(size*fit)),inset=Math.round((size-cell)/2);
  const slotClass='gear-slot-'+slug(canonical.slot||'item'),classClass='gear-class-'+slug(canonical.class||'all');
  return `<span class="gear-art tier-${canonical.tier||1} ${slotClass} ${classClass} ${extra}" data-gear-fit="${fit.toFixed(3)}" style="${artStyle(canonical,size)}" aria-label="${canonical.name}" title="${canonical.name}"><span class="gear-art-fallback" aria-hidden="true">${glyph}</span><span class="gear-art-cell" aria-hidden="true" style="position:absolute;overflow:hidden;width:${cell}px;height:${cell}px;left:${inset}px;top:${inset}px"><img class="gear-art-sprite" src="./assets/gear/cellbound-gear-atlas.webp?v=4" alt="" draggable="false" onerror="this.style.display='none'" style="position:absolute;max-width:none;width:${21*cell}px;height:${3*cell}px;left:-${pos.col*cell}px;top:-${pos.row*cell}px"></span></span>`;
}
window.CellboundGear={CLASS_ORDER,CORE_SLOT_ORDER,SLOT_ORDER,EQUIPMENT_POSITION_ORDER,SLOT_GLYPHS,TIER_META,ITEM_LEVELS,CHAPTER_GEAR,STAT_DEFS,SLOT_STAT_BUDGET,STAT_TYPE_BUDGET,CLASS_STAT_POOLS,SPEC_IDEALS,SET_META,SET_BONUS_RULES,setPieceCount,setBonusState,NAMES,items,byId,byName,starterSet,poolForTier,rollItemAffixes,rollDungeonLoot,effectiveStatBudget,statLines,aggregateStats,rollSignature,idealStats,rollFit,itemScoreFor,questProfileStats,createQuestGear,artFit,artStyle,artHTML};
})();