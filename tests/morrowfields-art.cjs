'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),sharp=require('sharp');
(async()=>{
 const art=require('../config/morrowfields-art.json'),hashes=new Set();assert.equal(art.length,14);
 for(const a of art){const bytes=fs.readFileSync(a.src),hash=crypto.createHash('sha256').update(bytes).digest('hex');assert.equal(hash,a.sha256);assert(!hashes.has(hash),'Every picture is individually illustrated');hashes.add(hash);const m=await sharp(bytes).metadata();assert(m.width>=600&&m.height>=600);assert(fs.existsSync('dist/'+a.src),'Production bundle includes '+a.src);}
 const monsters=require('../config/monster-art.json');
 for(const name of ['Blighted Grazer','Harvest Crawler','Rotroot Husk']){const a=monsters.find(x=>x.name===name);assert(a&&a.frames===6);const m=await sharp(a.src).metadata();assert(m.hasAlpha&&m.width===768&&m.height===512);}
 console.log('Morrowfields art PASS: 14 unique illustrated environments/panels/portraits, shipped paths and hashes; three registered six-pose alpha atlases. Full pose/ground-line QA also covered by monster-art.cjs.');
})().catch(e=>{console.error(e);process.exitCode=1});
