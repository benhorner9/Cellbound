(()=>{
'use strict';
/* One public, read-only High Scores client for the game and standalone website. */
const URL='https://jvydqeikdpelmtloulnd.supabase.co';
const KEY='sb_publishable_R79iqkCPo4hRgXNNzzTmAg_ODAiA1fl';
const PROFESSIONS=Object.freeze([
 ['Blacksmithing','⚒'],['Alchemy','⚗'],['Enchanting','✥'],['Leatherworking','◈'],
 ['Tailoring','✦'],['Jewelcrafting','◆'],['Engineering','⚙'],['Cooking','♨'],
 ['Reliccrafting','⟡'],['Scribing','✒']
]);
const allowed=new Set(PROFESSIONS.map(row=>row[0])),cache=new Map();
let api=null;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const number=n=>Math.max(0,Number(n)||0).toLocaleString('en-GB');
const createApi=()=>{
 if(api)return api;
 if(!window.supabase?.createClient)throw new Error('High Scores network library is unavailable');
 api=window.supabase.createClient(URL,KEY,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  global:{headers:{'x-client-info':'cellbound-public-highscores-v1'}}
 });
 return api;
};
const normalize=rows=>(Array.isArray(rows)?rows:[]).map(r=>({
 guild:String(r.guild_name||'Unnamed Guild').slice(0,48),
 character:String(r.character_name||'Artisan').slice(0,48),
 profession:String(r.profession||''),
 level:Math.min(100,Math.max(1,Math.floor(Number(r.level)||1))),
 xp:Math.max(0,Math.floor(Number(r.xp)||0)),
 updated:r.updated_at||null
})).filter(r=>allowed.has(r.profession));
function compare(a,b){
 return b.level-a.level||b.xp-a.xp||
  a.guild.localeCompare(b.guild,'en',{sensitivity:'base'})||
  a.character.localeCompare(b.character,'en',{sensitivity:'base'});
}
async function fetchScores(profession,force=false){
 if(!allowed.has(profession))throw new Error('Unrecognised profession');
 const hit=cache.get(profession);
 if(!force&&hit&&Date.now()-hit.at<30000)return hit.rows;
 const {data,error}=await createApi().from('cellbound_profession_highscores')
  .select('guild_name,character_name,profession,level,xp,updated_at')
  .eq('profession',profession)
  .order('level',{ascending:false})
  .order('xp',{ascending:false})
  .order('guild_name',{ascending:true})
  .order('character_name',{ascending:true})
  .limit(100);
 if(error)throw new Error('High Scores could not be loaded ('+(error.code||'network')+').');
 const rows=normalize(data).sort(compare);
 cache.set(profession,{at:Date.now(),rows});
 return rows;
}
function markup(){
 const options=PROFESSIONS.map(([name,icon])=>'<option value="'+name+'">'+icon+' '+name+'</option>').join('');
 return '<div class="hs-board" data-hs-board>'+
  '<div class="hs-masthead"><div class="hs-masthead-copy"><small>THE RECORDS OF ZELTIRA · FOUNDING SEASON</small><h2>High Scores</h2><p>Every guild has its champions. See which artisans have mastered their craft.</p></div><span class="hs-emblem" aria-hidden="true">✦</span></div>'+
  '<div class="hs-bar"><label for="hs-profession-'+Math.round(Math.random()*1e8)+'">PROFESSION <select data-hs-category>'+options+'</select></label><button type="button" data-hs-refresh>↻ REFRESH</button></div>'+
  '<div class="hs-rule"><span>RANKED BY <b>SKILL LEVEL</b>, THEN <b>XP</b></span><span data-hs-updated>LIVE GUILD RECORDS</span></div>'+
  '<div data-hs-state role="status" aria-live="polite"></div>'+
  '<div data-hs-results></div>'+
  '<footer class="hs-board-footer"><span>Top 100 artisans shown · Ties are ordered alphabetically after level and XP</span><span>More rankings coming later: PvP, dungeons and guild achievements</span></footer>'+
 '</div>';
}
function rowsHTML(rows,guildName){
 if(!rows.length)return '<div class="hs-empty"><span>◇</span><h3>Be the first to claim a place.</h3><p>No artisans have recorded progress in this profession yet.</p></div>';
 const top=rows.slice(0,3).map((r,i)=>{
  const self=guildName&&r.guild.toLocaleLowerCase()===guildName.toLocaleLowerCase();
  return '<article class="hs-podium-card hs-pos-'+(i+1)+(self?' hs-own':'')+'"><small>RANK '+String(i+1).padStart(2,'0')+'</small>'+
    '<div class="hs-podium-symbol" aria-hidden="true">'+(i===0?'♛':i===1?'◆':'◇')+'</div>'+
    '<h3>'+escape(r.character)+'</h3><p>'+escape(r.guild)+'</p>'+
    '<div class="hs-podium-score"><b>LVL '+r.level+'</b><span>'+number(r.xp)+' XP</span></div></article>';
 }).join('');
 const records=rows.map((r,i)=>{
  const self=guildName&&r.guild.toLocaleLowerCase()===guildName.toLocaleLowerCase();
  return '<tr'+(self?' class="hs-own"':'')+'><td class="hs-rank">#'+String(i+1).padStart(2,'0')+'</td>'+
   '<td><strong>'+escape(r.character)+'</strong></td><td>'+escape(r.guild)+'</td>'+
   '<td class="hs-level">'+r.level+'</td><td class="hs-xp">'+number(r.xp)+'</td></tr>';
 }).join('');
 return '<div class="hs-podium">'+top+'</div>'+
  '<div class="hs-table-wrap"><table class="hs-table"><thead><tr><th scope="col">RANK</th><th scope="col">ARTISAN</th><th scope="col">GUILD</th><th scope="col">LEVEL</th><th scope="col">XP</th></tr></thead><tbody>'+records+'</tbody></table></div>';
}
function mount(root,opts={}){
 if(typeof root==='string')root=document.querySelector(root);
 if(!root)return null;
 if(root.__cellboundHighScores)return root.__cellboundHighScores;
 root.innerHTML=markup();
 const category=root.querySelector('[data-hs-category]');
 const refresh=root.querySelector('[data-hs-refresh]');
 const state=root.querySelector('[data-hs-state]');
 const results=root.querySelector('[data-hs-results]');
 const updated=root.querySelector('[data-hs-updated]');
 const selectLabel=root.querySelector('.hs-bar label');
 category.id='hs-category-'+Math.random().toString(36).slice(2,8);
 selectLabel.htmlFor=category.id;
 let seq=0,selected=allowed.has(opts.initialProfession)?opts.initialProfession:'Blacksmithing';
 category.value=selected;
 const update=async(force=false)=>{
  const thisSeq=++seq;
  selected=category.value;state.textContent='Checking guild records…';
  state.className='hs-state hs-loading';refresh.disabled=true;
  try{
   const rows=await fetchScores(selected,force);
   if(seq!==thisSeq)return;
   const currentGuild=opts.guildName||window.CellboundGame?.getState?.()?.socialDisplayName||'';
   results.innerHTML=rowsHTML(rows,currentGuild);
   state.textContent=rows.length?rows.length+' ranked artisan'+(rows.length===1?'':'s'):'No entries yet';
   state.className='hs-state';
   updated.textContent='UPDATED '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  }catch(error){
   if(seq!==thisSeq)return;
   state.textContent=error.message||'Unable to load High Scores. Try refreshing.';
   state.className='hs-state hs-error';results.innerHTML='';
  }finally{if(seq===thisSeq)refresh.disabled=false}
 };
 category.addEventListener('change',()=>update());
 refresh.addEventListener('click',()=>update(true));
 const instance={refresh:()=>update(true),select:name=>{if(allowed.has(name)){category.value=name;return update()}},element:root};
 root.__cellboundHighScores=instance;update();
 return instance;
}
window.CellboundHighScores=Object.freeze({PROFESSIONS,compare,normalize,mount,fetchScores});
})();