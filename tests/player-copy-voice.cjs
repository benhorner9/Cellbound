'use strict';
// Catch obvious trailer copy in player-facing scripts; do not lint character voice or lore by generic words.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const manifest=require('../tools/runtime-manifest.cjs');
const sources=[
  'index.html','guild.html','immersive-hub-v1.js','guild-v4.js','onboarding-v1.js',
  'character-sheet.js','economy-v2.js','profession-data.js','trading-post-v3.js',
  'social-v3.js','pvp-v1.js','quests-v2.js','endgame-v1.js',
  'manor-raid-v1.js','twelve-below-v1.js','null-complex-v1.js','no-way-back-v1.js',
  'thirteenth-bell-v1.js','fourfold-lock-v1.js','living-world-v1.js',
  'dungeon-2d-v1.js','chaos-canyon-v1.js','hollow-sanctum-v1.js',
  'blackout-station-v1.js','fractured-ages-v1.js',
  'admin-design-booth-v1.js','admin-game-build-hub-v1.js'
];
const clichés=[
  /\byour journey begins\b/i,
  /\bthe road ahead\b/i,
  /\bthe world awaits\b/i,
  /\byour destiny awaits\b/i,
  /\bforge your destiny\b/i,
  /\bunleash your (?:potential|inner power)\b/i,
  /\bevery decision matters\b/i,
  /\bthe choice is yours\b/i,
  /\bepic adventure awaits\b/i,
  /\bstep into a world\b/i,
  /\bunlock your true potential\b/i,
  /\byour story begins here\b/i,
  /\brise to greatness\b/i,
  /\bmore than just a game\b/i,
  /\bembark on (?:an? )?(?:epic|unforgettable) journey\b/i
];
const failures=[];
for(const file of sources){
  const source=manifest.sourcePath(root,file);
  assert(fs.existsSync(source),'Copy audit source is missing: '+file);
  fs.readFileSync(source,'utf8').split('\n').forEach((line,index)=>{
    const found=clichés.find(pattern=>pattern.test(line));
    if(found)failures.push(file+':'+(index+1)+' — '+found.source);
  });
}
assert.deepEqual(failures,[],'Stock marketing language has returned. Review the listed strings.');
console.log('Copy voice check passed across '+sources.length+' player-facing game files.');
