const fs=require('fs');
const path=require('path');
const vm=require('vm');
const zlib=require('zlib');
const files=['index.html','styles.css','website-v1.css','auth.js','guild.html','guild.css','bank.css','character-sheet.css','gear-system.css','item-art-v1.css','foundations.css','presentation-fx-v1.css','combat-polish-v2.css','economy-v2.css','trading-post-v3.css','social-v3.css','pvp-v1.css','pvp-viewer-v1.css','pvp-match-v1.css','evolution-v1.css','dungeon-2d-v1.css','combat-3d-v1.css','expedition-presentation-v1.css','null-complex-v1.css','boss-dossier-v1.css','combat-status-ui-v1.css','combat-vitals-ui-v1.css','endgame-v1.css','manor-raid-v1.css','twelve-below-v1.css','admin-v1.css','admin-room-editor-v1.css','admin-comic-scene-editor-v1.css','beta-ops-v1.css','admin-beta-ops-v1.css','living-world-v1.css','dungeon-generator-v1.css','character-fit-viewer-v1.css','release-v1.css','comic-scenes-v1.css','onboarding-v1.css','hollow-sanctum-v1.css','chaos-canyon-v1.css','blackout-station-v1.css','thirteenth-bell-v1.css','fourfold-lock-v1.css','no-way-back-v1.css','fractured-ages-v1.css','dungeon-theme-v1.css','quests-v1.css','quests-v2.css','mobile-v1.css','readability-v1.css','ui-readability-v2.css','ui-polish-v3.css','home-v2.css','command-ui-v1.css','roster-v2.css','character-portraits-v1.css','combat-portraits-v1.css','bank-v2.css','character-command-v1.css','character-talents-v2.css','game-shell-v1.css','game-feel-v1.css','home-loop-v1.css','layout-safety-v1.css','class-build-v1.js','gear-data.js','profession-data.js','balance-v1.js','item-art-v1.js','character-portraits-v1.js','combat-portraits-v1.js','combat-identities-v1.js','combat-reborn-v1.js','combat-standard-v1.js','combat-status-ui-v1.js','endgame-data-v1.js','presentation-fx-v1.js','combat-polish-v2.js','guild-v4.js','character-sheet.js','gear-character-patch.js','character-foundations-patch.js','economy-v2.js','trading-post-v3.js','social-v3.js','pvp-combat-v1.js','pvp-viewer-v1.js','pvp-match-v1.js','pvp-v1.js','evolution-v1.js','expedition-presentation-v1.js','null-complex-v1.js','boss-dossier-v1.js','ashen-live-scenes-v1.js','dungeon-2d-v1.js','combat-3d-v1.js','twelve-below-v1.js','admin-v1.js','admin-room-editor-v1.js','admin-comic-scene-editor-v1.js','beta-ops-v1.js','admin-beta-ops-v1.js','world-presence-v1.js','living-world-v1.js','dungeon-generator-v1.js','character-fit-viewer-v1.js','release-v1.js','comic-scenes-v1.js','onboarding-v1.js','hollow-sanctum-v1.js','chaos-canyon-v1.js','blackout-station-v1.js','blackout-station-v2.js','thirteenth-bell-v1.js','endgame-v1.js','manor-raid-v1.js','quests-v2.js','fourfold-lock-v1.js','no-way-back-v1.js','fractured-ages-v1.js','mobile-v1.js','game-feel-v1.js'];
files.push('combat-polish-v3.js','combat-polish-v3.css','combat-physical-v4.js','combat-physical-v4.css');
const assets=['assets/gear/cellbound-gear-atlas.webp','assets/combat/status-icons-v1.webp','assets/bosses/ashen-vault-vaultheart.webp','assets/bosses/hollow-sanctum-bound-choir.webp','assets/bosses/chaos-canyon-vorran.webp','assets/bosses/blackout-station-calder.webp','assets/bosses/fractured-ages-old-man.webp','assets/bosses/no-way-back-three-hounds-v3.jpg','assets/bosses/no-way-back-silas-vane-v3.jpg','assets/ashen-vault/environment/floor-atlas.png','assets/ashen-vault/environment/props-atlas.png','assets/ashen-vault/battlefields/broken-gate.avif','assets/ashen-vault/battlefields/hall-embers.avif','assets/ashen-vault/battlefields/kael.avif','assets/ashen-vault/battlefields/furnace.avif','assets/ashen-vault/battlefields/embermaw.avif','assets/ashen-vault/battlefields/vault-depths.avif','assets/ashen-vault/battlefields/vaultheart.avif','assets/chaos-canyon/rooms/canyon-mouth.webp','assets/chaos-canyon/rooms/thorn-trail.webp','assets/chaos-canyon/rooms/sentinel.webp','assets/chaos-canyon/rooms/crossing.webp','assets/chaos-canyon/rooms/warden.webp','assets/chaos-canyon/rooms/wildheart.webp','assets/chaos-canyon/rooms/vorran.webp','assets/hollow-sanctum/rooms/gallery.webp','assets/hollow-sanctum/rooms/sentinel.webp','assets/hollow-sanctum/rooms/choir.webp','assets/blackout-station/rooms/vex-calder-room-v2.avif','assets/blackout-station/rooms/vex-calder-room.avif','assets/fractured-ages/rooms/high-noon.webp','assets/fractured-ages/rooms/iron-kingdom.webp','assets/fractured-ages/rooms/first-kingdom.webp','assets/fractured-ages/rooms/silent-frontier.webp','assets/fractured-ages/rooms/funhouse.webp','assets/dungeons/ashen-vault.webp','assets/dungeons/chaos-canyon.webp','assets/dungeons/blackout-station.webp','assets/dungeons/fractured-ages.webp','assets/quests/ashes-east-road-cinder-cart.webp','assets/tutorial/battlefields/rootling-nest.webp','assets/tutorial/battlefields/collapsed-gallery.webp','assets/tutorial/battlefields/hollow-warden.webp','assets/world/twelve-below-key-art.webp','assets/manor/manor-butler.webp','assets/manor/manor-maids.webp','assets/manor/manor-engineer.webp','assets/manor/manor-master.webp','assets/manor/manor-raid-hero.webp','assets/comics/tutorial/wardens_at_the_twilight_city_gate.webp','assets/comics/tutorial/moonlit_ruins_and_the_glowing_wardstone.webp','assets/comics/tutorial/the_quartermaster_s_choice.webp','assets/comics/tutorial/warden_s_descent_into_the_ruins.webp','assets/comics/tutorial/the_warden_and_the_arcane_diadem.webp','assets/comics/tutorial/arcane_overload_a_warden_s_lesson.webp','assets/comics/tutorial/arcane_forge_beneath_the_twilight_citadel.webp','assets/comics/tutorial/dawn_briefing_on_the_ash_road.webp','assets/comics/tutorial/dawn_departure_from_zeltira_citadel.webp','assets/comics/thirteenth-bell/sealed_letter.jpg','assets/comics/thirteenth-bell/greywake_arrival.jpg','assets/comics/thirteenth-bell/locked_house.jpg','assets/comics/thirteenth-bell/final_run.jpg','assets/comics/thirteenth-bell/bellkeeper.jpg','assets/comics/thirteenth-bell/bell_breaks.jpg','assets/comics/thirteenth-bell/greywake_freed.jpg','assets/comics/thirteenth-bell/departure.jpg','assets/comics/null-complex/voss-signal.webp','assets/comics/null-complex/facility-entry.webp','assets/comics/null-complex/first-aberrant.webp','assets/comics/null-complex/orin-recording.webp','assets/comics/null-complex/subject-zero.webp','assets/comics/null-complex/teleporter.webp','assets/comics/null-complex/overseer-awakens.webp','assets/comics/null-complex/prototype-07.webp','assets/comics/null-complex/escape.webp','assets/comics/null-complex/subject-zero-awake.webp'];
for(const required of ['assets/hollow-sanctum/rooms/gallery.webp','assets/hollow-sanctum/rooms/sentinel.webp','assets/hollow-sanctum/rooms/choir.webp']){
  if(!assets.includes(required))throw new Error('Hollow Sanctum rendered room asset is not shipped: '+required);
}
if(!assets.includes('assets/blackout-station/rooms/vex-calder-room-v2.avif'))throw new Error('Blackout Station Calder battlefield is not shipped');
if(!assets.includes('assets/quests/ashes-east-road-cinder-cart.webp'))throw new Error('Ashes on the East Road battlefield is not shipped');
if(!assets.includes('assets/tutorial/battlefields/rootling-nest.webp'))throw new Error('Chapter 0 Rootling Nest battlefield is not shipped');
if(!assets.includes('assets/tutorial/battlefields/collapsed-gallery.webp'))throw new Error('Chapter 0 Collapsed Gallery battlefield is not shipped');
if(!assets.includes('assets/tutorial/battlefields/hollow-warden.webp'))throw new Error('Chapter 0 Hollow Warden battlefield is not shipped');
for(const required of ['assets/fractured-ages/rooms/high-noon.webp','assets/fractured-ages/rooms/iron-kingdom.webp','assets/fractured-ages/rooms/first-kingdom.webp','assets/fractured-ages/rooms/silent-frontier.webp','assets/fractured-ages/rooms/funhouse.webp']){if(!assets.includes(required))throw new Error('Fractured Ages rendered battlefield is not shipped: '+required)}
for(const required of ['assets/chaos-canyon/rooms/canyon-mouth.webp','assets/chaos-canyon/rooms/thorn-trail.webp','assets/chaos-canyon/rooms/sentinel.webp','assets/chaos-canyon/rooms/crossing.webp','assets/chaos-canyon/rooms/warden.webp','assets/chaos-canyon/rooms/wildheart.webp','assets/chaos-canyon/rooms/vorran.webp']){if(!assets.includes(required))throw new Error('Chaos Canyon rendered room asset is not shipped: '+required)}
for(const [label,list] of [['runtime file',files],['asset',assets]]){
  const duplicates=[...new Set(list.filter((entry,index)=>list.indexOf(entry)!==index))];
  if(duplicates.length)throw new Error('Duplicate '+label+' entries in build manifest: '+duplicates.join(', '));
}
const rootRuntimeFiles=fs.readdirSync(__dirname).filter(name=>/\.(?:js|css)$/.test(name)&&name!=='build.js'&&name!=='build-site.js');
const orphanRuntimeFiles=rootRuntimeFiles.filter(name=>!files.includes(name));
if(orphanRuntimeFiles.length)throw new Error('Unshipped root runtime files must be linked or removed: '+orphanRuntimeFiles.join(', '));

