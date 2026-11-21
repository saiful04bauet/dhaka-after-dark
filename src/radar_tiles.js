/* Raster streets for the in-game GPS radar.
 * Maps are © OpenStreetMap contributors (ODbL). Tile service availability
 * varies; keep the previous procedural schematic as the labeled fallback.
 * Cache tiles to avoid per-frame requests. No API keys or tracking.
 */
export const OSM_TILE_ATTRIBUTION='© OpenStreetMap contributors';
const PI=Math.PI,clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function slippyPixel(lat,lon,zoom){
 const z=Math.pow(2,zoom),p=clamp(lat,-85.05112878,85.05112878)*PI/180;
 return {x:(lon+180)/360*z*256,y:(1-Math.log(Math.tan(p)+1/Math.cos(p))/PI)/2*z*256};
}
export function metersToPixels(latitude,zoom){
 return Math.pow(2,zoom)*256/(40075016.686*Math.cos(latitude*PI/180));
}
export class TileRadar{
 constructor({onTileReady=()=>{},maxCache=90}={}){
  this.cache=new Map();this.maxCache=maxCache;this.onTileReady=onTileReady;
  this.available=typeof Image!=='undefined';
  this.failures=0;this.success=0;
 }
 request(z,x,y){
  if(!this.available)return null;
  const max=Math.pow(2,z),rx=((x%max)+max)%max;
  if(y<0||y>=max)return null;
  const key=z+'/'+rx+'/'+y;
  if(this.cache.has(key)){
   const item=this.cache.get(key);this.cache.delete(key);this.cache.set(key,item);return item;
  }
  const item={image:null,loaded:false,failed:false};
  this.cache.set(key,item);
  const img=new Image();item.image=img;img.crossOrigin='anonymous';img.decoding='async';
  img.onload=()=>{item.loaded=true;this.success++;this.onTileReady();};
  img.onerror=()=>{item.failed=true;this.failures++;};
  img.src='https://tile.openstreetmap.org/'+key+'.png';
  if(this.cache.size>this.maxCache){
   for(const [older,cached] of this.cache){if(older===key)continue;this.cache.delete(older);if(cached.image){cached.image.onload=null;cached.image.onerror=null;}break;}
  }
  return item;
 }
 draw(ctx,width,height,{lat,lon,zoom=15}){
  if(!this.available||!ctx||!Number.isFinite(lat)||!Number.isFinite(lon))return false;
  const center=slippyPixel(lat,lon,zoom),startX=center.x-width/2,startY=center.y-height/2;
  const x0=Math.floor(startX/256),y0=Math.floor(startY/256);
  const x1=Math.floor((startX+width-1)/256),y1=Math.floor((startY+height-1)/256);
  const tiles=[];
  let middleLoaded=false;
  for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
   const tile=this.request(zoom,tx,ty);tiles.push({tx,ty,tile});
   if(tx===Math.floor(center.x/256)&&ty===Math.floor(center.y/256)&&tile?.loaded)middleLoaded=true;
  }
  if(!middleLoaded)return false;
  for(const t of tiles){
   const px=Math.round(t.tx*256-startX),py=Math.round(t.ty*256-startY);
   if(t.tile?.loaded){
    try{ctx.drawImage(t.tile.image,px,py,257,257);}catch(e){this.failures++;ctx.fillStyle='#1b2b34';ctx.fillRect(px,py,256,256);}
   }else{ctx.fillStyle='#1b2b34';ctx.fillRect(px,py,256,256);}
  }
  ctx.fillStyle='rgba(5,16,25,.20)';ctx.fillRect(0,0,width,height);
  return true;
 }
}
