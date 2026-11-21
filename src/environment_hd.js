/* City visual pass for DHAKA / AFTER DARK.
 * OSM geometry remains the source of actual streets/building footprints.
 * Procedural facade/street detail is illustrative, not an exact building survey.
 * All textures and meshes below are original/generated at runtime.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(v,b));
const hash=n=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x)};
const rand=(a,b,n)=>a+(b-a)*hash(n);
const box=(T,w,h,d,mat,x,y,z)=>{
 const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);return mesh;
};
export function decorateBuildingFacades(T,scene,buildings,districts,geo){
 const chosen=[];
 const anchors=districts.map(d=>geo(d.lat,d.lon));
 for(const b of buildings.slice(0,1350)){
  if(b.points.length<4)continue;
  const ps=b.points.slice(0,-1);
  if(ps.length<3)continue;
  const xs=ps.map(p=>p.x),zs=ps.map(p=>p.z);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const w=maxX-minX,depth=maxZ-minZ,area=w*depth;
  if(area<22||area>22000)continue;
  const cx=(minX+maxX)*.5,cz=(minZ+maxZ)*.5;
  const distance=Math.min(...anchors.map(a=>Math.hypot(a.x-cx,a.z-cz)));
  if(distance>730)continue;
  const id=b.id||chosen.length+1;
  const floors=Number(b.tags?.['building:levels'])||0;
  const posLat=23.7870-cz/111320;
  const affluent=posLat>23.784&&posLat<23.801;
  const height=clamp(parseFloat(b.tags?.height)||floors*3.2||rand(affluent?12:7,affluent?58:35,id),3.8,affluent?132:95);
  chosen.push({id,ps,cx,cz,height,distance,w,depth});
 }
 chosen.sort((a,b)=>a.distance-b.distance);
 const paneMax=7500, beamMax=3800;
 const glass=new T.MeshPhysicalMaterial({color:0xffffff,roughness:.22,metalness:.22,clearcoat:.62,clearcoatRoughness:.19});
 const glassMesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),glass,paneMax);
 const trim=new T.MeshStandardMaterial({color:0x9a9e9d,roughness:.43,metalness:.4});
 const trimMesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),trim,beamMax);
 const dummy=new T.Object3D();
 let pane=0,beam=0,enhanced=0;
 for(const b of chosen.slice(0,160)){
  if(pane>=paneMax-60)break;
  const floors=Math.min(24,Math.floor(b.height/3.2));
  if(floors<2)continue;
  // Physical windows on the two longest accessible outward-facing walls.
  const centroid={x:b.ps.reduce((v,p)=>v+p.x,0)/b.ps.length,z:b.ps.reduce((v,p)=>v+p.z,0)/b.ps.length};
  const edges=b.ps.map((a,i)=>{const c=b.ps[(i+1)%b.ps.length];return {a,c,length:Math.hypot(c.x-a.x,c.z-a.z)};}).filter(e=>e.length>6.5);
  edges.sort((a,b)=>b.length-a.length);
  for(const edge of edges.slice(0,2)){
   const {a,c,length}=edge;
   const midX=(a.x+c.x)*.5,midZ=(a.z+c.z)*.5;
   let nx=midX-centroid.x,nz=midZ-centroid.z;
   const nlen=Math.hypot(nx,nz)||1;nx/=nlen;nz/=nlen;
   const angle=Math.atan2(nx,nz);
   const columns=Math.min(24,Math.floor((length-2)/2.8));
   if(columns<2)continue;
   const w=Math.min(1.75,length/columns*.67);
   for(let floor=1;floor<floors;floor++){
    const level=floor*3.2+1.1;
    if(level>=b.height-.6)break;
    for(let col=0;col<columns;col++){
     if(pane>=paneMax)break;
     const t=(col+.5)/columns;
     const x=a.x+(c.x-a.x)*t+nx*.16,z=a.z+(c.z-a.z)*t+nz*.16;
     dummy.position.set(x,level,z);dummy.rotation.set(0,angle,0);dummy.scale.set(w,1.72,.09);dummy.updateMatrix();
     glassMesh.setMatrixAt(pane,dummy.matrix);
     const lit=hash(b.id+col*61+floor*79)>.86;
     const color=new T.Color(lit?0xe5c58b:(b.id%3===0?0x62869b:0x405864));
     color.multiplyScalar(lit?1:.77+hash(b.id+floor*42)*.3);
     glassMesh.setColorAt(pane,color);pane++;
     if(beam<beamMax&&col%2===0){
      dummy.position.set(x,level-1.05,z);dummy.scale.set(w+.22,.16,.23);dummy.updateMatrix();
      trimMesh.setMatrixAt(beam++,dummy.matrix);
     }
    }
   }
  }
  enhanced++;
 }
 if(pane){
  glassMesh.count=pane;glassMesh.instanceMatrix.needsUpdate=true;
  if(glassMesh.instanceColor)glassMesh.instanceColor.needsUpdate=true;
  glassMesh.castShadow=false;glassMesh.receiveShadow=false;scene.add(glassMesh);
 }
 if(beam){
  trimMesh.count=beam;trimMesh.instanceMatrix.needsUpdate=true;
  scene.add(trimMesh);
 }
 return {buildings:enhanced,windows:pane,mullions:beam};
}
let foliageMaterial;
function getFoliageMaterial(T){
 if(foliageMaterial)return foliageMaterial;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=192;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,192,192);
 // Non-tiled, alpha-cutout leafy clusters for denser non-icosahedral tree silhouettes.
 for(let i=0;i<270;i++){
   const angle=hash(i*4+8)*Math.PI*2;
   const radius=Math.sqrt(hash(i+33))*78;
   const x=96+Math.cos(angle)*radius,y=93+Math.sin(angle)*radius*.85;
   const rx=4+hash(i*13)*12,ry=5+hash(i*9)*12;
   ctx.beginPath();ctx.ellipse(x,y,rx,ry,hash(i*17)*Math.PI,0,Math.PI*2);
   const light=.18+hash(i+94)*.2;
   ctx.fillStyle='rgba('+Math.floor(26+light*85)+','+Math.floor(59+light*170)+','+Math.floor(25+light*56)+','+(.67+hash(i+61)*.32)+')';
   ctx.fill();
 }
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
 foliageMaterial=new T.MeshStandardMaterial({map:tex,transparent:true,alphaTest:.35,depthWrite:true,side:T.DoubleSide,roughness:.97,metalness:0});
 return foliageMaterial;
}
export function createGroundedTree(T,scene,x,z,r){
 const height=5.5+r*5;
 const wood=new T.MeshStandardMaterial({color:0x4a443d,roughness:1});
 const trunk=new T.Mesh(new T.CylinderGeometry(.15,.32,height*.63,7),wood);
 trunk.position.set(x,height*.31,z);trunk.castShadow=true;scene.add(trunk);
 for(let b=0;b<3;b++){
  const dir=b*Math.PI*2/3+hash(r+b)*.35;
  const limb=new T.Mesh(new T.CylinderGeometry(.09,.2,height*.55,6),wood);
  limb.position.set(x+Math.sin(dir)*height*.12,height*.64,z+Math.cos(dir)*height*.12);
  limb.rotation.z=Math.cos(dir)*.5;limb.rotation.x=Math.sin(dir)*.5;scene.add(limb);
 }
 const foliage=getFoliageMaterial(T);
 for(let j=0;j<5;j++){
  const crown=new T.Mesh(new T.PlaneGeometry(height*(.93+hash(r+j)*.25),height*(.82+hash(j+r*4)*.21)),foliage);
  crown.position.set(x+(hash(r+j*7)-.5)*height*.2,height*.76+j*.08,z+(hash(r+j*9)-.5)*height*.15);
  crown.rotation.y=Math.PI*j/5;
  crown.castShadow=j===0;scene.add(crown);
 }
}
export function placeDhakaStreetDetails(T,scene,districts,geo,findNearestRoad){
 const steel=new T.MeshStandardMaterial({color:0x5e6466,metalness:.68,roughness:.4});
 const concrete=new T.MeshStandardMaterial({color:0x999d96,roughness:.95});
 const benchMat=new T.MeshStandardMaterial({color:0x6c5740,roughness:.78});
 const glass=new T.MeshPhysicalMaterial({color:0x83a2ae,metalness:.23,roughness:.18,transparent:true,opacity:.45,depthWrite:false});
 const poleLines=new T.LineBasicMaterial({color:0x29333b,transparent:true,opacity:.7});
 let shelters=0,poles=0;
 // District-scale street furniture; approximate placement, not surveyed.
 for(const district of districts){
  const p=geo(district.lat,district.lon),road=findNearestRoad(p.x+35,p.z+20);
  for(let side of [-1,1]){
   const x=road.x+side*11,z=road.z+side*7;
   const canopy=box(T,5.8,.22,2.35,steel,x,3.48,z);
   canopy.castShadow=true;scene.add(canopy);
   for(const off of [-2.7,2.7]){
    const frame=box(T,.12,3.4,.15,steel,x+off,1.7,z+.75);scene.add(frame);
   }
   const back=box(T,5.35,2.5,.09,glass,x,2.0,z+.97);scene.add(back);
   scene.add(box(T,4.5,.17,.58,benchMat,x,.65,z+.12));
   for(const end of [-1.8,1.8])scene.add(box(T,.13,.7,.5,steel,x+end,.35,z+.12));
   shelters++;
  }
  // Low-voltage overhead wires add to Dhaka's recognizable streetscape.
  for(let j=0;j<5;j++){
   const rx=road.x+(j-2)*27,rz=road.z-14;
   const pillar=new T.Mesh(new T.CylinderGeometry(.115,.21,9,8),concrete);
   pillar.position.set(rx,4.5,rz);pillar.castShadow=true;scene.add(pillar);poles++;
   const cross=box(T,2.7,.14,.17,steel,rx,8.75,rz);scene.add(cross);
   if(j>0){
    for(let line=0;line<3;line++){
     const endX=rx-27;
     const curve=new T.QuadraticBezierCurve3(
       new T.Vector3(endX,8.9,rz+line*.2),
       new T.Vector3(rx-13.5,8.0,rz+line*.2),
       new T.Vector3(rx,8.9,rz+line*.2)
     );
     const geometry=new T.BufferGeometry().setFromPoints(curve.getPoints(12));
     scene.add(new T.Line(geometry,poleLines));
    }
   }
  }
 }
 return {shelters,poles};
}
