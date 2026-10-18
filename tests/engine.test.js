import test from 'node:test';
import assert from 'node:assert/strict';
import { clearPassage } from '../terrain.js';
import { ports, pirateTemplates, shipTypes, xy } from '../data.js';
import { createGame, validateSave, migrateSave, findRoute, onLand, plotCourse, advance, resupply, supplyDays, trade, maxBuyQuantity, fillHold, price, portById, createShip, shipStats, startBattle, battleAction, cargoUsed, capacity, repair, distance, SIGHT_RADIUS, visiblePirates, inSight, reveal, steer, recorded } from '../engine.js';

test('all harbors are offshore and reachable from Lisbon',()=>{
  for(const port of ports){assert.equal(onLand(port.x,port.y),false,port.id);const path=findRoute(ports[0],port);assert.ok(path.length,port.id);assert.ok(path.every(p=>!onLand(p.x,p.y)),port.id);}
});

test('a route to India sails south around Africa',()=>{
  const path=findRoute(ports[0],portById('goa'));
  assert.ok(Math.max(...path.map(p=>p.y))>=xy(20,-34.8).y,'the route must round the Cape');
  assert.ok(path.every(p=>!onLand(p.x,p.y)));
});

test('every harbor passage clears land along its full length',()=>{
  for(const start of ports)for(const end of ports){
    const route=findRoute(start,end);assert.ok(route.length,`${start.id} to ${end.id}`);let previous=start;
    for(const point of route){assert.ok(clearPassage(previous,point),`${start.id} to ${end.id}`);previous=point;}
  }
});

test('landfall spends supplies, rewards the first passage, and pauses',()=>{
  const s=createGame();assert.ok(plotCourse(s,'madeira').ok);advance(s,30);
  assert.equal(s.port,'madeira');assert.equal(s.paused,true);assert.ok(s.day>2&&s.day<6);assert.ok(s.food<120);assert.equal(s.gold,8150);assert.equal(s.fame,40);
  const gold=s.gold;plotCourse(s,'lisbon');advance(s,30);plotCourse(s,'madeira');advance(s,30);assert.equal(s.gold,gold);
});

test('pause freezes time and fast travel preserves the simulation',()=>{
  const a=createGame(6),b=createGame(6);advance(a,10);assert.equal(a.day,0);
  plotCourse(a,'madeira');plotCourse(b,'madeira');a.speed=1;b.speed=16;
  for(let i=0;i<20;i++)advance(a,.1);advance(b,2);
  assert.ok(Math.abs(a.food-b.food)<1e-8);assert.ok(Math.abs(a.position.x-b.position.x)<1e-8);
});

test('trade route earns a profit and rejects invalid or overfull trades',()=>{
  const s=createGame(),initial=s.gold;assert.ok(trade(s,'olive-oil',10,true).ok);
  const cost=initial-s.gold;plotCourse(s,'madeira');advance(s,20);
  const before=s.gold;assert.ok(trade(s,'olive-oil',10,false).ok);assert.ok(s.gold-before>cost);
  assert.equal(trade(s,'olive-oil',-2,true).ok,false);assert.equal(trade(s,'olive-oil',1,false).ok,false);
  s.gold=1e6;assert.equal(trade(s,'olive-oil',500,true).ok,false);assert.equal(trade(s,'spices',1,true).ok,false);
  assert.equal(price(s,portById('madeira'),'olive-oil',false)>price(s,ports[0],'olive-oil',true),true);
});

test('fill hold accounts for existing cargo and fractional provision space across the fleet',()=>{
  const s=createGame();s.ships.push({...s.ships[0],id:'second'});s.gold=100000;s.food=1;s.water=0;s.cargo['cotton-cloth']=125;
  const room=Math.floor(capacity(s)-cargoUsed(s)),gold=s.gold,unit=price(s,portById(s.port),'cotton-cloth',true);
  assert.equal(maxBuyQuantity(s,'cotton-cloth'),room);assert.ok(fillHold(s,'cotton-cloth').ok);
  assert.equal(s.cargo['cotton-cloth'],125+room);assert.equal(s.gold,gold-room*unit);
  assert.ok(cargoUsed(s)<=capacity(s));assert.ok(capacity(s)-cargoUsed(s)<1);
  const filled=structuredClone(s);assert.equal(fillHold(s,'cotton-cloth').ok,false);assert.deepEqual(s,filled);
});

