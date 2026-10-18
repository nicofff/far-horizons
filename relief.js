import { reliefWidth, reliefHeight, reliefCell, reliefRuns } from './assets/world-relief.js';

export { reliefWidth, reliefHeight, reliefCell };
export const reliefMask=new Uint8Array(reliefWidth*reliefHeight);
const bytes=atob(reliefRuns);let cursor=0,position=0;
while(cursor<bytes.length){
  const value=bytes.charCodeAt(cursor++);let length=0,shift=0,byte;
  do{byte=bytes.charCodeAt(cursor++);length|=(byte&127)<<shift;shift+=7;}while(byte&128);
  if(length<=0||position+length>reliefMask.length)throw new Error('Invalid relief raster.');
  reliefMask.fill(value,position,position+length);position+=length;
}
if(position!==reliefMask.length)throw new Error('Incomplete relief raster.');

function reliefAt(x,y){
  const px=Math.floor(x/reliefCell),py=Math.floor(y/reliefCell);
  return px<0||px>=reliefWidth||py<0||py>=reliefHeight?0:reliefMask[py*reliefWidth+px];
}

export function elevationAt(x,y){return (reliefAt(x,y)>>>2)*250;}
export function mountainAt(x,y){return reliefAt(x,y)&3;}
