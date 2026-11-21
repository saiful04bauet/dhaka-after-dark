/* Dhaka / After Dark — original gameplay prototype. Runtime geodata: © OpenStreetMap contributors (ODbL). */
const $ = id => document.getElementById(id);
let THREE;
try {
  THREE = await import('https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js');
} catch (err) {
  $('intro').classList.add('hidden'); $('fatal').classList.remove('hidden');
  $('fatalText').textContent = 'Could not load the Three.js engine. Please connect to the internet and open through a local HTTP server. ' + err.message;
  $('retry').onclick = () => location.reload();
  throw err;
}
const T=THREE;
const CENTER={lat:23.7395,lon:90.4005};
const BBOX=[23.733,90.393,23.746,90.409];
const CITY_RADIUS=1100;
const M_PER_DEG_LAT=111320, M_PER_DEG_LON=111320*Math.cos(CENTER.lat*Math.PI/180);
const state={playing:false,paused:false,inCar:false,night:false,rain:false,wideCamera:false,largeMap:false,cash:0,missionIndex:0,time:17.67,loading:true,realMap:false};
const keys={};const held={};
let geometryMap={roads:[],buildings:[],parks:[],waters:[],source:'procedural'};
let scene,camera,renderer,clock,sun,hemi,ground,player,person,userCar,cameraTarget=new T.Vector3();
let roadMaterial,roadMajorMaterial,sideMaterial,buildingMaterials=[],roofMaterials=[],windowMaterials=[],treeCanopy;
let cityObjects=[],traffic=[],pedestrians=[],collisionShapes=[],trafficRoutes=[],missionMarker,missionHalo,missionTarget={x:0,z:0},roadPoints=[];
let mapCanvas=$('minimap'),mapCtx=mapCanvas.getContext('2d'),fullCanvas=$('largeMap'),fullCtx=fullCanvas.getContext('2d');
let carSpeed=0,carYaw=0,walkSpeed=0,cameraYaw=.55,mouseDown=false,mousePrevX=0,modeToastAt=0;
let rainMesh, rainPositions, textures=[],spinner=0;
const vec=(x,y,z)=>new T.Vector3(x,y,z);
const geo=(lat,lon)=>({x:(lon-CENTER.lon)*M_PER_DEG_LON,z:-(lat-CENTER.lat)*M_PER_DEG_LAT});
const inverseGeo=(x,z)=>({lat:CENTER.lat-z/M_PER_DEG_LAT,lon:CENTER.lon+x/M_PER_DEG_LON});
const hash = n=>{const k=Math.sin(n*12.9898+78.233)*43758.5453;return k-Math.floor(k)};
const rand = (a,b,n=1)=>a+hash(n)*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smoothAngle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
function toast(s){let el=$('toast');el.textContent=s;el.classList.add('show');clearTimeout(toast._tid);toast._tid=setTimeout(()=>el.classList.remove('show'),3000)}
function initThree(){
  scene=new T.Scene();scene.background=new T.Color(0xb4a89c);scene.fog=new T.FogExp2(0x9e9b94,.00112);
  camera=new T.PerspectiveCamera(65,innerWidth/innerHeight,.15,2300);
  renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
  clock=new T.Clock();
  hemi=new T.HemisphereLight(0xe0e4ee,0x625948,2.0);scene.add(hemi);
  sun=new T.DirectionalLight(0xffdfb0,3.0);sun.position.set(-150,290,-100);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-210;sun.shadow.camera.right=210;
  sun.shadow.camera.top=210;sun.shadow.camera.bottom=-210;sun.shadow.camera.near=1;sun.shadow.camera.far=800;
  sun.shadow.bias=-.0005;scene.add(sun);sun.target.position.set(0,0,0);scene.add(sun.target);
  const asphaltTex=makeAsphaltTexture();roadMaterial=new T.MeshStandardMaterial({color:0x66666a,roughness:.84,metalness:.05,map:asphaltTex});
  roadMajorMaterial=new T.MeshStandardMaterial({color:0x57585e,roughness:.72,metalness:.08,map:asphaltTex});
  sideMaterial=new T.MeshStandardMaterial({color:0x777b76,roughness:.98});
  for(let i=0;i<8;i++){
    const fac=makeFacadeTexture(i);textures.push(fac);
    const shades=[0xc9c6bd,0x969da0,0xaaa79b,0xa9b1b4,0xbbb5a8,0xa7a8ab,0xc8b6a2,0xb9c2bd];
    buildingMaterials.push(new T.MeshStandardMaterial({color:shades[i],map:fac,roughness:.83,metalness:.05}));
    roofMaterials.push(new T.MeshStandardMaterial({color:0x858782,roughness:1}));
  }
  ground=new T.Mesh(new T.PlaneGeometry(2500,2500),new T.MeshStandardMaterial({color:0x777e73,roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.position.y=-.07;scene.add(ground);
  const groundgrid=new T.GridHelper(2200,110,0x79847b,0x79847b);groundgrid.position.y=-.047;groundgrid.material.opacity=.075;groundgrid.material.transparent=true;scene.add(groundgrid);
  treeCanopy=new T.MeshStandardMaterial({color:0x384f38,roughness:1});
  onResize();window.addEventListener('resize',onResize);window.addEventListener('visibilitychange',()=>{if(document.hidden&&state.playing)pause(true)});
}
function makeAsphaltTexture(){
 const c=document.createElement('canvas');c.width=c.height=256;const ct=c.getContext('2d');ct.fillStyle='#b8b8b8';ct.fillRect(0,0,256,256);
 const im=ct.getImageData(0,0,256,256);
 for(let i=0;i<im.data.length;i+=4){let n=rand(-40,32,i)+Math.sin(i*.13)*4;im.data[i]=clamp(173+n,0,255);im.data[i+1]=clamp(173+n,0,255);im.data[i+2]=clamp(177+n,0,255);}
 ct.putImageData(im,0,0);for(let i=0;i<230;i++){let x=rand(0,256,i+500),y=rand(0,256,i+1000);ct.fillStyle='#84848660';ct.fillRect(x,y,rand(1,5,i+10),1);}
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(15,15);t.colorSpace=T.SRGBColorSpace;return t;
}
function makeFacadeTexture(seed){
 const c=document.createElement('canvas');c.width=256;c.height=512;const ct=c.getContext('2d');
 const base=['#bcb9aa','#858f94','#aaa89c','#979f9f','#b1a997','#9e9da0','#baae9f','#b0b9b2'][seed];
 ct.fillStyle=base;ct.fillRect(0,0,256,512);
 for(let n=0;n<2000;n++){ct.fillStyle=`rgba(30,30,30,${hash(n+seed*10)*.08})`;ct.fillRect(rand(0,256,n+31),rand(0,512,n+91),rand(1,7,n+291),1);}
 for(let y=16;y<520;y+=69){ct.fillStyle='#6c6c6b70';ct.fillRect(0,y+52,256,4);
  for(let x=13;x<252;x+=54){const lit=hash(x*11+y+seed*100)<.15;
   ct.fillStyle='#6d6760';ct.fillRect(x-3,y-2,39,47);
   ct.fillStyle=lit?'#d2ba8f':'#435660';ct.fillRect(x,y,33,40);
   ct.fillStyle='#9da8af77';ct.fillRect(x+2,y+2,9,35);
   ct.fillStyle='#222c31';ct.fillRect(x+16,y,2,40);
   ct.fillStyle='#8f938d';ct.fillRect(x-5,y+41,42,4);
   if(hash(x+y+seed)<.27){ct.fillStyle='#9c9d92';ct.fillRect(x-5,y+45,42,5);ct.fillStyle='#393d40';ct.fillRect(x+5,y+45,8,5);}
  }
 }
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(.04,.05);t.anisotropy=2;return t;
}
const paint=(color,roughness=.84,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
function planePolygon(poly,material,y){
 if(poly.length<3)return;const pts=poly.map(p=>new T.Vector2(p.x,-p.z));
 try{const shape=new T.Shape(pts),g=new T.ShapeGeometry(shape);g.rotateX(-Math.PI/2);const mesh=new T.Mesh(g,material);mesh.position.y=y;mesh.receiveShadow=true;scene.add(mesh);cityObjects.push(mesh);}catch(e){}
}
function box(w,h,d,mat,x=0,y=0,z=0){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);return mesh}
function cylinder(r1,r2,height,mat,x,y,z,sides=12){const m=new T.Mesh(new T.CylinderGeometry(r1,r2,height,sides),mat);m.position.set(x,y,z);return m}
function roadWidth(tag){const kind=tag.highway; const lanes=Number(tag.lanes)||0;
 if(['motorway','trunk'].includes(kind))return 20;
 if(['primary','primary_link'].includes(kind))return Math.max(13,lanes*3.1);
 if(['secondary','secondary_link'].includes(kind))return Math.max(10.5,lanes*3.0);
 if(['tertiary','tertiary_link'].includes(kind))return Math.max(8.1,lanes*2.8);
 if(['residential','unclassified'].includes(kind))return 6.8;
 if(['service','living_street'].includes(kind))return 4.8;
 if(['footway','path','pedestrian'].includes(kind))return 2;
 return 4.8;
}
function polylineLength(points){let d=0;for(let i=1;i<points.length;i++)d+=Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z);return d;}
function roadQuad(a,b,width,y=.015){const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.3)return null;const nx=-dz/len*width/2,nz=dx/len*width/2;
 return [a.x+nx,y,a.z+nz,b.x+nx,y,b.z+nz,b.x-nx,y,b.z-nz,a.x+nx,y,a.z+nz,b.x-nx,y,b.z-nz,a.x-nx,y,a.z-nz];}
function bufferMesh(verts,mat){if(!verts.length)return null;const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.computeVertexNormals();const m=new T.Mesh(g,mat);m.receiveShadow=true;scene.add(m);cityObjects.push(m);return m;}
function addRoads(){
 const main=[],side=[],edge=[],line=[],dash=[];let streetCount=0;
 for(const road of geometryMap.roads){const p=road.points;const width=road.width;const isMain=width>=8;streetCount++;
  for(let i=1;i<p.length;i++){let a=p[i-1],b=p[i];let dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<1)continue;
   const q=roadQuad(a,b,width,.035);if(q)(isMain?main:side).push(...q);
   const shoulder=roadQuad(a,b,width+2.9,.007);if(shoulder)edge.push(...shoulder);
   if(isMain){const step=12;for(let s=4;s<len-2;s+=step){let u=s/len,v=Math.min((s+4)/len,1);const c={x:lerp(a.x,b.x,u),z:lerp(a.z,b.z,u)},d={x:lerp(a.x,b.x,v),z:lerp(a.z,b.z,v)};
    const stripe=roadQuad(c,d,.16,.067);if(stripe)dash.push(...stripe);
   }}
  }
  if(road.width>=4.5&&road.points.length>1&&polylineLength(road.points)>22)trafficRoutes.push(road);
 }
 bufferMesh(edge,new T.MeshStandardMaterial({color:0x797b73,roughness:1}));
 bufferMesh(side,roadMaterial);bufferMesh(main,roadMajorMaterial);
 const dmat=new T.MeshBasicMaterial({color:0xbfc0ad,transparent:true,opacity:.66,side:T.DoubleSide});bufferMesh(dash,dmat);
}
function createBuildings(){
 let count=0;
 for(const b of geometryMap.buildings){if(count>1100)break;const ps=b.points;if(ps.length<4)continue;
  const distinct=ps.slice(0,-1);let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const p of distinct){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z)}
  const area=(maxX-minX)*(maxZ-minZ);if(area<9||area>22000)continue;
  const id=b.id||count+1, floors=Number(b.tags['building:levels'])||0;
  const taggedHeight=parseFloat(b.tags.height)||0;
  const height=clamp(taggedHeight||floors*3.2||rand(7,34,id),3.8,83);
  const ix=Math.floor(hash(id)*buildingMaterials.length);
  try{
   const shape=new T.Shape(distinct.map(p=>new T.Vector2(p.x,-p.z)));
   const g=new T.ExtrudeGeometry(shape,{depth:height,steps:1,bevelEnabled:false,curveSegments:1});g.rotateX(-Math.PI/2);
   const m=new T.Mesh(g,[roofMaterials[ix],buildingMaterials[ix]]);m.castShadow=true;m.receiveShadow=true;scene.add(m);cityObjects.push(m);count++;
   collisionShapes.push({minX,maxX,minZ,maxZ,points:distinct});
   if(hash(id+99)>.75&&height>12&&count<650){const roof=box(Math.min(5,(maxX-minX)*.35),1.5,Math.min(5,(maxZ-minZ)*.35),paint(0x777d7b),.5*(minX+maxX),height+.75,.5*(minZ+maxZ));scene.add(roof);cityObjects.push(roof)}
   if(hash(id+11)>.8){const tank=cylinder(.9,.9,2,paint(0x373d41),.5*(minX+maxX),height+1,.5*(minZ+maxZ),10);scene.add(tank);cityObjects.push(tank)}
  }catch(err){}
 }
 return count;
}
function treesAlongPark(poly,id){let n=0;const cx=poly.reduce((a,p)=>a+p.x,0)/poly.length,cz=poly.reduce((a,p)=>a+p.z,0)/poly.length;
 for(let i=0;i<poly.length-1;i++){const a=poly[i],b=poly[i+1],len=Math.hypot(b.x-a.x,b.z-a.z);const num=Math.min(5,Math.floor(len/24));
  for(let j=0;j<num;j++){if(n>130)return;n++;let t=(j+.3)/num,xx=lerp(a.x,b.x,t),zz=lerp(a.z,b.z,t);addTree(xx*.92+cx*.08,zz*.92+cz*.08,hash(id+i*50+j));}
 }
}
function addTree(x,z,r){const size=3.5+r*4;
 const trunk=cylinder(.35,.52,size,paint(0x514537),x,size/2,z,7);trunk.castShadow=true;scene.add(trunk);cityObjects.push(trunk);
 for(let j=0;j<3;j++){const canopy=new T.Mesh(new T.IcosahedronGeometry(size*(.47+hash(j+r)*.19),2),new T.MeshStandardMaterial({color:new T.Color().setHSL(.31+hash(r+j)*.04,.19,.19+hash(r+j*3)*.06),roughness:1}));canopy.position.set(x+(j-1)*size*.23,size+j*.45+size*.25,z+(hash(r+j*13)-.5)*size*.25);canopy.castShadow=true;scene.add(canopy);cityObjects.push(canopy)}
}
function createParksAndWaters(){
 const gmat=new T.MeshStandardMaterial({color:0x566e4e,roughness:1}),wmat=new T.MeshPhysicalMaterial({color:0x415b5b,roughness:.26,metalness:.27,clearcoat:.7,clearcoatRoughness:.17});
 for(let i=0;i<geometryMap.parks.length;i++){const park=geometryMap.parks[i];planePolygon(park.points,gmat,.02);if(i<18)treesAlongPark(park.points,park.id||i)}
 for(const w of geometryMap.waters)planePolygon(w.points,wmat,.036);
}
function addCityFurniture(){
 const poleMat=paint(0x52595a,.52,.4),lightMat=new T.MeshBasicMaterial({color:0xffe6b2}),lightCone=new T.MeshBasicMaterial({color:0xffdc94,transparent:true,opacity:.12});
 let c=0;
 for(const road of geometryMap.roads){if(road.width<9||c>90)continue;const pts=road.points;
 for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],len=Math.hypot(b.x-a.x,b.z-a.z);if(len<45)continue;
  const n=Math.min(3,Math.floor(len/75));for(let t=0;t<n;t++){if(c++>90)break;let p=(t+.5)/n,dx=(b.x-a.x)/len,dz=(b.z-a.z)/len;
   const side=(c%2?1:-1),x=lerp(a.x,b.x,p)-dz*(road.width/2+1.9)*side,z=lerp(a.z,b.z,p)+dx*(road.width/2+1.9)*side;
   const pole=cylinder(.13,.16,8,poleMat,x,4,z,8);scene.add(pole);cityObjects.push(pole);
   const arm=box(2.2,.17,.16,poleMat,x+1,7.85,z);scene.add(arm);cityObjects.push(arm);
   const lamp=box(.83,.1,.62,lightMat,x+2.05,7.72,z);scene.add(lamp);cityObjects.push(lamp);
  }
 }
 }
 // Urban signs with an understated, weathered look; these are original fictional businesses.
 const candidates=geometryMap.roads.filter(r=>r.width>=8&&r.points.length>1);const names=['CHAI & CO.','DHAKA ELECTRONICS','NEW MARKET','RIVER CITY','BENGAL PHARMACY','METRO POINT','THE TEA HOUSE'];
 for(let i=0;i<Math.min(23,candidates.length);i++){
  const road=candidates[(i*13)%candidates.length],p=road.points[Math.floor(road.points.length/2)];if(!p)continue;
  const tx=makeSignTexture(names[i%names.length]);const panel=new T.Mesh(new T.PlaneGeometry(8,2),new T.MeshBasicMaterial({map:tx,side:T.DoubleSide}));
  panel.position.set(p.x+road.width*.8,5.8,p.z+road.width*.7);panel.rotation.y=i*.67;scene.add(panel);cityObjects.push(panel);
 }
}
function makeSignTexture(text){const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.fillStyle='#26343a';x.fillRect(0,0,512,128);x.strokeStyle='#5b6f70';x.lineWidth=8;x.strokeRect(0,0,512,128);x.fillStyle='#e4d6b7';x.font='bold 40px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,64);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
function makeCharacter(){
 const body=new T.Group();const jacket=paint(0x2a3439,.95),shirt=paint(0xd5d2c9),skin=paint(0x9c7052),jeans=paint(0x242c35),shoe=paint(0x161c20),hair=paint(0x141617);
 const torso=box(.92,1.15,.48,jacket,0,1.68,0);torso.castShadow=true;body.add(torso);
 const undershirt=box(.35,.76,.055,shirt,0,1.71,.255);body.add(undershirt);
 const neck=cylinder(.17,.2,.23,skin,0,2.32,0);body.add(neck);
 const head=new T.Mesh(new T.SphereGeometry(.30,16,12),skin);head.scale.set(.9,1.13,.86);head.position.y=2.66;head.castShadow=true;body.add(head);
 const haircap=new T.Mesh(new T.SphereGeometry(.3,12,9),hair);haircap.scale.set(.93,.38,.87);haircap.position.y=2.89;body.add(haircap);
 const arms=[],legs=[];
 for(const sign of [-1,1]){
  const pivot=new T.Group();pivot.position.set(sign*.58,2.1,0);const arm=box(.26,.9,.3,jacket,0,-.44,0);arm.castShadow=true;pivot.add(arm);
  const hand=new T.Mesh(new T.SphereGeometry(.13,9,8),skin);hand.position.y=-.88;pivot.add(hand);body.add(pivot);arms.push(pivot);
  const lp=new T.Group();lp.position.set(sign*.25,1.11,0);const leg=box(.34,1.01,.38,jeans,0,-.51,0);leg.castShadow=true;lp.add(leg);lp.add(box(.39,.19,.6,shoe,0,-1.04,.13));body.add(lp);legs.push(lp);
 }
 const shadow=new T.Mesh(new T.CircleGeometry(.78,24),new T.MeshBasicMaterial({color:0x0a0b0c,transparent:true,opacity:.23,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.022;body.add(shadow);
 body.userData={arms,legs};return body;
}
function makeCar(color=0x78878b,type='sedan'){
 const car=new T.Group(),paintBody=new T.MeshPhysicalMaterial({color,metalness:.65,roughness:.24,clearcoat:.87,clearcoatRoughness:.16}),glass=new T.MeshPhysicalMaterial({color:0x1b2831,metalness:.4,roughness:.16,transparent:false}),dark=paint(0x17191d,.8),rubber=paint(0x15181a,.95),silver=paint(0x9a9b94,.25,.6),lamp= new T.MeshBasicMaterial({color:0xf9e7c5}),brake=new T.MeshBasicMaterial({color:0xc73524});
 const isBus=type==='bus',isCng=type==='cng',long=isBus?9.5:isCng?3:4.55,w=isBus?2.3:isCng?1.55:1.88,roofH=isBus?2.7:isCng?1.6:1.23;
 const lower=box(w,.65,long,paintBody,0,.73,0);lower.castShadow=true;car.add(lower);
 if(isCng){car.add(box(w*.9,roofH,long*.64,glass,0,1.63,-.15));car.add(box(w*.98,.16,long*.7,paintBody,0,2.43,-.15));}
 else if(isBus){car.add(box(w*.95,2.4,long*.92,paintBody,0,2.05,0));for(let s=-3;s<=3;s++){car.add(box(w*.9,.75,.83,glass,0,2.25,s*1.22));}}
 else {const cabin=box(w*.86,.8,long*.51,glass,0,1.45,-.17);cabin.castShadow=true;car.add(cabin);
  car.add(box(w*.91,.12,long*.38,paintBody,0,1.94,-.28));}
 const offs=isBus?long*.36:isCng?long*.29:long*.32;
 for(let s of [-1,1])for(let q of [-1,1]){
  const wheel=new T.Mesh(new T.CylinderGeometry(.43,.43,.28,20),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(s*(w/2+.035),.43,q*offs);wheel.castShadow=true;car.add(wheel);
  const rim=new T.Mesh(new T.CylinderGeometry(.22,.22,.3,12),silver);rim.rotation.z=Math.PI/2;rim.position.copy(wheel.position);car.add(rim);
 }
 car.add(box(w*.64,.14,.12,brake,0,.79,-long/2-.03));car.add(box(w*.66,.15,.13,lamp,0,.86,long/2+.03));
 for(let s of [-1,1]){car.add(box(.35,.13,.05,lamp,s*w*.34,1.03,long/2+.07));car.add(box(.35,.13,.05,brake,s*w*.34,1.03,-long/2-.07));}
 if(!isBus&&!isCng){for(let s of [-1,1])car.add(box(.25,.11,.32,dark,s*w*.52,1.47,.57));}
 car.userData={kind:type,length:long};return car;
}
function pointInPolygon(x,z,points){
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];
  if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
 }
 return inside;
}
function collidesWithBuilding(x,z){
 for(const s of collisionShapes){
  if(x<s.minX||x>s.maxX||z<s.minZ||z>s.maxZ)continue;
  if(pointInPolygon(x,z,s.points))return true;
 }
 return false;
}
function randomCarColor(i){return [0xc0c1be,0x4e565e,0x878d91,0x73766f,0xd5d0bd,0x3d4c58,0x8b4c46,0x818b7e,0x393c40][i%9]}
function findNearestRoad(x,z){let min=Infinity,best={x,z,yaw:0};
 for(const r of geometryMap.roads){if(r.width<4.4)continue;for(let i=1;i<r.points.length;i++){
  const a=r.points[i-1],b=r.points[i],dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz;if(len2<4)continue;
  const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/len2,0,1),xx=a.x+t*dx,zz=a.z+t*dz,d=(x-xx)**2+(z-zz)**2;
  if(d<min){min=d;best={x:xx,z:zz,yaw:Math.atan2(dx,dz)};}
 }}return best;
}
function spawnEntities(){
 let spawn=geo(23.7391,90.3983);spawn=findNearestRoad(spawn.x,spawn.z);
 player={x:spawn.x,z:spawn.z,yaw:spawn.yaw};carYaw=spawn.yaw;
 person=makeCharacter();person.position.set(player.x,0,player.z);person.rotation.y=player.yaw;scene.add(person);
 userCar=makeCar(0x414e56);userCar.position.set(spawn.x+8,0,spawn.z+7);userCar.rotation.y=spawn.yaw;scene.add(userCar);
 const valid=trafficRoutes.filter(r=>polylineLength(r.points)>38&&r.width>4.5);const count=Math.min(35,valid.length);
 for(let i=0;i<count;i++){
  const path=valid[(i*23+7)%valid.length];const type=i%12===0?'bus':i%9===0?'cng':'sedan';const car=makeCar(randomCarColor(i),type);
  const length=polylineLength(path.points);traffic.push({object:car,path,progress:hash(i+17)*length,length,speed:(type==='bus'?4:type==='cng'?5.4:7)+hash(i)*3,forward:i%2===0?1:-1});scene.add(car);
 }
 // Pedestrians follow short paths along road shoulders; simplified placeholder NPCs.
 const walkRoutes=valid.filter(r=>r.points.length>2&&r.width>=5.5&&polylineLength(r.points)>65);
 for(let i=0;i<Math.min(18,walkRoutes.length);i++){
  const path=walkRoutes[(i*7+3)%walkRoutes.length];
  const npc=makeCharacter();npc.scale.setScalar(.86+hash(i+3)*.13);
  // Alternate restrained clothing colors for different street characters.
  npc.children[0].material=paint([0x44494f,0x635c58,0x283844,0x49483e,0x585f65][i%5]);
  pedestrians.push({object:npc,path,progress:hash(i*3+12)*polylineLength(path.points),length:polylineLength(path.points),speed:.9+hash(i)*.8,forward:i%2?1:-1,offset:(i%2?1:-1)*(path.width/2+1.5)});scene.add(npc);
 }
 const targets=trafficRoutes.filter(r=>r.width>7&&polylineLength(r.points)>40);
 roadPoints=targets.flatMap(r=>r.points.filter((_,i)=>i%Math.max(1,Math.floor(r.points.length/4))===0));
 setMission();
 camera.position.set(spawn.x+9,7,spawn.z-14);cameraTarget.set(spawn.x,1.7,spawn.z);
}
function pickMission(){
 if(!roadPoints.length)return {x:player.x+130,z:player.z+100};
 const current={x:player.x,z:player.z};
 const eligible=roadPoints.filter(p=>{const d=Math.hypot(p.x-current.x,p.z-current.z);return d>130&&d<500});
 return (eligible.length?eligible:roadPoints)[Math.floor(hash(state.missionIndex*41+7)*((eligible.length?eligible:roadPoints).length))]||roadPoints[0];
}
function setMission(){
 missionTarget=pickMission();
 if(missionMarker)scene.remove(missionMarker);
 missionMarker=new T.Group();
 const ring=new T.Mesh(new T.TorusGeometry(3.3,.19,10,48),new T.MeshBasicMaterial({color:0xf1b45b}));ring.rotation.x=Math.PI/2;ring.position.y=.24;missionMarker.add(ring);missionHalo=ring;
 const cone=new T.Mesh(new T.ConeGeometry(2,5,4),new T.MeshBasicMaterial({color:0xffc17c,transparent:true,opacity:.67}));cone.rotation.z=Math.PI;cone.position.y=8.5;missionMarker.add(cone);
 const pillar=new T.Mesh(new T.CylinderGeometry(1.25,1.25,15,16,1,true),new T.MeshBasicMaterial({color:0xeead54,transparent:true,opacity:.16,side:T.DoubleSide,depthWrite:false}));pillar.position.y=7.5;missionMarker.add(pillar);
 missionMarker.position.set(missionTarget.x,0,missionTarget.z);scene.add(missionMarker);
 $('missionTitle').textContent=['EXPLORE CENTRAL DHAKA','REACH THE NEXT DISTRICT','NIGHT RUN THROUGH DHAKA','FIND THE CITY CHECKPOINT'][state.missionIndex%4];
}
function addRain(){
 const n=3500,rng=new Float32Array(n*3);for(let i=0;i<n;i++){rng[i*3]=(hash(i+3)-.5)*135;rng[i*3+1]=hash(i*1.3+4)*45+1;rng[i*3+2]=(hash(i*2+5)-.5)*135;}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(rng,3));const m=new T.PointsMaterial({color:0xc9d8e3,size:.14,transparent:true,opacity:.65,depthWrite:false});rainMesh=new T.Points(g,m);rainPositions=rng;rainMesh.visible=false;scene.add(rainMesh);
}
async function fetchRealDhaka(){
 const bbox=BBOX.join(',');
 const query=`[out:json][timeout:25];(way["highway"](${bbox});way["building"](${bbox});way["leisure"="park"](${bbox});way["landuse"="grass"](${bbox});way["natural"="water"](${bbox}););out geom;`;
 const hosts=['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter','https://overpass.nchc.org.tw/api/interpreter'];
 let error;
 for(const host of hosts){
  const controller=new AbortController(),tm=setTimeout(()=>controller.abort(),11000);
  try{
   const r=await fetch(host+'?data='+encodeURIComponent(query),{method:'GET',signal:controller.signal,mode:'cors'});
   if(!r.ok)throw new Error('Overpass '+r.status);
   const json=await r.json();const data=parseOverpass(json);
   if(data.roads.length<25||data.buildings.length<10)throw new Error('Incomplete city data');
   clearTimeout(tm);return data;
  }catch(e){error=e;clearTimeout(tm)}
 }
 throw error||new Error('No map service available');
}
function parseOverpass(response){
 const data={roads:[],buildings:[],parks:[],waters:[],source:'OSM'};
 for(const way of response.elements||[]){if(way.type!=='way'||!way.geometry||way.geometry.length<2)continue;
  const tags=way.tags||{},ps=way.geometry.map(p=>geo(p.lat,p.lon));
  if(tags.highway && !['construction','proposed','raceway','steps','cycleway','bridleway','platform'].includes(tags.highway))data.roads.push({id:way.id,tags,width:roadWidth(tags),points:ps});
  else if(tags.building && ps.length>=4)data.buildings.push({id:way.id,tags,points:ps});
  else if((tags.leisure==='park'||tags.landuse==='grass')&&ps.length>=4)data.parks.push({id:way.id,tags,points:ps});
  else if(tags.natural==='water'&&ps.length>=4)data.waters.push({id:way.id,tags,points:ps});
 }
 return data;
}
function proceduralFallback(){
 // This is deliberately labeled as a simulated fallback, never as an authentic OSM map.
 const data={roads:[],buildings:[],parks:[],waters:[],source:'SIMULATED'};
 let id=1;
 const makeLine=(pts,width)=>data.roads.push({id:id++,tags:{highway:width>10?'primary':'residential'},width,points:pts.map(([x,z])=>({x,z}))});
 for(let i=-5;i<=5;i++){
  const x=i*105+Math.sin(i*1.3)*22;
  makeLine(Array.from({length:10},(_,j)=>[x+Math.sin(j*.9+i)*22,-570+j*124]),i%3===0?14:7);
  const z=i*105+Math.cos(i*1.2)*19;
  makeLine(Array.from({length:10},(_,j)=>[-560+j*124,z+Math.cos(j*.6+i)*18]),i%4===0?13:6);
 }
 // A denser urban grid, loosely evokes building scale but isn't a street-accurate map.
 for(let i=-5;i<5;i++)for(let j=-5;j<5;j++){
  const xx=i*105+50+Math.sin(i)*10,zz=j*105+50+Math.cos(j)*10;
  if(Math.hypot(xx,zz)<125)continue;
  for(let k=0;k<4;k++){
   let x=xx+(k%2?18:-18),z=zz+(k>1?18:-18),w=rand(15,26,id),d=rand(15,27,id+1);
   const ps=[{x:x-w/2,z:z-d/2},{x:x+w/2,z:z-d/2},{x:x+w/2,z:z+d/2},{x:x-w/2,z:z+d/2},{x:x-w/2,z:z-d/2}];
   data.buildings.push({id:id++,tags:{'building:levels':String(Math.floor(rand(2,10,id+2)))},points:ps});
  }
 }
 const park=[{x:-120,z:-115},{x:110,z:-115},{x:110,z:120},{x:-120,z:120},{x:-120,z:-115}];data.parks.push({id:id++,points:park});
 return data;
}
async function setupWorld(){
 $('mapStatus').textContent='DOWNLOADING DHAKA...';
 try{geometryMap=await fetchRealDhaka();state.realMap=true;$('mapStatus').textContent='OPENSTREETMAP LIVE';toast('Real Dhaka roads & building outlines loaded');}
 catch(err){console.warn('OSM unavailable, using clearly labeled sample scene:',err);geometryMap=proceduralFallback();state.realMap=false;$('mapStatus').textContent='SIMULATED MAP (OFFLINE)';$('district').textContent='CENTRAL DHAKA · SAMPLE SCENE';$('mapCredit').textContent='Simulated fallback — NOT an accurate map. Reload with OSM access.';}
 createParksAndWaters();addRoads();const buildings=createBuildings();addCityFurniture();spawnEntities();addRain();
 state.loading=false;$('district').textContent=state.realMap?'SHAHBAG / RAMNA · DHAKA':'CENTRAL DHAKA · SAMPLE MAP';
 if(state.realMap)console.info(`OSM city: ${geometryMap.roads.length} roads, ${buildings} 3D buildings`);
 drawMap(mapCtx,310,310,true);drawMap(fullCtx,920,660,false);
}
function onResize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}
function toggleMap(){state.largeMap=!state.largeMap;$('bigMap').classList.toggle('hidden',!state.largeMap);if(state.largeMap)drawMap(fullCtx,920,660,false)}
function pause(v){state.paused=v;$('pause').classList.toggle('hidden',!v);if(v&&document.pointerLockElement)document.exitPointerLock()}
function handleKeyDown(e){const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys[k]=true;
 if(held[k])return;held[k]=true;
 if(k==='escape'){if(state.largeMap){toggleMap();return}if(state.playing)pause(!state.paused);return}
 if(!state.playing||state.paused)return;
 if(k==='e')enterExitVehicle();
 if(k==='t'){state.night=!state.night;toast(state.night?'NIGHT MODE · DHAKA AFTER DARK':'GOLDEN HOUR · EVENING')}
 if(k==='r'){state.rain=!state.rain;rainMesh.visible=state.rain;$('weatherText').textContent=state.rain?'MONSOON RAIN':'CLEAR';toast(state.rain?'MONSOON WEATHER ENABLED':'SKIES CLEARED')}
 if(k==='v'){state.wideCamera=!state.wideCamera;toast(state.wideCamera?'WIDE CAMERA':'CLOSE FOLLOW CAMERA')}
 if(k==='m')toggleMap();
}
function enterExitVehicle(){
 const dx=userCar.position.x-player.x,dz=userCar.position.z-player.z,dist=Math.hypot(dx,dz);
 if(!state.inCar){if(dist>12){toast('Move closer to the parked sedan and press E');return}
  state.inCar=true;player.x=userCar.position.x;player.z=userCar.position.z;carYaw=userCar.rotation.y;person.visible=false;carSpeed=0;toast('VEHICLE ENTERED · W DRIVE · S BRAKE · A/D STEER');
 }else{state.inCar=false;person.visible=true;player.x=userCar.position.x+3.2;player.z=userCar.position.z+2.5;person.position.set(player.x,0,player.z);carSpeed=0;toast('BACK ON FOOT')}
 $('modeLabel').textContent=state.inCar?'SEDAN · DRIVE MODE':'ON FOOT';
}
function updatePedestrians(dt,elapsed){
 for(let i=0;i<pedestrians.length;i++){
  const t=pedestrians[i];t.progress+=t.speed*dt*t.forward;
  if(t.progress>t.length){t.progress=t.length;t.forward=-1}if(t.progress<0){t.progress=0;t.forward=1}
  let left=t.progress,pts=t.path.points,a=pts[0],b=pts[1];
  for(let j=1;j<pts.length;j++){
   const d=Math.hypot(pts[j].x-pts[j-1].x,pts[j].z-pts[j-1].z);
   if(left<=d){a=pts[j-1];b=pts[j];break}left-=d;
  }
  const dx=b.x-a.x,dz=b.z-a.z,len=Math.max(.01,Math.hypot(dx,dz)),r=clamp(left/len,0,1);
  const xx=lerp(a.x,b.x,r)-dz/len*t.offset,zz=lerp(a.z,b.z,r)+dx/len*t.offset;
  t.object.position.set(xx,0,zz);t.object.rotation.y=Math.atan2(dx*t.forward,dz*t.forward);
  const stride=Math.sin(elapsed*8+i)*.47;
  t.object.userData.legs[0].rotation.x=stride;t.object.userData.legs[1].rotation.x=-stride;
  t.object.userData.arms[0].rotation.x=-stride*.6;t.object.userData.arms[1].rotation.x=stride*.6;
 }
}
function updateTraffic(dt){
 for(const t of traffic){t.progress+=t.speed*dt*t.forward;if(t.progress>t.length){t.progress=t.length;t.forward=-1}if(t.progress<0){t.progress=0;t.forward=1}
  let left=t.progress;const pts=t.path.points;let a=pts[0],b=pts[1]||pts[0];for(let i=1;i<pts.length;i++){
   const d=Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z);if(left<=d){a=pts[i-1];b=pts[i];break}left-=d;
  }
  const len=Math.max(.001,Math.hypot(b.x-a.x,b.z-a.z)),r=clamp(left/len,0,1),x=lerp(a.x,b.x,r),z=lerp(a.z,b.z,r);
  t.object.position.set(x,0,z);t.object.rotation.y=Math.atan2((b.x-a.x)*t.forward,(b.z-a.z)*t.forward);
 }
}
function updateControls(dt,elapsed){
 if(!state.playing||state.paused||state.largeMap||state.loading)return;
 const fw=(keys['w']||keys['arrowup']?1:0)-(keys['s']||keys['arrowdown']?1:0);
 const strafe=(keys['d']?1:0)-(keys['a']?1:0);
 if(state.inCar){
  const accel=fw>0?17:fw<0?-23:-8*Math.sign(carSpeed);
  carSpeed+=accel*dt;carSpeed=clamp(carSpeed,-9,keys['shift']?42:29);
  if(!fw)carSpeed=Math.abs(carSpeed)<.08?0:carSpeed;
  if(keys[' '])carSpeed*=Math.pow(.88,dt*60);
  const steer=strafe || (keys['arrowright']?1:0)-(keys['arrowleft']?1:0);
  const steerFactor=clamp(Math.abs(carSpeed)/7,0,1);
  carYaw+=steer*dt*(carSpeed>=0?1:-1)*.95*steerFactor;
  const nx=userCar.position.x+Math.sin(carYaw)*carSpeed*dt,nz=userCar.position.z+Math.cos(carYaw)*carSpeed*dt;
  if(Math.abs(nx)<CITY_RADIUS&&Math.abs(nz)<CITY_RADIUS&&!collidesWithBuilding(nx,nz)){userCar.position.set(nx,0,nz);player.x=nx;player.z=nz;}else carSpeed*=-.24;
  userCar.rotation.y=carYaw;player.yaw=carYaw;
  if(!mouseDown)cameraYaw=smoothAngle(cameraYaw,carYaw,dt*1.75);
  walkSpeed=Math.abs(carSpeed)*3.6;
 }else{
  let mx=Math.sin(cameraYaw)*fw+Math.cos(cameraYaw)*strafe;
  let mz=Math.cos(cameraYaw)*fw-Math.sin(cameraYaw)*strafe;
  const mag=Math.hypot(mx,mz),speed=keys['shift']?8.1:4.2;walkSpeed=mag?speed*3.6:0;
  if(mag>0){mx/=mag;mz/=mag;const nx=player.x+mx*speed*dt,nz=player.z+mz*speed*dt;
   if(Math.abs(nx)<CITY_RADIUS&&Math.abs(nz)<CITY_RADIUS&&!collidesWithBuilding(nx,nz)){player.x=nx;player.z=nz;}
   player.yaw=smoothAngle(player.yaw,Math.atan2(mx,mz),Math.min(1,dt*13));
  }
  person.position.set(player.x,0,player.z);person.rotation.y=player.yaw;
  const phase=elapsed*(keys['shift']?14:9),stride=mag?Math.sin(phase)*.67:0;person.userData.legs[0].rotation.x=stride;person.userData.legs[1].rotation.x=-stride;
  person.userData.arms[0].rotation.x=-stride*.72;person.userData.arms[1].rotation.x=stride*.72;
  person.position.y=Math.abs(stride)*.055;
 }
 if(keys['q'])cameraYaw-=dt*1.65;
 if(keys['f'])cameraYaw+=dt*1.65;
 const dist=state.wideCamera?23:state.inCar?13:8.2;
 const height=state.wideCamera?13:state.inCar?6.4:4.7;
 const target=vec(player.x,state.inCar?1.8:1.62,player.z);
 cameraTarget.lerp(target,1-Math.exp(-dt*8));
 const dest=vec(target.x-Math.sin(cameraYaw)*dist,height,target.z-Math.cos(cameraYaw)*dist);
 camera.position.lerp(dest,1-Math.exp(-dt*4.4));camera.lookAt(cameraTarget);
 const kms=Math.round(walkSpeed);$('speed').textContent=String(kms).padStart(2,'0');$('speedBar').style.width=clamp(kms/145*100,0,100)+'%';
 const gp=inverseGeo(player.x,player.z);$('coords').textContent=`${gp.lat.toFixed(5)}° N, ${gp.lon.toFixed(5)}° E`;
 const distance=Math.hypot(player.x-missionTarget.x,player.z-missionTarget.z);$('missionDistance').textContent=Math.ceil(distance)+' m TO TARGET';
 if(distance<8){state.cash+=500;state.missionIndex++;$('missionCredits').textContent='৳ '+state.cash.toLocaleString();toast('MISSION COMPLETE · ৳500 EARNED');setMission()}
 if(missionMarker){missionHalo.rotation.z+=dt*.65;missionMarker.children[1].position.y=8.2+Math.sin(elapsed*2)*.45;}
 if(rainMesh?.visible){rainMesh.position.set(player.x,0,player.z);const p=rainMesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++){p.array[i*3+1]-=dt*55;if(p.array[i*3+1]<0)p.array[i*3+1]+=45;}p.needsUpdate=true;
 }
}
function updateLighting(dt){
 const night=state.night;
 const bg=new T.Color(night?0x101e2a:state.rain?0x68737b:0xb1a79c);
 scene.background.lerp(bg,.028);scene.fog.color.lerp(new T.Color(night?0x162330:state.rain?0x717880:0xaaa69f),.032);
 hemi.intensity=lerp(hemi.intensity,night?.73:state.rain?1.4:2,dt*.9);
 sun.intensity=lerp(sun.intensity,night?.27:state.rain?.9:3,dt*.9);
 renderer.toneMappingExposure=lerp(renderer.toneMappingExposure,night?.9:state.rain?1.05:1.28,dt*.9);
 scene.fog.density=lerp(scene.fog.density,night?.00165:state.rain?.0019:.00112,dt*.7);
 $('timeText').textContent=night?'23:20':state.rain?'18:10':'17:40';
}
function drawMap(ctx,w,h,local){
 if(!ctx||!geometryMap.roads.length)return;
 ctx.save();ctx.clearRect(0,0,w,h);ctx.fillStyle='#101d28';ctx.fillRect(0,0,w,h);
 const px=local?player.x:0,pz=local?player.z:0,scale=local?.38:Math.min(w/1500,h/1450),ox=w/2,oy=h/2;
 const project=p=>[ox+(p.x-px)*scale,oy+(p.z-pz)*scale];
 if(!local){ctx.lineWidth=1;ctx.strokeStyle='#24323b';for(let i=-600;i<=600;i+=100){const a=project({x:i,z:-700}),b=project({x:i,z:700});ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}}
 for(const park of geometryMap.parks){ctx.fillStyle='#2c4236';ctx.beginPath();park.points.forEach((p,i)=>{const [x,y]=project(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.fill()}
 for(const water of geometryMap.waters){ctx.fillStyle='#28505a';ctx.beginPath();water.points.forEach((p,i)=>{const [x,y]=project(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.fill()}
 ctx.lineCap='round';ctx.lineJoin='round';
 for(const r of geometryMap.roads){ctx.beginPath();for(let i=0;i<r.points.length;i++){let [x,y]=project(r.points[i]);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.strokeStyle='#4d606b';ctx.lineWidth=Math.max(1,r.width*scale);ctx.stroke();}
 if(!local){ctx.fillStyle='#25343a';for(let i=0;i<geometryMap.buildings.length;i+=1){let b=geometryMap.buildings[i];ctx.beginPath();b.points.forEach((p,j)=>{let [x,y]=project(p);j?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.fill()}}
 const [mx,my]=project(missionTarget);ctx.beginPath();ctx.fillStyle='#eab266';ctx.arc(mx,my,local?5:8,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.strokeStyle='#eab266';ctx.lineWidth=1;ctx.arc(mx,my,local?12:16,0,Math.PI*2);ctx.stroke();
 const [xx,yy]=project({x:player.x,z:player.z});ctx.save();ctx.translate(xx,yy);ctx.rotate(-player.yaw);
 ctx.fillStyle='#91c9ed';ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(6,9);ctx.lineTo(0,5);ctx.lineTo(-6,9);ctx.closePath();ctx.fill();ctx.restore();
 if(!local){ctx.fillStyle='#dfe6e9';ctx.font='600 18px sans-serif';ctx.fillText('DHAKA · SHAHBAG / RAMNA',25,33);ctx.fillStyle='#abb3b9';ctx.font='13px sans-serif';ctx.fillText(state.realMap?'Real OSM map geometry':'SIMULATED FALLBACK MAP',25,53);}
 ctx.restore();
}
let mapTick=0;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),now=clock.elapsedTime;
 if(!state.paused&&!state.largeMap&&!state.loading){updateControls(dt,now);if(state.playing){updateTraffic(dt);updatePedestrians(dt,now);}updateLighting(dt);if(++mapTick%5===0){drawMap(mapCtx,310,310,true)}}
 renderer.render(scene,camera);
}
function bindUI(){
 $('play').onclick=()=>{if(state.loading){toast('Map is still loading');return}state.playing=true;$('intro').classList.add('hidden');toast(state.realMap?'WELCOME TO DHAKA · EXPLORE THE REAL STREET NETWORK':'SAMPLE WORLD · RELOAD ONLINE FOR ACCURATE DHAKA MAP')};
 $('resume').onclick=()=>pause(false);$('restart').onclick=()=>location.reload();$('retry').onclick=()=>location.reload();$('closeMap').onclick=toggleMap;
 document.addEventListener('keydown',handleKeyDown);document.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;held[e.key.toLowerCase()]=false});
 document.addEventListener('blur',()=>{for(const k in keys)keys[k]=false;for(const k in held)held[k]=false});
 $('world').addEventListener('mousedown',e=>{if(e.button===0)mouseDown=true;mousePrevX=e.clientX});
 document.addEventListener('mouseup',()=>mouseDown=false);
 document.addEventListener('mousemove',e=>{if(mouseDown&&state.playing&&!state.paused){cameraYaw-=(e.clientX-mousePrevX)*.005;mousePrevX=e.clientX}});
 $('minimapWrap').onclick=()=>{if(state.playing)toggleMap()};
}
try{initThree();bindUI();animate();await setupWorld();$('play').disabled=false;}
catch(err){console.error('World setup failed',err);$('mapStatus').textContent='SCENE ERROR';$('intro').classList.add('hidden');$('fatal').classList.remove('hidden');$('fatalText').textContent=String(err?.stack||err);}