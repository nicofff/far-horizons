import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationLoop } from '../simulation-loop.js';
import { createGame, steer, advance, plotCourse, rationRate, supplyDays, acceptGuildJob, validateSave } from '../engine.js';

function harness({background=false,paused=false,step,foregroundInterval=0}={}){
  let time=0,hidden=background,idle=paused,id=0;const frames=new Map(),timers=new Map(),ticks=[];
  const loop=createSimulationLoop((seconds,now)=>{ticks.push(seconds);step?.(seconds,now);},{idle:()=>idle,hidden:()=>hidden,now:()=>time,foregroundInterval,
    requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:key=>frames.delete(key),
    setTimer:(fn,delay)=>{timers.set(++id,{fn,delay});return id;},clearTimer:key=>timers.delete(key)});
  return {loop,frames,timers,ticks,get time(){return time;},setIdle(value){idle=value;},
    visibility(value,elapsed=0){time+=elapsed;hidden=value;loop.visibilityChanged();},
    timer(elapsed=1000){time+=elapsed;const entry=timers.entries().next().value;assert.ok(entry,'A timer is scheduled.');timers.delete(entry[0]);entry[1].fn();},
    frame(elapsed=16){time+=elapsed;const entry=frames.entries().next().value;assert.ok(entry,'An animation frame is scheduled.');frames.delete(entry[0]);entry[1](time);},
  };
}
function voyage(){const s=createGame(7);s.port=null;s.position={x:1,y:350};s.escapedUntil=10000;s.lastEvent=0;s.speed=4;steer(s,1,0);return s;}
function sailingHarness(s){
  let h;h=harness({background:true,step:seconds=>{advance(s,seconds*s.speed*.045);h.setIdle(s.paused||s.battle||s.lost);}});h.loop.wake();return h;
}

test('background sailing uses a single one-second timer and preserves selected speed and supplies',()=>{
  const s=voyage(),food=s.food,water=s.water,h=sailingHarness(s);
  for(let i=0;i<10;i++){assert.equal(h.frames.size,0);assert.equal(h.timers.size,1);assert.equal([...h.timers.values()][0].delay,1000);h.timer();}
  assert.ok(Math.abs(s.day-1.8)<1e-10);assert.ok(s.position.x>1);assert.ok(Math.abs(s.food-(food-1.8*rationRate(s)))<1e-10);assert.ok(Math.abs(s.water-(water-1.8*rationRate(s)))<1e-10);
  assert.ok(validateSave(s));h.loop.stop();assert.equal(h.timers.size,0);
});

test('foreground simulation runs at thirty ticks per second independent of display refresh and wakes for commands',()=>{
  const h=harness({foregroundInterval:1000/30});h.loop.wake();h.frame(0);
  assert.equal(h.frames.size,0);assert.equal(h.timers.size,1);
  for(let i=0;i<30;i++)h.timer(1000/30);
  assert.equal(h.frames.size,0);assert.equal(h.ticks.length,31);
  assert.ok(Math.abs(h.ticks.reduce((sum,seconds)=>sum+seconds,0)-1)<1e-10);
  h.loop.wake();assert.equal(h.timers.size,0);assert.equal(h.frames.size,1);h.frame(8);
  assert.ok(Math.abs(h.ticks.at(-1)-.008)<1e-10);
  h.visibility(true);assert.equal(h.frames.size,0);assert.equal([...h.timers.values()][0].delay,1000);
  h.setIdle(true);h.timer();assert.equal(h.timers.size,0);h.loop.stop();
});

test('tab transitions settle elapsed background time exactly once and cancel obsolete callbacks',()=>{
  const h=harness();h.loop.wake();h.frame(100);assert.equal(h.frames.size,1);
  h.visibility(true,100);assert.equal(h.frames.size,0);assert.equal(h.timers.size,1);
  h.timer(5000);assert.equal(h.ticks.at(-1),5);
  h.visibility(false,2000);assert.equal(h.timers.size,0);assert.equal(h.frames.size,1);
  assert.ok(Math.abs(h.ticks.reduce((n,x)=>n+x,0)-7.2)<1e-10);
  h.frame(16);assert.equal(h.ticks.at(-1),.016);h.loop.stop();
});

test('delayed background timers catch up, while foreground frame stalls retain their small cap',()=>{
  const s=voyage(),h=sailingHarness(s);h.timer(60000);assert.ok(Math.abs(s.day-10.8)<1e-8);assert.equal(h.frames.size,0);
  h.loop.stop();const foreground=harness();foreground.loop.wake();foreground.frame(60000);assert.equal(foreground.ticks[0],.15);foreground.loop.stop();
});

test('paused background voyages sleep and never charge paused time when resumed',()=>{
  const h=harness({background:true,paused:true});h.loop.wake();assert.equal(h.timers.size,0);assert.equal(h.frames.size,0);
  h.visibility(false,60000);assert.equal(h.ticks.at(-1),0);h.visibility(true,60000);assert.equal(h.ticks.at(-1),0);assert.equal(h.timers.size,0);
  h.setIdle(false);h.loop.wake();h.timer(1000);assert.equal(h.ticks.at(-1),1);
  h.setIdle(true);h.timer(1000);assert.equal(h.timers.size,0);h.visibility(false,60000);assert.equal(h.ticks.at(-1),0);h.loop.stop();
});

test('background catch-up stops at landfall and leaves the fleet paused for the harbor menu',()=>{
  const s=createGame(7);s.speed=16;s.lastEvent=0;assert.ok(plotCourse(s,'madeira').ok);const h=sailingHarness(s);h.timer(600000);
  assert.equal(s.port,'madeira');assert.equal(s.paused,true);assert.ok(s.day>0&&s.day<10);assert.equal(h.timers.size,0);assert.equal(h.frames.size,0);
  const day=s.day;h.visibility(false,60000);assert.equal(s.day,day);assert.ok(validateSave(s));h.loop.stop();
});

test('low supplies and pirate encounters still interrupt hidden sailing immediately',()=>{
  const s=voyage();s.food=s.water=10.1*rationRate(s);const h=sailingHarness(s);h.timer(60000);
  assert.equal(s.paused,true);assert.ok(supplyDays(s)<=10);assert.ok(s.day<1);assert.equal(h.timers.size,0);h.loop.stop();
  const battle=createGame(7);battle.speed=16;assert.ok(acceptGuildJob(battle,'pirate').ok);const enemy=battle.guild.active.enemy;assert.ok(plotCourse(battle,{...enemy,id:undefined,enemy:enemy.id}).ok);
  const b=sailingHarness(battle);b.timer(60000);assert.equal(battle.battle?.enemy.id,enemy.id);assert.equal(battle.paused,true);assert.equal(b.timers.size,0);assert.ok(validateSave(battle));b.loop.stop();
});

test('commands issued during a simulation step do not create duplicate background timers',()=>{
  let h;h=harness({background:true,step:()=>h.loop.wake()});h.loop.wake();h.loop.wake();assert.equal(h.timers.size,1);
  for(let i=0;i<5;i++){h.timer();assert.equal(h.timers.size,1);assert.equal(h.frames.size,0);}h.loop.stop();
});
