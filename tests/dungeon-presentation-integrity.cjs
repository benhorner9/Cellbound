const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
let failed=false;
const fail=m=>{console.error('ERROR:',m);failed=true};
const ok=m=>console.log('OK:',m);

const files={
 ashen:'src/dungeons/dungeon-2d-v1.js',
 hollow:'src/dungeons/hollow-sanctum-v1.js',
 chaos:'src/dungeons/chaos-canyon-v1.js',
 blackout:'src/dungeons/blackout-station-v1.js',
 fractured:'src/dungeons/fractured-ages-v1.js',
 quests:'quests-v2.js',
 editor:'admin-room-editor-v1.js'
};

for(const [name,file] of Object.entries(files)){
 if(!exists(file)){fail(name+' source missing: '+file);continue}
 const src=read(file);
 const refs=[...src.matchAll(/\.\/(assets\/[^"'\x60?\\)]+)/g)].map(m=>m[1]);
 for(const ref of new Set(refs)) if(!exists(ref)) fail(file+' references missing asset '+ref);
}

const legacyPatterns=[
 /assets\/ashen-vault\/battlefields\//,
 /vex-calder-room-v2\./,
 /assets\/dungeons\/hollow-sanctum\.webp/
];
for(const [name,file] of Object.entries(files)){
 if(!exists(file))continue;const src=read(file);
 legacyPatterns.forEach(re=>{if(re.test(src))fail(file+' still contains legacy/broken art reference '+re)})
}

const ashen=read(files.ashen),hollow=read(files.hollow),chaos=read(files.chaos),blackout=read(files.blackout),fractured=read(files.fractured);
for(const [id,src] of [['ashen-vault',ashen],['hollow-sanctum',hollow],['chaos-canyon',chaos],['blackout-station',blackout],['fractured-ages',fractured]]){
 if(!src.includes("CellboundExpeditionPresentation?.enter?.('"+id+"'")) fail(id+' is missing shared expedition entry presentation');
 else ok(id+' uses shared expedition entry presentation');
}
if(!hollow.includes("CellboundExpeditionPresentation?.room?.('hollow-sanctum'"))fail('Hollow Sanctum missing shared boss-room transition');
if(!chaos.includes("CellboundExpeditionPresentation?.room?.('chaos-canyon'"))fail('Chaos Canyon missing shared boss-room transition');
if(!blackout.includes("CellboundExpeditionPresentation?.room?.('blackout-station'"))fail('Blackout Station missing shared boss-room transition');
if(!blackout.includes('bs-puzzle-room-art'))fail('Blackout Grid Alignment missing production-art backdrop');
if(!read('src/dungeons/hollow-sanctum-v1.css').includes('.hs2d-arena.hollow-live-room .hs2d-unit:before{display:none!important}'))fail('Hollow unit halo suppression missing');
if(!read('src/dungeons/chaos-canyon-v1.css').includes('.cc2d-arena.canyon-live-room .cc2d-unit:before{display:none!important}'))fail('Chaos unit halo suppression missing');

const requiredRooms=[
 'assets/ashen-vault/rooms/broken-gate.webp','assets/ashen-vault/rooms/hall-embers.webp','assets/ashen-vault/rooms/kael.webp','assets/ashen-vault/rooms/furnace.webp','assets/ashen-vault/rooms/embermaw.webp','assets/ashen-vault/rooms/vault-depths.webp','assets/ashen-vault/rooms/vaultheart.webp',
 'assets/hollow-sanctum/rooms/gallery-void-v2.webp','assets/hollow-sanctum/rooms/sentinel-void-v2.webp','assets/hollow-sanctum/rooms/choir-void-v2.webp',
 'assets/chaos-canyon/rooms/canyon-mouth.webp','assets/chaos-canyon/rooms/thorn-trail.webp','assets/chaos-canyon/rooms/sentinel.webp','assets/chaos-canyon/rooms/crossing.webp','assets/chaos-canyon/rooms/warden.webp','assets/chaos-canyon/rooms/wildheart.webp','assets/chaos-canyon/rooms/vorran.webp',
 'assets/blackout-station/rooms/vex-calder-room.avif',
 'assets/fractured-ages/rooms/high-noon.webp','assets/fractured-ages/rooms/iron-kingdom.webp','assets/fractured-ages/rooms/first-kingdom.webp','assets/fractured-ages/rooms/silent-frontier.webp','assets/fractured-ages/rooms/funhouse.webp'
];
requiredRooms.forEach(p=>{if(!exists(p))fail('Required room art missing: '+p)});
if(failed)process.exit(1);
console.log('Dungeon presentation integrity passed.');
