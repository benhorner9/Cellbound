'use strict';
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),assert=require('node:assert/strict');
const owner='00000000-0000-0000-0000-000000000001',player='00000000-0000-0000-0000-000000000002';
const sql=fs.readFileSync('server/episodes/release-schema.sql','utf8');
async function fixture(environment){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key);insert into auth.users values('${owner}'),('${player}');
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.cellbound_admins(user_id uuid,role text);insert into public.cellbound_admins values('${owner}','owner');
 create table public.guild_accounts(user_id uuid primary key,game_state jsonb,updated_at timestamptz);`);
 await db.exec(sql);
 await db.query('insert into episode_private.environment values(true,$1,$2,1,6)',[environment,'build-a']);
 // Implemented-content fixture only: this does not claim Episode 2 is built.
 await db.exec("update episode_private.registry set built=true,minimum_build='build-a' where id='episode_2'");
 const as=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
 const call=async(action,payload={})=>(await db.query('select public.cellbound_episodes($1,$2::jsonb) result',[action,JSON.stringify(payload)])).rows[0].result;
 await as(player);await call('load');
 return {db,as,call};
}
(async()=>{
 const dev=await fixture('isolated-development'),official=await fixture('production');let checks=0;
 const reject=async(fn,pattern)=>{await assert.rejects(fn,pattern);checks++;};
 const start={episode:'episode_2',content:'e2_q01',build:'build-a'};
 try{
  assert.equal((await dev.call('list')).episodes.length,7);checks++;
  assert.equal((await official.call('list')).episodes.length,1);checks++;
  assert.equal((await dev.call('load')).progression_cap,30);checks++;
  assert.equal((await official.call('load')).progression_cap,15);checks++;
  await reject(()=>dev.call('start',start),/Null Complex narrative/);
  await reject(()=>official.call('start',{...start,environment:'isolated-development',accessMode:'development-open',isOwner:true}),/temporarily unavailable/);
  await reject(()=>official.db.exec("update episode_private.environment set name='isolated-development'"),/permission denied/);
  const state={gold:100,questSystem:{nullComplex:{complete:true}},episode2:{unlocked:['e2_q01']},party:{tank:'a',healer:'b',dps:['c','d','e']},roster:['a','b','c','d','e'].map(id=>({id,level:15,xp:0}))};
  for(const context of [dev,official]){await context.db.exec('reset role');await context.db.query('update episode_private.saves set state=$1 where user_id=$2',[JSON.stringify(state),player]);await context.as(player);}
  const session=await dev.call('start',start);assert.equal(session.preview,false);checks++;
  assert.equal(session.user_id,player);checks++;
  await reject(()=>official.call('settle',{session:session.id}),/Unknown session/);
  await reject(()=>official.call('start',start),/temporarily unavailable/);
  await dev.as(owner);await reject(()=>dev.call('transition',{episode:'episode_2',state:'private_testing',revision:0,environment:'production',confirm:'episode_2'}),/official game/);
  // A new deployment changes the build, not release state.
  await official.db.exec('reset role');await official.db.exec("update episode_private.environment set build='build-b';update episode_private.registry set minimum_build='build-b' where id='episode_2'");
  await official.as(player);await reject(()=>official.call('start',{...start,build:'build-b'}),/temporarily unavailable/);
  await official.as(owner);assert.equal((await official.call('list')).episodes.find(e=>e.id==='episode_2').state,'in_development');checks++;
  const transition=(state,revision)=>official.call('transition',{episode:'episode_2',state,revision,environment:'production',confirm:'episode_2'});
  await reject(()=>official.call('transition',{episode:'episode_2',state:'private_testing',revision:0,environment:'isolated-development',confirm:'episode_2'}),/Confirm exact/);
  await transition('private_testing',0);await reject(()=>transition('ready',1),/evidence/);
  await official.db.exec('reset role');await official.db.exec(`insert into episode_private.evidence select 'episode_2',c,'build-b',1,1,true,'automated','fixture://executed-release-policy',now()
  from unnest(array['quest_stages','dungeon_encounters','raid_encounters','progression','rewards','blocking_bugs','migration','characters','equipment','account_isolation','browsers','artwork','deployment','campaign_playthrough'])c`);
  await official.as(owner);await transition('ready',1);
  await official.as(player);await reject(()=>official.call('start',{...start,build:'build-b'}),/temporarily unavailable/);
  await official.as(owner);await transition('live',2);
  await official.as(player);assert.equal((await official.call('start',{...start,build:'build-b'})).preview,false);checks++;
  await official.as(owner);await transition('paused',3);
  await official.as(player);await reject(()=>official.call('start',{...start,build:'build-b'}),/temporarily unavailable/);
  assert.deepEqual((await official.call('load')).state,state);checks++;
  await dev.as(player);assert.equal((await dev.call('start',start)).episode,'episode_2');checks++;
  assert.equal((await dev.call('list')).episodes.find(e=>e.id==='episode_2').state,'in_development');checks++;
  console.log(`Episode environment isolation: ${checks} assertions passed across TWO disposable PostgreSQL databases. Dev open; official deployment does not activate; owner activation and pause enforced.`);
 }finally{await dev.db.close();await official.db.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
