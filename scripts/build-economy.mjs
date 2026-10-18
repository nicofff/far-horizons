import { readFile, writeFile } from 'node:fs/promises';
const catalog=JSON.parse(await readFile(new URL('../economy/catalog.json',import.meta.url),'utf8'));
const selected=JSON.parse(await readFile(new URL('../geography/ports.json',import.meta.url),'utf8'));
const inRange=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
for(const [type,rows] of Object.entries(catalog.markets))for(const row of rows){
  if(!catalog.goods[row.good]||!inRange(row.economy,0,1000)||!inRange(row.price,1,100000))throw new Error('Invalid market entry: '+type);
}
for(const [id,g] of Object.entries(catalog.goods))if(!g.legacy){
  if(!g.name||Object.keys(catalog.markets).some(type=>!inRange(g.sell?.[type],1,100000)))throw new Error('Invalid commodity: '+id);
}
for(const {id} of selected){
  const p=catalog.ports[id];
  if(!p||!inRange(p.economy,0,1000)||!inRange(p.industry,0,1000))throw new Error('Missing port development: '+id);
  if(p.supplyOnly)continue;
  if(!catalog.markets[p.market]||!/^[A-K]$/.test(p.shipyard))throw new Error('Invalid port region: '+id);
  if(p.specialty&&(!catalog.goods[p.specialty]||!inRange(p.specialtyPrice,1,100000)||!inRange(p.specialtyEconomy,0,1000)))throw new Error('Invalid specialty: '+id);
}
for(const [id,t] of Object.entries(catalog.ships)){
  if(!/^[A-K]+$/.test(t.shipyards)||!inRange(t.industry,0,1000)||!inRange(t.minCrew,1,t.maxCrew)||t.capacity<t.maxCrew+t.guns||t.hull<=0||t.cost<=0)throw new Error('Invalid ship: '+id);
}
for(const [id,m] of Object.entries(catalog.materials))if(!inRange(m.industry,0,1000)||!Number.isFinite(m.factor)||m.factor<=0||m.exclusive&&!catalog.ships[m.exclusive])throw new Error('Invalid hull material: '+id);
await writeFile(new URL('../assets/economy-catalog.js',import.meta.url),'export const economyCatalog='+JSON.stringify(catalog)+';\n');
console.log(`${Object.keys(catalog.goods).length} goods, ${Object.keys(catalog.ships).length} ship types, ${Object.keys(catalog.ports).length} ports`);
