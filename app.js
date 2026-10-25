import { ports, discoveries, goods, shipTypes, hullMaterials } from './data.js';
import { createGame, migrateSave, advance, crewCount, capacity, cargoUsed, supplyDays, rationRate, fleetSpeed, currentWind, sailingHeading, estimatedPassage, portById, plotCourse, cancelCourse, steer, trade, maxBuyQuantity, fillHold, price, resupply, repair, recruit, buyShip, collectShip, waitInPort, refitShip, refitQuote, MAX_FLEET, shipStats, shipQuote, shipyardCatalog, portDevelopment, marketCatalog, investmentLimit, nextMonthDay, formatDate, invest, visiblePirates, startBattle, battleAction, distance, inSight } from './engine.js';
import { lessons, specialistById, localSpecialists, hasSkill, meetSpecialist, chartReport, discoveryReport, signContract, reportCharts, reportDiscoveries, learnSkill, collectorRumour, askDirections } from './specialists.js';
import { availableGuildJobs, acceptGuildJob, completeGuildJob, collectGuildDebt, abandonGuildJob } from './engine.js';
import { guildTypes, hasGuild, checkGuildDeadline, guildObjective, guildDeliveryPort, guildReady } from './guild.js';
import { portraitUrl } from './portraits.js';
import { shipSpriteUrl } from './ship-sprites.js';
import { createChart } from './chart.js';
import { createMusic } from './music.js';
import { createSimulationLoop } from './simulation-loop.js';
import { windReport } from './wind.js';
import { musicRegions, regionById, regionTunes } from './music-score.js';
import { helpMarkup } from './menu-help.js';

const $=id=>document.getElementById(id),fmt=n=>Math.floor(n).toLocaleString('en-US');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function timeIcon(rows,count=1){
  const points=rows.flatMap((row,y)=>[...row].flatMap((pixel,x)=>pixel==='1'?[{x,y}]:[])),left=Math.min(...points.map(p=>p.x)),width=Math.max(...points.map(p=>p.x))-left+1,rects=[];
  for(let n=0;n<count;n++)for(const {x,y}of points)rects.push(`<rect x="${n*(width+1)+x-left}" y="${y}" width="1" height="1"/>`);
  return `<svg class="time-icon" aria-hidden="true" viewBox="0 0 ${count*(width+1)-1} ${rows.length}" fill="currentColor" shape-rendering="crispEdges">${rects.join('')}</svg>`;
}
const chevron=['10000','01000','00100','00010','00100','01000','10000'];
const timeIcons={pause:timeIcon(Array(7).fill('11011')),play:timeIcon(['10000','11000','11100','11110','11100','11000','10000']),1:timeIcon(chevron),4:timeIcon(chevron,2),16:timeIcon(chevron,3)};
const SAVE_KEY='far-horizons-v1';let yardMaterial='beech',yardFit='standard';let state,modalType=null,tradeQuantity=5,lastPort,saveAvailable=true,saveTime=0;
const supplyOptions=[10,25,50,100];
const steeringKeys=new Set(),directionKeys=new Set(['arrowleft','a','arrowright','d','arrowup','w','arrowdown','s']);let controlsInset=34;
try{const raw=localStorage.getItem(SAVE_KEY);state=raw?migrateSave(JSON.parse(raw)):null;}catch{saveAvailable=false;}
state ||= createGame();state.paused=true;lastPort=state.port;
const modal=$('modal');
for(const event of ['pointerdown','pointerup','pointermove','wheel'])modal.addEventListener(event,e=>e.stopPropagation());
document.querySelectorAll('.play-controls').forEach(controls=>{for(const event of ['pointerdown','pointerup','pointermove','wheel'])controls.addEventListener(event,e=>e.stopPropagation());});
function fitMenus(){
  const screen=$('screen'),root=document.documentElement;
  root.style.setProperty('--ui-scale',Math.max(1,screen.getBoundingClientRect().width/1024));
  const rect=screen.getBoundingClientRect();
  const strip=$('command-strip').getBoundingClientRect();controlsInset=Math.ceil((rect.bottom-strip.top)/rect.height*384);
  root.style.setProperty('--menu-height',Math.max(100,strip.top-rect.top-12)+'px');
  for(const [key,value] of Object.entries({top:rect.top,left:rect.left,width:rect.width,height:rect.height}))root.style.setProperty('--screen-'+key,value+'px');
}
new ResizeObserver(fitMenus).observe($('screen'));window.addEventListener('resize',fitMenus);document.fonts.ready.then(fitMenus);fitMenus();
const chart=createChart($('chart'),()=>state,{bottomInset:()=>controlsInset,port:showHarbor,fleet:showFleet,log:showLog,menu:showCommands,pause:togglePause,speed:cycleSpeed,select:showPort,landmark:showLandmark,course,enemy:showEnemy,mode:()=>{steeringKeys.clear();updateStatus();}});
function notify(message){chart.notify(message);$('status').textContent=message;}
const music=createMusic({heard:()=>state.songbook,onTune:tune=>{if(state.songbook.includes(tune.id))return;state.songbook.push(tune.id);save();notify(`New song: ${tune.name}, ${regionById(tune.region).name}. Added to your songbook.`);}});
for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>music.unlock(),{capture:true});
function toggleMusic(){music.setEnabled(!music.enabled);notify(music.enabled?'Music on.':'Music off.');if(modalType==='settings')showSettings();}
function save(announce=false){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));saveAvailable=true;if(announce)notify('Voyage saved.');}catch{saveAvailable=false;if(announce)notify('Browser storage unavailable. Export your voyage from the voyage menu.');}}
function result(r){notify(r.message);if(r.ok){save();updateStatus();}return r.ok;}
function transact(r,render){const ok=result(r);if(ok)render();const feedback=$('menu-feedback');if(feedback){feedback.textContent=r.message;feedback.hidden=false;}return ok;}
function updateStatus(refresh=true){if(refresh){chart.refresh();wakeSimulation();}const p=portById(state.port);$('status').textContent=`${p?'At anchor in '+p.name:state.paused?'Holding position':'Under sail'}. ${supplyDays(state)} days of provisions. ${state.ships.length} ships. ${fmt(state.gold)} gold.`;
  const speed=$('speed-button'),pause=$('pause-button'),next=state.speed===1?4:state.speed===4?16:1;
  speed.innerHTML=timeIcons[state.speed];speed.title=`Travel speed ${state.speed}X. Change to ${next}X.`;speed.setAttribute('aria-label',speed.title);
  pause.innerHTML=state.paused?timeIcons.play:timeIcons.pause;pause.title=state.paused?'Resume sailing':'Pause sailing';pause.setAttribute('aria-label',pause.title);pause.setAttribute('aria-pressed',String(state.paused));pause.disabled=!!(p||state.battle||state.lost||!sailingHeading(state));
  $('chart-button').setAttribute('aria-pressed',String(chart.mode==='chart'));
}
function showModal(type,title,body,subtitle=''){
  steeringKeys.clear();state.paused=true;modalType=type;modal.dataset.menu=type;delete modal.dataset.help;
  const canBack=!['harbor','commands','battle','lost'].includes(type),hub=type==='harbor';
  $('modal-content').innerHTML=`<div id="menu-page"><header class="menu-header"><div class="menu-heading"><h1 id="menu-title">${title}</h1>${subtitle?`<p class="menu-subtitle">${esc(subtitle)}</p>`:''}</div><div class="menu-header-actions">${canBack?'<button class="menu-back" id="menu-back">← Back</button>':''}<button class="menu-close" aria-label="Close menu">×</button></div></header><div class="menu-body"><p id="menu-feedback" class="notice" role="status" hidden></p>${body}</div><footer class="menu-footer">${hub?`<span>${fmt(state.gold)} G · ${supplyDays(state)} supply days</span>`:'<span></span>'}<button id="menu-help">Help</button></footer></div>`;
  modal.setAttribute('aria-labelledby','menu-title');
  modal.querySelector('.menu-close').onclick=closeModal;if($('menu-back'))$('menu-back').onclick=menuBack;$('menu-help').onclick=showHelp;
  if(!modal.open)modal.showModal();modal.scrollTop=0;updateStatus();
  modal.querySelector('.menu-body button:not(:disabled)')?.focus({preventScroll:true});
}
function closeHelp(){
  $('help-page')?.remove();$('menu-page').hidden=false;delete modal.dataset.help;modal.setAttribute('aria-labelledby','menu-title');$('menu-help').focus({preventScroll:true});
}
function closeModal(){if(modal.dataset.help){closeHelp();return;}if(state.battle)return;modal.close();modalType=null;$('screen').querySelector('canvas').focus({preventScroll:true});updateStatus();}
function menuBack(){
  if(modal.dataset.help)return closeHelp();
  const parents={crew:showFleet,provisions:showCargo,refit:showFleet,specialist:showResidents,'guild-contact':showCafe,'guild-abandon':showQuestLog,quests:showJournal,reports:showJournal,contacts:showJournal,log:showJournal,songbook:showJournal,reset:showSettings};
  (parents[modalType]||(state.port?showHarbor:showCommands))();
}
modal.addEventListener('close',()=>chart.refresh());
modal.addEventListener('cancel',e=>{e.preventDefault();if(modal.dataset.help)closeHelp();else if(state.battle)return;else if(['harbor','commands','lost'].includes(modalType))closeModal();else menuBack();});
modal.addEventListener('keydown',e=>{
  if(['ArrowDown','ArrowUp'].includes(e.key)&&!['INPUT','SELECT'].includes(document.activeElement.tagName)){
    e.preventDefault();const root=$(modal.dataset.help?'help-page':'menu-page'),items=[...root.querySelectorAll('button:not(:disabled),summary')].filter(el=>el.getClientRects().length),i=items.indexOf(document.activeElement),next=(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next]?.focus();
  }
});

