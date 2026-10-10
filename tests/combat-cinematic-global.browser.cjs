/* Job 11B cinematic presentation QA: synthetic DOM tests exercise real
   shared mount integration, palette isolation and all supported arena shapes. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await (process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1180,height:820}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<body style="background:#050a0d"><main id="mounts"></main></body>');
  for(const f of ['dungeon-2d-v1.css','combat-cinematic-v1.css'])await page.addStyleTag({content:fs.readFileSync(path.join(root,'dist',f),'utf8')});
  await page.evaluate(()=>{
   const modes=[
    ['hollow','hs2dArena','cb2d-arena hs2d-arena'],
    ['chaos','cc2dArena','cb2d-arena cc2d-arena'],
    ['blackout','bsArena','cb2d-arena bs-arena'],
    ['fractured','q2dArena','cb2d-arena quest-cb2d-arena'],
    ['manor','cb2dArena','cb2d-arena theme-manor'],
    ['pvp','pvpArena','cb2d-arena cbpvp-stage'],
    ['quest','questArena','cb2d-arena quest-cb2d-arena'],
    ['twelve','tbArena','cb2d-arena'],
    ['world','wbArena','wb2d-arena'],
    ['null','nullArena','cb2d-arena theme-null'],
    ['shared','sharedArena','cb2d-arena theme-shared']
   ];
   for(const [theme,id,classes] of modes){
    const shell=document.createElement('section');shell.className='cbcombat-shell';
    if(theme==='fractured')shell.classList.add('fa-high-noon');
    shell.innerHTML='<div class="cbcombat-battle-topbar"><b>Encounter</b></div><div class="cbcombat-arena-wrap"><div id="'+id+'" class="'+classes+'" data-test-theme="'+theme+'" style="position:relative;width:820px;height:461px"><div class="cb2d-floor"></div><div class="cb2d-environment"></div><div class="cb2d-telegraphs" style="position:absolute;inset:0;z-index:5;pointer-events:none"></div><div class="cb2d-units" style="position:absolute;inset:0;z-index:7"><i class="test-target" style="position:absolute;left:50%;top:50%;width:12px;height:12px"></i></div></div></div><button type="button">Attack</button>';
    document.querySelector('#mounts').appendChild(shell);
   }
   window.CellboundCombatFX={mount:target=>target};
  });
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'dist','combat-cinematic-v1.js'),'utf8')});
  const expected=['hollow','chaos','blackout','fractured','manor','pvp','quest','twelve','world','null','shared'];
  await page.evaluate(()=>{
   for(const arena of document.querySelectorAll('[data-test-theme]')){
    window.CellboundCombatFX.mount(arena);
    window.CellboundCombatFX.mount(arena);
    window.dispatchEvent(new CustomEvent('cellbound:combat-visual',{detail:{arena,type:'COMBAT_START',event:{type:'COMBAT_START'}}}));
    window.dispatchEvent(new CustomEvent('cellbound:combat-visual',{detail:{arena,type:'PHASE_CHANGE',source:arena.querySelector('.test-target'),event:{type:'PHASE_CHANGE'}}}));
   }
  });
  for(const theme of expected){
   const selector='[data-test-theme="'+theme+'"]';
   assert.equal(await page.locator(selector+' > .cbcin-world-stage').count(),1,'one cinematic layer on '+theme);
   assert.equal(await page.locator(selector).getAttribute('data-cinematic-theme'),theme,'correct theme '+theme);
   assert.equal(await page.locator(selector+' .cbcin-world-omen').count(),1,'real phase event reacts on '+theme);
   assert.equal(await page.locator(selector+' .cbcin-world-mote').count(),10,'bounded particle count '+theme);
  }
  const layered=await page.locator('[data-test-theme="hollow"]').evaluate(arena=>{
   const layer=arena.querySelector('.cbcin-world-stage');
   return [getComputedStyle(layer).pointerEvents,Number(getComputedStyle(layer).zIndex),Number(getComputedStyle(arena.querySelector('.cb2d-telegraphs')).zIndex)];
  });
  assert.equal(layered[0],'none','cinematic atmosphere never intercepts touch');
  assert(layered[1]<layered[2],'actual mechanic warnings render above atmosphere');
  await page.evaluate(()=>{
   const arena=document.querySelector('[data-test-theme="pvp"]');
   window.dispatchEvent(new CustomEvent('cellbound:combat-visual',{detail:{arena,type:'INTERRUPT',target:arena.querySelector('.test-target'),event:{result:'success'}}}));
   window.dispatchEvent(new CustomEvent('cellbound:combat-visual',{detail:{arena,type:'DAMAGE_DEALT',target:arena.querySelector('.test-target'),event:{result:'critical'}}}));
  });
  assert.equal(await page.locator('[data-test-theme="pvp"] .cbcin-world-burst.interrupt').count(),1);
  assert.equal(await page.locator('[data-test-theme="pvp"] .cbcin-world-burst.hit').count(),1);
  const buttons=await page.locator('.cbcombat-shell > button').all();assert.equal(buttons.length,11);
  for(const button of buttons)assert(await button.isEnabled(),'combat commands are not disabled');
  await page.evaluate(()=>{
   const arena=document.querySelector('[data-test-theme="shared"]');
   arena.className='cb2d-arena theme-blackout';
   window.CellboundCinematicGlobal.mount(arena);
  });
  assert.equal(await page.locator('[data-test-theme="shared"] > .cbcin-world-stage').count(),1,'room changes must not duplicate visuals');
  assert.equal(await page.locator('[data-test-theme="shared"]').getAttribute('data-cinematic-theme'),'blackout','theme switching is correct');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>window.CellboundCinematicGlobal.mount(document.querySelector('[data-test-theme="quest"]')));
  assert.equal(await page.locator('[data-test-theme="quest"] .cbcin-world-mote').count(),10,'same theme is cached; CSS handles reduced-motion');
  assert.equal(await page.locator('[data-test-theme="quest"] .cbcin-world-mote').first().evaluate(el=>getComputedStyle(el).display),'none','reduced motion hides particles');
  for(const viewport of [{width:744,height:1040},{width:1180,height:820}]){
   await page.setViewportSize(viewport);
   assert.equal(await page.locator('[data-test-theme="pvp"] .cbcin-world-stage').evaluate(el=>getComputedStyle(el).pointerEvents),'none','touch remains unblocked in iPad viewport');
  }
  assert.deepEqual(errors,[],'no browser exceptions');
  console.log('Job 11B global cinematic integration: 11 themes, phase/crit/interrupt, room reuse, layering, accessibility, viewport checks passed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
