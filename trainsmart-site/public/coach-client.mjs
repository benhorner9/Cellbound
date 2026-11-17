/* D08 isolated client-facing preview. Fictional records only; no login or shared backend. */
import {COACH_STORE,NUTRITION_STORE,currentAssignment,currentMealAssignment,sessionHistory,
 nextSession,storedSession,saveClientSession,lastWeight,weekStart,latestCheckin,saveWeeklyCheckin} from "./coach-client-model.mjs";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const read=key=>{try{return JSON.parse(sessionStorage.getItem(key)||"null");}catch{return null;}};
const save=state=>{sessionStorage.setItem(COACH_STORE,JSON.stringify(state));};
const day=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const date=x=>x?new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"}).format(new Date(x)):"";
const query=new URLSearchParams(location.search);
let clientId=query.get("client")||"",tab=["home","training","meals","progress"].includes(location.hash.slice(1))?location.hash.slice(1):"home";
const root=document.querySelector("#client-root");
const tabs=[["home","Home","⌂"],["training","Training","▤"],["meals","Meals","◫"],["progress","Progress","◷"]];
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
function home(state,client,nutrition){
 const next=nextSession(state,client.id),assignment=currentAssignment(state,client.id);
 const meal=currentMealAssignment(nutrition,client.id);
 const completed=assignment?sessionHistory(state,client.id,assignment.id).length:0;
 const currentWeek=weekStart(day()),check=latestCheckin(state,client.id,currentWeek);
 const first=String(client.name||"Client").split(" ")[0];
 return hero(client,"Good to see you, "+first,"YOUR COACHING SPACE","Your next session, nutrition and updates in one place.")+
 '<div class="portal-hero"><div><p class="portal-overline">NEXT WORKOUT</p><h2>'+esc(next?.session?.name||(!assignment?"No programme assigned":"Programme completed"))+'</h2><p>'+
 (next?"Session "+(next.index+1)+" of "+assignment.sessions.length+" · Follow the sessions in order.":
  !assignment?"Your coach has not assigned a training plan yet.":"You have completed every session in this assigned plan.")+
 '</p><button type="button" data-go="training" class="portal-primary">'+(next?"View workout":"View training")+'</button></div>'+
 '<div class="portal-hero-stat"><strong>'+completed+(assignment?"/"+assignment.sessions.length:"")+'</strong><small>Sessions completed</small></div></div>'+
 '<div class="portal-grid"><button type="button" class="portal-link-card" data-go="meals"><span class="portal-link-icon">◫</span><span><strong>Meal plan</strong><small>'+esc(meal?meal.name:"Waiting for coach assignment")+'</small></span><span aria-hidden="true">›</span></button>'+
 '<button type="button" class="portal-link-card" data-go="progress"><span class="portal-link-icon">◷</span><span><strong>Weekly check-in</strong><small>'+esc(check?"Submitted · Edit this week":"Ready when you are")+'</small></span><span aria-hidden="true">›</span></button></div>'+
 '<section class="portal-card"><p class="portal-overline">YOUR TRAINING GOAL</p><h2>'+esc(client.goal||"Work towards your goals")+'</h2><p>Programme changes are made by your coach, so your active sessions stay clear and consistent.</p></section>';
}
function training(state,client){
 const assign=currentAssignment(state,client.id);
 if(!assign)return hero(client,"Training","WORKOUTS","Your assigned sessions appear here.")+empty("No training plan yet","Once your coach assigns a plan, your first workout will appear here.");
 const next=nextSession(state,client.id);
 if(!next)return hero(client,"Training","WORKOUTS",assign.name)+
 '<section class="portal-success"><h2>Programme complete</h2><p>All '+assign.sessions.length+' ordered sessions are finished. Your coach can assign the next block.</p></section>'+
 renderHistory(sessionHistory(state,client.id,assign.id));
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
 return hero(client,"Your next workout","TRAINING · SESSION "+(next.index+1)+" OF "+assign.sessions.length,assign.name)+
 '<section class="portal-card portal-training-head"><h2>'+esc(next.session.name)+'</h2><p>Log your working sets as you go. Save a draft if you need to return later. Completing advances to the next ordered session.</p></section>'+
 '<form id="portal-workout" class="portal-workout" data-assignment="'+esc(assign.id)+'" data-index="'+next.index+'">'+exercises+
 '<div class="portal-form-actions"><button type="submit" class="portal-secondary" name="intent" value="draft">Save draft</button>'+
 '<button type="submit" class="portal-primary" name="intent" value="complete">Complete session</button></div></form>'+
 renderHistory(sessionHistory(state,client.id,assign.id));
}
function renderHistory(logs){
 if(!logs.length)return '';
 return '<section class="portal-card"><h2>Completed sessions</h2><div class="portal-history">'+logs.slice().reverse().map(l=>
  '<div><strong>'+esc(l.sessionName)+'</strong><small>'+esc(date(l.completedAt))+' · '+l.rows.reduce((n,r)=>n+r.sets.filter(s=>s.reps!==null).length,0)+' sets logged</small></div>').join("")+'</div></section>';
}
function meals(client,nutrition){
 const assignment=currentMealAssignment(nutrition,client.id);
 if(!assignment)return hero(client,"Meals","NUTRITION","Your saved meal choices.")+empty("No meal plan assigned","Your coach can assign a reviewed meal plan when it is ready.");
 const plan=assignment.plan||{},target=plan.target||{};
 const labels={breakfast:"Breakfast",lunch:"Lunch",dinner:"Dinner",snacks:"Snacks"};
 const foods=new Map((nutrition?.foods||[]).map(f=>[f.id,f]));
 return hero(client,"Your meal plan","NUTRITION",assignment.name)+
 '<section class="portal-card"><p class="portal-overline">DAILY GUIDANCE · EXAMPLE ONLY</p><div class="portal-macros">'+
 [["Calories",target.calories,"kcal"],["Protein",target.proteinG,"g"],["Carbs",target.carbsG,"g"],["Fat",target.fatG,"g"]].map(([label,n,unit])=>
 '<div><small>'+label+'</small><strong>'+(Number.isFinite(n)?Math.round(n)+" "+unit:"—")+'</strong></div>').join("")+'</div>'+
 '<p>Choose one meal from each category according to your coach’s guidance. Nutritional values in this demonstration are not verified for real use.</p></section>'+
 Object.entries(labels).map(([kind,label])=>'<section class="portal-card"><h2>'+label+'</h2><div class="portal-meal-list">'+
 (plan.categories?.[kind]||[]).map((m,i)=>'<details class="portal-meal"><summary><span><small>OPTION '+(i+1)+'</small><strong>'+esc(m.name)+'</strong></span><span>View recipe</span></summary>'+
 '<div class="portal-meal-details">'+(m.nutrition?.calories!=null?'<p>'+Math.round(m.nutrition.calories)+' kcal · '+Math.round(m.nutrition.proteinG||0)+'g protein</p>':"")+
 '<h3>Ingredients</h3><ul>'+(m.ingredients||[]).map(x=>'<li>'+esc(foods.get(x.ingredientId)?.name||x.name||"Ingredient")+' · '+esc(x.quantity)+' '+esc(x.unit)+'</li>').join("")+'</ul>'+
 '<h3>Method</h3><ol>'+(m.steps||[]).map(s=>'<li>'+esc(s)+'</li>').join("")+'</ol></div></details>').join("")+'</div></section>').join("");
}
function progress(state,client){
 const logs=(state.clientPortalLogs||[]).filter(l=>l.clientId===client.id&&l.completed).slice().sort((a,b)=>String(b.completedAt).localeCompare(String(a.completedAt)));
 const monday=weekStart(day()),check=latestCheckin(state,client.id,monday);
 const checks=(state.clientPortalCheckins||[]).filter(c=>c.clientId===client.id).slice().sort((a,b)=>b.week.localeCompare(a.week));
 const select=(name,label,value)=>'<label>'+label+'<select name="'+name+'">'+Array.from({length:5},(_,i)=>
 '<option value="'+(i+1)+'"'+(Number(value)===i+1?" selected":"")+'>'+(i+1)+' / 5</option>').join("")+'</select></label>';
 return hero(client,"Your progress","CHECK-INS & HISTORY","A simple record of your completed sessions and weekly feedback.")+
 '<div class="portal-metric-cards"><div><small>Sessions completed</small><strong>'+logs.length+'</strong></div><div><small>Weekly check-ins</small><strong>'+checks.length+'</strong></div></div>'+
 '<section class="portal-card"><h2>'+esc(check?"Update this week’s check-in":"Weekly check-in")+'</h2>'+
 '<p>Share your weekly feedback for your coach to review. This is a fictional form.</p>'+
 '<form id="portal-checkin"><div class="portal-checkin-fields">'+
 select("energy","Energy",check?.energy||3)+select("sleep","Sleep",check?.sleep||3)+
 '<label>Weight (kg, optional)<input type="number" name="weightKg" min="25" max="350" step="0.1" value="'+esc(check?.weightKg??"")+'" placeholder="Optional"></label></div>'+
 '<label>Anything worth mentioning?<textarea name="notes" rows="3" maxlength="400" placeholder="Example feedback only">'+esc(check?.notes||"")+'</textarea></label>'+
 '<div class="portal-form-actions"><button class="portal-primary" type="submit">'+(check?"Update check-in":"Submit check-in")+'</button></div></form></section>'+
 '<section class="portal-card"><h2>Training history</h2>'+(
 logs.length?'<div class="portal-history">'+logs.map(l=>'<div><strong>'+esc(l.sessionName)+'</strong><small>'+esc(date(l.completedAt))+' · '+l.rows.reduce((n,r)=>n+r.sets.filter(s=>s.reps!==null).length,0)+' sets</small></div>').join("")+'</div>':
 '<p>No completed workouts yet. Your first completed session will appear here.</p>')+'</section>'+
 (checks.length?'<section class="portal-card"><h2>Check-in history</h2><div class="portal-history">'+checks.map(c=>
 '<div><strong>Week of '+esc(date(c.week))+'</strong><small>Energy '+c.energy+'/5 · Sleep '+c.sleep+'/5'+(c.weightKg?" · "+c.weightKg+" kg":"")+'</small></div>').join("")+'</div></section>':"");
}
function render(){
 const {state,client}=stateForClient();
 if(!state||!client){
  root.innerHTML='<div class="portal-shell"><header class="portal-header"><strong>TrainSmart · Client preview</strong></header>'+
  '<main class="portal-container">'+empty("Open the fictional coach dashboard first","This preview reads sample clients from the same browser tab. No client login or account is available.")+
  '<a href="./coach-hub.html#clients" class="portal-primary portal-inline">Open coach dashboard</a></main></div>';return;
 }
 const nutrition=read(NUTRITION_STORE);
 const content=tab==="training"?training(state,client):tab==="meals"?meals(client,nutrition):
  tab==="progress"?progress(state,client):home(state,client,nutrition);
 frame(state,client,content);
}
root.addEventListener("click",ev=>{
 const button=ev.target.closest("button");
 if(button?.dataset.tab){setTab(button.dataset.tab);return;}
 if(button?.dataset.go){setTab(button.dataset.go);return;}
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
 }else if(ev.target.id==="portal-checkin"){
  ev.preventDefault();
  const fd=new FormData(ev.target);
  try{
   const next=saveWeeklyCheckin(read(COACH_STORE),clientId,day(),Object.fromEntries(fd.entries()));
   save(next);notice={msg:"Fictional weekly check-in saved.",isError:false};render();
  }catch(err){notify(err.message||"Please review your check-in.",true);}
 }
});
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if(tabs.some(t=>t[0]===h)){tab=h;render();}});
render();
