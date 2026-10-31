const PARTY_KEY='banner-bone-foundation-v1';
const PRACTICE_KEY='banner-bone-practice-v1';
const icons={Vanguard:'🛡️',Cutthroat:'🗡️',Ranger:'🏹',Arcanist:'✨',Warden:'✚'};
const defaults=[
  {id:1,name:'Garrick',job:'Vanguard'},
  {id:2,name:'Sable',job:'Cutthroat'},
  {id:3,name:'Ilyra',job:'Arcanist'},
  {id:4,name:'Maren',job:'Warden'}
];
function party(){
  let data;
  try{data=JSON.parse(localStorage.getItem(PARTY_KEY)||'null');}catch{}
  if(data===null)return defaults;
  if(!data || !Array.isArray(data.heroes)||!Array.isArray(data.party))return [];
  const heroes=data.party.map(id=>data.heroes.find(h=>h.id===id));
  if(new Set(data.party).size!==heroes.length)return [];
  return heroes.filter(Boolean);
}
function record(){
  try{
    const parsed=JSON.parse(localStorage.getItem(PRACTICE_KEY)||'null');
    if(parsed&&['wins','losses','draws'].every(key=>Number.isSafeInteger(parsed[key])&&parsed[key]>=0))return parsed;
  }catch{}
  return {wins:0,losses:0,draws:0};
}
function text(id,value){document.getElementById(id).textContent=value;}
const team=party();
const panel=document.getElementById('partyList');
for(const member of team){
  const item=document.createElement('div');item.className='hero-chip';
  const left=document.createElement('div');
  const ico=document.createElement('span');ico.className='hero-icon';ico.textContent=icons[member.job]||'⚔️';
  const name=document.createElement('strong');name.textContent=' '+String(member.name).slice(0,40);
  left.append(ico,name);
  const role=document.createElement('small');role.textContent=member.job;
  item.append(left,role);panel.appendChild(item);
}
const eligible=team.length===4;
text('partyStatus',eligible?'Four heroes ready for the Training Arena.':'You have '+team.length+'/4 heroes assigned. Assign four different heroes in the Barracks.');
document.getElementById('partyWarning').classList.toggle('hidden',eligible);
for(const link of document.querySelectorAll('#opponents a')){
  if(!eligible){
    link.setAttribute('aria-disabled','true');
    link.removeAttribute('href');
    link.classList.add('secondary');
    link.textContent='Four heroes required';
  }
}
const stats=record();
text('wins',stats.wins+' '+(stats.wins===1?'victory':'victories'));
text('losses',stats.losses+' '+(stats.losses===1?'defeat':'defeats'));
text('draws',stats.draws+' '+(stats.draws===1?'draw':'draws'));
