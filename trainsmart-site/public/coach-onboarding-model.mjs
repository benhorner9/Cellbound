/*
 * D03 fictional onboarding workflow. No network, messages, invitations or real client data.
 * Stage transitions are explicit and deterministic; persisted only by demo sessionStorage.
 */
export const ONBOARDING_STAGES=Object.freeze([
 {id:"draft",label:"Draft",action:"Prepare details request",hint:"Set up a fictional profile and prepare the intake"},
 {id:"awaiting",label:"Awaiting details",action:"Record fictional intake",hint:"Nothing is actually sent or requested"},
 {id:"review",label:"Coach review",action:"Approve intake for programming",hint:"Review goals and tick off the checklist"},
 {id:"ready",label:"Ready to programme",action:"Prepare welcome draft",hint:"A coach-approved programme is not yet assigned"},
 {id:"prepared",label:"Invite prepared",action:"Finish demo workflow",hint:"No invitation or email is ever sent"},
 {id:"complete",label:"Preview complete",action:"Complete",hint:"Practice workflow finished — no account activated"}
]);
export const INTAKE_CHECKLIST=Object.freeze([
 {id:"identity",label:"Fictional profile reviewed",detail:"Check the demonstration name and coaching status"},
 {id:"goals",label:"Training goals and schedule confirmed",detail:"Review the fictional goal and training availability"},
 {id:"equipment",label:"Equipment and experience checked",detail:"Make sure programme options fit the example setup"},
 {id:"nutrition",label:"Nutrition preferences reviewed",detail:"Note any example preferences; this is not an allergy assessment"},
 {id:"coach",label:"Coach approval recorded",detail:"Confirm the fictional intake is ready for programming"}
]);
export function newOnboarding(client){
 if(!client?.id)throw Error("Client is required.");
 return {clientId:client.id,stage:"draft",checks:[],intake:{
  goal:client.goal||"",equipment:client.equipment||"",days:String(client.trainingDays||3),
  preferredSchedule:"",foodPreferences:"",notes:""
 },events:[]};
}
export function validateOnboardingRecord(record,clientId){
 if(!record||record.clientId!==clientId||!ONBOARDING_STAGES.some(x=>x.id===record.stage)||!Array.isArray(record.checks)||!record.checks.every(x=>INTAKE_CHECKLIST.some(y=>y.id===x))||!record.intake||typeof record.intake!=="object")return false;
 for(const k of ["goal","equipment","days","preferredSchedule","foodPreferences","notes"])if(typeof record.intake[k]!=="string")return false;
 return Array.isArray(record.events)&&record.events.length<=100;
}
export function updateIntake(record,form){
 if(!record||record.stage==="complete")throw Error("Cannot edit a completed preview flow.");
 const input={goal:String(form.goal??"").trim().slice(0,180),
  equipment:String(form.equipment??"").trim().slice(0,250),
  days:String(form.days??"").trim(),preferredSchedule:String(form.preferredSchedule??"").trim().slice(0,180),
  foodPreferences:String(form.foodPreferences??"").trim().slice(0,280),
  notes:String(form.notes??"").trim().slice(0,320)};
 const count=Number(input.days);
 if(input.goal.length<3||input.equipment.length<3||!Number.isInteger(count)||count<1||count>7||input.preferredSchedule.length<3)
  throw Error("Complete the goal, equipment, days (1–7) and fictional schedule.");
 input.days=String(count);
 return {...record,intake:input};
}
export function toggleChecklist(record,id,checked){
 if(!INTAKE_CHECKLIST.some(x=>x.id===id))throw Error("Unknown checklist item.");
 if(!["review","ready"].includes(record.stage))throw Error("Review checklist only during coach review or ready stage.");
 const existing=new Set(record.checks);
 if(checked)existing.add(id);else existing.delete(id);
 return {...record,checks:INTAKE_CHECKLIST.filter(x=>existing.has(x.id)).map(x=>x.id)};
}
export function intakeIsComplete(record){
 const i=record.intake;
 return !!(i&&i.goal?.trim().length>=3&&i.equipment?.trim().length>=3&&i.preferredSchedule?.trim().length>=3&&Number.isInteger(Number(i.days))&&Number(i.days)>=1&&Number(i.days)<=7);
}
export function nextOnboardingStage(record){
 if(!record)throw Error("Missing onboarding record.");
 const idx=ONBOARDING_STAGES.findIndex(s=>s.id===record.stage);
 if(idx<0||idx===ONBOARDING_STAGES.length-1)throw Error("The workflow is already complete.");
 if(record.stage==="awaiting"&&!intakeIsComplete(record))throw Error("Save the fictional intake details first.");
 if(record.stage==="review"&&(!intakeIsComplete(record)||INTAKE_CHECKLIST.some(s=>!record.checks.includes(s.id))))
  throw Error("Complete all five coach-review checks before approving.");
 return {...record,stage:ONBOARDING_STAGES[idx+1].id};
}
export function onboardProgress(record){
 const idx=ONBOARDING_STAGES.findIndex(s=>s.id===record?.stage);
 return idx<0?0:Math.round(idx/(ONBOARDING_STAGES.length-1)*100);
}
export function stageById(id){return ONBOARDING_STAGES.find(x=>x.id===id)||ONBOARDING_STAGES[0];}
export function onboardingTask(record,client,day,created){
 if(!record||record.stage==="complete"||client?.status==="Archived")return null;
 const stage=stageById(record.stage);
 const title={
  draft:"Prepare "+client.name+"’s onboarding intake",
  awaiting:"Review the fictional details for "+client.name,
  review:"Approve "+client.name+"’s intake checklist",
  ready:"Plan the first training block for "+client.name,
  prepared:"Finish "+client.name+"’s onboarding preview"
 }[record.stage];
 return {id:"onboarding:"+record.clientId+":"+record.stage,clientId:record.clientId,title,
  priority:record.stage==="review"?"high":"normal",kind:"onboarding",due:day,estimate:10,
  note:stage.hint+". Fictional preview only — no live invitation or account activation.",status:"open",created};
}
export function syncOnboardingTasks(tasks,record,client,day){
 if(!record||!client)return tasks;
 const keyPrefix="onboarding:"+record.clientId+":";
 const current=onboardingTask(record,client,day,tasks.length+1);
 const updated=tasks.map(t=>{
  if(t.id==="setup-"+record.clientId || (t.id.startsWith(keyPrefix)&&t.id!==current?.id)){
   return t.status==="completed"?t:{...t,status:"completed"};
  }
  return t;
 });
 if(current&&!updated.some(t=>t.id===current.id))updated.push(current);
 return updated;
}
export function onboardingSummary(clients,records){
 const items=Object.values(records||{}).filter(r=>clients.some(c=>c.id===r.clientId&&c.status!=="Archived"));
 return {total:items.length,pending:items.filter(r=>r.stage!=="complete").length,
  awaiting:items.filter(r=>r.stage==="awaiting").length,review:items.filter(r=>r.stage==="review").length,
  ready:items.filter(r=>r.stage==="ready"||r.stage==="prepared").length,complete:items.filter(r=>r.stage==="complete").length};
}
