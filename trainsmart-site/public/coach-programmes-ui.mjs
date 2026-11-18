/* D06 fictional TrainSmart manual and Create with ChatGPT UI; no RIR field. */
import {programmeMetrics,currentClientAssignment,latestTemplateVersion,
 clientPlanWarnings,videoForExercise,instructionForExercise} from "./coach-programmes-model.mjs";
import {renderAIBriefWorkflow} from "./coach-ai-brief-ui.mjs";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const option=(v,txt,selected)=>'<option value="'+esc(v)+'" '+(v===selected?"selected":"")+'>'+esc(txt)+'</option>';
const btn=(action,title,attributes="",variant="outline")=>'<button type="button" class="btn btn-'+variant+' btn-sm" data-action="'+action+'" '+attributes+'>'+esc(title)+'</button>';
const numeric=(name,label,value,min,max,step=1)=>'<label><span>'+esc(label)+'</span><input type="number" name="'+name+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+esc(value??"")+'"></label>';
const youtubeLink=(url,label="Watch on YouTube")=>url?'<a class="btn btn-outline btn-sm" target="_blank" rel="noopener noreferrer" href="'+esc(url)+'">'+esc(label)+' ↗</a>':"";
function sessionCard(s,library){
 return '<section class="programme-session panel"><div class="programme-session-heading"><div><h3>'+esc(s.name)+'</h3></div>'+
 btn("programme-remove-session","Remove session",'data-sid="'+esc(s.id)+'"')+'</div>'+
 '<div class="programme-session-name"><label for="programme-name-'+esc(s.id)+'">Session name</label>'+
 '<input id="programme-name-'+esc(s.id)+'" data-session-name="'+esc(s.id)+'" maxlength="90" value="'+esc(s.name)+'"></div>'+
 '<div class="programme-exercise-list">'+s.exercises.map((row,i)=>{
 const ex=library.exercises.find(e=>e.id===row.exerciseId);
 const p=row.prescription;
 return '<article class="programme-exercise"><div class="programme-exercise-heading"><div><p class="eyebrow">EXERCISE '+(i+1)+'</p><h4>'+esc(ex?.name||"Missing exercise — needs review")+'</h4>'+
 '<p class="programme-exercise-id">'+esc(row.exerciseId)+'</p></div>'+
 btn("programme-remove-exercise","Remove",'data-sid="'+esc(s.id)+'" data-row-id="'+esc(row.id)+'"')+'</div>'+
 '<p class="programme-guide">'+esc(instructionForExercise(ex))+'</p>'+
 youtubeLink(videoForExercise(ex))+
 '<form class="programme-exercise-form" data-sid="'+esc(s.id)+'" data-row-id="'+esc(row.id)+'">'+
 numeric("feederSets","Feeder sets",p.feederSets,0,3)+numeric("workingSets","Working sets",p.workingSets,1,8)+
 numeric("repsMin","Minimum reps",p.repsMin,1,60)+numeric("repsMax","Maximum reps",p.repsMax,1,60)+
 numeric("restSeconds","Rest (sec)",p.restSeconds,20,300)+numeric("loadKg","Starting load kg (optional)",p.loadKg,0,400,0.5)+
 '<label><span>Tempo (optional)</span><input type="text" name="tempo" maxlength="20" placeholder="e.g. 2-0-2-0" value="'+esc(p.tempo)+'"></label>'+
 '<label class="programme-notes"><span>Coach notes</span><input type="text" maxlength="400" name="notes" value="'+esc(p.notes)+'" placeholder="Optional personal guidance"></label>'+
 '<button type="submit" class="btn btn-outline btn-sm">Apply exercise details</button></form>'+
 '</article>';
 }).join("")+'</div>'+
 '<div class="programme-add-exercise"><label for="programme-exercise-select-'+esc(s.id)+'">Add an exercise from your library</label>'+
 '<select id="programme-exercise-select-'+esc(s.id)+'" data-exercise-pick="'+esc(s.id)+'">'+
 option("","Choose an exercise…","")+library.exercises.filter(x=>x.active).map(ex=>option(ex.id,ex.name+(ex.reviewStatus==="pending"?" · needs review":""),"")).join("")+'</select>'+
 btn("programme-add-exercise","Add exercise",'data-sid="'+esc(s.id)+'"',"primary")+'</div></section>';
}
function builder(draft,library,templates,selectedTemplateId){
 const metrics=programmeMetrics(draft);
 const selected=templates.find(t=>t.id===selectedTemplateId);
 const picked=selected?.versions?.length||0;
 return '<section class="programme-builder"><div class="programme-editor-header"><div><p class="eyebrow">'+(draft.source==="ai-import"?"CHATGPT DRAFT":draft.source==="saved-template"?"SAVED PLAN COPY":"MANUAL DRAFT")+'</p>'+
 '<h3>Build your programme</h3></div>'+
 '<span class="tag muted">'+metrics.sessions+' session(s) · '+metrics.exercises+' exercises</span></div>'+
 '<div class="programme-plan-basics panel"><div class="programme-plan-fields"><label>Programme name<input id="programme-draft-name" maxlength="90" value="'+esc(draft.name)+'" placeholder="e.g. Strength Foundations — 3 days"></label>'+
 '<label>Main goal<input id="programme-draft-goal" maxlength="180" value="'+esc(draft.goal)+'" placeholder="e.g. Build strength and consistency"></label>'+
 '<label class="programme-notes">Coach notes<textarea id="programme-draft-notes" maxlength="600" rows="2">'+esc(draft.notes)+'</textarea></label></div>'+
 '<p class="programme-no-rir">Default metrics: sets, reps, load (optional), rest, tempo (optional) and notes. <strong>No RIR required.</strong></p>'+
 '<div class="programme-plan-actions">'+btn("programme-save-new","Save named plan to library","","primary")+
 (selected?btn("programme-save-version","Save new version of selected template",'data-template-id="'+esc(selected.id)+'"'):"")+
 '<span class="small-muted">'+(selected?"Selected template currently v"+picked:"New saved plans stay independent from client assignments")+'</span></div></div>'+
 '<div class="programme-session-container">'+draft.sessions.map(s=>sessionCard(s,library)).join("")+'</div>'+
 '<div class="programme-bottom-actions">'+btn("programme-add-session","+ Add ordered session","","primary")+'</div>'+
 '<div class="library-warning"><strong>Draft only.</strong> Save a template, then assign a copy. Demo assignments only.</div></section>';
}
function savedList(templates,clients,library,assignments){
 return '<section class="panel"><div class="panel-header"><div><h3>Saved programme library</h3><p class="small-muted">Reuse saved plans for other clients.</p></div><span class="tag muted">'+templates.length+' saved</span></div>'+
 (templates.length?'<div class="programme-template-list">'+templates.map(t=>{
  const current=latestTemplateVersion(t),met=programmeMetrics(current.plan);
  return '<article class="programme-template"><div class="programme-template-head"><div><h3>'+esc(t.name)+'</h3>'+
  '<p class="programme-template-sub">Version '+current.version+' · '+esc(current.plan.source.replace("-"," "))+' · '+met.sessions+' ordered sessions · '+met.exercises+' exercises</p></div>'+
  '<span class="tag muted">Saved template</span></div>'+
  '<div class="programme-template-actions">'+btn("programme-use-template","Reuse / edit in builder",'data-template-id="'+esc(t.id)+'"',"primary")+
  btn("programme-assign","Assign example copy to client",'data-template-id="'+esc(t.id)+'"')+
  btn("programme-preview-template","Preview template",'data-template-id="'+esc(t.id)+'"')+'</div>'+
  '<div class="programme-versions"><small>Versions saved: '+t.versions.map(v=>"v"+v.version).join(", ")+'</small></div></article>';
 }).join("")+'</div>':'<div class="empty"><h3>No saved programmes yet</h3><p>Start a manual plan or import AI JSON, then give it a name and select Save to library.</p></div>')+
 '<div class="programme-policy">Editing a template keeps earlier client copies unchanged.</div></section>'+
 '<section class="panel"><h3>Client programme assignments (demo)</h3><p class="small-muted">Sample copies only; not published to real clients.</p>'+
 (assignments.length?assignments.slice().reverse().map(a=>'<div class="programme-assignment-row"><div><strong>'+esc(a.clientName)+' — '+esc(a.name)+'</strong><small>Template v'+a.templateVersion+' · '+(a.current?"Current example":"Previous example")+'</small></div>'+
 btn("programme-client-preview","View client experience",'data-client-id="'+esc(a.clientId)+'"')+'</div>').join(""):
 '<div class="empty"><h3>No demo client assignments</h3><p>After you save and demo-review each exercise, select Assign from a template above.</p></div>')+'</section>';
}
export function renderProgrammesCentre({draft,templates,assignments,library,clients,tab="build",selectedClientId="",selectedTemplateId="",
 aiBrief=null,aiPrompt="",aiReply="",aiClientId=""}){
 const tabs=[["ai","Create with ChatGPT"],["build","Plan editor"],["saved","Plan library"],["preview","Client view"]];
 const client=clients.find(c=>c.id===selectedClientId&&c.status!=="Archived");
 const current=client?currentClientAssignment(assignments,client.id):null;
 let content=tab==="ai"?renderAIBriefWorkflow({brief:aiBrief,prompt:aiPrompt,reply:aiReply,clients,clientId:aiClientId}):
 tab==="saved"?savedList(templates,clients,library,assignments):
 tab==="preview"?'<section class="panel"><div class="panel-header"><div><h3>Client preview</h3><p class="small-muted">Sample view, not a secure client account.</p></div></div>'+
 '<label for="programme-client-preview-select">Fictional client</label><select id="programme-client-preview-select">'+option("","Choose a client",selectedClientId)+
 clients.filter(c=>c.status!=="Archived").map(c=>option(c.id,c.name,selectedClientId)).join("")+'</select>'+
 (current?'<div class="programme-client-preview"><div class="programme-client-title"><p class="eyebrow">TRAINING PLAN</p><h2>'+esc(current.name)+'</h2><p>'+esc(current.goal||"Your training plan")+'</p></div>'+
 current.sessions.map((s,i)=>'<section class="programme-client-session"><h3>Session '+(i+1)+': '+esc(s.name)+'</h3>'+
 s.exercises.map(ex=>'<div class="programme-client-exercise"><div><strong>'+esc(ex.name)+'</strong><p>'+ex.prescription.workingSets+' working sets · '+
 esc(ex.prescription.repsMin===ex.prescription.repsMax?ex.prescription.repsMin:ex.prescription.repsMin+"–"+ex.prescription.repsMax)+' reps'+
 (ex.prescription.loadKg===null?"":" · "+esc(ex.prescription.loadKg)+" kg")+' · '+ex.prescription.restSeconds+'s rest</p>'+
 '<p>'+esc(ex.instructions)+'</p>'+(ex.prescription.notes?'<p class="small-muted">Coach note: '+esc(ex.prescription.notes)+'</p>':"")+'</div>'+
 (ex.youtubeUrl?youtubeLink(ex.youtubeUrl,"Watch here — YouTube"):'<span class="small-muted">No coach-approved YouTube link yet</span>')+'</div>').join("")+'</section>').join("")+'</div>':
 '<div class="empty"><h3>No example plan assigned</h3><p>Save and review a plan, then assign it from the library.</p></div>')+'</section>':
 builder(draft,library,templates,selectedTemplateId);
 return '<div class="programme-header"><div><h2>Your programmes</h2></div>'+
 '<div class="programme-toolbar">'+btn("programme-new","New plan","","primary")+btn("programme-open-ai","Create with ChatGPT")+'</div></div>'+
 '<div class="programme-overview"><div class="stat"><p class="stat-label">Saved plans</p><div class="stat-number">'+templates.length+'</div></div>'+
 '<div class="stat"><p class="stat-label">Assigned copies</p><div class="stat-number">'+assignments.length+'</div></div></div>'+
 '<div class="programme-tabs">'+tabs.map(([id,title])=>'<button type="button" class="seg '+(tab===id?"active":"")+'" data-programme-tab="'+id+'">'+esc(title)+'</button>').join("")+'</div>'+
 '<div class="library-warning"><strong>Plan settings:</strong> AI imports need coach review before assignment.</div>'+
 content+
 '<p class="footer-bits">Sample workspace only. Plans are not published to real clients.</p>';
}
export function aiImportDialog(){
 return '<p class="programme-modal-copy">Paste a JSON object from ChatGPT with <code>name</code>, <code>goal</code> and an ordered <code>sessions</code> array. Each session has <code>name</code> and <code>exercises</code> with catalogue <code>exerciseId</code>, working sets and reps. RIR is NOT required.</p>'+
 '<label for="programme-ai-json">AI-generated programme JSON</label><textarea id="programme-ai-json" name="json" rows="11" maxlength="30000" required placeholder=\'{"name":"Strength Foundations","goal":"Strength","sessions":[{"name":"Session 1","exercises":[{"exerciseId":"demo:goblet-squat","workingSets":3,"repsMin":8,"repsMax":10,"restSeconds":90}]}]}\'></textarea>'+
 '<p class="small-muted">We validate every exercise ID against the current demo library. Import is a draft only. Do not paste real clients’ personal, medical or other sensitive details.</p>';
}
export function assignmentDialog(template,clients,library){
 const current=latestTemplateVersion(template),list=clients.filter(c=>c.status!=="Archived");
 return '<p class="programme-modal-copy">Assigning will create an independent snapshot of <strong>'+esc(template.name)+
 '</strong> (version '+current.version+'). Editing or updating the template later will not alter this client copy.</p>'+
 '<label for="programme-assign-client">Fictional client</label><select id="programme-assign-client" name="clientId" required>'+
 option("","Choose client","")+list.map(c=>option(c.id,c.name,"")).join("")+'</select>'+
 '<p class="small-muted">Exercises must be demo-reviewed and compatible with this client’s recorded equipment. This is a demo assignment, not a live publication.</p>';
}

