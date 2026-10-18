import test from 'node:test';
import assert from 'node:assert/strict';
import { xy } from '../data.js';
import { biomeStyleAt } from '../biomes.js';
import { calendarAt, seasonalFrame, seasonAt, seasonalStyleAt, daylightAt, drawDaylight } from '../world-time.js';

const dayAt=(month,date=1,hour=12)=>(Date.UTC(1522,month,date)-Date.UTC(1522,3,1))/86400000+hour/24;
const north=xy(-1,52),south=xy(18,-34);

test('calendar and monthly blends follow the saved voyage clock across years and leap days',()=>{
  assert.equal(calendarAt(0).toISOString(),'1522-04-01T00:00:00.000Z');
  const before=seasonalFrame(dayAt(9,31,23.99)),after=seasonalFrame(dayAt(10));
  assert.equal(before.next,after.month);assert.ok(before.blend>.99);
  const leap=(Date.UTC(1524,1,29,12)-Date.UTC(1522,3,1))/86400000;
  assert.equal(calendarAt(leap).getUTCDate(),29);assert.equal(seasonalFrame(leap).blend,28.5/29);
  assert.equal(calendarAt(leap+1).getUTCMonth(),2);
});

test('local seasons reverse hemispheres and leave equatorial regions tropical',()=>{
  assert.equal(seasonAt(dayAt(6),north.y),'SUMMER');assert.equal(seasonAt(dayAt(6),south.y),'WINTER');
  assert.equal(seasonAt(dayAt(12),north.y),'WINTER');assert.equal(seasonAt(dayAt(12),south.y),'SUMMER');
  assert.equal(seasonAt(dayAt(9),north.y),'AUTUMN');assert.equal(seasonAt(dayAt(3),north.y),'SPRING');
  for(let month=3;month<15;month++)assert.equal(seasonAt(dayAt(month),xy(0,3).y),'TROPICS');
});

test('daylight has gentle dawn and dusk and longer summer days in each hemisphere',()=>{
  assert.equal(daylightAt(0,north.y).phase,'NIGHT');assert.equal(daylightAt(.5,north.y).phase,'DAY');
  assert.equal(daylightAt(.25,north.y).phase,'DAWN');assert.equal(daylightAt(.78,north.y).phase,'DUSK');
  const hoursOfLight=(month,y)=>Array.from({length:96},(_,i)=>daylightAt(dayAt(month,21,0)+i/96,y).night<.5).filter(Boolean).length;
  assert.ok(hoursOfLight(5,north.y)>hoursOfLight(11,north.y));
  assert.ok(hoursOfLight(11,south.y)>hoursOfLight(5,south.y));
  const first=daylightAt(193.3,north.y);assert.deepEqual(daylightAt(193.3,north.y),first,'wall time cannot advance a paused voyage');
  for(let hour=0;hour<24;hour+=.1){
    const calls=[],c={globalAlpha:1,fillRect(...bounds){calls.push({alpha:this.globalAlpha,bounds});}};
    drawDaylight(c,{x:0,y:0,width:512,height:384},daylightAt(dayAt(6,1,hour),north.y));
    assert.ok(calls.every(call=>call.alpha<=.19));assert.equal(c.globalAlpha,1);
  }
});

test('seasonal woodland changes color without moving scenery, bleaching deserts or frosting jungles',()=>{
  const base=biomeStyleAt(north.x,north.y),original=structuredClone(base),winter=seasonalStyleAt(north.x,north.y,0),summer=seasonalStyleAt(north.x,north.y,6),autumn=seasonalStyleAt(north.x,north.y,9);
  assert.notDeepEqual(winter.ground,summer.ground);assert.notDeepEqual(autumn.leaves,summer.leaves);
  for(const style of [winter,summer,autumn]){assert.equal(style.feature,base.feature);assert.equal(style.density,base.density);assert.deepEqual(style.shore,base.shore);}
  assert.deepEqual(base,original,'cached source palettes cannot be mutated');
  for(const [lon,lat] of [[10,28],[7,5.5],[6.5,4.5],[-55,-3],[-42,72]]){
    const p=xy(lon,lat);for(let month=0;month<12;month++)assert.equal(seasonalStyleAt(p.x,p.y,month),biomeStyleAt(p.x,p.y));
  }
});
