import assert from 'node:assert/strict';
import { Wind, Seabirds } from '../src/environment.js';
import { environmentAt, profiles } from '../src/scene-profiles.js';
import { existsSync, readFileSync } from 'node:fs';
const east=new Wind(),west=new Wind();
east.configure({x:.4,y:.02});west.configure({x:-.4,y:.02});
assert.equal(typeof east.push,'undefined','weather accepts no pointer injection');
for(let i=0;i<600;i++){east.advance(1/60);west.advance(1/60);}
assert(east.velocity.x>.3&&west.velocity.x<-.3,'wind follows the authored scene direction');
const phase=east.offset.x;
for(let i=0;i<1200;i++)east.advance(1/60);
assert(east.offset.x>phase,'cloud advection continues without any input');
assert(Math.abs(east.velocity.x-east.base.x)<east.base.x*.2,'ambient wind stays near background strength');
const flock=new Seabirds([[.79,.55]]);
assert.equal(typeof flock.disturb,'undefined','pointer cannot startle birds');
for(let i=0;i<900;i++)flock.advance(1/60,{x:.4,y:.02});
assert.equal(flock.measure().flying,1,'a bird takes flight on its own schedule');
for(let i=0;i<1800;i++)flock.advance(1/60,{x:.4,y:.02});
assert.equal(flock.measure().flying,0,'bird returns and settles before the next flight');
for(const bird of flock.birds)assert(Math.hypot(bird.x-bird.home.x,bird.y-bird.home.y)<.004);
for(const [x,y]of [[.1,.6],[.65,.6],[.9,.5],[.5,.3]])assert.equal(environmentAt('13-hornbjarg.png',x,y).sky,0,'sky must exclude sea and cliffs');
assert(environmentAt('13-hornbjarg.png',.2,.1).sky>.9);
assert.equal(environmentAt('13-hornbjarg.png',.65,.6).grass,false,'cliff face cannot sway');
const manifest=JSON.parse(readFileSync(new URL('../assets/landscapes/manifest.json',import.meta.url)));
for(const item of manifest)for(const layer of item.layers||[]){assert(existsSync(new URL('../assets/landscapes/'+layer.image,import.meta.url)));assert(existsSync(new URL('../assets/landscapes/'+layer.prompt,import.meta.url)));}
assert(existsSync(profiles['13-hornbjarg.png'].clouds),'cloud layer must be local');
assert.equal(Object.keys(profiles).length,manifest.length,'every weather frame has an authored environment');
for(const item of manifest){
 const profile=profiles[item.image];assert(profile,item.image);
 assert(profile.wind&&Number.isFinite(profile.wind.x)&&Number.isFinite(profile.wind.y));
 assert(profile.skyline.length>=2&&profile.skyline[0][0]===0&&profile.skyline.at(-1)[0]===1);
 for(let i=1;i<profile.skyline.length;i++)assert(profile.skyline[i][0]>profile.skyline[i-1][0],'skyline must advance monotonically');
 let skyPixels=0;
 for(let y=0;y<40;y++)for(let x=0;x<72;x++){
  const region=environmentAt(item.image,(x+.5)/72,(y+.5)/40);
  for(const value of [region.sky,region.grassWeight,region.mist,region.flow])assert(Number.isFinite(value)&&value>=0&&value<=1,item.image+' bounded inward masks');
  skyPixels+=region.sky;
 }
 assert(skyPixels>5,item.image+' must move even when it has no water or grass');
 for(const polygon of [...profile.grass,...(profile.mist||[]),...(profile.flow||[])]){
  assert(polygon.length>=3);
  for(const [x,y] of polygon)assert(x>=0&&x<=1&&y>=0&&y<=1);
 }
}
for(const [file,x,y] of [
 ['02-city-clear.png',.388,.39],['19-hvitserkur.png',.65,.44],
 ['23-vestrahorn.png',.70,.27],['06-maelifell-sun.png',.675,.34],
])assert.equal(environmentAt(file,x,y).sky,0,'fixed landmark must stay outside sky: '+file);
assert.equal(environmentAt('14-dynjandi.png',.24,.30).flow,0,'left basalt wall stays outside the waterfall curtain');
assert(environmentAt('14-dynjandi.png',.42,.49).flow>.8,'main waterfall curtain has a flowing region');
assert.equal(environmentAt('21-hverir.png',.52,.44).mist,0,'pale mountain veins cannot move with steam');
assert.equal(environmentAt('21-hverir.png',.51,.55).mist,0,'ambiguous mineral flats are not treated as steam');
assert(environmentAt('21-hverir.png',.18,.42).mist>.5,'confirmed left steam plume has an inward motion region');
const changing=new Wind();const start=changing.offset.x;changing.configure({x:-.45,y:.02});
assert.equal(changing.offset.x,start,'scene changes cannot jump the cloud phase');
for(let i=0;i<240;i++)changing.advance(1/60);
assert(changing.velocity.x<-.25,'new location sets its own wind direction');
const frozen=JSON.stringify(changing.measure());changing.advance(0);assert.equal(JSON.stringify(changing.measure()),frozen,'zero time freezes wind');
let minimum=Infinity,maximum=-Infinity;
for(let i=0;i<1200;i++){changing.advance(1/60);minimum=Math.min(minimum,changing.velocity.x);maximum=Math.max(maximum,changing.velocity.x);}
assert(maximum-minimum>.035,'wind breathes without pointer input');
console.log('PASS: autonomous wind, continuous cloud drift, scheduled bird flight/return, 27 environments, inward masks, landmark protection and layer provenance.');

const {elapsedSeconds}=await import('../src/animation-clock.js');
assert.equal(elapsedSeconds(5000,0),0,'fresh/resumed frame cannot catch up hidden time');
assert.equal(elapsedSeconds(2000,1000),1,'a throttled frame retains a real second');
const slowWind=new Wind();slowWind.advance(2);assert.equal(slowWind.time,2);
const slowBird=new Seabirds([[.7,.6]]);slowBird.advance(16,{x:.4,y:.02});assert(Math.abs(slowBird.time-16)<1e-9);
console.log('PASS: visible slow frames retain elapsed time; bird flight uses bounded integration steps.');

const stalledBird=new Seabirds([[.5,.5]]);stalledBird.advance(600,{x:.4,y:.02});
for(const bird of stalledBird.birds)assert(Number.isFinite(bird.x)&&Number.isFinite(bird.y)&&Math.abs(bird.x)<2&&Math.abs(bird.y)<2,'long visible stalls cannot explode flight integration');
assert(Math.abs(stalledBird.time-600)<1e-9,'scheduler keeps real elapsed time through a long stall');
