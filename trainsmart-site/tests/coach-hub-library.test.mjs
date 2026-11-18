import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {defaultClients} from "../public/coach-clients-model.mjs";
import {SESSION_TEMPLATES} from "../public/coach-sessions-model.mjs";
import {
 EQUIPMENT,GYM_PRESET,MOVEMENTS,SKILL_LEVELS,METHOD_TYPES,EXERCISE_FIXTURES,METHOD_FIXTURES,
 validEquipmentIds,equipmentName,defaultClientEquipment,validExercise,createExercise,editExercise,
 setExerciseReviewed,setExerciseActive,canUseForActualProgramme,exerciseEligible,filterExercises,
 substitutionOptions,missingExerciseReferences,validMethod,createMethod,editMethod,
 setMethodReviewed,canUseMethodInActualProgramme,validLibraryState,initialLibrary,setClientEquipment,libraryStats
} from "../public/coach-library-model.mjs";
import {renderLibraryCentre,exerciseDialog,methodDialog} from "../public/coach-library-ui.mjs";
const clients=defaultClients(),first=clients[0],second=clients[1];
const goodExercise={
 name:"Coach demo split squat",movement:"lunge",category:"Lower body",level:"beginner",
 primaryEquipment:"dumbbells",secondaryEquipment:"bodyweight",substitutions:"demo:goblet-squat",
 tags:"strength, lower",setupNotes:"Coach review before use",cues:"Example only",videoUrl:"https://example.org/video"
};
const goodMethod={name:"Coach example sets",type:"straight",feederSets:"1",workingSets:"3",
 repsMin:"8",repsMax:"10",rir:"2",tempo:"2-0-2-0",restSeconds:"90",notes:"Only for testing."};
