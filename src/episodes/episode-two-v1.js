/* Episode 2 domain contract. No second combat engine and no inferred activity clears.
 * The reducer is deliberately I/O-free: a caller must persist the returned account
 * snapshot atomically, with a revision check, before acknowledging any reward.
 */
(()=>{
'use strict';
const VERSION=1;
const LEVEL_CAP=30;
const REGION=Object.freeze({id:'morrowfields',name:'The Morrowfields',hub:'Fenstead Farm',
  states:Object.freeze(['uneasy-fields','harvest-awakening','fields-reclaimed'])});
const PVP_EQUIPMENT_LEVELS=Object.freeze({1:20,2:25,3:30});
const EQUIPMENT_BANDS=Object.freeze([
  Object.freeze({level:20,itemLevel:54,maxTier:5}),
  Object.freeze({level:25,itemLevel:68,maxTier:5}),
  Object.freeze({level:30,itemLevel:82,maxTier:5})
]);
const FINALE='signal-from-nowhere';
const clone=value=>JSON.parse(JSON.stringify(value));
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj||{},key);
const isRecord=value=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value};
function objective(id,type,text,speaker,dialogue){return{id,type,text,speaker,dialogue}}
const CONTENT=freeze({
  e2_q01:{id:'e2_q01',kind:'quest',name:'After the Breach',levels:[15,16],npc:'Dr. Elara Voss',requires:[FINALE],firstXp:4300,gold:180,objectives:[
    objective('transmission','dialogue','Receive the emergency transmission.','Dr. Elara Voss','Three days. I thought we had three quiet days. The Complex has just answered a relay out in the Morrowfields.'),
    objective('briefing','dialogue','Speak to Voss and Warden Elara Vey.','Warden Elara Vey','Missing workers first. Whatever Voss thinks is under that farm can wait until we know who is still alive.'),
    objective('fenstead','travel','Travel to Fenstead Farm.','Mara Fen','If you have come for the harvest, you are late. If you have come for my workers, follow me.'),
    objective('wagon','investigate','Meet Mara Fen and investigate the abandoned wagon.','Mara Fen','That axle was sound yesterday. Look at the split. Something pulled it down.'),
    objective('creatures','combat','Defeat the altered farm creatures.','Bram Kel','Those things were grazing here yesterday. Keep them away from the houses.'),
    objective('component','investigate','Recover the component bearing the Null Complex insignia.','Tessa Orr','Two trails. One in the roots, one in the water. And both are moving away from us.')
  ]},
  e2_q02:{id:'e2_q02',kind:'quest',name:'Ash in the Wheat',levels:[16,19],npc:'Bram Kel',requires:['e2_q01'],firstXp:9250,gold:240,objectives:[
    objective('orchard-west','investigate','Inspect the western rows of Rotroot Orchard.','Bram Kel','Nobody burned this field. So why does it smell like ash?'),
    objective('orchard-well','investigate','Inspect the orchard well.','Tessa Orr','The growth is climbing against the water. It is following something else.'),
    objective('orchard-shed','investigate','Inspect the abandoned packing shed.','Bram Kel','Boots, gloves, lunches. They left everything.'),
    objective('hatch','investigate','Examine the damaged storage hatch.','Bram Kel','The hinges bent upwards. Whatever opened this was underneath.'),
    objective('guardians','combat','Defeat the mutated wildlife and equipment guardians.','Bram Kel','That is Henley’s coat. There is nobody inside it.'),
    objective('roots','investigate','Investigate the large root structure.','Tessa Orr','Splice tissue. It has learned to grow through the crop.'),
    objective('farmer','rescue','Free the trapped farmer.','Trapped farmer','I heard the pipes start. Then the roots dragged everything downstairs.'),
    objective('cellars','travel','Discover the entrance to Rotroot Cellars.','Bram Kel','Something is sending the harvest down there. We follow the pipes.')
  ]},
  e2_q03:{id:'e2_q03',kind:'quest',name:'Water That Moves',levels:[16,19],npc:'Tessa Orr',requires:['e2_q01'],firstXp:9250,gold:240,objectives:[
    objective('waterways','investigate','Investigate the contaminated waterways.','Tessa Orr','Water does not climb a bank because you walk past. Usually.'),
    objective('samples','collect','Collect water samples from the irrigation network.','Tessa Orr','Keep the lids shut. The last sample tried to leave.'),
    objective('examination','defend','Protect Tessa during her examination.','Tessa Orr','There. A pulse, then a response. Keep them off me for another moment.'),
    objective('pumps','puzzle','Route the pumps towards the isolated drainage basin.','Tessa Orr','Close the farm intake first. We cannot send this back to their wells.'),
    objective('siphons','combat','Defeat the Siphon creatures.','Tessa Orr','They are feeding the pumps. Break the connection.'),
    objective('floodgate','interact','Open the old floodgate access route.','Tessa Orr','The same frequency, every time. This is not an outbreak spreading. It is taking orders.')
  ]},
  e2_d01:{id:'e2_d01',kind:'dungeon',name:'Rotroot Cellars',levels:[18,21],requires:['e2_q02'],firstXp:3375,repeatXp:2000,gold:260,rooms:['storage-hatch','root-tunnels','rootkeeper','fungal-stores','collapsed-cellar','growth-chamber'],miniboss:'The Rootkeeper',boss:'Rootmass Splice'},
  e2_d02:{id:'e2_d02',kind:'dungeon',name:'Floodgate Nine',levels:[18,21],requires:['e2_q03'],firstXp:3375,repeatXp:2000,gold:260,rooms:['flooded-canal','pump-tunnel','pressure-warden','control-room','floodgates','reservoir'],miniboss:'Pressure Warden',boss:'The Siphon Matriarch'},
  e2_q04:{id:'e2_q04',kind:'quest',name:'The Harvest Code',levels:[21,22],npc:'Dr. Elara Voss',requires:['e2_d01','e2_d02'],firstXp:5800,gold:320,objectives:[
    objective('evidence','dialogue','Deliver the production record and command frequency.','Dr. Elara Voss','One tells us what they were growing. The other tells us who was asking for it.'),
    objective('directive','puzzle','Reconstruct the encrypted directive with Voss and Tessa.','Tessa Orr','THE HARVEST PROTOCOL. Not a research heading. A standing order.'),
    objective('farm-defence','defend','Defend Fenstead Farm from the coordinated attack.','Mara Fen','They came from both fields at once. Get the children into the storehouse!'),
    objective('transmission','interact','Interrogate the captured transmission.','Dr. Elara Voss','Your Cells are the challenge key. It remembers the people who broke out.'),
    objective('array','investigate','Locate the Harvest Array.','Tessa Orr','Collection, processing, distribution. The whole farm has become a supply line.'),
    objective('assault','dialogue','Prepare the assault.','Director Cael Orin — archived voice','Your signatures were recorded at the Complex. Your interference was anticipated.')
  ]},
  e2_r01:{id:'e2_r01',kind:'raid',name:'The Harvest Array',levels:[22,24],requires:['e2_q04'],firstXp:6050,repeatXp:4000,gold:450,rooms:['processing-yard','twin-control-towers','harvester-regent','overseers-shadow'],modes:['story-assault','guild-raid']},
  e2_q05:{id:'e2_q05',kind:'quest',name:'Hunted by the Prototype',levels:[23,27],npc:'Bram Kel',requires:['e2_r01'],firstXp:13000,gold:380,objectives:[
    objective('convoy','escort','Escort the supply convoy.','Bram Kel','Food, bandages, spare wheels. Let us manage one ordinary journey.'),
    objective('ambush','survive','Survive Prototype 07’s ambush.','Dr. Elara Voss','Do not try to finish it here. Get the convoy through!'),
    objective('escape','escape','Escape with the convoy.','Bram Kel','We are all through. Cut the bridge ropes!'),
    objective('greenhouse','investigate','Inspect the damaged greenhouse equipment.','Tessa Orr','A tissue archive. It is reading a body back into existence.'),
    objective('source','investigate','Locate the regeneration source.','Dr. Elara Voss','You killed the specimen at the Complex. This is a reconstruction from its stored data.'),
    objective('glasshouse','travel','Enter the Glasshouse approach.','Dr. Elara Voss','Destroy the reconstruction system. Then this one stays dead.')
  ]},
  e2_q06:{id:'e2_q06',kind:'quest',name:'Voices Under the Soil',levels:[23,27],npc:'Tessa Orr',requires:['e2_r01'],firstXp:13000,gold:380,objectives:[
    objective('overseer','puzzle','Decode the independent Overseer’s transmission.','The Overseer','SIGNAL DEGRADED. SUBJECT ZERO RESISTS. DO NOT SEVER THE CORE.'),
    objective('granary','investigate','Investigate the abandoned granary.','Old Jory','New maps stop at the floorboards. Mine do not.'),
    objective('passages','travel','Explore the old access passages.','Old Jory','This wall is older than the farm. Someone built the granary to hide the way down.'),
    objective('relay-one','interact','Disable the first resonance relay.','Tessa Orr','One voice clearer. Two relays still drowning it out.'),
    objective('relay-two','interact','Disable the second resonance relay.','Tessa Orr','The signal is coming from below the silos.'),
    objective('relay-three','defend','Hold the final relay while it powers down.','The Overseer','MAINTAIN DISCONNECTION. CONTAINMENT RESPONSE INBOUND.'),
    objective('entrance','investigate','Discover the underground entrance.','The Overseer','ZERO IS NOT THE SOURCE. ZERO IS THE LOCK.')
  ]},
  e2_d03:{id:'e2_d03',kind:'dungeon',name:'The Glasshouse',levels:[25,28],requires:['e2_q05'],firstXp:4000,repeatXp:3500,gold:380,rooms:['broken-glass','plant-vault','gardener-construct','tissue-archive','regeneration-lines','prototype-station'],miniboss:'The Gardener Construct',boss:'Prototype 07 — Reconstituted'},
  e2_d04:{id:'e2_d04',kind:'dungeon',name:'The Buried Silo',levels:[25,28],requires:['e2_q06'],firstXp:4000,repeatXp:3500,gold:380,rooms:['grain-shaft','ancient-tunnels','containment-engineer','concealed-lab','resonance-chamber','seed-vault'],miniboss:'The Containment Engineer',boss:'The Seed Warden'},
  e2_q07:{id:'e2_q07',kind:'quest',name:'No More Containment',levels:[28,30],npc:'Warden Elara Vey',requires:['e2_d03','e2_d04'],firstXp:15350,gold:500,objectives:[
    objective('assemble','dialogue','Assemble the evidence from both dungeons.','Dr. Elara Voss','It needs Zero alive to copy controlled life across Zeltira. Zero has been refusing it.'),
    objective('farm-defence','defend','Defend Fenstead Farm against the large attack.','Warden Elara Vey','Hold the road. Give the civilians room to move.'),
    objective('civilians','rescue','Protect Mara Fen and the remaining civilians.','Mara Fen','Everyone is accounted for. Now bring the ones trapped below home as well.'),
    objective('secure-contact','dialogue','Meet the Overseer through the secure transmission.','The Overseer','DESTRUCTION OF SUBJECT ZERO WILL BREAK CONTAINMENT. RELEASE MUST BE CONTROLLED.'),
    objective('prepare','dialogue','Prepare the final assault with Voss.','Dr. Elara Voss','We are going in to free a prisoner. Remember that when the alarms start.'),
    objective('anchor-one','combat','Disable the western containment anchor.','Warden Elara Vey','First anchor down. Stay together.'),
    objective('anchor-two','combat','Disable the eastern containment anchor.','Tessa Orr','The field is answering. We are nearly through.'),
    objective('anchor-three','combat','Disable the final containment anchor.','Dr. Elara Voss','The light is coming from beneath the whole field. That is the Heart.')
  ]},
  e2_r02:{id:'e2_r02',kind:'raid',name:'The Harvest Heart',levels:[30,30],requires:['e2_q07'],firstXp:0,repeatXp:5000,gold:700,rooms:['root-cathedral','containment-chambers','overseer-prime','subject-zero','orin-protocol'],modes:['story-assault','guild-raid']}
});

