const fs=require('fs');
const path=require('path');

const root=__dirname;
const out=path.join(root,'dist-site');
const files=[
  'index.html',
  'website-v1.css',
  'assets/comics/tutorial/wardens_at_the_twilight_city_gate.webp',
  'assets/ashen-vault/battlefields/hall-embers.avif',
  'assets/dungeons/ashen-vault.webp',
  'assets/hollow-sanctum/rooms/gallery.webp',
  'assets/chaos-canyon/rooms/canyon-mouth.webp',
  'assets/blackout-station/rooms/vex-calder-room.avif',
  'assets/fractured-ages/rooms/high-noon.webp',
  'assets/manor/manor-raid-hero.webp',
  'assets/world/twelve-below-key-art.webp',
  'assets/comics/tutorial/dawn_departure_from_zeltira_citadel.webp'
];

fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});

for(const file of files){
  const src=path.join(root,file);
  if(!fs.existsSync(src))throw new Error('Missing public website file: '+file);
  const dest=path.join(out,file);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.copyFileSync(src,dest);
}

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="\.\/([^"#?]+)(?:\?[^"]*)?"/g)){
  const local=match[1];
  if(local.startsWith('#'))continue;
  if(!files.includes(local))throw new Error('Website references an unshipped local file: '+local);
}

if(/guild\.html|auth\.js|supabase/i.test(html)){
  throw new Error('Public marketing site must not expose game/auth runtime');
}

fs.writeFileSync(
  path.join(out,'404.html'),
  '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/"><title>Cellbound</title><p><a href="/">Return to Cellbound</a></p>'
);

console.log('Cellbound public website package ready.');
console.log('Files:',files.length+1);
