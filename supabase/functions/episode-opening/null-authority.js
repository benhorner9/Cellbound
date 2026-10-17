'use strict';
import {randomUUID,createHash} from 'node:crypto';
const copy=x=>JSON.parse(JSON.stringify(x));
const check=(v,m)=>{if(!v)throw Error(m)};
function createNullAuthority({store,runtime,clock=Date.now,uuid=randomUUID,replay}){
 const steps=runtime.CellboundNullStoryData.steps,E=runtime.CellboundEpisodeTwo;
 async function act(user,request){
  const r=await store.load(user);check(r?.account&&r.environment,'Sign in to the development game');
  check(request.build===r.environment.build,'Update the game before continuing');
  check(r.environment.name==='isolated-development','Verified story service is development-only');
  let state=copy(r.account.state),run=copy(r.nullRun||{});
  const result=account=>({account,run,complete:r.finaleProof===true||run.complete===true});
  if(request.action==='null-load'||run.complete)return result(r.account);
  check(request.revision===r.account.revision,'Stale story state; reload required');
  if(request.action==='null-start'){
   if(!run.started){
    check(state.progression?.manorRaidCleared||Object.keys(state.raidRewardClaims||{}).length,'Complete The Manor before investigating NULL//07');
    const ids=[state.party?.tank,state.party?.healer,...(state.party?.dps||[])].filter(Boolean);check(ids.length===5&&new Set(ids).size===5,'Select a full five-character party');
    run={started:true,index:0,pressure:0,components:{},fights:{},partyIds:ids,originalComplete:state.questSystem?.nullComplex?.complete===true};
   }
  }else{
   check(run.started&&!run.complete,'Start the Null Complex story first');
   const step=steps[run.index];check(step&&request.step===step.id,'Complete the current story stage first');
   const advance=()=>{run.index++;if(steps[run.index]?.optional&&run.pressure<2)run.index++;};
   if(request.action==='null-panel'){
    check(!step.encounter&&!step.choices,'This stage requires an encounter or investigation');advance();
   }else if(request.action==='null-choice'){
    check(step.choices&&Number.isInteger(request.choice)&&request.choice>=0&&request.choice<step.choices.length,'Invalid investigation choice');
    if(request.choice===step.answer){run.components[step.component]=true;advance();}else run.pressure=Math.min(3,run.pressure+1);
   }else if(request.action==='null-battle-start'){
    check(step.encounter,'No encounter at this stage');
    if(!(run.attempt?.status==='active'&&clock()-run.attempt.startedAt<240000)){
     const party=run.partyIds.map(id=>state.roster.find(c=>c.id===id));check(party.every(Boolean),'Restore the original party');
     run.attempt={id:uuid(),startedAt:clock(),status:'active',partyDigest:createHash('sha256').update(JSON.stringify(party)).digest('hex'),options:{party:copy(party),encounter:copy(step.encounter),seed:uuid(),tactics:{interruptPriority:'standard',addPriority:'immediate',defensiveUsage:'standard',pullStyle:'normal',movementDiscipline:'balanced'}}};
    }
   }else if(request.action==='null-battle-finish'){
    const a=run.attempt;check(step.encounter&&a?.id===request.attempt&&a.status==='active','Unknown story encounter');
    check(clock()-a.startedAt<240000,'Encounter expired; try again');
    const party=run.partyIds.map(id=>state.roster.find(c=>c.id===id));check(createHash('sha256').update(JSON.stringify(party)).digest('hex')===a.partyDigest,'Party changed; restart this encounter');
    const outcome=replay(a,request.commands||[]);check(clock()-a.startedAt>=outcome.durationMs/2,'Encounter has not finished yet');
    a.status=outcome.outcome;a.proof=createHash('sha256').update(JSON.stringify(outcome)).digest('hex');
    if(a.status==='victory'){run.fights[step.id]=a.proof;advance();}
   }else if(request.action==='null-abandon'){if(run.attempt)run.attempt.status='abandoned';}
   else throw Error('Unknown story action');
  }
  if(run.index===steps.length){
   for(const id of ['splice','zero','interruption','prototype'])check(run.fights[id],'Verified story encounter missing');
   check(['cable','cell','fuse'].every(k=>run.components[k]),'Teleporter components missing');
   run.complete=true;run.proof=createHash('sha256').update(JSON.stringify(run)).digest('hex');
   state.questSystem=state.questSystem||{};state.questSystem.nullComplex={started:true,stage:'complete',complete:true,authoritative:true,completedAt:new Date(clock()).toISOString(),done:['signal','entry','splice','recording','zero','components','overseer','prototype','escape'],components:run.components,searchPressure:run.pressure,history:[{at:new Date(clock()).toISOString(),text:'The party escaped the Null Complex. The agricultural relay is responding.'}]};
   state.progression={...state.progression,nullComplexUnlocked:true};
   if(!run.originalComplete){state.gold=(Number(state.gold)||0)+150;state.renown=(Number(state.renown)||0)+100;}
  }
  const account=await store.commitNull(user,r.account.revision,r.environment.build,state,run);
  return result(account);
 }
 return{act};
}
export {createNullAuthority};
