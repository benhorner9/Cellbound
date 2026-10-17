'use strict';
const assert=require('node:assert/strict'),fs=require('fs');
const {createStore,seed,PLAYER}=require('../tools/morrowfields-test-store.cjs');
const {createOpeningAuthority}=require('../server/episodes/opening-authority.cjs');
const {createNullAuthority}=require('../server/episodes/null-authority.cjs');
(async()=>{
 const initial=seed();initial.questSystem.nullComplex={complete:false};initial.progression.manorRaidCleared=true;
 const {db,store,rpc}=await createStore(initial);let now=1e6;
 try{
 await db.exec("delete from episode_private.environment;alter table auth.users add email text,add email_confirmed_at timestamptz;alter table public.cellbound_admins add unique(user_id)");
 await db.exec(fs.readFileSync('supabase/migrations/20261017145518_development_episode_authority.sql','utf8'));
 store.commitNull=(u,r,b,s,n)=>rpc('cellbound_null_commit',[u,r,b,JSON.stringify(s),JSON.stringify(n)]);
 const opening=createOpeningAuthority({store,clock:()=>now});const nullStory=createNullAuthority({store,clock:()=>now,runtime:opening.runtime,replay:opening.replay});
 const call=async(action,extra={})=>{const r=await store.load(PLAYER);return (action.startsWith('null-')?nullStory:opening).act(PLAYER,{action,build:'dev-opening-20261017',revision:r.account.revision,...extra});};
 await assert.rejects(()=>call('start'),/verified Null/);
 let r=await call('null-start');
 while(!r.complete){const step=opening.runtime.CellboundNullStoryData.steps[r.run.index];
 if(step.encounter){r=await call('null-battle-start',{step:step.id});now+=180000;r=await call('null-battle-finish',{step:step.id,attempt:r.run.attempt.id,commands:[]});assert.equal(r.run.attempt.status,'victory');}
 else r=await call(step.choices?'null-choice':'null-panel',{step:step.id,choice:step.answer});}
 assert.equal((await store.load(PLAYER)).finaleProof,true);const gold=r.account.state.gold;
 await call('null-start');assert.equal((await store.load(PLAYER)).account.state.gold,gold,'Finale rewards cannot repeat');
 await call('start');for(let panel=0;panel<3;panel++)await call('intro-panel',{panel});await call('briefing');await call('visit',{location:'fenstead'});await call('meet-mara');await call('visit',{location:'wagon'});for(const clue of ['tracks','container','soil','device'])await call('clue',{clue});
 r=await call('battle-start');now+=180000;r=await call('battle-finish',{attempt:r.attempt.id,commands:[]});assert.equal(r.attempt.status,'victory');await call('recover');for(let panel=0;panel<3;panel++)r=await call('outro-panel',{panel});
 assert.equal(r.account.state.gold,gold+180);assert(r.account.state.roster.every(c=>c.level===16));
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[PLAYER]);
 const save=async state=>rpc('cellbound_episodes',['save',JSON.stringify({build:'dev-opening-20261017',saveVersion:6,revision:(await store.load(PLAYER)).account.revision,state})]);
 const edit=structuredClone(r.account.state);edit.roster[0].name='Renamed at 16';await save(edit);assert.equal((await store.load(PLAYER)).account.state.roster[0].name,'Renamed at 16');
 edit.roster[0].level=15;await assert.rejects(()=>save(edit),/Protected progression/);
 const forged=structuredClone(r.account.state);forged.episode2.quests.e2_q01.complete=false;await assert.rejects(()=>save(forged),/verified settlement/);
 assert.equal((await db.query('select game_state from guild_accounts where user_id=$1',[PLAYER])).rows[0].game_state.roster[0].level,16);
 await db.query("update guild_accounts set game_state=jsonb_set(game_state,'{gold}','6000') where user_id=$1",[PLAYER]);assert.equal((await store.load(PLAYER)).account.state.gold,6000);
 await db.exec('set role authenticated');await assert.rejects(()=>rpc('cellbound_null_commit',[PLAYER,0,'dev-opening-20261017','{}','{}']),/permission denied/);
 console.log('PASS: actual Null combat verification → trusted finale → complete Morrowfields → idempotent rewards → Level 16 editing/saving → legacy RPC mirror; direct settlement and downgrade denied.');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