test("D05: TrainSmart Gym preset contains every owner-listed equipment item, with stable unique IDs",()=>{
 assert.equal(EQUIPMENT.length,10);
 assert.equal(new Set(EQUIPMENT.map(x=>x.id)).size,10);
 for(const item of ["barbell-rack","dumbbells","medicine-balls","boxes","rower","trx","air-bike","skierg","bands"]){
  assert.ok(GYM_PRESET.includes(item),item);
 }
 assert.equal(equipmentName("skierg"),"SkiErg");
 assert.equal(validEquipmentIds(GYM_PRESET),true);
 assert.equal(validEquipmentIds(["dumbbells","dumbbells"]),false);
 assert.equal(validEquipmentIds(["unrecognised"]),false);
});
test("D05: initial demo exercises and methods are valid but NOT approved source records",()=>{
 const lib=initialLibrary(clients);
 assert.equal(lib.exercises.length,14);
 assert.equal(lib.methods.length,4);
 assert.equal(validLibraryState(lib),true);
 assert.ok(lib.exercises.every(validExercise));
 assert.ok(lib.methods.every(validMethod));
 assert.ok(lib.exercises.every(x=>x.reviewStatus==="pending"&&x.source==="fictional-example"));
 assert.ok(lib.methods.every(x=>x.reviewStatus==="pending"&&x.source==="fictional-example"));
 assert.ok(EXERCISE_FIXTURES.every(x=>x.id.startsWith("demo:")));
 assert.equal(new Set(EXERCISE_FIXTURES.map(x=>x.id)).size,14);
 assert.equal(METHOD_TYPES.length,4);
});
test("D05: per-client equipment differs from Gym preset and edits never mutate source client profiles",()=>{
 const lib=initialLibrary(clients);
 const original=defaultClientEquipment(second);
 assert.deepEqual(original,["dumbbells","bands"]);
 assert.deepEqual(defaultClientEquipment(first),GYM_PRESET);
 const changed=setClientEquipment(lib,second.id,["dumbbells","bands","bodyweight"]);
 assert.equal(lib.clientEquipment[second.id].includes("bodyweight"),false);
 assert.equal(changed.clientEquipment[second.id].includes("bodyweight"),true);
 assert.equal(second.equipment,"Dumbbells, bands");
 assert.throws(()=>setClientEquipment(lib,second.id,["random"]),/known equipment/);
});
test("D05: equipment and experience filters find candidates but do not approve real prescriptions",()=>{
 let lib=initialLibrary(clients);
 let exercises=lib.exercises;
 const goblet=exercises.find(x=>x.id==="demo:goblet-squat");
 assert.equal(exerciseEligible(goblet,["dumbbells"]),false);
 assert.equal(canUseForActualProgramme(goblet),false);
 exercises=setExerciseReviewed(exercises,goblet.id,true);
 const demo=exercises.find(x=>x.id===goblet.id);
 assert.equal(exerciseEligible(demo,["dumbbells"]),true);
 assert.equal(exerciseEligible(demo,["bands"]),false);
 assert.equal(canUseForActualProgramme(demo),false);
 const matches=filterExercises(exercises,{available:["dumbbells"],status:"reviewed"});
 assert.deepEqual(matches.map(x=>x.id),["demo:goblet-squat"]);
 assert.deepEqual(filterExercises(exercises,{movement:"hinge"}).map(x=>x.id).includes("demo:bb-deadlift"),true);
 assert.equal(filterExercises(exercises,{q:"nobody has this exercise"}).length,0);
});
test("D05: create/edit stable ID, version increments and coach-review reset",()=>{
 let lib=initialLibrary();
 let ex=createExercise(lib.exercises,goodExercise,"custom:demo-split");
 assert.equal(ex.length,15);
 assert.equal(ex.at(-1).id,"custom:demo-split");
 assert.equal(ex.at(-1).version,1);
 assert.equal(ex.at(-1).reviewStatus,"pending");
 ex=setExerciseReviewed(ex,"custom:demo-split",true);
 assert.equal(ex.at(-1).reviewStatus,"demo-reviewed");
 let updated=editExercise(ex,"custom:demo-split",{...goodExercise,name:"Updated coaching split squat"});
 assert.equal(updated.at(-1).id,"custom:demo-split");
 assert.equal(updated.at(-1).version,2);
 assert.equal(updated.at(-1).reviewStatus,"pending");
 assert.equal(ex.at(-1).name,"Coach demo split squat");
 assert.throws(()=>createExercise(ex,goodExercise,"custom:demo-split"),/already used/);
 assert.throws(()=>createExercise(ex,goodExercise,"bad:duplicate"),/Stable exercise ID/);
});
test("D05: reject malicious/incomplete demo URL and malformed exercise data",()=>{
 let lib=initialLibrary();
 assert.throws(()=>createExercise(lib.exercises,{...goodExercise,videoUrl:"javascript:alert(1)"},"custom:unsafe"),/HTTPS/);
 assert.throws(()=>createExercise(lib.exercises,{...goodExercise,videoUrl:'https://example.org/" onload="bad'},"custom:unsafe"),/HTTPS/);
 assert.throws(()=>createExercise(lib.exercises,{...goodExercise,primaryEquipment:"unknown"},"custom:no-gear"),/Check name/);
 assert.throws(()=>createExercise(lib.exercises,{...goodExercise,primaryEquipment:""},"custom:no-gear"),/Check name/);
 assert.throws(()=>createExercise(lib.exercises,{...goodExercise,substitutions:"custom:unsafe"},"custom:unsafe"),/Check name/);
 assert.throws(()=>createExercise(lib.exercises,{...goodExercise,movement:"fly"},"custom:unknown-movement"),/Check name/);
});
test("D05: archived exercise is absent from filtered candidates yet historical session definitions are unchanged",()=>{
 const sessionsBefore=JSON.stringify(SESSION_TEMPLATES);
 let ex=setExerciseReviewed(initialLibrary().exercises,"demo:goblet-squat",true);
 ex=setExerciseActive(ex,"demo:goblet-squat",false);
 const goblet=ex.find(x=>x.id==="demo:goblet-squat");
 assert.equal(goblet.active,false);
 assert.equal(exerciseEligible(goblet,["dumbbells"]),false);
 assert.equal(filterExercises(ex,{status:"archived"}).some(x=>x.id===goblet.id),true);
 assert.equal(missingExerciseReferences(["demo:goblet-squat","missing:old-id"],ex).length,2);
 assert.equal(JSON.stringify(SESSION_TEMPLATES),sessionsBefore);
 ex=setExerciseActive(ex,"demo:goblet-squat",true);
 assert.equal(ex.find(x=>x.id==="demo:goblet-squat").active,true);
});
test("D05: substitution suggestions do not silently prescribe an unapproved or unsuitable exercise",()=>{
 let ex=initialLibrary().exercises;
 const goblet=ex.find(x=>x.id==="demo:goblet-squat");
 let subs=substitutionOptions(goblet,ex,["boxes","bodyweight"]);
 assert.equal(subs[0].id,"demo:box-squat");
 assert.equal(subs[0].available,false);
 ex=setExerciseReviewed(ex,"demo:box-squat",true);
 subs=substitutionOptions(goblet,ex,["boxes","bodyweight"]);
 assert.equal(subs[0].available,true);
 assert.equal(subs[0].needsReview,false);
 assert.equal(canUseForActualProgramme(ex.find(x=>x.id==="demo:box-squat")),false);
 assert.throws(()=>substitutionOptions({id:"not-exist"},ex,[]),/unavailable/);
});
test("D05: method feeder/working set rules validate actual numeric ranges, rest and tempo",()=>{
 let methods=createMethod(initialLibrary().methods,goodMethod,"custom:my-method");
 assert.equal(methods.length,5);
 assert.equal(methods.at(-1).version,1);
 assert.equal(methods.at(-1).workingSets,3);
 assert.equal(methods.at(-1).repsMin,8);
 assert.equal(canUseMethodInActualProgramme(methods.at(-1)),false);
 assert.throws(()=>createMethod(methods,{...goodMethod,feederSets:"4"},"custom:invalid-feeder"),/approved ranges/);
 assert.throws(()=>createMethod(methods,{...goodMethod,workingSets:"9"},"custom:invalid-working"),/approved ranges/);
 assert.throws(()=>createMethod(methods,{...goodMethod,restSeconds:"10"},"custom:invalid-rest"),/approved ranges/);
 assert.throws(()=>createMethod(methods,{...goodMethod,rir:"6"},"custom:invalid-rir"),/approved ranges/);
 assert.throws(()=>createMethod(methods,{...goodMethod,tempo:"4/2/1"},"custom:invalid-tempo"),/approved ranges/);
 assert.throws(()=>createMethod(methods,{...goodMethod,repsMin:"12",repsMax:"8"},"custom:invalid-reps"),/approved ranges/);
});
test("D05: editing method increments version and resets review without altering historical snapshot",()=>{
 let methods=createMethod(initialLibrary().methods,goodMethod,"custom:my-method");
 methods=setMethodReviewed(methods,"custom:my-method",true);
 assert.equal(methods.at(-1).reviewStatus,"demo-reviewed");
 const updated=editMethod(methods,"custom:my-method",{...goodMethod,workingSets:"4"});
 assert.equal(updated.at(-1).version,2);
 assert.equal(updated.at(-1).workingSets,4);
 assert.equal(updated.at(-1).reviewStatus,"pending");
 assert.equal(methods.at(-1).workingSets,3);
 assert.equal(METHOD_FIXTURES[0].workingSets,3);
});
test("D05: HTML renders search, exercise editor, Gym gear, method numbers and review warnings",()=>{
 let lib=initialLibrary(clients);
 let html=renderLibraryCentre({library:lib,clients,tab:"exercises",selectedClientId:second.id});
 assert.match(html,/Exercise catalogue/);
 assert.match(html,/Stable ID/);
 assert.match(html,/data-action="library-edit-exercise"/);
 assert.match(html,/data-action="library-review-exercise"/);
 assert.match(html,/data-action="library-toggle-exercise"/);
 assert.match(html,/Equipment missing/);
 assert.match(html,/progression.*rules/i);
 html=renderLibraryCentre({library:lib,clients,tab:"equipment",selectedClientId:second.id});
 assert.match(html,/id="library-client-equipment-form"/);
 assert.match(html,/Barbell \/ Rack/);
 assert.match(html,/Use all Gym equipment/);
 html=renderLibraryCentre({library:lib,clients,tab:"methods"});
 assert.match(html,/Method/);
 assert.match(html,/AMRAP/);
 assert.match(html,/data-action="library-edit-method"/);
 assert.match(html,/rest/i);
});
test("D05: unknown names are HTML escaped in lists and editors",()=>{
 const lib=initialLibrary();
 lib.exercises[0]={...lib.exercises[0],name:'<img src=x onerror=alert(1)>'};
 const fake={id:"fake",name:'<script>alert(1)</script>',status:"Onboarding"};
 const html=renderLibraryCentre({library:lib,clients:[fake],tab:"exercises",q:""});
 assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img src=x/);
 assert.match(exerciseDialog({...lib.exercises[0],tags:["safe"]}),/&lt;img/);
 assert.match(methodDialog({...METHOD_FIXTURES[0],name:"<b>Fake</b>"}),/&lt;b&gt;/);
});
test("D05: source and production isolation, no fetch/Supabase, stable IDs and iPad CSS",async()=>{
 const [hub,html,model,ui,css]=await Promise.all([
  "../public/coach-hub.mjs","../public/coach-hub.html","../public/coach-library-model.mjs",
  "../public/coach-library-ui.mjs","../public/coach-library.css"
 ].map(p=>readFile(new URL(p,import.meta.url),"utf8")));
 assert.match(hub,/initialLibrary/);
 assert.match(hub,/state\.library/);
 assert.match(hub,/editExercise/);
 assert.match(hub,/editMethod/);
 assert.match(hub,/setClientEquipment/);
 assert.match(hub,/library-client-equipment-form/);
 assert.match(html,/data-view="library"/);
 assert.match(html,/id="library-exercise-dialog"/);
 assert.match(html,/id="library-method-dialog"/);
 assert.match(html,/coach-library\.css/);
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(model+ui,/\bfetch\s*\(|\bXMLHttpRequest\b|supabase\.co|service_role|\binviteUserByEmail\b|\bPOST\b/i);
 assert.match(css,/@media\(max-width:700px\)/);
});

test("D05: optional client-equipment filter shows only demo-reviewed suitable exercises",()=>{
 let lib=initialLibrary(clients);
 const htmlEmpty=renderLibraryCentre({library:lib,clients,tab:"exercises",selectedClientId:second.id,onlyClientFit:true});
 assert.match(htmlEmpty,/Show reviewed, compatible exercises/);
 assert.match(htmlEmpty,/No matching exercises/);
 lib={...lib,exercises:setExerciseReviewed(lib.exercises,"demo:goblet-squat",true)};
 const html=renderLibraryCentre({library:lib,clients,tab:"exercises",selectedClientId:second.id,onlyClientFit:true});
 assert.match(html,/Dumbbell Goblet Squat/);
 assert.doesNotMatch(html,/Barbell Deadlift/);
 assert.match(html,/id="library-fit-only" checked/);
});
