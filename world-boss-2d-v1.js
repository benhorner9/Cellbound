(()=>{
'use strict';

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let Game=null,db=null,active=null,pollTimer=null,attackTimer=null,mechanicTimer=null,attackBusy=false,participantDamage=new Map(),mechanicSeq=0;

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
const isRanged=c=>['Hunter','Mage','Priest'].includes(c.class)||(c.class==='Druid'&&c.spec!=='Feral');
const party=()=>Game?.getPartyCharacters?.()||[];

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
          <div class="wb2d-legend"><span><i class="tank"></i>Tank</span><span><i class="healer"></i>Healer</span><span><i class="dps"></i>Damage</span><b>Your party has a gold ring.</b></div>
        </div>
        <aside class="wb2d-raid-panel">
          <div class="wb2d-raid-head"><span>RAID FORCE</span><small>Live shared encounter</small></div>
          <div id="wb2dRaidList" class="wb2d-raid-list"></div>
          <div class="wb2d-feed-head"><span>COMBAT FEED</span></div>
          <div id="wb2dFeed" class="wb2d-feed"></div>
        </aside>
      </div>
      <footer class="wb2d-footer"><span>Damage and boss health are server-authoritative. Other guild parties are represented in standard Tank / Healer / Damage formations.</span><button id="wb2dAttackNow">ATTACK NOW</button></footer>
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
function groupParty(participant,index){
  if(participant.isYou){
    return party().map((c,i)=>({key:'you-'+(c.id||i),name:c.name,role:roleOf(c),ranged:isRanged(c),own:true}));
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
  return{x:clamp(anchor.x+nx*forward+px*side,5,93),y:clamp(anchor.y+ny*forward+py*side,7,93)};
}
function renderParticipants(parts){
  const units=document.getElementById('wb2dUnits'),raid=document.getElementById('wb2dRaidList');
  if(!units||!raid)return;
  const previous=new Map([...units.querySelectorAll('[data-unit-key]')].map(e=>[e.dataset.unitKey,e]));
  const nextKeys=new Set(),html=[];
  parts.forEach((p,index)=>{
    const anchor=groupAnchors[index%groupAnchors.length],members=groupParty(p,index),guild=String(p.guildLabel||'Unknown Guild');
    html.push(`<article class="wb2d-raid-row ${p.isYou?'you':''}"><div><b>${esc(guild)}</b><small>Party iLvl ${Number(p.partyIlvl||0).toFixed(1)}${p.isYou?' · YOUR PARTY':''}</small></div><strong>${Number(p.damageDone||0).toLocaleString()}</strong></article>`);
    members.forEach((u,i)=>{
      const pos=unitPosition(anchor,u,i),key=u.key;nextKeys.add(key);
      let el=previous.get(key);
      if(!el){
        el=document.createElement('div');el.className='wb2d-unit role-'+u.role+(u.own?' own':'');
        el.dataset.unitKey=key;el.innerHTML='<span class="wb2d-unit-dot">'+(u.role==='tank'?'T':u.role==='healer'?'H':'D')+'</span><div class="wb2d-unit-hp"><i></i></div><small></small>';
        units.appendChild(el);
      }
      el.className='wb2d-unit role-'+u.role+(u.own?' own':'')+(u.ranged?' ranged':' melee');
      el.style.left=pos.x+'%';el.style.top=pos.y+'%';
      el.dataset.x=pos.x;el.dataset.y=pos.y;el.dataset.guild=guild;
      el.querySelector('small').textContent=u.own?u.name:(i===0?guild:'');
      const hp=el.querySelector('.wb2d-unit-hp i');if(hp&&!el.classList.contains('wiped'))hp.style.width='100%';
    });
  });
  previous.forEach((el,key)=>{if(!nextKeys.has(key))el.remove()});
  raid.innerHTML=html.join('')||'<div class="wb2d-empty">No commanders engaged.</div>';
  document.getElementById('wb2dPlayerCount').textContent=parts.length+' COMMANDER'+(parts.length===1?'':'S');
}
function projectileFrom(el,role){
  const arena=document.getElementById('wb2dArena'),boss=document.getElementById('wb2dBoss'),fx=document.getElementById('wb2dEffects');
  if(!arena||!boss||!fx||!el)return;
  const ar=arena.getBoundingClientRect(),a=el.getBoundingClientRect(),b=boss.getBoundingClientRect();
  const x=a.left+a.width/2-ar.left,y=a.top+a.height/2-ar.top,tx=b.left+b.width/2-ar.left,ty=b.top+b.height/2-ar.top;
  const p=document.createElement('i');p.className='wb2d-projectile '+role;p.style.left=x+'px';p.style.top=y+'px';p.style.setProperty('--dx',(tx-x)+'px');p.style.setProperty('--dy',(ty-y)+'px');fx.appendChild(p);setTimeout(()=>p.remove(),620);
}
function pulseRaid(){
  const units=[...document.querySelectorAll('#wb2dUnits .wb2d-unit')];
  if(!units.length)return;
  units.forEach((u,i)=>{
    setTimeout(()=>{
      if(!active||u.classList.contains('wiped'))return;
      u.classList.add('attacking');setTimeout(()=>u.classList.remove('attacking'),450);
      if(u.classList.contains('ranged')||u.classList.contains('role-healer'))projectileFrom(u,u.classList.contains('role-healer')?'heal':'ranged');
      else if(i%2===0)projectileFrom(u,'melee');
    },(i%8)*55);
  });
}
function floatDamage(amount,own=false){
  const fx=document.getElementById('wb2dEffects');if(!fx||!amount)return;
  const el=document.createElement('b');el.className='wb2d-float-damage'+(own?' own':'');el.textContent='−'+Number(amount).toLocaleString();el.style.left=(58+Math.random()*9)+'%';el.style.top=(38+Math.random()*17)+'%';fx.appendChild(el);setTimeout(()=>el.remove(),1000);
}
function checkDamageChanges(parts){
  parts.forEach(p=>{
    const key=p.guildLabel+(p.isYou?'|you':'|other'),now=Number(p.damageDone)||0,old=participantDamage.get(key);
    if(old!=null&&now>old){floatDamage(now-old,p.isYou);pulseRaid()}
    participantDamage.set(key,now);
  });
}
function randomMechanic(){
  if(!active)return;
  const t=themeFor(active.boss.id),name=t.mechanics[mechanicSeq++%t.mechanics.length],types=['cone','circle','line'],type=types[mechanicSeq%types.length];
  const cast=document.getElementById('wb2dCast'),tele=document.getElementById('wb2dTelegraphs');
  if(!cast||!tele)return;
  cast.hidden=false;cast.querySelector('b').textContent=name;const fill=cast.querySelector('i');fill.style.transition='none';fill.style.width='0%';void fill.offsetWidth;fill.style.transition='width 1.7s linear';fill.style.width='100%';
  const tg=document.createElement('div');tg.className='wb2d-telegraph '+type;
  if(type==='circle'){tg.style.left=(23+Math.random()*52)+'%';tg.style.top=(24+Math.random()*52)+'%'}
  tele.appendChild(tg);
  document.querySelectorAll('#wb2dUnits .wb2d-unit').forEach((u,i)=>{if((i+mechanicSeq)%3===0)u.classList.add('dodging')});
  feed(active.boss.name+' begins '+name+'.','cast');
  setTimeout(()=>{
    tg.classList.add('impact');message(name+' resolves','danger');
    document.querySelectorAll('#wb2dUnits .wb2d-unit.dodging').forEach(u=>u.classList.remove('dodging'));
    setTimeout(()=>{tg.remove();cast.hidden=true},430);
  },1750);
}
function wipeOwnParty(){
  document.querySelectorAll('#wb2dUnits .wb2d-unit.own').forEach((u,i)=>setTimeout(()=>{u.classList.add('wiped');const hp=u.querySelector('.wb2d-unit-hp i');if(hp)hp.style.width='0%'},i*90));
  message('YOUR PARTY WIPED','wipe');feed('Your party was overwhelmed. All five adventurers gained 25% Cell Shock.','wipe');
}
function victory(){
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
  const data=await combatState();if(!data||!active)return;
  active.boss=data.boss||active.boss;const parts=Array.isArray(data.participants)?data.participants:[];
  checkDamageChanges(parts);renderParticipants(parts);bossHealth(active.boss);
  document.getElementById('wb2dBossName').textContent=active.boss.name;
  document.getElementById('wb2dBossLabel').textContent=active.boss.name.toUpperCase();
  document.getElementById('wb2dStatus').textContent='Tier '+active.boss.tier+' · '+parts.length+'/'+active.boss.playerCap+' commanders engaged · Party attacks every 5 seconds';
  if(active.boss.status==='dormant'||Number(active.boss.currentHp)<=0)victory();
}
async function attack(manual=false){
  if(!active||attackBusy||!db)return;
  attackBusy=true;const btn=document.getElementById('wb2dAttackNow');if(btn)btn.disabled=true;
  try{
    const {data,error}=await db.rpc('attack_world_boss',{p_boss_id:active.boss.id});
    if(error){
      if(!String(error.message||'').toLowerCase().includes('regrouping'))feed(error.message||'Attack failed.','error');
      return;
    }
    pulseRaid();
    if(data?.wiped){
      Game.applyPartyCellShock?.(25);await Game.persistState?.();wipeOwnParty();stopAttackTimer();
    }else{
      const dmg=Number(data?.damage)||0;floatDamage(dmg,true);feed('Your party dealt '+dmg.toLocaleString()+' damage.','damage');
      if(data?.currentHp!=null){active.boss.currentHp=data.currentHp;active.boss.maxHp=data.maxHp||active.boss.maxHp;bossHealth(active.boss)}
    }
    if(data?.killed)victory();
    window.CellboundSocial?.loadWorld?.();
  }finally{
    attackBusy=false;if(btn&&active&&active.boss.status!=='dormant')btn.disabled=false;
  }
}
function stopAttackTimer(){if(attackTimer){clearInterval(attackTimer);attackTimer=null}}
function stopCombatTimers(){
  if(pollTimer){clearInterval(pollTimer);pollTimer=null}
  if(mechanicTimer){clearInterval(mechanicTimer);mechanicTimer=null}
  stopAttackTimer();
}
async function open(bossId){
  Game=window.CellboundGame;if(!Game?.ready)return;
  db=Game.getSupabase?.();if(!db)return;
  stopCombatTimers();participantDamage.clear();mechanicSeq=0;
  const root=ensureShell(),known=(window.CellboundSocial?.getWorldBosses?.()||[]).find(b=>b.id===bossId);
  active={boss:known||{id:bossId,name:'World Boss',tier:1,currentHp:1,maxHp:1,status:'in_combat'}};
  root.hidden=false;document.body.classList.add('wb2d-open');
  document.getElementById('wb2dFeed').innerHTML='';
  document.getElementById('wb2dMessage').hidden=true;
  document.getElementById('wb2dAttackNow').disabled=false;
  const env=document.getElementById('wb2dEnvironment');if(env){env.dataset.theme='';env.innerHTML=''}
  setArenaTheme(active.boss);feed('Your party enters the shared encounter.','system');
  await refresh();
  if(!active)return;
  pollTimer=setInterval(refresh,2000);
  mechanicTimer=setInterval(randomMechanic,4300);
  attackTimer=setInterval(()=>attack(false),5250);
  setTimeout(()=>attack(false),850);
  setTimeout(randomMechanic,1800);
}
function close(){
  stopCombatTimers();active=null;document.body.classList.remove('wb2d-open');
  const root=document.getElementById('worldBoss2dBackdrop');if(root)root.hidden=true;
  window.CellboundSocial?.loadWorld?.();
}
window.CellboundWorldBoss2D={open,close};
})();