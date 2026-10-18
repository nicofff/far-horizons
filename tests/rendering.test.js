import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeaBackground, SURF_STEP } from '../sea-background.js';
import { createChart, SEA_VIEW, seaPoint } from '../chart.js';
import { createGame, onLand } from '../engine.js';
import { ports, landmarks } from '../data.js';
import { landmarkPoint } from '../landmarks.js';

function canvasFactory(){
  const images=[];
  function create(){
    const calls={fills:0,images:[],pixels:[],alphas:[]},image={width:0,height:0,calls,setAttribute(){}};let record=false;
    const context=new Proxy({fillRect(...args){calls.fills++;if(record)calls.pixels.push([...args,this.fillStyle]);},clearRect(){calls.pixels=[];},drawImage(...args){calls.images.push(args);calls.alphas.push(typeof this.globalAlpha==='number'?this.globalAlpha:1);}},{get:(o,key)=>key in o?o[key]:()=>{}});
    image.getContext=(type,options)=>{image.alpha=options?.alpha!==false;record=image.alpha;return context;};images.push(image);return image;
  }
  return {create,images};
}

test('scenery tiles survive camera motion, cover the viewport, and have a bounded cache',()=>{
  const factory=canvasFactory(),draws=[];let samples=0;
  const background=createSeaBackground(SEA_VIEW,()=>{samples++;return false;},factory.create),c={drawImage:(...args)=>draws.push(args)};
  const position={x:100,y:100};background.draw(c,position);
  assert.ok(samples>0);const first=samples,initial=background.size;
  background.draw(c,position);assert.equal(samples,first,'stationary animations never resample geography');
  background.draw(c,{x:100.1,y:100.1});assert.equal(samples,first,'scrolling inside cached tiles never resamples geography');
  for(let i=0;i<40;i++)background.draw(c,{x:100+i*7,y:100});
  assert.equal(background.size,32);
  draws.length=0;background.draw(c,{x:100.1,y:100.1});
  for(const args of draws)assert.deepEqual(args.slice(1,5),[32,32,256,256],'crop the scenery padding at every tile seam');
  for(let y=0;y<384;y++)for(let x=0;x<512;x++)assert.ok(draws.some(a=>x>=a[5]&&x<a[5]+a[7]&&y>=a[6]&&y<a[6]+a[8]),`${x},${y} is covered`);
  assert.ok(initial<=9);background.clear();assert.equal(background.size,0);
  const before=samples;background.draw(c,position);assert.ok(samples>before,'invalidating a voyage rebuilds its scenery');
});

test('crossing the date line scrolls continuously and reuses scenery tiles',()=>{
  const factory=canvasFactory(),draws=[];let samples=0;
  const background=createSeaBackground(SEA_VIEW,()=>{samples++;return false;},factory.create),c={drawImage:(...args)=>draws.push(args)};
  background.draw(c,{x:.1,y:350});const built=samples,first=draws.filter(a=>a.length===9);
  draws.length=0;background.draw(c,{x:1799.9,y:350});
  assert.ok(samples-built<built/2,'Crossing the date line only builds the newly exposed tile column.');
  const shared=draws.filter(a=>a.length===9&&first.some(b=>b[0]===a[0]));assert.ok(shared.length);
  for(const draw of shared){const before=first.find(a=>a[0]===draw[0]);assert.equal(draw[5]-before[5],8);assert.equal(draw[6],before[6]);}
  assert.ok(background.size<=32);
});

test('surf animates cached water pixels, loops, and stays attached to the coast while scrolling',()=>{
  const factory=canvasFactory(),paint=[];let samples=0;
  const landAt=(x,y)=>{samples++;return x<=100;},background=createSeaBackground(SEA_VIEW,landAt,factory.create);
  const c={drawImage(image,...args){if(args.length===2)for(const [x,y,w,h,color] of image.calls.pixels)paint.push([x+args[0],y+args[1],w,h,color]);}};
  function draw(position,time){
    paint.length=0;background.draw(c,position,time);
    const left=Math.round(position.x*SEA_VIEW.scale-SEA_VIEW.width/2),top=Math.round(position.y*SEA_VIEW.scale-SEA_VIEW.height/2);
    return paint.filter(([x,y])=>x>=0&&y>=0&&x<512&&y<384).map(([x,y,w,h,color])=>[x+left,y+top,w,h,color]);
  }
  const position={x:100,y:100},first=draw(position,0),built=samples,frames=[];
  assert.ok(first.length,'coastal water has visible surf');
  const fills=()=>factory.images.reduce((n,image)=>n+image.calls.fills,0),before=fills();
  draw(position,SURF_STEP/2);assert.equal(fills(),before,'the same surf step reuses its overlay while the ship animates');
  for(let phase=0;phase<8;phase++){
    const points=draw(position,phase*SURF_STEP);frames.push(JSON.stringify(points));
    for(const [x,,w,h] of points){assert.ok(x/40>100&&x/40<=100.25,'foam only occupies the water band beside land');assert.equal(w,2);assert.equal(h,2);}
  }
  assert.ok(new Set(frames).size>1,'foam moves through the surf cycle');
  assert.deepEqual(draw(position,8*SURF_STEP),first,'the animation loops without a discontinuity');
  const shiftedPosition={x:100.1,y:100.1},shifted=draw(shiftedPosition,0),top=p=>Math.round(p.y*SEA_VIEW.scale-SEA_VIEW.height/2);
  const shared=points=>points.filter(p=>p[1]>=top(shiftedPosition)&&p[1]<top(position)+SEA_VIEW.height);
  assert.deepEqual(shared(shifted),shared(first),'scrolling does not reset or shift the waves in world space');
  assert.equal(samples,built,'animation and camera motion do not sample terrain after tiles are cached');
});

