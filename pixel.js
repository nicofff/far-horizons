export const alphabet={
  A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','10101','01010'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],
  0:['01110','10001','10011','10101','11001','10001','01110'],1:['00100','01100','00100','00100','00100','00100','01110'],2:['01110','10001','00001','00010','00100','01000','11111'],3:['11110','00001','00001','01110','00001','00001','11110'],4:['00010','00110','01010','10010','11111','00010','00010'],5:['11111','10000','10000','11110','00001','00001','11110'],6:['01110','10000','10000','11110','10001','10001','01110'],7:['11111','00001','00010','00100','01000','01000','01000'],8:['01110','10001','10001','01110','10001','10001','01110'],9:['01110','10001','10001','01111','00001','00001','01110'],
  '.':['0','0','0','0','0','1','1'],',':['0','0','0','0','0','1','1','1'],':':['0','1','1','0','1','1','0'],'/':['00001','00001','00010','00100','01000','10000','10000'],'-':['00000','00000','00000','11111','00000','00000','00000'],'+':['00000','00100','00100','11111','00100','00100','00000'],'!':['1','1','1','1','1','0','1'],'?':['01110','10001','00001','00010','00100','00000','00100'],'>':['10000','01000','00100','00010','00100','01000','10000'],'<':['00001','00010','00100','01000','00100','00010','00001'],"'":['1','1','0','0','0','0','0'],'%':['11001','11010','00010','00100','01000','01011','10011'],'=':['00000','11111','00000','11111','00000','00000','00000'],
};
export const palette={ink:'#111326',panel:'#202450',panelLight:'#303864',edge:'#a2acc7',shadow:'#090d20',white:'#f4e7b5',gold:'#f8cb70',muted:'#a8b6c7',green:'#88c070',red:'#e88878',sea:'#235889'};
export function text(ctx,value,x,y,color=palette.white,scale=1){
  ctx.fillStyle=color;let cursor=Math.round(x);
  for(const ch of String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()){
    const glyph=alphabet[ch];if(glyph)glyph.forEach((row,j)=>[...row].forEach((bit,i)=>{if(bit==='1')ctx.fillRect(cursor+i*scale,Math.round(y)+j*scale,scale,scale);}));cursor+=6*scale;
  }
}
export function wrapText(ctx,value,x,y,width,color=palette.white,maxLines=3){
  let line='',row=0;for(const word of String(value).split(/\s+/)){if((line+word).length*6>width&&line){text(ctx,line.trim(),x,y+row*11,color);line='';row++;if(row>=maxLines)return;}line+=word+' ';}if(row<maxLines)text(ctx,line.trim(),x,y+row*11,color);
}
export function panel(ctx,x,y,w,h,fill=palette.panel){
  ctx.fillStyle=palette.shadow;ctx.fillRect(x+2,y+2,w,h);ctx.fillStyle=palette.edge;ctx.fillRect(x,y,w,h);ctx.fillStyle=palette.panelLight;ctx.fillRect(x+1,y+1,w-2,h-2);ctx.fillStyle=fill;ctx.fillRect(x+3,y+3,w-6,h-6);
}
export function sprite(ctx,rows,x,y,colors,scale=1,flip=false){
  rows.forEach((row,j)=>[...row].forEach((c,i)=>{if(colors[c]){ctx.fillStyle=colors[c];ctx.fillRect(Math.round(x+(flip?row.length-1-i:i)*scale),Math.round(y+j*scale),scale,scale);}}));
}
const ship=[
'............brrr..........',
'............brrr..........',
'............b.............',
'...........wb.............',
'..........wwb.............',
'.........wwwb.w...........',
'........wwwwb.ww..........',
'.......wwwwwb.www.........',
'......wwwwwwb.wwww........',
'.....wwwwwwwb.wwwww.......',
'.....wwwwwwwb.wwwww.......',
'......sswwwwb.wwwwww......',
'........ssssb.ssssss......',
'............b.............',
'.....a......b.......a.....',
'....aaabbbbbbbbbbbbaaa....',
'.....abcccccccccccbaa.....',
'......abcccccccccbaa......',
'.......abbbbbbbbbaa.......',
'.........aaaaaaaa.........',
'.......tttttttttttt.......',
];
export function drawShip(ctx,x,y,{enemy=false,small=false,flip=false,bob=0}={}){
  const colors={b:'#3b293b',a:'#b97748',c:'#80533d',w:enemy?'#b1b4c7':'#f4e7b5',s:enemy?'#767d9a':'#d6bb80',r:enemy?'#d85b5c':'#dc7950',t:'#3982a5'};
  ctx.save();ctx.translate(Math.round(x),Math.round(y+bob));if(small)ctx.scale(.75,.75);sprite(ctx,ship,-13,-13,colors,1,flip);ctx.restore();
}
export function drawTown(ctx,x,y){
  const roof='#b85b47',wall='#e6d49d',shade='#b39f79';
  ctx.fillStyle='#705142';ctx.fillRect(x-26,y+9,45,5);ctx.fillStyle='#b68a56';for(let i=0;i<4;i++)ctx.fillRect(x-25+i*12,y+9,2,7);
  for(const [dx,dy,w,h]of [[-13,-3,12,10],[2,-8,11,15],[15,-1,9,8],[-25,0,10,7]]){ctx.fillStyle=shade;ctx.fillRect(x+dx,y+dy,w,h);ctx.fillStyle=wall;ctx.fillRect(x+dx,y+dy,w-3,h);ctx.fillStyle=roof;ctx.fillRect(x+dx-2,y+dy-3,w+4,3);ctx.fillRect(x+dx,y+dy-5,w,2);ctx.fillStyle='#3b3443';ctx.fillRect(x+dx+3,y+dy+3,2,3);}
  ctx.fillStyle='#e6d49d';ctx.fillRect(x+4,y-20,7,10);ctx.fillStyle=roof;ctx.fillRect(x+3,y-22,9,3);ctx.fillStyle='#5d4343';ctx.fillRect(x+7,y-25,1,4);
}
export function drawTree(ctx,x,y,variant=0){ctx.fillStyle='#544e37';ctx.fillRect(x+2,y+3,2,6);ctx.fillStyle=variant?'#315b46':'#285447';ctx.fillRect(x,y,6,5);ctx.fillRect(x+1,y-2,4,2);ctx.fillStyle='#54885a';ctx.fillRect(x+1,y,2,2);}
