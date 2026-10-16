'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium,webkit}=require('playwright');
const {mount,coreLoopState}=require('./full-playthrough.browser.cjs');
(async()=>{
 const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true});
 try{
  fs.mkdirSync('/tmp/cellbound-realtime',{recursive:true});
  const page=await browser.newPage({viewport:{width:1366,height:1024}});
  const missing=[];page.on('response',r=>{if(r.status()===404){missing.push(r.url());console.log('Missing resource',r.url())}});
  const errors=await mount(page,coreLoopState(),false,{simulateDungeonRuntime:true});
  await page.evaluate(()=>{
   window.roomSamples=[];
   window.entryContinuity=[];
   window.hunterFirstCall=null;window.hunterCallFrames=[];
   const originalCombatEvent=CellboundCombatFX.combatEvent;
   CellboundCombatFX.combatEvent=function(event,options){
    const arena=options?.arena;
    if(event?.type==='COMBAT_START'&&arena?.id==='cb2dArena'){
     const positions=()=>[...arena.querySelectorAll('[data-unit^="p-"]')].map(el=>{
      const r=el.getBoundingClientRect(),stage=arena.getBoundingClientRect();
      return{id:el.dataset.unit,x:r.left+r.width/2-stage.left,y:r.top+r.height/2-stage.top};
     });
     const before=positions(),start=performance.now();
     requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const after=new Map(positions().map(p=>[p.id,p]));
      entryContinuity.push({stage:CellboundDungeon2D.currentRun()?.stage,width:arena.clientWidth,elapsedMs:performance.now()-start,
       jumps:before.map(p=>({id:p.id,distance:after.has(p.id)?
        Math.hypot(after.get(p.id).x-p.x,after.get(p.id).y-p.y):null}))});
     }));
    }
    const result=originalCombatEvent.apply(this,arguments);
    if(event?.type==='PET_SUMMONED'&&event.payload?.petType==='hunter-beast'&&arena?.id==='cb2dArena'&&CellboundDungeon2D.currentRun()?.stage===0){
     const pet=arena.querySelector('[data-unit="'+event.target+'"].cbl-pet');
     const owner=arena.querySelector('[data-unit="'+event.payload.ownerId+'"].party');
     const a=arena.getBoundingClientRect(),p=pet?.getBoundingClientRect(),o=owner?.getBoundingClientRect();
     const px=p?p.left+p.width/2:NaN,py=p?p.top+p.height/2:NaN;
     const ox=o?o.left+o.width/2:NaN,oy=o?o.top+o.height/2:NaN;
     hunterFirstCall={hasPet:!!pet,hasCallLabel:!!arena.querySelector('.cbl-hunter-call'),
      isCalledAtOwner:pet?.dataset.firstRoomCall==='1',
      ownerDistance:Math.hypot(px-ox,py-oy),
      leftPct:(px-a.left)/a.width*100,topPct:(py-a.top)/a.height*100};
     // The original assertion only sampled this one moment. Catch a legacy
     // transform repaint or spatial handoff that moves the pet from (0,0)
     // during the first second, including on slow iPad WebKit.
     const started=performance.now(),petId=event.target;
     const capture=()=>{
      const node=arena.querySelector('[data-unit="'+petId+'"].cbl-pet');
      if(!node)return;
      const rect=node.getBoundingClientRect(),b=arena.getBoundingClientRect(),style=getComputedStyle(node);
      hunterCallFrames.push({t:performance.now()-started,x:rect.left+rect.width/2-b.left,y:rect.top+rect.height/2-b.top,
       w:b.width,h:b.height,ready:node.dataset.petReady,visibility:style.visibility,
       left:style.left,top:style.top,transform:style.transform});
     };
     capture();
     const timer=setInterval(()=>{capture();if(performance.now()-started>1200)clearInterval(timer)},55);
    }
    return result;
   };
   window.roomTimer=setInterval(()=>{
    const run=CellboundDungeon2D.currentRun(),arena=document.querySelector('#cb2dArena');if(!run||!arena)return;
    roomSamples.push({time:performance.now(),stage:run.stage,combat:run.combatActive,travel:arena.classList.contains('travelling'),
     units:[...arena.querySelectorAll('[data-unit^="p-"]')].map(e=>{const r=e.getBoundingClientRect(),ar=arena.getBoundingClientRect();return{id:e.dataset.unit,left:e.style.left,top:e.style.top,x:r.left+r.width/2-ar.left,y:r.top+r.height/2-ar.top,spatial:e.dataset.spatialState}}),
     pets:[...arena.querySelectorAll('.cbl-pet[data-pet-permanent="1"]')].map(e=>{const r=e.getBoundingClientRect(),owner=arena.querySelector('[data-unit="'+e.dataset.owner+'"].party'),o=owner?.getBoundingClientRect();return{id:e.dataset.unit,owner:e.dataset.owner,x:r.left+r.width/2,y:r.top+r.height/2,ownerDistance:o?Math.hypot(r.left+r.width/2-o.left-o.width/2,r.top+r.height/2-o.top-o.height/2):null}})});
   },80);
   // A permanent Hunter pet must enter and exit as a member of the party.
   const hunter=CellboundGame.getState().roster.find(c=>c.class==='Hunter');
   if(hunter)hunter.spec='Beast Mastery';
   CellboundGame.renderAll();
   CellboundDungeon2D.open();
  });
  await page.locator('[data-start]').click();
  await page.waitForFunction(()=>CellboundDungeon2D.currentRun()?.stage>=2,null,{timeout:180000});
  if(process.env.CELLBOUND_REALTIME_FULL_RUN){
   const deadline=Date.now()+240000;
   while(Date.now()<deadline&&!await page.evaluate(()=>Number(CellboundGame.getState().dungeonCompletions)>0)){
    const begin=page.locator('[data-cbd-begin]');if(await begin.isVisible())await begin.click();
    await page.waitForTimeout(500);
   }
   assert(await page.evaluate(()=>Number(CellboundGame.getState().dungeonCompletions)>0),'full run completes through the real boss briefing');
  }
  const {data,entries,firstCall,callFrames}=await page.evaluate(()=>{
   clearInterval(roomTimer);return{data:roomSamples,entries:entryContinuity,firstCall:hunterFirstCall,callFrames:hunterCallFrames};
  });
  fs.writeFileSync('/tmp/cellbound-realtime/rooms.json',JSON.stringify(data));
  fs.writeFileSync('/tmp/cellbound-realtime/entry-continuity.json',JSON.stringify(entries,null,2));
  fs.writeFileSync('/tmp/cellbound-realtime/hunter-call-frames.json',JSON.stringify(callFrames,null,2));
  assert(firstCall?.hasPet&&firstCall.isCalledAtOwner&&firstCall.hasCallLabel,
   'first-room Hunter calls their pet as a visible spawn instead of having it enter from off-screen: '+JSON.stringify(firstCall));
  assert(firstCall.ownerDistance<92&&firstCall.leftPct>=6&&firstCall.leftPct<=94&&firstCall.topPct>=12&&firstCall.topPct<=89,
   'first-room pet first appears beside the Hunter inside the arena: '+JSON.stringify(firstCall));
  assert(callFrames.length>=3,'pet sampled across subsequent animation frames');
  const readyFrames=callFrames.filter(x=>x.ready==='1'&&x.visibility==='visible');
  assert(readyFrames.length>=2,'pet becomes visible only after a real position is assigned');
  for(const f of readyFrames){
   assert(f.x>=f.w*.035&&f.x<=f.w*.965&&f.y>=f.h*.085&&f.y<=f.h*.92,
    'pet does not reappear from off-screen corner after initial summon: '+JSON.stringify(f));
  }
  for(let i=1;i<readyFrames.length;i++){
   const a=readyFrames[i-1],b=readyFrames[i],distance=Math.hypot(b.x-a.x,b.y-a.y),elapsed=Math.max(1,b.t-a.t);
   assert(distance<Math.max(75,elapsed*.32),
    'pet must not jump after summon or during renderer handover: '+JSON.stringify({distance,elapsed,a,b}));
  }
  assert(entries.length>=2,'entry continuity captured across room transitions');
  for(const entry of entries){
   // Two WebKit animation frames may span hundreds of milliseconds. Allow
   // legitimate walking at <= 220px/s, but never a frame-independent warp.
   const limit=Math.max(45,entry.width*.045,Math.min(220,25+(entry.elapsedMs||0)*.22));
   for(const u of entry.jumps){
    assert(Number.isFinite(u.distance),u.id+' remained mounted during combat handoff');
    assert(u.distance<limit,u.id+' teleported '+Math.round(u.distance)+'px when combat began in stage '+entry.stage);
   }
  }
  const transit=data.filter(x=>x.travel);
  console.log({samples:data.length,transit:transit.length,stages:[...new Set(data.map(x=>x.stage))],errors});
  assert(transit.length>5);
  for(const stage of [0,1]){
   const samples=transit.filter(x=>x.stage===stage).flatMap(x=>x.units.filter(u=>u.id==='p-tank'));
   const distance=Math.max(0,...samples.map(a=>Math.max(...samples.map(b=>Math.hypot(a.x-b.x,a.y-b.y)))));
   // Physical travel, not a count of JS style writes: native WebKit
   // interpolation can move visibly between throttled animation callbacks.
   assert(samples.length>=2&&distance>20,'party visibly travels through exit '+stage+' ('+samples.length+' samples, '+Math.round(distance)+'px)');
  }
  const observedPets=data.filter(s=>s.pets?.some(p=>p.owner==='p-hunt'&&p.id.includes('hunter-beast')));
  assert(observedPets.some(s=>s.travel&&s.stage===0),'Hunter beast walks out of the first room with the party');
  assert(observedPets.some(s=>s.stage===1),'Hunter beast survives the next room entry instead of respawning from an edge');
  assert(observedPets.some(s=>s.stage===1&&s.pets.some(p=>p.owner==='p-hunt'&&p.ownerDistance!==null&&p.ownerDistance<115)),
   'Hunter beast appears near its owner in the next room');
  if(process.env.CELLBOUND_REALTIME_FULL_RUN)await page.locator('[data-loot-return]').click();
  else{page.once('dialog',d=>d.accept());await page.locator('#cb2dBackdrop [data-close]').first().click()}
  await page.waitForTimeout(300);await page.evaluate(()=>CellboundDungeon2D.open());
  await page.locator('[data-start]').click();await page.waitForSelector('#cb2dArena [data-animation-owned="1"]');
  assert(await page.evaluate(()=>!!CellboundDungeon2D.currentRun()?.rebornLiveSession),'reentry owns live session');
  assert.deepEqual(errors,[]);
  console.log('Ashen room transitions and close/re-entry passed'+(process.env.CELLBOUND_REALTIME_FULL_RUN?' after all seven encounters and verified mock-server completion.':'.'));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
