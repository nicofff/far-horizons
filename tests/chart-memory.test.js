import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, reveal, recorded, migrateSave, validateSave } from '../engine.js';
import { signContract, learnSkill, reportCharts, chartReport } from '../specialists.js';

function sailTo(s,x,y){s.port=null;s.position={x,y};reveal(s);}

test('movement appends new chart squares without copying a well-explored chart',()=>{
  const s=createGame(7);s.seen=Array.from({length:90000},(_,i)=>i);const chart=s.seen,prefix=[...chart];
  sailTo(s,1,350);assert.equal(s.seen,chart);assert.deepEqual(s.seen.slice(0,prefix.length),prefix);assert.ok(s.seen.length>prefix.length);
  const length=s.seen.length;for(let i=0;i<200;i++)reveal(s);
  assert.equal(s.seen,chart);assert.equal(s.seen.length,length);assert.equal(new Set(s.seen).size,length);
  const iterate=chart[Symbol.iterator];chart[Symbol.iterator]=()=>{throw new Error('A movement tick rescanned the chart history.');};
  try{for(let i=0;i<200;i++){s.position.x+=.001;reveal(s);recorded(s,s.position);}}finally{delete chart[Symbol.iterator];}
  assert.equal(chart[Symbol.iterator],iterate);
  sailTo(s,25,350);assert.equal(s.seen,chart);assert.ok(s.seen.length>length);assert.ok(recorded(s,{x:25,y:350}));assert.ok(recorded(s,{x:1799.9,y:350}));
});

test('replacing or importing chart records rebuilds only their derived lookup',()=>{
  const s=createGame(7);s.expedition.charted=0;s.seen=[0];assert.ok(recorded(s,{x:1,y:1}));
  s.seen=[1];assert.equal(recorded(s,{x:1,y:1}),false);assert.ok(recorded(s,{x:3,y:1}));
  s.seen.push(2);assert.ok(recorded(s,{x:5,y:1}));s.seen.pop();assert.equal(recorded(s,{x:5,y:1}),false);
  sailTo(s,1,350);const restored=migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(restored);assert.ok(validateSave(restored));assert.ok(recorded(restored,{x:1799.9,y:350}));
  s.seen=[];reveal(s);assert.equal(recorded(s,{x:3,y:1}),false);assert.ok(recorded(restored,{x:3,y:1}),'Separate voyages do not share a mutable lookup.');
});

test('old duplicate records are normalized without changing first-observation order',()=>{
  const s=createGame(7);s.seen=[4,2,4,6,2];reveal(s);assert.deepEqual(s.seen.slice(0,3),[4,2,6]);assert.equal(new Set(s.seen).size,s.seen.length);
});

test('cartographer reporting still pays each appended square only once after save restoration',()=>{
  const s=createGame(7);s.port='amsterdam';s.gold=100000;
  assert.ok(learnSkill(s,'mercator').ok);assert.ok(signContract(s,'mercator').ok);
  sailTo(s,1,350);const first=chartReport(s);assert.ok(first.squares>0);s.port='amsterdam';const gold=s.gold;assert.ok(reportCharts(s,'mercator').ok);assert.equal(s.gold,gold+first.gold);
  sailTo(s,30,350);const next=chartReport(s);assert.ok(next.squares>0);
  s.port=null;const restored=migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(restored);assert.equal(chartReport(restored).squares,next.squares);
  restored.port='amsterdam';assert.ok(reportCharts(restored,'mercator').ok);assert.equal(chartReport(restored).squares,0);const paid=restored.gold;reportCharts(restored,'mercator');assert.equal(restored.gold,paid);
});
