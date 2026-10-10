'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const {mount,matureState}=require('./full-playthrough.browser.cjs');
(async()=>{
 const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true});
 const page=await browser.newPage({viewport:{width:1366,height:1024},hasTouch:true});
 page.on('dialog',d=>d.accept());
 await mount(page,matureState(),true);
 try{
  await page.waitForFunction(()=>window.CellboundBoothWorkflow&&window.CellboundGame?.ready);
  await page.evaluate(()=>{
   const client=CellboundGame.getSupabase(),original=client.rpc.bind(client);
   window.boothFixture={rows:{},role:'editor',offline:false};
   client.rpc=async(name,a)=>{
    if(name!=='cellbound_booth')return original(name,a);
    const f=window.boothFixture,k=a.p_kind+':'+a.p_key,row=f.rows[k];
    if(f.offline)return{error:{message:'Offline test'}};
    if(a.p_action==='access')return{data:{role:f.role,scopes:['adventure','template'],can_publish:f.role==='owner'}};
    if(a.p_action==='list')return{data:Object.values(f.rows).filter(x=>x.kind===a.p_kind)};
    if(a.p_action==='members'||a.p_action==='history')return{data:[]};
    if(a.p_action==='get')return{data:{draft:row||null,published:null}};
    if((row?.revision||0)!==a.p_revision)return{error:{code:'40001',message:'Stale'}};
    if(a.p_action==='save')f.rows[k]={kind:a.p_kind,key:a.p_key,payload:a.p_payload,revision:(row?.revision||0)+1,state:'draft',updated_at:new Date().toISOString()};
    else if(a.p_action==='submit')Object.assign(row,{state:'review',revision:row.revision+1});
    else return{error:{message:'Mutation not implemented by UI fixture'}};
    return{data:JSON.parse(JSON.stringify(f.rows[k]))};
   };
   window.CellboundAdmin.isAdmin=false;window.CellboundAdmin.role=null;
  });
  await page.evaluate(()=>CellboundBoothWorkflow.connect());
  await page.locator('#boothContributorEntry').click();
  assert(await page.locator('#boothContributorOverlay').isVisible(),'Contributor opens Booth without entering game admin');
  assert.equal(await page.locator('[data-dbo-tool]').count(),2,'Only scoped editors are offered');
  await page.evaluate(()=>{window.boothPreviewResult=CellboundComicScenes.show({title:'Contributor preview',boothPreview:true,panels:[{title:'Preview panel',text:'Private preview'}],storyOnly:true})});
  await page.locator('#cellboundComicScene [data-comic-continue]').click();
  assert(await page.locator('#cellboundComicScene').isHidden(),'Contributor can interact with the existing preview above the editor overlay');
  const result=await page.evaluate(async()=>{
   const w=CellboundBoothWorkflow,p={slug:'ui-test',title:'UI Test',content_type:'quest',blueprint:{steps:[]}};
   const saved=await w.save('adventure','ui-test',p,0);
   let stale='';try{await w.save('adventure','ui-test',{...p,title:'Stale'},0)}catch(e){stale=e.message}
   const recovered=w.recovery('adventure','ui-test');
   boothFixture.offline=true;let offline='';try{await w.save('adventure','ui-test',{...p,title:'Offline'},saved.revision)}catch(e){offline=e.message}
   boothFixture.offline=false;
   return{saved:saved.revision,stale,recovered:recovered.payload.title,offline,recovery:w.recovery('adventure','ui-test').payload.title};
  });
  assert.equal(result.saved,1);assert.match(result.stale,/Conflict/);assert.equal(result.recovered,'Stale');assert.equal(result.recovery,'Offline');assert.match(result.offline,/Offline/);
  await page.locator('.booth-workflow-panel summary').click();
  await page.waitForSelector('[data-booth-action="submit"]');
  assert.equal(await page.locator('[data-booth-action="publish"]').count(),0,'Editor has no publishing action');
  await page.locator('[data-booth-action="compare"]').click();
  assert(await page.locator('[data-booth-details="0"]').innerText().then(t=>t.includes('UI Test')),'Version comparison displays actual proposed values');
  await page.locator('[data-booth-action="submit"]').click();
  await page.waitForFunction(()=>document.querySelector('.booth-review small')?.textContent.includes('review'));
  await page.evaluate(async()=>{boothFixture.role='viewer';await CellboundBoothWorkflow.connect();await CellboundDesignBooth.open()});
  assert.equal(await page.locator('#dboSave').isDisabled(),true,'Viewer cannot edit or save in the UI');
  assert.equal(await page.locator('#boothContributorOverlay').evaluate(e=>e.scrollWidth<=e.clientWidth+2),true,'13-inch iPad landscape has no page overflow');
  console.log('Booth workflow browser passed: scoped contributor entry, cloud confirmation, stale/offline recovery, review comparison, submit and viewer controls.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
