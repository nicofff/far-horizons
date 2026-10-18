import test from 'node:test';
import assert from 'node:assert/strict';
import { createMusic } from '../music.js';
import { xy } from '../data.js';

function audioHarness(t){
  const contexts=[],intervals=new Map(),timeouts=new Map(),prefs=new Map();let id=0;
  class Param{
    value=0;
    setValueAtTime(value){this.value=value;}
    linearRampToValueAtTime(value){this.value=value;}
    exponentialRampToValueAtTime(value){this.value=value;}
    setTargetAtTime(value){this.value=value;}
    cancelScheduledValues(){}
  }
  class AudioNode{
    constructor(ctx){this.ctx=ctx;this.gain=new Param();this.frequency=new Param();this.detune=new Param();this.Q=new Param();this.connections=new Set();}
    connect(node){this.connections.add(node);return node;}
    disconnect(node){if(node&&!this.connections.delete(node))throw Error('Disconnected from the wrong audio graph');if(!node)this.connections.clear();}
    start(time=0){assert.ok(Number.isFinite(time)&&time>=0);this.ctx.starts++;}
    stop(){}
  }
  class AudioContext{
    constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=20;this.starts=0;this.resumes=0;this.destination=new AudioNode(this);contexts.push(this);}
    createGain(){return new AudioNode(this);}
    createWaveShaper(){return new AudioNode(this);}
    createBiquadFilter(){return new AudioNode(this);}
    createOscillator(){const node=new AudioNode(this);(this.oscillators??=[]).push(node);return node;}
    createBufferSource(){return new AudioNode(this);}
    createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length)};}
    change(state){this.state=state;this.onstatechange?.();}
    async resume(){this.resumes++;if(this.rejectResume)throw Error('Audio temporarily unavailable');if(this.state==='closed')throw Error('Closed audio context');this.change('running');}
    async suspend(){this.change('suspended');}
    async close(){this.change('closed');}
  }
  const globals={AudioContext,localStorage:{getItem:key=>prefs.get(key),setItem:(key,value)=>prefs.set(key,value)},setInterval:fn=>{intervals.set(++id,fn);return id;},clearInterval:key=>intervals.delete(key),setTimeout:fn=>{timeouts.set(++id,fn);return id;}};
  for(const [key,value] of Object.entries(globals)){
    const old=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
    t.after(()=>old?Object.defineProperty(globalThis,key,old):delete globalThis[key]);
  }
  return {contexts,intervals,prefs,tick(time){const ctx=contexts.at(-1);ctx.currentTime=time;for(const fn of intervals.values())fn();},suspend(){const callbacks=[...timeouts.values()];timeouts.clear();for(const fn of callbacks)fn();}};
}

const location={...xy(-9.15,38.72),port:'lisbon'};

test('music off/on replaces the audio output and old notes keep their own modulation graph',async t=>{
  const h=audioHarness(t),music=createMusic();music.update(location);music.unlock();h.tick(.1);
  const first=h.contexts[0],note=first.oscillators.find(node=>node.onended);assert.ok(note);
  music.setEnabled(false);assert.equal(first.state,'closed');assert.equal(h.intervals.size,0);
  music.unlock();assert.equal(h.contexts.length,1,'muted controls do not allocate an audio context');
  music.setEnabled(true);const next=h.contexts[1];assert.equal(next.state,'running');assert.equal(h.intervals.size,1);
  assert.doesNotThrow(()=>note.onended());h.tick(.1);assert.ok(next.starts>1);
  assert.equal(JSON.parse(h.prefs.get('far-horizons-music')).enabled,true);
});

test('closed and interrupted contexts recover without leaving orphan schedulers',async t=>{
  const h=audioHarness(t),music=createMusic();music.update(location);music.unlock();await Promise.resolve();await Promise.resolve();
  const first=h.contexts[0],resumes=first.resumes;first.change('interrupted');
  assert.equal(first.state,'running');assert.equal(first.resumes,resumes+1);
  await first.close();assert.equal(h.intervals.size,0);
  music.unlock();assert.equal(h.contexts.length,2);assert.equal(h.contexts[1].state,'running');assert.equal(h.intervals.size,1);
});

test('hidden audio resumes, obsolete suspension timers cannot stop a replacement, and rejected resumes can retry',async t=>{
  const h=audioHarness(t),music=createMusic();music.update(location);music.unlock();await Promise.resolve();await Promise.resolve();
  const first=h.contexts[0];music.setHidden(true);h.suspend();assert.equal(first.state,'suspended');
  first.rejectResume=true;music.setHidden(false);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(first.state,'suspended');first.rejectResume=false;music.unlock();assert.equal(first.state,'running');
  music.setHidden(true);music.setEnabled(false);music.setHidden(false);music.setEnabled(true);h.suspend();
  assert.equal(h.contexts.at(-1).state,'running');assert.equal(h.intervals.size,1);
});

test('long scheduler stalls skip expired notes and continue into another song',t=>{
  const h=audioHarness(t),heard=[],music=createMusic({heard:()=>heard,onTune:tune=>heard.push(tune.id)});
  music.update(location);music.unlock();h.tick(.1);
  const ctx=h.contexts[0],before=ctx.starts;h.tick(60);
  assert.ok(ctx.starts-before<30,'missed notes cannot create a burst of audio nodes');
  h.tick(600);assert.ok(heard.length>=2,'a long interruption still hands over to a new song');
  const resumed=ctx.starts;for(let time=600.025;time<601;time+=.025)h.tick(time);assert.ok(ctx.starts>resumed);
});
