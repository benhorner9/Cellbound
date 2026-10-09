'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const quests=fs.readFileSync(path.join(root,'quests-v2.js'),'utf8');
const fourfold=fs.readFileSync(path.join(root,'fourfold-lock-v1.js'),'utf8');
const inspector=fs.readFileSync(path.join(root,'admin-comic-scene-editor-v1.js'),'utf8');
const manifest=fs.readFileSync(path.join(root,'build.js'),'utf8');
const expected=[
 {script:quests,title:'Bram’s Professional Opinion',count:4},
 {script:fourfold,title:'box',count:3},
 {script:fourfold,title:'journey',count:3}
];
const all=new Set();
for(const scene of expected){
 const token=(scene.title==='box'||scene.title==='journey'?scene.title:"'"+scene.title+"'")+':[';
 const at=scene.script.indexOf(token);
 assert(at>=0,'Scene art declaration missing: '+scene.title);
 const end=scene.script.indexOf(']',at);
 const entries=[...scene.script.slice(at,end+1).matchAll(/'([^']+\.svg)'/g)].map(m=>m[1]);
 assert.equal(entries.length,scene.count,'Art panel count incorrect: '+scene.title);
 for(const asset of entries){
  assert(asset.startsWith('./assets/comics/story-composites-2026/'),'Old dungeon or boss art still in '+scene.title);
  const filename=path.join(root,asset.slice(2));
  assert(fs.existsSync(filename),'Missing new art: '+asset);
  const svg=fs.readFileSync(filename,'utf8');
  assert(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'),'Invalid SVG root: '+asset);
  assert(svg.includes('viewBox="0 0 1600 900"'),'Art must be 16:9: '+asset);
  const embeds=[...svg.matchAll(/href="data:image\/webp;base64,([A-Za-z0-9+/=]+)"/g)];
  assert.equal(embeds.length,2,'Illustration must include two inlined painterly source layers: '+asset);
  for(const [,image] of embeds){
   const header=Buffer.from(image.slice(0,32),'base64');
   assert.equal(header.toString('ascii',0,4),'RIFF','Embedded artwork invalid: '+asset);
   assert.equal(header.toString('ascii',8,12),'WEBP','Embedded artwork is not WebP: '+asset);
  }
  assert(manifest.includes(asset.slice(2)),'Art excluded from staging build: '+asset);
  all.add(asset);
 }
}
assert.equal(all.size,8,'All eight new compositions must appear in gameplay');
assert(fourfold.includes('FOURFOLD_STORY_ART.journey:FOURFOLD_STORY_ART.box'),'Fourfold must use its own story art');
assert(inspector.includes("const artKey=title.toLowerCase().includes('journey through the ages')?'journey':'box';"),'Comic inspector must read Fourfold art definitions');
console.log('Comic artwork block 5: Bram and two Fourfold strips, 10/10 illustrated panels; eight packaged 16:9 art compositions validated.');
