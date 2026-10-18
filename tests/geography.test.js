import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD, ports, xy } from '../data.js';
import { rasterWidth, rasterHeight, rasterCell, terrainMask, onLand, clearPassage } from '../terrain.js';
import { findRoute } from '../navigation.js';
import { createGame, migrateSave, portById, plotCourse, steer, advance, MAP_REVISION } from '../engine.js';

test('the generated raster covers the existing world projection',()=>{
  assert.equal(rasterWidth*rasterCell,WORLD.width);assert.equal(rasterHeight*rasterCell,WORLD.height);
  assert.equal(terrainMask.length,7200*3600);assert.ok(terrainMask.includes(0));assert.ok(terrainMask.includes(1));
});

test('Mediterranean islands and sea basins retain their geographic positions',()=>{
  for(const [name,lon,lat] of [['Rome',12.5,41.9],['Sardinia',9,40],['Sicily',14,37.5],['Corsica',9,42],['Crete',25,35.2],['Cyprus',33.3,35]]){
    const p=xy(lon,lat);assert.equal(onLand(p.x,p.y),true,name);
  }
  for(const [name,lon,lat] of [['Ionian Sea',18.5,37],['Tyrrhenian Sea',11,40],['Adriatic',16,42],['Gibraltar',-5.6,35.98]]){
    const p=xy(lon,lat);assert.equal(onLand(p.x,p.y),false,name);
  }
});

test('towns occupy land near their sourced city coordinates and harbors occupy water',()=>{
  for(const p of ports){
    assert.ok(p.coordinates&&p.place,p.id);assert.equal(onLand(p.x,p.y),false,p.id);assert.equal(onLand(p.town.x,p.town.y),true,p.id);
    const real=xy(p.coordinates.lon,p.coordinates.lat);
    assert.ok(Math.hypot(p.town.x-real.x,p.town.y-real.y)<2,p.id);
    assert.ok(Math.hypot(p.x-real.x,p.y-real.y)<3,p.id);
  }
});

test('the Black Sea remains accessible through the Dardanelles and Bosporus',()=>{
  const start=xy(25,38.5),end=xy(30.5,42.5),route=findRoute(start,end);assert.ok(route.length);
  let previous=start;for(const point of route){assert.ok(clearPassage(previous,point));previous=point;}
  assert.deepEqual(route.at(-1),end);
});

test('the Strait of Messina stays navigable between Sicily and Calabria in both directions',()=>{
  const north=xy(15.575,38.375),south=xy(15.525,37.975);
  for(const [start,end] of [[north,south],[south,north]]){
    const route=findRoute(start,end);assert.ok(route.length);let previous=start,length=0;
    for(const point of route){assert.ok(clearPassage(previous,point));length+=Math.hypot(point.x-previous.x,point.y-previous.y);previous=point;}
    assert.deepEqual(route.at(-1),end);assert.ok(length<4,'Pass through Messina instead of sailing around Sicily.');
    const auto=createGame();auto.port=null;auto.position={...start};assert.ok(plotCourse(auto,end).ok);advance(auto,.5);assert.deepEqual(auto.position,end);
    const manual=createGame();manual.port=null;manual.position={...start};steer(manual,end.x-start.x,end.y-start.y);advance(manual,.18);
    assert.equal(manual.paused,false);assert.equal(onLand(manual.position.x,manual.position.y),false);
    assert.ok((manual.position.y-end.y)*Math.sign(end.y-start.y)>0,'Manual steering must cross the strait.');
  }
  for(const [lon,lat] of [[15.475,38.175],[15.725,38.175]]){const p=xy(lon,lat);assert.equal(onLand(p.x,p.y),true,'Both shores remain land.');}
});

test('the Sound and both Belt passages connect the Kattegat to the Baltic in both directions',()=>{
  for(const [name,a,b,maxLength] of [
    ['Sound',[12.525,56.225],[12.775,55.375],5],
    ['Great Belt',[10.875,56.075],[10.875,54.675],8],
    ['Little Belt',[9.775,55.625],[9.875,55.275],2.5],
  ]){
    const north=xy(...a),south=xy(...b);
    for(const [start,end] of [[north,south],[south,north]]){
      const route=findRoute(start,end);assert.ok(route.length,name);let previous=start,length=0;
      for(const point of route){assert.ok(clearPassage(previous,point),name);length+=Math.hypot(point.x-previous.x,point.y-previous.y);previous=point;}
      assert.deepEqual(route.at(-1),end);assert.ok(length<maxLength,`${name} must stay open without a detour.`);
      const s=createGame();s.port=null;s.position={...start};assert.ok(plotCourse(s,end).ok);advance(s,1);assert.deepEqual(s.position,end);
    }
  }
  const north=xy(12.525,56.125),south=xy(12.675,55.925);
  for(const [start,end] of [[north,south],[south,north]]){
    const s=createGame();s.port=null;s.position={...start};steer(s,end.x-start.x,end.y-start.y);advance(s,.12);
    assert.equal(s.paused,false);assert.equal(onLand(s.position.x,s.position.y),false);
    assert.ok((s.position.y-end.y)*Math.sign(end.y-start.y)>0,'Manual steering must cross the narrowest part of the Sound.');
  }
  for(const [lon,lat] of [[12.475,56.025],[12.825,56.025],[10,55.4],[11.7,55.5]]){const p=xy(lon,lat);assert.ok(onLand(p.x,p.y),'The strait shores and Danish islands remain land.');}
});

