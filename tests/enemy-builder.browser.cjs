'use strict';
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict');
const {mount,matureState}=require('./full-playthrough.browser.cjs');
(async()=>{
 const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true});
 const page=await browser.newPage({viewport:{width:1366,height:1024},hasTouch:true});page.on('dialog',d=>d.accept());
 await mount(page,matureState(),true);
 const setup=async(rows={})=>{await page.waitForFunction(()=>window.CellboundEnemyBuilder&&window.CellboundGame?.ready);await page.evaluate(rows=>{
  const client=CellboundGame.getSupabase(),original=client.rpc.bind(client);window.enemyFixture={rows,role:'editor'};
  client.rpc=async(name,a)=>{
   if(name!=='cellbound_booth')return original(name,a);const f=enemyFixture,k=a.p_kind+':'+a.p_key,r=f.rows[k];
   if(f.offline)return{error:{message:'Offline'}};
   if(a.p_action==='access')return{data:{role:f.role,scopes:['template','adventure'],can_publish:false}};
   if(a.p_action==='list')return{data:Object.values(f.rows).filter(x=>x.kind===a.p_kind)};
   if(a.p_action==='get')return{data:{draft:r||null,published:r?.base||null}};
   if(a.p_action==='members'||a.p_action==='history')return{data:[]};
   if((r?.revision||0)!==a.p_revision)return{error:{code:'40001',message:'Stale'}};
   if(f.role==='viewer')return{error:{message:'Permission denied'}};
   if(a.p_action==='save')f.rows[k]={kind:a.p_kind,key:a.p_key,payload:JSON.parse(JSON.stringify(a.p_payload)),revision:(r?.revision||0)+1,state:'draft',updated_at:new Date().toISOString()};
   else if(a.p_action==='submit')Object.assign(r,{state:'review',revision:r.revision+1});
   else return{error:{message:'Permission denied'}};
   return{data:JSON.parse(JSON.stringify(f.rows[k]))};
  };CellboundAdmin.isAdmin=false;CellboundAdmin.role=null;
 },rows);await page.evaluate(()=>CellboundBoothWorkflow.connect());await page.locator('#boothContributorEntry').click();await page.locator('[data-dbo-tool="enemies"]').click()};
 try{
  await setup();await page.locator('[data-eb="name"]').fill('Clockwork Sentinel');await page.locator('[data-eb="health"]').fill('12000');
  await page.waitForFunction(()=>Object.values(enemyFixture.rows).some(r=>r.payload.title==='Clockwork Sentinel'));
  const cloud=await page.evaluate(()=>enemyFixture.rows),slug=Object.values(cloud)[0].key;
  assert.equal(Object.values(cloud)[0].state,'draft');
  // Remove device recovery then reload: reopening must use cloud data.
  await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.startsWith('cellbound-enemy-builder')||k.startsWith('cellbound-booth-recovery'))localStorage.removeItem(k)});
  await page.reload();await setup(cloud);await page.locator('#ebPicker').selectOption(slug);
  assert.equal(await page.locator('[data-eb="name"]').inputValue(),'Clockwork Sentinel');assert.equal(await page.locator('[data-eb="health"]').inputValue(),'12000');
  await page.locator('[data-eb-tab="phases"]').click();await page.locator('[data-eb="phases.0.atPct"]').fill('75');await page.locator('#ebSave').click();
  await page.waitForFunction(()=>Object.values(enemyFixture.rows)[0].payload.blueprint.enemySpec.phases[0].atPct===75);
  await page.locator('[data-dbo-tool="build"]').click();await page.locator('#dboNewDungeon').click();
  await page.locator('[data-dbo-tool="enemies"]').click();await page.locator('#ebInsert').click();
  const adventure=await page.evaluate(()=>CellboundDesignBooth.current());assert.equal(adventure.content_type,'dungeon');assert.equal(adventure.steps.at(-1).enemySpec.name,'Clockwork Sentinel');
  await page.locator('#dboSave').click();await page.waitForFunction(()=>Object.values(enemyFixture.rows).some(r=>r.kind==='adventure'&&r.payload.blueprint.steps.some(s=>s.enemySpec)));
  // Play the exact published-shaped stage through the real runtime and viewer, then exit safely.
  await page.evaluate(()=>{
   const run=CellboundQuests.runQuest2DFight;CellboundQuests.runQuest2DFight=function(c){window.enemyPlayedConfig=c;return run(c)};
   window.rewardCalls=[];for(const name of ['addBankItem','addMaterial','applyPartyCellShock','addGold','addXp'])if(CellboundGame[name])CellboundGame[name]=()=>rewardCalls.push(name);
   const row=Object.values(enemyFixture.rows).find(r=>r.kind==='adventure');window.enemyPlay=CellboundDesignedContent.play('fixture',{title:'Test dungeon',content_type:'dungeon',blueprint:{level:1,steps:[row.payload.blueprint.steps.at(-1)]}});
  });
  await page.locator('[data-q-close]').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('[data-combat-view="canonical-v1"]'));
  assert.equal(await page.evaluate(()=>enemyPlayedConfig.combat.designerEnemy),true);
  assert.equal(await page.evaluate(()=>enemyPlayedConfig.enemies[0].name),'Clockwork Sentinel');
  await page.locator('[data-q-close]').click();await page.locator('[data-db-finish]').click();
  assert.deepEqual(await page.evaluate(()=>rewardCalls),[],'Adventure preview grants nothing and applies no defeat penalty');
  // Load through the public query path, not an editor override.
  await page.evaluate(async()=>{
   const row=Object.values(enemyFixture.rows).find(r=>r.kind==='adventure'),client=CellboundGame.getSupabase(),original=client.from.bind(client);
   const published={id:'published-enemy-dungeon',slug:'published-enemy-dungeon',title:'Published enemy dungeon',content_type:'dungeon',blueprint:{level:1,steps:[row.payload.blueprint.steps.at(-1)]}};
   client.from=table=>table==='cellbound_design_blueprints'?{select:()=>({eq:()=>({order:async()=>({data:[published],error:null})})})}:original(table);
   await CellboundDesignedContent.refresh(true);window.publicEnemyPlay=CellboundDesignedContent.play(published.id);
  });
  await page.locator('[data-q-close]').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>enemyPlayedConfig.combat.phases[0].atPct),75,'Public runtime consumes the saved boss phase');
  await page.locator('[data-q-close]').click();await page.locator('[data-db-finish]').click();
  await page.locator('[data-dbo-tool="enemies"]').click();
  await page.locator('#ebPreview').click();await page.locator('[data-q-close]').waitFor({state:'visible'});await page.locator('[data-q-close]').click();
  await page.waitForFunction(()=>document.querySelector('#ebResult')?.textContent.includes('No rewards'));
  assert.deepEqual(await page.evaluate(()=>rewardCalls),[],'Dedicated preview has no reward calls');
  await page.locator('#ebSubmit').click();await page.waitForFunction(()=>Object.values(enemyFixture.rows).some(r=>r.kind==='template'&&r.state==='review'));
  assert.equal(await page.locator('[data-booth-action="publish"]').count(),0,'Editor cannot publish');
  await page.evaluate(async()=>{enemyFixture.role='viewer';await CellboundBoothWorkflow.connect()});
  assert(await page.locator('#ebSave').isDisabled());assert(await page.locator('#ebFields input').first().isDisabled());
  await page.setViewportSize({width:1024,height:1366});
  assert(await page.locator('#boothContributorOverlay').evaluate(e=>e.scrollWidth<=e.clientWidth+2),'iPad portrait fits');
  console.log('Enemy builder browser: cloud reload, autosave, phases, dungeon insertion/save, real Combat Reborn viewer, safe exit, reward safety, review and viewer permissions passed.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
