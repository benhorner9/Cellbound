'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),manifest=require('../tools/runtime-manifest.cjs');
const src=name=>fs.readFileSync(manifest.sourcePath(root,name),'utf8');
const ctx={window:{},Intl,Date,Math,Number,String,Set,Map,Error};
vm.createContext(ctx);
vm.runInContext(src('highscores-v1.js'),ctx);
const HS=ctx.window.CellboundHighScores;
assert.equal(HS.PROFESSIONS.length,10,'ten existing professions have separate rankings');
const scores=[
 {guild:'B Guild',character:'One',level:20,xp:400,profession:'Blacksmithing'},
 {guild:'A Guild',character:'Two',level:20,xp:700,profession:'Blacksmithing'},
 {guild:'A Guild',character:'Three',level:21,xp:0,profession:'Blacksmithing'},
 {guild:'B Guild',character:'Four',level:20,xp:700,profession:'Blacksmithing'}
];
const ranked=scores.sort(HS.compare);
assert.equal(ranked.map(x=>x.character).join(','),'Three,Two,Four,One','level > XP > guild/character name');
assert(HS.compare({level:100,xp:120},{level:100,xp:20})<0,'max skill rank still uses XP');
assert.equal(HS.normalize([{guild_name:'Guild',character_name:'One',profession:'Blacksmithing',level:23,xp:19}])[0].xp,19);
assert.equal(HS.normalize([{profession:'Fake',level:99,xp:9999}]).length,0,'unrecognised profession rejected');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20261011180000_cellbound_profession_highscores.sql'),'utf8');
assert(migration.includes('enable row level security'),'public leaderboard must use RLS');
assert(migration.includes('grant select (guild_name, character_name, profession, level, xp, updated_at)'),'client reads only safe public fields');
assert(!migration.includes('grant select on public.cellbound_profession_highscores'),'full table access forbidden');
assert(migration.includes('from public, anon, authenticated'),'revoke public default privileges');
assert(migration.includes('cellbound_internal.refresh_profession_highscores()'),'protected server-derived writes');
assert(migration.includes('old_scores = new_scores'),'unrelated game saves must not rewrite scores');
const guild=src('guild.html'),publicPage=src('highscores.html'),login=src('index.html');
assert(guild.includes('data-view="highscores"')&&guild.includes('id="guildHighScores"'));
assert(guild.includes('./highscores-v1.js?v=1')&&/\.\/highscores-v1\.css\?v=\d+/.test(guild),'guild must load the versioned High Scores stylesheet');
assert(publicPage.includes('id="publicHighScores"')&&publicPage.includes('./highscores-v1.js?v=1'));
assert(login.includes('./highscores.html'),'public rankings discoverable without login');
assert(manifest.files.includes('highscores.html')&&manifest.files.includes('highscores-v1.js'));
assert(src('guild-v4.js').includes("if(id==='highscores')window.CellboundHighScores?.mount?.('#guildHighScores')"));
assert(src('economy-v2.js').includes('retain earned XP so high-score ties remain meaningful'));
console.log('Profession High Scores contracts passed: level/XP ordering, public access, live projection and game/website links.');
