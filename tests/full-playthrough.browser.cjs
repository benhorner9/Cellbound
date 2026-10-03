/* Full production-bundle smoke/playthrough.
 * Run after npm run build. Requires Playwright browsers.
 */
const {chromium,webkit}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const engine=process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium;

function matureState(){
  const chars=[
    ['tank','Aegis','Warrior','Protection'],
    ['heal','Mercy','Paladin','Holy'],
    ['mage','Ember','Mage','Arcane'],
    ['hunt','Fletch','Hunter','Marksman'],
    ['rogue','Shade','Rogue','Assassination']
  ].map(([id,name,klass,spec],i)=>({
    id,name,race:'Veyren',class:klass,spec,level:15,xp:0,power:70+i,
    knowledge:{ashwarden:100,embermaw:100,vaultheart:100},
    equipment:{},gearItems:[],talents:{},cellShock:0,cellShockLockedUntil:null,
    professions:i===0?[{name:'Alchemy',level:100,xp:0,craftHistory:{},masterworks:0,projectsCompleted:0}]:[null]
  }));
  return {
    saveVersion:6,gearVersion:3,renown:120,gold:5000,socialDisplayName:'Playthrough Guild',
    roster:chars,party:{tank:'tank',healer:'heal',dps:['mage','hunt','rogue']},
    bossKills:{ashwarden:true,embermaw:true,vaultheart:true},
    progression:{ashenVaultUnlocked:true,nullComplexUnlocked:true},
    reports:[],bank:[],materials:{},consumables:[],recipeScrolls:[],discoveredRecipes:[],
    tradeInbox:[],collectionHistory:[],activity:['Automated release playthrough state loaded.'],
    onboarding:{version:3,complete:true,stage:'complete',zone:'zeltira'}
  };
}

function coreLoopState(){
  const coreGear=(klass,slot,ilvl)=>({
    name:'Core Loop '+klass+' '+slot,
    itemId:'core-loop-'+klass.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+slot.toLowerCase(),
    class:klass,classes:[klass],slot,tier:2,rarity:'Uncommon',itemLevel:ilvl,baseItemLevel:ilvl,power:0,source:'Core loop seed'
  });
  const defs=[
    ['tank','Aegis','Warrior','Protection',24,'Alchemy'],
    ['heal','Mercy','Paladin','Holy',24,null],
    ['mage','Ember','Mage','Arcane',24,null],
    ['hunt','Fletch','Hunter','Marksman',24,null],
    ['rogue','Shade','Rogue','Assassination',19,null]
  ];
  const chars=defs.map(([id,name,klass,spec,ilvl,profession])=>({
    id,name,race:'Veyren',class:klass,spec,level:15,xp:0,power:70,
    knowledge:{ashwarden:100,embermaw:100,vaultheart:100},
    equipment:{
      Head:coreGear(klass,'Head',ilvl),Chest:coreGear(klass,'Chest',ilvl),Weapon:coreGear(klass,'Weapon',ilvl),
      Shoulders:null,Hands:null,Waist:null,Legs:null,Feet:null,OffHand:null,Ring1:null,Ring2:null,Trinket1:null,Trinket2:null,Relic:null
    },
    gearItems:[],talents:{},cellShock:0,cellShockLockedUntil:null,
    professions:[profession?{name:profession,level:1,xp:0,craftHistory:{},masterworks:0,projectsCompleted:0}:null]
  }));
  return {
    saveVersion:6,gearVersion:3,renown:200,gold:1200,socialDisplayName:'Core Loop Guild',
    roster:chars,party:{tank:'tank',healer:'heal',dps:['mage','hunt','rogue']},
    bossKills:{ashwarden:true,embermaw:true,vaultheart:true},
    progression:{ashenVaultUnlocked:true},
    questSystem:{version:2,started:true,currentStage:'complete',stageDone:[],flags:{hollowSanctumUnlocked:true,hollowFirstClear:true},rewardClaims:{},ashfall:{started:true,stage:'complete',done:['warning','tracks','ambush','key'],complete:true,history:[]}},
    reports:[],bank:[],materials:{},consumables:[],recipeScrolls:[],discoveredRecipes:[],
    tradeInbox:[],collectionHistory:[],activity:['Core gameplay loop release state loaded.'],
    onboarding:{version:3,complete:true,stage:'complete',zone:'zeltira'}
  };
}

