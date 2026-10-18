'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('manor-raid-v1.js'),build=read('build.js');
const scene=source.slice(source.indexOf('function manorRoomScene'),source.indexOf('const STAGE_MIN_MS='));
const ids=['entrance-hall','dining-room','kitchen','workshop','bedroom','attic'];
for(const id of ids){
 const file='assets/manor/rooms/'+id+'.svg';
 assert(scene.includes("'"+id+"':'./"+file+"'"),'Live Manor room has no unique fallback '+id);
 assert(build.includes("'"+file+"'"),'Manor room missing from production package '+id);
 const svg=read(file);
 assert(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'),'Invalid SVG '+file);
 assert(svg.includes('viewBox="0 0 1600 900"'),'Wrong 16:9 dimensions '+file);
 assert.equal((svg.match(new RegExp('data:image/webp;base64,','g'))||[]).length,2,'Room must include two painted source layers '+file);
 assert(!svg.includes('<text'),'No baked captions or labels allowed '+file);
 assert(svg.includes('fill="url(#walls)" stroke="none" stroke-width="0" opacity=".72"'),'Painted layers must remain visible beneath the room wall colour '+file);
 for(const m of svg.matchAll(new RegExp('data:image/webp;base64,([A-Za-z0-9+/=]+)','g'))){
  const header=Buffer.from(m[1].slice(0,48),'base64');
  assert.equal(header.toString('ascii',0,4),'RIFF','Malformed painted source '+file);
  assert.equal(header.toString('ascii',8,12),'WEBP','Malformed WebP source '+file);
 }
}
assert(scene.includes("CellboundRoomLayouts?.artFor?.('the-manor',roomId,fallback)"),'Published owner art must override bundled fallback');
assert(scene.includes("'./assets/manor/manor-raid-hero.webp'"),'Keep emergency default if unknown room');
assert(!/mr-room-(?:shade|floor)|mr-prop|mr-room-dust/.test(scene),'Do not cover art with old fake floor');
console.log('Manor art coverage passed: six room-specific 16:9 compositions, no captions, published-art priority preserved.');
