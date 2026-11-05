// Evolution Block 1: deterministic, browser-local post-battle gathering.
// The existing company save is not a trusted multiplayer economy or item ledger.
export const GATHER_MATERIALS=Object.freeze({
  'ironroot-log':{name:'Ironroot Timber',icon:'🪵'},
  'ashwood-log':{name:'Charred Ashwood',icon:'🪵'},
  'stormwood-log':{name:'Stormwoven Timber',icon:'🌲'},
  'elder-heartwood':{name:'Elder Heartwood',icon:'🍃'},
  'furnace-geode':{name:'Furnace Geode',icon:'💎'},
  'tempest-crystal':{name:'Tempest Crystal',icon:'💠'}
});
// Wearable field gear uses the existing nine combat slots and item-instance IDs.
// Every piece has a genuine negative battle modifier, not a free extra equipment slot.
export const FIELD_GEAR=Object.freeze({
 'prospector-helm':{name:'Ironroot Prospector Helm',icon:'⛏️',slot:'helm',rarity:'Uncommon',value:70,
   bonus:{health:-14,attack:-1},field:{rare:.04,ore:.25},
   level:2,xp:90,materials:{'verdant-ore':3,'ironroot-log':2},
   description:'Scan the ground for richer seams at the cost of protection and damage.'},
 'forester-gloves':{name:'Ironroot Forester Gloves',icon:'🌿',slot:'gloves',rarity:'Uncommon',value:75,
   bonus:{health:-10,attack:-1},field:{rare:.03,wood:.28},
   level:3,xp:110,materials:{'ironroot-log':4,'verdant-ore':2},
   description:'Careful hands recover more timber, but lose combat protection.'},
 'pathfinder-boots':{name:'Ashen Pathfinder Boots',icon:'🥾',slot:'boots',rarity:'Uncommon',value:100,
   bonus:{health:-12,speed:-16},field:{extra:.30},
   level:6,xp:135,materials:{'ashwood-log':3,'ember-ore':2},
   description:'Spot extra harvest deposits after a dangerous hunt, but move slower.'},
 'wayseer-charm':{name:'Skybound Wayseer Amulet',icon:'🔍',slot:'charm',rarity:'Epic',value:350,
   bonus:{health:-26,attack:-2},field:{rare:.12},
   level:8,xp:160,materials:{'stormwood-log':2,'tempest-ore':3,'furnace-geode':1},
   description:'Read the hidden signs of rare deposits, trading survivability for discovery.'}
});
// Preserve old save compatibility: field bonuses are computed from actual equipped
// owned instances, never a new standalone equipment bag or cosmetic toggle.
export function fieldKitSnapshot(profile){
 const summary={count:0,rare:0,ore:0,wood:0,extra:0,pieces:[]};
 if(!profile?.heroes||!Array.isArray(profile?.items))return summary;
 for(const [heroId,hero] of Object.entries(profile.heroes)){
  for(const itemId of Object.values(hero?.gear||{})){
   if(!itemId)continue;
   const item=profile.items.find(it=>it.id===itemId),def=item&&FIELD_GEAR[item.defId];
   if(!def)continue;
   summary.count++;
   summary.pieces.push({heroId,defId:item.defId});
   for(const key of ['rare','ore','wood','extra'])summary[key]+=def.field[key]||0;
  }
 }
 summary.rare=Math.min(.30,summary.rare);
 summary.ore=Math.min(.50,summary.ore);
 summary.wood=Math.min(.50,summary.wood);
 summary.extra=Math.min(.75,summary.extra);
 return summary;
}
export function fieldGearBonusText(def){
 if(!def?.field)return '';
 return [['rare','rare node chance'],['ore','extra ore yield chance'],['wood','extra timber yield chance'],['extra','extra deposit chance']]
   .filter(([key])=>def.field[key]).map(([key,label])=>'+'+Math.round(def.field[key]*100)+'% '+label).join(' · ');
}
export const HARVEST_TYPES=Object.freeze({
  'thorn-ore':{name:'Ironroot Outcrop',icon:'⛏️',skill:'mining',tool:'pickaxe',level:1,toolLevel:1,material:'verdant-ore',xp:24,rare:false},
  'thorn-tree':{name:'Ancient Ironroot',icon:'🌳',skill:'woodcutting',tool:'axe',level:1,toolLevel:1,material:'ironroot-log',xp:24,rare:false},
  'thorn-heart':{name:'Elder Heartwood',icon:'🍃',skill:'woodcutting',tool:'axe',level:5,toolLevel:2,material:'elder-heartwood',xp:72,rare:true},
  'cinder-ore':{name:'Cinder Seam',icon:'⛏️',skill:'mining',tool:'pickaxe',level:3,toolLevel:1,material:'ember-ore',xp:34,rare:false},
  'cinder-tree':{name:'Scorched Ashwood',icon:'🌲',skill:'woodcutting',tool:'axe',level:3,toolLevel:1,material:'ashwood-log',xp:34,rare:false},
  'cinder-heart':{name:'Furnace Geode',icon:'💎',skill:'mining',tool:'pickaxe',level:8,toolLevel:2,material:'furnace-geode',xp:94,rare:true},
  'tempest-ore':{name:'Skyiron Vein',icon:'⛏️',skill:'mining',tool:'pickaxe',level:7,toolLevel:2,material:'tempest-ore',xp:48,rare:false},
  'tempest-tree':{name:'Stormwoven Pine',icon:'🌲',skill:'woodcutting',tool:'axe',level:7,toolLevel:2,material:'stormwood-log',xp:48,rare:false},
  'tempest-heart':{name:'Tempest Crystal',icon:'💠',skill:'mining',tool:'pickaxe',level:12,toolLevel:3,material:'tempest-crystal',xp:128,rare:true}
});
export const HARVEST_AREAS=Object.freeze({
  thornwarden:{name:"Thornwarden's Hollow",theme:'Woodland resources',common:['thorn-ore','thorn-tree'],rare:'thorn-heart',rareChance:.10},
  cindermaw:{name:'Ashen Foundry',theme:'Ore and scorched timber',common:['cinder-ore','cinder-tree'],rare:'cinder-heart',rareChance:.20},
  tempest:{name:'Skybreak Spire',theme:'Storm-charged minerals and timber',common:['tempest-ore','tempest-tree'],rare:'tempest-heart',rareChance:.32}
});
export const FIELD_TOOLS=Object.freeze({
  pickaxe:{name:'Pickaxe',skill:'mining',levels:[
    {name:'Field Pickaxe',required:1,gold:0,materials:{}},
    {name:'Reinforced Pickaxe',required:5,gold:75,materials:{'verdant-ore':4,'ironroot-log':4}},
    {name:'Runic Pickaxe',required:10,gold:150,materials:{'ember-ore':5,'ashwood-log':4,'furnace-geode':1}}
  ]},
  axe:{name:'Logging Axe',skill:'woodcutting',levels:[
    {name:'Field Axe',required:1,gold:0,materials:{}},
    {name:'Reinforced Axe',required:5,gold:75,materials:{'verdant-ore':3,'ironroot-log':5}},
    {name:'Runic Axe',required:10,gold:150,materials:{'ember-ore':4,'ashwood-log':5,'elder-heartwood':1}}
  ]}
});
const MAX_SITES=40;
const MAX_SKILL=20;
const needed=level=>level>=MAX_SKILL?0:40+20*level;
export function freshGatherState(){return {tools:{pickaxe:1,axe:1},sites:[]};}
export function ensureGatherState(profile){
  if(profile&&profile.gathering===undefined)profile.gathering=freshGatherState();
  return profile?.gathering;
}
const natural=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
export function validateGatherState(profile){
  const g=profile?.gathering;
  if(g===undefined)return true; // Old company and backup formats are valid.
  if(!g||!g.tools||!natural(g.tools.pickaxe,1,3)||!natural(g.tools.axe,1,3)||!Array.isArray(g.sites)||g.sites.length>MAX_SITES)return false;
  const receipts=new Set();
  for(const s of g.sites){
    if(!s||typeof s.receiptId!=='string'||s.receiptId.length<1||s.receiptId.length>120||receipts.has(s.receiptId)||!Object.hasOwn(HARVEST_AREAS,s.bossId)||!Array.isArray(s.nodes)||s.nodes.length<2||s.nodes.length>5)return false;
    receipts.add(s.receiptId);
    if(s.fieldKit!==undefined&&(!s.fieldKit||!natural(s.fieldKit.count,0,36)||
     ['rare','ore','wood','extra'].some(k=>!Number.isFinite(s.fieldKit[k])||s.fieldKit[k]<0||s.fieldKit[k]>(k==='rare'?.30:k==='extra'?.75:.50))))return false;
    const ids=new Set();
    for(const n of s.nodes){
      if(!n||typeof n.id!=='string'||!/^node-[1-5]$/.test(n.id)||ids.has(n.id)||!natural(n.quantity,1,5)||typeof n.harvested!=='boolean'||!Object.hasOwn(HARVEST_TYPES,n.type))return false;
      if(![...HARVEST_AREAS[s.bossId].common,HARVEST_AREAS[s.bossId].rare].includes(n.type))return false;
      ids.add(n.id);
    }
  }
  return true;
}
function random(seed){
  let value=seed>>>0;
  return ()=>{value=(value+0x6d2b79f5)>>>0;let t=Math.imul(value^(value>>>15),1|value);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
}
export function getHarvestSite(profile,receiptId){
  return profile?.gathering?.sites?.find(site=>site.receiptId===receiptId)||null;
}
export function pendingHarvestSites(profile){
  return (profile?.gathering?.sites||[]).filter(s=>s.nodes.some(n=>!n.harvested));
}
export function createHarvestSite(profile,receiptId,seed,bossId,fieldKit=null){
  const area=HARVEST_AREAS[bossId],g=ensureGatherState(profile);
  // Read a snapshotted company loadout, never current gear after the boss dies.
  const kit=fieldKit&&typeof fieldKit==='object'
   ? Object.fromEntries(['rare','ore','wood','extra'].map(key=>[key,Number.isFinite(fieldKit[key])?Math.min(key==='extra'?.75:key==='rare'?.30:.50,Math.max(0,fieldKit[key])):0]))
   : {rare:0,ore:0,wood:0,extra:0};
  if(!area||!g||typeof receiptId!=='string'||!receiptId||getHarvestSite(profile,receiptId))return null;
  const hash=[...receiptId].reduce((v,c)=>Math.imul(v^c.charCodeAt(0),16777619)>>>0,2166136261);
  const rand=random((seed>>>0)^hash);
  const rareFound=rand()<Math.min(.85,area.rareChance+kit.rare);
  const kinds=[area.common[0],area.common[1],area.common[rand()<.5?0:1]];
  if(rand()<.6)kinds.push(area.common[rand()<.5?0:1]);
  // Extra field-kit deposits never displace a successfully rolled rare find.
  if(rand()<kit.extra&&kinds.length<(rareFound?4:5))kinds.push(area.common[rand()<.5?0:1]);
  if(rareFound)kinds.push(area.rare);
  const nodes=kinds.map((type,i)=>{
   const def=HARVEST_TYPES[type];
   const bonus=def.rare?0:rand()<(def.skill==='mining'?kit.ore:kit.wood)?1:0;
   return {id:'node-'+(i+1),type,quantity:def.rare?1:Math.min(5,1+Math.floor(rand()*3)+bonus),harvested:false};
  });
  // Prefer discarding cleared visits; keep older unclaimed sites until the
  // explicit bounded save limit is reached (the oldest is then replaced).
  if(g.sites.length>=MAX_SITES){
    const cleared=g.sites.findIndex(s=>s.nodes.every(n=>n.harvested));
    g.sites.splice(cleared<0?0:cleared,1);
  }
  const site={receiptId,bossId,nodes,fieldKit:{count:Number.isSafeInteger(fieldKit?.count)?Math.max(0,Math.min(36,fieldKit.count)):0,...kit}};g.sites.push(site);
  return site;
}
export function harvestStatus(profile,receiptId,nodeId){
  const site=getHarvestSite(profile,receiptId);
  const node=site?.nodes.find(n=>n.id===nodeId),def=node&&HARVEST_TYPES[node.type];
  if(!def)return {ok:false,reason:'This deposit is not available.'};
  if(node.harvested)return {ok:false,reason:'This resource has already been gathered.'};
  const level=profile?.skills?.[def.skill]?.level||0;
  if(level<def.level)return {ok:false,reason:'Requires '+(def.skill==='mining'?'Mining':'Woodcutting')+' level '+def.level+'.'};
  if((profile?.gathering?.tools?.[def.tool]||0)<def.toolLevel)return {ok:false,reason:'Requires a tier '+def.toolLevel+' '+FIELD_TOOLS[def.tool].name+'. Upgrade at the Skill Hall.'};
  if(!natural(profile?.materials?.[def.material],0,99999)||profile.materials[def.material]+node.quantity>99999)return {ok:false,reason:'Material storage is full.'};
  return {ok:true,site,node,def};
}
export function harvestNode(profile,receiptId,nodeId){
  const status=harvestStatus(profile,receiptId,nodeId);
  if(!status.ok)return status;
  const {site,node,def}=status,skill=profile.skills[def.skill],before=skill.level;
  const xp=def.xp*node.quantity;
  profile.materials[def.material]+=node.quantity;node.harvested=true;
  skill.xp+=xp;
  while(skill.level<MAX_SKILL&&skill.xp>=needed(skill.level)){skill.xp-=needed(skill.level);skill.level++;}
  if(skill.level===MAX_SKILL)skill.xp=0;
  return {ok:true,material: def.material,name:def.name,quantity:node.quantity,xp,skill:def.skill,
    levelFrom:before,levelTo:skill.level,remaining:site.nodes.filter(n=>!n.harvested).length};
}
export function toolUpgradeStatus(profile,toolId){
  const tool=FIELD_TOOLS[toolId],tier=profile?.gathering?.tools?.[toolId];
  if(!tool||!natural(tier,1,3))return {ok:false,reason:'Unknown field tool.'};
  if(tier>=3)return {ok:false,reason:'This tool is fully upgraded.'};
  const next=tool.levels[tier];
  if((profile.skills?.[tool.skill]?.level||0)<next.required)return {ok:false,reason:'Requires '+tool.skill+' level '+next.required+'.',next};
  if((profile.gold||0)<next.gold)return {ok:false,reason:'Requires '+next.gold+' gold.',next};
  for(const [id,n] of Object.entries(next.materials))if((profile.materials?.[id]||0)<n)return {ok:false,reason:'Requires '+n+' more '+id+' materials (check the costs below).',next};
  return {ok:true,tool,next};
}
export function upgradeGatherTool(profile,toolId){
  const status=toolUpgradeStatus(profile,toolId);
  if(!status.ok)return status;
  profile.gold-=status.next.gold;
  for(const [id,count] of Object.entries(status.next.materials))profile.materials[id]-=count;
  profile.gathering.tools[toolId]++;
  return {ok:true,name:status.next.name,tier:profile.gathering.tools[toolId]};
}
