(()=>{
'use strict';
const G=window.CellboundGear,root=document.getElementById('characterDetail');
if(!G||!root)return;
function canonicalFrom(node){const name=node?.querySelector('b')?.textContent?.trim();return name&&name!=='Empty'?G.byName(name):null;}
function replaceIcon(holder,item,size){if(!holder||!item)return;holder.innerHTML=G.artHTML(item,size,'cb-gear-art');}
function decorate(){
  root.querySelectorAll('.cb-equip-slot').forEach(slot=>{
    const item=canonicalFrom(slot);if(!item)return;
    slot.classList.remove('cb-tier-1','cb-tier-2','cb-tier-3');slot.classList.add(`cb-tier-${item.tier}`);
    replaceIcon(slot.querySelector('.cb-slot-icon'),item,48);
    const copy=slot.querySelector('.cb-slot-copy');if(copy&&!copy.querySelector('.gear-tier-copy'))copy.insertAdjacentHTML('beforeend',`<em class="gear-tier-copy">Tier ${item.tier} · ${item.rarity}</em>`);
  });
  root.querySelectorAll('.cb-current-item').forEach(card=>{const item=canonicalFrom(card);if(!item)return;card.classList.add(`cb-tier-${item.tier}`);replaceIcon(card.firstElementChild,item,52);});
  root.querySelectorAll('.cb-slot-options button').forEach(card=>{const item=canonicalFrom(card);if(!item)return;card.classList.add(`cb-tier-${item.tier}`);replaceIcon(card.firstElementChild,item,48);const small=card.querySelector('small');if(small)small.textContent=`Tier ${item.tier} · ${item.rarity} · ×${readQty(card)}`;});
}
function readQty(card){const old=card.querySelector('small')?.textContent||'';const match=old.match(/×\s*(\d+)/);return match?.[1]||'1';}
const observer=new MutationObserver(()=>requestAnimationFrame(decorate));observer.observe(root,{childList:true,subtree:true});decorate();
})();