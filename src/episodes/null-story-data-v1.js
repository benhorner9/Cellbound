(()=>{
'use strict';
const art=id=>'./assets/comics/null-complex/'+id+'.webp';
const fight=(id,title,enemies,level,hp,mechanics)=>({id:'null-story-'+id,title,kind:id==='prototype'?'final':'boss',enemies,level,enemyHealth:hp,mechanics});
window.CellboundNullStoryData={steps:[
 {id:'signal',title:'The Signal',speaker:'Dr. Elara Voss',art:art('voss-signal'),text:'This signal should not exist. The facility transmitting it was destroyed years ago. NULL//07. Containment active. Personnel: zero. Subjects: forty-seven. Follow the signal. Find out what is still alive in there.'},
 {id:'entry',title:'The Forgotten Facility',speaker:'Dr. Elara Voss',art:art('facility-entry'),text:'The doors still have power. Barely. Stay together. Whatever is transmitting from inside has been doing it without personnel for years.'},
 {id:'splice',title:'First Contact',art:art('first-aberrant'),encounter:fight('splice','First Contact',['Splice'],4,620,[['Backline Pounce','line',1500],['Cell Rend','cone',1700]])},
 {id:'recording',title:'The First Recording',speaker:'Director Cael Orin',art:art('orin-recording'),text:'The Null Complex was built to answer a simple question: what happens when a Cell is deliberately altered rather than naturally developed? We are unlocking the next step in human potential.'},
 {id:'zero',title:'Containment Wing',art:art('subject-zero'),encounter:fight('zero','Containment Wing',['Bulwark Specimen','Siphon'],5,720,[['Containment Guard','circles',1600],['Power Siphon','interrupt',1800]])},
 {id:'subject',title:'Subject Zero',speaker:'Dr. Elara Voss',art:art('subject-zero'),text:'SUBJECT ZERO. Status: stable. That chamber is drawing more power than the rest of the wing combined. Do not touch it.'},
 {id:'cable',title:'Collapsed Cable Trench',text:'Which line still carries the teleporter signal?',choices:['COOLANT RETURN','LIVE CONDUIT','SECURITY BUS'],answer:1,component:'cable',art:art('teleporter')},
 {id:'interruption',title:'Power Bay Interruption',art:art('facility-entry'),encounter:fight('interruption','Power Bay Interruption',['Null Stalker','Splice'],5,650,[['Phase Ambush','line',1400],['Backline Pounce','line',1500]])},
 {id:'cell',title:'Emergency Power Bay',text:'The cell is locked behind a three-bank transfer. Choose the safe transfer order.',choices:['ISOLATE → BYPASS → DISCHARGE','DISCHARGE → OPEN → BYPASS','BYPASS → OPEN → ISOLATE'],answer:0,component:'cell',art:art('teleporter')},
 {id:'alert',title:'Alert Response',optional:true,art:art('overseer-awakens'),encounter:fight('alert','Alert Response',['Overseer Drone'],5,760,[['Command Pulse','circles',1600],['System Lock','interrupt',1700]])},
 {id:'fuse',title:'Reactor Service Console',text:'Which system must be vented before the fuse is removed?',choices:['AUXILIARY REACTOR LINE','CONTAINMENT COOLANT','PRIMARY CELL FEED'],answer:0,component:'fuse',art:art('teleporter')},
 {id:'teleporter',title:'The Teleporter',speaker:'Dr. Elara Voss',art:art('teleporter'),text:'That is all three. Get them back to the teleporter. Something else just came online. Move.'},
 {id:'overseer',title:'The Overseer',speaker:'THE OVERSEER',art:art('overseer-awakens'),text:'Unauthorized personnel detected. Containment protocol resumed. Experiment cycle commencing.'},
 {id:'prototype',title:'Prototype 07 — The Reconstituted',art:art('prototype-07'),encounter:fight('prototype','Prototype 07 — The Reconstituted',['Prototype 07 — The Reconstituted'],6,1350,[['Backline Pounce','line',1500],['Power Siphon','interrupt',1750],['Reactor Instability','circles',1600]])},
 {id:'escape',title:'Escape',speaker:'Dr. Elara Voss',art:art('escape'),text:'Those were not mutations. They were modifications. Install the final component. Do not wait for the system to stabilise. Activate it. Now.'},
 {id:'sting',title:'After the Extraction',art:art('subject-zero-awake'),text:'Deep inside the empty facility, a containment monitor flickers back to life. SUBJECT ZERO — STATUS: AWAKE.'}
]};
})();
