// Block 02: offline-local character development. Never trust this state for online trading or PvP.
export const PROFILE_KEY='emberfall-company-v1';
export const MAX_LEVEL=6;
export const HERO_IDS=Object.freeze(['knight','ranger','mage','cleric']);
export const HERO_NAMES=Object.freeze({knight:'Aldric',ranger:'Briar',mage:'Lyra',cleric:'Solen'});
export const PARTY_SIZE=4;
export const TALENT_RESPEC_COST=60;
export const PARTY_ROLES=Object.freeze({knight:'Guardian · Frontline',ranger:'Ranger · Damage',mage:'Arcanist · Magic',cleric:'Cleric · Support'});
export const DEFAULT_PARTY=Object.freeze([...HERO_IDS]);
export function partyOrder(profile){
 const order=profile?.partyOrder;
 return Array.isArray(order)&&order.length===PARTY_SIZE&&new Set(order).size===PARTY_SIZE&&HERO_IDS.every(id=>order.includes(id))?[...order]:[...DEFAULT_PARTY];
}
export function swapPartyMembers(profile,from,to){
 if(!validateProfile(profile)||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=PARTY_SIZE||to>=PARTY_SIZE||from===to)return false;
 const order=partyOrder(profile);[order[from],order[to]]=[order[to],order[from]];
 profile.partyOrder=order;return true;
}
export function respecTalents(profile,heroId){
 if(!validateProfile(profile)||!HERO_IDS.includes(heroId)||!profile.heroes[heroId].talents.length||profile.gold<TALENT_RESPEC_COST)return false;
 profile.gold-=TALENT_RESPEC_COST;profile.heroes[heroId].talents=[];return true;
}
// Keep legacy "armour" (Body) and "charm" (Amulet) keys so existing items,
// builds and browser saves retain their exact owned instance references.
export const SLOTS=Object.freeze(['helm','charm','armour','legs','gloves','boots','ring','weapon','offhand']);
const LEGACY_SLOTS=new Set(['weapon','armour','charm']);
export const SLOT_NAMES=Object.freeze({helm:'Helm',charm:'Amulet',armour:'Body',legs:'Legs',gloves:'Gloves',boots:'Boots',ring:'Ring',weapon:'Weapon',offhand:'Off Hand'});
export const SLOT_ICONS=Object.freeze({helm:'🪖',charm:'📿',armour:'🛡️',legs:'🩳',gloves:'🧤',boots:'👢',ring:'💍',weapon:'⚔️',offhand:'🛡️'});

