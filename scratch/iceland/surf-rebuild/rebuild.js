import {createSurface} from './geometry.js';
import {vertex,fragment} from './material.js';
const host=document.querySelector('#study'),art=document.querySelector('#painting');
const canvas=document.createElement('canvas');canvas.id='surface';canvas.setAttribute('aria-hidden','true');host.append(canvas);
const gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true});
let camera,mode=0,original=false,draws=0;
function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function draw(){
 if(!gl)return;
 const scale=Math.max(innerWidth/1672,innerHeight/941);
 camera=[(1672-innerWidth/scale)/2,(941-innerHeight/scale)/2,innerWidth/scale,innerHeight/scale];
 canvas.width=innerWidth;canvas.height=innerHeight;gl.viewport(0,0,canvas.width,canvas.height);
 gl.useProgram(window.study.program);gl.uniform4fv(window.study.uniforms.camera,camera);gl.uniform2f(window.study.uniforms.viewport,canvas.width,canvas.height);gl.uniform1i(window.study.uniforms.mode,mode);
 gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawElements(gl.TRIANGLES,window.study.mesh.indices,gl.UNSIGNED_INT,0);gl.finish();draws++;
 host.dataset.state=JSON.stringify({ready:true,original,mode,draws,webglError:gl.getError(),mesh:window.study.mesh,camera});
}
function compare(){original=!original;canvas.hidden=original;document.querySelector('#compare').setAttribute('aria-pressed',String(original));draw();}
async function load(path){const im=new Image();im.src=new URL(path,import.meta.url).href;await im.decode();return im;}
try{
 if(!gl)throw Error('WebGL 2 unavailable');
 const [mask]=await Promise.all([load('../assets/layers/reynisfjara/ocean-mask.png'),art.decode()]);
 const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 gl.useProgram(program);
 const geometry=createSurface(),buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,geometry.data,gl.STATIC_DRAW);
 for(const [index,name] of ['position','normal','facts'].entries()){const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,36,index*12);}
 const indices=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,geometry.indices,gl.STATIC_DRAW);
 for(const [unit,im] of [mask,art].entries()){
  const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);
 }
 gl.uniform1i(gl.getUniformLocation(program,'protection'),0);gl.uniform1i(gl.getUniformLocation(program,'sky'),1);
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 const uniforms=Object.fromEntries(['camera','viewport','mode'].map(k=>[k,gl.getUniformLocation(program,k)]));
 window.study={program,uniforms,mesh:{vertices:geometry.vertices,triangles:geometry.triangles,bytes:geometry.bytes,indices:geometry.indices.length},setMode(value){mode=value;draw();},draw};
 document.querySelector('#compare').addEventListener('click',compare);
 window.addEventListener('resize',draw);
 window.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('button,a'))return;if(e.key.toLowerCase()==='a')compare();if(e.key.toLowerCase()==='n'){mode=1-mode;draw();}});
 draw();
}catch(error){host.dataset.state=JSON.stringify({ready:false,error:error.message});console.error(error);}
