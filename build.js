const fs=require('fs');
const path=require('path');
const vm=require('vm');
const files=['index.html','styles.css','auth.js','guild.html','guild.css','bank.css','character-sheet.css','gear-system.css','item-art-v1.css','foundations.css','presentation-fx-v1.css','combat-polish-v2.css','economy-v2.css','trading-post-v3.css','social-v3.css','pvp-v1.css','pvp-viewer-v1.css','pvp-match-v1.css','evolution-v1.css','dungeon-2d-v1.css','expedition-presentation-v1.css','boss-dossier-v1.css','combat-status-ui-v1.css','combat-vitals-ui-v1.css','endgame-v1.css','manor-raid-v1.css','twelve-below-v1.css','admin-v1.css','release-v1.css','comic-scenes-v1.css','onboarding-v1.css','hollow-sanctum-v1.css','chaos-canyon-v1.css','blackout-station-v1.css','thirteenth-bell-v1.css','fourfold-lock-v1.css','no-way-back-v1.css','fractured-ages-v1.css','dungeon-theme-v1.css','quests-v1.css','quests-v2.css','mobile-v1.css','readability-v1.css','ui-readability-v2.css','ui-polish-v3.css','home-v2.css','command-ui-v1.css','roster-v2.css','character-portraits-v1.css','combat-portraits-v1.css','bank-v2.css','character-command-v1.css','character-talents-v2.css','layout-safety-v1.css','gear-data.js','profession-data.js','item-art-v1.js','character-portraits-v1.js','combat-portraits-v1.js','combat-identities-v1.js','combat-reborn-v1.js','combat-standard-v1.js','combat-status-ui-v1.js','endgame-data-v1.js','presentation-fx-v1.js','combat-polish-v2.js','guild-v4.js','character-sheet.js','gear-character-patch.js','character-foundations-patch.js','economy-v2.js','trading-post-v3.js','social-v3.js','pvp-combat-v1.js','pvp-viewer-v1.js','pvp-match-v1.js','pvp-v1.js','evolution-v1.js','expedition-presentation-v1.js','boss-dossier-v1.js','dungeon-2d-v1.js','twelve-below-v1.js','admin-v1.js','release-v1.js','comic-scenes-v1.js','onboarding-v1.js','hollow-sanctum-v1.js','chaos-canyon-v1.js','blackout-station-v1.js','thirteenth-bell-v1.js','endgame-v1.js','manor-raid-v1.js','quests-v2.js','fourfold-lock-v1.js','no-way-back-v1.js','fractured-ages-v1.js','mobile-v1.js'];
const assets=['assets/gear/cellbound-gear-atlas.webp','assets/combat/status-icons-v1.webp','assets/bosses/ashen-vault-vaultheart.webp','assets/bosses/hollow-sanctum-bound-choir.webp','assets/bosses/chaos-canyon-vorran.webp','assets/bosses/blackout-station-calder.webp','assets/bosses/fractured-ages-old-man.webp','assets/bosses/no-way-back-three-hounds.webp','assets/bosses/no-way-back-silas-vane.webp','assets/bosses/no-way-back-three-hounds-v2.webp','assets/bosses/no-way-back-silas-vane-v2.webp','assets/bosses/no-way-back-three-hounds-v3.jpg','assets/bosses/no-way-back-silas-vane-v3.jpg','assets/dungeons/ashen-vault.webp','assets/dungeons/hollow-sanctum.webp','assets/dungeons/chaos-canyon.webp','assets/dungeons/blackout-station.webp','assets/dungeons/fractured-ages.webp','assets/world/twelve-below-key-art.webp','assets/manor/manor-butler.webp','assets/manor/manor-maids.webp','assets/manor/manor-engineer.webp','assets/manor/manor-master.webp','assets/comics/tutorial/wardens_at_the_twilight_city_gate.webp','assets/comics/tutorial/moonlit_ruins_and_the_glowing_wardstone.webp','assets/comics/tutorial/the_quartermaster_s_choice.webp','assets/comics/tutorial/warden_s_descent_into_the_ruins.webp','assets/comics/tutorial/the_warden_and_the_arcane_diadem.webp','assets/comics/tutorial/arcane_overload_a_warden_s_lesson.webp','assets/comics/tutorial/arcane_forge_beneath_the_twilight_citadel.webp','assets/comics/tutorial/dawn_briefing_on_the_ash_road.webp','assets/comics/tutorial/dawn_departure_from_zeltira_citadel.webp'];
const out=path.join(__dirname,'dist');
const buildId=String(process.env.GITHUB_SHA||process.env.CELLBOUND_BUILD||'local-dev').trim();
const buildNumber=String(process.env.GITHUB_RUN_NUMBER||process.env.CELLBOUND_BUILD_NUMBER||'0').trim();
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
const touchFix=`\n<style id="cellbound-ios-touch-fix">html,body{touch-action:manipulation;-webkit-text-size-adjust:100%}button,a,input,label,[role="button"]{touch-action:manipulation}@media (hover:none) and (pointer:coarse){input,select,textarea{font-size:16px!important}}</style>\n`;
for(const file of files){
  const src=path.join(__dirname,file),dest=path.join(out,file);
  let contents=fs.readFileSync(src,'utf8');
  if(file.endsWith('.js')){try{new Function(contents)}catch(err){throw new Error(`Syntax check failed for ${file}: ${err.message}`)}}
  const playerCopyFiles=new Set(['guild.html','guild-v4.js','onboarding-v1.js','pvp-v1.js','endgame-v1.js','evolution-v1.js','quests-v2.js','dungeon-2d-v1.js','hollow-sanctum-v1.js','chaos-canyon-v1.js','blackout-station-v1.js','fractured-ages-v1.js','twelve-below-v1.js','thirteenth-bell-v1.js','fourfold-lock-v1.js','no-way-back-v1.js','manor-raid-v1.js']);
  if(playerCopyFiles.has(file)){
    for(const phrase of ['FARMABLE','authoritative Combat Reborn','authoritative Cellbound combat engine','proper 5v5 PvE','CHASE SYSTEM','UPDATE 2 · ENDGAME HUB','Title hook','Prestige cosmetic hook','normal endgame progression','repeat-run rule','randomized versions','Future Bellfoundry access hook','QUEST STRUCTURE','Combat Reborn final boss','simulation-driven','combat timeline rather than viewer buttons','COMBAT REBORN · RUN ANALYSIS','Pre-dungeon tactics are authoritative','stored combat timeline',' simulated time','Combat Reborn rules','actual Combat Reborn positions','NEW SYSTEM'])if(contents.includes(phrase))throw new Error('Player-facing copy regression in '+file+': '+phrase);
  }

  if(file==='combat-polish-v2.js'){
    for(const hook of ["const VERSION='2.0.0'","CellboundCombatFX","MutationObserver","cbvfx-layer","cbvfx-events","function impact","function heal","function interrupt","function death","function spawn","function boss","function victory"])if(!contents.includes(hook))throw new Error('Shared combat VFX runtime is missing '+hook);
  }
  if(file==='combat-polish-v2.css'){
    for(const hook of ['.cbvfx-layer','.cbvfx-events','.cbvfx-burst.damage','.cbvfx-burst.heal','.cbvfx-burst.interrupt','.cbvfx-burst.death','data-cbvfx-theme="ashen"','data-cbvfx-theme="hollow"','data-cbvfx-theme="chaos"','data-cbvfx-theme="blackout"','data-cbvfx-theme="pvp"','cbvfxLootReveal','prefers-reduced-motion'])if(!contents.includes(hook))throw new Error('Shared combat VFX styling is missing '+hook);
  }
  if(file==='economy-v2.js'){
    for(const hook of ['const WORKSHOP_ACTIONS=','function beginCraft(','async function resolveCraftStep(','function craftProjectMarkup(','FIRST CRAFT BONUS','MASTERWORK BONUS AVAILABLE','projectsCompleted','data-item-art-done="1"'])if(!contents.includes(hook))throw new Error('Profession project crafting runtime is missing '+hook);
    if(contents.includes('>CRAFT</button>'))throw new Error('Legacy profession spam-craft button returned');
  }
  if(file==='economy-v2.css'){
    for(const hook of ['/* Profession Workshop V2 */','.profession-command-hero','.craft-project','.craft-action-grid','.profession-recipe-card'])if(!contents.includes(hook))throw new Error('Profession Workshop V2 styling is missing '+hook);
  }
  if(file==='profession-data.js'){
    if(!contents.includes('const skillThreshold=level=>50+Math.max(1,level)*5;'))throw new Error('Profession project progression curve regressed');
  }
  if(file==='item-art-v1.js'){
    if(!contents.includes("card.querySelector(':scope > .recipe-output-art')"))throw new Error('Profession recipe art duplication guard is missing');
  }
  if(file==='evolution-v1.css'){
    for(const hook of ['/* Profession Workshop V2 layout ownership','#professions .recipe-list{','grid-template-columns:1fr!important','#professions .profession-recipe-card{'])if(!contents.includes(hook))throw new Error('Legacy profession layout override is not neutralised: '+hook);
  }
  if(file==='character-sheet.js'){
    for(const hook of ['const CHARACTER_TABS=','cb-command-character-header','cb-header-metrics','cb-command-overview','cb-profession-command','cb-history-command','cb-talent-command-v2','cb-talent-tier','cb-talent-inline-detail','data-char-jump','returnView='])if(!contents.includes(hook))throw new Error('Character Command redesign is missing '+hook);
    if(contents.includes("['knowledge','⌁','Mastery'")||contents.includes('function knowledgePanel'))throw new Error('Mastery must remain removed from the character screen');
    if(!contents.includes('function setSummaryMarkup')||!contents.includes('function setInlineMarkup')||!contents.includes('SET BONUSES'))throw new Error('Character equipment set bonus progress UI is missing');
    if(contents.includes('esc(item.setName)')||contents.includes('esc(rule.name)')||contents.includes('esc(rule.short)')||contents.includes('esc(rule.description)')||contents.includes('esc(item.setName||id)'))throw new Error('Tier 4 set UI is calling an undefined escape helper and will break the equipment drawer');
    for(const hook of ['escHtml(item.setName)','escHtml(rule.name)','escHtml(rule.short)','escHtml(rule.description)','escHtml(item.setName||id)'])if(!contents.includes(hook))throw new Error('Tier 4 set drawer escaping is missing '+hook);
    if(!contents.includes('function equipmentPanel')||!contents.includes('function equipmentFallback')||!contents.includes("stopImmediatePropagation();currentTab=tab.dataset.sheetTab"))throw new Error('Character Equipment tab recovery/navigation guard is missing');
    if(!contents.includes('function returnEquippedToBank')||!contents.includes('function refreshEquipmentSummary')||!contents.includes("const unequip=event.target.closest('[data-unequip-slot]');if(unequip){event.preventDefault();event.stopImmediatePropagation()"))throw new Error('Equipment replace/unequip must be atomic and take priority over slot clicks');
    if(contents.includes("if(item.slot==='Weapon')return ['Weapon','OffHand']")||!contents.includes("if(item.slot==='Weapon')return ['Weapon']"))throw new Error('Character Equipment UI is allowing main-hand weapons into OffHand');
    if(!contents.includes("paperDollHTML?.(c")||!contents.includes('data-paper-doll-stage')||!contents.includes('LIVE EQUIPMENT VIEW'))throw new Error('Character Equipment visual paper doll is missing');
    if(!contents.includes('function fallbackEquipmentSlot')||!contents.includes('cb-recovery-armoury')||!contents.includes("if(!item||typeof item!=='object')return false")||contents.includes('activeSlot=null;\n    return equipmentFallback'))throw new Error('Equipment recovery mode must preserve the paper doll and slot controls');
  }
  if(file==='bank-v2.css'){
    if(!contents.includes('#bank .bank-card-v2[data-hidden="1"]{display:none!important}'))throw new Error('Bank category filtering must override card display so materials cannot leak into Equipment');
  }
  if(file==='evolution-v1.js'){
    for(const hook of ['rosterClearFilters','rosterResultsLabel','Gear Watch','gearOrder='])if(!contents.includes(hook))throw new Error('Roster v2 filtering/enhancement is missing '+hook);
    for(const hook of ['bankMetricCrafting','data-bank-count','bank-filter-empty-v2',"bankCategory==='favorite'"])if(!contents.includes(hook))throw new Error('Bank v2 filtering/enhancement is missing '+hook);
  }
  if(file==='character-portraits-v1.js'){
    for(const hook of ['window.CellboundPortraits','normalizeAppearance','randomAppearance','portraitHTML','paperDollHTML','paperDollSVG','paperChest','paperWeapon','paperWaist','paperAccessories','visualProfile','weaponType','offHandType','setGroupId','editorHTML','bindEditor'])if(!contents.includes(hook))throw new Error('Character portrait/equipment visual engine is missing '+hook);
    if(!contents.includes("if(item.slot&&item.slot!=='OffHand')return''"))throw new Error('Paper doll must not invent an OffHand visual for main-hand weapons');
  }
  if(file==='roster-v2.css'){
    if(!contents.includes('.roster-card-portrait{')||!contents.includes('border:0;')||!contents.includes('background:none;')||!contents.includes('box-shadow:none'))throw new Error('Roster portrait wrapper must stay frameless');
  }
  if(file==='character-portraits-v1.css'){
    for(const hook of ['.cb-portrait','.cb-appearance-editor','.roster-card-portrait','.quest-dialogue-portrait','.cb-paper-doll','.cb-paper-slot.is-highlighted','.cb-paper-slot.is-set-item','.cb-paper-set-glow','.cb-equipment-set-visual','.cb-equipment-visual-stage'])if(!contents.includes(hook))throw new Error('Character portrait/equipment visual styling is missing '+hook);
    for(const hook of ['#party .party-choice{','grid-template-columns:56px minmax(0,1fr) auto','#party .party-choice>div:nth-child(2){','text-overflow:ellipsis'])if(!contents.includes(hook))throw new Error('Active Party portrait/text spacing is missing '+hook);
  }
  if(file==='guild-v4.js'){
    if(!contents.includes('const PLAYER_LEVEL_CAP=15;')||!contents.includes('getLevelCap:()=>PLAYER_LEVEL_CAP'))throw new Error('Player level cap regression');
    if(contents.includes("$('"+".bank-category-tabs [data-bank-category]"+").forEach"))throw new Error('Bank category buttons cannot call forEach on a single-element selector');
    if(!contents.includes("document.querySelectorAll('.bank-category-tabs [data-bank-category]').forEach"))throw new Error('Bank category buttons must bind through querySelectorAll');
    if(!contents.includes('function isBankUtility')||!contents.includes('!canonical.nonStackable&&state.bank.find')||!contents.includes('!canon.nonStackable&&out.find'))throw new Error('Guild Bank must preserve non-stackable charge-bearing utility items');
    if(!contents.includes("ceiling=({1:26,2:32,3:40,4:44})")||!contents.includes('if(tier>=5)return current'))throw new Error('Cell Shard upgrades must stop at the Chapter 1 tier ceiling and never create Tier 5 power');
    if(contents.includes('<span>Mastery</span>')&&contents.includes('function rosterCard'))throw new Error('Roster cards must not reintroduce the removed Mastery stat');
    for(const hook of ['roster-character-card','roster-card-metrics','roster-shock-line','roster-card-actions'])if(!contents.includes(hook))throw new Error('Roster v2 card renderer is missing '+hook);
    if(!contents.includes('function setBonusPanel')||!contents.includes('gear-set-panel'))throw new Error('Guild Bank set bonus explanation is missing');
  }
  if(file==='gear-system.css'){
    for(const hook of ['.gear-set-panel','.cb-set-summary','.cb2d-loot-set','.tp-set-bonus'])if(!contents.includes(hook))throw new Error('Equipment set bonus styling is missing '+hook);
  }
  if(file==='item-art-v1.js'){
    for(const hook of ["window.CellboundItemArt","function genericGear","function material","function consumable","function collection","frostbound-sigil","relic-oathstone-dominion","grid-override-module","enhancePvp","enhanceCrafting"])if(!contents.includes(hook))throw new Error('Complete item artwork system is missing '+hook);
  }
  if(file==='gear-data.js'){
    if(!contents.includes('appearanceId:itemId')||!contents.includes('inferWeaponType')||!contents.includes('inferOffHandType'))throw new Error('Equipment Visuals V2 item identity metadata is missing');
    if(!contents.includes('function equipmentPositions')||!contents.includes('function canEquipInSlot')||contents.includes("if(item.slot==='Weapon')return ['Weapon','OffHand']"))throw new Error('Weapon/OffHand slot rules are not strict');
    if(!contents.includes("5:{rarity:'Epic',label:'Tier 5'")||!contents.includes('raidExclusive:true'))throw new Error('Tier 5 must remain explicitly reserved for raid gear');
    if(!contents.includes('CHAPTER_GEAR={chapter:1,levelCap:15,dungeonTierCeiling:4,raidExclusiveTier:5}'))throw new Error('Chapter 1 gear contract is missing');
    if(!contents.includes("SLOT_ORDER=['Head','Shoulders','Chest','Hands','Waist','Legs','Feet','Weapon','OffHand','Ring','Trinket','Relic']"))throw new Error('Full Chapter 1 equipment slot catalogue is missing');
    if(!contents.includes('const SLOT_STAT_BUDGET=')||!contents.includes('function effectiveStatBudget'))throw new Error('14-slot combat stat budgeting is missing');
    if(!contents.includes('[1,2,3,4].forEach(tier=>'))throw new Error('Generic gear catalogue must stop at Tier 4');
    if(!contents.includes('const SET_BONUS_RULES=')||!contents.includes('function setPieceCount')||!contents.includes('function setBonusState')||!contents.includes('function setBonusLines'))throw new Error('Shared equipment set bonus rules are missing');
  }
  if(file==='endgame-data-v1.js'){
    if(!contents.includes('raidExclusiveTier:5')||!contents.includes('powerCeiling:44'))throw new Error('Dungeon loot must stop below raid-exclusive Tier 5');
    if(!contents.includes("'fractured-ages':")||!contents.includes("itemLevel:gearBand(38,39,40)"))throw new Error('Fractured Ages Normal loot must remain below Cellbound+ Tier 4 power');
    if(!contents.includes("return{tiers:{3:.55,4:.45},itemLevel:gearBand(42,43,44)"))throw new Error('Peak Cellbound+ loot must cap at Item Level 44');
    if(!contents.includes('enemyHealth:1.50,enemyDamage:1.38')||!contents.includes('enemyHealth:1.60*(1+(t-1)*.08)'))throw new Error('Full-gear Heroic / Cellbound+ combat tuning is missing');
    if(!contents.includes('pieces4:'))throw new Error('T4 set progression must use the 2/4-piece structure');
    if(!contents.includes('uniqueChance:{normal:0'))throw new Error('Tier 4 uniques must not leak into Normal difficulty');
  }
  if(file==='combat-identities-v1.js'){
    if(contents.includes('COMBAT REBORN BUNDLED FALLBACK')||contents.includes('window.CellboundCombatReborn='))throw new Error('Combat identities must not bundle a second Combat Reborn engine');
    if(!contents.includes('function ratingCurve')||!contents.includes('function primaryCurve'))throw new Error('Full-loadout rating diminishing returns are missing');
  }
  if(file==='combat-reborn-v1.js'){
    if(!contents.includes("if(!moveIntoRange(ctx,u,target,5))return true")||!contents.includes("_combatTalentTimers"))throw new Error('Bladestorm melee movement rule is missing');
    if(!contents.includes("_combatPosition")||!contents.includes("data.currentPosition"))throw new Error('Combat slice position persistence is missing');
    if(!contents.includes("focusSelectedDamageOnly")||!contents.includes("!target.focusSelected"))throw new Error('Focus-selected damage gating is missing');
    if(!contents.includes("const VERSION='1.3.8'")||!contents.includes('tests:{run:runSelfTests}'))throw new Error('Canonical Combat Reborn engine/version is missing');
    if(!contents.includes('CellboundGear?.SET_BONUS_RULES')||!contents.includes('rules.pieces4?.resourceRegen'))throw new Error('Combat must consume shared 2/4-piece set bonus rules');
  }
  if(file==='combat-status-ui-v1.js'){
    if(!contents.includes("version:'2.1.0'"))throw new Error('Combat status UI smart-overhead version is missing');
    if(!contents.includes("maxVisible=mirror?8:(host.classList.contains('big')?4:3)"))throw new Error('Combat overhead statuses must stay capped at three for normal units');
    if(!contents.includes('statusPriority')||!contents.includes('is-fresh')||!contents.includes('is-expiring'))throw new Error('Combat status attention states are missing');
  }
  if(file==='blackout-station-v1.js'){
    if(!contents.includes("rollClearLoot?.('blackout-station'"))throw new Error('Blackout Station must use Chapter 1 clear-loot pacing');
  }
  if(file==='blackout-station-v1.js'){
    if(!contents.includes('dataset.zoneEpoch')||!contents.includes('hideRoleZones(false)'))throw new Error('Blackout role circuits must clear on shockwave resolution');
    if(!contents.includes('dataset.shockEpoch'))throw new Error('Blackout shockwave cleanup must protect against stale timers');
  }
  if(file==='blackout-station-v1.js'){
    if(contents.includes('cb2d-loot-gear-card'))throw new Error('Blackout completion screen must not use the broken one-off loot card');
    if(!contents.includes('function bsLootGearCard')||!contents.includes('cb2d-loot-item')||!contents.includes('cb2d-loot-roll'))throw new Error('Blackout completion gear must use the shared visual loot card');
  }
  if(file==='blackout-station-v1.js'){
    if(!contents.includes("GRID_OVERRIDE_DROP_CHANCE=.10")||!contents.includes('GRID_OVERRIDE_MAX_CHARGES=5'))throw new Error('Grid Override Module must remain a 10% five-charge Blackout drop');
    if(!contents.includes('async function useGridOverride()')||!contents.includes("if(!run.quickReconnect)"))throw new Error('Grid Override must remain gated behind a manual first clear');
    if(!contents.includes("tradeState:'tradeable'")||!contents.includes('nonStackable:true'))throw new Error('Grid Override Module must remain tradeable and non-stackable');
    if(!contents.includes("overrideDrop=Math.random()<GRID_OVERRIDE_DROP_CHANCE?createGridOverrideModule():null"))throw new Error('Grid Override drop must remain an independent 10% roll from equipment loot');
  }
  if(file==='blackout-station-v1.js'){
    for(const hook of ['bs-entry-status','bs2d-start','function bsXpCard','function bsCombatAnalysisHTML','data-bs-xp','PARTY EXPERIENCE'])if(!contents.includes(hook))throw new Error('Blackout shared briefing/results contract is missing '+hook);
  }
  if(file==='guild-v4.js'){
    if(!contents.includes('openBankItem(target.id)')||!contents.includes('detailScroll=Math.max(0,Number(ui.bankDetail?.scrollTop)||0)'))throw new Error('Bank item upgrades must keep the upgraded item modal open');
  }
  if(file==='character-sheet.js'){
    if(!contents.includes('writeState(state);activeSlot=slot;renderSheet()'))throw new Error('Equipped item upgrades must keep the active equipment drawer open');
  }
  if(file==='trading-post-v3.js'){
    if(/location\.reload\s*\(/.test(contents))throw new Error('Trading Post must not hard-reload the page after market actions');
    if((contents.match(/function timeLeft\s*\(/g)||[]).length!==1)throw new Error('Trading Post timeLeft helper must be defined exactly once');
    if(!contents.includes("db.rpc('market_get_gear_listings',{p_limit:300})"))throw new Error('Trading Post must read gear listings through the sanitized market RPC');
    if(!contents.includes("db.rpc('market_get_order_book',{p_limit:600})"))throw new Error('Trading Post must read commodity orders through the sanitized market RPC');
    if(!contents.includes("db.rpc('market_get_trade_history',{p_limit:300})"))throw new Error('Trading Post must read market history through the sanitized market RPC');
    if(!contents.includes('refreshStateFromServer'))throw new Error('Trading Post must resync authoritative game state after server mutations');
    if(/\$document\./.test(contents)||/(^|[^$])\$\([^\n]*\)\.forEach/m.test(contents))throw new Error('Trading Post contains an invalid single-element forEach selector');
    if(!contents.includes('market_sweep_my_expired')||!contents.includes('await syncMarketState()'))throw new Error('Trading Post expiry sweep must resync returned items and refunded gold');
    if(!contents.includes('tpGearSellPicker')||!contents.includes('data-sell-item'))throw new Error('Trading Post equipment seller must use the visual Bank item picker');
    if(contents.includes("<select id=\"tpGearSellItem\""))throw new Error('Trading Post must not regress to the name-only equipment dropdown');
    if(!contents.includes("if(!data?.id)throw new Error('The listing was not confirmed by the Trading Post.')"))throw new Error('Trading Post listing creation must verify the server response');
    if(!contents.includes('function isUtilityItem')||!contents.includes('UTILITY EFFECT')||!contents.includes('function utilityArtHTML'))throw new Error('Trading Post must preserve visual utility-item trading support');
  }
  if(file==='ui-polish-v3.css'){
    for(const hook of ['focus-visible','min-height:44px','.workspace-tabs','overflow-x:auto','prefers-reduced-motion','.resource-strip'])if(!contents.includes(hook))throw new Error('Global UI polish layer is missing '+hook);
  }
  if(file==='dungeon-2d-v1.js'&&!contents.includes('aria-label="Close dungeon"'))throw new Error('Accessible close control is missing from Ashen Vault');
  if(file==='hollow-sanctum-v1.js'&&!contents.includes('aria-label="Close dungeon"'))throw new Error('Accessible close control is missing from Hollow Sanctum');
  if(file==='chaos-canyon-v1.js'&&!contents.includes('aria-label="Close dungeon"'))throw new Error('Accessible close control is missing from Chaos Canyon');
  if(file==='blackout-station-v1.js'&&!contents.includes('aria-label="Close dungeon"'))throw new Error('Accessible close control is missing from Blackout Station');
  if(file==='fractured-ages-v1.js'&&!contents.includes('aria-label="Close dungeon"'))throw new Error('Accessible close control is missing from Fractured Ages');
  if(['dungeon-2d-v1.js','hollow-sanctum-v1.js','chaos-canyon-v1.js','blackout-station-v1.js','fractured-ages-v1.js'].includes(file)){
    if(!contents.includes('RETURN HOME →')||(!contents.includes("switchView?.('overview')")&&!contents.includes("switchView('overview')")))throw new Error('Dungeon completion flow must end on loot/results with a Return Home action: '+file);
  }
  if(file==='twelve-below-v1.js'&&!contents.includes('aria-label="Close Twelve Below"'))throw new Error('Accessible close control is missing from Twelve Below');
  if(file==='fourfold-lock-v1.js'&&!contents.includes('aria-label="Close map"'))throw new Error('Accessible close control is missing from Fourfold Lock');
  if(file==='dungeon-theme-v1.css'){
    for(const hook of ["#cb2dBackdrop{","#hs2dBackdrop{","#cc2dBackdrop{","#bs2dBackdrop{","#fracturedAgesBackdrop{",".theme-ashen",".theme-hollow",".theme-canyon",".theme-blackout",".theme-fractured","Mechanic telegraphs/class colours are intentionally not overridden"])if(!contents.includes(hook))throw new Error('Dungeon theme system is missing '+hook);
  }
  if(file==='expedition-presentation-v1.js'){
    for(const hook of ["const VERSION='1.1.0'","'ashen-vault'","'hollow-sanctum'","'chaos-canyon'","'blackout-station'","'fractured-ages'","async function enter(","async function room(","if(!isBoss&&!options.force)return;","BOSS AHEAD","window.CellboundExpeditionPresentation"])if(!contents.includes(hook))throw new Error('PvE expedition presentation is missing '+hook);
  }
  if(file==='expedition-presentation-v1.css'){
    for(const hook of [".cbx-transition{",".cbx-enter",".cbx-room",".cb2d-backdrop",".hs2d-backdrop",".cc2d-backdrop",".bs2d-backdrop",".fa-backdrop","100dvh"])if(!contents.includes(hook))throw new Error('PvE full-screen expedition styling is missing '+hook);
  }
  if(file==='boss-dossier-v1.js'){
    for(const hook of ["const VERSION='1.3.5'","'vaultheart'","'bound-choir'","'vorran'","'vex-calder'","'old-man'","'three-hounds'","'silas-vane'","./assets/bosses/ashen-vault-vaultheart.webp","./assets/bosses/hollow-sanctum-bound-choir.webp","./assets/bosses/chaos-canyon-vorran.webp","./assets/bosses/blackout-station-calder.webp","./assets/bosses/fractured-ages-old-man.webp","./assets/bosses/no-way-back-three-hounds-v3.jpg","./assets/bosses/no-way-back-silas-vane-v3.jpg","async function show(","Skip the full briefing on future runs","window.CellboundBossDossier"])if(!contents.includes(hook))throw new Error('Final boss dossier runtime is missing '+hook);
  }
  if(file==='boss-dossier-v1.css'){
    for(const hook of [".cbd-backdrop",".cbd-shell",".cbd-art",".cbd-art-backdrop",".cbd-ability",".cbd-intel",".cbd-stinger","theme-fractured","prefers-reduced-motion"])if(!contents.includes(hook))throw new Error('Final boss dossier styling is missing '+hook);
  }
  if(['dungeon-2d-v1.js','hollow-sanctum-v1.js','chaos-canyon-v1.js','blackout-station-v1.js','fractured-ages-v1.js'].includes(file)){
    if(!contents.includes('CellboundExpeditionPresentation'))throw new Error(file+' is not wired to the shared PvE expedition presentation');
    if(contents.includes('<select data-')&&contents.includes('-tier'))throw new Error(file+' still uses the broken native Cellbound+ tier selector');
    if(!contents.includes('tierPickerMarkup')||!contents.includes("querySelectorAll('[data-"))throw new Error(file+' is not using the shared tap-friendly Cellbound+ tier picker');
  }
  if(file==='pvp-viewer-v1.css'){
    for(const hook of [".pvp2d-lower{","height:132px","max-height:132px",".pvp2d-feed{","overflow-y:auto","height:264px",".pvp2d-lower>section.pvp2d-meters","grid-template-columns:repeat(3,minmax(0,1fr))",".pvp2d-map{",".pvp2d-map-block",".pvp2d-map-area.tunnel",".pvp2d-hill-site",".pvp2d-hill.rotating","score-tick","pvpScoreTick","shifting-court","veilspire-arena",".pvp2d-arena-storm",".pvp2d-storm-fog","pvpStormDrift"])if(!contents.includes(hook))throw new Error('PvP combat feed/map/healing-meter presentation is missing '+hook);
  }
  if(file==='pvp-combat-v1.js'){
    for(const hook of ["const VERSION='1.8.0'","cellwind-bastion","shifting-court","veilspire-arena","PVP_MAPS","findMapPath","hasLineOfSight","LOS_BLOCKED","ARENA_STORM_PHASES","arenaStormAtTime","arenaAct","arenaTick","storm-progress","dampening","assignKothRoles","rotateHill","kothAct","hill-rotate","hill-contested","hill-score","assignCtfRoles","ctfCarrierAct","ctfAct","ctf-standoff","carryFlagHome","resolveDroppedFlag","window.CellboundPvPCombat"])if(!contents.includes(hook))throw new Error('PvP combat engine is missing '+hook);
    if(/THREAT_GENERATED|AGGRO_CHANGED|threatTable|\bthreat\b/i.test(contents))throw new Error('PvP combat must never use PvE threat or aggro');
  }
  if(['dungeon-2d-v1.js','hollow-sanctum-v1.js','chaos-canyon-v1.js','blackout-station-v1.js','quests-v2.js','pvp-viewer-v1.js'].includes(file)){
    if(!contents.includes('CellboundCombatFX'))throw new Error(file+' is not wired to the shared combat VFX layer');
  }
  if(file==='pvp-viewer-v1.js'){
    for(const hook of ["const VERSION='2.0.0'","requestAnimationFrame(frame)","'DAMAGE_DEALT'","'HEAL_RECEIVED'","'PLAYER_DEFEATED'","'FLAG_STATE'","'ARENA_STATE'","LOS_BLOCKED","mapMarkup","Cellwind Bastion","VEILSPIRE","pvp2d-arena-storm","storm-progress","Battle Fatigue","updateArenaStorm","pvp2d-hill-site","hill-rotate","hill-roles","hill-contested","hill-score","updateHill","score-tick","$(root,'[data-pvp2d-hill-site]')","ctf-opening","ctf-roles","ctf-standoff","FLAG STANDOFF","objectiveBadge","e.payload?.from","dataNode","viewer recovery active","carryFlagVisual","resetFlagVisual","REAL TIME","window.CellboundPvPViewer"])if(!contents.includes(hook))throw new Error('PvP 2D viewer is missing '+hook);
    if(/data-pvp-speed|pb\.speed|simTime\s*\+=\s*delta\s*\*/.test(contents))throw new Error('PvP viewer must be locked to real-time 1x playback');
    if(contents.includes('CSS.escape'))throw new Error('PvP viewer must use iPad-safe data selectors instead of CSS.escape');
    if(!contents.includes("e.result==='returned'")||!contents.includes("e.result==='dropped'"))throw new Error('PvP viewer must render CTF dropped and returned flag states');
  }
  if(file==='pvp-match-v1.js'){
    for(const hook of ["const VERSION='1.0.0'","OPPONENT FOUND","deadline=Date.now()+10000","CellboundPvPViewer","RETURN TO THE CRUCIBLE","window.CellboundPvPMatch"])if(!contents.includes(hook))throw new Error('Dedicated PvP match flow is missing '+hook);
  }
  if(file==='pvp-v1.js'){
    for(const hook of ["'capture-the-flag'","'king-of-the-hill'","const ARENA_UNLOCK_RANK=5","pvpEquipment","seasonCrests","CellboundPvPCombat","CellboundPvPViewer","CellboundPvPMatch","FIND ","window.CellboundPvP"])if(!contents.includes(hook))throw new Error('PvP foundation is missing '+hook);
    if(contents.includes('characterItemLevel(c)'))throw new Error('PvP equipment must remain isolated from PvE Item Level');
  }
  if(file==='evolution-v1.js'){
    if(/worldBossGrid|CellboundWorldBoss2D|WORLD_BOSS_META/.test(contents))throw new Error('Legacy shared World Boss presentation must remain removed');
    for(const hook of ['function renderDungeonHistory','function bindReportEnhancement','function bindDungeonBrowser','bindReportEnhancement();bindGlobal();bindDungeonBrowser()'])if(!contents.includes(hook))throw new Error('Dungeon browser startup dependency missing: '+hook);
  }
  if(file==='endgame-v1.js'){
    for(const hook of ['resume_dungeon_attempt','save_dungeon_attempt_runtime','function beginOrResumeAttempt','function saveRuntime'])if(!contents.includes(hook))throw new Error('Resumable dungeon service is missing '+hook);
    if(!contents.includes("dungeonCard('chaos-canyon')")||!contents.includes("leaderboardMarkup('chaos-canyon')"))throw new Error('Chaos Canyon must remain visible in the Endgame Hub');
    if(!contents.includes('function rollClearLoot')||!contents.includes('function clearLootGuaranteed'))throw new Error('Dungeon clear loot must retain bad-luck protection');
    if(!contents.includes("Number(x.tier)<Number(D.LOOT_RULES?.raidExclusiveTier||5)"))throw new Error('Dungeon loot pools must exclude raid-exclusive Tier 5');
    if(contents.includes("quality==='epic'?5"))throw new Error('Weekly rewards must never create Tier 5 gear');
    if(!contents.includes('function tierPickerMarkup')||contents.includes('<select data-eg-tier'))throw new Error('Endgame Hub must use the tap-friendly Cellbound+ tier picker');
  }
  if(file==='endgame-v1.css'){
    for(const hook of ['.eg-tier-picker{','.eg-tier-picker-head{','.eg-tier-strip{','.eg-tier-strip button.active{','-webkit-overflow-scrolling:touch'])if(!contents.includes(hook))throw new Error('Cellbound+ tier picker styling is missing '+hook);
  }
  if(file==='twelve-below-v1.js'){
    if(!contents.includes('minimumItemLevel:38')||!contents.includes('baseRecommendedItemLevel:40')||!contents.includes('bossHealthScale:1.55')||!contents.includes('pressureScale:1.24'))throw new Error('Twelve Below full-gear balance contract is missing');
    if((contents.match(/itemLevel:42,power:10,statBudgetMultiplier:1/g)||[]).length!==6)throw new Error('Twelve Below relics must remain six iLvl 42 endgame chase pieces');
    if(contents.includes("toISOString().slice(0,10)"))throw new Error('Twelve Below daily reset must use local calendar time');
    if(!contents.includes('requestAnimationFrame(frame)'))throw new Error('Twelve Below playback must use the continuous frame clock');
    for(const hook of ['function burialCryptMarkup','function tbAtmosphere','function tbArenaBurst','tb-depth-backdrop','tb-crypt-ring','tb-soul-braziers','tb-grave-fog','TB_VICE_COLORS'])if(!contents.includes(hook))throw new Error('Twelve Below visual-reborn runtime is missing '+hook);
  }
  if(file==='twelve-below-v1.css'){
    for(const hook of ['TWELVE BELOW — SEPULCHRE VISUAL REBORN','.tb-depth-backdrop','.tb-floor-seal','.tb-crypt-marker','.tb-soul-braziers','.tb-grave-fog','.tb-spectral-pass','.tb-soul-burst','tbCryptWake','tbSoulFlame'])if(!contents.includes(hook))throw new Error('Twelve Below sepulchre visual layer is missing '+hook);
  }
  if(file==='social-v3.js'){
    for(const id of ['hollow-sanctum','chaos-canyon','blackout-station','fractured-ages'])if(!contents.includes("id:'"+id+"'"))throw new Error('Party Finder is missing dungeon target '+id);
    if(/get_world_bosses|join_world_boss|attack_world_boss|worldBosses|CellboundWorldBoss2D/.test(contents))throw new Error('Shared World Boss client paths must remain disabled');
  }
  if(file==='release-v1.js'){
    for(const id of ['#cc2dBackdrop','#bs2dBackdrop','#fracturedAgesBackdrop','#twelveBelowBackdrop','#thirteenthBellRoot','#fourfoldPuzzle'])if(!contents.includes(id))throw new Error('Release gate is missing active-gameplay protection for '+id);
  }
  if(file==='dungeon-2d-v1.js'){
    if(!contents.includes("$('[data-unit]').forEach"))throw new Error('Ashen Vault arena reflow selector regression detected');
    if(!contents.includes("script.src='./combat-reborn-v1.js"))throw new Error('Ashen Vault recovery loader must reload the canonical combat engine');
  }
  if(file==='chaos-canyon-v1.js'){
    if(!contents.includes("$('[data-cc]').forEach"))throw new Error('Chaos Canyon arena reflow selector regression detected');
    if(!contents.includes('async function ccFailNoHealer')||!contents.includes('await ccFailNoHealer(s,result)'))throw new Error('Chaos Canyon must surface healerless recovery failure instead of silently ending');
    if(!contents.includes('requestAnimationFrame(frame)'))throw new Error('Chaos Canyon combat playback must use the continuous frame clock');
  }
  if(file==='fractured-ages-v1.js'){
    if(!contents.includes('function carryCombatState')||!contents.includes('combatState:run?.combatState'))throw new Error('Fractured Ages must carry combat state across eras');
    if(!contents.includes('async function failRecovery'))throw new Error('Fractured Ages must handle healerless between-fight recovery');
    if(contents.includes('itemLevel:42'))throw new Error('Fractured Ages Normal must not hand out old Item Level 42 gear');
    if(!contents.includes("rollClearLoot?.('fractured-ages'"))throw new Error('Fractured Ages must use Chapter 1 clear-loot pacing');
    if(!contents.includes('autoContinueOnVictory:true')||!contents.includes("CellboundExpeditionPresentation?.room?.('fractured-ages'"))throw new Error('Fractured Ages boss victories must transition automatically');
    if(contents.includes('data-fa-fight')||contents.includes('data-fa-resolve'))throw new Error('Fractured Ages must not require manual continue buttons between boss victories and rewards');
  }
  const resumableDungeonHooks={
    'dungeon-2d-v1.js':['ashenSaveRuntime','ashenRestoreRuntime',"beginOrResumeAttempt?.('ashen-vault')",'runtimeStageStartedAt'],
    'hollow-sanctum-v1.js':['hsSaveRuntime','hsRestoreRuntime',"beginOrResumeAttempt?.('hollow-sanctum')",'runtimeStageStartedAt'],
    'chaos-canyon-v1.js':['ccSaveRuntime','ccRestoreRuntime',"beginOrResumeAttempt?.('chaos-canyon')",'runtimeStageStartedAt'],
    'blackout-station-v1.js':['bsSaveRuntime','bsRestoreRuntime',"beginOrResumeAttempt?.('blackout-station')",'runtimeStageStartedAt'],
    'fractured-ages-v1.js':['faSaveRuntime','faRestoreRuntime',"beginOrResumeAttempt?.('fractured-ages')",'wallClockStartAt']
  };
  if(resumableDungeonHooks[file])for(const hook of resumableDungeonHooks[file])if(!contents.includes(hook))throw new Error(file+' resumable dungeon runtime is missing '+hook);
  if(file==='manor-raid-v1.js'&&!contents.includes('startAt:readyStartAt()'))throw new Error('The Manor shared viewer must resume from the server encounter clock');
  if(file==='quests-v2.js'&&(!contents.includes('config.seed||')||!contents.includes('wallClockStartAt:Number(config.wallClockStartAt)')))throw new Error('Quest combat must support deterministic resumed dungeon playback');
  if(['dungeon-2d-v1.js','hollow-sanctum-v1.js','chaos-canyon-v1.js','blackout-station-v1.js','twelve-below-v1.js','world-boss-2d-v1.js','pvp-viewer-v1.js','onboarding-v1.js','quests-v2.js'].includes(file)){
    for(const legacy of ['Math.min(rawDelta,100)','Math.min(100,Math.max(0,now-last','Math.min(Math.max(0,now-lastFrame),100)']){
      if(contents.includes(legacy))throw new Error(file+' still discards background combat time');
    }
    if(!contents.includes('Date.now()-wallAnchor')&&!contents.includes('Date.now()-playStartedAt'))throw new Error(file+' must use a wall-clock combat timeline');
  }
  if(file==='quests-v2.js'){
    if(!contents.includes("Number(lastResult?.durationMs)"))throw new Error('Interactive slice duration must use lastResult');
    if(!contents.includes("_combatTalentTimers:x.talentTimers||{}")||!contents.includes("talentTimers=Object.fromEntries"))throw new Error('Quest sliced talent state carry is missing');
    if(!contents.includes("_combatPosition:x.position||null")||!contents.includes("enemyPositions[i]=e.position"))throw new Error('Interactive quest position carry is missing');
    if(!contents.includes("focusSelected:i===focus")||!contents.includes("focusSelectedDamageOnly:Boolean(config.focusSelectedDamageOnly)"))throw new Error('Interactive quest focus marker is missing');
    if(!contents.includes('config.autoContinueOnVictory')||!contents.includes('autoContinueDelayMs'))throw new Error('Interactive quest combat must support automatic victory flow');
    if((contents.match(/if\(config\.autoContinueOnVictory\)/g)||[]).length<2)throw new Error('Both standard and interactive quest combat must support automatic victory flow');
    if(!contents.includes("$$('[data-q-target]').forEach"))throw new Error('Live quest target controls must use querySelectorAll');
    if(!contents.includes('async function qPlayReborn')||!contents.includes('requestAnimationFrame(frame)'))throw new Error('Quest combat must use continuous Combat Reborn playback');
    for(const hook of ['data-q-speed','q2dHealingMeter','function qStatusTargets','CellboundCombatStatuses?.handle','data-q-side-resource','function qResourceDef','function qPulseUnit'])if(!contents.includes(hook))throw new Error('Quest combat HUD is missing '+hook);
    if(!contents.includes("Date.now()-wallAnchor")||!contents.includes("Math.max(.25,Number(questFight?.speed)||1)"))throw new Error('Quest combat playback must use a speed-aware wall clock');
    if(!contents.includes("level:2,recommendedItemLevel:18")||!contents.includes("level:4,recommendedItemLevel:20")||!contents.includes("level:5,recommendedItemLevel:22")||!contents.includes("level:6,recommendedItemLevel:24"))throw new Error('Quest combat progression targets are missing');
  }
  if(file==='thirteenth-bell-v1.js'){
    if(!contents.includes("kind:'final',level:8,recommendedItemLevel:24")||contents.includes("level:avg+1"))throw new Error('Edrin must use a fixed progressive quest-combat target');
  }
  if(file==='no-way-back-v1.js'){
    if(!contents.includes("reviveWindowMs:15000")||!contents.includes("revivePct:25")||!contents.includes("level:13,recommendedItemLevel:32")||!contents.includes("level:15,recommendedItemLevel:34"))throw new Error('No Way Back progressive combat targets are missing');
  }
  if(file==='quests-v2.css'){
    if(!contents.includes('transition-property:left,top,transform,opacity,filter'))throw new Error('Quest combat units must animate left/top movement instead of snapping');
  }
  if(file==='onboarding-v1.js'){
    if(!contents.includes('function tdRenderCombatEvent')||!contents.includes('requestAnimationFrame(frame)'))throw new Error('First Expedition combat must use continuous playback');
  }
  if(file==='guild-v4.js'){
    if(!contents.includes("id:'chaos-canyon',name:'Chaos Canyon'")||!contents.includes("id:'blackout-station',name:'Blackout Station'")||!contents.includes("id:'fractured-ages',name:'The Fractured Ages'"))throw new Error('Overview Next Dungeon ladder must cover current dungeon progression');
    if(!contents.includes("c.equipment[slot]=existing||(hasSlot?null:starters[slot])"))throw new Error('Explicitly unequipped core slots must stay empty after state normalization');
    if(contents.includes("existing||(keepBare&&hasSlot?null:starters[slot])"))throw new Error('Legacy starter restoration would re-equip removed Head/Chest/Weapon items');
    if(!contents.includes('function repairInvalidOffHands')||!contents.includes("G?.canEquipInSlot?.(off,'OffHand')")||!contents.includes('repairInvalidOffHands(s);'))throw new Error('Legacy main-hand weapons are not being recovered from OffHand');
    if(!contents.includes('craftHistory:p.craftHistory')||!contents.includes('projectsCompleted:Math.max'))throw new Error('Profession project progression is not preserved by guild state normalization');
  }
  if(file==='guild.html'){
    if(!contents.includes('boss-dossier-v1.css?v=3'))throw new Error('Boss dossier CSS cache version is stale in guild.html');
    if(!contents.includes('boss-dossier-v1.js?v=11'))throw new Error('Boss dossier cache version is stale in guild.html');
    if(!contents.includes('quests-v2.js?v=37')||!contents.includes('thirteenth-bell-v1.js?v=3')||!contents.includes('no-way-back-v1.js?v=10'))throw new Error('Progressive quest combat cache versions are stale in guild.html');
    if(!contents.includes('no-way-back-v1.css?v=4')||!contents.includes('no-way-back-v1.js?v=10'))throw new Error('No Way Back sail puzzle cache versions are stale in guild.html');
    if(!contents.includes('comic-scenes-v1.css?v=2')||!contents.includes('comic-scenes-v1.js?v=2')||!contents.includes('onboarding-v1.js?v=19'))throw new Error('Tutorial comic asset cache versions are stale in guild.html');
    if(!contents.includes('item-art-v1.css?v=1')||!contents.includes('item-art-v1.js?v=1'))throw new Error('Complete item artwork assets are not linked from guild.html');
    if(!contents.includes('economy-v2.css?v=8')||!contents.includes('profession-data.js?v=9')||!contents.includes('guild-v4.js?v=51')||!contents.includes('economy-v2.js?v=13'))throw new Error('Profession Workshop V2 cache versions are stale in guild.html');
    if(!contents.includes('endgame-v1.css?v=5')||!contents.includes('endgame-v1.js?v=7'))throw new Error('Cellbound+ tier picker assets are stale in guild.html');
    if(!contents.includes('character-portraits-v1.css?v=4')||!contents.includes('character-portraits-v1.js?v=5'))throw new Error('Character portrait identity assets are not linked from guild.html');
     if(!contents.includes('combat-portraits-v1.css?v=3')||!contents.includes('combat-portraits-v1.js?v=4'))throw new Error('Combat portrait assets are not linked from guild.html');
    if(!contents.includes('gear-system.css?v=11')||!contents.includes('gear-data.js?v=14')||!contents.includes('combat-reborn-v1.js?v=7')||!contents.includes('guild-v4.js?v=51')||!contents.includes('character-sheet.js?v=32')||!contents.includes('trading-post-v3.js?v=7')||!contents.includes('dungeon-2d-v1.js?v=55')||!contents.includes('hollow-sanctum-v1.js?v=40')||!contents.includes('chaos-canyon-v1.js?v=15')||!contents.includes('blackout-station-v1.js?v=22')||!contents.includes('fractured-ages-v1.js?v=8'))throw new Error('Set bonus UI cache versions are stale in guild.html');
    if(contents.includes('\\n<link')||contents.includes('\\n<script'))throw new Error('guild.html contains literal newline escape text between asset tags');
    const layoutSafetyLink='<link rel="stylesheet" href="./layout-safety-v1.css?v=1">';
    if(!contents.includes(layoutSafetyLink)||contents.lastIndexOf('<link rel="stylesheet"')!==contents.indexOf(layoutSafetyLink))throw new Error('Layout safety stylesheet must remain the final CSS layer in guild.html');
    if(contents.includes('id="attemptBtn"')||contents.includes('id="bossSelect"')||contents.includes('id="attemptModal"'))throw new Error('Legacy RNG boss-attempt UI must not return');
    if(!contents.includes('combat-reborn-v1.js'))throw new Error('Canonical Combat Reborn engine is not linked from guild.html');
    if(!contents.includes('expedition-presentation-v1.css')||!contents.includes('expedition-presentation-v1.js'))throw new Error('Shared PvE expedition presentation assets are not linked from guild.html');
    if(!contents.includes('boss-dossier-v1.css')||!contents.includes('boss-dossier-v1.js'))throw new Error('Final boss dossier assets are not linked from guild.html');
    if(!contents.includes('dungeon-theme-v1.css'))throw new Error('Per-dungeon PvE theme layer is not linked from guild.html');

    const required=['rosterGrid','bankGrid','professionWorkshop','chatMessages','twelveBelowMount','dungeonRoute','dungeonIntel','enterDungeonBtn','partySlots'];
    for(const id of required)if(!contents.includes(`id="${id}"`))throw new Error(`Missing required Evolution hook: ${id}`);
    if(!contents.includes('evolution-v1.css')||!contents.includes('evolution-v1.js'))throw new Error('Evolution Pass assets are not linked from guild.html');
    if(!contents.includes('pvp-v1.css')||!contents.includes('pvp-viewer-v1.css')||!contents.includes('pvp-match-v1.css')||!contents.includes('pvp-combat-v1.js')||!contents.includes('pvp-viewer-v1.js')||!contents.includes('pvp-match-v1.js')||!contents.includes('pvp-v1.js')||!contents.includes('id="pvpMount"')||!contents.includes('data-hub="pvp"'))throw new Error('PvP assets or mount are not linked from guild.html');
    for(const hook of ['data-view="party" data-mobile-core','data-view="content" data-mobile-core','data-view="quests" data-mobile-core','data-view="bank" data-mobile-core','data-mobile-more'])if(!contents.includes(hook))throw new Error('Direct navigation flow is missing '+hook);
    if(contents.includes('id="workspaceTabs"'))throw new Error('Redundant workspace navigation strip must remain removed');
    if(contents.includes('data-view="reports"'))throw new Error('Run Reports must stay incorporated into Endgame rather than return as a separate destination');
    if(!contents.includes('id="endgameHub"')||!contents.includes('class="endgame-run-history"')||!contents.includes('id="reportsList"'))throw new Error('Endgame must include the integrated Run Reports history');
    if(contents.includes('<div class="nav-section-label">SUPPLIES</div>'))throw new Error('Bank and Professions must remain in the Guild section');
    for(const hook of ['data-hub="guild" data-view="bank"','data-hub="guild" data-view="professions"','<div class="nav-section-label">MARKET</div>','data-hub="market" data-view="trading"','data-view="world"><span>✦</span><b>Events</b>'])if(!contents.includes(hook))throw new Error('Navigation regrouping is missing '+hook);
    if(contents.includes('data-hub="guild" data-view="chat"'))throw new Error('Social must remain separate from the Guild section');
    const socialNav=contents.indexOf('<div class="nav-section-label">SOCIAL</div>'),combatNav=contents.indexOf('<div class="nav-section-label">COMBAT</div>'),adminNav=contents.indexOf('id="adminNav"');
    if(socialNav<0||combatNav<0||adminNav<0||!(combatNav<socialNav&&socialNav<adminNav)||!contents.includes('data-hub="social" data-view="chat"'))throw new Error('Social must be the final player-facing sidebar section');
    const qNav=contents.indexOf('data-view="quests" data-mobile-core'),dNav=contents.indexOf('data-view="content" data-mobile-core'),eNav=contents.indexOf('data-view="world"><span>✦</span><b>Events</b>'),rNav=contents.indexOf('data-view="raids"><span>♜</span><b>Raids</b>'),egNav=contents.indexOf('data-view="endgame"><span>◇</span><b>Endgame</b>');
    if(qNav<0||dNav<0||eNav<0||rNav<0||egNav<0||!(qNav<dNav&&dNav<eNav&&eNav<rNav&&rNav<egNav))throw new Error('Adventure navigation must remain Quests → Dungeons → Events → Raids → Endgame');
    if(!contents.includes('<section id="raids" class="view">')||!contents.includes('id="manorRaidMount"'))throw new Error('Raids view or Manor raid mount is missing');
    const manorRuntime=fs.readFileSync(path.join(__dirname,'manor-raid-v1.js'),'utf8'),sharedViewerRuntime=fs.readFileSync(path.join(__dirname,'dungeon-2d-v1.js'),'utf8');
    if(!manorRuntime.includes("function combatEngine(){return window.CellboundCombatStandard}")||!manorRuntime.includes("zone:'manor-raid'")||!manorRuntime.includes('playSharedEncounter'))throw new Error('The Manor must use the standard Combat Reborn gateway and shared CB2D viewer');
    for(const hook of ["manor_set_ready","3 SECOND COUNTDOWN","subscribeRaidRealtime","encounterStartAt","readyA","readyB"])if(!manorRuntime.includes(hook))throw new Error('Manor synchronized ready check is missing '+hook);
    for(const hook of ["pendingRewardSession","UNCLAIMED MANOR REWARD","data-mr-pending-loot"])if(!manorRuntime.includes(hook))throw new Error('Manor released-group reward recovery is missing '+hook);
    if(!sharedViewerRuntime.includes('function playSharedEncounter(')||!sharedViewerRuntime.includes('playRebornTimeline(result,tok)'))throw new Error('Shared CB2D external encounter playback is missing');
    if(!sharedViewerRuntime.includes('externalOnEvent')||!sharedViewerRuntime.includes("case'INTERACTION_REQUIRED'"))throw new Error('Shared CB2D raid interaction event bridge is missing');
    const callbackAt=sharedViewerRuntime.indexOf('run.externalOnEvent(event,result)'),renderAt=sharedViewerRuntime.indexOf('renderRebornEvent(event,result,replayMode)',callbackAt);
    if(callbackAt<0||renderAt<0||callbackAt>renderAt)throw new Error('Raid interaction callbacks must fire before visual event rendering');
    for(const hook of ["zIndex:'2147483000'","host.style.display='grid'","handledScreechTokens","Manor Screech menu failed to open"])if(!manorRuntime.includes(hook))throw new Error('Manor Screech modal hardening is missing '+hook);
    const combatRuntime=fs.readFileSync(path.join(__dirname,'combat-reborn-v1.js'),'utf8');
    if(!combatRuntime.includes("emit(ctx,'INTERACTION_REQUIRED'")||!manorRuntime.includes("type:'interaction'")||!manorRuntime.includes('onEvent:handleRaidCombatEvent'))throw new Error('Manor Screech must be driven by Combat Reborn interaction events');
    const endgameStart=contents.indexOf('<section id="endgame" class="view">'),endgameEnd=contents.indexOf('<section id="world" class="view">',endgameStart);
    if(endgameStart<0||endgameEnd<0||contents.slice(endgameStart,endgameEnd).includes('manorRaidMount'))throw new Error('The Manor must not be mounted inside Endgame');
    if(!contents.includes('dungeon-2d-v1.css')||!contents.includes('dungeon-2d-v1.js'))throw new Error('Ashen Vault 2D viewer assets are not linked from guild.html');
    if(!contents.includes('chaos-canyon-v1.css')||!contents.includes('chaos-canyon-v1.js')||!contents.includes('id="chaosCanyonMount"'))throw new Error('Chaos Canyon assets or mount are not linked from guild.html');
    if(!contents.includes('blackout-station-v1.css')||!contents.includes('blackout-station-v1.js')||!contents.includes('id="blackoutStationMount"'))throw new Error('Blackout Station assets or mount are not linked from guild.html');
    if(contents.includes('world-boss-2d-v1.css')||contents.includes('world-boss-2d-v1.js')||contents.includes('id="worldBossGrid"'))throw new Error('Legacy shared World Boss assets must not be linked from guild.html');
    if(!contents.includes('admin-v1.css')||!contents.includes('admin-v1.js')||!contents.includes('id=\"adminNav\"'))throw new Error('Admin panel assets or navigation hook are not linked from guild.html');
    if(!contents.includes('release-v1.css')||!contents.includes('release-v1.js')||!contents.includes('CELLBOUND_BUILD'))throw new Error('Release gate assets or build hook are not linked from guild.html');
    if(!contents.includes('onboarding-v1.css')||!contents.includes('onboarding-v1.js'))throw new Error('Zeltira onboarding assets are not linked from guild.html');
    if(!contents.includes('quests-v1.css')||!contents.includes('quests-v2.css')||!contents.includes('quests-v2.js')||!contents.includes('id="quests"'))throw new Error('Quest Adventure assets or hooks are not linked from guild.html');
    if(!contents.includes('no-way-back-v1.css')||!contents.includes('no-way-back-v1.js'))throw new Error('No Way Back raid-attunement assets are not linked from guild.html');
    if(!contents.includes('hollow-sanctum-v1.css')||!contents.includes('hollow-sanctum-v1.js')||!contents.includes('id="hollowSanctumMount"'))throw new Error('Hollow Sanctum assets or hooks are not linked from guild.html');
    if(!contents.includes('mobile-v1.css')||!contents.includes('mobile-v1.js'))throw new Error('Mobile UX assets are not linked from guild.html');
    if(!contents.includes('ui-readability-v2.css'))throw new Error('UI readability stylesheet is not linked from guild.html');
    if(!contents.includes('ui-polish-v3.css'))throw new Error('Global UI polish stylesheet is not linked from guild.html');
    if(!contents.includes('home-v2.css')||!contents.includes('class="home-command"')||!contents.includes('class="home-destination-grid"')||!contents.includes('id="overviewGuildPulse"'))throw new Error('Guild Command Centre home is not linked or its required hooks are missing');
    if(!contents.includes('command-ui-v1.css'))throw new Error('Cross-game Guild Command UI layer is not linked from guild.html');
    if(!contents.includes('character-command-v1.css')||!contents.includes('character-talents-v2.css')||!contents.includes('character-sheet.js?v=32'))throw new Error('Character Command UI is not linked from guild.html');
    for(const hook of ['roster-v2.css?v=2','class="roster-overview-strip"','id="rosterClearFilters"','id="rosterResultsLabel"','class="roster-grid roster-grid-v2"'])if(!contents.includes(hook))throw new Error('Roster v2 UI is missing '+hook);
    for(const hook of ['bank-v2.css','class="bank-category-tabs"','id="bankClearFilters"','id="bankResultsLabel"','class="bank-grid bank-grid-v2"','data-bank-category="Gear"'])if(!contents.includes(hook))throw new Error('Bank v2 UI is missing '+hook);
    if(!contents.includes('bank-v2.css?v=2'))throw new Error('Bank v2 stylesheet cache version must include category-isolation fix');
    if(!contents.includes('combat-polish-v2.css')||!contents.includes('combat-polish-v2.js'))throw new Error('Shared combat VFX polish assets are not linked from guild.html');
    if(!contents.includes('trading-post-v3.css')||!contents.includes('trading-post-v3.js')||!contents.includes('id="tpBrowseResults"'))throw new Error('Trading Post v3 assets or hooks are not linked from guild.html');
    if(!contents.includes('id="tpGearSellPicker"')||!contents.includes('id="tpGearSellSelected"')||!contents.includes('id="tpGearSellItem" type="hidden"'))throw new Error('Trading Post visual sell picker hooks are missing from guild.html');
    if(contents.includes('<select id="tpGearSellItem"'))throw new Error('Trading Post regressed to the name-only equipment dropdown');
  }
  if(file.endsWith('.html')){
    contents=contents.replace(/__CELLBOUND_BUILD__/g,buildId);
    contents=contents.replace(/__CELLBOUND_BUILD_NUMBER__/g,buildNumber);
    contents=contents.replace(/(\.\/[A-Za-z0-9_./-]+\.(?:js|css))(?:\?[^"'\s>]*)?/g,(m,p)=>p+'?b='+encodeURIComponent(buildId));
    contents=contents.replace('</head>',`${touchFix}</head>`);
  }
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,contents)
}
{
  const portraitSandbox={console,Math,Date};portraitSandbox.window=portraitSandbox;portraitSandbox.globalThis=portraitSandbox;
  vm.createContext(portraitSandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'character-portraits-v1.js'),'utf8'),portraitSandbox,{filename:'character-portraits-v1.js'});
  const P=portraitSandbox.CellboundPortraits;
  if(!P?.paperDollHTML||!P?.visualProfile)throw new Error('Equipment Visuals V2 runtime failed to load');
  const appearance={race:'Veyren',skinTone:1,face:2,hair:3,hairColor:4,facialHair:1,marking:2,eyes:0,feature:1};
  const sword={name:'Test Sword',itemId:'test-sword',class:'Warrior',slot:'Weapon',tier:2};
  const spear={name:'Test Spear',itemId:'test-spear',class:'Warrior',slot:'Weapon',tier:2};
  if(P.weaponType(sword,{class:'Warrior'})!=='sword'||P.weaponType(spear,{class:'Warrior'})!=='spear')throw new Error('Weapon visual type swap failed');
  const base={id:'paper-test',name:'Test',race:'Veyren',class:'Warrior',appearance,equipment:{Weapon:sword,Waist:{name:'Test Belt',itemId:'test-belt',class:'Warrior',slot:'Waist',tier:2},Ring1:{name:'Test Ring',itemId:'test-ring',class:'Warrior',slot:'Ring',tier:2}}};
  const swordView=P.paperDollHTML(base,{highlightedSlot:'Weapon'});
  const spearView=P.paperDollHTML({...base,equipment:{...base.equipment,Weapon:spear}},{highlightedSlot:'Weapon'});
  if(swordView===spearView||!swordView.includes('data-weapon-type="sword"')||!spearView.includes('data-weapon-type="spear"'))throw new Error('Sword-to-spear paper doll visual swap failed');
  if(!swordView.includes('cb-paper-slot-waist')||!swordView.includes('cb-paper-slot-ring1'))throw new Error('14-slot paper doll accessory coverage failed');
  const emptyArmour=P.paperDollHTML({...base,equipment:{}},{});
  if(!emptyArmour.includes('cb-paper-empty-chest')||!emptyArmour.includes('cb-paper-empty-legs')||!emptyArmour.includes('cb-paper-empty-feet'))throw new Error('Unequipped paper doll must show clean underlayers instead of leftover armour');
  const chestItem={name:'Test Chest',itemId:'warrior-t2-chest',class:'Warrior',slot:'Chest',tier:2};
  const chestView=P.paperDollHTML({...base,equipment:{Chest:chestItem}},{});
  if(chestView.includes('cb-paper-empty-chest')||!chestView.includes('data-item-key="warrior-t2-chest"'))throw new Error('Equipping a replacement chest must fully replace the empty/previous visual layer');
  const setEquipment={};
  ['Head','Shoulders','Chest','Hands'].forEach(slot=>setEquipment[slot]={name:'Warlord '+slot,itemId:'warrior-t4-'+slot.toLowerCase(),class:'Warrior',slot,tier:4,setId:'warrior-t4',setName:'Warlord Set'});
  const setView=P.paperDollHTML({...base,equipment:setEquipment},{highlightedSlot:'Chest'});
  if(!setView.includes('set-pieces-4')||!setView.includes('cb-paper-set-glow')||!setView.includes('is-set-item'))throw new Error('Set prestige visual treatment failed');
}

for(const file of assets){const src=path.join(__dirname,file),dest=path.join(out,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest)}
for(const file of ['assets/dungeons/ashen-vault.webp','assets/dungeons/hollow-sanctum.webp','assets/dungeons/chaos-canyon.webp','assets/dungeons/blackout-station.webp','assets/dungeons/fractured-ages.webp']){if(!fs.existsSync(path.join(out,file)))throw new Error(`Missing Dungeon Journal artwork in production package: ${file}`)}
for(const file of ['assets/bosses/ashen-vault-vaultheart.webp','assets/bosses/hollow-sanctum-bound-choir.webp','assets/bosses/chaos-canyon-vorran.webp','assets/bosses/blackout-station-calder.webp','assets/bosses/fractured-ages-old-man.webp','assets/bosses/no-way-back-three-hounds.webp','assets/bosses/no-way-back-silas-vane.webp','assets/bosses/no-way-back-three-hounds-v2.webp','assets/bosses/no-way-back-silas-vane-v2.webp']){if(!fs.existsSync(path.join(out,file)))throw new Error(`Missing final boss artwork in production package: ${file}`)}
const combatPortraitRuntime=fs.readFileSync(path.join(__dirname,'combat-portraits-v1.js'),'utf8');
 for(const hook of ['cb-combat-has-boss-portrait','ashen-vault-vaultheart.webp','hollow-sanctum-bound-choir.webp','chaos-canyon-vorran.webp','blackout-station-calder.webp','fractured-ages-old-man.webp'])if(!combatPortraitRuntime.includes(hook))throw new Error('Boss combat portrait mapping is missing '+hook);
 for(const file of ['endgame-v1.css','endgame-data-v1.js','endgame-v1.js','manor-raid-v1.css','manor-raid-v1.js','readability-v1.css','ui-readability-v2.css','ui-polish-v3.css','blackout-station-v1.css','blackout-station-v1.js','trading-post-v3.css','trading-post-v3.js','combat-status-ui-v1.css','combat-status-ui-v1.js','pvp-v1.css','pvp-viewer-v1.css','pvp-match-v1.css','pvp-combat-v1.js','pvp-viewer-v1.js','pvp-match-v1.js','pvp-v1.js','expedition-presentation-v1.css','expedition-presentation-v1.js','boss-dossier-v1.css','boss-dossier-v1.js','dungeon-theme-v1.css','twelve-below-v1.css','twelve-below-v1.js','combat-polish-v2.css','combat-polish-v2.js','combat-portraits-v1.css','combat-portraits-v1.js']){if(!fs.existsSync(path.join(out,file)))throw new Error(`Missing required production asset: ${file}`)}
{
  const blackoutCss=fs.readFileSync(path.join(out,'blackout-station-v1.css'),'utf8');
  if(!blackoutCss.includes('.bs-role-zones.resolving .bs-role-zone'))throw new Error('Resolved Blackout role-circle fade is missing');
}
{
  const blackoutCss=fs.readFileSync(path.join(out,'blackout-station-v1.css'),'utf8');
  if(!blackoutCss.includes('.bs2d-shell.results-mode .cb2d-loot-gear'))throw new Error('Blackout completion loot layout is missing');
  for(const hook of ['.bs-entry-status','.bs2d-start','.bs-entry-ready','.bs2d-shell.results-mode .cb2d-xp-section'])if(!blackoutCss.includes(hook))throw new Error('Finished Blackout presentation styling is missing '+hook);
}
{
  const blackoutCss=fs.readFileSync(path.join(out,'blackout-station-v1.css'),'utf8');
  if(!blackoutCss.includes('.bs-override-panel')||!blackoutCss.includes('.bs-override-drop-card'))throw new Error('Grid Override puzzle/drop presentation is missing');
  const bankCss=fs.readFileSync(path.join(out,'bank.css'),'utf8');
  if(!bankCss.includes('.bank-utility-art')||!bankCss.includes('.bank-utility-chargebar'))throw new Error('Guild Bank utility-item presentation is missing');
  const tradeCss=fs.readFileSync(path.join(out,'trading-post-v3.css'),'utf8');
  if(!tradeCss.includes('.tp-utility-art'))throw new Error('Trading Post utility-item artwork is missing');
}
{
  const statusCss=fs.readFileSync(path.join(out,'combat-status-ui-v1.css'),'utf8');
  if(!statusCss.includes('opacity:.42')||!statusCss.includes('.is-fresh')||!statusCss.includes('.is-expiring'))throw new Error('Smart compact combat status styling is missing');
  if(!statusCss.includes("background-image:url('./assets/combat/status-icons-v1.webp')"))throw new Error('Combat status sprite reference is missing');
  if(!fs.existsSync(path.join(out,'assets/combat/status-icons-v1.webp')))throw new Error('Combat status icon sprite is missing from production package');
}
{
  const sandbox={console,Math,Date,setTimeout,clearTimeout};sandbox.window=sandbox;sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'gear-data.js'),'utf8'),sandbox,{filename:'gear-data.js'});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'endgame-data-v1.js'),'utf8'),sandbox,{filename:'endgame-data-v1.js'});
  const G=sandbox.CellboundGear,D=sandbox.CellboundEndgameData;
  if(!G||!D)throw new Error('Chapter 1 gear validation runtime failed to load');
  const requiredSlots=['Head','Shoulders','Chest','Hands','Waist','Legs','Feet','Weapon','OffHand','Ring','Trinket','Relic'];
  for(const klass of G.CLASS_ORDER)for(let tier=1;tier<=4;tier++)for(const slot of requiredSlots)if(!G.items.some(x=>x.class===klass&&x.tier===tier&&x.slot===slot))throw new Error('Missing gear catalogue item: '+klass+' T'+tier+' '+slot);
  if(G.items.some(x=>!x.appearanceId))throw new Error('Base gear item missing stable character appearance identity');
  if(G.items.filter(x=>x.slot==='Weapon').some(x=>!x.weaponType))throw new Error('Weapon item missing character visual weapon type');
  if(G.items.filter(x=>x.slot==='OffHand').some(x=>!x.offHandType))throw new Error('Off-hand item missing character visual type');
  const weaponProbe=G.items.find(x=>x.slot==='Weapon'),offhandProbe=G.items.find(x=>x.slot==='OffHand');
  if(!weaponProbe||!offhandProbe||G.canEquipInSlot(weaponProbe,'OffHand')||!G.canEquipInSlot(weaponProbe,'Weapon')||!G.canEquipInSlot(offhandProbe,'OffHand')||G.canEquipInSlot(offhandProbe,'Weapon'))throw new Error('Weapon and OffHand compatibility contract failed');
  if(G.items.some(x=>Number(x.tier)>=5))throw new Error('Generic gear catalogue contains raid-exclusive Tier 5 items');
  if(G.items.filter(x=>Number(x.tier)===4).length!==G.CLASS_ORDER.length*requiredSlots.length)throw new Error('Tier 4 catalogue must contain the full Chapter 1 slot catalogue for every current class');
  if(!G.TIER_META?.[5]?.raidExclusive)throw new Error('Tier 5 is not marked raid-exclusive');
  const fractured=D.lootProfileFor('fractured-ages','normal',0),peak=D.lootProfileFor('chaos-canyon','cellbound',20);
  if(fractured.itemLevel?.Weapon!==40||Math.max(...Object.keys(fractured.tiers||{}).map(Number))>4)throw new Error('Fractured Ages loot profile exceeds Chapter 1 Normal ceiling');
  if(peak.itemLevel?.Weapon!==44||Number(peak.tiers?.[5]||0)>0)throw new Error('Cellbound+ exceeds Tier 4 / Item Level 44 ceiling');
  vm.runInContext(fs.readFileSync(path.join(__dirname,'profession-data.js'),'utf8'),sandbox,{filename:'profession-data.js'});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'item-art-v1.js'),'utf8'),sandbox,{filename:'item-art-v1.js'});
  const P=sandbox.CellboundProfessions,IA=sandbox.CellboundItemArt;
  if(!P||!IA)throw new Error('Complete item artwork runtime failed to load');
  const missingGearArt=G.items.filter(x=>!G.artHTML(x,64).includes('<svg'));
  if(missingGearArt.length)throw new Error('Equipment missing full item artwork: '+missingGearArt.slice(0,5).map(x=>x.itemId).join(', '));
  const missingMaterialArt=Object.keys(P.MATERIALS||{}).filter(key=>!P.materialArtHTML(key,64).includes('<svg'));
  if(missingMaterialArt.length)throw new Error('Materials missing full item artwork: '+missingMaterialArt.join(', '));
  const craftOutputs=Object.values(P.PROFESSIONS||{}).flatMap(x=>x.recipes||[]).map(x=>x.output).filter(x=>x?.category==='consumable');
  const missingCraftArt=craftOutputs.filter(x=>!P.consumableArtHTML(x.key,64).includes('<svg'));
  if(missingCraftArt.length)throw new Error('Crafted items missing full item artwork: '+missingCraftArt.map(x=>x.key).join(', '));
  const missingUniqueArt=Object.values(D.UNIQUE_ITEMS||{}).filter(x=>!IA.artHTML(x,64).includes('<svg'));
  if(missingUniqueArt.length)throw new Error('Unique items missing full item artwork: '+missingUniqueArt.map(x=>x.itemId).join(', '));
  const missingCollectionArt=Object.values(D.CHASE_REWARDS||{}).filter(x=>!IA.collectionHTML(x,64).includes('<svg'));
  if(missingCollectionArt.length)throw new Error('Collection rewards missing full item artwork: '+missingCollectionArt.map(x=>x.id).join(', '));
  console.log('Chapter 1 gear ladder validation passed. Full item artwork coverage passed: '+G.items.length+' gear, '+Object.keys(P.MATERIALS||{}).length+' materials, '+craftOutputs.length+' crafted items.');
}
{
  const combatCode=fs.readFileSync(path.join(__dirname,'combat-reborn-v1.js'),'utf8');
  const combatStandardCode=fs.readFileSync(path.join(__dirname,'combat-standard-v1.js'),'utf8');
  const sandbox={console,Math,Date,setTimeout,clearTimeout};sandbox.window=sandbox;sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(combatCode,sandbox,{filename:'combat-reborn-v1.js'});
  vm.runInContext(combatStandardCode,sandbox,{filename:'combat-standard-v1.js'});
  const result=sandbox.CellboundCombatReborn?.tests?.run?.();
  if(!result||result.passed!==result.total){
    const failed=(result?.tests||[]).filter(x=>!x.pass).map(x=>x.name+(x.error?' · '+x.error:'')).join(', ');
    throw new Error('Combat Reborn self-tests failed: '+(failed||'test runtime unavailable'));
  }
  console.log('Combat Reborn self-tests passed: '+result.passed+'/'+result.total+'.');
  const raidParty=[
    {id:'rt1',name:'Tank A',class:'Warrior',spec:'Protection',power:44,level:15,itemLevel:44},
    {id:'rh1',name:'Healer A',class:'Priest',spec:'Holy',power:44,level:15,itemLevel:44},
    {id:'rd1',name:'Damage A1',class:'Mage',spec:'Arcane',power:44,level:15,itemLevel:44},
    {id:'rd2',name:'Damage A2',class:'Hunter',spec:'Marksman',power:44,level:15,itemLevel:44},
    {id:'rd3',name:'Damage A3',class:'Rogue',spec:'Assassination',power:44,level:15,itemLevel:44},
    {id:'rt2',name:'Tank B',class:'Paladin',spec:'Protection',power:44,level:15,itemLevel:44},
    {id:'rh2',name:'Healer B',class:'Druid',spec:'Restoration',power:44,level:15,itemLevel:44},
    {id:'rd4',name:'Damage B1',class:'Warrior',spec:'Arms',power:44,level:15,itemLevel:44},
    {id:'rd5',name:'Damage B2',class:'Mage',spec:'Arcane',power:44,level:15,itemLevel:44},
    {id:'rd6',name:'Damage B3',class:'Hunter',spec:'Marksman',power:44,level:15,itemLevel:44}
  ];
  sandbox.CellboundCombatStandard.register('manor-raid',{kind:'raid',ui:'shared-cb2d'});
  const raid=sandbox.CellboundCombatStandard.simulate({party:raidParty,seed:'build-manor-raid',encounter:{
    id:'build-manor-raid',title:'Manor Raid Smoke Test',kind:'boss',level:15,
    enemies:[{name:'Raid Test Boss',classification:'boss'}],enemyHealth:1400,mechanicIntervalMs:2200,
    mechanics:[{name:'Shattered Floor',type:'persistent-circle',duration:900,persistMs:2600,tickMs:700,tickDamage:2,radius:8}],
    phases:[{id:'tank-phase',name:'Tank Phase',atPct:80,addMechanics:[{name:'Mark of the Manor',type:'tank-mark',duration:600,damageTakenPerStack:.15,swapAt:2}]}]
  }},{zone:'manor-raid'});
  if(raid.combatModel!=='Combat Reborn'||raid.combatZone!=='manor-raid')throw new Error('Manor raid did not use the standard Combat Reborn gateway');
  if(raid.summary.players.length!==10)throw new Error('Combat Reborn raid smoke test did not preserve all 10 characters');
  if(!raid.events.some(e=>e.type==='GROUND_HAZARD_SPAWNED'))throw new Error('Combat Reborn raid smoke test did not produce persistent floor hazards');
  if(!raid.events.some(e=>e.type==='TANK_MARK'))throw new Error('Combat Reborn raid smoke test did not produce tank-mark mechanics');
  console.log('Combat Reborn 10-character Manor smoke test passed.');
}
{
  const pvpCode=fs.readFileSync(path.join(__dirname,'pvp-combat-v1.js'),'utf8');
  const sandbox={console,Math,Date,setTimeout,clearTimeout};sandbox.window=sandbox;sandbox.globalThis=sandbox;
  vm.createContext(sandbox);vm.runInContext(pvpCode,sandbox,{filename:'pvp-combat-v1.js'});
  const result=sandbox.CellboundPvPCombat?.tests?.run?.();
  if(!result||result.passed!==result.total){
    const failed=(result?.tests||[]).filter(x=>!x.pass).map(x=>x.name).join(', ');
    throw new Error('PvP combat self-tests failed: '+(failed||'test runtime unavailable'));
  }
  console.log('PvP combat self-tests passed: '+result.passed+'/'+result.total+'.');
}
console.log('Cellbound build complete.');
console.log('Build verification passed: scripts parse and required UI hooks/assets are present.');
