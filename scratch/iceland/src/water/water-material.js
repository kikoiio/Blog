// Advect the illustration's water detail with the solver's actual current.
// MacCormack correction limits repeated bilinear diffusion. There is no phase wrap.
const vertex=`#version 300 es
in vec2 position;out vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment=`#version 300 es
precision highp float;
in vec2 uv;out vec4 outColor;
uniform sampler2D original,previous,forwardPass,backwardPass,current,mask;
uniform vec2 gridSize,texel;
uniform float stepTime;
uniform int pass;
vec2 sourceAt(vec2 p,float direction){
 vec2 speed=(texture(current,p).rg*255.-128.)/127.*5.;
 return clamp(p-speed/gridSize*stepTime*.16*direction,vec2(0.),vec2(1.));
}
void main(){
 float wet=texture(mask,uv).a;
 if(wet<.001){outColor=texture(original,uv);return;}
 vec2 q=sourceAt(uv,pass==1?-1.:1.);
 float safe=texture(mask,q).a;
 if(safe<.05){outColor=texture(original,uv);return;}
 if(pass<2){outColor=texture(previous,q);return;}
 vec4 value=texture(forwardPass,uv)+.5*(texture(previous,uv)-texture(backwardPass,uv));
 vec4 lo=vec4(1.),hi=vec4(0.);
 ivec2 size=textureSize(previous,0),donor=ivec2(floor(q*vec2(size)-.5));
 for(int y=0;y<2;y++)for(int x=0;x<2;x++){
  vec4 neighbor=texelFetch(previous,clamp(donor+ivec2(x,y),ivec2(0),size-1),0);
  lo=min(lo,neighbor);hi=max(hi,neighbor);
 }
 value=clamp(value,lo,hi);
 // Continuous local replenishment is strongest where new crests are breaking.
 // It retains authored pigment after long runs; nothing jumps to a first frame.
 float breaking=texture(current,uv).b;
 float replenish=1.-exp(-stepTime*(.012+breaking*.12));
 outColor=mix(value,texture(original,uv),replenish);
}`;
export class WaterMaterial{
 constructor(gl,image,mask,surf){
  this.gl=gl;this.surf=surf;this.width=Math.round(image.width*.75);this.height=Math.round(image.height*.75);this.textures=[];this.time=0;
  const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  this.program=gl.createProgram();const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.bindAttribLocation(this.program,0,'position');gl.linkProgram(this.program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));
  this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
  this.framebuffer=gl.createFramebuffer();this.uniforms={};for(const name of ['original','previous','forwardPass','backwardPass','current','mask','gridSize','texel','stepTime','pass'])this.uniforms[name]=gl.getUniformLocation(this.program,name);
  const canvas=document.createElement('canvas');canvas.width=this.width;canvas.height=this.height;canvas.getContext('2d').drawImage(image,0,0,this.width,this.height);
  this.original=this.texture(canvas);this.material=this.texture(canvas);this.forward=this.texture(null);this.backward=this.texture(null);this.output=this.texture(null);this.mask=this.texture(mask);this.current=this.texture(null,surf.width,surf.rows);this.vectors=new Uint8Array(surf.length*4);
 }
 texture(source,width=this.width,height=this.height){const gl=this.gl,t=gl.createTexture();this.textures.push(t);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);if(source)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);return t;}
 bind(unit,texture){const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);}
 advance(seconds){
  const dt=Math.min(6,Math.max(0,seconds));if(!dt)return;
  const gl=this.gl,s=this.surf;this.time+=dt;
  for(let i=0;i<s.length;i++){const k=i*4;this.vectors[k]=Math.round(Math.max(0,Math.min(255,128+s.currentX[i]/5*127)));this.vectors[k+1]=Math.round(Math.max(0,Math.min(255,128+s.currentY[i]/5*127)));this.vectors[k+2]=Math.round(s.foam[i]*255);this.vectors[k+3]=255;}
  this.bind(4,this.current);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,s.width,s.rows,gl.RGBA,gl.UNSIGNED_BYTE,this.vectors);
  gl.useProgram(this.program);gl.bindVertexArray(this.vao);gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer);gl.viewport(0,0,this.width,this.height);
  for(const [i,name]of ['original','previous','forwardPass','backwardPass','current','mask'].entries())gl.uniform1i(this.uniforms[name],i);
  this.bind(0,this.original);this.bind(5,this.mask);gl.uniform2f(this.uniforms.gridSize,s.width,s.rows);gl.uniform2f(this.uniforms.texel,1/this.width,1/this.height);gl.uniform1f(this.uniforms.stepTime,dt);
  const draw=(pass,input,output)=>{this.bind(1,input);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,output,0);gl.uniform1i(this.uniforms.pass,pass);gl.drawArrays(gl.TRIANGLES,0,6);};
  // Unused samplers must still avoid sampling the current framebuffer attachment.
  this.bind(2,this.original);this.bind(3,this.original);draw(0,this.material,this.forward);
  draw(1,this.forward,this.backward);
  this.bind(2,this.forward);this.bind(3,this.backward);draw(2,this.material,this.output);
  [this.material,this.output]=[this.output,this.material];
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindVertexArray(null);
 }
 destroy(){const gl=this.gl;for(const t of this.textures)gl.deleteTexture(t);gl.deleteFramebuffer(this.framebuffer);gl.deleteBuffer(this.buffer);gl.deleteVertexArray(this.vao);gl.deleteProgram(this.program);}
}
