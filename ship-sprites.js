const designs={
  balsa:{length:22,depth:2,rig:[[22,13,'raft',10]],raft:true},
  'hansa-cog':{length:25,depth:6,rig:[[24,8,'square',13]],stern:5,bow:3},
  'light-galley':{length:32,depth:3,rig:[[24,10,'lateen',16]],oars:6},
  tallette:{length:25,depth:4,rig:[[21,10,'lateen',13],[30,17,'lateen',8]],stern:2},
  dhow:{length:29,depth:4,rig:[[23,5,'lateen',20]],bow:4},
  'caravela-latina':{length:29,depth:5,rig:[[17,12,'lateen',12],[28,6,'lateen',15]],stern:3},
  'caravela-redonda':{length:29,depth:5,rig:[[17,13,'lateen',10],[28,7,'square',13]],stern:3},
  buss:{length:32,depth:7,rig:[[17,9,'square',11],[30,5,'square',13]],stern:3,cabin:true},
  brigantine:{length:31,depth:4,rig:[[16,12,'gaff',10],[29,5,'square',12]],jib:true},
  'flemish-galleon':{length:37,depth:6,rig:[[13,14,'lateen',9],[23,4,'square',12],[34,10,'square',10]],stern:5,oars:5,guns:4},
  nao:{length:33,depth:7,rig:[[14,14,'lateen',10],[24,3,'square',14],[35,10,'square',10]],stern:5,bow:3},
  xebec:{length:40,depth:4,rig:[[12,13,'lateen',11],[24,4,'lateen',16],[36,10,'lateen',12]],bow:2},
  'venetian-galeass':{length:42,depth:5,rig:[[12,12,'lateen',10],[24,3,'lateen',15],[36,10,'lateen',11]],stern:4,bow:3,oars:9,guns:6},
  carrack:{length:38,depth:7,rig:[[12,13,'lateen',10],[24,2,'square',15],[36,9,'square',11]],stern:7,bow:4},
  pinnace:{length:27,depth:3,rig:[[18,12,'gaff',11],[29,7,'square',10]],jib:true,stern:1},
  'la-reale':{length:42,depth:3,rig:[[18,9,'lateen',15],[31,5,'lateen',16]],stern:5,oars:10,awning:true},
  galleon:{length:40,depth:7,rig:[[12,13,'lateen',10],[24,2,'square',14],[36,8,'square',12]],stern:6,bow:3,guns:6},
  sloop:{length:29,depth:4,rig:[[21,5,'gaff',17]],jib:true,bow:1},
  frigate:{length:42,depth:5,rig:[[12,10,'square',10],[24,2,'square',13],[36,7,'square',11]],jib:true,stern:3,guns:7},
  barge:{length:44,depth:7,rig:[[12,11,'square',10],[24,2,'square',14],[36,7,'square',11]],stern:6,bow:4,guns:9,doubleDeck:true},
  'full-rigged-ship':{length:44,depth:7,rig:[[10,11,'square',9],[22,2,'square',12],[34,5,'square',11],[41,15,'gaff',7]],stern:4,bow:3,guns:8,doubleDeck:true},
  junk:{length:35,depth:6,rig:[[13,12,'junk',9],[25,3,'junk',12],[36,9,'junk',10]],stern:6,bow:4,redSails:true},
  kansen:{length:31,depth:3,rig:[[24,9,'lug',13]],oars:7,bow:2},
  atakabune:{length:37,depth:5,rig:[[27,5,'lug',13]],oars:7,bow:3,castle:7},
  tekkousen:{length:42,depth:6,rig:[[29,3,'lug',14]],oars:8,bow:4,castle:10,armor:true,guns:5},
  barque:{length:35,depth:5,rig:[[13,13,'gaff',10],[24,4,'square',12],[35,10,'square',10]],stern:3},
};

