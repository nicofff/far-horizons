import { ports, discoveries } from './data.js';
import { onLand, inSight, visiblePirates, supplyDays, SIGHT_RADIUS, CHART_CELL, CHART_COLS, distance, currentWind, sailingHeading } from './engine.js';
import { text as paintText, wrapText, panel, palette as P, drawShip as paintShip, drawTown } from './pixel.js';
import { createCachedArt } from './cached-art.js';
import { createDisplay } from './display.js';
import { biomeStyleAt } from './biomes.js';
import { createSeaBackground, SURF_STEP } from './sea-background.js';
import { drawLandmark, landmarkPoint } from './landmarks.js';
import { calendarAt, daylightAt, drawDaylight } from './world-time.js';
import { prevailingSampler } from './wind.js';
import { drawWindGauge, drawWindArrow } from './wind-display.js';
import { WORLD, wrapX, longitudeDelta, longitudeBounds } from './world.js';

export const SCREEN={width:512,height:384};
export const SEA_VIEW={x:0,y:0,width:512,height:384,scale:40};
export function seaPoint(position,p){return {x:SEA_VIEW.x+SEA_VIEW.width/2+longitudeDelta(position.x,p.x)*SEA_VIEW.scale,y:SEA_VIEW.y+SEA_VIEW.height/2+(p.y-position.y)*SEA_VIEW.scale};}
export function createChart(canvas,getState,actions){
  const host=canvas.parentElement,frame=document.createElement('canvas');frame.width=SCREEN.width;frame.height=SCREEN.height;
  const c=frame.getContext('2d',{alpha:false});c.imageSmoothingEnabled=false;
  const {text,drawShip}=createCachedArt({text:paintText,drawShip:paintShip});
  let display,backend='Starting',mode='sea',chartCenter=null,chartZoom=2.6,drag=null,moved=false,buttons=[],hover=null,notice='',noticeUntil=0,lastTime=0,animationId=null,timer=null,lighting=null;
  const landAt=(x,y)=>onLand((Math.floor(x*8)+.5)/8,(Math.floor(y*8)+.5)/8),background=createSeaBackground(SEA_VIEW,landAt);
  const fog=document.createElement('canvas');fog.width=SCREEN.width;fog.height=SCREEN.height;const f=fog.getContext('2d');f.fillStyle='#192a47';
  for(let sy=0;sy<SEA_VIEW.height;sy+=2)for(let sx=0;sx<SEA_VIEW.width;sx+=2){const dist=Math.hypot((sx-SEA_VIEW.width/2)/SEA_VIEW.scale,(sy-SEA_VIEW.height/2)/SEA_VIEW.scale);if(dist>SIGHT_RADIUS||dist>SIGHT_RADIUS-.5&&(sx+sy)%4===0)f.fillRect(sx,sy,2,2);}
  host.addEventListener('display-replaced',e=>{display=e.detail.display;bindCanvas();refresh();});
  createDisplay(canvas,frame,{forceCanvas:new URLSearchParams(location.search).get('renderer')==='canvas',onBackend:name=>{backend=name;host.dataset.renderer=name;}}).then(d=>{display=d;refresh();});
  function terrain(s,time){
    const v=SEA_VIEW;
    const light=daylightAt(s.day,s.position.y),fade=lighting&&!s.paused?1-Math.exp(-(time-lighting.time)/900):1;
    lighting={...light,night:lighting?lighting.night+(light.night-lighting.night)*fade:light.night,warmth:lighting?lighting.warmth+(light.warmth-lighting.warmth)*fade:light.warmth,time};
    c.save();c.beginPath();c.rect(v.x,v.y,v.width,v.height);c.clip();
    background.draw(c,s.position,time,s.day);
    background.drawWaves(c,s.position,time,s.day);
    background.drawScenery(c,s.position,s.day);
    drawDaylight(c,v,lighting);
    for(const d of discoveries.filter(d=>inSight(s,d))){
      const p=landmarkPoint(d,seaPoint(s.position,d)),found=s.found.includes(d.id);
      if(d.sprite)drawLandmark(c,d,p.x,p.y);
      else{c.fillStyle=found?P.gold:'#e8eff0';c.fillRect(p.x-2,p.y-2,5,5);if(!found&&Math.floor(time/600)%2===0){c.fillRect(p.x,p.y-7,1,3);c.fillRect(p.x-7,p.y,3,1);}}
      if(found){
        const label=d.label||'DISCOVERY',x=Math.max(4,Math.min(508-label.length*6,p.x-label.length*3));
        c.fillStyle='#142441';c.fillRect(x-2,p.y+11,label.length*6+3,11);text(c,label,x,p.y+13,P.gold);
      }
    }
    for(const p of ports.filter(p=>inSight(s,p))){
      const q=seaPoint(s.position,p),town=p.town?seaPoint(s.position,p.town):{x:q.x+15,y:q.y-15};
      drawTown(c,Math.round(town.x),Math.round(town.y));
      if(lighting.night>.45){c.fillStyle='#e1bd72';for(const [dx,dy] of [[-22,3],[5,-5],[18,2]])c.fillRect(Math.round(town.x)+dx,Math.round(town.y)+dy,2,3);}
      const name=p.name.toUpperCase(),label=town,x=Math.min(v.x+v.width-name.length*6-4,Math.max(v.x+4,label.x-name.length*3));
      c.fillStyle='#142441';c.fillRect(x-3,label.y+17,name.length*6+5,12);text(c,name,x,label.y+20,P.gold);
    }
    for(const enemy of visiblePirates(s)){const p=seaPoint(s.position,enemy);drawShip(c,p.x,p.y,{type:enemy.type,enemy:true,bob:Math.floor(time/500)%2});text(c,'!',p.x-2,p.y-34,P.red);}
    const center=seaPoint(s.position,s.position),toward=sailingHeading(s);
    if(!s.paused){c.fillStyle='#71aeb9';for(let i=0;i<3;i++){const x=center.x-(toward?.x>0?1:-1)*(18+i*7);c.fillRect(x,center.y+10+(i%2)*2,5-i,1);}}
    drawShip(c,center.x,center.y,{type:s.ships[0]?.type,flip:toward?.x<0,bob:Math.floor(time/650)%2});
    c.drawImage(fog,v.x,v.y);
    c.restore();
  }
  function recordedChart(s){
    const v=SEA_VIEW,center=chartCenter||s.position,toScreen=p=>({x:v.x+v.width/2+longitudeDelta(center.x,p.x)*chartZoom,y:v.y+v.height/2+(p.y-center.y)*chartZoom});
    c.fillStyle='#293653';c.fillRect(v.x,v.y,v.width,v.height);c.save();c.beginPath();c.rect(v.x,v.y,v.width,v.height);c.clip();
    c.strokeStyle='#35405a';c.lineWidth=1;for(let x=-v.height;x<v.width;x+=12){c.beginPath();c.moveTo(x,0);c.lineTo(x+v.height,v.height);c.stroke();}c.fillStyle='#35405a';for(let x=v.x;x<v.x+v.width;x+=24)c.fillRect(x,v.y,1,v.height);for(let y=v.y;y<v.y+v.height;y+=24)c.fillRect(v.x,y,v.width,1);
    for(const id of s.seen){const wx=(id%CHART_COLS)*CHART_CELL,wy=Math.floor(id/CHART_COLS)*CHART_CELL,p=toScreen({x:wx,y:wy});if(p.x<v.x-CHART_CELL*chartZoom||p.x>v.x+v.width||p.y<v.y-CHART_CELL*chartZoom||p.y>v.y+v.height)continue;
      const step=Math.max(.5,2/chartZoom);for(let dy=0;dy<CHART_CELL;dy+=step)for(let dx=0;dx<CHART_CELL;dx+=step){const q=toScreen({x:wx+dx,y:wy+dy});c.fillStyle=onLand(wx+dx,wy+dy)?biomeStyleAt(wx+dx,wy+dy).chart:'#2a6888';c.fillRect(Math.floor(q.x),Math.floor(q.y),Math.ceil(step*chartZoom),Math.ceil(step*chartZoom));}}
    const wind=prevailingSampler(s.day),seen=new Set(s.seen),spacing=48/chartZoom;
    for(let y=Math.floor((center.y-v.height/2/chartZoom)/spacing)*spacing;y<center.y+v.height/2/chartZoom;y+=spacing)for(let x=Math.floor((center.x-v.width/2/chartZoom)/spacing)*spacing;x<center.x+v.width/2/chartZoom;x+=spacing){
      if(!seen.has(Math.floor(y/CHART_CELL)*CHART_COLS+Math.floor(wrapX(x)/CHART_CELL))||onLand(x,y))continue;
      const q=toScreen({x,y});drawWindArrow(c,q.x,q.y,wind({x,y}),'#8ca8ab',6);
    }
    if(s.route.length){
      c.strokeStyle=P.gold;c.lineWidth=1;c.setLineDash([2,3]);c.beginPath();
      for(const offset of [-WORLD.width,0,WORLD.width]){
        let x=center.x+longitudeDelta(center.x,s.position.x)+offset,previous=s.position;
        c.moveTo(v.x+v.width/2+(x-center.x)*chartZoom,toScreen(s.position).y);
        for(const target of s.route){x+=longitudeDelta(previous.x,target.x);c.lineTo(v.x+v.width/2+(x-center.x)*chartZoom,toScreen(target).y);previous=target;}
      }
      c.stroke();c.setLineDash([]);
    }
    for(const d of discoveries.filter(d=>s.found.includes(d.id))){const q=toScreen(d);c.fillStyle=P.gold;c.fillRect(Math.round(q.x),Math.round(q.y)-3,1,7);c.fillRect(Math.round(q.x)-3,Math.round(q.y),7,1);}
    for(const p of ports.filter(p=>s.known.includes(p.id))){const q=toScreen(p);if(q.x<v.x+8||q.x>v.x+v.width-8||q.y<v.y+8||q.y>v.y+v.height-8)continue;c.fillStyle=s.visited.includes(p.id)?P.gold:P.white;c.fillRect(Math.round(q.x)-2,Math.round(q.y)-2,5,5);const labelX=Math.min(v.x+v.width-p.name.length*6-5,q.x+6);text(c,p.name,labelX,q.y-3,P.white);}
    const p=toScreen(s.position);drawShip(c,p.x,p.y,{type:s.ships[0]?.type,small:true});c.restore();text(c,'RECORDED COASTS ONLY',v.x+9,v.y+9,P.gold);
    c.fillStyle='#202450';c.fillRect(v.x+5,v.y+v.height-19,350,14);text(c,'DRAG TO PAN',v.x+10,v.y+v.height-16,P.muted);for(const [label,color,x]of [['LAND','#91a878',102],['SEA','#2a6888',151],['UNKNOWN','#35405a',194]]){c.fillStyle=color;c.fillRect(x,368,6,6);text(c,label,x+10,368,P.muted);}text(c,'ARROWS: WIND',263,368,P.muted);
  }
  function draw(time){
    animationId=null;if(document.hidden)return;
    if(time-lastTime<30){animationId=requestAnimationFrame(draw);return;}lastTime=time;
    const s=getState();buttons=[];c.fillStyle=P.ink;c.fillRect(0,0,512,384);if(mode==='chart')recordedChart(s);else terrain(s,time);
    const date=calendarAt(s.day),months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    c.fillStyle='#182c69';c.fillRect(417,6,89,25);text(c,String(date.getUTCFullYear()),475,9,P.gold);text(c,`${months[date.getUTCMonth()]} ${date.getUTCDate()}`,432,21,P.white);
    if(mode==='sea'){
      drawWindGauge(c,currentWind(s),sailingHeading(s),text);
      const days=supplyDays(s),label=`${days} ${days===1?'DAY':'DAYS'}`;
      c.fillStyle='#182c69';c.fillRect(417,34,89,25);text(c,'SUPPLIES',423,37,P.gold);text(c,label,500-label.length*6,49,days<=10?P.red:P.white);
      c.fillStyle='#182c69';c.fillRect(417,62,89,12);text(c,`${lighting.phase} ${lighting.season}`,422,65,P.muted);
    }
    c.fillStyle='#182c69';c.fillRect(458,365,48,13);text(c,`${s.speed}X ${s.paused?'II':'>'}`,464,368,P.gold);
    if(notice&&time<noticeUntil){panel(c,7,326,498,51,'#e6d19a');text(c,'LOOKOUT',18,335,'#59433f');wrapText(c,notice,18,349,475,'#352b37',2);}
    display?.present();
    if(host.querySelector('dialog')?.open)return;
    if(!s.paused){animationId=requestAnimationFrame(draw);return;}
    let delay=Infinity;
    if(mode==='sea')delay=Math.min(...[SURF_STEP,450,500,600,650].map(period=>period-time%period));
    if(notice&&time<noticeUntil)delay=Math.min(delay,noticeUntil-time);
    if(Number.isFinite(delay))timer=setTimeout(()=>{timer=null;refresh();},Math.ceil(delay));
  }
  function refresh(){clearTimeout(timer);timer=null;if(animationId===null&&!document.hidden)animationId=requestAnimationFrame(draw);}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(animationId);animationId=null;clearTimeout(timer);timer=null;}else refresh();});
  refresh();
  function relative(e){const rect=host.querySelector('canvas').getBoundingClientRect();return {x:(e.clientX-rect.left)*512/rect.width,y:(e.clientY-rect.top)*384/rect.height};}
  function inside(p){const v=SEA_VIEW;return p.x>=v.x&&p.x<v.x+v.width&&p.y>=v.y&&p.y<v.y+v.height;}
  function world(p){const v=SEA_VIEW,s=getState(),scale=mode==='sea'?v.scale:chartZoom,center=mode==='sea'?s.position:chartCenter||s.position;return {x:wrapX(center.x+(p.x-v.x-v.width/2)/scale),y:center.y+(p.y-v.y-v.height/2)/scale};}
  function target(p){const s=getState(),candidates=mode==='chart'?ports.filter(p=>s.known.includes(p.id)):ports.filter(p=>inSight(s,p)),scale=mode==='chart'?chartZoom:SEA_VIEW.scale,w=world(p);
    const port=candidates.find(q=>{
      if(distance(q,w)<Math.max(mode==='chart'?3:.9,12/scale))return true;
      if(mode!=='sea')return false;
      const harbor=seaPoint(s.position,q),town=q.town?seaPoint(s.position,q.town):{x:harbor.x+15,y:harbor.y-15},labelX=Math.min(SEA_VIEW.width-q.name.length*6-4,Math.max(4,town.x-q.name.length*3));
      return Math.abs(p.x-town.x)<30&&p.y>=town.y-26&&p.y<town.y+17||p.x>=labelX-3&&p.x<labelX+q.name.length*6+2&&p.y>=town.y+17&&p.y<town.y+29;
    });
    if(mode==='chart'&&port)return {kind:'port',data:port};
    const landmark=discoveries.filter(d=>d.sprite&&(mode==='chart'?s.found.includes(d.id):inSight(s,d))).find(d=>{
      if(mode==='chart')return distance(d,w)<3;
      const q=landmarkPoint(d,seaPoint(s.position,d)),label=d.label||'DISCOVERY',labelX=Math.max(4,Math.min(508-label.length*6,q.x-label.length*3));
      return Math.abs(p.x-q.x)<22&&p.y>=q.y-19&&p.y<q.y+6||s.found.includes(d.id)&&p.x>=labelX-2&&p.x<labelX+label.length*6+1&&p.y>=q.y+11&&p.y<q.y+22;
    });
    if(landmark)return {kind:'landmark',data:landmark};
    if(port)return {kind:'port',data:port};if(mode==='sea'){const enemy=visiblePirates(s).find(q=>distance(q,w)<.8);if(enemy)return {kind:'enemy',data:enemy};}return null;}
  function bindCanvas(){host.querySelector('canvas').setAttribute('aria-label','Retro sailing game. Arrow keys or WASD steer. M opens the recorded chart. Harbors open automatically on arrival. P reopens the harbor menu. F opens Ships. C opens Cargo. J opens Journal. R opens Voyage status. Question mark opens Help. Space pauses.');}
  bindCanvas();host.addEventListener('pointermove',e=>{const p=relative(e);if(drag&&mode==='chart'){if(distance(p,drag)>3)moved=true;chartCenter={x:wrapX(drag.cx-(p.x-drag.x)/chartZoom),y:drag.cy-(p.y-drag.y)/chartZoom};refresh();}hover=buttons.find(b=>p.x>=b.x&&p.x<b.x+b.w&&p.y>=b.y&&p.y<b.y+b.h)||null;host.style.cursor=hover?.enabled||inside(p)&&target(p)?'pointer':'default';});
  host.addEventListener('pointerdown',e=>{const p=relative(e);if(e.button!==0)return;moved=false;if(mode==='chart'&&inside(p)){const center=chartCenter||getState().position;drag={...p,cx:center.x,cy:center.y};host.setPointerCapture(e.pointerId);}});
  host.addEventListener('pointerup',e=>{const p=relative(e);drag=null;if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);if(moved)return;const b=buttons.find(b=>p.x>=b.x&&p.x<b.x+b.w&&p.y>=b.y&&p.y<b.y+b.h);if(b){if(b.enabled)b.fn();return;}if(!inside(p))return;const hit=target(p);if(hit?.kind==='port')actions.select(hit.data.id);else if(hit?.kind==='landmark')actions.landmark(hit.data.id);else if(hit?.kind==='enemy')actions.enemy(hit.data);else if(mode==='sea'){const w=world(p);if(inSight(getState(),w))actions.course(w);}else notify('Select a known harbor or recorded landmark. Unknown waters must be explored from the sea.');});
  host.addEventListener('pointercancel',()=>{drag=null;moved=true;});host.addEventListener('wheel',e=>{e.preventDefault();if(mode==='sea')return;chartZoom=Math.max(.45,Math.min(12,chartZoom*Math.exp(-e.deltaY*.001)));refresh();},{passive:false});
  function toggleChart(){mode=mode==='sea'?'chart':'sea';getState().paused=true;chartCenter=null;actions.mode?.(mode);refresh();}
  function notify(message){notice=message;noticeUntil=performance.now()+6000;refresh();}
  return {
    toggleChart,notify,refresh,get mode(){return mode;},get backend(){return backend;},
    focus(p){if(p){mode='chart';chartCenter={...p};chartZoom=3;}else{mode='sea';chartCenter=null;}refresh();},
    world(){
      if(mode!=='chart')toggleChart();
      const known=ports.filter(p=>getState().known.includes(p.id)),span=longitudeBounds(known),top=Math.min(...known.map(p=>p.y)),bottom=Math.max(...known.map(p=>p.y));
      chartCenter={x:span.center,y:(top+bottom)/2};chartZoom=Math.min(SEA_VIEW.width/(span.width+30),SEA_VIEW.height/(bottom-top+30));refresh();
    },
    invalidate(){background.clear();lighting=null;refresh();},
    debug(){return {mode,backend,position:{...getState().position},view:{...SEA_VIEW},visiblePorts:ports.filter(p=>inSight(getState(),p)).map(p=>p.id),visibleEnemies:mode==='sea'?visiblePirates(getState()).map(p=>p.id):[],sightRadius:SIGHT_RADIUS,backgroundTiles:background.size,buttons:buttons.map(({id,x,y,w,h,enabled})=>({id,x,y,w,h,enabled}))};},
  };
}
