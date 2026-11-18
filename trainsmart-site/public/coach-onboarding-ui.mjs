import {freshReadiness} from "./coach-fresh-model.mjs";
import {ONBOARDING_STAGES,INTAKE_CHECKLIST,stageById,onboardProgress,onboardingSummary,intakeIsComplete} from "./coach-onboarding-model.mjs";

const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const badge=(value,style="muted")=>'<span class="tag '+style+'">'+esc(value)+'</span>';
export function renderOnboarding({clients,records,selectedId,events=[],enrolments={}}){
 const summary=onboardingSummary(clients,records);
 const visible=Object.values(records||{}).filter(r=>clients.some(c=>c.id===r.clientId&&c.status!=="Archived"));
 const pickable=clients.filter(c=>c.status!=="Archived"&&!records[c.id]);
 const current=records[selectedId]||visible[0]||null;
 const client=clients.find(c=>c.id===current?.clientId);
 const choices=pickable.length?
  '<label for="onboarding-add-client">New intake</label><div class="onboarding-start"><select id="onboarding-add-client" aria-label="Fictional client to onboard"><option value="">Choose client</option>'+pickable.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join("")+'</select><button type="button" class="btn btn-outline" data-action="onboarding-start-selected">Begin onboarding</button></div>':
  '<p class="small-muted">All active clients have an intake.</p>';
 const counts='<div class="onboarding-metrics">'+
  [['In progress',summary.pending],['Awaiting details',summary.awaiting],['Coach reviews',summary.review],['Ready to plan',summary.ready]].map(([label,n])=>'<div class="stat"><p class="stat-label">'+esc(label)+'</p><div class="stat-number">'+n+'</div></div>').join("")+
 '</div>';
 const queue='<section class="panel onboarding-queue"><div class="panel-header"><h3>Onboarding pipeline</h3>'+badge(summary.pending+" needing attention","good")+'</div><p class="small-muted">Select a client to continue.</p>'+
 (visible.length?'<div class="onboarding-client-list">'+visible.map(r=>{
   const c=clients.find(x=>x.id===r.clientId);
   return '<button type="button" class="onboarding-client '+(current?.clientId===r.clientId?"selected":"")+'" data-onboarding-client="'+esc(r.clientId)+'" aria-pressed="'+(current?.clientId===r.clientId)+'"><span class="directory-avatar">'+esc(c.initials)+'</span><span class="onboarding-client-info"><strong>'+esc(c.name)+'</strong><small>'+esc(stageById(r.stage).label)+'</small></span><span class="onboarding-percent">'+onboardProgress(r)+'%</span></button>';
  }).join("")+'</div>':'<div class="empty"><h3>No onboarding yet</h3><p>Choose client below to begin.</p></div>')+
 '<div class="divider-line"></div>'+choices+'</section>';
 let detail='<section class="panel onboarding-detail"><div class="empty"><h3>Select a client</h3><p>Start an intake to begin.</p></div></section>';
 if(current&&client){
  const stage=stageById(current.stage),index=ONBOARDING_STAGES.findIndex(x=>x.id===current.stage);
  const steps=ONBOARDING_STAGES.map((s,i)=>'<div class="onboarding-step '+(i<index?"done":i===index?"current":"")+'"><span class="step-number">'+(i<index?"✓":i+1)+'</span><span>'+esc(s.label)+'</span></div>').join("");
  const checklist=INTAKE_CHECKLIST.map((s,i)=>{
    const isChecked=current.checks.includes(s.id);
    const enabled=["review","ready"].includes(current.stage);
    return '<label class="onboarding-check"><input type="checkbox" data-onboarding-check="'+esc(s.id)+'" data-client-id="'+esc(client.id)+'" '+(isChecked?"checked ":"")+(enabled?"":"disabled ")+
    'aria-label="'+esc(s.label)+'"><span><strong>'+esc(s.label)+'</strong><small>'+esc(s.detail)+'</small></span></label>';
  }).join("");
  const complete=current.stage==="complete";
  const fresh=enrolments[current.clientId];
  const freshOk=fresh?freshReadiness(fresh).readyForProgramming:true;
  const canContinue=(current.stage==="awaiting"?intakeIsComplete(current):
   current.stage==="review"?intakeIsComplete(current)&&current.checks.length===INTAKE_CHECKLIST.length&&freshOk:
   current.stage==="ready"||current.stage==="prepared"?false:true);
  const info='<div class="onboarding-info-grid">'+
    [['Goal',current.intake.goal],['Available equipment',current.intake.equipment],['Training days',current.intake.days+" per week"],['Preferred schedule',current.intake.preferredSchedule||"Not entered"],['Example food preferences',current.intake.foodPreferences||"Not entered"]].map(([k,v])=>'<div class="detail-tile"><small>'+esc(k)+'</small><strong>'+esc(v||"Not entered")+'</strong></div>').join("")+'</div>';
  const title=complete?"Fictional onboarding completed":stage.hint;
  detail='<section class="panel onboarding-detail"><div class="panel-header"><div><p class="eyebrow">CLIENT INTAKE</p><h2>'+esc(client.name)+'</h2></div>'+badge(stage.label,complete?"good":"warn")+'</div>'+
  '<div class="onboarding-progress"><div class="onboarding-progress-track"><span style="width:'+onboardProgress(current)+'%"></span></div><span>'+onboardProgress(current)+'% complete</span></div>'+
  '<div class="onboarding-stages">'+steps+'</div><div class="onboarding-current"><p class="eyebrow">NEXT STEP</p><h3>'+esc(title)+'</h3>'+
  '<p>Invitations and account creation are disabled.</p><div class="button-row">'+
  (!complete?'<button class="btn btn-primary" type="button" data-action="onboarding-next" data-client-id="'+esc(client.id)+'" '+(!canContinue?"disabled ":"")+'>'+esc(stage.action)+' →</button>':'')+
  (!complete?'<button class="btn btn-ghost" type="button" data-action="onboarding-edit" data-client-id="'+esc(client.id)+'">Edit intake</button>':'')+
  '<button class="btn btn-outline" type="button" data-action="fresh-open" data-section="enrolment" data-client-id="'+esc(client.id)+'">Fresh enrolment checks</button>'+ 
  '<button class="btn btn-outline" type="button" data-action="onboarding-open-profile" data-client-id="'+esc(client.id)+'">Open client profile</button></div>'+
  (!canContinue?'<p class="onboarding-warning">Finish the required intake details or checklist before advancing.</p>':'')+
  '</div><div class="onboarding-section-heading"><h3>Intake details</h3><span class="small-muted">No sensitive information</span></div>'+info+
  '<div class="onboarding-section-heading"><h3>Coach review checklist</h3><span class="small-muted">'+current.checks.length+' / '+INTAKE_CHECKLIST.length+' completed</span></div>'+
  '<div class="onboarding-checklist">'+checklist+'</div>'+
  (current.stage==="complete"?'<p class="onboarding-complete">Checklist complete. No invitation sent.</p>':'')+
  '<div class="onboarding-section-heading"><h3>History</h3></div><div class="onboarding-events">'+(current.events?.length?current.events.slice().reverse().slice(0,8).map(e=>'<div class="client-event"><span class="activity-dot"></span><div><strong>'+esc(e.label)+'</strong><small>'+esc(e.at)+'</small></div></div>').join(""):'<p class="small-muted">No activity yet.</p>')+'</div></section>';
 }
 return counts+'<div class="onboarding-layout">'+queue+detail+'</div>'+
 '<p class="footer-bits">Fictional intake only. Live invitations and client access are disabled.</p>';
}
