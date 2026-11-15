import {defaultClients,validClient,createFictionalClient,updateFictionalClient,changeClientStatus,clientOverview} from "./coach-clients-model.mjs";
import {renderClientDirectory} from "./coach-clients-ui.mjs";
import {newOnboarding,validateOnboardingRecord,updateIntake,toggleChecklist,nextOnboardingStage,syncOnboardingTasks,onboardingSummary,stageById} from "./coach-onboarding-model.mjs";
import {renderOnboarding} from "./coach-onboarding-ui.mjs";
import {freshEnrollment,validEnrollment,clearOldDemoClient,syncFreshTasks,
 updateContacts,verifyContacts,updateBaseline,verifyBaseline,submitDocument,reviewHealth,confirmAssignedDocumentPack,
 freshReadiness,nextFreshStep,enrollmentSummary} from "./coach-fresh-model.mjs";
import {renderFreshSection,renderFreshDashboard,documentDialogContent} from "./coach-fresh-ui.mjs";
import {SETUP_STEPS,setupChecks,firstOutstandingStep,firstOutstandingDocument,wizardCanAdvance,nextWizardStep,inviteEligibility,sampleInvite} from "./coach-setup-model.mjs";
import {renderSetupWizard} from "./coach-setup-ui.mjs";
import {initialCoachSafety,validateSafety,validCoachSession,setCoachSafety,coachSafetyReady,
 startCoachSession,activeCoachSession,logCoachSet,setCoachExerciseSkipped,finishCoachSession,
 changeCoachingPreference,COACHING_MODES} from "./coach-sessions-model.mjs";
import {renderCoachSessions,renderClientSessionSummary} from "./coach-sessions-ui.mjs";
import {MESSAGE_TEMPLATES,allMessageTemplates,defaultContactPreference,validContactPreference,
 changeContactPreference,createCustomTemplate,editCustomTemplate,validMessageTemplate,
 makeMessageDraft,validMessageDraft,legacyDraftsToNew,editMessageDraft,approveMessageDraft,
 markExternalSend,whatsappDraftUrl,canContact} from "./coach-messaging-model.mjs";
import {renderMessageCentre,messageComposeDialog,messagePreferenceDialog,messageTemplateDialog} from "./coach-messaging-ui.mjs";
import {EQUIPMENT,GYM_PRESET,initialLibrary,validLibraryState,validEquipmentIds,validExercise,validMethod,
 createExercise,editExercise,setExerciseReviewed,setExerciseActive,createMethod,editMethod,
 setMethodReviewed,setClientEquipment,defaultClientEquipment} from "./coach-library-model.mjs";
import {renderLibraryCentre,exerciseDialog,methodDialog} from "./coach-library-ui.mjs";
import {newProgramme,validProgramme,validProgrammeLibrary,updateProgrammeBasics,addProgrammeSession,
 renameProgrammeSession,removeProgrammeSession,insertProgrammeExercise,editProgrammeExercise,removeProgrammeExercise,
 importAIProgramme,saveNewTemplate,saveTemplateVersion,loadTemplateIntoDraft,assignTemplateToClient,
 currentClientAssignment,clientPlanWarnings,canonicalYoutubeUrl} from "./coach-programmes-model.mjs";
import {renderProgrammesCentre,aiImportDialog,assignmentDialog,renderClientProgrammeSummary} from "./coach-programmes-ui.mjs";
import {emptyAIBrief,validAIBrief,aiBriefFromClient,createAIRequest,parseAIResponse,aiExampleResponse} from "./coach-ai-brief-model.mjs";
import {renderNutritionHub,handleNutritionClick,handleNutritionChange,handleNutritionInput,resetNutritionDemo} from "./coach-nutrition-ui.mjs";
/*
 * TrainSmart Coach Hub D01 — strictly fictional, isolated, client-side preview.
 * No fetch, no Supabase SDK, no Auth, no email, no WhatsApp send, no real records.
 * Every mutation is scoped to sessionStorage and explicitly non-production.
 */
const STORE="trainsmart-coach-hub-programmes-06-fictional-v1";
const TIME_ZONE="Europe/London";
const COACH_VIEWS=Object.freeze(["today","clients","onboarding","fresh","setup","sessions","tasks","messages","library","programmes","nutrition"]);
let clients;

