import {MaterialCoordinates} from './material-coordinates.js';
export class WaterMaterial{
 constructor(gl,surf){
  this.gl=gl;this.coordinates=new MaterialCoordinates(surf);this.width=surf.width;this.height=surf.rows;this.time=0;
  const t=this.material=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,this.width,this.height,0,gl.RGBA,gl.UNSIGNED_BYTE,this.coordinates.pixels);
 }
 advance(seconds){
  if(!seconds)return;this.coordinates.advance(seconds);this.time=this.coordinates.time;
  const gl=this.gl;gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,this.material);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,this.width,this.height,gl.RGBA,gl.UNSIGNED_BYTE,this.coordinates.pixels);
 }
 destroy(){this.gl.deleteTexture(this.material);}
}
