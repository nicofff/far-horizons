const cache=new Map();
function tint(hex,amount){return '#'+hex.slice(1).match(/../g).map(part=>Math.max(0,Math.min(255,parseInt(part,16)+amount)).toString(16).padStart(2,'0')).join('');}

export function portraitUrl(person){
  if(cache.has(person.id))return cache.get(person.id);
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=80;
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  const a=person.appearance,ink='#242633',paper='#ddc895',gold='#bd9860';
  const box=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const shape=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
  box(0,0,64,80,'#313e50');box(3,3,58,74,'#46525a');
  if(a.scene==='maps'){
    box(5,7,25,30,'#9e845c');box(6,8,23,27,paper);
    for(const [x,y,w,h]of [[8,15,9,2],[12,13,5,6],[17,20,5,5],[22,21,3,8],[9,28,9,2]])box(x,y,w,h,'#819370');
    box(8,11,17,1,'#b6996a');box(9,32,14,1,'#b6996a');box(48,11,2,34,gold);box(45,16,8,2,gold);
  }else if(a.scene==='stars'){
    box(6,5,23,35,ink);box(8,7,19,30,'#25345c');box(16,7,2,30,'#65656c');box(8,22,19,2,'#65656c');
    for(const [x,y] of [[11,12],[22,16],[12,29],[22,32],[19,9]])box(x,y,1,1,'#e6d4a3');
    shape([[45,8],[47,8],[50,41],[43,41]],'#948263');box(38,37,18,2,'#c0a378');
  }else if(a.scene==='guns'){
    box(5,11,51,5,'#675f51');box(7,16,47,2,'#252c35');
    for(let x=8;x<60;x+=10){box(x,4,3,10,'#252c35');box(x,6,2,6,'#969c98');}
    box(7,23,14,16,'#353a3f');box(8,25,12,2,'#8a8672');box(10,30,8,6,'#202733');
  }else if(a.scene==='books'){
    for(let y=7;y<45;y+=13){box(5,y+10,52,3,'#8e7054');for(let x=7;x<59;x+=5){box(x,y,3,10,[a.coat,'#476c68','#ac8059'][x%3]);box(x,y+2,3,1,gold);}}
  }else{
    box(5,3,10,48,'#754459');box(49,3,10,48,'#754459');box(7,4,2,46,'#91576a');box(53,4,2,46,'#91576a');
    box(18,5,28,3,gold);box(22,8,20,26,'#627478');box(24,10,16,23,'#97a69a');box(30,10,2,23,'#5d665d');
  }
  shape([[10,80],[10,62],[17,55],[25,51],[25,43],[40,43],[40,51],[48,56],[55,63],[57,80]],ink);
  shape([[12,80],[12,63],[20,57],[26,54],[39,54],[47,58],[53,64],[55,80]],a.coat);
  shape([[12,69],[20,60],[24,57],[26,80],[12,80]],tint(a.coat,-17));
  shape([[41,56],[49,61],[53,67],[55,80],[43,80]],tint(a.coat,-27));
  box(28,44,10,13,a.shade);box(29,44,7,11,a.skin);
  shape([[25,51],[32,57],[39,51],[40,58],[33,65],[25,59]],'#d5c7a5');
  shape([[24,55],[29,59],[31,80],[27,80]],a.trim);shape([[40,55],[35,59],[33,80],[37,80]],a.trim);
  for(let y=67;y<79;y+=6)box(34,y,2,2,gold);
  shape([[22,17],[26,13],[38,13],[43,18],[45,34],[42,43],[37,49],[29,49],[23,44],[20,34]],ink);
  box(20,29,4,8,a.shade);box(42,28,4,9,a.shade);box(21,30,2,5,a.skin);
  shape([[24,18],[27,15],[37,15],[41,20],[42,36],[39,43],[35,47],[29,46],[24,41],[22,31]],a.shade);
  shape([[25,18],[29,16],[36,16],[39,20],[39,36],[36,42],[30,43],[25,38],[23,30]],a.skin);
  box(25,21,10,4,tint(a.skin,13));box(25,30,3,3,tint(a.skin,11));
  shape([[32,28],[33,33],[36,35],[34,37],[31,36]],a.shade);box(32,33,2,2,tint(a.skin,16));
  box(25,28,5,1,tint(a.hair,-25));box(35,27,5,1,tint(a.hair,-25));
  box(26,30,3,2,'#ece0bd');box(36,29,3,2,'#ece0bd');box(27,30,1,2,ink);box(37,29,1,2,ink);
  box(29,40,7,1,'#855443');box(30,42,5,1,tint(a.skin,12));
  shape([[22,19],[25,14],[38,14],[42,19],[43,29],[40,28],[38,20],[32,18],[25,23],[24,31],[21,30]],a.hair);
  box(26,15,10,2,tint(a.hair,16));box(21,29,2,10,a.hair);box(41,26,3,13,tint(a.hair,-14));
  if(a.beard==='full'){
    shape([[23,35],[27,39],[31,41],[35,40],[40,35],[41,40],[37,49],[31,51],[26,47]],a.hair);
    box(28,40,7,1,'#855443');box(28,45,2,3,tint(a.hair,20));box(34,44,2,4,tint(a.hair,-18));
  }else if(a.beard==='point'){
    shape([[27,37],[32,38],[37,36],[36,39],[31,40]],a.hair);shape([[29,43],[36,42],[34,50],[31,51]],a.hair);box(31,44,2,4,tint(a.hair,18));
  }else if(a.beard==='moustache'){
    shape([[27,38],[32,36],[38,37],[40,40],[34,39],[32,38],[29,40],[26,40]],a.hair);
  }
  if(a.glasses){
    for(const x of [24,35]){box(x,28,7,1,gold);box(x,32,7,1,gold);box(x,28,1,5,gold);box(x+6,28,1,5,gold);}box(31,29,4,1,gold);
  }
  if(a.hat==='cap'){
    shape([[19,18],[20,11],[25,8],[37,8],[42,13],[44,19]],tint(a.coat,-20));box(20,17,24,3,ink);box(22,17,20,1,a.trim);box(26,9,9,2,tint(a.coat,8));
  }else if(a.hat==='beret'){
    shape([[17,17],[18,12],[25,8],[38,9],[44,14],[42,18],[23,20]],tint(a.coat,-15));box(23,18,18,2,ink);box(21,12,12,2,tint(a.coat,12));box(38,11,2,4,a.trim);
  }else if(a.hat==='wrap'){
    shape([[19,20],[19,13],[23,8],[36,6],[43,11],[45,19],[41,22],[36,17],[25,17]],'#d5c39a');
    box(22,12,18,2,'#eee0b4');box(20,17,12,2,'#b29b74');box(36,10,3,7,a.trim);box(37,11,2,3,'#5c8390');
  }else if(a.hat==='jewel'){
    shape([[20,18],[20,11],[25,8],[38,9],[44,15],[43,20]],'#6d3852');box(22,17,21,3,a.trim);box(31,16,4,5,'#c2ae70');box(32,17,2,3,'#a44d58');
  }
  if(person.kind==='cartographer'){
    box(5,65,18,11,ink);box(6,65,16,9,paper);box(7,66,14,1,'#f1dfac');box(9,68,10,1,'#a0885d');box(10,71,7,1,'#83916e');box(6,75,17,3,'#b49b70');
  }else if(person.kind==='collector'){
    shape([[42,65],[58,62],[59,74],[44,77]],paper);box(49,68,5,5,'#98594e');box(50,68,3,2,'#bf7f61');
  }else if(a.scene==='stars'){
    shape([[4,69],[20,53],[24,57],[8,73]],'#af9868');box(4,68,5,5,'#dbc38b');box(19,53,5,5,'#d0b87b');
  }else{
    box(43,68,17,8,'#252f39');box(42,70,19,3,'#737a78');box(44,75,4,3,'#352f34');box(55,75,4,3,'#352f34');
  }
  box(0,0,64,2,ink);box(0,78,64,2,ink);box(0,0,2,80,ink);box(62,0,2,80,ink);
  const url=canvas.toDataURL('image/png');cache.set(person.id,url);return url;
}
