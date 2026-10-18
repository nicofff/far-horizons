import { ports, discoveries } from './data.js';
import { specialists, lessons, discoveryClues } from './people.js';
import { log } from './journal.js';

export { specialists, lessons };
export const specialistById=id=>specialists.find(person=>person.id===id);
export const localSpecialists=port=>specialists.filter(person=>person.port===port);
export const hasSkill=(s,skill)=>s.expedition?.skills.includes(skill)===true;
export const createExpedition=(charted=0,reported=[])=>({cartographer:null,collector:null,charted,reported:[...reported],skills:[],contacts:[],rumours:[]});
const available=(s,id)=>!s.battle&&!s.lost&&specialistById(id)?.port===s.port;
const unavailable=()=>({ok:false,message:'Visit this specialist in their home port.'});

export function meetSpecialist(s,id){
  if(!available(s,id))return unavailable();
  if(!s.expedition.contacts.includes(id))s.expedition.contacts.push(id);
  if(!s.known.includes(s.port))s.known.push(s.port);
  return {ok:true,message:specialistById(id).greeting};
}
export function chartReport(s){
  const squares=Math.max(0,s.seen.length-s.expedition.charted);
  return {squares,gold:squares*4,fame:Math.floor(squares/8)};
}
export function discoveryReport(s,id=s.expedition.collector){
  const person=specialistById(id),pending=discoveries.filter(d=>s.found.includes(d.id)&&!s.expedition.reported.includes(d.id));
  const items=pending.map(d=>({...d,payment:person?.kind==='collector'?Math.round(d.reward*person.factor):0}));
  return {items,gold:items.reduce((total,d)=>total+d.payment,0),fame:items.length*25};
}
export function signContract(s,id){
  if(!available(s,id))return unavailable();
  const person=specialistById(id),kind=person.kind;
  if(!['cartographer','collector'].includes(kind))return {ok:false,message:'This specialist does not offer reporting contracts.'};
  if(kind==='cartographer'&&!hasSkill(s,'cartography'))return {ok:false,message:'Learn Cartography before signing a mapmaking contract.'};
  if(s.expedition[kind]===id)return {ok:false,message:'You already hold this contract.'};
  s.expedition[kind]=id;meetSpecialist(s,id);
  const message=`You now report ${kind==='cartographer'?'charts':'discoveries'} to ${person.name} in ${ports.find(p=>p.id===person.port).name}. Unsubmitted reports stay with you.`;
  log(s,'A patron for your voyages',message,'discovery');return {ok:true,message};
}
export function reportCharts(s,id){
  if(!available(s,id))return unavailable();
  if(specialistById(id).kind!=='cartographer'||s.expedition.cartographer!==id)return {ok:false,message:'Sign a contract with this cartographer first.'};
  const quote=chartReport(s);if(!quote.squares)return {ok:false,message:'No new chart squares to report. Sail beyond your recorded waters.'};
  s.gold+=quote.gold;s.fame+=quote.fame;s.expedition.charted=s.seen.length;
  const message=`${specialistById(id).name} accepts ${quote.squares} new chart squares. Paid ${quote.gold.toLocaleString('en-US')} gold and ${quote.fame} renown.`;
  log(s,'Charts delivered',message,'discovery');return {ok:true,message};
}
export function reportDiscoveries(s,id){
  if(!available(s,id))return unavailable();
  if(specialistById(id).kind!=='collector'||s.expedition.collector!==id)return {ok:false,message:'Sign a contract with this collector first.'};
  const quote=discoveryReport(s,id);if(!quote.items.length)return {ok:false,message:'No unreported discoveries. Ask for a rumour or explore a new shore.'};
  s.gold+=quote.gold;s.fame+=quote.fame;s.expedition.reported.push(...quote.items.map(d=>d.id));
  const message=`${specialistById(id).name} accepts ${quote.items.map(d=>d.name).join(', ')}. Paid ${quote.gold.toLocaleString('en-US')} gold and ${quote.fame} renown.`;
  log(s,'Discoveries reported',message,'discovery');return {ok:true,message};
}
export function lessonQuote(s,id){
  if(!available(s,id))return unavailable();
  const person=specialistById(id),lesson=lessons[person.skill];
  if(!lesson)return {ok:false,message:'This specialist does not teach a skill.'};
  if(hasSkill(s,person.skill))return {ok:false,message:`You already know ${lesson.name}.`};
  return {ok:true,...lesson,skill:person.skill};
}
export function learnSkill(s,id){
  const quote=lessonQuote(s,id);if(!quote.ok)return quote;
  if(s.gold<quote.cost)return {ok:false,message:`The lesson costs ${quote.cost.toLocaleString('en-US')} gold.`};
  s.gold-=quote.cost;s.expedition.skills.push(quote.skill);meetSpecialist(s,id);
  const message=`${specialistById(id).name} teaches you ${quote.name}. ${quote.effect}`;
  log(s,'Lessons ashore',message,'discovery');return {ok:true,message};
}
export function askDirections(s,id){
  if(!available(s,id))return unavailable();
  const person=specialistById(specialistById(id).lead),port=ports.find(p=>p.id===person.port);
  const message=`You should visit ${person.name} in ${port.name}. Look for ${person.place}.`;
  if(!s.expedition.contacts.includes(person.id)){
    s.expedition.contacts.push(person.id);if(!s.known.includes(port.id))s.known.push(port.id);
    log(s,'An introduction',message,'discovery');
  }
  return {ok:true,message};
}
export function collectorRumour(s,id){
  if(!available(s,id))return unavailable();
  if(specialistById(id).kind!=='collector'||s.expedition.collector!==id)return {ok:false,message:'Sign a contract before asking this collector for leads.'};
  const outstanding=s.expedition.rumours.find(id=>!s.found.includes(id));
  if(outstanding)return {ok:true,message:discoveryClues[outstanding]};
  const person=specialistById(id),port=ports.find(p=>p.id===person.port);
  const next=discoveries.filter(d=>!s.found.includes(d.id)).sort((a,b)=>Math.hypot(a.x-port.x,a.y-port.y)-Math.hypot(b.x-port.x,b.y-port.y))[0];
  if(!next)return {ok:false,message:'You have found every discovery I have heard of. Bring me any reports still in your log.'};
  s.expedition.rumours.push(next.id);const message=discoveryClues[next.id];
  log(s,'A rumour from '+person.name,message,'discovery');return {ok:true,message};
}
export function validExpedition(s){
  const e=s.expedition;if(!e||typeof e!=='object'||Array.isArray(e))return false;
  for(const kind of ['cartographer','collector'])if(e[kind]!==null&&specialistById(e[kind])?.kind!==kind)return false;
  if(!Number.isInteger(e.charted)||e.charted<0||e.charted>s.seen.length||new Set(s.seen).size!==s.seen.length)return false;
  const unique=(list,accept)=>Array.isArray(list)&&new Set(list).size===list.length&&list.every(accept);
  if(!unique(e.skills,id=>Object.hasOwn(lessons,id))||e.cartographer&&!e.skills.includes('cartography'))return false;
  if(!unique(e.reported,id=>s.found.includes(id))||!unique(e.rumours,id=>discoveries.some(d=>d.id===id))||!unique(e.contacts,id=>!!specialistById(id)))return false;
  if([...e.contacts,e.cartographer,e.collector].filter(Boolean).some(id=>!s.known.includes(specialistById(id).port)))return false;
  return true;
}
