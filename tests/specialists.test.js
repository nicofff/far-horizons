import test from 'node:test';
import assert from 'node:assert/strict';
import { ports, discoveries, pirateTemplates, xy } from '../data.js';
import { createGame, createShip, reveal, fleetSpeed, startBattle, battleAction, validateSave, migrateSave } from '../engine.js';
import { specialists, localSpecialists, specialistById, chartReport, discoveryReport, meetSpecialist, signContract, reportCharts, reportDiscoveries, lessonQuote, learnSkill, hasSkill, askDirections, collectorRumour } from '../specialists.js';

function dock(s,id){const p=ports.find(p=>p.id===id);s.port=id;s.position={x:p.x,y:p.y};}
function explore(s,point){s.port=null;s.position={...point};reveal(s);}
function unchanged(s,action){const before=structuredClone(s);assert.equal(action().ok,false);assert.deepEqual(s,before);}

test('named specialists occupy their documented ports and every introduction leads to a real specialist',()=>{
  assert.equal(specialists.length,11);assert.equal(new Set(specialists.map(p=>p.id)).size,11);
  assert.deepEqual(localSpecialists('amsterdam').map(p=>p.name),['Mercator']);assert.equal(specialistById('juliano').port,'naples');assert.equal(specialistById('wolf').port,'hamburg');assert.equal(specialistById('mordes').port,'bordeaux');
  assert.equal(specialists.filter(p=>p.kind==='cartographer').length,5);assert.equal(specialists.filter(p=>p.kind==='collector').length,4);
  for(const person of specialists){assert.ok(ports.some(p=>p.id===person.port));assert.ok(specialistById(person.lead));assert.ok(person.greeting.length>40);assert.ok(person.appearance);}
  assert.deepEqual(localSpecialists('syracuse'),[]);
});

test('meeting a specialist remembers their address without awarding money or repeating contacts',()=>{
  const s=createGame(),gold=s.gold;assert.ok(meetSpecialist(s,'marco').ok);assert.ok(meetSpecialist(s,'marco').ok);
  assert.deepEqual(s.expedition.contacts,['marco']);assert.equal(s.gold,gold);assert.ok(validateSave(s));
  unchanged(s,()=>meetSpecialist(s,'mercator'));unchanged(s,()=>meetSpecialist(s,'unknown'));
});

test('introductions chart a named destination without revealing its terrain or distant fleets',()=>{
  const s=createGame(),seen=[...s.seen],gold=s.gold;assert.ok(!s.known.includes('palma'));
  assert.ok(askDirections(s,'marco').ok);assert.ok(s.known.includes('palma'));assert.deepEqual(s.expedition.contacts,['olives']);assert.deepEqual(s.seen,seen);assert.equal(s.gold,gold);
  const events=s.events.length;askDirections(s,'marco');assert.equal(s.events.length,events);assert.deepEqual(s.expedition.contacts,['olives']);assert.ok(validateSave(s));
});

test('Cartography is learned once, contracts require it, and every cartographer can teach it',()=>{
  for(const person of specialists.filter(p=>p.kind==='cartographer')){
    const s=createGame();dock(s,person.port);unchanged(s,()=>signContract(s,person.id));
    const gold=s.gold;assert.ok(learnSkill(s,person.id).ok);assert.equal(s.gold,gold-800);assert.ok(hasSkill(s,'cartography'));assert.ok(signContract(s,person.id).ok);
    unchanged(s,()=>learnSkill(s,person.id));unchanged(s,()=>signContract(s,person.id));assert.ok(validateSave(s));
  }
});

test('new games do not pay for the starting chart and a map report pays exactly once',()=>{
  const s=createGame();assert.equal(chartReport(s).squares,0);dock(s,'palma');learnSkill(s,'olives');signContract(s,'olives');unchanged(s,()=>reportCharts(s,'olives'));
  explore(s,xy(-30,20));const quote=chartReport(s);assert.ok(quote.squares>0);
  dock(s,'palma');const gold=s.gold,fame=s.fame;assert.ok(reportCharts(s,'olives').ok);assert.equal(s.gold,gold+quote.gold);assert.equal(s.fame,fame+quote.fame);assert.equal(chartReport(s).squares,0);
  unchanged(s,()=>reportCharts(s,'olives'));explore(s,xy(-30,20));assert.equal(chartReport(s).squares,0);assert.ok(validateSave(s));
});

