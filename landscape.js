import { biomeStyleAt } from './biomes.js';
import { seasonalStyleAt } from './world-time.js';

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

export function drawScenery(c,position,view,landAt,month){
  const left=position.x-view.width/2/view.scale,top=position.y-view.height/2/view.scale,cell=.5,items=[];
  for(let gy=Math.floor(top/cell)-1;gy<(top+view.height/view.scale)/cell+2;gy++)for(let gx=Math.floor(left/cell)-1;gx<(left+view.width/view.scale)/cell+2;gx++){
    const h=terrainHash(gx,gy),x=(gx+.5)*cell+((h>>>8)%7-3)*.035,y=(gy+.5)*cell+((h>>>16)%7-3)*.035;
    if(!landAt(x,y))continue;
    const style=month===undefined?biomeStyleAt(x,y):seasonalStyleAt(x,y,month),cluster=terrainHash(Math.floor(x),Math.floor(y));
    if(h%100>=style.density*100||(style.feature==='jungle'||style.feature==='pine')&&cluster%9===0)continue;
    if(!landAt(x-.3,y-.3)||!landAt(x+.3,y-.3)||!landAt(x,y-.55)||!landAt(x,y+.1))continue;
    items.push({x:Math.round((x-left)*view.scale),y:Math.round((y-top)*view.scale),style,h});
  }
  items.sort((a,b)=>a.y-b.y);for(const item of items)scenery(c,item.x,item.y,item.style,item.h);
}
