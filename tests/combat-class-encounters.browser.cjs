'use strict';
// Actual Dungeon2D session and artwork; all-class access exists only in this mock backend.
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium,webkit}=require('playwright');
const {mount,coreLoopState}=require('./full-playthrough.browser.cjs');
const groups=[['Warrior','Paladin','Hunter','Rogue','Mage'],['Death Knight','Demon Hunter','Druid','Evoker','Priest'],['Warlock','Monk','Shaman','Warrior','Priest']];
(async()=>{const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true});try{
 for(const [index,classes] of groups.entries()){
  const page=await browser.newPage({viewport:index===2?{width:390,height:844}:{width:1366,height:1024}}),errors=await mount(page,coreLoopState(),false,{simulateDungeonRuntime:true});
  await page.evaluate(classes=>{
   const s=CellboundGame.getState();s.roster.slice(0,5).forEach((c,i)=>{
    c.class=classes[i];const a=CellboundCombatData.ABILITIES[c.class].find(a=>a.spec)||CellboundCombatData.ABILITIES[c.class][0];c.spec=({Paladin:'Holy',Druid:'Balance',Evoker:'Devastation',Priest:'Shadow',Monk:'Brewmaster',Shaman:'Elemental'}[c.class])||a.spec||c.spec;c.role=(CellboundCombatData.ABILITIES[c.class].find(x=>x.spec===c.spec&&x.role)||a).role||'dps';c.level=5;c.race=CellboundCharacterRig.races[(i+classes.length)%6];c.appearance={gender:i%2,frame:i%3};
    for(const slot of Object.keys(c.equipment))c.equipment[slot]=CellboundGear.items.find(x=>x.class===c.class&&x.tier===1&&x.slot===(slot.startsWith('Ring')?'Ring':slot.startsWith('Trinket')?'Trinket':slot));
   });CellboundGame.renderAll();CellboundDungeon2D.open();
  },classes);
  await page.locator('.cb2d-start[data-start]').click();await page.waitForSelector('#cb2dArena [data-animation-owned="1"]',{timeout:45000});
  const seen=await page.evaluate(classes=>new Promise(resolve=>{
   const observed={},start=performance.now();let count=0,last=start,done=false;const timings=[];
   function observe(){for(const el of document.querySelectorAll('#cb2dArena [data-animation-owned]')){const k=el.querySelector('[data-animation-class]')?.dataset.animationClass;if(k){observed[k]??=[];const a=el.dataset.animationClip;if(a&&!observed[k].includes(a))observed[k].push(a)}}}
   // Capture state writes even if the software WebKit compositor skips paints.
   // Keep frame timing separate: functional coverage is not a performance pass.
   const watcher=new MutationObserver(observe);watcher.observe(document.querySelector('#cb2dArena'),{subtree:true,attributes:true,attributeFilter:['data-animation-clip']});
   function finish(){if(done)return;const elapsed=performance.now()-start;if(elapsed<8000||elapsed<35000&&!classes.every(k=>observed[k]?.some(a=>!['hit','block','dodge','heal','interrupt','control','death','revive'].includes(a))))return;done=true;watcher.disconnect();clearInterval(poll);timings.sort((a,b)=>a-b);resolve({observed,frames:count,p95:timings[Math.floor(timings.length*.95)],elapsed})}
   function tick(t){if(done)return;count++;timings.push(t-last);last=t;observe();finish();if(!done)requestAnimationFrame(tick)}
   const poll=setInterval(()=>{observe();finish()},100);requestAnimationFrame(tick);
  }),classes);
  console.log('All-class frame diagnostics',JSON.stringify(seen));
  for(const klass of new Set(classes)){assert(klass in seen.observed,klass+' rendered in actual encounter');assert(seen.observed[klass].some(a=>!['hit','block','dodge','heal','interrupt','control','death','revive'].includes(a)),klass+' receives genuine engine actions: '+JSON.stringify(seen))}
  fs.mkdirSync('/tmp/cellbound-class-animation',{recursive:true});await page.screenshot({path:'/tmp/cellbound-class-animation/encounter-'+(process.env.CELLBOUND_TEST_ENGINE||'chromium')+'-'+index+'.png'});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page overflow');assert.deepEqual(errors,[]);
  console.log('Actual all-class encounter',classes.join(', '),JSON.stringify(seen));await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
