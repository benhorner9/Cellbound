
let expeditionBattle=null;
function expeditionModal(){
  let root=$('#evoExpeditionBackdrop');
  if(!root){root=document.createElement('div');root.id='evoExpeditionBackdrop';root.className='evo-expedition-backdrop';root.hidden=true;document.body.appendChild(root)}
  return root;
}
function dungeonRole(c){return roleOf(c)}
function dungeonRoleLabel(role){return role==='tank'?'TANK':role==='healer'?'HEALER':'DPS'}
function battleAbility(c,kind='attack'){
  const key=`${c?.class||''}:${c?.spec||''}`;
  const sets={
    'Warrior:Protection':{attack:'Shield Slam',defensive:'Iron Wall',interrupt:'Shield Bash',taunt:'Challenging Roar'},
    'Warrior:Arms':{attack:'Mortal Strike',defensive:'Die by the Sword',interrupt:'Pummel',burst:'Execute'},
    'Paladin:Protection':{attack:'Avenger Strike',defensive:'Guardian Oath',interrupt:'Rebuke',taunt:'Radiant Challenge'},
    'Paladin:Holy':{attack:'Judgement',heal:'Divine Light',groupHeal:'Grace',defensive:'Blessing of Shelter'},
    'Priest:Holy':{attack:'Smite',heal:'Greater Mend',groupHeal:'Divine Hymn',defensive:'Serenity'},
    'Druid:Restoration':{attack:'Wrath',heal:'Regrowth',groupHeal:'Tranquility',defensive:'Barkskin'},
    'Hunter:Marksman':{attack:'Aimed Shot',interrupt:'Concussive Shot',burst:'Rapid Fire',defensive:'Disengage'},
    'Rogue:Assassination':{attack:'Eviscerate',interrupt:'Kick',burst:'Envenom',defensive:'Feint'},
    'Mage:Arcane':{attack:'Arcane Bolt',interrupt:'Counterspell',burst:'Arcane Barrage',defensive:'Prismatic Ward'}
  };
  const fallback={attack:'Strike',heal:'Mend',groupHeal:'Restoration',defensive:'Guard',interrupt:'Interrupt',taunt:'Taunt',burst:'Burst'};
  return sets[key]?.[kind]||fallback[kind]||fallback.attack;
}
function battlePartyModels(){
  const ps=party();
  const ranged=new Set(['Hunter','Mage','Priest','Druid']);
  let meleeIndex=0,rangedIndex=0;
  const meleePos=[[47,61],[46,38],[43,69]],rangedPos=[[26,33],[27,67],[34,78]];
  return ps.map(c=>{
    const role=dungeonRole(c);let pos;
    if(role==='tank')pos=[45,50];
    else if(role==='healer')pos=[24,60];
    else if(ranged.has(c.class)){pos=rangedPos[rangedIndex%rangedPos.length];rangedIndex++}
    else{pos=meleePos[meleeIndex%meleePos.length];meleeIndex++}
    return{id:`party-${c.id}`,charId:c.id,name:c.name,role,className:c.class,spec:c.spec,x:pos[0],y:pos[1],hp:Math.max(18,expeditionCondition(c.id)),maxHp:100};
  });
}
function battleEnemyModels(stage){
  if(stage.kind==='boss'||stage.kind==='final'){
    const name=stage.enemies?.[0]?.[0]||stage.title;
    return[{id:'boss',name,detail:stage.enemies?.[0]?.[1]||'',x:65,y:50,hp:100,maxHp:100,size:stage.kind==='final'?'final':'boss'}];
  }
  const out=[],names=stage.enemies||[];
  const count=stage.kind==='event'?4:5;
  for(let i=0;i<count;i++){
    const src=names[i%Math.max(1,names.length)]||['Ashbound','Hostile'];
    out.push({id:`mob-${i}`,name:src[0],detail:src[1],x:62+(i%2)*8,y:26+(i*14)%58,hp:100,maxHp:100,size:i===0&&stage.id==='vault-depths'?'elite':'trash'});
  }
  return out;
}
function battleMechanicNames(stage){
  const map={
    'broken-gate':{cone:'Hound Rush',ground:'Cinder Trap',cast:'Ash Channel',adds:'Cinder Reinforcements',tank:'Pack Maul'},
    'hall-embers':{cone:'Guardian Sweep',ground:'Ember Sigils',cast:'Molten Invocation',adds:'Acolyte Reinforcements',tank:'Shield Crush'},
    kael:{cone:'Warden Cleave',ground:'Ashen Brand',cast:'Call the Furnace',adds:'Ashbound Wardens',tank:'Furnace Hammer'},
    furnace:{cone:'Heat Vent',ground:'Furnace Eruption',cast:'Pressure Surge',adds:'Cinder Hounds',tank:'Scalding Rush'},
    embermaw:{cone:'Furnace Breath',ground:'Burning Ground',cast:'Scorching Roar',adds:'Cinderlings',tank:'Molten Bite'},
    'vault-depths':{cone:'Guardian Cleave',ground:'Soul Snare',cast:'Bind Essence',adds:'Ash Guardians',tank:'Soul Crush'},
    vaultheart:{cone:'Core Beam',ground:'Cell Fracture',cast:'Heartflare',adds:'Cellspawn',tank:'Core Impact'}
  };
  return map[stage.id]||{cone:'Frontal Assault',ground:'Danger Zone',cast:'Lethal Cast',adds:'Reinforcements',tank:'Heavy Strike'};
}
function battleTimeline(stage,success){
  const boss=stage.kind==='boss'||stage.kind==='final';
  if(!boss){
    return[
      {at:.25,type:'engage'},
      {at:1.1,type:'partyAttack'},
      {at:2.0,type:'packGather'},
      {at:3.0,type:'heal'},
      {at:4.0,type:'groundStart'},
      {at:5.4,type:'groundResolve',fail:!success},
      {at:6.1,type:'enemyCast'},
      {at:7.5,type:'interrupt',fail:!success},
      {at:8.4,type:'partyBurst'},
      {at:10.2,type:'packFinish',fail:!success},
      {at:11.2,type:'finish'}
    ];
  }
  const tl=[
    {at:.25,type:'engage'},
    {at:1.1,type:'partyAttack'},
    {at:2.2,type:'tankBuster'},
    {at:3.4,type:'heal'},
    {at:4.6,type:'coneStart'},
    {at:6.8,type:'coneResolve',fail:!success&&stage.id==='kael'},
    {at:7.5,type:'partyAttack'},
    {at:8.7,type:'groundStart'},
    {at:10.5,type:'groundResolve',fail:!success&&stage.id!=='kael'},
    {at:11.3,type:'addsSpawn'},
    {at:12.4,type:'addsGather'},
    {at:13.7,type:'addsBurn'},
    {at:14.6,type:'enemyCast'},
    {at:16.4,type:'interrupt',fail:!success},
    {at:17.2,type:'phase'},
    {at:18.1,type:'partyBurst'},
    {at:20.1,type:'tankBuster',late:true},
    {at:21.0,type:'heal'},
    {at:22.0,type:'finalBurn',fail:!success},
    {at:23.5,type:'finish'}
  ];
  if(stage.kind==='final')tl.splice(11,0,{at:13.1,type:'lineStart'},{at:14.1,type:'lineResolve',fail:!success});
  return tl.sort((a,b)=>a.at-b.at);
}
function battleDom(){return expeditionBattle?.root||null}
function battleUnit(id){return battleDom()?.querySelector(`[data-battle-unit="${id}"]`)}
function battlePartyUnit(charId){return battleUnit(`party-${charId}`)}
function setBattlePos(id,x,y,ms=650){
  const el=battleUnit(id);if(!el)return;
  el.style.setProperty('--move-ms',`${ms}ms`);el.style.left=`${x}%`;el.style.top=`${y}%`;
}
function setBattleFacing(deg){
  const boss=battleUnit('boss');if(boss)boss.style.setProperty('--facing',`${deg}deg`);
  if(expeditionBattle)expeditionBattle.facing=deg;
}
function setBattleHp(id,hp){
  if(!expeditionBattle)return;
  const unit=expeditionBattle.units.find(x=>x.id===id);if(unit)unit.hp=clamp(hp,0,100);
  const el=battleUnit(id);if(el){const bar=el.querySelector('.evo2d-unit-hp i');if(bar)bar.style.width=`${clamp(hp,0,100)}%`;el.classList.toggle('critical',hp<=25);el.classList.toggle('dead',hp<=0)}
  const frame=battleDom()?.querySelector(`[data-frame="${id}"]`);if(frame){const bar=frame.querySelector('i');if(bar)bar.style.width=`${clamp(hp,0,100)}%`;const n=frame.querySelector('strong');if(n)n.textContent=`${Math.max(0,Math.round(hp))}%`}
}
function damageBattle(id,amount,label=''){
  const unit=expeditionBattle?.units.find(x=>x.id===id);if(!unit)return;
  setBattleHp(id,unit.hp-amount);floatBattleText(id,`-${Math.round(amount)}${label?` · ${label}`:''}`,'damage');
}
function healBattle(id,amount,label=''){
  const unit=expeditionBattle?.units.find(x=>x.id===id);if(!unit)return;
  setBattleHp(id,Math.min(100,unit.hp+amount));floatBattleText(id,`+${Math.round(amount)}${label?` · ${label}`:''}`,'heal');
}
function setBossHp(hp){
  if(!expeditionBattle)return;
  expeditionBattle.bossHp=clamp(hp,0,100);
  setBattleHp('boss',expeditionBattle.bossHp);
  const top=battleDom()?.querySelector('#evo2dBossHp');if(top)top.style.width=`${expeditionBattle.bossHp}%`;
  const txt=battleDom()?.querySelector('#evo2dBossHpText');if(txt)txt.textContent=`${Math.round(expeditionBattle.bossHp)}%`;
}
function battleAction(id,text,tone=''){
  const el=battleUnit(id);if(!el)return;const chip=el.querySelector('.evo2d-unit-action');if(!chip)return;
  chip.textContent=text;chip.dataset.tone=tone;clearTimeout(el._actionTimer);el._actionTimer=setTimeout(()=>{chip.textContent='';chip.dataset.tone=''},1600/Math.max(1,expeditionBattle?.speed||1));
}
function battleLog(text,tone=''){
  if(!expeditionBattle)return;
  const stamp=Math.max(0,expeditionBattle.elapsed).toFixed(1).padStart(4,'0');
  expeditionBattle.log.push({stamp,text,tone});expeditionBattle.log=expeditionBattle.log.slice(-8);
  const box=battleDom()?.querySelector('#evo2dFeed');if(box)box.innerHTML=expeditionBattle.log.slice().reverse().map(x=>`<div data-tone="${x.tone}"><span>${x.stamp}s</span><b>${esc(x.text)}</b></div>`).join('');
}
function floatBattleText(id,text,tone=''){
  const el=battleUnit(id),arena=battleDom()?.querySelector('.evo2d-arena');if(!el||!arena)return;
  const f=document.createElement('span');f.className=`evo2d-float ${tone}`;f.textContent=text;
  const er=el.getBoundingClientRect(),ar=arena.getBoundingClientRect();f.style.left=`${er.left-ar.left+er.width/2}px`;f.style.top=`${er.top-ar.top}px`;arena.appendChild(f);setTimeout(()=>f.remove(),1200);
}
function flashBattle(text,tone=''){
  const arena=battleDom()?.querySelector('.evo2d-arena');if(!arena)return;
  const f=document.createElement('div');f.className=`evo2d-flash ${tone}`;f.textContent=text;arena.appendChild(f);setTimeout(()=>f.remove(),1050);
}
function clearTelegraphs(kind=''){
  const arena=battleDom()?.querySelector('.evo2d-arena');if(!arena)return;
  arena.querySelectorAll(kind?`.evo2d-telegraph[data-kind="${kind}"]`:'.evo2d-telegraph').forEach(x=>x.remove());
}
function addCircleTelegraph(x,y,size=82,label=''){
  const arena=battleDom()?.querySelector('.evo2d-arena');if(!arena)return;
  const t=document.createElement('div');t.className='evo2d-telegraph evo2d-circle';t.dataset.kind='circle';t.style.left=`${x}%`;t.style.top=`${y}%`;t.style.width=`${size}px`;t.style.height=`${size}px`;if(label)t.innerHTML=`<span>${esc(label)}</span>`;arena.appendChild(t);
}
function addConeTelegraph(label=''){
  const arena=battleDom()?.querySelector('.evo2d-arena'),boss=battleUnit('boss');if(!arena||!boss)return;
  const t=document.createElement('div');t.className='evo2d-telegraph evo2d-cone';t.dataset.kind='cone';t.style.left=boss.style.left||'65%';t.style.top=boss.style.top||'50%';t.style.transform=`translateY(-50%) rotate(${expeditionBattle?.facing||180}deg)`;if(label)t.innerHTML=`<span>${esc(label)}</span>`;arena.appendChild(t);
}
function addLineTelegraph(label=''){
  const arena=battleDom()?.querySelector('.evo2d-arena');if(!arena)return;
  const t=document.createElement('div');t.className='evo2d-telegraph evo2d-line';t.dataset.kind='line';t.style.left='15%';t.style.top='46%';t.style.transform='rotate(-8deg)';if(label)t.innerHTML=`<span>${esc(label)}</span>`;arena.appendChild(t);
}
function startBattleCast(name,duration,interruptible=false,source='boss'){
  if(!expeditionBattle)return;
  expeditionBattle.cast={name,duration,start:expeditionBattle.elapsed,interruptible,source};
  const box=battleDom()?.querySelector('#evo2dActionBox');if(box){box.hidden=false;box.dataset.interruptible=interruptible?'1':'0';box.querySelector('b').textContent=name;box.querySelector('small').textContent=interruptible?'INTERRUPTIBLE CAST':'ENEMY CAST';}
  battleAction(source,name,interruptible?'warning':'');
  battleLog(`${expeditionBattle.stage.title}: ${name} begins casting.`,interruptible?'warning':'');
}
function stopBattleCast(interrupted=false){
  if(!expeditionBattle?.cast)return;
  const name=expeditionBattle.cast.name;expeditionBattle.cast=null;
  const box=battleDom()?.querySelector('#evo2dActionBox');if(box){box.hidden=true;box.dataset.interruptible='0'}
  if(interrupted){flashBattle('INTERRUPTED','success');battleLog(`${name} interrupted.`,'success')}
}
function updateBattleCast(){
  const cast=expeditionBattle?.cast,box=battleDom()?.querySelector('#evo2dActionBox');if(!cast||!box)return;
  const pct=clamp(((expeditionBattle.elapsed-cast.start)/cast.duration)*100,0,100);
  const fill=box.querySelector('i');if(fill)fill.style.width=`${pct}%`;
  const left=box.querySelector('em');if(left)left.textContent=`${Math.max(0,cast.duration-(expeditionBattle.elapsed-cast.start)).toFixed(1)}s`;
  if(pct>=100)stopBattleCast(false);
}
function spawnBattleAdds(){
  if(!expeditionBattle)return;
  const arena=battleDom()?.querySelector('.evo2d-units');if(!arena)return;
  for(let i=0;i<3;i++){
    const id=`add-${i}`;if(expeditionBattle.units.some(x=>x.id===id))continue;
    const unit={id,name:'Cellspawn',role:'enemy',x:82,y:28+i*21,hp:100,maxHp:100,size:'trash',add:true};
    expeditionBattle.units.push(unit);
    const el=document.createElement('div');el.className='evo2d-unit enemy trash add';el.dataset.battleUnit=id;el.style.left=`${unit.x}%`;el.style.top=`${unit.y}%`;
    el.innerHTML=`<div class="evo2d-unit-cast"></div><div class="evo2d-dot"><span class="evo2d-facing"></span></div><div class="evo2d-unit-label"><b>Cellspawn</b><small>ADD</small></div><div class="evo2d-unit-hp"><i style="width:100%"></i></div><div class="evo2d-unit-action"></div>`;
    arena.appendChild(el);
  }
}
function killBattleAdds(){
  if(!expeditionBattle)return;
  expeditionBattle.units.filter(x=>x.add).forEach(x=>{setBattleHp(x.id,0);battleAction(x.id,'DEFEATED','success')});
  setTimeout(()=>battleDom()?.querySelectorAll('.evo2d-unit.add').forEach(x=>x.remove()),700);
  expeditionBattle.units=expeditionBattle.units.filter(x=>!x.add);
}
function partyByRole(role){return expeditionBattle?.party.find(x=>x.role===role)}
function dpsUnits(){return expeditionBattle?.party.filter(x=>x.role==='dps')||[]}
function battleEvent(ev){
  const b=expeditionBattle;if(!b)return;
  const m=b.mechanics,tank=partyByRole('tank'),healer=partyByRole('healer'),dps=dpsUnits(),boss=b.stage.kind==='boss'||b.stage.kind==='final';
  switch(ev.type){
    case'engage':
      battleLog(`${tank?.name||'The tank'} establishes threat.`,'tank');
      if(boss){setBattleFacing(180);battleAction('boss','TARGET: TANK','warning');battleAction(tank?.id,battleAbility(party().find(c=>c.id===tank?.charId),'taunt'),'tank')}
      else b.enemies.forEach((e,i)=>setBattlePos(e.id,58+(i%2)*6,34+(i*12)%40,650));
      break;
    case'partyAttack':
      dps.forEach((u,i)=>{const c=party().find(x=>x.id===u.charId);battleAction(u.id,battleAbility(c,'attack'),'dps')});
      if(tank){const c=party().find(x=>x.id===tank.charId);battleAction(tank.id,battleAbility(c,'attack'),'tank')}
      if(boss)setBossHp(Math.max(4,b.bossHp-(ev.late?15:13)));else b.enemies.forEach((e,i)=>setBattleHp(e.id,Math.max(8,e.hp-(22+i*2))));
      battleLog('Damage rotation begins.','dps');
      break;
    case'packGather':
      battleLog(`${tank?.name||'Tank'} gathers the pack and turns it away from the group.`,'tank');
      if(tank){setBattlePos(tank.id,48,50);battleAction(tank.id,battleAbility(party().find(c=>c.id===tank.charId),'taunt'),'tank')}
      b.enemies.forEach((e,i)=>setBattlePos(e.id,56+(i%2)*4,39+(i%3)*11,500));
      break;
    case'tankBuster':
      if(!tank)return;
      startBattleCast(m.tank,1.35,false,'boss');
      battleAction(tank.id,battleAbility(party().find(c=>c.id===tank.charId),'defensive'),'tank');
      battleLog(`${tank.name} commits a defensive cooldown for ${m.tank}.`,'tank');
      setTimeout(()=>{if(expeditionBattle!==b)return;stopBattleCast(false);damageBattle(tank.id,ev.late?22:17,m.tank);flashBattle('BLOCKED','tank')},780/Math.max(1,b.speed));
      break;
    case'heal':
      if(!healer)return;
      const hc=party().find(c=>c.id===healer.charId),targets=[tank,...dps].filter(Boolean).sort((a,z)=>a.hp-z.hp);
      battleAction(healer.id,battleAbility(hc,targets[0]?.hp<55?'groupHeal':'heal'),'heal');
      targets.slice(0,targets[0]?.hp<55?4:2).forEach((u,i)=>healBattle(u.id,i?8:16,battleAbility(hc,'heal')));
      battleLog(`${healer.name} stabilises the party.`,'heal');
      break;
    case'coneStart':
      startBattleCast(m.cone,2.2,false,'boss');addConeTelegraph(m.cone);
      if(tank){setBattlePos(tank.id,53,24);setBattlePos('boss',63,39);setBattleFacing(215);battleAction(tank.id,'REPOSITIONING','tank')}
      battleLog(`${tank?.name||'Tank'} rotates the enemy away from the party.`,'tank');
      break;
    case'coneResolve':
      stopBattleCast(false);clearTelegraphs('cone');flashBattle(m.cone,ev.fail?'danger':'warning');
      if(tank)damageBattle(tank.id,18,m.cone);
      if(ev.fail&&dps[0]){damageBattle(dps[0].id,42,'CAUGHT IN CONE');battleLog(`${dps[0].name} is caught by ${m.cone}.`,'danger')}
      else battleLog(`${m.cone} is contained on the tank.`,'success');
      if(tank)setBattlePos(tank.id,45,50);setBattlePos('boss',65,50);setBattleFacing(180);
      if(boss)setBossHp(b.bossHp-9);
      break;
    case'groundStart':
      startBattleCast(m.ground,1.8,false,'boss');
      [...dps,healer].filter(Boolean).forEach((u,i)=>{addCircleTelegraph(u.x,u.y,76,m.ground);setBattlePos(u.id,20+(i*13)%45,18+(i%2)*62,650)});
      battleLog('Ground markers appear. The party spreads.','warning');
      break;
    case'groundResolve':
      stopBattleCast(false);flashBattle(m.ground,ev.fail?'danger':'warning');
      if(ev.fail&&dps[1]){damageBattle(dps[1].id,48,m.ground);battleLog(`${dps[1].name} reacts late and is hit.`,'danger')}
      else battleLog('All marked players clear the danger zones.','success');
      clearTelegraphs('circle');
      b.party.forEach(u=>{const start=b.startPos[u.id];if(start)setBattlePos(u.id,start[0],start[1],700)});
      if(boss)setBossHp(b.bossHp-10);
      break;
    case'addsSpawn':
      spawnBattleAdds();battleLog(`${m.adds} enter the arena.`,'warning');flashBattle('ADDS SPAWN','warning');
      break;
    case'addsGather':
      if(tank){setBattlePos(tank.id,67,50);battleAction(tank.id,battleAbility(party().find(c=>c.id===tank.charId),'taunt'),'tank')}
      b.units.filter(x=>x.add).forEach((u,i)=>setBattlePos(u.id,64+(i%2)*4,43+i*7,550));
      battleLog(`${tank?.name||'Tank'} taunts and gathers the adds.`,'tank');
      break;
    case'addsBurn':
      dps.forEach(u=>battleAction(u.id,'AOE BURST','dps'));killBattleAdds();if(tank)setBattlePos(tank.id,45,50);battleLog('The damage dealers burn the add pack down.','success');if(boss)setBossHp(b.bossHp-8);break;
    case'enemyCast':
      startBattleCast(m.cast,2.5,true,'boss');battleLog(`Priority cast: ${m.cast}.`,'warning');break;
    case'interrupt':{
      const interrupter=dps.find(u=>party().find(c=>c.id===u.charId)?.class!=='Priest')||dps[0];
      if(ev.fail){
        battleLog(`${m.cast} completes — interrupt missed.`,'danger');stopBattleCast(false);flashBattle('CAST COMPLETED','danger');
        b.party.forEach(u=>damageBattle(u.id,u.role==='tank'?18:28,m.cast));
      }else{
        if(interrupter){const c=party().find(x=>x.id===interrupter.charId);battleAction(interrupter.id,battleAbility(c,'interrupt'),'success')}
        stopBattleCast(true);battleLog(`${interrupter?.name||'DPS'} lands the interrupt.`,'success');
      }
      if(boss)setBossHp(b.bossHp-8);
      break;
    }
    case'lineStart':
      startBattleCast(m.cone,1.7,false,'boss');addLineTelegraph(m.cone);battleLog('A lethal beam tracks across the room.','warning');
      b.party.forEach((u,i)=>setBattlePos(u.id,u.x,15+(i*17)%70,600));break;
    case'lineResolve':
      stopBattleCast(false);clearTelegraphs('line');flashBattle('CORE BEAM',ev.fail?'danger':'warning');
      if(ev.fail&&dps[2]){damageBattle(dps[2].id,55,'CORE BEAM');battleLog(`${dps[2].name} is clipped by the beam.`,'danger')}else battleLog('The party clears the beam path.','success');
      b.party.forEach(u=>{const p=b.startPos[u.id];if(p)setBattlePos(u.id,p[0],p[1],700)});setBossHp(b.bossHp-8);break;
    case'phase':
      if(b.stage.kind==='final'){flashBattle('PHASE 2 · CORE EXPOSED','phase');battleLog('The Vaultheart fractures. The core is exposed.','phase');battleDom()?.querySelector('.evo2d-arena')?.classList.add('phase-two')}
      else{flashBattle('PHASE SHIFT','phase');battleLog(`${b.stage.title} becomes more aggressive.`,'phase')}
      break;
    case'partyBurst':
      dps.forEach(u=>{const c=party().find(x=>x.id===u.charId);battleAction(u.id,battleAbility(c,'burst'),'dps')});if(boss)setBossHp(b.bossHp-18);else b.enemies.forEach(u=>setBattleHp(u.id,Math.max(0,u.hp-35)));battleLog('The party commits its burst window.','dps');break;
    case'finalBurn':
      if(ev.fail){
        battleLog('The formation collapses under overlapping mechanics.','danger');flashBattle('FORMATION BREAK','danger');
        b.party.filter(u=>u.role!=='tank').forEach((u,i)=>damageBattle(u.id,35+i*4,'OVERWHELMED'));
        setBossHp(Math.max(5,b.bossHp-6));
      }else{
        dps.forEach(u=>battleAction(u.id,'FINISHER','success'));setBossHp(0);flashBattle('BOSS DEFEATED','success');battleLog(`${b.stage.title} is defeated.`,'success');
      }
      break;
    case'packFinish':
      if(ev.fail){
        battleLog('The pack breaks through the formation.','danger');b.party.forEach((u,i)=>damageBattle(u.id,18+i*3,'PRESSURE'));
      }else{
        b.enemies.forEach(u=>setBattleHp(u.id,0));flashBattle('PACK CLEARED','success');battleLog('Enemy pack cleared.','success');
      }
      break;
    case'finish':
      if(boss&&b.success&&b.bossHp>0)setBossHp(0);
      finishBattlePresentation();break;
  }
}
function battleFrame(ts){
  const b=expeditionBattle;if(!b||!b.running)return;
  if(!b.lastTs)b.lastTs=ts;
  const delta=Math.min(80,ts-b.lastTs);b.lastTs=ts;
  if(!b.paused)b.elapsed+=delta/1000*b.speed;
  updateBattleCast();
  while(b.eventIndex<b.timeline.length&&b.timeline[b.eventIndex].at<=b.elapsed){battleEvent(b.timeline[b.eventIndex]);b.eventIndex++}
  if(b.running)b.raf=requestAnimationFrame(battleFrame);
}
function finishBattlePresentation(){
  const b=expeditionBattle;if(!b||b.finishing)return;b.finishing=true;b.running=false;cancelAnimationFrame(b.raf);
  stopBattleCast(false);clearTelegraphs();
  setTimeout(()=>{if(expeditionBattle===b)resolveExpeditionStage('auto',b.success)},450);
}
function startBattleEngine(stage){
  const root=expeditionModal(),partyModels=battlePartyModels(),enemyModels=battleEnemyModels(stage),success=Math.random()*100<stageChance(stage,stage.best);
  const units=[...partyModels,...enemyModels];
  expeditionBattle={root,stage,party:partyModels,enemies:enemyModels,units,success,bossHp:100,facing:180,elapsed:0,lastTs:0,eventIndex:0,timeline:battleTimeline(stage,success),running:true,paused:false,speed:1,cast:null,log:[],finishing:false,startPos:Object.fromEntries(partyModels.map(x=>[x.id,[x.x,x.y]])),raf:0,mechanics:battleMechanicNames(stage)};
  const arena=root.querySelector('.evo2d-arena');if(arena)arena.dataset.stage=stage.id;
  battleLog('Party enters combat.','phase');
  expeditionBattle.raf=requestAnimationFrame(battleFrame);
}
function cancelBattle(){
  if(expeditionBattle){expeditionBattle.running=false;cancelAnimationFrame(expeditionBattle.raf);expeditionBattle=null}
}
function renderBattleUnit(unit){
  const enemy=unit.role==='enemy'||unit.id==='boss'||unit.id.startsWith('mob-');
  const role=enemy?'enemy':unit.role,size=unit.size||'player';
  return `<div class="evo2d-unit ${enemy?'enemy':'party'} role-${role} ${size}" data-battle-unit="${unit.id}" style="left:${unit.x}%;top:${unit.y}%">
    <div class="evo2d-unit-cast"></div><div class="evo2d-dot"><span class="evo2d-facing"></span></div>
    <div class="evo2d-unit-label"><b>${esc(unit.name)}</b><small>${enemy?(unit.size==='trash'?'ENEMY':unit.size==='elite'?'ELITE':'BOSS'):dungeonRoleLabel(unit.role)}</small></div>
    <div class="evo2d-unit-hp"><i style="width:${unit.hp}%"></i></div><div class="evo2d-unit-action"></div>
  </div>`;
}
function renderPartyFrame(unit){
  const c=party().find(x=>x.id===unit.charId);
  return `<div class="evo2d-party-frame role-${unit.role}" data-frame="${unit.id}"><span class="evo2d-role-pip"></span><div><b>${esc(unit.name)}</b><small>${esc(c?.class||'')} · ${esc(c?.spec||'')} · ${dungeonRoleLabel(unit.role)}</small><div class="evo2d-frame-hp"><i style="width:${unit.hp}%"></i></div></div><strong>${Math.round(unit.hp)}%</strong></div>`;
}
function startExpedition(){
  if(!partyAvailable()||partyIlvl()<DUNGEON.requiredIlvl)return;
  ensureState();cancelB