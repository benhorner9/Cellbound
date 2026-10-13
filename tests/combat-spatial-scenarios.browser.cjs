'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium,webkit}=require('playwright');
const {mount,matureState}=require('./full-playthrough.browser.cjs');
const out='/tmp/cellbound-spatial';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1366,height:1024}}),errors=await mount(page,matureState(),true,{simulateDungeonRuntime:true});
 for(const mode of ['arena','capture-the-flag','king-of-the-hill']){
  await page.evaluate(mode=>{
   window.spatialRoot=document.createElement('div');document.body.appendChild(spatialRoot);
   const size=5,s=CellboundGame.getState(),make=team=>Array.from({length:size},(_,i)=>({...s.roster[i%5],id:team+i,name:team+' '+i,level:20,power:12}));
   const options={pvp:{mode,size,blue:make('blue'),red:make('red')},seed:'spatial-'+mode,maxDurationMs:60000};
   CellboundCombatPortraits.registerCharacters([...options.pvp.blue,...options.pvp.red]);window.spatialPvp=CellboundCombatStandard.createPvpSession(options);CellboundCombatViewer.mount(spatialRoot,{profile:'pvp',mode,partySize:size});
   window.pvpSeen=[];window.spatialTick=()=>{const step=spatialPvp.advance(140);pvpSeen.push(...step.events.map(e=>e.type));CellboundCombatViewer.renderPvpFrame(spatialRoot,spatialPvp.snapshot(),{events:step.events})};spatialTick();window.spatialTimer=setInterval(spatialTick,200);
  },mode);
  await page.waitForTimeout(3000);
  const command=await page.evaluate(()=>spatialPvp.pvpCommand('blue','position','spread'));assert(command.ok);
  await page.waitForTimeout(3000);await page.evaluate(()=>clearInterval(spatialTimer));await page.waitForTimeout(3000);
  const result=await page.evaluate(()=>{const a=spatialRoot.querySelector('[data-pvp-unit-stage]'),r=CellboundCombatSpatial.inspect(a);return{portraits:a.querySelectorAll('.cb-combat-portrait').length,mode:a.dataset.pvpMode,spatial:r,events:[...new Set(pvpSeen)],overflow:document.documentElement.scrollWidth>innerWidth+1}});
  assert(result.spatial.units.length>=10);assert.equal(result.portraits,10,'both full-character squads render');assert(result.events.includes('DAMAGE_DEALT'));assert(result.events.includes('MOVEMENT_START'));assert(!result.overflow);
  for(const u of result.spatial.units)assert(Number.isFinite(u.visual?.x)&&Number.isFinite(u.visual?.y),u.id+' finite position');
  fs.writeFileSync(out+'/'+mode+'-spatial.json',JSON.stringify(result,null,2));await page.screenshot({path:out+'/'+mode+'-spatial.png'});console.log(mode,result.spatial.units.length,'actors; unresolved',result.spatial.unresolved,'checks',result.spatial.checks);
  await page.evaluate(()=>{CellboundCombatFX.combatEvent({type:'COMBAT_END',payload:{}},{arena:spatialRoot.querySelector('[data-pvp-unit-stage]')});CellboundCombatViewer.dismiss(spatialRoot)});
 }
 assert.deepEqual(errors,[]);console.log('Shared PvP renderers, engine events, tactical Spread, resize-independent finite positions and scene teardown passed.');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
