'use strict';
// Continuous production-scene benchmark. No frozen simulation, accelerated clock,
// or synthetic combat results. Set CELLBOUND_REALTIME_BASELINE to a built worktree
// to replay precisely this fixture against an earlier commit.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const root=process.env.CELLBOUND_REALTIME_BASELINE||path.resolve(__dirname,'..');
const {mount,matureState}=require(path.join(root,'tests/full-playthrough.browser.cjs'));
const dir=process.env.CELLBOUND_REALTIME_OUTPUT||'/tmp/cellbound-realtime';
const label=process.env.CELLBOUND_REALTIME_LABEL||'after';
const viewport=process.env.CELLBOUND_REALTIME_MOBILE?{width:390,height:844}:process.env.CELLBOUND_REALTIME_PORTRAIT?{width:1024,height:1366}:{width:1366,height:1024};
(async()=>{
 fs.mkdirSync(dir,{recursive:true});
 const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true});
 try{
  const page=await browser.newPage({viewport,recordVideo:process.env.CELLBOUND_REALTIME_RECORD?{dir}:undefined});
  const errors=await mount(page,matureState(),true,{simulateDungeonRuntime:true});
  await page.evaluate(navigation=>{
   const state=CellboundGame.getState();state.progression.fracturedAgesUnlocked=true;
   state.roster.forEach((c,i)=>{
    if(i===2||i===4){c.class='Warrior';c.spec='Arms'}if(i===3)c.spec='Beast Mastery';c.power=navigation?90:12;c.level=15;
    for(const slot of ['Head','Chest','Weapon','OffHand','Shoulders','Hands','Legs','Feet','Waist'])c.equipment[slot]={...CellboundGear.items.find(x=>x.class===c.class&&x.tier===3&&x.slot===slot),class:c.class,slot,itemLevel:50,baseItemLevel:50};
   });
   CellboundGame.renderAll();window.realtimeProbe={steps:[],events:[]};
   const create=CellboundCombatStandard.createLiveSession;
   CellboundCombatStandard.createLiveSession=function(...args){
    const session=create.apply(this,args),advance=session.advance.bind(session);
    session.advance=(...a)=>{
     const start=performance.now(),step=advance(...a);
     realtimeProbe.steps.push({cost:performance.now()-start,time:step.timeMs,wall:start});
     realtimeProbe.events.push(...(step.events||[]).map(e=>({type:e.type,ability:e.ability,result:e.result,wall:start,time:e.timestamp})));
     return step;
    };
    window.realtimeSession=session;return session;
   };
   CellboundFracturedAges.open();
  },!!process.env.CELLBOUND_REALTIME_NAVIGATION);
  await page.locator('[data-fa-start]').click();
  await page.waitForSelector('#q2dArena [data-animation-owned="1"]',{timeout:45000});
  if(process.env.CELLBOUND_REALTIME_NAVIGATION){
   await page.waitForFunction(()=>document.querySelector('#q2dArena')?.dataset.faRoom==='iron-kingdom',null,{timeout:180000});
   assert.equal(await page.locator('.quest-cb2d-backdrop:visible').count(),1,'one active room');
   await page.screenshot({path:path.join(dir,'fractured-second-room.png')});
   page.once('dialog',d=>d.accept());await page.locator('[data-q-close]').click();
   await page.locator('[data-fa-return]').click();
   await page.evaluate(()=>{CellboundGame.getState().roster.forEach(c=>c.cellShock=0);CellboundFracturedAges.open();window.savedPersist=CellboundGame.persistState;CellboundGame.persistState=()=>new Promise(resolve=>window.releaseEntry=resolve)});
   await page.locator('[data-fa-start]').click();await page.waitForFunction(()=>!!window.releaseEntry);
   await page.locator('[data-fa-close]').click();
   await page.evaluate(()=>{releaseEntry();CellboundGame.persistState=savedPersist});await page.waitForTimeout(1000);
   assert.equal(await page.locator('.quest-cb2d-backdrop:visible').count(),0,'cancelled asynchronous entry cannot reopen combat');
   assert.equal(await page.locator('.cbx-transition').count(),0,'no orphan transition overlay');
   assert.deepEqual(errors,[]);console.log('Fractured Ages: Mercer victory, second-room entry, departure and cancelled asynchronous re-entry passed');return;
  }
  const duration=Number(process.env.CELLBOUND_REALTIME_DURATION)||20000;
  const result=await page.evaluate(duration=>new Promise(resolve=>{
   const frames=[],long=[],poses=new Map(),states=new Set(),start=performance.now();let last=start,maxEffects=0;
   const observer=typeof PerformanceObserver!=='undefined'&&PerformanceObserver.supportedEntryTypes.includes('longtask')?new PerformanceObserver(list=>long.push(...list.getEntries().map(e=>e.duration))):null;
   observer?.observe({type:'longtask'});
   function frame(t){
    frames.push(t-last);last=t;
    maxEffects=Math.max(maxEffects,document.querySelectorAll('.cbl-fx').length);
    document.querySelectorAll('#q2dArena [data-animation-state]').forEach(n=>states.add(n.dataset.animationState));
    // Track changing poses across the party; the first tank's weapon arm can
    // remain held while its shield arm blocks. Static arms contribute nothing.
    document.querySelectorAll('#q2dArena .cb-paper-upper-right,#q2dArena .cb-paper-upper-left').forEach(arm=>{
     if(!poses.has(arm))poses.set(arm,new Set());poses.get(arm).add(arm.getAttribute('transform'));
    });
    if(t-start<duration)requestAnimationFrame(frame);else{observer?.disconnect();resolve({frames,long,elapsed:t-start,probe:realtimeProbe,poses:[...poses.values()].reduce((n,p)=>n+Math.max(0,p.size-1),0),states:[...states],maxEffects})}
   }requestAnimationFrame(frame);
  }),duration);
  const sorted=[...result.frames].sort((a,b)=>a-b);
  result.summary={fps:result.frames.length/result.elapsed*1000,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),longTasks:result.long.length,poses:result.poses};
  fs.writeFileSync(path.join(dir,label+'-metrics.json'),JSON.stringify(result,null,2));
  await page.screenshot({path:path.join(dir,label+'.png')});
  assert(result.probe.steps.length>60,'authoritative session continuously advances');
  assert(result.poses>15,'actual arm poses progress between actions');
  assert(result.probe.events.some(e=>e.ability==='Wanted Mark'&&e.type==='MECHANIC_RESOLVE'),'Mercer warning resolves during live play');
  assert(result.maxEffects<=36,'bounded shared effects');
  if(!process.env.CELLBOUND_REALTIME_BASELINE&&duration===20000){
   const command=await page.evaluate(()=>{
    const button=document.querySelector('[data-q-command="spread"]'),start=performance.now();button.click();
    return{ms:performance.now()-start,disabled:button.disabled};
   });
   assert(command.disabled,'Spread state responds in the click handler');
   const paused=await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
    return{visual:CellboundCombatAnimation.now(),simulation:realtimeSession.timeMs};
   });
   await page.waitForTimeout(500);
   assert.deepEqual(await page.evaluate(()=>({visual:CellboundCombatAnimation.now(),simulation:realtimeSession.timeMs})),paused,'hidden tab does not advance simulation or presentation');
   await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});
   await page.waitForTimeout(300);
   assert(await page.evaluate(t=>realtimeSession.timeMs>t,paused.simulation),'playback resumes');
   fs.writeFileSync(path.join(dir,label+'-interaction.json'),JSON.stringify({command,paused},null,2));
  }
  page.once('dialog',d=>d.accept());await page.locator('[data-q-close]').click();await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>CellboundCombatAnimation.diagnostics().pending),0,'room departure disposes callbacks');
  assert.deepEqual(errors,[]);
  const video=page.video();await page.close();if(video)await video.saveAs(path.join(dir,label+'.webm'));
  console.log(label,JSON.stringify(result.summary));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
