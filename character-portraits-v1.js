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
const PAINTED_RACES=new Set(['Veyren','Stoneborn','Aelari']);
// All converted painted race packs now contain real alpha.
const PAINTED_BODY_RACES=new Set(['Veyren','Stoneborn','Aelari']);
const PAINTED_BODY_STANDARD=Object.freeze({width:512,height:896,footY:842,version:1});
function paintedRaceOf(c,a){
  var race=c?.race||a?.race||c?.appearance?.race||'Veyren';
  return PAINTED_RACES.has(race)?race:'';
}
function paintedAsset(race,file){
  return './assets/characters/v2/'+String(race).toLowerCase()+'/'+file+'?v=4';
}
function paintedFaceIndex(a){
  var value=Number(a?.face)||0;
  return ((value%4)+4)%4;
}
function paintedFaceHTML(c,a,accent,size,label,className){
  var race=paintedRaceOf(c,a),face=paintedFaceIndex(a);
  var slug=String(race).toLowerCase();
  var cls='cb-portrait cb-painted-portrait cb-painted-'+slug+' cb-portrait--'+esc(size)+(className?' '+esc(className):'');
  return '<span class="'+cls+'" style="--cbp-accent:'+accent+'" role="img" aria-label="'+esc(label)+'" data-painted-race="'+esc(race)+'" data-painted-face="'+face+'"><img src="'+paintedAsset(race,'face-'+face+'.webp')+'" alt="" draggable="false"></span>';
}
function paintedBodyHTML(c,a,kind,label,extraAttrs){
  var race=paintedRaceOf(c,a),slug=String(race).toLowerCase();
  var bodyKey=(paintedFaceIndex(a)%2===1)?'b':'a';
  var body='body-'+bodyKey+'.webp';
  return '<span class="'+kind+' cb-painted-character cb-painted-'+slug+'-body cb-painted-body-'+bodyKey+'" role="img" aria-label="'+esc(label)+'" data-painted-race="'+esc(race)+'" data-painted-body="'+bodyKey+'" data-body-standard="'+PAINTED_BODY_STANDARD.width+'x'+PAINTED_BODY_STANDARD.height+'"'+(extraAttrs||'')+'><img src="'+paintedAsset(race,body)+'" alt="" draggable="false"></span>';
}
function usesIllustratedBody(subject){
  var c=subject||{},race=c.race||(c.appearance&&c.appearance.race)||'Veyren';
  return Boolean(RACES[race]||RACES[c?.appearance?.race]);
}
// Compatibility alias for older callers while the runtime moves off static paintings.
function usesPaintedBody(subject){return usesIllustratedBody(subject)}
function illustratedSignature(c){
  // Phase 1 visual identity is race + saved appearance + class only.
  // Equipment remains gameplay/stat data until the modular armour pass lands.
  var race=c?.race||c?.appearance?.race||'Veyren';
  var a=normalizeAppearance(c?.appearance||c,c?.id||c?.name||race,race);
  return hash(JSON.stringify(['character-model-v2',a,c?.class||'Warrior'])).toString(36);
}
function portraitHTML(subject,opts){
  opts=opts||{};
  var c=subject||{};
  var race=c.race||(c.appearance&&c.appearance.race)||'Veyren';
  var a=normalizeAppearance(c.appearance||c,c.id||c.name||opts.seed||race,race);
  var accent=opts.accent||CLASS_COLORS[c.class]||'#76d7d0';
  var size=opts.size||'md';
  var cls='cb-portrait cb-portrait-illustrated cb-portrait--'+esc(size)+(opts.className?' '+esc(opts.className):'');
  var label=opts.label||c.name||a.race+' adventurer';
  return '<span class="'+cls+'" style="--cbp-accent:'+accent+'" role="img" aria-label="'+esc(label)+'" data-illustrated-race="'+esc(a.race)+'" data-appearance-key="'+hash(JSON.stringify(a)).toString(36)+'">'+svgFor(a,accent)+'</span>';
}
function optionText(field,value,race){
  if(field==='hair'&&value===0)return 'None';
  if(field==='facialHair'&&value===0)return 'None';
  if(field==='marking'&&value===0)return 'None';
  var count=COUNTS[field]||1;
  return String((Number(value)||0)+1).padStart(2,'0')+' / '+String(count).padStart(2,'0');
}
function editorHTML(appearance,opts){
  opts=opts||{};
  var a=normalizeAppearance(appearance,opts.seed,appearance?.race||opts.race);
  var fields=['skinTone','face','hair','hairColor','facialHair','marking','eyes','feature'];
  var rows=fields.map(function(field){
    var label=field==='feature'?(raceDef(a.race).featureLabel||'Race detail'):(LABELS[field]||field);
    return '<div class="cb-appearance-control"><span>'+esc(label)+'</span><div><button type="button" data-appearance-field="'+field+'" data-direction="-1" aria-label="Previous '+esc(label)+'">‹</button><b>'+esc(optionText(field,a[field],a.race))+'</b><button type="button" data-appearance-field="'+field+'" data-direction="1" aria-label="Next '+esc(label)+'">›</button></div></div>';
  }).join('');
  var previewCharacter={id:opts.seed||'appearance-preview',name:opts.name||'Character',race:a.race,appearance:a,class:opts.characterClass||'Warrior',equipment:opts.equipment||{}};
  var portrait=portraitHTML(previewCharacter,{size:'hero',label:(opts.name||'Character')+' portrait preview'});
  var body=creatorFigureHTML(previewCharacter,{size:'creator',label:(opts.name||'Character')+' full body preview'});
  return '<div class="cb-appearance-editor cb-appearance-editor-illustrated cb-character-model-v2" data-appearance-editor><div class="cb-appearance-preview"><div class="cb-appearance-preview-pair cb-model-preview-pair">'+portrait+body+'</div><small class="cb-appearance-live-note">RACE + CLASS LIVE MODEL</small><button type="button" data-appearance-randomize>RANDOMISE APPEARANCE</button></div><div class="cb-appearance-controls">'+rows+'</div></div>';
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
  Mage:{primary:'#337fa0',secondary:'#3d396f',trim:'#bd9ceb',glow:'#82e7ff',motif:'star'}
};

