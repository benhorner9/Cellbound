(()=>{
'use strict';

const VERSION='1.0.0';
const CURRENT_LEVEL_CAP=15;
const CURRENT_SPEC_POINT_CAP=12;
const TALENT_TIER_REQUIREMENTS=[0,2,4,6,8];

const SPEC_ROLES={
  'Warrior|Protection':'tank','Warrior|Arms':'dps',
  'Paladin|Protection':'tank','Paladin|Holy':'healer',
  'Priest|Holy':'healer','Priest|Shadow':'dps',
  'Druid|Restoration':'healer','Druid|Balance':'dps',
  'Hunter|Marksman':'dps','Hunter|Beast Mastery':'dps',
  'Rogue|Assassination':'dps','Rogue|Outlaw':'dps',
  'Mage|Arcane':'dps','Mage|Frost':'dps',
  'Shaman|Restoration':'healer','Shaman|Elemental':'dps',
  'Warlock|Demonology':'dps','Warlock|Destruction':'dps',
  'Monk|Brewmaster':'tank','Monk|Mistweaver':'healer','Monk|Windwalker':'dps',
  'Death Knight|Blood':'tank','Death Knight|Frost':'dps','Death Knight|Unholy':'dps',
  'Demon Hunter|Havoc':'dps','Demon Hunter|Vengeance':'tank',
  'Evoker|Preservation':'healer','Evoker|Devastation':'dps'
};

function clampLevel(level){
  return Math.max(1,Math.min(CURRENT_LEVEL_CAP,Math.floor(Number(level)||1)))
}
function talentBudgetForLevel(level){
  const l=clampLevel(level);
  if(l<=1)return 1;
  return Math.min(CURRENT_SPEC_POINT_CAP,1+Math.floor(((l-1)*(CURRENT_SPEC_POINT_CAP-1))/(CURRENT_LEVEL_CAP-1)))
}
function talentSpent(character,spec=character?.spec){
  const tree=character?.talents?.[spec]||{};
  return Object.values(tree).reduce((n,v)=>n+Math.max(0,Number(v)||0),0)
}
function talentRemaining(character,spec=character?.spec){
  return Math.max(0,talentBudgetForLevel(character?.level)-talentSpent(character,spec))
}
function tierRequirement(tier){
  return TALENT_TIER_REQUIREMENTS[Math.max(0,Math.min(TALENT_TIER_REQUIREMENTS.length-1,Number(tier)||0))]||0
}
function roleFor(klass,spec){
  return SPEC_ROLES[String(klass||'')+'|'+String(spec||'')]||'dps'
}
function syncLegacyTalentCounter(character){
  if(character&&typeof character==='object')character.talent=talentRemaining(character,character.spec);
  return character
}

window.CellboundBuildRules={
  VERSION,CURRENT_LEVEL_CAP,CURRENT_SPEC_POINT_CAP,TALENT_TIER_REQUIREMENTS,SPEC_ROLES,
  talentBudgetForLevel,talentSpent,talentRemaining,tierRequirement,roleFor,syncLegacyTalentCounter
};
})();