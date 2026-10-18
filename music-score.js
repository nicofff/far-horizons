import { WORLD } from './data.js';

// Scales are semitone offsets from the tonic. Pentatonic and maqam-like
// scales are approximations in twelve-tone equal temperament.
const SCALES={
  phrygian:[0,1,3,5,7,8,10],dorian:[0,2,3,5,7,9,10],aeolian:[0,2,3,5,7,8,10],mixolydian:[0,2,4,5,7,9,10],
  major:[0,2,4,5,7,9,11],lydian:[0,2,4,6,7,9,11],hijaz:[0,1,4,5,7,8,10],kafi:[0,2,3,5,7,9,10],
  majorPentatonic:[0,2,4,7,9],minorPentatonic:[0,3,5,7,10],pelog:[0,1,3,7,8],in:[0,1,5,7,8],yo:[0,2,5,7,9],
};

// Each region is a sequence of lon/lat boxes, checked in list order. The first
// matching region wins, so narrower seas come before the wide oceans.
export const musicRegions=[
  {id:'arctic',name:'Northern Seas',blurb:'Glass harmonica pads over a slow heartbeat, for ice and long twilight.',
    boxes:[[-180,180,70,90],[-180,-10,56,70],[60,180,56,70]],scale:'aeolian',root:45,bpm:62,swing:.08,keys:'pad',lead:'glass',drums:'heartbeat',
    progressions:[[0,5,3,4],[0,3,5,4],[0,6,5,3]],tunes:['Aurora over Hekla','Whalebone Lullaby','The Long Twilight']},
  {id:'north',name:'North Sea and Baltic',blurb:'Music box melodies and brushed drums for Hanseatic quays and grey water.',
    boxes:[[-12,30,46,70]],scale:'aeolian',root:50,bpm:70,swing:.12,keys:'rhodes',lead:'musicbox',drums:'brush',
    progressions:[[0,5,2,6],[0,3,6,2],[5,3,0,4]],tunes:['Herring Weather','Lanterns of Lübeck','Fog on the Sound']},
  {id:'iberia',name:'Iberian Atlantic',blurb:'Nylon-string guitar in the Phrygian mode, from the Tagus to Madeira.',
    boxes:[[-35,-5.5,27,46],[-12,0,43.3,46]],scale:'phrygian',root:52,bpm:78,swing:.14,keys:'rhodes',lead:'nylon',drums:'boom',
    progressions:[[0,6,5,1],[3,2,1,0],[0,3,6,5]],tunes:['Tagus at Dusk','Salt on the Quay','Caravel Siesta']},
  {id:'mediterranean',name:'Mediterranean',blurb:'Tremolo mandolin and warm keys between Venice, Alexandria and the Bosporus.',
    boxes:[[-5.5,42,30.2,48]],scale:'dorian',root:50,bpm:82,swing:.16,keys:'rhodes',lead:'mandolin',drums:'boom',
    progressions:[[0,3,6,4],[0,6,5,6],[0,3,0,4]],tunes:['Lemon Groves of Palma','Adriatic Afternoon','Lanterns over the Golden Horn']},
  {id:'westafrica',name:'West African Coast',blurb:'Kora-like harp runs over shakers and hand drums from Argin to Luanda.',
    boxes:[[-30,20,-18,27]],scale:'majorPentatonic',root:53,bpm:88,swing:.1,keys:'rhodes',lead:'kora',drums:'hand',
    progressions:[[0,3,4,3],[0,1,3,0],[4,3,1,0]],tunes:['Elmina Morning','Gold Coast Drift','Lagoon at Abidjan']},
  {id:'swahili',name:'Swahili Coast and the Cape',blurb:'Kalimba and dhow-rocking rhythms from the Cape of Good Hope to Mogadishu.',
    boxes:[[10,60,-45,12]],scale:'mixolydian',root:51,bpm:84,swing:.13,keys:'rhodes',lead:'kalimba',drums:'hand',
    progressions:[[0,6,3,0],[0,3,4,6],[0,4,6,3]],tunes:['Monsoon at Malindi','Cloves of Zanzibar','Rounding the Cape']},
  {id:'arabian',name:'Red Sea and Arabian Sea',blurb:'An oud-like pluck in a Hijaz mode over the maqsum rhythm.',
    boxes:[[32,68,5,31]],scale:'hijaz',root:50,bpm:76,swing:.06,keys:'pad',lead:'oud',drums:'maqsum',
    progressions:[[0,1,0,6],[0,3,1,0],[0,6,5,1]],tunes:['Incense Road','Dhow under Stars','Pearl Divers of Qatar']},
  {id:'india',name:'Malabar and the Bay of Bengal',blurb:'A sitar-like lead with slides over a tanpura drone.',
    boxes:[[66,92,0,28],[66,100,-10,0]],scale:'kafi',root:49,bpm:72,swing:.08,keys:'pad',lead:'sitar',drums:'tabla',drone:true,
    progressions:[[0,0,6,0],[0,3,0,4],[0,6,3,0]],tunes:['Pepper Coast Rain','Calicut Twilight','Monsoon Raga']},
  {id:'seasia',name:'Spice Islands',blurb:'Gamelan bells in a pelog scale and slow gongs, from Malacca to the Moluccas.',
    boxes:[[92,150,-12,19]],scale:'pelog',root:50,bpm:80,swing:.1,keys:'rhodes',lead:'gamelan',drums:'gamelan',
    progressions:[[0,2,3,0],[0,3,2,4],[0,1,3,2]],tunes:['Strait of Malacca','Nutmeg and Mace','Ternate Tidewater']},
  {id:'eastasia',name:'East China Sea',blurb:'Koto plucks in the in scale with sparse taiko accents.',
    boxes:[[100,150,19,56]],scale:'in',root:52,bpm:74,swing:.1,keys:'rhodes',lead:'koto',drums:'taiko',
    progressions:[[0,3,4,0],[0,2,3,4],[3,2,0,4]],tunes:['Cherry Rain at Sakai','Nagasaki Lanterns','Junks off Macau']},
  {id:'caribbean',name:'Caribbean',blurb:'Steel-pan melodies over a lazy island groove.',
    boxes:[[-98,-58,8,30]],scale:'major',root:53,bpm:90,swing:.18,keys:'rhodes',lead:'steelpan',drums:'island',
    progressions:[[0,3,4,3],[0,5,3,4],[0,4,5,3]],tunes:['Havana Hammock','Rum and Trade Winds','Windward Passage']},
  {id:'southamerica',name:'South American Coast',blurb:'Bossa-flavoured nylon guitar and soft rimshots for Rio and the Pacific coast.',
    boxes:[[-95,-30,-60,8],[-30,20,-60,-18]],scale:'dorian',root:50,bpm:86,swing:.08,keys:'rhodes',lead:'nylon',drums:'bossa',
    progressions:[[0,3,1,4],[0,5,1,4],[1,4,0,5]],tunes:['Guanabara Bay','Silver of Potosí','Cold Current Callao']},
  {id:'northamerica',name:'New World Shores',blurb:'A breathy wooden flute over muted keys and brushed snare.',
    boxes:[[-130,-50,25,56]],scale:'majorPentatonic',root:48,bpm:68,swing:.12,keys:'rhodes',lead:'flute',drums:'brush',
    progressions:[[0,3,4,0],[0,2,3,4],[0,4,3,1]],tunes:['Cape Cod Pines','Cod Banks at Dawn','Driftwood Fire']},
  {id:'pacific',name:'South Seas',blurb:'Slack-key guitar in a lydian mode with waves and soft shakers.',
    boxes:[[100,180,-60,-12],[150,180,-60,56],[-180,-100,-60,56]],scale:'lydian',root:52,bpm:72,swing:.14,keys:'rhodes',lead:'slackkey',drums:'island',
    progressions:[[0,1,0,4],[0,5,1,4],[0,3,1,0]],tunes:['Tahiti Slack Tide','Coral Lullaby','Stars over Suva']},
  {id:'openocean',name:'Open Ocean',blurb:'Long pads and a distant Rhodes, for days with no land in sight.',
    boxes:[],scale:'lydian',root:48,bpm:64,swing:.1,keys:'pad',lead:'rhodes',drums:'brush',
    progressions:[[0,4,5,3],[0,3,0,4],[5,3,0,4]],tunes:['Blue Water','Doldrums','Dead Reckoning']},
];

