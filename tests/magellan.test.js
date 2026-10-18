import test from 'node:test';
import assert from 'node:assert/strict';
import { xy } from '../data.js';
import { onLand, clearPassage, terrainMask, rasterWidth, rasterCell } from '../terrain.js';
import { findRoute } from '../navigation.js';
import { createGame, plotCourse, advance, steer, fleetSpeed, migrateSave, MAP_REVISION, distance } from '../engine.js';

const atlantic=xy(-68.2,-52.35),pacific=xy(-75.5,-52.7);
function checkRoute(start,route,end){
  assert.ok(route.length);let previous=start,length=0;
  for(const point of route){
    assert.ok(clearPassage(previous,point));
    assert.ok(point.y<xy(0,-54.1).y,'Stay in Magellan instead of detouring around Cape Horn.');
    length+=distance(previous,point);previous=point;
  }
  assert.deepEqual(previous,end);assert.ok(length>35&&length<48);return length;
}

test('Magellan supports complete Atlantic–Pacific voyages in both directions',()=>{
  for(const [start,end] of [[atlantic,pacific],[pacific,atlantic]]){
    checkRoute(start,findRoute(start,end),end);
    const s=createGame(7);s.port=null;s.position={...start};
    assert.ok(plotCourse(s,end).ok);advance(s,10);
    assert.deepEqual(s.position,end);assert.equal(s.paused,true);assert.equal(s.lost,false);
  }
});

for(const [name,a,b] of [
  ['Primera Angostura',[-69.45,-52.45],[-69.65,-52.6]],
  ['Segunda Angostura',[-70.18,-52.76],[-70.4,-52.85]],
  ['Paso Tortuoso',[-72.4,-53.56],[-72.6,-53.5]],
])test(`${name} allows manual steering through the narrows in both directions`,()=>{
  for(const [start,end] of [[xy(...a),xy(...b)],[xy(...b),xy(...a)]]){
    assert.ok(clearPassage(start,end));
    const s=createGame(7);s.port=null;s.position={...start};
    const dx=end.x-start.x,dy=end.y-start.y;
    assert.ok(steer(s,dx,dy));advance(s,distance(start,end)/fleetSpeed(s)*1.1);
    assert.equal(s.paused,false);assert.equal(onLand(s.position.x,s.position.y),false);
    assert.ok((s.position.x-end.x)*dx+(s.position.y-end.y)*dy>0);
  }
});

test('Magellan separates Tierra del Fuego from Patagonia while preserving Brunswick and nearby island land',()=>{
  const left=2080,top=2820,width=180,height=100,labels=new Uint16Array(width*height);let component=0;
  for(let i=0;i<labels.length;i++){
    if(labels[i]||!terrainMask[(top+Math.floor(i/width))*rasterWidth+left+i%width])continue;
    labels[i]=++component;const pending=[i];
    while(pending.length){
      const current=pending.pop(),x=current%width,y=Math.floor(current/width);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=x+dx,ny=y+dy,next=ny*width+nx;
        if((dx||dy)&&nx>=0&&nx<width&&ny>=0&&ny<height&&!labels[next]&&terrainMask[(top+ny)*rasterWidth+left+nx]){labels[next]=component;pending.push(next);}
      }
    }
  }
  const components={};
  for(const [name,lon,lat] of [['mainland',-70,-52],['Brunswick',-71.5,-53.25],['Tierra del Fuego',-69,-53.8],['Riesco',-72.8,-52.8],['Dawson',-70.6,-53.8]]){
    const p=xy(lon,lat);assert.equal(onLand(p.x,p.y),true,`${name} remains land`);
    components[name]=labels[(Math.floor(p.y/rasterCell)-top)*width+Math.floor(p.x/rasterCell)-left];assert.ok(components[name]);
  }
  assert.equal(components.Brunswick,components.mainland,'Brunswick stays connected to Patagonia.');
  assert.notEqual(components['Tierra del Fuego'],components.mainland,'No land bridge blocks the strait, including diagonal contacts.');
});

test('saved Cape Horn detours recalculate through Magellan without losing voyage resources',()=>{
  const saved=createGame(7);saved.port=null;saved.position={...atlantic};saved.mapRevision=MAP_REVISION-1;saved.cargo['cotton-cloth']=5;
  saved.route=[xy(-67,-55),xy(-69,-56),xy(-75,-55),pacific];
  const restored=migrateSave(structuredClone(saved));assert.ok(restored);assert.equal(restored.mapRevision,MAP_REVISION);assert.equal(restored.paused,true);
  checkRoute(restored.position,restored.route,pacific);
  for(const key of ['ships','cargo','gold','food','water','found','expedition','songbook'])assert.deepEqual(restored[key],saved[key],key);
});