test('unsubmitted charts survive changing cartographers and paid charts cannot be sold at another studio',()=>{
  const s=createGame();explore(s,xy(-30,20));const quote=chartReport(s);dock(s,'palma');learnSkill(s,'olives');signContract(s,'olives');
  dock(s,'amsterdam');assert.ok(signContract(s,'mercator').ok);assert.deepEqual(chartReport(s),quote);unchanged(s,()=>reportCharts(s,'olives'));assert.ok(reportCharts(s,'mercator').ok);
  dock(s,'palma');signContract(s,'olives');unchanged(s,()=>reportCharts(s,'olives'));assert.equal(chartReport(s).gold,0);
  const gold=s.gold;dock(s,'antwerp');unchanged(s,()=>learnSkill(s,'de-jode'));assert.equal(s.gold,gold);
});

test('discoveries now award field renown at sea and reserve gold for a collector report',()=>{
  const s=createGame(),d=discoveries[0],gold=s.gold;explore(s,d);assert.ok(s.found.includes(d.id));assert.equal(s.gold,gold);assert.equal(s.fame,10);assert.equal(discoveryReport(s).items.length,1);
  reveal(s);assert.equal(s.fame,10);dock(s,'lisbon');unchanged(s,()=>reportDiscoveries(s,'marco'));assert.ok(signContract(s,'marco').ok);
  const quote=discoveryReport(s);assert.equal(quote.gold,Math.round(d.reward*1.2));assert.ok(reportDiscoveries(s,'marco').ok);assert.equal(s.gold,gold+quote.gold);assert.equal(s.fame,35);assert.deepEqual(s.expedition.reported,[d.id]);unchanged(s,()=>reportDiscoveries(s,'marco'));assert.ok(validateSave(s));
});

test('collectors offer different payments and changing patrons cannot duplicate discovery rewards',()=>{
  const s=createGame();for(const d of discoveries.slice(0,2))explore(s,d);
  const cheap=discoveryReport(s,'joan'),generous=discoveryReport(s,'mordes');assert.ok(generous.gold>cheap.gold);
  dock(s,'pisa');signContract(s,'joan');dock(s,'bordeaux');assert.ok(signContract(s,'mordes').ok);assert.equal(discoveryReport(s).gold,generous.gold);
  assert.ok(reportDiscoveries(s,'mordes').ok);dock(s,'alexandria');signContract(s,'ranajame');unchanged(s,()=>reportDiscoveries(s,'ranajame'));assert.equal(discoveryReport(s).items.length,0);assert.ok(validateSave(s));
});

test('collector rumours persist as clues, reveal no map cells, and do not spam repeated journal entries',()=>{
  const s=createGame();unchanged(s,()=>collectorRumour(s,'marco'));signContract(s,'marco');const seen=[...s.seen],known=[...s.known];
  const first=collectorRumour(s,'marco');assert.ok(first.ok);assert.equal(s.expedition.rumours.length,1);const events=s.events.length;
  assert.deepEqual(collectorRumour(s,'marco'),first);assert.equal(s.events.length,events);assert.deepEqual(s.seen,seen);assert.deepEqual(s.known,known);
  const firstId=s.expedition.rumours[0];explore(s,discoveries.find(d=>d.id===firstId));dock(s,'lisbon');assert.ok(collectorRumour(s,'marco').ok);assert.equal(s.expedition.rumours.length,2);
  s.found=discoveries.map(d=>d.id);unchanged(s,()=>collectorRumour(s,'marco'));
});

test('Celestial Navigation is taught in Naples and increases fleet sailing speed by 15 percent',()=>{
  const s=createGame(),before=fleetSpeed(s);unchanged(s,()=>learnSkill(s,'juliano'));dock(s,'naples');const gold=s.gold;
  assert.ok(learnSkill(s,'juliano').ok);assert.equal(s.gold,gold-2000);assert.ok(Math.abs(fleetSpeed(s)/before-1.15)<1e-10);unchanged(s,()=>learnSkill(s,'juliano'));assert.ok(validateSave(s));
});

