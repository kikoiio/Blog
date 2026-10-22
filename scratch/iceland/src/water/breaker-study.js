// Disposable art-direction study: independently born waves carry painted
// materials. Each crest rises, folds over, collapses, then leaves a wash.
const W=1672,H=941;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const q=clamp((x-a)/(b-a));return q*q*(3-2*q);};
const hash=n=>{const q=Math.sin(n*127.1+311.7)*43758.5453;return q-Math.floor(q);};
const ASSETS=new URL('../../assets/layers/reynisfjara/',import.meta.url);

export class BreakerSet {
 constructor(){this.time=0;this.next=0;this.serial=0;this.waves=[];this.wind=.48;this.emitted=0;}
 advance(dt,wind={x:.48,y:.02}){
  this.time+=Math.max(0,dt);this.wind=wind.x;
  while(this.next<=this.time){
   const id=this.serial++,r=hash(id+7);
   this.waves.push({id,born:this.next,duration:13+r*3.6,energy:.80+hash(id+21)*.35,
    bend:hash(id+19)*6.28,shift:hash(id+8)*150,brokenAt:.60+hash(id+13)*.10});
   this.next+=4.0+hash(id+9)*2.7;this.emitted++;
  }
  this.waves=this.waves.filter(w=>(this.time-w.born)/w.duration<1.42);
 }
 pose(w,x){
  const age=(this.time-w.born)/w.duration;
  // The wave approaches diagonally; sections along the crest break at
  // different moments instead of an entire white line dropping together.
  const along=x/W;
  const local=age+Math.sin(along*4.2+w.bend)*.032;
  const travel=clamp(local/1.02);
  const perspective=.12+.88*Math.pow(travel,1.7);
  const shore=695-167*along-24*Math.sin(along*2.6);
  const base=344+(shore-344)*Math.pow(travel,1.55);
  const breaking=smooth(w.brokenAt,w.brokenAt+.16,local);
  const collapse=smooth(w.brokenAt+.13,1.03,local);
  const crest=(12+perspective*118)*w.energy*(.87+.13*Math.sin(along*7+w.bend));
  const height=crest*(1-collapse*.96)*smooth(0,.12,local);
  const wash=smooth(.88,1.10,local);
  const retreat=smooth(1.12,1.42,local);
  const runup=(34+16*w.energy)*Math.sin(clamp((local-.88)/.54)*Math.PI);
  return {age:local,base,height,breaking,collapse,travel,perspective,wash,retreat,
   shore,runup,alpha:1-smooth(1.25,1.42,local)};
 }
 measure(){return {style:'painted-breakers',time:+this.time.toFixed(3),emitted:this.emitted,
  active:this.waves.length,crests:this.waves.map(w=>{const p=this.pose(w,420);return {id:w.id,age:+p.age.toFixed(3),height:+p.height.toFixed(1),breaking:+p.breaking.toFixed(2),runup:+p.runup.toFixed(1)};})};}
}