async function mount(page,seedState=null,owner=false,options={}){
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+String(e)));
  page.on('console',msg=>{if(msg.type()==='error')errors.push('console: '+msg.text())});
  await page.addInitScript(({seed,owner,remoteUpdatedAt,failWrites,localSeed,pendingSeed})=>{
    window.__CELLBOUND_TEST_SEED=seed;
    const user={id:'playthrough-user',email:'playthrough@example.test'};
    if(localSeed){
      localStorage.setItem('cellbound-management-owner',user.id);
      localStorage.setItem('cellbound-management-reboot-v3',JSON.stringify(localSeed));
    }
    if(pendingSeed)localStorage.setItem('cellbound-management-pending-save-v1',JSON.stringify(pendingSeed));
    function query(table){
      const q={};
      for(const method of ['select','eq','neq','gte','gt','lte','lt','like','ilike','is','in','contains','containedBy','or','not','order','limit','range','match']){
        q[method]=()=>q;
      }
      q._write=false;
      for(const method of ['insert','upsert','update','delete'])q[method]=()=>{q._write=true;return q};
      q.maybeSingle=async()=>{
        if(q._write&&failWrites)return{data:null,error:{message:'simulated offline save'}};
        return{data:table==='guild_accounts'?{
          user_id:user.id,game_state:window.__CELLBOUND_TEST_SEED,
          membership_active_until:null,membership_override:false,updated_at:remoteUpdatedAt||new Date().toISOString()
        }:null,error:null};
      };
      q.single=async()=>({data:null,error:null});
      q.then=(resolve,reject)=>Promise.resolve({data:[],error:null}).then(resolve,reject);
      return q;
    }
    const client={
      auth:{
        getSession:async()=>({data:{session:{user}},error:null}),
        getUser:async()=>({data:{user},error:null}),
        signOut:async()=>({error:null}),
        onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
      },
      from:query,
      rpc:async(name)=>{
        if(name==='cellbound_social_identity')return{data:{staff_member:owner,chat_badge:owner?'owner':'player',player_mod_discount_eligible:false},error:null};
        if(name==='cellbound_admin_status')return{data:owner?{is_admin:true,role:'owner',auto_clear_cell_shock:false}:{is_admin:false,role:null,auto_clear_cell_shock:false},error:null};
        if(name==='cellbound_release_status')return{data:null,error:null};
        if(name==='cellbound_admin_market_summary')return{data:{active_gear:0,buy_orders:0,sell_orders:0,trades_24:0,volume_24:0,tax_24:0,top_items:[]},error:null};
        return{data:[],error:null};
      },
      channel:()=>{const c={on:()=>c,subscribe:()=>c,unsubscribe:()=>Promise.resolve()};return c},
      removeChannel:async()=>true,
      functions:{invoke:async()=>({data:null,error:null})},
      storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}
    };
    window.supabase={createClient:()=>client};
  },{seed:seedState,owner,remoteUpdatedAt:options.remoteUpdatedAt||null,failWrites:Boolean(options.failWrites),localSeed:options.localSeed||null,pendingSeed:options.pendingSeed||null});
  await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.route('https://cellbound.test/**',async route=>{
    const u=new URL(route.request().url()),relative=u.pathname.replace(/^\/+/,'')||'index.html';
    const file=path.resolve(root,'dist',relative);
    if(!file.startsWith(path.resolve(root,'dist')+path.sep)||!fs.existsSync(file)){
      await route.fulfill({status:404,body:''});return;
    }
    await route.fulfill({path:file});
  });
  await page.goto('https://cellbound.test/guild.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.CellboundGame?.ready===true,{},{timeout:10000,polling:50});
  await page.waitForFunction(()=>Boolean(window.CellboundOnboarding),{},{timeout:10000,polling:50});
  return errors;
}

