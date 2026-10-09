'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const quest=fs.readFileSync(path.join(root,'quests-v2.js'),'utf8');
const editor=fs.readFileSync(path.join(root,'admin-comic-scene-editor-v1.js'),'utf8');
const build=fs.readFileSync(path.join(root,'build.js'),'utf8');
const expected={
 'The Bearer':6,
 'The Fragment Remembers':8,
 'A Different Kind of Pressure':6,
 'The Old Surveyor':10
};
const all=new Set();
for(const [title,count] of Object.entries(expected)){
 const marker="'"+title+"':[";
 const at=quest.indexOf(marker);
 assert(at>=0,'Missing dedicated comic art for '+title);
 const end=quest.indexOf(']',at);
 const images=[...quest.slice(at,end+1).matchAll(/'([^']+\.webp)'/g)].map(m=>m[1]);
 assert.equal(images.length,count,title+' must illustrate each live dialogue line');
 for(const img of images){
  assert(img.startsWith('./assets/comics/main-quests-2026/'),title+' uses older/generic scene art: '+img);
  const filename=path.join(root,img.replace(/^\.\//,''));
  assert(fs.existsSync(filename),'Missing new image: '+img);
  const b=fs.readFileSync(filename);
  assert(b.length>55000,'Possible blank/placeholder comic artwork: '+img);
  assert.equal(b.toString('ascii',0,4),'RIFF','Invalid WebP image: '+img);
  assert.equal(b.toString('ascii',8,12),'WEBP','Invalid WebP image: '+img);
  assert(build.includes(img.slice(2)),'New art missing from production build: '+img);
  all.add(img);
 }
}
assert.equal(all.size,10,'All ten newly generated illustrations must be used in the quests');
assert(editor.includes("const scripted=name==='showDialogue'&&bracketed"),'Inspector must retain dynamic dialogue panel counts');
assert(editor.includes("const dedicatedAt=src.indexOf('const QUEST_COMIC_STORY_ART=');"),'Inspector must share live artwork definitions');
console.log('Comic art block 3: '+Object.keys(expected).length+' quests, '+Object.values(expected).reduce((a,b)=>a+b,0)+' panels, 10 new WebPs, all referenced and shipped.');
