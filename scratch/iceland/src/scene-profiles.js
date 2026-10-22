import { southProfiles } from './profiles/south.js';
import { northProfiles } from './profiles/north.js';
import { eastProfiles } from './profiles/east.js';

export const profiles={
 ...southProfiles,...northProfiles,...eastProfiles,
 '13-hornbjarg.png':{
  wind:{x:.49,y:.025},climate:'exposed-sea-cliff',mist:[],flow:[],
  clouds:new URL('../assets/layers/hornbjarg/clouds-v1.png',import.meta.url),
  // Conservative sky edge stays above every distant ridge, with an inward fade.
  skyline:[[0,.315],[.23,.315],[.25,.285],[.29,.278],[.31,.248],[.4,.228],[.42,.216],[.5,.207],[.56,.178],[.7,.162],[.83,.125],[1,.112]],
  grass:[[[.43,.253],[.50,.26],[.58,.3],[.65,.33],[.73,.38],[.73,.40],[.62,.35],[.54,.31],[.46,.28]],[[.68,.385],[.74,.42],[.77,.47],[.79,.52],[.85,.565],[.94,.615],[1,.64],[1,.70],[.86,.62],[.79,.58],[.74,.54],[.72,.46]],[[.98,.68],[1,.68],[1,1],[.49,1],[.54,.94],[.61,.88],[.65,.81],[.69,.74],[.74,.67],[.77,.66],[.72,.75],[.68,.84],[.70,.86],[.82,.77],[.9,.73]]],
  perches:[[.62,.345],[.73,.414],[.79,.55],[.90,.63],[.79,.78],[.62,.92]],
 },
};

export function inPolygon(x,y,points){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
// Masks fade only inward. Even a strong gust cannot animate adjacent geology.
function polygonWeight(x,y,polygons=[],fade=8){
 let weight=0;
 for(const polygon of polygons){
  if(!inPolygon(x,y,polygon))continue;
  let edge=Infinity;
  for(let i=0;i<polygon.length;i++){
   const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=(b[0]-a[0])*1672,dy=(b[1]-a[1])*941;
   const px=(x-a[0])*1672,py=(y-a[1])*941;
   const t=Math.max(0,Math.min(1,(px*dx+py*dy)/(dx*dx+dy*dy||1)));
   edge=Math.min(edge,Math.hypot(px-dx*t,py-dy*t));
  }
  const t=Math.min(1,edge/fade);weight=Math.max(weight,t*t*(3-2*t));
 }
 return weight;
}
export function environmentAt(file,x,y){
 const profile=profiles[file];
 if(!profile)return {sky:0,grass:false,grassWeight:0,mist:0,flow:0};
 let boundary=0;
 const skyline=profile.skyline||[];
 for(let i=1;i<skyline.length;i++){const a=skyline[i-1],b=skyline[i];if(x>=a[0]&&x<=b[0]){boundary=a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);break;}}
 const sky=Math.max(0,Math.min(1,(boundary-y)*941/35));
 const grassWeight=polygonWeight(x,y,profile.grass,5);
 return {sky,grass:grassWeight>0,grassWeight,mist:polygonWeight(x,y,profile.mist,12),flow:polygonWeight(x,y,profile.flow,7)};
}

const stableMoss=new Set(['06-maelifell-sun.png','07-maelifell-rain.png','08-rhyolite.png','14-dynjandi.png','17-kirkjufell.png']);
export function ambientSettings(file){return {grass:stableMoss.has(file)?0:.55,fallSign:file==='25-strokkur.png'?-1:1};}
