// Visibility and pause reset the caller's timestamp. A slow visible frame must
// retain elapsed time rather than slowing the entire landscape to frame rate.
export function elapsedSeconds(now,previous){
 return previous>0?Math.max(0,(now-previous)/1000):0;
}
