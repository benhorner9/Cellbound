(()=>{
'use strict';
const G=window.CellboundGear,root=document.getElementById('characterDetail');
if(!G||!root)return;
let scheduled=false;
function canonicalFrom(node){const name=node?.querySelector('b')?.textContent?.trim();return name&&name!=='Empty'?G.byName(name):null;}
function replaceIcon(holder,item,size){
  if(!holder||!item)return;
  const current=holder.querySelector('.gear-art');
  if(current?.getAttribute('aria-label')===item.name)return;
  holder.innerHTML=G.artHTML(item,size,'cb-gear-art');
}
function readQty(card){const old=card.querySelector('small')?.textContent||'';const match=old.match(/×\s*(\d+)/);return match?.[1]||'1';}
function decorate(){
  scheduled=false;
  root.querySelectorAll('.cb-equip-slot').forEach(slot=>{
    const item=canonicalFrom(slot);if(!item)return;
    slot.classList.remove('cb-tier-1','cb-tier-2','cb-tier-3','cb-tier-4','cb-tier-5');slot.classList.add(`cb-tier-${item.tier}`);
    replaceIcon(slot.querySelector('.cb-slot-icon'),item,48);
    const copy=slot.querySelector('.cb-slot-copy');
    if(copy&&!copy.querySelector('.gear-tier-copy'))copy.insertAdjacentHTML('beforeend',`<em class="gear-tier-copy">Tier ${item.tier} · ${item.rarity}</em>`);
  });
  root.querySelectorAll('.cb-current-item').forEach(card=>{
    const item=canonicalFrom(card);if(!item)return;
    card.classList.remove('cb-tier-1','cb-tier-2','cb-tier-3','cb-tier-4','cb-tier-5');card.classList.add(`cb-tier-${item.tier}`);replaceIcon(card.firstElementChild,item,52);
  });
  root.querySelectorAll('.cb-slot-options button').forEach(card=>{
    const item=canonicalFrom(card);if(!item)return;
    card.classList.remove('cb-tier-1','cb-tier-2','cb-tier-3','cb-tier-4','cb-tier-5');card.classList.add(`cb-tier-${item.tier}`);replaceIcon(card.firstElementChild,item,48);
    const small=card.querySelector('small');if(small&&!small.dataset.gearDecorated){small.textContent=`Tier ${item.tier} · ${item.rarity} · ×${readQty(card)}`;small.dataset.gearDecorated='1';}
  });
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(decorate);}
const observer=new MutationObserver(schedule);
observer.observe(root,{childList:true,subtree:true});
schedule();
})();