(()=>{
'use strict';
/* Read-only inventory index drawn from the same live registries used by Cellbound.
   The catalogue never changes gear, item flags or loot tables. */
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const groupOrder={'Equipment':0,'Unique gear':1,'Materials':2,'Crafted items':3,'Special items':4,'Collectibles':5,'Quest items':6,'Bank discoveries':7};
const escCsv=x=>{
 const value=String(x??'');
 // Protect Excel and Google Sheets against imported formula execution.
 const safe=/^[\s]*[=+\-@\t\r]/.test(value)?"'"+value:value;
 return '"'+safe.replace(/"/g,'""')+'"'
};
const own=()=>Boolean(window.CellboundAdmin?.isAdmin)&&String(window.CellboundAdmin?.role||'').toLowerCase()==='owner';
let q='',category='all',tier='all',klass='all',eligibility='all',sort='tier',page=0;
const add=(rows,entry)=>{
 const id=String(entry.id||'').trim(),name=String(entry.name||'').trim();
 if(!id||!name)return;
 rows.push({id,name,category:entry.category||'Other',tier:Number(entry.tier)||null,rarity:entry.rarity||'—',className:entry.className||'All',slot:entry.slot||'—',
  itemLevel:Number(entry.itemLevel)||0,source:entry.source||'—',dropEligible:entry.dropEligible===true,
  status:entry.status||'',notes:entry.notes||'',profession:entry.profession||'',recipeLevel:Number(entry.recipeLevel)||0});
};
function catalogue(){
 const rows=[],G=window.CellboundGear,P=window.CellboundProfessions,E=window.CellboundEndgameData,Q=window.CellboundQuests;
 for(const item of G?.items||[]){
  add(rows,{id:item.itemId,name:item.name,category:'Equipment',tier:item.tier,rarity:item.rarity,
   className:item.class||((item.classes||[]).join(', ')||'All'),slot:item.slot,itemLevel:item.itemLevel,
   source:item.raidExclusive?'The Manor (raid)':item.tier>=3?'Heroic / Cellbound+ or higher-tier sources':'Dungeons / item progression',
   dropEligible:Boolean(item.enabled&&item.dropEnabled&&!item.raidExclusive&&Number(item.tier)<=2),
   status:!item.enabled?'Disabled':item.raidExclusive?'Raid exclusive':item.dropEnabled?'Default drop pool':'Not in standard drop pool',
   notes:item.tierLabel||''});
 }
 for(const [id,m] of Object.entries(P?.MATERIALS||{})){
  add(rows,{id,name:m.name||id,category:'Materials',rarity:m.rarity,className:'All',slot:'Material',
   source:m.source||'Dungeon reagents',dropEligible:!m.endgame,
   status:m.endgame?'Endgame restricted':'Boss drop eligible',notes:m.description||''});
 }
 for(const [profession,spec] of Object.entries(P?.PROFESSIONS||{})){
  for(const recipe of spec?.recipes||[]){
   const o=recipe.output;if(!o?.key||!o.name)continue;
   add(rows,{id:o.key,name:o.name,category:'Crafted items',tier:o.tier,rarity:o.rarity||'Crafted',className:o.class||'All',
    slot:o.slot||o.payload?.slot||(o.category==='consumable'?'Consumable':'Crafted'),
    itemLevel:o.itemLevel||0,source:'Crafting · '+profession,profession,recipeLevel:recipe.level,
    dropEligible:false,status:recipe.crafterOnly?'Crafter only':recipe.endgame?'Endgame recipe':'Craftable',
    notes:(o.payload?.description||'')+' · Recipe '+recipe.id});
  }
 }
 for(const item of Object.values(E?.UNIQUE_ITEMS||{})){
  add(rows,{id:item.itemId,name:item.name,category:'Unique gear',tier:item.tier,rarity:item.rarity,
   className:Array.isArray(item.classes)?item.classes.join(', '):item.classes||'All',slot:item.slot,itemLevel:item.itemLevel,
   source:item.source||'Endgame',status:'Unique · '+(item.minDifficulty||'special source'),
   notes:item.uniqueEffect?.description||'',dropEligible:false});
 }
 for(const item of Object.values(E?.CHASE_REWARDS||{})){
  add(rows,{id:item.id,name:item.name,category:'Collectibles',rarity:item.rarity||'Legendary',
   slot:item.kind||'Collectible',source:'Rare endgame chase reward',
   status:'Chase reward',notes:Number.isFinite(Number(item.baseDropRate))?'Baseline drop chance '+(Number(item.baseDropRate)*100).toFixed(2)+'%':''});
 }
 for(const [id,item] of Object.entries(Q?.itemCatalog?.()||{})){
  add(rows,{id,name:item.name,category:'Quest items',slot:'Quest key',source:'Echoes / campaign',
   status:'Story item',notes:item.desc||''});
 }
 // Hand-authored special rewards are outside the generated gear and profession registries.
 const manual=[
  {id:'grid-override-module',name:'Grid Override Module',category:'Special items',tier:3,rarity:'Rare',slot:'Utility',
   source:'Blackout Station · Dr. Vex Calder',status:'Rare utility drop · five auto-clear charges',notes:'10% dungeon drop, separate from boss bonus drops'},
  {id:'quest-blackglass-resonator',name:'Blackglass Resonator',category:'Unique gear',tier:3,rarity:'Rare',slot:'Relic',itemLevel:30,
   source:'The Hollow Sanctum · The Bound Choir',status:'First-clear quest reward',notes:'Quest relic, not in ordinary boss drop pool'}
 ];
 manual.forEach(x=>add(rows,x));
 // Gear and utilities generated during gameplay can be outside the static registries.
 const known=new Set(rows.map(x=>x.id));const state=window.CellboundGame?.getState?.()||{};
 for(const item of state.bank||[]){
  const id=String(item?.itemId||item?.key||'');if(!id||known.has(id))continue;
  known.add(id);
  add(rows,{id,name:item.name||id,category:'Bank discoveries',tier:item.tier,rarity:item.rarity,
   className:item.class||'All',slot:item.slot||'Bank item',itemLevel:item.itemLevel,source:item.source||'Guild Bank',
   status:'Seen in your Guild Bank',notes:item.description||'',dropEligible:false});
 }
 // A recipe may deliberately produce a different item variant with an identical key;
 // keep one canonical row per category and ID to avoid double-counting.
 const dedup=new Set();
 return rows.filter(x=>{const key=x.category+'|'+x.id;if(dedup.has(key))return false;dedup.add(key);return true});
}
function filtered(){
 const words=q.trim().toLowerCase().split(/\s+/).filter(Boolean);
 const matches=catalogue().filter(x=>(category==='all'||x.category===category)&&(tier==='all'||String(x.tier||'none')===tier)&&
 (klass==='all'||x.className.split(',').map(y=>y.trim()).includes(klass)||x.className==='All'&&klass==='all')&&
 (eligibility==='all'||(eligibility==='yes')===x.dropEligible)&&
 words.every(w=>[x.id,x.name,x.category,x.tier?'tier '+x.tier:'',x.rarity,x.className,x.slot,x.source,x.status,x.profession,x.notes].join(' ').toLowerCase().includes(w)));
 matches.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):
 sort==='category'?(groupOrder[a.category]??9)-(groupOrder[b.category]??9)||a.name.localeCompare(b.name):
 sort==='class'?a.className.localeCompare(b.className)||a.tier-b.tier||a.name.localeCompare(b.name):
 (a.tier||99)-(b.tier||99)||(groupOrder[a.category]??9)-(groupOrder[b.category]??9)||a.name.localeCompare(b.name));
 return matches
}
function escapeOption(v){return esc(v)}
function render(){
 const el=document.querySelector('#dboCatalog');if(!el||!own())return;
 const all=catalogue(),available=filtered(),pages=Math.max(1,Math.ceil(available.length/75));page=Math.min(Math.max(0,page),pages-1);
 const visible=available.slice(page*75,(page+1)*75);
 const categories=[...new Set(all.map(x=>x.category))].sort((a,b)=>(groupOrder[a]??9)-(groupOrder[b]??9));
 const classes=[...new Set(all.filter(x=>x.category==='Equipment').map(x=>x.className))].sort();
 const option=(value,label,current)=>'<option value="'+escapeOption(value)+'" '+(value===current?'selected':'')+'>'+escapeOption(label)+'</option>';
 el.innerHTML='<section class="dbo-catalog"><header class="dbo-catalog-head"><div><small>OWNER · GAME CONTENT INDEX</small><h3>Item Catalogue</h3><p>Live index of registered gear, reagents, crafted items, unique rewards and collectibles. Includes all five gear tiers — the boss loot picker intentionally supports fewer.</p></div><button id="dboExportCatalog" type="button">EXPORT CSV ↓</button></header>'+
 '<div class="dbo-catalog-stats"><strong>'+all.length.toLocaleString()+' <span>catalogue entries</span></strong><strong>'+available.length.toLocaleString()+' <span>matching</span></strong><small>Generated from current game registries · no editing of item stats or loot odds</small></div>'+
 '<div class="dbo-catalog-filters"><label>SEARCH ITEMS<input id="dboCatalogSearch" type="search" placeholder="Item, ID, class, boss, source…" autocomplete="off" value="'+esc(q)+'"></label>'+
 '<label>CATEGORY<select id="dboCatalogCategory">'+option('all','All categories',category)+categories.map(x=>option(x,x,category)).join('')+'</select></label>'+
 '<label>TIER<select id="dboCatalogTier">'+option('all','All tiers',tier)+[1,2,3,4,5].map(n=>option(String(n),'Tier '+n,tier)).join('')+option('none','Not tiered',tier)+'</select></label>'+
 '<label>CLASS<select id="dboCatalogClass">'+option('all','All classes',klass)+classes.map(x=>option(x,x,klass)).join('')+'</select></label>'+
 '<label>BOSS DROPS<select id="dboCatalogEligibility">'+option('all','All items',eligibility)+option('yes','Eligible in Drop Tables',eligibility)+option('no','Not eligible',eligibility)+'</select></label>'+
 '<label>SORT<select id="dboCatalogSort">'+option('tier','Tier then name',sort)+option('name','Name A–Z',sort)+option('class','Class then tier',sort)+option('category','Category then name',sort)+'</select></label></div>'+
 '<div class="dbo-catalog-scroll"><table class="dbo-catalog-table"><thead><tr><th>TIER</th><th>ITEM NAME / ID</th><th>CATEGORY</th><th>CLASS</th><th>SLOT</th><th>RARITY / iLVL</th><th>SOURCE / STATUS</th></tr></thead><tbody>'+
 (visible.length?visible.map(x=>'<tr><td><b class="dbo-catalog-tier">'+(x.tier?'T'+x.tier:'—')+'</b></td><td><strong>'+esc(x.name)+'</strong><small>'+esc(x.id)+'</small></td><td>'+esc(x.category)+'</td><td>'+esc(x.className)+'</td><td>'+esc(x.slot)+'</td><td>'+esc(x.rarity)+(x.itemLevel?' · '+x.itemLevel+' iLvl':'')+'</td><td>'+esc(x.source)+'<small>'+esc(x.status)+(x.dropEligible?' · Eligible for Drop Tables':'')+'</small></td></tr>').join(''):'<tr><td colspan="7">No items match these filters. Try clearing the search or changing the category.</td></tr>')+
 '</tbody></table></div>'+
 '<footer class="dbo-catalog-pager"><span>Showing '+(available.length?(page*75+1)+'–'+Math.min(available.length,(page+1)*75):'0')+' of '+available.length+' · page '+(page+1)+' of '+pages+'</span><div><button id="dboCatalogPrev" '+(page===0?'disabled':'')+'>← PREVIOUS</button><button id="dboCatalogNext" '+(page>=pages-1?'disabled':'')+'>NEXT →</button></div></footer>'+
 '<p class="dbo-catalog-note">The index reflects registered item definitions, plus additional items observed in your Guild Bank. Individually rolled stat combinations are variations of these items, not separate definitions. The CSV contains item IDs, names, tier, class, slot, rarity, item level, source, eligibility, profession and notes.</p></section>';
 function bindValue(selector,set){
  const target=el.querySelector(selector);
  target?.addEventListener(selector==='#dboCatalogSearch'?'input':'change',event=>{set(event.target.value);page=0;
   if(selector==='#dboCatalogSearch'){
    // Keep keyboard open and cursor stable for iPad typing: refresh rows only after input loses focus.
    const selection=target.selectionStart;
    render();const next=el.querySelector('#dboCatalogSearch');next?.focus();try{next?.setSelectionRange(selection,selection)}catch{}
   }else render()
  })
 }
 bindValue('#dboCatalogSearch',v=>{q=v});
 bindValue('#dboCatalogCategory',v=>{category=v});
 bindValue('#dboCatalogTier',v=>{tier=v});
 bindValue('#dboCatalogClass',v=>{klass=v});
 bindValue('#dboCatalogEligibility',v=>{eligibility=v});
 bindValue('#dboCatalogSort',v=>{sort=v});
 el.querySelector('#dboCatalogPrev')?.addEventListener('click',()=>{page--;render()});
 el.querySelector('#dboCatalogNext')?.addEventListener('click',()=>{page++;render()});
 el.querySelector('#dboExportCatalog')?.addEventListener('click',()=>exportCsv());
}
function csvText(rows=filtered()){
 const cols=[['id','Item ID'],['name','Item Name'],['category','Category'],['tier','Tier'],['className','Class'],['slot','Slot'],
  ['rarity','Rarity'],['itemLevel','Item Level'],['source','Source'],['dropEligible','Drop Table Eligible'],['status','Status'],
  ['profession','Profession'],['recipeLevel','Recipe Level'],['notes','Notes']];
 return cols.map(x=>escCsv(x[1])).join(',')+'\r\n'+rows.map(r=>cols.map(([key])=>escCsv(key==='dropEligible'?(r[key]?'Yes':'No'):r[key]??'')).join(',')).join('\r\n');
}
function exportCsv(){
 if(!own())return;
 const body='\uFEFF'+csvText(),blob=new Blob([body],{type:'text/csv;charset=utf-8;'}),href=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=href;a.download='cellbound-item-catalogue.csv';a.style.display='none';document.body.appendChild(a);
 a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),5000);
}
window.CellboundItemCatalog={render,catalogue,filtered,csvText,exportCsv};
})();