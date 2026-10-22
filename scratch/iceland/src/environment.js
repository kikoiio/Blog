const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export class Wind {
 constructor(){this.base={x:.18,y:.035};this.velocity={...this.base};this.offset={x:0,y:0};this.time=0;}
 configure(base={x:.18,y:.035}){this.base={...base};}
 advance(seconds){
  const dt=Math.max(0,seconds);this.time+=dt;
  const breathing=1+Math.sin(this.time*.19)*.10+Math.sin(this.time*.071+1.8)*.07;
  const follow=1-Math.exp(-dt*1.4);
  this.velocity.x+=(this.base.x*breathing-this.velocity.x)*follow;
  this.velocity.y+=(this.base.y*breathing-this.velocity.y)*follow;
  this.offset.x+=this.velocity.x*dt*.006;this.offset.y+=this.velocity.y*dt*.002;
 }
 sample(){return {...this.velocity};}
 measure(){return {source:'ambient',x:+this.velocity.x.toFixed(3),y:+this.velocity.y.toFixed(3),offset:{...this.offset}};}
}

export class Seabirds {
 constructor(perches=[]){this.birds=perches.map(([x,y],i)=>({home:{x,y},x,y,vx:0,vy:0,age:0,flight:0,nextFlight:14+i*9,seed:i*1.73,size:1+(y-.4)*1.7}));this.launches=0;this.time=0;}
 advance(seconds,wind){
  // The flight integrator needs small steps, but it must not lose elapsed time.
  const elapsed=Math.max(0,seconds),integrated=Math.min(elapsed,10),skipped=elapsed-integrated;
  if(skipped>0){
   this.time+=skipped;
   for(const bird of this.birds){Object.assign(bird,{x:bird.home.x,y:bird.home.y,vx:0,vy:0,flight:0,age:0,nextFlight:this.time+3+bird.seed});}
  }
  const steps=Math.max(1,Math.ceil(integrated/.05)),dt=integrated/steps;
  for(let step=0;step<steps;step++)this.flightStep(dt,wind);
 }
 flightStep(dt,wind){
  this.time+=dt;
  for(const bird of this.birds){
   if(!bird.flight&&this.time>=bird.nextFlight){
    bird.flight=1;bird.age=0;bird.vx=.025;bird.vy=-.025;
    bird.nextFlight=this.time+48+bird.seed*3;this.launches++;
   }
   if(!bird.flight)continue;bird.age+=dt;
   if(bird.age>4.8)bird.flight=2;
   if(bird.flight===1){bird.vx+=(wind.x*.05+Math.sin(bird.age*1.4+bird.seed)*.02-bird.vx)*dt*1.4;bird.vy+=(-.018+Math.sin(bird.age*1.8+bird.seed)*.025-bird.vy)*dt*2;}
   else{const dx=bird.home.x-bird.x,dy=bird.home.y-bird.y;bird.vx+=(dx*1.3-bird.vx)*dt*2;bird.vy+=(dy*1.3-bird.vy)*dt*2;if(Math.hypot(dx,dy)<.0035&&Math.hypot(bird.vx,bird.vy)<.012){bird.x=bird.home.x;bird.y=bird.home.y;bird.flight=0;bird.vx=bird.vy=0;continue;}}
   bird.x+=bird.vx*dt;bird.y+=bird.vy*dt;
  }
 }
 draw(ctx,camera,width,height,time){
  for(const bird of this.birds){
   const x=(bird.x*1672-camera.sx)/camera.sw*width,y=(bird.y*941-camera.sy)/camera.sh*height;
   if(x<-20||x>width+20||y<-20||y>height+20)continue;
   const size=clamp(bird.size*width/camera.sw,1,2.1),flap=bird.flight?Math.sin(time*8+bird.seed)*3.1:-.3;
   ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(size,size);ctx.lineWidth=1.3;ctx.lineJoin='miter';ctx.strokeStyle='rgba(22,44,56,.5)';
   ctx.beginPath();ctx.moveTo(-5,-flap);ctx.lineTo(-2,1);ctx.lineTo(0,0);ctx.lineTo(2,1);ctx.lineTo(5,-flap);ctx.stroke();
   ctx.strokeStyle='#ecf3ef';ctx.lineWidth=1.15;ctx.translate(0,-.8);ctx.stroke();ctx.fillStyle='#f3f5ed';ctx.fillRect(-1,0,2,1.8);ctx.restore();
  }
 }
 measure(){return {count:this.birds.length,flying:this.birds.filter(b=>b.flight).length,launches:this.launches};}
}

// Two forward-moving samples reset only when their contribution is invisible.
// This avoids both a back-and-forth sine drift and a visible repeating seam.
export function flowSamples(offset,span){
 const phase=((offset/span)%1+1)%1;
 const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
 const mix=phase<.5?1-smooth(.20,.30,phase):smooth(.70,.80,phase);
 return [(phase-.5)*span,(((phase+.5)%1)-.5)*span,mix];
}