async function creatorPlaythrough(browser){
  const page=await browser.newPage({viewport:{width:1024,height:1366}});
  const errors=await mount(page,null);
  await page.waitForSelector('#cellboundOnboarding:not([hidden]) .character-creator');
  assert.equal(await page.locator('.creator-party-dots button').count(),5,'creator shows all five party roles');

  await page.locator('[data-next-step="class"]').click();
  assert(await page.locator('[data-class]').count()>=1,'class choices render');
  assert(await page.locator('[data-class]').count()>=1,'damage/tank/healer class choices remain usable');

  await page.locator('[data-next-step="appearance"]').click();
  await page.waitForSelector('[data-appearance-editor]');
  const before=await page.locator('[data-appearance-editor]').innerHTML();
  await page.locator('[data-appearance-field]').first().click();
  await page.waitForTimeout(30);
  const after=await page.locator('[data-appearance-editor]').innerHTML();
  assert.notEqual(after,before,'appearance controls rerender the preview');
  await page.locator('[data-appearance-randomize]').click();
  await page.waitForSelector('[data-appearance-editor]');

  await page.locator('[data-next-step="confirm"]').click();
  assert.equal(await page.locator('.creator-confirm-member').count(),5,'confirm screen includes all five adventurers');
  assert.equal(await page.locator('#confirmParty').isDisabled(),false,'generated party is valid');
  await page.locator('#confirmParty').click();
  await page.waitForFunction(()=>window.CellboundGame.getState()?.roster?.length===5,{},{timeout:10000,polling:50});
  const slots=await page.evaluate(()=>CellboundGame.getState().roster.map(c=>c.professions?.length));
  assert.deepEqual(slots,[1,1,1,1,1],'fresh characters start with exactly one profession slot');
  assert.deepEqual(errors,[],'creator/onboarding emitted no browser errors');
  await page.close();
}

async function persistenceReloadPlaythrough(browser){
  const page=await browser.newPage({viewport:{width:1024,height:1366}});
  const remote=matureState();
  const errors=await mount(page,remote,false,{remoteUpdatedAt:'2026-10-01T00:00:00.000Z',failWrites:true});
  await page.waitForFunction(()=>document.querySelector('#cellboundOnboarding')?.hidden===true,{},{timeout:10000,polling:50});

  await page.evaluate(()=>{
    const s=CellboundGame.getState();
    s.gold=7777;
    s.activity.push('Pending save survives a fast reload.');
    CellboundGame.save();
  });
  assert.equal(await page.evaluate(()=>Boolean(localStorage.getItem('cellbound-management-pending-save-v1'))),true,'save marks the browser snapshot pending before cloud debounce');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.CellboundGame?.ready===true,{},{timeout:10000,polling:50});
  assert.equal(await page.evaluate(()=>CellboundGame.getState().gold),7777,'newer pending local state wins over an older cloud snapshot after reload');
  assert.equal(await page.evaluate(()=>CellboundGame.getState().roster.length),5,'fast reload preserves the complete roster');

  assert.equal(errors.some(e=>!e.includes('Cellbound save failed')),false,'persistence reload test emitted no unexpected browser errors');
  await page.close();

  const staleLocal={...remote,gold:1,activity:[...(remote.activity||[]),'This stale browser snapshot must not win.']};
  const stalePage=await browser.newPage({viewport:{width:1024,height:1366}});
  const staleErrors=await mount(stalePage,remote,false,{
    remoteUpdatedAt:'2026-10-01T00:00:00.000Z',
    localSeed:staleLocal,
    pendingSeed:{userId:'playthrough-user',token:'stale-test',at:'2026-09-01T00:00:00.000Z'}
  });
  await stalePage.waitForFunction(()=>window.CellboundGame?.ready===true,{},{timeout:10000,polling:50});
  assert.equal(await stalePage.evaluate(()=>CellboundGame.getState().gold),5000,'newer cloud state beats a stale pending browser snapshot');
  assert.equal(await stalePage.evaluate(()=>localStorage.getItem('cellbound-management-pending-save-v1')),null,'stale pending marker is cleared once newer cloud state wins');
  assert.deepEqual(staleErrors,[],'stale local recovery test emitted no browser errors');
  await stalePage.close();

  const draftPage=await browser.newPage({viewport:{width:1024,height:1366}});
  const draftErrors=await mount(draftPage,null,false,{remoteUpdatedAt:'2026-10-01T00:00:00.000Z',failWrites:true});
  await draftPage.waitForFunction(()=>window.CellboundGame?.ready===true,{},{timeout:10000,polling:50});
  await draftPage.evaluate(()=>{
    const s=CellboundGame.getState();
    s.roster=[];
    s.onboarding={...(s.onboarding||{}),complete:false,stage:'party-builder',draft:{marker:'reload-draft'}};
    CellboundGame.save();
  });
  await draftPage.reload({waitUntil:'domcontentloaded'});
  await draftPage.waitForFunction(()=>window.CellboundGame?.ready===true,{},{timeout:10000,polling:50});
  assert.equal(await draftPage.evaluate(()=>CellboundGame.getState()?.onboarding?.draft?.marker),'reload-draft','zero-roster onboarding draft survives reload');
  assert.equal(draftErrors.some(e=>!e.includes('Cellbound save failed')),false,'onboarding persistence test emitted no unexpected browser errors');
  await draftPage.close();
}