test('cached scenery renders above every water layer and keeps its tile-edge padding',()=>{
  const factory=canvasFactory(),draws=[];let samples=0;
  const background=createSeaBackground(SEA_VIEW,(x,y)=>{samples++;return x<=100;},factory.create);
  const c={drawImage:(...args)=>draws.push(args)},position={x:100,y:100};
  const isScenery=draw=>Array.isArray(draw)&&draw[0].alpha&&draw[0].width===320;
  let built,painted;
  for(let phase=0;phase<8;phase++){
    draws.length=0;background.draw(c,position,phase*SURF_STEP);
    assert.equal(draws.some(isScenery),false,'the water pass cannot bake in tree canopies');
    draws.push('open-water waves');background.drawScenery(c,position);
    const first=draws.findIndex(isScenery);assert.ok(first>draws.indexOf('open-water waves'));
    assert.ok(draws.slice(first).every(isScenery),'all foreground tiles render after all water tiles');
    for(const args of draws.filter(isScenery))assert.deepEqual(args.slice(1,5),[32,32,256,256]);
    const scenery=factory.images.filter(image=>image.alpha&&image.width===320),fills=scenery.reduce((n,image)=>n+image.calls.fills,0);
    assert.ok(fills>0,'the foreground contains painted scenery');
    if(phase===0){built=samples;painted=fills;}
    else{assert.equal(samples,built,'no terrain probes while animating');assert.equal(fills,painted,'trees are not regenerated while animating');}
  }
});

test('seasonal crossfades reuse monthly scenery and ocean tiles within the bounded cache',()=>{
  const factory=canvasFactory(),position={x:895,y:190};let samples=0;
  const background=createSeaBackground(SEA_VIEW,(x,y)=>{samples++;return x<=895;},factory.create),draws=[];
  const c={globalAlpha:1,drawImage:(image,...args)=>draws.push({image,args,alpha:c.globalAlpha})};
  background.draw(c,position,0,.5);background.drawScenery(c,position,.5);
  const built=samples,sceneryFills=()=>factory.images.filter(image=>image.width===320&&image.alpha).reduce((n,image)=>n+image.calls.fills,0),painted=sceneryFills();
  for(const day of [1,5,10,15,29]){background.draw(c,position,300,day);background.drawScenery(c,position,day);}
  assert.equal(samples,built,'passing days blend cached palettes without terrain probes');
  assert.equal(sceneryFills(),painted,'foliage is not regenerated during a monthly crossfade');
  assert.ok(factory.images.some(image=>image.calls.alphas.some(alpha=>alpha>0&&alpha<1)));assert.equal(c.globalAlpha,1);
  const composites=factory.images.reduce((n,image)=>n+image.calls.images.length,0);
  for(let phase=0;phase<8;phase++){background.draw(c,position,phase*300,29);background.drawScenery(c,position,29);}
  assert.equal(factory.images.reduce((n,image)=>n+image.calls.images.length,0),composites,'animation reuses the blended tiles');
  for(let month=0;month<12;month++){background.draw(c,position,0,month*31+.5);background.drawScenery(c,position,month*31+.5);}
  assert.ok(background.size<=32,'additional seasons cannot grow the cache beyond its existing limit');
  const seaFactory=canvasFactory();let seaSamples=0;
  const ocean=createSeaBackground(SEA_VIEW,()=>{seaSamples++;return false;},seaFactory.create);
  ocean.draw(c,position,0,.5);const seaBuilt=seaSamples;
  for(const day of [31,80,170,270,360])ocean.draw(c,position,0,day);
  assert.equal(seaSamples,seaBuilt,'open ocean does not allocate seasonal duplicates');
});

