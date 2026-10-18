import test from 'node:test';
import assert from 'node:assert/strict';
import { goods, ports, legacyShipTypes, shipTypes } from '../data.js';
import { createGame, createShip, portById, marketCatalog, marketGoods, price, trade, maxBuyQuantity, fillHold, portDevelopment, invest, investmentLimit, nextMonthDay, waitInPort, advance, steer, shipyardCatalog, shipQuote, buyShip, collectShip, shipStats, refitQuote, refitShip, recruit, resupply, supplyDays, cargoUsed, capacity, validateSave, migrateSave, MAX_FLEET, startBattle, battleAction } from '../engine.js';
import { settleDevelopment } from '../economy.js';
import { pirateTemplates } from '../data.js';

function dock(s,id){const p=portById(id);s.port=id;s.position={x:p.x,y:p.y};return p;}
function develop(s,id,economy,industry){s.development[id]={economy,industry,pendingEconomy:0,pendingIndustry:0};}
function unchanged(s,action){const before=structuredClone(s);assert.equal(action().ok,false);assert.deepEqual(s,before);}

test('catalog has the original 46 commodities and regional shipyards for all 132 ports',()=>{
  assert.equal(Object.values(goods).filter(g=>!g.legacy).length,46);assert.equal(ports.length,132);
  assert.equal(Object.values(shipTypes).filter(t=>!t.legacyOnly).length,25);
  const s=createGame();for(const p of ports){assert.ok(Number.isInteger(p.economy));assert.ok(Number.isInteger(p.industry));if(!p.supplyOnly){assert.ok(marketCatalog(s,p).length,p.id);assert.ok(shipyardCatalog(s,p).length,p.id);}}
});

test('Baltic ports retain their starting specialties, investment requirements and regional shipyards',()=>{
  for(const [id,economy,industry,good,requirement,basePrice] of [
    ['copenhagen',530,510,'glassware',450,190],
    ['lubeck',320,300,'silver',500,170],
    ['danzig',370,280,null,null,null],
    ['riga',150,160,'wood',100,80],
    ['stockholm',480,470,'copper-ore',500,80],
  ]){
    const s=createGame(),p=dock(s,id);s.gold=100000;
    assert.deepEqual(portDevelopment(s,p),{economy,industry,pendingEconomy:0,pendingIndustry:0});
    assert.equal(p.market,'b');assert.equal(p.shipyard,'D');assert.equal(p.specialty,good);
    if(good){
      assert.equal(marketGoods(s,p).includes(good),economy>=requirement,id);
      if(economy<requirement){
        while(portDevelopment(s,p).economy<requirement){
          const cost=(requirement-portDevelopment(s,p).economy)*300;
          assert.ok(invest(s,'economy',Math.min(cost,49800)).ok);assert.ok(waitInPort(s,nextMonthDay(s.day)-s.day).ok);
        }
        assert.ok(marketGoods(s,p).includes(good),id);
      }
      assert.equal(price(s,p,good,true),basePrice);assert.ok(trade(s,good,1,true).ok,id);
    }
    assert.equal(shipyardCatalog(s,p).find(t=>t.id==='la-reale').available,false);
    develop(s,id,requirement||economy,600);
    assert.equal(shipyardCatalog(s,p).find(t=>t.id==='la-reale').available,true);
  }
});

test('Bristol specialty and regional goods unlock locally at their Economy requirements',()=>{
  const s=createGame(),p=dock(s,'bristol');s.gold=100000;
  assert.equal(portDevelopment(s,p).economy,320);assert.equal(marketGoods(s,p).includes('tin-ore'),false);assert.equal(marketGoods(s,p).includes('cotton-cloth'),false);
  unchanged(s,()=>trade(s,'tin-ore',1,true));
  assert.ok(invest(s,'economy',9000).ok);assert.equal(s.gold,91000);assert.equal(portDevelopment(s,p).economy,320);
  assert.equal(s.development.bristol.pendingEconomy,9000);assert.ok(waitInPort(s,29).ok);assert.equal(portDevelopment(s,p).economy,320);
  assert.ok(waitInPort(s,1).ok);assert.equal(portDevelopment(s,p).economy,350);assert.equal(portDevelopment(s,p).industry,380);
  assert.ok(marketGoods(s,p).includes('tin-ore'));assert.ok(!marketGoods(s,p).includes('cotton-cloth'));assert.equal(price(s,p,'tin-ore',true),75);assert.equal(price(s,p,'tin-ore',false),37);
  assert.ok(trade(s,'tin-ore',1,true).ok);assert.equal(portDevelopment(s,portById('dublin')).economy,370);assert.ok(s.events.some(e=>e.text.includes('now sells Tin Ore')));
});

