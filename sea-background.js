import { landColor, drawScenery, terrainHash } from './landscape.js';
import { seasonalFrame } from './world-time.js';
import { WORLD, nearestLongitude } from './world.js';

const TILE=256,PADDING=32,MAX_TILES=32;
export const SURF_STEP=300;
const SURF_COLORS=['#83c6df','#b0dfe8','#d4eee5','#a0d1df'];

export function createSeaBackground(view,landAt,createCanvas=()=>document.createElement('canvas')){
  const tiles=new Map(),worldPixels=WORLD.width*view.scale;let cameraX=null;
  function tile(tx,ty,month){
    const plain=`${tx},${ty}`,key=month===null?plain:`${plain},${month}`;
    if(tiles.has(plain)&&!tiles.get(plain).scenery){const entry=tiles.get(plain);tiles.delete(plain);tiles.set(plain,entry);return entry;}
    if(tiles.has(key)){const entry=tiles.get(key);tiles.delete(key);tiles.set(key,entry);return entry;}
    const image=createCanvas();image.width=image.height=TILE+PADDING*2;
    const c=image.getContext('2d',{alpha:false}),left=tx*TILE-PADDING,top=ty*TILE-PADDING;
    const surf=Array.from({length:8},()=>SURF_COLORS.map(()=>[]));let hasLand=false;
    c.fillStyle='#2865ce';c.fillRect(0,0,image.width,image.height);
    for(let sy=0;sy<image.height;sy+=2)for(let sx=0;sx<image.width;sx+=2){
      const px=left+sx,wx=(px>=0&&px<worldPixels?px:(px%worldPixels+worldPixels)%worldPixels)/view.scale,wy=(top+sy)/view.scale,h=terrainHash(Math.floor(wx*8),Math.floor(wy*8));
      if(landAt(wx,wy)){
        hasLand=true;
        const coast=!landAt(wx-.12,wy)||!landAt(wx+.12,wy)||!landAt(wx,wy-.12)||!landAt(wx,wy+.12);
        c.fillStyle=landColor(wx,wy,coast,month);c.fillRect(sx,sy,2,2);
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
      drawScenery(scenery.getContext('2d'),{x:(left+image.width/2)/view.scale,y:(top+image.height/2)/view.scale},area,landAt,month);
    }
    const entry={image,scenery,surf:surf.map(colors=>colors.map(points=>new Uint16Array(points))),overlay:null,phase:-1};
    tiles.set(hasLand?key:plain,entry);if(tiles.size>MAX_TILES)tiles.delete(tiles.keys().next().value);
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
  function seasonalImages(entry,other,blend){
    // Tiny palette steps let normal frames reuse one composite instead of alpha-blending every tile.
    const step=Math.round(blend*16);
    if(step===0)return entry;
    if(step===16)return other;
    if(!entry.season){
      const make=()=>{const canvas=createCanvas();canvas.width=canvas.height=TILE+PADDING*2;return canvas;};
      entry.season={image:make(),scenery:make(),step:-1};
    }
    if(entry.season.step!==step){
      for(const layer of ['image','scenery']){
        const c=entry.season[layer].getContext('2d',{alpha:layer!=='image'});
        c.clearRect(0,0,TILE+PADDING*2,TILE+PADDING*2);c.globalAlpha=1;c.drawImage(entry[layer],0,0);
        c.globalAlpha=step/16;c.drawImage(other[layer],0,0);c.globalAlpha=1;
      }
      entry.season.step=step;
    }
    return entry.season;
  }
  function visibleTiles(position,month,paint){
    cameraX=cameraX===null?position.x:nearestLongitude(cameraX,position.x);
    const left=Math.round(cameraX*view.scale-view.width/2),top=Math.round(position.y*view.scale-view.height/2);
    for(let ty=Math.floor(top/TILE);ty*TILE<top+view.height;ty++)for(let tx=Math.floor(left/TILE);tx*TILE<left+view.width;tx++){
      paint(tile(tx,ty,month),view.x+tx*TILE-left,view.y+ty*TILE-top,tx,ty);
    }
  }
  return {
    draw(c,position,time=0,day){
      const phase=Math.floor(time/SURF_STEP)%8,{month,next,blend}=seasonalFrame(day);
      visibleTiles(position,month,(entry,x,y,tx,ty)=>{
        const images=blend&&entry.scenery?seasonalImages(entry,tile(tx,ty,next),blend):entry;
        c.drawImage(images.image,PADDING,PADDING,TILE,TILE,x,y,TILE,TILE);
        const overlay=surfImage(entry,phase);if(overlay)c.drawImage(overlay,x,y);
      });
    },
    drawScenery(c,position,day){
      const {month,next,blend}=seasonalFrame(day);
      visibleTiles(position,month,(entry,x,y,tx,ty)=>{
        if(!entry.scenery)return;
        const images=blend?seasonalImages(entry,tile(tx,ty,next),blend):entry;
        c.drawImage(images.scenery,PADDING,PADDING,TILE,TILE,x,y,TILE,TILE);
      });
    },
    clear(){tiles.clear();cameraX=null;},
    get size(){return tiles.size;},
  };
}
