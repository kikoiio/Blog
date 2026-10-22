// Persistent CPU water state. Coordinates match the original painting (top-left UV).
// R = height / 4 + .5; G = foam; B = vertical velocity / 8 + .5; A = wet.
// Height is measured in grid-cell units; the renderer derives normals from R.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export class SurfState {
 constructor(width = 144, height = 88, seed = 78193) {
  this.width = width; this.rows = height; this.length = width * height;
  for (const name of ['height','velocity','foam','wet','depth','nextFoam','currentX','currentY']) this[name] = new Float32Array(this.length);
  this.pixels = new Uint8Array(this.length * 4);
  this.offshore = new Int32Array(width); this.offshore.fill(-1);
  this.seed = seed >>> 0; this.time = 0; this.steps = 0; this.emitted = 0; this.discardedTime = 0;
  this.packets = []; this.nextEmission = .15; this.axis = [0,1]; this.emissions = true;
 }
 random() { this.seed = (Math.imul(this.seed,1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
 configure({wet, width = this.width, height = this.rows, horizon = .344, axis = [-.28,1], emissions = true}) {
  const w = this.width, h = this.rows;
  this.horizon = horizon; const norm = Math.hypot(...axis) || 1; this.axis = axis.map(v => v / norm); this.emissions = emissions;
  this.height.fill(0); this.velocity.fill(0); this.foam.fill(0); this.packets.length = 0;
  this.offshore.fill(-1);
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
   const i=y*w+x, sx=Math.min(width-1,Math.floor((x+.5)*width/w)), sy=Math.min(height-1,Math.floor((y+.5)*height/h));
   this.wet[i] = wet[sy*width+sx] > .08 ? clamp(wet[sy*width+sx],0,1) : 0;
   // Distance to land is computed once; it supplies a shoaling bathymetry.
   this.depth[i] = this.wet[i] ? 1000 : 0;
   if (this.wet[i] && this.offshore[x] < 0) this.offshore[x] = y;
  }
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {const i=y*w+x;if(this.wet[i])this.depth[i]=Math.min(this.depth[i],x?this.depth[i-1]+1:1000,y?this.depth[i-w]+1:1000);}
  for(let y=h-1;y>=0;y--) for(let x=w-1;x>=0;x--) {const i=y*w+x;if(this.wet[i])this.depth[i]=Math.min(this.depth[i],x<w-1?this.depth[i+1]+1:1000,y<h-1?this.depth[i+w]+1:1000);}
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {const i=y*w+x; if(this.wet[i]) {
   // The upper sea boundary opens into deep ocean; lateral and beach edges shoal.
   const offshoreDepth=clamp(1-(y/h-horizon)*1.8,.15,1);
   this.depth[i] = clamp(this.depth[i]/10,.10,1) * (.35+.65*offshoreDepth);
  }}
  this.pack(); return this;
 }
 // Localized initial displacement, also useful for validating finite propagation.
 injectWave({x=.5,y=.5,radius=3,amplitude=.5,velocity=0}={}) {
  const w=this.width,h=this.rows,cx=x*w-.5,cy=y*h-.5;
  for(let yy=Math.max(0,Math.floor(cy-radius*3));yy<Math.min(h,cy+radius*3);yy++) for(let xx=Math.max(0,Math.floor(cx-radius*3));xx<Math.min(w,cx+radius*3);xx++) {
   const i=yy*w+xx;if(!this.wet[i])continue;const a=Math.exp(-((xx-cx)**2+(yy-cy)**2)/(2*radius*radius));
   this.height[i]+=a*amplitude;this.velocity[i]+=a*velocity;
  }
 }
 emit(wind) {
  const windGain=.72+Math.min(1.4,Math.hypot(wind.x||0,wind.y||0))*.5;
  const valid=[];for(let x=1;x<this.width-1;x++)if(this.offshore[x]>=0 && this.offshore[x]/this.rows<this.horizon+.12)valid.push(x);
  if(!valid.length)return;
  const center=valid[Math.floor(this.random()*valid.length)];
  this.packets.push({start:this.time,duration:2.2+this.random()*2.7,center,span:8+this.random()*23,amplitude:(3.5+this.random()*3)*windGain,frequency:.35+this.random()*.3,phase:this.random()*6.28});
  this.emitted++; if(this.packets.length>6)this.packets.shift();
 }
 advance(dt, wind={x:.48,y:.02}) {
  if(!Number.isFinite(dt)||dt<=0)return this.pixels;
  const duration=Math.min(dt,6);this.discardedTime+=Math.max(0,dt-duration);
  const count=Math.ceil(duration/.0333333333),step=duration/count;
  for(let n=0;n<count;n++)this.step(step,wind);
  this.pack();return this.pixels;
 }
 step(dt,wind) {
  const w=this.width,h=this.rows,H=this.height,V=this.velocity,F=this.foam,D=this.depth,W=this.wet;
  this.time+=dt;this.steps++;
  if(this.emissions && this.time>=this.nextEmission){this.emit(wind);this.nextEmission=this.time+.8+this.random()*1.4;}
  this.packets=this.packets.filter(p=>this.time-p.start<p.duration);
  // Conservative variable-depth wave operator div(c² grad(height)). c <= 9 cells/s,
  // so dt <= 1/30 satisfies the 2D CFL bound, including at a sharp coastline.
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=y*w+x;if(!W[i]){H[i]=V[i]=F[i]=0;continue;}
   let acceleration=0;
   const left=x?i-1:i,right=x<w-1?i+1:i,up=y?i-w:i,down=y<h-1?i+w:i;
   if(W[left])acceleration+=(H[left]-H[i])*81*Math.min(D[i],D[left]);
   if(W[right])acceleration+=(H[right]-H[i])*81*Math.min(D[i],D[right]);
   if(W[up])acceleration+=(H[up]-H[i])*81*Math.min(D[i],D[up]);
   if(W[down])acceleration+=(H[down]-H[i])*81*Math.min(D[i],D[down]);
   const slope=Math.abs(H[x?i-1:i]-H[x<w-1?i+1:i])+Math.abs(H[y?i-w:i]-H[y<h-1?i+w:i]);
   // Increased dissipation converts breaking-wave energy to persistent foam.
   const breaking=Math.max(0,slope-.20)*(1-D[i]);
   V[i]=(V[i]+acceleration*dt)*Math.exp(-dt*(.11+breaking*1.9));
   if(breaking>.015)F[i]=clamp(F[i]+breaking*(.8+Math.abs(V[i]))*dt*.55,0,1);
   this.currentX[i]=this.axis[0]*(1.1+1.5*(1-D[i]))+clamp(wind.x||0,-2,2)*.6-(H[x<w-1?i+1:i]-H[x?i-1:i])*.7;
   this.currentY[i]=this.axis[1]*(1.1+1.5*(1-D[i]))+clamp(wind.y||0,-2,2)*.4-(H[y<h-1?i+w:i]-H[y?i-w:i])*.7;
  }
  // Finite wave packets drive only a narrow offshore strip, never the whole image.
  // Opposite-signed halves avoid adding a DC volume offset to the ocean.
  for(const p of this.packets){const age=this.time-p.start,envelope=Math.sin(Math.PI*age/p.duration)**2;
   for(let x=Math.max(0,Math.floor(p.center-p.span*2));x<Math.min(w,p.center+p.span*2);x++){
    const top=this.offshore[x];if(top<0 || top/h>this.horizon+.12)continue;
    const cross=Math.exp(-(((x-p.center)/p.span)**2)),carrier=Math.sin(age*p.frequency*6.283+p.phase+(x-p.center)*this.axis[0]*.13);
    for(let k=1;k<=4;k++){const y=top+k;if(y>=h)continue;const i=y*w+x;if(W[i])V[i]+=carrier*envelope*cross*p.amplitude*dt*(k<=2?-.75:.75);}
   }
  }
  for(let i=0;i<this.length;i++)if(W[i])H[i]=clamp(H[i]+V[i]*dt,-2,2);
  // Semi-Lagrangian advection: the foam is carried by a spatial current, then fades.
  // Dry backtrace samples contribute zero, so foam cannot bridge a land barrier.
  const fade=Math.exp(-dt*.45);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=y*w+x;if(!W[i]){this.nextFoam[i]=0;continue;}
   const px=clamp(x-this.currentX[i]*dt,0,w-1),py=clamp(y-this.currentY[i]*dt,0,h-1),xx=Math.floor(px),yy=Math.floor(py),tx=px-xx,ty=py-yy;
   const a=yy*w+xx,b=yy*w+Math.min(w-1,xx+1),c=Math.min(h-1,yy+1)*w+xx,d=Math.min(h-1,yy+1)*w+Math.min(w-1,xx+1);
   this.nextFoam[i]=((F[a]*(1-tx)+F[b]*tx)*(1-ty)+(F[c]*(1-tx)+F[d]*tx)*ty)*fade;
  }
  this.foam=this.nextFoam;this.nextFoam=F;
 }
 pack(){for(let i=0;i<this.length;i++){const p=i*4;this.pixels[p]=Math.round(clamp(this.height[i]/4+.5,0,1)*255);this.pixels[p+1]=Math.round(clamp(this.foam[i],0,1)*255);this.pixels[p+2]=Math.round(clamp(this.velocity[i]/8+.5,0,1)*255);this.pixels[p+3]=Math.round(this.wet[i]*255);}}
 measure(){let energy=0,foam=0,bounded=true;for(let i=0;i<this.length;i++){energy+=this.height[i]**2+this.velocity[i]**2;foam+=this.foam[i];if(!Number.isFinite(this.height[i]+this.velocity[i]+this.foam[i])||Math.abs(this.height[i])>2.001||this.foam[i]<0||this.foam[i]>1.001)bounded=false;}return{time:this.time,steps:this.steps,energy,foam:foam/this.length,emitted:this.emitted,bounded,discardedTime:this.discardedTime};}
}
