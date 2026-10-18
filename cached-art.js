export function createCachedArt({text:paintText,drawShip:paintShip},createCanvas=()=>document.createElement('canvas')){
  const labels=new Map(),ships=new Map();
  function image(cache,key,width,height,paint){
    if(cache.has(key))return cache.get(key);
    const canvas=createCanvas();canvas.width=width;canvas.height=height;
    paint(canvas.getContext('2d'));cache.set(key,canvas);
    if(cache.size>128)cache.delete(cache.keys().next().value);
    return canvas;
  }
  return {
    text(c,value,x,y,color,scale=1){
      if(scale!==1){paintText(c,value,x,y,color,scale);return;}
      const label=String(value);if(!label)return;
      const key=JSON.stringify([label,color]),canvas=image(labels,key,label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().length*6,8,ctx=>paintText(ctx,label,0,0,color));
      c.drawImage(canvas,Math.round(x),Math.round(y));
    },
    drawShip(c,x,y,{type,enemy=false,small=false,flip=false,bob=0}={}){
      if(small){paintShip(c,x,y,{type,enemy,small,flip,bob});return;}
      const key=JSON.stringify([type,enemy,flip]),canvas=image(ships,key,48,40,ctx=>paintShip(ctx,24,25,{type,enemy,flip}));
      c.drawImage(canvas,Math.round(x)-24,Math.round(y+bob)-25);
    },
  };
}
