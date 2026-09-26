/* Isolated art study. No save, auth, network API or gameplay writes. Uses the shared Inn. */
(()=>{
'use strict';
const specimens=[
 {id:'study-warrior',name:'Mara',class:'Warrior',spec:'Protection',role:'Tank',look:'Braided black hair, warm brown skin, grey-green eyes.',gear:'Layered steel plate, oxblood tabard, sword and round shield.',note:'Broad armour, small hard highlights and a grounded stance.',position:[16,65,16,65]},
 {id:'study-priest',name:'Oren',class:'Priest',spec:'Holy',role:'Healer',look:'Close silver hair and beard, dark skin, amber eyes.',gear:'Bone-grey vestments, ochre lining, staff and prayer book.',note:'Long cloth masses and restrained warm metal distinguish the healer.',position:[57,76,58,77]},
 {id:'study-mage',name:'Ilyra',class:'Mage',spec:'Arcane',role:'DPS',look:'Short auburn hair, olive skin, hazel eyes.',gear:'Teal coat, violet lining, quartz staff and folio.',note:'Angular tailoring and a small magical focus give a clear casting silhouette.',position:[40,43,49,39]},
 {id:'study-rogue',name:'Soren',class:'Rogue',spec:'Assassination',role:'DPS',look:'Ash-blond tied hair, pale skin, blue eyes.',gear:'Charcoal leather, plum scarf and paired daggers.',note:'Asymmetry and close layers keep the agile silhouette distinct.',position:[75,56,81,55]},
 {id:'study-hunter',name:'Tamsin',class:'Hunter',spec:'Marksmanship',role:'DPS',look:'Curly dark hair, brown skin, green eyes.',gear:'Moss-grey cloak, tawny leather, recurve bow and quiver.',note:'The long bow and travelling cloak read before fine detail.',position:[44,94,46,94]}
];
const ids=new Set(specimens.map(c=>c.id));
const image=c=>'./assets/world/avatars/'+c.class.toLowerCase()+'-study-v1.webp';
window.CellboundInnTheme={landscape:'./assets/world/lantern-inn-landscape-v2.webp',portrait:'./assets/world/lantern-inn-portrait-v2.webp',hint:'Select an adventurer to review their illustrated appearance and equipment.'};
// Only this review page defines this adapter. It cannot replace live character artwork.
window.CellboundPortraits={worldAvatarHTML:c=>'<span class="cb-painted-study"><img src="'+image(c)+'" alt="" width="1024" height="1536" decoding="async"></span>'};
function renderTools(){
 const q=document.querySelector('#reviewSearch').value.toLowerCase();
 document.querySelector('#reviewRoster').innerHTML=specimens.map(c=>'<div class="review-row"'+(!(c.name+' '+c.class).toLowerCase().includes(q)?' hidden':'')+'><div><h3>'+c.name+'</h3><small>'+c.class+' · '+c.role+'</small></div><button data-char="'+c.id+'">Inspect</button></div>').join('');
 document.querySelector('#reviewParty').innerHTML=specimens.map(c=>'<div class="review-row"><div><h3>'+c.name+'</h3><small>'+c.class+' · '+(ids.has(c.id)?'Preparing to leave':'Resting at the Inn')+'</small></div><button data-study-party="'+c.id+'" aria-pressed="'+ids.has(c.id)+'">'+(ids.has(c.id)?'Rest at Inn':'Join party')+'</button></div>').join('');
}
function place(){for(const c of specimens){const n=document.querySelector('[data-inn-character="'+c.id+'"]');if(!n)continue;const p=c.position;n.style.setProperty('--review-x',p[0]+'%');n.style.setProperty('--review-y',p[1]+'%');n.style.setProperty('--review-phone-x',p[2]+'%');n.style.setProperty('--review-phone-y',p[3]+'%');n.style.setProperty('--depth',Math.round(p[1]))}}
window.CellboundGame={getState:()=>({roster:specimens}),getPartyCharacters:()=>specimens.filter(c=>ids.has(c.id)),renderAll:()=>{renderTools();dispatchEvent(new CustomEvent('cellbound:state-rendered'));place()}};
const modal=document.querySelector('#characterModal');
document.addEventListener('click',e=>{
 const pick=e.target.closest('[data-char]');if(pick){const c=specimens.find(c=>c.id===pick.dataset.char);if(!c)return;document.querySelector('#reviewCharacterName').textContent=c.name;document.querySelector('#reviewCharacterBody').innerHTML='<div class="review-character-content"><img src="'+image(c)+'" alt="'+c.class+' illustrated prototype"><div><h3>'+c.class+'</h3><p>'+c.role+' · '+c.spec+'</p><dl><dt>Appearance study</dt><dd>'+c.look+'</dd><dt>Equipment study</dt><dd>'+c.gear+'</dd></dl><p>'+c.note+'</p><p>Art prototype only. This is not a player character or a complete customisable gear renderer.</p></div></div>';modal.hidden=false;}
 if(e.target.closest('[data-close]'))modal.hidden=true;
 const party=e.target.closest('[data-study-party]');if(party){const id=party.dataset.studyParty;ids.has(id)?ids.delete(id):ids.add(id);CellboundGame.renderAll();document.querySelector('[data-study-party="'+id+'"]')?.focus()}
});
document.querySelector('#reviewSearch').addEventListener('input',renderTools);
document.querySelector('#reviewLabels').addEventListener('click',e=>{const hidden=document.body.classList.toggle('hide-labels');e.currentTarget.setAttribute('aria-pressed',String(hidden));e.currentTarget.textContent=hidden?'Show labels':'Hide labels'});
window.addEventListener('DOMContentLoaded',()=>{renderTools();place()});
})();
