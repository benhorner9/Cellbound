'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),context={console,Math,Date};context.window=context;context.globalThis=context;vm.createContext(context);
for(const file of ['gear-data.js','profession-data.js','item-atlas-v2.js','item-visuals-v2.js','character-rig-v1.js','character-portraits-v1.js','item-art-v1.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const IA=context.CellboundItemArt,P=context.CellboundPortraits,G=context.CellboundGear,Prof=context.CellboundProfessions;
const slug=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
assert.equal(IA.ART_DIRECTION,'class-tier-v2');
assert.equal(IA.ITEM_VISUALS_VERSION,2);
assert.equal(P.itemVisualsVersion,2);
assert.equal(P.modelContract,'classic-paper-doll-v1');
assert.equal(IA.FULL_CLASSES.length,G.CLASS_ORDER.length);
assert.equal(Object.keys(IA.SET_VISUALS).length,G.CLASS_ORDER.length*2);

const gear=G.items;
for(const item of gear){
 const before=JSON.stringify(item),html=G.artHTML(item,64),mode=Number(item.tier)>=4?'set-first':'material-first';
 assert(html.includes('<svg'),item.itemId);
 assert(html.includes('cb-item-art'));
 assert(!html.includes('data-item-model="forge-vector-v1"'));
 assert(html.includes('data-item-visuals="v2"'),item.itemId+' must use Item Visuals V2 icon contract');
 assert(html.includes('data-class-visual="'+slug(item.class)+'"'),item.itemId+' must expose '+item.class+' class motif');
 assert(html.includes('data-palette-mode="'+mode+'"'),item.itemId+' must use '+mode+' colour ownership');
 assert.equal(JSON.stringify(item),before,'Item art must not mutate equipment data');
}
for(const key of Object.keys(Prof.MATERIALS||{})){
 const html=Prof.materialArtHTML(key,64);assert(html.includes('<svg'),'Material art missing '+key);
}
for(const recipe of Object.values(Prof.PROFESSIONS||{}).flatMap(x=>x.recipes||[])){
 if(recipe.output?.category==='consumable')assert(Prof.consumableArtHTML(recipe.output.key,64).includes('<svg'),'Consumable art missing '+recipe.output.key);
}

const coreSlots=['Chest','Waist','Legs','Feet','Hands','Shoulders','Head','Weapon','OffHand'];
for(const klass of G.CLASS_ORDER)for(const race of Object.keys(P.RACES))for(const gender of [0,1]){
 const equipment={};
 for(const slot of coreSlots){
  const item=gear.find(x=>x.class===klass&&Number(x.tier)===5&&x.slot===slot);
  assert(item,klass+' missing T5 '+slot);
  equipment[slot]=item;
 }
 const c={race,class:klass,appearance:{race,gender,frame:1},equipment},svg=P.paperDollSVG(c),classSlug=slug(klass);
 assert(svg.includes('data-character-style="classic-paper-doll"'));
 assert(svg.includes('data-item-visuals="v2"'));
 assert(svg.includes('data-class-visual="'+classSlug+'"'),klass+' worn gear must expose class-specific V2 identity');
 assert(svg.includes('data-palette-mode="set-first"'),klass+' T5 worn set must own its palette');
 assert(!svg.includes('data-equipment-renderer="illustrated-v2"'));
 for(const slot of ['Chest','Waist','Legs','Feet','Hands','Shoulders','Head'])assert(svg.includes('cb-paper-slot-'+slot.toLowerCase()),klass+' '+slot);
}

const t4Bases=[],t5Bases=[];
for(const klass of G.CLASS_ORDER){
 const classSlug=slug(klass),t1=gear.find(x=>x.class===klass&&Number(x.tier)===1&&x.slot==='Chest'),t4=gear.find(x=>x.class===klass&&Number(x.tier)===4&&x.slot==='Chest'),t5=gear.find(x=>x.class===klass&&Number(x.tier)===5&&x.slot==='Chest');
 assert(t1&&t4&&t5,klass+' needs T1/T4/T5 chest art');
 const a=G.artHTML(t1,64),b=G.artHTML(t4,64),d=G.artHTML(t5,64);
 assert.notEqual(a,b,klass+' T1 and T4 visuals must progress');
 assert.notEqual(b,d,klass+' T4 and T5 visuals must progress');
 for(const html of [a,b,d])assert(html.includes('data-class-visual="'+classSlug+'"'),klass+' item-card art must carry its class signature');
 assert(a.includes('data-palette-mode="material-first"'),klass+' T1 must use material-led colour');
 assert(b.includes('data-palette-mode="set-first"')&&d.includes('data-palette-mode="set-first"'),klass+' endgame sets must use set-led colour');
 const p4=P.gearPalette({class:klass},t4,4,'Chest'),p5=P.gearPalette({class:klass},t5,5,'Chest');
 assert.equal(p4.paletteMode,'set-first');assert.equal(p5.paletteMode,'set-first');
 assert.notEqual(String(p4.base).toLowerCase(),String(P.CLASS_COLORS[klass]).toLowerCase(),klass+' T4 must not simply use class colour');
 assert.notEqual(String(p5.base).toLowerCase(),String(P.CLASS_COLORS[klass]).toLowerCase(),klass+' T5 must not simply use class colour');
 assert.notEqual(p4.base,p5.base,klass+' T4/T5 sets should be visually separate collections');
 assert.equal(p4.accent,P.CLASS_COLORS[klass],klass+' class colour should remain a small accent');
 t4Bases.push(p4.base);t5Bases.push(p5.base);
}
assert.equal(new Set(t4Bases).size,G.CLASS_ORDER.length,'Every T4 class set must have its own primary palette');
assert.equal(new Set(t5Bases).size,G.CLASS_ORDER.length,'Every T5 class set must have its own primary palette');
console.log('Item Visuals V2 full-class pass: '+gear.length+' gear icons, '+G.CLASS_ORDER.length+' classes, matching worn/inventory motifs, material-led levelling gear and set-owned T4/T5 palettes.');
