import { landColor, drawScenery, terrainHash } from './landscape.js';

const TILE=256,PADDING=32,MAX_TILES=32;

export function createSeaBackground(view,landAt,createCanvas=()=>document.createElement('canvas')){
  const tiles=new Map();
  function tile(tx,ty){
    const key=`${tx},${ty}`;
    if(tiles.has(key)){const image=tiles.get(key);tiles.delete(key);tiles.set(key,image);return image;}
    const image=createCanvas();image.width=image.height=TILE+PADDING*2;
    const c=image.getContext('2d',{alpha:false}),left=tx*TILE-PADDING,top=ty*TILE-PADDING;
    c.fillStyle='#2865ce';c.fillRect(0,0,image.width,image.height);
    for(let sy=0;sy<image.height;sy+=2)for(let sx=0;sx<image.width;sx+=2){
      const wx=(left+sx)/view.scale,wy=(top+sy)/view.scale,h=terrainHash(Math.floor(wx*8),Math.floor(wy*8));
      if(landAt(wx,wy)){
        const coast=!landAt(wx-.12,wy)||!landAt(wx+.12,wy)||!landAt(wx,wy-.12)||!landAt(wx,wy+.12);
        c.fillStyle=landColor(wx,wy,coast);c.fillRect(sx,sy,2,2);
      }else{
        const shallow=landAt(wx-.25,wy)||landAt(wx+.25,wy)||landAt(wx,wy-.25)||landAt(wx,wy+.25);
        if(shallow){c.fillStyle=h%3?'#468ed7':'#85c4df';c.fillRect(sx,sy,2,2);}
        else if(h%19===0){c.fillStyle='#306dd5';c.fillRect(sx,sy,2,2);}
      }
    }
    // Render beyond each tile so trees crossing a seam survive the crop.
    const area={width:image.width,height:image.height,scale:view.scale};
    drawScenery(c,{x:(left+image.width/2)/view.scale,y:(top+image.height/2)/view.scale},area,landAt);
    tiles.set(key,image);if(tiles.size>MAX_TILES)tiles.delete(tiles.keys().next().value);
    return image;
  }
  return {
    draw(c,position){
      const left=Math.round(position.x*view.scale-view.width/2),top=Math.round(position.y*view.scale-view.height/2);
      for(let ty=Math.floor(top/TILE);ty*TILE<top+view.height;ty++)for(let tx=Math.floor(left/TILE);tx*TILE<left+view.width;tx++){
        c.drawImage(tile(tx,ty),PADDING,PADDING,TILE,TILE,view.x+tx*TILE-left,view.y+ty*TILE-top,TILE,TILE);
      }
    },
    clear(){tiles.clear();},
    get size(){return tiles.size;},
  };
}
