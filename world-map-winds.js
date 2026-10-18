import { prevailingSampler, windReport } from './wind.js';
import { onLand } from './terrain.js';

export const windMonths=['January','February','March','April','May','June','July','August','September','October','November','December'];
export const monthDay=month=>(Date.UTC(1522,month,15)-Date.UTC(1522,3,1))/86400000;
export function monthSeasons(month){const north=['winter','spring','summer','autumn'][Math.floor(((month+1)%12)/3)],south=['summer','autumn','winter','spring'][Math.floor(((month+1)%12)/3)];return `North: ${north} / South: ${south}`;}
export const monthlyWinds=position=>windMonths.map((name,month)=>{const wind=prevailingSampler(monthDay(month))(position);return {name,month,...wind,...windReport(wind)};});
export const windColor=speed=>speed<4?'#a4cce8':speed<12?'#c7f5e4':speed<20?'#ffe3a1':'#ffba88';

export function seasonalComparison(series){
  const jan=series[0],jul=series[6],low=Math.min(...series.map(w=>w.speed)),high=Math.max(...series.map(w=>w.speed));
  const angle=jan.speed>=2&&jul.speed>=2?Math.round(Math.acos(Math.max(-1,Math.min(1,(jan.x*jul.x+jan.y*jul.y)/jan.speed/jul.speed)))*180/Math.PI):null;
  return `January: ${jan.speed<.5?'calm':`from ${jan.from}, ${Math.round(jan.speed)} kt`}. July: ${jul.speed<.5?'calm':`from ${jul.from}, ${Math.round(jul.speed)} kt`}. ${angle===null?'':`Direction changes by ${angle}° between them. `}Monthly strength ranges ${Math.round(low)}–${Math.round(high)} kt.`;
}

export function drawPrevailingWinds(ctx,{width,height,scale,center,month},landAt=onLand){
  const step=[1.25,2.5,5,12.5,25,50,75,100,150].find(step=>step*scale>=36)||150;
  const left=Math.max(0,center.x-width/2/scale),right=Math.min(1800,center.x+width/2/scale),top=Math.max(0,center.y-height/2/scale),bottom=Math.min(900,center.y+height/2/scale);
  const sample=prevailingSampler(monthDay(month));let count=0;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  for(let y=Math.ceil(top/step)*step;y<bottom;y+=step)for(let x=Math.ceil(left/step)*step;x<right;x+=step){
    if(landAt(x,y))continue;const wind=sample({x,y}),speed=Math.hypot(wind.x,wind.y),px=(x-center.x)*scale+width/2,py=(y-center.y)*scale+height/2;count++;
    ctx.beginPath();
    if(speed<.5)ctx.arc(px,py,2,0,Math.PI*2);
    else{
      const dx=wind.x/speed,dy=wind.y/speed,size=4+Math.min(10,speed*.45),head=4;
      ctx.moveTo(px-dx*size,py-dy*size);ctx.lineTo(px+dx*size,py+dy*size);
      ctx.moveTo(px+dx*(size-head)-dy*3,py+dy*(size-head)+dx*3);ctx.lineTo(px+dx*size,py+dy*size);ctx.lineTo(px+dx*(size-head)+dy*3,py+dy*(size-head)-dx*3);
    }
    ctx.strokeStyle='#163658';ctx.lineWidth=3.5;ctx.stroke();ctx.strokeStyle=windColor(speed);ctx.lineWidth=1.5;ctx.stroke();
  }
  ctx.restore();return count;
}
