'use strict';
// Executes the actual migration and RPC under PostgreSQL roles, not a JS model.
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key);create table public.cellbound_admins(user_id uuid,role text);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create function public.cellbound_is_owner() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.cellbound_admins where user_id=auth.uid() and role='owner') $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(bucket_id text);
 create table public.cellbound_room_layouts(content_id text,room_id text,layout jsonb,version bigint default 1,published_by uuid,published_at timestamptz default now(),primary key(content_id,room_id));`);
 for(const file of ['20261008102000_cellbound_design_booth_blueprints_v1.sql','20261008200000_cellbound_design_templates.sql','20261008093000_room_background_art_uploads.sql','20261008094000_comic_scene_editor_art_uploads.sql','20261009171000_pvp_design_booth_maps.sql','20261008141500_cellbound_boss_drop_tables_v1.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 const ids=Array.from({length:5},(_,i)=>'00000000-0000-0000-0000-00000000000'+(i+1));
 await db.exec(`insert into auth.users values ${ids.map(x=>"('"+x+"')").join(',')};insert into public.cellbound_admins values ('${ids[0]}','owner');`);
 await db.exec("set cellbound.booth_environment='isolated-development'");
 await db.exec(fs.readFileSync('supabase/migrations/20261010135709_design_booth_secure_publishing.sql','utf8'));
 const as=async i=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[i===null?'':ids[i]]);await db.exec('set role authenticated')};
 const call=async(action,kind='',key='',revision=0,payload={})=>(await db.query('select public.cellbound_booth($1,$2,$3,$4,$5::jsonb) result',[action,kind,key,revision,JSON.stringify(payload)])).rows[0].result;
 let checks=0;
 const denied=async fn=>{await assert.rejects(fn);checks++};
 await as(0);
 for(const [i,role] of [[1,'editor'],[2,'viewer'],[3,'admin']])await call('grant','','',0,{user_id:ids[i],role,scopes:['adventure'],can_publish:false});
 await denied(()=>call('grant','','',0,{user_id:ids[0],role:'viewer',scopes:[]}));
 await as(4);await denied(()=>call('list','adventure'));await denied(()=>call('grant','','',0,{user_id:ids[4],role:'admin'}));
 await as(null);await denied(()=>call('access'));
 await as(1);
 const payload={slug:'test-quest',title:'Test Quest',content_type:'quest',blueprint:{steps:[{id:'room',type:'room',title:'Room',artPath:'test/room.webp'}]}};
 let d=await call('save','adventure','test-quest',0,payload);assert.equal(d.revision,1);checks++;
 await denied(()=>call('save','adventure','test-quest',0,payload));
 await denied(()=>call('publish','adventure','test-quest',1));
 await denied(()=>call('save','template','test-template',0,{}));
 await denied(()=>db.exec("insert into public.cellbound_design_blueprints(slug,title,content_type) values('bypass','Bypass','quest')"));
 await as(2);await denied(()=>call('save','adventure','test-quest',1,payload));
 assert.equal((await call('get','adventure','test-quest')).draft.payload.title,'Test Quest');checks++;
 await as(1);d=await call('submit','adventure','test-quest',1);await denied(()=>call('approve','adventure','test-quest',d.revision));
 await as(3);d=await call('approve','adventure','test-quest',d.revision);await denied(()=>call('publish','adventure','test-quest',d.revision));
 await as(0);d=await call('publish','adventure','test-quest',d.revision);assert.equal(d.state,'published');checks++;
 await as(4);await denied(()=>db.exec('select draft_blueprint from public.cellbound_design_blueprints'));
 assert.equal((await db.query('select title from public.cellbound_design_blueprints')).rows[0].title,'Test Quest');checks++;
 await as(1);d=await call('save','adventure','test-quest',d.revision,{...payload,title:'Revision Two'});
 d=await call('submit','adventure','test-quest',d.revision);
 await as(0);d=await call('approve','adventure','test-quest',d.revision);d=await call('publish','adventure','test-quest',d.revision);
 let history=await call('history','adventure','test-quest');assert.equal(history.length,2);assert.equal(history[0].before_data.title,'Test Quest');checks++;
 await as(3);await denied(()=>call('rollback','adventure','test-quest',d.revision,{history_id:history[0].id}));
 await as(0);d=await call('rollback','adventure','test-quest',d.revision,{history_id:history[0].id});
 assert.equal((await db.query('select title from public.cellbound_design_blueprints')).rows[0].title,'Test Quest');checks++;
 await denied(()=>call('rollback','adventure','another-key',0,{history_id:history[0].id}));
 // Editing after approval invalidates it. A failed write rolls back every change.
 d=await call('save','adventure','test-quest',d.revision,{...payload,content_type:'invalid'});
 d=await call('submit','adventure','test-quest',d.revision);d=await call('approve','adventure','test-quest',d.revision);
 await denied(()=>call('publish','adventure','test-quest',d.revision));
 assert.equal((await call('history','adventure','test-quest')).length,3);assert.equal((await call('get','adventure','test-quest')).draft.revision,d.revision);checks++;
 d=await call('save','adventure','test-quest',d.revision,payload);await denied(()=>call('publish','adventure','test-quest',d.revision));
 await call('revoke','','',0,{user_id:ids[1]});await as(1);await denied(()=>call('get','adventure','test-quest'));
 await as(0);await denied(()=>call('delete','adventure','test-quest',d.revision));

 // Exercise every publication adapter, including composite room/panel keys.
 const adapters=[
 ['template','studio-room-test',{slug:'studio-room-test',title:'Test Room',kind:'room',blueprint:{title:'Room'}}],
 ['room-layout','ashen-vault/kael',{content_id:'ashen-vault',room_id:'kael',layout:{markers:[{kind:'party',x:40,y:60}]}}],
 ['room-art','ashen-vault/kael',{content_id:'ashen-vault',room_id:'kael',object_path:'room/one.webp'}],
 ['comic-art','scene-test/0',{scene_id:'scene-test',panel_index:0,object_path:'comic/one.webp'}],
 ['comic-text','scene-test',{scene_id:'scene-test',panels:[{title:'Caption',text:'Published text'}]}],
 ['pvp-map','test-arena',{id:'test-arena',mode:'arena',title:'Test Arena',layout:{},art_path:null}],
 ['boss-drops','ashen:kael',{boss_key:'ashen:kael',drops:[{kind:'material',key:'ore',chance:50,quantity:1}]}]
 ];
 for(const [kind,key,p] of adapters){
  let r=await call('save',kind,key,0,p);r=await call('submit',kind,key,r.revision);r=await call('approve',kind,key,r.revision);r=await call('publish',kind,key,r.revision);
  assert.equal(r.state,'published');assert.equal((await call('history',kind,key)).length,1);checks++;
 }
 // Changed public row blocks publishing even when the draft revision is current.
 let conflict=await call('save','adventure','test-quest',d.revision,payload);
 conflict=await call('submit','adventure','test-quest',conflict.revision);conflict=await call('approve','adventure','test-quest',conflict.revision);
 await db.exec('reset role');await db.exec("update public.cellbound_design_blueprints set title='External change' where slug='test-quest'");await as(0);
 await denied(()=>call('publish','adventure','test-quest',conflict.revision));
 // Editor/admin grants never modify the owner registry; granted publisher works.
 await call('grant','','',0,{user_id:ids[3],role:'admin',scopes:['template'],can_publish:true});await as(3);
 let allowed=await call('save','template','studio-room-second',0,{slug:'studio-room-second',title:'Second Room',kind:'room',blueprint:{}});
 allowed=await call('submit','template','studio-room-second',allowed.revision);allowed=await call('approve','template','studio-room-second',allowed.revision);allowed=await call('publish','template','studio-room-second',allowed.revision);
 assert.equal(allowed.state,'published');checks++;
 await denied(()=>db.exec("update booth_private.members set can_publish=true"));
 await denied(()=>call('get','room-layout','ashen-vault/kael'));

 await as(0);let archived=(await call('get','room-art','ashen-vault/kael')).draft;
 await as(3);await denied(()=>call('archive','room-art','ashen-vault/kael',archived.revision));
 await as(0);archived=await call('archive','room-art','ashen-vault/kael',archived.revision);
 assert.equal((await call('get','room-art','ashen-vault/kael')).published,null);checks++;
 const archivedVersion=(await call('history','room-art','ashen-vault/kael'))[0];
 archived=await call('rollback','room-art','ashen-vault/kael',archived.revision,{history_id:archivedVersion.id});
 assert.equal((await call('get','room-art','ashen-vault/kael')).published.object_path,'room/one.webp');checks++;
 // Job 10A uses the existing fight-template and adventure schemas unchanged.
 const modelBox={window:{}};require('node:vm').runInNewContext(fs.readFileSync('enemy-builder-model-v1.js','utf8'),modelBox);
 const model=modelBox.window.CellboundEnemyModel,spec=model.fresh(),enemyKey='studio-fight-security';
 await as(0);await call('grant','','',0,{user_id:ids[1],role:'editor',scopes:['template','adventure'],can_publish:false});
 await call('grant','','',0,{user_id:ids[2],role:'viewer',scopes:['template'],can_publish:false});
 await as(1);
 const enemyPayload={slug:enemyKey,kind:'fight',title:spec.name,blueprint:model.stage(spec)};
 let enemy=await call('save','template',enemyKey,0,enemyPayload);
 assert.equal((await call('get','template',enemyKey)).published,null);checks++;
 assert.equal((await call('get','template',enemyKey)).draft.payload.blueprint.enemySpec.phases[0].atPct,50);checks++;
 await denied(()=>call('publish','template',enemyKey,enemy.revision));
 await as(2);await denied(()=>call('save','template',enemyKey,enemy.revision,enemyPayload));
 await as(1);enemy=await call('submit','template',enemyKey,enemy.revision);
 await denied(()=>call('approve','template',enemyKey,enemy.revision));
 await as(0);enemy=await call('approve','template',enemyKey,enemy.revision);enemy=await call('publish','template',enemyKey,enemy.revision);
 const first=JSON.parse(JSON.stringify(enemyPayload));enemyPayload.blueprint.enemySpec.health=2400;
 enemy=await call('save','template',enemyKey,enemy.revision,enemyPayload);
 assert.equal((await call('get','template',enemyKey)).published.blueprint.enemySpec.health,1500);checks++;
 enemy=await call('submit','template',enemyKey,enemy.revision);enemy=await call('approve','template',enemyKey,enemy.revision);enemy=await call('publish','template',enemyKey,enemy.revision);
 const versions=await call('history','template',enemyKey);assert.equal(versions[0].before_data.blueprint.enemySpec.health,1500);checks++;
 enemy=await call('rollback','template',enemyKey,enemy.revision,{history_id:versions[0].id});
 assert.equal((await call('get','template',enemyKey)).published.blueprint.enemySpec.health,1500);checks++;
 const adventureKey='enemy-dungeon-test',adventurePayload={slug:adventureKey,title:'Enemy Dungeon',content_type:'dungeon',blueprint:{level:1,steps:[{...first.blueprint,id:'boss-stage'}]}};
 let dungeon=await call('save','adventure',adventureKey,0,adventurePayload);
 dungeon=await call('submit','adventure',adventureKey,dungeon.revision);dungeon=await call('approve','adventure',adventureKey,dungeon.revision);dungeon=await call('publish','adventure',adventureKey,dungeon.revision);
 assert.equal((await call('get','adventure',adventureKey)).published.blueprint.steps[0].enemySpec.health,1500);checks++;
 await as(4);await denied(()=>call('get','template',enemyKey));
 const publicEnemy=(await db.query("select blueprint from public.cellbound_design_templates where slug=$1",[enemyKey])).rows[0].blueprint;
 assert.equal(model.encounter(publicEnemy.enemySpec).phases[0].atPct,50);checks++;
 await db.close();console.log('Booth PostgreSQL security, save, conflict, publish and rollback: '+checks+' checks passed');
})().catch(e=>{console.error(e);process.exit(1)});
