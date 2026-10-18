import { biomeStyleAt } from './biomes.js';

const START=Date.UTC(1522,3,1),DAY_MS=86400000,TAU=Math.PI*2;
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
const latitude=y=>90-y/5;
const palettes=new Map();
const seasons=['WINTER','SPRING','SUMMER','AUTUMN'];
const ground=['#b6c0b5','#6c9c57','#b3aa63','#b7a16b'];
const leaves=[['#657970','#83958a','#b2bba1'],['#39754c','#58964d','#92b76a'],null,['#855d3e','#b97e45','#d3af67']];

function mix(a,b,amount){
  const channels=[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-amount)+parseInt(b.slice(i,i+2),16)*amount));
  return '#'+channels.map(n=>n.toString(16).padStart(2,'0')).join('');
}

export function calendarAt(day){return new Date(START+day*DAY_MS);}

export function seasonalFrame(day){
  if(day===undefined)return {month:null,next:null,blend:0};
  const date=calendarAt(day),month=date.getUTCMonth(),days=new Date(Date.UTC(date.getUTCFullYear(),month+1,0)).getUTCDate();
  return {month,next:(month+1)%12,blend:(date.getUTCDate()-1+(day%1))/days};
}

export function seasonAt(day,y){
  if(Math.abs(latitude(y))<18)return 'TROPICS';
  const month=(calendarAt(day).getUTCMonth()+(latitude(y)<0?6:0))%12;
  return seasons[Math.floor(((month+1)%12)/3)];
}

export function seasonalStyleAt(x,y,month){
  const base=biomeStyleAt(x,y),lat=latitude(y);
  if(month===null||month===undefined||Math.abs(lat)<18||['jungle','mangrove','acacia','dune','ice'].includes(base.feature)||base.name.startsWith('Tropical'))return base;
  const strength=Math.round(clamp((Math.abs(lat)-18)/32)*8)/8,localMonth=(month+(lat<0?6:0))%12;
  const key=`${base.name},${strength},${localMonth}`;
  if(palettes.has(key))return palettes.get(key);
  const first=Math.floor(localMonth/3),next=(first+1)%4,blend=(localMonth%3)/3;
  const color=(value,index,leaf)=>{
    const tint=season=>{
      const amount=leaf?(season===3?(base.feature==='broadleaf'?.48:.14):season===0?.26:season===1?.13:0):[.28,.15,.1,.18][season];
      return mix(value,leaf?leaves[season]?.[index]||value:ground[season],amount*strength);
    };
    return mix(tint(first),tint(next),blend);
  };
  const style={...base,ground:base.ground.map((value,i)=>color(value,i,false)),leaves:base.leaves.map((value,i)=>color(value,i,true))};
  palettes.set(key,style);return style;
}

export function daylightAt(day,y){
  const date=calendarAt(day),yearStart=Date.UTC(date.getUTCFullYear(),0,1),yearEnd=Date.UTC(date.getUTCFullYear()+1,0,1);
  const year=(date.getTime()-yearStart)/(yearEnd-yearStart),lat=latitude(y),hour=(day%1)*24;
  const summer=Math.cos(TAU*(year-172/365))*(lat<0?-1:1),length=12+4.5*clamp(Math.abs(lat)/65)*summer;
  const dawn=12-length/2,dusk=12+length/2,night=1-smooth((hour-dawn+.8)/1.6)*(1-smooth((hour-dusk+.8)/1.6));
  const warmth=Math.max(Math.exp(-Math.pow((hour-dawn)/.9,2)),Math.exp(-Math.pow((hour-dusk)/.9,2)));
  const phase=Math.abs(hour-dawn)<.9?'DAWN':Math.abs(hour-dusk)<.9?'DUSK':night>.5?'NIGHT':'DAY';
  return {night,warmth,phase,season:seasonAt(day,y)};
}

export function drawDaylight(c,view,light){
  if(light.night>.001){c.globalAlpha=light.night*.19;c.fillStyle='#192d53';c.fillRect(view.x,view.y,view.width,view.height);}
  if(light.warmth>.001){c.globalAlpha=light.warmth*.055;c.fillStyle='#e9b780';c.fillRect(view.x,view.y,view.width,view.height);}
  c.globalAlpha=1;
}
