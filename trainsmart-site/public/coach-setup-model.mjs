/*
 * D03.2 Guided setup: pure, fictional-only flow with explicit non-bypassable gates.
 * No credentials, temporary passwords, email delivery, network or production access.
 */
import {DOCUMENTS,docComplete,freshReadiness} from "./coach-fresh-model.mjs";
export const SETUP_STEPS=Object.freeze([
 {id:"profile",title:"Client profile",short:"Profile",help:"Confirm the client's goal, service and training availability"},
 {id:"contacts",title:"Contact & emergency details",short:"Contacts",help:"Record fictional contact details and confirm them"},
 {id:"baseline",title:"New starting measurements",short:"Measurements",help:"Record new measurements, never carry old values forward"},
 {id:"documents",title:"Forms & agreements",short:"Paperwork",help:"Complete required demonstration documents with coach screening review"},
 {id:"training",title:"Build new training programme",short:"Training plan",help:"A fresh, coach-approved programme must be assigned"},
 {id:"nutrition",title:"Build new meal plan",short:"Meal plan",help:"A fresh, coach-approved meal plan is needed when included in the service"},
 {id:"invite",title:"Optional client app invitation",short:"Invite",help:"Clients can be coached without using the app. Only send a setup link if they want portal access."}
]);
export const SETUP_DELIVERY="disabled_until_f00_and_real_auth";
export function setupChecks(client,enrolment){
 if(!client||!enrolment||client.id!==enrolment.clientId)throw Error("Fictional client/enrolment mismatch.");
 const r=freshReadiness(enrolment);
 const profile=client.name?.trim().length>=2&&client.goal?.trim().length>=3&&client.experience&&
 Number.isInteger(client.trainingDays)&&client.trainingDays>=1&&client.trainingDays<=7&&
 Number.isInteger(client.sessionMinutes)&&client.sessionMinutes>=15&&client.sessionMinutes<=180;
 return {profile:!!profile,contacts:r.contacts,baseline:r.baseline,documents:enrolment.documentPackConfirmed===true,
  training:enrolment.trainingPlan==="approved",
  nutrition:enrolment.mealPlan==="approved"||enrolment.mealPlan==="not_applicable",
  invite:false};
}
export function firstOutstandingStep(client,e){
 const checks=setupChecks(client,e);
 return SETUP_STEPS.find(s=>s.id!=="invite"&&!checks[s.id])?.id||"invite";
}
export function firstOutstandingDocument(e){
 if(!e||!e.documents)return null;
 return DOCUMENTS.find(t=>t.required&&e.documents[t.id]&&!docComplete(e.documents[t.id]))||null;
}
export function nextWizardStep(step){
 const n=SETUP_STEPS.findIndex(s=>s.id===step);
 if(n<0)throw Error("Unknown wizard step.");
 return SETUP_STEPS[Math.min(n+1,SETUP_STEPS.length-1)].id;
}
export function wizardCanAdvance(client,e,step){
 const checks=setupChecks(client,e);
 if(step==="invite")return false;
 return !!checks[step];
}
export function inviteEligibility(client,e,authReady=false,formsApproved=false){
 const checks=setupChecks(client,e);
 const complete=SETUP_STEPS.filter(s=>s.id!=="invite").every(s=>checks[s.id]);
 const email=String(e?.contacts?.email||"").trim();
 return {allStepsComplete:complete,email,canSend:!!(complete&&authReady&&formsApproved&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
  reasons:[
   ...(!complete?["Coach profile, contact details, new measurements, assigned paperwork pack and fresh plans must be approved."]:[]),
   ...(!authReady?["Secure authentication/email delivery is not enabled on this preview."]:[]),
   ...(!formsApproved?["Real document text and signing rules have not been approved."]:[])
  ]};
}
export function sampleInvite(client,e){
 if(!client||!e||e.clientId!==client.id)throw Error("The client is unavailable.");
 const username=String(e.contacts.email||"").trim()||"[client email address]";
 const given=String(client.name||"there").trim().split(/\s+/)[0];
 return {username,subject:"Welcome to TrainSmart Coaching — set up your account",
  body:"Hi "+given+",\n\nWelcome to TrainSmart Coaching!\n\n"+
   "Your username: "+username+"\n\n"+
   "When your coach sends your invitation, you will receive a private, time-limited link to set your own password. "+
   "Please open that link and create your password before you log in for the first time.\n\n"+
   "After your first login, please complete and sign your assigned onboarding documents in the app. Your coach will review these before you begin. Your new training and meal plans will be available after they are published.\n\n"+
   "TrainSmart Coaching\n\nDEMONSTRATION PREVIEW — NO EMAIL HAS BEEN SENT.",
  mechanism:"Single-use setup link, not an emailed temporary password"};
}