test('buying, partial sales and selling an entire cargo leave every port development value unchanged',()=>{
  for(const p of ports.filter(p=>!p.supplyOnly)){
    const s=createGame();dock(s,p.id);s.gold=100000;
    if(!p.capital){assert.ok(invest(s,'economy',3000).ok);assert.ok(invest(s,'industry',6000).ok);}
    const development=structuredClone(s.development),before=ports.map(port=>portDevelopment(s,port));
    const good=marketGoods(s,p)[0];assert.ok(trade(s,good,7,true).ok,p.id);assert.ok(trade(s,good,3,false).ok,p.id);assert.ok(trade(s,good,s.cargo[good],false).ok,p.id);
    s.cargo['fine-silk']=3;assert.ok(trade(s,'fine-silk',3,false).ok,p.id);
    assert.deepEqual(s.development,development,p.id);assert.deepEqual(ports.map(port=>portDevelopment(s,port)),before,p.id);
    assert.equal(migrateSave(structuredClone(s)).development[p.id]?.economy,s.development[p.id]?.economy,p.id);
  }
});

test('development uses calendar months, per-department limits and a 1,000 point cap',()=>{
  const s=createGame(),p=dock(s,'bristol');s.gold=1000000;s.day=30.5;
  assert.equal(nextMonthDay(s.day),61);assert.ok(invest(s,'economy',50000).ok);assert.equal(investmentLimit(s,p,'economy'),0);
  unchanged(s,()=>invest(s,'economy',300));assert.ok(invest(s,'industry',50000).ok);
  waitInPort(s,30);assert.equal(portDevelopment(s,p).economy,320);waitInPort(s,1);
  assert.equal(portDevelopment(s,p).economy,486);assert.equal(portDevelopment(s,p).industry,546);assert.equal(investmentLimit(s,p,'economy'),50000);
  develop(s,'bristol',999,999);assert.equal(investmentLimit(s,p,'industry'),300);unchanged(s,()=>invest(s,'industry',301));assert.ok(invest(s,'industry',300).ok);waitInPort(s);
  assert.equal(portDevelopment(s,p).industry,1000);assert.equal(investmentLimit(s,p,'industry'),0);
});

test('investments settle while sailing and cannot apply twice after a long harbor wait',()=>{
  const s=createGame();dock(s,'bristol');s.gold=50000;s.day=29.95;invest(s,'economy',9000);
  s.port=null;s.position={x:700,y:300};steer(s,-1,0);advance(s,.1);
  assert.equal(portDevelopment(s,portById('bristol')).economy,350);assert.equal(s.development.bristol.pendingEconomy,0);
  dock(s,'bristol');invest(s,'economy',9000);waitInPort(s,100);assert.equal(portDevelopment(s,portById('bristol')).economy,380);
  assert.deepEqual(settleDevelopment(s,s.day,s.day+100),[]);
});

test('capitals stay fixed, supply anchorages have no market or shipyard, invalid investments do nothing',()=>{
  const s=createGame();s.gold=100000;for(const id of ['lisbon','seville','london','amsterdam','genoa','istanbul']){const p=dock(s,id);assert.equal(p.capital,true);unchanged(s,()=>invest(s,'industry',300));}
  for(const id of ['azores','cape-town']){const p=dock(s,id);assert.equal(p.supplyOnly,true);assert.deepEqual(marketGoods(s,p),[]);assert.deepEqual(shipyardCatalog(s,p),[]);unchanged(s,()=>trade(s,'fish',1,false));unchanged(s,()=>buyShip(s,'balsa'));}
  dock(s,'bristol');for(const [kind,amount] of [['unknown',300],['economy',-300],['economy',299],['economy',1.5],['industry',NaN],['industry',Infinity]])unchanged(s,()=>invest(s,kind,amount));
  s.port=null;unchanged(s,()=>invest(s,'economy',300));unchanged(s,()=>waitInPort(s));
});