test('the Baltic requires rounding Jutland instead of using the modern Kiel Canal',()=>{
  for(const [lon,lat] of [[9.7,54.2],[9.925,54.325],[10,54.325]]){const p=xy(lon,lat);assert.ok(onLand(p.x,p.y));}
  const route=findRoute(portById('hamburg'),portById('lubeck'));
  assert.ok(route.length);assert.ok(Math.min(...route.map(p=>p.y))<xy(10,57).y);
});

test('Singapore Strait and the Durian approach stay open in both directions with room to steer',()=>{
  for(const [name,a,b,maxLength] of [
    ['Singapore Strait',[103.375,1.225],[104.575,1.225],6.5],
    ['Durian approach',[103.65,.65],[103.65,1.2],3.2],
    ['Malacca to South China Sea',[102.475,2.025],[104.725,1.425],14],
  ]){
    for(const [start,end] of [[xy(...a),xy(...b)],[xy(...b),xy(...a)]]){
      const route=findRoute(start,end);assert.ok(route.length,name);let previous=start,length=0;
      for(const point of route){assert.ok(clearPassage(previous,point),name);length+=Math.hypot(point.x-previous.x,point.y-previous.y);previous=point;}
      assert.deepEqual(previous,end);assert.ok(length<maxLength,`${name} should not detour around the archipelago.`);
      const s=createGame();s.port=null;s.position={...start};assert.ok(plotCourse(s,end).ok);advance(s,5);assert.deepEqual(s.position,end);
    }
  }
  for(const lon of [103.625,103.675,103.725])assert.ok(clearPassage(xy(lon,.725),xy(lon,1.175)),'Parallel water lanes allow steering room west of Batam.');
  for(const [a,b,days] of [
    [[103.725,1.225],[104.075,1.225],.18],
    [[103.65,.775],[103.65,1.025],.15],
  ])for(const [start,end] of [[xy(...a),xy(...b)],[xy(...b),xy(...a)]]){
    const s=createGame();s.port=null;s.position={...start};steer(s,end.x-start.x,end.y-start.y);advance(s,days);
    assert.equal(s.paused,false);assert.equal(onLand(s.position.x,s.position.y),false);
    assert.ok((s.position.x-end.x)*(end.x-start.x)+(s.position.y-end.y)*(end.y-start.y)>0,'Manual sailing must cross the narrow section.');
  }
});

test('the Malacca changes preserve the peninsula and main island interiors',()=>{
  for(const [name,lon,lat] of [
    ['Singapore',103.825,1.375],['Johor',103.675,1.525],['Sumatra',102.575,.625],
    ['Batam',104.025,1.075],['Bintan',104.525,1.075],['Karimun',103.375,1.025],
  ]){const p=xy(lon,lat);assert.equal(onLand(p.x,p.y),true,name);}
});

test('existing Malacca voyages recalculate their course while keeping cargo and fleet',()=>{
  const s=createGame();s.mapRevision=MAP_REVISION-1;s.port=null;s.position=xy(103.65,.65);
  const target=xy(104.7,1.3);s.route=[target];s.cargo.fish=9;
  const restored=migrateSave(structuredClone(s));assert.ok(restored);assert.equal(restored.mapRevision,MAP_REVISION);
  assert.equal(restored.paused,true);assert.deepEqual(restored.position,s.position);assert.deepEqual(restored.route.at(-1),target);
  for(const key of ['ships','cargo','gold','food','water','found','expedition'])assert.deepEqual(restored[key],s[key],key);
  let previous=restored.position;for(const point of restored.route){assert.ok(clearPassage(previous,point));previous=point;}
});

test('modern Suez and Panama canals do not create shortcuts in a 1522 voyage',()=>{
  for(const [lon,lat] of [[32.3,30],[32.5,30.2],[-79.65,9.1]]){const p=xy(lon,lat);assert.equal(onLand(p.x,p.y),true);}
  assert.ok(Math.max(...findRoute(portById('alexandria'),portById('goa')).map(p=>p.y))>=xy(20,-34.8).y);
});

