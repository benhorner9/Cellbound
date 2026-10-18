'use strict';
/* Release-facing copy audit, deliberately restricted to player-visible text.
 * Never rewrite game identifiers, item rarity names or internal code.
 */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const website=fs.readFileSync(path.join(__dirname,'../website/index.html'),'utf8');
const login=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const guild=fs.readFileSync(path.join(__dirname,'../guild.html'),'utf8');
const faults=[];
const check=(condition,message)=>{if(!condition)faults.push(message)};
check(/<html lang="en(?:-GB)?">/.test(website),'Public website missing document language');
check(/<title>Cellbound[^<]+<\/title>/i.test(website),'Public website missing page title');
check(/name="description"\s+content="[^"]{70,180}"/.test(website),'Public site needs readable search description');
check(!/\b(lorem ipsum|coming soon|not playable publicly yet|gates stay shut|pretend launch date)\b/i.test(website),'Public website still contains holding-page copy');
check(!/\b(seamlessly|unleash|revolutionise|immersive experience|elevate your gaming|dive into|embark on an epic journey)\b/i.test(website),'Public website contains generic marketing filler');
check((website.match(/href="\.\/game\/"/g)||[]).length>=3,'Public website must link clearly to the game');
check(website.includes('Episode 1')&&/Episode 2[^<]*in development/.test(website),'Episodes must be described accurately');
check(website.includes('The Manor')&&website.includes('Null Complex'),'Public page must describe the complete first episode');
check(website.includes('Heroic')&&website.includes('Cellbound+'),'Public page should show existing repeat-play activities');
check(website.includes('id="play"')&&website.includes('id="dungeons"'),'Public page needs easy gameplay and dungeons navigation');
check(!website.includes('href="./guild.html"'),'Public website must link to /game/ and not embed a separate guild page');
check(!/PRE-ALPHA/i.test(login),'Game login still labels this release pre-alpha');
check(!/beta-facing/i.test(guild),'Game contains development-only build note copy');
check(!/journey awaits|unleash your|dive into an epic/i.test(login+guild),'Game entry contains formulaic promotional wording');
for(const [label,content] of [['website',website],['game-login',login],['game-guild',guild]]){
 const ids=[...content.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 const duplicates=ids.filter((id,i)=>ids.indexOf(id)!==i);
 check(duplicates.length===0,label+' has duplicate DOM IDs: '+[...new Set(duplicates)].join(', '));
}
if(faults.length){faults.forEach(x=>console.error('COPY AUDIT ERROR:',x));process.exit(1)}
console.log('Public copy PASS: direct Episode 1 description, accurate expansion status, clear game CTA, accessible page sections, no placeholder marketing, no duplicate IDs.');
