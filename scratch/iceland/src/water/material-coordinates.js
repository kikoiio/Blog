// Backtrace material coordinates, not colors: the original illustration is sampled
// only at display time, so successive transport steps cannot blur its fine pigment.
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export class MaterialCoordinates{
 constructor(surf){
  this.surf=surf;this.width=surf.width;this.rows=surf.rows;this.time=0;this.steps=0;
  this.u=new Float32Array(surf.length);this.v=new Float32Array(surf.length);this.nextU=new Float32Array(surf.length);this.nextV=new Float32Array(surf.length);this.pixels=new Uint8Array(surf.length*4);
  for(let y=0;y<this.rows;y++)for(let x=0;x<this.width;x++){const i=y*this.width+x;this.u[i]=(x+.5)/this.width;this.v[i]=(y+.5)/this.rows;}this.pack();
 }
 advance(seconds){
  const duration=Math.min(6,Math.max(0,seconds));if(!duration||!Number.isFinite(duration))return;
  const count=Math.ceil(duration/.05),dt=duration/count,w=this.width,h=this.rows,s=this.surf;
  for(let step=0;step<count;step++){
   const replenish=1-Math.exp(-dt*.035);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,originalU=(x+.5)/w,originalV=(y+.5)/h;
    if(!s.wet[i]){this.nextU[i]=originalU;this.nextV[i]=originalV;continue;}
    const px=clamp(x-s.currentX[i]*dt*.16,0,w-1),py=clamp(y-s.currentY[i]*dt*.16,0,h-1),xx=Math.floor(px),yy=Math.floor(py),tx=px-xx,ty=py-yy;
    const a=yy*w+xx,b=yy*w+Math.min(w-1,xx+1),c=Math.min(h-1,yy+1)*w+xx,d=Math.min(h-1,yy+1)*w+Math.min(w-1,xx+1);
    const sample=field=>(field[a]*(1-tx)+field[b]*tx)*(1-ty)+(field[c]*(1-tx)+field[d]*tx)*ty;
    this.nextU[i]=sample(this.u)*(1-replenish)+originalU*replenish;
    this.nextV[i]=sample(this.v)*(1-replenish)+originalV*replenish;
   }
   [this.u,this.nextU]=[this.nextU,this.u];[this.v,this.nextV]=[this.nextV,this.v];this.time+=dt;this.steps++;
  }
  this.pack();
 }
 pack(){for(let i=0;i<this.u.length;i++){const k=i*4,u=Math.round(clamp(this.u[i],0,1)*65535),v=Math.round(clamp(this.v[i],0,1)*65535);this.pixels[k]=u>>8;this.pixels[k+1]=u&255;this.pixels[k+2]=v>>8;this.pixels[k+3]=v&255;}}
}
