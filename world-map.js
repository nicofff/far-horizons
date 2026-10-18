import * as data from './data.js';
import { windMonths, monthSeasons, monthlyWinds, seasonalComparison, drawPrevailingWinds } from './world-map-winds.js';
(async()=>{
  const root=document.getElementById('far-horizons-world');
  const canvas=root.querySelector('#world-canvas'),ctx=canvas.getContext('2d');
  const select=root.querySelector('#map-place'),detail=root.querySelector('#map-detail');
  root.querySelector('.map-count').textContent=`${data.ports.length} harbors · ${data.discoveries.length} discoveries`;
  canvas.setAttribute('aria-label',`Full game world map with ${data.ports.length} harbors, ${data.discoveries.length} landmarks, and monthly prevailing winds. Click the sea to inspect winds, or use the location selector to inspect a harbor or landmark.`);
  const monthSelect=root.querySelector('#wind-month'),windToggle=root.querySelector('#map-winds'),labelToggle=root.querySelector('#map-labels'),playButton=root.querySelector('#wind-play');
  let month=0,playTimer=null,probe={...data.xy(65,12)},series=monthlyWinds(probe);
  for(const [value,name] of windMonths.entries()){const option=document.createElement('option');option.value=value;option.textContent=name;monthSelect.append(option);}
  let width=728,height=430,dpr=1,zoom=1,center={x:900,y:420},drag=null,moved=false,selected=null,labels=[],hitPoints=[];
  const base=new Image();base.src='./assets/world-biomes.png';await base.decode();
  const fit=()=>Math.min((width-30)/1800,(height-30)/900);
  const scale=()=>fit()*zoom;
  const screen=p=>({x:(p.x-center.x)*scale()+width/2,y:(p.y-center.y)*scale()+height/2});
  const world=p=>({x:(p.x-width/2)/scale()+center.x,y:(p.y-height/2)/scale()+center.y});
  const bounds=()=>{center.x=Math.max(0,Math.min(1800,center.x));center.y=Math.max(0,Math.min(900,center.y));};
  const intersects=(a,b)=>a.x<b.x+b.w+5&&a.x+a.w+5>b.x&&a.y<b.y+b.h+3&&a.y+a.h+3>b.y;
  function draw(){
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle='#2865ce';ctx.fillRect(0,0,width,height);
    const origin=screen({x:0,y:0});ctx.drawImage(base,origin.x,origin.y,1800*scale(),900*scale());
    canvas.dataset.windArrows=windToggle.checked?drawPrevailingWinds(ctx,{width,height,scale:scale(),center,month}):0;
    labels=[];hitPoints=[];
    const places=[...data.ports.map(p=>({...p,kind:'port'})),...data.discoveries.map(p=>({...p,kind:'discovery'}))];
    ctx.font='12px system-ui, sans-serif';ctx.textBaseline='middle';ctx.textAlign='center';
    const oceans=[['PACIFIC',250,440],['ATLANTIC',690,410],['INDIAN OCEAN',1220,560]];
    ctx.fillStyle='#c1d8f1';for(const [name,x,y]of oceans){const p=screen({x,y});ctx.fillText(name,p.x,p.y);}
    for(const place of places){const p=screen(place);if(p.x<0||p.x>width||p.y<0||p.y>height)continue;
      ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));if(place.kind==='discovery')ctx.rotate(Math.PI/4);ctx.fillStyle=place.kind==='port'?'#f8cb70':'#e6eeef';ctx.strokeStyle='#203b6b';ctx.lineWidth=1;ctx.fillRect(-3,-3,6,6);ctx.strokeRect(-3,-3,6,6);ctx.restore();
      hitPoints.push({...place,px:p.x,py:p.y});
    }
    ctx.textAlign='left';
    const ordered=[...places].sort((a,b)=>(b.id===selected)-(a.id===selected)||Number(a.kind==='discovery')-Number(b.kind==='discovery'));
    for(const place of ordered){if(!labelToggle.checked&&place.id!==selected)continue;if(place.kind==='discovery'&&place.id!==selected&&zoom<2.5)continue;const p=screen(place);if(p.x<4||p.x>width-4||p.y<4||p.y>height-4)continue;
      const w=ctx.measureText(place.name).width+10,h=19;let box;
      const offsets=[[9,-10],[-w-9,-10],[9,12],[-w-9,12],[9,-30],[-w-9,-30],[9,32],[-w-9,32],[12,-52],[-w-12,-52],[12,54],[-w-12,54],[30,-75],[-w-30,-75],[30,78],[-w-30,78]];
      for(const [dx,dy]of offsets){const candidate={x:p.x+dx,y:p.y+dy,w,h};if(candidate.x<5||candidate.x+w>width-5||candidate.y<5||candidate.y+h>height-5||labels.some(other=>intersects(candidate,other)))continue;box=candidate;break;}
      if(!box)continue;
      labels.push({...box,id:place.id});
      const near={x:Math.max(box.x,Math.min(box.x+w,p.x)),y:Math.max(box.y,Math.min(box.y+h,p.y))};
      ctx.strokeStyle='#d7d8b4';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(near.x,near.y);ctx.stroke();
      ctx.fillStyle=place.id===selected?'#eee0ad':'#20385be6';ctx.fillRect(box.x,box.y,w,h);ctx.fillStyle=place.id===selected?'#292b37':'#f4e7b5';ctx.fillText(place.name,box.x+5,box.y+h/2);
    }
    if(windToggle.checked){const point=screen(probe);ctx.strokeStyle='#c7f5e4';ctx.lineWidth=2;ctx.beginPath();ctx.arc(point.x,point.y,7,0,Math.PI*2);ctx.stroke();}
    if(selected){const place=places.find(p=>p.id===selected);if(place){const p=screen(place);ctx.strokeStyle='#fff0ad';ctx.lineWidth=1.5;ctx.strokeRect(p.x-7,p.y-7,14,14);}}
  }
  function resize(){width=canvas.getBoundingClientRect().width;height=canvas.getBoundingClientRect().height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;draw();}
  new ResizeObserver(resize).observe(canvas);resize();
  function choose(id,focus=false){
    const place=[...data.ports,...data.discoveries].find(p=>p.id===id);if(!place)return;selected=id;select.value=id;
    const title=document.createElement('strong'),description=document.createElement('span');title.textContent=place.name;description.textContent=place.region?` · ${place.region} · ${place.supplyOnly?'Supply anchorage':place.specialty?'Specialty: '+data.goods[place.specialty].name:'Regional market'} · ${place.description}`:` · ${place.description}`;detail.replaceChildren(title,description);
    if(focus){center={x:place.x,y:place.y};zoom=5;}inspectWind(place,place.name);
  }
  function stopPlayback(){clearInterval(playTimer);playTimer=null;playButton.textContent='Play year';playButton.setAttribute('aria-pressed','false');}
  function setMonth(value){
    month=Number(value);monthSelect.value=month;root.querySelector('#wind-season').textContent=monthSeasons(month);
    const wind=series[month];root.querySelector('#wind-current').textContent=`${wind.name}: ${wind.speed<.5?'calm':`from ${wind.from} · ${Math.round(wind.speed)} kt`}`;
    root.querySelectorAll('[data-wind-month]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.windMonth)===month)));
    draw();
  }
  function inspectWind(position,name){
    probe={x:position.x,y:position.y};series=monthlyWinds(probe);
    const lon=probe.x/5-180,lat=90-probe.y/5,coordinate=`${Math.abs(lon).toFixed(1)}°${lon<0?'W':'E'}, ${Math.abs(lat).toFixed(1)}°${lat<0?'S':'N'}`;
    root.querySelector('#wind-location').textContent=`${name||'Selected waters'} · ${coordinate}`;
    root.querySelector('#wind-compare').textContent=seasonalComparison(series);
    const calendar=root.querySelector('#wind-calendar');calendar.replaceChildren();
    for(const wind of series){
      const button=document.createElement('button');button.type='button';button.dataset.windMonth=wind.month;button.setAttribute('aria-label',`${wind.name}: ${wind.speed<.5?'calm':`from ${wind.from}, ${Math.round(wind.speed)} knots`}. Show this month.`);
      const label=document.createElement('span');label.textContent=wind.name.slice(0,3);
      const arrow=document.createElement('span');arrow.className='month-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent=wind.speed<.5?'○':'→';arrow.style.transform=`rotate(${Math.atan2(wind.y,wind.x)}rad)`;
      const direction=document.createElement('span');direction.textContent=wind.speed<.5?'Calm':`From ${wind.from}`;
      const speed=document.createElement('span');speed.textContent=`${Math.round(wind.speed)} kt`;
      button.append(label,arrow,direction,speed);button.onclick=()=>{stopPlayback();setMonth(wind.month);};calendar.append(button);
    }
    setMonth(month);
  }
  monthSelect.onchange=()=>{stopPlayback();setMonth(monthSelect.value);};windToggle.onchange=draw;labelToggle.onchange=draw;
  playButton.onclick=()=>{
    if(playTimer!==null){stopPlayback();return;}
    windToggle.checked=true;playButton.textContent='Pause year';playButton.setAttribute('aria-pressed','true');draw();playTimer=setInterval(()=>setMonth((month+1)%12),1000);
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlayback();});window.addEventListener('pagehide',stopPlayback);
  inspectWind(probe,'Arabian Sea');
  for(const [label,places] of [['Harbors',data.ports],['Discoveries',data.discoveries]]){const group=document.createElement('optgroup');group.label=label;for(const place of places){const option=document.createElement('option');option.value=place.id;option.textContent=place.name;group.append(option);}select.append(group);}
  select.onchange=()=>choose(select.value,true);
  root.querySelector('#map-fit').onclick=()=>{center={x:900,y:450};zoom=1;selected=null;select.value='';detail.textContent='Current game geography. All locations revealed for this overview. Coasts: Natural Earth. Biomes: RESOLVE Ecoregions 2017.';draw();};
  root.querySelector('#map-med').onclick=()=>{center={x:970,y:260};zoom=6;selected=null;select.value='';detail.textContent='Mediterranean coastline rasterized from Natural Earth. Port coordinates from geographic gazetteers.';draw();};
  root.querySelector('#map-baltic').onclick=()=>{center=data.xy(18,57.4);zoom=14;selected=null;select.value='';detail.textContent='Danish straits and Baltic ports. Narrow waterways preserve the source coastline at higher sampling resolution.';draw();};
  root.querySelector('#map-indian').onclick=()=>{center=data.xy(65,5);zoom=3.3;selected=null;select.value='';detail.textContent='Indian Ocean. Compare January and July to inspect the monsoon reversal.';inspectWind(data.xy(65,12),'Arabian Sea');};
  root.querySelector('#map-in').onclick=()=>{zoom=Math.min(24,zoom*1.7);draw();};root.querySelector('#map-out').onclick=()=>{zoom=Math.max(1,zoom/1.7);draw();};
  const relative=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
  canvas.addEventListener('pointerdown',e=>{const p=relative(e);drag={...p,cx:center.x,cy:center.y};moved=false;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;const p=relative(e);if(Math.hypot(p.x-drag.x,p.y-drag.y)>4)moved=true;center={x:drag.cx-(p.x-drag.x)/scale(),y:drag.cy-(p.y-drag.y)/scale()};bounds();draw();});
  canvas.addEventListener('pointerup',e=>{drag=null;canvas.releasePointerCapture(e.pointerId);if(moved)return;const p=relative(e),label=labels.find(b=>p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h),hit=label||hitPoints.map(q=>({...q,d:Math.hypot(q.px-p.x,q.py-p.y)})).sort((a,b)=>a.d-b.d).find(q=>q.d<16);if(hit)choose(hit.id);else{const point=world(p);if(point.x>=0&&point.x<1800&&point.y>=0&&point.y<900){selected=null;select.value='';detail.textContent='Wind inspection. Monthly normals at the selected position.';inspectWind(point);}}});
  canvas.addEventListener('pointercancel',()=>drag=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();const p=relative(e),before=world(p);zoom=Math.max(1,Math.min(24,zoom*Math.exp(-e.deltaY*.0015)));const after=world(p);center.x+=before.x-after.x;center.y+=before.y-after.y;bounds();draw();},{passive:false});
  console.log('World map ready:',data.ports.length,'harbors,',data.discoveries.length,'discoveries');
})();
