'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const art='assets/blackout-station/rooms/grid-distribution-board.svg';
const svg=fs.readFileSync(path.join(root,art),'utf8');
const game=fs.readFileSync(path.join(root,'src/dungeons/blackout-station-v1.js'),'utf8');
const build=fs.readFileSync(path.join(root,'build.js'),'utf8');
const css=fs.readFileSync(path.join(root,'src/dungeons/blackout-station-v1.css'),'utf8');
assert(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'),'Blackout grid artwork must be a valid SVG');
assert(svg.includes('viewBox="0 0 1600 900"'),'Blackout grid illustration must be 16:9');
assert(!/<text(?:\s|>)/i.test(svg),'No captions, UI or labels baked into artwork');
const layers=[...svg.matchAll(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/g)];
assert.equal(layers.length,2,'Grid control room must retain both painted-source layers');
for(const [,data] of layers){
 const bytes=Buffer.from(data.slice(0,48),'base64');
 assert.equal(bytes.toString('ascii',0,4),'RIFF','Invalid embedded image header');
 assert.equal(bytes.toString('ascii',8,12),'WEBP','Invalid embedded WebP');
}
assert(game.includes("blackoutRoomArt('grid','./"+art+"')"),'Grid puzzle must render its own room art');
assert(game.includes("window.CellboundRoomLayouts?.artFor?.('blackout-station',id,fallback)"),'Approved owner room artwork must take priority');
assert(game.includes("BLACKOUT_REACTOR_SCENE='./assets/blackout-station/rooms/vex-calder-room.avif?v=1'"),'Keep the authored boss reactor artwork unchanged');
assert(build.includes("'"+art+"'"),'Production build must ship grid art');
assert(css.includes('.bs-puzzle-shell>.bs-puzzle-room-art{'),'Grid artwork needs a dedicated decorative container');
assert(css.includes('position:absolute;')&&css.includes('pointer-events:none;'),'Grid art must not displace puzzle controls or intercept touch');
assert(css.includes('.bs-puzzle-shell>.bs-puzzle-room-art img{')&&css.includes('object-fit:cover;'),'Grid art must fill its scene without stretching');
assert(css.includes('.bs-puzzle-shell>header,.bs-puzzle-shell>.bs-puzzle-layout{z-index:2}'),'Grid controls must remain above the painted scene');
console.log('Blackout Station grid art coverage passed: 16:9 painted-source illustration, cloud override priority and boss art preserved.');
