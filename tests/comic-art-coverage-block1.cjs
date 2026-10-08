'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const tutorial=fs.readFileSync(path.join(root,'onboarding-v1.js'),'utf8');
const quests=fs.readFileSync(path.join(root,'quests-v2.js'),'utf8');
const keys=['arrival:',"'west-wall':",'gear:','hollows:','loot:','shock:','craft:','contract:','departure:'];
const resolveArt=art=>path.join(root,art.replace(/^\.\//,''));
const artworkPaths=[];
for(const key of keys){
 const start=tutorial.indexOf('\n    '+key);
 assert(start>=0,'Missing tutorial scene '+key);
 const panelStart=tutorial.indexOf('panels:[',start);
 const panelEnd=tutorial.indexOf('      ],',panelStart);
 assert(panelStart>=start&&panelEnd>panelStart,'Missing panel definition '+key);
 const body=tutorial.slice(panelStart,panelEnd);
 const count=(body.match(/\{(?:artwork:'[^']+',)?kind:/g)||[]).length;
 const images=[...body.matchAll(/\bartwork:'([^']+)'/g)].map(x=>x[1]);
 assert.equal(count,3,key+' must retain 3 narrative panels');
 assert.equal(images.length,3,key+' must have artwork on every panel');
 for(const art of images){
  assert(art.startsWith('./assets/comics/'),key+' still uses generic art '+art);
  assert(fs.existsSync(resolveArt(art)),key+' missing on disk '+art);
  artworkPaths.push(art);
 }
}
const road=quests.match(/const art=title==='A Road Gone Quiet'\?\[([\s\S]*?)\]:questComicArtSet\(title,speaker\)/);
assert(road,'A Road Gone Quiet must have dedicated quest art');
const roadArt=[...road[1].matchAll(/'([^']+\.webp)'/g)].map(x=>x[1]);
assert.equal(roadArt.length,5,'Road quest must retain five illustrated panels');
for(const art of roadArt){
 assert(art.startsWith('./assets/comics/'),'Road quest uses generic key art '+art);
 assert(fs.existsSync(resolveArt(art)),'Road quest illustration does not exist: '+art);
 artworkPaths.push(art);
}
const newArt=[...new Set(artworkPaths)].filter(x=>x.startsWith('./assets/comics/tutorial-2026/'));
assert.equal(newArt.length,11,'The 11 generated art assets should all be wired into actual scenes');
for(const art of newArt){
 const data=fs.readFileSync(resolveArt(art));
 assert(data.subarray(0,4).toString('ascii')==='RIFF'&&data.subarray(8,12).toString('ascii')==='WEBP','Invalid WebP artwork '+art);
}
console.log('Comic art block 1: 9 tutorial scenes + main opening, 32/32 panels illustrated; 11 generated images verified.');
