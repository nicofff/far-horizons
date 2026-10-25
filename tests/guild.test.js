import test from 'node:test';
import assert from 'node:assert/strict';
import { ports, pirateTemplates } from '../data.js';
import { createGame, availableGuildJobs, acceptGuildJob, completeGuildJob, collectGuildDebt, abandonGuildJob, trade, portById, plotCourse, advance, pirates, startBattle, battleAction, migrateSave, validateSave, waitInPort, steer, onLand, findRoute } from '../engine.js';
import { guildTypes, guildJobs, checkGuildDeadline, guildPirate } from '../guild.js';
import { clearPassage } from '../terrain.js';

function dock(s,id){const p=portById(id);s.port=id;s.position={x:p.x,y:p.y};s.route=[];s.destination=null;s.heading=null;s.paused=true;}
const jobSeeds={letter:3,buy:6,transport:14,debt:2,pirate:313};
function accept(kind){const s=createGame(jobSeeds[kind]);assert.ok(acceptGuildJob(s,kind).ok);return s;}
function sail(s,id){s.lastEvent=s.day;s.escapedUntil=s.day+1000;s.food=s.water=120;s.supplyWarned=true;assert.ok(plotCourse(s,id).ok);advance(s,100);assert.equal(s.port,id);}

test('all five sourced job types have stable offers, actual local stock, and a single active contract',()=>{
  for(const kind of Object.keys(guildTypes)){
    const s=createGame(jobSeeds[kind]),seen=[...s.seen],seed=s.seed,offers=availableGuildJobs(s);
    assert.ok(offers.some(q=>q.kind===kind));assert.deepEqual(availableGuildJobs(migrateSave(structuredClone(s))),offers);
    assert.equal(s.seed,seed);assert.deepEqual(s.seen,seen);
    for(const q of offers){assert.ok(q.days>=30&&q.days<=365);assert.ok(q.fee>0);}
  }
  const s=createGame(jobSeeds.debt),seen=[...s.seen],offers=availableGuildJobs(s);
  const target=offers.find(q=>q.kind==='debt').target;assert.ok(!s.known.includes(target));
  assert.ok(acceptGuildJob(s,'debt').ok);assert.ok(s.known.includes(target));assert.deepEqual(s.seen,seen);
  const active=structuredClone(s.guild.active);assert.equal(acceptGuildJob(s,'letter').ok,false);assert.deepEqual(s.guild.active,active);
  s.port=null;assert.equal(acceptGuildJob(s,'letter').ok,false);assert.deepEqual(availableGuildJobs(s),[]);
});

test('letter delivery requires the named port, completes after a real passage, and cannot pay twice',()=>{
  const s=accept('letter'),q=structuredClone(s.guild.active),gold=s.gold,fame=s.fame;
  assert.equal(completeGuildJob(s).ok,false);sail(s,q.target);const landed=s.gold;
  assert.ok(completeGuildJob(s).ok);assert.equal(s.gold,landed+700);assert.ok(s.gold>=gold+700);assert.ok(s.fame>=fame+50);
  assert.equal(s.guild.completed,1);assert.equal(s.guild.active,null);const paid=s.gold;assert.equal(completeGuildJob(s).ok,false);assert.equal(s.gold,paid);
  dock(s,q.origin);assert.ok(!availableGuildJobs(s).some(x=>x.id===q.id));assert.equal(acceptGuildJob(s,'letter').ok,false);
  const restored=migrateSave(structuredClone(s));assert.equal(acceptGuildJob(restored,'letter').ok,false);
});

test('procurement consumes only the promised cargo and reimburses its quoted purchase cost',()=>{
  const s=accept('buy'),q=s.guild.active;assert.equal(completeGuildJob(s).ok,false);
  sail(s,q.source);assert.ok(trade(s,q.good,q.quantity+3,true).ok);sail(s,q.origin);
  const gold=s.gold;assert.ok(completeGuildJob(s).ok);assert.equal(s.cargo[q.good],3);assert.equal(s.gold,gold+q.fee+q.reimbursement);assert.ok(validateSave(s));
});

test('transport requires purchases at its source and enough cargo still aboard at delivery',()=>{
  const s=accept('transport'),q=s.guild.active;s.cargo[q.good]=q.quantity;
  dock(s,q.target);assert.equal(completeGuildJob(s).ok,false);
  dock(s,q.source);assert.ok(trade(s,q.good,5,true).ok);assert.equal(q.loaded,5);assert.ok(trade(s,q.good,q.quantity-5,true).ok);assert.equal(q.loaded,q.quantity);
  dock(s,q.target);assert.ok(trade(s,q.good,s.cargo[q.good],false).ok);assert.equal(completeGuildJob(s).ok,false);
  s.cargo[q.good]=q.quantity+2;const gold=s.gold;assert.ok(completeGuildJob(s).ok);assert.equal(s.cargo[q.good],2);assert.equal(s.gold,gold+q.fee+q.reimbursement);
});

