'use strict';
// Pure server integration boundary. The caller must load options from an authenticated,
// versioned encounter record, enforce elapsed wall time/episode access and settle once.
// This module deliberately has NO reward/store API and accepts NO client roster/outcome.
const VERSION=1;
function validateInput(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid input');
 const fields={select:['heroId'],target:['targetId'],move:['position'],ability:['abilityId','targetId'],command:['command','targetId','position']}[input.type];
 if(!fields||Object.keys(input).some(k=>!['at','type',...fields].includes(k)))throw Error('Invalid input fields');
 if(!Number.isSafeInteger(input.at)||input.at<0||input.at>180000||input.at%100)throw Error('Invalid input time');
 for(const k of ['heroId','targetId','abilityId','command'])if(input[k]!=null&&(typeof input[k]!=='string'||input[k].length>160))throw Error('Invalid identifier');
 if(input.position&&(Object.keys(input.position).sort().join(',')!=='x,y'||!Number.isFinite(input.position.x)||!Number.isFinite(input.position.y)))throw Error('Invalid position');
}
function replayControl({engine,options,version,actions,elapsedMs}){
 if(version!==VERSION||!engine?.createLiveSession||options?.directControl!==true||options.pvp)throw Error('Invalid control contract');
 if(!Array.isArray(actions)||actions.length>3600||!Number.isSafeInteger(elapsedMs)||elapsedMs<0||elapsedMs>180100||elapsedMs%100)throw Error('Invalid history');
 const session=engine.createLiveSession(JSON.parse(JSON.stringify(options)));let previous=0;
 for(const input of actions){
  validateInput(input);
  if(input.at<previous||input.at>elapsedMs)throw Error('Out of order input');
  while(session.timeMs<input.at&&!session.finished)session.advance(100);
  if(session.finished)throw Error('Input after encounter ended');
  const {at,...action}=input,result=session.input(action);
  if(!result.ok)throw Error('Rejected control input: '+result.reason);
  previous=at;
 }
 while(session.timeMs<elapsedMs&&!session.finished)session.advance(100);
 if(session.timeMs!==elapsedMs)throw Error('Invalid encounter duration');
 return session.snapshot();
}
module.exports={VERSION,replayControl,validateInput};
