(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const STAGES=[
 {id:'broken-gate',title:'The Broken Gate',kind:'trash',knowledge:'ashwarden',base:86,enemies:['Ash Cultist','Cinder Hound','Cinder Hound'],mechanics:[['Searing Bolt','interrupt',1600],['Hound Rush','line',1200]]},
 {id:'hall-embers',title:'Hall of Embers',kind:'trash',knowledge:'ashwarden',base:82,enemies:['Ash Guardian','Ember Acolyte','Ember Acolyte'],mechanics:[['Ember Channel','interrupt',1800],['Guardian Sweep','cone',1500]]},
 {id:'kael',title:'Ash Warden Kael',kind:'boss',bossId:'ashwarden',knowledge:'ashwarden',base:78,enemies:['Ash Warden Kael'],mechanics:[['Warden Cleave','cone',2100],['Cinder Guard','adds',1400],['Execution Arc','cone',1800]]},
 {id:'furnace',title:'The Furnace Passage',kind:'event',knowledge:'embermaw',base:80,enemies:['Cinder Hound','Furnace Wisp'],mechanics:[['Furnace Vents','circles',1700],['Cinder Rush','line',1200]]},
 {id:'embermaw',title:'Embermaw',kind:'boss',bossId:'embermaw',knowledge:'embermaw',base:74,enemies:['Embermaw'],mechanics:[['Ember Roar','interrupt',2400],['Flame Burst','circle',1900],['Tail Furnace','cone',1700]]},
 {id:'vault-depths',title:'The Vault Depths',kind:'trash',knowledge:'vaultheart',base:78,enemies:['Soul Binder','Ash Guardian','Ash Guardian'],mechanics:[['Soul Bind','interrupt',2000],['Guardian Reinforcements','adds',1400]]},
 {id:'vaultheart',title:'The Vaultheart',kind:'final',bossId:'vaultheart',knowledge:'vaultheart',base:70,enemies:['The Vaultheart'],mechanics:[['Core Pulse','circle',2100],['Fracture Spawn','adds',1500],['Rupture Beam','line',1800],['Core Collapse','circle',2600]]}
];
let Game=null,G=null,P=null,run=null,token=0;
let tactics={aggression:'balanced',interrupts:'important',defensives:'balanced',adds:'dangerous',consumables:'danger'};
const party=()=>Game&&Game.getPartyCharacters?Game.getPartyCharacters():[];
const state=()=>Game&&Game.getState?Game.getState():null;
const role=c=>Game&&Game.classes&&Game.classes[c.class]&&Game.classes[c.class].specs[c.spec]?Game.classes[c.class].specs[c.spec].role:'dps';
const ilvl=()=>Number(Game&&Game.partyItemLevel?Game.partyItemLevel():0)||0;
const delay=ms=>new Promise(r=>setTimeout(r,Math.round(ms/((run&&run.speed)||1))));
const cond=id=>run&&run.condition[id]!=null?run.condition[id]:100;
const setCond=(id,v)=>{if(run)run.condition[id]=clamp(Math.round(v),0,100)};
const hp=id=>run&&run.hp&&run.hp[id]!=null?run.hp[id]:100;
const setHp=(id,v)=>{if(run&&run.hp)run.hp[id]=clamp(Math.round(v),0,100)};
function combatProfile(c){
 const r=role(c);
 if(r==='tank')return'tank';
 if(r==='healer')return'healer';
 if(['Rogue','Warrior','Paladin'].includes(c.class))return'melee';
 return'ranged';
}
function root(){let r=$('#cb2dBackdrop');if(!r){r=document.createElement('div');r.id='cb2dBackdrop';r.className='cb2d-backdrop';r.hidden=true;document.body.appendChild(r)}return r}
function close(){token++;run=null;const r=root();r.hidden=true;r.innerHTML=''}
function knowledge(key){const p=party();return p.length?Math.round(p.reduce((n,c)=>n+(Number(c.knowledge&&c.knowledge[key])||0),0)/p.length):0}
function readiness(){
 const p=party();
 if(!Game||!Game.ready)return{ok:false,reason:'Guild data is still loading.'};
 if(p.length!==5)return{ok:false,reason:'Build a complete five-character party in Party Builder first.'};
 const locked=p.find(c=>Game.isUnavailable(c));
 if(locked)return{ok:false,reason:locked.name+' is still recovering from Cell Shock.'};
 if(ilvl()<18)return{ok:false,reason:'Party Item Level '+ilvl()+'. The Ashen Vault requires Item Level 18.'};
 return{ok:true,reason:'Ready to enter.'};
}
function ready(){return readiness().ok}
function groupButtons(key,items){return '<div class="cb2d-plan-row" data-plan="'+key+'">'+items.map(x=>'<button class="'+(tactics[key]===x[0]?'active':'')+'" data-pick="'+key+':'+x[0]+'"><b>'+x[1]+'</b><small>'+x[2]+'</small></button>').join('')+'</div>'}
function briefing(){
 const gate=readiness(),r=root();r.hidden=false;
 if(!gate.ok){
   r.innerHTML='<section class="cb2d-shell cb2d-brief"><header class="cb2d-head"><div><small>THE ASHEN VAULT · ENTRY CHECK</small><h2>Dungeon entry is currently blocked.</h2></div><button data-close>×</button></header><div class="cb2d-blocked"><b>NOT READY</b><p>'+esc(gate.reason)+'</p><button data-party>OPEN PARTY BUILDER →</button></div></section>';
   r.querySelector('[data-close]').onclick=close;
   r.querySelector('[data-party]').onclick=()=>{close();Game.switchView('party')};
   return;
 }

 r.innerHTML='<section class="cb2d-shell cb2d-brief"><header class="cb2d-head"><div><small>THE ASHEN VAULT · TACTICAL BRIEFING</small><h2>Set the plan once. Then watch the dungeon run.</h2></div><button data-close>×</button></header><div class="cb2d-brief-grid"><main><p class="cb2d-intro">These tactics persist through the whole expedition. The party will move, react and fight automatically. Live overrides remain available without stopping combat.</p><h3>Aggression</h3>'+groupButtons('aggression',[['safe','SAFE','Prioritise stability.'],['balanced','BALANCED','Standard dungeon pace.'],['aggressive','AGGRESSIVE','Push damage windows.']])+'<h3>Interrupts</h3>'+groupButtons('interrupts',[['important','IMPORTANT','Stop dangerous casts.'],['high','HIGH','Interrupt aggressively.'],['conservative','CONSERVATIVE','Save for critical casts.']])+'<h3>Defensives</h3>'+groupButtons('defensives',[['early','EARLY','Use cooldowns sooner.'],['balanced','BALANCED','React to pressure.'],['save','SAVE','Hold for late bosses.']])+'<h3>Add Priority</h3>'+groupButtons('adds',[['dangerous','DANGEROUS','Swap to threatening adds.'],['full','FULL','Clear every add wave.'],['boss','BOSS','Stay on primary target.']])+'</main><aside><small>ACTIVE FIVE · PARTY ILVL '+ilvl()+'</small>'+party().map(c=>'<div class="cb2d-brief-member"><i class="cb2d-dot '+role(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+'</small></span><strong>'+String(role(c)).toUpperCase()+'</strong></div>').join('')+'<button class="cb2d-start" data-start>BEGIN EXPEDITION →</button></aside></div></section>';
 r.querySelector('[data-close]').onclick=close;
 r.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const a=b.dataset.pick.split(':');tactics[a[0]]=a[1];r.querySelectorAll('[data-plan="'+a[0]+'"] button').forEach(x=>x.classList.toggle('active',x===b))});
 r.querySelector('[data-start]').onclick=start;
}
function start(){
 const p=party();token++;run={token:token,stage:0,speed:1,condition:Object.fromEntries(p.map(c=>[c.id,100])),hp:Object.fromEntries(p.map(c=>[c.id,100])),enemyHp:[],enemyMax:[],threat:[],aggro:[],log:['The party enters The Ashen Vault.'],override:0,forceInterrupt:false,rewards:[],resolved:false,combatActive:false,mechanicActive:false,allowKill:false,stageOutcome:true,shotSeq:0};
 drawViewer();seamless(token);
}
function route(){
 return STAGES.map((s,i)=>'<span class="'+(i<run.stage?'done':i===run.stage?'current':'')+'"><i>'+(i+1)+'</i>'+esc(s.title)+'</span>').join('');
}
function rows(){
 return party().map(c=>'<div class="cb2d-party-row" data-row="'+c.id+'"><i class="cb2d-dot '+role(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+String(role(c)).toUpperCase()+' · '+esc(c.spec)+' · Condition '+cond(c.id)+'%</small><em class="cb2d-side-hp"><i data-side-hp="'+c.id+'" style="width:'+hp(c.id)+'%"></i></em></span><strong>'+hp(c.id)+' HP</strong></div>').join('');
}
function drawViewer(){
 const s=STAGES[run.stage],r=root();r.hidden=false;
 r.innerHTML='<section class="cb2d-shell"><header class="cb2d-head"><div><small>THE ASHEN VAULT · LIVE 2D DUNGEON</small><h2 id="cb2dTitle">'+esc(s.title)+'</h2></div><div class="cb2d-live"><i></i>LIVE <button data-speed>1×</button><button data-close>×</button></div></header><div class="cb2d-route" id="cb2dRoute">'+route()+'</div><div class="cb2d-layout"><main><div class="cb2d-arena" id="cb2dArena"><div class="cb2d-floor"></div><div id="cb2dTelegraphs"></div><div id="cb2dUnits"></div><div class="cb2d-caption"><span id="cb2dType">'+s.kind.toUpperCase()+'</span><b id="cb2dStatus">Entering encounter…</b></div></div><div class="cb2d-controls"><button data-override="focus"><b>FOCUS TARGET</b><small>Force priority damage.</small></button><button data-override="interrupt"><b>INTERRUPT NOW</b><small>Force the next interrupt.</small></button><button data-override="defensive"><b>DEFENSIVE</b><small>Stabilise the group.</small></button><button data-override="burn"><b>BURN BOSS</b><small>Commit damage cooldowns.</small></button><button data-override="consumable"><b>USE CONSUMABLE</b><small>Use available stock.</small></button></div><div class="cb2d-feed"><small>COMBAT FEED</small><p id="cb2dFeed"></p></div></main><aside><div class="cb2d-cast"><small>ENEMY CAST</small><div><b id="cb2dCastName">—</b><strong id="cb2dCastTime">—</strong></div><div class="cb2d-castbar"><i id="cb2dCastFill"></i></div></div><div class="cb2d-actions"><small>PARTY ACTIONS</small><div data-act="tank"><i class="cb2d-dot tank"></i><b>Tank</b><em>Taking point</em></div><div data-act="healer"><i class="cb2d-dot healer"></i><b>Healer</b><em>Following formation</em></div><div data-act="dps"><i class="cb2d-dot dps"></i><b>Damage</b><em>Acquiring targets</em></div></div><div class="cb2d-party"><small>PARTY CONDITION · ILVL '+ilvl()+'</small><div id="cb2dRows">'+rows()+'</div></div><div class="cb2d-plan"><small>PERSISTENT TACTICS</small><b>'+tactics.aggression.toUpperCase()+' · '+tactics.interrupts.toUpperCase()+' INTERRUPTS</b><span>'+tactics.defensives.toUpperCase()+' DEFENSIVES · '+tactics.adds.toUpperCase()+' ADDS</span></div></aside></div><div class="cb2d-end" id="cb2dEnd" hidden></div></section>';
 r.querySelector('[data-close]').onclick=()=>{if(run&&!run.resolved&&!confirm('Leave the Ashen Vault?'))return;close()};
 r.querySelector('[data-speed]').onclick=e=>{run.speed=run.speed===2?1:2;e.currentTarget.textContent=run.speed+'×'};
 r.querySelectorAll('[data-override]').forEach(b=>b.onclick=()=>override(b.dataset.override,b));
 feed();
}
function feed(){const e=$('#cb2dFeed');if(e&&run)e.innerHTML=run.log.slice(-6).map(esc).join('<br>')}
function log(t){if(!run)return;run.log.push(t);run.log=run.log.slice(-30);feed()}
function status(t){const e=$('#cb2dStatus');if(e)e.textContent=t}
function act(r,t){const e=$('[data-act="'+r+'"] em');if(e)e.textContent=t}
function updateRows(){
 party().forEach(c=>{
   const row=$('[data-row="'+c.id+'"]');
   const value=row?.querySelector('strong');if(value)value.textContent=hp(c.id)+' HP';
   const detail=row?.querySelector('small');if(detail)detail.textContent=String(role(c)).toUpperCase()+' · '+c.spec+' · Condition '+cond(c.id)+'%';
   const bar=$('[data-side-hp="'+c.id+'"]');if(bar)bar.style.width=hp(c.id)+'%';
   const unit=$('[data-unit="p-'+c.id+'"] .cb2d-unit-hp i');if(unit)unit.style.width=hp(c.id)+'%';
   const marker=$('[data-unit="p-'+c.id+'"]');if(marker)marker.classList.toggle('dead',hp(c.id)<=0);
 })
}
function addUnit(id,label,cls,x,y,size){
 const e=document.createElement('div');e.className='cb2d-unit '+cls+' '+(size||'');e.dataset.unit=id;e.style.left=x+'%';e.style.top=y+'%';e.innerHTML='<i></i><span>'+esc(label)+'</span><em class="cb2d-unit-hp"><i></i></em>';$('#cb2dUnits').appendChild(e)
}
function move(id,x,y,ms){const e=$('[data-unit="'+id+'"]');if(!e)return;e.style.transitionDuration=Math.round(ms/((run&&run.speed)||1))+'ms';requestAnimationFrame(()=>{e.style.left=x+'%';e.style.top=y+'%'})}
function spawn(s){
 $('#cb2dUnits').innerHTML='';$('#cb2dTelegraphs').innerHTML='';
 const max=s.kind==='final'?680:s.kind==='boss'?480:s.kind==='event'?220:120;
 run.enemyMax=s.enemies.map(()=>max);run.enemyHp=s.enemies.map(()=>max);
 run.threat=s.enemies.map(()=>Object.fromEntries(party().map(c=>[c.id,0])));
 run.aggro=s.enemies.map(()=>null);
 const melee=party().filter(c=>combatProfile(c)==='melee');
 const ranged=party().filter(c=>combatProfile(c)==='ranged');
 party().forEach((c,i)=>{
   addUnit('p-'+c.id,c.name,'party '+role(c)+' profile-'+combatProfile(c),4,50+(i-2)*4,'');
   let x=16,y=50;
   if(combatProfile(c)==='tank'){x=30;y=50}
   else if(combatProfile(c)==='melee'){x=23;y=43+(melee.indexOf(c)*14)}
   else if(combatProfile(c)==='ranged'){x=17;y=28+(ranged.indexOf(c)*44)}
   else{x=12;y=61}
   setTimeout(()=>{move('p-'+c.id,x,y,900);const bar=$('[data-unit="p-'+c.id+'"] .cb2d-unit-hp i');if(bar)bar.style.width=hp(c.id)+'%'},40)
 });
 s.enemies.forEach((n,i)=>{const boss=s.enemies.length===1&&(s.kind==='boss'||s.kind==='final');const y=s.enemies.length===1?50:30+i*(40/Math.max(1,s.enemies.length-1));addUnit('e-'+i,n,boss?'enemy boss':'enemy',92,y,boss?'big':'');setTimeout(()=>move('e-'+i,68,y,850),60)});
}

function point(id){
 const arena=$('#cb2dArena'),u=$('[data-unit="'+id+'"]');if(!arena||!u)return null;
 const a=arena.getBoundingClientRect(),r=u.getBoundingClientRect();
 return{x:r.left-a.left+r.width/2,y:r.top-a.top+r.height/2};
}
function setEnemyHp(index,value){
 if(!run)return;
 run.enemyHp[index]=clamp(Math.round(value),0,run.enemyMax[index]||1);
 const pct=(run.enemyHp[index]/Math.max(1,run.enemyMax[index]))*100;
 const bar=$('[data-unit="e-'+index+'"] .cb2d-unit-hp i');if(bar)bar.style.width=pct+'%';
 const unit=$('[data-unit="e-'+index+'"]');if(unit){unit.classList.toggle('critical',pct<30);unit.classList.toggle('dead',pct<=0)}
}
function floating(id,text,kind){
 const arena=$('#cb2dArena'),p=point(id);if(!arena||!p)return;
 const e=document.createElement('div');e.className='cb2d-number '+(kind||'damage');e.textContent=text;e.style.left=p.x+'px';e.style.top=p.y+'px';arena.appendChild(e);setTimeout(()=>e.remove(),850)
}
function targetPulse(id){
 const u=$('[data-unit="'+id+'"]');if(!u)return;u.classList.add('targeted');setTimeout(()=>u.classList.remove('targeted'),420)
}
function projectile(from,to,kind='physical',ms=320){
 const arena=$('#cb2dArena'),a=point(from),b=point(to);if(!arena||!a||!b)return;
 const e=document.createElement('i');e.className='cb2d-projectile '+kind;e.style.left=a.x+'px';e.style.top=a.y+'px';arena.appendChild(e);
 requestAnimationFrame(()=>{e.style.transitionDuration=Math.round(ms/((run&&run.speed)||1))+'ms';e.style.transform='translate('+(b.x-a.x)+'px,'+(b.y-a.y)+'px)'});
 setTimeout(()=>e.remove(),Math.round(ms/((run&&run.speed)||1))+120)
}
function pctPosition(id){
 const el=$('[data-unit="'+id+'"]');if(!el)return{x:50,y:50};
 return{x:parseFloat(el.style.left)||50,y:parseFloat(el.style.top)||50};
}
function enemyPosition(index){return pctPosition('e-'+index)}
function formationPoint(c,index){
 const ep=enemyPosition(index),profile=combatProfile(c),p=party();
 if(profile==='tank')return{x:clamp(ep.x-8,40,61),y:clamp(ep.y,15,85)};
 if(profile==='melee'){
   const melees=p.filter(x=>combatProfile(x)==='melee'),i=Math.max(0,melees.indexOf(c));
   const offsets=[-9,9,-14,14];
   return{x:clamp(ep.x+6,50,78),y:clamp(ep.y+(offsets[i]||0),12,88)};
 }
 if(profile==='ranged'){
   const ranged=p.filter(x=>combatProfile(x)==='ranged'),i=Math.max(0,ranged.indexOf(c));
   const ys=[32,68,46];
   return{x:clamp(ep.x-30-(i%2)*4,20,46),y:ys[i]||50};
 }
 const living=p.filter(x=>hp(x.id)>0),avgY=living.reduce((n,x)=>n+pctPosition('p-'+x.id).y,0)/Math.max(1,living.length);
 return{x:clamp(ep.x-40,12,34),y:clamp(avgY+12,24,78)};
}
function maintainPosition(c,index,fast=false){
 if(run?.mechanicActive||index<0)return;
 const desired=formationPoint(c,index),current=pctPosition('p-'+c.id);
 const distance=Math.hypot(desired.x-current.x,desired.y-current.y);
 if(distance>2.5)move('p-'+c.id,desired.x,desired.y,fast?220:420);
}
function buildThreat(index,c,amount,source='damage'){
 if(!run?.threat?.[index]||!c)return;
 const profile=combatProfile(c);
 let value=Math.max(1,Number(amount)||1);
 if(profile==='tank')value*=source==='taunt'?16:6.5;
 else if(profile==='healer')value*=.55;
 else value*=1;
 run.threat[index][c.id]=(run.threat[index][c.id]||0)+value;
 updateAggro(index);
}
function updateAggro(index){
 const table=run?.threat?.[index];if(!table)return null;
 const living=party().filter(c=>hp(c.id)>0);
 let target=living.sort((a,b)=>(table[b.id]||0)-(table[a.id]||0))[0]||null;
 const tank=living.find(c=>combatProfile(c)==='tank');
 if(tank&&target&&target.id!==tank.id&&(table[tank.id]||0)>=(table[target.id]||0)*.88)target=tank;
 const previous=run.aggro[index];run.aggro[index]=target?.id||null;
 if(previous!==run.aggro[index]&&target){
   showThreatLink(index,target);
   const label=combatProfile(target)==='tank'?'THREAT HELD':'AGGRO LOST';
   floating('p-'+target.id,label,combatProfile(target)==='tank'?'threat':'incoming');
 }
 return target;
}
function threatTarget(index){
 const id=run?.aggro?.[index],c=party().find(x=>x.id===id&&hp(x.id)>0);
 if(c)return c;
 return updateAggro(index)||party().find(x=>hp(x.id)>0)||null;
}
function showThreatLink(index,target){
 const arena=$('#cb2dArena'),a=point('e-'+index),b=point('p-'+target.id);if(!arena||!a||!b)return;
 let line=arena.querySelector('[data-threat-line="'+index+'"]');
 if(!line){line=document.createElement('i');line.className='cb2d-threat-line';line.dataset.threatLine=index;arena.appendChild(line)}
 const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI;
 line.style.left=a.x+'px';line.style.top=a.y+'px';line.style.width=length+'px';line.style.transform='rotate('+angle+'deg)';
 line.classList.toggle('danger',combatProfile(target)!=='tank');
 clearTimeout(line._timer);line._timer=setTimeout(()=>line.remove(),900);
}
function moveEnemyToThreat(index,s){
 if(run?.mechanicActive||run.enemyHp[index]<=0)return;
 const target=threatTarget(index);if(!target)return;
 const t=pctPosition('p-'+target.id),e=pctPosition('e-'+index);
 const boss=s.kind==='boss'||s.kind==='final';
 const desiredX=clamp(t.x+(combatProfile(target)==='tank'?8:4),boss?52:40,84);
 const packOffsets=[-10,0,10,-16,16];const desiredY=clamp(t.y+(packOffsets[index%packOffsets.length]||0),14,86);
 if(Math.hypot(desiredX-e.x,desiredY-e.y)>3)move('e-'+index,desiredX,desiredY,boss?500:360);
 showThreatLink(index,target);
}
function settleFormation(index){
 party().filter(c=>hp(c.id)>0).forEach(c=>maintainPosition(c,index,true));
}

function attackKind(c){
 if(c.class==='Mage')return'magic';
 if(c.class==='Hunter')return'arrow';
 if(role(c)==='healer')return'heal';
 return'melee';
}
function ability(c){
 if(c.class==='Mage')return'Arcane Bolt';
 if(c.class==='Hunter')return'Quick Shot';
 if(c.class==='Rogue')return'Eviscerate';
 if(c.class==='Priest')return'Smite';
 if(c.class==='Paladin')return'Judgement';
 return role(c)==='tank'?'Shield Strike':'Heavy Slash';
}
function enemyTarget(index){return threatTarget(index)}
function enemyIndex(){
 if(!run)return-1;
 const floor=run.allowKill?0:.16;
 let idx=run.enemyHp.findIndex((v,i)=>v>(run.enemyMax[i]||1)*floor+1);
 if(idx<0)idx=run.enemyHp.findIndex(v=>v>0);
 return idx;
}
async function partyAttack(c,index,tok){
 if(tok!==token||index<0||hp(c.id)<=0)return;
 const kind=attackKind(c),profile=combatProfile(c),name=ability(c),amount=(profile==='tank'?12:18)+Math.floor(Math.random()*10)+(tactics.aggression==='aggressive'?4:0);
 maintainPosition(c,index,true);
 targetPulse('e-'+index);const attacker=$('[data-unit="p-'+c.id+'"]');if(attacker){attacker.classList.add('attacking');setTimeout(()=>attacker.classList.remove('attacking'),420)}act(role(c)==='dps'?'dps':'tank',c.name+' · '+name);
 if(kind==='melee'){
   const desired=formationPoint(c,index);move('p-'+c.id,desired.x,desired.y,180);
   await delay(150);projectile('p-'+c.id,'e-'+index,'slash',170);
 }else projectile('p-'+c.id,'e-'+index,kind,kind==='arrow'?280:360);
 await delay(kind==='melee'?150:300);
 let next=run.enemyHp[index]-amount;
 if(!run.allowKill)next=Math.max(next,(run.enemyMax[index]||1)*.16);
 setEnemyHp(index,next);floating('e-'+index,'-'+amount,'damage');
 buildThreat(index,c,amount,'damage');
}
async function enemyAttack(index,tok,s){
 if(tok!==token||index<0||run.enemyHp[index]<=0)return;
 const target=enemyTarget(index);if(!target)return;
 moveEnemyToThreat(index,s);
 const amount=(s.kind==='boss'||s.kind==='final'?6:3)+Math.floor(Math.random()*(s.kind==='boss'||s.kind==='final'?7:5));
 targetPulse('p-'+target.id);const attacker=$('[data-unit="e-'+index+'"]');if(attacker){attacker.classList.add('attacking');setTimeout(()=>attacker.classList.remove('attacking'),420)}projectile('e-'+index,'p-'+target.id,s.kind==='boss'||s.kind==='final'?'enemy-heavy':'enemy',300);
 await delay(280);setHp(target.id,hp(target.id)-amount);setCond(target.id,cond(target.id)-Math.max(1,Math.round(amount/3)));floating('p-'+target.id,'-'+amount,'incoming');updateRows();
 if(hp(target.id)<35)act('healer','Emergency healing '+target.name)
}
async function healPulse(tok){
 if(tok!==token)return;
 const healer=party().find(c=>role(c)==='healer'&&hp(c.id)>0);if(!healer)return;
 const activeEnemy=enemyIndex();if(activeEnemy>=0)maintainPosition(healer,activeEnemy,false);
 const target=party().filter(c=>hp(c.id)>0).sort((a,b)=>hp(a.id)-hp(b.id))[0];if(!target||hp(target.id)>88){act('healer',healer.name+' · Holding safe healing range');return}
 const amount=8+Math.floor(Math.random()*9);act('healer',healer.name+' · Healing '+target.name);projectile('p-'+healer.id,'p-'+target.id,'heal',330);
 await delay(300);setHp(target.id,hp(target.id)+amount);floating('p-'+target.id,'+'+amount,'heal');updateRows();
 run?.enemyHp?.forEach((v,i)=>{if(v>0)buildThreat(i,healer,amount*.35,'heal')});
}
function rangedDrift(c,index){
 if(run?.mechanicActive)return;
 maintainPosition(c,index,false);
 const profile=combatProfile(c);if(!['ranged','healer'].includes(profile))return;
 const desired=formationPoint(c,index);
 move('p-'+c.id,clamp(desired.x+(Math.random()*3-1.5),12,48),clamp(desired.y+(Math.random()*5-2.5),16,84),420)
}
async function combatLoop(s,tok){
 run.combatActive=true;let turn=0;
 const attackers=party().filter(c=>role(c)!=='healer');
 while(run&&run.combatActive&&tok===token){
   const index=enemyIndex();if(index<0)break;
   if(turn===0){const tank=party().find(c=>combatProfile(c)==='tank');if(tank){run.enemyHp.forEach((v,i)=>{if(v>0)buildThreat(i,tank,100,'taunt')});settleFormation(index);act('tank',tank.name+' · Establishing threat on the pack');await delay(240)}}
   const c=attackers[turn%attackers.length];if(c){rangedDrift(c,index);await partyAttack(c,index,tok)}
   if(tok!==token||!run?.combatActive)break;
   if(turn%2===1)await enemyAttack(index,tok,s);
   if(turn%2===0)run.enemyHp.forEach((v,i)=>{if(v>0)moveEnemyToThreat(i,s)});
   if(turn%3===2)await healPulse(tok);
   turn++;await delay(120)
 }
}
async function finishCombat(s,tok){
 run.allowKill=run.stageOutcome||!(s.kind==='boss'||s.kind==='final');
 if(run.allowKill){
   let guard=0;
   while(tok===token&&enemyIndex()>=0&&guard<36){await delay(180);guard++}
 }else await delay(700);
 if(run.allowKill&&enemyIndex()>=0){run.enemyHp.forEach((v,i)=>{if(v>0){setEnemyHp(i,0);floating('e-'+i,'FINISH','damage')}})}
 run.combatActive=false
}

function tg(type){
 const p=$('#cb2dTelegraphs'),e=document.createElement('div');e.className='cb2d-tg '+type;
 if(type==='circles')e.innerHTML='<i></i><i></i><i></i>';
 p.appendChild(e);requestAnimationFrame(()=>e.classList.add('show'));return e
}
function flash(t,danger){const a=$('#cb2dArena'),e=document.createElement('div');e.className='cb2d-flash '+(danger?'bad':'good');e.textContent=t;a.appendChild(e);setTimeout(()=>e.remove(),900)}
async function cast(name,ms,tok){
 const n=$('#cb2dCastName'),tm=$('#cb2dCastTime'),f=$('#cb2dCastFill');if(n)n.textContent=name;if(f)f.style.width='0%';
 const total=Math.round(ms/(run.speed||1)),start=Date.now();
 return new Promise((res,rej)=>{const q=setInterval(()=>{if(tok!==token){clearInterval(q);rej(new Error('cancelled'));return}const p=clamp((Date.now()-start)/total,0,1);if(f)f.style.width=(p*100)+'%';if(tm)tm.textContent=Math.max(0,(total-(Date.now()-start))/1000).toFixed(1)+'s';if(p>=1){clearInterval(q);res()}},45)})
}
function interruptOK(s){if(run.forceInterrupt){run.forceInterrupt=false;return true}if(tactics.interrupts==='high')return true;if(tactics.interrupts==='important')return s.kind==='boss'||s.kind==='final'||knowledge(s.knowledge)>=25;return s.kind==='final'||knowledge(s.knowledge)>=70}
function regroup(){
 const index=enemyIndex();
 if(index>=0){settleFormation(index);return}
 const p=party(),melee=p.filter(c=>combatProfile(c)==='melee'),ranged=p.filter(c=>combatProfile(c)==='ranged');
 p.forEach(c=>{
   let x=22,y=50;
   if(combatProfile(c)==='tank'){x=32;y=50}
   else if(combatProfile(c)==='melee'){x=25;y=43+melee.indexOf(c)*14}
   else if(combatProfile(c)==='ranged'){x=18;y=32+ranged.indexOf(c)*36}
   else{x=13;y=61}
   move('p-'+c.id,x,y,500)
 })
}
async function mechanic(s,m,tok){
 const name=m[0],type=m[1],ms=m[2];run.mechanicActive=true;status(name+' incoming');log(name+' begins.');
 if(type==='interrupt'){
   const v=tg('cast');act('dps','Watching interrupt window');
   if(interruptOK(s)){await cast(name,Math.round(ms*.56),tok);flash('INTERRUPTED',false);log('A damage dealer interrupts '+name+'.');act('dps','Interrupt successful');v.remove();run.mechanicActive=false;return}
   await cast(name,ms,tok);flash('CAST COMPLETES',true);log(name+' lands. The healer recovers the group.');party().forEach(c=>{setCond(c.id,cond(c.id)-5);setHp(c.id,hp(c.id)-8);floating('p-'+c.id,'-8','incoming')});updateRows();v.remove();run.mechanicActive=false;return
 }
 if(type==='cone'){
   const v=tg('cone'),tank=party().find(c=>role(c)==='tank');if(tank)move('p-'+tank.id,51,50,420);move('e-0',59,50,420);act('tank','Turning the frontal away');log('Tank rotates the enemy away from the party.');
   await cast(name,ms,tok);flash('FRONTAL AVOIDED',false);v.remove();regroup();run.mechanicActive=false;return
 }
 if(type==='circle'||type==='circles'){
   const v=tg(type),p=party(),a=[[25,20],[20,78],[38,22],[36,51],[38,80]];p.forEach((c,i)=>move('p-'+c.id,a[i][0],a[i][1],450));act('healer','Moving while maintaining heals');act('dps','Spreading from danger');
   await cast(name,ms,tok);flash('SAFE',false);v.remove();regroup();run.mechanicActive=false;return
 }
 if(type==='line'){
   const v=tg('line');party().slice(2).forEach((c,i)=>move('p-'+c.id,27,24+i*27,420));act('dps','Sidestepping line attack');
   await cast(name,ms,tok);flash('DODGED',false);v.remove();regroup();run.mechanicActive=false;return
 }
 if(type==='adds'){
   tg('adds');for(let i=0;i<2;i++){addUnit('add-'+i,'Add','enemy small',84,35+i*30,'small');setTimeout(()=>move('add-'+i,56,35+i*30,450),20)}const tank=party().find(c=>combatProfile(c)==='tank');if(tank)act('tank',tank.name+' · Taunting spawned adds');act('dps',tactics.adds==='boss'?'Maintaining boss pressure':'Swapping to adds');log('Adds spawn. The tank gathers them.');
   await cast(name,ms,tok);await delay(550);$$('[data-unit^="add-"]').forEach(e=>e.remove());$('#cb2dTelegraphs').innerHTML='';run.mechanicActive=false;return
 }
}
function bonus(s){let b=run.override||0;if(tactics.aggression==='aggressive')b+=4;if(tactics.aggression==='safe'&&s.kind==='trash')b+=4;if(tactics.defensives==='early')b+=3;if(tactics.defensives==='save'&&s.kind==='final')b+=5;if(tactics.adds==='full'&&s.mechanics.some(m=>m[1]==='adds'))b+=4;return b}
function chance(s){const avg=party().reduce((n,c)=>n+cond(c.id),0)/5;return clamp(Math.round(s.base+(ilvl()-18)*2+knowledge(s.knowledge)*.12+(avg-75)*.1+bonus(s)),35,97)}
function learn(s,ok){const a=ok?(s.kind==='trash'||s.kind==='event'?3:7):5;party().forEach(c=>{c.knowledge=c.knowledge||{};c.knowledge[s.knowledge]=clamp((Number(c.knowledge[s.knowledge])||0)+a,0,100)});return a}
function loot(s){
 if(!s.bossId)return null;const boss=Game.bosses.find(b=>b.id===s.bossId);if(P&&P.rollReagents)(P.rollReagents(s.bossId)||[]).forEach(d=>Game.addMaterial(d.key,d.quantity));
 if((s.kind==='final'||Math.random()<.45)&&G&&G.rollDungeonLoot&&boss){const x=G.rollDungeonLoot(boss.name,boss.tier2Chance);Game.addBankItem(Object.assign({},x,{source:'The Ashen Vault · '+boss.name}));return x}return null
}
async function playWipeVisual(s){
 if(!run)return;
 run.combatActive=false;run.mechanicActive=false;
 status((s.kind==='final'?'Final mechanic failed':'The formation breaks')+' · party wipe');
 log(s.title+' overwhelms the party.');
 act('tank','Down');act('healer','Down');act('dps','Down');
 const chars=party();
 for(let i=0;i<chars.length;i++){
   const c=chars[i],remaining=Math.max(1,hp(c.id)),enemy='e-'+Math.min(i,Math.max(0,(run.enemyHp?.length||1)-1));
   targetPulse('p-'+c.id);
   projectile(enemy,'p-'+c.id,'enemy-heavy',260);
   await delay(120);
   setHp(c.id,0);setCond(c.id,0);
   floating('p-'+c.id,'-'+remaining,'incoming');
   updateRows();
 }
 flash('PARTY WIPE',true);
 await delay(650);
}

async function resolveStage(s){
 const ok=run.stageOutcome,dmg=ok?(s.kind==='boss'||s.kind==='final'?5:3):(s.kind==='boss'||s.kind==='final'?22:10);
 party().forEach(c=>{const hit=Math.max(1,dmg-Math.floor(Math.random()*4));setCond(c.id,cond(c.id)-hit);if(!ok)setHp(c.id,hp(c.id)-Math.ceil(hit/2))});updateRows();
 if(ok){
   const k=learn(s,true),item=loot(s);if(s.bossId)state().bossKills[s.bossId]=true;if(s.id==='kael')state().gold+=35;if(s.id==='embermaw')state().gold+=55;
   state().activity.push(s.title+' cleared during The Ashen Vault.');log(s.title+' cleared. Knowledge +'+k+'%.');if(item){run.rewards.push(item.name);flash('LOOT ACQUIRED',false);log(item.name+' sent to the Guild Bank.')}
   Game.save();await Game.persistState();return true
 }
 learn(s,false);const wipe=s.kind==='boss'||s.kind==='final'||party().some(c=>hp(c.id)<=0||cond(c.id)<=0);
 if(!wipe){log(s.title+' hurts the group, but the party keeps moving.');Game.save();await Game.persistState();return true}
 await playWipeVisual(s);
 Game.applyPartyCellShock(25);const st=state();st.dungeonHistory=Array.isArray(st.dungeonHistory)?st.dungeonHistory:[];st.dungeonHistory.unshift({at:new Date().toISOString(),result:'wipe',stage:s.id,partyIlvl:ilvl()});st.dungeonHistory=st.dungeonHistory.slice(0,20);st.activity.push('The guild wiped at '+s.title+'. All five gained 25% Cell Shock.');await Game.persistState();finish(false,s);return false
}
async function seamless(tok){
 try{
  for(let i=0;i<STAGES.length;i++){
   if(tok!==token)return;run.stage=i;run.override=0;const s=STAGES[i];
   $('#cb2dTitle').textContent=s.title;$('#cb2dRoute').innerHTML=route();$('#cb2dType').textContent=s.kind==='final'?'FINAL BOSS':s.kind==='boss'?'BOSS':s.kind==='event'?'EVENT':'HOSTILE PACK';
   spawn(s);run.stageOutcome=Math.random()*100<chance(s);run.allowKill=false;run.mechanicActive=false;status('Party moving into position…');log('Entering '+s.title+'.');act('tank','Taking point');act('healer','Following formation');act('dps','Acquiring targets');await delay(1050);
   act('tank','Establishing threat');act('healer','Holding healing range');act('dps','Moving into role positions');settleFormation(0);await delay(350);
   const combat=combatLoop(s,tok);await delay(420);
   for(const m of s.mechanics){await mechanic(s,m,tok);await delay(220)}
   run.mechanicActive=false;status('Finishing encounter…');await finishCombat(s,tok);await combat;
   if(!await resolveStage(s)||tok!==token)return;
   if(i<STAGES.length-1){party().forEach(c=>setHp(c.id,hp(c.id)+6));updateRows();status('Encounter clear · moving deeper');flash('PATH CLEAR',false);await delay(950)}
  }
  const st=state();st.dungeonHistory=Array.isArray(st.dungeonHistory)?st.dungeonHistory:[];st.dungeonCompletions=Number(st.dungeonCompletions)||0;st.gold+=120;st.renown+=60;st.dungeonCompletions++;st.dungeonHistory.unshift({at:new Date().toISOString(),result:'complete',partyIlvl:ilvl()});st.dungeonHistory=st.dungeonHistory.slice(0,20);st.activity.push('The Ashen Vault cleared. The Vaultheart has fallen.');await Game.persistState();finish(true,STAGES[6])
 }catch(e){if(e&&e.message!=='cancelled')console.error('Ashen Vault 2D runtime',e)}
}
function finish(ok,s){if(!run)return;run.resolved=true;const e=$('#cb2dEnd');e.hidden=false;e.innerHTML='<div><small>'+(ok?'DUNGEON COMPLETE':'EXPEDITION FAILED')+'</small><h3>'+(ok?'The Vaultheart has fallen.':'Wipe at '+esc(s.title)+'.')+'</h3><p>'+(ok?('The full Ashen Vault run completed seamlessly.'+(run.rewards.length?' Loot: '+run.rewards.map(esc).join(', ')+'.':'')):'All five adventurers gained 25% Cell Shock. Knowledge earned during the run is retained.')+'</p></div><button>RETURN TO GUILD →</button>';e.querySelector('button').onclick=()=>{close();Game.switchView('content')}}
async function override(t,b){
 if(!run||run.resolved)return;b.classList.add('active');setTimeout(()=>b.classList.remove('active'),450);
 if(t==='focus'){run.override=Math.max(run.override,4);act('dps','Focusing priority target');log('Override: focus target.')}
 if(t==='interrupt'){run.forceInterrupt=true;log('Override: force next interrupt.')}
 if(t==='defensive'){run.override=Math.max(run.override,5);party().forEach(c=>setCond(c.id,cond(c.id)+5));updateRows();act('tank','Using defensive cooldowns');log('Override: defensive cooldowns.')}
 if(t==='burn'){run.override=Math.max(run.override,6);act('dps','Committing damage cooldowns');log('Override: burn boss.')}
 if(t==='consumable'){const st=state(),x=(st.consumables||[]).find(y=>(y.quantity||0)>0);if(!x){log('No usable consumables remain.');return}party().forEach(c=>setCond(c.id,cond(c.id)+12));x.quantity--;if(x.quantity<=0)st.consumables=st.consumables.filter(y=>y!==x);updateRows();log(x.name+' used.');Game.save()}
}
function syncEntryButton(){
 const b=$('#enterDungeonBtn');if(!b||!Game?.ready)return;
 const gate=readiness();
 b.disabled=false;
 b.setAttribute('aria-disabled',gate.ok?'false':'true');
 b.title=gate.reason;
 b.dataset.cb2dReady=gate.ok?'1':'0';
}
document.addEventListener('click',e=>{
 const b=e.target.closest&&e.target.closest('#enterDungeonBtn');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();briefing();
},true);
function init(){
 Game=window.CellboundGame;G=window.CellboundGear;P=window.CellboundProfessions;
 if(!Game||!Game.ready){setTimeout(init,120);return}
 document.documentElement.dataset.cb2d='ready';
 syncEntryButton();
 setInterval(syncEntryButton,400);
}
init();
})();