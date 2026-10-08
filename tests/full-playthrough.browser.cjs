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
    progression:{ashenVaultUnlocked:true,nullComplexUnlocked:true,manorRaidCleared:true},
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
    ['tank','Aegis','Warrior','Protection',30,'Alchemy'],
    ['heal','Mercy','Paladin','Holy',30,null],
    ['mage','Ember','Mage','Arcane',30,null],
    ['hunt','Fletch','Hunter','Marksman',30,null],
    ['rogue','Shade','Rogue','Assassination',25,null]
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
  await page.addInitScript(({seed,owner,remoteUpdatedAt,failWrites,localSeed,pendingSeed,simulateDungeonRuntime})=>{
    window.__CELLBOUND_TEST_SEED=seed;
    const user={id:'playthrough-user',email:'playthrough@example.test'};
    if(localSeed){
      localStorage.setItem('cellbound-management-owner',user.id);
      localStorage.setItem('cellbound-management-reboot-v3',JSON.stringify(localSeed));
    }
    if(pendingSeed)localStorage.setItem('cellbound-management-pending-save-v1',JSON.stringify(pendingSeed));
    const TEST_ATTEMPT_KEY='cellbound-test-dungeon-attempt-v1',TEST_BEGIN_KEY='cellbound-test-dungeon-begins-v1';
    const readAttempt=()=>{try{return JSON.parse(localStorage.getItem(TEST_ATTEMPT_KEY)||'null')}catch{return null}};
    const writeAttempt=value=>localStorage.setItem(TEST_ATTEMPT_KEY,JSON.stringify(value));
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
      rpc:async(name,args={})=>{
        if(name==='cellbound_social_identity')return{data:{staff_member:owner,chat_badge:owner?'owner':'player',player_mod_discount_eligible:false},error:null};
        if(name==='cellbound_admin_status')return{data:owner?{is_admin:true,role:'owner',auto_clear_cell_shock:false}:{is_admin:false,role:null,auto_clear_cell_shock:false},error:null};
        if(name==='cellbound_release_status')return{data:null,error:null};
        if(name==='cellbound_admin_market_summary')return{data:{active_gear:0,buy_orders:0,sell_orders:0,trades_24:0,volume_24:0,tax_24:0,top_items:[]},error:null};
        if(name==='cellbound_admin_analytics_summary')return{data:{channel:args.p_channel||'staging',days:Number(args.p_days)||30,since:new Date(Date.now()-86400000).toISOString(),overview:{active_testers:3,sessions:7,events:48,characters_tracked:15,quests_completed:4,crafts_completed:6,items_equipped:9,items_dismantled:3},classes:[{name:'Warrior',count:5},{name:'Mage',count:4}],races:[{name:'Veyren',count:6},{name:'Nymari',count:3}],class_race:[{class:'Warrior',race:'Veyren',count:3}],dungeons:[{id:'ashen-vault',name:'The Ashen Vault',starts:8,completions:6,unique_players:3,completion_rate:75}],quests:[{id:'ashes-east-road',name:'Ashes on the East Road',completions:3,unique_players:3}],features:[{name:'content',opens:12,unique_players:3}],levels:[{level:5,characters:4,players:3}],professions:[{name:'Alchemy',learned:2,crafts:5,players:2}],daily_activity:[{date:'2026-10-03',players:3,sessions:7}]},error:null};
        if(simulateDungeonRuntime&&name==='resume_dungeon_attempt'){
          const saved=readAttempt();return{data:saved?.active?saved:{active:false},error:null};
        }
        if(simulateDungeonRuntime&&name==='begin_dungeon_attempt'){
          const count=Math.max(0,Number(localStorage.getItem(TEST_BEGIN_KEY))||0)+1;localStorage.setItem(TEST_BEGIN_KEY,String(count));
          const existing=readAttempt();if(existing?.active)return{data:existing,error:null};
          const attempt={active:true,attemptId:'qa-attempt-'+count,seed:'qa-resume-seed-'+count,difficulty:args.p_difficulty||'normal',tier:Number(args.p_tier)||0,dungeonVersion:Number(args.p_dungeon_version)||2,seasonId:args.p_season_id||'qa',targetTimeMs:720000,runtimeState:{}};
          writeAttempt(attempt);return{data:attempt,error:null};
        }
        if(simulateDungeonRuntime&&name==='save_dungeon_attempt_runtime'){
          const saved=readAttempt()||{active:true,attemptId:args.p_attempt_id||'qa-attempt-1'};
          const phase=String(args.p_runtime_state?.phase||'');
          const active=!['abandoned','failed','completed'].includes(phase);
          const next={...saved,active,runtimeState:args.p_runtime_state||{},runtimeUpdatedAt:new Date().toISOString()};writeAttempt(next);return{data:{ok:true},error:null};
        }
        if(simulateDungeonRuntime&&name==='record_dungeon_run_v3'){
          const saved=readAttempt();if(saved)writeAttempt({...saved,active:false});
          return{data:{valid:true,score:1234,newUnlocks:[]},error:null};
        }
        return{data:[],error:null};
      },
      channel:()=>{const c={on:()=>c,subscribe:()=>c,unsubscribe:()=>Promise.resolve()};return c},
      removeChannel:async()=>true,
      functions:{invoke:async()=>({data:null,error:null})},
      storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}
    };
    window.supabase={createClient:()=>client};
  },{seed:seedState,owner,remoteUpdatedAt:options.remoteUpdatedAt||null,failWrites:Boolean(options.failWrites),localSeed:options.localSeed||null,pendingSeed:options.pendingSeed||null,simulateDungeonRuntime:Boolean(options.simulateDungeonRuntime)});
  await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
  await page.route('https://cellbound.test/**',async route=>{
    const u=new URL(route.request().url()),relative=u.pathname.replace(/^\/+/,'')||'index.html';
    if(relative==='guild.html'){
      const shell=path.resolve(root,options.useBuiltGuild?'dist/guild.html':'guild.html');
      const html=fs.readFileSync(shell,'utf8')
        .replace(/<meta\s+http-equiv=["']refresh["'][^>]*>/i,'')
        .replace(/<script>\s*window\.location\.replace\(["']\.\/index\.html["']\);?\s*<\/script>/i,'');
      await route.fulfill({status:200,contentType:'text/html',body:html});return;
    }
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

async function creatorPlaythrough(browser,viewport={width:1024,height:1366}){
  const page=await browser.newPage({viewport});
  const errors=await mount(page,null);
  await page.waitForSelector('#cellboundOnboarding:not([hidden]) .cellbound-character-forge');
  assert.equal(await page.locator('.creator-party-dots button').count(),5,'Character Forge shows all five party roles');
  // Equipment remains on the existing rig while base character artwork migrates.
  const plateFit=await page.evaluate(()=>{
    const P=CellboundPortraits,host=document.createElement('div'),failures=[];
    host.style.cssText='position:fixed;left:-2000px;width:240px;height:410px;visibility:hidden';document.body.append(host);
    let checked=0;
    for(const race of Object.keys(P.RACES))for(const gender of [0,1])for(const frame of [0,1,2])for(const tier of [1,2,3,4,5]){
      const c={id:'plate-fit-'+checked,race,class:'Warrior',appearance:{gender,frame},equipment:{Chest:{id:'plate-chest-'+tier,slot:'Chest',class:'Warrior',tier}}};
      host.innerHTML=P.paperDollSVG(c);
      const chest=host.querySelector('.cb-paper-slot-chest'),box=chest?.getBBox();
      if(!box||box.width<20||box.height<20||box.y+box.height>266)failures.push({race,gender,frame,tier,reason:'classic chest exceeds waist band',bottom:box?.y+box?.height});
      checked++;
    }
    host.remove();return {checked,failures};
  });
  assert.equal(plateFit.checked,180);assert.deepEqual(plateFit.failures,[],'Classic paper-doll armour remains bounded at the waist band');

  for(const race of ['Veyren','Stoneborn','Aelari','Thornkin','Emberkin','Nymari']){
    await page.locator('[data-forge-race="'+race+'"]').click();
    for(const gender of [0,1]){
      await page.locator('[data-forge-sex="'+gender+'"]').click();
      const model=page.locator('.cf-preview>.cf-model').first();
      assert.equal(await model.getAttribute('data-gender'),gender?'female':'male','Classic Forge preview tracks selected sex');
      const svg=model.locator('svg').first();
      assert.equal(await svg.getAttribute('data-race'),race,'Classic Forge preview tracks '+race);
      assert.equal(await svg.getAttribute('data-character-style'),'classic-paper-doll','Forge preview uses the restored classic paper-doll style');
    }
  }
  assert.equal(await page.locator('[data-appearance-field]').count(),0,'Beta Character Forge exposes no unfinished appearance controls');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Character Forge fits the viewport');

  await page.locator('[data-forge-step="class"]').click();
  assert(await page.locator('[data-forge-class]').count()>=1,'class choices render');
  await page.locator('[data-forge-step="identity"]').click();
  await page.waitForSelector('#cfCharacterName');
  await page.locator('[data-forge-step="confirm"]').click();
  assert.equal(await page.locator('.creator-confirm-member').count(),5,'confirm screen includes all five adventurers');
  assert.equal(await page.locator('[data-forge-confirm]').isDisabled(),false,'generated party is valid');
  await page.locator('[data-forge-confirm]').click();
  await page.waitForFunction(()=>window.CellboundGame.getState()?.roster?.length===5,{},{timeout:10000,polling:50});
  const fresh=await page.evaluate(()=>({slots:CellboundGame.getState().roster.map(c=>c.professions?.length),classes:CellboundGame.getState().roster.map(c=>c.class),allBeta:CellboundGame.getState().roster.every(c=>CellboundGame.isCharacterBetaPlayable(c))}));
  assert.deepEqual(fresh.slots,[1,1,1,1,1],'fresh characters start with exactly one profession slot');
  assert.equal(fresh.allBeta,true,'fresh guild creator only produces currently playable classes');
  assert(fresh.classes.includes('Paladin'),'Paladin can fill the beta healer role');
  assert(fresh.classes.every(c=>['Warrior','Paladin','Hunter','Rogue','Mage'].includes(c)),'fresh party uses valid playable classes');
  const createdAppearance=await page.evaluate(()=>CellboundGame.getState().roster.map(c=>({id:c.id,race:c.race,appearance:c.appearance})));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.CellboundGame?.ready===true);
  assert.deepEqual(await page.evaluate(()=>CellboundGame.getState().roster.map(c=>({id:c.id,race:c.race,appearance:c.appearance}))),createdAppearance,'Created appearances survive refresh');
  await page.screenshot({path:'/tmp/cellbound-creator-'+viewport.width+'.png',fullPage:true});
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

  const views=['overview','roster','party','bank','professions','quests','content','world','raids','trading','pvp','chat','support'];
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
  await page.waitForFunction(()=>{
    const select=document.querySelector('#bankCategory');
    const visible=[...document.querySelectorAll('#bankGrid .bank-item')].filter(x=>x.dataset.hidden!=='1');
    return select?.value==='Reagent'&&visible.length>0&&visible.every(x=>(x.dataset.evoKey||'').startsWith('mat:'));
  },{},{timeout:5000,polling:25});
  const materialView=await page.evaluate(()=>[...document.querySelectorAll('#bankGrid .bank-item')]
    .filter(x=>x.dataset.hidden!=='1').map(x=>x.dataset.evoKey||''));
  assert(materialView.length>0&&materialView.every(x=>x.startsWith('mat:')),'Materials tab isolates reagents');

  await page.locator('[data-bank-category="Gear"]').click();
  await page.waitForFunction(()=>{
    const select=document.querySelector('#bankCategory');
    const visible=[...document.querySelectorAll('#bankGrid .bank-item')].filter(x=>x.dataset.hidden!=='1');
    return select?.value==='Gear'&&visible.length>0&&visible.every(x=>(x.dataset.evoKey||'').startsWith('gear:'));
  },{},{timeout:5000,polling:25});
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

  await page.evaluate(()=>CellboundGame.switchView('content'));
  await page.waitForFunction(()=>Boolean(window.CellboundBetaOps),{},{timeout:10000,polling:50});
  await page.waitForSelector('#betaQuickReportTrigger',{timeout:10000});
  assert(await page.locator('#betaQuickReportTrigger').isVisible(),'persistent Report Bug / Request button is visible');
  await page.locator('#betaQuickReportTrigger').click();
  await page.locator('[data-quick-report="feature"]').click();
  await page.waitForFunction(()=>document.querySelector('#support')?.classList.contains('active'),{},{timeout:5000,polling:50});
  assert.equal(await page.locator('#betaReportCategory').inputValue(),'feature','feature-request shortcut preselects the correct category');
  assert.equal((await page.locator('#betaSupportView').textContent()).trim(),'content','quick report preserves the originating screen');
  assert(await page.locator('#betaReportForm').isVisible(),'beta support form renders');
  assert(await page.locator('#betaPatchNotes .beta-note').count()>=1,'beta patch notes render');
  await page.locator('#betaReportSummary').fill('QA support ticket');
  await page.locator('#betaReportDetails').fill('The automated beta operations playthrough is testing the support submission path.');
  await page.evaluate(async()=>{await window.CellboundBetaOps.submitReport({preventDefault(){}})});
  await page.waitForFunction(()=>{
    const message=document.querySelector('#betaReportMessage')?.textContent||'';
    return message.includes('Report sent');
  },{},{timeout:5000,polling:50});
  assert((await page.locator('#betaReportMessage').textContent()).includes('Report sent'),'beta report submission path completes');

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

  assert.equal(await page.evaluate(()=>CellboundGame.partyItemLevel()),29,'core loop begins one Item Level below Chaos Canyon');
  await page.evaluate(()=>CellboundChaosCanyon.open());
  await page.waitForSelector('#cc2dBackdrop:not([hidden]) .cb2d-blocked',{timeout:5000});
  assert((await page.locator('#cc2dBackdrop .cb2d-blocked').innerText()).includes('requires Item Level 30'),'harder dungeon explains the exact Item Level gate');
  await page.locator('#cc2dBackdrop [data-close]').click();

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
  const hollowrootAfter=await page.evaluate(()=>Number(CellboundGame.getState().materials?.hollowroot)||0);
  const hollowrootCost=Number(craftReady.inputs?.hollowroot)||0,expectedAfter=Math.max(0,craftReady.hollowroot-hollowrootCost);
  assert(hollowrootAfter===expectedAfter||hollowrootAfter===expectedAfter+1,'crafting consumes the recipe Hollowroot cost, with at most one reagent reclaimed by a masterwork');
  assert.equal(await page.evaluate(()=>Number(CellboundGame.getState().materials?.['faded-cell-fragment'])||0),2,'salvage materials remain available for their own economy path');
  assert(await page.evaluate(()=>CellboundGame.getState().consumables.some(x=>x.key==='field-recovery-potion'&&Number(x.quantity)>0)),'completed craft returns a usable preparation item to shared Guild stock');

  await page.evaluate(()=>CellboundGame.switchView('bank'));
  await page.locator('[data-bank-item="'+bankIds.upgrade+'"]').click();
  await page.waitForSelector('[data-equip-char="rogue"]',{timeout:5000});
  await page.locator('[data-equip-char="rogue"]').click();
  await page.waitForFunction(()=>CellboundGame.partyItemLevel()>=30,{},{timeout:5000,polling:50});
  assert.equal(await page.evaluate(()=>CellboundGame.partyItemLevel()),30,'equipping the recovered upgrade raises the active party through the next dungeon gate');
  assert.equal(await page.evaluate(()=>CellboundGame.getState().roster.find(c=>c.id==='rogue')?.equipment?.Weapon?.itemLevel),40,'Bank equip action placed the real upgrade on the intended character');

  await page.evaluate(()=>CellboundChaosCanyon.open());
  await page.waitForSelector('#cc2dBackdrop:not([hidden]) [data-start]',{timeout:5000});
  assert.equal(await page.locator('#cc2dBackdrop [data-start]').isDisabled(),false,'the same harder dungeon becomes enterable after progression raises party Item Level');
  assert((await page.locator('#cc2dBackdrop').innerText()).includes('ILVL 30+'),'unlocked briefing still communicates the progression requirement');
  await page.locator('#cc2dBackdrop [data-close]').click();

  assert.equal(errors.filter(e=>!e.includes('Endgame state failed')).length,0,'core gameplay loop emitted no unexpected browser errors');
  await page.close();
}

async function classAvailabilityAndNullGatePlaythrough(browser){
  const seed=matureState();
  seed.progression.manorRaidCleared=false;
  seed.progression.nullComplexUnlocked=false;
  seed.raidRewardClaims={};
  seed.questSystem=null;
  const page=await browser.newPage({viewport:{width:1024,height:1366}});
  const errors=await mount(page,seed);
  await page.waitForFunction(()=>document.querySelector('#cellboundOnboarding')?.hidden===true,{},{timeout:10000,polling:50});

  assert.deepEqual(await page.evaluate(()=>CellboundGame.betaPlayableClasses),await page.evaluate(()=>Object.keys(CellboundGame.classes)),'staging balance pass exposes the full class roster');
  assert.equal(await page.evaluate(()=>Object.keys(CellboundGame.classes).every(x=>CellboundGame.isBetaClassPlayable(x))),true,'every class is playable during the staging balance pass');

  const oldSaveLock=await page.evaluate(()=>{
    const s=CellboundGame.getState(),healer=s.roster.find(c=>c.id==='heal');
    const original={class:healer.class,spec:healer.spec};
    healer.class='Priest';healer.spec='Holy';CellboundGame.renderAll();
    const result={partyCount:CellboundGame.getPartyCharacters().length,playable:CellboundGame.isCharacterBetaPlayable(healer)};
    healer.class=original.class;healer.spec=original.spec;CellboundGame.renderAll();
    return result;
  });
  assert.equal(oldSaveLock.playable,true,'all-class staging balance pass keeps legacy class characters playable');
  assert.equal(oldSaveLock.partyCount,5,'all-class staging balance pass preserves a complete active party');

  const contentRuntime=await page.evaluate(()=>({
    hollow:typeof window.CellboundHollowSanctum,
    chaos:typeof window.CellboundChaosCanyon,
    blackout:typeof window.CellboundBlackoutStation,
    fractured:typeof window.CellboundFracturedAges
  }));
  assert.deepEqual(contentRuntime,{hollow:'object',chaos:'object',blackout:'object',fractured:'object'},'all dungeon runtimes remain included');

  await page.evaluate(()=>{CellboundGame.switchView('quests');CellboundQuests.selectAdventure('null-complex-quest')});
  await page.waitForSelector('[data-adventure="null-complex-quest"]',{timeout:5000});
  assert((await page.locator('[data-adventure="null-complex-quest"]').innerText()).includes('LOCKED'),'Signal From Nowhere is locked before The Manor');
  assert((await page.locator('#questJournalDetail').innerText()).includes('LOCKED UNTIL THE MANOR'),'Null quest explains its Manor requirement');

  await page.evaluate(()=>{CellboundGame.getState().progression.manorRaidCleared=true;CellboundGame.renderAll();CellboundQuests.selectAdventure('null-complex-quest')});
  await page.waitForTimeout(80);
  assert((await page.locator('[data-adventure="null-complex-quest"]').innerText()).includes('AVAILABLE'),'The Manor clear unlocks Signal From Nowhere');

  assert.equal(errors.filter(e=>!e.includes('Endgame state failed')).length,0,'class availability/Null gate validation emitted no unexpected browser errors');
  await page.close();
}

async function breakGamePlaythrough(browser){
  // Corrupted/legacy save: duplicate party ids, mixed class data, negative stacks and currencies.
  const corrupt=matureState();
  corrupt.roster[1]={...corrupt.roster[1],class:'Priest',spec:'Holy',level:99,xp:999};
  corrupt.party={tank:'tank',healer:'heal',dps:['mage','mage','rogue']};
  corrupt.bank=[{id:'bad-stack',name:'Corrupt Scrap',itemId:'corrupt-scrap',class:'Warrior',slot:'Head',tier:1,rarity:'Common',itemLevel:18,baseItemLevel:18,power:1,quantity:-9,source:'Legacy corruption'}];
  corrupt.materials={'cell-shards':-50,hollowroot:3.9};
  corrupt.consumables=[{key:'bad-potion',name:'Bad Potion',quantity:-4,payload:{effect:'combat-potion'}},{key:'good-potion',name:'Good Potion',quantity:2,payload:{effect:'combat-potion'}}];
  const corruptPage=await browser.newPage({viewport:{width:1024,height:1366}});
  const corruptErrors=await mount(corruptPage,corrupt);
  const repaired=await corruptPage.evaluate(()=>{
    const s=CellboundGame.getState(),slots=[s.party.tank,s.party.healer,...s.party.dps];
    return{
      slots,
      unique:slots.filter(Boolean).length===new Set(slots.filter(Boolean)).size,
      oldPriestInParty:slots.includes('heal'),
      badQty:s.bank.find(x=>x.id==='bad-stack')?.quantity,
      shards:s.materials['cell-shards'],
      hollowroot:s.materials.hollowroot,
      consumables:s.consumables.map(x=>[x.key,x.quantity]),
      oldPriestLevel:s.roster.find(x=>x.id==='heal')?.level
    };
  });
  assert.equal(repaired.unique,true,'corrupted saves cannot duplicate the same adventurer across party slots');
  assert.equal(repaired.oldPriestInParty,true,'playable classes remain in the repaired active-party state');
  assert.equal(repaired.badQty,1,'negative Bank stack quantities are repaired to one');
  assert.equal(repaired.shards,0,'negative material balances are clamped to zero');
  assert.equal(repaired.hollowroot,3,'fractional material balances are normalised');
  assert.deepEqual(repaired.consumables,[['good-potion',2]],'invalid consumable stacks are removed');
  assert.equal(repaired.oldPriestLevel,15,'legacy over-cap levels are clamped to the beta cap');
  assert.equal(corruptErrors.filter(e=>!e.includes('Endgame state failed')).length,0,'corrupted save recovery emitted no unexpected browser errors');
  await corruptPage.close();

  // Rapid UI and Bank mutations: detached/repeated click events must not double-spend.
  const spamPage=await browser.newPage({viewport:{width:1024,height:1366}});
  const spamErrors=await mount(spamPage,matureState());
  spamPage.on('dialog',dialog=>dialog.accept());
  await spamPage.evaluate(()=>{
    const views=['overview','roster','party','bank','professions','quests','content','world','raids','trading','pvp','chat'];
    for(let i=0;i<80;i++)CellboundGame.switchView(views[i%views.length]);
    CellboundGame.switchView('bank');
    const s=CellboundGame.getState();s.materials['cell-shards']=100;
    const base=CellboundGear.items.find(x=>x.class==='Warrior'&&x.slot==='Head'&&Number(x.tier)===1)||CellboundGear.items.find(x=>x.class==='Warrior'&&x.slot==='Head');
    CellboundGame.addBankItem({...base,itemLevel:18,baseItemLevel:18,tier:1,upgradeLevel:0,source:'QA Upgrade Spam'},false);
    CellboundGame.renderAll();
  });
  assert.equal(await spamPage.locator('.view.active').count(),1,'rapid navigation leaves exactly one active screen');
  const upgradeId=await spamPage.evaluate(()=>CellboundGame.getState().bank.find(x=>x.source==='QA Upgrade Spam')?.id);
  assert(upgradeId,'upgrade-spam fixture exists');
  await spamPage.locator('[data-bank-item="'+upgradeId+'"]').click();
  await spamPage.waitForSelector('[data-bank-upgrade]');
  await spamPage.evaluate(()=>{
    const button=document.querySelector('[data-bank-upgrade]');
    button.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    button.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  });
  await spamPage.waitForTimeout(40);
  const upgradeResult=await spamPage.evaluate(id=>{
    const s=CellboundGame.getState(),item=s.bank.find(x=>x.id===id);
    return{itemLevel:item?.itemLevel,upgradeLevel:item?.upgradeLevel,shards:s.materials['cell-shards']};
  },upgradeId);
  assert.equal(upgradeResult.itemLevel,20,'rapid upgrade presses advance the item exactly one step');
  assert.equal(upgradeResult.upgradeLevel,1,'rapid upgrade presses record one upgrade');
  assert.equal(upgradeResult.shards,93,'rapid upgrade presses spend Cell Shards once');

  // Repeated wipes: Cell Shock caps at 100, removes locked characters, then recovers cleanly.
  const shock=await spamPage.evaluate(()=>{
    CellboundGame.switchView('party');
    for(let i=0;i<5;i++)CellboundGame.applyPartyCellShock(25);
    const s=CellboundGame.getState(),after=s.roster.slice(0,5).map(c=>({id:c.id,shock:c.cellShock,locked:Boolean(c.cellShockLockedUntil)}));
    const partyCount=CellboundGame.getPartyCharacters().length;
    s.roster.slice(0,5).forEach(c=>{c.cellShockLockedUntil=new Date(Date.now()-1000).toISOString()});
    CellboundGame.renderAll();
    return{after,partyCount,recovered:s.roster.slice(0,5).map(c=>({shock:c.cellShock,locked:Boolean(c.cellShockLockedUntil)}))};
  });
  assert(shock.after.every(x=>x.shock===100&&x.locked),'repeated wipes cap every active adventurer at 100% Cell Shock');
  assert.equal(shock.partyCount,0,'100% Cell Shock removes locked adventurers from the active party');
  assert(shock.recovered.every(x=>x.shock===0&&!x.locked),'expired Cell Shock locks recover without stale state');
  assert.equal(spamErrors.filter(e=>!e.includes('Endgame state failed')).length,0,'rapid-action abuse emitted no unexpected browser errors');
  await spamPage.close();

  // Refresh in the middle of a persisted dungeon phase and concurrent entry requests.
  const resumePage=await browser.newPage({viewport:{width:1024,height:1366}});
  const resumeErrors=await mount(resumePage,matureState(),false,{simulateDungeonRuntime:true});
  const firstAttempt=await resumePage.evaluate(async()=>{
    localStorage.removeItem('cellbound-test-dungeon-attempt-v1');
    localStorage.removeItem('cellbound-test-dungeon-begins-v1');
    const [a,b]=await Promise.all([
      CellboundEndgame.beginOrResumeAttempt('ashen-vault'),
      CellboundEndgame.beginOrResumeAttempt('ashen-vault')
    ]);
    await CellboundEndgame.saveRuntime('ashen-vault',{version:1,kind:'ashen-vault',phase:'combat',stage:2,stageStartedAt:123456,run:{stage:2,endgame:{attemptId:a.attemptId},hp:{tank:72}}});
    return{a:a.attemptId,b:b.attemptId,begins:Number(localStorage.getItem('cellbound-test-dungeon-begins-v1'))||0};
  });
  assert.equal(firstAttempt.a,firstAttempt.b,'concurrent dungeon entry calls share one server attempt');
  assert.equal(firstAttempt.begins,1,'concurrent dungeon entry calls create only one attempt');
  await resumePage.reload({waitUntil:'domcontentloaded'});
  await resumePage.waitForFunction(()=>window.CellboundGame?.ready===true&&window.CellboundEndgame,{},{timeout:10000,polling:50});
  const resumed=await resumePage.evaluate(async()=>{
    const attempt=await CellboundEndgame.beginOrResumeAttempt('ashen-vault');
    return{resumed:attempt.resumed,attemptId:attempt.attemptId,phase:attempt.runtimeState?.phase,stage:attempt.runtimeState?.stage,begins:Number(localStorage.getItem('cellbound-test-dungeon-begins-v1'))||0};
  });
  assert.equal(resumed.resumed,true,'refresh during a saved combat phase resumes the existing dungeon attempt');
  assert.equal(resumed.attemptId,'qa-attempt-1','refresh preserves the server attempt id');
  assert.equal(resumed.phase,'combat','refresh preserves the active combat phase');
  assert.equal(resumed.stage,2,'refresh preserves dungeon stage progress');
  assert.equal(resumed.begins,1,'refresh/resume does not create a duplicate dungeon attempt');
  assert.equal(resumeErrors.filter(e=>!e.includes('Endgame state failed')).length,0,'dungeon refresh/resume abuse emitted no unexpected browser errors');
  await resumePage.close();
}

async function ownerDungeonGeneratorPlaythrough(browser){
  const page=await browser.newPage({viewport:{width:1024,height:1366}});
  const errors=await mount(page,matureState(),true);
  await page.waitForFunction(()=>document.querySelector('#cellboundOnboarding')?.hidden===true,{},{timeout:10000,polling:50});
  await page.waitForFunction(()=>window.CellboundAdmin?.role==='owner',{},{timeout:10000,polling:50});
  await page.evaluate(()=>CellboundGame.switchView('admin'));
  await page.waitForFunction(()=>Boolean(window.CellboundAdminBetaOps),{},{timeout:5000,polling:50});
  await page.waitForFunction(()=>Boolean(window.CellboundAdminAnalytics),{},{timeout:5000,polling:50});
  assert(await page.locator('.admin-workspace-nav').isVisible(),'Admin opens with focused workspace navigation');
  assert(await page.locator('[data-admin-panel-tab="overview"]').evaluate(el=>el.classList.contains('active')),'Admin defaults to Overview');

  await page.locator('[data-admin-panel-tab="reports"]').click();
  assert(await page.locator('#adminBetaReportQueue').isVisible(),'Reports workspace exposes beta triage');
  assert.equal(await page.locator('#adminBetaStatus').inputValue(),'open','Reports defaults to actionable open tickets');

  await page.locator('[data-admin-panel-tab="players"]').click();
  assert(await page.locator('#adminPlayerLookup').isVisible(),'Players workspace exposes targeted recovery');
  assert.equal(await page.locator('#adminPlayerRecoveryActions [data-recover-player]').count(),3,'recovery console exposes only the three audited support actions');

  await page.locator('[data-admin-panel-tab="analytics"]').click();
  assert(await page.locator('#adminAnalyticsKpis').isVisible(),'Analytics workspace exposes Beta Analytics');
  await page.waitForFunction(()=>document.querySelector('#adminAnalyticsClasses')?.textContent?.includes('Warrior'),{},{timeout:5000,polling:50});
  assert((await page.locator('#adminAnalyticsDungeons').innerText()).includes('The Ashen Vault'),'analytics dashboard renders dungeon starts and clears');
  assert((await page.locator('#adminAnalyticsRaces').innerText()).includes('Veyren'),'analytics dashboard renders race popularity');
  assert.equal(await page.locator('#adminAnalyticsChannel').inputValue(),'staging','dev analytics defaults to the staging channel');

  await page.locator('[data-admin-panel-tab="tools"]').click();
  await page.waitForSelector('#designBoothEntry:not([hidden])',{timeout:5000});
  assert(await page.locator('#designBoothEntry').isVisible(),'owner Design Booth appears inside Tools workspace');
  await page.locator('#openDesignBooth').click();
  await page.locator('[data-dbo-tool="generator"]').click();
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

module.exports={mount,matureState,coreLoopState};

if(require.main===module){
(async()=>{
  const browser=await engine.launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
  try{
    await creatorPlaythrough(browser);
    await creatorPlaythrough(browser,{width:390,height:844});
    await persistenceReloadPlaythrough(browser);
    await mainGamePlaythrough(browser);
    await coreGameplayLoopPlaythrough(browser);
    await classAvailabilityAndNullGatePlaythrough(browser);
    await breakGamePlaythrough(browser);
    await ownerDungeonGeneratorPlaythrough(browser);
    console.log('Full Cellbound browser playthrough passed: creator, save/reload recovery, onboarding persistence, all-class staging access, all dungeon content retained, Manor-gated Null Complex, adversarial corrupted-save repair, rapid-action protection, Cell Shock recovery, dungeon refresh/resume, party, quest/dungeon shell, loot Bank, dismantle, crafting completion, equipment progression, harder-content unlock, activities, raids, market, PvP/social shell, beta support intake, admin triage/recovery, beta analytics, owner dungeon generator and responsive layouts.');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
}