function finaleCompleted(account){
  // nullComplexUnlocked proves repeatable access, not the escape narrative.
  return account?.questSystem?.nullComplex?.complete===true;
}
function freshState(accountId){
  if(typeof accountId!=='string'||!accountId.trim())throw Error('Episode progression requires an account identity.');
  return{version:VERSION,accountId,revision:0,unlocked:[],quests:{},clears:{},scenesViewed:[],rewardClaims:{},runs:{},worldState:REGION.states[0],complete:false,log:[]};
}
function completed(progress,id){return CONTENT[id]?.kind==='quest'?progress.quests[id]?.complete===true:Number(progress.clears[id]?.count)>0}
function missingRequirements(account,id){
  const def=CONTENT[id];if(!def)throw Error('Unknown Episode 2 content: '+id);
  const p=account.episode2||freshState('read-only');
  return def.requires.filter(key=>key===FINALE?!finaleCompleted(account):!completed(p,key));
}
function derive(account){
  const p=account.episode2;
  p.unlocked=Object.keys(CONTENT).filter(id=>missingRequirements(account,id).length===0);
  p.complete=completed(p,'e2_r02');
  p.worldState=p.complete?REGION.states[2]:completed(p,'e2_r01')?REGION.states[1]:REGION.states[0];
  p.endgameActive=p.complete;
  return p;
}
function migrate(account,accountId){
  if(!isRecord(account))throw Error('Invalid account snapshot.');
  const next=clone(account);
  if(!next.episode2)next.episode2=freshState(accountId);
  const p=next.episode2;
  if(p.accountId!==accountId)throw Error('Episode 2 account identity mismatch.');
  if(p.version!==VERSION)throw Error('Unsupported Episode 2 save version.');
  if(!Number.isSafeInteger(p.revision)||p.revision<0)throw Error('Invalid Episode 2 revision.');
  for(const key of ['quests','clears','rewardClaims','runs'])if(!isRecord(p[key]))throw Error('Invalid Episode 2 '+key+'.');
  for(const key of ['unlocked','scenesViewed','log'])if(!Array.isArray(p[key]))throw Error('Invalid Episode 2 '+key+'.');
  derive(next);
  return next;
}
function xpNeeded(level){return globalThis.window?.CellboundBalance?.xpNeeded?.(level)??800+(Math.max(1,Math.floor(Number(level)||1))-1)*250}
function grantXp(character,amount){
  let level=Math.max(1,Math.min(LEVEL_CAP,Math.floor(Number(character.level)||1)));
  let xp=Math.max(0,Math.floor(Number(character.xp)||0))+amount;
  while(level<LEVEL_CAP&&xp>=xpNeeded(level)){xp-=xpNeeded(level);level++}
  character.level=level;character.xp=level===LEVEL_CAP?0:xp;
  const rules=globalThis.window?.CellboundBuildRules;
  rules?.syncLegacyTalentCounter?.(character);
}
function activeIds(account){return[account.party?.tank,account.party?.healer,...(account.party?.dps||[])].filter(Boolean)}
function assertParty(account){
  const ids=activeIds(account);
  if(ids.length!==5||new Set(ids).size!==5||ids.some(id=>!account.roster?.some(c=>c.id===id)))throw Error('A complete five-character party is required.');
  return ids;
}
function reward(account,key,def,ids,xp,at){
  const p=account.episode2;
  if(own(p.rewardClaims,key))return false;
  const characters=ids.map(id=>account.roster?.find(c=>c.id===id));
  if(characters.length!==5||characters.some(c=>!c))throw Error('Reward party no longer exists.');
  characters.forEach(c=>grantXp(c,xp));
  account.gold=Math.max(0,Number(account.gold)||0)+def.gold;
  p.rewardClaims[key]={at,contentId:def.id,partyIds:ids.slice(),xp,gold:def.gold};
  return true;
}
function requireOpen(account,id){
  const missing=missingRequirements(account,id);
  if(missing.length)throw Error('Missing prerequisites: '+missing.join(', '));
}
function validRunId(id){return typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{7,95}$/.test(id)}
function eventTime(value){const at=new Date(value);if(!Number.isFinite(at.getTime()))throw Error('Invalid event timestamp.');return at.toISOString()}
/** Pure domain reducer, NOT a server combat attestation. The encounter service
 * must authenticate objective/room victory evidence before dispatching events.
 * Revisions fence stale device snapshots; retries use persisted claim/run IDs.
 */
