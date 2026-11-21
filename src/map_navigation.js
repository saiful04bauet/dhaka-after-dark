/* North Dhaka navigation: OSM road graph plus optional live Leaflet street tiles.
 * This module makes no claim of legal turn-by-turn directions or surveyed 3D geometry.
 * Graph routing omits turn restrictions, lane rules and live traffic.
 * OSM © OpenStreetMap contributors: https://www.openstreetmap.org/copyright
 */
const CDN='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
let leafletPromise;
function leafletReady(){
 if(window.L)return Promise.resolve(window.L);
 if(leafletPromise)return leafletPromise;
 leafletPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  const timer=setTimeout(()=>reject(new Error('Street map library timeout')),10000);
  script.src=CDN;script.async=true;script.crossOrigin='anonymous';
  script.onload=()=>{clearTimeout(timer);window.L?resolve(window.L):reject(new Error('Leaflet unavailable'));};
  script.onerror=()=>{clearTimeout(timer);reject(new Error('Leaflet CDN unavailable'));};
  document.head.appendChild(script);
 });
 return leafletPromise;
}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const bucketKey=(x,z)=>Math.floor(x/100)+','+Math.floor(z/100);
class MinHeap{
 constructor(){this.a=[];}
 push(id,score){const a=this.a;let i=a.length;a.push({id,score});while(i){let p=(i-1)>>1;if(a[p].score<=score)break;a[i]=a[p];i=p;}a[i]={id,score};}
 pop(){const a=this.a,first=a[0],last=a.pop();if(a.length){let i=0;for(;;){let l=2*i+1,r=l+1;if(l>=a.length)break;let k=r<a.length&&a[r].score<a[l].score?r:l;if(last.score<=a[k].score)break;a[i]=a[k];i=k;}a[i]=last;}return first;}
 get size(){return this.a.length;}
}
/* Use only explicit OSM way nodes as road intersections. Roads crossing in a
 * rendered image without an actual shared node are NOT treated as connected. */