test('Sunda Strait connects the Java Sea and Indian Ocean with a short passage in both directions',()=>{
  for(const [a,b,limit]of[
    [[106.075,-5.575],[105,-6.5],8],
    [[105.75,-5.75],[105.8,-6.1],2],
    [[105.65,-5.85],[105.7,-6.05],1.5],
  ])for(const [start,end]of[[xy(...a),xy(...b)],[xy(...b),xy(...a)]]){
    const route=findRoute(start,end);assert.ok(route.length);let previous=start,length=0;
    for(const p of route){assert.ok(clearPassage(previous,p));length+=Math.hypot(p.x-previous.x,p.y-previous.y);previous=p;}
    assert.deepEqual(previous,end);assert.ok(length<limit,'Sail through Sunda instead of detouring around Java.');
    const s=createGame();s.port=null;s.position={...start};assert.ok(plotCourse(s,end).ok);advance(s,3);assert.deepEqual(s.position,end);
  }
  const a=xy(105.7625,-5.8375),b=xy(105.7875,-6.0125);
  for(const [start,end]of[[a,b],[b,a]]){
    const s=createGame();s.port=null;s.position={...start};steer(s,end.x-start.x,end.y-start.y);advance(s,.08);
    assert.equal(s.paused,false);assert.equal(onLand(s.position.x,s.position.y),false);
    assert.ok((s.position.x-end.x)*(end.x-start.x)+(s.position.y-end.y)*(end.y-start.y)>0);
  }
});

test('Sumatra and Java are separate landmasses even when diagonal contacts are counted',()=>{
  const left=5480,top=1680,width=440,height=320,seen=new Uint8Array(width*height);
  const index=p=>(Math.floor(p.y/rasterCell)-top)*width+Math.floor(p.x/rasterCell)-left;
  const sumatra=xy(101,-1),java=xy(110,-7.5);assert.ok(onLand(sumatra.x,sumatra.y));assert.ok(onLand(java.x,java.y));
  const pending=[index(sumatra)];seen[pending[0]]=1;
  while(pending.length){
    const i=pending.pop(),x=i%width,y=Math.floor(i/width);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const nx=x+dx,ny=y+dy,next=ny*width+nx;
      if((dx||dy)&&nx>=0&&nx<width&&ny>=0&&ny<height&&!seen[next]&&terrainMask[(ny+top)*rasterWidth+nx+left]){seen[next]=1;pending.push(next);}
    }
  }
  assert.equal(seen[index(java)],0,'No raster land bridge may join Java to Sumatra.');
});

test('existing Sunda courses use the opened passage without changing voyage resources',()=>{
  const s=createGame();s.mapRevision=MAP_REVISION-1;s.port=null;s.position=xy(106.075,-5.575);s.cargo.fish=4;
  const target=xy(105,-6.5);s.route=[xy(106.5,-9),target];
  const restored=migrateSave(structuredClone(s));assert.ok(restored);assert.equal(restored.mapRevision,MAP_REVISION);
  for(const key of ['ships','gold','cargo','food','water','found','expedition'])assert.deepEqual(restored[key],s[key],key);
  assert.deepEqual(restored.route.at(-1),target);assert.equal(restored.paused,true);
  let previous=restored.position,length=0;for(const p of restored.route){assert.ok(clearPassage(previous,p));length+=Math.hypot(p.x-previous.x,p.y-previous.y);previous=p;}
  assert.ok(length<8);
});

test('passage checks handle exact raster boundaries in either direction',()=>{
  const a={x:816.875,y:286.5},b={x:816.75,y:286.75};
  assert.equal(clearPassage(a,b),true);assert.equal(clearPassage(b,a),true);
});

test('old voyages stranded by the new coast move to water and keep their cargo and destination',()=>{
  const saved=createGame();delete saved.mapRevision;saved.port=null;saved.position=xy(9,40);saved.destination='venice';saved.route=[{x:961,y:225}];saved.cargo.cloth=10;
  assert.equal(onLand(saved.position.x,saved.position.y),true);
  const restored=migrateSave(structuredClone(saved));assert.ok(restored);assert.equal(restored.mapRevision,MAP_REVISION);assert.equal(restored.paused,true);
  assert.equal(onLand(restored.position.x,restored.position.y),false);assert.deepEqual(restored.cargo,saved.cargo);assert.deepEqual(restored.ships,saved.ships);
  for(const key of ['gold','food','water','day'])assert.equal(restored[key],saved[key]);
  assert.equal(restored.destination,'venice');const venice=portById('venice');assert.deepEqual(restored.route.at(-1),{x:venice.x,y:venice.y});
  let previous=restored.position;for(const point of restored.route){assert.ok(clearPassage(previous,point));previous=point;}
});
