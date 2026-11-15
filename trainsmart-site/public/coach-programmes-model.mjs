/*
 * TrainSmart D06 — named/reusable plan builder, fictional and browser-session only.
 * Manual and AI-JSON imports use the same validation and library snapshots.
 * No RIR is required or displayed. No live programme publication or API calls.
 */
import {validExercise,validEquipmentIds} from "./coach-library-model.mjs";
const str=(v,max=240)=>String(v??"").trim().slice(0,max);
const clone=x=>JSON.parse(JSON.stringify(x));
export const PLAN_SOURCES=Object.freeze(["manual","ai-import","saved-template"]);
export const MAX_SESSIONS=7,MAX_EXERCISES=18;
export const DEFAULT_PRESCRIPTION=Object.freeze({feederSets:0,workingSets:3,repsMin:8,repsMax:12,
 restSeconds:90,tempo:"",loadKg:null,notes:""});
const validId=id=>/^(draft|plan|assignment):[a-z0-9-]{3,100}$/.test(id||"");
const unique=(list,id)=>!list.some(x=>x.id===id);
const validText=(v,min=1,max=95)=>typeof v==="string"&&v.trim().length>=min&&v.length<=max;
export function canonicalYoutubeUrl(raw){
 if(!raw)return null;
 try{
  const u=new URL(String(raw).trim());
  if(u.protocol!=="https:"||u.username||u.password||u.port)return null;
  const host=u.hostname.toLowerCase();
  const watch=["youtube.com","www.youtube.com","m.youtube.com"].includes(host);
  const short=["youtu.be","www.youtu.be"].includes(host);
  if(!watch&&!short)return null;
  let id=null;
  if(short&&/^\/[a-zA-Z0-9_-]{11}\/?$/.test(u.pathname))id=u.pathname.split("/")[1];
  else if(watch&&u.pathname==="/watch")id=u.searchParams.get("v");
  else if(watch&&/^\/(?:shorts|embed|live)\/[a-zA-Z0-9_-]{11}\/?$/.test(u.pathname))id=u.pathname.split("/")[2];
  if(!/^[a-zA-Z0-9_-]{11}$/.test(id||""))return null;
  return "https://www.youtube.com/watch?v="+id;
 }catch{return null;}
}
export function instructionForExercise(ex){
 return ex&&typeof ex.cues==="string"&&ex.cues.trim()&&!/Not approved for client use\./i.test(ex.cues)?
 str(ex.cues,400):"Ask your coach for the correct setup and technique for this exercise.";
}
export function videoForExercise(ex){
 return canonicalYoutubeUrl(ex?.videoUrl)||null;
}
export function validPrescription(p){
 return !!(p&&Number.isInteger(p.feederSets)&&p.feederSets>=0&&p.feederSets<=3&&
 Number.isInteger(p.workingSets)&&p.workingSets>=1&&p.workingSets<=8&&
 Number.isInteger(p.repsMin)&&p.repsMin>=1&&p.repsMin<=60&&
 Number.isInteger(p.repsMax)&&p.repsMax>=p.repsMin&&p.repsMax<=60&&
 Number.isInteger(p.restSeconds)&&p.restSeconds>=20&&p.restSeconds<=300&&
 typeof p.tempo==="string"&&(!p.tempo||/^\d-\d-\d-\d$/.test(p.tempo))&&
 (p.loadKg===null||typeof p.loadKg==="number"&&Number.isFinite(p.loadKg)&&p.loadKg>=0&&p.loadKg<=400)&&
 typeof p.notes==="string"&&p.notes.length<=400);
}
export function parsePrescription(input){
 const has=(key)=>input[key]!==undefined&&input[key]!==null&&String(input[key]).trim()!=="";
 const parsed={
  feederSets:has("feederSets")?Number(input.feederSets):DEFAULT_PRESCRIPTION.feederSets,
  workingSets:has("workingSets")?Number(input.workingSets):DEFAULT_PRESCRIPTION.workingSets,
  repsMin:has("repsMin")?Number(input.repsMin):DEFAULT_PRESCRIPTION.repsMin,
  repsMax:has("repsMax")?Number(input.repsMax):DEFAULT_PRESCRIPTION.repsMax,
  restSeconds:has("restSeconds")?Number(input.restSeconds):DEFAULT_PRESCRIPTION.restSeconds,
  tempo:str(input.tempo,20),
  loadKg:has("loadKg")?Number(input.loadKg):null,
  notes:str(input.notes,400)
 };
 if(!validPrescription(parsed))throw Error("Set valid feeder/working sets, reps, rest and optional tempo/load. No RIR required.");
 return parsed;
}
export function newProgramme(id,name="Untitled training plan",source="manual"){
 if(!validId(id)||!PLAN_SOURCES.includes(source))throw Error("Invalid demo plan identity.");
 return {id,name,goal:"",source,createdAt:new Date().toISOString(),
  sessions:[{id:"session:1",name:"Session 1",exercises:[]}],notes:""};
}
export function validProgramme(plan,exercises,{allowEmpty=false}={}){
 if(!plan||!validId(plan.id)||!validText(plan.name,3,90)||!validText(plan.goal,0,180)||
 !PLAN_SOURCES.includes(plan.source)||!Array.isArray(plan.sessions)||
 plan.sessions.length<1||plan.sessions.length>MAX_SESSIONS||!Array.isArray(exercises))return false;
 if(new Set(plan.sessions.map(s=>s.id)).size!==plan.sessions.length)return false;
 return plan.sessions.every(s=>/^session:[0-9]+$/.test(s.id)&&validText(s.name,3,90)&&
 Array.isArray(s.exercises)&&s.exercises.length<=MAX_EXERCISES&&
 (allowEmpty||s.exercises.length>0)&&s.exercises.every(row=>
  /^row:[a-z0-9-]+$/.test(row.id)&&typeof row.exerciseId==="string"&&
  exercises.some(ex=>ex.id===row.exerciseId&&validExercise(ex))&&validPrescription(row.prescription))&&
 new Set(s.exercises.map(row=>row.id)).size===s.exercises.length);
}
export function updateProgrammeBasics(draft,{name,goal,notes}={}){
 if(!draft)throw Error("No draft open.");
 const n={...draft,name:str(name??draft.name,90),goal:str(goal??draft.goal,180),
 notes:str(notes??draft.notes,600)};
 if(!validText(n.name,3,90))throw Error("Give the programme a name (at least 3 characters).");
 return n;
}
export function addProgrammeSession(draft){
 if(draft.sessions.length>=MAX_SESSIONS)throw Error("Maximum seven ordered sessions in the demo.");
 const next=Math.max(0,...draft.sessions.map(s=>Number(s.id.split(":")[1])||0))+1;
 return {...draft,sessions:[...draft.sessions,{id:"session:"+next,name:"Session "+next,exercises:[]}]};
}
export function renameProgrammeSession(draft,sid,name){
 if(!validText(str(name,90),3,90))throw Error("Session name must contain at least three characters.");
 if(!draft.sessions.some(s=>s.id===sid))throw Error("Session not found.");
 return {...draft,sessions:draft.sessions.map(s=>s.id===sid?{...s,name:str(name,90)}:s)};
}
export function removeProgrammeSession(draft,sid){
 if(draft.sessions.length===1)throw Error("At least one session must remain.");
 if(!draft.sessions.some(s=>s.id===sid))throw Error("Session not found.");
 return {...draft,sessions:draft.sessions.filter(s=>s.id!==sid)};
}
export function insertProgrammeExercise(draft,sessionId,exerciseId,library){
 const ex=library?.exercises?.find(x=>x.id===exerciseId&&x.active);
 if(!ex||!validExercise(ex))throw Error("Choose an active exercise from the fictional library.");
 const session=draft.sessions.find(s=>s.id===sessionId);
 if(!session)throw Error("Session not found.");
 if(session.exercises.length>=MAX_EXERCISES)throw Error("Maximum 18 exercises per session.");
 const next=Math.max(0,...draft.sessions.flatMap(s=>s.exercises.map(x=>Number(x.id.split(":")[1])||0)))+1;
 const row={id:"row:"+next,exerciseId:ex.id,prescription:clone(DEFAULT_PRESCRIPTION)};
 return {...draft,sessions:draft.sessions.map(s=>s.id===sessionId?{...s,exercises:[...s.exercises,row]}:s)};
}
export function editProgrammeExercise(draft,sessionId,rowId,fields){
 let found=false;
 const sessions=draft.sessions.map(s=>s.id===sessionId?{...s,exercises:s.exercises.map(row=>{
  if(row.id!==rowId)return row;
  found=true;return {...row,prescription:parsePrescription(fields)};
 })}:s);
 if(!found)throw Error("Exercise row not found.");
 return {...draft,sessions};
}
export function removeProgrammeExercise(draft,sessionId,rowId){
 if(!draft.sessions.some(s=>s.id===sessionId&&s.exercises.some(e=>e.id===rowId)))
 throw Error("Exercise row not found.");
 return {...draft,sessions:draft.sessions.map(s=>s.id===sessionId?{
  ...s,exercises:s.exercises.filter(x=>x.id!==rowId)}:s)};
}
export function importAIProgramme(text,id,library){
 if(typeof text!=="string"||text.length>30000)throw Error("AI JSON must be a small structured object.");
 let data;try{data=JSON.parse(text);}catch{throw Error("Paste valid JSON with name, goal and ordered sessions.");}
 if(!data||Array.isArray(data)||!Array.isArray(data.sessions)||data.sessions.length<1||data.sessions.length>MAX_SESSIONS)
 throw Error("AI JSON requires 1–7 sessions; do not paste general chat instructions.");
 let plan=newProgramme(id,str(data.name,90)||"AI programme draft","ai-import");
 plan=updateProgrammeBasics(plan,{name:plan.name,goal:data.goal||"",notes:data.notes||""});
 plan.sessions=data.sessions.map((s,i)=>{
  if(!s||!validText(s.name,3,90)||!Array.isArray(s.exercises)||!s.exercises.length||s.exercises.length>MAX_EXERCISES)
  throw Error("Each AI session needs a name and 1–18 exercises.");
  return {id:"session:"+(i+1),name:str(s.name,90),exercises:s.exercises.map((row,j)=>{
   if(!row||!library.exercises.some(ex=>ex.id===row.exerciseId&&ex.active))
    throw Error("Unknown or inactive exercise ID in AI draft; select only catalogue IDs.");
   return {id:"row:"+(i*MAX_EXERCISES+j+1),exerciseId:row.exerciseId,prescription:parsePrescription(row)};
  })};
 });
 if(!validProgramme(plan,library.exercises))throw Error("AI programme did not pass plan validation.");
 return plan; // An AI import is always a coach-editable draft, never published automatically.
}
export function validProgrammeLibrary(templates,assignments,exercises){
 return Array.isArray(templates)&&templates.length<=80&&templates.every(t=>
  /^template:[a-z0-9-]+$/.test(t.id)&&validText(t.name,3,90)&&Array.isArray(t.versions)&&
  t.versions.length>0&&t.versions.length<=30&&t.versions.every((v,i)=>v.version===i+1&&
  validProgramme(v.plan,exercises)))&&
 Array.isArray(assignments)&&assignments.length<=250&&assignments.every(a=>
  validId(a.id)&&typeof a.clientId==="string"&&Array.isArray(a.sessions)&&
  a.sessions.every(s=>typeof s.name==="string"&&Array.isArray(s.exercises)));
}
export function saveNewTemplate(templates,draft,library,id){
 if(!/^template:[a-z0-9-]+$/.test(id)||templates.some(t=>t.id===id))throw Error("Duplicate template ID.");
 if(!validProgramme(draft,library.exercises)||/^(new|untitled) training plan$/i.test(draft.name.trim()))throw Error("Give the plan a descriptive name and include an exercise in each session.");
 if(templates.length>=80)throw Error("Demo saved plan limit reached.");
 const snapshot=clone(draft),createdAt=new Date().toISOString();
 const t={id,name:draft.name,createdAt,versions:[{version:1,plan:snapshot,savedAt:createdAt}]};
 return [...templates,t];
}
export function saveTemplateVersion(templates,templateId,draft,library){
 if(!validProgramme(draft,library.exercises))throw Error("Complete a valid draft before saving a template version.");
 const t=templates.find(x=>x.id===templateId);
 if(!t)throw Error("Template not found.");
 if(t.versions.length>=30)throw Error("Maximum 30 template versions in demo.");
 return templates.map(x=>x.id===templateId?{
  ...x,name:draft.name,versions:[...x.versions,{version:x.versions.length+1,plan:clone(draft),savedAt:new Date().toISOString()}]
 }:x);
}
export function loadTemplateIntoDraft(template,newId,version=null){
 if(!template?.versions?.length||!validId(newId))throw Error("Saved plan could not be loaded.");
 const found=version===null?template.versions.at(-1):template.versions.find(x=>x.version===version);
 if(!found)throw Error("Requested template version missing.");
 return {...clone(found.plan),id:newId,source:"saved-template",createdAt:new Date().toISOString()};
}
export function latestTemplateVersion(t){return t.versions.at(-1);}
export function clientPlanWarnings(plan,library,availableEquipment){
 const problems=[];
 if(!validProgramme(plan,library.exercises))problems.push("Plan is incomplete or an exercise ID is missing.");
 if(!validEquipmentIds(availableEquipment))problems.push("Client equipment has not been confirmed.");
 for(const s of plan.sessions)for(const row of s.exercises){
  const ex=library.exercises.find(e=>e.id===row.exerciseId);
  if(!ex||!ex.active){problems.push(s.name+": missing or archived "+row.exerciseId);continue;}
  if(ex.reviewStatus!=="demo-reviewed")problems.push(ex.name+": coach demo review outstanding.");
  if(validEquipmentIds(availableEquipment)&&ex.primaryEquipment.some(e=>!availableEquipment.includes(e)))
  problems.push(ex.name+": client equipment unavailable.");
 }
 return [...new Set(problems)];
}
export function assignTemplateToClient(assignments,template,client,library,id){
 if(!validId(id)||assignments.some(x=>x.id===id))throw Error("Assignment ID must be unique.");
 const current=latestTemplateVersion(template);
 if(!current||!client?.id)throw Error("Choose a saved programme and fictional client.");
 const warnings=clientPlanWarnings(current.plan,library,library.clientEquipment[client.id]||[]);
 if(warnings.length)throw Error("Cannot assign this demo: "+warnings[0]);
 if(assignments.length>=250)throw Error("Demo assignment limit reached.");
 const sessions=current.plan.sessions.map(s=>({
  id:s.id,name:s.name,exercises:s.exercises.map(row=>{
   const ex=library.exercises.find(x=>x.id===row.exerciseId);
   return {id:row.id,exerciseId:row.exerciseId,name:ex.name,exerciseVersion:ex.version,
    prescription:clone(row.prescription),instructions:instructionForExercise(ex),
    youtubeUrl:videoForExercise(ex)};})}));
 const previous=assignments.findLast(a=>a.clientId===client.id&&a.current);
 const updated=assignments.map(a=>a.clientId===client.id&&a.current?{...a,current:false}:a);
 return [...updated,{id,clientId:client.id,clientName:client.name,templateId:template.id,
  templateVersion:current.version,name:current.plan.name,goal:current.plan.goal,
  sessions,assignedAt:new Date().toISOString(),current:true,
  supersedes:previous?.id||null,source:current.plan.source}];
}
export function currentClientAssignment(assignments,clientId){
 return assignments.findLast(a=>a.clientId===clientId&&a.current)||null;
}
export function programmeMetrics(plan){
 return {sessions:plan.sessions.length,exercises:plan.sessions.reduce((n,s)=>n+s.exercises.length,0)};
}
