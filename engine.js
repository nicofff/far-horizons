import { WORLD, ports, discoveries, goods, shipTypes, legacyShipTypes, hullMaterials, initialKnown, pirateTemplates } from './data.js';

export { onLand } from './terrain.js';
export { findRoute } from './navigation.js';
import { onLand, clearPassage, nearestWater } from './terrain.js';
import { findRoute } from './navigation.js';
import { log } from './journal.js';
import { createExpedition, hasSkill, validExpedition } from './specialists.js';
export { log } from './journal.js';
import { MAX_FLEET, makeShip, shipStats, shipQuote, shipyardCatalog, portDevelopment, marketGoods, price, invest, settleDevelopment, nextMonthDay } from './economy.js';
import { tuneById } from './music-score.js';
import { windAt, prevailingWindAt, prevailingCost, sailingFactor } from './wind.js';
import { wrapX, longitudeDelta, worldDistance } from './world.js';
import { createGuild, checkGuildDeadline, guildJobs as listGuildJobs, acceptGuildJob as acceptAssignment, validGuild, guildPirate, recordGuildPurchase, recordGuildVictory } from './guild.js';
export { completeGuildJob, collectGuildDebt, abandonGuildJob } from './guild.js';
export { MAX_FLEET, shipStats, shipQuote, shipyardCatalog, portDevelopment, marketGoods, price, invest, marketCatalog, investmentLimit, nextMonthDay, formatDate } from './economy.js';

export const distance = worldDistance;
export const SIGHT_RADIUS = 8;
export const CHART_CELL = 2;
export const CHART_COLS = WORLD.width / CHART_CELL;
export const MAP_REVISION = 10;

