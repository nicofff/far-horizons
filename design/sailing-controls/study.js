import { portById } from '../../engine.js';
import { createSeaBackground } from '../../sea-background.js';
import { onLand } from '../../terrain.js';
import { text, drawTown, drawShip } from '../../pixel.js';

const variants=[
  {id:'full',name:'A · Full command strip',description:'Ships, cargo, journal, chart, and voyage are always one click away. Uses the most width.',controls:'<button data-action="menu">Menu</button><button data-action="chart">Chart</button><button data-action="ships">Ships</button><button data-action="cargo">Cargo</button><button data-action="journal">Journal</button><button data-action="voyage">Voyage</button><button class="pause" data-action="pause">Pause</button><button class="speed" data-action="speed">4X ▸</button>'},
  {id:'compact',name:'B · Compact strip',description:'Menu and Chart on the left, Pause and Speed on the right. Ships, cargo, journal, and voyage live under Menu.',controls:'<button data-action="menu">Menu</button><button data-action="chart">Chart</button><button class="pause" data-action="pause">Pause</button><button class="speed" data-action="speed">4X ▸</button>'},
  {id:'hud',name:'C · HUD controls',description:'Pause and speed sit under supplies. A small Menu button opens commands. Keeps the coastline most exposed.',controls:''},
];
let scene='sea';const home=portById('lisbon'),background=createSeaBackground({x:0,y:0,width:512,height:384,scale:40},onLand);
const root=document.getElementById('options');
root.innerHTML=variants.map(v=>`<article><h2>${v.name}</h2><div class="field ${v.id}" data-state="sea" data-speed="4" data-paused="false"><canvas width="512" height="384" aria-label="Sailing off Lisbon"></canvas>${v.id==='hud'?'<div class="hud-controls"><button class="pause" data-action="pause">Pause</button><button class="speed" data-action="speed">4X ▸</button></div><button class="hud-menu" data-action="menu">Menu</button>':`<nav class="ribbon" aria-label="Sailing controls">${v.controls}</nav>`}<section class="drawer" hidden></section></div><p>${v.description}</p></article>`).join('');
function draw(field){
  const c=field.querySelector('canvas').getContext('2d');c.imageSmoothingEnabled=false;
  const position={x:home.x-3.5,y:home.y+1.5};background.draw(c,position,900,13);background.drawWaves(c,position,900,13);background.drawScenery(c,position,13);
  drawTown(c,256+(home.town.x-position.x)*40,192+(home.town.y-position.y)*40);drawShip(c,256,192,{type:'caravela-latina',flip:true});
  c.fillStyle='#1b2e65';c.fillRect(8,8,125,29);text(c,'WIND FROM NW',12,12,'#f5d283');text(c,'12KT FAIR',12,24,'#e5dfbd');
  c.fillStyle='#1b2e65';c.fillRect(359,8,144,35);text(c,'APR 14 1522',367,13,'#f5d283');text(c,scene==='port'?'AT ANCHOR':'DAY / SPRING',367,28,'#b1c7db');
  c.fillStyle='#1b2e65';c.fillRect(359,46,144,38);text(c,'SUPPLIES',367,51,'#f5d283');text(c,'48 DAYS',452,68,'#e5dfbd');
}
function menu(field,title='Commands'){
  const d=field.querySelector('.drawer');d.hidden=false;
  const links=scene==='port'?'<div><h4>Ashore</h4><button>Harbor supplies</button><button>Market</button><button>Shipyard</button><button>Crew cafe</button><button>Guild</button><button>Residents</button></div>':'<div><h4>Navigation</h4><button>Lookout</button><button>Set course</button><button>Chart</button></div>';
  d.innerHTML=`<h3>${scene==='port'?'Lisbon / Port':title}<button class="close" data-action="close" aria-label="Close commands">×</button></h3><div class="columns">${links}<div><h4>Aboard</h4><button>Ships & crew</button><button>Cargo & provisions</button><button>Journal & reports</button><button>Voyage status</button><button>Save & options</button><button>Help</button></div></div>`;
}
root.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b)return;const f=b.closest('.field');
  if(b.dataset.action==='pause'){f.dataset.paused=String(f.dataset.paused!=='true');b.textContent=f.dataset.paused==='true'?'Resume':'Pause';}
  else if(b.dataset.action==='speed'){f.dataset.speed=String(({1:4,4:16,16:1})[f.dataset.speed]);b.textContent=f.dataset.speed+'X ▸';}
  else if(b.dataset.action==='close')f.querySelector('.drawer').hidden=true;
  else menu(f,b.textContent);
});
document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{scene=b.dataset.scene;document.querySelectorAll('[data-scene]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));root.querySelectorAll('.field').forEach(f=>{f.dataset.state=scene;draw(f);if(scene==='port')menu(f);else f.querySelector('.drawer').hidden=true;});});
root.querySelectorAll('.field').forEach(draw);
