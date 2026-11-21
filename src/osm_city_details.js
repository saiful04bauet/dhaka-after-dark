/* Reuses actual OSM road names as street-side wayfinding signs.
 * Ground position is approximate; the label originates from real OSM tags.
 * Streets/buildings without OSM data are not presented as surveyed geometry.
 */
export function addNamedDhakaRoadSigns(T,scene,roads){
 const palette={frame:new T.MeshStandardMaterial({color:0x5b6063,metalness:.45,roughness:.5}),
  background:new T.MeshStandardMaterial({color:0x174650,roughness:.67})};
 const used=new Set(),signs=[];let count=0;
 const sample=roads.filter(r=>r.points?.length>2&&r.width>=6.5&&r.tags?.name)
  .sort((a,b)=>b.width-a.width);
 for(const road of sample){
  if(count>=70)break;
  const name=String(road.tags.name).trim();
  const key=name.toLocaleLowerCase();
  if(name.length<3||name.length>50||used.has(key))continue;
  const i=Math.floor(road.points.length/2),a=road.points[i-1],b=road.points[i];
  if(!a||!b)continue;
  const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
  if(len<9)continue;
  used.add(key);
  const nx=-dz/len,nz=dx/len;
  const cx=(a.x+b.x)/2+nx*(road.width/2+3),cz=(a.z+b.z)/2+nz*(road.width/2+3);
  const post=new T.Mesh(new T.CylinderGeometry(.08,.12,4.6,8),palette.frame);
  post.position.set(cx,2.3,cz);scene.add(post);
  const canvas=document.createElement('canvas');canvas.width=700;canvas.height=170;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#124652';ctx.fillRect(0,0,700,170);
  ctx.strokeStyle='#eff5e6';ctx.lineWidth=7;ctx.strokeRect(8,8,684,154);
  ctx.fillStyle='#ecf9f0';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='bold '+(name.length>26?30:43)+'px Arial';
  ctx.fillText(name.toUpperCase(),350,75,660);
  ctx.font='18px Arial';ctx.fillStyle='#a8d6ce';ctx.fillText('DHAKA · OSM ROAD LABEL',350,127);
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
  const sign=new T.Mesh(new T.PlaneGeometry(6,1.5),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));
  sign.position.set(cx,4.75,cz);sign.rotation.y=Math.atan2(dx,dz);
  scene.add(sign);
  signs.push({name,x:cx,z:cz});count++;
 }
 return signs;
}

/* Prefer OSM building footprints in all four playable zones instead of
 * blindly taking the first 1,350 ways returned by the remote API.
 * This returns actual provided footprints only; it never invents geometry. */
export function selectBalancedBuildings(buildings,districts,geo,limit=1700){
 const anchors=districts.map(d=>geo(d.lat,d.lon));
 if(!anchors.length)return (buildings||[]).slice(0,limit);
 const buckets=anchors.map(()=>[]);
 for(const b of buildings||[]){
  if(!b?.points||b.points.length<4)continue;
  const n=b.points.length-1;let sumX=0,sumZ=0;
  for(let i=0;i<n;i++){sumX+=b.points[i].x;sumZ+=b.points[i].z;}
  const center={x:sumX/n,z:sumZ/n};
  let best=0,min=Infinity;
  for(let i=0;i<anchors.length;i++){
   const d=Math.hypot(center.x-anchors[i].x,center.z-anchors[i].z);
   if(d<min){min=d;best=i;}
  }
  buckets[best].push({b,distance:min});
 }
 for(const bucket of buckets)bucket.sort((a,b)=>a.distance-b.distance);
 const result=[],offsets=buckets.map(()=>0);
 while(result.length<limit){
  let madeProgress=false;
  for(let i=0;i<buckets.length&&result.length<limit;i++){
   const j=offsets[i];
   if(j<buckets[i].length){result.push(buckets[i][j].b);offsets[i]++;madeProgress=true;}
  }
  if(!madeProgress)break;
 }
 return result;
}
