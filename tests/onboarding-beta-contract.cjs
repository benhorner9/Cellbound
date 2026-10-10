'use strict';
// Regression contracts for the exact Chapter 0 progression and stable story
// presentation used by new beta players.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const onboarding=read('onboarding-v1.js'),comics=read('comic-scenes-v1.js'),quests=read('quests-v2.js');

const fn=(src,start,end)=>{
 const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'Expected section '+start);
 return src.slice(a,b)
};
const lootReview=fn(onboarding,'function renderLootReview(){','function equipTutorialLoot(');
const equip=fn(onboarding,'function equipTutorialLoot(','function renderRecoveryLesson(');
const profession=fn(onboarding,'function renderProfessionUse(){','function renderQuestLesson(){');
const complete=fn(onboarding,'async function completeOnboarding(){','function render(){');
const render=fn(onboarding,'function render(){','async function init(){');
const config=fn(onboarding,'function tutorialComicConfig(id){','function comicSeen(');
const view=fn(comics,'function show(config={}){','function close(){');
assert(lootReview.includes("if(!item){s.onboarding.stage='recovery-lesson'"),'Missing loot may not bypass Cell Shock and professions');
assert(equip.includes("s.onboarding.stage='recovery-lesson'"),'Equipping first drop must lead to recovery lesson');
assert(!equip.includes("coreTrainingComplete=true"),'First loot must not mark training complete');
assert(onboarding.includes("setStage('profession-choice',{shockLessonComplete:true})"),'Cell Shock lesson must progress to a profession');
assert(onboarding.includes("s.onboarding.stage='craft'"),'Profession choice must lead to crafting');
assert(onboarding.includes('if(!s.onboarding.craftSupplyPrepared)')&&onboarding.includes('if(have<quantity)s.materials[key]=quantity'),'Missing first-recipe reagents must be supplied only once');
assert(onboarding.includes("s.onboarding.stage='profession-use'"),'Crafting must lead to first-use lesson');
assert(profession.includes("s.onboarding.professionUseComplete=true;s.onboarding.coreTrainingComplete=true"),'Only preparation use completes the foundational lessons');
assert(profession.includes('recoverTutorialCraft'),'Unavailable crafting item needs an explicit recovery action');
assert(complete.includes('if(!s.onboarding?.coreTrainingComplete){render();return}'),'First adventure must require foundational training');
assert(render.includes("if(['quest-lesson','departure'].includes(stage)&&!s.onboarding?.coreTrainingComplete)"),'Partially progressed accounts must return to unfinished tutorials');
assert(onboarding.includes("const ids=['arrival','west-wall','gear','hollows','loot','shock','craft','contract','departure']"),'Owner story preview includes nine scenes');
assert(config.includes("scene.progressive=true;scene.nextLabel='NEXT PANEL →'"),'All tutorial comics must reveal in sequence');
assert(view.includes('if(progressive)revealNext();else updateProgressiveControls()'),'First comic caption must be visible immediately');
assert(view.includes("querySelectorAll('.cbcomic-reveal-caption')"),'Progressive scenes must not pile old dialogue captions');
assert(view.includes("classList.add('art-unavailable')"),'Missing illustration must not show a broken-image glyph');
assert(onboarding.includes('CellboundCombatStandard')&&onboarding.includes('CellboundDungeon2D')&&onboarding.includes('playSharedEncounter'),'Introductory encounters must use canonical Combat Reborn and shared dungeon viewer');
assert(quests.includes('function comicLineReveals(speaker,beats)'),'First story quest uses stable three-frame dialogue');

// Evaluate the actual quest frame mapping: every amount of dialogue is
// distributed across three illustrated frames without dropping spoken lines.
const start=quests.indexOf('function comicLineReveals(speaker,beats){'),end=quests.indexOf('async function showDialogue(',start);
assert(start>=0&&end>start,'Quest reveal helper exists');
const ctx={};
vm.createContext(ctx);
vm.runInContext(quests.slice(start,end),ctx);
for(const total of [1,2,3,4,7,11]){
 ctx.beats=Array.from({length:total},(_,i)=>'Line '+i);
 const r=vm.runInContext('comicLineReveals("Elara",beats)',ctx);
 assert.equal(r.length,total);
 assert(r.every(x=>x.panel>=0&&x.panel<=2),'All quest beats map into three panels');
 assert.equal(r.map(x=>x.text).join('|'),ctx.beats.join('|'),'Every quest dialogue beat is preserved');
}
console.log('Chapter 0 contracts passed: loot → shock → profession → craft → use → first quest, Combat Reborn and three-frame progressive comics.');
