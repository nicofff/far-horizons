import test from 'node:test';
import assert from 'node:assert/strict';
import { createCachedArt } from '../cached-art.js';

function harness(){
  const canvases=[],paints=[],draws=[];
  const create=()=>{const image={getContext:()=>({image})};canvases.push(image);return image;};
  const art=createCachedArt({text:(...args)=>paints.push(['text',...args]),drawShip:(...args)=>paints.push(['ship',...args])},create);
  return {art,canvases,paints,draws,ctx:{drawImage:(...args)=>draws.push(args)}};
}

test('labels reuse painted pixels while positions change, and preserve color and accents',()=>{
  const h=harness();h.art.text(h.ctx,'CAFÉ',10.4,20.7,'#fff');h.art.text(h.ctx,'CAFÉ',11.7,20.2,'#fff');
  assert.equal(h.paints.length,1);assert.equal(h.canvases[0].width,24);assert.equal(h.canvases[0].height,8);
  assert.deepEqual(h.draws.map(draw=>draw.slice(1)),[[10,21],[12,20]]);
  h.art.text(h.ctx,'CAFÉ',10,20,'#000');assert.equal(h.paints.length,2);
  h.art.text(h.ctx,'CAFÉ',10,20,'#000',2);assert.equal(h.paints.length,3);assert.equal(h.canvases.length,2);
  h.art.text(h.ctx,'',10,20);assert.equal(h.paints.length,3);
});

test('ship art reuses pixels while bobbing and moving, with distinct flags, hulls and headings',()=>{
  const h=harness();h.art.drawShip(h.ctx,50.4,60.7,{type:'galleon'});h.art.drawShip(h.ctx,51.7,60.7,{type:'galleon',bob:1});
  assert.equal(h.paints.length,1);assert.deepEqual(h.draws.map(draw=>draw.slice(1)),[[26,36],[28,37]]);
  for(const options of [{type:'galleon',enemy:true},{type:'galleon',flip:true},{type:'dhow'}])h.art.drawShip(h.ctx,50,60,options);
  assert.equal(h.paints.length,4);assert.ok(h.canvases.every(c=>c.width===48&&c.height===40));
  h.art.drawShip(h.ctx,50,60,{type:'dhow',small:true});assert.equal(h.paints.length,5);assert.equal(h.canvases.length,4);
});

test('changing HUD values cannot grow the label cache without a bound',()=>{
  const h=harness();for(let i=0;i<129;i++)h.art.text(h.ctx,String(i),0,0,'#fff');
  h.art.text(h.ctx,'128',0,0,'#fff');assert.equal(h.paints.length,129);
  h.art.text(h.ctx,'0',0,0,'#fff');assert.equal(h.paints.length,130);
});