function menuButton(id,label,enabled=true){return `<button id="${id}" ${enabled?'':'disabled'}>${label}</button>`;}
function showCommands(){
  if(state.battle)return showBattle();if(state.port)return showHarbor();
  showModal('commands','At sea',`<div class="hub-columns"><section><h2>Navigation</h2><div class="menu-actions">${menuButton('cmd-view','Lookout')}${menuButton('cmd-auto','Set course…')}${menuButton('cmd-chart','Recorded chart')}</div></section><section><h2>Aboard</h2><div class="menu-actions">${menuButton('cmd-fleet','Ships & crew')}${menuButton('cmd-cargo','Cargo & provisions')}${menuButton('cmd-journal','Journal & reports')}${menuButton('cmd-sail','Voyage status')}${menuButton('cmd-voyage','Save & options')}</div></section></div>`);
  $('cmd-view').onclick=showNearby;$('cmd-auto').onclick=showAutoSail;$('cmd-chart').onclick=()=>{closeModal();chart.world();};$('cmd-fleet').onclick=showFleet;$('cmd-cargo').onclick=showCargo;$('cmd-journal').onclick=showJournal;$('cmd-sail').onclick=showSailData;$('cmd-voyage').onclick=showSettings;
}

function residentCard(person,attribute='specialist'){
  return `<button class="resident-card" data-${attribute}="${person.id}"><img src="${portraitUrl(person)}" alt="" width="48" height="60"><span><strong>${person.name}</strong><small>${person.kind==='cartographer'?'Cartographer':person.kind==='collector'?'Collector':'Teacher'} / ${portById(person.port).name}</small><small>${person.place}</small></span><span class="resident-arrow" aria-hidden="true">&gt;</span></button>`;
}
function showSpecialist(id){
  const person=specialistById(id);if(!person)return;const meeting=meetSpecialist(state,id);if(!meeting.ok)return notify(meeting.message);save();
  const p=portById(person.port),active=state.expedition[person.kind]===id,lesson=lessons[person.skill],learned=lesson&&hasSkill(state,person.skill),map=chartReport(state),reports=discoveryReport(state,id);
  let services='';
  if(lesson)services+=`<section class="specialist-service"><h2>${lesson.name}${learned?' / Learned':''}</h2><p>${lesson.effect}</p>${learned?'':`<button class="paper-button" id="specialist-learn" ${state.gold<lesson.cost?'disabled':''}>Study / ${fmt(lesson.cost)} gold</button>`}</section>`;
  if(person.kind==='cartographer'){
    const other=specialistById(state.expedition.cartographer);
    services+=`<section class="specialist-service"><h2>${active?'Your mapmaking contract':'Mapmaking contract'}</h2><p>${map.squares} unreported chart squares / ${fmt(map.gold)} gold / ${map.fame} renown</p>${!active?`<p>${other?'Current cartographer: '+other.name:'Cartography required'}</p><button class="paper-button" id="specialist-contract" ${!hasSkill(state,'cartography')?'disabled':''}>${other?'Switch':'Sign'} contract</button>`:`<button class="paper-button" id="specialist-report" ${!map.squares?'disabled':''}>Report charts / ${fmt(map.gold)} gold</button>`}</section>`;
  }else if(person.kind==='collector'){
    const other=specialistById(state.expedition.collector);
    services+=`<section class="specialist-service"><h2>${active?'Your discovery contract':'Discovery contract'}</h2>${reports.items.length?`<ul class="report-list">${reports.items.map(d=>`<li><span>${d.name}</span><strong>${fmt(d.payment)} gold</strong></li>`).join('')}</ul><p>Payment here: ${fmt(reports.gold)} gold / ${reports.fame} renown.</p>`:'<p>No reports ready.</p>'}${!active?`<p>${other?'Current collector: '+other.name:'No contract signed'}</p><button class="paper-button" id="specialist-contract">${other?'Switch':'Sign'} contract</button>`:`<div class="links"><button class="paper-button" id="specialist-report" ${!reports.items.length?'disabled':''}>Report discoveries / ${fmt(reports.gold)} gold</button>${discoveries.some(d=>!state.found.includes(d.id))?'<button class="paper-button" id="specialist-rumour">Ask for a discovery rumour</button>':''}</div>`}</section>`;
  }
  const lead=specialistById(person.lead);
  showModal('specialist',person.place,`<div class="person-encounter"><img class="person-portrait" src="${portraitUrl(person)}" alt="Portrait of ${person.name}" width="128" height="160"><div><p class="person-role">${p.name} / ${person.kind==='teacher'?'Teacher':person.kind}</p><h2>${person.name}</h2><blockquote>${active&&person.contracted?person.contracted:person.greeting}</blockquote><p>Gold ${fmt(state.gold)}</p></div></div>${services}<div class="links menu-links"><button class="paper-button" id="specialist-directions">Ask about ${lead.name}</button><button class="paper-button" id="specialist-ledger">Expedition reports</button><button class="paper-button" id="specialist-harbor">Harbor</button></div>`);
  if($('specialist-learn'))$('specialist-learn').onclick=()=>transact(learnSkill(state,id),()=>showSpecialist(id));
  if($('specialist-contract'))$('specialist-contract').onclick=()=>transact(signContract(state,id),()=>showSpecialist(id));
  if($('specialist-report'))$('specialist-report').onclick=()=>transact(person.kind==='cartographer'?reportCharts(state,id):reportDiscoveries(state,id),()=>showSpecialist(id));
  if($('specialist-rumour'))$('specialist-rumour').onclick=()=>transact(collectorRumour(state,id),()=>showSpecialist(id));
  $('specialist-directions').onclick=()=>transact(askDirections(state,id),()=>showSpecialist(id));$('specialist-ledger').onclick=showReportLedger;$('specialist-harbor').onclick=showHarbor;
}
function showReportLedger(){
  const e=state.expedition,map=chartReport(state),report=discoveryReport(state),patrons=[e.cartographer,e.collector].filter(Boolean).map(specialistById);
  showModal('reports','Journal / Expedition reports',`<div class="summary"><span>New charts <strong>${map.squares} squares / ${fmt(map.gold)} G</strong></span><span>Discoveries <strong>${report.items.length} ready</strong></span></div>${patrons.length?`<div class="resident-list">${patrons.map(person=>residentCard(person,'contact')).join('')}</div>`:'<p>No reporting contracts.</p>'}<h2>Skills</h2><p>${e.skills.length?e.skills.map(id=>lessons[id].name).join(' / '):'None learned'}</p>${state.found.length?`<h2>Field notes</h2>${discoveries.filter(d=>state.found.includes(d.id)).map(d=>`<article class="log-entry"><h2>${d.name}</h2><p>${e.reported.includes(d.id)?'Reported':'Ready to report'}</p>${d.sprite?`<button class="paper-button" data-landmark="${d.id}">Inspect landmark</button>`:''}</article>`).join('')}`:''}<div class="links menu-links"><button class="paper-button" id="reports-contacts">Contacts</button></div>`);
  modal.querySelectorAll('[data-contact]').forEach(b=>b.onclick=()=>{const person=specialistById(b.dataset.contact);if(state.port===person.port)showSpecialist(person.id);else course(person.port);});modal.querySelectorAll('[data-landmark]').forEach(b=>b.onclick=()=>showLandmark(b.dataset.landmark));$('reports-contacts').onclick=showContacts;
}
function guildOrder(q,active=false){
  return `<article class="log-entry"><h2>${guildTypes[q.kind].name}</h2><p>${esc(guildObjective(state,q))}</p><p>Fee ${fmt(q.fee)} gold / ${q.fame} renown${q.reimbursement?`<br>Cargo payment ${fmt(q.reimbursement)} gold for ${q.quantity} units, in addition to your fee.`:''}</p><p>${active?`Due ${formatDate(q.due)} / ${Math.max(0,q.due-state.day).toFixed(1)} days left`:`Complete within ${q.days} days of accepting.`}</p>${active?`<p>Report at the ${portById(guildDeliveryPort(q)).name} guild.</p><div class="links">${menuButton('guild-report','Deliver / Report assignment',hasGuild(state.port)&&state.port===guildDeliveryPort(q)&&guildReady(state))}${menuButton('guild-course','Set course for next stop')}${q.kind==='debt'&&!q.collected&&state.port===q.target?menuButton('guild-contact',`Cafe / ${esc(q.contact)}`):''}</div>`:`<button class="paper-button" data-guild-accept="${q.kind}">Accept ${guildTypes[q.kind].name}</button>`}</article>`;
}
function bindGuildOrder(render){
  if($('guild-report'))$('guild-report').onclick=()=>transact(completeGuildJob(state),render);
  if($('guild-contact'))$('guild-contact').onclick=showGuildContact;
  if($('guild-course'))$('guild-course').onclick=()=>{
    const q=state.guild.active;if(!q)return;
    let target=guildDeliveryPort(q);
    if(q.kind==='buy'&&(state.cargo[q.good]||0)<q.quantity)target=q.source;
    if(q.kind==='transport'&&(q.loaded<q.quantity||(state.cargo[q.good]||0)<q.quantity))target=q.source;
    if(q.kind==='debt'&&!q.collected)target=q.target;
    if(q.kind==='pirate'&&!q.victory)target={...q.enemy,id:undefined,enemy:q.enemy.id};
    if(target===state.port)return notify('Your next stop is here. Visit the market, cafe, or guild.');
    course(target);
  };
}
function showGuild(){
  checkGuildDeadline(state);if(!hasGuild(state.port))return showQuestLog();
  const p=portById(state.port),q=state.guild.active,offers=q?[]:availableGuildJobs(state);save();
  showModal('guild',p.name+' / Guild',`<div class="summary"><span>Gold <strong>${fmt(state.gold)}</strong></span><span>Renown <strong>${fmt(state.fame)}</strong></span><span>Contracts fulfilled <strong>${state.guild.completed}</strong></span></div>${q?`<h2>Your current orders</h2>${guildOrder(q,true)}`:`<h2>Available assignments</h2>${offers.map(q=>guildOrder(q)).join('')||'<p>No assignments available this month. Check another port or return next month.</p>'}`}<div class="links menu-links">${menuButton('guild-quests','Quest log')}${menuButton('guild-market','Market')}${menuButton('guild-harbor','Harbor')}</div>`);
  modal.querySelectorAll('[data-guild-accept]').forEach(b=>b.onclick=()=>transact(acceptGuildJob(state,b.dataset.guildAccept),showGuild));
  bindGuildOrder(showGuild);$('guild-quests').onclick=showQuestLog;$('guild-market').onclick=showMarket;$('guild-harbor').onclick=showHarbor;
}
function showGuildContact(){
  checkGuildDeadline(state);const q=state.guild.active;
  if(q?.kind!=='debt'||q.target!==state.port||q.collected)return showGuild();
  showModal('guild-contact',portById(state.port).name+' / Cafe',`<h2>${esc(q.contact)}</h2><blockquote>"I know which account you mean. The money is ready. Will you carry it back to the guild?"</blockquote><p>The collection travels under seal. Your fee is paid when you report in ${portById(q.origin).name}.</p><div class="links">${menuButton('guild-collect','Collect the debt')}${menuButton('guild-contact-back','Harbor')}</div>`);
  $('guild-collect').onclick=()=>transact(collectGuildDebt(state),showQuestLog);$('guild-contact-back').onclick=showHarbor;
}
function showQuestLog(){
  checkGuildDeadline(state);const g=state.guild;save();
  showModal('quests','Guild quest log',`${g.active?guildOrder(g.active,true):'<p>No active assignment.</p>'}<div class="links menu-links">${hasGuild(state.port)?menuButton('quests-guild','Visit local guild'):''}${g.active?menuButton('quests-abandon','Abandon assignment'):''}${menuButton('quests-journal','Journal')}${menuButton('quests-commands','Commands')}</div><h2>Contract record</h2><p>${g.completed} completed / ${g.failed} expired or abandoned</p>${g.history.map(h=>`<article class="log-entry"><h2>${guildTypes[h.kind].name} / ${h.outcome}</h2><p>${portById(h.origin).name} / ${formatDate(h.day)}${h.outcome==='completed'?`<br>${fmt(h.gold)} gold / ${h.fame} renown`:''}</p></article>`).join('')}`);
  bindGuildOrder(showQuestLog);if($('quests-guild'))$('quests-guild').onclick=showGuild;
  if($('quests-abandon'))$('quests-abandon').onclick=()=>{const q=state.guild.active;showModal('guild-abandon','Abandon this contract?',`<p>${esc(guildObjective(state,q))}</p><p>This ends the assignment and costs up to ${Math.ceil(q.fame/2)} renown. This offer will stay closed until next month.</p><div class="links">${menuButton('guild-abandon-confirm','Abandon contract')}${menuButton('guild-abandon-back','Keep the contract')}</div>`);$('guild-abandon-confirm').onclick=()=>transact(abandonGuildJob(state),showQuestLog);$('guild-abandon-back').onclick=showQuestLog;};
  $('quests-journal').onclick=showJournal;$('quests-commands').onclick=showCommands;
}

