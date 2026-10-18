import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeaBackground } from '../sea-background.js';
import { createChart, SEA_VIEW } from '../chart.js';
import { createGame } from '../engine.js';

function canvasFactory(){
  const images=[];
  function create(){
    const calls={fills:0,images:[]},image={width:0,height:0,calls,setAttribute(){}};
    const context=new Proxy({fillRect(){calls.fills++;},drawImage(...args){calls.images.push(args);}},{get:(o,key)=>key in o?o[key]:()=>{}});
    image.getContext=()=>context;images.push(image);return image;
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

test('chart sleeps when static, wakes for input, and cancels rendering in a hidden tab',async t=>{
  const factory=canvasFactory(),canvas=factory.create(),events={},hostEvents={},raf=new Map(),timers=new Map();let id=0;
  const dialog={open:false},host={dataset:{},style:{},querySelector:selector=>selector==='dialog'?dialog:canvas,addEventListener:(name,fn)=>{hostEvents[name]=fn;}};
  canvas.parentElement=host;
  const document={hidden:false,createElement:factory.create,addEventListener:(name,fn)=>{events[name]=fn;}};
  const globals={document,location:{search:'?renderer=canvas'},requestAnimationFrame:fn=>{raf.set(++id,fn);return id;},cancelAnimationFrame:id=>raf.delete(id),setTimeout:(fn,delay)=>{timers.set(++id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)};
  for(const [key,value] of Object.entries(globals)){
    const old=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
    t.after(()=>old?Object.defineProperty(globalThis,key,old):delete globalThis[key]);
  }
  const s=createGame(7),chart=createChart(canvas,()=>s,{});
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
});
