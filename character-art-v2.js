(()=>{
'use strict';

/*
 * Cellbound Illustrated Character Art V2
 * --------------------------------------
 * Source of truth for the new painted character pipeline.
 * Existing saved appearance/equipment data remains valid; this manifest maps
 * that data onto illustrated modular assets as those assets are introduced.
 */
const VERSION='illustrated-v2';
const ASSET_ROOT='./assets/characters/v2';

const RACES={
  Veyren:{
    trait:'Adaptable',
    silhouette:'balanced human-like adventurer',
    feature:'detail',
    body:{shoulders:1,torso:1,legs:1,head:1},
    artDirection:'Grounded human-like fantasy people; practical, weathered and varied.'
  },
  Stoneborn:{
    trait:'Unyielding',
    silhouette:'broad, dense, powerful',
    feature:'stone-ridge',
    body:{shoulders:1.16,torso:1.10,legs:.96,head:1.03},
    artDirection:'Heavy-set people with mineral ridges and weathered stone-like features; not literal rock golems.'
  },
  Aelari:{
    trait:'Soul Attuned',
    silhouette:'tall, elegant, narrow',
    feature:'ear-style',
    body:{shoulders:.91,torso:.95,legs:1.08,head:.98},
    artDirection:'Elegant arcane-attuned people with long ears and refined angular features; grounded rather than ethereal cartoon elves.'
  },
  Thornkin:{
    trait:'Living Guard',
    silhouette:'natural, strong, asymmetrical growth',
    feature:'growth',
    body:{shoulders:1.05,torso:1.02,legs:1,head:1},
    artDirection:'Living woodland people with restrained bark, thorn, leaf and antler-like growths integrated into believable anatomy.'
  },
  Emberkin:{
    trait:'Fierce Blood',
    silhouette:'athletic, horned, heat-marked',
    feature:'ember-crown',
    body:{shoulders:1.05,torso:1.02,legs:1,head:1},
    artDirection:'Horned fire-blooded people with charcoal, ember and heat-scar details; dangerous and grounded, not demonic caricatures.'
  },
  Nymari:{
    trait:'Quickmind',
    silhouette:'lean, fluid, aquatic',
    feature:'fin-crest',
    body:{shoulders:.96,torso:.98,legs:1.04,head:.99},
    artDirection:'Cool-toned amphibious/aquatic people with subtle fins, crests and luminous details; humanoid first, aquatic second.'
  }
};

const APPEARANCE_LAYERS=[
  'body',
  'skin',
  'face',
  'raceFeature',
  'marking',
  'hairBack',
  'facialHair',
  'hairFront'
];

const GEAR_LAYERS=[
  'Feet',
  'Legs',
  'Chest',
  'Waist',
  'Hands',
  'Shoulders',
  'OffHand',
  'Weapon',
  'Head'
];

const NON_VISUAL_EQUIPMENT=new Set(['Ring1','Ring2','Trinket1','Trinket2','Relic']);

function slug(v){
  return String(v==null?'':v).trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
function index(v,fallback=0){
  const n=Math.max(0,Math.floor(Number(v)));
  return Number.isFinite(n)?n:fallback;
}
function raceOf(c){
  const race=c?.race||c?.appearance?.race||'Veyren';
  return RACES[race]?race:'Veyren';
}
function appearanceOf(c){
  const a=c?.appearance||{};
  return {
    race:raceOf(c),
    skinTone:index(a.skinTone),
    face:index(a.face),
    hair:index(a.hair),
    hairColor:index(a.hairColor),
    facialHair:index(a.facialHair),
    marking:index(a.marking),
    eyes:index(a.eyes),
    feature:index(a.feature)
  };
}
function itemId(item,slot){
  if(!item)return'';
  return slug(item.appearanceId||item.visualStyle||item.baseItemId||item.itemId||item.name||slot);
}
function raceRoot(race){return ASSET_ROOT+'/races/'+slug(race)}
function basePath(c){return raceRoot(raceOf(c))+'/base.webp'}
function facePath(c){const a=appearanceOf(c);return raceRoot(a.race)+'/face/face-'+a.face+'.webp'}
function skinPath(c){const a=appearanceOf(c);return raceRoot(a.race)+'/skin/skin-'+a.skinTone+'.webp'}
function featurePath(c){const a=appearanceOf(c);return raceRoot(a.race)+'/feature/feature-'+a.feature+'.webp'}
function markingPath(c){const a=appearanceOf(c);return raceRoot(a.race)+'/marking/marking-'+a.marking+'.webp'}
function hairPath(c,part='front'){
  const a=appearanceOf(c);
  return raceRoot(a.race)+'/hair/'+part+'-'+a.hair+'-colour-'+a.hairColor+'.webp';
}
function facialHairPath(c){
  const a=appearanceOf(c);
  return raceRoot(a.race)+'/facial-hair/facial-hair-'+a.facialHair+'-colour-'+a.hairColor+'.webp';
}
function gearPath(c,slot){
  const item=c?.equipment?.[slot]||(slot==='Weapon'?c?.equipment?.MainHand:null);
  const id=itemId(item,slot);
  return id?ASSET_ROOT+'/gear/'+slug(slot)+'/'+id+'.webp':'';
}
function signature(c){
  const a=appearanceOf(c);
  const gear=GEAR_LAYERS.map(slot=>itemId(c?.equipment?.[slot]||(slot==='Weapon'?c?.equipment?.MainHand:null),slot));
  return [VERSION,a.race,a.skinTone,a.face,a.hair,a.hairColor,a.facialHair,a.marking,a.eyes,a.feature,...gear].join('|');
}
function layerPlan(c){
  return [
    {kind:'appearance',slot:'body',src:basePath(c)},
    {kind:'appearance',slot:'skin',src:skinPath(c)},
    {kind:'appearance',slot:'face',src:facePath(c)},
    {kind:'appearance',slot:'raceFeature',src:featurePath(c)},
    {kind:'appearance',slot:'marking',src:markingPath(c)},
    {kind:'appearance',slot:'hairBack',src:hairPath(c,'back')},
    ...GEAR_LAYERS.filter(slot=>!['Head','Weapon','OffHand'].includes(slot)).map(slot=>({kind:'gear',slot,src:gearPath(c,slot)})).filter(x=>x.src),
    {kind:'appearance',slot:'facialHair',src:facialHairPath(c)},
    {kind:'appearance',slot:'hairFront',src:hairPath(c,'front')},
    ...['OffHand','Weapon','Head'].map(slot=>({kind:'gear',slot,src:gearPath(c,slot)})).filter(x=>x.src)
  ];
}

window.CellboundCharacterArtV2={
  version:VERSION,
  assetRoot:ASSET_ROOT,
  races:RACES,
  appearanceLayers:APPEARANCE_LAYERS,
  gearLayers:GEAR_LAYERS,
  nonVisualEquipment:NON_VISUAL_EQUIPMENT,
  raceOf,
  appearanceOf,
  itemId,
  signature,
  layerPlan,
  paths:{basePath,facePath,skinPath,featurePath,markingPath,hairPath,facialHairPath,gearPath}
};
})();