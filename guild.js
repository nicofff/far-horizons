import { ports, goods, shipTypes } from './data.js';
import { marketGoods, price, dateAt, formatDate } from './economy.js';
import { worldDistance, longitudeDelta, wrapX } from './world.js';
import { log } from './journal.js';

export const guildTypes={
  letter:{name:'Deliver Letter',fee:700,fame:50},
  buy:{name:'Buy Goods',fee:1000,fame:200},
  transport:{name:'Transport Goods',fee:2000,fame:200},
  debt:{name:'Collect Debt',fee:5000,fame:300},
  pirate:{name:'Defeat Pirates',fee:10000,fame:300},
};
const byPort=id=>ports.find(p=>p.id===id),monthAt=day=>{const d=dateAt(day);return d.getUTCFullYear()*12+d.getUTCMonth();};
const boards=new WeakMap();
export const createGuild=()=>({active:null,month:0,used:[],history:[],completed:0,failed:0});
export const hasGuild=id=>!!byPort(id)&&!byPort(id).supplyOnly;
const available=s=>!s.battle&&!s.lost&&hasGuild(s.port);
function hash(text){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function archive(s,outcome,gold=0,fame=0){
  const q=s.guild.active;
  if(q.enemy?.id===s.destination){s.destination=null;s.route=[];s.paused=true;}
  s.guild.history.unshift({id:q.id,kind:q.kind,origin:q.origin,day:s.day,outcome,gold,fame});s.guild.history=s.guild.history.slice(0,30);
  s.guild[outcome==='completed'?'completed':'failed']++;s.guild.active=null;
}
export function checkGuildDeadline(s){
  s.guild??=createGuild();const g=s.guild,month=monthAt(s.day);
  if(g.month!==month){g.month=month;g.used=[];}
  if(g.active&&s.day>g.active.due+1e-8){
    const q=g.active,penalty=Math.min(s.fame,Math.ceil(q.fame/2));s.fame-=penalty;
    log(s,'Guild assignment expired',`${guildTypes[q.kind].name} from ${byPort(q.origin).name} was due ${formatDate(q.due)}. The contract is closed. Lost ${penalty} renown.`,'danger');archive(s,'expired');
  }
}
export function guildJobs(s,passage){
  checkGuildDeadline(s);if(!available(s))return [];
  const origin=byPort(s.port),period=s.guild.month,key=`${origin.id}/${period}`;
  let cache=boards.get(s);if(!cache){cache=new Map();boards.set(s,cache);}
  if(!cache.has(key)){
    cache.clear();const seed=hash(`${s.weatherSeed??s.seed}/${key}`),near=ports.filter(p=>!p.supplyOnly&&p.id!==origin.id).sort((a,b)=>worldDistance(origin,a)-worldDistance(origin,b)).slice(0,12);
    const trips=new Map(),trip=p=>{if(!trips.has(p.id))trips.set(p.id,passage(origin,p));return trips.get(p.id);};
    const reachable=near.filter(p=>{const t=trip(p);return t.route.length&&Number.isFinite(t.days)&&t.days<=40;});
    const offers=[];
    const make=(kind,extra,days)=>offers.push({id:`${key}/${kind}`,kind,origin:origin.id,target:origin.id,source:null,good:null,quantity:0,reimbursement:0,contact:null,enemy:null,...extra,fee:guildTypes[kind].fee,fame:guildTypes[kind].fame,days:Math.max(30,Math.ceil(days*1.75+6))});
    if(reachable.length){
      const destination=reachable[seed%Math.min(4,reachable.length)];
      make('letter',{target:destination.id,contact:['the harbor clerk','the guild secretary','the warehouse factor'][seed%3]},trip(destination).days);
      const supplier=reachable.find(p=>marketGoods(s,p).some(id=>!marketGoods(s,origin).includes(id)))||reachable[0];
      const stocks=marketGoods(s,supplier),imports=stocks.filter(id=>!marketGoods(s,origin).includes(id)),good=(imports.length?imports:stocks)[seed%(imports.length||stocks.length)];
      if(good){const quantity=10;make('buy',{source:supplier.id,good,quantity,reimbursement:price(s,supplier,good,true)*quantity},trip(supplier).days+passage(supplier,origin).days);}
      const exports=marketGoods(s,origin),exportGood=exports[seed%exports.length];
      if(exportGood){const quantity=15;make('transport',{source:origin.id,target:destination.id,good:exportGood,quantity,reimbursement:price(s,origin,exportGood,true)*quantity,contact:'the warehouse factor'},trip(destination).days);}
      const debtor=reachable[(seed+1)%Math.min(4,reachable.length)],names=['Mateo Varela','Isabel Costa','Nicolao Serra','Mariam Haddad','Jan Vermeer','Tomas Vidal'];
      make('debt',{target:debtor.id,contact:names[seed%names.length]},trip(debtor).days+passage(debtor,origin).days);
      const path=trip(destination).route;let previous=origin,travelled=0,anchor=null;
      for(const p of path){const length=worldDistance(previous,p);if(travelled+length>=4){const f=(4-travelled)/length;anchor={x:previous.x+longitudeDelta(previous.x,p.x)*f,y:previous.y+(p.y-previous.y)*f};break;}travelled+=length;previous=p;}
      anchor ||= path.at(-1);
      if(anchor){const id=`${key}/pirate`,names=['The Ashen Gull','The Ragged Pennant','The Salt Jackal','The Iron Petrel'];make('pirate',{enemy:{id:`guild:${id}`,name:names[seed%names.length],x:wrapX(anchor.x),y:anchor.y,type:'caravela-redonda',power:1,reward:0}},trip(destination).days*2);}
    }
    cache.set(key,offers);
  }
  return cache.get(key).filter(q=>!s.guild.used.includes(q.id));
}
export function acceptGuildJob(s,kind,passage){
  checkGuildDeadline(s);if(!available(s))return {ok:false,message:'Visit a trading port guild to accept work.'};
  if(s.guild.active)return {ok:false,message:'Finish or abandon your current guild assignment first.'};
  const offer=guildJobs(s,passage).find(q=>q.kind===kind);if(!offer)return {ok:false,message:'That assignment is not available on this board.'};
  const q={...structuredClone(offer),accepted:s.day,due:s.day+offer.days,loaded:0,collected:false,victory:false};
  s.guild.active=q;s.guild.used.push(q.id);
  for(const id of [q.target,q.source].filter(Boolean))if(!s.known.includes(id))s.known.push(id);
  log(s,'Guild contract accepted',`${guildTypes[kind].name}: ${guildObjective(s,q)} Due ${formatDate(q.due)}. Fee ${q.fee} gold and ${q.fame} renown.`,'quest');
  return {ok:true,message:`${guildTypes[kind].name} accepted. Due ${formatDate(q.due)}.`};
}
export function guildObjective(s,q=s.guild?.active){
  if(!q)return 'No active guild assignment.';
  const origin=byPort(q.origin).name,target=byPort(q.target).name;
  if(q.kind==='letter')return `Deliver the sealed letter to ${q.contact} at the ${target} guild.`;
  if(q.kind==='buy')return `Bring ${q.quantity} ${goods[q.good].name} to the ${origin} guild. Available in ${byPort(q.source).name}.`;
  if(q.kind==='transport')return `Buy ${q.quantity} ${goods[q.good].name} in ${byPort(q.source).name} and deliver them to the ${target} guild. Purchased ${q.loaded||0}/${q.quantity}; aboard ${s.cargo[q.good]||0}.`;
  if(q.kind==='debt')return q.collected?`Return the sealed collection to the ${origin} guild.`:`Find ${q.contact} at the cafe in ${target}, collect the debt, then return to ${origin}.`;
  return q.victory?`Report your victory at the ${origin} guild.`:`Find and defeat ${q.enemy.name}, last sighted off ${origin}. Return to its guild for the bounty.`;
}
export function guildDeliveryPort(q){return ['letter','transport'].includes(q.kind)?q.target:q.origin;}
export function guildReady(s){
  const q=s.guild?.active;if(!q)return false;
  return q.kind==='letter'||q.kind==='buy'&&(s.cargo[q.good]||0)>=q.quantity||q.kind==='transport'&&q.loaded>=q.quantity&&(s.cargo[q.good]||0)>=q.quantity||q.kind==='debt'&&q.collected||q.kind==='pirate'&&q.victory;
}
export function recordGuildPurchase(s,id,amount){const q=s.guild?.active;if(q?.kind==='transport'&&q.source===s.port&&q.good===id)q.loaded=Math.min(q.quantity,q.loaded+amount);}
export function recordGuildVictory(s,id){const q=s.guild?.active;if(q?.kind==='pirate'&&q.enemy.id===id&&!q.victory){q.victory=true;log(s,'Guild bounty secured',`Return to the ${byPort(q.origin).name} guild to claim the bounty on ${q.enemy.name}.`,'quest');}}
export function guildPirate(s){const q=s.guild?.active;return q?.kind==='pirate'&&!q.victory?q.enemy:null;}
export function collectGuildDebt(s){
  checkGuildDeadline(s);const q=s.guild.active;
  if(!available(s)||q?.kind!=='debt'||q.target!==s.port||q.collected)return {ok:false,message:'There is no outstanding collection here.'};
  q.collected=true;log(s,'Debt collected',`${q.contact} hands over a sealed purse. Return it to the ${byPort(q.origin).name} guild. The collection is kept apart from the ship accounts.`,'quest');
  return {ok:true,message:`The debt is collected. Return to ${byPort(q.origin).name} for your fee.`};
}
export function completeGuildJob(s){
  checkGuildDeadline(s);const q=s.guild.active;
  if(!available(s)||!q||s.port!==guildDeliveryPort(q))return {ok:false,message:'Visit the guild named in your assignment to report.'};
  if(!guildReady(s))return {ok:false,message:'The assignment is not finished. Check your orders and cargo.'};
  if(q.kind==='buy'||q.kind==='transport')s.cargo[q.good]-=q.quantity;
  const gold=q.fee+q.reimbursement;s.gold+=gold;s.fame+=q.fame;
  const message=`Assignment complete. Paid ${gold} gold${q.reimbursement?`, including ${q.reimbursement} for cargo`:''}, and ${q.fame} renown.`;
  log(s,'Guild assignment completed',`${guildTypes[q.kind].name} for ${byPort(q.origin).name}. ${message}`,'quest');archive(s,'completed',gold,q.fame);
  return {ok:true,message};
}
export function abandonGuildJob(s){
  checkGuildDeadline(s);const q=s.guild.active;if(!q||s.battle||s.lost)return {ok:false,message:'There is no assignment you can abandon now.'};
  const penalty=Math.min(s.fame,Math.ceil(q.fame/2));s.fame-=penalty;
  log(s,'Guild contract abandoned',`${guildTypes[q.kind].name} from ${byPort(q.origin).name} is cancelled. Lost ${penalty} renown.`,'quest');archive(s,'abandoned');
  return {ok:true,message:`Contract abandoned. Lost ${penalty} renown.`};
}
export function validGuild(s){
  const g=s.guild;if(g===undefined)return true;
  const int=(n,max=1e9)=>Number.isInteger(n)&&n>=0&&n<=max,text=v=>typeof v==='string'&&v.length>0&&v.length<=160;
  if(!g||!int(g.month)||!int(g.completed)||!int(g.failed)||!Array.isArray(g.used)||g.used.length>500||!g.used.every(text)||new Set(g.used).size!==g.used.length||!Array.isArray(g.history)||g.history.length>30)return false;
  if(!g.history.every(h=>h&&text(h.id)&&Object.hasOwn(guildTypes,h.kind)&&hasGuild(h.origin)&&Number.isFinite(h.day)&&h.day>=0&&h.day<=s.day&&['completed','expired','abandoned'].includes(h.outcome)&&int(h.gold)&&int(h.fame)))return false;
  const q=g.active;if(q===null)return true;
  if(!q||!text(q.id)||!Object.hasOwn(guildTypes,q.kind)||!hasGuild(q.origin)||!hasGuild(q.target)||q.source!==null&&!hasGuild(q.source)||!Number.isFinite(q.accepted)||q.accepted<0||q.accepted>s.day||!Number.isFinite(q.due)||q.due<=q.accepted||q.due-q.accepted>365||!int(q.days,365)||Math.abs(q.due-q.accepted-q.days)>1e-8||q.fee!==guildTypes[q.kind].fee||q.fame!==guildTypes[q.kind].fame||!int(q.reimbursement)||typeof q.collected!=='boolean'||typeof q.victory!=='boolean'||!int(q.loaded,30))return false;
  if(q.id!==`${q.origin}/${monthAt(q.accepted)}/${q.kind}`||g.month===monthAt(q.accepted)&&!g.used.includes(q.id))return false;
  if(['buy','transport'].includes(q.kind)){if(!goods[q.good]||!hasGuild(q.source)||!int(q.quantity,30)||q.quantity<1||q.loaded>q.quantity)return false;}
  else if(q.good!==null||q.quantity!==0||q.reimbursement!==0||q.loaded!==0)return false;
  if(['letter','debt','transport'].includes(q.kind)&&!text(q.contact))return false;
  if(q.kind==='pirate'){
    const e=q.enemy;if(!e||e.id!==`guild:${q.id}`||!text(e.name)||!shipTypes[e.type]||e.type!=='caravela-redonda'||e.power!==1||e.reward!==0||!Number.isFinite(e.x)||e.x<0||e.x>=1800||!Number.isFinite(e.y)||e.y<0||e.y>900)return false;
  }else if(q.enemy!==null)return false;
  return true;
}