export class BreakerStudy {
 constructor(host,before){
  this.canvas=document.createElement('canvas');this.canvas.className='landscape-layer surf-study-layer';
  this.canvas.hidden=true;this.canvas.setAttribute('aria-hidden','true');host.insertBefore(this.canvas,before);
  this.ctx=this.canvas.getContext('2d');
  this.paint=document.createElement('canvas');this.paint.width=W;this.paint.height=H;
  this.pc=this.paint.getContext('2d');this.active=false;this.model=new BreakerSet();
 }
 async load(){
  if(!this.pending)this.pending=Promise.all(['quiet-ocean','ocean-mask','breaker-pigment','swell-pigment','foam-lace'].map(async name=>{
   const im=new Image();im.decoding='async';im.src=new URL(`${name}.png`,ASSETS).href;await im.decode();return [name,im];
  })).then(entries=>this.assets=Object.fromEntries(entries)).catch(error=>{this.pending=null;throw error;});
  return this.pending;
 }
 setActive(active){
  this.active=active;this.canvas.hidden=!active;
  if(active){this.model=new BreakerSet();this.model.advance(21);}
 }
 resize(w,h){this.canvas.width=w;this.canvas.height=h;}
 // A profile through the wave body. Curl moves the lip down and forward while
 // the shoulder stays raised; the signed spans also draw its overturned face.
 profile(v,p){
  const lip=Math.pow(1-v,7),rise=Math.cos(v*Math.PI*.5);
  return p.base-p.height*rise+p.height*p.breaking*.60*lip;
 }
 drawWave(w){
  const c=this.pc,face=this.assets['swell-pigment'],broken=this.assets['breaker-pigment'];
  // Paint from the foot to the lip, so the folding tip occludes its own face.
  const columns=216,dx=W/columns;
  for(let i=0;i<columns;i++){
   const x=i*dx,p=this.model.pose(w,x);
   if(p.age<0||p.age>1.42)continue;
   if(p.height>3&&p.collapse<.96){
    const rows=p.breaking>.01?7:1;
    const sx=((i/columns*.91+w.shift/1000)%1)*face.width;
    for(let j=rows-1;j>=0;j--){
     const v0=j/rows,v1=(j+1)/rows;
     const y0=this.profile(v0,p),y1=this.profile(v1,p),dy=y1-y0;
     const shear=0;
     c.globalAlpha=p.alpha;
     const paint=(image,alpha)=>{
      if(alpha<.003)return;
      c.globalAlpha=p.alpha*alpha;
      const sourceX=sx/face.width*image.width;
      c.save();c.translate(Math.round(x+shear),Math.round(y0));
      if(dy<0)c.scale(1,-1);
      c.drawImage(image,sourceX,v0*image.height,Math.min(image.width-sourceX,dx/W*image.width+1),image.height/rows,
       0,0,Math.ceil(dx+1),Math.max(1,Math.ceil(Math.abs(dy))));c.restore();
     };
     paint(face,1);paint(broken,smooth(.10,.85,p.breaking)*(.55+.45*p.collapse));
    }
   }
   // A persistent foam sheet follows the collapsed wave rather than being
   // flattened into the same sprite as its face. It advances, thins, recedes.
   const foam=this.assets['foam-lace'];
   const amount=smooth(.58,.86,p.age)*(1-smooth(1.12,1.42,p.age));
   if(amount>.001){
    const y=p.base+p.runup*p.wash;
    const spread=(8+36*p.perspective)*(1+p.collapse*.5);
    const scallop=Math.sin(x*.019+w.bend)*4*p.perspective;
    c.globalAlpha=amount*.86;
    const sx=(i/columns*.9+hash(w.id)*.1)*foam.width;
    c.drawImage(foam,sx,0,Math.min(foam.width-sx,foam.width/columns+1),foam.height,
     Math.round(x),Math.round(y-spread*.30+scallop),Math.ceil(dx+1),Math.round(spread));
    // The returning lace has a separate front, exposing wet sand behind it.
    if(p.retreat>0){c.globalAlpha=(1-p.retreat)*.40;c.drawImage(foam,sx,0,Math.min(foam.width-sx,foam.width/columns+1),foam.height,
     Math.round(x),Math.round(y-spread*1.3-p.retreat*24),Math.ceil(dx+1),Math.round(spread*.5));}
   }
  }
  c.globalAlpha=1;
  this.drawSpray(w);
 }
 drawSpray(w){
  const c=this.pc;
  // Ballistic painted-color grains: their birth time is attached to each
  // breaking crest section. Wind moves them together with the cloud field.
  for(let n=0;n<100;n++){
   const x=hash(n+w.id*127)*W,p=this.model.pose(w,x);
   const born=w.born+w.duration*(w.brokenAt+.02+hash(n+33)*.14);
   const t=this.model.time-born;
   if(t<0||t>1.8)continue;
   const launch=this.model.pose({...w,born:w.born+t},x);
   const speed=9+hash(n+12)*17;
   const px=x+t*(this.model.wind*38+hash(n+8)*12);
   const py=launch.base-launch.height*.84-speed*t+13*t*t;
   const size=1+Math.floor(hash(n+6)*2.5);
   c.globalAlpha=(1-t/1.8)*.65;c.fillStyle=n%3?'#dbe8ef':'#a8c0d5';
   c.fillRect(Math.round(px),Math.round(py),size,size);
  }
  c.globalAlpha=1;
 }
 draw(camera,dt,wind){
  if(!this.active||!this.assets)return;
  this.model.advance(dt,wind);
  const c=this.pc;c.clearRect(0,0,W,H);c.imageSmoothingEnabled=false;
  c.drawImage(this.assets['quiet-ocean'],0,0);
  for(const w of [...this.model.waves].reverse())this.drawWave(w);
  c.globalCompositeOperation='destination-in';c.drawImage(this.assets['ocean-mask'],0,0);c.globalCompositeOperation='source-over';
  const ctx=this.ctx;ctx.clearRect(0,0,this.canvas.width,this.canvas.height);ctx.imageSmoothingEnabled=false;
  ctx.drawImage(this.paint,camera.sx,camera.sy,camera.sw,camera.sh,0,0,this.canvas.width,this.canvas.height);
 }
 measure(){return this.active?this.model.measure():null;}
}
