import { windWidth, windHeight, windCell, windUnit, windVectors } from './assets/world-winds.js';
import { calendarAt } from './world-time.js';
import { longitudeDelta } from './world.js';

const bytes=atob(windVectors),vectors=new Int8Array(bytes.length);
for(let i=0;i<bytes.length;i++)vectors[i]=bytes.charCodeAt(i);
if(vectors.length!==12*windWidth*windHeight*2)throw new Error('Invalid wind climatology.');
const KNOTS=1.943844,TAU=Math.PI*2;
const mix=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*(3-2*t);
const wrap=(x,size)=>(x%size+size)%size;
let lastDay,lastSampler;

export function prevailingSampler(day){
  if(day===lastDay)return lastSampler;
  const date=calendarAt(day),year=date.getUTCFullYear(),month=date.getUTCMonth(),time=date.getTime();
  const center=Date.UTC(year,month,15),before=time<center;
  const start=before?Date.UTC(year,month-1,15):center,end=before?center:Date.UTC(year,month+1,15);
  const first=(month+(before?11:0))%12,next=(first+1)%12,blend=(time-start)/(end-start);
  const sample=position=>{
    const gx=wrap(position.x/windCell+windWidth/2,windWidth),gy=Math.max(0,Math.min(windHeight-1,position.y/windCell));
    const x0=Math.floor(gx),x1=(x0+1)%windWidth,y0=Math.floor(gy),y1=Math.min(y0+1,windHeight-1),fx=gx-x0,fy=gy-y0;
    const component=(m,axis)=>{
      const at=(x,y)=>vectors[((m*windHeight+y)*windWidth+x)*2+axis];
      return mix(mix(at(x0,y0),at(x1,y0),fx),mix(at(x0,y1),at(x1,y1),fx),fy);
    };
    return {x:mix(component(first,0),component(next,0),blend)*windUnit*KNOTS,y:mix(component(first,1),component(next,1),blend)*windUnit*KNOTS};
  };
  lastDay=day;lastSampler=sample;return sample;
}

export function prevailingWindAt(position,day){return prevailingSampler(day)(position);}

function weatherNoise(x,y,time,seed){
  const gx=x/60,gy=y/60,gz=time/3,ix=Math.floor(gx),iy=Math.floor(gy),iz=Math.floor(gz),fx=smooth(gx-ix),fy=smooth(gy-iy),fz=smooth(gz-iz);
  const value=(x,y,z)=>{
    let h=Math.imul(wrap(x,30),374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647)^seed;
    h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/2147483647.5-1;
  };
  const plane=z=>mix(mix(value(ix,iy,z),value(ix+1,iy,z),fx),mix(value(ix,iy+1,z),value(ix+1,iy+1,z),fx),fy);
  return mix(plane(iz),plane(iz+1),fz);
}

export function windAt(position,day,seed=0){
  const normal=prevailingWindAt(position,day),turn=weatherNoise(position.x,position.y,day,seed)*.32;
  const strength=1+weatherNoise(position.x,position.y,day,seed^0x5bd1e995)*.22;
  const drift=weatherNoise(position.x,position.y,day,seed^0x27d4eb2d)*2;
  const x=(normal.x*Math.cos(turn)-normal.y*Math.sin(turn))*strength+drift;
  const y=(normal.x*Math.sin(turn)+normal.y*Math.cos(turn))*strength+weatherNoise(position.x,position.y,day,seed^0x165667b1)*2;
  return {x,y,speed:Math.hypot(x,y)};
}

export function sailingFactor(wind,heading){
  const speed=wind.speed??Math.hypot(wind.x,wind.y),length=heading?Math.hypot(heading.x,heading.y):0;
  const alignment=speed&&length?(wind.x*heading.x+wind.y*heading.y)/speed/length:0,strength=Math.min(1,speed/12);
  const angle=Math.max(-1,Math.min(1,alignment));
  return .55+.45*strength+strength*(angle>=0?.4:.55)*angle;
}

export function windReport(wind,heading){
  const speed=wind.speed??Math.hypot(wind.x,wind.y),bearing=(Math.atan2(-wind.x,wind.y)+TAU)%TAU;
  const from=['N','NE','E','SE','S','SW','W','NW'][Math.round(bearing/(TAU/8))%8];
  const length=heading?Math.hypot(heading.x,heading.y):0,alignment=speed&&length?(wind.x*heading.x+wind.y*heading.y)/speed/length:0;
  return {from,speed,factor:sailingFactor(wind,heading),point:speed<4?'LIGHT':!length?'NO COURSE':alignment>.35?'FAIR':alignment<-.35?'HEAD':'CROSS'};
}

export function prevailingCost(day){
  const sample=prevailingSampler(day);
  return (a,b)=>{
    const dx=longitudeDelta(a.x,b.x),dy=b.y-a.y,length=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(length/10));let cost=0;
    for(let i=0;i<steps;i++)cost+=length/steps/sailingFactor(sample({x:a.x+dx*(i+.5)/steps,y:a.y+dy*(i+.5)/steps}),{x:dx,y:dy});
    return cost;
  };
}
