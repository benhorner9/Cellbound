(()=>{
'use strict';
const root=document.getElementById('characterDetail');
const G=window.CellboundGear;
if(!root||!G)return;
let scheduled=false;

function findCharacter(){
  const name=root.querySelector('.cb-stage-name b,.cb-sheet-header h2')?.textContent?.trim();
  const state=window.CellboundGame?.getState?.();
  return state?.roster?.find(c=>c.name===name)||null;
}
function maxHealth(c){
  const ilvl=window.CellboundGame?.characterItemLevel?.(c)||0;
  const role=(c.spec==='Protection')?'tank':(c.spec==='Holy'||c.spec==='Restoration')?'healer':'dps';
  return Math.round(100+(Number(c.level)||1)*28+ilvl*5+(role==='tank'?90:role==='healer'?30:50));
}
function professionCards(c){
  const ent=window.CellboundGame?.getEntitlements?.()||{professionSlots:1,member:false};
  const slots=Math.max(1,ent.professionSlots||1),items=Array.isArray(c.professions)?c.professions:[null,null];
  const cards=[];
  for(let i=0;i<2;i++){
    if(i>=slots){cards.push(`<div class="cb-profession-slot locked"><small>Profession ${i+1}</small><b>Membership Slot</b><span>Unlocks with membership</span></div>`);continue;}
    const p=items[i];cards.push(`<div class="cb-profession-slot"><small>Profession ${i+1}</small><b>${p?.name||'Unlearned'}</b><span>${p?.level?`Level ${p.level}`:'Choose a profession in a future update'}</span></div>`);
  }
  return cards.join('');
}
function visualPiece(item,cls,size){
  if(!item)return'';return `<div class="cb-worn-gear ${cls}" title="${item.name}">${G.artHTML(item,size,'cb-worn-art')}<span>${item.name}</span></div>`;
}
function decorate(){
  scheduled=false;const c=findCharacter();if(!c)return;
  const ilvl=window.CellboundGame?.characterItemLevel?.(c)||0;
  const locked=window.CellboundGame?.isUnavailable?.(c)||false;
  const remaining=window.CellboundGame?.formatRecovery?.(c)||'';
  const shock=Math.round(Number(c.cellShock)||0);
  const ent=window.CellboundGame?.getEntitlements?.()||{professionSlots:1};
  const headerP=root.querySelector('.cb-sheet-header p');
  if(headerP){const text=`${c.class} · ${c.spec} · Power ${c.power} · Item Level ${ilvl}`;if(headerP.textContent!==text)headerP.textContent=text;}

  root.querySelectorAll('.cb-equip-slot').forEach(slot=>{
    const slotName=slot.dataset.slot,item=c.equipment?.[slotName];
    const copy=slot.querySelector('.cb-slot-copy');
    if(item&&copy){
      let line=copy.querySelector('.cb-ilvl-copy');
      if(!line){line=document.createElement('em');line.className='cb-ilvl-copy';copy.appendChild(line);}
      const text=`Item Level ${item.itemLevel||0}`;if(line.textContent!==text)line.textContent=text;
    }
  });

  const stage=root.querySelector('.cb-avatar-stage');
  if(stage){
    let visual=stage.querySelector('.cb-worn-layer');
    const signature=[c.equipment?.Head?.name,c.equipment?.Chest?.name,c.equipment?.Weapon?.name].join('|');
    if(!visual){visual=document.createElement('div');visual.className='cb-worn-layer';stage.appendChild(visual);}
    if(visual.dataset.signature!==signature){
      visual.dataset.signature=signature;
      visual.innerHTML=visualPiece(c.equipment?.Head,'worn-head',72)+visualPiece(c.equipment?.Chest,'worn-chest',84)+visualPiece(c.equipment?.Weapon,'worn-weapon',76);
    }
    stage.dataset.gearTier=String(Math.max(c.equipment?.Head?.tier||1,c.equipment?.Chest?.tier||1,c.equipment?.Weapon?.tier||1));
  }

  const body=root.querySelector('.cb-sheet-body');
  if(body){
    const foundationHTML=`<div class="cb-foundation-stats"><div><small>Health</small><b>${maxHealth(c).toLocaleString()}</b></div><div><small>Item Level</small><b>${ilvl}</b></div><div><small>Cell Shock</small><b class="${shock>=75?'danger':''}">${shock}%</b><span>${locked?`Recovering · ${remaining}`:'Ready for duty'}</span></div><div><small>Profession Capacity</small><b>${ent.professionSlots}</b><span>${ent.member?'Member':'Standard'} roster rules</span></div></div><div class="cb-profession-grid">${professionCards(c)}</div>`;
    let panel=body.querySelector('.cb-foundation-panel');
    if(!panel){panel=document.createElement('section');panel.className='cb-foundation-panel';panel.innerHTML=foundationHTML;const paper=body.querySelector('.cb-paperdoll');if(paper)paper.insertAdjacentElement('afterend',panel);else body.prepend(panel);}
    else if(panel.innerHTML!==foundationHTML)panel.innerHTML=foundationHTML;
  }
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(decorate);}
new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
schedule();
})();
