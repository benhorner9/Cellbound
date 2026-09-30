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
    ['heal','Mercy','Priest','Holy'],
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

async function mount(page,seedState=null){
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+String(e)));
  page.on('console',msg=>{if(msg.type()==='error')errors.push('console: '+msg.text())});
  await page.addInitScript(({seed})=>{
    window.__CELLBOUND_TEST_SEED=seed;
    const user={id:'playthrough-user',email:'playthrough@example.test'};
    function query(table){
      const q={};
      for(const method of ['select','eq','neq','gte','gt','lte','lt','like','ilike','is','in','contains','containedBy','or','not','order','limit','range','match']){
        q[method]=()=>q;
      }
      for(const method of ['insert','upsert','update','delete'])q[method]=()=>q;
      q.maybeSingle=async()=>({data:table==='guild_accounts'?{
        user_id:user.id,game_state:window.__CELLBOUND_TEST_SEED,
        membership_active_until:null,membership_override:false,updated_at:new Date().toISOString()
      }:null,error:null});
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
        if(name==='cellbound_social_identity')return{data:{staff_member:false,chat_badge:'player',player_mod_discount_eligible:false},error:null};
        return{data:[],error:null};
      },
      channel:()=>{const c={on:()=>c,subscribe:()=>c,unsubscribe:()=>Promise.resolve()};return c},
      removeChannel:async()=>true,
      functions:{invoke:async()=>({data:null,error:null})},
      storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}})})}
    };
    window.supabase={createClient:()=>client};
  },{seed:seedState});
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
  await page.waitForFunction(()=>window.CellboundGame?.ready===true,{},{timeout:10000});
  await page.waitForFunction(()=>Boolean(window.CellboundOnboarding),{},{timeout:10000});
  return errors;
}

async function creatorPlaythrough(browser){
  const page=await browser.newPage({viewport:{width:1024,height:1366}});
  const errors=await mount(page,null);
  await page.waitForSelector('#cellboundOnboarding:not([hidden]) .character-creator');
  assert.equal(await page.locator('.creator-party-dots button').count(),5,'creator shows all five party roles');

  await page.locator('[data-next-step="class"]').click();
  assert(await page.locator('[data-class]').count()>=1,'class choices render');
  const classLabels=await page.locator('[data-class] .class-choice, [data-class]').count();
  assert(classLabels>=1,'damage/tank/healer class choices remain usable');

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
  await page.waitForFunction(()=>window.CellboundGame.getState()?.roster?.length===5,{},{timeout:10000});
  const slots=await page.evaluate(()=>CellboundGame.getState().roster.map(c=>c.professions?.length));
  assert.deepEqual(slots,[1,1,1,1,1],'fresh characters start with exactly one profession slot');
  assert.deepEqual(errors,[],'creator/onboarding emitted no browser errors');
  await page.close();
}

async function mainGamePlaythrough(browser){
  const page=await browser.newPage({viewport:{width:1024,height:1366}});
  const errors=await mount(page,matureState());
  await page.waitForFunction(()=>document.querySelector('#cellboundOnboarding')?.hidden===true);
  assert.equal(await page.locator('#rosterCount').textContent(),'5 / 5');

  await page.evaluate(()=>{
    const s=CellboundGame.getState(),P=CellboundProfessions;
    for(const key of Object.keys(P.MATERIALS||{}))s.materials[key]=999;
    const gear=CellboundGear.items.find(x=>x.enabled!==false&&Number(x.tier)>=2);
    CellboundGame.addBankItem({...gear,id:'playthrough-gear',quantity:1,source:'Release playthrough'},false);
    const recipe=P.PROFESSIONS?.Alchemy?.recipes?.[0],out=recipe?.output;
    if(out?.category==='consumable')s.consumables.push({key:out.key,name:out.name,quantity:2,rarity:out.rarity||'Uncommon',payload:{...(out.payload||{})}});
    CellboundGame.renderAll();
  });

  CellboundViews=['overview','roster','party','bank','professions','quests','content','world','raids','trading','pvp','chat'];
  for(const view of CellboundViews){
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

(async()=>{
  const browser=await engine.launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
  try{
    await creatorPlaythrough(browser);
    await mainGamePlaythrough(browser);
    console.log('Full Cellbound browser playthrough passed: creator, party, roster, bank, professions, quests, dungeons, activities, raids, market, PvP/social shell and responsive layouts.');
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
