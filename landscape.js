import { biomeStyleAt } from './biomes.js';
import { seasonalStyleAt } from './world-time.js';
import { elevationAt, mountainAt } from './relief.js';

export function terrainHash(x,y){let h=Math.imul(x,374761393)^Math.imul(y,668265263);h=Math.imul(h^(h>>>13),1274126177);return (h^(h>>>16))>>>0;}

export function landColor(x,y,coast,month){
  const style=month===undefined?biomeStyleAt(x,y):seasonalStyleAt(x,y,month),h=terrainHash(Math.floor(x*16),Math.floor(y*16));
  if(coast)return style.shore[h%4===0?1:0];
  const patch=terrainHash(Math.floor(x*3),Math.floor(y*3));
  return style.ground[h%29===0?1:patch%7===0?2:0];
}

function scenery(c,x,y,style,h){
  const [dark,leaf,light]=style.leaves,ground=style.ground;
  const box=(dx,dy,w,height,color)=>{c.fillStyle=color;c.fillRect(x+dx,y+dy,w,height);};
  const tree=(wide=false)=>{
    box(-1,-8,3,10,'#66563c');box(2,-6,1,6,'#91734b');
    box(-7,-16,14,10,dark);box(-9,-13,18,6,dark);box(-5,-19,10,4,dark);
    box(-6,-16,11,9,leaf);box(-3,-18,7,3,leaf);box(-7,-13,3,4,leaf);
    box(-5,-16,4,3,light);box(1,-13,3,2,light);box(-2,-10,2,2,light);
    if(wide){box(-11,-12,5,6,dark);box(6,-15,5,8,dark);box(7,-14,3,4,leaf);box(-10,-11,3,2,leaf);}
  };
  const palm=()=>{
    box(0,-12,2,14,'#8c6e43');box(-1,-7,1,6,'#b5935c');box(1,-17,2,6,'#a4854e');
    for(const [dx,dy,w,hh] of [[-2,-19,7,3],[-7,-18,6,3],[-11,-16,5,2],[-12,-14,2,3],[4,-18,6,3],[9,-16,4,2],[11,-14,2,3],[-3,-16,3,4],[-5,-13,2,3],[3,-16,3,5],[5,-12,2,3]])box(dx,dy,w,hh,dark);
    box(-7,-18,6,1,light);box(3,-18,6,1,leaf);box(-10,-16,5,1,leaf);box(7,-16,5,1,light);
  };
  switch(style.feature){
    case 'jungle':
      if(h%8===0)palm();else tree(true);
      box(-5,0,4,2,dark);box(3,1,4,2,leaf);break;
    case 'broadleaf':tree();break;
    case 'pine':
      box(-1,-8,2,10,'#625a43');
      for(const [dy,w] of [[-22,2],[-19,6],[-16,10],[-12,14],[-8,16]]){box(-w/2,dy,w,4,dark);box(-w/2+1,dy,w/2,2,leaf);}
      box(-1,-22,1,4,light);box(-4,-15,3,1,light);box(-6,-8,3,1,light);break;
    case 'acacia':
      box(0,-8,2,10,'#756442');box(-2,-11,3,5,'#756442');box(1,-12,3,5,'#756442');
      box(-10,-15,20,5,dark);box(-7,-17,13,3,leaf);box(-9,-15,10,2,light);box(4,-14,4,2,leaf);break;
    case 'olive':
      if(h%3===0){box(-4,-3,8,4,dark);box(-2,-5,4,3,leaf);box(-2,-4,2,1,light);break;}
      box(-1,-6,2,8,'#756b48');box(-6,-11,12,6,dark);box(-4,-13,9,5,leaf);box(-5,-10,3,2,light);box(1,-12,3,2,light);break;
    case 'mangrove':
      box(-1,-7,2,8,'#80734e');box(-5,0,2,3,'#80734e');box(3,0,2,3,'#80734e');box(-3,-2,2,3,'#a79865');box(1,-2,3,2,'#a79865');
      box(-8,-14,16,7,dark);box(-10,-11,20,4,dark);box(-5,-17,10,5,leaf);box(-7,-13,13,5,leaf);box(-4,-16,4,2,light);box(2,-12,4,2,light);break;
    case 'dune':
      if(h%9===0){box(-3,-2,7,3,'#aa945f');box(-2,-4,4,3,'#bba371');box(-2,-4,2,1,'#e3ce9b');break;}
      if(h%7===0){box(-3,0,6,1,dark);box(-2,-3,1,3,leaf);box(1,-4,1,4,leaf);break;}
      for(const [dx,dy,w] of [[-13,2,5],[-8,0,5],[-3,-2,6],[3,-3,5],[8,-2,5]]){box(dx,dy,w,1,'#b99a5e');box(dx,dy-1,w,1,'#ead19a');}
      box(-8,4,12,1,ground[2]);box(4,2,7,1,ground[1]);break;
    case 'grass':
    case 'reeds':
      for(let i=0;i<4;i++){const dx=-5+i*3,height=style.feature==='reeds'?4+(h>>i)%5:2+(h>>i)%3;box(dx,-height,1,height,dark);box(dx-1,-height,1,1,leaf);}
      box(-6,1,13,1,ground[2]);break;
    case 'ice':
      box(-11,-4,17,1,'#acc8ca');box(-7,-5,7,1,'#f1f4eb');box(5,-3,4,1,'#acc8ca');box(8,-2,3,1,'#acc8ca');
      if(h%3===0){box(-4,-7,5,3,'#edf3ec');box(-6,-4,9,3,'#bad0cd');box(1,-4,3,4,'#8eafb4');}break;
    case 'tundra':
      if(h%3){box(-5,0,8,2,dark);box(-3,-1,4,1,leaf);box(4,2,4,1,'#d6dfd0');break;}
      box(-7,-2,15,3,'#d9e2d5');box(-5,-3,10,1,'#e6ebdf');
      box(-3,-5,5,5,'#8b9587');box(-2,-6,3,2,'#b9c2b0');break;
    default:
      box(-6,-3,13,5,'#737b6a');box(-4,-7,8,5,'#aab09c');box(-3,-8,4,2,'#c4c8b1');box(2,-5,4,5,'#858e7b');box(-8,2,17,1,ground[2]);
  }
}

