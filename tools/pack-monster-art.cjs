'use strict';
// Offline atlas packing only: separates alpha islands, preserves one scale per
// creature across all six authored poses, and exports a bounded WebP texture.
// Usage: node tools/pack-monster-art.cjs /path/to/art-sources.json
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),sources=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const specs=[['deadeye-mercer','Deadeye Mercer','ranged',120],['ash-cultist','Ash Cultist','caster',100],['cinder-hound','Cinder Hound','beast',104],['furnace-wisp','Furnace Wisp','elemental',88],['ash-guardian','Ash Guardian','humanoid',108],['ember-acolyte','Ember Acolyte','caster',100],['soul-binder','Soul Binder','caster',106],['ash-warden-kael','Ash Warden Kael','humanoid',142],['embermaw','Embermaw','beast',152],['the-hollow-knight','The Hollow Knight','humanoid',142],['the-vaultheart','The Vaultheart','elemental',150],['cave-spawn','Cave Spawn','beast',78],['amun-rael','Amun-Rael','caster',138],['commander-veyra','Commander Veyra','ranged',132],['the-old-man-keeper-of-ages','The Old Man, Keeper of Ages','caster',148],['sunbound-servant','Sunbound Servant','humanoid',104],['lunar-drone','Lunar Drone','machine',88]];
(async()=>{const manifest=[],provenance=[];fs.mkdirSync(path.join(root,'assets/monsters/v1'),{recursive:true});
for(const [id,name,family,size] of specs){const source=sources.find(s=>s.id===id);const {data,info}=await sharp(source.source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),w=info.width,h=info.height,n=w*h,labels=new Int32Array(n),q=new Int32Array(n),components=[];
for(let i=0;i<n;i++){if(labels[i]||data[i*4+3]<100)continue;const c={id:components.length+1,count:0,x0:w,y0:h,x1:0,y1:0,sx:0,sy:0};let head=0,tail=1;q[0]=i;labels[i]=c.id;while(head<tail){const p=q[head++],x=p%w,y=Math.floor(p/w);c.x0=Math.min(c.x0,x);c.x1=Math.max(c.x1,x);c.y0=Math.min(c.y0,y);c.y1=Math.max(c.y1,y);c.sx+=x;c.sy+=y;for(const k of [x?p-1:-1,x<w-1?p+1:-1,p-w,p+w])if(k>=0&&k<n&&!labels[k]&&data[k*4+3]>=100){labels[k]=c.id;q[tail++]=k}}c.count=tail;c.cx=c.sx/tail;c.cy=c.sy/tail;components.push(c)}
const bodies=components.filter(c=>c.count>30000);if(bodies.length!==6)throw Error(id+': expected six separate pose bodies, got '+bodies.length);
for(const c of bodies)c.frame=Math.min(2,Math.floor(c.cx/(w/3)))+3*Math.min(1,Math.floor(c.cy/(h/2)));
if(new Set(bodies.map(c=>c.frame)).size!==6)throw Error(id+': ambiguous pose layout');
const owners=new Int8Array(components.length+1);for(const c of components){const distance=b=>Math.hypot(Math.max(b.x0-c.cx,0,c.cx-b.x1),Math.max(b.y0-c.cy,0,c.cy-b.y1))+Math.hypot(c.cx-b.cx,c.cy-b.cy)*.001;const nearest=bodies.reduce((a,b)=>distance(b)<distance(a)?b:a);owners[c.id]=nearest.frame+1}
// Grow the assigned opaque islands through soft alpha for glows/hair/antialiasing.
const pixels=new Uint8Array(n),distance=new Uint8Array(n);let head=0,tail=0;for(let i=0;i<n;i++)if(labels[i]){pixels[i]=owners[labels[i]];q[tail++]=i}
while(head<tail){const p=q[head++],x=p%w;if(distance[p]>=44)continue;for(const k of [x?p-1:-1,x<w-1?p+1:-1,p-w,p+w])if(k>=0&&k<n&&!pixels[k]){pixels[k]=pixels[p];distance[k]=distance[p]+1;q[tail++]=k}}
const boxes=Array.from({length:6},()=>({x0:w,y0:h,x1:0,y1:0}));for(let i=0;i<n;i++)if(pixels[i]&&data[i*4+3]>8){const b=boxes[pixels[i]-1],x=i%w,y=Math.floor(i/w);b.x0=Math.min(b.x0,x);b.x1=Math.max(b.x1,x);b.y0=Math.min(b.y0,y);b.y1=Math.max(b.y1,y)}
// Limit soft glow below the opaque contact line; never let faint alpha
// push a body's feet above the shared atlas ground plane.
for(let f=0;f<6;f++){const ground=bodies.find(b=>b.frame===f).y1;boxes[f].y1=Math.min(boxes[f].y1,ground+8)}
const scale=Math.min(...boxes.flatMap(b=>[232/(b.x1-b.x0+1),232/(b.y1-b.y0+1)])),layers=[];
for(let f=0;f<6;f++){const b=boxes[f],bw=b.x1-b.x0+1,bh=b.y1-b.y0+1,raw=Buffer.alloc(bw*bh*4);for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){const p=(y+b.y0)*w+x+b.x0;if(pixels[p]===f+1)data.copy(raw,(y*bw+x)*4,p*4,p*4+4)}const rw=Math.round(bw*scale),rh=Math.round(bh*scale),input=await sharp(raw,{raw:{width:bw,height:bh,channels:4}}).resize(rw,rh).png().toBuffer();layers.push({input,left:f%3*256+Math.floor((256-rw)/2),top:Math.floor(f/3)*256+242-rh})}
const src='assets/monsters/v1/'+id+'.webp';await sharp({create:{width:768,height:512,channels:4,background:'#00000000'}}).composite(layers).webp({quality:86,alphaQuality:100,effort:6}).toFile(path.join(root,src));
const aliases=['deadeye-mercer','the-hollow-knight','amun-rael','commander-veyra'].includes(id)?[name+' — Echo']:[];
manifest.push({id,name,aliases,family,size,src,socket:id==='deadeye-mercer'?[.20,.39]:id==='commander-veyra'?[.23,.38]:id==='lunar-drone'?[.24,.64]:[.24,.52],frames:6});provenance.push({id,sourceFile:path.basename(source.source),sha256:crypto.createHash('sha256').update(fs.readFileSync(source.source)).digest('hex'),prompt:source.prompt,promptRecord:id==='deadeye-mercer'?'reconstructed summary':'verbatim generation prompt',packing:{sourceSize:[w,h],boxes,scale,frameSize:256,ground:242},bytes:fs.statSync(path.join(root,src)).size});console.log(id,fs.statSync(path.join(root,src)).size);
}
fs.writeFileSync(path.join(root,'config/monster-art.json'),JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(path.join(root,'docs/qa/monster-art-production.json'),JSON.stringify(provenance,null,2)+'\n');
const file=path.join(root,'src/combat/monster-visuals-v1.js');let js=fs.readFileSync(file,'utf8');js=js.replace(/const ART=\/\* MONSTER_ART_MANIFEST \*\/[\s\S]*?;\nconst normalize/, 'const ART=/* MONSTER_ART_MANIFEST */'+JSON.stringify(manifest)+';\nconst normalize');fs.writeFileSync(file,js);
})().catch(e=>{console.error(e);process.exitCode=1});
