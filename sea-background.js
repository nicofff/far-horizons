import { landColor, drawScenery, terrainHash } from './landscape.js';

const TILE=256,PADDING=32,MAX_TILES=32;
export const SURF_STEP=300;
const SURF_COLORS=['#83c6df','#b0dfe8','#d4eee5','#a0d1df'];

export function createSeaBackground(view,landAt,createCanvas=()=>document.createElement('canvas')){
  const tiles=new Map();
  function tile(tx,ty){
    const key=`${tx},${ty}`;
    if(tiles.has(key)){const entry=tiles.get(key);tiles.delete(key);tiles.set(key,entry);return entry;}
    const image=createCanvas();image.width=image.height=TILE+PADDING*2;
    const c=image.getContext('2d',{alpha:false}),left=tx*TILE-PADDING,top=ty*TILE-PADDING;
    const surf=Array.from({length:8},()=>SURF_COLORS.map(()=>[]));let hasLand=false;
    c.fillStyle='#2865ce';c.fillRect(0,0,image.width,image.height);
    for(let sy=0;sy<image.height;sy+=2)for(let sx=0;sx<image.width;sx+=2){
      const wx=(left+sx)/view.scale,wy=(top+sy)/view.scale,h=terrainHash(Math.floor(wx*8),Math.floor(wy*8));
      if(landAt(wx,wy)){
        hasLand=true;
        const coast=!landAt(wx-.12,wy)||!landAt(wx+.12,wy)||!landAt(wx,wy-.12)||!landAt(wx,wy+.12);
        c.fillStyle=landColor(wx,wy,coast);c.fillRect(sx,sy,2,2);
      }else{
        const shallow=landAt(wx-.25,wy)||landAt(wx+.25,wy)||landAt(wx,wy-.25)||landAt(wx,wy+.25);
        if(shallow){
          c.fillStyle=h%3?'#468ed7':'#85c4df';c.fillRect(sx,sy,2,2);
          if(sx>=PADDING&&sx<PADDING+TILE&&sy>=PADDING&&sy<PADDING+TILE){
            const near=r=>landAt(wx-r,wy)||landAt(wx+r,wy)||landAt(wx,wy-r)||landAt(wx,wy+r);
            const band=near(.1)?0:near(.2)?1:2,offset=terrainHash(Math.floor(wx),Math.floor(wy))%3;
            for(let phase=0;phase<8;phase++){
              const crest=(phase+offset)%8,color=crest<6&&band===2-Math.floor(crest/2)?2-band:crest===6&&band===0?3:-1;
              if(color>=0)surf[phase][color].push(sx-PADDING,sy-PADDING);
            }
          }
        }
        else if(h%19===0){c.fillStyle='#306dd5';c.fillRect(sx,sy,2,2);}
      }
    }
    let scenery=null;
    if(hasLand){
      // Render beyond each tile so trees crossing a seam survive the crop.
      scenery=createCanvas();scenery.width=image.width;scenery.height=image.height;
      const area={width:image.width,height:image.height,scale:view.scale};
      drawScenery(scenery.getContext('2d'),{x:(left+image.width/2)/view.scale,y:(top+image.height/2)/view.scale},area,landAt);
    }
    const entry={image,scenery,surf:surf.map(colors=>colors.map(points=>new Uint16Array(points))),overlay:null,phase:-1};
    tiles.set(key,entry);if(tiles.size>MAX_TILES)tiles.delete(tiles.keys().next().value);
    return entry;
  }
  function surfImage(entry,phase){
    const colors=entry.surf[phase];if(!colors.some(points=>points.length))return null;
    if(!entry.overlay){entry.overlay=createCanvas();entry.overlay.width=entry.overlay.height=TILE;}
    if(entry.phase!==phase){
      const c=entry.overlay.getContext('2d');c.clearRect(0,0,TILE,TILE);
      for(let color=0;color<colors.length;color++){
        const points=colors[color];c.fillStyle=SURF_COLORS[color];
        for(let i=0;i<points.length;i+=2)c.fillRect(points[i],points[i+1],2,2);
      }
      entry.phase=phase;
    }
    return entry.overlay;
  }
  function visibleTiles(position,paint){
    const left=Math.round(position.x*view.scale-view.width/2),top=Math.round(position.y*view.scale-view.height/2);
    for(let ty=Math.floor(top/TILE);ty*TILE<top+view.height;ty++)for(let tx=Math.floor(left/TILE);tx*TILE<left+view.width;tx++){
      paint(tile(tx,ty),view.x+tx*TILE-left,view.y+ty*TILE-top);
    }
  }
  return {
    draw(c,position,time=0){
      const phase=Math.floor(time/SURF_STEP)%8;
      visibleTiles(position,(entry,x,y)=>{
        c.drawImage(entry.image,PADDING,PADDING,TILE,TILE,x,y,TILE,TILE);
        const overlay=surfImage(entry,phase);if(overlay)c.drawImage(overlay,x,y);
      });
    },
    drawScenery(c,position){
      visibleTiles(position,(entry,x,y)=>{if(entry.scenery)c.drawImage(entry.scenery,PADDING,PADDING,TILE,TILE,x,y,TILE,TILE);});
    },
    clear(){tiles.clear();},
    get size(){return tiles.size;},
  };
}
