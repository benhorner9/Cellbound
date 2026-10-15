'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),dist=process.env.CELLBOUND_CLASS_BEFORE||path.join(root,'dist'),before=!!process.env.CELLBOUND_CLASS_BEFORE;
const dir='/tmp/cellbound-class-animation',engine=process.env.CELLBOUND_TEST_ENGINE==='webkit'?'webkit':'chromium';fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await({chromium,webkit}[engine]).launch({headless:true});
 const page=await browser.newPage({viewport:{width:1100,height:700}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(/animation recovered|visual skipped/.test(m.text()))errors.push(m.text())});
 try{
  await page.setContent('<base href="https://cellbound.test/"><body style="margin:0;background:#091419;color:#dccdb4;font-family:Georgia"><h2 id="label" style="padding:15px">Cellbound class animation QA</h2><div class="cbcombat-shell" data-combat-profile="pve"><div id="stage" class="cb2d-arena cbl-scene" style="width:900px;height:460px;margin:auto;position:relative;overflow:hidden;background:radial-gradient(ellipse at center,#293330,#0a141b)"></div></div></body>');
  await page.route('https://cellbound.test/**',route=>{const f=path.resolve(dist,new URL(route.request().url()).pathname.slice(1));return f.startsWith(dist+path.sep)&&fs.existsSync(f)?route.fulfill({path:f}):route.fulfill({status:404,body:''})});
  for(const file of ['character-portraits-v1.css','combat-portraits-v1.css','combat-physical-v4.css'])await page.addStyleTag({path:path.join(dist,file)});
  for(const file of ['gear-data.js','item-atlas-v2.js','item-visuals-v2.js','character-rig-v1.js','character-portraits-v1.js','combat-data-v1.js','combat-reborn-v1.js',...(!before?['combat-animation-catalog-v1.js']:[]),'combat-animation-v1.js','combat-physical-v4.js'])await page.addScriptTag({path:path.join(dist,file)});
  await page.addStyleTag({content:'.qa-unit{position:absolute;width:180px;height:310px;top:65px}.qa-unit .cb-combat-portrait{position:static!important;width:180px!important;height:310px!important;transform:none!important}.qa-unit .cb-paper-doll,.qa-unit .cb-paper-doll svg{width:180px!important;height:310px!important}.qa-unit .cbl-ground{display:none}.qa-unit::after{content:attr(data-name);position:absolute;top:315px;left:10px;white-space:nowrap;font:14px Georgia}.cbl-fx-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden}'});
  await page.evaluate(()=>{
   window.arena=document.querySelector('#stage');window.units={};
   window.mountClass=(klass,i=0)=>{
    CellboundCombatAnimation.dispose(arena);arena.innerHTML='';units={};
    const equip={};for(const slot of ['Weapon','OffHand','Head','Chest','Shoulders','Hands','Legs','Feet','Waist'])equip[slot]=CellboundGear.items.find(x=>x.class===klass&&x.tier===1&&x.slot===slot);
    window.subject={id:'qa',name:klass,class:klass,race:CellboundCharacterRig.races[i%6],appearance:{gender:i%2,frame:i%3},equipment:equip};
    for(const [id,mirror,left] of [['p-qa',false,180],['e-0',true,570]]){const el=document.createElement('div');el.className='cb2d-unit qa-unit class-'+klass.toLowerCase().replace(/ /g,'-');el.dataset.unit=id;el.dataset.name=id==='p-qa'?klass:'Mirrored opponent';el.style.left=left+'px';el.innerHTML='<span class="cb-combat-portrait">'+CellboundPortraits.paperDollHTML({...subject,id},{size:'combat',mirrored:mirror})+'</span>';arena.append(el);units[id]=el}
    CellboundCombatFX.combatEvent({type:'COMBAT_START',payload:{}},{arena,speed:4,resolve:id=>units[id]});
   };
   window.send=(type,a,extra={})=>{const event={type,source:'p-qa',target:/heal|defensive|buff/.test(a.kind)?'p-qa':'e-0',ability:a.name,abilityId:a.id,payload:{kind:a.kind,range:a.range,castTime:a.cast||0},...extra};CellboundCombatFX.combatEvent(event,{arena,speed:4,resolve:id=>units[id]});return event};
  });
  await page.clock.install();await page.clock.pauseAt(new Date());
  const catalogue=process.env.CELLBOUND_CLASS_EDGE_ONLY?[]:await page.evaluate(()=>Object.entries(CellboundCombatData.ABILITIES).map(([klass,abilities])=>({klass,abilities})));
  let checked=0;const evidence=[],skillCoverage=[];
  for(const [i,{klass,abilities}] of catalogue.entries()){
   await page.evaluate(({klass,i})=>mountClass(klass,i),{klass,i});
   const primary=abilities.find(a=>a.kind==='damage')||abilities[0],signature=abilities.find(a=>a.id===({'Warrior':'sweeping-strike','Paladin':'holy-light','Hunter':'multi-shot','Rogue':'killing-spree','Mage':'frostbolt','Priest':'divine-hymn','Druid':'starfall','Shaman':'windfury-totem','Warlock':'call-dreadstalkers','Monk':'windwalker-rising-sun-kick','Death Knight':'army-of-the-dead','Demon Hunter':'blade-dance','Evoker':'fire-breath'}[klass]))||abilities[2];
   const visualAbilities=before?[primary,signature]:abilities;
   for(const a of visualAbilities){
    const idlePose=await page.evaluate(()=>units['p-qa'].querySelector('.cb-paper-upper-right')?.getAttribute('transform')+'|'+units['p-qa'].querySelector('.cb-paper-forearm-left')?.getAttribute('transform')+'|'+units['p-qa'].querySelector('.cb-paper-kick-R')?.getAttribute('transform'));
    await page.evaluate(()=>{window.skillEffects=[];window.skillObserver?.disconnect();window.skillObserver=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1&&n.classList.contains('cbl-fx'))skillEffects.push({classes:n.className,source:n.dataset.source,target:n.dataset.target,ability:n.dataset.abilityId,paint:getComputedStyle(n,':after').clipPath,animation:getComputedStyle(n,':after').animationName})});skillObserver.observe(arena,{childList:true,subtree:true})});
    await page.evaluate(a=>{send('COMBAT_START',a);send('ABILITY_START',a);if(a.cast)send('CAST_START',a,{payload:{duration:a.cast}})},a);
    await page.clock.runFor(a.cast?Math.min(a.cast*.6,500)/4:70);
    if(!before){
     const result=await page.evaluate(()=>{const el=units['p-qa'],svg=el.querySelector('svg');return{clip:el.dataset.animationClip,state:el.dataset.animationState,arm:svg.querySelector('.cb-paper-upper-right')?.getAttribute('transform'),className:svg.dataset.animationClass,gap:(()=>{const w=svg.querySelector('.cb-paper-slot-weapon'),h=svg.querySelector('.cb-paper-glove-right');if(!w||!h)return 0;const a=new DOMPoint(+w.dataset.gripLocalX,+w.dataset.gripLocalY).matrixTransform(w.getScreenCTM()),b=new DOMPoint(+h.getAttribute('cx'),+h.getAttribute('cy')).matrixTransform(h.getScreenCTM());return Math.hypot(a.x-b.x,a.y-b.y)})()}});
     assert(result.clip&&result.state!=='idle',klass+' '+a.id+' must perform an action');
     const actual=await page.evaluate(({klass,a})=>{const p=CellboundCombatAnimationCatalog.resolve(klass,{abilityId:a.id});return{authored:p.authored,clip:p.clip,motif:p.motif,pose:units['p-qa'].querySelector('.cb-paper-upper-right')?.getAttribute('transform')+'|'+units['p-qa'].querySelector('.cb-paper-forearm-left')?.getAttribute('transform')+'|'+units['p-qa'].querySelector('.cb-paper-kick-R')?.getAttribute('transform')}},{klass,a});
     assert(actual.authored);assert.equal(result.clip,actual.clip);assert.notEqual(actual.pose,idlePose,klass+' '+a.id+' must move actual rig joints');assert.equal(result.className,klass);assert(result.gap<.15,klass+' '+a.id+' painted grip '+result.gap);checked++;
    }
    if(a.id===primary.id||a.id===signature.id){
     await page.locator('#label').evaluate((el,text)=>el.textContent=text,klass+' · '+a.name+' · '+(before?'BEFORE':'AFTER'));
     const slug=klass.toLowerCase().replace(/ /g,'-')+'-'+a.id;
     await page.screenshot({path:dir+'/'+(before?'before':'after')+'-'+engine+'-'+slug+'.png'});evidence.push({class:klass,ability:a.id});
    }
    if(!before){
     if(a.cast)await page.clock.runFor(Math.max(0,a.cast-500)/4);
     await page.evaluate(a=>send('ABILITY_FINISH',a,{result:'resolved'}),a);
     if(/damage|heal/.test(a.kind))await page.evaluate(a=>send(a.kind==='damage'?'DAMAGE_DEALT':'HEAL_RECEIVED',a,{amount:23,result:a.kind==='damage'?'hit':'heal'}),a);
     else if(a.kind==='interrupt')await page.evaluate(a=>send('INTERRUPT',a,{result:'success'}),a);
     else await page.evaluate(a=>send(a.kind==='defensive'?'DEFENSIVE_ACTIVATED':a.kind==='taunt'?'AGGRO_CHANGED':a.kind==='battle-rez'?'PLAYER_REVIVED':a.kind==='pet-command'?'PET_COMMAND':a.kind==='summon'?'PET_SUMMONED':a.kind==='totem'?'TOTEM_PLACED':'BUFF_APPLIED',a,{result:'success',target:/defensive|totem|summon/.test(a.kind)?'p-qa':'e-0'}),a);
     await page.clock.runFor(120);
     if(a.id===primary.id||a.id===signature.id)await page.screenshot({path:dir+'/action-'+engine+'-'+klass.toLowerCase().replace(/ /g,'-')+'-'+a.id+'.png'});
     await page.clock.runFor(500);
     const state=await page.locator('[data-unit="p-qa"]').getAttribute('data-animation-state');assert.equal(state,'idle',klass+' '+a.id+' must recover');
     const rendered=await page.evaluate(({klass,a})=>({fx:skillEffects.filter(f=>f.classes.includes('ability-impact')),profile:CellboundCombatAnimationCatalog.resolve(klass,{abilityId:a.id})}),{klass,a});
     assert(rendered.fx.some(f=>f.classes.includes('skill-'+rendered.profile.motif)&&f.source==='p-qa'&&f.target),klass+' '+a.id+' missing owned skill impact '+JSON.stringify(rendered.fx));
     skillCoverage.push({class:klass,spec:a.spec||'All',id:a.id,animated:true,signature:true,tested:true,failed:false});
    }else await page.clock.runFor(700);
   }
   if(!before){
    const buffs=await page.evaluate(klass=>Object.entries(CellboundCombatData.CLASS_BUFFS).filter(([k])=>k===klass||k.startsWith(klass+'|')).map(([,b])=>({...b,kind:'buff'})),klass);
    for(const buff of buffs){await page.evaluate(a=>send('ABILITY_START',a),buff);await page.clock.runFor(60);assert.notEqual(await page.locator('[data-unit="p-qa"]').getAttribute('data-animation-state'),'idle');await page.clock.runFor(500)}
    await page.evaluate(a=>{subject.equipment.Weapon=CellboundGear.items.find(x=>x.class===subject.class&&x.tier===5&&x.slot==='Weapon');units['p-qa'].innerHTML='<span class="cb-combat-portrait">'+CellboundPortraits.paperDollHTML(subject,{size:'combat'})+'</span>';send('ABILITY_START',{...a,cast:0})},primary);await page.clock.runFor(80);assert.notEqual(await page.locator('[data-unit="p-qa"]').getAttribute('data-animation-state'),'idle');await page.clock.runFor(600);
    for(const type of ['DAMAGE_DEALT','HEAL_RECEIVED','ENEMY_DEFEATED','ENEMY_REVIVED']){await page.evaluate(type=>send(type,{name:'QA reaction',kind:'damage'},{target:'p-qa',source:'e-0',amount:10,result:'hit'}),type);await page.clock.runFor(500)}
    assert.equal(await page.locator('[data-unit="p-qa"]').getAttribute('data-animation-state'),'idle');
   }
  }
  if(!before){
   await page.evaluate(()=>{mountClass('Mage',0);send('CAST_START',{id:'fireball',name:'Fireball',kind:'damage'},{payload:{duration:2000}})});await page.clock.runFor(50);
   await page.evaluate(()=>send('DAMAGE_DEALT',{name:'Enemy strike',kind:'damage'},{source:'e-0',target:'p-qa',amount:10,result:'hit'}));await page.clock.runFor(140);
   assert.equal(await page.locator('[data-unit="p-qa"]').getAttribute('data-animation-state'),'skill:Mage:fireball','damage recoil resumes a still-authoritative cast');
   await page.evaluate(()=>send('INTERRUPT',{name:'Counterspell',kind:'interrupt'},{source:'e-0',target:'p-qa',result:'success'}));await page.clock.runFor(300);
   await page.evaluate(()=>send('CAST_FINISH',{name:'Fireball',kind:'damage'}));assert.equal(await page.locator('[data-unit="p-qa"]').getAttribute('data-animation-state'),'idle','cancelled cast cannot restart on stale finish');
   for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1366,height:1024},{width:1024,height:1366}]){
    await page.setViewportSize(viewport);await page.evaluate(()=>{arena.style.width='min(900px,100vw)';arena.style.height='300px';Object.values(units).forEach((el,i)=>{el.style.left=(i?65:10)+'%';el.style.scale='.45';el.style.transformOrigin='top left'})});
    await page.evaluate(()=>send('ABILITY_START',{id:'living-flame',name:'Living Flame',kind:'damage'}));await page.clock.runFor(200);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'animation must not introduce horizontal scrolling');
    await page.screenshot({path:dir+'/viewport-'+engine+'-'+viewport.width+'.png'});
   }
   await page.evaluate(()=>{mountClass('Mage',0);const a={name:'Fireball',id:'fireball',kind:'damage'};send('ABILITY_START',a);const hit=send('DAMAGE_DEALT',a,{amount:25,result:'hit'});window.finalHit=false;CellboundCombatFX.presentImpact(hit,()=>window.finalHit=true);send('ENEMY_DEFEATED',a);send('COMBAT_END',a)});await page.clock.runFor(600);
   assert.equal(await page.evaluate(()=>finalHit),true,'combat ending preserves the last projectile impact');
   await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>send('ABILITY_START',{name:'Living Flame',kind:'damage'}));await page.clock.runFor(500);
   await page.evaluate(()=>arena.remove());await page.clock.runFor(160);assert.deepEqual(await page.evaluate(()=>CellboundCombatAnimation.diagnostics()),{scenes:0,pending:0,actors:0});
  }
  await page.clock.resume();assert.deepEqual(errors,[]);if(!process.env.CELLBOUND_CLASS_EDGE_ONLY)fs.writeFileSync(dir+'/'+(before?'before':'after')+'-'+engine+'-coverage.json',JSON.stringify({checked,evidence,skillCoverage},null,2));
  console.log(`${engine}: ${checked} active abilities across all 13 classes rendered, preparation/release/recovery and per-class death/revival; ${evidence.length} primary/signature captures.`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
