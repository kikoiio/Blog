import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { Reflector } from './vendor/Reflector.js';

// Original scene and shaders. The reference sites informed the separation of
// authored materials and advected interaction; their proprietary assets are not used.
const vertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const flowFragment = `
varying vec2 vUv;
uniform sampler2D previous;
uniform vec2 from, to, velocity;
uniform float aspect, stepSize, injection;
vec2 decode(vec4 t){return (t.xy-.5)*2.;}
void main(){
    vec4 field=texture2D(previous,vUv);
    vec2 speed=decode(field);
    vec2 p=vUv*vec2(aspect,1.);
    // A small divergence-free rotation perturbs transport, only where input exists.
    vec2 curl=vec2(cos(p.y*18.+speed.y*2.),-cos(p.x*18.+speed.x*2.));
    vec2 source=vUv-(speed+curl*field.z*.12)*vec2(1./aspect,1.)*.019*stepSize;
    vec4 carried=texture2D(previous,clamp(source,vec2(.002),vec2(.998)));
    vec2 result=decode(carried)*pow(.94,stepSize);
    float weight=carried.z*pow(.92,stepSize);
    vec2 a=from*vec2(aspect,1.), b=to*vec2(aspect,1.);
    vec2 segment=b-a;
    float h=clamp(dot(p-a,segment)/max(dot(segment,segment),.000001),0.,1.);
    float d=length(p-a-segment*h);
    float radius=.065+min(length(velocity)*.055,.035);
    float stamp=(1.-smoothstep(radius*.15,radius,d))*injection;
    result=mix(result,velocity,stamp*.8);
    weight=max(weight,stamp);
    gl_FragColor=vec4(clamp(result,-.95,.95)*.5+.5,weight,1.);
}`;
const compositeFragment = `
varying vec2 vUv;
uniform sampler2D picture, flow;
uniform vec2 size;
uniform vec4 drops[3];
uniform float strength, fade;
void main(){
    vec4 data=texture2D(flow,vUv);
    vec2 velocity=(data.xy-.5)*2.;
    vec2 offset=velocity*data.z*vec2(size.y/size.x,1.)*.045*strength*fade;
    float light=0.;
    for(int i=0;i<3;i++){
        float age=drops[i].z;
        if(age>=0. && age<1.35){
            vec2 p=(vUv-drops[i].xy)*vec2(size.x/size.y,1.);
            float r=length(p), front=r-(.025+age*.47);
            float envelope=exp(-front*front/ .0013)*exp(-age*2.7)*smoothstep(0.,.08,age);
            float wave=sin(front*95.);
            vec2 direction=p/max(r,.001);
            offset+=direction*vec2(size.y/size.x,1.)*wave*envelope*.019*drops[i].w;
            light+=cos(front*95.)*envelope*.025*drops[i].w;
        }
    }
    // Stay inside the actual rendered image, with a quiet border around controls.
    float border=smoothstep(0.,.055,min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y)));
    offset*=border;
    vec2 uv=clamp(vUv-offset,vec2(.001),vec2(.999));
    vec2 split=offset*.018;
    vec3 color=vec3(texture2D(picture,uv-split).r,texture2D(picture,uv).g,texture2D(picture,uv+split).b);
    gl_FragColor=vec4(color+light*border,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}`;

function roundedPath(path, width, height, radius) {
    const x=-width/2,y=-height/2;
    path.moveTo(x+radius,y);
    path.lineTo(x+width-radius,y); path.quadraticCurveTo(x+width,y,x+width,y+radius);
    path.lineTo(x+width,y+height-radius); path.quadraticCurveTo(x+width,y+height,x+width-radius,y+height);
    path.lineTo(x+radius,y+height); path.quadraticCurveTo(x,y+height,x,y+height-radius);
    path.lineTo(x,y+radius); path.quadraticCurveTo(x,y,x+radius,y);
    return path;
}
function block(width,height,depth,radius=.15,hole=0) {
    const shape=roundedPath(new THREE.Shape(),width,height,radius);
    if(hole) shape.holes.push(roundedPath(new THREE.Path(),hole,hole,.12));
    const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:5,
        steps:1,bevelSize:.09,bevelThickness:.09,curveSegments:14});
    geometry.translate(0,0,-depth/2);
    geometry.computeVertexNormals();
    return geometry;
}

