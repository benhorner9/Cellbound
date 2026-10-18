const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
let failed=false;
const fail=m=>{console.error('ERROR:',m);failed=true};
const ok=m=>console.log('OK:',m);

const sources={
 comic:'comic-scenes-v1.js',
 onboarding:'onboarding-v1.js',
 quests:'quests-v2.js',
 bell:'thirteenth-bell-v1.js',
 fourfold:'fourfold-lock-v1.js',
 noWayBack:'no-way-back-v1.js'
};
for(const [name,file] of Object.entries(sources)){
 if(!exists(file)){fail(name+' source missing: '+file);continue}
 const src=read(file);
 const refs=[...src.matchAll(/\.\/(assets\/[^"'\x60?\\)]+)/g)].map(m=>m[1]);
 for(const ref of new Set(refs))if(!exists(ref))fail(file+' references missing story asset '+ref);
}

const onboarding=read(sources.onboarding),quests=read(sources.quests),bell=read(sources.bell),fourfold=read(sources.fourfold),nwb=read(sources.noWayBack);
if(!onboarding.includes('CellboundComicScenes'))fail('Tutorial is no longer wired to the shared comic viewer');
if(!quests.includes('CellboundComicScenes'))fail('Main quest chain is no longer wired to the shared comic viewer');
if(!quests.includes('assets/quests/ashes-east-road-cinder-cart.webp'))fail('Ashes on the East Road comic sequence lost its quest-specific artwork');
if(!bell.includes('bellComic(')||!bell.includes('assets/comics/thirteenth-bell/'))fail('The Thirteenth Bell bespoke comic presentation is missing');
if(!fourfold.includes('CellboundComicScenes')||!fourfold.includes("theme:'fourfold'")||!fourfold.includes('FOURFOLD_STORY_ART'))fail('The Fourfold Lock is not using shared comic presentation');
if(!nwb.includes('CellboundComicScenes')||!nwb.includes("theme:'manor'")||!nwb.includes('NWB_STORY_ART'))fail('No Way Back is not using shared comic presentation');

const required=[
 'assets/comics/tutorial/wardens_at_the_twilight_city_gate.webp',
 'assets/comics/tutorial/moonlit_ruins_and_the_glowing_wardstone.webp',
 'assets/comics/tutorial/the_quartermaster_s_choice.webp',
 'assets/comics/tutorial/warden_s_descent_into_the_ruins.webp',
 'assets/comics/tutorial/the_warden_and_the_arcane_diadem.webp',
 'assets/comics/tutorial/arcane_overload_a_warden_s_lesson.webp',
 'assets/comics/tutorial/arcane_forge_beneath_the_twilight_citadel.webp',
 'assets/comics/tutorial/dawn_briefing_on_the_ash_road.webp',
 'assets/comics/tutorial/dawn_departure_from_zeltira_citadel.webp',
 'assets/quests/ashes-east-road-cinder-cart.webp',
 'assets/comics/null-complex/voss-signal.webp',
 'assets/comics/null-complex/facility-entry.webp',
 'assets/comics/null-complex/first-aberrant.webp',
 'assets/comics/null-complex/orin-recording.webp',
 'assets/comics/null-complex/subject-zero.webp',
 'assets/comics/null-complex/subject-zero-awake.webp',
 'assets/comics/null-complex/overseer-awakens.webp',
 'assets/comics/null-complex/prototype-07.webp',
 'assets/comics/null-complex/teleporter.webp',
 'assets/comics/null-complex/escape.webp',
 'assets/comics/thirteenth-bell/sealed_letter.webp',
 'assets/comics/thirteenth-bell/greywake_arrival.webp',
 'assets/comics/thirteenth-bell/locked_house.webp',
 'assets/comics/thirteenth-bell/bellkeeper.webp',
 'assets/comics/thirteenth-bell/bell_breaks.webp',
 'assets/comics/thirteenth-bell/final_run.webp',
 'assets/comics/thirteenth-bell/greywake_freed.webp',
 'assets/comics/thirteenth-bell/departure.webp',
 'assets/bosses/fractured-ages-old-man.webp',
 'assets/dungeons/fractured-ages.webp',
 'assets/fractured-ages/rooms/high-noon.webp',
 'assets/fractured-ages/rooms/funhouse.webp',
 'assets/bosses/no-way-back-silas-vane-v3.jpg',
 'assets/bosses/no-way-back-three-hounds-v3.jpg',
 'assets/manor/manor-raid-hero.webp',
 'assets/manor/manor-master.webp'
];
required.forEach(p=>{if(!exists(p))fail('Required story/comic artwork missing: '+p)});

if(!read('fourfold-lock-v1.css').includes("url('./assets/bosses/fractured-ages-old-man.webp')"))fail('Fourfold quest journal is not using final story artwork');
if(!read('no-way-back-v1.css').includes("url('./assets/bosses/no-way-back-silas-vane-v3.jpg')"))fail('No Way Back quest journal is not using Silas artwork');
const comicCss=read('comic-scenes-v1.css');
for(const theme of ['fourfold','manor','null'])if(!comicCss.includes('data-theme="'+theme+'"'))fail('Shared comic theme missing: '+theme);

if(failed)process.exit(1);
ok('Tutorial, campaign, Null Complex, Thirteenth Bell, Fourfold and No Way Back story presentation integrity passed.');
