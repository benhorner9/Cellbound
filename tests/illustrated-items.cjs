'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),context={console};context.window=context;vm.createContext(context);
for(const file of ['gear-data.js','profession-data.js','item-atlas-v2.js','item-visuals-v2.js','character-rig-v1.js','character-portraits-v1.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const V=context.CellboundItemVisuals,P=context.CellboundPortraits,G=context.CellboundGear;
assert.equal(V.version,3);assert.equal(V.artDirection,'forge-vector-v1');

let sprites=0,bytes=0;
for(const atlas of Object.values(V.atlases)){
 assert.equal(atlas.cells.length,atlas.cols*atlas.rows);bytes+=fs.statSync(path.join(root,atlas.src)).size;
 assert(fs.existsSync(path.join(root,'dist',atlas.src)),'Fallback atlas must ship in deployment: '+atlas.src);
 for(const cell of atlas.cells){sprites++;for(const [x,y,w,h] of [cell.rect,...(cell.pair||[])]){assert([x,y,w,h].every(Number.isFinite));assert(w>4&&h>4);assert(x>=0&&y>=0&&x+w<=atlas.width&&y+h<=atlas.height)}}
}
assert.equal(sprites,301);assert(bytes<6500000,'Compressed fallback atlas budget');

const all=[...G.items,...Object.entries(context.CellboundProfessions.MATERIALS).map(([key,x])=>({...x,key,category:'material'})),...Object.values(context.CellboundProfessions.PROFESSIONS).flatMap(x=>x.recipes.map(r=>r.output))];
let vectorGear=0,vectorAux=0;
for(const item of all){
 const before=JSON.stringify(item),a=V.resolve(item),icon=V.icon(item);
 assert(a,'Every item must resolve artwork');
 assert(icon.includes('<svg'));
 if(item.slot){
   vectorGear++;
   assert.equal(a.mode,'forge-vector',item.itemId||item.name);
   assert.equal(a.artDirection,'forge-vector-v1');
   assert(icon.includes('data-item-model="forge-vector-v1"'));
   assert(icon.includes(a.key),'Inventory icon and wearable source key must agree');
   assert(!icon.includes('<image href='),'Equipment icons must not fall back to the old painted atlas');
 }else{
   vectorAux++;
   assert.equal(a.mode,'forge-vector',item.key||item.name);
   assert.equal(a.artDirection,'forge-vector-v1');
   assert(icon.includes('data-item-model="forge-vector-v1"'));
   assert(icon.includes(a.key),'Non-equipment icon must keep a stable Forge source key');
   assert(!icon.includes('<image href='),'Materials/consumables/recipes must not fall back to the painted atlas');
 }
 assert.equal(JSON.stringify(item),before,'Rendering must not mutate item data');
}
assert(vectorGear>0&&vectorAux>0);
assert.notEqual(V.resolve({slot:'Weapon',name:'Crossbow'}).key,V.resolve({slot:'Weapon',name:'Bow'}).key);

for(const klass of ['Warrior','Paladin','Hunter','Rogue','Mage']){
 const tierKeys=new Set();for(let tier=1;tier<=5;tier++)tierKeys.add(V.resolve({class:klass,slot:'Chest',tier}).key);assert.equal(tierKeys.size,5);
 for(const race of Object.keys(P.RACES))for(const gender of [0,1]){
  const equipment={};for(const slot of ['Chest','Waist','Legs','Feet','Hands','Shoulders','Head','Weapon','OffHand'])equipment[slot]={itemId:klass.toLowerCase()+'-t5-'+slot.toLowerCase(),class:klass,slot,tier:5};
  equipment.Weapon.weaponType=klass==='Hunter'?'bow':klass==='Mage'?'staff':klass==='Rogue'?'dagger':'sword';
  equipment.OffHand.offHandType=klass==='Hunter'?'quiver':klass==='Mage'?'focus':klass==='Rogue'?'dagger':'shield';
  const c={race,class:klass,appearance:{gender,frame:1},equipment},before=JSON.stringify(c),svg=P.paperDollSVG(c);
  assert(svg.includes('data-equipment-renderer="illustrated-v2"'));
  assert(svg.includes('data-art-mode="forge-vector-v1"'));
  assert(svg.includes('data-base-art="character-forge-v1"'));
  assert(!svg.includes('cb-paper-back-layer'));
  assert.equal(JSON.stringify(c),before);
  const top=Number(svg.match(/data-chest-top="([\d.]+)"/)[1]),bottom=Number(svg.match(/data-chest-bottom="([\d.]+)"/)[1]);
  assert(top<90&&bottom>=185&&bottom<200,'Torso covers waist without manufacturing a skirt');
  for(const slot of ['Chest','Waist','Legs','Feet','Hands','Shoulders','Head']){
    const source=V.resolve(equipment[slot]).key;
    assert(svg.includes(source),'Inventory icon and wearable must share vector source: '+klass+' '+slot);
  }
 }
}
const warriorHelms=[1,2,3,4,5].map(t=>V.icon({itemId:'warrior-helm-t'+t,class:'Warrior',slot:'Head',tier:t,name:'Warrior Helm T'+t}));
assert.equal(new Set(warriorHelms).size,5,'Warrior helm T1-T5 must have five distinct progression renders');
assert(warriorHelms[3].includes('forge-vector-v1')&&warriorHelms[4].includes('forge-vector-v1'));
console.log('Forge item models: '+vectorGear+' equipment mappings and '+vectorAux+' non-equipment mappings use '+V.artDirection+'; '+sprites+' compatibility atlas sprites remain packaged; '+bytes+' compressed bytes.');
