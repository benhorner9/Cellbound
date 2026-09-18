(()=>{
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let Game=null,battle=null,timer=null;

const roleOf=c=>Game?.classes?.[c?.class]?.specs?.[c?.spec]?.role||'dps';
const roleLabel=r=>r==='dps'?'Damage':r[0].toUpperCase()+r.slice(1);
const iconOf=c=>({Warrior:'W',Paladin:'P',Priest:'✦',Druid:'D',Hunter:'H',Rogue:'R',Mage:'M'})[c.class]||'•';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const formatPct=n=>Math.round(clamp(n,0,100))+'%';

function log(text,tone=''){
  if(!battle)return;
  battle.logs.push({text,tone});
  battle.logs=battle.logs.slice(-10);
  renderLog();
}
function currentKnowledge(){return Number(battle?.knowledge)||0}
function mechanicHint(m){
  const k=currentKnowledge();
  if(k<20)return'Your company has not identified this mechanic yet.';
  if(k<40)return m.type==='cleave'?'A dangerous frontal attack is forming.':m.type==='soak'?'A role-specific marker has appeared.':m.type==='roar'?'This cast looks interruptible.':'A heavy impact is coming.';
  if(k<60)return m.type==='cleave'?'Kael is turning toward the group. Reposition your tank.':m.type==='soak'?'The tank should intercept the red marker.':m.type==='roar'?'Interrupt before the cast completes.':'Brace the party before impact.';
  return m.hint;
}
function phase(){
  const pct=battle.bossHp/battle.bossMax;
  return pct>.7?1:pct>.35?2:3;
}
function phaseName(){
  return phase()===1?'Hold the Gate':phase()===2?'Warden Unbound':'Last Stand';
}
function basePositions(chars){
  let d=0;
  return chars.map(c=>{
    const role=roleOf(c);
    if(role==='tank')return{x:57,y:51};
    if(role==='healer')return{x:27,y:69};
    const spots=[{x:33,y:31},{x:32,y:50},{x:39,y:72}];
    return spots[d++]||{x:35,y:60};
  });
}
function buildRoot(){
  let root=document.getElementById('cbfOverlay');
  if(!root){root=document.createElement('div');root.id='cbfOverlay';root.className='cbf-overlay';root.hidden=true;document.body.appendChild(root)}
  return root;
}
function progressHTML(){
  const nodes=['Broken Gate','Hall of Embers','Kael','Furnace','Embermaw','Depths','Vaultheart'];
  return nodes.map((n,i)=>`<span class="${i<2?'done':i===2?'current':''}"></span>`).join('')+`<small>3 / 7 · ASH WARDEN KAEL</small>`;
}
function unitHTML(u){
  return `<div class="cbf-unit ${u.role}" data-cbf-unit="${esc(u.id)}" style="--x:${u.x}%;--y:${u.y}%"><div class="cbf-unit-hp"><i style="width:${u.hp}%"></i></div><div class="cbf-unit-core">${esc(u.icon)}</div><div class="cbf-unit-label"><b>${esc(u.name)}</b>${esc(roleLabel(u.role))}</div></div>`;
}
function partySideHTML(){
  return battle.units.map(u=>`<div class="cbf-party-row" data-cbf-row="${esc(u.id)}"><i class="cbf-role-dot ${u.role}"></i><div><b>${esc(u.name)}</b><small>${esc(u.class)} · ${esc(u.spec)}</small><div class="cbf-mini-hp"><i style="width:${u.hp}%"></i></div></div><strong>${Math.round(u.hp)}%</strong></div>`).join('');
}
function renderBattle(){
  const root=buildRoot();root.hidden=false;
  root.innerHTML=`<section class="cbf-shell">
    <header class="cbf-header">
      <div><span class="cbf-kicker">THE ASHEN VAULT · 2D BATTLEFIELD PROTOTYPE</span><h2>Ash Warden Kael</h2></div>
      <div class="cbf-boss-hud"><div class="cbf-boss-copy"><span id="cbfPhase">PHASE 1 · HOLD THE GATE</span><b id="cbfBossValue">100%</b></div><div class="cbf-boss-bar"><i id="cbfBossFill"></i></div></div>
      <button class="cbf-close" data-cbf-close title="Retreat from battle">×</button>
    </header>
    <div class="cbf-progress">${progressHTML()}</div>
    <div class="cbf-body">
      <div class="cbf-arena-wrap">
        <div class="cbf-arena" id="cbfArena">
          <div class="cbf-forge-left"></div><div class="cbf-forge-right"></div><div class="cbf-lava"></div>
          <div class="cbf-action-flash" id="cbfFlash"></div>
          <div class="cbf-event-banner" id="cbfBanner"></div>
          <div class="cbf-cast-box" id="cbfCastBox"><div class="cbf-cast-top"><b id="cbfCastName">Kael watches the formation</b><span id="cbfCastTime">—</span></div><div class="cbf-cast-track"><i id="cbfCastFill"></i></div><small class="cbf-cast-hint" id="cbfCastHint">Your party is engaging automatically.</small></div>
          <div class="cbf-telegraph cbf-cone" id="cbfCone"></div>
          <div class="cbf-telegraph cbf-soak" id="cbfSoak"></div>
          <div class="cbf-telegraph cbf-warning-ring" id="cbfRing"></div>
          ${battle.units.map(unitHTML).join('')}
          <div class="cbf-unit cbf-boss" data-cbf-boss style="--x:72%;--y:51%"><div class="cbf-unit-core">♜</div><div class="cbf-facing" id="cbfFacing" style="--facing:180deg"></div><div class="cbf-unit-label"><b>Ash Warden Kael</b>Mini-Boss</div></div>
          <div class="cbf-result" id="cbfResult" hidden></div>
        </div>
        <div class="cbf-command-wrap">
          <div class="cbf-command-label"><span>COMMAND YOUR COMPANY</span><small>Basic attacks, healing and threat are automatic. You intervene when mechanics matter.</small></div>
          <div class="cbf-commands">
            <button data-cbf-command="focus"><b>FOCUS TARGET</b><small>Increase party damage for 6 seconds.</small></button>
            <button data-cbf-command="tank" id="cbfTankCommand"><b>TANK POSITION</b><small>Reposition Kael away from the party.</small></button>
            <button data-cbf-command="interrupt" id="cbfInterrupt"><b>INTERRUPT</b><small>Stop an interruptible cast.</small></button>
            <button data-cbf-command="defend" id="cbfDefend"><b>DEFENSIVE STANCE</b><small>Reduce incoming damage for 5 seconds.</small></button>
            <button data-cbf-command="cell" id="cbfCell"><b>USE CELL ABILITY</b><small>Unleash a coordinated Cell burst.</small></button>
            <button data-cbf-command="consumable" id="cbfConsumable"><b>CONSUMABLE</b><small id="cbfConsumableName">Use available expedition stock.</small></button>
          </div>
        </div>
      </div>
      <aside class="cbf-side">
        <div class="cbf-side-head"><small>ACTIVE FIVE · PARTY ILVL ${Math.round(Number(Game.partyItemLevel?.())||0)}</small><h3>Your Company</h3><p>Red = Tank · Blue = Healer · Green = Damage</p></div>
        <div class="cbf-party-list" id="cbfPartyList">${partySideHTML()}</div>
        <div class="cbf-log" id="cbfLog"><small>COMBAT LOG</small></div>
      </aside>
    </div>
  </section>`;
  root.querySelector('[data-cbf-close]').addEventListener('click',retreat);
  root.querySelectorAll('[data-cbf-command]').forEach(btn=>btn.addEventListener('click',()=>command(btn.dataset.cbfCommand)));
  updateConsumableLabel();
  renderLog();
  updateVisuals();
}
function renderLog(){
  const root=document.getElementById('cbfLog');if(!root||!battle)return;
  root.innerHTML='<small>COMBAT LOG</small>'+battle.logs.map(l=>`<div class="cbf-log-line ${l.tone||''}">${esc(l.text)}</div>`).join('');
  root.scrollTop=root.scrollHeight;
}
function updateVisuals(){
  if(!battle)return;
  const bossPct=clamp(battle.bossHp/battle.bossMax*100,0,100);
  const fill=document.getElementById('cbfBossFill');if(fill)fill.style.width=bossPct+'%';
  const val=document.getElementById('cbfBossValue');if(val)val.textContent=Math.ceil(bossPct)+'%';
  const ph=document.getElementById('cbfPhase');if(ph)ph.textContent=`PHASE ${phase()} · ${phaseName().toUpperCase()}`;
  battle.units.forEach(u=>{
    const el=document.querySelector(`[data-cbf-unit="${CSS.escape(u.id)}"]`);
    if(el){el.style.setProperty('--x',u.x+'%');el.style.setProperty('--y',u.y+'%');el.dataset.low=u.hp<35?'1':'0';const hp=el.querySelector('.cbf-unit-hp i');if(hp)hp.style.width=clamp(u.hp,0,100)+'%'}
    const row=document.querySelector(`[data-cbf-row="${CSS.escape(u.id)}"]`);
    if(row){const hp=row.querySelector('.cbf-mini-hp i');if(hp)hp.style.width=clamp(u.hp,0,100)+'%';const strong=row.querySelector('strong');if(strong)strong.textContent=Math.max(0,Math.round(u.hp))+'%'}
  });
  updateCommands();
}
function updateCommands(){
  if(!battle)return;
  const m=battle.mechanic,now=performance.now();
  const tank=document.getElementById('cbfTankCommand'),inter=document.getElementById('cbfInterrupt'),def=document.getElementById('cbfDefend'),cell=document.getElementById('cbfCell');
  [tank,inter,def].forEach(x=>x?.classList.remove('mechanic'));
  if(tank){tank.querySelector('b').textContent=m?.type==='soak'?'TANK TO MARKER':m?.type==='cleave'?'FACE BOSS AWAY':'TANK POSITION';tank.classList.toggle('mechanic',m?.required==='tank'&&!m.handled)}
  inter?.classList.toggle('mechanic',m?.required==='interrupt'&&!m.handled);
  def?.classList.toggle('mechanic',m?.required==='defend'&&!m.handled);
  if(cell){const ready=now>=battle.cellReadyAt;cell.disabled=!ready;cell.querySelector('small').textContent=ready?'Unleash a coordinated Cell burst.':`Recharging · ${Math.ceil((battle.cellReadyAt-now)/1000)}s`}
  const focus=document.querySelector('[data-cbf-command="focus"]');focus?.classList.toggle('active',now<battle.focusUntil);
  def?.classList.toggle('active',now<battle.defendUntil);
}
function showBanner(text){
  const el=document.getElementById('cbfBanner');if(!el)return;el.textContent=text;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
}
function flash(){
  const el=document.getElementById('cbfFlash');if(!el)return;el.classList.remove('go');void el.offsetWidth;el.classList.add('go');
}
function spawnFloat(x,y,text,type='damage'){
  const arena=document.getElementById('cbfArena');if(!arena)return;
  const el=document.createElement('div');el.className=`cbf-float ${type}`;el.textContent=text;el.style.left=x+'%';el.style.top=y+'%';arena.appendChild(el);setTimeout(()=>el.remove(),950);
}
function hitUnit(u,amount,reason=''){
  if(!u||u.hp<=0)return;
  const defended=performance.now()<battle.defendUntil;
  const dmg=Math.max(.5,amount*(defended?.55:1));u.hp=clamp(u.hp-dmg,0,100);
  const el=document.querySelector(`[data-cbf-unit="${CSS.escape(u.id)}"]`);if(el){el.dataset.hit='1';setTimeout(()=>el.dataset.hit='0',180)}
  spawnFloat(u.x,u.y-4,'-'+Math.round(dmg),'damage');
  if(reason&&dmg>8)log(`${u.name} takes ${Math.round(dmg)}% from ${reason}.`,'bad');
}
function healUnit(u,amount){
  if(!u||u.hp<=0)return;const before=u.hp;u.hp=clamp(u.hp+amount,0,100);if(u.hp>before)spawnFloat(u.x,u.y-4,'+'+Math.round(u.hp-before),'heal');
}
function bossDamage(amount,label='',visual=true){
  battle.bossHp=clamp(battle.bossHp-amount,0,battle.bossMax);
  if(visual)spawnFloat(72,44,'-'+Math.round(amount),'damage');
  if(label)log(label,'good');
}
function projectile(from,to,type=''){
  const arena=document.getElementById('cbfArena');if(!arena||!from||!to)return;
  const p=document.createElement('div');p.className=`cbf-projectile ${type}`;p.style.left=from.x+'%';p.style.top=from.y+'%';arena.appendChild(p);
  requestAnimationFrame(()=>{p.style.left=to.x+'%';p.style.top=to.y+'%'});setTimeout(()=>p.remove(),420);
}
function setCast(m){
  const box=document.getElementById('cbfCastBox'),name=document.getElementById('cbfCastName'),time=document.getElementById('cbfCastTime'),hint=document.getElementById('cbfCastHint'),fill=document.getElementById('cbfCastFill');
  if(!box)return;
  if(!m){box.classList.remove('active');name.textContent='Kael pressures the frontline';time.textContent='AUTO';hint.textContent='Your heroes continue fighting automatically.';fill.style.width='0%';return}
  box.classList.add('active');name.textContent=currentKnowledge()<20?'Unknown Warden Technique':m.name;hint.textContent=mechanicHint(m);
}
function updateCast(){
  const m=battle?.mechanic;if(!m)return;
  const now=performance.now(),pct=clamp((now-m.started)/m.duration*100,0,100),left=Math.max(0,(m.duration-(now-m.started))/1000);
  const fill=document.getElementById('cbfCastFill'),time=document.getElementById('cbfCastTime');if(fill)fill.style.width=pct+'%';if(time)time.textContent=left.toFixed(1)+'s';
}
function showTelegraph(m){
  const cone=document.getElementById('cbfCone'),soak=document.getElementById('cbfSoak'),ring=document.getElementById('cbfRing'),facing=document.getElementById('cbfFacing');
  [cone,soak,ring].forEach(x=>x?.classList.remove('show'));
  if(m.type==='cleave'&&cone){cone.style.left='72%';cone.style.top='51%';cone.style.transform='translate(8px,-50%) rotate(180deg)';cone.classList.add('show');if(facing)facing.style.setProperty('--facing','180deg')}
  if(m.type==='soak'&&soak){soak.style.left='79%';soak.style.top='67%';soak.style.transform='translate(-50%,-50%)';soak.classList.add('show')}
  if(m.type==='slam'&&ring){ring.style.left='72%';ring.style.top='51%';ring.style.transform='translate(-50%,-50%)';ring.classList.add('show')}
}
function hideTelegraphs(){
  ['cbfCone','cbfSoak','cbfRing'].forEach(id=>document.getElementById(id)?.classList.remove('show'));
}
const MECHANICS=[
  {type:'cleave',name:'Crushing Cleave',duration:3300,required:'tank',hint:'Move your tank around Kael so the red cone faces away from the party.'},
  {type:'roar',name:"Warden's Roar",duration:2900,required:'interrupt',hint:'Interrupt the roar before the cast finishes.'},
  {type:'soak',name:'Ashen Brand',duration:3500,required:'tank',hint:'Move the tank into the glowing red circle before Ashen Brand detonates.'},
  {type:'cleave',name:'Crushing Cleave',duration:2850,required:'tank',hint:'Kael is turning toward your backline again. Face him away.'},
  {type:'roar',name:'Wardenbreaker',duration:2450,required:'interrupt',hint:'Interrupt Wardenbreaker before the armour-shattering cast completes.'},
  {type:'slam',name:'Anvilbreaker',duration:2700,required:'defend',hint:'Use Defensive Stance before the heavy party-wide impact.'}
];
function beginMechanic(){
  if(!battle||battle.mechanic||battle.finished)return;
  const base=MECHANICS[battle.mechanicIndex%MECHANICS.length],speed=phase()===3?.82:phase()===2?.92:1;
  battle.mechanic={...base,duration:base.duration*speed,started:performance.now(),handled:false};
  battle.mechanicIndex++;
  setCast(battle.mechanic);showTelegraph(battle.mechanic);
  showBanner(currentKnowledge()>=20?battle.mechanic.name:'DANGER');
  log(`Kael begins ${currentKnowledge()>=20?battle.mechanic.name:'an unknown technique'}.`,'info');
}
function clearMechanic(delay=0){
  const fn=()=>{if(!battle||battle.finished)return;battle.mechanic=null;hideTelegraphs();setCast(null);battle.nextMechanicAt=performance.now()+(phase()===3?4300:5600)};
  delay?setTimeout(fn,delay):fn();
}
function handleTankCommand(){
  const m=battle.mechanic,tank=battle.units.find(u=>u.role==='tank');if(!tank)return;
  if(m?.type==='cleave'){
    tank.x=83;tank.y=51;m.handled=true;
    const cone=document.getElementById('cbfCone'),facing=document.getElementById('cbfFacing');if(cone)cone.style.transform='translate(8px,-50%) rotate(0deg)';if(facing)facing.style.setProperty('--facing','0deg');
    log(`${tank.name} pulls Kael's facing away from the company.`,'good');showBanner('BOSS TURNED');
  }else if(m?.type==='soak'){
    tank.x=79;tank.y=67;m.handled=true;log(`${tank.name} moves into Ashen Brand.`,'good');showBanner('TANK SOAK');
  }else{
    tank.x=61;tank.y=51;log(`${tank.name} adjusts Kael's position.`,'info');
  }
  updateVisuals();
}
function interrupt(){
  const m=battle.mechanic;if(!m||m.required!=='interrupt'||m.handled){log('There is no interruptible cast to stop.','info');return}
  m.handled=true;battle.metrics.mechanics++;battle.metrics.handled++;bossDamage(42,`The cast is interrupted. Kael staggers.`);
  const boss=document.querySelector('[data-cbf-boss]');if(boss){boss.dataset.stagger='1';setTimeout(()=>boss.dataset.stagger='0',650)}
  showBanner('INTERRUPTED');clearMechanic(350);
}
function defensive(){
  battle.defendUntil=performance.now()+5000;
  if(battle.mechanic?.required==='defend')battle.mechanic.handled=true;
  log('The company braces behind the frontline.','good');showBanner('DEFENSIVE STANCE');
}
function focus(){
  battle.focusUntil=performance.now()+6000;log('All damage dealers focus Ash Warden Kael.','good');showBanner('FOCUS TARGET');
}
function useCell(){
  const now=performance.now();if(now<battle.cellReadyAt)return;
  battle.cellReadyAt=now+12000;bossDamage(72,'The company releases a coordinated Cell burst.');
  showBanner('CELL BURST');flash();
}
function consumableStock(){
  const s=Game.getState?.(),stock=s?.consumables||[];
  return ['minor-recovery-tonic','emberward-flask','vaultheart-tonic'].map(k=>stock.find(x=>x.key===k&&(x.quantity||0)>0)).find(Boolean)||null;
}
function updateConsumableLabel(){
  const label=document.getElementById('cbfConsumableName'),btn=document.getElementById('cbfConsumable'),item=consumableStock();
  if(label)label.textContent=item?`${item.name} ×${item.quantity||1}`:'No usable consumables in stock.';
  if(btn)btn.disabled=!item;
}
async function useConsumable(){
  const item=consumableStock();if(!item)return;
  const lowest=battle.units.filter(u=>u.hp>0).sort((a,b)=>a.hp-b.hp)[0];
  if(item.key==='minor-recovery-tonic'){healUnit(lowest,28);log(`${lowest.name} recovers with a Minor Recovery Tonic.`,'good')}
  else if(item.key==='emberward-flask'){battle.units.forEach(u=>healUnit(u,9));battle.defendUntil=Math.max(battle.defendUntil,performance.now()+3500);log('Emberward Flask reinforces the entire formation.','good')}
  else{battle.units.forEach(u=>healUnit(u,7));battle.focusUntil=Math.max(battle.focusUntil,performance.now()+4500);log('Vaultheart Tonic sharpens the company for a burst window.','good')}
  const s=Game.getState();item.quantity--;if(item.quantity<=0)s.consumables=s.consumables.filter(x=>x!==item);s.activity=Array.isArray(s.activity)?s.activity:[];s.activity.push(`${item.name} used against Ash Warden Kael.`);
  Game.save?.();await Game.persistState?.();updateConsumableLabel();showBanner('CONSUMABLE USED');updateVisuals();
}
function command(id){
  if(!battle||battle.finished)return;
  if(id==='focus')focus();
  if(id==='tank')handleTankCommand();
  if(id==='interrupt')interrupt();
  if(id==='defend')defensive();
  if(id==='cell')useCell();
  if(id==='consumable')useConsumable();
  updateCommands();
}
function resolveMechanic(){
  const m=battle.mechanic;if(!m)return;
  const tank=battle.units.find(u=>u.role==='tank');
  if(m.type==='cleave'){
    if(m.handled){hitUnit(tank,12,'Crushing Cleave');log('Crushing Cleave hits only the tank.','good')}
    else{battle.units.forEach(u=>hitUnit(u,u.role==='tank'?17:20,'Crushing Cleave'));log('Kael cleaves through the formation. The boss was not turned away.','bad');flash()}
    if(tank){tank.x=57;tank.y=51}
  }else if(m.type==='roar'){
    if(m.handled){log(`${m.name} was stopped.`,'good')}
    else{battle.units.forEach(u=>hitUnit(u,17,m.name));battle.pressure+=1;log(`${m.name} lands across the entire company.`,'bad');flash()}
  }else if(m.type==='soak'){
    if(m.handled){hitUnit(tank,15,'Ashen Brand');log('The tank absorbs Ashen Brand.','good')}
    else{battle.units.forEach(u=>hitUnit(u,16,'Ashen Brand'));log('No one intercepts Ashen Brand. The explosion hits everyone.','bad');flash()}
    if(tank){tank.x=57;tank.y=51}
  }else if(m.type==='slam'){
    if(m.handled){battle.units.forEach(u=>hitUnit(u,7,'Anvilbreaker'));log('Defensive Stance absorbs most of Anvilbreaker.','good')}
    else{battle.units.forEach(u=>hitUnit(u,22,'Anvilbreaker'));log('Anvilbreaker crashes through the unprepared party.','bad');flash()}
  }
  battle.metrics.mechanics++;
  if(m.handled)battle.metrics.handled++;else battle.metrics.failed++;
  clearMechanic();
  updateVisuals();
}
function autoCombat(now,dt){
  const alive=battle.units.filter(u=>u.hp>0);
  const dps=alive.reduce((n,u)=>n+(u.role==='tank'?2.4:u.role==='healer'?1.2:4.6),0);
  const focus=now<battle.focusUntil?1.38:1,packet=dps*dt*focus;
  bossDamage(packet,'',false);battle.metrics.damage+=packet;
  battle.attackVisualClock+=dt;
  if(battle.attackVisualClock>=.72){
    battle.attackVisualClock=0;
    const attackers=alive.filter(u=>u.role==='dps');const attacker=attackers[Math.floor(Math.random()*attackers.length)]||alive[0];
    if(attacker){projectile(attacker,{x:72,y:51});spawnFloat(72+Math.random()*3-1.5,45+Math.random()*4,Math.round(12+Math.random()*18),'damage')}
  }
  battle.basicAttackClock+=dt;
  if(battle.basicAttackClock>=1.8){
    battle.basicAttackClock=0;
    const tank=alive.find(u=>u.role==='tank')||alive[0];if(tank)hitUnit(tank,phase()===3?5.5:phase()===2?4.2:3.4,'Warden strike');
  }
  battle.healClock+=dt;
  if(battle.healClock>=2.05){
    battle.healClock=0;
    const healer=alive.find(u=>u.role==='healer');
    const target=alive.slice().sort((a,b)=>a.hp-b.hp)[0];
    if(healer&&target&&healer.hp>0){projectile(healer,target,'heal');healUnit(target,phase()===3?5.8:7.6);battle.metrics.healing+=7.6}
  }
}
function checkEnd(){
  if(battle.finished)return true;
  const alive=battle.units.filter(u=>u.hp>0),tank=battle.units.find(u=>u.role==='tank'),healer=battle.units.find(u=>u.role==='healer');
  if(battle.bossHp<=0){finish(true,'Ash Warden Kael has fallen.');return true}
  if(alive.length<=2||tank?.hp<=0||healer?.hp<=0){finish(false,tank?.hp<=0?'Your tank was overwhelmed.':healer?.hp<=0?'Your healer fell under the pressure.':'The formation collapsed.');return true}
  return false;
}
function step(){
  if(!battle||battle.finished)return;
  const now=performance.now(),dt=Math.min(.25,(now-battle.lastTick)/1000);battle.lastTick=now;battle.elapsed+=dt;
  autoCombat(now,dt);
  if(checkEnd())return;
  if(!battle.mechanic&&now>=battle.nextMechanicAt)beginMechanic();
  if(battle.mechanic){
    updateCast();
    if(now-battle.mechanic.started>=battle.mechanic.duration)resolveMechanic();
  }
  updateVisuals();
}
function finish(success,reason){
  battle.finished=true;clearInterval(timer);timer=null;hideTelegraphs();setCast(null);
  battle.success=success;battle.reason=reason;
  const result=document.getElementById('cbfResult');if(!result)return;
  result.hidden=false;
  const condition=Object.fromEntries(battle.units.map(u=>[u.id,Math.max(0,Math.round(u.hp))]));
  const score=battle.metrics.mechanics?Math.round(battle.metrics.handled/battle.metrics.mechanics*100):100;
  result.innerHTML=`<div class="cbf-result-card"><small>${success?'ENCOUNTER COMPLETE':'COMPANY DEFEATED'}</small><h3>${success?'Kael Falls':'The Warden Holds'}</h3><p>${esc(reason)}</p><div class="cbf-result-stats"><div><span>Mechanics handled</span><b>${battle.metrics.handled} / ${battle.metrics.mechanics}</b></div><div><span>Execution</span><b>${score}%</b></div><div><span>Fight time</span><b>${Math.round(battle.elapsed)}s</b></div></div><p>${success?'Your party carries its remaining condition deeper into The Ashen Vault.':'Failed mechanics still increase your company’s knowledge of Kael.'}</p><button data-cbf-result>${success?'CONTINUE INTO THE FURNACE →':'RETURN TO DUNGEON JOURNAL'}</button></div>`;
  result.querySelector('[data-cbf-result]').addEventListener('click',async()=>{
    const outcome={success,reason,partyCondition:condition,metrics:{...battle.metrics,execution:score,time:Math.round(battle.elapsed)},logs:battle.logs.map(x=>x.text)};
    const cb=battle.onComplete;closeBattle();if(cb)await cb(outcome);
  });
}
function retreat(){
  if(!battle)return;const cb=battle.onRetreat;closeBattle();cb?.();
}
function closeBattle(){
  clearInterval(timer);timer=null;const root=document.getElementById('cbfOverlay');if(root)root.hidden=true;battle=null;
}
function startKael(options={}){
  Game=window.CellboundGame;if(!Game?.ready)return false;
  const chars=(options.party||Game.getPartyCharacters?.()||[]).slice(0,5);if(chars.length!==5)return false;
  if(battle)closeBattle();
  const pos=basePositions(chars),condition=options.conditions||{};
  battle={
    onComplete:options.onComplete,onRetreat:options.onRetreat,knowledge:Number(options.knowledge)||0,
    units:chars.map((c,i)=>({id:c.id,name:c.name,class:c.class,spec:c.spec,role:roleOf(c),icon:iconOf(c),x:pos[i].x,y:pos[i].y,hp:clamp(Number(condition[c.id]??100),12,100)})),
    bossHp:1000,bossMax:1000,elapsed:0,lastTick:performance.now(),nextMechanicAt:performance.now()+3600,mechanic:null,mechanicIndex:0,focusUntil:0,defendUntil:0,cellReadyAt:0,basicAttackClock:0,attackVisualClock:0,healClock:0,pressure:0,finished:false,
    logs:[{text:'The active five enter Kael’s chamber. Basic combat begins automatically.',tone:'info'},{text:'Watch the battlefield. Issue commands when Kael telegraphs a mechanic.',tone:''}],
    metrics:{mechanics:0,handled:0,failed:0,damage:0,healing:0}
  };
  renderBattle();timer=setInterval(step,100);return true;
}
function init(){
  Game=window.CellboundGame;
  window.CellboundBattlefield={available:true,startKael,close:closeBattle,isActive:()=>Boolean(battle)};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();