function mountain(c,x,y,style,h,strength,elevation,latitude,month){
  const arid=style.feature==='dune'||style.feature==='olive',frozen=style.feature==='ice'||style.feature==='tundra';
  const colors=arid?['#68675b','#918b78','#bbb59d']:frozen?['#63777a','#93a5a1','#bdcac0']:['#4d5e57','#7d8b78','#a4ad91'];
  const height=12+strength*3+Math.min(6,Math.floor(elevation/650))+(h%4),half=10+strength*3+((h>>>4)%4),peak=-4+(h>>>9)%8;
  const winter=month===null||month===undefined?0:Math.cos((month-.5)*Math.PI/6)*(latitude<0?-1:1);
  const snowLine=Math.max(900,3900-Math.max(0,Math.abs(latitude)-20)*45-winter*300);
  const snow=elevation>=snowLine?Math.min(9,3+Math.floor((elevation-snowLine)/350)):0;
  const paint=(points,color)=>{
    points=points.map(([dx,dy])=>[Math.round(dx),Math.round(dy)]);c.fillStyle=color;
    const bottom=Math.max(...points.map(p=>p[1]));
    for(let row=Math.min(...points.map(p=>p[1]));row<bottom;row++){
      const crossings=[];
      for(let i=0;i<points.length;i++){
        const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length];
        if((ay<=row+.5&&by>row+.5)||(by<=row+.5&&ay>row+.5))crossings.push(ax+(row+.5-ay)*(bx-ax)/(by-ay));
      }
      crossings.sort((a,b)=>a-b);
      for(let i=0;i+1<crossings.length;i+=2){const left=Math.round(crossings[i]),right=Math.round(crossings[i+1]);if(right>left)c.fillRect(x+left,y+row,right-left,1);}
    }
  };
  const west=[[-half,1],[-half*.8,-height*.3],[-half*.6,-height*.27],[-half*.42,-height*.62],[-half*.25,-height*.5],[peak,-height]];
  paint([...west,[half*.25,-height*.6],[half*.4,-height*.7],[half*.65,-height*.3],[half*.75,-height*.36],[half,1]],colors[0]);
  paint([...west,[peak+half*.22,-height*.44],[half*.2,1]],colors[1]);
  paint([[peak,-height],[-half*.25,-height*.5],[-half*.42,-height*.62],[-half*.57,-height*.25],[-half*.35,-height*.35],[-half*.5,1],[-half*.1,-height*.2],[peak+half*.08,-height*.48]],colors[2]);
  paint([[half*.4,-height*.7],[half*.1,-height*.2],[half*.6,1],[half*.45,-height*.35]],colors[1]);
  if(snow){
    paint([[peak,-height],[peak+snow*.55,-height+snow],[peak+1,-height+snow-1],[peak-1,-height+snow+2],[peak-snow*.55,-height+snow]],'#e3e8dc');
    paint([[peak,-height],[peak+snow*.55,-height+snow],[peak+1,-height+snow-1],[peak-1,-height+snow+2]],'#b3c7c4');
  }
  c.fillStyle=style.ground[2];c.fillRect(x-half+1,y+1,half*2-2,1);
}

