(()=>{
'use strict';
window.CellboundCombatStandard?.register?.('world-bosses',{kind:'world-boss',execution:'server',ui:'world-boss-shared-vitals'});

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let Game=null,db=null,active=null,pollTimer=null,attackTimer=null,attackBusy=false,participantDamage=new Map();

const bossThemes={
  'gloamhide':{cls:'gloamhide',subtitle:'GLOAM MARSH · WORLD ENCOUNTER',rune:'♜',mechanics:['Bog Slam','Rotting Charge','Spore Eruption']},
  'hollow-wyrm':{cls:'hollow-wyrm',subtitle:'HOLLOW DEEP · WORLD ENCOUNTER',rune:'♨',mechanics:['Burrow Line','Hollow Breath','Rift Collapse']},
  'cell-torn':{cls:'cell-torn',subtitle:'THE CELL SCAR · WORLD ENCOUNTER',rune:'✦',mechanics:['Cell Rupture','Fracture Beam','Unbound Pulse']}
};
const groupAnchors=[
  {x:31,y:51},{x:27,y:25},{x:27,y:77},{x:44,y:17},
  {x:44,y:84},{x:73,y:18},{x:76,y:82},{x:18,y:51},
  {x:55,y:12},{x:55,y:89},{x:85,y:35},{x:85,y:67}
];
const roleOf=c=>Game?.classes?.[c.class]?.specs?.[c.spec]?.role||'dps';
const classKey=c=>'class-'+String(c?.class||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const isRanged=c=>['Hunter','Mage','Priest'].includes(c.class)||(c.class==='Druid'&&c.spec!=='Feral');
const party=()=>Game?.getPartyCharacters?.()||[];
const worldBossLevel=b=>Math.max(1,Number(b?.level)||({1:8,2:12,3:16}[Number(b?.tier)]||8));

function ensureShell(){
  let root=document.getElementById('worldBoss2dBackdrop');
  if(root)return root;
  root=document.createElement('div');
  root.id='worldBoss2dBackdrop';
  root.className='wb2d-backdrop';
  root.hidden=true;
  root.innerHTML=`
    <section class="wb2d-shell">
      <header class="wb2d-head">
        <div><small id="wb2dSubtitle">SHARED WORLD · ENCOUNTER</small><h2 id="wb2dBossName">World Boss</h2><p id="wb2dStatus">Connecting to the encounter…</p></div>
        <div class="wb2d-head-actions"><span id="wb2dPlayerCount">0 COMMANDERS</span><button id="wb2dClose">CLOSE</button></div>
      </header>
      <div class="wb2d-bossbar"><div><span>BOSS HEALTH</span><b id="wb2dHpText">—</b></div><div class="wb2d-bossbar-track"><i id="wb2dHpFill"></i></div></div>
      <div class="wb2d-layout">
        <div class="wb2d-arena-wrap">
          <div id="wb2dArena" class="wb2d-arena">
            <div class="wb2d-ground"></div>
            <div id="wb2dEnvironment" class="wb2d-environment"></div>
            <div id="wb2dTelegraphs" class="wb2d-telegraphs"></div>
            <div id="wb2dUnits" class="wb2d-units"></div>
            <div id="wb2dEffects" class="wb2d-effects"></div>
            <div id="wb2dBoss" class="wb2d-boss">
              <span id="wb2dBossRune">✦</span><b id="wb2dBossLabel">WORLD BOSS</b><div class="wb2d-boss-mini"><i></i></div>
            </div>
            <div id="wb2dCast" class="wb2d-cast" hidden><small>BOSS CAST</small><b></b><div><i></i></div></div>
            <div id="wb2dMessage" class="wb2d-message"></div>
          </div>
          <div class="wb2d-legend"><span>PLAYER DOTS · CLASS COLOURS</span><b>Your party has a gold ring · boss has a gold edge.</b></div>
        </div>
        <aside class="wb2d-raid-panel">
          <div class="wb2d-raid-head"><span>RAID FORCE</span><small>Live shared encounter</small></div>
          <div id="wb2dRaidList" class="wb2d-raid-list"></div>
          <div class="wb2d-meter-stack">
            <section class="wb2d-meter-panel"><div class="wb2d-meter-title"><span>DAMAGE METER</span><small>SERVER</small></div><div id="wb2dDamageMeter" class="wb2d-meter-list"></div></section>
            <section class="wb2d-meter-panel threat"><div class="wb2d-meter-title"><span>YOUR PARTY THREAT</span><small>GLOBAL HEAL</small></div><div id="wb2dThreatMeter" class="wb2d-meter-list"></div></section>
          </div>
          <div class="wb2d-feed-head"><span>COMBAT FEED</span></div>
          <div id="wb2dFeed" class="wb2d-feed"></div>
        </aside>
      </div>
      <footer class="wb2d-footer"><span>Combat Reborn is server-authoritative here too. Boss health, mechanics, damage, healing and threat all come from the same combat engine used by dungeons.</span><button id="wb2dAttackNow">ATTACK NOW</button></footer>
    </section>`;
  document.body.appendChild(root);
  root.querySelector('#wb2dClose').onclick=close;
  root.querySelector('#wb2dAttackNow').onclick=()=>attack(true);
  root.addEventListener('click',e=>{if(e.target===root)close()});
  return root;
}

function themeFor(id){return bossThemes[id]||{cls:'wild',subtitle:'SHARED WORLD · WORLD ENCOUNTER',rune:'◆',mechanics:['Crushing Blow','Ground Rupture','Power Surge']}}
function feed(text,kind=''){
  const root=document.getElementById('wb2dFeed');if(!root)return;
  const row=document.createElement('div');row.className='wb2d-feed-row '+kind;
  row.innerHTML='<span>'+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})+'</span><p>'+esc(text)+'</p>';
  root.prepend(row);
  while(root.children.length>18)root.lastElementChild.remove();
}
function message(text,kind=''){
  const el=document.getElementById('wb2dMessage');if(!el)return;
  el.className='wb2d-message '+kind;el.textContent=text;el.hidden=false;
  clearTimeout(el._hide);el._hide=setTimeout(()=>{el.hidden=true},1900);
}
function setArenaTheme(boss){
  const arena=document.getElementById('wb2dArena'),env=document.getElementById('wb2dEnvironment'),t=themeFor(boss.id);
  arena.className='wb2d-arena theme-'+t.cls;
  document.getElementById('wb2dSubtitle').textContent=t.subtitle;
  document.getElementById('wb2dBossRune').textContent=t.rune;
  if(env&&!env.dataset.theme){
    env.dataset.theme=t.cls;
    env.innerHTML='<i class="wb2d-prop p1"></i><i class="wb2d-prop p2"></i><i class="wb2d-prop p3"></i><i class="wb2d-prop p4"></i><i class="wb2d-prop p5"></i><span class="wb2d-drift d1"></span><span class="wb2d-drift d2"></span><span class="wb2d-drift d3"></span>';
  }
}
function bossHealth(boss){
  const hp=Math.max(0,Number(boss.currentHp??boss.current_hp)||0),max=Math.max(1,Number(boss.maxHp??boss.max_hp)||1),pct=clamp(hp/max*100,0,100);
  document.getElementById('wb2dHpText').textContent=hp.toLocaleString()+' / '+max.toLocaleString();
  document.getElementById('wb2dHpFill').style.width=pct+'%';
  const mini=document.querySelector('#wb2dBoss .wb2d-boss-mini i');if(mini)mini.style.width=pct+'%';
}
function wbResourceDef(c){
  return window.CellboundCombatReborn?.RESOURCE_DEFS?.[c?.className||c?.class]||{name:'Power',max:100,start:100}
}
function wbResourceClass(name){return 'resource-'+String(name||'Power').toLowerCase().replace(/[^a-z0-9]+/g,'-')}
function wbEnsureResource(el,u){
  if(!el||!u?.own)return null;
  let bar=el.querySelector('.cbr-resource');
  const def=wbResourceDef(u);
  if(!bar){
    bar=document.createElement('div');bar.className='cbr-resource '+wbResourceClass(def.name);bar.dataset.resource=def.name;bar.innerHTML='<i style="width:'+Math.max(0,Math.min(100,(Number(def.start??def.max??100)/Math.max(1,Number(def.max)||100))*100))+'%"></i>';el.appendChild(bar)
  }
  return bar
}
function wbSetResource(id,name,value,max){
  const el=ownUnitForCombatId(id);if(!el)return;
  const ch=party().find(c=>'p-'+c.id===String(id)),def=wbResourceDef({className:ch?.class}),resource=name||def.name,limit=Math.max(1,Number(max)||def.max||100),current=Math.max(0,Math.min(limit,Number(value)||0)),bar=wbEnsureResource(el,{own:true,className:ch?.class});
  if(!bar)return;
  [...bar.classList].filter(x=>x.startsWith('resource-')).forEach(x=>bar.classList.remove(x));
  bar.classList.add(wbResourceClass(resource));bar.dataset.resource=resource;bar.title=resource+' '+Math.round(current)+' / '+Math.round(limit);
  const fill=bar.querySelector('i');if(fill)fill.style.width=(current/limit*100)+'%'
}
function groupParty(participant,index){
  if(participant.isYou){
    return party().map((c,i)=>({key:'you-'+(c.id||i),id:c.id,name:c.name,role:roleOf(c),ranged:isRanged(c),own:true,classKey:classKey(c),className:c.class}));
  }
  return [
    {key:'g'+index+'-t',name:'Tank',role:'tank',ranged:false},
    {key:'g'+index+'-h',name:'Healer',role:'healer',ranged:true},
    {key:'g'+index+'-d1',name:'DPS',role:'dps',ranged:false},
    {key:'g'+index+'-d2',name:'DPS',role:'dps',ranged:true},
    {key:'g'+index+'-d3',name:'DPS',role:'dps',ranged:true}
  ];
}
function unitPosition(anchor,u,i){
  const boss={x:62,y:50},vx=boss.x-anchor.x,vy=boss.y-anchor.y,len=Math.hypot(vx,vy)||1,nx=vx/len,ny=vy/len,px=-ny,py=nx;
  let forward=0,side=0;
  if(u.role==='tank'){forward=10;side=0}
  else if(u.role==='healer'){forward=-7;side=8}
  else if(u.ranged){forward=-3;side=(i%2?11:-11)}
  else{forward=7;side=(i%2?7:-7)}
  return{x:clamp(anchor.x+nx*forward+px*side,7,93),y:clamp(anchor.y+ny*forward+py*side,9,91)};
}
function renderParticipants(parts){
  const units=document.getElementById('wb2dUnits'),raid=document.getElementById('wb2dRaidList');
  if(!units||!raid)return;
  const previous=new Map([...units.querySelectorAll('[data-unit-key]')].map(e=>[e.dataset.unitKey,e]));
  const ownThreat=active?.partyThreat||{},ownGuildAggro=Boolean(parts.find(p=>p.isYou)?.isAggro);
  const topOwnId=Object.entries(ownThreat).sort((a,b)=>(Number(b[1])||0)-(Number(a[1])||0))[0]?.[0]||null;
  const nextKeys=new Set(),html=[];
  parts.forEach((p,index)=>{
    const anchor=groupAnchors[index%groupAnchors.length],members=groupParty(p,index),guild=String(p.guildLabel||'Unknown Guild');
    html.push(`<article class="wb2d-raid-row ${p.isYou?'you':''} ${p.isAggro?'aggro':''}"><div><b>${esc(guild)}</b><small>Party iLvl ${Number(p.partyIlvl||0).toFixed(1)}${p.isYou?' · YOUR PARTY':''}${p.isAggro?' · BOSS AGGRO':''}</small></div><strong>${Number(p.damageDone||0).toLocaleString()}</strong></article>`);
    members.forEach((u,i)=>{
      const pos=unitPosition(anchor,u,i),key=u.key;nextKeys.add(key);
      let el=previous.get(key);
      if(!el){
        el=document.createElement('div');el.className='wb2d-unit role-'+u.role+' '+(u.classKey||'class-unknown')+(u.own?' own':'');
        el.dataset.unitKey=key;el.innerHTML='<span class="wb2d-unit-dot">'+(u.role==='tank'?'T':u.role==='healer'?'H':'D')+'</span><div class="wb2d-unit-hp"><i></i></div><small class="wb2d-unit-label"></small>';
        units.appendChild(el);
      }
      el.className='wb2d-unit role-'+u.role+' '+(u.classKey||'class-unknown')+(u.own?' own':'')+(u.ranged?' ranged':' melee')+(p.isAggro?' aggro':'')+(u.own&&ownGuildAggro&&u.id===topOwnId?' boss-target':'');
      el.style.left=pos.x+'%';el.style.top=pos.y+'%';
      el.dataset.x=pos.x;el.dataset.y=pos.y;el.dataset.guild=guild;
      const unitLabel=el.querySelector('.wb2d-unit-label')||el.querySelector(':scope > small:not(.cbr-resource)');if(unitLabel)unitLabel.textContent=u.own?u.name:(i===0?guild:'');
      if(u.own)wbEnsureResource(el,u);
      const hp=el.querySelector('.wb2d-unit-hp i'),serverHp=u.own?Math.max(0,Math.min(100,Number(active?.combatState?.hp?.[u.id]??100))):100;if(hp)hp.style.width=serverHp+'%';el.classList.toggle('wiped',u.own&&serverHp<=0);
    });
  });
  previous.forEach((el,key)=>{if(!nextKeys.has(key))el.remove()});
  raid.innerHTML=html.join('')||'<div class="wb2d-empty">No commanders engaged.</div>';
  document.getElementById('wb2dPlayerCount').textContent=parts.length+' COMMANDER'+(parts.length===1?'':'S');
}
function renderCombatMeters(parts,partyThreat){
  const damageRoot=document.getElementById('wb2dDamageMeter'),threatRoot=document.getElementById('wb2dThreatMeter');
  const rows=Array.isArray(parts)?parts:[];
  if(damageRoot){
    const sorted=[...rows].sort((a,b)=>(Number(b.damageDone)||0)-(Number(a.damageDone)||0));
    if(!sorted.length)damageRoot.innerHTML='<div class="wb2d-meter-empty">No combat data yet.</div>';
    else{
      const max=Math.max(1,...sorted.map(x=>Number(x.damageDone)||0));
      damageRoot.innerHTML=sorted.slice(0,6).map((p,i)=>{
        const value=Number(p.damageDone)||0,pct=value/max*100;
        return '<div class="wb2d-meter-row '+(p.isYou?'you':'')+'"><div><b>'+(i+1)+'. '+esc(p.guildLabel||'Unknown Guild')+'</b><span>'+value.toLocaleString()+'</span></div><em><i style="width:'+pct+'%"></i></em></div>';
      }).join('');
    }
  }
  if(!threatRoot)return;
  const map=partyThreat&&typeof partyThreat==='object'?partyThreat:{},chars=party();
  const threatRows=chars.map(c=>({c,value:Number(map[c.id])||0})).sort((a,b)=>b.value-a.value);
  const maxThreat=Math.max(1,...threatRows.map(x=>x.value)),ownGuildAggro=Boolean(rows.find(p=>p.isYou)?.isAggro),leader=threatRows[0]?.c?.id;
  const tank=chars.find(c=>roleOf(c)==='tank'),tankThreat=tank?Number(map[tank.id])||0:0;
  threatRoot.innerHTML=threatRows.length?threatRows.map(({c,value},i)=>{
    const pct=value/maxThreat*100,isBossTarget=ownGuildAggro&&c.id===leader,high=!isBossTarget&&roleOf(c)!=='tank'&&tankThreat>0&&value>=tankThreat*.85;
    return '<div class="wb2d-meter-row '+classKey(c)+' '+(isBossTarget?'aggro ':'')+(high?'high ':'')+'"><div><b>'+(i+1)+'. '+esc(c.name)+(isBossTarget?' <strong>AGGRO</strong>':high?' <strong>HIGH</strong>':'')+'</b><span>'+Math.round(value).toLocaleString()+'</span></div><em><i style="width:'+pct+'%"></i></em></div>';
  }).join(''):'<div class="wb2d-meter-empty">Threat appears when your party attacks.</div>';
}
function wbPoint(el){
  const arena=document.getElementById('wb2dArena');if(!arena||!el)return null;
  const ar=arena.getBoundingClientRect(),r=el.getBoundingClientRect();
  return{x:r.left+r.width/2-ar.left,y:r.top+r.height/2-ar.top,w:ar.width,h:ar.height};
}
function projectileBetween(fromEl,toEl,kind){
  const fx=document.getElementById('wb2dEffects'),a=wbPoint(fromEl),b=wbPoint(toEl);if(!fx||!a||!b)return;
  const dx=b.x-a.x,dy=b.y-a.y,angle=Math.atan2(dy,dx)*180/Math.PI,p=document.createElement('i');
  p.className='wb2d-projectile '+kind;p.style.left=a.x+'px';p.style.top=a.y+'px';p.style.setProperty('--dx',dx+'px');p.style.setProperty('--dy',dy+'px');p.style.setProperty('--angle',angle+'deg');fx.appendChild(p);setTimeout(()=>p.remove(),620);
}
function floatDamage(amount,own=false){
  const fx=document.getElementById('wb2dEffects');if(!fx||!amount)return;
  const el=document.createElement('b');el.className='wb2d-float-damage'+(own?' own':'');el.textContent='−'+Number(amount).toLocaleString();el.style.left=(58+Math.random()*9)+'%';el.style.top=(38+Math.random()*17)+'%';fx.appendChild(el);setTimeout(()=>el.remove(),1000);
}
function checkDamageChanges(parts){
  parts.forEach(p=>{
    const key=p.guildLabel+(p.isYou?'|you':'|other'),now=Number(p.damageDone)||0,old=participantDamage.get(key);
    if(old!=null&&now>old&&!p.isYou)floatDamage(now-old,false);
    participantDamage.set(key,now);
  });
}
function wbDodge(unit,dxPct=0,dyPct=12){
  if(!unit)return;const x=clamp(parseFloat(unit.style.left)||50,7,93),y=clamp(parseFloat(unit.style.top)||50,9,91);
  unit.classList.add('dodging');unit.style.left=clamp(x+dxPct,7,93)+'%';unit.style.top=clamp(y+dyPct,9,91)+'%';
  setTimeout(()=>{if(!unit.isConnected)return;unit.classList.remove('dodging');unit.style.left=x+'%';unit.style.top=y+'%'},900);
}
function ownUnitForCombatId(id){
  const s=String(id||'');if(!s.startsWith('p-'))return null;
  return document.querySelector('[data-unit-key="you-'+CSS.escape(s.slice(2))+'"]')
}
function wbEventUnit(id){
  if(id==='boss')return document.getElementById('wb2dBoss');
  if(String(id||'').startsWith('add-'))return document.querySelector('[data-unit-key="'+CSS.escape(String(id))+'"]');
  return ownUnitForCombatId(id)
}
function wbSpawnAdd(e){
  const units=document.getElementById('wb2dUnits');if(!units||!e?.target||wbEventUnit(e.target))return;
  const el=document.createElement('div'),idx=[...units.querySelectorAll('.wb2d-boss-add')].length;
  el.className='wb2d-unit wb2d-boss-add role-dps';
  el.dataset.unitKey=String(e.target);
  el.style.left=(72+(idx%2)*8)+'%';el.style.top=(34+(idx%3)*16)+'%';
  el.innerHTML='<span class="wb2d-unit-dot">A</span><div class="wb2d-unit-hp"><i></i></div><small>'+esc(e.payload?.name||'Boss Add')+'</small>';
  units.appendChild(el)
}
function wbSetAddHp(id,pct){
  const u=wbEventUnit(id);if(!u)return;const bar=u.querySelector('.wb2d-unit-hp i');if(bar)bar.style.width=clamp(Number(pct)||0,0,100)+'%';
  if(Number(pct)<=0)u.classList.add('wiped')
}
function setOwnHp(id,pct){
  const u=ownUnitForCombatId(id);if(!u)return;const value=clamp(Number(pct)||0,0,100),bar=u.querySelector('.wb2d-unit-hp i');
  if(bar)bar.style.width=value+'%';u.classList.toggle('wiped',value<=0)
}
function wbCastStart(e){
  const cast=document.getElementById('wb2dCast');if(!cast)return;
  const duration=Math.max(1,Number(e.payload?.duration)||1500);cast.hidden=false;cast.querySelector('b').textContent=e.ability||'Boss Cast';
  const fill=cast.querySelector('i');if(fill){fill.style.transition='none';fill.style.width='0%';requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!fill.isConnected)return;fill.style.transition='width '+duration+'ms linear';fill.style.width='100%'}))}
}
function wbCastClear(label=''){
  const cast=document.getElementById('wb2dCast');if(!cast)return;
  if(label)cast.querySelector('b').textContent=label;const fill=cast.querySelector('i');if(fill){fill.style.transition='none';fill.style.width='0%'}
  setTimeout(()=>{if(cast)cast.hidden=true},220)
}
function wbServerTelegraph(e){
  const tele=document.getElementById('wb2dTelegraphs'),boss=document.getElementById('wb2dBoss'),target=wbEventUnit(e.payload?.targetId||e.target),type=e.payload?.mechanicType;
  if(!tele||!boss)return null;
  const bp=wbPoint(boss),tp=wbPoint(target),tg=document.createElement('div');tg.className='wb2d-telegraph '+type;
  if(type==='circle'){
    if(!tp)return null;tg.style.left=tp.x+'px';tg.style.top=tp.y+'px'
  }else if(type==='interrupt'){
    if(!bp)return null;tg.className='wb2d-telegraph circle';tg.style.left=bp.x+'px';tg.style.top=bp.y+'px';tg.style.width='110px';tg.style.height='110px'
  }else{
    if(!bp||!tp)return null;const dx=tp.x-bp.x,dy=tp.y-bp.y,angle=Math.atan2(dy,dx)*180/Math.PI;
    tg.style.left=bp.x+'px';tg.style.top=bp.y+'px';tg.style.transform=(type==='cone'?'translateY(-50%) ':'')+'rotate('+angle+'deg)'
  }
  tg.dataset.serverToken=e.payload?.token||String(e.timestamp);tele.appendChild(tg);return tg
}
function wbClearServerTelegraph(token,result=''){
  const tg=document.querySelector('[data-server-token="'+CSS.escape(String(token||''))+'"]');if(!tg)return;
  if(result)tg.classList.add(result);setTimeout(()=>tg.remove(),360)
}
function wbServerDodge(id){
  const u=ownUnitForCombatId(id);if(!u)return;const y=parseFloat(u.style.top)||50;wbDodge(u,0,y>50?-13:13)
}
function wbStatusTargets(id){
  const s=String(id||'');
  const unit=/^e-\d+$/.test(s)?document.getElementById('wb2dBoss'):wbEventUnit(s);
  return unit?[unit]:[]
}
function wbRenderServerEvent(e){
  if(window.CellboundCombatStatuses?.handle(e,{resolve:wbStatusTargets,speed:1}))return;
  const source=wbEventUnit(e.source),target=wbEventUnit(e.target),sourceChar=String(e.source||'').startsWith('p-'),targetChar=String(e.target||'').startsWith('p-');
  switch(e.type){
    case'COMBAT_START':break;
    case'ABILITY_START':
      if(sourceChar&&source){
        if(e.target==='boss')projectileBetween(source,document.getElementById('wb2dBoss'),source.classList.contains('ranged')?'ranged':'melee');
        else if(target)projectileBetween(source,target,'heal')
      }
      break;
    case'DAMAGE_DEALT':
      if(e.target==='boss'){if(active?.boss&&e.payload?.targetHp!=null){active.boss.currentHp=Number(e.payload.targetHp);active.boss.maxHp=Number(e.payload.targetMax)||active.boss.maxHp;bossHealth(active.boss)}floatDamage(Number(e.amount)||0,true)}
      else if(targetChar){setOwnHp(e.target,Number(e.payload?.targetHpPct)||0);if(source)projectileBetween(source,target,'enemy');message((e.ability||'Boss attack')+' hits','danger')}
      else if(String(e.target||'').startsWith('add-')){wbSetAddHp(e.target,Number(e.payload?.targetHpPct)||0);if(sourceChar&&source&&target)projectileBetween(source,target,'melee')}
      break;
    case'HEAL_RECEIVED':
      if(targetChar){setOwnHp(e.target,Number(e.payload?.targetHpPct)||0);if(source&&target)projectileBetween(source,target,'heal');feed((e.ability||'Heal')+' restores '+Math.round(Number(e.amount)||0)+' health.','heal')}
      break;
    case'RESOURCE_STATE':case'RESOURCE_SPENT':case'RESOURCE_GAINED':
      if(sourceChar)wbSetResource(e.source,e.payload?.resource,e.payload?.value,e.payload?.max);
      break;
    case'MOVEMENT_START':if(sourceChar)wbServerDodge(e.source);break;
    case'MECHANIC_TELEGRAPH':
      wbServerTelegraph(e);feed(active.boss.name+' begins '+(e.ability||'a mechanic')+'.','cast');break;
    case'CAST_START':wbCastStart(e);break;
    case'CAST_FINISH':wbCastClear('CAST COMPLETE');break;
    case'MECHANIC_RESOLVE':
      wbClearServerTelegraph(e.payload?.token,e.result==='avoided'||e.result==='interrupted'?'safe':'impact');
      if(e.result==='avoided')message((e.ability||'Mechanic')+' avoided','victory');
      break;
    case'INTERRUPT':
      if(e.result==='success'){if(source)projectileBetween(source,document.getElementById('wb2dBoss'),'ranged');wbCastClear('INTERRUPTED');wbClearServerTelegraph(e.payload?.token,'safe');message('INTERRUPTED','victory');feed((e.payload?.interruptedAbility||'Boss cast')+' was interrupted.','cast')}
      break;
    case'ADD_SPAWNED':wbSpawnAdd(e);message('ADDS JOIN THE FIGHT','danger');feed((e.payload?.name||'An add')+' joins the encounter.','cast');break;
    case'ADD_DEFEATED':{const u=wbEventUnit(e.target);if(u){u.classList.add('wiped');setTimeout(()=>u.remove(),500)}break}
    case'CROWD_CONTROL':if(target){target.classList.add('dodging');setTimeout(()=>target.classList.remove('dodging'),700);feed('Your party controls a dangerous add.','cast')}break;
    case'PHASE_CHANGE':window.CellboundFX?.phase?.(e.ability||'World boss phase',e.payload?.healthPct);message(String(e.ability||'NEW PHASE').toUpperCase(),'danger');feed((e.ability||'A new boss phase')+' begins.','cast');break;
    case'ENRAGE':message(e.result==='hard'?'HARD ENRAGE':'ENRAGE','danger');feed((e.ability||'Enrage')+' activates.','wipe');break;
    case'UNIQUE_EFFECT_TRIGGER':feed((e.ability||'Unique item effect')+' activates.','heal');break;
    case'PLAYER_DEFEATED':if(targetChar){setOwnHp(e.target,0);feed('One of your adventurers has fallen.','wipe')}break;
    case'ENEMY_DEFEATED':if(e.target==='boss'){message('WORLD BOSS DEFEATED','victory');window.CellboundFX?.victory?.({eyebrow:'WORLD BOSS DEFEATED',title:active?.boss?.name||'World Boss',copy:'Your party helped bring down a shared world threat.'})}else{const u=wbEventUnit(e.target);if(u)setTimeout(()=>u.remove(),400)}break;
    case'COMBAT_END':break;
  }
}
async function playServerEvents(events){
  const timeline=(Array.isArray(events)?events:[]).slice().sort((a,b)=>(Number(a.timestamp)||0)-(Number(b.timestamp)||0));
  if(!timeline.length||!active)return;
  const bossId=active.boss?.id;
  return await new Promise(resolve=>{
    let index=0,simTime=0,lastFrame=performance.now(),finished=false;
    const finish=()=>{if(finished)return;finished=true;resolve()};
    const frame=now=>{
      if(finished)return;
      if(!active||active.boss?.id!==bossId){finish();return}
      const rawDelta=Math.max(0,now-lastFrame);lastFrame=now;
      simTime+=Math.min(rawDelta,100);
      const frameStarted=performance.now();let handled=0;
      while(index<timeline.length&&(Number(timeline[index].timestamp)||0)<=simTime+4&&handled<18&&performance.now()-frameStarted<8){
        const event=timeline[index++];handled++;
        try{wbRenderServerEvent(event)}
        catch(error){console.warn('World boss combat visual recovered',event?.type,event?.ability,error)}
      }
      if(index>=timeline.length){finish();return}
      requestAnimationFrame(frame)
    };
    requestAnimationFrame(frame)
  })
}
function wipeOwnParty(){
  document.querySelectorAll('#wb2dUnits .wb2d-unit.own').forEach((u,i)=>setTimeout(()=>{u.classList.add('wiped');const hp=u.querySelector('.wb2d-unit-hp i');if(hp)hp.style.width='0%'},i*90));
  message('YOUR PARTY WIPED','wipe');feed('Your party was overwhelmed. All five adventurers gained 25% Cell Shock.','wipe');
}
function victory(){
  if(active?.boss)active.boss.status='dormant';
  stopCombatTimers();message('WORLD BOSS DEFEATED','victory');feed(active.boss.name+' has fallen. Personal rewards have been issued.','victory');
  document.getElementById('wb2dAttackNow').disabled=true;
  document.getElementById('wb2dStatus').textContent='Encounter complete · personal reward available';
  window.CellboundSocial?.loadWorld?.();
}
async function combatState(){
  if(!active||!db)return null;
  const {data,error}=await db.rpc('get_world_boss_combat_state',{p_boss_id:active.boss.id});
  if(error){feed(error.message||'Could not refresh encounter state.','error');return null}
  return data;
}
async function refresh(){
  if(attackBusy)return;
  const data=await combatState();if(!data||!active)return;
  active.boss=data.boss||active.boss;const parts=Array.isArray(data.participants)?data.participants:[];
  active.partyThreat=data.yourPartyThreat||{};active.combatState=data.yourCombatState||active.combatState||{};checkDamageChanges(parts);renderParticipants(parts);renderCombatMeters(parts,active.partyThreat);bossHealth(active.boss);
  document.getElementById('wb2dBossName').textContent=active.boss.name;
  document.getElementById('wb2dBossLabel').textContent=active.boss.name.toUpperCase()+' · LV '+worldBossLevel(active.boss);
  document.getElementById('wb2dStatus').textContent='Lv. '+worldBossLevel(active.boss)+' · WORLD BOSS · Tier '+active.boss.tier+' · '+parts.length+'/'+active.boss.playerCap+' commanders engaged · Party attacks every 5 seconds';
  if(active.combatState?.wiped){stopAttackTimer();const b=document.getElementById('wb2dAttackNow');if(b)b.disabled=true;document.getElementById('wb2dStatus').textContent='Your party has wiped · recover before rejoining combat';}
  if(active.boss.status==='dormant'||Number(active.boss.currentHp)<=0)victory();
}
async function attack(manual=false){
  if(!active||attackBusy||!db)return;
  attackBusy=true;const btn=document.getElementById('wb2dAttackNow');if(btn)btn.disabled=true;
  try{
    const {data,error}=await db.functions.invoke('world-boss-combat-reborn',{body:{bossId:active.boss.id}});
    if(error){
      const msg=String(error?.context?.body?.error||error?.message||'Attack failed.');
      if(!msg.toLowerCase().includes('regrouping')&&!msg.toLowerCase().includes('already resolving'))feed(msg,'error');
      return;
    }
    if(data?.error){const msg=String(data.error);if(!msg.toLowerCase().includes('regrouping'))feed(msg,'error');return}
    window.CellboundCombatStandard?.assertServerPayload?.(data,'world-bosses');
    if(data?.combatModel==='Combat Reborn')document.getElementById('wb2dStatus').textContent='Combat Reborn · server-authoritative world encounter';
    active.partyThreat=data?.threatBreakdown||active.partyThreat||{};
    if(data?.combatState)active.combatState=data.combatState;
    await playServerEvents(data?.events||[]);
    const latest=await combatState();
    if(latest&&active){active.boss=latest.boss||active.boss;active.partyThreat=latest.yourPartyThreat||active.partyThreat;active.combatState=latest.yourCombatState||active.combatState;const parts=Array.isArray(latest.participants)?latest.participants:[];checkDamageChanges(parts);renderParticipants(parts);renderCombatMeters(parts,active.partyThreat);bossHealth(active.boss)}
    if(data?.wiped){
      Game.applyPartyCellShock?.(25);await Game.persistState?.();wipeOwnParty();stopAttackTimer();
    }else{
      const dmg=Number(data?.damage)||0,healing=Number(data?.healing)||0,healingThreat=Number(data?.healingThreat)||0,threat=Number(data?.threat)||0;
      feed('Combat Reborn '+(data?.engineVersion||'')+' · your party dealt '+dmg.toLocaleString()+' damage · '+healing.toLocaleString()+' healing · +'+threat.toLocaleString()+' threat.','damage');
      if(data?.currentHp!=null){active.boss.currentHp=data.currentHp;active.boss.maxHp=data.maxHp||active.boss.maxHp;bossHealth(active.boss)}
    }
    if(data?.killed)victory();
    window.CellboundSocial?.loadWorld?.();
  }finally{
    attackBusy=false;if(btn&&active&&active.boss.status!=='dormant'&&!active.combatState?.wiped)btn.disabled=false;
  }
}
function stopAttackTimer(){if(attackTimer){clearInterval(attackTimer);attackTimer=null}}
function stopCombatTimers(){
  if(pollTimer){clearInterval(pollTimer);pollTimer=null}
  stopAttackTimer();
}
async function open(bossId){
  Game=window.CellboundGame;if(!Game?.ready)return;
  db=Game.getSupabase?.();if(!db)return;
  stopCombatTimers();participantDamage.clear();
  const root=ensureShell(),known=(window.CellboundSocial?.getWorldBosses?.()||[]).find(b=>b.id===bossId);
  active={boss:known||{id:bossId,name:'World Boss',tier:1,level:8,currentHp:1,maxHp:1,status:'in_combat'},partyThreat:{},combatState:{}};
  root.hidden=false;document.body.classList.add('wb2d-open');
  document.getElementById('wb2dFeed').innerHTML='';
  document.getElementById('wb2dMessage').hidden=true;
  document.getElementById('wb2dAttackNow').disabled=false;
  const env=document.getElementById('wb2dEnvironment');if(env){env.dataset.theme='';env.innerHTML=''}
  setArenaTheme(active.boss);window.CellboundFX?.boss?.(active.boss.name||'World Boss','Shared world encounter');feed('Your party enters the shared encounter.','system');
  await refresh();
  if(!active)return;
  pollTimer=setInterval(refresh,2000);
  if(active.combatState?.wiped)return;
  attackTimer=setInterval(()=>attack(false),5250);
  setTimeout(()=>attack(false),850);
}
function close(){
  stopCombatTimers();active=null;document.body.classList.remove('wb2d-open');
  const root=document.getElementById('worldBoss2dBackdrop');if(root)root.hidden=true;
  window.CellboundSocial?.loadWorld?.();
}
window.CellboundWorldBoss2D={open,close};
})();