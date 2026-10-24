import {VIEWBOX,coastPaths,glacierPaths,project} from './geography.js';
const $=q=>document.querySelector(q);
const app=$('#app'),art=$('#scene-art'),markers=$('#markers'),articleList=$('#articleList=document.querySelector("#article-list")');
const places=await fetch('places.json').then(r=>r.json());
const posts=await fetch('articles.json').then(r=>r.json());
let current=places.find(p=>p.id===location.hash.slice(1))||places[0],currentFile=current.image,preview=current,mapOpen=false,readingOpen=false;
const coords=p=>`${Math.abs(p.lat).toFixed(3)}° N / ${Math.abs(p.lon).toFixed(3)}° W`;
function svg(tag,attrs={}){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n}
function drawMap(){
 const map=$('#map');map.setAttribute('viewBox',`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`);
 for(const [width,opacity] of [[25,.045],[12,.075],[5,.12]])map.append(svg('path',{d:coastPaths.join(' '),fill:'none',stroke:'#7ba6b0','stroke-width':width,opacity,'stroke-linejoin':'round'}));
 const land=svg('path',{d:coastPaths.join(' '),fill:'#dfe8e3',stroke:'#88a097','stroke-width':1.1,'stroke-linejoin':'round'});map.append(land);
 const ice=svg('g');for(const d of glacierPaths)ice.append(svg('path',{d,fill:'#f5f9fb',stroke:'#b3c6ce','stroke-width':.7,opacity:.72}));map.append(ice);
 for(const p of places){
  const [x,y]=project(p.lon,p.lat),b=document.createElement('button');b.type='button';b.className='marker';b.style.left=`${x/VIEWBOX.width*100}%`;b.style.top=`${y/VIEWBOX.height*100}%`;b.dataset.place=p.id;b.dataset.name=p.name;b.setAttribute('aria-label',`${p.zh}，${p.name}，查看这处风景`);b.addEventListener('click',()=>setPreview(p));b.addEventListener('pointerenter',()=>setPreview(p));markers.append(b);
 }
}
function image(file){return `../assets/landscapes/${encodeURIComponent(file)}`}
function setPreview(p){
 preview=p;const variant=p.variants?.find(v=>v[0]===currentFile&&p===current);
 $('#preview-image').src=image(p.image);$('#preview-image').alt=`${p.zh}风景插画`;$('#preview-region').textContent=p.region;$('#preview-title').textContent=p.name;$('#preview-description').textContent=p.description;
 for(const b of markers.children)b.setAttribute('aria-current',String(b.dataset.place===p.id));
}
async function setPlace(p,file=p.image){
 const img=new Image();img.decoding='async';img.src=image(file);await img.decode();
 current=p;currentFile=file;art.src=img.src;art.alt=`${p.zh}的${p.weather}像素风景插画`;
 $('#scene-region').textContent=p.region;$('#scene-title').textContent=p.name;$('#scene-zh').textContent=p.zh;$('#scene-weather').textContent=p.variants?.find(v=>v[0]===file)?.[1]||p.weather;$('#scene-line').textContent=p.line;$('#scene-coordinates').textContent=coords(p);$('#scene-index').textContent=`${places.indexOf(p)+1} / ${places.length}`;
 $('#cycle-weather').hidden=!p.variants?.length;if(location.hash!==`#${p.id}`)history.replaceState({place:p.id},'',`#${p.id}`);
 setPreview(p);document.title=`${p.zh} · Ísland`;
}
function cycleWeather(){
 const list=current.variants||[];if(!list.length)return;const i=list.findIndex(v=>v[0]===currentFile);setPlace(current,list[(i+1)%list.length][0]);
}
function setMap(open){
 mapOpen=open;$('#atlas').hidden=!open;app.dataset.map=open?'':undefined;app.dataset.state=open?'map':'scene';$('#open-map').setAttribute('aria-expanded',String(open));if(open)setPreview(preview);
}
function setReading(open){readingOpen=open;$('#reading').hidden=!open;app.dataset.reading=open?'':undefined;app.dataset.state=open?'reading':'scene';$('#open-index').setAttribute('aria-expanded',String(open))}
function step(delta){const i=(places.indexOf(current)+delta+places.length)%places.length;setPlace(places[i])}
function renderPosts(){
 articleList.replaceChildren();
 for(const [i,p] of posts.entries()){
  const b=document.createElement('button');b.type='button';b.className='article';b.innerHTML=`<strong>${String(i+1).padStart(2,'0')}</strong><span>${p.title}<small>${p.category} · ${p.date} · ${p.minutes} 分钟</small></span><span class="mark">阅读 →</span>`;
  b.addEventListener('click',()=>window.open(`../#article:${p.id}`,'_blank','noopener'));
  articleList.append(b);
 }
}
$('#open-map').addEventListener('click',()=>setMap(!mapOpen));$('#open-index').addEventListener('click',()=>setReading(!readingOpen));
$('#atlas .close').addEventListener('click',()=>setMap(false));$('#reading .close').addEventListener('click',()=>setReading(false));
$('#enter-place').addEventListener('click',()=>{setPlace(preview);setMap(false)});
$('#prev-place').addEventListener('click',()=>step(-1));$('#next-place').addEventListener('click',()=>step(1));$('#cycle-weather').addEventListener('click',cycleWeather);
window.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey||e.target.matches('input,textarea'))return;
 if(e.key==='Escape'){setMap(false);setReading(false)}
 if(e.key.toLowerCase()==='m')setMap(!mapOpen);if(e.key.toLowerCase()==='r')setReading(!readingOpen);
 if(e.key==='ArrowLeft')step(-1);if(e.key==='ArrowRight')step(1);
});
window.addEventListener('hashchange',()=>{const p=places.find(x=>x.id===location.hash.slice(1));if(p)setPlace(p)});
drawMap();renderPosts();await setPlace(current,currentFile);app.dataset.ready='';app.dataset.state='scene';$('#loading').hidden=true;app.setAttribute('aria-label','冰岛图集界面原型');
