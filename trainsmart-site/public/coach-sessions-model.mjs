/*
 * TrainSmart D03.3 — coach-led fictional session ledger.
 * Records belong to the client profile, NOT the client's login, invitation or portal.
 * This is an isolated browser-session demonstration, not a training prescription.
 * A real implementation must verify actual screening/consent evidence server-side.
 */
export const SESSION_TEMPLATES=Object.freeze([
 {id:"example-a",name:"Example Strength A",exercises:Object.freeze([
  {id:"goblet-squat",name:"Dumbbell Goblet Squat",target:"3 sets × 8 reps"},
  {id:"db-press",name:"Dumbbell Bench Press",target:"3 sets × 8 reps"},
  {id:"trx-row",name:"TRX Row",target:"3 sets × 10 reps"}
 ])},
 {id:"example-b",name:"Example Strength B",exercises:Object.freeze([
  {id:"bb-deadlift",name:"Barbell Deadlift",target:"3 sets × 6 reps"},
  {id:"db-lunge",name:"Dumbbell Reverse Lunge",target:"3 sets × 8 reps"},
  {id:"band-press",name:"Band Pallof Press",target:"3 sets × 10 reps"}
 ])}
]);
export const COACHING_MODES=Object.freeze(["coach_led","shared","client_led"]);
export function initialCoachSafety(clientId){
 if(typeof clientId!=="string"||!clientId)throw Error("A fictional client ID is required.");
 return {clientId,screeningReviewed:false,consentEvidenceChecked:false,confirmedAt:""};
}
export function validateSafety(s,clientId){return !!s&&s.clientId===clientId&&typeof s.screeningReviewed==="boolean"&&typeof s.consentEvidenceChecked==="boolean";}
export function setCoachSafety(s,key,value){
 if(!validateSafety(s,s?.clientId)||!["screeningReviewed","consentEvidenceChecked"].includes(key)||typeof value!=="boolean")
  throw Error("Invalid fictional safety confirmation.");
 const updated={...s,[key]:value,confirmedAt:new Date().toISOString()};
 return updated;
}
export function coachSafetyReady(s){return !!(s?.screeningReviewed&&s?.consentEvidenceChecked);}
export function validCoachSession(s){
 if(!s||typeof s.id!=="string"||typeof s.clientId!=="string"||!["in_progress","completed"].includes(s.status))return false;
 if(!SESSION_TEMPLATES.some(t=>t.id===s.templateId)||!Array.isArray(s.exercises))return false;
 const t=SESSION_TEMPLATES.find(t=>t.id===s.templateId);
 if(s.exercises.length!==t.exercises.length)return false;
 return s.exercises.every((x,i)=>x.exerciseId===t.exercises[i].id&&Array.isArray(x.sets)&&x.sets.length<=8&&
  x.sets.every(z=>typeof z.id==="string"&&Number.isInteger(z.reps)&&z.reps>=1&&z.reps<=60&&
   Number.isFinite(z.kg)&&z.kg>=0&&z.kg<=400)&&typeof x.skipped==="boolean");
}
export function activeCoachSession(sessions,clientId){
 return sessions.find(s=>s.clientId===clientId&&s.status==="in_progress")||null;
}
export function completedCoachSessions(sessions,clientId){
 return sessions.filter(s=>s.clientId===clientId&&s.status==="completed").slice().reverse();
}
export function nextExampleTemplate(sessions,clientId){
 const n=completedCoachSessions(sessions,clientId).length;
 return SESSION_TEMPLATES[n%SESSION_TEMPLATES.length];
}
export function startCoachSession(sessions,clientId,safety){
 if(!clientId||!validateSafety(safety,clientId)||!coachSafetyReady(safety))
  throw Error("Record that screening and exercise consent evidence have been reviewed before starting.");
 if(activeCoachSession(sessions,clientId))throw Error("Finish the client's current session before starting another.");
 if(sessions.length>=200)throw Error("Fictional demo session limit reached.");
 const template=nextExampleTemplate(sessions,clientId);
 const ordinal=sessions.filter(s=>s.clientId===clientId).length+1;
 const record={id:"coach-demo:"+clientId+":"+ordinal,clientId,templateId:template.id,name:template.name,
  mode:"coach_led",status:"in_progress",startedAt:new Date().toISOString(),completedAt:"",
  exercises:template.exercises.map(x=>({exerciseId:x.id,sets:[],skipped:false,skipReason:""})),
  coachNote:""};
 return {sessions:[...sessions,record],record};
}
function mutateActive(sessions,sessionId,operation){
 const index=sessions.findIndex(s=>s.id===sessionId);
 if(index<0)throw Error("This demo session could not be found.");
 if(sessions[index].status!=="in_progress")throw Error("Completed sessions cannot be edited.");
 const revised=operation(sessions[index]);
 return sessions.map((s,i)=>i===index?revised:s);
}
export function logCoachSet(sessions,sessionId,exerciseId,form){
 return mutateActive(sessions,sessionId,s=>{
  const target=s.exercises.find(x=>x.exerciseId===exerciseId);
  if(!target)throw Error("Exercise is not part of this demonstration session.");
  if(target.skipped)throw Error("Unskip the exercise before recording sets.");
  if(target.sets.length>=8)throw Error("Maximum eight recorded sets per exercise in the demo.");
  const reps=Number(form.reps),kg=Number(form.kg);
  const rir=form.rir===""||form.rir===undefined?null:Number(form.rir);
  const notes=String(form.notes||"").trim().slice(0,150);
  if(!String(form.reps??"").trim()||!Number.isInteger(reps)||reps<1||reps>60)throw Error("Record the actual reps performed (1–60).");
  if(!String(form.kg??"").trim()||!Number.isFinite(kg)||kg<0||kg>400)throw Error("Enter the recorded load in kg (0 for bodyweight).");
  if(rir!==null&&(!Number.isInteger(rir)||rir<0||rir>5))throw Error("RIR must be between 0 and 5.");
  const set={id:s.id+":"+exerciseId+":"+(target.sets.length+1),reps,kg,rir,notes,loggedAt:new Date().toISOString()};
  return {...s,exercises:s.exercises.map(x=>x.exerciseId===exerciseId?{...x,sets:[...x.sets,set]}:x)};
 });
}
export function setCoachExerciseSkipped(sessions,sessionId,exerciseId,reason=""){
 return mutateActive(sessions,sessionId,s=>{
  const target=s.exercises.find(x=>x.exerciseId===exerciseId);
  if(!target)throw Error("Exercise is not part of this demonstration session.");
  if(target.sets.length>0)throw Error("Already-performed sets are retained; only untouched exercises can be skipped.");
  const next=!target.skipped;
  const clean=String(reason||"").trim().slice(0,100);
  if(next&&clean.length<3)throw Error("Enter a short reason for skipping this exercise.");
  return {...s,exercises:s.exercises.map(x=>x.exerciseId===exerciseId?{...x,skipped:next,skipReason:next?clean:""}:x)};
 });
}
export function sessionCanComplete(s){
 return !!(s&&s.status==="in_progress"&&s.exercises.every(x=>x.skipped||x.sets.length>0)&&
 s.exercises.some(x=>x.sets.length>0));
}
export function finishCoachSession(sessions,sessionId,note=""){
 return mutateActive(sessions,sessionId,s=>{
  if(!sessionCanComplete(s))throw Error("Log at least one performed set or skip each remaining exercise; one performed set is required overall.");
  const clean=String(note||"").trim().slice(0,400);
  return {...s,status:"completed",completedAt:new Date().toISOString(),coachNote:clean};
 });
}
export function coachSessionTotals(session){
 const performed=session.exercises.reduce((sum,x)=>sum+x.sets.length,0);
 const skipped=session.exercises.filter(x=>x.skipped).length;
 return {performed,skipped,exercises:session.exercises.length};
}
export function changeCoachingPreference(current,mode){
 if(!COACHING_MODES.includes(mode))throw Error("Choose a valid recording preference.");
 return mode;
}
