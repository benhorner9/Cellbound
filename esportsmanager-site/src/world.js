// World schema v2 — canonical entities, with a non-enumerable legacy UI facade.
export const WORLD_VERSION=2;
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const integer=Number.isSafeInteger;
const clone=x=>JSON.parse(JSON.stringify(x));
function fingerprint(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h.toString(16).padStart(8,'0');}
const makeId=(w,type,id)=>w.id+':'+type+':'+id;
const lists={players:'playerIds',prospects:'prospectIds',creators:'creatorIds',creatorCandidates:'creatorCandidateIds'};
const fields={org:'name',tag:'tag',colour:'colour',cash:'cash',fans:'fans',prestige:'prestige',trust:'trust',staffMood:'staffMood',decisions:'decisions',ownerTitle:'ownerTitle',tactic:'tactic',training:'training',teamChemistry:'teamChemistry',teamWins:'teamWins',teamLosses:'teamLosses',teamMapsWon:'teamMapsWon',teamMapsLost:'teamMapsLost',scheduled:'scheduled',sponsors:'sponsors',sponsorOffers:'sponsorOffers',products:'products',pitches:'pitches',staff:'staff',facilities:'facilities',officeRent:'officeRent',weeklyRecords:'weeklyRecords',results:'results',industry:'industry',notifications:'notifications',project:'project',contentBudget:'contentBudget',promo:'promo',lastReport:'lastReport',createdAt:'createdAt',mode:'mode'};
const current=s=>s.world.organisations[s.activeOrganisationId];
function register(w,org,key,arr){
 org[lists[key]]=arr.map(p=>{
  const id=p.talentId||makeId(w,'talent',p.id);
  w.talents[id]={...clone(p),talentId:id,kind:(key==='players'||key==='prospects')?'player':'creator'};
  return id;
 });
}
function cpuOrg(w,r,i){
 const id=makeId(w,'org','cpu-'+(i+1));
 return {id,controllerId:makeId(w,'controller','cpu-'+(i+1)),name:r.name,tag:r.name.split(' ').map(v=>v[0]).join('').slice(0,5),colour:r.colour,
 cash:4500000,fans:r.fans,prestige:r.prestige,trust:65,staffMood:75,decisions:4,ownerTitle:'CPU Director',tactic:r.tactic,
 training:'Teamwork',teamChemistry:65,teamWins:r.wins,teamLosses:r.losses,teamMapsWon:0,teamMapsLost:0,
 playerIds:[],prospectIds:[],creatorIds:[],creatorCandidateIds:[],scheduled:{},sponsors:[],sponsorOffers:[],products:[],
 pitches:[],staff:[],facilities:1,officeRent:28000,weeklyRecords:[],results:[],industry:[],notifications:[],
 project:'Behind the scenes',contentBudget:10000,promo:0,lastReport:null,createdAt:null,mode:'CPU',
 skill:r.skill,wins:r.wins,losses:r.losses,legacyRivalId:r.id};
}
export function packLegacy(v1){
 if(!obj(v1)||v1.version!==1)throw Error('Starter-v1 save required.');
 const w={id:'world-'+fingerprint((v1.createdAt||'unknown')+'|'+v1.org+'|'+v1.tag),
  seed:v1.seed,calendar:{week:v1.week,year:v1.year,season:v1.season},
  organisations:{},controllers:{},leagues:{},seasons:{},talents:{},contracts:{}};
 const founderId=makeId(w,'org','founder'),controllerId=makeId(w,'controller','founder');
 const org={id:founderId,controllerId,name:v1.org};
 const skip=new Set(['version','seed','org','week','year','season','league','players','prospects','creators','creatorCandidates']);
 for(const [key,value] of Object.entries(v1))if(!skip.has(key))org[key]=clone(value);
 w.organisations[founderId]=org;
 w.controllers[controllerId]={id:controllerId,organisationId:founderId,type:'human',accountId:null,strategy:'balanced'};
 for(const key of Object.keys(lists))register(w,org,key,v1[key]);
 org.staff.forEach((staff,i)=>{staff.id=staff.id||makeId(w,'staff','founder-'+(i+1));});
 const players=[founderId];
 v1.league.forEach((r,i)=>{
  const cpu=cpuOrg(w,r,i);w.organisations[cpu.id]=cpu;
  w.controllers[cpu.controllerId]={id:cpu.controllerId,organisationId:cpu.id,type:'cpu',accountId:null,
   strategy:['balanced','competitive','creator','commercial'][i%4]};
  players.push(cpu.id);
 });
 const leagueId=makeId(w,'league','strikefront-regional'),seasonId=makeId(w,'season',String(v1.season));
 w.leagues[leagueId]={id:leagueId,name:'Strikefront Regional',gameId:'strikefront',
  seasonId,participantIds:players,fixtureWeeks:9,gameFormat:'best-of-three'};
 w.seasons[seasonId]={id:seasonId,number:v1.season,year:v1.year,leagueIds:[leagueId],status:'active',weeksPerYear:52};
 const state={version:WORLD_VERSION,activeOrganisationId:founderId,world:w};
 reconcileContracts(state);
 return state;
}
export function reconcileContracts(state){
 if(!state||state.version!==WORLD_VERSION)return;
 const w=state.world,next={...w.contracts};
 for(const c of Object.values(next))if(c.status==='active'||c.status==='available')c.status='inactive';
 for(const org of Object.values(w.organisations)){
  const pools=[['playerIds','player','active'],['prospectIds','player','available'],['creatorIds','creator','active'],['creatorCandidateIds','creator','available']];
  for(const [key,type,status] of pools)for(const id of org[key]||[]){
   const t=w.talents[id];if(!t)continue;
   const cid=makeId(w,'contract',t.id);t.contractId=cid;
   next[cid]={...(next[cid]||{}),id:cid,type,talentId:id,
    organisationId:status==='active'?org.id:null,weeksRemaining:t.contract,weeklyWage:t.wage,status};
  }
  for(const sponsor of org.sponsors||[]){
   const cid=makeId(w,'contract','sponsor-'+org.id+'-'+sponsor.id);
   sponsor.contractId=cid;
   next[cid]={...(next[cid]||{}),id:cid,type:'sponsor',organisationId:org.id,counterparty:sponsor.name,
    weeksRemaining:sponsor.weeks,weeklyWage:0,weeklyFee:sponsor.amount,status:'active'};
  }
  for(const staff of org.staff||[])if(!staff.id){
   let i=1,id=makeId(w,'staff',org.id+'-'+i);
   while(org.staff.some(s=>s.id===id)){i++;id=makeId(w,'staff',org.id+'-'+i);}
   staff.id=id;
  }
 }
 w.contracts=next;
}
export function hydrateWorld(state){
 if(!obj(state)||state.version!==WORLD_VERSION||!obj(state.world))throw Error('Invalid world state.');
 const keys={
  seed:()=>[state.world,'seed'],
  week:()=>[state.world.calendar,'week'],
  year:()=>[state.world.calendar,'year'],
  season:()=>[state.world.calendar,'season']
 };
 for(const [key,lookup] of Object.entries(keys)){
  Object.defineProperty(state,key,{enumerable:false,configurable:true,get(){const [o,k]=lookup();return o[k];},set(v){const [o,k]=lookup();o[k]=v;}});
 }
 for(const [field,key] of Object.entries(fields)){
  Object.defineProperty(state,field,{enumerable:false,configurable:true,get(){return current(state)[key];},set(v){current(state)[key]=v;}});
 }
 for(const [field,key] of Object.entries(lists)){
  Object.defineProperty(state,field,{enumerable:false,configurable:true,
   get(){return current(state)[key].map(id=>state.world.talents[id]);},
   set(arr){if(!Array.isArray(arr))throw Error('Expected a talent list.');register(state.world,current(state),field,arr);}
  });
 }
 Object.defineProperty(state,'league',{enumerable:false,configurable:true,get(){
  const league=Object.values(state.world.leagues)[0];
  return league.participantIds.filter(id=>id!==state.activeOrganisationId).map(id=>state.world.organisations[id]);
 }});
 return state;
}
export function validateWorld(state){
 if(!obj(state)||state.version!==WORLD_VERSION||!obj(state.world)||typeof state.activeOrganisationId!=='string')return false;
 const w=state.world,c=w.calendar;
 if(typeof w.id!=='string'||!w.id||!integer(w.seed)||!obj(c)||
    !integer(c.week)||c.week<1||c.week>52||!integer(c.year)||c.year<1||
    !integer(c.season)||c.season<1)return false;
 if(!['organisations','controllers','leagues','seasons','talents','contracts'].every(k=>obj(w[k])))return false;
 const org=w.organisations[state.activeOrganisationId];
 if(!obj(org)||!obj(w.controllers[org.controllerId])||w.controllers[org.controllerId].type!=='human')return false;
 if(typeof org.name!=='string'||!org.name.trim()||!integer(org.cash)||
    !Number.isFinite(org.fans)||!integer(org.decisions)||!integer(org.officeRent)||!integer(org.contentBudget))return false;
 for(const [id,o] of Object.entries(w.organisations)){
  if(!obj(o)||o.id!==id||!obj(w.controllers[o.controllerId])||
     w.controllers[o.controllerId].organisationId!==id||
     !['human','cpu'].includes(w.controllers[o.controllerId].type)||
     !Object.values(lists).every(k=>Array.isArray(o[k])&&o[k].every(t=>!!w.talents[t])))return false;
 }
 const league=Object.values(w.leagues)[0],season=w.seasons[league?.seasonId];
 if(!obj(league)||!Array.isArray(league.participantIds)||
    !league.participantIds.includes(org.id)||!league.participantIds.every(id=>!!w.organisations[id])||
    !obj(season)||!integer(season.year))return false;
 if(org.playerIds.length!==5||org.creatorIds.length<1||
    !Array.isArray(org.weeklyRecords)||!Array.isArray(org.results)||
    !Array.isArray(org.products)||org.products.length<1||
    !Array.isArray(org.staff)||!Array.isArray(org.sponsors)||
    !Array.isArray(org.pitches)||!Array.isArray(org.industry)||!obj(org.scheduled))return false;
 for(const [id,t] of Object.entries(w.talents)){
  if(!obj(t)||t.talentId!==id||typeof t.id!=='string'||!integer(t.wage)||!integer(t.contract)||
     !['player','creator'].includes(t.kind))return false;
 }
 if(!org.products.every(p=>obj(p)&&typeof p.id==='string'&&
    integer(p.stock)&&p.stock>=0&&integer(p.sold)&&p.sold>=0&&
    integer(p.producing)&&p.producing>=0&&integer(p.price)&&integer(p.cost)))return false;
 if(!org.weeklyRecords.every(r=>obj(r)&&integer(r.week)&&integer(r.revenue)&&integer(r.expenses)&&integer(r.net)))return false;
 if(org.lastReport!==null&&org.lastReport!==undefined&&!obj(org.lastReport))return false;
 return true;
}
export function advanceSeason(world){
 const c=world.calendar,seasonId=makeId(world,'season',String(c.season));
 if(!world.seasons[seasonId])world.seasons[seasonId]={
  id:seasonId,number:c.season,year:c.year,leagueIds:Object.keys(world.leagues),status:'active',weeksPerYear:52};
 for(const season of Object.values(world.seasons)){
  if(season.id!==seasonId&&season.status==='active')season.status='complete';
 }
 for(const league of Object.values(world.leagues))league.seasonId=seasonId;
}
