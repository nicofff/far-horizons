import { createGame, createShip, shipStats, crewCount, capacity, cargoUsed, supplyDays, rationRate, resupply, repair, recruit, trade, price, portById, portDevelopment, marketCatalog, shipyardCatalog, currentWind, fleetSpeed, availableGuildJobs, acceptGuildJob } from '../../engine.js';
import { goods, ports } from '../../data.js';
import { localSpecialists, chartReport, signContract, meetSpecialist } from '../../specialists.js';
import { guildTypes, guildObjective } from '../../guild.js';
import { portraitUrl } from '../../portraits.js';
import { shipSpriteUrl } from '../../ship-sprites.js';
import { createSeaBackground } from '../../sea-background.js';
import { onLand } from '../../terrain.js';
import { windReport } from '../../wind.js';
import { text, drawTown, drawShip } from '../../pixel.js';

const $=selector=>document.querySelector(selector),fmt=value=>Math.ceil(value).toLocaleString('en-US');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={board:'Direct commands',town:'Harbor hub',ledger:'Tabbed logbook'};
const notes={board:'A / One direct list. Port services first; your ships, cargo and journal below.',town:'B / A bottom command window. Separate what you do ashore from what you manage aboard.',ledger:'C / A tabbed logbook. One consistent menu for Port, Ships, Cargo and Journal.'};
const sections=[['port','Port','Services & people'],['fleet','Ships','Ships & crew'],['cargo','Cargo','Goods & provisions'],['journal','Journal','Quests, reports & contacts']];
const services=[['supplies','Harbor supplies','Load food & water','01'],['market','Market','Buy & sell cargo','02'],['shipyard','Shipyard','Build, repair & refit','03'],['cafe','Crew café','Recruit to vacant berths','04'],['guild','Guild','Find work & report back','05'],['residents','Residents','Collectors & teachers','06']];
const titles={voyage:'Voyage status',overview:'Lisbon / Harbor',supplies:'Harbor supplies',market:'Market',shipyard:'Shipyard',cafe:'Crew café',guild:'Guild',residents:'Residents',ships:'Your ships',crew:'Crew & berths',goods:'Cargo hold',provisions:'Provisions',quests:'Quest log',reports:'Charts & discoveries',contacts:'Contacts',marco:'The Franco residence',development:'Port development',build:'Build a ship'};
let layout=new URLSearchParams(location.search).get('layout')||'board',scene='port',section='port',page='overview',supplyTarget=25,feedback=null,charted=false,offers=null,s;
if(!labels[layout])layout='board';
function reset(){
  s=createGame(7);s.ships.push(createShip('hansa-cog','Estrela',{fit:'trade'}));
  s.ships.forEach((ship,i)=>{ship.crew=Math.max(1,ship.crew-(i?3:2));ship.hull=Math.floor(ship.hull*(i?.93:.86));});
  s.day=13;s.gold=7200;s.food=rationRate(s)*18;s.water=rationRate(s)*22;s.cargo={'cotton-cloth':18,wine:6};
  s.speed=4;scene='port';section='port';page='overview';charted=false;feedback=null;offers=null;supplyTarget=25;
}
reset();
const home=portById('lisbon'),background=createSeaBackground({x:0,y:0,width:512,height:384,scale:40},onLand);
const berthCount=()=>s.ships.reduce((n,a)=>n+shipStats(a).berths,0),missingCrew=()=>berthCount()-crewCount(s);
const damage=()=>s.ships.reduce((n,a)=>n+shipStats(a).maxHull-a.hull,0);
const button=(action,label,enabled=true,primary=false)=>`<button class="paper-button${primary?' primary':''}" data-action="${action}" ${enabled?'':'disabled'}>${label}</button>`;
function globalNav(className='top-nav'){
  return `<nav class="${className}" aria-label="Main game sections">${sections.map(([id,name,hint])=>`<button data-section="${id}" aria-current="${section===id?'page':'false'}" ${id==='port'&&scene==='sea'?'disabled':''}>${name}${className==='primary-nav'?`<small>${hint}</small>`:''}</button>`).join('')}</nav>`;
}

