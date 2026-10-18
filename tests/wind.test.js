import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { xy } from '../data.js';
import { clearPassage } from '../terrain.js';
import { prevailingWindAt, windAt, sailingFactor, windReport } from '../wind.js';
import { createGame, currentWind, fleetSpeed, plotCourse, estimatedPassage, findRoute, advance, steer, random, portById, migrateSave, validateSave, distance } from '../engine.js';

function voyage(start,end,day=.5){
  const s=createGame(7);s.port=null;s.position={...start};s.day=day;s.lastEvent=day;s.escapedUntil=1000;
  assert.ok(plotCourse(s,end).ok);const estimate=estimatedPassage(s);advance(s,35);
  assert.deepEqual(s.position,end);assert.equal(s.paused,true);assert.equal(s.lost,false);
  return {s,days:s.day-day,estimate};
}

test('NOAA monthly normals reproduce trades, westerlies and reversing Indian Ocean monsoons',()=>{
  for(const latitude of [15,-15])assert.ok(prevailingWindAt(xy(-35,latitude),0).x<0,'Tropical Atlantic winds blow west.');
  for(const latitude of [45,-45])assert.ok(prevailingWindAt(xy(-35,latitude),0).x>0,'Midlatitude westerlies blow east.');
  const summer=prevailingWindAt(xy(65,12),100),winter=prevailingWindAt(xy(65,12),280);
  assert.ok(summer.x>10&&summer.y<0);assert.ok(winter.x<0&&winter.y>0);
  const manifest=JSON.parse(readFileSync(new URL('../geography/winds-manifest.json',import.meta.url),'utf8'));
  assert.equal(manifest.sources.uwnd.period,'1991/01/01 - 2020/12/31');
  assert.equal(manifest.assetSha256,createHash('sha256').update(readFileSync(new URL('../assets/world-winds.js',import.meta.url))).digest('hex'));
});

test('weather varies smoothly with place and voyage time, wraps longitude, and survives saves',()=>{
  const position=xy(-35,15),first=windAt(position,8.9,7);
  assert.deepEqual(windAt(position,8.9,7),first);assert.notDeepEqual(windAt(position,12,7),first);assert.notDeepEqual(windAt(position,8.9,8),first);
  for(const day of [9,14,30,275]){
    const before=windAt(position,day-1e-5,7),after=windAt(position,day+1e-5,7);
    assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<.001,'No daily, weather-cell, or month-boundary rerolls.');
  }
  const left=windAt({x:0,y:375},9,7),right=windAt({x:1800,y:375},9,7);assert.deepEqual(left,right);
  const s=createGame(7);s.port=null;s.position=position;s.day=8.9;const weather=currentWind(s);
  for(let i=0;i<20;i++)random(s);assert.deepEqual(currentWind(s),weather,'Combat and event randomness cannot change the weather seed.');
  assert.deepEqual(currentWind(migrateSave(JSON.parse(JSON.stringify(s)))),weather);
  for(const weatherSeed of [-1,.5,Infinity,4294967296]){const bad=structuredClone(s);bad.weatherSeed=weatherSeed;assert.equal(validateSave(bad),false);}
});

test('wind response rewards fair wind, normalizes headings, and always permits progress',()=>{
  const wind={x:12,y:0,speed:12};
  assert.ok(sailingFactor(wind,{x:1,y:0})>sailingFactor(wind,{x:0,y:1}));
  assert.ok(sailingFactor(wind,{x:0,y:1})>sailingFactor(wind,{x:-1,y:0}));
  assert.equal(sailingFactor(wind,{x:1,y:1}),sailingFactor(wind,{x:100,y:100}));
  assert.equal(sailingFactor({x:0,y:0,speed:0},{x:1,y:0}),.55);
  for(let angle=0;angle<Math.PI*2;angle+=.1){const factor=sailingFactor(wind,{x:Math.cos(angle),y:Math.sin(angle)});assert.ok(factor>=.45-1e-12&&factor<=1.4+1e-12);}
  assert.equal(windReport(wind,{x:1,y:0}).from,'W');assert.equal(windReport(wind,{x:-1,y:0}).point,'HEAD');
});

