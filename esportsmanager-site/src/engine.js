// Esports Empire — deterministic, self-contained starter simulation.
// Financial values are stored in integer pence. Fictional organisations and people.
export const GAME_KEY = 'esports-empire-save-v1';
export const VERSION = 1;
export const ROLES = ['IGL','Entry','Rifler','Flex','Support'];
export const TACTICS = ['Aggressive','Balanced','Defensive'];
export const ACTIVITIES = ['Ranked livestream','Community event','Creator collaboration','Sponsored feature','Rest week'];
export const PRODUCT_NAMES = ['Core Jersey','Creator Hoodie','Signature Cap'];
export const rivalsSeed = [
  ['Vertex Esports',71,'#ec526d','Aggressive'],
  ['Nova Union',64,'#5e9bff','Balanced'],
  ['Orion Circuit',67,'#ffaf68','Defensive'],
  ['Titan Core',73,'#9b8aff','Aggressive'],
  ['Meridian Gaming',61,'#38c5b4','Balanced'],
  ['Pulse Five',65,'#db79e4','Defensive'],
  ['Nightfall Club',69,'#788aff','Balanced']
];
const round=(n)=>Math.round(n);
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const cash=(pounds)=>round(pounds*100);
export const pound=(pence)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format((pence||0)/100);
export const count=(n)=>new Intl.NumberFormat('en-GB').format(round(n||0));
export const pct=(n)=>round(n)+'%';
const roll=(s)=>{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;};
const choose=(s,a)=>a[Math.floor(roll(s)*a.length)];
const person=(name,role,skill,wage,index)=>({id:'p'+index,name,role,skill,potential:clamp(skill+round(6+index%5),1,96),form:67+index%16,morale:72+index%12,fatigue:12,contract:25-index*2,wage:cash(wage),avatar:index});
const idea=(id,title,value,fit,description)=>({id,title,value:cash(value),fit,description,status:'Available'});
export function createGame(name='Apex Esports',tag='APX',colour='#9d55ed',showcase=false){
 const org=String(name||'Apex Esports').trim().slice(0,32);
 const s={version:VERSION,seed:20261106,org,tag:String(tag||'APX').toUpperCase().slice(0,5),colour,week:1,year:1,season:1,cash:cash(45000),fans:2500,prestige:12,trust:67,staffMood:79,decisions:4,
  ownerTitle:'Founder & CEO',tactic:'Balanced',training:'Teamwork',teamChemistry:66,teamWins:0,teamLosses:0,teamMapsWon:0,teamMapsLost:0,
  players:[person('Rexx','IGL',68,220,1),person('Kaze','Entry',70,230,2),person('Velo','Rifler',67,185,3),person('Nyx','Flex',64,160,4),person('Echo','Support',66,180,5)],
  prospects:[person('Blitz','Entry',74,340,6),person('Sera','Support',71,290,7),person('Voss','Rifler',76,400,8)],
  creators:[{id:'c1',name:'LunaX',role:'Streamer',audience:21000,engagement:7.4,mood:86,energy:78,fit:89,wage:cash(155),contract:24,avatar:9},
            {id:'c2',name:'MiraBits',role:'Influencer',audience:12500,engagement:8.2,mood:82,energy:83,fit:86,wage:cash(115),contract:20,avatar:10}],
  creatorCandidates:[{id:'c3',name:'NitroJay',role:'Streamer',audience:34000,engagement:6.8,mood:82,energy:79,fit:75,wage:cash(340),contract:28,avatar:11},
                    {id:'c4',name:'ApexVox',role:'Host',audience:17000,engagement:9.1,mood:88,energy:90,fit:92,wage:cash(210),contract:26,avatar:12}],
  scheduled:{c1:'Ranked livestream',c2:'Creator collaboration'},
  sponsors:[{id:'s1',name:'PixelForge',category:'Hardware',amount:cash(650),weeks:6,deliveries:0,target:2,relationship:72,logo:'PF',colour:'#52e19c',status:'Active'}],
  sponsorOffers:[idea('s2','NitroTech',920,76,'Requires two creator mentions per week.'),
                 idea('s3','Vertex Energy',1150,62,'Premium deal with three campaign deliveries weekly.'),
                 idea('s4','StreamForge',780,86,'Streaming software partnership with one integration weekly.')],
  products:[{id:'m1',name:'Core Jersey',price:cash(38),cost:cash(17),stock:110,sold:0,producing:0,arrival:0,category:'Apparel',symbol:'shirt',approved:true}],
  pitches:[],staff:[{name:'Sam Porter',role:'Head Coach',wage:cash(220),effect:3},{name:'Jordan Lane',role:'Operations Coordinator',wage:cash(180),effect:2}],
  facilities:1,officeRent:cash(280),weeklyRecords:[],results:[],industry:[],notifications:[],project:'Behind the scenes',contentBudget:cash(100),promo:0,
  league:rivalsSeed.map((r,i)=>({id:'r'+i,name:r[0],skill:r[1],colour:r[2],tactic:r[3],fans:2600+i*570,wins:0,losses:0,prestige:18+i*2})),
  lastReport:null,createdAt:new Date().toISOString(),mode:'Founder'
 };
 s.industry=[{week:1,text:'Welcome to the industry. Your organisation is ready to compete.',kind:'news'},{week:1,text:'Strikefront regional season begins — eight teams, twelve weeks.',kind:'event'}];
 if(showcase){
  s.mode='Showcase';s.week=5;s.cash=cash(2480000);s.fans=1260000;s.prestige=83;s.trust=91;s.staffMood=82;s.teamWins=3;s.teamLosses=1;s.teamChemistry=88;
  s.players.forEach((p,i)=>{p.skill=91-i;p.wage=cash(32000+i*2000);p.form=88-i;p.contract=45;});
  s.creators[0].audience=2800000;s.creators[1].audience=1200000;
  s.creators.push({...s.creatorCandidates[0],id:'c33',audience:1600000},{...s.creatorCandidates[1],id:'c44',audience:780000});
  s.sponsors=[{...s.sponsors[0],amount:cash(41000),weeks:45,target:3},{id:'s7',name:'NitroTech',category:'Technology',amount:cash(50000),weeks:56,deliveries:1,target:2,relationship:87,logo:'N',colour:'#59e19f',status:'Active'}];
  s.products.push({id:'m2',name:'Creator Hoodie',price:cash(79),cost:cash(29),stock:3700,sold:830,producing:0,arrival:0,category:'Apparel',symbol:'hoodie',approved:true},
                  {id:'m3',name:'Signature Cap',price:cash(34),cost:cash(12),stock:2100,sold:580,producing:0,arrival:0,category:'Accessories',symbol:'cap',approved:true});
  s.products[0].stock=3000;s.products[0].sold=1200;
  s.facilities=4;s.officeRent=cash(1800);
 }
 return s;
}
export function nextOpponent(s){if(s.week<=7)return s.league[(s.week-1)%7];if(s.week<=9)return s.league[(s.week-1)%7];return null;}
export function runway(s){const a=s.weeklyRecords.slice(-4);if(!a.length)return null;const net=a.reduce((x,r)=>x+r.net,0)/a.length;return net>=0?null:Math.max(0,round(s.cash/-net));}
export function brandValue(s){return cash(round((s.fans*.55)+(s.prestige*210)+(s.trust*130)+(s.facilities*5000)));}
export function recentTotal(s,key){return s.weeklyRecords.slice(-4).reduce((x,r)=>x+(r[key]||0),0);}
function note(s,text,kind='news'){s.industry.unshift({week:s.week,text,kind});s.industry=s.industry.slice(0,25);}
function spendDecision(s){if(s.decisions<=0)return 'No CEO decisions left this week. Advance the week to refresh them.';return null;}
function charge(s,n){if(s.cash<n)return 'Insufficient cash: you need '+pound(n)+'.';return null;}
function target(list,id){return list.find(a=>a.id===id);}
function safe(s){s.fans=Math.max(0,round(s.fans));s.cash=round(s.cash);s.prestige=clamp(s.prestige,0,100);s.trust=clamp(s.trust,0,100);s.staffMood=clamp(s.staffMood,0,100);}
export function perform(s,action,payload={}){
 let t,cost,err;
 switch(action){
 case 'tactic':
   if(!TACTICS.includes(payload.value))return {ok:false,message:'Choose a valid tactical setup.'};
   s.tactic=payload.value;return {ok:true,message:'Match tactic set to '+s.tactic+'.'};
 case 'training':
   if(!['Aim','Teamwork','Strategy','Rest'].includes(payload.value))return {ok:false,message:'Invalid training focus.'};
   s.training=payload.value;return {ok:true,message:'Training focus changed to '+s.training+'.'};
 case 'schedule':
   t=target(s.creators,payload.id);
   if(!t||!ACTIVITIES.includes(payload.value))return {ok:false,message:'Select a creator and a valid activity.'};
   s.scheduled[t.id]=payload.value;return {ok:true,message:t.name+' will run '+payload.value.toLowerCase()+' next week.'};
 case 'content':
   if(!['Behind the scenes','Player interview','Creator challenge','Tournament recap'].includes(payload.value))return {ok:false,message:'Choose a valid content project.'};
   s.project=payload.value;return {ok:true,message:'Content team scheduled: '+s.project+'.'};
 case 'pitch':
   t=target(s.sponsorOffers,payload.id);if(!t)return {ok:false,message:'Sponsor offer unavailable.'};
   if((err=spendDecision(s)))return {ok:false,message:err};
   if(s.sponsors.some(x=>x.name===t.title))return {ok:false,message:'Already an active partner.'};
   if((err=charge(s,cash(180))))return {ok:false,message:err};
   s.cash-=cash(180);s.decisions--;t.status='In negotiation';
   s.pitches.push({id:t.id,name:t.title,amount:t.value,fit:t.fit,target:t.title==='Vertex Energy'?3:2,resolve:s.week+1});
   s.sponsorOffers=s.sponsorOffers.filter(x=>x.id!==t.id);
   note(s,'A commercial proposal has been sent to '+t.title+'.','deal');
   return {ok:true,message:'Proposal sent to '+t.title+'. Result arrives next week.'};
 case 'reorder':
   t=target(s.products,payload.id);if(!t)return {ok:false,message:'Unknown merchandise item.'};
   if((err=spendDecision(s)))return {ok:false,message:err};
   if(t.producing)return {ok:false,message:'A manufacturing run is already underway.'};
   cost=t.cost*100;if((err=charge(s,cost)))return {ok:false,message:err};
   s.cash-=cost;s.decisions--;t.producing=100;t.arrival=s.week+2;
   note(s,t.name+': 100 units ordered from the manufacturer for '+pound(cost)+'.','merch');
   return {ok:true,message:'100 '+t.name+' units arrive after two weeks.'};
 case 'price':
   t=target(s.products,payload.id);if(!t)return {ok:false,message:'Product not found.'};
   cost=Number(payload.value);if(!Number.isFinite(cost)||cost<10||cost>250)return {ok:false,message:'Choose a price from £10 to £250.'};
   t.price=cash(cost);return {ok:true,message:t.name+' price changed to '+pound(t.price)+'.'};
 case 'createProduct':
   if(s.products.length>=5)return {ok:false,message:'Five product limit in this first build.'};
   if((err=spendDecision(s)))return {ok:false,message:err};
   cost=cash(1300);if((err=charge(s,cost)))return {ok:false,message:err};
   s.cash-=cost;s.decisions--;
   t=String(payload.value||'Creator Hoodie').slice(0,28);
   s.products.push({id:'m'+(s.products.length+1),name:t,price:cash(59),cost:cash(24),stock:50,sold:0,producing:0,arrival:0,category:'Apparel',symbol:'hoodie',approved:true});
   note(s,'New collection launched: '+t+'.','merch');
   return {ok:true,message:'Launched '+t+' with 50 units, for '+pound(cost)+'.'};
 case 'upgrade':
   if((err=spendDecision(s)))return {ok:false,message:err};
   if(s.facilities>=5)return {ok:false,message:'HQ already fully upgraded.'};
   cost=cash(s.facilities*2500);if((err=charge(s,cost)))return {ok:false,message:err};
   s.cash-=cost;s.decisions--;s.facilities++;s.officeRent+=cash(95);
   note(s,'Headquarters upgraded to level '+s.facilities+'.','hq');
   return {ok:true,message:'HQ now level '+s.facilities+'. Weekly rent rises by £95.'};
 case 'hire':
   if((err=spendDecision(s)))return {ok:false,message:err};
   if(s.staff.length>=6)return {ok:false,message:'Team has reached the staff limit.'};
   cost=cash(350);if((err=charge(s,cost)))return {ok:false,message:err};
   s.cash-=cost;s.decisions--;s.staff.push({name:choose(s,['Alex Morgan','Taylor Reed','Jamie Vale','Robin Drake']),role:String(payload.value||'Content Producer'),wage:cash(180),effect:3});
   note(s,'A new '+s.staff[s.staff.length-1].role+' has joined the organisation.','staff');
   return {ok:true,message:'New staff member hired. Weekly payroll +£180.'};
 case 'signCreator':
   if((err=spendDecision(s)))return {ok:false,message:err};
   t=target(s.creatorCandidates,payload.id);if(!t)return {ok:false,message:'Creator no longer available.'};
   cost=t.wage*3;if((err=charge(s,cost)))return {ok:false,message:err};
   s.cash-=cost;s.decisions--;s.creators.push({...t});s.creatorCandidates=s.creatorCandidates.filter(x=>x.id!==t.id);
   s.scheduled[t.id]='Ranked livestream';note(s,t.name+' joins the '+s.org+' creator roster.','creator');
   return {ok:true,message:'Signed '+t.name+' for '+pound(cost)+' upfront.'};
 case 'signPlayer':
   if((err=spendDecision(s)))return {ok:false,message:err};
   t=target(s.prospects,payload.id);if(!t)return {ok:false,message:'Prospect unavailable.'};
   c=target(s.players,payload.replace);
   if(!c)return {ok:false,message:'Select a player to replace.'};
   cost=t.wage*4;if((err=charge(s,cost)))return {ok:false,message:err};
   s.cash-=cost;s.decisions--;
   s.players=s.players.map(x=>x.id===c.id?{...t,role:c.role}:x);
   s.prospects=s.prospects.filter(x=>x.id!==t.id);s.prospects.push({...c,contract:10});
   s.teamChemistry=clamp(s.teamChemistry-12,10,100);
   note(s,t.name+' signs for '+s.org+'; '+c.name+' joins the free-agent market.','transfer');
   return {ok:true,message:'Signed '+t.name+'. Chemistry takes a temporary hit.'};
 case 'renew':
   if((err=spendDecision(s)))return {ok:false,message:err};
   t=target(s.players,payload.id)||target(s.creators,payload.id);
   if(!t)return {ok:false,message:'Contract not found.'};
   cost=t.wage*2;if((err=charge(s,cost)))return {ok:false,message:err};
   s.cash-=cost;s.decisions--;t.contract+=24;t.wage=round(t.wage*1.07);
   note(s,'Contract extended for '+t.name+'; salary increased by 7%.','contract');
   return {ok:true,message:t.name+' has renewed for 24 weeks.'};
 case 'promo':
   if((err=spendDecision(s)))return {ok:false,message:err};
   cost=cash(400);if((err=charge(s,cost)))return {ok:false,message:err};
   s.cash-=cost;s.decisions++; // campaigns are a free-form option costing money, not a CEO point
   s.decisions--;
   s.promo+=1;return {ok:true,message:'£400 marketing campaign booked for the next weekly report.'};
 default:return {ok:false,message:'Unknown action.'};
 }
}
function simulateMatch(s){
 const rival=nextOpponent(s);if(!rival)return null;
 const base=s.players.reduce((a,p)=>a+p.skill+p.form*.1-p.fatigue*.13,0)/s.players.length;
 const coach=s.staff.some(x=>x.role==='Head Coach')?3:0;
 const synergy=s.teamChemistry*.065;
 const tacticBonus=(s.tactic==='Aggressive'&&rival.tactic==='Defensive')||(s.tactic==='Defensive'&&rival.tactic==='Balanced')||(s.tactic==='Balanced'&&rival.tactic==='Aggressive')?5:-1;
 const p=clamp(1/(1+Math.exp(-(base+coach+synergy+tacticBonus-rival.skill)/14)),.13,.87);
 let ours=0,theirs=0;while(ours<2&&theirs<2){if(roll(s)<p)ours++;else theirs++;}
 const won=ours>theirs;if(won){s.teamWins++;s.prestige=clamp(s.prestige+2,0,100);s.teamChemistry=clamp(s.teamChemistry+1,0,100);}else{s.teamLosses++;s.prestige=clamp(s.prestige-1,0,100);}
 s.teamMapsWon+=ours;s.teamMapsLost+=theirs;
 s.players.forEach(x=>{x.form=clamp(round(x.form+(won?2:-2)+(roll(s)-.5)*5),42,99);x.fatigue=clamp(x.fatigue+5,0,95);x.morale=clamp(x.morale+(won?3:-4),20,100);});
 const prize=won?cash(380):cash(80);
 s.results.unshift({week:s.week,opponent:rival.name,score:ours+'–'+theirs,won,chance:round(p*100),prize,summary:won?'Confident series win':'Hard-fought series loss'});
 rival.wins+=won?0:1;rival.losses+=won?1:0;
 note(s,s.org+' '+(won?'defeated ':'fell to ')+rival.name+' ('+ours+'–'+theirs+').','match');
 return {won,opponent:rival.name,score:ours+'–'+theirs,prize,chance:round(p*100)};
}
export function advanceWeek(s){
 if(!s||s.version!==VERSION)throw new Error('Invalid save version');
 if(s.week>=52){s.year++;s.week=1;s.season++;}
 const completedWeek=s.week;
 const match=simulateMatch(s);
 let revenue=match?match.prize:0,expenses=0,fanGain=0,merchRevenue=0,creatorRevenue=0,sponsorRevenue=0,contentViews=0;
 const details=[];
 // Sponsorships pay per week and depend on creator activity delivering contracted integrations.
 for(const sponsor of s.sponsors){
  const activity=Object.values(s.scheduled).filter(x=>x!=='Rest week').length;
  const delivered=Math.min(sponsor.target,activity+(s.project==='Creator challenge'?1:0));
  sponsor.deliveries=delivered;
  const percentage=delivered/sponsor.target;
  const amount=round(sponsor.amount*(percentage>=1?1:.58));
  revenue+=amount;sponsorRevenue+=amount;sponsor.weeks--;
  sponsor.relationship=clamp(sponsor.relationship+(percentage===1?2:-5),10,100);
  if(percentage<1){s.trust-=2;details.push(sponsor.name+': missed campaign deliverables.');}
 }
 s.sponsors=s.sponsors.filter(x=>{if(x.weeks>0)return true;note(s,x.name+' sponsorship expired. Renewing commercial relationships may help cash flow.','contract');return false;});
 // Creator growth and direct income scale with actual scheduled programming.
 for(const creator of s.creators){
  const activity=s.scheduled[creator.id]||'Rest week';
  const effort={'Ranked livestream':1,'Community event':1.1,'Creator collaboration':1.3,'Sponsored feature':.85,'Rest week':0}[activity]||0;
  const wellness=clamp((creator.energy+creator.mood)/180,.3,1.05);
  const views=round(creator.audience*(.55+roll(s)*.45)*effort*wellness);
  contentViews+=views;
  const added=round(views*.012*creator.engagement/8.5);
  fanGain+=added;
  const earnings=round(views*.014);revenue+=earnings;creatorRevenue+=earnings;
  creator.audience+=round(views*.015);
  creator.energy=clamp(creator.energy+(effort===0?20:-round(10*effort)),10,100);
  creator.mood=clamp(creator.mood+(effort===0?3:-round(3*effort))+(match?.won?1:0),20,100);
  creator.contract--;
  expenses+=creator.wage;
 }
 // Organisation-owned content is distinct from the creator division.
 const projectBoost={'Behind the scenes':1.0,'Player interview':1.25,'Creator challenge':1.6,'Tournament recap':match?1.5:.65}[s.project]||1;
 const productionStaff=s.staff.some(x=>x.role==='Content Producer');
 const orgViews=round((s.fans*1.2+600)*(productionStaff?1.2:1)*projectBoost*(.75+roll(s)*.5));
 contentViews+=orgViews;fanGain+=round(orgViews*.035);revenue+=round(orgViews*2.5);creatorRevenue+=round(orgViews*2.5);
 expenses+=s.contentBudget;
 // Fans respond to both competition and content, but with a retention cost.
 if(match)fanGain+=match.won?round(120+s.prestige*3):round(15+s.prestige*.5);
 fanGain+=s.promo*round(65+roll(s)*60);
 const churn=round(s.fans*.002);
 fanGain=Math.max(-s.fans,fanGain-churn);
 s.fans=Math.max(0,s.fans+fanGain);
 s.promo=0;
 // Product stock, sales and cost of goods. Inventory manufacturing was prepaid.
 for(const product of s.products){
  if(product.producing&&product.arrival<=s.week){product.stock+=product.producing;product.producing=0;product.arrival=0;note(s,product.name+' manufacturing shipment received.','merch');}
  const demand=round((s.fans/110+.5*s.prestige)*(product.price>cash(75)?.5:product.price<cash(30)?1.25:1)*(.68+roll(s)*.6)/s.products.length);
  const sold=Math.max(0,Math.min(product.stock,demand));
  product.stock-=sold;product.sold+=sold;
  revenue+=sold*product.price;merchRevenue+=sold*product.price;
  // Costs of opening inventory were already paid; COGS is recognised for accounting only.
  if(product.stock<20)details.push(product.name+' is low on stock.');
 }
 // Payroll and rent.
 expenses+=s.players.reduce((a,p)=>a+p.wage,0)+s.staff.reduce((a,p)=>a+p.wage,0)+s.officeRent;
 s.players.forEach(p=>{p.contract--;p.fatigue=clamp(p.fatigue+(s.training==='Rest'?-16:s.training==='Aim'?5:2),0,100);p.skill=clamp(p.skill+(s.training==='Rest'?0:roll(s)>.84?1:0),1,99);});
 s.staffMood=clamp(round(s.staffMood+(match?.won?1:match?-2:0)+(s.cash>cash(12000)?1:-2)),20,100);
 s.teamChemistry=clamp(s.teamChemistry+(s.training==='Teamwork'?3:s.training==='Rest'?1:0),0,100);
 // Sponsor negotiations resolve on a future week; each has an actual chance of success.
 for(const pitch of s.pitches.filter(x=>x.resolve<=s.week)){
   const success=roll(s)<clamp(.27+pitch.fit/200+s.trust/300,.2,.9);
   if(success){s.sponsors.push({id:pitch.id,name:pitch.name,category:'Commercial',amount:pitch.amount,weeks:12,deliveries:0,target:pitch.target,relationship:70,logo:pitch.name.slice(0,2).toUpperCase(),colour:'#aa7ff2',status:'Active'});note(s,pitch.name+' accepted your sponsorship proposal.','deal');}
   else note(s,pitch.name+' declined the current sponsorship offer.','deal');
 }
 s.pitches=s.pitches.filter(x=>x.resolve>s.week);
 for(const rival of s.league){rival.skill=clamp(rival.skill+(roll(s)>.88?1:0),50,94);rival.fans=round(rival.fans*(1.002+roll(s)*.006));if(roll(s)<.18)note(s,rival.name+' announced a new roster or commercial signing.','rival');}
 const net=revenue-expenses;s.cash+=net;
 safe(s);
 const report={week:completedWeek,year:s.year,match,revenue,expenses,net,fanGain,merchRevenue,creatorRevenue,sponsorRevenue,contentViews,details,cash:s.cash};
 s.weeklyRecords.push(report);s.lastReport=report;s.decisions=4;s.week++;
 if(completedWeek===12){note(s,'Season complete! Review your organisation and continue into the next calendar.','event');}
 if(s.cash<0)note(s,'Critical cash warning: the organisation must restore solvency.','alert');
 return report;
}
export function validateSave(o){return !!o&&o.version===VERSION&&Array.isArray(o.players)&&Array.isArray(o.creators)&&Array.isArray(o.weeklyRecords)&&Number.isInteger(o.cash);}