function transition(snapshot,accountId,event){
  const next=migrate(snapshot,accountId),p=next.episode2;
  if(!event||event.expectedRevision!==p.revision)throw Error('Stale Episode 2 revision; reload before retrying.');
  const at=eventTime(event.at),def=CONTENT[event.contentId];
  if(!def)throw Error('Unknown Episode 2 content.');
  requireOpen(next,def.id);
  let changed=false;
  switch(event.type){
    case 'quest-start':{
      if(def.kind!=='quest')throw Error('Not a quest.');
      if(!p.quests[def.id]){p.quests[def.id]={startedAt:at,partyIds:assertParty(next),objectives:[],complete:false};changed=true}
      break;
    }
    case 'objective-complete':{
      const q=p.quests[def.id];
      if(def.kind!=='quest'||!q)throw Error('Start the quest first.');
      if(!def.objectives.some(o=>o.id===event.objectiveId))throw Error('Unknown quest objective.');
      if(q.objectives.includes(event.objectiveId))break;
      if(def.objectives[q.objectives.length]?.id!==event.objectiveId)throw Error('Complete the current objective first.');
      q.objectives.push(event.objectiveId);changed=true;
      if(q.objectives.length===def.objectives.length){
        q.complete=true;q.completedAt=at;
        reward(next,'story:'+def.id,def,q.partyIds,def.firstXp,at);
      }
      break;
    }
    case 'run-start':{
      if(def.kind==='quest'||!validRunId(event.runId))throw Error('Invalid encounter run.');
      if(own(p.runs,event.runId)){
        if(p.runs[event.runId].contentId!==def.id)throw Error('Run identity collision.');
        break;
      }
      if(Object.values(p.runs).some(r=>r.status==='active'))throw Error('Finish or abandon the active run first.');
      if(def.kind==='raid'&&!def.modes.includes(event.mode))throw Error('Select Story Assault or Guild Raid.');
      const difficulty=event.difficulty||'normal';
      if(!['normal','heroic','cellbound'].includes(difficulty))throw Error('Unknown difficulty.');
      if(difficulty!=='normal'&&!completed(p,def.id))throw Error('Complete the story clear before harder difficulties.');
      p.runs[event.runId]={contentId:def.id,mode:def.kind==='raid'?event.mode:'party',difficulty,partyIds:assertParty(next),startedAt:at,rooms:[],status:'active'};
      changed=true;break;
    }
    case 'room-clear':{
      const run=p.runs[event.runId];
      if(!run||run.contentId!==def.id)throw Error('Unknown encounter run.');
      if(run.rooms.includes(event.roomId))break;
      if(run.status!=='active')throw Error('Run is not active.');
      if(def.rooms[run.rooms.length]!==event.roomId)throw Error('Complete the current room first.');
      if(def.id==='e2_r02'&&event.roomId==='subject-zero'&&event.protectedTargetSurvived!==true)throw Error('Subject Zero must survive the release sequence.');
      run.rooms.push(event.roomId);changed=true;break;
    }
    case 'run-fail':case 'run-abandon':{
      const run=p.runs[event.runId];
      if(!run||run.contentId!==def.id)throw Error('Unknown encounter run.');
      if(run.status!=='active')break;
      run.status=event.type==='run-fail'?'failed':'abandoned';run.endedAt=at;changed=true;break;
    }
    case 'run-complete':{
      const run=p.runs[event.runId];
      if(!run||run.contentId!==def.id)throw Error('Unknown encounter run.');
      if(run.status==='complete')break;
      if(run.status!=='active'||run.rooms.length!==def.rooms.length)throw Error('A successful complete run is required.');
      // The rescue room must be attested by the combat adapter only if Zero survived.
      const history=p.clears[def.id]||{count:0,byMode:{},byDifficulty:{}};
      const first=history.count===0,duration=Math.max(0,Date.parse(at)-Date.parse(run.startedAt));
      reward(next,first?'story:'+def.id:'run:'+event.runId,def,run.partyIds,first?def.firstXp:def.repeatXp,at);
      history.count++;history.firstAt=history.firstAt||at;history.lastAt=at;
      history.byMode[run.mode]=(history.byMode[run.mode]||0)+1;
      history.byDifficulty[run.difficulty]=(history.byDifficulty[run.difficulty]||0)+1;
      history.bestMs=history.bestMs===undefined?duration:Math.min(history.bestMs,duration);
      p.clears[def.id]=history;run.status='complete';run.endedAt=at;changed=true;break;
    }
    case 'scene-viewed':{
      const allowed=def.kind==='raid'?['opening','revelation','ending']:['opening','ending'];
      if(!allowed.includes(event.scene))throw Error('Unknown story scene.');
      const id=def.id+':'+event.scene;
      if(!p.scenesViewed.includes(id)){p.scenesViewed.push(id);changed=true}
      break;
    }
    default:throw Error('Unknown Episode 2 event.');
  }
  if(changed){
    p.revision++;
    p.log.push({revision:p.revision,at,type:event.type,contentId:def.id,runId:event.runId||null,objectiveId:event.objectiveId||null});
    p.log=p.log.slice(-300);derive(next);
  }
  return{state:next,changed,revision:p.revision};
}
function status(account,id){
  const def=CONTENT[id];if(!def)throw Error('Unknown content.');
  const p=account.episode2||freshState('read-only'),missing=missingRequirements(account,id);
  const q=p.quests[id];
  return{id,name:def.name,kind:def.kind,recommendedLevels:def.levels.slice(),unlocked:missing.length===0,
    missing:missing.map(key=>({id:key,name:key===FINALE?'Complete Signal From Nowhere — escape the Null Complex':CONTENT[key].name})),
    complete:completed(p,id),nextObjective:def.kind==='quest'&&!q?.complete?def.objectives[q?.objectives?.length||0]:null,
    clears:clone(p.clears[id]||{count:0}),rewards:{firstXp:def.firstXp,repeatXp:def.repeatXp||0,gold:def.gold}};
}
const api=freeze({VERSION,LEVEL_CAP,REGION,PVP_EQUIPMENT_LEVELS,EQUIPMENT_BANDS,CONTENT,FINALE,finaleCompleted,freshState,migrate,transition,status,missingRequirements,xpNeeded});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof window!=='undefined')window.CellboundEpisodeTwo=api;
})();
