export class PaintedWater {
 constructor(){this.phase=0;this.speed=.52;this.amplitude=1;this.steps=0;}
 advance(seconds,wind){
  const dt=Math.max(0,seconds),energy=Math.min(1.4,Math.hypot(wind.x,wind.y));
  const target=.46+energy*.24,release=1-Math.exp(-dt*1.5);
  this.phase+=target*dt+(this.speed-target)*release/1.5;
  this.speed+=(target-this.speed)*release;
  this.amplitude+=(.85+energy*.18-this.amplitude)*(1-Math.exp(-dt*1.1));
  this.steps++;
 }
 measure(){return {style:'ambient-flow',phase:+this.phase.toFixed(4),speed:+this.speed.toFixed(3),amplitude:+this.amplitude.toFixed(3),steps:this.steps};}
}
