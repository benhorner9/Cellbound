(()=>{
'use strict';

const STORAGE='cellbound-management-reboot-v3';
const G=window.CellboundGear;
const B=window.CellboundBuildRules;
const I=window.CellboundIdentities;
const CP=window.CellboundPortraits;
const portraitHTML=(c,size='lg')=>CP?.portraitHTML?.(c,{size})||'<span class="cb-portrait cb-portrait--'+size+'"><b>'+String(c?.portrait||c?.name||'?').slice(0,2).toUpperCase()+'</b></span>';
const modal=document.getElementById('characterModal');
const detail=document.getElementById('characterDetail');
if(!modal||!detail)return;

let dirty=false;
let currentId=null;
let currentTab='overview';
let activeSlot=null;
let selectedTalentId=null;
let selectedTalentSpec=null;
let selectedTreeSpec=null;
let activeSkillSlot=0,activeLoadoutSlot='skill';
let returnView='roster';

const CHARACTER_TABS=[
  ['overview','◇','Overview','Snapshot'],
  ['equipment','▦','Equipment','Gear & stats'],
  ['talents','✦','Talents','Build'],
  ['skills','⚔','Skills','Combat loadout'],
  ['professions','⚒','Professions','Trades'],
  ['history','▤','History','Record']
];

const classMeta={
  Warrior:{icon:'⚔',accent:'#C69B6D',primary:'Strength'},
  Paladin:{icon:'✥',accent:'#F48CBA',primary:'Strength'},
  Priest:{icon:'✚',accent:'#FFFFFF',primary:'Intellect'},
  Druid:{icon:'❈',accent:'#FF7C0A',primary:'Intellect'},
  Hunter:{icon:'➶',accent:'#AAD372',primary:'Agility'},
  Rogue:{icon:'◆',accent:'#FFF468',primary:'Agility'},
  Mage:{icon:'✦',accent:'#3FC7EB',primary:'Intellect'},
  Shaman:{icon:'⚡',accent:'#0070DD',primary:'Intellect'},
  Warlock:{icon:'✺',accent:'#8788EE',primary:'Intellect'},
  Monk:{icon:'☯',accent:'#00FF98',primary:'Agility'},
  'Death Knight':{icon:'☠',accent:'#C41E3A',primary:'Strength'},
  'Demon Hunter':{icon:'⛧',accent:'#A330C9',primary:'Agility'},
  Evoker:{icon:'✧',accent:'#33937F',primary:'Intellect'}
};

const specs={
  Warrior:{Protection:'tank',Arms:'dps'},
  Paladin:{Protection:'tank',Holy:'healer'},
  Priest:{Holy:'healer',Shadow:'dps'},
  Druid:{Restoration:'healer',Balance:'dps'},
  Hunter:{Marksman:'dps','Beast Mastery':'dps'},
  Rogue:{Assassination:'dps',Outlaw:'dps'},
  Mage:{Arcane:'dps',Frost:'dps'},
  Shaman:{Restoration:'healer',Elemental:'dps'},
  Warlock:{Demonology:'dps',Destruction:'dps'},
  Monk:{Brewmaster:'tank',Mistweaver:'healer',Windwalker:'dps'},
  'Death Knight':{Blood:'tank',Frost:'dps',Unholy:'dps'},
  'Demon Hunter':{Havoc:'dps',Vengeance:'tank'},
  Evoker:{Preservation:'healer',Devastation:'dps'}
};

const trees={
  Warrior:{
    Protection:[
      {id:'Shield Mastery',icon:'🛡',tier:0,col:1,max:3,desc:'Increase block and reduce incoming physical damage.'},
      {id:'Last Stand',icon:'♥',tier:0,col:3,max:1,desc:'Gain a powerful emergency health increase.'},
      {id:'Iron Discipline',icon:'⛓',tier:1,col:0,max:3,req:'Shield Mastery',desc:'Improve armour while a shield is equipped.'},
      {id:'Taunt Mastery',icon:'!',tier:1,col:2,max:2,desc:'Improve threat generation and taunt reliability.'},
      {id:'Hold the Line',icon:'▰',tier:2,col:1,max:2,req:'Iron Discipline',desc:'Blocking grants a short defensive buff.'},
      {id:'Vengeance',icon:'⚡',tier:2,col:3,max:3,req:'Taunt Mastery',desc:'Taking damage increases your counter-attack power.'},
      {id:'Bulwark',icon:'⬢',tier:3,col:1,max:1,req:'Hold the Line',desc:'Create a major defensive wall for the party.'},
      {id:'Fortress',icon:'♜',tier:3,col:3,max:2,req:'Vengeance',desc:'Increase mitigation during sustained boss pressure.'},
      {id:'Unbroken',icon:'✦',tier:4,col:2,max:1,req:'Bulwark',desc:'Capstone: survive a lethal blow once per encounter.'}
    ],
    Arms:[
      {id:'Weapon Mastery',icon:'⚔',tier:0,col:1,max:3,desc:'Increase weapon damage.'},
      {id:'Deep Wounds',icon:'🩸',tier:0,col:3,max:3,desc:'Critical strikes cause bleeding.'},
      {id:'Battle Rhythm',icon:'◈',tier:1,col:0,max:2,req:'Weapon Mastery',desc:'Repeated attacks build momentum.'},
      {id:'Overpower',icon:'↯',tier:1,col:2,max:2,desc:'Punish enemy mistakes with a heavy strike.'},
      {id:'Sweeping Blows',icon:'⌁',tier:2,col:1,max:1,req:'Battle Rhythm',desc:'Damage can cleave to an additional target.'},
      {id:'Executioner',icon:'☠',tier:2,col:3,max:3,req:'Deep Wounds',desc:'Deal more damage to weakened bosses.'},
      {id:'Mortal Strike',icon:'✕',tier:3,col:1,max:1,req:'Sweeping Blows',desc:'Unlock the signature Arms attack.'},
      {id:'Blood Frenzy',icon:'🔥',tier:3,col:3,max:2,req:'Executioner',desc:'Bleeding targets increase attack speed.'},
      {id:'Bladestorm',icon:'✹',tier:4,col:2,max:1,req:'Mortal Strike',desc:'Capstone: unleash a devastating weapon storm.'}
    ]
  },
  Paladin:{
    Protection:[
      {id:'Sacred Shield',icon:'🛡',tier:0,col:1,max:3,desc:'Strengthen block with holy power.'},
      {id:'Guardian Oath',icon:'✥',tier:0,col:3,max:1,desc:'Swear an oath that increases threat and defence.'},
      {id:'Righteous Guard',icon:'☀',tier:1,col:0,max:3,req:'Sacred Shield',desc:'Reduce damage after blocking.'},
      {id:'Hammer of Justice',icon:'🔨',tier:1,col:2,max:2,desc:'Improve control and interruption.'},
      {id:'Consecration',icon:'◎',tier:2,col:1,max:1,req:'Righteous Guard',desc:'Consecrate the ground beneath the party.'},
      {id:'Divine Ward',icon:'◇',tier:2,col:3,max:2,req:'Guardian Oath',desc:'Reduce incoming magical damage.'},
      {id:'Ardent Defender',icon:'🔥',tier:3,col:1,max:1,req:'Consecration',desc:'Powerful defensive cooldown.'},
      {id:'Holy Bastion',icon:'▣',tier:3,col:3,max:2,req:'Divine Ward',desc:'Increase block while under sustained pressure.'},
      {id:'Divine Guardian',icon:'✦',tier:4,col:2,max:1,req:'Ardent Defender',desc:'Capstone: protect the entire party from heavy damage.'}
    ],
    Holy:[
      {id:'Divine Light',icon:'✦',tier:0,col:1,max:3,desc:'Increase direct healing.'},
      {id:'Grace',icon:'♡',tier:0,col:3,max:3,desc:'Reduce healing resource cost.'},
      {id:'Holy Shock',icon:'☀',tier:1,col:0,max:1,req:'Divine Light',desc:'Instant heal with offensive utility.'},
      {id:'Infusion',icon:'✧',tier:1,col:2,max:2,desc:'Critical heals improve your next cast.'},
      {id:'Beacon',icon:'◉',tier:2,col:1,max:1,req:'Holy Shock',desc:'Link healing to a chosen ally.'},
      {id:'Sacred Hands',icon:'✋',tier:2,col:3,max:3,req:'Grace',desc:'Increase healing on low-health allies.'},
      {id:'Aura Mastery',icon:'✺',tier:3,col:1,max:1,req:'Beacon',desc:'Empower your active aura.'},
      {id:'Radiance',icon:'☼',tier:3,col:3,max:2,req:'Sacred Hands',desc:'Spread healing to nearby party members.'},
      {id:'Divine Hymn',icon:'♫',tier:4,col:2,max:1,req:'Aura Mastery',desc:'Capstone: unleash a raid-saving wave of holy healing.'}
    ]
  },
  Priest:{
    Holy:[
      {id:'Renew',icon:'✚',tier:0,col:1,max:3,desc:'Improve healing over time.'},{id:'Serenity',icon:'◌',tier:0,col:3,max:2,desc:'Increase efficient direct healing.'},{id:'Prayer of Mending',icon:'✧',tier:1,col:0,max:2,req:'Renew',desc:'Healing jumps between allies.'},{id:'Focused Will',icon:'◇',tier:1,col:2,max:2,desc:'Increase healing under pressure.'},{id:'Circle of Healing',icon:'◎',tier:2,col:1,max:1,req:'Prayer of Mending',desc:'Heal several party members at once.'},{id:'Spirit of Redemption',icon:'♰',tier:2,col:3,max:1,req:'Serenity',desc:'Continue healing briefly after defeat.'},{id:'Guardian Spirit',icon:'翼',tier:3,col:1,max:1,req:'Circle of Healing',desc:'Protect an ally from lethal damage.'},{id:'Divine Insight',icon:'✦',tier:3,col:3,max:2,req:'Spirit of Redemption',desc:'Gain powerful healing procs.'},{id:'Divine Hymn',icon:'♫',tier:4,col:2,max:1,req:'Guardian Spirit',desc:'Capstone group healing channel.'}
    ],
    Shadow:[
      {id:'Dark Thoughts',icon:'◉',tier:0,col:1,max:3,desc:'Strengthen Mind Flay and Mind Blast and improve Insanity generation.'},
      {id:'Shadow Weaving',icon:'☾',tier:0,col:3,max:3,desc:'Increase the damage dealt by your lingering shadow effects.'},
      {id:'Mind Devourer',icon:'◆',tier:1,col:0,max:2,req:'Dark Thoughts',desc:'Mind Blast can make the next Devouring Plague cost no Insanity.'},
      {id:'Vampiric Embrace',icon:'♥',tier:1,col:2,max:2,desc:'Lingering shadow damage returns a portion of its damage as healing.'},
      {id:'Shadow Crash',icon:'✹',tier:2,col:1,max:1,req:'Shadow Weaving',desc:'Unlock Shadow Crash as a ranged area-damage and Insanity-generating skill.'},
      {id:'Twist of Fate',icon:'☠',tier:2,col:3,max:2,req:'Mind Devourer',desc:'Deal increased damage to weakened enemies.'},
      {id:'Psychic Link',icon:'⛓',tier:3,col:1,max:2,req:'Shadow Crash',desc:'Mind Blast and Devouring Plague splash shadow damage into another nearby enemy.'},
      {id:'Void Torrent',icon:'◎',tier:3,col:3,max:1,req:'Twist of Fate',desc:'Unlock Void Torrent, a powerful channel that rapidly generates Insanity.'},
      {id:'Void Eruption',icon:'✦',tier:4,col:2,max:1,req:'Psychic Link',desc:'Capstone: unlock Void Eruption and enter a short Voidform burst window.'}
    ]
  },
  Druid:{
    Restoration:[
      {id:'Rejuvenation',icon:'❈',tier:0,col:1,max:3,desc:'Improve your core heal-over-time spell.'},{id:'Lifebloom',icon:'🌿',tier:0,col:3,max:3,desc:'Stack healing on a focused ally.'},{id:'Wild Growth',icon:'☘',tier:1,col:0,max:2,req:'Rejuvenation',desc:'Spread healing across the party.'},{id:'Natural Swiftness',icon:'➤',tier:1,col:2,max:1,desc:'Make an important heal instant.'},{id:'Living Seed',icon:'◉',tier:2,col:1,max:2,req:'Wild Growth',desc:'Critical heals plant a delayed heal.'},{id:'Ironbark',icon:'♣',tier:2,col:3,max:1,req:'Lifebloom',desc:'Reduce damage on an ally.'},{id:'Tree of Life',icon:'♠',tier:3,col:1,max:1,req:'Living Seed',desc:'Temporarily empower restoration magic.'},{id:'Flourish',icon:'✿',tier:3,col:3,max:1,req:'Ironbark',desc:'Extend active healing effects.'},{id:'Tranquility',icon:'✦',tier:4,col:2,max:1,req:'Tree of Life',desc:'Capstone: channel massive party-wide healing.'}
    ],
    Balance:[
      {id:'Starlight',icon:'☀',tier:0,col:1,max:3,desc:'Increase Wrath and Starfire damage and Astral Power generation.'},
      {id:'Twin Moons',icon:'☾',tier:0,col:3,max:3,desc:'Increase Moonfire and Sunfire periodic damage.'},
      {id:"Nature's Balance",icon:'◈',tier:1,col:0,max:2,req:'Starlight',desc:'Improve Astral Power generation and make Eclipse cycles easier to maintain.'},
      {id:'Shooting Stars',icon:'✧',tier:1,col:2,max:2,req:'Twin Moons',desc:'Periodic astral damage can generate additional Astral Power.'},
      {id:'Starfall',icon:'✹',tier:2,col:1,max:1,req:'Shooting Stars',desc:'Unlock Starfall as a powerful area Astral Power spender.'},
      {id:'Soul of the Forest',icon:'❈',tier:2,col:3,max:2,req:"Nature's Balance",desc:'Solar and Lunar Eclipse empower their matching spells more strongly.'},
      {id:'Fury of Elune',icon:'☄',tier:3,col:1,max:1,req:'Starfall',desc:'Unlock Fury of Elune as an astral beam that damages packs and generates Astral Power.'},
      {id:'Astral Communion',icon:'◎',tier:3,col:3,max:2,req:'Soul of the Forest',desc:'Starsurge and Starfall gain stronger finishers and can return Astral Power.'},
      {id:'Celestial Alignment',icon:'✦',tier:4,col:2,max:1,req:'Fury of Elune',desc:'Capstone: unlock Celestial Alignment, empowering both Solar and Lunar magic at once.'}
    ]
  },
  Hunter:{
    Marksman:[
      {id:'True Aim',icon:'◎',tier:0,col:1,max:3,desc:'Increase accuracy and ranged damage.'},{id:'Rapid Fire',icon:'➶',tier:0,col:3,max:2,desc:'Fire several shots in quick succession.'},{id:'Steady Focus',icon:'◈',tier:1,col:0,max:2,req:'True Aim',desc:'Maintain damage while stationary.'},{id:'Concussive Shot',icon:'◉',tier:1,col:2,max:1,desc:'Add useful control.'},{id:'Piercing Shots',icon:'⇢',tier:2,col:1,max:3,req:'Steady Focus',desc:'Critical shots cause bleeding.'},{id:'Trueshot Aura',icon:'✦',tier:2,col:3,max:1,req:'Rapid Fire',desc:'Improve party ranged output.'},{id:'Careful Aim',icon:'⊙',tier:3,col:1,max:2,req:'Piercing Shots',desc:'Deal extra damage to healthy targets.'},{id:'Killer Instinct',icon:'☠',tier:3,col:3,max:2,req:'Trueshot Aura',desc:'Improve finishing damage.'},{id:'Kill Shot',icon:'✹',tier:4,col:2,max:1,req:'Careful Aim',desc:'Capstone execute ability.'}
    ],
    'Beast Mastery':[
      {id:'Pack Leader',icon:'🐾',tier:0,col:1,max:3,desc:'Increase damage dealt by your permanent beast and temporary beasts.'},
      {id:'Killer Cobra',icon:'➶',tier:0,col:3,max:3,desc:'Increase Cobra Shot damage and improve Focus efficiency.'},
      {id:'Barbed Wrath',icon:'✣',tier:1,col:0,max:2,req:'Pack Leader',desc:'Barbed Shot strengthens and accelerates your permanent beast.'},
      {id:'Wild Call',icon:'↺',tier:1,col:2,max:2,desc:'Kill Command helps recover Barbed Shot more quickly.'},
      {id:'Dire Beast',icon:'◆',tier:2,col:1,max:1,req:'Barbed Wrath',desc:'Unlock Dire Beast, calling a temporary beast into combat.'},
      {id:'Beast Cleave',icon:'✹',tier:2,col:3,max:2,req:'Killer Cobra',desc:'Multi-Shot causes your beast to cleave nearby enemies for a short time.'},
      {id:'Stampede',icon:'☷',tier:3,col:1,max:1,req:'Dire Beast',desc:'Unlock Stampede, calling several beasts through the enemy pack.'},
      {id:'Thrill of the Hunt',icon:'✧',tier:3,col:3,max:2,req:'Beast Cleave',desc:'Pet commands grant a short critical-strike and haste surge.'},
      {id:'Bestial Wrath',icon:'✦',tier:4,col:2,max:1,req:'Stampede',desc:'Capstone: unlock Bestial Wrath, empowering both hunter and beast for a major burst window.'}
    ]
  },
  Rogue:{
    Assassination:[
      {id:'Ambush',icon:'◆',tier:0,col:1,max:3,desc:'Increase opening burst.'},{id:'Venom',icon:'☣',tier:0,col:3,max:3,desc:'Improve poisons.'},{id:'Garrote',icon:'⌁',tier:1,col:0,max:2,req:'Ambush',desc:'Apply a powerful bleed from stealth.'},{id:'Quick Recovery',icon:'↺',tier:1,col:2,max:2,desc:'Recover resources faster.'},{id:'Mutilate',icon:'✕',tier:2,col:1,max:1,req:'Garrote',desc:'Unlock a brutal dual-weapon attack.'},{id:'Envenom',icon:'☠',tier:2,col:3,max:2,req:'Venom',desc:'Consume poison stacks for burst damage.'},{id:'Master Poisoner',icon:'♨',tier:3,col:1,max:2,req:'Mutilate',desc:'Enhance poison effectiveness.'},{id:'Cut to the Chase',icon:'➤',tier:3,col:3,max:2,req:'Envenom',desc:'Maintain damage buffs automatically.'},{id:'Eviscerate',icon:'✦',tier:4,col:2,max:1,req:'Master Poisoner',desc:'Capstone finishing strike.'}
    ],
    Outlaw:[
      {id:'Opportunity',icon:'✧',tier:0,col:1,max:3,desc:'Sinister Strike builds toward an empowered Pistol Shot.'},
      {id:'Combat Potency',icon:'↺',tier:0,col:3,max:3,desc:'Increase Energy regeneration and smooth the builder-finisher cycle.'},
      {id:'Quick Draw',icon:'➶',tier:1,col:0,max:2,req:'Opportunity',desc:'Opportunity-empowered Pistol Shot deals more damage and generates extra Combo Points.'},
      {id:'Ruthlessness',icon:'◆',tier:1,col:2,max:2,desc:'Finishers accelerate the recovery of your key Outlaw attacks.'},
      {id:'Blade Flurry',icon:'✹',tier:2,col:1,max:1,req:'Quick Draw',desc:'Unlock Blade Flurry, converting close-range attacks into pack pressure.'},
      {id:'Between the Eyes',icon:'◎',tier:2,col:3,max:1,req:'Ruthlessness',desc:'Unlock Between the Eyes, a ranged Combo Point finisher that opens a critical-strike window.'},
      {id:'Adrenaline Rush',icon:'⚡',tier:3,col:1,max:2,req:'Blade Flurry',desc:'Unlock and strengthen Adrenaline Rush, massively accelerating Energy and attacks.'},
      {id:'Loaded Dice',icon:'⚄',tier:3,col:3,max:2,req:'Between the Eyes',desc:'Roll the Bones gains stronger, more reliable combat bonuses.'},
      {id:'Killing Spree',icon:'✦',tier:4,col:2,max:1,req:'Adrenaline Rush',desc:'Capstone: unlock Killing Spree, rapidly striking the target and nearby enemies.'}
    ]
  },
  Mage:{
    Arcane:[
      {id:'Arcane Focus',icon:'✦',tier:0,col:1,max:3,desc:'Increase spell accuracy and power.'},{id:'Surge',icon:'⚡',tier:0,col:3,max:2,desc:'Burst arcane power for a short time.'},{id:'Clearcasting',icon:'◇',tier:1,col:0,max:2,req:'Arcane Focus',desc:'Chance to make spells cost no mana.'},{id:'Spell Impact',icon:'✷',tier:1,col:2,max:2,desc:'Increase critical spell damage.'},{id:'Presence of Mind',icon:'◉',tier:2,col:1,max:1,req:'Clearcasting',desc:'Make a cast instant.'},{id:'Arcane Flows',icon:'≈',tier:2,col:3,max:2,req:'Surge',desc:'Reduce cooldowns.'},{id:'Arcane Power',icon:'☄',tier:3,col:1,max:1,req:'Presence of Mind',desc:'Major spell-damage cooldown.'},{id:'Nether Precision',icon:'✧',tier:3,col:3,max:2,req:'Arcane Flows',desc:'Improve critical spell efficiency.'},{id:'Barrage',icon:'✹',tier:4,col:2,max:1,req:'Arcane Power',desc:'Capstone instant arcane barrage.'}
    ],
    Frost:[
      {id:'Piercing Cold',icon:'❄',tier:0,col:1,max:3,desc:'Increase Frostbolt, Flurry and Ice Lance damage.'},
      {id:'Ice Shards',icon:'✧',tier:0,col:3,max:3,desc:'Increase Frost spell critical chance.'},
      {id:'Fingers of Frost',icon:'◇',tier:1,col:0,max:2,req:'Piercing Cold',desc:'Frostbolt and Blizzard can empower Ice Lance as though the target were frozen.'},
      {id:'Brain Freeze',icon:'◉',tier:1,col:2,max:2,desc:'Frostbolt can make Flurry instant and prepare a Shatter combo.'},
      {id:'Blizzard',icon:'☁',tier:2,col:1,max:1,req:'Ice Shards',desc:'Unlock Blizzard as a sustained area frost spell.'},
      {id:'Shatter',icon:'✹',tier:2,col:3,max:2,req:'Fingers of Frost',desc:'Ice Lance and Glacial Spike deal much more damage to frozen or chilled targets.'},
      {id:'Frozen Orb',icon:'◎',tier:3,col:1,max:1,req:'Blizzard',desc:'Unlock Frozen Orb, dealing repeated frost damage through enemy packs.'},
      {id:'Thermal Void',icon:'↺',tier:3,col:3,max:2,req:'Shatter',desc:'Consuming Frost procs grants a short haste and damage surge.'},
      {id:'Glacial Spike',icon:'✦',tier:4,col:2,max:1,req:'Frozen Orb',desc:'Capstone: unlock Glacial Spike, a devastating frost finisher that excels during Shatter windows.'}
    ]
  },
  Shaman:{
    Restoration:[
      {id:'Tidal Focus',icon:'≈',tier:0,col:1,max:3,desc:'Increase healing efficiency and the strength of restorative spells.'},
      {id:'Totemic Mastery',icon:'⚑',tier:0,col:3,max:3,desc:'Strengthen your totems and keep their effects active for longer.'},
      {id:'Riptide',icon:'≋',tier:1,col:0,max:2,req:'Tidal Focus',desc:'Improve Riptide and its lingering restorative effect.'},
      {id:'Ancestral Reach',icon:'⌁',tier:1,col:2,max:2,desc:'Increase Chain Heal bounce range and improve later jumps.'},
      {id:'Chain Mastery',icon:'⛓',tier:2,col:1,max:2,req:'Riptide',desc:'Chain Heal loses less strength as it jumps between allies.'},
      {id:'Earthen Ward',icon:'⬢',tier:2,col:3,max:2,req:'Totemic Mastery',desc:'Strengthen defensive totems and their protection.'},
      {id:'Tidal Waves',icon:'🌊',tier:3,col:1,max:2,req:'Chain Mastery',desc:'Riptide and Chain Heal accelerate your next restorative cast.'},
      {id:'Spirit Link Totem',icon:'◎',tier:3,col:3,max:1,req:'Earthen Ward',desc:'Unlock Spirit Link Totem as an equipable emergency combat skill.'},
      {id:'Ascendant Tide',icon:'✦',tier:4,col:2,max:1,req:'Spirit Link Totem',desc:'Capstone: enter an ascendant state that empowers healing and totems under heavy pressure.'}
    ],
    Elemental:[
      {id:'Elemental Fury',icon:'⚡',tier:0,col:1,max:3,desc:'Increase Lightning Bolt, Chain Lightning and Lava Burst damage.'},
      {id:'Flame Shock',icon:'🔥',tier:0,col:3,max:3,desc:'Increase Flame Shock’s lingering fire damage.'},
      {id:'Lava Surge',icon:'☄',tier:1,col:0,max:2,req:'Flame Shock',desc:'Flame Shock ticks can reset Lava Burst and accelerate its next cast.'},
      {id:'Elemental Equilibrium',icon:'◈',tier:1,col:2,max:2,desc:'Alternating fire and nature magic grants a short damage surge.'},
      {id:'Aftershock',icon:'↺',tier:2,col:1,max:2,req:'Elemental Equilibrium',desc:'Maelstrom spenders can refund part of their cost.'},
      {id:'Earthquake',icon:'◎',tier:2,col:3,max:1,req:'Lava Surge',desc:'Unlock Earthquake as a heavy area Maelstrom spender.'},
      {id:'Master of the Elements',icon:'✧',tier:3,col:1,max:2,req:'Aftershock',desc:'Lava Burst empowers your next nature spell.'},
      {id:'Stormkeeper',icon:'☁',tier:3,col:3,max:1,req:'Earthquake',desc:'Unlock Stormkeeper for a powerful lightning burst window.'},
      {id:'Ascendance',icon:'✦',tier:4,col:2,max:1,req:'Master of the Elements',desc:'Capstone: unlock Ascendance and become a living storm for a major burst window.'}
    ]
  },
  Warlock:{
    Demonology:[
      {id:'Demonic Bond',icon:'⛧',tier:0,col:1,max:3,desc:'Increase the damage dealt by your Felguard and temporary demons.'},
      {id:'Fel Knowledge',icon:'✺',tier:0,col:3,max:3,desc:'Increase the power of your shadow and fel spells.'},
      {id:'Soul Strike',icon:'◆',tier:1,col:0,max:1,req:'Demonic Bond',desc:'Unlock Soul Strike, commanding your Felguard to crush your target.'},
      {id:'Dread Calling',icon:'☠',tier:1,col:2,max:2,desc:'Empower Dreadstalkers and keep them fighting for longer.'},
      {id:'Pack Tactics',icon:'⛓',tier:2,col:1,max:2,req:'Soul Strike',desc:'Your demons attack faster and stay closer to your chosen target.'},
      {id:'Felstorm',icon:'✹',tier:2,col:3,max:1,req:'Dread Calling',desc:'Unlock Felstorm, commanding your Felguard to cleave nearby enemies.'},
      {id:'Demonic Core',icon:'◈',tier:3,col:1,max:2,req:'Pack Tactics',desc:'Demon attacks can empower your next burst of spell damage.'},
      {id:'Master Summoner',icon:'◎',tier:3,col:3,max:2,req:'Felstorm',desc:'Improve the duration and recovery of temporary demon summons.'},
      {id:'Demonic Tyrant',icon:'♛',tier:4,col:2,max:1,req:'Master Summoner',desc:'Capstone: unlock Summon Demonic Tyrant, a powerful temporary ranged demon.'}
    ],
    Destruction:[
      {id:'Eradication',icon:'☄',tier:0,col:1,max:3,desc:'Chaos Bolt leaves the target vulnerable to your next destructive spells.'},
      {id:'Roaring Blaze',icon:'🔥',tier:0,col:3,max:3,desc:'Increase Immolate and Conflagrate fire damage.'},
      {id:'Backdraft',icon:'➤',tier:1,col:0,max:2,req:'Roaring Blaze',desc:'Conflagrate accelerates your next casted Destruction spell.'},
      {id:'Reverse Entropy',icon:'↺',tier:1,col:2,max:2,desc:'Spending Soul Shards can grant a short haste surge.'},
      {id:'Rain of Fire',icon:'✹',tier:2,col:1,max:1,req:'Backdraft',desc:'Unlock Rain of Fire as a heavy area Soul Shard spender.'},
      {id:'Havoc',icon:'⛓',tier:2,col:3,max:1,req:'Eradication',desc:'Chaos Bolt and Incinerate can echo damage into a second nearby enemy.'},
      {id:'Channel Demonfire',icon:'✺',tier:3,col:1,max:2,req:'Rain of Fire',desc:'Unlock Channel Demonfire, a rapid fire channel that rewards burning targets.'},
      {id:'Soul Conduit',icon:'◇',tier:3,col:3,max:2,req:'Havoc',desc:'Soul Shard spenders periodically refund part of their cost.'},
      {id:'Summon Infernal',icon:'♛',tier:4,col:2,max:1,req:'Channel Demonfire',desc:'Capstone: summon an Infernal that crashes into the battlefield and burns enemies for a short time.'}
    ]
  },
  Monk:{
    Brewmaster:[
      {id:'High Tolerance',icon:'◫',tier:0,col:1,max:3,desc:'Stagger a larger share of incoming damage and smooth dangerous spikes.'},
      {id:'Elusive Brawler',icon:'◌',tier:0,col:3,max:3,desc:'Improve physical and magical resilience while tanking.'},
      {id:'Purifying Brew',icon:'♨',tier:1,col:0,max:2,req:'High Tolerance',desc:'Purifying Brew clears a larger portion of accumulated Stagger.'},
      {id:'Keg Mastery',icon:'◎',tier:1,col:2,max:2,desc:'Increase Keg Smash damage and threat.'},
      {id:'Gift of the Ox',icon:'✚',tier:2,col:1,max:2,req:'Elusive Brawler',desc:'Taking sustained damage can create a self-healing burst.'},
      {id:'Breath of Fire',icon:'🔥',tier:2,col:3,max:1,req:'Keg Mastery',desc:'Unlock Breath of Fire for fiery pack pressure.'},
      {id:'Celestial Brew',icon:'◇',tier:3,col:1,max:2,req:'Purifying Brew',desc:'Strengthen Celestial Brew and gain extra protection while Stagger is high.'},
      {id:'Shuffle',icon:'↺',tier:3,col:3,max:2,req:'Gift of the Ox',desc:'Reduce the damage released by each Stagger tick.'},
      {id:'Fortifying Brew',icon:'✦',tier:4,col:2,max:1,req:'Celestial Brew',desc:'Capstone: unlock a major defensive brew with health recovery.'}
    ],
    Mistweaver:[
      {id:'Mist Wrap',icon:'≈',tier:0,col:1,max:3,desc:'Increase direct Mistweaver healing.'},
      {id:'Lifecycles',icon:'☯',tier:0,col:3,max:3,desc:'Reduce Mana costs by flowing between different healing techniques.'},
      {id:'Renewing Mist',icon:'≋',tier:1,col:0,max:2,req:'Mist Wrap',desc:'Strengthen Renewing Mist and its healing-over-time effect.'},
      {id:'Ancient Teachings',icon:'✥',tier:1,col:2,max:2,desc:'Martial attacks smart-heal an injured ally for part of their damage.'},
      {id:'Enveloping Breath',icon:'☁',tier:2,col:1,max:2,req:'Renewing Mist',desc:'Enveloping Mist splashes healing to additional injured allies.'},
      {id:'Jade Serpent',icon:'🐉',tier:2,col:3,max:1,req:'Lifecycles',desc:'Healing casts can call a small additional jade-serpent heal.'},
      {id:'Rising Mist',icon:'☀',tier:3,col:1,max:2,req:'Ancient Teachings',desc:'Increase fistweaving healing and reward Rising Sun Kick.'},
      {id:'Mana Tea',icon:'♨',tier:3,col:3,max:2,req:'Jade Serpent',desc:'Improve Mana efficiency and passive recovery.'},
      {id:'Revival',icon:'✦',tier:4,col:2,max:1,req:'Enveloping Breath',desc:'Capstone: unlock Revival, an instant emergency party heal.'}
    ],
    Windwalker:[
      {id:'Combo Strikes',icon:'☯',tier:0,col:1,max:3,desc:'Rotating different attacks increases damage; repeating the same technique loses efficiency.'},
      {id:'Ferocity',icon:'✹',tier:0,col:3,max:3,desc:'Increase core martial damage.'},
      {id:'Rising Sun Kick',icon:'☀',tier:1,col:0,max:2,req:'Combo Strikes',desc:'Increase Rising Sun Kick damage.'},
      {id:'Dance of the Wind',icon:'◌',tier:1,col:2,max:2,desc:'Improve defensive movement and personal mitigation.'},
      {id:'Fists of Fury',icon:'✊',tier:2,col:1,max:1,req:'Rising Sun Kick',desc:'Unlock Fists of Fury, a powerful cleaving technique.'},
      {id:'Jade Ignition',icon:'◆',tier:2,col:3,max:2,req:'Ferocity',desc:'Area attacks deal additional cleave damage.'},
      {id:'Momentum',icon:'➤',tier:3,col:1,max:2,req:'Fists of Fury',desc:'Successful Combo Strikes grant a short haste surge.'},
      {id:'Serenity',icon:'◇',tier:3,col:3,max:2,req:'Dance of the Wind',desc:'Reduce martial ability costs and cooldowns.'},
      {id:'Touch of Death',icon:'☠',tier:4,col:2,max:1,req:'Momentum',desc:'Capstone: unlock a deadly execute against weakened enemies.'}
    ]
  },
  'Death Knight':{
    Blood:[
      {id:'Heartbreaker',icon:'♥',tier:0,col:1,max:3,desc:'Heart Strike deals more damage, generates more Runic Power and produces additional threat.'},
      {id:'Ossuary',icon:'☠',tier:0,col:3,max:3,desc:'Marrowrend strengthens Bone Shield, reducing incoming damage.'},
      {id:'Hemostasis',icon:'🩸',tier:1,col:0,max:2,req:'Heartbreaker',desc:'Blood Boil empowers your next Death Strike.'},
      {id:'Rune Tap',icon:'◇',tier:1,col:2,max:1,desc:'Unlock Rune Tap as a short defensive cooldown.'},
      {id:'Blood Shield',icon:'⬢',tier:2,col:1,max:2,req:'Ossuary',desc:'Death Strike grants a short protective blood shield.'},
      {id:'Voracious',icon:'✚',tier:2,col:3,max:2,req:'Hemostasis',desc:'Increase the healing returned by Death Strike.'},
      {id:'Dancing Rune Weapon',icon:'⚔',tier:3,col:1,max:1,req:'Blood Shield',desc:'Unlock Dancing Rune Weapon, increasing defence and threat during dangerous windows.'},
      {id:'Red Thirst',icon:'♨',tier:3,col:3,max:2,req:'Rune Tap',desc:'Reduce the cooldown of Blood defensive abilities.'},
      {id:'Vampiric Blood',icon:'✦',tier:4,col:2,max:1,req:'Dancing Rune Weapon',desc:'Capstone: unlock Vampiric Blood for emergency healing and damage reduction.'}
    ],
    Frost:[
      {id:'Killing Machine',icon:'❄',tier:0,col:1,max:3,desc:'Increase critical strike chance for Obliterate and heavy Frost attacks.'},
      {id:'Icy Talons',icon:'✣',tier:0,col:3,max:3,desc:'Frost Strike grants a short haste surge.'},
      {id:'Rime',icon:'✧',tier:1,col:0,max:2,req:'Killing Machine',desc:'Increase Howling Blast damage and Runic Power generation.'},
      {id:'Obliteration',icon:'✕',tier:1,col:2,max:2,desc:'Increase Obliterate damage and reward alternating generators and spenders.'},
      {id:'Runic Empowerment',icon:'◆',tier:2,col:1,max:2,req:'Rime',desc:'Runic Power spenders have a chance to restore additional Runic Power.'},
      {id:'Remorseless Winter',icon:'❆',tier:2,col:3,max:1,req:'Icy Talons',desc:'Unlock Remorseless Winter for sustained cleave.'},
      {id:'Avalanche',icon:'△',tier:3,col:1,max:2,req:'Runic Empowerment',desc:'Critical frost attacks splash extra damage to nearby enemies.'},
      {id:'Frozen Pulse',icon:'◈',tier:3,col:3,max:2,req:'Remorseless Winter',desc:'Low Runic Power increases your generator damage.'},
      {id:'Breath of Sindragosa',icon:'✦',tier:4,col:2,max:1,req:'Avalanche',desc:'Capstone: unlock a devastating frost breath that cleaves enemies.'}
    ],
    Unholy:[
      {id:'Festering Wounds',icon:'☣',tier:0,col:1,max:3,desc:'Festering Strike applies additional wounds and wound bursts deal more damage.'},
      {id:'Dark Transformation',icon:'☠',tier:0,col:3,max:3,desc:'Increase Ghoul damage and unlock stronger pet-command windows.'},
      {id:'Infected Claws',icon:'✥',tier:1,col:0,max:2,req:'Festering Wounds',desc:'Your Ghoul can infect its target and increase disease pressure.'},
      {id:'Epidemic',icon:'◎',tier:1,col:2,max:2,desc:'Diseases spread additional damage into nearby enemies.'},
      {id:'Sudden Doom',icon:'◆',tier:2,col:1,max:2,req:'Infected Claws',desc:'Ghoul attacks can empower your next Death Coil.'},
      {id:'Army of the Dead',icon:'♜',tier:2,col:3,max:1,req:'Dark Transformation',desc:'Unlock Army of the Dead, summoning temporary ghouls.'},
      {id:'Unholy Pact',icon:'⛓',tier:3,col:1,max:2,req:'Sudden Doom',desc:'While undead are active, your damage and their damage increase.'},
      {id:'Defile',icon:'◉',tier:3,col:3,max:2,req:'Army of the Dead',desc:'Death and Decay becomes stronger and spreads plague damage.'},
      {id:'Apocalypse',icon:'✦',tier:4,col:2,max:1,req:'Unholy Pact',desc:'Capstone: unlock Apocalypse, bursting wounds and summoning additional undead.'}
    ]
  },
  'Demon Hunter':{
    Havoc:[
      {id:'Demon Blades',icon:'⚔',tier:0,col:1,max:3,desc:"Strengthen Demon's Bite and improve Fury generation."},
      {id:'Furious Gaze',icon:'◉',tier:0,col:3,max:3,desc:'Eye Beam grants a short burst of haste after it finishes.'},
      {id:'Initiative',icon:'➤',tier:1,col:0,max:2,req:'Demon Blades',desc:'Deal extra damage when opening on a fresh target.'},
      {id:'Soul Rending',icon:'♥',tier:1,col:2,max:2,desc:'Heavy fel attacks return a portion of their damage as healing.'},
      {id:'First Blood',icon:'✕',tier:2,col:1,max:2,req:'Initiative',desc:'Increase Blade Dance damage and cleave pressure.'},
      {id:'Fel Barrage',icon:'✹',tier:2,col:3,max:1,req:'Furious Gaze',desc:'Unlock Fel Barrage as a high-impact area skill.'},
      {id:'Demonic',icon:'⛧',tier:3,col:1,max:2,req:'First Blood',desc:'Eye Beam briefly awakens a demonic damage surge.'},
      {id:'Chaos Theory',icon:'◆',tier:3,col:3,max:2,req:'Fel Barrage',desc:'Chaos Strike deals more damage and can refund Fury.'},
      {id:'Metamorphosis',icon:'✦',tier:4,col:2,max:1,req:'Demonic',desc:'Capstone: unlock Metamorphosis for a major fel-powered burst window.'}
    ],
    Vengeance:[
      {id:'Thick Skin',icon:'⬢',tier:0,col:1,max:3,desc:'Increase physical and magical resilience while tanking.'},
      {id:'Soul Cleave',icon:'☠',tier:0,col:3,max:3,desc:'Soul Cleave restores more health from consumed Soul Fragments.'},
      {id:'Fracture',icon:'✕',tier:1,col:0,max:2,req:'Thick Skin',desc:'Shear generates additional Fury and Soul Fragments.'},
      {id:'Sigil of Flame',icon:'🔥',tier:1,col:2,max:1,desc:'Unlock Sigil of Flame for area damage and pack threat.'},
      {id:'Feed the Demon',icon:'♨',tier:2,col:1,max:2,req:'Fracture',desc:'Reduce the recovery time of Vengeance defensive skills.'},
      {id:'Spirit Bomb',icon:'◎',tier:2,col:3,max:1,req:'Soul Cleave',desc:'Unlock Spirit Bomb, consuming Soul Fragments for area damage and healing.'},
      {id:'Soul Barrier',icon:'◇',tier:3,col:1,max:2,req:'Feed the Demon',desc:'Consuming Soul Fragments grants short additional mitigation.'},
      {id:'Fiery Demise',icon:'✹',tier:3,col:3,max:2,req:'Spirit Bomb',desc:'Increase fel and fire damage dealt by Vengeance skills.'},
      {id:'Metamorphosis',icon:'✦',tier:4,col:2,max:1,req:'Soul Barrier',desc:'Capstone: unlock a powerful Vengeance Metamorphosis defensive transformation.'}
    ]
  },
  Evoker:{
    Preservation:[
      {id:'Temporal Mending',icon:'⌛',tier:0,col:1,max:3,desc:'Increase direct Preservation healing and reward careful timing.'},
      {id:'Essence Attunement',icon:'◇',tier:0,col:3,max:3,desc:'Improve Essence recovery for healing spells.'},
      {id:'Reversion',icon:'↺',tier:1,col:0,max:2,req:'Temporal Mending',desc:'Strengthen Reversion and its healing-over-time effect.'},
      {id:'Lifebind',icon:'⛓',tier:1,col:2,max:2,desc:'Verdant Embrace echoes healing onto another injured ally.'},
      {id:'Echoing Bloom',icon:'✿',tier:2,col:1,max:2,req:'Reversion',desc:'Emerald Blossom restores more health and leaves a short echo.'},
      {id:'Dream Breath',icon:'☁',tier:2,col:3,max:1,req:'Essence Attunement',desc:'Unlock Dream Breath as a powerful party-wide healing breath.'},
      {id:'Time Lord',icon:'◈',tier:3,col:1,max:2,req:'Echoing Bloom',desc:'Reduce Preservation cooldowns and improve haste during emergency healing.'},
      {id:'Cycle of Life',icon:'◎',tier:3,col:3,max:2,req:'Dream Breath',desc:'Group heals can trigger an additional delayed restorative pulse.'},
      {id:'Emerald Communion',icon:'✦',tier:4,col:2,max:1,req:'Time Lord',desc:'Capstone: unlock Emerald Communion, a major emergency party heal.'}
    ],
    Devastation:[
      {id:'Dragonfire',icon:'🔥',tier:0,col:1,max:3,desc:'Increase red dragon spell damage.'},
      {id:'Azure Mastery',icon:'❄',tier:0,col:3,max:3,desc:'Increase blue dragon spell damage and cleave.'},
      {id:'Essence Burst',icon:'◆',tier:1,col:0,max:2,req:'Dragonfire',desc:'Core attacks can trigger a free Essence spender.'},
      {id:'Burnout',icon:'☄',tier:1,col:2,max:2,desc:'Fire Breath empowers the next Living Flame.'},
      {id:'Eternity Surge',icon:'✧',tier:2,col:1,max:1,req:'Azure Mastery',desc:'Unlock Eternity Surge as a heavy blue-magic burst spell.'},
      {id:'Pyre',icon:'✹',tier:2,col:3,max:2,req:'Essence Burst',desc:'Increase Pyre damage and its area pressure.'},
      {id:'Scintillation',icon:'⚡',tier:3,col:1,max:2,req:'Eternity Surge',desc:'Disintegrate can trigger extra arcane-dragon damage.'},
      {id:'Power Swell',icon:'◉',tier:3,col:3,max:2,req:'Pyre',desc:'Essence spending grants a short haste surge.'},
      {id:'Dragonrage',icon:'✦',tier:4,col:2,max:1,req:'Scintillation',desc:'Capstone: unlock Dragonrage, a major ranged burst window.'}
    ]
  }
};

const leftSlots=['Head','Shoulders','Chest','Hands','Waist','Legs','Feet'];
const rightSlots=['Weapon','OffHand','Ring1','Ring2','Trinket1','Trinket2','Relic'];
const slotIcons={Head:'⛑',Shoulders:'⌃',Chest:'▣',Hands:'✋',Waist:'═',Legs:'║',Feet:'♟',Weapon:'⚔',OffHand:'🛡',Ring1:'◉',Ring2:'◉',Trinket1:'◆',Trinket2:'◆',Relic:'◇'};

function readState(){try{return JSON.parse(localStorage.getItem(STORAGE))}catch{return null}}
function writeState(state){localStorage.setItem(STORAGE,JSON.stringify(state));dirty=true}
function getCharacter(state,id){return state?.roster?.find(c=>c.id===id)}
function characterEditable(){const game=window.CellboundGame;return !game?.isCharacterRosterUnlocked||game.isCharacterRosterUnlocked(currentId)}
function roleOf(c){return specs[c.class]?.[c.spec]||'dps'}
function roleLabel(role){return role==='dps'?'Damage':role[0].toUpperCase()+role.slice(1)}
function combatEngine(){return window.CellboundCombatReborn||null}
const UI_SKILL_FALLBACKS={
  Priest:[
    {id:'heal',name:'Heal',kind:'heal',role:'healer',spec:'Holy',unlockLevel:1,desc:'Efficient direct healing.',range:30,heal:35,cost:13,gcd:1500,cast:1400,cd:0},
    {id:'flash-heal',name:'Flash Heal',kind:'heal',role:'healer',spec:'Holy',unlockLevel:1,desc:'Fast emergency healing.',range:30,heal:29,cost:18,gcd:1500,cast:800,cd:0},
    {id:'prayer-healing',name:'Prayer of Healing',kind:'group-heal',role:'healer',spec:'Holy',unlockLevel:1,desc:'Restore health to the whole party.',range:30,heal:18,cost:22,gcd:1500,cast:1700,cd:6500},
    {id:'smite',name:'Smite',kind:'damage',role:'healer',spec:'Holy',unlockLevel:4,desc:'A ranged holy attack for safe damage windows.',range:30,damage:13,cost:4,gcd:1500,cast:1200,cd:0,damageType:'magic'},
    {id:'soul-recall',name:'Soul Recall',kind:'battle-rez',role:'healer',spec:'Holy',unlockLevel:8,desc:'Return a fallen ally to combat. Very long cooldown.',range:30,cost:32,gcd:1500,cast:5000,cd:600000},
    {id:'guardian-spirit',name:'Guardian Spirit',kind:'defensive',role:'healer',spec:'Holy',unlockLevel:12,desc:'Reduce incoming damage for 8 seconds.',duration:8000,damageReduction:.25,gcd:0,cd:90000,talentReq:'Guardian Spirit'},
    {id:'divine-hymn',name:'Divine Hymn',kind:'group-heal',role:'healer',spec:'Holy',unlockLevel:1,desc:'A major emergency heal for the entire party.',range:30,heal:32,cost:34,gcd:1500,cast:2600,cd:35000,talentReq:'Divine Hymn'},

    {id:'mind-flay',name:'Mind Flay',kind:'damage',role:'dps',spec:'Shadow',unlockLevel:1,desc:'Channel shadow energy into the target and generate Insanity.',range:35,damage:18,cost:0,gain:12,gcd:1500,cast:1250,cd:0,damageType:'magic'},
    {id:'mind-blast',name:'Mind Blast',kind:'damage',role:'dps',spec:'Shadow',unlockLevel:1,desc:'Assault the target’s mind for heavy shadow damage and Insanity.',range:35,damage:30,cost:0,gain:18,gcd:1500,cast:1200,cd:6500,damageType:'magic'},
    {id:'devouring-plague',name:'Devouring Plague',kind:'damage',role:'dps',spec:'Shadow',unlockLevel:1,desc:'Spend Insanity to infect the target with a powerful devouring shadow plague.',range:35,damage:34,cost:50,gcd:1500,cast:0,cd:0,damageType:'magic'},
    {id:'shadow-word-pain',name:'Shadow Word: Pain',kind:'damage',role:'dps',spec:'Shadow',unlockLevel:4,desc:'Afflict the target with lingering shadow pain while generating Insanity.',range:35,damage:10,cost:0,gain:7,gcd:1500,cast:0,cd:7000,damageType:'magic'},
    {id:'vampiric-touch',name:'Vampiric Touch',kind:'damage',role:'dps',spec:'Shadow',unlockLevel:6,desc:'Apply a draining shadow curse that damages the target over time.',range:35,damage:15,cost:0,gain:10,gcd:1500,cast:1300,cd:11000,damageType:'magic'},
    {id:'shadow-crash',name:'Shadow Crash',kind:'damage',role:'dps',spec:'Shadow',unlockLevel:1,desc:'Crash shadow energy into the target and nearby enemies.',range:35,damage:28,cost:0,gain:12,gcd:1500,cast:800,cd:14000,cleave:3,damageType:'magic',talentReq:'Shadow Crash'},
    {id:'void-torrent',name:'Void Torrent',kind:'damage',role:'dps',spec:'Shadow',unlockLevel:1,desc:'Channel concentrated Void energy for heavy damage and rapid Insanity generation.',range:35,damage:42,cost:0,gain:28,gcd:1500,cast:1900,cd:30000,damageType:'magic',talentReq:'Void Torrent'},
    {id:'void-eruption',name:'Void Eruption',kind:'damage',role:'dps',spec:'Shadow',unlockLevel:1,desc:'Spend Insanity to erupt with Void energy and enter Voidform.',range:35,damage:44,cost:40,gcd:1500,cast:1100,cd:60000,cleave:3,damageType:'magic',talentReq:'Void Eruption'},
    {id:'dispersion',name:'Dispersion',kind:'defensive',role:'dps',spec:'Shadow',unlockLevel:8,desc:'Disperse into shadow, greatly reducing incoming damage for 6 seconds.',duration:6000,damageReduction:.40,gcd:0,cd:75000},
    {id:'silence',name:'Silence',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast from range.',range:30,cost:0,gcd:0,cd:30000}
  ],
  Druid:[
    {id:'rejuvenation',name:'Rejuvenation',kind:'heal',role:'healer',spec:'Restoration',unlockLevel:1,desc:'An efficient heal with a short healing-over-time effect.',range:30,heal:22,cost:10,gcd:1500,cast:0,cd:0,hot:8},
    {id:'regrowth',name:'Regrowth',kind:'heal',role:'healer',spec:'Restoration',unlockLevel:1,desc:'A stronger direct heal for injured allies.',range:30,heal:34,cost:18,gcd:1500,cast:1100,cd:0},
    {id:'wild-growth',name:'Wild Growth',kind:'group-heal',role:'healer',spec:'Restoration',unlockLevel:1,desc:'Restore health to the whole party.',range:30,heal:15,cost:22,gcd:1500,cast:0,cd:8000},
    {id:'restoration-wrath',name:'Wrath',kind:'damage',role:'healer',spec:'Restoration',unlockLevel:4,desc:'A ranged nature attack for safe damage windows.',range:30,damage:14,cost:4,gcd:1500,cast:1200,cd:0,damageType:'magic'},
    {id:'tranquility',name:'Tranquility',kind:'group-heal',role:'healer',spec:'Restoration',unlockLevel:1,desc:'A powerful emergency party heal with a long cooldown.',range:30,heal:30,cost:32,gcd:1500,cast:2500,cd:30000,talentReq:'Tranquility'},

    {id:'wrath',name:'Wrath',kind:'damage',role:'dps',spec:'Balance',unlockLevel:1,desc:'Cast nature magic to generate Astral Power and move toward Lunar Eclipse.',range:35,damage:19,cost:0,gain:10,gcd:1500,cast:1200,cd:0,damageType:'magic',school:'nature'},
    {id:'starfire',name:'Starfire',kind:'damage',role:'dps',spec:'Balance',unlockLevel:1,desc:'Cast arcane stellar magic to generate Astral Power and move toward Solar Eclipse.',range:35,damage:22,cost:0,gain:12,gcd:1500,cast:1450,cd:0,cleave:1,damageType:'magic',school:'arcane'},
    {id:'starsurge',name:'Starsurge',kind:'damage',role:'dps',spec:'Balance',unlockLevel:1,desc:'Spend Astral Power on a heavy single-target astral strike.',range:35,damage:40,cost:40,gcd:1500,cast:0,cd:0,damageType:'magic',school:'astral'},
    {id:'moonfire',name:'Moonfire',kind:'damage',role:'dps',spec:'Balance',unlockLevel:4,desc:'Burn the target with lunar magic that continues dealing damage.',range:35,damage:11,cost:0,gain:6,gcd:1500,cast:0,cd:7000,damageType:'magic',school:'arcane'},
    {id:'sunfire',name:'Sunfire',kind:'damage',role:'dps',spec:'Balance',unlockLevel:6,desc:'Scorch the target with solar nature magic and spread pressure into nearby enemies.',range:35,damage:12,cost:0,gain:6,gcd:1500,cast:0,cd:7000,cleave:2,damageType:'magic',school:'nature'},
    {id:'starfall',name:'Starfall',kind:'damage',role:'dps',spec:'Balance',unlockLevel:1,desc:'Spend Astral Power to call falling stars across the enemy pack.',range:35,damage:32,cost:50,gcd:1500,cast:700,cd:8000,cleave:4,damageType:'magic',school:'astral',talentReq:'Starfall'},
    {id:'fury-of-elune',name:'Fury of Elune',kind:'damage',role:'dps',spec:'Balance',unlockLevel:1,desc:'Channel an astral beam through the enemy pack while generating Astral Power.',range:35,damage:38,cost:0,gain:24,gcd:1500,cast:1600,cd:30000,cleave:3,damageType:'magic',school:'astral',talentReq:'Fury of Elune'},
    {id:'celestial-alignment',name:'Celestial Alignment',kind:'damage',role:'dps',spec:'Balance',unlockLevel:1,desc:'Align the heavens and empower Solar and Lunar magic simultaneously.',range:35,damage:36,cost:20,gcd:1500,cast:900,cd:60000,cleave:2,damageType:'magic',school:'astral',talentReq:'Celestial Alignment'},
    {id:'solar-beam',name:'Solar Beam',kind:'interrupt',role:'dps',spec:'Balance',unlockLevel:1,desc:'Silence an enemy cast with focused solar energy.',range:30,cost:0,gcd:0,cd:30000},
    {id:'barkskin',name:'Barkskin',kind:'defensive',unlockLevel:8,desc:'Reduce incoming damage for 8 seconds.',duration:8000,damageReduction:.20,gcd:0,cd:60000},
    {id:'skull-bash',name:'Skull Bash',kind:'interrupt',role:'healer',spec:'Restoration',unlockLevel:1,desc:'Interrupt an enemy cast.',range:13,cost:0,gcd:0,cd:15000}
  ],
  Hunter:[
    {id:'aimed-shot',name:'Aimed Shot',kind:'damage',role:'dps',spec:'Marksman',unlockLevel:1,desc:'A slow, heavy ranged shot.',range:35,damage:31,cost:35,gcd:1500,cast:1500,cd:7000},
    {id:'arcane-shot',name:'Arcane Shot',kind:'damage',role:'dps',spec:'Marksman',unlockLevel:1,desc:'Reliable ranged damage.',range:35,damage:17,cost:20,gcd:1500,cd:0},
    {id:'steady-shot',name:'Steady Shot',kind:'damage',role:'dps',spec:'Marksman',unlockLevel:1,desc:'Generate Focus while maintaining ranged pressure.',range:35,damage:11,cost:0,gain:18,gcd:1500,cast:900,cd:0},
    {id:'multi-shot',name:'Multi-Shot',kind:'damage',role:'dps',spec:'Marksman',unlockLevel:5,desc:'Strike the target and nearby enemies.',range:35,damage:14,cost:30,gcd:1500,cd:6000,cleave:2},
    {id:'kill-shot',name:'Kill Shot',kind:'damage',role:'dps',spec:'Marksman',unlockLevel:1,desc:'A finishing attack that becomes deadly against weakened enemies.',range:35,damage:24,cost:20,gcd:1500,cd:10000,executeBelow:.20,executeMultiplier:1.85,talentReq:'Kill Shot'},

    {id:'cobra-shot',name:'Cobra Shot',kind:'damage',role:'dps',spec:'Beast Mastery',unlockLevel:1,desc:'Fire a fast shot while directing your beast, spending Focus for mobile pressure.',range:35,damage:18,cost:25,gcd:1500,cast:0,cd:0},
    {id:'barbed-shot',name:'Barbed Shot',kind:'damage',role:'dps',spec:'Beast Mastery',unlockLevel:1,desc:'Wound the target, generate Focus and drive your permanent beast into a frenzy.',range:35,damage:16,cost:0,gain:18,gcd:1500,cast:0,cd:8000},
    {id:'kill-command',name:'Kill Command',kind:'pet-command',role:'dps',spec:'Beast Mastery',unlockLevel:1,desc:'Command your permanent beast to tear into the target.',range:35,cost:30,gcd:1000,cd:7000,petCommand:'kill-command'},
    {id:'beast-multi-shot',name:'Multi-Shot',kind:'damage',role:'dps',spec:'Beast Mastery',unlockLevel:5,desc:'Strike several enemies and trigger Beast Cleave when talented.',range:35,damage:13,cost:30,gcd:1500,cd:6000,cleave:3},
    {id:'dire-beast',name:'Dire Beast',kind:'summon',role:'dps',spec:'Beast Mastery',unlockLevel:1,desc:'Call a temporary beast that attacks your target and generates Focus.',range:35,cost:0,gain:15,gcd:1500,cast:0,cd:24000,duration:12000,summonType:'dire-beast',summonCount:1,talentReq:'Dire Beast'},
    {id:'stampede',name:'Stampede',kind:'summon',role:'dps',spec:'Beast Mastery',unlockLevel:1,desc:'Call a stampede of beasts through the enemy pack.',range:35,cost:20,gcd:1500,cast:700,cd:45000,duration:9000,summonType:'stampede-beast',summonCount:3,talentReq:'Stampede'},
    {id:'bestial-wrath',name:'Bestial Wrath',kind:'pet-command',role:'dps',spec:'Beast Mastery',unlockLevel:1,desc:'Empower yourself and your permanent beast for a major burst window.',range:35,cost:20,gcd:1000,cd:60000,petCommand:'bestial-wrath',talentReq:'Bestial Wrath'},
    {id:'counter-shot',name:'Counter Shot',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast from range.',range:35,cost:0,gcd:0,cd:24000},
    {id:'survival-instincts',name:'Survival Instincts',kind:'defensive',unlockLevel:13,desc:'Reduce incoming damage for 8 seconds.',duration:8000,damageReduction:.20,gcd:0,cd:75000}
  ],
  Rogue:[
    {id:'mutilate',name:'Mutilate',kind:'damage',role:'dps',spec:'Assassination',unlockLevel:1,desc:'Reliable melee damage.',range:5,damage:18,cost:35,gcd:1000,cd:0},
    {id:'eviscerate',name:'Eviscerate',kind:'damage',role:'dps',spec:'Assassination',unlockLevel:1,desc:'A hard-hitting finishing attack.',range:5,damage:30,cost:50,gcd:1000,cd:5000},
    {id:'garrote',name:'Garrote',kind:'damage',role:'dps',spec:'Assassination',unlockLevel:1,desc:'A sharp opening attack with a short cooldown.',range:5,damage:21,cost:30,gcd:1000,cd:7000,talentReq:'Garrote'},
    {id:'envenom',name:'Envenom',kind:'damage',role:'dps',spec:'Assassination',unlockLevel:5,desc:'Spend Energy for a heavy poisoned strike.',range:5,damage:28,cost:45,gcd:1000,cd:6500,talentReq:'Envenom'},
    {id:'fan-of-knives',name:'Fan of Knives',kind:'damage',role:'dps',spec:'Assassination',unlockLevel:9,desc:'Strike the target and nearby enemies.',range:8,damage:15,cost:35,gcd:1000,cd:7000,cleave:3},

    {id:'sinister-strike',name:'Sinister Strike',kind:'damage',role:'dps',spec:'Outlaw',unlockLevel:1,desc:'A fast sabre strike that generates one Combo Point.',range:5,damage:17,cost:35,gcd:1000,cd:0,comboGain:1},
    {id:'pistol-shot',name:'Pistol Shot',kind:'damage',role:'dps',spec:'Outlaw',unlockLevel:1,desc:'Fire a pistol at short range; Opportunity makes it faster, stronger and more productive.',range:18,damage:16,cost:20,gcd:1000,cd:0,comboGain:1},
    {id:'dispatch',name:'Dispatch',kind:'damage',role:'dps',spec:'Outlaw',unlockLevel:1,desc:'Spend Combo Points on a powerful melee finisher.',range:5,damage:34,cost:25,gcd:1000,cd:0,comboCost:4,finisher:true},
    {id:'roll-the-bones',name:'Roll the Bones',kind:'damage',role:'dps',spec:'Outlaw',unlockLevel:4,desc:'Spend Combo Points to roll a temporary combat advantage.',range:5,damage:8,cost:15,gcd:1000,cd:12000,comboCost:3,finisher:true},
    {id:'blade-flurry',name:'Blade Flurry',kind:'damage',role:'dps',spec:'Outlaw',unlockLevel:1,desc:'Enter a cleaving stance that echoes melee damage into nearby enemies.',range:5,damage:18,cost:25,gcd:1000,cd:15000,cleave:2,talentReq:'Blade Flurry'},
    {id:'between-the-eyes',name:'Between the Eyes',kind:'damage',role:'dps',spec:'Outlaw',unlockLevel:1,desc:'Spend Combo Points on a pistol finisher that creates a critical-strike window.',range:18,damage:38,cost:25,gcd:1000,cd:18000,comboCost:4,finisher:true,talentReq:'Between the Eyes'},
    {id:'adrenaline-rush',name:'Adrenaline Rush',kind:'damage',role:'dps',spec:'Outlaw',unlockLevel:1,desc:'Enter a burst state with greatly increased Energy recovery and attack speed.',range:5,damage:14,cost:0,gcd:1000,cd:60000,talentReq:'Adrenaline Rush'},
    {id:'killing-spree',name:'Killing Spree',kind:'damage',role:'dps',spec:'Outlaw',unlockLevel:1,desc:'Rapidly strike the target and nearby enemies in a short burst.',range:8,damage:42,cost:35,gcd:1000,cast:800,cd:60000,cleave:2,talentReq:'Killing Spree'},
    {id:'kick',name:'Kick',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast.',range:5,cost:0,gcd:0,cd:15000},
    {id:'feint',name:'Feint',kind:'defensive',unlockLevel:13,desc:'Reduce incoming damage for 8 seconds.',duration:8000,damageReduction:.20,gcd:0,cd:60000}
  ],
  Mage:[
    {id:'pyroblast',name:'Pyroblast',kind:'damage',role:'dps',spec:'Arcane',unlockLevel:1,desc:'A slow, devastating ranged spell.',range:35,damage:36,cost:14,gcd:1500,cast:2200,cd:8000,damageType:'magic'},
    {id:'fireball',name:'Fireball',kind:'damage',role:'dps',spec:'Arcane',unlockLevel:1,desc:'Reliable ranged spell damage.',range:35,damage:24,cost:8,gcd:1500,cast:1700,cd:0,damageType:'magic'},
    {id:'fire-blast',name:'Fire Blast',kind:'damage',role:'dps',spec:'Arcane',unlockLevel:1,desc:'An instant burst of damage.',range:35,damage:16,cost:4,gcd:0,cast:0,cd:9000,damageType:'magic'},
    {id:'arcane-barrage',name:'Arcane Barrage',kind:'damage',role:'dps',spec:'Arcane',unlockLevel:5,desc:'An instant ranged attack with a short cooldown.',range:35,damage:25,cost:12,gcd:1500,cd:5000,damageType:'magic',talentReq:'Barrage'},
    {id:'arcane-nova',name:'Arcane Nova',kind:'damage',role:'dps',spec:'Arcane',unlockLevel:13,desc:'Burst the target and nearby enemies with arcane energy.',range:25,damage:22,cost:18,gcd:1500,cd:10000,cleave:3,damageType:'magic'},

    {id:'frostbolt',name:'Frostbolt',kind:'damage',role:'dps',spec:'Frost',unlockLevel:1,desc:'Launch a bolt of frost and fish for Frost procs.',range:35,damage:20,cost:6,gcd:1500,cast:1450,cd:0,damageType:'magic'},
    {id:'ice-lance',name:'Ice Lance',kind:'damage',role:'dps',spec:'Frost',unlockLevel:1,desc:'An instant frost shard that becomes deadly against frozen targets.',range:35,damage:14,cost:5,gcd:1500,cast:0,cd:0,damageType:'magic'},
    {id:'flurry',name:'Flurry',kind:'damage',role:'dps',spec:'Frost',unlockLevel:1,desc:'A rapid sequence of frost bolts that can prepare a Shatter window.',range:35,damage:27,cost:10,gcd:1500,cast:950,cd:8000,damageType:'magic'},
    {id:'blizzard',name:'Blizzard',kind:'damage',role:'dps',spec:'Frost',unlockLevel:1,desc:'Blanket the enemy pack in freezing magic.',range:35,damage:20,cost:16,gcd:1500,cast:1400,cd:8000,cleave:4,damageType:'magic',talentReq:'Blizzard'},
    {id:'frozen-orb',name:'Frozen Orb',kind:'damage',role:'dps',spec:'Frost',unlockLevel:1,desc:'Launch an orb that repeatedly lashes nearby enemies with frost.',range:35,damage:30,cost:18,gcd:1500,cast:700,cd:24000,cleave:3,damageType:'magic',talentReq:'Frozen Orb'},
    {id:'glacial-spike',name:'Glacial Spike',kind:'damage',role:'dps',spec:'Frost',unlockLevel:1,desc:'Hurl a massive spike of compressed ice for devastating burst.',range:35,damage:48,cost:24,gcd:1500,cast:1800,cd:18000,damageType:'magic',talentReq:'Glacial Spike'},
    {id:'counterspell',name:'Counterspell',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast from range.',range:35,cost:0,gcd:0,cd:24000},
    {id:'ice-barrier',name:'Ice Barrier',kind:'defensive',role:'dps',spec:'Frost',unlockLevel:8,desc:'Wrap yourself in ice, reducing incoming damage for 8 seconds.',duration:8000,damageReduction:.25,gcd:0,cd:60000}
  ],
  Shaman:[
    {id:'healing-wave',name:'Healing Wave',kind:'heal',role:'healer',spec:'Restoration',unlockLevel:1,desc:'A dependable restorative cast for an injured ally.',range:30,heal:36,cost:14,gcd:1500,cast:1450,cd:0},
    {id:'riptide',name:'Riptide',kind:'heal',role:'healer',spec:'Restoration',unlockLevel:1,desc:'An instant tidal heal that continues restoring health briefly.',range:30,heal:23,cost:10,gcd:1500,cast:0,cd:6000,hot:7},
    {id:'chain-heal',name:'Chain Heal',kind:'group-heal',role:'healer',spec:'Restoration',unlockLevel:1,desc:'Heal one ally, then bounce restorative energy through other injured party members.',range:30,heal:30,cost:20,gcd:1500,cast:1700,cd:0,chainBounces:3,chainFalloff:.72,chainRange:16},
    {id:'windfury-totem',name:'Windfury Totem',kind:'totem',role:'healer',spec:'Restoration',unlockLevel:1,desc:'Place a Windfury Totem that increases party damage and haste while it remains active.',cost:8,gcd:1000,cd:45000,duration:20000,totemType:'windfury'},
    {id:'stoneskin-totem',name:'Stoneskin Totem',kind:'totem',role:'healer',spec:'Restoration',unlockLevel:1,desc:'Place a Stoneskin Totem that reduces damage taken by the party while it remains active.',cost:10,gcd:1000,cd:45000,duration:20000,totemType:'stoneskin'},
    {id:'healing-stream-totem',name:'Healing Stream Totem',kind:'totem',role:'healer',spec:'Restoration',unlockLevel:1,desc:'Place a Healing Stream Totem that pulses healing through the party while it remains active.',cost:12,gcd:1000,cd:30000,duration:20000,totemType:'healing-stream'},
    {id:'spirit-link-totem',name:'Spirit Link Totem',kind:'totem',role:'healer',spec:'Restoration',unlockLevel:1,desc:'Place an emergency Spirit Link Totem that protects and stabilises injured allies.',cost:18,gcd:1000,cd:75000,duration:8000,totemType:'spirit-link',talentReq:'Spirit Link Totem'},
    {id:'restoration-lightning-bolt',name:'Lightning Bolt',kind:'damage',role:'healer',spec:'Restoration',unlockLevel:4,desc:'A ranged lightning attack for safe damage windows.',range:30,damage:13,cost:4,gcd:1500,cast:1200,cd:0,damageType:'magic'},
    {id:'healing-rain',name:'Healing Rain',kind:'group-heal',role:'healer',spec:'Restoration',unlockLevel:8,desc:'Call restorative rain over the party for broad recovery.',range:30,heal:16,cost:24,gcd:1500,cast:1200,cd:10000},

    {id:'lightning-bolt',name:'Lightning Bolt',kind:'damage',role:'dps',spec:'Elemental',unlockLevel:1,desc:'Hurl lightning at the target and generate Maelstrom.',range:35,damage:19,cost:0,gain:12,gcd:1500,cast:1250,cd:0,damageType:'magic'},
    {id:'lava-burst',name:'Lava Burst',kind:'damage',role:'dps',spec:'Elemental',unlockLevel:1,desc:'Launch molten lava for heavy fire damage and generate Maelstrom.',range:35,damage:31,cost:0,gain:16,gcd:1500,cast:1400,cd:8000,damageType:'magic'},
    {id:'earth-shock',name:'Earth Shock',kind:'damage',role:'dps',spec:'Elemental',unlockLevel:1,desc:'Spend Maelstrom to strike the target with a violent earth shock.',range:35,damage:39,cost:60,gcd:1500,cast:0,cd:0,damageType:'magic'},
    {id:'chain-lightning',name:'Chain Lightning',kind:'damage',role:'dps',spec:'Elemental',unlockLevel:4,desc:'Arc lightning through the target and nearby enemies while generating Maelstrom.',range:35,damage:17,cost:0,gain:10,gcd:1500,cast:1350,cd:5000,cleave:3,damageType:'magic'},
    {id:'flame-shock',name:'Flame Shock',kind:'damage',role:'dps',spec:'Elemental',unlockLevel:6,desc:'Burn the target with fire that continues dealing damage and generates Maelstrom.',range:35,damage:12,cost:0,gain:8,gcd:1500,cast:0,cd:8000,damageType:'magic'},
    {id:'earthquake',name:'Earthquake',kind:'damage',role:'dps',spec:'Elemental',unlockLevel:1,desc:'Spend Maelstrom to rupture the ground beneath the enemy pack.',range:35,damage:34,cost:60,gcd:1500,cast:900,cd:6000,cleave:4,damageType:'magic',talentReq:'Earthquake'},
    {id:'stormkeeper',name:'Stormkeeper',kind:'damage',role:'dps',spec:'Elemental',unlockLevel:1,desc:'Call down a storm and enter a short lightning burst window.',range:35,damage:30,cost:0,gain:10,gcd:1500,cast:900,cd:45000,cleave:2,damageType:'magic',talentReq:'Stormkeeper'},
    {id:'ascendance',name:'Ascendance',kind:'damage',role:'dps',spec:'Elemental',unlockLevel:1,desc:'Become a living storm and unleash a major Elemental burst window.',range:35,damage:42,cost:30,gcd:1500,cast:900,cd:60000,cleave:3,damageType:'magic',talentReq:'Ascendance'},
    {id:'wind-shear',name:'Wind Shear',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast with a sharp burst of wind.',range:30,cost:0,gcd:0,cd:18000},
    {id:'astral-shift',name:'Astral Shift',kind:'defensive',unlockLevel:8,desc:'Shift partially into the spirit world, reducing incoming damage for 8 seconds.',duration:8000,damageReduction:.25,gcd:0,cd:75000}
  ],
  Warlock:[
    {id:'shadow-bolt',name:'Shadow Bolt',kind:'damage',role:'dps',spec:'Demonology',unlockLevel:1,desc:'A reliable ranged shadow spell.',range:35,damage:19,cost:6,gcd:1500,cast:1450,cd:0,damageType:'magic'},
    {id:'demonbolt',name:'Demonbolt',kind:'damage',role:'dps',spec:'Demonology',unlockLevel:1,desc:'Hurl concentrated demonic energy at the target.',range:35,damage:29,cost:11,gcd:1500,cast:1800,cd:6000,damageType:'magic'},
    {id:'hand-of-guldan',name:"Hand of Gul'dan",kind:'damage',role:'dps',spec:'Demonology',unlockLevel:1,desc:'Call down fel energy on the target and nearby enemies.',range:35,damage:23,cost:15,gcd:1500,cast:1500,cd:7000,cleave:2,damageType:'magic'},
    {id:'call-dreadstalkers',name:'Call Dreadstalkers',kind:'summon',role:'dps',spec:'Demonology',unlockLevel:1,desc:'Summon two Dreadstalkers to maul your enemies for a short time.',range:35,cost:16,gcd:1500,cast:1200,cd:20000,duration:12000,summonType:'dreadstalker',summonCount:2},
    {id:'soul-strike',name:'Soul Strike',kind:'pet-command',role:'dps',spec:'Demonology',unlockLevel:1,desc:'Command your Felguard to deliver a crushing soul-infused strike.',range:30,cost:8,gcd:1000,cd:10000,petCommand:'soul-strike',talentReq:'Soul Strike'},
    {id:'felstorm',name:'Felstorm',kind:'pet-command',role:'dps',spec:'Demonology',unlockLevel:1,desc:'Command your Felguard to spin through several nearby enemies.',range:30,cost:12,gcd:1000,cd:18000,petCommand:'felstorm',cleave:3,talentReq:'Felstorm'},
    {id:'implosion',name:'Implosion',kind:'pet-command',role:'dps',spec:'Demonology',unlockLevel:10,desc:'Detonate your temporary demons into the target for explosive area damage.',range:35,cost:10,gcd:1500,cd:16000,petCommand:'implosion',cleave:3},
    {id:'summon-demonic-tyrant',name:'Summon Demonic Tyrant',kind:'summon',role:'dps',spec:'Demonology',unlockLevel:1,desc:'Summon a Demonic Tyrant that bombards enemies and empowers your active demons.',range:35,cost:20,gcd:1500,cast:1600,cd:60000,duration:15000,summonType:'tyrant',summonCount:1,talentReq:'Demonic Tyrant'},

    {id:'incinerate',name:'Incinerate',kind:'damage',role:'dps',spec:'Destruction',unlockLevel:1,desc:'Scorch the target and generate Soul Shards.',range:35,damage:19,cost:0,gain:.5,gcd:1500,cast:1450,cd:0,damageType:'magic',school:'fire'},
    {id:'conflagrate',name:'Conflagrate',kind:'damage',role:'dps',spec:'Destruction',unlockLevel:1,desc:'Instantly blast the target with fire and generate a Soul Shard.',range:35,damage:22,cost:0,gain:1,gcd:1500,cast:0,cd:10000,damageType:'magic',school:'fire'},
    {id:'chaos-bolt',name:'Chaos Bolt',kind:'damage',role:'dps',spec:'Destruction',unlockLevel:1,desc:'Spend Soul Shards on a devastating bolt of chaotic fire.',range:35,damage:48,cost:2,gcd:1500,cast:2100,cd:0,damageType:'magic',school:'chaos'},
    {id:'immolate',name:'Immolate',kind:'damage',role:'dps',spec:'Destruction',unlockLevel:4,desc:'Burn the target over time and generate Soul Shard fragments from the flames.',range:35,damage:11,cost:0,gain:.5,gcd:1500,cast:1200,cd:9000,damageType:'magic',school:'fire'},
    {id:'rain-of-fire',name:'Rain of Fire',kind:'damage',role:'dps',spec:'Destruction',unlockLevel:1,desc:'Spend Soul Shards to rain fire across the enemy pack.',range:35,damage:34,cost:3,gcd:1500,cast:900,cd:7000,cleave:4,damageType:'magic',school:'fire',talentReq:'Rain of Fire'},
    {id:'channel-demonfire',name:'Channel Demonfire',kind:'damage',role:'dps',spec:'Destruction',unlockLevel:1,desc:'Channel waves of demonfire into burning targets.',range:35,damage:40,cost:0,gain:.5,gcd:1500,cast:1800,cd:24000,cleave:2,damageType:'magic',school:'fire',talentReq:'Channel Demonfire'},
    {id:'summon-infernal',name:'Summon Infernal',kind:'summon',role:'dps',spec:'Destruction',unlockLevel:1,desc:'Crash an Infernal into the enemy pack to burn them for a short time.',range:35,cost:2,gcd:1500,cast:1200,cd:60000,duration:14000,summonType:'infernal',summonCount:1,talentReq:'Summon Infernal'},
    {id:'shadowfury',name:'Shadowfury',kind:'interrupt',role:'dps',spec:'Destruction',unlockLevel:1,desc:'Disrupt an enemy cast with a burst of shadow force.',range:30,cost:0,gcd:0,cd:24000},
    {id:'dark-pact',name:'Dark Pact',kind:'defensive',unlockLevel:8,desc:'Wrap yourself in demonic power, reducing incoming damage for 8 seconds.',duration:8000,damageReduction:.25,gcd:0,cd:75000},
    {id:'axe-toss',name:'Axe Toss',kind:'interrupt',role:'dps',spec:'Demonology',unlockLevel:1,desc:'Command your Felguard to hurl its weapon and interrupt an enemy cast.',range:30,cost:0,gcd:0,cd:20000}
  ],
  Monk:[
    {id:'keg-smash',name:'Keg Smash',kind:'damage',role:'tank',unlockLevel:1,desc:'Smash the target and nearby enemies with heavy threat.',range:8,damage:20,cost:25,gcd:1000,cd:8000,threat:3,cleave:3},
    {id:'brewmaster-blackout-kick',name:'Blackout Kick',kind:'damage',role:'tank',unlockLevel:1,desc:'Reliable Brewmaster melee pressure.',range:5,damage:16,cost:18,gcd:1000,cd:3000,threat:2.2},
    {id:'provoke',name:'Provoke',kind:'taunt',role:'tank',unlockLevel:1,desc:'Challenge an enemy and force its attention onto the Brewmaster.',range:30,cost:0,gcd:0,cd:8000,threat:5},
    {id:'purifying-brew',name:'Purifying Brew',kind:'defensive',role:'tank',unlockLevel:1,desc:'Clear a large portion of accumulated Stagger damage.',duration:1000,damageReduction:0,gcd:0,cd:12000,purifyStagger:.50},
    {id:'celestial-brew',name:'Celestial Brew',kind:'defensive',role:'tank',unlockLevel:6,desc:'Reduce incoming damage while your brews stabilise you.',duration:7000,damageReduction:.28,gcd:0,cd:45000},
    {id:'breath-of-fire',name:'Breath of Fire',kind:'damage',role:'tank',unlockLevel:1,desc:'Breathe fire across the target and nearby enemies.',range:8,damage:18,cost:20,gcd:1000,cd:12000,cleave:3,threat:2.4,talentReq:'Breath of Fire'},
    {id:'fortifying-brew',name:'Fortifying Brew',kind:'defensive',role:'tank',unlockLevel:1,desc:'Major defensive brew that also restores health.',duration:10000,damageReduction:.35,selfHealPct:.15,gcd:0,cd:90000,talentReq:'Fortifying Brew'},
    {id:'soothing-mist',name:'Soothing Mist',kind:'heal',role:'healer',unlockLevel:1,desc:'Efficient focused healing through soothing mist.',range:30,heal:29,cost:10,gcd:1500,cast:950,cd:0},
    {id:'vivify',name:'Vivify',kind:'heal',role:'healer',unlockLevel:1,desc:'A strong direct heal for an injured ally.',range:30,heal:35,cost:15,gcd:1500,cast:1250,cd:0},
    {id:'renewing-mist',name:'Renewing Mist',kind:'heal',role:'healer',unlockLevel:1,desc:'Instant healing that continues restoring the target over time.',range:30,heal:20,cost:11,gcd:1500,cast:0,cd:6000,hot:7},
    {id:'essence-font',name:'Essence Font',kind:'group-heal',role:'healer',unlockLevel:6,desc:'Release a wave of healing across the party.',range:30,heal:16,cost:23,gcd:1500,cast:1500,cd:9000},
    {id:'mist-rising-sun-kick',name:'Rising Sun Kick',kind:'damage',role:'healer',unlockLevel:4,desc:'A martial strike that can fuel fistweaving healing.',range:5,damage:19,cost:5,gcd:1000,cd:8000},
    {id:'mist-tiger-palm',name:'Tiger Palm',kind:'damage',role:'healer',unlockLevel:4,desc:'A quick martial strike for safe healing windows.',range:5,damage:11,cost:2,gcd:1000,cd:0},
    {id:'revival',name:'Revival',kind:'group-heal',role:'healer',unlockLevel:1,desc:'Instantly restore the whole party in an emergency.',range:30,heal:32,cost:30,gcd:1500,cast:0,cd:45000,talentReq:'Revival'},
    {id:'tiger-palm',name:'Tiger Palm',kind:'damage',role:'dps',unlockLevel:1,desc:'A quick strike that maintains martial pressure.',range:5,damage:14,cost:18,gain:10,gcd:1000,cd:0},
    {id:'windwalker-blackout-kick',name:'Blackout Kick',kind:'damage',role:'dps',unlockLevel:1,desc:'A fast finishing kick in the Windwalker rotation.',range:5,damage:20,cost:26,gcd:1000,cd:3000},
    {id:'windwalker-rising-sun-kick',name:'Rising Sun Kick',kind:'damage',role:'dps',unlockLevel:1,desc:'A heavy martial strike with a short cooldown.',range:5,damage:31,cost:32,gcd:1000,cd:8000},
    {id:'spinning-crane-kick',name:'Spinning Crane Kick',kind:'damage',role:'dps',unlockLevel:5,desc:'Spin through the target and nearby enemies.',range:7,damage:17,cost:28,gcd:1000,cd:7000,cleave:3},
    {id:'fists-of-fury',name:'Fists of Fury',kind:'damage',role:'dps',unlockLevel:1,desc:'Unleash a powerful flurry that cleaves nearby enemies.',range:6,damage:34,cost:38,gcd:1000,cast:1300,cd:18000,cleave:2,talentReq:'Fists of Fury'},
    {id:'touch-of-death',name:'Touch of Death',kind:'damage',role:'dps',unlockLevel:1,desc:'A devastating finishing technique against weakened enemies.',range:5,damage:30,cost:20,gcd:1000,cd:30000,executeBelow:.20,executeMultiplier:2.4,talentReq:'Touch of Death'},
    {id:'touch-of-karma',name:'Touch of Karma',kind:'defensive',role:'dps',unlockLevel:9,desc:'Reduce incoming damage for a short period.',duration:7000,damageReduction:.25,gcd:0,cd:75000},
    {id:'spear-hand-strike',name:'Spear Hand Strike',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast with a precise hand strike.',range:5,cost:0,gcd:0,cd:15000}
  ],
  'Death Knight':[
    {id:'heart-strike',name:'Heart Strike',kind:'damage',role:'tank',unlockLevel:1,desc:'A high-threat strike that generates Runic Power.',range:5,damage:18,cost:0,gain:16,gcd:1200,cd:0,threat:2.6},
    {id:'death-strike',name:'Death Strike',kind:'damage',role:'tank',unlockLevel:1,desc:'Spend Runic Power to strike and heal from damage taken recently.',range:5,damage:22,cost:35,gcd:1200,cd:0,threat:2.2},
    {id:'dark-command',name:'Dark Command',kind:'taunt',role:'tank',unlockLevel:1,desc:'Command an enemy to attack the Death Knight.',range:30,cost:0,gcd:0,cd:8000,threat:5},
    {id:'mind-freeze',name:'Mind Freeze',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast with frozen runic force.',range:15,cost:0,gcd:0,cd:15000},
    {id:'marrowrend',name:'Marrowrend',kind:'damage',role:'tank',unlockLevel:1,desc:'Generate Runic Power and reinforce Bone Shield.',range:5,damage:17,cost:0,gain:14,gcd:1200,cd:4500,threat:2.4},
    {id:'blood-boil',name:'Blood Boil',kind:'damage',role:'tank',unlockLevel:4,desc:'Boil the blood of nearby enemies for heavy pack threat.',range:8,damage:16,cost:0,gain:10,gcd:1200,cd:7000,cleave:3,threat:2.8,damageType:'magic'},
    {id:'death-and-decay-blood',name:'Death and Decay',kind:'damage',role:'tank',unlockLevel:7,desc:'Corrupt the ground beneath enemies with shadow damage.',range:15,damage:17,cost:10,gcd:1200,cd:12000,cleave:3,threat:2.5,damageType:'magic'},
    {id:'rune-tap',name:'Rune Tap',kind:'defensive',role:'tank',unlockLevel:1,desc:'Briefly reduce incoming damage.',duration:5000,damageReduction:.20,gcd:0,cd:30000,talentReq:'Rune Tap'},
    {id:'dancing-rune-weapon',name:'Dancing Rune Weapon',kind:'defensive',role:'tank',unlockLevel:1,desc:'Summon a spectral weapon that reinforces defence and threat.',duration:9000,damageReduction:.22,gcd:0,cd:75000,talentReq:'Dancing Rune Weapon'},
    {id:'vampiric-blood',name:'Vampiric Blood',kind:'defensive',role:'tank',unlockLevel:1,desc:'Empower your blood, restoring health and greatly improving survival.',duration:10000,damageReduction:.25,selfHealPct:.18,gcd:0,cd:90000,talentReq:'Vampiric Blood'},

    {id:'obliterate',name:'Obliterate',kind:'damage',role:'dps',spec:'Frost',unlockLevel:1,desc:'A brutal melee strike that generates Runic Power.',range:5,damage:28,cost:0,gain:18,gcd:1200,cd:4500},
    {id:'frost-strike',name:'Frost Strike',kind:'damage',role:'dps',spec:'Frost',unlockLevel:1,desc:'Spend Runic Power on a weapon strike infused with frost.',range:5,damage:26,cost:28,gcd:1200,cd:0,damageType:'magic'},
    {id:'howling-blast',name:'Howling Blast',kind:'damage',role:'dps',spec:'Frost',unlockLevel:1,desc:'Blast the target and nearby enemies with freezing wind.',range:25,damage:18,cost:0,gain:12,gcd:1200,cd:6000,cleave:2,damageType:'magic'},
    {id:'remorseless-winter',name:'Remorseless Winter',kind:'damage',role:'dps',spec:'Frost',unlockLevel:1,desc:'Surround yourself with a freezing storm that cleaves nearby enemies.',range:8,damage:24,cost:18,gcd:1200,cd:14000,cleave:3,damageType:'magic',talentReq:'Remorseless Winter'},
    {id:'frostscythe',name:'Frostscythe',kind:'damage',role:'dps',spec:'Frost',unlockLevel:7,desc:'Sweep a frozen blade through several enemies.',range:7,damage:21,cost:0,gain:10,gcd:1200,cd:9000,cleave:3,damageType:'magic'},
    {id:'frostwyrms-fury',name:"Frostwyrm's Fury",kind:'damage',role:'dps',spec:'Frost',unlockLevel:11,desc:'Call a frostwyrm across the battlefield for heavy cleave damage.',range:30,damage:38,cost:35,gcd:1500,cast:1000,cd:45000,cleave:4,damageType:'magic'},
    {id:'breath-of-sindragosa',name:'Breath of Sindragosa',kind:'damage',role:'dps',spec:'Frost',unlockLevel:1,desc:'Unleash a devastating cone of frost into the enemy pack.',range:20,damage:45,cost:50,gcd:1500,cast:1200,cd:60000,cleave:4,damageType:'magic',talentReq:'Breath of Sindragosa'},
    {id:'icebound-fortitude',name:'Icebound Fortitude',kind:'defensive',role:'dps',unlockLevel:8,desc:'Harden yourself against incoming damage.',duration:8000,damageReduction:.25,gcd:0,cd:75000},

    {id:'festering-strike',name:'Festering Strike',kind:'damage',role:'dps',spec:'Unholy',unlockLevel:1,desc:'Strike the target, generate Runic Power and apply Festering Wounds.',range:5,damage:20,cost:0,gain:15,gcd:1200,cd:3500},
    {id:'scourge-strike',name:'Scourge Strike',kind:'damage',role:'dps',spec:'Unholy',unlockLevel:1,desc:'Burst Festering Wounds for additional shadow damage.',range:5,damage:19,cost:0,gain:8,gcd:1200,cd:0,damageType:'magic'},
    {id:'death-coil',name:'Death Coil',kind:'damage',role:'dps',spec:'Unholy',unlockLevel:1,desc:'Spend Runic Power to hurl death magic at the target.',range:30,damage:27,cost:30,gcd:1200,cd:0,damageType:'magic'},
    {id:'outbreak',name:'Outbreak',kind:'damage',role:'dps',spec:'Unholy',unlockLevel:1,desc:'Infect the target with a damaging plague.',range:30,damage:10,cost:0,gain:8,gcd:1200,cd:7000,damageType:'magic'},
    {id:'death-and-decay-unholy',name:'Death and Decay',kind:'damage',role:'dps',spec:'Unholy',unlockLevel:6,desc:'Corrupt the ground beneath enemies with shadow damage.',range:15,damage:17,cost:10,gcd:1200,cd:12000,cleave:3,damageType:'magic'},
    {id:'dark-transformation',name:'Dark Transformation',kind:'pet-command',role:'dps',spec:'Unholy',unlockLevel:1,desc:'Empower your permanent Ghoul into a savage frenzy.',range:30,cost:15,gcd:1000,cd:30000,petCommand:'dark-transformation',talentReq:'Dark Transformation'},
    {id:'army-of-the-dead',name:'Army of the Dead',kind:'summon',role:'dps',spec:'Unholy',unlockLevel:1,desc:'Summon a pack of temporary ghouls to tear into your enemies.',range:30,cost:35,gcd:1500,cast:1800,cd:75000,duration:14000,summonType:'army-ghoul',summonCount:4,talentReq:'Army of the Dead'},
    {id:'apocalypse',name:'Apocalypse',kind:'summon',role:'dps',spec:'Unholy',unlockLevel:1,desc:'Burst Festering Wounds and summon additional undead attackers.',range:5,cost:30,gcd:1500,cd:45000,duration:12000,summonType:'apocalypse-ghoul',summonCount:2,talentReq:'Apocalypse'},
    {id:'anti-magic-shell',name:'Anti-Magic Shell',kind:'defensive',role:'dps',spec:'Unholy',unlockLevel:8,desc:'Wrap yourself in anti-magic energy to reduce incoming damage.',duration:8000,damageReduction:.25,gcd:0,cd:75000}
  ],
  'Demon Hunter':[
    {id:'demons-bite',name:"Demon's Bite",kind:'damage',role:'dps',spec:'Havoc',unlockLevel:1,desc:'Generate Fury with a fast warglaive strike.',range:5,damage:16,cost:0,gain:24,gcd:1000,cd:0},
    {id:'chaos-strike',name:'Chaos Strike',kind:'damage',role:'dps',spec:'Havoc',unlockLevel:1,desc:'Spend Fury on a heavy chaos-infused melee strike.',range:5,damage:28,cost:30,gcd:1000,cd:0,damageType:'magic'},
    {id:'blade-dance',name:'Blade Dance',kind:'damage',role:'dps',spec:'Havoc',unlockLevel:1,desc:'Dance through the target and nearby enemies with both warglaives.',range:6,damage:20,cost:25,gcd:1000,cd:8000,cleave:3},
    {id:'throw-glaive',name:'Throw Glaive',kind:'damage',role:'dps',spec:'Havoc',unlockLevel:4,desc:'Throw a warglaive at a distant target while repositioning.',range:20,damage:15,cost:0,gain:8,gcd:1000,cd:6000},
    {id:'eye-beam',name:'Eye Beam',kind:'damage',role:'dps',spec:'Havoc',unlockLevel:6,desc:'Channel fel energy through enemies in front of you.',range:18,damage:32,cost:30,gcd:1000,cast:1200,cd:18000,cleave:3,damageType:'magic'},
    {id:'fel-barrage',name:'Fel Barrage',kind:'damage',role:'dps',spec:'Havoc',unlockLevel:1,desc:'Unleash a violent fel barrage across the enemy pack.',range:18,damage:38,cost:35,gcd:1000,cd:22000,cleave:4,damageType:'magic',talentReq:'Fel Barrage'},
    {id:'havoc-metamorphosis',name:'Metamorphosis',kind:'damage',role:'dps',spec:'Havoc',unlockLevel:1,desc:'Transform and crash into the target, opening a major demonic burst window.',range:12,damage:40,cost:20,gcd:1000,cd:60000,cleave:2,damageType:'magic',talentReq:'Metamorphosis'},
    {id:'blur',name:'Blur',kind:'defensive',role:'dps',spec:'Havoc',unlockLevel:10,desc:'Blur your form, reducing incoming damage for 8 seconds.',duration:8000,damageReduction:.30,gcd:0,cd:75000},
    {id:'disrupt',name:'Disrupt',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast with fel force.',range:10,cost:0,gcd:0,cd:15000},

    {id:'shear',name:'Shear',kind:'damage',role:'tank',spec:'Vengeance',unlockLevel:1,desc:'Rip into the target, generating Fury and a Soul Fragment.',range:5,damage:16,cost:0,gain:18,gcd:1000,cd:0,threat:2.6},
    {id:'soul-cleave',name:'Soul Cleave',kind:'damage',role:'tank',spec:'Vengeance',unlockLevel:1,desc:'Spend Fury and consume Soul Fragments to damage the target and heal yourself.',range:5,damage:21,cost:30,gcd:1000,cd:0,threat:2.4,damageType:'magic'},
    {id:'infernal-strike',name:'Infernal Strike',kind:'damage',role:'tank',spec:'Vengeance',unlockLevel:1,desc:'Leap into the pack in a burst of fel fire and heavy threat.',range:15,damage:17,cost:10,gain:8,gcd:1000,cd:10000,cleave:3,threat:2.8,damageType:'magic'},
    {id:'torment',name:'Torment',kind:'taunt',role:'tank',spec:'Vengeance',unlockLevel:1,desc:'Torment the enemy and force its attention onto the Demon Hunter.',range:30,cost:0,gcd:0,cd:8000,threat:5},
    {id:'sigil-of-flame',name:'Sigil of Flame',kind:'damage',role:'tank',spec:'Vengeance',unlockLevel:1,desc:'Burn enemies in a fel sigil for area damage and pack threat.',range:18,damage:20,cost:12,gain:8,gcd:1000,cd:12000,cleave:3,threat:2.7,damageType:'magic',talentReq:'Sigil of Flame'},
    {id:'demon-spikes',name:'Demon Spikes',kind:'defensive',role:'tank',spec:'Vengeance',unlockLevel:5,desc:'Harden your body with demonic spikes to reduce incoming damage.',duration:7000,damageReduction:.25,gcd:0,cd:18000},
    {id:'fiery-brand',name:'Fiery Brand',kind:'defensive',role:'tank',spec:'Vengeance',unlockLevel:9,desc:'Brand the enemy with fel fire while fortifying yourself against its assault.',duration:8000,damageReduction:.30,gcd:0,cd:60000},
    {id:'spirit-bomb',name:'Spirit Bomb',kind:'damage',role:'tank',spec:'Vengeance',unlockLevel:1,desc:'Consume Soul Fragments in an explosive fel blast that also restores health.',range:10,damage:28,cost:30,gcd:1000,cd:15000,cleave:3,threat:2.9,damageType:'magic',talentReq:'Spirit Bomb'},
    {id:'vengeance-metamorphosis',name:'Metamorphosis',kind:'defensive',role:'tank',spec:'Vengeance',unlockLevel:1,desc:'Transform into a towering demon, restoring health and greatly reducing damage taken.',duration:10000,damageReduction:.35,selfHealPct:.18,gcd:0,cd:90000,talentReq:'Metamorphosis'}
  ],
  Evoker:[
    {id:'reversion',name:'Reversion',kind:'heal',role:'healer',spec:'Preservation',unlockLevel:1,desc:'Rewind an ally to a healthier moment and continue healing them briefly.',range:25,heal:24,cost:1,gcd:1500,cast:0,cd:7000,hot:8},
    {id:'verdant-embrace',name:'Verdant Embrace',kind:'heal',role:'healer',spec:'Preservation',unlockLevel:1,desc:'Rush restorative dragon magic into an injured ally.',range:25,heal:35,cost:1,gcd:1500,cast:700,cd:6000},
    {id:'emerald-blossom',name:'Emerald Blossom',kind:'group-heal',role:'healer',spec:'Preservation',unlockLevel:1,desc:'Bloom emerald magic through the party.',range:25,heal:18,cost:2,gcd:1500,cast:1000,cd:8000},
    {id:'dream-breath',name:'Dream Breath',kind:'group-heal',role:'healer',spec:'Preservation',unlockLevel:1,desc:'Breathe restorative energy across the party.',range:25,heal:29,cost:3,gcd:1500,cast:1600,cd:22000,talentReq:'Dream Breath'},
    {id:'temporal-anomaly',name:'Temporal Anomaly',kind:'group-heal',role:'healer',spec:'Preservation',unlockLevel:8,desc:'Send a temporal pulse through allies for broad recovery.',range:25,heal:16,cost:2,gcd:1500,cast:900,cd:12000},
    {id:'emerald-communion',name:'Emerald Communion',kind:'group-heal',role:'healer',spec:'Preservation',unlockLevel:1,desc:'Commune with emerald magic for a powerful emergency party heal.',range:25,heal:38,cost:4,gcd:1500,cast:1800,cd:60000,talentReq:'Emerald Communion'},
    {id:'preservation-living-flame',name:'Living Flame',kind:'damage',role:'healer',spec:'Preservation',unlockLevel:4,desc:'A safe ranged damage spell for quiet healing windows.',range:25,damage:14,cost:0,gcd:1500,cast:1200,cd:0,damageType:'magic'},
    {id:'quell',name:'Quell',kind:'interrupt',unlockLevel:1,desc:'Interrupt an enemy cast with draconic force.',range:25,cost:0,gcd:0,cd:24000},
    {id:'obsidian-scales',name:'Obsidian Scales',kind:'defensive',unlockLevel:8,desc:'Harden your scales to reduce incoming damage.',duration:8000,damageReduction:.25,gcd:0,cd:75000},

    {id:'living-flame',name:'Living Flame',kind:'damage',role:'dps',spec:'Devastation',unlockLevel:1,desc:'Launch a focused bolt of red dragonfire.',range:30,damage:22,cost:0,gcd:1500,cast:1300,cd:0,damageType:'magic'},
    {id:'azure-strike',name:'Azure Strike',kind:'damage',role:'dps',spec:'Devastation',unlockLevel:1,desc:'Strike instantly with blue dragon magic.',range:30,damage:14,cost:0,gcd:1500,cd:0,damageType:'magic'},
    {id:'disintegrate',name:'Disintegrate',kind:'damage',role:'dps',spec:'Devastation',unlockLevel:1,desc:'Spend Essence to tear into the target with blue magic.',range:30,damage:34,cost:2,gcd:1500,cast:1400,cd:0,damageType:'magic'},
    {id:'fire-breath',name:'Fire Breath',kind:'damage',role:'dps',spec:'Devastation',unlockLevel:4,desc:'Breathe red dragonfire through the enemy pack.',range:22,damage:27,cost:1,gcd:1500,cast:1200,cd:14000,cleave:3,damageType:'magic'},
    {id:'pyre',name:'Pyre',kind:'damage',role:'dps',spec:'Devastation',unlockLevel:6,desc:'Spend Essence to explode dragonfire across nearby enemies.',range:30,damage:25,cost:2,gcd:1500,cd:6000,cleave:3,damageType:'magic'},
    {id:'eternity-surge',name:'Eternity Surge',kind:'damage',role:'dps',spec:'Devastation',unlockLevel:1,desc:'Release a devastating blast of blue dragon magic.',range:30,damage:40,cost:3,gcd:1500,cast:1700,cd:18000,cleave:2,damageType:'magic',talentReq:'Eternity Surge'},
    {id:'dragonrage',name:'Dragonrage',kind:'damage',role:'dps',spec:'Devastation',unlockLevel:1,desc:'Unleash the full fury of the dragonflights and enter a major burst window.',range:30,damage:38,cost:2,gcd:1500,cd:60000,cleave:3,damageType:'magic',talentReq:'Dragonrage'}
  ]
};
const CLASS_BUFF_QUESTS={
 Warrior:[{level:5,id:'warrior-guardian',name:'Challenging Presence',desc:'Generate 18% more threat and reduce damage taken by 6%.',scope:'self',effect:{threatBonus:.18,incomingDamageReduction:.06},trial:'Hold the Line'},{level:10,id:'warrior-battle-focus',name:'Battle Focus',desc:'Increase damage by 8% and resource regeneration by 6%.',scope:'self',effect:{outgoingDamage:.08,resourceRegen:.06},trial:'Break the Siege'},{level:15,id:'warrior-pvp',name:'Gladiator’s Resolve',desc:'A Warrior discipline forged for combat against rival parties.',trial:'Trial of the War Banner',pvp:true}],
 Paladin:[{level:5,id:'paladin-blessing-resolve',name:'Blessing of Resolve',desc:'Reduce damage taken by the party by 6%.',scope:'party',effect:{incomingDamageReduction:.06},trial:'Oath Under Fire'},{level:10,id:'paladin-radiant-purpose',name:'Radiant Purpose',desc:'Increase healing done by 5% and party damage by 3%.',scope:'party',effect:{outgoingHealing:.05,outgoingDamage:.03},trial:'The Unbroken Oath'},{level:15,id:'paladin-pvp',name:'Judicator’s Oath',desc:'A Paladin discipline prepared for rival-party combat.',trial:'Trial of Judgment',pvp:true}],
 Priest:[{level:5,id:'priest-divine-inspiration',name:'Divine Inspiration',desc:'Increase healing done and received by 5%.',scope:'party',effect:{outgoingHealing:.05,incomingHealing:.05},trial:'The Vigil'},{level:10,id:'priest-inner-fire',name:'Inner Fire',desc:'Increase damage by 5% and resource regeneration by 4%.',scope:'self',effect:{outgoingDamage:.05,resourceRegen:.04},trial:'Light and Shadow'},{level:15,id:'priest-pvp',name:'Unshaken Faith',desc:'A Priest discipline built to endure enemy pressure.',trial:'Trial of Conviction',pvp:true}],
 Druid:[{level:5,id:'druid-wild-communion',name:'Wild Communion',desc:'Increase party damage and healing by 4%.',scope:'party',effect:{outgoingDamage:.04,outgoingHealing:.04},trial:'Call of the Wild'},{level:10,id:'druid-primal-flow',name:'Primal Flow',desc:'Increase haste and resource regeneration by 6%.',scope:'self',effect:{haste:.06,resourceRegen:.06},trial:'The Changing Path'},{level:15,id:'druid-pvp',name:'Survival of the Wild',desc:'A Druid discipline adapted for rival-party combat.',trial:'Trial of the Hunt',pvp:true}],
 Hunter:[{level:5,id:'hunter-predators-focus',name:"Predator's Focus",desc:'Increase damage by 10% and resource regeneration by 8%.',scope:'self',effect:{outgoingDamage:.10,resourceRegen:.08},trial:'The Patient Hunt'},{level:10,id:'hunter-pack-instinct',name:'Pack Instinct',desc:'Increase damage by 6% and critical chance by 6%.',scope:'self',effect:{outgoingDamage:.06,critBonus:.06},trial:'Run With the Pack'},{level:15,id:'hunter-pvp',name:'Marked Prey',desc:'A Hunter discipline designed to pressure rival adventurers.',trial:'Trial of the Quarry',pvp:true}],
 Rogue:[{level:5,id:'rogue-killing-tempo',name:'Killing Tempo',desc:'Increase damage by 10% and critical chance by 6%.',scope:'self',effect:{outgoingDamage:.10,critBonus:.06},trial:'One Clean Cut'},{level:10,id:'rogue-relentless',name:'Relentless',desc:'Increase resource regeneration by 10% and damage by 5%.',scope:'self',effect:{resourceRegen:.10,outgoingDamage:.05},trial:'No Witnesses'},{level:15,id:'rogue-pvp',name:'Dirty Fighting',desc:'A Rogue discipline intended for unpredictable rival combat.',trial:'Trial in the Shadows',pvp:true}],
 Mage:[{level:5,id:'mage-arcane-empowerment',name:'Arcane Empowerment',desc:'Increase party damage by 5%.',scope:'party',effect:{outgoingDamage:.05},trial:'Control the Current'},{level:10,id:'mage-flow-state',name:'Flow State',desc:'Increase haste by 7% and resource regeneration by 6%.',scope:'self',effect:{haste:.07,resourceRegen:.06},trial:'The Unbroken Cast'},{level:15,id:'mage-pvp',name:'Spellbreaker’s Focus',desc:'A Mage discipline tuned for duels and rival parties.',trial:'Trial of Countermagic',pvp:true}],
 Shaman:[{level:5,id:'shaman-bloodlust',name:'Bloodlust',desc:'Increase party haste by 10% and resource regeneration by 5%.',scope:'party',effect:{haste:.10,resourceRegen:.05},trial:'Beat of the Storm'},{level:10,id:'shaman-ancestral-current',name:'Ancestral Current',desc:'Increase healing by 5% and resource regeneration by 6%.',scope:'party',effect:{outgoingHealing:.05,resourceRegen:.06},trial:'Voices of the Ancestors'},{level:15,id:'shaman-pvp',name:'Stormbound',desc:'A Shaman discipline for controlling rival combat.',trial:'Trial of Thunder',pvp:true}],
 Warlock:[{level:5,id:'warlock-demonic-pact',name:'Demonic Pact',desc:'Increase party damage by 4%.',scope:'party',effect:{outgoingDamage:.04},trial:'Terms of the Pact'},{level:10,id:'warlock-soul-hunger',name:'Soul Hunger',desc:'Increase damage by 7% and resource regeneration by 6%.',scope:'self',effect:{outgoingDamage:.07,resourceRegen:.06},trial:'Feed the Darkness'},{level:15,id:'warlock-pvp',name:'Cruel Bargain',desc:'A Warlock discipline created for rival-party combat.',trial:'Trial of Souls',pvp:true}],
 Monk:[{level:5,id:'monk-mystic-touch',name:'Mystic Touch',desc:'Increase party damage and healing by 3%.',scope:'party',effect:{outgoingDamage:.03,outgoingHealing:.03},trial:'The Open Hand'},{level:10,id:'monk-inner-tempo',name:'Inner Tempo',desc:'Increase haste by 7% and damage by 5%.',scope:'self',effect:{haste:.07,outgoingDamage:.05},trial:'Stillness in Motion'},{level:15,id:'monk-pvp',name:'Duelist’s Rhythm',desc:'A Monk discipline for reading and countering rival parties.',trial:'Trial of the Empty Palm',pvp:true}],
 'Death Knight':[{level:5,id:'death-knight-horn',name:'Horn of Winter',desc:'Increase party damage by 3% and resource regeneration by 4%.',scope:'party',effect:{outgoingDamage:.03,resourceRegen:.04},trial:'Wake the Fallen'},{level:10,id:'death-knight-frozen-will',name:'Frozen Will',desc:'Reduce damage taken by 7% and increase damage by 5%.',scope:'self',effect:{incomingDamageReduction:.07,outgoingDamage:.05},trial:'The Cold March'},{level:15,id:'death-knight-pvp',name:'Death’s Advance',desc:'A Death Knight discipline for relentless rival combat.',trial:'Trial of the Grave',pvp:true}],
 'Demon Hunter':[{level:5,id:'demon-hunter-momentum',name:'Demonic Momentum',desc:'Increase damage by 10%, haste by 7% and resource regeneration by 8%.',scope:'self',effect:{outgoingDamage:.10,haste:.07,resourceRegen:.08},trial:'Embrace the Hunt'},{level:10,id:'demon-hunter-fel-instinct',name:'Fel Instinct',desc:'Reduce damage taken by 6% and increase damage by 6%.',scope:'self',effect:{incomingDamageReduction:.06,outgoingDamage:.06},trial:'Master the Demon'},{level:15,id:'demon-hunter-pvp',name:'Unbound Pursuit',desc:'A Demon Hunter discipline for hunting rival adventurers.',trial:'Trial of the Pursuer',pvp:true}],
 Evoker:[{level:5,id:'evoker-draconic-resonance',name:'Draconic Resonance',desc:'Increase party haste by 6%.',scope:'party',effect:{haste:.06},trial:'Echoes of the Flights'},{level:10,id:'evoker-ancient-vitality',name:'Ancient Vitality',desc:'Increase healing by 5% and damage by 4%.',scope:'party',effect:{outgoingHealing:.05,outgoingDamage:.04},trial:'Legacy Awakened'},{level:15,id:'evoker-pvp',name:'Wingborne Supremacy',desc:'An Evoker discipline adapted to rival-party combat.',trial:'Trial of the Skies',pvp:true}]
};
function buffQuestList(c){return (CLASS_BUFF_QUESTS[c?.class]||[]).map(q=>({...q,scope:q.scope||'self',effect:q.effect||{},duration:60000,cooldown:180000}))}
function unlockedBuffIds(c){return Array.isArray(c?.classBuffProgress?.unlocked)?c.classBuffProgress.unlocked:[]}
function classBuffFor(c){
 const unlocked=unlockedBuffIds(c),list=buffQuestList(c),selected=c?.buffSkill;
 return list.find(x=>x.id===selected&&unlocked.includes(x.id))||list.find(x=>unlocked.includes(x.id))||null
}
function skillPoolFor(c,spec=c?.spec){
  const engine=combatEngine(),role=specs[c?.class]?.[spec]||'dps',copyChar={...c,spec};
  let pool=[];
  if(engine?.skills?.classSkillPool)pool=engine.skills.classSkillPool(copyChar,role)||[];
  if(!pool.length)pool=(engine?.ABILITIES?.[c?.class]||[]).filter(a=>!a.role||a.role===role);

  // Merge in the latest UI catalogue instead of using it only when the engine returns
  // nothing. This prevents an older cached combat module from hiding newly-added skills.
  const fallback=(UI_SKILL_FALLBACKS[c?.class]||[]).filter(a=>(!a.role||a.role===role)&&(!a.spec||a.spec===spec));
  if(fallback.length){
    const merged=new Map(pool.map(skill=>[skill.id,skill]));
    fallback.forEach(skill=>merged.set(skill.id,{...(merged.get(skill.id)||{}),...skill}));
    pool=[...merged.values()]
  }
  return pool
}
function skillTalentMet(c,skill,spec=c?.spec){return !skill?.talentReq||Math.max(0,Number(c?.talents?.[spec]?.[skill.talentReq])||0)>0}
function skillAvailable(c,skill,spec=c?.spec){return (Number(skill?.unlockLevel)||1)<=Math.max(1,Number(c?.level)||1)&&skillTalentMet(c,skill,spec)}
function defaultSkillIds(c,spec=c?.spec){
  const engine=combatEngine(),role=specs[c?.class]?.[spec]||'dps',copyChar={...c,spec};
  let ids=engine?.skills?.defaultSkillLoadout?.(copyChar,role);
  if(!Array.isArray(ids)||!ids.length)ids=skillPoolFor(copyChar,spec).filter(a=>(Number(a.unlockLevel)||1)<=Math.max(1,Number(c?.level)||1)).slice(0,4).map(a=>a.id);
  return ids.slice(0,4)
}
function equippedSkillIds(c,spec=c?.spec){
  const pool=skillPoolFor(c,spec),byId=new Map(pool.map(s=>[s.id,s])),saved=Array.isArray(c?.skillLoadouts?.[spec])?c.skillLoadouts[spec]:null;
  const hasValidSaved=Array.isArray(saved)&&saved.some(id=>{const skill=byId.get(id);return skill&&skillAvailable(c,skill,spec)});
  const explicit=hasValidSaved?saved:defaultSkillIds(c,spec),out=explicit.slice(0,4).map(id=>{const skill=byId.get(id);return skill&&skillAvailable(c,skill,spec)?id:null});
  while(out.length<4)out.push(null);
  return out
}
function skillKindLabel(kind){
  return ({damage:'Damage',heal:'Healing','group-heal':'Group Heal',interrupt:'Interrupt',taunt:'Taunt',defensive:'Defensive','battle-rez':'Battle Rez',totem:'Totem',summon:'Summon','pet-command':'Pet Command'})[kind]||'Utility'
}
function skillIcon(kind){
  return ({damage:'⚔',heal:'✚','group-heal':'✥',interrupt:'!',taunt:'◎',defensive:'◆','battle-rez':'♰',totem:'▲',summon:'♜','pet-command':'⛧'})[kind]||'◇'
}
function skillCooldownText(skill){
  const ms=Math.max(0,Number(skill?.cd)||0);if(!ms)return'No cooldown';
  if(ms>=60000)return(ms/60000).toFixed(ms%60000?1:0)+'m cooldown';
  return(Math.round(ms/100)/10)+'s cooldown'
}
function ensureCharacter(c){
  c.equipment=c.equipment||{};
  if(c.equipment.Trinket&&!c.equipment.Trinket1){c.equipment.Trinket1=c.equipment.Trinket;delete c.equipment.Trinket}
  [...leftSlots,...rightSlots].forEach(slot=>{if(!(slot in c.equipment))c.equipment[slot]=null});
  c.talents=c.talents||{};
  Object.keys(specs[c.class]||{}).forEach(spec=>{c.talents[spec]=c.talents[spec]||{}});
  B?.syncLegacyTalentCounter?.(c);
  c.skillLoadouts=c.skillLoadouts&&typeof c.skillLoadouts==='object'?c.skillLoadouts:{};
  c.classBuffProgress=c.classBuffProgress&&typeof c.classBuffProgress==='object'?c.classBuffProgress:{unlocked:[]};
  c.classBuffProgress.unlocked=Array.isArray(c.classBuffProgress.unlocked)?c.classBuffProgress.unlocked:[];
  if(c.buffSkill&&!c.classBuffProgress.unlocked.includes(c.buffSkill))c.buffSkill=null;
  return c;
}
function rarityClass(item){return `cb-rarity-${String(item?.rarity||'starter').toLowerCase()}`}
function combinedBonusStats(c){
  const out={...(G?.aggregateStats?.(c)||{})},prep=window.CellboundProfessions?.activeBonuses?.(c)||{};
  Object.entries(prep).forEach(([k,v])=>out[k]=(Number(out[k])||0)+(Number(v)||0));return out
}
function statBlock(c){
  const meta=classMeta[c.class]||{primary:'Strength'},bonus=combinedBonusStats(c),primary=c.class==='Monk'&&c.spec==='Mistweaver'?'Intellect':meta.primary;
  const level=c.level||1,gear=c.gear||0,role=roleOf(c);
  const strength=Math.round(level*7+gear*(primary==='Strength'?.62:.2)+(bonus.strength||0));
  const agility=Math.round(level*6+gear*(primary==='Agility'?.62:.18)+(bonus.agility||0));
  const intellect=Math.round(level*7+gear*(primary==='Intellect'?.64:.16)+(bonus.intellect||0));
  const stamina=Math.round(level*9+gear*.52+(role==='tank'?18:0)+(bonus.stamina||0));
  const armour=Math.round(gear*14+level*20+(role==='tank'?180:role==='healer'?35:60)+(bonus.armour||0));
  const crit=Math.max(3,Math.round(5+gear*.11+(bonus.crit||0)));
  const haste=Math.max(2,Math.round(3+level*.7+(bonus.haste||0)));
  const block=role==='tank'?Math.round(8+gear*.18+(bonus.block||0)):Number(bonus.block||0);
  return {Strength:strength,Agility:agility,Intellect:intellect,Stamina:stamina,Armour:armour,Crit:`${crit}%`,Haste:`${haste}%`,Block:block?`${block}%`:'—',Threat:bonus.threat?`+${bonus.threat}%`:'—',Healing:bonus.healing?`+${bonus.healing}%`:'—'};
}
function sheetMaxHealth(c){
  const ilvl=window.CellboundGame?.characterItemLevel?.(c)||0;
  const role=roleOf(c);
  const bonus=combinedBonusStats(c);return Math.round(100+(Number(c.level)||1)*28+ilvl*5+(role==='tank'?90:role==='healer'?30:50)+(Number(bonus.stamina)||0)*4);
}
function bestBankUpgrade(state,c,slot){
  const current=Math.max(0,Number(c.equipment?.[slot]?.itemLevel)||0);
  const bank=Array.isArray(state?.bank)?state.bank:[];
  const candidates=bank.filter(item=>canUse(c,item)&&possibleSlots(item).includes(slot));
  const best=candidates.sort((x,y)=>(Number(y.itemLevel)||0)-(Number(x.itemLevel)||0))[0];
  const gain=(Number(best?.itemLevel)||0)-current;
  return gain>0?{item:best,gain}:null;
}
function setRuleData(c=null,item=null){
  return G?.setBonusRulesFor?.(c||item?.class,c?.spec||null,item)||G?.SET_BONUS_RULES||{
    pieces2:{threshold:2,name:'Specialisation Pair',short:'Adaptive 2-piece bonus',description:'Changes with the active specialisation.'},
    pieces4:{threshold:4,name:'Talent Ensemble',short:'Adaptive 4-piece bonus',description:'Changes with the active specialisation.'}
  }
}
function setInlineMarkup(c,item){
  if(!item?.setId||!item?.setName)return'';
  const count=G?.setPieceCount?.(c,item.setId)||0,rules=setRuleData(c,item),two=count>=rules.pieces2.threshold,four=count>=rules.pieces4.threshold;
  return `<span class="cb-slot-set"><b>${escHtml(item.setName)}</b><em>${count}/4 equipped · ${escHtml(c.spec)}${four?' · 2 & 4-piece active':two?' · 2-piece active':''}</em></span>`
}
function setSummaryMarkup(c){
  const sets=new Map();
  Object.values(c?.equipment||{}).forEach(item=>{if(item?.setId&&!sets.has(item.setId))sets.set(item.setId,item)});
  if(!sets.size)return'';
  const bonus=(rule,count)=>`<div class="cb-set-bonus ${count>=rule.threshold?'active':''}"><span>${rule.threshold} PIECES</span><div><b>${escHtml(rule.name)}</b><strong>${escHtml(rule.short)}</strong><p>${escHtml(rule.description)}</p></div><em>${count>=rule.threshold?'ACTIVE':count+'/'+rule.threshold}</em></div>`;
  return `<section class="cb-set-summary"><div class="cb-stat-section-head"><span>SET BONUSES · ${escHtml(c.spec.toUpperCase())}</span><small>Bonuses adapt to the active specialisation</small></div>${[...sets.entries()].map(([id,item])=>{const count=G?.setPieceCount?.(c,id)||0,rules=setRuleData(c,item);return `<article class="cb-set-card"><header><div><small>ADAPTIVE EQUIPMENT SET</small><h4>${escHtml(item.setName||id)}</h4></div><b>${count}/4</b></header>${bonus(rules.pieces2,count)}${bonus(rules.pieces4,count)}</article>`}).join('')}</section>`
}
function equipmentSlot(c,slot,state){
  const item=c.equipment?.[slot],upgrade=bestBankUpgrade(state,c,slot),prep=(window.CellboundProfessions?.activeEffects?.(c)||[]).find(x=>(x.kind==='attachment'||x.kind==='enhancement')&&x.slot===slot);
  if(item)G?.ensureSockets?.(item);
  const socketCount=Math.max(0,Number(item?.socketCount)||0),filledSockets=(item?.sockets||[]).filter(Boolean).length;
  const socketLine=socketCount?`<span class="cb-slot-roll cb-slot-sockets">◆ ${filledSockets}/${socketCount} SOCKETS${filledSockets?' · '+(item.sockets||[]).filter(Boolean).map(g=>g.name||'Gem').join(', '):''}</span>`:'';
  const art=item?(G?.artHTML?.(item,48,'cb-slot-art')||item.icon||slotIcons[slot]||'◇'):(slotIcons[slot]||'◇');
  return `<button class="cb-equip-slot ${item?rarityClass(item):'cb-empty'} ${upgrade?'has-upgrade':''}" data-slot="${slot}">
    <span class="cb-slot-icon">${art}</span>
    <span class="cb-slot-copy"><small>${slot.replace(/(\d)/,' $1')}</small><b>${item?.name||'Empty'}</b>${item?.power?`<em>+${item.power} power</em>`:''}${item?`<span class="cb-slot-ilvl">Item Level ${item.itemLevel||0}</span><span class="cb-slot-roll">${(G?.statLines?.(item)||[]).map(s=>s.text).join(' · ')||'Legacy roll'}</span>${socketLine}${setInlineMarkup(c,item)}${prep?`<span class="cb-slot-roll cb-slot-prep">✥ ${prep.name} · ${window.CellboundProfessions?.bonusText?.(prep.bonuses)||''}${prep.permanent?' · ATTACHED':` · ${prep.remainingBosses} bosses`}</span>`:''}`:'<span class="cb-slot-ilvl">Empty equipment slot</span>'}</span>
    ${upgrade?`<span class="cb-slot-upgrade">+${upgrade.gain} ILVL</span>`:''}
  </button>`;
}
function paperDoll(c,state){
  const meta=classMeta[c.class]||{icon:'◇',accent:'#58d7cf'};
  const role=roleOf(c),stats=statBlock(c);
  const itemLevel=window.CellboundGame?.characterItemLevel?.(c)||c.gear||0;
  const equipped=[...leftSlots,...rightSlots].filter(slot=>c.equipment?.[slot]).length;
  const upgradeCount=[...leftSlots,...rightSlots].filter(slot=>bestBankUpgrade(state,c,slot)).length;
  const ent=window.CellboundGame?.getEntitlements?.()||{professionSlots:1,member:false};
  const health=sheetMaxHealth(c),shock=Math.round(Number(c.cellShock)||0);
  const visibleSlots=[...leftSlots,...rightSlots];
  const visibleEquipped=visibleSlots.filter(slot=>c.equipment?.[slot]).length;
  const setVisualItems=visibleSlots.map(slot=>({slot,item:c.equipment?.[slot]})).filter(x=>x.item&&CP?.visualProfile?.(c,x.item,x.slot)?.isSet);
  const setCounts=setVisualItems.reduce((out,x)=>{const key=x.item.setId||x.item.setName||String(x.item.baseItemId||x.item.itemId||c.class+'-set').replace(/-(head|shoulders|chest|hands|waist|legs|feet|weapon|offhand|ring|trinket|relic)$/i,'');out[key]=(out[key]||0)+1;return out},{});
  const dominantSetKey=Object.keys(setCounts).sort((a,b)=>setCounts[b]-setCounts[a])[0]||'';
  const setCount=dominantSetKey?setCounts[dominantSetKey]:0;
  const setExample=setVisualItems.find(x=>(x.item.setId||x.item.setName||String(x.item.baseItemId||x.item.itemId||'').replace(/-(head|shoulders|chest|hands|waist|legs|feet|weapon|offhand|ring|trinket|relic)$/i,''))===dominantSetKey)?.item;
  const setLabel=setExample?.setName||G?.SET_META?.[c.class]?.name||(setCount?c.class+' Set':'');
  const visual=CP?.paperDollHTML?.(c,{size:'equipment',highlightedSlot:activeSlot,accent:meta.accent})||portraitHTML(c,'hero');
  const coreStats=['Strength','Agility','Intellect','Stamina'];
  const combatStats=['Armour','Crit','Haste','Block','Threat','Healing'];
  return `<div class="cb-paperdoll cb-armoury-screen cb-armoury-stats-screen" style="--cb-accent:${meta.accent}">
    <div class="cb-gear-column cb-gear-left">${leftSlots.map(s=>equipmentSlot(c,s,state)).join('')}</div>
    <section class="cb-armoury-stage cb-stat-command">
      <div class="cb-armoury-heading"><div><small>CHARACTER ARMOURY</small><h3>${c.name}</h3><p>${c.race||'Veyren'} · ${c.class} · ${c.spec}</p></div><span class="cb-role-pill cb-role-${role}">${roleLabel(role)}</span></div>

      <div class="cb-equipment-visual-stage" data-paper-doll-stage>
        <div class="cb-equipment-visual-meta"><span>LIVE EQUIPMENT VIEW</span><b>${visibleEquipped}/14 visual slots equipped</b></div>
        ${setCount?`<div class="cb-equipment-set-visual"><strong>${escHtml(setLabel)}</strong><span>${setCount} set piece${setCount===1?'':'s'} shaping this look${setCount>=4?' · full prestige':''}</span></div>`:''}
        <div class="cb-equipment-visual-model">${visual}</div>
        <div class="cb-equipment-visual-foot"><span>${activeSlot?`Inspecting ${activeSlot}`:'Select a gear slot to highlight it on the character.'}</span><em>Appearance updates instantly with equipped gear.</em></div>
      </div>

      <div class="cb-stat-hero">
        <div class="cb-stat-crest cb-stat-portrait">${portraitHTML(c,'lg')}<span class="cb-stat-class">${meta.icon}</span><small>LEVEL ${c.level||1}</small></div>
        <div class="cb-stat-vitals">
          <article><span>HEALTH</span><b>${health.toLocaleString()}</b><small>Maximum health</small></article>
          <article><span>ITEM LEVEL</span><b>${itemLevel}</b><small>Average equipped gear</small></article>
          <article><span>POWER</span><b>${c.power||0}</b><small>Character power</small></article>
          <article class="${shock>=75?'danger':''}"><span>CELL SHOCK</span><b>${shock}%</b><small>${shock>=100?'Unavailable':shock?'Recovering':'Ready for duty'}</small></article>
        </div>
      </div>

      <div class="cb-stat-section">
        <div class="cb-stat-section-head"><span>CORE ATTRIBUTES</span><small>Base combat profile</small></div>
        <div class="cb-stat-grid">${coreStats.map(k=>`<article><span>${k.toUpperCase()}</span><b>${stats[k]}</b></article>`).join('')}</div>
      </div>

      <div class="cb-stat-section">
        <div class="cb-stat-section-head"><span>COMBAT RATINGS</span><small>Derived from level and equipment</small></div>
        <div class="cb-stat-grid">${combatStats.map(k=>`<article><span>${k.toUpperCase()}</span><b>${stats[k]}</b></article>`).join('')}</div>
      </div>

      <div class="cb-armoury-summary cb-stat-loadout-summary">
        <div><span>SLOTS FILLED</span><b>${equipped}/14</b></div>
        <div class="${upgradeCount?'has-upgrades':''}"><span>BANK UPGRADES</span><b>${upgradeCount}</b></div>
        <div><span>PROFESSION SLOTS</span><b>1</b></div>
        <div><span>ACCOUNT RULE</span><b>${ent.member?'MEMBER':'STANDARD'}</b></div>
      </div>
      <div class="cb-armoury-hint">${upgradeCount?`<strong>${upgradeCount} upgrade${upgradeCount===1?'':'s'} available</strong><span>Gold-marked equipment slots have a stronger compatible item waiting in the Guild Bank.</span>`:'<strong>Loadout current</strong><span>No higher Item Level upgrades are currently waiting in the Guild Bank.</span>'}</div>
      ${setSummaryMarkup(c)}
    </section>
    <div class="cb-gear-column cb-gear-right">${rightSlots.map(s=>equipmentSlot(c,s,state)).join('')}</div>
  </div>`;
}
function possibleSlots(item){
  if(G?.equipmentPositions)return G.equipmentPositions(item);
  if(!item||typeof item!=='object')return[];
  if(item.slot==='Trinket')return ['Trinket1','Trinket2'];
  if(item.slot==='Ring')return ['Ring1','Ring2'];
  if(item.slot==='Weapon')return ['Weapon'];
  if(item.slot==='OffHand')return ['OffHand'];
  return item.slot?[item.slot]:[];
}
function canUse(c,item){
  if(!item||typeof item!=='object')return false;
  const classes=item.classes;
  const classOk=classes==='all'||!classes||(Array.isArray(classes)?classes.includes(c?.class):String(classes).includes(String(c?.class||'')));
  const roleOk=!item.relicRole||roleOf(c)===item.relicRole;
  return classOk&&roleOk
}
function equippedUpgradeMax(item){
  const tier=Math.max(1,Number(item?.tier)||1),steps=({1:2,2:3,3:3,4:4})[tier]||2;
  const base=Number(item?.baseItemLevel)||Number(item?.itemLevel)||0;
  return Math.max(Number(item?.itemLevel)||0,Math.min(42,base+steps*2));
}
function equippedUpgradeCost(item){
  const tier=Math.max(1,Number(item?.tier)||1),level=Math.max(0,Number(item?.upgradeLevel)||0);
  return 4+tier*3+level*4;
}
function equippedCanUpgrade(item){return Boolean(item)&&(Number(item?.itemLevel)||0)<equippedUpgradeMax(item)}
function attachmentStacksForSlot(state,slot,c){
  return (Array.isArray(state?.consumables)?state.consumables:[]).filter(stack=>Number(stack?.quantity)>0&&stack?.payload?.effect==='gear-enhancement'&&stack?.payload?.persistentAttachment&&stack?.payload?.slot===slot&&(!stack?.payload?.crafterOnly||stack.payload.boundCharacterId===c?.id))
}
function attachmentMeta(stack){
  const P=window.CellboundProfessions,meta=P?.recipeMetaForOutputKey?.(stack?.key)||null,recipe=meta?.recipe;
  return{profession:meta?.profession||'Profession',skill:Number(recipe?.level)||1,tier:Number(stack?.payload?.attachmentTier)||P?.attachmentTier?.(recipe?.level)||1,rarity:stack?.rarity||recipe?.output?.rarity||P?.craftedRarity?.(recipe?.level,recipe?.endgame)||'Uncommon'}
}
function attachmentCard(stack,current){
  const P=window.CellboundProfessions,meta=attachmentMeta(stack),same=current?.key===stack.key&&(!stack.payload?.crafterOnly||current?.boundCharacterId===stack.payload.boundCharacterId),art=P?.consumableArtHTML?.(stack.key,48,'cb-attachment-art')||'✥';
  return `<article class="cb-attachment-option ${same?'currently-attached':''}">
    <div class="cb-attachment-option-art">${art}</div>
    <div class="cb-attachment-option-copy"><small>${meta.profession.toUpperCase()} · SKILL ${meta.skill} · TIER ${meta.tier}${stack.payload?.crafterOnly?' · CRAFTER ONLY':''}</small><b>${escHtml(stack.name)}</b><span>${escHtml(P?.bonusText?.(stack.payload?.bonuses)||stack.payload?.description||'Gear attachment')}${stack.payload?.procText?' · '+escHtml(stack.payload.procText):''}</span><em>${same?'Currently attached':meta.rarity+' · ×'+(stack.quantity||1)+' in Bank'+(current?' · replaces current attachment':'')}</em></div>
    <button type="button" data-apply-attachment="${stack.key}" ${same?'disabled':''}>${same?'ATTACHED':current?'REPLACE':'ATTACH'}</button>
  </article>`
}
function socketGemStacks(state,c){
  return (Array.isArray(state?.consumables)?state.consumables:[]).filter(stack=>Number(stack?.quantity)>0&&stack?.payload?.effect==='socket-gem'&&stack?.payload?.socketReady!==false&&(!stack?.payload?.crafterOnly||stack.payload.boundCharacterId===c?.id))
}
function socketGemMeta(stack){
  const P=window.CellboundProfessions,meta=P?.recipeMetaForOutputKey?.(stack?.key)||null,recipe=meta?.recipe;
  return{profession:meta?.profession||'Jewelcrafting',skill:Number(recipe?.level)||1,rarity:stack?.rarity||recipe?.output?.rarity||P?.craftedRarity?.(recipe?.level,recipe?.endgame)||'Uncommon'}
}
function socketGemCard(stack,currentGem,index){
  const P=window.CellboundProfessions,meta=socketGemMeta(stack),same=currentGem?.key===stack.key&&(!stack.payload?.crafterOnly||currentGem?.boundCharacterId===stack.payload.boundCharacterId),art=P?.consumableArtHTML?.(stack.key,42,'cb-socket-gem-art')||'◆';
  return `<article class="cb-socket-gem-option ${same?'currently-socketed':''}"><div class="cb-socket-gem-art">${art}</div><div><small>${meta.profession.toUpperCase()} · SKILL ${meta.skill}${stack.payload?.crafterOnly?' · CRAFTER ONLY':''}</small><b>${escHtml(stack.name)}</b><span>${escHtml(P?.bonusText?.(stack.payload?.bonuses)||'Socket bonus')}</span><em>${same?'Currently socketed':meta.rarity+' · ×'+(stack.quantity||1)+' in Bank'}</em></div><button type="button" data-apply-gem="${stack.key}" data-socket-index="${index}" ${same?'disabled':''}>${same?'SOCKETED':currentGem?'REPLACE':'INSERT'}</button></article>`
}
function socketPanel(state,c,item){
  if(!item||!G?.socketEligible?.(item))return'';
  G.ensureSockets?.(item);
  const count=Math.max(0,Number(item.socketCount)||0),gems=socketGemStacks(state,c),P=window.CellboundProfessions;
  if(!count)return `<section class="cb-socket-panel no-socket"><div class="cb-socket-panel-head"><div><small>JEWELCRAFTING SOCKETS</small><h4>No socket on this item</h4><p>This eligible ${escHtml(item.slot)} rolled without a socket. Higher-tier equipment has a better socket chance; Tier 4+ guarantees at least one.</p></div><span>0 SOCKETS</span></div></section>`;
  return `<section class="cb-socket-panel"><div class="cb-socket-panel-head"><div><small>JEWELCRAFTING SOCKETS</small><h4>${count} socket${count===1?'':'s'} available</h4><p>Inserting a gem consumes it from the Bank. Replacing a gem permanently destroys the old one.</p></div><span>${(item.sockets||[]).filter(Boolean).length}/${count} FILLED</span></div><div class="cb-socket-list">${Array.from({length:count},(_,index)=>{const gem=item.sockets?.[index]||null,usable=!gem?.crafterOnly||gem.boundCharacterId===c?.id;return `<div class="cb-socket-slot ${gem?'filled':'empty'} ${usable?'':'is-inactive'}"><header><span>◆</span><div><small>SOCKET ${index+1}</small><b>${gem?escHtml(gem.name||'Socket Gem'):'Open Socket'}</b><em>${gem?(usable?escHtml(P?.bonusText?.(gem.bonuses)||''):'Inactive · bound to '+escHtml(gem.boundCharacterName||'its crafter')):'Choose a gem from the Bank'}</em></div></header><div class="cb-socket-gem-options">${gems.length?gems.map(stack=>socketGemCard(stack,gem,index)).join(''):'<div class="cb-no-items">No Jewelcrafting gems are currently stored in the Bank.</div>'}</div></div>`}).join('')}</div></section>`
}
function slotPicker(state,c,slot){
  const bank=Array.isArray(state?.bank)?state.bank:[];
  const candidates=bank.filter(item=>canUse(c,item)&&possibleSlots(item).includes(slot));
  const current=c.equipment?.[slot];if(current)G?.ensureSockets?.(current);
  const currentIlvl=Number(current?.itemLevel)||0;
  const shards=Number(state?.materials?.['cell-shards'])||0;
  const upgradeCost=current?equippedUpgradeCost(current):0;
  const upgradeMax=current?equippedUpgradeMax(current):0;
  const nextIlvl=current?Math.min(upgradeMax,currentIlvl+2):0;
  const attachments=current?attachmentStacksForSlot(state,slot,c):[];
  const attached=current?.attachment||null;
  const P=window.CellboundProfessions,attachmentUsable=!attached?.crafterOnly||attached?.boundCharacterId===c?.id;
  const currentAttachment=attached?`<div class="cb-current-attachment ${attachmentUsable?'':'is-inactive'}"><small>${attached.crafterOnly?'CRAFTER-ONLY ATTACHMENT':'ATTACHED MODIFICATION'}</small><b>${escHtml(attached.name||attached.key||'Attachment')}</b><span>${escHtml(P?.bonusText?.(attached.bonuses)||'')}${attached.procText?' · '+escHtml(attached.procText):''}</span><em>${attachmentUsable?'Permanent on this item. Applying another attachment destroys this one.':'Inactive for '+escHtml(c.name)+' · bound to '+escHtml(attached.boundCharacterName||'its crafter')+'.'}</em></div>`:'';
  const sockets=current?socketPanel(state,c,current):'';
  const attachmentPanel=current?`<section class="cb-attachment-panel">
    <div class="cb-attachment-panel-head"><div><small>CRAFTED ATTACHMENTS</small><h4>Modify this ${escHtml(slot)}</h4><p>Applying an attachment consumes it from the Bank. Replacing one permanently destroys the old attachment.</p></div><span>${attachments.length} compatible in Bank</span></div>
    ${currentAttachment}
    <div class="cb-attachment-options">${attachments.length?attachments.map(stack=>attachmentCard(stack,attached)).join(''):'<div class="cb-no-items">No compatible crafted attachments are stored in the Bank. Craft or buy one and it will appear here automatically.</div>'}</div>
  </section>`:'';
  const currentActions=current?`<div class="cb-current-actions">
    <button type="button" class="cb-unequip-btn" data-unequip-slot="${slot}">UNEQUIP TO BANK</button>
    <button type="button" class="cb-upgrade-equipped-btn" data-upgrade-equipped="${slot}" ${equippedCanUpgrade(current)&&shards>=upgradeCost?'':'disabled'}>${equippedCanUpgrade(current)?`UPGRADE TO ILVL ${nextIlvl}`:'UPGRADE CAP REACHED'}</button>
    <small>${equippedCanUpgrade(current)?`${upgradeCost} Cell Shards required · ${shards} available`:`Maximum Item Level ${upgradeMax}`}</small>
  </div>`:'';
  return `<button class="cb-slot-drawer-backdrop" data-close-slot aria-label="Close equipment drawer"></button><div class="cb-slot-drawer">
    <div class="cb-slot-drawer-head"><div><small>${slot}</small><h3>${current?.name||'Empty slot'}</h3></div><button data-close-slot>×</button></div>
    ${current?`<div class="cb-current-item ${rarityClass(current)}"><span>${G?.artHTML?.(current,56)||current.icon||slotIcons[slot]}</span><div><b>${current.name}</b><small>${current.rarity||'Starter'} · iLvl ${currentIlvl}${current.power?` · +${current.power} power`:''}${Number(current.upgradeLevel)>0?` · Upgrade ${Number(current.upgradeLevel)}`:''}</small><em class="cb-current-roll">${(G?.statLines?.(current)||[]).map(s=>s.text).join(' · ')||'Legacy roll'}</em>${setInlineMarkup(c,current)}</div></div>`:''}
    ${currentActions}
    ${sockets}
    ${attachmentPanel}
    <p>Compatible Guild Bank equipment</p>
    <div class="cb-slot-options">${candidates.length?candidates.sort((a,b)=>(b.itemLevel||0)-(a.itemLevel||0)).map(item=>{const delta=(Number(item.itemLevel)||0)-currentIlvl,fit=G?.rollFit?.(c,item),stats=(G?.statLines?.(item)||[]).map(s=>s.text).join(' · ')||'Legacy roll',attachment=item.attachment?` · ✥ ${item.attachment.name||'Attached'}`:'',socketInfo=Number(item.socketCount)>0?` · ◆ ${G?.socketSummary?.(item)||''}`:'';return `<button data-equip-bank="${item.id}" data-equip-slot="${slot}" class="${rarityClass(item)}"><span>${G?.artHTML?.(item,48)||item.icon||'◇'}</span><div><b>${item.name}</b><small>${item.rarity} · iLvl ${item.itemLevel||0} · ×${item.quantity||1}${attachment}${socketInfo}</small><strong class="cb-option-roll">${stats}</strong>${setInlineMarkup(c,item)}<em class="${delta>0?'upgrade':delta<0?'downgrade':''}">${fit?.label||''}${delta===0?' · Same Item Level':delta>0?` · +${delta} Item Level`:` · ${delta} Item Level`}</em></div></button>`}).join(''):'<div class="cb-no-items">No compatible items are currently stored in the Bank.</div>'}</div>
  </div>`;
}
function refreshOpenEquipmentDrawer(state,c,slot){
  activeSlot=slot;
  const oldDrawer=detail?.querySelector?.('.cb-slot-drawer'),oldBackdrop=detail?.querySelector?.('.cb-slot-drawer-backdrop');
  if(!oldDrawer||!oldBackdrop){renderSheet();return}
  const scrollTop=oldDrawer.scrollTop,holder=document.createElement('div');
  holder.innerHTML=slotPicker(state,c,slot);
  const nextDrawer=holder.querySelector('.cb-slot-drawer'),nextBackdrop=holder.querySelector('.cb-slot-drawer-backdrop');
  if(!nextDrawer||!nextBackdrop){renderSheet();return}
  oldBackdrop.replaceWith(nextBackdrop);oldDrawer.replaceWith(nextDrawer);
  requestAnimationFrame(()=>{nextDrawer.scrollTop=Math.min(scrollTop,Math.max(0,nextDrawer.scrollHeight-nextDrawer.clientHeight))})
}
function totalSpent(c,spec){return B?.talentSpent?.(c,spec)??Object.values(c.talents?.[spec]||{}).reduce((a,b)=>a+(Number(b)||0),0)}
function talentBudget(c){return B?.talentBudgetForLevel?.(c?.level)??Math.max(1,Number(c?.level)||1)}
function talentRemaining(c,spec){return B?.talentRemaining?.(c,spec)??Math.max(0,talentBudget(c)-totalSpent(c,spec))}
function tierNeed(node){return B?.tierRequirement?.(node?.tier)??Math.max(0,Number(node?.tier)||0)*2}
function treeNodeState(c,spec,node){
  const ranks=c.talents?.[spec]||{},rank=ranks[node.id]||0,spent=totalSpent(c,spec);
  const prereq=!node.req||(ranks[node.req]||0)>0;
  const tierOk=spent>=tierNeed(node);
  return {rank,available:prereq&&tierOk,complete:rank>=node.max};
}
function talentLockReason(c,spec,node,s){
  if(s.complete)return'Maximum rank reached.';
  if(node.req&&!(c.talents?.[spec]?.[node.req]>0))return'Requires '+node.req+'.';
  const spent=totalSpent(c,spec),need=tierNeed(node);
  if(spent<need)return'Requires '+need+' points spent in this tree.';
  if(!(talentRemaining(c,spec)>0))return'No build points available for this specialisation.';
  return'Ready to invest.';
}
function talentInspector(c,spec,node){
  if(!node)return `<aside class="cb-talent-inspector cb-talent-inspector-v2 empty"><span>SELECT A TALENT</span><h3>Build your specialisation.</h3><p>Choose a talent to inspect its combat effect, ranks and requirements before spending a point.</p></aside>`;
  const s=treeNodeState(c,spec,node),reason=talentLockReason(c,spec,node,s);
  const canInvest=s.available&&!s.complete&&(talentRemaining(c,spec)>0),combatRule=window.CellboundCombatReborn?.talents?.rules?.[node.id]||node.desc;
  const rankPips=Array.from({length:node.max},(_,i)=>`<i class="${i<s.rank?'filled':''}"></i>`).join('');
  const status=s.complete?'MAX RANK':canInvest?'READY TO LEARN':s.available?'NO POINTS':'LOCKED';
  return `<aside class="cb-talent-inspector cb-talent-inspector-v2 ${canInvest?'investable':''}">
    <div class="cb-talent-inspector-head"><span class="cb-inspector-icon">${node.icon}</span><div><small>TIER ${node.tier+1} · ${spec.toUpperCase()}</small><h3>${node.id}</h3><div class="cb-inspector-ranks">${rankPips}<span>Rank ${s.rank}/${node.max}</span></div></div></div>
    <div class="cb-inspector-status ${canInvest?'ready':s.complete?'complete':'locked'}">${status}</div>
    <section><small>COMBAT EFFECT</small><p>${combatRule}</p></section>
    <section><small>NEXT RANK</small><p>${s.complete?'This talent is fully ranked.':node.max===1?'One point unlocks this talent effect.':`Spend one point to reach Rank ${s.rank+1} of ${node.max}.`}</p></section>
    <div class="cb-talent-requirements">
      <div><span>Tier unlock</span><b>${node.tier?tierNeed(node)+' points spent':'Available immediately'}</b></div>
      <div><span>Prerequisite</span><b>${node.req||'None'}</b></div>
      <div><span>Status</span><b class="${canInvest?'ready':''}">${reason}</b></div>
    </div>
    <button class="cb-invest-talent" data-invest-talent="${node.id}" data-tree-spec="${spec}" ${canInvest?'':'disabled'}>${s.complete?'MAXIMUM RANK':canInvest?'SPEND 1 TALENT POINT':'UNAVAILABLE'}</button>
  </aside>`;
}

function talentTree(c,spec){
  const nodes=(trees[c.class]?.[spec]||[]).slice().sort((a,b)=>a.tier-b.tier||a.col-b.col);
  const spent=totalSpent(c,spec),role=roleLabel(specs[c.class]?.[spec]||'dps');
  let selected=nodes.find(n=>n.id===selectedTalentId&&selectedTalentSpec===spec);
  if(!selected)selected=nodes.find(n=>treeNodeState(c,spec,n).available&&!treeNodeState(c,spec,n).complete)||nodes[0]||null;
  if(selected){selectedTalentId=selected.id;selectedTalentSpec=spec}
  const tierNames=['Foundations','Specialisation','Core Techniques','Advanced','Capstone'];
  const tiers=[0,1,2,3,4].map(tier=>{
    const tierNodes=nodes.filter(n=>n.tier===tier),need=B?.tierRequirement?.(tier)??tier*2,open=spent>=need;
    const cards=tierNodes.map(node=>{
      const s=treeNodeState(c,spec,node),isSelected=selected?.id===node.id,canInvest=s.available&&!s.complete&&(c.talent>0);
      const rankPips=Array.from({length:node.max},(_,i)=>`<i class="${i<s.rank?'filled':''}"></i>`).join('');
      const combatRule=window.CellboundCombatReborn?.talents?.rules?.[node.id]||node.desc;
      const stateLabel=s.complete?'MAX':canInvest?'READY':s.available?'NO POINTS':'LOCKED';
      return `<article class="cb-talent-card ${s.available?'available':'locked'} ${s.complete?'complete':''} ${isSelected?'selected':''} ${tier===4?'capstone':''}">
        <button type="button" class="cb-talent-card-main" data-talent-node="${node.id}" data-tree-spec="${spec}" aria-pressed="${isSelected?'true':'false'}">
          <span class="cb-talent-card-icon">${node.icon}</span>
          <span class="cb-talent-card-copy"><small>${node.req?'REQUIRES '+node.req.toUpperCase():'TIER '+(tier+1)}</small><b>${node.id}</b><em>${node.desc}</em></span>
          <span class="cb-talent-card-state ${canInvest?'ready':s.complete?'complete':'locked'}">${stateLabel}</span>
          <span class="cb-talent-card-ranks">${rankPips}<em>${s.rank}/${node.max}</em></span>
        </button>
        ${isSelected?`<div class="cb-talent-inline-detail"><small>COMBAT EFFECT</small><p>${combatRule}</p><div><span>${talentLockReason(c,spec,node,s)}</span><button type="button" data-invest-talent="${node.id}" data-tree-spec="${spec}" ${canInvest?'':'disabled'}>${s.complete?'MAX RANK':canInvest?'SPEND 1 POINT':'UNAVAILABLE'}</button></div></div>`:''}
      </article>`
    }).join('');
    return `<section class="cb-talent-tier ${open?'open':'locked'} ${tier===4?'capstone':''}">
      <header><span>0${tier+1}</span><div><small>TIER ${tier+1}</small><b>${tierNames[tier]}</b></div><em>${tier===0?'OPEN':open?'UNLOCKED':need+' POINTS REQUIRED'}</em></header>
      <div class="cb-talent-tier-cards">${cards||'<div class="cb-no-items">No talents in this tier.</div>'}</div>
    </section>`
  }).join('');
  return `<div class="cb-talent-command-v2">
    <section class="cb-talent-command-hero">
      <div><small>CLASS TALENTS · ${c.class.toUpperCase()}</small><h3>${spec}</h3><p>${role} specialisation · Build through five tiers. Locked talents can still be inspected before you commit.</p><div class="cb-spec-activate-row">${spec===c.spec?'<span class="cb-spec-active-pill">ACTIVE SPECIALISATION</span>':`<button type="button" class="cb-activate-spec" data-activate-spec="${spec}">ACTIVATE ${spec.toUpperCase()}</button>`}</div></div>
      <div class="cb-talent-command-metrics">
        <div><span>AVAILABLE</span><b>${talentRemaining(c,spec)}</b><small>${spec} build points</small></div>
        <div><span>SPENT</span><b>${spent}/${talentBudget(c)}</b><small>In ${spec}</small></div>
        <div><span>ROLE</span><b>${role}</b><small>${spec===c.spec?'Active specialisation':'Inactive specialisation'}</small></div>
      </div>
    </section>
    <div class="cb-talent-board">
      <div class="cb-talent-tier-stack">${tiers}</div>
      ${talentInspector(c,spec,selected)}
    </div>
  </div>`;
}

function specTabs(c){const browsing=selectedTreeSpec&&specs[c.class]?.[selectedTreeSpec]?selectedTreeSpec:c.spec;return Object.keys(specs[c.class]||{}).map(spec=>`<button class="cb-spec-tab ${browsing===spec?'active':''}" data-spec-tab="${spec}">${spec}<small>${roleLabel(specs[c.class][spec])}${c.spec===spec?' · ACTIVE':''}</small></button>`).join('')}
function combatIdentityPanel(c){
  const info=I?.summary?.(c),race=info?.race,spec=info?.spec;
  if(!race||!spec)return'';
  return '<section class="cb-profile-panel cb-identity-panel"><h3>Combat Identity</h3><div class="cb-identity-grid"><article><small>RACE · '+escHtml(race.name)+'</small><b>'+escHtml(race.trait)+'</b><p>'+escHtml(race.strength)+'</p><em>Trade-off: '+escHtml(race.tradeoff)+'</em></article><article><small>'+escHtml(c.class)+' · '+escHtml(c.spec)+'</small><b>'+escHtml(spec.title)+'</b><p>'+escHtml(spec.strength)+'</p><em>Trade-off: '+escHtml(spec.tradeoff)+'</em></article></div></section>';
}
function escHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function overviewPanel(c,state){
  const meta=classMeta[c.class]||{primary:'Strength',icon:'◇',accent:'#58d7cf'},stats=statBlock(c),role=roleLabel(roleOf(c));
  const ilvl=window.CellboundGame?.characterItemLevel?.(c)||c.gear||0;
  const active=[state?.party?.tank,state?.party?.healer,...(state?.party?.dps||[])].includes(c.id);
  const recovering=window.CellboundGame?.isUnavailable?.(c)||false;
  const health=sheetMaxHealth(c);
  const allSlots=[...leftSlots,...rightSlots],equipped=allSlots.filter(slot=>c.equipment?.[slot]).length;
  const upgrades=allSlots.filter(slot=>bestBankUpgrade(state,c,slot)).length;
  const primary=stats[meta.primary]??0;
  const professionCount=(Array.isArray(c.professions)?c.professions:[]).filter(Boolean).length;
  const loadout=allSlots.map(slot=>{
    const item=c.equipment?.[slot],label=slot.replace(/(\d)/,' $1');
    return `<button type="button" class="cb-overview-gear-item ${item?'filled':'empty'}" data-sheet-tab="equipment"><span>${label}</span><b>${item?.name||'Empty'}</b><em>${item?'iLvl '+(item.itemLevel||0):'Open slot'}</em></button>`
  }).join('');
  return `<div class="cb-command-overview">
    <section class="cb-overview-hero">
      <div class="cb-overview-identity">
        <small>COMBAT PROFILE</small>
        <div class="cb-overview-title"><span>${meta.icon}</span><div><h3>${c.class} · ${c.spec}</h3><p>Level ${c.level} ${c.race||'Veyren'} · ${role} · ${active?'Active Party':'Reserve'}</p></div></div>
        <div class="cb-overview-badges"><span class="${recovering?'danger':'ready'}">${recovering?'RECOVERING':'READY FOR DUTY'}</span><span>${equipped}/14 GEAR SLOTS</span>${upgrades?`<span class="upgrade">${upgrades} BANK UPGRADE${upgrades===1?'':'S'}</span>`:''}</div>
      </div>
      <div class="cb-overview-vitals">
        <article><span>ITEM LEVEL</span><b>${ilvl}</b><small>Average gear</small></article>
        <article><span>POWER</span><b>${c.power||0}</b><small>Combat power</small></article>
        <article class="${Number(c.cellShock||0)>=75?'danger':''}"><span>CELL SHOCK</span><b>${Math.round(c.cellShock||0)}%</b><small>${recovering?'Unavailable':'Current pressure'}</small></article>
        <article><span>HEALTH</span><b>${health.toLocaleString()}</b><small>Maximum health</small></article>
      </div>
    </section>

    <div class="cb-overview-grid">
      <section class="cb-profile-panel cb-overview-stats-panel">
        <header><div><small>CORE PROFILE</small><h3>Combat Readiness</h3></div><button type="button" data-sheet-tab="talents">VIEW BUILD →</button></header>
        <div class="cb-overview-stat-grid">
          <div><span>${meta.primary.toUpperCase()}</span><b>${primary}</b></div>
          <div><span>STAMINA</span><b>${stats.Stamina}</b></div>
          <div><span>ARMOUR</span><b>${stats.Armour}</b></div>
          <div><span>TALENT POINTS</span><b>${c.talent||0}</b></div>
          <div><span>PROFESSIONS</span><b>${professionCount}</b></div>
          <div><span>STATUS</span><b>${active?'ACTIVE FIVE':'RESERVE'}</b></div>
        </div>
        <p>Level, equipment, talents and equipped combat skills determine this adventurer's combat performance.</p>
      </section>

      <section class="cb-profile-panel cb-overview-loadout-panel">
        <header><div><small>ARMOURY</small><h3>Current Loadout</h3></div><button type="button" data-sheet-tab="equipment">OPEN EQUIPMENT →</button></header>
        <div class="cb-overview-gear-grid">${loadout}</div>
      </section>
    </div>

    ${combatIdentityPanel(c)}
  </div>`;
}

function buffEffectText(buff){return buff?Object.entries(buff.effect||{}).map(([key,value])=>{const labels={outgoingDamage:'Damage',incomingDamageReduction:'Damage taken',resourceRegen:'Resource regeneration',haste:'Haste',critBonus:'Critical chance',threatBonus:'Threat',outgoingHealing:'Healing done',incomingHealing:'Healing received'};return(labels[key]||key)+' '+(key==='incomingDamageReduction'?'−':'+')+Math.round(Number(value)*100)+'%'}).join(' · '):''}
function classBuffProgressMarkup(c){
 const level=Math.max(1,Number(c.level)||1),unlocked=unlockedBuffIds(c),quests=buffQuestList(c),active=classBuffFor(c),selecting=activeLoadoutSlot==='buff';
 return '<section class="cb-class-buff-progression '+(selecting?'is-selecting':'')+'"><div class="cb-skill-library-head"><div><small>AVAILABLE CLASS BUFFS</small><h4>'+(selecting?'Choose a buff for Slot 5':'Class Disciplines')+'</h4></div><span>'+unlocked.length+' / '+quests.length+' learned</span></div><div class="cb-class-buff-grid">'+quests.map(q=>{const learned=unlocked.includes(q.id),levelLocked=level<q.level,pvpLocked=!!q.pvp,isEquipped=active?.id===q.id;return '<article class="cb-class-buff-card '+(learned?'learned ':'')+(isEquipped?'equipped ':'')+((levelLocked||pvpLocked)?'locked':'')+'"><div class="cb-skill-card-icon">'+(learned?'▲':'◇')+'</div><div class="cb-skill-card-copy"><div><small>LEVEL '+q.level+(q.pvp?' · PVP':'')+'</small><h4>'+escHtml(q.name)+'</h4></div><p>'+escHtml(q.desc)+'</p><span>'+escHtml(buffEffectText(q)||'PvP effects activate when PvP releases.')+'</span></div>'+(learned?'<button type="button" class="cb-skill-equip" data-equip-buff="'+escHtml(q.id)+'">'+(isEquipped?'EQUIPPED IN SLOT 5':'EQUIP TO SLOT 5')+'</button>':pvpLocked?'<strong>PVP NOT YET AVAILABLE</strong>':levelLocked?'<strong>REQUIRES LEVEL '+q.level+'</strong>':'<button type="button" data-open-class-trials>OPEN CLASS TRIAL →</button>')+'</article>'}).join('')+'</div></section>'
}
function skillsPanel(c){
 const spec=c.spec,pool=skillPoolFor(c,spec),level=Math.max(1,Number(c.level)||1),equipped=equippedSkillIds(c,spec),selected=Math.max(0,Math.min(3,Number(activeSkillSlot)||0)),byId=new Map(pool.map(s=>[s.id,s])),buff=classBuffFor(c),buffSelected=activeLoadoutSlot==='buff';
 const unlockedCount=pool.filter(s=>skillAvailable(c,s,spec)).length,nextUnlock=pool.filter(s=>(Number(s.unlockLevel)||1)>level).sort((a,b)=>(a.unlockLevel||1)-(b.unlockLevel||1))[0];
 const skillSlots=equipped.map((id,i)=>{const skill=byId.get(id);return '<button type="button" class="cb-skill-slot '+(!buffSelected&&i===selected?'active ':'')+(skill?'filled':'empty')+'" data-skill-slot="'+i+'"><small>SLOT '+(i+1)+'</small><i>'+skillIcon(skill?.kind)+'</i><span><b>'+escHtml(skill?.name||'Empty Skill Slot')+'</b><em>'+(skill?skillKindLabel(skill.kind)+' · '+skillCooldownText(skill):'Tap this slot, then choose a skill')+'</em></span></button>'}).join('');
 const buffSlot='<button type="button" class="cb-skill-slot cb-buff-loadout-slot '+(buffSelected?'active ':'')+(buff?'filled':'empty locked')+'" data-buff-slot><small>SLOT 5 · CLASS BUFF</small><i>'+(buff?'▲':'◇')+'</i><span><b>'+escHtml(buff?.name||'Class Buff Locked')+'</b><em>'+escHtml(buff?buffEffectText(buff):(level<5?'Unlocks through the Level 5 Class Trial':'Tap to view your Class Trial'))+'</em></span></button>';
 const library=pool.slice().sort((a,b)=>(skillAvailable(c,a,spec)?0:1)-(skillAvailable(c,b,spec)?0:1)||(a.unlockLevel||1)-(b.unlockLevel||1)).map(skill=>{const unlock=Math.max(1,Number(skill.unlockLevel)||1),talentLocked=!skillTalentMet(c,skill,spec),locked=unlock>level||talentLocked,isEquipped=equipped.includes(skill.id);return '<article class="cb-skill-card kind-'+escHtml(skill.kind)+' '+(locked?'locked ':'')+(isEquipped?'equipped':'')+'"><div class="cb-skill-card-icon">'+skillIcon(skill.kind)+'</div><div class="cb-skill-card-copy"><div><small>'+skillKindLabel(skill.kind)+'</small><h4>'+escHtml(skill.name)+'</h4></div><p>'+escHtml(skill.desc||'Combat skill.')+'</p></div>'+(locked?'<div class="cb-skill-lock"><b>'+(talentLocked?'REQUIRES '+escHtml(skill.talentReq).toUpperCase():'LEVEL '+unlock)+'</b></div>':'<button type="button" class="cb-skill-equip" data-equip-skill="'+escHtml(skill.id)+'">'+(isEquipped?'MOVE TO SLOT ':'EQUIP TO SLOT ')+(selected+1)+'</button>')+'</article>'}).join('');
 return '<div class="cb-skills-screen"><section class="cb-skills-hero"><div><small>COMBAT LOADOUT · '+escHtml(spec.toUpperCase())+'</small><h3>5-Slot Combat Loadout</h3><p>Slots 1–4 hold combat skills. Slot 5 is reserved for one earned Class Buff.</p></div><div class="cb-skill-progress"><span>SKILLS UNLOCKED</span><b>'+unlockedCount+' / '+pool.length+'</b><small>'+(nextUnlock?'Next skill: '+escHtml(nextUnlock.name)+' at Level '+nextUnlock.unlockLevel:'All current skills unlocked')+'</small></div></section><section class="cb-loadout-panel"><div class="cb-loadout-head"><div><small>ACTIVE LOADOUT</small><h4>'+(buffSelected?'Slot 5 selected — choose an unlocked Class Buff below.':'Select a slot, then choose what to equip.')+'</h4></div><button type="button" data-reset-skills>RESET SKILLS</button></div><div class="cb-skill-slots">'+skillSlots+buffSlot+'</div></section>'+(buffSelected?classBuffProgressMarkup(c):'<section class="cb-skill-library"><div class="cb-skill-library-head"><div><small>AVAILABLE SKILLS</small><h4>'+escHtml(c.class)+' · '+escHtml(spec)+'</h4></div><span>Level '+level+'</span></div><div class="cb-skill-grid">'+library+'</div></section>'+classBuffProgressMarkup(c))+'</div>'
}

function professionsPanel(c){
  const p=c.professions?.[0],level=Math.max(0,Math.min(100,Number(p?.level)||0));
  const slot=`<article class="cb-profession-command-card ${p?'trained':'empty'}">
      <div class="cb-profession-command-icon">${p?'⚒':'+'}</div>
      <div><small>PROFESSION</small><h4>${p?.name||'Unlearned'}</h4><p>${p?'Keep crafting to raise this profession toward Skill 100.':'Choose a profession in the Guild Workshop.'}</p></div>
      <div class="cb-profession-level"><span>SKILL</span><b>${level+'/100'}</b><i><em style="width:${level}%"></em></i></div>
    </article>`;
  return `<div class="cb-profession-command">
    <section class="cb-character-tab-hero">
      <div><small>CRAFTING PROFILE</small><h3>Professions</h3><p>Each adventurer can learn one profession. Recipes, materials and crafting stay in the shared Guild Workshop.</p></div>
      <div class="cb-character-tab-stat"><span>AVAILABLE SLOTS</span><b>1 / 1</b><small>One profession per adventurer</small></div>
    </section>
    <div class="cb-profession-command-grid">${slot}</div>
    <section class="cb-character-action-banner"><div><small>GUILD WORKSHOP</small><b>Crafting happens at guild level.</b><span>Open Professions to manage recipes, reagents and preparation items without losing this character's assignment.</span></div><button type="button" data-char-jump="professions">OPEN GUILD WORKSHOP →</button></section>
  </div>`
}

function fallbackEquipmentSlot(c,slot){
  const raw=c?.equipment?.[slot],item=raw&&typeof raw==='object'?raw:null;
  const name=item?.name||(typeof raw==='string'?raw:'Empty'),ilvl=Math.max(0,Number(item?.itemLevel)||0);
  return `<button type='button' class='cb-equip-slot ${item?rarityClass(item):'cb-empty'}' data-slot='${slot}'><span class='cb-slot-icon'>${slotIcons[slot]||'◇'}</span><span class='cb-slot-copy'><small>${slot.replace(/(\d)/,' $1')}</small><b>${escHtml(name)}</b><span class='cb-slot-ilvl'>${item?'Item Level '+ilvl:'Equipment slot'}</span></span></button>`;
}
function equipmentFallback(c,state,error){
  const meta=classMeta[c?.class]||{icon:'◇',accent:'#58d7cf'},all=[...leftSlots,...rightSlots];
  const left=leftSlots.map(slot=>fallbackEquipmentSlot(c,slot)).join(''),right=rightSlots.map(slot=>fallbackEquipmentSlot(c,slot)).join('');
  const visible=[...leftSlots,...rightSlots].filter(slot=>c?.equipment?.[slot]).length;
  const equipped=all.filter(slot=>c?.equipment?.[slot]).length;
  let visual=portraitHTML(c,'hero');
  try{visual=CP?.paperDollHTML?.(c,{size:'equipment',highlightedSlot:activeSlot,accent:meta.accent})||visual}catch(e){console.warn('Paper doll fallback isolated:',e)}
  let drawer='';
  if(activeSlot){try{drawer=slotPicker(state,c,activeSlot)}catch(e){console.warn('Equipment drawer fallback isolated:',e)}}
  return `<div class='cb-paperdoll cb-armoury-screen cb-armoury-stats-screen cb-equipment-recovery' style='--cb-accent:${meta.accent}'><div class='cb-gear-column cb-gear-left'>${left}</div><section class='cb-armoury-stage cb-stat-command cb-recovery-armoury'><div class='cb-armoury-heading'><div><small>CHARACTER ARMOURY</small><h3>${escHtml(c?.name||'Adventurer')}</h3><p>${escHtml(c?.race||'Veyren')} · ${escHtml(c?.class||'Adventurer')} · ${escHtml(c?.spec||'')}</p></div><span class='cb-role-pill'>${equipped}/14 SLOTS</span></div><div class='cb-equipment-visual-stage' data-paper-doll-stage><div class='cb-equipment-visual-meta'><span>LIVE EQUIPMENT VIEW</span><b>${visible}/14 visual slots equipped</b></div><div class='cb-equipment-visual-model'>${visual}</div><div class='cb-equipment-visual-foot'><span>${activeSlot?'Inspecting '+escHtml(activeSlot):'Select a gear slot to highlight it on the character.'}</span><em>Appearance updates with equipped gear.</em></div></div><div class='cb-recovery-note'><strong>Armoury protected</strong><span>A legacy item value was isolated without hiding the character viewer.</span></div></section><div class='cb-gear-column cb-gear-right'>${right}</div>${drawer}</div>`;
}
function equipmentPanel(c,state){
  try{return `${paperDoll(c,state)}${activeSlot?slotPicker(state,c,activeSlot):''}`}
  catch(error){
    console.error('Cellbound equipment tab render recovered from an item/UI error:',error);
    return equipmentFallback(c,state,error);
  }
}

function sheetBody(state,c){
  if(currentTab==='overview')return overviewPanel(c,state);
  if(currentTab==='equipment')return equipmentPanel(c,state);
  if(currentTab==='talents'){const treeSpec=selectedTreeSpec&&specs[c.class]?.[selectedTreeSpec]?selectedTreeSpec:c.spec;return `<div class="cb-spec-tabs">${specTabs(c)}</div>${talentTree(c,treeSpec)}`}
  if(currentTab==='skills')return skillsPanel(c);
  if(currentTab==='professions')return professionsPanel(c);
  if(currentTab==='history')return historyPanel(c,state);
  currentTab='overview';return overviewPanel(c,state);
}
function renderSheet(){
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId));
  if(!state||!c)return;
  const editable=characterEditable(),meta=classMeta[c.class]||{icon:'◇',accent:'#58d7cf'};
  const role=roleLabel(roleOf(c)),ilvl=window.CellboundGame?.characterItemLevel?.(c)||c.gear||0;
  const active=[state?.party?.tank,state?.party?.healer,...(state?.party?.dps||[])].includes(c.id);
  const recovering=window.CellboundGame?.isUnavailable?.(c)||false,shock=Math.round(Number(c.cellShock)||0);
  const tabs=CHARACTER_TABS.map(([id,icon,label,sub])=>`<button type="button" data-sheet-tab="${id}" class="${currentTab===id?'active':''}" aria-current="${currentTab===id?'page':'false'}"><i>${icon}</i><span><b>${label}</b><small>${sub}</small></span></button>`).join('');
  detail.innerHTML=`<div class="cb-sheet cb-command-sheet ${editable?'':'member-slot-locked'}" style="--cb-accent:${meta.accent}">
    <header class="cb-sheet-header cb-command-character-header">
      <div class="cb-header-crest cb-header-portrait">${portraitHTML(c,'lg')}</div>
      <div class="cb-header-identity"><div class="cb-header-eyebrow"><span>LEVEL ${c.level} · ${c.race||'Veyren'}</span><em class="${recovering?'recovering':active?'active':'reserve'}">${recovering?'RECOVERING':active?'ACTIVE PARTY':'RESERVE'}</em></div><h2>${c.name}</h2><div class="cb-header-subtitle">${c.class} · ${c.spec} · ${role}</div></div>
      <div class="cb-header-metrics">
        <div><span>ITEM LEVEL</span><b>${ilvl}</b></div>
        <div><span>POWER</span><b>${c.power||0}</b></div>
        <div class="${shock>=75?'danger':''}"><span>CELL SHOCK</span><b>${shock}%</b></div>
        <div><span>BUILD POINTS</span><b>${talentRemaining(c,c.spec)}/${talentBudget(c)}</b></div>
      </div>
    </header>
    ${editable?'':'<div class="cb-membership-lock-banner"><b>MEMBERSHIP SLOT LOCKED</b><span>You can inspect this adventurer, but changes are locked until membership returns.</span></div>'}
    <nav class="cb-character-tabs" aria-label="${c.name} character sections">${tabs}</nav>
    <main class="cb-sheet-body" data-character-section="${currentTab}">${sheetBody(state,c)}</main>
  </div>`;
  modal.hidden=false;
}

function bankSlotForEquipped(slot,item){
  if(slot==='Trinket1'||slot==='Trinket2')return'Trinket';
  if(slot==='Ring1'||slot==='Ring2')return'Ring';
  return item?.slot||slot;
}
function returnEquippedToBank(state,c,slot,source='Unequipped'){
  const item=c?.equipment?.[slot];
  if(!item)return null;
  state.bank=Array.isArray(state.bank)?state.bank:[];
  // Clear the live slot first so a replacement can never visually stack on top of it.
  c.equipment[slot]=null;
  c.power=Math.max(1,(Number(c.power)||1)-(Number(item.power)||0));
  state.bank.push({...item,id:`bank-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,quantity:1,source:`${source} from ${c.name}`,slot:bankSlotForEquipped(slot,item)});
  if(c.activeEnhancements&&typeof c.activeEnhancements==='object')delete c.activeEnhancements[slot];
  return item;
}
function refreshEquipmentSummary(c){
  c.gearItems=[...leftSlots,...rightSlots].map(s=>c.equipment?.[s]?.name||'Empty');
  c.gear=window.CellboundGame?.characterItemLevel?.(c)||0;
}
function equipItem(bankId,slot){
  if(!characterEditable())return;
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId)),item=state?.bank?.find(x=>x.id===bankId);
  if(!state||!c||!item||!canUse(c,item)||!possibleSlots(item).includes(slot))return;
  state.bank=Array.isArray(state.bank)?state.bank:[];
  const canonical=window.CellboundGame?.canonicalItem?.(item)||item;
  const old=returnEquippedToBank(state,c,slot,'Replaced');
  c.equipment[slot]={...canonical,source:'Equipped'};
  c.power=Math.max(1,(Number(c.power)||1)+(Number(canonical.power)||0));
  item.quantity=(item.quantity||1)-1;
  if(item.quantity<=0)state.bank=state.bank.filter(x=>x.id!==bankId);
  refreshEquipmentSummary(c);
  state.activity=state.activity||[];
  state.activity.push(old?`${c.name} replaced ${old.name} with ${item.name}.`:`${c.name} equipped ${item.name} from the Guild Bank.`);
  writeState(state);activeSlot=null;renderSheet();window.CellboundFX?.micro?.(item.name+' equipped','gold');window.CellboundFX?.pulse?.('.cb-current-item');
}
function applyAttachmentToEquipped(key,slot){
  if(!characterEditable())return;
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId)),item=c?.equipment?.[slot],stack=state?.consumables?.find(x=>x.key===key&&(!x?.payload?.crafterOnly||x.payload.boundCharacterId===c?.id)),payload=stack?.payload||{};
  if(!state||!c||!item||!stack||payload.effect!=='gear-enhancement'||!payload.persistentAttachment||payload.slot!==slot||payload.crafterOnly&&payload.boundCharacterId!==c.id)return;
  const existing=item.attachment;
  if(existing?.key===key&&(!payload.crafterOnly||existing?.boundCharacterId===payload.boundCharacterId))return;
  if(existing&&!confirm('Replace '+(existing.name||'the current attachment')+' on '+item.name+' with '+stack.name+'?\n\nThe existing attachment will be permanently destroyed and cannot be recovered.'))return;
  const meta=window.CellboundProfessions?.recipeMetaForOutputKey?.(key),recipe=meta?.recipe;
  item.attachment={key:stack.key,name:stack.name,bonuses:{...(payload.bonuses||{})},profession:meta?.profession||null,skill:Number(recipe?.level)||null,tier:Number(payload.attachmentTier)||null,rarity:stack.rarity||recipe?.output?.rarity||'Uncommon',attachmentFamily:payload.attachmentFamily||null,proc:{...(payload.proc||{})},procText:payload.procText||'',crafterOnly:Boolean(payload.crafterOnly),boundCharacterId:payload.boundCharacterId||null,boundCharacterName:payload.boundCharacterName||null,attachedAt:new Date().toISOString()};
  stack.quantity=(Number(stack.quantity)||1)-1;if(stack.quantity<=0)state.consumables=state.consumables.filter(x=>x!==stack);
  state.activity=state.activity||[];state.activity.push(existing?`${stack.name} replaced ${existing.name||'an attachment'} on ${c.name}'s ${item.name}; the old attachment was destroyed.`:`${stack.name} attached to ${c.name}'s ${item.name}.`);
  writeState(state);refreshOpenEquipmentDrawer(state,c,slot);window.CellboundFX?.micro?.(stack.name+' attached','gold');window.CellboundFX?.pulse?.('.cb-current-attachment');
}
function applyGemToEquipped(key,slot,index){
  if(!characterEditable())return;
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId)),item=c?.equipment?.[slot];
  if(!state||!c||!item)return;
  G?.ensureSockets?.(item);
  index=Math.max(0,Number(index)||0);
  if(index>=Math.max(0,Number(item.socketCount)||0))return;
  const stack=(state.consumables||[]).find(x=>x.key===key&&Number(x.quantity)>0&&x?.payload?.effect==='socket-gem'&&x?.payload?.socketReady!==false&&(!x?.payload?.crafterOnly||x.payload.boundCharacterId===c.id)),payload=stack?.payload||{};
  if(!stack)return;
  const existing=item.sockets?.[index]||null,same=existing?.key===key&&(!payload.crafterOnly||existing?.boundCharacterId===payload.boundCharacterId);
  if(same)return;
  if(existing&&!confirm('Replace '+(existing.name||'the current gem')+' in '+item.name+'?\n\nThe existing gem will be permanently destroyed and cannot be recovered.'))return;
  const meta=window.CellboundProfessions?.recipeMetaForOutputKey?.(key),recipe=meta?.recipe;
  item.sockets[index]={key:stack.key,name:stack.name,bonuses:{...(payload.bonuses||{})},rarity:stack.rarity||recipe?.output?.rarity||'Uncommon',profession:meta?.profession||'Jewelcrafting',skill:Number(recipe?.level)||null,crafterOnly:Boolean(payload.crafterOnly),boundCharacterId:payload.boundCharacterId||null,boundCharacterName:payload.boundCharacterName||null,socketedAt:new Date().toISOString()};
  stack.quantity=(Number(stack.quantity)||1)-1;if(stack.quantity<=0)state.consumables=state.consumables.filter(x=>x!==stack);
  state.activity=state.activity||[];state.activity.push(existing?`${stack.name} replaced ${existing.name||'a gem'} in ${c.name}'s ${item.name}; the old gem was destroyed.`:`${stack.name} socketed into ${c.name}'s ${item.name}.`);
  writeState(state);refreshOpenEquipmentDrawer(state,c,slot);window.CellboundFX?.micro?.(stack.name+' socketed','gold');window.CellboundFX?.pulse?.('.cb-socket-panel');
}
function unequipItem(slot){
  if(!characterEditable())return;
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId)),item=c?.equipment?.[slot];
  if(!state||!c||!item)return;
  const removed=returnEquippedToBank(state,c,slot,'Unequipped');
  if(!removed)return;
  refreshEquipmentSummary(c);
  state.activity=state.activity||[];
  state.activity.push(`${c.name} unequipped ${removed.name} to the Guild Bank.`);
  writeState(state);activeSlot=null;renderSheet();window.CellboundFX?.micro?.(removed.name+' returned to the Guild Bank','cell');
}
function upgradeEquippedItem(slot){
  if(!characterEditable())return;
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId)),item=c?.equipment?.[slot];
  if(!state||!c||!item||!equippedCanUpgrade(item))return;
  state.materials=state.materials&&typeof state.materials==='object'?state.materials:{};
  const available=Number(state.materials['cell-shards'])||0,cost=equippedUpgradeCost(item),beforeIlvl=Number(item.itemLevel)||0,next=Math.min(equippedUpgradeMax(item),beforeIlvl+2);
  if(available<cost){alert(`You need ${cost} Cell Shards. You currently have ${available}.`);return}
  if(!confirm(`Upgrade ${item.name} from Item Level ${beforeIlvl} to ${next} for ${cost} Cell Shards?`))return;
  const oldPower=Number(item.power)||0;
  item.baseItemLevel=Number(item.baseItemLevel)||beforeIlvl;
  item.itemLevel=next;
  item.upgradeLevel=(Number(item.upgradeLevel)||0)+1;
  if(item.upgradeLevel%2===0)item.power=oldPower+1;
  c.power=Math.max(1,(Number(c.power)||1)+(Number(item.power)||0)-oldPower);
  c.gear=window.CellboundGame?.characterItemLevel?.(c)||0;
  c.gearItems=[...leftSlots,...rightSlots].map(s=>c.equipment?.[s]?.name||'Empty');
  state.materials['cell-shards']=available-cost;
  state.activity=state.activity||[];
  state.activity.push(`Upgraded ${c.name}'s equipped ${item.name} to Item Level ${item.itemLevel} for ${cost} Cell Shards.`);
  writeState(state);activeSlot=slot;renderSheet();window.CellboundFX?.callout?.({eyebrow:'ITEM UPGRADED',title:item.name+' · Item Level '+item.itemLevel,tone:'gold'});window.CellboundFX?.flash?.('gold');
}
function investTalent(spec,nodeId){
  if(!characterEditable())return;
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId));
  if(!state||!c||!(talentRemaining(c,spec)>0))return;
  const node=(trees[c.class]?.[spec]||[]).find(n=>n.id===nodeId);if(!node)return;
  const s=treeNodeState(c,spec,node);if(!s.available||s.complete)return;
  c.talents[spec][node.id]=(c.talents[spec][node.id]||0)+1;
  B?.syncLegacyTalentCounter?.(c);
  state.activity=state.activity||[];state.activity.push(`${c.name} invested a ${spec} build point in ${node.id}.`);
  writeState(state);renderSheet();window.CellboundFX?.callout?.({eyebrow:'TALENT LEARNED',title:node.id,tone:'arcane'});window.CellboundFX?.flash?.('arcane');
}
function changeSpec(spec){
  if(!characterEditable())return;
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId));
  if(!state||!c||!specs[c.class]?.[spec]||c.spec===spec)return;
  c.spec=spec;B?.syncLegacyTalentCounter?.(c);selectedTreeSpec=spec;selectedTalentId=null;selectedTalentSpec=spec;activeSkillSlot=0;activeLoadoutSlot='skill';
  state.activity=state.activity||[];state.activity.push(`${c.name} changed specialisation to ${spec} (${roleLabel(roleOf(c))}). Active-party role updated automatically.`);
  writeState(state);renderSheet();window.CellboundFX?.quest?.({eyebrow:'SPECIALISATION CHANGED',title:spec,copy:roleLabel(roleOf(c))+' role is now active for this character.',tone:'story',duration:1250});
}
function saveSkillLoadout(mutator,activity){
  if(!characterEditable())return;
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId));if(!state||!c)return;
  const spec=c.spec,loadout=equippedSkillIds(c,spec);mutator(loadout,c);
  c.skillLoadouts[spec]=loadout.slice(0,4);while(c.skillLoadouts[spec].length<4)c.skillLoadouts[spec].push(null);
  if(activity){state.activity=state.activity||[];state.activity.push(activity(c))}
  writeState(state);renderSheet()
}
function equipSkill(skillId){
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId));if(!state||!c)return;
  const pool=skillPoolFor(c,c.spec),skill=pool.find(s=>s.id===skillId);if(!skill||!skillAvailable(c,skill,c.spec))return;
  const slot=Math.max(0,Math.min(3,Number(activeSkillSlot)||0));
  activeSkillSlot=(slot+1)%4;activeLoadoutSlot='skill';
  saveSkillLoadout((loadout,ch)=>{
    const existing=loadout.indexOf(skillId),previous=loadout[slot]||null;
    if(existing>=0&&existing!==slot)loadout[existing]=previous;
    loadout[slot]=skillId
  },ch=>ch.name+' equipped '+skill.name+' in combat skill slot '+(slot+1)+'.')
}
function clearSkillSlot(slotIndex){
  const slot=Math.max(0,Math.min(3,Number(slotIndex)||0));
  saveSkillLoadout(loadout=>{loadout[slot]=null},c=>c.name+' cleared combat skill slot '+(slot+1)+'.');
  activeSkillSlot=slot
}
function resetSkills(){
  if(!characterEditable())return;
  const state=readState(),c=ensureCharacter(getCharacter(state,currentId));if(!state||!c)return;
  const ids=defaultSkillIds(c,c.spec);while(ids.length<4)ids.push(null);c.skillLoadouts[c.spec]=ids.slice(0,4);
  state.activity=state.activity||[];state.activity.push(c.name+' reset '+c.spec+' combat skills to the recommended defaults.');
  activeSkillSlot=0;activeLoadoutSlot='skill';writeState(state);renderSheet()
}

function equipClassBuff(buffId){
 if(!characterEditable())return;const state=readState(),c=ensureCharacter(getCharacter(state,currentId));if(!state||!c||!unlockedBuffIds(c).includes(buffId))return;const q=buffQuestList(c).find(x=>x.id===buffId);if(!q)return;c.buffSkill=buffId;activeLoadoutSlot='buff';state.activity=state.activity||[];state.activity.push(c.name+' equipped the '+q.name+' class buff.');writeState(state);renderSheet()
}
function openCharacter(id){
  document.body.classList.add('character-sheet-open');
  returnView=document.querySelector('.view.active')?.id||'roster';
  currentId=id;currentTab='overview';activeSlot=null;activeSkillSlot=0;activeLoadoutSlot='skill';selectedTalentId=null;selectedTalentSpec=null;selectedTreeSpec=null;renderSheet()
}
function closeCharacter(targetView=returnView){
  modal.hidden=true;document.body.classList.remove('character-sheet-open');activeSlot=null;
  const game=window.CellboundGame,next=dirty?readState():null;
  if(dirty&&next&&game?.replaceState){game.replaceState(next);dirty=false}
  else if(dirty){game?.renderAll?.();dirty=false}
  const view=targetView||'roster';
  if(game?.switchView)game.switchView(view);
  else document.querySelector('[data-view="'+view+'"]')?.click()
}

document.addEventListener('click',event=>{
  const charBtn=event.target.closest('[data-char]');
  if(charBtn){event.preventDefault();event.stopImmediatePropagation();openCharacter(charBtn.dataset.char);return}
  if(!modal.hidden){
    const tab=event.target.closest('[data-sheet-tab]');if(tab){event.preventDefault();event.stopImmediatePropagation();currentTab=tab.dataset.sheetTab||'overview';activeSlot=null;renderSheet();return}
    const charJump=event.target.closest('[data-char-jump]');if(charJump){closeCharacter(charJump.dataset.charJump);return}
    const openTrials=event.target.closest('[data-open-class-trials]');if(openTrials){closeCharacter('quests');return}
    const equipBuff=event.target.closest('[data-equip-buff]');if(equipBuff){equipClassBuff(equipBuff.dataset.equipBuff);return}
    const buffSlot=event.target.closest('[data-buff-slot]');if(buffSlot){activeLoadoutSlot='buff';renderSheet();return}
    const skillSlot=event.target.closest('[data-skill-slot]');if(skillSlot){activeLoadoutSlot='skill';activeSkillSlot=Math.max(0,Math.min(3,Number(skillSlot.dataset.skillSlot)||0));renderSheet();return}
    const equipSkillBtn=event.target.closest('[data-equip-skill]');if(equipSkillBtn){equipSkill(equipSkillBtn.dataset.equipSkill);return}
    const clearSkill=event.target.closest('[data-clear-skill]');if(clearSkill){clearSkillSlot(clearSkill.dataset.clearSkill);return}
    const resetSkill=event.target.closest('[data-reset-skills]');if(resetSkill){resetSkills();return}
    const unequip=event.target.closest('[data-unequip-slot]');if(unequip){event.preventDefault();event.stopImmediatePropagation();unequipItem(unequip.dataset.unequipSlot);return}
    const upgradeEquipped=event.target.closest('[data-upgrade-equipped]');if(upgradeEquipped){event.preventDefault();event.stopImmediatePropagation();upgradeEquippedItem(upgradeEquipped.dataset.upgradeEquipped);return}
    const applyAttachment=event.target.closest('[data-apply-attachment]');if(applyAttachment){event.preventDefault();event.stopImmediatePropagation();applyAttachmentToEquipped(applyAttachment.dataset.applyAttachment,activeSlot);return}
    const applyGem=event.target.closest('[data-apply-gem]');if(applyGem){event.preventDefault();event.stopImmediatePropagation();applyGemToEquipped(applyGem.dataset.applyGem,activeSlot,applyGem.dataset.socketIndex);return}
    const equip=event.target.closest('[data-equip-bank]');if(equip){event.preventDefault();event.stopImmediatePropagation();equipItem(equip.dataset.equipBank,equip.dataset.equipSlot);return}
    const closeSlot=event.target.closest('[data-close-slot]');if(closeSlot){event.preventDefault();event.stopImmediatePropagation();activeSlot=null;renderSheet();return}
    const slot=event.target.closest('[data-slot]');if(slot){event.preventDefault();event.stopImmediatePropagation();activeSlot=slot.dataset.slot;renderSheet();return}
    const node=event.target.closest('[data-talent-node]');if(node){selectedTalentId=node.dataset.talentNode;selectedTalentSpec=node.dataset.treeSpec;renderSheet();return}
    const invest=event.target.closest('[data-invest-talent]');if(invest){investTalent(invest.dataset.treeSpec,invest.dataset.investTalent);return}
    const spec=event.target.closest('[data-spec-tab]');if(spec){selectedTreeSpec=spec.dataset.specTab;selectedTalentId=null;selectedTalentSpec=selectedTreeSpec;renderSheet();return}
    const activateSpec=event.target.closest('[data-activate-spec]');if(activateSpec){changeSpec(activateSpec.dataset.activateSpec);return}
    const close=event.target.closest('[data-close]');if(close){event.preventDefault();event.stopImmediatePropagation();closeCharacter();return}
  }
},true);
modal.addEventListener('click',event=>{if(event.target===modal){event.preventDefault();event.stopImmediatePropagation();closeCharacter()}},true);
})();