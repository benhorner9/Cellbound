/* D06.1 two-box ChatGPT handoff. Public fictional preview: never transmit client data. */
import {EQUIPMENT,validEquipmentIds} from "./coach-library-model.mjs";
import {AI_AGE_BANDS,AI_EXPERIENCE} from "./coach-ai-brief-model.mjs";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const option=(id,label,selected)=>'<option value="'+esc(id)+'"'+(selected===id?' selected':'')+'>'+esc(label)+'</option>';
const labelInput=(key,label,value,max=120,type="text")=>'<label>'+esc(label)+'<input data-ai-field="'+key+'" type="'+type+'" maxlength="'+max+'" value="'+esc(value)+'"></label>';
export function renderAIBriefWorkflow({brief,prompt,reply,clients,clientId=""}){
 const fakeClients=clients.filter(c=>c.status!=="Archived");
 return '<section class="ai-two-box-workflow"><div class="programme-editor-header"><div><p class="eyebrow">TRAINING PLAN ASSISTANT</p><h3>Create a plan with ChatGPT</h3>'+
 '<p>Set the brief, copy it into ChatGPT, then import the response into the plan editor.</p></div>'+
 '<span class="tag muted">Copy and paste workflow</span></div>'+
 '<div class="ai-privacy-banner"><strong>Public fictional demonstration.</strong> Choose a fictional client or enter fictional coaching details only. The copied brief deliberately excludes the client’s name, email, phone number and emergency contact. Do not paste actual identifiable or sensitive health information into this public preview or external ChatGPT chats.</div>'+
 '<section class="panel ai-workflow-step" aria-labelledby="ai-step-one"><div class="ai-step-title"><span class="ai-step-number">1</span><div><h3 id="ai-step-one">Training requirements</h3><p>Use a sample client or enter the requirements below.</p></div></div>'+
 '<label for="ai-client-select">Prefill from fictional client (optional)</label><select id="ai-client-select">'+
 option("","Manual fictional brief",clientId)+fakeClients.map(c=>option(c.id,c.name,clientId)).join("")+'</select>'+
 '<div class="ai-input-grid">'+
 labelInput("name","Name this programme",brief.name,90)+
 '<label>Experience<select data-ai-field="experience">'+AI_EXPERIENCE.map(e=>option(e,e[0].toUpperCase()+e.slice(1),brief.experience)).join("")+'</select></label>'+
 '<label class="ai-wide">Primary training goal<textarea data-ai-field="goal" maxlength="180" rows="2">'+esc(brief.goal)+'</textarea></label>'+
 '<label>Age band (optional)<select data-ai-field="ageBand">'+AI_AGE_BANDS.map(e=>option(e,e==="unspecified"?"Not specified":e,brief.ageBand)).join("")+'</select></label>'+
 labelInput("sessionsPerWeek","Sessions per programme cycle",brief.sessionsPerWeek,2,"number")+
 labelInput("sessionMinutes","Approx. minutes per session",brief.sessionMinutes,3,"number")+
 '<label class="ai-wide">Training preferences (no personal data)<textarea data-ai-field="preferences" maxlength="300" rows="2" placeholder="E.g. full-body sessions, prefer dumbbells">'+esc(brief.preferences)+'</textarea></label>'+
 '<label class="ai-wide">Additional non-sensitive coach instructions<textarea data-ai-field="coachingNotes" maxlength="300" rows="2" placeholder="E.g. alternate movement patterns, avoid repeating exercises">'+esc(brief.coachingNotes)+'</textarea></label></div>'+
 '<fieldset class="ai-gear"><legend>Available equipment</legend><div class="ai-equipment-grid">'+
 EQUIPMENT.map(eq=>'<label><input type="checkbox" data-ai-equipment="'+esc(eq.id)+'"'+(brief.equipment.includes(eq.id)?" checked":"")+'><span>'+esc(eq.name)+'</span></label>').join("")+'</div></fieldset>'+
 '<div class="ai-actions"><button type="button" class="btn btn-primary" data-action="ai-generate-brief">Prepare brief</button>'+
 '<button type="button" class="btn btn-outline" data-action="ai-load-sample">Fill fictional sample</button></div>'+
 '<p class="small-muted">The brief includes approved catalogue IDs available in this demonstration. The real TrainSmart exercise library and progression rules still require verification.</p></section>'+
 '<section class="panel ai-workflow-step" aria-labelledby="ai-step-two"><div class="ai-step-title"><span class="ai-step-number">2</span><div><h3 id="ai-step-two">Copy your brief</h3><p>Copy the entire generated request and paste it into a ChatGPT conversation.</p></div></div>'+
 '<label for="ai-request-box">Brief for ChatGPT</label>'+
 '<textarea id="ai-request-box" rows="11" readonly placeholder="Complete step 1 and select Prepare brief.">'+esc(prompt||"")+'</textarea>'+
 '<div class="ai-actions"><button type="button" class="btn btn-primary" data-action="ai-copy-brief"'+(!prompt?' disabled':'')+'>Copy brief</button>'+
 '<a class="btn btn-outline" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Open ChatGPT ↗</a></div>'+
 '<p class="small-muted">Only coach-selected fictional inputs and allowed exercise names/IDs appear in this text. No data is automatically sent to ChatGPT.</p></section>'+
 '<section class="panel ai-workflow-step" aria-labelledby="ai-step-three"><div class="ai-step-title"><span class="ai-step-number">3</span><div><h3 id="ai-step-three">Import the plan</h3><p>Paste the JSON returned by ChatGPT, then apply it to your editable programme builder.</p></div></div>'+
 '<label for="ai-response-box">ChatGPT response</label>'+
 '<textarea id="ai-response-box" rows="11" maxlength="30000" placeholder=\'{"name":"Strength Foundations","goal":"Strength","sessions":[{"name":"Session 1","exercises":[{"exerciseId":"demo:goblet-squat","workingSets":3,"repsMin":8,"repsMax":10}]}]}\'>'+esc(reply||"")+'</textarea>'+
 '<div class="ai-actions"><button type="button" class="btn btn-outline" data-action="ai-example-reply">Load example</button>'+
 '<button type="button" class="btn btn-primary" data-action="ai-apply-reply"'+(!prompt?' disabled':'')+'>Open in plan editor</button></div>'+
 '<p class="small-muted">We reject unknown exercise IDs, mismatched session counts and exercises outside the selected equipment/experience. No RIR, starting loads or live publishing are required.</p></section>'+
 '<section class="panel ai-workflow-next"><h3>Review and save</h3><p>After applying the JSON you enter the normal programme editor. Review exercises and sets, save the plan under a name, or make a separate copy for a fictional client using <strong>Saved plans → Assign example copy</strong>. This preview cannot publish to real client accounts.</p></section></section>';
}
