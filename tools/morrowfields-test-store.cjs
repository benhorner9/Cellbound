'use strict';
const {PGlite}=require('@electric-sql/pglite'),fs=require('node:fs');
const PLAYER='00000000-0000-0000-0000-000000000001',OTHER='00000000-0000-0000-0000-000000000002';
function seed(){return{saveVersion:6,gearVersion:3,gold:5000,renown:120,roster:[['tank','Warrior','Protection'],['heal','Paladin','Holy'],['mage','Mage','Arcane'],['hunt','Hunter','Beast Mastery'],['rogue','Rogue','Assassination']].map(([id,klass,spec])=>({id,name:klass,race:'Veyren',class:klass,spec,level:15,xp:0,power:70,equipment:{},gearItems:[],talents:{},knowledge:{},cellShock:0,professions:[null]})),party:{tank:'tank',healer:'heal',dps:['mage','hunt','rogue']},bossKills:{ashwarden:true,embermaw:true,vaultheart:true},questSystem:{nullComplex:{started:true,complete:true,stage:'complete',done:['escape']}},progression:{nullComplexUnlocked:true},reports:[],bank:[],materials:{},consumables:[],recipeScrolls:[],discoveredRecipes:[],tradeInbox:[],collectionHistory:[],activity:[],onboarding:{version:3,complete:true,stage:'complete',zone:'zeltira'}}}
async function createStore(initial=seed()){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${PLAYER}'),('${OTHER}');
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create table public.cellbound_admins(user_id uuid,role text);create table public.guild_accounts(user_id uuid primary key,game_state jsonb,updated_at timestamptz);grant select,insert,update on public.guild_accounts to authenticated;`);
 await db.exec(fs.readFileSync('server/episodes/release-schema.sql','utf8'));await db.exec(fs.readFileSync('server/episodes/opening-schema.sql','utf8'));
 await db.exec("insert into episode_private.environment values(true,'isolated-development','local-dev',1,6)");
 for(const id of [PLAYER,OTHER])await db.query('insert into episode_private.saves(user_id,save_version,state) values($1,6,$2)',[id,JSON.stringify(initial)]);
 const rpc=async(name,args)=>(await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args)).rows[0].result;
 const store={load:user=>rpc('cellbound_opening_load',[user]),commit:(user,rev,build,state,attempt)=>rpc('cellbound_opening_commit',[user,rev,build,JSON.stringify(state),JSON.stringify(attempt)])};
 const proof=async user=>db.query("insert into episode_private.story_proofs(user_id,story,proof_digest,verifier_build) values($1,'signal-from-nowhere',repeat('a',64),'EXPLICIT-TEST-FIXTURE') on conflict do nothing",[user]);
 return{db,store,proof,rpc,PLAYER,OTHER};
}
module.exports={createStore,seed,PLAYER,OTHER};
