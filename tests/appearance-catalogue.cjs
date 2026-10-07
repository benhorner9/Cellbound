'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const context={console,Math,Date,window:{}};context.window=context;vm.createContext(context);
for(const file of ['gear-data.js','item-atlas-v2.js','item-visuals-v2.js','character-rig-v1.js','character-portraits-v1.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const P=context.CellboundPortraits,G=context.CellboundGear;
let count=0;const start=performance.now();
for(const race of Object.keys(P.RACES))for(const gender of [0,1])for(const item of G.items){
 const slot=item.slot==='Ring'?'Ring1':item.slot==='Trinket'?'Trinket1':item.slot;
 const c={id:'audit',race,class:item.class,appearance:{gender,frame:1},equipment:{[slot]:item}};
 const svg=P.paperDollSVG(c);
 assert(!/NaN|undefined/.test(svg),race+' '+gender+' '+item.itemId);
 assert(svg.includes('cb-paper-slot-'+slot.toLowerCase()),'Missing slot '+slot);
 for(const match of svg.matchAll(/href="\.\/(assets\/[^" ]+)"/g))assert(fs.existsSync(path.join(__dirname,'..',match[1])),match[1]);
 count++;
}
const party=Array.from({length:10},(_,i)=>({id:'party'+i,race:Object.keys(P.RACES)[i%6],appearance:{gender:i%2,frame:1},equipment:G.starterSet?.('Warrior')||{}}));
party.forEach(c=>P.paperDollSVG(c));const warm=performance.now();for(let i=0;i<100;i++)party.forEach(c=>P.paperDollSVG(c));
console.log(JSON.stringify({catalogueRenders:count,catalogueMs:Math.round(performance.now()-start),cachedTenCharacterRenders:100,cachedTotalMs:Math.round(performance.now()-warm)}));
