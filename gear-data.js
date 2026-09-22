(()=>{
'use strict';
const CLASS_ORDER=['Warrior','Paladin','Priest','Druid','Hunter','Rogue','Mage'];
const SLOT_ORDER=['Head','Chest','Weapon'];
const TIER_META={
  1:{rarity:'Common',label:'Tier 1',dropEnabled:true,color:'#e7e7df',statCount:1},
  2:{rarity:'Uncommon',label:'Tier 2',dropEnabled:true,color:'#55d56a',statCount:2},
  3:{rarity:'Rare',label:'Tier 3',dropEnabled:false,color:'#4b9fff',statCount:3},
  4:{rarity:'Epic',label:'Tier 4',dropEnabled:false,color:'#b06cff',statCount:3,setBonus:true}
};
const STAT_DEFS={
  strength:{label:'Strength',unit:'flat'},agility:{label:'Agility',unit:'flat'},intellect:{label:'Intellect',unit:'flat'},
  stamina:{label:'Stamina',unit:'flat'},armour:{label:'Armour',unit:'flat'},block:{label:'Block',unit:'percent'},
  threat:{label:'Threat',unit:'percent'},healing:{label:'Healing Power',unit:'percent'},crit:{label:'Critical Strike',unit:'percent'},haste:{label:'Haste',unit:'percent'}
};
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
const NAMES={
  Warrior:[['Militia Helm','Worn Breastplate','Training Sword'],['Ashguard Helm','Ashguard Plate','Embercleaver'],['Vaultforged Greathelm','Vaultforged Cuirass','Runic Greatblade']],
  Paladin:[['Novice Crown','Oathbound Mail','Blessed Mace'],['Sunwarden Helm','Sunwarden Plate','Sunwarden Hammer'],['Radiant Aegis Crown','Radiant Aegis Plate','Dawnkeeper Hammer']],
  Priest:[['Acolyte Hood','Prayer Vestments','Cedar Staff'],['Chapelweave Cowl','Chapelweave Robe','Lightwell Rod'],['Saintglass Halo','Saintglass Vestments','Seraphic Staff']],
  Druid:[['Rootwoven Hood','Barkhide Garb','Living Branch'],['Wildbloom Hood','Wildbloom Raiment','Thornstaff'],['Moonbark Crown','Moonbark Regalia','Starroot Scepter']],
  Hunter:[['Tracker Hood','Leather Jerkin','Ashwood Bow'],['Longshot Hood','Longshot Harness','Emberstring Bow'],['Hawkeye Visor','Hawkeye Brigandine','Stormflight Longbow']],
  Rogue:[['Shadowcap','Duskleather Tunic','Twin Knives'],['Nightfang Hood','Nightfang Jerkin','Venomshivs'],['Shadecoil Mask','Shadecoil Vest','Ghostfang Daggers']],
  Mage:[['Novice Circlet','Blueweave Robe','Crystal Wand'],['Spellforge Circlet','Spellforge Mantle','Arcglass Rod'],['Starweave Crown','Starweave Vestment','Celestine Staff']]
};
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const items=[];
CLASS_ORDER.forEach((klass,classIndex)=>{[1,2,3].forEach(tier=>{SLOT_ORDER.forEach((slot,slotIndex)=>{
  const meta=TIER_META[tier];
  items.push({itemId:`${slug(klass)}-t${tier}-${slug(slot)}`,name:NAMES[klass][tier-1][slotIndex],class:klass,classes:[klass],slot,tier,rarity:meta.rarity,tierLabel:meta.label,enabled:true,dropEnabled:meta.dropEnabled,power:0,classIndex,slotIndex,rowIndex:tier-1});
})})});
const byId=id=>items.find(x=>x.itemId===id)||null;
const byName=name=>items.find(x=>x.name===name)||null;
const starterSet=klass=>SLOT_ORDER.map(slot=>items.find(x=>x.class===klass&&x.tier===1&&x.slot===slot));
const poolForTier=tier=>items.filter(x=>x.tier===tier&&x.enabled&&x.dropEnabled);
const rand=(min,max)=>min+Math.floor(Math.random()*(max-min+1));
function statRange(key,tier){
  const t=Math.max(1,Math.min(4,Number(tier)||1));
  if(key==='armour')return [[10,16],[16,25],[25,38],[36,52]][t-1];
  if(STAT_DEFS[key]?.unit==='percent')return [[2,4],[3,6],[5,8],[7,11]][t-1];
  return [[3,6],[5,9],[8,13],[12,18]][t-1];
}
function rollValue(key,tier,slot){
  const [min,max]=statRange(key,tier),mult=slot==='Weapon'?1.12:slot==='Chest'?1.06:1;
  return Math.max(1,Math.round(rand(min,max)*mult));
}
function rollId(){return globalThis.crypto?.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}
function rollItemAffixes(raw){
  if(!raw)return raw;
  const item={...raw},tier=Math.max(1,Math.min(4,Number(item.tier)||1)),count=TIER_META[tier]?.statCount||1;
  const pool=[...(CLASS_STAT_POOLS[item.class]||['stamina','crit','haste'])],stats=[];
  while(stats.length<count&&pool.length){const i=Math.floor(Math.random()*pool.length),key=pool.splice(i,1)[0];stats.push({key,value:rollValue(key,tier,item.slot)})}
  item.bonusStats=stats;item.rollId=rollId();item.affixVersion=1;
  if(tier>=4){item.setId=slug(item.class)+'-t4';item.setName=SET_META[item.class]?.name||item.class+' Tier 4 Set'}
  return item;
}
function rollDungeonLoot(source='Dungeon',tier2Chance=.25){
  const tier=Math.random()<tier2Chance?2:1,pool=poolForTier(tier),base=pool[Math.floor(Math.random()*pool.length)];
  return rollItemAffixes({...base,source});
}
function statLines(item){
  return (Array.isArray(item?.bonusStats)?item.bonusStats:[]).map(s=>{
    const d=STAT_DEFS[s.key]||{label:s.key,unit:'flat'},value=Math.max(0,Number(s.value)||0);
    return {key:s.key,label:d.label,value,unit:d.unit,text:`+${value}${d.unit==='percent'?'%':''} ${d.label}`};
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
  const slotIndex=Number.isInteger(canonical.slotIndex)?canonical.slotIndex:SLOT_ORDER.indexOf(canonical.slot);
  const rowIndex=Number.isInteger(canonical.rowIndex)?canonical.rowIndex:Math.max(0,(canonical.tier||1)-1);
  if(classIndex<0||slotIndex<0||rowIndex<0||rowIndex>2)return null;
  return {canonical,col:classIndex*3+slotIndex,row:rowIndex,size};
}
function artStyle(item,size=64){
  const pos=artCoordinates(item,size);
  return pos?`display:inline-block;position:relative;overflow:hidden;width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;background:#070b0e;`:''
}
function artHTML(item,size=64,extra=''){
  if(item?.questArtMaterial&&window.CellboundProfessions?.materialArtHTML)return window.CellboundProfessions.materialArtHTML(item.questArtMaterial,size,'gear-art quest-gear-art '+extra);
  const pos=artCoordinates(item,size),canonical=pos?.canonical||byName(item?.name)||byId(item?.itemId)||item;
  if(!pos||!canonical)return`<span class="gear-art gear-art-empty ${extra}" style="display:inline-grid;width:${size}px;height:${size}px;place-items:center">◇</span>`;
  const glyph=canonical.slot==='Head'?'⛑':canonical.slot==='Chest'?'▣':'⚔',fit=artFit(canonical),cell=Math.max(1,Math.round(size*fit)),inset=Math.round((size-cell)/2);
  const slotClass='gear-slot-'+slug(canonical.slot||'item'),classClass='gear-class-'+slug(canonical.class||'all');
  return `<span class="gear-art tier-${canonical.tier||1} ${slotClass} ${classClass} ${extra}" data-gear-fit="${fit.toFixed(3)}" style="${artStyle(canonical,size)}" aria-label="${canonical.name}" title="${canonical.name}"><span class="gear-art-fallback" aria-hidden="true">${glyph}</span><span class="gear-art-cell" aria-hidden="true" style="position:absolute;overflow:hidden;width:${cell}px;height:${cell}px;left:${inset}px;top:${inset}px"><img class="gear-art-sprite" src="./assets/gear/cellbound-gear-atlas.webp?v=4" alt="" draggable="false" onerror="this.style.display='none'" style="position:absolute;max-width:none;width:${21*cell}px;height:${3*cell}px;left:-${pos.col*cell}px;top:-${pos.row*cell}px"></span></span>`;
}
window.CellboundGear={CLASS_ORDER,SLOT_ORDER,TIER_META,STAT_DEFS,CLASS_STAT_POOLS,SPEC_IDEALS,SET_META,NAMES,items,byId,byName,starterSet,poolForTier,rollItemAffixes,rollDungeonLoot,statLines,aggregateStats,rollSignature,idealStats,rollFit,itemScoreFor,questProfileStats,createQuestGear,artFit,artStyle,artHTML};
})();