test('English, Dutch and Japanese top ships require their own regional Industry',()=>{
  const s=createGame();s.gold=2000000;s.fame=100000;s.day=10000;
  for(const id of ['bristol','dublin']){const p=dock(s,id);develop(s,id,1000,849);assert.equal(shipQuote(s,p,'sloop').ok,false);develop(s,id,1000,850);assert.equal(shipQuote(s,p,'sloop').ok,true);assert.equal(shipQuote(s,p,'barge').ok,false);develop(s,id,1000,1000);assert.ok(shipQuote(s,p,'barge').ok);assert.ok(shipQuote(s,p,'frigate').ok);assert.equal(shipQuote(s,p,'full-rigged-ship').ok,false);}
  for(const id of ['antwerp','hamburg']){const p=dock(s,id);develop(s,id,1000,999);assert.equal(shipQuote(s,p,'full-rigged-ship').ok,false);develop(s,id,1000,1000);assert.ok(shipQuote(s,p,'full-rigged-ship').ok);assert.equal(shipQuote(s,p,'barge').ok,false);}
  for(const id of ['nagasaki','sakai']){const p=dock(s,id);develop(s,id,1000,999);assert.equal(shipQuote(s,p,'tekkousen').ok,false);develop(s,id,1000,1000);assert.ok(shipQuote(s,p,'tekkousen').ok);}
  const p=dock(s,'macau');develop(s,p.id,1000,1000);assert.deepEqual(shipyardCatalog(s,p).map(t=>t.id),['junk']);assert.equal(shipQuote(s,p,'tekkousen').ok,false);
  assert.ok(!shipyardCatalog(s,portById('london')).find(t=>t.id==='barge').available);assert.ok(!shipyardCatalog(s,portById('amsterdam')).find(t=>t.id==='full-rigged-ship').available);
});

test('monthly Industry settlement announces newly available designs',()=>{
  const s=createGame(),p=dock(s,'bristol');s.gold=100000;develop(s,p.id,320,990);invest(s,'industry',3000);waitInPort(s);
  assert.equal(portDevelopment(s,p).industry,1000);assert.ok(s.events.some(e=>e.text.includes('Frigate, Barge')));
});

test('hull materials require development and Tekkousen always uses steel',()=>{
  const s=createGame(),p=dock(s,'bristol');develop(s,p.id,320,699);
  assert.equal(shipQuote(s,p,'caravela-redonda',{material:'oak'}).ok,false);develop(s,p.id,320,700);
  assert.equal(shipQuote(s,p,'caravela-redonda',{material:'oak'}).cost,2640);assert.equal(shipQuote(s,p,'caravela-redonda',{material:'copper'}).ok,false);
  develop(s,p.id,320,1000);assert.equal(shipQuote(s,p,'barge',{material:'steel'}).ok,false);
  const japan=dock(s,'sakai');develop(s,japan.id,420,1000);const quote=shipQuote(s,japan,'tekkousen',{material:'teak'});
  assert.equal(quote.material,'steel');assert.equal(quote.cost,196000);assert.equal(quote.days,72);
  const ship=createShip('tekkousen','Iron ship',{material:'teak'});assert.equal(ship.material,'steel');assert.equal(shipStats(ship).maxHull,126);assert.equal(shipStats(ship).hold,955);
});

test('ship orders charge once, finish on the stated date, and launch only at the ordering yard',()=>{
  const s=createGame(),p=dock(s,'bristol');s.gold=50000;const quote=shipQuote(s,p,'caravela-redonda',{fit:'trade'}),gold=s.gold;
  assert.ok(buyShip(s,'caravela-redonda',{fit:'trade'}).ok);assert.equal(s.gold,gold-quote.cost);assert.equal(s.ships.length,1);assert.equal(s.shipOrders.length,1);
  const order=s.shipOrders[0];assert.equal(order.readyDay,quote.days);assert.equal(shipStats(order.ship).guns,0);assert.equal(shipStats(order.ship).hold,110);
  unchanged(s,()=>collectShip(s,order.ship.id));waitInPort(s,quote.days);dock(s,'dublin');unchanged(s,()=>collectShip(s,order.ship.id));dock(s,'bristol');assert.ok(collectShip(s,order.ship.id).ok);
  assert.equal(s.ships.length,2);assert.equal(s.shipOrders.length,0);assert.equal(s.gold,gold-quote.cost);unchanged(s,()=>collectShip(s,order.ship.id));assert.ok(validateSave(s));
});

test('fittings trade cargo capacity for berths and guns, recruitment charges for assigned berths',()=>{
  const s=createGame();s.gold=100000;const a=s.ships[0];a.hull=15;
  assert.ok(refitShip(s,a.id,{fit:'trade'}).ok);assert.equal(shipStats(a).hold,110);assert.equal(shipStats(a).guns,0);assert.equal(a.hull,15);
  assert.ok(refitShip(s,a.id,{fit:'battle'}).ok);assert.equal(shipStats(a).hold,60);assert.equal(shipStats(a).berths,40);assert.equal(a.crew,10);
  const before=s.gold;assert.ok(recruit(s).ok);assert.equal(a.crew,40);assert.equal(s.gold,before-450);const full=s.gold;recruit(s);assert.equal(s.gold,full);
  assert.ok(refitShip(s,a.id,{fit:'battle',material:'oak'}).ok);assert.equal(shipStats(a).maxHull,33);assert.equal(a.hull,17);assert.ok(validateSave(s));
});