const regionMap=new Map(musicRegions.map(r=>[r.id,r]));
export const regionById=id=>regionMap.get(id);
export const tunes=musicRegions.flatMap(r=>r.tunes.map((name,index)=>({id:`${r.id}-${index+1}`,name,region:r.id,index})));
const tuneMap=new Map(tunes.map(t=>[t.id,t]));
export const tuneById=id=>tuneMap.get(id);
export const regionTunes=id=>tunes.filter(t=>t.region===id);

export function regionAt(x,y){
  const lon=x/WORLD.width*360-180,lat=90-y/WORLD.height*180;
  return musicRegions.find(r=>r.boxes.some(([w,e,s,n])=>lon>=w&&lon<e&&lat>=s&&lat<n))||regionMap.get('openocean');
}

function seeded(text){
  let h=1779033703^text.length;
  for(let i=0;i<text.length;i++){h=Math.imul(h^text.charCodeAt(i),3432918353);h=h<<13|h>>>19;}
  return ()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return ((h^=h>>>16)>>>0)/4294967296;};
}

export const STEPS_PER_BAR=16,LOOP_BARS=8,LOOP_STEPS=STEPS_PER_BAR*LOOP_BARS;
// A tune plays its eight-bar loop through these sections, then hands over to
// the next tune in the region.
export const SECTIONS=['intro','main','lift','break','main'];

