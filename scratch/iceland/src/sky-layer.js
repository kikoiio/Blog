// Build a terrain-free sky texture at runtime; keep the original scene palette.
export function paintSky(pixels,width,height,boundaries,atmosphere,aw,ah){
 let previous=[pixels[0],pixels[1],pixels[2]];
 for(let y=0;y<height;y++){
  let r=0,g=0,b=0,count=0;
  const my=Math.min(ah-1,Math.floor(y/height*ah));
  for(let x=0;x<width;x++){
   const mx=Math.min(aw-1,Math.floor(x/width*aw)),k=(y*width+x)*4;
   if(y+50<boundaries[x]*height&&!atmosphere[(my*aw+mx)*4+2]){r+=pixels[k];g+=pixels[k+1];b+=pixels[k+2];count++;}
  }
  const mean=count?[r/count,g/count,b/count]:previous;
  for(let x=0;x<width;x++){
   const k=(y*width+x)*4,mx=Math.min(aw-1,Math.floor(x/width*aw));
   const fade=Math.max(0,Math.min(1,(boundaries[x]*height-y)/50));
   const weight=atmosphere[(my*aw+mx)*4+2]?0:fade;
   for(let c=0;c<3;c++)pixels[k+c]=Math.round(pixels[k+c]*weight+mean[c]*(1-weight));
   pixels[k+3]=255;
  }
  previous=mean;
 }
 return pixels;
}
export function createSkyLayer(image,profile,environment){
 const sky=document.createElement('canvas');sky.width=image.width;sky.height=image.height;
 const ctx=sky.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
 const data=ctx.getImageData(0,0,sky.width,sky.height),boundaries=new Float32Array(sky.width);
 let segment=1;
 for(let x=0;x<sky.width;x++){
  const u=(x+.5)/sky.width;
  while(segment<profile.skyline.length-1&&u>profile.skyline[segment][0])segment++;
  const a=profile.skyline[segment-1],b=profile.skyline[segment];
  boundaries[x]=a[1]+(b[1]-a[1])*(u-a[0])/(b[0]-a[0]);
 }
 const mask=environment.getContext('2d').getImageData(0,0,environment.width,environment.height);
 paintSky(data.data,sky.width,sky.height,boundaries,mask.data,environment.width,environment.height);
 ctx.putImageData(data,0,0);return sky;
}
