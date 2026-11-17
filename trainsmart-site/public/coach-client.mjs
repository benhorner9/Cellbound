/* D08 isolated client-facing preview. Fictional records only; no login or shared backend. */
import {COACH_STORE,NUTRITION_STORE,currentAssignment,currentMealAssignment,sessionHistory,
 nextSession,storedSession,saveClientSession,lastWeight,dailyMealSelections,logMealSelection,clearMealSelection} from "./coach-client-model.mjs";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const read=key=>{try{return JSON.parse(sessionStorage.getItem(key)||"null");}catch{return null;}};
const save=state=>{sessionStorage.setItem(COACH_STORE,JSON.stringify(state));};
const day=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const date=x=>x?new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"}).format(new Date(x)):"";
const query=new URLSearchParams(location.search);
let clientId=query.get("client")||"",tab=["training","meals"].includes(location.hash.slice(1))?location.hash.slice(1):"training";
const root=document.querySelector("#client-root");
const tabs=[["training","Training plan","▤"],["meals","Nutrition plan","◫"]];
let notice="";
function setTab(next){if(!tabs.some(t=>t[0]===next))return;tab=next;history.replaceState(null,"","#"+tab);notice="";render();window.scrollTo(0,0);}
function notify(msg,isError=false){notice={msg,isError};const el=document.querySelector("#portal-notice");if(el){el.textContent=msg;el.hidden=false;el.className=isError?"portal-alert error":"portal-alert";}}
function pill(s){return '<span class="portal-pill">'+esc(s)+'</span>';}
function empty(title,description){return '<section class="portal-card portal-empty"><h2>'+esc(title)+'</h2><p>'+esc(description)+'</p></section>';}
function stateForClient(){const state=read(COACH_STORE);if(!state||!Array.isArray(state.clients))return {state:null,client:null};const eligible=state.clients.filter(c=>c.status!=="Archived");const selected=eligible.find(c=>c.id===clientId)||eligible[0];if(selected)clientId=selected.id;return {state,client:selected};}
function nav(){return '<nav class="portal-nav" aria-label="Client preview sections">'+tabs.map(([id,label,symbol])=>'<button type="button" data-tab="'+id+'" class="'+(tab===id?"active":"")+'" '+(tab===id?'aria-current="page"':"")+'><span aria-hidden="true">'+symbol+'</span><span>'+label+'</span></button>').join("")+'</nav>';}
function options(list,selected){return list.map(c=>'<option value="'+esc(c.id)+'"'+(c.id===selected?" selected":"")+'>'+esc(c.name)+'</option>').join("");}
function frame(state,client,content){
 const eligible=state.clients.filter(c=>c.status!=="Archived");
 root.innerHTML='<div class="portal-shell"><header class="portal-header"><a class="portal-brand" href="./coach-hub.html#clients" aria-label="Back to coach preview">TS<span>.</span><span class="portal-brand-text">TrainSmart <small>CLIENT PREVIEW</small></span></a><div class="portal-header-right">'+pill("FICTIONAL PREVIEW")+'<a class="portal-back" href="./coach-hub.html#clients">Coach dashboard</a></div></header>'+
 '<div class="portal-warning" role="note"><strong>Sample interface — not a secure client account.</strong> Only fictional data. No authentication, invitations, remote syncing or real-client records.</div>'+
 '<div class="portal-container"><div class="portal-preview-tools"><label for="portal-person">Preview as fictional client</label><select id="portal-person">'+options(eligible,client.id)+'</select></div>'+
 nav()+'<div id="portal-notice" class="portal-alert" hidden></div><main id="portal-main" tabindex="-1">'+content+'</main>'+
 '<footer class="portal-footer">TrainSmart Coaching · Fictional in-browser preview</footer></div></div>';
 if(notice&&typeof notice==="object")notify(notice.msg,notice.isError);
}
function hero(client,title,kicker,desc){return '<div class="portal-title"><p>'+esc(kicker)+'</p><h1>'+esc(title)+'</h1><span>'+esc(desc)+'</span></div>';}
function planOverview(assign,logs){
 const complete=new Set(logs.map(l=>l.sessionIndex));
 return '<section class="portal-card"><div class="portal-plan-heading"><div><p class="portal-overline">YOUR FULL PROGRAMME</p><h2>All training sessions</h2></div><span class="portal-plan-count">'+complete.size+' of '+assign.sessions.length+' complete</span></div>'+
 '<div class="portal-plan-list">'+assign.sessions.map((session,index)=>{
  const status=complete.has(index)?"Completed":index===complete.size?"Next session":"Upcoming";
  return '<details class="portal-plan-session"><summary><span class="portal-session-number">'+(index+1)+'</span><span class="portal-session-summary"><strong>'+esc(session.name)+'</strong><small>'+session.exercises.length+' exercises · '+status+'</small></span><span class="portal-chevron" aria-hidden="true">⌄</span></summary>'+
  '<div class="portal-plan-exercises">'+session.exercises.map(ex=>
  '<div class="portal-plan-exercise"><div><strong>'+esc(ex.name)+'</strong><small>'+ex.prescription.workingSets+' sets · '+
  esc(ex.prescription.repsMin===ex.prescription.repsMax?ex.prescription.repsMin:ex.prescription.repsMin+'–'+ex.prescription.repsMax)+' reps · '+ex.prescription.restSeconds+'s rest</small></div>'+
  '<p>'+esc(ex.instructions||"")+'</p></div>').join("")+'</div></details>';
 }).join("")+'</div></section>';
}
function training(state,client){
 const assign=currentAssignment(state,client.id);
 if(!assign)return hero(client,"Training plan","YOUR WORKOUTS","Your assigned sessions appear here.")+empty("No training plan yet","Once your coach assigns a plan, your first workout will appear here.");
 const next=nextSession(state,client.id);
 if(!next)return hero(client,"Training plan","YOUR WORKOUTS",assign.name)+
 '<section class="portal-success"><h2>Programme complete</h2><p>All '+assign.sessions.length+' ordered sessions are finished. Your coach can assign the next block.</p></section>'+
 renderHistory(sessionHistory(state,client.id,assign.id)) +planOverview(assign,sessionHistory(state,client.id,assign.id));
 const old=storedSession(state,client.id,assign.id,next.index);
 const exercises=next.session.exercises.map((ex,ei)=>{
  const previous=old?.rows?.find(r=>r.rowId===ex.id);
  const suggested=lastWeight(state,client.id,ex.exerciseId);
  const safeLink=typeof ex.youtubeUrl==="string"&&/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(ex.youtubeUrl)?ex.youtubeUrl:"";
  return '<article class="portal-exercise"><div class="portal-ex-head"><div><span class="portal-ex-number">'+(ei+1)+'</span><strong>'+esc(ex.name)+'</strong></div>'+
  (safeLink?'<a target="_blank" rel="noopener noreferrer" href="'+esc(safeLink)+'">Watch technique ↗</a>':"")+'</div>'+
  '<div class="portal-prescription">'+esc(ex.prescription.workingSets)+' working sets · '+
  esc(ex.prescription.repsMin===ex.prescription.repsMax?ex.prescription.repsMin:ex.prescription.repsMin+"–"+ex.prescription.repsMax)+
  ' reps · '+esc(ex.prescription.restSeconds)+'s rest'+(ex.prescription.loadKg!==null?' · Suggested '+esc(ex.prescription.loadKg)+' kg':"")+'</div>'+
  (ex.instructions?'<p class="portal-instruction">'+esc(ex.instructions)+'</p>':"")+
  (ex.prescription.notes?'<p class="portal-coach-note">Coach note: '+esc(ex.prescription.notes)+'</p>':"")+
  '<div class="portal-sets"><div class="portal-set-header"><span>Set</span><span>Reps</span><span>Weight (kg)</span></div>'+
  Array.from({length:ex.prescription.workingSets},(_,si)=>{
    const set=previous?.sets?.[si],defaultKg=set?.loadKg??suggested??ex.prescription.loadKg;
    return '<div class="portal-set-row"><span>'+(si+1)+'</span><input inputmode="numeric" type="number" name="reps_'+ei+'_'+si+
     '" aria-label="'+esc(ex.name)+' set '+(si+1)+' reps" min="1" max="60" step="1" value="'+esc(set?.reps??"")+
     '" placeholder="'+esc(ex.prescription.repsMin)+'"><input inputmode="decimal" type="number" name="kg_'+ei+'_'+si+
     '" aria-label="'+esc(ex.name)+' set '+(si+1)+' weight" min="0" max="500" step="0.5" value="'+esc(defaultKg??"")+'" placeholder="0"></div>';
  }).join("")+'</div><label class="portal-skip">Skipped? Explain why (optional)<textarea name="skip_'+ei+'" rows="2" maxlength="200" placeholder="Only complete if the exercise was skipped">'+esc(previous?.skipReason||"")+'</textarea></label></article>';
 }).join("");
 return hero(client,"Training plan","NEXT: SESSION "+(next.index+1)+" OF "+assign.sessions.length,assign.name)+
 '<section class="portal-card portal-training-head"><h2>'+esc(next.session.name)+'</h2><p>Log your working sets as you go. Save a draft if you need to return later. Completing advances to the next ordered session.</p></section>'+
 '<form id="portal-workout" class="portal-workout" data-assignment="'+esc(assign.id)+'" data-index="'+next.index+'">'+exercises+
 '<div class="portal-form-actions"><button type="submit" class="portal-secondary" name="intent" value="draft">Save draft</button>'+
 '<button type="submit" class="portal-primary" name="intent" value="complete">Complete session</button></div></form>'+
 planOverview(assign,sessionHistory(state,client.id,assign.id))+renderHistory(sessionHistory(state,client.id,assign.id));
}
function renderHistory(logs){
 if(!logs.length)return '';
 return '<section class="portal-card"><h2>Completed sessions</h2><div class="portal-history">'+logs.slice().reverse().map(l=>
  '<div><strong>'+esc(l.sessionName)+'</strong><small>'+esc(date(l.completedAt))+' · '+l.rows.reduce((n,r)=>n+r.sets.filter(s=>s.reps!==null).length,0)+' sets logged</small></div>').join("")+'</div></section>';
}
function meals(state,client,nutrition){
 const assignment=currentMealAssignment(nutrition,client.id);
 if(!assignment)return hero(client,"Nutrition plan","YOUR MEALS","Your assigned meal choices appear here.")+empty("No nutrition plan assigned","Your coach can assign a reviewed meal plan when it is ready.");
 const plan=assignment.plan||{},target=plan.target||{};
 const labels={breakfast:"Breakfast",lunch:"Lunch",dinner:"Dinner",snacks:"Snacks"};
 const foods=new Map((nutrition?.foods||[]).map(f=>[f.id,f]));
 const selected=dailyMealSelections(state,client.id,assignment.id,day());
 const picked=Object.fromEntries(selected.map(x=>[x.category,x]));
 return hero(client,"Nutrition plan","YOUR MEALS",assignment.name)+
 '<section class="portal-card portal-daily-log"><div class="portal-plan-heading"><div><p class="portal-overline">TODAY’S MEAL LOG</p><h2>'+selected.length+' of 4 meals logged</h2><p>Choose the option you had in each category. You can change or remove it today.</p></div><span class="portal-plan-count">'+esc(date(day()))+'</span></div></section>'+
 '<section class="portal-card"><p class="portal-overline">COACH-ASSIGNED DAILY GUIDANCE · EXAMPLE ONLY</p><div class="portal-macros">'+
 [["Calories",target.calories,"kcal"],["Protein",target.proteinG,"g"],["Carbs",target.carbsG,"g"],["Fat",target.fatG,"g"]].map(([label,n,unit])=>
 '<div><small>'+label+'</small><strong>'+(Number.isFinite(n)?Math.round(n)+" "+unit:"—")+'</strong></div>').join("")+'</div>'+
 '<p>These are illustrative coach-approved targets from the fictional plan, not totals of what you actually ate. Nutritional values are not verified for real clients.</p></section>'+
 Object.entries(labels).map(([kind,label])=>'<section class="portal-card"><div class="portal-meal-category-head"><h2>'+label+'</h2>'+
 (picked[kind]?'<div class="portal-logged-indicator">✓ '+esc(picked[kind].mealName)+' <button type="button" data-meal-clear="'+kind+'" aria-label="Remove '+label+' log">Remove</button></div>':
 '<span class="portal-unlogged">Not logged today</span>')+'</div><div class="portal-meal-list">'+
 (plan.categories?.[kind]||[]).map((m,i)=>{
 const active=picked[kind]?.optionIndex===i;
 return '<details class="portal-meal'+(active?' portal-meal-selected':'')+'"><summary><span><small>OPTION '+(i+1)+(active?' · LOGGED TODAY':'')+'</small><strong>'+esc(m.name)+'</strong></span><span>View recipe</span></summary>'+
 '<div class="portal-meal-details">'+(m.nutrition?.calories!=null?'<p>'+Math.round(m.nutrition.calories)+' kcal · '+Math.round(m.nutrition.proteinG||0)+'g protein (illustrative)</p>':"")+
 '<h3>Ingredients</h3><ul>'+(m.ingredients||[]).map(x=>'<li>'+esc(foods.get(x.ingredientId)?.name||x.name||"Ingredient")+' · '+esc(x.quantity)+' '+esc(x.unit)+'</li>').join("")+'</ul>'+
 '<h3>Method</h3><ol>'+(m.steps||[]).map(step=>'<li>'+esc(step)+'</li>').join("")+'</ol>'+
 '<button type="button" class="'+(active?'portal-secondary':'portal-primary')+' portal-log-button" data-meal-category="'+kind+'" data-meal-option="'+i+'"'+(active?' disabled':'')+'>'+(
 active?'✓ Logged today':picked[kind]?'Replace with this meal':'Log this meal')+'</button></div></details>';
 }).join("")+'</div></section>').join("");
}
function render(){
 const {state,client}=stateForClient();
 if(!state||!client){
  root.innerHTML='<div class="portal-shell"><header class="portal-header"><strong>TrainSmart · Client preview</strong></header>'+
  '<main class="portal-container">'+empty("Open the fictional coach dashboard first","This preview reads sample clients from the same browser tab. No client login or account is available.")+
  '<a href="./coach-hub.html#clients" class="portal-primary portal-inline">Open coach dashboard</a></main></div>';return;
 }
 const nutrition=read(NUTRITION_STORE);
 const content=tab==="meals"?meals(state,client,nutrition):training(state,client);
 frame(state,client,content);
}
root.addEventListener("click",ev=>{
 const button=ev.target.closest("button");
 if(button?.dataset.tab){setTab(button.dataset.tab);return;}
 if(button?.dataset.go){setTab(button.dataset.go);return;}
 if(button?.dataset.mealCategory!==undefined||button?.dataset.mealClear!==undefined){
  const state=read(COACH_STORE),nutrition=read(NUTRITION_STORE);
  const assigned=currentMealAssignment(nutrition,clientId);
  if(!assigned)return notify("Your nutrition plan has changed. Refresh the plan.",true);
  try{
   const next=button.dataset.mealClear!==undefined?
    clearMealSelection(state,nutrition,clientId,assigned.id,day(),button.dataset.mealClear):
    logMealSelection(state,nutrition,clientId,assigned.id,day(),button.dataset.mealCategory,Number(button.dataset.mealOption));
   save(next);notice={msg:button.dataset.mealClear!==undefined?"Meal log removed.":"Meal logged for today.",isError:false};render();
  }catch(error){notify(error.message||"Could not save this meal.",true);}
  return;
 }
});
root.addEventListener("change",ev=>{
 if(ev.target?.id!=="portal-person")return;
 clientId=ev.target.value;
 const url=new URL(location.href);url.searchParams.set("client",clientId);
 history.replaceState(null,"",url.pathname+url.search+url.hash);
 notice="";render();
});
root.addEventListener("submit",ev=>{
 if(ev.target.id==="portal-workout"){
  ev.preventDefault();
  const state=read(COACH_STORE),form=ev.target,assignment=currentAssignment(state,clientId);
  if(!assignment)return notify("Training plan has changed. Return to your coach view.",true);
  const index=Number(form.dataset.index),session=assignment.sessions[index],fd=new FormData(form);
  const rows=session.exercises.map((ex,ei)=>({
   rowId:ex.id,skipReason:String(fd.get("skip_"+ei)||""),
   sets:Array.from({length:ex.prescription.workingSets},(_,si)=>({
    reps:String(fd.get("reps_"+ei+"_"+si)||""),
    loadKg:String(fd.get("kg_"+ei+"_"+si)??"")
   }))
  }));
  const complete=ev.submitter?.value==="complete";
  try{
   const next=saveClientSession(state,clientId,assignment.id,index,rows,{complete});
   save(next);notice={msg:complete?"Session completed — your next workout is ready.":"Workout draft saved in this browser tab.",isError:false};
   render();window.scrollTo({top:0,behavior:"auto"});
  }catch(err){notify(err.message||"Could not save this session.",true);}

 }
});
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if(tabs.some(t=>t[0]===h)){tab=h;render();}});
render();
