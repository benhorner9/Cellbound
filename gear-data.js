(()=>{
'use strict';

const ATLAS='./assets/gear/cellbound-gear-atlas.webp';
const CLASS_ORDER=['Warrior','Paladin','Priest','Druid','Hunter','Rogue','Mage'];
const SLOT_ORDER=['Head','Chest','Weapon'];
const TIER_META={
  1:{rarity:'Common',colour:'White',dropEnabled:true,label:'Tier 1'},
  2:{rarity:'Uncommon',colour:'Green',dropEnabled:true,label:'Tier 2'},
  3:{rarity:'Rare',colour:'Blue',dropEnabled:false,label:'Tier 3'}
};
const SETS={
  Warrior:{1:{Head:'Militia Helm',Chest:'Worn Breastplate',Weapon:'Training Sword'},2:{Head:'Ashguard Helm',Chest:'Ashguard Plate',Weapon:'Embercleaver'},3:{Head:'Vaultforged Greathelm',Chest:'Vaultforged Cuirass',Weapon:'Runic Greatblade'}},
  Paladin:{1:{Head:'Novice Crown',Chest:'Oathbound Mail',Weapon:'Blessed Mace'},2:{Head:'Sunwarden Helm',Chest:'Sunwarden Plate',Weapon:'Sunwarden Hammer'},3:{Head:'Radiant Aegis Crown',Chest:'Radiant Aegis Plate',Weapon:'Dawnkeeper Hammer'}},
  Priest:{1:{Head:'Acolyte Hood',Chest:'Prayer Vestments',Weapon:'Cedar Staff'},2:{Head:'Chapelweave Cowl',Chest:'Chapelweave Robe',Weapon:'Lightwell Rod'},3:{Head:'Saintglass Halo',Chest:'Saintglass Vestments',Weapon:'Seraphic Staff'}},
  Druid:{1:{Head:'Rootwoven Hood',Chest:'Barkhide Garb',Weapon:'Living Branch'},2:{Head:'Wildbloom Hood',Chest:'Wildbloom Raiment',Weapon:'Thornstaff'},3:{Head:'Moonbark Crown',Chest:'Moonbark Regalia',Weapon:'Starroot Scepter'}},
  Hunter:{1:{Head:'Tracker Hood',Chest:'Leather Jerkin',Weapon:'Ashwood Bow'},2:{Head:'Longshot Hood',Chest:'Longshot Harness',Weapon:'Emberstring Bow'},3:{Head:'Hawkeye Visor',Chest:'Hawkeye Brigandine',Weapon:'Stormflight Longbow'}},
  Rogue:{1:{Head:'Shadowcap',Chest:'Duskleather Tunic',Weapon:'Twin Knives'},2:{Head:'Nightfang Hood',Chest:'Nightfang Jerkin',Weapon:'Venomshivs'},3:{Head:'Shadecoil Mask',Chest:'Shadecoil Vest',Weapon:'Ghostfang Daggers'}},
  Mage:{1:{Head:'Novice Circlet',Chest:'Blueweave Robe',Weapon:'Crystal Wand'},2:{Head:'Spellforge Circlet',Chest:'Spellforge Mantle',Weapon:'Arcglass Rod'},3:{Head:'Starweave Crown',Chest:'Starweave Vestment',Weapon:'Celestine Staff'}}
};
function slug(value){return String(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function spritePosition(className,tier,slot){const classIndex=CLASS_ORDER.indexOf(className),slotIndex=SLOT_ORDER.indexOf(slot),globalColumn=classIndex*3+slotIndex;return{x:(globalColumn/20)*100,y:((tier-1)/2)*100}}
function iconHTML(className,tier,slot){const p=spritePosition(className,tier,slot);return `<i class="cb-item-sprite" style="--gear-x:${p.x}%;--gear-y:${p.y}%" aria-hidden="true"></i>`}
const CATALOG={};
for(const className of CLASS_ORDER){for(const tier of [1,2,3]){for(const slot of SLOT_ORDER){const meta=TIER_META[tier],name=SETS[className][tier][slot],id=`${slug(className)}-t${tier}-${slug(slot)}`;CATALOG[id]={id,name,class:className,classes:[className],slot,tier,rarity:meta.rarity,quality:meta.colour,dropEnabled:meta.dropEnabled,setName:tier===1?`${className} Initiate Set`:tier===2?`${className} Dungeon Set`:`${className} Ascendant Set`,power:0,icon:iconHTML(className,tier,slot)}}}}
function get(className,tier,slot){return CATALOG[`${slug(className)}-t${tier}-${slug(slot)}`]||null}
function cloneItem(item){return item?JSON.parse(JSON.stringify(item)):null}
function equipped(className,tier,slot){const item=cloneItem(get(className,tier,slot));if(!item)return null;item.source=tier===1?'Starting Equipment':'Equipped';return item}
function bankItem(className,tier,slot,source){const item=cloneItem(get(className,tier,slot));if(!item)return null;item.source=source||'Unknown';item.quantity=1;return item}
function all(){return Object.values(CATALOG).map(cloneItem)}
function droppable(tier){return all().filter(i=>i.tier===tier&&i.dropEnabled)}
window.CELLBOUND_GEAR={ATLAS,CLASS_ORDER,SLOT_ORDER,TIER_META,SETS,CATALOG,get,cloneItem,equipped,bankItem,all,droppable,iconHTML};
})();