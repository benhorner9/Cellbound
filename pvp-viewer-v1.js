(()=>{
'use strict';

const VERSION='2.0.0';
const $=(root,s)=>root?.querySelector(s);
const $$=(root,s)=>[...(root?.querySelectorAll(s)||[])];
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function dataNode(root,attribute,value){
  if(!root)return null;
  const wanted=String(value??'');
  const nodes=root.querySelectorAll?.('['+attribute+']')||[];
  for(const node of nodes)if(node.getAttribute(attribute)===wanted)return node;
  return null
}
const unitNode=(root,id)=>dataNode(root,'data-pvp2d-unit',id);
const rowNode=(root,id)=>dataNode(root,'data-pvp2d-row',id);
const flagNode=(root,owner)=>dataNode(root,'data-pvp2d-flag',owner);
const CLASS_COLORS=window.CellboundPvPCombat?.CLASS_COLORS||{};
let activePlayback=null;

function slug(v){return String(v||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function engineId(team,raw,index){return team+'-'+String(raw?.id||raw?.characterId||index).replace(/[^a-zA-Z0-9_-]+/g,'-')}
function initialPoint(team,index,count,kind,mode){
  const spread=Math.max(1,count-1),y=18+(index/spread)*64;
  if(kind==='arena')return{x:team==='blue'?18:82,y};
  if(mode==='king-of-the-hill')return{x:team==='blue'?17:83,y};
  return{x:team==='blue'?12:88,y}
}
function resourceName(raw){
  return window.CellboundCombatReborn?.RESOURCE_DEFS?.[raw?.class]?.name||
    ({Warrior:'Rage',Paladin:'Mana',Priest:'Mana',Druid:'Mana',Hunter:'Focus',Rogue:'Energy',Mage:'Mana','Death Knight':'Runic Power','Demon Hunter':'Fury',Evoker:'Essence',Monk:'Energy',Shaman:'Mana',Warlock:'Mana'}[raw?.class]||'Power')
}
function resourceClass(name){return 'resource-'+slug(name)}
function unitMarkup(u){
  const color=CLASS_COLORS[u.class]||'#9aa7a4';
  return '<div class="pvp2d-unit team-'+u.team+' class-'+slug(u.class)+'" data-pvp2d-unit="'+esc(u.id)+'" style="--pvp-class:'+esc(color)+';left:'+u.position.x+'%;top:'+u.position.y+'%">'+
    '<div class="pvp2d-token"><i></i><span>'+esc(u.portrait||u.name?.slice(0,2)||'◆')+'</span></div>'+
    '<div class="pvp2d-name"><b>'+esc(u.name)+'</b><small>'+esc(String(u.role||'dps').toUpperCase())+' · '+esc(u.class||'Adventurer')+'</small></div>'+
    '<em class="pvp2d-hp"><i style="width:100%"></i></em>'+
    '<em class="pvp2d-resource '+resourceClass(u.resource)+'" title="'+esc(u.resource)+'"><i style="width:100%"></i></em>'+
    '<div class="pvp2d-objective-role"></div><div class="pvp2d-statuses"></div>'+
  '</div>'
}
function rosterMarkup(list,team){
  return '<div class="pvp2d-roster '+team+'">'+list.map(u=>'<div data-pvp2d-row="'+esc(u.id)+'"><i style="--pvp-class:'+(CLASS_COLORS[u.class]||'#9aa7a4')+'"></i><span><b>'+esc(u.name)+'</b><small>'+esc(u.class)+' · '+esc(String(u.role||'dps').toUpperCase())+'</small><em><i style="width:100%"></i></em></span><strong>100%</strong></div>').join('')+'</div>'
}
function objectiveMarkup(match,map=null){
  if(match.kind==='arena')return '<div class="pvp2d-arena-mark"><i></i><b>VEILSPIRE</b></div><div class="pvp2d-arena-storm" id="pvp2dArenaStorm"><div class="pvp2d-storm-fog"></div><div class="pvp2d-storm-ring" id="pvp2dStormRing"><i></i><b>CELLSTORM</b></div></div>';
  if(match.mode==='king-of-the-hill'){
    const hills=(map?.hills||[{id:'central-nexus',name:'CENTRAL NEXUS',x:50,y:50,radius:12}]);
    const sites=hills.map((h,i)=>'<div class="pvp2d-hill-site '+(i===0?'active':'')+'" data-pvp2d-hill-site="'+esc(h.id)+'" style="left:'+Number(h.x||50)+'%;top:'+Number(h.y||50)+'%"><i></i><small>'+(i+1)+'</small></div>').join('');
    const first=hills[0];
    return '<div class="pvp2d-hill-sites">'+sites+'</div><div class="pvp2d-hill" id="pvp2dHill" data-site="'+esc(first.id||'central-nexus')+'" style="left:'+Number(first.x||50)+'%;top:'+Number(first.y||50)+'%"><i></i><b>'+esc(first.name||'CELL NODE')+'</b><small>ACTIVE NODE</small></div>'
  }
  return '<div class="pvp2d-flag blue base" data-pvp2d-flag="blue"><i>⚑</i><small>BLUE</small></div><div class="pvp2d-flag red base" data-pvp2d-flag="red"><i>⚑</i><small>RED</small></div><div class="pvp2d-midline"></div>'
}
function mapMarkup(map){
  if(!map)return '';
  const areas=(map.areas||[]).map(a=>'<div class="pvp2d-map-area '+esc(a.kind||'')+' '+esc(a.team||'')+'" style="left:'+Number(a.x||0)+'%;top:'+Number(a.y||0)+'%;width:'+Number(a.w||0)+'%;height:'+Number(a.h||0)+'%"><span>'+esc(a.name||'')+'</span></div>').join('');
  const walls=(map.blockers||[]).map(b=>{
    const left=Number(b.x||50)-Number(b.w||0)/2,top=Number(b.y||50)-Number(b.h||0)/2;
    const cls=/tunnel/i.test(b.id||'')?'tunnel-wall':/pillar/i.test(b.id||'')?'pillar':/rampart/i.test(b.id||'')?'rampart':'ruin';
    return '<div class="pvp2d-map-block '+cls+'" data-map-block="'+esc(b.id||'wall')+'" style="left:'+left+'%;top:'+top+'%;width:'+Number(b.w||0)+'%;height:'+Number(b.h||0)+'%"></div>'
  }).join('');
  const mapType=map.mode==='arena'?'ARENA':'BATTLEGROUND';
  return '<div class="pvp2d-map" data-pvp-map="'+esc(map.id||'battleground')+'"><div class="pvp2d-map-title"><small>'+mapType+'</small><b>'+esc(map.name||'Cellwind Bastion')+'</b></div>'+areas+walls+'<div class="pvp2d-map-prop arch a1"></div><div class="pvp2d-map-prop arch a2"></div><div class="pvp2d-map-prop rubble r1"></div><div class="pvp2d-map-prop rubble r2"></div></div>'
}
function shellMarkup(match,units,map=null){
  const blue=units.filter(x=>x.team==='blue'),red=units.filter(x=>x.team==='red');
  const label=match.kind==='arena'?match.size+'v'+match.size+' RATED ARENA':match.size+'v'+match.size+' · '+(match.mode==='capture-the-flag'?'CAPTURE THE FLAG':'KING OF THE HILL');
  return '<div class="pvp2d-shell '+(map?'with-map':'')+'">'+
    '<header class="pvp2d-head"><div><small>LIVE PVP COMBAT</small><h3>'+esc(label)+'</h3></div><div class="pvp2d-head-center"><b id="pvp2dScore">'+(match.kind==='arena'?(blue.length+'–'+red.length):'0–0')+'</b><span id="pvp2dObjective">'+(match.kind==='arena'?'Eliminate the opposing squad':match.mode==='capture-the-flag'?'First to 3 captures':'First to 100 control')+'</span></div><div class="pvp2d-controls"><span id="pvp2dTimer">0:00</span><b>REAL TIME</b></div></header>'+
    '<div class="pvp2d-layout"><aside>'+rosterMarkup(blue,'blue')+'</aside>'+
    '<main class="pvp2d-arena" id="pvp2dArena"><div class="pvp2d-floor"></div>'+mapMarkup(map)+'<div class="pvp2d-grid"></div>'+objectiveMarkup(match,map)+'<div id="pvp2dUnits" class="pvp2d-units">'+units.map(unitMarkup).join('')+'</div><div id="pvp2dFx" class="pvp2d-fx"></div><div id="pvp2dBanner" class="pvp2d-banner"></div></main>'+
    '<aside>'+rosterMarkup(red,'red')+'</aside></div>'+
    '<div class="pvp2d-lower"><section><header><small>COMBAT FEED</small><b id="pvp2dStatus">The gates are opening…</b></header><div id="pvp2dFeed" class="pvp2d-feed"></div></section>'+
    '<section class="pvp2d-meters"><div><header><small>DAMAGE</small><b>Blue</b></header><div id="pvp2dDamageBlue"></div></div><div><header><small>DAMAGE</small><b>Red</b></header><div id="pvp2dDamageRed"></div></div><div><header><small>HEALING</small><b>Both teams</b></header><div id="pvp2dHealing"></div></div></section></div>'+
  '</div>'
}
function flagBasePoint(owner){return owner==='blue'?{x:12,y:50}:{x:88,y:50}}
function flagElement(root,owner){return flagNode(root,owner)}
function clearCarrierFlagClass(root,owner){
  $$(root,'.pvp2d-unit.carrying-flag').forEach(u=>{if(!owner||u.dataset.flagOwner===owner){u.classList.remove('carrying-flag');delete u.dataset.flagOwner}})
}
function setFlagAt(root,owner,x,y,state='dropped'){
  const flag=flagElement(root,owner),arena=$(root,'#pvp2dArena');if(!flag||!arena)return;
  clearCarrierFlagClass(root,owner);arena.appendChild(flag);flag.classList.remove('carried','base','dropped','returning');flag.classList.add(state);
  flag.style.left=clamp(Number(x)||50,4,96)+'%';flag.style.top=clamp(Number(y)||50,8,92)+'%';flag.style.right='auto';
}
function resetFlagVisual(root,owner){
  const p=flagBasePoint(owner);setFlagAt(root,owner,p.x,p.y,'base')
}
function carryFlagVisual(root,owner,carrierId){
  const flag=flagElement(root,owner),carrier=unitNode(root,carrierId);if(!flag||!carrier)return;
  clearCarrierFlagClass(root,owner);carrier.classList.add('carrying-flag');carrier.dataset.flagOwner=owner;carrier.appendChild(flag);
  flag.classList.remove('base','dropped','returning');flag.classList.add('carried');flag.style.left='28px';flag.style.top='-22px';flag.style.right='auto';
}
function safePoint(x,y){return{x:clamp(Number(x)||50,5,95),y:clamp(Number(y)||50,8,92)}}
function point(root,id){
  const arena=$(root,'#pvp2dArena'),u=unitNode(root,id);if(!arena||!u)return null;
  const a=arena.getBoundingClientRect(),r=u.getBoundingClientRect();return{x:r.left+r.width/2-a.left,y:r.top+r.height/2-a.top}
}
function move(root,id,x,y,ms=450,from=null){
  const u=unitNode(root,id);if(!u)return;const p=safePoint(x,y);
  if(from){
    const start=safePoint(from.x,from.y);
    u.style.transition='none';u.style.left=start.x+'%';u.style.top=start.y+'%';
    void u.offsetWidth;
  }
  u.style.transitionProperty='left,top,transform,opacity,filter';
  u.style.transitionTimingFunction='linear';
  u.style.transitionDuration=Math.max(120,Number(ms)||450)+'ms';
  requestAnimationFrame(()=>{if(u.isConnected){u.style.left=p.x+'%';u.style.top=p.y+'%'}})
}
function floatText(root,id,text,kind='damage'){
  const p=point(root,id),arena=$(root,'#pvp2dArena');if(!p||!arena)return;const e=document.createElement('b');
  e.className='pvp2d-float '+kind;e.textContent=text;e.style.left=p.x+'px';e.style.top=p.y+'px';arena.appendChild(e);setTimeout(()=>e.remove(),900)
}
function projectile(root,from,to,kind='damage',ms=320){
  const a=point(root,from),b=point(root,to),fx=$(root,'#pvp2dFx');if(!a||!b||!fx)return;
  const dx=b.x-a.x,dy=b.y-a.y,p=document.createElement('i');p.className='pvp2d-shot '+kind;p.style.left=a.x+'px';p.style.top=a.y+'px';p.style.setProperty('--dx',dx+'px');p.style.setProperty('--dy',dy+'px');p.style.setProperty('--shot-ms',Math.max(180,ms)+'ms');fx.appendChild(p);setTimeout(()=>p.remove(),ms+180)
}
function setHp(root,id,pct){
  pct=clamp(Number(pct)||0,0,100);const u=unitNode(root,id),bar=u?.querySelector('.pvp2d-hp i');if(bar)bar.style.width=pct+'%';
  const row=rowNode(root,id),rb=row?.querySelector('em i'),strong=row?.querySelector('strong');if(rb)rb.style.width=pct+'%';if(strong)strong.textContent=Math.round(pct)+'%'
}
function setResource(root,id,name,value,max){
  const u=unitNode(root,id),bar=u?.querySelector('.pvp2d-resource');if(!bar)return;const pct=clamp((Number(value)||0)/Math.max(1,Number(max)||100)*100,0,100);
  [...bar.classList].filter(x=>x.startsWith('resource-')).forEach(x=>bar.classList.remove(x));bar.classList.add(resourceClass(name));bar.title=name||'Resource';const fill=bar.querySelector('i');if(fill)fill.style.width=pct+'%'
}
function pulse(root,id,kind='attack'){
  const u=unitNode(root,id);if(!u)return;u.classList.remove('attacking','healing','hit');u.classList.add(kind==='heal'?'healing':kind==='hit'?'hit':'attacking');setTimeout(()=>u.classList.remove('attacking','healing','hit'),360)
}
function statusPill(root,id,label,kind='buff',duration=1800){
  const u=unitNode(root,id),box=u?.querySelector('.pvp2d-statuses');if(!box)return;
  const e=document.createElement('i');e.className=kind;e.textContent=label;box.appendChild(e);setTimeout(()=>e.remove(),Math.max(250,duration))
}
function feed(pb,text){
  if(!text)return;pb.feed.push(text);const root=pb.root,e=$(root,'#pvp2dFeed');if(e)e.innerHTML=pb.feed.slice(-7).reverse().map(x=>'<p>'+esc(x)+'</p>').join('')
}
function setStatus(pb,text){const e=$(pb.root,'#pvp2dStatus');if(e)e.textContent=text}
function objectiveBadge(root,id,label,tone=''){
  const u=unitNode(root,id),badge=u?.querySelector('.pvp2d-objective-role');if(!badge)return;
  badge.textContent=label||'';badge.className='pvp2d-objective-role '+tone
}
function banner(pb,text,tone=''){const e=$(pb.root,'#pvp2dBanner');if(!e)return;e.textContent=text;e.className='pvp2d-banner show '+tone;setTimeout(()=>{if(e.isConnected)e.className='pvp2d-banner'},900)}
function updateScore(pb,blue,red,copyText){
  const score=$(pb.root,'#pvp2dScore'),obj=$(pb.root,'#pvp2dObjective'),b=Math.round(Number(blue)||0),r=Math.round(Number(red)||0),next=b+'–'+r;
  if(score&&score.textContent!==next){
    score.textContent=next;score.classList.remove('score-tick');void score.offsetWidth;score.classList.add('score-tick')
  }
  pb.lastScore={blue:b,red:r};if(obj&&copyText)obj.textContent=copyText
}
function updateHill(root,payload={},state='neutral'){
  const hill=$(root,'#pvp2dHill');if(!hill)return;
  const x=clamp(Number(payload.x)||50,5,95),y=clamp(Number(payload.y)||50,8,92),name=String(payload.name||'CELL NODE'),site=String(payload.site||'');
  hill.style.left=x+'%';hill.style.top=y+'%';hill.dataset.site=site;hill.className='pvp2d-hill '+state;
  const label=hill.querySelector('b');if(label)label.textContent=name;
  $$(root,'[data-pvp2d-hill-site]').forEach(node=>node.classList.toggle('active',node.getAttribute('data-pvp2d-hill-site')===site))
}
function updateArenaStorm(root,payload={},pulsePhase=true){
  const storm=$(root,'#pvp2dArenaStorm'),ring=$(root,'#pvp2dStormRing');if(!storm||!ring)return;
  const x=clamp(Number(payload.x)||50,8,92),y=clamp(Number(payload.y)||50,10,90),radius=clamp(Number(payload.radius)||44,8,48),damage=Math.max(0,Number(payload.damagePct)||0);
  const fog=storm.querySelector('.pvp2d-storm-fog');
  if(fog)fog.style.background='radial-gradient(circle at '+x+'% '+y+'%, transparent 0 '+radius+'%, rgba(39,52,57,.28) '+Math.min(49,radius+2)+'%, rgba(17,28,32,.78) 100%)';
  ring.style.left=x+'%';ring.style.top=y+'%';ring.style.width=(radius*2)+'%';ring.style.height=(radius*2)+'%';
  const label=ring.querySelector('b');if(label)label.textContent=damage?('CELLSTORM · '+damage+'%'):'CELLSTORM';
  if(pulsePhase){ring.classList.remove('phase-pulse');void ring.offsetWidth;ring.classList.add('phase-pulse')}
}
function combatant(pb,id){return pb.unitMap[id]}
function attackKind(u,ability){
  if(/heal|rejuven|regrowth|renew|riptide|vivify|embrace|blossom|mend/i.test(String(ability||'')))return'heal';
  if(['Hunter','Mage','Priest','Druid','Evoker','Shaman','Warlock'].includes(u?.class))return'magic';return'melee'
}
function updateMeters(pb){
  const render=(id,rows,metric,team)=>{const root=$(pb.root,id);if(!root)return;const filtered=rows.filter(x=>!team||x.team===team).sort((a,b)=>(pb.stats[b.id]?.[metric]||0)-(pb.stats[a.id]?.[metric]||0)).slice(0,5),max=Math.max(1,...filtered.map(x=>pb.stats[x.id]?.[metric]||0));root.innerHTML=filtered.map((u,i)=>{const value=Math.round(pb.stats[u.id]?.[metric]||0);return '<div class="pvp2d-meter-row"><span><b>'+(i+1)+'. '+esc(u.name)+'</b><em>'+value.toLocaleString()+'</em></span><i><b style="width:'+(value/max*100)+'%;--pvp-class:'+(CLASS_COLORS[u.class]||'#9aa7a4')+'"></b></i></div>'}).join('')};
  render('#pvp2dDamageBlue',pb.units,'damage','blue');render('#pvp2dDamageRed',pb.units,'damage','red');render('#pvp2dHealing',pb.units,'healing')
}
function handleEvent(pb,e){
  const root=pb.root,src=combatant(pb,e.source),target=combatant(pb,e.target);
  window.CellboundCombatFX?.combatEvent?.(e,{arena:root.querySelector('.pvp2d-arena'),root,resolve:id=>unitNode(root,id)});
  switch(e.type){
    case'COMBAT_START':
      window.CellboundCombatFX?.mount?.(root.querySelector('.pvp2d-arena'));
      setStatus(pb,pb.result?.map?.name?pb.result.map.name+' · combat live':'Combat live');
      if(pb.match?.kind==='arena')feed(pb,'The Veilspire gates close. The Cellstorm will keep shrinking until one team falls.');
      else feed(pb,pb.result?.map?.name?'The gates of '+pb.result.map.name+' open. Multiple routes are live.':'The gates open. PvP combat begins.');
      break;
    case'MOVEMENT_START':if(e.payload?.to)move(root,e.source,e.payload.to.x,e.payload.to.y,e.payload.duration||420,e.payload?.from||null);break;
    case'ABILITY_START':
      if(src){pulse(root,e.source,e.payload?.kind==='heal'?'heal':'attack');if(e.target&&target)projectile(root,e.source,e.target,attackKind(src,e.ability),src.role==='dps'?280:330)}
      break;
    case'DAMAGE_DEALT':{
      const pct=clamp(Number(e.payload?.targetHpPct)||0,0,100);if(target){setHp(root,target.id,pct);pulse(root,target.id,'hit');floatText(root,target.id,'-'+Math.round(Number(e.amount)||0),e.result==='critical'?'crit':'damage');window.CellboundCombatFX?.impact?.(unitNode(root,target.id),{critical:e.result==='critical'})}
      if(src){pb.stats[src.id].damage+=(Number(e.amount)||0);pb.meterDirty=true}
      if(e.payload?.redirected)feed(pb,(target?.name||'A guard')+' absorbs redirected pressure.');
      break
    }
    case'HEAL_RECEIVED':
      if(target){setHp(root,target.id,Number(e.payload?.targetHpPct)||0);pulse(root,target.id,'heal');floatText(root,target.id,'+'+Math.round(Number(e.amount)||0),'heal');window.CellboundCombatFX?.heal?.(unitNode(root,target.id))}
      if(src){pb.stats[src.id].healing+=(Number(e.amount)||0);pb.meterDirty=true}
      break;
    case'RESOURCE_STATE':case'RESOURCE_SPENT':case'RESOURCE_GAINED':if(src)setResource(root,src.id,e.payload?.resource,e.payload?.value,e.payload?.max);break;
    case'LOS_BLOCKED':
      if(src){
        pb.lastLosAt=pb.lastLosAt||{};
        if((pb.lastLosAt[src.id]||0)+2200<Number(e.timestamp||0)){
          pb.lastLosAt[src.id]=Number(e.timestamp||0);
          floatText(root,src.id,'LOS','control');
          setStatus(pb,src.name+' repositioning around cover')
        }
      }
      break;
    case'CROWD_CONTROL':
      if(target){statusPill(root,target.id,'CC','debuff',Number(e.payload?.duration)||1800);floatText(root,target.id,e.ability||'CONTROL','control');feed(pb,(src?.name||'A player')+' controls '+target.name+' with '+(e.ability||'crowd control')+'.')}
      break;
    case'INTERRUPT':
      if(target){floatText(root,target.id,'INTERRUPT','control');window.CellboundCombatFX?.interrupt?.(unitNode(root,target.id));statusPill(root,target.id,'LOCK','debuff',900);feed(pb,(src?.name||'A player')+' interrupts '+target.name+'\'s '+(e.payload?.interruptedAbility||'cast')+'.')}
      break;
    case'DEFENSIVE_ACTIVATED':{
      const t=target||src;if(t){statusPill(root,t.id,e.result==='guard'?'GUARD':'DEF','buff',Number(e.payload?.duration)||4500);floatText(root,t.id,e.result==='guard'?'GUARDED':'DEFENSIVE','guard')}
      if(e.result==='guard'&&src&&target)feed(pb,src.name+' guards '+target.name+'.');break
    }
    case'PLAYER_DEFEATED':
      if(target){
        target.alive=false;const u=unitNode(root,target.id);window.CellboundCombatFX?.death?.(u);u?.classList.add('dead');setHp(root,target.id,0);pb.stats[target.id].deaths++;if(src)pb.stats[src.id].kills++;
        feed(pb,target.name+' is defeated'+(src?' by '+src.name:e.ability==='Cellstorm'?' by the Cellstorm':'')+'.');
        if(pb.match?.kind==='arena')updateScore(pb,pb.units.filter(x=>x.team==='blue'&&x.alive).length,pb.units.filter(x=>x.team==='red'&&x.alive).length,'Eliminate the opposing squad');
        banner(pb,src?((src.team==='blue'?'BLUE':'RED')+' TAKEDOWN'):'CELLSTORM TAKEDOWN',src?.team||'')
      }
      break;
    case'PLAYER_REVIVED':
      if(target){target.alive=true;const u=unitNode(root,target.id);u?.classList.remove('dead');setHp(root,target.id,Number(e.payload?.targetHpPct)||100);setResource(root,target.id,e.payload?.resource,e.payload?.resourceValue,e.payload?.resourceMax);floatText(root,target.id,e.result==='respawn'?'RESPAWN':'REVIVED','heal');feed(pb,target.name+' returns to the battleground.')}
      break;
    case'OBJECTIVE_UPDATE':
      if(e.result==='hill-rotate'){
        window.CellboundCombatFX?.mechanic?.(root.querySelector('.pvp2d-arena'),'warning');updateHill(root,e.payload,'rotating');
        updateScore(pb,e.payload?.blue,e.payload?.red,(e.payload?.name||'New node')+' is now active');
        setStatus(pb,'Rotate · '+(e.payload?.name||'new control zone'));
        banner(pb,'NODE ROTATES','');
        feed(pb,'The control zone shifts to '+(e.payload?.name||'a new area')+'. Both teams rotate through the battleground.')
      }else if(e.result==='hill-roles'){
        (e.payload?.anchors||[]).forEach(id=>objectiveBadge(root,id,'ANCHOR','defender'));
        (e.payload?.supports||[]).forEach(id=>objectiveBadge(root,id,'SUPPORT','support'));
        (e.payload?.flankers||[]).forEach(id=>objectiveBadge(root,id,'FLANK','runner'))
      }else if(e.result==='hill-control'){
        updateHill(root,e.payload,e.payload?.owner||'neutral');
        updateScore(pb,e.payload?.blue,e.payload?.red,(e.payload?.owner==='blue'?'Blue':'Red')+' controls '+(e.payload?.name||'the active node'));
        setStatus(pb,(e.payload?.owner==='blue'?'Blue':'Red')+' controls '+(e.payload?.name||'the active node'));
        banner(pb,(e.payload?.owner==='blue'?'BLUE':'RED')+' TAKES THE NODE',e.payload?.owner)
      }else if(e.result==='hill-contested'){
        updateHill(root,e.payload,'contested');
        updateScore(pb,e.payload?.blue,e.payload?.red,(e.payload?.name||'Active node')+' contested');
        setStatus(pb,(e.payload?.name||'Active node')+' · contested')
      }else if(e.result==='hill-score'){
        updateScore(pb,e.payload?.blue,e.payload?.red,(e.payload?.name||'Active node')+(e.payload?.owner?' · '+(e.payload.owner==='blue'?'Blue':'Red')+' control':' · contested'));
        updateHill(root,e.payload,e.payload?.owner||'contested');
      }else if(e.result==='ctf-roles'){
        if(e.payload?.runner)objectiveBadge(root,e.payload.runner,'RUNNER','runner');
        (e.payload?.defenders||[]).forEach(id=>objectiveBadge(root,id,'DEFENCE','defender'));
        (e.payload?.supports||[]).forEach(id=>objectiveBadge(root,id,'SUPPORT','support'));
      }else if(e.result==='ctf-opening'){
        updateScore(pb,0,0,'Capture the enemy flag and return it to your base');
        setStatus(pb,'Opening push · runners, escorts and defenders taking position');
        feed(pb,'Both teams establish offence, midfield and flag defence.')
      }else if(e.result==='ctf-carrier'){
        if(src)objectiveBadge(root,src.id,'FLAG CARRIER','carrier');
        setStatus(pb,(src?.name||'Carrier')+' escaping with the enemy flag');
        feed(pb,(src?.name||'A runner')+' has the flag — teammates switch to escort while defenders chase.')
      }else if(e.result==='ctf-standoff'){
        updateScore(pb,e.payload?.blue,e.payload?.red,'Flag standoff · your own flag must be returned before you can score');
        setStatus(pb,'Flag standoff · carrier holding near base');
        banner(pb,'FLAG STANDOFF',e.payload?.team||'');
        if(src)feed(pb,src.name+' is holding the enemy flag near base while the recovery team hunts your missing flag.')
      }else if(e.result==='ctf-score'){
        updateScore(pb,e.payload?.blue,e.payload?.red,'First to 3 captures');
        setStatus(pb,(e.payload?.team==='blue'?'Blue':'Red')+' scores · teams reset for the next flag run')
      }else{
        updateScore(pb,e.payload?.blue,e.payload?.red,pb.match?.mode==='capture-the-flag'?'Capture the enemy Cell Standard':'Cell node control');
      }
      break;
    case'FLAG_STATE':{
      const owner=e.payload?.owner||e.payload?.team;
      if(e.result==='reset'){
        if(owner)resetFlagVisual(root,owner);
      }else if(e.result==='picked-up'){
        if(owner&&src)carryFlagVisual(root,owner,src.id);if(src)objectiveBadge(root,src.id,'FLAG CARRIER','carrier');
        setStatus(pb,(src?.name||'A carrier')+' has the '+(owner==='blue'?'Blue':'Red')+' Standard');
        banner(pb,e.payload?.from==='ground'?'FLAG RECOVERED':'FLAG TAKEN',src?.team||'');
        feed(pb,(src?.name||'A player')+(e.payload?.from==='ground'?' recovers ':' steals the ')+(owner==='blue'?'Blue':'Red')+' Cell Standard.');
      }else if(e.result==='dropped'){
        if(owner)setFlagAt(root,owner,e.payload?.x,e.payload?.y,'dropped');if(src)objectiveBadge(root,src.id,src.role==='tank'?'RUNNER':'','runner');
        banner(pb,'FLAG DROPPED','');feed(pb,(src?.name||'A carrier')+' drops the '+(owner==='blue'?'Blue':'Red')+' Cell Standard.');
      }else if(e.result==='returned'){
        if(owner)resetFlagVisual(root,owner);
        banner(pb,(owner==='blue'?'BLUE':'RED')+' FLAG RETURNED',owner);
        feed(pb,(src?.name||'A defender')+' returns the '+(owner==='blue'?'Blue':'Red')+' Cell Standard to base.');
      }else if(e.result==='captured'){
        if(owner)resetFlagVisual(root,owner);if(src)objectiveBadge(root,src.id,'RUNNER','runner');
        updateScore(pb,e.payload?.blue,e.payload?.red,'First to 3 captures');
        banner(pb,(e.payload?.scoringTeam==='blue'?'BLUE':'RED')+' CAPTURES',e.payload?.scoringTeam);
        feed(pb,(src?.name||'A carrier')+' carries the '+(owner==='blue'?'Blue':'Red')+' Cell Standard home for a capture.');
      }
      break;
    }
    case'ARENA_STATE':{
      if(e.result==='storm-progress'){
        updateArenaStorm(root,e.payload,false);
      }else if(e.result==='storm-phase'){
        window.CellboundCombatFX?.mechanic?.(root.querySelector('.pvp2d-arena'),'warning');updateArenaStorm(root,e.payload,true);
        const phase=Number(e.payload?.phase)||0;
        setStatus(pb,(e.payload?.label||'Cellstorm')+' · safe ring '+Math.round(Number(e.payload?.radius)||0));
        if(phase>0){banner(pb,e.payload?.label||'CELLSTORM CLOSING','');feed(pb,'The Cellstorm closes and shifts position. Move inside the new safe ring.')}
      }else if(e.result==='storm-damage'){
        if(target){pulse(root,target.id,'hit');floatText(root,target.id,'STORM','control')}
      }else if(e.result==='dampening'){
        const pct=Math.round(Number(e.payload?.dampeningPct)||0);
        setStatus(pb,'Battle Fatigue · healing reduced '+pct+'%');
        banner(pb,'HEALING -'+pct+'%','');
        feed(pb,'Battle Fatigue rises: all arena healing is reduced by '+pct+'%.')
      }
      break;
    }
    case'CAST_START':if(src)setStatus(pb,src.name+' · '+(e.ability||'Casting'));break;
    case'CAST_CANCELLED':if(src)feed(pb,src.name+'\'s '+(e.ability||'cast')+' is stopped.');break;
    case'COMBAT_END':
      updateScore(pb,e.payload?.score?.blue,e.payload?.score?.red);setStatus(pb,e.result==='victory'?'Victory':'Defeat');if(e.result==='victory')window.CellboundCombatFX?.victory?.(root.querySelector('.pvp2d-arena'));banner(pb,e.result==='victory'?'VICTORY':'DEFEAT',e.result==='victory'?'blue':'red');break;
  }
}
function buildUnits(match){
  const blue=(match.playerUnits||[]).map((u,i)=>({id:engineId('blue',u,i),rawId:u.id,name:u.name,portrait:u.portrait,class:u.class||'Warrior',spec:u.spec||'',role:u.role||'dps',team:'blue',alive:true,resource:resourceName(u),position:initialPoint('blue',i,(match.playerUnits||[]).length,match.kind,match.mode)}));
  const red=(match.enemyUnits||[]).map((u,i)=>({id:engineId('red',u,i),rawId:u.id,name:u.name,portrait:u.portrait||'◆',class:u.class||'Warrior',spec:u.spec||'',role:u.role||'dps',team:'red',alive:true,resource:resourceName(u),position:initialPoint('red',i,(match.enemyUnits||[]).length,match.kind,match.mode)}));
  return[...blue,...red]
}
function stop(){if(activePlayback){activePlayback.cancelled=true;cancelAnimationFrame(activePlayback.raf);activePlayback=null}}
function play({stage,match,result,onComplete}={}){
  if(!stage||!match||!result){onComplete?.();return}stop();
  const units=buildUnits(match),map=result?.map||match?.map||null;stage.innerHTML=shellMarkup(match,units,map);stage.scrollIntoView?.({behavior:'smooth',block:'nearest'});
  const pb={root:stage,match,result,units,unitMap:Object.fromEntries(units.map(u=>[u.id,u])),stats:Object.fromEntries(units.map(u=>[u.id,{damage:0,healing:0,kills:0,deaths:0}])),feed:[],cancelled:false,raf:0,meterDirty:false,lastMeterAt:0};
  activePlayback=pb;
  const events=(result.events||[]).slice().sort((a,b)=>(Number(a.timestamp)||0)-(Number(b.timestamp)||0));let index=0,simTime=0,wallAnchor=Date.now();
  const frame=()=>{
    if(pb.cancelled||!stage.isConnected)return;
    simTime=Math.max(simTime,Math.max(0,Date.now()-wallAnchor));
    const timer=$(stage,'#pvp2dTimer');if(timer){const sec=Math.floor(simTime/1000);timer.textContent=Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')}
    const frameStarted=performance.now();let handled=0;
    while(index<events.length&&(Number(events[index].timestamp)||0)<=simTime+4&&handled<260&&performance.now()-frameStarted<10){
      const event=events[index];
      try{handleEvent(pb,event)}
      catch(error){
        console.error('PvP viewer event failed',event,error);
        if(!pb.runtimeErrorShown){
          pb.runtimeErrorShown=true;
          feed(pb,'Viewer recovered from a display error. Combat continues.');
          setStatus(pb,'Combat live · viewer recovery active')
        }
      }
      index++;handled++
    }
    const now=performance.now();
    if(pb.meterDirty&&now-pb.lastMeterAt>120){pb.meterDirty=false;pb.lastMeterAt=now;updateMeters(pb)}
    if(index>=events.length){updateMeters(pb);setTimeout(()=>{if(!pb.cancelled&&stage.isConnected){activePlayback=null;onComplete?.()}},650);return}
    pb.raf=requestAnimationFrame(frame)
  };
  pb.raf=requestAnimationFrame(frame)
}
window.CellboundPvPViewer={VERSION,play,stop};
})();