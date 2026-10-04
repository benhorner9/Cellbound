(function(){
'use strict';

const RARITY={
 Common:['#b9c1be','#53615f'],
 Uncommon:['#65dc86','#1f6943'],
 Rare:['#5aa8ff','#24538d'],
 Epic:['#c987ff','#66319a'],
 Legendary:['#f2c46d','#92571f']
};
const CLASS={
 Warrior:['#c69b6d','#673c2e'],
 Paladin:['#f48cba','#8c5370'],
 Priest:['#f1f4ff','#8ea2bf'],
 Druid:['#ff9a45','#765329'],
 Hunter:['#aad372','#507641'],
 Rogue:['#fff468','#8a7f32'],
 Mage:['#50c8ee','#246c98'],
 'Death Knight':['#c41e3a','#681826'],
 'Demon Hunter':['#a330c9','#531869'],
 Evoker:['#33937f','#1b5549'],
 Monk:['#00d98c','#12664c'],
 Shaman:['#2988ed','#174e92'],
 Warlock:['#8788ee','#4e407b']
};
const ARMOUR={
 Warrior:'plate',Paladin:'plate','Death Knight':'plate',
 Priest:'cloth',Mage:'cloth',Warlock:'cloth',
 Druid:'leather',Hunter:'leather',Rogue:'leather','Demon Hunter':'leather',Monk:'leather',
 Evoker:'mail',Shaman:'mail'
};
const PVP={
 Frontier:['#91a8ae','#33484f'],
 Arenaforged:['#e0784d','#743b32'],
 Seasonbound:['#b888ff','#543377']
};
const SPECIAL={
 'frostbound-sigil':'frost-sigil',
 'guardian-last-stand':'guardian',
 'embercore-staff':'ember-staff',
 'heart-troll-king':'troll-heart',
 'quest-blackglass-resonator':'blackglass',
 'relic-oathstone-dominion':'oathstone',
 'relic-heart-unbroken':'unbroken',
 'relic-chalice-mercy':'chalice',
 'relic-bell-renewal':'bell',
 'relic-fang-wrath':'fang',
 'relic-mirror-envy':'mirror',
 'grid-override-module':'grid-module'
};
const MATERIAL_NAMES={
 'faded-cell-fragment':'fragment',
 'zeltiran-iron':'iron',
 'ashen-soul-fragment':'soul',
 'warden-iron':'warden-iron',
 'ember-core':'ember',
 'vaultheart-crystal':'crystal',
 'ancient-soul':'ancient',
 'void-crystal':'void',
 'cell-shards':'shards'
};
const CONSUMABLE_NAMES={
 'field-recovery-potion':'potion',
 'quickmind-flask':'flask',
 'ironblood-flask':'flask',
 'cell-shock-draught':'shock',
 'binding-rune':'rune',
 'warden-ward-rune':'rune',
 'vaultheart-glyph':'glyph',
 'tempered-whetstone':'whetstone',
 'warden-plate-kit':'kit',
 'ember-temper-stone':'stone',
 'balanced-grip':'grip',
 'reinforced-harness':'harness',
 'predator-wrap':'wrap',
 'focus-thread':'thread',
 'mender-lining':'lining',
 'soulweave-lining':'lining'
};

function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function slug(v){return String(v||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function hash(v){let n=2166136261;const s=String(v||'cellbound');for(let i=0;i<s.length;i++){n^=s.charCodeAt(i);n=Math.imul(n,16777619)}return n>>>0}
function idOf(x){return String(x?.itemId||x?.id||x?.key||x?.name||'cellbound-item')}
function slotOf(x){return String(x?.slot||'').replace(/[12]$/,'')}
function rarityOf(x){return String(x?.rarity||((Number(x?.tier)||0)>=4?'Epic':(Number(x?.tier)||0)===3?'Rare':(Number(x?.tier)||0)===2?'Uncommon':'Common'))}
function classOf(x){return String(x?.class||((Array.isArray(x?.classes)&&x.classes.length===1)?x.classes[0]:'')||'')}
function tierOf(x){return Math.max(1,Math.min(5,Number(x?.tier)||1))}
function pvpBand(x){const n=String(x?.name||'');return Object.keys(PVP).find(function(k){return n.indexOf(k)===0})||''}
function kindOf(x){
 const id=idOf(x);
 if(SPECIAL[id])return 'special';
 if(x?.kind&&['mount','pet','cell'].includes(String(x.kind)))return 'collection';
 if(x?.category==='material'||x?.material||MATERIAL_NAMES[id])return 'material';
 if(x?.category==='consumable'||x?.payload?.effect||CONSUMABLE_NAMES[id])return 'consumable';
 if(x?.category==='recipe'||/^Recipe:/i.test(String(x?.name||'')))return 'recipe';
 if(x?.category==='key'||/\bkey\b/i.test(String(x?.name||'')))return 'key';
 if(x?.category==='utility'||x?.utilityType||slotOf(x)==='Utility')return 'utility';
 if(slotOf(x))return 'gear';
 return 'utility'
}
function artHTML(item,size,extra){
 if(!item)return '';size=Math.max(20,Math.round(Number(size)||64));
 const title=esc(item.name||idOf(item)),cls=['cb-item-art','cb-item-'+slug(kindOf(item)),'rarity-'+slug(rarityOf(item)),extra||''].join(' ');
 return '<span class="'+esc(cls)+'" style="width:'+size+'px;height:'+size+'px" data-item-art="'+esc(idOf(item))+'" data-item-kind="'+esc(kindOf(item))+'" title="'+title+'">'+window.CellboundItemVisuals.icon(item)+'</span>';
}
function findConsumable(key){
 const P=window.CellboundProfessions,all=Object.values(P?.PROFESSIONS||{}).flatMap(function(v){return v.recipes||[]});
 const r=all.find(function(v){return v?.output?.key===key});
 return r?.output?{...r.output,rarity:r.output?.rarity||P?.craftedRarity?.(r.level,r.endgame)||(r.endgame?'Epic':'Uncommon')}:{key:key,itemId:key,name:key,category:'consumable',rarity:'Uncommon'}
}
function materialHTML(key,size,extra){
 const m=window.CellboundProfessions?.MATERIALS?.[key]||{};
 return artHTML({key:key,itemId:key,name:m.name||key,rarity:m.rarity||'Common',category:'material',material:true},size,extra)
}
function consumableHTML(key,size,extra){
 return artHTML(findConsumable(key),size,extra)
}
function collectionHTML(item,size,extra){return artHTML(item,size,extra)}
function resolveGear(item){
 const G=window.CellboundGear;if(!item)return item;
 return G?.byId?.(item.baseItemId)||G?.byId?.(item.itemId)||G?.byName?.(item.name)||item
}
function installDataAdapters(){
 const G=window.CellboundGear,P=window.CellboundProfessions;
 if(G&&!G.__fullItemArtV1){
  G.artHTML=function(item,size,extra){
   const canonical=resolveGear(item)||item;
   const merged={...canonical,...item,itemId:item?.itemId||canonical?.itemId,baseItemId:item?.baseItemId};
   const slot=slotOf(merged),tier=tierOf(merged),klass=classOf(merged);
   const classes=['gear-art','tier-'+tier,'gear-slot-'+slug(slot||'item'),'gear-class-'+slug(klass||'all'),extra||''].join(' ');
   return artHTML(merged,size,classes)
  };
  G.__fullItemArtV1=true
 }
 if(P&&!P.__fullItemArtV1){
  P.materialArtHTML=materialHTML;
  P.consumableArtHTML=consumableHTML;
  P.__fullItemArtV1=true
 }
}
function enhancePvp(root){
 const scope=root||document;
 scope.querySelectorAll?.('[data-buy-pvp]').forEach(function(btn){
  if(btn.dataset.itemArtDone==='1')return;
  const parts=String(btn.dataset.buyPvp||'').split(':'),tier=Number(parts[0])||1,slot=parts[1]||'Trinket';
  const names={1:'Frontier',2:'Arenaforged',3:'Seasonbound'},span=btn.querySelector('span');
  if(span){span.innerHTML=artHTML({id:'pvp-t'+tier+'-'+slug(slot),name:(names[tier]||'PvP')+' '+slot,tier:tier,slot:slot,pvpOnly:true,rarity:tier===3?'Epic':tier===2?'Rare':'Uncommon'},46,'pvp-shop-item-art');btn.dataset.itemArtDone='1'}
 });
 scope.querySelectorAll?.('.pvp-equipped-grid > div.filled').forEach(function(card){
  if(card.dataset.itemArtDone==='1')return;
  const name=card.querySelector('b')?.textContent||'',slot=card.querySelector('small')?.textContent||'Trinket',tier=/^Seasonbound/.test(name)?3:/^Arenaforged/.test(name)?2:1,span=card.querySelector('span');
  if(span){span.innerHTML=artHTML({id:'pvp-t'+tier+'-'+slug(slot),name:name,tier:tier,slot:slot,pvpOnly:true,rarity:tier===3?'Epic':tier===2?'Rare':'Uncommon'},42,'pvp-equipped-item-art');card.dataset.itemArtDone='1'}
 })
}
function enhanceCollections(root){
 const scope=root||document;
 scope.querySelectorAll?.('.eg-collection-list article').forEach(function(card){
  if(card.dataset.itemArtDone==='1')return;
  const name=card.querySelector('b')?.textContent||'',meta=card.querySelector('small')?.textContent||'',kind=/MOUNT/i.test(meta)?'mount':/PET/i.test(meta)?'pet':'cell',icon=card.querySelector('i');
  const D=window.CellboundEndgameData,found=Object.values(D?.CHASE_REWARDS||{}).find(function(x){return x.name===name})||{id:slug(name),name:name,kind:kind,rarity:'Legendary'};
  if(icon){icon.innerHTML=artHTML(found,48,'endgame-collection-art');card.dataset.itemArtDone='1'}
 })
}
function enhanceCrafting(root){
 const P=window.CellboundProfessions,scope=root||document;if(!P)return;
 scope.querySelectorAll?.('.crafted-card').forEach(function(card){
  if(card.dataset.itemArtDone==='1')return;
  const b=card.querySelector('b'),name=b?.textContent?.replace(/^[⚗▤]\s*/,'').trim();if(!name)return;
  const all=Object.values(P.PROFESSIONS||{}).flatMap(function(v){return v.recipes||[]}),recipe=all.find(function(r){return r?.output?.name===name});
  if(recipe?.output?.category==='consumable'){b.insertAdjacentHTML('beforebegin',consumableHTML(recipe.output.key,48,'crafted-item-art'));card.dataset.itemArtDone='1';return}
  if(/^Recipe:/i.test(name)){b.insertAdjacentHTML('beforebegin',artHTML({id:'recipe-'+slug(name),name:name,category:'recipe',rarity:'Rare'},48,'crafted-item-art'));card.dataset.itemArtDone='1'}
 });
 scope.querySelectorAll?.('.recipe-card').forEach(function(card){
  if(card.dataset.itemArtDone==='1')return;
  if(card.querySelector(':scope > .recipe-output-art')){card.dataset.itemArtDone='1';return}
  const name=card.querySelector('h4')?.textContent||'';
  const all=Object.values(P.PROFESSIONS||{}).flatMap(function(v){return v.recipes||[]}),recipe=all.find(function(r){return r.name===name});
  if(recipe?.output?.category==='consumable'){card.insertAdjacentHTML('afterbegin',consumableHTML(recipe.output.key,48,'recipe-output-art'));card.dataset.itemArtDone='1'}
 });
 scope.querySelectorAll?.('.evo-bank-resource').forEach(function(card){
  if(card.dataset.itemArtDone==='1')return;
  const cat=card.querySelector('.bank-copy small')?.textContent||'',name=card.querySelector('h3')?.textContent||'';
  if(!/CONSUMABLE/i.test(cat))return;
  const stack=(window.CellboundGame?.getState?.()?.consumables||[]).find(function(x){return x.name===name});
  const box=card.querySelector('.bank-icon');if(box&&stack){box.innerHTML=consumableHTML(stack.key,66,'evo-resource-art');card.dataset.itemArtDone='1'}
 })
}
function enhanceFourfold(root){
 const scope=root||document;
 scope.querySelectorAll?.('.fourfold-key.found,.fourfold-key.inserted').forEach(function(card){
  if(card.dataset.itemArtDone==='1')return;const name=card.querySelector('b')?.textContent||'',icon=card.querySelector('i');if(!name||name==='Unknown Key'||!icon)return;
  const ids={'Cinder-Iron Key':'cinder-key','Blackglass Key':'blackglass-key','Verdant Key':'verdant-key','Relay Key':'relay-key'},id=ids[name]||slug(name);
  icon.innerHTML=artHTML({id:id,itemId:id,name:name,category:'key',rarity:'Rare'},48,'fourfold-key-art');card.dataset.itemArtDone='1'
 })
}
function enhanceTrade(root){
 const scope=root||document,P=window.CellboundProfessions;
 scope.querySelectorAll?.('.trade-preview-symbol').forEach(function(el){
  if(el.dataset.itemArtDone==='1')return;const host=el.closest('[data-item-key],[data-listing-id],article,button,div');if(!host)return;
  const text=host.textContent||'',all=Object.values(P?.PROFESSIONS||{}).flatMap(function(v){return v.recipes||[]}),recipe=all.find(function(r){return r?.output?.category==='consumable'&&text.indexOf(r.output.name)>=0});
  if(recipe){el.outerHTML=consumableHTML(recipe.output.key,54,'tp-consumable-art')}
 })
}
function enhanceAll(root){installDataAdapters();enhancePvp(root);enhanceCollections(root);enhanceCrafting(root);enhanceFourfold(root);enhanceTrade(root)}
window.CellboundItemArt={VERSION:'2.0.0',artHTML:artHTML,materialHTML:materialHTML,consumableHTML:consumableHTML,collectionHTML:collectionHTML,findConsumable:findConsumable,resolveGear:resolveGear,install:installDataAdapters,enhance:enhanceAll,SPECIAL:SPECIAL,MATERIAL_NAMES:MATERIAL_NAMES,CONSUMABLE_NAMES:CONSUMABLE_NAMES};
installDataAdapters();
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){enhanceAll(document)});
 else enhanceAll(document);
 const obs=new MutationObserver(function(ms){for(const m of ms){for(const n of m.addedNodes){if(n&&n.nodeType===1)enhanceAll(n)}}});
 const start=function(){if(document.body)obs.observe(document.body,{childList:true,subtree:true})};
 if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true})
}
})();