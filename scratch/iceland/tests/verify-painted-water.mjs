import assert from 'node:assert/strict';
import {PaintedWater} from '../src/water/painted-water.js';
import {waterWeight,waterAtFrame,waterSettings,domains} from '../src/water/water-domain.js';
for(const file of Object.keys(domains)){
 let moved=0;
 for(let y=0;y<48;y++)for(let x=0;x<84;x++){
  const p={x:(x+.5)/84,y:(y+.5)/48},weight=waterWeight(file,p.x,p.y);
  assert(weight>=0&&weight<=1&&Number.isFinite(weight));
  if(!waterAtFrame(file,p.x,p.y))assert.equal(weight,0,'dry pixels cannot be drawn over');else moved+=weight;
 }
 assert(moved>0,file+' has a valid continuous water envelope');
 const info=waterSettings(file);assert(info.amplitude>0&&info.amplitude<=2.1,'paint motion has a bounded source-pixel scale');
}
assert(waterWeight('04-black-beach.png',.35,.6)>.9,'white surf and dark water share a continuous mask');
assert.equal(waterWeight('04-black-beach.png',.7,.8),0,'black beach stays dry');
assert.equal(waterWeight('13-hornbjarg.png',.65,.6),0,'cliff face stays dry');
assert.equal(waterWeight('13-hornbjarg.png',.24,.71),0,'painted sea bird cannot drift with pigment');
assert.equal(waterWeight('13-hornbjarg.png',.26,.47),0,'nearby rocks stay fixed');
assert.equal(waterWeight('02-city-clear.png',650/1672,400/941),0,'church spire stays fixed');
assert.equal(waterWeight('02-city-clear.png',498/1672,400/941),0,'left roof stays fixed');
const outer=waterWeight('02-city-clear.png',.42,.3851),inner=waterWeight('02-city-clear.png',.42,.4);
assert(outer<.01&&inner>.9,'only an inward fade reaches the domain edge');
const calm=new PaintedWater(),windy=new PaintedWater();
for(let i=0;i<300;i++){calm.advance(1/60,{x:.18,y:.035});windy.advance(1/60,{x:1.4,y:.3});}
assert(windy.phase>calm.phase&&windy.amplitude>calm.amplitude,'wind changes shared swell tempo and strength');
const before={phase:windy.phase,amplitude:windy.amplitude};windy.advance(1/60,{x:0,y:0});
assert(windy.phase>before.phase,'waves retain motion after wind is released');assert(Math.abs(windy.amplitude-before.amplitude)<.01,'wind release cannot abruptly change swell size');
for(let i=0;i<3600;i++)windy.advance(1/60,{x:0,y:0});assert(Number.isFinite(windy.phase)&&windy.amplitude<before.amplitude);
console.log('PASS: continuous foam/water mask, land protection, inward edge fade, bounded pigment motion, wind response and smooth release.');

// This preview deliberately has no landscape input or contact shader path.
const {FrameScene}=await import('../src/scene.js');
const {flowSamples}=await import('../src/environment.js');
const {ambientSettings}=await import('../src/scene-profiles.js');
const {readFileSync}=await import('node:fs');
assert.equal(typeof FrameScene.prototype.move,'undefined');
assert.equal(typeof FrameScene.prototype.press,'undefined');
assert.equal(typeof PaintedWater.prototype.disturb,'undefined');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
assert(!main.includes('LandscapePlay')&&!main.includes('scene.move')&&!main.includes('scene.press'),'landscape gestures are not wired at runtime');
const shader=readFileSync(new URL('../src/water/water-surface.js',import.meta.url),'utf8');
assert(!shader.includes('contactWake')&&!shader.includes('waterTrails'),'no hidden wake layer remains');
assert(main.includes("interaction:'ambient-only'"));
assert(main.includes('lastTick=lastPaint=0;requestLoop();}'),'reading/visibility pauses reset both timestamps');
assert(main.includes('else if(progress>=.995)lastPaint=0'),'fully opened map cannot accumulate hidden scene time');
for(const file of ['06-maelifell-sun.png','07-maelifell-rain.png','08-rhyolite.png','14-dynjandi.png','17-kirkjufell.png'])assert.equal(ambientSettings(file).grass,0,'moss-covered ground cannot sway');
assert(waterWeight('13-hornbjarg.png',.1,.98)>.9,'foreground sea is included');
assert.equal(waterWeight('13-hornbjarg.png',.345,.4),0,'newly covered distant sea stack stays fixed');
for(const span of [.045,7,8,14]){
 let previous=flowSamples(0,span);
 for(let step=1;step<3000;step++){
  const next=flowSamples(step*span/800,span);
  for(let i=0;i<2;i++){
   const oldWeight=i?previous[2]:1-previous[2],newWeight=i?next[2]:1-next[2];
   if(oldWeight>.01&&newWeight>.01)assert(next[i]>=previous[i],'visible material cannot reverse direction');
  }
  previous=next;
 }
 const pigment=(x,offset)=>Math.sin((x-offset)*.9)+Math.cos((x-offset)*1.7);
 const value=offset=>{const [a,b,mix]=flowSamples(offset,span);return pigment(.4,a)*(1-mix)+pigment(.4,b)*mix;};
 for(const wrap of [span*.5,span,span*1.5,span*2])assert(Math.abs(value(wrap-1e-7)-value(wrap+1e-7))<.001,'phase handoff must stay continuous');
}
// A linear pigment ramp must actually translate, not cancel to its original value.
for(const span of [28,48,56]){
 const ramp=offset=>{const [a,b,mix]=flowSamples(offset,span);return (1-mix)*a+mix*b;};
 assert(Math.abs(ramp(span*.15)-ramp(span*.10))>span*.04,'visible transport survives the blend');
}
const {paintSky}=await import('../src/sky-layer.js');
const width=8,height=100,pixels=new Uint8ClampedArray(width*height*4),atmosphere=new Uint8ClampedArray(width*height*4);
const boundaries=Array.from({length:width},(_,x)=>x<3?.25:.9);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const k=(y*width+x)*4;pixels.set(y>boundaries[x]*height?[240,20,10,255]:[20+x,80,160,255],k);
}
paintSky(pixels,width,height,boundaries,atmosphere,width,height);
const terrain=(55*width+1)*4;assert(pixels[terrain+2]>pixels[terrain],'moving sky contains no red terrain');
for(let i=3;i<pixels.length;i+=4)assert.equal(pixels[i],255,'replacement sky is opaque');
console.log('PASS: ambient-only runtime, removed water/scene gesture API, stable moss, complete foreground sea and forward continuous material flow.');

const coarse=new PaintedWater(),fine=new PaintedWater();
coarse.advance(6,{x:.45,y:.02});for(let i=0;i<360;i++)fine.advance(1/60,{x:.45,y:.02});
assert(Math.abs(coarse.phase-fine.phase)<1e-9,'flow phase is independent of visible frame rate');
assert(Math.abs(coarse.amplitude-fine.amplitude)<1e-9,'flow strength is independent of visible frame rate');
console.log('PASS: six seconds of flow remain six seconds under browser throttling.');
