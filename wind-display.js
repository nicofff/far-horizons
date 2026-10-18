import { text, palette as P } from './pixel.js';
import { windReport } from './wind.js';

export function drawWindArrow(c,x,y,wind,color=P.muted,size=8){
  const speed=Math.hypot(wind.x,wind.y);if(speed<.5)return;
  const dx=wind.x/speed,dy=wind.y/speed;
  const line=(ax,ay,bx,by)=>{
    const steps=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)));
    for(let i=0;i<=steps;i++)c.fillRect(Math.round(x+ax+(bx-ax)*i/steps),Math.round(y+ay+(by-ay)*i/steps),1,1);
  };
  c.fillStyle=color;
  line(-dx*size,-dy*size,dx*size,dy*size);
  line(dx*size,dy*size,dx*(size-4)-dy*3,dy*(size-4)+dx*3);
  line(dx*size,dy*size,dx*(size-4)+dy*3,dy*(size-4)-dx*3);
}

export function drawWindGauge(c,wind,heading){
  const report=windReport(wind,heading),percent=Math.round(report.factor*100);
  c.fillStyle='#182c69';c.fillRect(6,6,125,29);
  text(c,`WIND FROM ${report.from}`,12,11,P.gold);
  text(c,`${Math.round(report.speed)}KT${heading?' '+report.point+' '+percent+'%':''}`,12,23,report.point==='HEAD'?P.red:P.white);
  drawWindArrow(c,119,23,wind,P.muted,6);
}