const CLASS_WEAPON_DEFAULT={
  Warrior:'sword',Paladin:'hammer',Priest:'staff',Druid:'staff',
  Hunter:'bow',Rogue:'dagger',Mage:'staff'
};
const CLASS_OFFHAND_DEFAULT={
  Warrior:'shield',Paladin:'shield',Priest:'tome',Druid:'idol',
  Hunter:'quiver',Rogue:'dagger',Mage:'focus'
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
  if(match)return String((item.class||paperClass(c)||'gear')).toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-t'+match[1];
  if(Number(item.tier)>=5)return String((item.class||paperClass(c)||'gear')).toLowerCase()+'-t5';
  return null;
}
function isSetItem(item,c){
  return Boolean(setGroupId(c,item));
}
function setVisual(c,item){
  var klass=(item&&item.class)||paperClass(c),base=SET_VISUALS[klass]||SET_VISUALS.Warrior;
  var id=setGroupId(c,item);
  if(!id)return null;
  var shift=(hash(id)%5)-2;
  return {
    primary:shift>0?mixHex(base.primary,'#ffffff',shift*.035):mixHex(base.primary,'#080d11',Math.abs(shift)*.035),
    secondary:base.secondary,trim:base.trim,glow:base.glow,motif:base.motif,id:id
  };
}
function gearPalette(c,item,tier,slot){
  var accent=CLASS_COLORS[(item&&item.class)||paperClass(c)]||paperAccent(c);
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
    Stoneborn:{shoulder:52,waist:32,leg:17,arm:14,headScale:1.02},
    Aelari:{shoulder:40,waist:25,leg:13,arm:11,headScale:.97},
    Thornkin:{shoulder:47,waist:29,leg:15,arm:13,headScale:1},
    Emberkin:{shoulder:47,waist:29,leg:15,arm:13,headScale:1},
    Nymari:{shoulder:43,waist:27,leg:14,arm:12,headScale:.99},
    Veyren:{shoulder:45,waist:28,leg:14,arm:12,headScale:1}
  })[race]||{shoulder:45,waist:28,leg:14,arm:12,headScale:1};
}

/* Character Creator Figure V1
   Compact illustrated RPG proportions matching the Living World town-party direction.
   This intentionally uses a class archetype silhouette in the creator rather than the
   older tall equipment paper doll. Saved race/appearance data stays unchanged. */
