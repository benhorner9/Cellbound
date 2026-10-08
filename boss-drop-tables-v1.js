(()=>{
'use strict';
/* Central owner-configured additional loot for existing dungeon bosses.
   Default dungeon/raid progression rewards remain managed by their original systems. */
const BOSSES=[
 ['ashen-vault:ashwarden','The Ashen Vault','Ash Warden Kael'],
 ['ashen-vault:embermaw','The Ashen Vault','Embermaw'],
 ['ashen-vault:vaultheart','The Ashen Vault','The Vaultheart'],
 ['hollow-sanctum:sentinel','The Hollow Sanctum','Glassjaw Sentinel'],
 ['hollow-sanctum:choir','The Hollow Sanctum','The Bound Choir'],
 ['chaos-canyon:sentinel','Chaos Canyon','The Canyon Sentinel'],
 ['chaos-canyon:warden','Chaos Canyon','The Chaos Warden'],
 ['chaos-canyon:vorran','Chaos Canyon','Archdruid Vorran'],
 ['blackout-station:vex-calder','Blackout Station','Dr. Vex Calder'],
 ['fractured-ages:high-noon','Fractured Ages','Deadeye Mercer'],
 ['fractured-ages:iron-kingdom','Fractured Ages','The Hollow Knight'],
 ['fractured-ages:first-kingdom','Fractured Ages','Amun-Rael'],
 ['fractured-ages:silent-frontier','Fractured Ages','Commander Veyra'],
 ['fractured-ages:funhouse','Fractured Ages','The Old Man — Keeper of Ages'],
 ['manor:butler','The Manor','The Butler'],
 ['manor:maids','The Manor','The Maid'],
 ['manor:engineer','The Manor','The Engineer'],
 ['manor:housebound','The Manor','The Master of the Manor']
].map(([key,dungeon,boss])=>({key,dungeon,boss,raid:key.startsWith('manor:')}));
const DEFAULT_REWARDS={
 'ashen-vault:ashwarden':'Base dungeon: personal equipment chance (Normal 20%, Heroic 25%, CB+ 30%) and Warden reagents.',
 'ashen-vault:embermaw':'Base dungeon: personal equipment chance (Normal 25%, Heroic 35%, CB+ 40%) and Embermaw reagents.',
 'ashen-vault:vaultheart':'Base dungeon: personal equipment chance (Normal 50%, Heroic 60%, CB+ 70%), profession reagents and a guaranteed completion cache that tops up the run to two gear items.',
 'hollow-sanctum:sentinel':'Base dungeon: boss encounter. The original Hollow Sanctum equipment and crafting rewards are issued at the final clear.',
 'hollow-sanctum:choir':'Base dungeon: final-clear gear bundle and crafting rewards, including its original first-clear relic.',
 'chaos-canyon:sentinel':'Base dungeon: boss encounter. Original equipment and crafting rewards are secured on final dungeon completion.',
 'chaos-canyon:warden':'Base dungeon: boss encounter. Original equipment and crafting rewards are secured on final dungeon completion.',
 'chaos-canyon:vorran':'Base dungeon: final-clear equipment bundle, crafting materials and Cell Shards.',
 'blackout-station:vex-calder':'Base dungeon: final-clear equipment bundle, crafting materials, Cell Shards and a separate 10% chance of a Grid Override Module.',
 'fractured-ages:funhouse':'Base dungeon: final-clear equipment bundle and crafting materials.',
 'manor:housebound':'Base raid: two Tier 5 items per player on eligible complete claim; these remain protected by the raid server.',
};
function defaultLoot(b){
 return DEFAULT_REWARDS[b.key]||(b.raid?'Base raid: Manor rewards are managed by the protected multiplayer raid claim system.':'Base dungeon: original clear-cache equipment and profession rewards are granted on completion.');
}
const keys=new Set(BOSSES.map(b=>b.key)),tables=new Map();let pending=null,lastLoaded=0;
const Game=()=>window.CellboundGame;
const db=()=>Game()?.getSupabase?.();
const isOwner=()=>Boolean(window.CellboundAdmin?.isAdmin)&&window.CellboundAdmin?.role==='owner';
const clean=drops=>(Array.isArray(drops)?drops:[]).slice(0,6).map(d=>({
 kind:d?.kind==='material'?'material':'gear',
 key:String(d?.key||'').slice(0,100),
 chance:Math.max(1,Math.min(100,Math.round(Number(d?.chance)||25))),
 quantity:d?.kind==='material'?Math.max(1,Math.min(5,Math.round(Number(d?.quantity)||1))):1
}));
async function refresh(force=false){
 if(pending)return pending;
 if(!db())return false;
 if(!force&&Date.now()-lastLoaded<30000)return true;
 pending=(async()=>{
  const {data,error}=await db().from('cellbound_boss_drop_tables').select('boss_key,drops').order('boss_key');
  if(error)throw error;
  tables.clear();for(const row of data||[]){if(keys.has(row.boss_key))tables.set(row.boss_key,clean(row.drops))}
  lastLoaded=Date.now();return true
 })().finally(()=>{pending=null});
 try{return await pending}catch(e){console.warn('Boss drop tables unavailable',e);return false}
}
function get(key){return (tables.get(key)||[]).map(x=>({...x}))}
async function save(key,drops){
 if(!isOwner()||!keys.has(key))throw Error('Only the owner may edit registered boss drop tables.');
 if(!db())throw Error('Boss drop database unavailable.');
 const checked=window.CellboundDesignedContent?.cleanBlueprint?.({steps:[{type:'fight',drops}]}).steps[0]?.drops||[];
 if(checked.length!==drops.length)throw Error('Choose eligible items and reagents.');
 const gear=checked.filter(x=>x.kind==='gear');
 if(gear.length>2||gear.reduce((n,x)=>n+x.chance,0)>100)throw Error('Two equipment entries maximum; equipment chances must total 100% or less.');
 if(checked.some(x=>x.chance<1||x.chance>100))throw Error('Drop percentages must be 1–100%.');
 const {data:{user},error:authError}=await db().auth.getUser();
 if(authError||!user?.id)throw Error('Please sign in as the Cellbound owner.');
 const {error}=await db().from('cellbound_boss_drop_tables').upsert({boss_key:key,drops:checked,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:'boss_key'});
 if(error)throw error;
 tables.set(key,clean(checked));lastLoaded=Date.now();
 return checked
}
async function award(key,attemptId,source,options={}){
 if(!keys.has(key)||key.startsWith('manor:')||options.preview||!attemptId||!Game()?.ready)return[];
 await refresh();
 const drops=get(key);
 if(!drops.length)return[];
 const state=Game().getState?.();
 if(!state)return[];
 const claimKey=String(attemptId)+':'+key;
 state.bossBonusDropClaims=state.bossBonusDropClaims&&typeof state.bossBonusDropClaims==='object'?state.bossBonusDropClaims:{};
 if(state.bossBonusDropClaims[claimKey])return[];
 // Persist the claim with the awarded inventory in the same guild game-state snapshot.
 state.bossBonusDropClaims[claimKey]=Date.now();
 const entries=Object.entries(state.bossBonusDropClaims).sort((a,b)=>Number(b[1])-Number(a[1]));
 if(entries.length>300)state.bossBonusDropClaims=Object.fromEntries(entries.slice(0,300));
 const R=window.CellboundDesignedContent,G=window.CellboundGear,P=window.CellboundProfessions;
 const won=R?.rollBossLoot?.({drops})||[],earned=[];
 for(const d of won){
  if(d.kind==='gear'){
   const base=G?.byId?.(d.key);
   if(!base?.dropEnabled||!base?.enabled||base.raidExclusive||base.tier>2)continue;
   const item=G.rollItemAffixes({...base,source:source||key});
   Game().addBankItem(item);earned.push({kind:'gear',name:item.name,quantity:1})
  }else{
   const meta=P?.MATERIALS?.[d.key];if(!meta||meta.endgame)continue;
   Game().addMaterial(d.key,d.quantity);earned.push({kind:'material',name:meta.name,quantity:d.quantity})
  }
 }
 if(earned.length){state.activity=Array.isArray(state.activity)?state.activity:[];state.activity.push((source||key)+' bonus loot: '+earned.map(x=>x.name+' ×'+x.quantity).join(', ')+'.')}
 Game().save?.();await Game().persistState?.();
 return earned
}
window.CellboundBossDropTables={bosses:()=>BOSSES.map(b=>({...b,baseRewards:defaultLoot(b)})),refresh,get,save,award,clean};
})();