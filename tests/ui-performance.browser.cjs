const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const {mount,matureState}=require('./full-playthrough.browser.cjs');
const engine=process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium;

(async()=>{
  const browser=await engine.launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
  const context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
  try{
    await mount(page,matureState(),true,{useBuiltGuild:true});
    await page.waitForFunction(()=>document.querySelector('#cellboundOnboarding')?.hidden===true,{},{timeout:10000,polling:50});
    await page.waitForFunction(()=>window.CellboundAdmin?.role==='owner',{},{timeout:10000,polling:50});
    await page.evaluate(()=>{
      const s=CellboundGame.getState();
      s.progression={...(s.progression||{}),ashenVaultUnlocked:true,fracturedAgesUnlocked:true,manorRaidUnlocked:true,manorRaidCleared:true,nullComplexUnlocked:true};
      s.questSystem=s.questSystem||{version:2,flags:{}};
      s.questSystem.flags={...(s.questSystem.flags||{}),hollowSanctumUnlocked:true,hollowFirstClear:true};
      CellboundGame.renderAll();
    });

    const sizes=[{width:1366,height:1024},{width:1024,height:1366},{width:1440,height:900},{width:390,height:844}];
    const views=['overview','roster','party','bank','professions','quests','content','world','raids','trading','chat','support'];
    for(const size of sizes){
      await page.setViewportSize(size);
      for(const view of views){
        await page.evaluate(v=>CellboundGame.switchView(v),view);
        await page.waitForFunction(v=>document.querySelector('#'+v)?.classList.contains('active'),view,{timeout:5000,polling:25});
        const m=await page.evaluate(v=>{
          const active=document.querySelector('#'+v);
          return {innerWidth,docWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,activeWidth:active?.getBoundingClientRect().width||0};
        },view);
        assert(m.docWidth<=m.innerWidth+3,view+' causes document horizontal overflow at '+size.width+'px: '+m.docWidth+' > '+m.innerWidth);
        assert(m.bodyWidth<=m.innerWidth+3,view+' causes body horizontal overflow at '+size.width+'px');
        assert(m.activeWidth<=m.innerWidth+3,view+' active surface exceeds the viewport at '+size.width+'px');
      }

      const navigation=await page.evaluate(()=>{
        const dock=document.querySelector('#cbImmersiveDock');
        const sidebar=document.querySelector('.sidebar');
        const more=document.querySelector('#cbMoreToggle');
        const style=dock?getComputedStyle(dock):null;
        const rect=dock?.getBoundingClientRect();
        window.scrollTo(0,Math.min(400,Math.max(0,document.documentElement.scrollHeight-innerHeight)));
        const scrollRect=dock?.getBoundingClientRect();
        return {
          dockPresent:!!dock,position:style?.position,
          sidebarHidden:getComputedStyle(sidebar).display==='none',
          bottom:rect?Math.abs(innerHeight-rect.bottom):Infinity,
          scrolledBottom:scrollRect?Math.abs(innerHeight-scrollRect.bottom):Infinity,
          width:rect?.width||Infinity,
          moreVisible:!!more&&getComputedStyle(more).display!=='none',
          moreAria:more?.getAttribute('aria-expanded')
        };
      });
      assert.equal(navigation.dockPresent,true,'new immersive navigation dock must exist');
      assert.equal(navigation.position,'fixed','game dock must be fixed at every viewport');
      assert.equal(navigation.sidebarHidden,true,'retired sidebar must not take up space');
      assert(navigation.bottom<=30,'dock must sit at the viewport bottom');
      assert(navigation.scrolledBottom<=30,'dock must remain anchored after scrolling');
      assert(navigation.width<=size.width+2,'dock must fit within viewport');
      assert.equal(navigation.moreVisible,true,'More must stay available on tablets and phones');
      assert.equal(navigation.moreAria,'false','More menu should start closed');
      await page.evaluate(()=>window.scrollTo(0,0));
    }

    await page.setViewportSize({width:1366,height:1024});
    await page.evaluate(()=>{CellboundGame.switchView('overview');document.body.focus()});
    await page.evaluate(()=>document.querySelector('#cbImmersiveDock [data-cb-dock="overview"]').focus());
    const focusStart=await page.evaluate(()=>document.activeElement?.closest('#cbImmersiveDock')!==null);
    assert.equal(focusStart,true,'keyboard users must be able to focus the bottom dock');
    await page.keyboard.press('Tab');
    const focusNext=await page.evaluate(()=>document.activeElement?.closest('#cbImmersiveDock')!==null);
    assert.equal(focusNext,true,'Tab must move between dock destinations');
    const moreButton=page.locator('#cbMoreToggle');
    await moreButton.click();
    assert.equal(await page.locator('#cbMorePanel').isVisible(),true,'More destination panel must open');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#cbMorePanel').isVisible(),false,'Escape must dismiss the destination panel');
    await page.locator('#cbImmersiveDock [data-cb-dock="quests"]').click();
    assert.equal(await page.locator('#quests').evaluate(el=>el.classList.contains('active')),true,'bottom dock must navigate via the canonical game view router');
    await page.evaluate(()=>CellboundGame.switchView('overview'));
    const focusRuleLoaded=await page.evaluate(()=>{
      for(const sheet of [...document.styleSheets]){
        let rules;
        try{rules=[...sheet.cssRules]}catch{continue}
        if(rules.some(rule=>String(rule.cssText||'').includes(':focus-visible')&&String(rule.cssText||'').includes('outline:')))return true;
      }
      return false;
    });
    assert.equal(focusRuleLoaded,true,'deployed UI bundle must contain a visible :focus-visible treatment');

    const resource=await page.evaluate(()=>({
      css:performance.getEntriesByType('resource').filter(x=>/\.css(?:\?|$)/.test(x.name)).length,
      bundle:performance.getEntriesByType('resource').some(x=>x.name.includes('cellbound-ui-bundle-v1.css'))
    }));
    assert.equal(resource.bundle,true,'browser did not load the consolidated UI bundle');
    assert(resource.css<=50,'browser stylesheet request budget exceeded: '+resource.css);
    assert.deepEqual(errors,[],'responsive UI pass emitted browser errors');
    console.log((process.env.CELLBOUND_TEST_ENGINE==='webkit'?'WebKit':'Chromium')+' Block 4 UI/performance regression passed across iPad landscape, iPad portrait, desktop and phone.');
  }finally{
    await context.close();
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exit(1)});
