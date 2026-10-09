'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const quest=fs.readFileSync(path.join(root,'no-way-back-v1.js'),'utf8');
const booth=fs.readFileSync(path.join(root,'admin-comic-scene-editor-v1.js'),'utf8');
const build=fs.readFileSync(path.join(root,'build.js'),'utf8');
const expected={'A Sailor With A Story':5,'More Than A Crew':5,'Washed Back To Harbour':4,'Homecoming':5};
const assets=new Set();
assert(quest.includes("const dedicated=NWB_COMIC_STORY_ART[String(title||'')];"),'Gameplay must resolve dedicated story art first');
assert(booth.includes("const catalogueStart=src.indexOf('const NWB_COMIC_STORY_ART=');"),'Comic editor must read the gameplay art catalogue');
for(const [title,count] of Object.entries(expected)){
 const token="'"+title+"':[";
 const at=quest.indexOf(token);
 assert(at>=0,'Missing No Way Back storyboard: '+title);
 const end=quest.indexOf(']',at);
 const artworks=[...quest.slice(at,end+1).matchAll(/'([^']+\.svg)'/g)].map(m=>m[1]);
 assert.equal(artworks.length,count,'Panel count mismatch: '+title);
 for(const art of artworks){
  assert(art.startsWith('./assets/comics/no-way-back-2026/'),'Not a comic illustration: '+art);
  const filename=path.join(root,art.slice(2));
  assert(fs.existsSync(filename),'Missing artwork: '+art);
  const svg=fs.readFileSync(filename,'utf8');
  assert(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'),'Invalid SVG: '+art);
  assert(svg.includes('viewBox="0 0 1600 900"'),'Artwork must be 16:9: '+art);
  const images=[...svg.matchAll(/href="data:image\/(webp|jpeg);base64,([A-Za-z0-9+/=]+)"/g)];
  assert.equal(images.length,2,'Missing two painted image layers: '+art);
  for(const [,type,data] of images){
   const bytes=Buffer.from(data.slice(0,48),'base64');
   if(type==='webp'){
    assert.equal(bytes.toString('ascii',0,4),'RIFF','Invalid embedded WebP: '+art);
    assert.equal(bytes.toString('ascii',8,12),'WEBP','Invalid embedded WebP: '+art);
   } else assert.equal(bytes.subarray(0,3).toString('hex'),'ffd8ff','Invalid embedded JPEG: '+art);
  }
  assert(build.includes(art.slice(2)),'Missing from deployment package: '+art);
  assets.add(art);
 }
}
assert.equal(assets.size,8,'Every commissioned scene-specific composite must be used');
console.log('No Way Back comic block 6 passed: 4 stories, 19 panels, 8 embedded 16:9 illustrations.');
