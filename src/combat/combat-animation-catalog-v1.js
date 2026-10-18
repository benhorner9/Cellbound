(()=>{
'use strict';
// Presentation catalogue only: IDs come from CombatData, never from equipment stats.
const styles={
 Warrior:{basic:'swing',heavy:'cleave',cast:'warcry',heal:'salute',defense:'brace',ready:{mainY:-.12,offY:-.12}},
 Paladin:{basic:'crusader',heavy:'consecrate',cast:'sanctify',heal:'benediction',defense:'aegis',ready:{mainAngle:-8,offY:-.15}},
 Hunter:{basic:'draw',heavy:'aimed',cast:'command',heal:'command',defense:'evade',ready:{mainX:.3,mainY:-.45}},
 Rogue:{basic:'jab',heavy:'crosscut',cast:'throw',heal:'salute',defense:'evade',ready:{mainY:-.28,offY:-.32,lean:2}},
 Mage:{basic:'arcane',heavy:'eruption',cast:'arcane',heal:'benediction',defense:'ward',ready:{mainAngle:-8,offY:-.22}},
 Priest:{basic:'smite',heavy:'prayer',cast:'prayer',heal:'prayer',defense:'ward',ready:{mainY:-.1,offY:-.2}},
 Druid:{basic:'wrath',heavy:'bloom',cast:'bloom',heal:'bloom',defense:'root',ready:{mainAngle:7,offX:.1}},
 Shaman:{basic:'storm',heavy:'quake',cast:'totem',heal:'tide',defense:'root',ready:{offY:-.2,mainAngle:-10}},
 Warlock:{basic:'hex',heavy:'ritual',cast:'ritual',heal:'drain',defense:'pact',ready:{mainAngle:10,offY:-.28}},
 Monk:{basic:'palm',heavy:'kick',cast:'chi',heal:'chi',defense:'brew',ready:{mainY:-.3,offY:-.35,lean:1}},
 'Death Knight':{basic:'reap',heavy:'execute',cast:'raise',heal:'drain',defense:'runeward',ready:{mainAngle:12,offY:-.1}},
 'Demon Hunter':{basic:'glaive',heavy:'dance',cast:'fel',heal:'drain',defense:'metamorph',ready:{mainY:-.2,offY:-.2,lean:3}},
 Evoker:{basic:'breath',heavy:'surge',cast:'surge',heal:'embrace',defense:'scales',ready:{mainY:-.12,offX:.2,offY:-.25}}
};
// Each named exception selects a movement, not a damage/cooldown rule.
const groups={
 cleave:'mortal-strike slam sweeping-strike overpower revenge',execute:'execute obliterate marrowrend',bash:'shield-slam',shieldCast:'avengers-shield',warcry:'taunt rallying-guard',quake:'thunder-clap earthquake',
 crusader:'judgement',consecrate:'consecration',benediction:'holy-light flash-of-light holy-shock light-of-dawn radiant-wave word-of-glory',
 aimed:'aimed-shot kill-shot',volley:'multi-shot beast-multi-shot',draw:'arcane-shot steady-shot cobra-shot barbed-shot counter-shot',command:'kill-command bestial-wrath dire-beast stampede',
 crosscut:'mutilate eviscerate envenom dispatch',backstab:'garrote',flurry:'killing-spree blade-flurry',throw:'fan-of-knives',firearm:'pistol-shot between-the-eyes',salute:'roll-the-bones adrenaline-rush',
 fire:'fireball fire-blast pyroblast incinerate conflagrate immolate lava-burst flame-shock',frost:'frostbolt ice-lance flurry glacial-spike howling-blast',eruption:'blizzard arcane-nova frozen-orb rain-of-fire hand-of-guldan shadow-crash void-eruption',
 channel:'mind-flay void-torrent channel-demonfire fury-of-elune eye-beam disintegrate tranquility divine-hymn emerald-communion',
 prayer:'heal flash-heal prayer-healing soul-recall',hex:'mind-blast shadow-word-pain devouring-plague vampiric-touch shadow-bolt demonbolt chaos-bolt death-coil outbreak',
 bloom:'wild-growth starfall celestial-alignment rejuvenation regrowth',wrath:'wrath restoration-wrath starfire starsurge moonfire sunfire',
 storm:'lightning-bolt restoration-lightning-bolt chain-lightning earth-shock stormkeeper ascendance',tide:'healing-wave riptide chain-heal healing-rain',totem:'windfury-totem stoneskin-totem healing-stream-totem spirit-link-totem',
 ritual:'call-dreadstalkers summon-demonic-tyrant summon-infernal',commandDark:'soul-strike felstorm implosion dark-transformation',raise:'army-of-the-dead apocalypse dancing-rune-weapon',
 reap:'heart-strike death-strike festering-strike scourge-strike frost-strike frostscythe',runeblast:'blood-boil death-and-decay-blood death-and-decay-unholy remorseless-winter frostwyrms-fury',breath:'breath-of-sindragosa breath-of-fire fire-breath dream-breath',
 dance:'blade-dance fel-barrage',glaive:'demons-bite shear',fel:'chaos-strike soul-cleave spirit-bomb sigil-of-flame',leap:'infernal-strike havoc-metamorphosis',throwGlaive:'throw-glaive',
 palm:'tiger-palm mist-tiger-palm touch-of-death',kick:'brewmaster-blackout-kick windwalker-blackout-kick windwalker-rising-sun-kick mist-rising-sun-kick',spin:'spinning-crane-kick',fists:'fists-of-fury',brew:'purifying-brew celestial-brew fortifying-brew',staffSweep:'keg-smash',chi:'soothing-mist vivify renewing-mist essence-font revival',
 surge:'eternity-surge dragonrage pyre azure-strike living-flame preservation-living-flame',embrace:'reversion verdant-embrace emerald-blossom temporal-anomaly',
 evade:'feint blur survival-instincts',ward:'arcane-ward ice-barrier guardian-spirit dispersion',aegis:'ardent-defender divine-protection',brace:'shield-wall',root:'barkskin astral-shift',pact:'dark-pact',runeward:'rune-tap vampiric-blood icebound-fortitude anti-magic-shell',metamorph:'demon-spikes fiery-brand vengeance-metamorphosis',scales:'obsidian-scales',parry:'touch-of-karma',
 jab:'kick pummel rebuke spear-hand-strike skull-bash',dispel:'counterspell silence wind-shear quell mind-freeze disrupt solar-beam axe-toss shadowfury'
};
const overrides={};for(const [clip,ids] of Object.entries(groups))for(const id of ids.split(' '))overrides[id]=clip;
const clips={};
function clip(name,duration,prep,hit,after={},options={}){clips[name]={duration,contact:.5,frames:[[0,{}],[.3,prep],[.5,hit],[.72,after],[1,{}]],...options}}
clip('cleave',780,{mainY:-1.25,mainAngle:-60,lean:-5},{mainX:.65,mainY:-.3,mainAngle:95,lean:7,step:3},{mainAngle:125,lean:4});
clip('execute',850,{mainY:-1.5,mainAngle:-20,lean:-6},{mainX:.4,mainAngle:135,lean:9,step:3},{lean:6,mainY:.2,mainAngle:120});
clip('crusader',640,{mainY:-.7,mainAngle:-25,offY:-.4},{mainX:.7,mainY:-.4,mainAngle:65,offY:-.35,lean:3},{mainAngle:80});
clip('consecrate',780,{mainY:-1.15,offY:-.6,lean:-3},{mainY:.18,mainAngle:30,offX:.4,lean:6},{lean:3});
clip('jab',420,{mainX:-.12,mainY:-.5,mainAngle:40,offY:-.25},{mainX:.85,mainY:-.6,mainAngle:92,lean:5,step:3},{mainY:-.2});
clip('offjab',420,{offX:-.1,offY:-.6,offAngle:40,mainY:-.25},{offX:1.6,offY:-.8,offAngle:90,lean:5,step:2},{offY:-.3});
clip('crosscut',610,{mainY:-.95,offY:-.9,mainAngle:-20,offAngle:-35,lean:-3},{mainX:.8,mainY:-.25,mainAngle:100,offX:1.4,offY:-.4,offAngle:80,lean:6},{mainAngle:115,offAngle:110});
clip('backstab',570,{mainY:-.45,mainAngle:80,offY:-.35,lean:-6,shade:.4},{mainX:.8,mainY:-.55,mainAngle:90,lean:8,step:4},{lean:4,shade:.15});
clip('flurry',680,{mainY:-.7,offY:-.3,mainAngle:35},{mainX:.8,mainY:-.6,mainAngle:90,lean:3},{offX:1.4,offY:-.65,offAngle:95,lean:5});
clip('throw',520,{offY:-.9,offX:.5,offAngle:-20,lean:-3},{offX:1.5,offY:-1,offAngle:90,lean:4},{offY:-.5},{projectile:true,socket:'off'});
clip('shieldCast',610,{offX:.5,offY:-.85,offAngle:-25,lean:-3},{offX:1.2,offY:-.65,offAngle:45,lean:5},{offY:-.4},{projectile:true,socket:'off'});
clip('firearm',580,{offX:.7,offY:-.7,offAngle:45,prop:1},{offX:1.4,offY:-1.15,offAngle:65,prop:1,lean:3},{offX:1,offY:-1,offAngle:50,prop:1},{projectile:true,socket:'off'});
clip('draw',720,{mainX:.5,mainY:-.9,bowDraw:.4,arrow:1},{mainX:.7,mainY:-1,bowDraw:1,arrow:1,lean:-2},{mainX:.6,mainY:-.9,bowDraw:0,lean:1},{contact:.68,hold:.58,projectile:true,socket:'bow',frames:[[0,{}],[.18,{offY:-1.9,offX:.7,mainY:-.4}],[.4,{mainX:.5,mainY:-.9,bowDraw:.4,arrow:1}],[.58,{mainX:.7,mainY:-1,bowDraw:1,arrow:1,lean:-2}],[.68,{mainX:.7,mainY:-1,bowDraw:0,arrow:0,lean:1}],[.83,{mainX:.4,mainY:-.6}],[1,{}]]});
clip('warcry',600,{mainY:-.5,offY:-.4,lean:-4},{mainY:-1.15,offY:-.7,lean:-2},{mainY:-.5});
clip('salute',500,{offY:-.4},{offY:-1.2,offX:.7,lean:-2},{offY:-.5});
clip('sanctify',700,{mainY:-.4,offY:-.4,lean:-2},{mainY:-1,offX:.8,offY:-1.15,lean:2},{offY:-.55},{projectile:true,socket:'off'});
clip('benediction',750,{mainY:-.25,offX:.45,offY:-.7},{mainY:-.55,offX:1.1,offY:-1.2,offAngle:-20,lean:-2},{offY:-.6},{projectile:true,socket:'off'});
clip('arcane',680,{mainAngle:-20,mainY:-.55,offX:.4,offY:-.7},{mainAngle:25,mainY:-.65,offX:1.2,offY:-1.1,lean:3},{offY:-.4},{projectile:true,socket:'off'});
clip('fire',720,{mainAngle:-35,mainY:-.9,offX:.2,offY:-.6,lean:-4},{mainAngle:30,mainY:-.5,offX:1.1,offY:-.6,lean:6},{lean:3,mainAngle:20},{projectile:true,socket:'off'});
clip('frost',650,{mainY:-.3,mainAngle:5,offY:-1.1,offX:.5},{mainY:-.35,offX:1.35,offY:-1.15,lean:1},{offX:.8,offY:-.9},{projectile:true,socket:'off'});
clip('eruption',820,{mainY:-1,offY:-1.4,offX:.6,lean:-4},{mainY:.2,mainAngle:15,offY:-.2,offX:1,lean:7},{lean:3});
clip('prayer',850,{mainY:-.5,offX:.55,offY:-.7,lean:-2},{mainY:-1,offX:.85,offY:-1.6,lean:-3},{offY:-.85},{projectile:true,socket:'off'});
clip('bloom',900,{mainY:-.15,mainAngle:-15,offX:.4,offY:-.15,lean:3},{mainY:-.7,mainAngle:18,offX:.9,offY:-1.3,lean:-3},{mainY:-.4,offY:-.7},{projectile:true,socket:'off'});
clip('storm',620,{mainY:-1.1,mainAngle:-20,offY:-.8,lean:-4},{mainX:.6,mainY:-.45,mainAngle:60,offX:1,offY:-1.1,lean:5},{offY:-.6},{projectile:true,socket:'off'});
clip('totem',750,{mainY:-.7,offY:-.5,offX:.4},{mainY:.2,offY:.15,offX:.7,lean:7},{lean:3});
clip('hex',850,{mainAngle:18,mainY:-.2,offX:.65,offY:-.45,lean:3},{mainAngle:-15,mainY:-.7,offX:1.1,offY:-1.3,lean:-3},{offY:-.75},{projectile:true,socket:'off'});
clip('ritual',1000,{mainY:-.25,offY:-.1,lean:5},{mainY:-1.2,mainAngle:-20,offY:-1.5,offX:.5,lean:-6},{mainY:-.8,offY:-.9});
clip('palm',470,{mainY:-.7,mainAngle:35,offY:-.4,lean:-2},{offX:1.5,offY:-1.25,offAngle:80,mainY:-.55,lean:5,step:2},{offY:-.5});
clip('kick',610,{mainY:-.5,offY:-.7,leg:20,lean:3},{mainY:-.6,offY:-.85,leg:-58,lean:-7,step:2},{leg:-15,lean:-3});
clip('staffSweep',680,{mainY:-.6,mainAngle:-55,offY:-.5,lean:-4},{mainX:.5,mainY:-.4,mainAngle:80,lean:5},{mainAngle:105});
clip('chi',850,{mainAngle:12,offX:.7,offY:-.6,lean:2},{mainY:-.3,offX:1.15,offY:-1.1,lean:-2},{offX:.7,offY:-.5},{projectile:true,socket:'off'});
clip('reap',780,{mainY:-.8,mainAngle:-60,lean:-4},{mainY:-.2,mainAngle:100,mainX:.5,lean:7},{mainAngle:125,lean:4});
clip('glaive',510,{mainY:-.8,offY:-.5,mainAngle:-45,lean:-3},{mainX:.7,mainY:-.2,mainAngle:100,offX:.5,offY:-.65,lean:6},{mainAngle:115});
clip('dance',750,{mainY:-1,offY:-.7,mainAngle:-55,offAngle:-40,lean:-5},{mainX:.7,mainY:-.25,mainAngle:110,offX:1.5,offY:-.65,offAngle:90,lean:7,step:3},{mainY:-.7,mainAngle:45,offX:1.2,offAngle:130});
clip('breath',900,{mainAngle:-10,mainY:-.6,offY:-.8,lean:-7},{mainY:-.45,offX:.9,offY:-1,lean:8},{lean:4},{projectile:true,socket:'head'});
clip('surge',850,{mainY:-.9,offY:-1.3,offX:.6,lean:-4},{mainY:-.3,mainAngle:30,offX:1.2,offY:-.7,lean:6},{lean:3},{projectile:true,socket:'off'});
clip('brace',500,{offX:.5,offY:-.65,mainY:-.25},{offX:.7,offY:-.8,offAngle:15,lean:-4},{offY:-.4});
clip('ward',700,{offX:.5,offY:-.65},{mainY:-.5,offX:.85,offY:-1.5,lean:-3},{offY:-.7});
clip('brew',600,{offX:.7,offY:-.9,lean:-3},{offX:.75,offY:-1.7,offAngle:-45,lean:-4},{offY:-.8});
clip('parry',500,{mainY:-.8,mainAngle:-30},{mainY:-.7,mainAngle:35,offY:-.7,lean:-4},{mainY:-.4});
clip('evade',480,{mainY:-.3,offY:-.3,lean:2},{mainY:-.65,offY:-.5,lean:-10,step:-4,shade:.25},{lean:-4});
clip('dispel',380,{offY:-.6,offX:.5},{offY:-1.2,offX:1.4,lean:3},{offY:-.5},{projectile:true,socket:'off'});
// Variants share joint vocabulary but have distinct rhythm, amplitude and silhouette.
function variant(name,base,duration,scale=1,options={}){const b=clips[base];clips[name]={...b,duration,frames:b.frames.map(([t,c])=>[t,Object.fromEntries(Object.entries(c).map(([k,v])=>[k,/arrow|bowDraw|shade/.test(k)?v:v*scale]))]),...options}}
variant('quake','eruption',850,1.05);
variant('aimed','draw',940,1.1);variant('volley','draw',580,.9);
variant('command','salute',520,1.1);variant('commandDark','hex',560,.8);
variant('smite','sanctify',680,.9);variant('wrath','bloom',760,.85);variant('tide','bloom',800,.9);
variant('drain','hex',700,.8);variant('raise','ritual',980,.9);variant('runeblast','eruption',900,.9);
variant('fel','storm',660,1.1);variant('throwGlaive','throw',580,1.05);
variant('leap','dance',760,1.1);variant('spin','kick',760,1.05);variant('fists','flurry',600,.9);
variant('embrace','bloom',900,1.05);variant('aegis','ward',680,.9);variant('root','totem',650,.7);
variant('pact','ritual',720,.7);variant('runeward','ward',720,.75);variant('metamorph','ritual',820,1.05);variant('scales','brace',650,.8);
variant('channel','arcane',900,.9,{channel:true});
// Deliberate per-skill choreography: joint gesture, contact rhythm and effect
// behaviour. No IDs/hashes/randomness are used to manufacture visual variety.
// Rows: catalogue ID / gesture / effect motif / rhythm / transport override.
const skillRows={
 Warrior:`
shield-slam thrust shield snap
revenge low cross double
taunt raise command pulse
mortal-strike sweep cut weight
slam overhead crush weight
execute overhead fissure finish
pummel thrust burst snap
shield-wall cross shield sustain
sweeping-strike sweep cleave double
thunder-clap plant ring weight
rallying-guard raise orbit pulse
overpower recoil cut snap`,
 Paladin:`
avengers-shield sweep shield double shield
judgement raise ray weight ray
hand-reckoning thrust command snap
word-of-glory gather bloom pulse
holy-light focus ray sustain ray
holy-shock flick burst snap bolt
light-of-dawn spread rays pulse local
rebuke thrust cross snap
ardent-defender kneel orbit sustain
flash-of-light flick stars snap bolt
divine-protection cross shield pulse
consecration plant sigil weight local
radiant-wave sweep ripple double local`,
 Hunter:`
aimed-shot focus pierce weight arrow
arcane-shot gather spiral snap arrow
steady-shot draw cut pulse arrow
multi-shot spread rays double arrow
kill-shot recoil pierce finish arrow
cobra-shot low coil snap arrow
barbed-shot overhead thorns pulse arrow
kill-command thrust command snap
beast-multi-shot sweep rays triple arrow
dire-beast plant summon weight
stampede raise tracks triple
bestial-wrath cross brands pulse
counter-shot flick cross snap arrow
survival-instincts recoil orbit sustain`,
 Rogue:`
mutilate cross cross double
eviscerate overhead cut finish
garrote low coil sustain
envenom thrust drops weight
fan-of-knives spread knives double knives
sinister-strike sweep cut snap
pistol-shot recoil pierce snap bolt
dispatch low fissure weight
roll-the-bones flick sigil pulse
blade-flurry sweep cleave triple
between-the-eyes focus cross finish bolt
adrenaline-rush raise tracks pulse
killing-spree cross knives triple
kick thrust burst snap
feint recoil ripple snap`,
 Mage:`
pyroblast overhead burst finish bolt
fireball gather burst weight bolt
fire-blast flick rays snap local
arcane-barrage spread stars triple bolt
arcane-ward cross orbit sustain
arcane-nova spread sigil pulse local
frostbolt focus pierce weight bolt
ice-lance thrust pierce snap bolt
flurry flick shards triple bolt
blizzard raise rain sustain local
frozen-orb gather orbit pulse bolt
glacial-spike overhead shards finish bolt
counterspell cross cross snap local
ice-barrier plant shield weight`,
 'Death Knight':`
heart-strike thrust cut snap
death-strike low coil weight
dark-command raise command pulse
mind-freeze flick cross snap local
marrowrend overhead shards weight
blood-boil spread drops pulse local
death-and-decay-blood plant sigil sustain local
rune-tap focus sigil snap
dancing-rune-weapon sweep knives sustain
vampiric-blood gather coil pulse
obliterate cross fissure finish
frost-strike sweep cut weight
howling-blast thrust rays weight ray
remorseless-winter spread rain sustain local
frostscythe low cleave double
frostwyrms-fury raise shards finish local
breath-of-sindragosa recoil rays sustain breath
icebound-fortitude cross shards sustain
festering-strike thrust brands weight
scourge-strike overhead drops double
death-coil gather spiral snap bolt
outbreak flick brands pulse bolt
death-and-decay-unholy kneel thorns sustain local
dark-transformation raise brands weight
army-of-the-dead spread summon triple
apocalypse overhead summon finish
anti-magic-shell gather orbit sustain`,
 'Demon Hunter':`
demons-bite low cut snap
chaos-strike cross cross weight
blade-dance spin cleave triple
throw-glaive sweep knives double glaive
eye-beam focus ray sustain beam
fel-barrage spread rays triple bolt
havoc-metamorphosis overhead wings finish local
blur recoil tracks sustain
disrupt thrust cross snap
shear sweep cut weight
soul-cleave low coil double
infernal-strike kneel fissure weight local
torment raise command pulse
sigil-of-flame plant sigil pulse local
demon-spikes cross thorns sustain
fiery-brand thrust brands weight
spirit-bomb gather burst finish bolt
vengeance-metamorphosis spread wings sustain`,
 Druid:`
rejuvenation gather petals pulse bolt
regrowth raise thorns weight bolt
wild-growth spread bloom double local
skull-bash thrust cross snap
restoration-wrath flick spiral snap bolt
barkskin cross thorns sustain
tranquility kneel ripple sustain beam
wrath gather spiral weight bolt
starfire raise ray weight ray
starsurge focus stars finish bolt
moonfire flick orbit snap local
sunfire spread rays pulse local
starfall overhead rain sustain local
fury-of-elune focus ray sustain beam
celestial-alignment cross orbit finish local
solar-beam thrust rays snap ray`,
 Evoker:`
reversion recoil spiral pulse bolt
verdant-embrace gather wings weight bolt
emerald-blossom spread bloom pulse local
dream-breath raise petals sustain breath
temporal-anomaly cross orbit double local
emerald-communion kneel ripple sustain beam
preservation-living-flame flick coil snap bolt
quell thrust cross snap
obsidian-scales cross shards weight
living-flame gather coil weight bolt
azure-strike sweep cut snap bolt
disintegrate focus ray sustain beam
fire-breath recoil rays weight breath
pyre overhead burst finish bolt
eternity-surge raise stars finish bolt
dragonrage spread wings triple local`,
 Priest:`
heal gather bloom weight bolt
flash-heal flick stars snap bolt
prayer-healing kneel rays pulse local
smite thrust ray snap ray
soul-recall raise wings finish local
guardian-spirit spread wings sustain
divine-hymn focus ripple sustain beam
mind-flay thrust coil sustain beam
mind-blast recoil burst weight local
devouring-plague gather drops pulse local
shadow-word-pain flick brands snap local
vampiric-touch low coil weight bolt
shadow-crash overhead fissure weight bolt
void-torrent cross ray sustain beam
void-eruption spread spiral finish local
dispersion kneel orbit sustain
silence cross cross snap`,
 Shaman:`
healing-wave gather ripple weight bolt
riptide flick drops snap bolt
chain-heal spread chains double bolt
windfury-totem sweep spiral pulse
stoneskin-totem plant shards weight
healing-stream-totem kneel ripple sustain
spirit-link-totem spread chains sustain
restoration-lightning-bolt flick rays snap bolt
healing-rain raise rain sustain local
lightning-bolt focus rays weight bolt
lava-burst overhead burst weight bolt
earth-shock plant fissure snap local
chain-lightning spread chains triple bolt
flame-shock thrust brands snap local
earthquake kneel fissure sustain local
stormkeeper raise orbit pulse local
ascendance spread wings finish local
wind-shear sweep cross snap
astral-shift recoil stars sustain`,
 Warlock:`
shadow-bolt gather spiral weight bolt
demonbolt overhead brands weight bolt
hand-of-guldan plant summon finish local
axe-toss sweep cut snap glaive
call-dreadstalkers kneel tracks double
soul-strike thrust command snap
felstorm sweep cleave triple
implosion cross burst finish
summon-demonic-tyrant raise summon sustain
incinerate low coil weight bolt
conflagrate flick burst snap local
chaos-bolt cross spiral finish bolt
immolate thrust brands pulse local
rain-of-fire overhead rain sustain local
channel-demonfire spread rays sustain beam
summon-infernal plant fissure finish
shadowfury spread cross weight local
dark-pact kneel sigil sustain`,
 Monk:`
keg-smash overhead drops weight
brewmaster-blackout-kick low cut weight
provoke flick command snap
purifying-brew drink drops snap
celestial-brew raise orbit weight
breath-of-fire recoil rays sustain breath
fortifying-brew drink shield sustain
soothing-mist focus ripple sustain beam
vivify gather bloom snap bolt
renewing-mist sweep petals pulse bolt
essence-font spread rain double local
mist-rising-sun-kick raise stars pulse
mist-tiger-palm low ripple snap
revival raise wings finish local
tiger-palm thrust ring snap
windwalker-blackout-kick cross cut double
windwalker-rising-sun-kick overhead rays weight
spinning-crane-kick spin cleave triple
fists-of-fury cross burst triple
touch-of-death focus fissure finish
touch-of-karma cross coil sustain
spear-hand-strike thrust pierce snap`
};
const gestures={
 overhead:[{mainY:-1.4,mainAngle:-25,lean:-5},{mainY:.1,mainAngle:125,lean:7}],
 low:[{mainY:.1,mainAngle:75,lean:3},{mainY:-.9,mainAngle:-25,lean:-3}],
 cross:[{mainY:-.85,offY:-.8,mainAngle:-35,offAngle:35},{mainX:.65,offX:1.25,mainAngle:100,offAngle:-65,lean:4}],
 thrust:[{offX:.3,offY:-.65,lean:-3},{mainX:.8,offX:1.3,offY:-1,lean:5,step:2}],
 raise:[{offY:-.2,mainY:-.3,lean:2},{mainY:-1.15,offY:-1.5,lean:-3}],
 gather:[{offX:.7,offY:-.55,mainY:-.6,lean:-3},{offX:1.25,offY:-.8,mainAngle:25,lean:4}],
 spread:[{offX:.65,offY:-.7,mainY:-.7},{mainX:.6,offX:-.15,mainY:-1,offY:-1.2,lean:-2}],
 plant:[{mainY:-1,offY:-.6,lean:-3},{mainY:.2,offY:.1,lean:7,leg:12}],
 draw:[{mainY:-.7,offY:-.9,lean:-1},{mainY:-1,offY:-1.1,lean:1}],
 flick:[{offX:.5,offY:-1.2,offAngle:-45},{offX:1.2,offY:-.75,offAngle:45,lean:2}],
 recoil:[{lean:3,mainY:-.5,offY:-.8},{lean:-7,mainY:-.8,offY:-1.1,step:-2}],
 sweep:[{mainAngle:-65,mainY:-.6,offY:-.4,lean:-4},{mainX:.6,mainAngle:105,offX:1.2,lean:5}],
 drink:[{offX:.6,offY:-.7},{offX:.8,offY:-1.7,offAngle:-45,lean:-4}],
 kneel:[{lean:2,mainY:-.3,offY:-.3},{lean:6,sink:3,leg:18,offY:.15,mainY:.15}],
 spin:[{mainAngle:-65,offAngle:45,lean:-5,leg:20},{mainAngle:120,offAngle:-70,lean:6,leg:-60}],
 focus:[{offX:.65,offY:-1.15,mainY:-.7,lean:-2},{offX:1.25,offY:-1.25,mainY:-.65,lean:1}]
};
const rhythms={snap:{duration:440,prep:.18,contact:.4},weight:{duration:740,prep:.32,contact:.52},finish:{duration:900,prep:.4,contact:.58},double:{duration:690,prep:.23,contact:.42,repeats:2},triple:{duration:780,prep:.2,contact:.36,repeats:3},sustain:{duration:850,prep:.28,contact:.48},pulse:{duration:640,prep:.25,contact:.48}};
// Foundation clips also live here so authored actions never require a fallback.
clip('swing',660,{mainY:-1,mainAngle:-52},{mainX:.9,mainY:-.45,mainAngle:78,lean:5});
clip('bash',530,{offX:.55,offY:-.65,lean:-2},{offX:.9,offY:-.6,offAngle:15,lean:5});
const skills={};
function authorSkill(klass,id,base,gesture,motif,rhythm,transport){
 const b=clips[base],g=gestures[gesture],r=rhythms[rhythm];
 if(!b||!g||!r)throw new Error('Invalid skill choreography: '+klass+'/'+id);
 const prep={...b.frames[1][1],...g[0]},hit={...b.frames[2][1],...g[1]};
 // Bow nock remains attached through preparation and is released at contact.
 if(['draw','aimed','volley'].includes(base)){prep.bowDraw=1;prep.arrow=1;hit.bowDraw=0;hit.arrow=0}
 const frames=[[0,{}],[r.prep,prep],[r.contact,hit]];
 for(let i=1;i<(r.repeats||1);i++){const t=r.contact+i*.12;frames.push([t-.055,{...prep,lean:-Number(prep.lean||2)}],[t,{...hit,offX:i%2?1.4:hit.offX||.8,offAngle:i%2?85:hit.offAngle||0}])}
 frames.push([.84,{...b.frames[b.frames.length-2][1],lean:(hit.lean||0)*.4}],[1,{}]);
 const key='skill:'+klass+':'+id;
 clips[key]={...b,duration:r.duration,contact:r.contact,hold:r.prep,frames,channel:rhythm==='sustain'&&['beam','breath'].includes(transport),projectile:transport?['bolt','arrow','shield','glaive','knives'].includes(transport):!!b.projectile,socket:transport==='breath'||transport==='beam'&&klass==='Demon Hunter'?'head':transport==='arrow'?'bow':b.socket||'main'};
 skills[klass+':'+id]={id,clip:key,base,gesture,motif,rhythm,transport:transport||(b.projectile?'bolt':'local')};
}
for(const [klass,rows] of Object.entries(skillRows))for(const row of rows.trim().split('\n')){
 const [id,gesture,motif,rhythm,transport]=row.split(' '),base=overrides[id]||styles[klass].basic;
 authorSkill(klass,id,base,gesture,motif,rhythm,transport);
}
// Activated party buffs and emergency role actions are inventoried separately.
for(const [owner,a] of Object.entries(window.CellboundCombatData?.CLASS_BUFFS||{})){
 const klass=owner.split('|')[0],shadow=owner.includes('|Shadow');authorSkill(klass,a.id,styles[klass].cast,shadow?'cross':'raise',shadow?'orbit':'sigil',shadow?'sustain':'pulse','local');
}
const fallbackRows={'guard-strike':['cross','shield','weight'],'provoke':['raise','command','snap'],'restore':['gather','bloom','weight'],'renewing-wave':['spread','ripple','pulse'],'light-bolt':['flick','ray','snap'],'strike':['thrust','cut','snap'],'interrupt':['cross','cross','snap']};
for(const klass of Object.keys(styles))for(const a of Object.values(window.CellboundCombatData?.ROLE_FALLBACKS||{}).flat())if(!skills[klass+':'+a.id])authorSkill(klass,a.id,/heal/.test(a.kind)?styles[klass].heal:styles[klass].basic,...fallbackRows[a.id],'local');
authorSkill('Warrior','talent-bladestorm','cleave','spin','cleave','triple','local');
function resolve(klass,event,weapon='',twoHanded=false,alternation=0){
 const data=window.CellboundCombatData||{},style=styles[klass],name=event.ability||'';
 const definitions=[...(data.ABILITIES?.[klass]||[]),...Object.values(data.CLASS_BUFFS||{}),...Object.values(data.ROLE_FALLBACKS||{}).flat()];
 const id=event.abilityId||event.payload?.abilityId;
 const ability=definitions.find(a=>a.id===id)||definitions.find(a=>a.name===name&&(event.payload?.kind==null||a.kind==null||a.kind===event.payload.kind));
 const kind=event.payload?.kind||ability?.kind||(event.result==='class-buff'?'buff':'damage');
 let motion=overrides[ability?.id];
 if(!motion&&style){
  motion=/heal|battle-rez/.test(kind)?style.heal:kind==='defensive'?style.defense:kind==='interrupt'?'dispel':kind==='taunt'?'warcry':/summon|totem|pet-command|buff/.test(kind)?style.cast:style.basic;
  if(name==='Bladestorm')motion='cleave';
 }
 if(!motion)motion=/heal/.test(kind)?'benediction':Number(event.payload?.range||event.payload?.attackRange)>7?'arcane':twoHanded?'cleave':/dagger/.test(weapon)?'jab':'swing';
 if(motion==='swing'&&twoHanded)motion='cleave';
 if(klass==='Rogue'&&motion==='jab'&&alternation%2)motion='offjab';
 if(/draw|aimed|volley/.test(motion)&&weapon!=='bow')motion=weapon==='crossbow'?'throw':'jab';
 const channel=motion==='channel';
 if(channel)motion=/mind|void|demonfire/.test(ability?.id||'')?'hex':klass==='Druid'?'bloom':klass==='Demon Hunter'?'fel':klass==='Evoker'?'breath':style?.cast||'channel';
 const definition=clips[motion];
 const skill=skills[klass+':'+(ability?.id||(name==='Bladestorm'?'talent-bladestorm':''))];
 if(skill){const c=clips[skill.clip];return{...skill,clip:skill.clip,kind,abilityId:skill.id,known:!!ability||name==='Bladestorm',authored:true,cast:ability?.cast||0,channel:!!c.channel,projectile:!!c.projectile&&event.source!==event.target,socket:c.socket||'main',style:klass}}
 return {clip:motion,kind,abilityId:ability?.id||null,known:!!ability,cast:ability?.cast||0,channel:channel||!!definition?.channel,projectile:!!definition?.projectile&&event.source!==event.target,socket:definition?.socket||'main',style:klass||'Enemy'};
}
window.CellboundCombatAnimationCatalog={styles,clips,resolve,overrides,skills,gestures,rhythms};
})();