test('the same tropical crossing takes longer eastbound and consumes more provisions',()=>{
  const east=xy(-35,15),west=xy(-45,15),out=voyage(east,west),back=voyage(west,east);
  assert.ok(back.days>out.days*2);assert.ok(back.s.food<out.s.food);
  for(const result of [out,back])assert.ok(Math.abs(result.days-result.estimate)/result.days<.25);
  for(const dx of [-1,1]){
    const s=createGame(7);s.port=null;s.position={...east};steer(s,dx,0);advance(s,.5);
    assert.equal(s.position.y,east.y,'Wind changes speed while the helmsman keeps the selected heading.');assert.ok(distance(s.position,east)>0);
  }
});

test('monsoon season changes the favorable direction between Aden and Calicut',()=>{
  const aden=portById('aden'),calicut=portById('calicut'),times=[];
  for(const day of [100,280])for(const [start,end] of [[aden,calicut],[calicut,aden]]){
    const s=createGame(7);s.port=start.id;s.position={x:start.x,y:start.y};s.day=day;
    assert.ok(plotCourse(s,end.id).ok);times.push(estimatedPassage(s));
  }
  assert.ok(times[0]<times[1]*.65,'Summer favors the passage toward India.');
  assert.ok(times[3]<times[2]*.65,'Winter favors the return to Arabia.');
});

test('turning from a following wind into a headwind spends time at each leg’s own speed',()=>{
  const s=createGame(7);s.port=null;s.position=xy(-35,15);s.day=.5;s.paused=false;
  const first={x:s.position.x-.05,y:s.position.y},last={x:s.position.x+.4,y:s.position.y};s.route=[first,last];
  const probe=structuredClone(s);probe.day+=.025;const followingSpeed=fleetSpeed(probe);
  probe.position={...first};probe.route=[last];const headSpeed=fleetSpeed(probe);
  assert.ok(followingSpeed>headSpeed*2);
  const expected=first.x+(.025-.05/followingSpeed)*headSpeed;advance(s,.025);
  assert.ok(Math.abs(s.position.x-expected)<1e-10);assert.equal(s.position.y,first.y);assert.equal(s.route.length,1);
});

test('auto sail chooses a faster seasonal Atlantic route while every leg remains clear of land',()=>{
  const s=createGame(7),havana=portById('havana'),shortest=findRoute(s.position,havana),shortestDays=estimatedPassage(s,shortest);
  assert.ok(plotCourse(s,havana.id).ok);assert.ok(estimatedPassage(s)<shortestDays*.7);
  let previous=s.position;for(const point of s.route){assert.ok(clearPassage(previous,point));previous=point;}
  assert.deepEqual(previous,{x:havana.x,y:havana.y});
  assert.ok(s.route.some(point=>90-point.y/5<25),'The outward passage reaches the trade-wind belt.');
});

test('old voyages gain repeatable weather and recalculate active passages without losing progress',()=>{
  const s=createGame(7),target=portById('havana');delete s.weatherSeed;delete s.windRevision;
  s.port=null;s.destination=target.id;s.route=findRoute(s.position,target);s.cargo['cotton-cloth']=4;
  const oldDays=estimatedPassage(s),restored=migrateSave(structuredClone(s));
  assert.ok(restored);assert.equal(restored.weatherSeed,7);assert.equal(restored.windRevision,1);assert.equal(restored.destination,target.id);assert.equal(restored.paused,true);
  assert.ok(estimatedPassage(restored)<oldDays*.7);
  for(const key of ['ships','gold','cargo','food','water','found','songbook','expedition'])assert.deepEqual(restored[key],s[key],key);
  assert.deepEqual(currentWind(migrateSave(JSON.parse(JSON.stringify(restored)))),currentWind(restored));
});
