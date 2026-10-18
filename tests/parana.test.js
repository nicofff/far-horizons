import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { landmarks, xy } from '../data.js';
import { onLand, clearPassage } from '../terrain.js';
import { createGame, portById, findRoute, plotCourse, advance, steer, fleetSpeed, distance, reveal, migrateSave, MAP_REVISION } from '../engine.js';

const source=JSON.parse(readFileSync(new URL('../geography/parana-iguazu.geojson',import.meta.url),'utf8'));
const river=source.features[0],points=river.geometry.coordinates.map(([lon,lat])=>xy(lon,lat));
const falls=landmarks.find(d=>d.id==='iguazu');

function passage(start,end){
  const route=findRoute(start,end);assert.ok(route.length);let previous=start,length=0;
  for(const point of route){assert.ok(clearPassage(previous,point));length+=distance(previous,point);previous=point;}
  assert.deepEqual(previous,end);return length;
}

test('the sourced lower Iguazu and Parana centerline stays connected through every bend',()=>{
  assert.equal(new Set(river.properties.reachIds).size,river.properties.reachIds.length);
  assert.equal(river.properties.firstReach,61387865);
  for(let i=0;i<points.length;i++){
    assert.equal(onLand(points[i].x,points[i].y),false,`source vertex ${i}`);
    if(i)assert.ok(clearPassage(points[i-1],points[i]),`source segment ${i}`);
  }
  const manifest=JSON.parse(readFileSync(new URL('../geography/manifest.json',import.meta.url),'utf8'));
  assert.equal(manifest.riverRoutes.sha256,createHash('sha256').update(readFileSync(new URL('../geography/parana-iguazu.geojson',import.meta.url))).digest('hex'));
  assert.equal(manifest.riverRoutes.source.sha256,source.source.sha256);
  const upstream=xy(-54.3,-25.65);
  assert.equal(onLand(upstream.x,upstream.y),true,'the navigable channel does not continue above the cataracts');
});

test('Montevideo reaches Iguazu by the Parana and returns to the Atlantic estuary',()=>{
  const port=portById('montevideo'),length=passage(port,falls.approach),back=passage(falls.approach,{x:port.x,y:port.y});
  assert.ok(length>70&&length<110);assert.ok(back>70&&back<110);
  const s=createGame(7);s.port=port.id;s.position={x:port.x,y:port.y};
  assert.ok(plotCourse(s,falls.approach).ok);advance(s,20);
  assert.deepEqual(s.position,falls.approach);assert.ok(s.found.includes(falls.id));assert.equal(s.lost,false);
  assert.ok(plotCourse(s,port.id).ok);advance(s,20);assert.equal(s.port,port.id);assert.equal(s.lost,false);
});

test('manual steering works both ways through the lower Iguazu and its Parana confluence',()=>{
  for(const index of [1,12,27,29,35,80])for(const [start,end] of [[points[index-1],points[index]],[points[index],points[index-1]]]){
    const s=createGame(7);s.port=null;s.position={...start};
    assert.ok(steer(s,end.x-start.x,end.y-start.y));advance(s,distance(start,end)/fleetSpeed(s)*.8);
    assert.equal(s.paused,false,`source segment ${index}`);assert.ok(distance(s.position,end)<distance(start,end));
    assert.equal(onLand(s.position.x,s.position.y),false);
  }
});

test('older voyages retain progress while gaining the river and a separately reportable falls discovery',()=>{
  const s=createGame(7),port=portById('montevideo');s.port=port.id;s.position={x:port.x,y:port.y};s.mapRevision=MAP_REVISION-1;s.cargo.cloth=7;s.found=['falls'];
  assert.ok(plotCourse(s,'rio-de-janeiro').ok);const restored=migrateSave(structuredClone(s));
  assert.equal(restored.mapRevision,MAP_REVISION);assert.equal(restored.destination,'rio-de-janeiro');assert.deepEqual(restored.cargo,s.cargo);assert.deepEqual(restored.ships,s.ships);assert.equal(restored.gold,s.gold);
  assert.deepEqual(restored.found,['falls']);restored.port=null;restored.position={...falls.approach};
  const fame=restored.fame;reveal(restored);assert.ok(restored.found.includes('iguazu'));assert.equal(restored.fame,fame+10);
  reveal(restored);assert.equal(restored.fame,fame+10);
});
