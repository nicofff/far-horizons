import test from 'node:test';
import assert from 'node:assert/strict';
import { xy } from '../data.js';
import { prevailingWindAt } from '../wind.js';
import { monthDay, monthSeasons, monthlyWinds, seasonalComparison, drawPrevailingWinds } from '../world-map-winds.js';

test('overview months use the same calendar and prevailing vectors as sailing',()=>{
  const position=xy(65,12),series=monthlyWinds(position);
  assert.equal(series.length,12);
  for(const wind of series){
    const date=new Date(Date.UTC(1522,3,1)+monthDay(wind.month)*86400000);
    assert.equal(date.getUTCMonth(),wind.month);assert.equal(date.getUTCDate(),15);
    const expected=prevailingWindAt(position,monthDay(wind.month));
    assert.equal(wind.x,expected.x);assert.equal(wind.y,expected.y);
  }
  assert.equal(series[0].from,'NE');assert.equal(series[6].from,'SW');
  assert.match(seasonalComparison(series),/151°/);
  assert.match(seasonalComparison(series),/4–21 kt/);
  const calm=series.map(w=>({...w,x:0,y:0,speed:0}));
  assert.match(seasonalComparison(calm),/January: calm/);assert.doesNotMatch(seasonalComparison(calm),/NaN|Direction changes/);
});

test('season labels distinguish northern and southern hemispheres',()=>{
  assert.equal(monthSeasons(0),'North: winter / South: summer');
  assert.equal(monthSeasons(3),'North: spring / South: autumn');
  assert.equal(monthSeasons(6),'North: summer / South: winter');
  assert.equal(monthSeasons(9),'North: autumn / South: spring');
  assert.equal(monthSeasons(11),monthSeasons(0));
});

function recordingContext(){
  const paths=[];let path=[];
  return {paths,save(){},restore(){},beginPath(){path=[];},moveTo(x,y){path.push([x,y]);},lineTo(x,y){path.push([x,y]);},arc(){},stroke(){paths.push([...path]);}};
}

test('wind arrows point downwind and reverse with the sampled monsoon season',()=>{
  const center=xy(65,12),view={width:20,height:20,scale:36,center};
  const winter=recordingContext(),summer=recordingContext();
  assert.equal(drawPrevailingWinds(winter,{...view,month:0},()=>false),1);
  assert.equal(drawPrevailingWinds(summer,{...view,month:6},()=>false),1);
  const [startW,endW]=winter.paths[0],[startS,endS]=summer.paths[0];
  assert.ok(endW[0]<startW[0]&&endW[1]>startW[1],'Northeast wind blows southwest.');
  assert.ok(endS[0]>startS[0]&&endS[1]<startS[1],'Southwest wind blows northeast.');
  assert.ok(Math.hypot(endS[0]-startS[0],endS[1]-startS[1])>Math.hypot(endW[0]-startW[0],endW[1]-startW[1]));
});

test('wind grid skips land, bounds samples to the world and limits drawing density',()=>{
  const ctx=recordingContext(),samples=[],view={width:1200,height:600,scale:.6,center:{x:900,y:450},month:0};
  const count=drawPrevailingWinds(ctx,view,(x,y)=>{samples.push({x,y});return x>=900;});
  assert.ok(count>0&&count<300);assert.equal(ctx.paths.length,count*2);
  assert.ok(samples.every(p=>p.x>=0&&p.x<1800&&p.y>=0&&p.y<900));
  assert.equal(drawPrevailingWinds(recordingContext(),view,()=>true),0);
  const outside=[];
  drawPrevailingWinds(recordingContext(),{...view,center:{x:0,y:0}},(x,y)=>{outside.push({x,y});return false;});
  assert.ok(outside.every(p=>p.x>=0&&p.y>=0));
});
