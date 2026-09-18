(()=>{
'use strict';
const CLASS_ORDER=['Warrior','Paladin','Priest','Druid','Hunter','Rogue','Mage'];
const SLOT_ORDER=['Head','Chest','Weapon'];
const TIER_META={
  1:{rarity:'Common',label:'Tier 1',dropEnabled:true,color:'#e7e7df'},
  2:{rarity:'Uncommon',label:'Tier 2',dropEnabled:true,color:'#55d56a'},
  3:{rarity:'Rare',label:'Tier 3',dropEnabled:false,color:'#4b9fff'}
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
CLASS_ORDER.forEach((klass,classIndex)=>{
  [1,2,3].forEach(tier=>{
    SLOT_ORDER.forEach((slot,slotIndex)=>{
      const meta=TIER_META[tier];
      items.push({
        itemId:`${slug(klass)}-t${tier}-${slug(slot)}`,
        name:NAMES[klass][tier-1][slotIndex],
        class:klass,
        classes:[klass],
        slot,tier,
        rarity:meta.rarity,
        tierLabel:meta.label,
        enabled:true,
        dropEnabled:meta.dropEnabled,
        power:0,
        classIndex,slotIndex,rowIndex:tier-1
      });
    });
  });
});
const byId=id=>items.find(x=>x.itemId===id)||null;
const byName=name=>items.find(x=>x.name===name)||null;
const starterSet=klass=>SLOT_ORDER.map(slot=>items.find(x=>x.class===klass&&x.tier===1&&x.slot===slot));
const poolForTier=tier=>items.filter(x=>x.tier===tier&&x.enabled&&x.dropEnabled);
function rollDungeonLoot(source='Dungeon',tier2Chance=.25){
  const tier=Math.random()<tier2Chance?2:1;
  const pool=poolForTier(tier);
  const base=pool[Math.floor(Math.random()*pool.length)];
  return {...base,source};
}
function artCoordinates(item,size=64){
  if(!item)return null;
  const canonical=byName(item.name)||byId(item.itemId)||item;
  const classIndex=Number.isInteger(canonical.classIndex)?canonical.classIndex:CLASS_ORDER.indexOf(canonical.class);
  const slotIndex=Number.isInteger(canonical.slotIndex)?canonical.slotIndex:SLOT_ORDER.indexOf(canonical.slot);
  const rowIndex=Number.isInteger(canonical.rowIndex)?canonical.rowIndex:Math.max(0,(canonical.tier||1)-1);
  if(classIndex<0||slotIndex<0)return null;
  return {canonical,col:classIndex*3+slotIndex,row:rowIndex,size};
}
function artStyle(item,size=64){
  const pos=artCoordinates(item,size);
  if(!pos)return'';
  return `display:inline-block;position:relative;overflow:hidden;width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;background:#070b0e;`;
}
function artHTML(item,size=64,extra=''){
  const pos=artCoordinates(item,size);
  const canonical=pos?.canonical||byName(item?.name)||byId(item?.itemId)||item;
  if(!pos||!canonical)return`<span class="gear-art gear-art-empty ${extra}" style="display:inline-grid;width:${size}px;height:${size}px;place-items:center">◇</span>`;
  const glyph=canonical.slot==='Head'?'⛑':canonical.slot==='Chest'?'▣':'⚔';
  return `<span class="gear-art tier-${canonical.tier||1} ${extra}" style="${artStyle(canonical,size)}" aria-label="${canonical.name}" title="${canonical.name}"><span class="gear-art-fallback" aria-hidden="true">${glyph}</span><img class="gear-art-sprite" src="./assets/gear/cellbound-gear-atlas.webp?v=2" alt="${canonical.name}" draggable="false" style="position:absolute;max-width:none;width:${21*size}px;height:${3*size}px;left:-${pos.col*size}px;top:-${pos.row*size}px"></span>`;
}
window.CellboundGear={CLASS_ORDER,SLOT_ORDER,TIER_META,NAMES,items,byId,byName,starterSet,poolForTier,rollDungeonLoot,artStyle,artHTML};
})();