import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { xy, WORLD } from '../data.js';
import { terrainMask, rasterWidth, rasterHeight } from '../terrain.js';
import { biomeAt, biomeMask, biomeWidth, biomeHeight, biomeCell } from '../biomes.js';

test('the sourced biome layer distinguishes arid, tropical, temperate and polar regions',()=>{
  for(const [name,lon,lat,expected] of [
    ['Sahara',10,28,13],['Niger delta mangroves',6.5,4.5,14],['Niger delta forest',7,5.5,1],
    ['Sahel',0,14,7],['England',-1,52,4],['Portugal',-9,39,12],['Norway',10,63,6],
    ['Greenland ice sheet',-42,72,15],['Siberian tundra',128,71.5,11],['Amazon',-55,-3,1],
  ]){const point=xy(lon,lat);assert.equal(biomeAt(point.x,point.y),expected,name);}
});

test('every land cell has a biome and the visual layer uses the existing navigation terrain',()=>{
  assert.equal(biomeWidth*biomeCell,WORLD.width);assert.equal(biomeHeight*biomeCell,WORLD.height);
  assert.equal(biomeMask.length,biomeWidth*biomeHeight);
  assert.deepEqual([...new Set(biomeMask)].sort((a,b)=>a-b),Array.from({length:16},(_,i)=>i));
  let uncovered=0;
  for(let y=0;y<rasterHeight;y++)for(let x=0;x<rasterWidth;x++){
    if(terrainMask[y*rasterWidth+x]&&!biomeMask[(y>>1)*biomeWidth+(x>>1)])uncovered++;
  }
  assert.equal(uncovered,0);
  const manifest=JSON.parse(readFileSync(new URL('../geography/biomes-manifest.json',import.meta.url),'utf8'));
  const digest=createHash('sha256').update(readFileSync(new URL('../assets/world-terrain.js',import.meta.url))).digest('hex');
  assert.equal(manifest.terrainSha256,digest,'Rebuild the visual biome layer after changing navigation terrain.');
});
