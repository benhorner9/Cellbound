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
function gearFitProfile(c,item){
  var p=bodyProfile(c),race=c?.race||c?.appearance?.race||'Veyren',gender=p.gender,frame=p.frame;
  var shoulderY=race==='Stoneborn'?130:gender===1?133:131;
  var leftShoulder=120-p.shoulder,rightShoulder=120+p.shoulder;
  var spread=PAINTED_RACES.has(race)?13:0;
  var leftHand=leftShoulder-spread,rightHand=rightShoulder+spread,handY=283;
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
    weaponX:rightHand-2,offhandX:leftHand-8,
    headGearScaleX:gender===1?.94:1
  };
}
// Shared anatomical coordinates in the 240 x 410 model space. No class input.
function materialSurface(markup,c,slot){
  const item=itemForSlot(c,slot);if(!item||!markup)return markup;
  const pal=gearPalette(c,item,clampTier(item.tier),slot),family=gearProfile(item).family;
  const id='mat'+hash(itemIdentity(item,slot)+'|'+slot+'|'+family).toString(36);
  const metal=family==='plate'||family==='mail'||slot==='Weapon';
  const stops=metal?[[0,pal.dark],[.22,pal.base],[.44,pal.light],[.49,pal.base],[.8,pal.dark],[1,pal.light]]:[[0,pal.light],[.28,pal.base],[.8,pal.dark],[1,pal.base]];
  const defs='<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2=".3">'+stops.map(x=>'<stop offset="'+x[0]+'" stop-color="'+x[1]+'"/>').join('')+'</linearGradient></defs>';
  return defs+markup.split('fill="'+pal.base+'"').join('fill="url(#'+id+')"');
}
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
  var style=gearProfile(head).head;
  var open=['crown','halo','antlers','diadem','headdress','horns','band','blindfold','dragoncrown','deathcrown'].includes(style);
  return {hair:!open,growth:!open};
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
function tierChestAdornment(tier,pal,gs,gw,gh,top,klass){
  var t=Math.max(1,Math.min(5,Number(tier)||1)),out='';
  if(t>=2)out+='<path d="M'+(120-gw-3)+' 187 Q120 198 '+(120+gw+3)+' 187" fill="none" stroke="'+pal.trim+'" stroke-width="1.8" opacity=".75"/>';
  if(t>=3)out+='<path d="M'+(120-gs+8)+' '+(top+12)+' L'+(120-gw+7)+' 205 L120 217 L'+(120+gw-7)+' 205 L'+(120+gs-8)+' '+(top+12)+'" fill="none" stroke="'+pal.light+'" stroke-width="2.1" opacity=".52"/>';
  if(t>=4)out+='<path d="M'+(120-gh)+' 225 L'+(120-gh-6)+' 244 L'+(120-gh+5)+' 255 M'+(120+gh)+' 225 L'+(120+gh+6)+' 244 L'+(120+gh-5)+' 255" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.2"/><path d="M109 166 L120 154 L131 166 L126 184 L120 190 L114 184Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="1.8"/>';
  if(t>=5)out+='<path d="M'+(120-gs+2)+' '+(top+5)+' L'+(120-gs-8)+' '+(top-10)+' L'+(120-gs+10)+' '+(top-4)+' M'+(120+gs-2)+' '+(top+5)+' L'+(120+gs+8)+' '+(top-10)+' L'+(120+gs-10)+' '+(top-4)+'" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.1"/><path d="M104 207 L120 193 L136 207 L132 229 L120 240 L108 229Z" fill="none" stroke="'+pal.glow+'" stroke-width="2.2" opacity=".8"/>';
  return out;
}
function tierHeadAdornment(item,pal,tier){
  var t=Math.max(1,Math.min(5,Number(tier)||1)),klass=gearClass(item),out='';
  if(t>=2)out+='<path d="M33 39 Q50 30 67 39" fill="none" stroke="'+pal.light+'" stroke-width="1.7" opacity=".7"/>';
  if(t>=3)out+='<path d="M30 34 L24 26 L34 28 M70 34 L76 26 L66 28" fill="'+pal.trim+'" opacity=".82"/>';
  if(t>=4)out+='<path d="M39 23 L43 10 L50 20 L57 10 L61 23" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="1.8"/>';
  if(t>=5)out+='<path d="M25 37 L16 27 L28 29 M75 37 L84 27 L72 29 M50 18 L50 3" fill="none" stroke="'+pal.glow+'" stroke-width="2.4" opacity=".86"/>';
  if(klass==='Warrior'&&t>=4)out+='<path d="M50 17 L50 2 L56 10Z" fill="'+pal.trim+'"/>';
  if(klass==='Mage'&&t>=5)out+=motifMarkup('star',50,13,.58,pal.glow);
  return out;
}
function tierWeaponAdornment(item,pal,tier,type){
  var t=Math.max(1,Math.min(5,Number(tier)||1)),out='';
  if(t>=2)out+='<path d="M186 188 L206 186" stroke="'+pal.trim+'" stroke-width="2.4" opacity=".72"/>';
  if(t>=3)out+='<path d="M184 171 L176 164 L187 165 M208 171 L216 164 L205 165" fill="'+pal.trim+'" opacity=".78"/>';
  if(t>=4)out+='<path d="M190 153 L196 143 L202 153 L199 168 L193 168Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="1.8"/>';
  if(t>=5)out+='<path d="M181 181 L171 171 L184 174 M211 181 L221 171 L208 174" fill="none" stroke="'+pal.glow+'" stroke-width="2.4" opacity=".82"/>'+motifMarkup(gearClass(item)==='Paladin'?'sun':'star',196,154,.48,pal.glow);
  return out;
}
function tierOffHandAdornment(item,pal,tier,type){
  var t=Math.max(1,Math.min(5,Number(tier)||1)),out='';
  if(type==='shield'){
    if(t>=2)out+='<path d="M30 229 Q48 240 66 229" fill="none" stroke="'+pal.trim+'" stroke-width="2"/>';
    if(t>=3)out+='<path d="M26 192 L17 183 L29 184 M70 192 L79 183 L67 184" fill="'+pal.trim+'" opacity=".8"/>';
    if(t>=4)out+='<path d="M48 158 L55 145 L62 158" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2"/>';
    if(t>=5)out+='<path d="M23 171 L13 159 L28 164 M73 171 L83 159 L68 164" fill="none" stroke="'+pal.glow+'" stroke-width="2.3" opacity=".82"/>';
    return out;
  }
  if(t>=2)out+='<circle cx="49" cy="216" r="24" fill="none" stroke="'+pal.trim+'" stroke-width="1.4" opacity=".45"/>';
  if(t>=3)out+='<path d="M49 183 L55 174 L61 184 M49 249 L43 258 L37 248" fill="'+pal.trim+'" opacity=".72"/>';
  if(t>=4)out+='<path d="M24 216 L14 209 L17 222 M74 216 L84 209 L81 222" fill="none" stroke="'+pal.trim+'" stroke-width="2.2"/>';
  if(t>=5)out+=motifMarkup(gearClass(item)==='Priest'?'halo':'star',49,216,.58,pal.glow);
  return out;
}
function paperOffHandBack(c,highlighted){
  var item=itemForSlot(c,'OffHand');if(!item)return'';
  return offHandType(item,c)==='shield'?paperOffHand(c,highlighted):'';
}
function paperOffHandFront(c,highlighted){
  var item=itemForSlot(c,'OffHand');if(!item)return'';
  return offHandType(item,c)==='shield'?'':paperOffHand(c,highlighted);
}
function paperHeadGearOnly(c,highlighted){var out=materialSurface(paperHeadGearOnlyRaw(c,highlighted),c,'Head');return out}
function paperHeadGearOnlyRaw(c,highlighted){
  var helm=itemForSlot(c,'Head');if(!helm)return'';
  var tier=clampTier(helm.tier),pal=gearPalette(c,helm,tier,'Head'),fit=gearFitProfile(c,helm);
  return '<g class="'+paperSlotClass('Head',highlighted,helm)+'" data-item-key="'+esc(itemIdentity(helm,'Head'))+'"><g transform="translate(50 0) scale('+fit.headGearScaleX+' 1) translate(-50 0)">'+classHeadGearMarkup(helm,pal,tier)+tierHeadAdornment(helm,pal,tier)+'</g></g>';
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
  var tier=clampTier(chest.tier),pal=gearPalette(c,chest,tier||1,'Chest'),gp=gearProfile(chest),klass=gearClass(chest),out='',fit=gearFitProfile(c,chest);
  var sx=Math.max(.84,Math.min(1.34,fit.p.shoulder/47));
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
  return '<g class="cb-paper-back-layer" data-gear-class="'+esc(klass)+'" transform="translate(120 0) scale('+sx+' 1) translate(-120 0)">'+out+'</g>';
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
function paperLegs(c,skin,highlighted){var out=materialSurface(paperLegsRaw(c,skin,highlighted),c,'Legs');return out}
function paperLegsRaw(c,skin,highlighted){
  var item=itemForSlot(c,'Legs');if(!item)return'';
  var fit=gearFitProfile(c,item),p=fit.p,tier=clampTier(item.tier),pal=gearPalette(c,item,tier||1,'Legs'),v=pal.variant,klass=gearClass(item),gp=gearProfile(item),tv=tierVisualProfile(tier);
  var pad=(gp.family==='plate'?4:gp.family==='mail'?2:gp.family==='cloth'?1:2)+tv.knee*.16;
  var l=fit.leftLeg,r=fit.rightLeg,th=fit.legHalf+pad,calf=fit.calfHalf+pad*.7,hipL=120-fit.hipHalf,hipR=120+fit.hipHalf;
  var gear='<g class="'+paperSlotClass('Legs',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Legs'))+'">'+
    '<path d="M'+(hipL+4)+' 247 Q'+(l-th)+' 267 '+(l-th+1)+' 304 L'+(l-calf)+' 354 L'+(l+calf)+' 354 Q'+(l+th)+' 327 '+(l+th-1)+' 304 Q'+(l+th)+' 269 117 253Z" fill="'+pal.base+'" stroke="#111820" stroke-width="3"/>'+
    '<path d="M'+(hipR-4)+' 247 Q'+(r+th)+' 267 '+(r+th-1)+' 304 L'+(r+calf)+' 354 L'+(r-calf)+' 354 Q'+(r-th)+' 327 '+(r-th+1)+' 304 Q'+(r-th)+' 269 123 253Z" fill="'+pal.base+'" stroke="#111820" stroke-width="3"/>';
  if(gp.family==='plate'){
    gear+='<path d="M'+(l-th+1)+' 284 L'+(l+th-1)+' 284 L'+(l+calf)+' 318 Q'+l+' 326 '+(l-calf)+' 318Z M'+(r-th+1)+' 284 L'+(r+th-1)+' 284 L'+(r+calf)+' 318 Q'+r+' 326 '+(r-calf)+' 318Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2"/><path d="M'+(l-calf)+' 323 L'+(l+calf)+' 326 M'+(r-calf)+' 326 L'+(r+calf)+' 323" stroke="'+pal.light+'" stroke-width="1.6" opacity=".45"/>';
  }else if(gp.family==='cloth'){
    gear+='<path d="M'+(hipL+1)+' 249 Q120 277 '+(hipR-1)+' 249 L'+(120+fit.waistHalf)+' 300 Q120 318 '+(120-fit.waistHalf)+' 300Z" fill="'+pal.dark+'" opacity=".55" stroke="'+pal.trim+'" stroke-width="1.4"/>';
  }else if(gp.family==='mail'){
    gear+='<path d="M'+(l-th+2)+' 273 H'+(l+th-2)+' M'+(r-th+2)+' 273 H'+(r+th-2)+' M'+(l-th+1)+' 287 H'+(l+th-1)+' M'+(r-th+1)+' 287 H'+(r+th-1)+'" stroke="'+pal.trim+'" stroke-width="1.6" opacity=".58"/>';
  }else{
    gear+=(v%2?'<path d="M'+(l-th+3)+' 269 L'+(l+th-3)+' 277 M'+(r-th+3)+' 277 L'+(r+th-3)+' 269" fill="none" stroke="'+pal.trim+'" stroke-width="3"/>':'<path d="M'+(l-calf)+' 299 L'+(l+calf)+' 305 M'+(r-calf)+' 305 L'+(r+calf)+' 299" fill="none" stroke="'+pal.trim+'" stroke-width="3"/>');
  }
  if(tier>=2)gear+='<path d="M'+(l-th+2)+' 294 Q'+l+' 303 '+(l+th-2)+' 294 M'+(r-th+2)+' 294 Q'+r+' 303 '+(r+th-2)+' 294" fill="none" stroke="'+pal.trim+'" stroke-width="1.8" opacity=".68"/>';
  if(tier>=3)gear+='<path d="M'+(l-th)+' 286 L'+(l-th-5)+' 300 L'+(l-th+3)+' 307 M'+(r+th)+' 286 L'+(r+th+5)+' 300 L'+(r+th-3)+' 307" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="1.7"/>';
  if(tier>=4)gear+='<path d="M'+(hipL+4)+' 252 L'+(hipL-7)+' 266 L'+(l-th+2)+' 278 M'+(hipR-4)+' 252 L'+(hipR+7)+' 266 L'+(r+th-2)+' 278" fill="none" stroke="'+pal.trim+'" stroke-width="3"/>';
  if(tier>=5)gear+='<path d="M'+(l-calf)+' 330 L'+(l-calf-6)+' 342 L'+(l-calf+2)+' 347 M'+(r+calf)+' 330 L'+(r+calf+6)+' 342 L'+(r+calf-2)+' 347" fill="'+pal.trim+'" opacity=".82"/>';
  if(klass==='Paladin')gear+=motifMarkup('sun',l,302,.5,pal.glow)+motifMarkup('sun',r,302,.5,pal.glow);
  else if(klass==='Druid')gear+='<path d="M'+(l-calf)+' 307 q'+calf+' -8 '+(calf*2)+' 1 M'+(r+calf)+' 307 q-'+calf+' -8 -'+(calf*2)+' 1" fill="none" stroke="'+pal.glow+'" stroke-width="2"/>';
  else if(klass==='Hunter')gear+='<path d="M'+(l-th+2)+' 292 L'+(l+calf)+' 315 M'+(r+th-2)+' 292 L'+(r-calf)+' 315" stroke="'+pal.trim+'" stroke-width="2"/>';
  else if(klass==='Shaman')gear+='<path d="M'+(l-calf)+' 311 H'+(l+calf)+' M'+(r-calf)+' 311 H'+(r+calf)+'" stroke="'+pal.glow+'" stroke-width="2"/>';
  else if(klass==='Death Knight')gear+='<path d="M'+(l-calf)+' 300 l8 -8 l8 8 l8 -8 M'+(r+calf)+' 300 l-8 -8 l-8 8 l-8 -8" fill="none" stroke="'+pal.glow+'" stroke-width="2"/>';
  else gear+=itemRune(item,'Legs',pal,l,286,.5)+itemRune(item,'Legs',pal,r,286,.5);
  return gear+'</g>';
}
function paperFeet(c,skin,highlighted){var out=materialSurface(paperFeetRaw(c,skin,highlighted),c,'Feet');return PAINTED_RACES.has(c.race)?'<g transform="translate(0 6)">'+out+'</g>':out}
function paperFeetRaw(c,skin,highlighted){
  var item=itemForSlot(c,'Feet');if(!item)return'';
  var fit=gearFitProfile(c,item),tier=clampTier(item.tier),pal=gearPalette(c,item,tier||1,'Feet'),v=pal.variant,klass=gearClass(item),gp=gearProfile(item),tv=tierVisualProfile(tier);
  var extra=(gp.family==='plate'?4:gp.family==='mail'?2:0)+tv.boot*.18,l=fit.leftLeg,r=fit.rightLeg,fw=fit.footHalf+extra,top=344-extra-tv.boot*.35;
  var gear='<g class="'+paperSlotClass('Feet',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Feet'))+'">'+
    '<path d="M'+(l-fw)+' '+top+' L'+(l+fw*.72)+' '+top+' L'+(l+fw*.86)+' 382 Q'+l+' 390 '+(l-fw*1.35)+' 389 Q'+(l-fw*1.5)+' 378 '+(l-fw*.72)+' 369Z" fill="'+pal.dark+'" stroke="#0c1115" stroke-width="3"/>'+
    '<path d="M'+(r-fw*.72)+' '+top+' L'+(r+fw)+' '+top+' L'+(r+fw*.72)+' 369 Q'+(r+fw*1.5)+' 378 '+(r+fw*1.35)+' 389 Q'+r+' 390 '+(r-fw*.86)+' 382Z" fill="'+pal.dark+'" stroke="#0c1115" stroke-width="3"/>';
  if(gp.family==='plate')gear+='<path d="M'+(l-fw+2)+' '+(top+3)+' L'+(l+fw*.75)+' '+(top+3)+' L'+(l+fw*.78)+' 370 L'+(l-fw*.9)+' 370Z M'+(r-fw*.75)+' '+(top+3)+' L'+(r+fw-2)+' '+(top+3)+' L'+(r+fw*.9)+' 370 L'+(r-fw*.78)+' 370Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="1.8"/><path d="M'+(l-fw*.85)+' 374 L'+(l+fw*.72)+' 374 M'+(r-fw*.72)+' 374 L'+(r+fw*.85)+' 374" stroke="'+pal.light+'" stroke-width="1.5" opacity=".5"/>';
  else if(gp.family==='mail')gear+='<path d="M'+(l-fw*.8)+' 353 L'+(l+fw*.75)+' 353 M'+(r-fw*.75)+' 353 L'+(r+fw*.8)+' 353" stroke="'+pal.trim+'" stroke-width="2.2"/>';
  else gear+='<path d="M'+(l-fw*.75)+' '+(v%2?361:371)+' L'+(l+fw*.7)+' '+(v%2?361:371)+' M'+(r-fw*.7)+' '+(v%2?361:371)+' L'+(r+fw*.75)+' '+(v%2?361:371)+'" stroke="'+pal.trim+'" stroke-width="3"/>';
  if(tier>=2)gear+='<path d="M'+(l-fw*.85)+' 365 L'+(l+fw*.72)+' 365 M'+(r-fw*.72)+' 365 L'+(r+fw*.85)+' 365" stroke="'+pal.trim+'" stroke-width="1.8" opacity=".7"/>';
  if(tier>=3)gear+='<path d="M'+(l-fw*.9)+' 352 L'+(l-fw-4)+' 342 L'+(l-fw+6)+' 347 M'+(r+fw*.9)+' 352 L'+(r+fw+4)+' 342 L'+(r+fw-6)+' 347" fill="'+pal.trim+'" opacity=".8"/>';
  if(tier>=4)gear+='<path d="M'+(l-fw*1.2)+' 384 L'+(l-fw*1.55)+' 378 L'+(l-fw*1.35)+' 389 M'+(r+fw*1.2)+' 384 L'+(r+fw*1.55)+' 378 L'+(r+fw*1.35)+' 389" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="1.5"/>';
  if(tier>=5)gear+='<path d="M'+(l-fw*.35)+' '+(top+4)+' L'+l+' '+(top-8)+' L'+(l+fw*.35)+' '+(top+4)+' M'+(r-fw*.35)+' '+(top+4)+' L'+r+' '+(top-8)+' L'+(r+fw*.35)+' '+(top+4)+'" fill="'+pal.dark+'" stroke="'+pal.glow+'" stroke-width="1.6"/>';
  if(klass==='Paladin')gear+=motifMarkup('sun',l,363,.42,pal.glow)+motifMarkup('sun',r,363,.42,pal.glow);
  if(klass==='Demon Hunter')gear+='<path d="M'+(l-fw)+' 352 l-8 -10 l13 4 M'+(r+fw)+' 352 l8 -10 l-13 4" fill="'+pal.trim+'" opacity=".7"/>';
  else gear+=itemRune(item,'Feet',pal,l,363,.42)+itemRune(item,'Feet',pal,r,363,.42);
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
function paperChest(c,highlighted){var out=materialSurface(paperChestRaw(c,highlighted),c,'Chest');return out}
function paperChestRaw(c,highlighted){
  var item=itemForSlot(c,'Chest');if(!item)return'';
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier||1,'Chest'),klass=gearClass(item),gp=gearProfile(item),v=pal.variant,fit=gearFitProfile(c,item),p=fit.p,tv=tierVisualProfile(tier);
  var s=p.shoulder,w=p.waist,h=p.hip,top=fit.chestTop,bottom=fit.chestBottom;
  var shoulderPad=(gp.family==='plate'?9:gp.family==='mail'?6:gp.family==='cloth'?1:4)+(gp.bulk-1)*16+tv.chest*.55;
  var waistPad=(gp.family==='plate'?5:gp.family==='mail'?3:gp.family==='cloth'?2:3)+(gp.bulk-1)*7+tv.chest*.22;
  var gs=s+shoulderPad,gw=w+waistPad,gh=Math.max(gw,h*.78+(gp.family==='plate'?5:gp.family==='mail'?3:2)+tv.chest*.25);
  var neckHalf=Math.max(10,p.neck*.62),collarY=top-4-tv.collar*.28;
  var torso='<path d="M'+(120-gs)+' '+top+' Q'+(120-s*.72)+' '+collarY+' '+(120-neckHalf)+' '+(collarY-2)+' L'+(120-neckHalf+3)+' '+(top+8)+' Q120 '+(top+15)+' '+(120+neckHalf-3)+' '+(top+8)+' L'+(120+neckHalf)+' '+(collarY-2)+' Q'+(120+s*.72)+' '+collarY+' '+(120+gs)+' '+top+
    ' C'+(120+gs-1)+' 161 '+(120+gw+4)+' 190 '+(120+gw)+' 211'+
    ' C'+(120+gw-1)+' 229 '+(120+gh)+' 242 '+(120+gh)+' '+bottom+
    ' Q120 '+(bottom+11)+' '+(120-gh)+' '+bottom+
    ' C'+(120-gh)+' 242 '+(120-gw+1)+' 229 '+(120-gw)+' 211'+
    ' C'+(120-gw-4)+' 190 '+(120-gs+1)+' 161 '+(120-gs)+' '+top+'Z" fill="'+pal.base+'" stroke="#0e1519" stroke-width="3"/>'+
    '<path d="M'+(120-gs+7)+' '+(top+10)+' Q120 '+(top+1)+' '+(120+gs-7)+' '+(top+10)+'" fill="none" stroke="'+pal.light+'" stroke-width="2" opacity=".42"/>';
  if(gp.family==='plate'){
    torso+='<path d="M'+(120-gs+6)+' '+(top+13)+' L120 '+(v%2?172:179)+' L'+(120+gs-6)+' '+(top+13)+' L'+(120+gw-2)+' 225 L120 244 L'+(120-gw+2)+' 225Z" fill="'+pal.dark+'" opacity=".64"/><path d="M120 '+(top+7)+' L120 239 M'+(120-gs+12)+' '+(v%2?188:179)+' L'+(120+gs-12)+' '+(v%2?188:179)+'" stroke="'+pal.trim+'" stroke-width="'+(tier>=3?3.2:2.2)+'" opacity=".9"/><path d="M'+(120-gs+13)+' 163 Q120 195 '+(120+gs-13)+' 163" fill="none" stroke="'+pal.light+'" stroke-width="1.5" opacity=".28"/>';
  }else if(gp.family==='mail'){
    torso+='<path d="M'+(120-gs+7)+' 156 Q120 171 '+(120+gs-7)+' 156 M'+(120-gw-3)+' 207 Q120 220 '+(120+gw+3)+' 207" fill="none" stroke="'+pal.trim+'" stroke-width="2.5" opacity=".8"/><path d="M'+(120-gw+2)+' 167 H'+(120+gw-2)+' M'+(120-gw)+' 179 H'+(120+gw)+' M'+(120-gw+1)+' 191 H'+(120+gw-1)+' M'+(120-gw+3)+' 203 H'+(120+gw-3)+'" stroke="'+pal.light+'" stroke-width="1" opacity=".3"/>';
  }else if(gp.family==='cloth'){
    torso+='<path d="M'+(120-gs+8)+' 153 Q120 '+(v%2?168:179)+' '+(120+gs-8)+' 153 M'+(120-gw-5)+' '+(v%2?219:211)+' Q120 '+(v%2?234:228)+' '+(120+gw+5)+' '+(v%2?219:211)+'" fill="none" stroke="'+pal.trim+'" stroke-width="'+(tier>=3?3:2)+'" opacity=".78"/><path d="M120 152 L120 237" stroke="'+pal.light+'" stroke-width="2" opacity=".38"/>';
  }else{
    torso+='<path d="M'+(120-gs+7)+' 162 L'+(120+gw-2)+' 224 M'+(120+gs-7)+' 162 L'+(120-gw+2)+' 224 M'+(120-gw-4)+' 217 L'+(120+gw+4)+' 217" fill="none" stroke="'+pal.trim+'" stroke-width="2.4" opacity=".74"/>';
  }
  if(klass==='Paladin')torso+='<path d="M120 151 V231 M'+(120-gw+5)+' 198 H'+(120+gw-5)+'" stroke="'+pal.trim+'" stroke-width="2.7" opacity=".9"/>'+motifMarkup('sun',120,186,tier>=4?1.3:1,pal.glow);
  else if(klass==='Warrior')torso+='<path d="M'+(120-gw+4)+' 175 L120 158 L'+(120+gw-4)+' 175 L'+(120+gw-8)+' 220 L120 235 L'+(120-gw+8)+' 220Z" fill="none" stroke="'+pal.trim+'" stroke-width="2.3" opacity=".78"/>';
  else if(klass==='Priest')torso+='<path d="M103 171 Q120 160 137 171 Q120 196 103 171Z" fill="none" stroke="'+pal.glow+'" stroke-width="2" opacity=".8"/>'+motifMarkup('halo',120,202,.9,pal.trim);
  else if(klass==='Druid')torso+='<path d="M103 162 Q92 187 106 214 M137 162 Q148 187 134 214" fill="none" stroke="'+pal.trim+'" stroke-width="3" opacity=".65"/>'+motifMarkup('leaf',120,188,1,pal.glow);
  else if(klass==='Hunter')torso+='<path d="M'+(120-gs+8)+' 163 L'+(120+gw-6)+' 226 M'+(120+gs-8)+' 163 L'+(120-gw+6)+' 226" stroke="'+pal.trim+'" stroke-width="3" opacity=".76"/>'+motifMarkup('arrow',120,188,.9,pal.glow);
  else if(klass==='Rogue')torso+='<path d="M103 158 L137 214 M137 158 L103 214" stroke="'+pal.trim+'" stroke-width="2" opacity=".5"/>'+motifMarkup('fang',120,188,.85,pal.glow);
  else if(klass==='Mage')torso+=motifMarkup('star',120,184,1.15,pal.glow)+'<path d="M105 206 Q120 217 135 206" fill="none" stroke="'+pal.trim+'" stroke-width="2"/>';
  else if(klass==='Shaman')torso+='<path d="M98 183 Q120 202 142 183 M103 209 Q120 222 137 209" fill="none" stroke="'+pal.trim+'" stroke-width="2.4"/><path d="M120 159 L112 172 L120 182 L128 172Z" fill="'+pal.glow+'" opacity=".7"/>';
  else if(klass==='Warlock')torso+='<path d="M103 167 Q120 147 137 167 L131 214 Q120 229 109 214Z" fill="'+pal.dark+'" opacity=".45"/>'+motifMarkup('star',120,188,.95,pal.glow);
  else if(klass==='Monk')torso+='<path d="M102 164 Q120 178 138 164 M104 209 Q120 197 136 209" fill="none" stroke="'+pal.trim+'" stroke-width="2.3"/><circle cx="120" cy="188" r="8" fill="none" stroke="'+pal.glow+'" stroke-width="2"/>';
  else if(klass==='Death Knight')torso+='<path d="M98 161 L112 175 L120 158 L128 175 L142 161 L136 224 L120 241 L104 224Z" fill="'+pal.dark+'" opacity=".62" stroke="'+pal.trim+'" stroke-width="1.8"/><circle cx="120" cy="187" r="5" fill="'+pal.glow+'" class="cb-paper-glow"/>';
  else if(klass==='Demon Hunter')torso+='<path d="M101 169 L115 182 L106 211 M139 169 L125 182 L134 211" fill="none" stroke="'+pal.glow+'" stroke-width="2.4" opacity=".74"/>';
  else if(klass==='Evoker')torso+='<path d="M100 164 Q120 176 140 164 L136 212 Q120 224 104 212Z" fill="none" stroke="'+pal.trim+'" stroke-width="2.4"/><path d="M106 178 L120 164 L134 178 L120 194Z" fill="'+pal.glow+'" opacity=".4"/>';
  else torso+=itemRune(item,'Chest',pal,120,186,.85);
  torso+=tierChestAdornment(tier,pal,gs,gw,gh,top,klass);
  return '<g class="'+paperSlotClass('Chest',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Chest'))+'" data-chest-top="'+top.toFixed(2)+'">'+torso+'</g>';
}
function paperWaist(c,highlighted){var out=materialSurface(paperWaistRaw(c,highlighted),c,'Waist');return out}
function paperWaistRaw(c,highlighted){
  var item=itemForSlot(c,'Waist');if(!item)return'';
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier,'Waist'),v=pal.variant,klass=gearClass(item),gp=gearProfile(item),fit=gearFitProfile(c,item),w=fit.waistHalf+(gp.bulk-1)*7;
  var out='<path d="M'+(120-w-3)+' 237 Q120 '+(v%2?246:242)+' '+(120+w+3)+' 237 L'+(120+w+2)+' 255 Q120 264 '+(120-w-2)+' 255Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.4"/><rect x="111" y="241" width="18" height="13" rx="3" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2"/>'+itemRune(item,'Waist',pal,120,248,.48);
  if(['Paladin','Priest','Mage','Warlock','Shaman','Evoker'].includes(klass))out+='<path d="M110 255 L116 320 L120 337 L124 320 L130 255Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="1.8" opacity=".9"/>';
  if(klass==='Warrior'||klass==='Death Knight')out+='<path d="M'+(120-w-7)+' 246 L'+(120-w+1)+' 262 M'+(120+w+7)+' 246 L'+(120+w-1)+' 262" stroke="'+pal.trim+'" stroke-width="4"/>';
  if(klass==='Hunter'||klass==='Rogue'||klass==='Demon Hunter')out+='<path d="M'+(120-w)+' 247 L'+(120-w-8)+' 270 M'+(120+w)+' 247 L'+(120+w+8)+' 270" stroke="'+pal.trim+'" stroke-width="3"/>';
  if(klass==='Monk')out+='<path d="M'+(120+w)+' 247 Q'+(120+w+22)+' 271 '+(120+w+12)+' 319" fill="none" stroke="'+pal.trim+'" stroke-width="5" stroke-linecap="round"/>';
  if(klass==='Druid')out+='<path d="M'+(120-w)+' 251 q-14 12 -2 25 q15 -5 13 -20 M'+(120+w)+' 251 q14 12 2 25 q-15 -5 -13 -20" fill="'+pal.trim+'" opacity=".48"/>';
  return '<g class="'+paperSlotClass('Waist',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Waist'))+'">'+out+'</g>';
}
function paperShoulders(c,highlighted){var out=materialSurface(paperShouldersRaw(c,highlighted),c,'Shoulders');return out}
function paperShouldersRaw(c,highlighted){
  var item=itemForSlot(c,'Shoulders'),tier=clampTier(item&&item.tier);
  if(!item)return'';
  var pal=gearPalette(c,item,tier,'Shoulders'),p=bodyProfile(c),s=p.shoulder,v=pal.variant,klass=gearClass(item),gp=gearProfile(item),tv=tierVisualProfile(tier);
  var extent=(8+tv.shoulder)*gp.shoulder+(gp.family==='plate'?5:gp.family==='cloth'?-1:1);
  var rise=(gp.family==='plate'?7:gp.family==='mail'?4:gp.family==='cloth'?0:2)+tv.rise;
  var lx=120-s,rx=120+s;
  var left='<path d="M'+(lx-4)+' '+(146-rise)+' Q'+(lx-extent)+' '+(139-rise)+' '+(lx-extent-2)+' 158 L'+(lx+6)+' 171 L'+(lx+15)+' 148Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.7"/>';
  var right='<path d="M'+(rx+4)+' '+(146-rise)+' Q'+(rx+extent)+' '+(139-rise)+' '+(rx+extent+2)+' 158 L'+(rx-6)+' 171 L'+(rx-15)+' 148Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.7"/>';
  var detail='';
  if(tier>=2)detail+='<path d="M'+(lx-extent+4)+' '+(151-rise)+' L'+(lx+4)+' '+(158-rise*.25)+' M'+(rx+extent-4)+' '+(151-rise)+' L'+(rx-4)+' '+(158-rise*.25)+'" stroke="'+pal.light+'" stroke-width="1.6" opacity=".5"/>';
  if(tier>=3)detail+='<path d="M'+(lx-extent+1)+' '+(146-rise)+' L'+(lx-extent-6)+' '+(136-rise)+' L'+(lx-extent+7)+' '+(140-rise)+' M'+(rx+extent-1)+' '+(146-rise)+' L'+(rx+extent+6)+' '+(136-rise)+' L'+(rx+extent-7)+' '+(140-rise)+'" fill="'+pal.trim+'" opacity=".82"/>';
  if(tier>=4)detail+='<path d="M'+(lx-extent+6)+' '+(143-rise)+' L'+(lx-extent+2)+' '+(128-rise)+' L'+(lx-extent+13)+' '+(140-rise)+' M'+(rx+extent-6)+' '+(143-rise)+' L'+(rx+extent-2)+' '+(128-rise)+' L'+(rx+extent-13)+' '+(140-rise)+'" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="1.7"/>';
  if(tier>=5)detail+='<path d="M'+(lx-extent)+' '+(142-rise)+' L'+(lx-extent-11)+' '+(126-rise)+' M'+(rx+extent)+' '+(142-rise)+' L'+(rx+extent+11)+' '+(126-rise)+'" stroke="'+pal.glow+'" stroke-width="2.5" opacity=".82"/>';
  if(klass==='Paladin')detail+=motifMarkup('sun',lx-5,153-rise*.3,.65,pal.glow)+motifMarkup('sun',rx+5,153-rise*.3,.65,pal.glow);
  else if(klass==='Priest')detail+='<path d="M'+(lx-6)+' '+(151-rise)+' q6 -13 12 0 M'+(rx-6)+' '+(151-rise)+' q6 -13 12 0" fill="none" stroke="'+pal.glow+'" stroke-width="2"/>';
  else if(klass==='Druid')detail+='<path d="M'+(lx-9)+' '+(145-rise)+' q-16 -14 -18 -25 M'+(rx+9)+' '+(145-rise)+' q16 -14 18 -25" fill="none" stroke="'+pal.trim+'" stroke-width="4" stroke-linecap="round"/>';
  else if(klass==='Hunter')detail+='<path d="M'+(lx-10)+' '+(149-rise)+' l-14 -10 l6 18 M'+(rx+10)+' '+(149-rise)+' l14 -10 l-6 18" fill="'+pal.trim+'" opacity=".75"/>';
  else if(klass==='Rogue')detail+='<path d="M'+(lx-10)+' '+(153-rise)+' l-10 -6 l9 14 M'+(rx+10)+' '+(153-rise)+' l10 -6 l-9 14" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="1.5"/>';
  else if(klass==='Mage')detail+=motifMarkup('star',lx-4,153-rise*.3,.58,pal.glow)+motifMarkup('star',rx+4,153-rise*.3,.58,pal.glow);
  else if(klass==='Shaman')detail+='<path d="M'+(lx-6)+' '+(150-rise)+' l-11 8 l8 6 M'+(rx+6)+' '+(150-rise)+' l11 8 l-8 6" fill="none" stroke="'+pal.glow+'" stroke-width="2.4"/>';
  else if(klass==='Warlock')detail+='<path d="M'+(lx-6)+' '+(145-rise)+' q-12 -15 -8 -25 M'+(rx+6)+' '+(145-rise)+' q12 -15 8 -25" fill="none" stroke="'+pal.glow+'" stroke-width="3"/>';
  else if(klass==='Monk')detail+='<circle cx="'+lx+'" cy="'+(155-rise)+'" r="4" fill="none" stroke="'+pal.glow+'" stroke-width="2"/><circle cx="'+rx+'" cy="'+(155-rise)+'" r="4" fill="none" stroke="'+pal.glow+'" stroke-width="2"/>';
  else if(klass==='Death Knight')detail+='<path d="M'+(lx-extent)+' '+(145-rise)+' l-9 -16 l16 8 M'+(rx+extent)+' '+(145-rise)+' l9 -16 l-16 8" fill="'+pal.trim+'" opacity=".9"/>';
  else if(klass==='Demon Hunter')detail+='<path d="M'+(lx-5)+' '+(150-rise)+' l-11 -8 l5 15 M'+(rx+5)+' '+(150-rise)+' l11 -8 l-5 15" fill="'+pal.glow+'" opacity=".55"/>';
  else if(klass==='Evoker')detail+='<path d="M'+(lx-extent+3)+' '+(148-rise)+' l-11 -12 l17 4 M'+(rx+extent-3)+' '+(148-rise)+' l11 -12 l-17 4" fill="'+pal.light+'" opacity=".55"/>';
  else detail+=itemRune(item,'Shoulders',pal,lx-3,154-rise*.3,.55)+itemRune(item,'Shoulders',pal,rx+3,154-rise*.3,.55);
  return '<g class="'+paperSlotClass('Shoulders',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Shoulders'))+'">'+left+right+detail+'</g>';
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
function weaponFitProfile(c,item){
  var fit=gearFitProfile(c,item),type=weaponType(item,c),klass=gearClass(item);
  var map={
    bow:{pivotX:190,pivotY:205,dx:-4,dy:-2,rotate:-4,scale:.96},
    crossbow:{pivotX:202,pivotY:214,dx:-4,dy:-2,rotate:-4,scale:.94},
    spear:{pivotX:200,pivotY:283,dx:-2,dy:0,rotate:-2,scale:1},
    axe:{pivotX:203,pivotY:283,dx:-2,dy:0,rotate:-5,scale:1},
    hammer:{pivotX:203,pivotY:283,dx:-2,dy:0,rotate:-4,scale:1},
    mace:{pivotX:203,pivotY:283,dx:-2,dy:0,rotate:-4,scale:.99},
    dagger:{pivotX:188,pivotY:240,dx:-3,dy:0,rotate:-7,scale:.98},
    wand:{pivotX:201,pivotY:283,dx:-2,dy:0,rotate:-4,scale:.98},
    focus:{pivotX:197,pivotY:283,dx:-3,dy:0,rotate:-4,scale:.97},
    scepter:{pivotX:201,pivotY:283,dx:-2,dy:0,rotate:-4,scale:.99},
    rod:{pivotX:201,pivotY:283,dx:-2,dy:0,rotate:-4,scale:.99},
    staff:{pivotX:200,pivotY:283,dx:-2,dy:0,rotate:-2,scale:1},
    greatsword:{pivotX:203,pivotY:283,dx:-2,dy:0,rotate:-3,scale:1.02},
    sword:{pivotX:203,pivotY:283,dx:-2,dy:0,rotate:-5,scale:1}
  };
  var p=Object.assign({},map[type]||map.sword);
  var classNudge={
    Warrior:{dx:-1,dy:0,rotate:-1},
    Paladin:{dx:-1,dy:0,rotate:0},
    Priest:{dx:-2,dy:0,rotate:1},
    Druid:{dx:-2,dy:0,rotate:1},
    Hunter:{dx:-3,dy:-1,rotate:0},
    Rogue:{dx:-2,dy:1,rotate:-2},
    Mage:{dx:-2,dy:0,rotate:1},
    Shaman:{dx:-1,dy:0,rotate:0},
    Warlock:{dx:-2,dy:0,rotate:1},
    Monk:{dx:-2,dy:0,rotate:1},
    'Death Knight':{dx:-1,dy:0,rotate:-1},
    'Demon Hunter':{dx:-2,dy:1,rotate:-2},
    Evoker:{dx:-2,dy:0,rotate:1}
  }[klass]||{dx:0,dy:0,rotate:0};
  var frameNudge=fit.frame===0?-1:fit.frame===2?1:0;
  return {
    type:type,klass:klass,
    anchorX:fit.weaponX+p.dx+classNudge.dx+frameNudge,
    anchorY:fit.handY+p.dy+classNudge.dy,
    pivotX:p.pivotX,pivotY:p.pivotY,
    rotate:p.rotate+classNudge.rotate,
    scale:p.scale,
    handScale:Math.max(.94,Math.min(1.08,fit.p.hand||1)),
    body:fit
  };
}
function paperWeapon(c,highlighted){var out=materialSurface(paperWeaponRaw(c,highlighted),c,'Weapon');var item=itemForSlot(c,'Weapon');if(item){var f=weaponFitProfile(c,item),a=normalizeAppearance(c.appearance,c.id||c.name,c.race),skin=raceDef(a.race).skin[a.skinTone];out+='<g data-weapon-grip="true" fill="'+skin+'" stroke="'+mixHex(skin,'#11151b',.6)+'" stroke-width=".7"><path d="M'+(f.anchorX-4)+' '+(f.anchorY-3)+' q5 -3 9 1 l-1 6 q-5 2 -8 -1Z"/><path d="M'+(f.anchorX-3)+' '+f.anchorY+' h6 M'+(f.anchorX-3)+' '+(f.anchorY+2)+' h6" fill="none"/></g>'} return out}
function paperWeaponRaw(c,highlighted){
  var item=itemForSlot(c,'Weapon'),tier=clampTier(item&&item.tier);
  if(!item)return'';
  var pal=gearPalette(c,item,tier,'Weapon'),type=weaponType(item,c),v=pal.variant,wf=weaponFitProfile(c,item),tv=tierVisualProfile(tier);
  var scale=wf.handScale*wf.scale*tv.weapon;
  return '<g class="'+paperSlotClass('Weapon',highlighted,item)+' cb-paper-front-weapon" data-render-layer="front" data-weapon-type="'+esc(type)+'" data-item-key="'+esc(itemIdentity(item,'Weapon'))+'" data-grip-x="'+wf.anchorX.toFixed(2)+'" data-grip-y="'+wf.anchorY.toFixed(2)+'">'+
    '<g transform="translate('+wf.anchorX+' '+wf.anchorY+') rotate('+wf.rotate+') scale('+scale+') translate(-'+wf.pivotX+' -'+wf.pivotY+')">'+
      weaponMarkup(type,pal,v,tier,item)+tierWeaponAdornment(item,pal,tier,type)+
    '</g>'+
  '</g>';
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
  var pal=gearPalette(c,item,tier,'OffHand'),type=offHandType(item,c),v=pal.variant,fit=gearFitProfile(c,item),tv=tierVisualProfile(tier),scale=Math.max(.94,Math.min(1.08,fit.p.hand||1))*Math.min(1.08,tv.weapon);
  if(type==='quiver')return '<g class="'+paperSlotClass('OffHand',highlighted,item)+'" transform="translate(5 0)" data-offhand-type="'+esc(type)+'" data-item-key="'+esc(itemIdentity(item,'OffHand'))+'">'+offHandMarkup(type,pal,v,tier,item)+tierOffHandAdornment(item,pal,tier,type)+'</g>';
  return '<g class="'+paperSlotClass('OffHand',highlighted,item)+'" transform="translate('+fit.offhandX+' '+fit.handY+') scale('+scale+') translate(-48 -283)" data-offhand-type="'+esc(type)+'" data-item-key="'+esc(itemIdentity(item,'OffHand'))+'">'+offHandMarkup(type,pal,v,tier,item)+tierOffHandAdornment(item,pal,tier,type)+'</g>';
}
function paperAccessories(c,highlighted){
  var out='',ring1=itemForSlot(c,'Ring1'),ring2=itemForSlot(c,'Ring2'),tr1=itemForSlot(c,'Trinket1'),tr2=itemForSlot(c,'Trinket2'),relic=itemForSlot(c,'Relic'),fit=gearFitProfile(c);
  var ringY=fit.handY+5,leftRingX=fit.leftHand-2,rightRingX=fit.rightHand+2;
  if(ring1){var p1=gearPalette(c,ring1,clampTier(ring1.tier),'Ring1');out+='<g class="'+paperSlotClass('Ring1',highlighted,ring1)+'"><circle cx="'+leftRingX+'" cy="'+ringY+'" r="3.7" fill="none" stroke="'+p1.trim+'" stroke-width="2"/><circle cx="'+leftRingX+'" cy="'+(ringY-2)+'" r="1.2" fill="'+p1.glow+'"/></g>'}
  if(ring2){var p2=gearPalette(c,ring2,clampTier(ring2.tier),'Ring2');out+='<g class="'+paperSlotClass('Ring2',highlighted,ring2)+'"><circle cx="'+rightRingX+'" cy="'+ringY+'" r="3.7" fill="none" stroke="'+p2.trim+'" stroke-width="2"/><circle cx="'+rightRingX+'" cy="'+(ringY-2)+'" r="1.2" fill="'+p2.glow+'"/></g>'}
  var tx=Math.max(13,Math.min(22,fit.waistHalf*.5));
  if(tr1){var t1=gearPalette(c,tr1,clampTier(tr1.tier),'Trinket1');out+='<g class="'+paperSlotClass('Trinket1',highlighted,tr1)+'"><path d="M'+(120-tx)+' 252 L'+(120-tx-4)+' 278" stroke="'+t1.trim+'" stroke-width="2"/>'+itemRune(tr1,'Trinket1',t1,120-tx-5,282,.55)+'</g>'}
  if(tr2){var t2=gearPalette(c,tr2,clampTier(tr2.tier),'Trinket2');out+='<g class="'+paperSlotClass('Trinket2',highlighted,tr2)+'"><path d="M'+(120+tx)+' 252 L'+(120+tx+4)+' 278" stroke="'+t2.trim+'" stroke-width="2"/>'+itemRune(tr2,'Trinket2',t2,120+tx+5,282,.55)+'</g>'}
  if(relic){
    var pr=gearPalette(c,relic,clampTier(relic.tier),'Relic'),klass=paperClass(c),rx=120-fit.waistHalf-12;
    var relicMarkup=['Mage','Priest'].includes(klass)
      ?'<circle cx="'+rx+'" cy="229" r="9" fill="'+pr.dark+'" stroke="'+pr.trim+'" stroke-width="2.5"/>'+itemRune(relic,'Relic',pr,rx,229,.62)
      :'<path d="M'+(rx-7)+' 224 L'+(rx+6)+' 220 L'+(rx+9)+' 241 L'+(rx-4)+' 246Z" fill="'+pr.base+'" stroke="'+pr.trim+'" stroke-width="2.3"/>'+itemRune(relic,'Relic',pr,rx+1,233,.5);
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


function paintedHairFit(a,race){
  var female=Number(a.gender)===1,h=Number(a.hair)||0;
  var fits={
    Veyren:{m:[0,4,.91,.86],f:[0,5,.89,.86]},
    Stoneborn:{m:[0,7,.96,.82],f:[0,6,.92,.84]},
    Aelari:{m:[0,4,.88,.87],f:[0,5,.86,.88]},
    Thornkin:{m:[0,7,.92,.84],f:[0,7,.90,.85]},
    Emberkin:{m:[0,7,.92,.84],f:[0,7,.90,.85]},
    Nymari:{m:[0,5,.90,.87],f:[0,6,.88,.88]}
  };
  var v=(fits[race]||fits.Veyren)[female?'f':'m'].slice();
  if(h===3||h===5){v[1]+=1;v[3]+=.02}
  if(h===4){v[1]-=2;v[3]-=.02}
  return 'translate('+v[0]+' '+v[1]+') translate(120 0) scale('+v[2]+' '+v[3]+') translate(-120 0)';
}
function illustratedHairFull(a,hair,race,uid){
  var h=Number(a.hair)||0;if(h===0)return '';
  var dark=mixHex(hair,'#090d11',.48),deep=mixHex(hair,'#000000',.25),light=mixHex(hair,'#ffffff',.24);
  var accent=raceDef(race).accent||'#76d7d0',sheen=mixHex(hair,accent,.24);
  var base='',shadow='',high='',detail='';

  if(h===1){
    base='<path d="M94 65 Q94 40 120 36 Q146 40 148 65 Q136 55 124 58 Q110 52 94 65Z"/>';
    shadow='<path d="M95 64 Q102 48 119 45 Q134 47 146 61 Q132 54 122 59 Q108 54 95 64Z"/>';
    high='<path d="M101 54 Q112 42 127 44 Q136 46 142 53"/>';
  }else if(h===2){
    base='<path d="M92 67 Q87 39 112 34 Q139 29 151 49 Q154 58 149 69 Q136 53 121 52 Q106 51 96 78Z"/>';
    shadow='<path d="M94 66 Q99 47 116 42 Q136 38 149 53 Q133 47 119 55 Q106 57 96 75Z"/>';
    high='<path d="M101 49 Q119 36 139 43 M101 57 Q116 48 130 49"/>';
  }else if(h===3){
    base='<path d="M90 67 Q89 38 120 33 Q151 38 152 68 L158 177 Q146 168 144 119 Q141 87 132 70 Q120 63 108 70 Q99 88 97 119 Q94 164 81 179 Q87 124 90 67Z"/>';
    shadow='<path d="M92 68 Q100 50 119 44 Q141 48 150 67 L154 164 Q146 153 145 116 Q138 85 132 73 Q119 67 108 73 Q100 94 99 119 Q95 153 86 166 L91 69Z"/>';
    high='<path d="M99 59 Q112 43 132 47 M101 76 Q96 112 94 145 M139 76 Q146 112 148 145"/>';
  }else if(h===4){
    base='<path d="M94 64 Q97 43 114 39 L120 20 L126 40 Q145 43 149 64 Q136 54 122 56 Q108 52 94 64Z"/>';
    shadow='<path d="M99 61 Q104 46 116 44 L121 29 L125 45 Q138 47 145 59 Q133 53 122 59 Q110 55 99 61Z"/>';
    high='<path d="M111 43 L120 26 L126 44 M101 54 Q113 46 130 49"/>';
  }else{
    base='<path d="M91 66 Q91 38 120 34 Q149 38 151 67 Q145 83 146 102 Q151 120 146 140 Q141 156 149 171 Q137 166 130 151 Q123 164 113 151 Q104 168 89 172 Q97 153 94 136 Q90 115 95 101 Q99 84 91 66Z"/>';
    shadow='<path d="M94 66 Q101 46 120 43 Q139 46 148 64 Q138 57 127 61 Q112 56 99 69 Q102 92 98 111 Q97 137 91 158 Q104 146 108 125 Q109 99 107 78 Q120 67 133 76 Q132 105 136 128 Q140 149 146 159 Q142 127 143 104 Q145 84 148 68 Q136 58 122 61 Q108 56 94 66Z"/>';
    high='<path d="M101 56 Q114 42 132 47 M104 74 Q109 101 105 132 M136 75 Q132 104 137 132"/>';
    detail='<path d="M93 111 Q103 119 98 130 Q111 137 105 150 M147 109 Q137 119 142 130 Q129 137 135 150" fill="none" stroke="'+sheen+'" stroke-width="1.4" opacity=".5"/>';
  }

  if(race==='Stoneborn'){
    var stone=mixHex(hair,'#9b9489',.58),edge=mixHex(stone,'#e9d59c',.22);
    base=base.replace('/>',' fill="'+stone+'" stroke="'+dark+'" stroke-width="1.2"/>');
    shadow=shadow.replace('/>',' fill="'+dark+'" opacity=".28"/>');
    high=high.replace('/>',' fill="none" stroke="'+edge+'" stroke-width="1.15" opacity=".62"/>');
    detail+='<path d="M101 50 l7 7 l-5 8 l9 6 M130 47 l-6 8 l7 7 l-8 8 M111 39 l5 7 l-4 6 M139 56 l-5 6 l4 7" fill="none" stroke="'+edge+'" stroke-width=".9" opacity=".72"/>';
  }else if(race==='Thornkin'){
    var bark=mixHex(hair,'#5b422a',.48),leaf=mixHex(accent,'#93b86d',.42);
    base=base.replace('/>',' fill="'+bark+'" stroke="'+dark+'" stroke-width="1.1"/>');
    shadow=shadow.replace('/>',' fill="'+deep+'" opacity=".24"/>');
    high=high.replace('/>',' fill="none" stroke="'+light+'" stroke-width=".9" opacity=".28"/>');
    detail+='<path d="M104 48 Q98 42 96 36 M132 48 Q139 39 142 34 M104 89 Q94 98 93 108 M138 89 Q148 98 149 108" fill="none" stroke="'+bark+'" stroke-width="2.1" stroke-linecap="round"/><path d="M96 36 l-6 -2 l5 6 M142 34 l6 -3 l-4 7 M93 108 l-6 2 l6 3 M149 108 l6 2 l-6 3" fill="'+leaf+'" stroke="'+mixHex(leaf,'#25361f',.4)+'" stroke-width=".5"/>';
  }else if(race==='Emberkin'){
    var ember=mixHex(hair,'#351f21',.45);
    base=base.replace('/>',' fill="'+ember+'" stroke="'+dark+'" stroke-width="1.05"/>');
    shadow=shadow.replace('/>',' fill="'+deep+'" opacity=".34"/>');
    high=high.replace('/>',' fill="none" stroke="'+mixHex('#ff8a45',hair,.28)+'" stroke-width="1.2" opacity=".72"/>');
    detail+='<path d="M105 48 l5 7 l-4 7 M128 45 l-5 8 l6 7 M98 76 l6 8 M142 74 l-6 9" fill="none" stroke="#ff7548" stroke-width=".9" opacity=".72"/>';
  }else if(race==='Nymari'){
    var sea=mixHex(hair,'#245c70',.46);
    base=base.replace('/>',' fill="'+sea+'" stroke="'+mixHex(sea,'#07161d',.5)+'" stroke-width="1"/>');
    shadow=shadow.replace('/>',' fill="'+mixHex(sea,'#061017',.55)+'" opacity=".25"/>');
    high=high.replace('/>',' fill="none" stroke="'+mixHex('#9cf7ff',hair,.32)+'" stroke-width="1.05" opacity=".64"/>');
    detail+='<path d="M104 58 q7 5 14 0 q7 5 14 0 M100 80 q9 6 18 0 q9 6 18 0" fill="none" stroke="#9cf5ff" stroke-width=".75" opacity=".42"/>';
  }else if(race==='Aelari'){
    base=base.replace('/>',' fill="'+mixHex(hair,'#dcecff',.14)+'" stroke="'+dark+'" stroke-width="1"/>');
    shadow=shadow.replace('/>',' fill="'+deep+'" opacity=".22"/>');
    high=high.replace('/>',' fill="none" stroke="'+mixHex(light,'#9ceaff',.18)+'" stroke-width="1.05" opacity=".64"/>');
    detail+='<path d="M106 52 Q120 44 134 52" fill="none" stroke="#b8efff" stroke-width=".7" opacity=".46"/>';
  }else{
    base=base.replace('/>',' fill="'+mixHex(hair,'#8e69d7',.09)+'" stroke="'+dark+'" stroke-width="1"/>');
    shadow=shadow.replace('/>',' fill="'+deep+'" opacity=".26"/>');
    high=high.replace('/>',' fill="none" stroke="'+mixHex(light,'#b89bea',.12)+'" stroke-width="1.05" opacity=".58"/>');
    detail+='<path d="M103 54 Q120 47 137 54" fill="none" stroke="#b89bea" stroke-width=".65" opacity=".35"/>';
  }

  return '<g class="cb-painted-hair cb-painted-hair-'+race.toLowerCase()+'" filter="url(#'+uid+'shadow)">'+base+shadow+high+detail+'</g>';
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
  return '<g class="cb-illustrated-base cb-painted-base" data-race="'+a.race+'" data-gender="'+(a.gender?'female':'male')+'"><defs>'+tint+clips+masks+'</defs><g mask="url(#'+uid+'coverage)"><g filter="url(#'+uid+'tint)">'+(portrait?'':'<g transform="translate(120 0) scale('+frame+' 1) translate(-120 0)" clip-path="url(#'+uid+'paintBody)">'+img+'</g>')+'<g transform="translate(120 0) scale('+face+' 1) translate(-120 0)" clip-path="url(#'+uid+'paintHead)">'+img+'</g></g><g mask="url(#'+uid+'surfaceAlpha)">'+paintedRig(portrait?'':'<g opacity=".48">'+bodyDetails+'</g>',uid+'surface')+'</g></g>'+paintedRig(eyes+facial+headDetails,uid+'details')+'</g>';
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
    defs+baseBg+baseFigure+(PAINTED_RACES.has(race)?paintedRig:(markup=>markup))(
    paperTierAura(model)+
    paperBackLayer(model)+
    paperOffHandBack(model,highlighted)+
    paperLegs(model,skin,highlighted)+paperFeet(model,skin,highlighted)+
    paperArms(model,skin,highlighted)+paperChest(model,highlighted)+paperWaist(model,highlighted)+paperShoulders(model,highlighted)+paperAccessories(model,highlighted)+
    '<g transform="translate('+headX+' '+headY+') scale('+headScale+')">'+paperHeadGearOnly(model,highlighted)+'</g>'+
    paperOffHandFront(model,highlighted)+
    paperWeapon(model,highlighted),uid+'equipment')+
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
  RACES:RACES,COUNTS:COUNTS,CLASS_COLORS:CLASS_COLORS,
  normalizeAppearance:normalizeAppearance,randomAppearance:randomAppearance,
  applyToCharacter:applyToCharacter,portraitHTML:portraitHTML,paperDollHTML:paperDollHTML,paperDollSVG:paperDollSVG,bodyProfile:bodyProfile,gearFitProfile:gearFitProfile,weaponFitProfile:weaponFitProfile,tierVisualProfile:tierVisualProfile,
  visualProfile:visualProfile,weaponType:weaponType,offHandType:offHandType,
  editorHTML:editorHTML,bindEditor:bindEditor
};
})();