export const SKILL_CAP=20;
export const SKILL_IDS=Object.freeze(['smithing','alchemy']);
export const MATERIAL_GROUPS=Object.freeze({
 thornwarden:{tier:'verdant',ore:'verdant-ore',essence:'verdant-essence',seal:'verdant-seal'},
 cindermaw:{tier:'ember',ore:'ember-ore',essence:'ember-essence',seal:'ember-seal'},
 tempest:{tier:'tempest',ore:'tempest-ore',essence:'tempest-essence',seal:'tempest-seal'}
});
export const MATERIAL_DEFS=Object.freeze({
 'verdant-ore':{name:'Ironroot Ore',icon:'🪨'},'verdant-essence':{name:'Verdant Essence',icon:'🌿'},'verdant-seal':{name:'Thornwarden Mark',icon:'🍃'},
 'ember-ore':{name:'Cinder Ore',icon:'🪨'},'ember-essence':{name:'Ember Essence',icon:'🔥'},'ember-seal':{name:'Cindermaw Mark',icon:'☄️'},
 'tempest-ore':{name:'Skyiron Ore',icon:'🪨'},'tempest-essence':{name:'Storm Essence',icon:'⚡'},'tempest-seal':{name:'Tempest Mark',icon:'🌀'}
});
const CRAFT_THEMES=Object.freeze({
 verdant:{title:'Ironroot',boss:'thornwarden',purple:'verdant-aegis',purpleName:'Ironroot Aegis',purpleIcon:'🛡️',purpleSlot:'offhand',purpleBonus:{health:28,armour:4,shielding:.12}},
 ember:{title:'Cinderforged',boss:'cindermaw',purple:'ember-catalyst',purpleName:'Cinderheart Catalyst',purpleIcon:'💠',purpleSlot:'charm',purpleBonus:{attack:7,fire:.18,health:14}},
 tempest:{title:'Skywoven',boss:'tempest',purple:'tempest-focus',purpleName:'Skywoven Focus',purpleIcon:'🔮',purpleSlot:'weapon',purpleBonus:{attack:14,cooldown:.11}}
});
const SET_SLOT_BONUSES=Object.freeze({helm:{health:12,armour:1},legs:{health:18},gloves:{attack:3},boots:{speed:9}});
const SET_SLOT_LEVELS=Object.freeze({helm:1,legs:3,gloves:5,boots:7});
const SET_SLOT_NAMES=Object.freeze({helm:'Helm',legs:'Legguards',gloves:'Grips',boots:'Boots'});
const SET_SLOT_KEYS=Object.freeze(Object.keys(SET_SLOT_LEVELS));
const FORGED_SET_ITEMS=Object.fromEntries(Object.entries(CRAFT_THEMES).flatMap(([theme,info])=>
 SET_SLOT_KEYS.map(slot=>[theme+'-'+slot,{name:info.title+' '+SET_SLOT_NAMES[slot],icon:SLOT_ICONS[slot],slot,rarity:'Uncommon',bonus:SET_SLOT_BONUSES[slot],value:66+SET_SLOT_LEVELS[slot]*10}])
));
const FORGED_PURPLE_ITEMS=Object.fromEntries(Object.values(CRAFT_THEMES).map(info=>[info.purple,{
 name:info.purpleName,icon:info.purpleIcon,slot:info.purpleSlot,rarity:'Epic',bonus:info.purpleBonus,value:350
}]));
export const ALCHEMY_EFFECTS=Object.freeze({
 'verdant-draught':{name:'Ironroot Vitality Draught',icon:'🧪',bonus:{health:20}},
 'ember-elixir':{name:'Ember Assault Elixir',icon:'🧪',bonus:{attack:5}},
 'tempest-phial':{name:'Tempest Haste Phial',icon:'🧪',bonus:{speed:12}},
 'verdant-grand':{name:'Grand Vitality Tonic',icon:'💚',bonus:{health:38}},
 'ember-grand':{name:'Grand Flame Tonic',icon:'❤️‍🔥',bonus:{attack:8,fire:.1}},
 'tempest-grand':{name:'Grand Storm Tonic',icon:'💙',bonus:{speed:20,cooldown:.06}}
});
export const CRAFT_RECIPES=Object.freeze([
 ...Object.entries(CRAFT_THEMES).flatMap(([key,info])=>{
  const mat=MATERIAL_GROUPS[info.boss];
  return SET_SLOT_KEYS.map(slot=>({id:'forge-'+key+'-'+slot,skill:'smithing',level:SET_SLOT_LEVELS[slot],
   name:FORGED_SET_ITEMS[key+'-'+slot].name,icon:SLOT_ICONS[slot],product:key+'-'+slot,rarity:'Uncommon',
   xp:80+SET_SLOT_LEVELS[slot]*12,materials:{[mat.ore]:2+Math.floor(SET_SLOT_LEVELS[slot]/2),[mat.seal]:2+Math.floor(SET_SLOT_LEVELS[slot]/2)}}));
 }),
 ...Object.entries(CRAFT_THEMES).map(([key,info],index)=>{
  const mat=MATERIAL_GROUPS[info.boss];
  return {id:'forge-'+info.purple,skill:'smithing',level:10+index*2,name:info.purpleName,icon:info.purpleIcon,
   product:info.purple,rarity:'Epic',xp:260+index*40,materials:{[mat.ore]:8,[mat.essence]:6,[mat.seal]:5}};
 }),
 ...Object.entries(CRAFT_THEMES).flatMap(([key,info],index)=>{
  const mat=MATERIAL_GROUPS[info.boss],products=[['verdant-draught','verdant-grand'],['ember-elixir','ember-grand'],['tempest-phial','tempest-grand']][index];
  return products.map((product,tier)=>({id:'brew-'+product,skill:'alchemy',level:tier===0?1+index*3:10+index*2,
   name:ALCHEMY_EFFECTS[product].name,icon:ALCHEMY_EFFECTS[product].icon,product,rarity:'Consumable',
   xp:tier===0?85+index*32:270+index*44,
   materials:{[mat.essence]:tier===0?2:5,[mat.ore]:tier===0?1:3,[mat.seal]:tier===0?0:2},
   mix:[mat.essence,mat.ore]}));
 })
]);
export const FUTURE_CRAFTS=Object.freeze([
 {skill:'smithing',level:25,name:'Mythic Warden Armour',icon:'🛡️'},
 {skill:'smithing',level:30,name:'Runeforged Relic Weapon',icon:'⚔️'},
 {skill:'alchemy',level:25,name:'Spiritbound Restoration',icon:'🧪'},
 {skill:'alchemy',level:30,name:'Celestial Battle Elixir',icon:'✨'}
]);
export function skillXpNeeded(level){return level>=SKILL_CAP?0:40+20*level;}
function blankCrafting(){
 return {skills:Object.fromEntries(SKILL_IDS.map(id=>[id,{level:1,xp:0}])),
  materials:Object.fromEntries(Object.keys(MATERIAL_DEFS).map(id=>[id,0])),
  potions:Object.fromEntries(Object.keys(ALCHEMY_EFFECTS).map(id=>[id,0])),preparedElixir:null};
}
export function craftingStatus(profile,recipeId){
 const recipe=CRAFT_RECIPES.find(r=>r.id===recipeId);
 if(!recipe)return {ok:false,reason:'Recipe is not available.'};
 const skill=profile?.skills?.[recipe.skill];
 if(!skill||skill.level<recipe.level)return {ok:false,reason:'Requires '+recipe.skill+' level '+recipe.level+'.'};
 for(const [id,count] of Object.entries(recipe.materials))if((profile.materials?.[id]||0)<count)
  return {ok:false,reason:'Not enough '+MATERIAL_DEFS[id].name+'.'};
 if(recipe.skill==='smithing'&&profile.items.length>=400)return {ok:false,reason:'Equipment bag is full.'};
 if(recipe.skill==='alchemy'&&(profile.potions[recipe.product]||0)>=99999)return {ok:false,reason:'Potion storage is full.'};
 return {ok:true,recipe};
}
export function craftRecipe(profile,recipeId,attempt){
 if(!validateProfile(profile))return {ok:false,reason:'Invalid company save.'};
 normalizeProfileSlots(profile);
 const status=craftingStatus(profile,recipeId);
 if(!status.ok)return status;
 const recipe=status.recipe;
 // Smithing is a real timing check; failed attempts consume nothing and give no XP.
 if(recipe.skill==='smithing'&&(!Number.isFinite(attempt?.strike)||attempt.strike<30||attempt.strike>70))
  return {ok:false,reason:'The strike missed the hot metal. Try the timing again.'};
 // Alchemy is a two-step mixing challenge: essence first, ore second.
 if(recipe.skill==='alchemy'&&(!Array.isArray(attempt?.mix)||attempt.mix.length!==2||
   attempt.mix.some((id,i)=>id!==recipe.mix[i])))
  return {ok:false,reason:'Incorrect mixing order. Combine essence first, then ore.'};
 for(const [id,n] of Object.entries(recipe.materials))profile.materials[id]-=n;
 const item=recipe.skill==='smithing'?addItem(profile,recipe.product):null;
 if(recipe.skill==='alchemy')profile.potions[recipe.product]++;
 const sk=profile.skills[recipe.skill],before=sk.level;
 sk.xp+=recipe.xp;
 while(sk.level<SKILL_CAP&&sk.xp>=skillXpNeeded(sk.level)){sk.xp-=skillXpNeeded(sk.level);sk.level++;}
 if(sk.level===SKILL_CAP)sk.xp=0;
 return {ok:true,recipeId,item,product:recipe.product,xp:recipe.xp,levelFrom:before,levelTo:sk.level};
}
export function prepareElixir(profile,id){
 if(!validateProfile(profile)||!Object.hasOwn(ALCHEMY_EFFECTS,id))return false;
 normalizeProfileSlots(profile);
 if((profile.potions[id]||0)<1)return false;
 if(profile.preparedElixir)profile.potions[profile.preparedElixir]++;
 profile.potions[id]--;profile.preparedElixir=id;return true;
}
export function consumePreparedElixir(profile){
 if(!validateProfile(profile))return null;
 const chosen=profile.preparedElixir||null;
 if(chosen)profile.preparedElixir=null;
 return chosen;
}

