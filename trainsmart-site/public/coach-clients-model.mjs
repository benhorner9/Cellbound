/*
 * TrainSmart Coach Hub D02 — fictional client profile model only.
 * No production identifiers, email sending, Supabase, or external requests.
 * All changes are browser-session fixtures and NOT secure client records.
 */
const STATUSES=Object.freeze(["Active","Paused","Onboarding","Archived"]);
const EXPERIENCE=Object.freeze(["beginner","intermediate","advanced"]);
export const fixtureClients=Object.freeze([
 {id:"sarah",name:"Sarah Morgan",initials:"SM",goal:"Strength & confidence",plan:"Strength Foundations",phase:"Week 3 of 6",status:"Active",checkin:"Review due",progress:"4 / 5 sessions",experience:"intermediate",equipment:"TrainSmart Gym",trainingDays:3,sessionMinutes:60,privateNotes:"Demo: prefers lunchtime sessions.",onboarding:"Complete",contact:"Fictional contact only"},
 {id:"james",name:"James Carter",initials:"JC",goal:"Build consistency",plan:"Full Body Basics",phase:"Week 2 of 4",status:"Active",checkin:"Friday",progress:"2 / 3 sessions",experience:"beginner",equipment:"Dumbbells, bands",trainingDays:3,sessionMinutes:45,privateNotes:"Demo: review weekly attendance.",onboarding:"Complete",contact:"Fictional contact only"},
 {id:"tom",name:"Tom Ellis",initials:"TE",goal:"Improve performance",plan:"Performance Block",phase:"Week 6 of 6",status:"Active",checkin:"Completed",progress:"6 / 6 sessions",experience:"advanced",equipment:"TrainSmart Gym",trainingDays:4,sessionMinutes:60,privateNotes:"Demo: needs upcoming programme review.",onboarding:"Complete",contact:"Fictional contact only"},
 {id:"emily",name:"Emily Turner",initials:"ET",goal:"Fat loss & fitness",plan:"Hybrid Training",phase:"Week 1 of 8",status:"Active",checkin:"Review due",progress:"2 / 3 sessions",experience:"intermediate",equipment:"TrainSmart Gym",trainingDays:3,sessionMinutes:45,privateNotes:"Demo: first week check-in due.",onboarding:"Complete",contact:"Fictional contact only"},
 {id:"chris",name:"Chris Bailey",initials:"CB",goal:"Build strength",plan:"Gym Foundations",phase:"Week 4 of 8",status:"Active",checkin:"Sunday",progress:"3 / 3 sessions",experience:"beginner",equipment:"Barbell, rack, dumbbells",trainingDays:3,sessionMinutes:60,privateNotes:"Demo: confirm equipment availability.",onboarding:"Complete",contact:"Fictional contact only"}
]);
export function defaultClients(){return fixtureClients.map(c=>({...c}));}
export function clientInitials(name){return String(name).trim().split(/\s+/).slice(0,2).map(x=>x.slice(0,1).toUpperCase()).join("")||"?";}
function trimmed(value,max){return String(value??"").trim().slice(0,max);}
export function validateClientForm(input){
 const name=trimmed(input.name,80);
 const goal=trimmed(input.goal,280);
 const equipment=trimmed(input.equipment,280);
 const privateNotes=trimmed(input.privateNotes,1000);
 const experience=String(input.experience||"beginner");
 const status=String(input.status||"Onboarding");
 const trainingDays=Number(input.trainingDays);
 const sessionMinutes=Number(input.sessionMinutes);
 if(name.length<2)throw Error("Enter a fictional client name (2–80 characters).");
 if(goal.length<3)throw Error("Add a short coaching goal.");
 if(!EXPERIENCE.includes(experience))throw Error("Choose a valid experience level.");
 if(!STATUSES.includes(status))throw Error("Choose a valid client status.");
 if(!Number.isInteger(trainingDays)||trainingDays<1||trainingDays>7)throw Error("Training days must be 1–7.");
 if(!Number.isInteger(sessionMinutes)||sessionMinutes<15||sessionMinutes>180)throw Error("Session length must be 15–180 minutes.");
 return {name,initials:clientInitials(name),goal,equipment,privateNotes,experience,status,trainingDays,sessionMinutes};
}
export function validClient(c){
 return c && typeof c.id==="string" && c.id.length>0 &&
 typeof c.name==="string" && c.name.length>=2 &&
 typeof c.goal==="string" && typeof c.plan==="string" &&
 typeof c.status==="string" && STATUSES.includes(c.status) &&
 EXPERIENCE.includes(c.experience) && Number.isInteger(c.trainingDays) &&
 c.trainingDays>=1 && c.trainingDays<=7 &&
 Number.isInteger(c.sessionMinutes) && c.sessionMinutes>=15 && c.sessionMinutes<=180;
}
export function createFictionalClient(list,form,id){
 if(!Array.isArray(list)||list.length>=50)throw Error("Demo limit: 50 fictional clients.");
 if(typeof id!=="string"||!/^demo-[a-z0-9-]+$/.test(id)||list.some(c=>c.id===id))throw Error("Invalid or duplicate fictional client ID.");
 const fields=validateClientForm(form);
 const client={...fields,id,plan:"Not assigned",phase:"Getting started",checkin:"Not scheduled",progress:"No sessions yet",onboarding:"Draft",contact:"Fictional contact only"};
 return {clients:[...list,client],client};
}
export function updateFictionalClient(list,id,form){
 const client=list.find(c=>c.id===id);
 if(!client)throw Error("The fictional client was not found.");
 const fields=validateClientForm(form);
 return list.map(c=>c.id===id?{...c,...fields}:c);
}
export function changeClientStatus(list,id,status){
 if(!STATUSES.includes(status))throw Error("Choose a valid status.");
 let found=false;
 const changed=list.map(c=>{if(c.id!==id)return c;found=true;return {...c,status};});
 if(!found)throw Error("The fictional client was not found.");
 return changed;
}
export function clientOverview(clients,tasks){
 const active=clients.filter(c=>c.status==="Active").length;
 const onboarding=clients.filter(c=>c.status==="Onboarding").length;
 const paused=clients.filter(c=>c.status==="Paused").length;
 const archived=clients.filter(c=>c.status==="Archived").length;
 const withTasks=clients.filter(c=>c.status!=="Archived"&&tasks.some(t=>t.clientId===c.id&&(t.status==="open"||t.status==="snoozed"))).length;
 return {total:clients.length,active,onboarding,paused,archived,withTasks};
}
export const CLIENT_STATUSES=STATUSES;
