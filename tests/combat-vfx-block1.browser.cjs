'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium,webkit}=require('playwright');
const dist=path.resolve(__dirname,'../dist'),engine=process.env.CELLBOUND_TEST_ENGINE||'chromium';
(async()=>{
 const browser=await({chromium,webkit}[engine]).launch({headless:true});
 const page=await browser.newPage({viewport:{width:1366,height:1024}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(/visual skipped|animation recovered/.test(m.text()))errors.push(m.text())});
 try{
  await page.setContent('<body style="margin:0;background:#0c1620;color:white"><div id="stage" class="cb2d-arena" style="position:relative;width:100vw;height:80vh;overflow:hidden"></div></body>');
  for(const f of ['combat-data-v1.js','combat-physical-v4.js'])await page.addScriptTag({path:path.join(dist,f)});
  await page.addStyleTag({path:path.join(dist,'combat-physical-v4.css')});
  await page.addStyleTag({content:'.test-unit{position:absolute;width:48px;height:72px;top:50%;left:45%;background:#29484f;border:1px solid #b7a274}.test-unit.enemy{left:51%;background:#513029}.test-unit b{font:10px sans-serif}.cbl-effects{z-index:2}'});
  await page.clock.install();await page.clock.pauseAt(new Date());
  await page.evaluate(()=>{
   window.stage=document.querySelector('#stage');window.units={};
   for(const [id,klass] of [['p','Warrior'],['e','Enemy']]){const el=document.createElement('div');el.className='cb2d-unit test-unit '+(id==='p'?'party class-warrior':'enemy');el.dataset.unit=id;el.innerHTML='<b>'+klass+'</b>';stage.append(el);units[id]=el}
   window.send=(type,ability='Attack',extra={})=>CellboundCombatFX.combatEvent({type,source:'p',target:'e',ability,payload:{},...extra},{arena:stage,resolve:id=>units[id]});
   send('COMBAT_START');
  });
  let covered=0;
  for(const klass of ['Warrior','Paladin','Hunter','Rogue','Mage']){
   const abilities=await page.evaluate(k=>CellboundCombatData.ABILITIES[k],klass);
   // Re-mount records the existing actor's class, without touching its position.
   await page.evaluate(k=>{const old=stage;stage.remove();stage=old.cloneNode(false);document.body.append(stage);for(const [id,el] of Object.entries(units)){el.className='cb2d-unit test-unit '+(id==='p'?'party class-'+k.toLowerCase():'enemy');el.querySelector('b').textContent=id==='p'?k:'Enemy';stage.append(el)}},klass);
   await page.clock.runFor(20);await page.evaluate(()=>send('COMBAT_START'));
   for(const a of abilities){
    const count=await page.evaluate(a=>{
     send('ABILITY_START',a.name,{abilityId:a.id,payload:{kind:a.kind,range:a.range}});
     if(a.kind==='damage')send('DAMAGE_DEALT',a.name,{abilityId:a.id,amount:30,result:'hit'});
     else if(a.kind.includes('heal'))send('HEAL_RECEIVED',a.name,{abilityId:a.id,amount:30,result:'heal',target:'p'});
     else if(a.kind==='defensive')send('DEFENSIVE_ACTIVATED',a.name,{target:'p'});
     else if(a.kind==='interrupt')send('INTERRUPT',a.name,{result:'success'});
     else send('BUFF_APPLIED',a.name,{target:'p',statusEffects:[{id:a.id,name:a.name,effect:{}}]});
     return stage.querySelectorAll('.cbl-fx').length;
    },a);
    assert(count>0,klass+' '+a.id+' has event feedback');covered++;await page.clock.runFor(1000);
   }
  }
  for(const result of ['miss','dodged','parried','immune','resisted']){
   await page.evaluate(result=>send('DAMAGE_DEALT','Weapon strike',{amount:0,result}),result);
   assert.equal(await page.locator('.ability-impact').count(),0,result+' never produces a successful impact');
   assert.equal(await page.locator('.avoid').count(),1);await page.clock.runFor(600);
  }
  await page.evaluate(()=>send('DAMAGE_DEALT','Shield Slam',{amount:8,result:'blocked'}));assert.equal(await page.locator('.shape-guard').count(),1);await page.clock.runFor(700);
  // All endpoints use actual actor coordinates; destination follows a moving target.
  for(const size of [{width:1366,height:1024},{width:1024,height:1366},{width:390,height:844}]){
   await page.setViewportSize(size);await page.clock.runFor(40);
   await page.evaluate(()=>CellboundCombatFX.launchAction({ability:'Fireball',source:'p',target:'e'},stage,units.p,units.e,{kind:'damage',socket:'off'},400));
   await page.clock.runFor(160);
   const first=await page.locator('.class-projectile').boundingBox();assert(first&&first.x>0&&first.x<size.width);
   await page.evaluate(()=>units.e.style.left='65%');await page.clock.runFor(150);
   const next=await page.locator('.class-projectile').boundingBox();assert(next&&next.x>first.x,'projectile follows its real target: '+JSON.stringify({size,first,next,detail:await page.evaluate(()=>({source:units.p.getBoundingClientRect().toJSON(),target:units.e.getBoundingClientRect().toJSON(),projectile:stage.querySelector('.class-projectile')?.style.cssText,fx:CellboundCombatFX.diagnostics()}))}));
   await page.clock.runFor(300);assert.equal(await page.locator('.class-projectile').count(),0);
  }
  await page.evaluate(()=>{for(let i=0;i<80;i++)send('DAMAGE_DEALT','Fireball',{amount:30,result:'critical'});send('MECHANIC_TELEGRAPH','Thrown Plate Barrage',{source:'e',target:'p',payload:{token:'boss-test',duration:1000,mechanicType:'circle',targetIds:['p']}})});
  assert((await page.evaluate(()=>CellboundCombatFX.diagnostics())).effects<=36,'bounded simultaneous effects');
  assert.equal(await page.locator('.cbl-mechanic-callout').count(),1,'warnings survive saturated cosmetics');
  await page.clock.runFor(750);assert.equal(await page.locator('.cbl-mechanic-callout').getAttribute('data-phase'),'imminent');
  await page.evaluate(()=>send('MECHANIC_RESOLVE','Thrown Plate Barrage',{result:'avoided',payload:{token:'boss-test'}}));await page.clock.runFor(600);
  assert.equal(await page.locator('.cbl-mechanic-callout').count(),0);
  for(const [id,cls] of [['dungeon','cb2d-arena'],['raid','cb2d-arena theme-manor'],['quest','quest-cb2d-arena'],['world','wb2d-arena'],['arena','cb2d-arena cbpvp-stage'],['ctf','pvp2d-arena'],['koth','pvp2d-arena'],['tutorial','cb2d-arena']]){
   await page.evaluate(({id,cls})=>{stage.className=cls;stage.dataset.testMode=id;send('DAMAGE_DEALT','Fireball',{amount:20,result:'hit'})},{id,cls});
   assert.equal(await page.locator('.ability-impact.school-fire').count(),1,id+' uses the same effect owner');await page.clock.runFor(700);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>send('HEAL_RECEIVED','Holy Light',{target:'p',amount:20,result:'heal'}));
  assert(await page.locator('.ability-impact.still').isVisible(),'reduced motion retains static feedback');await page.clock.runFor(1000);
  assert.equal((await page.evaluate(()=>CellboundCombatFX.diagnostics())).effects,0,'all effects expire on presentation clock');
  await page.evaluate(()=>stage.remove());await page.clock.runFor(50);
  assert.equal((await page.evaluate(()=>CellboundCombatFX.diagnostics())).scenes,0,'scene teardown frees all effects');
  assert.deepEqual(errors,[]);console.log(engine+': '+covered+' beta abilities, avoidance, block, moving projectiles, responsive coordinates, warning priority, reduced motion and teardown passed.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
