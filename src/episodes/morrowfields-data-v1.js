/* Shared chapter data. Story progression and combat settlement live on the server. */
(()=>{
'use strict';
const root='assets/episodes/morrowfields/';
const asset=id=>root+id+'.webp';
const locations=[
 {id:'fenstead',name:'Fenstead Farm',x:23,y:66,requires:'briefing',ready:true,description:'Mara Fen’s farm. A light in the window, a place to return to.'},
 {id:'east-fields',name:'East Fields',x:81,y:73,requires:'fenstead',ready:true,description:'An abandoned wagon waits beyond the wheat.'},
 {id:'rotroot',name:'Rotroot Orchard',x:20,y:39,requires:'e2_q01',quest:'e2_q02',description:'Follow the resonance beneath the western orchard rows.'},
 {id:'floodgate',name:'Floodgate Basin',x:81,y:39,requires:'e2_q01',quest:'e2_q03',description:'Trace the contaminated irrigation waterways.'},
 {id:'glasshouse',name:'Glasshouse Ridge',x:17,y:14,requires:'e2_q05',description:'Follow the damaged greenhouse equipment to its source.'},
 {id:'granary',name:'Old Granary',x:49,y:23,requires:'e2_q06',description:'Investigate the passages beneath the grain stores.'},
 {id:'array',name:'Harvest Array',x:82,y:15,requires:'e2_q04',description:'Prepare the assault after both first investigations.'},
 {id:'heart',name:'Harvest Heart',x:49,y:7,requires:'e2_q07',description:'The final approach opens after No More Containment.'}
];
const clues=[
 {id:'tracks',name:'Wheel tracks',x:18,y:63,text:'The ruts end in a deep hollow. The wagon was pulled down, not driven off the road.'},
 {id:'container',name:'Torn container',x:84,y:60,text:'The sacks are untouched. This was not a theft. The wood split from below.'},
 {id:'soil',name:'Disturbed soil',x:83,y:20,text:'A ridge runs beneath the wheat. It is fresh, and it is still moving.'},
 {id:'device',name:'Mechanical fragment',x:53,y:73,text:'Machined bronze beneath living roots. Something has built itself into the field.'}
];
const npc={mara:{name:'Mara Fen',role:'Farmer · Fenstead',portrait:asset('mara')},voss:{name:'Dr. Elara Voss',role:'Researcher · Zeltira',portrait:asset('voss')},vey:{name:'Warden Elara Vey',role:'Warden · Zeltira',portrait:asset('vey')},tessa:{name:'Tessa Orr',role:'Resonance specialist',portrait:asset('tessa')}};
const opening=[
 {art:asset('comic-01'),title:'A system that should be dead',text:'Deep inside the ruined Null Complex, a broken communications relay wakes.'},
 {art:asset('comic-02'),title:'Beyond the city walls',text:'Far from Zeltira, beneath fields left quiet for the evening, a red light answers.'},
 {art:asset('comic-03'),title:'The transmission',text:'“Three days. I thought we had three quiet days. The Complex has just answered a relay out in the Morrowfields.” — Dr. Elara Voss'}
];
const closing=[
 {art:asset('comic-04'),title:'The same insignia',text:'Tessa turns the component under her lamp. Beneath the soil is the mark of the Null Complex. Her meter answers twice.'},
 {art:asset('comic-05'),title:'Under the roots',text:'One resonance travels beneath the orchard. The roots carry it farther than the trees can reach.'},
 {art:asset('comic-06'),title:'Through the water',text:'“Two trails. One in the roots, one in the water. And both are moving away from us.”'}
];
const encounter={id:'e2-q01-wheat',title:'Something in the Wheat',kind:'combat',level:15,recommendedItemLevel:30,enemyHealth:350,mechanicIntervalMs:4200,fixedMechanicOrder:true,
 enemies:[{name:'Blighted Grazer',classification:'trash',attackName:'Horn Rush',attackRange:5},{name:'Harvest Crawler',classification:'trash',attackName:'Burrowing Claws',attackRange:5},{name:'Rotroot Husk',classification:'trash',attackName:'Root Lash',attackRange:10}],
 mechanics:[{id:'grazer-charge',name:'Trampling Charge',type:'line',duration:1900,ownerEnemyId:'e-0'},
 {id:'crawler-burrow',name:'Burrow Eruption',type:'target-circle',duration:2100,radius:7,damage:22,ownerEnemyId:'e-1'},
 {id:'husk-regrowth',name:'Root Regrowth',type:'self-heal',duration:2600,healPct:.08,priority:'critical',ownerEnemyId:'e-2'}]
};
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x};
window.CellboundMorrowfieldsData=freeze({version:1,asset,locations,clues,npc,opening,closing,encounter});
})();
