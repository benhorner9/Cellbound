'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),sharp=require('sharp');
const art=require('../config/monster-art.json'),inventory=require('../docs/qa/monster-inventory.json');
(async()=>{const context={window:{},Map,WeakMap,Set};vm.runInNewContext(fs.readFileSync('src/combat/monster-visuals-v1.js','utf8'),context);const registry=context.window.CellboundMonsterVisuals;
// Monster art is optional presentation; passing a singleton, null or an
 // accidental room image URL must never throw and stop combat startup.
 assert.equal((await registry.preload(null)).length,0,'null preload input is harmless');
 assert.equal((await registry.preload('assets/ashen-vault/rooms/hall-embers.webp')).length,0,
  'room artwork path cannot crash monster preloader');
 assert.equal((await registry.preload({src:'not-a-monster.webp'})).length,0,
  'unexpected object cannot crash monster preloader');
 const dungeon=fs.readFileSync('src/dungeons/dungeon-2d-v1.js','utf8');
 assert(dungeon.includes('CellboundMonsterVisuals?.preload?.(next.enemies)'),
  'Ashen Vault must preload the next room enemy list, not its artwork URL');
 assert(!dungeon.includes('CellboundMonsterVisuals?.preload?.(ashenRoomConfig(next.id)?.art)'),
  'regression: room artwork passed to monster preloader');
 assert.equal(registry.art.length,art.length);assert.equal(JSON.stringify(registry.art),JSON.stringify(art),'generated registry matches source manifest');
let total=0;for(const a of art){assert.equal(registry.resolve(a.name).id,a.id);for(const alias of a.aliases)assert.equal(registry.resolve(alias).id,a.id);assert(fs.existsSync(a.src));const m=await sharp(a.src).metadata();assert.equal(m.width,768);assert.equal(m.height,512);assert(m.hasAlpha);const bytes=fs.statSync(a.src).size;assert(bytes<190000,a.id+' texture budget');total+=bytes;
const hashes=[];for(let i=0;i<6;i++){const {data}=await sharp(a.src).extract({left:i%3*256,top:Math.floor(i/3)*256,width:256,height:256}).ensureAlpha().raw().toBuffer({resolveWithObject:true});let solid=0,bottom=0;for(let p=0;p<256*256;p++)if(data[p*4+3]>100){solid++;bottom=Math.max(bottom,Math.floor(p/256))}assert(solid>2000,a.id+' empty pose '+i);assert(bottom>=231&&bottom<=243,a.id+' ground line '+bottom);assert.equal(data[3],0,a.id+' transparent corner');hashes.push(require('crypto').createHash('sha256').update(data).digest('hex'))}assert.equal(new Set(hashes).size,6,a.id+' six distinct authored poses')}
assert(total<12*1024*1024);assert.equal(registry.resolve('Unknown Unpublished Enemy'),null);assert.equal(inventory.enemies.filter(r=>r.asset).length,inventory.enemies.length);assert.equal(inventory.enemies.filter(r=>!r.asset).length,0);for(const r of inventory.enemies.filter(r=>r.asset))assert.equal(registry.resolve(r.name).src,r.asset);
console.log('Monster art:',art.length,'six-pose alpha atlases;',inventory.enemies.length,'named entries; zero placeholders;',total,'bytes; registry/alias/ground/dimension/budget checks passed');})().catch(e=>{console.error(e);process.exitCode=1});