test('fill hold buys only what the available gold covers',()=>{
  const s=createGame(),unit=price(s,portById(s.port),'olive-oil',true);s.gold=unit*7+unit-1;
  assert.equal(maxBuyQuantity(s,'olive-oil'),7);assert.ok(fillHold(s,'olive-oil').ok);
  assert.equal(s.cargo['olive-oil'],7);assert.equal(s.gold,unit-1);
  const filled=structuredClone(s);assert.equal(fillHold(s,'olive-oil').ok,false);assert.deepEqual(s,filled);
});

test('fill hold rejects unavailable goods and trading outside a harbor without mutation',()=>{
  const s=createGame();
  for(const id of ['spices','unknown']){const before=structuredClone(s);assert.equal(maxBuyQuantity(s,id),0);assert.equal(fillHold(s,id).ok,false);assert.deepEqual(s,before);}
  s.port=null;const before=structuredClone(s);assert.equal(maxBuyQuantity(s,'olive-oil'),0);assert.equal(fillHold(s,'olive-oil').ok,false);assert.deepEqual(s,before);
});

test('resupply respects gold, cargo capacity, crew growth, and harbor access',()=>{
  const s=createGame();s.food=1;s.water=1;s.gold=0;assert.equal(resupply(s).ok,false);
  s.gold=10000;assert.ok(resupply(s).ok);assert.equal(supplyDays(s),50);
  s.ships.push(createShip('caravela-latina','Second ship'));assert.equal(supplyDays(s),25);assert.ok(resupply(s).ok);assert.equal(supplyDays(s),50);assert.ok(cargoUsed(s)<=capacity(s));
  s.food=0;s.water=0;s.cargo['olive-oil']=capacity(s)-2;assert.equal(resupply(s).ok,false);
  s.port=null;assert.equal(resupply(s).ok,false);
});

test('supply warning pauses a passage, and starvation can end a voyage',()=>{
  const s=createGame(7);s.food=5;s.water=5;s.lastEvent=s.day;plotCourse(s,'havana');advance(s,20);
  assert.equal(s.paused,true);assert.ok(s.events.some(e=>e.title==='Provisions running low'));
  s.food=0;s.water=0;s.ships[0].hull=1;s.lastEvent=s.day;s.paused=false;advance(s,1);
  assert.equal(s.lost,true);assert.equal(s.ships.length,0);assert.equal(s.paused,true);assert.ok(validateSave(JSON.parse(JSON.stringify(s))));
});

test('boarding a weakened enemy can add a prize ship exactly once',()=>{
  const s=createGame(100);s.port=null;startBattle(s,pirateTemplates[0]);s.battle.enemy.hull=1;s.battle.enemy.crew=1;
  let rounds=0;while(s.battle&&rounds++<10)battleAction(s,'board');
  assert.equal(s.battle,null);assert.equal(s.ships.length,2);assert.ok(s.defeated.includes('corsair'));assert.equal(s.gold,8300);assert.equal(s.fame,40);
  assert.equal(battleAction(s,'board').ok,false);assert.equal(s.ships.length,2);assert.ok(validateSave(JSON.parse(JSON.stringify(s))));
});

test('broadsides can win a battle, and harbor repair restores damaged hulls',()=>{
  const s=createGame(13);s.port=null;s.ships[0]=createShip('galleon','Flagship',{fit:'battle'});s.ships[0].crew=200;
  startBattle(s,pirateTemplates[0]);let rounds=0;while(s.battle&&rounds++<20)battleAction(s,'fire');
  assert.ok(!s.lost);assert.equal(s.battle,null);assert.ok(s.defeated.includes('corsair'));assert.equal(s.fame,30);
  assert.equal(repair(s).ok,false);s.port='lisbon';assert.ok(repair(s).ok);assert.equal(s.ships[0].hull,shipTypes.galleon.hull);
});

test('save validation accepts roundtrips and rejects corrupt simulation values',()=>{
  const s=createGame();assert.ok(validateSave(JSON.parse(JSON.stringify(s))));
  for(const mutate of [s=>s.gold=-1,s=>s.ships[0].type='unknown',s=>s.route=[{x:NaN,y:0}],s=>s.speed=100,s=>s.cargo.unknown=3,s=>s.known.push('missing'),s=>s.seen.push(999999),s=>s.heading={x:5,y:0}]){const bad=structuredClone(s);mutate(bad);assert.equal(validateSave(bad),false);}
  startBattle(s,pirateTemplates[0]);assert.ok(validateSave(s));s.battle.enemy.type='unknown';assert.equal(validateSave(s),false);
});

