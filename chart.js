import { ports, discoveries } from './data.js';
import { onLand, inSight, visiblePirates, supplyDays, SIGHT_RADIUS, CHART_CELL, CHART_COLS, distance } from './engine.js';
import { text, wrapText, panel, palette as P, drawShip, drawTown } from './pixel.js';
import { createDisplay } from './display.js';
import { biomeStyleAt } from './biomes.js';
import { createSeaBackground } from './sea-background.js';
import { drawLandmark, landmarkPoint } from './landmarks.js';

export const SCREEN={width:512,height:384};
export const SEA_VIEW={x:0,y:0,width:512,height:384,scale:40};
export function seaPoint(position,p){return {x:SEA_VIEW.x+SEA_VIEW.width/2+(p.x-position.x)*SEA_VIEW.scale,y:SEA_VIEW.y+SEA_VIEW.height/2+(p.y-position.y)*SEA_VIEW.scale};}
export function createChart(canvas,getState,actions){
  const host=canvas.parentElement,frame=document.createElement('canvas');frame.width=SCREEN.width;frame.height=SCREEN.height;
  const c=frame.getContext('2d',{alpha:false});c.imageSmoothingEnabled=false;
  let display,backend='Starting',mode='sea',chartCenter=null,chartZoom=2.6,drag=null,moved=false,buttons=[],hover=null,notice='',noticeUntil=0,lastTime=0,animationId=null,timer=null;
  const hash=(x,y)=>{let h=Math.imul(x,374761393)^Math.imul(y,668265263);h=Math.imul(h^(h>>>13),1274126177);return (h^(h>>>16))>>>0;};
  const landAt=(x,y)=>onLand((Math.floor(x*8)+.5)/8,(Math.floor(y*8)+.5)/8),background=createSeaBackground(SEA_VIEW,landAt);
  const fog=document.createElement('canvas');fog.width=SCREEN.width;fog.height=SCREEN.height;const f=fog.getContext('2d');f.fillStyle='#192a47';
  for(let sy=0;sy<SEA_VIEW.height;sy+=2)for(let sx=0;sx<SEA_VIEW.width;sx+=2){const dist=Math.hypot((sx-SEA_VIEW.width/2)/SEA_VIEW.scale,(sy-SEA_VIEW.height/2)/SEA_VIEW.scale);if(dist>SIGHT_RADIUS||dist>SIGHT_RADIUS-.5&&(sx+sy)%4===0)f.fillRect(sx,sy,2,2);}
  host.addEventListener('display-replaced',e=>{display=e.detail.display;bindCanvas();refresh();});
  createDisplay(canvas,frame,{forceCanvas:new URLSearchParams(location.search).get('renderer')==='canvas',onBackend:name=>{backend=name;host.dataset.renderer=name;}}).then(d=>{display=d;refresh();});
  function terrain(s,time){
    const v=SEA_VIEW,start={x:s.position.x-v.width/2/v.scale,y:s.position.y-v.height/2/v.scale};
    c.save();c.beginPath();c.rect(v.x,v.y,v.width,v.height);c.clip();
    background.draw(c,s.position);
    const wavePhase=Math.floor(time/450)%4,minx=Math.floor(start.x),miny=Math.floor(start.y);
    for(let wy=miny;wy<start.y+v.height/v.scale;wy++)for(let wx=minx;wx<start.x+v.width/v.scale;wx++){
      const h=hash(wx,wy);if(h%3===0||landAt(wx+.4,wy+.4))continue;const p=seaPoint(s.position,{x:wx+.2+(h%5)*.1,y:wy+.2});
      c.fillStyle=h%2?'#4b85e0':'#3b78dc';const shift=wavePhase===h%4?1:0;c.fillRect(Math.round(p.x),Math.round(p.y+shift),6,1);c.fillRect(Math.round(p.x-1),Math.round(p.y+1+shift),1,1);c.fillRect(Math.round(p.x+6),Math.round(p.y-1+shift),1,1);
    }
    for(const d of discoveries.filter(d=>inSight(s,d))){
      const p=landmarkPoint(d,seaPoint(s.position,d)),found=s.found.includes(d.id);
      if(d.sprite)drawLandmark(c,d,p.x,p.y);
      else{c.fillStyle=found?P.gold:'#e8eff0';c.fillRect(p.x-2,p.y-2,5,5);if(!found&&Math.floor(time/600)%2===0){c.fillRect(p.x,p.y-7,1,3);c.fillRect(p.x-7,p.y,3,1);}}
      if(found&&d.id!=='qaitbay'){
        const label=d.label||'DISCOVERY',x=Math.max(4,Math.min(508-label.length*6,p.x-label.length*3));
        c.fillStyle='#142441';c.fillRect(x-2,p.y+11,label.length*6+3,11);text(c,label,x,p.y+13,P.gold);
      }
    }
    for(const p of ports.filter(p=>inSight(s,p))){
      const q=seaPoint(s.position,p),town=p.town?seaPoint(s.position,p.town):{x:q.x+15,y:q.y-15};
      if(p.id!=='alexandria')drawTown(c,Math.round(town.x),Math.round(town.y));
      const name=p.name.toUpperCase(),label=p.id==='alexandria'?q:town,x=Math.min(v.x+v.width-name.length*6-4,Math.max(v.x+4,label.x-name.length*3));
      c.fillStyle='#142441';c.fillRect(x-3,label.y+17,name.length*6+5,12);text(c,name,x,label.y+20,P.gold);
    }
    for(const enemy of visiblePirates(s)){const p=seaPoint(s.position,enemy);drawShip(c,p.x,p.y,{enemy:true,bob:Math.floor(time/500)%2});text(c,'!',p.x-2,p.y-21,P.red);}
    const center=seaPoint(s.position,s.position),toward=s.heading||s.route[0]&&{x:s.route[0].x-s.position.x,y:s.route[0].y-s.position.y};
    if(!s.paused){c.fillStyle='#71aeb9';for(let i=0;i<3;i++){const x=center.x-(toward?.x>0?1:-1)*(18+i*7);c.fillRect(x,center.y+10+(i%2)*2,5-i,1);}}
    drawShip(c,center.x,center.y,{flip:toward?.x<0,bob:Math.floor(time/650)%2});
    c.drawImage(fog,v.x,v.y);
    c.restore();
  }
  function recordedChart(s){
    const v=SEA_VIEW,center=chartCenter||s.position,toScreen=p=>({x:v.x+v.width/2+(p.x-center.x)*chartZoom,y:v.y+v.height/2+(p.y-center.y)*chartZoom});
    c.fillStyle='#293653';c.fillRect(v.x,v.y,v.width,v.height);c.save();c.beginPath();c.rect(v.x,v.y,v.width,v.height);c.clip();
    c.strokeStyle='#35405a';c.lineWidth=1;for(let x=-v.height;x<v.width;x+=12){c.beginPath();c.moveTo(x,0);c.lineTo(x+v.height,v.height);c.stroke();}c.fillStyle='#35405a';for(let x=v.x;x<v.x+v.width;x+=24)c.fillRect(x,v.y,1,v.height);for(let y=v.y;y<v.y+v.height;y+=24)c.fillRect(v.x,y,v.width,1);
    for(const id of s.seen){const wx=(id%CHART_COLS)*CHART_CELL,wy=Math.floor(id/CHART_COLS)*CHART_CELL,p=toScreen({x:wx,y:wy});if(p.x<v.x-CHART_CELL*chartZoom||p.x>v.x+v.width||p.y<v.y-CHART_CELL*chartZoom||p.y>v.y+v.height)continue;
      const step=Math.max(.5,2/chartZoom);for(let dy=0;dy<CHART_CELL;dy+=step)for(let dx=0;dx<CHART_CELL;dx+=step){const q=toScreen({x:wx+dx,y:wy+dy});c.fillStyle=onLand(wx+dx,wy+dy)?biomeStyleAt(wx+dx,wy+dy).chart:'#2a6888';c.fillRect(Math.floor(q.x),Math.floor(q.y),Math.ceil(step*chartZoom),Math.ceil(step*chartZoom));}}
    if(s.route.length){c.strokeStyle=P.gold;c.lineWidth=1;c.setLineDash([2,3]);c.beginPath();const p=toScreen(s.position);c.moveTo(p.x,p.y);for(const target of s.route){const q=toScreen(target);c.lineTo(q.x,q.y);}c.stroke();c.setLineDash([]);}
    for(const d of discoveries.filter(d=>s.found.includes(d.id))){const q=toScreen(d);c.fillStyle=P.gold;c.fillRect(Math.round(q.x),Math.round(q.y)-3,1,7);c.fillRect(Math.round(q.x)-3,Math.round(q.y),7,1);}
    for(const p of ports.filter(p=>s.known.includes(p.id))){const q=toScreen(p);if(q.x<v.x+8||q.x>v.x+v.width-8||q.y<v.y+8||q.y>v.y+v.height-8)continue;c.fillStyle=s.visited.includes(p.id)?P.gold:P.white;c.fillRect(Math.round(q.x)-2,Math.round(q.y)-2,5,5);const labelX=Math.min(v.x+v.width-p.name.length*6-5,q.x+6);text(c,p.name,labelX,q.y-3,P.white);}
    const p=toScreen(s.position);drawShip(c,p.x,p.y,{small:true});c.restore();text(c,'RECORDED COASTS ONLY',v.x+9,v.y+9,P.gold);
    c.fillStyle='#202450';c.fillRect(v.x+5,v.y+v.height-19,350,14);text(c,'DRAG TO PAN',v.x+10,v.y+v.height-16,P.muted);for(const [label,color,x]of [['LAND','#91a878',102],['SEA','#2a6888',151],['UNKNOWN','#35405a',194]]){c.fillStyle=color;c.fillRect(x,368,6,6);text(c,label,x+10,368,P.muted);}
  }
  function draw(time){
    animationId=null;if(document.hidden)return;
    if(time-lastTime<30){animationId=requestAnimationFrame(draw);return;}lastTime=time;
    const s=getState();buttons=[];c.fillStyle=P.ink;c.fillRect(0,0,512,384);if(mode==='chart')recordedChart(s);else terrain(s,time);
    const date=new Date(Date.UTC(1522,3,1)+Math.floor(s.day)*86400000),months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    c.fillStyle='#182c69';c.fillRect(417,6,89,25);text(c,String(date.getUTCFullYear()),475,9,P.gold);text(c,`${months[date.getUTCMonth()]} ${date.getUTCDate()}`,432,21,P.white);
    if(mode==='sea'){
      const days=supplyDays(s),label=`${days} ${days===1?'DAY':'DAYS'}`;
      c.fillStyle='#182c69';c.fillRect(417,34,89,25);text(c,'SUPPLIES',423,37,P.gold);text(c,label,500-label.length*6,49,days<=10?P.red:P.white);
    }
    c.fillStyle='#182c69';c.fillRect(458,365,48,13);text(c,`${s.speed}X ${s.paused?'II':'>'}`,464,368,P.gold);
    if(notice&&time<noticeUntil){panel(c,7,326,498,51,'#e6d19a');text(c,'LOOKOUT',18,335,'#59433f');wrapText(c,notice,18,349,475,'#352b37',2);}
    display?.present();
    if(host.querySelector('dialog')?.open)return;
    if(!s.paused){animationId=requestAnimationFrame(draw);return;}
    let delay=Infinity;
    if(mode==='sea')delay=Math.min(...[450,500,600,650].map(period=>period-time%period));
    if(notice&&time<noticeUntil)delay=Math.min(delay,noticeUntil-time);
    if(Number.isFinite(delay))timer=setTimeout(()=>{timer=null;refresh();},Math.ceil(delay));
  }
  function refresh(){clearTimeout(timer);timer=null;if(animationId===null&&!document.hidden)animationId=requestAnimationFrame(draw);}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(animationId);animationId=null;clearTimeout(timer);timer=null;}else refresh();});
  refresh();
  function relative(e){const rect=host.querySelector('canvas').getBoundingClientRect();return {x:(e.clientX-rect.left)*512/rect.width,y:(e.clientY-rect.top)*384/rect.height};}
  function inside(p){const v=SEA_VIEW;return p.x>=v.x&&p.x<v.x+v.width&&p.y>=v.y&&p.y<v.y+v.height;}
  function world(p){const v=SEA_VIEW,s=getState(),scale=mode==='sea'?v.scale:chartZoom,center=mode==='sea'?s.position:chartCenter||s.position;return {x:center.x+(p.x-v.x-v.width/2)/scale,y:center.y+(p.y-v.y-v.height/2)/scale};}
  function target(p){const s=getState(),candidates=mode==='chart'?ports.filter(p=>s.known.includes(p.id)):ports.filter(p=>inSight(s,p)),scale=mode==='chart'?chartZoom:SEA_VIEW.scale,w=world(p);
    const port=candidates.find(q=>distance(q,w)<Math.max(mode==='chart'?3:.9,12/scale)||mode==='sea'&&q.town&&distance(q.town,w)<.9);
    if(mode==='chart'&&port)return {kind:'port',data:port};
    const landmark=discoveries.filter(d=>d.sprite&&(mode==='chart'?s.found.includes(d.id):inSight(s,d))).find(d=>{const q=landmarkPoint(d,seaPoint(s.position,d));return mode==='chart'?distance(d,w)<3:Math.abs(p.x-q.x)<36&&p.y>q.y-38&&p.y<q.y+10;});
    if(landmark)return {kind:'landmark',data:landmark};
    if(port)return {kind:'port',data:port};if(mode==='sea'){const enemy=visiblePirates(s).find(q=>distance(q,w)<.8);if(enemy)return {kind:'enemy',data:enemy};}return null;}
  function bindCanvas(){host.querySelector('canvas').setAttribute('aria-label','Retro sailing game. Arrow keys or WASD steer. M opens the recorded chart. P enters the harbor. F opens the fleet. Space pauses.');}
  bindCanvas();host.addEventListener('pointermove',e=>{const p=relative(e);if(drag&&mode==='chart'){if(distance(p,drag)>3)moved=true;chartCenter={x:drag.cx-(p.x-drag.x)/chartZoom,y:drag.cy-(p.y-drag.y)/chartZoom};refresh();}hover=buttons.find(b=>p.x>=b.x&&p.x<b.x+b.w&&p.y>=b.y&&p.y<b.y+b.h)||null;host.style.cursor=hover?.enabled||inside(p)&&target(p)?'pointer':'default';});
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
      const known=ports.filter(p=>getState().known.includes(p.id)),left=Math.min(...known.map(p=>p.x)),right=Math.max(...known.map(p=>p.x)),top=Math.min(...known.map(p=>p.y)),bottom=Math.max(...known.map(p=>p.y));
      chartCenter={x:(left+right)/2,y:(top+bottom)/2};chartZoom=Math.min(SEA_VIEW.width/(right-left+30),SEA_VIEW.height/(bottom-top+30));refresh();
    },
    invalidate(){background.clear();refresh();},
    debug(){return {mode,backend,position:{...getState().position},view:{...SEA_VIEW},visiblePorts:ports.filter(p=>inSight(getState(),p)).map(p=>p.id),visibleEnemies:mode==='sea'?visiblePirates(getState()).map(p=>p.id):[],sightRadius:SIGHT_RADIUS,backgroundTiles:background.size,buttons:buttons.map(({id,x,y,w,h,enabled})=>({id,x,y,w,h,enabled}))};},
  };
}