const out=path.join(__dirname,'dist');
const buildId=String(process.env.GITHUB_SHA||process.env.CELLBOUND_BUILD||'local-dev').trim();
const buildNumber=String(process.env.GITHUB_RUN_NUMBER||process.env.CELLBOUND_BUILD_NUMBER||'0').trim();
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
const touchFix=`\n<style id="cellbound-ios-touch-fix">html,body{touch-action:manipulation;-webkit-text-size-adjust:100%}button,a,input,label,[role="button"]{touch-action:manipulation}@media (hover:none) and (pointer:coarse){input,select,textarea{font-size:16px!important}}</style>\n`;
for(const file of files){
  const src=path.join(__dirname,file),dest=path.join(out,file);
  let contents=fs.readFileSync(src,'utf8');
  if(file.endsWith('.js')){
    try{new Function(contents)}catch(err){throw new Error(`Syntax check failed for ${file}: ${err.message}`)}
    const singletonCollectionCall=/(^|[^$])\$\([^\n;)]*\)\.(?:forEach|map|filter|some|every|reduce)\(/m;
    if(singletonCollectionCall.test(contents))throw new Error('querySelector helper $ cannot be used as a collection in '+file+'; use document.querySelectorAll instead');
  }
  if(/sb_secret_|SUPABASE_SERVICE_ROLE(?:_KEY)?|service[_-]?role[_-]?key/i.test(contents))throw new Error('Server-only Supabase credential marker found in shipped asset '+file);
  if(file==='auth.js'){
    for(const hook of ['const NEW_PASSWORD_MIN=12',"creds(true,NEW_PASSWORD_MIN)","password.value.length<NEW_PASSWORD_MIN"])if(!contents.includes(hook))throw new Error('New/reset password hardening is missing '+hook);
  }
  const playerCopyFiles=new Set(['guild.html','guild-v4.js','onboarding-v1.js','pvp-v1.js','endgame-v1.js','evolution-v1.js','quests-v2.js','dungeon-2d-v1.js','hollow-sanctum-v1.js','chaos-canyon-v1.js','blackout-station-v1.js','fractured-ages-v1.js','twelve-below-v1.js','thirteenth-bell-v1.js','fourfold-lock-v1.js','no-way-back-v1.js','manor-raid-v1.js']);
  if(playerCopyFiles.has(file)){
    for(const phrase of ['FARMABLE','authoritative Combat Reborn','authoritative Cellbound combat engine','proper 5v5 PvE','CHASE SYSTEM','UPDATE 2 · ENDGAME HUB','Title hook','Prestige cosmetic hook','normal endgame progression','repeat-run rule','randomized versions','Future Bellfoundry access hook','QUEST STRUCTURE','Combat Reborn final boss','simulation-driven','combat timeline rather than viewer buttons','COMBAT REBORN · RUN ANALYSIS','Pre-dungeon tactics are authoritative','stored combat timeline',' simulated time','Combat Reborn rules','actual Combat Reborn positions','NEW SYSTEM'])if(contents.includes(phrase))throw new Error('Player-facing copy regression in '+file+': '+phrase);
  }

  if(file==='living-world-v1.js'){
    for(const hook of ["cellbound-owner-living-world-v1","toLowerCase()==='owner'","cellbound:admin-status","data-lw-place","data-lw-service","zelitra-town-square.webp","cb-lw-hotspot","OWNER PREVIEW · PHASE 3","data-lw-interact","openInterior","inn-interior.webp","data-lw-npc","data-lw-peer","cellbound:world-presence","approachNpc","interiorNode=target;showNpc(id)"])if(!contents.includes(hook))throw new Error('Living World owner gate/navigation is missing '+hook);
  }
  if(file==='world-presence-v1.js'){
    for(const hook of ["cellbound_world_presence_heartbeat","cellbound_world_presence_leave","cellbound:world-presence","VIEW_ZONE","12000"])if(!contents.includes(hook))throw new Error('Living World presence runtime is missing '+hook);
  }
  if(file==='home-v2.css'){
    for(const hook of [".home-destination.raids","url('./assets/manor/manor-raid-hero.webp')",".home-destination.raids:after"])if(!contents.includes(hook))throw new Error('Home Manor raid artwork styling is missing '+hook);
  }
  if(file==='combat-polish-v2.js'){
    for(const hook of ["const VERSION='2.0.0'","CellboundCombatFX","MutationObserver","cbvfx-layer","cbvfx-events","function impact","function heal","function interrupt","function death","function spawn","function boss","function victory"])if(!contents.includes(hook))throw new Error('Shared combat VFX runtime is missing '+hook);
  }
  if(file==='combat-polish-v2.css'){
    for(const hook of ['.cbvfx-layer','.cbvfx-events','.cbvfx-burst.damage','.cbvfx-burst.heal','.cbvfx-burst.interrupt','.cbvfx-burst.death','data-cbvfx-theme="ashen"','data-cbvfx-theme="hollow"','data-cbvfx-theme="chaos"','data-cbvfx-theme="blackout"','data-cbvfx-theme="pvp"','cbvfxLootReveal','prefers-reduced-motion'])if(!contents.includes(hook))throw new Error('Shared combat VFX styling is missing '+hook);
  }
  if(file==='quests-v2.js'){
    for(const hook of ["id:'signal-from-nowhere'","Prototype 07 — The Reconstituted","progression.nullComplexUnlocked","isNullComplexUnlocked"])if(!contents.includes(hook))throw new Error('Signal From Nowhere quest is missing '+hook);
    for(const hook of ['function qCombatants()','participants:[...p]',"String(config.quest||config.title||'Quest').toUpperCase()","Quest combat viewer failed to initialise"])if(!contents.includes(hook))throw new Error('Quest combat safety is missing '+hook);
    for(const hook of ['function classTrialPartyState(','function classTrialMechanics(','function classTrialCombat(','featuredCharacterId:t.character.id',"partyLabel:'CLASS-LED PARTY'","ENTER PARTY TRIAL →","mode:'party'"])if(!contents.includes(hook))throw new Error('Class-led party trial flow is missing '+hook);
    if(contents.includes("participants:[t.character]")||contents.includes("allowSolo:true")||contents.includes('ENTER SOLO TRIAL')||contents.includes('SOLO CLASS TRIAL'))throw new Error('Legacy solo class-trial flow returned');
    if(contents.includes('esc(config.quest.toUpperCase())'))throw new Error('Quest combat header can black-screen when a quest label is omitted');
    if(contents.includes("title:'The Cinder Cart'")){
      for(const hook of ["visualClass:'quest-ashfall-cinder-cart'","assets/quests/ashes-east-road-cinder-cart.webp","quest-battlefield-art--ashfall"])if(!contents.includes(hook))throw new Error('Ashes on the East Road Combat Reborn battlefield wiring is missing '+hook);
    }
  }
  if(file==='null-complex-v1.js'){
    for(const hook of ['function unlocked()','Complete Signal From Nowhere','BEGIN SIGNAL FROM NOWHERE','3 × 3 facility'])if(!contents.includes(hook))throw new Error('Null Complex quest gate is missing '+hook);
  }
  if(file==='economy-v2.js'){
    if(!contents.includes("document.querySelectorAll('#professionRecipeFilters [data-prof-recipe-filter]').forEach"))throw new Error('Profession recipe filters must bind as a collection');
    for(const hook of ['function beginCraft(','function maxCraftable(','function craftBatchDurationMs(','function craftFocusActive(','async function finishTimedCraft(','function tickCraft(','function craftProjectMarkup(','s.workshopCraftProject','data-craft-qty','data-craft-progress','FIRST CRAFT BONUS','MASTERWORK BONUS AVAILABLE','projectsCompleted','data-item-art-done="1"'])if(!contents.includes(hook))throw new Error('Timed batch profession crafting runtime is missing '+hook);
    for(const hook of ['function addConsumable(item,qty=1,boundCrafter=null)','payload.boundCharacterId=boundCrafter.id','recipe.crafterOnly?c:null','trainingScale=Math.max(.1,Number(recipe.trainingScale)||1)','BOUND TO'])if(!contents.includes(hook))throw new Error('Crafter-only item binding runtime is missing '+hook);
    for(const hook of ["['gear-enhancement','socket-gem'].includes(latestPayload.effect)",'item.attachment=item.attachment||','delete c.activeEnhancements[slot]'])if(!contents.includes(hook))throw new Error('Legacy crafted item migration is missing '+hook);
    if(contents.includes('>CRAFT</button>')||contents.includes('data-craft-action')||contents.includes('resolveCraftStep'))throw new Error('Legacy profession action-step crafting returned');
  }
  if(file==='economy-v2.css'){
    for(const hook of ['/* Profession Workshop V2 */','.profession-command-hero','.craft-project','.profession-recipe-card','/* Timed batch crafting */','.recipe-batch-order','.craft-timer-track','.craft-batch-rules'])if(!contents.includes(hook))throw new Error('Timed Profession Workshop styling is missing '+hook);
  }
  if(file==='profession-data.js'){
    if(!contents.includes('const skillThreshold=level=>160+Math.max(1,level)*7;'))throw new Error('Profession project progression curve regressed');
    for(const hook of ['persistentAttachment=true','recipeMetaForOutputKey','const a=item?.attachment','kind:\'attachment\''])if(!contents.includes(hook))throw new Error('Persistent profession attachment model is missing '+hook);
    for(const hook of ["Jewelcrafting:{icon:'◆'","Engineering:{icon:'⚙'","Cooking:{icon:'♨'","Reliccrafting:{icon:'◈'","Scribing:{icon:'✒'","effect:'socket-gem'","effect:'character-gadget'","effect:'party-food'","attachmentFamily:'relic-core'","effect:'party-scroll'"])if(!contents.includes(hook))throw new Error('Expanded profession system is missing '+hook);
    for(const hook of ['crafterOnly:true','trainingScale:.45','payload.crafterOnly=true','output.tradeState=\'soulbound\'','boundCharacterId===c?.id'])if(!contents.includes(hook))throw new Error('Crafter-only profession recipe contract is missing '+hook);
    for(const hook of ['payload.socketReady=true','function activeProcs(c)','function consumeBossChargesOnce','SPECIAL_PREPARATIONS'])if(!contents.includes(hook))throw new Error('New profession runtime contract missing '+hook);
    if(!contents.includes('function activeBonuses(c,zone=null)')||!contents.includes('affinityZone===zone'))throw new Error('Scribing encounter affinity is missing');
    for(const hook of ['PROFESSION_REAGENT_TIERS','GENERAL_REAGENT_POOL','BOSS_RESOURCE_POOLS','professionReagentInputs','hollowroot','cavebeast-meat','rune-dust','zeltiran-hide','hollow-fibre','rough-gemstone','salvaged-parts','etched-vellum'])if(!contents.includes(hook))throw new Error('Distinct profession reagent economy is missing '+hook);
    for(const hook of ['CONTENT_RESOURCE_PROFILES','function rollContentReagents','hollow-sanctum','chaos-canyon','blackout-station','fractured-ages','manor'])if(!contents.includes(hook))throw new Error('Content-specific reagent ecology is missing '+hook);
    if(contents.includes('const general=randomReagentPicks(GENERAL_REAGENT_POOL,3)'))throw new Error('Boss reagent drops regressed to the global random material bag');
  }
  for(const themedFile of ['hollow-sanctum-v1.js','chaos-canyon-v1.js','blackout-station-v1.js','fractured-ages-v1.js','manor-raid-v1.js']){
    if(file===themedFile&&!contents.includes('rollContentReagents'))throw new Error(themedFile+' is missing thematic profession material rewards');
  }
  if(file==='null-complex-v1.js'){
    for(const hook of ['NULL_RESOURCE_POOLS','NULL_CATALYSTS','resourceSource','awardEnemyPending','Supply Storage','Maintenance Bay','Specimen Archive'])if(!contents.includes(hook))throw new Error('Null Complex ecological reagent sourcing is missing '+hook);
    if(!contents.includes("{key:'ancient-soul',minFloor:10}")||!contents.includes("chance=bonus?.22:.10"))throw new Error('Null Complex catalyst balance regressed');
  }
  if(file==='item-art-v1.js'){
    if(!contents.includes("card.querySelector(':scope > .recipe-output-art')"))throw new Error('Profession recipe art duplication guard is missing');
    for(const hook of ["effect==='socket-gem'","effect==='character-gadget'","effect==='party-food'","effect==='party-scroll'","attachmentFamily==='relic-core'"])if(!contents.includes(hook))throw new Error('New crafted item artwork type is missing '+hook);
    if(!contents.includes('P?.craftedRarity?.(r.level,r.endgame)'))throw new Error('Crafted item artwork rarity no longer follows profession progression');
  }
  if(file==='evolution-v1.css'){
    for(const hook of ['/* Profession Workshop V2 layout ownership','#professions .recipe-list{','grid-template-columns:1fr!important','#professions .profession-recipe-card{'])if(!contents.includes(hook))throw new Error('Legacy profession layout override is not neutralised: '+hook);
  }
  if(file==='character-sheet.js'){
    for(const hook of ['const CHARACTER_TABS=','cb-command-character-header','cb-header-metrics','cb-command-overview','cb-profession-command',"currentTab==='history'",'cb-talent-command-v2','cb-talent-tier','cb-talent-inline-detail','data-char-jump','returnView='])if(!contents.includes(hook))throw new Error('Character Command redesign is missing '+hook);
    if(contents.includes("['knowledge','⌁','Mastery'")||contents.includes('function knowledgePanel'))throw new Error('Mastery must remain removed from the character screen');
    if(!contents.includes('function setSummaryMarkup')||!contents.includes('function setInlineMarkup')||!contents.includes('SET BONUSES'))throw new Error('Character equipment set bonus progress UI is missing');
    if(contents.includes('esc(item.setName)')||contents.includes('esc(rule.name)')||contents.includes('esc(rule.short)')||contents.includes('esc(rule.description)')||contents.includes('esc(item.setName||id)'))throw new Error('Tier 4 set UI is calling an undefined escape helper and will break the equipment drawer');
    for(const hook of ['escHtml(item.setName)','escHtml(rule.name)','escHtml(rule.short)','escHtml(rule.description)','escHtml(item.setName||id)'])if(!contents.includes(hook))throw new Error('Tier 4 set drawer escaping is missing '+hook);
    if(!contents.includes('function equipmentPanel')||!contents.includes('function equipmentFallback')||!contents.includes("stopImmediatePropagation();currentTab=tab.dataset.sheetTab"))throw new Error('Character Equipment tab recovery/navigation guard is missing');
    if(!contents.includes('function returnEquippedToBank')||!contents.includes('function refreshEquipmentSummary')||!contents.includes("const unequip=event.target.closest('[data-unequip-slot]');if(unequip){event.preventDefault();event.stopImmediatePropagation()"))throw new Error('Equipment replace/unequip must be atomic and take priority over slot clicks');
    if(contents.includes("if(item.slot==='Weapon')return ['Weapon','OffHand']")||!contents.includes("if(item.slot==='Weapon')return ['Weapon']"))throw new Error('Character Equipment UI is allowing main-hand weapons into OffHand');
    if(!contents.includes("paperDollHTML?.(c")||!contents.includes('data-paper-doll-stage')||!contents.includes('LIVE EQUIPMENT VIEW'))throw new Error('Character Equipment visual paper doll is missing');
    if(!contents.includes('function fallbackEquipmentSlot')||!contents.includes('cb-recovery-armoury')||!contents.includes("if(!item||typeof item!=='object')return false")||contents.includes('activeSlot=null;\n    return equipmentFallback'))throw new Error('Equipment recovery mode must preserve the paper doll and slot controls');
    for(const hook of ['function attachmentStacksForSlot','cb-attachment-panel','data-apply-attachment','function applyAttachmentToEquipped'])if(!contents.includes(hook))throw new Error('Character equipment attachment flow is missing '+hook);
    for(const hook of ['function socketGemStacks','function socketPanel','data-apply-gem','function applyGemToEquipped'])if(!contents.includes(hook))throw new Error('Character equipment socket flow is missing '+hook);
    for(const hook of ['function refreshOpenEquipmentDrawer','refreshOpenEquipmentDrawer(state,c,slot);window.CellboundFX?.micro?.(stack.name+\' attached\'','refreshOpenEquipmentDrawer(state,c,slot);window.CellboundFX?.micro?.(stack.name+\' socketed\''])if(!contents.includes(hook))throw new Error('Gear attachment/socket actions must keep the equipment drawer open: '+hook);
    if(!contents.includes('permanently destroyed and cannot be recovered'))throw new Error('Attachment replacement must explicitly destroy the previous crafted attachment');
  }
  if(file==='bank-v2.css'){
    if(!contents.includes('#bank .bank-card-v2[data-hidden="1"]{display:none!important}'))throw new Error('Bank category filtering must override card display so materials cannot leak into Equipment');
    for(const hook of ['.bank-socket-chip','.bank-socket-detail','.bank-socket-row'])if(!contents.includes(hook))throw new Error('Bank socket styling is missing '+hook);
  }
  if(file==='character-command-v1.css'){
    for(const hook of ['.cb-socket-panel','.cb-socket-slot','.cb-socket-gem-option'])if(!contents.includes(hook))throw new Error('Character socket styling is missing '+hook);
  }
  if(file==='evolution-v1.js'){
    for(const hook of ['rosterClearFilters','rosterResultsLabel','Gear Watch','gearOrder='])if(!contents.includes(hook))throw new Error('Roster v2 filtering/enhancement is missing '+hook);
    for(const hook of ['bankMetricCrafting','data-bank-count','bank-filter-empty-v2',"bankCategory==='favorite'"])if(!contents.includes(hook))throw new Error('Bank v2 filtering/enhancement is missing '+hook);
    for(const hook of ['function openBankResource','data-resource-open','applyBankAttachment','learnBankRecipe'])if(!contents.includes(hook))throw new Error('Bank crafted-item action flow is missing '+hook);
    if(!contents.includes('function applyBankGem')||!contents.includes('data-bank-socket'))throw new Error('Bank socket-gem application flow is missing');
    for(const hook of ['function useBankPreparation','function useBankPartyPreparation','function activePartyCharacters','function applyBankGem','data-bank-gem','character-food','party-scroll'])if(!contents.includes(hook))throw new Error('Expanded profession Bank usage is missing '+hook);
    if(!contents.includes("'DESTROYS '+esc(existing.name||'ATTACHMENT')"))throw new Error('Bank attachment replacement must surface destructive overwrite');
    for(const hook of ['function findCraftedStack','boundCharacterId=split>=0','payload.boundCharacterId===c.id','Crafter only'])if(!contents.includes(hook))throw new Error('Bank crafter-only item ownership is missing '+hook);
  }
  if(file==='trading-post-v3.js'){
    for(const hook of ["!x?.payload?.crafterOnly","!x?.attachment?.crafterOnly","(x.sockets||[]).some(g=>g?.crafterOnly)","Crafter-only items are soulbound and cannot be traded."])if(!contents.includes(hook))throw new Error('Trading Post crafter-only exclusion is missing '+hook);
  }
  if(file==='fractured-ages-v1.js'){for(const hook of ['function faSceneMarkup(','assets/fractured-ages/rooms/high-noon.webp','assets/fractured-ages/rooms/funhouse.webp'])if(!contents.includes(hook))throw new Error('Fractured Ages rendered battlefield runtime is missing '+hook)}
  for(const stageFile of ['hollow-sanctum-v1.js','chaos-canyon-v1.js','fractured-ages-v1.js','blackout-station-v1.js']){
    if(file===stageFile&&!contents.includes('consumeBossChargesOnce'))throw new Error(stageFile+' is missing profession boss-charge consumption');
  }
  if(file==='blackout-station-v1.js'&&!contents.includes('craftedGridOverrideStack'))throw new Error('Crafted Engineering grid bypass is not integrated');
  if(file==='blackout-station-v1.js'&&!contents.includes('bs-grid-rig'))throw new Error('Blackout distribution board alignment rig is missing');
  if(file==='blackout-station-v1.css'&&(!contents.includes('top:37.5%')||!contents.includes('top:62.5%')||!contents.includes('Blackout Station exact cable alignment pass v3')))throw new Error('Blackout source/breaker alignment contract is missing');
  if(file==='combat-standard-v1.js'&&!contents.includes('professionZone:meta.zone'))throw new Error('Combat gateway must pass encounter zone for Scribing');

  if(file==='character-portraits-v1.js'){
    for(const hook of ['window.CellboundPortraits','CHARACTER_MODEL_VERSION=9',"CHARACTER_MODEL_CONTRACT='v9-beta-locked'","EQUIPMENT_LAYER_CONTRACT='shield-back|body|armour|front-offhand|mainhand-front'",'normalizeAppearance','randomAppearance','portraitHTML','paperDollHTML','paperDollSVG','paperChest','paperWeapon','paperWaist','paperAccessories','visualProfile','weaponType','offHandType','setGroupId','gearFitProfile','weaponFitProfile','paperHeadGearOnly','tierVisualProfile','tierChestAdornment','tierHeadAdornment','tierWeaponAdornment','tierOffHandAdornment','paperOffHandBack','paperOffHandFront','data-chest-top','editorHTML','bindEditor'])if(!contents.includes(hook))throw new Error('Character portrait/equipment visual engine is missing '+hook);
    if(!contents.includes("if(item.slot&&item.slot!=='OffHand')return''"))throw new Error('Paper doll must not invent an OffHand visual for main-hand weapons');
    if(!contents.includes('var baseFigure=illustratedBaseFigure(model')||contents.includes('paperBodyBase(model,a,skin,profile,uid)'))throw new Error('Equipped gear must layer over the same v9 illustrated character body used by the base model');
    for(const hook of ['leftRingX=fit.leftHand','rightRingX=fit.rightHand','fit.weaponX','fit.offhandX','fit.leftLeg','fit.rightLeg'])if(!contents.includes(hook))throw new Error('Adaptive equipment fitting is missing '+hook);
    if(!contents.includes("chestTop:gender===1?121:119"))throw new Error('Global chest armour realignment is missing');
    if(!contents.includes("paperBackLayer(model)+\n    paperOffHandBack(model,highlighted)+\n    baseFigure+")||!contents.includes("paperOffHandFront(model,highlighted)+\n    paperWeapon(model,highlighted)+"))throw new Error('Equipment layer order must keep shields behind, non-shield off-hands in front, and main-hand weapon topmost');
    for(const hook of ["data-render-layer=\"front\"","data-grip-x","data-grip-y","anchorX:fit.weaponX","pivotX:","pivotY:"])if(!contents.includes(hook))throw new Error('Type-aware front weapon fitting is missing '+hook);
    for(const hook of ['if(tier>=2)','if(tier>=3)','if(tier>=4)','if(tier>=5)'])if(!contents.includes(hook))throw new Error('Tier silhouette progression is missing '+hook);
  }
  if(file==='roster-v2.css'){
    if(!contents.includes('.roster-card-portrait{')||!contents.includes('border:0;')||!contents.includes('background:none;')||!contents.includes('box-shadow:none'))throw new Error('Roster portrait wrapper must stay frameless');
  }
  if(file==='character-portraits-v1.css'){
    for(const hook of ['.cb-portrait','.cb-appearance-editor','.roster-card-portrait','.quest-dialogue-portrait','.cb-paper-doll','.cb-paper-slot.is-highlighted','.cb-paper-slot.is-set-item','.cb-paper-set-glow','.cb-equipment-set-visual','.cb-equipment-visual-stage'])if(!contents.includes(hook))throw new Error('Character portrait/equipment visual styling is missing '+hook);
    for(const hook of ['#party .party-choice{','grid-template-columns:56px minmax(0,1fr) auto','#party .party-choice>div:nth-child(2){','text-overflow:ellipsis'])if(!contents.includes(hook))throw new Error('Active Party portrait/text spacing is missing '+hook);
  }
  if(file==='character-fit-viewer-v1.js'){
    for(const hook of ['function isOwner()','function auditCurrent()','function auditBetaMatrix()','function validateCharacter(','36 bodies','RUN BETA MATRIX','CP()?.modelContract','compare===\'frames\'','compare===\'sexes\'','compare===\'races\'','AUTO CYCLE ITEMS','SHOW FIT POINTS','gearFitProfile','main-hand weapon is not on the front layer','shield must remain behind the body'])if(!contents.includes(hook))throw new Error('Owner Character Fit Viewer is missing '+hook);
    if(!contents.includes("toLowerCase()==='owner'"))throw new Error('Character Fit Viewer must remain owner-only');
    if(contents.includes('Game.save')||contents.includes('persistState'))throw new Error('Character Fit Viewer must not mutate live game state');
  }
  if(file==='character-fit-viewer-v1.css'){
    for(const hook of ['.character-fit-viewer-mount','.cfv-preview.cfv-compare-frames','.cfv-anchor-layer','.cfv-model-stage','.cfv-inspector'])if(!contents.includes(hook))throw new Error('Character Fit Viewer styling is missing '+hook);
  }
  if(file==='guild-v4.js'){
    for(const hook of ["select('user_id,game_state,guild_name,membership_active_until","if(account?.guild_name)state.socialDisplayName=account.guild_name","select('game_state,guild_name,updated_at')"])if(!contents.includes(hook))throw new Error('Account-level guild-name lock sync is missing '+hook);
    if(contents.includes("from('guild_accounts').upsert"))throw new Error('Guild saves must not use upsert because account security forbids UPDATE on user_id');
    for(const hook of [".update({game_state:snapshot,updated_at:savedAt})",".insert({user_id:currentUser.id,game_state:snapshot,updated_at:savedAt})","localRoster>0&&remoteRoster===0","hadRoster&&s.onboarding?.stage==='party-builder'","cellbound-management-pending-save-v1","markPendingLocal()","localPendingNewer","flushPendingSave()","persistState({reusePending:true})","raw.onboarding||Number(raw.saveVersion)>0"])if(!contents.includes(hook))throw new Error('Resilient cloud save/recovery path is missing '+hook);
    if(!contents.includes("saveSerial.catch(error=>"))throw new Error('Save queue must recover after an unexpected rejected write');
    if(contents.includes('renderBosses()'))throw new Error('Legacy renderBosses call returned to the dungeon view');
    if(!contents.includes("const PLAYER_LEVEL_CAP=Number(BAL?.PLAYER_LEVEL_CAP)||15;")||!contents.includes('getLevelCap:()=>PLAYER_LEVEL_CAP'))throw new Error('Player level cap must come from the shared beta balance contract');
    if(contents.includes("$('"+".bank-category-tabs [data-bank-category]"+").forEach"))throw new Error('Bank category buttons cannot call forEach on a single-element selector');
    if(!contents.includes("document.querySelectorAll('.bank-category-tabs [data-bank-category]').forEach"))throw new Error('Bank category buttons must bind through querySelectorAll');
    if(!contents.includes('function isBankUtility')||!contents.includes('!canonical.nonStackable&&state.bank.find')||!contents.includes('!canon.nonStackable&&out.find'))throw new Error('Guild Bank must preserve non-stackable charge-bearing utility items');
    if(!contents.includes("ceiling=({1:26,2:32,3:40,4:44})")||!contents.includes('if(tier>=5)return current'))throw new Error('Cell Shard upgrades must stop at the Chapter 1 tier ceiling and never create Tier 5 power');
    if(contents.includes('<span>Mastery</span>')&&contents.includes('function rosterCard'))throw new Error('Roster cards must not reintroduce the removed Mastery stat');
    for(const hook of ['roster-character-card','roster-card-metrics','roster-shock-line','roster-card-actions'])if(!contents.includes(hook))throw new Error('Roster v2 card renderer is missing '+hook);
    if(!contents.includes('function setBonusPanel')||!contents.includes('gear-set-panel'))throw new Error('Guild Bank set bonus explanation is missing');
    for(const hook of ['function bankEquipmentSlots','function bankEquipSlot','data-equip-slot="','equipBankItem(id,b.dataset.equipChar,b.dataset.equipSlot)'])if(!contents.includes(hook))throw new Error('Guild Bank dual equipment slots must equip directly from the Bank');
    if(contents.includes('const slot=item.slot,incoming=canonicalItem(item)'))throw new Error('Guild Bank cannot equip Ring/Trinket items into their abstract catalogue slot');
  }
  if(file==='gear-system.css'){
    for(const hook of ['.gear-set-panel','.cb-set-summary','.cb2d-loot-set','.tp-set-bonus'])if(!contents.includes(hook))throw new Error('Equipment set bonus styling is missing '+hook);
  }
  if(file==='item-art-v1.js'){
    for(const hook of ["window.CellboundItemArt","function genericGear","function material","function consumable","function collection","frostbound-sigil","relic-oathstone-dominion","grid-override-module","enhancePvp","enhanceCrafting"])if(!contents.includes(hook))throw new Error('Complete item artwork system is missing '+hook);
  }
  if(file==='class-build-v1.js'){
    for(const hook of ["CURRENT_SPEC_POINT_CAP=12","TALENT_TIER_REQUIREMENTS=[0,2,4,6,8]","'Priest|Shadow':'dps'","'Hunter|Beast Mastery':'dps'","function talentBudgetForLevel","function talentRemaining"])if(!contents.includes(hook))throw new Error('Class build foundation is incomplete: '+hook);
  }
  if(file==='gear-data.js'){
    if(!contents.includes('appearanceId:itemId')||!contents.includes('inferWeaponType')||!contents.includes('inferOffHandType'))throw new Error('Equipment Visuals V2 item identity metadata is missing');
    if(!contents.includes('function equipmentPositions')||!contents.includes('function canEquipInSlot')||contents.includes("if(item.slot==='Weapon')return ['Weapon','OffHand']"))throw new Error('Weapon/OffHand slot rules are not strict');
    if(!contents.includes("5:{rarity:'Epic',label:'Tier 5'")||!contents.includes('raidExclusive:true'))throw new Error('Tier 5 must remain explicitly reserved for raid gear');
    if(!contents.includes('CHAPTER_GEAR={chapter:1,levelCap:15,dungeonTierCeiling:4,raidExclusiveTier:5}'))throw new Error('Chapter 1 gear contract is missing');
    if(!contents.includes("SLOT_ORDER=['Head','Shoulders','Chest','Hands','Waist','Legs','Feet','Weapon','OffHand','Ring','Trinket','Relic']"))throw new Error('Full Chapter 1 equipment slot catalogue is missing');
    if(!contents.includes('const SLOT_STAT_BUDGET=')||!contents.includes('function effectiveStatBudget'))throw new Error('14-slot combat stat budgeting is missing');
    if(!contents.includes('[1,2,3,4,5].forEach(tier=>'))throw new Error('Central gear catalogue must include raid-exclusive Tier 5 templates');
    if(!contents.includes('const SET_BONUS_RULES=')||!contents.includes('function setPieceCount')||!contents.includes('function setBonusState')||!contents.includes('function setBonusLines'))throw new Error('Shared equipment set bonus rules are missing');
    if(!contents.includes('pieces2:')||!contents.includes('pieces4:'))throw new Error('T4 set progression must use the 2/4-piece structure');
    if(!contents.includes("'Death Knight|Blood'")||!contents.includes("'Death Knight|Frost'")||!contents.includes("'Death Knight|Unholy'")||!contents.includes("raidName:'Grave Sovereign Plate'"))throw new Error('Death Knight T1-T5 gear/spec catalogue is incomplete');
    if(!contents.includes("'Demon Hunter|Havoc'")||!contents.includes("'Demon Hunter|Vengeance'")||!contents.includes("raidName:'Abyssal Hunt Regalia'"))throw new Error('Demon Hunter T1-T5 gear/spec catalogue is incomplete');
    if(!contents.includes("'Evoker|Preservation'")||!contents.includes("'Evoker|Devastation'")||!contents.includes("raidName:'Aspectbound Regalia'"))throw new Error('Evoker T1-T5 gear/spec catalogue is incomplete');
    for(const hook of ["'Priest|Shadow'","'Druid|Balance'","'Hunter|Beast Mastery'","'Rogue|Outlaw'","'Mage|Frost'","'Shaman|Elemental'","'Warlock|Destruction'"])if(!contents.includes(hook))throw new Error('Planned second-spec gear weighting is missing '+hook);
    if(!contents.includes('function setBonusRulesFor')||!contents.includes('talentSkillCooldownScale')||!contents.includes('specBias'))throw new Error('Adaptive spec-aware equipment foundation is incomplete');
    for(const hook of ["SOCKET_ELIGIBLE_SLOTS=new Set(['Head','Chest','Weapon'])","SOCKET_CHANCE={1:.15,2:.40,3:.70,4:1,5:1}",'function socketCountFor','function ensureSockets','function socketBonusMap',"item.slot==='Chest'?2:1","'|sockets:'"])if(!contents.includes(hook))throw new Error('Equipment socket foundation is missing '+hook);
    for(const hook of ["'Priest|Holy'","'Priest|Shadow'","Saintglass Whispers","Voidbound Insight","Attic Veil Whispers","Voidborne Ascendance","periodicDamageScale","resourceGainScale"])if(!contents.includes(hook))throw new Error('Priest adaptive set migration is incomplete: '+hook);
    for(const hook of ["'Shaman|Restoration'","'Shaman|Elemental'","Tempestcaller Tides","Totemic Harmony","Tempestcaller Conduction","Stormcharged Insight","Stormcell Conduction","Primal Ascendance"])if(!contents.includes(hook))throw new Error('Shaman adaptive set migration is incomplete: '+hook);
    for(const hook of ["'Druid|Restoration'","'Druid|Balance'","Moonbark Renewal","Verdant Continuance","Moonbark Eclipse","Astral Convergence","Nightbloom Eclipse","Celestial Convergence","eclipseDamageScale"])if(!contents.includes(hook))throw new Error('Druid adaptive set migration is incomplete: '+hook);
    for(const hook of ["'Mage|Arcane'","'Mage|Frost'","Starweave Overcharge","Arcane Resonance","Starweave Shatter","Winter Resonance","Housebound Shatter","Absolute Winter","frostProcDamageScale","frostProcRate"])if(!contents.includes(hook))throw new Error('Mage adaptive set migration is incomplete: '+hook);
    for(const hook of ["'Warlock|Demonology'","'Warlock|Destruction'","Dreadweave Command","Legion Resonance","Dreadweave Ruin","Ember Resonance","Netherlord Ruin","Cataclysmic Resonance","petDamageScale","destructionSpenderScale"])if(!contents.includes(hook))throw new Error('Warlock adaptive set migration is incomplete: '+hook);
    for(const hook of ["'Hunter|Marksman'","'Hunter|Beast Mastery'","Storm Hawkeye Precision","Deadeye Rhythm","Storm Hawkeye Packbond","Pack Hunt Rhythm","Blackwood Packbond","Alpha Hunt","petDamageScale"])if(!contents.includes(hook))throw new Error('Hunter adaptive set migration is incomplete: '+hook);
    for(const hook of ["'Rogue|Assassination'","'Rogue|Outlaw'","Master Shadecoil Venom","Silent Precision","Master Shadecoil Broadside","Loaded Arsenal","Silent Service Broadside","Black Flag Arsenal","outlawFinisherScale"])if(!contents.includes(hook))throw new Error('Rogue adaptive set migration is incomplete: '+hook);
  }
  if(file==='endgame-data-v1.js'){
    if(!contents.includes('raidExclusiveTier:5')||!contents.includes('powerCeiling:44'))throw new Error('Dungeon loot must stop below raid-exclusive Tier 5');
    if(!contents.includes("'fractured-ages':")||!contents.includes("itemLevel:gearBand(38,40,40)"))throw new Error('Fractured Ages Normal loot band regressed');
    if(!contents.includes("return{tiers:{3:.50,4:.50},itemLevel:gearBand(44,44,44)"))throw new Error('Peak Cellbound+ loot must cap at Item Level 44');
    if(!contents.includes('enemyHealth:1.50,enemyDamage:1.38')||!contents.includes('enemyHealth:1.60*(1+(t-1)*.08)'))throw new Error('Full-gear Heroic / Cellbound+ combat tuning is missing');
    if(!contents.includes('uniqueChance:{normal:0'))throw new Error('Tier 4 uniques must not leak into Normal difficulty');
  }
  if(file==='combat-identities-v1.js'){
    if(contents.includes('COMBAT REBORN BUNDLED FALLBACK')||contents.includes('window.CellboundCombatReborn='))throw new Error('Combat identities must not bundle a second Combat Reborn engine');
    if(!contents.includes('function ratingCurve')||!contents.includes('function primaryCurve'))throw new Error('Full-loadout rating diminishing returns are missing');
    if(!contents.includes("Priest:{Holy:'healer',Shadow:'dps'}")||!contents.includes("title:'Void Prophet'"))throw new Error('Shadow Priest combat identity is missing');
    if(!contents.includes("Shaman:{Restoration:'healer',Elemental:'dps'}")||!contents.includes("title:'Stormcaller'"))throw new Error('Elemental Shaman combat identity is missing');
    if(!contents.includes("Druid:{Restoration:'healer',Balance:'dps'}")||!contents.includes("title:'Astral Shaper'"))throw new Error('Balance Druid combat identity is missing');
    if(!contents.includes("Mage:{Arcane:'dps',Frost:'dps'}")||!contents.includes("title:'Winter Savant'"))throw new Error('Frost Mage combat identity is missing');
    if(!contents.includes("Warlock:{Demonology:'dps',Destruction:'dps'}")||!contents.includes("title:'Ruin Caster'"))throw new Error('Destruction Warlock combat identity is missing');
    if(!contents.includes("Hunter:{Marksman:'dps','Beast Mastery':'dps'}")||!contents.includes("title:'Pack Commander'"))throw new Error('Beast Mastery Hunter combat identity is missing');
    if(!contents.includes("Rogue:{Assassination:'dps',Outlaw:'dps'}")||!contents.includes("title:'Freeblade Duelist'"))throw new Error('Outlaw Rogue combat identity is missing');
    if(!contents.includes("damage:1.22,threat:.72,cooldown:.84,execute:.18,opening:.26")||!contents.includes("physicalTaken:.88,magicTaken:.96,damage:.96"))throw new Error('Final role balance identity tuning regressed');
  }
  if(file==='combat-reborn-v1.js'){
    for(const hook of ['professionProcs,relicOpeningUsed:false','professionProcs?.openingBurstPct','professionProcs?.executeDamagePct','professionProcs?.lowHealthWardPct','professionProcs?.triageHealPct'])if(!contents.includes(hook))throw new Error('Conditional profession combat effect is missing '+hook);
    if(!contents.includes('normalisePlayer(c,i,options.professionZone)'))throw new Error('Scribing encounter affinity must enter combat player normalisation');
    if(!contents.includes("if(!moveIntoRange(ctx,u,target,5))return true")||!contents.includes("_combatTalentTimers"))throw new Error('Bladestorm melee movement rule is missing');
    for(const hook of ['function professionCombatBonuses','professionOutputScale(u,\'damage\')','professionOutputScale(healer,\'healing\')','professionBonuses?.haste','professionBonuses?.crit','professionBonuses?.block','profession.magicWardPct'])if(!contents.includes(hook))throw new Error('Profession attachments are not wired into real combat: '+hook);
    for(const hook of ["spec:'Havoc'","spec:'Vengeance'","id:'havoc-metamorphosis'","id:'spirit-bomb'","SOUL_FRAGMENT_CHANGED","'fel-barrage':'Fel Barrage'"])if(!contents.includes(hook))throw new Error('Demon Hunter combat kit is incomplete: '+hook);
    for(const hook of ["spec:'Preservation'","spec:'Devastation'","id:'reversion'","id:'disintegrate'","id:'emerald-communion'","id:'dragonrage'","'Essence Burst':'","Evoker Preservation Healing","Evoker Devastation Essence"])if(!contents.includes(hook))throw new Error('Evoker combat kit is incomplete: '+hook);
    for(const hook of ["'Priest|Shadow':{name:'Insanity'","spec:'Shadow'","id:'mind-flay'","id:'devouring-plague'","id:'shadow-crash'","id:'void-torrent'","id:'void-eruption'","Shadow Priest Insanity","Shadow Priest DoT Pressure","Shadow Priest Voidform","Shadow Priest Talent Skill Gates"])if(!contents.includes(hook))throw new Error('Shadow Priest combat migration is incomplete: '+hook);
    for(const hook of ["'Shaman|Elemental':{name:'Maelstrom'","spec:'Elemental'","id:'lava-burst'","id:'earth-shock'","id:'earthquake'","id:'stormkeeper'","id:'ascendance'","Elemental Shaman Maelstrom","Elemental Flame Shock and Lava Surge","Elemental Shaman Ascendance","Elemental Shaman Talent Skill Gates"])if(!contents.includes(hook))throw new Error('Elemental Shaman combat migration is incomplete: '+hook);
    for(const hook of ["'Druid|Balance':{name:'Astral Power'","spec:'Balance'","id:'starfire'","id:'starsurge'","id:'starfall'","id:'fury-of-elune'","id:'celestial-alignment'","Lunar Eclipse","Solar Eclipse","Balance Druid Astral Power","Balance Druid Eclipse Cycle","Balance Druid Astral DoTs","Balance Druid Celestial Alignment","Balance Druid Talent Skill Gates"])if(!contents.includes(hook))throw new Error('Balance Druid combat migration is incomplete: '+hook);
    for(const hook of ["spec:'Frost'","id:'frostbolt'","id:'ice-lance'","id:'flurry'","id:'blizzard'","id:'frozen-orb'","id:'glacial-spike'","Fingers of Frost","Brain Freeze","Winter's Chill","Thermal Void","Frost Mage Proc Cycle","Frost Mage Frozen Orb","Frost Mage Glacial Spike","Frost Mage Talent Skill Gates"])if(!contents.includes(hook))throw new Error('Frost Mage combat migration is incomplete: '+hook);
    for(const hook of ["'Warlock|Destruction':{name:'Soul Shards'","spec:'Destruction'","id:'incinerate'","id:'conflagrate'","id:'chaos-bolt'","id:'immolate'","id:'rain-of-fire'","id:'channel-demonfire'","id:'summon-infernal'","Backdraft","Eradication","Soul Conduit","Infernal Impact","Destruction Warlock Soul Shards","Destruction Immolate","Destruction Infernal","Destruction Havoc","Destruction Warlock Talent Skill Gates"])if(!contents.includes(hook))throw new Error('Destruction Warlock combat migration is incomplete: '+hook);
    for(const hook of ["spec:'Beast Mastery'","id:'cobra-shot'","id:'barbed-shot'","id:'kill-command'","id:'beast-multi-shot'","id:'dire-beast'","id:'stampede'","id:'bestial-wrath'","hunter-beast","Beast Frenzy","Beast Cleave","Beast Mastery Permanent Pet","Beast Mastery Kill Command","Beast Mastery Dire Beast and Stampede","Beast Mastery Bestial Wrath","Beast Mastery Talent Skill Gates"])if(!contents.includes(hook))throw new Error('Beast Mastery Hunter combat migration is incomplete: '+hook);
    for(const hook of ["spec:'Outlaw'","id:'sinister-strike'","id:'pistol-shot'","id:'dispatch'","id:'roll-the-bones'","id:'blade-flurry'","id:'between-the-eyes'","id:'adrenaline-rush'","id:'killing-spree'","COMBO_POINTS_CHANGED","Opportunity","Quick Draw","Ruthlessness","Outlaw Rogue Combo Points","Outlaw Roll the Bones","Outlaw Blade Flurry","Outlaw Between the Eyes","Outlaw Killing Spree","Outlaw Rogue Talent Skill Gates"])if(!contents.includes(hook))throw new Error('Outlaw Rogue combat migration is incomplete: '+hook);
    if(!contents.includes("_combatPosition")||!contents.includes("data.currentPosition"))throw new Error('Combat slice position persistence is missing');
    if(!contents.includes("focusSelectedDamageOnly")||!contents.includes("!target.focusSelected"))throw new Error('Focus-selected damage gating is missing');
    if(!contents.includes("const VERSION='1.5.1'")||!contents.includes('tests:{run:runSelfTests}'))throw new Error('Canonical Combat Reborn engine/version is missing');
    for(const hook of ['function bodyRadius(','function physicalPosition(','function bodyClearance(','function openPhysicalPosition(','function segmentBodyHit(','function collisionWaypoint(','physicalSpace:encounter.physicalSpace!==false','bodyCollision:bodyRoute.body?','collisionContinuation:Boolean(collisionFinal)',"combatRange&&los&&ctx.physicalSpace&&u.role!=='tank'",'Physical Space Bodies','Physical Collision Metadata','Collision Melee Uptime'])if(!contents.includes(hook))throw new Error('Combat Reborn physical-space collision is missing '+hook);
    for(const hook of ['setBonusRulesFor','talentSkillCooldownScale','incomingDamageReduction','setBonuses?.damageScale','setBonuses?.healingScale'])if(!contents.includes(hook))throw new Error('Combat adaptive set foundation is missing '+hook);
    for(const hook of ["'Evoker|Devastation':[.92,.92,.92]","id:'word-of-glory'","id==='purifying-brew'","range:30,heal:24,cost:18,gcd:1500,cast:1700,cd:6500","range:30,heal:34,cost:15,gcd:1500,cast:1700,cd:0,chainBounces:3","range:30,heal:20,cost:16,gcd:1500,cast:0,cd:6000"])if(!contents.includes(hook))throw new Error('Chapter-wide role balance contract is missing '+hook);
    if(!contents.includes("function spendComboPoints(ctx,u,requested,ability='Finisher'){\n if(u?.class!=='Rogue')return 0;"))throw new Error('Rogue combo-point spending regressed');
    for(const hook of ["comboGain:2","comboCost:4,finisher:true","'Rogue|Assassination':[1.08,.94,.92]","Math.max(u.maxHealth*.05,recent*(.16+voracious*.025))","const pctHeal=a.id==='spirit-bomb'?.013:.014","Assassination Rogue Combo Points","enemyHealth:5000,mechanicIntervalMs:900"])if(!contents.includes(hook))throw new Error('Final combat balance contract is missing '+hook);
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
    if(!contents.includes("async function useGridOverride(source='module')")||!contents.includes("if(!run.quickReconnect)"))throw new Error('Grid Override must remain gated behind a manual first clear');
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
  if(file==='layout-safety-v1.css'){
    for(const hook of ['iPad / landscape live-combat viewport lock','height:calc(100dvh - 32px)!important','grid-template-rows:minmax(0,1fr) auto minmax(72px,96px)','grid-template-rows:auto auto auto minmax(0,1fr)','overscroll-behavior:contain','>.cb2d-plan'])if(!contents.includes(hook))throw new Error('Live combat viewport lock is missing '+hook);
  }
  if(file==='dungeon-2d-v1.js'&&!contents.includes('aria-label="Close dungeon"'))throw new Error('Accessible close control is missing from Ashen Vault');
  if(file==='hollow-sanctum-v1.js'&&!contents.includes('aria-label="Close dungeon"'))throw new Error('Accessible close control is missing from Hollow Sanctum');
  if(file==='hollow-sanctum-v1.js'){
    for(const hook of ["unitId='p-'+c.id","move('p-'+ch.id","if(id.startsWith('p-'))return party().some","CellboundCombatPortraits?.refresh?.()"])if(!contents.includes(hook))throw new Error('Hollow Sanctum must use canonical player IDs for combat portraits: '+hook);
    if(contents.includes("addUnit('p'+i")||contents.includes("move('p'+i"))throw new Error('Legacy Hollow Sanctum p0-p4 player tokens break shared combat portraits');
  }
  if(file==='chaos-canyon-v1.js'&&!contents.includes('aria-label="Close dungeon"'))throw new Error('Accessible close control is missing from Chaos Canyon');
  if(file==='blackout-station-v1.js'&&!contents.includes('aria-label="Close dungeon"'))throw new Error('Accessible close control is missing from Blackout Station');
  if(file==='fractured-ages-v1.js'&&!contents.includes('aria-label="Close dungeon"'))throw new Error('Accessible close control is missing from Fractured Ages');
  if(['dungeon-2d-v1.js','hollow-sanctum-v1.js','chaos-canyon-v1.js','blackout-station-v1.js','fractured-ages-v1.js'].includes(file)){
    if(!contents.includes('RETURN HOME →')||(!contents.includes("switchView?.('overview')")&&!contents.includes("switchView('overview')")))throw new Error('Dungeon completion flow must end on loot/results with a Return Home action: '+file);
    const compactHook=file==='dungeon-2d-v1.js'?'compactDungeonResults(e)':'CellboundDungeonResults?.compact?.';
    if(!contents.includes(compactHook))throw new Error('Dungeon completion screen must use the compact results dashboard: '+file);
  }
  if(file==='dungeon-2d-v1.css'){
    for(const hook of ['Ashen Vault generated environment asset pass',"url('./assets/ashen-vault/environment/floor-atlas.png')","url('./assets/ashen-vault/environment/props-atlas.png')",'.cb2d-arena.theme-ashen.room-vaultheart-sanctum .cb2d-floor'])if(!contents.includes(hook))throw new Error('Ashen Vault generated environment assets are missing '+hook);
    for(const hook of ['.cb2d-results-compact .cb2d-loot-actions','.cb2d-result-details>summary','.cb2d-result-details[open]>summary'])if(!contents.includes(hook))throw new Error('Compact dungeon results styling is missing '+hook);
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
    for(const hook of ['function readiness(normalOnly=false)','baseGate=readiness(true),gate=readiness()'])if(!contents.includes(hook))throw new Error(file+' must keep the briefing/difficulty selector accessible when only the selected difficulty Item Level is too high: '+hook);
    if((contents.match(/readiness\(true\)/g)||[]).length<2)throw new Error(file+' must use Normal readiness for the dungeon browser and briefing access gate');
  }
  if(['dungeon-2d-v1.js','hollow-sanctum-v1.js','chaos-canyon-v1.js','blackout-station-v1.js','fractured-ages-v1.js'].includes(file)){
    if(file!=='dungeon-2d-v1.js'&&!contents.includes('rollClearLootBundle'))throw new Error(file+' must use the balanced multi-drop clear reward bundle');
    if(!contents.includes('recommendedItemLevel')||!contents.includes('requires Item Level'))throw new Error(file+' must enforce selected-difficulty Item Level requirements');
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
  if(file==='dungeon-2d-v1.js'){
    for(const hook of ['function combatPotionStacks(','function combatPotionButtonMarkup(','function useCombatPotion(','data-combat-potion','data-shared-potion','combatPotionSummary,combatPotionButtonMarkup,refreshCombatPotionButton,useCombatPotion'])if(!contents.includes(hook))throw new Error('Shared combat potion runtime is missing '+hook);
    if(contents.includes("find(y=>!y.payload?.effect)"))throw new Error('Combat potion command must never consume an unrelated consumable');
  }
  if(['hollow-sanctum-v1.js','chaos-canyon-v1.js'].includes(file)){
    for(const hook of ['CellboundDungeon2D','useCombatPotion','refreshCombatPotionButton'])if(!contents.includes(hook))throw new Error(file+' is missing shared combat potion integration '+hook);
    if(contents.includes("||list[0]"))throw new Error(file+' can still consume a non-potion item from the combat consumable button');
  }
  if(file==='blackout-station-v1.js'){
    for(const hook of ['function bsUseCombatPotion(','data-bs-potion','combatPotionButtonMarkup','refreshCombatPotionButton'])if(!contents.includes(hook))throw new Error('Blackout Station combat potion control is missing '+hook);
  }
  if(file==='quests-v2.js'){
    for(const hook of ['function qPotionMarkup(','function qUseCombatPotion(','data-q-potion','combatPotionButtonMarkup','refreshCombatPotionButton'])if(!contents.includes(hook))throw new Error('Quest/Fractured Ages combat potion control is missing '+hook);
  }
  if(file==='dungeon-2d-v1.css'){
    for(const hook of ['.cb2d-controls.cbr-plan-lock.has-consumable','.cb2d-potion-button','.cb2d-potion-button[disabled]'])if(!contents.includes(hook))throw new Error('Shared combat potion styling is missing '+hook);
  }
  if(file==='quests-v2.css'&&!contents.includes('.quest-live-targets>.cb2d-potion-button'))throw new Error('Quest target controls must leave room for the potion action');
  if(file==='blackout-station-v1.css'&&!contents.includes('.bs-authority>.cb2d-potion-button'))throw new Error('Blackout Station potion action styling is missing');
  if(file==='economy-v2.js'&&!contents.includes('USE POTION button'))throw new Error('Crafted combat potions must explain their live-combat use');

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
    if(!contents.includes('function rollClearLoot')||!contents.includes('function rollClearLootBundle')||!contents.includes('function clearLootGuaranteed'))throw new Error('Dungeon clear loot must retain two-drop pacing and bad-luck protection');
    if(!contents.includes("Number(x.tier)<Number(D.LOOT_RULES?.raidExclusiveTier||5)"))throw new Error('Dungeon loot pools must exclude raid-exclusive Tier 5');
    if(contents.includes("quality==='epic'?5"))throw new Error('Weekly rewards must never create Tier 5 gear');
    if(!contents.includes('function tierPickerMarkup')||contents.includes('<select data-eg-tier'))throw new Error('Endgame Hub must use the tap-friendly Cellbound+ tier picker');
    if(!contents.includes('function chapterEndgameUnlocked')||!contents.includes("difficulty==='cellbound')return chapterEndgameUnlocked()"))throw new Error('Cellbound+ must remain chapter-clear gated');
    if(!contents.includes("Math.min(44,40+Math.floor(Math.max(0,s.tier-1)/4))"))throw new Error('Cellbound+ must use the unified endgame Item Level gate');
    if(contents.includes("cfg.diff.cellShardBase+(cfg.difficulty==='cellbound'?cfg.tier:0)"))throw new Error('Cellbound+ shard rewards must not double-count tier scaling');
  }
  if(file==='endgame-v1.css'){
    for(const hook of ['.eg-tier-picker{','.eg-tier-picker-head{','.eg-tier-strip{','.eg-tier-strip button.active{','-webkit-overflow-scrolling:touch'])if(!contents.includes(hook))throw new Error('Cellbound+ tier picker styling is missing '+hook);
  }
  if(file==='twelve-below-v1.js'){
    if(!contents.includes('minimumItemLevel:38')||!contents.includes('baseRecommendedItemLevel:40')||!contents.includes('bossHealthScale:1.55')||!contents.includes('pressureScale:1.24'))throw new Error('Twelve Below full-gear balance contract is missing');
    if((contents.match(/itemLevel:42,power:10,statBudgetMultiplier:1/g)||[]).length!==6)throw new Error('Twelve Below relics must remain six iLvl 42 endgame chase pieces');
    if(contents.includes("toISOString().slice(0,10)"))throw new Error('Twelve Below daily reset must use local calendar time');
    if(!contents.includes('requestAnimationFrame(frame)'))throw new Error('Twelve Below playback must use the continuous frame clock');
    if(!contents.includes("if(kills>=12)return .55")||!contents.includes("shards=kills+Math.floor(kills/4)*2+(kills===12?2:0)"))throw new Error('Twelve Below chase reward balance regressed');
    for(const hook of ['function burialCryptMarkup','function tbAtmosphere','function tbArenaBurst','tb-depth-backdrop','tb-crypt-ring','tb-soul-braziers','tb-grave-fog','TB_VICE_COLORS'])if(!contents.includes(hook))throw new Error('Twelve Below visual-reborn runtime is missing '+hook);
  }
  if(file==='twelve-below-v1.css'){
    for(const hook of ['TWELVE BELOW — SEPULCHRE VISUAL REBORN','.tb-depth-backdrop','.tb-floor-seal','.tb-crypt-marker','.tb-soul-braziers','.tb-grave-fog','.tb-spectral-pass','.tb-soul-burst','tbCryptWake','tbSoulFlame'])if(!contents.includes(hook))throw new Error('Twelve Below sepulchre visual layer is missing '+hook);
  }
  if(file==='social-v3.js'){
    for(const id of ['hollow-sanctum','chaos-canyon','blackout-station','fractured-ages'])if(!contents.includes("id:'"+id+"'"))throw new Error('Party Finder is missing dungeon target '+id);
    for(const hook of ["role==='owner'","chat-rank owner","m.sender_badge==='owner'?'from-owner'"])if(!contents.includes(hook))throw new Error('Owner chat badge support is missing '+hook);
    for(const hook of ['function lockedGuildName()','function renderGuildIdentity()',"db.rpc('cellbound_lock_guild_name'",'permanent for this account'])if(!contents.includes(hook))throw new Error('Permanent guild-name lock UI is missing '+hook);
    if(contents.includes('Your guild is now known as'))throw new Error('Legacy freely editable guild-name flow returned');
    if(/get_world_bosses|join_world_boss|attack_world_boss|worldBosses|CellboundWorldBoss2D/.test(contents))throw new Error('Shared World Boss client paths must remain disabled');
  }
  if(file==='social-v3.css'){
    for(const hook of ['.chat-rank.owner','.chat-message.from-owner','.chat-message.from-owner .chat-speaker>b','.guild-name-locked','.guild-name-locked[hidden]'])if(!contents.includes(hook))throw new Error('Social identity styling is missing '+hook);
  }
  if(file==='release-v1.js'){
    for(const id of ['#cc2dBackdrop','#bs2dBackdrop','#fracturedAgesBackdrop','#twelveBelowBackdrop','#thirteenthBellRoot','#fourfoldPuzzle'])if(!contents.includes(id))throw new Error('Release gate is missing active-gameplay protection for '+id);
  }
  if(file==='dungeon-2d-v1.js'){
    if(!contents.includes("$('[data-unit]').forEach"))throw new Error('Ashen Vault arena reflow selector regression detected');
    if(!contents.includes("script.src='./combat-reborn-v1.js"))throw new Error('Ashen Vault recovery loader must reload the canonical combat engine');
  }
  if(file==='chaos-canyon-v1.js'){
    if(!contents.includes("function ccReflowArena(ms=760){document.querySelectorAll('[data-cc]').forEach"))throw new Error('Chaos Canyon arena reflow selector regression detected');
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
    for(const hook of ['/* Class-led party trial focus */','.cb2d-unit.trial-focus','.cb2d-party-row.trial-focus','.trial-focus-badge'])if(!contents.includes(hook))throw new Error('Class-trial featured-character styling is missing '+hook);
  }
  if(file==='onboarding-v1.js'){
    for(const hook of ['function tutorialRebornEncounters()','function launchTutorialRebornEncounter(','function tutorialCombatReport(','function finishTutorialDungeonV4(','Viewer.playSharedEncounter({',"result?.combatModel!=='Combat Reborn'","ui:'shared-cb2d'","tutorialCombatReports","tutorialCommandChoices","COMBAT REBORN · SHARED DUNGEON VIEWER"])if(!contents.includes(hook))throw new Error('Chapter 0 Combat Reborn tutorial is missing '+hook);
    if(contents.includes("const my=++tutorialToken;setTimeout(()=>runTutorialDungeon"))throw new Error('Legacy custom tutorial combat viewer returned as the active dungeon path');
    if(!contents.includes("theme:'hollow',room:encounter.room")||!contents.includes('route:tutorialRebornRoute(),currentId:encounter.id'))throw new Error('Tutorial must use the shared dungeon viewer with room and route context');
  }
  if(file==='guild-v4.js'){
    if(!contents.includes("'Death Knight':{icon:'☠'")||!contents.includes("Blood:{role:'tank'")||!contents.includes("Frost:{role:'dps'")||!contents.includes("Unholy:{role:'dps'"))throw new Error('Death Knight must expose Blood, Frost and Unholy as playable specialisations');
    if(!contents.includes("'Demon Hunter':{icon:'⛧'")||!contents.includes("Havoc:{role:'dps'")||!contents.includes("Vengeance:{role:'tank'"))throw new Error('Demon Hunter must expose Havoc and Vengeance as playable specialisations');
    if(!contents.includes("Evoker:{icon:'✧'")||!contents.includes("Preservation:{role:'healer'")||!contents.includes("Devastation:{role:'dps'"))throw new Error('Evoker must expose Preservation and Devastation as playable specialisations');
    if(!contents.includes("Priest:{icon:'✚'")||!contents.includes("Shadow:{role:'dps'")||!contents.includes("Holy:{role:'healer'"))throw new Error('Priest must expose Holy and Shadow as playable specialisations');
    if(!contents.includes("Shaman:{icon:'⚡'")||!contents.includes("Restoration:{role:'healer'")||!contents.includes("Elemental:{role:'dps'"))throw new Error('Shaman must expose Restoration and Elemental as playable specialisations');
    if(!contents.includes("Druid:{icon:'❈'")||!contents.includes("Restoration:{role:'healer'")||!contents.includes("Balance:{role:'dps'"))throw new Error('Druid must expose Restoration and Balance as playable specialisations');
    if(!contents.includes("Mage:{icon:'✦'")||!contents.includes("Arcane:{role:'dps'")||!contents.includes("Frost:{role:'dps'"))throw new Error('Mage must expose Arcane and Frost as playable specialisations');
    if(!contents.includes("Warlock:{icon:'✺'")||!contents.includes("Demonology:{role:'dps'")||!contents.includes("Destruction:{role:'dps'"))throw new Error('Warlock must expose Demonology and Destruction as playable specialisations');
    if(!contents.includes("Hunter:{icon:'➶'")||!contents.includes("Marksman:{role:'dps'")||!contents.includes("'Beast Mastery':{role:'dps'"))throw new Error('Hunter must expose Marksman and Beast Mastery as playable specialisations');
    if(!contents.includes("Rogue:{icon:'◆'")||!contents.includes("Assassination:{role:'dps'")||!contents.includes("Outlaw:{role:'dps'"))throw new Error('Rogue must expose Assassination and Outlaw as playable specialisations');
    if(!contents.includes('B?.syncLegacyTalentCounter?.(c)')||!contents.includes("Object.keys(classes[className]?.specs||{}).forEach(spec=>{out[spec]={}})"))throw new Error('Guild must use independent per-spec build points without auto-selected fresh talents');
    if(!contents.includes("id:'chaos-canyon',name:'Chaos Canyon'")||!contents.includes("id:'blackout-station',name:'Blackout Station'")||!contents.includes("id:'fractured-ages',name:'The Fractured Ages'"))throw new Error('Overview Next Dungeon ladder must cover current dungeon progression');
    if(!contents.includes("c.equipment[slot]=existing||(hasSlot?null:starters[slot])"))throw new Error('Explicitly unequipped core slots must stay empty after state normalization');
    if(contents.includes("existing||(keepBare&&hasSlot?null:starters[slot])"))throw new Error('Legacy starter restoration would re-equip removed Head/Chest/Weapon items');
    if(!contents.includes('function repairInvalidOffHands')||!contents.includes("G?.canEquipInSlot?.(off,'OffHand')")||!contents.includes('repairInvalidOffHands(s);'))throw new Error('Legacy main-hand weapons are not being recovered from OffHand');
    if(!contents.includes('craftHistory:p.craftHistory')||!contents.includes('projectsCompleted:Math.max'))throw new Error('Profession project progression is not preserved by guild state normalization');
  }
  if(file==='character-sheet.js'){
    for(const hook of ['function talentBudget(c)','function talentRemaining(c,spec)','BUILD POINTS','B?.syncLegacyTalentCounter?.(c)','setBonusRulesFor?.(c||item?.class,c?.spec||null,item)'])if(!contents.includes(hook))throw new Error('Character build UI foundation is missing '+hook);
    for(const hook of ["Priest:{Holy:'healer',Shadow:'dps'}","Shadow:[","id:'Dark Thoughts'","id:'Shadow Weaving'","id:'Void Eruption'","id:'mind-flay'","id:'devouring-plague'","id:'void-eruption'"])if(!contents.includes(hook))throw new Error('Shadow Priest character UI is incomplete: '+hook);
    for(const hook of ["Shaman:{Restoration:'healer',Elemental:'dps'}","Elemental:[","id:'Elemental Fury'","id:'Lava Surge'","id:'Ascendance'","id:'lava-burst'","id:'earth-shock'","id:'stormkeeper'"])if(!contents.includes(hook))throw new Error('Elemental Shaman character UI is incomplete: '+hook);
    for(const hook of ["Druid:{Restoration:'healer',Balance:'dps'}","Balance:[","id:'Starlight'","id:'Twin Moons'","id:'Celestial Alignment'","id:'starfire'","id:'starsurge'","id:'starfall'","druid-wild-communion"])if(!contents.includes(hook))throw new Error('Balance Druid character UI is incomplete: '+hook);
    for(const hook of ["Mage:{Arcane:'dps',Frost:'dps'}","Frost:[","id:'Piercing Cold'","id:'Fingers of Frost'","id:'Glacial Spike'","id:'frostbolt'","id:'ice-lance'","id:'frozen-orb'","mage-arcane-empowerment"])if(!contents.includes(hook))throw new Error('Frost Mage character UI is incomplete: '+hook);
    for(const hook of ["Warlock:{Demonology:'dps',Destruction:'dps'}","Destruction:[","id:'Eradication'","id:'Backdraft'","id:'Summon Infernal'","id:'incinerate'","id:'chaos-bolt'","id:'rain-of-fire'","id:'summon-infernal'"])if(!contents.includes(hook))throw new Error('Destruction Warlock character UI is incomplete: '+hook);
    for(const hook of ["Hunter:{Marksman:'dps','Beast Mastery':'dps'}","'Beast Mastery':[","id:'Pack Leader'","id:'Dire Beast'","id:'Bestial Wrath'","id:'cobra-shot'","id:'barbed-shot'","id:'kill-command'","id:'stampede'","hunter-predators-focus"])if(!contents.includes(hook))throw new Error('Beast Mastery Hunter character UI is incomplete: '+hook);
    for(const hook of ["Rogue:{Assassination:'dps',Outlaw:'dps'}","Outlaw:[","id:'Opportunity'","id:'Blade Flurry'","id:'Killing Spree'","id:'sinister-strike'","id:'pistol-shot'","id:'dispatch'","id:'between-the-eyes'","rogue-killing-tempo"])if(!contents.includes(hook))throw new Error('Outlaw Rogue character UI is incomplete: '+hook);
    if(contents.includes('Each point also grants <b>+1 Power</b>'))throw new Error('Talent points must not inflate global Power across inactive specialisations');
  }
  if(file==='guild.html'){
    const hasVersionedAsset=name=>new RegExp(name.replaceAll('.','\\.')+'\\?v=[0-9]+').test(contents);
    for(const hook of ['LOCK GUILD NAME','guildNameLocked','PERMANENT GUILD NAME','Locked to this account.'])if(!contents.includes(hook))throw new Error('Permanent guild-name identity UI is missing '+hook);
    if(!hasVersionedAsset('boss-dossier-v1.css'))throw new Error('Boss dossier CSS cache version is stale in guild.html');
    if(!hasVersionedAsset('boss-dossier-v1.js'))throw new Error('Boss dossier cache version is stale in guild.html');
    if(!hasVersionedAsset('quests-v2.js')||!hasVersionedAsset('thirteenth-bell-v1.js')||!hasVersionedAsset('no-way-back-v1.js'))throw new Error('Progressive quest combat cache versions are stale in guild.html');
    if(!hasVersionedAsset('no-way-back-v1.css')||!hasVersionedAsset('no-way-back-v1.js'))throw new Error('No Way Back sail puzzle cache versions are stale in guild.html');
    if(!hasVersionedAsset('comic-scenes-v1.css')||!hasVersionedAsset('comic-scenes-v1.js')||!hasVersionedAsset('onboarding-v1.js')||!hasVersionedAsset('onboarding-v1.css'))throw new Error('Tutorial/creator assets are missing cache versions in guild.html');
    if(!hasVersionedAsset('item-art-v1.css')||!hasVersionedAsset('item-art-v1.js'))throw new Error('Complete item artwork assets are not linked from guild.html');
    if(!hasVersionedAsset('economy-v2.css')||!hasVersionedAsset('profession-data.js')||!hasVersionedAsset('guild-v4.js')||!hasVersionedAsset('economy-v2.js'))throw new Error('Profession Workshop V2 cache versions are stale in guild.html');
    if(!hasVersionedAsset('endgame-v1.css')||!hasVersionedAsset('endgame-v1.js'))throw new Error('Cellbound+ tier picker assets are stale in guild.html');
    if(!hasVersionedAsset('character-portraits-v1.css')||!hasVersionedAsset('character-portraits-v1.js'))throw new Error('Character portrait identity assets are not linked from guild.html');
     if(!hasVersionedAsset('combat-portraits-v1.css')||!hasVersionedAsset('combat-portraits-v1.js'))throw new Error('Combat portrait assets are not linked from guild.html');
    if(!hasVersionedAsset('class-build-v1.js')||!hasVersionedAsset('gear-system.css')||!hasVersionedAsset('gear-data.js')||!hasVersionedAsset('combat-reborn-v1.js')||!hasVersionedAsset('guild-v4.js')||!hasVersionedAsset('character-sheet.js')||!hasVersionedAsset('combat-identities-v1.js')||!hasVersionedAsset('combat-status-ui-v1.js')||!hasVersionedAsset('combat-physical-v4.js')||!hasVersionedAsset('combat-physical-v4.css')||!hasVersionedAsset('trading-post-v3.js')||!hasVersionedAsset('dungeon-2d-v1.js')||!hasVersionedAsset('hollow-sanctum-v1.js')||!hasVersionedAsset('chaos-canyon-v1.js')||!hasVersionedAsset('blackout-station-v2.js')||!hasVersionedAsset('fractured-ages-v1.js'))throw new Error('Set bonus UI cache versions are stale in guild.html');
    if(contents.includes('\\n<link')||contents.includes('\\n<script'))throw new Error('guild.html contains literal newline escape text between asset tags');
    const layoutSafetyLink=(contents.match(/<link rel="stylesheet" href="\.\/layout-safety-v1\.css\?v=[0-9]+">/)||[])[0]||'';
    if(!layoutSafetyLink||contents.lastIndexOf('<link rel="stylesheet"')!==contents.indexOf(layoutSafetyLink))throw new Error('Layout safety stylesheet must remain the final CSS layer in guild.html');
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
    for(const hook of ['data-hub="guild" data-view="bank"','data-hub="guild" data-view="professions"','<div class="nav-section-label">MARKET</div>','data-hub="market" data-view="trading"','data-view="world"><span>✦</span><b>Activities</b>'])if(!contents.includes(hook))throw new Error('Navigation regrouping is missing '+hook);
    if(contents.includes('data-hub="guild" data-view="chat"'))throw new Error('Social must remain separate from the Guild section');
    const socialNav=contents.indexOf('<div class="nav-section-label">SOCIAL</div>'),combatNav=contents.indexOf('<div class="nav-section-label">COMBAT</div>'),adminNav=contents.indexOf('id="adminNav"');
    if(socialNav<0||combatNav<0||adminNav<0||!(combatNav<socialNav&&socialNav<adminNav)||!contents.includes('data-hub="social" data-view="chat"'))throw new Error('Social must be the final player-facing sidebar section');
    const qNav=contents.indexOf('data-view="quests" data-mobile-core'),dNav=contents.indexOf('data-view="content" data-mobile-core'),aNav=contents.indexOf('data-view="world"><span>✦</span><b>Activities</b>'),rNav=contents.indexOf('data-view="raids"><span>♜</span><b>Raids</b>');
    if(qNav<0||dNav<0||aNav<0||rNav<0||!(qNav<dNav&&dNav<aNav&&aNav<rNav))throw new Error('Adventure navigation must remain Quests → Dungeons → Activities → Raids');
    if(contents.includes('data-hub="adventure" data-view="endgame"'))throw new Error('Endgame must not return as a primary Adventure navigation destination');
    if(!contents.includes('<section id="raids" class="view">')||!contents.includes('id="manorRaidMount"'))throw new Error('Raids view or Manor raid mount is missing');
    const manorRuntime=fs.readFileSync(path.join(__dirname,'manor-raid-v1.js'),'utf8'),sharedViewerRuntime=fs.readFileSync(path.join(__dirname,'dungeon-2d-v1.js'),'utf8');
    if(!manorRuntime.includes("function combatEngine(){return window.CellboundCombatStandard}")||!manorRuntime.includes("zone:'manor-raid'")||!manorRuntime.includes('playSharedEncounter'))throw new Error('The Manor must use the standard Combat Reborn gateway and shared CB2D viewer');
    for(const hook of ["manor_set_ready","3 SECOND COUNTDOWN","subscribeRaidRealtime","encounterStartAt","readyA","readyB"])if(!manorRuntime.includes(hook))throw new Error('Manor synchronized ready check is missing '+hook);
    for(const hook of ["pendingRewardSession","UNCLAIMED MANOR REWARD","data-mr-pending-loot"])if(!manorRuntime.includes(hook))throw new Error('Manor released-group reward recovery is missing '+hook);
    if(!sharedViewerRuntime.includes('function playSharedEncounter(')||!sharedViewerRuntime.includes('playRebornTimeline(result,tok)'))throw new Error('Shared CB2D external encounter playback is missing');
    if(!sharedViewerRuntime.includes('externalOnEvent')||!sharedViewerRuntime.includes("case'INTERACTION_REQUIRED'"))throw new Error('Shared CB2D raid interaction event bridge is missing');
    const callbackAt=sharedViewerRuntime.indexOf('run.externalOnEvent(event,result)'),renderAt=sharedViewerRuntime.indexOf('renderRebornEvent(event,result,replayMode)',callbackAt);
    if(callbackAt<0||renderAt<0||callbackAt>renderAt)throw new Error('Raid interaction callbacks must fire before visual event rendering');
    for(const hook of ["host.style.setProperty('z-index','2147483647','important')","host.style.setProperty('display','grid','important')","handledScreechTokens","Manor Screech menu failed to open"])if(!manorRuntime.includes(hook))throw new Error('Manor Screech modal hardening is missing '+hook);
    const combatRuntime=fs.readFileSync(path.join(__dirname,'combat-reborn-v1.js'),'utf8');
    if(!combatRuntime.includes("emit(ctx,'INTERACTION_REQUIRED'")||!manorRuntime.includes("type:'interaction'")||!manorRuntime.includes('onEvent:handleRaidCombatEvent'))throw new Error('Manor Screech must be driven by Combat Reborn interaction events');
    const endgameStart=contents.indexOf('<section id="endgame" class="view">'),endgameEnd=contents.indexOf('<section id="world" class="view">',endgameStart);
    if(endgameStart<0||endgameEnd<0||contents.slice(endgameStart,endgameEnd).includes('manorRaidMount'))throw new Error('The Manor must not be mounted inside Endgame');
    if(!contents.includes('dungeon-2d-v1.css')||!contents.includes('dungeon-2d-v1.js'))throw new Error('Ashen Vault 2D viewer assets are not linked from guild.html');
    if(!contents.includes('combat-3d-v1.css')||!contents.includes('combat-3d-v1.js'))throw new Error('Optional 3D combat prototype assets are not linked from guild.html');
    if(!contents.includes('chaos-canyon-v1.css')||!contents.includes('chaos-canyon-v1.js')||!contents.includes('id="chaosCanyonMount"'))throw new Error('Chaos Canyon assets or mount are not linked from guild.html');
    if(!contents.includes('blackout-station-v1.css')||!contents.includes('blackout-station-v2.js')||!contents.includes('id="blackoutStationMount"'))throw new Error('Blackout Station assets or mount are not linked from guild.html');
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
    if(!hasVersionedAsset('home-v2.css')||!contents.includes('class="home-command"')||!contents.includes('class="home-destination-grid"')||!contents.includes('class="home-destination raids"')||!contents.includes('id="overviewGuildPulse"'))throw new Error('Guild Command Centre home is not linked or its required hooks are missing');
    if(!contents.includes('command-ui-v1.css'))throw new Error('Cross-game Guild Command UI layer is not linked from guild.html');
    if(!contents.includes('character-command-v1.css')||!contents.includes('character-talents-v2.css')||!hasVersionedAsset('character-sheet.js'))throw new Error('Character Command UI is not linked from guild.html');
    if(!hasVersionedAsset('roster-v2.css'))throw new Error('Roster v2 stylesheet is missing a cache version');
    for(const hook of ['class="roster-overview-strip"','id="rosterClearFilters"','id="rosterResultsLabel"','class="roster-grid roster-grid-v2"'])if(!contents.includes(hook))throw new Error('Roster v2 UI is missing '+hook);
    for(const hook of ['bank-v2.css','class="bank-category-tabs"','id="bankClearFilters"','id="bankResultsLabel"','class="bank-grid bank-grid-v2"','data-bank-category="Gear"'])if(!contents.includes(hook))throw new Error('Bank v2 UI is missing '+hook);
    if(contents.includes('id="craftedInventory"'))throw new Error('Finished crafted goods must be managed through the Bank, not a duplicate Professions stock panel');
    if(!contents.includes('<b>Crafted Items</b>'))throw new Error('Bank crafted-items category label is missing');
    if(!hasVersionedAsset('bank-v2.css'))throw new Error('Bank v2 stylesheet cache version must include category-isolation fix');
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
  if(!emptyArmour.includes('cb-illustrated-base')||emptyArmour.includes('cb-paper-slot-chest')||emptyArmour.includes('cb-paper-slot-legs')||emptyArmour.includes('cb-paper-slot-feet'))throw new Error('Unequipped paper doll must render the clean v9 illustrated character body without equipment layers');
  const chestItem={name:'Test Chest',itemId:'warrior-t2-chest',class:'Warrior',slot:'Chest',tier:2};
  const chestView=P.paperDollHTML({...base,equipment:{Chest:chestItem}},{});
  if(!chestView.includes('cb-illustrated-base')||!chestView.includes('data-item-key="warrior-t2-chest"'))throw new Error('Equipped chest must layer over the same v9 illustrated character body');
  const setEquipment={};
  ['Head','Shoulders','Chest','Hands'].forEach(slot=>setEquipment[slot]={name:'Warlord '+slot,itemId:'warrior-t4-'+slot.toLowerCase(),class:'Warrior',slot,tier:4,setId:'warrior-t4',setName:'Warlord Set'});
  const setView=P.paperDollHTML({...base,equipment:setEquipment},{highlightedSlot:'Chest'});
  if(!setView.includes('set-pieces-4')||!setView.includes('cb-paper-set-glow')||!setView.includes('is-set-item'))throw new Error('Set prestige visual treatment failed');
  const classVisualCases=[
    ['Warrior','greatsword','shield'],['Paladin','hammer','shield'],['Priest','staff','tome'],['Druid','staff','idol'],
    ['Hunter','bow','quiver'],['Rogue','dagger','dagger'],['Mage','staff','focus'],['Shaman','hammer','idol'],
    ['Warlock','staff','tome'],['Monk','staff','focus'],['Death Knight','greatsword','focus'],['Demon Hunter','sword','dagger'],['Evoker','staff','focus']
  ];
  for(const [klass,weaponType,offHandType] of classVisualCases){
    const gear={};
    ['Head','Shoulders','Chest','Hands','Waist','Legs','Feet'].forEach(slot=>gear[slot]={name:klass+' Test '+slot,itemId:klass.toLowerCase().replace(/[^a-z]+/g,'-')+'-t5-'+slot.toLowerCase(),class:klass,slot,tier:5,setId:klass+'-t5',setName:klass+' Raid Set'});
    gear.Weapon={name:klass+' Test Weapon',itemId:klass+'-weapon',class:klass,slot:'Weapon',tier:5,weaponType};
    gear.OffHand={name:klass+' Test Offhand',itemId:klass+'-offhand',class:klass,slot:'OffHand',tier:5,offHandType};
    const html=P.paperDollHTML({...base,id:'class-'+klass,name:klass,class:klass,race:'Aelari',appearance:{...appearance,race:'Aelari'},equipment:gear},{});
    if(!html.includes('data-gear-class="'+klass+'"')||!html.includes('cb-paper-slot-head')||!html.includes('cb-paper-slot-feet'))throw new Error('Complete modular class visual failed for '+klass);
    if(!html.includes('cb-paper-front-weapon')||!html.includes('data-render-layer="front"')||!html.includes('data-grip-x=')||!html.includes('data-grip-y='))throw new Error('Main-hand weapon is not front-aligned for '+klass);
    const wf=P.weaponFitProfile({...base,id:'weapon-fit-'+klass,name:klass,class:klass,race:'Aelari',appearance:{...appearance,race:'Aelari'},equipment:gear},gear.Weapon);
    if(!wf||![wf.anchorX,wf.anchorY,wf.pivotX,wf.pivotY,wf.rotate,wf.scale].every(Number.isFinite))throw new Error('Invalid main-hand alignment profile for '+klass);
  }

  const fitRaces=['Veyren','Stoneborn','Aelari','Thornkin','Emberkin','Nymari'];
  for(const race of fitRaces){
    for(const gender of [0,1]){
      for(const frame of [0,1,2]){
        const appearanceCase={...appearance,race,gender,frame};
        const fit=P.gearFitProfile({id:'fit-'+race+'-'+gender+'-'+frame,race,appearance:appearanceCase});
        const numeric=['leftShoulder','rightShoulder','leftHand','rightHand','waistHalf','hipHalf','leftLeg','rightLeg','legHalf','calfHalf','footHalf','weaponX','offhandX'];
        if(numeric.some(k=>!Number.isFinite(fit[k])))throw new Error('Non-finite equipment anchor for '+race+' gender '+gender+' frame '+frame);
        if(!(fit.leftShoulder<fit.rightShoulder&&fit.leftLeg<fit.rightLeg&&fit.waistHalf>0&&fit.hipHalf>0))throw new Error('Invalid equipment anchor ordering for '+race+' gender '+gender+' frame '+frame);
        const gear={
          Head:{name:'Fit Head',itemId:'fit-head',class:'Warrior',slot:'Head',tier:5,setId:'fit'},
          Shoulders:{name:'Fit Shoulders',itemId:'fit-shoulders',class:'Warrior',slot:'Shoulders',tier:5,setId:'fit'},
          Chest:{name:'Fit Chest',itemId:'fit-chest',class:'Warrior',slot:'Chest',tier:5,setId:'fit'},
          Hands:{name:'Fit Hands',itemId:'fit-hands',class:'Warrior',slot:'Hands',tier:5,setId:'fit'},
          Waist:{name:'Fit Waist',itemId:'fit-waist',class:'Warrior',slot:'Waist',tier:5,setId:'fit'},
          Legs:{name:'Fit Legs',itemId:'fit-legs',class:'Warrior',slot:'Legs',tier:5,setId:'fit'},
          Feet:{name:'Fit Feet',itemId:'fit-feet',class:'Warrior',slot:'Feet',tier:5,setId:'fit'},
          Weapon:{name:'Fit Sword',itemId:'fit-weapon',class:'Warrior',slot:'Weapon',tier:5,weaponType:'sword'},
          OffHand:{name:'Fit Shield',itemId:'fit-offhand',class:'Warrior',slot:'OffHand',tier:5,offHandType:'shield'},
          Ring1:{name:'Fit Ring 1',itemId:'fit-ring-1',class:'Warrior',slot:'Ring',tier:5},
          Ring2:{name:'Fit Ring 2',itemId:'fit-ring-2',class:'Warrior',slot:'Ring',tier:5},
          Trinket1:{name:'Fit Trinket 1',itemId:'fit-trinket-1',class:'Warrior',slot:'Trinket',tier:5},
          Trinket2:{name:'Fit Trinket 2',itemId:'fit-trinket-2',class:'Warrior',slot:'Trinket',tier:5},
          Relic:{name:'Fit Relic',itemId:'fit-relic',class:'Warrior',slot:'Relic',tier:5}
        };
        const html=P.paperDollHTML({id:'fit-'+race+'-'+gender+'-'+frame,name:'Fit',race,class:'Warrior',appearance:appearanceCase,equipment:gear},{});
        for(const slot of ['head','shoulders','chest','hands','waist','legs','feet','weapon','offhand','ring1','ring2','trinket1','trinket2','relic']){
          if(!html.includes('cb-paper-slot-'+slot))throw new Error('Missing fitted '+slot+' layer for '+race+' gender '+gender+' frame '+frame);
        }
        if(/NaN|undefined/.test(html))throw new Error('Broken fitted equipment markup for '+race+' gender '+gender+' frame '+frame);
      }
    }
  }

}

/* Beta character/equipment lock: every generated catalogue loadout must render
   safely on every v9 race/sex/frame combination at every gear tier. */
{
  const sandbox={console,Math,Date,setTimeout,clearTimeout};sandbox.window=sandbox;sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'class-build-v1.js'),'utf8'),sandbox,{filename:'class-build-v1.js'});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'gear-data.js'),'utf8'),sandbox,{filename:'gear-data.js'});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'character-portraits-v1.js'),'utf8'),sandbox,{filename:'character-portraits-v1.js'});
  const G=sandbox.CellboundGear,P=sandbox.CellboundPortraits;
  if(!G||!P)throw new Error('Beta character/equipment lock runtime failed to load');
  if(P.version!==9||P.modelContract!=='v9-beta-locked')throw new Error('Character model v9 beta lock is missing');
  if(P.equipmentLayerContract!=='shield-back|body|armour|front-offhand|mainhand-front')throw new Error('Equipment layer contract changed without an intentional beta model revision');
  const races=['Veyren','Stoneborn','Aelari','Thornkin','Emberkin','Nymari'],positions=G.EQUIPMENT_POSITION_ORDER;
  const slotFor=pos=>pos.startsWith('Ring')?'Ring':pos.startsWith('Trinket')?'Trinket':pos;
  const tiers=[1,2,3,4,5].map(t=>P.tierVisualProfile(t));
  for(let i=1;i<tiers.length;i++){
    const before=tiers[i-1],after=tiers[i];
    if(!(after.shoulder>before.shoulder&&after.chest>before.chest&&after.collar>before.collar&&after.weapon>before.weapon))throw new Error('Gear tier silhouette progression is not strictly increasing from Tier '+i+' to Tier '+(i+1));
  }
  let checked=0;
  for(const klass of G.CLASS_ORDER)for(const tier of [1,2,3,4,5])for(const race of races)for(const gender of [0,1])for(const frame of [0,1,2]){
    const equipment={};
    for(const pos of positions){
      const slot=slotFor(pos),item=G.items.find(x=>x.class===klass&&Number(x.tier)===tier&&x.slot===slot);
      if(!item)throw new Error('Character beta matrix is missing '+klass+' Tier '+tier+' '+pos);
      equipment[pos]=item;
    }
    const appearance={race,gender,frame,skinTone:2,face:0,hair:0,hairColor:0,facialHair:0,marking:0,eyes:0,feature:0};
    const c={id:'beta-lock-'+checked,name:'Beta Lock',race,class:klass,spec:'',level:15,power:100,appearance,equipment};
    const html=P.paperDollHTML(c,{size:'equipment',showGear:true}),fit=P.gearFitProfile(c),wf=P.weaponFitProfile(c,equipment.Weapon);
    if(/NaN|undefined/.test(html))throw new Error('Broken character SVG in beta matrix: '+klass+' T'+tier+' '+race+' '+gender+'/'+frame);
    for(const key of ['leftShoulder','rightShoulder','leftHand','rightHand','waistHalf','hipHalf','leftLeg','rightLeg','weaponX','offhandX'])if(!Number.isFinite(fit[key]))throw new Error('Invalid '+key+' in beta matrix: '+klass+' T'+tier+' '+race+' '+gender+'/'+frame);
    if(![wf.anchorX,wf.anchorY,wf.pivotX,wf.pivotY,wf.rotate,wf.scale].every(Number.isFinite))throw new Error('Invalid main-hand weapon fit in beta matrix: '+klass+' T'+tier+' '+race+' '+gender+'/'+frame);
    for(const pos of positions)if(!html.includes('cb-paper-slot-'+pos.toLowerCase()))throw new Error('Missing '+pos+' render in beta matrix: '+klass+' T'+tier+' '+race+' '+gender+'/'+frame);
    const chestTop=Number(html.match(/data-chest-top="([0-9.]+)"/)?.[1]);
    if(!Number.isFinite(chestTop)||chestTop>121.01)throw new Error('Chest armour dropped below the locked upper-torso anchor: '+klass+' T'+tier+' '+race+' '+gender+'/'+frame);
    const baseAt=html.indexOf('cb-illustrated-base'),weaponAt=html.indexOf('cb-paper-front-weapon'),offType=P.offHandType(equipment.OffHand,c),offAt=html.indexOf('data-offhand-type="'+offType+'"');
    if(baseAt<0||weaponAt<0||offAt<0)throw new Error('Required equipment layer marker missing in beta matrix: '+klass+' T'+tier+' '+race+' '+gender+'/'+frame);
    if(weaponAt<baseAt)throw new Error('Main-hand weapon fell behind the character body: '+klass+' T'+tier+' '+race+' '+gender+'/'+frame);
    if(offType==='shield'&&offAt>baseAt)throw new Error('Shield moved in front of the body: '+klass+' T'+tier+' '+race+' '+gender+'/'+frame);
    if(offType!=='shield'&&(offAt<baseAt||weaponAt<offAt))throw new Error('Front off-hand/main-hand layer order regressed: '+klass+' T'+tier+' '+race+' '+gender+'/'+frame);
    checked++;
  }
  const expected=G.CLASS_ORDER.length*5*races.length*2*3;
  if(checked!==expected)throw new Error('Character beta matrix coverage incomplete: '+checked+' / '+expected);
  console.log('Character v9 beta lock passed '+checked+' class/tier/body combinations.');
}

