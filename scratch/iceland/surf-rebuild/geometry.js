// Fixed-view study. One connected surface runs from the beach to the horizon.
// A folded cross-section represents the two visible sides of an overturning lip.
export const ART_SIZE=[1672,941];
export const OPTICS={focal:1200,horizon:326,eye:4.8};
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const profile=[[-5,0],[-2,.03],[-.25,.35],[.5,1.02],[.15,1.62],[-.65,1.77],[-1.28,1.38],[-1.33,1.65],[-.75,2.03],[.5,1.95],[2.6,1.06],[6,0]];
function spline(t){
 const at=clamp(t)*(profile.length-1),i=Math.min(profile.length-2,Math.floor(at)),u=at-i;
 const a=profile[Math.max(0,i-1)],b=profile[i],c=profile[i+1],d=profile[Math.min(profile.length-1,i+2)];
 return [0,1].map(k=>.5*((2*b[k])+(-a[k]+c[k])*u+(2*a[k]-5*b[k]+4*c[k]-d[k])*u*u+(-a[k]+3*b[k]-3*c[k]+d[k])*u*u*u));
}
const breakers=[{z:24.2,h:.97,curl:1},{z:38.8,h:.83,curl:.55},{z:58,h:.66,curl:.08},{z:90,h:.48,curl:0},{z:143,h:.38,curl:0},{z:230,h:.28,curl:0},{z:390,h:.23,curl:0}];
export function surfacePoint(x,baseZ){
 const shore=21.24+.465*x;
 let z=baseZ,y=0,foam=0,crest=0;
 for(let i=0;i<breakers.length;i++){
  const b=breakers[i],center=b.z+.18*x+Math.sin(x*.17+i*1.8)*.58;
  const t=(baseZ-center+5)/11;if(t<=0||t>=1)continue;
  const clearance=center-shore;
  const lateral=.78+.22*Math.sin(x*.19+i*2.1);
  const gain=smooth(.2,5,clearance)*b.h*lateral;
  const roll=b.curl*(.70+.30*Math.sin(x*.28+i));
  const [pz,py]=spline(t);
  const hump=Math.pow(Math.sin(t*Math.PI),3)*1.65;
  z+=(pz-(baseZ-center))*roll;
  y+=(hump*(1-roll)+py*roll)*gain;
  const lip=Math.exp(-Math.pow((t-.57)/.11,2));
  foam=Math.max(foam,lip*(.35+roll*.65)*smooth(.12,.7,gain));
  crest=Math.max(crest,Math.sin(t*Math.PI)*gain);
 }
 // Long directional swells continue between the sculpted breaking waves.
 const offshore=smooth(26,50,baseZ);
 y+=offshore*(Math.sin(baseZ*.76+x*.17)*.075+Math.sin(baseZ*1.41-x*.28)*.035);
 return [x,y,z,foam,crest,baseZ-shore];
}
export function createSurface(nx=400,ny=540){
 const stride=9,count=(nx+1)*(ny+1),data=new Float32Array(count*stride);
 const indices=new Uint32Array(nx*ny*6);
 for(let j=0;j<=ny;j++){
  const z=1/(1/11+(1/1100-1/11)*j/ny);
  for(let i=0;i<=nx;i++){
   const sx=-65+(1672+130)*i/nx,x=(sx-836)*z/OPTICS.focal;
   const p=surfacePoint(x,z),at=(j*(nx+1)+i)*stride;
   data.set([p[0],p[1],p[2],0,1,0,p[3],p[4],p[5]],at);
  }
 }
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
  const at=(j*(nx+1)+i)*stride;
  const l=(j*(nx+1)+Math.max(0,i-1))*stride,r=(j*(nx+1)+Math.min(nx,i+1))*stride;
  const a=(Math.max(0,j-1)*(nx+1)+i)*stride,b=(Math.min(ny,j+1)*(nx+1)+i)*stride;
  const dx=[data[r]-data[l],data[r+1]-data[l+1],data[r+2]-data[l+2]];
  const dz=[data[b]-data[a],data[b+1]-data[a+1],data[b+2]-data[a+2]];
  const n=[dz[1]*dx[2]-dz[2]*dx[1],dz[2]*dx[0]-dz[0]*dx[2],dz[0]*dx[1]-dz[1]*dx[0]],len=Math.hypot(...n)||1;
  data.set(n.map(v=>v/len),at+3);
 }
 let at=0;
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;
  indices.set([a,c,b,b,c,d],at);at+=6;
 }
 return {data,indices,vertices:count,triangles:nx*ny*2,bytes:data.byteLength+indices.byteLength};
}
