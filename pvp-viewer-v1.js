(()=>{
'use strict';

const VERSION='1.0.0';
const $=(root,s)=>root?.querySelector(s);
const $$=(root,s)=>[...(root?.querySelectorAll(s)||[])];
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
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
    '<div class="pvp2d-statuses"></div>'+
  '</div>'
}
function rosterMarkup(list,team){
  return '<div class="pvp2d-roster '+team+'">'+list.map(u=>'<div data-pvp2d-row="'+esc(u.id)+'"><i style="--pvp-class:'+(CLASS_COLORS[u.class]||'#9aa7a4')+'"></i><span><b>'+esc(u.name)+'</b><small>'+esc(u.class)+' · '+esc(String(u.role||'dps').toUpperCase())+'</small><em><i style="width:100%"></i></em></span><strong>100%</strong></div>').join('')+'</div>'
}
function objectiveMarkup(match){
  if(match.kind==='arena')return '<div class="pvp2d-arena-mark"><i></i><b>ARENA</b></div>';
  if(match.mode==='king-of-the-hill')return '<div class="pvp2d-hill"><i></i><b>CELL NODE</b></div>';
  return '<div class="pvp2d-flag blue">⚑</div><div class="pvp2d-flag red">⚑</div><div class="pvp2d-midline"></div>'
}
function shellMarkup(match,units){
  const blue=units.filter(x=>x.team==='blue'),red=units.filter(x=>x.team==='red');
  const label=match.kind==='arena'?match.size+'v'+match.size+' RATED ARENA':match.size+'v'+match.size+' · '+(match.mode==='capture-the-flag'?'CAPTURE THE FLAG':'KING OF THE HILL');
  return '<div class="pvp2d-shell">'+
    '<header class="pvp2d-head"><div><small>LIVE PVP COMBAT</small><h3>'+esc(label)+'</h3></div><div class="pvp2d-head-center"><b id="pvp2dScore">0–0</b><span id="pvp2dObjective">'+(match.kind==='arena'?'Eliminate the opposing squad':match.mode==='capture-the-flag'?'First to 3 captures':'First to 100 control')+'</span></div><div class="pvp2d-controls"><span id="pvp2dTimer">0:00</span><button type="button" data-pvp-speed="1" class="active">1×</button><button type="button" data-pvp-speed="2">2×</button></div></header>'+
    '<div class="pvp2d-layout"><aside>'+rosterMarkup(blue,'blue')+'</aside>'+
    '<main class="pvp2d-arena" id="pvp2dArena"><div class="pvp2d-floor"></div><div class="pvp2d-grid"></div>'+objectiveMarkup(match)+'<div id="pvp2dUnits" class="pvp2d-units">'+units.map(unitMarkup).join('')+'</div><div id="pvp2dFx" class="pvp2d-fx"></div><div id="pvp2dBanner" class="pvp2d-banner"></div></main>'+
    '<aside>'+rosterMarkup(red,'red')+'</aside></div>'+
    '<div class="pvp2d-lower"><section><header><small>COMBAT FEED</small><b id="pvp2dStatus">The gates are opening…</b></header><div id="pvp2dFeed" class="pvp2d-feed"></div></section>'+
    '<section class="pvp2d-meters"><div><header><small>DAMAGE</small><b>Blue</b></header><div id="pvp2dDamageBlue"></div></div><div><header><small>DAMAGE</small><b>Red</b></header><div id="pvp2dDamageRed"></div></div><div><header><small>HEALING</small><b>Both teams</b></header><div id="pvp2dHealing"></div></div></section></div>'+
  '</div>'
}
function safePoint(x,y){return{x:clamp(Number(x)||50,5,95),y:clamp(Number(y)||50,8,92)}}
function point(root,id){
  const arena=$(root,'#pvp2dArena'),u=$(root,'[data-pvp2d-unit="'+CSS.escape(String(id))+'"]');if(!arena||!u)return null;
  const a=arena.getBoundingClientRect(),r=u.getBoundingClientRect();return{x:r.left+r.width/2-a.left,y:r.top+r.height/2-a.top}
}
function move(root,id,x,y,ms=450){
  const u=$(root,'[data-pvp2d-unit="'+CSS.escape(String(id))+'"]');if(!u)return;const p=safePoint(x,y);
  u.style.transitionDuration=Math.max(120,Number(ms)||450)+'ms';u.style.left=p.x+'%';u.style.top=p.y+'%'
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
  pct=clamp(Number(pct)||0,0,100);const u=$(root,'[data-pvp2d-unit="'+CSS.escape(String(id))+'"]'),bar=u?.querySelector('.pvp2d-hp i');if(bar)bar.style.width=pct+'%';
  const row=$(root,'[data-pvp2d-row="'+CSS.escape(String(id))+'"]'),rb=row?.querySelector('em i'),strong=row?.querySelector('strong');if(rb)rb.style.width=pct+'%';if(strong)strong.textContent=Math.round(pct)+'%'
}
function setResource(root,id,name,value,max){
  const u=$(root,'[data-pvp2d-unit="'+CSS.escape(String(id))+'"]'),bar=u?.querySelector('.pvp2d-resource');if(!bar)return;const pct=clamp((Number(value)||0)/Math.max(1,Number(max)||100)*100,0,100);
  [...bar.classList].filter(x=>x.startsWith('resource-')).forEach(x=>bar.classList.remove(x));bar.classList.add(resourceClass(name));bar.title=name||'Resource';const fill=bar.querySelector('i');if(fill)fill.style.width=pct+'%'
}
function pulse(root,id,kind='attack'){
  const u=$(root,'[data-pvp2d-unit="'+CSS.escape(String(id))+'"]');if(!u)return;u.classList.remove('attacking','healing','hit');u.classList.add(kind==='heal'?'healing':kind==='hit'?'hit':'attacking');setTimeout(()=>u.classList.remove('attacking','healing','hit'),360)
}
function statusPill(root,id,label,kind='buff',duration=1800,speed=1){
  const u=$(root,'[data-pvp2d-unit="'+CSS.escape(String(id))+'"]'),box=u?.querySelector('.pvp2d-statuses');if(!box)return;
  const e=document.createElement('i');e.className=kind;e.textContent=label;box.appendChild(e);setTimeout(()=>e.remove(),Math.max(250,duration/Math.max(.25,speed)))
}
function feed(pb,text){
  if(!text)return;pb.feed.push(text);const root=pb.root,e=$(root,'#pvp2dFeed');if(e)e.innerHTML=pb.feed.slice(-7).reverse().map(x=>'<p>'+esc(x)+'</p>').join('')
}
function setStatus(pb,text){const e=$(pb.root,'#pvp2dStatus');if(e)e.textContent=text}
function banner(pb,text,tone=''){const e=$(pb.root,'#pvp2dBanner');if(!e)return;e.textContent=text;e.className='pvp2d-banner show '+tone;setTimeout(()=>{if(e.isConnected)e.className='pvp2d-banner'},900/Math.max(.5,pb.speed))}
function updateScore(pb,blue,red,copyText){
  const score=$(pb.root,'#pvp2dScore'),obj=$(pb.root,'#pvp2dObjective');if(score)score.textContent=Math.round(Number(blue)||0)+'–'+Math.round(Number(red)||0);if(obj&&copyText)obj.textContent=copyText
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
  switch(e.type){
    case'COMBAT_START':setStatus(pb,'Combat live');feed(pb,'The gates open. PvP combat begins.');break;
    case'MOVEMENT_START':if(e.payload?.to)move(root,e.source,e.payload.to.x,e.payload.to.y,e.payload.duration||420);break;
    case'ABILITY_START':
      if(src){pulse(root,e.source,e.payload?.kind==='heal'?'heal':'attack');if(e.target&&target)projectile(root,e.source,e.target,attackKind(src,e.ability),src.role==='dps'?280:330)}
      break;
    case'DAMAGE_DEALT':{
      const pct=clamp(Number(e.payload?.targetHpPct)||0,0,100);if(target){setHp(root,target.id,pct);pulse(root,target.id,'hit');floatText(root,target.id,'-'+Math.round(Number(e.amount)||0),e.result==='critical'?'crit':'damage')}
      if(src){pb.stats[src.id].damage+=(Number(e.amount)||0);pb.meterDirty=true}
      if(e.payload?.redirected)feed(pb,(target?.name||'A guard')+' absorbs redirected pressure.');
      break
    }
    case'HEAL_RECEIVED':
      if(target){setHp(root,target.id,Number(e.payload?.targetHpPct)||0);pulse(root,target.id,'heal');floatText(root,target.id,'+'+Math.round(Number(e.amount)||0),'heal')}
      if(src){pb.stats[src.id].healing+=(Number(e.amount)||0);pb.meterDirty=true}
      break;
    case'RESOURCE_STATE':case'RESOURCE_SPENT':case'RESOURCE_GAINED':if(src)setResource(root,src.id,e.payload?.resource,e.payload?.value,e.payload?.max);break;
    case'CROWD_CONTROL':
      if(target){statusPill(root,target.id,'CC','debuff',Number(e.payload?.duration)||1800,pb.speed);floatText(root,target.id,e.ability||'CONTROL','control');feed(pb,(src?.name||'A player')+' controls '+target.name+' with '+(e.ability||'crowd control')+'.')}
      break;
    case'INTERRUPT':
      if(target){floatText(root,target.id,'INTERRUPT','control');statusPill(root,target.id,'LOCK','debuff',900,pb.speed);feed(pb,(src?.name||'A player')+' interrupts '+target.name+'\'s '+(e.payload?.interruptedAbility||'cast')+'.')}
      break;
    case'DEFENSIVE_ACTIVATED':{
      const t=target||src;if(t){statusPill(root,t.id,e.result==='guard'?'GUARD':'DEF','buff',Number(e.payload?.duration)||4500,pb.speed);floatText(root,t.id,e.result==='guard'?'GUARDED':'DEFENSIVE','guard')}
      if(e.result==='guard'&&src&&target)feed(pb,src.name+' guards '+target.name+'.');break
    }
    case'PLAYER_DEFEATED':
      if(target){const u=$(root,'[data-pvp2d-unit="'+CSS.escape(target.id)+'"]');u?.classList.add('dead');setHp(root,target.id,0);pb.stats[target.id].deaths++;if(src)pb.stats[src.id].kills++;feed(pb,target.name+' is defeated'+(src?' by '+src.name:'')+'.');banner(pb,(src?.team==='blue'?'BLUE':'RED')+' TAKEDOWN',src?.team||'')}
      break;
    case'PLAYER_REVIVED':
      if(target){const u=$(root,'[data-pvp2d-unit="'+CSS.escape(target.id)+'"]');u?.classList.remove('dead');setHp(root,target.id,Number(e.payload?.targetHpPct)||100);setResource(root,target.id,e.payload?.resource,e.payload?.resourceValue,e.payload?.resourceMax);floatText(root,target.id,e.result==='respawn'?'RESPAWN':'REVIVED','heal');feed(pb,target.name+' returns to the battleground.')}
      break;
    case'OBJECTIVE_UPDATE':
      if(e.result==='hill-control'){updateScore(pb,e.payload?.blue,e.payload?.red,(e.payload?.owner==='blue'?'Blue':'Red')+' controls the Cell node');banner(pb,(e.payload?.owner==='blue'?'BLUE':'RED')+' TAKES THE NODE',e.payload?.owner)}
      else updateScore(pb,e.payload?.blue,e.payload?.red,'Cell node control');
      break;
    case'FLAG_STATE':
      if(e.result==='picked-up'){setStatus(pb,(src?.name||'A carrier')+' has the '+(e.payload?.team==='blue'?'Blue':'Red')+' Standard');banner(pb,'FLAG TAKEN',src?.team||'');feed(pb,(src?.name||'A player')+' steals the enemy Cell Standard.')}
      else if(e.result==='dropped'){banner(pb,'FLAG DROPPED','');feed(pb,'A Cell Standard is dropped in the field.')}
      else if(e.result==='captured'){updateScore(pb,e.payload?.blue,e.payload?.red,'First to 3 captures');banner(pb,(e.payload?.scoringTeam==='blue'?'BLUE':'RED')+' CAPTURES',e.payload?.scoringTeam);feed(pb,(src?.name||'A carrier')+' completes the flag run.')}
      break;
    case'CAST_START':if(src)setStatus(pb,src.name+' · '+(e.ability||'Casting'));break;
    case'CAST_CANCELLED':if(src)feed(pb,src.name+'\'s '+(e.ability||'cast')+' is stopped.');break;
    case'COMBAT_END':
      updateScore(pb,e.payload?.score?.blue,e.payload?.score?.red);setStatus(pb,e.result==='victory'?'Victory':'Defeat');banner(pb,e.result==='victory'?'VICTORY':'DEFEAT',e.result==='victory'?'blue':'red');break;
  }
}
function buildUnits(match){
  const blue=(match.playerUnits||[]).map((u,i)=>({id:engineId('blue',u,i),rawId:u.id,name:u.name,portrait:u.portrait,class:u.class||'Warrior',spec:u.spec||'',role:u.role||'dps',team:'blue',resource:resourceName(u),position:initialPoint('blue',i,(match.playerUnits||[]).length,match.kind,match.mode)}));
  const red=(match.enemyUnits||[]).map((u,i)=>({id:engineId('red',u,i),rawId:u.id,name:u.name,portrait:u.portrait||'◆',class:u.class||'Warrior',spec:u.spec||'',role:u.role||'dps',team:'red',resource:resourceName(u),position:initialPoint('red',i,(match.enemyUnits||[]).length,match.kind,match.mode)}));
  return[...blue,...red]
}
function stop(){if(activePlayback){activePlayback.cancelled=true;cancelAnimationFrame(activePlayback.raf);activePlayback=null}}
function play({stage,match,result,onComplete}={}){
  if(!stage||!match||!result){onComplete?.();return}stop();
  const units=buildUnits(match);stage.innerHTML=shellMarkup(match,units);stage.scrollIntoView?.({behavior:'smooth',block:'nearest'});
  const pb={root:stage,match,result,units,unitMap:Object.fromEntries(units.map(u=>[u.id,u])),stats:Object.fromEntries(units.map(u=>[u.id,{damage:0,healing:0,kills:0,deaths:0}])),feed:[],speed:1,cancelled:false,raf:0,meterDirty:false,lastMeterAt:0};
  activePlayback=pb;
  $$(stage,'[data-pvp-speed]').forEach(b=>b.addEventListener('click',()=>{pb.speed=Number(b.dataset.pvpSpeed)||1;$$(stage,'[data-pvp-speed]').forEach(x=>x.classList.toggle('active',x===b))}));
  const events=(result.events||[]).slice().sort((a,b)=>(Number(a.timestamp)||0)-(Number(b.timestamp)||0));let index=0,simTime=0,last=performance.now();
  const frame=now=>{
    if(pb.cancelled||!stage.isConnected)return;
    const delta=Math.min(100,Math.max(0,now-last));last=now;simTime+=delta*pb.speed;
    const timer=$(stage,'#pvp2dTimer');if(timer){const sec=Math.floor(simTime/1000);timer.textContent=Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')}
    let handled=0;while(index<events.length&&(Number(events[index].timestamp)||0)<=simTime+4&&handled<220){handleEvent(pb,events[index]);index++;handled++}
    if(pb.meterDirty&&now-pb.lastMeterAt>120){pb.meterDirty=false;pb.lastMeterAt=now;updateMeters(pb)}
    if(index>=events.length){updateMeters(pb);setTimeout(()=>{if(!pb.cancelled&&stage.isConnected){activePlayback=null;onComplete?.()}},650);return}
    pb.raf=requestAnimationFrame(frame)
  };
  pb.raf=requestAnimationFrame(frame)
}
window.CellboundPvPViewer={VERSION,play,stop};
})();