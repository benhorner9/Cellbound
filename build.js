const fs=require('fs');
const path=require('path');
const files=['index.html','styles.css','auth.js','guild.html','guild.css','bank.css','guild-v2.js'];
const out=path.join(__dirname,'dist');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
const touchFix=`\n<style id="cellbound-ios-touch-fix">html,body{touch-action:manipulation;-webkit-text-size-adjust:100%}button,a,input,label,[role="button"]{touch-action:manipulation}@media (hover:none) and (pointer:coarse){input,select,textarea{font-size:16px!important}}</style>\n`;
for(const file of files){const src=path.join(__dirname,file),dest=path.join(out,file);let contents=fs.readFileSync(src,'utf8');if(file.endsWith('.html'))contents=contents.replace('</head>',`${touchFix}</head>`);fs.writeFileSync(dest,contents)}
console.log('Cellbound management reboot build complete.');