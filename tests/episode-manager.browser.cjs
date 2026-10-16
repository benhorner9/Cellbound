'use strict';
const {chromium,webkit}=require('playwright');
const {PGlite}=require('@electric-sql/pglite');
const assert=require('node:assert/strict'),fs=require('node:fs');
const {mount,matureState}=require('./full-playthrough.browser.cjs');
(async()=>{
 const db=new PGlite(),owner='00000000-0000-0000-0000-000000000001';
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 insert into auth.users values('${owner}');create function auth.uid() returns uuid language sql as $$select '${owner}'::uuid$$;
 create table public.cellbound_admins(user_id uuid,role text);insert into public.cellbound_admins values('${owner}','owner');
 create table public.guild_accounts(user_id uuid primary key,game_state jsonb,updated_at timestamptz);`);
 await db.exec(fs.readFileSync('server/episodes/release-schema.sql','utf8'));
 await db.exec("insert into episode_private.environment values(true,'isolated-development','browser-fixture',1,6);set role authenticated");
 const engine=process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium;
 const browser=await engine.launch({headless:true});
 try{
  for(const viewport of [{width:1366,height:1024},{width:390,height:844},{width:1440,height:900}]){
   const page=await browser.newPage({viewport});page.on('dialog',d=>d.accept());
   await page.exposeFunction('episodeDatabaseRpc',async(action,payload)=>{
    try{return {data:(await db.query('select public.cellbound_episodes($1,$2::jsonb) result',[action,JSON.stringify(payload)])).rows[0].result,error:null};}
    catch(e){return{data:null,error:{message:e.message}};}
   });
   const errors=await mount(page,matureState(),true);
   await page.waitForFunction(()=>window.CellboundAdmin?.role==='owner');
   await page.evaluate(()=>{
    const db=CellboundGame.getSupabase(),original=db.rpc.bind(db);
    db.rpc=(name,args)=>name==='cellbound_episodes'?window.episodeDatabaseRpc(args.p_action,args.p_payload):original(name,args);
    CellboundGame.switchView('admin');
   });
   await page.locator('[data-admin-panel-tab="episodes"]').click();
   await page.waitForSelector('.episode-manager-card');
   assert.equal(await page.locator('.episode-manager-card').count(),7);
   assert((await page.locator('#episodeManagerEnvironment').textContent()).includes('ISOLATED-DEVELOPMENT'));
   const episode=page.locator('.episode-manager-card').nth(1);
   if(await episode.getByRole('button',{name:'PRIVATE TESTING',exact:true}).count())await episode.getByRole('button',{name:'PRIVATE TESTING',exact:true}).click();
   await episode.getByRole('button',{name:'OPEN PRIVATE PREVIEW'}).click();
   await page.waitForSelector('.episode-content-row');
   assert.equal(await page.locator('.episode-content-row').count(),13);
   assert(await episode.getByRole('button',{name:'READY TO RELEASE',exact:true}).isDisabled());
   assert.equal(await page.locator('.episode-content-row button:not([disabled])').count(),0,'Missing encounters cannot be launched as fake previews');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   fs.mkdirSync('docs/qa/episode-manager',{recursive:true});
   await page.screenshot({path:`docs/qa/episode-manager/owner-${viewport.width}.png`,fullPage:true});
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('Episode Manager Chromium: 1366×1024, 390×844, 1440×900 passed; actual SQL release RPC via local test bridge. Auth shell mocked, not hosted Safari acceptance.');
 }finally{await browser.close();await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
