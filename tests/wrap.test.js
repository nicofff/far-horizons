import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD, wrapX, longitudeDelta, worldDistance, longitudeBounds } from '../world.js';
import { xy } from '../data.js';
import { onLand, clearPassage } from '../terrain.js';
import { biomeAt } from '../biomes.js';
import { elevationAt, mountainAt } from '../relief.js';
import { seaPoint } from '../chart.js';
import { createGame, steer, advance, plotCourse, findRoute, routeLength, portById, reveal, recorded, inSight, migrateSave, validateSave } from '../engine.js';

function at(position){const s=createGame(7);s.port=null;s.position={...position};s.day=.5;s.lastEvent=.5;s.escapedUntil=1000;return s;}
function verifyRoute(start,route,end){
  assert.ok(route.length);let previous=start,length=0;
  for(const point of route){assert.ok(point.x>=0&&point.x<WORLD.width);assert.ok(clearPassage(previous,point));length+=worldDistance(previous,point);previous=point;}
  assert.deepEqual(previous,end);return length;
}

test('longitude wraps while latitude and local distances stay intact',()=>{
  for(const [x,expected] of [[0,0],[1800,0],[-1,1799],[3601,1],[-3601,1799]])assert.equal(wrapX(x),expected);
  assert.equal(longitudeDelta(1,1799),-2);assert.equal(longitudeDelta(1799,1),2);
  assert.equal(worldDistance({x:1,y:10},{x:1798,y:14}),5);
  assert.equal(worldDistance({x:1,y:0},{x:1,y:900}),900);
  assert.deepEqual(longitudeBounds([{x:2},{x:1798}]),{center:0,width:4});
  assert.deepEqual(seaPoint({x:.1,y:350},{x:1799.9,y:350}),{x:256+longitudeDelta(.1,1799.9)*40,y:192});
});

test('terrain and scenery readers repeat at the date line without erasing real land',()=>{
  for(const read of [onLand,biomeAt,elevationAt,mountainAt])for(const p of [xy(179,-17),xy(-179,-17),xy(179,66),{x:.125,y:350}]){
    assert.equal(read(p.x,p.y),read(p.x+1800,p.y));assert.equal(read(p.x,p.y),read(p.x-1800,p.y));
  }
  const a={x:.125,y:350},b={x:1799.875,y:350};assert.ok(clearPassage(a,b));assert.ok(clearPassage(b,a));
  assert.equal(onLand(0,-1),true);assert.equal(onLand(1800,901),true);
  const bering=xy(179,66);assert.equal(onLand(bering.x,bering.y),true,'Real land beside the seam remains solid.');
});

test('navigation crosses the seam around Fiji in both directions when the direct line is blocked',()=>{
  const a=xy(179,-17),b=xy(-179,-17);assert.equal(clearPassage(a,b),false);
  for(const [start,end] of [[a,b],[b,a]])assert.ok(verifyRoute(start,findRoute(start,end),end)<15);
});

test('manual and diagonal sailing cross both date-line edges without stopping',()=>{
  for(const dx of [-1,1])for(const dy of [0,.5]){
    const start={x:dx<0?.2:1799.8,y:350},s=at(start),food=s.food;
    steer(s,dx,dy);advance(s,.1);
    assert.equal(s.paused,false);assert.ok(s.heading);assert.ok(s.position.x>=0&&s.position.x<1800);
    assert.ok(dx<0?s.position.x>1790:s.position.x<10);assert.ok(worldDistance(start,s.position)<5);
    assert.ok(s.food<food);assert.equal(s.events.some(e=>e.title==='Land ahead!'),false);assert.ok(validateSave(s));
  }
});

test('automatic sailing crosses either edge and takes a Pacific passage from Mexico to Macau',()=>{
  for(const [start,end] of [[{x:.2,y:350},{x:1798,y:350}],[{x:1799.8,y:350},{x:2,y:350}]]){
    const s=at(start);assert.ok(plotCourse(s,end).ok);assert.ok(routeLength(s)<3);advance(s,1);
    assert.deepEqual(s.position,end);assert.equal(s.paused,true);assert.ok(validateSave(s));
  }
  const mexico=xy(-105,15),macau=portById('macau');
  for(const [start,target] of [[mexico,macau],[macau,mexico]]){
    const s=at(start);assert.ok(plotCourse(s,target).ok);assert.ok(routeLength(s)<900);
    verifyRoute(start,s.route,{x:target.x,y:target.y});
    const points=[start,...s.route];assert.ok(points.some((p,i)=>i&&Math.abs(p.x-points[i-1].x)>900),'The passage crosses the Pacific date line.');
  }
});

test('lookout range and recorded chart cells continue across the seam',()=>{
  const s=at({x:.125,y:350});s.seen=[];reveal(s);
  assert.ok(recorded(s,{x:.125,y:350}));assert.ok(recorded(s,{x:1799.875,y:350}));
  assert.ok(inSight(s,{x:1799.875,y:350}));assert.equal(inSight(s,{x:900,y:350}),false);
  assert.ok(s.seen.some(id=>id%900===0));assert.ok(s.seen.some(id=>id%900===899));
  assert.equal(new Set(s.seen).size,s.seen.length);assert.ok(s.seen.every(id=>id>=0&&id<900*450));
  const suva=portById('suva');s.position={x:.025,y:suva.y};reveal(s);assert.ok(s.known.includes('suva'));
});

test('existing voyages replan across the Pacific and retain their progress',()=>{
  const s=at(xy(-105,15)),target=portById('macau');s.mapRevision=9;s.destination=target.id;s.route=[{x:target.x,y:target.y}];s.cargo['cotton-cloth']=4;
  const restored=migrateSave(structuredClone(s));assert.ok(restored);assert.equal(restored.mapRevision,10);assert.equal(restored.paused,true);
  assert.ok(routeLength(restored)<900);verifyRoute(restored.position,restored.route,{x:target.x,y:target.y});
  for(const key of ['ships','gold','cargo','food','water','found','weatherSeed','expedition'])assert.deepEqual(restored[key],s[key],key);
});
