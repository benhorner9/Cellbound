'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const sandbox={window:{},console};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('enemy-builder-model-v1.js','utf8'),sandbox);
const M=sandbox.window.CellboundEnemyModel,boss=M.fresh();
assert.deepEqual([...M.validate(boss)],[]);
for(const [field,value] of [['health',Infinity],['health',50001],['level',0],['level',1.5],['defence',61],['damageScale',4],['behaviour','javascript'],['artPath','javascript:alert(1)'],['artPath','assets/../secret.png'],['intervalMs',0]]){
 const bad={...boss,[field]:value};assert(M.validate(bad).length,field+' must reject '+value);assert.throws(()=>M.encounter(bad));
}
const bad=M.fresh();bad.phases.push({...M.phase(),atPct:70});assert(M.validate(bad).some(x=>x.includes('thresholds')));
const unknown=M.fresh();unknown.abilities[0].type='raid-wipe';assert.throws(()=>M.encounter(unknown));
const encounter=M.encounter(boss);assert.equal(encounter.enemies[0].maxHealth,1500);assert.equal(encounter.enemies[0].absoluteHealth,true);assert.equal(encounter.phases[0].atPct,50);assert.equal(encounter.phases[0].addMechanics[0].type,'interrupt');
const stage=M.stage(boss,{slug:'studio-fight-test',revision:3});boss.health=999;assert.equal(stage.enemySpec.health,1500,'adventure gets an independent snapshot');assert.equal(stage.enemySource.revision,3);
for(const path of M.backgrounds)assert(fs.existsSync(path),'Built-in art exists: '+path);
console.log('Enemy builder validation and snapshot contracts passed.');
