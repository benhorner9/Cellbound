'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const window={CellboundAdmin:{isAdmin:true,role:'owner'},CellboundGame:{getState:()=>({bank:[{itemId:'qa-special',name:'=IMPORTXML("test")',category:'utility',rarity:'Rare',source:'QA unique',tier:3}]})},
 CellboundQuests:{itemCatalog:()=>({'blackened-fragment':{name:'Blackened Fragment',desc:'Campaign story item'}})}};
const ctx={window,console,document:{querySelector:()=>null},setTimeout};
for(const file of ['gear-data.js','profession-data.js','endgame-data-v1.js','admin-item-catalog-v1.js'])
 vm.runInNewContext(read(file),ctx,{filename:file,timeout:2000});
const catalog=window.CellboundItemCatalog,catalogue=catalog.catalogue(),byCategory={};
for(const item of catalogue){byCategory[item.category]=(byCategory[item.category]||0)+1;}
assert((byCategory.Equipment||0)>=700,'All class/tier/slot gear definitions must be included');
assert((byCategory.Materials||0)>=20,'All registered profession materials must be indexed');
assert((byCategory['Crafted items']||0)>=90,'All professions and crafted consumables must be indexed');
assert((byCategory['Unique gear']||0)>=5,'Named unique / relic gear must be indexed');
assert((byCategory.Collectibles||0)>=4,'Rare collectible reward definitions must be indexed');
assert((byCategory['Quest items']||0)>=1,'Story campaign inventory needs an index');
assert((byCategory['Special items']||0)>=1,'Blackout Station utility must be discoverable');
assert((byCategory['Bank discoveries']||0)>=1,'Account-only special items appear as discoveries');
assert.deepEqual([...new Set(catalogue.filter(x=>x.category==='Equipment').map(x=>x.tier))],[1,2,3,4,5],'Tier 1–5 are indexed');
assert.equal(new Set(catalogue.filter(x=>x.category==='Equipment').map(x=>x.className)).size,13,'Gear catalogue covers all 13 classes');
assert(catalogue.some(x=>x.id==='frostbound-sigil'&&x.tier===4),'Unique Tier 4 rewards retain correct tier');
assert(catalogue.some(x=>x.id==='quest-blackglass-resonator'&&x.tier===3),'Hollow Sanctum first-clear relic listed');
const raid=catalogue.find(x=>x.id==='warrior-t5-head');
assert(raid&&raid.tier===5&&!raid.dropEligible,'T5 raid gear visible but not assignable to normal boss tables');
assert(catalogue.some(x=>x.category==='Equipment'&&x.tier===1&&x.dropEligible),'Tier 1 drop-eligible gear flagged');
const csv=catalog.csvText();
assert(csv.includes('"Item ID","Item Name","Category","Tier","Class","Slot"'),'Google Sheets CSV includes requested fields');
assert(csv.split('\r\n').length===catalogue.length+1,'Export includes every row, not only first page');
assert(csv.includes('"'+"'"+'=IMPORTXML('),'CSV prevents imported item names from becoming Google Sheets formulas');
assert(catalogue.length>=900,'The full item registry should not unexpectedly shrink');
console.log('Item Catalogue regression passed: '+catalogue.length+' indexed entries, all five tiers and thirteen classes, materials, crafting, unique rewards, quests, specials, discoveries, and spreadsheet-safe CSV export.');
