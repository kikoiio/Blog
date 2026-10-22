import {BreakerStudy} from '../src/water/breaker-study.js';
const host=document.querySelector('#study'),art=document.querySelector('#painting');
const motion=new BreakerStudy(host,null);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches,original=false,last=0,raf=0,report=0,dirty=true;
const metrics={frames:0,totalDrawMs:0,maxDrawMs:0};
let camera={sx:0,sy:0,sw:1672,sh:941};
function resize(){
 const scale=Math.max(innerWidth/1672,innerHeight/941);
 camera={sx:(1672-innerWidth/scale)/2,sy:(941-innerHeight/scale)/2,sw:innerWidth/scale,sh:innerHeight/scale};
 motion.resize(innerWidth,innerHeight);motion.draw(camera,0,{x:.48,y:.02});
}
function request(){if(!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
function tick(now){
 raf=0;
 if(!last||now-last>=32){
  const dt=last?(now-last)/1000:0;
  if(!original){const start=performance.now();motion.draw(camera,paused?0:dt,{x:.48+.10*Math.sin(motion.model.time*.13),y:.02});const cost=performance.now()-start;metrics.frames++;metrics.totalDrawMs+=cost;metrics.maxDrawMs=Math.max(metrics.maxDrawMs,cost);}
  last=now;
  if(dirty||now-report>200){host.dataset.state=JSON.stringify({ready:true,paused,original,water:motion.measure(),performance:metrics});report=now;dirty=false;}
 }
 if(!paused&&!original)request();
}
function pause(value){dirty=true;paused=value;document.querySelector('#pause').setAttribute('aria-pressed',String(paused));last=0;request();}
function compare(){dirty=true;original=!original;motion.canvas.hidden=original;document.querySelector('#compare').setAttribute('aria-pressed',String(original));last=0;request();}
document.querySelector('#pause').addEventListener('click',()=>pause(!paused));
document.querySelector('#compare').addEventListener('click',compare);
window.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.target.closest('button,a'))return;if(e.code==='Space'||e.key.toLowerCase()==='p'){e.preventDefault();pause(!paused);}if(e.key.toLowerCase()==='a')compare();});
window.addEventListener('resize',()=>{resize();last=0;request();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else request();});
reduced.addEventListener('change',e=>{if(e.matches)pause(true);});
try{await Promise.all([art.decode(),motion.load()]);motion.setActive(true);resize();pause(paused);}catch(error){host.dataset.state=JSON.stringify({ready:false,error:error.message});console.error(error);}
