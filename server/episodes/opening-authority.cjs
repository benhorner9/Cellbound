'use strict';
/* Server-only opening chapter. Reuses the browser's exact combat and progression
 * sources in an isolated VM. No browser result, XP value, roster or clear flag is trusted. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {randomUUID,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const copy=v=>JSON.parse(JSON.stringify(v));
const check=(v,m)=>{if(!v)throw Error(m)};
function runtime(){
 const window={},context=vm.createContext({window,console});
 for(const name of ['balance-v1.js','class-build-v1.js','src/combat/combat-identities-v1.js','src/combat/combat-data-v1.js','src/combat/combat-reborn-v1.js','src/episodes/episode-two-v1.js','src/episodes/morrowfields-data-v1.js','src/episodes/null-story-data-v1.js'])
  vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context,{filename:name});
 return window;
}
function createOpeningAuthority({store,clock=Date.now,uuid=randomUUID,runtimeFactory=runtime}={}){
 check(store?.load&&store?.commit,'Trusted account store required');
 const w=runtimeFactory(),E=w.CellboundEpisodeTwo,D=w.CellboundMorrowfieldsData,C=w.CellboundCombatReborn;
 const stages=E.CONTENT.e2_q01.objectives.map(o=>o.id);
 function replay(attempt,commands){
  check(Array.isArray(commands)&&commands.length<=80,'Invalid command history');
  const s=C.createLiveSession(copy(attempt.options));let previous=0;
  for(const input of commands){
   check(input&&Number.isSafeInteger(input.at)&&input.at>=previous&&input.at<=180000&&input.at%100===0,'Invalid command time');
   check(Object.hasOwn(C.COMMAND_RULES,input.type),'Unknown command');
   check(input.targetId==null||/^e-[012]$/.test(input.targetId),'Invalid target');
   while(s.timeMs<input.at&&!s.finished)s.advance(Math.min(100,input.at-s.timeMs));
   check(!s.finished,'Command after combat ended');
   s.command(input.type,{targetId:input.targetId||null});previous=input.at;
  }
  while(!s.finished)s.advance(100);
  return copy(s.snapshot());
 }
 async function act(userId,request={}){
  check(typeof userId==='string'&&/^[0-9a-f-]{36}$/i.test(userId),'Authenticated account required');
  const record=await store.load(userId);
  check(record?.account&&record?.environment&&record?.episode,'Chapter service has not been provisioned');
  const {environment:env,episode:release}=record;
  check(request.build===env.build,'Update the game before continuing');
  check(env.name==='isolated-development'||env.name==='production'&&release.state==='live','Episode 2 has not been released');
  check(record.finaleProof===true&&E.finaleCompleted(record.account.state),'Complete the verified Null Complex narrative finale');
  let state=E.migrate(record.account.state,userId),attempt=record.attempt||{},q=state.episode2.quests.e2_q01;
  const now=clock(),at=new Date(now).toISOString();
  const transition=(type,extra={})=>{state=E.transition(state,userId,{type,contentId:'e2_q01',expectedRevision:state.episode2.revision,at,...extra}).state;q=state.episode2.quests.e2_q01};
  const current=()=>stages[q?.objectives?.length||0];
  const requireStage=id=>check(current()===id,'Complete the current objective first');
  const done=id=>transition('objective-complete',{objectiveId:id});
  const response=account=>({account,environment:env.name,build:env.build,attempt:attempt.id?{id:attempt.id,status:attempt.status,options:copy(attempt.options)}:null});
  if(request.action==='load')return response({...record.account,state});
  check(request.revision===record.account.revision,'Stale chapter state; reload required');
  if(request.action==='start'){
   if(!q){transition('quest-start');q.opening={intro:0,outro:0,clues:[],location:'zeltira',recovered:false};}
  }else{
   check(q?.opening,'Start After the Breach first');
   const p=q.opening;
   switch(request.action){
    case 'intro-panel':requireStage('transmission');check(request.panel===p.intro,'Read the current panel first');p.intro++;if(p.intro===3)done('transmission');break;
    case 'briefing':requireStage('briefing');done('briefing');q.opening.location='map';break;
    case 'visit':{
     const destination=request.location;
     check(['map','fenstead','east-fields','wagon','zeltira'].includes(destination),'Location is not playable');
     check(q.objectives.includes('briefing'),'Speak to Voss and Vey first');
     if(['east-fields','wagon'].includes(destination))check(q.objectives.includes('fenstead'),'Meet Mara Fen first');
     p.location=destination;break;
    }
    case 'meet-mara':requireStage('fenstead');check(p.location==='fenstead','Travel to Fenstead Farm');done('fenstead');break;
    case 'clue':requireStage('wagon');check(p.location==='wagon','Investigate the abandoned wagon');check(D.clues.some(c=>c.id===request.clue),'Unknown clue');if(!p.clues.includes(request.clue))p.clues.push(request.clue);if(p.clues.length===4)done('wagon');break;
    case 'battle-start':{
     requireStage('creatures');check(p.location==='wagon'||p.location==='east-fields','Return to the East Fields');
     if(attempt.status==='active'&&now-attempt.startedAt<240000)return response({...record.account,state});
     const ids=q.partyIds;
     const party=ids.map(id=>state.roster.find(c=>c.id===id));
     check(party.length===5&&party.every(c=>c&&c.level>=15),'Bring the original five adventurers at Level 15 or higher');
     // Only allowed standing orders are accepted, never combat stats or arbitrary tactics.
     const allowed=['all-aggro','boss-lock','damage','boss-burn','interrupt','adds','tank-first','group','triage'];
     const orders=Object.fromEntries(party.map(c=>[c.id,allowed.includes(request.orders?.[c.id])?request.orders[c.id]:undefined]).filter(([,v])=>v));
     attempt={id:uuid(),startedAt:now,status:'active',partyDigest:createHash('sha256').update(JSON.stringify(party)).digest('hex'),options:{party:copy(party),encounter:copy(D.encounter),seed:uuid(),tactics:{interruptPriority:'standard',addPriority:'immediate',defensiveUsage:'standard',pullStyle:'normal',movementDiscipline:'balanced',cooldownUse:'difficult',unitOrders:orders}}};
     break;
    }
    case 'battle-finish':{
     if(q.objectives.includes('creatures')&&attempt.id===request.attempt&&attempt.status==='victory')break;
     requireStage('creatures');check(attempt.id===request.attempt&&attempt.status==='active','Unknown active encounter');
     check(now-attempt.startedAt<240000,'Encounter expired; return to the field');
     const party=q.partyIds.map(id=>state.roster.find(c=>c.id===id));
     check(createHash('sha256').update(JSON.stringify(party)).digest('hex')===attempt.partyDigest,'Party changed; restart the encounter');
     const result=replay(attempt,request.commands||[]);
     check(now-attempt.startedAt>=result.durationMs/2,'Encounter has not finished yet');
     attempt.status=result.outcome;attempt.proof=createHash('sha256').update(JSON.stringify(result)).digest('hex');attempt.summary=result.summary;
     if(result.outcome==='victory')done('creatures');
     break;
    }
    case 'abandon':if(attempt.status==='active')attempt.status='abandoned';break;
    case 'recover':requireStage('component');check(attempt.status==='victory','Verified victory required');p.recovered=true;p.location='fenstead';break;
    case 'outro-panel':
     if(q.complete)break;
     requireStage('component');check(p.recovered&&p.location==='fenstead','Return the component to Tessa');check(request.panel===p.outro,'Read the current panel first');
     p.outro++;if(p.outro===3)done('component');break;
    default:throw Error('Unknown chapter action');
   }
  }
  const saved=await store.commit(userId,record.account.revision,env.build,copy(state),attempt);
  return response(saved);
 }
 return{act,replay,runtime:w};
}
module.exports={createOpeningAuthority,runtime};
