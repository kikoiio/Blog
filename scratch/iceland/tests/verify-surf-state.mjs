import assert from 'node:assert/strict';
import {SurfState} from '../src/water/surf-state.js';
const width=48,height=32,wet=new Float32Array(width*height).fill(1);
const create=(emissions=false,mask=wet)=>new SurfState(width,height).configure({wet:mask,width,height,horizon:0,axis:[0,1],emissions});
const s=create();s.injectWave({x:.4,y:.5,radius:.7,amplitude:.5});
const remote=16*width+34,initial=s.height[remote];s.advance(.6);
assert.ok(Math.abs(s.height[remote])<1e-8,'localized impulse cannot instantly reach a distant cell');
s.advance(2.5);assert.ok(Math.abs(s.height[remote]-initial)>1e-7,'wave propagates into previously resting cells');
const f=create();f.foam[10*width+20]=1;
const centroid=()=>{let total=0,moment=0;for(let i=0;i<f.length;i++){total+=f.foam[i];moment+=Math.floor(i/width)*f.foam[i];}return[total,moment/total];};
const before=centroid();f.advance(1);const after=centroid();
assert.ok(after[0]<before[0]&&after[0]>.5,'foam fades gradually');
assert.ok(after[1]>before[1]+.5,'foam travels with the current');
const frozen=f.pixels.slice(),time=f.time;f.advance(0);assert.deepEqual(f.pixels,frozen);assert.equal(f.time,time,'pause leaves simulation unchanged');
const mask=wet.slice();for(let y=0;y<height;y++)for(let x=30;x<width;x++)mask[y*width+x]=0;
const ocean=create(true,mask);const snapshots=[];
for(let n=0;n<25;n++){ocean.advance(2);snapshots.push(Buffer.from(ocean.pixels).toString('base64'));}
assert.equal(new Set(snapshots).size,snapshots.length,'cumulative ocean states do not repeat');
assert.ok(ocean.measure().bounded);assert.ok(ocean.measure().energy>.001);assert.ok(ocean.emitted>10);
for(let i=0;i<mask.length;i++)if(!mask[i]){assert.equal(ocean.height[i],0);assert.equal(ocean.velocity[i],0);assert.equal(ocean.foam[i],0);assert.equal(ocean.pixels[i*4+3],0);}
assert.ok(ocean.measure().foam>0,'autonomous shoaling generates foam');
assert.ok(ocean.measure().foam<.15,'foam must remain sparse');
const clock=ocean.time;ocean.advance(7);assert.ok(Math.abs(ocean.time-clock-6)<1e-8);assert.equal(ocean.discardedTime,1,'excess catch-up is explicitly reported');
const copy=create(true,mask);for(let n=0;n<25;n++)copy.advance(2);
assert.deepEqual(Buffer.from(copy.pixels),Buffer.from(snapshots.at(-1),'base64'),'seeded source packets are reproducible');
console.log('surf-state: propagation, foam transport/decay, pause, cumulative evolution, dry protection and finite state passed');
console.log(JSON.stringify(ocean.measure()));

const gentle=create(true),windy=create(true);for(let n=0;n<10;n++){gentle.advance(1,{x:.1,y:0});windy.advance(1,{x:1.4,y:0});}
assert(windy.measure().energy>gentle.measure().energy*1.2,'ambient wind changes newly emitted wave energy');
console.log('PASS: background wind drives new wave packets without pointer input.');
