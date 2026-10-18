import test from 'node:test';
import assert from 'node:assert/strict';
import { xy, ports } from '../data.js';
import { musicRegions, regionAt, tunes, tuneById, composeTune, LOOP_STEPS } from '../music-score.js';
import { createGame, migrateSave } from '../engine.js';

const portRegion=id=>{const p=ports.find(p=>p.id===id);return regionAt(p.x,p.y).id;};

test('harbors play the music of their sea',()=>{
  for(const [port,region] of [
    ['lisbon','iberia'],['madeira','iberia'],['bordeaux','iberia'],['seville','iberia'],['ceuta','mediterranean'],['venice','mediterranean'],['istanbul','mediterranean'],
    ['hamburg','north'],['stockholm','north'],['hekla','arctic'],['elmina','westafrica'],['luanda','westafrica'],['cape-town','swahili'],['mombasa','swahili'],
    ['aden','arabian'],['cairo','arabian'],['hormuz','arabian'],['calicut','india'],['ceylon','india'],['malacca','seasia'],['ternate','seasia'],
    ['nagasaki','eastasia'],['macau','eastasia'],['havana','caribbean'],['caracas','caribbean'],['rio-de-janeiro','southamerica'],['callao','southamerica'],
    ['cape-cod','northamerica'],['tahiti','pacific'],['geelong','pacific'],['dikson','arctic'],
  ])assert.equal(portRegion(port),region,port);
});

test('every harbor belongs to a coastal region and mid-ocean waters have their own music',()=>{
  for(const p of ports)assert.notEqual(regionAt(p.x,p.y).id,'openocean',p.id);
  for(const [lon,lat] of [[-40,20],[-40,45],[80,-30]]){const p=xy(lon,lat);assert.equal(regionAt(p.x,p.y).id,'openocean',`${lon},${lat}`);}
  assert.ok(musicRegions.every(r=>r.id==='openocean'||ports.some(p=>regionAt(p.x,p.y).id===r.id)),'each coastal region has a harbor');
});

test('each region has three distinct songs',()=>{
  for(const r of musicRegions)assert.equal(tunes.filter(t=>t.region===r.id).length,3,r.id);
  assert.equal(new Set(tunes.map(t=>t.id)).size,tunes.length);
  assert.equal(new Set(tunes.map(t=>t.name)).size,tunes.length);
});

test('songs are composed deterministically within their regional scale',()=>{
  for(const {id} of tunes){
    const tune=composeTune(id);
    assert.deepEqual(composeTune(id),tune,id);
    assert.ok(tune.melody.length>=12,`${id} has a melody`);
    for(const part of [tune.melody,tune.bass])for(const n of part){
      assert.ok(n.step>=0&&n.step<LOOP_STEPS&&n.len>0,id);
      assert.ok(tune.scale.includes(((n.note-tune.root)%12+12)%12),`${id} note ${n.note} is in scale`);
    }
    for(const lane of Object.values(tune.drums))assert.equal(lane.length,LOOP_STEPS);
    assert.equal(tune.melody.at(-1).note%12,(tune.root+12)%12,`${id} resolves to the tonic`);
  }
  assert.notDeepEqual(composeTune('iberia-1').melody,composeTune('iberia-2').melody);
});

test('the songbook is saved and old saves gain an empty one',()=>{
  const game=createGame(7);assert.deepEqual(game.songbook,[]);
  game.songbook=['iberia-1','not-a-song','iberia-1'];
  assert.deepEqual(migrateSave(structuredClone(game)).songbook,['iberia-1']);
  const old=createGame(7);delete old.songbook;assert.deepEqual(migrateSave(old).songbook,[]);
  assert.ok(tuneById('iberia-1'));
});
