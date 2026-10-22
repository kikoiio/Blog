import { MagneticSand } from './magnetic-sand.js';
import { CityWindows } from './city-windows.js';

export class LandscapePlay {
 constructor({host,scene,onEnter,canInteract,reduced,onWake}){
  this.host=host;this.scene=scene;this.onEnter=onEnter;this.canInteract=canInteract;this.reduced=reduced;this.onWake=onWake;
  this.sand=new MagneticSand();this.city=new CityWindows();this.file='';this.pointer=null;this.opening=false;this.delivered=false;this.launches=0;
  this.canvas=document.createElement('canvas');this.canvas.id='play-layer';this.canvas.setAttribute('aria-hidden','true');host.append(this.canvas);this.ctx=this.canvas.getContext('2d');
  this.key=document.createElement('button');this.key.id='scene-portal';this.key.hidden=true;this.key.type='button';this.key.setAttribute('aria-label','进入现有博客文章');this.key.setAttribute('aria-haspopup','dialog');host.append(this.key);
  this.key.addEventListener('click',()=>{if(this.canInteract())this.start();});
  this.key.addEventListener('focus',()=>{if(this.canInteract()){const p=this.keyPoint();this.model?.move(p,0,0);this.onWake();}});
  this.key.addEventListener('blur',()=>{if(!this.pointer)this.model?.leave();});
  host.addEventListener('pointermove',event=>this.move(event));
  host.addEventListener('pointerdown',event=>this.down(event));
  host.addEventListener('pointerup',event=>this.up(event));
  host.addEventListener('pointercancel',event=>this.up(event,true));
  host.addEventListener('lostpointercapture',event=>{if(this.pointer?.id===event.pointerId)this.up(event,true);});
  host.addEventListener('pointerleave',()=>{if(!this.pointer){this.model?.leave();host.classList.remove('play-near');}});
  window.addEventListener('blur',()=>this.cancel());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.cancel();});
 }
 get model(){return this.sand.active?this.sand:this.city.active?this.city:null;}
 get busy(){return this.opening||!!this.pointer;}
 configure(file,image){
  this.cancel();this.file=file;this.sand.configure(file);this.city.configure(file,image);this.opening=false;this.delivered=false;
  this.key.hidden=!this.model;this.host.dataset.play=this.sand.active?'sand':this.city.active?'city':'none';this.resize();
 }
 keyPoint(){
  if(this.sand.active)return {x:.67,y:.85};
  const c=this.scene.camera,visible=this.city.keyPoints?.filter(p=>p.x*1672>c.sx+25&&p.x*1672<c.sx+c.sw-25&&p.y*941>c.sy+25&&p.y*941<c.sy+c.sh-25)||[];
  const preferred=this.city.keyPoint||{x:.67,y:.54};
  return visible.sort((a,b)=>Math.abs(a.x-preferred.x)-Math.abs(b.x-preferred.x))[0]||preferred;
 }
 resize(){
  const dpr=Math.min(devicePixelRatio||1,1.3);this.canvas.width=Math.round(innerWidth*dpr);this.canvas.height=Math.round(innerHeight*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);
  const p=this.keyPoint(),c=this.scene.camera;
  this.key.style.left=`${(p.x*1672-c.sx)/c.sw*innerWidth}px`;this.key.style.top=`${(p.y*941-c.sy)/c.sh*innerHeight}px`;
 }
 point(event){return this.scene.uv(event.clientX/innerWidth,event.clientY/innerHeight);}
 move(event){
  if(!this.model||!this.canInteract()||this.opening)return;
  if(this.pointer&&this.pointer.id!==event.pointerId)return;
  const p=this.point(event),prev=this.pointer?.last||p;
  this.model.move(p,(p.x-prev.x)*1672,(p.y-prev.y)*941);
  const hit=this.sand.active?this.sand.hit(p):this.city.hit(p)>=0;
  this.host.classList.toggle('play-near',hit);
  if(this.pointer){this.pointer.last=p;event.stopPropagation();event.preventDefault();}
  this.onWake();
 }
 down(event){
  if(!this.model||!this.canInteract()||this.opening||this.pointer||event.button!==0||event.target===this.key)return;
  const p=this.point(event);if(!this.model.down(p))return;
  this.pointer={id:event.pointerId,last:p,start:event.timeStamp};this.host.setPointerCapture(event.pointerId);event.preventDefault();event.stopPropagation();this.onWake();
 }
 up(event,cancel=false){
  if(!this.pointer||this.pointer.id!==event.pointerId)return;
  const held=this.pointer;this.pointer=null;if(!cancel)this.model.move(this.point(event),0,0);const enter=this.model.up(cancel||!this.canInteract(),event.timeStamp-held.start);
  try{if(this.host.hasPointerCapture(held.id))this.host.releasePointerCapture(held.id);}catch{}
  event.stopPropagation();if(enter)this.start();this.onWake();
 }
 cancel(){
  if(this.pointer){const id=this.pointer.id;this.pointer=null;this.model?.up(true);try{if(this.host.hasPointerCapture(id))this.host.releasePointerCapture(id);}catch{}}
  this.model?.leave();this.host.classList.remove('play-near');
 }
 start(){
  if(!this.model||this.opening||!this.canInteract())return;
  this.opening=true;this.delivered=false;this.launches++;this.host.classList.remove('play-near');
  if(this.reduced()){this.deliver();return;}
  if(this.model.startOpening()===false){this.opening=false;return;}this.onWake();
 }
 deliver(){if(this.delivered)return;this.delivered=true;this.opening=false;this.onEnter(this.sand.active?'sand':'city');}
 restore(){this.opening=false;this.delivered=false;this.model?.reset();this.cancel();this.onWake();}
 render(dt,paused){
  const ctx=this.ctx;ctx.clearRect(0,0,innerWidth,innerHeight);const model=this.model;if(!model)return;
  if(!paused||this.opening||this.pointer||this.city.active){const done=model.advance(dt,this.reduced());if(done&&this.opening)this.deliver();}
  model.draw(ctx,this.scene.camera,innerWidth,innerHeight);
 }
 measure(){return {kind:this.host.dataset.play||'none',opening:this.opening,launches:this.launches,sand:this.sand.measure(),city:this.city.measure(),pointer:this.city.active?this.city.pointer:this.sand.pointer};}
}
