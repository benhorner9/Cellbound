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
 'The Fragment Remembers':7,
 'A Different Kind of Pressure':6,
 'The Old Surveyor':9
};
const all=new Set();
for(const [title,count] of Object.entries(expected)){
 const marker="'"+title+"':[";
 const at=quest.indexOf(marker);
 assert(at>=0,'Missing dedicated comic art for '+title);
 const end=quest.indexOf(']',at);
 const images=[...quest.slice(at,end+1).matchAll(/'([^']+\.(?:webp|svg))'/g)].map(m=>m[1]);
 assert.equal(images.length,count,title+' must illustrate each live dialogue line');
 for(const img of images){
  assert(img.match(/^\.\/assets\/comics\/(?:main-quests-2026|story-composites-2026)\//),title+' uses older/generic scene art: '+img);
  const filename=path.join(root,img.replace(/^\.\//,''));
  assert(fs.existsSync(filename),'Missing new image: '+img);
  const data=fs.readFileSync(filename);
  assert(data.length>55000,'Artwork unexpectedly small: '+img);
  if(img.endsWith('.svg')){
   const svg=data.toString('utf8');
   assert(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'),'Invalid SVG: '+img);
   assert(svg.includes('viewBox="0 0 1600 900"'),'Art must be 16:9: '+img);
   assert.equal(svg.split('href="data:image/webp;base64,').length-1,2,'Two embedded painted layers required: '+img);
  }else{
   assert.equal(data.toString('ascii',0,4),'RIFF','Invalid WebP: '+img);
   assert.equal(data.toString('ascii',8,12),'WEBP','Invalid WebP container: '+img);
  }
  assert(build.includes(img.slice(2)),'New art missing from production build: '+img);
  all.add(img);
 }
}
assert.equal(all.size,16,'All sixteen scene assets must appear in the quests');
assert(editor.includes("const scripted=name==='showDialogue'&&bracketed"),'Inspector must retain dynamic dialogue panel counts');
assert(editor.includes("const dedicatedAt=src.indexOf('const QUEST_COMIC_STORY_ART=');"),'Inspector must share live artwork definitions');
console.log('Comic art block 3: '+Object.keys(expected).length+' quests, '+Object.values(expected).reduce((a,b)=>a+b,0)+' panels, 10 painted WebPs + 6 new composites, all referenced and shipped.');