for(const htmlFile of ['index.html','guild.html']){
  const html=fs.readFileSync(path.join(out,htmlFile),'utf8');
  const localRuntimeRefs=[...html.matchAll(/(?:src|href)="\.\/([^"?]+\.(?:js|css))(?:\?[^"]*)?"/g)].map(m=>m[1]);
  for(const ref of localRuntimeRefs)if(!fs.existsSync(path.join(out,ref)))throw new Error(`HTML references runtime asset missing from production package: ${htmlFile} -> ${ref}`);
}

for(const file of assets){const src=path.join(__dirname,file),dest=path.join(out,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest)}
/* Reconstruct the owner-only Living World art bundle from one repository-safe archive. */
{
  const archivePath=path.join(__dirname,'asset-source','living-world-phase1-assets.zip');
  if(!fs.existsSync(archivePath))throw new Error('Missing Living World phase 1 art archive');
  const zip=fs.readFileSync(archivePath);
  const outputDir=path.join(out,'assets','living-world');
  fs.mkdirSync(outputDir,{recursive:true});
  const allowed=new Set(['zelitra-town-square.webp','lantern-inn.webp','bank.webp','artisans-hall.webp','warden-post.webp','expedition-gate.webp','merchant-exchange.webp','common-house.webp']);
  let pos=0,found=0;
  while(pos+30<=zip.length&&zip.readUInt32LE(pos)===0x04034b50){
    const flags=zip.readUInt16LE(pos+6),method=zip.readUInt16LE(pos+8);
    const compressedSize=zip.readUInt32LE(pos+18),nameLen=zip.readUInt16LE(pos+26),extraLen=zip.readUInt16LE(pos+28);
    if(flags&0x08)throw new Error('Living World archive uses unsupported data descriptors');
    const name=zip.subarray(pos+30,pos+30+nameLen).toString('utf8');
    const dataStart=pos+30+nameLen+extraLen,dataEnd=dataStart+compressedSize;
    if(dataEnd>zip.length)throw new Error('Living World archive is truncated');
    if(allowed.has(name)){
      const packed=zip.subarray(dataStart,dataEnd);
      const bytes=method===8?zlib.inflateRawSync(packed):method===0?packed:null;
      if(!bytes||bytes.length<12000)throw new Error('Living World asset failed reconstruction: '+name);
      if(bytes.subarray(0,4).toString('ascii')!=='RIFF'||bytes.subarray(8,12).toString('ascii')!=='WEBP')throw new Error('Living World asset is not WebP: '+name);
      fs.writeFileSync(path.join(outputDir,name),bytes);
      found++;
    }
    pos=dataEnd;
  }
  if(found!==allowed.size)throw new Error('Living World art archive incomplete: '+found+'/'+allowed.size);
}

