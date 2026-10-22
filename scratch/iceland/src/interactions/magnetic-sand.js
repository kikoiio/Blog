const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const sandBoundary=[[.34,.92],[.46,.82],[.73,.72],[.98,.595],[1,.62],[1,1],[.36,1]];
export function sandAt(p){
 let yes=false;for(let i=0,j=sandBoundary.length-1;i<sandBoundary.length;j=i++){
  const a=sandBoundary[i],b=sandBoundary[j];if((a[1]>p.y)!==(b[1]>p.y)&&p.x<(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1])+a[0])yes=!yes;
 }return yes;
}
export class MagneticSand {
 constructor(count=3200){
  this.count=count;this.points=[];this.active=false;this.pointer={x:.75,y:.85};this.near=false;this.held=false;this.charge=0;this.opening=0;this.inputs=0;this.time=0;this.seed=38291;
 }
 random(){let s=this.seed;s^=s<<13;s^=s>>>17;s^=s<<5;this.seed=s>>>0;return this.seed/4294967296;}
 configure(file){
  this.active=file==='04-black-beach.png';this.points=[];this.held=false;this.near=false;this.opening=0;this.charge=0;this.time=0;this.inputs=0;this.seed=38291;
  if(!this.active)return;
  for(let i=0;i<this.count;i++){
   let x,y;do{x=.32+this.random()*.68;y=.59+this.random()*.41;}while(!sandAt({x,y}));
   this.points.push({x,y,hx:x,hy:y,vx:0,vy:0,seed:this.random(),size:1+this.random()*2.2});
  }
 }
 hit(p){return this.active&&sandAt(p);}
 move(p){this.pointer=p;this.near=this.hit(p);if(this.near)this.inputs++;}
 down(p){if(!this.hit(p)||this.opening)return false;this.move(p);this.held=true;this.charge=0;return true;}
 up(cancel=false,heldMs=0){this.charge=Math.max(this.charge,clamp(heldMs/1050));const enter=!cancel&&this.held&&this.charge>=.67&&this.near;this.held=false;if(!enter)this.charge=0;return enter;}
 leave(){this.near=false;this.held=false;this.charge=0;}
 startOpening(){this.held=false;this.opening=.001;}
 reset(){this.opening=0;this.leave();}
 advance(seconds,reduced=false){
  const dt=clamp(seconds,0,.05);this.time+=dt;
  if(this.held)this.charge=clamp(this.charge+dt/1.05);
  if(this.opening)this.opening=clamp(this.opening+dt/.78);
  const focus=this.near||this.held;
  for(let i=0;i<this.points.length;i++){
   const q=this.points[i];let tx=q.hx,ty=q.hy;
   if(this.opening){
    // Grains become the five reading rows before the existing article index appears.
    const row=i%5,col=Math.floor(i/5)/(this.points.length/5);
    tx=.30+col*.4;ty=.32+row*.085+(q.seed-.5)*.016;
   }else if(focus){
    const dx=q.hx-this.pointer.x,dy=(q.hy-this.pointer.y)*.5628,d=Math.hypot(dx,dy),radius=this.held?.24+.06*this.charge:.22;
    if(d<radius){
     const influence=(1-d/radius)**2,group=Math.floor(q.seed*3),angle=group*Math.PI*2/3+this.time*(this.held?1.8:1.1)+q.seed*1.4;
     const orbit=this.held?.055*(1-this.charge)+.008+q.seed*.008:.035+q.seed*.025;
     const ax=this.pointer.x+Math.cos(angle)*orbit,ay=this.pointer.y+Math.sin(angle)*orbit*1.777;
     tx+=((ax-q.hx)*influence)*2;ty+=((ay-q.hy)*influence)*2;
    }
   }
   if(!focus&&!this.opening){const d=Math.hypot(q.hx-.67,(q.hy-.85)*.5628),breath=Math.max(0,Math.sin(this.time*.9))**7;if(d<.065){tx+=Math.sin(q.seed*16+this.time)*breath*.003;ty-=breath*.005;}}
   if(reduced){q.x=tx;q.y=ty;q.vx=q.vy=0;continue;}
   const stiffness=this.opening?35:68,drag=Math.exp(-dt*9);
   q.vx=(q.vx+(tx-q.x)*stiffness*dt)*drag;q.vy=(q.vy+(ty-q.y)*stiffness*dt)*drag;
   q.x+=q.vx*dt;q.y+=q.vy*dt;
  }
  return this.opening>=1;
 }
 draw(ctx,camera,width,height){
  if(!this.active)return;
  const sx=width/camera.sw,sy=height/camera.sh;
  ctx.save();
  for(const q of this.points){
   const movement=Math.hypot(q.x-q.hx,(q.y-q.hy)*.5628),visible=clamp(movement*95)+(this.held?.12:0);
   if(visible<.025&&!this.opening)continue;
   const x=(q.x*1672-camera.sx)*sx,y=(q.y*941-camera.sy)*sy;
   if(x<0||x>width||y<0||y>height)continue;
   const elevation=clamp(movement*240,0,15);
   ctx.fillStyle=`rgba(5,15,23,${clamp(visible*.65,0,.65)})`;ctx.fillRect(Math.round(x+elevation*.6),Math.round(y+elevation),2,1);
   ctx.globalAlpha=clamp(visible,.1,.92);ctx.fillStyle=q.seed>.94?'#a8bbc3':q.seed>.5?'#526d7d':'#142836';
   const size=Math.max(1,Math.round(q.size*sx));ctx.fillRect(Math.round(x),Math.round(y-elevation),size,size);
  }
  ctx.restore();
 }
 measure(){return {active:this.active,near:this.near,held:this.held,charge:+this.charge.toFixed(3),opening:+this.opening.toFixed(3),inputs:this.inputs,grains:this.points.length,moved:this.points.filter(q=>Math.hypot(q.x-q.hx,q.y-q.hy)>.002).length};}
}
