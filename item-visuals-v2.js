(function(){
'use strict';

/*
 * Cellbound Forge Item Models V3
 * ------------------------------
 * Equipment is rendered as clean vector artwork designed for the
 * Character Forge bases: bold ink, simple faceted shading and readable
 * silhouettes. Inventory icons and worn equipment share the same renderer.
 *
 * The illustrated-v2 bitmap atlases remain available as a fallback for
 * materials, consumables, recipes and collection rewards.
 */
const A=window.CellboundItemAtlases;
if(!A)throw new Error('Illustrated item atlas must load before item visuals');

const VERSION=3;
const ART_DIRECTION='forge-vector-v1';
const families={
  Warrior:'warrior',Paladin:'paladin',Hunter:'hunter',Rogue:'rogue',Mage:'mage',
  Priest:'mage',Warlock:'mage',Druid:'hunter',Shaman:'hunter',Monk:'rogue',
  Evoker:'mage','Death Knight':'warrior','Demon Hunter':'rogue'
};
const CLASS_COLOURS={
  Warrior:'#C69B6D',Paladin:'#F48CBA',Priest:'#FFFFFF',Druid:'#FF7C0A',
  Hunter:'#AAD372',Rogue:'#FFF468',Mage:'#3FC7EB',Shaman:'#0070DD',
  Warlock:'#8788EE',Monk:'#00FF98','Death Knight':'#C41E3A',
  'Demon Hunter':'#A330C9',Evoker:'#33937F'
};
const FAMILY_BASE={
  warrior:'#59636c',paladin:'#d8c79e',hunter:'#52654b',rogue:'#393846',mage:'#435a8c'
};
const FAMILY_DARK={
  warrior:'#303940',paladin:'#746448',hunter:'#2d3b2e',rogue:'#22222c',mage:'#28345c'
};
const armour=['Chest','Shoulders','Hands','Waist','Legs','Feet'];
const weapons={
  sword:['weapons',0],greatsword:['weapons',0],axe:['weapons',1],hammer:['weapons',2],
  mace:['weapons',2],dagger:['weapons',3],bow:['weapons',4],staff:['weapons',5],
  crossbow:['secondary',0],spear:['secondary',1],wand:['secondary',2],scepter:['secondary',2],
  rod:['secondary',2],shield:['secondary',3],tome:['secondary',4],quiver:['secondary',5],
  focus:['accessories',2],idol:['accessories',2]
};
const PAIRED=new Set(['Shoulders','Hands','Feet']);

const escape=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>String(s||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function hash(v){let n=2166136261;for(const c of String(v||'cellbound')){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0}
function clamp(n,a,b){return Math.max(a,Math.min(b,Number(n)||0))}
function hexRgb(hex){const s=String(hex||'#777').replace('#','');const v=s.length===3?s.split('').map(x=>x+x).join(''):s,n=parseInt(v,16);return Number.isFinite(n)?[(n>>16)&255,(n>>8)&255,n&255]:[119,119,119]}
function rgbHex(v){return '#'+v.map(x=>clamp(Math.round(x),0,255).toString(16).padStart(2,'0')).join('')}
function mix(a,b,t){const aa=hexRgb(a),bb=hexRgb(b),p=clamp(t,0,1);return rgbHex(aa.map((v,i)=>v+(bb[i]-v)*p))}
function identity(item){return String(item?.appearanceId||item?.visualStyle||item?.baseItemId||item?.itemId||item?.key||item?.id||item?.name||'cellbound-item')}
function itemClass(item){return String(item?.class||((Array.isArray(item?.classes)&&item.classes.length===1)?item.classes[0]:'')||'')}
function tier(item){return Math.max(1,Math.min(5,Math.floor(Number(item?.tier)||({Common:1,Uncommon:2,Rare:3,Epic:4,Legendary:5}[item?.rarity]||1))))}
function type(item,slot){
  const explicit=slot==='OffHand'?item?.offHandType:item?.weaponType;if(explicit)return String(explicit).toLowerCase();
  const n=[item?.name,item?.itemId,item?.key].join(' ').toLowerCase();
  for(const [pattern,value] of [[/crossbow/,'crossbow'],[/greatsword|greatblade|claymore/,'greatsword'],[/spear|pike|glaive|halberd|lance/,'spear'],[/bow/,'bow'],[/axe|cleaver|hatchet/,'axe'],[/hammer|maul|mace/,'hammer'],[/dagger|knife|shiv|stiletto/,'dagger'],[/wand|scept|rod/,'wand'],[/staff|stave|branch/,'staff'],[/shield|bulwark|buckler|aegis/,'shield'],[/quiver/,'quiver'],[/tome|book|scripture|grimoire/,'tome'],[/focus|orb|crystal|idol|totem/,'focus']])if(pattern.test(n))return value;
  return slot==='OffHand'?'focus':'sword';
}
function entry(atlas,row,col){
  const a=A[atlas],cell=a.cells[row*a.cols+col];
  return {mode:'atlas',atlas,src:a.src,width:a.width,height:a.height,...cell,key:atlas+'-'+row+'-'+col};
}
function palette(item){
  const klass=itemClass(item),family=families[klass]||'warrior',t=tier(item),accent=CLASS_COLOURS[klass]||'#76d7d0';
  const base=mix(FAMILY_BASE[family],accent,family==='paladin'?.15:family==='mage'?.18:.10);
  const dark=FAMILY_DARK[family];
  const tierTrim=['#70685e','#aa8256','#8fbfe8','#b88cff','#efc869'][t-1];
  return {
    family,klass,tier:t,
    base,dark,
    light:mix(base,'#ffffff',.27),
    shadow:mix(base,'#111018',.43),
    accent,
    trim:mix(tierTrim,accent,t>=4?.14:.05),
    glow:t>=4?mix(accent,'#ffffff',.28):mix(accent,'#ffffff',.08),
    ink:'#171118'
  };
}
function vectorAsset(item,slot){
  const clean=String(slot||item?.slot||'').replace(/[12]$/,''),p=palette(item),id=identity(item),variant=hash(id+'|'+p.klass+'|'+clean)%4;
  return {
    mode:'forge-vector',artDirection:ART_DIRECTION,
    key:'forge-'+slug(p.family)+'-'+slug(p.klass||'all')+'-'+slug(id)+'-'+slug(clean)+'-t'+p.tier,
    rect:[0,0,100,100],
    pair:PAIRED.has(clean)?[[0,0,100,100],[0,0,100,100]]:null,
    slot:clean,tier:p.tier,class:p.klass,family:p.family,variant,palette:p,
    itemType:(clean==='Weapon'||clean==='OffHand')?type(item,clean):null
  };
}
function atlasResolve(item,slot){
  item=item||{};slot=String(slot||item.slot||'').replace(/[12]$/,'');const t=tier(item)-1,klass=itemClass(item),family=families[klass]||'warrior';
  if(armour.includes(slot))return entry(family,t,armour.indexOf(slot));
  if(slot==='Head')return entry('heads',t,['warrior','paladin','hunter','rogue','mage'].indexOf(family));
  if(slot==='Weapon'||slot==='OffHand'){const v=weapons[type(item,slot)]||weapons.focus;return entry(v[0],t,v[1])}
  if(['Ring','Trinket','Relic'].includes(slot))return entry('accessories',t,['Ring','Trinket','Relic'].indexOf(slot));
  const n=[item.name,item.itemId,item.key,item.category].join(' ').toLowerCase(),effect=item.payload?.effect||item.effect,attachmentFamily=item.payload?.attachmentFamily||item.attachmentFamily;
  if(effect==='socket-gem'||attachmentFamily==='relic-core')return entry('accessories',t,2);
  if(effect==='character-gadget')return entry('resources',4,5);
  if(effect==='party-food')return entry('resources',4,0);
  if(effect==='party-scroll'||/scroll|recipe|schematic|pattern|notes/.test(n))return entry('accessories',t,5);
  if(/mana|ether|elixir/.test(n))return entry('accessories',t,4);
  if(/potion|heal|flask/.test(n))return entry('accessories',t,3);
  const resources=[[/copper/,1],[/gold.*ore/,2],[/ingot|bar\b|steel/,3],[/crystal|quartz|gem|shard/,4],[/stone|rock/,5],[/silk|weave/,7],[/cloth|linen|cotton/,6],[/hide|pelt|fur/,8],[/leather/,9],[/thread|spool/,10],[/feather/,11],[/flower|bloom|petal/,13],[/root/,14],[/mushroom|fung/,15],[/wood|timber|bark/,16],[/wheat|grain/,17],[/herb|leaf|moss/,12],[/fang|tooth|claw/,18],[/horn/,19],[/bone/,20],[/scale/,21],[/dust|soul|essence|fragment/,22],[/ember|cinder|fire/,23],[/meat|steak|feast|food|ration/,24],[/bread/,25],[/fish/,26],[/tonic|venom|oil/,27],[/rune|sigil|ward/,28],[/gear|cog|module|gadget|drone/,29],[/key/,30],[/coin|gold|currency/,31],[/token|medal|mark|badge/,32],[/letter|quest|seal/,33],[/chest|cache|crate|reward/,34],[/orb|core|arcane|relic/,35],[/ore|iron|metal/,0]];
  const i=resources.find(([re])=>re.test(n))?.[1]??34;return entry('resources',Math.floor(i/6),i%6);
}
function resolve(item,slot){
  item=item||{};const clean=String(slot||item.slot||'').replace(/[12]$/,'');
  if(clean&&['Head','Chest','Shoulders','Hands','Waist','Legs','Feet','Weapon','OffHand','Ring','Trinket','Relic'].includes(clean))return vectorAsset(item,clean);
  return atlasResolve(item,clean);
}
function motif(a,x=50,y=50,s=1){
  const p=a.palette,v=a.variant,t=a.tier;
  if(t<2)return '';
  const common='fill="none" stroke="'+p.trim+'" stroke-width="'+(2.4*s)+'" stroke-linecap="round" stroke-linejoin="round" opacity="'+(t>=4?.94:.72)+'"';
  if(v===0)return '<path d="M'+(x-10*s)+' '+y+' L'+x+' '+(y-9*s)+' L'+(x+10*s)+' '+y+' L'+x+' '+(y+9*s)+'Z" '+common+'/>';
  if(v===1)return '<path d="M'+(x-11*s)+' '+(y-7*s)+' L'+x+' '+(y+7*s)+' L'+(x+11*s)+' '+(y-7*s)+'" '+common+'/>';
  if(v===2)return '<path d="M'+(x-11*s)+' '+(y+5*s)+' Q'+x+' '+(y-10*s)+' '+(x+11*s)+' '+(y+5*s)+'" '+common+'/>';
  return '<path d="M'+(x-10*s)+' '+(y-6*s)+' L'+(x+10*s)+' '+(y+6*s)+' M'+(x-10*s)+' '+(y+6*s)+' L'+(x+10*s)+' '+(y-6*s)+'" '+common+'/>';
}
function tierDetail(a){
  const p=a.palette,t=a.tier;
  if(t<3)return '';
  let out='<circle cx="50" cy="50" r="'+(t===3?3.5:4.5)+'" fill="'+p.glow+'" opacity="'+(t===5?.95:.72)+'"/>';
  if(t>=4)out+='<path d="M50 38 V31 M50 69 V62 M38 50 H31 M69 50 H62" stroke="'+p.glow+'" stroke-width="2" opacity=".75"/>';
  if(t>=5)out+='<path d="M41 35 L50 25 L59 35 M41 65 L50 75 L59 65" fill="none" stroke="'+p.trim+'" stroke-width="2.4" opacity=".9"/>';
  return out;
}
function familyChest(a){
  const p=a.palette,f=a.family,ink=p.ink;
  if(f==='paladin')return '<path d="M18 20 L34 9 H66 L82 20 L75 88 L50 96 L25 88Z" fill="'+p.base+'" stroke="'+ink+'" stroke-width="5" stroke-linejoin="round"/><path d="M34 10 L50 28 L66 10 L73 53 L50 79 L27 53Z" fill="'+p.light+'" opacity=".45"/><path d="M50 29 V82 M29 53 H71" stroke="'+p.trim+'" stroke-width="3.2"/>';
  if(f==='hunter')return '<path d="M17 22 L35 10 L49 18 L65 10 L83 22 L72 90 H28Z" fill="'+p.base+'" stroke="'+ink+'" stroke-width="5" stroke-linejoin="round"/><path d="M23 31 L68 83 M77 29 L34 86" stroke="'+p.dark+'" stroke-width="8" opacity=".75"/><path d="M21 29 L69 84 M79 27 L35 88" stroke="'+p.trim+'" stroke-width="2.5"/>';
  if(f==='rogue')return '<path d="M20 19 L38 9 L50 18 L62 9 L80 19 L71 91 H29Z" fill="'+p.dark+'" stroke="'+ink+'" stroke-width="5" stroke-linejoin="round"/><path d="M30 18 L69 80 M70 18 L31 80" stroke="'+p.base+'" stroke-width="9"/><path d="M33 21 L66 76 M67 21 L34 76" stroke="'+p.trim+'" stroke-width="2.2"/>';
  if(f==='mage')return '<path d="M24 15 L40 8 L50 21 L60 8 L76 15 L71 91 L50 98 L29 91Z" fill="'+p.base+'" stroke="'+ink+'" stroke-width="5" stroke-linejoin="round"/><path d="M40 10 L50 28 L60 10 M50 28 V90" fill="none" stroke="'+p.trim+'" stroke-width="3"/><path d="M29 72 Q50 84 71 72" fill="none" stroke="'+p.light+'" stroke-width="4" opacity=".7"/>';
  return '<path d="M15 22 L34 9 H66 L85 22 L75 89 L50 96 L25 89Z" fill="'+p.base+'" stroke="'+ink+'" stroke-width="5" stroke-linejoin="round"/><path d="M20 27 L50 44 L80 27 L72 59 L50 75 L28 59Z" fill="'+p.dark+'" opacity=".72"/><path d="M50 18 V84 M25 49 H75" stroke="'+p.trim+'" stroke-width="3"/>';
}
function vectorMarkup(a,part){
  const p=a.palette,ink=p.ink,slot=a.slot,t=a.tier,flip=part===1;
  let body='';
  if(slot==='Chest')body=familyChest(a)+motif(a,50,57,.9);
  else if(slot==='Shoulders'){
    const shape=a.family==='mage'
      ?'<path d="M10 62 Q18 24 50 18 Q79 24 90 58 L76 79 L55 67 L35 78Z" fill="'+p.base+'" stroke="'+ink+'" stroke-width="6"/>'
      :a.family==='rogue'
      ?'<path d="M13 66 L28 28 L58 19 L88 38 L77 72 L48 64 L29 83Z" fill="'+p.dark+'" stroke="'+ink+'" stroke-width="6"/>'
      :'<path d="M9 64 Q17 28 51 18 Q83 28 91 59 L80 77 L55 67 L30 81Z" fill="'+p.base+'" stroke="'+ink+'" stroke-width="6"/>';
    body=shape+'<path d="M25 55 Q49 36 76 52" fill="none" stroke="'+p.light+'" stroke-width="5" opacity=".45"/>'+motif(a,52,53,.7);
  }else if(slot==='Hands'){
    body='<path d="M24 18 L72 16 L82 42 L72 87 L47 95 L26 78 L18 44Z" fill="'+(a.family==='rogue'?p.dark:p.base)+'" stroke="'+ink+'" stroke-width="6" stroke-linejoin="round"/><path d="M26 40 H75 M29 58 L69 65" stroke="'+p.trim+'" stroke-width="3"/>'+motif(a,51,42,.55);
  }else if(slot==='Waist'){
    body='<path d="M5 31 Q50 20 95 31 L92 69 Q50 80 8 69Z" fill="'+p.dark+'" stroke="'+ink+'" stroke-width="6"/><path d="M9 40 Q50 31 91 40" fill="none" stroke="'+p.base+'" stroke-width="10"/><path d="M42 31 H58 V69 H42Z" fill="'+p.trim+'" stroke="'+ink+'" stroke-width="3"/>'+motif(a,50,50,.48);
  }else if(slot==='Legs'){
    const cloth=a.family==='mage';
    body=(cloth?'<path d="M22 8 H78 L87 58 L67 95 L51 66 L33 95 L13 58Z" fill="'+p.base+'" stroke="'+ink+'" stroke-width="6" stroke-linejoin="round"/><path d="M50 14 V68" stroke="'+p.trim+'" stroke-width="3"/>':
      '<path d="M18 8 H47 L51 48 L42 94 H16 L12 51Z M53 8 H82 L88 51 L84 94 H58 L49 48Z" fill="'+p.base+'" stroke="'+ink+'" stroke-width="6" stroke-linejoin="round"/><path d="M18 52 H43 M57 52 H83" stroke="'+p.trim+'" stroke-width="3"/>')+motif(a,50,36,.72);
  }else if(slot==='Feet'){
    body='<path d="M23 10 H72 L77 55 L91 72 L84 91 H25 L15 77 L24 55Z" fill="'+p.dark+'" stroke="'+ink+'" stroke-width="6" stroke-linejoin="round"/><path d="M26 19 H70 L72 57 H25Z" fill="'+p.base+'" stroke="'+p.trim+'" stroke-width="3"/><path d="M26 66 H79" stroke="'+p.light+'" stroke-width="3" opacity=".55"/>'+motif(a,50,42,.52);
  }else if(slot==='Head'){
    if(a.family==='mage')body='<path d="M18 70 Q20 18 50 12 Q80 18 82 70 L70 89 L62 67 Q50 55 38 67 L30 89Z" fill="'+p.base+'" stroke="'+ink+'" stroke-width="6"/><path d="M28 45 Q50 26 72 45" fill="none" stroke="'+p.trim+'" stroke-width="4"/>';
    else if(a.family==='hunter')body='<path d="M16 72 Q18 20 50 13 Q82 20 84 72 L69 91 L62 66 Q50 56 38 66 L31 91Z" fill="'+p.dark+'" stroke="'+ink+'" stroke-width="6"/><path d="M25 47 Q50 29 75 47" fill="none" stroke="'+p.trim+'" stroke-width="4"/>';
    else if(a.family==='rogue')body='<path d="M15 71 Q18 19 50 12 Q82 19 85 71 L71 91 L62 68 Q50 58 38 68 L29 91Z" fill="'+p.dark+'" stroke="'+ink+'" stroke-width="6"/><path d="M29 50 Q50 38 71 50" stroke="'+p.trim+'" stroke-width="4" fill="none"/>';
    else if(a.family==='paladin')body='<path d="M17 72 Q19 18 50 12 Q81 18 83 72 L70 86 Q50 73 30 86Z" fill="'+p.light+'" stroke="'+ink+'" stroke-width="6"/><path d="M29 35 L38 13 L50 28 L63 11 L72 36" fill="'+p.trim+'" stroke="'+ink+'" stroke-width="3"/>';
    else body='<path d="M14 72 Q17 16 50 10 Q83 16 86 72 L72 87 Q50 74 28 87Z" fill="'+p.base+'" stroke="'+ink+'" stroke-width="6"/><path d="M24 38 L50 21 L76 38 M50 22 V76" fill="none" stroke="'+p.trim+'" stroke-width="4"/>';
    body+=motif(a,50,48,.65);
  }else if(slot==='Weapon')body=weaponMarkup(a);
  else if(slot==='OffHand')body=offhandMarkup(a);
  else if(slot==='Ring')body='<ellipse cx="50" cy="52" rx="26" ry="33" fill="none" stroke="'+ink+'" stroke-width="12"/><ellipse cx="50" cy="52" rx="26" ry="33" fill="none" stroke="'+p.trim+'" stroke-width="6"/><path d="M39 21 L50 8 L61 21 L50 35Z" fill="'+p.glow+'" stroke="'+ink+'" stroke-width="4"/>';
  else if(slot==='Trinket')body='<path d="M50 7 L78 31 L70 78 L50 95 L30 78 L22 31Z" fill="'+p.dark+'" stroke="'+ink+'" stroke-width="6"/><path d="M50 19 L66 38 L58 70 L50 80 L42 70 L34 38Z" fill="'+p.glow+'" stroke="'+p.trim+'" stroke-width="3"/>'+motif(a,50,49,.65);
  else if(slot==='Relic')body='<path d="M50 7 L83 31 L72 81 L50 96 L28 81 L17 31Z" fill="'+p.base+'" stroke="'+ink+'" stroke-width="6"/><circle cx="50" cy="51" r="22" fill="'+p.dark+'" stroke="'+p.trim+'" stroke-width="4"/>'+motif(a,50,51,.9)+tierDetail(a);
  if(!body)body='<path d="M18 18 H82 V82 H18Z" fill="'+p.base+'" stroke="'+ink+'" stroke-width="6"/>'+motif(a);
  if(t>=4&&['Chest','Shoulders','Hands','Feet','Head'].includes(slot))body+='<path d="M18 84 Q50 95 82 84" fill="none" stroke="'+p.glow+'" stroke-width="'+(t===5?4:3)+'" opacity=".7"/>';
  return (flip?'<g transform="translate(100 0) scale(-1 1)">':'<g>')+body+'</g>';
}
function weaponMarkup(a){
  const p=a.palette,ink=p.ink,type=a.itemType||'sword';
  if(type==='bow')return '<path d="M28 7 Q82 50 28 93" fill="none" stroke="'+ink+'" stroke-width="10"/><path d="M28 7 Q76 50 28 93" fill="none" stroke="'+p.base+'" stroke-width="5"/><path d="M29 8 L29 92 M28 50 L72 50" stroke="'+p.trim+'" stroke-width="3"/>'+motif(a,31,50,.45);
  if(type==='crossbow')return '<path d="M16 31 Q50 10 84 31 L74 42 Q50 27 26 42Z" fill="'+p.base+'" stroke="'+ink+'" stroke-width="6"/><path d="M50 28 V93" stroke="'+ink+'" stroke-width="12"/><path d="M50 30 V91" stroke="'+p.trim+'" stroke-width="5"/><path d="M18 29 H82" stroke="'+p.light+'" stroke-width="2"/>';
  if(type==='staff'||type==='spear'||type==='wand'||type==='scepter'||type==='rod'){
    const spear=type==='spear',staff=type==='staff';
    return '<path d="M50 '+(spear?'15':'9')+' V95" stroke="'+ink+'" stroke-width="'+(staff?10:8)+'" stroke-linecap="round"/><path d="M50 '+(spear?'18':'12')+' V92" stroke="'+p.base+'" stroke-width="'+(staff?5:4)+'" stroke-linecap="round"/>'+
      (spear?'<path d="M50 3 L64 24 L50 38 L36 24Z" fill="'+p.light+'" stroke="'+ink+'" stroke-width="5"/>':'<circle cx="50" cy="14" r="'+(staff?15:11)+'" fill="'+p.glow+'" stroke="'+ink+'" stroke-width="5"/><path d="M39 15 L50 4 L61 15" fill="none" stroke="'+p.trim+'" stroke-width="3"/>');
  }
  if(type==='dagger')return '<path d="M50 7 L68 48 L50 68 L32 48Z" fill="'+p.light+'" stroke="'+ink+'" stroke-width="5"/><path d="M28 67 H72" stroke="'+ink+'" stroke-width="9"/><path d="M30 67 H70" stroke="'+p.trim+'" stroke-width="4"/><path d="M50 68 V94" stroke="'+ink+'" stroke-width="12"/><path d="M50 70 V92" stroke="'+p.dark+'" stroke-width="6"/>';
  if(type==='axe')return '<path d="M49 8 Q80 9 88 32 Q70 46 50 39Z" fill="'+p.light+'" stroke="'+ink+'" stroke-width="6"/><path d="M50 28 V94" stroke="'+ink+'" stroke-width="12"/><path d="M50 31 V91" stroke="'+p.dark+'" stroke-width="6"/>';
  if(type==='hammer'||type==='mace')return '<path d="M24 11 H76 L85 35 L72 50 H28 L15 35Z" fill="'+p.base+'" stroke="'+ink+'" stroke-width="6"/><path d="M50 45 V94" stroke="'+ink+'" stroke-width="13"/><path d="M50 48 V91" stroke="'+p.dark+'" stroke-width="6"/>'+motif(a,50,29,.58);
  const great=type==='greatsword';
  return '<path d="M50 3 L'+(great?69:64)+' '+(great?61:58)+' L50 '+(great?76:72)+' L'+(great?31:36)+' '+(great?61:58)+'Z" fill="'+p.light+'" stroke="'+ink+'" stroke-width="5"/><path d="M50 10 V64" stroke="'+p.trim+'" stroke-width="3"/><path d="M25 '+(great?72:69)+' H75" stroke="'+ink+'" stroke-width="10"/><path d="M28 '+(great?72:69)+' H72" stroke="'+p.trim+'" stroke-width="4"/><path d="M50 '+(great?75:72)+' V96" stroke="'+ink+'" stroke-width="13"/><path d="M50 '+(great?77:74)+' V93" stroke="'+p.dark+'" stroke-width="6"/>';
}
function offhandMarkup(a){
  const p=a.palette,ink=p.ink,type=a.itemType||'focus';
  if(type==='shield')return '<path d="M50 6 L86 21 L80 70 Q68 89 50 97 Q32 89 20 70 L14 21Z" fill="'+p.base+'" stroke="'+ink+'" stroke-width="6"/><path d="M50 12 V90 M22 42 H78" stroke="'+p.trim+'" stroke-width="4"/>'+motif(a,50,52,.9);
  if(type==='tome')return '<path d="M13 17 Q34 8 50 20 Q66 8 87 17 V88 Q66 79 50 91 Q34 79 13 88Z" fill="'+p.base+'" stroke="'+ink+'" stroke-width="6"/><path d="M50 20 V90" stroke="'+p.trim+'" stroke-width="4"/>'+motif(a,31,50,.55);
  if(type==='quiver')return '<path d="M27 19 L71 12 L78 89 L38 96Z" fill="'+p.dark+'" stroke="'+ink+'" stroke-width="6"/><path d="M33 22 L39 3 M47 20 L51 2 M61 17 L66 1" stroke="'+p.trim+'" stroke-width="4"/>'+motif(a,54,55,.55);
  if(type==='dagger')return weaponMarkup({...a,itemType:'dagger'});
  return '<circle cx="50" cy="51" r="31" fill="'+p.dark+'" stroke="'+ink+'" stroke-width="6"/><circle cx="50" cy="51" r="19" fill="'+p.glow+'" stroke="'+p.trim+'" stroke-width="4"/>'+motif(a,50,51,.7)+tierDetail(a);
}
function atlasSprite(asset,x,y,w,h,part,contain){
  const r=part==null?asset.rect:asset.pair?.[part]||asset.rect;
  const pid=('cb-item-'+asset.key+'-'+r.join('-')).replace(/[^a-zA-Z0-9_-]/g,'-');
  return '<svg x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" viewBox="'+r.join(' ')+'" preserveAspectRatio="'+(contain?'xMidYMid meet':'none')+'" overflow="hidden" data-art-source="'+asset.key+'" data-art-mode="atlas">'+
    '<defs><pattern id="'+pid+'" patternUnits="userSpaceOnUse" x="0" y="0" width="'+asset.width+'" height="'+asset.height+'"><image href="'+asset.src+'" x="0" y="0" width="'+asset.width+'" height="'+asset.height+'"/></pattern></defs>'+
    '<rect x="'+r[0]+'" y="'+r[1]+'" width="'+r[2]+'" height="'+r[3]+'" fill="url(#'+pid+')"/>'+
  '</svg>';
}
function sprite(asset,x,y,w,h,part,contain){
  if(asset.mode!=='forge-vector')return atlasSprite(asset,x,y,w,h,part,contain);
  if(asset.slot==='Hands'&&w<=10&&h<=6){
    const p=asset.palette;return '<svg x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" viewBox="0 0 100 100" preserveAspectRatio="none" overflow="hidden" data-art-source="'+asset.key+'" data-art-mode="'+ART_DIRECTION+'"><rect x="3" y="8" width="94" height="84" rx="22" fill="'+p.base+'" stroke="'+p.ink+'" stroke-width="8"/></svg>';
  }
  return '<svg x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" viewBox="0 0 100 100" preserveAspectRatio="'+(contain?'xMidYMid meet':'none')+'" overflow="visible" data-art-source="'+asset.key+'" data-art-mode="'+ART_DIRECTION+'" data-item-model="'+ART_DIRECTION+'">'+vectorMarkup(asset,part)+'</svg>';
}
function icon(item){
  const a=resolve(item);
  return '<svg viewBox="0 0 128 128" role="img" aria-label="'+escape(item?.name||item?.key||'Item')+'" focusable="false" data-item-model="'+(a.mode==='forge-vector'?ART_DIRECTION:'illustrated-v2-atlas')+'">'+sprite(a,8,8,112,112,null,true)+'</svg>';
}
window.CellboundItemVisuals={
  version:VERSION,artDirection:ART_DIRECTION,resolve,sprite,icon,tier,type,families,atlases:A,
  identity,palette,vectorAsset
};
})();
