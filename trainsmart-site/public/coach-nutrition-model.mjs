/* D07 fictional nutrition core. Mirrors the earlier public/nutrition.mjs Mifflin–St Jeor
 * and 1.8 g/kg protein, 0.8 g/kg fat macro heuristic. No external services.
 * Fictional example ingredients are NOT verified food composition data. */
export const MEAL_KINDS=["breakfast","lunch","dinner","snacks"];
export const MEAL_LABELS={breakfast:"Breakfast",lunch:"Lunch",dinner:"Dinner",snacks:"Snack"};
export const ACTIVITY={sedentary:1.2,light:1.375,moderate:1.55,active:1.725};
export const DEMO_FOODS=[
 ["oats","Porridge oats","g",389,16.9,66.3,6.9],
 ["milk","Semi-skimmed milk","ml",47,3.6,4.8,1.8],
 ["yogurt","Greek-style yogurt","g",97,9,3.5,5],
 ["berries","Mixed berries","g",50,0.7,12,0.3],
 ["banana","Banana","g",89,1.1,22.8,0.3],
 ["eggs","Eggs (edible portion)","g",143,12.6,0.7,9.5],
 ["bread","Wholemeal bread","g",247,13,41,4.2],
 ["chicken","Cooked chicken breast","g",165,31,0,3.6],
 ["rice","Cooked white rice","g",130,2.7,28,0.3],
 ["potato","Boiled potato","g",87,1.9,20,0.1],
 ["pasta","Cooked pasta","g",158,5.8,30.9,0.9],
 ["salmon","Cooked salmon","g",206,22,0,12.4],
 ["tuna","Tuna in spring water, drained","g",116,26,0,1],
 ["tofu","Firm tofu","g",120,12,2,7],
 ["broccoli","Broccoli","g",34,2.8,6.6,0.4],
 ["tomato","Tomato","g",18,0.9,3.9,0.2],
 ["spinach","Spinach","g",23,2.9,3.6,0.4],
 ["olive","Olive oil","g",884,0,0,100],
 ["cheese","Cheddar cheese","g",403,25,1.3,33],
 ["apple","Apple","g",52,0.3,14,0.2],
 ["peanut","Peanut butter","g",588,25,20,50],
 ["wrap","Plain tortilla wrap","g",312,8,52,8],
 ["beans","Cooked kidney beans","g",127,8.7,22.8,0.5],
 ["hummus","Hummus","g",166,7.9,14.3,9.6]
].map(([id,name,unit,calories,proteinG,carbsG,fatG])=>({
 id:"demo:"+id,name,unit,calories,proteinG,carbsG,fatG,
 source:"Fictional illustrative nutrition values — not sourced to UK product labels",
 demoReviewed:true,liveVerified:false
}));
const clone=x=>JSON.parse(JSON.stringify(x));
const num=(x,min,max,label)=>{if(x===""||x==null||!Number.isFinite(Number(x))||Number(x)<min||Number(x)>max)throw Error(label+" must be "+min+"–"+max+".");return Number(x);};
const clean=(x,max=150)=>String(x??"").trim().slice(0,max);
const round=x=>Math.round(x);
const forbidden=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:phone|email|address|dob|date of birth|NHS|medication|diagnos(?:is|ed)|medical history|allerg(?:y|ies))\b/i;
export function initialNutrition(){
 return {clientId:"",age:"",weightKg:"",heightCm:"",sexForEstimate:"",activity:"",
 goal:"",calorieTarget:"",proteinTarget:"",carbTarget:"",fatTarget:"",
 name:"My nutrition plan",preferences:"",excludedFoods:"",budget:"",instructions:"",
 estimate:null,target:null,approvedFingerprint:"",prompt:"",reply:"",
 currentPlan:null,foods:clone(DEMO_FOODS),recipes:[],savedPlans:[],assignments:[]};
}
export function nutritionInputs(draft,client,enrolment){
 const verified=enrolment?.baseline?.coachVerified===true?enrolment.baseline:null;
 return {...draft,
  weightKg:draft.weightKg===""&&verified?.weightKg?String(verified.weightKg):draft.weightKg,
  heightCm:draft.heightCm===""&&verified?.heightCm?String(verified.heightCm):draft.heightCm,
  clientGoal:client?.goal||""};
}
export function calculateNutrition(raw){
 const weight=num(raw.weightKg,25,350,"Weight (kg)");
 const age=num(raw.age,18,100,"Age");
 if(!Object.hasOwn(ACTIVITY,raw.activity))throw Error("Select an activity level.");
 if(!["lose","maintain","gain"].includes(raw.goal))throw Error("Select a nutrition goal.");
 let estimate=null;
 if(raw.heightCm!==""&&raw.heightCm!=null&&["male","female"].includes(raw.sexForEstimate)){
  const height=num(raw.heightCm,125,230,"Height (cm)");
  const constant=raw.sexForEstimate==="male"?5:-161;
  const rawBmr=10*weight+6.25*height-5*age+constant;
  const maintenanceCalories=round(rawBmr*ACTIVITY[raw.activity]);
  const factor=raw.goal==="lose"?.9:raw.goal==="gain"?1.1:1;
  estimate={bmr:round(rawBmr),maintenanceCalories,recommendedCalories:round(maintenanceCalories*factor),
   activityFactor:ACTIVITY[raw.activity],goalFactor:factor,method:"Mifflin–St Jeor"};
 }
 const manual=String(raw.calorieTarget??"").trim()!=="";
 if(!estimate&&!manual)throw Error("Height and formula setting are required for an estimate. Alternatively enter a coach-reviewed manual calorie target.");
 const calories=manual?num(raw.calorieTarget,1200,5500,"Daily calories"):estimate.recommendedCalories;
 if(calories<1200||calories>5500)throw Error("Estimated calories are outside the supported range. Enter a reviewed manual target.");
 const keys=["proteinTarget","carbTarget","fatTarget"];
 const overrides=keys.filter(k=>String(raw[k]??"").trim()!=="");
 if(overrides.length&&overrides.length!==3)throw Error("To override macros, complete all three macro fields or leave all three blank.");
 const proteinG=overrides.length?num(raw.proteinTarget,20,400,"Protein (g)"):round(weight*1.8);
 const fatG=overrides.length?num(raw.fatTarget,15,240,"Fat (g)"):round(weight*.8);
 const carbsG=overrides.length?num(raw.carbTarget,0,900,"Carbs (g)"):round((calories-proteinG*4-fatG*9)/4);
 if(carbsG<0)throw Error("Calculated carbohydrate allowance is below zero; review the calorie target.");
 const macroCalories=proteinG*4+carbsG*4+fatG*9,energyGap=macroCalories-calories;
 if(overrides.length&&Math.abs(energyGap)>Math.max(20,calories*.02))throw Error("Macros do not balance with calories (4/4/9 kcal per gram).");
 const warnings=[];
 if(!estimate)warnings.push("No maintenance estimate: coach-entered calorie target.");
 if(calories<1500)warnings.push("Low calorie target: review appropriateness.");
 if(estimate&&manual&&Math.abs(calories-estimate.recommendedCalories)>estimate.recommendedCalories*.2)
  warnings.push("Manual target differs by more than 20% from the estimate.");
 if(carbsG<50)warnings.push("Low carbohydrate allocation: review suitability.");
 return {calories,proteinG,carbsG,fatG,macroCalories,energyGap,estimate,warnings,
  method:manual?"coach-entered":"Mifflin–St Jeor estimate"};
}
export function inputFingerprint(raw){return JSON.stringify([
 raw.clientId,raw.age,raw.weightKg,raw.heightCm,raw.sexForEstimate,raw.activity,raw.goal,
 raw.calorieTarget,raw.proteinTarget,raw.carbTarget,raw.fatTarget
 ]);}
