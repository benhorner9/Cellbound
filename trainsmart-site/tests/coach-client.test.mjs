import test from "node:test";
import assert from "node:assert/strict";
import {currentAssignment,currentMealAssignment,nextSession,sessionHistory,storedSession,saveClientSession,lastWeight,
 weekStart,latestCheckin,saveWeeklyCheckin,MEAL_CATEGORIES,dailyMealSelections,logMealSelection,clearMealSelection} from "../public/coach-client-model.mjs";
const client=id=>({id,status:"Active",name:id});
const ex=(id,sets=2)=>({id,exerciseId:"demo:"+id,name:"Exercise "+id,prescription:{workingSets:sets,repsMin:8,repsMax:12,loadKg:null,restSeconds:90}});
const fixture=()=>({clients:[client("a"),client("b")],programmeAssignments:[
 {id:"assignment:one",clientId:"a",current:true,name:"Strength",sessions:[
 {id:"session:1",name:"Day one",exercises:[ex("row:1")]},
 {id:"session:2",name:"Day two",exercises:[ex("row:2",1)]}]},
 {id:"assignment:two",clientId:"b",current:true,name:"Other",sessions:[{id:"session:1",name:"Other day",exercises:[ex("row:3",1)]}]}
 ]});
const sets=(rowId,count=2)=>[{rowId,skipReason:"",sets:Array.from({length:count},()=>({reps:"10",loadKg:"25"}))}];
test("next session requires an assigned plan and preserves coach order",()=>{
 const s=fixture();
 assert.equal(nextSession(s,"a").index,0);
 assert.equal(nextSession(s,"b").session.name,"Other day");
 assert.equal(nextSession(s,"missing"),null);
 assert.equal(currentAssignment(s,"a").id,"assignment:one");
 assert.equal(currentMealAssignment({assignments:[{clientId:"a",current:true,name:"Meal plan"}]},"a").name,"Meal plan");
});
test("a draft stays on the same session and completion advances only once",()=>{
 let s=fixture();
 s=saveClientSession(s,"a","assignment:one",0,[{rowId:"row:1",skipReason:"",sets:[{reps:"10",loadKg:"25"},{reps:"",loadKg:""}]}]);
 assert.equal(nextSession(s,"a").index,0);
 assert.equal(storedSession(s,"a","assignment:one",0).completed,false);
 assert.equal(nextSession(s,"a").index,0);
});
test("completion, weight recall and isolation",()=>{
 let s=fixture();
 s=saveClientSession(s,"a","assignment:one",0,sets("row:1"),{complete:true,at:"2026-11-17T10:00:00Z"});
 assert.equal(nextSession(s,"a").index,1);
 assert.equal(sessionHistory(s,"a","assignment:one").length,1);
 assert.equal(sessionHistory(s,"b","assignment:two").length,0);
 assert.equal(lastWeight(s,"a","demo:row:1"),25);
 assert.equal(lastWeight(s,"b","demo:row:1"),null);
 assert.throws(()=>saveClientSession(s,"a","assignment:one",0,sets("row:1"),{complete:true}),/next ordered|completed/i);
 s=saveClientSession(s,"a","assignment:one",1,sets("row:2",1),{complete:true});
 assert.equal(nextSession(s,"a"),null);
 assert.equal(s.programmeAssignments[0].sessions[0].exercises[0].prescription.workingSets,2);
});
test("unfinished set blocks completion but does not block a draft",()=>{
 let s=fixture(), partial=[{rowId:"row:1",skipReason:"",sets:[{reps:"8",loadKg:"0"},{reps:"",loadKg:"25"}]}];
 s=saveClientSession(s,"a","assignment:one",0,partial);
 assert.throws(()=>saveClientSession(s,"a","assignment:one",0,partial,{complete:true}),/Log each set/);
 assert.equal(nextSession(s,"a").index,0);
});
test("skipping requires a reason and at least one performed set",()=>{
 let s=fixture();
 const skipped=[{rowId:"row:1",skipReason:"No time to train",sets:[{reps:"",loadKg:""},{reps:"",loadKg:""}]}];
 assert.throws(()=>saveClientSession(s,"a","assignment:one",0,skipped,{complete:true}),/at least one completed set/);
 const mixed=[{rowId:"row:1",skipReason:"No time to train",sets:[{reps:"9",loadKg:"25"},{reps:"",loadKg:""}]}];
 assert.throws(()=>saveClientSession(s,"a","assignment:one",0,mixed),/Skipped exercises/);
});
test("weekly check-in upserts only selected fictional client and increments revision",()=>{
 let s=fixture();
 assert.equal(weekStart("2026-11-17"),"2026-11-16");
 s=saveWeeklyCheckin(s,"a","2026-11-17",{energy:"3",sleep:"4",weightKg:"",notes:"Sample feedback"});
 assert.equal(latestCheckin(s,"a","2026-11-16").revision,1);
 assert.equal(latestCheckin(s,"b","2026-11-16"),null);
 s=saveWeeklyCheckin(s,"a","2026-11-17",{energy:"2",sleep:"3",weightKg:"80",notes:"Updated"});
 assert.equal(s.clientPortalCheckins.length,1);
 assert.equal(latestCheckin(s,"a","2026-11-16").revision,2);
 assert.throws(()=>saveWeeklyCheckin(s,"a","2026-11-17",{energy:"9",sleep:"2",weightKg:""}),/Energy/);
});


