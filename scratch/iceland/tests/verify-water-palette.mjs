import assert from 'node:assert/strict';
import {waterPalette} from '../src/water/water-palette.js';
const w=32,h=16,pixels=new Uint8ClampedArray(w*h*4),wet=new Float32Array(w*h);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const i=y*w+x;wet[i]=x<24?1:0;
 pixels.set(x>=24?[245,40,15,255]:y===7?[245,250,255,255]:[30,65,82,255],i*4);
}
const palette=waterPalette(pixels,w,h,wet);
for(let i=0;i<palette.length;i+=4){assert.deepEqual([...palette.slice(i,i+4)],[30,65,82,255],'fixed white crests and red dry land cannot tint the new base');}
console.log('PASS: water palette removes frozen white crests and excludes land colors.');