export function normalizeProfileSlots(profile){
 if(profile&&profile.partyOrder===undefined)profile.partyOrder=[...DEFAULT_PARTY];
 if(profile&&(!profile.skills||!profile.materials||!profile.potions)){
  const blank=blankCrafting();
  for(const field of ['skills','materials','potions'])if(profile[field]===undefined)profile[field]=blank[field];
 }
 if(profile){
  const blank=blankCrafting();
  for(const id of SKILL_IDS)if(profile.skills&&profile.skills[id]===undefined)profile.skills[id]=blank.skills[id];
  for(const id of Object.keys(MATERIAL_DEFS))if(profile.materials&&profile.materials[id]===undefined)profile.materials[id]=0;
  for(const id of Object.keys(ALCHEMY_EFFECTS))if(profile.potions&&profile.potions[id]===undefined)profile.potions[id]=0;
 }
 if(profile&&profile.preparedElixir===undefined)profile.preparedElixir=null;
 for(const id of HERO_IDS)for(const slot of SLOTS){
  const gear=profile?.heroes?.[id]?.gear;
  if(gear&&gear[slot]===undefined)gear[slot]=null;
 }
 return profile;
}
export const ITEM_DEFS=Object.freeze({
 'recruit-sword':{name:'Mercenary Blade',icon:'⚔️',slot:'weapon',rarity:'Common',classes:['knight'],bonus:{attack:3},value:40,shop:65},
 'briar-bow':{name:'Briarwood Bow',icon:'🏹',slot:'weapon',rarity:'Common',classes:['ranger'],bonus:{attack:4},value:36,shop:58},
 'apprentice-focus':{name:'Apprentice Focus',icon:'🔮',slot:'weapon',rarity:'Common',classes:['mage','cleric'],bonus:{attack:3,healing:.05},value:38,shop:60},
 'field-vest':{name:'Fieldkeeper Vest',icon:'🥋',slot:'armour',rarity:'Common',bonus:{health:14},value:30,shop:52},
 'brass-charm':{name:'Sunlit Medallion',icon:'📿',slot:'charm',rarity:'Common',bonus:{health:9},value:27,shop:48},
 // Common starter pieces for the six newly functional worn slots. All are shop gear;
 // existing boss drop distributions and rarity/set progression remain unchanged.
 'village-helm':{name:'Village Helm',icon:'🪖',slot:'helm',rarity:'Common',bonus:{health:6,armour:1},value:18,shop:34},
 'traveller-leggings':{name:'Traveller Leggings',icon:'🩳',slot:'legs',rarity:'Common',bonus:{health:8},value:18,shop:36},
 'leather-gloves':{name:'Leather Gloves',icon:'🧤',slot:'gloves',rarity:'Common',bonus:{attack:1},value:14,shop:28},
 'roadworn-boots':{name:'Roadworn Boots',icon:'👢',slot:'boots',rarity:'Common',bonus:{speed:4},value:15,shop:30},
 'bronze-band':{name:'Bronze Band',icon:'💍',slot:'ring',rarity:'Common',bonus:{health:4},value:12,shop:24},
 'worn-buckler':{name:'Worn Buckler',icon:'🛡️',slot:'offhand',rarity:'Common',bonus:{armour:2},value:20,shop:38},
 'ironroot-edge':{name:'Ironroot Edge',icon:'🗡️',slot:'weapon',rarity:'Uncommon',classes:['knight'],bonus:{attack:7,health:10},value:92},
 'thornsight-bow':{name:'Thornsight Longbow',icon:'🏹',slot:'weapon',rarity:'Uncommon',classes:['ranger'],bonus:{attack:8},value:88},
 'emberglass-staff':{name:'Emberglass Staff',icon:'🔥',slot:'weapon',rarity:'Rare',classes:['mage'],bonus:{attack:7,fire:.16},value:164},
 'hallowed-censer':{name:'Hallowed Censer',icon:'✚',slot:'weapon',rarity:'Rare',classes:['cleric'],bonus:{attack:3,healing:.21},value:160},
 'brambleguard':{name:'Brambleguard Plate',icon:'🛡️',slot:'armour',rarity:'Rare',classes:['knight'],bonus:{health:34,armour:3},value:165},
 'wildweave':{name:'Wildweave Mantle',icon:'🧥',slot:'armour',rarity:'Uncommon',bonus:{health:20,speed:8},value:96},
 'thornsap-pendant':{name:'Thornsap Pendant',icon:'🌿',slot:'charm',rarity:'Uncommon',bonus:{healing:.12,health:8},value:110},
 'warden-heart':{name:'Heart of the Thornwarden',icon:'💎',slot:'charm',rarity:'Rare',bonus:{health:36,attack:9,skillPower:.12},value:720},
 'ember-sabre':{name:'Cinderforged Sabre',icon:'🔥',slot:'weapon',rarity:'Uncommon',classes:['knight'],bonus:{attack:11},value:118},
 'ash-bow':{name:'Ashstring Bow',icon:'🏹',slot:'weapon',rarity:'Uncommon',classes:['ranger'],bonus:{attack:10,speed:6},value:120},
 'fireweave':{name:'Fireweave Robes',icon:'🧥',slot:'armour',rarity:'Uncommon',bonus:{health:24,armour:1},value:116},
 'forgeguard':{name:'Forgeguard Harness',icon:'🛡️',slot:'armour',rarity:'Rare',bonus:{health:42,armour:4},value:240},
 'molten-focus':{name:'Molten Focus',icon:'🔮',slot:'weapon',rarity:'Rare',classes:['mage'],bonus:{attack:9,fire:.22},value:255},
 'phoenix-ash':{name:'Phoenix Ash Charm',icon:'✨',slot:'charm',rarity:'Rare',bonus:{health:15,healing:.19},value:270},
 'cinderheart':{name:'The Cinderheart',icon:'❤️‍🔥',slot:'charm',rarity:'Rare',bonus:{attack:14,health:22,fire:.25},value:890},
 'windpiercer':{name:'Windpiercer',icon:'🏹',slot:'weapon',rarity:'Uncommon',classes:['ranger'],bonus:{attack:12,speed:8},value:145},
 'stormscale':{name:'Stormscale Coat',icon:'🥋',slot:'armour',rarity:'Uncommon',bonus:{health:27,speed:13},value:140},
 'zephyr-charm':{name:'Zephyr Talisman',icon:'🪶',slot:'charm',rarity:'Uncommon',bonus:{speedMultiplier:.16,health:12},value:144},
 'thunder-edge':{name:'Thunderclap Blade',icon:'⚡',slot:'weapon',rarity:'Rare',classes:['knight'],bonus:{attack:15,armour:2},value:285},
 'cloudstaff':{name:'Cloudweaver Staff',icon:'🌩️',slot:'weapon',rarity:'Rare',classes:['mage'],bonus:{attack:13,cooldown:.12},value:290},
 'skywarden-censer':{name:'Skywarden Censer',icon:'✚',slot:'weapon',rarity:'Rare',classes:['cleric'],bonus:{healing:.28,health:16},value:285},
 'tempest-eye':{name:'Eye of the Tempest',icon:'💠',slot:'charm',rarity:'Rare',bonus:{attack:12,health:30,cooldown:.18},value:1100},
 ...FORGED_SET_ITEMS,
 ...FORGED_PURPLE_ITEMS
});

