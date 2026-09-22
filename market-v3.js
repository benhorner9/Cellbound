(()=>{
'use strict';
const G=window.CellboundGear,P=window.CellboundProfessions;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number(v)||0;
const money=v=>Math.max(0,Math.round(num(v))).toLocaleString()+'g';
const ago=value=>{const t=new Date(value).getTime(),d=Math.max(0,Date.now()-t),m=Math.floor(d/60000);if(m<1)return'just now';if(m<60)return m+'m ago';const h=Math.floor(m/60);if(h<24)return h+'h ago';return Math.floor(h/24)+'d ago'};
let Game=null,db=null,user=null;
let gearListings=[],orders=[],transactions=[],watchlist=[],savedSearches=[],proceeds=[];
let marketTab='browse',marketCategory='all',selectedId=null,loading=false;

const state=()=>Game?.getState?.();
const material=k=>P?.MATERIALS?.[k]||null;
const rarityRank=r=>({Legendary:5,Epic:4,Rare:3,Uncommon:2,Common:1,Starter:0}[r]||0);
const raritySlug=r=>String(r||'Common').toLowerCase().replace(/[^a-z0-9]+/g,'-');
const active=o=>o?.status==='active'&&(!o.expires_at||new Date(o.expires_at).getTime()>Date.now());
const own=o=>(o?.user_id||o?.seller_id)===user?.id;

function ownedCommodity(category,key){
  const s=state();if(!s)return 0;
  if(category==='material')return num(s.materials?.[key]);
  if(category==='consumable')return num(s.consumables?.find(x=>x.key===key)?.quantity);
  if(category==='recipe')return num(s.recipeScrolls?.find(x=>x.recipeId===key)?.quantity);
  return 0;
}
function itemArt(category,key,name,payload={},size=58){
  if(category==='gear'){const base=G?.byId?.(key)||G?.byName?.(name)||{};return G?.artHTML?.({...base,...payload},size,'market-item-art')||'◇'}
  if(category==='material')return P?.materialArtHTML?.(key,size,'market-material-art')||material(key)?.icon||'◇';
  if(category==='recipe')return '<span class="market-symbol market-symbol-recipe">▤</span>';
  return '<span class="market-symbol market-symbol-consumable">⚗</span>';
}
function commodityModels(){
  const map=new Map();
  const touch=(category,key,name,rarity='Common',payload={})=>{
    if(!category||category==='gear'||!key)return null;
    const id='commodity:'+category+':'+key;
    if(!map.has(id))map.set(id,{id,type:'commodity',category,key,name:name||key,rarity:rarity||'Common',payload:payload||{},sellOrders:[],buyOrders:[],sales:[],owned:ownedCommodity(category,key)});
    const m=map.get(id);if(name)m.name=name;if(rarityRank(rarity)>rarityRank(m.rarity))m.rarity=rarity;if(payload&&Object.keys(payload).length)m.payload=payload;return m;
  };
  Object.entries(P?.MATERIALS||{}).forEach(([k,m])=>touch('material',k,m.name,m.rarity,m));
  (state()?.consumables||[]).forEach(x=>touch('consumable',x.key,x.name,'Uncommon',x.payload||{}));
  (state()?.recipeScrolls||[]).forEach(x=>touch('recipe',x.recipeId,x.name,'Rare',{recipeId:x.recipeId}));
  orders.forEach(o=>{const m=touch(o.category,o.item_key,o.item_name,o.rarity,o.payload);if(!m)return;(o.side==='sell'?m.sellOrders:m.buyOrders).push(o)});
  transactions.filter(t=>t.category!=='gear').forEach(t=>{const m=touch(t.category,t.item_key,t.item_name,t.rarity,t.payload);if(m)m.sales.push(t)});
  map.forEach(m=>{
    m.sellOrders=m.sellOrders.filter(active).sort((a,b)=>num(a.unit_price)-num(b.unit_price)||new Date(a.created_at)-new Date(b.created_at));
    m.buyOrders=m.buyOrders.filter(active).sort((a,b)=>num(b.unit_price)-num(a.unit_price)||new Date(a.created_at)-new Date(b.created_at));
    m.lowestSell=m.sellOrders[0]?.unit_price||null;
    m.highestBuy=m.buyOrders[0]?.unit_price||null;
    const cutoff=Date.now()-7*86400000,recent=m.sales.filter(x=>new Date(x.created_at).getTime()>=cutoff);
    const q=recent.reduce((n,x)=>n+num(x.quantity),0),gross=recent.reduce((n,x)=>n+num(x.unit_price)*num(x.quantity),0);
    m.avg7=q?Math.round(gross/q):null;m.volume7=q;
    const d1=Date.now()-86400000;m.volume24=m.sales.filter(x=>new Date(x.created_at).getTime()>=d1).reduce((n,x)=>n+num(x.quantity),0);
  });
  return [...map.values()];
}
function gearModels(){
  return gearListings.filter(l=>active(l)&&l.category==='gear').map(l=>{
    const base=G?.byId?.(l.item_key)||G?.byName?.(l.item_name)||{},gear={...base,...(l.payload||{})};
    return {id:'gear:'+l.id,type:'gear',category:'gear',listing:l,key:l.item_key,name:l.item_name,rarity:l.rarity||gear.rarity||'Common',payload:gear,price:num(l.unit_price),itemLevel:num(l.item_level||gear.itemLevel),itemClass:l.item_class||gear.class||'',slot:l.slot||gear.slot||'',seller:l.seller_label||'Player Guild',stats:G?.statLines?.(gear)||[]}
  });
}
function allModels(){return [...gearModels(),...commodityModels()]}
function currentFilters(){
  return {
    category:marketCategory,
    search:$('#marketSearch')?.value||'',
    klass:$('#marketClass')?.value||'all',
    slot:$('#marketSlot')?.value||'all',
    rarity:$('#marketRarity')?.value||'all',
    minIlvl:num($('#marketMinIlvl')?.value),
    maxPrice:num($('#marketMaxPrice')?.value),
    sort:$('#marketSort')?.value||'price-asc'
  };
}
function filteredModels(){
  const f=currentFilters(),q=f.search.trim().toLowerCase();
  let rows=allModels().filter(m=>{
    if(f.category!=='all'&&m.category!==f.category)return false;
    if(q){
      const roll=m.type==='gear'?m.stats.map(x=>x.text).join(' '):'';
      const hay=[m.name,m.category,m.itemClass,m.slot,m.rarity,roll].filter(Boolean).join(' ').toLowerCase();
      if(!hay.includes(q))return false;
    }
    if(f.rarity!=='all'&&m.rarity!==f.rarity)return false;
    if(m.type==='gear'){
      if(f.klass!=='all'&&m.itemClass!==f.klass)return false;
      if(f.slot!=='all'&&m.slot!==f.slot)return false;
      if(f.minIlvl&&m.itemLevel<f.minIlvl)return false;
      if(f.maxPrice&&m.price>f.maxPrice)return false;
    }else{
      const p=m.lowestSell||m.highestBuy||0;if(f.maxPrice&&p&&p>f.maxPrice)return false;
    }
    return true;
  });
  rows.sort((a,b)=>{
    const pa=a.type==='gear'?a.price:(a.lowestSell??a.highestBuy??Infinity),pb=b.type==='gear'?b.price:(b.lowestSell??b.highestBuy??Infinity);
    if(f.sort==='price-desc')return (pb===Infinity?0:pb)-(pa===Infinity?0:pa);
    if(f.sort==='newest'){const ta=a.type==='gear'?a.listing.created_at:a.sellOrders[0]?.created_at||a.buyOrders[0]?.created_at||0,tb=b.type==='gear'?b.listing.created_at:b.sellOrders[0]?.created_at||b.buyOrders[0]?.created_at||0;return new Date(tb)-new Date(ta)}
    if(f.sort==='ilvl-desc')return num(b.itemLevel)-num(a.itemLevel)||pa-pb;
    if(f.sort==='volume')return num(b.volume24)-num(a.volume24)||pa-pb;
    return pa-pb;
  });
  return rows;
}
function marketPriceFor(category,key){
  const m=commodityModels().find(x=>x.category===category&&x.key===key);
  if(m)return m.lowestSell||m.highestBuy||null;
  const gs=gearModels().filter(x=>x.key===key).sort((a,b)=>a.price-b.price);return gs[0]?.price||null;
}
function isWatched(category,key){return watchlist.some(w=>w.category===category&&w.item_key===key)}
function watchButton(category,key,name){
  return '<button class="market-watch-btn '+(isWatched(category,key)?'active':'')+'" data-market-watch="'+esc(category)+'|'+esc(key)+'|'+esc(name)+'">'+(isWatched(category,key)?'★ WATCHING':'☆ WATCH')+'</button>'
}
function renderStats(){
  const root=$('#marketStats');if(!root)return;
  const now=Date.now(),volume=transactions.filter(t=>new Date(t.created_at).getTime()>=now-86400000).reduce((n,t)=>n+num(t.gross_gold),0);
  const gear=gearListings.filter(active).length,buy=orders.filter(o=>active(o)&&o.side==='buy').length,sell=orders.filter(o=>active(o)&&o.side==='sell').length;
  root.innerHTML='<article><span>ACTIVE GEAR</span><b>'+gear+'</b><small>live listings</small></article><article><span>BUY ORDERS</span><b>'+buy+'</b><small>commodity demand</small></article><article><span>SELL ORDERS</span><b>'+sell+'</b><small>commodity supply</small></article><article><span>24H VOLUME</span><b>'+money(volume)+'</b><small>gold traded</small></article>';
  const ownActive=gearListings.filter(x=>own(x)&&active(x)).length+orders.filter(x=>own(x)&&active(x)).length;
  const ob=$('#marketOrderBadge');if(ob)ob.textContent=ownActive?String(ownActive):'';
  const wb=$('#marketWatchBadge');if(wb)wb.textContent=watchlist.length?String(watchlist.length):'';
  const inbox=state()?.tradeInbox||[],pending=proceeds.filter(x=>!x.claimed).reduce((n,x)=>n+num(x.net_gold),0);
  if($('#marketDeliveryCount'))$('#marketDeliveryCount').textContent=String(inbox.length);
  if($('#marketDeliveryGold'))$('#marketDeliveryGold').textContent=money(pending)+' waiting';
}
function renderSavedSearches(){
  const root=$('#marketSavedSearches');if(!root)return;
  root.innerHTML=savedSearches.length?savedSearches.map(s=>'<button data-saved-search="'+s.id+'"><b>'+esc(s.name)+'</b><span>›</span></button>').join(''):'<span>No saved searches yet.</span>';
}
function renderList(){
  const root=$('#tradeListings');if(!root)return;
  const rows=filteredModels();$('#marketResultCount').textContent=rows.length+' result'+(rows.length===1?'':'s');
  if(!rows.length){root.innerHTML='<div class="market-empty-state"><span>⌕</span><h3>No market results</h3><p>Try a broader search or remove some filters.</p></div>';renderInspector(null);return}
  root.innerHTML=rows.map(m=>{
    if(m.type==='gear'){
      return '<article class="market-row market-row-gear '+(selectedId===m.id?'selected':'')+'" data-market-select="'+m.id+'"><div class="market-row-art rarity-'+raritySlug(m.rarity)+'">'+itemArt('gear',m.key,m.name,m.payload,58)+'</div><div class="market-row-main"><small>'+esc(m.rarity)+' · '+esc(m.itemClass)+' · '+esc(m.slot)+'</small><h4>'+esc(m.name)+'</h4><div class="market-rolls">'+m.stats.slice(0,3).map(s=>'<span>'+esc(s.text)+'</span>').join('')+'</div><em>'+esc(m.seller)+' · '+ago(m.listing.created_at)+'</em></div><div class="market-row-meta"><span>ILVL</span><b>'+m.itemLevel+'</b></div><div class="market-row-price"><b>'+money(m.price)+'</b><small>BUYOUT</small></div></article>';
    }
    const sell=m.lowestSell?money(m.lowestSell):'—',buy=m.highestBuy?money(m.highestBuy):'—';
    return '<article class="market-row market-row-commodity '+(selectedId===m.id?'selected':'')+'" data-market-select="'+m.id+'"><div class="market-row-art">'+itemArt(m.category,m.key,m.name,m.payload,58)+'</div><div class="market-row-main"><small>'+esc(m.rarity)+' · '+esc(m.category==='material'?'Reagent':m.category)+'</small><h4>'+esc(m.name)+'</h4><em>Owned '+m.owned+' · '+m.volume24+' traded today</em></div><div class="market-book-mini"><span>BUYERS <b>'+buy+'</b></span><span>SELLERS <b>'+sell+'</b></span></div><div class="market-row-price"><b>'+sell+'</b><small>LOWEST SELL</small></div></article>';
  }).join('');
  root.querySelectorAll('[data-market-select]').forEach(el=>el.onclick=()=>{selectedId=el.dataset.marketSelect;renderList();renderInspector(allModels().find(x=>x.id===selectedId)||null)});
  if(!selectedId||!rows.some(x=>x.id===selectedId))selectedId=rows[0].id;
  renderInspector(allModels().find(x=>x.id===selectedId)||rows[0]);
}
function compareGear(m){
  const s=state(),gear=m.payload,slot=m.slot,klass=m.itemClass;
  const candidates=(s?.roster||[]).filter(c=>c.class===klass&&c.equipment?.[slot]);
  if(!candidates.length)return'<div class="market-compare-empty">No '+esc(klass)+' currently has a '+esc(slot)+' equipped.</div>';
  candidates.sort((a,b)=>num(b.equipment?.[slot]?.itemLevel)-num(a.equipment?.[slot]?.itemLevel));
  const c=candidates[0],cur=Game?.canonicalItem?.(c.equipment[slot])||c.equipment[slot],delta=m.itemLevel-num(cur.itemLevel);
  const target=new Map((G?.statLines?.(gear)||[]).map(x=>[x.key,x.value])),current=new Map((G?.statLines?.(cur)||[]).map(x=>[x.key,x.value]));
  const keys=[...new Set([...target.keys(),...current.keys()])];
  return '<div class="market-compare"><small>COMPARE TO '+esc(c.name).toUpperCase()+'</small><b>'+esc(cur.name||'Current '+slot)+'</b><div>'+keys.map(k=>{const d=num(target.get(k))-num(current.get(k));const label=G?.STAT_DEFS?.[k]?.label||k;return'<span class="'+(d>0?'up':d<0?'down':'')+'">'+esc(label)+' '+(d>0?'+':'')+d+'</span>'}).join('')+'</div><em class="'+(delta>0?'up':delta<0?'down':'')+'">'+(delta>0?'+':'')+delta+' Item Level</em></div>';
}
function recentSales(category,key,limit=6){
  return transactions.filter(t=>t.category===category&&t.item_key===key).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,limit);
}
function renderInspector(m){
  const root=$('#marketInspector');if(!root)return;
  if(!m){root.innerHTML='<div class="market-inspector-empty"><span>◇</span><h3>Select an item</h3><p>Inspect live prices, recent sales, stat rolls and the order book.</p></div>';return}
  if(m.type==='gear'){
    const ownListing=own(m.listing),sales=recentSales('gear',m.key);
    root.innerHTML='<div class="market-inspector-scroll"><div class="market-item-hero"><div class="market-item-hero-art">'+itemArt('gear',m.key,m.name,m.payload,108)+'</div><div><small>'+esc(m.rarity)+' · '+esc(m.itemClass)+' · '+esc(m.slot)+'</small><h3>'+esc(m.name)+'</h3><p>Item Level '+m.itemLevel+'</p></div></div><div class="market-inspector-price"><span>BUYOUT</span><b>'+money(m.price)+'</b><small>Listed by '+esc(m.seller)+'</small></div><div class="market-detail-rolls">'+m.stats.map(s=>'<span>'+esc(s.text)+'</span>').join('')+'</div>'+compareGear(m)+'<div class="market-action-row">'+watchButton('gear',m.key,m.name)+(ownListing?'<button disabled>YOUR LISTING</button>':'<button class="primary" data-market-buy-gear="'+m.listing.id+'">BUY ITEM</button>')+'</div><section class="market-recent"><header><small>RECENT SALES</small><b>'+sales.length+'</b></header>'+(sales.length?sales.map(x=>'<div><span>'+money(x.unit_price)+'</span><em>'+ago(x.created_at)+'</em></div>').join(''):'<p>No recorded sales yet.</p>')+'</section></div>';
  }else{
    const sells=m.sellOrders.slice(0,6),buys=m.buyOrders.slice(0,6),sales=recentSales(m.category,m.key);
    const buyDefault=m.lowestSell||m.highestBuy||10,sellDefault=m.highestBuy||m.lowestSell||10;
    root.innerHTML='<div class="market-inspector-scroll"><div class="market-item-hero"><div class="market-item-hero-art">'+itemArt(m.category,m.key,m.name,m.payload,108)+'</div><div><small>'+esc(m.rarity)+' · '+esc(m.category==='material'?'Reagent':m.category)+'</small><h3>'+esc(m.name)+'</h3><p>Owned '+m.owned+'</p></div></div><div class="market-commodity-quote"><article><span>HIGHEST BUY</span><b>'+ (m.highestBuy?money(m.highestBuy):'—') +'</b></article><article><span>LOWEST SELL</span><b>'+ (m.lowestSell?money(m.lowestSell):'—') +'</b></article><article><span>7D AVG</span><b>'+ (m.avg7?money(m.avg7):'—') +'</b></article></div><div class="market-order-entry"><label>QUANTITY<input id="marketOrderQty" type="number" min="1" value="1"></label><label>PRICE EACH<input id="marketOrderPrice" type="number" min="1" value="'+buyDefault+'"></label><div class="market-order-buttons"><button data-market-order-buy="'+esc(m.id)+'">PLACE BUY ORDER</button><button data-market-order-sell="'+esc(m.id)+'" '+(m.owned<1?'disabled':'')+'>SELL FROM STOCK</button></div></div><div class="market-order-book"><section><header><span>BUY ORDERS</span><b>'+buys.reduce((n,x)=>n+num(x.quantity_remaining),0)+'</b></header>'+(buys.length?buys.map(x=>'<div><span>'+num(x.quantity_remaining)+' wanted</span><b>'+money(x.unit_price)+'</b></div>').join(''):'<p>No buyers yet.</p>')+'</section><section><header><span>SELL ORDERS</span><b>'+sells.reduce((n,x)=>n+num(x.quantity_remaining),0)+'</b></header>'+(sells.length?sells.map(x=>'<div><span>'+num(x.quantity_remaining)+' available</span><b>'+money(x.unit_price)+'</b></div>').join(''):'<p>No sellers yet.</p>')+'</section></div><div class="market-action-row">'+watchButton(m.category,m.key,m.name)+'</div><section class="market-recent"><header><small>RECENT SALES</small><b>'+sales.length+'</b></header>'+(sales.length?sales.map(x=>'<div><span>'+num(x.quantity)+' × '+money(x.unit_price)+'</span><em>'+ago(x.created_at)+'</em></div>').join(''):'<p>No recorded sales yet.</p>')+'</section></div>';
    const price=$('#marketOrderPrice');if(price)price.dataset.sellDefault=String(sellDefault);
  }
  bindDynamic();
}
function renderOrders(){
  const root=$('#myTradeListings');if(!root)return;
  const gl=gearListings.filter(own).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const co=orders.filter(own).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  const rows=[
    ...gl.map(x=>({kind:'gear',id:x.id,status:x.status,active:active(x),name:x.item_name,category:'Equipment',qty:x.quantity,initial:x.original_quantity||x.quantity,price:x.unit_price,created_at:x.created_at,art:itemArt('gear',x.item_key,x.item_name,x.payload,52)})),
    ...co.map(x=>({kind:'order',id:x.id,status:x.status,active:active(x),name:x.item_name,category:(x.side==='buy'?'Buy Order · ':'Sell Order · ')+x.category,qty:x.quantity_remaining,initial:x.quantity_initial,price:x.unit_price,created_at:x.created_at,art:itemArt(x.category,x.item_key,x.item_name,x.payload,52),reserved:x.reserved_gold,side:x.side}))
  ].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  root.innerHTML=rows.length?rows.map(r=>'<article class="market-own-order '+(r.active?'active':'')+'"><div class="market-own-art">'+r.art+'</div><div><small>'+esc(r.category)+' · '+esc(String(r.status).toUpperCase())+'</small><h4>'+esc(r.name)+'</h4><p>'+num(r.qty)+' / '+num(r.initial)+' remaining · '+money(r.price)+' each'+(r.reserved?' · '+money(r.reserved)+' reserved':'')+'</p></div><em>'+ago(r.created_at)+'</em>'+(r.active?'<button data-market-cancel="'+r.kind+'|'+r.id+'">CANCEL</button>':'')+'</article>').join(''):'<div class="market-empty-state"><span>◇</span><h3>No market activity</h3><p>Your active and completed listings will appear here.</p></div>';
  root.querySelectorAll('[data-market-cancel]').forEach(b=>b.onclick=()=>cancelMarket(b.dataset.marketCancel));
}
function renderHistory(){
  const root=$('#marketHistoryList');if(!root)return;
  const rows=transactions.filter(t=>t.buyer_id===user.id||t.seller_id===user.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  root.innerHTML=rows.length?rows.map(t=>{const buying=t.buyer_id===user.id;return'<article class="market-history-row"><div class="market-history-icon '+(buying?'buy':'sell')+'">'+(buying?'↓':'↑')+'</div><div><small>'+(buying?'PURCHASE':'SALE')+' · '+esc(t.category.toUpperCase())+'</small><h4>'+esc(t.item_name)+'</h4><p>'+num(t.quantity)+' × '+money(t.unit_price)+(buying?'':' · after tax '+money(t.net_gold))+'</p></div><b class="'+(buying?'spent':'earned')+'">'+(buying?'−'+money(t.gross_gold):'+'+money(t.net_gold))+'</b><em>'+ago(t.created_at)+'</em></article>'}).join(''):'<div class="market-empty-state"><span>▤</span><h3>No completed trades yet</h3><p>Your purchases and sales will build a permanent market ledger here.</p></div>';
}
function renderWatchlist(){
  const root=$('#marketWatchList');if(!root)return;
  root.innerHTML=watchlist.length?watchlist.map(w=>{const price=marketPriceFor(w.category,w.item_key);return'<article class="market-watch-card"><div>'+itemArt(w.category,w.item_key,w.item_name,{},54)+'</div><span><small>'+esc(w.category.toUpperCase())+'</small><b>'+esc(w.item_name)+'</b><em>'+(price?money(price):'No active market')+'</em></span><button data-watch-open="'+esc(w.category)+'|'+esc(w.item_key)+'">OPEN</button><button class="remove" data-watch-remove="'+esc(w.category)+'|'+esc(w.item_key)+'">×</button></article>'}).join(''):'<div class="market-empty-state"><span>☆</span><h3>Your watchlist is empty</h3><p>Watch items from the market inspector to track them here.</p></div>';
}
function renderTab(){
  const ids={browse:'#marketBrowse',orders:'#marketOrders',history:'#marketHistory',watchlist:'#marketWatchlist'};
  Object.entries(ids).forEach(([k,s])=>{const el=$(s);if(el)el.hidden=k!==marketTab});
  $$('#marketTabs [data-market-tab]').forEach(b=>b.classList.toggle('active',b.dataset.marketTab===marketTab));
  if(marketTab==='browse')renderList();
  if(marketTab==='orders')renderOrders();
  if(marketTab==='history')renderHistory();
  if(marketTab==='watchlist')renderWatchlist();
}
function setCategory(cat){
  marketCategory=cat||'all';
  $$('#marketCategoryNav [data-market-category]').forEach(b=>b.classList.toggle('active',b.dataset.marketCategory===marketCategory));
  const gearOnly=['marketClass','marketSlot','marketMinIlvl'];gearOnly.forEach(id=>{const e=$('#'+id);if(e)e.disabled=marketCategory!=='all'&&marketCategory!=='gear'});
  selectedId=null;renderList();
}
function applySaved(s){
  const f=s.filters||{};setCategory(f.category||'all');
  if($('#marketSearch'))$('#marketSearch').value=f.search||'';
  if($('#marketClass'))$('#marketClass').value=f.klass||'all';
  if($('#marketSlot'))$('#marketSlot').value=f.slot||'all';
  if($('#marketRarity'))$('#marketRarity').value=f.rarity||'all';
  if($('#marketMinIlvl'))$('#marketMinIlvl').value=f.minIlvl||'';
  if($('#marketMaxPrice'))$('#marketMaxPrice').value=f.maxPrice||'';
  if($('#marketSort'))$('#marketSort').value=f.sort||'price-asc';
  renderList();
}
async function saveSearch(){
  const name=prompt('Name this market search:');if(!name?.trim())return;
  const {error}=await db.from('market_saved_searches').insert({user_id:user.id,name:name.trim().slice(0,50),filters:currentFilters()});
  if(error){alert(error.message||'Could not save search');return}await load();
}
async function toggleWatch(raw){
  const [category,key,...rest]=raw.split('|'),name=rest.join('|')||key;
  if(isWatched(category,key)){
    const {error}=await db.from('market_watchlist').delete().eq('user_id',user.id).eq('category',category).eq('item_key',key);
    if(error){alert(error.message);return}
  }else{
    const {error}=await db.from('market_watchlist').upsert({user_id:user.id,category,item_key:key,item_name:name},{onConflict:'user_id,category,item_key'});
    if(error){alert(error.message);return}
  }
  await load(false);
}
function sellOptions(){
  const s=state(),out=[];
  (s?.bank||[]).filter(x=>x.tradeState!=='soulbound').forEach(x=>out.push({type:'gear',id:x.id,key:x.itemId,name:x.name,qty:x.quantity||1,payload:Game.canonicalItem?.(x)||x}));
  Object.entries(s?.materials||{}).filter(([,q])=>num(q)>0).forEach(([k,q])=>out.push({type:'material',id:k,key:k,name:material(k)?.name||k,qty:num(q),payload:material(k)||{}}));
  (s?.consumables||[]).filter(x=>num(x.quantity)>0).forEach(x=>out.push({type:'consumable',id:x.key,key:x.key,name:x.name,qty:num(x.quantity),payload:x.payload||{}}));
  (s?.recipeScrolls||[]).filter(x=>num(x.quantity)>0).forEach(x=>out.push({type:'recipe',id:x.recipeId,key:x.recipeId,name:x.name,qty:num(x.quantity),payload:{recipeId:x.recipeId}}));
  return out;
}
function selectedSell(){const [type,id]=($('#tradeSellItem')?.value||'').split('|');return sellOptions().find(x=>x.type===type&&x.id===id)||null}
function renderSell(){
  const sel=$('#tradeSellItem');if(!sel)return;
  const items=sellOptions(),prev=sel.value;sel.innerHTML=items.length?items.map(x=>'<option value="'+esc(x.type+'|'+x.id)+'">'+esc(x.name)+' · '+esc(x.type)+' · ×'+x.qty+'</option>').join(''):'<option value="">Nothing tradeable available</option>';
  if(prev&&items.some(x=>x.type+'|'+x.id===prev))sel.value=prev;
  renderSellPreview();
}
function renderSellPreview(){
  const item=selectedSell(),root=$('#tradeSellPreview'),summary=$('#tradeSellSummary'),q=$('#tradeSellQuantity'),p=$('#tradeSellPrice'),duration=$('#marketListingDurationWrap');
  if(!root||!summary)return;
  if(!item){root.innerHTML='<div class="trade-preview-empty">Choose an item to preview the order.</div>';summary.innerHTML='';return}
  if(duration)duration.hidden=item.type!=='gear';
  const qty=Math.max(1,Math.min(item.qty,num(q?.value)||1)),price=Math.max(1,num(p?.value)||1);if(q){q.max=String(item.qty);q.value=String(qty)}
  const rarity=item.type==='gear'?(item.payload.rarity||'Common'):item.type==='material'?(material(item.key)?.rarity||'Common'):item.type==='recipe'?'Rare':'Uncommon';
  const current=marketPriceFor(item.type,item.key),gross=qty*price,tax=Math.floor(gross*.05),net=gross-tax;
  root.innerHTML='<article class="trade-preview-card trade-preview-'+item.type+'"><div class="trade-preview-art">'+itemArt(item.type,item.key,item.name,item.payload,74)+'</div><div class="trade-preview-copy"><small>'+esc(rarity)+' · '+esc(item.type==='material'?'Reagent':item.type)+'</small><h4>'+esc(item.name)+'</h4><p>Owned ×'+item.qty+(current?' · Current market '+money(current):' · No active market')+'</p><em>'+(item.type==='gear'?'Timed equipment listing':'Commodity Exchange sell order')+'</em></div><div class="trade-preview-owned"><span>OWNED</span><b>×'+item.qty+'</b></div></article>';
  summary.innerHTML='<div><span>Order value</span><b>'+money(gross)+'</b></div><div><span>5% sale tax</span><b>−'+money(tax)+'</b></div><div class="net"><span>After tax if filled</span><b>'+money(net)+'</b></div>';
}
async function createSell(e){
  e.preventDefault();const item=selectedSell();if(!item)return;
  const qty=Math.max(1,Math.min(item.qty,num($('#tradeSellQuantity')?.value)||1)),price=Math.max(1,num($('#tradeSellPrice')?.value)||1);
  let data,error;
  if(item.type==='gear'){
    ({data,error}=await db.rpc('market_create_listing',{p_category:'gear',p_item_id:item.id,p_item_key:item.key,p_item_name:item.name,p_quantity:qty,p_unit_price:price,p_payload:item.payload||{},p_duration_hours:num($('#marketListingDuration')?.value)||48}));
  }else{
    const rarity=item.type==='material'?(material(item.key)?.rarity||'Common'):item.type==='recipe'?'Rare':'Uncommon';
    ({data,error}=await db.rpc('market_place_commodity_order',{p_side:'sell',p_category:item.type,p_item_key:item.key,p_item_name:item.name,p_quantity:qty,p_unit_price:price,p_payload:item.payload||{},p_rarity:rarity}));
  }
  if(error){$('#tradeSellHint').textContent=error.message||'Could not create order';return}
  location.reload();
}
async function placeCommodity(side,id){
  const m=commodityModels().find(x=>x.id===id);if(!m)return;
  const qty=Math.max(1,num($('#marketOrderQty')?.value)||1),price=Math.max(1,num($('#marketOrderPrice')?.value)||1);
  if(side==='sell'&&qty>m.owned){alert('You do not own that many.');return}
  const {error}=await db.rpc('market_place_commodity_order',{p_side:side,p_category:m.category,p_item_key:m.key,p_item_name:m.name,p_quantity:qty,p_unit_price:price,p_payload:m.payload||{},p_rarity:m.rarity||'Common'});
  if(error){alert(error.message||'Order failed');return}location.reload();
}
async function buyGear(id){
  const l=gearListings.find(x=>x.id===id);if(!l||own(l))return;
  if(!confirm('Buy '+l.item_name+' for '+money(l.unit_price)+'?'))return;
  const {error}=await db.rpc('purchase_trading_listing',{p_listing_id:id,p_quantity:1});if(error){alert(error.message||'Purchase failed');await load();return}location.reload();
}
async function cancelMarket(raw){
  const [kind,id]=raw.split('|');let error;
  if(kind==='gear')({error}=await db.rpc('market_cancel_listing',{p_listing_id:id}));
  else({error}=await db.rpc('market_cancel_commodity_order',{p_order_id:id}));
  if(error){alert(error.message||'Could not cancel');return}location.reload();
}
async function claimAll(){
  const btn=$('#marketClaimAll');if(btn)btn.disabled=true;
  try{
    const delivered=await window.CellboundEconomy?.processInbox?.();
    const claimed=await window.CellboundEconomy?.claimProceeds?.();
    if(delivered||claimed)location.reload();else await load(false);
  }finally{if(btn)btn.disabled=false}
}
function openSell(){renderSell();const el=$('#marketSellDrawer');if(el)el.hidden=false}
function closeSell(){const el=$('#marketSellDrawer');if(el)el.hidden=true}
function clearFilters(){
  if($('#marketSearch'))$('#marketSearch').value='';if($('#marketClass'))$('#marketClass').value='all';if($('#marketSlot'))$('#marketSlot').value='all';if($('#marketRarity'))$('#marketRarity').value='all';if($('#marketMinIlvl'))$('#marketMinIlvl').value='';if($('#marketMaxPrice'))$('#marketMaxPrice').value='';if($('#marketSort'))$('#marketSort').value='price-asc';setCategory('all')
}
function bindDynamic(){
  $$('[data-market-watch]').forEach(b=>b.onclick=e=>{e.stopPropagation();toggleWatch(b.dataset.marketWatch)});
  $$('[data-market-buy-gear]').forEach(b=>b.onclick=()=>buyGear(b.dataset.marketBuyGear));
  $$('[data-market-order-buy]').forEach(b=>b.onclick=()=>placeCommodity('buy',b.dataset.marketOrderBuy));
  $$('[data-market-order-sell]').forEach(b=>b.onclick=()=>{const p=$('#marketOrderPrice');if(p&&p.dataset.sellDefault)p.value=p.dataset.sellDefault;placeCommodity('sell',b.dataset.marketOrderSell)});
}
function bind(){
  $('#refreshTrading')?.addEventListener('click',()=>load());
  $('#marketClaimAll')?.addEventListener('click',claimAll);
  $$('#marketTabs [data-market-tab]').forEach(b=>b.addEventListener('click',()=>{marketTab=b.dataset.marketTab;renderTab()}));
  $$('#marketCategoryNav [data-market-category]').forEach(b=>b.addEventListener('click',()=>setCategory(b.dataset.marketCategory)));
  ['marketSearch','marketClass','marketSlot','marketRarity','marketMinIlvl','marketMaxPrice','marketSort'].forEach(id=>$('#'+id)?.addEventListener(id==='marketSearch'?'input':'change',()=>{selectedId=null;renderList()}));
  $('#marketClearFilters')?.addEventListener('click',clearFilters);
  $('#marketSaveSearch')?.addEventListener('click',saveSearch);
  $('#marketSavedSearches')?.addEventListener('click',e=>{const b=e.target.closest('[data-saved-search]'),s=savedSearches.find(x=>x.id===b?.dataset.savedSearch);if(s)applySaved(s)});
  $('#marketOpenSell')?.addEventListener('click',openSell);$('#marketOrdersSell')?.addEventListener('click',openSell);$('#marketCloseSell')?.addEventListener('click',closeSell);
  $('#marketSellDrawer')?.addEventListener('click',e=>{if(e.target.id==='marketSellDrawer')closeSell()});
  $('#tradeSellForm')?.addEventListener('submit',createSell);$('#tradeSellItem')?.addEventListener('change',renderSellPreview);$('#tradeSellQuantity')?.addEventListener('input',renderSellPreview);$('#tradeSellPrice')?.addEventListener('input',renderSellPreview);
  $('#marketWatchList')?.addEventListener('click',e=>{
    const open=e.target.closest('[data-watch-open]'),remove=e.target.closest('[data-watch-remove]');
    if(open){const [cat,key]=open.dataset.watchOpen.split('|'),m=allModels().find(x=>x.category===cat&&x.key===key);if(m){marketTab='browse';setCategory(cat);selectedId=m.id;renderTab()}}
    if(remove)toggleWatch(remove.dataset.watchRemove+'|');
  });
  window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='trading')load()});
}
async function load(render=true){
  if(loading||!db||!user)return;loading=true;
  const refresh=$('#refreshTrading');if(refresh)refresh.disabled=true;
  try{
    const [g,o,t,w,s,p]=await Promise.all([
      db.from('trading_post_listings').select('*').order('created_at',{ascending:false}).limit(400),
      db.from('market_commodity_orders').select('*').order('created_at',{ascending:false}).limit(600),
      db.from('market_transactions').select('*').order('created_at',{ascending:false}).limit(300),
      db.from('market_watchlist').select('*').eq('user_id',user.id).order('created_at',{ascending:false}),
      db.from('market_saved_searches').select('*').eq('user_id',user.id).order('created_at',{ascending:false}),
      db.from('trading_post_proceeds').select('*').eq('seller_id',user.id).order('created_at',{ascending:false}).limit(200)
    ]);
    const err=[g,o,t,w,s,p].find(x=>x.error)?.error;if(err)throw err;
    gearListings=g.data||[];orders=o.data||[];transactions=t.data||[];watchlist=w.data||[];savedSearches=s.data||[];proceeds=p.data||[];
    renderStats();renderSavedSearches();if(render)renderTab();else{renderList();renderOrders();renderHistory();renderWatchlist()}
  }catch(err){console.error('Market load failed',err);const root=$('#tradeListings');if(root)root.innerHTML='<div class="market-empty-state"><span>!</span><h3>Market unavailable</h3><p>'+esc(err.message||'Could not load the Trading Post.')+'</p></div>'}
  finally{loading=false;if(refresh)refresh.disabled=false}
}
async function init(){
  Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,80);return}
  db=Game.getSupabase?.();user=Game.getUser?.();if(!db||!user){setTimeout(init,150);return}
  bind();renderSell();await load();
  window.CellboundMarket={load,render:renderTab,renderSell,openSell};
}
init();
})();