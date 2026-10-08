const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
let failed=false;
const fail=m=>{console.error('ERROR:',m);failed=true};
const ok=m=>console.log('OK:',m);

const manorFile='manor-raid-v1.js',manorCssFile='manor-raid-v1.css',viewerFile='src/dungeons/dungeon-2d-v1.js',editorFile='admin-room-editor-v1.js';
for(const p of [manorFile,manorCssFile,viewerFile,editorFile])if(!exists(p))fail('Missing '+p);
if(failed)process.exit(1);

const manor=read(manorFile),css=read(manorCssFile),viewer=read(viewerFile),editor=read(editorFile);

const requiredAssets=[
 'assets/manor/manor-raid-hero.webp',
 'assets/manor/manor-butler.webp',
 'assets/manor/manor-maids.webp',
 'assets/manor/manor-engineer.webp',
 'assets/manor/manor-master.webp'
];
requiredAssets.forEach(p=>{if(!exists(p))fail('Required Manor art missing: '+p)});

for(const rpc of ['start_manor_raid','fail_manor_raid','advance_manor_raid','manor_set_ready','manor_screech_result_v2','claim_manor_raid_rewards']){
 if(!manor.includes(rpc))fail('Manor runtime lost server contract '+rpc);
}
for(const stage of ['butler','maids','engineer','bedroom','housebound']){
 if(!manor.includes(stage))fail('Manor stage missing: '+stage);
}
for(const room of ['entrance-hall','dining-room','kitchen','workshop','bedroom','attic']){
 if(!manor.includes(room))fail('Manor room-layout mapping missing: '+room);
}
if(!manor.includes("layoutContent:'the-manor'"))fail('Manor no longer uses the shared room-layout runtime');
if(!manor.includes('environmentHtml:manorRoomScene'))fail('Manor shared combat rooms are missing room-specific environment presentation');
if(!viewer.includes('options.environmentHtml||'))fail('Shared combat viewer no longer accepts external room artwork/environments');
if(!manor.includes('roomScene:manorRoomScene'))fail('Owner tools cannot preview the live Manor room scene');
if(!editor.includes('Live Manor runtime scene preview')||!editor.includes('window.CellboundManorRaid.roomScene'))fail('Room Editor is not wired to live Manor scenes');

for(const token of ['ownerSoloQa','startOwnerSoloQa','OWNER SOLO QA · NO CHARGES / NO LOOT','qaPartnerSnapshot','removeOwnerQaControls']){
 if(!manor.includes(token))fail('Owner solo QA contract missing: '+token);
}
if(!manor.includes('if(ownerSoloQa)return;'))fail('Owner QA must not apply real wipe Cell Shock');
if(!manor.includes("if(!qa){\n  markManorCleared"))fail('Owner QA victory must not write real Manor progression');
if(!manor.includes("qa?'QA RESULT':'PERSONAL RAID LOOT'"))fail('Owner QA victory must not expose real loot claim UI');

for(const token of ['mrMaidLinkOverlay','PARTNER ROOM','maidPenaltyA','maidPenaltyB'])if(!manor.includes(token))fail('Linked Maid visibility missing: '+token);
for(const token of ['mrMasterStatusOverlay','MASTER EMPOWERMENT · RAID-WIDE','BOSS HP +','DAMAGE +'])if(!manor.includes(token))fail('Master Screech penalty overlay missing: '+token);
if(!manor.includes("SCREECH_TIMEOUT_MS=4500"))fail('Screech timing contract changed unexpectedly');
if(!manor.includes("result==='timeout'"))fail('Screech timeout penalty handling missing');

for(const token of ['ATTEMPT FAILED · RAID CHARGE SPENT','The next attempt starts again from The Butler','2 × Tier 5 Items','claim_manor_raid_rewards']){
 if(!manor.includes(token))fail('Raid wipe/reward contract missing: '+token);
}

for(const cls of ['.mr-room-scene','.room-dining','.room-kitchen','.room-engineer','.room-bedroom','.room-housebound','.mr-owner-qa-controls','.mr-master-status-overlay']){
 if(!css.includes(cls))fail('Manor presentation CSS missing: '+cls);
}
const sceneStart=manor.indexOf('function manorRoomScene');
const sceneEnd=manor.indexOf('\n}',sceneStart);
const scene=sceneStart>=0?manor.slice(sceneStart,sceneEnd+2):'';
if(!scene.includes('manor-raid-hero.webp'))fail('Manor room scene must use the raid environment artwork');
if(/manor-(butler|maids|engineer|master)\.webp/.test(scene))fail('Boss portraits must not be substituted as room background art');

if(failed)process.exit(1);
ok('Manor raid integrity passed: owner solo QA, shared room presentation, split-link visibility, Screech penalties, wipe rules and Tier 5 reward contracts are release-gated.');
