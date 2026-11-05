import { webkit } from 'playwright';

const base = 'https://playcellbound.com/emberfall/';
let browser;
const errors = [];
function assert(ok, reason) { if (!ok) throw Error(reason); }
async function tap(page, selector) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await el.tap({ timeout: 15000 });
}
async function checkNoSidewaysScroll(page, name) {
  const { width, scroll } = await page.evaluate(() =>
    ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert(scroll <= width + 2, name + ' sideways overflow: ' + scroll + ' > ' + width);
}
try {
  browser = await webkit.launch({ headless: true });
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3
  });
  const page = await phone.newPage();
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto(base, { waitUntil: 'networkidle', timeout: 45000 });
  assert(await page.locator('html').getAttribute('data-emberfall-ready') === '4.21.0',
    'Hosted phone Safari could not initialise Emberfall');
  assert(await page.locator('link[href*="mobile-testing.css"]').count() === 1,
    'Hosted HTML does not load the phone layout');
  assert(await page.locator('.refuge-lantern').count() === 3, 'Hosted phone missing Refuge lantern animation');
  assert((await page.locator('#polishFeedback').evaluate(el=>getComputedStyle(el).pointerEvents)) === 'none', 'Hosted phone feedback intercepts taps');
  assert(await page.locator('.camp-building').count() === 13,
    'Hosted phone camp cannot reach all management buildings');
  const campCols = await page.locator('.camp-buildings').evaluate(el =>
    getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
  assert(campCols === 2, 'Hosted phone layout CSS did not activate');
  await checkNoSidewaysScroll(page, 'Camp');

  await tap(page, '[data-camp="party"]');
  assert((await page.locator('#app').getAttribute('data-view')) === 'workshop',
    'Party is not a proper mobile management screen');
  assert(!(await page.locator('.workshop-rail').isVisible())&&!(await page.locator('#workshopJump').isVisible()),'Retired sidebar is still visible on hosted phone');
   assert(await page.locator('#workshopReturn').isVisible(),'Phone building has no exit to Refuge');
   await tap(page,'#workshopGuide [data-ux-go="heroes"]');
   assert((await page.locator('#workshop').getAttribute('data-location'))==='heroes','Phone doorway into Hall of Heroes failed');
   await tap(page,'#workshopGuide [data-ux-go="talents"]');
   assert((await page.locator('#workshopHeading').innerText())==='Talent Trees','Phone cannot enter Talent Sanctum');
   assert(await page.locator('.talent-tree').isVisible(),'Hosted phone talents inaccessible');
   await tap(page,'#workshopGuide [data-ux-go="heroes"]');
   await tap(page,'#workshopGuide [data-ux-go="pack"]');
   assert(await page.locator('#inventoryGrid').isVisible(),'Hosted phone bag inaccessible');
   await checkNoSidewaysScroll(page, 'Inventory');
  await tap(page, '#workshopReturn');

  await tap(page, '#campNavExpeditions');
  await tap(page, '[data-boss="cindermaw"]');
  assert((await page.locator('#selectedBossName').innerText()) === 'Cindermaw',
    'Mobile boss selection does not work');
  await tap(page, '#startBtn');
  assert((await page.locator('#app').getAttribute('data-view')) === 'battle',
    'Hosted phone battle did not launch');
  assert(await page.locator('#abilities .skill').count() === 2 &&
         await page.locator('#partyList [data-hero]').count() === 4,
    'Hosted phone lost ability or hero buttons');

  const layout = await page.evaluate(() => {
    const frame = document.querySelector('#battleFrame').getBoundingClientRect();
    const dock = document.querySelector('#combatActionDock').getBoundingClientRect();
    const rail = document.querySelector('.combat-party-rail').getBoundingClientRect();
    return {
      ratio: frame.width / frame.height,
      order: dock.top >= frame.bottom - 3 && rail.top >= dock.bottom - 3,
      cols: getComputedStyle(document.querySelector('#partyList')).gridTemplateColumns.split(' ').filter(Boolean).length,
      abilityHeight: Math.min(...[...document.querySelectorAll('#abilities .skill')].map(b => b.getBoundingClientRect().height))
    };
  });
  assert(Math.abs(layout.ratio - 1.875) < .07 && layout.order &&
         layout.cols === 4 && layout.abilityHeight >= 44,
    'Phone combat controls are clipped or arena coordinate scaling changed');
  await tap(page, '#partyList [data-hero="mage"]');
  assert((await page.locator('#abilityHero').innerText()).includes('Lyra'),
    'Phone hero switch not reflected in skill bar');
  await tap(page, '#abilities .skill[data-slot="0"]');
  await checkNoSidewaysScroll(page, 'Battle');

  await page.setViewportSize({ width: 844, height: 390 });
  const rotated = await page.evaluate(() => {
    const frame = document.querySelector('#battleFrame').getBoundingClientRect();
    return {
      ratio: frame.width / frame.height,
      cols: getComputedStyle(document.querySelector('#partyList')).gridTemplateColumns.split(' ').filter(Boolean).length
    };
  });
  assert(Math.abs(rotated.ratio - 1.875) < .07 && rotated.cols === 4,
    'Landscape iPhone combat is not usable');
  await checkNoSidewaysScroll(page, 'Landscape phone');
  await tap(page, '#bossSelectTopBtn');
  assert((await page.locator('#app').getAttribute('data-view')) === 'camp',
    'Phone could not return to the camp');

  const ipad = await browser.newContext({
    viewport: { width: 1180, height: 820 }, isMobile: true, hasTouch: true
  });
  const ipadPage = await ipad.newPage();
  await ipadPage.goto(base, { waitUntil: 'networkidle', timeout: 45000 });
  const tabletLayoutPreserved = await ipadPage.evaluate(() =>
    !matchMedia('(max-width: 600px) and (pointer: coarse)').matches &&
    !matchMedia('(pointer: coarse) and (orientation: landscape) and (max-height: 540px) and (max-width: 950px)').matches
  );
  assert(tabletLayoutPreserved &&
         await ipadPage.locator('html').getAttribute('data-emberfall-ready') === '4.21.0',
    'Hosted iPad layout or boot regressed');
  assert(errors.length === 0, 'Hosted mobile WebKit errors: ' + errors.join(' | '));
  console.log('PASS hosted Emberfall iPhone portrait, landscape and iPad isolation.');
} finally {
  if (browser) await browser.close();
}
