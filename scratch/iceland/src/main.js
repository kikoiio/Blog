import { elapsedSeconds } from './animation-clock.js';
import { VIEWBOX, coastPaths, glacierPaths, project } from './geography.js';
import { places } from './places.js';
import { FrameScene, ART } from './scene.js';
import { createReader } from './reader.js';

const $=q=>document.querySelector(q), clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),root=document.documentElement,atlas=$('#atlas'),world=$('#world'),roll=$('#scroll-roll');
const scene=new FrameScene($('#landscape'),$('#landscape-art'),$('#weather-layer'));
const icons={sun:'<circle cx="12" cy="12" r="3.5"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',rain:'<path d="M5 14a4 4 0 0 1 0-8 5 5 0 0 1 9-1 4.5 4.5 0 1 1 3 9H5m3 3-1 3m6-3-1 3m6-3-1 3"/>'};
const coords=p=>`${Math.abs(p.lat).toFixed(3)}° N / ${Math.abs(p.lon).toFixed(3)}° W`;
let saved=[];try{saved=JSON.parse(localStorage.getItem('aries-iceland-stops')||'[]');if(!Array.isArray(saved))saved=[];}catch{}
const visited=new Set(saved.filter(id=>places.some(p=>p.id===id)));
const initial=places.find(p=>p.id===location.hash.slice(1))||places[0];
const initialFile=initial.id==='reykjavik'&&new URLSearchParams(location.search).get('weather')==='clear'?'02-city-clear.png':initial.image;
let current=initial,preview=initial,progress=0,target=0,lastTick=0,lastPaint=0,raf=0,selection=0,loading=false,readerOpen=false,paused=reduced.matches,focusOnOpen=false,wasOpen=false,sceneFile=initial.image;
let gesture=null,ignoreRollClickUntil=0,lastReport=0,stateDirty=true;
const waiters=[];
const reader=createReader(open=>{readerOpen=open;$('#folio-open').inert=progress>.025;stateDirty=true;lastTick=lastPaint=0;requestLoop();});

