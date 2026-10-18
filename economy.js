import { ports, goods, marketTypes, shipTypes, legacyShipTypes, hullMaterials } from './data.js';

export const MAX_FLEET=10;
export const dateAt=day=>new Date(Date.UTC(1522,3,1)+Math.floor(day)*86400000);
export const formatDate=day=>dateAt(day).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'});
export function nextMonthDay(day){const date=dateAt(day);return (Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)-Date.UTC(1522,3,1))/86400000;}
export function portDevelopment(s,p){
  const record=s.development?.[p.id]||{};
  return {economy:record.economy??p.economy,industry:record.industry??p.industry,pendingEconomy:record.pendingEconomy||0,pendingIndustry:record.pendingIndustry||0};
}
export function marketCatalog(s,p){
  if(!p||p.supplyOnly)return [];
  const rows=(marketTypes[p.market]||[]).map(row=>({...row,specialty:false}));
  if(p.specialty)rows.push({good:p.specialty,economy:p.specialtyEconomy,price:p.specialtyPrice,specialty:true});
  const economy=portDevelopment(s,p).economy;
  return rows.map(row=>({...row,available:economy>=row.economy}));
}
export function marketGoods(s,p){return marketCatalog(s,p).filter(row=>row.available).map(row=>row.good);}
export function price(s,p,id,buy=true){
  const g=goods[id];if(!g||!p)return 0;
  if(g.legacy)return buy?0:Math.floor(g.base*.95);
  const row=marketCatalog(s,p).find(row=>row.good===id);
  if(buy)return row?.price||0;
  if(id===p.specialty)return Math.floor(p.specialtyPrice/2);
  return g.sell[p.market]||0;
}
export function shipStats(ship){
  if(ship.legacy){const t=legacyShipTypes[ship.type];return {...t,maxHull:t.hull,berths:t.crew,minCrew:1,maxCrew:t.crew};}
  const t=shipTypes[ship.type],factor=hullMaterials[ship.material||'beech'].factor;
  const berths=ship.berths??t.minCrew,guns=ship.guns??t.guns;
  return {...t,hull:Math.round(t.hull*factor),maxHull:Math.round(t.hull*factor),hold:t.capacity-berths-guns,berths,guns};
}
export function makeShip(type,name,options={}){
  const t=shipTypes[type],material=type==='tekkousen'?'steel':options.material||'beech',fit=options.fit||'standard';
  const berths=fit==='battle'?t.maxCrew:t.minCrew,guns=fit==='trade'?0:t.guns;
  return {id:globalThis.crypto?.randomUUID?.()||Math.random().toString(36),type,name,material,berths,guns,hull:Math.round(t.hull*hullMaterials[material].factor),crew:t.minCrew};
}
export function shipyardCatalog(s,p){
  if(!p?.shipyard)return [];
  const industry=portDevelopment(s,p).industry;
  return Object.entries(shipTypes).filter(([,t])=>t.shipyards?.includes(p.shipyard)).map(([id,t])=>({id,...t,available:industry>=t.industry}));
}
export function shipQuote(s,p,type,options={}){
  const t=shipTypes[type];
  if(!p?.shipyard||!t?.shipyards?.includes(p.shipyard))return {ok:false,message:'This shipyard does not build that ship.'};
  const industry=portDevelopment(s,p).industry;
  if(industry<t.industry)return {ok:false,message:`Requires ${t.industry} Industry. This port has ${industry}.`};
  const material=type==='tekkousen'?'steel':options.material||'beech',m=hullMaterials[material];
  if(!m||m.exclusive&&m.exclusive!==type||m.industry>industry)return {ok:false,message:'That hull material is not available here.'};
  if(options.fit&&!['standard','trade','battle'].includes(options.fit))return {ok:false,message:'Choose a trading, standard, or battle fit.'};
  return {ok:true,cost:Math.round(t.cost*m.factor),material,days:Math.ceil(t.hull*(1-industry/5000))};
}
export function investmentLimit(s,p,kind){
  if(!p||p.capital||p.supplyOnly||!['economy','industry'].includes(kind))return 0;
  const d=portDevelopment(s,p),pending=d[kind==='economy'?'pendingEconomy':'pendingIndustry'];
  return Math.max(0,Math.floor(Math.min(s.gold,50000-pending,(1000-d[kind])*300-pending)));
}
export function invest(s,kind='economy',amount=3000){
  const p=ports.find(p=>p.id===s.port);
  if(!p)return {ok:false,message:'Investment requires a harbor.'};
  if(p.capital)return {ok:false,message:'Capital development is fixed. Invest in another port.'};
  if(p.supplyOnly)return {ok:false,message:'This anchorage offers supplies only.'};
  if(!['economy','industry'].includes(kind)||!Number.isInteger(amount)||amount<300)return {ok:false,message:'Invest a whole amount of at least 300 gold.'};
  if(amount>investmentLimit(s,p,kind))return {ok:false,message:'Investment exceeds your gold, the monthly limit, or the port development cap.'};
  const d=portDevelopment(s,p);s.gold-=amount;d[kind==='economy'?'pendingEconomy':'pendingIndustry']+=amount;s.development[p.id]=d;
  return {ok:true,message:`${amount.toLocaleString('en-US')} gold invested in ${kind}. Development takes effect ${formatDate(nextMonthDay(s.day))}.`};
}
export function settleDevelopment(s,before,after){
  if(after<nextMonthDay(before))return [];
  const messages=[];
  for(const [id,d] of Object.entries(s.development)){
    const p=ports.find(p=>p.id===id);if(!p)continue;
    const oldGoods=new Set(marketGoods(s,p)),oldShips=new Set(shipyardCatalog(s,p).filter(t=>t.available).map(t=>t.id));
    for(const [kind,pending]of [['economy','pendingEconomy'],['industry','pendingIndustry']]){
      const gain=Math.min(1000-d[kind],Math.floor(d[pending]/300));
      if(gain>0){d[kind]+=gain;messages.push(`${p.name}: ${kind} +${gain}, now ${d[kind]}.`);}d[pending]=0;
    }
    const unlockedGoods=marketGoods(s,p).filter(id=>!oldGoods.has(id)).map(id=>goods[id].name);
    const unlockedShips=shipyardCatalog(s,p).filter(t=>t.available&&!oldShips.has(t.id)).map(t=>t.name);
    if(unlockedGoods.length)messages.push(`${p.name} now sells ${unlockedGoods.join(', ')}.`);
    if(unlockedShips.length)messages.push(`${p.name} can now build ${unlockedShips.join(', ')}.`);
  }
  return messages;
}
