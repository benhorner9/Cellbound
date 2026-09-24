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


/* Full-character equipment viewer.
   Uses the same face construction, palette and line language as the portrait system. */
const PAPER_VISIBLE_SLOTS=['Head','Shoulders','Chest','Hands','Legs','Feet','Weapon','OffHand'];

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
function gearPalette(c,item,tier){
  var accent=CLASS_COLORS[(item&&item.class)||paperClass(c)]||paperAccent(c);
  var t=Math.max(1,tier||1);
  return {
    accent:accent,
    base:mixHex(accent,'#19242b',Math.max(.44,.73-t*.065)),
    dark:mixHex(accent,'#080d11',.78),
    light:mixHex(accent,'#f0dfad',Math.min(.18+t*.055,.45)),
    trim:t>=4?'#d8b976':mixHex(accent,'#b9ad8c',.3+t*.06),
    glow:t>=4?mixHex(accent,'#ffffff',.24):accent
  };
}
function bodyProfile(race){
  return ({
    Stoneborn:{shoulder:52,waist:31,leg:16,arm:14},
    Aelari:{shoulder:40,waist:25,leg:13,arm:11},
    Thornkin:{shoulder:47,waist:29,leg:15,arm:13},
    Emberkin:{shoulder:47,waist:29,leg:15,arm:13},
    Nymari:{shoulder:43,waist:27,leg:14,arm:12},
    Veyren:{shoulder:45,waist:28,leg:14,arm:12}
  })[race]||{shoulder:45,waist:28,leg:14,arm:12};
}
function paperSlotClass(slot,highlighted){
  return 'cb-paper-slot cb-paper-slot-'+String(slot||'').toLowerCase()+(highlighted===slot?' is-highlighted':'');
}
function paperHeadMarkup(c,a,skin,eye,hair,highlighted){
  var helm=itemForSlot(c,'Head'),tier=clampTier(helm&&helm.tier),pal=gearPalette(c,helm,tier);
  var face=facePath(a.face);
  var base='<g class="cb-paper-head">'+
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
    '</g>';
  if(!helm)return base;
  var klass=paperClass(c),cloth=['Mage','Priest','Druid'].includes(klass);
  var helmet=cloth
    ? '<path d="M28 42 Q29 18 50 16 Q71 18 72 42 Q64 31 50 31 Q36 31 28 42Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2"/>'+
      '<path d="M33 36 Q50 25 67 36" fill="none" stroke="'+pal.light+'" stroke-width="2" opacity=".55"/>'
    : '<path d="M28 43 Q29 18 50 16 Q71 18 72 43 L66 38 Q50 29 34 38Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.2"/>'+
      '<path d="M34 32 L50 20 L66 32" fill="none" stroke="'+pal.light+'" stroke-width="2"/>'+
      (tier>=3?'<path d="M50 15 L54 25 L50 31 L46 25Z" fill="'+pal.trim+'" stroke="#111820" stroke-width="1"/>':'');
  if(tier>=4)helmet+='<circle cx="50" cy="25" r="2.6" fill="'+pal.glow+'" class="cb-paper-glow"/>';
  return base+'<g class="'+paperSlotClass('Head',highlighted)+'">'+helmet+'</g>';
}
function paperLegs(c,skin,highlighted){
  var item=itemForSlot(c,'Legs'),tier=clampTier(item&&item.tier),pal=gearPalette(c,item,tier||1);
  var base=tier?pal.base:'#202b31',trim=tier?pal.trim:'#405158';
  return '<g class="'+paperSlotClass('Legs',highlighted)+'">'+
    '<path d="M92 247 L116 247 L112 354 L83 354 Q84 323 88 286Z" fill="'+base+'" stroke="#111820" stroke-width="3"/>'+
    '<path d="M124 247 L148 247 L157 354 L128 354 L124 288Z" fill="'+base+'" stroke="#111820" stroke-width="3"/>'+
    '<path d="M92 274 L112 280 M128 280 L148 274" fill="none" stroke="'+trim+'" stroke-width="'+(tier>=3?4:2)+'" opacity=".72"/>'+
    (tier>=4?'<path d="M89 312 L112 319 M128 319 L151 312" stroke="'+pal.glow+'" stroke-width="2.5" opacity=".7" class="cb-paper-glow"/>':'')+
    '</g>';
}
function paperFeet(c,highlighted){
  var item=itemForSlot(c,'Feet'),tier=clampTier(item&&item.tier),pal=gearPalette(c,item,tier||1);
  var base=tier?pal.dark:'#121a1f',trim=tier?pal.trim:'#38484d';
  return '<g class="'+paperSlotClass('Feet',highlighted)+'">'+
    '<path d="M82 345 L112 345 L113 389 L76 389 Q73 379 82 372Z" fill="'+base+'" stroke="#0c1115" stroke-width="3"/>'+
    '<path d="M128 345 L158 345 L164 389 L127 389 L127 369Z" fill="'+base+'" stroke="#0c1115" stroke-width="3"/>'+
    '<path d="M80 365 L111 365 M129 365 L159 365" stroke="'+trim+'" stroke-width="'+(tier>=3?4:2)+'"/>'+
    (tier>=4?'<path d="M79 383 L110 383 M130 383 L162 383" stroke="'+pal.glow+'" stroke-width="2" opacity=".72" class="cb-paper-glow"/>':'')+
    '</g>';
}
function paperArms(c,skin,highlighted){
  var hands=itemForSlot(c,'Hands'),tier=clampTier(hands&&hands.tier),pal=gearPalette(c,hands,tier||1);
  var p=bodyProfile(c.race||c.appearance?.race||'Veyren'),shoulder=p.shoulder,arm=p.arm;
  var leftX=120-shoulder,rightX=120+shoulder;
  return '<g class="cb-paper-arms">'+
    '<path d="M'+leftX+' 146 Q'+(leftX-16)+' 178 '+(leftX-19)+' 230 L'+(leftX-9)+' 286" fill="none" stroke="'+skin+'" stroke-width="'+arm+'" stroke-linecap="round"/>'+
    '<path d="M'+rightX+' 146 Q'+(rightX+16)+' 178 '+(rightX+19)+' 230 L'+(rightX+9)+' 286" fill="none" stroke="'+skin+'" stroke-width="'+arm+'" stroke-linecap="round"/>'+
    '</g>'+
    '<g class="'+paperSlotClass('Hands',highlighted)+'">'+
    '<path d="M'+(leftX-15)+' 261 Q'+(leftX-7)+' 253 '+(leftX+1)+' 261 L'+(leftX-4)+' 289 Q'+(leftX-14)+' 294 '+(leftX-20)+' 284Z" fill="'+(tier?pal.base:skin)+'" stroke="#111820" stroke-width="2"/>'+
    '<path d="M'+(rightX+15)+' 261 Q'+(rightX+7)+' 253 '+(rightX-1)+' 261 L'+(rightX+4)+' 289 Q'+(rightX+14)+' 294 '+(rightX+20)+' 284Z" fill="'+(tier?pal.base:skin)+'" stroke="#111820" stroke-width="2"/>'+
    (tier>=3?'<path d="M'+(leftX-16)+' 269 L'+(leftX-2)+' 266 M'+(rightX+16)+' 269 L'+(rightX+2)+' 266" stroke="'+pal.trim+'" stroke-width="3"/>':'')+
    '</g>';
}
function paperChest(c,highlighted){
  var item=itemForSlot(c,'Chest'),tier=clampTier(item&&item.tier),pal=gearPalette(c,item,tier||1);
  var p=bodyProfile(c.race||c.appearance?.race||'Veyren'),s=p.shoulder,w=p.waist;
  var klass=paperClass(c),heavy=['Warrior','Paladin'].includes(klass),cloth=['Mage','Priest','Druid'].includes(klass);
  var top=138,bottom=250;
  var base=tier?pal.base:(cloth?'#243039':'#1c2a30');
  var torso='<path d="M'+(120-s)+' '+top+' Q120 '+(top-12)+' '+(120+s)+' '+top+' L'+(120+w)+' '+bottom+' Q120 '+(bottom+14)+' '+(120-w)+' '+bottom+'Z" fill="'+base+'" stroke="#111820" stroke-width="3"/>';
  if(heavy){
    torso+='<path d="M'+(120-s+6)+' 153 L120 177 L'+(120+s-6)+' 153 L'+(120+w-2)+' 225 L120 242 L'+(120-w+2)+' 225Z" fill="'+pal.dark+'" opacity=".58"/>';
    torso+='<path d="M120 146 L120 238 M'+(120-s+12)+' 179 L'+(120+s-12)+' 179" stroke="'+pal.trim+'" stroke-width="'+(tier>=3?3:2)+'" opacity=".8"/>';
  }else if(cloth){
    torso+='<path d="M'+(120-s+8)+' 155 Q120 177 '+(120+s-8)+' 155 M95 211 Q120 226 145 211" fill="none" stroke="'+pal.trim+'" stroke-width="'+(tier>=3?3:2)+'" opacity=".72"/>';
    torso+='<path d="M120 154 L120 237" stroke="'+pal.light+'" stroke-width="2" opacity=".35"/>';
  }else{
    torso+='<path d="M'+(120-s+7)+' 166 Q120 184 '+(120+s-7)+' 166 M94 222 L146 222" fill="none" stroke="'+pal.trim+'" stroke-width="2.5" opacity=".72"/>';
  }
  if(tier>=3)torso+='<path d="M112 182 L120 174 L128 182 L120 190Z" fill="'+pal.trim+'" stroke="#111820" stroke-width="1.5"/>';
  if(tier>=4)torso+='<circle cx="120" cy="182" r="3.2" fill="'+pal.glow+'" class="cb-paper-glow"/><path d="M102 200 Q120 212 138 200" fill="none" stroke="'+pal.glow+'" stroke-width="2" opacity=".55" class="cb-paper-glow"/>';
  return '<g class="'+paperSlotClass('Chest',highlighted)+'">'+torso+'</g>';
}
function paperShoulders(c,highlighted){
  var item=itemForSlot(c,'Shoulders'),tier=clampTier(item&&item.tier);
  if(!item)return'';
  var pal=gearPalette(c,item,tier),p=bodyProfile(c.race||c.appearance?.race||'Veyren'),s=p.shoulder;
  var extent=tier>=4?18:tier>=3?14:10;
  return '<g class="'+paperSlotClass('Shoulders',highlighted)+'">'+
    '<path d="M'+(120-s-4)+' 146 Q'+(120-s-extent)+' 142 '+(120-s-extent)+' 159 L'+(120-s+7)+' 169 L'+(120-s+14)+' 148Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.5"/>'+
    '<path d="M'+(120+s+4)+' 146 Q'+(120+s+extent)+' 142 '+(120+s+extent)+' 159 L'+(120+s-7)+' 169 L'+(120+s-14)+' 148Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.5"/>'+
    (tier>=3?'<path d="M'+(120-s-8)+' 151 L'+(120-s+7)+' 156 M'+(120+s+8)+' 151 L'+(120+s-7)+' 156" stroke="'+pal.light+'" stroke-width="2.5"/>':'')+
    (tier>=4?'<circle cx="'+(120-s-2)+'" cy="154" r="3" fill="'+pal.glow+'" class="cb-paper-glow"/><circle cx="'+(120+s+2)+'" cy="154" r="3" fill="'+pal.glow+'" class="cb-paper-glow"/>':'')+
    '</g>';
}
function paperWeapon(c,highlighted){
  var item=itemForSlot(c,'Weapon'),tier=clampTier(item&&item.tier);
  if(!item)return'';
  var pal=gearPalette(c,item,tier),klass=paperClass(c),g='';
  if(klass==='Hunter'){
    g='<path d="M188 125 Q224 210 188 305" fill="none" stroke="'+pal.base+'" stroke-width="8"/><path d="M188 125 L188 305" stroke="'+pal.trim+'" stroke-width="2"/><path d="M188 205 L221 196" stroke="'+pal.light+'" stroke-width="3"/>';
  }else if(klass==='Rogue'){
    g='<path d="M182 238 L210 315" stroke="'+pal.light+'" stroke-width="6" stroke-linecap="round"/><path d="M207 314 L217 333 L205 327Z" fill="'+pal.trim+'"/><path d="M180 235 L196 241" stroke="'+pal.trim+'" stroke-width="5"/>';
  }else if(['Mage','Priest','Druid'].includes(klass)){
    g='<path d="M191 116 L203 345" stroke="'+pal.base+'" stroke-width="8" stroke-linecap="round"/>'+
      (klass==='Druid'?'<path d="M191 119 Q177 103 184 91 M193 116 Q210 104 207 90" fill="none" stroke="'+pal.trim+'" stroke-width="5" stroke-linecap="round"/>':'<circle cx="191" cy="112" r="13" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="3"/>')+
      (tier>=3?'<circle cx="191" cy="112" r="5" fill="'+pal.glow+'" class="cb-paper-glow"/>':'');
  }else if(klass==='Paladin'){
    g='<path d="M191 164 L205 329" stroke="'+pal.dark+'" stroke-width="9" stroke-linecap="round"/><path d="M175 139 L205 130 L216 164 L184 174Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="3"/><path d="M181 150 L210 143" stroke="'+pal.light+'" stroke-width="3"/>';
  }else{
    g='<path d="M190 141 L207 330" stroke="'+pal.dark+'" stroke-width="8" stroke-linecap="round"/><path d="M187 139 L197 95 L207 139Z" fill="'+pal.light+'" stroke="'+pal.trim+'" stroke-width="2"/><path d="M178 155 L204 153" stroke="'+pal.trim+'" stroke-width="5"/>';
  }
  if(tier>=4)g+='<circle cx="196" cy="174" r="4" fill="'+pal.glow+'" opacity=".72" class="cb-paper-glow"/>';
  return '<g class="'+paperSlotClass('Weapon',highlighted)+'">'+g+'</g>';
}
function paperOffHand(c,highlighted){
  var item=itemForSlot(c,'OffHand'),tier=clampTier(item&&item.tier);
  if(!item)return'';
  var pal=gearPalette(c,item,tier),klass=paperClass(c),g='';
  if(['Warrior','Paladin'].includes(klass)){
    g='<path d="M26 174 Q48 155 70 174 L66 248 Q49 270 31 248Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="3"/><path d="M48 170 L48 255 M31 205 L66 205" stroke="'+pal.light+'" stroke-width="2.5" opacity=".65"/>';
  }else if(klass==='Rogue'){
    g='<path d="M51 236 L26 306" stroke="'+pal.light+'" stroke-width="6"/><path d="M29 304 L20 322 L32 316Z" fill="'+pal.trim+'"/>';
  }else{
    g='<circle cx="49" cy="216" r="20" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="3"/><circle cx="49" cy="216" r="'+(tier>=3?8:5)+'" fill="'+pal.glow+'" opacity=".72" class="cb-paper-glow"/>';
  }
  return '<g class="'+paperSlotClass('OffHand',highlighted)+'">'+g+'</g>';
}
function paperTierAura(c){
  var max=PAPER_VISIBLE_SLOTS.reduce(function(n,slot){var item=itemForSlot(c,slot);return Math.max(n,clampTier(item&&item.tier))},0);
  if(max<4)return'';
  var accent=paperAccent(c);
  return '<ellipse cx="120" cy="384" rx="75" ry="13" fill="none" stroke="'+accent+'" stroke-width="2" opacity=".28" class="cb-paper-glow"/>'+
    '<path d="M59 115 Q120 72 181 115" fill="none" stroke="'+accent+'" stroke-width="2" opacity=".14" class="cb-paper-glow"/>';
}
function paperDollSVG(c,opts){
  opts=opts||{};
  var race=c.race||(c.appearance&&c.appearance.race)||'Veyren';
  var a=normalizeAppearance(c.appearance||c,c.id||c.name||race,race);
  var r=raceDef(a.race),skin=r.skin[a.skinTone],eye=r.eyes[a.eyes],hair=HAIR[a.hairColor];
  var accent=opts.accent||paperAccent(c),highlighted=opts.highlightedSlot||'';
  var uid='pd'+hash((c.id||c.name||race)+'|'+JSON.stringify(a)).toString(36);
  var neck='<path d="M108 111 L108 142 Q120 151 132 142 L132 111Z" fill="'+skin+'" stroke="#182027" stroke-width="2.5"/>';
  var baseBody='<path d="M94 240 Q120 250 146 240 L150 268 Q120 281 90 268Z" fill="#162126" stroke="#111820" stroke-width="3"/>';
  return '<svg viewBox="0 0 240 410" role="img" aria-hidden="true" focusable="false">'+
    '<defs><radialGradient id="'+uid+'a" cx="50%" cy="46%" r="54%"><stop offset="0%" stop-color="'+accent+'" stop-opacity=".13"/><stop offset="70%" stop-color="'+accent+'" stop-opacity=".025"/><stop offset="100%" stop-color="'+accent+'" stop-opacity="0"/></radialGradient></defs>'+
    '<ellipse cx="120" cy="214" rx="110" ry="180" fill="url(#'+uid+'a)"/>'+
    '<ellipse cx="120" cy="390" rx="72" ry="10" fill="#000" opacity=".38"/>'+
    paperTierAura(c)+
    paperLegs(c,skin,highlighted)+paperFeet(c,highlighted)+
    paperWeapon(c,highlighted)+paperOffHand(c,highlighted)+
    paperArms(c,skin,highlighted)+baseBody+paperChest(c,highlighted)+paperShoulders(c,highlighted)+
    neck+
    '<g transform="translate(70 21)">'+paperHeadMarkup(c,a,skin,eye,hair,highlighted)+'</g>'+
    '</svg>';
}
function paperDollHTML(subject,opts){
  opts=opts||{};
  var c=subject||{},size=opts.size||'equipment',accent=opts.accent||paperAccent(c);
  var label=opts.label||((c.name||'Character')+' equipment appearance');
  return '<span class="cb-paper-doll cb-paper-doll--'+esc(size)+'" style="--cbp-accent:'+accent+'" role="img" aria-label="'+esc(label)+'">'+paperDollSVG(c,opts)+'</span>';
}

window.CellboundPortraits={
  version:1,RACES:RACES,COUNTS:COUNTS,CLASS_COLORS:CLASS_COLORS,
  normalizeAppearance:normalizeAppearance,randomAppearance:randomAppearance,
  applyToCharacter:applyToCharacter,portraitHTML:portraitHTML,paperDollHTML:paperDollHTML,paperDollSVG:paperDollSVG,
  editorHTML:editorHTML,bindEditor:bindEditor
};
})();