export const WORLD={width:1800,height:900};

export function wrapX(x){return x>=0&&x<WORLD.width?x:((x%WORLD.width)+WORLD.width)%WORLD.width;}

export function longitudeDelta(from,to){
  const delta=to-from;
  return Math.abs(delta)<=WORLD.width/2?delta:wrapX(delta+WORLD.width/2)-WORLD.width/2;
}

export const worldDistance=(a,b)=>Math.hypot(longitudeDelta(a.x,b.x),b.y-a.y);
export const nearestLongitude=(reference,x)=>reference+longitudeDelta(reference,x);

export function longitudeBounds(points){
  const values=points.map(p=>wrapX(p.x)).sort((a,b)=>a-b);if(!values.length)return {center:0,width:0};
  let largest=-1,start=values[0];
  for(let i=0;i<values.length;i++){
    const next=values[(i+1)%values.length]+(i===values.length-1?WORLD.width:0),gap=next-values[i];
    if(gap>largest){largest=gap;start=next;}
  }
  const width=WORLD.width-largest;return {center:wrapX(start+width/2),width};
}
