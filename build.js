const fs=require('fs');
const path=require('path');
const vm=require('vm');
const files=['index.html','styles.css','auth.js','guild.html','guild.css','bank.css','character-sheet.css','gear-system.css','foundations.css','presentation-fx-v1.css','economy-v2.css','trading-post-v3.css','social-v3.css','pvp-v1.css','pvp-viewer-v1.css','pvp-match-v1.css','evolution-v1.css','dungeon-2d-v1.css','expedition-presentation-v1.css','combat-status-ui-v1.css','combat-vitals-ui-v1.css','endgame-v1.css','twelve-below-v1.css','admin-v1.css','release-v1.css','onboarding-v1.css','hollow-sanctum-v1.css','chaos-canyon-v1.css','blackout-station-v1.css','thirteenth-bell-v1.css','fourfold-lock-v1.css','fractured-ages-v1.css','dungeon-theme-v1.css','quests-v1.css','quests-v2.css','mobile-v1.css','readability-v1.css','ui-readability-v2.css','ui-polish-v3.css','gear-data.js','profession-data.js','combat-identities-v1.js','combat-reborn-v1.js','combat-standard-v1.js','combat-status-ui-v1.js','endgame-data-v1.js','presentation-fx-v1.js','guild-v4.js','character-sheet.js','gear-character-patch.js','character-foundations-patch.js','economy-v2.js','trading-post-v3.js','social-v3.js','pvp-combat-v1.js','pvp-viewer-v1.js','pvp-match-v1.js','pvp-v1.js','evolution-v1.js','expedition-presentation-v1.js','dungeon-2d-v1.js','twelve-below-v1.js','admin-v1.js','release-v1.js','onboarding-v1.js','hollow-sanctum-v1.js','chaos-canyon-v1.js','blackout-station-v1.js','thirteenth-bell-v1.js','endgame-v1.js','quests-v2.js','fourfold-lock-v1.js','fractured-ages-v1.js','mobile-v1.js'];
const assets=['assets/gear/cellbound-gear-atlas.webp','assets/combat/status-icons-v1.webp'];
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
  const playerCopyFiles=new Set(['guild.html','guild-v4.js','onboarding-v1.js','pvp-v1.js','endgame-v1.js','evolution-v1.js','quests-v2.js','dungeon-2d-v1.js','hollow-sanctum-v1.js','chaos-canyon-v1.js','blackout-station-v1.js','fractured-ages-v1.js','twelve-below-v1.js','thirteenth-bell-v1.js','fourfold-lock-v1.js']);
  if(playerCopyFiles.has(file)){
    for(const phrase of ['FARMABLE','authoritative Combat Reborn','authoritative Cellbound combat engine','proper 5v5 PvE','CHASE SYSTEM','UPDATE 2 · ENDGAME HUB','Title hook','Prestige cosmetic hook','normal endgame progression','repeat-run rule','randomized versions','Future Bellfoundry access hook','QUEST STRUCTURE','Combat Reborn final boss','simulation-driven','combat timeline rather than viewer buttons','COMBAT REBORN · RUN ANALYSIS','Pre-dungeon tactics are authoritative','stored combat timeline',' simulated time','Combat Reborn rules','actual Combat Reborn positions','NEW SYSTEM'])if(contents.includes(phrase))throw new Error('Player-facing copy regression in '+file+': '+phrase);
  }

  if(file==='guild-v4.js'){
    if(!contents.includes('function isBankUtility')||!contents.includes('!canonical.nonStackable&&state.bank.find')||!contents.includes('!canon.nonStackable&&out.find'))throw new Error('Guild Bank must preserve non-stackable charge-bearing utility items');
    if(!contents.includes("ceiling=({1:26,2:32,3:40,4:44})")||!contents.includes('if(tier>=5)return current'))throw new Error('Cell Shard upgrades must stop at the Chapter 1 tier ceiling and never create Tier 5 power');
  }
  if(file==='gear-data.js'){
    if(!contents.includes("5:{rarity:'Epic',label:'Tier 5'")||!contents.includes('raidExclusive:true'))throw new Error('Tier 5 must remain explicitly reserved for raid gear');
    if(!contents.includes('CHAPTER_GEAR={chapter:1,levelCap:15,dungeonTierCeiling:4,raidExclusiveTier:5}'))throw new Error('Chapter 1 gear contract is missing');
    if(!contents.includes("SLOT_ORDER=['Head','Shoulders','Chest','Hands','Waist','Legs','Feet','Weapon','OffHand','Ring','Trinket','Relic']"))throw new Error('Full Chapter 1 equipment slot catalogue is missing');
    if(!contents.includes('const SLOT_STAT_BUDGET=')||!contents.includes('function effectiveStatBudget'))throw new Error('14-slot combat stat budgeting is missing');
    if(!contents.includes('[1,2,3,4].forEach(tier=>'))throw new Error('Generic gear catalogue must stop at Tier 4');
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
    if(!contents.includes("const VERSION='1.3.4'")||!contents.includes('tests:{run:runSelfTests}'))throw new Error('Canonical Combat Reborn engine/version is missing');
    if(!contents.includes('resourceRegen:sets.some(s=>s.pieces>=4)?1.12:1'))throw new Error('T4 full-set combat bonus must remain a four-piece bonus');
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
  if(file==='twelve-below-v1.js'&&!contents.includes('aria-label="Close Twelve Below"'))throw new Error('Accessible close control is missing from Twelve Below');
  if(file==='fourfold-lock-v1.js'&&!contents.includes('aria-label="Close map"'))throw new Error('Accessible close control is missing from Fourfold Lock');
  if(file==='dungeon-theme-v1.css'){
    for(const hook of ["#cb2dBackdrop{","#hs2dBackdrop{","#cc2dBackdrop{","#bs2dBackdrop{","#fracturedAgesBackdrop{",".theme-ashen",".theme-hollow",".theme-canyon",".theme-blackout",".theme-fractured","Mechanic telegraphs/class colours are intentionally not overridden"])if(!contents.includes(hook))throw new Error('Dungeon theme system is missing '+hook);
  }
  if(file==='expedition-presentation-v1.js'){
    for(const hook of ["const VERSION='1.0.0'","'ashen-vault'","'hollow-sanctum'","'chaos-canyon'","'blackout-station'","'fractured-ages'","async function enter(","async function room(","window.CellboundExpeditionPresentation"])if(!contents.includes(hook))throw new Error('PvE expedition presentation is missing '+hook);
  }
  if(file==='expedition-presentation-v1.css'){
    for(const hook of [".cbx-transition{",".cbx-enter",".cbx-room",".cb2d-backdrop",".hs2d-backdrop",".cc2d-backdrop",".bs2d-backdrop",".fa-backdrop","100dvh"])if(!contents.includes(hook))throw new Error('PvE full-screen expedition styling is missing '+hook);
  }
  if(['dungeon-2d-v1.js','hollow-sanctum-v1.js','chaos-canyon-v1.js','blackout-station-v1.js','fractured-ages-v1.js'].includes(file)){
    if(!contents.includes('CellboundExpeditionPresentation'))throw new Error(file+' is not wired to the shared PvE expedition presentation');
  }
  if(file==='pvp-viewer-v1.css'){
    for(const hook of [".pvp2d-lower{","height:132px","max-height:132px",".pvp2d-feed{","overflow-y:auto","height:264px",".pvp2d-lower>section.pvp2d-meters","grid-template-columns:repeat(3,minmax(0,1fr))",".pvp2d-map{",".pvp2d-map-block",".pvp2d-map-area.tunnel",".pvp2d-hill-site",".pvp2d-hill.rotating","score-tick","pvpScoreTick","shifting-court","veilspire-arena",".pvp2d-arena-storm",".pvp2d-storm-fog","pvpStormDrift"])if(!contents.includes(hook))throw new Error('PvP combat feed/map/healing-meter presentation is missing '+hook);
  }
  if(file==='pvp-combat-v1.js'){
    for(const hook of ["const VERSION='1.8.0'","cellwind-bastion","shifting-court","veilspire-arena","PVP_MAPS","findMapPath","hasLineOfSight","LOS_BLOCKED","ARENA_STORM_PHASES","arenaStormAtTime","arenaAct","arenaTick","storm-progress","dampening","assignKothRoles","rotateHill","kothAct","hill-rotate","hill-contested","hill-score","assignCtfRoles","ctfCarrierAct","ctfAct","ctf-standoff","carryFlagHome","resolveDroppedFlag","window.CellboundPvPCombat"])if(!contents.includes(hook))throw new Error('PvP combat engine is missing '+hook);
    if(/THREAT_GENERATED|AGGRO_CHANGED|threatTable|\bthreat\b/i.test(contents))throw new Error('PvP combat must never use PvE threat or aggro');
  }
  if(file==='pvp-viewer-v1.js'){
    for(const hook of ["const VERSION='2.0.0'","requestAnimationFrame(frame)","'DAMAGE_DEALT'","'HEAL_RECEIVED'","'PLAYER_DEFEATED'","'FLAG_STATE'","'ARENA_STATE'","LOS_BLOCKED","mapMarkup","Cellwind Bastion","VEILSPIRE","pvp2d-arena-storm","storm-progress","Battle Fatigue","updateArenaStorm","pvp2d-hill-site","hill-rotate","hill-roles","hill-contested","hill-score","updateHill","score-tick","$(root,'[data-pvp2d-hill-site]')","ctf-opening","ctf-roles","ctf-standoff","FLAG STANDOFF","objectiveBadge","e.payload?.from","dataNode","viewer recovery active","carryFlagVisual","resetFlagVisual","REAL TIME","window.CellboundPvPViewer"])if(!contents.includes(hook))throw new Error('PvP 2D viewer is missing '+hook);
    if(/data-pvp-speed|pb\.speed|simTime\s*\+=\s*delta\s*\*/.test(contents))throw new Error('PvP viewer must be locked to real-time 1x playback');
    if(contents.includes('CSS.escape'))throw new Error('PvP viewer must use iPad-safe data selectors instead of CSS.escape');
    if(!contents.includes("e.result==='returned'")||!contents.includes("e.result==='dropped'"))throw new Error('PvP viewer must render CTF dropped and returned flag states');
  }
  if(file==='pvp-match-v1.js'){
    for(const hook of ["const VERSION='1.0.0'","OPPONENT FOUND","let seconds=10","CellboundPvPViewer","RETURN TO THE CRUCIBLE","window.CellboundPvPMatch"])if(!contents.includes(hook))throw new Error('Dedicated PvP match flow is missing '+hook);
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
    if(!contents.includes("dungeonCard('chaos-canyon')")||!contents.includes("leaderboardMarkup('chaos-canyon')"))throw new Error('Chaos Canyon must remain visible in the Endgame Hub');
    if(!contents.includes('function rollClearLoot')||!contents.includes('function clearLootGuaranteed'))throw new Error('Dungeon clear loot must retain bad-luck protection');
    if(!contents.includes("Number(x.tier)<Number(D.LOOT_RULES?.raidExclusiveTier||5)"))throw new Error('Dungeon loot pools must exclude raid-exclusive Tier 5');
    if(contents.includes("quality==='epic'?5"))throw new Error('Weekly rewards must never create Tier 5 gear');
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
  }
  if(file==='quests-v2.js'){
    if(!contents.includes('async function qPlayReborn')||!contents.includes('requestAnimationFrame(frame)'))throw new Error('Quest combat must use continuous Combat Reborn playback');
    for(const hook of ['data-q-speed','q2dHealingMeter','function qStatusTargets','CellboundCombatStatuses?.handle','data-q-side-resource','function qResourceDef','function qPulseUnit'])if(!contents.includes(hook))throw new Error('Quest combat HUD is missing '+hook);
    if(!contents.includes("simTime+=Math.min(rawDelta,100)*Math.max(.25,Number(questFight?.speed)||1)"))throw new Error('Quest combat playback speed must control the authoritative timeline');
  }
  if(file==='quests-v2.css'){
    if(!contents.includes('transition-property:left,top,transform,opacity,filter'))throw new Error('Quest combat units must animate left/top movement instead of snapping');
  }
  if(file==='onboarding-v1.js'){
    if(!contents.includes('function tdRenderCombatEvent')||!contents.includes('requestAnimationFrame(frame)'))throw new Error('First Expedition combat must use continuous playback');
  }
  if(file==='guild-v4.js'){
    if(!contents.includes("id:'chaos-canyon',name:'Chaos Canyon'")||!contents.includes("id:'blackout-station',name:'Blackout Station'")||!contents.includes("id:'fractured-ages',name:'The Fractured Ages'"))throw new Error('Overview Next Dungeon ladder must cover current dungeon progression');
  }
  if(file==='guild.html'){
    if(contents.includes('\\n<link')||contents.includes('\\n<script'))throw new Error('guild.html contains literal newline escape text between asset tags');
    if(contents.includes('id="attemptBtn"')||contents.includes('id="bossSelect"')||contents.includes('id="attemptModal"'))throw new Error('Legacy RNG boss-attempt UI must not return');
    if(!contents.includes('combat-reborn-v1.js'))throw new Error('Canonical Combat Reborn engine is not linked from guild.html');
    if(!contents.includes('expedition-presentation-v1.css')||!contents.includes('expedition-presentation-v1.js'))throw new Error('Shared PvE expedition presentation assets are not linked from guild.html');
    if(!contents.includes('dungeon-theme-v1.css'))throw new Error('Per-dungeon PvE theme layer is not linked from guild.html');

    const required=['rosterGrid','bankGrid','professionWorkshop','chatMessages','twelveBelowMount','dungeonRoute','dungeonIntel','enterDungeonBtn','partySlots'];
    for(const id of required)if(!contents.includes(`id="${id}"`))throw new Error(`Missing required Evolution hook: ${id}`);
    if(!contents.includes('evolution-v1.css')||!contents.includes('evolution-v1.js'))throw new Error('Evolution Pass assets are not linked from guild.html');
    if(!contents.includes('pvp-v1.css')||!contents.includes('pvp-viewer-v1.css')||!contents.includes('pvp-match-v1.css')||!contents.includes('pvp-combat-v1.js')||!contents.includes('pvp-viewer-v1.js')||!contents.includes('pvp-match-v1.js')||!contents.includes('pvp-v1.js')||!contents.includes('id="pvpMount"')||!contents.includes('data-hub="pvp"'))throw new Error('PvP assets or mount are not linked from guild.html');
    if(!contents.includes('dungeon-2d-v1.css')||!contents.includes('dungeon-2d-v1.js'))throw new Error('Ashen Vault 2D viewer assets are not linked from guild.html');
    if(!contents.includes('chaos-canyon-v1.css')||!contents.includes('chaos-canyon-v1.js')||!contents.includes('id="chaosCanyonMount"'))throw new Error('Chaos Canyon assets or mount are not linked from guild.html');
    if(!contents.includes('blackout-station-v1.css')||!contents.includes('blackout-station-v1.js')||!contents.includes('id="blackoutStationMount"'))throw new Error('Blackout Station assets or mount are not linked from guild.html');
    if(contents.includes('world-boss-2d-v1.css')||contents.includes('world-boss-2d-v1.js')||contents.includes('id="worldBossGrid"'))throw new Error('Legacy shared World Boss assets must not be linked from guild.html');
    if(!contents.includes('admin-v1.css')||!contents.includes('admin-v1.js')||!contents.includes('id=\"adminNav\"'))throw new Error('Admin panel assets or navigation hook are not linked from guild.html');
    if(!contents.includes('release-v1.css')||!contents.includes('release-v1.js')||!contents.includes('CELLBOUND_BUILD'))throw new Error('Release gate assets or build hook are not linked from guild.html');
    if(!contents.includes('onboarding-v1.css')||!contents.includes('onboarding-v1.js'))throw new Error('Zeltira onboarding assets are not linked from guild.html');
    if(!contents.includes('quests-v1.css')||!contents.includes('quests-v2.css')||!contents.includes('quests-v2.js')||!contents.includes('id="quests"'))throw new Error('Quest Adventure assets or hooks are not linked from guild.html');
    if(!contents.includes('hollow-sanctum-v1.css')||!contents.includes('hollow-sanctum-v1.js')||!contents.includes('id="hollowSanctumMount"'))throw new Error('Hollow Sanctum assets or hooks are not linked from guild.html');
    if(!contents.includes('mobile-v1.css')||!contents.includes('mobile-v1.js'))throw new Error('Mobile UX assets are not linked from guild.html');
    if(!contents.includes('ui-readability-v2.css'))throw new Error('UI readability stylesheet is not linked from guild.html');
    if(!contents.includes('ui-polish-v3.css'))throw new Error('Global UI polish stylesheet is not linked from guild.html');
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
for(const file of assets){const src=path.join(__dirname,file),dest=path.join(out,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest)}
for(const file of ['endgame-v1.css','endgame-data-v1.js','endgame-v1.js','readability-v1.css','ui-readability-v2.css','ui-polish-v3.css','blackout-station-v1.css','blackout-station-v1.js','trading-post-v3.css','trading-post-v3.js','combat-status-ui-v1.css','combat-status-ui-v1.js','pvp-v1.css','pvp-viewer-v1.css','pvp-match-v1.css','pvp-combat-v1.js','pvp-viewer-v1.js','pvp-match-v1.js','pvp-v1.js','expedition-presentation-v1.css','expedition-presentation-v1.js','dungeon-theme-v1.css','twelve-below-v1.css','twelve-below-v1.js']){if(!fs.existsSync(path.join(out,file)))throw new Error(`Missing required production asset: ${file}`)}
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
  if(G.items.some(x=>Number(x.tier)>=5))throw new Error('Generic gear catalogue contains raid-exclusive Tier 5 items');
  if(G.items.filter(x=>Number(x.tier)===4).length!==G.CLASS_ORDER.length*requiredSlots.length)throw new Error('Tier 4 catalogue must contain the full Chapter 1 slot catalogue for every current class');
  if(!G.TIER_META?.[5]?.raidExclusive)throw new Error('Tier 5 is not marked raid-exclusive');
  const fractured=D.lootProfileFor('fractured-ages','normal',0),peak=D.lootProfileFor('chaos-canyon','cellbound',20);
  if(fractured.itemLevel?.Weapon!==40||Math.max(...Object.keys(fractured.tiers||{}).map(Number))>4)throw new Error('Fractured Ages loot profile exceeds Chapter 1 Normal ceiling');
  if(peak.itemLevel?.Weapon!==44||Number(peak.tiers?.[5]||0)>0)throw new Error('Cellbound+ exceeds Tier 4 / Item Level 44 ceiling');
  console.log('Chapter 1 gear ladder validation passed.');
}
{
  const combatCode=fs.readFileSync(path.join(__dirname,'combat-reborn-v1.js'),'utf8');
  const sandbox={console,Math,Date,setTimeout,clearTimeout};sandbox.window=sandbox;
  vm.createContext(sandbox);vm.runInContext(combatCode,sandbox,{filename:'combat-reborn-v1.js'});
  const result=sandbox.CellboundCombatReborn?.tests?.run?.();
  if(!result||result.passed!==result.total){
    const failed=(result?.tests||[]).filter(x=>!x.pass).map(x=>x.name+(x.error?' · '+x.error:'')).join(', ');
    throw new Error('Combat Reborn self-tests failed: '+(failed||'test runtime unavailable'));
  }
  console.log('Combat Reborn self-tests passed: '+result.passed+'/'+result.total+'.');
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
