(()=>{
'use strict';

const ACTIVE_TYPES=new Set(['BUFF_APPLIED','DEBUFF_APPLIED','BUFF_REMOVED','DEBUFF_REMOVED']);
const hosts=new Set();
let tooltip=null,ticker=null;

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const slug=v=>String(v||'status').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const pct=v=>Math.round(Number(v||0)*100);
function iconFor(name,kind){
 const n=String(name||'').toLowerCase();
 if(/shield|defensive|guard|barrier|fortif|stand/.test(n))return'◆';
 if(/renew|heal|mercy|rejuven|regen/.test(n))return'✚';
 if(/frenzy|rage|blood|wrath/.test(n))return'✦';
 if(/stun|control|root|slow|snare/.test(n))return'⛓';
 if(/poison|venom|toxin/.test(n))return'☠';
 if(/burn|fire|flame|ember/.test(n))return'♨';
 if(/bleed|wound|agony/.test(n))return'†';
 if(/weak|vulner|frail|curse|despair/.test(n))return'▼';
 return kind==='debuff'?'▼':'▲'
}
function effectText(st){
 const e=st?.effect||{},bits=[];
 if(Number(e.damageReduction))bits.push('Damage taken −'+pct(e.damageReduction)+'%');
 if(Number(e.damageMultiplier))bits.push('Damage +'+pct(e.damageMultiplier)+'%');
 if(Number(e.healingMultiplier))bits.push('Healing +'+pct(e.healingMultiplier)+'%');
 if(Number(e.healingReduction))bits.push('Healing received −'+pct(e.healingReduction)+'%');
 if(Number(e.threatMultiplier))bits.push('Threat +'+pct(e.threatMultiplier)+'%');
 if(Number(e.healingOverTime))bits.push('Restores '+Number(e.healingOverTime)+' health periodically');
 if(st?.cc)bits.push(String(st.cc).replace(/-/g,' '));
 if(st?.breakOnDamage)bits.push('Breaks on damage');
 return bits.length?bits.join(' · '):(st?.kind==='debuff'?'Harmful combat effect':'Beneficial combat effect')
}
function sourceName(source,opts){
 if(!source)return'Unknown';
 try{
  const label=opts?.sourceName?.(source);
  if(label)return label
 }catch{}
 const el=opts?.resolve?.(source);
 const node=Array.isArray(el)?el[0]:el;
 const txt=node?.querySelector?.('span,small,b')?.textContent?.trim();
 return txt||String(source).replace(/^p-|^e-/,'')
}
function ensureTooltip(){
 if(tooltip&&tooltip.isConnected)return tooltip;
 tooltip=document.createElement('div');tooltip.className='cbs-tooltip';tooltip.hidden=true;document.body.appendChild(tooltip);
 document.addEventListener('pointerdown',e=>{if(!tooltip.hidden&&!e.target.closest?.('.cbs-icon')&&!e.target.closest?.('.cbs-tooltip'))tooltip.hidden=true},{passive:true});
 return tooltip
}
function showTooltip(button,st){
 const tip=ensureTooltip(),remaining=Math.max(0,Number(button.dataset.remaining)||0);
 tip.innerHTML='<div class="cbs-tooltip-head"><i class="'+st.kind+'">'+esc(iconFor(st.name,st.kind))+'</i><span><small>'+esc(st.kind.toUpperCase())+'</small><b>'+esc(st.name)+'</b></span></div><p>'+esc(effectText(st))+'</p><div><span>Source <b>'+esc(st.sourceLabel||'Unknown')+'</b></span><span>Stacks <b>'+Math.max(1,Number(st.stacks)||1)+'</b></span><span>Remaining <b>'+((remaining/1000).toFixed(1))+'s</b></span></div>';
 const r=button.getBoundingClientRect();tip.hidden=false;
 requestAnimationFrame(()=>{
  const w=tip.offsetWidth||250,h=tip.offsetHeight||120;
  tip.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px';
  tip.style.top=Math.max(8,r.top-h-8)+'px'
 })
}
function stripFor(host,mirror=false){
 if(!host)return null;
 host.classList.add('cbs-host');hosts.add(host);
 let strip=host.querySelector(':scope > .cbs-strip');
 if(!strip){strip=document.createElement('div');strip.className='cbs-strip'+(mirror?' mirror':'');strip.innerHTML='<span class="cbs-group buffs"></span><span class="cbs-group debuffs"></span>';host.appendChild(strip)}
 if(mirror)strip.classList.add('mirror');
 return strip
}
function statusMap(host){
 if(!host.__cellboundStatuses)host.__cellboundStatuses=new Map();
 return host.__cellboundStatuses
}
function normaliseStatus(e){
 const raw=Array.isArray(e.statusEffects)&&e.statusEffects[0]?e.statusEffects[0]:{};
 const kind=e.type.startsWith('DEBUFF')?'debuff':e.type.startsWith('BUFF')?'buff':(raw.kind==='debuff'?'debuff':'buff');
 return{
  id:raw.id||slug(e.ability||'status'),name:raw.name||e.ability||'Status',kind,
  stacks:Math.max(1,Number(raw.stacks)||1),duration:Math.max(0,Number(raw.duration)||0),
  expiresAt:Number(raw.expiresAt)||0,source:raw.source||e.source||null,effect:raw.effect||{},
  cc:raw.cc||null,breakOnDamage:!!raw.breakOnDamage
 }
}
function renderHost(host,opts={}){
 const map=statusMap(host),strip=stripFor(host,!!opts.mirror),now=performance.now(),speed=Math.max(.25,Number(opts.speed?.()??opts.speed)||1);
 const all=[...map.values()].filter(x=>!x.endReal||x.endReal>now);
 map.forEach((v,k)=>{if(v.endReal&&v.endReal<=now)map.delete(k)});
 const draw=(kind,root)=>{
  const list=all.filter(x=>x.kind===kind).sort((a,b)=>(a.endReal||Infinity)-(b.endReal||Infinity)),shown=list.slice(0,4);
  root.innerHTML=shown.map(st=>{
   const remain=st.endReal?Math.max(0,st.endReal-now):0,sec=st.endReal?Math.max(1,Math.ceil(remain/1000)):'∞';
   return '<button type="button" class="cbs-icon '+kind+'" data-cbs-id="'+esc(st.id)+'" data-remaining="'+remain+'" aria-label="'+esc(st.name)+'"><i>'+esc(iconFor(st.name,kind))+'</i><small>'+sec+'</small>'+(st.stacks>1?'<b>'+st.stacks+'</b>':'')+'</button>'
  }).join('')+(list.length>4?'<span class="cbs-more '+kind+'">+'+(list.length-4)+'</span>':'');
  root.querySelectorAll('.cbs-icon').forEach(b=>b.addEventListener('click',ev=>{ev.stopPropagation();const st=map.get(b.dataset.cbsId);if(st)showTooltip(b,st)}))
 };
 draw('buff',strip.querySelector('.buffs'));draw('debuff',strip.querySelector('.debuffs'));
 strip.hidden=!all.length;
}
function targetsFor(id,opts={}){
 let arr=[];
 try{const v=opts.resolve?.(id);arr=Array.isArray(v)?v:[v]}catch{}
 arr=arr.filter(Boolean).map(x=>({el:x.el||x,mirror:!!x.mirror})).filter(x=>x.el);
 return arr
}
function handle(e,opts={}){
 if(!e||!ACTIVE_TYPES.has(e.type))return false;
 const st=normaliseStatus(e),remove=e.type.endsWith('_REMOVED'),speed=Math.max(.25,Number(opts.speed?.()??opts.speed)||1);
 targetsFor(e.target,opts).forEach(({el,mirror})=>{
  const map=statusMap(el);
  if(remove)map.delete(st.id);
  else{
   const remaining=st.expiresAt?Math.max(0,st.expiresAt-Number(e.timestamp||0)):st.duration;
   map.set(st.id,{...st,sourceLabel:sourceName(st.source,opts),endReal:remaining>0?performance.now()+remaining/speed:0})
  }
  renderHost(el,{...opts,mirror})
 });
 startTicker();
 return true
}
function clear(root=document){
 root.querySelectorAll?.('.cbs-host').forEach(el=>{el.__cellboundStatuses?.clear?.();const strip=el.querySelector(':scope > .cbs-strip');if(strip)strip.remove();hosts.delete(el)});
 if(tooltip)tooltip.hidden=true
}
function startTicker(){
 if(ticker)return;
 ticker=setInterval(()=>{
  if(!hosts.size){clearInterval(ticker);ticker=null;return}
  [...hosts].forEach(host=>{
   if(!host?.isConnected){hosts.delete(host);return}
   renderHost(host,{mirror:host.querySelector(':scope > .cbs-strip')?.classList.contains('mirror')})
  })
 },250)
}

window.CellboundCombatStatuses={handle,clear,renderHost,version:'1.0.0'};
})();