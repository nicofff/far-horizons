import test from 'node:test';
import assert from 'node:assert/strict';
import { xy } from '../data.js';
import { onLand, clearPassage, terrainMask, rasterWidth, rasterCell } from '../terrain.js';
import { findRoute } from '../navigation.js';
import { createGame, plotCourse, advance, steer, fleetSpeed, migrateSave, MAP_REVISION } from '../engine.js';

const crossings=[
  ['northern Gulf of Riga route',[23.1,59.1],[23.65,58.3],6],
  ['Hari Strait',[23.1,59.05],[23.25,58.85],2],
  ['Suur Strait',[23.3,58.8],[23.55,58.4],3],
  ['Soela Strait',[22.3,58.7],[22.65,58.7],2.5],
  ['Voosi Strait',[23.5,59.1],[23.4,58.85],2],
];

for(const [name,a,b,limit] of crossings)test(`${name} supports short automatic and manual crossings in both directions`,()=>{
  for(const [start,end] of [[xy(...a),xy(...b)],[xy(...b),xy(...a)]]){
    const route=findRoute(start,end);assert.ok(route.length,name);let previous=start,length=0;
    for(const p of route){assert.ok(clearPassage(previous,p),name);length+=Math.hypot(p.x-previous.x,p.y-previous.y);previous=p;}
    assert.deepEqual(previous,end);assert.ok(length<limit,'Use the northern channels instead of detouring around Saaremaa.');
    const auto=createGame(7);auto.port=null;auto.position={...start};assert.ok(plotCourse(auto,end).ok);
    advance(auto,2);assert.deepEqual(auto.position,end);assert.equal(auto.paused,true);
    const manual=createGame(7);manual.port=null;manual.position={...start};
    const dx=end.x-start.x,dy=end.y-start.y;assert.ok(steer(manual,dx,dy));
    advance(manual,Math.hypot(dx,dy)/fleetSpeed(manual)*1.1);
    assert.equal(manual.paused,false,'The helmsman must cross the narrows without hitting land.');
    assert.equal(onLand(manual.position.x,manual.position.y),false);
    assert.ok((manual.position.x-end.x)*dx+(manual.position.y-end.y)*dy>0,'Manual steering crosses the far approach.');
  }
});

test('opening the northern channels preserves the islands and separates them from the mainland',()=>{
  const left=4030,top=612,width=54,height=40,labels=new Uint16Array(width*height);let component=0;
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
  const islands={};
  for(const [name,lon,lat] of [['Saaremaa',22.4,58.35],['Hiiumaa',22.6,58.9],['Muhu',23.22,58.6],['Vormsi',23.225,59.025],['mainland',23.75,58.7]]){
    const p=xy(lon,lat);assert.equal(onLand(p.x,p.y),true,`${name} remains visible land`);
    islands[name]=labels[(Math.floor(p.y/rasterCell)-top)*width+Math.floor(p.x/rasterCell)-left];
    assert.ok(islands[name]);
  }
  for(const name of ['Saaremaa','Hiiumaa','Muhu','Vormsi'])assert.notEqual(islands[name],islands.mainland,`${name} has no land bridge to the mainland, including diagonal contacts`);
  for(const name of ['Saaremaa','Muhu','Vormsi'])assert.notEqual(islands.Hiiumaa,islands[name],`Hiiumaa remains separate from ${name}`);
});

test('existing northern Gulf of Riga courses recalculate without losing voyage resources',()=>{
  const saved=createGame(7);saved.mapRevision=MAP_REVISION-1;saved.port=null;saved.position=xy(23.1,59.1);saved.cargo['cotton-cloth']=5;
  const target=xy(23.65,58.3);saved.route=[xy(22.4,59.15),xy(21.8,59),xy(21.7,58.3),xy(21.95,57.85),target];
  const restored=migrateSave(structuredClone(saved));assert.ok(restored);assert.equal(restored.mapRevision,MAP_REVISION);assert.equal(restored.paused,true);
  for(const key of ['ships','cargo','gold','food','water','found','expedition','songbook'])assert.deepEqual(restored[key],saved[key],key);
  assert.deepEqual(restored.route.at(-1),target);let previous=restored.position,length=0;
  for(const p of restored.route){assert.ok(clearPassage(previous,p));length+=Math.hypot(p.x-previous.x,p.y-previous.y);previous=p;}
  assert.ok(length<6,'Old courses use the northern passage after reloading.');
});
