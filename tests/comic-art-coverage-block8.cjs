'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'no-way-back-v1.js'),'utf8'),build=fs.readFileSync(path.join(root,'build.js'),'utf8');
const catalogue={'Behind The Iron Gate':['gate-hounds-fall','gate-silas-bars'],'Master Of The Manor':['courtyard-torches','silas-anchor-stance','manor-crest-reveal'],'You Still Do Not Understand':['silas-falls','silas-final-warning','manor-awakens']};
const completion=['silas-black-iron-key','manor-doors-open','manor-key-attunement'];
const all=[...Object.values(catalogue).flat(),...completion];
assert.equal(new Set(all).size,11,'Each panel must have a distinct illustrated asset');
for(const [title,panels] of Object.entries(catalogue)){
 const start=source.indexOf("'"+title+"':[");
 assert(start>=0,'Missing comic scene '+title);
 const slice=source.slice(start,source.indexOf(']',start)+1);
 assert.equal((slice.match(/no-way-back-2026\//g)||[]).length,panels.length,'Panel count '+title);
 for(const p of panels)assert(slice.includes('/'+p+'.svg'),'Missing art '+title+' '+p);
}
for(const p of completion)assert(source.includes("artwork:'./assets/comics/no-way-back-2026/"+p+".svg'"),'Missing completion art '+p);
for(const p of all){
 const file='assets/comics/no-way-back-2026/'+p+'.svg';
 assert(build.includes("'"+file+"'"),'Missing from build '+file);
 const svg=fs.readFileSync(path.join(root,file),'utf8');
 assert(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'),'Invalid SVG '+p);
 assert(svg.includes('viewBox="0 0 1600 900"'),'Incorrect aspect ratio '+p);
 const embeds=[...svg.matchAll(/href="data:image\/(webp|jpeg);base64,([A-Za-z0-9+/=]+)"/g)];
 assert.equal(embeds.length,2,'Not self-contained art '+p);
 for(const [,mime,b64] of embeds){
  const img=Buffer.from(b64,'base64');
  assert(img.length>4000,'Empty image '+p);
  assert(mime==='webp'?img.toString('ascii',0,4)==='RIFF':img.subarray(0,3).toString('hex')==='ffd8ff','Invalid image data '+p);
 }
 assert(!svg.includes('<script'),'Unsafe SVG '+p);
}
console.log('No Way Back: 8 story and 3 completion artwork gaps filled. 11 files verified.');