test('Gunnery is taught in Hamburg and increases an otherwise identical broadside',()=>{
  const base=createGame(30),trained=createGame(30);dock(trained,'hamburg');assert.ok(learnSkill(trained,'wolf').ok);
  for(const s of [base,trained]){s.ships=[createShip('galleon','Flagship',{material:'copper'})];s.port=null;startBattle(s,{...pirateTemplates[3],power:3});}
  const a=base.battle.enemy,b=trained.battle.enemy;battleAction(base,'fire');battleAction(trained,'fire');
  const normal=a.maxHull-a.hull,improved=b.maxHull-b.hull;assert.ok(normal>0);assert.ok(Math.abs(improved-normal*1.25)<=1);assert.ok(improved>normal);
});

test('lessons require payment and all specialist actions reject remote, lost, or combat states',()=>{
  const s=createGame();dock(s,'hamburg');s.gold=2499;unchanged(s,()=>learnSkill(s,'wolf'));assert.equal(lessonQuote(s,'wolf').cost,2500);
  for(const status of ['remote','battle','lost']){
    const s=createGame();if(status==='remote')s.port=null;if(status==='battle')startBattle(s,pirateTemplates[0]);if(status==='lost')s.lost=true;
    for(const action of [()=>meetSpecialist(s,'marco'),()=>signContract(s,'marco'),()=>reportCharts(s,'marco'),()=>reportDiscoveries(s,'marco'),()=>collectorRumour(s,'marco'),()=>learnSkill(s,'marco'),()=>askDirections(s,'marco')])unchanged(s,action);
  }
  dock(s,'lisbon');unchanged(s,()=>learnSkill(s,'marco'));unchanged(s,()=>reportCharts(s,'marco'));
});

test('version 3 voyages retain already-paid chart and discovery rewards without paying them twice',()=>{
  const old=createGame();old.version=3;delete old.expedition;old.found=[discoveries[0].id];old.gold=12345;old.fame=222;
  const restored=migrateSave(structuredClone(old));assert.ok(restored);assert.equal(restored.version,4);assert.equal(restored.gold,12345);assert.equal(restored.fame,222);assert.equal(chartReport(restored).squares,0);assert.equal(discoveryReport(restored).items.length,0);
  signContract(restored,'marco');unchanged(restored,()=>reportDiscoveries(restored,'marco'));const repeat=migrateSave(structuredClone(restored));assert.deepEqual(repeat.expedition,restored.expedition);assert.equal(repeat.gold,restored.gold);
  explore(restored,discoveries[1]);assert.equal(discoveryReport(restored).items.length,1);assert.equal(restored.gold,12345);
});

test('version 4 saves preserve pending reports, learned skills, contacts, and active contracts',()=>{
  const s=createGame();signContract(s,'marco');collectorRumour(s,'marco');askDirections(s,'marco');dock(s,'palma');learnSkill(s,'olives');signContract(s,'olives');explore(s,discoveries[0]);
  assert.ok(validateSave(s));const restored=migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(restored);assert.deepEqual(restored.expedition,s.expedition);assert.deepEqual(chartReport(restored),chartReport(s));assert.equal(discoveryReport(restored).gold,discoveryReport(s).gold);
});

test('save validation rejects impossible specialist identities, duplicate rewards, and malformed progress',()=>{
  const s=createGame();
  for(const mutate of [s=>delete s.expedition,s=>s.expedition=[],s=>s.expedition.charted=-1,s=>s.expedition.charted=s.seen.length+1,s=>s.expedition.charted=1.5,s=>s.expedition.reported=['volcano'],s=>s.expedition.rumours=['unknown'],s=>s.expedition.skills=['unknown'],s=>s.expedition.skills=['gunnery','gunnery'],s=>s.expedition.contacts=['unknown'],s=>s.expedition.contacts=['mercator'],s=>s.expedition.collector='olives',s=>s.expedition.cartographer='mercator',s=>s.seen.push(s.seen[0])]){const bad=structuredClone(s);mutate(bad);assert.equal(validateSave(bad),false);}
});
