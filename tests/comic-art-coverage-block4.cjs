'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const quest=fs.readFileSync(path.join(root,'quests-v2.js'),'utf8');
const editor=fs.readFileSync(path.join(root,'admin-comic-scene-editor-v1.js'),'utf8');
const build=fs.readFileSync(path.join(root,'build.js'),'utf8');
const expected={'The Door That Breathed':7,'The Seal Opens':7};
const newArt=new Set();
for(const [title,count] of Object.entries(expected)){
 const sceneMarker="'"+title+"':[";
 const start=quest.indexOf(sceneMarker);
 assert(start>=0,'Missing dedicated art for '+title);
 const end=quest.indexOf(']',start);
 const paths=[...quest.slice(start,end+1).matchAll(/'([^']+\.(?:webp|svg))'/g)].map(x=>x[1]);
 assert.equal(paths.length,count,'Wrong illustrated panel count for '+title);
 for(const art of paths){
  assert(art.match(/^\.\/assets\/comics\/(?:main-quests-2026|story-composites-2026)\//),'Non-comic artwork: '+art);
  const abs=path.join(root,art.replace(/^\.\//,''));
  assert(fs.existsSync(abs),'Missing art file: '+art);
  const data=fs.readFileSync(abs);
  assert(data.length>50000,'Artwork unexpectedly small: '+art);
  if(art.endsWith('.svg')){
   const svg=data.toString('utf8');
   assert(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'),'Invalid SVG: '+art);
   assert(svg.includes('viewBox="0 0 1600 900"'),'Art must be 16:9: '+art);
   assert.equal(svg.split('href="data:image/webp;base64,').length-1,2,'Two embedded painted layers required: '+art);
  }else{
   assert.equal(data.toString('ascii',0,4),'RIFF','Invalid WebP: '+art);
   assert.equal(data.toString('ascii',8,12),'WEBP','Invalid WebP container: '+art);
  }
  assert(build.includes(art.slice(2)),'Image omitted from build assets: '+art);
  newArt.add(art);
 }
}
assert.equal(newArt.size,9,'All nine scene assets must appear in the comics');
assert(editor.includes("const dedicatedAt=src.indexOf('const QUEST_COMIC_STORY_ART=');"),'Comic Scene Editor must inspect dedicated story-art assignments');
console.log('Comic art block 4: 2 Hollow Seal story quests, 14/14 illustrated panels, six painted WebPs + three new composites verified.');
