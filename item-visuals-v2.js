(function(){
'use strict';
const A=window.CellboundItemAtlases;
if(!A)throw new Error('Illustrated item atlas must load before item visuals');
const families={Warrior:'warrior',Paladin:'paladin',Hunter:'hunter',Rogue:'rogue',Mage:'mage',Priest:'mage',Warlock:'mage',Druid:'hunter',Shaman:'hunter',Monk:'rogue',Evoker:'mage','Death Knight':'warrior','Demon Hunter':'rogue'};
const armour=['Chest','Shoulders','Hands','Waist','Legs','Feet'];
const weapons={sword:['weapons',0],greatsword:['weapons',0],axe:['weapons',1],hammer:['weapons',2],mace:['weapons',2],dagger:['weapons',3],bow:['weapons',4],staff:['weapons',5],crossbow:['secondary',0],spear:['secondary',1],wand:['secondary',2],scepter:['secondary',2],rod:['secondary',2],shield:['secondary',3],tome:['secondary',4],quiver:['secondary',5],focus:['accessories',2],idol:['accessories',2]};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function entry(atlas,row,col){const a=A[atlas],cell=a.cells[row*a.cols+col];return {atlas,src:a.src,width:a.width,height:a.height,...cell,key:atlas+'-'+row+'-'+col}}
function tier(item){return Math.max(1,Math.min(5,Math.floor(Number(item.tier)||({Common:1,Uncommon:2,Rare:3,Epic:4,Legendary:5}[item.rarity]||1))))}
function type(item,slot){
 const explicit=slot==='OffHand'?item.offHandType:item.weaponType;if(explicit)return String(explicit).toLowerCase();
 const n=[item.name,item.itemId,item.key].join(' ').toLowerCase();
 for(const [pattern,value] of [[/crossbow/,'crossbow'],[/greatsword|greatblade|claymore/,'greatsword'],[/spear|pike|glaive|halberd|lance/,'spear'],[/bow/,'bow'],[/axe|cleaver|hatchet/,'axe'],[/hammer|maul|mace/,'hammer'],[/dagger|knife|shiv|stiletto/,'dagger'],[/wand|scept|rod/,'wand'],[/staff|stave|branch/,'staff'],[/shield|bulwark|buckler|aegis/,'shield'],[/quiver/,'quiver'],[/tome|book|scripture|grimoire/,'tome'],[/focus|orb|crystal|idol|totem/,'focus']])if(pattern.test(n))return value;
 return slot==='OffHand'?'focus':'sword';
}
function resolve(item,slot){
 item=item||{};slot=String(slot||item.slot||'').replace(/[12]$/,'');const t=tier(item)-1,klass=item.class||(item.classes?.length===1?item.classes[0]:null),family=families[klass]||'warrior';
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
function sprite(asset,x,y,w,h,part,contain){
 const r=part==null?asset.rect:asset.pair?.[part]||asset.rect;
 const pid=('cb-item-'+asset.key+'-'+r.join('-')).replace(/[^a-zA-Z0-9_-]/g,'-');
 return '<svg x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" viewBox="'+r.join(' ')+'" preserveAspectRatio="'+(contain?'xMidYMid meet':'none')+'" overflow="hidden" data-art-source="'+asset.key+'">'+
  '<defs><pattern id="'+pid+'" patternUnits="userSpaceOnUse" x="0" y="0" width="'+asset.width+'" height="'+asset.height+'"><image href="'+asset.src+'" x="0" y="0" width="'+asset.width+'" height="'+asset.height+'"/></pattern></defs>'+
  '<rect x="'+r[0]+'" y="'+r[1]+'" width="'+r[2]+'" height="'+r[3]+'" fill="url(#'+pid+')"/>'+
 '</svg>';
}
function icon(item){const a=resolve(item);return '<svg viewBox="0 0 128 128" role="img" aria-label="'+escape(item.name||item.key||'Item')+'" focusable="false">'+sprite(a,8,8,112,112,null,true)+'</svg>'}
window.CellboundItemVisuals={version:2,resolve,sprite,icon,tier,type,families,atlases:A};
})();