const mealFixture=()=>({assignments:[
 {clientId:"a",current:true,id:"mealassignment:1",plan:{categories:{
  breakfast:Array.from({length:4},(_,i)=>({name:"Breakfast "+(i+1)})),
  lunch:Array.from({length:4},(_,i)=>({name:"Lunch "+(i+1)})),
  dinner:Array.from({length:4},(_,i)=>({name:"Dinner "+(i+1)})),
  snacks:Array.from({length:4},(_,i)=>({name:"Snack "+(i+1)}))
 }}},
 {clientId:"b",current:true,id:"mealassignment:2",plan:{categories:{
  breakfast:Array.from({length:4},(_,i)=>({name:"B Breakfast "+(i+1)})),
  lunch:Array.from({length:4},(_,i)=>({name:"B Lunch "+(i+1)})),
  dinner:Array.from({length:4},(_,i)=>({name:"B Dinner "+(i+1)})),
  snacks:Array.from({length:4},(_,i)=>({name:"B Snack "+(i+1)}))
 }}}
]});
test("meal logging selects one of four assigned choices per category and per day",()=>{
 let s=fixture(),n=mealFixture();
 assert.deepEqual(MEAL_CATEGORIES,["breakfast","lunch","dinner","snacks"]);
 s=logMealSelection(s,n,"a","mealassignment:1","2026-11-17","breakfast",0);
 assert.equal(dailyMealSelections(s,"a","mealassignment:1","2026-11-17")[0].mealName,"Breakfast 1");
 s=logMealSelection(s,n,"a","mealassignment:1","2026-11-17","breakfast",3);
 assert.equal(s.clientMealLogs.length,1);
 assert.equal(s.clientMealLogs[0].optionIndex,3);
 s=logMealSelection(s,n,"a","mealassignment:1","2026-11-17","lunch",1);
 assert.equal(dailyMealSelections(s,"a","mealassignment:1","2026-11-17").length,2);
 assert.equal(dailyMealSelections(s,"a","mealassignment:1","2026-11-18").length,0);
 assert.equal(dailyMealSelections(s,"b","mealassignment:2","2026-11-17").length,0);
 s=clearMealSelection(s,n,"a","mealassignment:1","2026-11-17","breakfast");
 assert.equal(dailyMealSelections(s,"a","mealassignment:1","2026-11-17").length,1);
 assert.equal(s.clientMealLogs[0].mealName,"Lunch 2");
});
test("meal logger enforces current assignment and isolates historical snapshots",()=>{
 let s=fixture(),n=mealFixture();
 assert.throws(()=>logMealSelection(s,n,"a","mealassignment:2","2026-11-17","breakfast",1),/no longer assigned/i);
 assert.throws(()=>logMealSelection(s,n,"a","mealassignment:1","2026-11-17","dessert",1),/category/);
 assert.throws(()=>logMealSelection(s,n,"a","mealassignment:1","2026-11-17","breakfast",4),/four assigned/);
 assert.throws(()=>logMealSelection(s,n,"a","mealassignment:1","2026-02-30","breakfast",2),/date/);
 s=logMealSelection(s,n,"a","mealassignment:1","2026-11-17","dinner",2);
 const original=structuredClone(s.clientMealLogs[0]);
 n.assignments[0].current=false;
 n.assignments.push({...n.assignments[0],id:"mealassignment:3",current:true});
 assert.throws(()=>logMealSelection(s,n,"a","mealassignment:1","2026-11-17","dinner",3),/no longer assigned/);
 assert.deepEqual(s.clientMealLogs[0],original);
 assert.equal(dailyMealSelections(s,"a","mealassignment:3","2026-11-17").length,0);
});
