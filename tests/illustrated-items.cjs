'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),context={console};context.window=context;vm.createContext(context);
for(const file of ['gear-data.js','profession-data.js','item-atlas-v2.js','item-visuals-v2.js','character-rig-v1.js','character-portraits-v1.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const V=context.CellboundItemVisuals,P=context.CellboundPortraits,G=context.CellboundGear;
let sprites=0,bytes=0;
for(const atlas of Object.values(V.atlases)){
 assert.equal(atlas.cells.length,atlas.cols*atlas.rows);bytes+=fs.statSync(path.join(root,atlas.src)).size;
 assert(fs.existsSync(path.join(root,'dist',atlas.src)),'Atlas must ship in deployment: '+atlas.src);
 for(const cell of atlas.cells){sprites++;for(const [x,y,w,h] of [cell.rect,...(cell.pair||[])]){assert([x,y,w,h].every(Number.isFinite));assert(w>4&&h>4);assert(x>=0&&y>=0&&x+w<=atlas.width&&y+h<=atlas.height)}}
}
assert.equal(sprites,301);assert(bytes<6500000,'Compressed atlas budget');
const all=[...G.items,...Object.entries(context.CellboundProfessions.MATERIALS).map(([key,x])=>({...x,key,category:'material'})),...Object.values(context.CellboundProfessions.PROFESSIONS).flatMap(x=>x.recipes.map(r=>r.output))];
for(const item of all){const before=JSON.stringify(item),a=V.resolve(item);assert(a&&fs.existsSync(path.join(root,a.src)));assert(V.icon(item).includes(a.key));assert.equal(JSON.stringify(item),before)}
assert.notEqual(V.resolve({slot:'Weapon',name:'Crossbow'}).key,V.resolve({slot:'Weapon',name:'Bow'}).key);
for(const klass of ['Warrior','Paladin','Hunter','Rogue','Mage']){
 const tierKeys=new Set();for(let tier=1;tier<=5;tier++)tierKeys.add(V.resolve({class:klass,slot:'Chest',tier}).key);assert.equal(tierKeys.size,5);
 for(const race of Object.keys(P.RACES))for(const gender of [0,1]){
  const equipment={};for(const slot of ['Chest','Waist','Legs','Feet','Hands','Shoulders','Head','Weapon','OffHand'])equipment[slot]={class:klass,slot,tier:5};
  const c={race,class:klass,appearance:{gender,frame:1},equipment},before=JSON.stringify(c),svg=P.paperDollSVG(c);
  assert(svg.includes('data-equipment-renderer="illustrated-v2"'));assert(!svg.includes('cb-paper-back-layer'));assert.equal(JSON.stringify(c),before);
  const top=Number(svg.match(/data-chest-top="([\d.]+)"/)[1]),bottom=Number(svg.match(/data-chest-bottom="([\d.]+)"/)[1]);assert(top<90&&bottom>=185&&bottom<200,'Torso covers waist without manufacturing a skirt');
  for(const slot of ['Chest','Waist','Legs','Feet','Hands','Shoulders','Head'])assert(svg.includes(V.resolve(equipment[slot]).key),'Icon and wearable must share source');
 }
}
console.log('Illustrated items: '+sprites+' registered sprites; '+all.length+' catalogue/reagent/recipe mappings; 60 full race/sex/class outfits; '+bytes+' compressed bytes.');
