(()=>{
'use strict';

const RIG=window.CellboundCharacterRig||null;
const CHARACTER_MODEL_VERSION=15;
const CHARACTER_MODEL_CONTRACT='classic-paper-doll-v1';
const BASE_ART_CONTRACT='classic-paper-doll-v1';
const EQUIPMENT_LAYER_CONTRACT='shield-back|body|armour|front-offhand|mainhand-front';
const RACE_IDENTITY_VERSION=1;
const EQUIPMENT_FIT_VERSION=2;

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
  if(race==='Stoneborn')return g?'M29 35 Q50 21 71 35 L70 66 Q66 82 50 88 Q34 82 30 66Z':'M27 35 Q50 19 73 35 L71 67 Q67 83 50 89 Q33 83 29 67Z';
  if(race==='Aelari')return g?'M35 31 Q50 18 65 31 L64 62 Q61 80 50 91 Q39 80 36 62Z':'M34 31 Q50 17 66 31 L65 63 Q61 81 50 91 Q39 81 35 63Z';
  if(race==='Thornkin')return g?'M32 34 Q49 20 68 33 L67 61 Q63 79 50 88 Q36 80 33 63Z':'M31 33 Q48 18 69 32 L68 62 Q64 81 50 89 Q35 81 32 64Z';
  if(race==='Emberkin')return g?'M31 34 L39 24 Q50 19 61 24 L69 34 L66 64 L58 82 L50 89 L42 82 L34 64Z':'M29 34 L39 22 Q50 18 61 22 L71 34 L67 65 L58 84 L50 91 L42 84 L33 65Z';
  if(race==='Nymari')return g?'M33 33 Q50 20 67 33 L67 60 Q63 77 50 87 Q37 77 33 60Z':'M32 33 Q50 19 68 33 L68 60 Q64 78 50 88 Q36 78 32 60Z';
  if(race==='Veyren')return g?'M33 33 Q50 19 67 33 L65 62 Q61 80 50 90 Q39 80 35 62Z':'M32 33 Q50 18 68 33 L66 63 Q62 82 50 91 Q38 82 34 63Z';
  return facePath(a?.face||0);
}
function earsMarkup(race,skin,feature){
  if(race==='Veyren')return '<path d="M34 43 L16 33 L30 57Z" fill="'+skin+'" stroke="#182027" stroke-width="2.2"/><path d="M66 43 L84 33 L70 57Z" fill="'+skin+'" stroke="#182027" stroke-width="2.2"/><path d="M29 45 L21 38 M71 45 L79 38" stroke="#a27bd1" stroke-width="1.3" opacity=".55"/>';
  if(race==='Stoneborn')return '<path d="M31 42 L21 38 L23 54 L32 56Z M69 42 L79 38 L77 54 L68 56Z" fill="'+skin+'" stroke="#182027" stroke-width="2.4"/><path d="M24 43 L30 47 M76 43 L70 47" stroke="#d9cec4" stroke-width="1.5" opacity=".45"/>';
  if(race==='Aelari'){
    var long=feature%2===0;
    return '<path d="'+(long?'M34 41 L11 27 L30 56Z':'M34 42 L16 31 L30 56Z')+'" fill="'+skin+'" stroke="#182027" stroke-width="2"/><path d="'+(long?'M66 41 L89 27 L70 56Z':'M66 42 L84 31 L70 56Z')+'" fill="'+skin+'" stroke="#182027" stroke-width="2"/><path d="M28 45 L17 35 M72 45 L83 35" stroke="#dfc8ff" stroke-width="1.4" opacity=".65"/>';
  }
  if(race==='Thornkin')return '<path d="M33 43 L20 34 L27 54Z M67 43 L80 34 L73 54Z" fill="#718457" stroke="#182027" stroke-width="2"/><path d="M25 39 L17 31 M75 39 L83 31" stroke="#8fa86b" stroke-width="3" stroke-linecap="round"/><path d="M18 31 l-5 -2 l3 6 M82 31 l5 -2 l-3 6" fill="#95b376"/>';
  if(race==='Emberkin')return '<path d="M33 43 L20 34 L29 56Z M67 43 L80 34 L71 56Z" fill="'+skin+'" stroke="#182027" stroke-width="2.2"/><path d="M25 42 L20 35 M75 42 L80 35" stroke="#ff8d55" stroke-width="1.6" opacity=".6"/>';
  if(race==='Nymari')return '<path d="M32 42 L13 31 L20 49 L12 57 L31 54Z M68 42 L87 31 L80 49 L88 57 L69 54Z" fill="#5fb7c2" stroke="#182027" stroke-width="2"/><path d="M18 37 L29 47 M82 37 L71 47" stroke="#a0f6f7" stroke-width="1.7" opacity=".72"/>';
  return '<ellipse cx="30" cy="49" rx="5" ry="8" fill="'+skin+'" stroke="#182027" stroke-width="2"/><ellipse cx="70" cy="49" rx="5" ry="8" fill="'+skin+'" stroke="#182027" stroke-width="2"/>';
}
function raceFaceDetails(a,eye){
  var race=a?.race||'Veyren';
  if(race==='Veyren')return '<path d="M35 42 L31 49 L35 55 M65 42 L69 49 L65 55" fill="none" stroke="#9e75cb" stroke-width="1.35" opacity=".55"/><circle cx="42" cy="52" r="3.7" fill="'+eye+'" opacity=".12"/><circle cx="58" cy="52" r="3.7" fill="'+eye+'" opacity=".12"/>';
  if(race==='Stoneborn')return '<path d="M34 39 L42 35 L50 38 L58 34 L67 39 M36 62 L43 58 M64 62 L57 58" fill="none" stroke="#e1d6cc" stroke-width="2" opacity=".32"/><path d="M31 47 H45 M55 47 H69" stroke="#3a3432" stroke-width="2.4" opacity=".55"/>';
  if(race==='Aelari')return '<path d="M36 44 Q42 40 47 43 M53 43 Q58 40 64 44" fill="none" stroke="#d8b8f0" stroke-width="1.6" opacity=".55"/><path d="M42 62 Q50 66 58 62" fill="none" stroke="#c7a9df" stroke-width="1.1" opacity=".38"/>';
  if(race==='Thornkin')return '<path d="M38 36 Q34 48 39 62 M62 36 Q66 48 61 62 M45 29 L43 39 M57 29 L58 39" fill="none" stroke="#536a43" stroke-width="1.7" opacity=".72"/><path d="M36 58 l-4 5 l6 -1 M64 58 l4 5 l-6 -1" fill="#7f9c62" opacity=".65"/>';
  if(race==='Emberkin')return '<path d="M36 38 L41 47 L38 56 L45 63 M64 38 L59 47 L62 56 L55 63 M48 30 L50 37 L53 31" fill="none" stroke="#ff8b4b" stroke-width="1.7" opacity=".78"/><circle cx="38" cy="56" r="1.7" fill="#ffc06a"/><circle cx="62" cy="56" r="1.7" fill="#ffc06a"/>';
  if(race==='Nymari')return '<path d="M31 57 H39 M29 61 H38 M61 57 H69 M62 61 H71" stroke="#8ef4f5" stroke-width="1.6" opacity=".7"/><path d="M40 37 Q50 32 60 37" fill="none" stroke="#70c6d2" stroke-width="1.2" opacity=".5"/>';
  return '';
}
function raceEyeMarkup(a,eye){
  var race=a?.race||'Veyren',rx=2.2,ry=2.8;
  if(race==='Nymari'){rx=2.8;ry=3.5}
  else if(race==='Aelari'){rx=2.15;ry=3.1}
  else if(race==='Stoneborn'){rx=2.2;ry=2.2}
  else if(race==='Veyren'){rx=2.5;ry=2.5}
  else if(race==='Emberkin'){rx=2.35;ry=2.6}
  return '<ellipse cx="42" cy="52" rx="'+rx+'" ry="'+ry+'" fill="'+eye+'"/><ellipse cx="58" cy="52" rx="'+rx+'" ry="'+ry+'" fill="'+eye+'"/><circle cx="42" cy="51.3" r=".7" fill="#f8ffff" opacity=".78"/><circle cx="58" cy="51.3" r=".7" fill="#f8ffff" opacity=".78"/>';
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
    return '<path d="M38 31 Q50 '+(22-f)+' 62 31" fill="none" stroke="#aa7add" stroke-width="1.6" opacity=".48"/><path d="M45 27 L50 '+(22-f)+' L55 27" fill="none" stroke="#c39cec" stroke-width="1.15" opacity=".5"/>';
  }
  if(race==='Stoneborn'){
    var y=31+(f%3)*2;
    return '<path d="M32 '+y+' L39 '+(y-5)+' L46 '+y+' L53 '+(y-6)+' L61 '+y+' L68 '+(y-4)+'" fill="none" stroke="#ddd1c6" stroke-width="'+(2.3+(f%2)*.5)+'" opacity=".55"/><path d="M34 53 L29 61 L36 66 M66 53 L71 61 L64 66" fill="none" stroke="#e7ddd4" stroke-width="1.6" opacity=".38"/>';
  }
  if(race==='Thornkin'){
    var thorn=f%4;
    if(thorn===0)return '<path d="M35 34 Q27 23 20 23 Q27 31 29 42 M65 34 Q73 23 80 23 Q73 31 71 42" fill="none" stroke="#6d8d51" stroke-width="4.5" stroke-linecap="round"/><path d="M21 24 l-6 -4 l2 8 M79 24 l6 -4 l-2 8" fill="#88a967"/>';
    if(thorn===1)return '<path d="M34 35 Q24 26 25 15 M66 35 Q76 26 75 15" fill="none" stroke="#6d8d51" stroke-width="4.5" stroke-linecap="round"/><circle cx="24" cy="15" r="4.5" fill="#91b56e"/><circle cx="76" cy="15" r="4.5" fill="#91b56e"/>';
    if(thorn===2)return '<path d="M35 34 L25 19 L29 11 M65 34 L75 19 L71 11" fill="none" stroke="#6d8d51" stroke-width="4.5" stroke-linecap="round"/><path d="M29 15 l-7 -2 l4 7 M71 15 l7 -2 l-4 7" fill="#8dab69"/>';
    return '<path d="M33 35 Q21 27 19 16 M67 35 Q79 27 81 16" fill="none" stroke="#6d8d51" stroke-width="4.5"/><path d="M22 23 l-8 -3 l5 8 M78 23 l8 -3 l-5 8" fill="#8fac6c"/>';
  }
  if(race==='Emberkin'){
    var horn='#3b2024';
    if(f%4===0)return '<path d="M35 35 Q26 20 30 10 Q40 20 42 31 M65 35 Q74 20 70 10 Q60 20 58 31" fill="'+horn+'" stroke="#e5754d" stroke-width="1.8"/>';
    if(f%4===1)return '<path d="M34 35 Q21 26 23 13 Q35 19 42 31 M66 35 Q79 26 77 13 Q65 19 58 31" fill="'+horn+'" stroke="#e5754d" stroke-width="1.8"/>';
    if(f%4===2)return '<path d="M37 32 L31 10 L44 29 M63 32 L69 10 L56 29" fill="'+horn+'" stroke="#e5754d" stroke-width="1.8"/>';
    return '<path d="M34 34 Q25 25 29 16 L40 31 M66 34 Q75 25 71 16 L60 31" fill="'+horn+'" stroke="#e5754d" stroke-width="1.8"/><circle cx="30" cy="16" r="2.2" fill="#ff9c48"/><circle cx="70" cy="16" r="2.2" fill="#ff9c48"/>';
  }
  if(race==='Nymari'){
    var fin='#62bdc7';
    if(f%4===0)return '<path d="M37 31 L31 14 L44 28 M63 31 L69 14 L56 28" fill="'+fin+'" stroke="#24515d" stroke-width="1" opacity=".84"/>';
    if(f%4===1)return '<path d="M40 29 L43 10 L49 28 M60 29 L57 10 L51 28" fill="'+fin+'" stroke="#24515d" stroke-width="1" opacity=".84"/>';
    if(f%4===2)return '<path d="M35 33 L21 22 L41 29 M65 33 L79 22 L59 29" fill="'+fin+'" stroke="#24515d" stroke-width="1" opacity=".84"/>';
    return '<path d="M38 30 L33 12 L45 27 M62 30 L67 12 L55 27" fill="'+fin+'" stroke="#24515d" stroke-width="1" opacity=".88"/><circle cx="50" cy="25" r="2.5" fill="#a5fbff"/>';
  }
  if(race==='Aelari'){
    return '<path d="M42 30 Q50 '+(17-f*2)+' 58 30" fill="none" stroke="#d9baff" stroke-width="1.8" opacity=".68"/><circle cx="50" cy="'+(25-f)+'" r="1.6" fill="#eadbff" opacity=".65"/>';
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

const SET_VISUALS={
  Warrior:{primary:'#b98355',secondary:'#6e2f2a',trim:'#e4bf72',glow:'#f2a861',motif:'chevron'},
  Paladin:{primary:'#d46f9e',secondary:'#6f3855',trim:'#f4d58b',glow:'#ffe6a8',motif:'sun'},
  Priest:{primary:'#dce9f4',secondary:'#7187a7',trim:'#f2d99b',glow:'#f5fbff',motif:'halo'},
  Druid:{primary:'#a86832',secondary:'#36573c',trim:'#d8c37a',glow:'#9be09a',motif:'leaf'},
  Hunter:{primary:'#688a48',secondary:'#33482c',trim:'#d4bd72',glow:'#b7e17f',motif:'arrow'},
  Rogue:{primary:'#6f672d',secondary:'#282834',trim:'#f0df70',glow:'#f9ef9a',motif:'fang'},
  Mage:{primary:'#337fa0',secondary:'#3d396f',trim:'#bd9ceb',glow:'#82e7ff',motif:'star'},
  Shaman:{primary:'#286a9f',secondary:'#254a56',trim:'#79c9d6',glow:'#93efff',motif:'chevron'},
  Warlock:{primary:'#65539a',secondary:'#302646',trim:'#a58ad9',glow:'#b99cff',motif:'star'},
  Monk:{primary:'#168f67',secondary:'#1f4b3c',trim:'#9ae3b4',glow:'#7dffc6',motif:'chevron'},
  'Death Knight':{primary:'#632631',secondary:'#20252d',trim:'#a9b7c8',glow:'#e24b62',motif:'chevron'},
  'Demon Hunter':{primary:'#64327f',secondary:'#241b31',trim:'#b967d5',glow:'#d87cff',motif:'chevron'},
  Evoker:{primary:'#287e70',secondary:'#183c3c',trim:'#7ac7ad',glow:'#79f0ca',motif:'chevron'}
};

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
  var klass=gearClass(item);
  var base=SET_VISUALS[klass]||{primary:'#687a78',secondary:'#182327',trim:'#c0ae7e',glow:'#9ab8b4',motif:'chevron'};
  var id=setGroupId(c,item);
  if(!id)return null;
  var shift=(hash(id)%5)-2;
  return {
    primary:shift>0?mixHex(base.primary,'#ffffff',shift*.035):mixHex(base.primary,'#080d11',Math.abs(shift)*.035),
    secondary:base.secondary,trim:base.trim,glow:base.glow,motif:base.motif,id:id
  };
}
function gearPalette(c,item,tier,slot){
  var accent=gearAccent(item);
  var t=Math.max(1,tier||1),set=setVisual(c,item),variant=visualVariant(item,slot,6);
  if(set)return{accent:set.primary,base:set.primary,dark:set.secondary,light:mixHex(set.primary,'#ffffff',.28),trim:set.trim,glow:set.glow,set:set,variant:variant};
  var bias=['#69767d','#785c49','#536c64','#6e5d78','#6e704e','#566c7b'][variant];
  var base=mixHex(accent,bias,.20+t*.018);
  return {
    accent:accent,
    base:mixHex(base,'#19242b',Math.max(.36,.66-t*.055)),
    dark:mixHex(base,'#080d11',.76),
    light:mixHex(base,'#f0dfad',Math.min(.17+t*.05,.42)),
    trim:t>=4?mixHex(accent,'#d8b976',.48):mixHex(accent,'#b9ad8c',.28+t*.055),
    glow:t>=4?mixHex(accent,'#ffffff',.28):accent,
    set:null,variant:variant
  };
}

function bodyProfile(race,appearance){
  if(RIG?.bodyProfile)return RIG.bodyProfile({race:race||appearance?.race||'Veyren',appearance:appearance||{}});
  var base=({
    Stoneborn:{shoulder:58,waist:36,hip:40,leg:19,arm:17.5,neck:20,headScale:1.07,hand:1.18},
    Aelari:{shoulder:40,waist:23,hip:28,leg:11.5,arm:9.8,neck:10.5,headScale:.96,hand:.90},
    Thornkin:{shoulder:50,waist:29,hip:33,leg:15.5,arm:13.8,neck:14.5,headScale:1.02,hand:1.02},
    Emberkin:{shoulder:51,waist:30,hip:33,leg:15.5,arm:14.2,neck:15,headScale:1.02,hand:1.04},
    Nymari:{shoulder:44,waist:26,hip:31,leg:13.5,arm:11.4,neck:12.5,headScale:.99,hand:.95},
    Veyren:{shoulder:46,waist:27,hip:31,leg:13.5,arm:11.6,neck:13,headScale:.99,hand:.97}
  })[race]||{shoulder:46,waist:28,hip:32,leg:14,arm:12,neck:14,headScale:1,hand:1};
  var p={...base};
  if(Number(appearance?.gender)===1){p.shoulder*=.95;p.waist*=.94;p.hip*=1.04;p.arm*=.94;p.hand*=.96;p.neck*=.94}
  return p;
}
function paperFit(c){
  if(RIG?.gearFitProfile)return RIG.gearFitProfile(c||{});
  var race=c?.race||c?.appearance?.race||'Veyren',p=bodyProfile(race,c?.appearance),reach=Math.max(5.5,p.arm*.5);
  return {race,gender:Number(c?.appearance?.gender)||0,frame:Number(c?.appearance?.frame)||1,p,centerX:120,
    leftShoulder:120-p.shoulder,rightShoulder:120+p.shoulder,
    leftHand:120-p.shoulder-reach,rightHand:120+p.shoulder+reach,handY:283,
    waistY:247,waistHalf:Math.max(p.waist,p.hip*.70),hipHalf:p.hip,
    leftLeg:120-p.hip*.47,rightLeg:120+p.hip*.47,legHalf:Math.max(10.5,p.leg*.82),footHalf:Math.max(10,p.leg*.72),
    weaponX:120+p.shoulder+reach,offhandX:120-p.shoulder-reach};
}
function paperRaceArmDetails(c,p,leftX,rightX){
  var race=c.race||c.appearance?.race||'Veyren';
  if(race==='Veyren')return '<g class="cb-paper-race-detail cb-paper-race-veyren"><path d="M'+(leftX-9)+' 180 L'+(leftX-14)+' 192 L'+(leftX-9)+' 203 M'+(rightX+9)+' 180 L'+(rightX+14)+' 192 L'+(rightX+9)+' 203" fill="none" stroke="#9d75c8" stroke-width="1.7" opacity=".55"/><circle cx="'+(leftX-11)+'" cy="214" r="2" fill="#b893dc" opacity=".5"/><circle cx="'+(rightX+11)+'" cy="214" r="2" fill="#b893dc" opacity=".5"/></g>';
  if(race==='Stoneborn')return '<g class="cb-paper-race-detail cb-paper-race-stoneborn"><path d="M'+(leftX-15)+' 174 L'+(leftX-4)+' 169 L'+(leftX-8)+' 190 L'+(leftX-18)+' 202Z M'+(rightX+15)+' 174 L'+(rightX+4)+' 169 L'+(rightX+8)+' 190 L'+(rightX+18)+' 202Z" fill="#c7b8ae" stroke="#514843" stroke-width="2" opacity=".72"/><path d="M'+(leftX-17)+' 219 L'+(leftX-7)+' 214 L'+(leftX-11)+' 237 M'+(rightX+17)+' 219 L'+(rightX+7)+' 214 L'+(rightX+11)+' 237" fill="none" stroke="#eee3da" stroke-width="2.2" opacity=".42"/></g>';
  if(race==='Thornkin')return '<g class="cb-paper-race-detail cb-paper-race-thornkin"><path d="M'+(leftX-10)+' 168 Q'+(leftX-23)+' 190 '+(leftX-13)+' 215 T'+(leftX-12)+' 247 M'+(rightX+10)+' 168 Q'+(rightX+23)+' 190 '+(rightX+13)+' 215 T'+(rightX+12)+' 247" fill="none" stroke="#6f8e54" stroke-width="3" opacity=".75"/><path d="M'+(leftX-17)+' 193 l-8 -6 l3 11 M'+(rightX+17)+' 193 l8 -6 l-3 11 M'+(leftX-15)+' 226 l-7 4 l8 2 M'+(rightX+15)+' 226 l7 4 l-8 2" fill="#91b16f" opacity=".85"/></g>';
  if(race==='Emberkin')return '<g class="cb-paper-race-detail cb-paper-race-emberkin"><path d="M'+(leftX-9)+' 171 l-7 17 l8 12 l-9 19 l7 15 M'+(rightX+9)+' 171 l7 17 l-8 12 l9 19 l-7 15" fill="none" stroke="#ff8148" stroke-width="2.2" opacity=".82"/><circle cx="'+(leftX-14)+'" cy="219" r="2.8" fill="#ffb35f" opacity=".72"/><circle cx="'+(rightX+14)+'" cy="219" r="2.8" fill="#ffb35f" opacity=".72"/></g>';
  if(race==='Nymari')return '<g class="cb-paper-race-detail cb-paper-race-nymari"><path d="M'+(leftX-11)+' 198 Q'+(leftX-31)+' 214 '+(leftX-17)+' 239 L'+(leftX-8)+' 220Z M'+(rightX+11)+' 198 Q'+(rightX+31)+' 214 '+(rightX+17)+' 239 L'+(rightX+8)+' 220Z" fill="#5dbbc5" stroke="#9ef5f5" stroke-width="1.5" opacity=".62"/><path d="M'+(leftX-15)+' 211 L'+(leftX-25)+' 223 M'+(rightX+15)+' 211 L'+(rightX+25)+' 223" stroke="#c0ffff" stroke-width="1.2" opacity=".7"/></g>';
  if(race==='Aelari')return '<g class="cb-paper-race-detail cb-paper-race-aelari"><path d="M'+(leftX-5)+' 175 Q'+(leftX-10)+' 207 '+(leftX-7)+' 239 M'+(rightX+5)+' 175 Q'+(rightX+10)+' 207 '+(rightX+7)+' 239" fill="none" stroke="#e2c8ff" stroke-width="1.5" opacity=".34"/><circle cx="'+(leftX-7)+'" cy="207" r="1.7" fill="#e9d8ff" opacity=".45"/><circle cx="'+(rightX+7)+'" cy="207" r="1.7" fill="#e9d8ff" opacity=".45"/></g>';
  return '';
}
function paperRaceTorsoDetails(c,p){
  var race=c.race||c.appearance?.race||'Veyren';
  if(race==='Veyren')return '<path d="M105 158 L112 171 L107 184 M135 158 L128 171 L133 184" fill="none" stroke="#956bc3" stroke-width="1.7" opacity=".45"/><path d="M116 203 L120 197 L124 203 L120 210Z" fill="none" stroke="#a983d1" stroke-width="1.5" opacity=".55"/>';
  if(race==='Stoneborn')return '<path d="M86 161 L103 151 L120 158 L138 149 L154 161 M94 193 L108 187 L120 194 L134 186 L147 193" fill="none" stroke="#e1d7cf" stroke-width="2.3" opacity=".34"/>';
  if(race==='Thornkin')return '<path d="M100 151 Q112 172 106 196 Q103 216 111 235 M140 151 Q128 172 134 196 Q137 216 129 235" fill="none" stroke="#617b4d" stroke-width="2.5" opacity=".62"/><path d="M107 183 l-8 -4 l5 9 M133 206 l8 -4 l-5 9" fill="#88a86b" opacity=".75"/>';
  if(race==='Emberkin')return '<path d="M101 151 L109 171 L104 186 L115 201 L110 225 M139 151 L131 171 L136 186 L125 201 L130 225" fill="none" stroke="#ff8148" stroke-width="2.1" opacity=".7"/><circle cx="115" cy="201" r="2.4" fill="#ffb45c" opacity=".68"/><circle cx="125" cy="201" r="2.4" fill="#ffb45c" opacity=".68"/>';
  if(race==='Nymari')return '<path d="M101 164 Q120 151 139 164 M98 178 Q120 165 142 178 M104 214 Q120 222 136 214" fill="none" stroke="#75d2d8" stroke-width="1.6" opacity=".48"/>';
  if(race==='Aelari')return '<path d="M110 155 Q120 166 130 155 M114 180 L120 188 L126 180" fill="none" stroke="#d9bcf4" stroke-width="1.5" opacity=".38"/>';
  return '';
}
function paperRaceLegDetails(c){
  var race=c.race||c.appearance?.race||'Veyren';
  if(race==='Stoneborn')return '<path d="M91 289 L103 282 L111 294 M129 294 L137 282 L149 289 M88 325 L101 318 M152 325 L139 318" fill="none" stroke="#ded3cb" stroke-width="2" opacity=".32"/>';
  if(race==='Thornkin')return '<path d="M95 276 Q87 305 94 338 M145 276 Q153 305 146 338" fill="none" stroke="#6c8953" stroke-width="2.5" opacity=".6"/><path d="M92 302 l-7 -4 l4 8 M148 315 l7 -4 l-4 8" fill="#8aa86b" opacity=".75"/>';
  if(race==='Emberkin')return '<path d="M96 281 L90 300 L97 316 L91 337 M144 281 L150 300 L143 316 L149 337" fill="none" stroke="#ff8047" stroke-width="2" opacity=".62"/>';
  if(race==='Nymari')return '<path d="M91 306 Q82 319 90 333 M149 306 Q158 319 150 333" fill="none" stroke="#7ddde1" stroke-width="2" opacity=".55"/>';
  if(race==='Aelari')return '<path d="M101 282 L98 334 M139 282 L142 334" stroke="#d6b9f0" stroke-width="1.2" opacity=".24"/>';
  if(race==='Veyren')return '<path d="M98 292 L93 301 L98 310 M142 292 L147 301 L142 310" fill="none" stroke="#936bc0" stroke-width="1.5" opacity=".34"/>';
  return '';
}
function paperRaceSilhouette(c,p,skin){
  var race=c.race||c.appearance?.race||'Veyren';
  if(race==='Stoneborn')return '<g class="cb-paper-race-silhouette cb-paper-race-stoneborn"><path d="M'+(120-p.shoulder-4)+' 148 L'+(120-p.shoulder-12)+' 138 L'+(120-p.shoulder-18)+' 151 M'+(120+p.shoulder+4)+' 148 L'+(120+p.shoulder+12)+' 138 L'+(120+p.shoulder+18)+' 151" fill="'+skin+'" stroke="#4b4340" stroke-width="4" stroke-linecap="round"/></g>';
  if(race==='Thornkin')return '<g class="cb-paper-race-silhouette cb-paper-race-thornkin"><path d="M70 170 L59 154 M61 158 l-8 1 l5 6 M170 170 L181 154 M179 158 l8 1 l-5 6" stroke="#739157" stroke-width="4" fill="none" stroke-linecap="round"/></g>';
  if(race==='Emberkin')return '<g class="cb-paper-race-silhouette cb-paper-race-emberkin"><path d="M70 166 L61 151 L75 158 M170 166 L179 151 L165 158" fill="#3b2223" stroke="#d96845" stroke-width="2"/><circle cx="64" cy="187" r="2.3" fill="#ff9c4d" opacity=".55"/><circle cx="176" cy="187" r="2.3" fill="#ff9c4d" opacity=".55"/></g>';
  if(race==='Nymari')return '<g class="cb-paper-race-silhouette cb-paper-race-nymari"><path d="M72 184 Q55 193 62 210 L74 201Z M168 184 Q185 193 178 210 L166 201Z" fill="#5ebbc6" stroke="#99eff1" stroke-width="1.4" opacity=".58"/></g>';
  if(race==='Aelari')return '<g class="cb-paper-race-silhouette cb-paper-race-aelari"><path d="M77 151 Q69 178 74 197 M163 151 Q171 178 166 197" fill="none" stroke="#d9bcf4" stroke-width="1.3" opacity=".24"/></g>';
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
  helmet+=itemRune(helm,'Head',pal,50,28,.7);
  if(tier>=4)helmet+='<circle cx="50" cy="25" r="2.6" fill="'+pal.glow+'" class="cb-paper-glow"/>';
  return base+'<g class="'+paperSlotClass('Head',highlighted,helm)+'" data-item-key="'+esc(itemIdentity(helm,'Head'))+'">'+helmet+'</g>';
}
function paperLegs(c,skin,highlighted){
  var item=itemForSlot(c,'Legs');
  var p=bodyProfile(c.race||c.appearance?.race||'Veyren',c.appearance);
  var sx=Math.max(.82,Math.min(1.32,((p.hip||32)/32)*.65+((p.leg||14)/14)*.35));
  var transform='translate(120 0) scale('+sx+' 1) translate(-120 0)';
  var base='<g class="cb-paper-underlayer cb-paper-base-legs" transform="'+transform+'">'+
    '<path d="M92 246 L116 246 L112 355 L84 355 Q84 322 89 286Z" fill="'+skin+'" stroke="#111820" stroke-width="2.4"/>'+
    '<path d="M124 246 L148 246 L156 355 L128 355 L124 286Z" fill="'+skin+'" stroke="#111820" stroke-width="2.4"/>'+
    paperRaceLegDetails(c)+'</g>';
  if(!item)return base;
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier||1,'Legs'),v=pal.variant,klass=gearClass(item);
  var heavy=['Warrior','Paladin','Death Knight'].includes(klass),cloth=['Mage','Priest','Druid','Warlock'].includes(klass);
  var gear='<g class="'+paperSlotClass('Legs',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Legs'))+'" transform="'+transform+'">'+
    '<path d="M91 247 L116 247 L112 354 L82 354 Q83 322 88 285Z" fill="'+pal.base+'" stroke="#111820" stroke-width="3"/>'+
    '<path d="M124 247 L149 247 L158 354 L128 354 L124 286Z" fill="'+pal.base+'" stroke="#111820" stroke-width="3"/>';
  if(heavy){
    gear+='<path d="M87 286 L115 286 L113 317 Q101 324 86 316Z M125 286 L153 286 L157 316 Q141 324 127 317Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="1.8" opacity=".92"/>';
  }else if(cloth){
    gear+='<path d="M87 250 Q120 273 153 250 L151 293 Q120 311 89 293Z" fill="'+pal.dark+'" opacity=".48"/>';
  }else{
    gear+=(v%2?'<path d="M93 268 L113 276 M127 276 L147 268" fill="none" stroke="'+pal.trim+'" stroke-width="3"/>':'<path d="M88 298 L111 304 M129 304 L152 298" fill="none" stroke="'+pal.trim+'" stroke-width="3"/>');
  }
  gear+=itemRune(item,'Legs',pal,101,286,.55)+itemRune(item,'Legs',pal,139,286,.55);
  if(pal.set)gear+='<path d="M88 323 L111 329 M129 329 L153 323" stroke="'+pal.glow+'" stroke-width="2.5" opacity=".7" class="cb-paper-set-glow"/>';
  return base+gear+'</g>';
}
function paperFeet(c,skin,highlighted){
  var item=itemForSlot(c,'Feet');
  var p=bodyProfile(c.race||c.appearance?.race||'Veyren',c.appearance);
  var sx=Math.max(.82,Math.min(1.32,((p.hip||32)/32)*.65+((p.leg||14)/14)*.35));
  var transform='translate(120 0) scale('+sx+' 1) translate(-120 0)';
  var base='<g class="cb-paper-underlayer cb-paper-base-feet" transform="'+transform+'">'+
    '<path d="M86 348 L111 348 L111 386 L76 386 Q74 377 84 370Z" fill="'+skin+'" stroke="#111820" stroke-width="2"/>'+
    '<path d="M129 348 L154 348 L164 386 L129 386 L129 369Z" fill="'+skin+'" stroke="#111820" stroke-width="2"/></g>';
  if(!item)return base;
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier||1,'Feet'),v=pal.variant,klass=gearClass(item),heavy=['Warrior','Paladin','Death Knight'].includes(klass);
  var gear='<g class="'+paperSlotClass('Feet',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Feet'))+'" transform="'+transform+'">'+
    '<path d="M81 344 L112 344 L113 389 L74 389 Q72 378 82 369Z" fill="'+pal.dark+'" stroke="#0c1115" stroke-width="3"/>'+
    '<path d="M128 344 L159 344 L166 389 L127 389 L127 368Z" fill="'+pal.dark+'" stroke="#0c1115" stroke-width="3"/>';
  if(heavy){
    gear+='<path d="M80 348 L112 348 L112 370 L77 370Z M128 348 L160 348 L163 370 L128 370Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="1.8"/>';
  }else{
    gear+='<path d="M79 '+(v%2?361:371)+' L111 '+(v%2?361:371)+' M129 '+(v%2?361:371)+' L161 '+(v%2?361:371)+'" stroke="'+pal.trim+'" stroke-width="3"/>';
  }
  if(pal.set)gear+='<path d="M77 383 L111 383 M129 383 L164 383" stroke="'+pal.glow+'" stroke-width="2.2" opacity=".8" class="cb-paper-set-glow"/>';
  return base+gear+'</g>';
}
function paperArms(c,skin,highlighted){
  var hands=itemForSlot(c,'Hands'),tier=clampTier(hands&&hands.tier),pal=gearPalette(c,hands,tier||1,'Hands');
  var fit=paperFit(c),p=fit.p,ls=fit.leftShoulder,rs=fit.rightShoulder,lh=fit.leftHand,rh=fit.rightHand,handY=fit.handY||283,aw=Math.max(5.5,p.arm*.48);
  var wristY=handY-23;
  var left='M'+(ls-aw)+' 148 Q'+(ls-aw-10)+' 181 '+(lh-aw)+' 226 Q'+(lh-aw-2)+' 246 '+(lh-aw*.35)+' '+wristY+' L'+(lh+aw*.35)+' '+wristY+' Q'+(lh+aw+2)+' 246 '+(ls+aw)+' 148Z';
  var right='M'+(rs+aw)+' 148 Q'+(rs+aw+10)+' 181 '+(rh+aw)+' 226 Q'+(rh+aw+2)+' 246 '+(rh+aw*.35)+' '+wristY+' L'+(rh-aw*.35)+' '+wristY+' Q'+(rh-aw-2)+' 246 '+(rs-aw)+' 148Z';
  var details=paperRaceArmDetails(c,p,ls,rs);
  var scale=p.hand||1,klass=gearClass(hands),heavy=['Warrior','Paladin','Death Knight'].includes(klass),bulk=heavy?4:0;
  var hw=(9.5*scale)+bulk,top=handY-26,bottom=handY+15;
  return '<g class="cb-paper-arms" data-fit-version="'+EQUIPMENT_FIT_VERSION+'"><path d="'+left+'" fill="'+skin+'" stroke="#182027" stroke-width="2.2"/><path d="'+right+'" fill="'+skin+'" stroke="#182027" stroke-width="2.2"/>'+
    '<ellipse cx="'+lh+'" cy="'+(handY-4)+'" rx="'+Math.max(5,aw*.72)+'" ry="'+Math.max(7,aw*.92)+'" fill="'+skin+'" opacity=".98"/><ellipse cx="'+rh+'" cy="'+(handY-4)+'" rx="'+Math.max(5,aw*.72)+'" ry="'+Math.max(7,aw*.92)+'" fill="'+skin+'" opacity=".98"/>'+details+'</g>'+
    '<g class="'+paperSlotClass('Hands',highlighted,hands)+'" data-item-key="'+esc(itemIdentity(hands,'Hands'))+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-left-hand-x="'+lh.toFixed(2)+'" data-right-hand-x="'+rh.toFixed(2)+'" data-hand-y="'+handY.toFixed(2)+'">'+
    '<path d="M'+(lh-hw)+' '+top+' Q'+lh+' '+(top-7)+' '+(lh+hw)+' '+top+' L'+(lh+hw*.72)+' '+bottom+' Q'+lh+' '+(bottom+8)+' '+(lh-hw*.72)+' '+bottom+'Z" fill="'+(tier?pal.base:skin)+'" stroke="#111820" stroke-width="2.2"/>'+
    '<path d="M'+(rh-hw)+' '+top+' Q'+rh+' '+(top-7)+' '+(rh+hw)+' '+top+' L'+(rh+hw*.72)+' '+bottom+' Q'+rh+' '+(bottom+8)+' '+(rh-hw*.72)+' '+bottom+'Z" fill="'+(tier?pal.base:skin)+'" stroke="#111820" stroke-width="2.2"/>'+
    (hands&&heavy?'<path d="M'+(lh-hw)+' '+(top+8)+' H'+(lh+hw)+' M'+(rh-hw)+' '+(top+8)+' H'+(rh+hw)+'" stroke="'+pal.trim+'" stroke-width="2.2"/>':'')+
    (hands?itemRune(hands,'Hands',pal,lh,handY-5,.48)+itemRune(hands,'Hands',pal,rh,handY-5,.48):'')+'</g>';
}
function paperChest(c,highlighted,skin){
  var item=itemForSlot(c,'Chest');
  var p=bodyProfile(c.race||c.appearance?.race||'Veyren',c.appearance),s=p.shoulder,w=p.waist,top=138,bottom=250;
  if(!item)return '<g class="cb-paper-underlayer cb-paper-empty-chest cb-paper-racial-torso"><path d="M'+(120-s+4)+' '+(top+5)+' Q120 '+(top-8)+' '+(120+s-4)+' '+(top+5)+' Q'+(120+s-3)+' 185 '+(120+w+2)+' '+bottom+' Q120 '+(bottom+12)+' '+(120-w-2)+' '+bottom+' Q'+(120-s+3)+' 185 '+(120-s+4)+' '+(top+5)+'Z" fill="'+skin+'" stroke="#10171b" stroke-width="2.5"/>'+paperRaceTorsoDetails(c,p)+'</g>';
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier||1,'Chest'),klass=gearClass(item);
  var heavy=['Warrior','Paladin','Death Knight'].includes(klass),cloth=['Mage','Priest','Druid','Warlock'].includes(klass),leather=['Hunter','Rogue','Demon Hunter','Monk'].includes(klass),mail=['Shaman','Evoker'].includes(klass),v=pal.variant;
  var gs=s+(heavy?6:mail?3:cloth?-2:1),gw=w+(heavy?4:mail?2:cloth?1:0),base=pal.base;
  var torso='<path d="M'+(120-gs)+' '+top+' Q120 '+(top-12)+' '+(120+gs)+' '+top+' Q'+(120+gs-1)+' 188 '+(120+gw)+' '+bottom+' Q120 '+(bottom+13)+' '+(120-gw)+' '+bottom+' Q'+(120-gs+1)+' 188 '+(120-gs)+' '+top+'Z" fill="'+base+'" stroke="#10171b" stroke-width="3"/>';
  if(heavy){
    torso+='<path d="M'+(120-gs+5)+' 151 L120 '+(v%2?174:181)+' L'+(120+gs-5)+' 151 L'+(120+gw-2)+' 225 L120 244 L'+(120-gw+2)+' 225Z" fill="'+pal.dark+'" opacity=".62"/><path d="M120 146 L120 239 M'+(120-gs+12)+' '+(v%2?190:181)+' L'+(120+gs-12)+' '+(v%2?190:181)+'" stroke="'+pal.trim+'" stroke-width="'+(tier>=3?3.2:2.2)+'" opacity=".88"/>';
  }else if(mail){
    torso+='<path d="M'+(120-gs+8)+' 158 Q120 172 '+(120+gs-8)+' 158 M'+(120-gw-3)+' 207 Q120 219 '+(120+gw+3)+' 207" fill="none" stroke="'+pal.trim+'" stroke-width="2.5" opacity=".78"/><path d="M'+(120-gw+2)+' 169 H'+(120+gw-2)+' M'+(120-gw)+' 182 H'+(120+gw)+' M'+(120-gw+1)+' 195 H'+(120+gw-1)+'" stroke="'+pal.light+'" stroke-width="1" opacity=".28"/>';
  }else if(cloth){
    torso+='<path d="M'+(120-gs+8)+' 155 Q120 '+(v%2?170:181)+' '+(120+gs-8)+' 155 M'+(120-gw-3)+' '+(v%2?219:211)+' Q120 '+(v%2?234:228)+' '+(120+gw+3)+' '+(v%2?219:211)+'" fill="none" stroke="'+pal.trim+'" stroke-width="'+(tier>=3?3:2)+'" opacity=".76"/><path d="M120 154 L120 237" stroke="'+pal.light+'" stroke-width="2" opacity=".35"/>';
  }else if(leather){
    torso+='<path d="M'+(120-gs+7)+' 164 L'+(120+gw-2)+' 224 M'+(120+gs-7)+' 164 L'+(120-gw+2)+' 224 M'+(120-gw-4)+' 217 L'+(120+gw+4)+' 217" fill="none" stroke="'+pal.trim+'" stroke-width="2.4" opacity=".72"/>';
  }else{
    torso+='<path d="M'+(120-gs+7)+' 166 Q120 '+(v%2?177:184)+' '+(120+gs-7)+' 166 M'+(120-gw-3)+' 222 L'+(120+gw+3)+' 222" fill="none" stroke="'+pal.trim+'" stroke-width="2.4" opacity=".7"/>';
  }
  torso+=itemRune(item,'Chest',pal,120,186,pal.set?.motif?1.05:.8);
  if(pal.set){
    torso+='<path d="M'+(120-gw+8)+' 202 Q120 218 '+(120+gw-8)+' 202" fill="none" stroke="'+pal.glow+'" stroke-width="2.4" opacity=".7" class="cb-paper-set-glow"/><path d="M'+(120-gw+10)+' 234 L120 244 L'+(120+gw-10)+' 234" fill="none" stroke="'+pal.trim+'" stroke-width="2.2"/>';
  }else if(tier>=4)torso+='<circle cx="120" cy="181" r="2.7" fill="'+pal.glow+'" class="cb-paper-glow"/>';
  return '<g class="'+paperSlotClass('Chest',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Chest'))+'">'+torso+'</g>';
}
function paperWaist(c,highlighted){
  var item=itemForSlot(c,'Waist');if(!item)return'';
  var fit=paperFit(c),p=fit.p,tier=clampTier(item.tier),pal=gearPalette(c,item,tier,'Waist'),v=pal.variant;
  var half=Math.max(p.waist*1.12,p.hip*.78),x1=120-half,x2=120+half,top=238,bottom=255,buckleW=v%2?14:18;
  return '<g class="'+paperSlotClass('Waist',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Waist'))+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-fit-left="'+x1.toFixed(2)+'" data-fit-right="'+x2.toFixed(2)+'">'+
    '<path d="M'+x1+' '+top+' Q120 '+(v%2?246:242)+' '+x2+' '+top+' L'+x2+' '+bottom+' Q120 263 '+x1+' '+bottom+'Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.4"/>'+
    '<rect x="'+(120-buckleW/2)+'" y="242" width="'+buckleW+'" height="12" rx="2" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2"/>'+
    itemRune(item,'Waist',pal,120,248,.45)+'</g>';
}
function paperShoulders(c,highlighted){
  var item=itemForSlot(c,'Shoulders'),tier=clampTier(item&&item.tier);
  if(!item)return'';
  var pal=gearPalette(c,item,tier,'Shoulders'),fit=paperFit(c),p=fit.p,s=(fit.rightShoulder-fit.leftShoulder)/2,v=pal.variant,klass=gearClass(item);
  var heavy=['Warrior','Paladin','Death Knight'].includes(klass),cloth=['Mage','Priest','Druid','Warlock'].includes(klass);
  var extent=(pal.set?22:tier>=4?18:tier>=3?14:10)+(heavy?5:cloth?-2:0);
  var rise=heavy?7:cloth?-1:2;
  var left=pal.set&&v%2
    ?'<path d="M'+(120-s-4)+' '+(145-rise)+' L'+(120-s-extent-3)+' '+(139-rise)+' L'+(120-s-extent)+' 159 L'+(120-s+7)+' 170 L'+(120-s+15)+' 148Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.7"/>'
    :'<path d="M'+(120-s-4)+' '+(146-rise)+' Q'+(120-s-extent)+' '+(141-rise)+' '+(120-s-extent)+' 159 L'+(120-s+7)+' 169 L'+(120-s+14)+' 148Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.5"/>';
  var right=pal.set&&v%2
    ?'<path d="M'+(120+s+4)+' '+(145-rise)+' L'+(120+s+extent+3)+' '+(139-rise)+' L'+(120+s+extent)+' 159 L'+(120+s-7)+' 170 L'+(120+s-15)+' 148Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.7"/>'
    :'<path d="M'+(120+s+4)+' '+(146-rise)+' Q'+(120+s+extent)+' '+(141-rise)+' '+(120+s+extent)+' 159 L'+(120+s-7)+' 169 L'+(120+s-14)+' 148Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.5"/>';
  return '<g class="'+paperSlotClass('Shoulders',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Shoulders'))+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-left-shoulder-x="'+fit.leftShoulder.toFixed(2)+'" data-right-shoulder-x="'+fit.rightShoulder.toFixed(2)+'">'+left+right+
    itemRune(item,'Shoulders',pal,120-s-3,154-rise*.35,.55)+itemRune(item,'Shoulders',pal,120+s+3,154-rise*.35,.55)+
    (pal.set?'<path d="M'+(120-s-18)+' '+(145-rise)+' L'+(120-s-25)+' '+(132-rise)+' M'+(120+s+18)+' '+(145-rise)+' L'+(120+s+25)+' '+(132-rise)+'" stroke="'+pal.glow+'" stroke-width="3" opacity=".7" class="cb-paper-set-glow"/>':'')+'</g>';
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
  if(pal.set)g+=motifMarkup(pal.set.motif,196,176,.7,pal.glow);
  else g+=itemRune(item,'Weapon',pal,196,176,.55);
  if(tier>=4&&!pal.set)g+='<circle cx="196" cy="176" r="2.4" fill="'+pal.glow+'" opacity=".6" class="cb-paper-glow"/>';
  return g;
}
function paperWeapon(c,highlighted){
  var item=itemForSlot(c,'Weapon'),tier=clampTier(item&&item.tier);
  if(!item)return'';
  var pal=gearPalette(c,item,tier,'Weapon'),type=weaponType(item,c),v=pal.variant,fit=paperFit(c);
  var gx=fit.weaponX||fit.rightHand||191,gy=fit.handY||283,dx=gx-191,dy=gy-244;
  return '<g class="'+paperSlotClass('Weapon',highlighted,item)+' cb-paper-front-weapon" data-weapon-type="'+esc(type)+'" data-item-key="'+esc(itemIdentity(item,'Weapon'))+'" data-render-layer="front" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-grip-x="'+gx.toFixed(2)+'" data-grip-y="'+gy.toFixed(2)+'" transform="translate('+dx.toFixed(2)+' '+dy.toFixed(2)+')">'+weaponMarkup(type,pal,v,tier,item)+'</g>';
}
function offHandMarkup(type,pal,v,tier,item){
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
function paperOffHand(c,highlighted,layer){
  var item=itemForSlot(c,'OffHand'),tier=clampTier(item&&item.tier);
  if(!item)return'';
  if(item.slot&&item.slot!=='OffHand')return'';
  var pal=gearPalette(c,item,tier,'OffHand'),type=offHandType(item,c),v=pal.variant,isBack=type==='shield';
  if(layer==='back'&&!isBack)return'';
  if(layer==='front'&&isBack)return'';
  var fit=paperFit(c),gx=fit.offhandX||fit.leftHand||49,gy=fit.handY||283,dx=gx-49,dy=gy-244;
  return '<g class="'+paperSlotClass('OffHand',highlighted,item)+'" data-offhand-type="'+esc(type)+'" data-item-key="'+esc(itemIdentity(item,'OffHand'))+'" data-render-layer="'+(isBack?'shield-back':'front-offhand')+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-grip-x="'+gx.toFixed(2)+'" data-grip-y="'+gy.toFixed(2)+'" transform="translate('+dx.toFixed(2)+' '+dy.toFixed(2)+')">'+offHandMarkup(type,pal,v,tier,item)+'</g>';
}
function paperAccessories(c,highlighted){
  var out='',fit=paperFit(c),lh=fit.leftHand||69,rh=fit.rightHand||171,hy=fit.handY||283,
      ring1=itemForSlot(c,'Ring1'),ring2=itemForSlot(c,'Ring2'),tr1=itemForSlot(c,'Trinket1'),tr2=itemForSlot(c,'Trinket2'),relic=itemForSlot(c,'Relic');
  if(ring1){var p1=gearPalette(c,ring1,clampTier(ring1.tier),'Ring1');out+='<g class="'+paperSlotClass('Ring1',highlighted,ring1)+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-ring-x="'+lh.toFixed(2)+'" data-ring-y="'+(hy-1).toFixed(2)+'"><circle cx="'+lh+'" cy="'+(hy-1)+'" r="3.7" fill="none" stroke="'+p1.trim+'" stroke-width="2"/><circle cx="'+lh+'" cy="'+(hy-3)+'" r="1.2" fill="'+p1.glow+'"/></g>'}
  if(ring2){var p2=gearPalette(c,ring2,clampTier(ring2.tier),'Ring2');out+='<g class="'+paperSlotClass('Ring2',highlighted,ring2)+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'" data-ring-x="'+rh.toFixed(2)+'" data-ring-y="'+(hy-1).toFixed(2)+'"><circle cx="'+rh+'" cy="'+(hy-1)+'" r="3.7" fill="none" stroke="'+p2.trim+'" stroke-width="2"/><circle cx="'+rh+'" cy="'+(hy-3)+'" r="1.2" fill="'+p2.glow+'"/></g>'}
  var p=fit.p,waistHalf=Math.max(p.waist,p.hip*.70);
  if(tr1){var t1=gearPalette(c,tr1,clampTier(tr1.tier),'Trinket1'),tx=120-waistHalf*.48;out+='<g class="'+paperSlotClass('Trinket1',highlighted,tr1)+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'"><path d="M'+tx+' 252 L'+(tx-3)+' 278" stroke="'+t1.trim+'" stroke-width="2"/>'+itemRune(tr1,'Trinket1',t1,tx-4,282,.55)+'</g>'}
  if(tr2){var t2=gearPalette(c,tr2,clampTier(tr2.tier),'Trinket2'),tx2=120+waistHalf*.48;out+='<g class="'+paperSlotClass('Trinket2',highlighted,tr2)+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'"><path d="M'+tx2+' 252 L'+(tx2+3)+' 278" stroke="'+t2.trim+'" stroke-width="2"/>'+itemRune(tr2,'Trinket2',t2,tx2+4,282,.55)+'</g>'}
  if(relic){
    var pr=gearPalette(c,relic,clampTier(relic.tier),'Relic'),klass=paperClass(c),rx=120-(p.waist*.95);
    var relicMarkup=['Mage','Priest'].includes(klass)
      ?'<circle cx="'+rx+'" cy="229" r="9" fill="'+pr.dark+'" stroke="'+pr.trim+'" stroke-width="2.5"/>'+itemRune(relic,'Relic',pr,rx,229,.62)
      :'<path d="M'+(rx-7)+' 224 L'+(rx+6)+' 220 L'+(rx+9)+' 241 L'+(rx-4)+' 246Z" fill="'+pr.base+'" stroke="'+pr.trim+'" stroke-width="2.3"/>'+itemRune(relic,'Relic',pr,rx+1,233,.5);
    out+='<g class="'+paperSlotClass('Relic',highlighted,relic)+'" data-fit-version="'+EQUIPMENT_FIT_VERSION+'">'+relicMarkup+'</g>';
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
  var neck='<path d="M'+(120-nw/2)+' 109 L'+(120-nw/2)+' 143 Q120 151 '+(120+nw/2)+' 143 L'+(120+nw/2)+' 109Z" fill="'+skin+'" stroke="#182027" stroke-width="2.5"/>';
  var hip=profile.hip||32;
  var under='<path d="M'+(120-hip)+' 236 Q120 250 '+(120+hip)+' 236 L'+(120+hip+1)+' 268 Q120 282 '+(120-hip-1)+' 268Z" fill="#162126" stroke="#10171b" stroke-width="3"/><path d="M'+(120-hip+6)+' 252 Q120 261 '+(120+hip-6)+' 252" fill="none" stroke="#526065" stroke-width="1.3" opacity=".36"/>';
  var headScale=profile.headScale||1,headX=70+(50*(1-headScale)),headY=20+(50*(1-headScale));
  return '<svg viewBox="0 0 240 410" data-race="'+esc(race)+'" data-model-mode="'+(showGear?'equipped':'base')+'" data-base-art="'+BASE_ART_CONTRACT+'" data-character-style="classic-paper-doll" data-race-identity="v1" data-equipment-fit="v2" role="img" aria-hidden="true" focusable="false">'+
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
  var p=classicBodyProfile(subject),race=classicRace(subject);
  return {race,gender:Number(subject?.appearance?.gender)||0,frame:Number(subject?.appearance?.frame)||1,p,
    centerX:120,leftShoulder:120-p.shoulder,rightShoulder:120+p.shoulder,leftHand:69,rightHand:171,
    waistHalf:p.waist||28,hipHalf:p.hip||32,leftLeg:105,rightLeg:135,legHalf:p.leg||14,calfHalf:p.leg||14,
    footHalf:(p.leg||14)*.8,weaponX:191,offhandX:49,handY:244};
}
function classicWeaponFitProfile(subject,item){
  var f=classicGearFitProfile(subject),t=weaponType(item,subject),long=['staff','spear','greatsword'].includes(t);
  return {anchorX:f.weaponX||191,anchorY:f.handY||244,pivotX:f.weaponX||191,pivotY:f.handY||244,rotate:t==='bow'?0:-4,scale:long?1.04:1};
}
function classicTierVisualProfile(value){
  var t=Math.max(1,Math.min(5,Math.round(Number(value?.tier||value)||1)));
  return {tier:t,shoulder:1+t*.08,chest:1+t*.06,collar:1+t*.05,weapon:1+t*.08};
}
function classicEquipmentCoverage(subject){return {hair:Boolean(itemForSlot(subject,'Head')),growth:Boolean(itemForSlot(subject,'Head'))}}
function classicAnchors(subject){return RIG?.anchors?RIG.anchors(subject||{}):{}}

window.CellboundPortraits={
  version:CHARACTER_MODEL_VERSION,raceIdentityVersion:RACE_IDENTITY_VERSION,equipmentFitVersion:EQUIPMENT_FIT_VERSION,modelContract:CHARACTER_MODEL_CONTRACT,baseArtContract:BASE_ART_CONTRACT,equipmentLayerContract:EQUIPMENT_LAYER_CONTRACT,
  rigContract:RIG?.contract||'master-rig-v1',masterRigCount:RIG?.masterRigCount||12,masterRig:RIG?.masterRig,rig:RIG?.resolve,fitSlot:RIG?.fitSlot,
  anatomicalAnchors:classicAnchors,rigY:(race,y)=>RIG?.rigY?RIG.rigY(y):y,equipmentCoverage:classicEquipmentCoverage,appearanceVersion:1,
  RACES:RACES,COUNTS:COUNTS,CLASS_COLORS:CLASS_COLORS,
  normalizeAppearance:normalizeAppearance,randomAppearance:randomAppearance,
  applyToCharacter:applyToCharacter,portraitHTML:portraitHTML,paperDollHTML:paperDollHTML,paperDollSVG:paperDollSVG,
  bodyProfile:classicBodyProfile,gearFitProfile:classicGearFitProfile,weaponFitProfile:classicWeaponFitProfile,tierVisualProfile:classicTierVisualProfile,
  visualProfile:visualProfile,weaponType:weaponType,offHandType:offHandType,
  editorHTML:editorHTML,bindEditor:bindEditor
};
})();