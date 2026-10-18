import { performance } from 'node:perf_hooks';
import { createGame, steer, advance, reveal } from '../engine.js';

const frames=600,results=[];
for(const charted of [100,10000,40000,100000]){
  const s=createGame(7);s.port=null;s.position={x:1,y:350};s.seen=Array.from({length:charted},(_,i)=>i);
  s.escapedUntil=10000;s.lastEvent=0;steer(s,1,0);
  for(let i=0;i<60;i++)advance(s,.003);
  let start=performance.now();for(let i=0;i<frames;i++)advance(s,.003);const simulation=performance.now()-start;
  start=performance.now();for(let i=0;i<frames;i++)reveal(s);const lookout=performance.now()-start;
  results.push({charted,simulationMsPerTick:(simulation/frames).toFixed(4),lookoutMsPerTick:(lookout/frames).toFixed(4)});
}
console.table(results);