/* Reconstruct the owner-only Living World Phase 2 interior art bundle. */
{
  const archivePath=path.join(__dirname,'asset-source','living-world-phase2-assets.zip');
  if(!fs.existsSync(archivePath))throw new Error('Missing Living World phase 2 art archive');
  const zip=fs.readFileSync(archivePath);
  const outputDir=path.join(out,'assets','living-world');
  fs.mkdirSync(outputDir,{recursive:true});
  const allowed=new Set(['inn-interior.webp','bank-interior.webp','craft-interior.webp','quests-interior.webp','dungeons-interior.webp','market-interior.webp','social-interior.webp','guild-interior.webp']);
  let pos=0,found=0;
  while(pos+30<=zip.length&&zip.readUInt32LE(pos)===0x04034b50){
    const flags=zip.readUInt16LE(pos+6),method=zip.readUInt16LE(pos+8);
    const compressedSize=zip.readUInt32LE(pos+18),nameLen=zip.readUInt16LE(pos+26),extraLen=zip.readUInt16LE(pos+28);
    if(flags&0x08)throw new Error('Living World phase 2 archive uses unsupported data descriptors');
    const name=zip.subarray(pos+30,pos+30+nameLen).toString('utf8');
    const dataStart=pos+30+nameLen+extraLen,dataEnd=dataStart+compressedSize;
    if(dataEnd>zip.length)throw new Error('Living World phase 2 archive is truncated');
    if(allowed.has(name)){
      const packed=zip.subarray(dataStart,dataEnd);
      const bytes=method===8?zlib.inflateRawSync(packed):method===0?packed:null;
      if(!bytes||bytes.length<12000)throw new Error('Living World phase 2 asset failed reconstruction: '+name);
      if(bytes.subarray(0,4).toString('ascii')!=='RIFF'||bytes.subarray(8,12).toString('ascii')!=='WEBP')throw new Error('Living World phase 2 asset is not WebP: '+name);
      fs.writeFileSync(path.join(outputDir,name),bytes);
      found++;
    }
    pos=dataEnd;
  }
  if(found!==allowed.size)throw new Error('Living World phase 2 art archive incomplete: '+found+'/'+allowed.size);
}