export function approveNutrition(raw){const target=calculateNutrition(raw);return {...raw,target,estimate:target.estimate,approvedFingerprint:inputFingerprint(raw),prompt:"",reply:""};}
export function isNutritionApproved(raw){return !!(raw.target&&raw.approvedFingerprint===inputFingerprint(raw));}
export function validateFood(food){
 return !!(food&&/^([a-z]+):[a-z0-9-]+$/.test(food.id)&&clean(food.name).length>=2&&
 ["g","ml"].includes(food.unit)&&["calories","proteinG","carbsG","fatG"].every(k=>Number.isFinite(food[k])&&food[k]>=0&&food[k]<=1000)&&
 typeof food.source==="string"&&food.source.length>=8&&food.demoReviewed===true);
}
export function saveDemoIngredient(foods,raw){
 if(foods.length>=80)throw Error("Demo ingredient limit reached.");
 const name=clean(raw.name,80),unit=raw.unit,source=clean(raw.source,200);
 if(name.length<2||!["g","ml"].includes(unit)||source.length<8)throw Error("Add an ingredient name, unit and label/source note.");
 const values={};
 for(const k of ["calories","proteinG","carbsG","fatG"])values[k]=num(raw[k],0,1000,k);
 const food={id:"custom:food-"+(foods.length+1),name,unit,...values,source,
  demoReviewed:true,liveVerified:false};
 if(foods.some(f=>f.name.toLowerCase()===name.toLowerCase()))throw Error("Ingredient already exists.");
 return [...foods,food];
}
export function safePromptText(raw){
 const fields=["name","preferences","excludedFoods","budget","instructions","clientGoal"];
 for(const k of fields)if(forbidden.test(raw[k]||""))throw Error("Remove personal/contact and health information from the prompt. Dietary safety must be reviewed separately.");
 if(!isNutritionApproved(raw))throw Error("Approve calorie and macro targets first.");
}
export function generateMealPrompt(raw){
 safePromptText(raw);
 const allowed=raw.foods.filter(validateFood);
 if(!allowed.length)throw Error("No demo-reviewed ingredients are available.");
 const intent={
 planName:clean(raw.name,90),goal:raw.goal,calories:raw.target.calories,
 proteinG:raw.target.proteinG,carbsG:raw.target.carbsG,fatG:raw.target.fatG,
 foodPreferences:clean(raw.preferences,350),foodsToAvoid:clean(raw.excludedFoods,250),
 budget:clean(raw.budget,130),coachInstructions:clean(raw.instructions,400),
 trainingSessionsPerWeek:raw.trainingSessionsPerWeek||null,
  ageBand:Math.floor(Number(raw.age)/10)*10+"s",weightKg:Number(raw.weightKg),activity:raw.activity,
  generalTrainingGoal:clean(raw.clientGoal,150)
 };
 const lines=[
 "TRAINSMART COACHING — FICTIONAL ANONYMOUS AI MEAL DRAFT",
 "You assist a qualified coach. This is a fictional preview, not nutrition, allergy or medical advice.",
 "Return ONE JSON object only. No Markdown or code fences. Do not include client names or private identifiers.",
 "Use EXACTLY four unique options for each: breakfast, lunch, dinner, snacks (16 different names).",
 "You may use an existing food ID from allowedFoods OR suggest ANY reasonable new food by its plain name.",
 "For a catalogue food, use {ingredientId,quantity,unit}. For a NEW food, use {name,quantity,unit}.",
 "Never invent ingredient IDs, nutrient amounts, calories, macros, or sources. Do not supply nutrition figures.",
 "For every meal specify name, servings:1, ingredients:[{ingredientId OR name,quantity,unit}], steps:[short strings].",
 "Quantity refers to the edible amount PER SERVING. Use g or ml only; catalogue ingredient units must match existing entries exactly.",
 "Choose reasonable portions and varied meals. Try to make one choice from each category fit daily targets.",
 "Do not state that these meals are allergy-safe. Coach independently checks foods, labels, quantities and exclusions.",
 'Schema: {"format":"TRAINSMART_MEALS_V2","categories":{"breakfast":[{"name":"...","servings":1,"ingredients":[{"name":"Mango flesh","quantity":120,"unit":"g"},{"ingredientId":"demo:oats","quantity":60,"unit":"g"}],"steps":["..."]}],"lunch":[],"dinner":[],"snacks":[]}}',
 "A legacy TRAINSMART_MEALS_V1 import is supported for old plans, but use V2 for unlimited food choices.",
 "Any NEW food is added to a review queue, where the coach must supply a source and per-100 g/ml nutrition values before saving or assigning the finished plan.",
 "Do NOT output nutrition totals: TrainSmart recalculates them only from coach-reviewed ingredient entries.",
 "coachBrief: "+JSON.stringify(intent),
 "allowedFoods: "+JSON.stringify(allowed.map(x=>({ingredientId:x.id,name:x.name,unit:x.unit})))
 ];
 const result=lines.join("\n");if(result.length>30000)throw Error("Prompt too long.");return result;
}
export function calculateRecipe(meal,foods){
 if(!meal||typeof meal!=="object"||Array.isArray(meal))throw Error("Meal must be an object.");
 const name=clean(meal.name,100);
 if(name.length<3)throw Error("Every meal requires a unique name of at least 3 characters.");
 const servings=num(meal.servings,1,8,"Servings");
 if(!Number.isInteger(servings))throw Error("Servings must be whole numbers.");
 if(!Array.isArray(meal.ingredients)||meal.ingredients.length<1||meal.ingredients.length>24)throw Error("Each meal needs 1–24 measured ingredients.");
 const ingredients=meal.ingredients.map(x=>{
  if(!x||typeof x!=="object")throw Error("Invalid ingredient row.");
  const food=foods.find(f=>f.id===x.ingredientId&&validateFood(f));
  if(!food)throw Error("Unknown or unreviewed ingredient "+String(x.ingredientId).slice(0,70));
  const quantity=num(x.quantity,.1,2000,food.name+" quantity");
  if(x.unit!==food.unit)throw Error(food.name+" must be measured in "+food.unit+" until conversions are verified.");
  return {ingredientId:food.id,quantity,unit:food.unit,name:food.name};
 });
 if(!Array.isArray(meal.steps)||!meal.steps.length||meal.steps.length>12||
  meal.steps.some(s=>typeof s!=="string"||s.trim().length<2||s.length>350))throw Error("Add 1–12 short preparation steps.");
 const nutrition={calories:0,proteinG:0,carbsG:0,fatG:0};
 for(const row of ingredients){
  const food=foods.find(f=>f.id===row.ingredientId);
  for(const k of Object.keys(nutrition))nutrition[k]+=food[k]*row.quantity/100;
 }
 for(const k of Object.keys(nutrition))nutrition[k]=Math.round(nutrition[k]*10)/10;
 return {name,servings,ingredients,steps:meal.steps.map(x=>x.trim()),nutrition};
}
export function parseMealsJSON(text,foods,excludedFoods=""){
 let raw=String(text||"").trim();
 if(raw.length<2||raw.length>45000)throw Error("Paste a complete JSON response.");
  if(raw.startsWith("\u0060\u0060\u0060")){
  const m=raw.match(/^\u0060\u0060\u0060(?:json)?\s*\n([\s\S]*?)\n\u0060\u0060\u0060\s*$/i);
  if(!m)throw Error("Paste a single complete JSON block.");raw=m[1];
 }
 let doc;try{doc=JSON.parse(raw);}catch{throw Error("Invalid JSON. Ask ChatGPT for one valid JSON object.");}
 if(!doc||Array.isArray(doc)||doc.format!=="TRAINSMART_MEALS_V1"||!doc.categories||typeof doc.categories!=="object")
  throw Error("Expected TRAINSMART_MEALS_V1 with four meal categories.");
 const categories={},names=new Set();
 const excluded=String(excludedFoods||"").toLowerCase().split(/[,;\n]/).map(x=>x.trim()).filter(x=>x.length>2);
 for(const kind of MEAL_KINDS){
  if(!Array.isArray(doc.categories[kind])||doc.categories[kind].length!==4)throw Error("Provide exactly four "+kind+" options.");
  categories[kind]=doc.categories[kind].map(x=>{
   const meal=calculateRecipe(x,foods),key=meal.name.toLowerCase();
   if(excluded.some(term=>meal.ingredients.some(row=>row.name.toLowerCase().includes(term))))
    throw Error("An imported ingredient matches an excluded food preference. Review the recipe before importing.");
   if(names.has(key))throw Error("All 16 meals must have unique names.");
   names.add(key);return meal;
  });
 }
 return {format:"TRAINSMART_MEALS_V1",categories,reviewStatus:"draft",notes:[],
  notice:"Fictional example nutrition data only; independently verify UK labels and food safety before real use."};
}
export function bestMealDay(plan,target){
 if(!plan||!target)return null;
 let best=null;
 for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let c=0;c<4;c++)for(let d=0;d<4;d++){
  const choices={breakfast:a,lunch:b,dinner:c,snacks:d};
  const totals={calories:0,proteinG:0,carbsG:0,fatG:0};
  for(const kind of MEAL_KINDS)for(const k of Object.keys(totals))totals[k]+=plan.categories[kind][choices[kind]].nutrition[k];
  const relative=k=>Math.abs(totals[k]-target[k])/Math.max(1,target[k]);
  const score=relative("calories")*2+relative("proteinG")+relative("carbsG")*.6+relative("fatG")*.6;
  const within=relative("calories")<=.1&&relative("proteinG")<=.2&&relative("carbsG")<=.2&&relative("fatG")<=.2;
  if(!best||score<best.score)best={choices,totals,score,within};
 }
 return best;
}
export function storeMealRecipe(recipes,meal,foods){
 const recipe=calculateRecipe(meal,foods);
 const id="recipe:"+(recipes.length+1);
 return [...recipes,{id,...clone(recipe)}];
}
export function saveNutritionPlan(plans,plan,target,name,foods){
 if(!plan||!target)throw Error("Build or import a meal plan and approve targets first.");
 const categories={},seen=new Set();
 for(const kind of MEAL_KINDS){
  if(!Array.isArray(plan.categories?.[kind])||plan.categories[kind].length!==4)throw Error("Exactly four meals are required in each category.");
  categories[kind]=plan.categories[kind].map(x=>{
   const meal=calculateRecipe(x,foods),key=meal.name.toLowerCase();
   if(seen.has(key))throw Error("All 16 meals need unique names.");
   seen.add(key);return meal;
  });
 }
 const title=clean(name,90);
 if(title.length<3)throw Error("Enter a plan name.");
 const existing=plans.find(p=>p.name.toLowerCase()===title.toLowerCase());
 const version=existing?existing.versions.length+1:1;
 const snapshot={format:"TRAINSMART_MEALS_V1",categories,target:clone(target),savedAt:new Date().toISOString()};
 if(existing)return plans.map(p=>p===existing?{...p,versions:[...p.versions,{version,plan:snapshot}]}:p);
 return [...plans,{id:"mealplan:"+(plans.length+1),name:title,versions:[{version,plan:snapshot}]}];
}
export function assignNutritionPlan(assignments,template,clientId){
 const last=template?.versions?.at(-1);
 if(!last||!clientId)throw Error("Select a saved plan and a fictional client.");
 return [...assignments.map(x=>x.clientId===clientId?{...x,current:false}:x),
  {id:"mealassignment:"+(assignments.length+1),clientId,templateId:template.id,
   name:template.name,version:last.version,plan:clone(last.plan),current:true}];
}
export function demoMealJSON(foods){
 const ids=foods.filter(validateFood).map(x=>x.id);
 if(ids.length<4)throw Error("At least four available ingredients are required.");
 const sets={
  breakfast:[["Oat berry breakfast",[[0,60],[1,180],[3,80]]],["Yogurt and banana bowl",[[2,200],[4,100]]],
   ["Scrambled egg toast",[[5,120],[6,80]]],["Fruit porridge",[[0,55],[1,200],[4,90]]]],
  lunch:[["Chicken rice bowl",[[7,150],[8,180],[14,100]]],["Tuna and tomato wrap",[[12,120],[21,65],[15,100]]],
   ["Tofu rice salad",[[13,180],[8,160],[16,80]]],["Bean potato bowl",[[22,160],[9,180],[15,100]]]],
  dinner:[["Salmon and potatoes",[[11,150],[9,200],[14,120]]],["Chicken pasta",[[7,160],[10,180],[15,100]]],
   ["Tofu vegetable pasta",[[13,180],[10,180],[14,120]]],["Tuna rice dinner",[[12,140],[8,200],[16,100]]]],
  snacks:[["Apple and peanut butter",[[19,160],[20,20]]],["Berry yogurt",[[2,170],[3,100]]],
   ["Cheese and tomato",[[18,35],[15,120]]],["Banana with yogurt",[[4,110],[2,140]]]]
 };
 const categories={};
 for(const kind of MEAL_KINDS)categories[kind]=sets[kind].map(([name,parts])=>({
  name,servings:1,ingredients:parts.map(([index,quantity])=>({
   ingredientId:ids[index%ids.length],quantity,unit:foods.find(x=>x.id===ids[index%ids.length])?.unit||"g"
  })),steps:["Measure the ingredients.","Prepare appropriately and serve."]
 }));
 return JSON.stringify({format:"TRAINSMART_MEALS_V1",categories},null,2);
}


