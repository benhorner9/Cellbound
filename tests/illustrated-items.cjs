'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),context={console,Math,Date};context.window=context;context.globalThis=context;vm.createContext(context);
for(const file of ['gear-data.js','profession-data.js','item-atlas-v2.js','item-visuals-v2.js','character-rig-v1.js','character-portraits-v1.js','item-art-v1.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const IA=context.CellboundItemArt,P=context.CellboundPortraits,G=context.CellboundGear,Prof=context.CellboundProfessions;
assert.equal(IA.ART_DIRECTION,'classic-flat-v1');
assert.equal(P.modelContract,'classic-paper-doll-v1');

const gear=G.items;
for(const item of gear){
 const before=JSON.stringify(item),html=G.artHTML(item,64);
 assert(html.includes('<svg'),item.itemId);
 assert(html.includes('cb-item-art'));
 assert(!html.includes('data-item-model="forge-vector-v1"'));
 assert.equal(JSON.stringify(item),before,'Item art must not mutate equipment data');
}
for(const key of Object.keys(Prof.MATERIALS||{})){
 const html=Prof.materialArtHTML(key,64);assert(html.includes('<svg'),'Material art missing '+key);
}
for(const recipe of Object.values(Prof.PROFESSIONS||{}).flatMap(x=>x.recipes||[])){
 if(recipe.output?.category==='consumable')assert(Prof.consumableArtHTML(recipe.output.key,64).includes('<svg'),'Consumable art missing '+recipe.output.key);
}

for(const klass of ['Warrior','Paladin','Hunter','Rogue','Mage'])for(const race of Object.keys(P.RACES))for(const gender of [0,1]){
 const equipment={};
 for(const slot of ['Chest','Waist','Legs','Feet','Hands','Shoulders','Head','Weapon','OffHand']){
  equipment[slot]={itemId:klass.toLowerCase()+'-t5-'+slot.toLowerCase(),class:klass,slot,tier:5};
 }
 equipment.Weapon.weaponType=klass==='Hunter'?'bow':klass==='Mage'?'staff':klass==='Rogue'?'dagger':'sword';
 equipment.OffHand.offHandType=klass==='Hunter'?'quiver':klass==='Mage'?'focus':klass==='Rogue'?'dagger':'shield';
 const c={race,class:klass,appearance:{gender,frame:1},equipment},svg=P.paperDollSVG(c);
 assert(svg.includes('data-character-style="classic-paper-doll"'));
 assert(!svg.includes('data-equipment-renderer="illustrated-v2"'));
 for(const slot of ['Chest','Waist','Legs','Feet','Hands','Shoulders','Head'])assert(svg.includes('cb-paper-slot-'+slot.toLowerCase()),klass+' '+slot);
}
console.log('Classic item art: '+gear.length+' equipment icons plus materials/consumables render in classic-flat-v1; five beta class families render on all race states.');