/* Reconstruct bespoke Ashen Vault battlefields from repository-safe base64 sources. */
{
  const slugs=['broken-gate','hall-embers','kael','furnace','embermaw','vault-depths','vaultheart'];
  const sourceDir=path.join(__dirname,'asset-source','ashen-vault','battlefields');
  const outputDir=path.join(out,'assets','ashen-vault','battlefields');
  fs.mkdirSync(outputDir,{recursive:true});
  for(const slug of slugs){
    const source=path.join(sourceDir,slug+'.avif.b64');
    if(!fs.existsSync(source))throw new Error('Missing bespoke Ashen Vault battlefield source: '+slug);
    const encoded=fs.readFileSync(source,'utf8').replace(/\\s+/g,'');
    const bytes=Buffer.from(encoded,'base64');
    if(bytes.length<12000)throw new Error('Bespoke Ashen Vault battlefield failed reconstruction: '+slug);
    const output=path.join(outputDir,slug+'.avif');
    fs.writeFileSync(output,bytes);
    if(!fs.existsSync(output)||fs.statSync(output).size<12000)throw new Error('Missing bespoke Ashen Vault battlefield in production package: '+slug)
  }
}
for(const file of ['assets/ashen-vault/battlefields/broken-gate.avif','assets/ashen-vault/battlefields/hall-embers.avif','assets/ashen-vault/battlefields/kael.avif','assets/ashen-vault/battlefields/furnace.avif','assets/ashen-vault/battlefields/embermaw.avif','assets/ashen-vault/battlefields/vault-depths.avif','assets/ashen-vault/battlefields/vaultheart.avif']){if(!fs.existsSync(path.join(out,file)))throw new Error(`Missing Ashen Vault bespoke battlefield in production package: ${file}`)}
for(const file of ["assets/comics/null-complex/voss-signal.webp","assets/comics/null-complex/facility-entry.webp","assets/comics/null-complex/first-aberrant.webp","assets/comics/null-complex/orin-recording.webp","assets/comics/null-complex/subject-zero.webp","assets/comics/null-complex/teleporter.webp","assets/comics/null-complex/overseer-awakens.webp","assets/comics/null-complex/prototype-07.webp","assets/comics/null-complex/escape.webp","assets/comics/null-complex/subject-zero-awake.webp"]){if(!fs.existsSync(path.join(out,file)))throw new Error(`Missing Null Complex comic artwork in production package: ${file}`)}
for(const file of ['assets/comics/thirteenth-bell/sealed_letter.jpg','assets/comics/thirteenth-bell/greywake_arrival.jpg','assets/comics/thirteenth-bell/locked_house.jpg','assets/comics/thirteenth-bell/final_run.jpg','assets/comics/thirteenth-bell/bellkeeper.jpg','assets/comics/thirteenth-bell/bell_breaks.jpg','assets/comics/thirteenth-bell/greywake_freed.jpg','assets/comics/thirteenth-bell/departure.jpg']){if(!fs.existsSync(path.join(out,file)))throw new Error(`Missing Thirteenth Bell comic artwork in production package: ${file}`)}
for(const file of ['assets/dungeons/ashen-vault.webp','assets/dungeons/chaos-canyon.webp','assets/dungeons/blackout-station.webp','assets/dungeons/fractured-ages.webp']){if(!fs.existsSync(path.join(out,file)))throw new Error(`Missing Dungeon Journal artwork in production package: ${file}`)}
for(const file of ['assets/bosses/ashen-vault-vaultheart.webp','assets/bosses/hollow-sanctum-bound-choir.webp','assets/bosses/chaos-canyon-vorran.webp','assets/bosses/blackout-station-calder.webp','assets/bosses/fractured-ages-old-man.webp']){if(!fs.existsSync(path.join(out,file)))throw new Error(`Missing final boss artwork in production package: ${file}`)}
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
  vm.runInContext(fs.readFileSync(path.join(__dirname,'class-build-v1.js'),'utf8'),sandbox,{filename:'class-build-v1.js'});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'gear-data.js'),'utf8'),sandbox,{filename:'gear-data.js'});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'endgame-data-v1.js'),'utf8'),sandbox,{filename:'endgame-data-v1.js'});
  const G=sandbox.CellboundGear,D=sandbox.CellboundEndgameData;
  if(!G||!D)throw new Error('Chapter 1 gear validation runtime failed to load');
  const progression=[
    ['ashen-vault','hollow-sanctum'],
    ['hollow-sanctum','chaos-canyon'],
    ['chaos-canyon','blackout-station'],
    ['blackout-station','fractured-ages']
  ];
  for(const [from,to] of progression){
    const profile=D.LOOT_PROFILES?.[from]?.normal?.itemLevel||{},core=['Head','Chest','Weapon'].map(slot=>Number(profile[slot])||0);
    const average=core.reduce((n,x)=>n+x,0)/Math.max(1,core.length),gate=Number(D.DUNGEONS?.[to]?.normalItemLevel)||0;
    if(average<gate)throw new Error(from+' Normal loot cannot reach '+to+' entry gate');
  }
  const B=sandbox.CellboundBuildRules;
  if(!B||B.talentBudgetForLevel(1)!==1||B.talentBudgetForLevel(15)!==12)throw new Error('Per-spec talent budget foundation failed runtime validation');
  const adaptiveProbe={class:'Priest',spec:'Holy',equipment:{}},adaptiveRules=G.setBonusRulesFor(adaptiveProbe,'Holy',{tier:4,class:'Priest'});
  if(!(adaptiveRules?.pieces2?.effects?.healingScale>1)||!(adaptiveRules?.pieces4?.effects?.talentSkillCooldownScale<1))throw new Error('Adaptive healer set rules failed runtime validation');
  const balanceRules=G.setBonusRulesFor({class:'Druid',spec:'Balance'},'Balance',{tier:4,class:'Druid'});
  if(!(balanceRules?.pieces2?.effects?.eclipseDamageScale>1)||!(balanceRules?.pieces4?.effects?.resourceGainScale>1))throw new Error('Balance Druid adaptive set rules failed runtime validation');
  const frostRules=G.setBonusRulesFor({class:'Mage',spec:'Frost'},'Frost',{tier:4,class:'Mage'});
  if(!(frostRules?.pieces2?.effects?.frostProcDamageScale>1)||!(frostRules?.pieces4?.effects?.frostProcRate>0))throw new Error('Frost Mage adaptive set rules failed runtime validation');
  const destructionRules=G.setBonusRulesFor({class:'Warlock',spec:'Destruction'},'Destruction',{tier:4,class:'Warlock'});
  if(!(destructionRules?.pieces2?.effects?.destructionSpenderScale>1)||!(destructionRules?.pieces4?.effects?.resourceGainScale>1))throw new Error('Destruction Warlock adaptive set rules failed runtime validation');
  const demonologyRules=G.setBonusRulesFor({class:'Warlock',spec:'Demonology'},'Demonology',{tier:4,class:'Warlock'});
  if(!(demonologyRules?.pieces2?.effects?.petDamageScale>1))throw new Error('Demonology Warlock adaptive set rules failed runtime validation');
  const beastRules=G.setBonusRulesFor({class:'Hunter',spec:'Beast Mastery'},'Beast Mastery',{tier:4,class:'Hunter'});
  if(!(beastRules?.pieces2?.effects?.petDamageScale>1)||!(beastRules?.pieces4?.effects?.resourceRegen>1))throw new Error('Beast Mastery Hunter adaptive set rules failed runtime validation');
  const marksmanRules=G.setBonusRulesFor({class:'Hunter',spec:'Marksman'},'Marksman',{tier:4,class:'Hunter'});
  if(!(marksmanRules?.pieces2?.effects?.damageScale>1)||!(marksmanRules?.pieces4?.effects?.critBonus>0))throw new Error('Marksman Hunter adaptive set rules failed runtime validation');
  const outlawRules=G.setBonusRulesFor({class:'Rogue',spec:'Outlaw'},'Outlaw',{tier:4,class:'Rogue'});
  if(!(outlawRules?.pieces2?.effects?.outlawFinisherScale>1)||!(outlawRules?.pieces4?.effects?.resourceRegen>1))throw new Error('Outlaw Rogue adaptive set rules failed runtime validation');
  const assassinationRules=G.setBonusRulesFor({class:'Rogue',spec:'Assassination'},'Assassination',{tier:4,class:'Rogue'});
  if(!(assassinationRules?.pieces2?.effects?.periodicDamageScale>1)||!(assassinationRules?.pieces4?.effects?.critBonus>0))throw new Error('Assassination Rogue adaptive set rules failed runtime validation');
  const requiredSlots=['Head','Shoulders','Chest','Hands','Waist','Legs','Feet','Weapon','OffHand','Ring','Trinket','Relic'];
  for(const klass of G.CLASS_ORDER)for(let tier=1;tier<=4;tier++)for(const slot of requiredSlots)if(!G.items.some(x=>x.class===klass&&x.tier===tier&&x.slot===slot))throw new Error('Missing gear catalogue item: '+klass+' T'+tier+' '+slot);
  if(G.items.some(x=>!x.appearanceId))throw new Error('Base gear item missing stable character appearance identity');
  if(G.items.filter(x=>x.slot==='Weapon').some(x=>!x.weaponType))throw new Error('Weapon item missing character visual weapon type');
  if(G.items.filter(x=>x.slot==='OffHand').some(x=>!x.offHandType))throw new Error('Off-hand item missing character visual type');
  const weaponProbe=G.items.find(x=>x.slot==='Weapon'),offhandProbe=G.items.find(x=>x.slot==='OffHand');
  if(!weaponProbe||!offhandProbe||G.canEquipInSlot(weaponProbe,'OffHand')||!G.canEquipInSlot(weaponProbe,'Weapon')||!G.canEquipInSlot(offhandProbe,'OffHand')||G.canEquipInSlot(offhandProbe,'Weapon'))throw new Error('Weapon and OffHand compatibility contract failed');
  if(G.items.filter(x=>Number(x.tier)===5).length!==G.CLASS_ORDER.length*requiredSlots.length)throw new Error('Tier 5 catalogue must contain the full raid slot catalogue for every current class');
  if(G.items.filter(x=>Number(x.tier)===5).some(x=>!x.raidExclusive))throw new Error('Every Tier 5 catalogue item must remain raid-exclusive');
  if(G.items.filter(x=>Number(x.tier)===4).length!==G.CLASS_ORDER.length*requiredSlots.length)throw new Error('Tier 4 catalogue must contain the full Chapter 1 slot catalogue for every current class');
  if(!G.TIER_META?.[5]?.raidExclusive)throw new Error('Tier 5 is not marked raid-exclusive');
  const fractured=D.lootProfileFor('fractured-ages','normal',0),peak=D.lootProfileFor('chaos-canyon','cellbound',20);
  if(fractured.itemLevel?.Weapon!==40||Math.max(...Object.keys(fractured.tiers||{}).map(Number))>4)throw new Error('Fractured Ages loot profile exceeds Chapter 1 Normal ceiling');
  if(peak.itemLevel?.Weapon!==44||Number(peak.tiers?.[5]||0)>0)throw new Error('Cellbound+ exceeds Tier 4 / Item Level 44 ceiling');
  vm.runInContext(fs.readFileSync(path.join(__dirname,'profession-data.js'),'utf8'),sandbox,{filename:'profession-data.js'});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'item-art-v1.js'),'utf8'),sandbox,{filename:'item-art-v1.js'});
  const P=sandbox.CellboundProfessions,IA=sandbox.CellboundItemArt;
  if(!P||!IA)throw new Error('Complete item artwork runtime failed to load');
  const professionEntries=Object.entries(P.PROFESSIONS||{});
  if(professionEntries.length!==10)throw new Error('Profession catalogue must contain all ten professions');
  for(const name of ['Jewelcrafting','Engineering','Cooking','Reliccrafting','Scribing'])if((P.PROFESSIONS[name]?.recipes||[]).filter(r=>r.crafterOnly).length!==2)throw new Error(name+' must include exactly two crafter-only rewards');
  for(const name of ['Alchemy','Enchanting','Blacksmithing','Leatherworking','Tailoring','Jewelcrafting','Engineering','Cooking','Reliccrafting','Scribing'])if(!P.PROFESSIONS?.[name])throw new Error('Profession catalogue missing '+name);
  const allRecipeIds=[];
  const allOutputKeys=[];
  for(const [name,def] of professionEntries){
    const recipes=def.recipes||[];
    if(recipes.length<10)throw new Error(name+' must have at least 10 craftable recipes across Skill 1-100');
    if(!recipes.some(r=>Number(r.level)===1)||!recipes.some(r=>Number(r.level)===100))throw new Error(name+' profession progression must include Skill 1 and Skill 100 recipes');
    if(name==='Jewelcrafting'&&recipes.some(r=>r.output?.payload?.effect!=='socket-gem'||r.output?.payload?.socketReady!==true))throw new Error('Jewelcrafting gems must be enabled now that equipment sockets are live');
    for(const recipe of recipes){allRecipeIds.push(recipe.id);if(recipe.output?.key)allOutputKeys.push(recipe.output.key)}
  }
  if(new Set(allRecipeIds).size!==allRecipeIds.length)throw new Error('Profession recipe IDs must be unique');
  if(new Set(allOutputKeys).size!==allOutputKeys.length)throw new Error('Profession crafted item keys must be unique');
  const socketProbe={tier:1,slot:'Head'},socketChest={tier:5,slot:'Chest'},socketHead={tier:5,slot:'Head'},socketRing={tier:5,slot:'Ring'};
  if(G.socketCountFor(socketProbe,()=>.10)!==1||G.socketCountFor(socketProbe,()=>.20)!==0)throw new Error('Tier 1 socket chance must remain 15%');
  if(G.socketCountFor({tier:2,slot:'Chest'},()=>.39)!==1||G.socketCountFor({tier:2,slot:'Chest'},()=>.41)!==0)throw new Error('Tier 2 socket chance must remain 40%');
  if(G.socketCountFor({tier:3,slot:'Weapon'},()=>.69)!==1||G.socketCountFor({tier:3,slot:'Weapon'},()=>.71)!==0)throw new Error('Tier 3 socket chance must remain 70%');
  if(G.socketCountFor({tier:4,slot:'Head'},()=>.99)!==1||G.socketCountFor(socketHead,()=>.99)!==1||G.socketCountFor(socketChest,()=>.99)!==2||G.socketCountFor(socketRing,()=>0)!==0)throw new Error('Tier 4/5 socket guarantees or eligible slots regressed');
  const sigA={itemId:'socket-test',tier:4,slot:'Head',bonusStats:[],socketCount:1,sockets:[null]},sigB={itemId:'socket-test',tier:4,slot:'Head',bonusStats:[],socketCount:1,sockets:[{key:'faded-quartz',name:'Faded Quartz',bonuses:{crit:2}}]};
  if(G.rollSignature(sigA)===G.rollSignature(sigB))throw new Error('Socket contents must be part of equipment stack identity');

  const allRecipes=professionEntries.flatMap(([,def])=>def.recipes||[]),bound=allRecipes.filter(r=>r.crafterOnly);
  if(allRecipes.length!==120||bound.length!==20)throw new Error('Ten-profession catalogue must contain 120 recipes including 20 crafter-only rewards');
  const notes=P.PROFESSIONS.Scribing.recipes.find(r=>r.output.key==='ashen-hunters-notes')?.output?.payload;
  const scribe={activeProfessionBuffs:[{kind:'scroll',name:'Ashen Notes',remainingBosses:1,bonuses:notes?.bonuses||{},affinityZone:notes?.affinityZone,affinityBonuses:notes?.affinityBonuses||{}}]};
  if(P.activeBonuses(scribe).damagePct!==2||P.activeBonuses(scribe,'ashen-vault').damagePct!==5||P.activeBonuses(scribe,'chaos-canyon').damagePct!==2)throw new Error('Scribing zone affinity must only apply in the matching dungeon');

  if(allRecipes.some(r=>Object.keys(r.inputs||{}).some(k=>!P.MATERIALS?.[k])))throw new Error('Profession recipe references unknown materials');
  if(bound.some(r=>r.trainingScale!==.45||r.output?.tradeState!=='soulbound'||!r.output?.payload?.crafterOnly))throw new Error('Crafter-only items must stay character-bound');
  const relicCore=P.PROFESSIONS.Reliccrafting.recipes.find(r=>r.output.key==='cellheart-core'),gadget=P.PROFESSIONS.Engineering.recipes.find(r=>r.output.key==='recovery-drone');
  const char={id:'profession-validation',name:'Profession Test',equipment:{Relic:{attachment:{name:relicCore.name,attachmentFamily:'relic-core',bonuses:relicCore.output.payload.bonuses,proc:relicCore.output.payload.proc}}},activeProfessionBuffs:[
    {kind:'flask',name:'Flask',bonuses:{damagePct:3},remainingBosses:3},
    {kind:'food',name:'Food',bonuses:{stamina:3},remainingBosses:3},
    {kind:'scroll',name:'Scroll',bonuses:{haste:3},remainingBosses:1},
    {kind:'gadget',name:'Gadget',bonuses:gadget.output.payload.bonuses,proc:gadget.output.payload.proc,remainingBosses:1}
  ]};
  const socketGem=P.PROFESSIONS.Jewelcrafting.recipes.find(r=>r.output.key==='faded-quartz')?.output?.payload;
  char.equipment.Head={socketCount:1,sockets:[{key:'faded-quartz',name:'Faded Quartz',bonuses:socketGem?.bonuses||{}}]};
  const prep=P.activeBonuses(char),proc=P.activeProcs(char);
  if(prep.damagePct!==8||prep.haste!==3||prep.crit!==2||!proc.openingBurstPct||!proc.triageHealPct)throw new Error('Socket/Flask/Food/Scroll/Gadget stacking or Relic Core special effect failed');
  const charges={},first=P.consumeBossChargesOnce([char],'profession-test-boss',charges),again=P.consumeBossChargesOnce([char],'profession-test-boss',charges);
  if(first.length!==2||again.length!==0||P.activeProcs(char).triageHealPct!==8)throw new Error('Preparation charges must expire exactly once per cleared boss');

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
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'class-build-v1.js'),'utf8'),sandbox,{filename:'class-build-v1.js'});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'gear-data.js'),'utf8'),sandbox,{filename:'gear-data.js'});
  vm.runInContext(combatCode,sandbox,{filename:'combat-reborn-v1.js'});
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
  sandbox.CellboundCombatStandard.register('zeltira-first-expedition',{kind:'onboarding-dungeon',execution:'local',ui:'shared-cb2d'});
  const tutorial=sandbox.CellboundCombatStandard.simulate({party:raidParty.slice(0,5),seed:'build-zeltira-tutorial',encounter:{
    id:'hollow-warden',title:'Hollow Warden',kind:'boss',level:1,enemies:[{name:'The Hollow Warden',classification:'boss'}],enemyHealth:610,mechanicIntervalMs:3100,
    mechanics:[{name:'Rootbound Cleave',type:'cone',duration:1850,danger:'high'},{name:'Spore Bloom',type:'circles',duration:1700,danger:'high'}],
    environment:{bounds:{left:7,right:93,top:9,bottom:91}}
  },tactics:{pullStyle:'safe',interruptPriority:'high',defensiveUsage:'aggressive',movementDiscipline:'safety'}},{zone:'zeltira-first-expedition'});
  if(tutorial.combatModel!=='Combat Reborn'||tutorial.combatZone!=='zeltira-first-expedition')throw new Error('Chapter 0 tutorial did not use the standard Combat Reborn gateway');
  if(!tutorial.events.some(e=>e.type==='COMBAT_START')||!tutorial.events.some(e=>e.type==='MECHANIC_TELEGRAPH'))throw new Error('Chapter 0 tutorial smoke test did not produce the shared combat event stream');
  console.log('Chapter 0 Combat Reborn tutorial smoke test passed.');
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
{
  const playthrough=fs.readFileSync(path.join(__dirname,'tests/full-playthrough.browser.cjs'),'utf8');
  for(const hook of [
    'function coreGameplayLoopPlaythrough(browser)',
    "CellboundGame.partyItemLevel()),29",
    "data-bank-dismantle",
    "alc-field-potion",
    "workshopCraftProject.remainingMs=1",
    "data-equip-char=\"rogue\"",
    "CellboundGame.partyItemLevel()>=30",
    "the same harder dungeon becomes enterable after progression raises party Item Level"
  ])if(!playthrough.includes(hook))throw new Error('Beta core gameplay loop regression coverage is missing '+hook);

  const quests=fs.readFileSync(path.join(__dirname,'quests-v2.js'),'utf8');
  for(const hook of [
    "G?.createQuestGear?.(c,slot,tier,profile",
    "Game.addBankItem?.(item)",
    "s.progression.ashenVaultUnlocked=true",
    "q.flags.hollowSanctumUnlocked=true"
  ])if(!quests.includes(hook))throw new Error('Quest-to-Bank/unlock core loop contract is missing '+hook);

  const bank=fs.readFileSync(path.join(__dirname,'guild-v4.js'),'utf8');
  for(const hook of [
    'function equipBankItem(',
    'function bankDismantleYield(',
    "add('cell-shards'",
    "Object.entries(yieldMap).forEach(([key,n])=>addMaterial(key,n))"
  ])if(!bank.includes(hook))throw new Error('Bank equipment/salvage core loop contract is missing '+hook);

  const economy=fs.readFileSync(path.join(__dirname,'economy-v2.js'),'utf8');
  for(const hook of [
    'function beginCraft(',
    'function finishTimedCraft(',
    'reserveCraftInputs(',
    "if(out.category==='consumable')addConsumable"
  ])if(!economy.includes(hook))throw new Error('Profession crafting core loop contract is missing '+hook);

  const professions=fs.readFileSync(path.join(__dirname,'profession-data.js'),'utf8');
  for(const hook of [
    "Alchemy:[\n    [1,{'hollowroot':2}]",
    "function rollReagents(bossId)",
    "function rollContentReagents(contentId"
  ])if(!professions.includes(hook))throw new Error('Dungeon profession-reagent loop contract is missing '+hook);

  const ashen=fs.readFileSync(path.join(__dirname,'dungeon-2d-v1.js'),'utf8');
  for(const hook of [
    'P.rollReagents(s.bossId)',
    'Game.addMaterial(d.key,d.quantity)',
    'PROFESSION REAGENTS'
  ])if(!ashen.includes(hook))throw new Error('Ashen Vault must deliver profession reagents into shared Guild materials: '+hook);

  console.log('Beta core gameplay loop contract is release-gated.');
}