export function createLiquidScene(canvas, onLabels) {
    const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'low-power'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.12;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    const float=renderer.capabilities.isWebGL2 && renderer.extensions.has('EXT_color_buffer_float');
    const type=float?THREE.HalfFloatType:THREE.UnsignedByteType;
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(35,1,.1,100);
    const pmrem=new THREE.PMREMGenerator(renderer);
    const room=new RoomEnvironment(renderer);
    const environment=pmrem.fromScene(room,.04);
    scene.environment=environment.texture;
    room.dispose(); pmrem.dispose();
    const sun=new THREE.DirectionalLight(0xf8fcff,3.2);
    sun.position.set(-3,8,5); sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024); sun.shadow.camera.left=-8; sun.shadow.camera.right=8;
    sun.shadow.camera.top=8; sun.shadow.camera.bottom=-8; sun.shadow.normalBias=.025;
    sun.shadow.bias=-.00015; sun.shadow.radius=3;
    scene.add(sun,new THREE.HemisphereLight(0xe9f8ff,0x547687,1.2));
    const blue=new THREE.MeshPhysicalMaterial({color:0x00a8ec,metalness:.16,roughness:.19,clearcoat:1,clearcoatRoughness:.16,envMapIntensity:1.1});
    const ceramic=new THREE.MeshPhysicalMaterial({color:0xe9ece2,roughness:.27,metalness:.02,clearcoat:.45,envMapIntensity:.8});
    const chrome=new THREE.MeshStandardMaterial({color:0xc5d6d9,metalness:1,roughness:.13,envMapIntensity:1.35});
    const graphite=new THREE.MeshPhysicalMaterial({color:0x123342,metalness:.28,roughness:.22,clearcoat:.8});
    const meshes=[new THREE.Mesh(block(3.15,3.15,.46,.24,1.65),blue),
        new THREE.Mesh(new THREE.TorusGeometry(.77,.245,32,80),ceramic),
        new THREE.Mesh(new THREE.SphereGeometry(.68,48,32),chrome),
        new THREE.Mesh(block(1.65,1.1,.22,.15),graphite)];
    meshes[0].rotation.set(-.13,-.30,-.20);
    meshes[1].rotation.set(-.38,.35,.2);
    meshes[3].rotation.set(-1.08,.12,.32);
    const groups=meshes.map(mesh=>{
        mesh.castShadow=true; mesh.receiveShadow=true;
        const group=new THREE.Group(); group.add(mesh); scene.add(group); return group;
    });
    const floorShader={
        uniforms:{...THREE.UniformsUtils.clone(Reflector.ReflectorShader.uniforms)},
        vertexShader:`uniform mat4 textureMatrix; varying vec4 reflectedUv; varying vec2 surface;
            void main(){surface=position.xy;reflectedUv=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader:`uniform sampler2D tDiffuse;uniform vec3 color; varying vec4 reflectedUv;varying vec2 surface;
            void main(){vec3 reflection=texture2DProj(tDiffuse,reflectedUv).rgb;
                vec2 cell=abs(fract(surface*1.35+.5)-.5);
                float grid=1.-smoothstep(.008,.021,min(cell.x,cell.y));
                float poolLight=.96+.065*cos(surface.x*.22+surface.y*.16);
                vec3 base=color*poolLight*(1.-grid*.035);
                gl_FragColor=vec4(mix(base,reflection,.19),1.);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }`
    };
    const floor=new Reflector(new THREE.PlaneGeometry(160,160),{color:0x94bdc4,textureWidth:768,textureHeight:512,multisample:0,type,shader:floorShader});
    floor.rotation.x=-Math.PI/2; floor.position.y=-1.65; scene.add(floor);
    const shadow=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.ShadowMaterial({opacity:.13}));
    shadow.rotation.x=-Math.PI/2; shadow.position.y=-1.645; shadow.receiveShadow=true; scene.add(shadow);
    const target=new THREE.WebGLRenderTarget(1,1,{type,depthBuffer:true});
    // Scene is cached. Only this small, depth-free field changes during a gesture.
    const fieldWidth=192,fieldHeight=128;
    const fields=[0,1].map(()=>new THREE.WebGLRenderTarget(fieldWidth,fieldHeight,{type,depthBuffer:false,stencilBuffer:false}));
    const passCamera=new THREE.Camera();
    const passScene=new THREE.Scene();
    const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial());
    quad.frustumCulled=false; passScene.add(quad);
    const flowUniforms={previous:{value:fields[0].texture},from:{value:new THREE.Vector2(-2,-2)},to:{value:new THREE.Vector2(-2,-2)},
        velocity:{value:new THREE.Vector2()},aspect:{value:1},stepSize:{value:1},injection:{value:0}};
    const flowMaterial=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:flowFragment,uniforms:flowUniforms,depthTest:false,depthWrite:false,toneMapped:false});
    const uniforms={picture:{value:target.texture},flow:{value:fields[0].texture},size:{value:new THREE.Vector2(1,1)},
        drops:{value:[0,1,2].map(()=>new THREE.Vector4(0,0,-1,0))},strength:{value:1},fade:{value:0}};
    const composite=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:compositeFragment,uniforms,depthTest:false,depthWrite:false});
    let width=1,height=1,dirty=true,mobile=false,dark=false;
    let drops=[],pending=[],frame=0,lastInput=0,lastFrame=0,visible=true,hidden=document.hidden,lost=false,reduced=false;
    let renderedFrames=0,sceneRenders=0;
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const positionsDesktop=[[-.25,.55,-.25],[-3.1,-.48,.85],[3,-.55,-.15],[.35,-1.05,2.5]];
    const positionsMobile=[[.05,.8,-.35],[-1.55,-.65,1.8],[1.65,-.55,.6],[.15,-1.18,3]];
    const offsets=[new THREE.Vector3(0,-1.6,.5),new THREE.Vector3(0,-1,0),new THREE.Vector3(0,-.9,0),new THREE.Vector3(0,-.48,.2)];
    function labels(){
        scene.updateMatrixWorld(); camera.updateMatrixWorld();
        onLabels(groups.map((group,i)=>{
            const p=group.position.clone().add(offsets[i]).project(camera);
            return {x:clamp((p.x*.5+.5)*width,48,width-48),y:clamp((.5-p.y*.5)*height,70,height-78)};
        }));
    }
    function pass(material,destination){quad.material=material;renderer.setRenderTarget(destination);renderer.render(passScene,passCamera);}
    function picture(){
        if(!dirty)return;
        renderer.setRenderTarget(target);renderer.render(scene,camera);sceneRenders++;dirty=false;
    }
    function compose(now=performance.now()){
        picture();
        uniforms.drops.value.forEach((d,i)=>{
            const item=drops[i]; d.set(item?.x??0,item?.y??0,item?(now-item.time)/1000:-1,item?1:0);
        });
        uniforms.flow.value=fields[0].texture;
        uniforms.fade.value=reduced?0:1-clamp((now-lastInput-850)/550,0,1);
        pass(composite,null);renderedFrames++;
        canvas.style.opacity='1';
    }
    function clearField(){
        renderer.setClearColor(new THREE.Color(.5,.5,0),1);
        for(const field of fields){renderer.setRenderTarget(field);renderer.clear();}
        renderer.setRenderTarget(null);
    }
    function stop(draw=true){
        cancelAnimationFrame(frame);frame=0;pending=[];drops=[];
        if(lost)return;
        clearField(); if(draw)compose();
    }
    function tick(now){
        frame=0;
        if(hidden||!visible||lost||reduced){stop(false);return;}
        const stepSize=clamp((now-lastFrame)/16.667,.25,2);lastFrame=now;
        flowUniforms.stepSize.value=stepSize;
        // Bounded queue, preserving the complete previous-to-current segment.
        const inputs=pending.splice(0,8);
        if(!inputs.length)inputs.push(null);
        for(const input of inputs){
            flowUniforms.previous.value=fields[0].texture;
            flowUniforms.injection.value=input?input.amount:0;
            if(input){flowUniforms.from.value.set(input.ax,input.ay);flowUniforms.to.value.set(input.x,input.y);flowUniforms.velocity.value.set(input.vx,input.vy);}
            flowUniforms.stepSize.value=stepSize/inputs.length;
            pass(flowMaterial,fields[1]);fields.reverse();
        }
        drops=drops.filter(d=>now-d.time<1350);
        compose(now);
        if(now-lastInput<1450||drops.length)frame=requestAnimationFrame(tick);else stop();
    }
    function wake(){if(!frame&&!hidden&&visible&&!lost&&!reduced){lastFrame=performance.now();frame=requestAnimationFrame(tick);}}
    function ripple(x=.5,y=.5){
        if(hidden||!visible||lost||reduced)return;
        lastInput=performance.now();drops.unshift({x,y,time:lastInput});drops.length=Math.min(drops.length,3);wake();
    }
    function glide(a,b,boost=1){
        if(hidden||!visible||lost||reduced)return;
        const dx=b.x-a.x,dy=b.y-a.y,dt=Math.max(8,b.time-a.time);
        if(Math.hypot(dx,dy)<.3)return;
        const velocity=new THREE.Vector2(dx/dt*.7,-dy/dt*.7).clampLength(0,.92);
        const input={ax:a.x/width,ay:1-a.y/height,x:b.x/width,y:1-b.y/height,vx:velocity.x,vy:velocity.y,amount:clamp(Math.hypot(dx,dy)/15,.06,1)*boost};
        if(pending.length>=8){const previous=pending.pop();input.ax=previous.ax;input.ay=previous.ay;}
        pending.push(input);lastInput=performance.now();wake();
    }
    function resize(w,h){
        stop(false);width=w;height=h;const nextMobile=w<650;
        const changed=mobile!==nextMobile||sceneRenders===0;mobile=nextMobile;
        const ratio=Math.min(devicePixelRatio||1,mobile?1.25:1.5,1800/w,1200/h);
        renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);
        target.setSize(Math.round(w*ratio),Math.round(h*ratio));
        camera.aspect=w/h;camera.fov=mobile?43:35;
        camera.position.set(...(mobile?[2.8,5.8,11.5]:[3.4,4.6,8.5]));camera.lookAt(0,0,0);camera.updateProjectionMatrix();
        if(changed)groups.forEach((group,i)=>group.position.set(...(mobile?positionsMobile:positionsDesktop)[i]));
        flowUniforms.aspect.value=w/h;uniforms.size.value.set(w,h);dirty=true;labels();compose();
    }
    function setTheme(value){
        dark=value;scene.background=new THREE.Color(dark?0x122c39:0xb6d1d4);
        floor.material.uniforms.color.value.set(dark?0x1b3b4a:0x9abfc5);
        blue.color.set(dark?0x00b5f2:0x00a8ec);graphite.color.set(dark?0x1e4a5c:0x123342);
        sun.intensity=dark?2.2:3.2;renderer.toneMappingExposure=dark?1.05:1.12;dirty=true;
        if(width>1)compose();
    }
    function moveNode(index,dx,dy){
        const p=groups[index].position;
        // Screen-aligned x/y motion keeps pointer and projected label together.
        const distance=camera.position.distanceTo(new THREE.Vector3());
        const span=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*distance;
        const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
        const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
        p.addScaledVector(right,dx/height*span).addScaledVector(up,-dy/height*span);
        p.x=clamp(p.x,mobile?-2.2:-4.2,mobile?2.2:4.2);p.y=clamp(p.y,-1.18,2);p.z=clamp(p.z,-2,3.3);
        dirty=true;labels();compose();
    }
    function visibility(value){visible=value;if(!value)stop(false);else if(!hidden&&!lost)stop();}
    function hiddenState(value){hidden=value;if(value)stop(false);else if(visible&&!lost)stop();}
    function reduce(value){reduced=value;stop();}
    function contextLost(){lost=true;cancelAnimationFrame(frame);frame=0;pending=[];drops=[];canvas.style.opacity='0';}
    function dispose(){
        cancelAnimationFrame(frame);scene.traverse(object=>{object.geometry?.dispose();if(object.material)for(const material of [].concat(object.material))material.dispose();});
        floor.dispose();environment.dispose();target.dispose();fields.forEach(f=>f.dispose());flowMaterial.dispose();composite.dispose();quad.geometry.dispose();renderer.dispose();
    }
    clearField();setTheme(false);
    return {resize,setTheme,moveNode,ripple,glide,visibility,hiddenState,reduce,contextLost,dispose,
        debug:()=>({renderer:'authored-scene + advected-flowmap',float,width,height,mobile,dark,reduced,visible,hidden,lost,
            running:!!frame,pending:pending.length,renderedFrames,sceneRenders,canvas:{width:canvas.width,height:canvas.height}})};
}
