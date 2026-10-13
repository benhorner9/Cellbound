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
function resolve(klass,event,weapon='',twoHanded=false,alternation=0){
 const data=window.CellboundCombatData||{},style=styles[klass],name=event.ability||'';
 const definitions=[...(data.ABILITIES?.[klass]||[]),...Object.values(data.CLASS_BUFFS||{}),...Object.values(data.ROLE_FALLBACKS||{}).flat()];
 const ability=definitions.find(a=>a.id===event.abilityId)||definitions.find(a=>a.name===name);
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
 return {clip:motion,kind,abilityId:ability?.id||null,known:!!ability,cast:ability?.cast||0,channel:channel||!!definition?.channel,projectile:!!definition?.projectile&&event.source!==event.target,socket:definition?.socket||'main',style:klass||'Enemy'};
}
window.CellboundCombatAnimationCatalog={styles,clips,resolve,overrides};
})();
