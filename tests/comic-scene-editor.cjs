'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'admin-comic-scene-editor-v1.js'),'utf8');
const entry={hidden:true,querySelector:()=>({addEventListener(){}})};
const document={querySelector:s=>s==='#comicSceneEditorEntry'?entry:null};
const window={
 CellboundAdmin:{isAdmin:true,role:'owner'},
 CellboundOnboarding:{tutorialComicConfig:id=>({title:'Tutorial '+id,panels:[{kind:'location',artwork:'./assets/comics/tutorial/wardens_at_the_twilight_city_gate.webp',text:'Test'}]})},
 addEventListener(){}
};
const localStorage={getItem:()=>null,setItem(){}};
const fetch=async url=>{
 const name=String(url).split('?')[0].replace(/^\.\//,'');
 if(!['quests-v2.js','thirteenth-bell-v1.js','fourfold-lock-v1.js','no-way-back-v1.js'].includes(name))throw new Error('Unexpected fetch: '+name);
 return{ok:true,text:async()=>fs.readFileSync(path.join(root,name),'utf8')}
};
vm.runInNewContext(code,{window,document,localStorage,fetch,console,setTimeout(){throw new Error('Unexpected retry timer')}},{filename:'admin-comic-scene-editor-v1.js'});
(async()=>{
 const ui=window.CellboundComicSceneEditor;
 assert.equal(ui.isOwner(),true);
 const found=await ui.discover();
 assert(found.length>=45,'Expected complete tutorial and quest inventory');
 for(const title of ['Something That Should Be Dead','A Sailor With A Story','An Unremarkable Box','The Signal','Class Trial · Character-specific']){
  assert(found.some(x=>x.title===title),'Missing story source: '+title)
 }
 assert(found.find(x=>x.title==='The Signal').panels[0].artwork.endsWith('voss-signal.webp'),'Null story artwork not resolved');
 assert(found.find(x=>x.title==='A Sailor With A Story').panels[0].text.startsWith('You ever hear'),'No Way Back arguments mapped incorrectly');
 assert(found.some(x=>x.category==='The Thirteenth Bell'&&x.panels[0].artwork.includes('sealed_letter')),'Missing dedicated Bell artwork');
 assert(found.some(x=>x.category==='The Fourfold Lock'&&x.panels.some(p=>!p.artwork)),'Text-only quests must appear as gaps');
 window.CellboundAdmin.role='moderator';
 assert.equal(ui.isOwner(),false,'Editor must be owner-only');
 console.log('Comic scene editor: story catalog, artwork lookup and owner gate passed ('+found.length+' scenes).')
})().catch(error=>{console.error(error);process.exitCode=1});