{
  const guild=fs.readFileSync(path.join(__dirname,'guild-v4.js'),'utf8');
  for(const hook of [
    "const BETA_PLAYABLE_CLASSES=Object.freeze(['Warrior','Paladin','Hunter','Rogue','Mage'])",
    "isCharacterBetaPlayable(c)",
    "state.roster.filter((c,i)=>isRosterSlotUnlocked(i)&&isCharacterBetaPlayable(c)",
    "betaPlayableClasses:BETA_PLAYABLE_CLASSES"
  ])if(!guild.includes(hook))throw new Error('Five-class beta contract is missing '+hook);

  const onboarding=fs.readFileSync(path.join(__dirname,'onboarding-v1.js'),'utf8');
  for(const hook of [
    "Game?.isBetaClassPlayable&&!Game.isBetaClassPlayable(klass)",
    "const safeDraft=draft.map",
    "No beta-playable class is available for "
  ])if(!onboarding.includes(hook))throw new Error('Character creator beta-class lock is missing '+hook);

  const quests=fs.readFileSync(path.join(__dirname,'quests-v2.js'),'utf8');
  for(const hook of [
    "const manorCleared=()=>",
    "const nullQuestAvailable=()=>",
    "LOCKED UNTIL THE MANOR",
    "Complete The Manor raid before investigating NULL//07."
  ])if(!quests.includes(hook))throw new Error('Manor-gated Null Complex quest contract is missing '+hook);

  const manor=fs.readFileSync(path.join(__dirname,'manor-raid-v1.js'),'utf8');
  for(const hook of [
    "async function markManorCleared()",
    "s.progression.manorRaidCleared=true",
    "Signal From Nowhere is now available.",
    "Game.isBetaClassPlayable(requested)?requested"
  ])if(!manor.includes(hook))throw new Error('Manor completion/reward beta contract is missing '+hook);

  const endgame=fs.readFileSync(path.join(__dirname,'endgame-v1.js'),'utf8');
  if(!endgame.includes("Game.isBetaClassPlayable(x.class)"))throw new Error('Weekly endgame rewards must exclude unavailable beta classes');

  const nullComplex=fs.readFileSync(path.join(__dirname,'null-complex-v1.js'),'utf8');
  for(const hook of [
    "function manorCleared()",
    "manorCleared()&&(s?.progression?.nullComplexUnlocked",
    "Complete The Manor raid before investigating the Null Complex."
  ])if(!nullComplex.includes(hook))throw new Error('Null Complex activity Manor gate is missing '+hook);

  const shell=fs.readFileSync(path.join(__dirname,'guild.html'),'utf8');
  for(const hook of [
    'chaos-canyon-v1.js',
    'blackout-station-v2.js',
    'fractured-ages-v1.js',
    'id="chaosCanyonMount"',
    'id="blackoutStationMount"',
    'id="fracturedAgesMount"'
  ])if(!shell.includes(hook))throw new Error('Full dungeon content must remain included during beta: '+hook);

  const playthrough=fs.readFileSync(path.join(__dirname,'tests/full-playthrough.browser.cjs'),'utf8');
  for(const hook of [
    'function betaClassAndNullGatePlaythrough(browser)',
    'all dungeon runtimes remain included',
    'The Manor clear unlocks Signal From Nowhere'
  ])if(!playthrough.includes(hook))throw new Error('Five-class/full-content beta regression coverage is missing '+hook);

  console.log('Five-class beta lock passed with full dungeon content retained and Null Complex Manor-gated.');
}