function showHarbor(){
  checkGuildDeadline(state);const p=portById(state.port);if(!p)return showCommands();
  showModal('harbor',esc(p.name),`<div class="hub-columns"><section><h2>Ashore</h2><div class="menu-actions">${menuButton('harbor-supply','Harbor supplies')}${menuButton('harbor-market','Market',!p.supplyOnly)}${menuButton('harbor-yard','Shipyard',!!p.shipyard)}${menuButton('harbor-recruit','Crew café',!p.supplyOnly)}${menuButton('harbor-guild','Guild',!p.supplyOnly)}${menuButton('harbor-residents','Residents',localSpecialists(p.id).length>0)}</div></section><section><h2>Aboard</h2><div class="menu-actions">${menuButton('harbor-fleet','Ships & crew')}${menuButton('harbor-cargo','Cargo & provisions')}${menuButton('harbor-journal','Journal & reports')}${menuButton('harbor-status','Voyage status')}${menuButton('harbor-auto','Set sail…')}${menuButton('harbor-options','Save & options')}</div></section></div>`,p.description);
  $('harbor-supply').onclick=()=>showSupplies();$('harbor-market').onclick=showMarket;$('harbor-yard').onclick=showShipyard;$('harbor-recruit').onclick=showCafe;$('harbor-guild').onclick=showGuild;$('harbor-residents').onclick=showResidents;
  $('harbor-fleet').onclick=showFleet;$('harbor-cargo').onclick=showCargo;$('harbor-journal').onclick=showJournal;$('harbor-status').onclick=showSailData;$('harbor-auto').onclick=showAutoSail;$('harbor-options').onclick=showSettings;
}
function showResidents(){
  const p=portById(state.port);if(!p)return showContacts();
  showModal('residents',p.name+' / Residents',`<p class="port-flavor">${p.description}</p><div class="resident-list">${localSpecialists(p.id).map(person=>residentCard(person)).join('')||'<p>No specialist residents here.</p>'}</div>`);
  modal.querySelectorAll('[data-specialist]').forEach(b=>b.onclick=()=>showSpecialist(b.dataset.specialist));
}
function shipTabs(active){return `<nav class="menu-tabs" aria-label="Ship management"><button data-ship-tab="ships" aria-current="${active==='ships'?'page':'false'}">Ships</button><button data-ship-tab="crew" aria-current="${active==='crew'?'page':'false'}">Crew</button></nav>`;}
function bindShipTabs(){modal.querySelectorAll('[data-ship-tab]').forEach(b=>b.onclick=b.dataset.shipTab==='ships'?showFleet:showCrew);}
function cargoTabs(active){return `<nav class="menu-tabs" aria-label="Cargo management"><button data-cargo-tab="goods" aria-current="${active==='goods'?'page':'false'}">Trade goods</button><button data-cargo-tab="provisions" aria-current="${active==='provisions'?'page':'false'}">Provisions</button></nav>`;}
function bindCargoTabs(){modal.querySelectorAll('[data-cargo-tab]').forEach(b=>b.onclick=b.dataset.cargoTab==='goods'?showCargo:()=>showSupplies(undefined,true));}
function showSupplies(days,fromCargo=false){
  const p=portById(state.port);days ??= supplyOptions.find(n=>n>supplyDays(state))??supplyOptions.at(-1);
  const target=days*rationRate(state),food=Math.max(0,target-state.food),water=Math.max(0,target-state.water),cost=Math.ceil(food*2),fits=cargoUsed(state)+(food+water)*.15<=capacity(state),stocked=food===0&&water===0;
  showModal(fromCargo?'provisions':'supplies',fromCargo?'Cargo / Provisions':p.name+' / Supplies',`${fromCargo?cargoTabs('provisions'):''}<div class="summary"><span>Gold <strong>${fmt(state.gold)}</strong></span><span>Hold <strong>${Math.ceil(cargoUsed(state))}/${capacity(state)}</strong></span><span>Stores <strong>${supplyDays(state)} days</strong></span></div><table class="data-table"><thead><tr><th>Stores</th><th>Aboard</th><th>Per day</th></tr></thead><tbody><tr><td>Food</td><td>${fmt(state.food)}</td><td>${rationRate(state).toFixed(1)}</td></tr><tr><td>Water</td><td>${fmt(state.water)}</td><td>${rationRate(state).toFixed(1)}</td></tr></tbody></table>${p?`<label class="quantity">Provision for<select id="supply-days">${supplyOptions.map(n=>`<option value="${n}" ${n===days?'selected':''}>${n} days</option>`).join('')}</select></label><div class="supply-quote"><span>+${Math.ceil(food)} food</span><span>+${Math.ceil(water)} water</span><strong>${fmt(cost)} gold</strong></div>${!fits&&!stocked?'<p class="danger">Not enough hold space.</p>':''}<div class="links"><button class="paper-button" id="supply-confirm" ${stocked||!fits||state.gold<cost?'disabled':''}>${stocked?'Already stocked':'Load supplies'}</button></div>`:'<p class="muted">At sea</p>'}`);
  if(fromCargo)bindCargoTabs();
  if(p){$('supply-days').onchange=e=>showSupplies(Number(e.target.value),fromCargo);$('supply-confirm').onclick=()=>transact(resupply(state,days),()=>showSupplies(days,fromCargo));}
}
function showCargo(){
  const p=portById(state.port),cargo=Object.entries(state.cargo).filter(([,n])=>n>0);
  showModal('cargo','Cargo / Trade goods',`${cargoTabs('goods')}<div class="summary"><span>Hold <strong>${Math.ceil(cargoUsed(state))}/${capacity(state)}</strong></span><span>Free <strong>${Math.floor(capacity(state)-cargoUsed(state))}</strong></span></div>${cargo.length?`<table class="data-table"><thead><tr><th>Goods</th><th>Units</th>${p&&!p.supplyOnly?'<th>Local value</th>':''}</tr></thead><tbody>${cargo.map(([id,n])=>`<tr><td>${goods[id].name}</td><td>${n}</td>${p&&!p.supplyOnly?`<td>${fmt(n*price(state,p,id,false))} G</td>`:''}</tr>`).join('')}</tbody></table>`:'<p>No trade goods aboard.</p>'}${p&&!p.supplyOnly?'<div class="links menu-links"><button class="paper-button" id="cargo-market">Market</button></div>':''}`);
  bindCargoTabs();if($('cargo-market'))$('cargo-market').onclick=showMarket;
}
function showCrew(){showCrewMenu(false);}
function showCafe(){showCrewMenu(true);}
function showCrewMenu(cafe){
  const p=portById(state.port),berths=state.ships.reduce((n,a)=>n+shipStats(a).berths,0),missing=berths-crewCount(state),q=state.guild.active,contact=cafe&&q?.kind==='debt'&&!q.collected&&q.target===state.port;
  showModal(cafe?'cafe':'crew',cafe?p.name+' / Crew café':'Ships / Crew',`${cafe?'':shipTabs('crew')}<div class="summary"><span>Crew <strong>${crewCount(state)}/${berths}</strong></span><span>Vacant <strong>${missing}</strong></span><span>Gold <strong>${fmt(state.gold)}</strong></span></div><table class="data-table"><thead><tr><th>Ship</th><th>Sailors</th><th>Berths</th></tr></thead><tbody>${state.ships.map(a=>`<tr><td>${esc(a.name)}</td><td>${a.crew}</td><td>${shipStats(a).berths}</td></tr>`).join('')}</tbody></table><div class="links menu-links"><button class="paper-button" id="crew-recruit" ${!p||p.supplyOnly||!missing||state.gold<missing*15?'disabled':''}>${missing?`Recruit ${missing} / ${fmt(missing*15)} gold`:'Fully crewed'}</button>${contact?`<button class="paper-button" id="cafe-contact">Meet ${esc(q.contact)}</button>`:''}</div>`);
  if(!cafe)bindShipTabs();$('crew-recruit').onclick=()=>transact(recruit(state),()=>showCrewMenu(cafe));if(contact)$('cafe-contact').onclick=showGuildContact;
}
function showJournal(){
  const map=chartReport(state),report=discoveryReport(state);
  showModal('journal','Journal',`<div class="menu-actions">${menuButton('journal-quests',`Quests${state.guild.active?' / Active':''}`)}${menuButton('journal-reports',`Expedition reports / ${map.squares} chart squares, ${report.items.length} discoveries`)}${menuButton('journal-contacts',`Contacts / ${state.expedition.contacts.length}`)}${menuButton('journal-log',"Ship's log")}${menuButton('journal-songbook',`Songbook / ${state.songbook.length}`)}</div>`);
  $('journal-quests').onclick=showQuestLog;$('journal-reports').onclick=showReportLedger;$('journal-contacts').onclick=showContacts;$('journal-log').onclick=showLog;$('journal-songbook').onclick=showSongbook;
}
function showContacts(){
  const contacts=state.expedition.contacts.map(specialistById).filter(Boolean);
  showModal('contacts','Journal / Contacts',`<div class="resident-list">${contacts.map(person=>residentCard(person,'contact')).join('')||'<p>No contacts recorded.</p>'}</div>`);
  modal.querySelectorAll('[data-contact]').forEach(b=>b.onclick=()=>{const person=specialistById(b.dataset.contact);if(state.port===person.port)showSpecialist(person.id);else course(person.port);});
}

