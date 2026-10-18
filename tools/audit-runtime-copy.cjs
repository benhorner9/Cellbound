'use strict';
/* Surface a reviewable whole-runtime language inventory without touching
   game IDs, class names, lore terms or database keys. */
const fs=require('fs'),path=require('path');
const manifest=require('./runtime-manifest.cjs');
const root=path.resolve(__dirname,'..');
const filenames=[...new Set([...manifest.files.filter(f=>/\.(?:html|js)$/.test(f)),'website/index.html'])];
const phrases=[
 ['stock marketing language',/\b(?:embark on an epic journey|dive into a world|unleash your potential|elevate your experience|revolutionary gameplay|seamlessly integrated|world of endless possibilities|immerse yourself in|cutting-edge experience)\b/ig],
 ['lorem/placeholder',/\b(?:lorem ipsum|insert text here|placeholder text|TODO: replace copy)\b/ig],
 ['pre-launch copy',/\b(?:not playable publicly yet|pre-alpha|gates stay shut|preview only|when there is something worth playing)\b/ig],
 ['common spelling mistake',/\b(?:alot|abit|imploment|exspansion|compleat|definately|recieve|seperate|occured|your'e)\b/ig],
];
const hits=[],missing=[];
for(const file of filenames){
 const p=file.startsWith('website/')?path.join(root,file):manifest.sourcePath(root,file);
 if(!fs.existsSync(p)){missing.push(file);continue}
 const lines=fs.readFileSync(p,'utf8').split(/\r?\n/);
 for(let n=0;n<lines.length;n++){
  const line=lines[n];
  // Ignore internal identifier-only lines; report copy-bearing text and
  // deliberately retain supporting context for a manual editor.
  const copy=/[<>]["']|innerHTML|textContent|toast|alert\(|description:|summary:|dialogue|title:|subtitle:|text:|label:|message:|copy:|introText:|html:/i.test(line)||file.endsWith('.html');
  if(!copy)continue;
  for(const [category,re] of phrases){
   re.lastIndex=0;
   for(const match of line.matchAll(re)){
    hits.push({file,line:n+1,category,term:match[0],context:line.trim().slice(0,230)});
    if(hits.length>=350)break;
   }
  }
 }
}
const report={scanned:filenames.length,missing,findings:hits};
fs.mkdirSync(path.join(root,'docs/qa/release'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/qa/release/language-inventory.json'),JSON.stringify(report,null,2));
console.log('Runtime wording inventory scanned',filenames.length,'HTML/JS source files; copy alerts:',hits.length,'; missing:',missing.length);
hits.slice(0,25).forEach(h=>console.log('REVIEW',h.category,h.file+':'+h.line,JSON.stringify(h.term)));
if(missing.length){console.error('Missing runtime source files:',missing.join(','));process.exit(1)}
if(hits.some(h=>h.category==='stock marketing language'||h.category==='lorem/placeholder')){
 console.error('Generic placeholder or promotional copy needs review before release');
 process.exit(1);
}