function svgNode(tag,attrs={}){const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);return node;}
function renderMap(){
 const svg=$('#iceland-map');svg.setAttribute('viewBox',`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`);
 const defs=svgNode('defs'),shape=svgNode('path',{id:'island-shape',d:coastPaths.join(' ')});defs.append(shape);svg.append(defs);
 const grid=svgNode('g',{fill:'none',stroke:'#697e73','stroke-width':'.65','stroke-dasharray':'2 5',opacity:'.18'});
 for(const lat of [64,65,66]){let d='';for(let lon=-26;lon<=-12;lon+=.2){const [x,y]=project(lon,lat);d+=(d?'L':'M')+x+','+y;}grid.append(svgNode('path',{d}));const [x,y]=project(-24.7,lat);const label=svgNode('text',{x,y:y-7,fill:'#7c8f81',stroke:'none','font-size':'11'});label.textContent=`${lat}° N`;grid.append(label);}
 for(const lon of [-24,-22,-20,-18,-16,-14]){let d='';for(let lat=63;lat<=67;lat+=.1){const [x,y]=project(lon,lat);d+=(d?'L':'M')+x+','+y;}grid.append(svgNode('path',{d}));}svg.append(grid);
 for(const [width,opacity] of [[25,.025],[13,.04],[5,.08]])svg.append(svgNode('use',{href:'#island-shape',fill:'none',stroke:'#597a76','stroke-width':width,opacity,'stroke-linejoin':'round'}));
 svg.append(svgNode('use',{href:'#island-shape',fill:'#d5d8c9',stroke:'#6d8174','stroke-width':'1.15','stroke-linejoin':'round'}));
 const ice=svgNode('g',{fill:'#eef1e9',stroke:'#a9b8b0','stroke-width':'.8','fill-rule':'evenodd'});for(const d of glacierPaths)ice.append(svgNode('path',{d}));svg.append(ice);
 const ocean=svgNode('text',{x:150,y:625,fill:'#81918b','font-size':22,'font-family':'Georgia,serif','font-style':'italic','letter-spacing':3,opacity:'.65'});ocean.textContent='北大西洋';svg.append(ocean);
 const north=svgNode('g',{transform:'translate(945 80)',stroke:'#7b8878',fill:'none','stroke-width':1});north.append(svgNode('path',{d:'M0 28V-14m-5 11 5-11 5 11M-9 16H9'}));const n=svgNode('text',{x:0,y:-23,'text-anchor':'middle',fill:'#74826f',stroke:'none','font-size':12,'font-family':'Georgia,serif'});n.textContent='N';north.append(n);svg.append(north);
 const offsets={reykjavik:[-12,20,'right'],'seydisfjordur-harbor':[-3,-46,'right'],reydarfjordur:[-1,22,'right'],reynisfjara:[-18,24,'right'],'jokulsarlon-outflow':[23,17,'left'],skaftafellsjokull:[-17,-43,'right'],maelifell:[-9,30,'right'],landmannalaugar:[-17,-41,'right'],dettifoss:[21,-23,'left'],'askja-odadahraun':[18,20,'left']};
 for(const place of places){
  const [x,y]=project(place.lon,place.lat),button=document.createElement('button');button.type='button';button.className='map-marker';button.dataset.place=place.id;button.style.left=`${x/VIEWBOX.width*100}%`;button.style.top=`${y/VIEWBOX.height*100}%`;button.setAttribute('aria-label',`${place.zh}，${place.name}，查看风景`);button.setAttribute('aria-current',String(place.id===current.id));
  const label=document.createElement('span');label.className='marker-label';label.textContent=place.id==='jokulsarlon-outflow'?'Jökulsárlón':place.id==='askja-odadahraun'?'Askja':place.name;const zh=document.createElement('small');zh.textContent=place.id==='askja-odadahraun'?'火山与熔岩荒原':place.zh;label.append(zh);
  const [dx,dy,preferredSide]=offsets[place.id]||[x>650?-8:26,y<100?30:-15,x>650?'right':'left'];const side=innerWidth<781&&x>740?'right':preferredSide;label.style.top=`${dy}px`;if(side==='right'){label.style.left='auto';label.style.right=`${42-dx}px`;label.style.textAlign='right';}else label.style.left=`${dx}px`;
  const leader=svgNode('svg',{'class':'marker-leader','aria-hidden':'true'});leader.append(svgNode('path',{d:`M21 21L${side==='right'?dx:dx-3} ${dy+8}`}));button.dataset.labelDx=dx;button.dataset.labelDy=dy;button.dataset.labelSide=preferredSide;button.append(leader,label);button.addEventListener('focus',()=>setPreview(place));button.addEventListener('click',event=>{const chosen=event.detail>0?nearestMarker(event.clientX,event.clientY)?.place||place:place;if(innerWidth<781)setPreview(chosen);else selectPlace(chosen);});
  button.addEventListener('keydown',event=>{if(!event.key.startsWith('Arrow'))return;event.preventDefault();const direction={ArrowRight:[1,0],ArrowLeft:[-1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];let nearest=null,best=Infinity;for(const candidate of places){if(candidate.id===place.id)continue;const [cx,cy]=project(candidate.lon,candidate.lat),dx=cx-x,dy=cy-y,dot=dx*direction[0]+dy*direction[1];if(dot<=0)continue;const distance=Math.hypot(dx,dy),score=distance*(1+2*(1-dot/distance));if(score<best){best=score;nearest=candidate;}}if(nearest)$(`[data-place="${nearest.id}"]`).focus({preventScroll:true});});
  $('#map-markers').append(button);
 }
}
function nearestMarker(x,y){
 let nearest=null;for(const place of places){const button=$(`[data-place="${place.id}"]`);if(button.hidden)continue;const rect=button.getBoundingClientRect(),distance=Math.hypot(x-rect.x-rect.width/2,y-rect.y-rect.height/2);if(!nearest||distance<nearest.distance)nearest={place,distance};}return nearest;
}
$('#map-markers').addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;const near=nearestMarker(event.clientX,event.clientY);if(near&&near.distance<24&&near.place.id!==preview.id)setPreview(near.place);});
function setPreview(place){
 stateDirty=true;
 preview=place;for(const button of document.querySelectorAll('.map-marker'))button.classList.toggle('preview',button.dataset.place===place.id);const note=place;$('#preview-title').textContent=place.name;$('#preview-zh').textContent=place.zh;$('#preview-region').textContent=note.region;$('#preview-description').textContent=note.description;$('#preview-coordinates').textContent=coords(place);$('#preview-image').src=new URL(place.image,ART).href;$('#preview-image').alt=`${place.zh}的风景插画`;$('.preview-stamp').textContent=place.id===current.id?'此刻':visited.has(place.id)?'曾停留':'远方';
}
function updateVisited(){
 visited.add(current.id);try{localStorage.setItem('aries-iceland-stops',JSON.stringify([...visited]));}catch{}
 for(const button of document.querySelectorAll('.map-marker')){button.classList.toggle('visited',visited.has(button.dataset.place));button.setAttribute('aria-current',String(button.dataset.place===current.id));}
 $('#visited-caption').textContent=`${visited.size} 处停留`;$('#map-visited').textContent=`${visited.size} / ${places.length} 处停留`;
}
function updateSceneUI(file){
 sceneFile=file;stateDirty=true;const note=current,variant=note.variants?.find(v=>v[0]===file),weather=variant?.[1]||note.weather;
 $('#scene-title').textContent=current.name;$('#scene-zh').textContent=current.zh;$('#scene-region').textContent=note.region;$('#scene-weather').textContent=weather;$('#scene-coordinates').textContent=coords(current);$('#scene-line').textContent=note.line;$('#landscape').setAttribute('aria-label',`${current.zh}，${weather}，像素风景插画`);
 const options=$('#scene-weather-options');options.replaceChildren();for(const [name,label,icon] of note.variants||[]){const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`切换为${label}`);button.setAttribute('aria-pressed',String(name===file));button.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[icon]}</svg>`;button.addEventListener('click',()=>selectPlace(current,name));options.append(button);}
 updateVisited();setPreview(current);document.title=`${current.zh} · Ísland`;
}
function fitMap(){$('.atlas-footer-note').textContent=innerWidth<781?'点选地点，轻触风景进入。':'风景各有天气，文字留在途中。';const box=$('.cartography'),drawing=$('.map-drawing'),legend=$('.map-legend');const height=Math.max(80,box.clientHeight-legend.offsetHeight-14),width=Math.min(box.clientWidth,height*VIEWBOX.width/VIEWBOX.height);drawing.style.width=`${width}px`;drawing.style.height=`${width*VIEWBOX.height/VIEWBOX.width}px`;
 for(const button of document.querySelectorAll('.map-marker')){const dx=Number(button.dataset.labelDx),dy=Number(button.dataset.labelDy),side=innerWidth<781&&parseFloat(button.style.left)>74?'right':button.dataset.labelSide,label=button.querySelector('.marker-label');label.style.left=side==='right'?'auto':`${dx}px`;label.style.right=side==='right'?`${42-dx}px`:'auto';label.style.textAlign=side==='right'?'right':'left';button.querySelector('.marker-leader path').setAttribute('d',`M21 21L${side==='right'?dx:dx-3} ${dy+8}`);}
}
function applyMap(){
 const edge=atlas.clientHeight*progress;root.style.setProperty('--edge',`${edge.toFixed(2)}px`);root.style.setProperty('--opening',progress.toFixed(5));
 atlas.dataset.unrolled=String(progress>.997);
 const open=progress>.025;atlas.inert=!open;atlas.setAttribute('aria-hidden',String(!open));world.inert=open;$('#folio-open').inert=open;document.body.classList.toggle('map-open',open);$('#map-veil').style.pointerEvents=open?'auto':'none';
 for(const control of [roll,$('#map-open')])control.setAttribute('aria-expanded',String(open));roll.setAttribute('aria-label',open?'卷起冰岛地图':'展开冰岛地图');
 if(open&&!wasOpen){if(world.contains(document.activeElement))roll.focus({preventScroll:true});setPreview(current);}if(!open&&wasOpen){if(atlas.contains(document.activeElement)||document.activeElement===roll)$('#map-open').focus({preventScroll:true});}
 wasOpen=open;
 if(progress>.997&&focusOnOpen){focusOnOpen=false;$(`[data-place="${current.id}"]`).focus({preventScroll:true});}
}
function requestLoop(){if(!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
function setTarget(value,focus=false){stateDirty=true;target=clamp(value);if(focus&&target===1)focusOnOpen=true;if(reduced.matches){progress=target;applyMap();}requestLoop();}
function waitForMap(){if(progress>.997)return Promise.resolve();return new Promise(resolve=>{waiters.push(resolve);requestLoop();});}
async function selectPlace(place,file=place.image,recordHistory=true){
 const token=++selection;loading=true;atlas.setAttribute('aria-busy','true');setPreview(place);$('.preview-instruction').textContent='正在打开这处风景…';setTarget(1);
 try{
  await scene.load(file);await waitForMap();if(token!==selection)return;
  await scene.set(file);if(token!==selection)return;current=place;updateSceneUI(file);if(recordHistory&&location.hash!==`#${place.id}`)history.pushState({place:place.id},'',`#${place.id}`);
  $('#announcement').textContent=`抵达${place.zh}，${$('#scene-weather').textContent}。`;
  await new Promise(resolve=>requestAnimationFrame(resolve));if(token!==selection)return;loading=false;atlas.setAttribute('aria-busy','false');$('.preview-instruction').textContent='在地图上选择一处停留。';setTarget(0);lastPaint=0;
 }catch(error){if(token!==selection)return;loading=false;atlas.setAttribute('aria-busy','false');$('.preview-instruction').textContent='风景未能载入，请再选一次。';$('#announcement').textContent='风景未能载入，保留原处。';console.error(error);}
}
function tick(now){
 raf=0;const dt=lastTick?Math.min(.5,(now-lastTick)/1000):1/60;lastTick=now;
 if(!readerOpen){const gap=target-progress;if(Math.abs(gap)>.0002){progress=reduced.matches?target:progress+gap*(1-Math.exp(-dt*11));if(Math.abs(target-progress)<.0002){progress=target;stateDirty=true;}applyMap();}
  if(progress>.997){for(const resolve of waiters.splice(0))resolve();}
  if(progress<.995&&now-lastPaint>=32){const frameDt=elapsedSeconds(now,lastPaint);scene.render(paused?0:frameDt,paused);lastPaint=now;}else if(progress>=.995)lastPaint=0;
 }
 if(stateDirty||now-lastReport>250){world.dataset.state=JSON.stringify({ready:world.classList.contains('ready'),place:current.id,preview:preview.id,places:places.length,progress:+progress.toFixed(4),target,loading,paused,readerOpen,folio:reader.measure(),interaction:'ambient-only',visited:[...visited],scene:scene.measure()});lastReport=now;stateDirty=false;}
 if((Math.abs(target-progress)>.0002||loading||(!paused&&!readerOpen&&progress<.995))&&!readerOpen)requestLoop();
}
function pause(value){stateDirty=true;paused=value;$('#pause').setAttribute('aria-pressed',String(value));$('#pause').setAttribute('aria-label',value?'恢复环境动态':'暂停环境动态');lastTick=0;lastPaint=0;requestLoop();}
window.addEventListener('wheel',event=>{if(reader.dialog.open||event.ctrlKey||event.metaKey)return;event.preventDefault();if(loading)return;const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);setTarget(target+clamp(delta,-200,200)/Math.max(520,innerHeight*.9));},{passive:false});
$('#preview-enter').addEventListener('click',()=>selectPlace(preview));
$('#map-open').addEventListener('click',()=>setTarget(1,true));$('#map-close').addEventListener('click',()=>{if(!loading)setTarget(0);});$('#map-veil').addEventListener('click',()=>{if(!loading)setTarget(0);});roll.addEventListener('click',()=>{if(performance.now()<ignoreRollClickUntil||loading)return;setTarget(target>.5?0:1,true);});
roll.addEventListener('pointerdown',event=>{if(event.button!==0||loading)return;event.stopPropagation();gesture={id:event.pointerId,y:event.clientY,start:progress,kind:'roll',moved:false};target=progress;roll.setPointerCapture(event.pointerId);});
const overControl=event=>!!event.target.closest('button,a,dialog,.scene-caption');
window.addEventListener('pointerdown',event=>{
 if(gesture||loading||readerOpen||event.pointerType==='mouse'||overControl(event))return;
 gesture={id:event.pointerId,x:event.clientX,y:event.clientY,start:progress,kind:'touch',axis:null,moved:false};
});
window.addEventListener('pointermove',event=>{
 if(gesture&&gesture.id===event.pointerId){
  const dy=event.clientY-gesture.y,dx=event.clientX-(gesture.x??event.clientX);
  if(gesture.kind==='roll'||gesture.axis==='vertical'||Math.abs(dy)>Math.abs(dx)*1.3&&Math.abs(dy)>8){
   gesture.axis='vertical';if(Math.abs(dy)>5)gesture.moved=true;
   if(gesture.moved){event.preventDefault();progress=target=clamp(gesture.start+dy/(atlas.clientHeight||1)*(gesture.kind==='roll'?1:-1));applyMap();requestLoop();}
  }else if(gesture.axis==='horizontal'||Math.abs(dx)>8){
   gesture.axis='horizontal';gesture.moved=true;
  }
  return;
 }
},{passive:false});
function endGesture(event){if(!gesture||event.pointerId!==gesture.id)return;if(gesture.moved)ignoreRollClickUntil=performance.now()+400;if(roll.hasPointerCapture(event.pointerId))roll.releasePointerCapture(event.pointerId);gesture=null;requestLoop();}
window.addEventListener('pointerup',endGesture);window.addEventListener('pointercancel',endGesture);window.addEventListener('blur',()=>{gesture=null;});
window.addEventListener('keydown',event=>{
 if(readerOpen||event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input,textarea,[contenteditable=true]'))return;
 if(event.key==='Tab'&&progress>.025){const edge=atlas.clientHeight*progress;const controls=[...atlas.querySelectorAll('button:not(:disabled),a[href]'),roll].filter(control=>!control.hidden&&(control===roll||(control.getBoundingClientRect().width>0&&control.getBoundingClientRect().bottom<edge-5)));const first=controls[0],last=controls.at(-1);if(event.shiftKey&&(document.activeElement===first||!controls.includes(document.activeElement))){event.preventDefault();last?.focus({preventScroll:true});}else if(!event.shiftKey&&(document.activeElement===last||!controls.includes(document.activeElement))){event.preventDefault();first?.focus({preventScroll:true});}return;}
 if(event.repeat)return;
 if(event.key==='Escape'){if(!loading){event.preventDefault();setTarget(0);}}
 else if(event.key.toLowerCase()==='m'){event.preventDefault();if(!loading)setTarget(target>.5?0:1,true);}
 else if(event.key.toLowerCase()==='p'){event.preventDefault();pause(!paused);}
 else if(event.key==='PageDown'){event.preventDefault();if(!loading)setTarget(target+.35);}
 else if(event.key==='PageUp'){event.preventDefault();if(!loading)setTarget(target-.35);}
});
$('#pause').addEventListener('click',()=>pause(!paused));$('#home').addEventListener('click',event=>{event.preventDefault();if(current.id!=='reykjavik')selectPlace(places[0]);});
window.addEventListener('popstate',()=>{const place=places.find(p=>p.id===location.hash.slice(1));if(place&&place.id!==current.id)selectPlace(place,place.image,false);});
window.addEventListener('resize',()=>{fitMap();scene.resize();applyMap();lastPaint=0;requestLoop();});document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;gesture=null;}else{lastTick=lastPaint=0;requestLoop();}});reduced.addEventListener('change',event=>{if(event.matches)pause(true);});
renderMap();fitMap();setPreview(initial);updateSceneUI(initialFile);applyMap();
scene.set(initialFile).then(()=>{updateSceneUI(initialFile);world.classList.add('ready');history.replaceState({place:current.id},'',`#${current.id}`);pause(paused);$('#announcement').textContent='风景已打开。滚动或按 M 展开冰岛地图。';}).catch(error=>{$('#loading').textContent='风景未能载入，请刷新重试。';console.error(error);});
