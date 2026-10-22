// Water envelopes use source-image coordinates; no color threshold splits white foam from blue pigment.
export const domains = {
 '01-city-rain.png': {wet:[[[.32,.385],[.73,.385],[.73,.443],[.32,.443]]],dry:[[[.47,.396],[.525,.396],[.525,.423],[.47,.423]],[[.376,.385],[.4,.385],[.4,.45],[.376,.45]]]},
 '02-city-clear.png': {wet:[[[.32,.385],[.73,.385],[.73,.443],[.32,.443]]],dry:[[[.47,.396],[.525,.396],[.525,.423],[.47,.423]],[[.376,.385],[.4,.385],[.4,.45],[.376,.45]]]},
 '03-harbor.png': {wet:[[[.50,.472],[1,.465],[1,.98],[.76,.98],[.64,.77],[.49,.67]]],dry:[[[.55,.49],[.69,.49],[.69,.625],[.55,.625]],[[.85,.49],[.95,.49],[.95,.60],[.85,.60]]]},
 '04-black-beach.png': {wet:[[[0,.349],[.66,.349],[.76,.40],[.88,.47],[.77,.58],[.55,.67],[.28,.77],[.09,.72],[0,.63]]],dry:[[[.67,.35],[.68,.32],[.70,.32],[.70,.36]],[[.715,.36],[.72,.31],[.74,.31],[.75,.36]],[[.13,.755],[.16,.72],[.19,.72],[.21,.765]]]},
 '05-glacial-outlet.png': {wet:[[[.03,.32],[.98,.32],[.98,.39],[.03,.39]],[[.41,.44],[.59,.44],[.63,.59],[.51,.69],[.43,.62]]],dry:[[[.43,.47],[.56,.47],[.56,.55],[.43,.55]]]},
 '11-autumn-fjord.png': {wet:[[[.32,.45],[.92,.445],[.88,.57],[.73,.625],[.53,.61],[.35,.56]]]},
 '13-hornbjarg.png': {wet:[
  [[0,.345],[.375,.345],[.375,.42],[.335,.48],[.343,.518],[.407,.548],[.423,.567],[.414,.592],[.458,.632],[.516,.664],[.522,.700],[.481,.746],[.500,.789],[.542,.836],[.542,.868],[.526,.909],[.496,.934],[.480,.96],[.39,1],[0,1]],
  [[.89,.46],[1,.468],[1,.657],[.966,.645],[.951,.605],[.947,.575],[.928,.542],[.91,.51]]
 ],dry:[
  [[.225,.47],[.265,.441],[.284,.486],[.318,.486],[.319,.5],[.246,.502]],
  [[.313,.407],[.325,.395],[.328,.387],[.343,.374],[.358,.377],[.366,.394],[.379,.406],[.378,.419],[.313,.419]],
  [[.416,.609],[.426,.591],[.438,.582],[.447,.586],[.458,.608],[.472,.613],[.471,.626],[.420,.626]],
  [[.225,.689],[.251,.689],[.251,.733]]
 ]},
 '15-raudasandur.png': {wet:[[[.83,.4],[1,.4],[1,1],[.68,1],[.57,.72],[.77,.55]]]},
 '16-isafjordur.png': {wet:[[[.25,.49],[.96,.49],[.96,.535],[.25,.535]],[[.65,.8],[.95,.8],[.95,.9],[.8,.87]]]},
 '17-kirkjufell.png': {wet:[[[.86,.46],[1,.46],[1,.49],[.86,.49]]]},
 '18-arnarstapi.png': {wet:[[[.72,.3],[1,.3],[1,.98],[.8,.93],[.82,.65],[.78,.51],[.72,.43]]]},
 '19-hvitserkur.png': {wet:[[[.25,.61],[.9,.61],[.9,.75],[.25,.75]]],dry:[[[.54,.45],[.7,.45],[.72,.72],[.52,.72]]]},
 '22-studlagil.png': {wet:[[[.43,.66],[.58,.66],[.48,.72],[.4,.79],[.27,.89],[.02,.94],[0,.86],[.25,.77]]]},
 '23-vestrahorn.png': {wet:[[[.85,.56],[1,.56],[1,.74],[.88,.7],[.8,.63]]]},
 '26-heimaey.png': {wet:[[[.04,.36],[.2,.36],[.2,.4],[.04,.4]],[[.91,.6],[1,.6],[1,.77],[.9,.74],[.79,.77],[.72,.72],[.79,.66],[.91,.66]]]},
};
function inside(x,y,points){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export function waterAtFrame(file,x,y){const domain=domains[file];return !!domain&&domain.wet.some(p=>inside(x,y,p))&&!domain.dry?.some(p=>inside(x,y,p));}

const settings={
 '01-city-rain.png':{horizon:.38,amplitude:.45,axis:[.2,1]},
 '02-city-clear.png':{horizon:.38,amplitude:.45,axis:[.2,1]},
 '03-harbor.png':{horizon:.46,amplitude:.7,axis:[.25,1]},
 '04-black-beach.png':{horizon:.344,amplitude:2.1,axis:[.45,1]},
 '05-glacial-outlet.png':{horizon:.31,amplitude:.65,axis:[.15,1]},
 '11-autumn-fjord.png':{horizon:.43,amplitude:.6,axis:[.15,1]},
 '13-hornbjarg.png':{horizon:.32,amplitude:1.3,axis:[.4,1]},
 '15-raudasandur.png':{horizon:.39,amplitude:1.1,axis:[-.4,1]},
 '16-isafjordur.png':{horizon:.48,amplitude:.45,axis:[.1,1]},
 '17-kirkjufell.png':{horizon:.45,amplitude:.4,axis:[.2,1]},
 '18-arnarstapi.png':{horizon:.29,amplitude:1.3,axis:[-.3,1]},
 '19-hvitserkur.png':{horizon:.59,amplitude:.55,axis:[.2,1]},
 '22-studlagil.png':{horizon:.63,amplitude:.8,axis:[-.5,1]},
 '23-vestrahorn.png':{horizon:.55,amplitude:.5,axis:[.2,1]},
 '26-heimaey.png':{horizon:.35,amplitude:.8,axis:[.3,1]},
};
export function waterSettings(file){return settings[file]||{horizon:.4,amplitude:.6,axis:[.2,1]};}
function segmentDistance(x,y,a,b){
 const px=x*1672,py=y*941,ax=a[0]*1672,ay=a[1]*941,dx=(b[0]-a[0])*1672,dy=(b[1]-a[1])*941;
 const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1)));
 return Math.hypot(px-ax-dx*t,py-ay-dy*t);
}
export function waterWeight(file,x,y){
 const domain=domains[file];if(!domain||!waterAtFrame(file,x,y))return 0;
 let edge=Infinity;
 for(const polygon of [...domain.wet,...(domain.dry||[])])for(let i=0;i<polygon.length;i++)edge=Math.min(edge,segmentDistance(x,y,polygon[i],polygon[(i+1)%polygon.length]));
 const t=Math.max(0,Math.min(1,edge/14));return t*t*(3-2*t);
}