test('debt collection requires the debtor encounter and a return to the issuing guild',()=>{
  const s=accept('debt'),q=s.guild.active,gold=s.gold;
  assert.equal(collectGuildDebt(s).ok,false);assert.equal(completeGuildJob(s).ok,false);
  dock(s,q.target);assert.ok(collectGuildDebt(s).ok);assert.equal(s.gold,gold,'The collection cannot be spent as ship money.');assert.equal(collectGuildDebt(s).ok,false);
  assert.equal(completeGuildJob(s).ok,false);const restored=migrateSave(structuredClone(s));assert.ok(restored.guild.active.collected);
  dock(restored,q.origin);assert.ok(completeGuildJob(restored).ok);assert.equal(restored.gold,gold+5000);assert.ok(validateSave(restored));
});

test('guild pirates occupy reachable water and only the contracted ship satisfies the bounty',()=>{
  const s=accept('pirate'),q=s.guild.active,enemy=guildPirate(s);
  assert.equal(onLand(enemy.x,enemy.y),false);const route=findRoute(s.position,enemy);assert.ok(route.length);let previous=s.position;for(const p of route){assert.ok(clearPassage(previous,p));previous=p;}
  assert.ok(pirates(s).some(e=>e.id===enemy.id));assert.equal(completeGuildJob(s).ok,false);
  s.port=null;startBattle(s,pirateTemplates[0]);s.battle.enemy.hull=1;battleAction(s,'fire');assert.equal(q.victory,false);
  assert.ok(plotCourse(s,{...enemy,id:undefined,enemy:enemy.id}).ok);assert.ok(validateSave(s));
  s.escapedUntil=0;s.supplyWarned=true;advance(s,2);assert.ok(s.battle,'The usual proximity encounter starts the bounty battle.');assert.equal(s.battle.enemy.id,enemy.id);
  const restored=migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(restored.battle);restored.battle.enemy.hull=1;const gold=restored.gold;battleAction(restored,'fire');
  assert.ok(restored.guild.active.victory);assert.equal(restored.gold,gold);assert.equal(guildPirate(restored),null);assert.equal(completeGuildJob(restored).ok,false);
  dock(restored,q.origin);assert.ok(completeGuildJob(restored).ok);assert.equal(restored.gold,gold+10000);assert.ok(validateSave(restored));
});

test('capturing the contracted pirate also earns a reportable victory',()=>{
  const s=accept('pirate'),enemy=guildPirate(s);s.port=null;startBattle(s,enemy);s.battle.enemy.hull=1;s.battle.enemy.crew=1;
  for(let i=0;s.battle&&i<10;i++)battleAction(s,'board');
  assert.equal(s.battle,null);assert.ok(s.guild.active.victory);assert.equal(s.ships.length,2);assert.ok(validateSave(s));
});

test('deadlines include shore leave, are inclusive, and penalize failure only once',()=>{
  const s=accept('letter'),q=s.guild.active;s.fame=100;s.day=q.due;dock(s,q.target);
  assert.ok(completeGuildJob(s).ok,'Delivery on the deadline is accepted.');
  const late=accept('debt');late.fame=100;const due=late.guild.active.due;assert.ok(waitInPort(late,Math.ceil(due)+1).ok);
  assert.equal(late.guild.active,null);assert.equal(late.guild.failed,1);assert.equal(late.fame,0);assert.equal(late.guild.history[0].outcome,'expired');
  checkGuildDeadline(late);assert.equal(late.guild.failed,1);assert.equal(completeGuildJob(late).ok,false);
  const sea=accept('letter');sea.day=sea.guild.active.due-.01;sea.fame=100;sea.port=null;sea.position={x:1,y:350};steer(sea,1,0);advance(sea,.1);
  assert.equal(sea.guild.active,null);assert.equal(sea.fame,75);assert.equal(sea.guild.failed,1);
});

test('abandoned offers stay closed this month and refresh next month without reusing old victories',()=>{
  const s=accept('pirate'),id=s.guild.active.id;s.fame=500;assert.ok(abandonGuildJob(s).ok);assert.equal(s.fame,350);assert.equal(guildPirate(s),null);
  assert.equal(acceptGuildJob(s,'pirate').ok,false);assert.ok(waitInPort(s,31).ok);assert.ok(acceptGuildJob(s,'pirate').ok);assert.notEqual(s.guild.active.id,id);assert.equal(s.guild.active.victory,false);
  const q=s.guild.active;assert.ok(plotCourse(s,{...q.enemy,id:undefined,enemy:q.enemy.id}).ok);s.day=q.due+.1;checkGuildDeadline(s);assert.equal(s.destination,null);assert.deepEqual(s.route,[]);assert.ok(validateSave(s));
});

