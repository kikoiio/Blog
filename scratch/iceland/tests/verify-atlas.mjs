import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {VIEWBOX,project,coastPaths,glacierPaths} from '../src/geography.js';
import {places} from '../src/places.js';
import {waterAtFrame,ART} from '../src/scene.js';
assert.equal(places.length,25);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',ART),'utf8'));
assert.equal(manifest.length,27);
assert.equal(new Set(manifest.map(item=>item.image)).size,27);
for(const item of manifest){
 assert(places.some(p=>p.id===item.place),'manifest must refer to a real place');
 assert(existsSync(new URL(item.image,ART)),item.image+' manifest image');
 assert(existsSync(new URL(item.prompt,ART)),item.image+' full generation prompt');
}
assert.equal(new Set(places.map(p=>p.id)).size,places.length);
for(const p of places){
 const [x,y]=project(p.lon,p.lat);
 assert(x>=0&&x<=VIEWBOX.width&&y>=0&&y<=VIEWBOX.height,p.id+' pin must fit');
 assert(Number.isFinite(x)&&Number.isFinite(y));
 assert(p.lat>63&&p.lat<67&&p.lon>-25&&p.lon<-13,p.id+' coordinate in Iceland');
 assert(existsSync(new URL(p.image,ART)),p.image+' missing');
 assert(p.source&&p.illustrative,p.id+' must disclose image/site distinction');
 const png=readFileSync(new URL(p.image,ART));assert.equal(png.readUInt32BE(16),1672);assert.equal(png.readUInt32BE(20),941);
}
assert.equal(new Set(places.map(p=>p.image)).size,25,'each place must have its own artwork');
for(const p of places){assert(p.description,p.id+' editorial notes');assert(existsSync(new URL(p.image.replace('.png','.prompt.md'),ART)),p.id+' generation prompt');}
const west=project(-24,65),east=project(-14,65),north=project(-19,66),south=project(-19,64);
assert(west[0]<east[0]&&north[1]<south[1],'projection orientation');
for(const path of [...coastPaths,...glacierPaths]){assert(path.startsWith('M')&&/Z$/i.test(path));assert(!/NaN|Infinity/.test(path));}
for(const [file,x,y] of [
 ['01-city-rain.png',.45,.25],['03-harbor.png',.45,.2],['03-harbor.png',.61,.53],
 ['04-black-beach.png',.7,.8],['05-glacial-outlet.png',.2,.7],['11-autumn-fjord.png',.2,.25],
 ['06-maelifell-sun.png',.5,.5],['09-waterfall.png',.3,.5],
 ['13-hornbjarg.png',.65,.6],['16-isafjordur.png',.55,.65],['18-arnarstapi.png',.5,.6],['19-hvitserkur.png',.65,.5],
 ['21-hverir.png',.75,.5],['22-studlagil.png',.15,.5],['23-vestrahorn.png',.65,.4],['26-heimaey.png',.5,.4],['27-kerlingarfjoll.png',.65,.5],
])assert.equal(waterAtFrame(file,x,y),false,file+' must keep land/boat outside wave domain');
for(const [file,x,y] of [['04-black-beach.png',.25,.4],['03-harbor.png',.8,.6],['05-glacial-outlet.png',.5,.35],['11-autumn-fjord.png',.65,.5],['13-hornbjarg.png',.1,.6],['15-raudasandur.png',.9,.7],['16-isafjordur.png',.7,.51],['18-arnarstapi.png',.95,.7],['19-hvitserkur.png',.5,.65],['22-studlagil.png',.15,.85],['23-vestrahorn.png',.95,.6],['26-heimaey.png',.95,.7]])assert.equal(waterAtFrame(file,x,y),true,file+' open water');
for(const file of ['02-city-clear.png','07-maelifell-rain.png'])assert(existsSync(new URL(file,ART)));
console.log('PASS: 25 unique places within full-island projection, coast/glacier paths, 27 registered scene assets and prompts, dry-land/boat/sea-stack exclusion, open-water hit regions.');
