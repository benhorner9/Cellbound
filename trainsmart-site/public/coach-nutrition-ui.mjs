/* D07 isolated fictional nutrition workspace and controller. No network calls. */
import {MEAL_KINDS,MEAL_LABELS,DEMO_FOODS,initialNutrition,nutritionInputs,
 calculateNutrition,approveNutrition,isNutritionApproved,generateMealPrompt,calculateRecipe,
 parseMealsJSON,bestMealDay,storeMealRecipe,saveNutritionPlan,assignNutritionPlan,
 saveDemoIngredient,demoMealJSON} from "./coach-nutrition-model.mjs";
const STORE="trainsmart-coach-hub-nutrition-07-fictional-v1";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>Math.round(Number(n)||0).toLocaleString("en-GB");
const clone=x=>JSON.parse(JSON.stringify(x));
const option=(id,label,value)=>'<option value="'+esc(id)+'"'+(String(id)===String(value)?' selected':'')+'>'+esc(label)+'</option>';
const field=(name,label,value,extra='')=>'<label>'+esc(label)+'<input data-nut-field="'+name+'" value="'+esc(value??"")+'" '+extra+'></label>';
const select=(name,label,value,opts)=>'<label>'+esc(label)+'<select data-nut-field="'+name+'">'+opts.map(x=>option(x[0],x[1],value)).join("")+'</select></label>';
const textArea=(name,label,value,placeholder,max=350)=>'<label class="nut-wide">'+esc(label)+'<textarea data-nut-field="'+name+'" rows="2" maxlength="'+max+'" placeholder="'+esc(placeholder)+'">'+esc(value||"")+'</textarea></label>';
function load(){
 try{const a=JSON.parse(sessionStorage.getItem(STORE)||"null");
  if(a&&Array.isArray(a.foods)&&Array.isArray(a.recipes)&&Array.isArray(a.savedPlans)&&Array.isArray(a.assignments))return {...initialNutrition(),...a};
 }catch{}
 return initialNutrition();
}
let data=load(),viewKind="breakfast",activeTab="targets";
function save(){try{sessionStorage.setItem(STORE,JSON.stringify(data));}catch{}}
function currentClient(ctx){return ctx.clients.find(x=>x.id===data.clientId)||null;}
function selectedBaseline(ctx){return ctx.enrolments?.[data.clientId]?.baseline||null;}
function currentDraft(ctx){return nutritionInputs(data,currentClient(ctx),ctx.enrolments?.[data.clientId]);}
function blankPlan(){return {format:"TRAINSMART_MEALS_V1",categories:Object.fromEntries(MEAL_KINDS.map(kind=>[
 kind,Array.from({length:4},(_,i)=>({name:MEAL_LABELS[kind]+" option "+(i+1),
 servings:1,ingredients:[],steps:["Prepare and serve."]}))
 ])),reviewStatus:"draft"};}
