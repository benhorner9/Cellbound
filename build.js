const fs=require('fs');
const path=require('path');
const files=['index.html','styles.css','auth.js','guild.html','guild.css','bank.css','character-sheet.css','gear-system.css','foundations.css','economy-v2.css','social-v3.css','evolution-v1.css','battlefield-v1.css','gear-data.js','profession-data.js','guild-v4.js','character-sheet.js','gear-character-patch.js','character-foundations-patch.js','economy-v2.js','social-v3.js','evolution-v1.js','battlefield-v1.js'];
const assets=['assets/gear/cellbound-gear-atlas.webp'];
const out=path.join(__dirname,'dist');
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
    if(!contents.includes('battlefield-v1.css')||!contents.includes('battlefield-v1.js'))throw new Error('Battlefield assets are not linked from guild.html');
  }
  if(file.endsWith('.html'))contents=contents.replace('</head>',`${touchFix}</head>`);
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,contents)
}
for(const file of assets){const src=path.join(__dirname,file),dest=path.join(out,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest)}
console.log('Cellbound MMO Feel Pass 01 build complete: Evolution UI plus playable 2D battlefield prototype.');
console.log('Evolution smoke gate passed: browser scripts parse and required UI hooks are present.');
