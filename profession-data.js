(()=>{
'use strict';
const MATERIALS={
  'faded-cell-fragment':{name:'Faded Cell Fragment',rarity:'Common',source:'The Zeltiran Hollows',icon:'◇'},
  'zeltiran-iron':{name:'Zeltiran Iron',rarity:'Common',source:'The Zeltiran Hollows',icon:'⬡'},
  'ashen-soul-fragment':{name:'Ashen Soul Fragment',rarity:'Common',source:'Any Ashen Vault boss',icon:'✦'},
  'warden-iron':{name:'Warden Iron',rarity:'Common',source:'Ash Warden Kael',icon:'⬡'},
  'ember-core':{name:'Ember Core',rarity:'Uncommon',source:'Embermaw',icon:'◉'},
  'vaultheart-crystal':{name:'Vaultheart Crystal',rarity:'Rare',source:'The Vaultheart',icon:'◇'},
  'ancient-soul':{name:'Ancient Soul',rarity:'Epic',source:'Future end-game content',icon:'✧',endgame:true},
  'void-crystal':{name:'Void Crystal',rarity:'Epic',source:'Future end-game content',icon:'◆',endgame:true}
};
const PROFESSIONS={
  Alchemy:{icon:'⚗',summary:'Brew dungeon consumables and the end-game Cell Shock recovery potion.',recipes:[
    {id:'alc-minor-tonic',name:'Minor Recovery Tonic',level:1,xp:18,inputs:{'faded-cell-fragment':2},output:{category:'consumable',key:'minor-recovery-tonic',name:'Minor Recovery Tonic',quantity:1,payload:{effect:'recovery-tonic'}}},
    {id:'alc-ember-flask',name:'Emberward Flask',level:20,xp:28,inputs:{'ashen-soul-fragment':2,'ember-core':1},output:{category:'consumable',key:'emberward-flask',name:'Emberward Flask',quantity:1,payload:{effect:'emberward'}}},
    {id:'alc-vault-tonic',name:'Vaultheart Tonic',level:50,xp:42,inputs:{'ashen-soul-fragment':3,'vaultheart-crystal':1},output:{category:'consumable',key:'vaultheart-tonic',name:'Vaultheart Tonic',quantity:1,payload:{effect:'vaultheart-tonic'}}},
    {id:'alc-cell-shock',name:'Cell Shock Draught',level:100,xp:0,inputs:{'ancient-soul':3,'void-crystal':1},output:{category:'consumable',key:'cell-shock-draught',name:'Cell Shock Draught',quantity:1,payload:{effect:'clear-cell-shock'}},endgame:true}
  ]},
  Enchanting:{icon:'✥',summary:'Turn soul reagents into tradeable runes and rare magical enhancements.',recipes:[
    {id:'enc-binding-rune',name:'Minor Binding Rune',level:1,xp:18,inputs:{'faded-cell-fragment':2},output:{category:'consumable',key:'minor-binding-rune',name:'Minor Binding Rune',quantity:1,payload:{effect:'enchant-token',tier:1}}},
    {id:'enc-warden-rune',name:"Warden's Edge Rune",level:25,xp:30,inputs:{'ashen-soul-fragment':2,'warden-iron':1},output:{category:'consumable',key:'warden-edge-rune',name:"Warden's Edge Rune",quantity:1,payload:{effect:'enchant-token',tier:2}}},
    {id:'enc-ember-sigil',name:'Ember Sigil',level:45,xp:38,inputs:{'ashen-soul-fragment':2,'ember-core':1},output:{category:'consumable',key:'ember-sigil',name:'Ember Sigil',quantity:1,payload:{effect:'enchant-token',tier:2}}},
    {id:'enc-vault-glyph',name:'Vaultheart Glyph',level:70,xp:55,inputs:{'ashen-soul-fragment':4,'vaultheart-crystal':2},output:{category:'consumable',key:'vaultheart-glyph',name:'Vaultheart Glyph',quantity:1,payload:{effect:'enchant-token',tier:3}},requiresDiscovery:true}
  ]},
  Blacksmithing:{icon:'⚒',summary:'Forge Warrior and Paladin weapons and armour.',recipes:[
    {id:'bs-training-sword',name:'Training Sword',level:1,xp:20,inputs:{'zeltiran-iron':2,'faded-cell-fragment':1},output:{category:'gear',key:'warrior-t1-weapon',name:'Training Sword',quantity:1}},
    {id:'bs-ashguard-helm',name:'Ashguard Helm',level:25,xp:34,inputs:{'warden-iron':3,'ashen-soul-fragment':2},output:{category:'gear',key:'warrior-t2-head',name:'Ashguard Helm',quantity:1}},
    {id:'bs-sunwarden-hammer',name:'Sunwarden Hammer',level:45,xp:46,inputs:{'warden-iron':3,'ember-core':2},output:{category:'gear',key:'paladin-t2-weapon',name:'Sunwarden Hammer',quantity:1}}
  ]},
  Leatherworking:{icon:'⌁',summary:'Craft Hunter and Rogue equipment from dungeon components.',recipes:[
    {id:'lw-leather-jerkin',name:'Leather Jerkin',level:1,xp:20,inputs:{'faded-cell-fragment':2},output:{category:'gear',key:'hunter-t1-chest',name:'Leather Jerkin',quantity:1}},
    {id:'lw-longshot-hood',name:'Longshot Hood',level:25,xp:34,inputs:{'ashen-soul-fragment':2,'ember-core':1},output:{category:'gear',key:'hunter-t2-head',name:'Longshot Hood',quantity:1}},
    {id:'lw-venomshivs',name:'Venomshivs',level:45,xp:46,inputs:{'ashen-soul-fragment':3,'vaultheart-crystal':1},output:{category:'gear',key:'rogue-t2-weapon',name:'Venomshivs',quantity:1}}
  ]},
  Tailoring:{icon:'✂',summary:'Create cloth and ritual gear for Priest, Mage and Druid characters.',recipes:[
    {id:'tail-blueweave',name:'Blueweave Robe',level:1,xp:20,inputs:{'faded-cell-fragment':2},output:{category:'gear',key:'mage-t1-chest',name:'Blueweave Robe',quantity:1}},
    {id:'tail-chapelweave',name:'Chapelweave Robe',level:25,xp:34,inputs:{'ashen-soul-fragment':2,'ember-core':1},output:{category:'gear',key:'priest-t2-chest',name:'Chapelweave Robe',quantity:1}},
    {id:'tail-wildbloom',name:'Wildbloom Raiment',level:45,xp:46,inputs:{'ashen-soul-fragment':3,'vaultheart-crystal':1},output:{category:'gear',key:'druid-t2-chest',name:'Wildbloom Raiment',quantity:1}}
  ]}
};
const BOSS_REAGENTS={
  ashwarden:[{key:'ashen-soul-fragment',min:2,max:4},{key:'warden-iron',min:1,max:2}],
  embermaw:[{key:'ashen-soul-fragment',min:2,max:4},{key:'ember-core',min:1,max:2}],
  vaultheart:[{key:'ashen-soul-fragment',min:3,max:5},{key:'vaultheart-crystal',min:1,max:2}]
};
const recipeById=id=>Object.values(PROFESSIONS).flatMap(p=>p.recipes).find(r=>r.id===id)||null;
const skillThreshold=level=>50+Math.max(1,level)*15;
const rollReagents=bossId=>(BOSS_REAGENTS[bossId]||[]).map(r=>({key:r.key,quantity:r.min+Math.floor(Math.random()*(r.max-r.min+1))}));
window.CellboundProfessions={MATERIALS,PROFESSIONS,BOSS_REAGENTS,recipeById,skillThreshold,rollReagents};
})();