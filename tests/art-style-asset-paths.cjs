'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const ignores=new Set(['node_modules','dist','.git','.github']);
const errors=[];
let checked=0,count=0;
function walk(dir){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  if(ignores.has(item.name))continue;
  const full=path.join(dir,item.name);
  if(item.isDirectory()){walk(full);continue}
  if(!/\.(?:css|js)$/.test(item.name)||path.relative(root,full)==='build.js'||path.relative(root,full).startsWith('tools'+path.sep)||path.relative(root,full).startsWith('server'+path.sep))continue;
  checked++;
  const text=fs.readFileSync(full,'utf8');
  const refs=[...text.matchAll(/(?:\.\/)?(assets\/[A-Za-z0-9_./-]+\.(?:webp|png|jpg|jpeg|svg|avif))/gi)];
  for(const m of refs){
   count++;
   const relativeFile=path.relative(root,full);
   const candidates=[path.join(root,m[1])];
   // Emberfall is intentionally deployed from its own isolated /emberfall/ directory.
   // Its src/*.css uses ../assets/ paths; those assets live within emberfall-site/.
   if(relativeFile.startsWith('emberfall-site'+path.sep))candidates.push(path.join(root,'emberfall-site',m[1]));
   if(!candidates.some(dest=>fs.existsSync(dest)))errors.push(relativeFile+': '+m[1]);
  }
 }
}
walk(root);
assert.deepEqual(errors,[],'A CSS background points to a missing game image');
console.log('Art source path audit: '+count+' image references in '+checked+' game scripts and stylesheets resolve.');