// Block 04 — complete original boss collections reward thoughtful gear combinations.
// Set assignments are based on existing item definitions: no extra items or save migration.
export const SET_DEFS=Object.freeze({
 verdant:{name:'Verdant Covenant',icon:'🌿',source:'Thornwarden',description:'Restorative woodland relics.',
  pieces2:{health:16,healing:.06},pieces4:{shielding:.14}},
 ember:{name:'Emberforged',icon:'🔥',source:'Cindermaw',description:'Ash-forged equipment that rewards aggression.',
  pieces2:{attack:4,fire:.08},pieces4:{damage:.08}},
 tempest:{name:'Tempestbound',icon:'⚡',source:'Tempest Seraph',description:'Storm relics for fast-moving ability users.',
  pieces2:{speedMultiplier:.08,cooldown:.05},pieces4:{skillPower:.12}}
});
export const ITEM_SETS=Object.freeze({
 'ironroot-edge':'verdant','thornsight-bow':'verdant','wildweave':'verdant',
 'brambleguard':'verdant','thornsap-pendant':'verdant','warden-heart':'verdant',
 'ember-sabre':'ember','ash-bow':'ember','fireweave':'ember','forgeguard':'ember',
 'molten-focus':'ember','phoenix-ash':'ember','cinderheart':'ember',
 'windpiercer':'tempest','stormscale':'tempest','zephyr-charm':'tempest',
 'thunder-edge':'tempest','cloudstaff':'tempest','skywarden-censer':'tempest','tempest-eye':'tempest',
 ...Object.fromEntries(Object.keys(FORGED_SET_ITEMS).map(id=>[id,id.split('-')[0]])),
 ...Object.fromEntries(Object.entries(CRAFT_THEMES).map(([key,val])=>[val.purple,key]))
});
export function itemSet(defId){return ITEM_SETS[defId]||null;}
export function setProgress(p,heroId){
 const hero=p?.heroes?.[heroId];if(!hero)return [];
 const counts={verdant:0,ember:0,tempest:0};
 for(const slot of SLOTS){
  const inst=p.items.find(i=>i.id===hero.gear?.[slot]);
  const key=inst&&ITEM_SETS[inst.defId];if(key)counts[key]++;
 }
 return Object.entries(counts).map(([id,count])=>{
  const data=SET_DEFS[id],bonus={};
  if(count>=2)for(const [k,v] of Object.entries(data.pieces2))bonus[k]=(bonus[k]||0)+v;
  if(count>=4)for(const [k,v] of Object.entries(data.pieces4))bonus[k]=(bonus[k]||0)+v;
  return {id,name:data.name,icon:data.icon,count,bonus,source:data.source,
   next:count<2?2:count<4?4:null};
 });
}

