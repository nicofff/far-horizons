import test from 'node:test';
import assert from 'node:assert/strict';
import { landmarks, discoveries, xy } from '../data.js';
import { onLand, clearPassage } from '../terrain.js';
import { findRoute } from '../navigation.js';
import { createGame, portById, plotCourse, advance, reveal, inSight, distance, migrateSave, validateSave, MAP_REVISION } from '../engine.js';
import { signContract, reportDiscoveries, discoveryReport } from '../specialists.js';
import { discoveryClues } from '../people.js';

function dock(s,id){const p=portById(id);s.port=id;s.position={x:p.x,y:p.y};}
function passage(start,end){
  const route=findRoute(start,end);assert.ok(route.length);let previous=start,length=0;
  for(const point of route){assert.ok(clearPassage(previous,point));length+=distance(previous,point);previous=point;}
  assert.deepEqual(previous,end);return length;
}

test('historic landmarks keep geographic coordinates, collector clues and reachable water approaches',()=>{
  assert.equal(landmarks.length,10);assert.equal(new Set(discoveries.map(d=>d.id)).size,discoveries.length);
  for(const d of landmarks){
    assert.deepEqual({x:d.x,y:d.y},xy(d.lon,d.lat),d.id);
    assert.ok(d.source.startsWith('https://')&&d.history.length>20,d.id);
    assert.equal(discoveryClues[d.id],d.clue);assert.ok(d.reward>0);
    assert.equal(onLand(d.approach.x,d.approach.y),false,d.id);
    assert.ok(distance(d,d.approach)<d.discoveryRadius,d.id);assert.ok(d.discoveryRadius<4,d.id);
    passage(portById('lisbon'),d.approach);
  }
  assert.deepEqual(discoveries.slice(0,6).map(d=>d.id),['volcano','reef','falls','penguins','baobab','atoll']);
});

test('the Nile gives Giza a short navigable passage from the Mediterranean and back',()=>{
  const d=landmarks.find(d=>d.id==='giza'),alex=portById('alexandria');
  assert.equal(onLand(d.x,d.y),true);
  assert.ok(passage(alex,d.approach)<15);assert.ok(passage(d.approach,{x:alex.x,y:alex.y})<15);
  const s=createGame();dock(s,'alexandria');reveal(s);assert.ok(!s.found.includes('giza'));
  const gold=s.gold,fame=s.fame;assert.ok(plotCourse(s,d.approach).ok);advance(s,10);
  assert.deepEqual(s.position,d.approach);assert.ok(s.found.includes('giza'));assert.equal(s.gold,gold);assert.equal(s.fame,fame+10);
  assert.equal(s.paused,true);assert.ok(validateSave(s));
  assert.ok(plotCourse(s,'alexandria').ok);advance(s,10);assert.equal(s.port,'alexandria');
});

test('landmark field notes require a close approach and pay only once across collectors and saves',()=>{
  for(const d of landmarks){
    const s=createGame();assert.ok(!inSight(s,d));reveal(s);assert.ok(!s.found.includes(d.id));
    s.port=null;s.position={x:d.x+d.discoveryRadius+.05,y:d.y};reveal(s);assert.ok(!s.found.includes(d.id));
    s.position={...d.approach};const gold=s.gold;reveal(s);assert.ok(s.found.includes(d.id));assert.equal(s.gold,gold);
    const fame=s.fame;reveal(s);assert.equal(s.fame,fame);
    dock(s,'lisbon');assert.ok(signContract(s,'marco').ok);
    const quote=discoveryReport(s);assert.ok(quote.items.some(item=>item.id===d.id));assert.ok(reportDiscoveries(s,'marco').ok);
    assert.equal(s.gold,gold+quote.gold);
    const restored=migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(restored);assert.ok(restored.found.includes(d.id));assert.ok(restored.expedition.reported.includes(d.id));
    dock(restored,'bordeaux');assert.ok(signContract(restored,'mordes').ok);const paid=restored.gold;
    assert.equal(reportDiscoveries(restored,'mordes').ok,false);assert.equal(restored.gold,paid);
  }
});

test('existing voyages keep field notes, cargo and active routes when Nile geography is added',()=>{
  const s=createGame();s.mapRevision=MAP_REVISION-1;s.found=['volcano'];s.cargo.cloth=12;
  assert.ok(plotCourse(s,'venice').ok);const restored=migrateSave(JSON.parse(JSON.stringify(s)));
  assert.ok(restored);assert.equal(restored.mapRevision,MAP_REVISION);assert.deepEqual(restored.found,s.found);
  assert.deepEqual(restored.cargo,s.cargo);assert.deepEqual(restored.ships,s.ships);assert.equal(restored.gold,s.gold);assert.equal(restored.destination,'venice');
  let previous=restored.position;for(const point of restored.route){assert.ok(clearPassage(previous,point));previous=point;}
});
