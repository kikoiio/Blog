import { SurfState } from './water/surf-state.js';
import { domains, waterSettings, waterWeight } from './water/water-domain.js';
import { PaintedWater } from './water/painted-water.js';
import { WaterSurface } from './water/water-surface.js';
import { Wind, Seabirds } from './environment.js';
import { createSkyLayer } from './sky-layer.js';
import { profiles, environmentAt, ambientSettings } from './scene-profiles.js';

export const ART = new URL('../assets/landscapes/', import.meta.url);
export { waterAtFrame } from './water/water-domain.js';
export class FrameScene {
 constructor(host,img,weather){
  this.host=host;this.img=img;this.weather=weather;this.ctx=weather.getContext('2d');this.file='';this.image=null;this.cache=new Map();this.time=0;this.wind=new Wind();this.birds=new Seabirds();this.profile=null;this.cloudImage=null;this.cloudRequest=null;this.setVersion=0;this.water=new PaintedWater();this.surf=null;this.camera={sx:0,sy:0,sw:1672,sh:941};this.wet=false;this.surface=null;this.status='ready';
  try{this.surface=new WaterSurface();host.insertBefore(this.surface.canvas,weather);}catch{this.status='art-only';}
  this.drops=Array.from({length:85},(_,i)=>({x:((i*73.9)%101)/101,y:((i*37.7)%97)/97,z:.3+(i%7)/9}));
  this.resize();
 }
 async load(file){
  if(!this.cache.has(file)){const image=new Image();image.decoding='async';image.src=new URL(file,ART).href;const pending=image.decode().then(()=>image);this.cache.set(file,pending);pending.catch(()=>this.cache.delete(file));}
  const image=await this.cache.get(file);
  // Retain only the current and a small number of recently used decoded frames.
  if(this.cache.size>3){for(const key of this.cache.keys()){if(key!==file&&key!==this.file){this.cache.delete(key);break;}}}
  return image;
 }
 async set(file){
  const version=++this.setVersion,image=await this.load(file),profile=profiles[file];
  let clouds=null;
  if(profile?.clouds){
   if(!this.cloudRequest){const layer=new Image();layer.decoding='async';layer.src=profile.clouds.href;this.cloudRequest=layer.decode().then(()=>layer).catch(()=>{this.cloudRequest=null;return null;});}
   clouds=await this.cloudRequest;
  }
  if(version!==this.setVersion)return;
  this.file=file;this.image=image;this.profile=profile;this.cloudImage=clouds;this.birds=new Seabirds(profile?.perches);this.wind.configure(profile?.wind);this.img.src=image.src;this.configureWater();this.resize();this.render(0);
 }
 configureWater(){
  this.wet=!!domains[this.file]&&!!this.surface;
  if(!this.surface)return;
  this.surface.canvas.hidden=!this.wet&&!this.profile;
  if(this.surface.canvas.hidden){this.surf=null;this.surface.material?.destroy();this.surface.material=null;for(const texture of this.surface.textures)this.surface.gl.deleteTexture(texture);this.surface.textures=[];return;}
  // One continuous spatial mask includes the painting's foam and water alike.
  const mask=document.createElement('canvas');mask.width=836;mask.height=471;
  const c=mask.getContext('2d'),data=c.createImageData(mask.width,mask.height);
  for(let y=0;y<mask.height;y++)for(let x=0;x<mask.width;x++)data.data[(y*mask.width+x)*4+3]=Math.round(waterWeight(this.file,(x+.5)/mask.width,(y+.5)/mask.height)*255);
  c.putImageData(data,0,0);
  const environment=document.createElement('canvas');environment.width=this.profile?836:1;environment.height=this.profile?471:1;
  if(this.profile){
   const ec=environment.getContext('2d',{willReadFrequently:true});ec.drawImage(this.image,0,0,environment.width,environment.height);const pixels=ec.getImageData(0,0,environment.width,environment.height);
   for(let y=0;y<environment.height;y++)for(let x=0;x<environment.width;x++){const k=(y*environment.width+x)*4,r=pixels.data[k],g=pixels.data[k+1],b=pixels.data[k+2],region=environmentAt(this.file,(x+.5)/environment.width,(y+.5)/environment.height);const green=g-b>16&&r-b>14&&g>r*.82;
    // Geometry gates every channel; pigment qualification keeps dark rocks still.
    const pale=Math.max(0,Math.min(1,(Math.min(r,g,b)-90)/90));
    const neutral=Math.max(0,1-(Math.max(r,g,b)-Math.min(r,g,b))/95);
    pixels.data[k]=green?Math.round(region.grassWeight*255):0;
    pixels.data[k+1]=Math.round(region.sky*255);
    // B packs mist (0..127) or falling water (128..255). A stays opaque:
    // transparent Canvas ImageData would discard the other RGB mask channels.
    const flow=region.flow*pale,mist=region.mist*pale*neutral;
    pixels.data[k+2]=flow>.001?128+Math.round(flow*127):Math.round(mist*127);
    pixels.data[k+3]=255;}
   ec.putImageData(pixels,0,0);
  }
  this.surf=null;
  if(this.file==='04-black-beach.png'){
   this.surf=new SurfState(144,88);
   const wet=new Float32Array(this.surf.width*this.surf.rows);
   for(let y=0;y<this.surf.rows;y++)for(let x=0;x<this.surf.width;x++)wet[y*this.surf.width+x]=waterWeight(this.file,(x+.5)/this.surf.width,(y+.5)/this.surf.rows);
   this.surf.configure({wet,width:this.surf.width,height:this.surf.rows,horizon:waterSettings(this.file).horizon,axis:waterSettings(this.file).axis});
   // Establish incoming water before the scene is revealed; not a playback loop.
   for(let step=0;step<3;step++)this.surf.advance(4,this.wind.base);
  }
  const sky=this.cloudImage||(this.profile?createSkyLayer(this.image,this.profile,environment):this.image);
  this.motionChannels={sky:!!this.profile?.skyline?.length,grass:!!this.profile?.grass?.length,mist:!!this.profile?.mist?.length,flow:!!this.profile?.flow?.length,rain:!!this.profile?.rain};
  this.surface.configure(mask,this.image,environment,sky,waterSettings(this.file),!!this.cloudImage,ambientSettings(this.file),this.surf);
 }
 resize(){
  const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,1.3);this.weather.width=Math.round(w*dpr);this.weather.height=Math.round(h*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);
  this.surface?.resize(Math.round(w*Math.min(dpr,1)),Math.round(h*Math.min(dpr,1)));
  if(this.image){const scale=Math.max(w/this.image.width,h/this.image.height);this.camera={sx:(this.image.width-w/scale)/2,sy:(this.image.height-h/scale)/2,sw:w/scale,sh:h/scale};}
 }
 uv(x,y){return {x:(this.camera.sx+x*this.camera.sw)/1672,y:(this.camera.sy+y*this.camera.sh)/941};}
 render(dt,paused=false){
  if(!paused){
   this.time+=dt;this.wind.advance(dt);this.surf?.advance(dt,this.wind.velocity);this.birds.advance(dt,this.wind.velocity);
   if(this.wet||this.profile?.flow?.length)this.water.advance(dt,this.wind.velocity);
  }
  if(this.surface&&!this.surface.canvas.hidden)this.surface.draw(this.camera,this.wind,this.time,this.water,paused?0:dt);
  const ctx=this.ctx,w=innerWidth,h=innerHeight;ctx.clearRect(0,0,w,h);
  const rainy=this.profile?.rain;
  if(rainy){
   ctx.lineWidth=.7;ctx.strokeStyle='rgba(230,241,245,.18)';ctx.beginPath();
   for(const drop of this.drops){
    const source=this.uv(drop.x,drop.y),local=this.wind.sample(source.x,source.y),step=paused?0:dt;
    // Integrate velocity; changing wind never teleports the rain to a new phase.
    drop.x=((drop.x+step*local.x*.035*drop.z)%1+1)%1;
    drop.y=(drop.y+step*(.16+drop.z*.11))%1;
    const x=drop.x*w,y=drop.y*h,len=6+drop.z*11;
    ctx.moveTo(x,y);ctx.lineTo(x+local.x*len*.7,y+len);
   }
   ctx.stroke();
  }
  this.birds.draw(ctx,this.camera,w,h,this.time);
 }
 measure(){return {file:this.file,mode:this.status,water:this.surf?{style:'propagating-surf',materialTime:this.surface.material?.time||0,...this.surf.measure()}:this.wet||this.profile?.flow?.length?this.water.measure():null,environment:{layered:!!this.profile,climate:this.profile?.climate,clouds:!!this.cloudImage,channels:this.motionChannels,wind:this.wind.measure(),birds:this.birds.measure()},camera:this.camera,time:+this.time.toFixed(3)};}
}
