(()=>{
'use strict';

const CHARACTER_MODEL_VERSION=11;
const PAINTED_RACES=new Set(['Veyren','Stoneborn','Aelari','Thornkin','Emberkin','Nymari']);
const CHARACTER_MODEL_CONTRACT='v11-race-foundation-hair';
const EQUIPMENT_LAYER_CONTRACT='body|shield|armour|front-offhand|mainhand-front';

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
    skin:['#f2e5db','#e6d5d0','#d8c5cd','#cebdc7','#baaeba','#aaa1b6'],
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
const COUNTS={gender:2,frame:3,skinTone:6,face:4,hair:6,hairColor:8,facialHair:4,marking:5,eyes:6,feature:4,brows:3,nose:3,mouth:3,glow:4,eyeShape:3,pattern:4,featureColor:4,texture:3};
const LABELS={
  gender:'Body',frame:'Frame',skinTone:'Skin',face:'Face',hair:'Hair',hairColor:'Hair color',
  facialHair:'Facial hair',marking:'Marking',eyes:'Eye colour',brows:'Brows',nose:'Nose',mouth:'Mouth',glow:'Glow intensity',eyeShape:'Eye shape',pattern:'Body pattern',featureColor:'Feature colour',texture:'Surface detail'
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
  var out=Object.assign({},src,{race:race,appearanceVersion:1});
  Object.keys(COUNTS).forEach(function(field){
    out[field]=int(src[field],COUNTS[field],['brows','nose','mouth','eyeShape','texture'].includes(field)?1:['pattern','featureColor'].includes(field)?0:field==='glow'?2:seeded(key,field,COUNTS[field]));
  });
  if(out.gender===1)out.facialHair=0;
  out.appearanceVersion=1;
  return out;
}
function randomAppearance(race){
  var out={race:RACES[race]?race:'Veyren'};
  Object.keys(COUNTS).forEach(function(field){out[field]=Math.floor(Math.random()*COUNTS[field])});
  if(out.gender===1)out.facialHair=0;
  out.appearanceVersion=1;
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
  var h=a.hair,race=a.race||'Veyren';if(h===0)return '';
  var dark=mixHex(hair,'#0b1014',.48),light=mixHex(hair,'#ffffff',.22),accent=raceDef(race).accent||'#76d7d0';
  var fill=race==='Stoneborn'?mixHex(hair,'#9d968c',.55):race==='Thornkin'?mixHex(hair,'#5c442d',.42):race==='Emberkin'?mixHex(hair,'#351f22',.38):race==='Nymari'?mixHex(hair,'#245c70',.38):mixHex(hair,accent,.08);
  var path=h===1?'M31 39 Q31 22 50 20 Q69 22 69 39 Q58 31 50 33 Q41 30 31 39Z':
    h===2?'M29 42 Q29 20 52 19 Q72 21 70 42 Q59 31 47 34 Q37 34 29 42Z':
    h===3?'M29 40 Q29 20 50 19 Q71 20 71 40 L73 70 Q68 64 65 52 L64 34 Q50 27 36 35 L35 53 Q32 64 27 70Z':
    h===4?'M43 31 L46 13 L51 26 L56 12 L58 32 Q50 27 43 31Z M31 39 Q34 29 43 29 Q50 35 58 29 Q67 30 69 39 Q56 32 50 34 Q41 31 31 39Z':
    'M30 40 Q31 21 50 20 Q69 22 70 40 Q60 31 50 34 Q40 30 30 40Z M31 38 Q23 52 30 70 M69 38 Q77 52 70 70';
  var extra=race==='Stoneborn'?'<path d="M37 31 l5 5 l-3 6 M56 28 l-4 6 l5 5" fill="none" stroke="'+mixHex(fill,'#ead190',.28)+'" stroke-width=".8" opacity=".65"/>':
    race==='Thornkin'?'<path d="M34 34 q-7 -8 -10 -3 M66 34 q7 -8 10 -3" fill="none" stroke="'+fill+'" stroke-width="2"/><path d="M24 31 l-5 -1 l4 4 M76 31 l5 -1 l-4 4" fill="'+mixHex(accent,'#7fa45f',.4)+'"/>':
    race==='Emberkin'?'<path d="M39 31 l4 5 l-3 5 M59 30 l-4 6 l4 5" fill="none" stroke="#ff7548" stroke-width=".8" opacity=".7"/>':
    race==='Nymari'?'<path d="M37 32 q6 4 12 0 q6 4 12 0" fill="none" stroke="#9cf5ff" stroke-width=".7" opacity=".5"/>':'';
  return '<path d="'+path+'" fill="'+fill+'" stroke="'+dark+'" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round"/><path d="M37 31 Q50 22 63 31" fill="none" stroke="'+light+'" stroke-width=".8" opacity=".42"/>'+extra;
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
  return '<span class="'+cls+'" style="--cbp-accent:'+accent+'" role="img" aria-label="'+esc(label)+'">'+paperDollSVG(Object.assign({},c,{appearance:a}),{showGear:false,portrait:true})+'</span>';
}
function optionText(field,value,race){
  if(field==='gender')return Number(value)===1?'Female':'Male';
  if(field==='glow')return ['Subtle','Soft','Bright','Radiant'][Number(value)];
  if(field==='hair')return ['Bald','Cropped','Swept','Long','Crest','Braided'][Number(value)];
  if(field==='frame')return ['Lean','Balanced','Strong'][Number(value)]||'Balanced';
  if(field==='hair'&&value===0)return 'None';
  if(field==='facialHair'&&value===0)return 'None';
  if(field==='marking'&&value===0)return 'None';
  return String(value+1).padStart(2,'0')+' / '+String(COUNTS[field]).padStart(2,'0');
}
function editorHTML(appearance,opts){
  opts=opts||{};
  var a=normalizeAppearance(appearance,opts.seed,appearance?.race||opts.race);
  var fields=['gender','frame','skinTone','face','brows','nose','mouth','eyeShape','eyes','hair','hairColor'];
  if(a.gender===0)fields.push('facialHair');
  fields.push('marking','feature','pattern','featureColor','texture','glow');
  var groups={gender:'Body',face:'Face',hair:'Hair',marking:'Markings',feature:'Race features'};
  var rows=fields.map(function(field){
    var label=field==='feature'?(raceDef(a.race).featureLabel||'Race detail'):(LABELS[field]||field);
    return (groups[field]?'<h3 class="cb-creation-group">'+groups[field]+'</h3>':'')+'<div class="cb-appearance-control"><span>'+esc(label)+'</span><div><button type="button" data-appearance-field="'+field+'" data-direction="-1" aria-label="Previous '+esc(label)+'">‹</button><b>'+esc(optionText(field,a[field],a.race))+'</b><button type="button" data-appearance-field="'+field+'" data-direction="1" aria-label="Next '+esc(label)+'">›</button></div></div>';
  }).join('');
  var preview={race:a.race,appearance:a,name:opts.name||'Character',equipment:{}};
  return '<div class="cb-appearance-editor" data-appearance-editor><div class="cb-appearance-preview">'+paperDollHTML(preview,{size:'creator',showGear:false,label:(opts.name||'Character')+' race base model preview'})+'<small class="cb-appearance-race-label">'+esc(a.race)+' · '+esc(optionText('gender',a.gender,a.race))+' · '+esc(optionText('frame',a.frame,a.race))+'</small><button type="button" data-appearance-randomize>RANDOMISE APPEARANCE</button></div><div class="cb-appearance-controls">'+rows+'</div></div>';
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
  const t=Math.max(1,clampTier(tier)),family=gearProfile(item).family,set=setVisual(c,item),variant=visualVariant(item,slot,6),accent=gearAccent(item);
  const stock={plate:['#626767','#89959b','#a8b5bb'],mail:['#666b66','#7c8b8d','#9fabad'],leather:['#665141','#775845','#805f45'],cloth:['#696555','#546675','#516781']};
  let base=(stock[family]||stock.leather)[Math.min(2,t-1)];
  // Class hue is a dye/accent; it never replaces the metal, hide or fabric material.
  if(family==='cloth')base=mixHex(base,accent,t===1?.08:.24);
  if(family==='leather'&&t>1)base=mixHex(base,accent,.10);
  if(t>=4&&set)base=mixHex(set.primary,family==='plate'?'#8b979c':'#4f5455',family==='plate'?.82:.35);
  if(family==='plate'&&gearClass(item)==='Paladin')base=mixHex(base,'#d5d1ba',t>=3?.24:.12);
  if(family==='leather'&&gearClass(item)==='Rogue')base=mixHex('#343a40',t>=4?(set?.primary||accent):'#64574e',t>=4?.16:.24);
  if(family==='leather'&&gearClass(item)==='Hunter'&&t>=4)base=mixHex('#665744',set?.primary||accent,.22);
  base=mixHex(base,variant%2?'#b7afa0':'#3e3937',.035);
  const trim=t===1?'#645a48':t===2?'#9c9280':t===3?'#b6a17b':t===4?mixHex(set?.trim||accent,'#b4a082',.35):'#d9c796';
  return {accent,base,dark:mixHex(base,'#11171c',.62),light:mixHex(base,'#f1ebdb',family==='plate'?.40:.25),trim,glow:set?.glow||mixHex(accent,'#e7eff0',.35),set,variant,material:family};
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
const PAINTED_HAND_RIG={Veyren:[[58,182,220],[63,177,218]],Stoneborn:[[46,194,226],[58,182,218]],Aelari:[[68,172,212],[70,170,210]],Thornkin:[[63,177,214],[69,171,211]],Emberkin:[[52,188,225],[60,180,219]],Nymari:[[54,186,223],[62,178,218]]};
function gearFitProfile(c,item){
  var p=bodyProfile(c),race=c?.race||c?.appearance?.race||'Veyren',gender=p.gender,frame=p.frame;
  var shoulderY=race==='Stoneborn'?130:gender===1?133:131;
  var leftShoulder=120-p.shoulder,rightShoulder=120+p.shoulder;
  var spread=PAINTED_RACES.has(race)?13:0;
  var leftHand=leftShoulder-spread,rightHand=rightShoulder+spread,handY=283;
  if(PAINTED_HAND_RIG[race]){
    const hand=PAINTED_HAND_RIG[race][gender],bodyScale=[.94,1,1.06][frame];
    leftHand=120+(hand[0]-120)*bodyScale;rightHand=120+(hand[1]-120)*bodyScale;
    handY=247+(hand[2]-179)*36/59;
  }
  var hipHalf=p.hip,legHalf=Math.max(11.5,p.leg*.82),calfHalf=Math.max(8.8,p.leg*.62);
  var footHalf=Math.max(11,p.leg*.72);
  var waistHalf=Math.max(p.waist,p.hip*.70);
  return {
    race:race,gender:gender,frame:frame,p:p,
    centerX:120,shoulderY:shoulderY,
    leftShoulder:leftShoulder,rightShoulder:rightShoulder,
    leftHand:leftHand,rightHand:rightHand,handY:handY,
    waistY:247,waistHalf:waistHalf,hipHalf:hipHalf,
    leftLeg:120-p.hip*(PAINTED_RACES.has(race)?.80:.47),rightLeg:120+p.hip*(PAINTED_RACES.has(race)?.80:.47),
    legHalf:legHalf,calfHalf:calfHalf,footHalf:footHalf,
    chestTop:gender===1?121:119,chestBottom:252,
    weaponX:rightHand,offhandX:leftHand-8,
    headGearScaleX:(gender===1?.75:.78)*([.94,1,1.05,.98][c.appearance?.face]||1)
  };
}
// Shared anatomical coordinates in the 240 x 410 model space. No class input.
function anatomicalAnchors(c){
  var f=gearFitProfile(c);
  var anchors= {head:{x:120,y:60},face:{x:120,y:78},neck:{x:120,y:112},
    leftShoulder:{x:f.leftShoulder,y:f.shoulderY},rightShoulder:{x:f.rightShoulder,y:f.shoulderY},
    chest:{x:120,y:(f.chestTop+f.chestBottom)/2},waist:{x:120,y:f.waistY},
    leftHand:{x:f.leftHand,y:f.handY},rightHand:{x:f.rightHand,y:f.handY},
    mainHand:{x:f.weaponX,y:f.handY},offHand:{x:f.offhandX,y:f.handY},
    back:{x:120,y:150},leftFoot:{x:f.leftLeg,y:380},rightFoot:{x:f.rightLeg,y:380}};
  if(PAINTED_RACES.has(c.race))Object.values(anchors).forEach(a=>{a.y=rigY(a.y)});
  return anchors;
}
function rigY(y){return y<=110?y*.8-16:y<=247?72+(y-110)*107/137:y<=283?179+(y-247)*59/36:238+(y-283)*172/127}

function equipmentCoverage(c){
  var head=itemForSlot(c,'Head');
  if(!head)return {hair:false,growth:false};
  return {hair:true,growth:true};
}
function tierVisualProfile(tier){
  var t=Math.max(1,Math.min(5,Number(tier)||1));
  return [
    null,
    {shoulder:0,rise:0,chest:0,collar:0,knee:0,boot:0,weapon:1,ornament:0},
    {shoulder:3,rise:1,chest:1.5,collar:2,knee:1.5,boot:1.5,weapon:1.025,ornament:1},
    {shoulder:7,rise:3,chest:3.5,collar:5,knee:3,boot:3,weapon:1.055,ornament:2},
    {shoulder:12,rise:5,chest:5.5,collar:8,knee:5,boot:4.5,weapon:1.09,ornament:3},
    {shoulder:17,rise:8,chest:8,collar:12,knee:7,boot:6.5,weapon:1.13,ornament:4}
  ][t];
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
  if(/(crossbow)/.test(n))return'crossbow';
  if(/(bow|longbow|shortbow)/.test(n))return'bow';
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
function weaponFitProfile(c,item){
  const fit=gearFitProfile(c,item),type=weaponType(item,c);
  const rotations={bow:0,crossbow:-8,spear:2,axe:4,hammer:3,mace:3,dagger:8,staff:2,rod:2,greatsword:3,sword:4};
  return {type,klass:gearClass(item),anchorX:fit.weaponX,anchorY:fit.handY,pivotX:200,pivotY:283,rotate:rotations[type]||0,scale:type==='greatsword'?1.02:1,handScale:Math.max(.94,Math.min(1.08,fit.p.hand||1)),body:fit};
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
  if(max>=5)out+='<ellipse cx="120" cy="390" rx="67" ry="10" fill="none" stroke="'+accent+'" stroke-width="1.5" opacity=".22" class="cb-paper-glow"/>';
  if(set&&set.count>=4)out+='<path d="M102 390 l8 -2 M130 388 l8 2" fill="none" stroke="'+accent+'" stroke-width="1.5" opacity=".4" class="cb-paper-set-glow"/>';
  return out;
}


// Head coordinates are measured on the 240x410 painted bases, independently of class.
// Map once into the legacy rig's head band; the final band transform cancels below.
const PAINTED_HEAD_RIG={
  Veyren:[[120,20,33],[120.5,20,34]],
  Stoneborn:[[120,23,35],[119.5,23,36]],
  Aelari:[[121,20,33],[120.5,20,34]],
  Thornkin:[[121,22,35],[120,22,35]],
  Emberkin:[[120,20,33],[120.5,20,34]],
  Nymari:[[120.5,20,34],[120.5,20,35]]
};
function paintedHairFit(a,race){
  const [cx,crown,width]=(PAINTED_HEAD_RIG[race]||PAINTED_HEAD_RIG.Veyren)[Number(a.gender)===1?1:0];
  const face=[.94,1,1.05,.98][a.face]||1;
  return 'translate('+(120+(cx-120)*face)+' '+((crown-2+16)/.8)+') scale('+(width/50*face)+' .8) translate(-120 -36)';
}
function illustratedHairFull(a,hair,race,uid,layer){
  const h=Number(a.hair)||0;if(!h)return '';
  const back=layer==='back';if(back&&h!==3&&h!==5)return '';
  let tone=hair;
  if(race==='Stoneborn')tone=mixHex(hair,'#8d8882',.32);
  if(race==='Thornkin')tone=mixHex(hair,'#624e34',.26);
  if(race==='Emberkin')tone=mixHex(hair,'#402c29',.15);
  if(race==='Nymari')tone=mixHex(hair,'#2c535e',.16);
  const dark=mixHex(tone,'#080c12',.55),light=mixHex(tone,'#dfd7c9',.29),id=uid+'hair'+(back?'Back':'Front');
  const defs='<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2=".65"><stop stop-color="'+dark+'"/><stop offset=".28" stop-color="'+tone+'"/><stop offset=".52" stop-color="'+light+'"/><stop offset=".70" stop-color="'+tone+'"/><stop offset="1" stop-color="'+dark+'"/></linearGradient></defs>';
  const cap=[null,
    'M94 64 Q91 42 110 36 Q133 28 145 45 L148 64 Q140 56 132 58 L124 55 L113 59 Q103 57 94 64Z',
    'M93 70 Q87 43 107 34 Q135 25 149 43 L146 59 Q132 43 118 51 Q107 56 96 76 L98 62Z',
    'M92 72 Q88 39 116 33 Q148 29 150 70 L143 78 Q143 52 129 47 L120 53 Q107 47 99 76 L96 91Z',
    'M94 66 Q92 46 109 38 Q113 27 128 25 L124 35 Q142 36 147 52 L147 64 Q134 52 123 56 Q108 52 94 66Z',
    'M93 70 Q89 37 118 33 Q148 32 149 70 L143 79 Q141 53 128 48 L120 51 L110 47 Q101 55 99 80Z'
  ][h];
  let shapes='',strands='';
  if(back){
    shapes='<path d="M92 63 Q89 36 120 34 Q152 36 150 65 L157 167 Q146 156 144 117 L140 77 H101 L98 118 Q96 159 82 170Z"/>';
    strands='M94 71 Q88 116 88 153 M148 72 Q153 115 151 149 M101 73 Q98 113 95 146 M141 74 Q143 112 147 148';
  }else{
    shapes='<path d="'+cap+'"/>';
    strands=h===1?'M98 53 Q105 38 121 38 M102 57 Q113 39 131 41 M110 55 Q126 42 141 52':h===2?'M97 55 Q114 32 138 40 M99 62 Q115 42 135 46 M107 54 Q126 40 143 50':h===4?'M99 55 Q109 37 122 34 M104 57 Q121 39 138 46 M113 51 Q129 43 143 55':'M97 56 Q102 39 118 38 M122 38 Q143 36 146 57 M100 63 Q103 50 111 45 M134 44 Q141 51 143 65';
    if(h===3){
      shapes+='<path d="M96 65 Q93 87 92 110 Q91 133 87 144 Q101 129 101 108 L102 73Z M144 65 L140 74 Q141 98 143 115 Q144 133 153 143 Q147 117 149 96Z"/>';
      strands+=' M97 81 Q95 112 93 128 M144 80 Q143 105 148 128';
    }
    if(h===5){
      for(const sign of [-1,1]){
        const x=120+sign*24;
        shapes+='<path d="M'+x+' 67 Q'+(x+sign*7)+' 83 '+(x+sign*1)+' 94 Q'+(x-sign*4)+' 106 '+(x+sign*1)+' 116 Q'+(x+sign*6)+' 130 '+(x+sign*1)+' 146 L'+(x-sign*5)+' 151 Q'+(x-sign*8)+' 135 '+(x-sign*5)+' 119 Q'+(x-sign*10)+' 102 '+(x-sign*5)+' 89 L'+(x-sign*5)+' 73Z"/>';
        for(let y=88;y<145;y+=9)strands+=' M'+(x-sign*5)+' '+y+' q'+(sign*8)+' 2 '+(sign*5)+' 8';
      }
    }
  }
  let detail='';
  if(!back&&race==='Stoneborn')detail='<path d="M102 49 l7 -8 l5 8 M129 43 l7 -5 l6 12" fill="none" stroke="'+light+'" stroke-width="1" opacity=".5"/>';
  if(!back&&race==='Thornkin')detail='<path d="M100 50 Q91 40 94 37 Q103 38 104 47 M137 49 Q147 37 150 42 Q148 50 140 53" fill="#728055" stroke="'+dark+'" stroke-width=".7"/>';
  return '<g class="cb-painted-hair cb-painted-hair-'+race.toLowerCase()+'" data-hair-layer="'+(back?'back':'front')+'">'+defs+'<g fill="url(#'+id+')" stroke="'+dark+'" stroke-width="1.1" stroke-linejoin="round">'+shapes+'</g><path d="'+strands+'" fill="none" stroke="'+light+'" stroke-width=".85" stroke-linecap="round" opacity=".45"/>'+detail+'</g>';
}
function illustratedRaceBodyDetails(c,a,p,skin,accent,uid){
  var race=c.race||a.race||'Veyren';
  if(race==='Stoneborn'){
    return '<g class="cb-illustrated-race-detail cb-stoneborn-detail">'+
      '<path d="M84 139 L96 127 L103 133 L111 119 L120 130 L130 116 L138 132 L146 126 L157 140 L148 148 L136 144 L127 151 L120 146 L112 152 L102 144 L92 149Z" fill="url(#'+uid+'crystal)" stroke="#6e675e" stroke-width="1.5"/>'+
      '<path d="M74 164 L64 156 L68 145 L79 151 L84 164 L78 176 L67 174Z M166 164 L176 156 L172 145 L161 151 L156 164 L162 176 L173 174Z" fill="url(#'+uid+'crystal)" stroke="#6e675e" stroke-width="1.5"/>'+
      '<path d="M78 210 L66 220 L68 244 L79 252 L87 237 L84 219Z M162 210 L174 220 L172 244 L161 252 L153 237 L156 219Z" fill="url(#'+uid+'crystal)" stroke="#6e675e" stroke-width="1.5"/>'+
      '<path d="M91 302 L81 318 L84 347 L94 359 L104 345 L104 317Z M149 302 L159 318 L156 347 L146 359 L136 345 L136 317Z" fill="url(#'+uid+'crystal)" stroke="#6e675e" stroke-width="1.5"/>'+
      '<path d="M101 143 l8 12 l-7 14 l13 12 l-9 17 l11 11 l-8 18 M139 143 l-8 12 l7 14 l-13 12 l9 17 l-11 11 l8 18 M98 258 l12 13 l-8 18 l10 15 l-7 21 l11 13 M142 258 l-12 13 l8 18 l-10 15 l7 21 l-11 13" fill="none" stroke="#dfc17b" stroke-width="1.7" opacity=".82"/>'+
      '<path d="M104 163 L116 157 L120 167 L129 158 L138 166 M102 204 L112 197 L120 207 L129 198 L138 205 M92 330 L101 322 L108 330 M148 330 L139 322 L132 330" fill="none" stroke="#f0d89a" stroke-width="1.1" opacity=".56"/>'+
      '</g>';
  }
  if(race==='Thornkin'){
    return '<g class="cb-illustrated-race-detail cb-thornkin-detail">'+
      '<path d="M103 121 Q91 103 80 94 M109 119 Q102 98 106 84 M132 119 Q140 98 153 87 M139 122 Q153 103 165 97" fill="none" stroke="#5a4029" stroke-width="3.4" stroke-linecap="round"/>'+
      '<path d="M80 94 l-11 -3 l8 9 l-10 4 M106 84 l-9 -5 l7 10 M153 87 l10 -5 l-6 10 M165 97 l11 -4 l-8 10" fill="#79a557" stroke="#456137" stroke-width=".8"/>'+
      '<path d="M90 151 Q104 174 98 199 T102 248 M150 151 Q136 174 142 199 T138 248 M101 267 Q88 291 98 320 T95 363 M139 267 Q152 291 142 320 T145 363" fill="none" stroke="#61452d" stroke-width="2.7" opacity=".95"/>'+
      '<path d="M96 166 l-11 -4 l8 11 M144 166 l11 -4 l-8 11 M98 215 l-10 2 l8 7 M142 215 l10 2 l-8 7 M98 310 l-10 1 l8 7 M142 310 l10 1 l-8 7" fill="#7daa59" stroke="#47663b" stroke-width=".7"/>'+
      '<path d="M105 153 Q120 166 135 153 M102 205 Q120 220 138 205 M104 278 Q120 291 136 278" fill="none" stroke="#b2d18b" stroke-width="1.1" opacity=".48"/>'+
      '</g>';
  }
  if(race==='Emberkin'){
    return '<g class="cb-illustrated-race-detail cb-emberkin-detail" filter="url(#'+uid+'softGlow)">'+
      '<path d="M95 139 l10 13 l-7 14 l12 13 l-8 18 l12 14 l-8 19 M145 139 l-10 13 l7 14 l-12 13 l8 18 l-12 14 l8 19 M101 254 l10 14 l-8 18 l11 17 l-7 21 l10 16 l-7 23 M139 254 l-10 14 l8 18 l-11 17 l7 21 l-10 16 l7 23" fill="none" stroke="#ff6d37" stroke-width="2.7" opacity=".96"/>'+
      '<path d="M107 158 l13 12 l12 -13 M105 194 l15 14 l15 -14 M109 277 l11 13 l11 -13 M108 318 l12 14 l13 -15" fill="none" stroke="#ffc06a" stroke-width="1.4" opacity=".8"/>'+
      '<path d="M75 139 Q62 156 73 176 Q59 193 72 210 M165 139 Q178 156 167 176 Q181 193 168 210 M78 226 Q65 241 75 258 M162 226 Q175 241 165 258" fill="none" stroke="#ff7737" stroke-width="3.8" stroke-linecap="round" opacity=".82"/>'+
      '</g>';
  }
  if(race==='Nymari'){
    return '<g class="cb-illustrated-race-detail cb-nymari-detail">'+
      '<path d="M89 161 Q75 177 87 194 L97 184Z M151 161 Q165 177 153 194 L143 184Z M98 270 Q84 286 97 302 L106 291Z M142 270 Q156 286 143 302 L134 291Z" fill="url(#'+uid+'fin)" stroke="#a4f5ff" stroke-width="1.1" opacity=".78"/>'+
      '<path d="M99 153 Q120 139 141 153 M96 198 Q120 218 144 198 M102 281 Q113 295 103 310 M138 281 Q127 295 137 310 M102 340 q10 11 0 21 M138 340 q-10 11 0 21" fill="none" stroke="#9cf4ff" stroke-width="1.6" opacity=".75"/>'+
      '</g>';
  }
  if(race==='Aelari'){
    return '<g class="cb-illustrated-race-detail cb-aelari-detail">'+
      '<path d="M101 150 Q120 138 139 150 M101 193 Q120 210 139 193 M99 274 q12 11 3 25 M141 274 q-12 11 -3 25 M101 337 l8 10 l-8 11 M139 337 l-8 10 l8 11" fill="none" stroke="#8ee9ff" stroke-width="1.5" opacity=".76"/>'+
      '<circle cx="103" cy="222" r="2" fill="#a9f4ff" opacity=".7"/><circle cx="137" cy="222" r="2" fill="#a9f4ff" opacity=".7"/>'+
      '</g>';
  }
  return '<g class="cb-illustrated-race-detail cb-veyren-detail">'+
    '<path d="M99 151 Q120 137 141 151 M98 198 Q120 215 142 198 M96 276 q13 12 3 26 M144 276 q-13 12 -3 26 M98 337 q10 9 1 20 M142 337 q-10 9 -1 20" fill="none" stroke="#c1a3ff" stroke-width="1.6" opacity=".78"/>'+
    '<path d="M88 176 q12 8 5 19 M152 176 q-12 8 -5 19" fill="none" stroke="#9e73ef" stroke-width="1.7" opacity=".66"/>'+
    '</g>';
}
function raceSurface(c,a,p,uid,skin){
  const race=a.race,ink=mixHex(skin,'#12151d',.42),light=mixHex(skin,'#ffffff',.28);
  const palettes={Veyren:['#ba8bfa','#cfafea','#859df2','#d5a4d3'],Stoneborn:['#d7bd83','#88c6cc','#bfa2d5','#b0cb8e'],Aelari:['#ead6a2','#c5eaff','#e9dafa','#dcf1e7'],Thornkin:['#9eaf6a','#c993aa','#dbd3ad','#b59550'],Emberkin:['#ff9245','#ffd36d','#ee6852','#c395f7'],Nymari:['#91ecf0','#adbbff','#8befc3','#e8b7ef']};
  const glow=palettes[race][a.featureColor],n=8+a.texture*5,seed=hash(race+'|'+a.pattern);
  let out='';
  for(let i=0;i<n;i++){
    const x=65+((seed+i*41)%110),y=127+((seed+i*67)%250);
    if(race==='Stoneborn')out+='<path d="M'+x+' '+y+' l9 -7 l12 4 l-3 12 l-11 5Z" fill="'+(i%2?light:ink)+'" opacity=".28" stroke="'+ink+'" stroke-width=".7"/><path d="M'+x+' '+y+' l9 -7 l12 4" fill="none" stroke="'+glow+'" stroke-width=".7" opacity=".7"/>';
    else if(race==='Thornkin')out+='<path d="M'+x+' '+y+' q-8 12 -2 25 t-3 26 m5 -39 q8 10 3 20" fill="none" stroke="'+ink+'" stroke-width="1.6"/><path d="M'+(x+2)+' '+y+' q-8 12 -2 25" fill="none" stroke="'+light+'" stroke-width=".8"/>';
    else if(race==='Emberkin')out+='<path d="M'+x+' '+y+' l5 9 l-4 7 l8 8 m-4 -17 l9 -5" fill="none" stroke="'+ink+'" stroke-width="3"/><path d="M'+x+' '+y+' l5 9 l-4 7 l8 8 m-4 -17 l9 -5" fill="none" stroke="'+glow+'" stroke-width=".8" opacity="'+(.4+a.glow*.18)+'"/>';
    else if(race==='Nymari')out+='<path d="M'+x+' '+y+' q3 4 6 0 q3 4 6 0 m-9 4 q3 4 6 0" fill="none" stroke="'+glow+'" stroke-width=".8" opacity=".5"/>';
    else if(i%2===0)out+='<path d="M'+x+' '+y+' l3 -5 l3 5 l-3 5Z" fill="none" stroke="'+glow+'" stroke-width=".8" opacity="'+(.3+a.glow*.15)+'"/>';
  }
  return '<g class="cb-race-surface" clip-path="url(#'+uid+'anatomy)">'+out+'</g>';
}
// Painted body rig: source artwork and equipment share this anatomical mapping.
// Each band joins at a joint; class never affects the body or the mapping.
function paintedRig(markup,uid){
  const bands=[[0,110,-16,72],[110,247,72,179],[247,283,179,238],[283,410,238,410]];
  return '<defs><g id="'+uid+'rigSource">'+markup+'</g>'+bands.map((b,i)=>'<clipPath id="'+uid+'band'+i+'"><rect x="-100" y="'+b[0]+'" width="440" height="'+(b[1]-b[0])+'"/></clipPath>').join('')+'</defs>'+bands.map((b,i)=>{const scale=(b[3]-b[2])/(b[1]-b[0]),dy=b[2]-b[0]*scale;return '<g transform="translate(0 '+dy+') scale(1 '+scale+')"><use href="#'+uid+'rigSource" clip-path="url(#'+uid+'band'+i+')"/></g>'}).join('');
}
function paintedBody(c,a,p,uid,skin,eye,hair,headDetails,bodyDetails,portrait){
  const src='./assets/characters/race-bases/'+a.race.toLowerCase()+'-'+(a.gender?'female':'male')+'.webp';
  const rgb=skin.slice(1).match(/../g).map(v=>parseInt(v,16)/170),frame=[.94,1,1.06][a.frame],face=[.94,1,1.05,.98][a.face];
  const img='<image href="'+src+'" x="0" y="0" width="240" height="410" preserveAspectRatio="none"/>';
  const tint='<filter id="'+uid+'tint" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="'+rgb.map(v=>(.333*v)+' '+(.333*v)+' '+(.333*v)+' 0 0').join(' ')+' 0 0 0 1 0"/></filter>';
  const clips='<clipPath id="'+uid+'paintHead"><rect x="0" y="0" width="240" height="74"/></clipPath><clipPath id="'+uid+'paintBody"><rect x="0" y="74" width="240" height="336"/></clipPath>';
  const eyes='<g data-painted-eyes="'+a.eyeShape+'" fill="'+eye+'" opacity="'+(.55+a.glow*.1)+'"><ellipse cx="113.5" cy="76" rx="'+(1.5+a.eyeShape*.3)+'" ry="1.25"/><ellipse cx="126.5" cy="76" rx="'+(1.5+a.eyeShape*.3)+'" ry="1.25"/></g>';
  const facial='<g fill="none" stroke="'+mixHex(skin,'#201622',.55)+'" stroke-width=".65" opacity=".5"><path d="M108 '+(68+a.brows)+' l8 1 M124 '+(69+a.brows)+' l8 -1 M120 79 l'+(-1-a.nose*.4)+' 6 M'+(116-a.mouth)+' 91 h'+(8+a.mouth*2)+'"/></g>';
  // Cover the occupied anatomy, including its surface markings, before layering gear.
  // The lower-body region excludes the hands so independent slots remain independent.
  let coverage='';
  if(!portrait&&itemForSlot(c,'Legs'))coverage+='<path d="M75 178 H165 V240 H210 V337 H30 V240 H75Z" fill="black"/>';
  if(!portrait&&itemForSlot(c,'Feet'))coverage+='<rect x="0" y="326" width="240" height="84" fill="black"/>';
  const masks='<mask id="'+uid+'coverage" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="410"><rect width="240" height="410" fill="white"/>'+coverage+'</mask><mask id="'+uid+'surfaceAlpha" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="410" style="mask-type:alpha">'+img+'</mask>';
  const backHair=equipmentCoverage(c).hair?'':paintedRig('<g transform="'+paintedHairFit(a,a.race)+'">'+illustratedHairFull(a,hair,a.race,uid,'back')+'</g>',uid+'hairBackRig');
  return '<g class="cb-illustrated-base cb-painted-base" data-race="'+a.race+'" data-gender="'+(a.gender?'female':'male')+'"><defs>'+tint+clips+masks+'</defs>'+backHair+'<g mask="url(#'+uid+'coverage)"><g filter="url(#'+uid+'tint)">'+(portrait?'':'<g transform="translate(120 0) scale('+frame+' 1) translate(-120 0)" clip-path="url(#'+uid+'paintBody)">'+img+'</g>')+'<g transform="translate(120 0) scale('+face+' 1) translate(-120 0)" clip-path="url(#'+uid+'paintHead)">'+img+'</g></g><g mask="url(#'+uid+'surfaceAlpha)">'+paintedRig(portrait?'':'<g opacity=".48">'+bodyDetails+'</g>',uid+'surface')+'</g></g>'+paintedRig(eyes+facial+headDetails,uid+'details')+'</g>';
}
function illustratedBaseFigure(c,a,skin,eye,hair,p,uid,portrait){
  var race=c.race||a.race||'Veyren',accent=raceDef(race).accent||'#76d7d0',female=p.gender===1;
  var s=p.shoulder,w=p.waist,h=p.hip,arm=p.arm,leg=p.leg;
  var headW=([.93,1,1.06,.98][a.face]||1)*(female?18.5:20.5)*(race==='Stoneborn'?1.06:1),headTop=race==='Stoneborn'?43:45,chin=female?102:104;
  var jaw=(female?11.8:14.5)+[-2,0,2,1][a.face],lx=120-s,rx=120+s;
  var ua=Math.max(8.2,arm*.64),el=Math.max(6.8,arm*.50),fw=Math.max(5.9,arm*.43);
  var thigh=Math.max(13,leg*.90),knee=Math.max(9.2,leg*.61),calf=Math.max(9.6,leg*.68);
  var hipL=120-h,hipR=120+h,lLeg=120-h*.47,rLeg=120+h*.47;
  var outline=mixHex(skin,'#101418',.64),hi=mixHex(skin,'#ffffff',.24),shadow=mixHex(skin,'#0b0e12',.24);

  const browY=68+a.brows,eyeH=2+a.eyeShape*.65,mouthW=4+a.mouth,noseY=84+a.nose;
  var face='<path d="M'+(120-headW)+' 61 C'+(120-headW+1)+' 50 109 '+headTop+' 120 '+headTop+' C131 '+headTop+' '+(120+headW-1)+' 50 '+(120+headW)+' 61 L'+(120+headW-2)+' 83 L'+(120+jaw)+' 94 Q120 '+(chin+1)+' '+(120-jaw)+' 94 L'+(120-headW+2)+' 83Z" fill="url(#'+uid+'skin)" stroke="'+outline+'" stroke-width="1.2"/>'+
    '<path d="M'+(120-headW)+' 65 Q108 68 107 83 L'+(120-jaw)+' 94 Q112 87 114 81 L117 72Z M123 72 L128 83 L'+(120+jaw)+' 94 L'+(120+headW-2)+' 83 L'+(120+headW)+' 65Z" fill="'+shadow+'" opacity=".25"/>'+
    '<path d="M105 '+browY+' Q112 '+(browY-3)+' 117 '+(browY+1)+' M123 '+(browY+1)+' Q129 '+(browY-3)+' 135 '+browY+'" fill="none" stroke="'+mixHex(hair,outline,.5)+'" stroke-width="'+(female?1.5:2)+'" stroke-linecap="round"/>'+
    '<path d="M105 76 Q111 '+(74-eyeH)+' 117 76 Q112 '+(77+eyeH)+' 105 76Z M123 76 Q129 '+(74-eyeH)+' 135 76 Q130 '+(77+eyeH)+' 123 76Z" fill="'+mixHex(skin,'#f2edf0',.35)+'" stroke="'+outline+'" stroke-width=".8"/>'+
    '<circle cx="112" cy="76" r="2.1" fill="'+eye+'"/><circle cx="128" cy="76" r="2.1" fill="'+eye+'"/><path d="M112 74.8v2.4 M128 74.8v2.4" stroke="'+outline+'" stroke-width=".8"/>'+
    '<path d="M120 77 L'+(118-a.nose*.4)+' '+noseY+' Q120 '+(noseY+2)+' 123 '+noseY+'" fill="none" stroke="'+shadow+'" stroke-width=".85"/><path d="M120 78v5" stroke="'+hi+'" stroke-width=".7"/>'+
    '<path d="M'+(120-mouthW)+' 92 Q118 90.8 120 91.6 Q122 90.8 '+(120+mouthW)+' 92 Q120 94 '+(120-mouthW)+' 92Z" fill="'+mixHex(skin,'#55303e',.42)+'"/><path d="M116 96 Q120 97 124 96" stroke="'+hi+'" stroke-width=".7" fill="none" opacity=".6"/>';
  var ears='';
  if(race==='Aelari'||race==='Veyren'){
    var tip=(race==='Aelari'?72:80)-a.feature*2;
    ears='<path d="M'+(120-headW+2)+' 68 L'+tip+' 58 L'+(120-headW+4)+' 82Z M'+(120+headW-2)+' 68 L'+(240-tip)+' 58 L'+(120+headW-4)+' 82Z" fill="url(#'+uid+'skin)" stroke="'+outline+'" stroke-width="1.6"/>';
  }else if(race==='Nymari'){
    ears='<path d="M'+(120-headW+1)+' 69 Q84 58 82 76 Q91 82 '+(120-headW+5)+' 80Z M'+(120+headW-1)+' 69 Q156 58 158 76 Q149 82 '+(120+headW-5)+' 80Z" fill="url(#'+uid+'fin)" stroke="#9af1ff" stroke-width="1.3"/>';
  }else{
    ears='<ellipse cx="'+(120-headW+1)+'" cy="75" rx="3.8" ry="6.4" fill="url(#'+uid+'skin)" stroke="'+outline+'" stroke-width="1.25"/><ellipse cx="'+(120+headW-1)+'" cy="75" rx="3.8" ry="6.4" fill="url(#'+uid+'skin)" stroke="'+outline+'" stroke-width="1.25"/>';
  }

  var neck='<path d="M'+(120-p.neck*.38)+' 99 L'+(120-p.neck*.43)+' 126 C'+(120-9)+' 132 '+(120+9)+' 132 '+(120+p.neck*.43)+' 126 L'+(120+p.neck*.38)+' 99Z" fill="url(#'+uid+'skin)" stroke="'+outline+'" stroke-width="1.6"/>';

  var torso=female
    ?'<path d="M'+(lx+4)+' 128 C'+(lx-1)+' 139 '+(lx+4)+' 156 '+(120-s*.70)+' 165 C'+(120-s*.58)+' 174 '+(120-w-5)+' 190 '+(120-w-3)+' 207 C'+(120-w-1)+' 224 '+(hipL+4)+' 240 '+(hipL+3)+' 251 C'+(120-h*.58)+' 260 '+(120+h*.58)+' 260 '+(hipR-3)+' 251 C'+(hipR-4)+' 240 '+(120+w+1)+' 224 '+(120+w+3)+' 207 C'+(120+w+5)+' 190 '+(120+s*.58)+' 174 '+(120+s*.70)+' 165 C'+(rx-4)+' 156 '+(rx+1)+' 139 '+(rx-4)+' 128 C'+(120+22)+' 115 '+(120-22)+' 115 '+(lx+4)+' 128Z" fill="url(#'+uid+'skin)" stroke="'+outline+'" stroke-width="1.8"/>'
    :'<path d="M'+(lx+3)+' 127 C'+(lx-3)+' 143 '+(lx+3)+' 171 '+(120-w-5)+' 199 C'+(120-w-2)+' 220 '+(hipL+4)+' 240 '+(hipL+4)+' 251 C'+(120-h*.53)+' 260 '+(120+h*.53)+' 260 '+(hipR-4)+' 251 C'+(hipR-4)+' 240 '+(120+w+2)+' 220 '+(120+w+5)+' 199 C'+(rx-3)+' 171 '+(rx+3)+' 143 '+(rx-3)+' 127 C'+(120+25)+' 112 '+(120-25)+' 112 '+(lx+3)+' 127Z" fill="url(#'+uid+'skin)" stroke="'+outline+'" stroke-width="1.8"/>';

  var leftArm='<path d="M'+(lx+4)+' 133 C'+(lx-ua-1)+' 139 '+(lx-ua-4)+' 155 '+(lx-ua-3)+' 176 C'+(lx-ua-2)+' 191 '+(lx-el-4)+' 198 '+(lx-el-3)+' 211 C'+(lx-el-2)+' 228 '+(lx-fw-4)+' 246 '+(lx-fw-3)+' 267 C'+(lx-fw-1)+' 276 '+(lx+fw-1)+' 276 '+(lx+fw)+' 267 C'+(lx+fw+1)+' 247 '+(lx+el+2)+' 229 '+(lx+el+3)+' 211 C'+(lx+el+4)+' 197 '+(lx+ua+4)+' 190 '+(lx+ua+4)+' 176 C'+(lx+ua+5)+' 153 '+(lx+ua+1)+' 139 '+(lx+4)+' 133Z" fill="url(#'+uid+'skin)" stroke="'+outline+'" stroke-width="1.75"/>'+
    '<path d="M'+(lx-ua+2)+' 170 Q'+lx+' 182 '+(lx+ua-1)+' 170 M'+(lx-el+1)+' 214 Q'+lx+' 222 '+(lx+el-1)+' 214" fill="none" stroke="'+hi+'" stroke-width="1" opacity=".32"/>';
  var rightArm='<path d="M'+(rx-4)+' 133 C'+(rx+ua+1)+' 139 '+(rx+ua+4)+' 155 '+(rx+ua+3)+' 176 C'+(rx+ua+2)+' 191 '+(rx+el+4)+' 198 '+(rx+el+3)+' 211 C'+(rx+el+2)+' 228 '+(rx+fw+4)+' 246 '+(rx+fw+3)+' 267 C'+(rx+fw+1)+' 276 '+(rx-fw+1)+' 276 '+(rx-fw)+' 267 C'+(rx-fw-1)+' 247 '+(rx-el-2)+' 229 '+(rx-el-3)+' 211 C'+(rx-el-4)+' 197 '+(rx-ua-4)+' 190 '+(rx-ua-4)+' 176 C'+(rx-ua-5)+' 153 '+(rx-ua-1)+' 139 '+(rx-4)+' 133Z" fill="url(#'+uid+'skin)" stroke="'+outline+'" stroke-width="1.75"/>'+
    '<path d="M'+(rx+ua-2)+' 170 Q'+rx+' 182 '+(rx-ua+1)+' 170 M'+(rx+el-1)+' 214 Q'+rx+' 222 '+(rx-el+1)+' 214" fill="none" stroke="'+hi+'" stroke-width="1" opacity=".32"/>';

  var hands='<path d="M'+(lx-fw-3)+' 263 C'+(lx-11)+' 276 '+(lx-9)+' 287 '+(lx-5)+' 294 C'+(lx-1)+' 299 '+(lx+8)+' 296 '+(lx+10)+' 287 C'+(lx+11)+' 277 '+(lx+fw)+' 264 '+(lx+fw-1)+' 262Z" fill="url(#'+uid+'skin)" stroke="'+outline+'" stroke-width="1.5"/>'+
    '<path d="M'+(rx+fw+3)+' 263 C'+(rx+11)+' 276 '+(rx+9)+' 287 '+(rx+5)+' 294 C'+(rx+1)+' 299 '+(rx-8)+' 296 '+(rx-10)+' 287 C'+(rx-11)+' 277 '+(rx-fw)+' 264 '+(rx-fw+1)+' 262Z" fill="url(#'+uid+'skin)" stroke="'+outline+'" stroke-width="1.5"/>';

  var leftLeg='<path d="M'+(hipL+4)+' 247 C'+(lLeg-thigh)+' 263 '+(lLeg-thigh-1)+' 286 '+(lLeg-thigh+1)+' 307 C'+(lLeg-thigh+2)+' 323 '+(lLeg-knee-1)+' 327 '+(lLeg-knee)+' 338 C'+(lLeg-knee+1)+' 349 '+(lLeg-calf-1)+' 359 '+(lLeg-calf)+' 372 C'+(lLeg-calf+1)+' 380 '+(lLeg+calf-1)+' 380 '+(lLeg+calf)+' 372 C'+(lLeg+calf+1)+' 358 '+(lLeg+knee+1)+' 348 '+(lLeg+knee)+' 337 C'+(lLeg+knee-1)+' 326 '+(lLeg+thigh-2)+' 322 '+(lLeg+thigh-1)+' 307 C'+(lLeg+thigh)+' 281 '+(lLeg+thigh-2)+' 264 117 253Z" fill="url(#'+uid+'skin)" stroke="'+outline+'" stroke-width="1.8"/>';
  var rightLeg='<path d="M'+(hipR-4)+' 247 C'+(rLeg+thigh)+' 263 '+(rLeg+thigh+1)+' 286 '+(rLeg+thigh-1)+' 307 C'+(rLeg+thigh-2)+' 323 '+(rLeg+knee+1)+' 327 '+(rLeg+knee)+' 338 C'+(rLeg+knee-1)+' 349 '+(rLeg+calf+1)+' 359 '+(rLeg+calf)+' 372 C'+(rLeg+calf-1)+' 380 '+(rLeg-calf+1)+' 380 '+(rLeg-calf)+' 372 C'+(rLeg-calf-1)+' 358 '+(rLeg-knee-1)+' 348 '+(rLeg-knee)+' 337 C'+(rLeg-knee+1)+' 326 '+(rLeg-thigh+2)+' 322 '+(rLeg-thigh+1)+' 307 C'+(rLeg-thigh)+' 281 '+(rLeg-thigh+2)+' 264 123 253Z" fill="url(#'+uid+'skin)" stroke="'+outline+'" stroke-width="1.8"/>';

  var feet='<path d="M'+(lLeg-calf)+' 367 C'+(lLeg-11)+' 376 '+(lLeg-18)+' 387 '+(lLeg-19)+' 393 C'+(lLeg-4)+' 399 '+(lLeg+15)+' 398 '+(lLeg+20)+' 391 L'+(lLeg+calf)+' 372Z" fill="url(#'+uid+'skin)" stroke="'+outline+'" stroke-width="1.55"/>'+
    '<path d="M'+(rLeg+calf)+' 367 C'+(rLeg+11)+' 376 '+(rLeg+18)+' 387 '+(rLeg+19)+' 393 C'+(rLeg+4)+' 399 '+(rLeg-15)+' 398 '+(rLeg-20)+' 391 L'+(rLeg-calf)+' 372Z" fill="url(#'+uid+'skin)" stroke="'+outline+'" stroke-width="1.55"/>';

  var under=female
    ?'<path d="M'+(120-s*.72)+' 148 C'+(120-s*.50)+' 142 '+(120-10)+' 147 120 154 C130 147 '+(120+s*.50)+' 142 '+(120+s*.72)+' 148 L'+(120+w+4)+' 190 C128 197 112 197 '+(120-w-4)+' 190Z" fill="#2b252b" stroke="#12161a" stroke-width="1.5"/><path d="M'+(hipL+4)+' 245 Q120 256 '+(hipR-4)+' 245 L'+(hipR-1)+' 277 Q120 286 '+(hipL+1)+' 277Z" fill="#32282b" stroke="#12161a" stroke-width="1.5"/>'
    :'<path d="M'+(hipL+3)+' 245 Q120 255 '+(hipR-3)+' 245 L'+hipR+' 279 Q120 287 '+hipL+' 279Z" fill="#32282b" stroke="#12161a" stroke-width="1.5"/>';

  var anatomy=female
    ?'<path d="M'+(120-s*.61)+' 145 Q120 157 '+(120+s*.61)+' 145 M'+(120-w+7)+' 211 Q120 221 '+(120+w-7)+' 211 M'+(lLeg-thigh+4)+' 306 Q'+lLeg+' 316 '+(lLeg+thigh-4)+' 306 M'+(rLeg-thigh+4)+' 306 Q'+rLeg+' 316 '+(rLeg+thigh-4)+' 306" fill="none" stroke="'+hi+'" stroke-width="1.05" opacity=".34"/>'
    :'<path d="M'+(120-s*.72)+' 144 Q120 158 '+(120+s*.72)+' 144 M103 171 Q120 181 137 171 M120 157 V215 M'+(120-w+6)+' 209 Q120 223 '+(120+w-6)+' 209 M'+(lLeg-thigh+4)+' 304 Q'+lLeg+' 315 '+(lLeg+thigh-4)+' 304 M'+(rLeg-thigh+4)+' 304 Q'+rLeg+' 315 '+(rLeg+thigh-4)+' 304" fill="none" stroke="'+hi+'" stroke-width="1.1" opacity=".36"/>';

  var sideShade='<path d="M'+(lx+7)+' 136 Q'+(lx+1)+' 174 '+(120-w-1)+' 207 Q'+(120-w+2)+' 230 '+(hipL+8)+' 245" fill="none" stroke="'+shadow+'" stroke-width="4" opacity=".14"/><path d="M'+(lLeg-thigh+3)+' 272 Q'+(lLeg-thigh+4)+' 328 '+(lLeg-calf+2)+' 364 M'+(rLeg+thigh-3)+' 272 Q'+(rLeg+thigh-4)+' 328 '+(rLeg+calf-2)+' 364" fill="none" stroke="'+shadow+'" stroke-width="3" opacity=".13"/>';
  var mask='<defs><clipPath id="'+uid+'anatomy">'+leftLeg+rightLeg+feet+leftArm+rightArm+hands+neck+torso+'</clipPath></defs>';
  var markings=mask+raceSurface(c,a,p,uid,skin)+'<g clip-path="url(#'+uid+'anatomy)">'+illustratedRaceBodyDetails(c,a,p,skin,accent,uid)+'</g>';
  var fingers='<g fill="none" stroke="'+outline+'" stroke-width=".7" opacity=".75">';
  [lx,rx].forEach(x=>{for(var i=-1;i<=1;i++)fingers+='<path d="M'+(x+i*3)+' 282 l1 10"/>';fingers+='<path d="M'+(x+7)+' 276 l-4 8"/>'});
  hands+=fingers+'</g>';
  var coverage=equipmentCoverage(c);
  var hairFull=coverage.hair?'':'<g data-appearance-part="hair" data-hair-race="'+esc(race)+'" data-hair-style="'+a.hair+'">'+(PAINTED_RACES.has(race)?'<g transform="'+paintedHairFit(a,race)+'">':'')+illustratedHairFull(a,hair,race,uid)+(PAINTED_RACES.has(race)?'</g>':'')+'</g>';

  markings='<g opacity="'+(.35+a.glow*.21)+'">'+markings+'</g>';
  var faceMarks='';
  if(race==='Veyren')faceMarks='<path d="M104 65 q5 6 1 13 M136 65 q-5 6 -1 13 M110 91 q10 5 20 0" fill="none" stroke="#c4a9ff" stroke-width="1.2" opacity=".45"/>';
  if(race==='Aelari')faceMarks='<path d="M105 65 l5 -7 l4 7 M135 65 l-5 -7 l-4 7 M120 52 v8" fill="none" stroke="#9aefff" stroke-width="1.25" opacity=".8"/>';
  if(race==='Nymari')faceMarks='<path d="M105 67 q6 -6 10 0 M135 67 q-6 -6 -10 0 M108 90 q12 7 24 0" fill="none" stroke="#9af7ff" stroke-width="1.3" opacity=".8"/>';
  if(race==='Thornkin')faceMarks='<path d="M106 61 q-6 -8 -10 -3 M134 61 q6 -8 10 -3 M111 92 q9 4 18 0" fill="none" stroke="#3d5a31" stroke-width="1.45" opacity=".75"/>';
  if(race==='Emberkin')faceMarks='<path d="M104 63 l8 7 l-6 9 M136 63 l-8 7 l6 9 M114 92 l6 -5 l6 5" fill="none" stroke="#ff7a45" stroke-width="1.55" opacity=".95"/>';
  if(race==='Stoneborn')faceMarks='<path d="M103 62 l7 5 l-4 8 l7 5 M137 62 l-7 5 l4 8 l-7 5" fill="none" stroke="#dfc27f" stroke-width="1.3" opacity=".8"/>';

  var stoneHead=race==='Stoneborn'
    ?'<path d="M99 57 l5 -13 l8 8 l8 -17 l8 16 l10 -10 l4 17 Q120 47 99 57Z" fill="url(#'+uid+'crystal)" stroke="#6d675f" stroke-width="1.4"/><path d="M103 48 l7 -7 l3 9 M126 47 l5 -8 l4 11" fill="none" stroke="#edd28f" stroke-width="1.1" opacity=".72"/>'
    :'';
  var thornHead=race==='Thornkin'
    ?'<path d="M101 54 Q91 41 84 38 M108 51 Q103 36 107 29 M132 51 Q139 35 151 30 M139 55 Q151 42 159 40" fill="none" stroke="#594029" stroke-width="3" stroke-linecap="round"/><path d="M84 38 l-9 -3 l7 8 M107 29 l-7 -4 l5 8 M151 30 l8 -4 l-5 8 M159 40 l9 -4 l-6 9" fill="#79a557"/>'
    :'';

  faceMarks='<g opacity="'+(.25+a.glow*.22)+'">'+faceMarks+'</g>';
  var customFace='<g transform="translate(84 43) scale(.72)">'+markingMarkup(a,race)+beardMarkup(a,race==='Stoneborn'?mixHex(skin,'#cdb78a',.45):hair)+'</g>';
  var growth=coverage.growth?'':'<g transform="translate(70 20)">'+raceFeatureMarkup(a,race)+'</g>';
  if(coverage.growth){stoneHead='';thornHead=''}
  if(race==='Stoneborn'&&stoneHead)stoneHead='<g transform="translate(120 57) scale('+(0.85+a.feature*.12)+') translate(-120 -57)">'+stoneHead+'</g>';
  if(race==='Thornkin'&&thornHead)thornHead='<g transform="translate(120 57) scale('+(0.75+a.feature*.15)+') translate(-120 -57)">'+thornHead+'</g>';
  if(PAINTED_RACES.has(race))return paintedBody(c,a,p,uid,skin,eye,hair,faceMarks+customFace+hairFull+stoneHead+thornHead+growth,markings,portrait);
  return '<g class="cb-illustrated-base" data-race="'+esc(race)+'" data-gender="'+(female?'female':'male')+'">'+(portrait?'':leftLeg+rightLeg+feet+leftArm+rightArm+hands+neck+torso+sideShade+anatomy+markings+under)+ears+face+faceMarks+customFace+hairFull+stoneHead+thornHead+growth+'</g>';
}

const MODEL_CACHE=new Map();
function paperDollSVG(c,opts){
  c=c||{};opts=opts||{};
  const key=JSON.stringify([c.id,c.name,c.race,c.class,c.appearance,c.equipment,opts]);
  if(MODEL_CACHE.has(key)){const value=MODEL_CACHE.get(key);MODEL_CACHE.delete(key);MODEL_CACHE.set(key,value);return value}
  const svg=paperDollSVGUncached(c,opts);MODEL_CACHE.set(key,svg);
  if(MODEL_CACHE.size>64)MODEL_CACHE.delete(MODEL_CACHE.keys().next().value);
  return svg;
}
// Painted equipment uses final model coordinates, avoiding the old torso/leg warp.
function illustratedEquipment(c,highlighted,uid){
 const V=window.CellboundItemVisuals;if(!V)throw new Error('Illustrated item visuals are not loaded');
 const f=gearFitProfile(c),p=f.p,handY=PAINTED_RACES.has(f.race)?rigY(f.handY):f.handY;
 const sprite=(item,slot,x,y,w,h,part)=>V.sprite(V.resolve(item,slot),x,y,w,h,part);
 const group=(slot,item,body,attrs='')=>'<g class="'+paperSlotClass(slot,highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,slot))+'" data-gear-class="'+esc(gearClass(item))+'" data-gear-tier="'+V.tier(item)+'" '+attrs+'>'+body+'</g>';
 let out=paperTierAura(c);
 for(const slot of ['Legs','Feet','Chest','Waist','Shoulders','Hands','Head','Ring1','Ring2','Trinket1','Trinket2','Relic','OffHand','Weapon']){
  const item=itemForSlot(c,slot);if(!item)continue;if(slot==='OffHand'&&item.slot&&item.slot!=='OffHand')continue;
  let body='',attrs='';const a=V.resolve(item,slot),draw=(x,y,w,h,part)=>V.sprite(a,x,y,w,h,part);
  if(slot==='Chest'){
   const w=p.shoulder*1.56,top=78,bottom=190;
   body=draw(120-w/2,top,w,bottom-top);attrs='data-chest-top="'+top+'" data-chest-bottom="'+bottom+'"';
  }else if(slot==='Legs'){
   const w=p.hip*2.22;body=draw(120-w/2,178,w,V.families[gearClass(item)]==='mage'?202:173);
  }else if(slot==='Feet'){
   const w=f.footHalf*2.05;body=draw(f.leftLeg-w/2,326,w,70,0)+draw(f.rightLeg-w/2,326,w,70,1);
  }else if(slot==='Waist'){
   const w=p.waist*2.35;body=draw(120-w/2,177,w,18);attrs='data-waist-design="short-sash"';
  }else if(slot==='Shoulders'){
   const w=p.arm*2.3,h=34+(V.tier(item)-1)*1.5;
   body=draw(120-p.shoulder*.78-w/2,82,w,h,0)+draw(120+p.shoulder*.78-w/2,82,w,h,1);
  }else if(slot==='Hands'){
   const w=p.hand*19;body=draw(f.leftHand-w/2,handY-32,w,43,0)+draw(f.rightHand-w/2,handY-32,w,43,1);
  }else if(slot==='Head'){
   const rig=PAINTED_HEAD_RIG[f.race][p.gender],w=rig[2]*1.28,h=55,x=rig[0]-w/2,y=rig[1]-7;
   body=draw(x,y,w,h);
   if(!['warrior','paladin'].includes(V.families[gearClass(item)])){
    const id=uid+'hood';body='<defs><mask id="'+id+'"><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="white"/><path d="M'+(x+w*.5)+' '+(y+h*.34)+' Q'+(x+w*.22)+' '+(y+h*.58)+' '+(x+w*.28)+' '+(y+h*.82)+' Q'+(x+w*.5)+' '+(y+h*.96)+' '+(x+w*.72)+' '+(y+h*.82)+' Q'+(x+w*.78)+' '+(y+h*.58)+' '+(x+w*.5)+' '+(y+h*.34)+'Z" fill="black"/></mask></defs><g mask="url(#'+id+')">'+body+'</g>';
   }
  }else if(slot==='Weapon'||slot==='OffHand'){
   const type=V.type(item,slot),main=slot==='Weapon',x=main?f.rightHand:f.leftHand;
   const lengths={sword:110,greatsword:140,axe:100,hammer:98,mace:98,dagger:62,bow:130,staff:170,spear:185,wand:65,scepter:75,rod:75,crossbow:75,shield:94,tome:48,quiver:82,focus:34,idol:40};
   const h=lengths[type]||75,w=Math.min(type==='shield'?65:58,h*a.rect[2]/a.rect[3]);
   const grip=['bow','shield','focus','idol','tome','quiver'].includes(type)?.52:['staff','spear'].includes(type)?.7:.83;
   const angle=main?(type==='bow'?0:-9):0;
   body='<g transform="rotate('+angle+' '+x+' '+handY+')">'+draw(x-w/2,handY-h*grip,w,h)+'</g>';
   attrs='data-'+(main?'weapon':'offhand')+'-type="'+esc(type)+'" data-render-layer="front" data-grip-x="'+x+'" data-grip-y="'+handY+'"';
   if(main)body='<g class="cb-paper-front-weapon">'+body+'</g>';
   // A small glove crop overlaps the grip so the handle sits inside the hand.
   const glove=itemForSlot(c,'Hands');if(glove&&main){const ga=V.resolve(glove,'Hands'),r=ga.pair?.[1];if(r){const gripAsset={...ga,rect:[r[0]+r[2]*.25,r[1]+r[3]*.61,r[2]*.5,r[3]*.15]};body+=V.sprite(gripAsset,x-4,handY-2,8,5)}}
  }else{
   const ring=slot.startsWith('Ring'),x=ring?(slot==='Ring1'?f.leftHand:f.rightHand):slot==='Trinket1'?106:slot==='Trinket2'?134:120;
   body=draw(x-(ring?3:6),ring?handY:slot==='Relic'?120:184,ring?6:12,ring?6:16);
  }
  out+=group(slot,item,body,attrs);
 }
 return '<g data-equipment-renderer="illustrated-v2">'+out+'</g>';
}

function paperDollSVGUncached(c,opts){
  opts=opts||{};
  var race=c.race||(c.appearance&&c.appearance.race)||'Veyren';
  var a=normalizeAppearance(c.appearance||c,c.id||c.name||race,race);
  c=Object.assign({},c,{race:a.race,appearance:a});
  var r=raceDef(a.race),skin=r.skin[a.skinTone],eye=r.eyes[a.eyes],hair=HAIR[a.hairColor];
  var accent=opts.accent||paperAccent(c),highlighted=opts.highlightedSlot||'',profile=bodyProfile(c,a);
  var showGear=opts.showGear!==false;
  var model=showGear?c:Object.assign({},c,{equipment:{}});
  var uid='pd'+hash((c.id||c.name||race)+'|'+JSON.stringify(a)+'|'+(showGear?'gear':'base')+'|'+JSON.stringify(model.equipment||{})).toString(36);
  var skinLight=mixHex(skin,'#ffffff',.18),skinDark=mixHex(skin,'#0d1216',.25);
  var headScale=profile.headScale||1,headX=70+(50*(1-headScale)),headY=(PAINTED_RACES.has(race)?30:20)+(50*(1-headScale));
  var baseBg='<ellipse cx="120" cy="214" rx="110" ry="180" fill="url(#'+uid+'a)"/><ellipse cx="120" cy="394" rx="'+Math.max(70,profile.shoulder+27)+'" ry="10" fill="#000" opacity=".38"/>';
  var defs='<defs><radialGradient id="'+uid+'a" cx="50%" cy="44%" r="56%"><stop offset="0%" stop-color="'+accent+'" stop-opacity=".15"/><stop offset="68%" stop-color="'+accent+'" stop-opacity=".025"/><stop offset="100%" stop-color="'+accent+'" stop-opacity="0"/></radialGradient><linearGradient id="'+uid+'skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="'+skinLight+'"/><stop offset="46%" stop-color="'+skin+'"/><stop offset="100%" stop-color="'+skinDark+'"/></linearGradient><linearGradient id="'+uid+'crystal" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ebe2cf"/><stop offset="48%" stop-color="#aaa59d"/><stop offset="100%" stop-color="#716f70"/></linearGradient><linearGradient id="'+uid+'fin" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a8f7ff"/><stop offset="50%" stop-color="#69bad1"/><stop offset="100%" stop-color="#346e8b"/></linearGradient><filter id="'+uid+'shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity=".34"/></filter><filter id="'+uid+'softGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".18"/></filter></defs>';
  var baseFigure=illustratedBaseFigure(model,a,skin,eye,hair,profile,uid,opts.portrait);
  if(!showGear){
    return '<svg viewBox="'+(opts.portrait?(PAINTED_RACES.has(race)?'65 0 110 95':'65 15 110 110'):'0 0 240 410')+'" data-race="'+esc(race)+'" data-gender="'+(a.gender===1?'female':'male')+'" data-frame="'+esc(optionText('frame',a.frame,race).toLowerCase())+'" data-model-mode="base" role="img" aria-hidden="true" focusable="false">'+defs+baseBg+baseFigure+'</svg>';
  }
  return '<svg viewBox="'+(opts.portrait?(PAINTED_RACES.has(race)?'65 0 110 95':'65 15 110 110'):'0 0 240 410')+'" data-race="'+esc(race)+'" data-gender="'+(a.gender===1?'female':'male')+'" data-frame="'+esc(optionText('frame',a.frame,race).toLowerCase())+'" data-model-mode="equipped" role="img" aria-hidden="true" focusable="false">'+
    defs+baseBg+baseFigure+illustratedEquipment(model,highlighted,uid)+
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
  version:CHARACTER_MODEL_VERSION,modelContract:CHARACTER_MODEL_CONTRACT,equipmentLayerContract:EQUIPMENT_LAYER_CONTRACT,
  anatomicalAnchors:anatomicalAnchors,rigY:(race,y)=>PAINTED_RACES.has(race)?rigY(y):y,equipmentCoverage:equipmentCoverage,appearanceVersion:1,
  RACES:RACES,COUNTS:COUNTS,CLASS_COLORS:CLASS_COLORS,headRig:PAINTED_HEAD_RIG,hairFit:paintedHairFit,
  normalizeAppearance:normalizeAppearance,randomAppearance:randomAppearance,
  applyToCharacter:applyToCharacter,portraitHTML:portraitHTML,paperDollHTML:paperDollHTML,paperDollSVG:paperDollSVG,bodyProfile:bodyProfile,gearFitProfile:gearFitProfile,weaponFitProfile:weaponFitProfile,tierVisualProfile:tierVisualProfile,
  visualProfile:visualProfile,weaponType:weaponType,offHandType:offHandType,
  editorHTML:editorHTML,bindEditor:bindEditor
};
})();