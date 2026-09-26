const {chromium,webkit}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await(process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium).launch({headless:true});
 const page=await browser.newPage({viewport:{width:1366,height:1024}}),errors=[],root=path.resolve(__dirname,'../dist');
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('https://cellbound.test/**',route=>{const f=path.resolve(root,new URL(route.request().url()).pathname.slice(1));return route.fulfill(f.startsWith(root+path.sep)&&fs.existsSync(f)?{path:f}:{status:404,body:''})});
 await page.goto('https://cellbound.test/inn-art-review.html');
 await page.evaluate(async()=>Promise.all([...document.images].map(i=>i.decode())));
 const shot=async name=>page.screenshot({path:'/tmp/cellbound-art-'+name+'.png'});
 assert.equal(await page.locator('.inn-traveller').count(),5);assert.equal(await page.locator('.cb-painted-study img').count(),5);
 assert.equal(await page.evaluate(()=>localStorage.length),0,'review never reads or writes player saves');
 await shot('01-default');
 await page.locator('[data-char="study-warrior"]').first().click();await page.waitForSelector('#characterModal:not([hidden])');assert(!(await page.locator('#characterDetail').innerText()).includes('NaN'),'sample statistics are numeric');assert.equal(await page.locator('.cb-header-metrics > div').first().locator('b').innerText(),'0');await shot('02-character');for(const tab of ['equipment','talents','skills','professions','history','overview']){await page.locator('[data-sheet-tab="'+tab+'"]').first().click();assert.equal(await page.locator('[data-character-section]').getAttribute('data-character-section'),tab)}await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.innCharacter),'study-warrior');
 await page.locator('.inn-ledger').click();await page.locator('#reviewSearch').fill('Mage');assert.equal(await page.locator('#reviewRoster .review-row:visible').count(),1);await shot('03-ledger');await page.keyboard.press('Escape');
 await page.locator('.inn-table').click();await page.locator('[data-study-party="study-hunter"]').click();assert.equal(await page.locator('.inn-traveller').count(),4);await page.locator('[data-study-party="study-hunter"]').click();assert.equal(await page.locator('.inn-traveller').count(),5);await shot('04-party');await page.keyboard.press('Escape');
 await page.setViewportSize({width:1024,height:768});await shot('05-ipad');
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>{const i=document.querySelector('.inn-art img');return i.currentSrc.includes('portrait-v2')&&i.complete&&i.naturalWidth>0});await page.locator('.inn-art img').evaluate(i=>i.decode());await shot('06-phone');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
 for(const n of await page.locator('.inn-adventurer,.inn-hotspot').all()){const b=await n.boundingBox();assert(b.width>=44&&b.height>=44);assert(b.x>=0&&b.x+b.width<=390)}
 assert(await page.locator('.inn-adventurer').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('[data-inn-character]')===n})),'phone characters are independently selectable');
 await page.locator('[data-inn-character="study-priest"]').click();await shot('07-phone-character');await page.keyboard.press('Escape');
 await page.locator('#reviewLabels').click();await shot('08-no-labels');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.inn-hearth-light').evaluate(n=>getComputedStyle(n).animationName),'none');
 assert.equal(await page.evaluate(()=>localStorage.length),0,'shared sheet keeps sample state isolated');assert.equal(await page.locator('.inn-door').getAttribute('href'),'./guild.html');assert.deepEqual(errors,[]);await browser.close();console.log('Inn art review: image decoding, five prototypes, contextual tools, sample-party state, focus, responsive composition and no-save isolation passed.');
})().catch(e=>{console.error(e);process.exit(1)});
