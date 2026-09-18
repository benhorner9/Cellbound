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
 const p=party();token++;run={token:token,stage:0,speed:1,condition:Object.fromEntries(p.map(c=>[c.id,100])),log:['The party enters The Ashen Vault.'],override:0,forceInterrupt:false,rewards:[],resolved:false};
 drawViewer();seamless(token);
}
function route(){
 return STAGES.map((s,i)=>'<span class="'+(i<run.stage?'done':i===run.stage?'current':'')+'"><i>'+(i+1)+'</i>'+esc(s.title)+'</span>').join('');
}
function rows(){
 return party().map(c=>'<div class="cb2d-party-row" data-row="'+c.id+'"><i class="cb2d-dot '+role(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+String(role(c)).toUpperCase()+' · '+esc(c.spec)+'</small></span><strong>'+cond(c.id)+'%</strong></div>').join('');
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
function updateRows(){party().forEach(c=>{const e=$('[data-row="'+c.id+'"] strong');if(e)e.textContent=cond(c.id)+'%'})}
function addUnit(id,label,cls,x,y,size){
 const e=document.createElement('div');e.className='cb2d-unit '+cls+' '+(size||'');e.dataset.unit=id;e.style.left=x+'%';e.style.top=y+'%';e.innerHTML='<i></i><span>'+esc(label)+'</span>';$('#cb2dUnits').appendChild(e)
}
function move(id,x,y,ms){const e=$('[data-unit="'+id+'"]');if(!e)return;e.style.transitionDuration=Math.round(ms/((run&&run.speed)||1))+'ms';requestAnimationFrame(()=>{e.style.left=x+'%';e.style.top=y+'%'})}
function spawn(s){
 $('#cb2dUnits').innerHTML='';$('#cb2dTelegraphs').innerHTML='';
 const spots=[[27,38],[23,61],[18,26],[18,49],[18,73]];
 party().forEach((c,i)=>{addUnit('p-'+c.id,c.name,'party '+role(c),4,50+(i-2)*4,'');setTimeout(()=>move('p-'+c.id,spots[i][0],spots[i][1],850),40)});
 s.enemies.forEach((n,i)=>{const boss=s.enemies.length===1&&(s.kind==='boss'||s.kind==='final');const y=s.enemies.length===1?50:30+i*(40/Math.max(1,s.enemies.length-1));addUnit('e-'+i,n,boss?'enemy boss':'enemy',92,y,boss?'big':'');setTimeout(()=>move('e-'+i,68,y,850),60)});
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
function regroup(){const p=party(),a=[[34,50],[25,59],[27,32],[24,48],[27,72]];p.forEach((c,i)=>move('p-'+c.id,a[i][0],a[i][1],500))}
async function mechanic(s,m,tok){
 const name=m[0],type=m[1],ms=m[2];status(name+' incoming');log(name+' begins.');
 if(type==='interrupt'){
   const v=tg('cast');act('dps','Watching interrupt window');
   if(interruptOK(s)){await cast(name,Math.round(ms*.56),tok);flash('INTERRUPTED',false);log('A damage dealer interrupts '+name+'.');act('dps','Interrupt successful');v.remove();return}
   await cast(name,ms,tok);flash('CAST COMPLETES',true);log(name+' lands. The healer recovers the group.');party().forEach(c=>setCond(c.id,cond(c.id)-5));updateRows();v.remove();return
 }
 if(type==='cone'){
   const v=tg('cone'),tank=party().find(c=>role(c)==='tank');if(tank)move('p-'+tank.id,51,50,420);move('e-0',59,50,420);act('tank','Turning the frontal away');log('Tank rotates the enemy away from the party.');
   await cast(name,ms,tok);flash('FRONTAL AVOIDED',false);v.remove();regroup();return
 }
 if(type==='circle'||type==='circles'){
   const v=tg(type),p=party(),a=[[25,20],[20,78],[38,22],[36,51],[38,80]];p.forEach((c,i)=>move('p-'+c.id,a[i][0],a[i][1],450));act('healer','Moving while maintaining heals');act('dps','Spreading from danger');
   await cast(name,ms,tok);flash('SAFE',false);v.remove();regroup();return
 }
 if(type==='line'){
   const v=tg('line');party().slice(2).forEach((c,i)=>move('p-'+c.id,27,24+i*27,420));act('dps','Sidestepping line attack');
   await cast(name,ms,tok);flash('DODGED',false);v.remove();regroup();return
 }
 if(type==='adds'){
   tg('adds');for(let i=0;i<2;i++){addUnit('add-'+i,'Add','enemy small',84,35+i*30,'small');setTimeout(()=>move('add-'+i,56,35+i*30,450),20)}act('tank','Gathering spawned adds');act('dps',tactics.adds==='boss'?'Maintaining boss pressure':'Swapping to adds');log('Adds spawn. The tank gathers them.');
   await cast(name,ms,tok);await delay(550);$$('[data-unit^="add-"]').forEach(e=>e.remove());$('#cb2dTelegraphs').innerHTML='';return
 }
}
function bonus(s){let b=run.override||0;if(tactics.aggression==='aggressive')b+=4;if(tactics.aggression==='safe'&&s.kind==='trash')b+=4;if(tactics.defensives==='early')b+=3;if(tactics.defensives==='save'&&s.kind==='final')b+=5;if(tactics.adds==='full'&&s.mechanics.some(m=>m[1]==='adds'))b+=4;return b}
function chance(s){const avg=party().reduce((n,c)=>n+cond(c.id),0)/5;return clamp(Math.round(s.base+(ilvl()-18)*2+knowledge(s.knowledge)*.12+(avg-75)*.1+bonus(s)),35,97)}
function learn(s,ok){const a=ok?(s.kind==='trash'||s.kind==='event'?3:7):5;party().forEach(c=>{c.knowledge=c.knowledge||{};c.knowledge[s.knowledge]=clamp((Number(c.knowledge[s.knowledge])||0)+a,0,100)});return a}
function loot(s){
 if(!s.bossId)return null;const boss=Game.bosses.find(b=>b.id===s.bossId);if(P&&P.rollReagents)(P.rollReagents(s.bossId)||[]).forEach(d=>Game.addMaterial(d.key,d.quantity));
 if((s.kind==='final'||Math.random()<.45)&&G&&G.rollDungeonLoot&&boss){const x=G.rollDungeonLoot(boss.name,boss.tier2Chance);Game.addBankItem(Object.assign({},x,{source:'The Ashen Vault · '+boss.name}));return x}return null
}
async function resolveStage(s){
 const ok=Math.random()*100<chance(s),dmg=ok?(s.kind==='boss'||s.kind==='final'?9:6):(s.kind==='boss'||s.kind==='final'?36:18);
 party().forEach(c=>setCond(c.id,cond(c.id)-Math.max(2,dmg-Math.floor(Math.random()*4))));updateRows();
 if(ok){
   const k=learn(s,true),item=loot(s);if(s.bossId)state().bossKills[s.bossId]=true;if(s.id==='kael')state().gold+=35;if(s.id==='embermaw')state().gold+=55;
   state().activity.push(s.title+' cleared during The Ashen Vault.');log(s.title+' cleared. Knowledge +'+k+'%.');if(item){run.rewards.push(item.name);flash('LOOT ACQUIRED',false);log(item.name+' sent to the Guild Bank.')}
   Game.save();await Game.persistState();return true
 }
 learn(s,false);const wipe=s.kind==='boss'||s.kind==='final'||party().some(c=>cond(c.id)<=0);
 if(!wipe){log(s.title+' hurts the group, but the party keeps moving.');Game.save();await Game.persistState();return true}
 Game.applyPartyCellShock(25);const st=state();st.dungeonHistory=Array.isArray(st.dungeonHistory)?st.dungeonHistory:[];st.dungeonHistory.unshift({at:new Date().toISOString(),result:'wipe',stage:s.id,partyIlvl:ilvl()});st.dungeonHistory=st.dungeonHistory.slice(0,20);st.activity.push('The guild wiped at '+s.title+'. All five gained 25% Cell Shock.');await Game.persistState();finish(false,s);return false
}
async function seamless(tok){
 try{
  for(let i=0;i<STAGES.length;i++){
   if(tok!==token)return;run.stage=i;run.override=0;const s=STAGES[i];
   $('#cb2dTitle').textContent=s.title;$('#cb2dRoute').innerHTML=route();$('#cb2dType').textContent=s.kind==='final'?'FINAL BOSS':s.kind==='boss'?'BOSS':s.kind==='event'?'EVENT':'HOSTILE PACK';
   spawn(s);status('Party moving into position…');log('Entering '+s.title+'.');act('tank','Taking point');act('healer','Following formation');act('dps','Acquiring targets');await delay(1150);
   act('tank','Establishing threat');act('healer','Beginning healing rotation');act('dps','Opening damage');await delay(500);
   for(const m of s.mechanics){await mechanic(s,m,tok);await delay(250)}
   status('Finishing encounter…');await delay(550);if(!await resolveStage(s)||tok!==token)return;
   if(i<STAGES.length-1){status('Encounter clear · moving deeper');flash('PATH CLEAR',false);await delay(950)}
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