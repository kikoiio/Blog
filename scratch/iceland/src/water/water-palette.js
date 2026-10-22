import { waterWeight } from './water-domain.js';

// Recover broad water colors without retaining the painting's frozen crests.
export function waterPalette(pixels,width,height,weights){
 const stride=width+1,size=stride*(height+1),sum=Array.from({length:4},()=>new Float32Array(size));
 let fallback=[28,62,77],count=0,total=[0,0,0];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const k=(y*width+x)*4,r=pixels[k],g=pixels[k+1],b=pixels[k+2];
  const valid=weights[y*width+x]>.15&&b>=r*.95&&(r+g+b)/3<155;
  const i=(y+1)*stride+x+1,left=i-1,up=i-stride,corner=up-1;
  for(let c=0;c<4;c++)sum[c][i]=(valid?(c===3?1:pixels[k+c]):0)+sum[c][left]+sum[c][up]-sum[c][corner];
  if(valid){count++;total[0]+=r;total[1]+=g;total[2]+=b;}
 }
 if(count)fallback=total.map(v=>v/count);
 const output=new Uint8ClampedArray(pixels.length);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const x0=Math.max(0,x-16),x1=Math.min(width,x+17),y0=Math.max(0,y-7),y1=Math.min(height,y+8);
  const area=channel=>channel[y1*stride+x1]-channel[y0*stride+x1]-channel[y1*stride+x0]+channel[y0*stride+x0];
  const samples=area(sum[3]),k=(y*width+x)*4;
  for(let c=0;c<3;c++)output[k+c]=Math.round(samples>0?area(sum[c])/samples:fallback[c]);
  output[k+3]=255;
 }
 return output;
}
export function createWaterPalette(image,file){
 const canvas=document.createElement('canvas');canvas.width=418;canvas.height=236;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,canvas.width,canvas.height);
 const data=ctx.getImageData(0,0,canvas.width,canvas.height),weights=new Float32Array(canvas.width*canvas.height);
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)weights[y*canvas.width+x]=waterWeight(file,(x+.5)/canvas.width,(y+.5)/canvas.height);
 data.data.set(waterPalette(data.data,canvas.width,canvas.height,weights));ctx.putImageData(data,0,0);return canvas;
}
