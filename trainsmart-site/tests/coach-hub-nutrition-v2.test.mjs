import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {DEMO_FOODS,initialNutrition,calculateNutrition,demoNewFoodJSON,
 generateMealPrompt,approveNutrition,importFlexibleMeals,unresolvedMealFoods,
 reviewSuggestedFood,updateNutritionReview,saveNutritionPlan,assignNutritionPlan,
 calculateRecipe,parseMealsJSON} from "../public/coach-nutrition-model.mjs";
const source=()=>JSON.parse(demoNewFoodJSON(DEMO_FOODS));
const importPlan=x=>importFlexibleMeals(JSON.stringify(x),DEMO_FOODS);
const target=()=>calculateNutrition({age:"36",weightKg:"82",heightCm:"178",sexForEstimate:"male",activity:"moderate",goal:"maintain"});
test("D07.2 ChatGPT brief explicitly allows named new foods without invented calories or IDs",()=>{
 const d=approveNutrition({...initialNutrition(),clientId:"fictional",age:"36",weightKg:"82",heightCm:"178",sexForEstimate:"male",activity:"moderate",goal:"maintain"});
 const brief=generateMealPrompt(d);
 assert.match(brief,/TRAINSMART_MEALS_V2/);
 assert.match(brief,/ANY reasonable new food/);
 assert.match(brief,/new food by its plain name|NEW food, use/);
 assert.match(brief,/Do not supply nutrition figures/);
 assert.doesNotMatch(brief,/Use ONLY ingredientId/);
});
test("D07.2 imports sixteen creative recipes and de-duplicates novel ingredients across meals",()=>{
 const r=importPlan(source());
 assert.equal(r.plan.categories.breakfast.length,4);
 assert.equal(Object.values(r.plan.categories).flat().length,16);
 assert.equal(r.newFoods.length,2);
 assert.equal(r.foods.length,DEMO_FOODS.length+2);
 assert.equal(r.plan.reviewStatus,"ingredient-review");
 const ids=r.plan.categories.dinner[0].ingredients.map(x=>x.ingredientId);
 assert.ok(ids.includes("suggested:food-2"));
 assert.deepEqual(unresolvedMealFoods(r.plan,r.foods).sort(),r.newFoods.sort());
 assert.equal(r.plan.categories.breakfast[0].nutrition,null);
 assert.equal(r.foods.find(x=>x.id===r.newFoods[0]).calories,null);
});
test("D07.2 incomplete ingredient nutrition is never mistaken for zero or trusted AI figures",()=>{
 const doc=source();
 doc.categories.breakfast[0].nutrition={calories:9999,proteinG:9999,carbsG:0,fatG:0};
 doc.categories.breakfast[0].ingredients[0].calories=2;
 const r=importPlan(doc);
 assert.equal(r.plan.categories.breakfast[0].nutrition,null);
 assert.equal(r.foods.find(f=>f.id===r.newFoods[0]).calories,null);
 assert.throws(()=>saveNutritionPlan([],r.plan,target(),"New foods plan",r.foods),/unreviewed|Unknown/);
});
test("D07.2 labels and source values must be complete before accepting new ingredients",()=>{
 const r=importPlan(source());
 const id=r.newFoods[0];
 const numbers={calories:58,proteinG:1,carbsG:13,fatG:.5};
 assert.throws(()=>reviewSuggestedFood(r.foods,id,{...numbers,source:""}),/source/);
 assert.throws(()=>reviewSuggestedFood(r.foods,id,{...numbers,source:"email someone@example.com"}),/source/);
 assert.throws(()=>reviewSuggestedFood(r.foods,id,{...numbers,source:"UK retail label",calories:""}),/Calories|calories/);
 const reviewed=reviewSuggestedFood(r.foods,id,{...numbers,source:"UK grocery label 2026"});
 const f=reviewed.find(x=>x.id===id);
 assert.equal(f.demoReviewed,true);
 assert.equal(f.coachEntered,true);
 assert.equal(f.liveVerified,false);
 assert.equal(f.calories,58);
 assert.deepEqual(unresolvedMealFoods(r.plan,reviewed),[r.newFoods[1]]);
});
test("D07.2 after review, all 16 meal totals recalculate and versioned plan can be saved",()=>{
 let r=importPlan(source()), foods=r.foods;
 for(const id of r.newFoods)foods=reviewSuggestedFood(foods,id,{
  calories:50,proteinG:1.5,carbsG:9,fatG:.4,source:"UK composition table example"});
 const ready=updateNutritionReview(r.plan,foods);
 assert.deepEqual(unresolvedMealFoods(ready,foods),[]);
 assert.equal(ready.reviewStatus,"draft");
 assert.ok(ready.categories.breakfast[0].nutrition.calories>0);
 const p=saveNutritionPlan([],ready,target(),"Flexible Food Choices",foods);
 assert.equal(p[0].versions[0].plan.categories.breakfast.length,4);
 const assigned=assignNutritionPlan([],p[0],"demo-client");
 assert.equal(assigned[0].plan.categories.dinner.length,4);
});
test("D07.2 can reuse known food by plain name and respects measured unit",()=>{
 const doc=source();
 doc.categories.breakfast[0].ingredients[0]={name:" Porridge oats ",quantity:50,unit:"g"};
 let r=importPlan(doc);
 assert.equal(r.plan.categories.breakfast[0].ingredients[0].ingredientId,"demo:oats");
 assert.equal(r.newFoods.length,1);
 doc.categories.breakfast[0].ingredients[0].unit="ml";
 assert.throws(()=>importPlan(doc),/uses g/);
});
test("D07.2 prevents excluded foods, unknown IDs without names and invalid portions",()=>{
 const doc=source();
 assert.throws(()=>importFlexibleMeals(JSON.stringify(doc),DEMO_FOODS,"mango"),/conflicts/);
 doc.categories.breakfast[0].ingredients[0]={ingredientId:"invented:food",unit:"g",quantity:50};
 assert.throws(()=>importPlan(doc),/Unknown ingredient ID/);
 doc.categories.breakfast[0].ingredients[0]={name:"Pear",unit:"pieces",quantity:1};
 assert.throws(()=>importPlan(doc),/must be g or ml/);
 doc.categories.breakfast[0].ingredients[0]={name:"Pear",unit:"g",quantity:0};
 assert.throws(()=>importPlan(doc),/quantity/);
});
test("D07.2 ingredient names must be bounded, plain food descriptions",()=>{
 for(const input of ["<script>alert(1)</script>","someone@example.com","https://example.com/pear"]){
  const doc=source();doc.categories.breakfast[0].ingredients[0]={name:input,quantity:20,unit:"g"};
  assert.throws(()=>importPlan(doc),/plain food name/);
 }
});
test("D07.2 repeated import finds pending foods by name without adding duplicate records",()=>{
 const first=importPlan(source());
 const second=importFlexibleMeals(demoNewFoodJSON(DEMO_FOODS),first.foods);
 assert.equal(second.newFoods.length,0);
 assert.equal(second.foods.length,first.foods.length);
 assert.equal(unresolvedMealFoods(second.plan,second.foods).length,2);
});
test("D07.2 still supports older strict V1 importer unchanged",async()=>{
 const {demoMealJSON}=await import("../public/coach-nutrition-model.mjs");
 const x=demoMealJSON(DEMO_FOODS);
 const legacy=importFlexibleMeals(x,DEMO_FOODS);
 assert.equal(legacy.plan.format,"TRAINSMART_MEALS_V1");
 assert.equal(legacy.newFoods.length,0);
 assert.equal(legacy.plan.categories.snacks.length,4);
 const direct=parseMealsJSON(x,DEMO_FOODS);
 assert.deepEqual(legacy.plan.categories,direct.categories);
});
test("D07.2 UI exposes review queue and pending status without new outbound calls",async()=>{
 const [model,ui]=await Promise.all(["coach-nutrition-model.mjs","coach-nutrition-ui.mjs"].map(f=>
  readFile(new URL("../public/"+f,import.meta.url),"utf8")));
 assert.match(ui,/renderPendingIngredients/);
 assert.match(ui,/data-nut-action="review-food"/);
 assert.match(ui,/data-review-field/);
 assert.match(ui,/importFlexibleMeals/);
 assert.match(ui,/updateNutritionReview/);
 assert.match(ui,/Try new ingredients example/);
 assert.match(model,/TRAINSMART_MEALS_V2/);
 assert.doesNotMatch(ui+model,/\bfetch\s*\(|\bXMLHttpRequest\s*\(|\bWebSocket\s*\(/);
});