function mealNutrition(meal){try{return calculateRecipe(meal,data.foods).nutrition;}catch{return null;}}
function nutritionSummary(t){
 return '<div class="nut-metrics">'+
 [['Daily calories',money(t.calories)+" kcal"],['Protein',money(t.proteinG)+" g"],
 ['Carbs',money(t.carbsG)+" g"],['Fat',money(t.fatG)+" g"]].map(([k,v])=>
 '<div class="nut-metric"><small>'+k+'</small><strong>'+v+'</strong></div>').join("")+'</div>';
}
function renderTarget(d){
 if(!d.target)return '<p class="small-muted">Calculate and approve your nutrition targets before generating an AI meal brief.</p>';
 const approved=isNutritionApproved(d);
 return '<div class="nut-target">'+nutritionSummary(d.target)+
 '<p><strong>Resting estimate:</strong> '+(d.target.estimate?money(d.target.estimate.bmr)+" kcal · estimated maintenance "+money(d.target.estimate.maintenanceCalories)+" kcal":
 "Not available — manual target")+'</p>'+
 '<p><strong>Macro energy check:</strong> '+money(d.target.macroCalories)+' kcal · '+(d.target.energyGap>=0?"+":"")+money(d.target.energyGap)+' kcal difference (4/4/9 rule)</p>'+
 d.target.warnings.map(w=>'<p class="nut-warning">'+esc(w)+'</p>').join("")+
 '<p><strong>'+ (approved?"Approved for this fictional draft":"Targets changed — approval expired")+'</strong></p></div>';
}
function renderRecipe(meal,kind,index){
 const n=mealNutrition(meal);
 const foods=data.foods;
 return '<article class="nut-recipe"><div class="nut-recipe-head"><strong>'+esc(MEAL_LABELS[kind])+' '+(index+1)+'</strong>'+
 '<span class="tag muted">'+(n?money(n.calories)+" kcal · P "+money(n.proteinG)+"g":"Incomplete recipe")+'</span></div>'+
 '<div class="nut-editor-grid">'+
 '<label>Meal name<input data-nut-meal-field="name" data-kind="'+kind+'" data-index="'+index+'" maxlength="100" value="'+esc(meal.name)+'"></label>'+
 '<label>Servings<input type="number" min="1" max="8" step="1" data-nut-meal-field="servings" data-kind="'+kind+'" data-index="'+index+'" value="'+esc(meal.servings)+'"></label></div>'+
 '<div class="nut-food-lines">'+(meal.ingredients||[]).map((row,ri)=>{
 const food=foods.find(f=>f.id===row.ingredientId);
 return '<div class="nut-food-line"><span>'+esc(food?.name||"Missing ingredient")+'</span>'+
 '<input type="number" aria-label="Ingredient quantity" min="0.1" max="2000" step="0.1" data-nut-row-qty="1" data-kind="'+kind+'" data-index="'+index+'" data-row="'+ri+'" value="'+esc(row.quantity)+'">'+
 '<span>'+esc(row.unit)+'</span><button class="btn btn-ghost btn-sm" type="button" data-nut-action="remove-row" data-kind="'+kind+'" data-index="'+index+'" data-row="'+ri+'">Remove</button></div>';
 }).join("")+'</div>'+
 '<div class="nut-food-line"><select aria-label="Ingredient to add" id="nut-food-'+kind+'-'+index+'">'+
 foods.filter(f=>f.demoReviewed).map(f=>option(f.id,f.name+" ("+f.unit+")","")).join("")+
 '</select><input type="number" aria-label="New ingredient quantity" id="nut-qty-'+kind+'-'+index+'" min=".1" max="2000" step=".1" value="100">'+
 '<button type="button" class="btn btn-outline btn-sm" data-nut-action="add-row" data-kind="'+kind+'" data-index="'+index+'">+ Add</button></div>'+
 '<label>Preparation notes<textarea rows="2" data-nut-meal-field="steps" data-kind="'+kind+'" data-index="'+index+'" maxlength="1500">'+esc((meal.steps||[]).join("\n"))+'</textarea></label>'+
 '<button class="btn btn-outline btn-sm" type="button" data-nut-action="save-recipe" data-kind="'+kind+'" data-index="'+index+'">Save individual recipe</button>'+
 '</article>';
}
function renderPlan(ctx){
 if(!data.currentPlan)return '<div class="nut-empty">Import ChatGPT JSON or select <strong>Start manual 16-meal plan</strong> to edit recipes here.</div>';
 const k=viewKind;
 const plan=data.currentPlan,coverage=(()=>{try{const fresh={categories:{}};for(const kind of MEAL_KINDS)fresh.categories[kind]=plan.categories[kind].map(meal=>calculateRecipe(meal,data.foods));return bestMealDay(fresh,data.target);}catch{return null;}})();
 return '<div class="nut-tabs">'+MEAL_KINDS.map(kind=>'<button type="button" class="seg '+(kind===k?"active":"")+'" data-nut-action="kind" data-kind="'+kind+'">'+esc(MEAL_LABELS[kind])+' ×4</button>').join("")+'</div>'+
 '<div class="nut-recipes">'+plan.categories[k].map((m,i)=>renderRecipe(m,k,i)).join("")+'</div>'+
 (coverage?'<div class="nut-day"><strong>Closest combination of one meal per category (256 checked)</strong>'+
 nutritionSummary(coverage.totals)+
 '<p>'+MEAL_KINDS.map(kind=>MEAL_LABELS[kind]+": "+esc(plan.categories[kind][coverage.choices[kind]].name)).join(" · ")+'</p>'+
 '<p class="'+(coverage.within?"nut-ok":"nut-warning")+'">'+(coverage.within?"Within illustrative comparison tolerances.":"At least one daily target is outside 10% calorie / 20% macro comparison tolerances.")+'</p></div>':
 '<p class="nut-warning">Complete all 16 recipes to compare possible full-day combinations.</p>')+
 '<div class="nut-actions"><button class="btn btn-primary" type="button" data-nut-action="save-plan">Save named meal plan / new version</button></div>';
}
function renderSaved(ctx){
 return '<section class="panel nut-section"><h3>Saved meal plans</h3><p>Reuse an existing plan or assign a copy to a sample client. Earlier versions remain unchanged.</p>'+
 (data.savedPlans.length?data.savedPlans.map(p=>{
  const v=p.versions.at(-1);
  return '<div class="nut-saved-row"><div><strong>'+esc(p.name)+'</strong><p class="small-muted">Version '+v.version+' · '+p.versions.length+' saved revision(s)</p></div>'+
 '<button type="button" class="btn btn-outline btn-sm" data-nut-action="load-plan" data-plan="'+esc(p.id)+'">Reuse / edit</button>'+
 '<button type="button" class="btn btn-outline btn-sm" data-nut-action="assign-plan" data-plan="'+esc(p.id)+'">Assign demo copy</button></div>';
 }).join(""):'<p class="small-muted">No meal plans saved yet.</p>')+
 '<h3>Saved individual recipes</h3>'+
 (data.recipes.length?data.recipes.slice(-18).map(r=>'<div class="nut-saved-row"><div><strong>'+esc(r.name)+'</strong><p class="small-muted">'+money(r.nutrition.calories)+' kcal · '+esc(r.id)+'</p></div>'+
 '<select aria-label="Choose meal slot" id="nut-recipe-slot-'+esc(r.id)+'">'+
 MEAL_KINDS.flatMap(kind=>Array.from({length:4},(_,i)=>option(kind+":"+i,MEAL_LABELS[kind]+" "+(i+1),viewKind+":0"))).join("")+
 '</select><button type="button" class="btn btn-outline btn-sm" data-nut-action="reuse-recipe" data-recipe="'+esc(r.id)+'">Use recipe in slot</button></div>').join(""):'<p class="small-muted">No recipes saved yet.</p>')+
 '<h3>Fictional client meal-plan assignments</h3>'+
 (data.assignments.length?data.assignments.slice().reverse().map(a=>'<p>'+esc(ctx.clients.find(c=>c.id===a.clientId)?.name||"Example client")+
 ' · '+esc(a.name)+' v'+a.version+(a.current?" · Current":" · Previous")+'</p>').join(""):'<p class="small-muted">No assignments. Demo-only; no actual client portal.</p>')+
 '</section>';
}
function renderFoods(){
 return '<section class="panel nut-section"><h3>Ingredient library</h3>'+
 '<p><strong>Example nutrition values:</strong> The '+data.foods.length+' illustrative entries are fictional test values, not verified UK label data. AI is restricted to reviewed demo IDs. For real coaching, accurate product labels, serving conversions and allergens still require independent verification.</p>'+
 '<div class="nut-food-list">'+data.foods.slice(0,40).map(f=>'<div><strong>'+esc(f.name)+'</strong> · per 100 '+esc(f.unit)+
 ': '+money(f.calories)+' kcal, P '+money(f.proteinG)+'g, C '+money(f.carbsG)+'g, F '+money(f.fatG)+'g'+
 '<small>'+esc(f.source)+'</small></div>').join("")+'</div>'+
 '<h4>Add an ingredient from a product label (fictional test only)</h4>'+
 '<div class="nut-input-grid">'+[
 field("foodName","Ingredient name","","maxlength=80"),select("foodUnit","Unit","g",[["g","per 100 g"],["ml","per 100 ml"]]),
 field("foodCalories","Calories per 100","","type=number min=0 max=1000 step=0.1"),
 field("foodProtein","Protein per 100","","type=number min=0 max=1000 step=0.1"),
 field("foodCarbs","Carbs per 100","","type=number min=0 max=1000 step=0.1"),
 field("foodFat","Fat per 100","","type=number min=0 max=1000 step=0.1"),
 field("foodSource","Source / label reference","","maxlength=200")
 ].join("")+'</div>'+
 '<button type="button" class="btn btn-outline" data-nut-action="add-food">Add illustrative ingredient</button></section>';
}
export function renderNutritionHub(ctx){
 const c=currentClient(ctx),base=selectedBaseline(ctx),d=currentDraft(ctx);
 const options=ctx.clients.filter(x=>x.status!=="Archived");
 const sample=options.map(x=>option(x.id,x.name,data.clientId)).join("");
 return '<div class="nut-workspace-top"><div><p class="eyebrow">Nutrition workspace</p><h2>Nutrition plans</h2>'+
 '<p>Calculate targets, build meals and manage saved plans.</p></div>'+
 '<div class="nut-mini-target"><span>Client: '+esc(c?.name||"Not selected")+'</span>'+
 (data.target&&isNutritionApproved(data)?'<span>'+money(data.target.calories)+' kcal</span><span>P '+money(data.target.proteinG)+'g</span>'+
 '<span>C '+money(data.target.carbsG)+'g</span><span>F '+money(data.target.fatG)+'g</span>':
 '<span>Targets not approved</span>')+'</div></div>'+
 '<div class="nut-view-tabs" role="tablist" aria-label="Nutrition workflow">'+
 [["targets","Targets","1"],["create","Create plan","2"],["plan","Meal editor","3"],["library","Library","4"]].map(([id,label,n])=>
 '<button type="button" role="tab" aria-controls="nutrition-panel" aria-selected="'+(activeTab===id)+'" data-nut-action="tab" data-tab="'+id+'">'+
 '<span class="tab-count">'+n+'</span>'+label+'</button>').join("")+'</div>'+
 '<div class="nut-panel-body" id="nutrition-panel" role="tabpanel" tabindex="-1">'+
 (activeTab==="targets" ?
 '<section class="panel nut-section"><div class="ai-step-title"><span class="ai-step-number">1</span><div><h3>Set calorie and macro targets</h3>'+
 '<p>Use the selected client’s recorded details. Fill any gaps before calculating.</p></div></div>'+
 '<label>Client<select data-nut-field="clientId"><option value="">Choose a client</option>'+sample+'</select></label>'+
 (c?'<p class="nut-context">Goal: <strong>'+esc(c.goal)+'</strong> · Sessions/week: <strong>'+esc(c.trainingDays)+'</strong> · '+
 (base?.coachVerified?"Baseline on file":"Height and weight not yet confirmed")+'</p>':'')+
 '<div class="nut-input-grid">'+
 field("age","Age (18–100)",d.age,'type="number" min="18" max="100"')+
 field("weightKg","Weight (kg)",d.weightKg,'type="number" min="25" max="350" step="0.1"')+
 field("heightCm","Height (cm)",d.heightCm,'type="number" min="125" max="230" step="0.1"')+
 select("sexForEstimate","Formula setting",d.sexForEstimate,[["","Choose or use manual calories"],["male","Male coefficient (+5)"],["female","Female coefficient (−161)"]])+
 select("activity","Daily activity",d.activity,[["","Choose activity"],["sedentary","Sedentary × 1.2"],["light","Light × 1.375"],["moderate","Moderate × 1.55"],["active","Active × 1.725"]])+
 select("goal","Nutrition goal",d.goal,[["","Choose goal"],["lose","Fat loss (−10% starting point)"],["maintain","Maintenance"],["gain","Muscle gain (+10% starting point)"]])+
 field("calorieTarget","Manual calorie target (optional)",d.calorieTarget,'type="number" min="1200" max="5500" placeholder="Auto if blank"')+
 field("proteinTarget","Manual protein (g, optional)",d.proteinTarget,'type="number" min="20" max="400"')+
 field("carbTarget","Manual carbohydrate (g, optional)",d.carbTarget,'type="number" min="0" max="900"')+
 field("fatTarget","Manual fat (g, optional)",d.fatTarget,'type="number" min="15" max="240"')+
 '</div><div class="nut-actions"><button type="button" class="btn btn-outline" data-nut-action="calculate">Calculate calories & macros</button>'+
 '<button type="button" class="btn btn-primary" data-nut-action="approve">Approve target</button></div>'+
 renderTarget(data)+'</section>':"")+
 (activeTab==="create" ? '<div class="nut-create-split">'+
 '<section class="panel nut-section"><div class="ai-step-title"><span class="ai-step-number">2</span><div><h3>Plan requirements</h3>'+
 '<p>Set food preferences and build the brief you’ll use in ChatGPT.</p></div></div>'+
 '<div class="nut-input-grid">'+field("name","Plan name",d.name,'maxlength="90"')+
 textArea("preferences","Food and meal preferences",d.preferences,"e.g. quick, supermarket-friendly meals")+
 textArea("excludedFoods","Foods to avoid (nonmedical preference only)",d.excludedFoods,"e.g. mushrooms or olives",250)+
 field("budget","Food budget / style",d.budget,'maxlength="130" placeholder="e.g. affordable"')+
 textArea("instructions","Additional coach instructions",d.instructions,"e.g. simple batch-cook dinners",400)+
 '</div><div class="nut-actions"><button type="button" class="btn btn-primary" data-nut-action="prompt"'+(!isNutritionApproved(data)?" disabled":"")+'>Prepare ChatGPT brief</button>'+
 '<button type="button" class="btn btn-outline" data-nut-action="copy"'+(!data.prompt?" disabled":"")+'>Copy brief</button>'+
 '<a class="btn btn-outline" target="_blank" rel="noopener noreferrer" href="https://chatgpt.com/">Open ChatGPT ↗</a></div>'+
 '<label>Brief to copy<textarea id="nut-prompt" readonly rows="7" placeholder="Approve targets, then prepare the brief.">'+esc(data.prompt||"")+'</textarea></label></section>'+
 '<section class="panel nut-section"><div class="ai-step-title"><span class="ai-step-number">3</span><div><h3>Bring your plan back</h3>'+
 '<p>Paste the reply from ChatGPT. We check the ingredients and recalculate the totals.</p></div></div>'+
 '<label>Paste ChatGPT response<textarea data-nut-field="reply" rows="7" maxlength="45000" placeholder="Paste TRAINSMART_MEALS_V1 JSON here.">'+esc(data.reply||"")+'</textarea></label>'+
 '<div class="nut-actions"><button type="button" class="btn btn-outline" data-nut-action="example">Load an example</button>'+
 '<button type="button" class="btn btn-primary" data-nut-action="import">Import meal plan</button>'+
 '<button type="button" class="btn btn-outline" data-nut-action="manual">Build manually</button></div>'+
 '</section></div>':"")+
 (activeTab==="plan" ? '<section class="panel nut-section nut-section--editor"><div class="panel-header"><div><h3>Meal editor</h3><p class="small-muted">Edit quantities, review totals and save your plan.</p></div>'+
 '<button class="btn btn-outline btn-sm" type="button" data-nut-action="tab" data-tab="create">Create new plan</button></div>'+
 renderPlan(ctx)+'</section>':"")+
 (activeTab==="library" ? renderSaved(ctx)+renderFoods():"")+
 '</div>'+
 '<p class="footer-bits">Sample-data workspace. Check ingredient sources and dietary suitability before any real use.</p>';
}
function changeField(target,ctx){
 const key=target.dataset.nutField;if(!key)return;
 if(key==="clientId"){
  if(target.value&&!ctx.clients.some(c=>c.id===target.value&&c.status!=="Archived"))return;
  const previous=data,cl=ctx.clients.find(c=>c.id===target.value),base=ctx.enrolments?.[target.value]?.baseline;
  data={...initialNutrition(),foods:previous.foods,recipes:previous.recipes,savedPlans:previous.savedPlans,assignments:previous.assignments,
   clientId:target.value,name:cl?"Nutrition — "+(cl.goal||"Wellness"):"My nutrition plan",
   weightKg:base?.coachVerified?String(base.weightKg):"",heightCm:base?.coachVerified?String(base.heightCm):""};
  return;
 }
 if(key==="foodUnit"||key.startsWith("food"))return;
 if(!Object.hasOwn(data,key))return;
 data[key]=String(target.value||"").slice(0,key==="reply"?45000:400);
 if(["age","weightKg","heightCm","sexForEstimate","activity","goal",
      "calorieTarget","proteinTarget","carbTarget","fatTarget"].includes(key)){
  data.approvedFingerprint="";
  data.prompt="";data.reply="";data.target=null;
 }
 if(["name","preferences","excludedFoods","budget","instructions"].includes(key))data.prompt="";
}
export function handleNutritionInput(target,ctx){
 if(target.dataset?.nutField){changeField(target,ctx);save();return true;}
 if(target.dataset?.nutMealField){
  const m=data.currentPlan?.categories?.[target.dataset.kind]?.[Number(target.dataset.index)];if(!m)return true;
  const val=target.value;
  if(target.dataset.nutMealField==="name")m.name=val.slice(0,100);
  else if(target.dataset.nutMealField==="servings")m.servings=Number(val);
  else m.steps=val.split("\n").filter(Boolean).slice(0,12);
  save();return true;
 }
 if(target.dataset?.nutRowQty){
  const row=data.currentPlan?.categories?.[target.dataset.kind]?.[Number(target.dataset.index)]?.ingredients?.[Number(target.dataset.row)];
  if(row)row.quantity=Number(target.value);
  save();return true;
 }
 return false;
}
export function handleNutritionChange(target,ctx,refresh){
 if(!target.dataset?.nutField)return false;
 if(target.dataset.nutField.startsWith("food"))return true;
 if(target.tagName!=="SELECT"){save();return true;}
 changeField(target,ctx);save();refresh();return true;
}
export async function handleNutritionClick(btn,ctx,refresh,notify){
 const action=btn.dataset.nutAction;if(!action)return false;
 try{
  if(action==="tab"){
   if(!["targets","create","plan","library"].includes(btn.dataset.tab))throw Error("Unknown nutrition section.");
   activeTab=btn.dataset.tab;refresh();document.querySelector('[data-nut-action="tab"][data-tab="'+activeTab+'"]')?.focus({preventScroll:true});return true;
  }
  if(action==="kind"){viewKind=btn.dataset.kind;refresh();return true;}
  if(action==="calculate"){data.target=calculateNutrition(currentDraft(ctx));data.approvedFingerprint="";notify("Targets calculated. Review before approval.");}
  if(action==="approve"){data=approveNutrition(currentDraft(ctx));activeTab="create";notify("Targets approved. Set your meal preferences next.");}
  if(action==="prompt"){
   if(!data.clientId)throw Error("Select a fictional client.");
   data.prompt=generateMealPrompt({...data,trainingSessionsPerWeek:currentClient(ctx)?.trainingDays||null,clientGoal:currentClient(ctx)?.goal||""});
   data.reply="";notify("Copy the anonymised prompt to ChatGPT.");}
  if(action==="copy"){
   if(!data.prompt)throw Error("Generate the prompt first.");
   try{await navigator.clipboard.writeText(data.prompt);notify("Prompt copied.");}
   catch{document.getElementById("nut-prompt")?.select();notify("Prompt selected — copy it manually.");}
  }
  if(action==="example"){data.reply=demoMealJSON(data.foods);notify("Fictional example JSON loaded.");}
  if(action==="import"){
   if(!isNutritionApproved(data))throw Error("Approve calorie and macro targets before importing.");
   data.currentPlan=parseMealsJSON(data.reply,data.foods,data.excludedFoods);activeTab="plan";
   notify("Meal plan imported. Review each meal before saving.");}
  if(action==="manual"){data.currentPlan=blankPlan();activeTab="plan";notify("Meal editor opened. Complete each meal to save.");}
  if(action==="add-row"||action==="remove-row"||action==="save-recipe"){
   const kind=btn.dataset.kind,index=Number(btn.dataset.index);
   const meal=data.currentPlan?.categories?.[kind]?.[index];if(!meal)throw Error("Select a meal first.");
   if(action==="add-row"){
    const foodId=document.getElementById("nut-food-"+kind+"-"+index)?.value;
    const food=data.foods.find(f=>f.id===foodId),quantity=Number(document.getElementById("nut-qty-"+kind+"-"+index)?.value);
    if(!food||!Number.isFinite(quantity)||quantity<=0||quantity>2000)throw Error("Select a valid ingredient and measured quantity.");
    meal.ingredients.push({ingredientId:food.id,quantity,unit:food.unit});}
   if(action==="remove-row")meal.ingredients.splice(Number(btn.dataset.row),1);
   if(action==="save-recipe"){data.recipes=storeMealRecipe(data.recipes,meal,data.foods);activeTab="library";notify("Recipe saved to your library.");}
  }
  if(action==="reuse-recipe"){
   const recipe=data.recipes.find(r=>r.id===btn.dataset.recipe);
   const value=document.getElementById("nut-recipe-slot-"+btn.dataset.recipe)?.value||"";
   const [kind,i]=value.split(":"),index=Number(i);
   if(!recipe||!MEAL_KINDS.includes(kind)||!Number.isInteger(index)||index<0||index>3)throw Error("Choose a saved recipe and meal slot.");
   if(!data.currentPlan)data.currentPlan=blankPlan();
   data.currentPlan.categories[kind][index]=clone(recipe);activeTab="plan";
   notify("Recipe added to the meal editor.");
  }
  if(action==="save-plan"){
   if(!isNutritionApproved(data))throw Error("Targets changed. Recalculate and approve again before saving.");
   data.savedPlans=saveNutritionPlan(data.savedPlans,data.currentPlan,data.target,data.name,data.foods);activeTab="library";
   notify("Meal plan saved to your library.");}
  if(action==="load-plan"){
   const p=data.savedPlans.find(x=>x.id===btn.dataset.plan);
   if(!p)throw Error("Saved plan not found.");
   data.currentPlan=clone(p.versions.at(-1).plan);
   data.name=p.name;activeTab="plan";
   notify("Plan opened for editing.");}
  if(action==="assign-plan"){
   if(!data.clientId)throw Error("Select a fictional client first.");
   const p=data.savedPlans.find(x=>x.id===btn.dataset.plan);
   data.assignments=assignNutritionPlan(data.assignments,p,data.clientId);
   notify("Independent demo-only client snapshot assigned. No live client changes.");}
  if(action==="add-food"){
   const val=id=>document.querySelector('[data-nut-field="'+id+'"]')?.value??"";
   data.foods=saveDemoIngredient(data.foods,{name:val("foodName"),unit:val("foodUnit"),source:val("foodSource"),
    calories:val("foodCalories"),proteinG:val("foodProtein"),carbsG:val("foodCarbs"),fatG:val("foodFat")});
   notify("Illustrative ingredient saved. Independently verify labels for real use.");}
  save();refresh();
 }catch(error){notify(error.message);}
 return true;
}
export function resetNutritionDemo(){activeTab="targets";data=initialNutrition();try{sessionStorage.removeItem(STORE);}catch{}}
