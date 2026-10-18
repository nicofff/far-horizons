import { terrainMask, rasterWidth as W, rasterHeight as H, rasterCell as C, onLand, clearPassage } from './terrain.js';

const MAX_LEVEL=4,levels=[terrainMask],widths=[W],heights=[H],leaves=Array.from({length:MAX_LEVEL+1},()=>new Map()),nodes=[];
for(let level=1;level<=MAX_LEVEL;level++){
  const width=W>>level,height=H>>level,previous=levels[level-1],pw=widths[level-1],data=new Uint8Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*2*pw+x*2,a=previous[i],b=previous[i+1],c=previous[i+pw],d=previous[i+pw+1];
    data[y*width+x]=a===b&&a===c&&a===d?a:2;
  }
  levels.push(data);widths.push(width);heights.push(height);
}
function split(level,x,y){
  const kind=levels[level][y*widths[level]+x];if(kind===1)return;
  if(kind===2){for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)split(level-1,x*2+dx,y*2+dy);return;}
  const size=1<<level,id=nodes.length;
  leaves[level].set(y*widths[level]+x,id);nodes.push({x:x*size,y:y*size,size,cx:(x+.5)*size*C,cy:(y+.5)*size*C});
}
for(let y=0;y<heights[MAX_LEVEL];y++)for(let x=0;x<widths[MAX_LEVEL];x++)split(MAX_LEVEL,x,y);
function nodeAt(x,y){
  if(x<0||x>=W||y<0||y>=H)return -1;
  for(let level=MAX_LEVEL;level>=0;level--){const id=leaves[level].get((y>>level)*widths[level]+(x>>level));if(id!==undefined)return id;}
  return -1;
}
const adjacency=new Map();
function neighbors(id){
  if(adjacency.has(id))return adjacency.get(id);
  const a=nodes[id],found=new Map();
  for(let offset=0;offset<a.size;offset++){
    for(const [px,py,vertical,edge] of [[a.x-1,a.y+offset,true,a.x],[a.x+a.size,a.y+offset,true,a.x+a.size],[a.x+offset,a.y-1,false,a.y],[a.x+offset,a.y+a.size,false,a.y+a.size]]){
      const next=nodeAt(px,py);if(next<0||found.has(next))continue;
      const b=nodes[next],low=Math.max(vertical?a.y:a.x,vertical?b.y:b.x),high=Math.min(vertical?a.y+a.size:a.x+a.size,vertical?b.y+b.size:b.x+b.size);
      const portal=vertical?{x:edge*C,y:(low+high)*C/2}:{x:(low+high)*C/2,y:edge*C};
      found.set(next,{id:next,portal,cost:Math.hypot(a.cx-portal.x,a.cy-portal.y)+Math.hypot(b.cx-portal.x,b.cy-portal.y)});
    }
  }
  const result=[...found.values()];adjacency.set(id,result);return result;
}
const costs=new Float64Array(nodes.length),previous=new Int32Array(nodes.length),visits=new Uint32Array(nodes.length),closed=new Uint32Array(nodes.length);
let search=0;
export function findRoute(start,end){
  if(onLand(start.x,start.y)||onLand(end.x,end.y))return [];
  if(clearPassage(start,end))return [{x:end.x,y:end.y}];
  const from=nodeAt(Math.floor(start.x/C),Math.floor(start.y/C)),to=nodeAt(Math.floor(end.x/C),Math.floor(end.y/C));
  if(from<0||to<0)return [];
  search++;const heap=[];
  const push=(id,score)=>{let i=heap.length;heap.push(null);while(i>0){const parent=(i-1)>>1;if(heap[parent].score<=score)break;heap[i]=heap[parent];i=parent;}heap[i]={id,score};};
  const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].score<heap[child].score)child++;if(heap[child].score>=last.score)break;heap[i]=heap[child];i=child;}heap[i]=last;}return first.id;};
  costs[from]=0;visits[from]=search;previous[from]=-1;push(from,0);
  while(heap.length){
    const id=pop();if(closed[id]===search)continue;if(id===to)break;closed[id]=search;
    for(const neighbor of neighbors(id)){
      const n=neighbor.id;if(closed[n]===search)continue;const cost=costs[id]+neighbor.cost;
      if(visits[n]!==search||cost<costs[n]){visits[n]=search;costs[n]=cost;previous[n]=id;push(n,cost+Math.hypot(nodes[n].cx-nodes[to].cx,nodes[n].cy-nodes[to].cy));}
    }
  }
  if(visits[to]!==search)return [];
  const chain=[];for(let id=to;id!==from;id=previous[id])chain.push(id);chain.push(from);chain.reverse();
  const path=[start,{x:nodes[from].cx,y:nodes[from].cy}];
  for(let i=1;i<chain.length;i++){const edge=neighbors(chain[i-1]).find(n=>n.id===chain[i]);path.push(edge.portal,{x:nodes[chain[i]].cx,y:nodes[chain[i]].cy});}
  path.push({x:end.x,y:end.y});
  const route=[];let cursor=0;
  while(cursor<path.length-1){let next=Math.min(path.length-1,cursor+64);while(next>cursor+1&&!clearPassage(path[cursor],path[next]))next--;route.push(path[next]);cursor=next;}
  return route;
}
export function navigationStats(){return {nodes:nodes.length,cachedNodes:adjacency.size};}
