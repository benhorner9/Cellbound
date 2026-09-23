(function(){
'use strict';

const RARITY={
 Common:['#b9c1be','#53615f'],
 Uncommon:['#65dc86','#1f6943'],
 Rare:['#5aa8ff','#24538d'],
 Epic:['#c987ff','#66319a'],
 Legendary:['#f2c46d','#92571f']
};
const CLASS={
 Warrior:['#c69b6d','#673c2e'],
 Paladin:['#f48cba','#8c5370'],
 Priest:['#f1f4ff','#8ea2bf'],
 Druid:['#ff9a45','#765329'],
 Hunter:['#aad372','#507641'],
 Rogue:['#fff468','#8a7f32'],
 Mage:['#50c8ee','#246c98'],
 'Death Knight':['#c41e3a','#681826'],
 'Demon Hunter':['#a330c9','#531869'],
 Evoker:['#33937f','#1b5549'],
 Monk:['#00d98c','#12664c'],
 Shaman:['#2988ed','#174e92'],
 Warlock:['#8788ee','#4e407b']
};
const ARMOUR={
 Warrior:'plate',Paladin:'plate','Death Knight':'plate',
 Priest:'cloth',Mage:'cloth',Warlock:'cloth',
 Druid:'leather',Hunter:'leather',Rogue:'leather','Demon Hunter':'leather',Monk:'leather',
 Evoker:'mail',Shaman:'mail'
};
const PVP={
 Frontier:['#91a8ae','#33484f'],
 Arenaforged:['#e0784d','#743b32'],
 Seasonbound:['#b888ff','#543377']
};
const SPECIAL={
 'frostbound-sigil':'frost-sigil',
 'guardian-last-stand':'guardian',
 'embercore-staff':'ember-staff',
 'heart-troll-king':'troll-heart',
 'quest-blackglass-resonator':'blackglass',
 'relic-oathstone-dominion':'oathstone',
 'relic-heart-unbroken':'unbroken',
 'relic-chalice-mercy':'chalice',
 'relic-bell-renewal':'bell',
 'relic-fang-wrath':'fang',
 'relic-mirror-envy':'mirror',
 'grid-override-module':'grid-module'
};
const MATERIAL_NAMES={
 'faded-cell-fragment':'fragment',
 'zeltiran-iron':'iron',
 'ashen-soul-fragment':'soul',
 'warden-iron':'warden-iron',
 'ember-core':'ember',
 'vaultheart-crystal':'crystal',
 'ancient-soul':'ancient',
 'void-crystal':'void',
 'cell-shards':'shards'
};
const CONSUMABLE_NAMES={
 'field-recovery-potion':'potion',
 'quickmind-flask':'flask',
 'ironblood-flask':'flask',
 'cell-shock-draught':'shock',
 'binding-rune':'rune',
 'warden-ward-rune':'rune',
 'vaultheart-glyph':'glyph',
 'tempered-whetstone':'whetstone',
 'warden-plate-kit':'kit',
 'ember-temper-stone':'stone',
 'balanced-grip':'grip',
 'reinforced-harness':'harness',
 'predator-wrap':'wrap',
 'focus-thread':'thread',
 'mender-lining':'lining',
 'soulweave-lining':'lining'
};

function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function slug(v){return String(v||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function hash(v){let n=2166136261;const s=String(v||'cellbound');for(let i=0;i<s.length;i++){n^=s.charCodeAt(i);n=Math.imul(n,16777619)}return n>>>0}
function idOf(x){return String(x?.itemId||x?.id||x?.key||x?.name||'cellbound-item')}
function slotOf(x){return String(x?.slot||'').replace(/[12]$/,'')}
function rarityOf(x){return String(x?.rarity||((Number(x?.tier)||0)>=4?'Epic':(Number(x?.tier)||0)===3?'Rare':(Number(x?.tier)||0)===2?'Uncommon':'Common'))}
function classOf(x){return String(x?.class||((Array.isArray(x?.classes)&&x.classes.length===1)?x.classes[0]:'')||'')}
function tierOf(x){return Math.max(1,Math.min(5,Number(x?.tier)||1))}
function pvpBand(x){const n=String(x?.name||'');return Object.keys(PVP).find(function(k){return n.indexOf(k)===0})||''}
function palette(x){
 const pvp=pvpBand(x),rar=RARITY[rarityOf(x)]||RARITY.Common,klass=CLASS[classOf(x)];
 const base=pvp?PVP[pvp]:(klass||rar);
 return {a:base[0],b:base[1],rarity:rar[0],dark:'#071014',ink:'#dce8e5',gold:'#d9b86f'}
}
function detailSeed(x){return hash(idOf(x)+'|'+slotOf(x)+'|'+classOf(x)+'|'+tierOf(x))}
function frame(seed,pal,tier){
 const notch=5+(seed%8),orb=12+((seed>>>4)%10);
 return '<rect x="7" y="7" width="114" height="114" rx="18" fill="#071014" stroke="'+pal.rarity+'" stroke-width="'+(tier>=4?3:2)+'" opacity=".98"/>'+
 '<path d="M18 32 L18 18 L'+(32+notch)+' 18 M110 32 L110 18 L'+(96-notch)+' 18 M18 96 L18 110 L'+(32+notch)+' 110 M110 96 L110 110 L'+(96-notch)+' 110" fill="none" stroke="'+pal.a+'" stroke-width="2" opacity=".55"/>'+
 '<circle cx="64" cy="64" r="'+(44+orb*.12)+'" fill="url(#g)" opacity=".24"/>'+
 '<circle cx="64" cy="64" r="48" fill="none" stroke="'+pal.a+'" stroke-width="1" opacity=".18" stroke-dasharray="'+(3+seed%4)+' '+(5+(seed>>>8)%5)+'"/>';
}
function runes(seed,pal,tier){
 let out='';const count=2+Math.min(4,tier);
 for(let i=0;i<count;i++){
  const a=(seed+i*71)%360,r=41-(i%2)*5,x=64+Math.cos(a*Math.PI/180)*r,y=64+Math.sin(a*Math.PI/180)*r;
  out+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(1.3+(i%2)*.6)+'" fill="'+pal.rarity+'" opacity="'+(.25+tier*.07).toFixed(2)+'"/>';
 }
 return out
}
function plateHelmet(p,seed){return '<path d="M38 56 Q40 28 64 23 Q88 28 90 56 L84 91 L72 101 L56 101 L44 91 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M43 58 H85 L80 74 H70 L66 87 H61 L57 74 H48 Z" fill="'+p.dark+'" opacity=".9"/><path d="M64 27 V54 M48 39 L56 53 M80 39 L72 53" stroke="'+p.rarity+'" stroke-width="3" opacity=".75"/>'}
function hood(p,seed){return '<path d="M36 65 Q38 27 64 22 Q90 27 92 65 L83 102 Q75 92 64 91 Q53 92 45 102 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M48 61 Q50 42 64 37 Q78 42 80 61 Q77 82 64 87 Q51 82 48 61" fill="'+p.dark+'"/><path d="M45 48 Q64 30 83 48" fill="none" stroke="'+p.rarity+'" stroke-width="3" opacity=".8"/>'}
function circlet(p,seed){return '<path d="M30 70 Q64 44 98 70 L90 82 Q64 67 38 82 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M42 66 L50 43 L61 59 L64 34 L69 59 L79 43 L86 66" fill="none" stroke="'+p.rarity+'" stroke-width="5"/><circle cx="64" cy="61" r="6" fill="'+p.rarity+'" stroke="#fff" stroke-width="1"/>'}
function shoulders(p,fam,seed){
 const wing=fam==='cloth'?'M20 48 Q36 27 54 43 L47 78 Q34 69 21 73 Z':'M17 50 Q34 28 53 42 L48 73 L24 82 L15 68 Z';
 return '<path d="'+wing+'" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><g transform="translate(128 0) scale(-1 1)"><path d="'+wing+'" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/></g><path d="M49 43 Q64 32 79 43 L76 82 Q64 93 52 82 Z" fill="'+p.dark+'" opacity=".75"/><path d="M28 51 L43 47 M100 51 L85 47" stroke="'+p.rarity+'" stroke-width="4"/>'}
function chest(p,fam,seed){
 const hem=fam==='cloth'?'L86 108 L72 96 L64 110 L56 96 L42 108':'L83 105 H45';
 return '<path d="M42 31 L55 24 H73 L86 31 L97 52 L86 61 L83 105 H45 L42 61 L31 52 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M55 25 L64 43 L73 25 M64 43 V94" fill="none" stroke="'+p.rarity+'" stroke-width="3" opacity=".75"/><path d="M47 57 Q64 69 81 57" fill="none" stroke="'+p.ink+'" stroke-width="2" opacity=".55"/><path d="M45 105 '+hem+'" fill="none" stroke="'+p.rarity+'" stroke-width="2"/>';
}
function hands(p,fam,seed){return '<path d="M30 43 L48 37 L56 56 L52 94 L37 105 L25 93 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M98 43 L80 37 L72 56 L76 94 L91 105 L103 93 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M31 56 L50 51 M97 56 L78 51 M33 72 L51 68 M95 72 L77 68" stroke="'+p.rarity+'" stroke-width="3" opacity=".72"/>'}
function waist(p,fam,seed){return '<path d="M25 49 Q64 38 103 49 L99 78 Q64 86 29 78 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M48 47 H80 V81 H48 Z" fill="'+p.dark+'" stroke="'+p.rarity+'" stroke-width="3"/><path d="M56 55 H72 V73 H56 Z" fill="none" stroke="'+p.ink+'" stroke-width="2"/><circle cx="64" cy="64" r="4" fill="'+p.rarity+'"/>'}
function legs(p,fam,seed){return '<path d="M39 26 H89 L84 60 L78 108 H58 L55 69 L50 108 H30 L38 60 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M64 31 V62 M39 61 L55 67 M89 61 L73 67" stroke="'+p.rarity+'" stroke-width="3" opacity=".72"/>'}
function feet(p,fam,seed){return '<path d="M35 35 L58 37 L56 79 L48 103 H19 Q17 92 27 83 L31 63 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M93 35 L70 37 L72 79 L80 103 H109 Q111 92 101 83 L97 63 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M28 68 L55 65 M100 68 L73 65" stroke="'+p.rarity+'" stroke-width="3"/>'}
function sword(p,seed){return '<path d="M61 17 H67 L70 75 L83 88 L76 95 L64 84 L52 95 L45 88 L58 75 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M39 75 H89" stroke="'+p.gold+'" stroke-width="7"/><path d="M64 87 V111" stroke="'+p.ink+'" stroke-width="8"/><circle cx="64" cy="112" r="6" fill="'+p.rarity+'"/>'}
function hammer(p,seed){return '<path d="M47 22 H91 L98 34 L90 58 H50 L40 47 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M64 57 L54 108 L66 111 L77 58" fill="'+p.b+'" stroke="'+p.ink+'" stroke-width="2"/><path d="M51 34 H88 M60 25 L56 55" stroke="'+p.rarity+'" stroke-width="4" opacity=".8"/>'}
function staff(p,seed){return '<path d="M63 35 L58 111 H68 L66 35" fill="'+p.b+'" stroke="'+p.ink+'" stroke-width="2"/><path d="M64 17 L77 31 L69 47 L53 47 L47 31 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><circle cx="64" cy="32" r="8" fill="'+p.rarity+'" opacity=".85"/><path d="M46 31 Q64 13 82 31" fill="none" stroke="'+p.a+'" stroke-width="3"/>'}
function bow(p,seed){return '<path d="M39 20 Q96 64 39 108 Q58 65 39 20" fill="none" stroke="url(#m)" stroke-width="8"/><path d="M41 22 L88 64 L41 106" fill="none" stroke="'+p.ink+'" stroke-width="2"/><path d="M28 64 H92 M85 58 L95 64 L85 70" stroke="'+p.rarity+'" stroke-width="4"/>'}
function daggers(p,seed){return '<g transform="rotate(-20 48 65)"><path d="M45 18 L57 53 L50 73 L39 54 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M35 70 H57" stroke="'+p.rarity+'" stroke-width="6"/><path d="M46 72 V108" stroke="'+p.ink+'" stroke-width="7"/></g><g transform="translate(128 0) scale(-1 1) rotate(-20 48 65)"><path d="M45 18 L57 53 L50 73 L39 54 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M35 70 H57" stroke="'+p.rarity+'" stroke-width="6"/><path d="M46 72 V108" stroke="'+p.ink+'" stroke-width="7"/></g>'}
function weapon(p,klass,seed){
 if(klass==='Hunter')return bow(p,seed);
 if(klass==='Rogue'||klass==='Demon Hunter')return daggers(p,seed);
 if(klass==='Paladin')return hammer(p,seed);
 if(['Priest','Druid','Mage','Warlock','Evoker','Shaman'].includes(klass))return staff(p,seed);
 return sword(p,seed)
}
function offhand(p,klass,seed){
 if(['Warrior','Paladin'].includes(klass))return '<path d="M64 18 L101 34 L94 79 Q84 102 64 112 Q44 102 34 79 L27 34 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="3"/><path d="M64 29 V98 M41 54 H87" stroke="'+p.rarity+'" stroke-width="4"/>';
 if(klass==='Hunter')return '<path d="M42 21 Q76 26 90 52 L75 108 H47 L34 52 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M47 31 L76 100 M57 29 L84 83 M37 51 L82 53" stroke="'+p.rarity+'" stroke-width="3" opacity=".65"/>';
 if(klass==='Rogue')return daggers(p,seed);
 return '<path d="M31 29 Q64 17 97 29 V99 Q64 87 31 99 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M64 26 V94 M41 43 Q52 36 61 45 M87 43 Q76 36 67 45" fill="none" stroke="'+p.rarity+'" stroke-width="3"/><circle cx="64" cy="65" r="8" fill="'+p.dark+'" stroke="'+p.rarity+'" stroke-width="2"/>';
}
function ring(p,seed){return '<circle cx="64" cy="68" r="31" fill="none" stroke="url(#m)" stroke-width="13"/><path d="M48 43 L56 24 H72 L80 43 L70 55 H58 Z" fill="'+p.rarity+'" stroke="'+p.ink+'" stroke-width="2"/><path d="M56 24 L64 43 L72 24 M48 43 H80" fill="none" stroke="#fff" stroke-width="2" opacity=".55"/>'}
function trinket(p,seed){return '<path d="M34 22 Q64 52 94 22" fill="none" stroke="'+p.ink+'" stroke-width="4"/><path d="M64 45 L87 68 L75 104 H53 L41 68 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><circle cx="64" cy="72" r="11" fill="'+p.dark+'" stroke="'+p.rarity+'" stroke-width="3"/><path d="M64 54 V91 M47 72 H81" stroke="'+p.rarity+'" stroke-width="2" opacity=".7"/>'}
function relic(p,klass,seed){return '<path d="M64 20 L90 47 L82 91 L64 109 L46 91 L38 47 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M64 31 L76 55 L64 90 L52 55 Z" fill="'+p.dark+'" stroke="'+p.rarity+'" stroke-width="3"/><circle cx="64" cy="61" r="7" fill="'+p.rarity+'"/>'}
function genericGear(p,x,seed){
 const slot=slotOf(x),fam=ARMOUR[classOf(x)]||'leather';
 if(slot==='Head')return fam==='cloth'?hood(p,seed):fam==='leather'?hood(p,seed):circlet(p,seed)+plateHelmet(p,seed).replace(/opacity=".9"/,'opacity=".45"');
 if(slot==='Shoulders')return shoulders(p,fam,seed);
 if(slot==='Chest')return chest(p,fam,seed);
 if(slot==='Hands')return hands(p,fam,seed);
 if(slot==='Waist')return waist(p,fam,seed);
 if(slot==='Legs')return legs(p,fam,seed);
 if(slot==='Feet')return feet(p,fam,seed);
 if(slot==='Weapon')return weapon(p,classOf(x),seed);
 if(slot==='OffHand')return offhand(p,classOf(x),seed);
 if(slot==='Ring')return ring(p,seed);
 if(slot==='Trinket')return trinket(p,seed);
 if(slot==='Relic')return relic(p,classOf(x),seed);
 return relic(p,classOf(x),seed)
}
function crystal(p,mode){return '<path d="M64 17 L91 45 L77 106 H51 L37 45 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M64 18 V105 M38 45 H90 M51 105 L64 45 L77 105" fill="none" stroke="'+p.rarity+'" stroke-width="3" opacity=".65"/>'}
function material(p,x,seed){
 const id=idOf(x),type=MATERIAL_NAMES[id]||'fragment';
 if(type==='iron'||type==='warden-iron')return '<path d="M27 72 L42 35 L77 27 L103 51 L91 91 L54 105 L25 89 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M41 49 L78 40 L90 56 L72 75 L39 78 Z" fill="'+p.rarity+'" opacity=".45"/><path d="M47 91 L86 79" stroke="#fff" stroke-width="3" opacity=".3"/>';
 if(type==='ember')return '<path d="M64 18 Q88 45 78 62 Q101 72 88 96 Q78 111 64 110 Q49 111 39 96 Q25 73 50 61 Q40 45 64 18" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M64 42 Q76 59 67 70 Q81 82 64 98 Q47 82 61 70 Q52 59 64 42" fill="'+p.rarity+'"/>';
 if(type==='soul'||type==='ancient')return '<path d="M64 20 Q93 38 88 67 Q84 96 64 109 Q44 96 40 67 Q35 38 64 20" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M50 62 Q64 44 78 62 Q69 73 64 91 Q59 73 50 62" fill="'+p.rarity+'" opacity=".8"/>';
 if(type==='shards')return '<path d="M30 92 L45 39 L60 84 Z M57 101 L70 25 L87 91 Z M82 100 L91 51 L104 94 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/>';
 return crystal(p,type)
}
function potion(p,kind,seed){
 const wide=kind==='flask'||kind==='shock';
 return '<path d="M54 20 H74 V38 L'+(wide?'91':'83')+' 57 V100 Q64 111 '+(wide?'37':'45')+' 100 V57 L54 38 Z" fill="'+p.dark+'" stroke="'+p.ink+'" stroke-width="2"/><path d="M50 66 H78 V96 Q64 104 50 96 Z" fill="url(#m)" opacity=".92"/><path d="M51 24 H77" stroke="'+p.rarity+'" stroke-width="6"/><circle cx="61" cy="75" r="4" fill="#fff" opacity=".55"/><circle cx="70" cy="86" r="3" fill="#fff" opacity=".35"/>';
}
function consumable(p,x,seed){
 const id=idOf(x),type=CONSUMABLE_NAMES[id]||String(x?.name||'').toLowerCase();
 if(type==='potion'||type==='flask'||type==='shock'||/potion|flask|draught/.test(type))return potion(p,type,seed);
 if(type==='rune'||type==='glyph'||/rune|glyph/.test(type))return '<path d="M64 17 L104 55 L83 108 H45 L24 55 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M64 34 L79 57 L70 82 L52 85 L45 61 Z M49 57 L82 78 M78 52 L51 84" fill="none" stroke="'+p.rarity+'" stroke-width="4"/>';
 if(type==='whetstone'||type==='stone'||/stone/.test(type))return '<path d="M25 84 L45 35 L101 49 L82 98 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M37 76 L88 57 M45 88 L94 69" stroke="'+p.rarity+'" stroke-width="3" opacity=".65"/>';
 if(type==='kit'||type==='harness'||type==='wrap'||type==='grip'||type==='lining')return '<path d="M30 39 H98 V94 H30 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M30 54 H98 M47 39 V94 M81 39 V94" stroke="'+p.rarity+'" stroke-width="3" opacity=".65"/><path d="M55 62 H73 V79 H55 Z" fill="'+p.dark+'" stroke="'+p.ink+'" stroke-width="2"/>';
 if(type==='thread'||/thread/.test(type))return '<circle cx="64" cy="66" r="34" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><circle cx="64" cy="66" r="16" fill="'+p.dark+'" stroke="'+p.rarity+'" stroke-width="3"/><path d="M30 66 Q64 39 98 66 Q64 93 30 66" fill="none" stroke="'+p.ink+'" stroke-width="3"/>';
 return potion(p,'potion',seed)
}
function special(p,x,seed,type){
 if(type==='frost-sigil')return '<path d="M64 18 L91 46 L79 103 H49 L37 46 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M64 30 V91 M45 48 L83 75 M83 48 L45 75" stroke="#bde9ff" stroke-width="5"/><circle cx="64" cy="62" r="10" fill="#e8fbff" opacity=".75"/>';
 if(type==='guardian')return '<path d="M64 17 L99 34 L91 81 Q79 105 64 113 Q49 105 37 81 L29 34 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="3"/><path d="M64 42 C49 29 39 48 45 61 C51 74 64 86 64 86 C64 86 77 74 83 61 C89 48 79 29 64 42Z" fill="'+p.rarity+'" stroke="'+p.ink+'" stroke-width="2"/>';
 if(type==='ember-staff')return staff(p,seed)+'<path d="M64 14 Q82 31 69 48 Q59 41 64 27 Q52 33 55 48 Q40 32 64 14" fill="#ff794c" opacity=".9"/>';
 if(type==='troll-heart')return '<path d="M64 104 C48 88 28 74 31 52 C34 29 57 27 64 42 C71 27 94 29 97 52 C100 74 80 88 64 104Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="3"/><path d="M47 56 L58 56 L63 45 L70 73 L76 60 H87" fill="none" stroke="'+p.rarity+'" stroke-width="4"/>';
 if(type==='blackglass')return '<path d="M64 16 L88 43 L77 105 H51 L40 43 Z" fill="#080b10" stroke="#9feaff" stroke-width="3"/><path d="M64 24 V100 M42 44 H86 M50 91 L78 53" stroke="#516a7d" stroke-width="3"/><circle cx="64" cy="62" r="10" fill="#9feaff" opacity=".36"/>';
 if(type==='grid-module')return '<rect x="27" y="28" width="74" height="73" rx="12" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M47 47 H81 M47 82 H81 M42 56 V75 M86 56 V75" stroke="'+p.rarity+'" stroke-width="4"/><path d="M70 42 L53 67 H65 L58 91 L80 62 H67 Z" fill="#ffe07a" stroke="'+p.ink+'" stroke-width="1.5"/>';
 if(type==='oathstone')return '<path d="M64 16 L99 45 L87 103 H41 L29 45 Z" fill="url(#m)" stroke="'+p.gold+'" stroke-width="3"/><path d="M64 31 V89 M44 52 H84" stroke="'+p.rarity+'" stroke-width="6"/>';
 if(type==='unbroken')return '<path d="M64 106 C47 90 28 74 32 50 C35 29 55 27 64 43 C73 27 93 29 96 50 C100 74 81 90 64 106Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="3"/><path d="M39 67 H89" stroke="'+p.rarity+'" stroke-width="5"/>';
 if(type==='chalice')return '<path d="M35 30 H93 Q91 67 70 75 V96 H84 V106 H44 V96 H58 V75 Q37 67 35 30Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M43 45 H85" stroke="'+p.rarity+'" stroke-width="5"/>';
 if(type==='bell')return '<path d="M38 83 Q45 67 45 48 Q46 25 64 22 Q82 25 83 48 Q83 67 90 83 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M32 84 H96" stroke="'+p.rarity+'" stroke-width="6"/><circle cx="64" cy="94" r="7" fill="'+p.gold+'"/>';
 if(type==='fang')return '<path d="M39 22 Q74 32 89 21 Q83 68 53 108 Q46 76 39 22Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M52 39 Q69 47 78 38" fill="none" stroke="'+p.rarity+'" stroke-width="4"/>';
 if(type==='mirror')return '<path d="M64 16 L92 33 L98 74 L77 108 H51 L30 74 L36 33 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="3"/><path d="M64 29 L81 39 L85 70 L72 92 H56 L43 70 L47 39 Z" fill="#d9f2ff" opacity=".38"/><path d="M52 36 L79 82 M44 58 L76 30" stroke="#fff" stroke-width="2" opacity=".7"/>';
 return relic(p,classOf(x),seed)
}
function collection(p,x,seed){
 const kind=String(x?.kind||'collection');
 if(kind==='mount')return '<path d="M25 87 Q30 55 56 45 Q65 24 82 25 L75 43 Q96 48 103 65 L88 63 Q82 86 64 93 L49 108 L46 93 L31 107 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M55 49 Q36 28 21 35 Q37 53 48 61 M80 46 Q99 27 109 42 Q95 54 86 60" fill="none" stroke="'+p.rarity+'" stroke-width="5"/>';
 if(kind==='pet')return '<path d="M64 25 L91 45 L86 86 L64 105 L42 86 L37 45 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><circle cx="53" cy="61" r="5" fill="#fff"/><circle cx="75" cy="61" r="5" fill="#fff"/><path d="M53 82 Q64 90 75 82" fill="none" stroke="'+p.rarity+'" stroke-width="3"/>';
 return '<path d="M64 16 L98 39 L91 89 L64 112 L37 89 L30 39 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M64 30 L81 50 L76 83 L64 96 L52 83 L47 50 Z" fill="'+p.dark+'" stroke="'+p.rarity+'" stroke-width="3"/><circle cx="64" cy="63" r="9" fill="'+p.rarity+'"/>';
}
function keyArt(p,x,seed){return '<circle cx="48" cy="52" r="23" fill="none" stroke="url(#m)" stroke-width="11"/><path d="M65 69 L105 109 M84 88 L96 76 M93 97 L105 85" stroke="'+p.ink+'" stroke-width="9"/><circle cx="48" cy="52" r="7" fill="'+p.rarity+'"/>'}\nfunction recipeArt(p,x,seed){return '<path d="M34 22 Q48 29 64 22 Q80 29 94 22 V105 Q80 98 64 105 Q48 98 34 105 Z" fill="url(#m)" stroke="'+p.ink+'" stroke-width="2"/><path d="M45 43 H83 M45 55 H76 M45 72 H83 M45 84 H68" stroke="'+p.dark+'" stroke-width="4" opacity=".78"/><path d="M76 73 L88 86 L76 98 L64 86 Z" fill="'+p.rarity+'" stroke="'+p.ink+'" stroke-width="2"/>'}
function kindOf(x){
 const id=idOf(x);
 if(SPECIAL[id])return 'special';
 if(x?.kind&&['mount','pet','cell'].includes(String(x.kind)))return 'collection';
 if(x?.category==='material'||x?.material||MATERIAL_NAMES[id])return 'material';
 if(x?.category==='consumable'||x?.payload?.effect||CONSUMABLE_NAMES[id])return 'consumable';
 if(x?.category==='recipe'||/^Recipe:/i.test(String(x?.name||'')))return 'recipe';\n if(x?.category==='key'||/\bkey\b/i.test(String(x?.name||'')))return 'key';
 if(x?.category==='utility'||x?.utilityType||slotOf(x)==='Utility')return 'utility';
 if(slotOf(x))return 'gear';
 return 'utility'
}
function artBody(p,x,seed){
 const kind=kindOf(x),id=idOf(x);
 if(kind==='special')return special(p,x,seed,SPECIAL[id]);
 if(kind==='material')return material(p,x,seed);
 if(kind==='consumable')return consumable(p,x,seed);
 if(kind==='collection')return collection(p,x,seed);
 if(kind==='recipe')return recipeArt(p,x,seed);\n if(kind==='key')return keyArt(p,x,seed);
 if(kind==='utility')return special(p,x,seed,'grid-module');
 return genericGear(p,x,seed)
}
function artHTML(item,size,extra){
 if(!item)return '';
 size=Math.max(20,Math.round(Number(size)||64));extra=extra||'';
 const x={...item},seed=detailSeed(x),p=palette(x),tier=tierOf(x),uid='cbia'+seed.toString(36),title=esc(x.name||idOf(x));
 const body=artBody(p,x,seed),pvp=pvpBand(x);
 const cls=['cb-item-art','cb-item-'+slug(kindOf(x)),'rarity-'+slug(rarityOf(x)),pvp?'cb-item-pvp':'',extra].filter(Boolean).join(' ');
 const svg='<svg viewBox="0 0 128 128" role="img" aria-label="'+title+'" focusable="false"><defs>'+
 '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+p.a+'"/><stop offset="1" stop-color="'+p.b+'"/></linearGradient>'+
 '<linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+p.a+'"/><stop offset=".48" stop-color="'+p.b+'"/><stop offset="1" stop-color="'+p.rarity+'"/></linearGradient>'+
 '<filter id="'+uid+'"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".65"/></filter></defs>'+
 frame(seed,p,tier)+runes(seed,p,tier)+'<g filter="url(#'+uid+')">'+body+'</g>'+
 (tier>=4?'<circle cx="64" cy="64" r="52" fill="none" stroke="'+p.rarity+'" stroke-width="1.5" opacity=".38"/>':'')+
 (pvp?'<path d="M20 105 L36 89 M108 105 L92 89" stroke="'+p.gold+'" stroke-width="4" opacity=".8"/>':'')+
 '</svg>';
 return '<span class="'+esc(cls)+'" style="width:'+size+'px;height:'+size+'px" data-item-art="'+esc(idOf(x))+'" data-item-kind="'+esc(kindOf(x))+'" title="'+title+'">'+svg+'</span>'
}
function findConsumable(key){
 const P=window.CellboundProfessions,all=Object.values(P?.PROFESSIONS||{}).flatMap(function(v){return v.recipes||[]});
 const r=all.find(function(v){return v?.output?.key===key});
 return r?.output?{...r.output,rarity:r.endgame?'Epic':'Uncommon'}:{key:key,itemId:key,name:key,category:'consumable',rarity:'Uncommon'}
}
function materialHTML(key,size,extra){
 const m=window.CellboundProfessions?.MATERIALS?.[key]||{};
 return artHTML({key:key,itemId:key,name:m.name||key,rarity:m.rarity||'Common',category:'material',material:true},size,extra)
}
function consumableHTML(key,size,extra){
 return artHTML(findConsumable(key),size,extra)
}
function collectionHTML(item,size,extra){return artHTML(item,size,extra)}
function resolveGear(item){
 const G=window.CellboundGear;if(!item)return item;
 return G?.byId?.(item.baseItemId)||G?.byId?.(item.itemId)||G?.byName?.(item.name)||item
}
function installDataAdapters(){
 const G=window.CellboundGear,P=window.CellboundProfessions;
 if(G&&!G.__fullItemArtV1){
  G.__legacyArtHTML=G.artHTML;
  G.artHTML=function(item,size,extra){
   const canonical=resolveGear(item)||item;
   const merged={...canonical,...item,itemId:item?.itemId||canonical?.itemId,baseItemId:item?.baseItemId};
   const slot=slotOf(merged),tier=tierOf(merged),klass=classOf(merged);
   const classes=['gear-art','tier-'+tier,'gear-slot-'+slug(slot||'item'),'gear-class-'+slug(klass||'all'),extra||''].join(' ');
   return artHTML(merged,size,classes)
  };
  G.__fullItemArtV1=true
 }
 if(P&&!P.__fullItemArtV1){
  P.__legacyMaterialArtHTML=P.materialArtHTML;
  P.materialArtHTML=materialHTML;
  P.consumableArtHTML=consumableHTML;
  P.__fullItemArtV1=true
 }
}
function enhancePvp(root){
 const scope=root||document;
 scope.querySelectorAll?.('[data-buy-pvp]').forEach(function(btn){
  if(btn.dataset.itemArtDone==='1')return;
  const parts=String(btn.dataset.buyPvp||'').split(':'),tier=Number(parts[0])||1,slot=parts[1]||'Trinket';
  const names={1:'Frontier',2:'Arenaforged',3:'Seasonbound'},span=btn.querySelector('span');
  if(span){span.innerHTML=artHTML({id:'pvp-t'+tier+'-'+slug(slot),name:(names[tier]||'PvP')+' '+slot,tier:tier,slot:slot,pvpOnly:true,rarity:tier===3?'Epic':tier===2?'Rare':'Uncommon'},46,'pvp-shop-item-art');btn.dataset.itemArtDone='1'}
 });
 scope.querySelectorAll?.('.pvp-equipped-grid > div.filled').forEach(function(card){
  if(card.dataset.itemArtDone==='1')return;
  const name=card.querySelector('b')?.textContent||'',slot=card.querySelector('small')?.textContent||'Trinket',tier=/^Seasonbound/.test(name)?3:/^Arenaforged/.test(name)?2:1,span=card.querySelector('span');
  if(span){span.innerHTML=artHTML({id:'pvp-t'+tier+'-'+slug(slot),name:name,tier:tier,slot:slot,pvpOnly:true,rarity:tier===3?'Epic':tier===2?'Rare':'Uncommon'},42,'pvp-equipped-item-art');card.dataset.itemArtDone='1'}
 })
}
function enhanceCollections(root){
 const scope=root||document;
 scope.querySelectorAll?.('.eg-collection-list article').forEach(function(card){
  if(card.dataset.itemArtDone==='1')return;
  const name=card.querySelector('b')?.textContent||'',meta=card.querySelector('small')?.textContent||'',kind=/MOUNT/i.test(meta)?'mount':/PET/i.test(meta)?'pet':'cell',icon=card.querySelector('i');
  const D=window.CellboundEndgameData,found=Object.values(D?.CHASE_REWARDS||{}).find(function(x){return x.name===name})||{id:slug(name),name:name,kind:kind,rarity:'Legendary'};
  if(icon){icon.innerHTML=artHTML(found,48,'endgame-collection-art');card.dataset.itemArtDone='1'}
 })
}
function enhanceCrafting(root){
 const P=window.CellboundProfessions,scope=root||document;if(!P)return;
 scope.querySelectorAll?.('.crafted-card').forEach(function(card){
  if(card.dataset.itemArtDone==='1')return;
  const b=card.querySelector('b'),name=b?.textContent?.replace(/^[⚗▤]\s*/,'').trim();if(!name)return;
  const all=Object.values(P.PROFESSIONS||{}).flatMap(function(v){return v.recipes||[]}),recipe=all.find(function(r){return r?.output?.name===name});
  if(recipe?.output?.category==='consumable'){b.insertAdjacentHTML('beforebegin',consumableHTML(recipe.output.key,48,'crafted-item-art'));card.dataset.itemArtDone='1';return}\n  if(/^Recipe:/i.test(name)){b.insertAdjacentHTML('beforebegin',artHTML({id:'recipe-'+slug(name),name:name,category:'recipe',rarity:'Rare'},48,'crafted-item-art'));card.dataset.itemArtDone='1'}
 });
 scope.querySelectorAll?.('.recipe-card').forEach(function(card){
  if(card.dataset.itemArtDone==='1')return;const name=card.querySelector('h4')?.textContent||'';
  const all=Object.values(P.PROFESSIONS||{}).flatMap(function(v){return v.recipes||[]}),recipe=all.find(function(r){return r.name===name});
  if(recipe?.output?.category==='consumable'){card.insertAdjacentHTML('afterbegin',consumableHTML(recipe.output.key,48,'recipe-output-art'));card.dataset.itemArtDone='1'}
 });
 scope.querySelectorAll?.('.evo-bank-resource').forEach(function(card){
  if(card.dataset.itemArtDone==='1')return;
  const cat=card.querySelector('.bank-copy small')?.textContent||'',name=card.querySelector('h3')?.textContent||'';
  if(!/CONSUMABLE/i.test(cat))return;
  const stack=(window.CellboundGame?.getState?.()?.consumables||[]).find(function(x){return x.name===name});
  const box=card.querySelector('.bank-icon');if(box&&stack){box.innerHTML=consumableHTML(stack.key,66,'evo-resource-art');card.dataset.itemArtDone='1'}
 })
}
function enhanceFourfold(root){
 const scope=root||document;
 scope.querySelectorAll?.('.fourfold-key.found,.fourfold-key.inserted').forEach(function(card){
  if(card.dataset.itemArtDone==='1')return;const name=card.querySelector('b')?.textContent||'',icon=card.querySelector('i');if(!name||name==='Unknown Key'||!icon)return;
  const ids={'Cinder-Iron Key':'cinder-key','Blackglass Key':'blackglass-key','Verdant Key':'verdant-key','Relay Key':'relay-key'},id=ids[name]||slug(name);
  icon.innerHTML=artHTML({id:id,itemId:id,name:name,category:'key',rarity:'Rare'},48,'fourfold-key-art');card.dataset.itemArtDone='1'
 })
}
function enhanceTrade(root){
 const scope=root||document,P=window.CellboundProfessions;
 scope.querySelectorAll?.('.trade-preview-symbol').forEach(function(el){
  if(el.dataset.itemArtDone==='1')return;const host=el.closest('[data-item-key],[data-listing-id],article,button,div');if(!host)return;
  const text=host.textContent||'',all=Object.values(P?.PROFESSIONS||{}).flatMap(function(v){return v.recipes||[]}),recipe=all.find(function(r){return r?.output?.category==='consumable'&&text.indexOf(r.output.name)>=0});
  if(recipe){el.outerHTML=consumableHTML(recipe.output.key,54,'tp-consumable-art')}
 })
}
function enhanceAll(root){installDataAdapters();enhancePvp(root);enhanceCollections(root);enhanceCrafting(root);enhanceFourfold(root);enhanceTrade(root)}
window.CellboundItemArt={VERSION:'1.0.0',artHTML:artHTML,materialHTML:materialHTML,consumableHTML:consumableHTML,collectionHTML:collectionHTML,findConsumable:findConsumable,resolveGear:resolveGear,install:installDataAdapters,enhance:enhanceAll,SPECIAL:SPECIAL,MATERIAL_NAMES:MATERIAL_NAMES,CONSUMABLE_NAMES:CONSUMABLE_NAMES};
installDataAdapters();
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){enhanceAll(document)});
 else enhanceAll(document);
 const obs=new MutationObserver(function(ms){for(const m of ms){for(const n of m.addedNodes){if(n&&n.nodeType===1)enhanceAll(n)}}});
 const start=function(){if(document.body)obs.observe(document.body,{childList:true,subtree:true})};
 if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true})
}
})();