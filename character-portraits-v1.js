(()=>{
'use strict';

const CLASS_COLORS={
  Warrior:'#C69B6D',Paladin:'#F48CBA',Priest:'#FFFFFF',Druid:'#FF7C0A',
  Hunter:'#AAD372',Rogue:'#FFF468',Mage:'#3FC7EB',Shaman:'#0070DD',
  Warlock:'#8788EE',Monk:'#00FF98','Death Knight':'#C41E3A','Demon Hunter':'#A330C9',Evoker:'#33937F'
};

const RACES={
  Veyren:{
    accent:'#8e69d7',
    skin:['#9a82b6','#86709f','#735c89','#604b73','#4e3b5d','#3b2c48'],
    eyes:['#bda8ff','#8ee8ff','#f3b8ff','#c8d2ff','#8fb1d8','#efe9ff'],
    featureLabel:'Arcane detail'
  },
  Stoneborn:{
    accent:'#d5b675',
    skin:['#c4beb5','#aaa59e','#92908d','#797a7c','#62666a','#4d5257'],
    eyes:['#f0cf82','#a8d8e7','#b9d18e','#e6a07c','#e8edf2','#91abc0'],
    featureLabel:'Stone ridge'
  },
  Aelari:{
    accent:'#55c8ff',
    skin:['#d8c8ea','#c2afe0','#aa94cf','#927abb','#7863a1','#5e4c84'],
    eyes:['#9cf3ff','#dcb4ff','#9effda','#f7dd83','#d7efff','#ffc6e4'],
    featureLabel:'Ear style'
  },
  Thornkin:{
    accent:'#7ab969',
    skin:['#aeb88b','#94aa78','#7c9664','#668052','#536b43','#405436'],
    eyes:['#e3df75','#a7e285','#83e1c4','#dfb767','#c6ed98','#efe5b5'],
    featureLabel:'Growth'
  },
  Emberkin:{
    accent:'#ff7548',
    skin:['#75534b','#674640','#583a37','#493130','#3a292a','#2c2224'],
    eyes:['#ffd964','#ffad56','#ff7b5f','#ffe1a2','#ffd0bf','#fff4dc'],
    featureLabel:'Ember crown'
  },
  Nymari:{
    accent:'#58d8e8',
    skin:['#9ccfe0','#82b9cf','#6aa3bc','#578ba7','#47738e','#365a73'],
    eyes:['#a6fbff','#b9c7ff','#d8b4ff','#9cffe0','#f0e8a6','#f7fbff'],
    featureLabel:'Fin crest'
  }
};

const HAIR=['#17191c','#33251f','#5a3827','#8a5a35','#b88b59','#d8c9a6','#7a3030','#d4d9df'];
const COUNTS={gender:2,frame:3,skinTone:6,face:4,hair:6,hairColor:8,facialHair:4,marking:5,eyes:6,feature:4};
const LABELS={
  gender:'Body',frame:'Frame',skinTone:'Skin',face:'Face',hair:'Hair',hairColor:'Hair color',
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
  if(out.gender===1)out.facialHair=0;
  return out;
}
function randomAppearance(race){
  var out={race:RACES[race]?race:'Veyren'};
  Object.keys(COUNTS).forEach(function(field){out[field]=Math.floor(Math.random()*COUNTS[field])});
  if(out.gender===1)out.facialHair=0;
  return out;
}
function applyToCharacter(c){
  if(!c)return c;
  c.appearance=normalizeAppearance(c.appearance,c.id||c.name||c.race,c.race||c.appearance?.race||'Veyren');
  return c;
}

function facePath(i,gender){
  var female=[
    'M32 34 Q50 21 68 34 L67 63 Q63 81 50 89 Q37 81 33 63 Z',
    'M30 35 Q50 23 70 35 L67 68 Q61 84 50 88 Q39 84 33 68 Z',
    'M35 31 Q50 20 65 31 L68 59 Q64 81 50 91 Q36 81 32 59 Z',
    'M31 38 Q35 24 50 23 Q65 24 69 38 L65 66 Q60 84 50 88 Q40 84 35 66 Z'
  ];
  var male=[
    'M28 34 Q50 20 72 34 L70 64 Q67 82 50 89 Q33 82 30 64 Z',
    'M27 35 Q50 22 73 35 L69 69 Q63 86 50 89 Q37 86 31 69 Z',
    'M31 31 Q50 18 69 31 L72 60 Q68 82 50 92 Q32 82 28 60 Z',
    'M28 37 Q32 22 50 21 Q68 22 72 37 L68 67 Q63 85 50 89 Q37 85 32 67 Z'
  ];
  var list=Number(gender)===1?female:male;
  return list[i]||list[0];
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
  if(Number(a.gender)===1||a.facialHair===0)return '';
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
  var face=facePath(a.face,a.gender);
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
  var accent=opts.accent||raceDef(race).accent||'#76d7d0';
  var size=opts.size||'md';
  var cls='cb-portrait cb-portrait--'+esc(size)+(opts.className?' '+esc(opts.className):'');
  var label=opts.label||c.name||a.race+' adventurer';
  return '<span class="'+cls+'" style="--cbp-accent:'+accent+'" role="img" aria-label="'+esc(label)+'">'+svgFor(a,accent)+'</span>';
}
function optionText(field,value,race){
  if(field==='gender')return Number(value)===1?'Female':'Male';
  if(field==='frame')return ['Lean','Balanced','Strong'][Number(value)]||'Balanced';
  if(field==='hair'&&value===0)return 'None';
  if(field==='facialHair'&&value===0)return 'None';
  if(field==='marking'&&value===0)return 'None';
  return String(value+1).padStart(2,'0')+' / '+String(COUNTS[field]).padStart(2,'0');
}
function editorHTML(appearance,opts){
  opts=opts||{};
  var a=normalizeAppearance(appearance,opts.seed,appearance?.race||opts.race);
  var fields=['gender','frame','skinTone','face','hair','hairColor'];
  if(a.gender===0)fields.push('facialHair');
  fields.push('marking','eyes','feature');
  var rows=fields.map(function(field){
    var label=field==='feature'?(raceDef(a.race).featureLabel||'Race detail'):(LABELS[field]||field);
    return '<div class="cb-appearance-control"><span>'+esc(label)+'</span><div><button type="button" data-appearance-field="'+field+'" data-direction="-1" aria-label="Previous '+esc(label)+'">‹</button><b>'+esc(optionText(field,a[field],a.race))+'</b><button type="button" data-appearance-field="'+field+'" data-direction="1" aria-label="Next '+esc(label)+'">›</button></div></div>';
  }).join('');
  var preview={race:a.race,appearance:a,name:opts.name||'Character',equipment:{}};
  return '<div class="cb-appearance-editor" data-appearance-editor><div class="cb-appearance-preview">'+paperDollHTML(preview,{size:'creator',label:(opts.name||'Character')+' base model preview'})+'<small class="cb-appearance-race-label">'+esc(a.race)+' · '+esc(optionText('gender',a.gender,a.race))+' · '+esc(optionText('frame',a.frame,a.race))+'</small><button type="button" data-appearance-randomize>RANDOMISE APPEARANCE</button></div><div class="cb-appearance-controls">'+rows+'</div></div>';
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
function paperAccent(c){var race=c?.race||c?.appearance?.race||'Veyren';return raceDef(race).accent||'#76d7d0'}
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

function bodyProfile(subject,appearanceOverride){
  var ch=typeof subject==='string'?{race:subject,appearance:appearanceOverride||{}}:(subject||{});
  var race=ch.race||ch.appearance?.race||appearanceOverride?.race||'Veyren';
  var a=appearanceOverride||ch.appearance||ch;
  var key=ch.id||ch.name||race;
  var gender=int(a.gender,2,seeded(key,'gender',2));
  var frame=int(a.frame,3,seeded(key,'frame',3));
  var base=({
    Stoneborn:{shoulder:60,waist:35,hip:39,leg:20,arm:18,neck:20,headScale:1.08,hand:1.15},
    Aelari:{shoulder:44,waist:24,hip:29,leg:13,arm:10.5,neck:11,headScale:.97,hand:.92},
    Thornkin:{shoulder:50,waist:28,hip:33,leg:15.5,arm:13.5,neck:14,headScale:1,hand:1},
    Emberkin:{shoulder:53,waist:30,hip:33,leg:16,arm:14.5,neck:15,headScale:1,hand:1.02},
    Nymari:{shoulder:46,waist:26,hip:32,leg:14.5,arm:12,neck:12.5,headScale:.99,hand:.97},
    Veyren:{shoulder:47,waist:27,hip:31,leg:14.5,arm:12,neck:13,headScale:.99,hand:.98}
  })[race]||{shoulder:47,waist:27,hip:31,leg:14.5,arm:12,neck:13,headScale:.99,hand:.98};
  var gs=gender===1
    ?{shoulder:.88,waist:.88,hip:1.12,leg:.96,arm:.88,neck:.86,headScale:1.01,hand:.93}
    :{shoulder:1.07,waist:1.04,hip:.95,leg:1.05,arm:1.10,neck:1.06,headScale:.99,hand:1.05};
  var fs=[
    {shoulder:.93,waist:.92,hip:.96,leg:.94,arm:.88,neck:.95,headScale:1.01,hand:.96},
    {shoulder:1,waist:1,hip:1,leg:1,arm:1,neck:1,headScale:1,hand:1},
    {shoulder:1.10,waist:1.06,hip:1.04,leg:1.08,arm:1.16,neck:1.07,headScale:.99,hand:1.07}
  ][frame]||{shoulder:1,waist:1,hip:1,leg:1,arm:1,neck:1,headScale:1,hand:1};
  var out={gender:gender,frame:frame};
  ['shoulder','waist','hip','leg','arm','neck','headScale','hand'].forEach(function(k){out[k]=base[k]*gs[k]*fs[k]});
  return out;
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
function paperRaceLegDetails(c,p){
  var race=c.race||c.appearance?.race||'Veyren';
  if(race==='Stoneborn')return '<path d="M94 278 l10 12 l-7 19 l10 14 M146 278 l-10 12 l7 19 l-10 14" fill="none" stroke="#e0c88e" stroke-width="1.8" opacity=".42"/>';
  if(race==='Thornkin')return '<path d="M96 274 Q82 297 94 322 T91 349 M144 274 Q158 297 146 322 T149 349" fill="none" stroke="#78965c" stroke-width="2" opacity=".72"/><path d="M91 314 l-7 -3 l5 8 M149 314 l7 -3 l-5 8" fill="#8fb36b" opacity=".7"/>';
  if(race==='Emberkin')return '<path d="M96 278 l8 13 l-6 15 l9 14 l-7 20 M144 278 l-8 13 l6 15 l-9 14 l7 20" fill="none" stroke="#ff8a4f" stroke-width="2" opacity=".78"/>';
  if(race==='Nymari')return '<path d="M97 286 Q87 306 97 326 T94 348 M143 286 Q153 306 143 326 T146 348" fill="none" stroke="#9cf7ff" stroke-width="1.6" opacity=".66"/>';
  if(race==='Aelari')return '<path d="M99 286 q-8 17 1 30 q7 12 -1 27 M141 286 q8 17 -1 30 q-7 12 1 27" fill="none" stroke="#a7ecff" stroke-width="1.5" opacity=".54"/>';
  if(race==='Veyren')return '<path d="M98 284 q-9 15 1 27 l-5 18 q7 8 3 17 M142 284 q9 15 -1 27 l5 18 q-7 8 -3 17" fill="none" stroke="#b89aff" stroke-width="1.5" opacity=".58"/>';
  return '';
}
function paperRaceTorsoDetails(c,p){
  var race=c.race||c.appearance?.race||'Veyren';
  if(race==='Stoneborn')return '<path d="M99 155 l12 15 l-7 15 l15 18 l-8 17 M141 155 l-12 15 l7 15 l-15 18 l8 17" fill="none" stroke="#e1ca94" stroke-width="1.8" opacity=".38"/>';
  if(race==='Thornkin')return '<path d="M98 159 Q89 180 103 198 T101 226 M142 159 Q151 180 137 198 T139 226" fill="none" stroke="#76945a" stroke-width="2" opacity=".7"/><path d="M98 188 l-8 -4 l5 9 M142 188 l8 -4 l-5 9" fill="#8aae66" opacity=".7"/>';
  if(race==='Emberkin')return '<path d="M101 157 l9 15 l-7 13 l13 17 l-9 22 M139 157 l-9 15 l7 13 l-13 17 l9 22" fill="none" stroke="#ff874a" stroke-width="2.1" opacity=".78"/><circle cx="120" cy="186" r="2.5" fill="#ffb06a" opacity=".62"/>';
  if(race==='Nymari')return '<path d="M101 166 Q120 151 139 166 M105 200 Q120 217 135 200" fill="none" stroke="#a5faff" stroke-width="1.6" opacity=".55"/>';
  if(race==='Aelari')return '<path d="M107 163 Q120 151 133 163 M120 156 V184" fill="none" stroke="#bdeeff" stroke-width="1.4" opacity=".5"/>';
  if(race==='Veyren')return '<path d="M106 164 Q120 151 134 164 M101 202 q19 14 38 0" fill="none" stroke="#c3a9ff" stroke-width="1.5" opacity=".5"/>';
  return '';
}
function paperBodyBase(c,a,skin,p,uid){
  var race=c.race||c.appearance?.race||a.race||'Veyren';
  var accent=raceDef(race).accent||'#76d7d0';
  var s=p.shoulder,w=p.waist,h=p.hip,arm=Math.max(9,p.arm||12);
  var lx=120-s,rx=120+s;
  var female=p.gender===1;
  var torsoTop=139,torsoBottom=249;
  var armW=Math.max(7,arm*.56),wristW=Math.max(5.4,armW*.67);
  var thigh=Math.max(13,p.leg||14),calf=Math.max(9,thigh*.73);
  var leftLegX=120-h*.48,rightLegX=120+h*.48;
  var torso='<path class="cb-paper-body-torso" d="M'+(120-s+3)+' '+torsoTop+
    ' C'+(120-s-1)+' 157 '+(120-s+2)+' 184 '+(120-w-2)+' 211'+
    ' C'+(120-w-1)+' 229 '+(120-h+5)+' 241 '+(120-h+4)+' '+torsoBottom+
    ' Q120 '+(torsoBottom+13)+' '+(120+h-4)+' '+torsoBottom+
    ' C'+(120+h-5)+' 241 '+(120+w+1)+' 229 '+(120+w+2)+' 211'+
    ' C'+(120+s-2)+' 184 '+(120+s+1)+' 157 '+(120+s-3)+' '+torsoTop+
    ' Q120 '+(torsoTop-12)+' '+(120-s+3)+' '+torsoTop+'Z" fill="url(#'+uid+'skin)" stroke="#12191d" stroke-width="2.8"/>';
  var neck='<path d="M'+(120-p.neck/2)+' 105 L'+(120-p.neck/2)+' 145 Q120 153 '+(120+p.neck/2)+' 145 L'+(120+p.neck/2)+' 105Z" fill="url(#'+uid+'skin)" stroke="#12191d" stroke-width="2.4"/>';
  var leftArm='<path d="M'+(lx+5)+' 147 C'+(lx-armW)+' 151 '+(lx-armW-6)+' 178 '+(lx-armW-5)+' 200 C'+(lx-armW-4)+' 224 '+(lx-wristW-5)+' 247 '+(lx-wristW-3)+' 267 C'+(lx-wristW-1)+' 278 '+(lx+wristW-5)+' 280 '+(lx+wristW-1)+' 269 C'+(lx+wristW+1)+' 246 '+(lx+armW+3)+' 224 '+(lx+armW+4)+' 202 C'+(lx+armW+5)+' 177 '+(lx+armW+5)+' 157 '+(lx+5)+' 147Z" fill="url(#'+uid+'skin)" stroke="#12191d" stroke-width="2.5"/>';
  var rightArm='<path d="M'+(rx-5)+' 147 C'+(rx+armW)+' 151 '+(rx+armW+6)+' 178 '+(rx+armW+5)+' 200 C'+(rx+armW+4)+' 224 '+(rx+wristW+5)+' 247 '+(rx+wristW+3)+' 267 C'+(rx+wristW+1)+' 278 '+(rx-wristW+5)+' 280 '+(rx-wristW+1)+' 269 C'+(rx-wristW-1)+' 246 '+(rx-armW-3)+' 224 '+(rx-armW-4)+' 202 C'+(rx-armW-5)+' 177 '+(rx-armW-5)+' 157 '+(rx-5)+' 147Z" fill="url(#'+uid+'skin)" stroke="#12191d" stroke-width="2.5"/>';
  var hands='<path d="M'+(lx-wristW-2)+' 263 Q'+(lx-10)+' 279 '+(lx-4)+' 289 Q'+(lx+4)+' 295 '+(lx+10)+' 285 Q'+(lx+12)+' 273 '+(lx+wristW+2)+' 263Z" fill="url(#'+uid+'skin)" stroke="#12191d" stroke-width="2.2"/>'+
    '<path d="M'+(rx+wristW+2)+' 263 Q'+(rx+10)+' 279 '+(rx+4)+' 289 Q'+(rx-4)+' 295 '+(rx-10)+' 285 Q'+(rx-12)+' 273 '+(rx-wristW-2)+' 263Z" fill="url(#'+uid+'skin)" stroke="#12191d" stroke-width="2.2"/>';
  var leftLeg='<path d="M'+(120-h+4)+' 246 Q'+(leftLegX-thigh)+' 266 '+(leftLegX-thigh+1)+' 303 L'+(leftLegX-calf)+' 363 Q'+leftLegX+' 371 '+(leftLegX+calf)+' 363 L'+(leftLegX+thigh-1)+' 303 Q'+(leftLegX+thigh)+' 269 '+(120-3)+' 254Z" fill="url(#'+uid+'skin)" stroke="#12191d" stroke-width="2.7"/>';
  var rightLeg='<path d="M'+(120+h-4)+' 246 Q'+(rightLegX+thigh)+' 266 '+(rightLegX+thigh-1)+' 303 L'+(rightLegX+calf)+' 363 Q'+rightLegX+' 371 '+(rightLegX-calf)+' 363 L'+(rightLegX-thigh+1)+' 303 Q'+(rightLegX-thigh)+' 269 '+(120+3)+' 254Z" fill="url(#'+uid+'skin)" stroke="#12191d" stroke-width="2.7"/>';
  var feet='<path d="M'+(leftLegX-calf-2)+' 355 Q'+(leftLegX-15)+' 371 '+(leftLegX-19)+' 384 Q'+(leftLegX-4)+' 391 '+(leftLegX+16)+' 386 L'+(leftLegX+calf)+' 361Z" fill="url(#'+uid+'skin)" stroke="#12191d" stroke-width="2.3"/>'+
    '<path d="M'+(rightLegX+calf+2)+' 355 Q'+(rightLegX+15)+' 371 '+(rightLegX+19)+' 384 Q'+(rightLegX+4)+' 391 '+(rightLegX-16)+' 386 L'+(rightLegX-calf)+' 361Z" fill="url(#'+uid+'skin)" stroke="#12191d" stroke-width="2.3"/>';
  var under=female
    ?'<path d="M'+(120-s+12)+' 164 Q120 151 '+(120+s-12)+' 164 L'+(120+w+1)+' 213 Q120 224 '+(120-w-1)+' 213Z" fill="#172126" stroke="#0f161a" stroke-width="2.1"/><path d="M'+(120-h+3)+' 239 Q120 250 '+(120+h-3)+' 239 L'+(120+h-1)+' 269 Q120 280 '+(120-h+1)+' 269Z" fill="#172126" stroke="#0f161a" stroke-width="2.1"/>'
    :'<path d="M'+(120-s+10)+' 166 Q120 155 '+(120+s-10)+' 166 L'+(120+w+3)+' 230 Q120 239 '+(120-w-3)+' 230Z" fill="#172126" stroke="#0f161a" stroke-width="2.1"/><path d="M'+(120-h+2)+' 239 Q120 250 '+(120+h-2)+' 239 L'+(120+h)+' 270 Q120 281 '+(120-h)+' 270Z" fill="#172126" stroke="#0f161a" stroke-width="2.1"/>';
  var anatomy=female
    ?'<path d="M'+(120-s+13)+' 157 Q120 169 '+(120+s-13)+' 157 M'+(120-w+7)+' 218 Q120 226 '+(120+w-7)+' 218" fill="none" stroke="'+mixHex(skin,'#ffffff',.18)+'" stroke-width="1.4" opacity=".3"/>'
    :'<path d="M'+(120-s+12)+' 158 Q120 172 '+(120+s-12)+' 158 M120 163 V215 M'+(120-w+6)+' 219 Q120 229 '+(120+w-6)+' 219" fill="none" stroke="'+mixHex(skin,'#ffffff',.18)+'" stroke-width="1.4" opacity=".28"/>';
  var raceDetails=paperRaceTorsoDetails(c,p)+paperRaceArmDetails(c,p,lx,rx)+paperRaceLegDetails(c,p);
  var accentGlow='<path d="M'+(120-s+5)+' 143 Q120 132 '+(120+s-5)+' 143" fill="none" stroke="'+accent+'" stroke-width="1.4" opacity=".18"/>';
  var legClass=itemForSlot(c,'Legs')?'cb-paper-base-legs':'cb-paper-empty-legs';
  var feetClass=itemForSlot(c,'Feet')?'cb-paper-base-feet':'cb-paper-empty-feet';
  var chestClass=itemForSlot(c,'Chest')?'cb-paper-base-chest':'cb-paper-empty-chest';
  return '<g class="cb-paper-base-model" data-base-race="'+esc(race)+'">'+
    '<g class="'+legClass+'">'+leftLeg+rightLeg+'</g>'+
    '<g class="'+feetClass+'">'+feet+'</g>'+
    '<g class="cb-paper-arms">'+leftArm+rightArm+hands+'</g>'+
    neck+'<g class="'+chestClass+'">'+torso+under+anatomy+'</g>'+raceDetails+accentGlow+'</g>';
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
  var face=facePath(a.face,a.gender);
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
  var item=itemForSlot(c,'Legs');if(!item)return'';
  var p=bodyProfile(c),sx=Math.max(.86,Math.min(1.22,(p.leg||14)/14)),transform='translate(120 0) scale('+sx+' 1) translate(-120 0)';
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
  return gear+'</g>';
}
function paperFeet(c,skin,highlighted){
  var item=itemForSlot(c,'Feet');if(!item)return'';
  var p=bodyProfile(c),sx=Math.max(.86,Math.min(1.22,(p.leg||14)/14)),transform='translate(120 0) scale('+sx+' 1) translate(-120 0)';
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier||1,'Feet'),v=pal.variant,klass=gearClass(item),gp=gearProfile(item);
  var extra=gp.family==='plate'?4:gp.family==='mail'?2:0;
  var gear='<g class="'+paperSlotClass('Feet',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Feet'))+'" transform="'+transform+'"><path d="M'+(81-extra)+' '+(344-extra)+' L'+(112+extra)+' '+(344-extra)+' L113 389 L74 389 Q72 378 82 369Z" fill="'+pal.dark+'" stroke="#0c1115" stroke-width="3"/><path d="M'+(128-extra)+' '+(344-extra)+' L'+(159+extra)+' '+(344-extra)+' L166 389 L127 389 L127 368Z" fill="'+pal.dark+'" stroke="#0c1115" stroke-width="3"/>';
  if(gp.family==='plate')gear+='<path d="M78 347 L113 347 L112 370 L76 370Z M128 347 L162 347 L164 370 L128 370Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="1.8"/><path d="M79 374 L111 374 M130 374 L162 374" stroke="'+pal.light+'" stroke-width="1.5" opacity=".5"/>';
  else if(gp.family==='mail')gear+='<path d="M80 353 L112 353 M129 353 L160 353" stroke="'+pal.trim+'" stroke-width="2.2"/>';
  else gear+='<path d="M79 '+(v%2?361:371)+' L111 '+(v%2?361:371)+' M129 '+(v%2?361:371)+' L161 '+(v%2?361:371)+'" stroke="'+pal.trim+'" stroke-width="3"/>';
  if(klass==='Paladin')gear+=motifMarkup('sun',95,363,.42,pal.glow)+motifMarkup('sun',145,363,.42,pal.glow);
  if(klass==='Demon Hunter')gear+='<path d="M78 352 l-8 -10 l13 4 M162 352 l8 -10 l-13 4" fill="'+pal.trim+'" opacity=".7"/>';
  else gear+=itemRune(item,'Feet',pal,95,363,.42)+itemRune(item,'Feet',pal,145,363,.42);
  return gear+'</g>';
}
function paperArms(c,skin,highlighted){
  var hands=itemForSlot(c,'Hands');if(!hands)return'';
  var tier=clampTier(hands.tier),pal=gearPalette(c,hands,tier||1,'Hands');
  var p=bodyProfile(c),shoulder=p.shoulder,arm=p.arm,leftX=120-shoulder,rightX=120+shoulder;
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
  return gear+'</g>';
}
function paperChest(c,highlighted){
  var item=itemForSlot(c,'Chest');
  var p=bodyProfile(c),s=p.shoulder,w=p.waist,top=138,bottom=250;
  if(!item)return'';
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
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier,'Waist'),v=pal.variant,klass=gearClass(item),gp=gearProfile(item),p=bodyProfile(c),w=p.waist+(gp.bulk-1)*7;
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
  var pal=gearPalette(c,item,tier,'Shoulders'),p=bodyProfile(c),s=p.shoulder,v=pal.variant,klass=gearClass(item),gp=gearProfile(item);
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
  var pal=gearPalette(c,item,tier,'Weapon'),type=weaponType(item,c),v=pal.variant,p=bodyProfile(c);
  var dx=(120+p.shoulder+8)-200;
  return '<g class="'+paperSlotClass('Weapon',highlighted,item)+'" transform="translate('+dx+' 0)" data-weapon-type="'+esc(type)+'" data-item-key="'+esc(itemIdentity(item,'Weapon'))+'">'+weaponMarkup(type,pal,v,tier,item)+'</g>';
}
function offHandMarkup(type,pal,v,tier,item){
  var klass=gearClass(item),out='';
  if(type==='shield'){
    var shape=v%3===0?'M22 168 Q48 150 74 168 L69 252 Q49 275 28 252Z':v%3===1?'M23 166 L74 174 L67 252 L49 271 L29 250Z':'M22 176 L48 154 L74 176 L65 255 L48 273 L31 255Z';
    out='<path d="'+shape+'" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="3.2"/><path d="M48 168 L48 257 M29 205 L69 205" stroke="'+pal.light+'" stroke-width="2.3" opacity=".58"/>';
    if(klass==='Paladin')out+=motifMarkup('sun',48,211,1.15,pal.glow)+'<path d="M31 185 Q48 174 66 185" fill="none" stroke="'+pal.trim+'" stroke-width="2"/>';
    else if(klass==='Warrior')out+='<path d="M34 185 L48 171 L62 185 L60 238 L48 252 L36 238Z" fill="none" stroke="'+pal.trim+'" stroke-width="2.4"/>';
    else out+=itemRune(item,'OffHand',pal,48,211,.8);
    return out;
  }
  if(type==='quiver'){
    out='<path d="M31 164 L65 174 L58 263 L35 257Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.5"/><path d="M38 164 L33 128 M46 167 L45 124 M55 168 L59 129 M34 143 L31 133 L38 136 M45 140 L42 130 L49 134 M58 144 L63 134 L56 136" stroke="'+pal.light+'" stroke-width="2.6"/>';
    if(klass==='Hunter')out+=motifMarkup('arrow',48,212,.8,pal.glow);
    return out;
  }
  if(type==='tome'){
    out='<g transform="rotate(-8 48 216)"><rect x="27" y="184" width="44" height="61" rx="5" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="3"/><path d="M49 186 V243" stroke="'+pal.trim+'" stroke-width="2"/>'+itemRune(item,'OffHand',pal,49,215,.7)+'</g>';
    if(klass==='Priest')out+='<ellipse cx="49" cy="175" rx="14" ry="4" fill="none" stroke="'+pal.glow+'" stroke-width="2" opacity=".65"/>';
    if(klass==='Warlock')out+='<path d="M32 188 q-8 -12 -5 -19 M65 188 q8 -12 5 -19" fill="none" stroke="'+pal.glow+'" stroke-width="2"/>';
    return out;
  }
  if(type==='idol'){
    if(klass==='Shaman')return '<path d="M31 205 L40 188 L56 188 L65 205 L60 249 L48 264 L36 249Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="3"/><circle cx="48" cy="220" r="9" fill="'+pal.glow+'" opacity=".72" class="cb-paper-glow"/><path d="M35 250 L30 279 M48 261 L48 289 M60 250 L66 279" stroke="'+pal.trim+'" stroke-width="2"/><path d="M27 279 h7 M44 289 h8 M63 279 h7" stroke="'+pal.glow+'" stroke-width="2"/>';
    if(klass==='Druid')return '<path d="M32 238 Q48 182 64 238 L58 258 H38Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="3"/><path d="M48 204 Q32 214 40 231 Q53 223 48 204Z" fill="'+pal.glow+'" opacity=".55"/>';
    return '<path d="M32 238 Q48 182 64 238 L58 258 H38Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="3"/><circle cx="48" cy="221" r="7" fill="'+pal.glow+'" opacity=".7"/>';
  }
  if(type==='dagger'){
    if(klass==='Demon Hunter')return '<path d="M56 220 Q36 190 24 215 Q43 221 49 241 Q42 260 27 267 Q45 282 61 250 Q68 237 56 220Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="3"/><path d="M48 231 L62 229" stroke="'+pal.glow+'" stroke-width="2"/>';
    return '<path d="M52 236 L26 307" stroke="'+pal.light+'" stroke-width="5.5"/><path d="M29 304 L19 325 L33 316Z" fill="'+pal.trim+'"/><path d="M45 242 L60 248" stroke="'+pal.trim+'" stroke-width="4"/>';
  }
  if(klass==='Monk'){
    return '<circle cx="49" cy="216" r="16" fill="none" stroke="'+pal.trim+'" stroke-width="2"/><circle cx="49" cy="216" r="4" fill="'+pal.glow+'"/><circle cx="49" cy="194" r="4" fill="'+pal.base+'"/><circle cx="67" cy="203" r="4" fill="'+pal.base+'"/><circle cx="67" cy="229" r="4" fill="'+pal.base+'"/><circle cx="31" cy="203" r="4" fill="'+pal.base+'"/><circle cx="31" cy="229" r="4" fill="'+pal.base+'"/>';
  }
  if(klass==='Death Knight'){
    return '<path d="M49 188 L67 207 L58 235 L49 252 L40 235 L31 207Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.7"/><circle cx="49" cy="219" r="7" fill="'+pal.glow+'" opacity=".72" class="cb-paper-glow"/>';
  }
  if(klass==='Evoker'){
    return '<path d="M49 185 L63 205 L58 235 L49 252 L40 235 L35 205Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.7"/><path d="M35 205 L22 194 L30 220 M63 205 L76 194 L68 220" fill="'+pal.trim+'" opacity=".58"/><circle cx="49" cy="218" r="7" fill="'+pal.glow+'" opacity=".74"/>';
  }
  out='<circle cx="49" cy="216" r="'+(v%2?18:21)+'" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="3"/>'+itemRune(item,'OffHand',pal,49,216,1);
  if(tier>=4)out+='<circle cx="49" cy="216" r="6" fill="'+pal.glow+'" opacity=".65" class="cb-paper-glow"/>';
  return out;
}
function paperOffHand(c,highlighted){
  var item=itemForSlot(c,'OffHand'),tier=clampTier(item&&item.tier);
  if(!item)return'';
  if(item.slot&&item.slot!=='OffHand')return'';
  var pal=gearPalette(c,item,tier,'OffHand'),type=offHandType(item,c),v=pal.variant,p=bodyProfile(c);
  var dx=type==='quiver'?5:(120-p.shoulder-8)-48;
  return '<g class="'+paperSlotClass('OffHand',highlighted,item)+'" transform="translate('+dx+' 0)" data-offhand-type="'+esc(type)+'" data-item-key="'+esc(itemIdentity(item,'OffHand'))+'">'+offHandMarkup(type,pal,v,tier,item)+'</g>';
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

function illustratedHairFull(a,hair,race){
  var female=Number(a.gender)===1,h=Number(a.hair)||0;
  if(race==='Emberkin'){
    var flames=female
      ?'<path d="M92 59 Q82 34 101 41 Q94 18 116 34 Q121 8 131 35 Q148 17 145 46 Q166 35 151 68 Q138 50 120 48 Q103 49 92 59Z" fill="#ff7138" stroke="#552116" stroke-width="2.2"/><path d="M98 57 Q94 42 108 45 Q107 27 119 42 Q126 22 130 44 Q143 33 141 57Z" fill="#ffbf55" opacity=".72"/>'
      :'<path d="M93 62 Q85 39 103 44 Q97 22 115 36 Q121 13 130 38 Q146 25 143 50 Q157 40 150 67 Q136 51 120 50 Q104 51 93 62Z" fill="#ff7138" stroke="#552116" stroke-width="2.2"/><path d="M102 57 Q98 44 111 47 Q111 31 120 44 Q128 29 132 47 Q141 39 140 58Z" fill="#ffd06d" opacity=".68"/>';
    return flames;
  }
  if(race==='Stoneborn'){
    return '<path d="M94 65 L98 44 L106 50 L111 34 L119 46 L128 29 L134 48 L145 39 L147 65 Q134 52 120 53 Q106 53 94 65Z" fill="#9a958f" stroke="#3b3f43" stroke-width="2.4"/><path d="M100 48 L106 40 L112 50 M126 43 L131 34 L137 51" fill="none" stroke="#e0c487" stroke-width="2" opacity=".7"/>';
  }
  var longHair=female&&(h===3||h===5||race==='Aelari'||race==='Veyren'||race==='Nymari');
  if(longHair){
    var hc=race==='Nymari'?mixHex(hair,'#0b4160',.35):race==='Veyren'?mixHex(hair,'#d8d0ef',.35):hair;
    return '<path d="M90 66 Q90 38 120 34 Q150 39 151 68 L160 177 Q146 164 145 112 Q139 82 132 70 Q120 64 108 70 Q100 84 97 112 Q95 161 80 179 Q88 122 90 66Z" fill="'+hc+'" stroke="#141a20" stroke-width="2.6"/><path d="M98 59 Q111 40 130 45 Q142 48 148 65 Q137 55 126 59 Q113 53 98 59Z" fill="'+mixHex(hc,'#ffffff',.18)+'" opacity=".45"/>';
  }
  if(h===0)return race==='Aelari'?'<path d="M97 56 Q120 41 143 57" fill="none" stroke="'+mixHex(hair,'#ffffff',.28)+'" stroke-width="5" opacity=".65"/>':'';
  if(h===4)return '<path d="M94 61 Q98 41 116 39 L121 22 L126 40 Q145 42 148 61 Q135 52 121 54 Q108 51 94 61Z" fill="'+hair+'" stroke="#141a20" stroke-width="2.4"/>';
  return '<path d="M94 63 Q96 40 120 37 Q145 41 148 64 Q137 55 124 57 Q111 51 94 63Z" fill="'+hair+'" stroke="#141a20" stroke-width="2.4"/><path d="M99 54 Q111 42 126 44" fill="none" stroke="'+mixHex(hair,'#ffffff',.18)+'" stroke-width="2" opacity=".4"/>';
}
function illustratedRaceBodyDetails(c,a,p,skin,accent){
  var race=c.race||a.race||'Veyren',female=p.gender===1;
  if(race==='Stoneborn'){
    return '<g class="cb-illustrated-race-detail">'+
      '<path d="M82 132 l14 -13 l12 8 l12 -16 l12 16 l14 -8 l13 14 l-10 12 l-14 -5 l-15 10 l-16 -10 l-14 5Z" fill="#9d9a95" stroke="#44484a" stroke-width="2.4"/>'+
      '<path d="M84 166 l17 -14 l12 9 l12 -13 l14 12 l17 -10 l12 16 l-15 11 l-11 -7 l-14 8 l-16 -8 l-12 8Z" fill="none" stroke="#d8bd7b" stroke-width="2.2" opacity=".72"/>'+
      '<path d="M92 218 l16 -13 l11 8 l11 -12 l13 11 l14 -8 M86 285 l15 -12 l12 9 M154 280 l-15 -10 l-11 9 M91 333 l12 -11 l10 8 M151 333 l-13 -11 l-11 8" fill="none" stroke="#e0c487" stroke-width="2.1" opacity=".72"/>'+
      '<path d="M73 155 l-16 -9 l8 -12 l17 7 M167 155 l16 -9 l-8 -12 l-17 7 M73 201 l-13 4 l3 -15 l13 -5 M167 201 l13 4 l-3 -15 l-13 -5" fill="#a29d94" stroke="#4a4e50" stroke-width="2"/>'+
      '</g>';
  }
  if(race==='Thornkin'){
    return '<g class="cb-illustrated-race-detail">'+
      '<path d="M102 122 Q91 104 84 92 M107 119 Q98 99 103 86 M137 119 Q143 98 154 88 M142 123 Q154 104 162 99" fill="none" stroke="#5f442c" stroke-width="4.2" stroke-linecap="round"/>'+
      '<path d="M82 94 l-10 -4 l8 10 l-9 4 M103 87 l-8 -6 l6 11 M154 89 l9 -6 l-5 11 M162 99 l10 -5 l-7 11" fill="#719b52" opacity=".9"/>'+
      '<path d="M90 160 Q102 181 96 207 T100 252 M151 160 Q139 181 145 208 T141 253 M101 272 Q88 297 98 327 T94 361 M139 272 Q151 296 142 326 T146 360" fill="none" stroke="#5f442c" stroke-width="3.1" opacity=".9"/>'+
      '<path d="M93 187 l-10 -4 l7 11 M148 190 l11 -5 l-8 12 M98 310 l-10 2 l8 7 M143 307 l10 1 l-8 7" fill="#79a958"/>'+
      '<path d="M108 151 Q120 163 132 151 M103 214 Q120 230 137 214" fill="none" stroke="#a9cc7f" stroke-width="1.4" opacity=".5"/>'+
      '</g>';
  }
  if(race==='Emberkin'){
    return '<g class="cb-illustrated-race-detail">'+
      '<path d="M91 146 l10 14 l-8 15 l13 16 l-9 18 l13 14 l-8 18 M149 146 l-10 14 l8 15 l-13 16 l9 18 l-13 14 l8 18 M104 252 l9 16 l-8 18 l11 18 l-8 21 l9 17 l-7 19 M136 252 l-9 16 l8 18 l-11 18 l8 21 l-9 17 l7 19" fill="none" stroke="#ff6d37" stroke-width="3.2" filter="url(#'+''+'glow)" opacity=".95"/>'+
      '<path d="M108 166 l12 12 l11 -13 M105 201 l15 14 l15 -14 M111 292 l9 12 l10 -12 M106 332 l13 12 l14 -14" fill="none" stroke="#ffb45d" stroke-width="1.6" opacity=".72"/>'+
      '<path d="M75 142 Q61 162 72 183 Q58 198 72 216 M165 142 Q179 162 168 183 Q182 198 168 216 M79 231 Q65 244 75 260 M161 231 Q175 244 165 260" fill="none" stroke="#ff7a3b" stroke-width="5" stroke-linecap="round" opacity=".85"/>'+
      '</g>';
  }
  if(race==='Nymari'){
    return '<g class="cb-illustrated-race-detail">'+
      '<path d="M91 166 Q78 181 88 196 L96 188Z M149 166 Q162 181 152 196 L144 188Z M101 271 Q86 288 98 305 L105 295Z M139 271 Q154 288 142 305 L135 295Z" fill="#64bfd7" stroke="#a1f5ff" stroke-width="1.5" opacity=".62"/>'+
      '<path d="M101 158 Q120 144 139 158 M96 205 Q120 224 144 205 M101 286 Q111 300 102 316 M139 286 Q129 300 138 316" fill="none" stroke="#a4f9ff" stroke-width="1.8" opacity=".72"/>'+
      '<path d="M93 226 Q105 236 96 248 M147 226 Q135 236 144 248 M99 344 q10 10 0 19 M141 344 q-10 10 0 19" fill="none" stroke="#8aefff" stroke-width="1.6" opacity=".62"/>'+
      '</g>';
  }
  if(race==='Aelari'){
    return '<g class="cb-illustrated-race-detail">'+
      '<path d="M101 155 Q120 143 139 155 M101 200 Q120 217 139 200 M97 283 Q107 294 101 307 M143 283 Q133 294 139 307" fill="none" stroke="#8fe8ff" stroke-width="1.8" opacity=".72"/>'+
      '<path d="M94 224 l8 10 l-7 11 M146 224 l-8 10 l7 11 M101 337 l7 9 l-7 10 M139 337 l-7 9 l7 10" fill="none" stroke="#b9f5ff" stroke-width="1.5" opacity=".56"/>'+
      '</g>';
  }
  return '<g class="cb-illustrated-race-detail">'+
    '<path d="M100 158 Q120 144 140 158 M99 207 Q120 222 141 207 M96 288 q13 12 3 25 M144 288 q-13 12 -3 25" fill="none" stroke="#c6a8ff" stroke-width="1.8" opacity=".72"/>'+
    '<path d="M88 183 q12 8 5 20 M152 183 q-12 8 -5 20 M96 332 q11 8 1 20 M144 332 q-11 8 -1 20" fill="none" stroke="#b387ff" stroke-width="1.7" opacity=".6"/>'+
    '</g>';
}
function illustratedBaseFigure(c,a,skin,eye,hair,p,uid){
  var race=c.race||a.race||'Veyren',accent=raceDef(race).accent||'#76d7d0',female=p.gender===1;
  var s=p.shoulder,w=p.waist,h=p.hip,arm=p.arm,leg=p.leg;
  var headW=(female?20:22)*(race==='Stoneborn'?1.08:1),headH=(female?28:29);
  var jaw=female?13:15,headTop=44,chin=105;
  var lx=120-s,rx=120+s;
  var upperArm=Math.max(8,arm*.63),fore=Math.max(6.5,arm*.48);
  var thigh=Math.max(12.5,leg*.86),calf=Math.max(8.8,leg*.62);
  var hipL=120-h,hipR=120+h;
  var lLeg=120-h*.48,rLeg=120+h*.48;
  var face='<path d="M'+(120-headW)+' 59 Q120 '+headTop+' '+(120+headW)+' 59 Q'+(120+headW-2)+' 86 '+(120+jaw)+' 98 Q120 '+chin+' '+(120-jaw)+' 98 Q'+(120-headW+2)+' 86 '+(120-headW)+' 59Z" fill="url(#'+uid+'skin)" stroke="#141a1f" stroke-width="2.4"/>'+
    '<path d="M108 73 Q112 69 117 72 M123 72 Q128 69 132 73" fill="none" stroke="#212329" stroke-width="1.8" stroke-linecap="round"/>'+
    '<ellipse cx="113.5" cy="77" rx="2.7" ry="3.2" fill="'+eye+'"/><ellipse cx="126.5" cy="77" rx="2.7" ry="3.2" fill="'+eye+'"/>'+
    '<circle cx="114.2" cy="76.2" r=".75" fill="#fff" opacity=".82"/><circle cx="127.2" cy="76.2" r=".75" fill="#fff" opacity=".82"/>'+
    '<path d="M120 78 L117.8 87 Q120 89 122.6 87" fill="none" stroke="'+mixHex(skin,'#2a2525',.46)+'" stroke-width="1.2" stroke-linecap="round"/>'+
    '<path d="M113 93 Q120 '+(female?96:95)+' 127 93" fill="none" stroke="'+(race==='Emberkin'?'#ff8050':'#5a3439')+'" stroke-width="1.5" stroke-linecap="round"/>';
  var ears='';
  if(race==='Aelari'||race==='Veyren')ears='<path d="M'+(120-headW+2)+' 70 L'+(race==='Aelari'?72:82)+' 61 L'+(120-headW+5)+' 82Z M'+(120+headW-2)+' 70 L'+(race==='Aelari'?168:158)+' 61 L'+(120+headW-5)+' 82Z" fill="url(#'+uid+'skin)" stroke="#141a1f" stroke-width="2"/>';
  else if(race==='Nymari')ears='<path d="M'+(120-headW+1)+' 70 Q84 60 82 78 Q91 83 '+(120-headW+5)+' 82Z M'+(120+headW-1)+' 70 Q156 60 158 78 Q149 83 '+(120+headW-5)+' 82Z" fill="#66bed2" stroke="#a3f6ff" stroke-width="1.7"/>';
  else ears='<ellipse cx="'+(120-headW+1)+'" cy="76" rx="4.2" ry="7" fill="url(#'+uid+'skin)" stroke="#141a1f" stroke-width="1.7"/><ellipse cx="'+(120+headW-1)+'" cy="76" rx="4.2" ry="7" fill="url(#'+uid+'skin)" stroke="#141a1f" stroke-width="1.7"/>';
  var neck='<path d="M'+(120-p.neck*.42)+' 99 L'+(120-p.neck*.46)+' 126 Q120 137 '+(120+p.neck*.46)+' 126 L'+(120+p.neck*.42)+' 99Z" fill="url(#'+uid+'skin)" stroke="#141a1f" stroke-width="2.2"/>';
  var torso='<path d="M'+(lx+4)+' 126 C'+(lx-1)+' 143 '+(lx+2)+' 176 '+(120-w-4)+' 205 C'+(120-w-2)+' 223 '+(hipL+5)+' 239 '+(hipL+4)+' 251 Q120 264 '+(hipR-4)+' 251 C'+(hipR-5)+' 239 '+(120+w+2)+' 223 '+(120+w+4)+' 205 C'+(rx-2)+' 176 '+(rx+1)+' 143 '+(rx-4)+' 126 Q120 112 '+(lx+4)+' 126Z" fill="url(#'+uid+'skin)" stroke="#141a1f" stroke-width="2.6"/>';
  var leftArm='<path d="M'+(lx+5)+' 132 C'+(lx-upperArm-2)+' 142 '+(lx-upperArm-5)+' 170 '+(lx-upperArm-4)+' 194 C'+(lx-upperArm-2)+' 215 '+(lx-fore-5)+' 240 '+(lx-fore-4)+' 266 Q'+(lx-2)+' 275 '+(lx+fore-1)+' 266 C'+(lx+fore)+' 239 '+(lx+upperArm+2)+' 214 '+(lx+upperArm+3)+' 193 C'+(lx+upperArm+5)+' 169 '+(lx+upperArm+2)+' 142 '+(lx+5)+' 132Z" fill="url(#'+uid+'skin)" stroke="#141a1f" stroke-width="2.4"/>';
  var rightArm='<path d="M'+(rx-5)+' 132 C'+(rx+upperArm+2)+' 142 '+(rx+upperArm+5)+' 170 '+(rx+upperArm+4)+' 194 C'+(rx+upperArm+2)+' 215 '+(rx+fore+5)+' 240 '+(rx+fore+4)+' 266 Q'+(rx+2)+' 275 '+(rx-fore+1)+' 266 C'+(rx-fore)+' 239 '+(rx-upperArm-2)+' 214 '+(rx-upperArm-3)+' 193 C'+(rx-upperArm-5)+' 169 '+(rx-upperArm-2)+' 142 '+(rx-5)+' 132Z" fill="url(#'+uid+'skin)" stroke="#141a1f" stroke-width="2.4"/>';
  var hands='<path d="M'+(lx-fore-4)+' 262 Q'+(lx-10)+' 278 '+(lx-7)+' 291 Q'+(lx-1)+' 299 '+(lx+8)+' 291 Q'+(lx+11)+' 278 '+(lx+fore)+' 262Z" fill="url(#'+uid+'skin)" stroke="#141a1f" stroke-width="2"/><path d="M'+(rx+fore+4)+' 262 Q'+(rx+10)+' 278 '+(rx+7)+' 291 Q'+(rx+1)+' 299 '+(rx-8)+' 291 Q'+(rx-11)+' 278 '+(rx-fore)+' 262Z" fill="url(#'+uid+'skin)" stroke="#141a1f" stroke-width="2"/>'+
    '<path d="M'+(lx-5)+' 284 l-4 10 M'+lx+' 285 l-1 11 M'+(lx+5)+' 283 l2 10 M'+(rx+5)+' 284 l4 10 M'+rx+' 285 l1 11 M'+(rx-5)+' 283 l-2 10" stroke="'+mixHex(skin,'#171b20',.28)+'" stroke-width="1" opacity=".6"/>';
  var leftLeg='<path d="M'+(hipL+5)+' 246 Q'+(lLeg-thigh)+' 269 '+(lLeg-thigh+1)+' 304 C'+(lLeg-thigh+2)+' 330 '+(lLeg-calf-2)+' 351 '+(lLeg-calf)+' 371 Q'+lLeg+' 379 '+(lLeg+calf)+' 371 C'+(lLeg+calf+1)+' 350 '+(lLeg+thigh-2)+' 329 '+(lLeg+thigh-1)+' 304 Q'+(lLeg+thigh)+' 271 117 253Z" fill="url(#'+uid+'skin)" stroke="#141a1f" stroke-width="2.6"/>';
  var rightLeg='<path d="M'+(hipR-5)+' 246 Q'+(rLeg+thigh)+' 269 '+(rLeg+thigh-1)+' 304 C'+(rLeg+thigh-2)+' 330 '+(rLeg+calf+2)+' 351 '+(rLeg+calf)+' 371 Q'+rLeg+' 379 '+(rLeg-calf)+' 371 C'+(rLeg-calf-1)+' 350 '+(rLeg-thigh+2)+' 329 '+(rLeg-thigh+1)+' 304 Q'+(rLeg-thigh)+' 271 123 253Z" fill="url(#'+uid+'skin)" stroke="#141a1f" stroke-width="2.6"/>';
  var feet='<path d="M'+(lLeg-calf-1)+' 365 Q'+(lLeg-11)+' 378 '+(lLeg-18)+' 391 Q'+(lLeg-1)+' 398 '+(lLeg+18)+' 392 L'+(lLeg+calf)+' 370Z" fill="url(#'+uid+'skin)" stroke="#141a1f" stroke-width="2.2"/><path d="M'+(rLeg+calf+1)+' 365 Q'+(rLeg+11)+' 378 '+(rLeg+18)+' 391 Q'+(rLeg+1)+' 398 '+(rLeg-18)+' 392 L'+(rLeg-calf)+' 370Z" fill="url(#'+uid+'skin)" stroke="#141a1f" stroke-width="2.2"/>';
  var under=female
    ?'<path d="M'+(lx+14)+' 150 Q120 139 '+(rx-14)+' 150 L'+(120+w+2)+' 190 Q120 199 '+(120-w-2)+' 190Z" fill="#272229" stroke="#101419" stroke-width="2"/><path d="M'+(hipL+4)+' 244 Q120 255 '+(hipR-4)+' 244 L'+(hipR-1)+' 278 Q120 288 '+(hipL+1)+' 278Z" fill="#2d2528" stroke="#101419" stroke-width="2"/>'
    :'<path d="M'+(hipL+2)+' 244 Q120 254 '+(hipR-2)+' 244 L'+hipR+' 280 Q120 289 '+hipL+' 280Z" fill="#2d2528" stroke="#101419" stroke-width="2"/>';
  var anatomy=female
    ?'<path d="M'+(lx+15)+' 143 Q120 156 '+(rx-15)+' 143 M'+(120-w+8)+' 215 Q120 224 '+(120+w-8)+' 215 M'+(lLeg-thigh+4)+' 304 Q'+lLeg+' 314 '+(lLeg+thigh-4)+' 304 M'+(rLeg-thigh+4)+' 304 Q'+rLeg+' 314 '+(rLeg+thigh-4)+' 304" fill="none" stroke="'+mixHex(skin,'#ffffff',.26)+'" stroke-width="1.35" opacity=".34"/>'
    :'<path d="M'+(lx+10)+' 145 Q120 160 '+(rx-10)+' 145 M102 174 Q120 184 138 174 M120 159 V220 M'+(120-w+7)+' 211 Q120 226 '+(120+w-7)+' 211 M'+(lLeg-thigh+4)+' 302 Q'+lLeg+' 314 '+(lLeg+thigh-4)+' 302 M'+(rLeg-thigh+4)+' 302 Q'+rLeg+' 314 '+(rLeg+thigh-4)+' 302" fill="none" stroke="'+mixHex(skin,'#ffffff',.28)+'" stroke-width="1.45" opacity=".36"/>';
  var shoulders='<path d="M'+(lx+5)+' 131 Q'+(lx+18)+' 119 '+(120-10)+' 126 M'+(rx-5)+' 131 Q'+(rx-18)+' 119 '+(120+10)+' 126" fill="none" stroke="'+mixHex(skin,'#ffffff',.22)+'" stroke-width="1.4" opacity=".3"/>';
  var markings=illustratedRaceBodyDetails(c,a,p,skin,accent);
  var hairFull=illustratedHairFull(a,hair,race);
  var faceMarks='';
  if(race==='Veyren')faceMarks='<path d="M104 67 q5 6 1 13 M135 67 q-5 6 -1 13 M109 91 q11 6 22 0" fill="none" stroke="#c3a8ff" stroke-width="1.3" opacity=".72"/>';
  if(race==='Aelari')faceMarks='<path d="M105 66 l5 -7 l4 7 M135 66 l-5 -7 l-4 7 M120 52 v8" fill="none" stroke="#9aefff" stroke-width="1.4" opacity=".75"/>';
  if(race==='Nymari')faceMarks='<path d="M105 68 q6 -6 10 0 M135 68 q-6 -6 -10 0 M108 91 q12 7 24 0" fill="none" stroke="#9af7ff" stroke-width="1.4" opacity=".78"/>';
  if(race==='Thornkin')faceMarks='<path d="M106 62 q-6 -8 -10 -3 M134 62 q6 -8 10 -3 M111 93 q9 4 18 0" fill="none" stroke="#3e5e32" stroke-width="1.7" opacity=".7"/>';
  if(race==='Emberkin')faceMarks='<path d="M104 64 l8 7 l-6 9 M136 64 l-8 7 l6 9 M114 93 l6 -5 l6 5" fill="none" stroke="#ff7a45" stroke-width="1.8" opacity=".9"/>';
  if(race==='Stoneborn')faceMarks='<path d="M103 63 l7 5 l-4 8 l7 5 M137 63 l-7 5 l4 8 l-7 5" fill="none" stroke="#dfc27f" stroke-width="1.5" opacity=".72"/>';
  return '<g class="cb-illustrated-base" data-race="'+esc(race)+'" data-gender="'+(female?'female':'male')+'">'+
    leftLeg+rightLeg+feet+leftArm+rightArm+hands+neck+torso+under+anatomy+shoulders+markings+ears+face+faceMarks+hairFull+
    '</g>';
}

function paperDollSVG(c,opts){
  opts=opts||{};
  var race=c.race||(c.appearance&&c.appearance.race)||'Veyren';
  var a=normalizeAppearance(c.appearance||c,c.id||c.name||race,race);
  var r=raceDef(a.race),skin=r.skin[a.skinTone],eye=r.eyes[a.eyes],hair=HAIR[a.hairColor];
  var accent=opts.accent||paperAccent(c),highlighted=opts.highlightedSlot||'',profile=bodyProfile(c,a);
  var showGear=opts.showGear!==false;
  var model=showGear?c:Object.assign({},c,{equipment:{}});
  var uid='pd'+hash((c.id||c.name||race)+'|'+JSON.stringify(a)+'|'+(showGear?'gear':'base')).toString(36);
  var skinLight=mixHex(skin,'#ffffff',.18),skinDark=mixHex(skin,'#0d1216',.25);
  var headScale=profile.headScale||1,headX=70+(50*(1-headScale)),headY=20+(50*(1-headScale));
  var baseBg='<ellipse cx="120" cy="214" rx="110" ry="180" fill="url(#'+uid+'a)"/><ellipse cx="120" cy="394" rx="'+Math.max(70,profile.shoulder+27)+'" ry="10" fill="#000" opacity=".38"/>';
  var defs='<defs><radialGradient id="'+uid+'a" cx="50%" cy="44%" r="56%"><stop offset="0%" stop-color="'+accent+'" stop-opacity=".15"/><stop offset="68%" stop-color="'+accent+'" stop-opacity=".025"/><stop offset="100%" stop-color="'+accent+'" stop-opacity="0"/></radialGradient><linearGradient id="'+uid+'skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="'+skinLight+'"/><stop offset="46%" stop-color="'+skin+'"/><stop offset="100%" stop-color="'+skinDark+'"/></linearGradient><filter id="'+uid+'shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity=".34"/></filter></defs>';
  if(!showGear){
    return '<svg viewBox="0 0 240 410" data-race="'+esc(race)+'" data-gender="'+(a.gender===1?'female':'male')+'" data-frame="'+esc(optionText('frame',a.frame,race).toLowerCase())+'" data-model-mode="base" role="img" aria-hidden="true" focusable="false">'+defs+baseBg+illustratedBaseFigure(model,a,skin,eye,hair,profile,uid)+'</svg>';
  }
  return '<svg viewBox="0 0 240 410" data-race="'+esc(race)+'" data-gender="'+(a.gender===1?'female':'male')+'" data-frame="'+esc(optionText('frame',a.frame,race).toLowerCase())+'" data-model-mode="equipped" role="img" aria-hidden="true" focusable="false">'+
    defs+baseBg+
    paperTierAura(model)+
    paperBodyBase(model,a,skin,profile,uid)+
    paperBackLayer(model)+
    paperLegs(model,skin,highlighted)+paperFeet(model,skin,highlighted)+
    paperWeapon(model,highlighted)+paperOffHand(model,highlighted)+
    paperArms(model,skin,highlighted)+paperChest(model,highlighted)+paperWaist(model,highlighted)+paperShoulders(model,highlighted)+paperAccessories(model,highlighted)+
    '<g transform="translate('+headX+' '+headY+') scale('+headScale+')">'+paperHeadMarkup(model,a,skin,eye,hair,highlighted)+'</g>'+
    '</svg>';
}
function paperDollHTML(subject,opts){
  opts=opts||{};
  var c=subject||{},size=opts.size||'equipment',accent=opts.accent||paperAccent(c),showGear=opts.showGear!==false,set=showGear?dominantSetState(c):null;
  var label=opts.label||((c.name||'Character')+(showGear?' equipment appearance':' base character model'));
  var cls='cb-paper-doll cb-paper-doll--'+esc(size)+(set?' has-set set-pieces-'+Math.min(4,set.count):'')+(showGear?' is-equipped-model':' is-base-model');
  return '<span class="'+cls+'" style="--cbp-accent:'+accent+(set?' ;--cbp-set-glow:'+set.visual.glow:'')+'" role="img" aria-label="'+esc(label)+'">'+paperDollSVG(c,opts)+'</span>';
}
function visualProfile(subject,item,slot){
  var c=subject||{},s=slot||item?.slot||'Gear',tier=clampTier(item?.tier),pal=gearPalette(c,item,tier||1,s);
  return {key:itemIdentity(item,s),slot:s,tier:tier,variant:pal.variant,isSet:isSetItem(item),weaponType:s==='Weapon'?weaponType(item,c):null,offHandType:s==='OffHand'?offHandType(item,c):null,palette:pal};
}

window.CellboundPortraits={
  version:8,RACES:RACES,COUNTS:COUNTS,CLASS_COLORS:CLASS_COLORS,
  normalizeAppearance:normalizeAppearance,randomAppearance:randomAppearance,
  applyToCharacter:applyToCharacter,portraitHTML:portraitHTML,paperDollHTML:paperDollHTML,paperDollSVG:paperDollSVG,bodyProfile:bodyProfile,
  visualProfile:visualProfile,weaponType:weaponType,offHandType:offHandType,
  editorHTML:editorHTML,bindEditor:bindEditor
};
})();