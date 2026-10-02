(()=>{
'use strict';

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
function earsMarkup(race,skin,feature){
  if(race==='Aelari'){
    var long=feature%2===0;
    return '<path d="'+(long?'M33 42 L17 31 L29 55 Z':'M32 43 L21 36 L29 54 Z')+'" fill="'+skin+'" stroke="#182027" stroke-width="2"/><path d="'+(long?'M67 42 L83 31 L71 55 Z':'M68 43 L79 36 L71 54 Z')+'" fill="'+skin+'" stroke="#182027" stroke-width="2"/>';
  }
  if(race==='Nymari'){
    return '<path d="M31 43 L18 37 L27 51 Z M69 43 L82 37 L73 51 Z" fill="'+skin+'" stroke="#182027" stroke-width="2"/><path d="M25 40 L19 34 M75 40 L81 34" stroke="#8beef0" stroke-width="2" opacity=".65"/>';
  }
  return '<ellipse cx="30" cy="49" rx="5" ry="8" fill="'+skin+'" stroke="#182027" stroke-width="2"/><ellipse cx="70" cy="49" rx="5" ry="8" fill="'+skin+'" stroke="#182027" stroke-width="2"/>';
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
  var f=a.feature;
  if(race==='Stoneborn'){
    var y=31+(f%3)*2;
    return '<path d="M35 '+y+' L41 '+(y-4)+' L47 '+y+' L53 '+(y-5)+' L60 '+y+' L66 '+(y-3)+'" fill="none" stroke="#d1c0b1" stroke-width="'+(2+(f%2))+'" opacity=".45"/><path d="M39 56 L35 61 M61 56 L65 61" stroke="#e2d5ca" stroke-width="1.4" opacity=".35"/>';
  }
  if(race==='Thornkin'){
    if(f===0)return '<path d="M34 34 Q28 23 21 24 Q28 31 29 42 M66 34 Q72 23 79 24 Q72 31 71 42" fill="none" stroke="#6e8d50" stroke-width="4" stroke-linecap="round"/>';
    if(f===1)return '<path d="M34 34 Q25 26 26 17 M66 34 Q75 26 74 17" fill="none" stroke="#6e8d50" stroke-width="4" stroke-linecap="round"/><circle cx="25" cy="17" r="4" fill="#8fb86d"/><circle cx="75" cy="17" r="4" fill="#8fb86d"/>';
    if(f===2)return '<path d="M35 33 L26 19 L30 13 M65 33 L74 19 L70 13" fill="none" stroke="#6e8d50" stroke-width="4" stroke-linecap="round"/>';
    return '<path d="M33 35 Q22 27 20 17 M67 35 Q78 27 80 17" fill="none" stroke="#6e8d50" stroke-width="4"/><path d="M22 23 l-7 -2 l5 7 M78 23 l7 -2 l-5 7" fill="#89a965"/>';
  }
  if(race==='Emberkin'){
    var horn='#3a2024';
    if(f===0)return '<path d="M35 34 Q28 20 31 12 Q39 21 41 31 M65 34 Q72 20 69 12 Q61 21 59 31" fill="'+horn+'" stroke="#d16a48" stroke-width="1.5"/>';
    if(f===1)return '<path d="M34 35 Q23 26 24 15 Q34 20 41 31 M66 35 Q77 26 76 15 Q66 20 59 31" fill="'+horn+'" stroke="#d16a48" stroke-width="1.5"/>';
    if(f===2)return '<path d="M37 32 L33 14 L43 29 M63 32 L67 14 L57 29" fill="'+horn+'" stroke="#d16a48" stroke-width="1.5"/>';
    return '<path d="M34 34 Q26 26 30 18 L39 31 M66 34 Q74 26 70 18 L61 31" fill="'+horn+'" stroke="#d16a48" stroke-width="1.5"/><circle cx="31" cy="18" r="2" fill="#ff9c48"/><circle cx="69" cy="18" r="2" fill="#ff9c48"/>';
  }
  if(race==='Nymari'){
    var fin='#5bbdc4';
    if(f===0)return '<path d="M36 31 L31 18 L43 29 M64 31 L69 18 L57 29" fill="'+fin+'" opacity=".65"/>';
    if(f===1)return '<path d="M39 29 L42 13 L48 28 M61 29 L58 13 L52 28" fill="'+fin+'" opacity=".7"/>';
    if(f===2)return '<path d="M35 33 L24 24 L40 29 M65 33 L76 24 L60 29" fill="'+fin+'" opacity=".65"/>';
    return '<path d="M38 30 L34 15 L44 27 M62 30 L66 15 L56 27" fill="'+fin+'" opacity=".72"/><circle cx="50" cy="26" r="2.3" fill="#9cf8ff"/>';
  }
  if(race==='Aelari'){
    return f===0?'':'<path d="M44 31 Q50 '+(20-f*2)+' 56 31" fill="none" stroke="#d9baff" stroke-width="1.7" opacity=".6"/>';
  }
  return f===0?'':'<path d="M43 31 Q50 '+(24-f)+' 57 31" fill="none" stroke="#d9c39c" stroke-width="1.4" opacity=".35"/>';
}
function svgFor(a,accent){
  var r=raceDef(a.race),skin=r.skin[a.skinTone],eye=r.eyes[a.eyes],hair=HAIR[a.hairColor];
  var uid='p'+hash(JSON.stringify(a)+'|'+accent).toString(36);
  var face=facePath(a.face);
  var bg1='#111a22',bg2='#080c11';
  return '<svg viewBox="0 0 100 100" role="img" aria-hidden="true" focusable="false">'+
    '<defs><radialGradient id="'+uid+'g" cx="50%" cy="35%" r="70%"><stop offset="0%" stop-color="'+accent+'" stop-opacity=".22"/><stop offset="62%" stop-color="'+bg1+'"/><stop offset="100%" stop-color="'+bg2+'"/></radialGradient><clipPath id="'+uid+'c"><rect x="2" y="2" width="96" height="96" rx="18"/></clipPath></defs>'+
    '<g clip-path="url(#'+uid+'c)"><rect x="2" y="2" width="96" height="96" rx="18" fill="url(#'+uid+'g)"/>'+
    '<circle cx="50" cy="30" r="30" fill="'+accent+'" opacity=".035"/>'+
    '<path d="M17 101 Q22 78 40 75 L60 75 Q78 78 83 101Z" fill="#1a252e" stroke="'+accent+'" stroke-opacity=".25" stroke-width="2"/>'+
    raceFeatureMarkup(a,a.race)+earsMarkup(a.race,skin,a.feature)+
    '<path d="'+face+'" fill="'+skin+'" stroke="#182027" stroke-width="2.4"/>'+
    hairMarkup(a,hair)+
    '<path d="M38 48 Q42 45 46 48 M54 48 Q58 45 62 48" fill="none" stroke="#242027" stroke-width="2" stroke-linecap="round"/>'+
    '<ellipse cx="42" cy="52" rx="2.2" ry="2.8" fill="'+eye+'"/><ellipse cx="58" cy="52" rx="2.2" ry="2.8" fill="'+eye+'"/>'+
    '<circle cx="42" cy="51.4" r=".65" fill="#f8ffff" opacity=".72"/><circle cx="58" cy="51.4" r=".65" fill="#f8ffff" opacity=".72"/>'+
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

const CLASS_RENDER={
  Warrior:{family:'plate',bulk:1.00,shoulder:1.05,head:'greathelm',drape:'split',edge:'hard'},
  Paladin:{family:'plate',bulk:1.06,shoulder:1.16,head:'crown',drape:'cape',edge:'round'},
  Priest:{family:'cloth',bulk:.78,shoulder:.86,head:'halo',drape:'robe',edge:'soft'},
  Druid:{family:'leather',bulk:.84,shoulder:.92,head:'antlers',drape:'leaf',edge:'organic'},
  Hunter:{family:'leather',bulk:.88,shoulder:.96,head:'hood',drape:'split',edge:'hard'},
  Rogue:{family:'leather',bulk:.80,shoulder:.82,head:'cowl',drape:'tails',edge:'sharp'},
  Mage:{family:'cloth',bulk:.76,shoulder:.84,head:'diadem',drape:'robe',edge:'soft'},
  Shaman:{family:'mail',bulk:.90,shoulder:1.02,head:'headdress',drape:'split',edge:'organic'},
  Warlock:{family:'cloth',bulk:.80,shoulder:.92,head:'horns',drape:'robe',edge:'sharp'},
  Monk:{family:'leather',bulk:.80,shoulder:.74,head:'band',drape:'sash',edge:'soft'},
  'Death Knight':{family:'plate',bulk:1.08,shoulder:1.18,head:'deathcrown',drape:'tattered',edge:'sharp'},
  'Demon Hunter':{family:'leather',bulk:.82,shoulder:.78,head:'blindfold',drape:'tails',edge:'sharp'},
  Evoker:{family:'mail',bulk:.88,shoulder:.96,head:'dragoncrown',drape:'split',edge:'organic'}
};
function gearProfile(item){
  return CLASS_RENDER[gearClass(item)]||{family:'leather',bulk:.86,shoulder:.9,head:'hood',drape:'split',edge:'soft'};
}
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

function bodyProfile(race){
  return ({
    Stoneborn:{shoulder:55,waist:34,hip:38,leg:19,arm:16,neck:18,headScale:1.05,hand:1.12},
    Aelari:{shoulder:42,waist:24,hip:28,leg:12,arm:10,neck:11,headScale:.98,hand:.92},
    Thornkin:{shoulder:49,waist:29,hip:33,leg:15,arm:13,neck:14,headScale:1.01,hand:1},
    Emberkin:{shoulder:49,waist:29,hip:32,leg:15,arm:13,neck:14,headScale:1.01,hand:1},
    Nymari:{shoulder:45,waist:27,hip:31,leg:14,arm:12,neck:13,headScale:1,hand:.98},
    Veyren:{shoulder:46,waist:29,hip:32,leg:14,arm:12,neck:14,headScale:1,hand:1}
  })[race]||{shoulder:46,waist:29,hip:32,leg:14,arm:12,neck:14,headScale:1,hand:1};
}
function paperRaceArmDetails(c,p,leftX,rightX){
  var race=c.race||c.appearance?.race||'Veyren';
  if(race==='Stoneborn')return '<g class="cb-paper-race-detail cb-paper-race-stoneborn"><path d="M'+(leftX-13)+' 181 L'+(leftX-5)+' 176 L'+(leftX-9)+' 191 L'+(leftX-16)+' 198 M'+(rightX+13)+' 181 L'+(rightX+5)+' 176 L'+(rightX+9)+' 191 L'+(rightX+16)+' 198" fill="none" stroke="#d4c8bf" stroke-width="2.4" opacity=".34"/><path d="M'+(leftX-15)+' 222 L'+(leftX-7)+' 218 L'+(leftX-10)+' 232 M'+(rightX+15)+' 222 L'+(rightX+7)+' 218 L'+(rightX+10)+' 232" fill="none" stroke="#eadfd6" stroke-width="1.8" opacity=".26"/></g>';
  if(race==='Thornkin')return '<g class="cb-paper-race-detail cb-paper-race-thornkin"><path d="M'+(leftX-10)+' 170 Q'+(leftX-22)+' 190 '+(leftX-13)+' 214 T'+(leftX-12)+' 244 M'+(rightX+10)+' 170 Q'+(rightX+22)+' 190 '+(rightX+13)+' 214 T'+(rightX+12)+' 244" fill="none" stroke="#7e9d62" stroke-width="2.1" opacity=".62"/><path d="M'+(leftX-16)+' 200 l-7 -5 l3 9 M'+(rightX+16)+' 200 l7 -5 l-3 9" fill="#8bac69" opacity=".78"/></g>';
  if(race==='Emberkin')return '<g class="cb-paper-race-detail cb-paper-race-emberkin"><path d="M'+(leftX-8)+' 174 l-6 16 l7 11 l-8 18 l6 14 M'+(rightX+8)+' 174 l6 16 l-7 11 l8 18 l-6 14" fill="none" stroke="#ff8b53" stroke-width="1.7" opacity=".62"/><circle cx="'+(leftX-12)+'" cy="219" r="2.2" fill="#ffb36b" opacity=".58"/><circle cx="'+(rightX+12)+'" cy="219" r="2.2" fill="#ffb36b" opacity=".58"/></g>';
  if(race==='Nymari')return '<g class="cb-paper-race-detail cb-paper-race-nymari"><path d="M'+(leftX-12)+' 205 Q'+(leftX-27)+' 218 '+(leftX-15)+' 235 L'+(leftX-8)+' 223Z M'+(rightX+12)+' 205 Q'+(rightX+27)+' 218 '+(rightX+15)+' 235 L'+(rightX+8)+' 223Z" fill="#5bc4cb" stroke="#93f4f5" stroke-width="1.2" opacity=".34"/><path d="M'+(leftX-13)+' 214 L'+(leftX-22)+' 223 M'+(rightX+13)+' 214 L'+(rightX+22)+' 223" stroke="#a9ffff" stroke-width="1" opacity=".52"/></g>';
  if(race==='Aelari')return '<g class="cb-paper-race-detail cb-paper-race-aelari"><path d="M'+(leftX-5)+' 177 Q'+(leftX-9)+' 208 '+(leftX-7)+' 236 M'+(rightX+5)+' 177 Q'+(rightX+9)+' 208 '+(rightX+7)+' 236" fill="none" stroke="#e1c7ff" stroke-width="1.2" opacity=".22"/></g>';
  return '';
}
function paperBackLayer(c){
  var chest=itemForSlot(c,'Chest')||itemForSlot(c,'Shoulders');
  if(!chest)return'';
  var tier=clampTier(chest.tier),pal=gearPalette(c,chest,tier||1,'Chest'),gp=gearProfile(chest),klass=gearClass(chest),out='';
  if(gp.drape==='cape'){
    out+='<path d="M86 153 Q120 139 154 153 L169 360 Q145 388 120 379 Q95 388 71 360Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.4" opacity=".92"/><path d="M92 162 Q120 150 148 162 L155 348 Q137 367 120 360 Q103 367 85 348Z" fill="'+pal.base+'" opacity=".5"/>';
  }else if(gp.drape==='robe'){
    out+='<path d="M91 221 Q120 235 149 221 L169 372 Q145 395 120 386 Q95 395 71 372Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.2" opacity=".88"/><path d="M120 235 L120 377" stroke="'+pal.light+'" stroke-width="1.6" opacity=".28"/>';
  }else if(gp.drape==='leaf'){
    out+='<path d="M92 217 Q73 255 82 330 Q95 354 108 371 L117 240Z M148 217 Q167 255 158 330 Q145 354 132 371 L123 240Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.1" opacity=".86"/><path d="M84 286 q-15 9 -4 22 q15 -4 15 -18 M156 286 q15 9 4 22 q-15 -4 -15 -18" fill="'+pal.trim+'" opacity=".35"/>';
  }else if(gp.drape==='tattered'){
    out+='<path d="M88 185 Q120 168 152 185 L164 346 L151 335 L141 365 L126 347 L113 374 L99 345 L83 362 L76 334Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.2" opacity=".9"/>';
  }else if(gp.drape==='tails'){
    out+='<path d="M98 226 L116 238 L106 369 L89 347Z M142 226 L124 238 L134 369 L151 347Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2" opacity=".88"/>';
  }else if(gp.drape==='sash'){
    out+='<path d="M101 236 Q120 248 139 236 L149 278 L132 334 L120 310 L108 334 L91 278Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2" opacity=".86"/>';
  }else{
    out+='<path d="M98 224 L116 238 L109 351 L94 366 L87 342Z M142 224 L124 238 L131 351 L146 366 L153 342Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2" opacity=".82"/>';
  }
  if(klass==='Demon Hunter'&&tier>=3)out+='<path d="M89 170 Q55 211 73 249 M151 170 Q185 211 167 249" fill="none" stroke="'+pal.glow+'" stroke-width="3" opacity=".26"/>';
  if(klass==='Evoker'&&tier>=4)out+='<path d="M88 180 Q60 210 73 258 L96 230Z M152 180 Q180 210 167 258 L144 230Z" fill="'+pal.base+'" stroke="'+pal.glow+'" stroke-width="2" opacity=".34"/>';
  return '<g class="cb-paper-back-layer" data-gear-class="'+esc(klass)+'">'+out+'</g>';
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
function classHeadGearMarkup(item,pal,tier){
  var gp=gearProfile(item),out='';
  if(gp.head==='crown'){
    out='<path d="M27 43 Q29 22 50 18 Q71 22 73 43 L66 37 Q50 30 34 37Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.8"/><path d="M34 28 L40 13 L49 23 L58 11 L66 29" fill="'+pal.trim+'" opacity=".95"/>'+motifMarkup('sun',50,28,.7,pal.glow);
  }else if(gp.head==='halo'){
    out='<path d="M31 42 Q33 24 50 21 Q67 24 69 42 Q61 34 50 34 Q39 34 31 42Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.1"/><ellipse cx="50" cy="15" rx="'+(tier>=4?18:14)+'" ry="5" fill="none" stroke="'+pal.glow+'" stroke-width="2.5" class="cb-paper-set-glow"/>';
  }else if(gp.head==='antlers'){
    out='<path d="M31 42 Q34 24 50 21 Q66 24 69 42" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.2"/><path d="M38 29 Q26 18 29 5 M31 17 L22 10 M62 29 Q74 18 71 5 M69 17 L78 10" fill="none" stroke="'+pal.trim+'" stroke-width="4" stroke-linecap="round"/>';
  }else if(gp.head==='hood'){
    out='<path d="M26 45 Q27 19 50 16 Q73 19 74 45 L67 60 L61 45 Q50 36 39 45 L33 60Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.4"/><path d="M33 34 Q50 20 67 34" fill="none" stroke="'+pal.light+'" stroke-width="2" opacity=".7"/>';
  }else if(gp.head==='cowl'){
    out='<path d="M27 45 Q28 17 50 16 Q72 17 73 45 L66 58 L60 45 Q50 37 40 45 L34 58Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.4"/>'+motifMarkup('fang',50,28,.58,pal.glow);
  }else if(gp.head==='diadem'){
    out='<path d="M31 37 Q50 24 69 37" fill="none" stroke="'+pal.trim+'" stroke-width="4"/><path d="M50 19 L56 29 L50 37 L44 29Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2"/>'+motifMarkup('star',50,28,.65,pal.glow);
  }else if(gp.head==='headdress'){
    out='<path d="M28 43 Q31 20 50 18 Q69 20 72 43 L64 36 L50 32 L36 36Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.5"/><path d="M29 28 L17 22 L28 39 M71 28 L83 22 L72 39" fill="'+pal.trim+'" opacity=".74"/><path d="M42 24 L50 12 L58 24" fill="'+pal.light+'" stroke="'+pal.trim+'" stroke-width="1.6"/>';
  }else if(gp.head==='horns'){
    out='<path d="M29 43 Q31 21 50 18 Q69 21 71 43 L64 36 Q50 29 36 36Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.3"/><path d="M37 27 Q27 11 31 5 Q42 14 43 28 M63 27 Q73 11 69 5 Q58 14 57 28" fill="'+pal.dark+'" stroke="'+pal.glow+'" stroke-width="2"/>';
  }else if(gp.head==='band'){
    out='<path d="M29 37 Q50 28 71 37 L69 43 Q50 35 31 43Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2"/><path d="M68 40 L78 53 L69 50Z" fill="'+pal.trim+'" opacity=".8"/>';
  }else if(gp.head==='deathcrown'){
    out='<path d="M27 44 Q29 18 50 15 Q71 18 73 44 L65 38 Q50 29 35 38Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.8"/><path d="M31 28 L24 12 L41 24 M69 28 L76 12 L59 24 M50 21 L50 6" fill="none" stroke="'+pal.trim+'" stroke-width="4"/><circle cx="50" cy="25" r="3" fill="'+pal.glow+'" class="cb-paper-glow"/>';
  }else if(gp.head==='blindfold'){
    out='<path d="M29 43 Q31 24 50 20 Q69 24 71 43" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.2"/><path d="M31 47 Q50 39 69 47 L66 58 Q50 51 34 58Z" fill="'+pal.dark+'" stroke="'+pal.glow+'" stroke-width="2"/>';
  }else if(gp.head==='dragoncrown'){
    out='<path d="M30 42 Q33 22 50 19 Q67 22 70 42" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.4"/><path d="M35 29 L27 13 L43 25 M65 29 L73 13 L57 25 M46 22 L50 10 L54 22" fill="'+pal.trim+'" opacity=".9"/>';
  }else{
    out='<path d="M27 44 Q29 18 50 16 Q71 18 73 44 L65 38 Q50 30 35 38Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.6"/><path d="M33 31 L50 20 L67 31" fill="none" stroke="'+pal.light+'" stroke-width="2"/>';
  }
  if(tier>=3)out+=itemRune(item,'Head',pal,50,29,.66);
  return out;
}
function paperHeadMarkup(c,a,skin,eye,hair,highlighted){
  var helm=itemForSlot(c,'Head'),tier=clampTier(helm&&helm.tier),pal=gearPalette(c,helm,tier,'Head');
  var face=facePath(a.face);
  var base='<g class="cb-paper-head">'+raceFeatureMarkup(a,a.race)+earsMarkup(a.race,skin,a.feature)+
    '<path d="'+face+'" fill="'+skin+'" stroke="#182027" stroke-width="2.4"/>'+hairMarkup(a,hair)+
    '<path d="M38 48 Q42 45 46 48 M54 48 Q58 45 62 48" fill="none" stroke="#242027" stroke-width="2" stroke-linecap="round"/>'+
    '<ellipse cx="42" cy="52" rx="2.2" ry="2.8" fill="'+eye+'"/><ellipse cx="58" cy="52" rx="2.2" ry="2.8" fill="'+eye+'"/>'+
    '<circle cx="42" cy="51.4" r=".65" fill="#f8ffff" opacity=".72"/><circle cx="58" cy="51.4" r=".65" fill="#f8ffff" opacity=".72"/>'+
    '<path d="M50 53 L47.5 63 Q50 65 53 63" fill="none" stroke="#5c423b" stroke-opacity=".55" stroke-width="1.4" stroke-linecap="round"/>'+
    '<path d="M43 69 Q50 72 57 69" fill="none" stroke="#5a3236" stroke-width="1.7" stroke-linecap="round"/>'+
    markingMarkup(a,a.race)+beardMarkup(a,hair)+(a.race==='Emberkin'?'<path d="M37 59 Q50 64 63 59" fill="none" stroke="#ff8a45" stroke-width="1" opacity=".28"/>':'')+
    (a.race==='Nymari'?'<circle cx="35" cy="58" r="1.3" fill="#8ffcff" opacity=".7"/><circle cx="65" cy="58" r="1.3" fill="#8ffcff" opacity=".7"/>':'')+'</g>';
  if(!helm)return base;
  return base+'<g class="'+paperSlotClass('Head',highlighted,helm)+'" data-item-key="'+esc(itemIdentity(helm,'Head'))+'">'+classHeadGearMarkup(helm,pal,tier)+'</g>';
}
function paperLegs(c,skin,highlighted){
  var item=itemForSlot(c,'Legs'),p=bodyProfile(c.race||c.appearance?.race||'Veyren'),sx=Math.max(.88,Math.min(1.18,(p.leg||14)/14)),transform='translate(120 0) scale('+sx+' 1) translate(-120 0)';
  var base='<g class="cb-paper-underlayer cb-paper-empty-legs cb-paper-base-legs" transform="'+transform+'"><path d="M92 246 L116 246 L112 355 L84 355 Q84 322 89 286Z" fill="#1a2327" stroke="#111820" stroke-width="2.4"/><path d="M124 246 L148 246 L156 355 L128 355 L124 286Z" fill="#1a2327" stroke="#111820" stroke-width="2.4"/><path d="M96 270 L112 274 M128 274 L144 270" stroke="#303b40" stroke-width="1.5" opacity=".55"/></g>';
  if(!item)return base;
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier||1,'Legs'),v=pal.variant,klass=gearClass(item),gp=gearProfile(item);
  var gear='<g class="'+paperSlotClass('Legs',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Legs'))+'" transform="'+transform+'"><path d="M91 247 L116 247 L112 354 L82 354 Q83 322 88 285Z" fill="'+pal.base+'" stroke="#111820" stroke-width="3"/><path d="M124 247 L149 247 L158 354 L128 354 L124 286Z" fill="'+pal.base+'" stroke="#111820" stroke-width="3"/>';
  if(gp.family==='plate'){
    gear+='<path d="M87 284 L115 284 L113 318 Q101 326 86 316Z M125 284 L153 284 L157 316 Q141 326 127 318Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2"/><path d="M89 321 L111 326 M129 326 L153 321" stroke="'+pal.light+'" stroke-width="1.6" opacity=".45"/>';
  }else if(gp.family==='cloth'){
    gear+='<path d="M86 249 Q120 276 154 249 L151 300 Q120 318 89 300Z" fill="'+pal.dark+'" opacity=".55" stroke="'+pal.trim+'" stroke-width="1.4"/>';
  }else if(gp.family==='mail'){
    gear+='<path d="M90 272 H113 M127 272 H150 M88 286 H112 M128 286 H152" stroke="'+pal.trim+'" stroke-width="1.6" opacity=".58"/>';
  }else{
    gear+=(v%2?'<path d="M93 268 L113 276 M127 276 L147 268" fill="none" stroke="'+pal.trim+'" stroke-width="3"/>':'<path d="M88 298 L111 304 M129 304 L152 298" fill="none" stroke="'+pal.trim+'" stroke-width="3"/>');
  }
  if(klass==='Paladin')gear+=motifMarkup('sun',101,302,.5,pal.glow)+motifMarkup('sun',139,302,.5,pal.glow);
  else if(klass==='Druid')gear+='<path d="M91 307 q10 -8 20 1 M149 307 q-10 -8 -20 1" fill="none" stroke="'+pal.glow+'" stroke-width="2"/>';
  else if(klass==='Hunter')gear+='<path d="M89 292 L111 315 M151 292 L129 315" stroke="'+pal.trim+'" stroke-width="2"/>';
  else if(klass==='Shaman')gear+='<path d="M91 311 H110 M130 311 H149" stroke="'+pal.glow+'" stroke-width="2"/>';
  else if(klass==='Death Knight')gear+='<path d="M88 300 l8 -8 l8 8 l8 -8 M152 300 l-8 -8 l-8 8 l-8 -8" fill="none" stroke="'+pal.glow+'" stroke-width="2"/>';
  else gear+=itemRune(item,'Legs',pal,101,286,.5)+itemRune(item,'Legs',pal,139,286,.5);
  return base+gear+'</g>';
}
function paperFeet(c,skin,highlighted){
  var item=itemForSlot(c,'Feet'),p=bodyProfile(c.race||c.appearance?.race||'Veyren'),sx=Math.max(.88,Math.min(1.18,(p.leg||14)/14)),transform='translate(120 0) scale('+sx+' 1) translate(-120 0)';
  var base='<g class="cb-paper-underlayer cb-paper-empty-feet cb-paper-base-feet" transform="'+transform+'"><path d="M86 348 L111 348 L111 386 L76 386 Q74 377 84 370Z" fill="#202a2d" stroke="#111820" stroke-width="2"/><path d="M129 348 L154 348 L164 386 L129 386 L129 369Z" fill="#202a2d" stroke="#111820" stroke-width="2"/></g>';
  if(!item)return base;
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier||1,'Feet'),v=pal.variant,klass=gearClass(item),gp=gearProfile(item);
  var extra=gp.family==='plate'?4:gp.family==='mail'?2:0;
  var gear='<g class="'+paperSlotClass('Feet',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Feet'))+'" transform="'+transform+'"><path d="M'+(81-extra)+' '+(344-extra)+' L'+(112+extra)+' '+(344-extra)+' L113 389 L74 389 Q72 378 82 369Z" fill="'+pal.dark+'" stroke="#0c1115" stroke-width="3"/><path d="M'+(128-extra)+' '+(344-extra)+' L'+(159+extra)+' '+(344-extra)+' L166 389 L127 389 L127 368Z" fill="'+pal.dark+'" stroke="#0c1115" stroke-width="3"/>';
  if(gp.family==='plate')gear+='<path d="M78 347 L113 347 L112 370 L76 370Z M128 347 L162 347 L164 370 L128 370Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="1.8"/><path d="M79 374 L111 374 M130 374 L162 374" stroke="'+pal.light+'" stroke-width="1.5" opacity=".5"/>';
  else if(gp.family==='mail')gear+='<path d="M80 353 L112 353 M129 353 L160 353" stroke="'+pal.trim+'" stroke-width="2.2"/>';
  else gear+='<path d="M79 '+(v%2?361:371)+' L111 '+(v%2?361:371)+' M129 '+(v%2?361:371)+' L161 '+(v%2?361:371)+'" stroke="'+pal.trim+'" stroke-width="3"/>';
  if(klass==='Paladin')gear+=motifMarkup('sun',95,363,.42,pal.glow)+motifMarkup('sun',145,363,.42,pal.glow);
  if(klass==='Demon Hunter')gear+='<path d="M76 383 l-8 -5 l8 -4 M164 383 l8 -5 l-8 -4" fill="'+pal.glow+'" opacity=".55"/>';
  return base+gear+'</g>';
}
function paperArms(c,skin,highlighted){
  var hands=itemForSlot(c,'Hands'),tier=clampTier(hands&&hands.tier),pal=gearPalette(c,hands,tier||1,'Hands');
  var p=bodyProfile(c.race||c.appearance?.race||'Veyren'),shoulder=p.shoulder,arm=p.arm,leftX=120-shoulder,rightX=120+shoulder,aw=Math.max(5.5,arm*.48);
  var left='M'+(leftX-aw)+' 148 Q'+(leftX-aw-10)+' 176 '+(leftX-aw-11)+' 207 Q'+(leftX-aw-10)+' 232 '+(leftX-aw-5)+' 263 L'+(leftX+aw-1)+' 263 Q'+(leftX+aw-3)+' 232 '+(leftX+aw+4)+' 207 Q'+(leftX+aw+5)+' 177 '+(leftX+aw)+' 148Z';
  var right='M'+(rightX+aw)+' 148 Q'+(rightX+aw+10)+' 176 '+(rightX+aw+11)+' 207 Q'+(rightX+aw+10)+' 232 '+(rightX+aw+5)+' 263 L'+(rightX-aw+1)+' 263 Q'+(rightX-aw+3)+' 232 '+(rightX-aw-4)+' 207 Q'+(rightX-aw-5)+' 177 '+(rightX-aw)+' 148Z';
  var body='<g class="cb-paper-arms"><path d="'+left+'" fill="'+skin+'" stroke="#182027" stroke-width="2.2"/><path d="'+right+'" fill="'+skin+'" stroke="#182027" stroke-width="2.2"/>'+paperRaceArmDetails(c,p,leftX,rightX)+'</g>';
  if(!hands)return body+'<g class="cb-paper-underlayer cb-paper-empty-hands"><ellipse cx="'+(leftX-8)+'" cy="276" rx="8" ry="12" fill="'+skin+'" stroke="#111820" stroke-width="2"/><ellipse cx="'+(rightX+8)+'" cy="276" rx="8" ry="12" fill="'+skin+'" stroke="#111820" stroke-width="2"/></g>';
  var gp=gearProfile(hands),klass=gearClass(hands),scale=p.hand||1,bulk=gp.family==='plate'?5:gp.family==='mail'?3:gp.family==='cloth'?-1:1,hw=10*scale+bulk,hh=(gp.family==='plate'?35:gp.family==='mail'?32:27)*scale;
  var gear='<g class="'+paperSlotClass('Hands',highlighted,hands)+'" data-item-key="'+esc(itemIdentity(hands,'Hands'))+'">'+
    '<path d="M'+(leftX-hw-5)+' 255 Q'+(leftX-hw/2)+' 249 '+leftX+' 258 L'+(leftX-2)+' '+(258+hh)+' Q'+(leftX-hw-2)+' '+(291+bulk)+' '+(leftX-hw-8)+' '+(279+bulk)+'Z" fill="'+pal.base+'" stroke="#10171b" stroke-width="2.4"/>'+
    '<path d="M'+(rightX+hw+5)+' 255 Q'+(rightX+hw/2)+' 249 '+rightX+' 258 L'+(rightX+2)+' '+(258+hh)+' Q'+(rightX+hw+2)+' '+(291+bulk)+' '+(rightX+hw+8)+' '+(279+bulk)+'Z" fill="'+pal.base+'" stroke="#10171b" stroke-width="2.4"/>';
  if(gp.family==='plate')gear+='<path d="M'+(leftX-hw-4)+' 264 L'+(leftX+1)+' 269 M'+(rightX+hw+4)+' 264 L'+(rightX-1)+' 269" stroke="'+pal.trim+'" stroke-width="2.4"/><path d="M'+(leftX-hw-3)+' 278 L'+(leftX-2)+' 283 M'+(rightX+hw+3)+' 278 L'+(rightX+2)+' 283" stroke="'+pal.light+'" stroke-width="1.5" opacity=".5"/>';
  else if(gp.family==='mail')gear+='<path d="M'+(leftX-hw)+' 266 H'+(leftX+2)+' M'+(rightX-hw+2)+' 266 H'+(rightX+hw)+'" stroke="'+pal.trim+'" stroke-width="2"/>';
  else gear+='<path d="M'+(leftX-hw+2)+' 268 L'+(leftX+1)+' 273 M'+(rightX+hw-2)+' 268 L'+(rightX-1)+' 273" stroke="'+pal.trim+'" stroke-width="2"/>';
  if(klass==='Paladin')gear+=motifMarkup('sun',leftX-8,274,.45,pal.glow)+motifMarkup('sun',rightX+8,274,.45,pal.glow);
  else if(klass==='Druid')gear+='<path d="M'+(leftX-13)+' 273 q-9 5 -4 13 M'+(rightX+13)+' 273 q9 5 4 13" fill="none" stroke="'+pal.trim+'" stroke-width="2"/>';
  else if(klass==='Shaman')gear+='<path d="M'+(leftX-12)+' 273 l6 7 l6 -7 M'+(rightX+12)+' 273 l-6 7 l-6 -7" fill="none" stroke="'+pal.glow+'" stroke-width="1.8"/>';
  else if(klass==='Death Knight'||klass==='Demon Hunter')gear+='<path d="M'+(leftX-13)+' 270 l-7 8 l8 -1 M'+(rightX+13)+' 270 l7 8 l-8 -1" fill="'+pal.trim+'" opacity=".75"/>';
  else gear+=itemRune(hands,'Hands',pal,leftX-8,273,.46)+itemRune(hands,'Hands',pal,rightX+8,273,.46);
  return body+gear+'</g>';
}
function paperChest(c,highlighted){
  var item=itemForSlot(c,'Chest');
  var p=bodyProfile(c.race||c.appearance?.race||'Veyren'),s=p.shoulder,w=p.waist,top=138,bottom=250;
  if(!item)return '<g class="cb-paper-underlayer cb-paper-empty-chest"><path d="M'+(120-s+4)+' '+(top+5)+' Q120 '+(top-8)+' '+(120+s-4)+' '+(top+5)+' Q'+(120+s-3)+' 185 '+(120+w+2)+' '+bottom+' Q120 '+(bottom+12)+' '+(120-w-2)+' '+bottom+' Q'+(120-s+3)+' 185 '+(120-s+4)+' '+(top+5)+'Z" fill="#1b272a" stroke="#10171b" stroke-width="2.5"/><path d="M'+(120-s+13)+' 158 Q120 171 '+(120+s-13)+' 158 M120 166 L120 236" fill="none" stroke="#445358" stroke-width="1.5" opacity=".5"/></g>';
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier||1,'Chest'),klass=gearClass(item),gp=gearProfile(item),v=pal.variant;
  var gs=s+(gp.bulk-1)*18,gw=w+(gp.bulk-1)*8;
  if(gp.family==='plate'){gs+=7;gw+=4}else if(gp.family==='mail'){gs+=4;gw+=2}else if(gp.family==='cloth'){gs-=2;gw+=1}
  var torso='<path d="M'+(120-gs)+' '+top+' Q120 '+(top-13)+' '+(120+gs)+' '+top+' Q'+(120+gs-1)+' 188 '+(120+gw)+' '+bottom+' Q120 '+(bottom+14)+' '+(120-gw)+' '+bottom+' Q'+(120-gs+1)+' 188 '+(120-gs)+' '+top+'Z" fill="'+pal.base+'" stroke="#0e1519" stroke-width="3"/>'+
    '<path d="M'+(120-gs+5)+' 150 Q120 141 '+(120+gs-5)+' 150" fill="none" stroke="'+pal.light+'" stroke-width="2" opacity=".42"/>';
  if(gp.family==='plate'){
    torso+='<path d="M'+(120-gs+5)+' 153 L120 '+(v%2?174:181)+' L'+(120+gs-5)+' 153 L'+(120+gw-2)+' 225 L120 244 L'+(120-gw+2)+' 225Z" fill="'+pal.dark+'" opacity=".64"/><path d="M120 146 L120 239 M'+(120-gs+12)+' '+(v%2?190:181)+' L'+(120+gs-12)+' '+(v%2?190:181)+'" stroke="'+pal.trim+'" stroke-width="'+(tier>=3?3.2:2.2)+'" opacity=".9"/><path d="M'+(120-gs+13)+' 165 Q120 197 '+(120+gs-13)+' 165" fill="none" stroke="'+pal.light+'" stroke-width="1.5" opacity=".28"/>';
  }else if(gp.family==='mail'){
    torso+='<path d="M'+(120-gs+7)+' 158 Q120 173 '+(120+gs-7)+' 158 M'+(120-gw-3)+' 207 Q120 220 '+(120+gw+3)+' 207" fill="none" stroke="'+pal.trim+'" stroke-width="2.5" opacity=".8"/><path d="M'+(120-gw+2)+' 169 H'+(120+gw-2)+' M'+(120-gw)+' 181 H'+(120+gw)+' M'+(120-gw+1)+' 193 H'+(120+gw-1)+' M'+(120-gw+3)+' 205 H'+(120+gw-3)+'" stroke="'+pal.light+'" stroke-width="1" opacity=".3"/>';
  }else if(gp.family==='cloth'){
    torso+='<path d="M'+(120-gs+8)+' 155 Q120 '+(v%2?170:181)+' '+(120+gs-8)+' 155 M'+(120-gw-5)+' '+(v%2?219:211)+' Q120 '+(v%2?234:228)+' '+(120+gw+5)+' '+(v%2?219:211)+'" fill="none" stroke="'+pal.trim+'" stroke-width="'+(tier>=3?3:2)+'" opacity=".78"/><path d="M120 154 L120 237" stroke="'+pal.light+'" stroke-width="2" opacity=".38"/>';
  }else{
    torso+='<path d="M'+(120-gs+7)+' 164 L'+(120+gw-2)+' 224 M'+(120+gs-7)+' 164 L'+(120-gw+2)+' 224 M'+(120-gw-4)+' 217 L'+(120+gw+4)+' 217" fill="none" stroke="'+pal.trim+'" stroke-width="2.4" opacity=".74"/>';
  }
  if(klass==='Paladin')torso+='<path d="M120 154 V231 M'+(120-gw+5)+' 198 H'+(120+gw-5)+'" stroke="'+pal.trim+'" stroke-width="2.7" opacity=".9"/>'+motifMarkup('sun',120,188,tier>=4?1.3:1,pal.glow);
  else if(klass==='Warrior')torso+='<path d="M'+(120-gw+4)+' 177 L120 160 L'+(120+gw-4)+' 177 L'+(120+gw-8)+' 220 L120 235 L'+(120-gw+8)+' 220Z" fill="none" stroke="'+pal.trim+'" stroke-width="2.3" opacity=".78"/>';
  else if(klass==='Priest')torso+='<path d="M103 173 Q120 162 137 173 Q120 198 103 173Z" fill="none" stroke="'+pal.glow+'" stroke-width="2" opacity=".8"/>'+motifMarkup('halo',120,204,.9,pal.trim);
  else if(klass==='Druid')torso+='<path d="M103 164 Q92 189 106 216 M137 164 Q148 189 134 216" fill="none" stroke="'+pal.trim+'" stroke-width="3" opacity=".65"/>'+motifMarkup('leaf',120,190,1,pal.glow);
  else if(klass==='Hunter')torso+='<path d="M'+(120-gs+8)+' 165 L'+(120+gw-6)+' 226 M'+(120+gs-8)+' 165 L'+(120-gw+6)+' 226" stroke="'+pal.trim+'" stroke-width="3" opacity=".76"/>'+motifMarkup('arrow',120,190,.9,pal.glow);
  else if(klass==='Rogue')torso+='<path d="M103 160 L137 216 M137 160 L103 216" stroke="'+pal.trim+'" stroke-width="2" opacity=".5"/>'+motifMarkup('fang',120,190,.85,pal.glow);
  else if(klass==='Mage')torso+=motifMarkup('star',120,186,1.15,pal.glow)+'<path d="M105 208 Q120 219 135 208" fill="none" stroke="'+pal.trim+'" stroke-width="2"/>';
  else if(klass==='Shaman')torso+='<path d="M98 185 Q120 204 142 185 M103 211 Q120 224 137 211" fill="none" stroke="'+pal.trim+'" stroke-width="2.4"/><path d="M120 161 L112 174 L120 184 L128 174Z" fill="'+pal.glow+'" opacity=".7"/>';
  else if(klass==='Warlock')torso+='<path d="M103 169 Q120 149 137 169 L131 216 Q120 231 109 216Z" fill="'+pal.dark+'" opacity=".45"/>'+motifMarkup('star',120,190,.95,pal.glow);
  else if(klass==='Monk')torso+='<path d="M102 166 Q120 180 138 166 M104 211 Q120 199 136 211" fill="none" stroke="'+pal.trim+'" stroke-width="2.3"/><circle cx="120" cy="190" r="8" fill="none" stroke="'+pal.glow+'" stroke-width="2"/>';
  else if(klass==='Death Knight')torso+='<path d="M98 163 L112 177 L120 160 L128 177 L142 163 L136 224 L120 241 L104 224Z" fill="'+pal.dark+'" opacity=".62" stroke="'+pal.trim+'" stroke-width="1.8"/><circle cx="120" cy="189" r="5" fill="'+pal.glow+'" class="cb-paper-glow"/>';
  else if(klass==='Demon Hunter')torso+='<path d="M101 171 L115 184 L106 213 M139 171 L125 184 L134 213" fill="none" stroke="'+pal.glow+'" stroke-width="2.4" opacity=".74"/>';
  else if(klass==='Evoker')torso+='<path d="M100 166 Q120 178 140 166 L136 214 Q120 226 104 214Z" fill="none" stroke="'+pal.trim+'" stroke-width="2.4"/><path d="M106 180 L120 166 L134 180 L120 196Z" fill="'+pal.glow+'" opacity=".4"/>';
  else torso+=itemRune(item,'Chest',pal,120,188,.85);
  if(tier>=4)torso+='<path d="M'+(120-gw+8)+' 233 L120 244 L'+(120+gw-8)+' 233" fill="none" stroke="'+pal.trim+'" stroke-width="2"/>';
  return '<g class="'+paperSlotClass('Chest',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Chest'))+'">'+torso+'</g>';
}
function paperWaist(c,highlighted){
  var item=itemForSlot(c,'Waist');if(!item)return'';
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier,'Waist'),v=pal.variant,klass=gearClass(item),gp=gearProfile(item),p=bodyProfile(c.race||c.appearance?.race||'Veyren'),w=p.waist+(gp.bulk-1)*7;
  var out='<path d="M'+(120-w-3)+' 237 Q120 '+(v%2?246:242)+' '+(120+w+3)+' 237 L'+(120+w+2)+' 255 Q120 264 '+(120-w-2)+' 255Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.4"/><rect x="111" y="241" width="18" height="13" rx="3" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2"/>'+itemRune(item,'Waist',pal,120,248,.48);
  if(['Paladin','Priest','Mage','Warlock','Shaman','Evoker'].includes(klass))out+='<path d="M110 255 L116 320 L120 337 L124 320 L130 255Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="1.8" opacity=".9"/>';
  if(klass==='Warrior'||klass==='Death Knight')out+='<path d="M'+(120-w-7)+' 246 L'+(120-w+1)+' 262 M'+(120+w+7)+' 246 L'+(120+w-1)+' 262" stroke="'+pal.trim+'" stroke-width="4"/>';
  if(klass==='Hunter'||klass==='Rogue'||klass==='Demon Hunter')out+='<path d="M'+(120-w)+' 247 L'+(120-w-8)+' 270 M'+(120+w)+' 247 L'+(120+w+8)+' 270" stroke="'+pal.trim+'" stroke-width="3"/>';
  if(klass==='Monk')out+='<path d="M'+(120+w)+' 247 Q157 271 147 319" fill="none" stroke="'+pal.trim+'" stroke-width="5" stroke-linecap="round"/>';
  if(klass==='Druid')out+='<path d="M'+(120-w)+' 251 q-14 12 -2 25 q15 -5 13 -20 M'+(120+w)+' 251 q14 12 2 25 q-15 -5 -13 -20" fill="'+pal.trim+'" opacity=".48"/>';
  return '<g class="'+paperSlotClass('Waist',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Waist'))+'">'+out+'</g>';
}
function paperShoulders(c,highlighted){
  var item=itemForSlot(c,'Shoulders'),tier=clampTier(item&&item.tier);
  if(!item)return'';
  var pal=gearPalette(c,item,tier,'Shoulders'),p=bodyProfile(c.race||c.appearance?.race||'Veyren'),s=p.shoulder,v=pal.variant,klass=gearClass(item),gp=gearProfile(item);
  var extent=(pal.set?22:tier>=4?18:tier>=3?14:10)*gp.shoulder+(gp.family==='plate'?5:gp.family==='cloth'?-1:1);
  var rise=(gp.family==='plate'?8:gp.family==='mail'?4:gp.family==='cloth'?0:2)+(tier>=5?2:0);
  var lx=120-s,rx=120+s;
  var left='<path d="M'+(lx-4)+' '+(146-rise)+' Q'+(lx-extent)+' '+(139-rise)+' '+(lx-extent-2)+' 158 L'+(lx+6)+' 171 L'+(lx+15)+' 148Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.7"/>';
  var right='<path d="M'+(rx+4)+' '+(146-rise)+' Q'+(rx+extent)+' '+(139-rise)+' '+(rx+extent+2)+' 158 L'+(rx-6)+' 171 L'+(rx-15)+' 148Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.7"/>';
  var detail='';
  if(klass==='Paladin')detail=motifMarkup('sun',lx-5,153-rise*.3,.65,pal.glow)+motifMarkup('sun',rx+5,153-rise*.3,.65,pal.glow);
  else if(klass==='Priest')detail='<path d="M'+(lx-6)+' '+(151-rise)+' q6 -13 12 0 M'+(rx-6)+' '+(151-rise)+' q6 -13 12 0" fill="none" stroke="'+pal.glow+'" stroke-width="2"/>';
  else if(klass==='Druid')detail='<path d="M'+(lx-9)+' '+(145-rise)+' q-16 -14 -18 -25 M'+(rx+9)+' '+(145-rise)+' q16 -14 18 -25" fill="none" stroke="'+pal.trim+'" stroke-width="4" stroke-linecap="round"/>';
  else if(klass==='Hunter')detail='<path d="M'+(lx-10)+' '+(149-rise)+' l-14 -10 l6 18 M'+(rx+10)+' '+(149-rise)+' l14 -10 l-6 18" fill="'+pal.trim+'" opacity=".75"/>';
  else if(klass==='Rogue')detail='<path d="M'+(lx-10)+' '+(153-rise)+' l-10 -6 l9 14 M'+(rx+10)+' '+(153-rise)+' l10 -6 l-9 14" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="1.5"/>';
  else if(klass==='Mage')detail=motifMarkup('star',lx-4,153-rise*.3,.58,pal.glow)+motifMarkup('star',rx+4,153-rise*.3,.58,pal.glow);
  else if(klass==='Shaman')detail='<path d="M'+(lx-6)+' '+(150-rise)+' l-11 8 l8 6 M'+(rx+6)+' '+(150-rise)+' l11 8 l-8 6" fill="none" stroke="'+pal.glow+'" stroke-width="2.4"/>';
  else if(klass==='Warlock')detail='<path d="M'+(lx-6)+' '+(145-rise)+' q-12 -15 -8 -25 M'+(rx+6)+' '+(145-rise)+' q12 -15 8 -25" fill="none" stroke="'+pal.glow+'" stroke-width="3"/>';
  else if(klass==='Monk')detail='<circle cx="'+lx+'" cy="'+(155-rise)+'" r="4" fill="none" stroke="'+pal.glow+'" stroke-width="2"/><circle cx="'+rx+'" cy="'+(155-rise)+'" r="4" fill="none" stroke="'+pal.glow+'" stroke-width="2"/>';
  else if(klass==='Death Knight')detail='<path d="M'+(lx-extent)+' '+(145-rise)+' l-9 -16 l16 8 M'+(rx+extent)+' '+(145-rise)+' l9 -16 l-16 8" fill="'+pal.trim+'" opacity=".9"/>';
  else if(klass==='Demon Hunter')detail='<path d="M'+(lx-5)+' '+(150-rise)+' l-11 -8 l5 15 M'+(rx+5)+' '+(150-rise)+' l11 -8 l-5 15" fill="'+pal.glow+'" opacity=".55"/>';
  else if(klass==='Evoker')detail='<path d="M'+(lx-extent+3)+' '+(148-rise)+' l-11 -12 l17 4 M'+(rx+extent-3)+' '+(148-rise)+' l11 -12 l-17 4" fill="'+pal.light+'" opacity=".55"/>';
  else detail=itemRune(item,'Shoulders',pal,lx-3,154-rise*.3,.55)+itemRune(item,'Shoulders',pal,rx+3,154-rise*.3,.55);
  return '<g class="'+paperSlotClass('Shoulders',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Shoulders'))+'">'+left+right+detail+(tier>=5?'<path d="M'+(lx-extent+1)+' '+(145-rise)+' L'+(lx-extent-5)+' '+(132-rise)+' M'+(rx+extent-1)+' '+(145-rise)+' L'+(rx+extent+5)+' '+(132-rise)+'" stroke="'+pal.glow+'" stroke-width="2.6" opacity=".7" class="cb-paper-set-glow"/>':'')+'</g>';
}
function weaponMarkup(type,pal,v,tier,item){
  var g='',klass=gearClass(item);
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
  var pal=gearPalette(c,item,tier,'Weapon'),type=weaponType(item,c),v=pal.variant;
  return '<g class="'+paperSlotClass('Weapon',highlighted,item)+'" data-weapon-type="'+esc(type)+'" data-item-key="'+esc(itemIdentity(item,'Weapon'))+'">'+weaponMarkup(type,pal,v,tier,item)+'</g>';
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
function paperOffHand(c,highlighted){
  var item=itemForSlot(c,'OffHand'),tier=clampTier(item&&item.tier);
  if(!item)return'';
  // Never invent a shield/focus visual for a main-hand weapon stored in OffHand.
  if(item.slot&&item.slot!=='OffHand')return'';
  var pal=gearPalette(c,item,tier,'OffHand'),type=offHandType(item,c),v=pal.variant;
  return '<g class="'+paperSlotClass('OffHand',highlighted,item)+'" data-offhand-type="'+esc(type)+'" data-item-key="'+esc(itemIdentity(item,'OffHand'))+'">'+offHandMarkup(type,pal,v,tier,item)+'</g>';
}
function paperAccessories(c,highlighted){
  var out='',ring1=itemForSlot(c,'Ring1'),ring2=itemForSlot(c,'Ring2'),tr1=itemForSlot(c,'Trinket1'),tr2=itemForSlot(c,'Trinket2'),relic=itemForSlot(c,'Relic');
  if(ring1){var p1=gearPalette(c,ring1,clampTier(ring1.tier),'Ring1');out+='<g class="'+paperSlotClass('Ring1',highlighted,ring1)+'"><circle cx="69" cy="281" r="3.7" fill="none" stroke="'+p1.trim+'" stroke-width="2"/><circle cx="69" cy="279" r="1.2" fill="'+p1.glow+'"/></g>'}
  if(ring2){var p2=gearPalette(c,ring2,clampTier(ring2.tier),'Ring2');out+='<g class="'+paperSlotClass('Ring2',highlighted,ring2)+'"><circle cx="171" cy="281" r="3.7" fill="none" stroke="'+p2.trim+'" stroke-width="2"/><circle cx="171" cy="279" r="1.2" fill="'+p2.glow+'"/></g>'}
  if(tr1){var t1=gearPalette(c,tr1,clampTier(tr1.tier),'Trinket1');out+='<g class="'+paperSlotClass('Trinket1',highlighted,tr1)+'"><path d="M106 252 L102 278" stroke="'+t1.trim+'" stroke-width="2"/>'+itemRune(tr1,'Trinket1',t1,101,282,.55)+'</g>'}
  if(tr2){var t2=gearPalette(c,tr2,clampTier(tr2.tier),'Trinket2');out+='<g class="'+paperSlotClass('Trinket2',highlighted,tr2)+'"><path d="M134 252 L138 278" stroke="'+t2.trim+'" stroke-width="2"/>'+itemRune(tr2,'Trinket2',t2,139,282,.55)+'</g>'}
  if(relic){
    var pr=gearPalette(c,relic,clampTier(relic.tier),'Relic'),klass=paperClass(c);
    var relicMarkup=['Mage','Priest'].includes(klass)
      ?'<circle cx="82" cy="229" r="9" fill="'+pr.dark+'" stroke="'+pr.trim+'" stroke-width="2.5"/>'+itemRune(relic,'Relic',pr,82,229,.62)
      :'<path d="M75 224 L88 220 L91 241 L78 246Z" fill="'+pr.base+'" stroke="'+pr.trim+'" stroke-width="2.3"/>'+itemRune(relic,'Relic',pr,83,233,.5);
    out+='<g class="'+paperSlotClass('Relic',highlighted,relic)+'">'+relicMarkup+'</g>';
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
  var race=c.race||(c.appearance&&c.appearance.race)||'Veyren';
  var a=normalizeAppearance(c.appearance||c,c.id||c.name||race,race);
  var r=raceDef(a.race),skin=r.skin[a.skinTone],eye=r.eyes[a.eyes],hair=HAIR[a.hairColor];
  var accent=opts.accent||paperAccent(c),highlighted=opts.highlightedSlot||'',profile=bodyProfile(race);
  var uid='pd'+hash((c.id||c.name||race)+'|'+JSON.stringify(a)).toString(36);
  var nw=profile.neck||14;
  var neck='<path d="M'+(120-nw/2)+' 109 L'+(120-nw/2)+' 143 Q120 151 '+(120+nw/2)+' 143 L'+(120+nw/2)+' 109Z" fill="'+skin+'" stroke="#182027" stroke-width="2.5"/>';
  var hip=profile.hip||32;
  var under='<path d="M'+(120-hip)+' 236 Q120 250 '+(120+hip)+' 236 L'+(120+hip+1)+' 268 Q120 282 '+(120-hip-1)+' 268Z" fill="#162126" stroke="#10171b" stroke-width="3"/><path d="M'+(120-hip+6)+' 252 Q120 261 '+(120+hip-6)+' 252" fill="none" stroke="#526065" stroke-width="1.3" opacity=".36"/>';
  var headScale=profile.headScale||1,headX=70+(50*(1-headScale)),headY=20+(50*(1-headScale));
  return '<svg viewBox="0 0 240 410" data-race="'+esc(race)+'" role="img" aria-hidden="true" focusable="false">'+
    '<defs><radialGradient id="'+uid+'a" cx="50%" cy="46%" r="54%"><stop offset="0%" stop-color="'+accent+'" stop-opacity=".13"/><stop offset="70%" stop-color="'+accent+'" stop-opacity=".025"/><stop offset="100%" stop-color="'+accent+'" stop-opacity="0"/></radialGradient></defs>'+
    '<ellipse cx="120" cy="214" rx="110" ry="180" fill="url(#'+uid+'a)"/>'+
    '<ellipse cx="120" cy="392" rx="'+Math.max(66,profile.shoulder+23)+'" ry="10" fill="#000" opacity=".38"/>'+
    paperTierAura(c)+
    paperLegs(c,skin,highlighted)+paperFeet(c,skin,highlighted)+
    paperWeapon(c,highlighted)+paperOffHand(c,highlighted)+
    paperArms(c,skin,highlighted)+under+paperChest(c,highlighted)+paperWaist(c,highlighted)+paperShoulders(c,highlighted)+paperAccessories(c,highlighted)+
    neck+
    '<g transform="translate('+headX+' '+headY+') scale('+headScale+')">'+paperHeadMarkup(c,a,skin,eye,hair,highlighted)+'</g>'+
    '</svg>';
}
function paperDollHTML(subject,opts){
  opts=opts||{};
  var c=subject||{},size=opts.size||'equipment',accent=opts.accent||paperAccent(c),set=dominantSetState(c);
  var label=opts.label||((c.name||'Character')+' equipment appearance');
  var cls='cb-paper-doll cb-paper-doll--'+esc(size)+(set?' has-set set-pieces-'+Math.min(4,set.count):'');
  return '<span class="'+cls+'" style="--cbp-accent:'+accent+(set?' ;--cbp-set-glow:'+set.visual.glow:'')+'" role="img" aria-label="'+esc(label)+'">'+paperDollSVG(c,opts)+'</span>';
}
function visualProfile(subject,item,slot){
  var c=subject||{},s=slot||item?.slot||'Gear',tier=clampTier(item?.tier),pal=gearPalette(c,item,tier||1,s);
  return {key:itemIdentity(item,s),slot:s,tier:tier,variant:pal.variant,isSet:isSetItem(item),weaponType:s==='Weapon'?weaponType(item,c):null,offHandType:s==='OffHand'?offHandType(item,c):null,palette:pal};
}

window.CellboundPortraits={
  version:4,RACES:RACES,COUNTS:COUNTS,CLASS_COLORS:CLASS_COLORS,
  normalizeAppearance:normalizeAppearance,randomAppearance:randomAppearance,
  applyToCharacter:applyToCharacter,portraitHTML:portraitHTML,paperDollHTML:paperDollHTML,paperDollSVG:paperDollSVG,
  visualProfile:visualProfile,weaponType:weaponType,offHandType:offHandType,
  editorHTML:editorHTML,bindEditor:bindEditor
};
})();