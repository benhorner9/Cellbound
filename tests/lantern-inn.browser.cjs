const {chromium,webkit}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
(async()=>{
 const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true});
 const page=await browser.newPage({viewport:{width:1366,height:1024}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.bringToFront();
 const html=read('dist/guild.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 await page.route('https://cellbound.test/**',async route=>{const p=new URL(route.request().url()).pathname;if(p==='/guild.html')return route.fulfill({body:html,contentType:'text/html'});const f=path.resolve(root,'dist',p.slice(1));if(!f.startsWith(path.join(root,'dist')+path.sep)||!fs.existsSync(f))return route.fulfill({status:404,body:''});return route.fulfill({path:f})});
 await page.goto('https://cellbound.test/guild.html');
 await page.evaluate(()=>{
  const races=['Veyren','Stoneborn','Aelari','Thornkin','Emberkin','Nymari'];
  const roster=Array.from({length:10},(_,i)=>({id:'hero-'+i,name:['Aegis','Mercy','Shade','Ember','Fletch','Rowan','Kestrel','Garrick','Wren','Lyra'][i],race:races[i%races.length],appearance:{race:races[i%races.length],skinTone:i%6,face:i%4,hair:i%6,hairColor:i%8,facialHair:i%4,marking:i%5,eyes:i%6,feature:i%4},class:['Warrior','Priest','Rogue','Mage','Hunter','Druid','Paladin','Warrior','Hunter','Priest'][i],spec:['Protection','Holy','Assassination','Fire','Marksmanship','Restoration','Protection','Arms','Marksmanship','Holy'][i],level:15,power:180,talent:4,equipment:{},professions:[],cellShock:i===9?100:0,role:i===0?'tank':i===1?'healer':'dps'}));
  window.fixture={roster,party:{tank:'hero-0',healer:'hero-1',dps:['hero-2','hero-3','hero-4']},bank:[],activity:[]};window.partyIds=roster.slice(0,5).map(c=>c.id);
  localStorage.setItem('cellbound-management-reboot-v3',JSON.stringify(fixture));
  window.selectView=id=>{document.querySelectorAll('.view').forEach(n=>n.classList.toggle('active',n.id===id));document.querySelector('#pageTitle').textContent=id==='roster'?'The Lantern Inn':id;dispatchEvent(new CustomEvent('cellbound:view-changed',{detail:{view:id}}))};
  window.CellboundGame={ready:true,getState:()=>fixture,getPartyCharacters:()=>partyIds.map(id=>roster.find(c=>c.id===id)),switchView:selectView,characterItemLevel:()=>24,isUnavailable:c=>c.cellShock>=100,isCharacterRosterUnlocked:()=>true,renderAll:()=>{window.fixtureRenderParty?.();dispatchEvent(new CustomEvent('cellbound:state-rendered'))}};
  document.querySelector('#rosterActiveSummary').textContent='10 / 10';document.querySelector('#rosterMetricActive').textContent='5 / 5';document.querySelector('#rosterRecoverySummary').textContent='Company assembled';
  selectView('roster');
 });
 for(const f of ['gear-data.js','character-portraits-v1.js','character-sheet.js'])await page.addScriptTag({content:read(f)});
 await page.evaluate(()=>{fixture.roster.forEach(c=>{c.equipment=Object.fromEntries(CellboundGear.starterSet(c.class).filter(Boolean).map(item=>[item.slot,item]))});localStorage.setItem('cellbound-management-reboot-v3',JSON.stringify(fixture))});
 const guild=read('guild-v4.js');const source={card:guild.slice(guild.indexOf('function rosterCard('),guild.indexOf('function recruitSlotCard(')),slot:guild.slice(guild.indexOf('function slotHtml('),guild.indexOf('function partyReadiness(')),party:guild.slice(guild.indexOf('function renderParty('),guild.indexOf("$('#autoFill')?."))};
 await page.evaluate(source=>{
  const state=fixture,$=s=>document.querySelector(s),ui={partySlots:$('#partySlots'),partyRoster:$('#partyRoster'),readinessFill:$('#readinessFill'),readinessText:$('#readinessText'),readinessLabel:$('#readinessLabel'),readinessHint:$('#readinessHint')};
  const roleOf=c=>c.role,isRosterSlotUnlocked=()=>true,isUnavailable=c=>c.cellShock>=100,characterItemLevel=()=>24,combatClassKey=c=>c.class.toLowerCase(),flatPartyIds=()=>partyIds,partySlotIds=()=>Array.from({length:5},(_,i)=>partyIds[i]||null),charById=id=>state.roster.find(c=>c.id===id),classDef=()=>({glow:'#c5a878',icon:'◇'}),roleLabel=r=>r,portraitHTML=(c,size)=>CellboundPortraits.portraitHTML(c,{size}),formatRemaining=()=> '30m',partyReadiness=()=>({score:partyIds.length*20,ready:partyIds.length===5,hint:'Fixture party'}),save=()=>{},removeChar=id=>{window.partyIds=partyIds.filter(x=>x!==id)},assignChar=id=>{window.partyIds.push(id);renderAll()},renderAll=()=>CellboundGame.renderAll();
  const rosterCard=eval('('+source.card+')'),slotHtml=eval('('+source.slot+')');window.fixtureRenderParty=eval('('+source.party+')');fixtureRenderParty();$('#rosterGrid').innerHTML=state.roster.map(rosterCard).join('');
  $('#rosterSearch').addEventListener('input',e=>{[...$('#rosterGrid').children].forEach((n,i)=>n.style.display=state.roster[i].name.toLowerCase().includes(e.target.value.toLowerCase())?'':'none')});
 },source);
 for(const f of ['living-world-v1.js','lantern-inn-v1.js'])await page.addScriptTag({content:read(f)});
 const shot=async name=>{await page.waitForTimeout(200);await page.screenshot({path:'/tmp/cellbound-inn-'+name+'.png'})};
 await page.locator('.inn-scene-bg').evaluate(img=>img.decode());await page.locator('.inn-object-art').evaluateAll(async imgs=>{await Promise.all(imgs.map(img=>img.decode()))});
 assert.equal(await page.locator('.inn-adventurer').count(),10);assert.equal(await page.locator('.inn-traveller').count(),5);assert.equal(await page.locator('#rosterGrid').isVisible(),false);assert.equal(await page.locator('.inn-world').isVisible(),true);
 assert.equal(await page.locator('.inn-scene-bg').count(),1);assert.equal(await page.locator('.inn-object-art').count(),3);assert.equal(await page.locator('.inn-object-glow').count(),3);assert.equal(await page.locator('[data-inn-object="party"]').count(),1);assert.equal(await page.locator('[data-inn-object="roster"]').count(),1);assert.equal(await page.locator('[data-inn-object="door"]').count(),1);
 assert.equal(await page.locator('.inn-illustrated-model').count(),10,'all playable races use the unified illustrated actor stage');
 assert.equal(await page.locator('.cb-world-avatar-illustrated').count(),10,'every class gets a full illustrated world model');
 const illustratedGeometry=await page.locator('.inn-illustrated-model').evaluateAll(nodes=>{
   const world=document.querySelector('.inn-world').getBoundingClientRect();
   return nodes.map(n=>{
     const model=n.querySelector('.cb-world-avatar-illustrated'),svg=n.querySelector('.cb-illustrated-character-svg'),figure=n.querySelector('.inn-figure'),r=model.getBoundingClientRect();
     const style=getComputedStyle(figure);
     return {slot:n.dataset.locationSlot,slotY:parseFloat(n.style.getPropertyValue('--slot-y'))||0,top:r.top-world.top,bottom:r.bottom-world.top,height:r.height,scale:parseFloat(style.scale)||1,race:svg?.dataset.race,klass:svg?.dataset.class,overflow:style.overflow,hasImage:Boolean(n.querySelector('img'))};
   });
 });
 assert(illustratedGeometry.every(x=>x.overflow==='visible'),'actor stage must never clip the live illustrated model');
 assert(illustratedGeometry.every(x=>!x.hasImage),'playable full bodies must not fall back to static painted images');
 assert.equal(new Set(illustratedGeometry.map(x=>x.race)).size,6,'all six races render through the same live model');
 const innWorldBox=await page.locator('.inn-world').boundingBox();
 assert(illustratedGeometry.every(x=>x.top>=-0.5&&x.bottom<=innWorldBox.height+.5),'illustrated bodies stay inside the room bounds');
 const actorHeights=illustratedGeometry.map(x=>x.height);
 assert(Math.min(...actorHeights)>=165,'back-room actors are large enough to read as people');
 assert(Math.max(...actorHeights)<=220,'foreground actors remain proportional to the room');
 assert(Math.max(...actorHeights)/Math.min(...actorHeights)<1.3,'perspective sizing stays controlled');
 const depthRows=illustratedGeometry.map(x=>({y:x.slotY,scale:x.scale})).sort((a,b)=>a.y-b.y);
 for(let i=1;i<depthRows.length;i++)assert(depthRows[i].scale+.001>=depthRows[i-1].scale,'foreground actor perspective scale must not be smaller than deeper actors');
 const layerContract=await page.evaluate(()=>{
   const zi=sel=>Number(getComputedStyle(document.querySelector(sel)).zIndex);
   return {
     table:zi('.inn-object-table'),bar:zi('.inn-object-bar'),door:zi('.inn-object-door'),
     behindTable:[...document.querySelectorAll('.inn-zone-behind-table')].map(n=>Number(getComputedStyle(n).zIndex)),
     behindBar:[...document.querySelectorAll('.inn-zone-behind-bar')].map(n=>Number(getComputedStyle(n).zIndex))
   };
 });
 assert.equal(layerContract.table,74);assert.equal(layerContract.bar,46);assert.equal(layerContract.door,24);
 assert(layerContract.behindTable.length>=1&&layerContract.behindTable.every(z=>z<layerContract.table),'table must occlude dedicated behind-table actors');
 assert(layerContract.behindBar.length>=1&&layerContract.behindBar.every(z=>z<layerContract.bar),'bar must occlude dedicated behind-bar actors');
 assert.equal(await page.locator('.cb-world-avatar[data-avatar-class]').count(),10,'all launch classes use the same world renderer');
 const warriorAvatar=page.locator('[data-inn-character="hero-0"] .cb-world-avatar');
 assert.equal(await warriorAvatar.getAttribute('data-avatar-tier'),'1');assert.equal(await warriorAvatar.getAttribute('data-avatar-weapon'),'sword');
 const appearanceBefore=await warriorAvatar.getAttribute('data-appearance-key');
 await page.evaluate(()=>{fixture.roster[0].appearance={race:'Veyren',skinTone:5,face:3,hair:5,hairColor:6,facialHair:3,marking:4,eyes:2,feature:1};dispatchEvent(new CustomEvent('cellbound:state-rendered'))});
 const warriorAfterAppearance=page.locator('[data-inn-character="hero-0"] .cb-world-avatar');
 assert.notEqual(await warriorAfterAppearance.getAttribute('data-appearance-key'),appearanceBefore,'appearance data changes the live world model');
 const modelBeforeGear=await warriorAfterAppearance.getAttribute('data-model-signature');
 await page.evaluate(()=>{const c=fixture.roster[0];for(const slot of ['Head','Chest','Weapon']){const item=CellboundGear.items.find(x=>x.class==='Warrior'&&x.tier===4&&x.slot===slot);if(item)c.equipment[slot]=item}dispatchEvent(new CustomEvent('cellbound:state-rendered'))});
 const warriorAfterGear=page.locator('[data-inn-character="hero-0"] .cb-world-avatar');
 assert.equal(await warriorAfterGear.getAttribute('data-avatar-tier'),'4','equipped tier changes the live model');
 assert.equal(await warriorAfterGear.getAttribute('data-avatar-weapon'),'greatsword','equipped weapon type remains visible');
 assert.notEqual(await warriorAfterGear.getAttribute('data-model-signature'),modelBeforeGear,'equipping gear changes the rendered character identity');

 assert.equal(await page.locator('.inn-adventurer').evaluateAll(nodes=>new Set(nodes.map(n=>n.dataset.locationSlot)).size),10);
 await shot('01-default-ipad');
 await page.locator('[data-inn-character="hero-0"]').click();await page.waitForSelector('#characterModal:not([hidden])');assert(await page.locator('body').evaluate(n=>n.classList.contains('inn-character-open')));await shot('02-character');
 await page.keyboard.press('Escape');await page.waitForSelector('#characterModal[hidden]',{state:'attached'});assert.equal(await page.evaluate(()=>document.activeElement.dataset.innCharacter),'hero-0');
 await page.locator('[data-inn-object="roster"] .inn-object-hit').click();assert.equal(await page.locator('#innLedger[open]').count(),0,'first tap selects the bar only');assert(await page.locator('[data-inn-selection]').isVisible());await page.locator('[data-confirm-inn-object="roster"]').click();await page.waitForSelector('#innLedger[open]');const rosterDialogBox=await page.locator('#innLedger').boundingBox();assert(Math.abs((rosterDialogBox.x+rosterDialogBox.width/2)-1366/2)<4,'roster modal is centered');await page.locator('#rosterSearch').fill('Mercy');assert.equal(await page.locator('#rosterGrid .roster-character-card:visible').count(),1);assert((await page.locator('#rosterStatusFilter').boundingBox()).height>=44);await shot('03-ledger');await page.locator('#innLedger [data-inn-close]').click();
 await page.locator('[data-inn-object="roster"] .inn-object-hit').click();await page.locator('[data-confirm-inn-object="roster"]').click();await page.waitForSelector('#innLedger[open]');assert.equal(await page.locator('#rosterSearch').inputValue(),'Mercy');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#innLedger')?.open);
 const parent=await page.locator('#party').evaluate(n=>n.parentElement.className);
 await page.locator('[data-inn-object="party"] .inn-object-hit').click();assert.equal(await page.locator('#innParty[open]').count(),0,'first tap selects the Party Table only');await page.locator('[data-confirm-inn-object="party"]').click();await page.waitForSelector('#innParty[open]');const partyDialogBox=await page.locator('#innParty').boundingBox();assert(Math.abs((partyDialogBox.x+partyDialogBox.width/2)-1366/2)<4,'party modal is centered');assert.equal(await page.locator('#innParty #partySlots').count(),1);await shot('04-party');
 await page.locator('#innParty [data-remove="hero-4"]').click();assert.equal(await page.locator('.inn-traveller').count(),4);assert.equal(await page.locator('.inn-adventurer').evaluateAll(nodes=>new Set(nodes.map(n=>n.dataset.locationSlot)).size),10);await page.locator('#innParty [data-pick="hero-5"]').click();assert.equal(await page.locator('[data-inn-character="hero-5"]').evaluate(n=>n.classList.contains('inn-traveller')),true);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#party').evaluate(n=>n.parentElement.className),parent);
 await page.setViewportSize({width:1024,height:768});await shot('05-ipad-landscape');
 await page.setViewportSize({width:390,height:844});await page.locator('.inn-scene-bg').evaluate(img=>img.decode());assert((await page.locator('.inn-scene-stage').boundingBox()).width<=390.5,'layered stage fits the mobile viewport');
 await shot('06-mobile');
 for(const n of await page.locator('.inn-adventurer').all()){const b=await n.boundingBox();assert(b.width>=44&&b.height>=44,'character touch target');assert(b.x>=-1&&b.x+b.width<=391,'character within viewport')}
 for(const n of await page.locator('.inn-object-hit').all()){const b=await n.boundingBox();assert(b.width>=44&&b.height>=44,'prop touch target');const cx=b.x+b.width/2,cy=b.y+b.height/2;assert(cx>=0&&cx<=390&&cy>=0&&cy<=844,'prop interaction centre within viewport')}
 assert(await page.locator('.inn-adventurer').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();const points=[[.5,.18],[.5,.3],[.32,.3],[.68,.3],[.5,.44]];return points.some(([px,py])=>document.elementFromPoint(r.x+r.width*px,r.y+r.height*py)?.closest('[data-inn-character]')===n)})),'all phone characters have a visible upper-body selection point even when furniture occludes their lower body');
 await page.locator('[data-inn-character="hero-1"]').click();await page.waitForSelector('#characterModal:not([hidden])');await shot('07-mobile-character');assert((await page.locator('#characterModal .character-modal').boundingBox()).y>180,'room remains visible above bottom sheet');await page.keyboard.press('Escape');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.inn-figure').first().evaluate(n=>getComputedStyle(n).animationName),'none');
 await page.evaluate(()=>{for(let i=0;i<5;i++)CellboundInn.refresh()});assert.equal(await page.locator('.inn-world').count(),1);assert.equal(await page.locator('#innLedger #rosterSearch').count(),1);
 await page.evaluate(()=>{CellboundGame.switchView=view=>{window.innExitView=view}});await page.locator('[data-inn-object="door"] .inn-object-hit').click();assert.equal(await page.evaluate(()=>window.innExitView),undefined,'first door tap only selects it');await page.locator('[data-confirm-inn-object="door"]').click();assert.equal(await page.evaluate(()=>window.innExitView),'overview','confirmed door returns to the Town Square');assert.deepEqual(errors,[]);await browser.close();console.log('Lantern Inn: 10 spatial characters, actual character sheet, ledger search persistence, existing party handlers, focus return, iPad/mobile composition and reduced motion passed.');
})().catch(e=>{console.error(e);process.exit(1)});
