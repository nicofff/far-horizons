import { rasterWidth, rasterHeight, rasterCell, terrainRuns } from './assets/world-terrain.js';
import { wrapX, longitudeDelta } from './world.js';

export { rasterWidth, rasterHeight, rasterCell };
export const terrainMask=new Uint8Array(rasterWidth*rasterHeight);
const bytes=atob(terrainRuns);
let position=0,value=0,length=0,shift=0;
for(let i=0;i<bytes.length;i++){
  const byte=bytes.charCodeAt(i);length|=(byte&127)<<shift;
  if(byte&128){shift+=7;continue;}
  terrainMask.fill(value,position,position+length);position+=length;value^=1;length=0;shift=0;
}
if(position!==terrainMask.length)throw new Error('Invalid world terrain raster.');
export function onLand(x,y){
  const px=Math.floor(wrapX(x)/rasterCell),py=Math.floor(y/rasterCell);
  return py<0||py>=rasterHeight||terrainMask[py*rasterWidth+px]===1;
}
export function clearPassage(a,b){
  const startX=wrapX(a.x),dx=longitudeDelta(a.x,b.x),dy=b.y-a.y;
  let x=Math.floor(startX/rasterCell),y=Math.floor(a.y/rasterCell);
  const endX=Math.floor((startX+dx)/rasterCell),endY=Math.floor(b.y/rasterCell);
  const sx=Math.sign(dx),sy=Math.sign(dy),deltaX=dx?rasterCell/Math.abs(dx):Infinity,deltaY=dy?rasterCell/Math.abs(dy):Infinity;
  let nextX=dx?((sx>0?(x+1)*rasterCell:x*rasterCell)-startX)/dx:Infinity;
  let nextY=dy?((sy>0?(y+1)*rasterCell:y*rasterCell)-a.y)/dy:Infinity;
  const blocked=(px,py)=>py<0||py>=rasterHeight||terrainMask[py*rasterWidth+(px>=0&&px<rasterWidth?px:(px%rasterWidth+rasterWidth)%rasterWidth)]===1;
  if(blocked(x,y)||blocked(endX,endY))return false;
  while(Math.min(nextX,nextY)<1-1e-10){
    if(Math.abs(nextX-nextY)<1e-10){if(blocked(x+sx,y)||blocked(x,y+sy))return false;x+=sx;y+=sy;nextX+=deltaX;nextY+=deltaY;}
    else if(nextX<nextY){x+=sx;nextX+=deltaX;}
    else{y+=sy;nextY+=deltaY;}
    if(blocked(x,y))return false;
  }
  return true;
}
export function nearestWater(point){
  point={...point,x:wrapX(point.x)};
  if(!onLand(point.x,point.y))return {...point};
  const px=Math.floor(point.x/rasterCell),py=Math.floor(point.y/rasterCell);
  let best=null,bestDistance=Infinity;
  for(let radius=1;radius<rasterWidth;radius++){
    for(let dy=-radius;dy<=radius;dy++)for(const dx of Math.abs(dy)===radius?Array.from({length:radius*2+1},(_,i)=>i-radius):[-radius,radius]){
      const x=(px+dx+.5)*rasterCell,y=(py+dy+.5)*rasterCell,distance=Math.hypot(x-point.x,y-point.y);
      if(distance<bestDistance&&!onLand(x,y)){best={x:wrapX(x),y};bestDistance=distance;}
    }
    if(best&&radius*rasterCell>bestDistance+rasterCell)return best;
  }
  throw new Error('No navigable water found.');
}
