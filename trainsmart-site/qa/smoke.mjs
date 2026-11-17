import {chromium,webkit} from "playwright";
const url=process.env.TRAINSMART_BASE_URL||"http://127.0.0.1:8769/";
for(const [label,engine] of [["Chromium",chromium],["WebKit iPad",webkit]]){
 const browser=await engine.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1366,height:1024},isMobile:false});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",err=>errors.push(err.message));
  const response=await page.goto(url,{waitUntil:"networkidle",timeout:25000});
  if(!response?.ok())throw Error("Failed to load "+url+" "+response?.status());
  const studioStyle=await page.evaluate(()=>{
    const rgb=selector=>getComputedStyle(document.querySelector(selector)).backgroundColor;
    return {body:rgb('body'),canvas:rgb('.workspace'),sidebar:rgb('.side'),
      card:rgb('.stat'),button:rgb('.btn-primary'),
      active:rgb('.nav-link.active'),cssActive:!!document.querySelector('link[href*="coach-studio.css"]'),
      svgCount:document.querySelectorAll('.main-nav .nav-icon svg').length,
      sidebarW:document.querySelector('.side').getBoundingClientRect().width,
      whiteCard:document.querySelector('.stat').getBoundingClientRect().width};
  });
  if(!studioStyle.cssActive||studioStyle.svgCount!==10)throw Error("UX09 studio CSS/icons not active: "+JSON.stringify(studioStyle));
  if(studioStyle.body!=="rgb(243, 245, 249)"||studioStyle.canvas!=="rgb(243, 245, 249)"||
     studioStyle.sidebar!=="rgb(21, 31, 49)"||studioStyle.card!=="rgb(255, 255, 255)"||
     studioStyle.button!=="rgb(41, 86, 204)")
     throw Error("Old dark/green colours still applied: "+JSON.stringify(studioStyle));
  if(studioStyle.sidebarW<210||studioStyle.whiteCard<155)throw Error("UX09 new desktop layout is squeezed: "+JSON.stringify(studioStyle));
  console.log(label+" PASS: UX09 actual computed light navy/cobalt colour palette and line-icon layout");
  if((await page.locator('.nav-group').count())!==3)throw Error("Grouped coach navigation missing");
  if(!(await page.locator('#page-title').innerText()).includes("Dashboard"))throw Error("Coach dashboard not opened");
  await page.locator('.nav-link[data-view="programmes"]').click();
  // Two-box AI flow is the default entry point.
  await page.locator('[data-programme-tab="ai"]').click();
  await page.locator('[data-ai-field="name"]').fill("AI Bridge Strength Plan");
  await page.locator('[data-ai-field="goal"]').fill("Improve general strength");
  await page.locator('[data-ai-field="sessionsPerWeek"]').fill("2");
  await page.locator('[data-action="ai-generate-brief"]').click();
  const request=await page.locator("#ai-request-box").inputValue();
  if(!request.includes("allowedExercises:")||request.includes("Sarah Morgan"))throw Error("AI brief was not correctly generated or anonymised");
  await page.locator('[data-action="ai-example-reply"]').click();
  if(!(await page.locator("#ai-response-box").inputValue()).includes('"sessions"'))throw Error("AI response box missing");
  await page.locator('[data-action="ai-apply-reply"]').click();
  if((await page.locator("#programme-draft-name").inputValue())!=="AI Bridge Strength Plan")
   throw Error("AI JSON could not be applied to the editable programme");
  // Previous manual save/reuse flow still works as a separate option.
  page.once("dialog",async dialog=>dialog.accept());
  await page.locator('[data-action="programme-new"]').click();
  await page.locator("#programme-draft-name").fill("Bridge Test Strength Plan");
  await page.locator("#programme-draft-goal").fill("Demo strength goals");
  await page.locator('[data-exercise-pick="session:1"]').selectOption("demo:goblet-squat");
  await page.locator('[data-action="programme-add-exercise"]').first().click();
  await page.locator('[data-action="programme-save-new"]').first().click();
  if(!(await page.locator("body").innerText()).includes("Bridge Test Strength Plan"))
   throw Error("Named save did not appear");
  await page.locator('[data-action="programme-use-template"]').first().click();
  if((await page.locator("#programme-draft-name").inputValue())!=="Bridge Test Strength Plan")
   throw Error("Saved plan could not be reused");
  await page.locator('.nav-link[data-view="library"]').click();
  if(!(await page.locator("body").innerText()).includes("Exercise catalogue"))
   throw Error("Exercise catalogue missing");
  // D07 end-to-end fictional nutrition builder on the same Chromium/WebKit run.
  await page.locator('.nav-link[data-view="nutrition"]').click();
  if((await page.locator('.nut-view-tabs [role="tab"]').count())!==4)throw Error("Nutrition is missing its four work areas");
  await page.locator('[data-nut-field="clientId"]').selectOption("sarah");
  await page.locator('[data-nut-field="age"]').fill("35");
  await page.locator('[data-nut-field="weightKg"]').fill("80");
  await page.locator('[data-nut-field="heightCm"]').fill("175");
  await page.locator('[data-nut-field="sexForEstimate"]').selectOption("male");
  await page.locator('[data-nut-field="activity"]').selectOption("moderate");
  await page.locator('[data-nut-field="goal"]').selectOption("maintain");
  await page.locator('[data-nut-action="calculate"]').click();
  await page.locator('[data-nut-action="approve"]').click();
  if((await page.locator('[data-tab="create"][aria-selected="true"]').count())!==1)throw Error("Approved target did not open plan creation");
  await page.locator('[data-nut-field="name"]').fill("D07 Preview Meal Plan");
  await page.locator('[data-nut-action="prompt"]').click();
  const mealPrompt=await page.locator('#nut-prompt').inputValue();
  if(!mealPrompt.includes("allowedFoods:")||mealPrompt.includes("Sarah Morgan"))throw Error("D07 prompt missing allowed food IDs or containing a client name");
  await page.locator('[data-nut-action="example"]').click();
  await page.locator('[data-nut-action="import"]').click();
  if((await page.locator('[data-tab="plan"][aria-selected="true"]').count())!==1)throw Error("Import did not open the meal editor");
  if((await page.locator('.nut-recipe').count())!==4)throw Error("D07 did not render four editable options in the selected category");
  await page.locator('[data-nut-action="save-recipe"]').first().click();
  if((await page.locator('[data-tab="library"][aria-selected="true"]').count())!==1)throw Error("Saved recipe not shown in library");
  await page.locator('[data-nut-action="reuse-recipe"]').first().click();
  await page.locator('[data-nut-action="save-plan"]').click();
  await page.locator('[data-nut-action="assign-plan"]').first().click();
  if(!(await page.locator('body').innerText()).includes("Fictional client meal-plan assignments"))throw Error("D07 saved plan assignment not visible");
  console.log(label+" PASS: D07 calculator, approved targets, anonymised prompt, 16 meals, saved recipe and template");

  // D07.2: named foods that are not pre-programmed must import without invented nutrition.
  await page.locator('.nut-view-tabs [data-nut-action="tab"][data-tab="create"]').click();
  await page.locator('[data-nut-field="name"]').fill("Flexible New Foods Test");
  await page.locator('[data-nut-action="prompt"]').click();
  const flexBrief=await page.locator("#nut-prompt").inputValue();
  if(!flexBrief.includes("TRAINSMART_MEALS_V2")||!flexBrief.includes("ANY reasonable new food"))
   throw Error("D07.2 ChatGPT prompt still restricts ingredients to the existing catalogue");
  await page.locator('[data-nut-action="example-new"]').click();
  await page.locator('[data-nut-action="import"]').click();
  if((await page.locator('[data-tab="library"][aria-selected="true"]').count())!==1)
   throw Error("D07.2 import did not open ingredient review");
  if((await page.locator(".nut-review-item").count())!==2)
   throw Error("D07.2 did not deduplicate and queue two new ingredient names");
  await page.locator('.nut-view-tabs [data-nut-action="tab"][data-tab="plan"]').click();
  if(!(await page.locator('[data-nut-action="save-plan"]').isDisabled()))
   throw Error("D07.2 saved an unreviewed ingredient meal plan");
  await page.locator('.nut-view-tabs [data-nut-action="tab"][data-tab="library"]').click();
  for(let i=0;i<2;i++){
   const item=page.locator(".nut-review-item").first();
   await item.locator('[data-review-field="calories"]').fill("55");
   await item.locator('[data-review-field="proteinG"]').fill("1.3");
   await item.locator('[data-review-field="carbsG"]').fill("10");
   await item.locator('[data-review-field="fatG"]').fill("0.5");
   await item.locator('[data-review-field="source"]').fill("Sample UK shop label reviewed by coach");
   await item.locator('[data-nut-action="review-food"]').click();
  }
  if((await page.locator('[data-tab="plan"][aria-selected="true"]').count())!==1)
   throw Error("D07.2 did not return to meal editor after the last reviewed food");
  const totalLabel=await page.locator(".nut-recipe-head .tag").first().innerText();
  if(!totalLabel.includes("kcal"))throw Error("D07.2 has not recalculated meals from reviewed values");
  await page.locator('[data-nut-action="save-plan"]').click();
  if(!(await page.locator("body").innerText()).includes("Flexible New Foods Test"))
   throw Error("D07.2 reusable plan was not saved");
  console.log(label+" PASS: D07.2 unrestricted named food import, review queue, source values, automatic recalculation and safe reusable plan");

  await page.locator('.nav-link[data-view="clients"]').click();
  if(!(await page.locator("body").innerText()).includes("Clients"))
   throw Error("Client directory navigation missing");
  if(errors.length)throw Error("Browser runtime errors: "+errors.join("; "));
  await context.close();
  console.log(label+" PASS: two-box AI request/JSON/apply, manual save/reuse, library, client navigation");
 }finally{await browser.close();}
}

