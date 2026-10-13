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
  const seen=await page.evaluate(()=>new Promise(resolve=>{
   const observed={},start=performance.now();let count=0,last=start;const timings=[];
   function tick(t){count++;timings.push(t-last);last=t;for(const el of document.querySelectorAll('#cb2dArena [data-animation-owned]')){const k=el.querySelector('[data-animation-class]')?.dataset.animationClass;if(k){observed[k]??=[];const a=el.dataset.animationClip;if(a&&!observed[k].includes(a))observed[k].push(a)}}if(t-start<8000)requestAnimationFrame(tick);else{timings.sort((a,b)=>a-b);resolve({observed,frames:count,p95:timings[Math.floor(timings.length*.95)]})}}requestAnimationFrame(tick);
  }));
  for(const klass of new Set(classes)){assert(klass in seen.observed,klass+' rendered in actual encounter');assert(seen.observed[klass].length>0,klass+' receives genuine engine actions')}
  fs.mkdirSync('/tmp/cellbound-class-animation',{recursive:true});await page.screenshot({path:'/tmp/cellbound-class-animation/encounter-'+(process.env.CELLBOUND_TEST_ENGINE||'chromium')+'-'+index+'.png'});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page overflow');assert.deepEqual(errors,[]);
  console.log('Actual all-class encounter',classes.join(', '),JSON.stringify(seen));await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