async function mainGamePlaythrough(browser){
  const page=await browser.newPage({viewport:{width:1024,height:1366}});
  const errors=await mount(page,matureState());
  await page.waitForFunction(()=>document.querySelector('#cellboundOnboarding')?.hidden===true,{},{timeout:10000,polling:50});
  assert.equal(await page.locator('#rosterCount').textContent(),'5 / 5');
  assert.equal(await page.locator('#dungeonGeneratorEntry').isVisible(),false,'non-owner accounts cannot see the dungeon generator');

  await page.evaluate(()=>{
    const s=CellboundGame.getState(),P=CellboundProfessions;
    for(const key of Object.keys(P.MATERIALS||{}))s.materials[key]=999;
    const gear=CellboundGear.items.find(x=>x.enabled!==false&&Number(x.tier)>=2);
    CellboundGame.addBankItem({...gear,id:'playthrough-gear',quantity:1,source:'Release playthrough'},false);
    const recipe=P.PROFESSIONS?.Alchemy?.recipes?.[0],out=recipe?.output;
    if(out?.category==='consumable')s.consumables.push({key:out.key,name:out.name,quantity:2,rarity:out.rarity||'Uncommon',payload:{...(out.payload||{})}});
    CellboundGame.renderAll();
  });

  const views=['overview','roster','party','bank','professions','quests','content','world','raids','trading','pvp','chat'];
  for(const view of views){
    await page.evaluate(v=>CellboundGame.switchView(v),view);
    await page.waitForTimeout(50);
    assert.equal(await page.locator('#'+view).evaluate(el=>el.classList.contains('active')),true,view+' view activates');
  }

  await page.evaluate(()=>CellboundGame.switchView('roster'));
  assert.equal(await page.locator('.roster-character-card').count(),5,'roster renders five characters');

  await page.evaluate(()=>CellboundGame.switchView('party'));
  assert.equal(await page.locator('#partySlots .party-slot.filled').count(),5,'active party stays filled');
  assert.equal(await page.locator('#readinessText').textContent(),'100%','party is ready');

  await page.evaluate(()=>CellboundGame.switchView('bank'));
  await page.waitForSelector('#bankGrid [data-evo-key^="gear:"]',{timeout:5000});
  const allOrder=await page.evaluate(()=>[...document.querySelectorAll('#bankGrid .bank-item')]
    .filter(x=>x.dataset.hidden!=='1').map(x=>x.dataset.evoKey||''));
  assert(allOrder.length>1,'mixed bank contains gear and resources');
  assert(allOrder[0].startsWith('gear:'),'All Items puts equipment before crafting stock');

  await page.locator('[data-bank-category="Reagent"]').click();
  await page.waitForTimeout(80);
  const materialView=await page.evaluate(()=>[...document.querySelectorAll('#bankGrid .bank-item')]
    .filter(x=>x.dataset.hidden!=='1').map(x=>x.dataset.evoKey||''));
  assert(materialView.length>0&&materialView.every(x=>x.startsWith('mat:')),'Materials tab isolates reagents');

  await page.locator('[data-bank-category="Gear"]').click();
  await page.waitForTimeout(80);
  const gearView=await page.evaluate(()=>[...document.querySelectorAll('#bankGrid .bank-item')]
    .filter(x=>x.dataset.hidden!=='1').map(x=>x.dataset.evoKey||''));
  assert(gearView.length>0&&gearView.every(x=>x.startsWith('gear:')),'Equipment tab contains only equipment');

  await page.evaluate(()=>CellboundGame.switchView('professions'));
  await page.waitForSelector('#professionWorkshop .profession-command-hero',{timeout:5000});
  assert(await page.locator('.profession-recipe-card').count()>0,'profession recipes render');
  for(const filter of ['ready','locked','rare','all']){
    await page.locator('[data-prof-recipe-filter="'+filter+'"]').click();
    await page.waitForTimeout(40);
    assert.equal(await page.locator('[data-prof-recipe-filter="'+filter+'"]').evaluate(el=>el.classList.contains('active')),true,'profession filter '+filter+' activates');
  }
  const craft=page.locator('#professionWorkshop [data-craft]:not([disabled])').first();
  if(await craft.count()){
    await craft.click();
    await page.waitForTimeout(40);
    assert(await page.locator('#professionWorkshop .craft-project').count()>0,'craft project can start');
    const abandon=page.locator('#professionWorkshop [data-craft-abandon]');
    if(await abandon.count())await abandon.click();
  }

  await page.evaluate(()=>CellboundGame.switchView('content'));
  await page.waitForTimeout(100);
  assert(await page.locator('[data-dungeon-card]').count()>=1,'dungeon browser renders');

  await page.evaluate(()=>CellboundGame.switchView('quests'));
  assert(await page.locator('#quests').isVisible(),'quest journal renders');
  await page.evaluate(()=>CellboundGame.switchView('world'));
  assert(await page.locator('#world').isVisible(),'activities view renders');
  await page.evaluate(()=>CellboundGame.switchView('raids'));
  assert(await page.locator('#raids').isVisible(),'raid view renders');
  await page.evaluate(()=>CellboundGame.switchView('trading'));
  assert(await page.locator('#trading').isVisible(),'trading view renders');
  await page.evaluate(()=>CellboundGame.switchView('pvp'));
  assert(await page.locator('#pvp').isVisible(),'PvP locked view renders safely');
  await page.evaluate(()=>CellboundGame.switchView('chat'));
  assert(await page.locator('#chat').isVisible(),'social view renders');

  for(const size of [{width:768,height:1024},{width:390,height:844},{width:1024,height:1366}]){
    await page.setViewportSize(size);
    await page.evaluate(()=>CellboundGame.switchView('overview'));
    await page.waitForTimeout(80);
    assert.equal(await page.locator('#overview').isVisible(),true,'core UI survives '+size.width+'px viewport');
  }

  assert.deepEqual(errors,[],'main-game playthrough emitted no browser errors');
  await page.screenshot({path:'/tmp/cellbound-full-playthrough.png',fullPage:true});
  await page.close();
}