{
  const balance=fs.readFileSync(path.join(__dirname,'balance-v1.js'),'utf8');
  for(const hook of [
    "SHIPWRIGHT_KIT_COST=1000",
    "ashesEastRoad:1850",
    "fracturedAgesFirstClear:4050",
    "return [0,.35,.60,.85][n]||.35"
  ])if(!balance.includes(hook))throw new Error('Beta balance contract is missing '+hook);

  const shell=fs.readFileSync(path.join(__dirname,'guild.html'),'utf8');
  if(!/balance-v1\.js\?v=\d+/.test(shell))throw new Error('Beta balance runtime is not versioned in guild.html');

  const guild=fs.readFileSync(path.join(__dirname,'guild-v4.js'),'utf8');
  for(const hook of ['function awardPartyXp(', 'averagePartyLevel', 'BAL?.PVE_WIPE_CELL_SHOCK'])if(!guild.includes(hook))throw new Error('Shared beta progression balance is missing '+hook);

  const bell=fs.readFileSync(path.join(__dirname,'thirteenth-bell-v1.js'),'utf8');
  if(!bell.includes('hollowFirstClear'))throw new Error('The Thirteenth Bell must follow a Hollow Sanctum clear');

  console.log('Beta Step 6 progression and economy contracts are release-gated.');
}