export function renderClientProgrammeSummary(client,assignments){
 const current=currentClientAssignment(assignments,client.id);
 const prior=assignments.filter(a=>a.clientId===client.id&&!a.current);
 return '<div class="programme-client-profile"><div class="panel-header"><div><h3>Current training programme</h3><p class="small-muted"></p></div></div>'+
 (current?'<div class="programme-client-title"><p class="eyebrow">ASSIGNED PLAN</p><h3>'+esc(current.name)+'</h3>'+
 '<p>Saved template v'+esc(current.templateVersion)+' · '+current.sessions.length+' ordered sessions</p></div>'+
 current.sessions.map((session,i)=>'<div class="programme-client-session"><h4>Session '+(i+1)+': '+esc(session.name)+'</h4>'+
 session.exercises.map(ex=>'<div class="programme-client-exercise"><div><strong>'+esc(ex.name)+'</strong>'+
 '<p>'+esc(ex.prescription.workingSets)+' sets · '+esc(ex.prescription.repsMin===ex.prescription.repsMax?ex.prescription.repsMin:ex.prescription.repsMin+"–"+ex.prescription.repsMax)+' reps</p>'+
 '<p>'+esc(ex.instructions)+'</p></div>'+
 (ex.youtubeUrl?youtubeLink(ex.youtubeUrl,"Watch here — YouTube"):'<span class="small-muted">Coach video not supplied</span>')+'</div>').join("")+'</div>').join("")+
 (prior.length?'<p class="small-muted">'+prior.length+' previous example assignment(s) preserved as history.</p>':""):
 '<div class="empty"><h3>No programme assigned yet</h3><p>Save a plan, then assign it from the library.</p></div>')+
 '<div class="programme-bottom-actions"><button type="button" class="btn btn-primary" data-action="programme-open-for-client" data-client-id="'+esc(client.id)+'">Open programme builder</button></div>'+
 '<p class="small-muted">Sample assignment only.</p></div>';
}
