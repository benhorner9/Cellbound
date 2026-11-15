import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {defaultClients} from "../public/coach-clients-model.mjs";
import {
 DEMO_VERSION,DOCUMENTS,SERVICES,validPhone,freshEnrollment,clearOldDemoClient,
 updateContacts,verifyContacts,updateBaseline,verifyBaseline,submitDocument,reviewHealth,
 freshReadiness,nextFreshStep,docComplete,syncFreshTasks,enrollmentSummary,validEnrollment
} from "../public/coach-fresh-model.mjs";
import {renderFreshSection,renderFreshDashboard,documentDialogContent} from "../public/coach-fresh-ui.mjs";
const client=defaultClients()[0];
const contact={email:"fictional@example.invalid",phone:"07700 900123",emergencyName:"Example Friend",emergencyRelation:"Friend",emergencyPhone:"07700 900456"};
const metrics={weightKg:"75.1",heightCm:"171",measuredAt:"2026-11-15"};
function verified(){
 let e=freshEnrollment(client);
 e=updateContacts(e,contact);
 e=verifyContacts(e,"contact");e=verifyContacts(e,"emergency");
 e=updateBaseline(e,metrics);e=verifyBaseline(e);
 return e;
}
function allPaperwork(e){
 for(const [id,d] of Object.entries(e.documents)){
  const t=DOCUMENTS.find(x=>x.id===id);
  if(t.kind==="health"){
   e=submitDocument(e,id,"no_flag");e=reviewHealth(e,"approve");
  }else e=submitDocument(e,id,t.kind==="signature"?"sign":t.kind==="acknowledgment"?"acknowledge":t.kind==="optional"?"no":"complete",t.kind==="signature"?"Fictional Example":"");
 }
 return e;
}
test("D03.1: all former example clients can start a fresh enrolment without copying old plans",()=>{
 const samples=defaultClients().map(clearOldDemoClient);
 assert.equal(samples.length,5);
 assert.ok(samples.every(c=>c.status==="Onboarding"&&c.plan==="Not assigned"&&c.progress==="No new sessions"));
 const newEntry=freshEnrollment(samples[0]);
 assert.equal(newEntry.trainingPlan,"not_started");assert.equal(newEntry.mealPlan,"not_started");
 assert.equal(newEntry.baseline.heightCm,null);assert.equal(newEntry.baseline.weightKg,null);
 assert.equal(newEntry.contacts.phone,"");assert.equal(newEntry.documents.exercise.status,"missing");
 assert.ok(validEnrollment(newEntry,samples[0].id));
 assert.equal(DEMO_VERSION,"D03.1-FICTIONAL-1");
 assert.equal(SERVICES.length,3);
});
test("D03.1: service-appropriate document packs and optional media cannot block",()=>{
 const a=freshEnrollment(client,"pt"),group=freshEnrollment(client,"group"),online=freshEnrollment(client,"online");
 assert.equal(Object.keys(a.documents).length,7);
 assert.equal(Object.keys(group.documents).length,6);
 assert.equal(Object.keys(online.documents).length,7);
 assert.ok(a.documents.media);
 assert.equal(DOCUMENTS.find(x=>x.id==="media").required,false);
 assert.throws(()=>freshEnrollment(client,"invalid"),/valid service/);
});
test("D03.1: genuine-like fictional contact fields must be entered and then independently verified",()=>{
 const e=freshEnrollment(client);
 assert.equal(validPhone(contact.phone),true);
 assert.equal(validPhone("123"),false);
 assert.throws(()=>updateContacts(e,{...contact,emergencyPhone:"bad"}),/emergency/i);
 let saved=updateContacts(e,contact);
 assert.equal(saved.contacts.contactVerified,false);
 assert.throws(()=>verifyContacts(e,"contact"),/Save/);
 saved=verifyContacts(saved,"contact");
 assert.equal(freshReadiness(saved).contacts,false);
 saved=verifyContacts(saved,"emergency");
 assert.equal(freshReadiness(saved).contacts,true);
 assert.equal(saved.contacts.emergencyName,"Example Friend");
 saved=updateContacts(saved,{...contact,phone:"07700 900789"});
 assert.equal(saved.contacts.contactVerified,false);
 assert.equal(saved.contacts.emergencyVerified,false);
});
test("D03.1: fresh measurements require date, units and coach review",()=>{
 let e=freshEnrollment(client);
 assert.throws(()=>updateBaseline(e,{...metrics,weightKg:"0"}),/valid fictional/);
 e=updateBaseline(e,metrics);
 assert.equal(e.baseline.coachVerified,false);
 assert.equal(e.baseline.weightKg,75.1);
 assert.equal(e.baseline.heightCm,171);
 e=verifyBaseline(e);
 assert.equal(e.baseline.coachVerified,true);
 e=updateBaseline(e,{...metrics,weightKg:"75.2"});
 assert.equal(e.baseline.coachVerified,false);
});
test("D03.1: demo signature is never a legal signature or a medical clearance",()=>{
 let e=verified();
 assert.throws(()=>submitDocument(e,"exercise","sign","X"),/fictional signer/);
 e=submitDocument(e,"exercise","sign","Fictional Example");
 assert.equal(e.documents.exercise.status,"signed");
 assert.equal(e.documents.exercise.version,DEMO_VERSION);
 assert.ok(e.documents.exercise.submittedAt);
 assert.equal(freshReadiness(e).readyForProgramming,false);
 e=submitDocument(e,"screen","no_flag");
 assert.equal(e.documents.screen.status,"review");
 assert.equal(freshReadiness(e).paperwork,false);
 e=reviewHealth(e,"approve");
 assert.equal(e.documents.screen.status,"approved");
 assert.match(e.events.at(-1),/NOT medical clearance/);
});
test("D03.1: flagged screening triggers a real coach-review hold in the demonstration",()=>{
 let e=submitDocument(verified(),"screen","flag");
 assert.throws(()=>reviewHealth(e,"approve"),/note/i);
 e=reviewHealth(e,"hold","Further assessment required");
 assert.equal(e.documents.screen.status,"hold");
 assert.equal(freshReadiness(e).paperwork,false);
});
test("D03.1: all required fictional forms can pass but programme/meal plans are never auto-created",()=>{
 let e=allPaperwork(verified());
 assert.equal(freshReadiness(e).readyForProgramming,true);
 assert.equal(freshReadiness(e).readyForActivation,false);
 assert.equal(nextFreshStep(e).key,"training");
 assert.equal(docComplete(e.documents.media),true);
 assert.equal(e.documents.media.status,"declined");
});
test("D03.1: linked next-action tasks are stable, deduplicated and advance with verified steps",()=>{
 let e=freshEnrollment(client);
 let tasks=syncFreshTasks([],e,client,"2026-11-15");
 assert.equal(tasks.length,1);assert.equal(tasks[0].id,"fresh:"+client.id+":contact");
 tasks=syncFreshTasks(tasks,e,client,"2026-11-15");
 assert.equal(tasks.length,1);
 e=verifyContacts(verifyContacts(updateContacts(e,contact),"contact"),"emergency");
 tasks=syncFreshTasks(tasks,e,client,"2026-11-15");
 assert.equal(tasks.length,2);
 assert.equal(tasks[0].status,"completed");
 assert.equal(tasks[1].id,"fresh:"+client.id+":baseline");
 tasks=syncFreshTasks(tasks,e,client,"2026-11-15");
 assert.equal(tasks.length,2);
 assert.equal(enrollmentSummary([client],{[client.id]:e}).pending,1);
});
test("D03.1: fake emergency contact never appears in another client's profile or document HTML",()=>{
 const c2=defaultClients()[1];
 const e=verifyContacts(updateContacts(freshEnrollment(client),contact),"emergency");
 const second=freshEnrollment(c2);
 const other=renderFreshSection(c2,second,"contact");
 assert.doesNotMatch(other,/Example Friend|900456/);
 const documents=renderFreshSection(c2,second,"documents");
 assert.doesNotMatch(documents,/Example Friend|900456/);
 assert.equal(second.contacts.emergencyPhone,"");
 const own=renderFreshSection(client,e,"contact");
 assert.match(own,/Example Friend/);
});
test("D03.1: user-entered fictional content is escaped in the preview",()=>{
 let e=updateContacts(freshEnrollment(client),{...contact,emergencyName:"<img src=x onerror=alert(1)>"});
 const html=renderFreshSection(client,e,"contact");
 assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img src=x/);
 const doc=documentDialogContent(e,"terms");
 assert.match(doc.body,/NOT LEGALLY EXECUTED|FICTIONAL DEMONSTRATION/);
 const dashboard=renderFreshDashboard([client],{[client.id]:e});
 assert.match(dashboard,/Clean-start client queue/);
});
test("D03.1: strict source boundary, no API, live records or real-client documents",async()=>{
 const parts=await Promise.all(["../public/coach-hub.html","../public/coach-hub.mjs","../public/coach-fresh-model.mjs","../public/coach-fresh-ui.mjs","../public/coach-fresh.css"].map(p=>readFile(new URL(p,import.meta.url),"utf8")));
 const [html,hub,model,ui,css]=parts;
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/id="fresh-contact-dialog"/);assert.match(html,/id="fresh-baseline-dialog"/);assert.match(html,/id="fresh-document-dialog"/);
 assert.match(html,/data-view="fresh"/);
 assert.match(hub,/freshEnrollment/);assert.match(hub,/syncFreshTasks/);assert.match(hub,/sessionStorage/);
 assert.match(hub,/freshReadiness/);
 assert.doesNotMatch(model+ui,/\bfetch\s*\(|https:\/\/|supabase\.co|service_role|\bXMLHttpRequest\b/i);
 assert.match(css,/max-width:700px/);
});

