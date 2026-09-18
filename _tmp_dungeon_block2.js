
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
  if(!