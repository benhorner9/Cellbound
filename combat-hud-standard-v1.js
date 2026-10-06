(()=>{
'use strict';

const VERSION='1.1.1';
const ACTIVE_SELECTOR='.cb2d-shell.cbstd-hud:not(.results-mode),.cb2d-shell.cbstd-ashen-frame:not(.results-mode)';
const COMMAND_ATTACK=new Set(['focus','interrupt','stack','burn']);
const COMMAND_DEFENCE=new Set(['spread','regroup','defensive','potion']);

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function visible(el){
  if(!el||!el.isConnected||el.hidden)return false;
  const backdrop=el.closest('.cb2d-backdrop,.hs2d-backdrop,.cc2d-backdrop,.bs2d-backdrop,.quest-cb2d-backdrop,.tb-backdrop');
  if(backdrop?.hidden)return false;
  return getComputedStyle(el).display!=='none'
}
function activeShell(){
  return [...document.querySelectorAll(ACTIVE_SELECTOR)].reverse().find(visible)||null
}
function normaliseId(v){
  let s=String(v||'').trim();
  if(s.startsWith('p-'))s=s.slice(2);
  return s
}
function rowId(row){
  if(!row)return'';
  const direct=row.dataset.cbstdPartyId||row.dataset.hsSideRow||row.dataset.ccSideRow||row.dataset.bsSideRow||row.dataset.qRow||row.dataset.tbSideRow||'';
  if(direct)return normaliseId(direct);
  const nested=row.querySelector('[data-td-side],[data-q-side-hp],[data-bs-side-hp],[data-cc-side-hp],[data-hs-side-hp],[data-tb-side-hp]');
  if(!nested)return'';
  return normaliseId(nested.dataset.tdSide||nested.dataset.qSideHp||nested.dataset.bsSideHp||nested.dataset.ccSideHp||nested.dataset.hsSideHp||nested.dataset.tbSideHp||'')
}
function ensureRowsHost(shell){
  const party=shell.querySelector('.cb2d-party');if(!party)return null;
  let host=party.querySelector(':scope > .cbstd-party-rows');
  if(host){host.classList.add('cbcombat-party-rows');return host;}
  const known=[...party.children].find(el=>el.querySelector?.('.cb2d-party-row'));
  if(known){known.classList.add('cbstd-party-rows','cbcombat-party-rows');return known}
  const direct=[...party.children].filter(el=>el.matches?.('.cb2d-party-row'));
  if(!direct.length)return null;
  host=document.createElement('div');host.className='cbstd-party-rows cbcombat-party-rows';
  direct[0].before(host);direct.forEach(row=>host.appendChild(row));
  return host
}
function partyRows(shell){
  const host=ensureRowsHost(shell),scope=host||shell.querySelector('.cb2d-party');
  return [...(scope?.querySelectorAll?.('.cb2d-party-row')||[])].filter(row=>{
    const id=rowId(row);if(!id)return false;row.dataset.cbstdPartyId=id;return true
  })
}
function rowName(row){
  return String(row?.querySelector('b')?.childNodes?.[0]?.textContent||row?.querySelector('b')?.textContent||rowId(row)||'ALLY').trim()
}
function findPartyRow(shell,id){
  const want=normaliseId(id);
  return partyRows(shell).find(row=>rowId(row)===want)||null
}
function targetNode(shell,id){
  const raw=String(id||'');
  const selectors=[
    '[data-unit="'+CSS.escape(raw)+'"]',
    '[data-hs="'+CSS.escape(raw)+'"]',
    '[data-cc="'+CSS.escape(raw)+'"]',
    '[data-q-unit="'+CSS.escape(raw)+'"]',
    '[data-tb-unit="'+CSS.escape(raw)+'"]',
    '[data-bs="'+CSS.escape(raw)+'"]'
  ];
  if(/^e-\d+$/.test(raw))selectors.push('[data-bs="'+CSS.escape(raw.replace('-',''))+'"]');
  if(raw.startsWith('tb-'))selectors.push('[data-tb-boss="'+CSS.escape(raw.slice(3))+'"]');
  for(const selector of selectors){const el=shell.querySelector(selector);if(el)return el}
  return null
}
function targetName(shell,id){
  if(!id)return'ACQUIRING';
  if(String(id).startsWith('p-')){
    const row=findPartyRow(shell,id);return rowName(row)||'ALLY'
  }
  const node=targetNode(shell,id),label=node?.querySelector(':scope > span,b,.cb2d-unit-label');
  const txt=String(label?.childNodes?.[0]?.textContent||label?.textContent||'').trim();
  if(txt)return txt;
  if(/^e-\d+$/.test(String(id)))return'ENEMY '+(Number(String(id).slice(2))+1);
  return String(id).replace(/^add-/,'ADD ').replace(/^e-/,'ENEMY ')
}
function initials(name){
  const p=String(name||'?').trim().split(/\s+/).filter(Boolean);
  return (p.length>1?(p[0][0]+p[p.length-1][0]):String(p[0]||'?').slice(0,2)).toUpperCase()
}
function ensureTarget(row){
  let target=row.querySelector(':scope > .cbstd-party-target');
  if(target)return target;
  target=document.createElement('div');target.className='cbstd-party-target cb2d-party-target';
  target.innerHTML='<i>—</i><span><small>TARGET</small><b>ACQUIRING</b></span>';
  row.appendChild(target);return target
}
function setTarget(shell,source,targetId){
  const row=findPartyRow(shell,source);if(!row)return;
  const target=ensureTarget(row),name=targetName(shell,targetId),friendly=String(targetId||'').startsWith('p-');
  target.classList.toggle('friendly',friendly);target.classList.toggle('hostile',!friendly);
  const icon=target.querySelector('i'),label=target.querySelector('b');
  if(icon)icon.textContent=targetId?initials(name):'—';
  if(label)label.textContent=name
}
function clearTargets(shell){
  partyRows(shell).forEach(row=>{
    const target=ensureTarget(row);target.classList.remove('friendly','hostile');
    const icon=target.querySelector('i'),label=target.querySelector('b');
    if(icon)icon.textContent='—';if(label)label.textContent='ACQUIRING'
  })
}
function commandId(button){
  if(!button)return'';
  const d=button.dataset;
  if(d.combatCommand)return d.combatCommand;
  if(d.hsOverride)return d.hsOverride==='consumable'?'potion':d.hsOverride;
  if(d.ccCommand)return d.ccCommand;
  if(d.ccOverride)return d.ccOverride==='consumable'?'potion':d.ccOverride;
  if(d.bsCommand)return d.bsCommand;
  if(d.qCommand)return d.qCommand;
  if(d.tbCommand)return d.tbCommand;
  if([...button.attributes].some(a=>/potion/i.test(a.name)))return'potion';
  const text=String(button.querySelector('b')?.textContent||button.textContent||'').toLowerCase();
  if(/interrupt/.test(text))return'interrupt';if(/focus/.test(text))return'focus';if(/spread/.test(text))return'spread';if(/stack/.test(text))return'stack';
  if(/regroup/.test(text))return'regroup';if(/defensive|defend/.test(text))return'defensive';if(/burn/.test(text))return'burn';if(/potion/.test(text))return'potion';
  return''
}
function organiseCommands(shell){
  const panel=shell.querySelector('.cbr-command-panel.cb2d-controls,.cb2d-controls.cbr-command-panel');if(!panel||panel.dataset.cbstdGrouped==='1')return;
  const buttons=[...panel.querySelectorAll('button')].filter(b=>COMMAND_ATTACK.has(commandId(b))||COMMAND_DEFENCE.has(commandId(b)));
  if(buttons.length<4)return;
  const groups=document.createElement('div');groups.className='cbstd-command-groups cbr-command-groups';
  const attack=document.createElement('section');attack.className='cbstd-command-group cbr-command-group attack';attack.innerHTML='<small>ATTACK / PRESSURE</small><div class="cbr-command-column"></div>';
  const defence=document.createElement('section');defence.className='cbstd-command-group cbr-command-group defence';defence.innerHTML='<small>DEFEND / RECOVER</small><div class="cbr-command-column"></div>';
  groups.append(attack,defence);
  buttons.forEach(b=>{
    const id=commandId(b);b.classList.add('cbr-command');(COMMAND_ATTACK.has(id)?attack:defence).querySelector('div').appendChild(b)
  });
  panel.appendChild(groups);panel.dataset.cbstdGrouped='1'
}
function orderMeters(shell){
  const meters=shell.querySelector('.cb2d-combat-meters');if(!meters)return;
  const desired=['threat','damage','healing'].map(type=>meters.querySelector('.cb2d-meter-panel.'+type)).filter(Boolean);
  const current=[...meters.children].filter(node=>node.matches?.('.cb2d-meter-panel'));
  if(desired.length===current.length&&desired.every((node,index)=>current[index]===node))return;
  desired.forEach(node=>meters.appendChild(node))
}
function ensurePetHost(shell){
  const party=shell.querySelector('.cb2d-party');if(!party)return null;
  let host=party.querySelector(':scope > .cbstd-pets');
  if(!host){host=document.createElement('div');host.className='cbstd-pets cbcombat-pet-rows';host.hidden=true;party.appendChild(host)}else host.classList.add('cbcombat-pet-rows')
  return host
}
function ownerName(shell,id){
  const row=findPartyRow(shell,id);return rowName(row)||'Party member'
}
function renderPets(shell){
  const host=ensurePetHost(shell);if(!host)return;
  const pets=[...(shell.__cbstdPets?.values?.()||[])];
  const party=shell.querySelector('.cb2d-party');
  if(!pets.length){
    host.hidden=true;host.innerHTML='';
    party?.classList.remove('cbstd-has-pets','cbstd-pets-dense','cbstd-pets-ultra');
    return
  }
  const grouped=new Map();
  pets.forEach(p=>{
    const key=[p.ownerId,p.type||p.name||p.id].join('|'),prev=grouped.get(key);
    if(prev){prev.count++;if(p.targetId)prev.targetId=p.targetId;if(p.action)prev.action=p.action}
    else grouped.set(key,{...p,count:1})
  });
  party?.classList.add('cbstd-has-pets');
  party?.classList.toggle('cbstd-pets-dense',grouped.size>=5);
  party?.classList.toggle('cbstd-pets-ultra',grouped.size>=9);
  host.hidden=false;
  host.innerHTML='<small>PETS / SUMMONS</small>'+[...grouped.values()].map(p=>{
    const t=targetName(shell,p.targetId);
    return '<div class="cbstd-pet-row cbcombat-pet-row"><i class="cbcombat-pet-icon">◆</i><span class="cbcombat-pet-main"><b>'+esc(p.name||'Summon')+(p.count>1?' ×'+p.count:'')+'</b><small>'+esc(ownerName(shell,p.ownerId))+(p.action?' · '+esc(p.action):'')+'</small></span><em class="cbcombat-pet-target"><small>TARGET</small><b>'+esc(t)+'</b></em></div>'
  }).join('')
}
function handlePet(shell,e){
  if(!shell.__cbstdPets)shell.__cbstdPets=new Map();
  const pets=shell.__cbstdPets,id=String(e?.payload?.petId||e?.target||e?.source||'');
  if(e.type==='PET_SUMMONED'){
    if(id)pets.set(id,{id,ownerId:String(e.payload?.ownerId||e.source||''),name:String(e.payload?.name||e.ability||'Summon'),type:String(e.payload?.petType||''),targetId:null,action:e.result==='permanent'?'Active':'Summoned'})
  }else if(e.type==='PET_DISMISSED'){
    if(id)pets.delete(id)
  }else if(String(e.source||'').startsWith('pet-')||e.payload?.pet===true){
    const pet=pets.get(String(e.source||''));if(pet){if(e.target)pet.targetId=e.target;if(e.ability)pet.action=String(e.ability)}
  }
  renderPets(shell)
}
function upgradeRows(shell){
  partyRows(shell).forEach(row=>{
    ensureTarget(row);
    const dot=row.querySelector(':scope > i.cb2d-dot');if(dot)dot.classList.add('cb2d-party-avatar');
    const main=[...row.children].find(node=>node.tagName==='SPAN'&&!node.classList.contains('cb2d-party-target'));if(main)main.classList.add('cb2d-party-main')
  });
  ensurePetHost(shell)
}
function adoptAshenFrame(shell){
  if(!shell||shell.dataset.cbstdFrame==='ashen-v2')return;
  const layout=shell.querySelector(':scope > .cb2d-layout,:scope > .cbcombat-grid'),main=layout?.querySelector(':scope > main'),legacyAside=layout?.querySelector(':scope > aside');
  const arena=main?.querySelector(':scope > .cb2d-arena')||shell.querySelector('.cb2d-arena');
  const party=legacyAside?.querySelector(':scope > .cb2d-party')||shell.querySelector('.cb2d-party');
  const meters=legacyAside?.querySelector(':scope > .cb2d-combat-meters')||shell.querySelector('.cb2d-combat-meters');
  const controls=main?.querySelector(':scope > .cb2d-controls')||layout?.querySelector('.cb2d-controls');
  if(!layout||!main||!legacyAside||!arena||!party||!meters||!controls)return;

  shell.classList.add('cbcombat-shell','cbcombat-standard-hud','cbstd-ashen-frame');
  shell.classList.remove('combat-hud-fullscreen','cbstd-hud');
  const backdrop=shell.closest('.cb2d-backdrop,.hs2d-backdrop,.cc2d-backdrop,.bs2d-backdrop,.quest-cb2d-backdrop,.tb-backdrop');
  backdrop?.classList.add('cbcombat-backdrop');

  const header=shell.querySelector(':scope > .cb2d-head,:scope > .cbcombat-header');
  if(header){
    header.classList.remove('cb2d-head');header.classList.add('cbcombat-header');
    header.firstElementChild?.classList.add('cbcombat-title');
    const live=header.querySelector('.cb2d-live');
    if(live){
      live.classList.remove('cb2d-live');live.classList.add('cbcombat-header-actions');
      let badge=live.querySelector('.cbcombat-live-dot');
      if(!badge){
        badge=document.createElement('span');badge.className='cbcombat-live-dot';badge.innerHTML='<i></i>LIVE';
        [...live.childNodes].filter(n=>n.nodeType===3||n.nodeName==='I').forEach(n=>n.remove());
        live.insertBefore(badge,live.firstChild)
      }
    }
  }

  let route=shell.querySelector(':scope > .cb2d-route,:scope > .cbcombat-route');
  if(route){route.classList.remove('cb2d-route');route.classList.add('cbcombat-route')}
  else{
    route=document.createElement('div');route.className='cbcombat-route cbstd-generated-route';
    const title=header?.querySelector('h2')?.textContent||'Combat';
    route.innerHTML='<span class="current"><i>◆</i>'+esc(title)+'</span>';
    if(header)header.after(route);else shell.prepend(route)
  }

  layout.classList.remove('cb2d-layout');layout.classList.add('cbcombat-grid','cbstd-promoted-grid');

  const left=document.createElement('div');left.className='cbcombat-left-column cbstd-adopted-left';
  const partyPanel=document.createElement('section');partyPanel.className='cbcombat-panel cbcombat-party-panel';
  party.classList.add('cbcombat-party');partyPanel.appendChild(party);left.appendChild(partyPanel);

  const battle=document.createElement('main');battle.className='cbcombat-panel cbcombat-battle-panel cbstd-adopted-battle';
  const topbar=document.createElement('div');topbar.className='cbcombat-battle-topbar';
  const room=arena.querySelector('.cb2d-room-tag'),legend=arena.querySelector('.cb2d-ground-legend');
  if(room)topbar.appendChild(room);if(legend)topbar.appendChild(legend);if(topbar.childElementCount)battle.appendChild(topbar);
  const cast=legacyAside.querySelector(':scope > .cb2d-cast')||shell.querySelector('.cb2d-cast');
  if(cast){cast.classList.add('cbcombat-cast');arena.appendChild(cast)}
  arena.classList.add('cbcombat-arena');battle.appendChild(arena);

  const right=document.createElement('aside');right.className='cbcombat-right-column cbstd-adopted-right';
  const meterPanel=document.createElement('section');meterPanel.className='cbcombat-panel cbcombat-meters-panel';
  meters.classList.add('cbcombat-meter-stack');meterPanel.appendChild(meters);right.appendChild(meterPanel);
  controls.classList.add('cbcombat-panel','cbcombat-command-panel');right.appendChild(controls);

  main.classList.add('cbstd-legacy-extras');legacyAside.classList.add('cbstd-legacy-extras');
  layout.append(left,battle,right);
  shell.dataset.cbstdFrame='ashen-v2'
}
function upgrade(shell){
  if(!shell||!shell.matches?.(ACTIVE_SELECTOR))return;
  shell.classList.add('cbstd-mounted');orderMeters(shell);organiseCommands(shell);upgradeRows(shell);adoptAshenFrame(shell)
}
function upgradeAll(root=document){
  if(root?.matches?.(ACTIVE_SELECTOR))upgrade(root);
  root?.querySelectorAll?.(ACTIVE_SELECTOR).forEach(upgrade)
}
function combatEvent(detail){
  const shell=activeShell(),e=detail?.event;if(!shell||!e)return;
  if(e.type==='COMBAT_START'){shell.__cbstdPets=new Map();clearTargets(shell);renderPets(shell);return}
  if(e.type==='PET_SUMMONED'||e.type==='PET_DISMISSED'||String(e.source||'').startsWith('pet-')||e.payload?.pet===true)handlePet(shell,e);
  if(['ABILITY_START','DAMAGE_DEALT','HEAL_RECEIVED'].includes(e.type)&&String(e.source||'').startsWith('p-')&&e.target)setTarget(shell,e.source,e.target);
  if(e.type==='PLAYER_DEFEATED'&&String(e.target||'').startsWith('p-'))setTarget(shell,e.target,null)
}
window.addEventListener('cellbound:combat-event',e=>combatEvent(e.detail));
const observer=new MutationObserver(records=>{
  const shells=new Set();
  records.forEach(r=>{
    const host=r.target?.closest?.(ACTIVE_SELECTOR);if(host)shells.add(host);
    r.addedNodes.forEach(n=>{
      if(n.nodeType!==1)return;
      if(n.matches?.(ACTIVE_SELECTOR))shells.add(n);
      n.querySelectorAll?.(ACTIVE_SELECTOR).forEach(s=>shells.add(s));
      const parent=n.closest?.(ACTIVE_SELECTOR);if(parent)shells.add(parent)
    })
  });
  shells.forEach(upgrade)
});
if(document.body){observer.observe(document.body,{childList:true,subtree:true});upgradeAll()}else document.addEventListener('DOMContentLoaded',()=>{observer.observe(document.body,{childList:true,subtree:true});upgradeAll()},{once:true});

window.CellboundCombatHUDStandard={
  version:VERSION,upgrade,upgradeAll,
  profiles:{
    pve:{party:'left',battlefield:'center',meters:['threat','damage','healing'],commands:'right',scroll:false},
    pvp:{base:'pve',teamRosters:true,objectiveHeader:true,threat:false}
  }
};
})();