test("D03.1: held fictional health screening can only be resolved with a documented coach review",()=>{
 let e=verified();
 e=submitDocument(e,"screen","flag");
 e=reviewHealth(e,"hold","Needs an external review in this demonstration");
 assert.equal(e.documents.screen.status,"hold");
 assert.throws(()=>reviewHealth(e,"approve",""),/note/i);
 e=reviewHealth(e,"approve","Fictional follow-up reviewed and resolved");
 assert.equal(e.documents.screen.status,"approved");
 assert.ok(e.documents.screen.reviewedAt);
});
test("D03.1: group-only programme never creates a compulsory nutrition meal-plan requirement",()=>{
 const e=freshEnrollment(client,"group");
 assert.equal(e.mealPlan,"not_applicable");
 assert.equal(e.documents.nutrition,undefined);
 assert.equal(nextFreshStep(e).key,"contact");
});
test("D03.1: generated enrolment and onboarding tasks are controlled by workflow checks, not manual completion",async()=>{
 const js=await readFile(new URL("../public/coach-hub.mjs",import.meta.url),"utf8");
 assert.match(js,/\["fresh","onboarding"\]\.includes\(task\.kind\)/);
 assert.match(js,/action==="fresh-task"/);
 assert.match(js,/record\.stage==="review"&&\!freshReadiness/);
});

test("D03.1: client editor cannot set Active status until new paperwork and new plans are approved",async()=>{
 const src=await readFile(new URL("../public/coach-hub.mjs",import.meta.url),"utf8");
 assert.match(src,/input\.status==="Active"&&\!freshReadiness/);
 assert.match(src,/status==="Active"&&\!freshReadiness/);
 assert.match(src,/setClientStatus\(btn\.dataset\.clientId,"Onboarding"\)/);
});
