'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),sandbox={window:{}};vm.createContext(sandbox);
for(const f of ['src/combat/combat-data-v1.js','src/combat/combat-animation-catalog-v1.js','gear-data.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),sandbox);
const D=sandbox.window.CellboundCombatData,C=sandbox.window.CellboundCombatAnimationCatalog,G=sandbox.window.CellboundGear;
const inventory=Object.entries(D.ABILITIES).map(([klass,abilities])=>({class:klass,beta:['Warrior','Paladin','Hunter','Rogue','Mage'].includes(klass),style:C.styles[klass],weapons:[...new Set(G.items.filter(i=>i.class===klass&&i.slot==='Weapon').map(i=>i.name))],abilities:abilities.map(a=>({id:a.id,name:a.name,spec:a.spec||'All',kind:a.kind,cast:a.cast||0,clip:C.resolve(klass,{abilityId:a.id,ability:a.name,payload:{kind:a.kind}},klass==='Hunter'?'bow':'',klass==='Death Knight').clip})),buffs:Object.entries(D.CLASS_BUFFS).filter(([key])=>key===klass||key.startsWith(klass+'|')).map(([key,b])=>({spec:key,name:b.name,clip:C.styles[klass].cast}))}));
if(require.main===module)console.log(JSON.stringify({classes:inventory,passiveTalentRules:Object.keys(D.TALENT_RULES),fallbacks:D.ROLE_FALLBACKS},null,2));
module.exports={inventory,D,C};