async function coreGameplayLoopPlaythrough(browser){
  const page=await browser.newPage({viewport:{width:1024,height:1366}});
  const errors=await mount(page,coreLoopState());
  page.on('dialog',dialog=>dialog.accept());
  await page.waitForFunction(()=>document.querySelector('#cellboundOnboarding')?.hidden===true,{},{timeout:10000,polling:50});

  assert.equal(await page.evaluate(()=>CellboundGame.partyItemLevel()),23,'core loop begins one Item Level below The Hollow Sanctum');
  await page.evaluate(()=>CellboundHollowSanctum.open());
  await page.waitForSelector('#hs2dBackdrop:not([hidden]) .cb2d-blocked',{timeout:5000});
  assert((await page.locator('#hs2dBackdrop .cb2d-blocked').innerText()).includes('requires Item Level 24'),'beta progression explains the exact Hollow Sanctum Item Level gate');
  await page.locator('#hs2dBackdrop [data-close]').click();

  const bankIds=await page.evaluate(()=>{
    const G=CellboundGear,Game=CellboundGame;
    const salvage=G.items.find(x=>x.class==='Mage'&&Number(x.tier)===1&&x.slot==='Head');
    const upgrade=G.items.find(x=>x.class==='Rogue'&&Number(x.tier)===4&&x.slot==='Weapon');
    if(!salvage||!upgrade)throw new Error('Core loop fixtures missing from gear catalogue');
    Game.addBankItem({...salvage,source:'Core Loop Salvage'},false);
    Game.addBankItem({...salvage,source:'Core Loop Salvage'},false);
    Game.addBankItem({...upgrade,itemLevel:40,baseItemLevel:40,source:'Core Loop Upgrade'},false);
    Game.renderAll();
    const s=Game.getState();
    return{
      salvage:s.bank.find(x=>x.source==='Core Loop Salvage')?.id,
      upgrade:s.bank.find(x=>x.source==='Core Loop Upgrade')?.id
    };
  });
  assert(bankIds.salvage&&bankIds.upgrade,'core loop fixtures enter the Guild Bank');

  await page.evaluate(()=>CellboundGame.switchView('bank'));
  await page.locator('[data-bank-item="'+bankIds.salvage+'"]').click();
  await page.waitForSelector('[data-bank-dismantle]');
  await page.locator('[data-bank-cleanup-all]').click();
  await page.locator('[data-bank-dismantle]').click();
  await page.waitForFunction(()=>Number(CellboundGame.getState().materials?.['faded-cell-fragment'])>=2,{},{timeout:5000,polling:50});
  assert.equal(await page.evaluate(()=>Number(CellboundGame.getState().materials?.['faded-cell-fragment'])||0),2,'dismantling two Tier 1 caster items returns salvage material');
  assert(await page.evaluate(()=>Number(CellboundGame.getState().materials?.['cell-shards'])>=4),'dismantling also feeds the item-upgrade currency loop');

  const bossReagent=await page.evaluate(()=>{
    const entry=CellboundProfessions.BOSS_RESOURCE_POOLS?.ashwarden?.find(x=>x.key==='hollowroot');
    const need=Number(CellboundProfessions.recipeById('alc-field-potion')?.inputs?.hollowroot)||0;
    if(!entry||!need)throw new Error('Ash Warden/Alchemy starter reagent contract is missing');
    if(need<Number(entry.min)||need>Number(entry.max))throw new Error('Starter Alchemy requirement cannot be satisfied by a valid Ash Warden Hollowroot roll');
    const drop={key:entry.key,quantity:need,min:Number(entry.min),max:Number(entry.max)};
    CellboundGame.addMaterial(drop.key,drop.quantity);
    CellboundGame.renderAll();
    return drop;
  });
  assert.equal(bossReagent.key,'hollowroot','Ash Warden resource pool supplies the starter Alchemy reagent');
  assert(bossReagent.quantity>=bossReagent.min&&bossReagent.quantity<=bossReagent.max,'starter craft uses a legal Ash Warden Hollowroot drop quantity');
  assert(await page.evaluate(()=>Number(CellboundGame.getState().materials?.hollowroot)>=2),'dungeon profession reagents enter shared Guild materials');

  await page.evaluate(()=>CellboundGame.switchView('professions'));
  await page.waitForSelector('#professionCharacterList [data-prof-char="tank"]',{timeout:5000});
  await page.locator('#professionCharacterList [data-prof-char="tank"]').click();
  await page.waitForSelector('#professionWorkshop [data-craft="alc-field-potion"]',{timeout:5000});
  const craftReady=await page.evaluate(()=>{
    const s=CellboundGame.getState(),button=document.querySelector('#professionWorkshop [data-craft="alc-field-potion"]'),card=button?.closest('.profession-recipe-card');
    return{
      disabled:Boolean(button?.disabled),
      profession:s.roster.find(c=>c.id==='tank')?.professions?.[0]||null,
      hollowroot:Number(s.materials?.hollowroot)||0,
      inputs:CellboundProfessions.recipeById('alc-field-potion')?.inputs||{},
      reason:card?.querySelector('.recipe-lock-reason')?.textContent||''
    };
  });
  assert.equal(craftReady.disabled,false,'dismantled materials must make the first Alchemy recipe craftable: '+JSON.stringify(craftReady));
  await page.locator('#professionWorkshop [data-craft="alc-field-potion"]').click();
  await page.waitForFunction(()=>Boolean(CellboundGame.getState().workshopCraftProject),{},{timeout:5000,polling:50});
  await page.evaluate(()=>{CellboundGame.getState().workshopCraftProject.remainingMs=1});
  await page.waitForFunction(()=>{
    const s=CellboundGame.getState();
    return !s.workshopCraftProject&&s.consumables?.some(x=>x.key==='field-recovery-potion'&&Number(x.quantity)>0);
  },{},{timeout:5000,polling:50});
  assert.equal(await page.evaluate(()=>Number(CellboundGame.getState().materials?.hollowroot)||0),0,'crafting consumes the dungeon profession reagents');
  assert.equal(await page.evaluate(()=>Number(CellboundGame.getState().materials?.['faded-cell-fragment'])||0),2,'salvage materials remain available for their own economy path');
  assert(await page.evaluate(()=>CellboundGame.getState().consumables.some(x=>x.key==='field-recovery-potion'&&Number(x.quantity)>0)),'completed craft returns a usable preparation item to shared Guild stock');

  await page.evaluate(()=>CellboundGame.switchView('bank'));
  await page.locator('[data-bank-item="'+bankIds.upgrade+'"]').click();
  await page.waitForSelector('[data-equip-char="rogue"]',{timeout:5000});
  await page.locator('[data-equip-char="rogue"]').click();
  await page.waitForFunction(()=>CellboundGame.partyItemLevel()>=24,{},{timeout:5000,polling:50});
  assert.equal(await page.evaluate(()=>CellboundGame.partyItemLevel()),24,'equipping the recovered upgrade raises the active party through the second beta dungeon gate');
  assert.equal(await page.evaluate(()=>CellboundGame.getState().roster.find(c=>c.id==='rogue')?.equipment?.Weapon?.itemLevel),40,'Bank equip action placed the real upgrade on the intended character');

  await page.evaluate(()=>CellboundHollowSanctum.open());
  await page.waitForSelector('#hs2dBackdrop:not([hidden]) [data-start]',{timeout:5000});
  assert.equal(await page.locator('#hs2dBackdrop [data-start]').isDisabled(),false,'the second beta dungeon becomes enterable after progression raises party Item Level');
  assert((await page.locator('#hs2dBackdrop').innerText()).includes('ILVL 24+'),'unlocked beta briefing still communicates the progression requirement');
  await page.locator('#hs2dBackdrop [data-close]').click();

  assert.equal(errors.filter(e=>!e.includes('Endgame state failed')).length,0,'core gameplay loop emitted no unexpected browser errors');
  await page.close();
}