export class StreetRouter{
 constructor(roadData){
  this.nodes=[];this.links=[];this.buckets=new Map();this.last=null;
  const ids=new Map();
  const register=p=>{
   const key=Math.round(p.x*10)+':'+Math.round(p.z*10);
   let id=ids.get(key);
   if(id!==undefined)return id;
   id=this.nodes.length;ids.set(key,id);
   this.nodes.push({x:p.x,z:p.z});this.links.push([]);
   const b=bucketKey(p.x,p.z);
   if(!this.buckets.has(b))this.buckets.set(b,[]);
   this.buckets.get(b).push(id);
   return id;
  };
  for(const road of roadData.roads||[]){
   if(road.width<4.5||!road.points?.length)continue;
   let prev=null;
   for(const pt of road.points){
    const id=register(pt);
    if(prev!==null&&id!==prev){
     const weight=dist(this.nodes[id],this.nodes[prev]);
     if(weight>.01){this.links[prev].push([id,weight]);this.links[id].push([prev,weight]);}
    }
    prev=id;
   }
  }
 }
 nearest(pt){
  let best=-1,minimum=Infinity;
  const bx=Math.floor(pt.x/100),bz=Math.floor(pt.z/100);
  for(let radius=0;radius<=3;radius++){
   for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
    if(radius>0&&Math.max(Math.abs(dx),Math.abs(dz))!==radius)continue;
    const ids=this.buckets.get((bx+dx)+','+(bz+dz))||[];
    for(const id of ids){const d=dist(pt,this.nodes[id]);if(d<minimum){best=id;minimum=d;}}
   }
   // Always scan adjacent cells: a nearer OSM junction may lie just across a grid boundary.
   if(radius>=1&&best!==-1&&minimum<radius*100)break;
  }
  return best;
 }
 compute(start,end){
  if(!this.nodes.length)return null;
  const from=this.nearest(start),to=this.nearest(end);
  if(from<0||to<0)return null;
  const n=this.nodes.length,gs=new Float64Array(n),parent=new Int32Array(n),closed=new Uint8Array(n);
  gs.fill(Infinity);parent.fill(-1);gs[from]=0;
  const heap=new MinHeap();heap.push(from,dist(this.nodes[from],this.nodes[to]));
  let explored=0;
  while(heap.size&&explored<120000){
   const item=heap.pop(),u=item.id;if(closed[u])continue;
   closed[u]=1;explored++;if(u===to)break;
   for(const [v,cost] of this.links[u]){
    if(closed[v])continue;
    const tentative=gs[u]+cost;
    if(tentative<gs[v]){gs[v]=tentative;parent[v]=u;heap.push(v,tentative+dist(this.nodes[v],this.nodes[to]));}
   }
  }
  if(!closed[to])return null; // Do not pretend a disconnected street is a route.
  const indices=[];let next=to;
  while(next!==-1&&indices.length<=n){indices.push(next);next=parent[next];}
  indices.reverse();
  const path=[{x:start.x,z:start.z},...indices.map(i=>this.nodes[i]),{x:end.x,z:end.z}];
  const distance=path.reduce((sum,p,i)=>i?sum+dist(path[i-1],p):0,0);
  return {points:path,distance,roadBased:true};
 }
 route(start,end){
  const c=this.last;
  if(c&&dist(start,c.start)<22&&dist(end,c.end)<3)return this.describe(c.path,start);
  const path=this.compute(start,end);
  this.last={start:{...start},end:{...end},path};
  return this.describe(path,start);
 }
 describe(path,start){
  if(!path)return null;
  const pts=path.points;
  // Head toward the next useful street node; never direct the player backwards
  // just because the first snapped node is now behind the moving vehicle.
  let nearest=0,smallest=Infinity;
  for(let i=0;i<pts.length-1;i++){
   const d=dist(start,pts[i]);if(d<smallest){smallest=d;nearest=i;}
  }
  let next=Math.min(pts.length-1,nearest+1);
  while(next<pts.length-1&&dist(start,pts[next])<8)next++;
  const to=pts[next]||pts[pts.length-1];
  const bearing=Math.atan2(to.x-start.x,to.z-start.z);
  let remaining=dist(start,to);
  for(let i=next+1;i<pts.length;i++)remaining+=dist(pts[i-1],pts[i]);
  return {...path,bearing,distance:remaining};
 }
}
export function createLiveDhakaMap({panel,container,canvas,credit,onStatus,toGeo,districts}){
 let map=null,me=null,goal=null,route=null,tilesLoaded=0,tileErrors=0,opening=null,lastRoute=null;
 const state={opened:false,ready:false};
 function sync(player,target,routeData){
  if(!state.ready)return;
  const p=toGeo(player.x,player.z),t=toGeo(target.x,target.z);
  me.setLatLng([p.lat,p.lon]);goal.setLatLng([t.lat,t.lon]);
  const coords=routeData?.points?.length>1?routeData.points.map(point=>{const geo=toGeo(point.x,point.z);return [geo.lat,geo.lon];}):[[p.lat,p.lon],[t.lat,t.lon]];
  route.setLatLngs(coords);
  route.setStyle({color:routeData?.roadBased?'#41a4fc':'#ecb36c',weight:routeData?.roadBased?5:3,dashArray:routeData?.roadBased?null:'7,8'});
  lastRoute=routeData;
 }
 async function open(player,target,routeData){
  state.opened=true;
  if(state.ready){map.invalidateSize();sync(player,target,routeData);return;}
  if(opening)return opening;
  opening=(async()=>{
   try{
    const L=await leafletReady();
    if(!panel.isConnected)return;
    container.classList.remove('hidden');
    const p=toGeo(player.x,player.z);
    map=L.map(container,{zoomControl:true,scrollWheelZoom:true,preferCanvas:true,attributionControl:true}).setView([p.lat,p.lon],15);
    const tiles=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
     maxZoom:19,minZoom:11,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
    });
    tiles.on('tileload',()=>{tilesLoaded++;});
    tiles.on('tileerror',()=>{
     tileErrors++;
     if(tileErrors>5&&!tilesLoaded){panel.classList.remove('leaflet-ready');onStatus('Map tiles unavailable. Showing schematic map.');}
    });
    tiles.addTo(map);
    me=L.circleMarker([p.lat,p.lon],{radius:9,color:'#fff',weight:3,fillColor:'#2f9fe8',fillOpacity:1}).addTo(map).bindTooltip('Your position');
    goal=L.circleMarker([p.lat,p.lon],{radius:10,color:'#fff',weight:2,fillColor:'#efb55e',fillOpacity:1}).addTo(map).bindTooltip('Mission checkpoint');
    route=L.polyline([],{color:'#41a4fc',weight:5,opacity:.92}).addTo(map);
    for(const item of districts){
     L.circleMarker([item.lat,item.lon],{radius:5,color:'#dcb47e',weight:1,fillColor:'#f9c579',fillOpacity:.8})
       .addTo(map).bindTooltip(item.name,{direction:'top'});
    }
    state.ready=true;panel.classList.add('leaflet-ready');
    credit.textContent='Street tiles © OpenStreetMap contributors · routing from available OSM road nodes';
    onStatus('Interactive OpenStreetMap loaded');
    map.invalidateSize();
    sync(player,target,routeData);
   }catch(err){
    console.warn('[Dhaka live map]',err);
    panel.classList.remove('leaflet-ready');
    onStatus('Live map unavailable: schematic fallback');
   }finally{opening=null;}
  })();
  return opening;
 }
 function recenter(player){if(!map||!player)return;const p=toGeo(player.x,player.z);map.setView([p.lat,p.lon],Math.max(15,map.getZoom()));}
 return {open,sync,recenter,state};
}