// D07.1 regression: mobile touch navigation + direct URL must work even when menu tabs scroll.
for(const [label,options] of [
 ["WebKit iPhone portrait",{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}],
 ["WebKit iPad portrait",{viewport:{width:820,height:1180},isMobile:true,hasTouch:true,deviceScaleFactor:2}]
]){
 const browser=await webkit.launch({headless:true});
 try{
  const context=await browser.newContext(options);
  const page=await context.newPage(),errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto(url,{waitUntil:"networkidle",timeout:25000});
  if(await page.locator('script[src*="coach-hub.js?v="]').count()!==1)
   throw Error(label+" still loads unversioned entrypoint and may reuse Safari D06.1 cache");
  if(await page.locator('link[href*="coach-hub.css?v="]').count()!==1)
   throw Error(label+" still loads unversioned styling");
  const mobileColours=await page.evaluate(()=>({
    body:getComputedStyle(document.body).backgroundColor,
    sidebar:getComputedStyle(document.querySelector('.side')).backgroundColor,
    cssActive:!!document.querySelector('link[href*="coach-studio.css"]'),
    horizontalOverflow:document.documentElement.scrollWidth>window.innerWidth+3
  }));
  if(!mobileColours.cssActive||mobileColours.body!=="rgb(243, 245, 249)"||
     mobileColours.sidebar!=="rgb(21, 31, 49)"||mobileColours.horizontalOverflow)
    throw Error(label+" wrong visual theme or mobile overflow: "+JSON.stringify(mobileColours));
  const shortcut=page.locator("#nutrition-shortcut");
  if(!await shortcut.isVisible())throw Error(label+" does not expose the nutrition shortcut");
  await shortcut.click();
  await page.locator('[data-nut-field="clientId"]').waitFor({state:"visible",timeout:10000});
  if(!page.url().includes("#nutrition"))throw Error(label+" did not navigate to #nutrition");
  await page.goto(url+"#nutrition",{waitUntil:"networkidle",timeout:25000});
  await page.locator('[data-nut-field="clientId"]').waitFor({state:"visible",timeout:10000});
  await page.locator('.nut-view-tabs [data-nut-action="tab"][data-tab="create"]').click();
  await page.locator("#nut-prompt").waitFor({state:"visible",timeout:10000});
  const dims=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:window.innerWidth}));
  if(dims.content>dims.viewport+3)throw Error(label+" layout overflows horizontally: "+JSON.stringify(dims));
  const title=await page.locator("#page-title").textContent();
  if(!title.includes("Nutrition"))throw Error(label+" did not open nutrition on direct URL");
  if(errors.length)throw Error(label+" runtime errors: "+errors.join("; "));
  console.log(label+" PASS: visible nutrition shortcut, cache-busted scripts, direct #nutrition deep link");
  await context.close();
 }finally{await browser.close();}
}


