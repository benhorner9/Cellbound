const fs=require('fs');
const path=require('path');
const files=['index.html','styles.css','auth.js','guild.html','guild.css','bank.css','character-sheet.css','gear-system.css','foundations.css','economy-v2.css','social-v3.css','evolution-v1.css','dungeon-2d-v1.css','endgame-v1.css','world-boss-2d-v1.css','admin-v1.css','release-v1.css','onboarding-v1.css','hollow-sanctum-v1.css','quests-v1.css','quests-v2.css','mobile-v1.css','gear-data.js','profession-data.js','combat-identities-v1.js','endgame-data-v1.js','guild-v4.js','character-sheet.js','gear-character-patch.js','character-foundations-patch.js','economy-v2.js','social-v3.js','evolution-v1.js','dungeon-2d-v1.js','world-boss-2d-v1.js','admin-v1.js','release-v1.js','onboarding-v1.js','hollow-sanctum-v1.js','endgame-v1.js','quests-v2.js','mobile-v1.js'];
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
  if(file==='guild.html'){
    const required=['rosterGrid','bankGrid','professionWorkshop','chatMessages','worldBossGrid','dungeonRoute','dungeonIntel','enterDungeonBtn','partySlots'];
    for(const id of required)if(!contents.includes(`id="${id}"`))throw new Error(`Missing required Evolution hook: ${id}`);
    if(!contents.includes('evolution-v1.css')||!contents.includes('evolution-v1.js'))throw new Error('Evolution Pass assets are not linked from guild.html');
    if(!contents.includes('dungeon-2d-v1.css')||!contents.includes('dungeon-2d-v1.js'))throw new Error('Ashen Vault 2D viewer assets are not linked from guild.html');
    if(!contents.includes('world-boss-2d-v1.css')||!contents.includes('world-boss-2d-v1.js'))throw new Error('World Boss 2D viewer assets are not linked from guild.html');
    if(!contents.includes('admin-v1.css')||!contents.includes('admin-v1.js')||!contents.includes('id=\"adminNav\"'))throw new Error('Admin panel assets or navigation hook are not linked from guild.html');
    if(!contents.includes('release-v1.css')||!contents.includes('release-v1.js')||!contents.includes('CELLBOUND_BUILD'))throw new Error('Release gate assets or build hook are not linked from guild.html');
    if(!contents.includes('onboarding-v1.css')||!contents.includes('onboarding-v1.js'))throw new Error('Zeltira onboarding assets are not linked from guild.html');
    if(!contents.includes('quests-v1.css')||!contents.includes('quests-v2.css')||!contents.includes('quests-v2.js')||!contents.includes('id="quests"'))throw new Error('Quest Adventure assets or hooks are not linked from guild.html');
    if(!contents.includes('hollow-sanctum-v1.css')||!contents.includes('hollow-sanctum-v1.js')||!contents.includes('id="hollowSanctumMount"'))throw new Error('Hollow Sanctum assets or hooks are not linked from guild.html');
    if(!contents.includes('mobile-v1.css')||!contents.includes('mobile-v1.js'))throw new Error('Mobile UX assets are not linked from guild.html');
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
for(const file of ['endgame-v1.css','endgame-data-v1.js','endgame-v1.js']){if(!fs.existsSync(path.join(out,file)))throw new Error(`Missing required Update 2 production asset: ${file}`)}
console.log('Cellbound build complete.');
console.log('Build verification passed: scripts parse and required UI hooks/assets are present.');
