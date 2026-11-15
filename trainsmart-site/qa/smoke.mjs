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
  await page.locator('[data-view="programmes"]').click();
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
  await page.locator('[data-view="library"]').click();
  if(!(await page.locator("body").innerText()).includes("Exercise catalogue"))
   throw Error("Exercise catalogue missing");
  // D07 end-to-end fictional nutrition builder on the same Chromium/WebKit run.
  await page.locator('[data-view="nutrition"]').click();
  await page.locator('[data-nut-field="clientId"]').selectOption("sarah");
  await page.locator('[data-nut-field="age"]').fill("35");
  await page.locator('[data-nut-field="weightKg"]').fill("80");
  await page.locator('[data-nut-field="heightCm"]').fill("175");
  await page.locator('[data-nut-field="sexForEstimate"]').selectOption("male");
  await page.locator('[data-nut-field="activity"]').selectOption("moderate");
  await page.locator('[data-nut-field="goal"]').selectOption("maintain");
  await page.locator('[data-nut-field="name"]').fill("D07 Preview Meal Plan");
  await page.locator('[data-nut-action="calculate"]').click();
  await page.locator('[data-nut-action="approve"]').click();
  await page.locator('[data-nut-action="prompt"]').click();
  const mealPrompt=await page.locator('#nut-prompt').inputValue();
  if(!mealPrompt.includes("allowedFoods:")||mealPrompt.includes("Sarah Morgan"))throw Error("D07 prompt missing allowed food IDs or containing a client name");
  await page.locator('[data-nut-action="example"]').click();
  await page.locator('[data-nut-action="import"]').click();
  if((await page.locator('.nut-recipe').count())!==4)throw Error("D07 did not render four editable options in the selected category");
  await page.locator('[data-nut-action="save-recipe"]').first().click();
  await page.locator('[data-nut-action="reuse-recipe"]').first().click();
  await page.locator('[data-nut-action="save-plan"]').click();
  await page.locator('[data-nut-action="assign-plan"]').first().click();
  if(!(await page.locator('body').innerText()).includes("Fictional client meal-plan assignments"))throw Error("D07 saved plan assignment not visible");
  console.log(label+" PASS: D07 calculator, approved targets, anonymised prompt, 16 meals, saved recipe and template");
  await page.locator('[data-view="clients"]').click();
  if(!(await page.locator("body").innerText()).includes("Clients"))
   throw Error("Client directory navigation missing");
  if(errors.length)throw Error("Browser runtime errors: "+errors.join("; "));
  await context.close();
  console.log(label+" PASS: two-box AI request/JSON/apply, manual save/reuse, library, client navigation");
 }finally{await browser.close();}
}