function showPort(id){
  if(id===state.port)return showHarbor();const p=portById(id);if(!p)return;
  showModal('port',p.name,`<p>${p.region}. ${state.visited.includes(id)?'Previously visited.':'Known location.'}</p><p>${p.description}</p><div class="menu-actions">${menuButton('port-sail','Auto sail to '+p.name)}${menuButton('port-chart','Locate on chart')}</div>`);
  $('port-sail').onclick=()=>course(id);$('port-chart').onclick=()=>{closeModal();chart.focus(p);};
}
function course(target){
  if(!target)return;const r=plotCourse(state,target);if(!result(r))return;
  closeModal();chart.focus();if(r.days>supplyDays(state))notify(`Passage ${r.days} days. Supplies ${supplyDays(state)} days. Consider a nearer harbor.`);
}
function showAutoSail(){
  showModal('auto','Set sail',`<div class="port-grid">${ports.filter(p=>state.known.includes(p.id)&&p.id!==state.port).map(p=>`<button data-destination="${p.id}">${p.name}<small>${p.region} · ${state.visited.includes(p.id)?'Visited':'Charted'}</small></button>`).join('')}</div>${state.port?`<div class="links menu-links"><button class="paper-button" id="sail-manual">Manual sailing</button><button class="paper-button" id="sail-wait">Wait until ${formatDate(nextMonthDay(state.day))}</button></div>`:''}`);
  modal.querySelectorAll('[data-destination]').forEach(b=>b.onclick=()=>course(b.dataset.destination));
  if(state.port){$('sail-manual').onclick=closeModal;$('sail-wait').onclick=()=>transact(waitInPort(state),showAutoSail);}
}

