import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {initialNutrition,DEMO_FOODS,MEAL_KINDS,nutritionInputs,calculateNutrition,approveNutrition,
 isNutritionApproved,generateMealPrompt,parseMealsJSON,calculateRecipe,bestMealDay,saveNutritionPlan,
 storeMealRecipe,assignNutritionPlan,saveDemoIngredient,demoMealJSON} from "../public/coach-nutrition-model.mjs";
import {renderNutritionHub} from "../public/coach-nutrition-ui.mjs";
const base=()=>({...initialNutrition(),clientId:"demo-client",age:"35",weightKg:"80",heightCm:"175",
 sexForEstimate:"male",activity:"moderate",goal:"maintain",name:"Healthy Everyday Meals"});
const client={id:"demo-client",name:"PRIVATE DEMO NAME",status:"Active",goal:"Strength",trainingDays:3};
const ctx={clients:[client],enrolments:{"demo-client":{baseline:{heightCm:175,weightKg:80,coachVerified:true}}}};
test("D07: empty inputs never guess age, activity or estimation formula",()=>{
 assert.throws(()=>calculateNutrition(initialNutrition()),/Weight/);
 assert.throws(()=>calculateNutrition({...base(),age:""}),/Age/);
 assert.throws(()=>calculateNutrition({...base(),activity:""}),/Select an activity/);
 assert.throws(()=>calculateNutrition({...base(),heightCm:"",sexForEstimate:""}),/manual calorie target/);
});
test("D07: approved fictional baseline prefills existing height and weight without personal details",()=>{
 const d=nutritionInputs({...initialNutrition(),clientId:"demo-client"},client,ctx.enrolments["demo-client"]);
 assert.equal(d.weightKg,"80");assert.equal(d.heightCm,"175");assert.equal(d.age,"");
 assert.equal(d.clientGoal,"Strength");
 const notReviewed=nutritionInputs({...initialNutrition(),clientId:"demo-client"},client,{baseline:{heightCm:175,weightKg:80,coachVerified:false}});
 assert.equal(notReviewed.heightCm,"");
});
test("D07: Mifflin–St Jeor estimate preserves previous calculator formula and 4/4/9 macros",()=>{
 const t=calculateNutrition(base());
 const bmr=10*80+6.25*175-5*35+5;
 assert.equal(t.estimate.bmr,Math.round(bmr));
 assert.equal(t.estimate.maintenanceCalories,Math.round(bmr*1.55));
 assert.equal(t.calories,Math.round(bmr*1.55));
 assert.equal(t.proteinG,144);assert.equal(t.fatG,64);
 assert.equal(t.macroCalories,t.proteinG*4+t.carbsG*4+t.fatG*9);
 assert.ok(Math.abs(t.energyGap)<=2);
});
test("D07: goal factor and activity changes alter estimates",()=>{
 const x=calculateNutrition({...base(),goal:"lose",activity:"light"}),y=calculateNutrition({...base(),goal:"gain",activity:"active"});
 assert.ok(x.calories<y.calories);assert.equal(x.estimate.goalFactor,.9);assert.equal(y.estimate.goalFactor,1.1);
});
test("D07: manual calories works without sex-based setting if reviewed, but requires age, weight, activity",()=>{
 const v=calculateNutrition({...base(),heightCm:"",sexForEstimate:"",calorieTarget:"2300"});
 assert.equal(v.estimate,null);assert.equal(v.calories,2300);
 assert.equal(v.method,"coach-entered");
});
test("D07: macro overrides must be complete and respect 4/4/9 energy tolerance",()=>{
 assert.throws(()=>calculateNutrition({...base(),proteinTarget:"150"}),/all three/);
 assert.throws(()=>calculateNutrition({...base(),calorieTarget:"2200",proteinTarget:"140",carbTarget:"80",fatTarget:"90"}),/do not balance/);
 const t=calculateNutrition({...base(),calorieTarget:"2200",proteinTarget:"150",carbTarget:"250",fatTarget:"67"});
 assert.ok(Math.abs(t.energyGap)<=Math.max(20,t.calories*.02));
});
test("D07: any target input change invalidates previous approval",()=>{
 const d=approveNutrition(base());
 assert.equal(isNutritionApproved(d),true);
 assert.equal(isNutritionApproved({...d,activity:"light"}),false);
 assert.equal(isNutritionApproved({...d,weightKg:"79"}),false);
 assert.equal(isNutritionApproved({...d,calorieTarget:"2400"}),false);
 assert.equal(isNutritionApproved({...d,clientId:"someoneelse"}),false);
});
test("D07: only approved targets yield an anonymous prompt with exact allowed IDs",()=>{
 const d=approveNutrition(base());
 assert.throws(()=>generateMealPrompt({...d,age:"36"}),/Approve/);
 const p=generateMealPrompt({...d,trainingSessionsPerWeek:3});
 assert.match(p,/TRAINSMART COACHING/);
 assert.match(p,/allowedFoods:/);
 assert.match(p,/TRAINSMART_MEALS_V1/);
 assert.match(p,/exactly four unique/i);
 assert.doesNotMatch(p,/PRIVATE DEMO NAME|demo-client/);
 assert.doesNotMatch(p,/Fictional illustrative nutrition values/);
 assert.match(p,/"trainingSessionsPerWeek":3/);
});
test("D07: prompt blocks identifying and medical information in free text",()=>{
 const d=approveNutrition(base());
 for(const value of ["call at someone@example.com","phone 07700123456","medical history","allergies"]){
  assert.throws(()=>generateMealPrompt({...d,preferences:value}),/Remove personal/);
 }
});
test("D07: ingredient nutrition is recomputed; incoming AI figures are not authoritative",()=>{
 const valid=demoMealJSON(DEMO_FOODS),obj=JSON.parse(valid);
 obj.categories.breakfast[0].nutrition={calories:1,proteinG:999,carbsG:0,fatG:0};
 const plan=parseMealsJSON(JSON.stringify(obj),DEMO_FOODS);
 assert.equal(plan.categories.breakfast.length,4);
 assert.equal(MEAL_KINDS.flatMap(k=>plan.categories[k]).length,16);
 assert.ok(plan.categories.breakfast[0].nutrition.calories>1);
 assert.equal(plan.categories.breakfast[0].nutrition.proteinG<999,true);
});
test("D07: JSON accepts fenced response but rejects duplicate meal names and missing meals",()=>{
 const input=demoMealJSON(DEMO_FOODS);
 assert.equal(parseMealsJSON("\u0060\u0060\u0060json\n"+input+"\n\u0060\u0060\u0060",DEMO_FOODS).categories.lunch.length,4);
 let obj=JSON.parse(input);obj.categories.snacks.pop();
 assert.throws(()=>parseMealsJSON(JSON.stringify(obj),DEMO_FOODS),/exactly four/);
 obj=JSON.parse(input);obj.categories.snacks[0].name=obj.categories.dinner[0].name;
 assert.throws(()=>parseMealsJSON(JSON.stringify(obj),DEMO_FOODS),/unique/);
});
test("D07: reject unknown food IDs, mismatched units and zero quantities",()=>{
 const obj=JSON.parse(demoMealJSON(DEMO_FOODS));
 obj.categories.breakfast[0].ingredients[0].ingredientId="fake:ingredient";
 assert.throws(()=>parseMealsJSON(JSON.stringify(obj),DEMO_FOODS),/Unknown/);
 obj.categories.breakfast[0].ingredients[0].ingredientId="demo:oats";
 obj.categories.breakfast[0].ingredients[0].unit="ml";
 assert.throws(()=>parseMealsJSON(JSON.stringify(obj),DEMO_FOODS),/measured/);
 obj.categories.breakfast[0].ingredients[0].unit="g";obj.categories.breakfast[0].ingredients[0].quantity=0;
 assert.throws(()=>parseMealsJSON(JSON.stringify(obj),DEMO_FOODS),/quantity/);
});
test("D07: 256 possible meal combinations scored against approved target",()=>{
 const plan=parseMealsJSON(demoMealJSON(DEMO_FOODS),DEMO_FOODS);
 const day=bestMealDay(plan,calculateNutrition(base()));
 assert.equal(Object.keys(day.choices).length,4);
 assert.ok(day.totals.calories>0);
});
test("D07: saved recipes, plan versions and independent assignment snapshots",()=>{
 const plan=parseMealsJSON(demoMealJSON(DEMO_FOODS),DEMO_FOODS),t=calculateNutrition(base());
 const recipes=storeMealRecipe([],plan.categories.breakfast[0],DEMO_FOODS);
 assert.equal(recipes.length,1);
 let lib=saveNutritionPlan([],plan,t,"Everyday Nutrition",DEMO_FOODS);
 assert.equal(lib[0].versions[0].version,1);
 const assignments=assignNutritionPlan([],lib[0],"demo-client");
 const prior=JSON.stringify(assignments[0].plan);
 lib=saveNutritionPlan(lib,plan,t,"Everyday Nutrition",DEMO_FOODS);
 assert.equal(lib[0].versions.length,2);
 assert.equal(JSON.stringify(assignments[0].plan),prior);
 assert.equal(assignments[0].current,true);
});
test("D07: manual ingredient requires a source note and measured nutrient profile",()=>{
 assert.throws(()=>saveDemoIngredient(DEMO_FOODS,{name:"Pear",unit:"g",source:"",calories:50,proteinG:0,carbsG:12,fatG:0}),/source/);
 const f=saveDemoIngredient(DEMO_FOODS,{name:"Pear",unit:"g",source:"Example label from shop",calories:50,proteinG:0,carbsG:12,fatG:0});
 assert.equal(f.at(-1).liveVerified,false);
 const x=calculateRecipe({name:"Test pear slices",servings:1,ingredients:[{ingredientId:f.at(-1).id,quantity:150,unit:"g"}],steps:["Wash and serve"]},f);
 assert.equal(x.nutrition.calories,75);
});
test("D07: focused nutrition layout exposes goals and clear workflow navigation",()=>{
 const html=renderNutritionHub(ctx);
 for(const word of ["Daily activity","Age (18–100)","Calculate targets","Approve targets","Meal planning",
 "Targets","Create plan","Meal editor","Library"]){
  assert.ok(html.includes(word),word);
 }
 assert.match(html,/role="tablist"/);
 assert.doesNotMatch(html,/<h3>Saved meal plans<\/h3>/);
 assert.match(html,/data-nut-field="clientId"/);
 assert.doesNotMatch(html,/fetch\(/);
});
test("D07: live preview has no background API, maintains prior D06 imports and standalone static assets",async()=>{
 const [hub,html,ui,model]=await Promise.all(["coach-hub.mjs","coach-hub.html","coach-nutrition-ui.mjs","coach-nutrition-model.mjs"]
  .map(file=>readFile(new URL("../public/"+file,import.meta.url),"utf8")));
 assert.match(hub,/renderNutritionHub/);
 assert.match(hub,/renderAIBriefWorkflow|renderProgrammesCentre/);
 assert.match(html,/coach-nutrition\.css/);
 assert.match(html,/data-view="nutrition"/);
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(ui+model,/\bfetch\s*\(|\bXMLHttpRequest\s*\(|\bWebSocket\s*\(|service_role|supabase\.co/i);
});

test("D07.1: Meals & Nutrition shortcut and direct hash router remain accessible",async()=>{
 const [hub,html,css]=await Promise.all(["coach-hub.mjs","coach-hub.html","coach-hub.css"].map(p=>
  readFile(new URL("../public/"+p,import.meta.url),"utf8")));
 assert.match(html,/<a class="btn btn-outline nutrition-shortcut" href="#nutrition" id="nutrition-shortcut">Open nutrition<\/a>/);
 assert.match(hub,/COACH_VIEWS=Object\.freeze/);
 assert.match(hub,/window\.location\.hash\.slice\(1\)/);
 assert.match(hub,/hashchange/);
 assert.match(hub,/window\.history\.replaceState/);
 assert.match(css,/page-heading-actions/);
 assert.match(css,/max-width:700px/);
});