function buildSprite(d){
  const pixels=Array.from({length:40},()=>Array(48).fill('.'));
  const dot=(x,y,color)=>{if(x>=0&&x<48&&y>=0&&y<40)pixels[y][x]=color;};
  const box=(x,y,w,h,color)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)dot(i,j,color);};
  const line=(x,y,endX,endY,color)=>{
    const steps=Math.max(Math.abs(endX-x),Math.abs(endY-y));
    for(let i=0;i<=steps;i++)dot(Math.round(x+(endX-x)*(steps?i/steps:0)),Math.round(y+(endY-y)*(steps?i/steps:0)),color);
  };
  const shape=(points,color)=>{
    for(let y=Math.min(...points.map(p=>p[1]));y<=Math.max(...points.map(p=>p[1]));y++){
      const edges=[];
      for(let i=0;i<points.length;i++){
        const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length];
        if((ay<=y&&by>y)||(by<=y&&ay>y))edges.push(ax+(y-ay)*(bx-ax)/(by-ay));
      }
      edges.sort((a,b)=>a-b);
      for(let i=0;i<edges.length;i+=2)for(let x=Math.ceil(edges[i]);x<=Math.floor(edges[i+1]);x++)dot(x,y,color);
    }
  };
  const left=24-Math.floor(d.length/2),right=left+d.length-1,deck=27,bottom=deck+d.depth;
  box(left+4,bottom+1,d.length-7,1,'t');box(left+7,bottom+2,d.length-13,1,'u');
  if(d.oars)for(let i=0;i<d.oars;i++){
    const x=left+5+Math.round(i*(d.length-11)/Math.max(1,d.oars-1));
    line(x,28,x-3,35,'b');line(x,29,x-3,36,'a');
  }
  for(const [x,top,rig,width] of d.rig){
    line(x,top,x,deck,'b');line(x,top+2,left+3,deck,'v');line(x,top+3,right-2,deck,'v');
    if(rig==='lateen'){
      const high=x+Math.ceil(width/2),low=x-Math.floor(width/2);
      shape([[high,top+2],[low,22],[high-3,24]],'s');
      shape([[high-1,top+3],[low+2,21],[high-4,22]],'w');
      line(low-1,22,high,top+1,'a');line(high-3,24,low,22,'h');
    }else if(rig==='gaff'){
      shape([[x-1,top+3],[x-width,top+7],[x-width+2,23],[x-1,24]],'s');
      shape([[x-2,top+4],[x-width+1,top+8],[x-width+3,21],[x-2,22]],'w');
      line(x,top+2,x-width,top+6,'a');line(x-width+1,24,x,24,'a');
    }else if(rig==='junk'){
      shape([[x-5,top+4],[x+3,top+1],[x+width-4,top+5],[x+width-5,22],[x-5,24]],'s');
      shape([[x-4,top+5],[x+3,top+2],[x+width-5,top+6],[x+width-6,21],[x-4,23]],'w');
      for(let y=top+7;y<24;y+=4)line(x-5,y,x+width-5,y-2,'h');
      line(x-5,top+4,x-5,24,'a');
    }else{
      const tiers=rig==='square'&&top<11?2:1;
      for(let i=0;i<tiers;i++){
        const y=top+3+i*9,w=width-(i===0&&tiers===2?3:0),l=x-Math.floor(w/2);
        if(rig==='lug'||rig==='raft'){
          shape([[l,y+2],[l+w,y],[l+w-1,23],[l+1,23]],'s');
          shape([[l+1,y+3],[l+w-1,y+1],[l+w-2,21],[l+2,22]],'w');
          line(l-1,y+2,l+w,y,'a');
          if(rig==='lug')for(let sx=l+3;sx<l+w-1;sx+=3)line(sx,y+3,sx,21,'h');
        }else{
          shape([[l,y],[l+w,y],[l+w+1,y+6],[l+w-2,y+8],[l+2,y+8],[l-1,y+6]],'s');
          box(l+1,y+1,w-1,5,'w');box(l+2,y+6,w-3,1,'w');line(l-1,y,l+w+1,y,'a');
          line(x,y+1,x,y+6,'h');
        }
      }
    }
    box(x,top,1,2,'a');box(x+1,top,4,2,'r');dot(x+4,top+1,'.');
  }
  if(d.jib){
    const [x,top]=d.rig[d.rig.length-1];
    shape([[x+2,top+4],[right+2,25],[x+3,22]],'s');
    shape([[x+3,top+7],[right,24],[x+4,21]],'w');
  }
  if(d.raft){
    for(let y=27;y<31;y++){box(left,y,d.length,1,y%2?'a':'h');dot(left-1,y,'b');dot(right+1,y,'b');}
    for(const x of [left+5,right-5])box(x,27,1,4,'b');
  }else{
    shape([[left-1,deck-2],[left+3,deck],[right-3,deck],[right+2,deck-3],[right-1,bottom-2],[right-5,bottom+1],[left+5,bottom+1],[left+1,bottom-2]],'b');
    shape([[left+1,deck],[right,deck],[right-2,bottom-1],[right-6,bottom],[left+6,bottom],[left+3,bottom-1]],'c');
    box(left+3,deck,d.length-5,1,'h');box(left+5,deck+2,d.length-9,1,'a');
    if(d.stern){box(left,deck-d.stern,7,d.stern,'b');box(left+1,deck-d.stern+1,5,d.stern-1,'c');box(left-1,deck-d.stern,9,1,'h');}
    if(d.bow){box(right-5,deck-d.bow,5,d.bow,'c');box(right-6,deck-d.bow,7,1,'h');}
    if(d.cabin){box(17,24,11,3,'c');box(16,23,13,1,'h');}
    if(d.awning){box(left+1,21,9,4,'r');for(let x=left+2;x<left+10;x+=3)box(x,21,1,4,'w');box(left,20,11,1,'h');}
    if(d.castle){
      box(12,deck-d.castle,13,d.castle,'b');box(13,deck-d.castle+1,11,d.castle-2,'w');
      box(11,deck-d.castle,15,2,'c');box(14,deck-d.castle-3,9,3,'w');box(13,deck-d.castle-4,11,1,'b');
      for(let x=15;x<24;x+=4)box(x,deck-d.castle+3,2,3,'b');
    }
    if(d.guns)for(let i=0;i<d.guns;i++){
      const x=left+5+Math.round(i*(d.length-12)/(d.guns-1));box(x,deck+2,2,2,'b');
      if(d.doubleDeck)box(x+1,deck+5,2,1,'b');
    }
    if(d.stern>=4)for(let x=left+2;x<left+6;x+=2)dot(x,deck-d.stern+2,'g');
  }
  return Object.freeze(pixels.map(row=>row.join('')));
}

