'use strict';
/**
 * Shared Cellbound QA release gate.
 *
 * The same test inventory must run on pull requests and on the staging deploy.
 * Every test in tests/ is enrolled automatically; appearance tests are already
 * covered by the separate npm run test:appearance command.
 *
 * Usage:
 *   node tools/qa-runner.cjs core
 *   node tools/qa-runner.cjs browser
 *   CELLBOUND_TEST_ENGINE=webkit node tools/qa-runner.cjs browser
 */
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'tests');
const category=process.argv[2];
if(!['core','browser'].includes(category)){
  console.error('Usage: node tools/qa-runner.cjs core|browser');
  process.exit(2);
}
const appearance=new Set([
  'appearance-foundation.cjs','appearance-catalogue.cjs',
  'illustrated-items.cjs','equipment-fit-matrix.cjs',
  ...Array.from({length:6},(_,i)=>'comic-art-coverage-block'+(i+1)+'.cjs')
]);
const required={
  core:[
    'gameplay-contracts.cjs','dungeon-presentation-integrity.cjs',
    'story-presentation-integrity.cjs','manor-raid-integrity.cjs',
    'living-combat.authority.cjs','item-catalog.cjs','design-booth.cjs',
    'room-art-uploads.cjs','comic-scene-editor.cjs',
    'pvp-objectives.integration.cjs','pvp-online-match.contract.cjs',
    'pvp-persistent-matchmaking.contract.cjs'
  ],
  browser:[
    'full-playthrough.browser.cjs','gameplay-regression.browser.cjs',
    'living-combat.browser.cjs','design-booth.browser.cjs',
    'equipment-fit.browser.cjs','race-identity.browser.cjs',
    'login-screen.browser.cjs','ui-performance.browser.cjs'
  ]
};
const all=fs.readdirSync(dir).filter(x=>x.endsWith('.cjs')).sort();
for(const test of [...appearance,...required.core,...required.browser]){
  if(!all.includes(test)){
    console.error('QA inventory is missing required test: '+test);
    process.exit(1);
  }
}
const suites={
  core:all.filter(x=>!x.endsWith('.browser.cjs')&&!appearance.has(x)),
  browser:all.filter(x=>x.endsWith('.browser.cjs'))
};
const suite=suites[category];
const engine=category==='browser'?(process.env.CELLBOUND_TEST_ENGINE==='webkit'?'WebKit':'Chromium'):'Node';
const results=[];
const started=Date.now();
for(const file of suite){
  console.log('\n===== '+engine+' | '+file+' =====');
  const run=spawnSync(process.execPath,[path.join(dir,file)],{
    cwd:root,env:process.env,stdio:'inherit',
    timeout:category==='browser'?480000:120000
  });
  const success=run.status===0&&!run.error;
  results.push({file,success});
  if(run.error)console.error('QA test process error:',run.error.message);
  if(run.signal)console.error('QA test terminated by signal:',run.signal);
}
const passed=results.filter(r=>r.success).length;
const failed=results.filter(r=>!r.success).map(r=>r.file);
const summary=engine+' '+category+' QA: '+passed+'/'+results.length+' passed in '+Math.round((Date.now()-started)/1000)+'s';
console.log('\n'+summary);
if(failed.length)console.error('FAILED: '+failed.join(', '));
const report=process.env.GITHUB_STEP_SUMMARY;
if(report){
  const escape=s=>s.replace(/\|/g,'\\|');
  fs.appendFileSync(report,
    '\n### Cellbound '+engine+' '+category+' QA\n\n'+
    '| Test | Result |\n| --- | --- |\n'+
    results.map(r=>'| '+escape(r.file)+' | '+(r.success?'PASS':'FAIL')+' |').join('\n')+
    '\n\n**'+summary+'**\n'
  );
}
if(failed.length)process.exitCode=1;
