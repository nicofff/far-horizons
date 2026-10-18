import { composeTune, regionAt, regionTunes, tuneById, LOOP_STEPS, STEPS_PER_BAR, SECTIONS } from './music-score.js';

const PREFS_KEY='far-horizons-music',LOOKAHEAD=.25,FADE=3.5,REGION_SETTLE=4000;
const SEA_TONE=4200,HARBOR_TONE=1500;
const hz=midi=>440*2**((midi-69)/12);

export function createMusic({heard=()=>[],onTune=()=>{}}={}){
  let prefs={enabled:true,volume:.6};
  try{Object.assign(prefs,JSON.parse(localStorage.getItem(PREFS_KEY))||{});}catch{}
  let ctx=null,out,tone,bus,vinyl,wow,noise,timer=null,resuming=null,decks=[],region=null,candidate=null,candidateSince=0,harbor=false,hidden=false;
  const scores=new Map(),rotation={};
  const score=id=>scores.get(id)||scores.set(id,composeTune(id)).get(id);

  function build(){
    ctx=new AudioContext();
    const audio=ctx;
    audio.onstatechange=()=>{if(ctx!==audio)return;if(audio.state==='closed')dispose();else sync();};
    out=ctx.createGain();out.gain.value=prefs.enabled?prefs.volume:0;out.connect(ctx.destination);
    // Gentle saturation and a low-pass "tape" tone give the dusty lo-fi colour.
    const shaper=ctx.createWaveShaper(),curve=new Float32Array(1024);
    for(let i=0;i<curve.length;i++){const x=i/511.5-1;curve[i]=Math.tanh(1.6*x)/Math.tanh(1.6);}
    shaper.curve=curve;shaper.connect(out);
    tone=ctx.createBiquadFilter();tone.type='lowpass';tone.Q.value=.4;tone.frequency.value=harbor?HARBOR_TONE:SEA_TONE;tone.connect(shaper);
    bus=ctx.createGain();bus.gain.value=.5;bus.connect(tone);
    noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
    const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    // Tape wow: one slow LFO bends every oscillator by a few cents.
    wow=ctx.createGain();wow.gain.value=6;const lfo=ctx.createOscillator();lfo.frequency.value=.35;lfo.connect(wow);lfo.start();
    startVinyl();
    timer=setInterval(tick,25);
  }

  function dispose(){
    const audio=ctx;
    clearInterval(timer);timer=null;ctx=null;resuming=null;decks=[];
    if(!audio)return;
    audio.onstatechange=null;
    if(audio.state!=='closed')audio.close().catch(()=>{});
  }

  function startVinyl(){
    const buffer=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++){data[i]=(Math.random()*2-1)*.04;if(Math.random()<.00035)data[i]+=(Math.random()<.5?-1:1)*(.5+Math.random()*.5);}
    const src=ctx.createBufferSource(),band=ctx.createBiquadFilter();vinyl=ctx.createGain();
    src.buffer=buffer;src.loop=true;band.type='bandpass';band.frequency.value=2600;band.Q.value=.6;vinyl.gain.value=.16;
    src.connect(band).connect(vinyl).connect(tone);src.start();
  }

  function osc(type,freq,t,end,dest){
    const o=ctx.createOscillator(),modulation=wow;o.type=type;o.frequency.setValueAtTime(freq,t);modulation.connect(o.detune);o.connect(dest);o.start(t);o.stop(end);
    o.onended=()=>modulation.disconnect(o.detune);return o;
  }
  function env(dest,t,attack,peak,decay,hold=0){
    const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+attack);
    if(hold)g.gain.setValueAtTime(peak,t+attack+hold);g.gain.exponentialRampToValueAtTime(.0001,t+attack+hold+decay);g.connect(dest);return g;
  }
  function noiseHit(dest,t,{type='highpass',freq=7000,q=.7,peak=.3,decay=.05}){
    const src=ctx.createBufferSource(),f=ctx.createBiquadFilter();src.buffer=noise;f.type=type;f.frequency.value=freq;f.Q.value=q;
    src.connect(f).connect(env(dest,t,.002,peak,decay));src.start(t,Math.random()*1.5);src.stop(t+decay+.05);
  }
  function drop(dest,t,from,to,peak,decay,type='sine'){
    const o=osc(type,from,t,t+decay+.05,env(dest,t,.003,peak,decay));o.frequency.exponentialRampToValueAtTime(to,t+Math.min(.12,decay));
  }

  function pluck(dest,t,f,dur,vel,{wave='triangle',bright=2600,dark=500,decay=1,q=1,bend=0,detune=0,tremolo=0}){
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.Q.value=q;
    filter.frequency.setValueAtTime(bright,t);filter.frequency.exponentialRampToValueAtTime(dark,t+decay*.6);
    const g=env(filter,t,.004,vel*.35,decay,Math.min(dur,.2));let target=g;
    filter.connect(dest);
    if(tremolo){const trem=ctx.createGain(),l=ctx.createOscillator(),depth=ctx.createGain();trem.gain.value=.6;depth.gain.value=.4;l.frequency.value=tremolo;l.connect(depth).connect(trem.gain);l.start(t);l.stop(t+decay+.4);trem.connect(g);target=trem;}
    const end=t+Math.min(dur,.2)+decay+.1;
    for(const cents of detune?[-detune,detune]:[0]){
      const o=osc(wave,f,t,end,target);o.detune.setValueAtTime(cents+bend,t);if(bend)o.detune.linearRampToValueAtTime(cents,t+.09);
    }
  }
  function bell(dest,t,f,dur,vel,{ratio=3.5,index=2,decay=1.5,attack=.003}){
    const g=env(dest,t,attack,vel*.28,decay),mod=ctx.createGain(),end=t+attack+decay+.1;
    mod.gain.setValueAtTime(f*index,t);mod.gain.exponentialRampToValueAtTime(f*.05,t+decay*.5);
    const carrier=osc('sine',f,t,end,g);osc('sine',f*ratio,t,end,mod);mod.connect(carrier.frequency);
  }
  function flute(dest,t,f,dur,vel){
    const g=env(dest,t,.08,vel*.22,.35,Math.max(.05,dur-.1)),vib=ctx.createOscillator(),depth=ctx.createGain(),end=t+dur+.5;
    const o=osc('sine',f,t,end,g);vib.frequency.value=5;depth.gain.setValueAtTime(0,t);depth.gain.linearRampToValueAtTime(f*.012,t+.3);vib.connect(depth).connect(o.frequency);vib.start(t);vib.stop(end);
    noiseHit(dest,t,{type:'bandpass',freq:f*2,q:2,peak:vel*.05,decay:dur*.6+.1});
  }
  const leads={
    nylon:(d,t,f,dur,v)=>pluck(d,t,f,dur,v,{bright:2400,dark:450,decay:1.1}),
    mandolin:(d,t,f,dur,v)=>pluck(d,t,f,dur,v,{wave:'sawtooth',bright:3200,dark:800,decay:.9,detune:7,tremolo:dur>.3?11:0}),
    kora:(d,t,f,dur,v)=>pluck(d,t,f,dur,v,{bright:3600,dark:900,decay:.8,q:2}),
    oud:(d,t,f,dur,v)=>pluck(d,t,f,dur,v,{wave:'sawtooth',bright:1700,dark:380,decay:.85,bend:-90,q:2}),
    sitar:(d,t,f,dur,v)=>pluck(d,t,f,dur,v,{wave:'sawtooth',bright:3800,dark:700,decay:1.7,q:9,bend:dur>.25?-180:0}),
    koto:(d,t,f,dur,v)=>pluck(d,t,f,dur,v,{wave:'square',bright:2200,dark:420,decay:1.2,q:1.5}),
    slackkey:(d,t,f,dur,v)=>pluck(d,t,f,dur,v,{bright:2000,dark:600,decay:1.6,bend:dur>.3?-60:0}),
    kalimba:(d,t,f,dur,v)=>bell(d,t,f,dur,v*1.2,{ratio:7,index:1.4,decay:1.1}),
    gamelan:(d,t,f,dur,v)=>bell(d,t,f,dur,v,{ratio:2.76,index:2.2,decay:2.2}),
    steelpan:(d,t,f,dur,v)=>bell(d,t,f,dur,v*1.1,{ratio:2,index:1.6,decay:.9,attack:.008}),
    musicbox:(d,t,f,dur,v)=>bell(d,t,f*2,dur,v*.8,{ratio:4,index:.9,decay:1.3}),
    glass:(d,t,f,dur,v)=>bell(d,t,f,dur,v*.9,{ratio:1.5,index:.4,decay:2.4,attack:.12}),
    flute,
    rhodes:(d,t,f,dur,v)=>bell(d,t,f,dur,v,{ratio:1,index:1.1,decay:1.6,attack:.006}),
  };
  function keys(type,dest,t,notes,dur,vel){
    if(type==='pad'){
      const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=850;filter.connect(dest);
      const g=env(filter,t,.7,vel*.09,1.4,Math.max(.1,dur-.7));
      for(const n of notes)for(const cents of [-8,8])osc('sawtooth',hz(n),t,t+dur+1.6,g).detune.value=cents;
      return;
    }
    notes.forEach((n,i)=>bell(dest,t+i*.012,hz(n),dur,vel*.5,{ratio:1,index:.8,decay:Math.min(2.4,dur+.6),attack:.006}));
  }
  const drumVoices={
    kick:(d,t,v,style)=>drop(d,t,style==='heartbeat'?90:140,42,v*.9,style==='heartbeat'?.5:.38),
    snare:(d,t,v,style)=>{if(style==='brush'){noiseHit(d,t,{type:'bandpass',freq:3000,q:.5,peak:v*.12,decay:.22});return;}noiseHit(d,t,{type:'bandpass',freq:1800,q:.8,peak:v*.22,decay:.16});drop(d,t,200,160,v*.18,.07,'triangle');},
    hat:(d,t,v)=>noiseHit(d,t,{freq:7500,peak:v*.1,decay:.035}),
    shaker:(d,t,v)=>noiseHit(d,t,{type:'bandpass',freq:6000,q:1.2,peak:v*.08,decay:.055}),
    rim:(d,t,v)=>{noiseHit(d,t,{type:'bandpass',freq:1700,q:6,peak:v*.25,decay:.03});drop(d,t,820,800,v*.06,.03,'square');},
    tone:(d,t,v)=>drop(d,t,260,190,v*.35,.2),
    dum:(d,t,v)=>drop(d,t,120,78,v*.7,.32),
    tek:(d,t,v)=>{noiseHit(d,t,{type:'bandpass',freq:3400,q:2,peak:v*.18,decay:.05});drop(d,t,520,480,v*.08,.04);},
    gong:(d,t,v,style,root)=>bell(d,t,hz(root-12),2,v*.9,{ratio:1.41,index:1.2,decay:3.2}),
  };

  function startDeck(id,{notify=true}={}){
    const tune=score(id),stepDur=60/tune.bpm/4,now=ctx.currentTime;
    for(const deck of decks)if(!deck.ending){deck.ending=now+FADE;deck.gain.gain.cancelScheduledValues(now);deck.gain.gain.setValueAtTime(deck.gain.gain.value,now);deck.gain.gain.linearRampToValueAtTime(0,now+FADE);}
    const gain=ctx.createGain(),drums=ctx.createGain(),lead=ctx.createGain();
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+FADE);gain.connect(bus);
    drums.gain.value=harbor?.35:1;drums.connect(gain);lead.gain.value=1;lead.connect(gain);
    decks.push({tune,gain,drums,lead,stepDur,step:0,next:now+.1});
    if(notify)onTune(tuneById(id));
  }

  function nextTune(regionId){
    const list=regionTunes(regionId),known=heard(),fresh=list.find(t=>!known.includes(t.id));
    if(fresh)return fresh.id;
    rotation[regionId]=((rotation[regionId]??Math.floor(Math.random()*list.length))+1)%list.length;
    return list[rotation[regionId]].id;
  }

  function scheduleStep(deck,step,t){
    const {tune}=deck,section=SECTIONS[Math.floor(step/LOOP_STEPS)],s=step%LOOP_STEPS,bar=Math.floor(s/STEPS_PER_BAR),beat=s%STEPS_PER_BAR,sd=deck.stepDur;
    const at=t+(s%2?tune.swing*sd:0)+(Math.random()-.5)*.008;
    if(beat===0){
      const chord=tune.chords[Math.floor(bar/2)%4];
      if(tune.keys==='pad'){if(bar%2===0)keys('pad',deck.gain,t,chord,sd*32,section==='break'?.8:1);}
      else{keys('rhodes',deck.gain,t,chord,sd*9,section==='break'?.75:.9);}
      if(tune.drone&&bar%2===0)for(const n of [tune.root-12,tune.root-5])pluck(deck.gain,t,hz(n),sd*30,.3,{wave:'sawtooth',bright:1400,dark:300,decay:sd*32,q:4});
    }
    if(beat===10&&tune.keys!=='pad'&&section!=='break')keys('rhodes',deck.gain,at,tune.chords[Math.floor(bar/2)%4].slice(1),sd*5,.45);
    if(section!=='intro'&&section!=='break')for(const b of tune.bass)if(b.step===s)pluck(deck.gain,at,hz(b.note),b.len*sd,b.vel*1.3,{wave:'sine',bright:600,dark:180,decay:Math.min(.9,b.len*sd+.2)});
    if(section!=='intro'){
      const play=leads[tune.lead]||leads.rhodes,quiet=section==='break'?.75:1;
      for(const m of tune.melody)if(m.step===s){
        play(deck.lead,at,hz(m.note),m.len*sd,m.vel*quiet);
        if(section==='lift'&&m.vel>.8)play(deck.lead,at+sd*.02,hz(m.note+12),m.len*sd,m.vel*.35);
      }
    }
    if(section==='break')return;
    for(const [voice,lane] of Object.entries(tune.drums)){
      const v=lane[s];if(!v)continue;
      if(section==='intro'&&!['hat','shaker','rim'].includes(voice))continue;
      drumVoices[voice]?.(deck.drums,voice==='hat'||voice==='shaker'?at:t+(s%2?tune.swing*sd:0),v,regionStyle(tune),tune.root);
    }
  }
  const regionStyle=tune=>tune.region==='arctic'?'heartbeat':['north','northamerica','openocean'].includes(tune.region)?'brush':'';

  function tick(){
    if(!ctx||ctx.state!=='running')return;
    const now=ctx.currentTime,horizon=now+LOOKAHEAD,total=LOOP_STEPS*SECTIONS.length;
    for(const deck of decks){
      // A throttled tab must skip missed notes instead of creating them all at once.
      if(deck.next<now){const skipped=Math.ceil((now+.05-deck.next)/deck.stepDur);deck.step+=skipped;deck.next+=skipped*deck.stepDur;}
      while(deck.next<horizon&&(!deck.ending||deck.next<deck.ending)){
        if(deck.step>=total){if(!deck.ending&&decks.at(-1)===deck)startDeck(nextTune(deck.tune.region));break;}
        scheduleStep(deck,deck.step,deck.next);deck.step++;deck.next+=deck.stepDur;
      }
    }
    decks=decks.filter(d=>!d.ending||d.ending+1>ctx.currentTime||(d.gain.disconnect(),false));
  }

  function audible(){return ctx&&prefs.enabled&&!hidden;}
  function savePrefs(){try{localStorage.setItem(PREFS_KEY,JSON.stringify(prefs));}catch{}}
  function applyVolume(){if(!ctx)return;const now=ctx.currentTime;out.gain.cancelScheduledValues(now);out.gain.setTargetAtTime(prefs.enabled?prefs.volume:0,now,.3);}
  function sync(){
    if(!ctx)return;
    const audio=ctx;
    if(audio.state==='closed'){dispose();return;}
    if(audible()){
      if(audio.state!=='running'&&resuming!==audio){resuming=audio;audio.resume().catch(()=>{}).finally(()=>{if(resuming===audio)resuming=null;});}
      if(region&&!decks.some(d=>!d.ending))startDeck(nextTune(region));
    }
    else if(audio.state==='running')setTimeout(()=>{if(ctx===audio&&!audible())audio.suspend().catch(()=>{});},900);
  }

  return {
    get enabled(){return prefs.enabled;},get volume(){return prefs.volume;},get region(){return region;},
    get playing(){const d=decks.filter(d=>!d.ending).at(-1);return d?tuneById(d.tune.id):null;},
    unlock(){if(!prefs.enabled||hidden)return;if(ctx?.state==='closed')dispose();if(!ctx&&typeof AudioContext!=='undefined')build();sync();},
    update({x,y,port}){
      const id=regionAt(x,y).id,now=performance.now();
      if(harbor!==!!port){harbor=!!port;if(ctx){tone.frequency.setTargetAtTime(harbor?HARBOR_TONE:SEA_TONE,ctx.currentTime,.8);for(const d of decks)d.drums.gain.setTargetAtTime(harbor?.35:1,ctx.currentTime,.8);}}
      if(id===region){candidate=null;return;}
      // Coasts wobble across region borders; wait for the new waters to hold.
      if(region&&!port){
        if(candidate!==id){candidate=id;candidateSince=now;return;}
        if(now-candidateSince<REGION_SETTLE)return;
      }
      region=id;candidate=null;
      if(audible())startDeck(nextTune(id));
    },
    play(id){if(!tuneById(id))return;this.unlock();if(audible())startDeck(id,{notify:false});},
    setEnabled(on){prefs.enabled=on;savePrefs();if(!on)dispose();else this.unlock();},
    setVolume(v){prefs.volume=v;savePrefs();applyVolume();},
    setHidden(value){hidden=value;sync();},
  };
}