function mountainFits(x,y,landAt){
  // Check the whole sprite footprint so a river cannot disappear beneath a ridge.
  for(let dy=-.75;dy<=.125;dy+=.125)for(let dx=-.625;dx<=.625;dx+=.125)if(!landAt(x+dx,y+dy))return false;
  return true;
}

export function drawScenery(c,position,view,landAt,month){
  const left=position.x-view.width/2/view.scale,top=position.y-view.height/2/view.scale,cell=.5,items=[];
  for(let gy=Math.floor(top/cell)-1;gy<(top+view.height/view.scale)/cell+2;gy++)for(let gx=Math.floor(left/cell)-1;gx<(left+view.width/view.scale)/cell+2;gx++){
    const h=terrainHash(gx,gy),x=(gx+.5)*cell+((h>>>8)%7-3)*.035,y=(gy+.5)*cell+((h>>>16)%7-3)*.035;
    if(!landAt(x,y))continue;
    const style=month===undefined?biomeStyleAt(x,y):seasonalStyleAt(x,y,month),cluster=terrainHash(Math.floor(x),Math.floor(y));
    if(mountainAt(x,y)&&h%5!==0)continue;
    if(h%100>=style.density*100||(style.feature==='jungle'||style.feature==='pine')&&cluster%9===0)continue;
    if(!landAt(x-.3,y-.3)||!landAt(x+.3,y-.3)||!landAt(x,y-.55)||!landAt(x,y+.1))continue;
    items.push({x:Math.round((x-left)*view.scale),y:Math.round((y-top)*view.scale),style,h});
  }
  const spacing=.7;
  for(let gy=Math.floor(top/spacing)-1;gy<(top+view.height/view.scale)/spacing+2;gy++)for(let gx=Math.floor(left/spacing)-1;gx<(left+view.width/view.scale)/spacing+2;gx++){
    const h=terrainHash(gx+829,gy-431),x=(gx+.5)*spacing+((h>>>8)%7-3)*.03,y=(gy+.5)*spacing+((h>>>16)%7-3)*.04;
    const strength=mountainAt(x,y);if(!strength||h%100>=[0,42,68,88][strength])continue;
    if(!mountainFits(x,y,landAt))continue;
    const style=month===undefined?biomeStyleAt(x,y):seasonalStyleAt(x,y,month);
    items.push({x:Math.round((x-left)*view.scale),y:Math.round((y-top)*view.scale),style,h,strength,elevation:elevationAt(x,y),latitude:90-y/5});
  }
  items.sort((a,b)=>a.y-b.y);for(const item of items){
    if(item.strength)mountain(c,item.x,item.y,item.style,item.h,item.strength,item.elevation,item.latitude,month);
    else scenery(c,item.x,item.y,item.style,item.h);
  }
}