/* D07.2 flexible ingredient bridge. The AI may suggest ANY food name; it never
 * creates trusted nutrition figures. New foods are PENDING until a coach
 * explicitly enters source + per-100 g/ml numbers in the review queue. */
export function unresolvedMealFoods(plan,foods){
 if(!plan?.categories)return [];
 const seen=new Set();
 for(const kind of MEAL_KINDS)for(const meal of plan.categories[kind]||[])
  for(const row of meal.ingredients||[]){
   const f=foods.find(x=>x.id===row.ingredientId);
   if(!f||!validateFood(f))seen.add(row.ingredientId);
  }
 return [...seen];
}
const foodKey=x=>String(x||"").trim().replace(/\s+/g," ").toLocaleLowerCase("en-GB");
function validFoodSuggestion(value){
 const name=clean(value,100);
 if(name.length<2||name.length>90||/[<>{}\[\]\x00-\x1f]/.test(name)||
    /https?:\/\/|www\.|@/.test(name)||forbidden.test(name))
  throw Error("New ingredients must have a plain food name (2–90 characters), not a URL, contact or medical note.");
 return name;
}
function pendingFoodId(foods){
 let id,seq=1;do{id="suggested:food-"+seq++;}while(foods.some(f=>f.id===id));
 return id;
}
function parseImportObject(text){
 let raw=String(text||"").trim();
 if(raw.length<2||raw.length>45000)throw Error("Paste a complete meal plan JSON response.");
 if(raw.startsWith("\u0060\u0060\u0060")){
  const match=raw.match(/^\u0060\u0060\u0060(?:json)?\s*\n([\s\S]*?)\n\u0060\u0060\u0060\s*$/i);
  if(!match)throw Error("Paste one complete JSON object.");raw=match[1];
 }
 try{const doc=JSON.parse(raw);if(doc&&typeof doc==="object"&&!Array.isArray(doc))return doc;}
 catch{}
 throw Error("The response is not valid JSON. Ask ChatGPT to return one JSON object.");
}
export function importFlexibleMeals(text,foods,excludedFoods=""){
 const doc=parseImportObject(text);
 if(doc.format==="TRAINSMART_MEALS_V1")
  return {plan:parseMealsJSON(text,foods,excludedFoods),foods:clone(foods),newFoods:[]};
 if(doc.format!=="TRAINSMART_MEALS_V2"||!doc.categories||
    typeof doc.categories!=="object"||Array.isArray(doc.categories))
  throw Error("Expected TRAINSMART_MEALS_V2 with breakfast, lunch, dinner and snacks.");
 const draftFoods=clone(foods),newFoods=[],names=new Set(),categories={};
 const excluded=String(excludedFoods||"").toLowerCase().split(/[,;\n]/).map(x=>x.trim()).filter(x=>x.length>2);
 for(const kind of MEAL_KINDS){
  const options=doc.categories[kind];
  if(!Array.isArray(options)||options.length!==4)throw Error("Provide exactly four "+kind+" meals.");
  categories[kind]=options.map(raw=>{
   if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("Every meal must be an object.");
   const name=clean(raw.name,100);
   if(name.length<3||names.has(foodKey(name)))throw Error("Every one of the 16 meals needs a different name.");
   names.add(foodKey(name));
   if(raw.servings!==1)throw Error("Each meal must specify servings: 1 for measured per-serving portions.");
   if(!Array.isArray(raw.ingredients)||raw.ingredients.length<1||raw.ingredients.length>24)
    throw Error("Meals need 1–24 ingredients.");
   if(!Array.isArray(raw.steps)||raw.steps.length<1||raw.steps.length>12||
      raw.steps.some(step=>typeof step!=="string"||step.trim().length<2||step.length>350))
    throw Error("Every meal needs 1–12 short preparation steps.");
   const ingredients=raw.ingredients.map(row=>{
    if(!row||typeof row!=="object"||Array.isArray(row))throw Error("Invalid ingredient.");
    const unit=row.unit;
    if(!["g","ml"].includes(unit))throw Error("Ingredient unit must be g or ml. Ask ChatGPT for a measurable edible amount.");
    const quantity=num(row.quantity,.1,2000,"Ingredient quantity");
    let food=typeof row.ingredientId==="string"?draftFoods.find(x=>x.id===row.ingredientId):null;
    if(!food&&typeof row.name==="string"){
     const newName=validFoodSuggestion(row.name);
     food=draftFoods.find(x=>foodKey(x.name)===foodKey(newName));
     if(!food){
      if(draftFoods.length>=200||newFoods.length>=110)throw Error("Too many new foods in one draft; review and split the plan.");
      food={id:pendingFoodId(draftFoods),name:newName,unit,
       calories:null,proteinG:null,carbsG:null,fatG:null,source:"",
       demoReviewed:false,liveVerified:false,needsReview:true};
      draftFoods.push(food);newFoods.push(food.id);
     }
    }
    if(!food)throw Error("Unknown ingredient ID without a food name. Ask ChatGPT to include its name.");
    if(food.unit!==unit)throw Error(food.name+" uses "+food.unit+" in the library; review the measurement before importing.");
    if(excluded.some(term=>food.name.toLowerCase().includes(term)))
     throw Error(food.name+" conflicts with a food to avoid. Ask ChatGPT to replace it.");
    return {ingredientId:food.id,quantity,unit,name:food.name};
   });
   const meal={name,servings:1,ingredients,steps:raw.steps.map(x=>x.trim()),nutrition:null};
   try{const done=calculateRecipe(meal,draftFoods);return {...done,needsReview:false};}
   catch(error){
    if(!ingredients.some(x=>!validateFood(draftFoods.find(f=>f.id===x.ingredientId))))throw error;
    return {...meal,needsReview:true};
   }
  });
 }
 return {plan:{format:"TRAINSMART_MEALS_V2",categories,reviewStatus:"ingredient-review",
   notes:[],notice:"New foods require coach-supplied label or composition figures before nutrient totals can be calculated."},
  foods:draftFoods,newFoods};
}
export function reviewSuggestedFood(foods,id,raw){
 const current=foods.find(x=>x.id===id);
 if(!current||!id.startsWith("suggested:")||validateFood(current))
  throw Error("Select an unreviewed suggested ingredient.");
 const source=clean(raw.source,200);
 if(source.length<8||forbidden.test(source))throw Error("Add a non-personal UK product label or composition source reference (at least eight characters).");
 const values={};
 for(const key of ["calories","proteinG","carbsG","fatG"])values[key]=num(raw[key],0,1000,key+" per 100 "+current.unit);
 return foods.map(f=>f.id===id?{...f,...values,source,demoReviewed:true,
  coachEntered:true,needsReview:false,liveVerified:false}:f);
}
export function updateNutritionReview(plan,foods){
 if(!plan)return null;
 const categories={};
 for(const kind of MEAL_KINDS)categories[kind]=(plan.categories?.[kind]||[]).map(meal=>{
  if(meal.ingredients?.some(x=>!validateFood(foods.find(f=>f.id===x.ingredientId))))
   return {...meal,needsReview:true,nutrition:null};
  return {...calculateRecipe(meal,foods),needsReview:false};
 });
 return {...plan,categories,reviewStatus:unresolvedMealFoods({categories},foods).length?"ingredient-review":"draft"};
}
export function demoNewFoodJSON(foods){
 const doc=JSON.parse(demoMealJSON(foods));
 doc.format="TRAINSMART_MEALS_V2";
 doc.categories.breakfast[0].ingredients[0]={name:"Fresh mango flesh",quantity:110,unit:"g"};
 doc.categories.lunch[1].ingredients[1]={name:"Roasted red pepper",quantity:95,unit:"g"};
 doc.categories.dinner[0].ingredients[2]={name:"Roasted red pepper",quantity:140,unit:"g"};
 return JSON.stringify(doc,null,2);
}
