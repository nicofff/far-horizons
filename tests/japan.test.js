import test from 'node:test';
import assert from 'node:assert/strict';
import { ports, xy } from '../data.js';
import { terrainMask, rasterWidth, onLand, clearPassage } from '../terrain.js';
import { findRoute } from '../navigation.js';
import { createGame, portById, plotCourse, advance, steer, distance, fleetSpeed, migrateSave, MAP_REVISION } from '../engine.js';

const islands={Honshu:[138,36],Hokkaido:[142,43],Kyushu:[130.75,32.75],Shikoku:[133.5,33.75],Awaji:[134.825,34.325]};
const circuits={
  Honshu:{limit:190,points:[[130.8,34.075],[139.75,41.425],[141.75,41.625],[141.5,34],[135.5,33.25],[135.225,34.425],[134.875,34.625],[133.6,34.4],[131.125,33.875]]},
  Hokkaido:{limit:135,points:[[139,41.2],[139,45.8],[146.4,45.8],[146.4,41.2]]},
  Kyushu:{limit:65,points:[[130.8,34.075],[131.125,33.875],[131.875,33.575],[132.075,32.825],[131.5,30.6],[129,32.5],[130.5,34.1]]},
  Shikoku:{limit:50,points:[[131.875,33.575],[133.6,34.4],[134.575,34.225],[134.725,34.025],[134.5,32.5],[132.075,32.825]]},
  Awaji:{limit:15,points:[[134.875,34.625],[135.225,34.425],[135.075,34.075],[134.725,34.025],[134.575,34.225],[134.625,34.575]]},
};
function passage(start,end){
  const route=findRoute(start,end);assert.ok(route.length,'A water route must exist.');let previous=start,length=0;
  for(const point of route){assert.ok(clearPassage(previous,point));length+=distance(previous,point);previous=point;}
  assert.deepEqual(previous,{x:end.x,y:end.y});return {route,length};
}
function winding(points,center){
  let angle=0;
  for(let i=1;i<points.length;i++){
    const a={x:points[i-1].x-center.x,y:points[i-1].y-center.y},b={x:points[i].x-center.x,y:points[i].y-center.y};
    angle+=Math.atan2(a.x*b.y-a.y*b.x,a.x*b.x+a.y*b.y);
  }
  return Math.abs(Math.round(angle/(2*Math.PI)));
}

test('Japan has separate land components for its four main islands and Awaji, including diagonal contacts',()=>{
  const left=6160,top=880,width=400,height=320,labels=new Uint32Array(width*height);let count=0;
  const land=(x,y)=>terrainMask[(y+top)*rasterWidth+x+left];
  for(let i=0;i<labels.length;i++)if(!labels[i]&&land(i%width,Math.floor(i/width))){
    const pending=[i];labels[i]=++count;
    while(pending.length){
      const current=pending.pop(),x=current%width,y=Math.floor(current/width);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=x+dx,ny=y+dy,next=ny*width+nx;
        if((dx||dy)&&nx>=0&&nx<width&&ny>=0&&ny<height&&!labels[next]&&land(nx,ny)){labels[next]=count;pending.push(next);}
      }
    }
  }
  const components=[];
  for(const [name,coordinates]of Object.entries(islands)){
    const p=xy(...coordinates);assert.ok(onLand(p.x,p.y),name);
    const component=labels[(Math.floor(p.y/.25)-top)*width+Math.floor(p.x/.25)-left];assert.ok(component,name);components.push(component);
  }
  assert.equal(new Set(components).size,5);
});

test('ships can circumnavigate each Japanese island separately in either direction',()=>{
  for(const [name,circuit]of Object.entries(circuits))for(const coordinates of [circuit.points,[...circuit.points].reverse()]){
    const anchors=coordinates.map(p=>xy(...p)),path=[anchors[0]],s=createGame();s.port=null;s.position={...anchors[0]};let total=0;
    for(let i=1;i<=anchors.length;i++){
      const end=anchors[i%anchors.length],{route,length}=passage(anchors[i-1],end);total+=length;path.push(...route);
      assert.ok(plotCourse(s,end).ok,name);advance(s,30);assert.deepEqual(s.position,end,name);assert.equal(s.lost,false);
    }
    assert.ok(total<circuit.limit,`${name} must not require a distant detour.`);
    for(const [other,center]of Object.entries(islands))assert.equal(winding(path,xy(...center)),Number(name===other),`${name} circuit around ${other}`);
  }
});

