(()=>{
'use strict';

const VERSION='1.3.16';
const TICK=100;
const MAX_COMBAT_MS=180000;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot((a?.x||0)-(b?.x||0),(a?.y||0)-(b?.y||0));
const pct=(v,max)=>max>0?clamp(v/max*100,0,100):0;

const CLASS_COLORS={
 'Death Knight':'#C41E3A','Demon Hunter':'#A330C9','Druid':'#FF7C0A','Evoker':'#33937F',
 'Hunter':'#AAD372','Mage':'#3FC7EB','Warrior':'#C69B6D','Paladin':'#F48CBA',
 'Priest':'#FFFFFF','Rogue':'#FFF468','Shaman':'#0070DD','Warlock':'#8788EE','Monk':'#00FF98'
};

const RESOURCE_DEFS={
 'Death Knight':{name:'Runic Power',max:100,start:20,regen:2},
 'Demon Hunter':{name:'Fury',max:100,start:30,regen:9},
 Druid:{name:'Mana',max:100,start:100,regen:7},
 Evoker:{name:'Essence',max:5,start:5,regen:.45},
 Hunter:{name:'Focus',max:100,start:80,regen:9},
 Mage:{name:'Mana',max:100,start:100,regen:5},
 Warrior:{name:'Rage',max:100,start:20,regen:7},
 Paladin:{name:'Mana',max:100,start:100,regen:6},
 Priest:{name:'Mana',max:100,start:100,regen:7},
 Shaman:{name:'Mana',max:100,start:100,regen:7},
 Warlock:{name:'Mana',max:100,start:100,regen:5.5},
 'Monk|Brewmaster':{name:'Energy',max:100,start:100,regen:11},
 'Monk|Mistweaver':{name:'Mana',max:100,start:100,regen:7},
 'Monk|Windwalker':{name:'Energy',max:100,start:100,regen:12},
 Rogue:{name:'Energy',max:100,start:100,regen:13}
};

const CLASS_BUFFS={
 'Death Knight':{id:'class-buff-horn-of-winter',name:'Horn of Winter',scope:'party',duration:60000,cooldown:180000,effect:{outgoingDamage:.03,resourceRegen:.04}},
 'Demon Hunter':{id:'class-buff-demonic-momentum',name:'Demonic Momentum',scope:'self',duration:60000,cooldown:180000,effect:{outgoingDamage:.15,haste:.10,resourceRegen:.15}},
 Hunter:{id:'class-buff-predators-focus',name:"Predator's Focus",scope:'self',duration:60000,cooldown:180000,effect:{outgoingDamage:.15,haste:.10,resourceRegen:.10}},
 Rogue:{id:'class-buff-killing-tempo',name:'Killing Tempo',scope:'self',duration:60000,cooldown:180000,effect:{outgoingDamage:.15,critBonus:.10}},
 Warrior:{id:'class-buff-battle-fury',name:'Battle Fury',scope:'self',duration:60000,cooldown:180000,effect:{outgoingDamage:.15,threatBonus:.15,incomingDamageReduction:.10}},
 Mage:{id:'class-buff-arcane-empowerment',name:'Arcane Empowerment',scope:'party',duration:60000,cooldown:180000,effect:{outgoingDamage:.05}},
 Priest:{id:'class-buff-divine-inspiration',name:'Divine Inspiration',scope:'party',duration:60000,cooldown:180000,effect:{outgoingHealing:.05,incomingHealing:.05}},
 Druid:{id:'class-buff-wild-communion',name:'Wild Communion',scope:'party',duration:60000,cooldown:180000,effect:{outgoingDamage:.04,outgoingHealing:.04,resourceRegen:.04}},
 Paladin:{id:'class-buff-blessing-resolve',name:'Blessing of Resolve',scope:'party',duration:60000,cooldown:180000,effect:{incomingDamageReduction:.06}},
 Shaman:{id:'class-buff-bloodlust',name:'Bloodlust',scope:'party',duration:60000,cooldown:180000,effect:{haste:.10,resourceRegen:.05}},
 Warlock:{id:'class-buff-demonic-pact',name:'Demonic Pact',scope:'party',duration:60000,cooldown:180000,effect:{outgoingDamage:.04}},
 Monk:{id:'class-buff-mystic-touch',name:'Mystic Touch',scope:'party',duration:60000,cooldown:180000,effect:{outgoingDamage:.03,outgoingHealing:.03}},
 Evoker:{id:'class-buff-draconic-resonance',name:'Draconic Resonance',scope:'party',duration:60000,cooldown:180000,effect:{haste:.06}}
};

const LEVEL_RULES={
 healthPerLevel:.03,
 outputPerLevel:.02,
 levelDeltaPerLevel:.045,
 minLevelDeltaMultiplier:.72,
 maxLevelDeltaMultiplier:1.32
};
const ENEMY_CLASS_RULES={
 trash:{label:'TRASH',health:1,damage:1},
 elite:{label:'ELITE',health:1.12,damage:1.08},
 boss:{label:'BOSS',health:1.22,damage:1.28},
 'world-boss':{label:'WORLD BOSS',health:1.75,damage:1.48},
 add:{label:'ADD',health:.78,damage:.84}
};
function levelHealthScale(level){return 1+Math.max(0,(Number(level)||1)-1)*LEVEL_RULES.healthPerLevel}
function levelOutputScale(level){return 1+Math.max(0,(Number(level)||1)-1)*LEVEL_RULES.outputPerLevel}
function levelMatchMultiplier(sourceLevel,targetLevel){
 const delta=(Number(sourceLevel)||1)-(Number(targetLevel)||1);
 return clamp(1+delta*LEVEL_RULES.levelDeltaPerLevel,LEVEL_RULES.minLevelDeltaMultiplier,LEVEL_RULES.maxLevelDeltaMultiplier)
}
function enemyClassRule(kind){return ENEMY_CLASS_RULES[kind]||ENEMY_CLASS_RULES.trash}
function hasAffix(ctx,id){return Array.isArray(ctx?.encounter?.affixes)&&ctx.encounter.affixes.includes(id)}
function scalingValue(ctx,key,fallback=1){const v=Number(ctx?.encounter?.scaling?.[key]);return Number.isFinite(v)&&v>0?v:fallback}
function enemyPressure(ctx,e,target){
 let mult=levelOutputScale(e.level||1)*levelMatchMultiplier(e.level||1,target?.level||1)*(Number(e.damageScale)||1);
 if(hasAffix(ctx,'blood-moon')&&healthRatio(e)<=.30)mult*=1.25;
 if(ctx.tactics?.pullStyle==='aggressive'&&e.classification!=='boss'&&e.classification!=='world-boss')mult*=1.10;
 if(ctx.tactics?.pullStyle==='safe'&&e.classification!=='boss'&&e.classification!=='world-boss')mult*=.94;
 if(Number(e.relentlessUntil)>ctx.time)mult*=1.18;
 mult*=Math.max(1,Number(e.phaseDamageScale)||1);
 if(e.hardEnraged)mult*=3.5;
 return mult
}


const ABILITIES={
 'Death Knight':[
  {id:'heart-strike',name:'Heart Strike',kind:'damage',role:'tank',spec:'Blood',unlockLevel:1,desc:'A high-threat strike that generates Runic Power.',range:5,damage:18,cost:0,gain:16,gcd:1200,cd:0,threat:2.6},
  {id:'death-strike',name:'Death Strike',kind:'damage',role:'tank',spec:'Blood',unlockLevel:1,desc:'Spend Runic Power to strike and heal from damage taken recently.',range:5,damage:22,cost:35,gcd:1200,cd:0,threat:2.2},
  {id:'dark-command',name:'Dark Command',kind:'taunt',role:'tank',spec:'Blood',unlockLevel:1,desc:'Command an enemy to attack the Death Knight.',range:30,cost:0,gcd:0,cd:8000,threat:5},
  {id:'mind-freeze',name:'Mind Freeze',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast with frozen runic force.',range:15,cost:0,gcd:0,cd:15000},
  {id:'marrowrend',name:'Marrowrend',kind:'damage',role:'tank',spec:'Blood',unlockLevel:1,desc:'Generate Runic Power and reinforce Bone Shield.',range:5,damage:17,cost:0,gain:14,gcd:1200,cd:4500,threat:2.4},
  {id:'blood-boil',name:'Blood Boil',kind:'damage',role:'tank',spec:'Blood',unlockLevel:4,desc:'Boil the blood of nearby enemies for heavy pack threat.',range:8,damage:16,cost:0,gain:10,gcd:1200,cd:7000,cleave:3,threat:2.8,damageType:'magic'},
  {id:'death-and-decay-blood',name:'Death and Decay',kind:'damage',role:'tank',spec:'Blood',unlockLevel:7,desc:'Corrupt the ground beneath enemies with shadow damage.',range:15,damage:17,cost:10,gcd:1200,cd:12000,cleave:3,threat:2.5,damageType:'magic'},
  {id:'rune-tap',name:'Rune Tap',kind:'defensive',role:'tank',spec:'Blood',unlockLevel:1,desc:'Briefly reduce incoming damage.',duration:5000,damageReduction:.20,gcd:0,cd:30000},
  {id:'dancing-rune-weapon',name:'Dancing Rune Weapon',kind:'defensive',role:'tank',spec:'Blood',unlockLevel:1,desc:'Summon a spectral weapon that reinforces defence and threat.',duration:9000,damageReduction:.22,gcd:0,cd:75000},
  {id:'vampiric-blood',name:'Vampiric Blood',kind:'defensive',role:'tank',spec:'Blood',unlockLevel:1,desc:'Empower your blood, restoring health and greatly improving survival.',duration:10000,damageReduction:.25,selfHealPct:.18,gcd:0,cd:90000},

  {id:'obliterate',name:'Obliterate',kind:'damage',role:'dps',spec:'Frost',unlockLevel:1,desc:'A brutal melee strike that generates Runic Power.',range:5,damage:28,cost:0,gain:18,gcd:1200,cd:4500},
  {id:'frost-strike',name:'Frost Strike',kind:'damage',role:'dps',spec:'Frost',unlockLevel:1,desc:'Spend Runic Power on a weapon strike infused with frost.',range:5,damage:26,cost:28,gcd:1200,cd:0,damageType:'magic'},
  {id:'howling-blast',name:'Howling Blast',kind:'damage',role:'dps',spec:'Frost',unlockLevel:1,desc:'Blast the target and nearby enemies with freezing wind.',range:25,damage:18,cost:0,gain:12,gcd:1200,cd:6000,cleave:2,damageType:'magic'},
  {id:'remorseless-winter',name:'Remorseless Winter',kind:'damage',role:'dps',spec:'Frost',unlockLevel:1,desc:'Surround yourself with a freezing storm that cleaves nearby enemies.',range:8,damage:24,cost:18,gcd:1200,cd:14000,cleave:3,damageType:'magic'},
  {id:'frostscythe',name:'Frostscythe',kind:'damage',role:'dps',spec:'Frost',unlockLevel:7,desc:'Sweep a frozen blade through several enemies.',range:7,damage:21,cost:0,gain:10,gcd:1200,cd:9000,cleave:3,damageType:'magic'},
  {id:'frostwyrms-fury',name:"Frostwyrm's Fury",kind:'damage',role:'dps',spec:'Frost',unlockLevel:11,desc:'Call a frostwyrm across the battlefield for heavy cleave damage.',range:30,damage:38,cost:35,gcd:1500,cast:1000,cd:45000,cleave:4,damageType:'magic'},
  {id:'breath-of-sindragosa',name:'Breath of Sindragosa',kind:'damage',role:'dps',spec:'Frost',unlockLevel:1,desc:'Unleash a devastating cone of frost into the enemy pack.',range:20,damage:45,cost:50,gcd:1500,cast:1200,cd:60000,cleave:4,damageType:'magic'},
  {id:'icebound-fortitude',name:'Icebound Fortitude',kind:'defensive',role:'dps',spec:'Frost',unlockLevel:8,desc:'Harden yourself against incoming damage.',duration:8000,damageReduction:.25,gcd:0,cd:75000},

  {id:'festering-strike',name:'Festering Strike',kind:'damage',role:'dps',spec:'Unholy',unlockLevel:1,desc:'Strike the target, generate Runic Power and apply Festering Wounds.',range:5,damage:20,cost:0,gain:15,gcd:1200,cd:3500},
  {id:'scourge-strike',name:'Scourge Strike',kind:'damage',role:'dps',spec:'Unholy',unlockLevel:1,desc:'Burst Festering Wounds for additional shadow damage.',range:5,damage:19,cost:0,gain:8,gcd:1200,cd:0,damageType:'magic'},
  {id:'death-coil',name:'Death Coil',kind:'damage',role:'dps',spec:'Unholy',unlockLevel:1,desc:'Spend Runic Power to hurl death magic at the target.',range:30,damage:27,cost:30,gcd:1200,cd:0,damageType:'magic'},
  {id:'outbreak',name:'Outbreak',kind:'damage',role:'dps',spec:'Unholy',unlockLevel:1,desc:'Infect the target with a damaging plague.',range:30,damage:10,cost:0,gain:8,gcd:1200,cd:7000,damageType:'magic'},
  {id:'death-and-decay-unholy',name:'Death and Decay',kind:'damage',role:'dps',spec:'Unholy',unlockLevel:6,desc:'Corrupt the ground beneath enemies with shadow damage.',range:15,damage:17,cost:10,gcd:1200,cd:12000,cleave:3,damageType:'magic'},
  {id:'dark-transformation',name:'Dark Transformation',kind:'pet-command',role:'dps',spec:'Unholy',unlockLevel:1,desc:'Empower your permanent Ghoul into a savage frenzy.',range:30,cost:15,gcd:1000,cd:30000,petCommand:'dark-transformation'},
  {id:'army-of-the-dead',name:'Army of the Dead',kind:'summon',role:'dps',spec:'Unholy',unlockLevel:1,desc:'Summon a pack of temporary ghouls to tear into your enemies.',range:30,cost:35,gcd:1500,cast:1800,cd:75000,duration:14000,summonType:'army-ghoul',summonCount:4},
  {id:'apocalypse',name:'Apocalypse',kind:'summon',role:'dps',spec:'Unholy',unlockLevel:1,desc:'Burst Festering Wounds and summon additional undead attackers.',range:5,cost:30,gcd:1500,cd:45000,duration:12000,summonType:'apocalypse-ghoul',summonCount:2},
  {id:'anti-magic-shell',name:'Anti-Magic Shell',kind:'defensive',role:'dps',spec:'Unholy',unlockLevel:8,desc:'Wrap yourself in anti-magic energy to reduce incoming damage.',duration:8000,damageReduction:.25,gcd:0,cd:75000}
 ],
 'Demon Hunter':[
  {id:'demons-bite',name:"Demon's Bite",kind:'damage',role:'dps',spec:'Havoc',unlockLevel:1,desc:'Generate Fury with a fast warglaive strike.',range:5,damage:16,cost:0,gain:24,gcd:1000,cd:0},
  {id:'chaos-strike',name:'Chaos Strike',kind:'damage',role:'dps',spec:'Havoc',unlockLevel:1,desc:'Spend Fury on a heavy chaos-infused melee strike.',range:5,damage:28,cost:30,gcd:1000,cd:0,damageType:'magic'},
  {id:'blade-dance',name:'Blade Dance',kind:'damage',role:'dps',spec:'Havoc',unlockLevel:1,desc:'Dance through the target and nearby enemies with both warglaives.',range:6,damage:20,cost:25,gcd:1000,cd:8000,cleave:3},
  {id:'throw-glaive',name:'Throw Glaive',kind:'damage',role:'dps',spec:'Havoc',unlockLevel:4,desc:'Throw a warglaive at a distant target while repositioning.',range:20,damage:15,cost:0,gain:8,gcd:1000,cd:6000},
  {id:'eye-beam',name:'Eye Beam',kind:'damage',role:'dps',spec:'Havoc',unlockLevel:6,desc:'Channel fel energy through enemies in front of you.',range:18,damage:32,cost:30,gcd:1000,cast:1200,cd:18000,cleave:3,damageType:'magic'},
  {id:'fel-barrage',name:'Fel Barrage',kind:'damage',role:'dps',spec:'Havoc',unlockLevel:1,desc:'Unleash a violent fel barrage across the enemy pack.',range:18,damage:38,cost:35,gcd:1000,cd:22000,cleave:4,damageType:'magic'},
  {id:'havoc-metamorphosis',name:'Metamorphosis',kind:'damage',role:'dps',spec:'Havoc',unlockLevel:1,desc:'Transform and crash into the target, opening a major demonic burst window.',range:12,damage:40,cost:20,gcd:1000,cd:60000,cleave:2,damageType:'magic'},
  {id:'blur',name:'Blur',kind:'defensive',role:'dps',spec:'Havoc',unlockLevel:10,desc:'Blur your form, reducing incoming damage for 8 seconds.',duration:8000,damageReduction:.30,gcd:0,cd:75000},
  {id:'disrupt',name:'Disrupt',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast with fel force.',range:10,cost:0,gcd:0,cd:15000},

  {id:'shear',name:'Shear',kind:'damage',role:'tank',spec:'Vengeance',unlockLevel:1,desc:'Rip into the target, generating Fury and a Soul Fragment.',range:5,damage:16,cost:0,gain:18,gcd:1000,cd:0,threat:2.6},
  {id:'soul-cleave',name:'Soul Cleave',kind:'damage',role:'tank',spec:'Vengeance',unlockLevel:1,desc:'Spend Fury and consume Soul Fragments to damage the target and heal yourself.',range:5,damage:21,cost:30,gcd:1000,cd:0,threat:2.4,damageType:'magic'},
  {id:'infernal-strike',name:'Infernal Strike',kind:'damage',role:'tank',spec:'Vengeance',unlockLevel:1,desc:'Leap into the pack in a burst of fel fire and heavy threat.',range:15,damage:17,cost:10,gain:8,gcd:1000,cd:10000,cleave:3,threat:2.8,damageType:'magic'},
  {id:'torment',name:'Torment',kind:'taunt',role:'tank',spec:'Vengeance',unlockLevel:1,desc:'Torment the enemy and force its attention onto the Demon Hunter.',range:30,cost:0,gcd:0,cd:8000,threat:5},
  {id:'sigil-of-flame',name:'Sigil of Flame',kind:'damage',role:'tank',spec:'Vengeance',unlockLevel:1,desc:'Burn enemies in a fel sigil for area damage and pack threat.',range:18,damage:20,cost:12,gain:8,gcd:1000,cd:12000,cleave:3,threat:2.7,damageType:'magic'},
  {id:'demon-spikes',name:'Demon Spikes',kind:'defensive',role:'tank',spec:'Vengeance',unlockLevel:5,desc:'Harden your body with demonic spikes to reduce incoming damage.',duration:7000,damageReduction:.25,gcd:0,cd:18000},
  {id:'fiery-brand',name:'Fiery Brand',kind:'defensive',role:'tank',spec:'Vengeance',unlockLevel:9,desc:'Brand the enemy with fel fire while fortifying yourself against its assault.',duration:8000,damageReduction:.30,gcd:0,cd:60000},
  {id:'spirit-bomb',name:'Spirit Bomb',kind:'damage',role:'tank',spec:'Vengeance',unlockLevel:1,desc:'Consume Soul Fragments in an explosive fel blast that also restores health.',range:10,damage:28,cost:30,gcd:1000,cd:15000,cleave:3,threat:2.9,damageType:'magic'},
  {id:'vengeance-metamorphosis',name:'Metamorphosis',kind:'defensive',role:'tank',spec:'Vengeance',unlockLevel:1,desc:'Transform into a towering demon, restoring health and greatly reducing damage taken.',duration:10000,damageReduction:.35,selfHealPct:.18,gcd:0,cd:90000}
 ],
 Druid:[
  {id:'rejuvenation',name:'Rejuvenation',kind:'heal',role:'healer',unlockLevel:1,desc:'An efficient heal with a short healing-over-time effect.',range:30,heal:22,cost:10,gcd:1500,cast:0,cd:0,hot:8},
  {id:'regrowth',name:'Regrowth',kind:'heal',role:'healer',unlockLevel:1,desc:'A stronger direct heal for injured allies.',range:30,heal:34,cost:18,gcd:1500,cast:1100,cd:0},
  {id:'wild-growth',name:'Wild Growth',kind:'group-heal',role:'healer',unlockLevel:1,desc:'Restore health to the whole party.',range:30,heal:15,cost:22,gcd:1500,cast:0,cd:8000},
  {id:'skull-bash',name:'Skull Bash',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast.',range:13,cost:0,gcd:0,cd:15000},
  {id:'wrath',name:'Wrath',kind:'damage',unlockLevel:4,desc:'A ranged nature attack for safe damage windows.',range:30,damage:14,cost:4,gcd:1500,cast:1200,cd:0},
  {id:'barkskin',name:'Barkskin',kind:'defensive',unlockLevel:8,desc:'Reduce incoming damage for 8 seconds.',duration:8000,damageReduction:.20,gcd:0,cd:60000},
  {id:'tranquility',name:'Tranquility',kind:'group-heal',role:'healer',unlockLevel:14,desc:'A powerful emergency party heal with a long cooldown.',range:30,heal:30,cost:32,gcd:1500,cast:2500,cd:30000}
 ],
 Evoker:[
  {id:'reversion',name:'Reversion',kind:'heal',role:'healer',spec:'Preservation',unlockLevel:1,desc:'Rewind an ally to a healthier moment and continue healing them briefly.',range:25,heal:24,cost:1,gcd:1500,cast:0,cd:7000,hot:8},
  {id:'verdant-embrace',name:'Verdant Embrace',kind:'heal',role:'healer',spec:'Preservation',unlockLevel:1,desc:'Rush restorative dragon magic into an injured ally.',range:25,heal:35,cost:1,gcd:1500,cast:700,cd:6000},
  {id:'emerald-blossom',name:'Emerald Blossom',kind:'group-heal',role:'healer',spec:'Preservation',unlockLevel:1,desc:'Bloom emerald magic through the party.',range:25,heal:18,cost:2,gcd:1500,cast:1000,cd:8000},
  {id:'dream-breath',name:'Dream Breath',kind:'group-heal',role:'healer',spec:'Preservation',unlockLevel:1,desc:'Breathe restorative energy across the party.',range:25,heal:29,cost:3,gcd:1500,cast:1600,cd:22000},
  {id:'temporal-anomaly',name:'Temporal Anomaly',kind:'group-heal',role:'healer',spec:'Preservation',unlockLevel:8,desc:'Send a temporal pulse through allies for broad recovery.',range:25,heal:16,cost:2,gcd:1500,cast:900,cd:12000},
  {id:'emerald-communion',name:'Emerald Communion',kind:'group-heal',role:'healer',spec:'Preservation',unlockLevel:1,desc:'Commune with emerald magic for a powerful emergency party heal.',range:25,heal:38,cost:4,gcd:1500,cast:1800,cd:60000},
  {id:'preservation-living-flame',name:'Living Flame',kind:'damage',role:'healer',spec:'Preservation',unlockLevel:4,desc:'A safe ranged damage spell for quiet healing windows.',range:25,damage:14,cost:0,gcd:1500,cast:1200,cd:0,damageType:'magic'},
  {id:'quell',name:'Quell',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast with draconic force.',range:25,cost:0,gcd:0,cd:24000},
  {id:'obsidian-scales',name:'Obsidian Scales',kind:'defensive',unlockLevel:8,desc:'Harden your scales to reduce incoming damage.',duration:8000,damageReduction:.25,gcd:0,cd:75000},

  {id:'living-flame',name:'Living Flame',kind:'damage',role:'dps',spec:'Devastation',unlockLevel:1,desc:'Launch a focused bolt of red dragonfire.',range:30,damage:22,cost:0,gcd:1500,cast:1300,cd:0,damageType:'magic'},
  {id:'azure-strike',name:'Azure Strike',kind:'damage',role:'dps',spec:'Devastation',unlockLevel:1,desc:'Strike instantly with blue dragon magic.',range:30,damage:14,cost:0,gcd:1500,cd:0,damageType:'magic'},
  {id:'disintegrate',name:'Disintegrate',kind:'damage',role:'dps',spec:'Devastation',unlockLevel:1,desc:'Spend Essence to tear into the target with blue magic.',range:30,damage:34,cost:2,gcd:1500,cast:1400,cd:0,damageType:'magic'},
  {id:'fire-breath',name:'Fire Breath',kind:'damage',role:'dps',spec:'Devastation',unlockLevel:4,desc:'Breathe red dragonfire through the enemy pack.',range:22,damage:27,cost:1,gcd:1500,cast:1200,cd:14000,cleave:3,damageType:'magic'},
  {id:'pyre',name:'Pyre',kind:'damage',role:'dps',spec:'Devastation',unlockLevel:6,desc:'Spend Essence to explode dragonfire across nearby enemies.',range:30,damage:25,cost:2,gcd:1500,cd:6000,cleave:3,damageType:'magic'},
  {id:'eternity-surge',name:'Eternity Surge',kind:'damage',role:'dps',spec:'Devastation',unlockLevel:1,desc:'Release a devastating blast of blue dragon magic.',range:30,damage:40,cost:3,gcd:1500,cast:1700,cd:18000,cleave:2,damageType:'magic'},
  {id:'dragonrage',name:'Dragonrage',kind:'damage',role:'dps',spec:'Devastation',unlockLevel:1,desc:'Unleash the full fury of the dragonflights and enter a major burst window.',range:30,damage:38,cost:2,gcd:1500,cd:60000,cleave:3,damageType:'magic'}
 ],
 Hunter:[
  {id:'aimed-shot',name:'Aimed Shot',kind:'damage',unlockLevel:1,desc:'A slow, heavy ranged shot.',range:35,damage:31,cost:35,gcd:1500,cast:1500,cd:7000},
  {id:'arcane-shot',name:'Arcane Shot',kind:'damage',unlockLevel:1,desc:'Reliable ranged damage.',range:35,damage:17,cost:20,gcd:1500,cd:0},
  {id:'steady-shot',name:'Steady Shot',kind:'damage',unlockLevel:1,desc:'Generate Focus while maintaining ranged pressure.',range:35,damage:11,cost:0,gain:18,gcd:1500,cast:900,cd:0},
  {id:'counter-shot',name:'Counter Shot',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast from range.',range:35,cost:0,gcd:0,cd:24000},
  {id:'multi-shot',name:'Multi-Shot',kind:'damage',unlockLevel:5,desc:'Strike the target and nearby enemies.',range:35,damage:14,cost:30,gcd:1500,cd:6000,cleave:2},
  {id:'kill-shot',name:'Kill Shot',kind:'damage',unlockLevel:9,desc:'A finishing attack that is strongest against weakened enemies.',range:35,damage:24,cost:20,gcd:1500,cd:10000,executeBelow:.20,executeMultiplier:1.85},
  {id:'survival-instincts',name:'Survival Instincts',kind:'defensive',unlockLevel:13,desc:'Reduce incoming damage for 8 seconds.',duration:8000,damageReduction:.20,gcd:0,cd:75000}
 ],
 Mage:[
  {id:'pyroblast',name:'Pyroblast',kind:'damage',unlockLevel:1,desc:'A slow, devastating ranged spell.',range:35,damage:36,cost:14,gcd:1500,cast:2200,cd:8000},
  {id:'fireball',name:'Fireball',kind:'damage',unlockLevel:1,desc:'Reliable ranged spell damage.',range:35,damage:24,cost:8,gcd:1500,cast:1700,cd:0},
  {id:'fire-blast',name:'Fire Blast',kind:'damage',unlockLevel:1,desc:'An instant burst of damage.',range:35,damage:16,cost:4,gcd:0,cast:0,cd:9000},
  {id:'counterspell',name:'Counterspell',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast from range.',range:35,cost:0,gcd:0,cd:24000},
  {id:'arcane-barrage',name:'Arcane Barrage',kind:'damage',unlockLevel:5,desc:'An instant ranged attack with a short cooldown.',range:35,damage:25,cost:12,gcd:1500,cd:5000},
  {id:'arcane-ward',name:'Arcane Ward',kind:'defensive',unlockLevel:9,desc:'Reduce incoming damage for 8 seconds.',duration:8000,damageReduction:.25,gcd:0,cd:75000},
  {id:'arcane-nova',name:'Arcane Nova',kind:'damage',unlockLevel:13,desc:'Burst the target and nearby enemies with arcane energy.',range:25,damage:22,cost:18,gcd:1500,cd:10000,cleave:3}
 ],
 Warrior:[
  {id:'shield-slam',name:'Shield Slam',kind:'damage',role:'tank',unlockLevel:1,desc:'High-threat melee strike.',range:5,damage:21,cost:20,gain:8,gcd:1500,cd:6000,threat:3},
  {id:'revenge',name:'Revenge',kind:'damage',role:'tank',unlockLevel:1,desc:'Reliable tank damage with increased threat.',range:5,damage:16,cost:15,gcd:1500,cd:3000,threat:2.5},
  {id:'taunt',name:'Taunt',kind:'taunt',role:'tank',unlockLevel:1,desc:'Force an enemy to attack the Warrior.',range:30,cost:0,gcd:0,cd:8000,threat:5},
  {id:'mortal-strike',name:'Mortal Strike',kind:'damage',role:'dps',unlockLevel:1,desc:'Heavy single-target weapon damage.',range:5,damage:29,cost:30,gcd:1500,cd:6000},
  {id:'slam',name:'Slam',kind:'damage',role:'dps',unlockLevel:1,desc:'Reliable melee damage.',range:5,damage:18,cost:18,gcd:1500,cd:0},
  {id:'execute',name:'Execute',kind:'damage',role:'dps',unlockLevel:1,desc:'A finishing strike that becomes deadly against weakened enemies.',range:5,damage:22,cost:25,gcd:1500,cd:7000,executeBelow:.25,executeMultiplier:1.9},
  {id:'pummel',name:'Pummel',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast.',range:5,cost:0,gcd:0,cd:15000},
  {id:'shield-wall',name:'Shield Wall',kind:'defensive',role:'tank',unlockLevel:6,desc:'Greatly reduce incoming damage for 8 seconds.',duration:8000,damageReduction:.40,gcd:0,cd:90000},
  {id:'sweeping-strike',name:'Sweeping Strike',kind:'damage',role:'dps',unlockLevel:6,desc:'Strike the target and nearby enemies.',range:5,damage:20,cost:24,gcd:1500,cd:9000,cleave:2},
  {id:'thunder-clap',name:'Thunder Clap',kind:'damage',role:'tank',unlockLevel:10,desc:'Damage several enemies while generating extra threat.',range:8,damage:17,cost:18,gcd:1500,cd:8000,cleave:3,threat:2.7},
  {id:'rallying-guard',name:'Rallying Guard',kind:'defensive',role:'dps',unlockLevel:10,desc:'Brace for danger and reduce incoming damage for 8 seconds.',duration:8000,damageReduction:.20,gcd:0,cd:75000},
  {id:'overpower',name:'Overpower',kind:'damage',role:'dps',unlockLevel:14,desc:'A powerful strike with a short cooldown.',range:5,damage:27,cost:18,gcd:1500,cd:5000}
 ],
 Paladin:[
  {id:'avengers-shield',name:"Avenger's Shield",kind:'damage',role:'tank',unlockLevel:1,desc:'Ranged tank attack with strong threat and cleave.',range:30,damage:20,cost:5,gcd:1500,cd:6000,threat:3,cleave:2},
  {id:'judgement',name:'Judgement',kind:'damage',unlockLevel:1,desc:'A reliable ranged holy attack.',range:30,damage:17,cost:4,gcd:1500,cd:3500,threat:1.7},
  {id:'hand-reckoning',name:'Hand of Reckoning',kind:'taunt',role:'tank',unlockLevel:1,desc:'Force an enemy to attack the Paladin.',range:30,cost:0,gcd:0,cd:8000,threat:5},
  {id:'holy-light',name:'Holy Light',kind:'heal',role:'healer',unlockLevel:1,desc:'A strong efficient direct heal.',range:30,heal:37,cost:14,gcd:1500,cast:1500,cd:0},
  {id:'holy-shock',name:'Holy Shock',kind:'heal',role:'healer',unlockLevel:1,desc:'An instant heal with a short cooldown.',range:30,heal:25,cost:9,gcd:1500,cast:0,cd:6000},
  {id:'light-of-dawn',name:'Light of Dawn',kind:'group-heal',role:'healer',unlockLevel:1,desc:'Restore health to the whole party.',range:30,heal:16,cost:18,gcd:1500,cast:0,cd:7000},
  {id:'rebuke',name:'Rebuke',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast.',range:5,cost:0,gcd:0,cd:15000},
  {id:'ardent-defender',name:'Ardent Defender',kind:'defensive',role:'tank',unlockLevel:6,desc:'Reduce incoming damage for 8 seconds.',duration:8000,damageReduction:.30,gcd:0,cd:75000},
  {id:'flash-of-light',name:'Flash of Light',kind:'heal',role:'healer',unlockLevel:6,desc:'A fast emergency heal at a higher mana cost.',range:30,heal:30,cost:19,gcd:1500,cast:800,cd:0},
  {id:'divine-protection',name:'Divine Protection',kind:'defensive',unlockLevel:10,desc:'Reduce incoming damage for 8 seconds.',duration:8000,damageReduction:.20,gcd:0,cd:60000},
  {id:'consecration',name:'Consecration',kind:'damage',role:'tank',unlockLevel:10,desc:'Damage the target and nearby enemies.',range:8,damage:16,cost:10,gcd:1500,cd:9000,cleave:3,threat:2.2},
  {id:'radiant-wave',name:'Radiant Wave',kind:'group-heal',role:'healer',unlockLevel:14,desc:'A powerful emergency party heal.',range:30,heal:27,cost:30,gcd:1500,cast:1800,cd:22000}
 ],
 Priest:[
  {id:'heal',name:'Heal',kind:'heal',role:'healer',unlockLevel:1,desc:'Efficient direct healing.',range:30,heal:35,cost:13,gcd:1500,cast:1400,cd:0},
  {id:'flash-heal',name:'Flash Heal',kind:'heal',role:'healer',unlockLevel:1,desc:'Fast emergency healing.',range:30,heal:29,cost:18,gcd:1500,cast:800,cd:0},
  {id:'prayer-healing',name:'Prayer of Healing',kind:'group-heal',role:'healer',unlockLevel:1,desc:'Restore health to the whole party.',range:30,heal:18,cost:22,gcd:1500,cast:1700,cd:6500},
  {id:'silence',name:'Silence',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast from range.',range:30,cost:0,gcd:0,cd:30000},
  {id:'smite',name:'Smite',kind:'damage',unlockLevel:4,desc:'A ranged holy attack for safe damage windows.',range:30,damage:13,cost:4,gcd:1500,cast:1200,cd:0},
  {id:'soul-recall',name:'Soul Recall',kind:'battle-rez',role:'healer',unlockLevel:8,desc:'Return a fallen ally to combat. Very long cooldown.',range:30,cost:32,gcd:1500,cast:5000,cd:600000},
  {id:'guardian-spirit',name:'Guardian Spirit',kind:'defensive',role:'healer',unlockLevel:12,desc:'Reduce incoming damage for 8 seconds.',duration:8000,damageReduction:.25,gcd:0,cd:90000},
  {id:'divine-hymn',name:'Divine Hymn',kind:'group-heal',role:'healer',unlockLevel:16,desc:'A major emergency heal for the entire party.',range:30,heal:32,cost:34,gcd:1500,cast:2600,cd:35000}
 ],
 Rogue:[
  {id:'mutilate',name:'Mutilate',kind:'damage',unlockLevel:1,desc:'Reliable melee damage.',range:5,damage:18,cost:35,gcd:1000,cd:0},
  {id:'eviscerate',name:'Eviscerate',kind:'damage',unlockLevel:1,desc:'A hard-hitting finishing attack.',range:5,damage:30,cost:50,gcd:1000,cd:5000},
  {id:'garrote',name:'Garrote',kind:'damage',unlockLevel:1,desc:'A sharp opening attack with a short cooldown.',range:5,damage:21,cost:30,gcd:1000,cd:7000},
  {id:'kick',name:'Kick',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast.',range:5,cost:0,gcd:0,cd:15000},
  {id:'envenom',name:'Envenom',kind:'damage',unlockLevel:5,desc:'Spend Energy for a heavy poisoned strike.',range:5,damage:28,cost:45,gcd:1000,cd:6500},
  {id:'fan-of-knives',name:'Fan of Knives',kind:'damage',unlockLevel:9,desc:'Strike the target and nearby enemies.',range:8,damage:15,cost:35,gcd:1000,cd:7000,cleave:3},
  {id:'feint',name:'Feint',kind:'defensive',unlockLevel:13,desc:'Reduce incoming damage for 8 seconds.',duration:8000,damageReduction:.20,gcd:0,cd:60000}
 ],
 Shaman:[
  {id:'healing-wave',name:'Healing Wave',kind:'heal',role:'healer',unlockLevel:1,desc:'A dependable restorative cast for an injured ally.',range:30,heal:36,cost:14,gcd:1500,cast:1450,cd:0},
  {id:'riptide',name:'Riptide',kind:'heal',role:'healer',unlockLevel:1,desc:'An instant tidal heal that continues restoring health briefly.',range:30,heal:23,cost:10,gcd:1500,cast:0,cd:6000,hot:7},
  {id:'chain-heal',name:'Chain Heal',kind:'group-heal',role:'healer',unlockLevel:1,desc:'Heal one ally, then bounce restorative energy through other injured party members.',range:30,heal:30,cost:20,gcd:1500,cast:1700,cd:0,chainBounces:3,chainFalloff:.72,chainRange:16},
  {id:'wind-shear',name:'Wind Shear',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast with a sharp burst of wind.',range:30,cost:0,gcd:0,cd:18000},
  {id:'windfury-totem',name:'Windfury Totem',kind:'totem',role:'healer',unlockLevel:1,desc:'Place a Windfury Totem that increases party damage and haste while it remains active.',cost:8,gcd:1000,cd:45000,duration:20000,totemType:'windfury'},
  {id:'stoneskin-totem',name:'Stoneskin Totem',kind:'totem',role:'healer',unlockLevel:1,desc:'Place a Stoneskin Totem that reduces damage taken by the party while it remains active.',cost:10,gcd:1000,cd:45000,duration:20000,totemType:'stoneskin'},
  {id:'healing-stream-totem',name:'Healing Stream Totem',kind:'totem',role:'healer',unlockLevel:1,desc:'Place a Healing Stream Totem that pulses healing through the party while it remains active.',cost:12,gcd:1000,cd:30000,duration:20000,totemType:'healing-stream'},
  {id:'spirit-link-totem',name:'Spirit Link Totem',kind:'totem',role:'healer',unlockLevel:1,desc:'Place an emergency Spirit Link Totem that protects and stabilises injured allies.',cost:18,gcd:1000,cd:75000,duration:8000,totemType:'spirit-link'},
  {id:'lightning-bolt',name:'Lightning Bolt',kind:'damage',unlockLevel:4,desc:'A ranged lightning attack for safe damage windows.',range:30,damage:13,cost:4,gcd:1500,cast:1200,cd:0},
  {id:'healing-rain',name:'Healing Rain',kind:'group-heal',role:'healer',unlockLevel:8,desc:'Call restorative rain over the party for broad recovery.',range:30,heal:16,cost:24,gcd:1500,cast:1200,cd:10000},
  {id:'astral-shift',name:'Astral Shift',kind:'defensive',unlockLevel:11,desc:'Shift partially into the spirit world, reducing incoming damage for 8 seconds.',duration:8000,damageReduction:.25,gcd:0,cd:75000}

 ],
 Warlock:[
  {id:'shadow-bolt',name:'Shadow Bolt',kind:'damage',unlockLevel:1,desc:'A reliable ranged shadow spell.',range:35,damage:19,cost:6,gcd:1500,cast:1450,cd:0},
  {id:'demonbolt',name:'Demonbolt',kind:'damage',unlockLevel:1,desc:'Hurl concentrated demonic energy at the target.',range:35,damage:29,cost:11,gcd:1500,cast:1800,cd:6000},
  {id:'hand-of-guldan',name:"Hand of Gul'dan",kind:'damage',unlockLevel:1,desc:'Call down fel energy on the target and nearby enemies.',range:35,damage:23,cost:15,gcd:1500,cast:1500,cd:7000,cleave:2},
  {id:'axe-toss',name:'Axe Toss',kind:'interrupt',unlockLevel:1,desc:'Command your Felguard to hurl its weapon and interrupt an enemy cast.',range:30,cost:0,gcd:0,cd:20000},
  {id:'call-dreadstalkers',name:'Call Dreadstalkers',kind:'summon',unlockLevel:1,desc:'Summon two Dreadstalkers to maul your enemies for a short time.',range:35,cost:16,gcd:1500,cast:1200,cd:20000,duration:12000,summonType:'dreadstalker',summonCount:2},
  {id:'soul-strike',name:'Soul Strike',kind:'pet-command',unlockLevel:1,desc:'Command your Felguard to deliver a crushing soul-infused strike.',range:30,cost:8,gcd:1000,cd:10000,petCommand:'soul-strike'},
  {id:'dark-pact',name:'Dark Pact',kind:'defensive',unlockLevel:5,desc:'Wrap yourself in demonic power, reducing incoming damage for 8 seconds.',duration:8000,damageReduction:.25,gcd:0,cd:75000},
  {id:'felstorm',name:'Felstorm',kind:'pet-command',unlockLevel:1,desc:'Command your Felguard to spin through several nearby enemies.',range:30,cost:12,gcd:1000,cd:18000,petCommand:'felstorm',cleave:3},
  {id:'implosion',name:'Implosion',kind:'pet-command',unlockLevel:10,desc:'Detonate your temporary demons into the target for explosive area damage.',range:35,cost:10,gcd:1500,cd:16000,petCommand:'implosion',cleave:3},
  {id:'summon-demonic-tyrant',name:'Summon Demonic Tyrant',kind:'summon',unlockLevel:1,desc:'Summon a Demonic Tyrant that bombards enemies and empowers your active demons.',range:35,cost:20,gcd:1500,cast:1600,cd:60000,duration:15000,summonType:'tyrant',summonCount:1}
 ],
 Monk:[
  {id:'keg-smash',name:'Keg Smash',kind:'damage',role:'tank',unlockLevel:1,desc:'Smash the target and nearby enemies with heavy threat.',range:8,damage:20,cost:25,gcd:1000,cd:8000,threat:3,cleave:3},
  {id:'brewmaster-blackout-kick',name:'Blackout Kick',kind:'damage',role:'tank',unlockLevel:1,desc:'Reliable Brewmaster melee pressure.',range:5,damage:16,cost:18,gcd:1000,cd:3000,threat:2.2},
  {id:'provoke',name:'Provoke',kind:'taunt',role:'tank',unlockLevel:1,desc:'Challenge an enemy and force its attention onto the Brewmaster.',range:30,cost:0,gcd:0,cd:8000,threat:5},
  {id:'purifying-brew',name:'Purifying Brew',kind:'defensive',role:'tank',unlockLevel:1,desc:'Clear a large portion of accumulated Stagger damage.',duration:1000,damageReduction:0,gcd:0,cd:12000,purifyStagger:.50},
  {id:'celestial-brew',name:'Celestial Brew',kind:'defensive',role:'tank',unlockLevel:6,desc:'Reduce incoming damage while your brews stabilise you.',duration:7000,damageReduction:.28,gcd:0,cd:45000},
  {id:'breath-of-fire',name:'Breath of Fire',kind:'damage',role:'tank',unlockLevel:1,desc:'Breathe fire across the target and nearby enemies.',range:8,damage:18,cost:20,gcd:1000,cd:12000,cleave:3,threat:2.4,damageType:'magic'},
  {id:'fortifying-brew',name:'Fortifying Brew',kind:'defensive',role:'tank',unlockLevel:1,desc:'Major defensive brew that also restores health.',duration:10000,damageReduction:.35,selfHealPct:.15,gcd:0,cd:90000},
  {id:'soothing-mist',name:'Soothing Mist',kind:'heal',role:'healer',unlockLevel:1,desc:'Efficient focused healing through soothing mist.',range:30,heal:29,cost:10,gcd:1500,cast:950,cd:0},
  {id:'vivify',name:'Vivify',kind:'heal',role:'healer',unlockLevel:1,desc:'A strong direct heal for an injured ally.',range:30,heal:35,cost:15,gcd:1500,cast:1250,cd:0},
  {id:'renewing-mist',name:'Renewing Mist',kind:'heal',role:'healer',unlockLevel:1,desc:'Instant healing that continues restoring the target over time.',range:30,heal:20,cost:11,gcd:1500,cast:0,cd:6000,hot:7},
  {id:'essence-font',name:'Essence Font',kind:'group-heal',role:'healer',unlockLevel:6,desc:'Release a wave of healing across the party.',range:30,heal:16,cost:23,gcd:1500,cast:1500,cd:9000},
  {id:'mist-rising-sun-kick',name:'Rising Sun Kick',kind:'damage',role:'healer',unlockLevel:4,desc:'A martial strike that can fuel fistweaving healing.',range:5,damage:19,cost:5,gcd:1000,cd:8000},
  {id:'mist-tiger-palm',name:'Tiger Palm',kind:'damage',role:'healer',unlockLevel:4,desc:'A quick martial strike for safe healing windows.',range:5,damage:11,cost:2,gcd:1000,cd:0},
  {id:'revival',name:'Revival',kind:'group-heal',role:'healer',unlockLevel:1,desc:'Instantly restore the whole party in an emergency.',range:30,heal:32,cost:30,gcd:1500,cast:0,cd:45000},
  {id:'tiger-palm',name:'Tiger Palm',kind:'damage',role:'dps',unlockLevel:1,desc:'A quick strike that maintains martial pressure.',range:5,damage:14,cost:18,gain:10,gcd:1000,cd:0},
  {id:'windwalker-blackout-kick',name:'Blackout Kick',kind:'damage',role:'dps',unlockLevel:1,desc:'A fast finishing kick in the Windwalker rotation.',range:5,damage:20,cost:26,gcd:1000,cd:3000},
  {id:'windwalker-rising-sun-kick',name:'Rising Sun Kick',kind:'damage',role:'dps',unlockLevel:1,desc:'A heavy martial strike with a short cooldown.',range:5,damage:31,cost:32,gcd:1000,cd:8000},
  {id:'spinning-crane-kick',name:'Spinning Crane Kick',kind:'damage',role:'dps',unlockLevel:5,desc:'Spin through the target and nearby enemies.',range:7,damage:17,cost:28,gcd:1000,cd:7000,cleave:3},
  {id:'fists-of-fury',name:'Fists of Fury',kind:'damage',role:'dps',unlockLevel:1,desc:'Unleash a powerful flurry that cleaves nearby enemies.',range:6,damage:34,cost:38,gcd:1000,cast:1300,cd:18000,cleave:2},
  {id:'touch-of-death',name:'Touch of Death',kind:'damage',role:'dps',unlockLevel:1,desc:'A devastating finishing technique against weakened enemies.',range:5,damage:30,cost:20,gcd:1000,cd:30000,executeBelow:.20,executeMultiplier:2.4},
  {id:'touch-of-karma',name:'Touch of Karma',kind:'defensive',role:'dps',unlockLevel:9,desc:'Reduce incoming damage for a short period.',duration:7000,damageReduction:.25,gcd:0,cd:75000},
  {id:'spear-hand-strike',name:'Spear Hand Strike',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast with a precise hand strike.',range:5,cost:0,gcd:0,cd:15000}
 ]
};

const ROLE_FALLBACKS={
 tank:[
  {id:'guard-strike',name:'Guard Strike',kind:'damage',range:5,damage:18,cost:0,gcd:1500,cd:0,threat:2.6},
  {id:'provoke',name:'Provoke',kind:'taunt',range:30,cost:0,gcd:0,cd:8000,threat:5}
 ],
 healer:[
  {id:'restore',name:'Restore',kind:'heal',range:30,heal:31,cost:10,gcd:1500,cast:1000,cd:0},
  {id:'renewing-wave',name:'Renewing Wave',kind:'group-heal',range:30,heal:14,cost:18,gcd:1500,cast:1200,cd:8000},
  {id:'light-bolt',name:'Light Bolt',kind:'damage',range:30,damage:11,cost:3,gcd:1500,cast:900,cd:0}
 ],
 dps:[
  {id:'strike',name:'Strike',kind:'damage',range:5,damage:18,cost:0,gcd:1500,cd:0},
  {id:'interrupt',name:'Interrupt',kind:'interrupt',range:10,cost:0,gcd:0,cd:18000}
 ]
};

function hashSeed(input){
 let h=2166136261>>>0,s=String(input||'cellbound');
 for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
 return h>>>0;
}
function rngFrom(seed){
 let a=hashSeed(seed)||1;
 return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
}
function copy(v){return JSON.parse(JSON.stringify(v))}
function inferredRole(c){
 const r=window.CellboundIdentities?.role?.(c);
 if(r)return r;
 const s=String(c?.spec||'').toLowerCase();
 if(/protect|guardian|blood|vengeance|brewmaster/.test(s))return'tank';
 if(/^(holy|restoration|discipline|preservation|mistweaver)$/.test(s))return'healer';
 return'dps';
}
function resourceDef(c){
 return RESOURCE_DEFS[c?.class+'|'+c?.spec]||RESOURCE_DEFS[c?.class]||{name:'Power',max:100,start:100,regen:8};
}
function carriedStatuses(c){
 const input=Array.isArray(c?._combatStatuses)?c._combatStatuses:[],out={};
 input.forEach(raw=>{
  const remaining=Math.max(0,Number(raw?.remainingMs??raw?.duration)||0);if(!remaining)return;
  const id=raw.id||String(raw.name||'status').toLowerCase().replace(/[^a-z0-9]+/g,'-');
  out[id]={id,name:raw.name||id,kind:raw.kind==='debuff'?'debuff':'buff',source:raw.source||null,stacks:Math.max(1,Number(raw.stacks)||1),duration:remaining,expiresAt:remaining,effect:copy(raw.effect||{}),cc:raw.cc||null,breakOnDamage:!!raw.breakOnDamage,persistAcrossEncounters:!!raw.persistAcrossEncounters}
 });
 return out
}
function statusBonus(u,key){
 return Object.values(u?.statuses||{}).reduce((n,s)=>n+(Number(s?.effect?.[key])||0),0)
}
function classBuffFor(u){return CLASS_BUFFS[u?.class]||null}
function talentRanks(c){
 const tree=c?.talents?.[c?.spec]||{};
 return Object.values(tree).reduce((n,v)=>n+Math.max(0,Number(v)||0),0);
}
function classMobility(c){
 if(c.class==='Demon Hunter')return 1.35;
 if(c.class==='Hunter'||c.class==='Druid'||c.class==='Evoker')return 1.18;
 if(c.class==='Death Knight')return .86;
 return 1;
}


function gearSetState(c){
 const counts={};
 Object.values(c?.equipment||{}).forEach(item=>{if(item?.setId)counts[item.setId]=(counts[item.setId]||0)+1});
 const sets=Object.entries(counts).map(([id,pieces])=>({id,pieces,name:Object.values(c?.equipment||{}).find(x=>x?.setId===id)?.setName||id}));
 const rules=window.CellboundGear?.SET_BONUS_RULES||{pieces2:{threshold:2,outputScale:1.05},pieces4:{threshold:4,resourceRegen:1.12}};
 return{
   sets,
   outputScale:sets.some(s=>s.pieces>=Number(rules.pieces2?.threshold||2))?Number(rules.pieces2?.outputScale||1.05):1,
   resourceRegen:sets.some(s=>s.pieces>=Number(rules.pieces4?.threshold||4))?Number(rules.pieces4?.resourceRegen||1.12):1
 }
}

function equippedUniqueEffects(c){
 const out=[];
 Object.values(c?.equipment||{}).forEach(item=>{
  const effect=item?.uniqueEffect;
  if(effect?.id&&!out.some(x=>x.id===effect.id))out.push(copy(effect))
 });
 return out
}
function hasUnique(u,id){return Array.isArray(u?.uniqueEffects)&&u.uniqueEffects.some(x=>x.id===id)}
function triggerUnique(ctx,u,id,name,payload={}){
 if(!u)return;
 emit(ctx,'UNIQUE_EFFECT_TRIGGER',{source:u.id,target:payload.target||u.id,ability:name,result:id,payload:{effectId:id,...payload}})
}


const TALENT_SKILL_REQUIREMENTS={
  'mortal-strike':'Mortal Strike','overpower':'Overpower','sweeping-strike':'Sweeping Blows',
  'consecration':'Consecration','ardent-defender':'Ardent Defender','holy-shock':'Holy Shock','radiant-wave':'Radiance',
  'guardian-spirit':'Guardian Spirit','divine-hymn':'Divine Hymn',
  'wild-growth':'Wild Growth','tranquility':'Tranquility',
  'kill-shot':'Kill Shot','garrote':'Garrote','envenom':'Envenom','arcane-barrage':'Barrage',
  'spirit-link-totem':'Spirit Link Totem','soul-strike':'Soul Strike','felstorm':'Felstorm','summon-demonic-tyrant':'Demonic Tyrant',
  'breath-of-fire':'Breath of Fire','fortifying-brew':'Fortifying Brew','revival':'Revival','fists-of-fury':'Fists of Fury','touch-of-death':'Touch of Death',
  'rune-tap':'Rune Tap','dancing-rune-weapon':'Dancing Rune Weapon','vampiric-blood':'Vampiric Blood','remorseless-winter':'Remorseless Winter','breath-of-sindragosa':'Breath of Sindragosa','dark-transformation':'Dark Transformation','army-of-the-dead':'Army of the Dead','apocalypse':'Apocalypse',
  'fel-barrage':'Fel Barrage','havoc-metamorphosis':'Metamorphosis','sigil-of-flame':'Sigil of Flame','spirit-bomb':'Spirit Bomb','vengeance-metamorphosis':'Metamorphosis',
  'dream-breath':'Dream Breath','emerald-communion':'Emerald Communion','eternity-surge':'Eternity Surge','dragonrage':'Dragonrage'
};
const TALENT_RULES={
 'Shield Mastery':'More block chance and physical mitigation per rank.',
 'Last Stand':'Once per encounter, falling dangerously low restores health and grants brief protection.',
 'Iron Discipline':'Reduces physical damage taken.',
 'Taunt Mastery':'Taunts hold enemies longer and create a larger threat lead.',
 'Hold the Line':'Blocking grants a short damage-reduction buff.',
 'Vengeance':'Taking damage briefly increases outgoing damage.',
 'Bulwark':'Using a major defensive also protects the party.',
 'Fortress':'Reduces damage taken during boss encounters.',
 'Unbroken':'Once per encounter, a lethal hit leaves the Warrior standing at 1 HP.',
 'Weapon Mastery':'Increases weapon damage.',
 'Deep Wounds':'Critical weapon hits cause a real damage-over-time bleed.',
 'Battle Rhythm':'Successful attacks build a short damage and haste buff.',
 'Overpower':'Deals extra damage to casting or recently interrupted enemies.',
 'Sweeping Blows':'Single-target attacks splash damage to another enemy.',
 'Executioner':'Increases damage against low-health enemies.',
 'Mortal Strike':'Unlocks Mortal Strike and makes it hit harder.',
 'Blood Frenzy':'Bleeding a target grants haste.',
 'Bladestorm':'Against groups, periodically unleashes a real party-visible area attack.',
 'Sacred Shield':'Increases block and physical mitigation.',
 'Guardian Oath':'Increases threat and reduces damage taken.',
 'Righteous Guard':'Blocking grants additional short mitigation.',
 'Hammer of Justice':'Improves interrupt recovery and briefly controls non-boss enemies.',
 'Consecration':'Unlocks Consecration and improves its damage and group threat.',
 'Divine Ward':'Reduces magical damage taken.',
 'Ardent Defender':'Unlocks and strengthens Ardent Defender.',
 'Holy Bastion':'Increases block during boss encounters.',
 'Divine Guardian':'A major defensive also grants party-wide protection.',
 'Divine Light':'Increases direct healing.',
 'Grace':'Reduces mana costs of healing skills.',
 'Holy Shock':'Unlocks Holy Shock and increases its healing.',
 'Infusion':'Direct heals can trigger a short haste buff.',
 'Beacon':'Single-target healing echoes onto the tank.',
 'Sacred Hands':'Heals low-health allies for more.',
 'Aura Mastery':'Makes Blessing of Resolve stronger and last longer.',
 'Radiance':'Unlocks Radiant Wave and causes direct heals to splash to nearby allies.',
 'Divine Hymn':'Empowers major party healing.',
 'Renew':'Direct heals leave a real healing-over-time effect.',
 'Serenity':'Increases direct healing.',
 'Prayer of Mending':'Direct heals jump to additional injured allies.',
 'Focused Will':'Reduces damage taken while the Priest is under pressure.',
 'Circle of Healing':'Increases party-wide healing.',
 'Spirit of Redemption':'On defeat, releases a final heal across surviving allies.',
 'Guardian Spirit':'Unlocks Guardian Spirit and can prevent a lethal hit on an ally.',
 'Divine Insight':'Direct heals can echo for extra healing.',
 'Rejuvenation':'Improves Rejuvenation and its healing-over-time ticks.',
 'Lifebloom':'Focused healing plants additional healing ticks.',
 'Wild Growth':'Unlocks Wild Growth and improves party healing.',
 'Natural Swiftness':'Periodically makes a casted heal instant.',
 'Living Seed':'Direct healing can plant a delayed heal.',
 'Ironbark':'Automatically protects a critically injured ally on a cooldown.',
 'Tree of Life':'Under heavy pressure, temporarily boosts healing and haste.',
 'Flourish':'Party heals extend restoration with an additional healing pulse.',
 'Tranquility':'Unlocks and strengthens Tranquility.',
 'True Aim':'Increases ranged damage.',
 'Rapid Fire':'Reduces Hunter ability cooldowns.',
 'Steady Focus':'Increases damage while the Hunter is stationary.',
 'Concussive Shot':'Damaging attacks can briefly control non-boss enemies.',
 'Piercing Shots':'Critical shots cause a bleed.',
 'Trueshot Aura':'Increases party ranged damage.',
 'Careful Aim':'Deals extra damage to healthy enemies.',
 'Killer Instinct':'Deals extra damage to weakened enemies.',
 'Kill Shot':'Unlocks Kill Shot and improves its execute threshold and damage.',
 'Ambush':'Increases opening damage.',
 'Venom':'Adds poison damage to attacks.',
 'Garrote':'Unlocks Garrote and strengthens its bleed.',
 'Quick Recovery':'Increases Energy regeneration.',
 'Mutilate':'Strengthens Mutilate.',
 'Envenom':'Unlocks and strengthens Envenom.',
 'Master Poisoner':'Improves poison damage.',
 'Cut to the Chase':'Envenom grants a short haste buff.',
 'Eviscerate':'Strengthens Eviscerate as a finisher.',
 'Arcane Focus':'Increases spell damage.',
 'Surge':'Repeated spell hits can trigger a short damage surge.',
 'Clearcasting':'Spells can cost no Mana.',
 'Spell Impact':'Increases spell critical damage.',
 'Presence of Mind':'Periodically makes a casted spell instant.',
 'Arcane Flows':'Reduces Mage cooldowns.',
 'Arcane Power':'Automatically triggers a major damage cooldown in difficult combat.',
 'Nether Precision':'Increases spell critical chance.',
 'Barrage':'Unlocks Arcane Barrage and makes it hit harder with splash damage.',
 'Tidal Focus':'Increases Restoration healing and reduces the Mana cost of healing spells.',
 'Totemic Mastery':'Makes equipped Shaman totems stronger and keeps them active longer.',
 'Riptide':'Strengthens Riptide and its lingering healing.',
 'Ancestral Reach':'Extends Chain Heal bounce range and improves later jumps.',
 'Chain Mastery':'Reduces the healing lost as Chain Heal jumps between allies.',
 'Earthen Ward':'Strengthens Stoneskin Totem and Spirit Link protection.',
 'Tidal Waves':'Riptide and Chain Heal grant a short haste buff for follow-up healing.',
 'Spirit Link Totem':'Unlocks Spirit Link Totem as an equipable combat skill for dangerous party pressure.',
 'Ascendant Tide':'Under heavy pressure, empowers Restoration healing and briefly surges the active totem network.',
 'Demonic Bond':'Increases damage dealt by the Felguard and all temporary demons.',
 'Fel Knowledge':'Increases the damage of Warlock shadow and fel spells.',
 'Soul Strike':'Unlocks Soul Strike, an equipable command for the permanent Felguard.',
 'Dread Calling':'Increases Dreadstalker damage and duration.',
 'Pack Tactics':'Increases demon attack speed.',
 'Felstorm':'Unlocks Felstorm, an equipable Felguard area command.',
 'Demonic Core':'Demon attacks can trigger a short damage and haste surge for the Warlock.',
 'Master Summoner':'Extends temporary demon duration and reduces summon cooldowns.',
 'Demonic Tyrant':'Unlocks Summon Demonic Tyrant, a powerful temporary ranged demon.',
 'High Tolerance':'Increases the share of incoming physical damage delayed by Stagger.',
 'Elusive Brawler':'Reduces damage taken while Brewmaster is under pressure.',
 'Purifying Brew':'Purifying Brew removes more accumulated Stagger per rank.',
 'Keg Mastery':'Increases Keg Smash damage and threat.',
 'Gift of the Ox':'Taking sustained damage can trigger a small self-heal.',
 'Breath of Fire':'Unlocks Breath of Fire and improves pack pressure.',
 'Celestial Brew':'Strengthens Celestial Brew, especially while Stagger is high.',
 'Shuffle':'Reduces each periodic Stagger damage release.',
 'Fortifying Brew':'Unlocks a major defensive brew with health recovery.',
 'Mist Wrap':'Increases Mistweaver direct healing.',
 'Lifecycles':'Reduces Mana costs when alternating healing techniques.',
 'Renewing Mist':'Improves Renewing Mist and its healing-over-time ticks.',
 'Ancient Teachings':'Martial damage smart-heals the most injured ally.',
 'Enveloping Breath':'Direct Mistweaver healing splashes onto nearby injured allies.',
 'Jade Serpent':'Healing casts can trigger a small additional jade-serpent heal.',
 'Rising Mist':'Improves healing generated by Mistweaver martial attacks.',
 'Mana Tea':'Improves Mana efficiency and regeneration.',
 'Revival':'Unlocks Revival, an instant emergency party heal.',
 'Combo Strikes':'Windwalker deals more damage when rotating different attacks and less when repeating one.',
 'Ferocity':'Increases Windwalker martial damage.',
 'Rising Sun Kick':'Increases Rising Sun Kick damage.',
 'Dance of the Wind':'Improves personal mitigation.',
 'Fists of Fury':'Unlocks Fists of Fury.',
 'Jade Ignition':'Area martial attacks deal additional cleave damage.',
 'Momentum':'Successful Combo Strikes grant a short haste surge.',
 'Serenity':'Reduces Windwalker ability costs and cooldowns.',
 'Touch of Death':'Unlocks a powerful execute against weakened enemies.',
 'Heartbreaker':'Improves Heart Strike damage, threat and Runic Power generation.',
 'Ossuary':'Marrowrend grants a stronger Bone Shield.',
 'Hemostasis':'Blood Boil empowers the next Death Strike.',
 'Rune Tap':'Unlocks Rune Tap as an equipable short defensive cooldown.',
 'Blood Shield':'Death Strike grants a short protective blood shield.',
 'Voracious':'Increases Death Strike healing from recent damage.',
 'Dancing Rune Weapon':'Unlocks a major defensive window that also improves threat.',
 'Red Thirst':'Reduces Blood defensive cooldowns.',
 'Vampiric Blood':'Unlocks Vampiric Blood, restoring health and improving incoming healing.',
 'Killing Machine':'Increases critical chance for Obliterate and frost finishers.',
 'Icy Talons':'Frost Strike grants a short haste buff.',
 'Rime':'Improves Howling Blast damage and Runic Power generation.',
 'Obliteration':'Increases Obliterate damage.',
 'Runic Empowerment':'Runic Power spenders can restore Runic Power.',
 'Remorseless Winter':'Unlocks Remorseless Winter for sustained frost cleave.',
 'Avalanche':'Critical frost attacks splash extra damage.',
 'Frozen Pulse':'Low Runic Power strengthens generator attacks.',
 'Breath of Sindragosa':'Unlocks a powerful frost cleave finisher.',
 'Festering Wounds':'Festering Strike applies more wounds and wound bursts deal more damage.',
 'Dark Transformation':'Strengthens the permanent Ghoul and unlocks its transformation command.',
 'Infected Claws':'Ghoul attacks can add disease pressure.',
 'Epidemic':'Disease ticks splash damage to nearby enemies.',
 'Sudden Doom':'Ghoul attacks can empower Death Coil.',
 'Army of the Dead':'Unlocks Army of the Dead as an equipable undead summon.',
 'Unholy Pact':'You and your undead deal more damage while temporary undead are active.',
 'Defile':'Strengthens Death and Decay and plague pressure.',
 'Apocalypse':'Unlocks Apocalypse, consuming wounds and summoning additional undead.',
 'Demon Blades':"Increases Havoc core strike damage and improves Demon's Bite Fury generation.",
 'Furious Gaze':'Eye Beam grants a short haste surge.',
 'Initiative':'Increases Havoc opening damage.',
 'Soul Rending':'Heavy Havoc fel attacks restore a portion of damage dealt as health.',
 'First Blood':'Increases Blade Dance damage and cleave pressure.',
 'Fel Barrage':'Unlocks Fel Barrage as an equipable Havoc area skill.',
 'Demonic':'Eye Beam briefly grants a demonic damage surge.',
 'Chaos Theory':'Strengthens Chaos Strike and gives it a chance to refund Fury.',
 'Thick Skin':'Reduces physical and magical damage taken by Vengeance.',
 'Soul Cleave':'Increases healing from Soul Cleave and consumed Soul Fragments.',
 'Fracture':'Shear generates extra Fury and can create an additional Soul Fragment.',
 'Sigil of Flame':'Unlocks Sigil of Flame as an equipable Vengeance area-threat skill.',
 'Feed the Demon':'Reduces Vengeance defensive cooldowns.',
 'Spirit Bomb':'Unlocks Spirit Bomb, consuming Soul Fragments for area damage and healing.',
 'Soul Barrier':'Consuming Soul Fragments grants short additional mitigation.',
 'Fiery Demise':'Increases Vengeance fel and fire damage.',
 'Metamorphosis':'Unlocks the active Metamorphosis skill for the current Demon Hunter specialisation.',
 'Temporal Mending':'Increases direct Preservation healing.',
 'Essence Attunement':'Improves Preservation Essence regeneration.',
 'Reversion':'Improves Reversion and its healing-over-time ticks.',
 'Lifebind':'Verdant Embrace echoes healing onto another injured ally.',
 'Echoing Bloom':'Emerald Blossom leaves an additional delayed healing pulse.',
 'Dream Breath':'Unlocks Dream Breath as an equipable Preservation group heal.',
 'Time Lord':'Reduces Preservation healing cooldowns.',
 'Cycle of Life':'Group heals can trigger a delayed restorative pulse across the party.',
 'Emerald Communion':'Unlocks Emerald Communion as a major emergency party heal.',
 'Dragonfire':'Increases Devastation red-dragon spell damage.',
 'Azure Mastery':'Increases Devastation blue-dragon spell damage and cleave.',
 'Essence Burst':'Living Flame and Azure Strike can make the next Essence spender free.',
 'Burnout':'Fire Breath empowers the next Living Flame.',
 'Eternity Surge':'Unlocks Eternity Surge as a heavy blue-dragon burst spell.',
 'Pyre':'Increases Pyre damage and area pressure.',
 'Scintillation':'Disintegrate can trigger an extra burst of blue magic.',
 'Power Swell':'Spending Essence grants a short haste surge.',
 'Dragonrage':'Unlocks Dragonrage, a major Devastation burst window.'
};
function characterTalentRank(c,name){return Math.max(0,Number(c?.talents?.[c?.spec]?.[name])||0)}
function talentRank(u,name){return Math.max(0,Number(u?.talentTree?.[name]??u?.original?.talents?.[u?.spec]?.[name])||0)}
function talentReady(ctx,u,key){return Number(u?.talentTimers?.[key]||0)<=ctx.time}
function talentSetCooldown(ctx,u,key,ms){u.talentTimers=u.talentTimers||{};u.talentTimers[key]=ctx.time+Math.max(0,Number(ms)||0)}
function talentTrigger(ctx,u,name,target=u,payload={}){
 emit(ctx,'TALENT_TRIGGER',{source:u?.id||null,target:target?.id||null,ability:name,result:'triggered',position:copy(target?.position||u?.position),payload:{talent:name,...payload}})
}
function talentDamageScale(ctx,u,a,target){
 let m=1,rank=0,hp=healthRatio(target);
 if(u.class==='Warrior'&&u.spec==='Arms'){
  m*=1+talentRank(u,'Weapon Mastery')*.03;
  if((target?.currentCast||Number(target?.interruptedUntil)>ctx.time)&&(rank=talentRank(u,'Overpower')))m*=1+rank*.06;
  if(hp<.35&&(rank=talentRank(u,'Executioner')))m*=1+rank*.07;
  if(a.id==='mortal-strike'&&talentRank(u,'Mortal Strike'))m*=1.25;
 }
 if(u.class==='Paladin'){
  if(a.id==='consecration'&&(rank=talentRank(u,'Consecration')))m*=1+rank*.22;
 }
 if(u.class==='Hunter'){
  m*=1+talentRank(u,'True Aim')*.03;
  if(ctx.time>=Number(u.movingUntil||0))m*=1+talentRank(u,'Steady Focus')*.025;
  if(hp>.80)m*=1+talentRank(u,'Careful Aim')*.055;
  if(hp<.30)m*=1+talentRank(u,'Killer Instinct')*.065;
  if(a.id==='kill-shot'&&talentRank(u,'Kill Shot'))m*=1.30;
 }
 if(u.class==='Rogue'){
  if(Number(u.damageActions||0)<1)m*=1+talentRank(u,'Ambush')*.08;
  if(a.id==='mutilate'&&talentRank(u,'Mutilate'))m*=1.18;
  if(a.id==='envenom'&&(rank=talentRank(u,'Envenom')))m*=1+rank*.10;
  if(a.id==='eviscerate'&&talentRank(u,'Eviscerate'))m*=hp<.35?1.35:1.20;
 }
 if(u.class==='Mage'){
  m*=1+talentRank(u,'Arcane Focus')*.03;
  if(a.id==='arcane-barrage'&&talentRank(u,'Barrage'))m*=1.28;
 }
 if(u.class==='Warlock'&&u.spec==='Demonology'){
  m*=1+talentRank(u,'Fel Knowledge')*.035;
  if(a.id==='demonbolt'&&u.statuses?.['demonic-core'])m*=1.12;
 }
 if(u.class==='Monk'&&u.spec==='Brewmaster'){
  if(a.id==='keg-smash')m*=1+talentRank(u,'Keg Mastery')*.08;
  if(a.id==='breath-of-fire')m*=1.08;
 }
 if(u.class==='Monk'&&u.spec==='Windwalker'){
  m*=1+talentRank(u,'Ferocity')*.03;
  if(a.id==='windwalker-rising-sun-kick')m*=1+talentRank(u,'Rising Sun Kick')*.07;
  const combo=u.lastMonkAbility!==a.id;
  m*=combo?(1.10+talentRank(u,'Combo Strikes')*.025):.88;
  if((a.id==='spinning-crane-kick'||a.id==='fists-of-fury')&&talentRank(u,'Jade Ignition'))m*=1+talentRank(u,'Jade Ignition')*.05;
 }
 if(u.class==='Death Knight'){
  if(u.spec==='Blood'){
   if(a.id==='heart-strike')m*=1+talentRank(u,'Heartbreaker')*.045;
   if(a.id==='death-strike'&&u.statuses?.['hemostasis'])m*=1+talentRank(u,'Hemostasis')*.06;
  }
  if(u.spec==='Frost'){
   if(a.id==='obliterate')m*=1+talentRank(u,'Obliteration')*.055;
   if(a.id==='howling-blast')m*=1+talentRank(u,'Rime')*.06;
   if((Number(a.cost)||0)===0&&u.resource.value<35)m*=1+talentRank(u,'Frozen Pulse')*.04;
  }
  if(u.spec==='Unholy'){
   const temporary=activePets(ctx,u.id).some(p=>p.type!=='ghoul');
   if(temporary)m*=1+talentRank(u,'Unholy Pact')*.04;
   if(a.id==='death-and-decay-unholy')m*=1+talentRank(u,'Defile')*.06;
   if(a.id==='death-coil'&&u.statuses?.['sudden-doom'])m*=1.18;
  }
 }
 if(u.class==='Demon Hunter'){
  if(u.spec==='Havoc'){
   if(['demons-bite','chaos-strike'].includes(a.id))m*=1+talentRank(u,'Demon Blades')*.03;
   if(Number(u.damageActions||0)===0)m*=1+talentRank(u,'Initiative')*.06;
   if(a.id==='blade-dance')m*=1+talentRank(u,'First Blood')*.075;
   if(a.id==='chaos-strike')m*=1+talentRank(u,'Chaos Theory')*.055;
  }
  if(u.spec==='Vengeance'){
   if(a.id==='shear')m*=1+talentRank(u,'Fracture')*.05;
   if(a.damageType==='magic'||['infernal-strike','sigil-of-flame','spirit-bomb','soul-cleave'].includes(a.id))m*=1+talentRank(u,'Fiery Demise')*.04;
  }
 }
 if(u.class==='Evoker'&&u.spec==='Devastation'){
  if(['living-flame','fire-breath','pyre','dragonrage'].includes(a.id))m*=1+talentRank(u,'Dragonfire')*.035;
  if(['azure-strike','disintegrate','eternity-surge'].includes(a.id))m*=1+talentRank(u,'Azure Mastery')*.035;
  if(a.id==='pyre')m*=1+talentRank(u,'Pyre')*.065;
  if(a.id==='living-flame'&&u.statuses?.['burnout'])m*=1.18;
 }
 const aura=livingPlayers(ctx).find(p=>p.class==='Hunter'&&talentRank(p,'Trueshot Aura')>0);
 if(aura&&['Hunter','Mage'].includes(u.class))m*=1.05;
 return m
}
function talentCritBonus(u){return u.class==='Mage'?talentRank(u,'Nether Precision')*.03:0}
function talentCritMultiplier(u){return u.class==='Mage'?1+talentRank(u,'Spell Impact')*.12:1}
function talentHealingScale(ctx,u,a,target){
 let m=1,rank=0,hp=healthRatio(target);
 if(u.class==='Paladin'&&u.spec==='Holy'){
  if(a.kind==='heal')m*=1+talentRank(u,'Divine Light')*.04;
  if(a.id==='holy-shock'&&talentRank(u,'Holy Shock'))m*=1.25;
  if(hp<.50)m*=1+talentRank(u,'Sacred Hands')*.06;
  if(a.kind==='group-heal')m*=1+talentRank(u,'Divine Hymn')*.10;
  if(a.id==='radiant-wave'&&talentRank(u,'Divine Hymn'))m*=1.25;
 }
 if(u.class==='Priest'){
  if(a.kind==='heal')m*=1+talentRank(u,'Serenity')*.04;
  if(a.kind==='group-heal')m*=1+talentRank(u,'Circle of Healing')*.12;
  if(a.id==='divine-hymn'&&talentRank(u,'Divine Hymn'))m*=1.30;
 }
 if(u.class==='Druid'){
  if(a.id==='rejuvenation')m*=1+talentRank(u,'Rejuvenation')*.08;
  if(a.kind==='group-heal')m*=1+talentRank(u,'Wild Growth')*.08;
  if(a.id==='tranquility'&&talentRank(u,'Tranquility'))m*=1.30;
 }
 if(u.class==='Shaman'&&u.spec==='Restoration'){
  m*=1+talentRank(u,'Tidal Focus')*.03;
  if(a.id==='riptide')m*=1+talentRank(u,'Riptide')*.08;
  if(a.id==='chain-heal')m*=1+talentRank(u,'Chain Mastery')*.025;
 }
 if(u.class==='Monk'&&u.spec==='Mistweaver'){
  m*=1+talentRank(u,'Mist Wrap')*.035;
  if(a.id==='renewing-mist')m*=1+talentRank(u,'Renewing Mist')*.07;
  if(a.id==='revival')m*=1.20;
 }
 if(u.class==='Evoker'&&u.spec==='Preservation'){
  m*=1+talentRank(u,'Temporal Mending')*.035;
  if(a.id==='reversion')m*=1+talentRank(u,'Reversion')*.07;
  if(a.id==='emerald-blossom')m*=1+talentRank(u,'Echoing Bloom')*.045;
  if(a.id==='emerald-communion')m*=1.18;
 }
 return m
}
function talentCooldownScale(u,a){
 let m=1;
 if(u.class==='Hunter')m*=Math.max(.78,1-talentRank(u,'Rapid Fire')*.06);
 if(u.class==='Mage')m*=Math.max(.78,1-talentRank(u,'Arcane Flows')*.06);
 if(u.class==='Paladin'&&a.kind==='interrupt')m*=Math.max(.75,1-talentRank(u,'Hammer of Justice')*.10);
 if(u.class==='Warlock'&&a.kind==='summon')m*=Math.max(.78,1-talentRank(u,'Master Summoner')*.07);
 if(u.class==='Monk'&&u.spec==='Windwalker'&&a.kind==='damage')m*=Math.max(.78,1-talentRank(u,'Serenity')*.055);
 if(u.class==='Death Knight'&&u.spec==='Blood'&&a.kind==='defensive')m*=Math.max(.76,1-talentRank(u,'Red Thirst')*.06);
 if(u.class==='Demon Hunter'&&u.spec==='Vengeance'&&a.kind==='defensive')m*=Math.max(.76,1-talentRank(u,'Feed the Demon')*.07);
 if(u.class==='Evoker'&&u.spec==='Preservation'&&(a.kind==='heal'||a.kind==='group-heal'))m*=Math.max(.78,1-talentRank(u,'Time Lord')*.055);
 return m
}
function talentResourceRegenScale(u){
 if(u.class==='Rogue')return 1+talentRank(u,'Quick Recovery')*.08;
 if(u.class==='Monk'&&u.spec==='Mistweaver')return 1+talentRank(u,'Mana Tea')*.08;
 if(u.class==='Evoker'&&u.spec==='Preservation')return 1+talentRank(u,'Essence Attunement')*.08;
 return 1
}
function talentCost(ctx,u,a,cost){
 let value=cost;
 if(u.class==='Paladin'&&u.spec==='Holy'&&(a.kind==='heal'||a.kind==='group-heal'))value*=Math.max(.70,1-talentRank(u,'Grace')*.06);
 if(u.class==='Shaman'&&u.spec==='Restoration'&&(a.kind==='heal'||a.kind==='group-heal'))value*=Math.max(.76,1-talentRank(u,'Tidal Focus')*.03);
 if(u.class==='Monk'&&u.spec==='Mistweaver'&&(a.kind==='heal'||a.kind==='group-heal')){
  value*=Math.max(.72,1-talentRank(u,'Mana Tea')*.03-talentRank(u,'Lifecycles')*.025);
  if(u.lastMistHealId&&u.lastMistHealId!==a.id)value*=Math.max(.80,1-talentRank(u,'Lifecycles')*.035);
 }
 if(u.class==='Monk'&&u.spec==='Windwalker'&&a.kind==='damage')value*=Math.max(.72,1-talentRank(u,'Serenity')*.05);
 if(u.class==='Evoker'&&u.spec==='Devastation'&&value>0&&u.statuses?.['essence-burst']){
  removeStatus(ctx,u,'essence-burst','consumed');talentTrigger(ctx,u,'Essence Burst',u,{saved:value,ability:a.name});value=0
 }
 if(u.class==='Mage'&&value>0){
  const r=talentRank(u,'Clearcasting');
  if(r&&ctx.rng()<r*.08){talentTrigger(ctx,u,'Clearcasting',u,{saved:Math.round(value)});value=0}
 }
 return Math.max(0,value)
}
function talentCastTime(ctx,u,a,cast){
 if(cast<=0)return cast;
 if(u.class==='Druid'&&(a.kind==='heal'||a.kind==='group-heal')&&talentRank(u,'Natural Swiftness')&&talentReady(ctx,u,'natural-swiftness')){
  talentSetCooldown(ctx,u,'natural-swiftness',30000);talentTrigger(ctx,u,'Natural Swiftness',u,{originalCast:cast});return 0
 }
 if(u.class==='Mage'&&a.kind==='damage'&&talentRank(u,'Presence of Mind')&&talentReady(ctx,u,'presence-of-mind')){
  talentSetCooldown(ctx,u,'presence-of-mind',30000);talentTrigger(ctx,u,'Presence of Mind',u,{originalCast:cast});return 0
 }
 return cast
}
Object.values(ABILITIES).flat().forEach(a=>{if(TALENT_SKILL_REQUIREMENTS[a.id])a.talentReq=TALENT_SKILL_REQUIREMENTS[a.id]});

function classSkillPool(c,role){
 return (ABILITIES[c?.class]||[]).filter(a=>(!a.role||a.role===role)&&(!a.spec||a.spec===c?.spec))
}
function unlockedSkillPool(c,role){
 const level=Math.max(1,Number(c?.level)||1);
 return classSkillPool(c,role).filter(a=>(Number(a.unlockLevel)||1)<=level&&(!a.talentReq||characterTalentRank(c,a.talentReq)>0))
}
function defaultSkillLoadout(c,role){
 const pool=unlockedSkillPool(c,role),picked=[];
 const add=a=>{if(a&&!picked.includes(a)&&picked.length<4)picked.push(a)};
 if(role==='healer'){
  const heals=pool.filter(a=>a.kind==='heal'||a.kind==='group-heal'),battleRez=pool.find(a=>a.kind==='battle-rez');
  if(battleRez){
   add(heals.find(a=>a.kind==='heal'));
   add(heals.find(a=>a.kind==='group-heal')||heals.find(a=>a.kind==='heal'&&!picked.includes(a)));
   add(pool.find(a=>a.kind==='interrupt'));
   add(battleRez);
  }else{
   heals.slice(0,3).forEach(add);
   add(pool.find(a=>a.kind==='interrupt'));
  }
 }else if(role==='tank'){
  pool.filter(a=>a.kind==='damage').slice(0,2).forEach(add);
  add(pool.find(a=>a.kind==='taunt'));
  add(pool.find(a=>a.kind==='interrupt'));
 }else{
  pool.filter(a=>a.kind==='damage').slice(0,3).forEach(add);
  add(pool.find(a=>a.kind==='interrupt'));
 }
 pool.forEach(add);
 return picked.slice(0,4).map(a=>a.id)
}
function abilityPool(c,role){
 const unlocked=unlockedSkillPool(c,role),configured=Array.isArray(c?.skillLoadouts?.[c?.spec])?c.skillLoadouts[c.spec]:null;
 const defaults=()=>defaultSkillLoadout(c,role).map(id=>unlocked.find(a=>a.id===id)).filter(Boolean);
 let pool;
 if(configured?.length){
  const byId=new Map(unlocked.map(a=>[a.id,a]));
  pool=[...new Set(configured)].slice(0,4).map(id=>byId.get(id)).filter(Boolean)
 }else pool=defaults();
 // A stale or empty saved loadout must never make a character inert in combat.
 // Fall back to the current spec defaults whenever the configured skills no longer
 // contain a valid role action (important for classes/specs added to existing saves).
 if(role==='healer'&&!pool.length)pool=defaults();
 if(role==='tank'&&!pool.some(a=>a.kind==='taunt'))pool=defaults();
 if(role==='dps'&&!pool.some(a=>a.kind==='damage'||a.kind==='summon'||a.kind==='pet-command'))pool=defaults();
 if(role==='healer'&&!pool.some(a=>a.kind==='heal'||a.kind==='group-heal'))pool=(ROLE_FALLBACKS.healer||[]);
 if(role!=='healer'&&!pool.some(a=>a.kind==='damage'||a.kind==='summon'||a.kind==='pet-command'))pool.push({id:'basic-attack',name:'Basic Attack',kind:'damage',range:5,damage:10,cost:0,gcd:1500,cd:0,hiddenFallback:true});
 return pool.length?pool:(ROLE_FALLBACKS[role]||ROLE_FALLBACKS.dps)
}
function normalisePlayer(c,i){
 const role=inferredRole(c),res=resourceDef(c),tank=role==='tank',healer=role==='healer';
 const baseHp=tank?185:healer?115:125;
 const power=Math.max(1,Number(c?.power)||1);
 const defence=window.CellboundIdentities?.defenceProfile?.(c)||{physicalTaken:1,magicTaken:1,blockChance:0,blockMultiplier:.72,healthMultiplier:1};
 const level=Math.max(1,Number(c?.level)||1),baseHealth=Math.round(baseHp+(power*1.8)),healthScale=levelHealthScale(level),outputScale=levelOutputScale(level);
 const maxHealth=Math.round(baseHealth*healthScale*Math.max(1,Number(defence.healthMultiplier)||1)),startPct=clamp(c?._combatHealthPct==null?100:Number(c._combatHealthPct),0,100),startHealth=Math.round(maxHealth*startPct/100);
 const carried=c?._combatResource,carriedValue=typeof carried==='number'?carried:Number(carried?.value);
 const resourceValue=Number.isFinite(carriedValue)?clamp(carriedValue,0,res.max):res.start;
 const setState=gearSetState(c),resourceRegen=(healer&&res.name==='Mana'?2.1:res.regen)*setState.resourceRegen;
 const itemLevel=Math.max(0,Number(c?._combatItemLevel??c?.itemLevel??c?.gear)||0),carriedCooldowns=copy(c?._combatCooldowns||{}),carriedPosition=c?._combatPosition;
 const startPosition=carriedPosition&&Number.isFinite(Number(carriedPosition.x))&&Number.isFinite(Number(carriedPosition.y))?{x:Number(carriedPosition.x),y:Number(carriedPosition.y)}:{x:tank?42:role==='healer'?18:28,y:26+i*12};
 return{
  id:'p-'+c.id,characterId:c.id,name:c.name||('Adventurer '+(i+1)),class:c.class||'Unknown',spec:c.spec||'',role,
  maxHealth,health:startHealth,alive:startHealth>0,position:startPosition,facing:0,
  target:null,focus:null,gcdUntil:0,currentCast:null,movingUntil:0,moveToken:0,nextResourceState:0,cooldowns:carriedCooldowns,statuses:carriedStatuses(c),resource:{name:res.name,max:res.max,value:resourceValue,regen:resourceRegen},
  abilities:copy(abilityPool(c,role)),power,level,itemLevel,defence,baseStats:{baseHealth,healthScale,outputScale:outputScale*setState.outputScale},setBonuses:setState,talents:talentRanks(c),talentTree:copy(c?.talents?.[c?.spec]||{}),talentTimers:copy(c?._combatTalentTimers||{}),talentFlags:copy(c?._combatTalentFlags||{}),talentCounters:copy(c?._combatTalentCounters||{}),damageActions:Math.max(0,Number(c?._combatDamageActions)||0),knowledge:copy(c.knowledge||{}),uniqueEffects:equippedUniqueEffects(c),staggerPool:0,nextStaggerTick:0,staggerSourceId:null,lastMonkAbility:null,lastMistHealId:null,recentDamageTaken:[],dkWounds:{},soulFragments:0,
  defensiveUntil:Math.max(0,Number(c?._combatDefensiveMs)||0),frenzyUntil:Math.max(0,Number(c?._combatFrenzyMs)||0),uniqueUsed:copy(c?._combatUniqueUsed||{}),nextDecision:100+(i*200),nextRegen:0,mistakeLocks:{},pendingTaunt:null,revivePenaltyUntil:Number(c?._reviveSicknessMs)||0,original:c
 };
}
function normaliseEnemies(encounter){
 const raw=encounter.enemies||['Enemy'],baseLevel=Math.max(1,Number(encounter.level)||Number(encounter.recommendedLevel)||1);
 const baseHealth=Number(encounter.enemyHealth)||((encounter.kind==='final')?680:(encounter.kind==='boss'?480:(encounter.kind==='event'?220:120)));
 return raw.map((entry,i)=>{
  const data=typeof entry==='object'&&entry?entry:{name:entry},name=data.name||('Enemy '+(i+1));
  const level=Math.max(1,Number(data.level)||Number(encounter.enemyLevels?.[i])||baseLevel);
  const inferred=data.classification||encounter.enemyTypes?.[i]||data.kind||((raw.length===1&&(encounter.kind==='boss'||encounter.kind==='final'))?'boss':(encounter.kind==='event'?'elite':'trash'));
  const classification=String(inferred||'trash').toLowerCase(),rule=enemyClassRule(classification);
  const absoluteHealth=Boolean(data.absoluteHealth),rawMax=Number(data.maxHealth)||Number(data.health)||baseHealth,healthMult=Math.max(.25,Number(encounter.scaling?.enemyHealth)||1),damageMult=Math.max(.25,Number(encounter.scaling?.enemyDamage)||1);
  const maxHealth=absoluteHealth?Math.max(1,Math.round(rawMax)):Math.round(rawMax*levelHealthScale(level)*rule.health*healthMult);
  const currentHealth=data.currentHealth==null?maxHealth:clamp(Math.round(Number(data.currentHealth)||0),0,maxHealth);
  return{
   id:'e-'+i,name,role:'enemy',kind:classification==='boss'||classification==='world-boss'?'boss':'enemy',classification,classificationLabel:rule.label,level,
   maxHealth,health:currentHealth,alive:currentHealth>0,position:(data.currentPosition&&Number.isFinite(Number(data.currentPosition.x))&&Number.isFinite(Number(data.currentPosition.y)))?{x:Number(data.currentPosition.x),y:Number(data.currentPosition.y)}:{x:68,y:raw.length===1?50:30+i*(40/Math.max(1,raw.length-1))},facing:180,
   target:null,threat:{},forcedTarget:null,forcedUntil:0,cooldowns:{},statuses:{},movingUntil:0,moveToken:0,nextAttack:900+i*220,currentCast:null,
   isAdd:false,priority:Number.isFinite(Number(data.priority))?Number(data.priority):(i===0?2:1),focusSelected:Boolean(data.focusSelected),damageScale:rule.damage*damageMult,phaseDamageScale:1,hardEnraged:false,
   visualArchetype:data.visualArchetype||null,targeting:String(data.targeting||'threat').toLowerCase(),attackRange:Math.max(2,Number(data.attackRange)||5),attackName:data.attackName||null,damageType:data.damageType||'physical',allAttacksAoe:Boolean(data.allAttacksAoe),passive:Boolean(data.passive),addGroup:data.addGroup||null
  }
 })
}
function makeStats(players){
 return{
  startedAt:0,endedAt:0,
  players:Object.fromEntries(players.map(p=>[p.id,{id:p.id,name:p.name,class:p.class,role:p.role,level:p.level,itemLevel:p.itemLevel,damage:0,healing:0,overhealing:0,damageTaken:0,avoidableDamage:0,deaths:0,mistakes:0,mistakesByType:{},battleResurrections:0,interruptAttempts:0,interrupts:0,duplicateInterrupts:0,threatLost:0,resourcesSpent:0,resourcesGained:0,abilityDamage:{},abilityHealing:{}}])),
  interrupts:{attempts:0,success:0,missedCritical:0,duplicates:0},mechanics:{avoided:0,failed:0,byType:{}},mistakes:{total:0,byType:{}},battleResurrections:0,deaths:0
 };
}
function audioCue(type,result){
 if(type==='ABILITY_START')return'ability-cast';if(type==='DAMAGE_DEALT')return result==='critical'?'critical-hit':'impact';if(type==='HEAL_RECEIVED'||type==='PLAYER_REVIVED')return'heal';if(type==='INTERRUPT')return'interrupt';if(type==='CAST_START')return'boss-warning';if(type==='PLAYER_DEFEATED')return'death';if(type==='PLAYER_MISTAKE')return'boss-warning';if(type==='COMBAT_END')return result==='victory'?'victory':'defeat';return null
}
function emit(ctx,type,data={}){
 const payload=data.payload?copy(data.payload):{},cue=audioCue(type,data.result);if(cue&&!payload.audioCue)payload.audioCue=cue;
 const e={
  timestamp:Math.round(ctx.time),type,
  source:data.source||null,target:data.target||null,ability:data.ability||null,
  amount:data.amount==null?null:Math.round(data.amount*100)/100,
  position:data.position?copy(data.position):null,result:data.result||null,
  statusEffects:data.statusEffects?copy(data.statusEffects):null,
  payload
 };
 ctx.events.push(e);
 if(ctx.onEvent)ctx.onEvent(e);
 return e;
}
function schedule(ctx,at,fn,label){
 ctx.queue.push({at:Math.max(ctx.time,at),fn,label:label||''});
}
function processQueue(ctx){
 if(!ctx.queue.length)return;
 ctx.queue.sort((a,b)=>a.at-b.at);
 while(ctx.queue.length&&ctx.queue[0].at<=ctx.time){
  const item=ctx.queue.shift();
  item.fn();
 }
}
function removeStatus(ctx,target,id,reason='expired'){
 const current=target?.statuses?.[id];if(!current)return;
 delete target.statuses[id];
 emit(ctx,current.kind==='debuff'?'DEBUFF_REMOVED':'BUFF_REMOVED',{source:current.source||null,target:target.id,ability:current.name,result:reason,statusEffects:[copy(current)]})
}
function applyStatus(ctx,source,target,status={}){
 if(!target?.alive)return null;
 const id=status.id||String(status.name||'status').toLowerCase().replace(/[^a-z0-9]+/g,'-'),duration=Math.max(0,Number(status.duration)||0);
 const current=target.statuses[id],st={id,name:status.name||id,kind:status.kind==='debuff'?'debuff':'buff',source:source?.id||status.source||null,stacks:clamp((current?.stacks||0)+(Number(status.stacks)||1),1,99),duration,expiresAt:ctx.time+duration,effect:copy(status.effect||{}),cc:status.cc||null,breakOnDamage:!!status.breakOnDamage,persistAcrossEncounters:!!status.persistAcrossEncounters};
 target.statuses[id]=st;
 emit(ctx,st.kind==='debuff'?'DEBUFF_APPLIED':'BUFF_APPLIED',{source:st.source,target:target.id,ability:st.name,result:'applied',statusEffects:[copy(st)]});
 if(duration>0)schedule(ctx,ctx.time+duration,()=>removeStatus(ctx,target,id,'expired'),'status-expire');
 return st
}
function livingPlayers(ctx){return ctx.players.filter(x=>x.alive)}
function livingEnemies(ctx){return ctx.enemies.filter(x=>x.alive)}
function getUnit(ctx,id){return ctx.units[id]||null}
function inRange(a,b,r){return dist(a.position,b.position)<=r}
function updateFacing(a,b){if(!a||!b)return;a.facing=Math.atan2(b.position.y-a.position.y,b.position.x-a.position.x)}

function environmentBlockers(ctx){return Array.isArray(ctx?.environment?.blockers)?ctx.environment.blockers:[]}
function arenaBounds(ctx){
 const raw=ctx?.environment?.bounds||{},left=Number.isFinite(Number(raw.left))?Number(raw.left):4,right=Number.isFinite(Number(raw.right))?Number(raw.right):96,top=Number.isFinite(Number(raw.top))?Number(raw.top):5,bottom=Number.isFinite(Number(raw.bottom))?Number(raw.bottom):95;
 return{left:clamp(Math.min(left,right-4),0,98),right:clamp(Math.max(right,left+4),2,100),top:clamp(Math.min(top,bottom-4),0,98),bottom:clamp(Math.max(bottom,top+4),2,100)}
}
function pointInsideArena(ctx,p,pad=0){
 if(!p)return false;
 const b=arenaBounds(ctx);
 if(!(p.x>=b.left+pad&&p.x<=b.right-pad&&p.y>=b.top+pad&&p.y<=b.bottom-pad))return false;
 const arena=ctx?.environment?.arena;
 if(arena?.shape==='ellipse'){
  const cx=Number(arena.cx)||50,cy=Number(arena.cy)||50,rx=Math.max(3,(Number(arena.rx)||((b.right-b.left)/2))-pad),ry=Math.max(3,(Number(arena.ry)||((b.bottom-b.top)/2))-pad);
  const dx=(p.x-cx)/rx,dy=(p.y-cy)/ry;
  return dx*dx+dy*dy<=1.0001
 }
 return true
}
function constrainToArena(ctx,pos,pad=1.35){
 const b=arenaBounds(ctx),minX=b.left+pad,maxX=b.right-pad,minY=b.top+pad,maxY=b.bottom-pad;
 let p={x:minX<=maxX?clamp(Number(pos?.x)||50,minX,maxX):(b.left+b.right)/2,y:minY<=maxY?clamp(Number(pos?.y)||50,minY,maxY):(b.top+b.bottom)/2};
 const arena=ctx?.environment?.arena;
 if(arena?.shape==='ellipse'){
  const cx=Number(arena.cx)||50,cy=Number(arena.cy)||50,rx=Math.max(3,(Number(arena.rx)||((b.right-b.left)/2))-pad),ry=Math.max(3,(Number(arena.ry)||((b.bottom-b.top)/2))-pad);
  const dx=p.x-cx,dy=p.y-cy,norm=Math.sqrt((dx*dx)/(rx*rx)+(dy*dy)/(ry*ry));
  if(norm>1){const scale=.985/norm;p={x:cx+dx*scale,y:cy+dy*scale}}
 }
 return p
}
function enforceArenaBounds(ctx,reason='arena boundary'){
 [...ctx.players,...ctx.enemies].filter(u=>u?.alive).forEach(u=>{
  const safe=constrainToArena(ctx,u.position,1.7);
  if(dist(u.position,safe)>.35)moveTo(ctx,u,safe,320,reason)
 })
}
function blockerBounds(b,pad=0){
 const w=Math.max(0,Number(b?.w)||0)/2+pad,h=Math.max(0,Number(b?.h)||0)/2+pad,x=Number(b?.x)||0,y=Number(b?.y)||0;
 return{left:x-w,right:x+w,top:y-h,bottom:y+h}
}
function pointInRect(p,r){return !!p&&p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom}
function segmentsCross(a,b,c,d){
 const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
 const on=(p,q,r)=>Math.min(p.x,r.x)-.0001<=q.x&&q.x<=Math.max(p.x,r.x)+.0001&&Math.min(p.y,r.y)-.0001<=q.y&&q.y<=Math.max(p.y,r.y)+.0001;
 const o1=cross(a,b,c),o2=cross(a,b,d),o3=cross(c,d,a),o4=cross(c,d,b);
 if(((o1>0&&o2<0)||(o1<0&&o2>0))&&((o3>0&&o4<0)||(o3<0&&o4>0)))return true;
 if(Math.abs(o1)<.0001&&on(a,c,b))return true;if(Math.abs(o2)<.0001&&on(a,d,b))return true;
 if(Math.abs(o3)<.0001&&on(c,a,d))return true;if(Math.abs(o4)<.0001&&on(c,b,d))return true;
 return false
}
function lineHitsRect(a,b,r){
 if(pointInRect(a,r)||pointInRect(b,r))return true;
 const tl={x:r.left,y:r.top},tr={x:r.right,y:r.top},br={x:r.right,y:r.bottom},bl={x:r.left,y:r.bottom};
 return segmentsCross(a,b,tl,tr)||segmentsCross(a,b,tr,br)||segmentsCross(a,b,br,bl)||segmentsCross(a,b,bl,tl)
}
function segmentBlocker(ctx,a,b,kind='movement',pad=0){
 return environmentBlockers(ctx).find(blocker=>{
   if(kind==='los'&&blocker.blocksLos===false)return false;
   if(kind==='movement'&&blocker.blocksMovement===false)return false;
   return lineHitsRect(a,b,blockerBounds(blocker,pad))
 })||null
}
function hasLineOfSight(ctx,a,b){
 const ap=a?.position||a,bp=b?.position||b;if(!ap||!bp)return false;
 if(!pointInsideArena(ctx,ap,0)||!pointInsideArena(ctx,bp,0))return false;
 return !segmentBlocker(ctx,ap,bp,'los',0)
}
function openPosition(ctx,pos,pad=1.35){
 let p=constrainToArena(ctx,pos,pad);
 for(const blocker of environmentBlockers(ctx)){
   if(blocker.blocksMovement===false)continue;
   const r=blockerBounds(blocker,pad);if(!pointInRect(p,r))continue;
   const options=[
    {x:r.left-.2,y:p.y},{x:r.right+.2,y:p.y},{x:p.x,y:r.top-.2},{x:p.x,y:r.bottom+.2}
   ].map(q=>constrainToArena(ctx,q,pad))
    .filter(q=>!environmentBlockers(ctx).some(b=>b.blocksMovement!==false&&pointInRect(q,blockerBounds(b,pad*.7))));
   if(options.length)p=options.sort((a,b)=>dist(a,pos)-dist(b,pos))[0]
 }
 return constrainToArena(ctx,p,pad)
}
function navigationWaypoint(ctx,from,destination){
 const dest=openPosition(ctx,destination,1.35),hit=segmentBlocker(ctx,from,dest,'movement',1.25);
 if(!hit)return{point:dest,pathing:false,final:dest};
 const r=blockerBounds(hit,2.2),corners=[
  {x:r.left,y:r.top},{x:r.left,y:r.bottom},{x:r.right,y:r.top},{x:r.right,y:r.bottom}
 ].map(p=>constrainToArena(ctx,p,1.35))
  .filter(p=>pointInsideArena(ctx,p,1))
  .filter(p=>!environmentBlockers(ctx).some(b=>b.blocksMovement!==false&&pointInRect(p,blockerBounds(b,.7))))
  .filter(p=>!segmentBlocker(ctx,from,p,'movement',.65));
 if(!corners.length)return{point:dest,pathing:false,final:dest};
 const point=corners.sort((a,b)=>{
   const ap=dist(from,a)+dist(a,dest)+(segmentBlocker(ctx,a,dest,'movement',.65)?18:0);
   const bp=dist(from,b)+dist(b,dest)+(segmentBlocker(ctx,b,dest,'movement',.65)?18:0);
   return ap-bp
 })[0];
 return{point,pathing:true,final:dest,blocker:hit.id||'environment'}
}
function visibleCastPoint(ctx,u,target,range,preferred){
 const maxRange=Math.max(2,Number(range)||5),pref=openPosition(ctx,preferred||u.position,1.35);
 const valid=p=>dist(p,target.position)<=maxRange&&!segmentBlocker(ctx,p,target.position,'los',0)&&!environmentBlockers(ctx).some(b=>b.blocksMovement!==false&&pointInRect(p,blockerBounds(b,1.1)));
 if(valid(pref))return pref;
 const base=Math.atan2(u.position.y-target.position.y,u.position.x-target.position.x),radius=maxRange<=7?Math.min(4.35,maxRange-.35):Math.min(20,Math.max(8,maxRange*.68));
 const offsets=[0,.38,-.38,.76,-.76,1.15,-1.15,1.55,-1.55,2.1,-2.1,Math.PI];
 const candidates=offsets.map(off=>openPosition(ctx,{x:target.position.x+Math.cos(base+off)*radius,y:target.position.y+Math.sin(base+off)*radius},1.35)).filter(valid);
 return candidates.sort((a,b)=>dist(u.position,a)-dist(u.position,b))[0]||pref
}

function moveTo(ctx,u,pos,duration=420,reason='positioning'){
 if(!u?.alive)return false;
 const from=copy(u.position),route=navigationWaypoint(ctx,from,pos),to=route.point,travel=Math.max(80,Number(duration)||420);
 if(dist(from,to)<.5)return true;
 if(u.currentCast){
  emit(ctx,'CAST_CANCELLED',{source:u.id,target:u.currentCast.target,ability:u.currentCast.ability,result:'movement',position:from});
  u.currentCast=null;
 }
 const token=++u.moveToken;u.movingUntil=ctx.time+travel;
 emit(ctx,'MOVEMENT_START',{source:u.id,target:u.target,position:from,result:reason,payload:{to,duration:travel,navigation:route.pathing?'waypoint':'direct',finalTo:route.final,blocker:route.blocker||null}});
 schedule(ctx,ctx.time+travel,()=>{
  if(!u.alive||u.moveToken!==token)return;
  u.position=to;u.movingUntil=0;
  emit(ctx,'MOVEMENT_END',{source:u.id,target:u.target,position:copy(to),result:reason,payload:{from,duration:travel,navigation:route.pathing?'waypoint':'direct',finalTo:route.final,blocker:route.blocker||null}})
 },'movement-end');
 return false
}
function nearestMeleePoint(enemy,u,ctx){
 const pack=ctx?ctx.enemies.filter(e=>e.alive&&e.target===enemy.id&&e.attackRange<=7):[];
 const slot=pack.findIndex(e=>e.id===u.id);
 const angle=pack.length>1&&slot>=0?-Math.PI/2+slot*Math.PI*2/pack.length:Math.atan2(u.position.y-enemy.position.y,u.position.x-enemy.position.x);
 return{x:enemy.position.x+Math.cos(angle)*4,y:enemy.position.y+Math.sin(angle)*4}
}
function stableUnitIndex(ctx,u,list){
 const idx=list.findIndex(x=>x.id===u.id);return idx<0?0:idx
}
function isMeleeCombatant(u){
 return (u?.abilities||[]).some(a=>a.kind==='damage'&&(Number(a.range)||5)<=7)
}
function meleeFormationPoint(ctx,u,target){
 const radius=u.role==='tank'?4.15:4.4;
 if(u.role==='tank'){
   // Tank owns the front of the enemy. With enemies entering from the right side of the arena,
   // this places the tank on the party-facing side and keeps the boss facing away from melee DPS.
   const tanks=ctx.players.filter(p=>p.alive&&p.role==='tank'),slot=stableUnitIndex(ctx,u,tanks),angle=Math.PI+(slot-(tanks.length-1)/2)*.75;
   return{x:target.position.x+Math.cos(angle)*radius,y:target.position.y+Math.sin(angle)*radius}
 }
 const melee=ctx.players.filter(p=>p.alive&&p.role!=='tank'&&isMeleeCombatant(p));
 const slot=stableUnitIndex(ctx,u,melee);
 // Rear arc slots: centre-rear first, then alternate upper/lower flanks.
 const angles=[0,-1.38,1.38,-0.82,0.82,-1.12,1.12];
 const angle=angles[slot%angles.length];
 const ring=radius+(Math.floor(slot/angles.length)*1.15);
 return{x:target.position.x+Math.cos(angle)*ring,y:target.position.y+Math.sin(angle)*ring}
}
function rangedFormationPoint(ctx,u,target,range){
 const ranged=ctx.players.filter(p=>p.alive&&!isMeleeCombatant(p)&&p.role!=='tank');
 const slot=stableUnitIndex(ctx,u,ranged);
 const angle=ranged.length<=1?Math.PI:2.12+slot*2.04/(ranged.length-1),desired=Math.max(10,Math.min((Number(range)||25)*.72,22));
 return{x:target.position.x+Math.cos(angle)*desired,y:target.position.y+Math.sin(angle)*desired}
}
function moveIntoRange(ctx,u,target,range){
 const r=Math.max(2,Number(range)||5),los=hasLineOfSight(ctx,u,target);
 if(r<=7){
   const formation=meleeFormationPoint(ctx,u,target),desired=visibleCastPoint(ctx,u,target,r,formation),slotDistance=dist(u.position,desired),combatRange=inRange(u,target,r);
   const tolerance=u.role==='tank'?1.75:2.25;
   if(combatRange&&los&&slotDistance<=tolerance)return true;
   if(combatRange&&los&&target.movingUntil>ctx.time&&slotDistance<=3.25)return true;
   moveTo(ctx,u,desired,520,!los?'line of sight':u.role==='tank'?'tank positioning':'melee formation');
   return false
 }
 const formation=rangedFormationPoint(ctx,u,target,r),desired=visibleCastPoint(ctx,u,target,r,formation);
 if(inRange(u,target,r)&&los&&dist(u.position,desired)<=3.5)return true;
 if(inRange(u,target,r)&&los&&target.movingUntil>ctx.time)return true;
 moveTo(ctx,u,desired,520,!los?'line of sight':'move into range');
 return false
}
function cooldownReady(u,a){return (u.cooldowns[a.id]||0)<=0}
function spendResource(ctx,u,a){
 const baseCost=Math.max(0,Number(a.cost)||0),cost=talentCost(ctx,u,a,baseCost);
 if(cost>u.resource.value+.0001)return false;
 if(cost){
  u.resource.value=clamp(u.resource.value-cost,0,u.resource.max);
  ctx.stats.players[u.id].resourcesSpent+=cost;
  emit(ctx,'RESOURCE_SPENT',{source:u.id,ability:a.name,amount:cost,result:u.resource.name,payload:{resource:u.resource.name,value:u.resource.value,max:u.resource.max,baseCost}});
 }
 return true;
}
function gainResource(ctx,u,a){
 let gain=Math.max(0,Number(a.gain)||0);
 if(u.class==='Death Knight'&&u.spec==='Blood'&&a.id==='heart-strike')gain+=talentRank(u,'Heartbreaker')*2;
 if(u.class==='Death Knight'&&u.spec==='Frost'&&a.id==='howling-blast')gain+=talentRank(u,'Rime')*2;
 if(!gain)return;
 const before=u.resource.value;u.resource.value=clamp(before+gain,0,u.resource.max);
 const actual=u.resource.value-before;
 if(actual>0){
  ctx.stats.players[u.id].resourcesGained+=actual;
  emit(ctx,'RESOURCE_GAINED',{source:u.id,ability:a.name,amount:actual,result:u.resource.name,payload:{resource:u.resource.name,value:u.resource.value,max:u.resource.max}});
 }
}
function emitResourceState(ctx,u,result='state'){
 emit(ctx,'RESOURCE_STATE',{source:u.id,target:u.id,result,payload:{resource:u.resource.name,value:u.resource.value,max:u.resource.max}})
}
function passiveResources(ctx){
 ctx.players.forEach(u=>{
  if(!u.alive)return;
  const perTick=(u.resource.regen||0)*talentResourceRegenScale(u)*Math.max(.1,1+statusBonus(u,'resourceRegen'))*(TICK/1000);
  if(perTick<=0||u.resource.value>=u.resource.max)return;
  const before=u.resource.value;
  u.resource.value=clamp(before+perTick,0,u.resource.max);
  if(ctx.time>=u.nextResourceState||u.resource.value>=u.resource.max){
   u.nextResourceState=ctx.time+1200;
   emitResourceState(ctx,u,'regeneration')
  }
 });
}

function deadPlayers(ctx){return ctx.players.filter(p=>!p.alive)}
function encounterKnowledge(ctx,u){
 const key=ctx.encounter.knowledgeKey;
 if(key&&u.knowledge&&u.knowledge[key]!=null)return clamp(Number(u.knowledge[key])||0,0,100);
 const vals=Object.values(u.knowledge||{}).map(Number).filter(Number.isFinite);
 return vals.length?clamp(vals.reduce((a,b)=>a+b,0)/vals.length,0,100):0
}
function combatPressure(ctx){
 const live=livingPlayers(ctx),dead=ctx.players.length-live.length;
 const missing=live.length?live.reduce((n,p)=>n+(1-healthRatio(p)),0)/live.length:1;
 const loose=livingEnemies(ctx).filter(e=>{const t=topThreatTarget(ctx,e);return t&&t.role!=='tank'}).length;
 const adds=livingEnemies(ctx).filter(e=>e.isAdd).length;
 const healer=live.find(p=>p.role==='healer');
 const manaPressure=healer&&healer.resource?.name==='Mana'?clamp((35-healer.resource.value)/35,0,1):0;
 return clamp(missing*.38+(dead/Math.max(1,ctx.players.length))*.52+Math.min(.22,loose*.11)+Math.min(.16,adds*.06)+(ctx.activeEnemyCast?.type?0.08:0)+manaPressure*.14,0,1)
}
function executionQuality(ctx,u){
 const levelDelta=(Number(u.level)||1)-(Number(ctx.encounter.level)||1);
 const levelReadiness=clamp(.82+levelDelta*.08,.42,1.06);
 const recIlvl=Math.max(0,Number(ctx.encounter.recommendedItemLevel)||0);
 const gearReadiness=recIlvl>0?clamp((Number(u.itemLevel)||0)/recIlvl,.45,1.08):1;
 const equipped=Array.isArray(u.abilities)?u.abilities.filter(a=>!a.hiddenFallback):[];
 const filled=Math.min(1,equipped.length/4);
 const hasRoleTool=u.role==='tank'?equipped.some(a=>a.kind==='taunt'):u.role==='healer'?equipped.some(a=>a.kind==='heal'||a.kind==='group-heal'):equipped.some(a=>a.kind==='damage'||a.kind==='summon'||a.kind==='pet-command');
 const hasInterrupt=equipped.some(a=>a.kind==='interrupt');
 const skillReadiness=clamp(.55+filled*.25+(hasRoleTool?.12:0)+(hasInterrupt?.08:0),.45,1);
 const pressure=combatPressure(ctx);
 return clamp(.50+levelReadiness*.20+Math.min(1,gearReadiness)*.20+skillReadiness*.10-pressure*.20,.18,.985)
}
function mistakeChance(ctx,u,type='general'){
 const q=executionQuality(ctx,u),pressure=combatPressure(ctx);
 const weights={movement:1.05,interrupt:1.0,threat:.82,triage:.72,tank:.68,defensive:.66};
 return clamp((.018+Math.pow(1-q,2)*.5+pressure*.10)*(weights[type]||1),.01,.48)
}
function executionReaction(ctx,u,type='movement'){
 const q=executionQuality(ctx,u),pressure=combatPressure(ctx);
 const roleBias=u.role==='tank'&&type==='movement'?-90:u.class==='Demon Hunter'?-80:0;
 return Math.max(220,Math.round(260+(1-q)*760+pressure*280+ctx.rng()*180+roleBias))
}
function recordMistake(ctx,u,type,detail,payload={}){
 if(!u)return null;
 const st=ctx.stats.players[u.id];if(st){st.mistakes++;st.mistakesByType[type]=(st.mistakesByType[type]||0)+1}
 ctx.stats.mistakes.total++;ctx.stats.mistakes.byType[type]=(ctx.stats.mistakes.byType[type]||0)+1;
 const token='err-'+(++ctx.mistakeSeq);u.lastMistakeToken=token;u.lastMistakeUntil=ctx.time+3500;
 emit(ctx,'PLAYER_MISTAKE',{source:u.id,target:payload.target||null,ability:payload.ability||null,result:type,payload:{token,type,detail,quality:Math.round(executionQuality(ctx,u)*100),pressure:Math.round(combatPressure(ctx)*100),...payload}});
 return token
}
function recentMistakeToken(ctx,u){
 return u&&u.lastMistakeUntil>ctx.time?u.lastMistakeToken:null
}
function shouldMistake(ctx,u,type,lockMs=0){
 if(!u?.alive)return false;
 if(lockMs&&Number(u.mistakeLocks?.[type]||0)>ctx.time)return false;
 const yes=ctx.rng()<mistakeChance(ctx,u,type);
 if(yes&&lockMs){u.mistakeLocks=u.mistakeLocks||{};u.mistakeLocks[type]=ctx.time+lockMs}
 return yes
}

function threatMultiplier(u,a){
 let base=u.role==='tank'?(Number(a.threat)||2.5):1;
 if(u.class==='Paladin'&&u.spec==='Protection')base*=1+talentRank(u,'Guardian Oath')*.12+(a.id==='consecration'?talentRank(u,'Consecration')*.15:0);
 if(u.class==='Warrior'&&u.spec==='Protection')base*=1+talentRank(u,'Taunt Mastery')*.05;
 if(u.class==='Monk'&&u.spec==='Brewmaster')base*=1+(a.id==='keg-smash'?talentRank(u,'Keg Mastery')*.12:0);
 if(u.class==='Death Knight'&&u.spec==='Blood')base*=1+(a.id==='heart-strike'?talentRank(u,'Heartbreaker')*.10:0);
 return base*Math.max(.1,1+statusBonus(u,'threatBonus'))
}

function topThreatTarget(ctx,e){
 const live=livingPlayers(ctx);
 if(!live.length)return null;
 if(e.forcedTarget&&e.forcedUntil>ctx.time){
  const forced=getUnit(ctx,e.forcedTarget);if(forced?.alive)return forced;
 }
 let best=live[0],score=-Infinity;
 live.forEach(p=>{const v=Number(e.threat[p.id])||0;if(v>score){score=v;best=p}});
 return best;
}
function setAggro(ctx,e,target,reason='threat'){
 const prev=e.target;
 e.target=target?.id||null;
 if(prev!==e.target&&target){
  if(prev&&target.role!=='tank')ctx.stats.players[target.id].threatLost++;
  emit(ctx,'AGGRO_CHANGED',{source:e.id,target:target.id,result:reason,payload:{previous:prev,threat:copy(e.threat)}});
 }
}
function addThreat(ctx,e,u,amount,reason='damage'){
 if(!e?.alive||!u?.alive)return;
 e.threat[u.id]=(Number(e.threat[u.id])||0)+Math.max(0,amount);
 emit(ctx,'THREAT_GENERATED',{source:u.id,target:e.id,amount,result:reason,payload:{total:e.threat[u.id]}});
 setAggro(ctx,e,topThreatTarget(ctx,e),reason);
}
function executeTaunt(ctx,u,e,a){
 const top=Math.max(0,...Object.values(e.threat).map(Number)),rank=talentRank(u,'Taunt Mastery');
 e.threat[u.id]=Math.max(Number(e.threat[u.id])||0,top+120*(1+rank*.30));
 e.forcedTarget=u.id;e.forcedUntil=ctx.time+3000+rank*750;
 u.cooldowns[a.id]=Math.round((Number(a.cd)||8000)*talentCooldownScale(u,a));
 emit(ctx,'ABILITY_START',{source:u.id,target:e.id,ability:a.name,result:'taunt',position:copy(u.position)});
 addThreat(ctx,e,u,80*(1+rank*.25),'taunt');
 if(rank)talentTrigger(ctx,u,'Taunt Mastery',e,{forcedDuration:3000+rank*750});
 setAggro(ctx,e,u,'taunt');
 emit(ctx,'ABILITY_FINISH',{source:u.id,target:e.id,ability:a.name,result:'taunt'});
}

function talentAfterDamage(ctx,u,a,target,dealt,crit){
 if(!u?.alive||!target||dealt<=0)return;
 u.damageActions=(Number(u.damageActions)||0)+1;
 let r=0;
 if(u.class==='Warrior'&&u.spec==='Arms'){
  if((r=talentRank(u,'Battle Rhythm'))){
   applyStatus(ctx,u,u,{id:'battle-rhythm',name:'Battle Rhythm',kind:'buff',duration:4200,effect:{outgoingDamage:.018*r,haste:.018*r}});
  }
  if(crit&&(r=talentRank(u,'Deep Wounds'))&&target.alive){
   const tick=Math.max(1,Math.round(dealt*(.045*r)));
   applyStatus(ctx,u,target,{id:'deep-wounds',name:'Deep Wounds',kind:'debuff',duration:2800,effect:{damageOverTime:tick}});
   talentTrigger(ctx,u,'Deep Wounds',target,{ticks:2,damagePerTick:tick});
   [1300,2600].forEach(t=>schedule(ctx,ctx.time+t,()=>{if(u.alive&&target.alive)dealDamage(ctx,u,target,tick,'Deep Wounds',{damageType:'physical'})},'talent-deep-wounds'));
   if((r=talentRank(u,'Blood Frenzy')))applyStatus(ctx,u,u,{id:'blood-frenzy-talent',name:'Blood Frenzy',kind:'buff',duration:5200,effect:{haste:.05*r}});
  }
  if((r=talentRank(u,'Sweeping Blows'))&&target.alive){
   const extra=livingEnemies(ctx).filter(e=>e.id!==target.id).sort((x,y)=>dist(target.position,x.position)-dist(target.position,y.position))[0];
   if(extra&&dist(target.position,extra.position)<=12){
    const splash=Math.max(1,Math.round(dealt*(.18+.12*r)));
    talentTrigger(ctx,u,'Sweeping Blows',extra,{damage:splash});
    dealDamage(ctx,u,extra,splash,'Sweeping Blows',{damageType:'physical'})
   }
  }
 }
 if(u.class==='Hunter'){
  if(crit&&(r=talentRank(u,'Piercing Shots'))&&target.alive){
   const tick=Math.max(1,Math.round(dealt*.04*r));
   applyStatus(ctx,u,target,{id:'piercing-shots',name:'Piercing Shots',kind:'debuff',duration:2600,effect:{damageOverTime:tick}});
   talentTrigger(ctx,u,'Piercing Shots',target,{ticks:2,damagePerTick:tick});
   [1200,2400].forEach(t=>schedule(ctx,ctx.time+t,()=>{if(u.alive&&target.alive)dealDamage(ctx,u,target,tick,'Piercing Shots',{damageType:'physical'})},'talent-piercing-shots'))
  }
  if((r=talentRank(u,'Concussive Shot'))&&target.alive&&!['boss','world-boss'].includes(target.classification)&&ctx.rng()<.18*r){
   applyStatus(ctx,u,target,{id:'concussive-shot',name:'Concussive Shot',kind:'debuff',duration:900,cc:'stun'});
   talentTrigger(ctx,u,'Concussive Shot',target,{duration:900})
  }
 }
 if(u.class==='Rogue'){
  const venom=talentRank(u,'Venom'),master=talentRank(u,'Master Poisoner');
  if((venom||master)&&target.alive){
   const tick=Math.max(1,Math.round(dealt*(venom*.018+master*.025)));
   if(tick>0){
    applyStatus(ctx,u,target,{id:'venom',name:'Venom',kind:'debuff',duration:1300,effect:{damageOverTime:tick}});
    schedule(ctx,ctx.time+1100,()=>{if(u.alive&&target.alive)dealDamage(ctx,u,target,tick,'Venom',{damageType:'magic'})},'talent-venom')
   }
  }
  if(a.id==='garrote'&&(r=talentRank(u,'Garrote'))&&target.alive){
   const tick=Math.max(1,Math.round(dealt*.06*r));
   applyStatus(ctx,u,target,{id:'garrote-bleed',name:'Garrote Bleed',kind:'debuff',duration:2600,effect:{damageOverTime:tick}});
   talentTrigger(ctx,u,'Garrote',target,{ticks:2,damagePerTick:tick});
   [1200,2400].forEach(t=>schedule(ctx,ctx.time+t,()=>{if(u.alive&&target.alive)dealDamage(ctx,u,target,tick,'Garrote Bleed',{damageType:'physical'})},'talent-garrote'))
  }
  if(a.id==='envenom'&&(r=talentRank(u,'Cut to the Chase'))){
   applyStatus(ctx,u,u,{id:'cut-to-the-chase',name:'Cut to the Chase',kind:'buff',duration:6000,effect:{haste:.04*r,outgoingDamage:.025*r}});
   talentTrigger(ctx,u,'Cut to the Chase',u,{duration:6000})
  }
 }
 if(u.class==='Mage'){
  const surge=talentRank(u,'Surge');
  if(surge&&u.damageActions%4===0){
   applyStatus(ctx,u,u,{id:'arcane-surge-talent',name:'Surge',kind:'buff',duration:6000,effect:{outgoingDamage:.05*surge}});
   talentTrigger(ctx,u,'Surge',u,{duration:6000})
  }
  if(a.id==='arcane-barrage'&&talentRank(u,'Barrage')&&target.alive){
   const extra=livingEnemies(ctx).filter(e=>e.id!==target.id).slice(0,2);
   extra.forEach(e=>dealDamage(ctx,u,e,Math.max(1,Math.round(dealt*.22)),'Arcane Barrage Splash',{damageType:'magic'}));
   if(extra.length)talentTrigger(ctx,u,'Barrage',extra[0],{targets:extra.length})
  }
 }
 if(u.class==='Monk'&&u.spec==='Windwalker'){
  const combo=u.lastMonkAbility!==a.id;
  if(combo&&(r=talentRank(u,'Momentum'))){
   applyStatus(ctx,u,u,{id:'monk-momentum',name:'Momentum',kind:'buff',duration:4200,effect:{haste:.04*r}});
   talentTrigger(ctx,u,'Momentum',u,{duration:4200,ability:a.name})
  }
  if((r=talentRank(u,'Jade Ignition'))&&(a.id==='spinning-crane-kick'||a.id==='fists-of-fury')&&target.alive){
   const extras=livingEnemies(ctx).filter(e=>e.id!==target.id).slice(0,2),splash=Math.max(1,Math.round(dealt*.08*r));
   extras.forEach(e=>dealDamage(ctx,u,e,splash,'Jade Ignition',{damageType:'physical'}));
   if(extras.length)talentTrigger(ctx,u,'Jade Ignition',extras[0],{targets:extras.length,damage:splash})
  }
  u.lastMonkAbility=a.id
 }
 if(u.class==='Monk'&&u.spec==='Mistweaver'){
  const ancient=talentRank(u,'Ancient Teachings'),rising=talentRank(u,'Rising Mist'),ratio=.18+ancient*.12+rising*.06;
  const ally=[...livingPlayers(ctx)].sort((x,y)=>healthRatio(x)-healthRatio(y))[0];
  if(ally&&healthRatio(ally)<.995){
   const heal=Math.max(1,Math.round(dealt*ratio));doHeal(ctx,u,ally,heal,ancient?'Ancient Teachings':'Fistweaving');
   if(ancient)talentTrigger(ctx,u,'Ancient Teachings',ally,{healing:heal,sourceAbility:a.name})
  }
 }
 if(u.class==='Death Knight'){
  if(u.spec==='Blood'){
   if(a.id==='marrowrend'){
    const ossuary=talentRank(u,'Ossuary'),duration=8000+ossuary*1000,reduction=.05+ossuary*.015;
    applyStatus(ctx,u,u,{id:'bone-shield',name:'Bone Shield',kind:'buff',duration,effect:{incomingDamageReduction:reduction}});
    if(ossuary)talentTrigger(ctx,u,'Ossuary',u,{duration,reduction})
   }
   if(a.id==='blood-boil'&&(r=talentRank(u,'Hemostasis'))){
    applyStatus(ctx,u,u,{id:'hemostasis',name:'Hemostasis',kind:'buff',duration:9000,effect:{}});
    talentTrigger(ctx,u,'Hemostasis',u,{rank:r})
   }
   if(a.id==='death-strike'){
    const recent=(u.recentDamageTaken||[]).filter(x=>Number(x.at)>=ctx.time-5000).reduce((n,x)=>n+(Number(x.amount)||0),0);
    const voracious=talentRank(u,'Voracious'),hemostasis=u.statuses?.['hemostasis']?talentRank(u,'Hemostasis'):0;
    const heal=Math.max(u.maxHealth*.07,recent*(.30+voracious*.065))*(1+hemostasis*.08);
    const effective=doHeal(ctx,u,u,heal,'Death Strike');
    if(hemostasis)removeStatus(ctx,u,'hemostasis','consumed');
    if((r=talentRank(u,'Blood Shield'))){
     const reduction=.04+r*.025;applyStatus(ctx,u,u,{id:'blood-shield',name:'Blood Shield',kind:'buff',duration:5000,effect:{incomingDamageReduction:reduction}});
     talentTrigger(ctx,u,'Blood Shield',u,{healing:effective,reduction,duration:5000})
    }
    if(voracious)talentTrigger(ctx,u,'Voracious',u,{recentDamage:Math.round(recent),healing:effective})
   }
  }
  if(u.spec==='Frost'){
   if(a.id==='frost-strike'&&(r=talentRank(u,'Icy Talons'))){
    applyStatus(ctx,u,u,{id:'icy-talons',name:'Icy Talons',kind:'buff',duration:5000,effect:{haste:.035*r}});
    talentTrigger(ctx,u,'Icy Talons',u,{duration:5000})
   }
   if(Number(a.cost)>0&&(r=talentRank(u,'Runic Empowerment'))&&ctx.rng()<.12*r){
    gainResource(ctx,u,{name:'Runic Empowerment',gain:10+r*2});talentTrigger(ctx,u,'Runic Empowerment',u,{runicPower:10+r*2})
   }
   if(crit&&(r=talentRank(u,'Avalanche'))&&target.alive){
    const extras=livingEnemies(ctx).filter(e=>e.id!==target.id).slice(0,2),splash=Math.max(1,Math.round(dealt*.08*r));
    extras.forEach(e=>dealDamage(ctx,u,e,splash,'Avalanche',{damageType:'magic'}));
    if(extras.length)talentTrigger(ctx,u,'Avalanche',extras[0],{targets:extras.length,damage:splash})
   }
  }
  if(u.spec==='Unholy'){
   const woundKey=u.id,wounds=()=>Math.max(0,Number(target.dkWounds?.[woundKey])||0);
   target.dkWounds=target.dkWounds||{};
   if(a.id==='festering-strike'){
    const fest=talentRank(u,'Festering Wounds'),added=2+(fest>=2?1:0),next=Math.min(6,wounds()+added);target.dkWounds[woundKey]=next;
    emit(ctx,'FESTERING_WOUND_CHANGED',{source:u.id,target:target.id,ability:'Festering Wounds',amount:added,result:'applied',position:copy(target.position),payload:{stacks:next}});
    if(fest)talentTrigger(ctx,u,'Festering Wounds',target,{stacks:next,added})
   }
   if(a.id==='scourge-strike'&&wounds()>0){
    const fest=talentRank(u,'Festering Wounds'),next=wounds()-1;target.dkWounds[woundKey]=next;
    const burst=Math.max(1,Math.round((9+fest*2)*(u.baseStats?.outputScale||1)));
    dealDamage(ctx,u,target,burst,'Festering Wound',{damageType:'magic'});
    gainResource(ctx,u,{name:'Festering Wound',gain:6});
    emit(ctx,'FESTERING_WOUND_CHANGED',{source:u.id,target:target.id,ability:'Festering Wound',amount:1,result:'burst',position:copy(target.position),payload:{stacks:next}});
   }
   if(a.id==='outbreak'&&target.alive){
    const epidemic=talentRank(u,'Epidemic'),tick=Math.max(2,Math.round((5+epidemic)*(u.baseStats?.outputScale||1)));
    applyStatus(ctx,u,target,{id:'virulent-plague-'+u.id,name:'Virulent Plague',kind:'debuff',duration:5600,effect:{damageOverTime:tick}});
    [1700,3400,5100].forEach(at=>schedule(ctx,ctx.time+at,()=>{
     if(!u.alive||!target.alive)return;dealDamage(ctx,u,target,tick,'Virulent Plague',{damageType:'magic'});
     if(epidemic)livingEnemies(ctx).filter(e=>e.id!==target.id).slice(0,Math.min(2,epidemic)).forEach(e=>dealDamage(ctx,u,e,Math.max(1,Math.round(tick*.45)),'Epidemic',{damageType:'magic'}))
    },'unholy-plague'));
    if(epidemic)talentTrigger(ctx,u,'Epidemic',target,{ticks:3})
   }
   if(a.id==='death-coil'&&u.statuses?.['sudden-doom'])removeStatus(ctx,u,'sudden-doom','consumed')
  }
 }
 if(u.class==='Demon Hunter'){
  if(u.spec==='Havoc'){
   if(a.id==='demons-bite'&&(r=talentRank(u,'Demon Blades')))gainResource(ctx,u,{name:'Demon Blades',gain:2+r*2});
   if(a.id==='eye-beam'){
    if((r=talentRank(u,'Furious Gaze'))){
     applyStatus(ctx,u,u,{id:'furious-gaze',name:'Furious Gaze',kind:'buff',duration:5000,effect:{haste:.035*r}});
     talentTrigger(ctx,u,'Furious Gaze',u,{duration:5000})
    }
    if((r=talentRank(u,'Demonic'))){
     applyStatus(ctx,u,u,{id:'demonic',name:'Demonic',kind:'buff',duration:5500,effect:{outgoingDamage:.055*r,haste:.02*r}});
     talentTrigger(ctx,u,'Demonic',u,{duration:5500})
    }
   }
   if(['chaos-strike','eye-beam','fel-barrage','havoc-metamorphosis'].includes(a.id)&&(r=talentRank(u,'Soul Rending'))){
    const healing=Math.max(1,Math.round(dealt*(.025+.025*r)));doHeal(ctx,u,u,healing,'Soul Rending')
   }
   if(a.id==='chaos-strike'&&(r=talentRank(u,'Chaos Theory'))&&ctx.rng()<.12*r){
    gainResource(ctx,u,{name:'Chaos Theory',gain:12});talentTrigger(ctx,u,'Chaos Theory',u,{fury:12})
   }
   if(a.id==='havoc-metamorphosis'){
    applyStatus(ctx,u,u,{id:'metamorphosis-havoc',name:'Metamorphosis',kind:'buff',duration:10000,effect:{outgoingDamage:.18,haste:.12}});
    talentTrigger(ctx,u,'Metamorphosis',u,{duration:10000,spec:'Havoc'})
   }
  }
  if(u.spec==='Vengeance'){
   if(a.id==='shear'){
    const fracture=talentRank(u,'Fracture'),fragments=1+(fracture>=2?1:0);u.soulFragments=Math.min(5,Number(u.soulFragments||0)+fragments);
    if(fracture)gainResource(ctx,u,{name:'Fracture',gain:fracture*2});
    emit(ctx,'SOUL_FRAGMENT_CHANGED',{source:u.id,target:u.id,ability:'Shear',amount:fragments,result:'generated',position:copy(u.position),payload:{fragments:u.soulFragments}})
   }
   if(['infernal-strike','sigil-of-flame'].includes(a.id)&&ctx.rng()<.35){
    u.soulFragments=Math.min(5,Number(u.soulFragments||0)+1);
    emit(ctx,'SOUL_FRAGMENT_CHANGED',{source:u.id,target:u.id,ability:a.name,amount:1,result:'generated',position:copy(u.position),payload:{fragments:u.soulFragments}})
   }
   if(a.id==='soul-cleave'||a.id==='spirit-bomb'){
    const available=Math.max(0,Number(u.soulFragments)||0),consume=a.id==='spirit-bomb'?available:Math.min(3,available),soulRank=talentRank(u,'Soul Cleave');
    u.soulFragments=Math.max(0,available-consume);
    const pctHeal=a.id==='spirit-bomb'?.035:.045;
    const healing=u.maxHealth*(pctHeal+consume*(.018+soulRank*.004));
    doHeal(ctx,u,u,healing,a.name);
    emit(ctx,'SOUL_FRAGMENT_CHANGED',{source:u.id,target:u.id,ability:a.name,amount:consume,result:'consumed',position:copy(u.position),payload:{fragments:u.soulFragments}});
    if((r=talentRank(u,'Soul Barrier'))&&consume>0){
     const reduction=.03+r*.025;applyStatus(ctx,u,u,{id:'soul-barrier',name:'Soul Barrier',kind:'buff',duration:5000,effect:{incomingDamageReduction:reduction}});
     talentTrigger(ctx,u,'Soul Barrier',u,{fragments:consume,reduction,duration:5000})
    }
   }
  }
 }
 if(u.class==='Evoker'&&u.spec==='Devastation'){
  if(['living-flame','azure-strike'].includes(a.id)&&(r=talentRank(u,'Essence Burst'))&&ctx.rng()<.12*r){
   applyStatus(ctx,u,u,{id:'essence-burst',name:'Essence Burst',kind:'buff',duration:8000,effect:{}});
   talentTrigger(ctx,u,'Essence Burst',u,{duration:8000})
  }
  if(a.id==='fire-breath'&&(r=talentRank(u,'Burnout'))){
   applyStatus(ctx,u,u,{id:'burnout',name:'Burnout',kind:'buff',duration:8000,effect:{}});
   talentTrigger(ctx,u,'Burnout',u,{duration:8000})
  }
  if(a.id==='living-flame'&&u.statuses?.['burnout'])removeStatus(ctx,u,'burnout','consumed');
  if(a.id==='disintegrate'&&(r=talentRank(u,'Scintillation'))&&ctx.rng()<.14*r&&target.alive){
   const burst=Math.max(1,Math.round(dealt*(.16+.05*r)));dealDamage(ctx,u,target,burst,'Scintillation',{damageType:'magic'});talentTrigger(ctx,u,'Scintillation',target,{damage:burst})
  }
  if(Number(a.cost)>0&&(r=talentRank(u,'Power Swell'))){
   applyStatus(ctx,u,u,{id:'power-swell',name:'Power Swell',kind:'buff',duration:5000,effect:{haste:.035*r}});
   talentTrigger(ctx,u,'Power Swell',u,{duration:5000})
  }
  if(a.id==='dragonrage'){
   applyStatus(ctx,u,u,{id:'dragonrage',name:'Dragonrage',kind:'buff',duration:10000,effect:{outgoingDamage:.18,haste:.10}});
   talentTrigger(ctx,u,'Dragonrage',u,{duration:10000})
  }
 }
}
function talentAfterHeal(ctx,u,a,target,effective){
 if(!u?.alive||!target?.alive||effective<=0||a.kind!=='heal')return;
 let r=0;
 if(u.class==='Priest'){
  if((r=talentRank(u,'Prayer of Mending'))){
   const others=livingPlayers(ctx).filter(p=>p.id!==target.id&&hasLineOfSight(ctx,u,p)).sort((x,y)=>healthRatio(x)-healthRatio(y)).slice(0,Math.min(2,r));
   const ratio=.18+(r-1)*.06;
   others.forEach(p=>doHeal(ctx,u,p,Math.max(1,Math.round(effective*ratio)),'Prayer of Mending'));
   if(others.length)talentTrigger(ctx,u,'Prayer of Mending',others[0],{jumps:others.length,ratio})
  }
  if((r=talentRank(u,'Renew'))){
   const tick=Math.max(1,Math.round(effective*.045*r));
   applyStatus(ctx,u,target,{id:'renew-talent',name:'Renew',kind:'buff',duration:3300,effect:{healingOverTime:tick}});
   [1500,3000].forEach(t=>schedule(ctx,ctx.time+t,()=>{if(u.alive&&target.alive)doHeal(ctx,u,target,tick,'Renew')},'talent-renew'))
  }
  if((r=talentRank(u,'Divine Insight'))&&ctx.rng()<.10*r){
   const echo=Math.max(1,Math.round(effective*.45));
   talentTrigger(ctx,u,'Divine Insight',target,{healing:echo});
   schedule(ctx,ctx.time+250,()=>{if(u.alive&&target.alive)doHeal(ctx,u,target,echo,'Divine Insight')},'talent-divine-insight')
  }
 }
 if(u.class==='Paladin'&&u.spec==='Holy'){
  if(talentRank(u,'Beacon')){
   const tank=livingPlayers(ctx).find(p=>p.role==='tank');
   if(tank&&tank.id!==target.id){
    const echo=Math.max(1,Math.round(effective*.40));
    doHeal(ctx,u,tank,echo,'Beacon');
    talentTrigger(ctx,u,'Beacon',tank,{healing:echo})
   }
  }
  if((r=talentRank(u,'Radiance'))){
   const others=livingPlayers(ctx).filter(p=>p.id!==target.id&&hasLineOfSight(ctx,u,p)).sort((x,y)=>healthRatio(x)-healthRatio(y)).slice(0,2);
   others.forEach(p=>doHeal(ctx,u,p,Math.max(1,Math.round(effective*.10*r)),'Radiance'));
   if(others.length)talentTrigger(ctx,u,'Radiance',others[0],{targets:others.length})
  }
  if((r=talentRank(u,'Infusion'))&&ctx.rng()<.10*r){
   applyStatus(ctx,u,u,{id:'infusion',name:'Infusion',kind:'buff',duration:5000,effect:{haste:.08*r}});
   talentTrigger(ctx,u,'Infusion',u,{duration:5000})
  }
 }
 if(u.class==='Druid'&&u.spec==='Restoration'){
  if((r=talentRank(u,'Lifebloom'))){
   const tick=Math.max(1,Math.round(effective*.035*r));
   [1400,2800].forEach(t=>schedule(ctx,ctx.time+t,()=>{if(u.alive&&target.alive)doHeal(ctx,u,target,tick,'Lifebloom')},'talent-lifebloom'))
  }
  if((r=talentRank(u,'Living Seed'))&&ctx.rng()<.12*r){
   const seed=Math.max(1,Math.round(effective*.30));
   talentTrigger(ctx,u,'Living Seed',target,{healing:seed});
   schedule(ctx,ctx.time+1500,()=>{if(u.alive&&target.alive)doHeal(ctx,u,target,seed,'Living Seed')},'talent-living-seed')
  }
 }
 if(u.class==='Shaman'&&u.spec==='Restoration'&&a.id==='riptide'){
  if((r=talentRank(u,'Tidal Waves'))){
   applyStatus(ctx,u,u,{id:'tidal-waves',name:'Tidal Waves',kind:'buff',duration:6000,effect:{haste:.04*r}});
   talentTrigger(ctx,u,'Tidal Waves',u,{duration:6000})
  }
 }
 if(u.class==='Monk'&&u.spec==='Mistweaver'){
  u.lastMistHealId=a.id;
  if((r=talentRank(u,'Enveloping Breath'))){
   const others=livingPlayers(ctx).filter(p=>p.id!==target.id&&hasLineOfSight(ctx,u,p)).sort((x,y)=>healthRatio(x)-healthRatio(y)).slice(0,2);
   const splash=Math.max(1,Math.round(effective*.07*r));others.forEach(p=>doHeal(ctx,u,p,splash,'Enveloping Breath'));
   if(others.length)talentTrigger(ctx,u,'Enveloping Breath',others[0],{targets:others.length,healing:splash})
  }
  if(talentRank(u,'Jade Serpent')){
   u.talentCounters.jadeSerpent=(Number(u.talentCounters.jadeSerpent)||0)+1;
   if(u.talentCounters.jadeSerpent>=3){
    u.talentCounters.jadeSerpent=0;const low=[...livingPlayers(ctx)].sort((x,y)=>healthRatio(x)-healthRatio(y))[0],heal=Math.max(1,Math.round(effective*.30));
    if(low){doHeal(ctx,u,low,heal,'Jade Serpent');talentTrigger(ctx,u,'Jade Serpent',low,{healing:heal})}
   }
  }
 }
 if(u.class==='Evoker'&&u.spec==='Preservation'){
  if(a.id==='reversion'&&(r=talentRank(u,'Reversion'))){
   const tick=Math.max(1,Math.round(effective*.045*r));[1300,2600].forEach(t=>schedule(ctx,ctx.time+t,()=>{if(u.alive&&target.alive)doHeal(ctx,u,target,tick,'Reversion')},'evoker-reversion'))
  }
  if(a.id==='verdant-embrace'&&(r=talentRank(u,'Lifebind'))){
   const other=livingPlayers(ctx).filter(p=>p.id!==target.id&&hasLineOfSight(ctx,u,p)).sort((x,y)=>healthRatio(x)-healthRatio(y))[0];
   if(other){const echo=Math.max(1,Math.round(effective*(.12+.08*r)));doHeal(ctx,u,other,echo,'Lifebind');talentTrigger(ctx,u,'Lifebind',other,{healing:echo})}
  }
 }
}
function talentAfterGroupHeal(ctx,u,a,totalEffective){
 if(!u?.alive||totalEffective<=0)return;
 if(u.class==='Druid'&&talentRank(u,'Flourish')){
  const pulse=Math.max(1,Math.round(totalEffective*.04));
  talentTrigger(ctx,u,'Flourish',u,{healingPerTarget:pulse});
  schedule(ctx,ctx.time+1400,()=>livingPlayers(ctx).filter(p=>hasLineOfSight(ctx,u,p)).forEach(p=>doHeal(ctx,u,p,pulse,'Flourish')),'talent-flourish')
 }
 if(u.class==='Shaman'&&u.spec==='Restoration'&&a.id==='chain-heal'){
  const r=talentRank(u,'Tidal Waves');
  if(r){applyStatus(ctx,u,u,{id:'tidal-waves',name:'Tidal Waves',kind:'buff',duration:6000,effect:{haste:.04*r}});talentTrigger(ctx,u,'Tidal Waves',u,{duration:6000})}
 }
 if(u.class==='Evoker'&&u.spec==='Preservation'){
  const echo=talentRank(u,'Echoing Bloom'),cycle=talentRank(u,'Cycle of Life');
  if(a.id==='emerald-blossom'&&echo){
   const pulse=Math.max(1,Math.round(totalEffective*(.025+.02*echo)));schedule(ctx,ctx.time+1300,()=>livingPlayers(ctx).filter(p=>hasLineOfSight(ctx,u,p)).forEach(p=>doHeal(ctx,u,p,pulse,'Echoing Bloom')),'evoker-echoing-bloom');talentTrigger(ctx,u,'Echoing Bloom',u,{healingPerTarget:pulse})
  }
  if(cycle&&ctx.rng()<.18*cycle){
   const pulse=Math.max(1,Math.round(totalEffective*.035*cycle));schedule(ctx,ctx.time+1700,()=>livingPlayers(ctx).filter(p=>hasLineOfSight(ctx,u,p)).forEach(p=>doHeal(ctx,u,p,pulse,'Cycle of Life')),'evoker-cycle-of-life');talentTrigger(ctx,u,'Cycle of Life',u,{healingPerTarget:pulse})
  }
 }
}
function useTalentUtility(ctx,u){
 if(!u?.alive)return false;
 if(u.class==='Druid'&&u.spec==='Restoration'){
  const low=[...livingPlayers(ctx)].sort((a,b)=>healthRatio(a)-healthRatio(b))[0];
  if(talentRank(u,'Ironbark')&&low&&healthRatio(low)<.45&&talentReady(ctx,u,'ironbark')){
   talentSetCooldown(ctx,u,'ironbark',45000);applyStatus(ctx,u,low,{id:'ironbark-talent',name:'Ironbark',kind:'buff',duration:8000,effect:{incomingDamageReduction:.25}});
   talentTrigger(ctx,u,'Ironbark',low,{duration:8000});u.gcdUntil=Math.max(u.gcdUntil,ctx.time+300);return true
  }
  if(talentRank(u,'Tree of Life')&&combatPressure(ctx)>.52&&talentReady(ctx,u,'tree-of-life')){
   talentSetCooldown(ctx,u,'tree-of-life',60000);applyStatus(ctx,u,u,{id:'tree-of-life',name:'Tree of Life',kind:'buff',duration:10000,effect:{outgoingHealing:.22,haste:.10}});
   talentTrigger(ctx,u,'Tree of Life',u,{duration:10000});return true
  }
 }
 if(u.class==='Shaman'&&u.spec==='Restoration'){
  const alive=livingPlayers(ctx),deep=alive.filter(p=>healthRatio(p)<.65),pressure=combatPressure(ctx);
  if(talentRank(u,'Ascendant Tide')&&(pressure>.35||deep.length>=3)&&talentReady(ctx,u,'ascendant-tide')){
   talentSetCooldown(ctx,u,'ascendant-tide',65000);
   applyStatus(ctx,u,u,{id:'ascendant-tide',name:'Ascendant Tide',kind:'buff',duration:10000,effect:{outgoingHealing:.20,haste:.08}});
   alive.forEach(p=>applyStatus(ctx,u,p,{id:'ascendant-totems',name:'Ascendant Totems',kind:'buff',duration:10000,effect:{incomingHealing:.04,resourceRegen:.04}}));
   talentTrigger(ctx,u,'Ascendant Tide',u,{duration:10000});return true
  }
 }
 if(u.class==='Mage'&&talentRank(u,'Arcane Power')&&talentReady(ctx,u,'arcane-power')&&(['boss','final','world-boss','event'].includes(ctx.encounter.kind)||combatPressure(ctx)>.55)){
  talentSetCooldown(ctx,u,'arcane-power',60000);applyStatus(ctx,u,u,{id:'arcane-power',name:'Arcane Power',kind:'buff',duration:10000,effect:{outgoingDamage:.22,haste:.08}});
  talentTrigger(ctx,u,'Arcane Power',u,{duration:10000});return true
 }
 if(u.class==='Warrior'&&u.spec==='Arms'&&talentRank(u,'Bladestorm')&&talentReady(ctx,u,'bladestorm')&&livingEnemies(ctx).length>=2){
  const enemies=livingEnemies(ctx),target=enemies.find(e=>e.focusSelected)||[...enemies].sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0))[0];
  if(!target)return false;
  if(!moveIntoRange(ctx,u,target,5))return true;
  talentSetCooldown(ctx,u,'bladestorm',30000);u.gcdUntil=Math.max(u.gcdUntil,ctx.time+1500);u.target=target.id;updateFacing(u,target);
  emit(ctx,'ABILITY_START',{source:u.id,target:target.id,ability:'Bladestorm',result:'talent',position:copy(u.position),payload:{kind:'damage',range:8}});
  const amount=20*(1+Math.min(.35,u.power*.012))*(u.baseStats?.outputScale||1);
  const nearby=enemies.filter(e=>inRange(u,e,8)&&hasLineOfSight(ctx,u,e));
  nearby.forEach(e=>dealDamage(ctx,u,e,amount,'Bladestorm',{damageType:'physical'}));
  talentTrigger(ctx,u,'Bladestorm',u,{targets:nearby.length});
  emit(ctx,'ABILITY_FINISH',{source:u.id,target:target.id,ability:'Bladestorm',result:'resolved',position:copy(u.position),payload:{kind:'damage',targets:nearby.length}});
  return true
 }
 return false
}
function rollDamage(ctx,u,a,target){
 const power=1+Math.min(.35,u.power*.012),levelScale=u.baseStats?.outputScale||levelOutputScale(u.level),match=levelMatchMultiplier(u.level,target?.level||1);
 const variance=.9+ctx.rng()*.2,revivePenalty=u.revivePenaltyUntil>ctx.time?.85:1,frenzy=u.frenzyUntil>ctx.time?1.15:1;
 let amount=(Number(a.damage)||12)*power*levelScale*match*variance*revivePenalty*frenzy*Math.max(.1,1+statusBonus(u,'outgoingDamage'))*talentDamageScale(ctx,u,a,target);
 let executeBelow=Number(a.executeBelow)||0,executeMultiplier=Math.max(1,Number(a.executeMultiplier)||1.5);
 if(u.class==='Hunter'&&a.id==='kill-shot'&&talentRank(u,'Kill Shot')){executeBelow=Math.max(executeBelow,.35);executeMultiplier=Math.max(executeMultiplier,2.05)}
 if(executeBelow>0&&healthRatio(target)<=executeBelow)amount*=executeMultiplier;
 let dkCrit=0;if(u.class==='Death Knight'&&u.spec==='Frost'&&['obliterate','frostwyrms-fury','breath-of-sindragosa'].includes(a.id))dkCrit=talentRank(u,'Killing Machine')*.05;
 const critChance=clamp(.12+statusBonus(u,'critBonus')+talentCritBonus(u)+dkCrit,0,.80);
 if(ctx.rng()<critChance){amount*=1.5*talentCritMultiplier(u);return{amount,crit:true}}
 return{amount,crit:false};
}

function itemLevelIncomingMultiplier(ctx,target){
 const recommended=Math.max(0,Number(ctx?.encounter?.recommendedItemLevel)||0),itemLevel=Math.max(0,Number(target?.itemLevel)||0);
 if(!recommended)return 1;
 if(!itemLevel)return 1.18;
 const delta=itemLevel-recommended;
 if(delta<0)return Math.min(1.55,1+Math.abs(delta)*.045);
 return Math.max(.82,1-delta*.018);
}
function mitigation(ctx,target,damageType='physical',opts={}){
 const profile=target?.defence||{},gearTaken=damageType==='magic'?(Number(profile.magicTaken)||1):(Number(profile.physicalTaken)||1);
 let value=target.role==='tank'?(damageType==='magic'?.82:.72):1;
 value*=gearTaken;value*=itemLevelIncomingMultiplier(ctx,target);
 if(opts.aggroHit&&target.role!=='tank')value*=target.role==='healer'?1.28:1.22;
 let blockChance=Number(profile.blockChance)||0;
 if(target.class==='Warrior'&&target.spec==='Protection')blockChance+=talentRank(target,'Shield Mastery')*4;
 if(target.class==='Paladin'&&target.spec==='Protection'){
  blockChance+=talentRank(target,'Sacred Shield')*4;
  if(['boss','final','world-boss'].includes(ctx.encounter.kind))blockChance+=talentRank(target,'Holy Bastion')*4;
 }
 if(damageType==='physical'&&target.role==='tank'&&blockChance>0&&ctx?.rng&&ctx.rng()*100<blockChance){value*=Number(profile.blockMultiplier)||.72;opts.blocked=true}
 if(target.class==='Warrior'&&target.spec==='Protection'){
  if(damageType==='physical')value*=Math.max(.76,1-talentRank(target,'Iron Discipline')*.025);
  if(['boss','final','world-boss'].includes(ctx.encounter.kind))value*=Math.max(.78,1-talentRank(target,'Fortress')*.035)
 }
 if(target.class==='Paladin'&&target.spec==='Protection'){
  value*=Math.max(.88,1-talentRank(target,'Guardian Oath')*.04);
  if(damageType==='magic')value*=Math.max(.76,1-talentRank(target,'Divine Ward')*.04)
 }
 if(target.class==='Priest'&&healthRatio(target)<.55)value*=Math.max(.82,1-talentRank(target,'Focused Will')*.05);
 if(target.class==='Monk'&&target.spec==='Windwalker')value*=Math.max(.88,1-talentRank(target,'Dance of the Wind')*.025);
 if(target.defensiveUntil>0)value*=target.role==='tank'?.66:.74;
 value*=1-clamp(statusBonus(target,'incomingDamageReduction'),0,.70);
 value*=1+clamp(statusBonus(target,'incomingDamageTaken'),0,2.5);
 if(target.class==='Monk'&&target.spec==='Brewmaster')value*=Math.max(.84,1-talentRank(target,'Elusive Brawler')*.018);
 if(target.class==='Demon Hunter'&&target.spec==='Vengeance')value*=Math.max(.78,1-talentRank(target,'Thick Skin')*.022);
 return Math.max(.28,value);
}

function monkStaggerShare(target,damageType='physical'){
 if(target?.class!=='Monk'||target?.spec!=='Brewmaster')return 0;
 const high=talentRank(target,'High Tolerance');
 return damageType==='magic'?Math.min(.24,.10+high*.03):Math.min(.48,.30+high*.05)
}
function addMonkStagger(ctx,source,target,damage,damageType='physical'){
 const share=monkStaggerShare(target,damageType);
 if(share<=0||damage<=1)return damage;
 const delayed=Math.max(1,Math.round(damage*share)),immediate=Math.max(1,Math.round(damage-delayed));
 target.staggerPool=Math.max(0,Number(target.staggerPool)||0)+delayed;
 target.staggerSourceId=source?.id||target.staggerSourceId;
 if(!target.nextStaggerTick||target.nextStaggerTick<=ctx.time)target.nextStaggerTick=ctx.time+1000;
 emit(ctx,'STAGGER_CHANGED',{source:source?.id||null,target:target.id,ability:'Stagger',amount:delayed,result:'added',position:copy(target.position),payload:{pool:Math.round(target.staggerPool),poolPct:pct(target.staggerPool,target.maxHealth),immediate,damageType}});
 return immediate
}
function tickMonkStagger(ctx){
 ctx.players.filter(u=>u.alive&&u.class==='Monk'&&u.spec==='Brewmaster'&&Number(u.staggerPool)>0).forEach(u=>{
  if(ctx.time<Number(u.nextStaggerTick||0))return;
  const shuffle=talentRank(u,'Shuffle'),ratio=.22*Math.max(.72,1-shuffle*.08);
  const release=Math.max(1,Math.min(Math.round(u.staggerPool),Math.round(u.staggerPool*ratio)));
  u.staggerPool=Math.max(0,u.staggerPool-release);u.nextStaggerTick=ctx.time+1000;
  const source=getUnit(ctx,u.staggerSourceId)||livingEnemies(ctx)[0]||{id:'stagger',name:'Stagger',role:'enemy',alive:true};
  dealDamage(ctx,source,u,release,'Stagger',{damageType:'physical',avoidable:false,ignoreMitigation:true,ignoreStagger:true,staggerTick:true});
  emit(ctx,'STAGGER_CHANGED',{source:source.id,target:u.id,ability:'Stagger',amount:release,result:'released',position:copy(u.position),payload:{pool:Math.round(u.staggerPool),poolPct:pct(u.staggerPool,u.maxHealth)}})
 })
}

function dealDamage(ctx,source,target,amount,ability,opts={}){
 if(!source?.alive||!target?.alive)return 0;
 if(ctx?.encounter?.focusSelectedDamageOnly&&source.role!=='enemy'&&target.role==='enemy'&&!target.focusSelected)return 0;
 let final=Math.max(0,amount);
 if(target.role!=='enemy'){
  if(!opts.ignoreMitigation){
   const mitigationOpts={...opts};final*=mitigation(ctx,target,opts.damageType||'physical',mitigationOpts);if(mitigationOpts.blocked)opts.blocked=true;
  }
  final=Math.max(1,Math.round(final));
  if(!opts.ignoreStagger&&target.class==='Monk'&&target.spec==='Brewmaster')final=addMonkStagger(ctx,source,target,final,opts.damageType||'physical');
  const projectedHp=target.health-final;
  const crossesLow=healthRatio(target)>.30&&(projectedHp/Math.max(1,target.maxHealth))<.30;
  if(target.class==='Warrior'&&target.spec==='Protection'&&talentRank(target,'Last Stand')&&!target.talentFlags.lastStand&&crossesLow){
   target.talentFlags.lastStand=true;const heal=Math.round(target.maxHealth*.22);target.health=clamp(target.health+heal,0,target.maxHealth);
   applyStatus(ctx,target,target,{id:'last-stand-talent',name:'Last Stand',kind:'buff',duration:6000,effect:{incomingDamageReduction:.15}});
   talentTrigger(ctx,target,'Last Stand',target,{healing:heal,duration:6000})
  }
  if(final>=target.health){
   const priest=livingPlayers(ctx).find(p=>p.class==='Priest'&&talentRank(p,'Guardian Spirit')>0&&talentReady(ctx,p,'guardian-spirit-talent'));
   if(priest){
    talentSetCooldown(ctx,priest,'guardian-spirit-talent',90000);final=Math.max(0,target.health-1);
    talentTrigger(ctx,priest,'Guardian Spirit',target,{preventedLethal:true});
    schedule(ctx,ctx.time+1,()=>{if(priest.alive&&target.alive)doHeal(ctx,priest,target,target.maxHealth*.30,'Guardian Spirit')},'talent-guardian-spirit')
   }else if(target.class==='Warrior'&&target.spec==='Protection'&&talentRank(target,'Unbroken')&&!target.talentFlags.unbroken){
    target.talentFlags.unbroken=true;final=Math.max(0,target.health-1);
    applyStatus(ctx,target,target,{id:'unbroken',name:'Unbroken',kind:'buff',duration:4000,effect:{incomingDamageReduction:.40}});
    talentTrigger(ctx,target,'Unbroken',target,{preventedLethal:true,duration:4000})
   }else if(target.class==='Priest'&&talentRank(target,'Spirit of Redemption')&&!target.talentFlags.spiritRedemption){
    target.talentFlags.spiritRedemption=true;const allies=livingPlayers(ctx).filter(p=>p.id!==target.id);
    const burst=Math.max(1,Math.round(target.maxHealth*.18));
    allies.forEach(p=>doHeal(ctx,target,p,burst,'Spirit of Redemption'));
    talentTrigger(ctx,target,'Spirit of Redemption',target,{targets:allies.length,healing:burst})
   }
  }
  const crossesLastStand=healthRatio(target)>.20&&((target.health-final)/Math.max(1,target.maxHealth))<.20;
  if(crossesLastStand&&hasUnique(target,'guardian-last-stand')&&!target.uniqueUsed?.['guardian-last-stand']){
   target.uniqueUsed['guardian-last-stand']=true;target.defensiveUntil=Math.max(Number(target.defensiveUntil)||0,6000);
   applyStatus(ctx,target,target,{id:'guardian-last-stand',name:"Guardian's Last Stand",kind:'buff',duration:6000,effect:{damageReduction:.30}});
   triggerUnique(ctx,target,'guardian-last-stand',"Guardian's Last Stand",{target:target.id,duration:6000});
  }
 }else final=Math.max(1,Math.round(final));
 final=Math.max(0,Math.round(final));
 const before=target.health;target.health=clamp(target.health-final,0,target.maxHealth);
 const dealt=before-target.health;
 emit(ctx,'DAMAGE_DEALT',{source:source.id,target:target.id,ability,amount:dealt,result:opts.blocked?'blocked':opts.crit?'critical':'hit',position:copy(target.position),payload:{targetHp:target.health,targetMax:target.maxHealth,targetHpPct:pct(target.health,target.maxHealth),avoidable:!!opts.avoidable,blocked:!!opts.blocked,damageType:opts.damageType||'physical',mistakeToken:recentMistakeToken(ctx,target)}});
 if(source.role!=='enemy'){
  const st=ctx.stats.players[source.id];st.damage+=dealt;st.abilityDamage[ability]=(st.abilityDamage[ability]||0)+dealt;
  addThreat(ctx,target,source,dealt*threatMultiplier(source,opts.ability||{}),'damage');
 }else{
  const st=ctx.stats.players[target.id];if(st){st.damageTaken+=dealt;if(opts.avoidable)st.avoidableDamage+=dealt}
  if(dealt>0){
   target.recentDamageTaken=Array.isArray(target.recentDamageTaken)?target.recentDamageTaken:[];
   target.recentDamageTaken.push({at:ctx.time,amount:dealt});
   target.recentDamageTaken=target.recentDamageTaken.filter(x=>Number(x.at)>=ctx.time-5000)
  }
  if(target.alive&&dealt>0&&target.class==='Warrior'&&target.spec==='Protection'&&talentRank(target,'Vengeance')){
   const r=talentRank(target,'Vengeance');applyStatus(ctx,target,target,{id:'vengeance-talent',name:'Vengeance',kind:'buff',duration:4500,effect:{outgoingDamage:.04*r}})
  }
  if(target.alive&&dealt>0&&target.class==='Monk'&&target.spec==='Brewmaster'&&talentRank(target,'Gift of the Ox')){
   const r=talentRank(target,'Gift of the Ox');target.talentCounters.giftOx=(Number(target.talentCounters.giftOx)||0)+dealt;
   if(target.talentCounters.giftOx>=target.maxHealth*.24){
    target.talentCounters.giftOx=0;const heal=Math.max(1,Math.round(target.maxHealth*(.035+r*.018)));
    doHeal(ctx,target,target,heal,'Gift of the Ox');talentTrigger(ctx,target,'Gift of the Ox',target,{healing:heal})
   }
  }
 }
 if(opts.blocked&&target.alive){
  if(target.class==='Warrior'&&target.spec==='Protection'&&talentRank(target,'Hold the Line')){
   const r=talentRank(target,'Hold the Line');applyStatus(ctx,target,target,{id:'hold-the-line',name:'Hold the Line',kind:'buff',duration:3200,effect:{incomingDamageReduction:.045*r}});talentTrigger(ctx,target,'Hold the Line',target,{duration:3200})
  }
  if(target.class==='Paladin'&&target.spec==='Protection'&&talentRank(target,'Righteous Guard')){
   const r=talentRank(target,'Righteous Guard');applyStatus(ctx,target,target,{id:'righteous-guard',name:'Righteous Guard',kind:'buff',duration:3200,effect:{incomingDamageReduction:.04*r}});talentTrigger(ctx,target,'Righteous Guard',target,{duration:3200})
  }
 }
 if(target.health<=0)killUnit(ctx,target,source,ability);
 return dealt;
}

function doHeal(ctx,healer,target,amount,ability,opts={}){
 if(!healer?.alive||!target?.alive)return 0;
 const before=target.health,max=target.maxHealth;
 const healingScale=Math.max(.1,1+statusBonus(healer,'outgoingHealing'))*Math.max(.1,1+statusBonus(target,'incomingHealing'));
 const raw=Math.max(1,Math.round(amount*healingScale));
 target.health=clamp(before+raw,0,max);
 const effective=target.health-before,over=Math.max(0,raw-effective);
 const st=ctx.stats.players[healer.id];st.healing+=effective;st.overhealing+=over;st.abilityHealing[ability]=(st.abilityHealing[ability]||0)+effective;
 if(over>0&&hasAffix(ctx,'overflow')&&healer.resource?.name==='Mana'){
  const pressure=Math.min(4,Math.max(1,Math.round(over/12)));
  healer.resource.value=clamp(healer.resource.value-pressure,0,healer.resource.max);
  target.defensiveUntil=Math.max(Number(target.defensiveUntil)||0,1200);
  emit(ctx,'AFFIX_TRIGGER',{source:healer.id,target:target.id,ability:'Overflow',amount:pressure,result:'overflow',payload:{affix:'overflow',overhealing:over,manaPressure:pressure}});
  emitResourceState(ctx,healer,'overflow-pressure')
 }

 emit(ctx,'HEAL_RECEIVED',{source:healer.id,target:target.id,ability,amount:effective,result:over?'overheal':'heal',position:copy(target.position),payload:{overhealing:over,targetHp:target.health,targetMax:max,targetHpPct:pct(target.health,max),visualSource:opts.visualSource||null,chainBounce:Number(opts.chainBounce)||0}});
 livingEnemies(ctx).forEach(e=>addThreat(ctx,e,healer,effective*.5,'healing'));
 return effective;
}
function killUnit(ctx,target,source,ability){
 if(!target.alive)return;
 target.alive=false;target.health=0;target.currentCast=null;
 emit(ctx,target.role==='enemy'?(target.isAdd?'ADD_DEFEATED':'ENEMY_DEFEATED'):'PLAYER_DEFEATED',{source:source?.id||null,target:target.id,ability,result:'dead',position:copy(target.position)});
 if(target.role==='enemy')onEnemyDeathAffixes(ctx,target);
 if(target.role!=='enemy'){
  const st=ctx.stats.players[target.id];st.deaths++;ctx.stats.deaths++;
  ctx.enemies.forEach(e=>{e.threat[target.id]=0;if(e.target===target.id)setAggro(ctx,e,topThreatTarget(ctx,e),'target died')});
 }
}

function reviveUnit(ctx,healer,target,ability,{healthPct=35,resourcePct=20,combat=true}={}){
 if(!healer?.alive||!target||target.alive)return false;
 if(combat&&!canBattleRezTarget(ctx,target)){
  emit(ctx,'ABILITY_FINISH',{source:healer.id,target:target.id,ability,result:'party-wiped',position:copy(healer.position),payload:{kind:'battle-rez',reason:'raid-party-wiped'}});
  return false
 }
 target.alive=true;target.health=Math.max(1,Math.round(target.maxHealth*healthPct/100));
 target.resource.value=clamp(target.resource.max*resourcePct/100,0,target.resource.max);
 target.currentCast=null;target.movingUntil=0;target.nextDecision=ctx.time+700;target.revivePenaltyUntil=ctx.time+(combat?30000:15000);
 const st=ctx.stats.players[healer.id];if(st)st.battleResurrections++;
 ctx.stats.battleResurrections++;
 emit(ctx,'PLAYER_REVIVED',{source:healer.id,target:target.id,ability,result:combat?'battle-rez':'revive',position:copy(target.position),payload:{targetHp:target.health,targetMax:target.maxHealth,targetHpPct:pct(target.health,target.maxHealth),resource:target.resource.name,resourceValue:target.resource.value,resourceMax:target.resource.max,penaltyMs:combat?30000:15000}});
 emitResourceState(ctx,target,'revived');
 return true
}


function onEnemyDeathAffixes(ctx,target){
 if(!target||target.role!=='enemy')return;
 if(hasAffix(ctx,'volatile-cells')&&target.classification==='elite'){
  const source={...target,alive:true};ctx.pendingHazards=(Number(ctx.pendingHazards)||0)+1;
  emit(ctx,'AFFIX_TRIGGER',{source:target.id,ability:'Volatile Cells',result:'armed',position:copy(target.position),payload:{affix:'volatile-cells',delay:850}});
  schedule(ctx,ctx.time+850,()=>{
   ctx.pendingHazards=Math.max(0,(Number(ctx.pendingHazards)||0)-1);
   emit(ctx,'AFFIX_TRIGGER',{source:target.id,ability:'Volatile Cells',result:'explode',position:copy(target.position),payload:{affix:'volatile-cells'}});
   livingPlayers(ctx).forEach(p=>dealDamage(ctx,source,p,18*enemyPressure(ctx,target,p),'Volatile Cells',{damageType:'magic',avoidable:true}))
  },'affix-volatile')
 }
 if(hasAffix(ctx,'relentless')){
  livingEnemies(ctx).forEach(e=>{e.relentlessUntil=ctx.time+5000});
  if(livingEnemies(ctx).length)emit(ctx,'AFFIX_TRIGGER',{source:target.id,ability:'Relentless',result:'empower',payload:{affix:'relentless',duration:5000,targets:livingEnemies(ctx).map(e=>e.id)}})
 }
 if(hasAffix(ctx,'necromantic')&&!target.necromanticUsed&&!target.isAdd&&target.classification!=='boss'&&target.classification!=='world-boss'){
  target.necromanticUsed=true;ctx.pendingResurrections++;
  emit(ctx,'AFFIX_TRIGGER',{source:target.id,ability:'Necromantic',result:'returning',position:copy(target.position),payload:{affix:'necromantic',delay:2400}});
  schedule(ctx,ctx.time+2400,()=>{
   ctx.pendingResurrections=Math.max(0,ctx.pendingResurrections-1);
   if(ctx.finished)return;
   target.alive=true;target.health=Math.max(1,Math.round(target.maxHealth*.35));target.currentCast=null;target.nextAttack=ctx.time+700;
   emit(ctx,'ENEMY_REVIVED',{source:target.id,target:target.id,ability:'Necromantic',result:'revived',position:copy(target.position),payload:{affix:'necromantic',targetHp:target.health,targetMax:target.maxHealth,targetHpPct:pct(target.health,target.maxHealth)}})
  },'affix-necromantic')
 }
}
function scheduleUnstableGround(ctx){
 if(!hasAffix(ctx,'unstable-ground'))return;
 schedule(ctx,ctx.time+5200,()=>{
  if(ctx.finished)return;
  const live=livingPlayers(ctx),enemy=livingEnemies(ctx)[0];if(!live.length||!enemy)return;
  const target=live[Math.floor(ctx.rng()*live.length)],duration=1250,token='affix-ground-'+(++ctx.mechanicSeq);
  const plan=mechanicResponse(ctx,target,'circle',duration,enemy);
  emit(ctx,'AFFIX_TRIGGER',{source:enemy.id,target:target.id,ability:'Unstable Ground',result:'telegraph',position:copy(target.position),payload:{affix:'unstable-ground',token,duration}});
  emit(ctx,'MECHANIC_TELEGRAPH',{source:enemy.id,target:target.id,ability:'Unstable Ground',result:'telegraph',position:copy(target.position),payload:{mechanicType:'circle',duration,token,targetId:target.id,targetIds:[target.id],responses:{[target.id]:plan.success}}});
  schedule(ctx,ctx.time+duration,()=>{
   emit(ctx,'MECHANIC_RESOLVE',{source:enemy.id,target:target.id,ability:'Unstable Ground',result:'resolve',payload:{mechanicType:'circle',token}});
   if(target.alive&&!plan.success)dealDamage(ctx,enemy,target,24*enemyPressure(ctx,enemy,target),'Unstable Ground',{damageType:'magic',avoidable:true});
   scheduleUnstableGround(ctx)
  },'affix-ground-resolve')
 },'affix-ground-start')
}


function isCrowdControlled(u){
 return Object.values(u?.statuses||{}).some(s=>s?.cc&&Number(s.expiresAt)>0);
}
function maybeApplyCrowdControl(ctx){
 const policy=ctx.tactics?.crowdControl||'disabled';
 if(policy==='disabled'||ctx.ccApplied)return;
 const candidates=livingEnemies(ctx).filter(e=>e.kind!=='boss'&&e.classification!=='world-boss');
 if(!candidates.length)return;
 const target=(policy==='priority-elites'?candidates.filter(e=>e.classification==='elite'||e.isAdd):candidates)
   .sort((a,b)=>(b.priority||0)-(a.priority||0)||b.maxHealth-a.maxHealth)[0];
 if(!target)return;
 const controller=livingPlayers(ctx).filter(p=>p.role==='dps').sort((a,b)=>executionQuality(ctx,b)-executionQuality(ctx,a))[0];
 if(!controller)return;
 ctx.ccApplied=true;
 const duration=policy==='enabled'?1800:2600;
 applyStatus(ctx,controller,target,{id:'tactical-control',name:'Tactical Crowd Control',kind:'debuff',duration,cc:'stun',breakOnDamage:false});
 emit(ctx,'CROWD_CONTROL',{source:controller.id,target:target.id,ability:'Tactical Crowd Control',result:'applied',payload:{duration,policy}});
}

function pickDamageTarget(ctx,u){
 const adds=livingEnemies(ctx).filter(e=>e.isAdd);
 if(adds.length&&ctx.tactics.addPriority!=='boss'){
  return adds.sort((a,b)=>(b.priority||0)-(a.priority||0)||a.health-b.health)[0];
 }
 return livingEnemies(ctx).sort((a,b)=>(b.priority||0)-(a.priority||0)||a.health-b.health)[0]||null;
}
function healthRatio(u){return u?.maxHealth>0?u.health/u.maxHealth:0}
function healerTarget(ctx){
 const alive=livingPlayers(ctx);
 return alive.sort((a,b)=>{
   const ar=healthRatio(a),br=healthRatio(b);
   const aw=ar-(a.role==='tank'?.035:0),bw=br-(b.role==='tank'?.035:0);
   return aw-bw
 })[0]||null
}
function raidPartySide(unit){
 const id=String(unit?.characterId||unit?.original?.id||'');
 const match=id.match(/^raid-(\d+)-/);
 return match?Number(match[1]):null
}
function raidPartyIsWiped(ctx,side){
 if(side===null||side===undefined)return false;
 const group=(ctx?.players||[]).filter(p=>raidPartySide(p)===side);
 return group.length>=5&&group.every(p=>!p.alive)
}
function canBattleRezTarget(ctx,target){
 if(!ctx?.encounter?.lockWipedRaidParties)return true;
 const side=raidPartySide(target);
 return side===null||!raidPartyIsWiped(ctx,side)
}
function chooseAbility(ctx,u,target){
 let pool=u.abilities.filter(a=>a.kind!=='interrupt'&&a.kind!=='taunt'&&cooldownReady(u,a)&&(a.cost||0)<=u.resource.value);
 const cdPolicy=ctx.tactics?.cooldownUse||'difficult';
 if(u.role!=='healer'){
   const long=a=>(Number(a.cd)||0)>=6000;
   if(cdPolicy==='bosses'&&!['boss','final'].includes(ctx.encounter.kind)){
     const held=pool.filter(a=>!long(a));if(held.length)pool=held
   }else if(cdPolicy==='difficult'&&!['boss','final','event'].includes(ctx.encounter.kind)&&combatPressure(ctx)<.55){
     const held=pool.filter(a=>!long(a));if(held.length)pool=held
   }
 }
 if(u.role==='healer'){
  const alive=livingPlayers(ctx),tank=alive.find(p=>p.role==='tank'),low=healerTarget(ctx),dead=deadPlayers(ctx);
  const battleRez=pool.find(a=>a.kind==='battle-rez'),revivableDead=dead.filter(p=>canBattleRezTarget(ctx,p));
  if(battleRez&&revivableDead.length){
   const reviveTarget=[...revivableDead].sort((a,b)=>(a.role==='tank'?-3:a.role==='healer'?-2:0)-(b.role==='tank'?-3:b.role==='healer'?-2:0)||b.power-a.power)[0];
   const tankSafe=!tank||healthRatio(tank)>.58,pressure=combatPressure(ctx);
   const badDecision=pressure>.78&&shouldMistake(ctx,u,'triage',7000);
   if((tankSafe&&pressure<.86)||badDecision){
    if(badDecision)recordMistake(ctx,u,'triage','committed to a combat resurrection under heavy pressure',{target:reviveTarget.id,ability:battleRez.name});
    return{ability:battleRez,target:reviveTarget}
   }
  }
  const single=pool.filter(a=>a.kind==='heal').sort((a,b)=>(b.heal||0)-(a.heal||0));
  const group=pool.filter(a=>a.kind==='group-heal').sort((a,b)=>(b.heal||0)-(a.heal||0));
  const injured=alive.filter(p=>healthRatio(p)<.94),deep=alive.filter(p=>healthRatio(p)<.84);
  const avg=alive.reduce((n,p)=>n+healthRatio(p),0)/Math.max(1,alive.length);
  const tankRatio=tank?healthRatio(tank):1;

  // Group pressure takes priority when mechanics/adds have hurt several players.
  if(group.length&&(deep.length>=2||injured.length>=3||avg<.88)){
   return{ability:group[0],target:low||u}
  }

  // Dungeon healers proactively maintain the tank instead of waiting for a crisis.
  const mistweaver=u.class==='Monk'&&u.spec==='Mistweaver';
  const needsTank=tank&&tankRatio<(mistweaver?((ctx.encounter.kind==='boss'||ctx.encounter.kind==='final')?.91:.88):((ctx.encounter.kind==='boss'||ctx.encounter.kind==='final')?.97:.92));
  const needsSingle=low&&healthRatio(low)<(mistweaver?.88:.90);
  if(single.length&&(needsTank||needsSingle)){
   let healTarget=needsSingle&&low&&healthRatio(low)<tankRatio?low:(tank||low);
   let ratio=healthRatio(healTarget),chosen=ratio<.58?single[0]:single[single.length-1];
   if(injured.length>=2&&shouldMistake(ctx,u,'triage',6500)){
    const alternatives=alive.filter(p=>p.id!==healTarget?.id&&healthRatio(p)<.98).sort((a,b)=>healthRatio(b)-healthRatio(a));
    if(alternatives.length){healTarget=alternatives[0];ratio=healthRatio(healTarget);chosen=single[0]}
    recordMistake(ctx,u,'triage','prioritised the wrong heal target',{target:healTarget?.id||null,ability:chosen?.name||'Heal'});
   }
   return{ability:chosen,target:healTarget}
  }

  // Mistweaver can deliberately trade healing slots for martial techniques.
  // During safe windows those attacks become smart healing through fistweaving.
  if(u.class==='Monk'&&u.spec==='Mistweaver'){
   const martial=pool.filter(a=>a.kind==='damage').sort((a,b)=>(b.damage||0)-(a.damage||0));
   if(martial.length&&deep.length===0&&avg>.90&&tankRatio>.88)return{ability:martial[0],target}
  }
  // Other healers preserve mana and watch incoming damage during safe windows.
  return null
 }
 const dmg=pool.filter(a=>a.kind==='damage').sort((a,b)=>(b.damage||0)-(a.damage||0));
 if(!dmg.length)return null;
 const usable=dmg.find(a=>(a.cost||0)<=u.resource.value&&cooldownReady(u,a))||dmg[dmg.length-1];
 return{ability:usable,target};
}
function startAbility(ctx,u,a,target){
 const deadTarget=a?.kind==='battle-rez'&&target&&!target.alive;
 if(!u.alive||(!target?.alive&&!deadTarget)||u.currentCast||ctx.time<u.movingUntil||ctx.time<u.gcdUntil||!cooldownReady(u,a))return false;
 if(!moveIntoRange(ctx,u,target,Number(a.range)||5))return false;
 if(!spendResource(ctx,u,a))return false;
 const haste=clamp(statusBonus(u,'haste'),0,.60),speed=1+haste;
 let cast=Math.max(0,Math.round((Number(a.cast)||0)/speed));cast=talentCastTime(ctx,u,a,cast);
 const gcd=Math.max(0,Math.round((Number(a.gcd)||0)/speed)),cd=Math.max(0,Math.round((Number(a.cd)||0)*talentCooldownScale(u,a)));
 u.gcdUntil=ctx.time+gcd;u.cooldowns[a.id]=Math.max(cd,gcd);
 u.target=target.id;updateFacing(u,target);
 emit(ctx,'ABILITY_START',{source:u.id,target:target.id,ability:a.name,result:cast?'casting':'instant',position:copy(u.position),payload:{castTime:cast,range:a.range,kind:a.kind,talentRequirement:a.talentReq||null}});
 if(cast){
  u.currentCast={ability:a.name,target:target.id,ends:ctx.time+cast};
  emit(ctx,'CAST_START',{source:u.id,target:target.id,ability:a.name,result:'player',payload:{duration:cast,interruptible:false}});
  schedule(ctx,ctx.time+cast,()=>finishAbility(ctx,u,a,target),'player-cast');
 }else finishAbility(ctx,u,a,target);
 return true;
}

function finishAbility(ctx,u,a,target){
 const deadTarget=a?.kind==='battle-rez'&&target&&!target.alive;
 if(!u.alive||(!target?.alive&&!deadTarget))return;
 if(u.currentCast&&u.currentCast.ability!==a.name)return;
 u.currentCast=null;
 if(!pointInsideArena(ctx,u.position,0)||!pointInsideArena(ctx,target.position,0)){emit(ctx,'ABILITY_FINISH',{source:u.id,target:target.id,ability:a.name,result:'failed-arena-boundary',position:copy(u.position),payload:{kind:a.kind,castTime:Number(a.cast)||0}});return}
 if(!hasLineOfSight(ctx,u,target)){emit(ctx,'ABILITY_FINISH',{source:u.id,target:target.id,ability:a.name,result:'failed-line-of-sight',position:copy(u.position),payload:{kind:a.kind,castTime:Number(a.cast)||0}});return}
 if(!inRange(u,target,Number(a.range)||5)){emit(ctx,'ABILITY_FINISH',{source:u.id,target:target.id,ability:a.name,result:'failed-range',position:copy(u.position),payload:{kind:a.kind,castTime:Number(a.cast)||0}});return}
 emit(ctx,'ABILITY_FINISH',{source:u.id,target:target.id,ability:a.name,result:'resolved',position:copy(u.position),payload:{kind:a.kind,castTime:Number(a.cast)||0}});
 if(a.kind==='battle-rez'){
  reviveUnit(ctx,u,target,a.name,{healthPct:35,resourcePct:20,combat:true});
 }else if(a.kind==='summon'){
  if(u.class==='Death Knight')resolveDeathKnightSummon(ctx,u,a,target);else resolveWarlockSummon(ctx,u,a,target);
 }else if(a.kind==='pet-command'){
  if(u.class==='Death Knight')resolveDeathKnightPetCommand(ctx,u,a,target);else resolveWarlockPetCommand(ctx,u,a,target);
 }else if(a.kind==='heal'||a.kind==='group-heal'){
  const revivePenalty=u.revivePenaltyUntil>ctx.time?.85:1;
  const base=(a.heal||24)*(1+Math.min(.28,u.power*.01))*(u.baseStats?.outputScale||levelOutputScale(u.level))*(.92+ctx.rng()*.16)*revivePenalty;
  if(a.kind==='group-heal'&&a.id==='chain-heal'){
   let total=0,current=target,amount=base*talentHealingScale(ctx,u,a,target);
   total+=doHeal(ctx,u,target,amount,a.name);
   const reach=talentRank(u,'Ancestral Reach'),mastery=talentRank(u,'Chain Mastery'),used=new Set([target.id]);
   const jumps=Math.min(4,(Number(a.chainBounces)||3)+(reach>=2?1:0)),bounceRange=(Number(a.chainRange)||16)+reach*3,falloff=Math.min(.91,(Number(a.chainFalloff)||.72)+mastery*.07+reach*.02);
   for(let i=0;i<jumps;i++){
    const next=livingPlayers(ctx).filter(p=>!used.has(p.id)&&hasLineOfSight(ctx,current,p)&&dist(current.position,p.position)<=bounceRange)
     .sort((x,y)=>healthRatio(x)-healthRatio(y)||dist(current.position,x.position)-dist(current.position,y.position))[0];
    if(!next)break;
    amount*=falloff;used.add(next.id);
    total+=doHeal(ctx,u,next,amount*talentHealingScale(ctx,u,a,next),a.name,{visualSource:current.id,chainBounce:i+1});
    current=next
   }
   talentAfterGroupHeal(ctx,u,a,total)
  }else if(a.kind==='group-heal'){
   let total=0;livingPlayers(ctx).filter(p=>hasLineOfSight(ctx,u,p)).forEach(p=>{total+=doHeal(ctx,u,p,base*talentHealingScale(ctx,u,a,p),a.name)});talentAfterGroupHeal(ctx,u,a,total)
  }else{
   const effective=doHeal(ctx,u,target,base*talentHealingScale(ctx,u,a,target),a.name);talentAfterHeal(ctx,u,a,target,effective)
  }
  if(a.hot){
   const hotScale=u.class==='Druid'?1+talentRank(u,'Rejuvenation')*.18:u.class==='Shaman'&&a.id==='riptide'?1+talentRank(u,'Riptide')*.25:u.class==='Monk'&&u.spec==='Mistweaver'&&a.id==='renewing-mist'?1+talentRank(u,'Renewing Mist')*.22:1,hot=Math.max(1,a.hot*hotScale);
   applyStatus(ctx,u,target,{id:a.id+'-hot',name:a.name,kind:'buff',duration:3400,effect:{healingOverTime:hot}});
   [1600,3200].forEach(t=>schedule(ctx,ctx.time+t,()=>{if(u.alive&&target.alive)doHeal(ctx,u,target,hot,a.name+' (HoT)')},'hot'));
  }
 }else if(a.kind==='damage'){
  const rolled=rollDamage(ctx,u,a,target);
  const dealt=dealDamage(ctx,u,target,rolled.amount,a.name,{crit:rolled.crit,ability:a,damageType:a.damageType||(['Mage','Evoker','Shaman','Warlock'].includes(u.class)?'magic':'physical')});
  if(dealt>0)talentAfterDamage(ctx,u,a,target,dealt,rolled.crit);
  if(dealt>0&&rolled.crit&&hasUnique(u,'heart-troll-king')&&ctx.rng()<.28){
   u.frenzyUntil=Math.max(Number(u.frenzyUntil)||0,ctx.time+6000);
   applyStatus(ctx,u,u,{id:'blood-frenzy',name:'Blood Frenzy',kind:'buff',duration:6000,effect:{damageMultiplier:.15}});
   triggerUnique(ctx,u,'heart-troll-king','Blood Frenzy',{target:u.id,duration:6000,trigger:'critical'})
  }
  if(dealt>0&&u.class==='Mage'&&hasUnique(u,'embercore-staff')&&ctx.rng()<.32){
   const splash=livingEnemies(ctx).filter(e=>e.alive&&e.id!==target.id).sort((a,b)=>dist(target.position,a.position)-dist(target.position,b.position))[0];
   if(splash&&dist(target.position,splash.position)<=18){
    const splashDamage=Math.max(1,Math.round(dealt*.38));triggerUnique(ctx,u,'embercore-staff','Living Ember',{target:splash.id,trigger:'spell-hit'});
    dealDamage(ctx,u,splash,splashDamage,'Living Ember',{ability:a,damageType:'magic'})
   }
  }
  if(dealt>0&&target.alive&&u.role==='dps'&&shouldMistake(ctx,u,'threat',12000)){recordMistake(ctx,u,'threat','overcommitted before threat was secure',{target:target.id,ability:a.name});addThreat(ctx,target,u,dealt*(1.8+ctx.rng()*.8),'overcommit')}
  gainResource(ctx,u,a);
  if(a.selfHeal&&u.alive)doHeal(ctx,u,u,a.selfHeal,a.name);
  if(a.cleave&&dealt>0)livingEnemies(ctx).filter(e=>e.id!==target.id).slice(0,a.cleave).forEach(e=>dealDamage(ctx,u,e,dealt*.42,a.name+' cleave',{ability:a,damageType:a.damageType||(['Mage','Warlock'].includes(u.class)?'magic':'physical')}));
 }
}

function tickCooldowns(ctx){
 ctx.players.forEach(u=>{
  Object.keys(u.cooldowns).forEach(k=>u.cooldowns[k]=Math.max(0,u.cooldowns[k]-TICK));
  if(u.defensiveUntil>0)u.defensiveUntil=Math.max(0,u.defensiveUntil-TICK);
  if(u.frenzyUntil>0&&u.frenzyUntil<=ctx.time)u.frenzyUntil=0;
 });
 ctx.enemies.forEach(e=>Object.keys(e.cooldowns).forEach(k=>e.cooldowns[k]=Math.max(0,e.cooldowns[k]-TICK)));
}
function tankNeedsTaunt(ctx,tank){
 return livingEnemies(ctx).find(e=>{
  const t=topThreatTarget(ctx,e);return t&&t.id!==tank.id;
 });
}
function classBuffUseAllowed(ctx,u,buff){
 if(!buff||!u?.alive||(Number(u.cooldowns?.[buff.id])||0)>0)return false;
 if(ctx.time<500+(ctx.players.indexOf(u)*120))return false;
 if(buff.scope==='party'&&ctx.players.some(p=>p.statuses?.[buff.id]))return false;
 const policy=ctx.tactics?.cooldownUse||'difficult',bossLike=['boss','final','world-boss','event'].includes(ctx.encounter.kind);
 if(policy==='free')return true;
 if(policy==='bosses')return bossLike;
 if(policy==='difficult')return bossLike||combatPressure(ctx)>=.68;
 return bossLike
}
function activateClassBuff(ctx,u,buff){
 if(!classBuffUseAllowed(ctx,u,buff))return false;
 let duration=buff.duration,effect=copy(buff.effect||{});
 if(u.class==='Paladin'&&u.spec==='Holy'&&talentRank(u,'Aura Mastery')){
  duration=Math.round(duration*1.5);Object.keys(effect).forEach(k=>effect[k]=Number(effect[k])*1.35);talentTrigger(ctx,u,'Aura Mastery',u,{duration})
 }
 u.cooldowns[buff.id]=buff.cooldown;u.gcdUntil=Math.max(u.gcdUntil,ctx.time+500);
 emit(ctx,'ABILITY_START',{source:u.id,target:u.id,ability:buff.name,result:'class-buff',position:copy(u.position),payload:{kind:'buff',scope:buff.scope,duration,cooldown:buff.cooldown}});
 const targets=buff.scope==='party'?livingPlayers(ctx):[u];
 targets.forEach(target=>applyStatus(ctx,u,target,{id:buff.id,name:buff.name,kind:'buff',duration,effect,persistAcrossEncounters:true}));
 emit(ctx,'ABILITY_FINISH',{source:u.id,target:u.id,ability:buff.name,result:'class-buff',position:copy(u.position),payload:{kind:'buff',scope:buff.scope,duration}});
 return true
}

function shamanTotemUseAllowed(ctx,u,a){
 if(!u?.alive||u.class!=='Shaman'||a?.kind!=='totem'||!cooldownReady(u,a)||(a.cost||0)>u.resource.value)return false;
 const alive=livingPlayers(ctx),deep=alive.filter(p=>healthRatio(p)<.65),injured=alive.filter(p=>healthRatio(p)<.94);
 if(a.totemType==='healing-stream')return injured.length>=2;
 if(a.totemType==='spirit-link')return deep.length>=2;
 return true
}
function useShamanTotem(ctx,u,a){
 if(!shamanTotemUseAllowed(ctx,u,a))return false;
 const mastery=talentRank(u,'Totemic Mastery'),ward=talentRank(u,'Earthen Ward'),potency=1+mastery*.10;
 const duration=Math.round((Number(a.duration)||20000)*(1+mastery*.08)),type=a.totemType||a.id.replace(/-totem$/,''),offsets={
  windfury:{x:-5,y:3},stoneskin:{x:5,y:3},'healing-stream':{x:0,y:-5},'spirit-link':{x:5,y:-3}
 },offset=offsets[type]||{x:0,y:-4};
 let effect={};
 if(type==='windfury')effect={outgoingDamage:.04*potency,haste:.03*potency};
 if(type==='stoneskin')effect={incomingDamageReduction:(.05+ward*.0125)*potency};
 if(type==='healing-stream')effect={incomingHealing:.03*potency};
 if(type==='spirit-link')effect={incomingDamageReduction:(.12+ward*.025)*potency};
 if(!spendResource(ctx,u,a))return false;
 u.cooldowns[a.id]=Math.max(1000,Math.round((Number(a.cd)||30000)*talentCooldownScale(u,a)));
 u.gcdUntil=Math.max(u.gcdUntil,ctx.time+Math.max(500,Number(a.gcd)||1000));
 const pos=constrainToArena(ctx,{x:u.position.x+offset.x,y:u.position.y+offset.y},1.5),totemId='shaman-'+type+'-'+u.id+'-'+Math.round(ctx.time),statusId=type==='spirit-link'?'spirit-link-totem':'shaman-totem-'+type;
 emit(ctx,'ABILITY_START',{source:u.id,target:u.id,ability:a.name,result:'totem',position:copy(u.position),payload:{kind:'totem',duration,cooldown:a.cd,totemType:type}});
 emit(ctx,'TOTEM_PLACED',{source:u.id,target:u.id,ability:a.name,result:'placed',position:copy(pos),payload:{totemId,totemType:type,duration,effect:copy(effect)}});
 const alive=livingPlayers(ctx);
 alive.forEach(target=>applyStatus(ctx,u,target,{id:statusId,name:a.name,kind:'buff',duration,effect}));
 if(type==='healing-stream'){
  const tick=Math.max(2,4*(u.baseStats?.outputScale||levelOutputScale(u.level))*potency);
  for(let at=4000;at<duration;at+=4000)schedule(ctx,ctx.time+at,()=>{
   if(ctx.finished||!u.alive)return;
   livingPlayers(ctx).filter(p=>hasLineOfSight(ctx,u,p)).forEach(p=>doHeal(ctx,u,p,tick,a.name))
  },'healing-stream-tick')
 }
 if(type==='spirit-link'){
  const avg=alive.reduce((n,p)=>n+healthRatio(p),0)/Math.max(1,alive.length);
  alive.filter(p=>healthRatio(p)<avg).forEach(p=>doHeal(ctx,u,p,Math.max(1,(avg-healthRatio(p))*p.maxHealth*.42),a.name));
  talentTrigger(ctx,u,'Spirit Link Totem',u,{duration,targets:alive.length})
 }
 if(mastery)talentTrigger(ctx,u,'Totemic Mastery',u,{rank:mastery,duration,totems:[a.name]});
 schedule(ctx,ctx.time+duration,()=>emit(ctx,'TOTEM_EXPIRED',{source:u.id,target:u.id,ability:a.name,result:'expired',position:copy(pos),payload:{totemId,totemType:type}}),'totem-expire');
 emit(ctx,'ABILITY_FINISH',{source:u.id,target:u.id,ability:a.name,result:'totem',position:copy(u.position),payload:{kind:'totem',duration,totemType:type}});
 return true
}

function activePets(ctx,ownerId=null){
 return (ctx.pets||[]).filter(p=>p.active&&(ownerId==null||p.ownerId===ownerId))
}
function summonPet(ctx,owner,{type='felguard',name='Felguard',duration=0,countIndex=0}={}){
 if(!owner?.alive)return null;
 const defs={
  felguard:{name:'Felguard',range:5,baseDamage:9,interval:2200,attack:'Legion Strike',visual:'felguard'},
  dreadstalker:{name:'Dreadstalker',range:5,baseDamage:6.5,interval:1800,attack:'Dreadbite',visual:'dreadstalker'},
  tyrant:{name:'Demonic Tyrant',range:28,baseDamage:11,interval:2100,attack:'Demonfire',visual:'tyrant'},
  ghoul:{name:'Ghoul',range:5,baseDamage:8.5,interval:2100,attack:'Claw',visual:'ghoul'},
  'army-ghoul':{name:'Army Ghoul',range:5,baseDamage:5.5,interval:1850,attack:'Rend',visual:'army-ghoul'},
  'apocalypse-ghoul':{name:'Apocalypse Ghoul',range:5,baseDamage:7.5,interval:1700,attack:'Grave Slash',visual:'apocalypse-ghoul'}
 },def=defs[type]||defs.felguard,seq=++ctx.petSeq;
 const pos=openPosition(ctx,{x:owner.position.x+4+(countIndex%2)*2,y:owner.position.y+3+(countIndex%2?3:-3)},1.2);
 const dread=talentRank(owner,'Dread Calling'),master=talentRank(owner,'Master Summoner');
 const bonusDuration=owner.class==='Warlock'&&duration>0?((type==='dreadstalker'?dread*1500:0)+master*750):0;
 const pet={
  id:'pet-'+String(owner.characterId||owner.id).replace(/^p-/,'')+'-'+type+'-'+seq,
  ownerId:owner.id,owner,role:'pet',class:owner.class+' Pet',spec:type,name:name||def.name,type,visualArchetype:def.visual,empoweredUntil:0,
  active:true,alive:true,position:pos,facing:0,target:null,currentCast:null,movingUntil:0,moveToken:0,
  range:def.range,baseDamage:def.baseDamage,attackName:def.attack,baseInterval:def.interval,
  nextAttack:ctx.time+450+countIndex*180,expiresAt:duration>0?ctx.time+duration+bonusDuration:0
 };
 ctx.pets.push(pet);ctx.units[pet.id]=pet;
 emit(ctx,'PET_SUMMONED',{source:owner.id,target:pet.id,ability:pet.name,result:duration<=0?'permanent':'summoned',position:copy(pet.position),payload:{petId:pet.id,ownerId:owner.id,ownerClass:owner.class,petType:type,name:pet.name,permanent:duration<=0,duration:pet.expiresAt?pet.expiresAt-ctx.time:0,visualArchetype:pet.visualArchetype,attackRange:pet.range}});
 return pet
}
function dismissPet(ctx,pet,reason='expired'){
 if(!pet?.active)return;
 pet.active=false;pet.alive=false;delete ctx.units[pet.id];
 emit(ctx,'PET_DISMISSED',{source:pet.ownerId,target:pet.id,ability:pet.name,result:reason,position:copy(pet.position),payload:{petId:pet.id,ownerId:pet.ownerId,petType:pet.type,name:pet.name}})
}
function permanentFelguard(ctx,owner){
 return activePets(ctx,owner.id).find(p=>p.type==='felguard')||null
}
function permanentGhoul(ctx,owner){
 return activePets(ctx,owner.id).find(p=>p.type==='ghoul')||null
}
function petDamage(ctx,pet,target,base,ability,{cleave=0,multiplier=1}={}){
 const owner=pet?.owner;if(!pet?.active||!owner?.alive||!target?.alive)return 0;
 const bond=talentRank(owner,'Demonic Bond'),dread=talentRank(owner,'Dread Calling'),master=talentRank(owner,'Master Summoner');
 let scale=(owner.baseStats?.outputScale||levelOutputScale(owner.level))*(1+bond*.05)*Math.max(.1,1+statusBonus(owner,'outgoingDamage'))*multiplier;
 if(pet.type==='dreadstalker')scale*=1+dread*.08;
 if(pet.type==='tyrant')scale*=1.18+master*.05;
 if(owner.class==='Death Knight'&&owner.spec==='Unholy'){
  const dark=talentRank(owner,'Dark Transformation'),pact=talentRank(owner,'Unholy Pact');
  scale*=1+dark*.04;
  if(activePets(ctx,owner.id).some(p=>p.type!=='ghoul'))scale*=1+pact*.04;
  if(Number(pet.empoweredUntil)>ctx.time)scale*=1.28+dark*.04;
  if(pet.type==='army-ghoul')scale*=.82;
  if(pet.type==='apocalypse-ghoul')scale*=1.05
 }
 const crit=ctx.rng()<(.08+talentCritBonus(owner)),amount=Math.max(1,Math.round(base*scale*(.91+ctx.rng()*.18)*(crit?1.5:1)));
 const before=target.health;target.health=clamp(target.health-amount,0,target.maxHealth);const dealt=before-target.health;
 emit(ctx,'DAMAGE_DEALT',{source:pet.id,target:target.id,ability,amount:dealt,result:crit?'critical':'hit',position:copy(target.position),payload:{targetHp:target.health,targetMax:target.maxHealth,targetHpPct:pct(target.health,target.maxHealth),damageType:'magic',kind:'damage',attackRange:pet.range,pet:true,petType:pet.type,ownerId:owner.id}});
 const st=ctx.stats.players[owner.id];if(st){st.damage+=dealt;st.abilityDamage[ability]=(st.abilityDamage[ability]||0)+dealt}
 addThreat(ctx,target,owner,dealt*.72,'pet');
 const core=talentRank(owner,'Demonic Core');
 if(core&&ctx.rng()<core*.09){
  applyStatus(ctx,owner,owner,{id:'demonic-core',name:'Demonic Core',kind:'buff',duration:5000,effect:{outgoingDamage:.04*core,haste:.025*core}});
  talentTrigger(ctx,owner,'Demonic Core',owner,{sourcePet:pet.name,duration:5000})
 }
 if(owner.class==='Death Knight'&&owner.spec==='Unholy'){
  const infected=talentRank(owner,'Infected Claws'),doom=talentRank(owner,'Sudden Doom');
  if(infected&&ctx.rng()<.10*infected&&target.alive){
   const infection=Math.max(1,Math.round(dealt*.07*infected));dealDamage(ctx,owner,target,infection,'Infected Claws',{damageType:'magic'});
   talentTrigger(ctx,owner,'Infected Claws',target,{damage:infection,sourcePet:pet.name})
  }
  if(doom&&ctx.rng()<.07*doom){
   applyStatus(ctx,owner,owner,{id:'sudden-doom',name:'Sudden Doom',kind:'buff',duration:7000,effect:{outgoingDamage:.03*doom}});
   talentTrigger(ctx,owner,'Sudden Doom',owner,{sourcePet:pet.name,duration:7000})
  }
 }
 if(target.health<=0)killUnit(ctx,target,owner,ability);
 if(cleave&&dealt>0)livingEnemies(ctx).filter(e=>e.alive&&e.id!==target.id).slice(0,cleave).forEach(e=>petDamage(ctx,pet,e,Math.max(1,base*.42),ability+' cleave',{multiplier}));
 return dealt
}
function petMoveToward(ctx,pet,target){
 const angle=Math.atan2(pet.position.y-target.position.y,pet.position.x-target.position.x),desired=pet.range>7?Math.min(22,pet.range*.72):4.2;
 const to=openPosition(ctx,{x:target.position.x+Math.cos(angle)*desired,y:target.position.y+Math.sin(angle)*desired},1.2);
 pet.target=target.id;moveTo(ctx,pet,to,300,'pet chase')
}
function petAI(ctx,pet){
 if(!pet?.active)return;
 const owner=pet.owner;
 if(!owner?.alive){dismissPet(ctx,pet,'owner-defeated');return}
 if(pet.expiresAt&&ctx.time>=pet.expiresAt){dismissPet(ctx,pet,'expired');return}
 if(ctx.time<pet.movingUntil||ctx.time<pet.nextAttack)return;
 const target=pickDamageTarget(ctx,owner);if(!target)return;
 pet.target=target.id;updateFacing(pet,target);
 if(!inRange(pet,target,pet.range)||!hasLineOfSight(ctx,pet,target)){petMoveToward(ctx,pet,target);pet.nextAttack=ctx.time+420;return}
 emit(ctx,'ABILITY_START',{source:pet.id,target:target.id,ability:pet.attackName,result:'pet',position:copy(pet.position),payload:{kind:'damage',attackRange:pet.range,pet:true,petType:pet.type,ownerId:owner.id}});
 petDamage(ctx,pet,target,pet.baseDamage,pet.attackName);
 emit(ctx,'ABILITY_FINISH',{source:pet.id,target:target.id,ability:pet.attackName,result:'pet',position:copy(pet.position),payload:{kind:'damage',pet:true,petType:pet.type,ownerId:owner.id}});
 const pack=talentRank(owner,'Pack Tactics'),dkFrenzy=(owner.class==='Death Knight'&&Number(pet.empoweredUntil)>ctx.time)?.18:0,haste=Math.max(0,statusBonus(owner,'haste'));
 pet.nextAttack=ctx.time+Math.max(750,Math.round(pet.baseInterval*Math.max(.68,1-pack*.08-dkFrenzy)/(1+haste)))
}
function tickPets(ctx){activePets(ctx).slice().forEach(p=>petAI(ctx,p))}
function resolveWarlockSummon(ctx,u,a,target){
 if(u.class!=='Warlock'||u.spec!=='Demonology')return false;
 const count=Math.max(1,Number(a.summonCount)||1),type=a.summonType||'dreadstalker';
 if(type==='tyrant'){
  activePets(ctx,u.id).forEach(p=>{if(p.type!=='tyrant')p.expiresAt=p.expiresAt?Math.max(p.expiresAt,ctx.time+8000):0});
  applyStatus(ctx,u,u,{id:'tyrant-command',name:'Demonic Tyrant',kind:'buff',duration:Number(a.duration)||15000,effect:{outgoingDamage:.06}});
  talentTrigger(ctx,u,'Demonic Tyrant',u,{duration:Number(a.duration)||15000})
 }
 for(let i=0;i<count;i++)summonPet(ctx,u,{type,duration:Number(a.duration)||12000,countIndex:i});
 return true
}
function resolveWarlockPetCommand(ctx,u,a,target){
 if(u.class!=='Warlock'||u.spec!=='Demonology')return false;
 const guard=permanentFelguard(ctx,u);
 if(a.petCommand==='implosion'){
  const expend=activePets(ctx,u.id).filter(p=>p.type==='dreadstalker');
  if(!expend.length)return false;
  let total=0;expend.forEach(p=>{total+=petDamage(ctx,p,target,12,'Implosion',{cleave:Number(a.cleave)||2,multiplier:1.05});dismissPet(ctx,p,'imploded')});
  emit(ctx,'PET_COMMAND',{source:u.id,target:target.id,ability:a.name,amount:total,result:'resolved',position:copy(target.position),payload:{petCommand:'implosion',demons:expend.length}});
  return true
 }
 if(!guard?.active)return false;
 if(!inRange(guard,target,Number(a.range)||30))petMoveToward(ctx,guard,target);
 const command=a.petCommand||a.id;
 emit(ctx,'PET_COMMAND',{source:u.id,target:target.id,ability:a.name,result:'commanded',position:copy(guard.position),payload:{petId:guard.id,petCommand:command}});
 if(command==='soul-strike')petDamage(ctx,guard,target,26,a.name,{multiplier:1.08});
 else if(command==='felstorm')petDamage(ctx,guard,target,19,a.name,{cleave:Number(a.cleave)||3,multiplier:1.04});
 guard.nextAttack=Math.max(guard.nextAttack,ctx.time+650);
 return true
}
function warlockSpecialReady(ctx,u,a,target){
 if(!a||!cooldownReady(u,a)||(a.cost||0)>u.resource.value)return false;
 if(a.kind==='summon'){
  if(a.summonType==='tyrant'){
   const bossLike=['boss','final','world-boss','event'].includes(ctx.encounter.kind);
   if(!bossLike&&ctx.tactics.cooldownUse!=='free')return false
  }
  if(a.summonType==='dreadstalker'&&activePets(ctx,u.id).filter(p=>p.type==='dreadstalker').length>=2)return false;
  return true
 }
 if(a.kind==='pet-command'){
  if(a.petCommand==='implosion')return activePets(ctx,u.id).some(p=>p.type==='dreadstalker')&&(livingEnemies(ctx).length>=2||activePets(ctx,u.id).some(p=>p.type==='dreadstalker'&&p.expiresAt-ctx.time<3500));
  return Boolean(permanentFelguard(ctx,u))
 }
 return false
}
function resolveDeathKnightSummon(ctx,u,a,target){
 if(u.class!=='Death Knight'||u.spec!=='Unholy')return false;
 const type=a.summonType||'army-ghoul';
 let count=Math.max(1,Number(a.summonCount)||1);
 if(type==='apocalypse-ghoul'){
  const wounds=Math.max(0,Number(target?.dkWounds?.[u.id])||0);
  if(wounds<=0)return false;
  const burstCount=Math.min(4,wounds),burst=Math.max(1,Math.round((10+talentRank(u,'Festering Wounds')*2)*(u.baseStats?.outputScale||1)));
  for(let i=0;i<burstCount;i++)if(target.alive)dealDamage(ctx,u,target,burst,'Apocalypse Wound',{damageType:'magic'});
  target.dkWounds[u.id]=Math.max(0,wounds-burstCount);
  count=Math.max(2,Math.min(4,burstCount));
  emit(ctx,'FESTERING_WOUND_CHANGED',{source:u.id,target:target.id,ability:'Apocalypse',amount:burstCount,result:'burst',position:copy(target.position),payload:{stacks:target.dkWounds[u.id]}});
  talentTrigger(ctx,u,'Apocalypse',target,{wounds:burstCount,summons:count})
 }
 for(let i=0;i<count;i++)summonPet(ctx,u,{type,duration:Number(a.duration)||12000,countIndex:i});
 return true
}
function resolveDeathKnightPetCommand(ctx,u,a,target){
 if(u.class!=='Death Knight'||u.spec!=='Unholy')return false;
 const ghoul=permanentGhoul(ctx,u);if(!ghoul?.active)return false;
 const command=a.petCommand||a.id;
 if(command==='dark-transformation'){
  const rank=Math.max(1,talentRank(u,'Dark Transformation')),duration=12000+rank*1000;
  ghoul.empoweredUntil=ctx.time+duration;
  applyStatus(ctx,u,u,{id:'dark-transformation',name:'Dark Transformation',kind:'buff',duration,effect:{outgoingDamage:.02*rank}});
  emit(ctx,'PET_COMMAND',{source:u.id,target:ghoul.id,ability:a.name,result:'empowered',position:copy(ghoul.position),payload:{petId:ghoul.id,petCommand:command,duration}});
  talentTrigger(ctx,u,'Dark Transformation',ghoul,{duration});
  return true
 }
 return false
}
function deathKnightSpecialReady(ctx,u,a,target){
 if(!a||!cooldownReady(u,a)||(a.cost||0)>u.resource.value)return false;
 if(a.kind==='pet-command')return Boolean(permanentGhoul(ctx,u));
 if(a.kind==='summon'){
  const bossLike=['boss','final','world-boss','event'].includes(ctx.encounter.kind);
  if(a.summonType==='army-ghoul'&&!bossLike&&ctx.tactics.cooldownUse!=='free')return false;
  if(a.summonType==='army-ghoul'&&activePets(ctx,u.id).filter(p=>p.type==='army-ghoul').length)return false;
  if(a.summonType==='apocalypse-ghoul'&&Math.max(0,Number(target?.dkWounds?.[u.id])||0)<=0)return false;
  return true
 }
 return false
}

function useDefensiveSkill(ctx,u,a){
 if(!a||a.kind!=='defensive'||!cooldownReady(u,a))return false;
 let duration=Math.max(1000,Number(a.duration)||8000),reduction=clamp(Number(a.damageReduction)||.20,0,.70);
 if(u.class==='Paladin'&&a.id==='ardent-defender'&&talentRank(u,'Ardent Defender')){duration+=2000;reduction=Math.min(.70,reduction+.10)}
 if(u.class==='Monk'&&u.spec==='Brewmaster'&&a.id==='celestial-brew'){
  const rank=talentRank(u,'Celestial Brew'),high=Number(u.staggerPool||0)/Math.max(1,u.maxHealth)>.12;
  reduction=Math.min(.60,reduction+rank*.045+(high?.05:0))
 }
 u.cooldowns[a.id]=Math.max(1000,Math.round((Number(a.cd)||60000)*talentCooldownScale(u,a)));u.gcdUntil=Math.max(u.gcdUntil,ctx.time+300);
 emit(ctx,'ABILITY_START',{source:u.id,target:u.id,ability:a.name,result:'defensive',position:copy(u.position),payload:{kind:'defensive',duration}});
 if(Number(a.selfHealPct)>0){
  const before=u.health;u.health=clamp(u.health+Math.round(u.maxHealth*Number(a.selfHealPct)),0,u.maxHealth);
  emit(ctx,'HEAL_RECEIVED',{source:u.id,target:u.id,ability:a.name,amount:u.health-before,result:'self-heal',position:copy(u.position),payload:{targetHp:u.health,targetMax:u.maxHealth,targetHpPct:pct(u.health,u.maxHealth),overhealing:0}})
 }
 if(u.class==='Monk'&&u.spec==='Brewmaster'&&Number(a.purifyStagger)>0){
  const before=Math.max(0,Number(u.staggerPool)||0),ratio=Math.min(.90,Number(a.purifyStagger)+talentRank(u,'Purifying Brew')*.12),removed=Math.round(before*ratio);
  u.staggerPool=Math.max(0,before-removed);
  emit(ctx,'STAGGER_PURIFIED',{source:u.id,target:u.id,ability:a.name,amount:removed,result:'purified',position:copy(u.position),payload:{pool:Math.round(u.staggerPool),poolPct:pct(u.staggerPool,u.maxHealth),ratio}});
  if(removed>0)talentTrigger(ctx,u,'Purifying Brew',u,{removed,pool:Math.round(u.staggerPool)})
 }
 applyStatus(ctx,u,u,{id:a.id,name:a.name,kind:'buff',duration,effect:{incomingDamageReduction:reduction}});
 if(u.class==='Death Knight'&&u.spec==='Blood'){
  if(a.id==='vampiric-blood')applyStatus(ctx,u,u,{id:'vampiric-blood-healing',name:'Vampiric Blood',kind:'buff',duration,effect:{incomingHealing:.25}});
  if(a.id==='dancing-rune-weapon')applyStatus(ctx,u,u,{id:'dancing-rune-weapon-threat',name:'Dancing Rune Weapon',kind:'buff',duration,effect:{threatBonus:.30,outgoingDamage:.06}})
 }
 if(u.class==='Warrior'&&u.spec==='Protection'&&talentRank(u,'Bulwark')){
  livingPlayers(ctx).filter(p=>p.id!==u.id).forEach(p=>applyStatus(ctx,u,p,{id:'bulwark-party',name:'Bulwark',kind:'buff',duration:6000,effect:{incomingDamageReduction:.10}}));talentTrigger(ctx,u,'Bulwark',u,{targets:Math.max(0,livingPlayers(ctx).length-1),duration:6000})
 }
 if(u.class==='Paladin'&&u.spec==='Protection'&&talentRank(u,'Divine Guardian')){
  livingPlayers(ctx).filter(p=>p.id!==u.id).forEach(p=>applyStatus(ctx,u,p,{id:'divine-guardian-party',name:'Divine Guardian',kind:'buff',duration:6000,effect:{incomingDamageReduction:.12}}));talentTrigger(ctx,u,'Divine Guardian',u,{targets:Math.max(0,livingPlayers(ctx).length-1),duration:6000})
 }
 emit(ctx,'ABILITY_FINISH',{source:u.id,target:u.id,ability:a.name,result:'defensive',position:copy(u.position),payload:{kind:'defensive',duration}});
 return true
}

function playerAI(ctx,u){
 if(!u.alive||u.currentCast||ctx.time<u.movingUntil||ctx.time<u.nextDecision||ctx.time<u.gcdUntil)return;
 if(Number(u.mechanicHoldUntil)>ctx.time)return;
 u.nextDecision=ctx.time+160;
 const buff=classBuffFor(u);if(buff&&activateClassBuff(ctx,u,buff))return;
 if(useTalentUtility(ctx,u))return;
 const equippedTotems=u.abilities.filter(a=>a.kind==='totem'&&cooldownReady(u,a));
 for(const totem of equippedTotems)if(useShamanTotem(ctx,u,totem))return;
 if(u.class==='Monk'&&u.spec==='Brewmaster'){
  const purify=u.abilities.find(a=>a.id==='purifying-brew'&&cooldownReady(u,a));
  if(purify&&Number(u.staggerPool||0)/Math.max(1,u.maxHealth)>.07&&useDefensiveSkill(ctx,u,purify))return
 }
 const defensiveThreshold=ctx.tactics.defensiveUsage==='aggressive'?.62:ctx.tactics.defensiveUsage==='conservative'?.38:.50;
 const defensive=u.abilities.find(a=>a.kind==='defensive'&&cooldownReady(u,a));
 if(defensive&&healthRatio(u)<defensiveThreshold){
  if(shouldMistake(ctx,u,'defensive',7000))u.nextDecision=Math.max(u.nextDecision,ctx.time+650+Math.round(ctx.rng()*450));
  else if(useDefensiveSkill(ctx,u,defensive))return
 }
 const target=pickDamageTarget(ctx,u);
 if(!target)return;
 if(u.class==='Warlock'&&u.spec==='Demonology'){
  const priority=a=>a.summonType==='tyrant'?5:a.petCommand==='implosion'?4:a.summonType==='dreadstalker'?3:a.petCommand==='felstorm'?2:a.petCommand==='soul-strike'?1:0;
  const specials=u.abilities.filter(a=>(a.kind==='summon'||a.kind==='pet-command')&&warlockSpecialReady(ctx,u,a,target)).sort((a,b)=>priority(b)-priority(a));
  if(specials.length&&startAbility(ctx,u,specials[0],target))return
 }
 if(u.class==='Death Knight'&&u.spec==='Unholy'){
  const priority=a=>a.summonType==='apocalypse-ghoul'?4:a.summonType==='army-ghoul'?3:a.petCommand==='dark-transformation'?2:0;
  const specials=u.abilities.filter(a=>(a.kind==='summon'||a.kind==='pet-command')&&deathKnightSpecialReady(ctx,u,a,target)).sort((a,b)=>priority(b)-priority(a));
  if(specials.length&&startAbility(ctx,u,specials[0],target))return
 }
 if(u.class==='Death Knight'&&u.spec==='Blood'){
  const bone=u.statuses?.['bone-shield'],marrow=u.abilities.find(a=>a.id==='marrowrend'&&cooldownReady(u,a));
  if(marrow&&(!bone||Number(bone.expiresAt)-ctx.time<1800)&&startAbility(ctx,u,marrow,target))return;
  const recent=(u.recentDamageTaken||[]).filter(x=>Number(x.at)>=ctx.time-5000).reduce((n,x)=>n+(Number(x.amount)||0),0);
  const deathStrike=u.abilities.find(a=>a.id==='death-strike'&&cooldownReady(u,a)&&(a.cost||0)<=u.resource.value);
  if(deathStrike&&(healthRatio(u)<.82||recent>u.maxHealth*.12)&&startAbility(ctx,u,deathStrike,target))return
 }
 if(u.role==='tank'){
  const loose=tankNeedsTaunt(ctx,u);
  if(loose){
   const taunt=u.abilities.find(a=>a.kind==='taunt'&&cooldownReady(u,a));
   if(taunt&&inRange(u,loose,taunt.range||30)&&hasLineOfSight(ctx,u,loose)){
    if(!u.pendingTaunt||u.pendingTaunt.target!==loose.id){
     let reaction=executionReaction(ctx,u,'tank');
     if(shouldMistake(ctx,u,'tank',5500)){
      reaction+=Math.round(300+ctx.rng()*650);
      recordMistake(ctx,u,'tank','was late reacting to lost threat',{target:loose.id,ability:taunt.name,reactionMs:reaction});
     }
     u.pendingTaunt={target:loose.id,readyAt:ctx.time+reaction}
    }
    if(ctx.time>=u.pendingTaunt.readyAt){u.pendingTaunt=null;executeTaunt(ctx,u,loose,taunt);return}
   }
  }else u.pendingTaunt=null;

 }
 const pick=chooseAbility(ctx,u,target);
 if(pick)startAbility(ctx,u,pick.ability,pick.target);
}
function enemyBasicAttack(ctx,e){
 if(!e.alive||ctx.time<e.movingUntil||isCrowdControlled(e))return;
 if(e.passive){e.nextAttack=ctx.time+1000;return}
 const live=livingPlayers(ctx);if(!live.length)return;
 const randomTarget=e.targeting==='random',target=randomTarget?live[Math.floor(ctx.rng()*live.length)]:(topThreatTarget(ctx,e)||live[0]);if(!target)return;
 setAggro(ctx,e,target,randomTarget?'random targeting':'threat');
 const range=Math.max(2,Number(e.attackRange)||5);
 const crowded=e.kind!=='boss'&&range<=7&&ctx.enemies.some(other=>other!==e&&other.alive&&other.target===target.id&&dist(other.position,e.position)<2.4);
 const separated=range<=7?nearestMeleePoint(target,e,ctx):null;
 if(!inRange(e,target,range)||!hasLineOfSight(ctx,e,target)||(crowded&&dist(e.position,separated)>1)){
  const destination=range>7?visibleCastPoint(ctx,e,target,range,e.position):separated;
  moveTo(ctx,e,destination,320,!hasLineOfSight(ctx,e,target)?'line of sight':range>7?'ranged position':'chase target');
  e.nextAttack=ctx.time+450;return;
 }
 updateFacing(e,target);
 const base=e.classification==='world-boss'?46:e.kind==='boss'?36:e.classification==='elite'?18:e.isAdd?12:14,roll=.88+ctx.rng()*.24;
 const ability=e.attackName||(e.classification==='world-boss'?'Crushing Blow':e.kind==='boss'?'Heavy Swing':e.classification==='elite'?'Heavy Strike':'Attack');
 if(e.allAttacksAoe&&e.kind==='boss'){
  emit(ctx,'ABILITY_START',{source:e.id,target:target.id,ability:'Wild Wrath',result:'enemy-aoe',payload:{aoe:true}});
  livingPlayers(ctx).forEach(p=>dealDamage(ctx,e,p,base*.62*enemyPressure(ctx,e,p)*roll,'Wild Wrath',{damageType:'magic',avoidable:false,aoe:true,aggroHit:true}));
 }else{
  const levelPressure=enemyPressure(ctx,e,target);
  emit(ctx,'ABILITY_START',{source:e.id,target:target.id,ability,result:randomTarget?'enemy-random':'enemy',payload:{randomTargeting:randomTarget,attackRange:range,classification:e.classification,visualArchetype:e.visualArchetype,damageType:e.damageType}});
  dealDamage(ctx,e,target,base*levelPressure*roll,ability,{damageType:e.damageType||'physical',aggroHit:!randomTarget});
 }
 const cadence=e.classification==='world-boss'?1325:e.kind==='boss'?1450:e.classification==='elite'?1850:e.isAdd?1800:2050;
 e.nextAttack=ctx.time+cadence+Math.round(ctx.rng()*(e.kind==='boss'?220:320));
}
function mechanicStat(ctx,type,failed){
 const m=ctx.stats.mechanics;m.byType[type]=m.byType[type]||{avoided:0,failed:0};
 if(failed){m.failed++;m.byType[type].failed++}else{m.avoided++;m.byType[type].avoided++}
}
function planMovement(ctx,u,type,anchor){
 if(!u.alive)return;
 let to=copy(u.position);
 if(type==='cone'){
  if(u.role==='tank')to={x:58,y:50};
  else to={x:34,y:20+(ctx.players.indexOf(u)%4)*18};
 }else if(type==='circle'||type==='circles'){
  const i=ctx.players.indexOf(u);to={x:18+(i%3)*18,y:18+Math.floor(i/3)*58};
 }else if(type==='line'){
  to={x:u.position.x,y:u.position.y+(u.position.y<50?-14:14)};
 }
 moveTo(ctx,u,to,320,'mechanic response');
}
function mechanicResponse(ctx,u,type,duration,enemy){
 const baseReaction=executionReaction(ctx,u,'movement');
 const error=shouldMistake(ctx,u,'movement',2200);
 const hesitation=error?Math.round(260+ctx.rng()*520):0;
 const reaction=baseReaction+hesitation;
 const success=reaction+320<=Math.max(520,duration-40);
 if(error){
  recordMistake(ctx,u,'movement',reaction>duration?'reacted too late':'hesitated on the mechanic',{target:enemy?.id||null,ability:ctx.activeEnemyCast?.name||null,reactionMs:reaction});
 }else if(!success){
  recordMistake(ctx,u,'movement','reaction was too slow for the mechanic',{target:enemy?.id||null,ability:ctx.activeEnemyCast?.name||null,reactionMs:reaction});
 }
 // Even failed players try to move. If they are late, the impact can land while they are still escaping.
 schedule(ctx,ctx.time+reaction,()=>{if(u.alive)planMovement(ctx,u,type,enemy)},'mechanic-reaction');
 return{success,reactionMs:reaction}
}
function tryInterrupt(ctx,e,mechanic,castToken){
 const policy=ctx.tactics.interruptPriority;
 const candidates=livingPlayers(ctx).map(u=>({u,a:u.abilities.find(a=>a.kind==='interrupt'&&cooldownReady(u,a))}))
  .filter(x=>x.a&&inRange(x.u,e,x.a.range||10)&&hasLineOfSight(ctx,x.u,e));
 ctx.stats.interrupts.attempts++;
 if(!candidates.length){ctx.stats.interrupts.missedCritical++;return}
 const assignment=ctx.tactics?.interruptAssignment||'best';
 if(assignment==='tank'){
   candidates.sort((a,b)=>(a.u.role==='tank'?-1:0)-(b.u.role==='tank'?-1:0)||executionQuality(ctx,b.u)-executionQuality(ctx,a.u))
 }else if(assignment==='dps-rotation'){
   const dps=candidates.filter(x=>x.u.role==='dps');
   if(dps.length){
     dps.sort((a,b)=>String(a.u.id).localeCompare(String(b.u.id)));
     const pick=dps[(ctx.interruptCursor||0)%dps.length];ctx.interruptCursor=(ctx.interruptCursor||0)+1;
     candidates.splice(0,candidates.length,pick,...candidates.filter(x=>x!==pick))
   }else candidates.sort((a,b)=>executionQuality(ctx,b.u)-executionQuality(ctx,a.u))
 }else candidates.sort((a,b)=>executionQuality(ctx,b.u)-executionQuality(ctx,a.u)||(a.a.cd||0)-(b.a.cd||0));
 const chosen=candidates[0],u=chosen.u,a=chosen.a;
 const danger=mechanic?.priority==='critical'||mechanic?.danger==='high'||/heal|fatal|wipe|obliterate|cataclysm|surge/i.test(String(mechanic?.name||''));
 const should=policy==='high'||policy==='standard'||(policy==='low'&&(ctx.encounter.kind==='final'||danger))||(policy==='danger-only'&&danger);
 if(!should){ctx.stats.interrupts.missedCritical++;return}
 let reaction=executionReaction(ctx,u,'interrupt')+(policy==='high'?-120:policy==='low'?180:0);
 const error=shouldMistake(ctx,u,'interrupt',5000);
 if(error){
  reaction+=Math.round(350+ctx.rng()*750);
  recordMistake(ctx,u,'interrupt','late interrupt reaction',{target:e.id,ability:mechanic.name,reactionMs:reaction});
 }
 const when=ctx.time+Math.max(180,reaction);
 schedule(ctx,when,()=>{
  const cast=ctx.activeEnemyCast;
  const st=ctx.stats.players[u.id];st.interruptAttempts++;
  if(!cast||cast.token!==castToken||cast.interrupted){st.duplicateInterrupts++;ctx.stats.interrupts.duplicates++;emit(ctx,'INTERRUPT',{source:u.id,target:e.id,ability:a.name,result:'duplicate',payload:{interruptedAbility:mechanic.name,token:castToken}});return}
  if(!u.alive||!inRange(u,e,a.range||10)||!hasLineOfSight(ctx,u,e)||!cooldownReady(u,a)||ctx.time>=cast.ends){
   ctx.stats.interrupts.missedCritical++;emit(ctx,'INTERRUPT',{source:u.id,target:e.id,ability:a.name,result:'failed',payload:{interruptedAbility:mechanic.name,token:castToken}});return
  }
  u.cooldowns[a.id]=Math.round((a.cd||15000)*talentCooldownScale(u,a));cast.interrupted=true;ctx.activeEnemyCast=null;e.interruptedUntil=ctx.time+2600;st.interrupts++;ctx.stats.interrupts.success++;
  const petSource=u.class==='Warlock'&&a.id==='axe-toss'?permanentFelguard(ctx,u):null;
  if(petSource)emit(ctx,'PET_COMMAND',{source:u.id,target:e.id,ability:a.name,result:'commanded',position:copy(petSource.position),payload:{petId:petSource.id,petCommand:'axe-toss'}});
  emit(ctx,'INTERRUPT',{source:petSource?.id||u.id,target:e.id,ability:a.name,result:'success',payload:{interruptedAbility:mechanic.name,token:castToken,ownerId:u.id,pet:!!petSource}});
  if(u.class==='Paladin'&&talentRank(u,'Hammer of Justice')&&!['boss','world-boss'].includes(e.classification)){applyStatus(ctx,u,e,{id:'hammer-of-justice',name:'Hammer of Justice',kind:'debuff',duration:900,cc:'stun'});talentTrigger(ctx,u,'Hammer of Justice',e,{duration:900})}
  if(hasUnique(u,'frostbound-sigil')){
   u.defensiveUntil=Math.max(Number(u.defensiveUntil)||0,3500);
   applyStatus(ctx,u,u,{id:'frostbound-sigil-shield',name:'Frozen Response',kind:'buff',duration:3500,effect:{damageReduction:.25}});
   triggerUnique(ctx,u,'frostbound-sigil','Frozen Response',{target:u.id,duration:3500,trigger:'interrupt'})
  }
 },'interrupt');
 // Pressure and execution quality can make a second player burn their interrupt a fraction later.
 const backup=candidates[1];
 if(backup&&ctx.rng()<mistakeChance(ctx,backup.u,'interrupt')*.55){
  const delay=Math.max(220,reaction+120+Math.round(ctx.rng()*220));
  recordMistake(ctx,backup.u,'interrupt','committed to the same interrupt',{target:e.id,ability:mechanic.name,reactionMs:delay});
  schedule(ctx,ctx.time+delay,()=>{
   const bu=backup.u,ba=backup.a,cast=ctx.activeEnemyCast,st=ctx.stats.players[bu.id];st.interruptAttempts++;
   if(!bu.alive||!cooldownReady(bu,ba))return;
   bu.cooldowns[ba.id]=ba.cd||15000;
   if(!cast||cast.token!==castToken||cast.interrupted){
    st.duplicateInterrupts++;ctx.stats.interrupts.duplicates++;
    emit(ctx,'INTERRUPT',{source:bu.id,target:e.id,ability:ba.name,result:'duplicate',payload:{interruptedAbility:mechanic.name,token:castToken}})
   }
  },'duplicate-interrupt')
 }
}
function spawnAdds(ctx,e,mechanic={}){
 const base=ctx.enemies.length,group=String(mechanic.addGroup||mechanic.addName||'adds');
 const maxActiveRaw=Number(mechanic.maxActive),maxActive=Number.isFinite(maxActiveRaw)?Math.max(1,Math.min(12,Math.round(maxActiveRaw))):Infinity;
 const active=livingEnemies(ctx).filter(x=>x.isAdd&&String(x.addGroup||x.name||'adds')===group).length;
 const requested=Number(mechanic.addCount),wanted=Number.isFinite(requested)?Math.max(1,Math.min(5,Math.round(requested))):2+Math.max(0,Math.min(2,Number(ctx.encounter.scaling?.addCountBonus)||0));
 const count=Math.max(0,Math.min(wanted,maxActive-active)),addName=String(mechanic.addName||'Cave Spawn');
 for(let i=0;i<count;i++){
  const id='add-'+ctx.addSeq++,level=Math.max(1,Number(e.level)||Number(ctx.encounter.level)||1),rule=enemyClassRule('add'),healthScale=Math.max(.25,Number(mechanic.healthScale)||1),maxHealth=Math.round(72*levelHealthScale(level)*rule.health*scalingValue(ctx,'enemyHealth',1)*healthScale),add={id,name:addName,role:'enemy',kind:'enemy',classification:'add',classificationLabel:rule.label,level,maxHealth,health:maxHealth,alive:true,position:{x:Number(mechanic.x)||74,y:Number(mechanic.y)||(i?66:34)},facing:180,target:null,threat:{},forcedTarget:null,forcedUntil:0,cooldowns:{},statuses:{},nextAttack:ctx.time+600+i*150,currentCast:null,isAdd:true,priority:Number.isFinite(Number(mechanic.priority))?Number(mechanic.priority):3,damageScale:rule.damage*scalingValue(ctx,'enemyDamage',1)*Math.max(.25,Number(mechanic.damageScale)||1),visualArchetype:mechanic.visualArchetype||null,targeting:String(mechanic.targeting||'threat').toLowerCase(),attackRange:Math.max(2,Number(mechanic.attackRange)||5),attackName:mechanic.attackName||null,damageType:mechanic.damageType||'physical',allAttacksAoe:Boolean(mechanic.allAttacksAoe),passive:Boolean(mechanic.passive),addGroup:group};
  add.movingUntil=0;add.moveToken=0;ctx.enemies.push(add);ctx.units[id]=add;ctx.players.forEach(p=>add.threat[p.id]=0);
  const random=livingPlayers(ctx)[Math.floor(ctx.rng()*livingPlayers(ctx).length)];if(random)add.threat[random.id]=120;
  setAggro(ctx,add,topThreatTarget(ctx,add),'spawn');
  emit(ctx,'ADD_SPAWNED',{source:e.id,target:add.id,ability:mechanic.spawnAbility||'Summon',result:'spawned',position:copy(add.position),payload:{name:add.name,maxHealth:add.maxHealth,target:add.target,level:add.level,classification:add.classification,classificationLabel:add.classificationLabel,visualArchetype:add.visualArchetype,attackRange:add.attackRange,damageType:add.damageType,addGroup:group}});
  if(ctx.tactics?.crowdControl==='priority-elites'){
    const controller=livingPlayers(ctx).filter(p=>p.role==='dps').sort((a,b)=>executionQuality(ctx,b)-executionQuality(ctx,a))[0];
    if(controller&&i===0){applyStatus(ctx,controller,add,{id:'tactical-control-add-'+id,name:'Tactical Crowd Control',kind:'debuff',duration:1800,cc:'stun'});emit(ctx,'CROWD_CONTROL',{source:controller.id,target:add.id,ability:'Tactical Crowd Control',result:'applied',payload:{duration:1800,policy:'priority-elites'}})}
  }
 }
 if(!count&&Number.isFinite(maxActive)){
   const activeAdds=livingEnemies(ctx).filter(x=>x.isAdd&&String(x.addGroup||x.name||'adds')===group),overclock=Math.max(1,Number(mechanic.overclockOnCap)||1);
   if(overclock>1&&activeAdds.length){
     activeAdds.forEach(add=>{add.damageScale=Math.min(6,(Number(add.damageScale)||1)*overclock);add.nextAttack=Math.min(Number(add.nextAttack)||ctx.time+800,ctx.time+350)});
     emit(ctx,'ADD_OVERCLOCKED',{source:e.id,ability:mechanic.overclockAbility||'Overclock',result:'empower',payload:{addGroup:group,targets:activeAdds.map(x=>x.id),damageScale:overclock}})
   }else emit(ctx,'ADD_SPAWN_SKIPPED',{source:e.id,ability:mechanic.spawnAbility||'Summon',result:'max-active',payload:{addGroup:group,maxActive,active}});
 }
}
function mechanicStatusDefinition(m){
 const raw=m?.status;
 return raw&&typeof raw==='object'?raw:null
}
function applyMechanicStatus(ctx,enemy,m,target){
 const raw=mechanicStatusDefinition(m);if(!raw||!target?.alive)return null;
 const name=raw.name||m?.name||'Enemy Effect',id=raw.id||String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 return applyStatus(ctx,enemy,target,{...copy(raw),id,name,kind:raw.kind==='buff'?'buff':'debuff'})
}
function spawnPersistentHazard(ctx,e,m,cast){
 const center=copy(cast?.hazardPosition||e.position),radius=Math.max(4,Number(m.radius)||11),persistMs=Math.max(1800,Number(m.persistMs)||10000),tickMs=Math.max(500,Number(m.tickMs)||1000),damage=Math.max(1,Number(m.tickDamage)||7),hazardId='hazard-'+cast.token;
 emit(ctx,'GROUND_HAZARD_SPAWNED',{source:e.id,ability:m.name,result:'active',position:center,payload:{hazardId,radius,duration:persistMs,tickMs,damage}});
 const endAt=ctx.time+persistMs;
 const tick=()=>{
   if(ctx.finished||!e.alive)return;
   if(ctx.time>=endAt){emit(ctx,'GROUND_HAZARD_EXPIRED',{source:e.id,ability:m.name,result:'expired',position:center,payload:{hazardId}});return}
   const hit=[];
   livingPlayers(ctx).forEach(p=>{if(dist(p.position,center)<=radius){hit.push(p.id);dealDamage(ctx,e,p,damage*enemyPressure(ctx,e,p),m.name,{damageType:m.damageType||'physical',avoidable:true})}});
   emit(ctx,'GROUND_HAZARD_TICK',{source:e.id,ability:m.name,result:hit.length?'damage':'clear',position:center,payload:{hazardId,radius,targets:hit}});
   schedule(ctx,ctx.time+tickMs,tick,'persistent-ground-tick')
 };
 schedule(ctx,ctx.time+tickMs,tick,'persistent-ground-start')
}
function resolveMechanic(ctx,e,m,token){
 const cast=ctx.activeEnemyCast;
 if(m.type==='self-heal'){
  if(!cast||cast.token!==token||cast.interrupted){scheduleNextMechanic(ctx);return}
  ctx.activeEnemyCast=null;
  const before=e.health,healPct=Math.max(.01,Math.min(.35,Number(m.healPct)||.08));
  e.health=Math.min(e.maxHealth,e.health+Math.max(1,Math.round(e.maxHealth*healPct)));
  const amount=Math.max(0,e.health-before);
  emit(ctx,'CAST_FINISH',{source:e.id,target:e.id,ability:m.name,result:'completed'});
  if(amount)emit(ctx,'HEAL_RECEIVED',{source:e.id,target:e.id,ability:m.name,amount,result:'enemy-heal',payload:{enemyHeal:true,targetHp:e.health,targetMaxHealth:e.maxHealth,targetHpPct:pct(e.health,e.maxHealth),overhealing:0}});
  ctx.stats.interrupts.missedCritical++;mechanicStat(ctx,'self-heal',true);scheduleNextMechanic(ctx);return;
 }
 if(m.type==='interrupt'){
  if(!cast||cast.token!==token||cast.interrupted){scheduleNextMechanic(ctx);return}
  ctx.activeEnemyCast=null;
  emit(ctx,'CAST_FINISH',{source:e.id,ability:m.name,result:'completed'});
  livingPlayers(ctx).forEach(p=>{dealDamage(ctx,e,p,24*enemyPressure(ctx,e,p),m.name,{damageType:'magic',avoidable:false});applyMechanicStatus(ctx,e,m,p)});
  ctx.stats.interrupts.missedCritical++;
  mechanicStat(ctx,'interrupt',true);scheduleNextMechanic(ctx);return;
 }
 if(!cast||cast.token!==token){scheduleNextMechanic(ctx);return}
 ctx.activeEnemyCast=null;
 emit(ctx,'MECHANIC_RESOLVE',{source:e.id,ability:m.name,result:'resolve',payload:{mechanicType:m.type,token}});
 if(m.type==='interaction'){
  emit(ctx,'INTERACTION_REQUIRED',{
   source:e.id,target:cast.targetId||null,ability:m.name,result:'required',
   payload:{mechanicType:'interaction',token,interaction:m.interaction||m.interactionKey||m.name,durationMs:Math.max(1000,Number(m.interactionDurationMs)||4500)}
  });
  mechanicStat(ctx,'interaction',false);scheduleNextMechanic(ctx);return
 }
 if(m.type==='adds'){spawnAdds(ctx,e,m);mechanicStat(ctx,'adds',false);scheduleNextMechanic(ctx);return}
 if(m.type==='persistent-circle'){
  const target=getUnit(ctx,cast.targetId),success=target?cast.responses?.[target.id]!==false:true;
  if(target&&!success)dealDamage(ctx,e,target,18*enemyPressure(ctx,e,target),m.name,{damageType:m.damageType||'physical',avoidable:true});
  spawnPersistentHazard(ctx,e,m,cast);mechanicStat(ctx,'persistent-circle',target?!success:false);scheduleNextMechanic(ctx);return
 }
 if(m.type==='healer-swipe'){
  const target=getUnit(ctx,cast.targetId);let failed=false;
  if(target?.alive){
   const success=cast.responses?.[target.id]!==false;
   if(!success){failed=true;dealDamage(ctx,e,target,46*enemyPressure(ctx,e,target),m.name,{damageType:'physical',avoidable:true});applyMechanicStatus(ctx,e,m,target)}
   livingPlayers(ctx).filter(p=>p.id!==target.id&&dist(p.position,target.position)<=10).forEach(p=>{failed=true;dealDamage(ctx,e,p,32*enemyPressure(ctx,e,p),m.name,{damageType:'physical',avoidable:true})})
  }
  setAggro(ctx,e,topThreatTarget(ctx,e),'return to threat');mechanicStat(ctx,'healer-swipe',failed);scheduleNextMechanic(ctx);return
 }
 if(m.type==='target-circle'){
  const target=getUnit(ctx,cast.targetId);let failed=false;
  if(target?.alive){
   const success=cast.responses?.[target.id]!==false;
   if(!success){failed=true;dealDamage(ctx,e,target,40*enemyPressure(ctx,e,target),m.name,{damageType:m.damageType||'magic',avoidable:true});applyMechanicStatus(ctx,e,m,target)}
   livingPlayers(ctx).filter(p=>p.id!==target.id&&dist(p.position,target.position)<=Math.max(6,Number(m.radius)||10)).forEach(p=>{failed=true;dealDamage(ctx,e,p,34*enemyPressure(ctx,e,p),m.name,{damageType:m.damageType||'magic',avoidable:true})})
  }
  mechanicStat(ctx,'target-circle',failed);scheduleNextMechanic(ctx);return
 }
 if(m.type==='patrol'){
  mechanicStat(ctx,'patrol',false);scheduleNextMechanic(ctx);return
 }
 if(m.type==='tank-mark'){
  const target=getUnit(ctx,cast.targetId),base=Math.max(.05,Number(m.damageTakenPerStack)||.15),duration=Math.max(5000,Number(m.markDuration)||22000);
  if(target?.alive){
   const current=target.statuses?.['mark-of-the-manor'],stacks=Math.max(1,Math.min(12,(Number(current?.stacks)||0)+1));
   applyStatus(ctx,e,target,{id:'mark-of-the-manor',name:m.statusName||'Mark of the Manor',kind:'debuff',duration,stacks:1,effect:{incomingDamageTaken:base*stacks}});
   const actual=target.statuses?.['mark-of-the-manor'];if(actual){actual.stacks=stacks;actual.effect={incomingDamageTaken:base*stacks}}
   emit(ctx,'TANK_MARK',{source:e.id,target:target.id,ability:m.name,result:'applied',payload:{stacks,damageTaken:base*stacks,swapAt:Math.max(2,Number(m.swapAt)||3)}});
   const threshold=Math.max(2,Number(m.swapAt)||3),other=livingPlayers(ctx).filter(p=>p.role==='tank'&&p.id!==target.id)[0];
   if(stacks>=threshold&&other){
     const top=Math.max(0,...Object.values(e.threat||{}).map(Number));e.threat[other.id]=Math.max(Number(e.threat[other.id])||0,top+220);e.forcedTarget=other.id;e.forcedUntil=ctx.time+3800;setAggro(ctx,e,other,'tank swap');
     emit(ctx,'TANK_SWAP',{source:other.id,target:e.id,ability:'Tank Swap',result:'success',payload:{from:target.id,to:other.id,markStacks:stacks}})
   }
  }
  mechanicStat(ctx,'tank-mark',false);scheduleNextMechanic(ctx);return
 }
 if(m.type==='cone'){
  const tank=livingPlayers(ctx).find(p=>p.role==='tank');if(tank){e.target=tank.id;updateFacing(e,tank)}
  let failed=false;
  livingPlayers(ctx).forEach(p=>{
   if(p.role==='tank'){dealDamage(ctx,e,p,38*enemyPressure(ctx,e,p),m.name,{damageType:'physical',avoidable:false});applyMechanicStatus(ctx,e,m,p);return}
   const success=cast.responses?.[p.id]!==false;
   if(!success){failed=true;dealDamage(ctx,e,p,28*enemyPressure(ctx,e,p),m.name,{damageType:'physical',avoidable:true});applyMechanicStatus(ctx,e,m,p)}
  });
  mechanicStat(ctx,'cone',failed);scheduleNextMechanic(ctx);return;
 }
 if(m.type==='circle'||m.type==='circles'){
  let failed=false;
  livingPlayers(ctx).forEach(p=>{
   const success=cast.responses?.[p.id]!==false;
   if(!success){failed=true;dealDamage(ctx,e,p,(m.type==='circles'?24:28)*enemyPressure(ctx,e,p),m.name,{damageType:'magic',avoidable:true});applyMechanicStatus(ctx,e,m,p)}
  });
  mechanicStat(ctx,m.type,failed);scheduleNextMechanic(ctx);return;
 }
 if(m.type==='line'){
  const target=getUnit(ctx,cast.targetId);
  if(target?.alive){
   const success=cast.responses?.[target.id]!==false;
   if(!success){dealDamage(ctx,e,target,32*enemyPressure(ctx,e,target),m.name,{damageType:'physical',avoidable:true});applyMechanicStatus(ctx,e,m,target)}
   mechanicStat(ctx,'line',!success);
  }else mechanicStat(ctx,'line',false);
  scheduleNextMechanic(ctx);return;
 }
 if(m.type==='role-circles'){
  e.movingUntil=0;e.nextAttack=Math.max(Number(e.nextAttack)||0,ctx.time+650);
  let failed=false;const zones=cast.zones||{};
  livingPlayers(ctx).slice().forEach(p=>{
   const zone=zones[p.role]||zones.dps,radius=Math.max(3,Number(zone?.radius)||10),inside=zone&&dist(p.position,{x:Number(zone.x)||50,y:Number(zone.y)||50})<=radius;
   p.mechanicHoldUntil=0;p.mechanicHoldPosition=null;
   if(!inside){failed=true;applyMechanicStatus(ctx,e,m,p);dealDamage(ctx,e,p,p.maxHealth*50,m.name,{damageType:'magic',avoidable:true})}
   else emit(ctx,'MECHANIC_SAFE',{source:e.id,target:p.id,ability:m.name,result:'protected',position:copy(p.position),payload:{role:p.role,zone:copy(zone)}})
  });
  emit(ctx,'ROLE_SHOCKWAVE',{source:e.id,ability:m.name,result:failed?'casualties':'survived',position:copy(e.position),payload:{zones:copy(zones)}});
  mechanicStat(ctx,'role-circles',failed);scheduleNextMechanic(ctx);return;
 }
 mechanicStat(ctx,m.type||'unknown',false);scheduleNextMechanic(ctx);
}
function startMechanic(ctx,m){
 const enemy=livingEnemies(ctx).find(x=>x.kind==='boss')||livingEnemies(ctx).find(x=>!isCrowdControlled(x))||livingEnemies(ctx)[0];if(!enemy)return;
 const token='m'+(++ctx.mechanicSeq),duration=Math.max(520,Math.round((Number(m.duration)||1600)*scalingValue(ctx,'castSpeed',1)));
 const castState={token,enemy:enemy.id,name:m.name,type:m.type,interrupted:false,ends:ctx.time+duration,responses:{},reactionMs:{},targetId:null,targetIds:[]};
 const live=livingPlayers(ctx);
 ctx.activeEnemyCast=castState;

 if(m.type==='cone'){
  const tank=live.find(p=>p.role==='tank')||live[0];castState.targetId=tank?.id||null;castState.targetIds=tank?[tank.id]:[];
  let badFacing=false;
  if(tank&&shouldMistake(ctx,tank,'tank',6000)){
   badFacing=true;recordMistake(ctx,tank,'tank','turned the frontal through the group',{target:enemy.id,ability:m.name});
  }
  live.forEach(p=>{
   if(p.role==='tank'){castState.responses[p.id]=true;castState.reactionMs[p.id]=0;return}
   const plan=mechanicResponse(ctx,p,'cone',duration,enemy);castState.responses[p.id]=plan.success&&!badFacing;castState.reactionMs[p.id]=plan.reactionMs
  });
 }else if(m.type==='circle'){
  castState.targetId=enemy.id;castState.targetIds=[enemy.id];
  live.forEach(p=>{const plan=mechanicResponse(ctx,p,'circle',duration,enemy);castState.responses[p.id]=plan.success;castState.reactionMs[p.id]=plan.reactionMs});
 }else if(m.type==='circles'){
  castState.targetIds=live.map(p=>p.id);
  live.forEach(p=>{const plan=mechanicResponse(ctx,p,'circles',duration,enemy);castState.responses[p.id]=plan.success;castState.reactionMs[p.id]=plan.reactionMs});
 }else if(m.type==='line'){
  const candidates=live.filter(p=>p.role!=='tank'),target=candidates[Math.floor(ctx.rng()*Math.max(1,candidates.length))]||live[0];
  castState.targetId=target?.id||null;castState.targetIds=target?[target.id]:[];
  if(target){const plan=mechanicResponse(ctx,target,'line',duration,enemy);castState.responses[target.id]=plan.success;castState.reactionMs[target.id]=plan.reactionMs}
 }else if(m.type==='persistent-circle'){
  const preferredRoles=Array.isArray(m.targetRoles)?m.targetRoles.map(String):[],rolePool=preferredRoles.length?live.filter(p=>preferredRoles.includes(p.role)):live,rangedPool=m.preferRanged?rolePool.filter(p=>p.role==='healer'||!isMeleeCombatant(p)):rolePool,pool=rangedPool.length?rangedPool:(rolePool.length?rolePool:live);
  const target=pool[Math.floor(ctx.rng()*Math.max(1,pool.length))]||live[0];castState.targetId=target?.id||null;castState.targetIds=target?[target.id]:[];castState.hazardPosition=copy(target?.position||enemy.position);
  if(target){const plan=mechanicResponse(ctx,target,'circle',duration,enemy);castState.responses[target.id]=plan.success;castState.reactionMs[target.id]=plan.reactionMs}
 }else if(m.type==='healer-swipe'){
  const healers=live.filter(p=>p.role==='healer'),target=healers[Math.floor(ctx.rng()*Math.max(1,healers.length))]||live.find(p=>p.role!=='tank')||live[0];
  castState.targetId=target?.id||null;castState.targetIds=target?[target.id]:[];
  if(target){const plan=mechanicResponse(ctx,target,'line',duration,enemy);castState.responses[target.id]=plan.success;castState.reactionMs[target.id]=plan.reactionMs;setAggro(ctx,enemy,target,'healer swipe');moveTo(ctx,enemy,nearestMeleePoint(target,enemy),Math.max(260,duration*.45),'healer swipe')}
 }else if(m.type==='target-circle'){
  const candidates=live.filter(p=>p.role!=='tank'),target=(candidates.length?candidates:live)[Math.floor(ctx.rng()*Math.max(1,(candidates.length?candidates:live).length))]||live[0];
  castState.targetId=target?.id||null;castState.targetIds=target?[target.id]:[];
  if(target){const plan=mechanicResponse(ctx,target,'circle',duration,enemy);castState.responses[target.id]=plan.success;castState.reactionMs[target.id]=plan.reactionMs}
 }else if(m.type==='tank-mark'){
  const target=topThreatTarget(ctx,enemy)||live.find(p=>p.role==='tank')||live[0];castState.targetId=target?.id||null;castState.targetIds=target?[target.id]:[];
 }else if(m.type==='patrol'){
  const points=Array.isArray(m.points)&&m.points.length?m.points:[{x:62,y:30},{x:72,y:50},{x:62,y:70},{x:78,y:38}];
  const point=points[Math.floor(ctx.rng()*points.length)]||points[0];
  castState.patrolTo={x:Number(point.x)||70,y:Number(point.y)||50};enemy.movingUntil=0;moveTo(ctx,enemy,castState.patrolTo,Math.max(800,duration),m.name||'Patrol')
 }else if(m.type==='role-circles'){
  const defaults={tank:{x:34,y:29,radius:10,color:'red',label:'TANK'},dps:{x:62,y:50,radius:13,color:'yellow',label:'DAMAGE'},healer:{x:34,y:71,radius:10,color:'blue',label:'HEALER'}};
  castState.zones={...defaults,...copy(m.zones||{})};castState.targetIds=live.map(p=>p.id);
  enemy.movingUntil=Math.max(Number(enemy.movingUntil)||0,ctx.time+duration);enemy.nextAttack=Math.max(Number(enemy.nextAttack)||0,ctx.time+duration+650);
  live.forEach(p=>{
   const correct=castState.zones[p.role]||castState.zones.dps,baseReaction=executionReaction(ctx,p,'movement'),error=shouldMistake(ctx,p,'movement',2600);
   const hesitation=error?Math.round(350+ctx.rng()*850):0,reaction=baseReaction+hesitation,travel=520;
   let destination=correct;
   if(error&&m.strict){
    const wrong=Object.entries(castState.zones).filter(([key,z])=>key!==p.role&&z&&Number.isFinite(Number(z.x))&&Number.isFinite(Number(z.y)));
    if(wrong.length)destination=wrong[Math.floor(ctx.rng()*wrong.length)][1]
   }
   castState.reactionMs[p.id]=reaction;castState.responses[p.id]=destination===correct&&reaction+travel<=Math.max(800,duration-80);
   if(error)recordMistake(ctx,p,'movement',m.strict&&destination!==correct?'committed to the wrong role circuit':'hesitated during the role circuit',{target:enemy.id,ability:m.name,reactionMs:reaction});
   schedule(ctx,ctx.time+reaction,()=>{
    if(!p.alive)return;
    p.mechanicHoldUntil=ctx.time+Math.max(0,duration-reaction);
    p.mechanicHoldPosition={x:destination.x,y:destination.y};
    moveTo(ctx,p,{x:destination.x,y:destination.y},travel,m.strict&&destination!==correct?'wrong role circuit':'role circuit')
   },'role-circle-reaction')
  })
 }

 emit(ctx,'MECHANIC_TELEGRAPH',{source:enemy.id,target:castState.targetId,ability:m.name,result:'telegraph',position:copy(enemy.position),payload:{mechanicType:m.type,duration,hazardPosition:copy(castState.hazardPosition||null),token,interruptible:m.type==='interrupt'||m.type==='self-heal',targetId:castState.targetId,targetIds:copy(castState.targetIds),responses:copy(castState.responses),reactionMs:copy(castState.reactionMs),zones:copy(castState.zones||null)}});
 emit(ctx,'CAST_START',{source:enemy.id,target:castState.targetId,ability:m.name,result:'enemy',payload:{duration,interruptible:m.type==='interrupt'||m.type==='self-heal',mechanicType:m.type,hazardPosition:copy(castState.hazardPosition||null),token,targetId:castState.targetId,targetIds:copy(castState.targetIds)}});
 if(m.type==='interrupt'||m.type==='self-heal')tryInterrupt(ctx,enemy,m,token);
 else if(m.type==='cone'){
  const tank=getUnit(ctx,castState.targetId);
  if(tank){enemy.target=tank.id;updateFacing(enemy,tank)}
 }
 schedule(ctx,ctx.time+duration,()=>resolveMechanic(ctx,enemy,m,token),'mechanic-resolve');
}

function checkBossPhases(ctx){
 const boss=livingEnemies(ctx).find(e=>e.kind==='boss');if(!boss)return;
 const hp=pct(boss.health,boss.maxHealth),phases=Array.isArray(ctx.encounter.phases)?ctx.encounter.phases:[];
 ctx.phaseTriggered=ctx.phaseTriggered||{};
 phases.forEach((phase,index)=>{
  const key=phase.id||('phase-'+index),at=Number(phase.atPct);
  if(ctx.phaseTriggered[key]||!Number.isFinite(at)||hp>at)return;
  ctx.phaseTriggered[key]=true;
  if(Number(phase.damageScale)>1)boss.phaseDamageScale=Math.max(Number(boss.phaseDamageScale)||1,Number(phase.damageScale));
  if(phase.allAttacksAoe)boss.allAttacksAoe=true;
  if(phase.arenaBounds&&typeof phase.arenaBounds==='object')ctx.environment.bounds={...arenaBounds(ctx),...copy(phase.arenaBounds)};
  if(phase.arena&&typeof phase.arena==='object')ctx.environment.arena=copy(phase.arena);
  if((phase.arenaBounds&&typeof phase.arenaBounds==='object')||(phase.arena&&typeof phase.arena==='object'))enforceArenaBounds(ctx,'arena contraction');
  if(Array.isArray(phase.addMechanics)&&phase.addMechanics.length){
   phase.addMechanics.forEach(m=>ctx.encounter.mechanics.push(Array.isArray(m)?{name:m[0],type:m[1],duration:m[2]}:{...m}));
  }
  emit(ctx,'PHASE_CHANGE',{source:boss.id,target:boss.id,ability:phase.name||('Phase '+(index+2)),result:'phase',position:copy(boss.position),payload:{phaseId:key,atPct:at,healthPct:hp,damageScale:boss.phaseDamageScale,allAttacksAoe:!!boss.allAttacksAoe,arenaBounds:copy(ctx.environment.bounds||{}),arena:copy(ctx.environment.arena||null)}});
  const wipeAfter=Math.max(0,Number(phase.wipeAfterMs)||0);
  if(wipeAfter){
    const ability=phase.wipeAbility||'Final Collapse';
    emit(ctx,'CAST_START',{source:boss.id,target:boss.id,ability,result:'enemy',payload:{duration:wipeAfter,interruptible:false,mechanicType:'raid-wipe',phaseId:key}});
    schedule(ctx,ctx.time+wipeAfter,()=>{
      if(!boss.alive||ctx.finished)return;
      emit(ctx,'CAST_FINISH',{source:boss.id,target:boss.id,ability,result:'completed',payload:{mechanicType:'raid-wipe',phaseId:key}});
      livingPlayers(ctx).slice().forEach(p=>dealDamage(ctx,boss,p,p.maxHealth*50,ability,{damageType:'magic',avoidable:false}))
    },'phase-raid-wipe')
  }
  if(phase.spawnAdds)spawnAdds(ctx,boss);
  if(phase.triggerMechanic)schedule(ctx,ctx.time+180,()=>startMechanic(ctx,copy(phase.triggerMechanic)),'phase-trigger-mechanic');
 });
 const softPct=Number(ctx.encounter.softEnragePct);
 if(!ctx.softEnraged&&Number.isFinite(softPct)&&hp<=softPct){
  ctx.softEnraged=true;boss.phaseDamageScale=Math.max(Number(boss.phaseDamageScale)||1,Number(ctx.encounter.softEnrageDamage)||1.22);
  applyStatus(ctx,boss,boss,{id:'soft-enrage',name:'Soft Enrage',kind:'buff',duration:0,effect:{damageMultiplier:Math.max(0,boss.phaseDamageScale-1)}});
  emit(ctx,'ENRAGE',{source:boss.id,target:boss.id,ability:'Soft Enrage',result:'soft',payload:{healthPct:hp,damageScale:boss.phaseDamageScale}})
 }
 const hardAt=Number(ctx.encounter.hardEnrageMs);
 if(!ctx.hardEnraged&&Number.isFinite(hardAt)&&hardAt>0&&(ctx.elapsedOffsetMs+ctx.time)>=hardAt){
  ctx.hardEnraged=true;boss.hardEnraged=true;
  applyStatus(ctx,boss,boss,{id:'hard-enrage',name:'Hard Enrage',kind:'buff',duration:0,effect:{damageMultiplier:2.5}});
  emit(ctx,'ENRAGE',{source:boss.id,target:boss.id,ability:'Hard Enrage',result:'hard',payload:{timeMs:ctx.elapsedOffsetMs+ctx.time,damageScale:3.5}})
 }
}

function scheduleNextMechanic(ctx){
 if(ctx.finished)return;
 const list=ctx.encounter.mechanics||[];if(!list.length)return;
 const baseDelay=Number(ctx.encounter.mechanicIntervalMs)||(ctx.encounter.kind==='final'?3600:ctx.encounter.kind==='boss'?4200:ctx.encounter.kind==='world-boss'?2500:5000);
 const delay=Math.max(900,Math.round(baseDelay*scalingValue(ctx,'mechanicFrequency',1)));
 const m=list[ctx.mechanicIndex++%list.length];
 schedule(ctx,ctx.time+delay,()=>startMechanic(ctx,m),'mechanic-start');
}
function normaliseMechanics(encounter){
 return (encounter.mechanics||[]).map(x=>Array.isArray(x)?{name:x[0],type:x[1],duration:x[2]}:{
  ...copy(x),name:x.name||'Mechanic',type:x.type||'circle',duration:x.duration||x.cast||1600,priority:x.priority||null,danger:x.danger||null,healPct:x.healPct==null?null:Number(x.healPct)
 });
}
function buildSummary(ctx,outcome){
 const duration=Math.max(1,ctx.time/1000);
 const players=Object.values(ctx.stats.players).map(s=>({
  ...copy(s),dps:Math.round(s.damage/duration),hps:Math.round(s.healing/duration)
 }));
 return{
  outcome,durationMs:Math.round(ctx.time),durationSeconds:Math.round(duration*10)/10,
  deaths:ctx.stats.deaths,totalDamage:players.reduce((n,p)=>n+p.damage,0),
  totalHealing:players.reduce((n,p)=>n+p.healing,0),interrupts:copy(ctx.stats.interrupts),
  mechanics:copy(ctx.stats.mechanics),mistakes:copy(ctx.stats.mistakes),battleResurrections:ctx.stats.battleResurrections,phases:copy(ctx.phaseTriggered||{}),softEnraged:!!ctx.softEnraged,hardEnraged:!!ctx.hardEnraged,players
 };
}
function simulate(options={}){
 const encounter=copy(options.encounter||{});
 encounter.mechanics=normaliseMechanics(encounter);
 const seed=options.seed||[encounter.id||'encounter',Date.now(),(options.party||[]).map(x=>x.id).join('-')].join(':');
 const players=(options.party||[]).map(normalisePlayer),enemies=normaliseEnemies(encounter),units={};
 [...players,...enemies].forEach(u=>units[u.id]=u);enemies.forEach(e=>players.forEach(p=>e.threat[p.id]=0));
 const tactics={
  interruptPriority:options.tactics?.interruptPriority||options.tactics?.interrupts||'standard',
  addPriority:options.tactics?.addPriority||options.tactics?.adds||'balanced',
  defensiveUsage:options.tactics?.defensiveUsage||options.tactics?.defensives||'standard',
  pullStyle:options.tactics?.pullStyle||options.tactics?.aggression||'normal',
  movementDiscipline:options.tactics?.movementDiscipline||'balanced',
  cooldownUse:options.tactics?.cooldownUse||'difficult',
  interruptAssignment:options.tactics?.interruptAssignment||'best',
  crowdControl:options.tactics?.crowdControl||'disabled'
 };
 const environment=copy(encounter.environment||{blockers:[]});
 const ctx={time:0,elapsedOffsetMs:Math.max(0,Number(options.elapsedOffsetMs)||0),rng:rngFrom(seed),seed,encounter,environment,tactics,players,enemies,units,pets:[],petSeq:0,events:[],queue:[],stats:makeStats(players),mechanicIndex:Math.max(0,Number(options.mechanicIndex)||0),mechanicSeq:0,addSeq:0,mistakeSeq:0,pendingResurrections:0,pendingHazards:0,interruptCursor:Math.max(0,Number(options.interruptCursor)||0),ccApplied:false,phaseTriggered:copy(options.initialPhaseTriggered||{}),softEnraged:!!options.initialSoftEnraged,hardEnraged:!!options.initialHardEnraged,elapsedOffset:Math.max(0,Number(options.initialElapsedMs)||0),activeEnemyCast:null,finished:false,onEvent:options.onEvent||null};
 players.forEach((u,i)=>{if(players.length>5&&!options.party[i]?._combatPosition)u.position.y=20+i*60/Math.max(1,players.length-1);u.position=openPosition(ctx,u.position,1.35)});
 enemies.forEach(u=>{u.position=openPosition(ctx,u.position,1.35)});
 emit(ctx,'COMBAT_START',{result:'started',payload:{encounter:encounter.id||encounter.title||'Encounter',seed,tactics,scaling:copy(encounter.scaling||{}),affixes:copy(encounter.affixes||[]),units:[...players,...enemies].map(u=>({id:u.id,position:copy(u.position),facing:u.facing,alive:u.alive,role:u.role,classification:u.classification,visualArchetype:u.visualArchetype,attackRange:u.attackRange,damageType:u.damageType})),partyLevels:players.map(p=>({id:p.id,level:p.level})),enemies:enemies.map(e=>({id:e.id,name:e.name,level:e.level,classification:e.classification,classificationLabel:e.classificationLabel}))}});
 players.forEach(u=>{
  Object.values(u.statuses||{}).forEach(st=>{
   if(Number(st.expiresAt)>0){
    emit(ctx,st.kind==='debuff'?'DEBUFF_APPLIED':'BUFF_APPLIED',{source:st.source||u.id,target:u.id,ability:st.name,result:'carried',statusEffects:[copy(st)]});
    schedule(ctx,Number(st.expiresAt),()=>removeStatus(ctx,u,st.id,'expired'),'carried-status-expire')
   }
  });
  emitResourceState(ctx,u,'initial')
 });
 players.filter(u=>u.class==='Warlock'&&u.spec==='Demonology'&&u.alive).forEach(u=>summonPet(ctx,u,{type:'felguard',name:'Felguard'}));
 players.filter(u=>u.class==='Death Knight'&&u.spec==='Unholy'&&u.alive).forEach(u=>summonPet(ctx,u,{type:'ghoul',name:'Ghoul'}));
 {
  const boss=enemies.find(e=>e.kind==='boss');
  if(boss){
   const phases=Array.isArray(encounter.phases)?encounter.phases:[];
   phases.forEach((phase,index)=>{
    const key=phase.id||('phase-'+index);
    if(ctx.phaseTriggered[key]){
     if(Number(phase.damageScale)>1)boss.phaseDamageScale=Math.max(Number(boss.phaseDamageScale)||1,Number(phase.damageScale));
     if(phase.arenaBounds&&typeof phase.arenaBounds==='object')ctx.environment.bounds={...arenaBounds(ctx),...copy(phase.arenaBounds)};
     if(phase.arena&&typeof phase.arena==='object')ctx.environment.arena=copy(phase.arena)
    }
   });
   enforceArenaBounds(ctx,'arena boundary');
   if(ctx.softEnraged)boss.phaseDamageScale=Math.max(Number(boss.phaseDamageScale)||1,Number(encounter.softEnrageDamage)||1.22);
   if(ctx.hardEnraged)boss.hardEnraged=true
  }
 }
 const tank=players.find(p=>p.role==='tank')||players[0];
 if(tank)enemies.forEach(e=>{e.threat[tank.id]=ctx.tactics.pullStyle==='safe'?250:ctx.tactics.pullStyle==='aggressive'?125:180;setAggro(ctx,e,tank,'pull')});
 maybeApplyCrowdControl(ctx);
 scheduleNextMechanic(ctx);scheduleUnstableGround(ctx);

 const requestedMax=Number(options.maxDurationMs),sliceMode=Number.isFinite(requestedMax)&&requestedMax>0&&requestedMax<MAX_COMBAT_MS,maxDuration=sliceMode?Math.max(TICK,Math.round(requestedMax)):MAX_COMBAT_MS;
 let outcome='defeat';
 while(ctx.time<=maxDuration){
  processQueue(ctx);
  const resolvePct=Math.max(0,Math.min(.95,Number(ctx.encounter.resolveAtBossHealthPct)||0));
  if(resolvePct>0){
   const boss=ctx.enemies.find(e=>e.kind==='boss'&&e.alive),remainingRivals=ctx.enemies.filter(e=>e.alive&&!e.isAdd&&e!==boss);
   if(boss&&healthRatio(boss)<=resolvePct&&!remainingRivals.length){
    emit(ctx,'ENCOUNTER_RESOLVED',{source:boss.id,ability:ctx.encounter.resolveLabel||'Encounter Resolution',result:'escaped',position:copy(boss.position),payload:{bossHealthPct:pct(boss.health,boss.maxHealth),thresholdPct:Math.round(resolvePct*100)}});
    outcome='victory';break
   }
  }
  if(!livingEnemies(ctx).length&&ctx.pendingResurrections<=0&&ctx.pendingHazards<=0){outcome='victory';break}
  if(!livingPlayers(ctx).length){outcome='defeat';break}
  checkBossPhases(ctx);tickCooldowns(ctx);passiveResources(ctx);tickMonkStagger(ctx);tickPets(ctx);
  players.forEach(u=>playerAI(ctx,u));
  enemies.forEach(e=>{if(e.alive&&ctx.time>=e.nextAttack)enemyBasicAttack(ctx,e)});
  ctx.time+=TICK;
 }
 if(ctx.time>maxDuration){
  if(sliceMode&&livingPlayers(ctx).length&&livingEnemies(ctx).length)outcome='ongoing';
  else if(!sliceMode)emit(ctx,'ENRAGE',{result:'timeout'});
 }
 activePets(ctx).slice().forEach(p=>dismissPet(ctx,p,'combat-end'));
 ctx.finished=true;ctx.queue.length=0;
 players.filter(u=>u.alive).forEach(u=>emitResourceState(ctx,u,'final'));
 emit(ctx,'COMBAT_END',{result:outcome,payload:{durationMs:ctx.time}});
 ctx.stats.endedAt=ctx.time;
 const summary=buildSummary(ctx,outcome);
 return{
  version:VERSION,seed,outcome,durationMs:ctx.time,events:ctx.events,summary,
  finalState:{players:copy(players),enemies:copy(enemies)},
  continuation:{phaseTriggered:copy(ctx.phaseTriggered||{}),softEnraged:!!ctx.softEnraged,hardEnraged:!!ctx.hardEnraged,mechanicIndex:ctx.mechanicIndex,interruptCursor:ctx.interruptCursor,elapsedMs:ctx.elapsedOffsetMs+ctx.time},
  replay:{version:VERSION,seed,encounter:copy(encounter),events:copy(ctx.events),summary:copy(summary)}
 };
}

function replay(replayData,onEvent,opts={}){
 const data=replayData?.events?replayData:null;if(!data)return Promise.reject(new Error('Invalid replay data'));
 const speed=Math.max(.25,Number(opts.speed)||1),events=data.events;
 return new Promise(async resolve=>{
  let last=0;
  for(const e of events){
   const wait=Math.max(0,(e.timestamp-last)/speed);
   if(wait)await new Promise(r=>setTimeout(r,wait));
   onEvent?.(copy(e));last=e.timestamp;
  }
  resolve(copy(data.summary||{}));
 });
}
function debugSnapshot(result){
 if(!result)return null;
 return{
  version:result.version,seed:result.seed,outcome:result.outcome,durationMs:result.durationMs,
  finalPlayers:(result.finalState?.players||[]).map(p=>({id:p.id,name:p.name,target:p.target,hp:p.health,resource:p.resource,cooldowns:p.cooldowns,uniqueEffects:p.uniqueEffects,uniqueUsed:p.uniqueUsed,position:p.position,statuses:p.statuses,currentCast:p.currentCast})),
  finalEnemies:(result.finalState?.enemies||[]).map(e=>({id:e.id,name:e.name,target:e.target,hp:e.health,threat:e.threat,position:e.position,statuses:e.statuses,currentCast:e.currentCast})),
  events:result.events?.length||0,summary:copy(result.summary||{})
 };
}
function mockParty(){
 return[
  {id:'tank',name:'Tank',class:'Warrior',spec:'Protection',power:8,level:10},
  {id:'heal',name:'Healer',class:'Priest',spec:'Holy',power:8,level:10},
  {id:'d1',name:'Mage',class:'Mage',spec:'Arcane',power:8,level:10},
  {id:'d2',name:'Hunter',class:'Hunter',spec:'Marksman',power:8,level:10},
  {id:'d3',name:'Rogue',class:'Rogue',spec:'Assassination',power:8,level:10}
 ];
}
function runSelfTests(){
 const base={id:'test',title:'Test Enemy',kind:'boss',enemies:['Test Boss'],enemyHealth:420,mechanics:[]},party=mockParty();
 const tests=[];
 const test=(name,fn)=>{try{tests.push({name,pass:!!fn()})}catch(error){tests.push({name,pass:false,error:String(error?.message||error)})}};
 let r=simulate({party,encounter:{...base,mechanics:[['Critical Cast','interrupt',2200]]},tactics:{interruptPriority:'high'},seed:'interrupt'});
 test('Interrupt',()=>r.events.some(e=>e.type==='INTERRUPT'&&e.result==='success'));
 r=simulate({party,encounter:base,seed:'aggro'});
 test('Tank Aggro',()=>!r.events.some(e=>e.type==='AGGRO_CHANGED'&&e.target==='p-d1'&&e.timestamp>5000));
 r=simulate({party,encounter:{...base,mechanics:[['Frontal','cone',1400]]},seed:'cone'});
 test('Frontal Cone',()=>r.events.some(e=>e.type==='MECHANIC_TELEGRAPH'&&e.payload.mechanicType==='cone'));
 r=simulate({party,encounter:{...base,mechanics:[['Adds','adds',900]]},seed:'adds'});
 test('Adds',()=>r.events.some(e=>e.type==='ADD_SPAWNED')&&r.events.some(e=>e.type==='ADD_DEFEATED'));
 r=simulate({party,encounter:{...base,enemyHealth:5000,mechanicIntervalMs:900,mechanics:[{name:'Screech',type:'interaction',duration:600,interaction:'manor-screech',interactionDurationMs:4500}]},seed:'interaction-event',maxDurationMs:2600});
 test('Raid Interaction Event',()=>r.events.some(e=>e.type==='INTERACTION_REQUIRED'&&e.ability==='Screech'&&e.payload?.interaction==='manor-screech'&&Number(e.payload?.durationMs)===4500));
 r=simulate({party,encounter:{...base,mechanics:[['Ground AoE','circle',1500]]},tactics:{movementDiscipline:'safety'},seed:'ground'});
 test('Ground AoE',()=>r.events.some(e=>e.type==='MOVEMENT_START'&&e.result==='mechanic response'));
 const weak=mockParty().map(x=>({...x,power:1,level:1}));
 r=simulate({party:[{id:'solo',name:'Solo Mage',class:'Mage',spec:'Arcane',power:1,level:1}],encounter:{...base,kind:'final',enemyHealth:5000,mechanics:[['Pulse','circle',700]]},seed:'death'});
 test('Player Death',()=>{const death=r.events.find(e=>e.type==='PLAYER_DEFEATED');if(!death)return false;return !r.events.some(e=>e.type==='ABILITY_START'&&e.source===death.target&&e.timestamp>death.timestamp)});
 r=simulate({party,encounter:{...base,kind:'final',enemyHealth:1600},seed:'healer'});
 test('Healer Logic',()=>r.events.some(e=>e.type==='HEAL_RECEIVED'&&e.source==='p-heal'));
 const shamanParty=[
  {id:'st',name:'Tank',class:'Warrior',spec:'Protection',power:10,level:10,_combatHealthPct:50},
  {id:'sh',name:'Shaman',class:'Shaman',spec:'Restoration',power:10,level:10,_combatHealthPct:50,skillLoadouts:{Restoration:['chain-heal','windfury-totem','stoneskin-totem','healing-stream-totem']}},
  {id:'s1',name:'Mage',class:'Mage',spec:'Arcane',power:10,level:10,_combatHealthPct:50},
  {id:'s2',name:'Hunter',class:'Hunter',spec:'Marksman',power:10,level:10,_combatHealthPct:50},
  {id:'s3',name:'Rogue',class:'Rogue',spec:'Assassination',power:10,level:10,_combatHealthPct:50}
 ];
 r=simulate({party:shamanParty,encounter:{...base,enemyHealth:5000},seed:'shaman-kit',maxDurationMs:6500});
 test('Shaman Totem Skills',()=>['Windfury Totem','Stoneskin Totem','Healing Stream Totem'].every(name=>r.events.some(e=>e.type==='TOTEM_PLACED'&&e.ability===name))&&!r.events.some(e=>e.type==='TOTEM_PLACED'&&e.ability==='Spirit Link Totem'));
 test('Shaman Chain Heal',()=>r.events.some(e=>e.type==='HEAL_RECEIVED'&&e.ability==='Chain Heal'&&Number(e.payload?.chainBounce)>0&&e.payload?.visualSource));
 const warlockBase=[
  {id:'wt',name:'Tank',class:'Warrior',spec:'Protection',power:10,level:15},
  {id:'wh',name:'Healer',class:'Priest',spec:'Holy',power:10,level:15},
  {id:'wl',name:'Warlock',class:'Warlock',spec:'Demonology',power:10,level:15,skillLoadouts:{Demonology:['shadow-bolt','demonbolt','hand-of-guldan','axe-toss']},talents:{Demonology:{}}},
  {id:'wm',name:'Mage',class:'Mage',spec:'Arcane',power:10,level:15},
  {id:'wr',name:'Rogue',class:'Rogue',spec:'Assassination',power:10,level:15}
 ];
 const warlockRun=simulate({party:warlockBase,encounter:{...base,level:15,enemyHealth:5500},seed:'warlock-felguard',maxDurationMs:9000});
 test('Demonology Permanent Felguard',()=>{
  const summon=warlockRun.events.find(e=>e.type==='PET_SUMMONED'&&e.source==='p-wl'&&e.payload?.petType==='felguard'&&e.result==='permanent');
  const hit=warlockRun.events.find(e=>e.type==='DAMAGE_DEALT'&&e.payload?.ownerId==='p-wl'&&e.payload?.pet===true);
  const meter=warlockRun.summary.players.find(p=>p.id==='p-wl');
  return Boolean(summon&&hit&&Number(meter?.damage)>0)
 });
 const demonTalents={'Demonic Bond':3,'Fel Knowledge':3,'Soul Strike':1,'Dread Calling':2,'Pack Tactics':2,'Felstorm':1,'Demonic Core':2,'Master Summoner':2,'Demonic Tyrant':1};
 const petWarlock=warlockBase.map(x=>x.id==='wl'?{...x,skillLoadouts:{Demonology:['call-dreadstalkers','soul-strike','felstorm','summon-demonic-tyrant']},talents:{Demonology:demonTalents}}:x);
 const petRun=simulate({party:petWarlock,encounter:{...base,kind:'boss',level:15,enemyHealth:9000},tactics:{cooldownUse:'free'},seed:'warlock-pet-build',maxDurationMs:14000});
 test('Demonology Pure Pet Loadout',()=>{
  const lock=petRun.finalState.players.find(p=>p.id==='p-wl'),ids=(lock?.abilities||[]).map(a=>a.id);
  return ids.length===4&&!ids.includes('basic-attack')&&petRun.events.some(e=>e.type==='PET_SUMMONED'&&e.payload?.petType==='dreadstalker')&&petRun.events.some(e=>e.type==='PET_COMMAND'&&e.source==='p-wl')
 });
 const lockedWarlock=warlockBase.map(x=>x.id==='wl'?{...x,skillLoadouts:{Demonology:['soul-strike','felstorm','summon-demonic-tyrant','call-dreadstalkers']},talents:{Demonology:{}}}:x);
 const lockedRun=simulate({party:lockedWarlock,encounter:{...base,level:15,enemyHealth:5000},tactics:{cooldownUse:'free'},seed:'warlock-locks',maxDurationMs:5000});
 test('Demonology Talent Skill Gates',()=>{
  const ids=(lockedRun.finalState.players.find(p=>p.id==='p-wl')?.abilities||[]).map(a=>a.id);
  return ids.includes('call-dreadstalkers')&&!ids.includes('soul-strike')&&!ids.includes('felstorm')&&!ids.includes('summon-demonic-tyrant')
 });
 const brewTalents={'High Tolerance':3,'Elusive Brawler':3,'Purifying Brew':2,'Keg Mastery':2,'Gift of the Ox':2,'Breath of Fire':1,'Celestial Brew':2,'Shuffle':2,'Fortifying Brew':1};
 const brewParty=[
  {id:'mb',name:'Brewmaster',class:'Monk',spec:'Brewmaster',power:14,level:15,skillLoadouts:{Brewmaster:['keg-smash','brewmaster-blackout-kick','provoke','purifying-brew']},talents:{Brewmaster:brewTalents}},
  {id:'mbh',name:'Healer',class:'Priest',spec:'Holy',power:14,level:15},
  {id:'mb1',name:'Mage',class:'Mage',spec:'Arcane',power:14,level:15},
  {id:'mb2',name:'Hunter',class:'Hunter',spec:'Marksman',power:14,level:15},
  {id:'mb3',name:'Rogue',class:'Rogue',spec:'Assassination',power:14,level:15}
 ];
 const brewRun=simulate({party:brewParty,encounter:{...base,kind:'boss',level:15,enemyHealth:7000},tactics:{cooldownUse:'free'},seed:'monk-brewmaster',maxDurationMs:16000});
 test('Brewmaster Stagger',()=>{
  const monk=brewRun.finalState.players.find(p=>p.id==='p-mb');
  return monk?.role==='tank'&&brewRun.events.some(e=>e.type==='STAGGER_CHANGED'&&e.target==='p-mb'&&e.result==='added')&&brewRun.events.some(e=>e.type==='DAMAGE_DEALT'&&e.target==='p-mb'&&e.ability==='Stagger')
 });
 test('Brewmaster Purifying Brew',()=>brewRun.events.some(e=>e.type==='STAGGER_PURIFIED'&&e.source==='p-mb'&&Number(e.amount)>0));
 const mistTalents={'Mist Wrap':3,'Lifecycles':3,'Renewing Mist':2,'Ancient Teachings':2,'Enveloping Breath':2,'Jade Serpent':1,'Rising Mist':2,'Mana Tea':2,'Revival':1};
 const mistParty=[
  {id:'mwt',name:'Tank',class:'Warrior',spec:'Protection',power:14,level:15,_combatHealthPct:93},
  {id:'mw',name:'Mistweaver',class:'Monk',spec:'Mistweaver',power:14,level:15,skillLoadouts:{Mistweaver:['vivify','mist-rising-sun-kick','mist-tiger-palm','spear-hand-strike']},talents:{Mistweaver:mistTalents}},
  {id:'mw1',name:'Mage',class:'Mage',spec:'Arcane',power:14,level:15},
  {id:'mw2',name:'Hunter',class:'Hunter',spec:'Marksman',power:14,level:15},
  {id:'mw3',name:'Rogue',class:'Rogue',spec:'Assassination',power:14,level:15}
 ];
 const mistRun=simulate({party:mistParty,encounter:{...base,kind:'boss',level:15,enemies:[{name:'Passive Master',classification:'boss',passive:true}],enemyHealth:5000},tactics:{cooldownUse:'free'},seed:'monk-mistweaver',maxDurationMs:7000});
 test('Mistweaver Fistweaving',()=>{
  const monk=mistRun.finalState.players.find(p=>p.id==='p-mw');
  return monk?.role==='healer'&&mistRun.events.some(e=>e.type==='DAMAGE_DEALT'&&e.source==='p-mw')&&mistRun.events.some(e=>e.type==='HEAL_RECEIVED'&&e.source==='p-mw'&&e.ability==='Ancient Teachings')
 });
 const windTalents={'Combo Strikes':3,'Ferocity':3,'Rising Sun Kick':2,'Dance of the Wind':2,'Fists of Fury':1,'Jade Ignition':2,'Momentum':2,'Serenity':2,'Touch of Death':1};
 const windParty=[
  {id:'mwtank',name:'Tank',class:'Warrior',spec:'Protection',power:14,level:15},
  {id:'mwh',name:'Healer',class:'Priest',spec:'Holy',power:14,level:15},
  {id:'ww',name:'Windwalker',class:'Monk',spec:'Windwalker',power:14,level:15,skillLoadouts:{Windwalker:['tiger-palm','windwalker-blackout-kick','windwalker-rising-sun-kick','spear-hand-strike']},talents:{Windwalker:windTalents}},
  {id:'ww1',name:'Mage',class:'Mage',spec:'Arcane',power:14,level:15},
  {id:'ww2',name:'Hunter',class:'Hunter',spec:'Marksman',power:14,level:15}
 ];
 const windRun=simulate({party:windParty,encounter:{...base,kind:'boss',level:15,enemyHealth:6500},tactics:{cooldownUse:'free'},seed:'monk-windwalker',maxDurationMs:12000});
 test('Windwalker Combo Strikes',()=>{
  const abilities=new Set(windRun.events.filter(e=>e.type==='DAMAGE_DEALT'&&e.source==='p-ww').map(e=>e.ability));
  return abilities.size>=3&&windRun.events.some(e=>e.type==='TALENT_TRIGGER'&&e.source==='p-ww'&&e.ability==='Momentum')
 });
 const monkLocked=simulate({party:[
  {id:'mlt',name:'Tank',class:'Warrior',spec:'Protection',power:12,level:15},
  {id:'mlh',name:'Healer',class:'Priest',spec:'Holy',power:12,level:15},
  {id:'ml',name:'Monk',class:'Monk',spec:'Windwalker',power:12,level:15,skillLoadouts:{Windwalker:['fists-of-fury','touch-of-death','tiger-palm','spear-hand-strike']},talents:{Windwalker:{}}},
  {id:'ml1',name:'Mage',class:'Mage',spec:'Arcane',power:12,level:15},
  {id:'ml2',name:'Hunter',class:'Hunter',spec:'Marksman',power:12,level:15}
 ],encounter:{...base,level:15,enemyHealth:3500},seed:'monk-gates',maxDurationMs:2500});
 test('Monk Talent Skill Gates',()=>{
  const ids=(monkLocked.finalState.players.find(p=>p.id==='p-ml')?.abilities||[]).map(a=>a.id);
  return ids.includes('tiger-palm')&&!ids.includes('fists-of-fury')&&!ids.includes('touch-of-death')
 });
 const bloodTalents={'Heartbreaker':3,'Ossuary':3,'Hemostasis':2,'Rune Tap':1,'Blood Shield':2,'Voracious':2,'Dancing Rune Weapon':1,'Red Thirst':2,'Vampiric Blood':1};
 const bloodParty=[
  {id:'dkt',name:'Blood DK',class:'Death Knight',spec:'Blood',power:14,level:15,skillLoadouts:{Blood:['heart-strike','death-strike','dark-command','marrowrend']},talents:{Blood:bloodTalents}},
  {id:'dkh',name:'Healer',class:'Priest',spec:'Holy',power:14,level:15},
  {id:'dkb1',name:'Mage',class:'Mage',spec:'Arcane',power:14,level:15},
  {id:'dkb2',name:'Hunter',class:'Hunter',spec:'Marksman',power:14,level:15},
  {id:'dkb3',name:'Rogue',class:'Rogue',spec:'Assassination',power:14,level:15}
 ];
 const bloodRun=simulate({party:bloodParty,encounter:{...base,kind:'boss',level:15,enemyHealth:7000},tactics:{cooldownUse:'free'},seed:'death-knight-blood',maxDurationMs:13000});
 test('Blood Death Strike Recovery',()=>{
  const dk=bloodRun.finalState.players.find(p=>p.id==='p-dkt'),stats=bloodRun.summary.players.find(p=>p.id==='p-dkt');
  return dk?.role==='tank'&&Number(stats?.damageTaken)>0&&Number(stats?.healing)>0&&bloodRun.events.some(e=>e.type==='HEAL_RECEIVED'&&e.source==='p-dkt'&&e.ability==='Death Strike'&&Number(e.amount)>0)
 });
 test('Blood Bone Shield',()=>bloodRun.events.some(e=>e.type==='BUFF_APPLIED'&&e.target==='p-dkt'&&e.ability==='Bone Shield'));

 const frostTalents={'Killing Machine':3,'Icy Talons':3,'Rime':2,'Obliteration':2,'Runic Empowerment':2,'Remorseless Winter':1,'Avalanche':2,'Frozen Pulse':2,'Breath of Sindragosa':1};
 const frostParty=[
  {id:'dkft',name:'Tank',class:'Warrior',spec:'Protection',power:14,level:15},
  {id:'dkfh',name:'Healer',class:'Priest',spec:'Holy',power:14,level:15},
  {id:'dkf',name:'Frost DK',class:'Death Knight',spec:'Frost',power:14,level:15,skillLoadouts:{Frost:['obliterate','frost-strike','howling-blast','breath-of-sindragosa']},talents:{Frost:frostTalents}},
  {id:'dkf1',name:'Mage',class:'Mage',spec:'Arcane',power:14,level:15},
  {id:'dkf2',name:'Hunter',class:'Hunter',spec:'Marksman',power:14,level:15}
 ];
 const frostRun=simulate({party:frostParty,encounter:{...base,kind:'boss',level:15,enemyHealth:6500},tactics:{cooldownUse:'free'},seed:'death-knight-frost',maxDurationMs:12000});
 test('Frost Runic Generator Spender',()=>{
  const gains=frostRun.events.some(e=>e.type==='RESOURCE_GAINED'&&e.source==='p-dkf'&&['Obliterate','Howling Blast'].includes(e.ability));
  const spends=frostRun.events.some(e=>e.type==='RESOURCE_SPENT'&&e.source==='p-dkf'&&['Frost Strike','Breath of Sindragosa'].includes(e.ability));
  return gains&&spends&&frostRun.events.some(e=>e.type==='BUFF_APPLIED'&&e.target==='p-dkf'&&e.ability==='Icy Talons')
 });

 const unholyTalents={'Festering Wounds':3,'Dark Transformation':3,'Infected Claws':2,'Epidemic':2,'Sudden Doom':2,'Army of the Dead':1,'Unholy Pact':2,'Defile':2,'Apocalypse':1};
 const unholyParty=[
  {id:'dkut',name:'Tank',class:'Warrior',spec:'Protection',power:14,level:15},
  {id:'dkuh',name:'Healer',class:'Priest',spec:'Holy',power:14,level:15},
  {id:'dku',name:'Unholy DK',class:'Death Knight',spec:'Unholy',power:14,level:15,skillLoadouts:{Unholy:['festering-strike','scourge-strike','apocalypse','dark-transformation']},talents:{Unholy:unholyTalents}},
  {id:'dku1',name:'Mage',class:'Mage',spec:'Arcane',power:14,level:15},
  {id:'dku2',name:'Hunter',class:'Hunter',spec:'Marksman',power:14,level:15}
 ];
 const unholyRun=simulate({party:unholyParty,encounter:{...base,kind:'boss',level:15,enemyHealth:7500},tactics:{cooldownUse:'free'},seed:'death-knight-unholy',maxDurationMs:15000});
 test('Unholy Permanent Ghoul',()=>{
  const dk=unholyRun.finalState.players.find(p=>p.id==='p-dku'),summon=unholyRun.events.find(e=>e.type==='PET_SUMMONED'&&e.source==='p-dku'&&e.payload?.petType==='ghoul'&&e.result==='permanent');
  const hit=unholyRun.events.find(e=>e.type==='DAMAGE_DEALT'&&e.payload?.ownerId==='p-dku'&&e.payload?.pet===true);
  return dk?.role==='dps'&&Boolean(summon&&hit)
 });
 test('Unholy Wounds and Apocalypse',()=>unholyRun.events.some(e=>e.type==='FESTERING_WOUND_CHANGED'&&e.source==='p-dku'&&e.result==='applied')&&unholyRun.events.some(e=>e.type==='PET_SUMMONED'&&e.payload?.ownerId==='p-dku'&&e.payload?.petType==='apocalypse-ghoul'));

 const dkLocked=simulate({party:[
  {id:'dkl-t',name:'Tank',class:'Warrior',spec:'Protection',power:12,level:15},
  {id:'dkl-h',name:'Healer',class:'Priest',spec:'Holy',power:12,level:15},
  {id:'dkl',name:'Locked DK',class:'Death Knight',spec:'Frost',power:12,level:15,skillLoadouts:{Frost:['breath-of-sindragosa','remorseless-winter','obliterate','mind-freeze']},talents:{Frost:{}}},
  {id:'dkl1',name:'Mage',class:'Mage',spec:'Arcane',power:12,level:15},
  {id:'dkl2',name:'Hunter',class:'Hunter',spec:'Marksman',power:12,level:15}
 ],encounter:{...base,level:15,enemyHealth:3200},seed:'death-knight-gates',maxDurationMs:2500});
 test('Death Knight Talent Skill Gates',()=>{
  const ids=(dkLocked.finalState.players.find(p=>p.id==='p-dkl')?.abilities||[]).map(a=>a.id);
  return ids.includes('obliterate')&&!ids.includes('breath-of-sindragosa')&&!ids.includes('remorseless-winter')
 });
 const mageOnly=[{id:'m',name:'Mage',class:'Mage',spec:'Arcane',power:2,level:2}];
 r=simulate({party:mageOnly,encounter:{...base,enemyHealth:900},seed:'resource'});
 test('Resource Starvation',()=>r.events.some(e=>e.type==='RESOURCE_SPENT'));
 r=simulate({party,encounter:base,seed:'cooldown'});
 test('Cooldown',()=>{
  const starts=r.events.filter(e=>e.type==='ABILITY_START'&&e.ability==='Aimed Shot');return starts.every((e,i)=>i===0||e.timestamp-starts[i-1].timestamp>=6500);
 });
 r=simulate({party,encounter:base,seed:'replay'});
 test('Replay Foundation',()=>JSON.stringify(r.replay.events)===JSON.stringify(r.events));
 r=simulate({party:[
  {id:'mt',name:'Tank',class:'Warrior',spec:'Protection',power:8,level:10},
  {id:'m1',name:'Melee One',class:'Warrior',spec:'Arms',power:8,level:10},
  {id:'m2',name:'Melee Two',class:'Rogue',spec:'Assassination',power:8,level:10},
  {id:'m3',name:'Melee Three',class:'Demon Hunter',spec:'Havoc',power:8,level:10},
  {id:'mh',name:'Healer',class:'Priest',spec:'Holy',power:8,level:10}
 ],encounter:{...base,enemyHealth:900},seed:'melee-formation'});
 test('Melee Formation',()=>{
  const ends=r.events.filter(e=>e.type==='MOVEMENT_END'&&e.result==='melee formation').map(e=>e.position);
  const unique=new Set(ends.map(p=>p?Math.round(p.x*10)+'/'+Math.round(p.y*10):''));
  return unique.size>=3
 });
 test('Resource Bars',()=>r.events.filter(e=>e.type==='RESOURCE_STATE'&&e.result==='initial').length===5);
 r=simulate({party:[
  {id:'rt',name:'Tank',class:'Warrior',spec:'Protection',power:10,level:10,_combatResource:{value:44}},
  {id:'rh',name:'Healer',class:'Paladin',spec:'Holy',power:10,level:10,_combatResource:{value:37}},
  {id:'rd1',name:'DPS One',class:'Warrior',spec:'Arms',power:10,level:10},
  {id:'rd2',name:'DPS Two',class:'Rogue',spec:'Assassination',power:10,level:10},
  {id:'rd3',name:'DPS Three',class:'Hunter',spec:'Marksman',power:10,level:10}
 ],encounter:{...base,enemyHealth:600},seed:'resource-persistence'});
 test('Resource Persistence',()=>{
  const initial=r.events.find(e=>e.type==='RESOURCE_STATE'&&e.source==='p-rh'&&e.result==='initial');
  const healer=r.finalState.players.find(p=>p.id==='p-rh');
  return initial?.payload?.value===37&&healer?.resource?.value<100
 });

 r=simulate({party:[
  {id:'st',name:'Tank',class:'Warrior',spec:'Protection',power:18,level:10},
  {id:'sh',name:'Healer',class:'Paladin',spec:'Holy',power:18,level:10},
  {id:'sd1',name:'DPS One',class:'Warrior',spec:'Arms',power:18,level:10},
  {id:'sd2',name:'DPS Two',class:'Warrior',spec:'Arms',power:18,level:10},
  {id:'sd3',name:'DPS Three',class:'Warrior',spec:'Arms',power:18,level:10}
 ],encounter:{...base,enemyHealth:900},seed:'action-stagger'});
 test('Action Stagger',()=>{
  const first={};
  r.events.filter(e=>e.type==='ABILITY_START'&&String(e.source||'').startsWith('p-')).forEach(e=>{if(first[e.source]==null)first[e.source]=e.timestamp});
  return new Set(Object.values(first)).size>=4
 });
 r=simulate({party:[
  {id:'mt',name:'Tank',class:'Warrior',spec:'Protection',power:28,level:10},
  {id:'mh',name:'Healer',class:'Paladin',spec:'Holy',power:28,level:10},
  {id:'md1',name:'DPS One',class:'Warrior',spec:'Arms',power:28,level:10},
  {id:'md2',name:'DPS Two',class:'Rogue',spec:'Assassination',power:28,level:10},
  {id:'md3',name:'DPS Three',class:'Hunter',spec:'Marksman',power:28,level:10}
 ],encounter:{id:'mana-pressure',title:'Mana Pressure',kind:'boss',enemies:['Pressure Boss'],enemyHealth:1500,mechanics:[['Tank Cleave','cone',1400]]},seed:'mana-pressure'});
 test('Healer Mana Pressure',()=>{
  const healer=r.finalState.players.find(p=>p.id==='p-mh'),stats=r.summary.players.find(p=>p.id==='p-mh');
  return !!healer&&healer.resource.value<88&&stats.resourcesSpent>=25
 });

 r=simulate({party:[
  {id:'jt',name:'Tank',class:'Warrior',spec:'Protection',power:10,level:10},
  {id:'j1',name:'Melee One',class:'Warrior',spec:'Arms',power:10,level:10},
  {id:'j2',name:'Melee Two',class:'Rogue',spec:'Assassination',power:10,level:10},
  {id:'j3',name:'Melee Three',class:'Demon Hunter',spec:'Havoc',power:10,level:10},
  {id:'jh',name:'Healer',class:'Priest',spec:'Holy',power:10,level:10}
 ],encounter:{...base,enemyHealth:1200,mechanics:[]},seed:'movement-smoothing'});
 test('Movement Smoothing',()=>r.events.filter(e=>e.type==='MOVEMENT_START'&&String(e.source||'').startsWith('p-')).length<45);
 r=simulate({party:[
  {id:'ht',name:'Tank',class:'Warrior',spec:'Protection',power:28,level:10},
  {id:'hh',name:'Healer',class:'Paladin',spec:'Holy',power:28,level:10},
  {id:'hd1',name:'DPS One',class:'Warrior',spec:'Arms',power:28,level:10},
  {id:'hd2',name:'DPS Two',class:'Rogue',spec:'Assassination',power:28,level:10},
  {id:'hd3',name:'DPS Three',class:'Hunter',spec:'Marksman',power:28,level:10}
 ],encounter:{id:'healer-role',title:'Healer Role',kind:'boss',enemies:['Pressure Boss'],enemyHealth:1200,mechanics:[['Tank Cleave','cone',1500]]},seed:'healer-role'});
 test('Healer Role Priority',()=>{
  const h=r.summary.players.find(p=>p.id==='p-hh'),tank=r.summary.players.find(p=>p.id==='p-ht');
  return !!h&&h.damage===0&&h.healing>=100&&tank.damageTaken>=100
 });
 r=simulate({party:[
  {id:'gt',name:'Tank',class:'Warrior',spec:'Protection',power:28,level:10},
  {id:'gh',name:'Healer',class:'Paladin',spec:'Holy',power:28,level:10},
  {id:'gd1',name:'DPS One',class:'Death Knight',spec:'Frost',power:28,level:10},
  {id:'gd2',name:'DPS Two',class:'Death Knight',spec:'Frost',power:28,level:10},
  {id:'gd3',name:'DPS Three',class:'Death Knight',spec:'Frost',power:28,level:10}
 ],encounter:{id:'group-healing',title:'Group Healing',kind:'boss',enemies:['Pulse Boss'],enemyHealth:1500,mechanics:[['Raid Pulse','interrupt',1200]]},tactics:{interruptPriority:'low',movementDiscipline:'balanced'},seed:'group-healing'});
 test('Group Healing',()=>{
  const events=r.events.filter(e=>e.type==='HEAL_RECEIVED'&&e.source==='p-gh'&&e.ability==='Light of Dawn');
  return new Set(events.map(e=>e.target)).size>=3
 });
 r=simulate({party:[
  {id:'lt',name:'Tank',class:'Warrior',spec:'Protection',power:24,level:10},
  {id:'lh',name:'Healer',class:'Paladin',spec:'Holy',power:24,level:10},
  {id:'ld1',name:'DPS One',class:'Warrior',spec:'Arms',power:24,level:10},
  {id:'ld2',name:'DPS Two',class:'Rogue',spec:'Assassination',power:24,level:10},
  {id:'ld3',name:'DPS Three',class:'Hunter',spec:'Marksman',power:24,level:10}
 ],encounter:{id:'los-healing',title:'LOS Healing',kind:'boss',enemies:['Wall Boss'],enemyHealth:1400,mechanics:[['Tank Cleave','cone',1400]],environment:{blockers:[{id:'stone-wall',x:30,y:32,w:5,h:24,blocksLos:true,blocksMovement:true}]}},seed:'los-healing'});
 test('Environment Line of Sight',()=>{
  const firstHeal=r.events.find(e=>e.type==='HEAL_RECEIVED'&&e.source==='p-lh');
  const losMove=r.events.find(e=>e.type==='MOVEMENT_START'&&e.source==='p-lh'&&e.result==='line of sight');
  return !!firstHeal&&!!losMove&&losMove.timestamp<firstHeal.timestamp
 });
 r=simulate({party:[
  {id:'pt',name:'Tank',class:'Warrior',spec:'Protection',power:24,level:10},
  {id:'ph',name:'Healer',class:'Priest',spec:'Holy',power:24,level:10},
  {id:'pd1',name:'DPS One',class:'Warrior',spec:'Arms',power:24,level:10},
  {id:'pd2',name:'DPS Two',class:'Rogue',spec:'Assassination',power:24,level:10},
  {id:'pd3',name:'DPS Three',class:'Hunter',spec:'Marksman',power:24,level:10}
 ],encounter:{id:'wall-pathing',title:'Wall Pathing',kind:'boss',enemies:['Path Boss'],enemyHealth:900,mechanics:[],environment:{blockers:[{id:'central-wall',x:53,y:38,w:8,h:34,blocksLos:true,blocksMovement:true}]}},seed:'wall-pathing'});
 test('Environment Pathing',()=>r.events.some(e=>e.type==='MOVEMENT_START'&&e.payload?.navigation==='waypoint'));
 r=simulate({party:[{id:'l1',name:'L1',class:'Warrior',spec:'Arms',power:10,level:1},{id:'h1',name:'H',class:'Priest',spec:'Holy',power:10,level:1},{id:'a1',name:'A',class:'Warrior',spec:'Protection',power:10,level:1},{id:'b1',name:'B',class:'Rogue',spec:'Assassination',power:10,level:1},{id:'c1',name:'C',class:'Hunter',spec:'Marksman',power:10,level:1}],encounter:{...base,level:1,enemyHealth:900},seed:'level-one'});
 const l1=r.finalState.players.find(p=>p.id==='p-l1'),d1=r.summary.players.find(p=>p.id==='p-l1')?.damage||0;
 r=simulate({party:[{id:'l10',name:'L10',class:'Warrior',spec:'Arms',power:10,level:10},{id:'h10',name:'H',class:'Priest',spec:'Holy',power:10,level:10},{id:'a10',name:'A',class:'Warrior',spec:'Protection',power:10,level:10},{id:'b10',name:'B',class:'Rogue',spec:'Assassination',power:10,level:10},{id:'c10',name:'C',class:'Hunter',spec:'Marksman',power:10,level:10}],encounter:{...base,level:10,enemyHealth:900},seed:'level-ten'});
 const l10=r.finalState.players.find(p=>p.id==='p-l10'),d10=r.summary.players.find(p=>p.id==='p-l10')?.damage||0;
 test('Level Base Growth',()=>l10.maxHealth>l1.maxHealth*1.2&&d10>d1);
 r=simulate({party,encounter:{...base,level:8,enemyHealth:500,enemyTypes:['elite']},seed:'enemy-level-meta'});
 test('Enemy Level Metadata',()=>{const e=r.finalState.enemies[0];return e.level===8&&e.classification==='elite'&&e.classificationLabel==='ELITE'});
 {
  const encounter={id:'execution-check',kind:'boss',level:7,recommendedItemLevel:24,knowledgeKey:'danger',enemies:['Execution Boss'],enemyHealth:1800,mechanics:[['Pulse','circles',1400],['Scream','interrupt',1500],['Line','line',1400]]};
  const makeExecutionParty=prepared=>[
   {id:'xt',name:'Tank',class:'Warrior',spec:'Protection',power:22,level:prepared?7:2,_combatItemLevel:prepared?26:8,knowledge:{danger:prepared?100:0}},
   {id:'xh',name:'Healer',class:'Priest',spec:'Holy',power:22,level:prepared?7:2,_combatItemLevel:prepared?26:8,knowledge:{danger:prepared?100:0}},
   {id:'xd1',name:'DPS One',class:'Warrior',spec:'Arms',power:22,level:prepared?7:2,_combatItemLevel:prepared?26:8,knowledge:{danger:prepared?100:0}},
   {id:'xd2',name:'DPS Two',class:'Rogue',spec:'Assassination',power:22,level:prepared?7:2,_combatItemLevel:prepared?26:8,knowledge:{danger:prepared?100:0}},
   {id:'xd3',name:'DPS Three',class:'Hunter',spec:'Marksman',power:22,level:prepared?7:2,_combatItemLevel:prepared?26:8,knowledge:{danger:prepared?100:0}}
  ];
  const low=simulate({party:makeExecutionParty(false),encounter,seed:'compare'}),high=simulate({party:makeExecutionParty(true),encounter,seed:'compare'});
  test('Human Error Scaling',()=>low.summary.mistakes.total>high.summary.mistakes.total&&high.outcome==='victory');
  test('Threat Mistake',()=>low.events.some(e=>e.type==='PLAYER_MISTAKE'&&e.result==='threat'));
 }
 {
  const rezParty=[
   {id:'brt',name:'Tank',class:'Warrior',spec:'Protection',power:30,level:8,_combatItemLevel:30,knowledge:{rez:100}},
   {id:'brh',name:'Priest',class:'Priest',spec:'Holy',power:30,level:8,_combatItemLevel:30,knowledge:{rez:100},skillLoadouts:{Holy:['heal','prayer-healing','silence','soul-recall']}},
   {id:'brd1',name:'Fallen DPS',class:'Warrior',spec:'Arms',power:30,level:8,_combatItemLevel:30,_combatHealthPct:0,knowledge:{rez:100}},
   {id:'brd2',name:'DPS Two',class:'Rogue',spec:'Assassination',power:30,level:8,_combatItemLevel:30,knowledge:{rez:100}},
   {id:'brd3',name:'DPS Three',class:'Hunter',spec:'Marksman',power:30,level:8,_combatItemLevel:30,knowledge:{rez:100}}
  ];
  const rez=simulate({party:rezParty,encounter:{id:'rez',kind:'boss',level:8,recommendedItemLevel:28,knowledgeKey:'rez',enemies:['Resurrection Boss'],enemyHealth:2400,mechanics:[]},seed:'battle-rez-test'});
  test('Priest Battle Resurrection',()=>{
   const event=rez.events.find(e=>e.type==='PLAYER_REVIVED'&&e.target==='p-brd1'),priest=rez.finalState.players.find(p=>p.id==='p-brh');
   return !!event&&rez.summary.battleResurrections===1&&Number(priest?.cooldowns?.['soul-recall'])>0
  });
 }
 {
  const sigilParty=[{id:'sigil',name:'Sigil Tank',class:'Warrior',spec:'Protection',power:24,level:8,_combatItemLevel:30,equipment:{Relic:{uniqueEffect:{id:'frostbound-sigil',name:'Frozen Response'}}}}];
  const sigil=simulate({party:sigilParty,encounter:{id:'sigil-test',kind:'boss',level:8,enemies:['Caster'],enemyHealth:900,mechanics:[['Dangerous Cast','interrupt',2400]]},tactics:{interruptPriority:'high'},seed:'sigil-effect'});
  test('Unique Frostbound Sigil',()=>sigil.events.some(e=>e.type==='UNIQUE_EFFECT_TRIGGER'&&e.result==='frostbound-sigil'));

  const standParty=[{id:'stand',name:'Last Stand Tank',class:'Warrior',spec:'Protection',power:8,level:2,_combatItemLevel:8,equipment:{Trinket1:{uniqueEffect:{id:'guardian-last-stand',name:"Guardian's Last Stand"}}}}];
  const stand=simulate({party:standParty,encounter:{id:'stand-test',kind:'boss',level:9,enemies:['Crusher'],enemyHealth:5000,scaling:{enemyDamage:1.35},mechanics:[]},seed:'last-stand-effect'});
  test("Unique Guardian's Last Stand",()=>stand.events.some(e=>e.type==='UNIQUE_EFFECT_TRIGGER'&&e.result==='guardian-last-stand'));

  const scaled=simulate({party,encounter:{...base,enemyHealth:420,scaling:{enemyHealth:1.75,enemyDamage:1.3}},seed:'difficulty-scaling'});
  test('Difficulty Scaling',()=>scaled.finalState.enemies[0].maxHealth>700);

  const volatile=simulate({party,encounter:{id:'volatile-test',kind:'event',level:10,enemies:[{name:'Volatile Elite',classification:'elite'}],enemyHealth:180,affixes:['volatile-cells']},seed:'volatile-affix'});
  test('Volatile Cells Affix',()=>volatile.events.some(e=>e.type==='AFFIX_TRIGGER'&&e.payload?.affix==='volatile-cells'&&e.result==='explode'));
 }
 {
  const phased=simulate({party,encounter:{...base,enemyHealth:1500,phases:[{id:'p70',name:'Phase Two',atPct:70,damageScale:1.15,spawnAdds:true}],softEnragePct:20,hardEnrageMs:1000},seed:'phase-enrage'});
  test('Boss Phase Transition',()=>phased.events.some(e=>e.type==='PHASE_CHANGE'&&e.payload?.phaseId==='p70'));
  test('Hard Enrage',()=>phased.events.some(e=>e.type==='ENRAGE'&&e.result==='hard'));
 }
 {
  const sliced=simulate({
   party,
   encounter:{id:'slice',kind:'world-boss',level:10,enemies:[{name:'Persistent Boss',classification:'world-boss',absoluteHealth:true,maxHealth:120000,currentHealth:73500}],mechanics:[['World Slam','cone',1200]],mechanicIntervalMs:1800},
   seed:'slice-test',maxDurationMs:4800
  });
  test('Time Slice Ongoing',()=>sliced.outcome==='ongoing'&&sliced.durationMs<=5000&&sliced.events.some(e=>e.type==='COMBAT_END'&&e.result==='ongoing'));
  test('Absolute Boss Health',()=>{
   const enemy=sliced.finalState.enemies.find(e=>e.name==='Persistent Boss');
   return enemy?.maxHealth===120000&&enemy.health<73500&&enemy.health>0
  });
 }
 {
  const persisted=simulate({
   party,
   encounter:{id:'persist-phase',kind:'world-boss',level:10,enemies:[{name:'Persistent Phase Boss',classification:'world-boss',absoluteHealth:true,maxHealth:100000,currentHealth:65000}],phases:[{id:'p70',name:'Phase Two',atPct:70,damageScale:1.2}],mechanics:[]},
   seed:'persist-phase',maxDurationMs:1200,initialPhaseTriggered:{p70:true},elapsedOffsetMs:50000
  });
  const pb=persisted.finalState.enemies.find(e=>e.name==='Persistent Phase Boss');
  test('Persistent Boss Phase',()=>pb?.phaseDamageScale>=1.2&&!persisted.events.some(e=>e.type==='PHASE_CHANGE'&&e.payload?.phaseId==='p70'));

  const setParty=party.map((p,i)=>i===0?{...p,equipment:{
    Head:{setId:'test-set',setName:'Test Set'},Shoulders:{setId:'test-set',setName:'Test Set'},Chest:{setId:'test-set',setName:'Test Set'},Weapon:{setId:'test-set',setName:'Test Set'}
  }}:p);
  const setRun=simulate({party:setParty,encounter:{...base,enemyHealth:420},seed:'set-foundation'});
  const setTank=setRun.finalState.players.find(p=>p.characterId===setParty[0].id);
  test('Gear Set Foundation',()=>setTank?.setBonuses?.sets?.[0]?.pieces===4&&setTank?.setBonuses?.outputScale>1&&setTank?.setBonuses?.resourceRegen>1);

  const cc=simulate({
    party,
    encounter:{id:'cc-test',kind:'trash',level:4,enemies:[{name:'Elite Controller',classification:'elite'},{name:'Trash Mob',classification:'trash'}],enemyHealth:300,mechanics:[]},
    tactics:{crowdControl:'priority-elites'},seed:'cc-strategy'
  });
  test('Strategy Crowd Control',()=>cc.events.some(e=>e.type==='CROWD_CONTROL'&&e.result==='applied'));
 }



 {
  const prayerParty=[
   {id:'pom-t',name:'Tank',class:'Warrior',spec:'Protection',power:24,level:10,_combatHealthPct:38},
   {id:'pom-h',name:'Priest',class:'Priest',spec:'Holy',power:24,level:10,_combatHealthPct:100,talents:{Holy:{Renew:1,'Prayer of Mending':2}},skillLoadouts:{Holy:['heal','flash-heal','prayer-healing','silence']}},
   {id:'pom-1',name:'DPS One',class:'Warrior',spec:'Arms',power:24,level:10,_combatHealthPct:55},
   {id:'pom-2',name:'DPS Two',class:'Rogue',spec:'Assassination',power:24,level:10,_combatHealthPct:62},
   {id:'pom-3',name:'DPS Three',class:'Hunter',spec:'Marksman',power:24,level:10,_combatHealthPct:70}
  ];
  const prayer=simulate({party:prayerParty,encounter:{id:'prayer-test',kind:'boss',level:10,enemies:['Prayer Dummy'],enemyHealth:2400,mechanics:[]},seed:'prayer-of-mending'});
  const jumps=prayer.events.filter(e=>e.type==='HEAL_RECEIVED'&&e.source==='p-pom-h'&&e.ability==='Prayer of Mending');
  test('Prayer of Mending Talent',()=>jumps.length>=1&&new Set(jumps.map(e=>e.target)).size>=1&&prayer.events.some(e=>e.type==='TALENT_TRIGGER'&&e.ability==='Prayer of Mending'));
 }
 {
  const noTalent={id:'skill-gate-a',name:'Arms',class:'Warrior',spec:'Arms',power:20,level:10,talents:{Arms:{}},skillLoadouts:{Arms:['mortal-strike','slam']}};
  const withTalent={...noTalent,id:'skill-gate-b',talents:{Arms:{'Mortal Strike':1}}};
  const gateA=simulate({party:[noTalent],encounter:{id:'gate-a',kind:'trash',level:5,enemies:['Dummy'],enemyHealth:500,mechanics:[]},seed:'gate-a',maxDurationMs:1200});
  const gateB=simulate({party:[withTalent],encounter:{id:'gate-b',kind:'trash',level:5,enemies:['Dummy'],enemyHealth:500,mechanics:[]},seed:'gate-b',maxDurationMs:1200});
  const a=gateA.finalState.players[0]?.abilities||[],b=gateB.finalState.players[0]?.abilities||[];
  test('Talent Gated Skill',()=>!a.some(x=>x.id==='mortal-strike')&&b.some(x=>x.id==='mortal-strike'));
 }
 {
  const loadoutParty=[{id:'loadout',name:'Loadout Test',class:'Mage',spec:'Arcane',power:20,level:10,skillLoadouts:{Arcane:['fireball']}}];
  const loadout=simulate({party:loadoutParty,encounter:{id:'loadout-test',kind:'trash',level:5,enemies:['Dummy'],enemyHealth:900,mechanics:[]},seed:'loadout',maxDurationMs:5000});
  const damageStarts=loadout.events.filter(e=>e.type==='ABILITY_START'&&e.source==='p-loadout'&&e.payload?.kind==='damage');
  test('Equipped Skills Are Authoritative',()=>damageStarts.length>0&&damageStarts.every(e=>e.ability==='Fireball'));
 }


 {
  const masteryBase=[
   {id:'mk-t',name:'Tank',class:'Warrior',spec:'Protection',power:20,level:8,_combatItemLevel:28},
   {id:'mk-h',name:'Healer',class:'Priest',spec:'Holy',power:20,level:8,_combatItemLevel:28},
   {id:'mk-1',name:'DPS One',class:'Warrior',spec:'Arms',power:20,level:8,_combatItemLevel:28},
   {id:'mk-2',name:'DPS Two',class:'Rogue',spec:'Assassination',power:20,level:8,_combatItemLevel:28},
   {id:'mk-3',name:'DPS Three',class:'Hunter',spec:'Marksman',power:20,level:8,_combatItemLevel:28}
  ];
  const low=masteryBase.map(x=>({...x,knowledge:{mastery:0}})),high=masteryBase.map(x=>({...x,knowledge:{mastery:100}}));
  const encounter={id:'mastery-neutral',kind:'boss',level:8,recommendedItemLevel:28,knowledgeKey:'mastery',enemies:['Mastery Dummy'],enemyHealth:1800,mechanics:[['Pulse','circles',1400],['Cast','interrupt',1600]]};
  const a=simulate({party:low,encounter,seed:'mastery-neutral'}),b=simulate({party:high,encounter,seed:'mastery-neutral'});
  test('Mastery Does Not Affect Combat',()=>a.outcome===b.outcome&&a.summary.totalDamage===b.summary.totalDamage&&a.summary.totalHealing===b.summary.totalHealing&&a.summary.mistakes.total===b.summary.mistakes.total);
 }









 {
  const idleShaman=[
   {id:'idle-t',name:'Tank',class:'Warrior',spec:'Protection',power:10,level:8},
   {id:'idle-s',name:'Shaman',class:'Shaman',spec:'Restoration',power:10,level:8,skillLoadouts:{Restoration:[]},talents:{Restoration:{}}},
   {id:'idle-1',name:'DPS One',class:'Mage',spec:'Arcane',power:10,level:8},
   {id:'idle-2',name:'DPS Two',class:'Hunter',spec:'Marksman',power:10,level:8},
   {id:'idle-3',name:'DPS Three',class:'Rogue',spec:'Assassination',power:10,level:8}
  ];
  const shamanRun=simulate({party:idleShaman,encounter:{id:'idle-shaman',kind:'boss',level:8,enemies:[{name:'Pressure Dummy',classification:'boss',allAttacksAoe:true}],enemyHealth:2200,mechanics:[]},seed:'idle-shaman',maxDurationMs:8000});
  test('Empty Healer Loadout Recovers',()=>shamanRun.events.some(e=>e.type==='ABILITY_START'&&e.source==='p-idle-s'&&(e.ability==='Chain Heal'||e.ability==='Healing Wave'||e.ability==='Riptide'))&&!shamanRun.events.some(e=>e.type==='TOTEM_PLACED'&&e.source==='p-idle-s'));
 }
  {
  const noInterrupt=Array.from({length:5},(_,i)=>({id:'status-'+i,name:'Status Tester '+i,class:'Mage',spec:'Arcane',power:8,level:8,_combatItemLevel:28,skillLoadouts:{Arcane:['fireball']}}));
  const statusRun=simulate({party:noInterrupt,encounter:{id:'enemy-status-test',kind:'boss',level:8,enemies:['Rot Caster'],enemyHealth:6000,mechanicIntervalMs:500,mechanics:[{name:'Arcane Rot',type:'interrupt',duration:600,priority:'critical',status:{id:'arcane-rot',name:'Arcane Rot',duration:3500,effect:{outgoingDamageReduction:.10}}}]},seed:'enemy-status-effect',maxDurationMs:2600});
  test('Enemy Mechanics Emit Status Effects',()=>statusRun.events.some(e=>e.type==='DEBUFF_APPLIED'&&e.ability==='Arcane Rot'&&String(e.source||'').startsWith('e-')&&String(e.target||'').startsWith('p-')));
 }
 return{version:VERSION,passed:tests.filter(x=>x.pass).length,total:tests.length,tests};
}

window.CellboundCombatReborn={
 VERSION,CLASS_COLORS,RESOURCE_DEFS,CLASS_BUFFS,ABILITIES,LEVEL_RULES,ENEMY_CLASS_RULES,simulate,replay,debugSnapshot,
 skills:{classSkillPool,unlockedSkillPool,defaultSkillLoadout},
 talents:{rules:TALENT_RULES,skillRequirements:TALENT_SKILL_REQUIREMENTS,rank:characterTalentRank},
 tests:{run:runSelfTests},utils:{hashSeed,rngFrom,levelHealthScale,levelOutputScale,levelMatchMultiplier}
};
})();