test('old saves gain an empty ledger and malformed active assignments are rejected',()=>{
  const old=createGame(7);delete old.guild;const restored=migrateSave(structuredClone(old));assert.ok(restored.guild);assert.equal(restored.guild.active,null);
  for(const key of ['ships','gold','food','water','cargo','expedition','known','visited'])assert.deepEqual(restored[key],old[key]);
  for(const kind of Object.keys(guildTypes)){const s=accept(kind);assert.ok(validateSave(s),kind);assert.deepEqual(migrateSave(structuredClone(s)).guild,s.guild);}
  for(const mutate of [s=>s.guild=null,s=>s.guild.active.due=NaN,s=>s.guild.active.fee=Infinity,s=>s.guild.active.target='missing',s=>s.guild.active.quantity=-1,s=>s.guild.active.kind='constructor',s=>s.guild.active.due+=1,s=>s.guild.active.loaded=99,s=>s.guild.history=[null],s=>s.guild.used=[{}]]){
    const s=accept('transport');mutate(s);assert.equal(validateSave(s),false);assert.equal(migrateSave(s),null);
  }
  const pirate=accept('pirate');pirate.guild.active.enemy.x=NaN;assert.equal(validateSave(pirate),false);
});

test('trading ports offer subsets of job types, with no supply-port guilds',()=>{
  const s=createGame(7);let open=0;
  for(const {id} of ports.filter(p=>!p.supplyOnly)){
    dock(s,id);const jobs=availableGuildJobs(s);if(!jobs.length)continue;open++;
    assert.ok(jobs.every(q=>Object.hasOwn(guildTypes,q.kind)),id);assert.equal(new Set(jobs.map(q=>q.kind)).size,jobs.length);
    const pirate=jobs.find(q=>q.kind==='pirate');if(pirate)assert.equal(onLand(pirate.enemy.x,pirate.enemy.y),false,id);
  }
  assert.ok(open>0&&open<ports.filter(p=>!p.supplyOnly).length);
  const supply=ports.find(p=>p.supplyOnly);dock(s,supply.id);assert.deepEqual(availableGuildJobs(s),[]);assert.equal(acceptGuildJob(s,'letter').ok,false);
});

test('monthly work stays fixed across visits and saves, rerolls at the month boundary, and preserves accepted orders',()=>{
  const s=createGame(46),offers=availableGuildJobs(s),seen=[...s.seen],seed=s.seed;
  assert.deepEqual(offers.map(q=>q.kind),['letter']);assert.equal(s.seed,seed);assert.deepEqual(s.seen,seen);
  s.seed=123456;dock(s,'seville');availableGuildJobs(s);dock(s,'lisbon');s.day=29.5;
  assert.deepEqual(availableGuildJobs(s),offers);assert.deepEqual(availableGuildJobs(migrateSave(structuredClone(s))),offers);
  assert.ok(acceptGuildJob(s,'letter').ok);const order=structuredClone(s.guild.active);
  assert.ok(waitInPort(s,1).ok);assert.equal(s.day,30);assert.deepEqual(s.guild.active,order);assert.deepEqual(availableGuildJobs(s),[]);
  assert.ok(abandonGuildJob(s).ok);
  for(const kind of Object.keys(guildTypes))assert.equal(acceptGuildJob(s,kind).ok,false);
  dock(s,'seville');availableGuildJobs(s);dock(s,'lisbon');
  assert.deepEqual(availableGuildJobs(s),[]);assert.deepEqual(availableGuildJobs(migrateSave(structuredClone(s))),[]);
});

test('each job type appears about four percent of port-months, with mixed boards and separate monthly and voyage rolls',()=>{
  const trading=ports.filter(p=>!p.supplyOnly),passage=(start,end)=>({route:[end],days:2}),patterns=[];
  for(const seed of [7,8]){
    const s=createGame(seed),pattern=[],counts=Object.fromEntries(Object.keys(guildTypes).map(kind=>[kind,0]));let open=0,mixed=0;
    for(let month=0;month<24;month++){
      s.day=(Date.UTC(1522,3+month,1)-Date.UTC(1522,3,1))/86400000;
      for(const p of trading){
        dock(s,p.id);const jobs=guildJobs(s,passage);
        pattern.push(jobs.map(q=>q.kind));if(jobs.length)open++;if(jobs.length>1&&jobs.length<5)mixed++;
        for(const q of jobs)counts[q.kind]++;
      }
    }
    for(const [kind,count]of Object.entries(counts)){const rate=count/pattern.length;assert.ok(rate>.03&&rate<.05,`${kind} rate was ${rate}.`);}
    const rate=open/pattern.length;assert.ok(rate>.15&&rate<.22,`Nonempty board rate was ${rate}.`);assert.ok(mixed>0);
    assert.notDeepEqual(pattern.slice(0,trading.length),pattern.slice(trading.length,trading.length*2));
    assert.equal(s.seed,seed);patterns.push(pattern);
  }
  assert.notDeepEqual(patterns[0],patterns[1]);
});
