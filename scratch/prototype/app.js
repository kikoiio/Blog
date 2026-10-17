import { createLiquidScene } from './liquid-scene.js';

const root=document.documentElement;
const canvas=document.querySelector('#webgl-canvas');
const stage=document.querySelector('#stage');
const graph=document.querySelector('#graph');
const nodes=[...document.querySelectorAll('.node')];
const status=document.querySelector('#engine-status');
const themeButton=document.querySelector('#theme-toggle');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
let engine=null,drag=null,pointer=null,inView=true,disposed=false;
let failure=null;
const now=()=>performance.now();
const local=event=>{const r=stage.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top,time:now()};};

function labels(points){
    points.forEach((p,i)=>{nodes[i].style.left=p.x+'px';nodes[i].style.top=p.y+'px';});
    document.querySelector('#graph-links path').setAttribute('d',
        [1,0,2,3].map((id,i)=>`${i?'L':'M'}${points[id].x},${points[id].y}`).join(' '));
}
function setStatus(){
    status.textContent=failure?'静态装置':motion.matches?'静态装置 · 减少动态':'装置就绪';
}
function theme(dark){
    root.dataset.theme=dark?'dark':'light';
    themeButton.setAttribute('aria-pressed',String(dark));
    themeButton.setAttribute('aria-label',dark?'切换浅色主题':'切换深色主题');
    themeButton.querySelector('.theme-label').textContent=dark?'浅色':'深色';
    engine?.setTheme(dark);
}
function start(){
    if(disposed)return;
    try{
        engine=createLiquidScene(canvas,labels);
        engine.setTheme(root.dataset.theme==='dark');
        engine.reduce(motion.matches);
        engine.resize(stage.clientWidth,stage.clientHeight);
        engine.visibility(inView);
        engine.hiddenState(document.hidden);
        failure=null;
    }catch(error){
        failure=String(error);engine?.dispose();engine=null;canvas.style.opacity='0';
        console.warn('Static artwork fallback:',error);
    }
    setStatus();
}
function ripple(){
    engine?.ripple(.51,.49);
    if(!engine||motion.matches)stage.animate([{filter:'brightness(1.025)'},{filter:'none'}],{duration:250});
}
function moveNode(index,dx,dy,source,point){
    if(engine)engine.moveNode(index,dx,dy);
    else{
        const node=nodes[index];
        node.style.left=Math.max(45,Math.min(stage.clientWidth-45,node.offsetLeft+dx))+'px';
        node.style.top=Math.max(65,Math.min(stage.clientHeight-75,node.offsetTop+dy))+'px';
    }
    const p=point??{x:nodes[index].offsetLeft,y:nodes[index].offsetTop,time:now()};
    const a={x:p.x-dx,y:p.y-dy,time:p.time-16.667};
    engine?.glide(a,p,1.25);
    const r=stage.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent('zima:node-motion',{detail:{x:r.left+p.x,y:r.top+p.y,
        startX:r.left+a.x,startY:r.top+a.y,vx:dx*60,vy:dy*60,source,handled:true}}));
}
themeButton.addEventListener('click',()=>{
    theme(root.dataset.theme!=='dark');
    window.dispatchEvent(new CustomEvent('onColorSchemeChange',{detail:{colorScheme:root.dataset.theme}}));
});
window.addEventListener('onColorSchemeChange',event=>{
    const data=event.detail;
    const scheme=typeof data==='string'?data:data?.colorScheme??data?.scheme;
    if(scheme)theme(/dark|obsidian/.test(scheme));
});
document.querySelector('#ripple-button').addEventListener('click',ripple);

nodes.forEach((node,index)=>{
    node.addEventListener('pointerdown',event=>{
        if(!event.isPrimary||event.button!==0)return;
        event.preventDefault();
        const p=local(event);drag={index,id:event.pointerId,...p};pointer=null;
        node.setPointerCapture(event.pointerId);
    });
    node.addEventListener('keydown',event=>{
        const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
        if(!direction)return;event.preventDefault();
        moveNode(index,direction[0]*12,direction[1]*12,'keyboard');
    });
    node.addEventListener('lostpointercapture',()=>{drag=null;pointer=null;});
});
stage.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||event.button!==0||event.target.closest('button,a'))return;
    const p=local(event);engine?.ripple(p.x/stage.clientWidth,1-p.y/stage.clientHeight);
});
stage.addEventListener('pointermove',event=>{
    if(!event.isPrimary)return;
    const p=local(event);
    if(drag&&drag.id===event.pointerId){
        moveNode(drag.index,p.x-drag.x,p.y-drag.y,'drag',p);Object.assign(drag,p);return;
    }
    // Touch movement scrolls the document; only deliberate node dragging captures it.
    if(event.pointerType==='touch'){pointer=null;return;}
    if(pointer&&p.time-pointer.time<180)engine?.glide(pointer,p);
    pointer=p;
},{passive:true});
stage.addEventListener('pointerleave',()=>{if(!drag)pointer=null;});
function release(){drag=null;pointer=null;}
window.addEventListener('pointerup',release);
window.addEventListener('pointercancel',release);
window.addEventListener('blur',()=>{release();engine?.visibility(false);});
window.addEventListener('focus',()=>engine?.visibility(inView));
window.addEventListener('zima:node-motion',event=>{
    const p=event.detail;
    if(!p||p.handled||!['drag','hover','keyboard'].includes(p.source))return;
    if(![p.x,p.y,p.vx,p.vy].every(Number.isFinite)||Math.hypot(p.vx,p.vy)<70)return;
    const r=stage.getBoundingClientRect();
    if(p.x<r.left||p.x>r.right||p.y<r.top||p.y>r.bottom)return;
    engine?.glide({x:(p.startX??p.x-p.vx/60)-r.left,y:(p.startY??p.y-p.vy/60)-r.top,time:now()-16.667},
        {x:p.x-r.left,y:p.y-r.top,time:now()},1.25);
});
new ResizeObserver(()=>engine?.resize(stage.clientWidth,stage.clientHeight)).observe(stage);
new IntersectionObserver(entries=>{
    inView=entries[0].isIntersecting;engine?.visibility(inView);if(!inView)release();
},{threshold:0}).observe(stage);
motion.addEventListener('change',()=>{release();engine?.reduce(motion.matches);setStatus();});
document.addEventListener('visibilitychange',()=>{release();engine?.hiddenState(document.hidden);});
canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();release();engine?.contextLost();failure='context lost';setStatus();
});
canvas.addEventListener('webglcontextrestored',()=>{engine?.dispose();engine=null;start();});
window.addEventListener('pagehide',()=>{release();engine?.visibility(false);});
window.addEventListener('pageshow',()=>{engine?.visibility(inView);});
window.__zimaDebug=()=>({...(engine?.debug()??{running:false,renderer:'static-fallback'}),failure,
    documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth});
start();theme(root.dataset.theme==='dark');
