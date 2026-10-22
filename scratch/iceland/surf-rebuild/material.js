export const vertex=`#version 300 es
precision highp float;
in vec3 position,normal,facts;
uniform vec4 camera;
out vec3 world,norm,info;
void main(){
 world=position;norm=normal;info=facts;
 float z=position.z;
 float cx=(836.-camera.x-camera.z*.5)*z+1200.*position.x;
 float cy=(camera.w*.5+camera.y-326.)*z-1200.*(4.8-position.y);
 gl_Position=vec4(2.*cx/camera.z,2.*cy/camera.w,1.000364*z-.400073,z);
}`;
export const fragment=`#version 300 es
precision highp float;
in vec3 world,norm,info;
uniform vec2 viewport;
uniform vec4 camera;
uniform sampler2D protection,sky;
uniform int mode;
out vec4 color;
float hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=a*noise(p);p=mat2(.8,-.6,.6,.8)*p*2.04+7.1;a*=.5;}return n;}
float cells(vec2 p){
 vec2 i=floor(p),f=fract(p);float a=10.,b=10.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec2 g=vec2(x,y),r=g+vec2(hash(i+g),hash(i+g+37.))-f;float d=dot(r,r);
  if(d<a){b=a;a=d;}else b=min(b,d);
 }
 return sqrt(b)-sqrt(a);
}
void main(){
 vec2 pixel=(camera.xy+vec2(gl_FragCoord.x/viewport.x,1.-gl_FragCoord.y/viewport.y)*camera.zw);
 vec2 uv=pixel/vec2(1672.,941.);
 float mask=texture(protection,uv).r;
 if(mask<.002||info.z<-.9)discard;
 vec3 N=normalize(norm),V=normalize(vec3(-world.x,4.8-world.y,-world.z));
 if(mode==1){color=vec4(N*.5+.5,mask);return;}
 vec2 q=world.xz;
 // Fine material features live on the surface in metres, through the curl.
 // One palette and light source cover the face, back, lip and foam.
 float a=fbm(q*vec2(2.1,9.3)),b=fbm(q*vec2(10.7,31.));
 N=normalize(N+vec3((a-.5)*.12,(b-.5)*.018,(b-.5)*.16));
 vec3 L=normalize(vec3(.12,.18,.98));
 float facing=clamp(dot(N,V),0.,1.),diff=max(0.,dot(N,L));
 float fresnel=.04+.76*pow(1.-facing,4.);
 vec3 reflected=reflect(-V,N);
 vec2 skyUV=vec2(clamp(.51+reflected.x*.44,0.,1.),clamp(.30-max(0.,reflected.y)*.26,.01,.30));
 vec3 reflection=texture(sky,skyUV).rgb;
 vec3 sea=mix(vec3(.032,.145,.205),vec3(.092,.274,.348),diff*.50+.12);
 sea=mix(sea,reflection*.68,fresnel*.73);
 float subsurface=pow(max(0.,dot(V,-L)),2.)*smoothstep(.3,1.8,world.y)*.08;
 sea+=vec3(.02,.22,.25)*subsurface;
 float ripple=sin(world.z*34.+a*9.+world.x*2.3)*.5+.5;
 sea*=.86+.18*a+.08*b+.045*ripple;
 // A concentrated, broken reflection; no rectangular highlight texture.
 float glint=pow(max(0.,dot(reflect(-L,N),V)),130.);
 glint*=smoothstep(.41,.75,noise(q*vec2(23.,57.)));
 sea+=vec3(.79,.79,.72)*glint*.65;
 // Turbulent lace has holes, connected strands and islands at several sizes.
 vec2 warped=q*vec2(1.7,3.3)+vec2(fbm(q*2.2),fbm(q*2.2+21.))*1.6;
 float network=1.-smoothstep(.025,.15,cells(warped));
 float patches=fbm(q*vec2(4.2,7.8)+vec2(a,b)*2.);
 float shore=1.-smoothstep(1.,6.5,info.z);
 float crest=info.x;
 float mass=clamp(.025+crest*.88+shore*.35,0.,1.);
 float foam=smoothstep(.67-mass*.52,.76-mass*.52,network*.61+patches*.57);
 float holes=smoothstep(.09,.23,noise(q*vec2(42.,65.)));
 foam*=mix(holes,1.,crest*.45);
 vec3 foamShade=mix(vec3(.39,.54,.67),vec3(.89,.93,.94),.52+.40*max(N.y,0.));
 foamShade*=.91+.10*patches;
 sea=mix(sea,foamShade,foam);
 float grain=hash(floor(pixel));
 // Close palette ramps preserve tiny hard clusters, without enlarging pixels.
 sea=floor(clamp(sea,0.,1.)*42.+grain*.65)/42.;
 float haze=1.-exp(-world.z*.0009);
 sea=mix(sea,vec3(.42,.53,.62),haze*.26);
 color=vec4(clamp(sea,0.,1.),mask);
}`;