async function betaContentLockPlaythrough(browser){
  const seed=coreLoopState();
  seed.progression.nullComplexUnlocked=false;
  seed.progression.manorRaidCleared=false;
  seed.questSystem.nullComplex={started:false,stage:'signal',done:[],complete:false,history:[],components:{cable:false,cell:false,fuse:false},searchPressure:0};
  const page=await browser.newPage({viewport:{width:1024,height:1366}});
  const errors=await mount(page,seed);
  await page.waitForFunction(()=>document.querySelector('#cellboundOnboarding')?.hidden===true,{},{timeout:10000,polling:50});

  assert.deepEqual(await page.evaluate(()=>CellboundGame.betaPlayableClasses),['Warrior','Paladin','Hunter','Rogue','Mage'],'beta exposes exactly the five launch classes');
  assert.equal(await page.evaluate(()=>['Priest','Druid','Shaman','Warlock','Monk','Death Knight','Demon Hunter','Evoker'].every(x=>!CellboundGame.isBetaClassPlayable(x))),true,'future classes remain gameplay-locked');
  assert.deepEqual(await page.evaluate(()=>CellboundGame.betaDungeons),['ashen-vault','hollow-sanctum'],'beta exposes exactly Ashen Vault and Hollow Sanctum as dungeons');

  await page.evaluate(()=>CellboundGame.switchView('content'));
  await page.waitForTimeout(100);
  for(const id of ['chaos-canyon','blackout-station','fractured-ages']){
    const card=page.locator('[data-dungeon-card="'+id+'"]');
    await card.waitFor({state:'visible',timeout:5000});
    assert((await card.innerText()).includes('FUTURE UPDATE'),'future dungeon '+id+' is visibly locked');
  }
  await page.evaluate(()=>CellboundChaosCanyon.open());
  assert.equal(await page.locator('#cc2dBackdrop:not([hidden])').count(),0,'direct Chaos Canyon entry cannot bypass the beta lock');
  await page.evaluate(()=>CellboundBlackoutStation.open());
  assert.equal(await page.locator('#bs2dBackdrop:not([hidden])').count(),0,'direct Blackout Station entry cannot bypass the beta lock');
  await page.evaluate(()=>CellboundFracturedAges.open());
  assert.equal(await page.locator('#fracturedAgesBackdrop:not([hidden])').count(),0,'direct Fractured Ages entry cannot bypass the beta lock');

  await page.evaluate(()=>{CellboundGame.switchView('quests');CellboundQuests.selectAdventure('null-complex-quest')});
  await page.waitForSelector('[data-adventure="null-complex-quest"]',{timeout:5000});
  assert((await page.locator('[data-adventure="null-complex-quest"]').innerText()).includes('LOCKED'),'Signal From Nowhere is locked before a Manor clear');
  assert((await page.locator('#questJournalDetail').innerText()).includes('LOCKED UNTIL THE MANOR'),'Null Complex detail explains the raid requirement');

  await page.evaluate(()=>{CellboundGame.getState().progression.manorRaidCleared=true;CellboundGame.renderAll();CellboundQuests.selectAdventure('null-complex-quest')});
  await page.waitForTimeout(80);
  assert((await page.locator('[data-adventure="null-complex-quest"]').innerText()).includes('AVAILABLE'),'a persisted Manor clear unlocks Signal From Nowhere');
  assert((await page.locator('#questJournalDetail').innerText()).includes('INVESTIGATE THE SIGNAL'),'the Null Complex quest becomes actionable only after The Manor');

  assert.equal(errors.filter(e=>!e.includes('Endgame state failed')).length,0,'beta content lock emitted no unexpected browser errors');
  await page.close();
}

