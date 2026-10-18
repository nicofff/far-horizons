import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ports, goods, shipTypes, xy } from '../data.js';
import { createGame, reveal, migrateSave, resupply, supplyDays, marketCatalog, marketGoods, shipyardCatalog, trade, MAP_REVISION } from '../engine.js';
import { clearPassage } from '../terrain.js';

const reference=JSON.parse(readFileSync(new URL('../economy/original-ports.json',import.meta.url),'utf8'));

test('the complete 100 trading and 30 supply port roster is present once, alongside two prototype anchorages',()=>{
  const roster=readFileSync(new URL('../geography/original-ports.csv',import.meta.url),'utf8').trim().split(/\r?\n/).slice(1).map(line=>line.split(','));
  assert.equal(ports.length,132);assert.equal(new Set(ports.map(p=>p.id)).size,132);
  assert.equal(ports.filter(p=>!p.supplyOnly).length,100);assert.equal(ports.filter(p=>p.supplyOnly).length,32);
  assert.deepEqual(ports.filter(p=>!p.rosterName).map(p=>p.id).sort(),['azores','cape-verde']);
  for(const [name,type] of roster){
    const matches=ports.filter(p=>p.rosterName===name);assert.equal(matches.length,1,name);
    assert.equal(!!matches[0].supplyOnly,type==='supply',name);
  }
});

test('every original trading port matches the sourced development, specialty and shipyard record',()=>{
  assert.equal(reference.length,100);assert.equal(new Set(reference.map(p=>p.index)).size,100);
  for(const r of reference){
    const p=ports.find(p=>p.originalIndex===r.index);assert.ok(p,r.name);
    assert.deepEqual([p.economy,p.industry,p.market,p.shipyard],[r.economy,r.industry,r.market,r.shipyard],r.name);
    assert.equal(p.specialty?goods[p.specialty].name:null,r.specialty,r.name);
    assert.equal(p.specialtyPrice,r.price,r.name);assert.equal(p.specialtyEconomy,r.requirement,r.name);
  }
});

test('the full world makes every original commodity and ship blueprint available through development',()=>{
  const s=createGame(),availableGoods=new Set(),availableShips=new Set();
  for(const p of ports.filter(p=>!p.supplyOnly)){
    if(!p.capital)s.development[p.id]={economy:1000,industry:1000,pendingEconomy:0,pendingIndustry:0};
    marketGoods(s,p).forEach(id=>availableGoods.add(id));shipyardCatalog(s,p).filter(t=>t.available).forEach(t=>availableShips.add(t.id));
  }
  for(const [id,g] of Object.entries(goods))if(!g.legacy)assert.ok(availableGoods.has(id),id);
  for(const [id,t] of Object.entries(shipTypes))if(!t.legacyOnly)assert.ok(availableShips.has(id),id);
});

test('every supply anchorage provisions the fleet without acquiring a market or shipyard',()=>{
  for(const p of ports.filter(p=>p.supplyOnly)){
    const s=createGame();s.port=p.id;s.position={x:p.x,y:p.y};s.food=0;s.water=0;
    assert.ok(resupply(s,25).ok,p.id);assert.equal(supplyDays(s),25,p.id);
    assert.deepEqual(marketCatalog(s,p),[]);assert.deepEqual(shipyardCatalog(s,p),[]);
    s.cargo.fish=1;assert.equal(trade(s,'fish',1,false).ok,false,p.id);
  }
});

test('new ports remain local discoveries and existing voyages retain their progress',()=>{
  const s=createGame();s.mapRevision=1;s.gold=12345;s.cargo.fish=7;
  const restored=migrateSave(structuredClone(s));assert.equal(restored.gold,12345);assert.deepEqual(restored.cargo,s.cargo);
  assert.equal(restored.mapRevision,MAP_REVISION);assert.equal(restored.paused,true);
  assert.equal(restored.known.includes('ternate'),false);assert.equal(restored.known.includes('tiksi'),false);
  const ternate=ports.find(p=>p.id==='ternate');restored.port=null;restored.position={x:ternate.x,y:ternate.y};reveal(restored);
  assert.ok(restored.known.includes('ternate'));assert.equal(restored.known.includes('tiksi'),false);
  assert.ok(Math.hypot(restored.position.x-xy(127.36302,.79296).x,restored.position.y-xy(127.36302,.79296).y)<3);
});

test('revision-one voyages recalculate their route without losing fleet, cargo or destination',()=>{
  const s=createGame();s.mapRevision=1;s.port=null;s.position=xy(19,35);s.destination='venice';s.route=[{x:960,y:260}];s.cargo.fish=4;
  const restored=migrateSave(structuredClone(s)),venice=ports.find(p=>p.id==='venice');
  assert.equal(restored.mapRevision,MAP_REVISION);assert.equal(restored.destination,'venice');assert.deepEqual(restored.ships,s.ships);
  assert.deepEqual(restored.cargo,s.cargo);assert.equal(restored.gold,s.gold);assert.deepEqual(restored.route.at(-1),{x:venice.x,y:venice.y});
  let previous=restored.position;for(const point of restored.route){assert.ok(clearPassage(previous,point));previous=point;}
});
