const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const {mount,matureState}=require('./full-playthrough.browser.cjs');

const engine=process.env.CELLBOUND_TEST_ENGINE==='webkit'?webkit:chromium;

async function waitClosed(page,selector){
  await page.waitForFunction(sel=>{const n=document.querySelector(sel);return !n||n.hidden||getComputedStyle(n).display==='none'},selector,{timeout:5000,polling:25});
}

(async()=>{
  const browser=await engine.launch({headless:true,executablePath:process.env.CELLBOUND_TEST_BROWSER||undefined});
  const page=await browser.newPage({viewport:{width:1024,height:1366}});
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
  page.on('dialog',d=>d.accept());

  try{
    await mount(page,matureState(),true,{simulateDungeonRuntime:true});
    await page.waitForFunction(()=>document.querySelector('#cellboundOnboarding')?.hidden===true,{},{timeout:10000,polling:50});
    await page.waitForFunction(()=>window.CellboundAdmin?.role==='owner',{},{timeout:10000,polling:50});

    await page.evaluate(()=>{
      const s=CellboundGame.getState();
      s.progression={...(s.progression||{}),ashenVaultUnlocked:true,fracturedAgesUnlocked:true,manorRaidUnlocked:true,manorRaidCleared:true,nullComplexUnlocked:true};
      s.questSystem=s.questSystem&&typeof s.questSystem==='object'?s.questSystem:{version:2,flags:{}};
      s.questSystem.flags={...(s.questSystem.flags||{}),hollowSanctumUnlocked:true,hollowFirstClear:true};
      for(const ch of s.roster){
        ch.level=15;ch.cellShock=0;ch.cellShockLockedUntil=null;ch.equipment=ch.equipment||{};
        for(const slot of ['Head','Chest','Weapon']){
          const base=CellboundGear.items.find(x=>x.class===ch.class&&x.slot===slot)||CellboundGear.items.find(x=>x.slot===slot)||{};
          ch.equipment[slot]={...base,id:'qa-'+ch.id+'-'+slot,itemId:base.itemId||('qa-'+slot),name:base.name||('QA '+slot),class:ch.class,slot,tier:5,itemLevel:50,baseItemLevel:50,power:25};
        }
      }
      CellboundGame.renderAll();
    });
    assert.equal(await page.evaluate(()=>CellboundGame.partyItemLevel()),50,'gameplay regression party is endgame-ready');

    await page.waitForFunction(()=>window.CellboundCombatStandard&&window.CellboundDungeon2D&&window.CellboundHollowSanctum&&window.CellboundChaosCanyon&&window.CellboundBlackoutStation&&window.CellboundFracturedAges&&window.CellboundManorRaid,{},{timeout:10000,polling:50});
    const audit=await page.evaluate(()=>CellboundCombatStandard.audit());
    for(const id of ['ashen-vault','hollow-sanctum','chaos-canyon','blackout-station','fractured-ages','manor-raid','quest-encounters','zeltira-first-expedition']){
      const z=audit.zones.find(x=>x.id===id);
      assert(z,id+' is absent from the shared combat registry');
      assert.equal(z.ui,'shared-cb2d',id+' is not pinned to the shared combat viewer');
    }

    const briefings=[
      {name:'Ashen Vault',api:'CellboundDungeon2D',root:'#cb2dBackdrop',start:'[data-start]',close:'[data-close]'},
      {name:'Hollow Sanctum',api:'CellboundHollowSanctum',root:'#hs2dBackdrop',start:'[data-start]',close:'[data-close]'},
      {name:'Chaos Canyon',api:'CellboundChaosCanyon',root:'#cc2dBackdrop',start:'[data-start]',close:'[data-close]'},
      {name:'Fractured Ages',api:'CellboundFracturedAges',root:'#fracturedAgesBackdrop',start:'[data-fa-start]',close:'[data-fa-close]'}
    ];
    for(const d of briefings){
      await page.evaluate(api=>window[api].open(),d.api);
      await page.waitForSelector(d.root+':not([hidden]) '+d.start,{timeout:5000});
      assert.equal(await page.locator(d.root+' '+d.start).isDisabled(),false,d.name+' must be enterable by an eligible party');
      if(d.name==='Chaos Canyon'){
        await page.locator(d.root+' [data-cc-pick="strategyPreset|safe"]').click();
        await page.locator(d.root+' [data-cc-pick="strategyPreset|aggressive"]').click();
      }
      await page.locator(d.root+' '+d.close).click();
      await waitClosed(page,d.root);
    }

    // Blackout Station: exercise normal puzzle entry, clean abandon, re-entry and owner start-at-Calder.
    await page.evaluate(()=>{localStorage.removeItem('cellbound-test-dungeon-attempt-v1');localStorage.removeItem('cellbound-test-dungeon-begins-v1');CellboundBlackoutStation.open()});
    await page.waitForSelector('#bs2dBackdrop:not([hidden]) [data-bs-start]',{timeout:5000});
    assert(await page.locator('#bs2dBackdrop [data-bs-owner-start]').isVisible(),'owner start-at-Dr-Vex control is visible');
    await page.locator('#bs2dBackdrop [data-bs-start]').click();
    await page.waitForSelector('#bs2dBackdrop .bs-puzzle-shell [data-bs-owner-skip]',{timeout:7000});
    assert.equal(await page.locator('#bs2dBackdrop [data-bs-owner-skip]').isDisabled(),false,'owner Grid Alignment skip is usable');
    assert.equal(await page.evaluate(()=>Number(localStorage.getItem('cellbound-test-dungeon-begins-v1'))),1,'first Blackout entry creates one attempt');
    await page.locator('#bs2dBackdrop [data-bs-close]').click();
    await waitClosed(page,'#bs2dBackdrop');

    await page.evaluate(()=>CellboundBlackoutStation.open());
    await page.waitForSelector('#bs2dBackdrop:not([hidden]) [data-bs-owner-start]',{timeout:5000});
    await page.locator('#bs2dBackdrop [data-bs-owner-start]').click();
    await page.waitForSelector('.cbd-backdrop[data-boss="vex-calder"] [data-cbd-begin]',{timeout:7000});
    await page.locator('.cbd-backdrop[data-boss="vex-calder"] [data-cbd-begin]').click();
    await page.waitForSelector('#bs2dBackdrop [data-combat-view="canonical-v1"]',{timeout:12000});
    assert.equal(await page.evaluate(()=>Number(localStorage.getItem('cellbound-test-dungeon-begins-v1'))),2,'re-entry after leaving starts a fresh Blackout attempt');
    const vex=await page.locator('#bs2dBackdrop [data-combat-view="canonical-v1"]').innerText();
    assert(/DR\. VEX CALDER|VEX CALDER/i.test(vex),'owner skip lands in the Dr. Vex Calder encounter');
    const roomArt=await page.evaluate(()=>document.querySelector('#bs2dBackdrop')?.innerHTML||'');
    assert(roomArt.includes('vex-calder-room.avif'),'Dr. Vex encounter uses the approved generator-hall artwork');
    await page.locator('#bs2dBackdrop [data-close]').click();
    await waitClosed(page,'#bs2dBackdrop');

    // Raid hub and ten-character snapshot contract.
    await page.evaluate(()=>CellboundGame.switchView('raids'));
    await page.evaluate(()=>CellboundManorRaid.refresh());
    await page.waitForFunction(()=>document.querySelector('#manorRaidMount')?.textContent?.includes('The Manor'),{},{timeout:7000,polling:50});
    const raidText=await page.locator('#manorRaidMount').innerText();
    assert(!/service unavailable/i.test(raidText),'The Manor hub loads without entering its error state');
    const snap=await page.evaluate(()=>CellboundManorRaid.snapshot());
    assert.equal(snap.length,5,'local Manor party snapshot contains the active five');
    assert(snap.every(x=>Number(x.level)>=15),'Manor party snapshot preserves raid-level eligibility');

    // Social / Party Finder.
    await page.evaluate(()=>CellboundGame.switchView('chat'));
    await page.evaluate(()=>CellboundSocial.refreshAll());
    await page.waitForSelector('#partyFinderTarget option',{timeout:5000});
    const targets=await page.locator('#partyFinderTarget option').allTextContents();
    for(const label of ['The Ashen Vault','The Hollow Sanctum','Chaos Canyon','Blackout Station','The Fractured Ages','The Manor']){
      assert(targets.some(x=>x.includes(label)),'Party Finder must offer '+label);
    }

    // Trading Post shell must complete a refresh without falling into its error state.
    await page.evaluate(()=>CellboundGame.switchView('trading'));
    await page.evaluate(()=>CellboundTradingPostV3.refresh(false,false));
    assert.equal(await page.locator('#trading').isVisible(),true,'Trading Post view is visible');
    assert.equal((await page.locator('#tpBrowseResults').innerText()).includes('market could not be loaded'),false,'Trading Post refresh does not enter its failure state');
    assert(await page.locator('#tpTabs [data-tp-tab]').count()>=3,'Trading Post tabs remain available');

    // Quest/tutorial and activity surfaces stay mounted in the same game shell.
    await page.evaluate(()=>CellboundGame.switchView('quests'));
    assert.equal(await page.locator('#quests').isVisible(),true,'Quest journal remains available after dungeon/raid regression');
    await page.evaluate(()=>CellboundGame.switchView('world'));
    assert.equal(await page.locator('#twelveBelowMount').count(),1,'Twelve Below activity mount is present');
    assert.equal(await page.locator('#nullComplexMount').count(),1,'Null Complex activity mount is present');

    assert.deepEqual(errors.filter(x=>!x.includes('Endgame state failed')),[],'gameplay regression emitted no unexpected browser errors');
    console.log('Gameplay browser regression passed: all five dungeons open/close correctly, Blackout reset + owner Calder skip works, canonical combat registrations are intact, Manor loads, Party Finder targets are complete, Trading Post refreshes, and quest/activity surfaces remain available.');
  }finally{
    await page.close();
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exit(1)});
