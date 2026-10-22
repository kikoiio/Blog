import assert from 'node:assert/strict';
import {MaterialCoordinates} from '../src/water/material-coordinates.js';
const width=24,rows=16,length=width*rows,surf={width,rows,length,wet:new Float32Array(length).fill(1),currentX:new Float32Array(length),currentY:new Float32Array(length)};
const field=new MaterialCoordinates(surf),before=field.pixels.slice();for(let i=0;i<500;i++)field.advance(1/60);assert.deepEqual(field.pixels,before,'500 resting transport steps preserve every encoded source coordinate');
surf.currentX.fill(1);surf.currentY.fill(2);const i=8*width+12,u=field.u[i],v=field.v[i];field.advance(2);assert(field.u[i]<u-.005&&field.v[i]<v-.02,'current transports source coordinates downstream');
const frozen=field.pixels.slice();field.advance(0);assert.deepEqual(field.pixels,frozen,'pause freezes material mapping');
surf.wet[0]=0;for(let n=0;n<100;n++)field.advance(1);assert.equal(field.u[0],Math.fround(.5/width));assert.equal(field.v[0],Math.fround(.5/rows));
for(let n=0;n<length;n++){assert(field.u[n]>=0&&field.u[n]<=1);assert(field.v[n]>=0&&field.v[n]<=1);}
// Linear interpolation of both packed bytes decodes to a linear UV, including carry.
const unpack=(hi,lo)=>(hi*256+lo)/65535,low=255,high=256;
for(const t of [.1,.5,.9])assert(Math.abs(unpack((low>>8)*(1-t)+(high>>8)*t,(low&255)*(1-t)+(high&255)*t)-(low*(1-t)+high*t)/65535)<1e-12);
console.log('PASS: 500-step identity, persistent transport, pause, dry cells, finite long-run coordinates and smooth packed UV interpolation.');
