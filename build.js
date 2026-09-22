const fs=require('fs');
const path=require('path');
const files=['index.html','styles.css','auth.js','guild.html','guild.css','bank.css','character-sheet.css','gear-system.css','foundations.css','economy-v2.css','trading-post-v3.css','social-v3.css','evolution-v1.css','dungeon-2d-v1.css','combat-status-ui-v1.css','combat-vitals-ui-v1.css','endgame-v1.css','world-boss-2d-v1.css','twelve-below-v1.css','admin-v1.css','release-v1.css','onboarding-v1.css','hollow-sanctum-v1.css','chaos-canyon-v1.css','blackout-station-v1.css','thirteenth-bell-v1.css','quests-v1.css','quests-v2.css','mobile-v1.css','readability-v1.css','ui-readability-v2.css','gear-data.js','profession-data.js','combat-identities-v1.js','combat-standard-v1.js','combat-status-ui-v1.js','endgame-data-v1.js','guild-v4.js','character-sheet.js','gear-character-patch.js','character-foundations-patch.js','economy-v2.js','trading-post-v3.js','social-v3.js','evolution-v1.js','dungeon-2d-v1.js','world-boss-2d-v1.js','twelve-below-v1.js','admin-v1.js','release-v1.js','onboarding-v1.js','hollow-sanctum-v1.js','chaos-canyon-v1.js','blackout-station-v1.js','thirteenth-bell-v1.js','endgame-v1.js','quests-v2.js','mobile-v1.js'];
const assets=['assets/gear/cellbound-gear-atlas.webp'];
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
  if(file==='trading-post-v3.js'){
    if(/location\.reload\s*\(/.test(contents))throw new Error('Trading Post must not hard-reload the page after market actions');
    if((contents.match(/function timeLeft\s*\(/g)||[]).length!==1)throw new Error('Trading Post timeLeft helper must be defined exactly once');
    if(!contents.includes("eq('status','active').gt('quantity',0)"))throw new Error('Trading Post gear query must exclude inactive or empty listings');
    if(!contents.includes("eq('status','active').gt('quantity_remaining',0)"))throw new Error('Trading Post order query must exclude inactive or empty orders');
    if(!contents.includes('refreshStateFromServer'))throw new Error('Trading Post must resync authoritative game state after server mutations');
    if(/\$document\./.test(contents)||/(^|[^$])\$\([^\n]*\)\.forEach/m.test(contents))throw new Error('Trading Post contains an invalid single-element forEach selector');
    if(!contents.includes('market_sweep_my_expired')||!contents.includes('await syncMarketState()'))throw new Error('Trading Post expiry sweep must resync returned items and refunded gold');
    if(!contents.includes('tpGearSellPicker')||!contents.includes('data-sell-item'))throw new Error('Trading Post equipment seller must use the visual Bank item picker');
    if(contents.includes("<select id=\"tpGearSellItem\""))throw new Error('Trading Post must not regress to the name-only equipment dropdown');
    if(!contents.includes("if(!data?.id)throw new Error('The listing was not confirmed by the Trading Post.')"))throw new Error('Trading Post listing creation must verify the server response');
  }
  if(file==='guild.html'){
    const required=['rosterGrid','bankGrid','professionWorkshop','chatMessages','worldBossGrid','dungeonRoute','dungeonIntel','enterDungeonBtn','partySlots'];
    for(const id of required)if(!contents.includes(`id="${id}"`))throw new Error(`Missing required Evolution hook: ${id}`);
    if(!contents.includes('evolution-v1.css')||!contents.includes('evolution-v1.js'))throw new Error('Evolution Pass assets are not linked from guild.html');
    if(!contents.includes('dungeon-2d-v1.css')||!contents.includes('dungeon-2d-v1.js'))throw new Error('Ashen Vault 2D viewer assets are not linked from guild.html');
    if(!contents.includes('chaos-canyon-v1.css')||!contents.includes('chaos-canyon-v1.js')||!contents.includes('id="chaosCanyonMount"'))throw new Error('Chaos Canyon assets or mount are not linked from guild.html');
    if(!contents.includes('blackout-station-v1.css')||!contents.includes('blackout-station-v1.js')||!contents.includes('id="blackoutStationMount"'))throw new Error('Blackout Station assets or mount are not linked from guild.html');
    if(!contents.includes('world-boss-2d-v1.css')||!contents.includes('world-boss-2d-v1.js'))throw new Error('World Boss 2D viewer assets are not linked from guild.html');
    if(!contents.includes('admin-v1.css')||!contents.includes('admin-v1.js')||!contents.includes('id=\"adminNav\"'))throw new Error('Admin panel assets or navigation hook are not linked from guild.html');
    if(!contents.includes('release-v1.css')||!contents.includes('release-v1.js')||!contents.includes('CELLBOUND_BUILD'))throw new Error('Release gate assets or build hook are not linked from guild.html');
    if(!contents.includes('onboarding-v1.css')||!contents.includes('onboarding-v1.js'))throw new Error('Zeltira onboarding assets are not linked from guild.html');
    if(!contents.includes('quests-v1.css')||!contents.includes('quests-v2.css')||!contents.includes('quests-v2.js')||!contents.includes('id="quests"'))throw new Error('Quest Adventure assets or hooks are not linked from guild.html');
    if(!contents.includes('hollow-sanctum-v1.css')||!contents.includes('hollow-sanctum-v1.js')||!contents.includes('id="hollowSanctumMount"'))throw new Error('Hollow Sanctum assets or hooks are not linked from guild.html');
    if(!contents.includes('mobile-v1.css')||!contents.includes('mobile-v1.js'))throw new Error('Mobile UX assets are not linked from guild.html');
    if(!contents.includes('ui-readability-v2.css'))throw new Error('UI readability stylesheet is not linked from guild.html');
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
for(const file of ['endgame-v1.css','endgame-data-v1.js','endgame-v1.js','readability-v1.css','ui-readability-v2.css','blackout-station-v1.css','blackout-station-v1.js','trading-post-v3.css','trading-post-v3.js']){if(!fs.existsSync(path.join(out,file)))throw new Error(`Missing required production asset: ${file}`)}
console.log('Cellbound build complete.');
console.log('Build verification passed: scripts parse and required UI hooks/assets are present.');
