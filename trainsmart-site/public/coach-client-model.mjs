/* D08 client journey, fictional in-browser preview only. No authentication or network access. */
export const COACH_STORE="trainsmart-coach-hub-programmes-06-fictional-v1";
export const NUTRITION_STORE="trainsmart-coach-hub-nutrition-07-fictional-v1";
const copy=v=>JSON.parse(JSON.stringify(v));
const num=(v,min,max,label)=>{
 if(v===""||v===null||v===undefined||!Number.isFinite(Number(v))||Number(v)<min||Number(v)>max)
  throw Error(label+" must be between "+min+" and "+max+".");
 return Number(v);
};
const text=(v,max)=>String(v??"").trim().slice(0,max);
export function currentAssignment(state,clientId){
 return state?.programmeAssignments?.findLast(a=>a.clientId===clientId&&a.current)||null;
}
export function currentMealAssignment(nutrition,clientId){
 return nutrition?.assignments?.findLast(a=>a.clientId===clientId&&a.current)||null;
}
export function sessionHistory(state,clientId,assignmentId){
 return (state?.clientPortalLogs||[]).filter(l=>l.clientId===clientId&&l.assignmentId===assignmentId&&l.completed===true)
  .slice().sort((a,b)=>a.sessionIndex-b.sessionIndex);
}
export function nextSession(state,clientId){
 const assignment=currentAssignment(state,clientId);
 if(!assignment)return null;
 const done=sessionHistory(state,clientId,assignment.id);
 const idx=assignment.sessions.findIndex((s,i)=>!done.some(l=>l.sessionIndex===i));
 return idx<0?null:{assignment,session:assignment.sessions[idx],index:idx,completedCount:done.length};
}
export function storedSession(state,clientId,assignmentId,index){
 return (state?.clientPortalLogs||[]).find(l=>l.clientId===clientId&&l.assignmentId===assignmentId&&l.sessionIndex===index)||null;
}
export function saveClientSession(state,clientId,assignmentId,index,entries,{complete=false,at=new Date().toISOString()}={}){
 const client=state?.clients?.find(c=>c.id===clientId&&c.status!=="Archived");
 if(!client)throw Error("Sample client is unavailable.");
 const assignment=currentAssignment(state,clientId);
 if(!assignment||assignment.id!==assignmentId)throw Error("The coach has replaced this plan. Reload the latest assigned programme.");
 const next=nextSession(state,clientId);
 if(!next||next.index!==index)throw Error("Only the next ordered session can be recorded.");
 if(!Array.isArray(entries)||entries.length!==next.session.exercises.length)throw Error("Every prescribed exercise must be included.");
 if(storedSession(state,clientId,assignmentId,index)?.completed)throw Error("A completed session cannot be edited.");
 const rows=next.session.exercises.map(ex=>{
  const entry=entries.find(e=>e.rowId===ex.id);
  if(!entry)throw Error("A prescribed exercise is missing.");
  const skipReason=text(entry.skipReason,200);
  if(!Array.isArray(entry.sets)||entry.sets.length!==ex.prescription.workingSets)throw Error("Incorrect number of sets for "+ex.name+".");
  if(skipReason&&entry.sets.some(s=>s.reps!==""&&s.reps!==null&&s.reps!==undefined))throw Error("Skipped exercises cannot also have performed sets.");
  const sets=entry.sets.map(s=>{
   if(skipReason)return {reps:null,loadKg:null};
   const missingReps=s.reps===""||s.reps===null||s.reps===undefined;
   const missingLoad=s.loadKg===""||s.loadKg===null||s.loadKg===undefined;
   return {reps:missingReps?null:num(s.reps,1,60,"Reps"),
    loadKg:missingLoad?null:num(s.loadKg,0,500,"Weight")};
  });
  if(complete&&!skipReason&&sets.some(s=>s.reps===null))throw Error("Log each set or add a skip reason for "+ex.name+".");
  if(complete&&skipReason&&skipReason.length<5)throw Error("Explain a skipped exercise in at least five characters.");
  return {rowId:ex.id,exerciseId:ex.exerciseId,name:ex.name,skipReason,sets};
 });
 if(complete&&!rows.some(r=>r.sets.some(s=>s.reps!==null)))throw Error("Record at least one completed set before finishing.");
 const log={clientId,assignmentId,sessionIndex:index,sessionId:next.session.id,
  sessionName:next.session.name,rows,completed:!!complete,
  updatedAt:at,completedAt:complete?at:null};
 const prior=(state.clientPortalLogs||[]).filter(x=>!(x.clientId===clientId&&x.assignmentId===assignmentId&&x.sessionIndex===index));
 return {...state,clientPortalLogs:[...prior,log].slice(-200)};
}
export function lastWeight(state,clientId,exerciseId){
 const all=(state?.clientPortalLogs||[]).filter(l=>l.clientId===clientId&&l.completed)
  .slice().sort((a,b)=>String(b.completedAt).localeCompare(String(a.completedAt)));
 for(const log of all)for(const row of log.rows||[])if(row.exerciseId===exerciseId){
  const set=[...(row.sets||[])].reverse().find(s=>s.reps!==null&&Number.isFinite(s.loadKg));
  if(set)return set.loadKg;
 }
 return null;
}
export function weekStart(dateStr){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dateStr))throw Error("Invalid date.");
 const d=new Date(dateStr+"T12:00:00Z");if(Number.isNaN(d.valueOf())||d.toISOString().slice(0,10)!==dateStr)throw Error("Invalid date.");
 d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);
}
export function latestCheckin(state,clientId,week){
 return (state?.clientPortalCheckins||[]).find(x=>x.clientId===clientId&&x.week===week)||null;
}
export function saveWeeklyCheckin(state,clientId,week,input,at=new Date().toISOString()){
 if(!state?.clients?.some(c=>c.id===clientId&&c.status!=="Archived"))throw Error("Sample client unavailable.");
 const monday=weekStart(week),energy=num(input.energy,1,5,"Energy"),sleep=num(input.sleep,1,5,"Sleep");
 const weightKg=input.weightKg===""||input.weightKg==null?null:num(input.weightKg,25,350,"Weight (kg)");
 const existing=latestCheckin(state,clientId,monday);
 const value={clientId,week:monday,energy,sleep,weightKg,notes:text(input.notes,400),
  revision:(existing?.revision||0)+1,submittedAt:at};
 return {...state,clientPortalCheckins:[...(state.clientPortalCheckins||[]).filter(x=>!(x.clientId===clientId&&x.week===monday)),value].slice(-200)};
}
