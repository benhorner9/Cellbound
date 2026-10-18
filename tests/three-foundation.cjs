'use strict';
// Source and packaging contract for Cellbound's opt-in Three.js foundation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const manifest=require('../tools/runtime-manifest.cjs');
assert(manifest.files.includes('three-preview.html'),'3D preview must ship');
assert(manifest.files.includes('three-foundation-v1.js'),'3D foundation must ship');
assert.equal(manifest.sourceFor('three-foundation-v1.js'),'src/combat/three-foundation-v1.js');
const source=read('src/combat/three-foundation-v1.js');
assert.doesNotThrow(()=>new Function(source),'foundation must be valid classic browser JS');
for(const hook of ['CellboundThree','supportsWebGL2','mountPreview','OrthographicCamera','renderer.dispose()','cancelAnimationFrame','0.186.1']){
  assert(source.includes(hook),'missing Three.js foundation hook: '+hook);
}
assert(!/saveGame\(|persistState\(|createLiveSession\(/.test(source),'preview must not mutate gameplay');
const preview=read('three-preview.html');
assert(preview.includes('three-foundation-v1.js?v=1'),'preview must load foundation');
assert(preview.includes('Start 3D Test'),'preview must have an opt-in action');
const guild=read('guild.html');
assert(guild.includes('./three-foundation-v1.js?v=1'),'guild must expose lazy-loaded Three.js');
assert(guild.includes('./three-preview.html'),'3D lab must be reachable from Admin');
console.log('Three.js opt-in rendering foundation contract passed.');
