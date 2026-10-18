import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { xy, WORLD } from '../data.js';
import { elevationAt, mountainAt, reliefMask, reliefWidth, reliefHeight, reliefCell } from '../relief.js';

test('sourced relief places mountains across continents independently of vegetation',()=>{
  for(const [name,lon,lat,minimum] of [
    ['Andes above Callao',-76.4,-12.1,2500],['Alps',8,46.5,1500],['Japanese Alps',137.5,36,1000],
    ['Atlas',-7.5,31.2,1500],['Rockies',-114,49,1000],['Norwegian mountains',6.5,61.5,750],['Himalayas',86,28,3000],
  ]){
    const {x,y}=xy(lon,lat);assert.ok(elevationAt(x,y)>=minimum,name);assert.ok(mountainAt(x,y)>0,name);
  }
  for(const [name,lon,lat] of [['Amazon',-55,-3],['Netherlands',5.2,52.2],['Sahara plateau',10,28],['Tibetan plateau',83,33],['Atlantic',-30,0]]){
    const {x,y}=xy(lon,lat);assert.equal(mountainAt(x,y),0,`${name} does not gain spurious peaks`);
  }
  const tibet=xy(83,33);assert.ok(elevationAt(tibet.x,tibet.y)>4000,'Elevation alone does not turn a flat plateau into jagged mountains.');
});

test('the compact relief raster covers the world and matches its pinned build manifest',()=>{
  assert.equal(reliefWidth*reliefCell,WORLD.width);assert.equal(reliefHeight*reliefCell,WORLD.height);
  assert.equal(reliefMask.length,reliefWidth*reliefHeight);assert.ok(reliefMask.length<2.4e6);
  assert.deepEqual([...new Set(reliefMask.map(value=>value&3))].sort(),[0,1,2,3]);
  const manifest=JSON.parse(readFileSync(new URL('../geography/relief-manifest.json',import.meta.url),'utf8'));
  const digest=createHash('sha256').update(readFileSync(new URL('../assets/world-relief.js',import.meta.url))).digest('hex');
  assert.equal(manifest.assetSha256,digest);assert.equal(manifest.source.name,'SRTM15 Earth Relief v2.7 at 10 arc minutes');
  for(const [x,y] of [[-1,0],[0,-1],[WORLD.width,0],[0,WORLD.height]]){assert.equal(elevationAt(x,y),0);assert.equal(mountainAt(x,y),0);}
});
