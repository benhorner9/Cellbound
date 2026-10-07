const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

assert(!fs.existsSync(path.join(root,'assets/characters/forge-bases')),'obsolete raster forge-base directory must not remain in source');
assert(!fs.existsSync(path.join(root,'assets/blackout-station/rooms/reactor-core.webp')),'retired Blackout reactor art must not remain in source');

const forge=read('character-forge-v1.js');
const rig=read('character-rig-v1.js');
assert(!forge.includes('forge-bases'),'Character Forge must not fall back to multi-megabyte raster base models');
assert(!rig.includes('forge-bases'),'Character rig must not retain obsolete raster base-model metadata');

const build=read('build.js');
for(const hook of ['UI_BUNDLE_SOURCES','cellbound-ui-bundle-v1.css','stylesheet request budget','Obsolete raster forge base returned'])assert(build.includes(hook),'Block 4 build optimisation is missing '+hook);

const accessibility=read('src/ui/accessibility-polish-v1.css');
for(const hook of [':focus-visible','pointer:coarse','prefers-reduced-motion','scrollbar-gutter:stable','touch-action:pan-y'])assert(accessibility.includes(hook),'Accessibility polish is missing '+hook);

const builtGuild=read('dist/guild.html');
const sourceGuild=read('guild.html');
const builtStyles=(builtGuild.match(/<link[^>]+rel=["']stylesheet["']/g)||[]).length;
const sourceStyles=(sourceGuild.match(/<link[^>]+rel=["']stylesheet["']/g)||[]).length;
assert(builtGuild.includes('cellbound-ui-bundle-v1.css'),'built game must load the consolidated late UI bundle');
assert(sourceStyles-builtStyles>=15,'UI bundle should remove at least 15 stylesheet requests from the deployed shell');
assert(builtStyles<=50,'deployed stylesheet request budget exceeded: '+builtStyles);
for(const file of ['readability-v1.css','ui-readability-v2.css','ui-polish-v3.css','game-shell-v1.css','cellbound-ui-art-v1.css','accessibility-polish-v1.css','layout-safety-v1.css']){
  assert(!builtGuild.includes('./'+file),'deployed shell still requests bundled stylesheet individually: '+file);
}
assert(fs.existsSync(path.join(root,'dist/cellbound-ui-bundle-v1.css')),'generated UI bundle is missing from dist');
assert(!fs.existsSync(path.join(root,'dist/assets/characters/forge-bases')),'obsolete forge PNGs must not ship');
assert(!fs.existsSync(path.join(root,'dist/assets/blackout-station/rooms/reactor-core.webp')),'retired Blackout art must not ship');

console.log('Block 4 performance contracts passed: obsolete raster bases removed and late UI CSS consolidated within the request budget.');