test('the lookout is local and remembered waters never reveal distant fleets',()=>{
  const s=createGame();assert.equal(SIGHT_RADIUS,8);assert.deepEqual(ports.filter(p=>inSight(s,p)).map(p=>p.id),['lisbon']);assert.equal(visiblePirates(s).length,0);
  const enemy=pirateTemplates[0];s.position={x:enemy.x,y:enemy.y+10};reveal(s);assert.equal(visiblePirates(s).length,1);const sighting={...visiblePirates(s)[0]};
  s.position={x:400,y:400};reveal(s);assert.ok(recorded(s,sighting));assert.equal(visiblePirates(s).length,0);
});

test('new harbors and landmarks require a close approach',()=>{
  const s=createGame(),port=portById('cape-verde');s.position={x:port.x,y:port.y-12};reveal(s);assert.equal(s.known.includes(port.id),false);
  s.position={x:port.x,y:port.y-7};reveal(s);assert.equal(s.known.includes(port.id),true);assert.equal(s.found.length,0);
});

test('manual steering leaves port, advances supplies, and stops before land',()=>{
  const s=createGame(8);assert.ok(steer(s,-1,0));const start={...s.position};advance(s,.2);assert.equal(s.port,null);assert.ok(s.position.x<start.x);assert.ok(s.food<120);
  const coastal=createGame(8);steer(coastal,1,0);advance(coastal,1);assert.equal(coastal.paused,true);assert.equal(onLand(coastal.position.x,coastal.position.y),false);assert.ok(coastal.events.some(e=>e.title==='Land ahead!'));
});

test('diagonal steering moves on both axes at the same speed as cardinal steering',()=>{
  for(const [dx,dy] of [[-1,-1],[-1,1],[1,-1],[1,1]]){
    const diagonal=createGame(8),cardinal=createGame(8);
    diagonal.position={x:700,y:300};cardinal.position={...diagonal.position};diagonal.port=null;cardinal.port=null;
    const start={...diagonal.position};steer(diagonal,dx,dy);steer(cardinal,dx,0);
    advance(diagonal,.2);advance(cardinal,.2);
    assert.equal(Math.sign(diagonal.position.x-start.x),dx);assert.equal(Math.sign(diagonal.position.y-start.y),dy);
    assert.ok(Math.abs(distance(start,diagonal.position)-distance(start,cardinal.position))<1e-8);
  }
});

test('legacy saves retain progress but replace the old global visibility memory',()=>{
  const old=createGame();old.version=1;old.ships=[{id:'old-caravel',type:'caravel',name:'Santa Clara',hull:100,crew:24}];old.seen=[10,11,12];old.gold=9300;delete old.heading;
  const restored=migrateSave(JSON.parse(JSON.stringify(old)));assert.ok(restored);assert.equal(restored.version,4);assert.equal(restored.gold,9300);assert.ok(!restored.seen.includes(10));assert.equal(restored.paused,true);assert.ok(validateSave(restored));
});

test('London has a river anchorage and a town on the north bank',()=>{
  const london=portById('london');
  assert.ok(Math.abs(london.x/5-180)<.2);
  assert.ok(Math.abs(90-london.y/5-51.5)<.1);
  assert.equal(onLand(london.x,london.y),false);
  assert.equal(onLand(london.town.x,london.town.y),true);
  assert.ok(london.town.y<london.y);
  const lengthFrom=id=>{let previous=portById(id),length=0;for(const p of findRoute(previous,london)){const steps=Math.ceil(distance(previous,p)*10);for(let i=1;i<=steps;i++)assert.equal(onLand(previous.x+(p.x-previous.x)*i/steps,previous.y+(p.y-previous.y)*i/steps),false);length+=distance(previous,p);previous=p;}return length;};
  assert.ok(lengthFrom('lisbon')<130,'western arrivals should use the English Channel');
  assert.ok(lengthFrom('amsterdam')<35,'North Sea arrivals should enter the Thames directly');
});

test('saved London destinations and docked ships move to the corrected harbor',()=>{
  const underway=createGame();delete underway.mapRevision;underway.destination='london';underway.port=null;underway.route=[{x:885,y:200}];
  const restored=migrateSave(structuredClone(underway)),london=portById('london');
  assert.deepEqual(restored.route.at(-1),{x:london.x,y:london.y});assert.equal(restored.paused,true);
  restored.paused=false;advance(restored,30);assert.equal(restored.port,'london');
  const docked=createGame();docked.port='london';docked.position={x:885,y:200};
  const relocated=migrateSave(docked);assert.deepEqual(relocated.position,{x:london.x,y:london.y});assert.equal(relocated.gold,7200);
});
