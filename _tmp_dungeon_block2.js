
let expeditionBattle=null;
function expeditionModal(){
  let root=$('#evoExpeditionBackdrop');
  if(!root){root=document.createElement('div');root.id='evoExpeditionBackdrop';root.className='evo-expedition-backdrop';root.hidden=true;document.body.appendChild(root)}
  return root;
}
function dungeonRole(c){return roleOf(c)}
function dungeonRoleLabel(role){return role==='tank'?'TANK':role==='healer'?'HEALER':'DPS'}
function battleAbility(c,kind='attack'){
  const key=`${c?.class||''}:${c?.spec||''}`;
  const sets={
    'Warrior:Protection':{attack:'Shield Slam',defensive:'Iron Wall',interrupt:'Shield Bash',taunt:'Challenging Roar'},
    'Warrior:Arms':{attack:'Mortal Strike',defensive:'Die by the Sword',interrupt:'Pummel',burst:'Execute'},
    'Paladin:Protection':{attack:'Avenger Strike',defensive:'Guardian Oath',interrupt:'Rebuke',taunt:'Radiant Challenge'},
    'Paladin:Holy':{attack:'Judgement',heal:'Divine Light',groupHeal:'Grace',defensive:'Blessing of Shelter'},
    'Priest:Holy':{attack:'Smite',heal:'Greater Mend',groupHeal:'Divine Hymn',defensive:'Serenity'},
    'Druid:Restoration':{attack:'Wrath',heal:'Regrowth',groupHeal:'Tranquility',defensive:'Barkskin'},
    'Hunter:Marksman':{attack:'Aimed Shot',interrupt:'Concussive Shot',burst:'Rapid Fire',defensive:'Disengage'},
    'Rogue:Assassination':{attack:'Eviscerate',interrupt:'Kick',burst:'Envenom',defensive:'Feint'},
    'Mage:Arcane':{attack:'Arcane Bolt',interrupt:'Counterspell',burst:'Arcane Barrage',defensive:'Prismatic Ward'}
  };
  const fallback={attack:'Strike',heal:'Mend',groupHeal:'Restoration',defensive:'Guard',interrupt:'Interrupt',taunt:'Taunt',burst:'Burst'};
  return sets[key]?.[kind]||fallback[kind]||fallback.attack;
}
function battlePartyModels(){
  const ps=party();
  const ranged=new Set(['Hunter','Mage','Priest','Druid']);
  let meleeIndex=0,rangedIndex=0;
  const meleePos=[[47,61],[46,38],[43,69]],rangedPos=[[26,33],[27,67],[34,78]];
  return ps.map(c=>{
    const role=dungeonRole(c);let pos;
    if(role==='tank')pos=[45,50];
    else if(role==='healer')pos=[24,60];
    else if(ranged.has(c.class)){pos=rangedPos[rangedIndex%rangedPos.length];rangedIndex++}
    else{pos=meleePos[meleeIndex%meleePos.length];meleeIndex++}
    return{id:`party-${c.id}`,charId:c.id,name:c.name,role,className:c.class,spec:c.spec,x:pos[0],y:pos[1],hp:Math.max(18,expeditionCondition(c.id)),maxHp:100};
  });
}
function battleEnemyModels(stage){
  if(stage.kind==='boss'||stage.kind==='final'){
    const name=stage.enemies?.[0]?.[0]||stage.title;
    return[{id:'boss',name,detail:stage.enemies?.[0]?.[1]||'',x:65,y:50,hp:100,maxHp:100,size:stage.kind==='final'?'final':'boss'}];
  }
  const out=[],names=stage.enemies||[];
  const count=stage.kind==='event'?4:5;
  for(let i=0;i<count;i++){
    const src=names[i%Math.max(1,names.length)]||['Ashbound','Hostile'];
    out.push({id:`mob-${i}`,name:src[0],detail:src[1],x:62+(i%2)*8,y:26+(i*14)%58,hp:100,maxHp:100,size:i===0&&stage.id==='vault-depths'?'elite':'trash'});
  }
  return out;
}
function battleMechanicNames(stage){
  const map={
    'broken-gate':{cone:'Hound Rush',ground:'Cinder Trap',cast:'Ash Channel',adds:'Cinder Reinforcements',tank:'Pack Maul'},
    'hall-embers':{cone:'Guardian Sweep',ground:'Ember Sigils',cast:'Molten Invocation',adds:'Acolyte Reinforcements',tank:'Shield Crush'},
    kael:{cone:'Warden Cleave',ground:'Ashen Brand',cast:'Call the Furnace',adds:'Ashbound Wardens',tank:'Furnace Hammer'},
    furnace:{cone:'Heat Vent',ground:'Furnace Eruption',cast:'Pressure Surge',adds:'Cinder Hounds',tank:'Scalding Rush'},
    embermaw:{cone:'Furnace Breath',ground:'Burning Ground',cast:'Scorching Roar',adds:'Cinderlings',tank:'Molten Bite'},
    'vault-depths':{cone:'Guardian Cleave',ground:'Soul Snare',cast:'Bind Essence',adds:'Ash Guardians',tank:'Soul Crush'},
    vaultheart:{cone:'Core Beam',ground:'Cell Fracture',cast:'Heartflare',adds:'Cellspawn',tank:'Core Impact'}
  };
  return map[stage.id]||{cone:'Fronta