test('refits reject loss of loaded cargo space and unavailable hulls without charging',()=>{
  const s=createGame();s.gold=100000;const a=s.ships[0];s.cargo.fish=40;assert.ok(cargoUsed(s)<=capacity(s));
  unchanged(s,()=>refitShip(s,a.id,{fit:'battle'}));unchanged(s,()=>refitShip(s,a.id,{material:'copper'}));unchanged(s,()=>refitShip(s,a.id,{fit:'unknown'}));
  assert.equal(refitQuote(s,'missing').ok,false);s.port=null;unchanged(s,()=>refitShip(s,a.id));
});

test('crowded battle fleets can provision for a shorter passage without overfilling',()=>{
  const s=createGame();s.gold=100000;s.ships=[createShip('barge','Warship',{fit:'battle'})];s.ships[0].crew=450;s.food=0;s.water=0;
  unchanged(s,()=>resupply(s,50));assert.ok(resupply(s,25).ok);assert.equal(supplyDays(s),25);assert.ok(cargoUsed(s)<=capacity(s));
  for(const days of [-1,0,1.5,NaN,Infinity,366])unchanged(s,()=>resupply(s,days));
});

test('fleet places include construction orders and captures cannot steal a reserved place',()=>{
  const s=createGame(100);s.gold=1000000;for(let i=1;i<MAX_FLEET;i++)assert.ok(buyShip(s,'balsa').ok);
  assert.equal(s.shipOrders.length,9);unchanged(s,()=>buyShip(s,'balsa'));s.port=null;startBattle(s,pirateTemplates[0]);s.battle.enemy.hull=1;s.battle.enemy.crew=1;battleAction(s,'board');
  assert.equal(s.ships.length,1);assert.equal(s.shipOrders.length,9);assert.ok(s.defeated.includes('corsair'));assert.ok(validateSave(s));
});

test('new save data roundtrips and rejects corrupt orders, materials and development',()=>{
  const s=createGame();dock(s,'bristol');s.gold=100000;invest(s,'industry',3000);buyShip(s,'caravela-redonda');assert.ok(validateSave(s));const restored=migrateSave(structuredClone(s));assert.deepEqual(restored.development,s.development);assert.deepEqual(restored.shipOrders,s.shipOrders);
  for(const mutate of [s=>s.development.bristol.industry=1001,s=>s.development.bristol.pendingIndustry=50001,s=>s.shipOrders[0].readyDay=NaN,s=>s.shipOrders[0].port='azores',s=>s.shipOrders[0].ship.id=s.ships[0].id,s=>s.ships[0].material='unknown',s=>s.ships[0].material='steel',s=>s.ships[0].berths=-10,s=>s.ships[0].guns=Infinity]){const bad=structuredClone(s);mutate(bad);assert.equal(validateSave(bad),false);}
});

test('version 1 and 2 voyages keep every original hull, fitting and cargo with an investment refund',()=>{
  for(const version of [1,2]){
    const old=createGame();old.version=version;if(version===1)old.seen=[10,11];old.gold=9300;old.investments={lisbon:3,london:2};old.cargo={cloth:12,silk:7,spices:4,wine:5,ivory:3,sugar:6};old.ships=Object.entries(legacyShipTypes).map(([type,t])=>({id:type,type,name:type,hull:t.hull-10,crew:t.crew-2}));
    const restored=migrateSave(structuredClone(old));assert.ok(restored);assert.equal(restored.version,4);assert.equal(restored.gold,21900);assert.deepEqual(restored.investments,{});assert.deepEqual(restored.development,{});assert.equal(restored.cargo['fine-silk'],7);assert.equal(restored.cargo.silk,undefined);
    for(const ship of restored.ships){const t=legacyShipTypes[ship.type],stats=shipStats(ship);assert.equal(ship.hull,t.hull-10);assert.equal(ship.crew,t.crew-2);assert.equal(stats.maxHull,t.hull);assert.equal(stats.hold,t.hold);assert.equal(stats.guns,t.guns);}
    unchanged(restored,()=>refitShip(restored,restored.ships[0].id));unchanged(restored,()=>trade(restored,'cloth',1,true));assert.ok(trade(restored,'cloth',1,false).ok);assert.ok(trade(restored,'fine-silk',1,false).ok);assert.ok(validateSave(restored));
    const gold=restored.gold;assert.equal(migrateSave(structuredClone(restored)).gold,gold);
  }
});
