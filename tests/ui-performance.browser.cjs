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

    // Recruitment-card ordering must settle: moving existing cards repeatedly
    // used to feed the roster MutationObserver forever, even behind combat.
    await page.waitForTimeout(800);
    const rosterMutations=await page.evaluate(()=>new Promise(resolve=>{let count=0;const root=document.querySelector('#rosterGrid');const observer=new MutationObserver(records=>count+=records.length);observer.observe(root,{childList:true});setTimeout(()=>{observer.disconnect();resolve(count)},700)}));
    assert(rosterMutations<5,'roster observer must settle while idle: '+rosterMutations);

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

      // The former floating bottom dock is retired. Verify the actual fixed
      // top navigation before and after scrolling at every supported viewport.
      const navigation=await page.evaluate(()=>{
        const bar=document.querySelector('#cbGlobalNavigation');
        const dock=document.querySelector('#cbImmersiveDock');
        const sidebar=document.querySelector('.sidebar');
        const more=document.querySelector('#cbTopMore');
        const box=bar?.getBoundingClientRect();
        const position=bar?getComputedStyle(bar).position:null;
        const oldHidden=!dock||getComputedStyle(dock).display==='none';
        const before=window.scrollY;
        const maxScroll=Math.max(0,document.documentElement.scrollHeight-innerHeight);
        window.scrollTo(0,Math.min(500,maxScroll));
        const scrolled=bar?.getBoundingClientRect();
        return {
          exists:!!bar,position,
          sidebarHidden:!!sidebar&&getComputedStyle(sidebar).display==='none',
          oldHidden,
          top:box?.top??Infinity,
          topAfterScroll:scrolled?.top??Infinity,
          width:box?.width??Infinity,
          viewport:innerWidth,
          scrollDistance:window.scrollY-before,
          moreVisible:!!more&&getComputedStyle(more).display!=='none',
          moreAria:more?.getAttribute('aria-expanded')
        };
      });
      assert.equal(navigation.exists,true,'fixed game navigation must exist');
      assert.equal(navigation.position,'fixed','top navigation must be fixed at every viewport');
      assert.equal(navigation.sidebarHidden,true,'retired sidebar must not take up space');
      assert.equal(navigation.oldHidden,true,'retired floating bottom dock must not take up space');
      assert(Math.abs(navigation.top)<=2,'top nav must align with the viewport top');
      assert(Math.abs(navigation.topAfterScroll)<=2,'top nav must remain visible when scrolled');
      assert(navigation.width<=size.width+2,'top navigation must fit within viewport');
      assert.equal(navigation.moreVisible,true,'More must stay available on tablets and phones');
      assert.equal(navigation.moreAria,'false','More menu should start closed');
      await page.evaluate(()=>window.scrollTo(0,0));
    }

    await page.setViewportSize({width:1366,height:1024});
    await page.evaluate(()=>{CellboundGame.switchView('overview');document.body.focus()});
    const navTarget=page.locator('#cbGlobalNavigation [data-cb-nav="roster"]');
    await navTarget.focus();
    const focusStart=await page.evaluate(()=>document.activeElement?.closest('#cbGlobalNavigation')!==null);
    assert.equal(focusStart,true,'keyboard users must be able to focus the top navigation');
    await page.keyboard.press('Tab');
    const focusNext=await page.evaluate(()=>document.activeElement?.closest('#cbGlobalNavigation')!==null);
    assert.equal(focusNext,true,'Tab must move between top navigation destinations');
    const moreButton=page.locator('#cbTopMore');
    await moreButton.click();
    assert.equal(await page.locator('#cbMorePanel').isVisible(),true,'More destination panel must open');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#cbMorePanel').isVisible(),false,'Escape must dismiss the destination panel');
    // Quests now belongs to the Adventure context, not the six-item primary bar.
    await page.locator('#cbGlobalNavigation [data-cb-nav="content"]').click();
    assert.equal(await page.locator('#content').evaluate(el=>el.classList.contains('active')),true,'top navigation must open Adventure via the canonical game router');
    await page.locator('#cbContextNav [data-cb-go="quests"]').click();
    assert.equal(await page.locator('#quests').evaluate(el=>el.classList.contains('active')),true,'Adventure subnavigation must open the Quest Journal');
    await page.evaluate(()=>CellboundGame.switchView('overview'));
    // Dark-fantasy screen parity regression: sample actual computed colours,
    // not only a stylesheet string, across representative destinations.
    const styledScreens=[
      ['overview','#overview .home-party-panel'],
      ['roster','#roster .roster-character-card'],
      ['bank','#bank .bank-card-v2'],
      ['professions','#professions .recipe-card'],
      ['quests','#quests .quest-v2-list-card'],
      ['trading','#trading .tp-panel'],
      ['chat','#chat .chat-panel'],
      ['pvp','#pvp .pvp-panel']
    ];
    let themedCount=0;
    for(const [view,selector] of styledScreens){
      await page.evaluate(v=>CellboundGame.switchView(v),view);
      const result=await page.evaluate(selector=>{
        const node=document.querySelector(selector);
        const computed=getComputedStyle(document.body);
        const theme=computed.getPropertyValue('--cb-theme-panel').trim();
        const canonical=computed.getPropertyValue('--cb-ui-panel').trim();
        if(!node)return {theme,canonical,rendered:false};
        const style=getComputedStyle(node);
        const rgba=style.backgroundColor.match(/[\d.]+/g)?.map(Number)||[];
        return {theme,canonical,rendered:true,bg:style.backgroundColor,
          dark:rgba.length>=3&&rgba[0]<85&&rgba[1]<95&&rgba[2]<95};
      },selector);
      assert(result.canonical,'shared dark-fantasy theme must define a panel colour on '+view);
      assert.equal(result.theme,result.canonical,'screen must use the current Block 1 dark-fantasy theme on '+view);
      if(result.rendered){
        assert.equal(result.dark,true,view+' uses a bright panel outside the unified dark-fantasy palette: '+result.bg);
        themedCount++;
      }
    }
    assert(themedCount>=5,'theme check must sample at least five game screens');
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

    // Desktop combat chat visibility regression: the old 16:9 image could
    // extend past the centre column, clipping the chat completely on PC.
    for(const desktop of [{width:1280,height:720},{width:1440,height:900},{width:1920,height:1080}]){
      await page.setViewportSize(desktop);
      for(const profile of ['pve','pvp']){
        const metrics=await page.evaluate(profile=>{
          const savedSocial=window.CellboundSocial;
          const root=document.createElement('div');
          root.className='cbcombat-backdrop';
          root.id='cbDesktopChatVisibilityTest';
          document.body.appendChild(root);
          window.CellboundSocial={mountCombatChat(){}};
          try{
            const shell=window.CellboundCombatViewer.mount(root,{
              profile,title:'Combat chat desktop QA',
              header:'COMBAT REBORN',
              arenaMarkup:'<div class="cb2d-arena" data-combat-arena="canonical"></div>',
              battleTopbarMarkup:'<div class="cbcombat-battle-topbar">Encounter status</div>',
              partyMarkup:'<div class="cb2d-party-row"><b>Fighter</b></div>',
              metersMarkup:'<div>Damage and healing meters</div>',
              commandsMarkup:'<div>Combat commands</div>'
            });
            const wrap=shell.querySelector('.cbcombat-arena-wrap');
            const chat=shell.querySelector('[data-combat-chat]');
            const input=chat?.querySelector('[data-combat-chat-input]');
            const battle=shell.querySelector('.cbcombat-battle-panel');
            const scene=wrap?.getBoundingClientRect(),panel=battle?.getBoundingClientRect();
            const box=chat?.getBoundingClientRect(),entry=input?.getBoundingClientRect();
            return {
              chatExists:!!chat,chatHeight:box?.height??0,
              entryExists:!!input,
              entryVisible:!!entry&&!!box&&entry.bottom<=box.bottom+2&&entry.top>=box.top-2,
              chatInFrame:!!box&&!!panel&&box.top>=panel.top-2&&box.bottom<=panel.bottom+2,
              arenaAboveChat:!!scene&&!!box&&scene.bottom<=box.top+2,
              imageRatio:scene?.height?scene.width/scene.height:0
            };
          }finally{
            root.remove();
            window.CellboundSocial=savedSocial;
          }
        },profile);
        assert(metrics.chatExists&&metrics.entryExists,
          profile+' combat markup must include the real chat and composer');
        assert(metrics.chatHeight>=120,
          profile+' chat must reserve readable height at '+desktop.width+'×'+desktop.height+': '+JSON.stringify(metrics));
        assert(metrics.chatInFrame&&metrics.entryVisible&&metrics.arenaAboveChat,
          profile+' chat must fit on PC without falling behind battle art at '+desktop.width+'×'+desktop.height+': '+JSON.stringify(metrics));
        assert(Math.abs(metrics.imageRatio-16/9)<0.04,
          profile+' scene must retain the uncropped 16:9 ratio at '+desktop.width+'×'+desktop.height+': '+JSON.stringify(metrics));
      }
    }
    await page.setViewportSize({width:1366,height:1024});

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
