'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/combat/pvp-maps-v1.js'),'utf8');
const build=fs.readFileSync(path.join(root,'build.js'),'utf8');
const files={
 arena:'assets/pvp/maps/arena-shattered-crucible.svg',
 'capture-the-flag':'assets/pvp/maps/capture-the-flag-ruined-causeway.svg',
 'king-of-the-hill':'assets/pvp/maps/king-of-the-hill-fivefold-ruins.svg'
};
for(const [mode,file] of Object.entries(files)){
 assert(source.includes("'./"+file+"'"),'Missing dedicated '+mode+' PvP background');
 assert(build.includes("'"+file+"'"),'PvP background excluded from deployment: '+file);
 const svg=fs.readFileSync(path.join(root,file),'utf8');
 assert(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'),'Invalid SVG '+file);
 assert(svg.includes('viewBox="0 0 1600 900"'),'Incorrect art ratio '+file);
 assert.equal((svg.match(/data:image\/webp;base64,/g)||[]).length,2,'Missing painted image layers '+file);
 assert(!/<text\b/i.test(svg),'Baked text is not allowed '+file);
 for(const match of svg.matchAll(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/g)){
  const bytes=Buffer.from(match[1].slice(0,48),'base64');
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
}
assert(source.includes('if(path&&db()?.storage)'),'Published custom art must retain priority');
console.log('PvP art coverage passed: 3 distinct 16:9 ruined arenas, valid painted sources and build paths.');