export function createShip(type,name,options={}) {
  if(shipTypes[type].legacyOnly){const t=legacyShipTypes[type];return {id:globalThis.crypto?.randomUUID?.()||Math.random().toString(36),type,name,hull:t.hull,crew:t.crew,legacy:true,material:'beech',berths:t.crew,guns:t.guns};}
  return makeShip(type,name,options);
}
export function createGame(seed=1530) {
  const home=ports[0];
  const s={version:4,mapRevision:MAP_REVISION,windRevision:1,weatherSeed:seed>>>0,seed,day:0,gold:7200,fame:0,food:120,water:140,morale:95,ships:[createShip('caravela-latina','Santa Clara')],cargo:{},position:{x:home.x,y:home.y},port:'lisbon',route:[],heading:null,destination:null,known:[...initialKnown],visited:['lisbon'],found:[],seen:[],investments:{},development:{},shipOrders:[],expedition:createExpedition(),guild:createGuild(),songbook:[],defeated:[],battle:null,lost:false,won:false,rewards:[],events:[],lastEvent:-20,supplyWarned:false,wind:0.4,speed:1,paused:true};
  log(s,'A letter of passage','The chart ends at the horizon. Your voyage begins in Lisbon. Butler Marco at the Franco residence is looking for discovery reports. Visit him before you sail.','discovery');reveal(s);s.expedition.charted=s.seen.length;return s;
}
export function random(s) {s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
export const crewCount = s => s.ships.reduce((n,a)=>n+a.crew,0);
export const capacity = s => s.ships.reduce((n,a)=>n+shipStats(a).hold,0);
export const cargoUsed = s => Object.values(s.cargo).reduce((n,a)=>n+a,0)+(s.food+s.water)*0.15;
export const rationRate = s => Math.max(1,crewCount(s)/10);
export const supplyDays = s => Math.floor(Math.min(s.food,s.water)/rationRate(s));
export const fleetBaseSpeed = s => s.ships.length?Math.min(...s.ships.map(a=>shipStats(a).speed))*(s.morale<30?0.7:1)*(hasSkill(s,'celestial-navigation')?1.15:1):0;
export const sailingHeading = s => s.heading||(s.route[0]?{x:longitudeDelta(s.position.x,s.route[0].x),y:s.route[0].y-s.position.y}:null);
export const currentWind = s => windAt(s.position,s.day,s.weatherSeed??(s.seed>>>0));
export const fleetSpeed = (s,heading=sailingHeading(s)) => fleetBaseSpeed(s)*sailingFactor(currentWind(s),heading);

export function sailingRoute(s,target){
  // Keep local courses on precise coastal routes; seasonal detours matter over longer passages.
  return distance(s.position,target)<60?findRoute(s.position,target):findRoute(s.position,target,{cost:prevailingCost(s.day),minCost:1/1.4});
}

export function estimatedPassage(s,route=s.route){
  const base=fleetBaseSpeed(s);if(!base)return 0;
  let elapsed=0,previous=s.position;
  for(const point of route){
    const heading={x:longitudeDelta(previous.x,point.x),y:point.y-previous.y},length=distance(previous,point),steps=Math.max(1,Math.ceil(length/3));
    for(let i=0;i<steps;i++){
      const position={x:previous.x+heading.x*(i+.5)/steps,y:previous.y+heading.y*(i+.5)/steps};
      elapsed+=length/steps/base/sailingFactor(prevailingWindAt(position,s.day+elapsed),heading);
    }
    previous=point;
  }
  return elapsed;
}
function guildPassage(s){return (start,end)=>{const route=findRoute(start,end);return {route,days:route.length?estimatedPassage({...s,position:start},route):Infinity};};}
export const availableGuildJobs=s=>listGuildJobs(s,guildPassage(s));
export const acceptGuildJob=(s,kind)=>acceptAssignment(s,kind,guildPassage(s));
export const portById = id => ports.find(p=>p.id===id);
export const inSight = (s,p) => distance(s.position,p)<=SIGHT_RADIUS;
export const visiblePirates = s => pirates(s).filter(p=>inSight(s,p));
export const recorded = (s,p) => s.seen.includes(Math.floor(p.y/CHART_CELL)*CHART_COLS+Math.floor(wrapX(p.x)/CHART_CELL));
export function reveal(s) {
  const seen=new Set(s.seen);
  const cx=Math.floor(s.position.x/CHART_CELL),cy=Math.floor(s.position.y/CHART_CELL);
  for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
    const x=(cx+dx+CHART_COLS)%CHART_COLS,y=cy+dy;
    if(y>=0&&y<450&&distance(s.position,{x:(x+.5)*CHART_CELL,y:(y+.5)*CHART_CELL})<=SIGHT_RADIUS)seen.add(y*CHART_COLS+x);
  }
  s.seen=[...seen];
  for(const p of ports) if(!s.known.includes(p.id)&&inSight(s,p)){s.known.push(p.id);log(s,'Land on the horizon',`Your lookout has charted ${p.name}.`,'discovery');}
  for(const d of discoveries) if(!s.found.includes(d.id)&&distance(s.position,d)<(d.discoveryRadius||1.8)){s.found.push(d.id);s.fame+=10;log(s,d.name,`${d.description} +10 renown. Your observations are ready to report to a collector.`,'discovery');}
}
export function steer(s,dx,dy) {
  if(s.battle||s.lost||!Number.isFinite(dx)||!Number.isFinite(dy)||!Math.hypot(dx,dy))return false;
  const length=Math.hypot(dx,dy);
  if(s.port){s.departedFrom=s.port;s.departureDay=s.day;}
  s.heading={x:dx/length,y:dy/length};s.route=[];s.destination=null;s.port=null;s.paused=false;
  return true;
}
export function plotCourse(s,target) {
  if(s.battle||s.lost)return {ok:false,message:'Resolve the encounter first.'};
  let p=typeof target==='string'?portById(target):target;
  if(!p)return {ok:false,message:'That harbor is not on your chart.'};
  p={...p,x:wrapX(p.x)};
  if(p.id===s.port)return {ok:false,message:'You are already in this harbor.'};
  if(onLand(p.x,p.y))return {ok:false,message:'That is dry land. Set a course in open water.'};
  const path=sailingRoute(s,p);
  if(!path.length)return {ok:false,message:'No navigable route was found.'};
  if(s.port)s.departureDay=s.day;
  s.route=path;s.heading=null;s.departedFrom=null;s.destination=p.id||p.enemy||null;s.port=null;s.paused=false;
  const days=Math.ceil(estimatedPassage(s));
  log(s,'Under sail',`Course set ${p.name?'for '+p.name:'into open water'}. Estimated passage: ${days} days.`);
  return {ok:true,days,message:`Course set. About ${days} days at sea.`};
}
export function routeLength(s) {let n=0,p=s.position;for(const q of s.route){n+=distance(p,q);p=q;}return n;}
export function cancelCourse(s) {s.route=[];s.heading=null;s.destination=null;s.paused=true;log(s,'Heave to','The fleet has stopped. Supplies are consumed only when time is running.');}
export function maxBuyQuantity(s,id) {
  const p=portById(s.port);
  if(!p||!goods[id]||!marketGoods(s,p).includes(id))return 0;
  return Math.max(0,Math.min(Math.floor(capacity(s)-cargoUsed(s)),Math.floor(s.gold/price(s,p,id,true))));
}
export function fillHold(s,id) {
  const amount=maxBuyQuantity(s,id);
  if(!amount)return {ok:false,message:'No room, insufficient gold, or this good is unavailable.'};
  return trade(s,id,amount,true);
}
export function trade(s,id,amount,buy) {
  const p=portById(s.port);if(!p||!Number.isInteger(amount)||amount<1||!goods[id])return {ok:false,message:'Trade requires a harbor and a whole quantity.'};
  if(p.supplyOnly)return {ok:false,message:'This anchorage offers supplies only.'};
  if(buy&&!marketGoods(s,p).includes(id))return {ok:false,message:'This good is not available in this market.'};
  const unit=price(s,p,id,buy),total=unit*amount;
  if(buy){if(s.gold<total)return {ok:false,message:'Not enough gold.'};if(cargoUsed(s)+amount>capacity(s))return {ok:false,message:'Your cargo holds are full.'};s.gold-=total;s.cargo[id]=(s.cargo[id]||0)+amount;recordGuildPurchase(s,id,amount);}
  else {if((s.cargo[id]||0)<amount)return {ok:false,message:'You do not have that much cargo.'};s.cargo[id]-=amount;s.gold+=total;}
  return {ok:true,message:`${buy?'Bought':'Sold'} ${amount} ${goods[id].name.toLowerCase()} for ${total} gold.`};
}
export function resupply(s,days=50) {
  if(!s.port||!Number.isInteger(days)||days<1||days>365)return {ok:false,message:'Choose 1 to 365 whole days of supplies in harbor.'};
  const target=days*rationRate(s),food=Math.max(0,target-s.food),water=Math.max(0,target-s.water),cost=Math.ceil(food*2);
  if(cargoUsed(s)+(food+water)*0.15>capacity(s))return {ok:false,message:'Free some cargo space before provisioning.'};
  if(s.gold<cost)return {ok:false,message:`You need ${cost} gold to provision for ${days} days.`};
  s.food+=food;s.water+=water;s.gold-=cost;s.supplyWarned=false;s.morale=Math.min(100,s.morale+8);return {ok:true,message:`Provisioned for ${days} days. Cost: ${cost} gold.`};
}
export function repair(s) {
  if(!s.port)return {ok:false,message:'Repairs require a harbor.'};
  const cost=s.ships.reduce((n,a)=>n+Math.max(0,shipStats(a).maxHull-a.hull)*5,0);
  if(s.gold<cost)return {ok:false,message:`Repairs cost ${cost} gold.`};s.gold-=cost;
  for(const a of s.ships)a.hull=shipStats(a).maxHull;
  s.morale=Math.min(100,s.morale+5);return {ok:true,message:cost?`All ships repaired for ${cost} gold.`:'Every hull is seaworthy.'};
}
export function recruit(s) {
  if(!s.port)return {ok:false,message:'Recruit crew in a harbor.'};
  const missing=s.ships.reduce((n,a)=>n+shipStats(a).berths-a.crew,0),cost=missing*15;
  if(s.gold<cost)return {ok:false,message:`Recruitment costs ${cost} gold.`};
  s.gold-=cost;for(const a of s.ships)a.crew=shipStats(a).berths;s.morale=Math.max(70,s.morale);
  return {ok:true,message:missing?`${missing} sailors joined for ${cost} gold.`:'All ships are fully crewed.'};
}
export function buyShip(s,type,options={}) {
  const p=portById(s.port),quote=shipQuote(s,p,type,options);
  if(!quote.ok)return quote;
  if(s.ships.length+s.shipOrders.length>=MAX_FLEET)return {ok:false,message:'Your fleet and ship orders already fill all ten places.'};
  if(s.gold<quote.cost)return {ok:false,message:'Not enough gold for this ship.'};
  const ship=makeShip(type,shipTypes[type].name,options);s.gold-=quote.cost;
  s.shipOrders.push({port:p.id,ship,readyDay:Math.floor(s.day)+quote.days});
  log(s,'Keel laid',`${p.name} is building your ${shipTypes[type].name}. Ready in ${quote.days} days.`,'world');
  return {ok:true,message:`${shipTypes[type].name} ordered for ${quote.cost.toLocaleString('en-US')} gold. Ready in ${quote.days} days.`};
}
export function collectShip(s,id){
  const index=s.shipOrders.findIndex(o=>o.ship.id===id),order=s.shipOrders[index];
  if(!order||order.port!==s.port)return {ok:false,message:'Visit the shipyard where you placed the order.'};
  if(s.day<order.readyDay)return {ok:false,message:'This ship is still under construction.'};
  if(s.ships.length>=MAX_FLEET)return {ok:false,message:'Your fleet is full.'};
  s.shipOrders.splice(index,1);s.ships.push(order.ship);checkMilestones(s);
  log(s,'A new sail',`${order.ship.name} joins your fleet. Recruit crew and check provisions before sailing.`,'world');
  return {ok:true,message:`${order.ship.name} joins the fleet. Recruit crew and provision before sailing.`};
}
export function waitInPort(s,days=nextMonthDay(s.day)-Math.floor(s.day)){
  if(!s.port||s.battle||s.lost||!Number.isInteger(days)||days<1||days>365)return {ok:false,message:'Wait for a whole number of days in harbor.'};
  const before=s.day,contract=s.guild?.active;s.day=Math.floor(s.day)+days;s.paused=true;const wind=currentWind(s);s.wind=Math.atan2(wind.y,wind.x);
  checkGuildDeadline(s);const updates=settleDevelopment(s,before,s.day);for(const text of updates)log(s,'Port development',text,'world');
  log(s,'Shore leave',`${days} days passed in ${portById(s.port).name}. Ship stores were kept aboard.`);
  return {ok:true,message:(updates.length?updates.join(' '):`${days} days passed in harbor.`)+(contract&&!s.guild.active?' Your guild assignment expired.':'')};
}
export function refitQuote(s,id,options={}){
  const p=portById(s.port),ship=s.ships.find(a=>a.id===id);if(!p?.shipyard||!ship)return {ok:false,message:'Refit a fleet ship at a shipyard.'};
  if(ship.legacy)return {ok:false,message:'This earlier vessel keeps its existing fittings.'};
  const t=shipTypes[ship.type],fit=options.fit||'standard',material=ship.type==='tekkousen'?'steel':options.material||ship.material;
  if(!['standard','trade','battle'].includes(fit))return {ok:false,message:'Choose a valid fitting.'};
  const m=hullMaterials[material],industry=portDevelopment(s,p).industry;
  if(!m||m.exclusive&&m.exclusive!==ship.type||material!==ship.material&&industry<m.industry)return {ok:false,message:'This hull material is unavailable.'};
  const berths=fit==='battle'?t.maxCrew:t.minCrew,guns=fit==='trade'?0:t.guns,hold=t.capacity-berths-guns;
  if(cargoUsed(s)>capacity(s)-shipStats(ship).hold+hold)return {ok:false,message:'Unload cargo or provisions before reducing hold space.'};
  const cost=Math.ceil(t.cost*.1)+(material===ship.material?0:Math.max(0,Math.round(t.cost*(m.factor-hullMaterials[ship.material].factor))));
  return {ok:true,cost,material,berths,guns,hold,maxHull:Math.round(t.hull*m.factor)};
}
export function refitShip(s,id,options={}){
  const quote=refitQuote(s,id,options);if(!quote.ok)return quote;
  if(s.gold<quote.cost)return {ok:false,message:`This refit costs ${quote.cost.toLocaleString('en-US')} gold.`};
  const ship=s.ships.find(a=>a.id===id),condition=ship.hull/shipStats(ship).maxHull;
  s.gold-=quote.cost;ship.material=quote.material;ship.berths=quote.berths;ship.guns=quote.guns;ship.crew=Math.min(ship.crew,quote.berths);ship.hull=Math.max(1,Math.round(quote.maxHull*condition));
  return {ok:true,message:`${ship.name} refitted for ${quote.cost.toLocaleString('en-US')} gold. Recruit crew and check provisions.`};
}
export function pirates(s) {return pirateTemplates.filter(e=>!s.defeated.includes(e.id)).map((e,i)=>({...e,x:wrapX(e.x+Math.sin(s.day/10+i)*15),y:e.y+Math.cos(s.day/13+i)*10})).concat(guildPirate(s)||[]);}
export function startBattle(s,enemy) {
  if(s.battle||s.lost||!enemy)return false;
  const t=shipTypes[enemy.type];s.battle={enemy:{...enemy,hull:Math.round(t.hull*enemy.power),maxHull:Math.round(t.hull*enemy.power),crew:t.crew,guns:t.guns},round:0,messages:[`${enemy.name} closes in. The gun ports open.`]};s.paused=true;s.route=[];s.heading=null;s.destination=null;
  log(s,'Sails to windward',`${enemy.name} is closing for battle.`,'combat');return true;
}
function sinkShips(s) {
  const lost=s.ships.filter(a=>a.hull<=0);for(const a of lost)log(s,'Ship lost',`${a.name} has gone beneath the waves.`,'danger');
  s.ships=s.ships.filter(a=>a.hull>0);
  if(!s.ships.length){s.lost=true;s.paused=true;s.battle=null;log(s,'The voyage is over','Your last ship has been lost. A new voyage awaits.','danger');}
}
export function battleAction(s,action) {
  const b=s.battle;if(!b)return {ok:false,message:'There is no battle.'};
  const e=b.enemy;let text='';b.round++;
  if(action==='flee') {
    if(random(s)<0.65){s.battle=null;s.paused=true;s.escapedUntil=s.day+1;log(s,'Slipped away',`You escaped ${e.name}.`,'combat');return {ok:true,message:'The fleet escaped. Chart a new course.'};}
    text='The enemy cuts off your escape.';
  } else if(action==='board') {
    const chance=Math.min(0.9,Math.max(0.1,crewCount(s)/(e.crew*2)*(1-e.hull/e.maxHull*0.65)));
    if(random(s)<chance) {
      s.gold+=e.reward;s.fame+=40;if(!e.id.startsWith('guild:'))s.defeated.push(e.id);recordGuildVictory(s,e.id);
      if(s.ships.length+s.shipOrders.length<MAX_FLEET){const ship=createShip(e.type,e.name.replace(/^The /,''));ship.hull=Math.max(1,Math.round(shipStats(ship).maxHull*0.45));ship.crew=Math.max(1,Math.round(ship.crew*0.55));s.ships.push(ship);text=`You captured ${e.name}! The ship joins your fleet. Take on provisions for the extra crew.`;}
      else {s.gold+=1000;text=`You captured ${e.name}. Your fleet is full, so the prize is sold for 1,000 gold.`;}
      const reward=e.id.startsWith('guild:')?`Report to the ${portById(s.guild.active.origin).name} guild for your bounty.`:`Bounty: ${e.reward} gold.`;
      log(s,'A prize taken',`${text} ${reward} +40 renown.`,'combat');s.battle=null;checkMilestones(s);return {ok:true,message:`${text} ${reward}`};
    }
    const casualties=Math.min(crewCount(s)-1,2+Math.floor(random(s)*4));s.ships[0].crew=Math.max(1,s.ships[0].crew-casualties);text=`The boarding party is driven back. ${casualties} sailors lost.`;
  } else if(action==='fire') {
    const guns=s.ships.reduce((n,a)=>n+shipStats(a).guns*(a.hull/shipStats(a).maxHull)*Math.max(0.25,a.crew/shipStats(a).berths),0);
    const damage=Math.round(guns*(1.1+random(s)*0.85)*(hasSkill(s,'gunnery')?1.25:1));e.hull=Math.max(0,e.hull-damage);e.crew=Math.max(4,e.crew-Math.floor(damage/8));text=`Your broadside deals ${damage} hull damage.`;
    if(e.hull<=0){s.gold+=e.reward;s.fame+=30;if(!e.id.startsWith('guild:'))s.defeated.push(e.id);recordGuildVictory(s,e.id);const reward=e.id.startsWith('guild:')?`Report to the ${portById(s.guild.active.origin).name} guild for your bounty.`:`Salvage earns ${e.reward} gold.`;log(s,'Victory at sea',`${e.name} is defeated. ${reward} +30 renown.`,'combat');s.battle=null;return {ok:true,message:`Victory! ${reward}`};}
  } else return {ok:false,message:'Choose a combat action.'};
  const target=s.ships[Math.floor(random(s)*s.ships.length)],damage=Math.round(e.guns*(0.55+random(s)*0.8));target.hull-=damage;
  b.messages.unshift(`${text} ${target.name} takes ${damage} damage.`);b.messages=b.messages.slice(0,5);sinkShips(s);
  return {ok:true,message:text};
}
function arrive(s) {
  const p=portById(s.destination);
  if(p){s.port=p.id;s.position={x:p.x,y:p.y};s.paused=true;
    if(!s.visited.includes(p.id)){s.visited.push(p.id);s.fame+=20;s.gold+=250;log(s,`Landfall in ${p.name}`,`${p.description} Your new charts earn 250 gold and 20 renown.`,'discovery');}
    else log(s,`Welcome to ${p.name}`,'Anchor dropped. The crew is ready for shore leave.');
  } else {const enemy=pirates(s).find(e=>e.id===s.destination&&distance(s.position,e)<2);if(enemy)startBattle(s,enemy);else{s.paused=true;log(s,'Course complete','The fleet holds position. Choose your next destination.');}}
  s.heading=null;
  s.destination=null;
}
function checkMilestones(s) {
  const milestones=[
    {id:'first-landfall',condition:s.visited.includes('madeira'),gold:700,fame:20,title:'Beyond the home waters',text:'First passage complete. The guild grants 700 gold for your next expedition.'},
    {id:'new-world',condition:s.visited.some(id=>['havana','santo-domingo','pernambuco'].includes(id)),gold:2500,fame:60,title:'Across the great ocean',text:'The Atlantic crossing earns a 2,500 gold commission. Eastern routes are coming into reach.'},
    {id:'fleet',condition:s.ships.length>=3,gold:1500,fame:30,title:'A fleet of your own',text:'Three ships fly your pennant. A merchant house contributes 1,500 gold.'},
    {id:'india',condition:s.visited.includes('goa')||s.visited.includes('calicut'),gold:3500,fame:80,title:'The spice route',text:'Your Indian Ocean charts earn 3,500 gold. The richest markets are now open.'},
  ];
  for(const m of milestones)if(m.condition&&!s.rewards.includes(m.id)){s.rewards.push(m.id);s.gold+=m.gold;s.fame+=m.fame;log(s,m.title,m.text,'world');}
  if(!s.won&&s.visited.length>=12&&s.found.length>=4&&s.ships.length>=3){s.won=true;s.gold+=10000;log(s,'A place in the atlas','Twelve harbors, four discoveries, and a fleet of your own. Your name belongs to the sea. The voyage can continue.','discovery');}
}
export function advance(s,days) {
  if(s.paused||s.battle||s.lost)return;
  let remaining=days;
  while(remaining>0&&!s.paused&&!s.battle&&!s.lost) {
    const dt=Math.min(remaining,0.025),before=s.day;remaining-=dt;s.day+=dt;checkGuildDeadline(s);if(s.paused)break;
    for(const text of settleDevelopment(s,before,s.day))log(s,'Port development',text,'world');
    const rate=rationRate(s);s.food=Math.max(0,s.food-rate*dt);s.water=Math.max(0,s.water-rate*dt);
    if(!s.food||!s.water){s.morale=Math.max(0,s.morale-4*dt);for(const ship of s.ships)ship.hull-=2*dt;sinkShips(s);if(s.lost)break;}
    const wind=currentWind(s);s.wind=Math.atan2(wind.y,wind.x);
    if(s.heading){
      const movement=fleetSpeed(s)*dt;
      const next={x:wrapX(s.position.x+s.heading.x*movement),y:s.position.y+s.heading.y*movement};
      if(next.y<1||next.y>WORLD.height-1||onLand(next.x,next.y)||!clearPassage(s.position,next)){
        s.paused=true;s.heading=null;log(s,'Land ahead!','The helmsman holds position before the shallows. Choose another heading.');
      }else{s.position=next;if(s.departedFrom&&distance(s.position,portById(s.departedFrom))>2)s.departedFrom=null;const harbor=ports.find(p=>p.id!==s.departedFrom&&distance(p,s.position)<.8);if(harbor){s.route=[];s.destination=harbor.id;arrive(s);}}
    }
    let sailingTime=s.heading?0:dt;
    while(sailingTime>0&&s.route.length){
      const p=s.route[0],d=distance(s.position,p),speed=fleetSpeed(s),time=d/speed;
      if(time<=sailingTime){s.position={...p,x:wrapX(p.x)};s.route.shift();sailingTime-=time;}
      else{const movement=speed*sailingTime;s.position.x=wrapX(s.position.x+longitudeDelta(s.position.x,p.x)/d*movement);s.position.y+=(p.y-s.position.y)/d*movement;sailingTime=0;}
    }
    reveal(s);
    if(!s.route.length&&!s.heading){if(!s.paused)arrive(s);checkMilestones(s);break;}
    if(supplyDays(s)<=10&&!s.supplyWarned){s.supplyWarned=true;s.paused=true;log(s,'Provisions running low','Ten days or fewer remain. Time is paused. Find a harbor, or resume at your own risk.','danger');}
    if(s.day-s.lastEvent>14&&random(s)<dt*0.04){s.lastEvent=s.day;const roll=random(s);if(roll<0.4){for(const a of s.ships)a.hull=Math.max(1,a.hull-8);log(s,'A sudden squall','The fleet weathers the storm. Every hull takes 8 damage.','danger');}else if(roll<0.75){s.food+=15;log(s,'A good catch','The crew hauls in fish. Food stores increase by 15.');}else{s.gold+=220;log(s,'Drifting cargo','A salvaged chest holds 220 gold.');}}
    const enemy=s.day>(s.escapedUntil||0)&&visiblePirates(s).find(e=>distance(s.position,e)<1.5);
    if(enemy)startBattle(s,enemy);
    checkMilestones(s);

  }
}
function validShip(a,legacySave=false){
  if(!a||typeof a.name!=='string'||typeof a.id!=='string'||!Number.isFinite(a.hull)||a.hull<=0||!Number.isInteger(a.crew)||a.crew<1)return false;
  if(legacySave){const t=legacyShipTypes[a.type];return !!t&&a.hull<=t.hull&&a.crew<=t.crew;}
  if(a.legacy){const t=legacyShipTypes[a.type];return !!t&&a.hull<=t.hull&&a.crew<=t.crew&&a.berths===t.crew&&a.guns===t.guns&&a.material==='beech';}
  const t=shipTypes[a.type],m=hullMaterials[a.material];
  if(!t||t.legacyOnly||!m||m.exclusive&&m.exclusive!==a.type||a.type==='tekkousen'&&a.material!=='steel')return false;
  return a.hull<=Math.round(t.hull*m.factor)&&Number.isInteger(a.berths)&&a.berths>=t.minCrew&&a.berths<=t.maxCrew&&a.crew<=a.berths&&Number.isInteger(a.guns)&&a.guns>=0&&a.guns<=t.guns&&t.capacity-a.berths-a.guns>=0;
}
export function validateSave(s) {
  if(!s||![1,2,3,4].includes(s.version)||!Array.isArray(s.ships)||s.ships.length>(s.version<3?5:MAX_FLEET)||(!s.lost&&!s.ships.length))return false;
  for(const k of ['day','gold','fame','food','water','morale','seed','wind','speed','lastEvent'])if(!Number.isFinite(s[k]))return false;
  if(s.day<0||s.gold<0||s.food<0||s.water<0||s.morale<0||s.morale>100||s.fame<0||![1,4,16].includes(s.speed))return false;
  if(s.weatherSeed!=null&&(!Number.isInteger(s.weatherSeed)||s.weatherSeed<0||s.weatherSeed>4294967295))return false;
  if(s.windRevision!=null&&s.windRevision!==1)return false;
  const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=WORLD.width&&p.y>=0&&p.y<=WORLD.height;
  if(!point(s.position)||!Array.isArray(s.route)||!s.route.every(point)||!s.ships.every(a=>validShip(a,s.version<3)))return false;
  for(const k of ['known','visited','found','seen','defeated','rewards','events'])if(!Array.isArray(s[k]))return false;
  if(!s.known.every(id=>portById(id))||!s.visited.every(id=>portById(id))||!s.found.every(id=>discoveries.some(d=>d.id===id))||!s.seen.every(id=>Number.isInteger(id)&&id>=0&&id<(s.version===1?2850:405000)))return false;
  if(s.heading!=null&&(!Number.isFinite(s.heading.x)||!Number.isFinite(s.heading.y)||Math.abs(Math.hypot(s.heading.x,s.heading.y)-1)>.01))return false;
  if(s.escapedUntil!=null&&!Number.isFinite(s.escapedUntil))return false;
  if(s.departedFrom!=null&&!portById(s.departedFrom))return false;
  if(s.departureDay!=null&&(!Number.isFinite(s.departureDay)||s.departureDay<0||s.departureDay>s.day))return false;
  if(!s.cargo||!s.investments||Object.entries(s.cargo).some(([k,v])=>!goods[k]||!Number.isInteger(v)||v<0)||Object.entries(s.investments).some(([k,v])=>!portById(k)||!Number.isInteger(v)||v<0||v>3))return false;
  if(s.version>=3){
    if(!s.development||typeof s.development!=='object'||Array.isArray(s.development)||!Array.isArray(s.shipOrders)||s.shipOrders.length+s.ships.length>MAX_FLEET)return false;
    for(const [id,d]of Object.entries(s.development)){
      if(!portById(id)||!d)return false;
      for(const key of ['economy','industry'])if(!Number.isInteger(d[key])||d[key]<0||d[key]>1000)return false;
      for(const key of ['pendingEconomy','pendingIndustry'])if(!Number.isInteger(d[key])||d[key]<0||d[key]>50000)return false;
    }
    if(!s.shipOrders.every(o=>o&&portById(o.port)?.shipyard&&Number.isInteger(o.readyDay)&&o.readyDay>=0&&!o.ship?.legacy&&validShip(o.ship)))return false;
    const ids=[...s.ships,...s.shipOrders.map(o=>o.ship)].map(a=>a.id);if(new Set(ids).size!==ids.length)return false;
  }
  if((s.version===4&&!validExpedition(s))||!validGuild(s))return false;
  if(s.port!==null&&!portById(s.port))return false;
  if(s.destination!==null&&!portById(s.destination)&&!pirateTemplates.some(e=>e.id===s.destination)&&guildPirate(s)?.id!==s.destination)return false;
  if(s.battle){const b=s.battle;if(!b.enemy||(!pirateTemplates.some(e=>e.id===b.enemy.id)&&guildPirate(s)?.id!==b.enemy.id)||!shipTypes[b.enemy.type]||typeof b.enemy.name!=='string'||!Number.isFinite(b.enemy.hull)||b.enemy.hull<0||!Number.isFinite(b.enemy.maxHull)||b.enemy.maxHull<=0||!Number.isFinite(b.enemy.crew)||b.enemy.crew<0||!Number.isFinite(b.enemy.guns)||b.enemy.guns<0||!Number.isFinite(b.enemy.reward)||b.enemy.reward<0||!Array.isArray(b.messages)||!b.messages.every(m=>typeof m==='string'))return false;}
  if(s.songbook!=null&&!Array.isArray(s.songbook))return false;
  return s.events.every(e=>typeof e.title==='string'&&typeof e.text==='string'&&Number.isFinite(e.day));
}
export function migrateSave(s) {
  if(!validateSave(s))return null;
  s.weatherSeed??=s.seed>>>0;
  if(s.version===1){s.seen=[];s.heading=null;delete s.mapRevision;}
  if(s.version<3){
    for(const ship of s.ships){const t=legacyShipTypes[ship.type];Object.assign(ship,{legacy:true,material:'beech',berths:t.crew,guns:t.guns});}
    const refund=Object.values(s.investments).reduce((sum,level)=>sum+1400*level*(level+1)/2,0);
    if(refund){s.gold+=refund;log(s,'Investment accounts settled',`Previous port expansions returned ${refund.toLocaleString('en-US')} gold. Market and shipyard investment now develop Economy and Industry separately.`,'world');}
    s.investments={};s.development={};s.shipOrders=[];
    if(s.cargo.silk){s.cargo['fine-silk']=(s.cargo['fine-silk']||0)+s.cargo.silk;delete s.cargo.silk;}
    s.version=3;
  }
  const upgradeExpedition=s.version<4;
  if(upgradeExpedition){s.expedition=createExpedition(s.seen.length,s.found);s.version=4;}
  if(s.port){const p=portById(s.port);s.position={x:p.x,y:p.y};}
  const mapChanged=s.mapRevision!==MAP_REVISION;
  if(mapChanged){
    s.position=nearestWater(s.position);
    if(s.route.length){
      const target=portById(s.destination)||s.route.at(-1);
      s.route=onLand(target.x,target.y)?[]:sailingRoute(s,target);
      if(!s.route.length)s.destination=null;
    }
    s.mapRevision=MAP_REVISION;
  }
  if(s.windRevision!==1){
    if(!mapChanged&&s.route.length){const target=portById(s.destination)||s.route.at(-1);s.route=sailingRoute(s,target);if(!s.route.length)s.destination=null;}
    s.windRevision=1;
  }
  s.songbook=Array.isArray(s.songbook)?[...new Set(s.songbook.filter(id=>tuneById(id)))]:[];
  checkGuildDeadline(s);s.paused=true;reveal(s);if(upgradeExpedition)s.expedition.charted=s.seen.length;return s;
}
