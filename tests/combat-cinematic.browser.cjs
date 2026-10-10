const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const engine=process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium;
 const browser=await engine.launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1080,height:810}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.setContent('<main><section class="cbcombat-shell" data-combat-theme="ashen"><div class="cbcombat-battle-topbar">Ashen Vault</div><div class="cbcombat-arena-wrap"><div id="cb2dArena" data-bespoke-battlefield="1" class="cb2d-arena theme-ashen boss-room" style="position:relative;width:900px;height:506px"><img class="cb2d-stage-image" src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'/%3E"><div class="cb2d-environment"></div><div id="cb2dUnits" style="position:absolute;inset:0;z-index:72"><div class="cb2d-unit enemy boss" id="fakeboss" style="position:absolute;left:75%;top:50%;width:50px;height:50px"></div></div><div id="cb2dTelegraphs" style="position:absolute;inset:0;z-index:68"></div></div></div><button id="outside">Tactical button</button></section></main>');
  for(const file of ['dungeon-2d-v1.css','combat-cinematic-v1.css'])await page.addStyleTag({content:fs.readFileSync(path.join(root,'dist',file),'utf8')});
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'dist','combat-cinematic-v1.js'),'utf8')});
  await page.evaluate(()=>{
   const arena=document.querySelector('#cb2dArena');
   window.CellboundCinematicAshen.mount(arena,{room:'vaultheart'});
   window.CellboundCinematicAshen.mount(arena,{room:'vaultheart'});
  });
  assert.equal(await page.locator('.cbcin-atmosphere').count(),1,'re-mount must not duplicate layers');
  assert.equal(await page.locator('.cbcin-ember').count(),13,'low-cost ember layer is stable');
  assert.equal(await page.locator('#cb2dArena').getAttribute('data-cinematic'),'ashen-v1');
  assert.equal(await page.locator('.cbcin-atmosphere').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
  const clicked=await page.evaluate(()=>{
   let hit=false;document.querySelector('#outside').addEventListener('click',()=>hit=true);
   document.querySelector('#outside').click();return hit;
  });
  assert(clicked,'existing command button is still operable');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cellbound:combat-visual',{detail:{type:'PHASE_CHANGE',arena:document.querySelector('#cb2dArena'),source:document.querySelector('#fakeboss'),event:{type:'PHASE_CHANGE'}}})));
  assert.equal(await page.locator('.cbcin-omen').count(),1);
  assert.equal(await page.locator('.cbcin-burst.phase').count(),1);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cellbound:combat-visual',{detail:{type:'DAMAGE_DEALT',arena:document.querySelector('#cb2dArena'),target:document.querySelector('#fakeboss'),event:{result:'critical'}}})));
  assert.equal(await page.locator('.cbcin-burst.hit').count(),1);
  await page.evaluate(()=>{
   const arena=document.createElement('div');arena.className='cb2d-arena theme-hollow';arena.id='other-arena';document.body.appendChild(arena);
   window.noOtherCinematic=window.CellboundCinematicAshen.mount(arena,{room:'hollow'});
   window.dispatchEvent(new CustomEvent('cellbound:combat-visual',{detail:{type:'PHASE_CHANGE',arena}}));
  });
  assert.equal(await page.evaluate(()=>window.noOtherCinematic),false,'never alter other dungeon themes');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>window.CellboundCinematicAshen.mount(document.querySelector('#cb2dArena'),{room:'vaultheart'}));
  assert.equal(await page.locator('.cbcin-ember').count(),0,'reduced motion removes particles');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cellbound:combat-visual',{detail:{type:'PHASE_CHANGE',arena:document.querySelector('#cb2dArena')}})));
  assert.equal(await page.locator('.cbcin-burst').count(),0,'reduced motion suppresses transient effects');
  for(const viewport of [{width:744,height:1040},{width:1180,height:820}]){
   await page.setViewportSize(viewport);
   const z=await page.locator('.cbcin-atmosphere').evaluate(el=>Number(getComputedStyle(el).zIndex));
   assert(z<68,'visual overlays must remain behind game telegraphs');
  }
  assert.deepEqual(errors,[],'no browser exceptions');
  console.log('Cinematic Ashen visuals pass mount/event/isolation/controls/reduced-motion/iPad-size browser checks.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
