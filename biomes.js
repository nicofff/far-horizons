import { biomeWidth, biomeHeight, biomeCell, biomeRuns, biomeStyles } from './assets/world-biomes.js';
import { wrapX } from './world.js';

export { biomeWidth, biomeHeight, biomeCell, biomeStyles };
export const biomeMask=new Uint8Array(biomeWidth*biomeHeight);
const bytes=atob(biomeRuns);
let cursor=0,position=0;
while(cursor<bytes.length){
  const value=bytes.charCodeAt(cursor++);let length=0,shift=0,byte;
  do{byte=bytes.charCodeAt(cursor++);length|=(byte&127)<<shift;shift+=7;}while(byte&128);
  if(value>15||length<=0||position+length>biomeMask.length)throw new Error('Invalid biome raster.');
  biomeMask.fill(value,position,position+length);position+=length;
}
if(position!==biomeMask.length)throw new Error('Incomplete biome raster.');

export function biomeAt(x,y){
  const px=Math.floor(wrapX(x)/biomeCell),py=Math.floor(y/biomeCell);
  return py<0||py>=biomeHeight?0:biomeMask[py*biomeWidth+px];
}

export function biomeStyleAt(x,y){return biomeStyles[biomeAt(x,y)]||biomeStyles[4];}