test('Japanese straits offer short passages in both directions',()=>{
  for(const [name,a,b,limit]of [
    ['Kanmon',[130.8,34.075],[131.125,33.875],3],
    ['Akashi',[134.875,34.625],[135.175,34.525],2.2],
    ['Naruto',[134.575,34.225],[134.725,34.025],2],
    ['Kitan',[135.075,34.375],[135.075,34.075],2],
    ['Bungo',[131.875,33.575],[132.075,32.825],5],
    ['Tsugaru',[139.75,41.425],[141.75,41.625],12],
    ['Soya',[141.5,45.675],[143.25,45.675],10],
  ])for(const [start,end]of[[xy(...a),xy(...b)],[xy(...b),xy(...a)]])assert.ok(passage(start,end).length<limit,name);
});

test('manual sailing crosses the Akashi and Kitan straits without catching on raster bridges',()=>{
  for(const [a,b]of[
    [[134.875,34.625],[135.175,34.525]],
    [[135.075,34.375],[135.075,34.075]],
  ])for(const[start,end]of[[xy(...a),xy(...b)],[xy(...b),xy(...a)]]){
    const s=createGame();s.port=null;s.position={...start};steer(s,end.x-start.x,end.y-start.y);advance(s,distance(start,end)/fleetSpeed(s)*1.1);
    assert.equal(s.paused,false);assert.equal(onLand(s.position.x,s.position.y),false);
    assert.ok((s.position.x-end.x)*(end.x-start.x)+(s.position.y-end.y)*(end.y-start.y)>0);
  }
});

test('Sakai has a waterfront anchorage beside the town and an open Osaka Bay approach',()=>{
  const p=portById('sakai');assert.equal(onLand(p.x,p.y),false);assert.equal(onLand(p.town.x,p.town.y),true);
  assert.ok(distance(p,p.town)<=.4);assert.ok(distance(p,xy(p.coordinates.lon,p.coordinates.lat))<.5);
  const s=createGame();s.port=null;s.position=xy(135.25,34.5);s.known.push('sakai');
  assert.ok(passage(s.position,p).length<3);assert.ok(plotCourse(s,'sakai').ok);advance(s,2);assert.equal(s.port,'sakai');
});

test('Japanese harbors connect to every other harbor after Sakai and Ezo move',()=>{
  for(const id of ['nagasaki','sakai','ezo'])for(const other of ports){
    const p=portById(id);passage(p,other);passage(other,p);
  }
});

test('old Japanese voyages retain fleet, cargo and discoveries while harbors and courses update',()=>{
  const s=createGame();s.mapRevision=MAP_REVISION-1;s.port='sakai';s.position=xy(135.075,34.225);s.cargo['silk-cloth']=12;s.gold=12345;s.found=['volcano'];
  const restored=migrateSave(structuredClone(s)),sakai=portById('sakai');assert.ok(restored);assert.deepEqual(restored.position,{x:sakai.x,y:sakai.y});assert.equal(restored.paused,true);
  for(const key of ['ships','cargo','gold','food','water','found','expedition'])assert.deepEqual(restored[key],s[key],key);
  s.port=null;s.destination='ezo';s.route=[{x:1603.875,y:241.375}];
  const sailing=migrateSave(structuredClone(s)),ezo=portById('ezo');assert.ok(sailing);assert.equal(sailing.destination,'ezo');assert.deepEqual(sailing.route.at(-1),{x:ezo.x,y:ezo.y});
  let previous=sailing.position;for(const p of sailing.route){assert.ok(clearPassage(previous,p));previous=p;}
});