test('Andean mountain scenery stays cached through surf animation and camera motion',()=>{
  const factory=canvasFactory(),position=ports.find(p=>p.id==='callao');let samples=0;
  const background=createSeaBackground(SEA_VIEW,(x,y)=>{samples++;return onLand(x,y);},factory.create),c={drawImage(){}};
  background.draw(c,position,0,199.5);background.drawScenery(c,position,199.5);
  const built=samples,sceneryFills=()=>factory.images.filter(image=>image.width===320&&image.alpha).reduce((sum,image)=>sum+image.calls.fills,0),painted=sceneryFills();
  const scenery=factory.images.filter(image=>image.width===320&&image.alpha);
  assert.ok(scenery.reduce((sum,image)=>sum+image.calls.pixels.length,0)>1000,'The mountainous coast contains detailed cached scenery.');
  for(const image of scenery)for(const [x,y,w,h] of image.calls.pixels){assert.ok([x,y,w,h].every(Number.isInteger),'Mountain edges remain crisp framebuffer pixels.');}
  for(let phase=0;phase<8;phase++){
    background.draw(c,position,phase*SURF_STEP,199.5);background.drawScenery(c,position,199.5);
  }
  assert.equal(samples,built);assert.equal(sceneryFills(),painted,'Surf animation does not repaint mountain sprites.');
  background.draw(c,{x:position.x+.025,y:position.y},0,199.5);background.drawScenery(c,{x:position.x+.025,y:position.y},199.5);
  assert.equal(samples,built,'Moving one framebuffer pixel reuses the existing mountain tiles.');
  assert.equal(sceneryFills(),painted,'Moving the camera does not repaint the mountain sprites.');
  assert.ok(background.size<=32);
});

test('chart sleeps when static, wakes for input, and cancels rendering in a hidden tab',async t=>{
  const factory=canvasFactory(),canvas=factory.create(),events={},hostEvents={},raf=new Map(),timers=new Map();let id=0;
  const dialog={open:false},host={dataset:{},style:{},querySelector:selector=>selector==='dialog'?dialog:canvas,addEventListener:(name,fn)=>{hostEvents[name]=fn;},hasPointerCapture:()=>false};
  canvas.getBoundingClientRect=()=>({left:0,top:0,width:512,height:384});
  canvas.parentElement=host;
  const document={hidden:false,createElement:factory.create,addEventListener:(name,fn)=>{events[name]=fn;}};
  const globals={document,location:{search:'?renderer=canvas'},requestAnimationFrame:fn=>{raf.set(++id,fn);return id;},cancelAnimationFrame:id=>raf.delete(id),setTimeout:(fn,delay)=>{timers.set(++id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)};
  for(const [key,value] of Object.entries(globals)){
    const old=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
    t.after(()=>old?Object.defineProperty(globalThis,key,old):delete globalThis[key]);
  }
  const selected=[],courses=[],s=createGame(7),chart=createChart(canvas,()=>s,{select:id=>selected.push(id),landmark:id=>selected.push(id),course:p=>courses.push(p)});
  await Promise.resolve();
  const step=time=>{const callbacks=[...raf.values()];raf.clear();for(const fn of callbacks)fn(time);};
  step(1000);assert.equal(raf.size,0);assert.equal(timers.size,1,'paused sea only wakes for sprite animation');
  chart.toggleChart();step(1100);
  assert.equal(raf.size,0);assert.equal(timers.size,0,'recorded chart does no work while idle');
  hostEvents.wheel({preventDefault(){},deltaY:30});assert.equal(raf.size,1,'zoom wakes the chart');step(1200);
  s.paused=false;chart.refresh();step(1250);assert.equal(raf.size,1,'resuming a voyage also updates the ship on the recorded chart');s.paused=true;step(1285);
  chart.notify('Lookout report');step(1340);assert.equal(timers.size,1,'a static chart still expires its notice');
  chart.focus();s.paused=false;step(1400);assert.equal(raf.size,1,'sailing keeps rendering');
  dialog.open=true;s.paused=true;step(1500);assert.equal(raf.size,0);assert.equal(timers.size,0,'menus stop background animation');
  dialog.open=false;chart.refresh();step(1600);assert.equal(timers.size,1,'closing menus restarts the sea');
  document.hidden=true;events.visibilitychange();assert.equal(raf.size,0);assert.equal(timers.size,0);
  chart.refresh();assert.equal(raf.size,0,'hidden input cannot restart rendering');
  document.hidden=false;events.visibilitychange();assert.equal(raf.size,1,'returning to the tab repaints it');
  step(1700);const before=factory.images.length;s.position.x+=.01;chart.refresh();step(1800);assert.equal(factory.images.length,before,'ship motion reuses scenery tiles');
  await t.test('nearby towns, landmarks and their labels select their own destinations',()=>{
    for(const [portId,landmarkId] of [['alexandria','qaitbay'],['naples','vesuvius']]){
      const port=ports.find(p=>p.id===portId),site=landmarks.find(d=>d.id===landmarkId);
      s.position={x:port.x,y:port.y-1};s.found.push(site.id);
      const town=seaPoint(s.position,port.town),marker=landmarkPoint(site,seaPoint(s.position,site));
      for(const [point,id] of [[town,port.id],[{x:town.x,y:town.y+23},port.id],[marker,site.id],[{x:marker.x,y:marker.y+16},site.id],[seaPoint(s.position,port),port.id]]){
        hostEvents.pointerup({clientX:point.x,clientY:point.y,pointerId:1});
        assert.equal(selected.at(-1),id,`${port.id} / ${site.id} at ${point.x}, ${point.y}`);
      }
    }
  });
  await t.test('clicking west of the date line selects the nearby Pacific water',()=>{
    s.position={x:.1,y:350};hostEvents.pointerup({clientX:216,clientY:192,pointerId:1});
    assert.deepEqual(courses.at(-1),{x:1799.1,y:350});
  });
});
