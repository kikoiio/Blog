import { flowSamples } from '../environment.js';

const vertex=`#version 300 es
in vec2 position;out vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment=`#version 300 es
precision highp float;
in vec2 uv;out vec4 outColor;
uniform sampler2D waterMask,art,environmentMask,clouds,surfState,waterPalette;
uniform vec4 camera,waterInfo;
uniform vec3 waterDrift,mistDrift,fallDrift;
uniform vec2 worldSize,wind,cloudOffset,surfSize;
uniform float time,swellAmount,grassGain,fallSign;
uniform int detachedClouds,liveSurf;
float coverageAt(vec2 p,int kind){
 if(kind==0)return texture(waterMask,p).a;
 float vapor=texture(environmentMask,p).b;
 if(kind==1)return vapor<=.5?vapor*255./127.:0.;
 return vapor>.5?(vapor*255.-128.)/127.:0.;
}
vec3 flowingPigment(vec2 p,vec2 direction,vec3 drift,int kind,float coverage){
 vec2 q0=clamp(p-direction*drift.x*coverage/worldSize,vec2(0.),vec2(1.));
 vec2 q1=clamp(p-direction*drift.y*coverage/worldSize,vec2(0.),vec2(1.));
 float safe0=smoothstep(.03,.65,coverageAt(q0,kind));
 float safe1=smoothstep(.03,.65,coverageAt(q1,kind));
 return mix(texture(art,mix(p,q0,safe0)).rgb,texture(art,mix(p,q1,safe1)).rgb,drift.z);
}
float grainHash(vec2 p){
 vec2 a=fract(p*vec2(.1031,.11369));a+=dot(a,a.yx+19.19);return fract(a.x*a.y*23.7);
}
float grainNoise(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(grainHash(i),grainHash(i+vec2(1.,0.)),f.x),mix(grainHash(i+vec2(0.,1.)),grainHash(i+1.),f.x),f.y);
}
vec3 renderSurf(vec2 p,float wet){
 // Persistent wave geometry projects upward. Fine marks follow the current;
 // neither the surface state nor its material coordinates wrap to a first frame.
 float depth=clamp((p.y-waterInfo.x)/(1.-waterInfo.x),0.,1.);
 vec2 cell=1./surfSize,q=p;
 float rise=mix(1.5,19.,depth)/worldSize.y;
 for(int k=0;k<3;k++)q.y=p.y+(texture(surfState,q).r*4.-2.)*rise;
 vec4 state=texture(surfState,q);
 float h=state.r*4.-2.;
 float hx=(texture(surfState,q+vec2(cell.x,0.)).r-texture(surfState,q-vec2(cell.x,0.)).r)*4.;
 float hy=(texture(surfState,q+vec2(0.,cell.y)).r-texture(surfState,q-vec2(0.,cell.y)).r)*4.;
 vec2 pixel=floor(p*worldSize*.5)/(worldSize*.5);
 vec2 current=vec2(wind.x*.08+.035,-.22)*time;
 vec2 marks=pixel*vec2(115.,410.)+current;
 float fine=grainNoise(marks*3.1),mid=grainNoise(marks);
 vec3 normal=normalize(vec3(-hx*12.,-hy*10.,1.));
 float facing=clamp(dot(normal,normalize(vec3(-.35,-.7,1.))),0.,1.);
 vec3 base=texture(waterPalette,p).rgb;
 vec3 water=base*(.34+facing*.95+(fine-.5)*.24);
 // Short wind ripples are subordinate to the propagating long wave fronts.
 float ridge=smoothstep(.04,.23,h)*smoothstep(-.08,.20,hy);
 water=mix(water,vec3(.075,.30,.34),ridge*.24);
 float foam=state.g;
 float lace=smoothstep(.012,.09,foam)*smoothstep(.18,.55,mid*.55+fine*.45+foam*2.);
 float crest=ridge*smoothstep(.58,.85,mid*.65+fine*.35)*.55;
 vec3 white=mix(base*1.65,vec3(.89,.94,.95),.90);
 water=mix(water,white,clamp(max(lace,crest),0.,.96));
 // Narrow bright facets, never an unbounded screen reflection.
 water+=vec3(.10,.13,.14)*smoothstep(.84,.97,facing)*smoothstep(.65,.91,fine)*(.3+.7*depth);
 return clamp(water,0.,1.);
}
void main(){
 vec2 pixel=vec2(uv.x,1.-uv.y),p=(camera.xy+pixel*camera.zw)/worldSize;
 vec4 region=texture(environmentMask,p);
 float wet=texture(waterMask,p).a;
 float fog=region.b<=.5?region.b*255./127.:0.;
 float fallingWater=region.b>.5?(region.b*255.-128.)/127.:0.;
 if(fallingWater>.001){
  outColor=vec4(flowingPigment(p,vec2(wind.x*.10,fallSign),fallDrift,2,fallingWater),fallingWater);return;
 }
 if(fog>.001){
  outColor=vec4(flowingPigment(p,vec2(wind.x*.7,-1.),mistDrift,1,fog),fog);return;
 }
 if(region.g>.001){
  if(detachedClouds==1){
   vec2 cuv=vec2(p.x-cloudOffset.x,clamp(p.y*2.25-cloudOffset.y,0.,1.));
   vec4 cloud=texture(clouds,cuv);
   vec3 sky=mix(vec3(.46,.67,.83),vec3(.78,.86,.89),clamp(p.y*3.,0.,1.));
   outColor=vec4(mix(sky,cloud.rgb,cloud.a),region.g);return;
  }
  outColor=vec4(texture(clouds,vec2(p.x-cloudOffset.x,p.y)).rgb,region.g);return;
 }
 if(region.r>.02&&grassGain>0.){
  // Small flexible foliage moves; moss-covered mountain surfaces stay still.
  float bend=sin(p.x*51.+p.y*29.-time*.9-cloudOffset.x*80.);
  vec2 shift=vec2(wind.x*(.5+bend*2.7),bend*.45)*grassGain*2.;
  vec2 q=clamp(p+shift*region.r/worldSize,vec2(0.),vec2(1.));
  float safe=smoothstep(.03,.65,texture(environmentMask,q).r);
  outColor=vec4(texture(art,mix(p,q,safe)).rgb,region.r);return;
 }
 if(wet<.001){outColor=vec4(0.);return;}
 if(liveSurf==1){outColor=vec4(renderSurf(p,wet),wet);return;}
 float depth=clamp((p.y-waterInfo.x)/max(.12,1.-waterInfo.x),0.,1.);
 float nearAmount=smoothstep(0.,.56,depth);
 vec2 direction=normalize(waterInfo.zw)*min(1.,waterInfo.y*.8)*swellAmount*(.3+.7*nearAmount);
 // Fine water texture advances with the current. Coastlines fade inward;
 // neither a sine displacement nor cursor can rock the whole water back and forth.
 outColor=vec4(flowingPigment(p,direction,waterDrift,0,wet*wet),wet);
}`;
export class WaterSurface{
 constructor(){
  this.canvas=document.createElement('canvas');this.canvas.className='landscape-layer';this.canvas.setAttribute('aria-hidden','true');const gl=this.gl=this.canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:false,depth:false,stencil:false});if(!gl)throw new Error('当前浏览器无法创建交互水面，请启用 WebGL 2。');
  const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
  this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(this.program,'position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  this.uniforms={};for(const name of ['waterMask','art','environmentMask','clouds','camera','worldSize','wind','cloudOffset','time','swellAmount','waterInfo','waterDrift','mistDrift','fallDrift','grassGain','fallSign','detachedClouds','surfState','waterPalette','surfSize','liveSurf'])this.uniforms[name]=gl.getUniformLocation(this.program,name);this.textures=[];
 }
 texture(unit,filter){const gl=this.gl,tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter);this.textures[unit]=tex;return tex;}
 configure(mask,image,environment,cloudImage,settings,detachedClouds=false,ambient={grass:.55},surf=null,palette=null){
  this.surf=surf;
  const gl=this.gl;for(const texture of this.textures)gl.deleteTexture(texture);this.textures=[];
  for(const [unit,source]of [[0,mask],[1,image],[2,environment],[3,cloudImage]]){this.texture(unit,unit===2?gl.NEAREST:gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);if(unit===3)gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.MIRRORED_REPEAT);}
  this.texture(4,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,surf?.width||1,surf?.rows||1,0,gl.RGBA,gl.UNSIGNED_BYTE,surf?.pixels||new Uint8Array([128,0,128,0]));
  this.texture(5,gl.LINEAR);if(palette)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,palette);else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
  gl.useProgram(this.program);gl.uniform1i(this.uniforms.surfState,4);gl.uniform1i(this.uniforms.waterPalette,5);gl.uniform1i(this.uniforms.liveSurf,surf?1:0);gl.uniform2f(this.uniforms.surfSize,surf?.width||1,surf?.rows||1);
  for(const [i,name]of ['waterMask','art','environmentMask','clouds'].entries())gl.uniform1i(this.uniforms[name],i);
  gl.uniform2f(this.uniforms.worldSize,image.width,image.height);
  gl.uniform1i(this.uniforms.detachedClouds,detachedClouds?1:0);
  gl.uniform1f(this.uniforms.grassGain,ambient.grass);
  gl.uniform1f(this.uniforms.fallSign,ambient.fallSign||1);
  gl.uniform4f(this.uniforms.waterInfo,settings.horizon,settings.amplitude,...settings.axis);
 }

 resize(w,h){this.canvas.width=w;this.canvas.height=h;this.gl.viewport(0,0,w,h);}
 draw(camera,wind,time,water){
  const gl=this.gl;gl.useProgram(this.program);
  for(let i=0;i<6;i++){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,this.textures[i]);}
  if(this.surf){gl.activeTexture(gl.TEXTURE4);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,this.surf.width,this.surf.rows,gl.RGBA,gl.UNSIGNED_BYTE,this.surf.pixels);}
  gl.uniform4f(this.uniforms.camera,camera.sx,camera.sy,camera.sw,camera.sh);
  gl.uniform2f(this.uniforms.wind,wind.velocity.x,wind.velocity.y);gl.uniform2f(this.uniforms.cloudOffset,wind.offset.x,wind.offset.y);gl.uniform1f(this.uniforms.time,time);
  gl.uniform3fv(this.uniforms.waterDrift,flowSamples(water.phase*7.,28));
  gl.uniform3fv(this.uniforms.mistDrift,flowSamples(time*2.5,48));
  gl.uniform3fv(this.uniforms.fallDrift,flowSamples(time*38.,56));
  gl.uniform1f(this.uniforms.swellAmount,water.amplitude);
  gl.drawArrays(gl.TRIANGLES,0,6);return this.canvas;
 }
}
