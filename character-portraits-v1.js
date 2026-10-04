(()=>{
'use strict';

const RIG=window.CellboundCharacterRig||null;
const CHARACTER_MODEL_VERSION=15;
const CHARACTER_MODEL_CONTRACT='classic-paper-doll-v1';
const BASE_ART_CONTRACT='classic-paper-doll-v1';
const EQUIPMENT_LAYER_CONTRACT='shield-back|body|armour|front-offhand|mainhand-side';
const RACE_IDENTITY_VERSION=2;
const EQUIPMENT_FIT_VERSION=4;
const WEAPON_POSE_VERSION=1;
const ITEM_VISUALS_VERSION=2;

const CLASS_COLORS={
  Warrior:'#C69B6D',Paladin:'#F48CBA',Priest:'#FFFFFF',Druid:'#FF7C0A',
  Hunter:'#AAD372',Rogue:'#FFF468',Mage:'#3FC7EB',Shaman:'#0070DD',
  Warlock:'#8788EE',Monk:'#00FF98','Death Knight':'#C41E3A','Demon Hunter':'#A330C9',Evoker:'#33937F'
};

const RACES={
  Veyren:{
    skin:['#f2c8a5','#dca77e','#bf825f','#9b654c','#714535','#4f3129'],
    eyes:['#7fb6d6','#6c9f78','#9278c6','#b58d4c','#6b7c88','#4d342e'],
    featureLabel:'Detail'
  },
  Stoneborn:{
    skin:['#c0aaa0','#a08e85','#83766f','#75635c','#61504b','#493c38'],
    eyes:['#d8b66b','#8fb7c4','#93a57b','#bd7b64','#bfc4ca','#6f8799'],
    featureLabel:'Stone ridge'
  },
  Aelari:{
    skin:['#e2d8e8','#c8b8d9','#ad99c5','#8d7aae','#716190','#55496e'],
    eyes:['#8be9ff','#d6a9ff','#90ffd2','#f4d878','#c7e5ff','#ffb9dc'],
    featureLabel:'Ear style'
  },
  Thornkin:{
    skin:['#b9b58b','#9ea377','#7f8f63','#66794e','#53643f','#3e4c31'],
    eyes:['#d8d36d','#94ce7a','#78d6bd','#d2a85d','#b5e28c','#e6ddad'],
    featureLabel:'Growth'
  },
  Emberkin:{
    skin:['#d69772','#bd715c','#9c554b','#813f3d','#693233','#4c282b'],
    eyes:['#ffd25b','#ff9c48','#ff7659','#f7d48d','#ffcfb6','#f5eece'],
    featureLabel:'Ember crown'
  },
  Nymari:{
    skin:['#a9c7c5','#86acae','#6e929a','#597883','#465f6d','#354b5a'],
    eyes:['#95fbff','#a7b7ff','#cda8ff','#8fffd2','#e8dd9a','#f3f7ff'],
    featureLabel:'Fin crest'
  }
};

const HAIR=['#17191c','#33251f','#5a3827','#8a5a35','#b88b59','#d8c9a6','#7a3030','#d4d9df'];
const COUNTS={skinTone:6,face:4,hair:6,hairColor:8,facialHair:4,marking:5,eyes:6,feature:4};
const LABELS={
  skinTone:'Skin',face:'Face',hair:'Hair',hairColor:'Hair color',
  facialHair:'Facial hair',marking:'Marking',eyes:'Eyes'
};

function esc(v){
  return String(v==null?'':v).replace(/[&<>"']/g,function(m){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]});
}
function hash(value){
  var s=String(value||'cellbound'),h=2166136261;
  for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}
function seeded(seed,field,count){
  return hash(String(seed||'cellbound')+'|'+field)%count;
}
function int(v,max,fallback){
  var n=Number(v);
  return Number.isInteger(n)&&n>=0&&n<max?n:fallback;
}
function raceDef(race){return RACES[race]||RACES.Veyren}

function normalizeAppearance(input,seed,raceOverride){
  var src=input&&typeof input==='object'?input:{};
  var race=raceOverride||src.race||'Veyren';
  if(!RACES[race])race='Veyren';
  var key=seed||src.seed||src.id||src.name||race;
  var out=Object.assign({},src,{race:race});
  Object.keys(COUNTS).forEach(function(field){
    out[field]=int(src[field],COUNTS[field],seeded(key,field,COUNTS[field]));
  });
  return out;
}
function randomAppearance(race){
  var out={race:RACES[race]?race:'Veyren'};
  Object.keys(COUNTS).forEach(function(field){out[field]=Math.floor(Math.random()*COUNTS[field])});
  return out;
}
function applyToCharacter(c){
  if(!c)return c;
  c.appearance=normalizeAppearance(c.appearance,c.id||c.name||c.race,c.race||c.appearance?.race||'Veyren');
  return c;
}

function facePath(i){
  return [
    'M31 34 Q50 21 69 34 L67 63 Q64 80 50 88 Q36 80 33 63 Z',
    'M29 35 Q50 23 71 35 L68 68 Q62 84 50 87 Q38 84 32 68 Z',
    'M34 31 Q50 20 66 31 L69 59 Q65 80 50 90 Q35 80 31 59 Z',
    'M30 38 Q34 24 50 23 Q66 24 70 38 L66 66 Q61 84 50 87 Q39 84 34 66 Z'
  ][i]||'M31 34 Q50 21 69 34 L67 63 Q64 80 50 88 Q36 80 33 63 Z';
}
function raceFacePath(a){
  var race=a?.race||'Veyren',g=Number(a?.gender)===1?1:0;
  if(race==='Stoneborn')return g
    ?'M27 34 Q50 18 73 34 L73 61 L68 75 L58 87 L50 90 L42 87 L32 75 L27 61Z'
    :'M24 34 Q50 16 76 34 L75 62 L69 77 L59 88 L50 92 L41 88 L31 77 L25 62Z';
  if(race==='Aelari')return g
    ?'M36 29 Q50 15 64 29 L63 60 Q60 79 50 93 Q40 79 37 60Z'
    :'M35 28 Q50 14 65 28 L64 61 Q60 80 50 94 Q40 80 36 61Z';
  if(race==='Thornkin')return g
    ?'M31 34 Q47 18 67 31 L70 46 L66 64 Q62 79 50 89 Q36 80 32 64 L29 48Z'
    :'M29 33 Q46 16 69 30 L72 46 L67 65 Q63 82 50 91 Q34 82 30 65 L27 47Z';
  if(race==='Emberkin')return g
    ?'M30 34 L39 22 L50 18 L61 22 L70 34 L67 64 L60 78 L50 92 L40 78 L33 64Z'
    :'M27 34 L39 20 L50 16 L61 20 L73 34 L69 66 L60 82 L50 95 L40 82 L31 66Z';
  if(race==='Nymari')return g
    ?'M32 32 Q50 18 68 32 L69 56 Q65 75 50 88 Q35 75 31 56Z'
    :'M31 31 Q50 17 69 31 L70 56 Q66 76 50 89 Q34 76 30 56Z';
  if(race==='Veyren')return g
    ?'M32 32 L39 24 Q50 17 61 24 L68 32 L65 62 L58 79 L50 91 L42 79 L35 62Z'
    :'M30 32 L39 22 Q50 16 61 22 L70 32 L67 63 L59 81 L50 93 L41 81 L33 63Z';
  return facePath(a?.face||0);
}
function earsMarkup(race,skin,feature){
  if(race==='Veyren')return '<path d="M34 42 L12 28 L29 57Z" fill="'+skin+'" stroke="#182027" stroke-width="2.2"/><path d="M66 42 L88 28 L71 57Z" fill="'+skin+'" stroke="#182027" stroke-width="2.2"/><path d="M28 44 L18 34 M72 44 L82 34" stroke="#b18ae0" stroke-width="1.6" opacity=".72"/><circle cx="17" cy="34" r="1.4" fill="#caa8ee" opacity=".62"/><circle cx="83" cy="34" r="1.4" fill="#caa8ee" opacity=".62"/>';
  if(race==='Stoneborn')return '<path d="M29 42 L19 39 L20 54 L30 57Z M71 42 L81 39 L80 54 L70 57Z" fill="'+skin+'" stroke="#182027" stroke-width="2.6"/><path d="M21 44 L29 47 M79 44 L71 47" stroke="#e0d6ce" stroke-width="2" opacity=".48"/>';
  if(race==='Aelari'){
    var long=feature%2===0;
    return '<path d="'+(long?'M36 40 L5 22 L31 57Z':'M36 41 L10 26 L31 57Z')+'" fill="'+skin+'" stroke="#182027" stroke-width="2"/><path d="'+(long?'M64 40 L95 22 L69 57Z':'M64 41 L90 26 L69 57Z')+'" fill="'+skin+'" stroke="#182027" stroke-width="2"/><path d="M29 44 L13 31 M71 44 L87 31" stroke="#e7ceff" stroke-width="1.5" opacity=".78"/>';
  }
  if(race==='Thornkin')return '<path d="M33 42 L18 31 L27 55Z M67 42 L82 31 L73 55Z" fill="#6e8555" stroke="#182027" stroke-width="2.2"/><path d="M24 38 L14 28 M76 38 L86 28" stroke="#76965a" stroke-width="3.6" stroke-linecap="round"/><path d="M15 29 l-7 -3 l3 8 M85 29 l7 -3 l-3 8" fill="#9aba75"/>';
  if(race==='Emberkin')return '<path d="M32 42 L17 31 L28 57Z M68 42 L83 31 L72 57Z" fill="'+skin+'" stroke="#182027" stroke-width="2.3"/><path d="M23 39 L16 31 M77 39 L84 31" stroke="#ff8d55" stroke-width="1.8" opacity=".75"/>';
  if(race==='Nymari')return '<path d="M32 41 L8 27 L16 47 L7 59 L31 54Z M68 41 L92 27 L84 47 L93 59 L69 54Z" fill="#58b9c5" stroke="#173e49" stroke-width="2"/><path d="M14 34 L29 47 M86 34 L71 47" stroke="#b9ffff" stroke-width="1.8" opacity=".85"/><path d="M13 48 L24 47 M87 48 L76 47" stroke="#7ee8eb" stroke-width="1.2" opacity=".72"/>';
  return '<ellipse cx="30" cy="49" rx="5" ry="8" fill="'+skin+'" stroke="#182027" stroke-width="2"/><ellipse cx="70" cy="49" rx="5" ry="8" fill="'+skin+'" stroke="#182027" stroke-width="2"/>';
}
function raceFaceDetails(a,eye){
  var race=a?.race||'Veyren';
  if(race==='Veyren')return '<path d="M35 39 L30 48 L35 57 M65 39 L70 48 L65 57 M43 31 L50 27 L57 31" fill="none" stroke="#a97cd8" stroke-width="1.55" opacity=".72"/><circle cx="42" cy="51.5" r="4.5" fill="'+eye+'" opacity=".12"/><circle cx="58" cy="51.5" r="4.5" fill="'+eye+'" opacity=".12"/>';
  if(race==='Stoneborn')return '<path d="M29 39 L40 33 L50 37 L60 32 L71 39 M33 61 L41 56 L48 60 M67 61 L59 56 L52 60" fill="none" stroke="#eee3da" stroke-width="2.5" opacity=".4"/><path d="M29 46 H45 M55 46 H71" stroke="#332e2d" stroke-width="3.2" opacity=".72"/><path d="M38 76 L50 81 L62 76" fill="none" stroke="#544945" stroke-width="2.2" opacity=".62"/>';
  if(race==='Aelari')return '<path d="M35 44 Q41 38 47 42 M53 42 Q59 38 65 44" fill="none" stroke="#e1c5fa" stroke-width="1.8" opacity=".72"/><path d="M40 62 Q50 68 60 62 M44 30 L50 24 L56 30" fill="none" stroke="#d3b0f0" stroke-width="1.25" opacity=".58"/>';
  if(race==='Thornkin')return '<path d="M37 34 Q32 48 39 64 M63 34 Q68 48 61 64 M44 27 L42 41 M57 26 L59 42 M34 69 L41 65 M66 69 L59 65" fill="none" stroke="#4e683f" stroke-width="2" opacity=".82"/><path d="M34 57 l-5 7 l8 -2 M66 57 l5 7 l-8 -2" fill="#809f62" opacity=".82"/>';
  if(race==='Emberkin')return '<path d="M35 36 L41 46 L37 57 L45 66 M65 36 L59 46 L63 57 L55 66 M47 28 L50 37 L54 28 M43 74 L50 79 L57 74" fill="none" stroke="#ff8245" stroke-width="2" opacity=".9"/><circle cx="37" cy="57" r="2.1" fill="#ffc06a"/><circle cx="63" cy="57" r="2.1" fill="#ffc06a"/>';
  if(race==='Nymari')return '<path d="M29 55 H39 M27 60 H38 M25 65 H37 M61 55 H71 M62 60 H73 M63 65 H75" stroke="#a1fbfb" stroke-width="1.8" opacity=".85"/><path d="M39 36 Q50 30 61 36 M40 73 Q50 78 60 73" fill="none" stroke="#69cbd3" stroke-width="1.4" opacity=".62"/>';
  return '';
}
function raceEyeMarkup(a,eye){
  var race=a?.race||'Veyren';
  if(race==='Veyren')return '<path d="M37 51 Q42 46 47 51 Q42 56 37 51Z M53 51 Q58 46 63 51 Q58 56 53 51Z" fill="'+eye+'" stroke="#d9b7ff" stroke-width=".7"/><circle cx="42" cy="51" r="1.2" fill="#f7efff"/><circle cx="58" cy="51" r="1.2" fill="#f7efff"/>';
  if(race==='Aelari')return '<path d="M36 51 Q42 46 48 50 Q42 54 36 51Z M52 50 Q58 46 64 51 Q58 54 52 50Z" fill="'+eye+'" stroke="#f2deff" stroke-width=".75"/><circle cx="42" cy="50.5" r=".85" fill="#ffffff"/><circle cx="58" cy="50.5" r=".85" fill="#ffffff"/>';
  if(race==='Stoneborn')return '<rect x="38" y="49" width="8" height="4.5" rx="1.8" fill="'+eye+'"/><rect x="54" y="49" width="8" height="4.5" rx="1.8" fill="'+eye+'"/><circle cx="42" cy="50.4" r=".65" fill="#fff6df"/><circle cx="58" cy="50.4" r=".65" fill="#fff6df"/>';
  if(race==='Emberkin')return '<path d="M37 52 L42 47 L47 52 L42 56Z M53 52 L58 47 L63 52 L58 56Z" fill="'+eye+'" stroke="#ffcc76" stroke-width=".8"/><circle cx="42" cy="52" r="1.1" fill="#fff1b8"/><circle cx="58" cy="52" r="1.1" fill="#fff1b8"/>';
  if(race==='Nymari')return '<ellipse cx="42" cy="51" rx="3.4" ry="4.4" fill="'+eye+'" stroke="#c5ffff" stroke-width=".8"/><ellipse cx="58" cy="51" rx="3.4" ry="4.4" fill="'+eye+'" stroke="#c5ffff" stroke-width=".8"/><ellipse cx="42" cy="51" rx=".8" ry="2.2" fill="#153748"/><ellipse cx="58" cy="51" rx=".8" ry="2.2" fill="#153748"/>';
  if(race==='Thornkin')return '<ellipse cx="42" cy="52" rx="2.5" ry="3" fill="'+eye+'"/><ellipse cx="58" cy="52" rx="2.5" ry="3" fill="'+eye+'"/><circle cx="42" cy="51.3" r=".65" fill="#f3f5c2"/><circle cx="58" cy="51.3" r=".65" fill="#f3f5c2"/>';
  return '<ellipse cx="42" cy="52" rx="2.2" ry="2.8" fill="'+eye+'"/><ellipse cx="58" cy="52" rx="2.2" ry="2.8" fill="'+eye+'"/>';
}
function hairMarkup(a,hair){
  var h=a.hair;
  if(h===0)return '';
  if(h===1)return '<path d="M31 39 Q31 22 50 20 Q69 22 69 39 Q58 31 50 33 Q41 30 31 39Z" fill="'+hair+'" stroke="#111820" stroke-width="2"/>';
  if(h===2)return '<path d="M29 42 Q29 20 52 19 Q72 21 70 42 Q59 31 47 34 Q37 34 29 42Z" fill="'+hair+'" stroke="#111820" stroke-width="2"/><path d="M52 20 Q42 28 35 45" fill="none" stroke="#87929a" stroke-opacity=".25" stroke-width="2"/>';
  if(h===3)return '<path d="M29 40 Q29 20 50 19 Q71 20 71 40 L73 70 Q68 64 65 52 L64 34 Q50 27 36 35 L35 53 Q32 64 27 70Z" fill="'+hair+'" stroke="#111820" stroke-width="2"/>';
  if(h===4)return '<path d="M43 31 L46 13 L51 26 L56 12 L58 32 Q50 27 43 31Z" fill="'+hair+'" stroke="#111820" stroke-width="2"/><path d="M31 39 Q34 29 43 29 Q50 35 58 29 Q67 30 69 39 Q56 32 50 34 Q41 31 31 39Z" fill="'+hair+'" stroke="#111820" stroke-width="2"/>';
  return '<path d="M30 40 Q31 21 50 20 Q69 22 70 40 Q60 31 50 34 Q40 30 30 40Z" fill="'+hair+'" stroke="#111820" stroke-width="2"/><path d="M31 38 Q23 52 30 70 M69 38 Q77 52 70 70" fill="none" stroke="'+hair+'" stroke-width="6" stroke-linecap="round"/><path d="M28 53 L23 61 M72 53 L77 61" stroke="#b7a16b" stroke-width="2"/>';
}
function beardMarkup(a,hair){
  if(a.facialHair===0)return '';
  if(a.facialHair===1)return '<path d="M38 68 Q50 78 62 68" fill="none" stroke="'+hair+'" stroke-width="2.5" stroke-dasharray="2 2" opacity=".78"/>';
  if(a.facialHair===2)return '<path d="M45 68 Q50 72 55 68 L54 81 Q50 85 46 81Z" fill="'+hair+'" opacity=".92"/><path d="M42 65 Q50 61 58 65" fill="none" stroke="'+hair+'" stroke-width="3"/>';
  return '<path d="M35 63 Q39 82 50 88 Q61 82 65 63 Q58 73 50 71 Q42 73 35 63Z" fill="'+hair+'" opacity=".95"/><path d="M41 63 Q50 59 59 63" fill="none" stroke="#14181b" stroke-width="2" opacity=".55"/>';
}
function markingMarkup(a,race){
  var stroke=race==='Emberkin'?'#ff9c48':race==='Nymari'?'#8ffcff':race==='Thornkin'?'#344f32':'#663c42';
  if(a.marking===0)return '';
  if(a.marking===1)return '<path d="M38 38 L45 56" stroke="'+stroke+'" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>';
  if(a.marking===2)return '<path d="M57 37 L64 45 M59 39 L55 47" stroke="'+stroke+'" stroke-width="2" stroke-linecap="round" opacity=".85"/>';
  if(a.marking===3)return '<path d="M36 56 Q31 62 36 69 M64 56 Q69 62 64 69" fill="none" stroke="'+stroke+'" stroke-width="2" opacity=".85"/>';
  return '<path d="M42 51 L38 57 L43 61 M58 51 L62 57 L57 61" fill="none" stroke="'+stroke+'" stroke-width="2" opacity=".9"/>';
}
function raceFeatureMarkup(a,race){
  var f=Number(a?.feature)||0;
  if(race==='Veyren'){
    var lift=18-f*1.5;
    return '<path d="M37 30 Q50 '+lift+' 63 30" fill="none" stroke="#a876d8" stroke-width="2" opacity=".72"/><path d="M42 27 L50 '+(lift-1)+' L58 27 M46 22 L50 '+(lift-4)+' L54 22" fill="none" stroke="#c69aeb" stroke-width="1.25" opacity=".7"/><circle cx="50" cy="'+(lift-4)+'" r="1.7" fill="#d4b4f2" opacity=".78"/>';
  }
  if(race==='Stoneborn'){
    var y=30+(f%3)*2;
    return '<path d="M29 '+y+' L38 '+(y-7)+' L47 '+y+' L56 '+(y-8)+' L66 '+y+' L72 '+(y-5)+'" fill="none" stroke="#eee5dd" stroke-width="'+(2.8+(f%2)*.5)+'" opacity=".62"/><path d="M28 52 L22 61 L32 68 M72 52 L78 61 L68 68" fill="none" stroke="#e8ded6" stroke-width="2" opacity=".46"/><path d="M35 27 L39 20 L44 28 M57 27 L62 20 L66 29" fill="#7c6e68" stroke="#cfc1b8" stroke-width="1.3" opacity=".72"/>';
  }
  if(race==='Thornkin'){
    var thorn=f%4;
    if(thorn===0)return '<path d="M36 35 Q27 23 20 22 Q24 31 29 43 M64 35 Q73 23 80 22 Q76 31 71 43" fill="none" stroke="#617d4b" stroke-width="5" stroke-linecap="round"/><path d="M20 23 l-8 -5 l3 10 M80 23 l8 -5 l-3 10" fill="#8fac6a"/><path d="M29 30 l-6 -8 M71 30 l6 -8" stroke="#75975a" stroke-width="3"/>';
    if(thorn===1)return '<path d="M35 35 Q24 27 23 13 M65 35 Q76 27 77 13" fill="none" stroke="#617d4b" stroke-width="5" stroke-linecap="round"/><circle cx="22" cy="13" r="5.5" fill="#88ad69"/><circle cx="78" cy="13" r="5.5" fill="#88ad69"/><path d="M21 13 l-8 -4 M79 13 l8 -4" stroke="#617d4b" stroke-width="2.5"/>';
    if(thorn===2)return '<path d="M35 35 L24 19 L28 8 M65 35 L76 19 L72 8" fill="none" stroke="#617d4b" stroke-width="5" stroke-linecap="round"/><path d="M27 14 l-9 -3 l5 9 M73 14 l9 -3 l-5 9" fill="#91b06f"/>';
    return '<path d="M34 35 Q21 27 17 14 M66 35 Q79 27 83 14" fill="none" stroke="#617d4b" stroke-width="5"/><path d="M21 23 l-10 -4 l6 10 M79 23 l10 -4 l-6 10" fill="#91b06f"/><circle cx="17" cy="14" r="3.4" fill="#b2c987"/><circle cx="83" cy="14" r="3.4" fill="#b2c987"/>';
  }
  if(race==='Emberkin'){
    var horn='#322024';
    if(f%4===0)return '<path d="M37 35 Q25 20 29 6 Q42 18 43 31 M63 35 Q75 20 71 6 Q58 18 57 31" fill="'+horn+'" stroke="#f0784e" stroke-width="2"/><path d="M30 10 L35 19 M70 10 L65 19" stroke="#ffae5e" stroke-width="1.4" opacity=".72"/>';
    if(f%4===1)return '<path d="M35 35 Q19 25 20 10 Q35 16 43 31 M65 35 Q81 25 80 10 Q65 16 57 31" fill="'+horn+'" stroke="#f0784e" stroke-width="2"/>';
    if(f%4===2)return '<path d="M38 32 L30 6 L45 29 M62 32 L70 6 L55 29" fill="'+horn+'" stroke="#f0784e" stroke-width="2"/><path d="M33 15 L37 24 M67 15 L63 24" stroke="#ffb060" stroke-width="1.5"/>';
    return '<path d="M35 34 Q24 24 28 12 L42 31 M65 34 Q76 24 72 12 L58 31" fill="'+horn+'" stroke="#f0784e" stroke-width="2"/><circle cx="29" cy="12" r="2.8" fill="#ff9c48"/><circle cx="71" cy="12" r="2.8" fill="#ff9c48"/>';
  }
  if(race==='Nymari'){
    var fin='#59bec9';
    if(f%4===0)return '<path d="M37 31 L29 9 L45 28 M63 31 L71 9 L55 28" fill="'+fin+'" stroke="#1e4d58" stroke-width="1.3" opacity=".9"/><path d="M31 14 L39 25 M69 14 L61 25" stroke="#b1ffff" stroke-width="1.3" opacity=".75"/>';
    if(f%4===1)return '<path d="M40 29 L42 5 L49 28 M60 29 L58 5 L51 28" fill="'+fin+'" stroke="#1e4d58" stroke-width="1.3" opacity=".9"/><path d="M44 9 L46 24 M56 9 L54 24" stroke="#b1ffff" stroke-width="1.2"/>';
    if(f%4===2)return '<path d="M35 33 L16 19 L41 29 M65 33 L84 19 L59 29" fill="'+fin+'" stroke="#1e4d58" stroke-width="1.3" opacity=".9"/><path d="M22 22 L37 29 M78 22 L63 29" stroke="#b1ffff" stroke-width="1.2"/>';
    return '<path d="M38 30 L31 7 L45 27 M62 30 L69 7 L55 27" fill="'+fin+'" stroke="#1e4d58" stroke-width="1.3" opacity=".92"/><circle cx="50" cy="22" r="3.2" fill="#a5fbff"/>';
  }
  if(race==='Aelari'){
    return '<path d="M40 30 Q50 '+(13-f*1.7)+' 60 30" fill="none" stroke="#dfc0ff" stroke-width="2" opacity=".78"/><path d="M45 26 L50 '+(18-f)+' L55 26" fill="none" stroke="#efdfff" stroke-width="1.2" opacity=".72"/><circle cx="50" cy="'+(21-f)+'" r="1.8" fill="#f1e5ff" opacity=".78"/>';
  }
  return '';
}
function svgFor(a,accent){
  var r=raceDef(a.race),skin=r.skin[a.skinTone],eye=r.eyes[a.eyes],hair=HAIR[a.hairColor];
  var uid='p'+hash(JSON.stringify(a)+'|'+accent).toString(36);
  var face=raceFacePath(a);
  var bg1='#111a22',bg2='#080c11';
  return '<svg viewBox="0 0 100 100" role="img" aria-hidden="true" focusable="false">'+
    '<defs><radialGradient id="'+uid+'g" cx="50%" cy="35%" r="70%"><stop offset="0%" stop-color="'+accent+'" stop-opacity=".22"/><stop offset="62%" stop-color="'+bg1+'"/><stop offset="100%" stop-color="'+bg2+'"/></radialGradient><clipPath id="'+uid+'c"><rect x="2" y="2" width="96" height="96" rx="18"/></clipPath></defs>'+
    '<g clip-path="url(#'+uid+'c)"><rect x="2" y="2" width="96" height="96" rx="18" fill="url(#'+uid+'g)"/>'+
    '<circle cx="50" cy="30" r="30" fill="'+accent+'" opacity=".035"/>'+
    '<path d="M17 101 Q22 78 40 75 L60 75 Q78 78 83 101Z" fill="#1a252e" stroke="'+accent+'" stroke-opacity=".25" stroke-width="2"/>'+
    raceFeatureMarkup(a,a.race)+earsMarkup(a.race,skin,a.feature)+
    '<path d="'+face+'" fill="'+skin+'" stroke="#182027" stroke-width="2.4"/>'+
    raceFaceDetails(a,eye)+hairMarkup(a,hair)+
    '<path d="M38 48 Q42 45 46 48 M54 48 Q58 45 62 48" fill="none" stroke="#242027" stroke-width="2" stroke-linecap="round"/>'+
    raceEyeMarkup(a,eye)+
    '<path d="M50 53 L47.5 63 Q50 65 53 63" fill="none" stroke="#5c423b" stroke-opacity=".55" stroke-width="1.4" stroke-linecap="round"/>'+
    '<path d="M43 69 Q50 72 57 69" fill="none" stroke="#5a3236" stroke-width="1.7" stroke-linecap="round"/>'+
    markingMarkup(a,a.race)+beardMarkup(a,hair)+
    (a.race==='Emberkin'?'<path d="M37 59 Q50 64 63 59" fill="none" stroke="#ff8a45" stroke-width="1" opacity=".28"/>':'')+
    (a.race==='Nymari'?'<circle cx="35" cy="58" r="1.3" fill="#8ffcff" opacity=".7"/><circle cx="65" cy="58" r="1.3" fill="#8ffcff" opacity=".7"/>':'')+
    '</g><rect x="2.5" y="2.5" width="95" height="95" rx="17.5" fill="none" stroke="'+accent+'" stroke-opacity=".55" stroke-width="2"/></svg>';
}
function portraitHTML(subject,opts){
  opts=opts||{};
  var c=subject||{};
  var race=c.race||(c.appearance&&c.appearance.race)||'Veyren';
  var a=normalizeAppearance(c.appearance||c,c.id||c.name||opts.seed||race,race);
  var accent=opts.accent||CLASS_COLORS[c.class]||'#76d7d0';
  var size=opts.size||'md';
  var cls='cb-portrait cb-portrait--'+esc(size)+(opts.className?' '+esc(opts.className):'');
  var label=opts.label||c.name||a.race+' adventurer';
  return '<span class="'+cls+'" style="--cbp-accent:'+accent+'" role="img" aria-label="'+esc(label)+'">'+svgFor(a,accent)+'</span>';
}
function optionText(field,value,race){
  if(field==='hair'&&value===0)return 'None';
  if(field==='facialHair'&&value===0)return 'None';
  if(field==='marking'&&value===0)return 'None';
  return String(value+1).padStart(2,'0')+' / '+String(COUNTS[field]).padStart(2,'0');
}
function editorHTML(appearance,opts){
  opts=opts||{};
  var a=normalizeAppearance(appearance,opts.seed,appearance?.race||opts.race);
  var fields=['skinTone','face','hair','hairColor','facialHair','marking','eyes','feature'];
  var rows=fields.map(function(field){
    var label=field==='feature'?(raceDef(a.race).featureLabel||'Race detail'):(LABELS[field]||field);
    return '<div class="cb-appearance-control"><span>'+esc(label)+'</span><div><button type="button" data-appearance-field="'+field+'" data-direction="-1" aria-label="Previous '+esc(label)+'">‹</button><b>'+esc(optionText(field,a[field],a.race))+'</b><button type="button" data-appearance-field="'+field+'" data-direction="1" aria-label="Next '+esc(label)+'">›</button></div></div>';
  }).join('');
  return '<div class="cb-appearance-editor" data-appearance-editor><div class="cb-appearance-preview">'+portraitHTML({race:a.race,appearance:a,class:opts.characterClass,name:opts.name||'Character'},{size:'hero',label:(opts.name||'Character')+' appearance preview'})+'<button type="button" data-appearance-randomize>RANDOMISE APPEARANCE</button></div><div class="cb-appearance-controls">'+rows+'</div></div>';
}
function bindEditor(container,appearance,onChange,opts){
  if(!container||!appearance)return;
  container.querySelectorAll('[data-appearance-field]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var field=btn.dataset.appearanceField,count=COUNTS[field]||1,dir=Number(btn.dataset.direction)||1;
      appearance[field]=(Number(appearance[field]||0)+dir+count)%count;
      if(typeof onChange==='function')onChange(appearance,field);
    });
  });
  var random=container.querySelector('[data-appearance-randomize]');
  if(random)random.addEventListener('click',function(){
    Object.assign(appearance,randomAppearance(appearance.race));
    if(typeof onChange==='function')onChange(appearance,'random');
  });
}


/* Full-character equipment viewer V2.
   Every equipped item gets a deterministic visual identity derived from the item itself.
   Weapon/off-hand silhouettes follow actual item type, while sets receive bespoke prestige treatment. */
const PAPER_VISIBLE_SLOTS=['Head','Shoulders','Chest','Hands','Waist','Legs','Feet','Weapon','OffHand','Ring1','Ring2','Trinket1','Trinket2','Relic'];

const CLASS_GEAR_STYLE={
  Warrior:{motif:'chevron',family:'plate',shape:'fortress'},
  Paladin:{motif:'sun',family:'plate',shape:'vigil'},
  Priest:{motif:'halo',family:'cloth',shape:'saint'},
  Druid:{motif:'leaf',family:'leather',shape:'wild'},
  Hunter:{motif:'arrow',family:'leather',shape:'hunt'},
  Rogue:{motif:'fang',family:'leather',shape:'shade'},
  Mage:{motif:'star',family:'cloth',shape:'arcane'},
  Shaman:{motif:'storm',family:'mail',shape:'totem'},
  Warlock:{motif:'eye',family:'cloth',shape:'occult'},
  Monk:{motif:'chi',family:'leather',shape:'martial'},
  'Death Knight':{motif:'rune',family:'plate',shape:'grave'},
  'Demon Hunter':{motif:'glaive',family:'leather',shape:'fel'},
  Evoker:{motif:'scale',family:'mail',shape:'dragon'}
};

// Sets own their palette. Class colour is deliberately kept as a small accent.
// T4 and T5 therefore feel like named fantasy sets, not class-colour uniforms.
const SET_VISUALS={
  'warrior-t4':{primary:'#5d6267',secondary:'#292628',trim:'#b28d59',glow:'#d7a16c',motif:'chevron'},
  'warrior-t5':{primary:'#30343a',secondary:'#181b20',trim:'#b9975d',glow:'#d46c49',motif:'chevron'},
  'paladin-t4':{primary:'#d4c9ad',secondary:'#2d3b50',trim:'#d4ae58',glow:'#ffe09a',motif:'sun'},
  'paladin-t5':{primary:'#3a495b',secondary:'#171e27',trim:'#d0aa58',glow:'#f2d99d',motif:'sun'},
  'priest-t4':{primary:'#d6dfdc',secondary:'#566370',trim:'#c9ba8c',glow:'#f5ffff',motif:'halo'},
  'priest-t5':{primary:'#77747e',secondary:'#25262c',trim:'#b9b1a0',glow:'#e6e8f5',motif:'halo'},
  'druid-t4':{primary:'#6c533d',secondary:'#304436',trim:'#aab9a4',glow:'#8fc58a',motif:'leaf'},
  'druid-t5':{primary:'#304345',secondary:'#302a39',trim:'#82946b',glow:'#86d5ad',motif:'leaf'},
  'hunter-t4':{primary:'#666c49',secondary:'#342e27',trim:'#ab8d58',glow:'#c3d18a',motif:'arrow'},
  'hunter-t5':{primary:'#313b35',secondary:'#171d1a',trim:'#858e84',glow:'#91b56f',motif:'arrow'},
  'rogue-t4':{primary:'#3c3d45',secondary:'#24222c',trim:'#8f9199',glow:'#c0b76d',motif:'fang'},
  'rogue-t5':{primary:'#24282d',secondary:'#15181d',trim:'#70747a',glow:'#d5c76f',motif:'fang'},
  'mage-t4':{primary:'#3d3d67',secondary:'#202539',trim:'#aaa5bd',glow:'#75d2e7',motif:'star'},
  'mage-t5':{primary:'#283748',secondary:'#292335',trim:'#b79b63',glow:'#69c9e2',motif:'star'},
  'shaman-t4':{primary:'#4b5d63',secondary:'#27343a',trim:'#b7a477',glow:'#6dcbdc',motif:'storm'},
  'shaman-t5':{primary:'#313b41',secondary:'#252b2e',trim:'#a97250',glow:'#66bdf0',motif:'storm'},
  'warlock-t4':{primary:'#4a3f50',secondary:'#201d25',trim:'#9d825b',glow:'#99cf71',motif:'eye'},
  'warlock-t5':{primary:'#272632',secondary:'#2b1f28',trim:'#a38c59',glow:'#8fc76c',motif:'eye'},
  'monk-t4':{primary:'#b9ad8c',secondary:'#2e4d47',trim:'#b37b51',glow:'#66d5a8',motif:'chi'},
  'monk-t5':{primary:'#35394b',secondary:'#1f2c2e',trim:'#c2bba4',glow:'#75dfb8',motif:'chi'},
  'death-knight-t4':{primary:'#393d44',secondary:'#1b1e22',trim:'#9199a1',glow:'#77bad8',motif:'rune'},
  'death-knight-t5':{primary:'#2a2e34',secondary:'#191b1f',trim:'#a0a8af',glow:'#72d0e8',motif:'rune'},
  'demon-hunter-t4':{primary:'#303335',secondary:'#1c2c2b',trim:'#698b68',glow:'#73d66a',motif:'glaive'},
  'demon-hunter-t5':{primary:'#22262b',secondary:'#183039',trim:'#8a6e51',glow:'#79e26c',motif:'glaive'},
  'evoker-t4':{primary:'#8a6849',secondary:'#28464a',trim:'#c2b696',glow:'#68d4ca',motif:'scale'},
  'evoker-t5':{primary:'#37474b',secondary:'#342b32',trim:'#b6a05f',glow:'#7bdccc',motif:'scale'}
};

const MATERIAL_VISUALS=[
  {primary:'#59636a',secondary:'#252d32',trim:'#9b835e',glow:'#90aab2'},
  {primary:'#6e5948',secondary:'#2f2924',trim:'#b48e58',glow:'#b9a17c'},
  {primary:'#4f6159',secondary:'#26312d',trim:'#8d9d7a',glow:'#8db79e'},
  {primary:'#5d5666',secondary:'#29262f',trim:'#9d8fa6',glow:'#aa9fba'},
  {primary:'#66614f',secondary:'#302e27',trim:'#b1a173',glow:'#c2b585'},
  {primary:'#4d5c68',secondary:'#242b31',trim:'#8ea2ae',glow:'#8db9cf'}
];

const CLASS_WEAPON_DEFAULT={
  Warrior:'sword',Paladin:'hammer',Priest:'staff',Druid:'staff',
  Hunter:'bow',Rogue:'dagger',Mage:'staff',Shaman:'mace',Warlock:'staff',Monk:'staff','Death Knight':'greatsword','Demon Hunter':'sword',Evoker:'staff'
};
const CLASS_OFFHAND_DEFAULT={
  Warrior:'shield',Paladin:'shield',Priest:'tome',Druid:'idol',
  Hunter:'quiver',Rogue:'dagger',Mage:'focus',Shaman:'idol',Warlock:'tome',Monk:'focus','Death Knight':'focus','Demon Hunter':'dagger',Evoker:'focus'
};

function clampTier(v){
  var n=Math.round(Number(v)||0);
  return Math.max(0,Math.min(5,n));
}
function hexRgb(hex){
  var s=String(hex||'#76d7d0').replace('#','');
  if(s.length===3)s=s.split('').map(function(x){return x+x}).join('');
  var n=parseInt(s,16);
  if(!Number.isFinite(n))return[118,215,208];
  return[(n>>16)&255,(n>>8)&255,n&255];
}
function rgbHex(rgb){
  return '#'+rgb.map(function(v){return Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')}).join('');
}
function mixHex(a,b,t){
  var aa=hexRgb(a),bb=hexRgb(b),p=Math.max(0,Math.min(1,Number(t)||0));
  return rgbHex(aa.map(function(v,i){return v+(bb[i]-v)*p}));
}
function itemForSlot(c,slot){
  var item=c&&c.equipment&&c.equipment[slot];
  if(!item&&slot==='Weapon')item=c&&c.equipment&&c.equipment.MainHand;
  return item&&typeof item==='object'?item:null;
}
function paperClass(c){return c&&c.class||'Warrior'}
function paperAccent(c){return CLASS_COLORS[paperClass(c)]||'#76d7d0'}
function gearClass(item){
  if(!item||typeof item!=='object')return'';
  if(item.class)return String(item.class);
  if(Array.isArray(item.classes)&&item.classes.length===1)return String(item.classes[0]);
  return'';
}
function gearAccent(item){
  var klass=gearClass(item);
  return CLASS_COLORS[klass]||'#7c8d8a';
}
function itemIdentity(item,slot){
  if(!item)return'empty-'+String(slot||'slot');
  return String(item.appearanceId||item.visualStyle||item.baseItemId||item.itemId||item.name||slot||'gear').toLowerCase();
}
function visualVariant(item,slot,count){
  return hash(itemIdentity(item,slot)+'|'+slot)%Math.max(1,count||5);
}
function setGroupId(c,item){
  if(!item)return null;
  if(item.setId)return String(item.setId);
  if(item.setName)return String(item.setName).toLowerCase().replace(/[^a-z0-9]+/g,'-');
  if(item.visualSet)return String(item.visualSet);
  var id=String(item.baseItemId||item.itemId||'').toLowerCase();
  var match=id.match(/(?:^|-)t([45])(?:-|$)/);
  if(match)return String(gearClass(item)||'gear').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-t'+match[1];
  if(Number(item.tier)>=5)return String(gearClass(item)||'gear').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-t5';
  return null;
}
function isSetItem(item,c){
  return Boolean(setGroupId(c,item));
}
function setVisual(c,item){
  var id=setGroupId(c,item);
  if(!id)return null;
  var base=SET_VISUALS[id];
  if(!base){
    var material=MATERIAL_VISUALS[hash(id)%MATERIAL_VISUALS.length];
    base={primary:material.primary,secondary:material.secondary,trim:material.trim,glow:material.glow,motif:(CLASS_GEAR_STYLE[gearClass(item)]||{}).motif||'chevron'};
  }
  return {...base,id:id,classAccent:gearAccent(item)};
}
function gearPalette(c,item,tier,slot){
  var classAccent=gearAccent(item),t=Math.max(1,tier||1),set=setVisual(c,item),variant=visualVariant(item,slot,6);
  if(set)return{
    accent:classAccent,
    base:set.primary,
    dark:set.secondary,
    light:mixHex(set.primary,'#ffffff',.24),
    trim:set.trim,
    glow:mixHex(set.glow,classAccent,.16),
    set:set,
    variant:variant,
    paletteMode:'set-first'
  };
  var material=MATERIAL_VISUALS[variant%MATERIAL_VISUALS.length];
  var lift=Math.max(0,Math.min(.18,(t-1)*.035));
  return {
    accent:classAccent,
    base:lift?mixHex(material.primary,'#ffffff',lift):material.primary,
    dark:material.secondary,
    light:mixHex(material.primary,'#ffffff',.24+t*.025),
    trim:mixHex(material.trim,classAccent,.14),
    glow:mixHex(material.glow,classAccent,t>=4?.24:.10),
    set:null,
    variant:variant,
    paletteMode:'material-first'
  };
}

function bodyProfile(race,appearance){
  if(RIG?.bodyProfile)return RIG.bodyProfile({race:race||appearance?.race||'Veyren',appearance:appearance||{}});
  var base=({
    Stoneborn:{shoulder:64,waist:40,hip:44,leg:21,arm:19.5,neck:23,headScale:1.10,hand:1.25},
    Aelari:{shoulder:37,waist:21,hip:27,leg:10.5,arm:8.8,neck:9.5,headScale:.94,hand:.86},
    Thornkin:{shoulder:53,waist:30,hip:35,leg:16.5,arm:14.8,neck:15.5,headScale:1.03,hand:1.04},
    Emberkin:{shoulder:55,waist:29,hip:32,leg:15.2,arm:14.7,neck:15.5,headScale:1.04,hand:1.06},
    Nymari:{shoulder:43,waist:27,hip:34,leg:14,arm:11.5,neck:12.5,headScale:1.01,hand:.96},
    Veyren:{shoulder:45,waist:25.5,hip:30,leg:12.8,arm:11.1,neck:12.5,headScale:.98,hand:.95}
  })[race]||{shoulder:46,waist:28,hip:32,leg:14,arm:12,neck:14,headScale:1,hand:1};
  var p={...base};
  if(Number(appearance?.gender)===1){p.shoulder*=.95;p.waist*=.94;p.hip*=1.04;p.arm*=.94;p.hand*=.96;p.neck*=.94}
  return p;
}
function paperFit(c){
  if(RIG?.gearFitProfile)return RIG.gearFitProfile(c||{});
  var race=c?.race||c?.appearance?.race||'Veyren',p=bodyProfile(race,c?.appearance),reach=Math.max(5.2,p.arm*.46);
  var leftShoulder=120-p.shoulder,rightShoulder=120+p.shoulder,leftHand=leftShoulder-reach,baseRightHand=rightShoulder+reach;
  var weapon=itemForSlot(c,'Weapon'),type=weapon?weaponType(weapon,c):'',long=['staff','spear','bow','crossbow'].includes(type),compact=['dagger','wand','focus','scepter','rod'].includes(type);
  var sideMin=Math.min(196,rightShoulder+Math.max(10,p.arm*.55)),natural=baseRightHand+(long?7:compact?4:6);
  var rightHand=weapon?Math.max(sideMin,Math.min(198,natural)):baseRightHand,angle=weapon?(type==='bow'?4:type==='crossbow'?6:type==='staff'||type==='spear'?3:type==='dagger'?9:6):0;
  var legOffset=p.hip*.38;
  return {race,gender:Number(c?.appearance?.gender)||0,frame:Number(c?.appearance?.frame)||1,p,centerX:120,
    leftShoulder,rightShoulder,leftPad:120-p.shoulder*.82,rightPad:120+p.shoulder*.82,leftHand,rightHand,baseRightHand,handY:279,
    waistY:247,waistHalf:Math.max(p.waist*1.02,p.hip*.64),hipHalf:p.hip,
    leftLeg:120-legOffset,rightLeg:120+legOffset,legHalf:Math.max(8.5,p.leg*.62),calfHalf:Math.max(7.4,p.leg*.52),footHalf:Math.max(8.6,p.leg*.66),
    weaponX:rightHand,weaponY:279,weaponAngle:angle,weaponPose:weapon?'side-held':'rest',weaponKind:type||'none',weaponSideMin:sideMin,
    offhandX:leftHand,offhandY:279};
}
function fitFamily(klass){
  return String(klass||'Warrior').toLowerCase().replace(/\s+/g,'-');
}
function clothLowerStyle(item){
  var k=gearClass(item),tier=Math.max(1,clampTier(item&&item.tier)||1);
  if(k==='Mage')return ({1:'trousers',2:'split-robe',3:'trousers',4:'robe',5:'split-robe'})[tier];
  if(k==='Priest')return ({1:'trousers',2:'robe',3:'split-robe',4:'robe',5:'robe'})[tier];
  if(k==='Warlock')return ({1:'trousers',2:'split-robe',3:'robe',4:'asym-robe',5:'split-robe'})[tier];
  if(k==='Druid')return ({1:'trousers',2:'kilt',3:'trousers',4:'kilt',5:'split-robe'})[tier];
  return 'trousers';
}
function lowerSilhouetteMarkup(item,pal,p,style){
  var hip=Math.max(25,p.hip*.86||28),left=120-hip,right=120+hip;
  if(style==='robe'){
    return '<path d="M'+left+' 244 Q120 252 '+right+' 244 L'+(120+hip*.78)+' 352 Q120 360 '+(120-hip*.78)+' 352Z" fill="'+pal.base+'" stroke="#111820" stroke-width="3"/><path d="M'+(120-hip*.66)+' 279 Q120 289 '+(120+hip*.66)+' 279 M'+(120-hip*.62)+' 326 Q120 335 '+(120+hip*.62)+' 326" fill="none" stroke="'+pal.trim+'" stroke-width="2" opacity=".72"/>';
  }
  if(style==='split-robe'){
    return '<path d="M'+left+' 244 Q'+(120-hip*.12)+' 252 '+(120-4)+' 257 L'+(120-8)+' 349 L'+(120-hip*.78)+' 352Z" fill="'+pal.base+'" stroke="#111820" stroke-width="3"/><path d="M'+right+' 244 Q'+(120+hip*.12)+' 252 '+(120+4)+' 257 L'+(120+8)+' 349 L'+(120+hip*.78)+' 352Z" fill="'+pal.base+'" stroke="#111820" stroke-width="3"/><path d="M'+(120-hip*.72)+' 282 L'+(120-10)+' 291 M'+(120+hip*.72)+' 282 L'+(120+10)+' 291" stroke="'+pal.trim+'" stroke-width="2"/>';
  }
  if(style==='asym-robe'){
    return '<path d="M'+left+' 244 Q120 252 '+right+' 244 L'+(120+hip*.62)+' 337 L'+(120+10)+' 350 L'+(120-4)+' 302 L'+(120-hip*.76)+' 347Z" fill="'+pal.base+'" stroke="#111820" stroke-width="3"/><path d="M'+(120-hip*.72)+' 281 Q120 291 '+(120+hip*.68)+' 279" fill="none" stroke="'+pal.trim+'" stroke-width="2.2"/>';
  }
  if(style==='kilt'){
    return '<path d="M'+left+' 244 Q120 252 '+right+' 244 L'+(120+hip*.78)+' 318 Q120 326 '+(120-hip*.78)+' 318Z" fill="'+pal.base+'" stroke="#111820" stroke-width="3"/><path d="M'+(120-hip*.54)+' 260 V311 M120 258 V317 M'+(120+hip*.54)+' 260 V311" stroke="'+pal.trim+'" stroke-width="1.7" opacity=".62"/>';
  }
  return '';
}
function paperRaceArmDetails(c,p,leftX,rightX){
  var race=c.race||c.appearance?.race||'Veyren';
  if(race==='Veyren')return '<g class="cb-paper-race-detail cb-paper-race-veyren"><path d="M'+(leftX-8)+' 174 L'+(leftX-14)+' 186 L'+(leftX-8)+' 198 L'+(leftX-14)+' 210 M'+(rightX+8)+' 174 L'+(rightX+14)+' 186 L'+(rightX+8)+' 198 L'+(rightX+14)+' 210" fill="none" stroke="#9d70cc" stroke-width="1.9" opacity=".72"/><path d="M'+(leftX-14)+' 219 Q'+leftX+' 225 '+(leftX-8)+' 235 M'+(rightX+14)+' 219 Q'+rightX+' 225 '+(rightX+8)+' 235" fill="none" stroke="#c09be5" stroke-width="1.4" opacity=".62"/><circle cx="'+(leftX-12)+'" cy="211" r="2.2" fill="#c7a4e7" opacity=".64"/><circle cx="'+(rightX+12)+'" cy="211" r="2.2" fill="#c7a4e7" opacity=".64"/></g>';
  if(race==='Stoneborn')return '<g class="cb-paper-race-detail cb-paper-race-stoneborn"><path d="M'+(leftX-19)+' 168 L'+(leftX-5)+' 163 L'+(leftX-9)+' 188 L'+(leftX-22)+' 204 L'+(leftX-17)+' 218 L'+(leftX-8)+' 209Z M'+(rightX+19)+' 168 L'+(rightX+5)+' 163 L'+(rightX+9)+' 188 L'+(rightX+22)+' 204 L'+(rightX+17)+' 218 L'+(rightX+8)+' 209Z" fill="#b9aaa1" stroke="#4d4542" stroke-width="2.4" opacity=".85"/><path d="M'+(leftX-20)+' 224 L'+(leftX-10)+' 218 L'+(leftX-14)+' 242 M'+(rightX+20)+' 224 L'+(rightX+10)+' 218 L'+(rightX+14)+' 242" fill="none" stroke="#eee3dc" stroke-width="2.4" opacity=".5"/><path d="M'+(leftX-15)+' 177 L'+(leftX-7)+' 182 M'+(rightX+15)+' 177 L'+(rightX+7)+' 182" stroke="#756963" stroke-width="2.2"/></g>';
  if(race==='Thornkin')return '<g class="cb-paper-race-detail cb-paper-race-thornkin"><path d="M'+(leftX-10)+' 165 Q'+(leftX-25)+' 187 '+(leftX-14)+' 212 T'+(leftX-14)+' 248 M'+(rightX+10)+' 165 Q'+(rightX+25)+' 187 '+(rightX+14)+' 212 T'+(rightX+14)+' 248" fill="none" stroke="#5e7c48" stroke-width="3.6" opacity=".88"/><path d="M'+(leftX-18)+' 184 l-9 -7 l3 13 M'+(rightX+18)+' 184 l9 -7 l-3 13 M'+(leftX-17)+' 220 l-9 4 l10 3 M'+(rightX+17)+' 220 l9 4 l-10 3" fill="#8cab69" opacity=".95"/><path d="M'+(leftX-12)+' 237 q-9 4 -10 11 M'+(rightX+12)+' 237 q9 4 10 11" fill="none" stroke="#78975c" stroke-width="2.2"/></g>';
  if(race==='Emberkin')return '<g class="cb-paper-race-detail cb-paper-race-emberkin"><path d="M'+(leftX-9)+' 168 l-8 19 l9 13 l-10 20 l8 18 M'+(rightX+9)+' 168 l8 19 l-9 13 l10 20 l-8 18" fill="none" stroke="#ff7840" stroke-width="2.5" opacity=".94"/><path d="M'+(leftX-15)+' 188 l-10 -7 l5 14 M'+(rightX+15)+' 188 l10 -7 l-5 14" fill="#402126" stroke="#d95e3f" stroke-width="1.4"/><circle cx="'+(leftX-15)+'" cy="220" r="3.2" fill="#ffad58" opacity=".78"/><circle cx="'+(rightX+15)+'" cy="220" r="3.2" fill="#ffad58" opacity=".78"/></g>';
  if(race==='Nymari')return '<g class="cb-paper-race-detail cb-paper-race-nymari"><path d="M'+(leftX-10)+' 190 Q'+(leftX-34)+' 207 '+(leftX-19)+' 239 L'+(leftX-7)+' 218Z M'+(rightX+10)+' 190 Q'+(rightX+34)+' 207 '+(rightX+19)+' 239 L'+(rightX+7)+' 218Z" fill="#56b7c2" stroke="#9ef7f6" stroke-width="1.6" opacity=".78"/><path d="M'+(leftX-16)+' 202 L'+(leftX-28)+' 219 M'+(rightX+16)+' 202 L'+(rightX+28)+' 219" stroke="#d0ffff" stroke-width="1.35" opacity=".82"/><path d="M'+(leftX-10)+' 238 q-8 5 -10 12 M'+(rightX+10)+' 238 q8 5 10 12" fill="none" stroke="#6dd7dc" stroke-width="2"/></g>';
  if(race==='Aelari')return '<g class="cb-paper-race-detail cb-paper-race-aelari"><path d="M'+(leftX-4)+' 170 Q'+(leftX-10)+' 205 '+(leftX-6)+' 242 M'+(rightX+4)+' 170 Q'+(rightX+10)+' 205 '+(rightX+6)+' 242" fill="none" stroke="#e5cdfa" stroke-width="1.7" opacity=".46"/><path d="M'+(leftX-7)+' 190 Q'+leftX+' 198 '+(leftX-7)+' 206 M'+(rightX+7)+' 190 Q'+rightX+' 198 '+(rightX+7)+' 206" fill="none" stroke="#f0ddff" stroke-width="1.2" opacity=".55"/><circle cx="'+(leftX-6)+'" cy="216" r="1.8" fill="#ead7ff" opacity=".58"/><circle cx="'+(rightX+6)+'" cy="216" r="1.8" fill="#ead7ff" opacity=".58"/></g>';
  return '';
}
function paperRaceTorsoDetails(c,p){
  var race=c.race||c.appearance?.race||'Veyren';
  if(race==='Veyren')return '<path d="M102 153 L111 166 L106 181 L114 192 M138 153 L129 166 L134 181 L126 192" fill="none" stroke="#9364c0" stroke-width="2" opacity=".62"/><path d="M111 204 L120 194 L129 204 L120 216Z" fill="none" stroke="#b88adb" stroke-width="1.8" opacity=".72"/><path d="M102 221 Q120 231 138 221" fill="none" stroke="#8059a7" stroke-width="1.4" opacity=".46"/>';
  if(race==='Stoneborn')return '<path d="M80 158 L101 147 L120 155 L140 145 L160 158 M86 190 L105 181 L120 192 L136 180 L154 190 M92 218 L107 211 L120 222 L134 210 L148 218" fill="none" stroke="#ece1da" stroke-width="2.6" opacity=".42"/><path d="M101 151 L95 174 L108 183 M139 149 L145 173 L132 182" fill="none" stroke="#6d625d" stroke-width="2.3" opacity=".68"/>';
  if(race==='Thornkin')return '<path d="M98 148 Q112 168 105 193 Q101 215 112 238 M142 148 Q128 168 135 193 Q139 215 128 238" fill="none" stroke="#587342" stroke-width="3" opacity=".82"/><path d="M106 178 l-10 -5 l6 11 M135 201 l10 -5 l-6 11 M113 225 l-8 5 l9 2" fill="#8ca96b" opacity=".9"/><path d="M120 151 Q112 179 120 206 Q128 179 120 151" fill="none" stroke="#6d8b52" stroke-width="2.1" opacity=".62"/>';
  if(race==='Emberkin')return '<path d="M99 148 L108 168 L103 184 L115 199 L109 224 M141 148 L132 168 L137 184 L125 199 L131 224 M120 152 L116 172 L121 185 L117 207 L122 229" fill="none" stroke="#ff743c" stroke-width="2.4" opacity=".88"/><circle cx="115" cy="199" r="2.8" fill="#ffb35f" opacity=".78"/><circle cx="125" cy="199" r="2.8" fill="#ffb35f" opacity=".78"/><circle cx="121" cy="185" r="2.3" fill="#ffd17b" opacity=".72"/>';
  if(race==='Nymari')return '<path d="M99 160 Q120 146 141 160 M96 176 Q120 160 144 176 M101 195 Q120 207 139 195 M103 217 Q120 228 137 217" fill="none" stroke="#70d2d7" stroke-width="1.8" opacity=".62"/><path d="M96 183 l-8 4 M144 183 l8 4" stroke="#a7ffff" stroke-width="1.5" opacity=".72"/>';
  if(race==='Aelari')return '<path d="M108 151 Q120 162 132 151 M112 177 L120 188 L128 177 M114 210 Q120 216 126 210" fill="none" stroke="#dfc2f8" stroke-width="1.6" opacity=".52"/><path d="M120 154 V226" stroke="#f0dcff" stroke-width="1" opacity=".22"/>';
  return '';
}
function paperRaceLegDetails(c){
  var race=c.race||c.appearance?.race||'Veyren';
  if(race==='Stoneborn')return '<path d="M88 286 L102 278 L113 292 M127 292 L138 278 L152 286 M84 322 L100 314 L111 327 M129 327 L140 314 L156 322" fill="none" stroke="#e8ddd5" stroke-width="2.3" opacity=".44"/><path d="M90 300 L99 306 M150 300 L141 306" stroke="#6c625e" stroke-width="2"/>';
  if(race==='Thornkin')return '<path d="M94 273 Q84 302 93 340 M146 273 Q156 302 147 340" fill="none" stroke="#5e7c48" stroke-width="3" opacity=".78"/><path d="M90 299 l-9 -5 l5 10 M150 313 l9 -5 l-5 10 M93 332 l-7 5 l8 1" fill="#8aa969" opacity=".9"/>';
  if(race==='Emberkin')return '<path d="M95 277 L88 298 L97 315 L89 340 M145 277 L152 298 L143 315 L151 340" fill="none" stroke="#ff7540" stroke-width="2.4" opacity=".84"/><path d="M90 303 l-7 -5 l3 10 M150 303 l7 -5 l-3 10" fill="#472229" stroke="#d95d3c" stroke-width="1.2"/>';
  if(race==='Nymari')return '<path d="M91 296 Q78 313 89 337 L96 320Z M149 296 Q162 313 151 337 L144 320Z" fill="#54b6c1" stroke="#9df3f4" stroke-width="1.4" opacity=".7"/><path d="M89 314 L82 324 M151 314 L158 324" stroke="#c4ffff" stroke-width="1.2"/>';
  if(race==='Aelari')return '<path d="M100 277 L97 339 M140 277 L143 339" stroke="#dec2f6" stroke-width="1.4" opacity=".34"/><circle cx="97" cy="311" r="1.6" fill="#ead8ff" opacity=".48"/><circle cx="143" cy="311" r="1.6" fill="#ead8ff" opacity=".48"/>';
  if(race==='Veyren')return '<path d="M97 287 L91 297 L97 308 L92 320 M143 287 L149 297 L143 308 L148 320" fill="none" stroke="#9364bd" stroke-width="1.8" opacity=".54"/><circle cx="93" cy="320" r="1.8" fill="#b98cdd" opacity=".55"/><circle cx="147" cy="320" r="1.8" fill="#b98cdd" opacity=".55"/>';
  return '';
}
function paperRaceFootDetails(c){
  var race=c.race||c.appearance?.race||'Veyren';
  if(race==='Stoneborn')return '<path d="M76 375 L87 365 L108 366 M164 375 L153 365 L132 366" fill="none" stroke="#d9cec7" stroke-width="2.4" opacity=".46"/><path d="M78 383 L70 389 M162 383 L170 389" stroke="#766a65" stroke-width="3" stroke-linecap="round"/>';
  if(race==='Thornkin')return '<path d="M83 375 Q72 384 66 390 M91 378 Q82 390 78 394 M157 375 Q168 384 174 390 M149 378 Q158 390 162 394" fill="none" stroke="#607c4a" stroke-width="3" stroke-linecap="round"/><path d="M74 384 l-8 -2 l4 7 M166 384 l8 -2 l-4 7" fill="#8fa96d"/>';
  if(race==='Emberkin')return '<path d="M81 378 L69 386 L79 389 M159 378 L171 386 L161 389" fill="#3e2228" stroke="#d85d3d" stroke-width="1.5"/><circle cx="82" cy="382" r="2.2" fill="#ff9d4d"/><circle cx="158" cy="382" r="2.2" fill="#ff9d4d"/>';
  if(race==='Nymari')return '<path d="M83 364 Q68 375 72 390 L91 377Z M157 364 Q172 375 168 390 L149 377Z" fill="#56b7c2" stroke="#9cf5f4" stroke-width="1.4" opacity=".68"/><path d="M78 373 L71 381 M162 373 L169 381" stroke="#c8ffff" stroke-width="1.2"/>';
  if(race==='Aelari')return '<path d="M82 383 Q95 388 109 383 M131 383 Q145 388 158 383" fill="none" stroke="#e3caf8" stroke-width="1.3" opacity=".4"/>';
  if(race==='Veyren')return '<path d="M81 378 L87 371 L93 378 M159 378 L153 371 L147 378" fill="none" stroke="#9c70c5" stroke-width="1.6" opacity=".52"/>';
  return '';
}
function paperRaceNeck(c,p,skin){
  var race=c.race||c.appearance?.race||'Veyren',nw=p.neck||14;
  // The head now sits into the neck rather than floating above a long column.
  // Keep race-specific thickness, but constrain the visible vertical length.
  var top=race==='Stoneborn'?111:112,bottom=race==='Stoneborn'?138:race==='Aelari'?136:137,shoulderJoin=bottom+2;
  var base='<g class="cb-paper-neck" data-neck-top="'+top+'" data-neck-bottom="'+bottom+'"><path d="M'+(120-nw/2)+' '+top+' L'+(120-nw/2)+' '+bottom+' Q120 '+shoulderJoin+' '+(120+nw/2)+' '+bottom+' L'+(120+nw/2)+' '+top+'Z" fill="'+skin+'" stroke="#182027" stroke-width="2.5"/>';
  var detail='';
  if(race==='Stoneborn')detail='<path d="M'+(120-nw/2+2)+' 120 L120 126 L'+(120+nw/2-2)+' 119 M'+(120-nw/2+3)+' 133 L120 129 L'+(120+nw/2-3)+' 134" fill="none" stroke="#e3d8d0" stroke-width="1.8" opacity=".4"/>';
  else if(race==='Thornkin')detail='<path d="M116 115 Q122 122 117 135 M124 115 Q118 123 123 135" fill="none" stroke="#5d7848" stroke-width="1.9" opacity=".72"/>';
  else if(race==='Emberkin')detail='<path d="M116 114 L121 121 L117 129 L122 136" fill="none" stroke="#ff7740" stroke-width="1.8" opacity=".78"/>';
  else if(race==='Nymari')detail='<path d="M'+(120-nw/2+1)+' 119 l-5 3 M'+(120-nw/2+1)+' 125 l-5 3 M'+(120+nw/2-1)+' 119 l5 3 M'+(120+nw/2-1)+' 125 l5 3" stroke="#96eff0" stroke-width="1.5" opacity=".72"/>';
  else if(race==='Veyren')detail='<path d="M116 119 L120 115 L124 119 L120 125Z" fill="none" stroke="#aa7bd0" stroke-width="1.4" opacity=".6"/>';
  else if(race==='Aelari')detail='<path d="M120 116 V134" stroke="#e3c9f8" stroke-width="1.2" opacity=".35"/>';
  return base+detail+'</g>';
}
function paperRaceSilhouette(c,p,skin){
  var race=c.race||c.appearance?.race||'Veyren';
  if(race==='Stoneborn')return '<g class="cb-paper-race-silhouette cb-paper-race-stoneborn"><path d="M'+(120-p.shoulder-4)+' 149 L'+(120-p.shoulder-16)+' 135 L'+(120-p.shoulder-23)+' 151 L'+(120-p.shoulder-13)+' 161 M'+(120+p.shoulder+4)+' 149 L'+(120+p.shoulder+16)+' 135 L'+(120+p.shoulder+23)+' 151 L'+(120+p.shoulder+13)+' 161" fill="#9b8a82" stroke="#4b4340" stroke-width="3" stroke-linejoin="round"/><path d="M'+(120-p.shoulder-18)+' 145 l-8 -5 M'+(120+p.shoulder+18)+' 145 l8 -5" stroke="#d7c9c0" stroke-width="2" opacity=".55"/></g>';
  if(race==='Thornkin')return '<g class="cb-paper-race-silhouette cb-paper-race-thornkin"><path d="M'+(120-p.shoulder)+' 166 L'+(120-p.shoulder-15)+' 150 L'+(120-p.shoulder-21)+' 136 M'+(120+p.shoulder)+' 166 L'+(120+p.shoulder+12)+' 151 L'+(120+p.shoulder+19)+' 142" stroke="#607f49" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M'+(120-p.shoulder-18)+' 141 l-9 -4 l5 9 M'+(120+p.shoulder+15)+' 146 l8 -7 l-2 10" fill="#91b06e"/><circle cx="'+(120-p.shoulder-22)+'" cy="136" r="3.5" fill="#a8c681"/></g>';
  if(race==='Emberkin')return '<g class="cb-paper-race-silhouette cb-paper-race-emberkin"><path d="M'+(120-p.shoulder)+' 166 L'+(120-p.shoulder-13)+' 149 L'+(120-p.shoulder-5)+' 155 M'+(120+p.shoulder)+' 166 L'+(120+p.shoulder+13)+' 149 L'+(120+p.shoulder+5)+' 155" fill="#3b2227" stroke="#d96140" stroke-width="2"/><path d="M'+(120-p.shoulder-9)+' 157 L'+(120-p.shoulder-18)+' 143 M'+(120+p.shoulder+9)+' 157 L'+(120+p.shoulder+18)+' 143" stroke="#ff8a48" stroke-width="1.7"/><circle cx="'+(120-p.shoulder-16)+'" cy="184" r="2.6" fill="#ff9f4f" opacity=".66"/><circle cx="'+(120+p.shoulder+16)+'" cy="184" r="2.6" fill="#ff9f4f" opacity=".66"/></g>';
  if(race==='Nymari')return '<g class="cb-paper-race-silhouette cb-paper-race-nymari"><path d="M'+(120-p.shoulder+1)+' 177 Q'+(120-p.shoulder-22)+' 192 '+(120-p.shoulder-13)+' 216 L'+(120-p.shoulder+4)+' 198Z M'+(120+p.shoulder-1)+' 177 Q'+(120+p.shoulder+22)+' 192 '+(120+p.shoulder+13)+' 216 L'+(120+p.shoulder-4)+' 198Z" fill="#55b8c3" stroke="#9af3f3" stroke-width="1.5" opacity=".75"/><path d="M'+(120-p.shoulder-14)+' 189 L'+(120-p.shoulder-3)+' 199 M'+(120+p.shoulder+14)+' 189 L'+(120+p.shoulder+3)+' 199" stroke="#d0ffff" stroke-width="1.3" opacity=".8"/></g>';
  if(race==='Aelari')return '<g class="cb-paper-race-silhouette cb-paper-race-aelari"><path d="M'+(120-p.shoulder)+' 149 Q'+(120-p.shoulder-8)+' 176 '+(120-p.shoulder-4)+' 201 M'+(120+p.shoulder)+' 149 Q'+(120+p.shoulder+8)+' 176 '+(120+p.shoulder+4)+' 201" fill="none" stroke="#e1c5f8" stroke-width="1.4" opacity=".4"/><path d="M'+(120-p.shoulder+2)+' 151 L'+(120-p.shoulder-4)+' 143 M'+(120+p.shoulder-2)+' 151 L'+(120+p.shoulder+4)+' 143" stroke="#f1e0ff" stroke-width="1.2" opacity=".5"/></g>';
  if(race==='Veyren')return '<g class="cb-paper-race-silhouette cb-paper-race-veyren"><path d="M'+(120-p.shoulder+2)+' 152 Q'+(120-p.shoulder-8)+' 170 '+(120-p.shoulder-3)+' 188 M'+(120+p.shoulder-2)+' 152 Q'+(120+p.shoulder+8)+' 170 '+(120+p.shoulder+3)+' 188" fill="none" stroke="#9d70cb" stroke-width="1.6" opacity=".44"/><path d="M'+(120-p.shoulder-5)+' 163 l-7 -5 l4 9 M'+(120+p.shoulder+5)+' 163 l7 -5 l-4 9" fill="#b98cdd" opacity=".56"/></g>';
  return '';
}
function paperSlotClass(slot,highlighted,item){
  var id=String(item?.baseItemId||item?.itemId||'').toLowerCase();
  var set=item&&(item.setId||item.setName||item.visualSet||/(?:^|-)t[45](?:-|$)/.test(id)||Number(item.tier)>=5)?' is-set-item':'';
  return 'cb-paper-slot cb-paper-slot-'+String(slot||'').toLowerCase()+(highlighted===slot?' is-highlighted':'')+set;
}
function weaponType(item,c){
  if(item?.weaponType)return String(item.weaponType).toLowerCase();
  var n=(' '+itemIdentity(item,'Weapon')+' '+String(item?.name||'')+' ').toLowerCase();
  if(/(spear|pike|lance|glaive|halberd|polearm)/.test(n))return'spear';
  if(/(bow|longbow|shortbow)/.test(n))return'bow';
  if(/(crossbow)/.test(n))return'crossbow';
  if(/(axe|cleaver|hatchet)/.test(n))return'axe';
  if(/(maul|hammer)/.test(n))return'hammer';
  if(/(mace|morningstar)/.test(n))return'mace';
  if(/(dagger|knife|shiv|shivs|knives|stiletto)/.test(n))return'dagger';
  if(/(wand)/.test(n))return'wand';
  if(/(focus|orb|crystal)/.test(n))return'focus';
  if(/(scepter|sceptre)/.test(n))return'scepter';
  if(/(staff|stave|branch)/.test(n))return'staff';
  if(/(rod)/.test(n))return'rod';
  if(/(greatblade|greatsword|claymore)/.test(n))return'greatsword';
  if(/(sword|blade|blades|sabre|saber)/.test(n))return'sword';
  return'sword';
}
function offHandType(item,c){
  if(item?.offHandType)return String(item.offHandType).toLowerCase();
  var n=(' '+itemIdentity(item,'OffHand')+' '+String(item?.name||'')+' ').toLowerCase();
  if(/\b(shield|bulwark|buckler|aegis)\b/.test(n))return'shield';
  if(/\b(quiver)\b/.test(n))return'quiver';
  if(/\b(scripture|tome|book|grimoire)\b/.test(n))return'tome';
  if(/\b(idol|totem)\b/.test(n))return'idol';
  if(/\b(orb|focus|crystal)\b/.test(n))return'focus';
  if(/\b(blade|dagger|knife|shiv)\b/.test(n))return'dagger';
  return'focus';
}
function motifMarkup(motif,x,y,scale,color){
  scale=scale||1;color=color||'#f0dfad';
  if(motif==='sun')return '<g transform="translate('+x+' '+y+') scale('+scale+')"><circle r="5" fill="none" stroke="'+color+'" stroke-width="1.8"/><path d="M0-10V-7 M0 7V10 M-10 0H-7 M7 0H10 M-7-7L-5-5 M7-7L5-5 M-7 7L-5 5 M7 7L5 5" stroke="'+color+'" stroke-width="1.7"/></g>';
  if(motif==='halo')return '<g transform="translate('+x+' '+y+') scale('+scale+')"><ellipse rx="9" ry="4" fill="none" stroke="'+color+'" stroke-width="2"/><path d="M-5 5 Q0 10 5 5" fill="none" stroke="'+color+'" stroke-width="1.5"/></g>';
  if(motif==='leaf')return '<g transform="translate('+x+' '+y+') scale('+scale+')"><path d="M0 8 Q-9 1 -3-8 Q7-4 4 5 Q2 8 0 8Z" fill="none" stroke="'+color+'" stroke-width="2"/><path d="M-1 7 L3-5" stroke="'+color+'" stroke-width="1.4"/></g>';
  if(motif==='arrow')return '<g transform="translate('+x+' '+y+') scale('+scale+')"><path d="M-8 7 L7-8 M1-8H7V-2" fill="none" stroke="'+color+'" stroke-width="2"/></g>';
  if(motif==='fang')return '<g transform="translate('+x+' '+y+') scale('+scale+')"><path d="M-6-7 Q-7 4 0 9 Q7 4 6-7 Q2-2 0 1 Q-2-2-6-7Z" fill="none" stroke="'+color+'" stroke-width="2"/></g>';
  if(motif==='star')return '<g transform="translate('+x+' '+y+') scale('+scale+')"><path d="M0-9 L2-2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2-2Z" fill="none" stroke="'+color+'" stroke-width="1.8"/></g>';
  return '<g transform="translate('+x+' '+y+') scale('+scale+')"><path d="M-8-5 L0 5 L8-5" fill="none" stroke="'+color+'" stroke-width="2"/></g>';
}
function itemRune(item,slot,pal,x,y,scale){
  if(!item)return'';
  var v=visualVariant(item,slot,6),s=scale||1,color=pal.trim;
  if(pal.set)return motifMarkup(pal.set.motif,x,y,s,color);
  if(v===0)return '<circle cx="'+x+'" cy="'+y+'" r="'+(3*s)+'" fill="none" stroke="'+color+'" stroke-width="'+(1.4*s)+'"/>';
  if(v===1)return '<path d="M'+(x-4*s)+' '+y+' L'+x+' '+(y-4*s)+' L'+(x+4*s)+' '+y+' L'+x+' '+(y+4*s)+'Z" fill="none" stroke="'+color+'" stroke-width="'+(1.4*s)+'"/>';
  if(v===2)return '<path d="M'+(x-5*s)+' '+(y+3*s)+' Q'+x+' '+(y-5*s)+' '+(x+5*s)+' '+(y+3*s)+'" fill="none" stroke="'+color+'" stroke-width="'+(1.4*s)+'"/>';
  if(v===3)return '<path d="M'+(x-5*s)+' '+(y-3*s)+' L'+(x+5*s)+' '+(y+3*s)+' M'+(x+5*s)+' '+(y-3*s)+' L'+(x-5*s)+' '+(y+3*s)+'" stroke="'+color+'" stroke-width="'+(1.3*s)+'"/>';
  if(v===4)return '<path d="M'+x+' '+(y-5*s)+' L'+x+' '+(y+5*s)+' M'+(x-5*s)+' '+y+' L'+(x+5*s)+' '+y+'" stroke="'+color+'" stroke-width="'+(1.3*s)+'"/>';
  return '<path d="M'+(x-5*s)+' '+(y+4*s)+' L'+x+' '+(y-5*s)+' L'+(x+5*s)+' '+(y+4*s)+'" fill="none" stroke="'+color+'" stroke-width="'+(1.4*s)+'"/>';
}
function betaGearClass(item){
  var k=gearClass(item);
  return CLASS_GEAR_STYLE[k]?k:'';
}
function gearClassSlug(item){
  return String(betaGearClass(item)||'legacy').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
function betaTier(item){return Math.max(1,clampTier(item&&item.tier)||1)}
function classGlyph(k,pal,x,y,s){
  var c=pal.accent||pal.glow||pal.trim,sx=Number(s)||1;
  if(k==='Warrior')return '<path d="M'+(x-6*sx)+' '+(y-4*sx)+' L'+x+' '+(y+2*sx)+' L'+(x+6*sx)+' '+(y-4*sx)+' M'+(x-5*sx)+' '+(y+3*sx)+' L'+x+' '+(y+7*sx)+' L'+(x+5*sx)+' '+(y+3*sx)+'" fill="none" stroke="'+c+'" stroke-width="'+(1.6*sx)+'"/>';
  if(k==='Paladin')return '<circle cx="'+x+'" cy="'+y+'" r="'+(5*sx)+'" fill="none" stroke="'+c+'" stroke-width="'+(1.5*sx)+'"/><path d="M'+x+' '+(y-8*sx)+' V'+(y+8*sx)+' M'+(x-8*sx)+' '+y+' H'+(x+8*sx)+'" stroke="'+c+'" stroke-width="'+(1.5*sx)+'"/>';
  if(k==='Priest')return '<ellipse cx="'+x+'" cy="'+(y-2*sx)+'" rx="'+(8*sx)+'" ry="'+(3*sx)+'" fill="none" stroke="'+c+'" stroke-width="'+(1.4*sx)+'"/><path d="M'+x+' '+(y+1*sx)+' V'+(y+8*sx)+' M'+(x-4*sx)+' '+(y+4*sx)+' H'+(x+4*sx)+'" stroke="'+c+'" stroke-width="'+(1.35*sx)+'"/>';
  if(k==='Druid')return '<path d="M'+x+' '+(y+7*sx)+' Q'+(x-8*sx)+' '+y+' '+(x-2*sx)+' '+(y-8*sx)+' Q'+(x+8*sx)+' '+(y-5*sx)+' '+x+' '+(y+7*sx)+'Z" fill="none" stroke="'+c+'" stroke-width="'+(1.5*sx)+'"/><path d="M'+(x-3*sx)+' '+(y+4*sx)+' L'+(x+4*sx)+' '+(y-4*sx)+'" stroke="'+c+'" stroke-width="'+(1.1*sx)+'"/>';
  if(k==='Hunter')return '<path d="M'+(x-8*sx)+' '+(y+6*sx)+' L'+(x+6*sx)+' '+(y-8*sx)+' M'+(x+1*sx)+' '+(y-8*sx)+' H'+(x+6*sx)+' V'+(y-3*sx)+'" fill="none" stroke="'+c+'" stroke-width="'+(1.7*sx)+'"/>';
  if(k==='Rogue')return '<path d="M'+(x-7*sx)+' '+(y-7*sx)+' L'+(x+7*sx)+' '+(y+7*sx)+' M'+(x+7*sx)+' '+(y-7*sx)+' L'+(x-7*sx)+' '+(y+7*sx)+'" stroke="'+c+'" stroke-width="'+(1.5*sx)+'"/><path d="M'+(x-4*sx)+' '+(y+7*sx)+' L'+x+' '+(y+2*sx)+' L'+(x+4*sx)+' '+(y+7*sx)+'" fill="none" stroke="'+c+'" stroke-width="'+(1.2*sx)+'"/>';
  if(k==='Mage')return '<path d="M'+x+' '+(y-9*sx)+' L'+(x+3*sx)+' '+(y-3*sx)+' L'+(x+9*sx)+' '+y+' L'+(x+3*sx)+' '+(y+3*sx)+' L'+x+' '+(y+9*sx)+' L'+(x-3*sx)+' '+(y+3*sx)+' L'+(x-9*sx)+' '+y+' L'+(x-3*sx)+' '+(y-3*sx)+'Z" fill="none" stroke="'+c+'" stroke-width="'+(1.4*sx)+'"/>';
  if(k==='Shaman')return '<path d="M'+(x-7*sx)+' '+(y-8*sx)+' L'+(x+1*sx)+' '+(y-2*sx)+' L'+(x-3*sx)+' '+(y+2*sx)+' L'+(x+7*sx)+' '+(y+8*sx)+'" fill="none" stroke="'+c+'" stroke-width="'+(1.7*sx)+'"/><circle cx="'+x+'" cy="'+y+'" r="'+(2*sx)+'" fill="'+c+'"/>';
  if(k==='Warlock')return '<path d="M'+(x-9*sx)+' '+y+' Q'+x+' '+(y-8*sx)+' '+(x+9*sx)+' '+y+' Q'+x+' '+(y+8*sx)+' '+(x-9*sx)+' '+y+'Z" fill="none" stroke="'+c+'" stroke-width="'+(1.4*sx)+'"/><circle cx="'+x+'" cy="'+y+'" r="'+(2.5*sx)+'" fill="'+c+'"/>';
  if(k==='Monk')return '<circle cx="'+x+'" cy="'+y+'" r="'+(7*sx)+'" fill="none" stroke="'+c+'" stroke-width="'+(1.4*sx)+'"/><circle cx="'+x+'" cy="'+y+'" r="'+(2*sx)+'" fill="'+c+'"/><path d="M'+x+' '+(y-10*sx)+' V'+(y-7*sx)+' M'+(x-9*sx)+' '+(y+5*sx)+' L'+(x-6*sx)+' '+(y+3*sx)+' M'+(x+9*sx)+' '+(y+5*sx)+' L'+(x+6*sx)+' '+(y+3*sx)+'" stroke="'+c+'" stroke-width="'+(1.3*sx)+'"/>';
  if(k==='Death Knight')return '<path d="M'+(x-7*sx)+' '+(y-8*sx)+' L'+x+' '+(y-2*sx)+' L'+(x+7*sx)+' '+(y-8*sx)+' M'+x+' '+(y-2*sx)+' V'+(y+8*sx)+' M'+(x-6*sx)+' '+(y+5*sx)+' H'+(x+6*sx)+'" fill="none" stroke="'+c+'" stroke-width="'+(1.7*sx)+'"/>';
  if(k==='Demon Hunter')return '<path d="M'+(x-9*sx)+' '+(y-6*sx)+' Q'+(x-2*sx)+' '+y+' '+(x-8*sx)+' '+(y+7*sx)+' M'+(x+9*sx)+' '+(y-6*sx)+' Q'+(x+2*sx)+' '+y+' '+(x+8*sx)+' '+(y+7*sx)+'" fill="none" stroke="'+c+'" stroke-width="'+(1.8*sx)+'"/>';
  if(k==='Evoker')return '<path d="M'+x+' '+(y-9*sx)+' L'+(x+7*sx)+' '+(y-2*sx)+' L'+(x+4*sx)+' '+(y+8*sx)+' L'+x+' '+(y+4*sx)+' L'+(x-4*sx)+' '+(y+8*sx)+' L'+(x-7*sx)+' '+(y-2*sx)+'Z" fill="none" stroke="'+c+'" stroke-width="'+(1.5*sx)+'"/>';
  return'';
}
function betaHeadDetail(item,pal,tier){
  var k=betaGearClass(item);if(!k)return'';
  var hi=tier>=4,prestige=tier>=5,out=classGlyph(k,pal,50,28,.82);
  if(k==='Priest')out+='<ellipse cx="50" cy="15" rx="'+(prestige?15:11)+'" ry="4" fill="none" stroke="'+pal.glow+'" stroke-width="2"/>';
  else if(k==='Druid')out+='<path d="M38 27 Q29 14 27 9 M62 27 Q71 14 73 9" fill="none" stroke="'+pal.trim+'" stroke-width="'+(hi?4:2.5)+'" stroke-linecap="round"/>';
  else if(k==='Shaman')out+='<path d="M34 29 L27 18 M66 29 L73 18" stroke="'+pal.trim+'" stroke-width="'+(hi?3:2)+'"/>';
  else if(k==='Warlock')out+='<path d="M37 27 Q31 17 35 10 M63 27 Q69 17 65 10" fill="none" stroke="'+pal.trim+'" stroke-width="'+(hi?3:2)+'"/>';
  else if(k==='Monk')out+='<path d="M33 35 Q50 27 67 35" fill="none" stroke="'+pal.light+'" stroke-width="2"/>';
  else if(k==='Death Knight')out+='<path d="M34 31 L27 18 L40 26 M66 31 L73 18 L60 26 M50 22 V9" fill="none" stroke="'+pal.trim+'" stroke-width="'+(hi?3:2)+'"/>';
  else if(k==='Demon Hunter')out+='<path d="M34 28 Q25 19 28 9 M66 28 Q75 19 72 9" fill="none" stroke="'+pal.trim+'" stroke-width="'+(hi?3:2)+'"/><path d="M34 39 H66" stroke="'+pal.dark+'" stroke-width="4"/>';
  else if(k==='Evoker')out+='<path d="M36 29 L31 16 L44 24 M64 29 L69 16 L56 24" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="1.5"/>';
  else if(k==='Warrior')out+='<path d="M50 18 V44" stroke="'+pal.trim+'" stroke-width="'+(hi?2.7:2)+'"/>';
  else if(k==='Paladin')out+='<path d="M50 18 V38 M41 28 H59" stroke="'+pal.light+'" stroke-width="2"/>';
  else if(k==='Hunter')out+='<path d="M31 31 L23 22 L28 36 M69 31 L77 22 L72 36" fill="'+pal.dark+'" stroke="'+pal.light+'" stroke-width="1.5"/>';
  else if(k==='Rogue')out+='<path d="M38 31 L30 22 M62 31 L70 22" stroke="'+pal.light+'" stroke-width="2"/>';
  else if(k==='Mage')out+='<path d="M50 19 L55 8 L59 20 L68 13 L65 29" fill="none" stroke="'+pal.trim+'" stroke-width="2.5"/>';
  if(prestige)out+='<circle cx="50" cy="10" r="3.2" fill="'+pal.glow+'" opacity=".72" class="cb-paper-glow"/>';
  return out;
}
function betaChestDetail(item,pal,tier,p){
  var k=betaGearClass(item);if(!k)return'';
  var s=p.shoulder,w=p.waist,hi=tier>=4,prestige=tier>=5,out=classGlyph(k,pal,120,188,1);
  if(['Warrior','Death Knight'].includes(k))out+='<path d="M'+(120-s+9)+' 158 L120 175 L'+(120+s-9)+' 158 M'+(120-w+6)+' 211 H'+(120+w-6)+'" fill="none" stroke="'+pal.light+'" stroke-width="'+(tier>=3?3:2)+'"/>';
  else if(k==='Paladin')out+='<path d="M'+(120-s+10)+' 158 Q120 171 '+(120+s-10)+' 158 M120 166 V221" fill="none" stroke="'+pal.light+'" stroke-width="2.5"/>';
  else if(k==='Priest')out+='<path d="M106 158 Q120 170 134 158 M108 204 Q120 218 132 204" fill="none" stroke="'+pal.trim+'" stroke-width="2.2"/><path d="M113 159 V229 M127 159 V229" stroke="'+pal.light+'" stroke-width="1.4" opacity=".65"/>';
  else if(k==='Druid')out+='<path d="M101 163 Q115 176 107 194 Q102 210 111 226 M139 163 Q125 176 133 194 Q138 210 129 226" fill="none" stroke="'+pal.trim+'" stroke-width="2.3"/>';
  else if(k==='Hunter')out+='<path d="M'+(120-s+8)+' 158 L'+(120+w-2)+' 224 M'+(120+s-8)+' 158 L'+(120-w+2)+' 224" stroke="'+pal.trim+'" stroke-width="2.8"/>';
  else if(k==='Rogue')out+='<path d="M'+(120-s+9)+' 159 L'+(120+w-4)+' 223 M'+(120+s-9)+' 159 L'+(120-w+4)+' 223" stroke="'+pal.trim+'" stroke-width="2.4"/>';
  else if(k==='Mage')out+='<path d="M108 165 Q120 175 132 165 M103 215 Q120 228 137 215" fill="none" stroke="'+pal.trim+'" stroke-width="2"/>';
  else if(k==='Shaman')out+='<path d="M101 165 L111 175 L103 187 L116 199 M139 165 L129 175 L137 187 L124 199" fill="none" stroke="'+pal.trim+'" stroke-width="2.4"/>';
  else if(k==='Warlock')out+='<path d="M102 164 Q120 177 138 164 M105 215 Q120 199 135 215" fill="none" stroke="'+pal.trim+'" stroke-width="2.2"/><path d="M104 200 H136" stroke="'+pal.light+'" stroke-width="1.5" stroke-dasharray="5 4"/>';
  else if(k==='Monk')out+='<path d="M'+(120-s+8)+' 160 L'+(120+w-3)+' 226 M'+(120+s-8)+' 160 L'+(120-w+3)+' 226" stroke="'+pal.trim+'" stroke-width="2.6"/><path d="M105 207 Q120 216 135 207" fill="none" stroke="'+pal.light+'" stroke-width="2"/>';
  else if(k==='Demon Hunter')out+='<path d="M'+(120-s+7)+' 162 L'+(120+w-2)+' 220 M'+(120+s-7)+' 162 L'+(120-w+2)+' 220 M104 184 H136" stroke="'+pal.trim+'" stroke-width="2.6"/>';
  else if(k==='Evoker')out+='<path d="M102 160 Q120 171 138 160 M100 177 Q120 189 140 177 M104 211 Q120 221 136 211" fill="none" stroke="'+pal.trim+'" stroke-width="2"/>';
  if(hi)out+='<circle cx="120" cy="188" r="'+(prestige?6:4)+'" fill="'+pal.glow+'" opacity=".32" class="cb-paper-glow"/>';
  return out;
}
function betaShoulderDetail(item,pal,tier,fit,rise){
  var k=betaGearClass(item);if(!k)return'';
  var l=fit.leftShoulder,r=fit.rightShoulder,hi=tier>=4,y=151-(rise||0)*.35,out='';
  if(['Warrior','Death Knight'].includes(k))out+='<path d="M'+(l-5)+' '+y+' l-12 -10 l4 14 M'+(r+5)+' '+y+' l12 -10 l-4 14" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2"/>';
  else if(k==='Paladin')out+='<path d="M'+(l-3)+' '+y+' q-14 -15 -24 -7 q12 5 19 18 M'+(r+3)+' '+y+' q14 -15 24 -7 q-12 5 -19 18" fill="none" stroke="'+pal.light+'" stroke-width="3"/>';
  else if(k==='Druid')out+='<path d="M'+(l-4)+' '+y+' q-13 -11 -21 -4 M'+(r+4)+' '+y+' q13 -11 21 -4" fill="none" stroke="'+pal.trim+'" stroke-width="3"/><path d="M'+(l-15)+' '+(y-5)+' l-7 -8 M'+(r+15)+' '+(y-5)+' l7 -8" stroke="'+pal.light+'" stroke-width="2"/>';
  else if(k==='Hunter')out+='<path d="M'+(l-4)+' '+(y+2)+' q-14 -5 -23 4 M'+(r+4)+' '+(y+2)+' q14 -5 23 4" fill="none" stroke="'+pal.light+'" stroke-width="4" stroke-dasharray="3 3"/>';
  else if(k==='Rogue'||k==='Demon Hunter')out+='<path d="M'+(l-5)+' '+y+' l-10 -7 l5 12 M'+(r+5)+' '+y+' l10 -7 l-5 12" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="1.8"/>';
  else if(k==='Shaman')out+='<path d="M'+(l-4)+' '+y+' l-12 -9 l6 15 M'+(r+4)+' '+y+' l12 -9 l-6 15" fill="none" stroke="'+pal.trim+'" stroke-width="2.5"/><circle cx="'+(l-10)+'" cy="'+(y-5)+'" r="3" fill="'+pal.glow+'"/><circle cx="'+(r+10)+'" cy="'+(y-5)+'" r="3" fill="'+pal.glow+'"/>';
  else if(k==='Evoker')out+='<path d="M'+(l-4)+' '+y+' l-14 -8 l7 16 M'+(r+4)+' '+y+' l14 -8 l-7 16" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2"/>';
  else out+='<circle cx="'+(l-9)+'" cy="'+(y-3)+'" r="'+(hi?5:3.5)+'" fill="'+pal.glow+'" opacity=".45"/><circle cx="'+(r+9)+'" cy="'+(y-3)+'" r="'+(hi?5:3.5)+'" fill="'+pal.glow+'" opacity=".45"/>';
  out+=classGlyph(k,pal,l-9,y-3,.52)+classGlyph(k,pal,r+9,y-3,.52);
  return out;
}
function betaHandDetail(item,pal,tier,lh,rh,hy,hw){
  var k=betaGearClass(item);if(!k)return'';
  var out='<path d="M'+(lh-hw*.78)+' '+(hy-13)+' H'+(lh+hw*.78)+' M'+(rh-hw*.78)+' '+(hy-13)+' H'+(rh+hw*.78)+'" stroke="'+pal.trim+'" stroke-width="'+(tier>=3?2.1:1.5)+'"/>';
  if(['Rogue','Demon Hunter'].includes(k))out+='<path d="M'+(lh-hw*.5)+' '+(hy-15)+' l-4 -7 M'+(rh+hw*.5)+' '+(hy-15)+' l4 -7" stroke="'+pal.light+'" stroke-width="1.6"/>';
  if(k==='Monk')out+='<path d="M'+(lh-hw*.8)+' '+(hy-4)+' H'+(lh+hw*.8)+' M'+(rh-hw*.8)+' '+(hy-4)+' H'+(rh+hw*.8)+'" stroke="'+pal.light+'" stroke-width="2"/>';
  out+=classGlyph(k,pal,lh,hy-5,.34)+classGlyph(k,pal,rh,hy-5,.34);
  return out;
}
function betaWaistDetail(item,pal,tier,x1,x2){
  var k=betaGearClass(item);if(!k)return'';
  var out='';
  if(k==='Monk')out+='<path d="M'+(x1+6)+' 242 L'+(x2-6)+' 254 M'+(x2-6)+' 242 L'+(x1+6)+' 254" stroke="'+pal.trim+'" stroke-width="2"/>';
  else if(k==='Druid')out+='<path d="M'+(x1+6)+' 244 Q120 255 '+(x2-6)+' 244" fill="none" stroke="'+pal.trim+'" stroke-width="2"/>';
  else if(k==='Warlock')out+='<path d="M'+(x1+6)+' 247 H'+(x2-6)+'" stroke="'+pal.light+'" stroke-width="1.6" stroke-dasharray="4 3"/>';
  else out+='<path d="M'+(x1+6)+' 244 H'+(x2-6)+'" stroke="'+pal.light+'" stroke-width="1.7"/>';
  return out+classGlyph(k,pal,120,248,.52);
}
function betaLegDetail(item,pal,tier){
  var k=betaGearClass(item);if(!k)return'';
  var out='';
  if(['Warrior','Paladin','Death Knight'].includes(k))out='<path d="M87 319 L112 319 M128 319 L153 319" stroke="'+pal.light+'" stroke-width="2.2"/>';
  else if(['Hunter','Rogue','Demon Hunter'].includes(k))out='<path d="M91 281 L111 307 M149 281 L129 307" stroke="'+pal.trim+'" stroke-width="2"/>';
  else if(k==='Monk')out='<path d="M90 298 H111 M129 298 H150 M88 325 H111 M129 325 H152" stroke="'+pal.light+'" stroke-width="1.7"/>';
  else if(k==='Evoker'||k==='Shaman')out='<path d="M94 283 Q103 299 99 321 M146 283 Q137 299 141 321" fill="none" stroke="'+pal.trim+'" stroke-width="2"/>';
  else out='<path d="M96 281 Q104 297 101 321 M144 281 Q136 297 139 321" fill="none" stroke="'+pal.light+'" stroke-width="1.8"/>';
  return out+classGlyph(k,pal,101,306,.34)+classGlyph(k,pal,139,306,.34);
}
function betaFootDetail(item,pal,tier){
  var k=betaGearClass(item);if(!k)return'';
  var out='';
  if(['Warrior','Paladin','Death Knight'].includes(k))out='<path d="M77 371 H112 M128 371 H163" stroke="'+pal.trim+'" stroke-width="2.4"/>';
  else if(k==='Monk')out='<path d="M78 357 H111 M129 357 H162 M77 370 H111 M129 370 H163" stroke="'+pal.light+'" stroke-width="1.7"/>';
  else if(['Rogue','Demon Hunter'].includes(k))out='<path d="M78 381 L91 373 M162 381 L149 373" stroke="'+pal.trim+'" stroke-width="2.1"/>';
  else out='<path d="M82 361 Q96 354 110 361 M130 361 Q144 354 158 361" fill="none" stroke="'+pal.trim+'" stroke-width="1.7"/>';
  return out+classGlyph(k,pal,96,369,.3)+classGlyph(k,pal,144,369,.3);
}
function betaWeaponDetail(item,pal,tier,type){
  var k=betaGearClass(item);if(!k)return'';
  var hi=tier>=4,prestige=tier>=5,y=type==='staff'?105:176,out='';
  if(k==='Death Knight')out+='<path d="M184 163 L204 184 M204 163 L184 184" stroke="'+pal.trim+'" stroke-width="2.4"/>';
  else if(k==='Demon Hunter')out+='<path d="M181 177 Q191 164 201 177 Q191 190 181 177Z" fill="none" stroke="'+pal.glow+'" stroke-width="2"/>';
  else if(k==='Druid')out+='<path d="M184 109 Q191 94 199 104 Q192 112 184 109Z" fill="'+pal.trim+'" opacity=".8"/>';
  else if(k==='Shaman')out+='<path d="M182 168 L194 177 L187 184 L205 191" fill="none" stroke="'+pal.glow+'" stroke-width="2.2"/>';
  else if(k==='Warlock')out+='<circle cx="191" cy="'+y+'" r="'+(hi?10:7)+'" fill="none" stroke="'+pal.glow+'" stroke-width="1.8"/>';
  else if(k==='Monk')out+='<path d="M182 167 H201 M181 185 H202" stroke="'+pal.trim+'" stroke-width="2.1"/>';
  else if(k==='Evoker')out+='<path d="M191 '+(y-10)+' L200 '+y+' L191 '+(y+10)+' L183 '+y+'Z" fill="none" stroke="'+pal.trim+'" stroke-width="2"/>';
  else if(k==='Priest'||k==='Mage')out+='<circle cx="191" cy="'+y+'" r="'+(hi?9:6)+'" fill="none" stroke="'+pal.glow+'" stroke-width="1.8"/>';
  else out+='<path d="M185 165 H208" stroke="'+pal.light+'" stroke-width="2"/>';
  out+=classGlyph(k,pal,191,y,.52);
  if(prestige)out+='<circle cx="191" cy="'+y+'" r="13" fill="none" stroke="'+pal.glow+'" stroke-width="1.2" opacity=".34" class="cb-paper-glow"/>';
  return out;
}
function betaOffhandDetail(item,pal,tier,type){
  var k=betaGearClass(item);if(!k)return'';
  var out='';
  if(type==='shield'&&['Warrior','Paladin'].includes(k))out+='<path d="M48 181 V239 M36 206 H60" stroke="'+pal.light+'" stroke-width="2.2"/>';
  else if(k==='Hunter'&&type==='quiver')out+='<path d="M35 174 L59 181 M36 156 l-8 -8 M45 156 l-5 -11" stroke="'+pal.trim+'" stroke-width="2"/>';
  else if(['Rogue','Demon Hunter'].includes(k)&&type==='dagger')out+='<path d="M43 247 l-7 -8 M37 266 l-9 -3" stroke="'+pal.trim+'" stroke-width="2"/>';
  else if(k==='Druid')out+='<path d="M41 221 Q49 205 57 221 Q49 232 41 221Z" fill="none" stroke="'+pal.trim+'" stroke-width="2"/>';
  else if(k==='Shaman')out+='<path d="M40 214 L49 205 L58 214 L49 225Z" fill="none" stroke="'+pal.trim+'" stroke-width="2"/>';
  else if(k==='Warlock')out+='<path d="M39 216 Q49 207 59 216 Q49 225 39 216Z" fill="none" stroke="'+pal.glow+'" stroke-width="2"/>';
  else if(k==='Monk')out+='<circle cx="49" cy="216" r="10" fill="none" stroke="'+pal.glow+'" stroke-width="1.8"/>';
  else if(k==='Death Knight')out+='<path d="M40 216 L49 207 L58 216 L49 225Z M49 207 V225" fill="none" stroke="'+pal.glow+'" stroke-width="1.8"/>';
  else if(k==='Evoker')out+='<path d="M49 204 L58 214 L54 226 L49 222 L44 226 L40 214Z" fill="none" stroke="'+pal.trim+'" stroke-width="2"/>';
  else out+='<circle cx="49" cy="216" r="'+(tier>=4?11:8)+'" fill="none" stroke="'+pal.glow+'" stroke-width="1.6"/>';
  return out+classGlyph(k,pal,49,216,.55);
}

function paperHeadMarkup(c,a,skin,eye,hair,highlighted){
  var helm=itemForSlot(c,'Head'),tier=clampTier(helm&&helm.tier),pal=gearPalette(c,helm,tier,'Head');
  var face=raceFacePath(a);
  var base='<g class="cb-paper-head">'+
    raceFeatureMarkup(a,a.race)+earsMarkup(a.race,skin,a.feature)+
    '<path d="'+face+'" fill="'+skin+'" stroke="#182027" stroke-width="2.4"/>'+
    raceFaceDetails(a,eye)+hairMarkup(a,hair)+
    '<path d="M38 48 Q42 45 46 48 M54 48 Q58 45 62 48" fill="none" stroke="#242027" stroke-width="2" stroke-linecap="round"/>'+
    raceEyeMarkup(a,eye)+
    '<path d="M50 53 L47.5 63 Q50 65 53 63" fill="none" stroke="#5c423b" stroke-opacity=".55" stroke-width="1.4" stroke-linecap="round"/>'+
    '<path d="M43 69 Q50 72 57 69" fill="none" stroke="#5a3236" stroke-width="1.7" stroke-linecap="round"/>'+
    markingMarkup(a,a.race)+beardMarkup(a,hair)+
    (a.race==='Emberkin'?'<path d="M37 59 Q50 64 63 59" fill="none" stroke="#ff8a45" stroke-width="1" opacity=".28"/>':'')+
    (a.race==='Nymari'?'<circle cx="35" cy="58" r="1.3" fill="#8ffcff" opacity=".7"/><circle cx="65" cy="58" r="1.3" fill="#8ffcff" opacity=".7"/>':'')+
    '</g>';
  if(!helm)return base;
  var klass=gearClass(helm),cloth=['Mage','Priest','Druid','Warlock'].includes(klass),v=pal.variant;
  var helmet='';
  if(pal.set){
    if(klass==='Paladin')helmet='<path d="M29 42 Q30 20 50 17 Q70 20 71 42 L65 36 L50 32 L35 36Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.5"/><path d="M38 26 L43 13 L50 22 L57 13 L62 26" fill="'+pal.trim+'" opacity=".92"/>'+motifMarkup('sun',50,28,.65,pal.glow);
    else if(klass==='Priest')helmet='<path d="M31 40 Q34 23 50 21 Q66 23 69 40" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2"/><ellipse cx="50" cy="16" rx="15" ry="5" fill="none" stroke="'+pal.glow+'" stroke-width="2.4" class="cb-paper-set-glow"/>';
    else if(klass==='Druid')helmet='<path d="M32 39 Q34 24 50 21 Q66 24 68 39" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2"/><path d="M38 26 Q29 12 27 8 M62 26 Q71 12 73 8" fill="none" stroke="'+pal.trim+'" stroke-width="4" stroke-linecap="round"/>';
    else if(klass==='Hunter')helmet='<path d="M29 43 Q31 21 50 19 Q69 21 71 43 L64 37 L50 32 L36 37Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.2"/><path d="M32 26 L22 19 L29 35 M68 26 L78 19 L71 35" fill="'+pal.trim+'" opacity=".7"/>';
    else if(klass==='Rogue')helmet='<path d="M29 42 Q31 19 50 18 Q69 19 71 42 L65 55 L60 44 L50 36 L40 44 L35 55Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.2"/>'+motifMarkup('fang',50,27,.62,pal.glow);
    else if(klass==='Mage')helmet='<path d="M30 41 Q31 20 50 17 Q69 20 70 41 L64 35 Q50 29 36 35Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2"/><path d="M50 17 L55 6 L59 19 L68 12 L65 29" fill="none" stroke="'+pal.trim+'" stroke-width="3"/>'+motifMarkup('star',50,27,.62,pal.glow);
    else helmet='<path d="M28 43 Q29 18 50 16 Q71 18 72 43 L66 38 Q50 29 34 38Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.6"/><path d="M31 27 L24 16 L38 24 M69 27 L76 16 L62 24" fill="'+pal.trim+'"/>'+motifMarkup('chevron',50,29,.65,pal.glow);
  }else if(cloth){
    helmet='<path d="M28 42 Q29 18 50 16 Q71 18 72 42 Q64 31 50 31 Q36 31 28 42Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2"/>'+
      (v%2?'<path d="M33 35 Q50 20 67 35" fill="none" stroke="'+pal.light+'" stroke-width="2"/>':'<path d="M37 28 Q50 35 63 28" fill="none" stroke="'+pal.light+'" stroke-width="2"/>');
  }else{
    helmet='<path d="M28 43 Q29 18 50 16 Q71 18 72 43 L66 38 Q50 29 34 38Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.2"/>'+
      (v===0?'<path d="M34 32 L50 20 L66 32" fill="none" stroke="'+pal.light+'" stroke-width="2"/>':v===1?'<path d="M31 36 L40 23 L50 31 L60 23 L69 36" fill="none" stroke="'+pal.light+'" stroke-width="2"/>':'<path d="M36 25 Q50 34 64 25" fill="none" stroke="'+pal.light+'" stroke-width="2"/>');
  }
  helmet+=itemRune(helm,'Head',pal,50,28,.7)+betaHeadDetail(helm,pal,tier);
  if(tier>=4)helmet+='<circle cx="50" cy="25" r="2.6" fill="'+pal.glow+'" class="cb-paper-glow"/>';
  return base+'<g class="'+paperSlotClass('Head',highlighted,helm)+'" data-item-key="'+esc(itemIdentity(helm,'Head'))+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-alignment="v4" data-item-visuals="v2" data-palette-mode="'+pal.paletteMode+'" data-class-visual="'+esc(gearClassSlug(helm))+'">'+helmet+'</g>';
}
function paperLegs(c,skin,highlighted){
  var item=itemForSlot(c,'Legs'),fit=paperFit(c),p=fit.p,lc=fit.leftLeg,rc=fit.rightLeg,uh=fit.legHalf,ch=fit.calfHalf;
  var legPath=function(x){return 'M'+(x-uh)+' 246 L'+(x+uh)+' 246 L'+(x+ch)+' 315 L'+(x+ch*.88)+' 354 L'+(x-ch*.88)+' 354 L'+(x-ch)+' 315Z'};
  var base='<g class="cb-paper-underlayer cb-paper-base-legs" data-body-fit="v4"><path d="'+legPath(lc)+'" fill="'+skin+'" stroke="#111820" stroke-width="2.4"/><path d="'+legPath(rc)+'" fill="'+skin+'" stroke="#111820" stroke-width="2.4"/>'+paperRaceLegDetails(c)+'</g>';
  if(!item)return base;
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier||1,'Legs'),klass=gearClass(item),style=clothLowerStyle(item);
  var heavy=['Warrior','Paladin','Death Knight'].includes(klass),cloth=['Mage','Priest','Druid','Warlock'].includes(klass),robe=cloth&&style!=='trousers';
  var gear='<g class="'+paperSlotClass('Legs',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Legs'))+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-alignment="v4" data-left-leg-x="'+lc.toFixed(2)+'" data-right-leg-x="'+rc.toFixed(2)+'" data-lower-silhouette="'+style+'" data-item-visuals="v2" data-palette-mode="'+pal.paletteMode+'" data-class-visual="'+esc(gearClassSlug(item))+'">';
  if(robe){
    gear+=lowerSilhouetteMarkup(item,pal,p,style);
    if(style==='kilt')gear+='<path d="'+legPath(lc)+' M'+legPath(rc)+'" fill="'+pal.dark+'" stroke="#111820" stroke-width="2.1" opacity=".88"/>';
  }else{
    gear+='<path d="'+legPath(lc)+'" fill="'+pal.base+'" stroke="#111820" stroke-width="2.7"/><path d="'+legPath(rc)+'" fill="'+pal.base+'" stroke="#111820" stroke-width="2.7"/>';
    if(heavy)gear+='<path d="M'+(lc-uh*.92)+' 286 L'+(lc+uh*.92)+' 286 L'+(lc+ch*.95)+' 316 Q'+lc+' 322 '+(lc-ch*.95)+' 316Z M'+(rc-uh*.92)+' 286 L'+(rc+uh*.92)+' 286 L'+(rc+ch*.95)+' 316 Q'+rc+' 322 '+(rc-ch*.95)+' 316Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="1.6"/>';
    else gear+='<path d="M'+(lc-uh*.72)+' 298 H'+(lc+uh*.72)+' M'+(rc-uh*.72)+' 298 H'+(rc+uh*.72)+'" stroke="'+pal.trim+'" stroke-width="2" opacity=".72"/>';
  }
  gear+=itemRune(item,'Legs',pal,lc,286,.48)+itemRune(item,'Legs',pal,rc,286,.48)+classGlyph(klass,pal,lc,309,.32)+classGlyph(klass,pal,rc,309,.32);
  if(pal.set)gear+='<path d="M'+(lc-ch*.8)+' 329 H'+(lc+ch*.8)+' M'+(rc-ch*.8)+' 329 H'+(rc+ch*.8)+'" stroke="'+pal.glow+'" stroke-width="2" opacity=".68" class="cb-paper-set-glow"/>';
  return base+gear+'</g>';
}
function paperFeet(c,skin,highlighted){
  var item=itemForSlot(c,'Feet'),fit=paperFit(c),p=fit.p,lc=fit.leftLeg,rc=fit.rightLeg,fh=fit.footHalf;
  var footPath=function(x,side){var toe=side<0?-4:4;return 'M'+(x-fh)+' 348 L'+(x+fh)+' 348 L'+(x+fh+Math.max(0,toe))+' 385 L'+(x-fh+Math.min(0,toe))+' 385 Q'+(x+toe*.45)+' 390 '+(x+toe)+' 382Z'};
  var base='<g class="cb-paper-underlayer cb-paper-base-feet" data-body-fit="v4"><path d="'+footPath(lc,-1)+'" fill="'+skin+'" stroke="#111820" stroke-width="2"/><path d="'+footPath(rc,1)+'" fill="'+skin+'" stroke="#111820" stroke-width="2"/>'+paperRaceFootDetails(c)+'</g>';
  if(!item)return base;
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier||1,'Feet'),klass=gearClass(item),heavy=['Warrior','Paladin','Death Knight'].includes(klass);
  var gear='<g class="'+paperSlotClass('Feet',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Feet'))+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-alignment="v4" data-left-foot-x="'+lc.toFixed(2)+'" data-right-foot-x="'+rc.toFixed(2)+'" data-item-visuals="v2" data-palette-mode="'+pal.paletteMode+'" data-class-visual="'+esc(gearClassSlug(item))+'">'+
    '<path d="'+footPath(lc,-1)+'" fill="'+pal.dark+'" stroke="#0c1115" stroke-width="2.7"/><path d="'+footPath(rc,1)+'" fill="'+pal.dark+'" stroke="#0c1115" stroke-width="2.7"/>';
  if(heavy)gear+='<path d="M'+(lc-fh*.92)+' 350 H'+(lc+fh*.92)+' V369 H'+(lc-fh*.92)+'Z M'+(rc-fh*.92)+' 350 H'+(rc+fh*.92)+' V369 H'+(rc-fh*.92)+'Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="1.6"/>';
  else gear+='<path d="M'+(lc-fh*.78)+' 366 H'+(lc+fh*.78)+' M'+(rc-fh*.78)+' 366 H'+(rc+fh*.78)+'" stroke="'+pal.trim+'" stroke-width="2"/>';
  gear+=classGlyph(klass,pal,lc,373,.28)+classGlyph(klass,pal,rc,373,.28);
  if(pal.set)gear+='<path d="M'+(lc-fh*.9)+' 382 H'+(lc+fh*.9)+' M'+(rc-fh*.9)+' 382 H'+(rc+fh*.9)+'" stroke="'+pal.glow+'" stroke-width="2" opacity=".75" class="cb-paper-set-glow"/>';
  return base+gear+'</g>';
}
function paperArms(c,skin,highlighted){
  var hands=itemForSlot(c,'Hands'),tier=clampTier(hands&&hands.tier),pal=gearPalette(c,hands,tier||1,'Hands');
  var fit=paperFit(c),p=fit.p,ls=fit.leftShoulder,rs=fit.rightShoulder,lh=fit.leftHand,rh=fit.rightHand,handY=fit.handY||279,aw=Math.max(5.2,p.arm*.44);
  var wristY=handY-19;
  var left='M'+(ls-aw)+' 148 Q'+(ls-aw-7)+' 185 '+(lh-aw)+' 229 Q'+(lh-aw*.65)+' 249 '+(lh-aw*.28)+' '+wristY+' L'+(lh+aw*.28)+' '+wristY+' Q'+(lh+aw*.65)+' 249 '+(ls+aw)+' 148Z';
  var right='M'+(rs+aw)+' 148 Q'+(rs+aw+7)+' 185 '+(rh+aw)+' 229 Q'+(rh+aw*.65)+' 249 '+(rh+aw*.28)+' '+wristY+' L'+(rh-aw*.28)+' '+wristY+' Q'+(rh-aw*.65)+' 249 '+(rs-aw)+' 148Z';
  var details=paperRaceArmDetails(c,p,ls,rs),scale=p.hand||1,klass=gearClass(hands),heavy=['Warrior','Paladin','Death Knight'].includes(klass);
  var hw=Math.max(6.5,scale*6.5)+(heavy?1.6:0),top=handY-27,bottom=handY+10;
  return '<g class="cb-paper-arms" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-alignment="v4"><path d="'+left+'" fill="'+skin+'" stroke="#182027" stroke-width="2.2"/><path d="'+right+'" fill="'+skin+'" stroke="#182027" stroke-width="2.2"/>'+
    '<ellipse cx="'+lh+'" cy="'+(handY-3)+'" rx="'+Math.max(4.5,aw*.68)+'" ry="'+Math.max(6.5,aw*.9)+'" fill="'+skin+'"/><ellipse cx="'+rh+'" cy="'+(handY-3)+'" rx="'+Math.max(4.5,aw*.68)+'" ry="'+Math.max(6.5,aw*.9)+'" fill="'+skin+'"/>'+details+'</g>'+
    '<g class="'+paperSlotClass('Hands',highlighted,hands)+'" data-item-key="'+esc(itemIdentity(hands,'Hands'))+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-alignment="v4" data-left-hand-x="'+lh.toFixed(2)+'" data-right-hand-x="'+rh.toFixed(2)+'" data-hand-y="'+handY.toFixed(2)+'" data-item-visuals="v2" data-palette-mode="'+pal.paletteMode+'" data-class-visual="'+esc(gearClassSlug(hands))+'">'+
    '<path d="M'+(lh-hw)+' '+top+' Q'+lh+' '+(top-4)+' '+(lh+hw)+' '+top+' L'+(lh+hw*.78)+' '+bottom+' Q'+lh+' '+(bottom+5)+' '+(lh-hw*.78)+' '+bottom+'Z" fill="'+(tier?pal.base:skin)+'" stroke="#111820" stroke-width="2"/>'+
    '<path d="M'+(rh-hw)+' '+top+' Q'+rh+' '+(top-4)+' '+(rh+hw)+' '+top+' L'+(rh+hw*.78)+' '+bottom+' Q'+rh+' '+(bottom+5)+' '+(rh-hw*.78)+' '+bottom+'Z" fill="'+(tier?pal.base:skin)+'" stroke="#111820" stroke-width="2"/>'+
    (hands&&heavy?'<path d="M'+(lh-hw*.92)+' '+(top+7)+' H'+(lh+hw*.92)+' M'+(rh-hw*.92)+' '+(top+7)+' H'+(rh+hw*.92)+'" stroke="'+pal.trim+'" stroke-width="1.8"/>':'')+
    (hands?itemRune(hands,'Hands',pal,lh,handY-4,.4)+itemRune(hands,'Hands',pal,rh,handY-4,.4)+betaHandDetail(hands,pal,tier,lh,rh,handY,hw):'')+'</g>';
}
function paperChest(c,highlighted,skin){
  var item=itemForSlot(c,'Chest'),fit=paperFit(c),p=fit.p,top=fit.race==='Stoneborn'?139:fit.gender===1?143:141,bottom=244;
  var bareTop=p.shoulder*.82,bareBottom=Math.max(p.waist*.98,p.hip*.62);
  if(!item)return '<g class="cb-paper-underlayer cb-paper-empty-chest cb-paper-racial-torso"><path d="M'+(120-bareTop)+' '+top+' Q120 '+(top-8)+' '+(120+bareTop)+' '+top+' Q'+(120+bareTop)+' 187 '+(120+bareBottom)+' '+bottom+' Q120 '+(bottom+8)+' '+(120-bareBottom)+' '+bottom+' Q'+(120-bareTop)+' 187 '+(120-bareTop)+' '+top+'Z" fill="'+skin+'" stroke="#10171b" stroke-width="2.5"/>'+paperRaceTorsoDetails(c,p)+'</g>';
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier||1,'Chest'),klass=gearClass(item);
  var heavy=['Warrior','Paladin','Death Knight'].includes(klass),cloth=['Mage','Priest','Druid','Warlock'].includes(klass),leather=['Hunter','Rogue','Demon Hunter','Monk'].includes(klass),mail=['Shaman','Evoker'].includes(klass),v=pal.variant;
  var topFactor=heavy?.88:mail?.84:cloth?.77:leather?.80:.82;
  var gs=p.shoulder*topFactor,gw=Math.max(p.waist*(heavy?1.04:1),p.hip*(heavy?.67:.62)),base=pal.base;
  var torso='<path d="M'+(120-gs)+' '+top+' Q120 '+(top-9)+' '+(120+gs)+' '+top+' Q'+(120+gs)+' 188 '+(120+gw)+' '+bottom+' Q120 '+(bottom+8)+' '+(120-gw)+' '+bottom+' Q'+(120-gs)+' 188 '+(120-gs)+' '+top+'Z" fill="'+base+'" stroke="#10171b" stroke-width="2.8"/>';
  if(heavy)torso+='<path d="M'+(120-gs+4)+' 154 L120 '+(v%2?173:180)+' L'+(120+gs-4)+' 154 L'+(120+gw-2)+' 221 L120 240 L'+(120-gw+2)+' 221Z" fill="'+pal.dark+'" opacity=".58"/><path d="M120 149 V236 M'+(120-gs+10)+' 185 H'+(120+gs-10)+'" stroke="'+pal.trim+'" stroke-width="'+(tier>=3?2.7:2)+'"/>';
  else if(mail)torso+='<path d="M'+(120-gs+7)+' 158 Q120 169 '+(120+gs-7)+' 158 M'+(120-gw+2)+' 207 Q120 217 '+(120+gw-2)+' 207" fill="none" stroke="'+pal.trim+'" stroke-width="2.2"/>';
  else if(cloth)torso+='<path d="M'+(120-gs+7)+' 156 Q120 '+(v%2?168:178)+' '+(120+gs-7)+' 156 M'+(120-gw+1)+' 214 Q120 226 '+(120+gw-1)+' 214" fill="none" stroke="'+pal.trim+'" stroke-width="'+(tier>=3?2.6:1.9)+'"/><path d="M120 155 V235" stroke="'+pal.light+'" stroke-width="1.7" opacity=".32"/>';
  else torso+='<path d="M'+(120-gs+6)+' 164 L'+(120+gw-1)+' 221 M'+(120+gs-6)+' 164 L'+(120-gw+1)+' 221" fill="none" stroke="'+pal.trim+'" stroke-width="2.1" opacity=".72"/>';
  var detailProfile=Object.assign({},p,{shoulder:gs,waist:gw});
  torso+=itemRune(item,'Chest',pal,120,184,(pal.set&&pal.set.motif)?0.9:0.72)+betaChestDetail(item,pal,tier,detailProfile);
  if(pal.set)torso+='<path d="M'+(120-gw+6)+' 204 Q120 215 '+(120+gw-6)+' 204" fill="none" stroke="'+pal.glow+'" stroke-width="2" opacity=".65" class="cb-paper-set-glow"/>';
  return '<g class="'+paperSlotClass('Chest',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Chest'))+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-alignment="v4" data-chest-left="'+(120-gs).toFixed(2)+'" data-chest-right="'+(120+gs).toFixed(2)+'" data-item-visuals="v2" data-palette-mode="'+pal.paletteMode+'" data-class-visual="'+esc(gearClassSlug(item))+'">'+torso+'</g>';
}
function paperWaist(c,highlighted){
  var item=itemForSlot(c,'Waist');if(!item)return'';
  var fit=paperFit(c),tier=clampTier(item.tier),pal=gearPalette(c,item,tier,'Waist'),v=pal.variant;
  var half=fit.waistHalf,x1=120-half,x2=120+half,top=236,bottom=253,buckleW=v%2?12:16;
  return '<g class="'+paperSlotClass('Waist',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Waist'))+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-alignment="v4" data-fit-left="'+x1.toFixed(2)+'" data-fit-right="'+x2.toFixed(2)+'" data-item-visuals="v2" data-palette-mode="'+pal.paletteMode+'" data-class-visual="'+esc(gearClassSlug(item))+'">'+
    '<path d="M'+x1+' '+top+' Q120 241 '+x2+' '+top+' L'+x2+' '+bottom+' Q120 258 '+x1+' '+bottom+'Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.2"/>'+
    '<rect x="'+(120-buckleW/2)+'" y="240" width="'+buckleW+'" height="11" rx="2" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="1.8"/>'+
    itemRune(item,'Waist',pal,120,246,.4)+betaWaistDetail(item,pal,tier,x1,x2)+'</g>';
}
function paperShoulders(c,highlighted){
  var item=itemForSlot(c,'Shoulders'),tier=clampTier(item&&item.tier);if(!item)return'';
  var pal=gearPalette(c,item,tier,'Shoulders'),fit=paperFit(c),p=fit.p,klass=gearClass(item),heavy=['Warrior','Paladin','Death Knight'].includes(klass),cloth=['Mage','Priest','Druid','Warlock'].includes(klass);
  var lc=fit.leftPad||120-p.shoulder*.82,rc=fit.rightPad||120+p.shoulder*.82;
  var hw=Math.max(9,p.arm*.62)+(heavy?2.5:cloth?0:1)+(tier>=4?1.8:0),top=heavy?139:142,bottom=165,rise=heavy?4:cloth?0:2;
  var pad=function(x,side){var outer=x+side*hw,inner=x-side*hw;return '<path d="M'+inner+' '+(top+5)+' Q'+x+' '+(top-rise)+' '+outer+' '+(top+5)+' L'+(outer-side*2)+' '+(bottom-3)+' Q'+x+' '+(bottom+3)+' '+inner+' '+(bottom-1)+'Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.3"/>'};
  var localFit={leftShoulder:lc,rightShoulder:rc};
  return '<g class="'+paperSlotClass('Shoulders',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Shoulders'))+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-alignment="v4" data-left-shoulder-x="'+fit.leftShoulder.toFixed(2)+'" data-right-shoulder-x="'+fit.rightShoulder.toFixed(2)+'" data-left-pad-x="'+lc.toFixed(2)+'" data-right-pad-x="'+rc.toFixed(2)+'" data-item-visuals="v2" data-palette-mode="'+pal.paletteMode+'" data-class-visual="'+esc(gearClassSlug(item))+'">'+
    pad(lc,-1)+pad(rc,1)+itemRune(item,'Shoulders',pal,lc,153,.44)+itemRune(item,'Shoulders',pal,rc,153,.44)+
    (pal.set?'<path d="M'+lc+' '+(top-2)+' L'+lc+' '+(top-10)+' M'+rc+' '+(top-2)+' L'+rc+' '+(top-10)+'" stroke="'+pal.glow+'" stroke-width="2.2" opacity=".65" class="cb-paper-set-glow"/>':'')+
    betaShoulderDetail(item,pal,tier,localFit,rise)+'</g>';
}
function weaponMarkup(type,pal,v,tier,item){
  var g='';
  if(type==='bow'){
    g='<path d="M190 116 Q225 206 188 316" fill="none" stroke="'+pal.base+'" stroke-width="'+(7+v%3)+'"/><path d="M190 116 L188 316" stroke="'+pal.trim+'" stroke-width="2"/><path d="M188 205 L220 195" stroke="'+pal.light+'" stroke-width="3"/><path d="M220 195 L213 192 L216 201Z" fill="'+pal.trim+'"/>';
  }else if(type==='crossbow'){
    g='<path d="M188 180 L204 322" stroke="'+pal.dark+'" stroke-width="7"/><path d="M165 171 Q193 150 221 171" fill="none" stroke="'+pal.base+'" stroke-width="8"/><path d="M168 171 L219 171 M193 160 L206 198" stroke="'+pal.trim+'" stroke-width="2.5"/>';
  }else if(type==='spear'){
    g='<path d="M188 92 L205 345" stroke="'+pal.dark+'" stroke-width="7" stroke-linecap="round"/><path d="M183 91 L190 57 L202 89 L192 107Z" fill="'+pal.light+'" stroke="'+pal.trim+'" stroke-width="2.5"/><path d="M188 116 L204 113" stroke="'+pal.trim+'" stroke-width="4"/>';
  }else if(type==='axe'){
    g='<path d="M193 151 L207 339" stroke="'+pal.dark+'" stroke-width="8" stroke-linecap="round"/><path d="M190 144 Q203 111 225 123 L215 158 Q202 166 188 153Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="3"/><path d="M198 127 L217 134" stroke="'+pal.light+'" stroke-width="2"/>';
  }else if(type==='hammer'){
    g='<path d="M194 161 L207 339" stroke="'+pal.dark+'" stroke-width="9" stroke-linecap="round"/><path d="M173 131 L211 124 L220 163 L181 172Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="3"/><path d="M180 145 L215 138" stroke="'+pal.light+'" stroke-width="3"/>';
  }else if(type==='mace'){
    g='<path d="M194 165 L207 339" stroke="'+pal.dark+'" stroke-width="8" stroke-linecap="round"/><circle cx="191" cy="143" r="17" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="3"/><path d="M191 119 V128 M167 143 H176 M206 143 H215 M175 127 L181 133 M207 127 L201 133" stroke="'+pal.trim+'" stroke-width="4"/>';
  }else if(type==='dagger'){
    g='<path d="M182 236 L210 316" stroke="'+pal.light+'" stroke-width="5.5" stroke-linecap="round"/><path d="M207 313 L219 337 L204 327Z" fill="'+pal.trim+'"/><path d="M179 235 L197 241" stroke="'+pal.trim+'" stroke-width="5"/>';
  }else if(type==='wand'){
    g='<path d="M190 190 L207 329" stroke="'+pal.base+'" stroke-width="6" stroke-linecap="round"/><path d="M187 188 L194 165 L202 187Z" fill="'+pal.glow+'" stroke="'+pal.trim+'" stroke-width="2"/>';
  }else if(type==='focus'){
    g='<path d="M191 217 L202 331" stroke="'+pal.dark+'" stroke-width="6" stroke-linecap="round"/><circle cx="189" cy="194" r="18" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="3"/><circle cx="189" cy="194" r="8" fill="'+pal.glow+'" opacity=".78" class="cb-paper-glow"/><path d="M170 194 H208 M189 175 V213" stroke="'+pal.light+'" stroke-width="1.8" opacity=".65"/>';
  }else if(type==='scepter'){
    g='<path d="M191 175 L206 336" stroke="'+pal.base+'" stroke-width="7" stroke-linecap="round"/><circle cx="189" cy="165" r="11" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="3"/><circle cx="189" cy="165" r="4" fill="'+pal.glow+'"/>';
  }else if(type==='rod'){
    g='<path d="M191 160 L206 338" stroke="'+pal.base+'" stroke-width="7" stroke-linecap="round"/><path d="M181 151 Q191 133 201 151 L197 168 L185 168Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.5"/>';
  }else if(type==='staff'){
    g='<path d="M191 111 L203 346" stroke="'+pal.base+'" stroke-width="8" stroke-linecap="round"/>'+
      (v%3===0?'<circle cx="191" cy="105" r="14" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="3"/><circle cx="191" cy="105" r="5" fill="'+pal.glow+'"/>':v%3===1?'<path d="M191 112 Q174 95 183 82 M193 110 Q211 96 207 81" fill="none" stroke="'+pal.trim+'" stroke-width="5" stroke-linecap="round"/><circle cx="193" cy="96" r="4" fill="'+pal.glow+'"/>':'<path d="M181 111 L191 82 L201 111 L191 122Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="3"/><circle cx="191" cy="101" r="4" fill="'+pal.glow+'"/>');
  }else{
    var great=type==='greatsword',bladeTop=great?72:94,bladeWidth=great?14:10;
    g='<path d="M191 149 L207 337" stroke="'+pal.dark+'" stroke-width="'+(great?10:8)+'" stroke-linecap="round"/><path d="M'+(196-bladeWidth/2)+' 147 L196 '+bladeTop+' L'+(196+bladeWidth/2)+' 147Z" fill="'+pal.light+'" stroke="'+pal.trim+'" stroke-width="2.4"/><path d="M178 158 L211 155" stroke="'+pal.trim+'" stroke-width="'+(great?6:5)+'"/>';
  }
  g+=betaWeaponDetail(item,pal,tier,type);
  if(pal.set)g+=motifMarkup(pal.set.motif,196,176,.7,pal.glow);
  else g+=itemRune(item,'Weapon',pal,196,176,.55);
  if(tier>=4&&!pal.set)g+='<circle cx="196" cy="176" r="2.4" fill="'+pal.glow+'" opacity=".6" class="cb-paper-glow"/>';
  return g;
}
function paperWeapon(c,highlighted){
  var item=itemForSlot(c,'Weapon'),tier=clampTier(item&&item.tier);
  if(!item)return'';
  var pal=gearPalette(c,item,tier,'Weapon'),type=weaponType(item,c),v=pal.variant,fit=paperFit(c);
  var gx=fit.weaponX||fit.rightHand||191,gy=fit.weaponY||fit.handY||283,angle=Number(fit.weaponAngle)||0;
  var hand=itemForSlot(c,'Hands'),handFill,handStroke='#111820';
  if(hand)handFill=gearPalette(c,hand,clampTier(hand.tier)||1,'Hands').base;
  else{
    var race=c.race||c.appearance?.race||'Veyren',a=normalizeAppearance(c.appearance||c,c.id||c.name||race,race);
    handFill=raceDef(a.race).skin[a.skinTone];
  }
  var transform='translate('+gx.toFixed(2)+' '+gy.toFixed(2)+') rotate('+angle.toFixed(2)+') translate(-191 -244)';
  var grip='<ellipse class="cb-paper-weapon-grip-hand" cx="'+gx.toFixed(2)+'" cy="'+gy.toFixed(2)+'" rx="6.2" ry="7.4" fill="'+handFill+'" stroke="'+handStroke+'" stroke-width="1.8"/>';
  return '<g class="'+paperSlotClass('Weapon',highlighted,item)+' cb-paper-side-weapon" data-weapon-type="'+esc(type)+'" data-item-key="'+esc(itemIdentity(item,'Weapon'))+'" data-render-layer="mainhand-side" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-alignment="v4" data-weapon-pose="side-held" data-weapon-angle="'+angle.toFixed(2)+'" data-grip-x="'+gx.toFixed(2)+'" data-grip-y="'+gy.toFixed(2)+'" data-item-visuals="v2" data-palette-mode="'+pal.paletteMode+'" data-class-visual="'+esc(gearClassSlug(item))+'" transform="'+transform+'">'+weaponMarkup(type,pal,v,tier,item)+'</g>'+grip;
}
function offHandBaseMarkup(type,pal,v,tier,item){
  if(type==='shield'){
    var shape=v%3===0?'M26 174 Q48 155 70 174 L66 248 Q49 270 31 248Z':v%3===1?'M27 169 L70 177 L64 250 L49 266 L32 248Z':'M26 178 L48 159 L70 178 L62 252 L48 267 L34 252Z';
    return '<path d="'+shape+'" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="3"/><path d="M48 170 L48 255 M31 205 L66 205" stroke="'+pal.light+'" stroke-width="2.3" opacity=".62"/>'+itemRune(item,'OffHand',pal,48,211,.8);
  }
  if(type==='quiver')return '<path d="M31 164 L65 174 L58 263 L35 257Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.5"/><path d="M38 164 L33 130 M46 167 L45 128 M55 168 L59 132" stroke="'+pal.light+'" stroke-width="3"/>';
  if(type==='tome')return '<g transform="rotate(-8 48 216)"><rect x="28" y="187" width="42" height="57" rx="4" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="3"/><path d="M49 189 V242" stroke="'+pal.trim+'" stroke-width="2"/>'+itemRune(item,'OffHand',pal,49,215,.7)+'</g>';
  if(type==='idol')return '<path d="M32 238 Q48 182 64 238 L58 258 H38Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="3"/><circle cx="48" cy="221" r="7" fill="'+pal.glow+'" opacity=".7"/>';
  if(type==='dagger')return '<path d="M52 236 L26 307" stroke="'+pal.light+'" stroke-width="5.5"/><path d="M29 304 L19 325 L33 316Z" fill="'+pal.trim+'"/><path d="M45 242 L60 248" stroke="'+pal.trim+'" stroke-width="4"/>';
  return '<circle cx="49" cy="216" r="'+(v%2?18:21)+'" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="3"/>'+itemRune(item,'OffHand',pal,49,216,1)+(tier>=4?'<circle cx="49" cy="216" r="6" fill="'+pal.glow+'" opacity=".65" class="cb-paper-glow"/>':'');
}
function offHandMarkup(type,pal,v,tier,item){
  return offHandBaseMarkup(type,pal,v,tier,item)+betaOffhandDetail(item,pal,tier,type);
}
function paperOffHand(c,highlighted,layer){
  var item=itemForSlot(c,'OffHand'),tier=clampTier(item&&item.tier);if(!item)return'';
  if(item.slot&&item.slot!=='OffHand')return'';
  var pal=gearPalette(c,item,tier,'OffHand'),type=offHandType(item,c),v=pal.variant,isBack=type==='shield';
  if(layer==='back'&&!isBack)return'';if(layer==='front'&&isBack)return'';
  var fit=paperFit(c),gx=fit.offhandX||fit.leftHand||49,gy=fit.offhandY||fit.handY||279;
  var scale=type==='shield'?.86:type==='quiver'?.84:type==='dagger'?.90:type==='tome'?.82:type==='idol'?.78:.74;
  var transform='translate('+gx.toFixed(2)+' '+gy.toFixed(2)+') scale('+scale+') translate(-49 -244)';
  return '<g class="'+paperSlotClass('OffHand',highlighted,item)+'" data-offhand-type="'+esc(type)+'" data-item-key="'+esc(itemIdentity(item,'OffHand'))+'" data-render-layer="'+(isBack?'shield-back':'front-offhand')+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-alignment="v4" data-grip-x="'+gx.toFixed(2)+'" data-grip-y="'+gy.toFixed(2)+'" data-offhand-scale="'+scale.toFixed(2)+'" data-item-visuals="v2" data-palette-mode="'+pal.paletteMode+'" data-class-visual="'+esc(gearClassSlug(item))+'" transform="'+transform+'">'+offHandMarkup(type,pal,v,tier,item)+'</g>';
}
function paperAccessories(c,highlighted){
  var out='',fit=paperFit(c),lh=fit.leftHand||69,rh=fit.rightHand||171,hy=fit.handY||283,
      ring1=itemForSlot(c,'Ring1'),ring2=itemForSlot(c,'Ring2'),tr1=itemForSlot(c,'Trinket1'),tr2=itemForSlot(c,'Trinket2'),relic=itemForSlot(c,'Relic');
  if(ring1){var p1=gearPalette(c,ring1,clampTier(ring1.tier),'Ring1');out+='<g class="'+paperSlotClass('Ring1',highlighted,ring1)+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-alignment="v4" data-ring-x="'+lh.toFixed(2)+'" data-ring-y="'+(hy-1).toFixed(2)+'"><circle cx="'+lh+'" cy="'+(hy-1)+'" r="3.7" fill="none" stroke="'+p1.trim+'" stroke-width="2"/><circle cx="'+lh+'" cy="'+(hy-3)+'" r="1.2" fill="'+p1.glow+'"/></g>'}
  if(ring2){var p2=gearPalette(c,ring2,clampTier(ring2.tier),'Ring2');out+='<g class="'+paperSlotClass('Ring2',highlighted,ring2)+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-alignment="v4" data-ring-x="'+rh.toFixed(2)+'" data-ring-y="'+(hy-1).toFixed(2)+'"><circle cx="'+rh+'" cy="'+(hy-1)+'" r="3.7" fill="none" stroke="'+p2.trim+'" stroke-width="2"/><circle cx="'+rh+'" cy="'+(hy-3)+'" r="1.2" fill="'+p2.glow+'"/></g>'}
  var p=fit.p,waistHalf=Math.max(p.waist,p.hip*.70);
  if(tr1){var t1=gearPalette(c,tr1,clampTier(tr1.tier),'Trinket1'),tx=120-waistHalf*.48;out+='<g class="'+paperSlotClass('Trinket1',highlighted,tr1)+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-alignment="v4"><path d="M'+tx+' 252 L'+(tx-3)+' 278" stroke="'+t1.trim+'" stroke-width="2"/>'+itemRune(tr1,'Trinket1',t1,tx-4,282,.55)+'</g>'}
  if(tr2){var t2=gearPalette(c,tr2,clampTier(tr2.tier),'Trinket2'),tx2=120+waistHalf*.48;out+='<g class="'+paperSlotClass('Trinket2',highlighted,tr2)+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-alignment="v4"><path d="M'+tx2+' 252 L'+(tx2+3)+' 278" stroke="'+t2.trim+'" stroke-width="2"/>'+itemRune(tr2,'Trinket2',t2,tx2+4,282,.55)+'</g>'}
  if(relic){
    var pr=gearPalette(c,relic,clampTier(relic.tier),'Relic'),klass=paperClass(c),rx=120-(p.waist*.95);
    var relicMarkup=['Mage','Priest'].includes(klass)
      ?'<circle cx="'+rx+'" cy="229" r="9" fill="'+pr.dark+'" stroke="'+pr.trim+'" stroke-width="2.5"/>'+itemRune(relic,'Relic',pr,rx,229,.62)
      :'<path d="M'+(rx-7)+' 224 L'+(rx+6)+' 220 L'+(rx+9)+' 241 L'+(rx-4)+' 246Z" fill="'+pr.base+'" stroke="'+pr.trim+'" stroke-width="2.3"/>'+itemRune(relic,'Relic',pr,rx+1,233,.5);
    out+='<g class="'+paperSlotClass('Relic',highlighted,relic)+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-alignment="v4">'+relicMarkup+'</g>';
  }
  return out;
}
function dominantSetState(c){
  var counts={},items={};
  Object.values(c?.equipment||{}).forEach(function(item){
    if(!item)return;
    var id=setGroupId(c,item);
    if(!id)return;
    counts[id]=(counts[id]||0)+1;items[id]=item;
  });
  var ids=Object.keys(counts);if(!ids.length)return null;
  ids.sort(function(a,b){return counts[b]-counts[a]});
  var id=ids[0],item=items[id],visual=setVisual(c,item);
  return{id:id,count:counts[id],item:item,visual:visual};
}
function paperTierAura(c){
  var max=PAPER_VISIBLE_SLOTS.reduce(function(n,slot){var item=itemForSlot(c,slot);return Math.max(n,clampTier(item&&item.tier))},0);
  var set=dominantSetState(c),accent=set?.visual?.glow||paperAccent(c),out='';
  if(max>=4)out+='<ellipse cx="120" cy="390" rx="75" ry="13" fill="none" stroke="'+accent+'" stroke-width="2" opacity=".25" class="cb-paper-glow"/>';
  if(set&&set.count>=2)out+='<ellipse cx="120" cy="388" rx="'+(set.count>=4?88:79)+'" ry="'+(set.count>=4?18:15)+'" fill="none" stroke="'+accent+'" stroke-width="'+(set.count>=4?3:2)+'" opacity="'+(set.count>=4?.56:.36)+'" class="cb-paper-set-glow"/>';
  if(set&&set.count>=4)out+='<path d="M57 119 Q120 69 183 119" fill="none" stroke="'+accent+'" stroke-width="2.2" opacity=".32" class="cb-paper-set-glow"/>'+motifMarkup(set.visual.motif,120,112,1.15,accent);
  return out;
}
function paperDollSVG(c,opts){
  opts=opts||{};
  var showGear=opts.showGear!==false;
  c=showGear?c:Object.assign({},c,{equipment:{}});
  var race=c.race||(c.appearance&&c.appearance.race)||'Veyren';
  var a=normalizeAppearance(c.appearance||c,c.id||c.name||race,race);
  var r=raceDef(a.race),skin=r.skin[a.skinTone],eye=r.eyes[a.eyes],hair=HAIR[a.hairColor];
  var accent=opts.accent||paperAccent(c),highlighted=opts.highlightedSlot||'',profile=bodyProfile(race,a);
  var uid='pd'+hash((c.id||c.name||race)+'|'+JSON.stringify(a)).toString(36);
  var nw=profile.neck||14;
  var neck=paperRaceNeck(c,profile,skin);
  var hip=profile.hip||32;
  var under='<path d="M'+(120-hip)+' 236 Q120 250 '+(120+hip)+' 236 L'+(120+hip+1)+' 268 Q120 282 '+(120-hip-1)+' 268Z" fill="#162126" stroke="#10171b" stroke-width="3"/><path d="M'+(120-hip+6)+' 252 Q120 261 '+(120+hip-6)+' 252" fill="none" stroke="#526065" stroke-width="1.3" opacity=".36"/>';
  var headScale=profile.headScale||1,headX=70+(50*(1-headScale)),headY=29+(50*(1-headScale));
  return '<svg viewBox="0 0 240 410" data-race="'+esc(race)+'" data-model-mode="'+(showGear?'equipped':'base')+'" data-base-art="'+BASE_ART_CONTRACT+'" data-character-style="classic-paper-doll" data-race-identity="v2" data-equipment-fit="v4" data-item-visuals="v2" data-palette-mode="gear-owned" data-weapon-pose="side-held-v1" role="img" aria-hidden="true" focusable="false">'+
    '<defs><radialGradient id="'+uid+'a" cx="50%" cy="46%" r="54%"><stop offset="0%" stop-color="'+accent+'" stop-opacity=".13"/><stop offset="70%" stop-color="'+accent+'" stop-opacity=".025"/><stop offset="100%" stop-color="'+accent+'" stop-opacity="0"/></radialGradient></defs>'+
    '<ellipse cx="120" cy="214" rx="110" ry="180" fill="url(#'+uid+'a)"/>'+
    '<ellipse cx="120" cy="392" rx="'+Math.max(66,profile.shoulder+23)+'" ry="10" fill="#000" opacity=".38"/>'+
    paperTierAura(c)+
    paperLegs(c,skin,highlighted)+paperFeet(c,skin,highlighted)+
    paperOffHand(c,highlighted,'back')+
    paperRaceSilhouette(c,profile,skin)+paperArms(c,skin,highlighted)+under+paperChest(c,highlighted,skin)+paperWaist(c,highlighted)+paperShoulders(c,highlighted)+paperAccessories(c,highlighted)+
    neck+
    '<g transform="translate('+headX+' '+headY+') scale('+headScale+')">'+paperHeadMarkup(c,a,skin,eye,hair,highlighted)+'</g>'+
    paperOffHand(c,highlighted,'front')+paperWeapon(c,highlighted)+
    '</svg>';
}
function paperDollHTML(subject,opts){
  opts=opts||{};
  var c=subject||{},size=opts.size||'equipment',accent=opts.accent||paperAccent(c),set=dominantSetState(c);
  var label=opts.label||((c.name||'Character')+' equipment appearance');
  var showGear=opts.showGear!==false;
  var cls='cb-paper-doll cb-paper-doll--'+esc(size)+(set?' has-set set-pieces-'+Math.min(4,set.count):'')+(showGear?' is-equipped-model':' is-base-model');
  return '<span class="'+cls+'" style="--cbp-accent:'+accent+(set?' ;--cbp-set-glow:'+set.visual.glow:'')+'" role="img" aria-label="'+esc(label)+'">'+paperDollSVG(c,opts)+'</span>';
}
function visualProfile(subject,item,slot){
  var c=subject||{},s=slot||item?.slot||'Gear',tier=clampTier(item?.tier),pal=gearPalette(c,item,tier||1,s);
  return {key:itemIdentity(item,s),slot:s,tier:tier,variant:pal.variant,isSet:isSetItem(item),weaponType:s==='Weapon'?weaponType(item,c):null,offHandType:s==='OffHand'?offHandType(item,c):null,palette:pal};
}


function classicRace(subject){return typeof subject==='string'?subject:(subject?.race||subject?.appearance?.race||'Veyren')}
function classicBodyProfile(subject){return bodyProfile(classicRace(subject),typeof subject==='object'?subject.appearance:null)}
function classicGearFitProfile(subject){
  if(RIG?.gearFitProfile)return RIG.gearFitProfile(subject||{});
  var p=classicBodyProfile(subject),race=classicRace(subject),reach=Math.max(5.5,p.arm*.5),leftShoulder=120-p.shoulder,rightShoulder=120+p.shoulder,leftHand=leftShoulder-reach,baseRightHand=rightShoulder+reach;
  var weapon=subject?.equipment?.Weapon,type=weapon?weaponType(weapon,subject):'',long=['staff','spear','bow','crossbow'].includes(type),compact=['dagger','wand','focus','scepter','rod'].includes(type),offset=weapon?Math.max(long?22:compact?15:18,p.arm*(long?1.05:compact?.72:.86)):0;
  var sideMin=Math.min(194,rightShoulder+Math.max(4,p.arm*.15)),rightHand=weapon?Math.max(sideMin,Math.min(194,baseRightHand+offset)):baseRightHand,angle=weapon?(type==='bow'?6:type==='crossbow'?8:type==='staff'||type==='spear'?5:type==='dagger'?11:7):0;
  return {race,gender:Number(subject?.appearance?.gender)||0,frame:Number(subject?.appearance?.frame)||1,p,
    centerX:120,leftShoulder,rightShoulder,leftHand,rightHand,baseRightHand,
    waistHalf:p.waist||28,hipHalf:p.hip||32,leftLeg:120-p.hip*.38,rightLeg:120+p.hip*.38,legHalf:Math.max(8.5,(p.leg||14)*.62),calfHalf:Math.max(7.4,(p.leg||14)*.52),
    footHalf:(p.leg||14)*.8,weaponX:rightHand,weaponY:279,weaponAngle:angle,weaponPose:weapon?'side-held':'rest',weaponSideMin:sideMin,offhandX:leftHand,offhandY:279,handY:279};
}
function classicWeaponFitProfile(subject,item){
  var copy=subject&&typeof subject==='object'?Object.assign({},subject,{equipment:Object.assign({},subject.equipment||{},{Weapon:item||subject?.equipment?.Weapon})}):subject;
  var f=classicGearFitProfile(copy),t=weaponType(item,subject),long=['staff','spear','greatsword','bow','crossbow'].includes(t);
  return {anchorX:f.weaponX,anchorY:f.weaponY,pivotX:f.weaponX,pivotY:f.weaponY,rotate:f.weaponAngle||0,scale:long?1.04:1,pose:'side-held'};
}
function classicTierVisualProfile(value){
  var t=Math.max(1,Math.min(5,Math.round(Number(value?.tier||value)||1)));
  return {tier:t,shoulder:1+t*.08,chest:1+t*.06,collar:1+t*.05,weapon:1+t*.08};
}
function classicEquipmentCoverage(subject){return {hair:Boolean(itemForSlot(subject,'Head')),growth:Boolean(itemForSlot(subject,'Head'))}}
function classicAnchors(subject){return RIG?.anchors?RIG.anchors(subject||{}):{}}

window.CellboundPortraits={
  version:CHARACTER_MODEL_VERSION,raceIdentityVersion:RACE_IDENTITY_VERSION,equipmentFitVersion:EQUIPMENT_FIT_VERSION,weaponPoseVersion:WEAPON_POSE_VERSION,itemVisualsVersion:ITEM_VISUALS_VERSION,modelContract:CHARACTER_MODEL_CONTRACT,baseArtContract:BASE_ART_CONTRACT,equipmentLayerContract:EQUIPMENT_LAYER_CONTRACT,
  rigContract:RIG?.contract||'master-rig-v1',masterRigCount:RIG?.masterRigCount||12,masterRig:RIG?.masterRig,rig:RIG?.resolve,fitSlot:RIG?.fitSlot,
  anatomicalAnchors:classicAnchors,rigY:(race,y)=>RIG?.rigY?RIG.rigY(y):y,equipmentCoverage:classicEquipmentCoverage,appearanceVersion:1,
  RACES:RACES,COUNTS:COUNTS,CLASS_COLORS:CLASS_COLORS,CLASS_GEAR_STYLE:CLASS_GEAR_STYLE,SET_VISUALS:SET_VISUALS,
  normalizeAppearance:normalizeAppearance,randomAppearance:randomAppearance,
  applyToCharacter:applyToCharacter,portraitHTML:portraitHTML,paperDollHTML:paperDollHTML,paperDollSVG:paperDollSVG,
  bodyProfile:classicBodyProfile,gearFitProfile:classicGearFitProfile,weaponFitProfile:classicWeaponFitProfile,tierVisualProfile:classicTierVisualProfile,
  visualProfile:visualProfile,gearPalette:gearPalette,setVisual:setVisual,setGroupId:setGroupId,clothLowerStyle:clothLowerStyle,fitFamily:fitFamily,weaponType:weaponType,offHandType:offHandType,
  editorHTML:editorHTML,bindEditor:bindEditor
};
})();