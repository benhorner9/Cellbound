/* D03.1 fictional-only coach enrolment presentation; no outbound requests. */
import {DOCUMENTS,SERVICES,docComplete,freshReadiness,nextFreshStep,enrollmentSummary,DEMO_VERSION} from "./coach-fresh-model.mjs";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const chip=(label,good=false)=>'<span class="tag '+(good?"good":"warn")+'">'+esc(label)+'</span>';
const icon=(yes)=>yes?'<span class="fresh-tick">✓</span>':'<span class="fresh-empty">○</span>';
export function renderFreshSummary(e,client){
 if(!e)return '<div class="fresh-banner"><strong>Start a clean enrolment</strong><p>No old programme, meal plan or measurements will be imported.</p><button class="btn btn-primary btn-sm" data-action="fresh-start" data-client-id="'+esc(client.id)+'">Start fresh enrolment</button></div>';
 const ready=freshReadiness(e),next=nextFreshStep(e);
 return '<div class="fresh-banner"><div class="fresh-banner-top"><div><p class="eyebrow">FRESH TRAINSMART ENROLMENT</p><h3>'+esc(ready.readyForProgramming?"Ready to build new plans":"New baseline required")+'</h3></div>'+chip(ready.readyForProgramming?"Paperwork and baseline reviewed":"Action outstanding",ready.readyForProgramming)+'</div>'+
 '<p>Previous programmes, food plans, signatures and measurements have not been copied. New training and meal plans are still '+esc(e.trainingPlan==="approved"&&e.mealPlan==="approved"?"approved":"to be created and approved")+'.</p>'+
 '<div class="fresh-banner-actions"><button class="btn btn-primary btn-sm" data-action="fresh-open" data-client-id="'+esc(client.id)+'" data-section="'+esc(next.type==="pending_builder"?"enrolment":next.type)+'">View next step</button><button class="btn btn-outline btn-sm" data-action="fresh-open" data-client-id="'+esc(client.id)+'" data-section="documents">View documents</button></div></div>';
}
function statusFor(d){
 const vals={missing:["Missing",false],review:["Coach review",false],hold:["Follow-up required",false],approved:["Coach reviewed",true],signed:["Demo signed",true],submitted:["Submitted",true],acknowledged:["Acknowledged",true],consented:["Optional: yes",true],declined:["Optional: no",true]};
 const [label,good]=vals[d.status]||["Outstanding",false];
 return chip(label,good);
}
export function renderFreshSection(client,e,section){
 if(!e)return renderFreshSummary(null,client);
 const r=freshReadiness(e),next=nextFreshStep(e),docItems=Object.values(e.documents);
 if(section==="contact"){
  const c=e.contacts;
  return '<div class="fresh-section-title"><h3>Contact & emergency details</h3><button class="btn btn-primary btn-sm" data-action="fresh-edit-contact" data-client-id="'+esc(client.id)+'">Edit fictional details</button></div>'+
   '<p class="fresh-muted">Restricted coach-profile design. Never enter real telephone numbers, email addresses or emergency contacts in this demo.</p>'+
   '<div class="fresh-two">'+
    '<section class="detail-tile"><small>Client contact</small><h3>'+esc(c.email||"Email missing")+'</h3><p>'+esc(c.phone||"Phone missing")+'</p>'+chip(c.contactVerified?"Demo verified":"Verification required",c.contactVerified)+
     (!c.contactVerified?'<button class="btn btn-ghost btn-sm" data-action="fresh-verify-contact" data-client-id="'+esc(client.id)+'">Confirm demo contact</button>':'')+'</section>'+
    '<section class="detail-tile"><small>Emergency contact — safety only</small><h3>'+esc(c.emergencyName||"Not supplied")+'</h3><p>'+esc(c.emergencyRelation||"Relationship missing")+' · '+esc(c.emergencyPhone||"Telephone missing")+'</p>'+chip(c.emergencyVerified?"Demo verified":"Verification required",c.emergencyVerified)+
     (!c.emergencyVerified?'<button class="btn btn-ghost btn-sm" data-action="fresh-verify-emergency" data-client-id="'+esc(client.id)+'">Confirm demo emergency contact</button>':'')+'</section>'+
   '</div><p class="footer-bits">Emergency contacts are never used for marketing or invitations. Real-world access controls are not implemented in this preview.</p>';
 }
 if(section==="baseline"){
  const b=e.baseline;
  return '<div class="fresh-section-title"><h3>New starting measurements</h3><button class="btn btn-primary btn-sm" data-action="fresh-edit-baseline" data-client-id="'+esc(client.id)+'">Record new baseline</button></div>'+
  '<p class="fresh-muted">Nothing transfers from the former system. Enter made-up measurements only. Nutrition calculations and plan publication are not connected.</p>'+
  '<div class="fresh-three"><div class="detail-tile"><small>Height</small><strong>'+esc(b.heightCm?b.heightCm+" cm":"Not recorded")+'</strong></div><div class="detail-tile"><small>Weight</small><strong>'+esc(b.weightKg?b.weightKg+" kg":"Not recorded")+'</strong></div>'+
  '<div class="detail-tile"><small>Measured</small><strong>'+esc(b.measuredAt||"Not recorded")+'</strong></div></div>'+
  '<div class="fresh-actions">'+chip(b.coachVerified?"Coach-reviewed demo baseline":"Baseline not confirmed",b.coachVerified)+
   (!b.coachVerified?'<button class="btn btn-ghost btn-sm" data-action="fresh-verify-baseline" data-client-id="'+esc(client.id)+'">Confirm fictional baseline</button>':'')+'</div>';
 }
 if(section==="documents"){
  const count=docItems.filter(d=>DOCUMENTS.find(x=>x.id===d.id)?.required&&docComplete(d)).length;
  const required=docItems.filter(d=>DOCUMENTS.find(x=>x.id===d.id)?.required).length;
  return '<div class="fresh-section-title"><div><h3>Documents & Forms</h3><p class="small-muted">'+count+' of '+required+' required fictional items completed</p></div>'+chip(r.paperwork?"All demo reviews complete":"Paperwork outstanding",r.paperwork)+'</div>'+
   '<p class="fresh-muted">These are placeholders, NOT your approved TrainSmart documents. Demo acknowledgments and signatures are NOT legally executed.</p>'+
   '<div class="fresh-documents">'+docItems.map(d=>{
    const t=DOCUMENTS.find(x=>x.id===d.id);
    return '<article class="fresh-document"><div class="fresh-doc-icon">▤</div><div class="fresh-document-body"><h3>'+esc(t.name)+'</h3><p>'+esc(t.summary)+'</p><div class="fresh-doc-meta">'+statusFor(d)+' <span class="small-muted">'+(t.required?"Required":"Optional")+' · '+esc(d.version)+'</span></div></div>'+
    '<button class="btn btn-outline btn-sm" data-action="fresh-document" data-client-id="'+esc(client.id)+'" data-doc-id="'+esc(d.id)+'">'+(docComplete(d)?"Review":"Open")+'</button></article>';
   }).join("")+'</div><p class="footer-bits">Legacy signed files remain in the historical archive and are not imported here.</p>';
 }
 const checklist=[
  ["Personal contact",r.contacts&&e.contacts.contactVerified,"contact"],
  ["Emergency contact",r.contacts&&e.contacts.emergencyVerified,"contact"],
  ["New baseline",r.baseline,"baseline"],
  ["Required documents and health review",r.paperwork,"documents"],
  ["Fresh training programme (not yet built)",e.trainingPlan==="approved","enrolment"],
  ["Fresh meal plan (not yet built)",e.mealPlan==="approved"||e.mealPlan==="not_applicable","enrolment"]
 ];
 return renderFreshSummary(e,client)+
 '<div class="fresh-section-title"><h3>New enrolment checklist</h3>'+chip(r.readyForActivation?"Ready for activation":"Not ready for activation",r.readyForActivation)+'</div>'+
 '<div class="fresh-checklist">'+checklist.map(([label,done,where])=>
 '<button type="button" class="fresh-check-row" data-action="fresh-open" data-client-id="'+esc(client.id)+'" data-section="'+where+'">'+icon(done)+'<span>'+esc(label)+'</span><strong>'+esc(done?"Reviewed":"Outstanding")+'</strong><span aria-hidden="true">›</span></button>').join("")+'</div>'+
 '<div class="fresh-banner"><p class="eyebrow">NEXT COACH ACTION</p><h3>'+esc(next.label)+'</h3>'+
 '<p>'+esc(r.readyForProgramming?"Fresh paperwork and measurements are reviewed. New programmes/meals still require actual builder implementation and coach approval.":"Complete the details above before preparing the first programme.")+'</p></div>';
}
export function renderFreshDashboard(clients,records){
 const summary=enrollmentSummary(clients,records);
 return '<div class="fresh-metrics">'+[
 ["Fresh enrolments",summary.total],["Need contact checks",summary.contacts],["Paperwork outstanding",summary.paperwork],["Ready for programming",summary.ready]
 ].map(([title,n])=>'<div class="stat"><p class="stat-label">'+esc(title)+'</p><div class="stat-number">'+n+'</div></div>').join("")+'</div>'+
 '<section class="panel"><div class="panel-header"><div><h3>Clean-start client queue</h3><p class="small-muted">Every current client starts a new TrainSmart enrolment. No previous plans or measurements are copied.</p></div>'+chip("DEMO ONLY")+'</div>'+
 '<div class="fresh-queue">'+clients.filter(c=>c.status!=="Archived").map(c=>{
  const e=records[c.id],ready=e&&freshReadiness(e),next=e?nextFreshStep(e):null;
  return '<article class="fresh-queue-row"><div class="directory-avatar">'+esc(c.initials)+'</div><div class="fresh-queue-info"><strong>'+esc(c.name)+'</strong><p>'+esc(next?.label||"Start clean enrolment")+'</p></div>'+
  (e?chip(ready.readyForProgramming?"Intake approved":"New baseline",ready.readyForProgramming):chip("Not started"))+
  '<button type="button" class="btn btn-primary btn-sm" data-action="fresh-open" data-client-id="'+esc(c.id)+'" data-section="enrolment">Open</button></article>';
 }).join("")+'</div></section>';
}
export function documentDialogContent(e,id){
 const t=DOCUMENTS.find(x=>x.id===id&&e.documents[id]);if(!t)return null;
 const d=e.documents[id];
 const pre='<p class="dialog-copy"><strong>FICTIONAL DEMONSTRATION ONLY</strong>. '+esc(t.summary)+' Do not submit genuine health details or signatures here.</p>'+
 '<div class="fresh-doc-meta">'+statusFor(d)+'<span class="tag muted">'+esc(DEMO_VERSION)+'</span></div>';
 let fields="";
 if(t.kind==="health"){
  fields='<label for="fresh-document-action">Demo screening scenario</label><select name="action" id="fresh-document-action"><option value="no_flag">Example: no disclosed flags</option><option value="flag">Example: disclosure needs coach review</option></select>';
 }else if(t.kind==="signature"){
  fields='<label for="fresh-document-signer">Fictional signer name (DEMO ONLY)</label><input name="signer" id="fresh-document-signer" maxlength="80" placeholder="e.g. Demo Example" autocomplete="off" required><input type="hidden" name="action" value="sign">';
 }else if(t.kind==="optional"){
  fields='<label for="fresh-document-action">Optional sample permission</label><select name="action" id="fresh-document-action"><option value="no">No — declined</option><option value="yes">Yes — demonstration only</option></select>';
 }else{
  fields='<label class="fresh-doc-ack"><input type="checkbox" id="fresh-document-confirm" required> I have reviewed this fictional placeholder; no real agreement is being signed.</label><input type="hidden" name="action" value="'+(t.kind==="acknowledgment"?"acknowledge":"complete")+'">';
 }
 if(t.kind==="health"&&["review","hold"].includes(d.status)){
  fields+='<div class="divider-line"></div><label for="fresh-document-review">Coach review outcome — fictional only</label><select id="fresh-document-review" name="review"><option value="">No review action</option><option value="hold">Keep on hold — refer for further assessment</option><option value="approve">Coach reviewed fictional scenario</option></select><label for="fresh-document-note">Coach review note (required when resolving a flagged example)</label><textarea id="fresh-document-note" name="reviewNote" rows="2" maxlength="260"></textarea>';
 }
 return {title:t.name,body:pre+fields};
}