{
  const guild=fs.readFileSync(path.join(__dirname,'guild-v4.js'),'utf8');
  for(const hook of [
    'const bankUpgradeCooldowns=new Map()',
    'const seen=new Set(),slots=',
    'isCharacterBetaPlayable(c)&&!isUnavailable(c)',
    'Math.max(1,Math.floor(Number(item.quantity)||1))',
    "Math.max(0,Math.floor(Number(x?.quantity)||0))",
    'bankUpgradeCooldowns.set(id,now+800)'
  ])if(!guild.includes(hook))throw new Error('Beta Step 8 save/action hardening is missing '+hook);

  const endgame=fs.readFileSync(path.join(__dirname,'endgame-v1.js'),'utf8');
  for(const hook of ['attemptStartPromises={}', 'if(attemptStartPromises[dungeonId])return attemptStartPromises[dungeonId]', 'delete attemptStartPromises[dungeonId]'])
    if(!endgame.includes(hook))throw new Error('Beta Step 8 dungeon-start dedupe is missing '+hook);

  const manor=fs.readFileSync(path.join(__dirname,'manor-raid-v1.js'),'utf8');
  for(const hook of ['raidStartBusy=false', 'if(raidStartBusy)return;raidStartBusy=true', 'finally{raidStartBusy=false}'])
    if(!manor.includes(hook))throw new Error('Beta Step 8 Manor start guard is missing '+hook);

  const playthrough=fs.readFileSync(path.join(__dirname,'tests/full-playthrough.browser.cjs'),'utf8');
  for(const hook of [
    'async function breakGamePlaythrough(browser)',
    'corrupted saves cannot duplicate the same adventurer across party slots',
    'rapid upgrade presses spend Cell Shards once',
    'repeated wipes cap every active adventurer at 100% Cell Shock',
    'concurrent dungeon entry calls create only one attempt',
    'refresh during a saved combat phase resumes the existing dungeon attempt'
  ])if(!playthrough.includes(hook))throw new Error('Beta Step 8 adversarial browser coverage is missing '+hook);

  const auth=fs.readFileSync(path.join(__dirname,'auth.js'),'utf8');
  for(const hook of ["const authReturnUrl=()=>new URL('./index.html',location.href).href", 'emailRedirectTo:authReturnUrl()', 'redirectTo:authReturnUrl()'])
    if(!auth.includes(hook))throw new Error('Beta Step 8 auth return-path hardening is missing '+hook);
  const login=fs.readFileSync(path.join(__dirname,'tests/login-screen.browser.cjs'),'utf8');
  for(const hook of ['verification email returns to the current Cellbound host', 'password reset email returns to the current Cellbound host'])
    if(!login.includes(hook))throw new Error('Beta Step 8 auth redirect regression is missing '+hook);

  console.log('Beta Step 8 break-game QA contracts are release-gated.');
}


{
  const shell=fs.readFileSync(path.join(__dirname,'guild.html'),'utf8');
  for(const hook of [
    'data-view="support"',
    'id="betaReportForm"',
    'id="betaMyReports"',
    'id="adminBetaReportQueue"',
    'id="adminPlayerLookup"',
    'beta-ops-v1.js?v=2',
    'admin-beta-ops-v1.js?v=1'
  ])if(!shell.includes(hook))throw new Error('Beta Step 9 game/admin support surface is missing '+hook);

  const playerOps=fs.readFileSync(path.join(__dirname,'beta-ops-v1.js'),'utf8');
  for(const hook of ["db.from('beta_reports').insert(payload)",'contextSnapshot(sourceView)','PATCH_NOTES','refreshReports','ensureLauncher()','openReport(kind','data-quick-report="feature"'])
    if(!playerOps.includes(hook))throw new Error('Beta Step 9 player support runtime is missing '+hook);

  const adminOps=fs.readFileSync(path.join(__dirname,'admin-beta-ops-v1.js'),'utf8');
  for(const hook of ['cellbound_admin_beta_reports','cellbound_admin_update_beta_report','cellbound_admin_player_lookup','cellbound_admin_recover_player'])
    if(!adminOps.includes(hook))throw new Error('Beta Step 9 admin operations runtime is missing '+hook);

  const migration=fs.readFileSync(path.join(__dirname,'supabase/migrations/20261003181012_beta_operations_foundation.sql'),'utf8');
  const featureMigration=fs.readFileSync(path.join(__dirname,'supabase/migrations/20261003185957_beta_report_feature_requests.sql'),'utf8');
  for(const hook of ['alter table public.beta_reports enable row level security','with check ((select auth.uid()) = user_id)','revoke all on table public.beta_reports from anon, authenticated','cellbound_admin_recover_player'])
    if(!migration.includes(hook))throw new Error('Beta Step 9 database security contract is missing '+hook);
  if(!featureMigration.includes("'feature'::text"))throw new Error('Beta feature-request category migration is missing');

  if(!fs.existsSync(path.join(__dirname,'BETA_OPERATIONS.md'))||!fs.existsSync(path.join(__dirname,'BETA_CHANGELOG.md')))
    throw new Error('Beta Step 9 operations documentation is missing');

  console.log('Beta Step 9 operations contracts are release-gated.');
}

console.log('Cellbound build complete.');
console.log('Build verification passed: scripts parse and required UI hooks/assets are present.');

require('./tests/beta-balance.cjs');
require('./tests/beta-ui-polish.cjs');
require('./tests/beta-operations.cjs');
require('./tests/comic-scene-editor.cjs');
require('./tests/living-combat.authority.cjs');
for(const name of ['combat-polish-v3','combat-physical-v4'])for(const ext of ['js','css']){if(!fs.existsSync(path.join(out,name+'.'+ext)))throw new Error('Missing shared living combat asset: '+name+'.'+ext)}