export const TALENTS=Object.freeze({
 knight:[
  {id:'ironwall',tier:2,name:'Ironwall',icon:'🛡️',description:'Shield Wall protects allies 25% more.',bonus:{shielding:.25}},
  {id:'battle_vow',tier:2,name:'Battle Vow',icon:'⚔️',description:'Increase automatic and ability damage by 15%.',bonus:{damage:.15}},
  {id:'stout_heart',tier:4,name:'Stout Heart',icon:'♥',description:'Gain 26 maximum health and 2 armour.',bonus:{health:26,armour:2}},
  {id:'lionheart',tier:4,name:'Lionheart',icon:'✦',description:'Deal 20% more ability damage.',bonus:{skillPower:.20}}
 ],
 ranger:[
  {id:'keen_sight',tier:2,name:'Keen Sight',icon:'🎯',description:'Increase attack damage by 18%.',bonus:{damage:.18}},
  {id:'fleetfoot',tier:2,name:'Fleetfoot',icon:'↝',description:'Move 20% faster across the battlefield.',bonus:{speedMultiplier:.20}},
  {id:'rainmaker',tier:4,name:'Rainmaker',icon:'➶',description:'Arrow Storm gains 25% more damage.',bonus:{arrowPower:.25}},
  {id:'quickdraw',tier:4,name:'Quickdraw',icon:'⌛',description:'Abilities recharge 16% faster.',bonus:{cooldown:.16}}
 ],
 mage:[
  {id:'firebrand',tier:2,name:'Firebrand',icon:'🔥',description:'Emberburst deals 28% more fire damage.',bonus:{fire:.28}},
  {id:'frostborn',tier:2,name:'Frostborn',icon:'❄',description:'Frostbind lasts 1.1 seconds longer.',bonus:{frostDuration:1.1}},
  {id:'spellweaver',tier:4,name:'Spellweaver',icon:'✦',description:'All special abilities deal 17% more damage.',bonus:{skillPower:.17}},
  {id:'swiftcasting',tier:4,name:'Swiftcasting',icon:'⌛',description:'Abilities recharge 16% faster.',bonus:{cooldown:.16}}
 ],
 cleric:[
  {id:'lifebloom',tier:2,name:'Lifebloom',icon:'✚',description:'Increase healing output by 25%.',bonus:{healing:.25}},
  {id:'wardkeeper',tier:2,name:'Wardkeeper',icon:'🛡️',description:'Sanctuary protects allies 25% more.',bonus:{shielding:.25}},
  {id:'radiant_grace',tier:4,name:'Radiant Grace',icon:'☀',description:'Increase healing output by a further 19%.',bonus:{healing:.19}},
  {id:'renewed_spirit',tier:4,name:'Renewed Spirit',icon:'♥',description:'Gain 22 maximum health and 10% quicker abilities.',bonus:{health:22,cooldown:.10}}
 ]
});
export const DROP_TABLE=Object.freeze([
 {id:'ironroot-edge',weight:19},{id:'thornsight-bow',weight:19},
 {id:'wildweave',weight:18},{id:'thornsap-pendant',weight:18},
 {id:'emberglass-staff',weight:8},{id:'hallowed-censer',weight:8},
 {id:'brambleguard',weight:8},{id:'warden-heart',weight:2}
]);
export const BOSSES=Object.freeze({
 thornwarden:{id:'thornwarden',name:'Thornwarden',place:"Thornwarden's Hollow",chapter:'I · THE VERDANT RUINS',unlock:1,
  icon:'🌿',description:'Survive marked root slams and bramblekin reinforcements.',mechanics:'Root Slam: leave the red circle. Bramblekin join the fight below 42% health.',color:'#c39c76',xp:145,gold:80,health:720,damage:18,interval:2.15,speed:62,attackDelay:7,attackCycle:8.5,
  drops:[{id:'ironroot-edge',weight:19},{id:'thornsight-bow',weight:19},{id:'wildweave',weight:18},{id:'thornsap-pendant',weight:18},{id:'emberglass-staff',weight:8},{id:'hallowed-censer',weight:8},{id:'brambleguard',weight:8},{id:'warden-heart',weight:2}]},
 cindermaw:{id:'cindermaw',name:'Cindermaw',place:'The Ashen Foundry',chapter:'II · ASHEN FOUNDRY',unlock:2,
  icon:'🔥',description:'Dodge a cone of furnace fire and endure the molten enrage.',mechanics:'Furnace Breath: move out of the orange cone. Below 45% health the furnace erupts and flame imps arrive.',color:'#f0a267',xp:195,gold:115,health:865,damage:21,interval:2.05,speed:68,attackDelay:6,attackCycle:7.4,
  drops:[{id:'ember-sabre',weight:23},{id:'ash-bow',weight:20},{id:'fireweave',weight:20},{id:'forgeguard',weight:13},{id:'molten-focus',weight:12},{id:'phoenix-ash',weight:10},{id:'cinderheart',weight:2}]},
 tempest:{id:'tempest',name:'Tempest Seraph',place:'Skybreak Spire',chapter:'III · SKYBREAK SPIRE',unlock:4,
  icon:'⚡',description:'Outmaneuver lightning lanes and dispel storms with precise movement.',mechanics:'Lightning Lanes: leave the glowing beam before it strikes. Below 50% health storm wisps arrive.',color:'#b9d8fb',xp:260,gold:170,health:1010,damage:24,interval:1.88,speed:77,attackDelay:5.8,attackCycle:7,
  drops:[{id:'windpiercer',weight:21},{id:'stormscale',weight:21},{id:'zephyr-charm',weight:19},{id:'thunder-edge',weight:13},{id:'cloudstaff',weight:13},{id:'skywarden-censer',weight:11},{id:'tempest-eye',weight:2}]}
});
export function bossInfo(id='thornwarden'){return BOSSES[id]||BOSSES.thornwarden;}
// Boss levels are guidance for the playable prototype, not hard locks.
// Players can test any available encounter with their own party and earn its true rewards.
export function atRecommendedLevel(profile,id){
 const boss=BOSSES[id];
 return !!(boss&&profile?.heroes&&HERO_IDS.every(h=>profile.heroes?.[h]?.level>=boss.unlock));
}
export function canChallenge(profile,id){
 return !!(Object.hasOwn(BOSSES,id)&&profile?.heroes&&HERO_IDS.every(h=>Number.isInteger(profile.heroes?.[h]?.level)));
}
export function bossDropTable(id='thornwarden'){return bossInfo(id).drops;}
export function bossRewardInfo(id='thornwarden'){const b=bossInfo(id);return {xp:b.xp,gold:b.gold};}
export const QUARTERMASTER=Object.freeze(['recruit-sword','briar-bow','apprentice-focus','field-vest','brass-charm','village-helm','traveller-leggings','leather-gloves','roadworn-boots','bronze-band','worn-buckler']);
export const XP_REWARD=145;
export const GOLD_REWARD=80;
export function xpNeeded(level){return level>=MAX_LEVEL?0:80+40*level;}
export function freshProfile(){
 return {version:1,gold:90,wins:0,defeats:0,nextItemId:1,
  heroes:Object.fromEntries(HERO_IDS.map(id=>[id,{level:1,xp:0,talents:[],gear:Object.fromEntries(SLOTS.map(slot=>[slot,null]))}])),
  items:[],claims:[],partyOrder:[...DEFAULT_PARTY],...blankCrafting()};
}
function validNum(x){return Number.isSafeInteger(x)&&x>=0;}
export function validateProfile(p){
 if(!p||p.version!==1||!validNum(p.gold)||p.gold>1e9||!validNum(p.wins)||!validNum(p.defeats)||!validNum(p.nextItemId)||p.nextItemId<1)return false;
 if(!p.heroes||typeof p.heroes!=='object'||!Array.isArray(p.items)||p.items.length>400||!Array.isArray(p.claims)||p.claims.length>120)return false;
 if(p.partyOrder!==undefined&&(!Array.isArray(p.partyOrder)||p.partyOrder.length!==PARTY_SIZE||new Set(p.partyOrder).size!==PARTY_SIZE||!HERO_IDS.every(id=>p.partyOrder.includes(id))))return false;
 if(p.skills!==undefined){
  if(!p.skills||typeof p.skills!=='object'||SKILL_IDS.some(id=>{
   const v=p.skills[id];return !v||!Number.isSafeInteger(v.level)||v.level<1||v.level>SKILL_CAP||
    !Number.isSafeInteger(v.xp)||v.xp<0||(v.level<SKILL_CAP&&v.xp>=skillXpNeeded(v.level))||
    (v.level===SKILL_CAP&&v.xp!==0);
  }))return false;
 }
 for(const [field,defs] of [['materials',MATERIAL_DEFS],['potions',ALCHEMY_EFFECTS]]){
  if(p[field]!==undefined&&(!p[field]||typeof p[field]!=='object'||
   Object.entries(p[field]).some(([id,n])=>!Object.hasOwn(defs,id)||!Number.isSafeInteger(n)||n<0||n>99999)))return false;
 }
 if(p.preparedElixir!==undefined&&p.preparedElixir!==null&&!Object.hasOwn(ALCHEMY_EFFECTS,p.preparedElixir))return false;
 const ids=new Set(), equipped=new Set();
 for(const it of p.items){
  if(typeof it?.id!=='string'||!/^\bi\d+\b$/.test(it.id)||ids.has(it.id)||!Object.hasOwn(ITEM_DEFS,it.defId))return false;
  ids.add(it.id);
 }
 for(const key of HERO_IDS){
  const h=p.heroes[key];if(!h||!Number.isSafeInteger(h.level)||h.level<1||h.level>MAX_LEVEL||!validNum(h.xp)||(h.level<MAX_LEVEL&&h.xp>=xpNeeded(h.level))||!Array.isArray(h.talents)||h.talents.length>2)return false;
  const tierSet=new Set();
  for(const id of h.talents){
   const t=TALENTS[key].find(t=>t.id===id);
   if(!t||h.level<t.tier||tierSet.has(t.tier))return false;
   tierSet.add(t.tier);
  }
  if(!h.gear||typeof h.gear!=='object')return false;
  for(const slot of SLOTS){
   const itemId=h.gear[slot];
   // Legacy saves have exactly three slots; do not invalidate those characters
   // just because one of the six newly introduced slot keys is absent.
   if(itemId===undefined&&!LEGACY_SLOTS.has(slot))continue;
   if(itemId===null)continue;
   const item=p.items.find(it=>it.id===itemId);const def=item&&ITEM_DEFS[item.defId];
   if(!def||def.slot!==slot||equipped.has(itemId)||(def.classes&&!def.classes.includes(key)))return false;
   equipped.add(itemId);
  }
 }
 if(!p.claims.every(x=>typeof x==='string'&&x.length<=120)||new Set(p.claims).size!==p.claims.length)return false;
 const maxId=Math.max(0,...p.items.map(it=>Number(it.id.slice(1))));
 return p.nextItemId>maxId;
}
export function readProfile(storage){
 try{
  const raw=storage?.getItem(PROFILE_KEY);
  if(raw){const parsed=JSON.parse(raw);if(validateProfile(parsed))return normalizeProfileSlots(parsed);}
 }catch{}
 return freshProfile();
}
export function writeProfile(storage,profile){
 if(!validateProfile(profile))return false;
 normalizeProfileSlots(profile);
 try{storage?.setItem(PROFILE_KEY,JSON.stringify(profile));return true;}catch{return false;}
}
export function talentPoints(hero){return [2,4].filter(level=>hero.level>=level&&!hero.talents.some(id=>Object.values(TALENTS).flat().find(t=>t.id===id)?.tier===level)).length;}
export function chooseTalent(p,heroId,talentId){
 const h=p.heroes?.[heroId],talent=TALENTS[heroId]?.find(t=>t.id===talentId);
 if(!h||!talent||h.level<talent.tier||h.talents.some(id=>TALENTS[heroId].find(t=>t.id===id)?.tier===talent.tier))return false;
 h.talents.push(talentId);return true;
}
export function itemOwner(p,itemId){
 for(const heroId of HERO_IDS)for(const slot of SLOTS)if(p.heroes[heroId].gear[slot]===itemId)return heroId;
 return null;
}
export function addItem(p,defId){
 if(!Object.hasOwn(ITEM_DEFS,defId)||p.items.length>=400)return null;
 const item={id:'i'+p.nextItemId++,defId};p.items.push(item);return item;
}
export function equip(p,heroId,itemId){
 const h=p.heroes?.[heroId],it=p.items.find(x=>x.id===itemId),def=it&&ITEM_DEFS[it.defId];
 if(!h||!def||(def.classes&&!def.classes.includes(heroId)))return false;
 const oldOwner=itemOwner(p,itemId);if(oldOwner)p.heroes[oldOwner].gear[def.slot]=null;
 h.gear[def.slot]=itemId;return true;
}
export function unequip(p,heroId,slot){if(!SLOTS.includes(slot)||!p.heroes?.[heroId]?.gear[slot])return false;p.heroes[heroId].gear[slot]=null;return true;}
export function sell(p,itemId){
 const it=p.items.find(x=>x.id===itemId);if(!it||itemOwner(p,itemId))return false;
 const def=ITEM_DEFS[it.defId];p.gold+=def.value;p.items=p.items.filter(x=>x.id!==itemId);return true;
}
export function buy(p,defId){
 const def=ITEM_DEFS[defId];if(!def?.shop||p.gold<def.shop||p.items.length>=400)return null;
 p.gold-=def.shop;return addItem(p,defId);
}
export function bonuses(p,heroId){
 const h=p?.heroes?.[heroId];
 const out={health:0,attack:0,armour:0,speed:0,damage:0,healing:0,shielding:0,skillPower:0,fire:0,frostDuration:0,arrowPower:0,speedMultiplier:0,cooldown:0};
 if(!h)return out;
 out.health+=(h.level-1)*6;out.attack+=(h.level-1)*2;
 for(const slot of SLOTS){
  const item=p.items.find(it=>it.id===h.gear?.[slot]);
  const b=item&&ITEM_DEFS[item.defId]?.bonus;
  if(b)for(const [k,v] of Object.entries(b))if(k in out)out[k]+=v;
 }
 for(const id of h.talents){
  const b=TALENTS[heroId].find(t=>t.id===id)?.bonus;
  if(b)for(const [k,v] of Object.entries(b))if(k in out)out[k]+=v;
 }
 for(const group of setProgress(p,heroId)){
  for(const [k,v] of Object.entries(group.bonus))if(k in out)out[k]+=v;
 }
 return out;
}
export function itemBonusText(def){
 const LABELS={health:'HP',attack:'damage',armour:'armour',speed:'movement',damage:'all attack power',healing:'healing',shielding:'shields',skillPower:'ability damage',fire:'fire spells',frostDuration:'frost duration',arrowPower:'Arrow Storm',speedMultiplier:'speed',cooldown:'cooldown reduction'};
 const percentages=new Set(['damage','healing','shielding','skillPower','fire','arrowPower','speedMultiplier','cooldown']);
 return Object.entries(def.bonus||{}).map(([k,v])=>(v>=0?'+':'')+(percentages.has(k)?Math.round(v*100)+'%':v)+(' ')+(LABELS[k]||k)).join(' · ');
}
function rng(seed){let s=seed>>>0;return ()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
export function rollBossDrop(seed,bossId='thornwarden'){
 const table=bossDropTable(bossId),random=rng(seed+97531+(bossId==='cindermaw'?3331:bossId==='tempest'?7447:0));
 const weight=table.reduce((s,x)=>s+x.weight,0),roll=random()*weight;
 let sum=0;for(const d of table){sum+=d.weight;if(roll<sum)return d.id;}
 return table.at(-1).id;
}
export function grantVictory(p,receiptId,seed,bossId='thornwarden'){
 if(!Object.hasOwn(BOSSES,bossId)||!canChallenge(p,bossId))return null;
 if(typeof receiptId!=='string'||!receiptId||receiptId.length>120||p.claims.includes(receiptId)||!validateProfile(p))return null;
 if(p.items.length>=400)return null;
 // Calculate before mutating. A victory is awarded once per unique local battle receipt.
 const boss=BOSSES[bossId],defId=rollBossDrop(seed,bossId);
 normalizeProfileSlots(p);
 const reward={bossId,gold:boss.gold,xp:boss.xp,item:null,levels:[],heroXp:[],materials:[],receiptId};
 for(const id of HERO_IDS){
  const h=p.heroes[id],before=h.level,previousXP=h.xp;h.xp+=boss.xp;
  while(h.level<MAX_LEVEL&&h.xp>=xpNeeded(h.level)){h.xp-=xpNeeded(h.level);h.level++;}
  if(h.level===MAX_LEVEL)h.xp=0;
  if(h.level>before)reward.levels.push({id,from:before,to:h.level});
  reward.heroXp.push({id,fromLevel:before,fromXp:previousXP,toLevel:h.level,toXp:h.xp,xp:boss.xp});
 }
 p.gold+=boss.gold;p.wins++;
 reward.item=addItem(p,defId);
 // Guaranteed PvE reagents and a fixed boss mark enable chosen-piece exchange.
 const mat=MATERIAL_GROUPS[bossId];
 for(const [id,amount] of [[mat.ore,3],[mat.essence,2],[mat.seal,1]]){
  const added=Math.min(amount,99999-p.materials[id]);
  p.materials[id]+=added;if(added>0)reward.materials.push({id,quantity:added});
 }
 p.claims.push(receiptId);if(p.claims.length>100)p.claims=p.claims.slice(-100);
 return reward;
}
export function recordDefeat(p){if(validateProfile(p)){p.defeats++;return true;}return false;}