const kinds={
 fresh:{icon:"▣",label:"Fresh enrolment",description:"Confirm new details and complete a new paperwork pack."},
 review:{icon:"✎",label:"Check-in review",description:"Read the client’s weekly update and decide what needs adjusting."},
 payment:{icon:"£",label:"Payment follow-up",description:"Check the fictional payment ledger before preparing a supportive follow-up."},
 programme:{icon:"▦",label:"Next programme",description:"Review the training block ending soon and prepare a new coach-approved plan."},
 onboarding:{icon:"＋",label:"Onboarding",description:"Review their fictional intake and determine what is missing before programming."},
 followup:{icon:"✉",label:"Client follow-up",description:"Check whether the client needs a short personal message."},
 personal:{icon:"✓",label:"Personal task",description:"A task you’ve added manually to your coaching workflow."}
};
function todayInLondon(){return new Intl.DateTimeFormat("en-CA",{timeZone:TIME_ZONE,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
function addDays(day,amount){const d=new Date(day+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10);}
function currentDay(){return todayInLondon();}
function firstTasks(){
 const today=currentDay();
 return [
 {id:"review-sarah",clientId:"sarah",title:"Review Sarah’s weekly check-in",priority:"high",kind:"review",due:addDays(today,-1),estimate:5,note:"Weekly check-in received. Look at energy, recovery and recent training before responding.",status:"open",created:0},
 {id:"followup-james",clientId:"james",title:"Follow up on James’s payment",priority:"high",kind:"payment",due:today,estimate:3,note:"Payment marked due in fictional records. Confirm receipt before following up.",status:"open",created:1},
 {id:"programme-tom",clientId:"tom",title:"Prepare Tom’s next training block",priority:"normal",kind:"programme",due:today,estimate:20,note:"His 6-week programme is ending. Reuse a library template where appropriate.",status:"open",created:2},
 {id:"review-emily",clientId:"emily",title:"Review Emily’s weekly check-in",priority:"normal",kind:"review",due:today,estimate:5,note:"Review her first training week’s feedback before sending a response.",status:"open",created:3},
 {id:"intake-chris",clientId:"chris",title:"Check Chris’s updated equipment list",priority:"normal",kind:"onboarding",due:addDays(today,1),estimate:5,note:"Verify his available equipment before changing his programme.",status:"open",created:4},
 {id:"followup-tom",clientId:"tom",title:"Ask Tom how the final sessions felt",priority:"low",kind:"followup",due:addDays(today,2),estimate:4,note:"Send an encouraging check-in after reviewing the new training block.",status:"open",created:5}
 ];
}
function initial(){
 const seeded=defaultClients().map(clearOldDemoClient);
 const enrolments=Object.fromEntries(seeded.map(c=>[c.id,freshEnrollment(c,c.id==="james"?"online":c.id==="emily"?"group":"pt")]));
 const demoClient=seeded.find(c=>c.id==="chris");
 const starter=newOnboarding(demoClient);
 let tasks=syncOnboardingTasks([],starter,demoClient,currentDay());
 for(const c of seeded)tasks=syncFreshTasks(tasks,enrolments[c.id],c,currentDay());
 return {tasks,drafts:[],clients:seeded,clientEvents:[],
  library:initialLibrary(seeded),programmeDraft:newProgramme("draft:initial-001","New training plan"),
  programmeTemplates:[],programmeAssignments:[],programmeTab:"ai",
  aiBrief:emptyAIBrief(),aiClientId:"",aiPrompt:"",aiReply:"",
  programmeTemplateId:"",programmeClientId:"",
  libraryTab:"exercises",libraryQuery:"",libraryMovement:"all",libraryEquipment:"all",libraryStatus:"active",libraryClientId:"",libraryOnlyClientFit:false,
  messagePreferences:Object.fromEntries(seeded.map(c=>[c.id,defaultContactPreference(c.id)])),
  customMessageTemplates:[],messageClientFilter:"",messageStatusFilter:"all",
  coachSessions:[],coachSafety:Object.fromEntries(seeded.map(c=>[c.id,initialCoachSafety(c.id)])),
  coachRecordingMode:{},sessionClientId:seeded[0].id,
  enrolments,onboardingRecords:{[demoClient.id]:starter},selectedOnboarding:demoClient.id,
  view:"today",setupClientId:null,setupStep:"contacts",filter:"open",selectedClient:null,clientFilter:"all",clientSearch:"",clientTab:"enrolment"};
}
function validTask(t){return t&&typeof t.id==="string"&&typeof t.title==="string"&&typeof t.due==="string"&&["high","normal","low"].includes(t.priority)&&["open","completed","waiting","snoozed"].includes(t.status);}
function load(){
 try{const parsed=JSON.parse(sessionStorage.getItem(STORE)||"null");if(parsed&&Array.isArray(parsed.tasks)&&parsed.tasks.every(validTask)&&Array.isArray(parsed.drafts)){
    const base=initial();
    const storedClients=Array.isArray(parsed.clients)&&parsed.clients.length<=50&&parsed.clients.every(validClient)?parsed.clients:base.clients;
    const events=Array.isArray(parsed.clientEvents)?parsed.clientEvents.slice(-200):[];
    const records=parsed.onboardingRecords&&typeof parsed.onboardingRecords==="object"&&!Array.isArray(parsed.onboardingRecords)?
      Object.fromEntries(Object.entries(parsed.onboardingRecords).filter(([id,v])=>storedClients.some(c=>c.id===id)&&validateOnboardingRecord(v,id))):base.onboardingRecords;
    const enrolments=parsed.enrolments&&typeof parsed.enrolments==="object"&&!Array.isArray(parsed.enrolments)?
 Object.fromEntries(Object.entries(parsed.enrolments).filter(([id,e])=>storedClients.some(c=>c.id===id)&&validEnrollment(e,id))):base.enrolments;
 const coachSessions=Array.isArray(parsed.coachSessions)?parsed.coachSessions.filter(x=>validCoachSession(x)&&storedClients.some(c=>c.id===x.clientId)).slice(0,200):base.coachSessions;
    const coachSafety=Object.fromEntries(storedClients.map(c=>{
      const saved=parsed.coachSafety?.[c.id];
      return [c.id,validateSafety(saved,c.id)?saved:initialCoachSafety(c.id)];
    }));
    const coachRecordingMode=Object.fromEntries(Object.entries(parsed.coachRecordingMode||{}).filter(([id,mode])=>
      storedClients.some(c=>c.id===id)&&COACHING_MODES.includes(mode)));
    const sessionClientId=storedClients.some(c=>c.id===parsed.sessionClientId)?parsed.sessionClientId:storedClients[0]?.id||null;
    const messagePreferences=Object.fromEntries(storedClients.map(c=>[c.id,validContactPreference(parsed.messagePreferences?.[c.id],c.id)?
      parsed.messagePreferences[c.id]:defaultContactPreference(c.id)]));
    const customMessageTemplates=Array.isArray(parsed.customMessageTemplates)?
      parsed.customMessageTemplates.filter(validMessageTemplate).slice(0,50):[];
    const drafts=legacyDraftsToNew(parsed.drafts,storedClients).filter(validMessageDraft);
    const library=validLibraryState(parsed.library)?parsed.library:initialLibrary(storedClients);
    const parsedClientEquipment={...library.clientEquipment};
    for(const c of storedClients)if(!validEquipmentIds(parsedClientEquipment[c.id]))parsedClientEquipment[c.id]=defaultClientEquipment(c);
    const safeLibrary={...library,clientEquipment:Object.fromEntries(storedClients.map(c=>[c.id,parsedClientEquipment[c.id]]))};
    const validPlanState=validProgrammeLibrary(parsed.programmeTemplates,parsed.programmeAssignments,safeLibrary.exercises);
    const programmeDraft=validProgramme(parsed.programmeDraft,safeLibrary.exercises,{allowEmpty:true})?
      parsed.programmeDraft:base.programmeDraft;
    const programmeTemplates=validPlanState?parsed.programmeTemplates:base.programmeTemplates;
    const programmeAssignments=validPlanState?parsed.programmeAssignments:base.programmeAssignments;
    const aiBrief=validAIBrief(parsed.aiBrief)?parsed.aiBrief:base.aiBrief;
    const aiClientId=storedClients.some(c=>c.id===parsed.aiClientId)?parsed.aiClientId:"";
    const aiPrompt=typeof parsed.aiPrompt==="string"&&parsed.aiPrompt.length<=30000?parsed.aiPrompt:"";
    const aiReply=typeof parsed.aiReply==="string"&&parsed.aiReply.length<=30000?parsed.aiReply:"";
    return {...base,...parsed,clients:storedClients,clientEvents:events,onboardingRecords:records,enrolments,
      coachSessions,coachSafety,coachRecordingMode,sessionClientId,messagePreferences,
      customMessageTemplates,drafts,library:safeLibrary,programmeDraft,programmeTemplates,programmeAssignments,
      aiBrief,aiClientId,aiPrompt,aiReply};
  }}catch{}
 return initial();
}
let state=load();
if(typeof window!=="undefined"&&COACH_VIEWS.includes(window.location.hash.slice(1)))state.view=window.location.hash.slice(1);
clients=state.clients;
function save(){
 state.clients=clients;
 try{sessionStorage.setItem(STORE,JSON.stringify(state));}catch{}
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function clientById(id){return clients.find(c=>c.id===id)||null;}
const priorityWeight={high:0,normal:1,low:2};
function actionable(t){return t.status==="open"||(t.status==="snoozed"&&t.due<=currentDay());}
function sortedTasks(list){return [...list].sort((a,b)=>{const ad=actionable(a)?0:1,bd=actionable(b)?0:1;return ad-bd||priorityWeight[a.priority]-priorityWeight[b.priority]||a.due.localeCompare(b.due)||(a.created??0)-(b.created??0);});}
function dueLabel(t){
 if(t.status==="completed")return "Completed";
 if(t.status==="waiting")return "Waiting on client";
 const d=currentDay();
 if(t.due<d)return "Overdue";
 if(t.status==="snoozed"&&t.due>d)return "Snoozed until "+displayDate(t.due);
 if(t.due===d)return "Today";
 if(t.due===addDays(d,1))return "Tomorrow";
 return displayDate(t.due);
}
function displayDate(iso){if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||""))return "TBC";return new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(iso+"T12:00:00Z"));}
function priorityTag(t){
 const p=t.priority==="high"?"High priority":t.priority==="normal"?"Normal":"Low";
 const cls=t.priority==="high"?"warn":t.priority==="normal"?"good":"muted";
 return '<span class="tag '+cls+'">'+p+'</span>';
}
function dueTag(t){
 const danger=t.status!=="completed"&&t.due<currentDay()?"warn":"muted";
 return '<span class="tag '+danger+'">'+escapeHtml(dueLabel(t))+'</span>';
}
function clientLabel(t){return clientById(t.clientId)?.name||"Coaching admin";}
function taskForDashboard(t){return actionable(t)&&(!t.clientId||clientById(t.clientId)?.status!=="Archived");}
function openCount(){return state.tasks.filter(taskForDashboard).length;}
function viewHeading(){
 const headings={
 today:["OVERVIEW","Dashboard","Clients, training plans and work requiring attention.","OVERVIEW"],
 clients:["CLIENTS","Clients","Profiles, plans and coaching history in one place.","CLIENTS"],
 tasks:["TASKS","Tasks","Review, complete or reschedule outstanding work.","TASKS"],
 messages:["MESSAGING","Messages","Prepare and review client communication.","MESSAGES"],
 fresh:["CLIENT SETUP","Client setup","Review details and complete onboarding steps.","CLIENT SETUP"],
 setup:["CLIENT SETUP","Onboarding checklist","Complete the outstanding steps for this client.","ONBOARDING"],
 sessions:["SESSIONS","Sessions","Run and log coached training sessions.","SESSIONS"],
 library:["EXERCISE LIBRARY","Exercise library","Find and manage exercises and coaching methods.","EXERCISES"],
 programmes:["TRAINING","Training plans","Build, edit and reuse coaching programmes.","TRAINING PLANS"],
 nutrition:["NUTRITION","Nutrition","Calorie targets, meal plans and saved recipes.","NUTRITION"],
 onboarding:["ONBOARDING","Onboarding","Intake details and outstanding actions.","ONBOARDING"]
 };
 return headings[state.view]||headings.today;
}
function renderChrome(){
 const h=viewHeading();
 document.getElementById("page-eyebrow").textContent=h[0]+" · "+new Intl.DateTimeFormat("en-GB",{weekday:"long",timeZone:TIME_ZONE}).format(new Date()).toUpperCase();
 document.getElementById("page-title").textContent=h[1];
 document.getElementById("page-subtitle").textContent=h[2];
 document.getElementById("crumb-page").textContent=h[3];
 document.querySelectorAll(".nav-link[data-view]").forEach(el=>{
  const on=el.dataset.view===state.view;
  el.classList.toggle("active",on);
  if(on)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current");
 });
 document.getElementById("today-count").textContent=String(openCount());
 document.getElementById("onboarding-count").textContent=String(onboardingSummary(clients,state.onboardingRecords).pending);
 document.getElementById("fresh-count").textContent=String(enrollmentSummary(clients,state.enrolments).pending);
 document.getElementById("add-task").textContent=state.view==="programmes"?"＋ New plan":["clients","onboarding","fresh","setup"].includes(state.view)?"＋ Add client":"＋ Add task";
 const select=document.getElementById("task-client");
 const old=select.value;
 select.innerHTML='<option value="">General coaching admin</option>'+clients.map(c=>'<option value="'+c.id+'">'+escapeHtml(c.name)+'</option>').join("");
 if(clients.some(c=>c.id===old))select.value=old;
}
function stat(label,value,note,icon){return '<div class="stat"><p class="stat-label"><span class="stat-icon" aria-hidden="true">'+icon+'</span>'+escapeHtml(label)+'</p><div class="stat-number">'+escapeHtml(value)+'</div><div class="stat-note">'+escapeHtml(note)+'</div></div>';}
function taskRow(t,small=false){
 return '<div class="'+(small?"work-item":"task-list-row")+'">'+
 (small?'<div class="task-round" aria-hidden="true">'+escapeHtml(kinds[t.kind]?.icon||"✓")+'</div>':"")+
 '<div><p class="'+(small?"task-name":"task-list-title")+'">'+escapeHtml(t.title)+'</p><p class="'+(small?"task-sub":"task-meta")+'">'+escapeHtml(clientLabel(t))+' · '+escapeHtml(dueLabel(t))+' · '+escapeHtml(String(t.estimate||5))+' min</p></div>'+
 '<div class="row-actions">'+(small?"":priorityTag(t))+'<button class="btn btn-ghost btn-sm" data-action="task" data-id="'+escapeHtml(t.id)+'">Open</button></div></div>';
}
function taskActionText(t){
 const examples={
 review:"Fictional check-in: sessions completed 3/3; energy 3/5; sleep 4/5. Read the full check-in in H09. For now, decide what you would do next.",
 payment:"Fictional amount due: £75. Payment is not confirmed. This demo will create a message draft; it cannot send or verify a payment.",
 programme:"Fictional current block: Strength and Conditioning, week 6/6. The programme library and real assignment workflow are scheduled for H05–H08.",
 onboarding:"Open the fictional onboarding checklist to review stage and details. Real invitations, client accounts and email are disabled.",
 followup:"Fictional client follow-up. Use a saved message template in the later messaging block.",
 personal:"Keep this task focused on one clear action. Completing it will remove it from the active queue."
 };
 return examples[t.kind]||examples.personal;
}
function renderToday(){
 const active=sortedTasks(state.tasks.filter(taskForDashboard));
 const next=active[0];
 const reviews=active.filter(t=>t.kind==="review").length;
 const payments=active.filter(t=>t.kind==="payment").length;
 const nextHtml=next?'<div class="priority-card"><div class="next-top"><span class="mini-label">NEXT UP</span><span class="time-hint">'+escapeHtml(next.estimate)+" MIN · "+escapeHtml(dueLabel(next))+'</span></div><h2>'+escapeHtml(next.title)+'</h2><p class="client-line">'+escapeHtml(clientLabel(next))+' · '+escapeHtml(kinds[next.kind]?.label||"Your task")+'</p><p class="explain">'+escapeHtml(next.note||taskActionText(next))+'</p><div class="button-row"><button class="btn btn-primary" data-action="task" data-id="'+escapeHtml(next.id)+'">Open task <span aria-hidden="true">↗</span></button><button class="btn btn-outline" data-action="snooze" data-id="'+escapeHtml(next.id)+'">Snooze a day</button></div></div>':
 '<div class="priority-card"><span class="mini-label">NEXT UP</span><h2>You are up to date.</h2><p class="explain">No open tasks to work on right now. Review the next few days or add a task to capture an idea.</p><button class="btn btn-primary" data-view="tasks">View all tasks</button></div>';
 const focus=active.filter(t=>t!==next).slice(0,4);
 const activity='<div class="activity">'+[
 ['green',"Workout log received","Fictional client · Today"],
 ['amber',"Check-in review waiting","Fictional Sarah · Yesterday"],
 ['green',"Programme milestone approaching","Fictional Tom · This week"]
 ].map(([tone,title,meta])=>'<div class="activity-item"><span class="activity-dot '+(tone==="amber"?"amber":"")+'"></span><div><strong>'+title+'</strong><small>'+meta+'</small></div></div>').join("")+'</div>';
 return '<div class="stat-grid">'+
 stat("Active clients",clientOverview(clients,state.tasks).active,"Fictional profiles","♙")+
 stat("Needs review",reviews,"Open check-in tasks","◴")+
 stat("Payments due",payments,"Fictional follow-ups","£")+
 stat("Tasks to action",active.length,"Prioritised for you","✓")+
 '</div><div class="main-grid"><div><section class="panel"><div class="panel-header"><h3>Next action</h3><span class="tag muted">CURRENT QUEUE</span></div>'+nextHtml+
 '<div class="section-space"><div class="panel-header"><h3>Also due</h3><button class="subdued-link" data-view="tasks">View all tasks ↗</button></div>'+
 (focus.length?'<div class="work-items">'+focus.map(t=>taskRow(t,true)).join("")+'</div>':'<p class="no-items">No other tasks due.</p>')+'</div></section></div>'+
 '<div><section class="panel"><div class="panel-header"><h3>Coach tools</h3><span class="small-muted">Shortcuts</span></div>'+
 '<div class="quick-grid">'+
 '<button class="quick" data-view="clients"><strong>Clients</strong><small>Open client profiles</small></button>'+
 '<button class="quick" data-view="programmes"><strong>Training plans</strong><small>Create or edit a plan</small></button>'+
 '<button class="quick" data-view="nutrition"><strong>Nutrition</strong><small>Meal plans and targets</small></button>'+
 '<button class="quick" data-view="tasks"><strong>Tasks</strong><small>Review the queue</small></button>'+
 '<button class="quick" data-view="messages"><strong>Messages</strong><small>Review drafts</small></button>'+
 '<button class="quick" data-action="new-task"><strong>New task</strong><small>Add a reminder</small></button></div></section>'+
 '<section class="panel section-full"><div class="panel-header"><h3>Activity</h3><span class="small-muted">Sample feed</span></div>'+activity+'</section>'+
 
 '</div></div>';
}
function renderClients(){
 return renderClientDirectory({clients,tasks:state.tasks,selectedClientId:state.selectedClient,
  clientTab:state.clientTab||"overview",clientFilter:state.clientFilter||"all",
  clientSearch:state.clientSearch||"",clientEvents:state.clientEvents||[],
  taskRow,sortedTasks,actionable,enrolments:state.enrolments,renderFreshSection,coachSessions:state.coachSessions,renderClientSessionSummary,
 programmeAssignments:state.programmeAssignments,renderClientProgrammeSummary});
}
function noteClientEvent(id,label){
 const event={clientId:id,label,at:new Date().toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"})};
 state.clientEvents=[...(state.clientEvents||[]),event].slice(-200);
}
function openClientEditor(id=null){
 const client=id?clientById(id):null;
 const form=document.getElementById("client-form");form.reset();
 document.getElementById("client-id").value=client?.id||"";
 document.getElementById("client-dialog-title").textContent=client?"Edit fictional profile":"Add fictional client";
 document.getElementById("client-name").value=client?.name||"";
 document.getElementById("client-goal").value=client?.goal||"";
 document.getElementById("client-status").value=client?.status||"Onboarding";
 document.getElementById("client-experience").value=client?.experience||"beginner";
 document.getElementById("client-days").value=client?.trainingDays??3;
 document.getElementById("client-duration").value=client?.sessionMinutes??45;
 document.getElementById("client-equipment").value=client?.equipment||"";
 document.getElementById("client-notes").value=client?.privateNotes||"";
 document.getElementById("client-form-error").hidden=true;
 document.getElementById("client-dialog").showModal();
 document.getElementById("client-name").focus();
}
function submitClientEditor(form){
 const fd=new FormData(form);
 const input=Object.fromEntries(fd.entries());
 const id=String(fd.get("clientId")||"");
 try{
   if(id){
     const before=clientById(id);
     if(input.status==="Active"&&!freshReadiness(state.enrolments[id]).readyForActivation)
       throw Error("Cannot activate a demo client before required new documents, reviews and new plans are approved.");
     clients=updateFictionalClient(clients,id,input);
     noteClientEvent(id,before?.status!==input.status?"Profile and status updated":"Profile details updated");
   }else{
     const newid="demo-"+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8));
     input.status="Onboarding";
     const made=createFictionalClient(clients,input,newid);
     clients=made.clients.map(c=>c.id===newid?clearOldDemoClient(c):c);
     const enrolment=freshEnrollment(clients.find(c=>c.id===newid),String(fd.get("service")||"pt"));
     state.enrolments[newid]=enrolment;
     state.messagePreferences[newid]=defaultContactPreference(newid);
     state.library=setClientEquipment(state.library,newid,defaultClientEquipment(clients.find(c=>c.id===newid)));
     state.tasks=syncFreshTasks(state.tasks,enrolment,clients.find(c=>c.id===newid),currentDay());
     state.selectedClient=newid;
     state.sessionClientId=newid;
     state.coachSafety[newid]=initialCoachSafety(newid);
     state.clientTab="enrolment";
     state.clientFilter="all";
     state.clientSearch="";
     const onboarding=newOnboarding(made.client);
     state.onboardingRecords[newid]=onboarding;
     state.selectedOnboarding=newid;
     state.tasks=syncOnboardingTasks(state.tasks,onboarding,made.client,currentDay());
     noteClientEvent(newid,"Fictional client profile created");
   }
   document.getElementById("client-dialog").close();
   if(!id){
    state.setupClientId=state.selectedClient;
    state.setupStep="contacts";
    state.view="setup";
   }else if(state.view==="setup"&&state.setupClientId===id){
    state.setupStep="contacts";
   }else{
    state.view="clients";
   }
   save();render();flash(id?"Fictional profile updated.":"Fictional client created. Continue through guided setup.");
 }catch(error){
   const el=document.getElementById("client-form-error");el.textContent=error.message||"Please review the client details.";el.hidden=false;
 }
}
function setClientStatus(id,status){
 const person=clientById(id);if(!person)return;
 if(status==="Archived"&&!confirm("Archive this fictional client? Their demo history will be kept, and tasks will leave Today."))return;
 try{
 if(status==="Active"&&!freshReadiness(state.enrolments[id]).readyForActivation)throw Error("Complete fresh enrolment and both plans before activation.");
 clients=changeClientStatus(clients,id,status);
   noteClientEvent(id,status==="Archived"?"Profile archived":"Profile restored to active");
   save();render();flash(status==="Archived"?"Fictional profile archived.":"Fictional profile restored.");
 }catch(error){flash(error.message);}
}
function appendOnboardingEvent(record,label){
 return {...record,events:[...(record.events||[]),{label,at:new Date().toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"})}].slice(-100)};
}
function startOnboarding(id){
 const client=clientById(id);
 if(!client||client.status==="Archived"){flash("Choose a non-archived fictional client.");return;}
 if(!state.onboardingRecords[id]){
  const created=appendOnboardingEvent(newOnboarding(client),"Fictional onboarding started");
  state.onboardingRecords[id]=created;
  if(client.status!=="Onboarding")clients=changeClientStatus(clients,id,"Onboarding");
  state.tasks=syncOnboardingTasks(state.tasks,created,clientById(id),currentDay());
  noteClientEvent(id,"Fictional onboarding started");
 }
 state.selectedOnboarding=id;
 changeView("onboarding");
}
function openOnboarding(id){
 if(!id||!clientById(id)){changeView("onboarding");return;}
 if(state.onboardingRecords[id]){state.selectedOnboarding=id;changeView("onboarding");}
 else startOnboarding(id);
}
function openIntakeEditor(id){
 const record=state.onboardingRecords[id];
 if(!record||record.stage==="complete")return;
 const form=document.getElementById("onboarding-intake-form");
 form.reset();document.getElementById("onboarding-intake-client").value=id;
 const intake=record.intake;
 for(const key of ["goal","equipment","days","preferredSchedule","foodPreferences","notes"]){
  form.elements.namedItem(key).value=intake[key]||"";
 }
 const error=document.getElementById("onboarding-intake-error");error.hidden=true;
 document.getElementById("onboarding-intake-dialog").showModal();
 form.elements.namedItem("goal").focus();
}
function submitIntakeEditor(form){
 const id=String(new FormData(form).get("clientId")||"");
 const record=state.onboardingRecords[id];if(!record)return;
 try{
  const updated=updateIntake(record,Object.fromEntries(new FormData(form).entries()));
  state.onboardingRecords[id]=appendOnboardingEvent(updated,"Example intake details saved");
  document.getElementById("onboarding-intake-dialog").close();
  save();render();flash("Fictional intake saved in this browser session.");
 }catch(error){
  const field=document.getElementById("onboarding-intake-error");
  field.textContent=error.message;field.hidden=false;
 }
}
function advanceOnboarding(id){
 const record=state.onboardingRecords[id];const client=clientById(id);if(!record||!client)return;
 try{
  if(record.stage==="review"&&!freshReadiness(state.enrolments[id]||{}).readyForProgramming)
   throw Error("Complete the fresh contact, baseline, approved example paperwork and coach review before progressing.");
  if(record.stage==="ready"||record.stage==="prepared")
   throw Error("The real programme and nutrition builders are not built yet. This fictional enrolment cannot activate.");
  const next=nextOnboardingStage(record);
  const prepared=appendOnboardingEvent(next,"Advanced to "+stageById(next.stage).label+" (preview only)");
  state.onboardingRecords[id]=prepared;
  state.tasks=syncOnboardingTasks(state.tasks,prepared,client,currentDay());
  if(prepared.stage==="prepared"){
   const draftId="welcome-preview-"+id;
   if(!state.drafts.some(d=>d.id===draftId)){
    state.drafts.unshift({id:draftId,sourceId:draftId,title:"Fictional welcome message — NOT SENT",
      clientName:client.name,text:"Hi "+client.name.split(" ")[0]+
      ", welcome to TrainSmart Coaching! I am preparing your plan and will be in touch once it is ready. — Demo draft only."});
   }
  }
  if(prepared.stage==="complete")noteClientEvent(id,"Fictional onboarding preview completed — no invitation sent");
  save();render();
  flash(prepared.stage==="prepared"?"Welcome message drafted — nothing sent.":prepared.stage==="complete"?"Preview completed — no account activated.":"Moved to "+stageById(prepared.stage).label+".");
 }catch(error){flash(error.message);}
}



function openWizard(id,step=null){
 const client=clientById(id),record=state.enrolments[id];if(!client||!record)return;
 state.setupClientId=id;
 state.setupStep=step&&SETUP_STEPS.some(x=>x.id===step)?step:firstOutstandingStep(client,record);
 changeView("setup");
}
function gotoWizardStep(id,step){
 const client=clientById(id),record=state.enrolments[id];if(!client||!record)return;
 // Step selection allows inspecting future stages, but never bypasses their data gates.
 if(!SETUP_STEPS.some(s=>s.id===step))return;
 state.setupClientId=id;state.setupStep=step;
 changeView("setup");
}
function advanceWizard(id){
 const client=clientById(id),record=state.enrolments[id];if(!client||!record)return;
 const step=state.setupStep;
 if(!wizardCanAdvance(client,record,step)){
  flash("Finish the requirements for this stage before proceeding.");return;
 }
 gotoWizardStep(id,nextWizardStep(step));
}
function autoAdvanceWizard(id,completedStep){
 if(state.view!=="setup"||state.setupClientId!==id||state.setupStep!==completedStep)return false;
 const client=clientById(id),record=state.enrolments[id];
 if(!wizardCanAdvance(client,record,completedStep))return false;
 state.setupStep=nextWizardStep(completedStep);save();render();
 flash("Step confirmed — moving to "+SETUP_STEPS.find(s=>s.id===state.setupStep).short+".");
 return true;
}
function syncDemoEnrollment(id){
 const record=state.enrolments[id],client=clientById(id);if(!record||!client)return;
 state.tasks=syncFreshTasks(state.tasks,record,client,currentDay());
 save();render();
}
function openFreshProfile(id,section="enrolment"){
 if(!clientById(id))return;
 state.selectedClient=id;
 state.clientTab=["enrolment","contact","baseline","documents"].includes(section)?section:"enrolment";
 changeView("clients");
}
function openFreshStep(id){
 openWizard(id);
}
function startFreshForClient(id){
 const client=clientById(id);if(!client)return;
 if(state.enrolments[id]&&!confirm("Restart this FICTIONAL enrolment? Demo signatures, contact details and baseline will be cleared. Real records are untouched."))return;
 const fresh=clearOldDemoClient(client);
 clients=clients.map(c=>c.id===id?fresh:c);
 state.enrolments[id]=freshEnrollment(fresh);
 state.tasks=state.tasks.filter(t=>!t.id.startsWith("fresh:"+id+":"));
 state.tasks=syncFreshTasks(state.tasks,state.enrolments[id],fresh,currentDay());
 state.onboardingRecords[id]=newOnboarding(fresh);
 state.selectedOnboarding=id;
 noteClientEvent(id,"Started new fictional TrainSmart enrolment — no legacy data copied");
 openWizard(id);
 flash("Fresh demo enrolment started; old plans and signatures NOT copied.");
}
function openFreshContact(id){
 const record=state.enrolments[id];if(!record)return;
 const form=document.getElementById("fresh-contact-form");form.reset();
 form.elements.namedItem("clientId").value=id;
 for(const key of ["email","phone","emergencyName","emergencyRelation","emergencyPhone"])form.elements.namedItem(key).value=record.contacts[key]||"";
 document.getElementById("fresh-contact-error").hidden=true;
 document.getElementById("fresh-contact-dialog").showModal();
 form.elements.namedItem("email").focus();
}
function submitFreshContacts(form){
 const fd=new FormData(form),id=String(fd.get("clientId")||""),rec=state.enrolments[id];if(!rec)return;
 try{
  state.enrolments[id]=updateContacts(rec,Object.fromEntries(fd.entries()));
  document.getElementById("fresh-contact-dialog").close();syncDemoEnrollment(id);
  flash("Demo contact details saved; coach verification required.");
 }catch(error){const el=document.getElementById("fresh-contact-error");el.textContent=error.message;el.hidden=false;}
}
function openFreshBaseline(id){
 const record=state.enrolments[id];if(!record)return;
 const form=document.getElementById("fresh-baseline-form");form.reset();
 form.elements.namedItem("clientId").value=id;
 form.elements.namedItem("heightCm").value=record.baseline.heightCm||"";
 form.elements.namedItem("weightKg").value=record.baseline.weightKg||"";
 form.elements.namedItem("measuredAt").value=record.baseline.measuredAt||currentDay();
 document.getElementById("fresh-baseline-error").hidden=true;
 document.getElementById("fresh-baseline-dialog").showModal();
 form.elements.namedItem("heightCm").focus();
}
function submitFreshBaseline(form){
 const fd=new FormData(form),id=String(fd.get("clientId")||""),rec=state.enrolments[id];if(!rec)return;
 try{
  state.enrolments[id]=updateBaseline(rec,Object.fromEntries(fd.entries()));
  document.getElementById("fresh-baseline-dialog").close();syncDemoEnrollment(id);
  flash("Fresh fictional measurements saved; coach review required.");
 }catch(error){const el=document.getElementById("fresh-baseline-error");el.textContent=error.message;el.hidden=false;}
}
function verifyFresh(id,type){
 const record=state.enrolments[id];if(!record)return;
 try{
  state.enrolments[id]=type==="baseline"?verifyBaseline(record):verifyContacts(record,type);
  syncDemoEnrollment(id);
  if(!autoAdvanceWizard(id,type==="baseline"?"baseline":"contacts"))
   flash("Demo check recorded. No real identity or health clearance.");
 }catch(error){flash(error.message);}
}
function openFreshDocument(id,docId){
 const record=state.enrolments[id];if(!record)return;
 const details=documentDialogContent(record,docId);if(!details)return;
 const form=document.getElementById("fresh-document-form");form.reset();
 document.getElementById("fresh-document-client").value=id;
 document.getElementById("fresh-document-id").value=docId;
 document.getElementById("fresh-document-heading").textContent=details.title;
 document.getElementById("fresh-document-content").innerHTML=details.body;
 document.getElementById("fresh-document-error").hidden=true;
 document.getElementById("fresh-document-dialog").showModal();
}
function submitFreshDocument(form){
 const fd=new FormData(form),id=String(fd.get("clientId")||""),docId=String(fd.get("docId")||"");
 const record=state.enrolments[id];if(!record||!record.documents[docId])return;
 try{
  const review=String(fd.get("review")||"");
  state.enrolments[id]=docId==="screen"&&review?
   reviewHealth(record,review,String(fd.get("reviewNote")||"")):
   submitDocument(record,docId,String(fd.get("action")||""),String(fd.get("signer")||""));
  document.getElementById("fresh-document-dialog").close();
  syncDemoEnrollment(id);
  flash("Fictional document preview updated. Clients sign their own approved forms after invitation.");
 }catch(error){const el=document.getElementById("fresh-document-error");el.textContent=error.message;el.hidden=false;}
}

function openCoachSessionForClient(clientId){
 const client=clientById(clientId);
 if(!client||client.status==="Archived"){flash("Select a non-archived fictional client.");return;}
 state.sessionClientId=clientId;
 changeView("sessions");
}
function confirmFictionalSafety(clientId,key){
 const client=clientById(clientId);
 if(!client||client.status==="Archived")return;
 const current=state.coachSafety[clientId]||initialCoachSafety(clientId);
 try{
  state.coachSafety[clientId]=setCoachSafety(current,key,!current[key]);
  save();render();
  flash("Fictional coach confirmation updated — this is not real consent or medical clearance.");
 }catch(error){flash(error.message);}
}
function beginCoachSession(clientId){
 const client=clientById(clientId);
 if(!client||client.status==="Archived"){flash("Cannot start sessions for archived clients.");return;}
 try{
  const result=startCoachSession(state.coachSessions,clientId,state.coachSafety[clientId]);
  state.coachSessions=result.sessions;
  state.sessionClientId=clientId;
  noteClientEvent(clientId,"Started a coach-led example session (no client login)");
  save();render();flash("Coach-led fictional session started.");
 }catch(error){flash(error.message);}
}
function submitCoachSet(form){
 const id=form.dataset.sessionId,exerciseId=form.dataset.exerciseId;
 try{
  const data=Object.fromEntries(new FormData(form).entries());
  state.coachSessions=logCoachSet(state.coachSessions,id,exerciseId,data);
  save();render();
  flash("Performed demo set recorded against this client.");
 }catch(error){flash(error.message);}
}
function submitCoachSkip(form){
 const id=form.dataset.sessionId,exerciseId=form.dataset.exerciseId;
 try{
  state.coachSessions=setCoachExerciseSkipped(state.coachSessions,id,exerciseId,new FormData(form).get("reason"));
  save();render();flash("Example exercise skipped with a recorded reason.");
 }catch(error){flash(error.message);}
}
function undoCoachSkip(id,exerciseId){
 try{
  state.coachSessions=setCoachExerciseSkipped(state.coachSessions,id,exerciseId);
  save();render();flash("Example exercise returned to the session.");
 }catch(error){flash(error.message);}
}
function completeCoachSession(id){
 const session=state.coachSessions.find(s=>s.id===id);
 if(!session)return;
 try{
  const notes=String(document.getElementById("coach-finish-note")?.value||"");
  state.coachSessions=finishCoachSession(state.coachSessions,id,notes);
  noteClientEvent(session.clientId,"Coach-recorded session completed (login not required)");
  queueSessionFollowup(session);
  save();render();
  flash("Fictional session completed — results saved under this client's profile.");
 }catch(error){flash(error.message);}
}
function updateCoachMode(clientId,mode){
 if(!clientById(clientId))return;
 try{state.coachRecordingMode[clientId]=changeCoachingPreference(state.coachRecordingMode[clientId],mode);
  save();render();flash("Fictional recording preference saved.");
 }catch(error){flash(error.message);}
}
function renderTasks(){
 const all=sortedTasks(state.tasks),filters=[
 ["open","To do",all.filter(actionable).length],
 ["waiting","Waiting",all.filter(t=>t.status==="waiting").length],
 ["snoozed","Snoozed",all.filter(t=>t.status==="snoozed"&&t.due>currentDay()).length],
 ["completed","Completed",all.filter(t=>t.status==="completed").length],
 ["all","All",all.length]
 ];
 const f=state.filter;
 const subset=all.filter(t=>f==="all"||f==="open"&&actionable(t)||f==="waiting"&&t.status==="waiting"||f==="snoozed"&&t.status==="snoozed"&&t.due>currentDay()||f==="completed"&&t.status==="completed");
 return '<section class="panel"><div class="panel-header"><div><h3>Coaching tasks</h3><p class="small-muted">One list for client actions and everything else.</p></div><span class="tag good">'+all.length+' total</span></div>'+
 '<div class="segment" role="group" aria-label="Filter tasks">'+filters.map(([v,label,n])=>'<button class="seg '+(f===v?"active":"")+'" type="button" data-filter="'+v+'" aria-pressed="'+(f===v)+'">'+label+' <span class="task-count">'+n+'</span></button>').join("")+'</div>'+
 (subset.length?'<div class="task-list">'+subset.map(t=>taskRow(t)).join("")+'</div>':'<div class="empty"><h3>Nothing in this view</h3><p>You’re clear here. Check another filter or add a manual task.</p></div>')+
 '<p class="footer-bits">Task actions persist in this browser session only. Automated due-date rules will be implemented with the real backend in H03.</p></section>';
}

function messageClientContact(id){return state.enrolments[id]?.contacts||{};}
function openMessageComposer(clientId="",templateId="",draftId=""){
 const d=state.drafts.find(x=>x.id===draftId)||null;
 const available=clients.filter(c=>c.status!=="Archived");
 if(!available.length){flash("Create a fictional client before preparing a message.");return;}
 const chosen=d?.clientId||clientId||available[0].id;
 const all=allMessageTemplates(state.customMessageTemplates);
 const template=all.find(t=>t.id===templateId)||all.find(t=>t.id===d?.templateId)||all[0];
 const form=document.getElementById("message-compose-form");
 form.reset();
 document.getElementById("message-compose-id").value=d?.id||"";
 document.getElementById("message-compose-heading").textContent=d?"Edit fictional draft":"Compose fictional message";
 document.getElementById("message-compose-content").innerHTML=messageComposeDialog({
  clients,selectedClientId:chosen,draft:d,templateId:template.id,templates:state.customMessageTemplates
 }).html;
 if(!d)fillComposerTemplate();
 document.getElementById("message-compose-error").hidden=true;
 document.getElementById("message-compose-dialog").showModal();
 form.elements.namedItem("text")?.focus();
}
function fillComposerTemplate(){
 const form=document.getElementById("message-compose-form");
 if(form.elements.namedItem("draftId")?.value)return;
 const template=allMessageTemplates(state.customMessageTemplates).find(t=>t.id===form.elements.namedItem("templateId")?.value);
 const client=clientById(form.elements.namedItem("clientId")?.value);
 if(!template||!client)return;
 const firstName=(client.name||"there").trim().split(/\s+/)[0];
 const safe={firstName,programme:"your next programme",milestone:"your progress"};
 const fill=t=>String(t||"").replace(/{{(.*?)}}/g,(match,key)=>Object.prototype.hasOwnProperty.call(safe,key.trim())?safe[key.trim()]:match);
 form.elements.namedItem("subject").value=fill(template.subject);
 form.elements.namedItem("text").value=fill(template.text);
 form.elements.namedItem("channel").value=template.channel;
}
function submitMessageComposer(form){
 const fd=new FormData(form),existing=String(fd.get("draftId")||"");
 const clientId=String(fd.get("clientId")||"");
 try{
  if(existing){
   state.drafts=editMessageDraft(state.drafts,existing,Object.fromEntries(fd.entries()));
  }else{
   const client=clientById(clientId),template=allMessageTemplates(state.customMessageTemplates).find(t=>t.id===fd.get("templateId"));
   if(!client||client.status==="Archived")throw Error("Choose a non-archived fictional client.");
   const result=makeMessageDraft({id:"msg-demo-"+Date.now()+"-"+(state.drafts.length+1),
     client,template,channel:String(fd.get("channel")||"whatsapp"),existing:state.drafts});
   state.drafts=editMessageDraft(result.drafts,result.drafts[0].id,Object.fromEntries(fd.entries()));
   state.messageClientFilter=clientId;
  }
  document.getElementById("message-compose-dialog").close();
  state.messageStatusFilter="all";
  save();render();flash("Editable fictional message saved — nothing sent.");
 }catch(error){const el=document.getElementById("message-compose-error");el.textContent=error.message;el.hidden=false;}
}
function openMessagePreference(clientId){
 const client=clientById(clientId);if(!client)return;
 document.getElementById("message-preference-client").value=client.id;
 document.getElementById("message-preference-heading").textContent="Contact preference: "+client.name;
 document.getElementById("message-preference-content").innerHTML=messagePreferenceDialog(client,
  state.messagePreferences[client.id]||defaultContactPreference(client.id),messageClientContact(client.id));
 document.getElementById("message-preference-error").hidden=true;
 document.getElementById("message-preference-dialog").showModal();
}
function submitMessagePreference(form){
 const fd=new FormData(form),id=String(fd.get("clientId")||"");
 if(!clientById(id))return;
 try{
  state.messagePreferences[id]=changeContactPreference(state.messagePreferences[id]||defaultContactPreference(id),
   String(fd.get("channel")||"none"),fd.get("marketing")==="yes");
  document.getElementById("message-preference-dialog").close();
  save();render();flash("Demonstration communication preference saved.");
 }catch(error){const el=document.getElementById("message-preference-error");el.textContent=error.message;el.hidden=false;}
}
function openMessageTemplate(templateId=""){
 const t=state.customMessageTemplates.find(t=>t.id===templateId)||null;
 document.getElementById("message-template-id").value=t?.id||"";
 document.getElementById("message-template-heading").textContent=t?"Edit custom template":"Add reusable template";
 document.getElementById("message-template-content").innerHTML=messageTemplateDialog(t);
 document.getElementById("message-template-error").hidden=true;
 document.getElementById("message-template-dialog").showModal();
}
function submitMessageTemplate(form){
 const fd=new FormData(form),existing=String(fd.get("templateId")||"");
 try{
  const data=Object.fromEntries(fd.entries());
  state.customMessageTemplates=existing?editCustomTemplate(state.customMessageTemplates,existing,data):
    createCustomTemplate(state.customMessageTemplates,data,"custom-"+Date.now()+"-"+(state.customMessageTemplates.length+1));
  document.getElementById("message-template-dialog").close();
  save();render();flash("Reusable fictional template saved with version history.");
 }catch(error){const el=document.getElementById("message-template-error");el.textContent=error.message;el.hidden=false;}
}
function approveDemoMessage(id){
 const d=state.drafts.find(x=>x.id===id);if(!d)return;
 try{
  state.drafts=approveMessageDraft(state.drafts,id,state.messagePreferences[d.clientId],messageClientContact(d.clientId));
  save();render();flash("Message approved for copy — not sent.");
 }catch(error){flash(error.message+" Review contact details and preferences first.");}
}
async function copyDemoMessage(id,link=false){
 const d=state.drafts.find(x=>x.id===id);if(!d)return;
 if(d.status!=="approved"||!canContact(state.messagePreferences[d.clientId],d.channel,messageClientContact(d.clientId))){
  flash("Approve this draft and confirm the contact preference before copying.");return;
 }
 try{
  const contact=messageClientContact(d.clientId);
  const text=link?whatsappDraftUrl(contact.phone,d.text):(d.channel==="email"?d.subject+"\n\n"+d.text:d.text);
  if(link&&d.channel!=="whatsapp")throw Error("WhatsApp link is available only for WhatsApp drafts.");
  await navigator.clipboard.writeText(text);
  flash(link?"Fictional WhatsApp link copied — NOT sent.":"Approved message copied — NOT sent.");
 }catch(error){flash("Clipboard unavailable or recipient details incomplete — nothing sent.");}
}
function reportExternalSend(id){
 const d=state.drafts.find(x=>x.id===id);if(!d)return;
 if(!confirm("Only mark this as sent if you sent the message outside TrainSmart. This DEMO does NOT send anything and cannot verify delivery. Continue?"))return;
 try{
  state.drafts=markExternalSend(state.drafts,id,state.messagePreferences[d.clientId],messageClientContact(d.clientId));
  save();render();flash("Coach-marked as sent externally (DEMO), not verified delivery.");
 }catch(error){flash(error.message);}
}
function queueSessionFollowup(session){
 const pref=state.messagePreferences[session.clientId];
 const client=clientById(session.clientId);
 if(!client||!pref||pref.serviceChannel==="none")return;
 const t=MESSAGE_TEMPLATES.find(t=>t.id==="session_complete");
 if(!t)return;
 try{
  state.drafts=makeMessageDraft({id:"followup-"+session.id,client,template:t,
   channel:pref.serviceChannel,sourceKey:"completed-session:"+session.id,existing:state.drafts}).drafts;
 }catch{}
}

function openExerciseEditor(id=""){
 const current=id?state.library.exercises.find(x=>x.id===id):null;
 if(id&&!current){flash("Example exercise not found.");return;}
 const form=document.getElementById("library-exercise-form");form.reset();
 document.getElementById("library-exercise-id").value=current?.id||"";
 document.getElementById("library-exercise-title").textContent=current?"Edit sample: "+current.name:"Add fictional exercise";
 document.getElementById("library-exercise-content").innerHTML=exerciseDialog(current);
 document.getElementById("library-exercise-error").hidden=true;
 document.getElementById("library-exercise-dialog").showModal();
 document.getElementById("lib-ex-name").focus();
}
function submitExerciseEditor(form){
 const fd=new FormData(form),id=String(fd.get("exerciseId")||"");
 const data={...Object.fromEntries(fd.entries()),
  primaryEquipment:fd.getAll("primaryEquipment").join(","),
  secondaryEquipment:fd.getAll("secondaryEquipment").join(",")};
 try{
  const all=state.library.exercises;
  state.library={...state.library,exercises:id?editExercise(all,id,data):
   createExercise(all,data,"custom:exercise-"+Date.now()+"-"+(all.length+1))};
  document.getElementById("library-exercise-dialog").close();
  save();render();flash("Fictional exercise saved. A new demo review is needed.");
 }catch(error){const el=document.getElementById("library-exercise-error");el.textContent=error.message;el.hidden=false;}
}
function reviewExercise(id){
 const item=state.library.exercises.find(x=>x.id===id);if(!item)return;
 state.library={...state.library,exercises:setExerciseReviewed(state.library.exercises,id,item.reviewStatus!=="demo-reviewed")};
 save();render();flash("Demo review recorded — NOT approved for real programmes.");
}
function toggleExercise(id){
 const item=state.library.exercises.find(x=>x.id===id);if(!item)return;
 state.library={...state.library,exercises:setExerciseActive(state.library.exercises,id,!item.active)};
 save();render();flash(item.active?"Example archived; historical sessions unchanged.":"Example restored; recheck review before use.");
}
function openMethodEditor(id=""){
 const current=id?state.library.methods.find(x=>x.id===id):null;
 if(id&&!current){flash("Example method unavailable.");return;}
 const form=document.getElementById("library-method-form");form.reset();
 document.getElementById("library-method-id").value=current?.id||"";
 document.getElementById("library-method-title").textContent=current?"Edit method: "+current.name:"Add fictional method";
 document.getElementById("library-method-content").innerHTML=methodDialog(current);
 document.getElementById("library-method-error").hidden=true;
 document.getElementById("library-method-dialog").showModal();
 document.getElementById("lib-method-name").focus();
}
function submitMethodEditor(form){
 const fd=new FormData(form),id=String(fd.get("methodId")||"");
 try{
  const data=Object.fromEntries(fd.entries()),methods=state.library.methods;
  state.library={...state.library,methods:id?editMethod(methods,id,data):
   createMethod(methods,data,"custom:method-"+Date.now()+"-"+(methods.length+1))};
  document.getElementById("library-method-dialog").close();
  save();render();flash("Fictional method version saved; review is now required.");
 }catch(error){const el=document.getElementById("library-method-error");el.textContent=error.message;el.hidden=false;}
}
function reviewMethod(id){
 const old=state.library.methods.find(x=>x.id===id);if(!old)return;
 state.library={...state.library,methods:setMethodReviewed(state.library.methods,id,old.reviewStatus!=="demo-reviewed")};
 save();render();flash("Method review state updated for the demonstration only.");
}
function saveClientLibraryEquipment(form){
 const id=form.dataset.clientId,client=clientById(id);
 if(!client)return;
 try{
  const selected=new FormData(form).getAll("equipmentId").map(String);
  state.library=setClientEquipment(state.library,id,selected);
  save();render();flash("Fictional client equipment list saved; prior session results unchanged.");
 }catch(error){flash(error.message);}
}
function setGymPreset(id){
 if(!clientById(id))return;
 state.library=setClientEquipment(state.library,id,GYM_PRESET);
 state.libraryClientId=id;
 save();render();flash("TrainSmart Gym equipment preset applied to fictional client.");
}

function programmeNextId(prefix){
 return prefix+":"+Date.now().toString(36)+"-"+Math.max(1,
  state.programmeTemplates.length+state.programmeAssignments.length+1).toString(36);
}
function updateProgrammeBasicsFromScreen(){
 const name=document.getElementById("programme-draft-name");
 if(!name)return;
 let next=updateProgrammeBasics(state.programmeDraft,{
  name:name.value,goal:document.getElementById("programme-draft-goal").value,
  notes:document.getElementById("programme-draft-notes").value});
 for(const el of document.querySelectorAll("[data-session-name]")){
  next=renameProgrammeSession(next,el.dataset.sessionName,el.value);
 }
 for(const form of document.querySelectorAll(".programme-exercise-form")){
  next=editProgrammeExercise(next,form.dataset.sid,form.dataset.rowId,
   Object.fromEntries(new FormData(form).entries()));
 }
 state.programmeDraft=next;
 save();
}
function newManualProgramme(){
 if(state.programmeDraft.sessions.some(s=>s.exercises.length)&&
  !confirm("Start a fresh fictional manual draft? Any unsaved changes will be replaced."))return;
 state.programmeDraft=newProgramme(programmeNextId("draft"),"New training plan");
 state.programmeTemplateId="";
 state.programmeTab="build";
 save();render();flash("New manual training draft ready — give it a name.");
}

function aiBriefChanged(){
 state.aiPrompt="";
 state.aiReply="";
 const briefBox=document.getElementById("ai-request-box");
 const answerBox=document.getElementById("ai-response-box");
 if(briefBox)briefBox.value="";
 if(answerBox)answerBox.value="";
 const copy=document.querySelector('[data-action="ai-copy-brief"]');
 const apply=document.querySelector('[data-action="ai-apply-reply"]');
 if(copy)copy.disabled=true;
 if(apply)apply.disabled=true;
 save();
}
function updateAIField(target){
 const key=target.dataset.aiField;
 if(!["name","goal","ageBand","experience","sessionsPerWeek","sessionMinutes","preferences","coachingNotes"].includes(key))return;
 const value=["sessionsPerWeek","sessionMinutes"].includes(key)?Number(target.value):target.value;
 state.aiBrief={...state.aiBrief,[key]:value};
 aiBriefChanged();
}
function setAIEquipment(target){
 const id=target.dataset.aiEquipment;
 if(!EQUIPMENT.some(e=>e.id===id))return;
 const chosen=new Set(state.aiBrief.equipment);
 if(target.checked)chosen.add(id);else chosen.delete(id);
 state.aiBrief={...state.aiBrief,equipment:[...chosen]};
 aiBriefChanged();
}
function chooseAIClient(id){
 if(!id){
  state.aiClientId="";
  state.aiBrief=emptyAIBrief();
 }else{
  const client=clientById(id);
  if(!client||client.status==="Archived")return;
  try{state.aiBrief=aiBriefFromClient(client,state.library);}
  catch(error){flash(error.message);return;}
  state.aiClientId=id;
 }
 state.aiPrompt="";state.aiReply="";save();render();
 flash(id?"Fictional training details filled. No name, contact or private note will be copied.":"Manual fictional brief ready.");
}
function generateAIBrief(){
 try{
  state.aiPrompt=createAIRequest(state.aiBrief,state.library);
  state.aiReply="";save();render();
  flash("Anonymous fictional brief generated. Copy it into ChatGPT — nothing has been sent automatically.");
 }catch(error){flash(error.message);}
}
async function copyAIBrief(){
 if(!state.aiPrompt){flash("Generate the brief first.");return;}
 try{
  await navigator.clipboard.writeText(state.aiPrompt);
  flash("Coaching brief copied. Paste it into ChatGPT and ask for JSON.");
 }catch{
  const box=document.getElementById("ai-request-box");
  box?.focus();box?.select();
  flash("Clipboard permission unavailable. The brief is selected so you can copy it manually.");
 }
}
function loadAIReplyExample(){
 try{
  if(!state.aiPrompt)throw Error("Generate the brief first.");
  state.aiReply=aiExampleResponse(state.aiBrief,state.library);
  document.getElementById("ai-response-box").value=state.aiReply;
  save();flash("Fictional example response loaded. Select Apply to test the flow.");
 }catch(error){flash(error.message);}
}
function applyAIReply(){
 try{
  if(!state.aiPrompt)throw Error("Generate the brief before applying an answer.");
  const raw=String(document.getElementById("ai-response-box")?.value||"");
  const draft=parseAIResponse(raw,programmeNextId("draft"),state.library,state.aiBrief);
  state.aiReply=raw.slice(0,30000);
  state.programmeDraft=draft;
  state.programmeTemplateId="";
  state.programmeTab="build";
  save();render();
  flash("AI programme applied as editable draft. Review it, then save the named plan.");
 }catch(error){flash(error.message);}
}
function openAIProgrammeDialog(){
 const dialog=document.getElementById("programme-ai-dialog");
 document.getElementById("programme-ai-form").reset();
 document.getElementById("programme-ai-content").innerHTML=aiImportDialog();
 document.getElementById("programme-ai-error").hidden=true;
 dialog.showModal();
 document.getElementById("programme-ai-json").focus();
}
function submitAIProgramme(form){
 try{
  const draft=importAIProgramme(String(new FormData(form).get("json")||""),
   programmeNextId("draft"),state.library);
  state.programmeDraft=draft;
  state.programmeTemplateId="";
  state.programmeTab="build";
  document.getElementById("programme-ai-dialog").close();
  save();render();flash("AI JSON imported as editable demo draft — nothing assigned or sent.");
 }catch(error){const el=document.getElementById("programme-ai-error");el.hidden=false;el.textContent=error.message;}
}
function saveProgrammeNew(){
 try{
  updateProgrammeBasicsFromScreen();
  const id=programmeNextId("template");
  state.programmeTemplates=saveNewTemplate(state.programmeTemplates,state.programmeDraft,state.library,id);
  state.programmeTemplateId=id;
  state.programmeTab="saved";
  save();render();flash("Named programme saved to fictional library. Reuse it for other clients.");
 }catch(error){flash(error.message);}
}
function saveProgrammeRevision(templateId){
 try{
  updateProgrammeBasicsFromScreen();
  state.programmeTemplates=saveTemplateVersion(state.programmeTemplates,templateId,state.programmeDraft,state.library);
  state.programmeTemplateId=templateId;
  state.programmeTab="saved";
  save();render();flash("New named programme version saved. Existing client copies unchanged.");
 }catch(error){flash(error.message);}
}
function useSavedProgramme(id){
 const template=state.programmeTemplates.find(t=>t.id===id);if(!template)return;
 if(state.programmeTab==="build"&&state.programmeDraft.sessions.some(s=>s.exercises.length)&&
  !confirm("Load this saved plan into the editor? Unsaved draft edits will be replaced."))return;
 state.programmeDraft=loadTemplateIntoDraft(template,programmeNextId("draft"));
 state.programmeTemplateId=id;
 state.programmeTab="build";
 changeView("programmes");
 flash("Saved programme loaded. Any edits are a separate draft until saved.");
}
function openProgrammeAssignment(id){
 const template=state.programmeTemplates.find(t=>t.id===id);if(!template)return;
 document.getElementById("programme-assignment-template").value=id;
 document.getElementById("programme-assignment-title").textContent="Assign: "+template.name;
 document.getElementById("programme-assignment-content").innerHTML=assignmentDialog(template,clients,state.library);
 document.getElementById("programme-assignment-error").hidden=true;
 document.getElementById("programme-assignment-dialog").showModal();
}
function submitProgrammeAssignment(form){
 const fd=new FormData(form),template=state.programmeTemplates.find(t=>t.id===fd.get("templateId"));
 const client=clientById(String(fd.get("clientId")||""));
 try{
  if(!template||!client||client.status==="Archived")throw Error("Choose a saved plan and an eligible fictional client.");
  state.programmeAssignments=assignTemplateToClient(state.programmeAssignments,template,client,state.library,
   programmeNextId("assignment"));
  state.programmeClientId=client.id;
  state.programmeTab="preview";
  noteClientEvent(client.id,"Assigned a separate demonstration programme snapshot: "+template.name);
  document.getElementById("programme-assignment-dialog").close();
  save();render();flash("Independent demo client copy saved — real programme delivery is disabled.");
 }catch(error){const el=document.getElementById("programme-assignment-error");el.hidden=false;el.textContent=error.message;}
}
function handleProgrammeAction(action,btn){
 const sid=btn.dataset.sid,id=btn.dataset.id;
 try{
  if(action==="programme-add-session"){
   updateProgrammeBasicsFromScreen();
   state.programmeDraft=addProgrammeSession(state.programmeDraft);
  }else if(action==="programme-remove-session"){
   updateProgrammeBasicsFromScreen();
   state.programmeDraft=removeProgrammeSession(state.programmeDraft,sid);
  }else if(action==="programme-add-exercise"){
   updateProgrammeBasicsFromScreen();
   const exId=document.getElementById("programme-exercise-select-"+sid)?.value;
   state.programmeDraft=insertProgrammeExercise(state.programmeDraft,sid,exId,state.library);
  }else if(action==="programme-remove-exercise"){
   updateProgrammeBasicsFromScreen();
   state.programmeDraft=removeProgrammeExercise(state.programmeDraft,sid,btn.dataset.rowId);
  }else return false;
  save();render();flash("Programme draft updated. Remember to save it to your library.");
 }catch(error){flash(error.message);}
 return true;
}
function submitProgrammeExercise(form){
 try{
  state.programmeDraft=editProgrammeExercise(state.programmeDraft,form.dataset.sid,
   form.dataset.rowId,Object.fromEntries(new FormData(form).entries()));
  save();render();flash("Exercise sets, reps and notes saved to draft — no RIR needed.");
 }catch(error){flash(error.message);}
}
function openClientProgrammeView(clientId){
 const client=clientById(clientId);if(!client)return;
 state.programmeClientId=client.id;state.programmeTab="preview";
 changeView("programmes");
}
function renderLegacyMessages(){
 const drafts=state.drafts;
 return '<div class="main-grid"><section class="panel"><div class="panel-header"><h3>Message drafts</h3><span class="tag muted">NOT SENT</span></div>'+
 (drafts.length?drafts.map(d=>'<article class="message-card"><h3>'+escapeHtml(d.title)+'</h3><p class="small-muted">Fictional client · '+escapeHtml(d.clientName||"General")+'</p><pre>'+escapeHtml(d.text)+'</pre><button class="btn btn-ghost btn-sm" data-action="copy-draft" data-id="'+escapeHtml(d.id)+'">Copy draft</button></article>').join(""):'<div class="empty"><h3>No message drafts yet</h3><p>Open a client task and choose “Prepare message” to create an editable draft in this session.</p></div>')+
 '</section><section class="panel"><div class="panel-header"><h3>How messaging will work</h3></div><p class="dialog-copy">The final Coach Hub will prepare personalised WhatsApp and email messages. You will approve messages before they are sent. This prototype only creates and copies text; it never contacts a messaging service.</p><div class="divider-line"></div><button class="btn btn-primary" data-view="tasks">Find a task to message about</button></section></div>';
}
function render(){
 renderChrome();
 const html=state.view==="clients"?renderClients():state.view==="onboarding"?
 renderOnboarding({clients,records:state.onboardingRecords,selectedId:state.selectedOnboarding,events:state.clientEvents,enrolments:state.enrolments}):
 state.view==="setup"?renderSetupWizard(clientById(state.setupClientId),state.enrolments[state.setupClientId],state.setupStep):
 state.view==="fresh"?renderFreshDashboard(clients,state.enrolments):
 state.view==="sessions"?renderCoachSessions({clients,sessions:state.coachSessions,safeguards:state.coachSafety,
   preferences:state.coachRecordingMode,selectedClientId:state.sessionClientId}):
 state.view==="library"?renderLibraryCentre({library:state.library,clients,tab:state.libraryTab,
 q:state.libraryQuery,movement:state.libraryMovement,equipment:state.libraryEquipment,
 status:state.libraryStatus,selectedClientId:state.libraryClientId,onlyClientFit:state.libraryOnlyClientFit}):
 state.view==="programmes"?renderProgrammesCentre({draft:state.programmeDraft,templates:state.programmeTemplates,
 assignments:state.programmeAssignments,library:state.library,clients,tab:state.programmeTab,
 selectedClientId:state.programmeClientId,selectedTemplateId:state.programmeTemplateId,
 aiBrief:state.aiBrief,aiPrompt:state.aiPrompt,aiReply:state.aiReply,aiClientId:state.aiClientId}):
 state.view==="nutrition"?renderNutritionHub({clients,enrolments:state.enrolments}):
 state.view==="tasks"?renderTasks():state.view==="messages"?renderMessageCentre({
 clients,drafts:state.drafts,preferences:state.messagePreferences,enrolments:state.enrolments,
 customTemplates:state.customMessageTemplates,selectedClientId:state.messageClientFilter,
 filter:state.messageStatusFilter}):renderToday();
 document.getElementById("view-content").innerHTML=html;
 save();
}
let toastTimer;
function flash(message){
 const toast=document.getElementById("toast");toast.textContent=message;toast.hidden=false;
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},3200);
}
function updateTask(id,status){
 const task=state.tasks.find(t=>t.id===id);if(!task)return;
 if(["fresh","onboarding"].includes(task.kind)){flash("Advance this from the linked enrolment checklist instead.");return;}
 if(status==="snoozed"){task.due=addDays(currentDay(),1);task.status="snoozed";}
 else task.status=status;
 task.lastChanged=new Date().toISOString();
 save();render();
 const dialog=document.getElementById("task-dialog");if(dialog.open)dialog.close();
 flash({completed:"Task completed — here’s your next priority.",snoozed:"Snoozed until tomorrow.",waiting:"Marked waiting on client.",open:"Task returned to your list."}[status]);
}
function prepareDraft(task){
 const client=clientById(task.clientId);
 if(!client)return;
 const byKind={review:"checkin_reviewed",payment:"payment_followup",programme:"programme_ready",followup:"personal",personal:"personal"};
 const template=MESSAGE_TEMPLATES.find(t=>t.id===(byKind[task.kind]||"personal"));
 const result=makeMessageDraft({id:"draft-"+task.id,client,template,channel:template.channel,sourceKey:"task:"+task.id,existing:state.drafts});
 state.drafts=result.drafts;
 const dialog=document.getElementById("task-dialog");if(dialog.open)dialog.close();
 state.messageClientFilter=client.id;
 state.messageStatusFilter="all";
 changeView("messages");
 flash(result.created?"Draft prepared for review — nothing sent.":"Existing draft opened — nothing sent.");
}
function openTask(id){
 const t=state.tasks.find(t=>t.id===id);if(!t)return;
 document.getElementById("task-dialog-title").textContent=t.title;
 const c=clientById(t.clientId);
 const current=t.status==="snoozed"&&t.due<=currentDay()?"open":t.status;
 let actions=t.kind==="fresh"?'<button class="btn btn-primary" data-action="fresh-task" data-client-id="'+escapeHtml(t.clientId)+'">Open enrolment requirement</button>':t.kind==="onboarding"?'<button class="btn btn-primary" data-action="onboarding-task" data-client-id="'+escapeHtml(t.clientId)+'">Continue onboarding</button>':'<button class="btn btn-primary" data-action="complete" data-id="'+escapeHtml(t.id)+'">✓ Mark complete</button>';
 if(!["fresh","onboarding"].includes(t.kind)&&current==="open")actions+='<button class="btn btn-ghost" data-action="snooze" data-id="'+escapeHtml(t.id)+'">Snooze one day</button><button class="btn btn-ghost" data-action="waiting" data-id="'+escapeHtml(t.id)+'">Waiting on client</button>';
 else if(!["fresh","onboarding"].includes(t.kind))actions+='<button class="btn btn-ghost" data-action="reopen" data-id="'+escapeHtml(t.id)+'">Return to to-do</button>';
 if(c&&!["fresh","onboarding"].includes(t.kind))actions+='<button class="btn btn-outline" data-action="draft" data-id="'+escapeHtml(t.id)+'">Prepare message</button>';
 
 document.getElementById("task-detail-content").innerHTML=
 '<p class="dialog-copy">'+escapeHtml(t.note||taskActionText(t))+'</p><div class="dialog-meta">'+priorityTag(t)+dueTag(t)+'<span class="tag muted">'+escapeHtml(String(t.estimate||5))+' minute task</span></div>'+
 '<div class="dialog-action"><p class="eyebrow">FICTIONAL COACHING CONTEXT</p><p>'+escapeHtml(taskActionText(t))+'</p></div>'+
 (c?'<p class="dialog-copy">Client: <strong>'+escapeHtml(c.name)+'</strong> · '+escapeHtml(c.goal)+'</p>':'')+
 '<div class="dialog-actions">'+actions+'</div>'+
 '<p class="footer-bits">All actions change fictional demo state only. No real records or messages are affected.</p>';
 document.getElementById("task-dialog").showModal();
}
function changeView(view){
 if(!COACH_VIEWS.includes(view))return;
 state.view=view;if(view!=="clients")state.selectedClient=null;
 if(window.location.hash!=="#"+view)window.history.replaceState(window.history.state,"","#"+view);
 render();document.getElementById("main-content").focus({preventScroll:true});window.scrollTo({top:0,behavior:"auto"});
}
function newTask(clientId=""){
 document.getElementById("new-task-form").reset();
 document.getElementById("task-client").value=clientId;
 document.getElementById("new-task-dialog").showModal();
 document.getElementById("task-title").focus();
}
function submitNewTask(form){
 const data=new FormData(form);const title=String(data.get("title")||"").trim();
 if(title.length<3){flash("Please enter a specific task.");return;}
 const priority=String(data.get("priority"));
 const when=String(data.get("when"));const clientId=String(data.get("clientId")||"");
 if(!["high","normal","low"].includes(priority)||!["today","tomorrow","week"].includes(when))return;
 if(clientId&&!clientById(clientId))return;
 const note=String(data.get("note")||"").trim();
 state.tasks.push({id:"manual-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),title:title.slice(0,90),clientId,kind:"personal",due:addDays(currentDay(),when==="today"?0:when==="tomorrow"?1:3),priority,estimate:5,note:note.slice(0,280),status:"open",created:state.tasks.length+1});
 document.getElementById("new-task-dialog").close();save();render();flash("Your task is saved in this preview session.");
}
if (typeof document !== "undefined") {
window.addEventListener("hashchange",()=>{const requested=window.location.hash.slice(1);if(COACH_VIEWS.includes(requested)&&requested!==state.view)changeView(requested);});
document.addEventListener("click",async ev=>{
 const btn=ev.target.closest("button");if(!btn)return;
 if(btn.dataset.closeDialog){document.getElementById(btn.dataset.closeDialog)?.close();return;}
 if(btn.dataset.view){changeView(btn.dataset.view);return;}
 if(btn.dataset.nutAction){await handleNutritionClick(btn,{clients,enrolments:state.enrolments},render,flash);return;}
 if(btn.dataset.filter){state.filter=btn.dataset.filter;render();return;}
 if(btn.dataset.clientFilter){state.clientFilter=btn.dataset.clientFilter;state.selectedClient=null;render();return;}
 if(btn.dataset.clientTab){state.clientTab=btn.dataset.clientTab;render();return;}
 if(btn.dataset.onboardingClient){state.selectedOnboarding=btn.dataset.onboardingClient;render();return;}
 if(btn.dataset.sessionClient){openCoachSessionForClient(btn.dataset.sessionClient);return;}
 if(btn.dataset.messageFilter){state.messageStatusFilter=btn.dataset.messageFilter;render();return;}
 if(btn.dataset.libraryTab){state.libraryTab=btn.dataset.libraryTab;save();render();return;}
 if(btn.dataset.programmeTab){state.programmeTab=btn.dataset.programmeTab;save();render();return;}
 const action=btn.dataset.action,id=btn.dataset.id;
 if(action==="new-task"){newTask();return;}
 if(action==="new-client"){openClientEditor();return;}
 if(action==="programme-new"){newManualProgramme();return;}
 if(action==="programme-open-ai"){state.programmeTab="ai";save();render();return;}
 if(action==="ai-load-sample"){state.aiClientId="";state.aiBrief=emptyAIBrief();state.aiPrompt="";state.aiReply="";save();render();flash("Fictional example details loaded.");return;}
 if(action==="ai-generate-brief"){generateAIBrief();return;}
 if(action==="ai-copy-brief"){await copyAIBrief();return;}
 if(action==="ai-example-reply"){loadAIReplyExample();return;}
 if(action==="ai-apply-reply"){applyAIReply();return;}
 if(action==="programme-import"){openAIProgrammeDialog();return;}
 if(action==="programme-save-new"){saveProgrammeNew();return;}
 if(action==="programme-save-version"){saveProgrammeRevision(btn.dataset.templateId);return;}
 if(action==="programme-use-template"||action==="programme-preview-template"){useSavedProgramme(btn.dataset.templateId);return;}
 if(action==="programme-assign"){openProgrammeAssignment(btn.dataset.templateId);return;}
 if(action==="programme-open-for-client"){state.programmeClientId=btn.dataset.clientId;state.programmeTab="build";changeView("programmes");return;}
 if(action==="programme-client-preview"){openClientProgrammeView(btn.dataset.clientId);return;}
 if(action==="programme-add-session"||action==="programme-remove-session"||
 action==="programme-add-exercise"||action==="programme-remove-exercise"){
  handleProgrammeAction(action,btn);return;
 }
 if(action==="library-add-exercise"){openExerciseEditor();return;}
 if(action==="library-edit-exercise"){openExerciseEditor(id);return;}
 if(action==="library-review-exercise"){reviewExercise(id);return;}
 if(action==="library-toggle-exercise"){toggleExercise(id);return;}
 if(action==="library-add-method"){openMethodEditor();return;}
 if(action==="library-edit-method"){openMethodEditor(id);return;}
 if(action==="library-review-method"){reviewMethod(id);return;}
 if(action==="library-gym-preset"){setGymPreset(btn.dataset.clientId);return;}
 if(action==="message-new"){openMessageComposer(state.messageClientFilter);return;}
 if(action==="message-from-template"){openMessageComposer(state.messageClientFilter,btn.dataset.templateId);return;}
 if(action==="message-edit"){openMessageComposer("","",id);return;}
 if(action==="message-template"){openMessageTemplate();return;}
 if(action==="message-edit-template"){openMessageTemplate(btn.dataset.templateId);return;}
 if(action==="message-preference"){openMessagePreference(btn.dataset.clientId);return;}
 if(action==="message-approve"){approveDemoMessage(id);return;}
 if(action==="message-copy"){await copyDemoMessage(id,false);return;}
 if(action==="message-copy-wa"){await copyDemoMessage(id,true);return;}
 if(action==="message-mark-sent"){reportExternalSend(id);return;}
 if(action==="run-session"){openCoachSessionForClient(btn.dataset.clientId);return;}
 if(action==="session-profile"){state.selectedClient=btn.dataset.clientId;state.clientTab="sessions";changeView("clients");return;}
 if(action==="session-mode"){updateCoachMode(btn.dataset.clientId,btn.dataset.mode);return;}
 if(action==="session-safety"){confirmFictionalSafety(btn.dataset.clientId,btn.dataset.check);return;}
 if(action==="session-start"){beginCoachSession(btn.dataset.clientId);return;}
 if(action==="session-unskip"){undoCoachSkip(btn.dataset.sessionId,btn.dataset.exerciseId);return;}
 if(action==="session-finish"){completeCoachSession(btn.dataset.sessionId);return;}
 if(action==="wizard-go"){gotoWizardStep(btn.dataset.clientId,btn.dataset.step);return;}
 if(action==="wizard-next"){advanceWizard(btn.dataset.clientId);return;}
 if(action==="wizard-previous"){
   const i=SETUP_STEPS.findIndex(s=>s.id===state.setupStep);
   if(i>0)gotoWizardStep(btn.dataset.clientId,SETUP_STEPS[i-1].id);
   return;
 }
 if(action==="wizard-preview-invite"){gotoWizardStep(btn.dataset.clientId,"invite");return;}
 if(action==="wizard-close"){
   state.selectedClient=btn.dataset.clientId;
   state.clientTab="enrolment";
   changeView("clients");
   return;
 }
 if(action==="wizard-confirm-documents"){
   const id=btn.dataset.clientId;
   const rec=state.enrolments[id];if(!rec)return;
   try{
    state.enrolments[id]=confirmAssignedDocumentPack(rec);
    syncDemoEnrollment(id);
    if(!autoAdvanceWizard(id,"documents"))flash("Sample paperwork pack recorded.");
   }catch(error){flash(error.message);}
   return;
 }
 if(action==="wizard-copy-email"){
   const c=clientById(btn.dataset.clientId),r=state.enrolments[btn.dataset.clientId];
   if(!c||!r)return;
   try{await navigator.clipboard.writeText(sampleInvite(c,r).body);flash("Sample email copied — nothing has been sent.");}
   catch{flash("Clipboard unavailable. You can select and copy the example text.");}
   return;
 }
 if(action==="fresh-task"){document.getElementById("task-dialog").close();openWizard(btn.dataset.clientId);return;}
 if(action==="fresh-open"){openWizard(btn.dataset.clientId);return;}
 if(action==="fresh-start"){startFreshForClient(btn.dataset.clientId);return;}
 if(action==="fresh-edit-contact"){openFreshContact(btn.dataset.clientId);return;}
 if(action==="fresh-edit-baseline"){openFreshBaseline(btn.dataset.clientId);return;}
 if(action==="fresh-verify-contact"){verifyFresh(btn.dataset.clientId,"contact");return;}
 if(action==="fresh-verify-emergency"){verifyFresh(btn.dataset.clientId,"emergency");return;}
 if(action==="fresh-verify-baseline"){verifyFresh(btn.dataset.clientId,"baseline");return;}
 if(action==="fresh-document"){openFreshDocument(btn.dataset.clientId,btn.dataset.docId);return;}
 if(action==="open-onboarding"){openOnboarding(btn.dataset.clientId);return;}
 if(action==="onboarding-start-selected"){const select=document.getElementById("onboarding-add-client");if(select?.value)startOnboarding(select.value);else flash("Choose a fictional client first.");return;}
 if(action==="onboarding-edit"){openIntakeEditor(btn.dataset.clientId);return;}
 if(action==="onboarding-next"){advanceOnboarding(btn.dataset.clientId);return;}
 if(action==="onboarding-open-profile"){state.selectedClient=btn.dataset.clientId;state.clientTab="overview";changeView("clients");return;}
 if(action==="onboarding-task"){document.getElementById("task-dialog").close();openOnboarding(btn.dataset.clientId);return;}
 if(action==="edit-client"){openClientEditor(btn.dataset.clientId);return;}
 if(action==="archive-client"){setClientStatus(btn.dataset.clientId,"Archived");return;}
 if(action==="restore-client"){setClientStatus(btn.dataset.clientId,"Onboarding");return;}
 if(action==="client-task"){newTask(btn.dataset.clientId||"");return;}
 if(action==="client"){state.selectedClient=btn.dataset.clientId;state.clientTab="enrolment";changeView("clients");return;}
 if(action==="back-clients"){state.selectedClient=null;state.clientTab="overview";render();return;}
 if(action==="task"){openTask(id);return;}
 if(action==="complete"){updateTask(id,"completed");return;}
 if(action==="snooze"){updateTask(id,"snoozed");return;}
 if(action==="waiting"){updateTask(id,"waiting");return;}
 if(action==="reopen"){updateTask(id,"open");return;}
 if(action==="draft"){const t=state.tasks.find(x=>x.id===id);if(t)prepareDraft(t);return;}
 if(action==="copy-draft"){
   const d=state.drafts.find(x=>x.id===id);if(!d)return;
   try{await navigator.clipboard.writeText(d.text);flash("Fictional message copied. Nothing sent.");}
   catch{flash("Clipboard unavailable — select and copy the draft text.");}
 }
});
document.getElementById("new-task-form").addEventListener("submit",ev=>{ev.preventDefault();submitNewTask(ev.currentTarget);});
document.getElementById("client-form").addEventListener("submit",ev=>{ev.preventDefault();submitClientEditor(ev.currentTarget);});
document.getElementById("onboarding-intake-form").addEventListener("submit",ev=>{ev.preventDefault();submitIntakeEditor(ev.currentTarget);});
document.getElementById("fresh-contact-form").addEventListener("submit",ev=>{ev.preventDefault();submitFreshContacts(ev.currentTarget);});
document.getElementById("fresh-baseline-form").addEventListener("submit",ev=>{ev.preventDefault();submitFreshBaseline(ev.currentTarget);});
document.getElementById("fresh-document-form").addEventListener("submit",ev=>{ev.preventDefault();submitFreshDocument(ev.currentTarget);});
document.getElementById("message-compose-form").addEventListener("submit",ev=>{ev.preventDefault();submitMessageComposer(ev.currentTarget);});
document.getElementById("message-preference-form").addEventListener("submit",ev=>{ev.preventDefault();submitMessagePreference(ev.currentTarget);});
document.getElementById("message-template-form").addEventListener("submit",ev=>{ev.preventDefault();submitMessageTemplate(ev.currentTarget);});
document.getElementById("library-exercise-form").addEventListener("submit",ev=>{ev.preventDefault();submitExerciseEditor(ev.currentTarget);});
document.getElementById("library-method-form").addEventListener("submit",ev=>{ev.preventDefault();submitMethodEditor(ev.currentTarget);});
document.getElementById("programme-ai-form").addEventListener("submit",ev=>{ev.preventDefault();submitAIProgramme(ev.currentTarget);});
document.getElementById("programme-assignment-form").addEventListener("submit",ev=>{ev.preventDefault();submitProgrammeAssignment(ev.currentTarget);});
document.addEventListener("submit",ev=>{
 const form=ev.target;
 if(form.matches?.(".coach-set-form")){ev.preventDefault();submitCoachSet(form);return;}
 if(form.matches?.(".coach-skip-form")){ev.preventDefault();submitCoachSkip(form);return;}
 if(form.id==="library-client-equipment-form"){ev.preventDefault();saveClientLibraryEquipment(form);return;}
 if(form.matches?.(".programme-exercise-form")){ev.preventDefault();submitProgrammeExercise(form);return;}
});
document.addEventListener("change",ev=>{
 const target=ev.target;
 if(target?.dataset?.nutField){handleNutritionChange(target,{clients,enrolments:state.enrolments},render);return;}
 if(target?.id==="ai-client-select"){chooseAIClient(target.value);return;}
 if(target?.dataset?.aiEquipment){setAIEquipment(target);return;}
 if(target?.dataset?.aiField){updateAIField(target);return;}
 if(target?.id==="programme-client-preview-select"){
  state.programmeClientId=target.value;save();render();return;
 }
 if(target?.dataset?.sessionName){
  try{state.programmeDraft=renameProgrammeSession(state.programmeDraft,target.dataset.sessionName,target.value);save();}
  catch(error){flash(error.message);}return;
 }
 if(target?.id==="library-fit-only"){
  state.libraryOnlyClientFit=target.checked;save();render();return;
 }
 if(target?.id==="library-client"||target?.id==="library-equipment-client"){
  state.libraryClientId=target.value;save();render();return;
 }
 if(target?.id==="library-movement"||target?.id==="library-equipment"||target?.id==="library-status"||target?.id==="library-search"){
  const field={"library-movement":"libraryMovement","library-equipment":"libraryEquipment",
   "library-status":"libraryStatus","library-search":"libraryQuery"}[target.id];
  state[field]=target.value;save();render();return;
 }
 if(target?.id==="message-client-filter"){
  state.messageClientFilter=target.value;save();render();return;
 }
 if(target?.id==="message-compose-template"||target?.id==="message-compose-client"){
  fillComposerTemplate();return;
 }
 if(!target?.dataset?.onboardingCheck)return;
 const id=target.dataset.clientId,rec=state.onboardingRecords[id];
 if(!rec)return;
 try{
  state.onboardingRecords[id]=toggleChecklist(rec,target.dataset.onboardingCheck,target.checked);
  save();render();
 }catch(error){flash(error.message);render();}
});
document.getElementById("add-task").addEventListener("click",()=>state.view==="nutrition"?changeView("nutrition"):state.view==="programmes"?newManualProgramme():["clients","onboarding","fresh","setup"].includes(state.view)?openClientEditor():newTask());
document.getElementById("reset-preview").addEventListener("click",()=>{
 if(!confirm("Reset fictional tasks and message drafts? This does not affect any real client data."))return;
 try{sessionStorage.removeItem(STORE);}catch{}resetNutritionDemo();state=initial();clients=state.clients;render();flash("Fictional preview reset.");
});
document.addEventListener("input",ev=>{
 if(ev.target?.dataset?.nutField||ev.target?.dataset?.nutMealField||ev.target?.dataset?.nutRowQty){handleNutritionInput(ev.target,{clients,enrolments:state.enrolments});return;}
 if(ev.target?.id==="ai-response-box"){
  state.aiReply=String(ev.target.value||"").slice(0,30000);save();return;
 }
 if(ev.target?.dataset?.aiField){
  updateAIField(ev.target);return;
 }
 if(["programme-draft-name","programme-draft-goal","programme-draft-notes"].includes(ev.target?.id)){
  const fields={"programme-draft-name":"name","programme-draft-goal":"goal","programme-draft-notes":"notes"};
  const k=fields[ev.target.id];
  state.programmeDraft={...state.programmeDraft,[k]:ev.target.value};save();return;
 }
 if(ev.target?.id==="library-search"){
  state.libraryQuery=String(ev.target.value||"").slice(0,85);save();return;
 }
 if(ev.target?.id!=="client-search")return;
 const q=String(ev.target.value).toLowerCase().trim();
 state.clientSearch=q;save();
 let visible=0;
 document.querySelectorAll("[data-client-search]").forEach(row=>{
  row.hidden=!!q&&!row.dataset.clientSearch.includes(q);
  if(!row.hidden)visible++;
 });
 const label=document.getElementById("client-match-count");
 if(label)label.textContent=visible+" matching";
});
render();
}

// Pure helpers exported solely for isolated Node fixture testing.
export {clients,firstTasks,sortedTasks,actionable,dueLabel,escapeHtml,clientById,priorityWeight,currentDay,addDays};
