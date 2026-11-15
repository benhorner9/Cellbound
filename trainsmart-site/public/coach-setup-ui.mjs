/* D03.2 guided fictional setup screen. No email is transmitted. */
import {DOCUMENTS,docComplete,freshReadiness} from "./coach-fresh-model.mjs";
import {SETUP_STEPS,setupChecks,firstOutstandingDocument,wizardCanAdvance,inviteEligibility,sampleInvite} from "./coach-setup-model.mjs";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function btn(action,id,label,style="primary",disabled=false,other=""){
 return '<button type="button" class="btn btn-'+style+'" data-action="'+action+'" data-client-id="'+esc(id)+'" '+other+(disabled?" disabled":"")+'>'+esc(label)+'</button>';
}
function checkLine(label,complete){
 return '<div class="wizard-checkline"><span class="'+(complete?"wizard-ok":"wizard-pending")+'">'+(complete?"✓":"○")+'</span><span>'+esc(label)+'</span><strong>'+(complete?"Confirmed":"Required")+'</strong></div>';
}
export function renderSetupWizard(client,e,currentStep="contacts"){
 if(!client||!e)return '<div class="empty"><h3>Select a fictional client</h3><p>Create or open a client to begin their guided enrolment.</p></div>';
 const checks=setupChecks(client,e);
 const current=SETUP_STEPS.some(s=>s.id===currentStep)?currentStep:"contacts";
 const title=SETUP_STEPS.find(s=>s.id===current);
 const currentIndex=SETUP_STEPS.findIndex(s=>s.id===current);
 const steps='<div class="wizard-steps" aria-label="Enrolment steps">'+SETUP_STEPS.map((s,i)=>
  '<button type="button" class="wizard-step '+(s.id===current?"selected":checks[s.id]?"done":"")+'" data-action="wizard-go" data-step="'+esc(s.id)+'" data-client-id="'+esc(client.id)+'" aria-current="'+(current===s.id?"step":"false")+'"><span class="wizard-step-dot">'+(checks[s.id]?"✓":i+1)+'</span><span class="wizard-step-copy"><strong>'+esc(s.short)+'</strong><small>'+(checks[s.id]?"Confirmed":s.id==="invite"?"Not sent":"To complete")+'</small></span></button>'
 ).join("")+'</div>';
 const contacts=e.contacts,baseline=e.baseline;
 let body="";
 if(current==="profile"){
  body='<div class="wizard-summary-grid">'+[
   ["Name",client.name],["Coaching goal",client.goal],["Experience",client.experience],
   ["Training days",client.trainingDays+" per week"],["Session length",client.sessionMinutes+" min"],["Equipment",client.equipment||"Not listed"]
  ].map(([k,v])=>'<div class="detail-tile"><small>'+esc(k)+'</small><strong>'+esc(v)+'</strong></div>').join("")+'</div>'+
  '<div class="wizard-actions">'+btn("edit-client",client.id,"Edit profile","ghost")+
  btn("wizard-next",client.id,"Continue to contacts", "primary", !checks.profile)+'</div>';
 }else if(current==="contacts"){
  body='<p class="wizard-explainer">Record an email address for login, a telephone number, and an emergency contact. Confirm both groups before continuing.</p>'+
  checkLine("Client email and telephone",contacts.contactVerified)+checkLine("Emergency contact and telephone",contacts.emergencyVerified)+
  '<div class="wizard-readout"><p><strong>Username (email):</strong> '+esc(contacts.email||"Not entered yet")+'</p>'+
  '<p><strong>Phone:</strong> '+esc(contacts.phone||"Not entered yet")+'</p>'+
  '<p><strong>Emergency contact:</strong> '+esc(contacts.emergencyName||"Not entered")+
  (contacts.emergencyName?" · "+esc(contacts.emergencyRelation):"")+'</p></div>'+
  '<div class="wizard-actions">'+btn("fresh-edit-contact",client.id,"Enter or edit contact details")+
  (!contacts.contactVerified?btn("fresh-verify-contact",client.id,"Confirm personal contact","ghost"): "")+
  (!contacts.emergencyVerified?btn("fresh-verify-emergency",client.id,"Confirm emergency contact","ghost"): "")+'</div>';
 }else if(current==="baseline"){
  body='<p class="wizard-explainer">Create entirely new starting metrics for this enrolment. No previous measurements are copied.</p>'+
  checkLine("New height, weight and measurement date",!!baseline.measuredAt)+
  checkLine("Coach has confirmed new baseline",baseline.coachVerified)+
  '<div class="wizard-summary-grid">'+[
    ["Height",baseline.heightCm?baseline.heightCm+" cm":"Missing"],
    ["Weight",baseline.weightKg?baseline.weightKg+" kg":"Missing"],
    ["Measured",baseline.measuredAt||"Missing"]
   ].map(([k,v])=>'<div class="detail-tile"><small>'+esc(k)+'</small><strong>'+esc(v)+'</strong></div>').join("")+'</div>'+
   '<div class="wizard-actions">'+btn("fresh-edit-baseline",client.id,"Record new measurements")+
   (!baseline.coachVerified?btn("fresh-verify-baseline",client.id,"Confirm fictional baseline","ghost"):"")+'</div>';
 }else if(current==="documents"){
  const assigned=Object.values(e.documents);
  const required=assigned.filter(d=>DOCUMENTS.find(x=>x.id===d.id)?.required);
  const all=assigned.map(d=>{
   const template=DOCUMENTS.find(x=>x.id===d.id);
   return '<div class="wizard-doc-row"><span class="'+(docComplete(d)?"wizard-ok":"wizard-pending")+'">'+(docComplete(d)?"✓":"○")+'</span>'+
   '<span><strong>'+esc(template.name)+'</strong><small>'+esc(template.required?"Required client form":"Optional client consent")+' · '+esc(template.summary)+'</small></span>'+
   btn("fresh-document",client.id,"Demo preview","ghost",false,'data-doc-id="'+esc(d.id)+'"')+'</div>';
  }).join("");
  body='<p class="wizard-explainer">Your job now is to confirm which forms the client will receive. The client completes and signs their own paperwork <strong>after</strong> accepting the account invitation. Coach review and final activation come afterwards.</p>'+
   '<div class="wizard-progress"><span>'+required.length+' required forms assigned · '+assigned.length+' total</span><progress max="1" value="'+(e.documentPackConfirmed?1:0)+'"></progress></div>'+
   '<div class="wizard-highlight"><p class="eyebrow">COACH CHECK · PAPERWORK PACK</p><h3>'+esc(e.documentPackConfirmed?"Paperwork pack assigned":"Check the assigned documents")+'</h3>'+
   '<p>'+esc(e.documentPackConfirmed?"The sample pack is prepared. No client has signed these documents.":"Review the required and optional forms below. Confirm this fictional pack when ready; a real system will use your approved templates.")+'</p>'+
   (e.documentPackConfirmed?btn("wizard-next",client.id,"Continue to new training programme"):
   btn("wizard-confirm-documents",client.id,"Confirm sample pack & continue"))+'</div>'+
   '<div class="wizard-doc-list">'+all+'</div>';
 }else if(current==="training"||current==="nutrition"){
  const training=current==="training",applicable=e.mealPlan!=="not_applicable";
  body='<div class="wizard-unavailable"><span class="wizard-lock">▧</span><h3>'+esc(training?"Fresh training programme required":applicable?"Fresh meal plan required":"Nutrition plan not included in this service")+'</h3>'+
   '<p>'+esc(training?"The programme builder and coach approval are scheduled for a later block. The wizard will resume here when those features are ready. Old programmes will not be transferred.":applicable?
    "The new meal-plan builder is not yet connected. Previous meals and calorie or macro targets will not transfer.":"This service does not currently include a mandatory meal plan.")+'</p>'+
   '<div class="wizard-actions">'+btn("wizard-preview-invite",client.id,"Preview final invitation","ghost")+
   btn("wizard-next",client.id,"Continue", "primary",!wizardCanAdvance(client,e,current))+'</div></div>';
 }else{
  const invite=inviteEligibility(client,e,false,false);
  const example=sampleInvite(client,e);
  body='<div class="wizard-invite"><p class="eyebrow">FINAL STEP · EMAIL NOT ENABLED</p><h3>Optional welcome email and account setup</h3>'+
  '<p>Clients do not need an app account to train with you. If they want their own portal, they can receive a secure, single-use link to choose a password. We do <strong>not</strong> email temporary passwords in plain text.</p>'+
  '<div class="wizard-email-preview"><p><strong>To:</strong> '+esc(example.username)+'</p><p><strong>Subject:</strong> '+esc(example.subject)+'</p><pre>'+esc(example.body)+'</pre></div>'+
  '<p class="wizard-small-note">No email, invitation link, password or authentication user has been created in this fictional preview. The client will complete and sign actual forms only after accepting their invitation.</p>'+
  '<div class="wizard-actions">'+btn("wizard-copy-email",client.id,"Copy sample email","ghost")+
  '<button class="btn btn-primary" type="button" disabled title="Requires secure backend, approved forms and new plans">Send secure invitation — unavailable</button></div>'+
  '<ul class="wizard-blockers">'+invite.reasons.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div>';
 }
 const actions='<div class="wizard-footer">'+
 (currentIndex>0?btn("wizard-previous",client.id,"← Previous step","ghost"):'<span></span>')+
 (checks[current]&&current!=="invite"&&current!=="profile"&&current!=="documents"?btn("wizard-next",client.id,"Next step →"):"")+
 '</div>';
 const count=SETUP_STEPS.filter(s=>s.id!=="invite"&&checks[s.id]).length;
 return '<div class="wizard-topline"><div><p class="eyebrow">TRAINSMART GUIDED ENROLMENT · FICTIONAL</p><h2>'+esc(client.name)+'</h2><p>'+esc(e.service==="pt"?"Personal training":e.service==="online"?"Online coaching":"Small-group training")+' · New enrolment from scratch</p></div>'+
 btn("wizard-close",client.id,"Exit setup","ghost")+'</div>'+
 '<div class="wizard-overall"><span>'+count+' of 6 preparation stages confirmed</span><progress value="'+count+'" max="6"></progress></div>'+
 '<div class="wizard-grid"><aside class="wizard-rail">'+steps+'</aside><section class="panel wizard-panel"><p class="eyebrow">STEP '+(currentIndex+1)+' OF '+SETUP_STEPS.length+'</p>'+
 '<h2>'+esc(title.title)+'</h2><p class="wizard-subtitle">'+esc(title.help)+'</p>'+body+actions+'</section></div>'+
 '<p class="footer-bits">Fictional iPad preview only. No client information should be entered, no real invitation can be sent, and full activation remains blocked pending F00 and approved documents.</p>';
}
