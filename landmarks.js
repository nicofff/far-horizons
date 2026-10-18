const sand={light:'#f5df9b',mid:'#d8b15f',shade:'#a57a43',dark:'#75593b'};
const SPRITE_SCALE=.5;

export function landmarkPoint(site,p){return {x:p.x+(site.drawOffset?.[0]||0),y:p.y+(site.drawOffset?.[1]||0)};}

function polygon(c,points,color){
  points=points.map(([x,y])=>[Math.round(x*SPRITE_SCALE),Math.round(y*SPRITE_SCALE)]);
  c.fillStyle=color;
  const bottom=Math.max(...points.map(p=>p[1]));
  for(let y=Math.min(...points.map(p=>p[1]));y<bottom;y++){
    const crossings=[];
    for(let i=0;i<points.length;i++){
      const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length];
      if((ay<=y+.5&&by>y+.5)||(by<=y+.5&&ay>y+.5))crossings.push(ax+(y+.5-ay)*(bx-ax)/(by-ay));
    }
    crossings.sort((a,b)=>a-b);
    for(let i=0;i+1<crossings.length;i+=2)c.fillRect(Math.round(crossings[i]),y,Math.round(crossings[i+1])-Math.round(crossings[i]),1);
  }
}
function rect(c,color,x,y,w,h){
  c.fillStyle=color;
  const left=Math.round(x*SPRITE_SCALE),top=Math.round(y*SPRITE_SCALE);
  c.fillRect(left,top,Math.round((x+w)*SPRITE_SCALE)-left,Math.round((y+h)*SPRITE_SCALE)-top);
}
function pyramid(c,x,y,w,h){
  polygon(c,[[x-w/2,y],[x,y-h],[x+w/2,y]],sand.mid);
  polygon(c,[[x,y-h],[x+w/2,y],[x+3,y]],sand.shade);
  polygon(c,[[x,y-h],[x+4,y-h+7],[x-4,y-h+7]],sand.light);
  for(let row=5;row<h;row+=5)rect(c,sand.shade,x-w*row/h/2,y-h+row,Math.max(2,w*row/h/2),1);
}
function arches(c,x,y,count,color){
  for(let i=0;i<count;i++){rect(c,color,x+i*6+1,y,3,5);rect(c,color,x+i*6+2,y-1,1,1);}
}

