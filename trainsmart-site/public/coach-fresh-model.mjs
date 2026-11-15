/* D03.1 — strictly fictional fresh enrolment model. No sensitive client data or network access. */
export const DEMO_VERSION="D03.1-FICTIONAL-1";
export const SERVICES=Object.freeze([
 {id:"pt",label:"Personal training"},
 {id:"online",label:"Online coaching"},
 {id:"group",label:"Small-group training"}
]);
export const DOCUMENTS=Object.freeze([
 {id:"screen",name:"Pre-exercise screening",kind:"health",required:true,services:["pt","online","group"],summary:"Example health-review flag only — not an actual PAR-Q."},
 {id:"exercise",name:"Exercise consent",kind:"signature",required:true,services:["pt","online","group"],summary:"Demonstration agreement only, not the approved exercise consent text."},
 {id:"consultation",name:"Training consultation",kind:"form",required:true,services:["pt","online","group"],summary:"Example goals and availability confirmation."},
 {id:"terms",name:"Coaching agreement",kind:"signature",required:true,services:["pt","online","group"],summary:"Demonstration terms only, not an enforceable agreement."},
 {id:"privacy",name:"Privacy notice",kind:"acknowledgment",required:true,services:["pt","online","group"],summary:"Example acknowledgment; not consent to health processing or marketing."},
 {id:"nutrition",name:"Nutrition preferences",kind:"form",required:true,services:["pt","online"],summary:"Demo preferences acknowledgment; not a professional allergy assessment."},
 {id:"media",name:"Photo and video permission",kind:"optional",required:false,services:["pt","online","group"],summary:"Separate, voluntary and revocable example choice."}
]);
const clean=(v,n)=>String(v??"").trim().slice(0,n);
const hasName=x=>clean(x,80).length>=2;
export function validPhone(input){const s=clean(input,40);return /^[+\d()\s-]+$/.test(s)&&s.replace(/\D/g,"").length>=7&&s.replace(/\D/g,"").length<=15;}
export function freshEnrollment(client,service="pt"){
 if(!client?.id||!SERVICES.some(s=>s.id===service))throw Error("Choose a fictional client and valid service.");
 return {clientId:client.id,service,phase:"collecting",contacts:{
  email:"",phone:"",emergencyName:"",emergencyRelation:"",emergencyPhone:"",contactVerified:false,emergencyVerified:false,confirmedAt:""
 },baseline:{heightCm:null,weightKg:null,measuredAt:"",coachVerified:false},
 documents:Object.fromEntries(DOCUMENTS.filter(d=>d.services.includes(service)).map(d=>[d.id,{
  id:d.id,status:"missing",version:DEMO_VERSION,flag:"none",signedBy:"",submittedAt:"",reviewedAt:"",reviewNote:""
 }])),
 documentPackConfirmed:false,trainingPlan:"not_started",mealPlan:service==="group"?"not_applicable":"not_started",createdAt:"FICTIONAL DEMO",
 events:["Fresh enrolment created; previous plans and signed forms were NOT transferred"]};
}
export function validEnrollment(e,id){
 return !!(e&&e.clientId===id&&SERVICES.some(s=>s.id===e.service)&&e.contacts&&e.baseline&&e.documents&&
 Object.keys(e.documents).every(k=>DOCUMENTS.some(d=>d.id===k))&&["not_started","draft","approved"].includes(e.trainingPlan)&&
 ["not_started","draft","approved","not_applicable"].includes(e.mealPlan)&&Array.isArray(e.events)&&e.events.length<=100);
}
function withEvent(e,event){return {...e,events:[...e.events,event].slice(-100)};}
export function updateContacts(e,form){
 const contact={
 email:clean(form.email,110),phone:clean(form.phone,40),
 emergencyName:clean(form.emergencyName,80),emergencyRelation:clean(form.emergencyRelation,50),
 emergencyPhone:clean(form.emergencyPhone,40),
 contactVerified:false,emergencyVerified:false,confirmedAt:""
 };
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)||!validPhone(contact.phone))throw Error("Enter a valid fictional email and telephone number.");
 if(!hasName(contact.emergencyName)||contact.emergencyRelation.length<2||!validPhone(contact.emergencyPhone))throw Error("Complete the fictional emergency contact name, relationship and telephone number.");
 return withEvent({...e,contacts:contact},"Fictional contact details updated; verification now required");
}
export function verifyContacts(e,kind){
 if(!["contact","emergency"].includes(kind))throw Error("Unknown verification type.");
 const c={...e.contacts};
 if(!validPhone(c.phone)||!c.email||!validPhone(c.emergencyPhone)||!hasName(c.emergencyName))throw Error("Save example contact and emergency details first.");
 if(kind==="contact")c.contactVerified=true;else c.emergencyVerified=true;
 c.confirmedAt=new Date().toISOString();
 return withEvent({...e,contacts:c},"Coach confirmed "+kind+" details in DEMO only");
}
export function updateBaseline(e,form){
 const heightCm=Number(form.heightCm),weightKg=Number(form.weightKg),measuredAt=clean(form.measuredAt,10);
 if(!Number.isFinite(heightCm)||heightCm<80||heightCm>250||!Number.isFinite(weightKg)||weightKg<20||weightKg>400||
 !/^\d{4}-\d{2}-\d{2}$/.test(measuredAt)||!Number.isFinite(Date.parse(measuredAt+"T12:00:00Z"))||
 measuredAt>new Date().toISOString().slice(0,10))throw Error("Enter a valid fictional height (80–250 cm), weight (20–400 kg) and measurement date.");
 return withEvent({...e,baseline:{heightCm,weightKg,measuredAt,coachVerified:false}},"Fresh fictional baseline recorded; old metrics were not copied");
}
export function verifyBaseline(e){
 if(!e.baseline.measuredAt||!e.baseline.heightCm||!e.baseline.weightKg)throw Error("Record a new fictional baseline first.");
 return withEvent({...e,baseline:{...e.baseline,coachVerified:true}},"Coach confirmed fictional fresh baseline");
}
export function submitDocument(e,id,action,signer=""){
 const template=DOCUMENTS.find(d=>d.id===id&&d.services.includes(e.service));
 if(!template||!e.documents[id])throw Error("Document is not assigned to this client.");
 const previous=e.documents[id];
 let status="submitted",flag="none",signedBy="";
 if(template.kind==="health"){
  if(!["no_flag","flag"].includes(action))throw Error("Choose a fictional screening outcome.");
  status="review";flag=action;
 }else if(template.kind==="signature"){
  if(action!=="sign"||clean(signer,80).length<2)throw Error("Enter a fictional signer's name for a demo signature.");
  status="signed";signedBy=clean(signer,80);
 }else if(template.kind==="acknowledgment"){
  if(action!=="acknowledge")throw Error("Acknowledge the fictional notice.");
  status="acknowledged";
 }else if(template.kind==="optional"){
  if(!["yes","no"].includes(action))throw Error("Choose yes or no for voluntary sample media permission.");
  status=action==="yes"?"consented":"declined";
 }else if(action!=="complete")throw Error("Confirm completion of the fictional form.");
 const docs={...e.documents,[id]:{...previous,status,flag,signedBy,submittedAt:new Date().toISOString(),reviewedAt:"",reviewNote:""}};
 return withEvent({...e,documents:docs},"Demo "+template.name+" updated — NOT LEGALLY EXECUTED");
}
export function reviewHealth(e,outcome,note=""){
 const doc=e.documents.screen;if(!doc||!["review","hold"].includes(doc.status))throw Error("No sample screening is awaiting review.");
 if(!["approve","hold"].includes(outcome))throw Error("Review outcome invalid.");
 const reviewNote=clean(note,260);
 if(doc.flag==="flag"&&outcome==="approve"&&reviewNote.length<10)throw Error("Flagged demo screening needs a specific coach review note.");
 const docs={...e.documents,screen:{...doc,status:outcome==="approve"?"approved":"hold",reviewNote,reviewedAt:new Date().toISOString()}};
 return withEvent({...e,documents:docs},outcome==="approve"?"Fictional screening reviewed by coach — NOT medical clearance":"Fictional screening requires follow-up");
}
export function confirmAssignedDocumentPack(e){
 const all=DOCUMENTS.filter(d=>d.required&&d.services.includes(e.service));
 if(!all.length||all.some(d=>!e.documents[d.id]))throw Error("A required template has not been assigned.");
 // Coach confirms the fictional list only; this is not consent, health clearance or signing.
 return withEvent({...e,documentPackConfirmed:true},"Fictional paperwork pack reviewed for invitation; client signatures still required after login");
}
export function docComplete(d){
 const template=DOCUMENTS.find(x=>x.id===d.id);
 if(!template)return false;
 if(template.kind==="health")return d.status==="approved";
 if(template.kind==="signature")return d.status==="signed";
 if(template.kind==="acknowledgment")return d.status==="acknowledged";
 if(template.kind==="optional")return ["consented","declined"].includes(d.status);
 return d.status==="submitted";
}
export function freshReadiness(e){
 const contacts=!!(e.contacts.contactVerified&&e.contacts.emergencyVerified);
 const baseline=!!e.baseline.coachVerified;
 const required=Object.values(e.documents).filter(d=>DOCUMENTS.find(x=>x.id===d.id)?.required);
 const paperwork=required.length>0&&required.every(docComplete);
 const plans=e.trainingPlan==="approved"&&(e.mealPlan==="approved"||e.mealPlan==="not_applicable");
 return {contacts,baseline,paperwork,readyForProgramming:contacts&&baseline&&paperwork,readyForActivation:contacts&&baseline&&paperwork&&plans};
}
export function nextFreshStep(e){
 const r=freshReadiness(e);
 if(!e.contacts.contactVerified)return {key:"contact",label:"Verify personal contact information",type:"contact"};
 if(!e.contacts.emergencyVerified)return {key:"emergency",label:"Verify emergency contact",type:"contact"};
 if(!r.baseline)return {key:"baseline",label:"Record and verify fresh starting measurements",type:"baseline"};
 if(!r.paperwork)return {key:"paperwork",label:"Complete and review the new paperwork pack",type:"documents"};
 if(e.trainingPlan!=="approved")return {key:"training",label:"Create a new training programme",type:"pending_builder"};
 if(e.mealPlan!=="approved"&&e.mealPlan!=="not_applicable")return {key:"meals",label:"Create a new meal plan",type:"pending_builder"};
 return {key:"ready",label:"Ready for coach activation review",type:"future"};
}
export function syncFreshTasks(tasks,e,client,day){
 if(!e||!client)return tasks;
 const step=nextFreshStep(e),prefix="fresh:"+e.clientId+":";
 const historical=tasks.map(t=>t.id.startsWith(prefix)&&t.id!==prefix+step.key&&t.status!=="completed"?{...t,status:"completed"}:t);
 if(client.status==="Archived"||step.key==="ready")return historical;
 const id=prefix+step.key;
 if(historical.some(t=>t.id===id))return historical;
 return [...historical,{id,clientId:e.clientId,kind:"fresh",title:step.label+" — "+client.name,
  priority:step.key==="paperwork"?"high":"normal",due:day,estimate:10,
  note:"Fresh client enrolment (fictional). Old records are archived; no plans or signatures transferred.",status:"open",created:tasks.length}];
}
export function clearOldDemoClient(client){return {...client,status:"Onboarding",plan:"Not assigned",phase:"Fresh enrolment",progress:"No new sessions",checkin:"Not scheduled",onboarding:"Fresh start"};}
export function enrollmentSummary(clients,records){
 const active=Object.values(records||{}).filter(e=>clients.some(c=>c.id===e.clientId&&c.status!=="Archived"));
 return {total:active.length,pending:active.filter(e=>!freshReadiness(e).readyForProgramming).length,
 ready:active.filter(e=>freshReadiness(e).readyForProgramming).length,contacts:active.filter(e=>!freshReadiness(e).contacts).length,
 paperwork:active.filter(e=>!freshReadiness(e).paperwork).length};
}