const drumKits={
  boom:{kick:[0,7,10],snare:[4,12],hat:[0,2,4,6,8,10,12,14]},
  brush:{kick:[0,10],snare:[4,12],hat:[0,2,4,6,8,10,12,14]},
  heartbeat:{kick:[0,2,8],snare:[12],hat:[4,12]},
  bossa:{kick:[0,6,8,14],rim:[0,3,6,10,13],hat:[0,2,4,6,8,10,12,14]},
  hand:{kick:[0,10],snare:[12],shaker:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],tone:[3,6,7,11,14]},
  maqsum:{dum:[0,8],tek:[2,6,12],hat:[4,10,14]},
  tabla:{dum:[0,7,10],tek:[3,4,12,14],hat:[]},
  gamelan:{kick:[0,8],gong:[0],tone:[4,6,12,14],hat:[2,10]},
  taiko:{dum:[0,11],rim:[4,12],hat:[2,6,10,14]},
  island:{kick:[0,8],snare:[3,6,11,14],shaker:[0,2,4,6,8,10,12,14]},
};

const scaleNote=(root,scale,degree)=>{const n=scale.length,o=Math.floor(degree/n);return root+scale[(degree%n+n)%n]+12*o;};

export function composeTune(id){
  const tune=tuneById(id);if(!tune)throw new Error(`Unknown tune ${id}.`);
  const region=regionById(tune.region),scale=SCALES[region.scale],rand=seeded(id),pick=list=>list[Math.floor(rand()*list.length)];
  const root=region.root+[0,5,-2][tune.index],bpm=region.bpm+Math.round(rand()*8-4);
  const chordDegrees=region.progressions[tune.index];
  // Stacked scale thirds. In five-note scales this yields open, quartal voicings.
  const chords=chordDegrees.map(d=>[0,2,4,6].map(i=>scaleNote(root,scale,d+i)));
  const chordAtBar=bar=>chordDegrees[Math.floor(bar/2)%4];
  const chordTones=bar=>[0,2,4].map(i=>chordAtBar(bar)+i);

  const melody=[],n=scale.length,rhythms=[[0,3,6,8,12],[0,2,4,7,10,14],[0,4,6,10],[2,4,8,11,14],[0,6,8,10,12],[0,3,8,10]];
  let degree=n+chordTones(0)[pick([0,1,2])];
  const bar=b=>{
    const notes=[],rhythm=pick(rhythms);
    for(let i=0;i<rhythm.length;i++){
      if(i>0&&rand()<.18)continue;
      const step=rhythm[i],strong=step%8===0;
      if(strong){const tones=chordTones(b).map(t=>t+n*Math.round((degree-t)/n));degree=tones.reduce((a,t)=>Math.abs(t-degree)<Math.abs(a-degree)?t:a);}
      else degree+=pick([-2,-1,-1,1,1,2,3,-3]);
      degree=Math.max(n-2,Math.min(n*2+2,degree));
      notes.push({step:b*STEPS_PER_BAR+step,degree,len:Math.max(1,Math.min((rhythm[i+1]??STEPS_PER_BAR)-step,6)),vel:strong?.9:.6+rand()*.25});
    }
    return notes;
  };
  const shift=(notes,bars)=>notes.map(m=>({...m,step:m.step+bars*STEPS_PER_BAR}));
  // A A' B A'': the motif returns in bars 3 and 7 so the loop is hummable.
  const motif=bar(0),phrases=[motif,bar(1),shift(motif,2),bar(3),bar(4),bar(5),shift(motif,6)];
  // Resolve on the tonic so the eight bars land like a sentence.
  phrases.push([{step:7*STEPS_PER_BAR,degree:n,len:10,vel:.85}]);
  for(const m of phrases.flat())melody.push({step:m.step,note:scaleNote(root+12,scale,m.degree-n),len:m.len,vel:m.vel});

  const bass=[];
  for(let bar=0;bar<LOOP_BARS;bar++){
    const d=chordAtBar(bar),base=bar*STEPS_PER_BAR,rootNote=scaleNote(root-24,scale,d);
    bass.push({step:base,note:rootNote,len:6,vel:.95});
    if(rand()<.75)bass.push({step:base+pick([8,10]),note:rand()<.5?rootNote:scaleNote(root-24,scale,d+(n>5?4:3)),len:4,vel:.7});
    if(bar%2&&rand()<.6)bass.push({step:base+14,note:scaleNote(root-24,scale,chordAtBar(bar+1)+pick([-1,1])),len:2,vel:.55});
  }

  const kit=drumKits[region.drums],drums={};
  for(const [voice,steps] of Object.entries(kit)){
    const lane=new Array(LOOP_STEPS).fill(0);
    for(let bar=0;bar<LOOP_BARS;bar++)for(const s of steps){
      if(voice==='gong'&&bar%2)continue;
      lane[bar*STEPS_PER_BAR+s]=(s%4===0?.9:.65)*(.85+rand()*.15);
    }
    if(voice==='hat'||voice==='shaker')for(let i=1;i<LOOP_STEPS;i+=2)if(!lane[i]&&rand()<.12)lane[i]=.3;
    if(voice==='snare'||voice==='tek')for(const s of [14,15])if(rand()<.5)lane[3*STEPS_PER_BAR+s]=lane[7*STEPS_PER_BAR+s]=.4;
    drums[voice]=lane;
  }

  return {id,name:tune.name,region:region.id,regionName:region.name,bpm,swing:region.swing,root,scale,chords,chordDegrees,melody,bass,drums,keys:region.keys,lead:region.lead,drone:!!region.drone};
}