export function drawLandmark(c,site,x,y){
  c.save();c.translate(Math.round(x),Math.round(y));
  switch(site.sprite){
    case 'pyramids':
      polygon(c,[[-39,2],[-26,-7],[32,-5],[40,4],[19,8],[-28,7]],'#caa35b');
      pyramid(c,-23,1,22,19);pyramid(c,14,1,37,33);pyramid(c,-8,6,36,29);
      rect(c,sand.dark,24,5,13,3);rect(c,sand.mid,25,1,7,5);rect(c,sand.light,30,-3,5,7);rect(c,sand.dark,33,-1,1,2);
      break;
    case 'citadel':
      rect(c,'#846443',-23,2,46,4);rect(c,sand.shade,-21,-19,42,22);rect(c,sand.mid,-18,-20,36,23);
      for(const x of [-22,14]){rect(c,sand.shade,x,-25,9,27);rect(c,sand.light,x,-25,6,25);for(let i=0;i<3;i++)rect(c,sand.light,x+i*3,-28,2,5);rect(c,sand.dark,x+2,-15,2,4);}
      for(let i=0;i<6;i++)rect(c,sand.light,-15+i*6,-23,3,5);
      rect(c,sand.dark,-3,-7,7,10);rect(c,sand.dark,-1,-9,3,2);arches(c,-12,-14,4,sand.dark);
      break;
    case 'amphitheater':
      polygon(c,[[-28,-18],[-18,-26],[10,-29],[24,-23],[29,-15],[26,2],[-21,7],[-29,0]],'#b99672');
      polygon(c,[[-25,-18],[-16,-23],[10,-25],[21,-21],[23,-16],[10,-12],[-12,-12]],'#574d48');
      polygon(c,[[-28,-15],[-13,-8],[14,-10],[28,-17],[27,1],[15,7],[-13,8],[-28,2]],'#d1b08a');
      for(const y of [-5,2]){arches(c,-25,y,9,'#665345');rect(c,'#ead2ac',-27,y+5,52,1);}
      rect(c,'#b99672',-28,-12,12,6);rect(c,'#d1b08a',-28,-16,6,5);arches(c,-9,-18,5,'#665345');
      rect(c,'#998367',-23,8,48,2);break;
    case 'rock':
      polygon(c,[[-28,5],[-22,-8],[-14,-30],[-8,-34],[0,-25],[10,-20],[19,-8],[29,4]],'#b8b9a0');
      polygon(c,[[-8,-34],[0,-25],[10,-20],[19,-8],[29,4],[7,3],[-2,-10]],'#7f8d7e');
      polygon(c,[[-22,-8],[-14,-30],[-8,-34],[-13,-12],[-10,0],[-25,4]],'#e4dfba');
      rect(c,'#5b7449',-26,4,52,3);break;
    case 'volcano':
      polygon(c,[[-35,5],[-19,-8],[-7,-30],[6,-31],[17,-13],[35,5]],'#77705d');
      polygon(c,[[-7,-30],[6,-31],[17,-13],[35,5],[10,3],[1,-15]],'#504b48');
      rect(c,'#352f35',-6,-30,11,3);polygon(c,[[-33,5],[-18,-4],[-9,0],[-2,-6],[9,2],[18,-1],[32,6]],'#607149');break;
    case 'ruins':
      rect(c,'#c6a268',-28,4,58,4);rect(c,sand.shade,-24,0,49,4);
      for(const [x,h] of [[-24,23],[-15,18],[19,25],[27,17]]){rect(c,sand.shade,x,-h,4,h);rect(c,sand.light,x-1,-h,4,h);rect(c,sand.mid,x-2,-h-3,7,3);rect(c,sand.light,x-2,0,7,3);}
      rect(c,sand.mid,-6,-19,19,21);rect(c,sand.light,-8,-22,23,4);rect(c,sand.dark,-1,-10,9,13);rect(c,sand.dark,1,-13,5,3);
      rect(c,sand.light,12,3,8,3);rect(c,sand.mid,-18,5,12,3);break;
    case 'nubian-ruins':
      polygon(c,[[-32,4],[-23,-2],[23,-1],[33,6],[9,10],[-28,8]],'#ae925f');
      rect(c,'#895b46',-26,-10,48,16);rect(c,'#bd805c',-25,-10,45,13);
      polygon(c,[[-25,-10],[-25,-19],[-19,-19],[-19,-15],[-14,-15],[-14,-9],[-5,-9],[-5,-23],[3,-23],[3,-18],[11,-18],[11,-11],[20,-11],[20,3],[-25,3]],'#c39069');
      rect(c,'#ddbb8a',-24,-17,3,18);rect(c,'#ddbb8a',-4,-21,3,23);
      rect(c,'#594d3e',2,-8,8,11);rect(c,'#594d3e',4,-11,4,3);
      rect(c,'#895b46',-17,-7,5,5);rect(c,'#895b46',14,-5,4,4);
      for(const y of [-6,0,6])for(const x of [-28,-20,13,23])rect(c,'#95694d',x,y,6,2);
      rect(c,'#d6ab79',-30,5,10,3);rect(c,'#c39069',21,3,9,4);break;
    case 'waterfall':
      polygon(c,[[-34,-7],[-26,-18],[-14,-24],[12,-24],[29,-15],[34,-5],[26,8],[-25,8]],'#4d6242');
      polygon(c,[[-31,-5],[-24,-16],[-12,-21],[11,-21],[26,-13],[31,-4],[23,5],[-23,5]],'#8d7952');
      polygon(c,[[-27,-8],[-19,-16],[-9,-18],[9,-18],[21,-12],[27,-5],[20,1],[-21,1]],'#4d91ae');
      for(const [x,y,h] of [[-27,-8,12],[-21,-13,17],[-13,-17,21],[-5,-18,23],[3,-18,23],[11,-16,21],[19,-12,17],[25,-7,11]]){
        rect(c,'#b2d9d7',x,y,5,h);rect(c,'#e1ece0',x,y,2,h-2);rect(c,'#76b3c8',x+3,y+3,2,h-2);
      }
      polygon(c,[[-29,5],[-18,2],[15,2],[30,6],[19,11],[-20,11]],'#8ec6d1');
      for(const [x,y,w] of [[-24,5,12],[-9,7,16],[10,4,14],[-17,10,9],[3,10,13]])rect(c,'#cfdfd6',x,y,w,2);
      rect(c,'#347248',-31,-13,5,5);rect(c,'#628a51',23,-16,7,5);break;
    case 'mosque':
      rect(c,'#b5ab83',-27,-5,54,12);rect(c,'#e1d0a2',-26,-7,51,11);
      for(const x of [-18,-3,12]){polygon(c,[[x-7,-7],[x-6,-13],[x-3,-16],[x+2,-16],[x+6,-12],[x+7,-7]],'#e1d0a2');rect(c,'#a49575',x+3,-11,3,4);}
      arches(c,-24,-1,8,'#5c6250');rect(c,'#a49575',-29,6,58,3);
      rect(c,'#d3c294',-28,-21,5,23);rect(c,'#e8dab1',-29,-23,7,3);break;
    case 'temple':
      for(let i=0;i<4;i++){const w=58-i*10;rect(c,'#485449',-w/2,3-i*5,w,5);rect(c,'#9b9d7d',-w/2,3-i*5,w,1);}
      for(const [x,y] of [[-20,-7],[-10,-12],[0,-17],[10,-12],[20,-7]]){
        polygon(c,[[x-4,y],[x-3,y-6],[x,y-9],[x+3,y-6],[x+4,y]],'#8b9379');rect(c,'#c0b99a',x,y-10,1,3);rect(c,'#46574b',x-1,y-4,1,2);
      }
      rect(c,'#b1ac8d',-2,-23,4,6);rect(c,'#d1c4a1',-1,-26,2,4);
      for(const x of [-29,-19,15,25]){rect(c,'#317253',x,-2,5,8);rect(c,'#52805a',x+2,-4,3,5);}break;
    case 'buddha':
      rect(c,'#747b68',-18,4,36,5);rect(c,'#b7b18d',-20,8,40,3);
      polygon(c,[[-17,4],[-12,-3],[-8,-6],[-7,-17],[7,-17],[8,-6],[12,-3],[17,4]],'#5c8876');
      polygon(c,[[0,-17],[7,-17],[8,-6],[12,-3],[17,4],[4,4]],'#376657');
      rect(c,'#4a7968',-6,-29,12,13);rect(c,'#87a58a',-5,-27,3,9);rect(c,'#4a7968',-4,-32,8,4);rect(c,'#376657',-1,-34,3,3);
      rect(c,'#304e49',-4,-23,2,1);rect(c,'#304e49',3,-23,2,1);rect(c,'#afbd96',0,-24,1,5);rect(c,'#304e49',-1,-18,4,1);
      rect(c,'#87a58a',-8,-3,15,3);rect(c,'#376657',-4,2,11,1);break;
    case 'moai':
      rect(c,'#766e55',-28,5,56,4);
      for(const [x,h] of [[-18,24],[0,35],[19,27]]){
        polygon(c,[[x-7,4],[x-5,-h+12],[x-5,-h],[x+5,-h],[x+6,-h+12],[x+4,4]],'#9e9174');
        rect(c,'#716e5b',x+2,-h,4,h+4);rect(c,'#b8a586',x-5,-h+3,8,2);rect(c,'#4d564c',x-4,-h+5,3,2);
        rect(c,'#b8a586',x-1,-h+5,3,9);rect(c,'#665f50',x-3,-h+15,6,1);rect(c,'#9e9174',x-7,0,14,4);
      }break;
  }
  c.restore();
}
