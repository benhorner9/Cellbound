// Immersive Refuge journey, pure selectors. This layer never mutates a save.
export const UX_VENUES=Object.freeze({
 party:{chapter:'THE WAR ROOM',tone:'Command',verb:'Ready the formation',
  hint:'Set your front line before a dangerous expedition.',actions:[['heroes','Equip heroes'],['talents','Review talents'],['war-table','Choose a hunt']]},
 heroes:{chapter:'HALL OF HEROES',tone:'Legacy',verb:'Shape your champions',
  hint:'Every piece of equipment affects how a hero performs on the next fight.',actions:[['pack','Open equipment bag'],['talents','Develop talents'],['war-table','Try your party']]},
 talents:{chapter:'THE TALENT SANCTUM',tone:'Mastery',verb:'Choose your path',
  hint:'Your choices are permanent until a deliberate respec. Inspect each talent before spending.',actions:[['heroes','Review equipment'],['party','Arrange formation'],['war-table','Test your builds']]},
 pack:{chapter:'THE STOREHOUSE',tone:'Possessions',verb:'Find the right gear',
  hint:'Select a hero, inspect a piece and equip it. Worn items live on the hero, not in the bag.',actions:[['heroes','Inspect equipped gear'],['craft','Forge more gear'],['salvage','Recycle spare loot']]},
 craft:{chapter:'THE FORGE & APOTHECARY',tone:'Craftsmanship',verb:'Turn spoils into power',
  hint:'Every recipe needs actual gathered materials. Smithing uses the timed strike; Alchemy uses correct mixing.',actions:[['skills','See profession levels'],['pack','View crafted equipment'],['war-table','Gather materials']]},
 skills:{chapter:'THE GUILD HALL',tone:'Progression',verb:'Master your disciplines',
  hint:'Skills belong to your entire company. Unlock materials, recipes and stronger field tools.',actions:[['craft','Use your skills'],['slayer','Find a bounty'],['war-table','Train in battle']]},
 slayer:{chapter:'THE BOUNTY HUNTERS GUILD',tone:'Contracts',verb:'Make your name known',
  hint:'Take a single quarry, finish its special challenge and claim the contract reward.',actions:[['war-table','Choose a target'],['heroes','Prepare your fighters'],['skills','See Bounty Hunting']]},
 salvage:{chapter:'THE SALVAGING STATION',tone:'Recovery',verb:'Reclaim what remains',
  hint:'Inspect returns before dismantling. Save-protected equipment cannot be destroyed.',actions:[['pack','Inspect your bag'],['craft','Use recovered ore'],['heroes','Inspect your builds']]},
 enchant:{chapter:'THE ENCHANTING FORGE',tone:'Runes',verb:'Awaken old equipment',
  hint:'Permanent item enchantments affect real combat. Every inscription uses resources and a confirmation.',actions:[['pack','Choose an item'],['craft','Gather reagents'],['war-table','Test enchantments']]},
 delving:{chapter:'THE DELVING GATE',tone:'Depths',verb:'Push beyond the gate',
  hint:'Your expedition progress survives a return to town. Review each stage before continuing.',actions:[['party','Set your formation'],['heroes','Prepare gear'],['war-table','Visit War Table']]},
 shop:{chapter:'THE QUARTERMASTER',tone:'Supply',verb:'Provision the company',
  hint:'Shop offers are fixed. Use the Storehouse to equip purchases, and save your best gear for difficult fights.',actions:[['pack','Equip purchases'],['heroes','Compare your gear'],['war-table','Earn more gold']]},
 loot:{chapter:'THE BOSS LEDGER',tone:'Discovery',verb:'Know what you hunt',
  hint:'Read the real boss drop tables, then take a farming loadout to the encounter.',actions:[['war-table','Plan a boss run'],['craft','View craftable gear'],['pack','Review your loot']]},
 backup:{chapter:'THE SAVE ARCHIVE',tone:'Safekeeping',verb:'Protect your legend',
  hint:'This prototype stores progress on your current device. A backup lets you restore your company later.',actions:[['heroes','Return to your heroes'],['skills','Check your progress'],['war-table','Visit War Table']]}
});
export const UX_TAB_KEYS=Object.freeze(Object.keys(UX_VENUES));
function number(v){return Number.isFinite(v)?Math.max(0,Math.floor(v)):0;}
export function venueSummary(tab,p){
 const itemCount=number(p?.items?.length),wins=number(p?.wins),
       skills=p?.skills||{},heroes=p?.heroes||{},materials=p?.materials||{};
 const equipped=Object.values(heroes).reduce((n,h)=>n+Object.values(h?.gear||{}).filter(Boolean).length,0);
 const unused=Math.max(0,itemCount-equipped);
 const skillLevel=id=>number(skills[id]?.level||1);
 const active=p?.slayer?.active,progress=active?number(active.kills)+' / '+number(active.target)+' completed':'No active contract';
 const salvageable=Math.max(0,unused);
 const pending=(p?.gathering?.sites||[]).filter(s=>Array.isArray(s.nodes)&&s.nodes.some(n=>!n.harvested)).length;
 const stock=Object.values(materials).filter(n=>Number.isSafeInteger(n)&&n>0).length;
 const descriptions={
  party:[Object.keys(heroes).length+' heroes in the company','Formations apply at the next encounter'],
  heroes:[equipped+' equipped items','Change equipment without making copies'],
  talents:[Object.values(heroes).reduce((n,h)=>n+number(h?.talents?.length),0)+' chosen talents','Inspect the next unlock'],
  pack:[unused+' items in the bag',equipped+' worn by heroes'],
  craft:[stock+' types of materials in storage','Crafting consumes actual reagents'],
  skills:[skillLevel('mining')+' Mining · '+skillLevel('woodcutting')+' Woodcutting','Shared by all four heroes'],
  slayer:[progress,'Claim at the Bounty Board'],
  salvage:[salvageable+' items available to inspect','Read the exact returns before confirming'],
  enchant:[itemCount+' owned items','Permanent runes stay attached to each item'],
  delving:[p?.delving?.active?'Route in progress':'No active delve','Progress persists between stages'],
  shop:[number(p?.gold)+' gold available','Every purchase is a real item'],
  loot:[wins+' victories recorded','Review drop rates before you travel'],
  backup:[wins+' victories saved locally','Export a backup before clearing browser data']
 };
 return {meta:UX_VENUES[tab]||UX_VENUES.party,stat:descriptions[tab]?.[0]||'',substat:descriptions[tab]?.[1]||'',pending};
}
export function refugeJourney(p){
 const wins=number(p?.wins),items=number(p?.items?.length),gold=number(p?.gold);
 const skillLevel=id=>number(p?.skills?.[id]?.level||1);
 const contract=p?.slayer?.active;
 const sites=(p?.gathering?.sites||[]).filter(s=>Array.isArray(s.nodes)&&s.nodes.some(n=>!n.harvested)).length;
 const equipped=Object.values(p?.heroes||{}).reduce((n,h)=>n+Object.values(h?.gear||{}).filter(Boolean).length,0);
 return [
  {id:'hunt',number:'01',kind:'ADVENTURE',icon:'⚔',title:wins?'Choose your next quarry':'Your first expedition',
   detail:wins?wins+' victories · earn more XP, equipment and discoveries':'Build your four-hero party and defeat a boss to begin your legacy',
   action:'expeditions',label:'Open War Table'},
  {id:'gather',number:'02',kind:'FIELDWORK',icon:'⛏',title:sites?sites+' cleared sites await you':'Gather after the fight',
   detail:sites?'Return to a conquered arena and collect remaining resources':'Mining '+skillLevel('mining')+' · Woodcutting '+skillLevel('woodcutting')+' · discover resources after victory',
   action:sites?'expeditions':'skills',label:sites?'Resume gathering':'Explore skills'},
  {id:'forge',number:'03',kind:'MASTERY',icon:'⚒',title:'Put your spoils to work',
   detail:items+' owned items · '+equipped+' equipped · '+gold+' gold in the treasury',
   action:'craft',label:'Visit the Forge'},
  {id:'contracts',number:'04',kind:'REPUTATION',icon:'🎯',title:contract?'A bounty is active':'Earn your first bounty',
   detail:contract?number(contract.kills)+' of '+number(contract.target)+' victories toward your contract':'Take on distinct hunting challenges and earn Bounty Marks',
   action:'slayer',label:'Open Bounty Board'}
 ];
}