function creatorClassPalette(klass){
  return ({
    Warrior:{base:'#4a4b53',dark:'#24252b',mid:'#666873',light:'#979aa3',trim:'#d19a48',cloth:'#8e342d',accent:'#c44b3f',glow:'#f0b35f'},
    Paladin:{base:'#757986',dark:'#343741',mid:'#9599a4',light:'#c9c4b4',trim:'#d6ae5e',cloth:'#365787',accent:'#e8d59b',glow:'#f2c4d7'},
    Priest:{base:'#d8d0bf',dark:'#6a625c',mid:'#b5ab9a',light:'#f0e5d1',trim:'#c89a50',cloth:'#eee6d7',accent:'#f5f0e7',glow:'#fff7dc'},
    Druid:{base:'#4c593e',dark:'#283025',mid:'#697b57',light:'#84936f',trim:'#9c7748',cloth:'#35503a',accent:'#7a9a5b',glow:'#c8a46e'},
    Hunter:{base:'#46513e',dark:'#272f28',mid:'#65705b',light:'#7f8c73',trim:'#9b7444',cloth:'#31503b',accent:'#829c67',glow:'#b9d887'},
    Rogue:{base:'#393640',dark:'#1d1c22',mid:'#514d58',light:'#6d6674',trim:'#876551',cloth:'#6d3035',accent:'#7e3c44',glow:'#d8ba6e'},
    Mage:{base:'#424870',dark:'#252943',mid:'#626a9a',light:'#8793c0',trim:'#b08ac7',cloth:'#343b68',accent:'#5667a7',glow:'#62c8ea'}
  })[klass]||{base:'#4a4b53',dark:'#24252b',mid:'#666873',light:'#92949a',trim:'#aa885c',cloth:'#493b39',accent:'#6a5751',glow:CLASS_COLORS[klass]||'#d6a45f'};
}
function creatorRaceBody(race){
  return ({
    Stoneborn:{width:1.16,head:1.08,leg:.90,arm:1.09,boot:1.08},
    Aelari:{width:.88,head:.98,leg:1.06,arm:.92,boot:.94},
    Thornkin:{width:1.02,head:1.02,leg:.98,arm:1.02,boot:1},
    Emberkin:{width:1.05,head:1.02,leg:.98,arm:1.04,boot:1.02},
    Nymari:{width:.94,head:1.00,leg:1.04,arm:.95,boot:.96},
    Veyren:{width:1,head:1,leg:1,arm:1,boot:1}
  })[race]||{width:1,head:1,leg:1,arm:1,boot:1};
}
function creatorFaceShape(i){
  return [
    'M31 36 Q50 23 69 36 L68 63 Q64 79 50 87 Q36 79 32 63Z',
    'M29 37 Q50 24 71 37 L69 66 Q63 82 50 88 Q37 82 31 66Z',
    'M33 33 Q50 22 67 33 L69 60 Q65 80 50 90 Q35 80 31 60Z',
    'M30 39 Q35 24 50 23 Q65 24 70 39 L67 65 Q62 82 50 87 Q38 82 33 65Z'
  ][i]||'M31 36 Q50 23 69 36 L68 63 Q64 79 50 87 Q36 79 32 63Z';
}
function creatorFaceMarkup(c,a,skin,eye,hair){
  var race=a.race,profile=creatorRaceBody(race),s=profile.head;
  var x=120-50*s,y=9+(1-s)*8,face=creatorFaceShape(a.face);
  var p=creatorClassPalette(c.class),headGear='';
  if(c.class==='Mage')headGear='<path d="M26 39 Q31 17 50 16 Q69 17 74 39 L65 48 Q58 37 50 35 Q41 37 35 48Z" fill="'+p.dark+'" stroke="#171218" stroke-width="3.4"/><path d="M38 22 L48 -4 L61 25Z" fill="'+p.base+'" stroke="#171218" stroke-width="3.2"/><path d="M30 39 Q50 46 71 39" fill="none" stroke="'+p.trim+'" stroke-width="2.5"/>';
  if(c.class==='Hunter')headGear='<path d="M27 41 Q30 19 50 17 Q70 19 73 41 L65 54 Q59 41 50 37 Q41 41 35 54Z" fill="'+p.cloth+'" stroke="#171218" stroke-width="3.3"/>';
  if(c.class==='Rogue')headGear='<path d="M26 42 Q30 17 50 16 Q70 17 74 42 L64 58 Q59 43 50 38 Q41 43 36 58Z" fill="'+p.dark+'" stroke="#171218" stroke-width="3.4"/>';
  if(c.class==='Priest')headGear='<path d="M26 42 Q30 18 50 17 Q70 18 74 42 L66 53 Q59 40 50 36 Q41 40 34 53Z" fill="'+p.cloth+'" stroke="#171218" stroke-width="3.2"/><path d="M32 39 Q50 47 68 39" fill="none" stroke="'+p.trim+'" stroke-width="2.2"/>';
  return '<g transform="translate('+x+' '+y+') scale('+s+')">'+
    raceFeatureMarkup(a,race)+earsMarkup(race,skin,a.feature)+
    '<path d="'+face+'" fill="'+skin+'" stroke="#171216" stroke-width="3.5" stroke-linejoin="round"/>'+
    '<path d="'+face+'" fill="none" stroke="#fff1df" stroke-width="1.3" opacity=".16" transform="translate(-1 -1)"/>'+
    hairMarkup(a,hair)+
    '<ellipse cx="42.5" cy="54" rx="2.5" ry="5.2" fill="#171216"/><ellipse cx="57.5" cy="54" rx="2.5" ry="5.2" fill="#171216"/>'+
    '<ellipse cx="42.5" cy="52.6" rx=".7" ry="1.2" fill="'+eye+'" opacity=".62"/><ellipse cx="57.5" cy="52.6" rx=".7" ry="1.2" fill="'+eye+'" opacity=".62"/>'+
    '<path d="M46 70 Q50 72 54 70" fill="none" stroke="#6e433f" stroke-width="1.7" stroke-linecap="round" opacity=".82"/>'+
    markingMarkup(a,race)+beardMarkup(a,hair)+headGear+
  '</g>';
}
function creatorWeaponMarkup(c,p){
  var k=c.class||'Warrior';
  if(k==='Warrior')return '<g transform="translate(39 107) rotate(-10)"><path d="M8 15 L18 113" stroke="#6a4730" stroke-width="8" stroke-linecap="round"/><path d="M10 13 L4 -34 L19 -38 L24 12Z" fill="#aab0b6" stroke="#171216" stroke-width="4"/><path d="M1 13 L25 10" stroke="'+p.trim+'" stroke-width="6"/></g><path d="M168 137 Q205 125 216 149 L210 219 Q191 238 168 220Z" fill="'+p.dark+'" stroke="#171216" stroke-width="4.5"/><path d="M190 137 V225 M170 177 H211" stroke="'+p.trim+'" stroke-width="3.5" opacity=".88"/><path d="M190 154 L200 176 L190 198 L180 176Z" fill="'+p.trim+'" opacity=".88"/>';
  if(k==='Paladin')return '<g transform="translate(175 103) rotate(7)"><path d="M7 22 L1 125" stroke="#684c32" stroke-width="8" stroke-linecap="round"/><rect x="-10" y="-15" width="34" height="34" rx="5" fill="#a9966c" stroke="#171216" stroke-width="4"/><path d="M7 -14 V18 M-9 2 H23" stroke="'+p.trim+'" stroke-width="3"/></g><path d="M22 148 Q46 126 76 139 L72 216 Q51 233 29 217Z" fill="'+p.cloth+'" stroke="#171216" stroke-width="4.5"/><path d="M51 149 V218 M31 181 H72" stroke="'+p.trim+'" stroke-width="3"/>';
  if(k==='Priest')return '<g transform="translate(181 78)"><path d="M0 29 L-5 190" stroke="#765639" stroke-width="8" stroke-linecap="round"/><circle cx="0" cy="11" r="14" fill="none" stroke="'+p.trim+'" stroke-width="4"/><path d="M0 -6 V28 M-16 11 H16" stroke="'+p.trim+'" stroke-width="3"/></g>';
  if(k==='Druid')return '<g transform="translate(182 79)"><path d="M2 24 Q-8 102 -2 192" fill="none" stroke="#75533a" stroke-width="9" stroke-linecap="round"/><path d="M2 25 Q-22 10 -12 -10 M3 25 Q22 11 17 -7" fill="none" stroke="#75533a" stroke-width="6" stroke-linecap="round"/><path d="M-15 -3 Q-27 -2 -21 -15 Q-8 -14 -7 -5 M15 -1 Q28 0 23 -12 Q10 -14 8 -4" fill="#718a57" stroke="#263225" stroke-width="2.5"/></g>';
  if(k==='Hunter')return '<g transform="translate(184 123)"><path d="M-2 -15 Q34 47 -4 116" fill="none" stroke="#9d7849" stroke-width="6"/><path d="M-2 -15 Q-29 50 -4 116" fill="none" stroke="#9d7849" stroke-width="6"/><path d="M-2 -15 L-4 116" stroke="#d0bc8d" stroke-width="1.8"/></g><path d="M48 111 L79 122 L72 211 L47 201Z" fill="#44382a" stroke="#171216" stroke-width="3.5"/><path d="M53 113 L49 78 M61 115 L61 77 M69 118 L73 85" stroke="#c4a86f" stroke-width="3.4"/>';
  if(k==='Rogue')return '<g transform="translate(37 184) rotate(-20)"><path d="M0 0 L13 67" stroke="#b4b9bd" stroke-width="7"/><path d="M-8 1 H14" stroke="'+p.trim+'" stroke-width="5"/></g><g transform="translate(184 183) rotate(20)"><path d="M0 0 L-13 67" stroke="#b4b9bd" stroke-width="7"/><path d="M-14 1 H8" stroke="'+p.trim+'" stroke-width="5"/></g>';
  if(k==='Mage')return '<g transform="translate(183 75)"><path d="M0 33 L-4 199" stroke="#6a4d3a" stroke-width="8" stroke-linecap="round"/><path d="M-1 26 L-11 7 L1 -9 L14 7Z" fill="#8dd4ec" stroke="#171216" stroke-width="3"/><circle cx="1" cy="7" r="17" fill="'+p.glow+'" opacity=".22"/></g>';
  return'';
}
function creatorBodyMarkup(c,p,race){
  var k=c.class||'Warrior',q=creatorRaceBody(race),cx=120,w=76*q.width,left=cx-w/2,right=cx+w/2,waist=29*q.width;
  var legH=54*q.leg,legTop=202,bootY=legTop+legH-10,bootW=31*q.boot;
  var legs='<path d="M'+(cx-waist)+' '+legTop+' L'+(cx-8)+' '+legTop+' L'+(cx-12)+' '+bootY+' L'+(cx-31)+' '+bootY+' Q'+(cx-37)+' '+(bootY-18)+' '+(cx-28)+' '+(legTop+18)+'Z" fill="'+p.dark+'" stroke="#171216" stroke-width="4.5"/>'+
    '<path d="M'+(cx+8)+' '+legTop+' L'+(cx+waist)+' '+legTop+' L'+(cx+31)+' '+bootY+' L'+(cx+12)+' '+bootY+' L'+(cx+8)+' '+(legTop+18)+'Z" fill="'+p.dark+'" stroke="#171216" stroke-width="4.5"/>'+
    '<path d="M'+(cx-bootW-5)+' '+(bootY-4)+' Q'+(cx-22)+' '+(bootY-12)+' '+(cx-5)+' '+bootY+' L'+(cx-7)+' 281 L'+(cx-bootW-13)+' 281 Q'+(cx-bootW-17)+' 267 '+(cx-bootW-4)+' '+(bootY+2)+'Z" fill="#2a211e" stroke="#171216" stroke-width="4.5"/>'+
    '<path d="M'+(cx+bootW+5)+' '+(bootY-4)+' Q'+(cx+22)+' '+(bootY-12)+' '+(cx+5)+' '+bootY+' L'+(cx+7)+' 281 L'+(cx+bootW+13)+' 281 Q'+(cx+bootW+17)+' 267 '+(cx+bootW+4)+' '+(bootY+2)+'Z" fill="#2a211e" stroke="#171216" stroke-width="4.5"/>';
  var torso='<path d="M'+left+' 111 Q120 99 '+right+' 111 L'+(right+7)+' 198 Q120 217 '+(left-7)+' 198Z" fill="'+p.base+'" stroke="#171216" stroke-width="5"/><path d="M'+(left+8)+' 121 Q120 111 '+(right-8)+' 121" fill="none" stroke="'+p.light+'" stroke-width="3" opacity=".35"/>';
  var armW=16*q.arm;
  var arms='<path d="M'+(left+5)+' 127 Q'+(left-24)+' 140 '+(left-21)+' 188 Q'+(left-15)+' 207 '+(left+1)+' 190 L'+(left+13)+' 142Z" fill="'+p.base+'" stroke="#171216" stroke-width="5"/>'+
    '<path d="M'+(right-5)+' 127 Q'+(right+24)+' 140 '+(right+21)+' 188 Q'+(right+15)+' 207 '+(right-1)+' 190 L'+(right-13)+' 142Z" fill="'+p.base+'" stroke="#171216" stroke-width="5"/>';
  var detail='';
  if(k==='Warrior')detail='<path d="M'+(left-11)+' 122 Q'+(left+7)+' 103 '+(left+31)+' 120 L'+(left+21)+' 149 L'+(left-10)+' 141Z M'+(right+11)+' 122 Q'+(right-7)+' 103 '+(right-31)+' 120 L'+(right-21)+' 149 L'+(right+10)+' 141Z" fill="'+p.mid+'" stroke="#171216" stroke-width="4.2"/><path d="M82 129 L120 154 L158 129 M86 171 H154 M120 153 V203" fill="none" stroke="'+p.trim+'" stroke-width="3.2"/><path d="M77 113 L105 135 L92 206 L66 197Z" fill="'+p.cloth+'" stroke="#171216" stroke-width="3.2"/><path d="M83 142 Q120 166 157 142" fill="none" stroke="#f4c899" stroke-width="2" opacity=".22"/>';
  if(k==='Paladin')detail='<path d="M'+(left-12)+' 120 Q'+(left+5)+' 103 '+(left+31)+' 119 L'+(left+21)+' 148 L'+(left-11)+' 141Z M'+(right+12)+' 120 Q'+(right-5)+' 103 '+(right-31)+' 119 L'+(right-21)+' 148 L'+(right+11)+' 141Z" fill="'+p.light+'" stroke="#171216" stroke-width="4.2"/><path d="M120 118 V201 M84 154 H156" stroke="'+p.trim+'" stroke-width="3.2"/><path d="M101 119 L120 143 L139 119" fill="'+p.cloth+'" opacity=".75"/><circle cx="120" cy="161" r="10" fill="'+p.trim+'" opacity=".88"/>';
  if(k==='Priest')detail='<path d="M'+(left+5)+' 108 Q120 127 '+(right-5)+' 108 L'+(right+23)+' 236 Q120 260 '+(left-23)+' 236Z" fill="'+p.light+'" stroke="#171216" stroke-width="4.2"/><path d="M91 121 L120 151 L149 121 M120 150 V227" fill="none" stroke="'+p.trim+'" stroke-width="3"/><path d="M84 216 Q120 235 156 216" fill="none" stroke="'+p.trim+'" stroke-width="2.4"/>';
  if(k==='Druid')detail='<path d="M'+(left-8)+' 115 Q120 99 '+(right+8)+' 115 L'+(right+16)+' 215 Q120 234 '+(left-16)+' 215Z" fill="'+p.base+'" stroke="#171216" stroke-width="5"/><path d="M74 132 Q92 110 109 126 Q94 151 74 146Z M166 132 Q148 110 131 126 Q146 151 166 146Z" fill="#688050" stroke="#293225" stroke-width="2.5"/><path d="M89 170 Q106 159 116 178 Q100 195 86 184Z M151 166 Q134 159 126 180 Q141 194 154 181Z" fill="#7d955d" stroke="#293225" stroke-width="2.5"/><circle cx="120" cy="170" r="6" fill="'+p.trim+'" opacity=".8"/>';
  if(k==='Hunter')detail='<path d="M'+(left-7)+' 110 Q120 99 '+(right+6)+' 112 L'+(right+12)+' 207 Q120 224 '+(left-12)+' 207Z" fill="'+p.base+'" stroke="#171216" stroke-width="5"/><path d="M80 126 L153 192" stroke="#80593f" stroke-width="8"/><path d="M88 169 H151" stroke="'+p.trim+'" stroke-width="3"/><path d="M70 116 Q120 138 170 116 L160 147 Q120 164 80 147Z" fill="'+p.cloth+'" stroke="#171216" stroke-width="3"/>';
  if(k==='Rogue')detail='<path d="M'+(left-3)+' 112 Q120 100 '+(right+3)+' 112 L'+(right+9)+' 205 Q120 221 '+(left-9)+' 205Z" fill="'+p.base+'" stroke="#171216" stroke-width="5"/><path d="M80 126 L158 186 M160 126 L82 186" stroke="#704d40" stroke-width="6"/><path d="M86 194 H154" stroke="'+p.trim+'" stroke-width="2.6"/><path d="M75 114 Q120 139 165 114 L157 150 Q120 165 83 150Z" fill="'+p.cloth+'" stroke="#171216" stroke-width="3.2"/>';
  if(k==='Mage')detail='<path d="M'+(left+4)+' 108 Q120 99 '+(right-4)+' 108 L'+(right+22)+' 236 Q120 260 '+(left-22)+' 236Z" fill="'+p.base+'" stroke="#171216" stroke-width="5"/><path d="M90 119 L120 151 L150 119 M120 150 V226" fill="none" stroke="'+p.trim+'" stroke-width="3.2"/><path d="M83 204 Q120 223 157 204" fill="none" stroke="'+p.trim+'" stroke-width="2.7"/><circle cx="120" cy="177" r="7" fill="'+p.glow+'" opacity=".3"/>';
  var racial='';
  if(race==='Stoneborn')racial='<path d="M66 144 L54 137 L59 126 M174 144 L186 137 L181 126" fill="none" stroke="#cab8aa" stroke-width="4.5" opacity=".58"/>';
  if(race==='Thornkin')racial='<path d="M73 136 L61 121 M167 136 L179 120 M86 203 L74 218" stroke="#536c42" stroke-width="4.5" stroke-linecap="round"/><path d="M60 122 l-7 -7 l2 10 M179 121 l7 -6 l-3 10" fill="#78965a"/>';
  if(race==='Emberkin')racial='<path d="M79 181 Q92 172 100 189 M161 180 Q148 171 140 188" fill="none" stroke="#ef7b4e" stroke-width="2.8" opacity=".72"/>';
  if(race==='Nymari')racial='<path d="M65 151 L53 141 L62 164 M175 151 L187 141 L178 164" fill="#61a4ae" opacity=".62"/>';
  return legs+arms+torso+detail+racial;
}
function creatorFigureSVG(subject){
  var c=subject||{},race=c.race||c.appearance?.race||'Veyren';
  var a=normalizeAppearance(c.appearance||c,c.id||c.name||race,race),r=raceDef(a.race);
  var skin=r.skin[a.skinTone],eye=r.eyes[a.eyes],hair=HAIR[a.hairColor],p=creatorClassPalette(c.class);
  var uid='cc3'+hash((c.id||c.name||race)+'|'+JSON.stringify(a)+'|'+(c.class||'Warrior')).toString(36);
  return '<svg viewBox="0 0 240 300" role="img" aria-hidden="true" focusable="false" class="cb-creator-figure-svg cb-creator-figure-v3" data-race="'+esc(a.race)+'" data-class="'+esc(c.class||'Warrior')+'">'+
    '<defs>'+
      '<radialGradient id="'+uid+'a" cx="50%" cy="46%" r="62%"><stop offset="0%" stop-color="'+p.glow+'" stop-opacity=".22"/><stop offset="72%" stop-color="'+p.glow+'" stop-opacity=".025"/><stop offset="100%" stop-color="'+p.glow+'" stop-opacity="0"/></radialGradient>'+
      '<linearGradient id="'+uid+'warm" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff3d8" stop-opacity=".16"/><stop offset="45%" stop-color="#fff" stop-opacity=".015"/><stop offset="100%" stop-color="#8c432b" stop-opacity=".16"/></linearGradient>'+
      '<filter id="'+uid+'s" x="-35%" y="-30%" width="170%" height="175%"><feDropShadow dx="0" dy="5" stdDeviation="3.8" flood-color="#09070a" flood-opacity=".52"/></filter>'+
    '</defs>'+
    '<ellipse cx="120" cy="282" rx="67" ry="10" fill="#000" opacity=".28"/><ellipse cx="120" cy="153" rx="108" ry="137" fill="url(#'+uid+'a)"/>'+
    '<g filter="url(#'+uid+'s)">'+creatorWeaponMarkup(c,p)+creatorBodyMarkup(c,p,a.race)+creatorFaceMarkup(c,a,skin,eye,hair)+'</g>'+
    '<path d="M52 42 Q120 10 188 42 L180 229 Q120 270 60 229Z" fill="url(#'+uid+'warm)" opacity=".23" pointer-events="none"/>'+
  '</svg>';
}
function creatorFigureHTML(subject,opts){
  opts=opts||{};
  var c=subject||{},race=c.race||c.appearance?.race||'Veyren';
  var a=normalizeAppearance(c.appearance||c,c.id||c.name||race,race);
  var cls='cb-creator-figure cb-creator-figure-v3-shell cb-creator-figure--'+esc((c.class||'Warrior').toLowerCase().replace(/[^a-z0-9]+/g,'-'));
  return '<span class="'+cls+'" role="img" aria-label="'+esc(opts.label||((c.name||race)+' '+(c.class||'adventurer'))) +'" data-creator-race="'+esc(a.race)+'" data-creator-class="'+esc(c.class||'Warrior')+'" data-character-art="inn-match-v3">'+creatorFigureSVG({...c,appearance:a})+'</span>';
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
  return CLASS_WEAPON_DEFAULT[paperClass(c)]||'sword';
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
  return CLASS_OFFHAND_DEFAULT[paperClass(c)]||'focus';
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
  var klass=paperClass(c),cloth=['Mage','Priest','Druid'].includes(klass),v=pal.variant;
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
  if(!item)return '<g class="cb-paper-underlayer cb-paper-empty-legs">'+
    '<path d="M92 246 L116 246 L112 355 L84 355 Q84 322 89 286Z" fill="#1a2327" stroke="#111820" stroke-width="2.4"/>'+
    '<path d="M124 246 L148 246 L156 355 L128 355 L124 286Z" fill="#1a2327" stroke="#111820" stroke-width="2.4"/>'+
    '<path d="M96 270 L112 274 M128 274 L144 270" stroke="#303b40" stroke-width="1.5" opacity=".55"/></g>';
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier||1,'Legs'),v=pal.variant,base=pal.base,trim=pal.trim;
  return '<g class="'+paperSlotClass('Legs',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Legs'))+'">'+
    '<path d="M91 247 L116 247 L112 354 L82 354 Q83 322 88 285Z" fill="'+base+'" stroke="#111820" stroke-width="3"/>'+
    '<path d="M124 247 L149 247 L158 354 L128 354 L124 286Z" fill="'+base+'" stroke="#111820" stroke-width="3"/>'+
    (v%2?'<path d="M93 268 L113 276 M127 276 L147 268" fill="none" stroke="'+trim+'" stroke-width="3"/>':'<path d="M88 298 L111 304 M129 304 L152 298" fill="none" stroke="'+trim+'" stroke-width="3"/>')+
    itemRune(item,'Legs',pal,101,286,.55)+itemRune(item,'Legs',pal,139,286,.55)+
    (pal.set?'<path d="M88 323 L111 329 M129 329 L153 323" stroke="'+pal.glow+'" stroke-width="2.5" opacity=".7" class="cb-paper-set-glow"/>':'')+
    '</g>';
}
function paperFeet(c,skin,highlighted){
  var item=itemForSlot(c,'Feet');
  if(!item)return '<g class="cb-paper-underlayer cb-paper-empty-feet">'+
    '<path d="M86 348 L111 348 L111 386 L76 386 Q74 377 84 370Z" fill="'+skin+'" stroke="#111820" stroke-width="2"/>'+
    '<path d="M129 348 L154 348 L164 386 L129 386 L129 369Z" fill="'+skin+'" stroke="#111820" stroke-width="2"/>'+
    '<path d="M82 369 L110 369 M130 369 L158 369" stroke="#6d5148" stroke-width="1.4" opacity=".35"/></g>';
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier||1,'Feet'),v=pal.variant,base=pal.dark,trim=pal.trim;
  return '<g class="'+paperSlotClass('Feet',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Feet'))+'">'+
    '<path d="M81 344 L112 344 L113 389 L74 389 Q72 378 82 369Z" fill="'+base+'" stroke="#0c1115" stroke-width="3"/>'+
    '<path d="M128 344 L159 344 L166 389 L127 389 L127 368Z" fill="'+base+'" stroke="#0c1115" stroke-width="3"/>'+
    '<path d="M79 '+(v%2?361:371)+' L111 '+(v%2?361:371)+' M129 '+(v%2?361:371)+' L161 '+(v%2?361:371)+'" stroke="'+trim+'" stroke-width="3"/>'+
    (pal.set?'<path d="M77 383 L111 383 M129 383 L164 383" stroke="'+pal.glow+'" stroke-width="2.2" opacity=".8" class="cb-paper-set-glow"/>':'')+
    '</g>';
}
function paperArms(c,skin,highlighted){
  var hands=itemForSlot(c,'Hands'),tier=clampTier(hands&&hands.tier),pal=gearPalette(c,hands,tier||1,'Hands');
  var p=bodyProfile(c.race||c.appearance?.race||'Veyren'),shoulder=p.shoulder,arm=p.arm;
  var leftX=120-shoulder,rightX=120+shoulder;
  return '<g class="cb-paper-arms">'+
    '<path d="M'+leftX+' 148 Q'+(leftX-14)+' 178 '+(leftX-18)+' 218 Q'+(leftX-18)+' 245 '+(leftX-9)+' 279" fill="none" stroke="'+skin+'" stroke-width="'+arm+'" stroke-linecap="round"/>'+
    '<path d="M'+rightX+' 148 Q'+(rightX+14)+' 178 '+(rightX+18)+' 218 Q'+(rightX+18)+' 245 '+(rightX+9)+' 279" fill="none" stroke="'+skin+'" stroke-width="'+arm+'" stroke-linecap="round"/>'+
    '</g>'+
    '<g class="'+paperSlotClass('Hands',highlighted,hands)+'" data-item-key="'+esc(itemIdentity(hands,'Hands'))+'">'+
    '<path d="M'+(leftX-16)+' 258 Q'+(leftX-7)+' 251 '+(leftX+2)+' 260 L'+(leftX-4)+' 290 Q'+(leftX-15)+' 295 '+(leftX-21)+' 283Z" fill="'+(tier?pal.base:skin)+'" stroke="#111820" stroke-width="2"/>'+
    '<path d="M'+(rightX+16)+' 258 Q'+(rightX+7)+' 251 '+(rightX-2)+' 260 L'+(rightX+4)+' 290 Q'+(rightX+15)+' 295 '+(rightX+21)+' 283Z" fill="'+(tier?pal.base:skin)+'" stroke="#111820" stroke-width="2"/>'+
    (hands?itemRune(hands,'Hands',pal,leftX-9,272,.48)+itemRune(hands,'Hands',pal,rightX+9,272,.48):'')+
    '</g>';
}
function paperChest(c,highlighted){
  var item=itemForSlot(c,'Chest');
  var p=bodyProfile(c.race||c.appearance?.race||'Veyren'),s=p.shoulder,w=p.waist,top=138,bottom=250;
  if(!item)return '<g class="cb-paper-underlayer cb-paper-empty-chest"><path d="M'+(120-s+5)+' '+(top+4)+' Q120 '+(top-6)+' '+(120+s-5)+' '+(top+4)+' L'+(120+w-2)+' '+bottom+' Q120 '+(bottom+10)+' '+(120-w+2)+' '+bottom+'Z" fill="#1b2529" stroke="#111820" stroke-width="2.4"/><path d="M120 151 L120 238" stroke="#354248" stroke-width="1.4" opacity=".48"/></g>';
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier||1,'Chest');
  var klass=paperClass(c),heavy=['Warrior','Paladin'].includes(klass),cloth=['Mage','Priest','Druid'].includes(klass),v=pal.variant;
  var base=pal.base;
  var torso='<path d="M'+(120-s)+' '+top+' Q120 '+(top-11)+' '+(120+s)+' '+top+' L'+(120+w)+' '+bottom+' Q120 '+(bottom+13)+' '+(120-w)+' '+bottom+'Z" fill="'+base+'" stroke="#111820" stroke-width="3"/>';
  if(heavy){
    torso+='<path d="M'+(120-s+6)+' 153 L120 '+(v%2?171:179)+' L'+(120+s-6)+' 153 L'+(120+w-2)+' 225 L120 243 L'+(120-w+2)+' 225Z" fill="'+pal.dark+'" opacity=".56"/>';
    torso+='<path d="M120 146 L120 238 M'+(120-s+12)+' '+(v%2?188:179)+' L'+(120+s-12)+' '+(v%2?188:179)+'" stroke="'+pal.trim+'" stroke-width="'+(tier>=3?3:2)+'" opacity=".82"/>';
  }else if(cloth){
    torso+='<path d="M'+(120-s+8)+' 155 Q120 '+(v%2?170:181)+' '+(120+s-8)+' 155 M95 '+(v%2?219:211)+' Q120 '+(v%2?232:226)+' 145 '+(v%2?219:211)+'" fill="none" stroke="'+pal.trim+'" stroke-width="'+(tier>=3?3:2)+'" opacity=".74"/>';
    torso+='<path d="M120 154 L120 237" stroke="'+pal.light+'" stroke-width="2" opacity=".35"/>';
  }else{
    torso+='<path d="M'+(120-s+7)+' 166 Q120 '+(v%2?177:184)+' '+(120+s-7)+' 166 M94 222 L146 222" fill="none" stroke="'+pal.trim+'" stroke-width="2.5" opacity=".72"/>';
  }
  if(item)torso+=itemRune(item,'Chest',pal,120,186,pal.set?.motif?1.05:.8);
  if(pal.set){
    torso+='<path d="M100 202 Q120 218 140 202" fill="none" stroke="'+pal.glow+'" stroke-width="2.4" opacity=".7" class="cb-paper-set-glow"/>';
    torso+='<path d="M102 234 L120 243 L138 234" fill="none" stroke="'+pal.trim+'" stroke-width="2.2"/>';
  }else if(tier>=4)torso+='<circle cx="120" cy="181" r="2.7" fill="'+pal.glow+'" class="cb-paper-glow"/>';
  return '<g class="'+paperSlotClass('Chest',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Chest'))+'">'+torso+'</g>';
}
function paperWaist(c,highlighted){
  var item=itemForSlot(c,'Waist');if(!item)return'';
  var tier=clampTier(item.tier),pal=gearPalette(c,item,tier,'Waist'),v=pal.variant;
  return '<g class="'+paperSlotClass('Waist',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Waist'))+'">'+
    '<path d="M91 238 Q120 '+(v%2?246:242)+' 149 238 L149 254 Q120 263 91 254Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.4"/>'+
    '<rect x="'+(v%2?113:111)+'" y="242" width="'+(v%2?14:18)+'" height="12" rx="2" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2"/>'+
    itemRune(item,'Waist',pal,120,248,.45)+
    '</g>';
}
function paperShoulders(c,highlighted){
  var item=itemForSlot(c,'Shoulders'),tier=clampTier(item&&item.tier);
  if(!item)return'';
  var pal=gearPalette(c,item,tier,'Shoulders'),p=bodyProfile(c.race||c.appearance?.race||'Veyren'),s=p.shoulder,v=pal.variant;
  var extent=pal.set?22:tier>=4?18:tier>=3?14:10;
  var left=pal.set&&v%2
    ?'<path d="M'+(120-s-4)+' 145 L'+(120-s-extent-3)+' 139 L'+(120-s-extent)+' 159 L'+(120-s+7)+' 170 L'+(120-s+15)+' 148Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.7"/>'
    :'<path d="M'+(120-s-4)+' 146 Q'+(120-s-extent)+' 141 '+(120-s-extent)+' 159 L'+(120-s+7)+' 169 L'+(120-s+14)+' 148Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.5"/>';
  var right=pal.set&&v%2
    ?'<path d="M'+(120+s+4)+' 145 L'+(120+s+extent+3)+' 139 L'+(120+s+extent)+' 159 L'+(120+s-7)+' 170 L'+(120+s-15)+' 148Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.7"/>'
    :'<path d="M'+(120+s+4)+' 146 Q'+(120+s+extent)+' 141 '+(120+s+extent)+' 159 L'+(120+s-7)+' 169 L'+(120+s-14)+' 148Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="2.5"/>';
  return '<g class="'+paperSlotClass('Shoulders',highlighted,item)+'" data-item-key="'+esc(itemIdentity(item,'Shoulders'))+'">'+left+right+
    itemRune(item,'Shoulders',pal,120-s-3,154,.55)+itemRune(item,'Shoulders',pal,120+s+3,154,.55)+
    (pal.set?'<path d="M'+(120-s-18)+' 145 L'+(120-s-25)+' 132 M'+(120+s+18)+' 145 L'+(120+s+25)+' 132" stroke="'+pal.glow+'" stroke-width="3" opacity=".7" class="cb-paper-set-glow"/>':'')+
    '</g>';
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
  var uid='ill'+hash((c.id||c.name||race)+'|'+JSON.stringify(a)+'|'+illustratedSignature(c)).toString(36);
  var neck='<path d="M108 110 L108 143 Q120 151 132 143 L132 110Z" fill="'+skin+'" stroke="#11171b" stroke-width="2.7"/>';
  var under='<path d="M91 237 Q120 250 149 237 L151 269 Q120 281 89 269Z" fill="#172126" stroke="#0b1013" stroke-width="3"/>';
  var headScale=profile.headScale||1,headX=70+(50*(1-headScale)),headY=20+(50*(1-headScale));
  var body=
    paperTierAura(c)+
    paperLegs(c,skin,highlighted)+paperFeet(c,skin,highlighted)+
    paperWeapon(c,highlighted)+paperOffHand(c,highlighted)+
    paperArms(c,skin,highlighted)+under+paperChest(c,highlighted)+paperWaist(c,highlighted)+paperShoulders(c,highlighted)+paperAccessories(c,highlighted)+
    neck+
    '<g transform="translate('+headX+' '+headY+') scale('+headScale+')">'+paperHeadMarkup(c,a,skin,eye,hair,highlighted)+'</g>';
  return '<svg viewBox="0 0 240 420" role="img" aria-hidden="true" focusable="false" class="cb-illustrated-character-svg" data-race="'+esc(a.race)+'" data-class="'+esc(paperClass(c))+'">'+
    '<defs>'+
      '<filter id="'+uid+'ink" x="-18%" y="-12%" width="136%" height="132%">'+
        '<feTurbulence type="fractalNoise" baseFrequency=".013 .021" numOctaves="2" seed="'+(hash(uid)%97)+'" result="paper"/>'+
        '<feDisplacementMap in="SourceGraphic" in2="paper" scale=".42" xChannelSelector="R" yChannelSelector="G" result="inked"/>'+
        '<feDropShadow dx="0" dy="2.4" stdDeviation="1.9" flood-color="#050709" flood-opacity=".52"/>'+
      '</filter>'+
      '<linearGradient id="'+uid+'light" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".42" stop-color="#fff" stop-opacity=".025"/><stop offset="1" stop-color="#000" stop-opacity=".13"/></linearGradient>'+
    '</defs>'+
    '<ellipse cx="120" cy="400" rx="67" ry="8" fill="#000" opacity=".28"/>'+
    '<g filter="url(#'+uid+'ink)">'+body+'</g>'+
    '<path d="M68 93 Q120 47 172 93 L165 305 Q120 346 75 305Z" fill="url(#'+uid+'light)" opacity=".16" pointer-events="none"/>'+
    '</svg>';
}

/* World Avatar V1.
   A higher-detail, inked full-body representation for Living World scenes.
   It consumes the same saved appearance and equipment data as the paper doll,
   but deliberately uses stronger silhouettes, textured shadow and tier families.
   Prototype archetypes: Warrior, Priest and Rogue. */
const WORLD_AVATAR_CLASSES=new Set(['Warrior','Priest','Rogue']);
function worldAvatarTier(c){
  return PAPER_VISIBLE_SLOTS.reduce(function(max,slot){
    var item=itemForSlot(c,slot);return Math.max(max,clampTier(item&&item.tier));
  },1);
}
function worldAvatarWeapon(c){
  var item=itemForSlot(c,'Weapon');
  return item?weaponType(item,c):CLASS_WEAPON_DEFAULT[paperClass(c)]||'sword';
}
function worldAvatarHead(c,a,skin,eye,hair,pal,tier,klass){
  var face=facePath(a.face),out=
    '<g class="cb-world-head">'+raceFeatureMarkup(a,a.race)+earsMarkup(a.race,skin,a.feature)+
    '<path d="'+face+'" fill="'+skin+'" stroke="#0b0d0e" stroke-width="3.2"/>'+
    '<path d="'+face+'" fill="url(#cbw-face-light)" opacity=".22"/>'+
    hairMarkup(a,hair)+
    '<path d="M37 47 Q42 43 46 47 M54 47 Q59 43 63 47" fill="none" stroke="#161315" stroke-width="2.6" stroke-linecap="round"/>'+
    '<ellipse cx="42" cy="52" rx="2.6" ry="3.2" fill="'+eye+'"/><ellipse cx="58" cy="52" rx="2.6" ry="3.2" fill="'+eye+'"/>'+
    '<path d="M50 54 L47 64 Q50 66 53 64" fill="none" stroke="#3a2927" stroke-width="1.8" stroke-linecap="round"/>'+
    '<path d="M42 70 Q50 74 58 69" fill="none" stroke="#3a2025" stroke-width="2.2" stroke-linecap="round"/>'+
    markingMarkup(a,a.race)+beardMarkup(a,hair);
  if(klass==='Warrior'&&tier>=2){
    out+='<path d="M27 42 Q28 17 50 14 Q72 17 73 42 L67 36 L50 29 L33 36Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="3"/>'+
      (tier>=4?'<path d="M31 28 L24 13 L40 23 M69 28 L76 13 L60 23" fill="'+pal.trim+'" opacity=".8"/>':'');
  }else if(klass==='Priest'){
    out+=(tier>=2?'<path d="M29 42 Q31 20 50 18 Q69 20 71 42 Q61 32 50 32 Q39 32 29 42Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.5"/>':'')+
      (tier>=4?'<ellipse cx="50" cy="13" rx="16" ry="5" fill="none" stroke="'+pal.glow+'" stroke-width="2.4" opacity=".85"/>':'');
  }else if(klass==='Rogue'&&tier>=2){
    out+='<path d="M28 43 Q30 18 50 17 Q70 18 72 43 L65 57 L59 45 L50 37 L41 45 L35 57Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="2.8"/>'+
      (tier>=4?'<path d="M37 43 L43 52 M63 43 L57 52" stroke="'+pal.glow+'" stroke-width="2" opacity=".7"/>':'');
  }
  return out+'</g>';
}
function worldAvatarBody(klass,pal,tier,set){
  var glow=set&&set.visual?set.visual.glow:pal.glow;
  if(klass==='Warrior'){
    return '<g class="cb-world-body cb-world-warrior">'+
      '<path d="M73 139 Q120 111 167 139 L156 250 Q120 269 84 250Z" fill="'+pal.base+'" stroke="#090c0e" stroke-width="5"/>'+
      '<path d="M83 151 L120 171 L157 151 L150 225 L120 241 L90 225Z" fill="'+pal.dark+'" opacity=".82"/>'+
      '<path d="M69 141 L42 150 L50 185 L82 174Z M171 141 L198 150 L190 185 L158 174Z" fill="'+pal.base+'" stroke="'+pal.trim+'" stroke-width="4"/>'+
      '<path d="M120 142 L120 237 M83 190 L157 190" stroke="'+pal.trim+'" stroke-width="'+(tier>=4?4:3)+'" opacity=".78"/>'+
      (tier>=3?'<path d="M94 207 L120 222 L146 207" fill="none" stroke="'+pal.light+'" stroke-width="3"/>':'')+
      (tier>=4?'<circle cx="120" cy="181" r="7" fill="'+glow+'" opacity=".62"/>':'')+
      '<path d="M87 247 L113 248 L108 365 L72 365 Q73 324 80 286Z M127 248 L153 247 L168 365 L132 365 L127 286Z" fill="'+pal.dark+'" stroke="#090c0e" stroke-width="5"/>'+
      '<path d="M70 359 L109 359 L111 399 L57 399 Q57 383 69 374Z M131 359 L170 359 L183 399 L129 399 L129 374Z" fill="#17191b" stroke="'+pal.trim+'" stroke-width="3"/>'+
      '</g>';
  }
  if(klass==='Priest'){
    return '<g class="cb-world-body cb-world-priest">'+
      '<path d="M82 137 Q120 116 158 137 L168 267 L188 380 Q120 412 52 380 L72 267Z" fill="'+pal.base+'" stroke="#090c0e" stroke-width="4.5"/>'+
      '<path d="M92 145 Q120 169 148 145 M81 216 Q120 238 159 216" fill="none" stroke="'+pal.trim+'" stroke-width="3.5" opacity=".9"/>'+
      '<path d="M104 139 L120 176 L136 139" fill="'+pal.light+'" opacity=".46"/>'+
      '<path d="M65 151 L42 177 L62 207 L85 181Z M175 151 L198 177 L178 207 L155 181Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="3"/>'+
      (tier>=3?'<path d="M120 178 L120 347 M84 327 Q120 350 156 327" stroke="'+pal.light+'" stroke-width="2.6" opacity=".55"/>':'')+
      (tier>=4?'<circle cx="120" cy="198" r="8" fill="'+glow+'" opacity=".5"/><circle cx="120" cy="198" r="15" fill="none" stroke="'+glow+'" stroke-width="2" opacity=".45"/>':'')+
      '<path d="M71 374 L110 374 L108 402 L58 402Z M130 374 L169 374 L182 402 L132 402Z" fill="#15191c" stroke="'+pal.trim+'" stroke-width="2.5"/>'+
      '</g>';
  }
  return '<g class="cb-world-body cb-world-rogue">'+
    '<path d="M84 140 Q120 119 156 140 L149 249 Q120 262 91 249Z" fill="'+pal.base+'" stroke="#080b0d" stroke-width="4.5"/>'+
    '<path d="M93 145 L120 169 L147 145 L141 226 L120 242 L99 226Z" fill="'+pal.dark+'" opacity=".88"/>'+
    '<path d="M77 149 L54 169 L68 195 L92 177Z M163 149 L186 169 L172 195 L148 177Z" fill="'+pal.dark+'" stroke="'+pal.trim+'" stroke-width="3"/>'+
    '<path d="M93 188 L147 188 M101 215 L139 215" stroke="'+pal.trim+'" stroke-width="2.6" opacity=".72"/>'+
    (tier>=3?'<path d="M83 226 L120 245 L157 226" fill="none" stroke="'+pal.light+'" stroke-width="2.5"/>':'')+
    (tier>=4?'<path d="M107 171 L120 183 L133 171" fill="none" stroke="'+glow+'" stroke-width="2.5" opacity=".7"/>':'')+
    '<path d="M92 246 L115 247 L107 363 L78 363 Q78 322 85 285Z M125 247 L148 246 L162 363 L133 363 L126 285Z" fill="'+pal.dark+'" stroke="#080b0d" stroke-width="4"/>'+
    '<path d="M76 357 L108 357 L108 399 L62 399 Q61 383 75 374Z M132 357 L164 357 L178 399 L132 399 L132 374Z" fill="#111518" stroke="'+pal.trim+'" stroke-width="2.5"/>'+
    '</g>';
}
function worldAvatarSVG(c,opts){
  opts=opts||{};
  // World actors now use the exact same illustrated model renderer as Character Creation.
  return creatorFigureSVG(c||{});
}
function characterModelHTML(subject,opts){
  // Canonical playable-character model. Creation, Town and Inn all resolve here.
  return creatorFigureHTML(subject||{},opts||{});
}
function worldAvatarHTML(subject,opts){
  opts=opts||{};
  var c=subject||{},klass=paperClass(c);
  var race=c.race||(c.appearance&&c.appearance.race)||'Veyren';
  var a=normalizeAppearance(c.appearance||c,c.id||c.name||race,race);
  var label=opts.label||((c.name||'Character')+' world appearance');
  var tier=worldAvatarTier(c),weapon=worldAvatarWeapon(c),signature=illustratedSignature(c);
  var appearanceKey=hash(JSON.stringify(a)).toString(36);
  return '<span class="cb-world-avatar cb-world-avatar-illustrated cb-world-avatar--'+esc(klass.toLowerCase().replace(/[^a-z0-9]+/g,'-'))+'" role="img" aria-label="'+esc(label)+'" data-world-avatar="'+esc(klass)+'" data-avatar-class="'+esc(klass)+'" data-avatar-tier="'+tier+'" data-avatar-weapon="'+esc(weapon)+'" data-avatar-race="'+esc(a.race)+'" data-appearance-key="'+appearanceKey+'" data-model-signature="'+signature+'">'+creatorFigureSVG({...c,appearance:a})+'</span>';
}

function paperDollHTML(subject,opts){
  opts=opts||{};
  var c=subject||{},size=opts.size||'equipment';
  var label=opts.label||((c.name||'Character')+' class appearance');
  var race=c.race||(c.appearance&&c.appearance.race)||'Veyren';
  var a=normalizeAppearance(c.appearance||c,c.id||c.name||race,race);
  var cls='cb-paper-doll cb-paper-doll-illustrated cb-paper-doll-class-v2 cb-paper-doll--'+esc(size);
  // Deliberately ignore equipped item visuals for this phase. The same class
  // silhouette is used in Creation, Town, Inn and the Character screen.
  return '<span class="'+cls+'" role="img" aria-label="'+esc(label)+'" data-illustrated-race="'+esc(a.race)+'" data-model-phase="class-outfit" data-model-signature="'+illustratedSignature(c)+'">'+creatorFigureSVG({...c,appearance:a})+'</span>';
}
function visualProfile(subject,item,slot){
  var c=subject||{},s=slot||item?.slot||'Gear',tier=clampTier(item?.tier),pal=gearPalette(c,item,tier||1,s);
  return {key:itemIdentity(item,s),slot:s,tier:tier,variant:pal.variant,isSet:isSetItem(item),weaponType:s==='Weapon'?weaponType(item,c):null,offHandType:s==='OffHand'?offHandType(item,c):null,palette:pal};
}

window.CellboundPortraits={
  version:22,RACES:RACES,COUNTS:COUNTS,CLASS_COLORS:CLASS_COLORS,
  normalizeAppearance:normalizeAppearance,randomAppearance:randomAppearance,
  PAINTED_BODY_STANDARD:PAINTED_BODY_STANDARD,usesIllustratedBody:usesIllustratedBody,usesPaintedBody:usesPaintedBody,illustratedSignature:illustratedSignature,
  applyToCharacter:applyToCharacter,portraitHTML:portraitHTML,characterModelHTML:characterModelHTML,worldAvatarHTML:worldAvatarHTML,worldAvatarSVG:worldAvatarSVG,paperDollHTML:paperDollHTML,paperDollSVG:paperDollSVG,
  visualProfile:visualProfile,weaponType:weaponType,offHandType:offHandType,
  creatorFigureHTML:creatorFigureHTML,creatorFigureSVG:creatorFigureSVG,
  editorHTML:editorHTML,bindEditor:bindEditor
};
})();