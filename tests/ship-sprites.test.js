import test from 'node:test';
import assert from 'node:assert/strict';
import { shipTypes } from '../data.js';
import { drawShip, shipSprite, shipSprites } from '../ship-sprites.js';

test('every buildable ship has distinct art rather than using the fallback',()=>{
  const types=Object.keys(shipTypes).filter(id=>!shipTypes[id].legacyOnly),art=new Set();
  for(const type of types){
    assert.ok(Object.hasOwn(shipSprites,type),type);
    const rows=shipSprite(type);assert.equal(rows.length,40,type);
    assert.ok(rows.every(row=>row.length===48),type);
    art.add(rows.join('\n'));
  }
  assert.equal(art.size,types.length);
  assert.equal(shipSprite('caravel'),shipSprite('caravela-latina'));
  assert.notEqual(shipSprite('barque'),shipSprite('caravel'));
  assert.equal(shipSprite('missing'),shipSprite('caravela-latina'));
});

function render(type,options={}){
  const pixels=[],transforms=[];
  const ctx={save(){},restore(){},translate(...args){transforms.push(args);},scale(...args){transforms.push(args);},fillRect(x,y,w,h){pixels.push({x,y,w,h,color:this.fillStyle});}};
  drawShip(ctx,10.4,20.4,{type,...options});return {pixels,transforms};
}

test('turning and hostile flags preserve the identifying ship design',()=>{
  for(const type of Object.keys(shipTypes)){
    const normal=render(type),flipped=render(type,{flip:true}),enemy=render(type,{enemy:true});
    assert.deepEqual(flipped.pixels,normal.pixels.map(p=>({...p,x:-p.x-1})),type);
    assert.deepEqual(enemy.pixels.map(({color,...p})=>p),normal.pixels.map(({color,...p})=>p),type);
    assert.notDeepEqual(enemy.pixels,normal.pixels,type);
  }
  assert.deepEqual(render('galleon',{small:true,bob:1}).transforms,[[10,21],[.6,.6]]);
});
