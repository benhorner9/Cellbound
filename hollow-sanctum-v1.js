(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let Game=null,db=null,run=null,token=0;
const STAGES=[
 {id:'gallery',title:'Gallery of Echoes',kind:'TRASH',enemies:['Hollowed Surveyor','Hollowed Surveyor','Glass Mite'],mechanic:'Echo Burst'},
 {id:'sentinel',title:'Glassjaw Sentinel',kind:'MINI-BOSS',enemies:['Glassjaw Sentinel'],mechanic:'Fracture Line'},
 {id:'choir',title:'The Bound Choir',kind:'FINAL BOSS',enemies:['The Bound Choir'],mechanic:'Resonance Collapse'}
];
const RELIC={itemId:'quest-blackglass-resonator',name:'Blackglass Resonator',class:'All',classes:'all',slot:'Relic',tier:3,rarity:'Rare',tierLabel:'Quest Relic',enabled:true,dropEnabled:false,itemLevel:30,power:10,tradeState:'soulbound',questArtMaterial:'void-crystal',lore:'Recovered from The Bound Choir beneath Zeltira.'};
const XP=500;
function rollHollowGear(){
 const G=window.CellboundGear,pool=(G?.items||[]).filter(x=>x.tier===3&&x.enabled);
 if(!pool.length)return null;
 const base=pool[Math.floor(Math.random()*pool.length)];
 return G.rollItemAffixes?.({...base,source:'The Hollow Sanctum · The Bound Choir'})||{...base,source:'The Hollow Sanctum · The Bound Choir'};
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const state=()=>Game?.getState?.();
const party=()=>Game?.getPartyCharacters?.()||[];
const role=c=>Game?.classes?.[c.class]?.specs?.[c.spec]?.role||'dps';
const classKey=c=>'class-'+String(c?.class||'unknown').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const ilvl=()=>Number(Game?.partyItemLevel?.())||0;
function qstate(){return state()?.questSystem}
function unlocked(){return Boolean(qstate()?.flags?.hollowSanctumUnlocked)}
function firstCleared(){return Boolean(qstate()?.flags?.hollowFirstClear)}
function root(){let e=$('#hs2dBackdrop');if(e)return e;e=document.createElement('div');e.id='hs2dBackdrop';e.className='hs2d-backdrop';e.hidden=true;document.body.appendChild(e);return e}
function readiness(){
 const p=party();if(!unlocked())return{ok:false,reason:'The Hollow Sanctum has not been discovered. Complete Echoes Beneath Zeltira.'};
 if(p.length!==5)return{ok:false,reason:'Build a complete five-character party first.'};
 const bad=p.find(c=>Game.isUnavailable?.(c));if(bad)return{ok:false,reason:bad.name+' is still recovering from Cell Shock.'};
 if(ilvl()<24)return{ok:false,reason:'Party Item Level '+ilvl()+'. The Hollow Sanctum requires Item Level 24.'};
 return{ok:true,reason:'The seal is open.'}
}
function renderCard(){
 const mount=$('#hollowSanctumMount');if(!mount||!Game?.ready)return;
 const q=qstate(),open=Boolean(q?.flags?.hollowSanctumUnlocked),done=Boolean(q?.flags?.hollowFirstClear);
 mount.innerHTML='<article class="hs-journal '+(open?'unlocked':'locked')+'"><div class="hs-journal-art"><span>'+(open?'HOLLOW DEEP · DUNGEON':'SEALED SIGNAL · LOCATION UNKNOWN')+'</span><h3>'+(open?'The Hollow Sanctum':'Undiscovered Location')+'</h3><p>'+(open?'A sealed complex beneath Zeltira where Cell glass has grown through the stone like roots.':'Your guild has detected something beneath the old east road, but no route to it has been confirmed.')+'</p><div>'+(open?'<b>5 Adventurers</b><b>3 Stages</b><b>iLvl 24+</b>':'<b>Quest Discovery Required</b>')+'</div></div><div class="hs-journal-entry"><small>'+(open?(done?'DISCOVERED · FARMABLE':'NEWLY DISCOVERED'):'UNDISCOVERED')+'</small><h4>'+(open?'The Hollow Seal is broken.':'The map ends at sealed stone.')+'</h4><p>'+(open?'Void Crystal can be recovered here. The first clear awards the Blackglass Resonator Relic.':'Continue Echoes Beneath Zeltira to learn what is hidden here.')+'</p><button '+(open?'data-hs-enter':'data-hs-quests')+'>'+(open?'ENTER THE HOLLOW SANCTUM':'FOLLOW THE QUEST CHAIN →')+'</button></div></article>';
 mount.querySelector('[data-hs-enter]')?.addEventListener('click',openDungeon);
 mount.querySelector('[data-hs-quests]')?.addEventListener('click',()=>Game.switchView?.('quests'));
}
function briefing(){
 const gate=readiness(),r=root();r.hidden=false;document.body.classList.add('hs2d-open');
 if(!gate.ok){
   r.innerHTML='<section class="hs2d-shell hs2d-brief"><header><div><small>THE HOLLOW SANCTUM · ENTRY CHECK</small><h2>The seal is open, but the party is not ready.</h2></div><button data-close>×</button></header><div class="hs2d-blocked"><b>ENTRY BLOCKED</b><p>'+esc(gate.reason)+'</p><button data-action>'+(unlocked()?'OPEN PARTY BUILDER':'OPEN QUEST JOURNAL')+' →</button></div></section>';
   r.querySelector('[data-close]').onclick=close;r.querySelector('[data-action]').onclick=()=>{close();Game.switchView?.(unlocked()?'party':'quests')};return;
 }
 r.innerHTML='<section class="hs2d-shell hs2d-brief"><header><div><small>THE HOLLOW SANCTUM · EXPEDITION BRIEFING</small><h2>The door beneath Zeltira is breathing.</h2></div><button data-close>×</button></header><div class="hs2d-brief-grid"><main><div class="hs2d-relic-preview"><div>◆</div><span><small>FIRST-CLEAR RELIC</small><b>Blackglass Resonator</b><p>Rare · Relic · Item Level 30 · +10 Power</p></span></div><h3>What the guild knows</h3><p>Cell glass has spread through the buried masonry. The things inside react to movement and sound, then answer with violent resonance.</p><div class="hs2d-intel"><span><b>Gallery of Echoes</b><small>Moving packs and pulse damage</small></span><span><b>Glassjaw Sentinel</b><small>Line fractures across the chamber</small></span><span><b>The Bound Choir</b><small>Large resonance zones</small></span></div></main><aside><small>ACTIVE FIVE · PARTY ILVL '+ilvl()+'</small>'+party().map(c=>'<div><i class="'+role(c)+' '+classKey(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+'</small></span></div>').join('')+'<button data-start>BEGIN DESCENT →</button></aside></div></section>';
 r.querySelector('[data-close]').onclick=close;r.querySelector('[data-start]').onclick=start;
}
function openDungeon(){Game=window.CellboundGame;if(!Game?.ready)return;db=Game.getSupabase?.();briefing()}
function close(){token++;run=null;document.body.classList.remove('hs2d-open');const r=root();r.hidden=true;Game?.switchView?.('content');renderCard()}
function hpNeed(level){return 800+Math.max(0,(Number(level)||1)-1)*250}
function awardXp(){
 return party().map(c=>{const beforeLevel=Math.max(1,Number(c.level)||1),beforeXp=Math.max(0,Number(c.xp)||0),beforeNeed=hpNeed(beforeLevel);let level=beforeLevel,xp=beforeXp+XP,levels=0;while(xp>=hpNeed(level)){xp-=hpNeed(level);level++;levels++}c.level=level;c.xp=xp;if(levels){c.talent=(Number(c.talent)||0)+levels;c.power=(Number(c.power)||1)+levels*2}return{name:c.name,beforeLevel,beforeXp,beforeNeed,afterLevel:level,afterXp:xp,afterNeed:hpNeed(level),levels}})
}
async function syncXp(gains){
 if(!db)return;const user=Game.getUser?.();if(!user)return;try{await Promise.all(gains.map(x=>db.from('characters').update({level:x.afterLevel,xp:x.afterXp,last_played_at:new Date().toISOString()}).eq('user_id',user.id).eq('name',x.name)))}catch(e){console.warn('Hollow XP sync failed',e)}
}
function setStatus(text){const e=$('#hs2dStatus');if(e)e.textContent=text}
function feed(text){if(!run)return;run.log.push(text);const e=$('#hs2dFeed');if(e)e.innerHTML=run.log.slice(-7).reverse().map(x=>'<p>'+esc(x)+'</p>').join('')}
function addUnit(id,label,cls,x,y,big=false){const e=document.createElement('div');e.className='hs2d-unit '+cls+(big?' big':'');e.dataset.hs=id;e.style.left=x+'%';e.style.top=y+'%';e.innerHTML='<i></i><span>'+esc(label)+'</span><em><i></i></em>';$('#hs2dUnits').appendChild(e)}
function move(id,x,y,ms=550){const e=$('[data-hs="'+id+'"]');if(!e)return;e.style.transitionDuration=ms+'ms';e.style.left=x+'%';e.style.top=y+'%'}
function hsPoint(id){const arena=$('#hs2dArena'),e=$('[data-hs="'+id+'"]');if(!arena||!e)return null;const ar=arena.getBoundingClientRect(),r=e.getBoundingClientRect();return{x:r.left+r.width/2-ar.left,y:r.top+r.height/2-ar.top,w:ar.width,h:ar.height}}
function projectile(fromId,toId,kind='magic',ms=420){
 const a=hsPoint(fromId),b=hsPoint(toId),fx=$('#hs2dFx');if(!a||!b||!fx)return;
 const dx=b.x-a.x,dy=b.y-a.y,angle=Math.atan2(dy,dx)*180/Math.PI,p=document.createElement('i');
 p.className='hs2d-shot '+kind;p.style.left=a.x+'px';p.style.top=a.y+'px';p.style.setProperty('--dx',dx+'px');p.style.setProperty('--dy',dy+'px');p.style.setProperty('--angle',angle+'deg');fx.appendChild(p);setTimeout(()=>p.remove(),ms+120)
}
function hsFloat(id,text,kind='damage'){const p=hsPoint(id),arena=$('#hs2dArena');if(!p||!arena)return;const e=document.createElement('b');e.className='hs2d-float '+kind;e.textContent=text;e.style.left=p.x+'px';e.style.top=p.y+'px';arena.appendChild(e);setTimeout(()=>e.remove(),800)}
function hsBar(id,pct){const bar=$('[data-hs="'+id+'"] > em i');if(bar)bar.style.width=Math.max(0,Math.min(100,pct))+'%'}
function livingEnemyIds(){return $$('[data-hs^="e"]').filter(e=>!e.classList.contains('dead')).map(e=>e.dataset.hs)}
function primaryEnemy(){return livingEnemyIds()[0]||null}
function partyIndexes(){return party().map((c,i)=>({c,i,role:role(c)}))}
function tankEntry(){return partyIndexes().find(x=>x.role==='tank')||partyIndexes()[0]}
function healerEntry(){return partyIndexes().find(x=>x.role==='healer')||null}
function hsTelegraph(type,label,sourceId,targetId,size=170){
 const layer=$('#hs2dTelegraphs'),a=sourceId?hsPoint(sourceId):null,b=targetId?hsPoint(targetId):null;if(!layer)return null;
 const e=document.createElement('div');e.className='hs2d-tele '+type+' dynamic';e.innerHTML='<span>'+esc(label)+'</span>';
 if(type==='circle'){
   const p=b||a;if(!p)return null;e.style.left=p.x+'px';e.style.top=p.y+'px';e.style.width=size+'px';e.style.height=size+'px';e.style.transform='translate(-50%,-50%)';
 }else{
   if(!a||!b)return null;const dx=b.x-a.x,dy=b.y-a.y,angle=Math.atan2(dy,dx)*180/Math.PI;
   e.style.left=a.x+'px';e.style.top=a.y+'px';e.style.width=Math.max(220,Math.hypot(a.w,a.h)*.78)+'px';e.style.height='58px';e.style.transform='translateY(-50%) rotate('+angle+'deg)';
 }
 layer.appendChild(e);return e
}
async function hsMechanic(s,index){
 const tank=tankEntry(),healer=healerEntry(),players=partyIndexes(),bossId='e0';
 if(index===1){
   const targets=players.filter(x=>x.role!=='tank'),target=targets[Math.floor(Math.random()*Math.max(1,targets.length))]||players[0];
   const tg=hsTelegraph('line',s.mechanic,bossId,'p'+target.i);
   feed(s.enemies[0]+' lines up '+target.c.name+' with '+s.mechanic+'.');
   const y=parseFloat($('[data-hs="p'+target.i+'"]')?.style.top)||50;move('p'+target.i,28,y>50?25:78,430);
   await wait(850);tg?.classList.add('impact');await wait(280);tg?.remove();return;
 }
 if(index===2){
   const tg=hsTelegraph('circle',s.mechanic,bossId,bossId,210);feed(s.enemies[0]+' begins '+s.mechanic+' around itself.');
   players.forEach((x,i)=>{if(x.role==='tank')move('p'+x.i,43,50,430);else move('p'+x.i,20+(i%2)*10,20+(i%3)*28,430)});
   await wait(900);tg?.classList.add('impact');await wait(300);tg?.remove();return;
 }
 const target=players.filter(x=>x.role!=='tank')[0]||players[0],tg=hsTelegraph('circle',s.mechanic,bossId,'p'+target.i,145);
 feed('An echo locks onto '+target.c.name+'.');const y=parseFloat($('[data-hs="p'+target.i+'"]')?.style.top)||50;move('p'+target.i,24,y>50?22:78,420);
 await wait(820);tg?.classList.add('impact');await wait(260);tg?.remove();
}
function stageEnvironment(s){const arena=$('#hs2dArena');arena.className='hs2d-arena stage-'+s.id;$('#hs2dRoom').innerHTML='<b>'+esc(s.title)+'</b><small>'+(s.id==='gallery'?'Cell glass whispers through the walls.':s.id==='sentinel'?'A guardian made of glass and bone blocks the descent.':'Several voices are speaking from one body.')+'</small>'}
function spawnStage(s){
 stageEnvironment(s);$('#hs2dUnits').innerHTML='';$('#hs2dTelegraphs').innerHTML='';$('#hs2dFx').innerHTML='';
 const p=party(),melee=p.filter(c=>role(c)!=='healer'&&!['Hunter','Mage','Priest'].includes(c.class));
 p.forEach((c,i)=>{const r=role(c);addUnit('p'+i,c.name,'party '+r+' '+classKey(c),7,30+i*10);let x=r==='tank'?34:r==='healer'?19:(['Hunter','Mage','Priest'].includes(c.class)?22:29),y=31+i*9;setTimeout(()=>move('p'+i,x,y,750),40)});
 s.enemies.forEach((n,i)=>{const big=s.enemies.length===1;addUnit('e'+i,n,big?'enemy boss':'enemy',93,big?50:33+i*17,big);setTimeout(()=>move('e'+i,68,big?50:33+i*17,750),80)})
}
async function fightStage(s,tok,index){
 spawnStage(s);setStatus('Entering '+s.title+'…');feed('The party enters '+s.title+'.');await wait(1000);if(tok!==token)return false;
 const players=partyIndexes(),tank=tankEntry(),healer=healerEntry();
 setStatus('Tank establishing threat…');
 if(tank){move('p'+tank.i,49,50,480);feed(tank.c.name+' moves in first and takes threat.')}
 await wait(300);
 s.enemies.forEach((_,i)=>move('e'+i,60, s.enemies.length===1?50:36+i*(28/Math.max(1,s.enemies.length-1)),430));
 await wait(420);
 players.forEach((x,i)=>{
   if(x.role==='tank')return;
   const ranged=['Hunter','Mage','Priest'].includes(x.c.class)||x.role==='healer';
   if(ranged)move('p'+x.i,x.role==='healer'?17:24,28+(i%3)*22,430);
   else move('p'+x.i,66,38+(i%2)*24,430);
 });
 await wait(420);

 for(let wave=0;wave<3;wave++){
   if(tok!==token)return false;
   const enemyId=primaryEnemy();if(!enemyId)break;
   if(wave===1){setStatus(s.mechanic+' incoming…');await hsMechanic(s,index);if(tok!==token)return false}
   setStatus('Party attacking.');
   players.forEach((x,i)=>{
     const target=primaryEnemy();if(!target||x.role==='healer')return;
     const kind=x.c.class==='Hunter'?'arrow':x.c.class==='Mage'?'magic':'slash';
     const el=$('[data-hs="p'+i+'"]');if(el){el.classList.add('attack');setTimeout(()=>el.classList.remove('attack'),300)}
     projectile('p'+i,target,kind,kind==='arrow'?320:260);
   });
   if(healer&&tank){
     projectile('p'+healer.i,'p'+tank.i,'heal',330);hsFloat('p'+tank.i,'+10','heal');hsBar('p'+tank.i,100);feed(healer.c.name+' restores '+tank.c.name+'.');
   }
   s.enemies.forEach((_,i)=>{
     const id='e'+i,enemy=$('[data-hs="'+id+'"]');if(!enemy||enemy.classList.contains('dead')||!tank)return;
     projectile(id,'p'+tank.i,'enemy',300);hsFloat('p'+tank.i,'-8','incoming');hsBar('p'+tank.i,82);
   });
   await wait(520);
   const live=$$('#hs2dUnits .enemy:not(.dead)');
   if(live.length){
     const victim=live[0],id=victim.dataset.hs,next=Math.max(0,66-wave*33);hsBar(id,next);
     hsFloat(id,'-'+(34+wave*4),'damage');
     if(next<=0)victim.classList.add('dead');
   }
   await wait(620);
 }
 const live=$$('#hs2dUnits .enemy:not(.dead)');live.forEach((e,i)=>setTimeout(()=>{e.classList.add('dead');hsBar(e.dataset.hs,0)},i*120));
 feed(s.title+' is clear.');setStatus('Path clear.');await wait(850);return true;
}
function draw(){
 const s=STAGES[run.stage],r=root();r.hidden=false;
 r.innerHTML='<section class="hs2d-shell"><header><div><small>THE HOLLOW SANCTUM · LIVE 2D DUNGEON</small><h2 id="hs2dTitle">'+esc(s.title)+'</h2></div><div class="hs2d-live"><i></i>LIVE <button data-close>×</button></div></header><div class="hs2d-route">'+STAGES.map((x,i)=>'<span class="'+(i<run.stage?'done':i===run.stage?'current':'')+'"><i>'+(i+1)+'</i>'+esc(x.title)+'</span>').join('')+'</div><div class="hs2d-layout"><main><div class="hs2d-arena" id="hs2dArena"><div class="hs2d-floor"></div><div class="hs2d-crystals"><i></i><i></i><i></i><i></i><i></i></div><div id="hs2dTelegraphs"></div><div id="hs2dUnits"></div><div id="hs2dFx"></div><div class="hs2d-room" id="hs2dRoom"></div><div class="hs2d-caption"><span>EXPEDITION</span><b id="hs2dStatus">Descending…</b></div></div><div class="hs2d-feed" id="hs2dFeed"></div></main><aside><small>ACTIVE FIVE · PARTY ILVL '+ilvl()+'</small>'+party().map(c=>'<div class="hs2d-member"><i class="'+role(c)+' '+classKey(c)+'"></i><span><b>'+esc(c.name)+'</b><small>'+esc(c.class)+' · '+esc(c.spec)+'</small></span></div>').join('')+'<div class="hs2d-loot-intel"><small>KNOWN REWARDS</small><b>Tier 3 randomized equipment</b><span>Void Crystal · '+(!firstCleared()?'Blackglass Resonator first clear':'unique Relic already recovered')+'</span></div></aside></div><div id="hs2dEnd" class="hs2d-end" hidden></div></section>';
 r.querySelector('[data-close]').onclick=()=>{if(run&&!run.done&&!confirm('Leave The Hollow Sanctum?'))return;close()}
}
async function start(){
 token++;const tok=token;run={stage:0,done:false,log:[]};draw();
 for(let i=0;i<STAGES.length;i++){if(tok!==token)return;run.stage=i;const s=STAGES[i];$('#hs2dTitle').textContent=s.title;$('.hs2d-route').innerHTML=STAGES.map((x,j)=>'<span class="'+(j<i?'done':j===i?'current':'')+'"><i>'+(j+1)+'</i>'+esc(x.title)+'</span>').join('');if(!await fightStage(s,tok,i))return}
 if(tok!==token)return;await complete();
}
async function complete(){
 const s=state(),q=qstate(),first=!q.flags.hollowFirstClear,gains=awardXp(),gear=rollHollowGear();s.gold=(Number(s.gold)||0)+220;s.renown=(Number(s.renown)||0)+100;Game.addMaterial?.('void-crystal',first?2:1);q.flags.hollowFirstClear=true;q.hollowCompletions=(Number(q.hollowCompletions)||0)+1;
 if(gear)Game.addBankItem?.(gear);
 if(first)Game.addBankItem?.({...RELIC,source:'The Bound Choir · First Clear'});
 s.activity.push('The Hollow Sanctum cleared. Each adventurer earned '+XP+' XP.'+(gear?' '+gear.name+' was sent to the Guild Bank.':'')+(first?' Blackglass Resonator added to the Guild Bank.':''));
 Game.save?.();await Game.persistState?.();await syncXp(gains);run.done=true;window.dispatchEvent(new CustomEvent('cellbound:hollow-complete',{detail:{firstClear:first}}));
 const end=$('#hs2dEnd');end.hidden=false;end.innerHTML='<section class="hs2d-rewards"><small>DUNGEON COMPLETE</small><h2>The Hollow Sanctum</h2><p>The voices beneath Zeltira have fallen silent — for now.</p><div class="hs2d-reward-grid"><article><span>GOLD</span><b>+220</b></article><article><span>RENOWN</span><b>+100</b></article><article><span>PARTY XP</span><b>+'+XP+'</b></article><article><span>VOID CRYSTAL</span><b>+'+(first?2:1)+'</b></article></div>'+(gear?'<div class="hs2d-first-relic"><div>'+window.CellboundGear.artHTML(gear,76)+'</div><span><small>TIER 3 DUNGEON DROP</small><h3>'+esc(gear.name)+'</h3><p>'+(window.CellboundGear.statLines?.(gear)||[]).map(x=>esc(x.text)).join(' · ')+'</p><em>Sent to the Guild Bank</em></span></div>':'')+(first?'<div class="hs2d-first-relic"><div>'+window.CellboundGear.artHTML(RELIC,76)+'</div><span><small>FIRST-CLEAR RELIC</small><h3>Blackglass Resonator</h3><p>Rare · Relic · Item Level 30 · +10 Power</p><em>Sent to the Guild Bank</em></span></div>':'')+'<div class="hs2d-xp-list">'+gains.map(x=>'<div><span><b>'+esc(x.name)+'</b><small>Level '+x.beforeLevel+(x.afterLevel!==x.beforeLevel?' → '+x.afterLevel:'')+'</small></span><strong>+'+XP+' XP</strong></div>').join('')+'</div><button data-return>RETURN TO DUNGEON JOURNAL →</button></section>';
 end.querySelector('[data-return]').onclick=()=>{close();Game.renderAll?.();renderCard()}
}
function init(){Game=window.CellboundGame;if(!Game?.ready){setTimeout(init,100);return}db=Game.getSupabase?.();renderCard();document.querySelector('.nav-btn[data-view="content"]')?.addEventListener('click',renderCard);window.CellboundHollowSanctum={open:openDungeon,renderCard,relic:RELIC}}
init();
})();