// D08 isolated client experience — same-tab fictional state, no hosted writes.
for(const [label,engine,opts] of [
 ["Chromium client",chromium,{viewport:{width:1280,height:850}}],
 ["iPad WebKit client",webkit,{viewport:{width:820,height:1180},isMobile:true,hasTouch:true}]
]){
 const browser=await engine.launch({headless:true});
 try{
  const context=await browser.newContext(opts),page=await context.newPage(),errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto(url,{waitUntil:"networkidle",timeout:25000});
  await page.evaluate(()=>{
   const key="trainsmart-coach-hub-programmes-06-fictional-v1";
   const state=JSON.parse(sessionStorage.getItem(key));
   const exercise=(id,name,workingSets)=>({id,exerciseId:"demo:goblet-squat",name,
     instructions:"Follow the coach-approved technique.",youtubeUrl:null,
     prescription:{workingSets,repsMin:8,repsMax:12,loadKg:15,restSeconds:90,notes:"Controlled movement"}});
   state.programmeAssignments=[{
     id:"assignment:portal-demo",clientId:"sarah",current:true,name:"D08 Test Strength",
     sessions:[{id:"session:1",name:"Strength Day A",exercises:[exercise("row:1","Goblet squat",2)]},
       {id:"session:2",name:"Strength Day B",exercises:[exercise("row:2","Squat",1)]}]
   }];
   sessionStorage.setItem(key,JSON.stringify(state));
   const mealKey="trainsmart-coach-hub-nutrition-07-fictional-v1";
   const meal={name:"Example porridge",servings:1,nutrition:{calories:300,proteinG:12},
     ingredients:[{name:"Oats",quantity:65,unit:"g"}],steps:["Mix and serve."]};
   const categories=Object.fromEntries(["breakfast","lunch","dinner","snacks"].map(kind=>
    [kind,Array.from({length:4},(_,i)=>({...meal,name:kind+" option "+(i+1)}))]));
   sessionStorage.setItem(mealKey,JSON.stringify({foods:[],assignments:[{
     id:"mealassignment:sample",clientId:"sarah",current:true,name:"D08 Example Meals",
     plan:{target:{calories:2100,proteinG:140,carbsG:210,fatG:65},categories}}]}));
  });
  await page.goto(url+"coach-client.html?client=sarah",{waitUntil:"networkidle",timeout:25000});
  if(!(await page.locator("h1").innerText()).includes("Sarah"))throw Error(label+": missing client home");
  await page.locator('[data-tab="training"]').click();
  if(!(await page.locator("h2").first().innerText()).includes("Strength Day A"))throw Error(label+": missing assigned session");
  const reps=page.locator('input[name="reps_0_0"]'),reps2=page.locator('input[name="reps_0_1"]');
  await reps.fill("10");await page.locator('input[name="kg_0_0"]').fill("15");
  await page.locator('#portal-workout button[value="draft"]').click();
  if(!await page.locator("#portal-workout").count())throw Error(label+": draft advanced the workout");
  await reps2.fill("9");await page.locator('input[name="kg_0_1"]').fill("15");
  await page.locator('#portal-workout button[value="complete"]').click();
  if(!(await page.locator("h2").first().innerText()).includes("Strength Day B"))throw Error(label+": completion did not advance");
  await page.locator('[data-tab="progress"]').click();
  if(!(await page.locator("body").innerText()).includes("Strength Day A"))throw Error(label+": missing workout history");
  await page.locator('#portal-checkin select[name="energy"]').selectOption("4");
  await page.locator('#portal-checkin select[name="sleep"]').selectOption("3");
  await page.locator('#portal-checkin button[type="submit"]').click();
  if(!(await page.locator("body").innerText()).includes("Update this week"))throw Error(label+": check-in not saved");
  await page.locator('[data-tab="meals"]').click();
  if((await page.locator('.portal-meal').count())!==16)throw Error(label+": missing four choices per meal");
  await page.goto(url,{waitUntil:"networkidle",timeout:25000});
  const result=await page.evaluate(()=>{
   const s=JSON.parse(sessionStorage.getItem("trainsmart-coach-hub-programmes-06-fictional-v1"));
   return {completed:s.clientPortalLogs?.filter(x=>x.clientId==="sarah"&&x.completed).length,
    checkins:s.clientPortalCheckins?.filter(x=>x.clientId==="sarah").length};
  });
  if(result.completed!==1||result.checkins!==1)throw Error(label+": same-tab fictional records not preserved: "+JSON.stringify(result));
  if(errors.length)throw Error(label+": JS errors "+errors.join("; "));
  const width=await page.evaluate(()=>document.documentElement.scrollWidth);
  if(width>opts.viewport.width+4)throw Error(label+": unexpected horizontal overflow");
  console.log(label+" PASS: client home, log draft, ordered completion, progress, check-in, 16 meal choices, same-tab demo state");
  await context.close();
 }finally{await browser.close();}
}
