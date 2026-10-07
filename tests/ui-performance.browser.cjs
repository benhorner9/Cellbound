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
    await mount(page,matureState(),true);
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

      if(size.width>720){
        const desktop=await page.evaluate(()=>{
          const sidebar=document.querySelector('.sidebar'),nav=document.querySelector('.sidebar .primary-nav');
          const s=getComputedStyle(sidebar),n=getComputedStyle(nav);
          window.scrollTo(0,Math.min(480,Math.max(0,document.documentElement.scrollHeight-innerHeight)));
          if(nav&&nav.scrollHeight>nav.clientHeight+4)nav.scrollTop=Math.min(120,nav.scrollHeight-nav.clientHeight);
          return {
            position:s.position,top:sidebar.getBoundingClientRect().top,height:sidebar.getBoundingClientRect().height,
            viewport:innerHeight,navOverflow:n.overflowY,navScrollTop:nav?.scrollTop||0,
            navScrollable:Boolean(nav&&nav.scrollHeight>nav.clientHeight+4)
          };
        });
        assert.equal(desktop.position,'sticky','desktop/tablet sidebar must stay sticky');
        assert(Math.abs(desktop.top)<=2,'sticky sidebar moved away from the viewport top');
        assert(desktop.height<=desktop.viewport+2,'sidebar exceeds viewport height');
        assert(['auto','scroll'].includes(desktop.navOverflow),'sidebar navigation needs its own vertical scroll');
        if(desktop.navScrollable)assert(desktop.navScrollTop>0,'sidebar navigation must scroll independently');
        await page.evaluate(()=>window.scrollTo(0,0));
      }else{
        const mobile=await page.evaluate(()=>{
          const sidebar=document.querySelector('.sidebar'),more=document.querySelector('#mobileNavMore');
          const s=getComputedStyle(sidebar),r=sidebar.getBoundingClientRect();
          return {position:s.position,bottom:Math.abs(innerHeight-r.bottom),moreVisible:Boolean(more&&getComputedStyle(more).display!=='none'),season:Boolean(document.querySelector('.season-card'))};
        });
        assert.equal(mobile.position,'fixed','phone navigation must use the fixed bottom dock');
        assert(mobile.bottom<=2,'phone navigation must stay attached to the viewport bottom');
        assert.equal(mobile.moreVisible,true,'phone More navigation must remain available');
        assert.equal(mobile.season,false,'retired Founding Season panel must stay removed');
      }
    }

    await page.setViewportSize({width:1366,height:1024});
    await page.evaluate(()=>{CellboundGame.switchView('overview');document.body.focus()});
    let focus=null;
    for(let i=0;i<30;i++){
      await page.keyboard.press('Tab');
      focus=await page.evaluate(()=>{
        const el=document.activeElement,s=el?getComputedStyle(el):null;
        return {isNav:Boolean(el?.classList?.contains('nav-btn')),tag:el?.tagName,outline:s?.outlineStyle||'',outlineWidth:s?.outlineWidth||'0px'};
      });
      if(focus.isNav)break;
    }
    assert.equal(focus?.isNav,true,'keyboard Tab navigation must reach the sidebar');
    assert.equal(focus?.tag,'BUTTON','keyboard focus lands on a navigation control');
    assert.notEqual(focus?.outline,'none','focused controls must expose a visible outline');
    assert.notEqual(focus?.outlineWidth,'0px','focused controls must expose a non-zero outline');

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