function cards(){return `<div class="service-grid">${services.map(([id,name,hint,n])=>`<button class="service" data-page="${id}"><span class="symbol">${n}</span><strong>${name}</strong><small>${hint}</small></button>`).join('')}</div>`;}
function tabs(){
  const lists={fleet:[['ships','Ships'],['crew','Crew']],cargo:[['goods','Goods'],['provisions','Provisions']],journal:[['quests','Quests'],['reports','Reports'],['contacts','Contacts']]};
  return lists[section]?`<div class="subtabs" role="tablist">${lists[section].map(([id,name])=>`<button role="tab" aria-selected="${page===id}" data-page="${id}">${name}</button>`).join('')}</div>`:'';
}
function fleetRows(){return s.ships.map((a,i)=>{const t=shipStats(a);return `<div class="ship-detail"><img class="ship-art" src="${shipSpriteUrl(a.type)}" alt="${esc(t.name)}"><div><h3>${a.name}${i===0?' / Flagship':''}</h3><p>${t.name}<br>Hull ${fmt(a.hull)} / ${t.maxHull} · Crew ${a.crew} / ${t.berths}<br>${t.hold} hold · ${t.guns} guns</p></div></div>`;}).join('');}
function content(){
  let body='';
  if(page==='overview')body=`<div class="callout">The crew is ashore. Choose a service below.<br>${missingCrew()?`${missingCrew()} crew berths are empty.`:'Your crew is ready.'} Provisions last ${supplyDays(s)} days.</div>${cards()}<div class="action-row">${button('development','Invest in Lisbon')}${button('depart','Set sail…',true,true)}</div>`;
  if(page==='supplies'||page==='provisions'){
    const target=supplyTarget*rationRate(s),food=Math.max(0,target-s.food),water=Math.max(0,target-s.water),cost=Math.ceil(food*2);
    body=`${page==='provisions'?'<p>Food and water share the hold with trade goods. Both must last the passage.</p>':''}<div class="detail-row"><span>Food aboard</span><strong>${fmt(s.food)} units</strong></div><div class="detail-row"><span>Water aboard</span><strong>${fmt(s.water)} units</strong></div><div class="detail-row"><span>Daily use</span><strong>${rationRate(s).toFixed(1)} of each</strong></div><div class="callout ${supplyDays(s)>=25?'good':''}">Current stores last <strong>${supplyDays(s)} days</strong>.</div>${scene==='port'?`<label class="supply-picker">Provision for<select id="days">${[10,25,50,100].map(n=>`<option value="${n}" ${n===supplyTarget?'selected':''}>${n} days</option>`).join('')}</select></label><p>Load ${fmt(food)} food and ${fmt(water)} water.<br>Water is free. Food costs ${fmt(cost)} gold.</p><div class="action-row">${button('load',food||water?`Load supplies / ${fmt(cost)} G`:'Already stocked',!!(food||water),true)}</div>`:'<p>Load more supplies at your next harbor.</p>'}`;
  }
  if(page==='voyage'){const wind=windReport(currentWind(s));body=`<p>14 April 1522 / ${scene==='port'?'At anchor in Lisbon':'Passage to Madeira'}</p><div class="detail-row"><span>Provisions remaining</span><strong>${supplyDays(s)} days</strong></div><div class="detail-row"><span>Wind from</span><strong>${wind.from} / ${wind.speed.toFixed(1)} kt</strong></div><div class="detail-row"><span>Fleet speed</span><strong>${(fleetSpeed(s)*12/24).toFixed(1)} knots</strong></div><div class="detail-row"><span>Crew morale</span><strong>${s.morale}%</strong></div><p class="empty-note">Food and water are in Cargo → Provisions. Hull condition and crew are in Ships.</p><div class="action-row">${button('provisions','Inspect provisions')}${button('ships','Inspect ships')}${button('chart','Recorded chart')}</div>`;}
  if(page==='market'){
    const catalog=marketCatalog(s,home).filter(r=>r.available),ids=[...new Set([...catalog.map(r=>r.good),...Object.keys(s.cargo).filter(id=>s.cargo[id])])];
    body=`<p>Buy local goods. Sell cargo from your hold.</p><table class="trade-table"><thead><tr><th>Goods</th><th>Buy</th><th>Sell</th><th>Aboard</th><th>Trade</th></tr></thead><tbody>${ids.map(id=>`<tr><td>${goods[id].name}${id===home.specialty?'<small>Local specialty</small>':''}</td><td>${price(s,home,id,true)} G</td><td>${price(s,home,id,false)} G</td><td>${s.cargo[id]||0}</td><td><div class="trade-actions">${catalog.some(r=>r.good===id)?button('buy:'+id,'Buy 5'):''}${button('sell:'+id,'Sell all',!!s.cargo[id])}</div></td></tr>`).join('')}</tbody></table><div class="action-row">${button('goods','Inspect cargo hold')}${button('development','Invest in Economy')}</div>`;
  }
  if(page==='goods')body=`<p>Your trade goods, across the whole fleet.</p>${Object.entries(s.cargo).filter(([,n])=>n).map(([id,n])=>`<div class="detail-row"><span>${goods[id].name}</span><strong>${n} units</strong></div>`).join('')||'<p>No trade goods aboard.</p>'}<div class="detail-row"><span>Total hold used<small>Includes food & water</small></span><strong>${fmt(cargoUsed(s))} / ${capacity(s)}</strong></div><div class="action-row">${button('market','Go to the market',scene==='port')}${button('provisions','Inspect provisions')}</div>`;
  if(page==='ships')body=`<p>Manage your vessels here. Trade goods live under Cargo; assignments live under Journal.</p>${fleetRows()}<div class="action-row">${button('shipyard','Visit shipyard',scene==='port')}${button('crew','Inspect crew')}</div>`;
  if(page==='crew'||page==='cafe')body=`${page==='cafe'?'<p>The café is where captains meet sailors looking for a berth.</p>':'<p>Assigned berths determine how many sailors each ship can carry.</p>'}${s.ships.map(a=>`<div class="detail-row"><span>${a.name}<small>${shipStats(a).name}</small></span><strong>${a.crew} / ${shipStats(a).berths}</strong></div>`).join('')}<div class="callout ${missingCrew()?'':'good'}">${missingCrew()?`${missingCrew()} empty berths. Recruit sailors for 15 gold each.`:'All assigned berths are filled. Your crew is ready.'}</div><div class="action-row">${button('recruit',missingCrew()?`Recruit ${missingCrew()} sailors / ${missingCrew()*15} G`:'Fully crewed',missingCrew()>0&&scene==='port',true)}${button('ships','Inspect ships')}</div><p class="empty-note">Need a larger crew? Assign more berths when building or refitting at the shipyard.</p>`;
  if(page==='shipyard')body=`<p>Keep the fleet seaworthy, or commission another ship.</p>${fleetRows()}<div class="action-row">${button('repair',damage()?`Repair fleet / ${fmt(damage()*5)} G`:'Hulls fully repaired',damage()>0,true)}${button('build','See ship designs')}${button('development','Invest in Industry')}</div>`;
  if(page==='build')body=`<p>Designs available in Lisbon. Industry determines what the yard can build.</p>${shipyardCatalog(s,home).slice(0,6).map(t=>`<div class="ship-detail"><img class="ship-art" src="${shipSpriteUrl(t.id)}" alt=""><div><h3>${t.name}</h3><p>${t.capacity} total capacity<br>${t.available?`${fmt(t.cost)} G / Available`:`Requires ${t.industry} Industry`}</p></div></div>`).join('')}<div class="action-row">${button('shipyard','Back to shipyard')}</div>`;
  if(page==='guild'){
    offers ||= availableGuildJobs(s);
    body=s.guild.active?`<div class="callout good">Your current assignment</div><p>${esc(guildObjective(s,s.guild.active))}</p><div class="action-row">${button('quests','Open quest log',true,true)}</div>`:`<p>Accept one assignment at a time. Your orders stay in Journal → Quests.</p>${offers.map(q=>`<div class="quest-type">${guildTypes[q.kind].name}<small>${esc(guildObjective(s,q))}<br>${fmt(q.fee)} G / ${q.days} days</small><div class="action-row">${button('accept:'+q.kind,'Accept assignment')}</div></div>`).join('')}`;
  }
  if(page==='quests')body=s.guild.active?`<div class="callout good">${guildTypes[s.guild.active.kind].name}</div><p>${esc(guildObjective(s,s.guild.active))}</p><p>Fee ${fmt(s.guild.active.fee)} gold.<br>${Math.ceil(s.guild.active.due-s.day)} days remain.</p><div class="action-row">${button('depart','Plan the passage',scene==='port',true)}</div>`:`<p>No active assignment.</p><p class="empty-note">Visit a guild in a trading port to find letter deliveries, cargo jobs, debt collections, and pirate bounties.</p><div class="action-row">${button('guild','Visit the Lisbon guild',scene==='port',true)}</div>`;
  if(page==='residents'||page==='contacts')body=`<p>${page==='contacts'?'People you can return to for reports and training.':'People in Lisbon have services of their own.'}</p>${localSpecialists('lisbon').map(person=>`<button class="service" data-page="marco"><strong>${person.name}</strong><small>${person.place} / ${person.kind==='collector'?'Discovery reports':person.kind}</small></button>`).join('')}<p class="empty-note">Cartographers and teachers have their own home ports. Their addresses belong here once you meet them.</p>`;
  if(page==='marco'){
    const person=localSpecialists('lisbon')[0],contract=s.expedition.collector===person.id;
    body=`<div class="person"><img class="portrait" src="${portraitUrl(person)}" alt="Butler Marco"><div><h3>Butler Marco</h3><p>Collector / Lisbon</p><p>“${esc(person.greeting)}”</p></div></div><h3>Discovery reports</h3><p>${contract?'Your contract is signed. Bring new discovery reports here for payment.':'Sign a contract to receive payment for your discoveries.'}</p><div class="action-row">${button('contract',contract?'Contract signed':'Sign a reporting contract',!contract,true)}${button('reports','See expedition reports')}</div>`;
  }
  if(page==='reports')body=`<p>Discoveries and chart surveys ready for your patrons.</p><div class="detail-row"><span>New chart squares</span><strong>${chartReport(s).squares}</strong></div><div class="detail-row"><span>Discovery reports</span><strong>0 ready</strong></div><p class="empty-note">Cartographers buy chart surveys. Collectors buy discovery reports. Visit them in their home ports to submit your work.</p><div class="action-row">${button('contacts','Find your contacts')}</div>`;
  if(page==='development'){
    const d=portDevelopment(s,home);
    body=`<p>Lisbon is a capital. Its development is fixed.</p><div class="detail-row"><span>Economy<small>Unlocks trade goods</small></span><strong>${d.economy}</strong></div><div class="detail-row"><span>Industry<small>Unlocks ship designs & hull materials</small></span><strong>${d.industry}</strong></div><p class="empty-note">Invest in other trading ports to develop their markets and shipyards.</p><div class="action-row">${button('market','Inspect local goods')}${button('build','Inspect ship designs')}</div>`;
  }
  return `${tabs()}${body}${feedback?`<p class="feedback ${feedback.ok?'':'error'}" role="status">${esc(feedback.message)}</p>`:''}`;
}
function pageSection(id){return ['ships','crew'].includes(id)?'fleet':['goods','provisions'].includes(id)?'cargo':['quests','reports','contacts'].includes(id)?'journal':id==='marco'?'port':'port';}
function switchPage(id){page=id;section=pageSection(id);charted=false;feedback=null;render();}
function sceneCaption(){return `<div class="scene-caption"><span>${scene==='port'?'LISBON':'BOUND FOR MADEIRA'}<small>${scene==='port'?'AT ANCHOR / TIME PAUSED':'ATLANTIC / FAIR WIND'}</small></span><span>14 APR 1522<small>${fmt(s.gold)} G / ${supplyDays(s)} DAYS OF STORES</small></span></div>`;}
function commands(){
  return `<div class="command-columns"><div><h3>Ashore</h3>${services.map(([id,name])=>`<button data-page="${id}">${name}</button>`).join('')}</div><div><h3>Aboard</h3><button data-section="fleet">Ships & crew</button><button data-section="cargo">Cargo & provisions</button><button data-section="journal">Journal & reports</button><button data-page="voyage">Voyage status</button><button data-action="depart">Set sail…</button></div></div>`;
}
function directory(){return `<div class="directory"><h3>Port services</h3>${services.map(([id,name,hint])=>`<button data-page="${id}"><span>${name}</span><small>${hint}</small></button>`).join('')}<h3>Your voyage</h3><button data-page="voyage"><span>Voyage status</span><small>Wind, speed & stores</small></button><div class="voyage-links"><button data-section="fleet">Ships & crew</button><button data-section="cargo">Cargo & provisions</button><button data-section="journal">Journal & reports</button></div><button class="depart-command" data-action="depart">Set sail… →</button></div>`;}
function menu(){
  const overview=page==='overview',classes=layout==='town'&&overview?'menu bottom-menu':layout==='ledger'?'menu logbook':'menu centered-menu';
  const heading=overview?'Lisbon / Port':titles[page];
  return `<section class="${classes}" aria-label="${heading}"><header class="menu-heading"><h2>${heading}</h2>${!overview?'<button data-page="overview" aria-label="Return to port menu">← Port</button>':''}</header>${layout==='ledger'?globalNav():''}<div class="menu-content paper-body">${overview?(layout==='board'?directory():layout==='town'?commands():`<p class="welcome">Choose a port service.</p>${cards()}<div class="readiness"><span>${supplyDays(s)} days of provisions</span><span>${missingCrew()?missingCrew()+' empty crew berths':'Crew ready'}</span><span>${damage()?fmt(damage())+' hull points to repair':'Hulls sound'}</span></div><div class="action-row">${button('voyage','Voyage status')}${button('depart','Set sail… →',true,true)}</div>`):content()}</div><footer class="menu-footer">${overview?'Time is paused in port.':'Esc / Return to port'}${feedback&&overview?' / '+esc(feedback.message):''}</footer></section>`;
}
function render(){
  const root=$('#study');root.dataset.layout=layout;root.dataset.scene=scene;
  $('#concept-note').textContent=notes[layout];
  document.querySelectorAll('button[data-layout]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.layout===layout)));
  document.querySelectorAll('button[data-scene]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.scene===scene)));
  const showMenu=!charted&&(scene==='port'||page!=='overview');
  root.innerHTML=`<div class="playfield"><canvas id="scene" width="512" height="384" role="img" aria-label="${charted?'Recorded chart':'Local sailing view at Lisbon'}"></canvas>${charted?'':sceneCaption()}${showMenu?menu():charted?'<button class="sea-return" data-action="chart">← Local view</button>':`<div class="sea-commands"><button data-section="fleet">Ships</button><button data-section="cargo">Cargo</button><button data-section="journal">Journal</button><button data-page="voyage">Voyage</button><button data-action="return">Return to port</button></div>`}</div>`;
  paintScene();
}

function paintScene(){
  const c=$('#scene').getContext('2d');c.imageSmoothingEnabled=false;
  if(charted){
    c.fillStyle='#293653';c.fillRect(0,0,512,384);c.fillStyle='#35405a';for(let x=0;x<512;x+=24)c.fillRect(x,0,1,384);for(let y=0;y<384;y+=24)c.fillRect(0,y,512,1);
    const scale=5,point=p=>({x:250+(p.x-home.x)*scale,y:170+(p.y-home.y)*scale});
    for(const id of s.seen){const x=id%900*2,y=Math.floor(id/900)*2,p=point({x,y});c.fillStyle=onLand(x,y)?'#91a878':'#2a6888';c.fillRect(p.x,p.y,10,10);}
    for(const port of ports.filter(p=>s.known.includes(p.id))){const p=point(port);c.fillStyle='#f8cb70';c.fillRect(p.x-2,p.y-2,5,5);text(c,port.name,p.x+7,p.y-3,'#f4e7b5');}
    text(c,'RECORDED WATERS',12,12,'#f8cb70');return;
  }
  {
    const position=scene==='sea'?{x:home.x-3.5,y:home.y+1.5}:{x:home.x-.6,y:home.y+.6};background.draw(c,position,900,13);background.drawWaves(c,position,900,13);background.drawScenery(c,position,13);
    const town={x:256+(home.town.x-position.x)*40,y:192+(home.town.y-position.y)*40};drawTown(c,town.x,town.y);drawShip(c,256,192,{type:s.ships[0].type,flip:true});return;
  }
}

$('#options').addEventListener('click',e=>{const b=e.target.closest('[data-layout]');if(!b)return;layout=b.dataset.layout;history.replaceState(null,'','?layout='+layout);render();});
document.querySelector('.scene-toggle').addEventListener('click',e=>{const b=e.target.closest('[data-scene]');if(!b)return;scene=b.dataset.scene;section='port';page='overview';charted=false;feedback=null;render();});
$('#reset').onclick=()=>{reset();render();};
$('#study').addEventListener('change',e=>{if(e.target.id==='days'){supplyTarget=Number(e.target.value);feedback=null;render();}});
$('#study').addEventListener('click',e=>{
  const node=e.target.closest('button');if(!node||node.disabled)return;
  if(node.dataset.section){section=node.dataset.section;switchPage({port:'overview',fleet:'ships',cargo:'goods',journal:'quests'}[section]);return;}
  if(node.dataset.page){switchPage(node.dataset.page);return;}
  const action=node.dataset.action;if(!action)return;
  if(['voyage','development','ships','shipyard','crew','goods','provisions','contacts','reports','quests','market','build'].includes(action)){switchPage(action);return;}
  if(action==='depart'||action==='return'){scene=action==='depart'?'sea':'port';section='port';page='overview';charted=false;feedback=null;render();return;}
  if(action==='chart'){charted=!charted;render();return;}
  let result;
  if(action==='load')result=resupply(s,supplyTarget);
  if(action==='recruit')result=recruit(s);
  if(action==='repair')result=repair(s);
  if(action==='contract'){const person=localSpecialists('lisbon')[0];meetSpecialist(s,person.id);result=signContract(s,person.id);}
  if(action.startsWith('buy:'))result=trade(s,action.slice(4),5,true);
  if(action.startsWith('sell:')){const id=action.slice(5);result=trade(s,id,s.cargo[id]||0,false);}
  if(action.startsWith('accept:')){result=acceptGuildJob(s,action.slice(7));offers=null;}
  if(result){feedback=result;render();}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&page!=='overview'){switchPage('overview');return;}if(e.ctrlKey||e.metaKey||e.altKey||e.target.tagName==='SELECT')return;const id={a:'board',b:'town',c:'ledger'}[e.key.toLowerCase()];if(id){layout=id;history.replaceState(null,'','?layout='+layout);render();}});
render();
