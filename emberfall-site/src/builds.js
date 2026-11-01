import {
 HERO_IDS,HERO_NAMES,SLOTS,ITEM_DEFS,BOSSES,validateProfile,bonuses,itemOwner,
 itemSet,SET_DEFS,itemBonusText,PROFILE_KEY
} from './progression.js?v=4.0.0';

// Offline-local build and backup helpers. Presets reference instances, never clone them.
// Do not use this data as authoritative items in future online play.
export const BUILDS_KEY='emberfall-builds-v1';
export const BUILD_COUNT=3;
export const BACKUP_FORMAT='emberfall-local-backup';
export const STAT_KEYS=['health','attack','armour','speed','damage','healing','shielding','skillPower','fire','frostDuration','arrowPower','speedMultiplier','cooldown'];
const PERCENT=new Set(['damage','healing','shielding','skillPower','fire','arrowPower','speedMultiplier','cooldown']);
const safeItemId=id=>id===null||(typeof id==='string'&&/^i[1-9][0-9]*$/.test(id)&&id.length<=18);
const validHero=id=>HERO_IDS.includes(id);
const validIndex=n=>Number.isInteger(n)&&n>=0&&n<BUILD_COUNT;
export function newBuilds(){
 return {version:1,heroes:Object.fromEntries(HERO_IDS.map(id=>[id,Array(BUILD_COUNT).fill(null)]))};
}
export function validateBuilds(data){
 if(!data||data.version!==1||!data.heroes||typeof data.heroes!=='object')return false;
 for(const id of HERO_IDS){
  const records=data.heroes[id];
  if(!Array.isArray(records)||records.length!==BUILD_COUNT)return false;
  for(const record of records){
   if(record===null)continue;
   if(typeof record!=='object'||Array.isArray(record)||typeof record.name!=='string'||record.name.length<1||record.name.length>30||!record.gear||typeof record.gear!=='object')return false;
   const ids=[];
   for(const slot of SLOTS){const itemId=record.gear[slot];if(!safeItemId(itemId))return false;if(itemId!==null)ids.push(itemId);}
   if(new Set(ids).size!==ids.length)return false;
  }
 }
 return true;
}
export function readBuilds(storage){
 try{const str=storage?.getItem(BUILDS_KEY);if(str){const data=JSON.parse(str);if(validateBuilds(data))return data;}}catch{}
 return newBuilds();
}
export function writeBuilds(storage,builds){
 if(!validateBuilds(builds))return false;
 try{storage?.setItem(BUILDS_KEY,JSON.stringify(builds));return true;}catch{return false;}
}
export function saveBuild(profile,builds,heroId,slot,name){
 if(!validateProfile(profile)||!validateBuilds(builds)||!validHero(heroId)||!validIndex(slot))return false;
 const presetName=(typeof name==='string'&&name.trim()?name.trim().slice(0,30):'Build '+(slot+1));
 builds.heroes[heroId][slot]={name:presetName,gear:Object.fromEntries(SLOTS.map(key=>[key,profile.heroes[heroId].gear[key]]))};
 return true;
}
export function buildStatus(profile,builds,heroId,slot){
 if(!validateProfile(profile)||!validateBuilds(builds)||!validHero(heroId)||!validIndex(slot))return {ok:false,reason:'Invalid build or company save.'};
 const build=builds.heroes[heroId][slot];
 if(!build)return {ok:false,reason:'This slot is empty. Save your current gear first.'};
 const proposed=build.gear;
 for(const slotName of SLOTS){
  const id=proposed[slotName];
  if(!id)continue;
  const item=profile.items.find(x=>x.id===id);
  if(!item)return {ok:false,reason:'A saved item was sold or is missing.'};
  const def=ITEM_DEFS[item.defId];
  if(def.slot!==slotName||def.classes&&!def.classes.includes(heroId))return {ok:false,reason:'This build contains incompatible equipment.'};
  const owner=itemOwner(profile,id);
  if(owner&&owner!==heroId)return {ok:false,reason:ITEM_DEFS[item.defId].name+' is equipped by '+HERO_NAMES[owner]+'. Remove it first.'};
 }
 return {ok:true,reason:'Ready — items are still owned and available.'};
}
export function applyBuild(profile,builds,heroId,index){
 const status=buildStatus(profile,builds,heroId,index);
 if(!status.ok)return status;
 // Atomic swap: do not unequip or transfer ANY item until every slot was validated.
 profile.heroes[heroId].gear={...builds.heroes[heroId][index].gear};
 return {ok:true,reason:'Build equipped. Bonuses apply to the next encounter.'};
}
export function compareItem(profile,heroId,itemId){
 if(!validHero(heroId)||!validateProfile(profile))return null;
 const item=profile.items.find(i=>i.id===itemId);if(!item)return null;
 const def=ITEM_DEFS[item.defId];
 if(def.classes&&!def.classes.includes(heroId))return {eligible:false,reason:'Restricted to '+def.classes.map(x=>HERO_NAMES[x]).join(', ')+'.'};
 const current=profile.heroes[heroId].gear[def.slot];
 const before=bonuses(profile,heroId);
 const preview={
  ...profile,
  heroes:{...profile.heroes,[heroId]:{...profile.heroes[heroId],gear:{...profile.heroes[heroId].gear,[def.slot]:itemId}}}
 };
 const after=bonuses(preview,heroId);
 const differences=STAT_KEYS.map(key=>({key,before:before[key]||0,after:after[key]||0,delta:Math.round(((after[key]||0)-(before[key]||0))*10000)/10000})).filter(x=>Math.abs(x.delta)>0.00001);
 return {eligible:true,item,current,currentDef:profile.items.find(i=>i.id===current)?.defId||null,differences,before,after,owner:itemOwner(profile,itemId),set:itemSet(item.defId)};
}
export function deltaLabel(key,value){
 const amount=PERCENT.has(key)?Math.round(value*100)+'%':Number(value.toFixed(2));
 const text=itemBonusText({bonus:{[key]:Math.abs(value)}}).replace(/^\+/, '');
 return (value>0?'+':'−')+text.replace(/^[\d.]+%?/,String(Math.abs(amount)));
}
export function itemDetails(defId){
 const def=ITEM_DEFS[defId];if(!def)return null;
 const sources=Object.values(BOSSES).filter(b=>b.drops.some(d=>d.id===defId)).map(b=>{
  const n=b.drops.find(x=>x.id===defId);
  const total=b.drops.reduce((sum,x)=>sum+x.weight,0);
  return {name:b.name,rate:Math.round(n.weight/total*10000)/100};
 });
 const setId=itemSet(defId);
 const setName=setId?SET_DEFS[setId].name:null;
 const flavour={
  'warden-heart':'A living pulse of the old forest, taken from the guardian of the Hollow.',
  'cinderheart':'A furnace core that refuses to cool, even after Cindermaw falls.',
  'tempest-eye':'The eye of a storm held still inside a carved crystal.',
  'emberglass-staff':'A flame caught in glass, harvested from the roots of the Hollow.',
  'skywarden-censer':'A censer that rings softly whenever lightning gathers.',
  'brambleguard':'Plate armour bound with living bark and stubborn roots.',
  'thornsap-pendant':'A charm still carrying the scent of ancient woodland.',
  'cloudstaff':'A staff whose crystal crown pulls at the nearby air.',
  'molten-focus':'Raw furnace light held inside a rune-cut lens.'
 }[defId]||(
  setId?SET_DEFS[setId].description:
  'A dependable piece of equipment for a rising Emberguard hero.'
 );
 return {name:def.name,icon:def.icon,rarity:def.rarity,slot:def.slot,setId,setName,
  flavour,sources,shop:def.shop??null,sell:def.value,bonus:itemBonusText(def)};
}
export function exportBackup(profile,builds){
 if(!validateProfile(profile)||!validateBuilds(builds))throw Error('Cannot export invalid character or preset data.');
 return JSON.stringify({format:BACKUP_FORMAT,version:1,exportedAt:new Date().toISOString(),
  company:profile,builds},null,2);
}
export function inspectBackup(raw){
 if(typeof raw!=='string'||raw.length>1500000)throw Error('That backup is too large or is not text.');
 let decoded;try{decoded=JSON.parse(raw);}catch{throw Error('The backup is not valid JSON.');}
 // Direct company-v1 JSON is supported for legacy manual backups.
 const legacy=decoded?.version===1&&decoded?.heroes&&decoded?.items;
 const profile=legacy?decoded:decoded?.format===BACKUP_FORMAT&&decoded?.version===1?decoded.company:null;
 if(!validateProfile(profile))throw Error('This backup does not contain a valid Emberfall company. Nothing was changed.');
 const builds=legacy?newBuilds():decoded.builds??newBuilds();
 if(!validateBuilds(builds))throw Error('This backup contains invalid build presets. Nothing was changed.');
 return {profile,builds,legacy:!!legacy,summary:{gold:profile.gold,wins:profile.wins,items:profile.items.length,
  levels:Object.fromEntries(HERO_IDS.map(h=>[h,profile.heroes[h].level]))}};
}
// Roll back storage if any write fails; update the live objects only after both succeed.
export function restoreBackup(storage,currentCompany,currentBuilds,verified){
 if(!verified||!validateProfile(verified.profile)||!validateBuilds(verified.builds))return {ok:false,reason:'Invalid backup.'};
 if(!storage)return {ok:false,reason:'Browser storage is not available.'};
 let oldProfile,oldBuilds;
 try{oldProfile=storage.getItem(PROFILE_KEY);oldBuilds=storage.getItem(BUILDS_KEY);}catch{return {ok:false,reason:'Browser storage cannot be read.'};}
 try{
  storage.setItem(BUILDS_KEY,JSON.stringify(verified.builds));
  storage.setItem(PROFILE_KEY,JSON.stringify(verified.profile));
 }catch{
  try{
   if(oldBuilds===null)storage.removeItem(BUILDS_KEY);else storage.setItem(BUILDS_KEY,oldBuilds);
   if(oldProfile===null)storage.removeItem(PROFILE_KEY);else storage.setItem(PROFILE_KEY,oldProfile);
  }catch{}
  return {ok:false,reason:'Storage write failed. Existing progress was not deliberately replaced.'};
 }
 Object.assign(currentCompany,structuredClone(verified.profile));
 Object.assign(currentBuilds,structuredClone(verified.builds));
 return {ok:true,reason:'Backup restored. Re-enter a boss fight to apply restored gear.'};
}
