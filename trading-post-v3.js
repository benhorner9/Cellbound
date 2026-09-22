
(function(){
'use strict';
const G=window.CellboundGear,P=window.CellboundProfessions;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let Game=null,db=null,user=null;
let listings=[],orders=[],transactions=[],watchlist=[],savedSearches=[],proceeds=[];
let activeTab='browse',activeCategory='all',selected=null,loaded=false;

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const slug=v=>String(v||'common').toLowerCase().replace(/[^a-z0-9]+/g,'-');
const gold=v=>(Number(v)||0).toLocaleString()+'g';
const qty=v=>(Number(v)||0).toLocaleString();
const now=()=>Date.now();
const state=()=>Game?.getState?.()||{};
const mine=id=>user&&id===user.id;
function age(ts){const n=Math.max(0,now()-new Date(ts).getTime()),m=Math.floor(n/60000);if(m<1)return'now';if(m<60)return m+'m';const h=Math.floor(m/60);if(h<24)return h+'h';return Math.floor(h/24)+'d'}
function timeLeft(ts){const n=Math.max(0,new Date(ts).getTime()-now()),m=Math.ceil(n/60000);if(m<=0)return'Expired';if(m<60)return m+'m';const h=Math.ceil(m/60);if(h<24)return h+'h';return Math.ceil(h/24)+'d'}
function rarityOf(x){return x?.rarity||x?.payload?.rarity||(x?.category==='material'&&P?.MATERIALS?.[x.item_key]?.rarity)||'Common'}
function commodityKey(c,k){return c+'|'+k}
function materialByKey(k){return P?.MATERIALS?.[k]||null}
function commodityArt(category,key,size){
  if(category==='material'&&P?.materialArtHTML)return P.materialArtHTML(key,size||62,'tp-material-art');
  if(category==='recipe')return '<span class="trade-preview-symbol">▤</span>';
  return '<span class="trade-preview-symbol">⚗</span>';
}
function gearFor(l){const base=G?.byId?.(l.item_key)||G?.byName?.(l.item_name)||{};return {...base,...(l.payload||{})}}
function gearArt(l,size){const item=gearFor(l);return G?.artHTML?.(item,size||62,'tp-gear-art')||'◇'}
function currentGold(){return Number(state().gold)||0}
function activeOrders(){return orders.filter(o=>o.status==='active'&&Number(o.quantity_remaining)>0&&new Date(o.expires_at).getTime()>now())}
function activeGear(){return listings.filter(l=>l.status==='active'&&Number(l.quantity)>0&&(!l.expires_at||new Date(l.expires_at).getTime()>now()))}
function itemTransactions(category,key,days){
  const cut=now()-(days||30)*86400000;
  return transactions.filter(t=>t.category===category&&t.item_key===key&&new Date(t.created_at).getTime()>=cut);
}
function quoteFor(category,key){
  const os=activeOrders().filter(o=>o.category===category&&o.item_key===key);
  const sells=os.filter(o=>o.side==='sell').sort((a,b)=>a.unit_price-b.unit_price||new Date(a.created_at)-new Date(b.created_at));
  const buys=os.filter(o=>o.side==='buy').sort((a,b)=>b.unit_price-a.unit_price||new Date(a.created_at)-new Date(b.created_at));
  const tx7=itemTransactions(category,key,7),tx24=itemTransactions(category,key,1);
  const vol24=tx24.reduce((n,t)=>n+Number(t.quantity||0),0);
  const avg7=tx7.length?Math.round(tx7.reduce((n,t)=>n+Number(t.unit_price||0)*Number(t.quantity||1),0)/Math.max(1,tx7.reduce((n,t)=>n+Number(t.quantity||1),0))):0;
  return{sell:sells[0]?.unit_price||0,buy:buys[0]?.unit_price||0,sells,buys,vol24,avg7};
}
function knownCommodities(){
  const map=new Map();
  Object.entries(P?.MATERIALS||{}).forEach(([key,m])=>map.set(commodityKey('material',key),{category:'material',key,name:m.name,rarity:m.rarity||'Common',payload:m}));
  (state().consumables||[]).forEach(x=>map.set(commodityKey('consumable',x.key),{category:'consumable',key:x.key,name:x.name,rarity:'Common',payload:x.payload||{}}));
  (state().recipeScrolls||[]).forEach(x=>map.set(commodityKey('recipe',x.recipeId),{category:'recipe',key:x.recipeId,name:x.name,rarity:'Rare',payload:{recipeId:x.recipeId}}));
  orders.forEach(o=>map.set(commodityKey(o.category,o.item_key),{category:o.category,key:o.item_key,name:o.item_name,rarity:o.rarity||'Common',payload:o.payload||{}}));
  transactions.filter(t=>t.category!=='gear').forEach(t=>map.set(commodityKey(t.category,t.item_key),{category:t.category,key:t.item_key,name:t.item_name,rarity:t.rarity||'Common',payload:t.payload||{}}));
  return [...map.values()];
}
function filterState(){
  return{
    q:($('#tpSearch')?.value||'').trim().toLowerCase(),
    klass:$('#tpClass')?.value||'all',
    slot:$('#tpSlot')?.value||'all',
    rarity:$('#tpRarity')?.value||'all',
    minIlvl:Number($('#tpMinIlvl')?.value)||0,
    maxPrice:Number($('#tpMaxPrice')?.value)||0,
    sort:$('#tpSort')?.value||'price'
  };
}
function renderGold(){const el=$('#tpGold');if(el)el.textContent=gold(currentGold())}
function renderCategories(){
  const counts={
    all:activeGear().length+knownCommodities().length,
    gear:activeGear().length,
    material:knownCommodities().filter(x=>x.category==='material').length,
    consumable:knownCommodities().filter(x=>x.category==='consumable').length,
    recipe:knownCommodities().filter(x=>x.category==='recipe').length
  };
  $$('#tpCategories [data-category]').forEach(b=>{const k=b.dataset.category;b.classList.toggle('active',k===activeCategory);const e=b.querySelector('em');if(e)e.textContent=counts[k]||0});
}
function sortGear(rows,sort){
  rows=[...rows];
  if(sort==='price')rows.sort((a,b)=>a.unit_price-b.unit_price);
  else if(sort==='price-desc')rows.sort((a,b)=>b.unit_price-a.unit_price);
  else if(sort==='ilvl')rows.sort((a,b)=>(b.item_level||b.payload?.itemLevel||0)-(a.item_level||a.payload?.itemLevel||0));
  else if(sort==='new')rows.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  return rows;
}
function browseRows(){
  const f=filterState(),rows=[];
  if(activeCategory==='all'||activeCategory==='gear'){
    let gear=activeGear().filter(l=>{
      const g=gearFor(l),text=[l.item_name,l.item_class,l.slot,l.rarity,...(G?.statLines?.(g)||[]).map(s=>s.text),g.uniqueEffect?.name,g.uniqueEffect?.description].filter(Boolean).join(' ').toLowerCase();
      if(f.q&&!text.includes(f.q))return false;
      if(f.klass!=='all'&&String(l.item_class||g.class)!==f.klass)return false;
      if(f.slot!=='all'&&String(l.slot||g.slot)!==f.slot)return false;
      if(f.rarity!=='all'&&rarityOf(l)!==f.rarity)return false;
      if(f.minIlvl&&Number(l.item_level||g.itemLevel||0)<f.minIlvl)return false;
      if(f.maxPrice&&Number(l.unit_price)>f.maxPrice)return false;
      return true;
    });
    gear=sortGear(gear,f.sort);
    gear.forEach(l=>rows.push({kind:'gear',data:l}));
  }
  if(activeCategory!=='gear'){
    let comm=knownCommodities().filter(x=>{
      if(activeCategory!=='all'&&x.category!==activeCategory)return false;
      if(f.q&&!([x.name,x.category,x.rarity].join(' ').toLowerCase().includes(f.q)))return false;
      if(f.rarity!=='all'&&x.rarity!==f.rarity)return false;
      const q=quoteFor(x.category,x.key),p=q.sell||q.buy||q.avg7||0;
      if(f.maxPrice&&p>f.maxPrice)return false;
      return true;
    });
    comm.sort((a,b)=>{
      const qa=quoteFor(a.category,a.key),qb=quoteFor(b.category,b.key);
      if(f.sort==='price-desc')return (qb.sell||qb.avg7||0)-(qa.sell||qa.avg7||0);
      if(f.sort==='new')return 0;
      return (qa.sell||qa.avg7||999999999)-(qb.sell||qb.avg7||999999999);
    });
    comm.forEach(x=>rows.push({kind:'commodity',data:x}));
  }
  return rows;
}
function renderStats(rows){
  const root=$('#tpMarketStats');if(!root)return;
  const gearCount=rows.filter(x=>x.kind==='gear').length,commCount=rows.filter(x=>x.kind==='commodity').length;
  const volume=transactions.filter(t=>new Date(t.created_at).getTime()>now()-86400000).reduce((n,t)=>n+Number(t.gross_gold||0),0);
  const trades=transactions.filter(t=>new Date(t.created_at).getTime()>now()-86400000).length;
  root.innerHTML='<div><span>Results</span><b>'+qty(rows.length)+'</b></div><div><span>Equipment</span><b>'+qty(gearCount)+'</b></div><div><span>Commodities</span><b>'+qty(commCount)+'</b></div><div><span>24h Trade Value</span><b>'+gold(volume)+'</b><small>'+trades+' trades</small></div>';
}
function gearCard(l){
  const g=gearFor(l),stats=G?.statLines?.(g)||[],rarity=rarityOf(l),ilvl=Number(l.item_level||g.itemLevel)||0;
  return '<article class="tp-result-card rarity-'+slug(rarity)+(selected?.kind==='gear'&&selected.id===l.id?' selected':'')+'" data-gear-id="'+esc(l.id)+'">'+
    '<div class="tp-result-art">'+gearArt(l,58)+'</div>'+
    '<div class="tp-result-copy"><small><span class="tp-rarity-'+slug(rarity)+'">'+esc(rarity)+'</span> · '+esc(l.item_class||g.class||'Any')+' · '+esc(l.slot||g.slot||'Gear')+'</small>'+
    '<h4>'+esc(l.item_name)+'</h4><p>Item Level '+ilvl+' · '+esc(l.seller_label||'Player Guild')+' · '+age(l.created_at)+'</p>'+
    (stats.length?'<div class="tp-stat-chips">'+stats.slice(0,4).map(s=>'<span>'+esc(s.text)+'</span>').join('')+'</div>':'')+'</div>'+
    '<div class="tp-price"><b>'+gold(l.unit_price)+'</b><small>'+ (mine(l.seller_id)?'Your listing':'Buy now') +'</small></div></article>';
}
function commodityCard(x){
  const q=quoteFor(x.category,x.key),rarity=x.rarity||'Common',tx=itemTransactions(x.category,x.key,7);
  const last=tx[0]?.unit_price||0,prev=tx[1]?.unit_price||last,move=last===prev?'':last>prev?'up':'down';
  return '<article class="tp-result-card tp-commodity-card rarity-'+slug(rarity)+(selected?.kind==='commodity'&&selected.category===x.category&&selected.key===x.key?' selected':'')+'" data-commodity="'+esc(x.category)+'|'+esc(x.key)+'">'+
    '<div class="tp-result-art">'+commodityArt(x.category,x.key,56)+'</div>'+
    '<div class="tp-result-copy"><small><span class="tp-rarity-'+slug(rarity)+'">'+esc(rarity)+'</span> · '+esc(x.category==='material'?'Reagent':x.category)+'</small><h4>'+esc(x.name)+'</h4>'+
    '<p><span>Sell '+(q.sell?gold(q.sell):'—')+'</span><span>Buy '+(q.buy?gold(q.buy):'—')+'</span><span>24h volume '+qty(q.vol24)+'</span></p></div>'+
    '<div class="tp-price"><b>'+(q.sell?gold(q.sell):q.avg7?gold(q.avg7):'No quote')+'</b><small class="tp-market-move '+move+'">'+(q.avg7?'7d avg '+gold(q.avg7):'No recent trades')+'</small></div></article>';
}
function renderBrowse(){
  const root=$('#tpBrowseResults');if(!root)return;
  const rows=browseRows();renderStats(rows);renderCategories();
  root.innerHTML=rows.length?rows.map(r=>r.kind==='gear'?gearCard(r.data):commodityCard(r.data)).join(''):'<div class="tp-empty">No market results match those filters.</div>';
  $$('[data-gear-id]',root).forEach(el=>el.onclick=()=>{selected={kind:'gear',id:el.dataset.gearId};renderBrowse();renderInspector()});
  $$('[data-commodity]',root).forEach(el=>el.onclick=()=>{const [category,key]=el.dataset.commodity.split('|');selected={kind:'commodity',category,key};renderBrowse();renderInspector()});
}
function historyChart(category,key){
  const rows=itemTransactions(category,key,30).slice(0,18).reverse();
  if(!rows.length)return'<div class="tp-mini-chart-empty">No completed trades yet</div>';
  const vals=rows.map(x=>Number(x.unit_price)||0),max=Math.max(...vals),min=Math.min(...vals),span=Math.max(1,max-min);
  return '<div class="tp-mini-chart">'+vals.map(v=>'<i title="'+gold(v)+'" style="height:'+(18+Math.round(((v-min)/span)*78))+'%"></i>').join('')+'</div>';
}
function orderLevels(rows,side){
  const map=new Map();
  rows.forEach(o=>map.set(o.unit_price,(map.get(o.unit_price)||0)+Number(o.quantity_remaining||0)));
  const arr=[...map.entries()].sort((a,b)=>side==='sell'?a[0]-b[0]:b[0]-a[0]).slice(0,6);
  return arr.length?arr.map(([p,q])=>'<div class="tp-order-row"><b>'+gold(p)+'</b><span>×'+qty(q)+'</span></div>').join(''):'<div class="tp-order-row"><span>No orders</span><span>—</span></div>';
}
function compatibleCompare(g){
  const roster=(state().roster||[]).filter(c=>c.class===g.class&&c.equipment);
  if(!roster.length)return'<div class="tp-empty">No compatible adventurer on your roster.</div>';
  let best=roster[0],current=best.equipment?.[g.slot];
  roster.forEach(c=>{const x=c.equipment?.[g.slot];if((x?.itemLevel||0)>(current?.itemLevel||0)){best=c;current=x}});
  const incoming=new Map((G?.statLines?.(g)||[]).map(s=>[s.key||s.label||s.text,Number(s.value)||0]));
  const existing=new Map((G?.statLines?.(current)||[]).map(s=>[s.key||s.label||s.text,Number(s.value)||0]));
  const keys=[...new Set([...incoming.keys(),...existing.keys()])];
  const diffs=keys.map(k=>{const d=(incoming.get(k)||0)-(existing.get(k)||0);return'<div><span>'+esc(k)+'</span><b class="'+(d>0?'positive':d<0?'negative':'')+'">'+(d>0?'+':'')+d+'</b></div>'}).join('');
  const ilvl=(Number(g.itemLevel)||0)-(Number(current?.itemLevel)||0);
  return'<div class="tp-gear-compare"><div><span>Compared with '+esc(best.name)+' · '+esc(current?.name||'Empty '+g.slot)+'</span><b class="'+(ilvl>0?'positive':ilvl<0?'negative':'')+'">'+(ilvl>0?'+':'')+ilvl+' iLvl</b></div>'+diffs+'</div>';
}
function isWatched(category,key){return watchlist.some(w=>w.category===category&&w.item_key===key)}
function gearInspector(l){
  const g=gearFor(l),rarity=rarityOf(l),stats=G?.statLines?.(g)||[];
  return '<div class="tp-inspector-content">'+
    '<div class="tp-inspector-hero"><div class="tp-inspector-art">'+gearArt(l,76)+'</div><div><small class="tp-rarity-'+slug(rarity)+'">'+esc(rarity)+' · '+esc(l.item_class||g.class||'Any')+'</small><h3>'+esc(l.item_name)+'</h3><p>'+esc(l.slot||g.slot||'Gear')+' · Item Level '+Number(l.item_level||g.itemLevel||0)+' · '+esc(l.seller_label||'Player Guild')+'</p></div></div>'+
    '<div><div class="tp-quote-grid"><div><span>Price</span><b>'+gold(l.unit_price)+'</b></div><div><span>Time left</span><b>'+(l.expires_at?timeLeft(l.expires_at):'48h')+'</b></div></div>'+
    '<div class="tp-inspector-section"><small>ITEM ROLL</small><div class="tp-stat-chips">'+(stats.length?stats.map(s=>'<span>'+esc(s.text)+'</span>').join(''):'<span>No rolled stats</span>')+'</div>'+(g.uniqueEffect?'<p>'+esc(g.uniqueEffect.name)+' · '+esc(g.uniqueEffect.description)+'</p>':'')+'</div>'+
    '<div class="tp-inspector-section"><small>YOUR COMPARISON</small>'+compatibleCompare(g)+'</div></div>'+
    '<div><div class="tp-inspector-section"><small>MARKET ACTIONS</small><div class="tp-action-row">'+
    (mine(l.seller_id)?'<button class="danger" data-cancel-gear="'+esc(l.id)+'">CANCEL LISTING</button>':'<button data-buy-gear="'+esc(l.id)+'">BUY FOR '+gold(l.unit_price)+'</button>')+
    '<button class="tp-watch '+(isWatched('gear',l.item_key)?'active':'')+'" data-watch="gear|'+esc(l.item_key)+'|'+esc(l.item_name)+'">'+(isWatched('gear',l.item_key)?'★ WATCHING':'☆ WATCH')+'</button></div></div>'+
    '<div class="tp-inspector-section"><small>RECENT SALES</small>'+historyChart('gear',l.item_key)+'</div></div></div>';
}
function commodityInspector(x){
  const q=quoteFor(x.category,x.key),rarity=x.rarity||'Common',owned=ownedCommodity(x.category,x.key);
  return '<div class="tp-inspector-content">'+
    '<div class="tp-inspector-hero"><div class="tp-inspector-art">'+commodityArt(x.category,x.key,76)+'</div><div><small class="tp-rarity-'+slug(rarity)+'">'+esc(rarity)+' · '+esc(x.category==='material'?'Reagent':x.category)+'</small><h3>'+esc(x.name)+'</h3><p>Owned '+qty(owned)+' · '+esc(x.payload?.source||'Player economy')+'</p></div></div>'+
    '<div><div class="tp-quote-grid"><div><span>Lowest Sell</span><b>'+(q.sell?gold(q.sell):'—')+'</b></div><div><span>Highest Buy</span><b>'+(q.buy?gold(q.buy):'—')+'</b></div><div><span>7d Average</span><b>'+(q.avg7?gold(q.avg7):'—')+'</b></div><div><span>24h Volume</span><b>'+qty(q.vol24)+'</b></div></div>'+
    '<div class="tp-inspector-section"><small>ORDER BOOK</small><div class="tp-orderbook"><div class="tp-orderbook-column"><h5>Sellers</h5>'+orderLevels(q.sells,'sell')+'</div><div class="tp-orderbook-column"><h5>Buyers</h5>'+orderLevels(q.buys,'buy')+'</div></div></div></div>'+
    '<div><div class="tp-inspector-section"><small>PLACE ORDER</small><form id="tpCommodityForm" class="tp-action-form" data-category="'+esc(x.category)+'" data-key="'+esc(x.key)+'"><label>Order<select id="tpOrderSide"><option value="buy">Buy</option><option value="sell">Sell</option></select></label><label>Quantity<input id="tpOrderQty" type="number" min="1" value="1"></label><label>Gold each<input id="tpOrderPrice" type="number" min="1" value="'+(q.sell||q.buy||q.avg7||1)+'"></label><label>Owned / Gold<input disabled value="'+qty(owned)+' / '+gold(currentGold())+'"></label><button type="submit">PLACE ORDER</button></form></div>'+
    '<div class="tp-inspector-section"><small>30 DAY PRICE ACTIVITY</small>'+historyChart(x.category,x.key)+'</div>'+
    '<div class="tp-inspector-section"><div class="tp-action-row"><button class="tp-watch '+(isWatched(x.category,x.key)?'active':'')+'" data-watch="'+esc(x.category)+'|'+esc(x.key)+'|'+esc(x.name)+'">'+(isWatched(x.category,x.key)?'★ WATCHING':'☆ WATCH')+'</button></div></div></div></div>';
}
function renderInspector(){
  const root=$('#tpInspector');if(!root)return;
  if(!selected){root.innerHTML='<div class="tp-inspector-empty">Select equipment or a commodity to inspect its price, order book, history and trading actions.</div>';return}
  if(selected.kind==='gear'){
    const l=listings.find(x=>x.id===selected.id);if(!l){selected=null;return renderInspector()}
    root.innerHTML=gearInspector(l);
  }else{
    const x=knownCommodities().find(v=>v.category===selected.category&&v.key===selected.key);if(!x){selected=null;return renderInspector()}
    root.innerHTML=commodityInspector(x);
  }
  bindInspector();
}
function ownedCommodity(category,key){
  if(category==='material')return Number(state().materials?.[key])||0;
  if(category==='consumable')return Number((state().consumables||[]).find(x=>x.key===key)?.quantity)||0;
  if(category==='recipe')return Number((state().recipeScrolls||[]).find(x=>x.recipeId===key)?.quantity)||0;
  return 0;
}
function bindInspector(){
  $$('[data-buy-gear]').forEach(b=>b.onclick=()=>buyGear(b.dataset.buyGear));
  $$('[data-cancel-gear]').forEach(b=>b.onclick=()=>cancelGear(b.dataset.cancelGear));
  $$('[data-watch]').forEach(b=>b.onclick=()=>toggleWatch(b.dataset.watch));
  const form=$('#tpCommodityForm');if(form)form.onsubmit=placeCommodityOrder;
}
async function buyGear(id){
  const l=listings.find(x=>x.id===id);if(!l||mine(l.seller_id))return;
  if(currentGold()<Number(l.unit_price)){alert('Not enough Gold.');return}
  const {error}=await db.rpc('purchase_trading_listing',{p_listing_id:id,p_quantity:1});
  if(error){alert(error.message||'Purchase failed');await refreshAll();return}
  location.reload();
}
async function cancelGear(id){
  const {error}=await db.rpc('market_cancel_listing',{p_listing_id:id});
  if(error){alert(error.message||'Could not cancel listing');return}
  location.reload();
}
async function placeCommodityOrder(e){
  e.preventDefault();
  const form=e.currentTarget,category=form.dataset.category,key=form.dataset.key;
  const x=knownCommodities().find(v=>v.category===category&&v.key===key);if(!x)return;
  const side=$('#tpOrderSide')?.value||'buy',quantity=Math.max(1,Math.floor(Number($('#tpOrderQty')?.value)||1)),price=Math.max(1,Math.floor(Number($('#tpOrderPrice')?.value)||1));
  if(side==='sell'&&quantity>ownedCommodity(category,key)){alert('You do not own that quantity.');return}
  if(side==='buy'&&quantity*price>currentGold()){alert('Not enough Gold to reserve this order.');return}
  const {error}=await db.rpc('market_place_commodity_order',{
    p_side:side,p_category:category,p_item_key:key,p_item_name:x.name,p_quantity:quantity,p_unit_price:price,p_payload:x.payload||{},p_rarity:x.rarity||'Common'
  });
  if(error){alert(error.message||'Order failed');return}
  location.reload();
}
async function toggleWatch(raw){
  const parts=raw.split('|'),category=parts[0],key=parts[1],name=parts.slice(2).join('|');
  const existing=watchlist.find(w=>w.category===category&&w.item_key===key);
  if(existing){
    await db.from('market_watchlist').delete().eq('user_id',user.id).eq('category',category).eq('item_key',key);
  }else{
    await db.from('market_watchlist').insert({user_id:user.id,category,item_key:key,item_name:name});
  }
  await refreshAll(false);renderInspector();renderWatchlist();
}
function renderWatchlist(){
  const root=$('#tpWatchlist');if(!root)return;
  root.innerHTML=watchlist.length?watchlist.map(w=>{
    let price=0,art='◇',rarity='Common';
    if(w.category==='gear'){const ls=activeGear().filter(l=>l.item_key===w.item_key).sort((a,b)=>a.unit_price-b.unit_price);price=ls[0]?.unit_price||0;art=ls[0]?gearArt(ls[0],46):'◇';rarity=ls[0]?rarityOf(ls[0]):'Common'}
    else{const x=knownCommodities().find(v=>v.category===w.category&&v.key===w.item_key),q=quoteFor(w.category,w.item_key);price=q.sell||q.avg7||0;art=commodityArt(w.category,w.item_key,46);rarity=x?.rarity||'Common'}
    return'<article class="tp-watch-card rarity-'+slug(rarity)+'"><div>'+art+'</div><div><h4>'+esc(w.item_name)+'</h4><small>'+esc(w.category)+' · '+esc(rarity)+'</small></div><strong>'+(price?gold(price):'—')+'</strong><button data-remove-watch="'+esc(w.category)+'|'+esc(w.item_key)+'">REMOVE</button></article>'
  }).join(''):'<div class="tp-empty">Your watchlist is empty. Watch an item from the market inspector.</div>';
  $$('[data-remove-watch]',root).forEach(b=>b.onclick=async()=>{const[c,k]=b.dataset.removeWatch.split('|');await db.from('market_watchlist').delete().eq('user_id',user.id).eq('category',c).eq('item_key',k);await refreshAll(false);renderWatchlist();renderInspector()});
}
function renderHistory(){
  const root=$('#tpHistory');if(!root)return;
  root.innerHTML=transactions.length?transactions.slice(0,120).map(t=>{
    const role=mine(t.buyer_id)?'BOUGHT':mine(t.seller_id)?'SOLD':'MARKET';
    return'<div class="tp-history-row"><div><b>'+esc(t.item_name)+' ×'+qty(t.quantity)+'</b><small>'+role+' · '+esc(t.category)+' · '+age(t.created_at)+' · '+gold(t.unit_price)+' each</small></div><strong>'+gold(t.gross_gold)+'</strong></div>'
  }).join(''):'<div class="tp-empty">No completed market trades yet.</div>';
}
function myGearListings(){return activeGear().filter(l=>mine(l.seller_id))}
function myOrders(){return orders.filter(o=>mine(o.user_id)&&o.status==='active')}
function renderMyTrading(){
  const gearRoot=$('#tpMyGear'),orderRoot=$('#tpMyOrders');if(!gearRoot||!orderRoot)return;
  const gl=myGearListings();
  gearRoot.innerHTML=gl.length?gl.map(l=>'<div class="tp-my-row"><div><b>'+esc(l.item_name)+'</b><small>'+qty(l.quantity)+' listed · '+gold(l.unit_price)+' each · '+age(l.created_at)+'</small></div><button data-cancel-my-gear="'+esc(l.id)+'">CANCEL</button></div>').join(''):'<div class="tp-empty">No equipment listings.</div>';
  const os=myOrders();
  orderRoot.innerHTML=os.length?os.map(o=>'<div class="tp-my-row"><div><b>'+esc(o.item_name)+' · '+o.side.toUpperCase()+'</b><small>'+qty(o.quantity_remaining)+' / '+qty(o.quantity_initial)+' remaining · '+gold(o.unit_price)+' each</small></div><button data-cancel-order="'+esc(o.id)+'">CANCEL</button></div>').join(''):'<div class="tp-empty">No active commodity orders.</div>';
  $$('[data-cancel-my-gear]',gearRoot).forEach(b=>b.onclick=()=>cancelGear(b.dataset.cancelMyGear));
  $$('[data-cancel-order]',orderRoot).forEach(b=>b.onclick=()=>cancelOrder(b.dataset.cancelOrder));
  renderGearSellOptions();
}
async function cancelOrder(id){
  const {error}=await db.rpc('market_cancel_commodity_order',{p_order_id:id});
  if(error){alert(error.message||'Could not cancel order');return}
  location.reload();
}
function renderGearSellOptions(){
  const sel=$('#tpGearSellItem');if(!sel)return;
  const items=(state().bank||[]).filter(x=>(x.tradeState||'tradeable')!=='soulbound');
  sel.innerHTML=items.length?items.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+' · '+esc(x.rarity||'Common')+' · iLvl '+Number(x.itemLevel||0)+' · ×'+Number(x.quantity||1)+'</option>').join(''):'<option value="">No tradeable equipment in Bank</option>';
}
async function submitGearListing(e){
  e.preventDefault();
  const id=$('#tpGearSellItem')?.value,item=(state().bank||[]).find(x=>x.id===id);if(!item)return;
  const price=Math.max(1,Math.floor(Number($('#tpGearSellPrice')?.value)||1)),quantity=Math.max(1,Math.min(Number(item.quantity)||1,Math.floor(Number($('#tpGearSellQty')?.value)||1))),duration=Math.max(24,Math.min(72,Number($('#tpGearDuration')?.value)||48));
  const {error}=await db.rpc('market_create_listing',{
    p_category:'gear',p_item_id:item.id,p_item_key:item.itemId||item.name,p_item_name:item.name,p_quantity:quantity,p_unit_price:price,p_payload:item,p_duration_hours:duration
  });
  if(error){alert(error.message||'Listing failed');return}
  location.reload();
}
function renderDelivery(){
  const count=(state().tradeInbox||[]).length,pending=proceeds.filter(p=>!p.claimed).reduce((n,p)=>n+Number(p.net_gold||0),0);
  const c=$('#tpDeliveryCount'),p=$('#tpPendingGold');if(c)c.textContent=count+' delivery'+(count===1?'':'ies')+' waiting';if(p)p.textContent=pending?gold(pending)+' sale proceeds ready':'No sale proceeds waiting';
  const claimItems=$('#tpClaimItems'),claimGold=$('#tpClaimGold');
  if(claimItems){claimItems.disabled=!count;claimItems.textContent=count?'CLAIM '+count+' DELIVERY'+(count===1?'':'IES'):'NO DELIVERIES'}
  if(claimGold){claimGold.disabled=!pending;claimGold.textContent=pending?'CLAIM '+gold(pending):'NO GOLD TO CLAIM'}
}
async function claimItems(){
  const fn=window.CellboundEconomy?.processInbox;if(!fn){alert('Delivery service is still loading.');return}
  const did=await fn();if(did)location.reload();
}
async function claimGold(){
  const fn=window.CellboundEconomy?.claimProceeds;if(!fn){alert('Trading service is still loading.');return}
  const n=await fn();if(n>0)location.reload();
}
function renderSaved(){
  const root=$('#tpSavedSearches');if(!root)return;
  root.innerHTML=savedSearches.length?savedSearches.map(s=>'<div class="tp-saved-item"><button data-saved="'+esc(s.id)+'">'+esc(s.name)+'</button><button data-delete-saved="'+esc(s.id)+'">×</button></div>').join(''):'<div class="tp-empty">No saved searches.</div>';
  $$('[data-saved]',root).forEach(b=>b.onclick=()=>applySaved(b.dataset.saved));
  $$('[data-delete-saved]',root).forEach(b=>b.onclick=async()=>{await db.from('market_saved_searches').delete().eq('id',b.dataset.deleteSaved).eq('user_id',user.id);await refreshAll(false);renderSaved()});
}
async function saveSearch(){
  const f=filterState(),name=prompt('Name this saved search',f.q||'Market search');if(!name)return;
  const {error}=await db.from('market_saved_searches').insert({user_id:user.id,name:name.slice(0,50),filters:{...f,category:activeCategory}});
  if(error){alert(error.message||'Could not save search');return}
  await refreshAll(false);renderSaved();
}
function applySaved(id){
  const s=savedSearches.find(x=>x.id===id);if(!s)return;const f=s.filters||{};
  activeCategory=f.category||'all';
  if($('#tpSearch'))$('#tpSearch').value=f.q||'';
  if($('#tpClass'))$('#tpClass').value=f.klass||'all';
  if($('#tpSlot'))$('#tpSlot').value=f.slot||'all';
  if($('#tpRarity'))$('#tpRarity').value=f.rarity||'all';
  if($('#tpMinIlvl'))$('#tpMinIlvl').value=f.minIlvl||'';
  if($('#tpMaxPrice'))$('#tpMaxPrice').value=f.maxPrice||'';
  if($('#tpSort'))$('#tpSort').value=f.sort||'price';
  setTab('browse');renderBrowse();
}
function setTab(tab){
  activeTab=tab;
  $$('#tpTabs [data-tp-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tpTab===tab));
  $$('.tp-view').forEach(v=>v.hidden=v.dataset.tpView!==tab);
  if(tab==='browse')renderBrowse();
  if(tab==='my')renderMyTrading();
  if(tab==='watch')renderWatchlist();
  if(tab==='history')renderHistory();
}
async function refreshAll(showBusy=true){
  if(!db||!user)return;
  if(showBusy){const b=$('#tpRefresh');if(b){b.disabled=true;b.textContent='REFRESHING…'}}
  await db.rpc('market_sweep_my_expired');
  const [l,o,t,w,s,p]=await Promise.all([
    db.from('trading_post_listings').select('*').order('created_at',{ascending:false}).limit(300),
    db.from('market_commodity_orders').select('*').order('created_at',{ascending:false}).limit(600),
    db.from('market_transactions').select('*').order('created_at',{ascending:false}).limit(300),
    db.from('market_watchlist').select('*').eq('user_id',user.id),
    db.from('market_saved_searches').select('*').eq('user_id',user.id).order('created_at',{ascending:false}),
    db.from('trading_post_proceeds').select('*').eq('seller_id',user.id).order('created_at',{ascending:false}).limit(200)
  ]);
  listings=l.data||[];orders=o.data||[];transactions=t.data||[];watchlist=w.data||[];savedSearches=s.data||[];proceeds=p.data||[];
  loaded=true;renderGold();renderDelivery();renderSaved();renderCategories();setTab(activeTab);renderInspector();
  const b=$('#tpRefresh');if(b){b.disabled=false;b.textContent='REFRESH MARKET'}
}
function bind(){
  $('#tpRefresh')?.addEventListener('click',()=>refreshAll());
  $('#tpSearch')?.addEventListener('input',renderBrowse);
  ['tpClass','tpSlot','tpRarity','tpMinIlvl','tpMaxPrice','tpSort'].forEach(id=>$('#'+id)?.addEventListener('change',renderBrowse));
  $$('#tpCategories [data-category]').forEach(b=>b.onclick=()=>{activeCategory=b.dataset.category;renderBrowse()});
  $$('#tpTabs [data-tp-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tpTab));
  $('#tpSaveSearch')?.addEventListener('click',saveSearch);
  $('#tpClearFilters')?.addEventListener('click',()=>{activeCategory='all';['tpSearch','tpMinIlvl','tpMaxPrice'].forEach(id=>{if($('#'+id))$('#'+id).value=''});['tpClass','tpSlot','tpRarity'].forEach(id=>{if($('#'+id))$('#'+id).value='all'});if($('#tpSort'))$('#tpSort').value='price';renderBrowse()});
  $('#tpGearSellForm')?.addEventListener('submit',submitGearListing);
  $('#tpClaimItems')?.addEventListener('click',claimItems);
  $('#tpClaimGold')?.addEventListener('click',claimGold);
  window.addEventListener('cellbound:view-changed',e=>{if(e.detail?.view==='trading')refreshAll()});
}
async function init(){
  Game=window.CellboundGame;
  if(!Game?.ready){setTimeout(init,80);return}
  db=Game.getSupabase?.();user=Game.getUser?.();if(!db||!user)return;
  bind();renderGold();renderDelivery();renderGearSellOptions();
  if($('#trading')?.classList.contains('active'))await refreshAll();
  window.CellboundTradingPostV3={refresh:refreshAll,selectCommodity:(category,key)=>{selected={kind:'commodity',category,key};setTab('browse');renderInspector()}};
}
init();
})();