function showNearby(){
  const nearbyPorts=ports.filter(p=>inSight(state,p)),enemies=visiblePirates(state),landmarks=discoveries.filter(d=>d.sprite&&inSight(state,d));
  showModal('nearby','View',`<div class="summary"><span>Lookout <strong>96 nautical miles</strong></span></div><div class="menu-actions">${nearbyPorts.map(p=>menuButton('nearby-'+p.id,p.name)).join('')}${landmarks.map(d=>menuButton('nearby-'+d.id,state.found.includes(d.id)?d.name:'Unsurveyed landmark')).join('')}${enemies.map(e=>menuButton('nearby-'+e.id,e.name+' / Hostile')).join('')}</div>${!nearbyPorts.length&&!enemies.length&&!landmarks.length?'<p>Nothing but sea.</p>':''}`);
  nearbyPorts.forEach(p=>$('nearby-'+p.id).onclick=()=>showPort(p.id));landmarks.forEach(d=>$('nearby-'+d.id).onclick=()=>showLandmark(d.id));enemies.forEach(e=>$('nearby-'+e.id).onclick=()=>showEnemy(e));
}
function showLandmark(id){
  const d=discoveries.find(d=>d.id===id),found=state.found.includes(id);if(!d?.sprite||!found&&!inSight(state,d))return;
  showModal('landmark',found?d.name:'Unsurveyed landmark',`<p>${found?d.description:'The lookout has spotted an unusual landmark. Approach the shore to make observations.'}</p><p>${found?(state.expedition.reported.includes(id)?'Your observations have been reported.':'Field notes ready. A collector can pay for this report.'):'Unsurveyed'}</p><div class="menu-actions">${menuButton('landmark-approach',found?'Sail to the approach':'Explore this landmark')}${found?menuButton('landmark-chart','Locate on chart'):''}</div>`);
  $('landmark-approach').onclick=()=>course(d.approach);if(found)$('landmark-chart').onclick=()=>{closeModal();chart.focus(d);};
}
function showMarket(){
  const p=portById(state.port);if(!p||p.supplyOnly)return;
  const catalog=marketCatalog(state,p),ids=[...new Set([...catalog.map(row=>row.good),...Object.keys(state.cargo).filter(id=>state.cargo[id]>0)])],d=portDevelopment(state,p);
  showModal('market',p.name+' / Market',`<div class="summary"><span>Gold <strong>${fmt(state.gold)}</strong></span><span>Hold <strong>${Math.ceil(cargoUsed(state))}/${capacity(state)}</strong></span><span>Economy <strong>${d.economy}</strong></span></div><table class="trade-table"><thead><tr><th>Goods</th><th>Buy</th><th>Sell</th><th>Hold</th><th>Trade</th></tr></thead><tbody>${ids.map(id=>{const row=catalog.find(r=>r.good===id),available=!!row?.available;return `<tr class="${row&&!available?'locked':''}"><td>${goods[id].name}<small>${row&&!available?`Requires ${row.economy} Economy`:row?.specialty?'Local specialty':row?'Regional goods':'Cargo only'}</small></td><td>${row?price(state,p,id,true):'N/A'}</td><td>${price(state,p,id,false)}</td><td>${state.cargo[id]||0}</td><td><div class="trade-buttons"><button data-buy="${id}" ${!available||maxBuyQuantity(state,id)<tradeQuantity?'disabled':''}>Buy</button><button data-sell="${id}" ${(state.cargo[id]||0)<tradeQuantity?'disabled':''}>Sell</button>${state.cargo[id]>0?`<button data-sellall="${id}" aria-label="Sell all ${goods[id].name}" title="Sell ${state.cargo[id]} units for ${fmt(state.cargo[id]*price(state,p,id,false))} gold">Sell all</button>`:''}<button data-fill="${id}" aria-label="Fill hold with ${goods[id].name}" title="Buy ${maxBuyQuantity(state,id)} units" ${maxBuyQuantity(state,id)<1?'disabled':''}>Fill hold</button></div></td></tr>`;}).join('')}</tbody></table><label class="quantity">Quantity<select id="trade-quantity">${[1,5,10,25].map(n=>`<option value="${n}">${n} units</option>`).join('')}</select></label><div class="links menu-links"><button class="paper-button" id="market-invest">Invest in Economy</button><button class="paper-button" id="market-harbor">Harbor</button></div>`);
  $('trade-quantity').value=tradeQuantity;$('trade-quantity').onchange=e=>{tradeQuantity=Number(e.target.value);showMarket();};
  for(const [attr,action] of [['buy',id=>trade(state,id,tradeQuantity,true)],['sell',id=>trade(state,id,tradeQuantity,false)],['sellall',id=>trade(state,id,state.cargo[id]||0,false)],['fill',id=>fillHold(state,id)]])modal.querySelectorAll('[data-'+attr+']').forEach(b=>b.onclick=()=>transact(action(b.dataset[attr]),showMarket));
  $('market-invest').onclick=showInvestment;$('market-harbor').onclick=showHarbor;
}
function shipPreview(type,enemy=false){return `<img class="ship-preview" src="${shipSpriteUrl(type,enemy)}" alt="" width="96" height="80">`;}
function fitOptions(value){return ['standard','trade','battle'].map(id=>`<option value="${id}" ${id===value?'selected':''}>${id==='trade'?'Trading / no guns':id==='battle'?'Battle / full berths':'Standard / minimum berths'}</option>`).join('');}
function materialOptions(p,value,ship=null){const industry=portDevelopment(state,p).industry;return Object.entries(hullMaterials).map(([id,m])=>`<option value="${id}" ${id===value?'selected':''} ${m.exclusive&&ship?.type!==m.exclusive||industry<m.industry&&ship?.material!==id?'disabled':''}>${m.name}${m.exclusive?' / Tekkousen only':m.industry>industry?' / Industry '+m.industry:''}</option>`).join('');}
function showShipyard(){
  const p=portById(state.port);if(!p?.shipyard)return;const d=portDevelopment(state,p),orders=state.shipOrders.filter(o=>o.port===p.id),next=orders.filter(o=>o.readyDay>state.day).sort((a,b)=>a.readyDay-b.readyDay)[0];
  if(hullMaterials[yardMaterial].industry>d.industry)yardMaterial='beech';
  const options={material:yardMaterial,fit:yardFit};
  showModal('shipyard',p.name+' / Shipyard',`<div class="summary"><span>Gold <strong>${fmt(state.gold)}</strong></span><span>Fleet <strong>${state.ships.length}/${MAX_FLEET}</strong></span><span>Orders <strong>${state.shipOrders.length}</strong></span><span>Industry <strong>${d.industry}</strong></span></div><div class="yard-controls"><label>Hull material<select id="yard-material">${materialOptions(p,yardMaterial)}</select></label><label>Fittings<select id="yard-fit">${fitOptions(yardFit)}</select></label></div>${orders.length?`<h2>Under construction</h2>${orders.map(o=>`<div class="ship-row">${shipPreview(o.ship.type)}<div><h2>${esc(o.ship.name)}</h2><p>${hullMaterials[o.ship.material].name} / ${shipStats(o.ship).hold} hold<br>${o.readyDay<=state.day?'Ready to launch':'Ready '+formatDate(o.readyDay)}</p></div><button class="paper-button" data-collect="${esc(o.ship.id)}" ${o.readyDay>state.day?'disabled':''}>Launch</button></div>`).join('')}${next?menuButton('yard-wait','Wait until '+formatDate(next.readyDay)):''}`:''}<h2>Build a ship</h2>${shipyardCatalog(state,p).map(t=>{const quote=shipQuote(state,p,t.id,options),material=t.id==='tekkousen'?'steel':yardMaterial,m=hullMaterials[material],berths=yardFit==='battle'?t.maxCrew:t.minCrew,guns=yardFit==='trade'?0:t.guns,cost=Math.round(t.cost*m.factor);return `<div class="ship-row ${t.available?'':'locked'}">${shipPreview(t.id)}<div><h2>${t.name}</h2><p>${Math.round(t.hull*m.factor)} hull / ${t.capacity-berths-guns} hold / ${guns} guns<br>${t.minCrew} starting crew / ${berths} berths${t.id==='tekkousen'?'<br>Steel hull included':''}</p><p class="muted">${t.available?`${quote.days} days to build`:`Requires ${t.industry} Industry${p.capital?' / capital fixed':''}`}</p></div><button class="paper-button" data-ship="${t.id}" ${!quote.ok||state.gold<cost||state.ships.length+state.shipOrders.length>=MAX_FLEET?'disabled':''}>Order<br>${fmt(cost)} gold</button></div>`;}).join('')}<div class="links"><button class="paper-button" id="repair-all">Repair fleet</button><button class="paper-button" id="yard-refit">Refit fleet</button><button class="paper-button" id="yard-invest">Invest in Industry</button><button class="paper-button" id="yard-harbor">Harbor</button></div>`);
  $('yard-material').onchange=e=>{yardMaterial=e.target.value;showShipyard();};$('yard-fit').onchange=e=>{yardFit=e.target.value;showShipyard();};
  modal.querySelectorAll('[data-ship]').forEach(b=>b.onclick=()=>transact(buyShip(state,b.dataset.ship,options),showShipyard));modal.querySelectorAll('[data-collect]').forEach(b=>b.onclick=()=>transact(collectShip(state,b.dataset.collect),showShipyard));
  if(next)$('yard-wait').onclick=()=>transact(waitInPort(state,next.readyDay-Math.floor(state.day)),showShipyard);
  $('repair-all').onclick=()=>transact(repair(state),showShipyard);$('yard-refit').onclick=showFleet;$('yard-invest').onclick=showInvestment;$('yard-harbor').onclick=showHarbor;
}
function showInvestment(){
  const p=portById(state.port);if(!p||p.supplyOnly)return;const d=portDevelopment(state,p),date=formatDate(nextMonthDay(state.day));
  const lockedGoods=marketCatalog(state,p).filter(row=>!row.available),lockedShips=shipyardCatalog(state,p).filter(t=>!t.available);
  showModal('invest',p.name+' / Invest',`<div class="summary"><span>Gold <strong>${fmt(state.gold)}</strong></span><span>Today <strong>${formatDate(state.day)}</strong></span></div>${p.capital?`<p class="notice">This capital's Economy and Industry are fixed.${p.shipyard==='B'?' Develop Bristol or Dublin for the advanced English ships.':p.shipyard==='C'?' Develop Antwerp or Hamburg for the advanced Dutch ships.':''}</p>`:`<p>Settlement ${date} / 300 gold per point</p>`}<div class="development-tracks">${['economy','industry'].map(kind=>{const pending=d[kind==='economy'?'pendingEconomy':'pendingIndustry'],limit=investmentLimit(state,p,kind),items=kind==='economy'?lockedGoods.map(row=>({name:goods[row.good].name,at:row.economy})):lockedShips.map(t=>({name:t.name,at:t.industry}));if(kind==='industry')for(const m of Object.values(hullMaterials))if(!m.exclusive&&m.industry>d.industry)items.push({name:m.name+' hull',at:m.industry});items.sort((a,b)=>a.at-b.at);return `<section class="development-track"><h2>${kind} ${d[kind]} / 1,000</h2><p>Pending ${fmt(pending)} gold / +${Math.floor(pending/300)} on ${date}</p>${items.length?`<p class="muted">Next: ${items[0].name} at ${items[0].at}</p><details><summary>All unlocks</summary><p>${items.map(t=>`${t.at}: ${t.name}`).join('<br>')}</p></details>`:'<p>All local designs or goods available.</p>'}${!p.capital?`<div class="investment-controls"><label for="invest-${kind}">Gold</label><input id="invest-${kind}" type="number" min="300" max="${limit}" step="1" value="${Math.min(3000,limit)}" ${limit<300?'disabled':''}><button class="paper-button" data-max="${kind}" ${limit<300?'disabled':''}>Max ${fmt(limit)}</button><button class="paper-button" data-invest="${kind}" ${limit<300?'disabled':''}>Invest</button></div>`:''}</section>`;}).join('')}</div><div class="links menu-links"><button class="paper-button" id="invest-wait">Wait until ${date}</button><button class="paper-button" id="invest-market">Market</button><button class="paper-button" id="invest-yard">Shipyard</button><button class="paper-button" id="invest-harbor">Harbor</button></div>`);
  modal.querySelectorAll('[data-max]').forEach(b=>b.onclick=()=>{$('invest-'+b.dataset.max).value=investmentLimit(state,p,b.dataset.max);});modal.querySelectorAll('[data-invest]').forEach(b=>b.onclick=()=>transact(invest(state,b.dataset.invest,Number($('invest-'+b.dataset.invest).value)),showInvestment));
  $('invest-wait').onclick=()=>transact(waitInPort(state),showInvestment);$('invest-market').onclick=showMarket;$('invest-yard').onclick=showShipyard;$('invest-harbor').onclick=showHarbor;
}
function showFleet(){
  const p=portById(state.port);
  showModal('fleet','Ships',`${shipTabs('ships')}<div class="summary"><span>Fleet <strong>${state.ships.length}/${MAX_FLEET}</strong></span><span>Crew <strong>${crewCount(state)}</strong></span><span>Gold <strong>${fmt(state.gold)}</strong></span></div>${state.ships.map((a,i)=>{const t=shipStats(a);return `<div class="ship-row">${shipPreview(a.type)}<div><h2>${esc(a.name)}${i===0?' / Flagship':''}</h2><p>${t.name} / ${hullMaterials[a.material].name}<br>${a.crew}/${t.berths} crew · ${t.guns} guns · ${t.hold} hold</p><div class="hull-bar"><i style="width:${a.hull/t.maxHull*100}%"></i></div><p>Hull ${Math.ceil(a.hull)}/${t.maxHull}${a.legacy?' / Earlier vessel':''}</p></div>${p?.shipyard&&!a.legacy?`<button class="paper-button" data-refit="${esc(a.id)}">Refit</button>`:''}</div>`;}).join('')}${state.shipOrders.length?`<h2>Construction orders</h2>${state.shipOrders.map(o=>`<div class="data-pair"><span>${esc(o.ship.name)} / ${portById(o.port).name}</span><strong>${o.readyDay<=state.day?'Ready to launch':formatDate(o.readyDay)}</strong></div>`).join('')}`:''}${p?.shipyard?'<div class="links menu-links"><button class="paper-button" id="fleet-yard">Shipyard</button></div>':''}`);
  bindShipTabs();modal.querySelectorAll('[data-refit]').forEach(b=>b.onclick=()=>showRefit(b.dataset.refit));if($('fleet-yard'))$('fleet-yard').onclick=showShipyard;
}

function showRefit(id,fit=null,material=null){
  const ship=state.ships.find(a=>a.id===id),p=portById(state.port);if(!ship||ship.legacy||!p?.shipyard)return;
  fit ||= ship.berths===shipTypes[ship.type].maxCrew?'battle':ship.guns===0?'trade':'standard';material ||= ship.material;
  const quote=refitQuote(state,id,{fit,material}),old=shipStats(ship);
  showModal('refit',esc(ship.name)+' / Refit',`${shipPreview(ship.type)}<p>${old.name}. Current hold ${old.hold}, berths ${old.berths}, guns ${old.guns}.</p><div class="yard-controls"><label>Hull material<select id="refit-material" ${ship.type==='tekkousen'?'disabled':''}>${materialOptions(p,material,ship)}</select></label><label>Fittings<select id="refit-fit">${fitOptions(fit)}</select></label></div><p class="notice">${quote.ok?`${quote.maxHull} maximum hull / ${quote.hold} hold<br>${quote.berths} crew berths / ${quote.guns} guns<br>Refit costs ${fmt(quote.cost)} gold`:quote.message}</p><div class="links"><button class="paper-button" id="refit-confirm" ${!quote.ok||state.gold<quote.cost?'disabled':''}>Refit</button><button class="paper-button" id="refit-return">Ships</button></div>`);
  $('refit-material').onchange=e=>showRefit(id,fit,e.target.value);$('refit-fit').onchange=e=>showRefit(id,e.target.value,material);$('refit-confirm').onclick=()=>transact(refitShip(state,id,{fit,material}),showFleet);$('refit-return').onclick=showFleet;
}
function showSailData(){
  const heading=sailingHeading(state),wind=windReport(currentWind(state),heading);
  showModal('sail-data','Voyage status',`<div class="summary"><span>${formatDate(state.day)}</span><span>Stores <strong>${supplyDays(state)} days</strong></span><span>Speed <strong>${state.speed}X</strong></span></div><dl class="voyage-data"><dt>Fleet speed</dt><dd>${(fleetSpeed(state)*12/24).toFixed(1)} knots</dd><dt>Wind from</dt><dd>${wind.from} / ${wind.speed.toFixed(1)} knots</dd>${heading?`<dt>Sail</dt><dd>${wind.point.toLowerCase()} / ${Math.round(wind.factor*100)}%</dd>`:''}${state.route.length?`<dt>Passage remaining</dt><dd>${Math.ceil(estimatedPassage(state))} days</dd>`:''}<dt>Morale</dt><dd>${Math.floor(state.morale)}%</dd><dt>Celestial Navigation</dt><dd>${hasSkill(state,'celestial-navigation')?'Learned / +15% speed':'Not learned'}</dd><dt>Gunnery</dt><dd>${hasSkill(state,'gunnery')?'Learned / +25% damage':'Not learned'}</dd></dl><div class="links menu-links"><button class="paper-button" id="status-provisions">Provisions</button><button class="paper-button" id="status-course" ${!heading?'disabled':''}>Cancel course</button></div>`);
  $('status-provisions').onclick=()=>showSupplies(undefined,true);$('status-course').onclick=()=>{cancelCourse(state);save();showSailData();};
}

function showLog(){showModal('log',"Journal / Ship's log",state.events.map(e=>`<article class="log-entry"><h2>Day ${Math.floor(e.day)+1} / ${esc(e.title)}</h2><p>${esc(e.text)}</p></article>`).join(''));}
function showEnemy(enemy){
  if(state.battle)return showBattle();if(!inSight(state,enemy))return notify('That fleet is no longer in sight.');
  showModal('enemy','View fleet',`${shipPreview(enemy.type,true)}<h2>${esc(enemy.name)}</h2><p>${shipTypes[enemy.type].name} / Hostile fleet<br>${shipTypes[enemy.type].guns} guns</p><div class="menu-actions">${menuButton('enemy-battle','Battle / Approach and attack')}${menuButton('enemy-return','Leave them be')}</div>`);
  $('enemy-battle').onclick=()=>{if(distance(state.position,enemy)<1.5){startBattle(state,enemy);showBattle();}else course({...enemy,id:undefined,enemy:enemy.id});};$('enemy-return').onclick=closeModal;
}
function showBattle(){
  const b=state.battle;if(!b)return;const e=b.enemy,hull=state.ships.reduce((n,a)=>n+a.hull,0);
  showModal('battle','Battle at sea',`<div class="battle-grid"><div>${shipPreview(state.ships[0]?.type)}<h2>Your fleet</h2><p>${state.ships.length} ships / ${crewCount(state)} crew<br>Hull ${Math.ceil(hull)}</p></div><div>${shipPreview(e.type,true)}<h2>${esc(e.name)}</h2><p>${shipTypes[e.type].name} / ${e.crew} crew<br>Hull ${Math.ceil(e.hull)}/${e.maxHull}</p></div></div><div class="notice">${b.messages.slice(0,3).map(esc).join('<br>')}</div><div class="battle-actions"><button class="paper-button" data-battle="fire">Fire</button><button class="paper-button" data-battle="board">Board</button><button class="paper-button" data-battle="flee">Flee</button></div>`);
  modal.querySelectorAll('[data-battle]').forEach(b=>b.onclick=()=>{const r=battleAction(state,b.dataset.battle);notify(r.message);save();if(state.battle)showBattle();else{modal.close();modalType=null;updateStatus();if(state.lost)showLost();}});
}
function togglePause(){if(modal.open||state.battle||state.lost||state.port)return;if(!state.route.length&&!state.heading)return notify('Choose a heading or use Auto sail.');state.paused=!state.paused;updateStatus();}
function cycleSpeed(){state.speed=state.speed===1?4:state.speed===4?16:1;notify('Travel speed '+state.speed+'X.');updateStatus();save();}
function showHelp(){
  if(!modal.open)showCommands();if(modal.dataset.help)return;
  const page=document.createElement('section');page.id='help-page';page.innerHTML=helpMarkup(modalType);page.querySelector('h1').id='handbook-title';
  $('menu-page').hidden=true;$('modal-content').append(page);modal.dataset.help='true';modal.setAttribute('aria-labelledby','handbook-title');$('help-return').onclick=closeHelp;modal.scrollTop=0;
  page.querySelector('details[open] summary')?.focus();
}

function showSettings(){
  showModal('settings','Save & options',`<p class="muted">${saveAvailable?'Autosave on':'Autosave unavailable / Export your voyage'}</p><p>Day ${Math.floor(state.day)+1} / ${state.visited.length} harbors / ${state.fame} renown</p><div class="menu-actions">${menuButton('save-now','Save voyage')}${menuButton('export-save','Export voyage')}${menuButton('import-save','Import voyage')}${menuButton('settings-music',music.enabled?'Music: On':'Music: Off')}${menuButton('settings-songbook','Songbook')}${menuButton('settings-help','Help & tips')}</div><label class="quantity">Music volume<select id="music-volume">${[.25,.5,.75,1].map(v=>`<option value="${v}" ${Math.abs(music.volume-v)<.13?'selected':''}>${v*100}%</option>`).join('')}</select></label><div class="menu-actions">${menuButton('new-voyage','New voyage')}</div>`);
  $('save-now').onclick=()=>save(true);$('export-save').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`far-horizons-day-${Math.floor(state.day)+1}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('import-save').onclick=()=>$('import-file').click();$('settings-help').onclick=showHelp;$('settings-music').onclick=toggleMusic;$('settings-songbook').onclick=showSongbook;$('music-volume').onchange=e=>music.setVolume(Number(e.target.value));$('new-voyage').onclick=()=>{showModal('reset','Begin again?','<p>This replaces the saved voyage. Export it first if you want to keep it.</p><button class="paper-button" id="reset-confirm">Start again in Lisbon</button>');$('reset-confirm').onclick=newGame;};
}
function showSongbook(){
  const book=state.songbook,now=music.playing;
  showModal('songbook','Songbook',`<div class="summary"><span>Songs <strong>${book.length}/${musicRegions.reduce((n,r)=>n+r.tunes.length,0)}</strong></span><span>Now playing <strong>${music.enabled&&now?esc(now.name):'Silence'}</strong></span></div>${musicRegions.map(r=>{const list=regionTunes(r.id),found=list.filter(t=>book.includes(t.id));return `<article class="log-entry"><h2>${r.name} / ${found.length}/${list.length}</h2>${found.length?`<p>${r.blurb}</p>`:''}<div class="links">${list.map(t=>book.includes(t.id)?`<button class="paper-button" data-tune="${t.id}">${now?.id===t.id?'&gt; ':''}${esc(t.name)}</button>`:'<button class="paper-button" disabled>Unheard</button>').join('')}</div></article>`;}).join('')}<div class="links menu-links"><button class="paper-button" id="songbook-music">${music.enabled?'Music off':'Music on'}</button><button class="paper-button" id="songbook-reports">Expedition reports</button></div>`);
  modal.querySelectorAll('[data-tune]').forEach(b=>b.onclick=()=>{if(!music.enabled)music.setEnabled(true);music.play(b.dataset.tune);setTimeout(showSongbook,50);});
  $('songbook-music').onclick=()=>{toggleMusic();showSongbook();};$('songbook-reports').onclick=showReportLedger;
}
function newGame(){state=createGame(Date.now()>>>0);lastPort=state.port;chart.invalidate();chart.focus();modal.close();modalType=null;save();updateStatus();notify('Lisbon. Butler Marco at the Franco residence is looking for discovery reports.');showHarbor();}
function showLost(){showModal('lost','Lost at sea',`<p>The voyage lasted ${Math.floor(state.day)} days. ${state.visited.length} harbors visited, ${state.found.length} discoveries made.</p><button class="paper-button" id="lost-new">Begin a new voyage</button>`);$('lost-new').onclick=newGame;}
$('import-file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2_000_000)throw new Error('Save file is too large.');const imported=migrateSave(JSON.parse(await file.text()));if(!imported)throw new Error('Invalid Far Horizons save.');state=imported;lastPort=state.port;modal.close();modalType=null;chart.invalidate();chart.focus();save();updateStatus();notify('Voyage restored.');if(state.lost)showLost();else if(state.battle)showBattle();else if(state.port)showHarbor();}catch(err){notify(err.message);}e.target.value='';};
$('commands-button').onclick=showCommands;$('chart-button').onclick=()=>{if(!modal.open)chart.toggleChart();};$('fleet-button').onclick=showFleet;$('cargo-button').onclick=showCargo;$('journal-button').onclick=showJournal;$('sail-data-button').onclick=showSailData;$('pause-button').onclick=togglePause;$('speed-button').onclick=cycleSpeed;
function steerFromKeys(){
  const held=(a,b)=>Number(steeringKeys.has(a)||steeringKeys.has(b));
  const dx=held('arrowright','d')-held('arrowleft','a'),dy=held('arrowdown','s')-held('arrowup','w');
  if(dx||dy){steer(state,dx,dy);updateStatus();}
}
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
  const key=e.key.toLowerCase();
  if(key==='n'){if(!e.repeat){e.preventDefault();toggleMusic();}return;}
  if(key==='?'||e.key==='F1'){e.preventDefault();showHelp();return;}
  if(modal.open)return;
  if(directionKeys.has(key)&&chart.mode==='sea'){e.preventDefault();if(!e.repeat){steeringKeys.add(key);steerFromKeys();}return;}
  if(e.repeat)return;
  const actions={enter:showCommands,z:showCommands,m:()=>chart.toggleChart(),f:showFleet,c:showCargo,j:showJournal,r:showSailData,p:showCommands,t:cycleSpeed,' ':togglePause,escape:showCommands};if(actions[key]){e.preventDefault();actions[key]();}
});
document.addEventListener('keyup',e=>{if(steeringKeys.delete(e.key.toLowerCase())&&!modal.open&&chart.mode==='sea'&&!state.paused)steerFromKeys();});
window.addEventListener('blur',()=>steeringKeys.clear());
document.addEventListener('visibilitychange',()=>{steeringKeys.clear();simulation.visibilityChanged();save();});window.addEventListener('pagehide',()=>save());
const simulation=createSimulationLoop(frame,{idle:()=>state.paused||state.battle||state.lost,foregroundInterval:1000/30});
function wakeSimulation(){simulation.wake();}
function frame(seconds,now){const contract=state.guild.active?.id;advance(state,seconds*state.speed*.045);if(contract&&!state.guild.active&&state.guild.history[0]?.id===contract&&state.guild.history[0].outcome==='expired'){notify('Guild assignment expired. Check the quest log.');save();}music.update({...state.position,port:state.port});
  if(state.port!==lastPort){lastPort=state.port;if(state.port){notify('Landfall at '+portById(state.port).name+'. Welcome ashore.');save();showHarbor();}}
  if(state.battle&&modalType!=='battle')showBattle();if(state.lost&&modalType!=='lost')showLost();
  if(now-saveTime>4000){save();saveTime=now;updateStatus(false);}
}
updateStatus();save();chart.notify(state.day<.1&&state.port==='lisbon'?'Lisbon. Visit Butler Marco before you sail.':state.port?'Welcome back to '+portById(state.port).name+'.':'Voyage restored. Open Menu for commands or resume with the play control.');if(state.port&&!state.battle&&!state.lost)showHarbor();wakeSimulation();