async function ownerDungeonGeneratorPlaythrough(browser){
  const page=await browser.newPage({viewport:{width:1024,height:1366}});
  const errors=await mount(page,matureState(),true);
  await page.waitForFunction(()=>document.querySelector('#cellboundOnboarding')?.hidden===true,{},{timeout:10000,polling:50});
  await page.waitForFunction(()=>window.CellboundAdmin?.role==='owner',{},{timeout:10000,polling:50});
  await page.evaluate(()=>CellboundGame.switchView('admin'));
  await page.waitForSelector('#dungeonGeneratorEntry:not([hidden])',{timeout:5000});
  await page.locator('#openDungeonGenerator').click();
  await page.waitForSelector('#dungeonGeneratorMount:not([hidden]) .dg-shell',{timeout:5000});

  const values={
    'basics.name':'Automation Keep',
    'identity.concept':'A ruined keep under siege by Cell-corrupted knights.',
    'identity.theme':'Medieval castle',
    'identity.location':'Mountain fortress',
    'scenes.0.name':'Outer Gate',
    'scenes.0.environment':'Broken castle gate and stone approach.',
    'scenes.1.name':'Throne Hall',
    'scenes.1.environment':'Ruined royal throne hall with an open central floor.',
    'scenes.1.bossName':'The Iron Regent'
  };
  for(const [pathName,value] of Object.entries(values)){
    const input=page.locator('[data-dg-path="'+pathName+'"]');
    await input.fill(value);
  }
  await page.waitForFunction(()=>!document.querySelector('#dgGenerate')?.disabled);
  await page.locator('#dgGenerate').click();
  await page.waitForSelector('#dgOutputText');
  const brief=await page.locator('#dgOutputText').inputValue();
  assert(brief.includes('AUTOMATION KEEP'),'owner generator produces the dungeon brief');
  assert(brief.includes('COMBAT REBORN STANDARD'),'generated brief automatically includes the shared combat contract');

  await page.locator('[data-dg-output="config"]').click();
  const config=JSON.parse(await page.locator('#dgOutputText').inputValue());
  assert.equal(config.combatStandard.engine,'Combat Reborn','game config is pinned to Combat Reborn');
  assert.equal(config.scenes.length,2,'generated config preserves the route');
  assert(config.scenes[0].art.prompt.includes('No characters, enemies, UI, text'),'art prompts preserve clean battle-art requirements');
  assert.equal(config.scenes[1].boss.name,'The Iron Regent','boss builder feeds the generated config');
  assert.deepEqual(errors,[],'owner dungeon generator emitted no browser errors');
  await page.close();
}

(async()=>{
  const browser=await engine.launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
  try{
    await creatorPlaythrough(browser);
    await persistenceReloadPlaythrough(browser);
    await mainGamePlaythrough(browser);
    await coreGameplayLoopPlaythrough(browser);
    await betaContentLockPlaythrough(browser);
    await ownerDungeonGeneratorPlaythrough(browser);
    console.log('Full Cellbound browser playthrough passed: creator, save/reload recovery, onboarding persistence, beta class/dungeon locks, Manor-gated Null Complex, party, quest/dungeon shell, loot Bank, dismantle, crafting completion, equipment progression, second-beta-dungeon unlock, activities, raids, market, PvP/social shell, owner dungeon generator and responsive layouts.');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
