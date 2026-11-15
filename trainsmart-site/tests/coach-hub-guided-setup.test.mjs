import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {defaultClients} from "../public/coach-clients-model.mjs";
import {freshEnrollment,updateContacts,verifyContacts,updateBaseline,verifyBaseline,submitDocument,reviewHealth,confirmAssignedDocumentPack,DOCUMENTS} from "../public/coach-fresh-model.mjs";
import {SETUP_STEPS,SETUP_DELIVERY,setupChecks,firstOutstandingStep,firstOutstandingDocument,nextWizardStep,wizardCanAdvance,inviteEligibility,sampleInvite} from "../public/coach-setup-model.mjs";
import {renderSetupWizard} from "../public/coach-setup-ui.mjs";
const client=defaultClients()[0];
const start=()=>freshEnrollment(client);
const contact={email:"fictional@example.invalid",phone:"07700 900123",emergencyName:"Example Contact",emergencyRelation:"Friend",emergencyPhone:"07700 900456"};
const base={heightCm:"173",weightKg:"74",measuredAt:"2026-11-15"};

test("D03.2: wizard has ordered profile, contacts, baseline, paperwork, new plans and invite steps",()=>{
 assert.deepEqual(SETUP_STEPS.map(s=>s.id),["profile","contacts","baseline","documents","training","nutrition","invite"]);
 assert.equal(nextWizardStep("profile"),"contacts");
 assert.equal(nextWizardStep("nutrition"),"invite");
 assert.equal(nextWizardStep("invite"),"invite");
 assert.equal(firstOutstandingStep(client,start()),"contacts");
 assert.equal(setupChecks(client,start()).profile,true);
 assert.equal(SETUP_DELIVERY,"disabled_until_f00_and_real_auth");
});
test("D03.2: contact stage requires independent emergency verification before advancing",()=>{
 let e=updateContacts(start(),contact);
 assert.equal(firstOutstandingStep(client,e),"contacts");
 assert.equal(wizardCanAdvance(client,e,"contacts"),false);
 e=verifyContacts(e,"contact");
 assert.equal(firstOutstandingStep(client,e),"contacts");
 e=verifyContacts(e,"emergency");
 assert.equal(firstOutstandingStep(client,e),"baseline");
 assert.equal(wizardCanAdvance(client,e,"contacts"),true);
});
test("D03.2: new measurements do not inherit old records and require approval",()=>{
 let e=verifyContacts(verifyContacts(updateContacts(start(),contact),"contact"),"emergency");
 e=updateBaseline(e,base);
 assert.equal(firstOutstandingStep(client,e),"baseline");
 e=verifyBaseline(e);
 assert.equal(firstOutstandingStep(client,e),"documents");
 assert.equal(wizardCanAdvance(client,e,"baseline"),true);
});
test("D03.2: paperwork chooses first incomplete required document and honors health review",()=>{
 let e=start();
 assert.equal(firstOutstandingDocument(e).id,"screen");
 e=submitDocument(e,"screen","flag");
 assert.equal(firstOutstandingDocument(e).id,"screen");
 e=reviewHealth(e,"hold","Requires fictional follow-up");
 assert.equal(firstOutstandingDocument(e).id,"screen");
 assert.throws(()=>reviewHealth(e,"approve",""),/note/);
 e=reviewHealth(e,"approve","The fictional follow-up was reviewed by the coach.");
 assert.equal(firstOutstandingDocument(e).id,"exercise");
 for(const id of ["exercise","consultation","terms","privacy","nutrition"]){
  const t=DOCUMENTS.find(d=>d.id===id);
  e=submitDocument(e,id,t.kind==="signature"?"sign":t.kind==="acknowledgment"?"acknowledge":"complete","Fictional Name");
 }
 assert.equal(firstOutstandingDocument(e),null);
 assert.equal(wizardCanAdvance(client,e,"documents"),false);
 e=confirmAssignedDocumentPack(e);
 assert.equal(wizardCanAdvance(client,e,"documents"),true);
 assert.match(e.events.at(-1),/client signatures still required/);
 assert.equal(firstOutstandingStep(client,e),"contacts");
});
test("D03.2: no invitation can be sent while plans, auth and approved forms are absent",()=>{
 const e=start();
 let eligibility=inviteEligibility(client,e,true,true);
 assert.equal(eligibility.canSend,false);
 assert.equal(eligibility.allStepsComplete,false);
 assert.ok(eligibility.reasons.some(s=>/plans/i.test(s)));
 eligibility=inviteEligibility(client,e,false,false);
 assert.equal(eligibility.canSend,false);
 assert.ok(eligibility.reasons.length>=2);
 assert.equal(wizardCanAdvance(client,e,"training"),false);
 assert.equal(wizardCanAdvance(client,e,"nutrition"),false);
 assert.equal(wizardCanAdvance(client,e,"invite"),false);
});
test("D03.2: onboarding email preview uses email username and a password setup link, never a temporary password",()=>{
 const e=updateContacts(start(),contact);
 const invite=sampleInvite(client,e);
 assert.equal(invite.username,contact.email);
 assert.match(invite.body,/Your username: fictional@example\.invalid/);
 assert.match(invite.body,/set your own password/);
 assert.match(invite.body,/single|time-limited/);
 assert.doesNotMatch(invite.body,/temporary password:|initial password:|password\s*=|[A-Z0-9]{20}/i);
 assert.match(invite.body,/NO EMAIL HAS BEEN SENT/);
 assert.throws(()=>sampleInvite(defaultClients()[1],e),/unavailable/);
});
test("D03.2: guided UI shows in-place next action and safe disabled send button",()=>{
 const e=start();
 const first=renderSetupWizard(client,e,"contacts");
 assert.match(first,/STEP 2 OF 7/);
 assert.match(first,/Confirm emergency contact/);
 assert.match(first,/Enter or edit contact details/);
 assert.match(first,/data-action="wizard-go"/);
 assert.match(first,/data-action="wizard-close"/);
 assert.match(first,/Fictional/i);
 const docs=renderSetupWizard(client,e,"documents");
 assert.match(docs,/data-action="wizard-confirm-documents"/);
 assert.match(docs,/COACH CHECK/);
 assert.match(docs,/after.*accepting.*invitation/);
 const invite=renderSetupWizard(client,e,"invite");
 assert.match(invite,/Send secure invitation — unavailable/);
 assert.match(invite,/<button[^>]*disabled[^>]*>Send secure invitation/);
 assert.match(invite,/single-use link/);
 assert.match(invite,/NO EMAIL HAS BEEN SENT/);
});
test("D03.2: client name and preview email escape HTML safely",()=>{
 const e=updateContacts(start(),{...contact,email:"fictional@example.invalid"});
 const fake={...client,name:"Test <img src=x onerror=alert(1)>"};
 const html=renderSetupWizard(fake,e,"invite");
 assert.match(html,/&lt;img/);
 assert.doesNotMatch(html,/<img src=x/);
});
test("D03.2: integration starts wizard on new client creation, resumes from tasks and advances on review",async()=>{
 const [hub,html,ui,model,css]=await Promise.all([
  "../public/coach-hub.mjs","../public/coach-hub.html","../public/coach-setup-ui.mjs",
  "../public/coach-setup-model.mjs","../public/coach-setup.css"
 ].map(p=>readFile(new URL(p,import.meta.url),"utf8")));
 assert.match(hub,/state\.setupClientId=state\.selectedClient/);
 assert.match(hub,/state\.setupStep="contacts"/);
 assert.match(hub,/state\.view="setup"/);
 assert.match(hub,/function openWizard\(/);
 assert.match(hub,/autoAdvanceWizard\(id,"documents"\)/);
 assert.match(hub,/autoAdvanceWizard\(id,type==="baseline"\?"baseline":"contacts"\)/);
 assert.match(hub,/if\(action==="wizard-confirm-documents"\)/);
 assert.match(hub,/if\(action==="wizard-copy-email"\)/);
 assert.match(hub,/if\(action==="fresh-open"\)\{openWizard/);
 assert.match(html,/coach-setup\.css/);
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(ui+model,/\bfetch\s*\(|\bXMLHttpRequest\b|\.inviteUserByEmail\(|service_role|sb_secret_/);
 assert.match(css,/max-width:700px/);
 assert.match(css,/wizard-grid/);
});

test("D03.2: coach may prepare paperwork pack before any client signatures, but activation stays blocked",()=>{
 let e=confirmAssignedDocumentPack(start());
 assert.equal(setupChecks(client,e).documents,true);
 assert.equal(firstOutstandingDocument(e).id,"screen");
 assert.equal(wizardCanAdvance(client,e,"documents"),true);
 assert.equal(e.documents.exercise.status,"missing");
 assert.equal(e.documentPackConfirmed,true);
 assert.equal(inviteEligibility(client,e,true,true).canSend,false); // still needs contact, baseline, new plans
});
test("D03.2: invitation readiness requires completed coach setup, while client signatures follow login",()=>{
 let e=confirmAssignedDocumentPack(start());
 e=verifyContacts(verifyContacts(updateContacts(e,contact),"contact"),"emergency");
 e=verifyBaseline(updateBaseline(e,base));
 e={...e,trainingPlan:"approved",mealPlan:"approved"}; // synthetic gating fixture, not production builder
 assert.equal(firstOutstandingDocument(e).id,"screen"); // client has not yet signed
 assert.equal(inviteEligibility(client,e,false,false).allStepsComplete,true);
 assert.equal(inviteEligibility(client,e,false,false).canSend,false); // UI never sends
 assert.equal(inviteEligibility(client,e,true,true).canSend,true); // pure future server-side contract only
 assert.equal(e.documents.terms.status,"missing"); // activation still needs client agreement
});
