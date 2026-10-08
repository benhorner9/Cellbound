'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'quests-v2.js'),'utf8');
const inspector=fs.readFileSync(path.join(root,'admin-comic-scene-editor-v1.js'),'utf8');
const build=fs.readFileSync(path.join(root,'build.js'),'utf8');
const expected={'A Road Gone Quiet':5,'The Old Forge Key':6,'The Letter in Glass':6,'Something That Should Be Dead':6};
const rows={};
for(const [name,count] of Object.entries(expected)){
 const marker="'"+name+"':[";
 const from=code.indexOf(marker);
 assert(from>=0,'Dedicated story artwork missing: '+name);
 const end=code.indexOf(']',from);
 const block=code.slice(from,end+1);
 const imagePaths=[...block.matchAll(/'([^']+\.(?:webp|svg))'/g)].map(m=>m[1]);
 assert.equal(imagePaths.length,count,name+' has wrong number of comic images');
 for(const image of imagePaths){
  assert(image.startsWith('./assets/comics/'),'Not a true comic artwork path: '+image);
  const full=path.join(root,image.replace(/^\.\//,''));
  assert(fs.existsSync(full),'Missing art on disk: '+image);
  if(image.endsWith('.svg')){
   const svg=fs.readFileSync(full,'utf8');
   assert(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'),'Missing image SVG root '+image);
   assert(svg.includes('viewBox="0 0 1600 900"'),'Artwork must be 16:9 '+image);
   const embeds=[...svg.matchAll(/href="data:image\/webp;base64,([A-Za-z0-9+/=]+)"/g)];
   assert.equal(embeds.length,2,'Each composite must bundle its source artwork: '+image);
   for(const [,data] of embeds){
    const riff=Buffer.from(data.slice(0,32),'base64');
    assert.equal(riff.toString('ascii',0,4),'RIFF','Malformed embedded WebP '+image);
    assert.equal(riff.toString('ascii',8,12),'WEBP','Malformed embedded WebP '+image);
   }
   assert(build.includes(image.slice(2)),'SVG missing from production asset list: '+image);
  }
 }
 rows[name]=imagePaths.length;
}
assert(code.includes('const dedicated=QUEST_COMIC_STORY_ART[String(title||\'\')];'),'Gameplay must use story-specific art first');
assert(inspector.includes("const dedicatedAt=src.indexOf('const QUEST_COMIC_STORY_ART=');"),'Editor must read the same dedicated catalogue');
console.log('Main Quest comic block 2: 4 stories / 23 illustrated panels, 8 cinematic composites, zero generic/empty art slots:',JSON.stringify(rows));
