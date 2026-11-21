/* DHAKA AFTER DARK — optional city services and wanted-level police response.
 * Simple game AI rather than true traffic-law enforcement or advanced GTA physics.
 */
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const approach=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
export function setupStreetLife(T,scene,{makeCar,findNearestRoad,geo,anchors,collidesWithBuilding}){
 const red=new T.MeshBasicMaterial({color:0xef3f49});
 const blue=new T.MeshBasicMaterial({color:0x347ffe});
 const white=new T.MeshStandardMaterial({color:0xc5c5c2,roughness:.8});
 const police=[];
 for(let i=0;i<2;i++){
  const car=makeCar(0x2b3c60,'sedan');
  const bar=new T.Mesh(new T.BoxGeometry(.98,.12,.28),white);
  bar.position.set(0,2.05,-.25);car.add(bar);
  const r=new T.Mesh(new T.BoxGeometry(.42,.18,.32),red);
  r.position.set(-.27,2.12,-.25);car.add(r);
  const b=new T.Mesh(new T.BoxGeometry(.42,.18,.32),blue);
  b.position.set(.27,2.12,-.25);car.add(b);
  car.visible=false;scene.add(car);
  police.push({car,r,b,active:false,yaw:0,spawnDelay:0});
 }
 const garageAnchor=geo(anchors.find(d=>d.id==='banani').lat,anchors.find(d=>d.id==='banani').lon);
 const clinicAnchor=geo(anchors.find(d=>d.id==='mohakhali').lat,anchors.find(d=>d.id==='mohakhali').lon);
 const garageNear=findNearestRoad(garageAnchor.x+65,garageAnchor.z+37);
 const clinicNear=findNearestRoad(clinicAnchor.x+40,clinicAnchor.z-29);
 const services=[
  {id:'garage',name:'BANANI GARAGE',x:garageNear.x,z:garageNear.z,color:0x9c7ded,radius:23},
  {id:'clinic',name:'MOHAKHALI CLINIC',x:clinicNear.x,z:clinicNear.z,color:0x4edab6,radius:22}
 ];
 for(const service of services){
  const marker=new T.Group();marker.position.set(service.x,0,service.z);
  const material=new T.MeshBasicMaterial({color:service.color,transparent:true,opacity:.8});
  const ring=new T.Mesh(new T.TorusGeometry(4.2,.22,9,36),material);
  ring.position.y=.37;ring.rotation.x=Math.PI/2;marker.add(ring);
  const beacon=new T.Mesh(new T.CylinderGeometry(.4,.4,16,10),new T.MeshBasicMaterial({color:service.color,transparent:true,opacity:.24,depthWrite:false}));
  beacon.position.y=8;marker.add(beacon);
  const dot=new T.Mesh(new T.OctahedronGeometry(1.45,1),new T.MeshBasicMaterial({color:service.color}));
  dot.position.y=6.9;marker.add(dot);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#0d1f2bec';ctx.fillRect(0,0,512,96);
  ctx.strokeStyle='#bdacd2';ctx.strokeRect(2,2,508,92);
  ctx.fillStyle='#edf8ff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 37px sans-serif';ctx.fillText(service.name,256,49);
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
  const label=new T.Sprite(new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));
  label.scale.set(37,7,1);label.position.y=15;marker.add(label);scene.add(marker);
  service.marker=marker;
 }
 let bustTimer=0;
 function nearestService(position,kind){
  let best=null,minimum=Infinity;
  for(const s of services){
   if(kind&&s.id!==kind)continue;
   const d=dist(position,s);
   if(d<minimum){minimum=d;best={service:s,distance:d};}
  }
  return best;
 }
 function respawn(unit,index,position){
  const angle=(index?2.18:-1.65),dx=Math.sin(angle)*140,dz=Math.cos(angle)*140;
  const near=findNearestRoad(position.x+dx,position.z+dz);
  unit.car.position.set(near.x,0,near.z);unit.yaw=near.yaw;unit.car.rotation.y=near.yaw;unit.active=true;unit.car.visible=true;
 }
 function update(dt,{position,wanted,inCar,speed}){
  if(!position)return {policeDistance:Infinity,busted:false};
  if(!wanted){bustTimer=0;for(const unit of police){unit.active=false;unit.car.visible=false;}return {policeDistance:Infinity,busted:false};}
  let nearest=Infinity;
  const num=wanted>=3?2:1;
  for(let i=0;i<police.length;i++){
   const p=police[i];if(i>=num){p.active=false;p.car.visible=false;continue;}
   if(!p.active)respawn(p,i,position);
   let distance=dist(p.car.position,position);
   // A fast player can escape sight by creating separation. When already far,
   // the pursuer keeps its last position, enabling wanted stars to cool down.
   if(distance<300){
    const desired=Math.atan2(position.x-p.car.position.x,position.z-p.car.position.z);
    p.yaw=approach(p.yaw,desired,Math.min(1,dt*1.9));
    const velocity=(12+wanted*1.5)*Math.min(1,Math.max(0,(distance-4)/21));
    const nx=p.car.position.x+Math.sin(p.yaw)*velocity*dt,nz=p.car.position.z+Math.cos(p.yaw)*velocity*dt;
    if(!collidesWithBuilding(nx,nz))p.car.position.set(nx,0,nz);
    p.car.rotation.y=p.yaw;
   }
   const flash=Math.floor(performance.now()/350)%2===0;
   p.r.material=flash?red:blue;p.b.material=flash?blue:red;
   distance=dist(p.car.position,position);nearest=Math.min(nearest,distance);
  }
  if(nearest<6.5&&(!inCar||Math.abs(speed)<3))bustTimer+=dt;
  else bustTimer=Math.max(0,bustTimer-dt*1.3);
  const busted=bustTimer>3.8;
  if(busted)bustTimer=0;
  return {policeDistance:nearest,busted,bustProgress:bustTimer/3.8};
 }
 function drawMinimap(ctx,project){
  for(const s of services){const [x,y]=project(s);ctx.fillStyle=s.id==='garage'?'#a88cfb':'#68efbb';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();}
  for(const p of police){if(!p.active)continue;const [x,y]=project(p.car.position);ctx.fillStyle='#ef5963';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();}
 }
 return {police,services,update,nearestService,drawMinimap};
}