export const shipSprites=Object.freeze(Object.fromEntries(Object.entries(designs).map(([id,d])=>[id,buildSprite(d)])));
const aliases={caravel:'caravela-latina'};
export function shipSprite(type){return shipSprites[aliases[type]||type]||shipSprites['caravela-latina'];}

export function drawShip(ctx,x,y,{type='caravela-latina',enemy=false,small=false,flip=false,bob=0}={}){
  const design=designs[aliases[type]||type]||designs['caravela-latina'];
  const colors={b:'#302838',a:design.armor?'#747e85':'#ad7046',c:design.armor?'#454c5a':'#754837',h:design.armor?'#a3a9a3':'#d5a567',w:design.redSails?'#c97b55':'#f4e7b5',s:design.redSails?'#914a40':'#c8ad78',v:'#62616c',r:enemy?'#dc5756':'#d77b4b',g:'#f4d783',t:'#3982a5',u:'#326b91'};
  ctx.save();ctx.translate(Math.round(x),Math.round(y+bob));if(small)ctx.scale(.6,.6);
  for(const [j,row] of shipSprite(type).entries())for(let i=0;i<row.length;i++){
    const color=row[i];if(!colors[color])continue;
    ctx.fillStyle=colors[color];ctx.fillRect((flip?47-i:i)-24,j-25,1,1);
  }
  ctx.restore();
}

const previews=new Map();
export function shipSpriteUrl(type,enemy=false){
  const key=type+':'+enemy;if(previews.has(key))return previews.get(key);
  const canvas=document.createElement('canvas');canvas.width=48;canvas.height=40;
  drawShip(canvas.getContext('2d'),24,25,{type,enemy});
  const url=canvas.toDataURL('image/png');previews.set(key,url);return url;
}
