/* Dhaka / After Dark — original gameplay prototype. Runtime geodata: © OpenStreetMap contributors (ODbL). */
import {decorateBuildingFacades,createGroundedTree,placeDhakaStreetDetails,loadReflectionEnvironment} from './environment_hd.js';
import {installDetailedVehicles} from './vehicles_hd.js';
import {StreetRouter,createLiveDhakaMap} from './map_navigation.js';
import {cameraRelativeMove,steerVehicleYaw,minimapArrowRotation,gpsArrowRotationDegrees} from './control_math.js';
import {UrbanGameplay,MISSIONS} from './gameplay.js';
import {setupStreetLife} from './urban_runtime.js';
import {CarjackController} from './carjacking.js';
import {TileRadar,metersToPixels} from './radar_tiles.js';
import {addNamedDhakaRoadSigns,selectBalancedBuildings} from './osm_city_details.js';
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
// The first playable area spans Gulshan, Banani and Mohakhali; geolocations
// denote exploration anchors, not detailed 3D reconstructions of landmarks.
const CENTER={lat:23.7870,lon:90.4070};
const BBOX=[23.7738,90.3880,23.8007,90.4265];
const CITY_RADIUS=2800;
const DISTRICTS=[
 {id:'gulshan', name:'GULSHAN 2 CIRCLE', lat:23.7948921,lon:90.4138705, detail:'GULSHAN AVENUE · 3D EXPLORATION'},
 {id:'banani', name:'BANANI ROAD 11',lat:23.79075,lon:90.40503,detail:'BANANI · COMMERCIAL STREETS'},
 {id:'mohakhali', name:'MOHAKHALI BUS STAND',lat:23.77794,lon:90.39848,detail:'MOHAKHALI · BUS TERMINAL ZONE'},
 {id:'gulshan1', name:'GULSHAN 1 CIRCLE',lat:23.78032,lon:90.4168,detail:'GULSHAN 1 · CITY JUNCTION'}
];
const game=new UrbanGameplay();
const carDurability=new Map();
const carjacking=new CarjackController();
const fleeingDrivers=[];
let roadNames=[];
let urban=null,policeState={policeDistance:Infinity,busted:false},impactCooldown=0,hudFrame=0,jobsOpen=false;
let jumpHeight=0,jumpVelocity=0,crouched=false;
const M_PER_DEG_LAT=111320, M_PER_DEG_LON=111320*Math.cos(CENTER.lat*Math.PI/180);
const state={playing:false,paused:false,inCar:false,night:false,rain:false,wideCamera:false,largeMap:false,cash:game.cash,missionIndex:game.missionIndex,time:17.67,loading:true,realMap:false};
const keys={};const held={};
let geometryMap={roads:[],buildings:[],parks:[],waters:[],source:'procedural'};
let scene,camera,renderer,clock,sun,hemi,ground,player,person,userCar,cameraTarget=new T.Vector3();
let roadMaterial,roadMajorMaterial,sideMaterial,buildingMaterials=[],roofMaterials=[],windowMaterials=[],treeCanopy;
let cityObjects=[],traffic=[],parkedCars=[],pedestrians=[],collisionShapes=[],trafficRoutes=[],missionMarker,missionHalo,missionTarget={x:0,z:0},roadPoints=[];
let renderedBuildings=[];
let mapCanvas=$('minimap'),mapCtx=mapCanvas.getContext('2d'),fullCanvas=$('largeMap'),fullCtx=fullCanvas.getContext('2d');
let carSpeed=0,carYaw=0,walkSpeed=0,cameraYaw=.55,mouseDown=false,mousePrevX=0,modeToastAt=0;
let rainMesh, rainPositions, textures=[],spinner=0,skyDome,cityLights=[];
let human=null, humanLoadError='', districtMarkers=[],highDetailVehicles=null;
let roadRouter=null,routeInfo=null,leafletViewer=null,navTick=0;
const tileRadar=new TileRadar({onTileReady:()=>{if(state.largeMap&&player)drawMap(fullCtx,920,660,false);}});
const humanFallbackLabel='PROCEDURAL CHARACTER FALLBACK';
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
  scene=new T.Scene();scene.background=new T.Color(0x9cabb9);scene.fog=new T.FogExp2(0xb3b7b6,.00043);
  camera=new T.PerspectiveCamera(65,innerWidth/innerHeight,.15,6000);
  renderer=new T.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;
  clock=new T.Clock();
  hemi=new T.HemisphereLight(0xdbe9ff,0x79756a,1.55);scene.add(hemi);
  sun=new T.DirectionalLight(0xffe4bd,2.7);sun.position.set(-150,290,-100);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-210;sun.shadow.camera.right=210;
  sun.shadow.camera.top=210;sun.shadow.camera.bottom=-210;sun.shadow.camera.near=1;sun.shadow.camera.far=800;
  sun.shadow.bias=-.0005;scene.add(sun);sun.target.position.set(0,0,0);scene.add(sun.target);
  const asphaltTex=makeAsphaltTexture();roadMaterial=new T.MeshStandardMaterial({color:0x67696b,roughness:.9,metalness:.03,map:asphaltTex});
  roadMajorMaterial=new T.MeshStandardMaterial({color:0x585d61,roughness:.88,metalness:.04,map:asphaltTex});
  sideMaterial=new T.MeshStandardMaterial({color:0x777b76,roughness:.98});
  for(let i=0;i<8;i++){
    const fac=makeFacadeTexture(i);textures.push(fac);
    const shades=[0xc9c6bd,0x969da0,0xaaa79b,0xa9b1b4,0xbbb5a8,0xa7a8ab,0xc8b6a2,0xb9c2bd];
    buildingMaterials.push(new T.MeshStandardMaterial({color:shades[i],map:fac,roughness:i%3===0?.37:.79,metalness:i%3===0?.24:.06}));
    roofMaterials.push(new T.MeshStandardMaterial({color:0x858782,roughness:1}));
  }
  addSkyAtmosphere();ground=new T.Mesh(new T.PlaneGeometry(6400,6400),new T.MeshStandardMaterial({color:0x6d7771,roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;ground.position.y=-.07;scene.add(ground);
  const groundgrid=new T.GridHelper(5400,108,0x79847b,0x79847b);groundgrid.position.y=-.047;groundgrid.material.opacity=.075;groundgrid.material.transparent=true;/* Reference-grid deliberately hidden: city roads and surfaces replace editor wireframes. */
  treeCanopy=new T.MeshStandardMaterial({color:0x384f38,roughness:1});
  onResize();window.addEventListener('resize',onResize);window.addEventListener('visibilitychange',()=>{if(document.hidden&&state.playing)pause(true)});
}
function addSkyAtmosphere(){
 // Physical-size 3D atmospheric background; no copied GTA or photo textures.
 const mat=new T.ShaderMaterial({uniforms:{uNight:{value:0},uRain:{value:0}},
   side:T.BackSide,depthWrite:false,vertexShader:"varying vec3 vDir; void main(){vDir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",fragmentShader:"varying vec3 vDir; uniform float uNight; uniform float uRain;\n void main(){\n vec3 d=normalize(vDir);float y=clamp(d.y*0.7+0.34,0.0,1.0);\n vec3 day=mix(vec3(0.76,0.74,0.69),vec3(0.16,0.40,0.68),pow(y,0.65));\n vec3 storm=mix(vec3(0.54,0.57,0.61),vec3(0.25,0.32,0.40),pow(y,0.7));\n vec3 sky=mix(day,storm,uRain);\n float cloud=sin(d.x*45.0+d.z*19.0)*sin(d.z*31.0-d.x*12.0)*0.5+0.5;\n float band=smoothstep(0.51,0.82,cloud)*smoothstep(0.025,0.16,d.y)*(1.0-smoothstep(0.55,0.85,d.y));\n sky=mix(sky,vec3(0.90,0.87,0.80),band*0.25*(1.0-uRain));\n float glow=pow(max(dot(d,normalize(vec3(-0.5,0.18,-0.74))),0.0),115.0);\n sky+=vec3(1.0,0.60,0.30)*glow*0.28*(1.0-uRain);\n vec3 night=mix(vec3(0.075,0.11,0.17),vec3(0.008,0.025,0.070),y);\n gl_FragColor=vec4(mix(sky,night,uNight),1.0);\n }"});
 skyDome=new T.Mesh(new T.SphereGeometry(2450,32,20),mat);
 skyDome.frustumCulled=false;skyDome.renderOrder=-1000;scene.add(skyDome);
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
 const main=[],side=[],edge=[],line=[],dash=[],crosswalk=[];let streetCount=0,crossingCount=0;
 for(const road of geometryMap.roads){const p=road.points;const width=road.width;const isMain=width>=8;streetCount++;
  for(let i=1;i<p.length;i++){let a=p[i-1],b=p[i];let dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<1)continue;
   const q=roadQuad(a,b,width,.035);if(q)(isMain?main:side).push(...q);
   const shoulder=roadQuad(a,b,width+2.9,.007);if(shoulder)edge.push(...shoulder);
   if(isMain&&len>28&&streetCount%9===0&&i%3===1&&crossingCount<85){
     crossingCount++;
     for(let stripe=0;stripe<8;stripe++){
       const u=(len*.38+stripe*.93)/len,v=(len*.38+stripe*.93+.46)/len;
       const c={x:lerp(a.x,b.x,u),z:lerp(a.z,b.z,u)};
       const d={x:lerp(a.x,b.x,v),z:lerp(a.z,b.z,v)};
       const quad=roadQuad(c,d,width*.79,.079);if(quad)crosswalk.push(...quad);
     }
   }
   if(isMain){const step=12;for(let s=4;s<len-2;s+=step){let u=s/len,v=Math.min((s+4)/len,1);const c={x:lerp(a.x,b.x,u),z:lerp(a.z,b.z,u)},d={x:lerp(a.x,b.x,v),z:lerp(a.z,b.z,v)};
    const stripe=roadQuad(c,d,.16,.067);if(stripe)dash.push(...stripe);
   }}
  }
  if(road.width>=4.5&&road.points.length>1&&polylineLength(road.points)>22)trafficRoutes.push(road);
 }
 bufferMesh(edge,new T.MeshStandardMaterial({color:0x797b73,roughness:1}));
 bufferMesh(side,roadMaterial);bufferMesh(main,roadMajorMaterial);
 const dmat=new T.MeshBasicMaterial({color:0xe0e2dd,transparent:true,opacity:.75,side:T.DoubleSide});bufferMesh(dash,dmat);
 bufferMesh(crosswalk,new T.MeshStandardMaterial({color:0xc9ceca,roughness:.86,transparent:true,opacity:.87,side:T.DoubleSide}));
}
function createBuildings(){
 let count=0;
 for(const b of selectBalancedBuildings(geometryMap.buildings,DISTRICTS,geo,1800)){if(count>=1350)break;const ps=b.points;if(ps.length<4)continue;
  const distinct=ps.slice(0,-1);let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const p of distinct){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z)}
  const area=(maxX-minX)*(maxZ-minZ);if(area<9||area>22000)continue;
  const id=b.id||count+1, floors=Number(b.tags['building:levels'])||0;
  const taggedHeight=parseFloat(b.tags.height)||0;
  const posLat=CENTER.lat-(minZ+maxZ)*.5/M_PER_DEG_LAT;
  const affluent=(posLat>23.784 && posLat<23.801);
  const height=clamp(taggedHeight||floors*3.2||rand(affluent?12:7,affluent?58:35,id),3.8,affluent?132:95);
  const ix=Math.floor(hash(id)*buildingMaterials.length);
  try{
   const shape=new T.Shape(distinct.map(p=>new T.Vector2(p.x,-p.z)));
   const g=new T.ExtrudeGeometry(shape,{depth:height,steps:1,bevelEnabled:false,curveSegments:1});g.rotateX(-Math.PI/2);
   const m=new T.Mesh(g,[roofMaterials[ix],buildingMaterials[ix]]);m.castShadow=count<240;m.receiveShadow=true;scene.add(m);cityObjects.push(m);count++;
   renderedBuildings.push(b);
   collisionShapes.push({minX,maxX,minZ,maxZ,points:distinct});
   if(hash(id+99)>.75&&height>12&&count<650){const roof=box(Math.min(5,(maxX-minX)*.35),1.5,Math.min(5,(maxZ-minZ)*.35),paint(0x777d7b),.5*(minX+maxX),height+.75,.5*(minZ+maxZ));scene.add(roof);cityObjects.push(roof)}
   if(hash(id+11)>.8){const tank=cylinder(.9,.9,2,paint(0x373d41),.5*(minX+maxX),height+1,.5*(minZ+maxZ),10);scene.add(tank);cityObjects.push(tank)}
   // Ground-floor commercial detail and parapets on a bounded near-field sample.
   if(count<230&&height>11&&(maxX-minX)>7&&(maxZ-minZ)>8){
     const frontWidth=Math.min(maxX-minX-1.4,17);
     if(frontWidth>5&&hash(id+69)>.26){
       const shopGlass=box(frontWidth,2.6,.12,new T.MeshPhysicalMaterial({color:0x29434e,metalness:.28,roughness:.2,clearcoat:.7}),.5*(minX+maxX),1.55,minZ-.1);
       scene.add(shopGlass);cityObjects.push(shopGlass);
       const header=box(frontWidth+.45,.45,.7,paint(hash(id+4)>.5?0x394956:0x735342,.73),.5*(minX+maxX),3.18,minZ-.55);
       scene.add(header);cityObjects.push(header);
       const pillar=box(.34,3.2,.45,paint(0xb3ada0),minX+1.2,1.6,minZ-.38);
       scene.add(pillar);cityObjects.push(pillar);
     }
     if(hash(id+14)>.6){
       const parapet=box(Math.min(30,maxX-minX),.62,.38,paint(0x989b99),.5*(minX+maxX),height+.32,minZ+.4);
       scene.add(parapet);cityObjects.push(parapet);
     }
   }
  }catch(err){}
 }
 return count;
}
function treesAlongPark(poly,id){let n=0;const cx=poly.reduce((a,p)=>a+p.x,0)/poly.length,cz=poly.reduce((a,p)=>a+p.z,0)/poly.length;
 for(let i=0;i<poly.length-1;i++){const a=poly[i],b=poly[i+1],len=Math.hypot(b.x-a.x,b.z-a.z);const num=Math.min(5,Math.floor(len/24));
  for(let j=0;j<num;j++){if(n>130)return;n++;let t=(j+.3)/num,xx=lerp(a.x,b.x,t),zz=lerp(a.z,b.z,t);addTree(xx*.92+cx*.08,zz*.92+cz*.08,hash(id+i*50+j));}
 }
}
function oldProceduralTree(x,z,r){const size=3.5+r*4;
 const trunk=cylinder(.35,.52,size,paint(0x514537),x,size/2,z,7);trunk.castShadow=true;scene.add(trunk);cityObjects.push(trunk);
 for(let j=0;j<3;j++){const canopy=new T.Mesh(new T.IcosahedronGeometry(size*(.47+hash(j+r)*.19),2),new T.MeshStandardMaterial({color:new T.Color().setHSL(.31+hash(r+j)*.04,.19,.19+hash(r+j*3)*.06),roughness:1}));canopy.position.set(x+(j-1)*size*.23,size+j*.45+size*.25,z+(hash(r+j*13)-.5)*size*.25);canopy.castShadow=true;scene.add(canopy);cityObjects.push(canopy)}
}
function addTree(x,z,r){createGroundedTree(T,scene,x,z,r);}
function createParksAndWaters(){
 const gmat=new T.MeshStandardMaterial({color:0x476445,roughness:1}),wmat=new T.MeshPhysicalMaterial({color:0x415b5b,roughness:.26,metalness:.27,clearcoat:.7,clearcoatRoughness:.17});
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
   if(c%8===0&&cityLights.length<16){const glow=new T.PointLight(0xffc78e,0,34,2);glow.position.set(x+2.05,7.3,z);scene.add(glow);cityLights.push(glow);}
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
 if(!isBus&&!isCng){
  const grille=new T.MeshStandardMaterial({color:0x1b252e,roughness:.35,metalness:.55}),chrome=paint(0x93999b,.25,.75);
  car.add(box(w*.54,.24,.055,grille,0,.75,long/2+.05));
  for(const side of [-1,1]){
    car.add(box(.25,.11,.32,dark,side*w*.52,1.47,.57)); // wing mirrors
    car.add(box(.075,.33,long*.34,chrome,side*w*.48,.76,-.38)); // sills
    car.add(box(.12,.12,long*.55,dark,side*w*.51,.52,-.1));
    car.add(box(.19,.26,.06,lamp,side*w*.34,.98,long/2+.11));
    car.add(box(.2,.19,.06,brake,side*w*.34,.92,-long/2-.11));
   }
   car.add(box(w*.67,.19,.16,grille,0,.50,long/2+.07)); // lower bumper intake
   car.add(box(w*.7,.11,.17,chrome,0,.57,-long/2-.08)); // rear bumper
   car.add(box(.43,.14,.045,chrome,0,.72,-long/2-.18)); // rear plate
 }
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
 let spawn=game.savedPosition&&Math.hypot(game.savedPosition.x,game.savedPosition.z)<2000?game.savedPosition:geo(23.79075,90.40503);
 spawn=findNearestRoad(spawn.x,spawn.z);
 player={x:spawn.x,z:spawn.z,yaw:spawn.yaw};carYaw=spawn.yaw;
 person=makeCharacter();person.position.set(player.x,0,player.z);person.rotation.y=player.yaw;scene.add(person);
 userCar=makeCar(0x414e56);userCar.position.set(spawn.x+6,0,spawn.z+5);userCar.rotation.y=spawn.yaw;scene.add(userCar);
 parkedCars.push({object:userCar,type:'SEDAN'});
 // Parked cars near recognizable district anchors can be boarded as well.
 for(let i=0;i<DISTRICTS.length;i++){
   const d=DISTRICTS[i],p=geo(d.lat,d.lon),near=findNearestRoad(p.x+24,p.z+18);
   const parked=makeCar(randomCarColor(i+2),i===2?'cng':'sedan');
   parked.position.set(near.x+Math.cos(near.yaw)*3.2,0,near.z-Math.sin(near.yaw)*3.2);
   parked.rotation.y=near.yaw;scene.add(parked);
   parkedCars.push({object:parked,type:parked.userData.kind.toUpperCase()});
 }
 const valid=trafficRoutes.filter(r=>polylineLength(r.points)>38&&r.width>4.5);const count=Math.min(44,valid.length);
 for(let i=0;i<count;i++){
  const path=valid[(i*23+7)%valid.length];const type=i%12===0?'bus':i%9===0?'cng':'sedan';const car=makeCar(randomCarColor(i),type);
  const length=polylineLength(path.points);traffic.push({object:car,path,progress:hash(i+17)*length,length,speed:(type==='bus'?4:type==='cng'?5.4:7)+hash(i)*3,forward:i%2===0?1:-1,stopCooldown:6+hash(i+9)*23,stoppedFor:i%11===0?4+hash(i)*4:0,actualSpeed:0});scene.add(car);
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
 const district=DISTRICTS.find(d=>d.id===game.mission.area);
 const desired=geo(district.lat,district.lon);
 return findNearestRoad(desired.x,desired.z);
}
function setMission(){
 routeInfo=null;
 roadRouter&&(roadRouter.last=null);
 missionTarget=pickMission();
 if(missionMarker)scene.remove(missionMarker);
 missionMarker=new T.Group();
 const ring=new T.Mesh(new T.TorusGeometry(3.3,.19,10,48),new T.MeshBasicMaterial({color:0xf1b45b}));ring.rotation.x=Math.PI/2;ring.position.y=.24;missionMarker.add(ring);missionHalo=ring;
 const cone=new T.Mesh(new T.ConeGeometry(2,5,4),new T.MeshBasicMaterial({color:0xffc17c,transparent:true,opacity:.67}));cone.rotation.z=Math.PI;cone.position.y=8.5;missionMarker.add(cone);
 const pillar=new T.Mesh(new T.CylinderGeometry(1.25,1.25,15,16,1,true),new T.MeshBasicMaterial({color:0xeead54,transparent:true,opacity:.16,side:T.DoubleSide,depthWrite:false}));pillar.position.y=7.5;missionMarker.add(pillar);
 missionMarker.position.set(missionTarget.x,0,missionTarget.z);scene.add(missionMarker);
 $('missionDetail').textContent=game.mission.brief;
 $('missionTitle').textContent=game.mission.title;
 refreshGameplayHUD();
}
function addRain(){
 const n=3500,rng=new Float32Array(n*3);for(let i=0;i<n;i++){rng[i*3]=(hash(i+3)-.5)*135;rng[i*3+1]=hash(i*1.3+4)*45+1;rng[i*3+2]=(hash(i*2+5)-.5)*135;}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(rng,3));const m=new T.PointsMaterial({color:0xc9d8e3,size:.14,transparent:true,opacity:.65,depthWrite:false});rainMesh=new T.Points(g,m);rainPositions=rng;rainMesh.visible=false;scene.add(rainMesh);
}
async function fetchRealDhaka(){
 const bbox=BBOX.join(',');
 // Roads throughout the three-zone area; building outlines focused around
 // game districts to avoid a huge, unstable, citywide browser data transfer.
 const query=`[out:json][timeout:38];(way["highway"](${bbox});way["building"](23.786,90.398,23.798,90.419);way["building"](23.775,90.393,23.785,90.405);way["building"](23.792,90.409,23.8005,90.4205);way["building"](23.777,90.411,23.785,90.423);way["leisure"="park"](${bbox});way["landuse"="grass"](${bbox});way["natural"="water"](${bbox}););out geom;`;
 const hosts=['https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter','https://overpass-api.de/api/interpreter'];
 let error;
 for(const host of hosts){
  const controller=new AbortController(),tm=setTimeout(()=>controller.abort(),14500);
  try{
   const r=await fetch(host+'?data='+encodeURIComponent(query),{method:'GET',signal:controller.signal,mode:'cors'});
   if(!r.ok)throw new Error('Overpass '+r.status);
   const json=await r.json();const data=parseOverpass(json);
   if(data.roads.length<30||data.buildings.length<10)throw new Error('Incomplete city data');
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
 // When Overpass is unavailable: a clearly marked approximation of the three
 // named districts, never mislabeled as precise OpenStreetMap geometry.
 const data={roads:[],buildings:[],parks:[],waters:[],source:'SIMULATED'};
 let id=1;
 const road=(label,coords,width=11)=>data.roads.push({id:id++,tags:{name:label,highway:width>12?'primary':'residential'},width,points:coords.map(([lat,lon])=>geo(lat,lon))});
 road('GULSHAN AVENUE',[[23.7797,90.4168],[23.7846,90.4152],[23.7903,90.4144],[23.7951,90.4139],[23.799,90.4148]],19);
 road('KAMAL ATATURK AVENUE',[[23.7885,90.396],[23.7890,90.402],[23.7915,90.406],[23.7949,90.4139]],17);
 road('BANANI MAIN ROAD',[[23.7738,90.3957],[23.7807,90.3955],[23.7867,90.3981],[23.7926,90.3998],[23.8001,90.399]],21);
 road('MOHAKHALI LINK',[[23.7765,90.3927],[23.77794,90.39848],[23.7816,90.4040],[23.7855,90.4119],[23.7897,90.4161]],16);
 road('GULSHAN LINK',[[23.78032,90.4168],[23.7820,90.4142],[23.788,90.4058],[23.79075,90.40503]],12);
 // Small side streets make the offline demo navigable. Their positions are
 // synthetic. Users can verify precise road geometry only in OSM live mode.
 for(const d of DISTRICTS){const anchor=geo(d.lat,d.lon);for(let j=-4;j<=4;j++){
   const x=anchor.x+j*76;
   data.roads.push({id:id++,tags:{highway:'residential'},width:7,points:[{x,z:anchor.z-440},{x,z:anchor.z+440}]});
   const z=anchor.z+j*78;
   data.roads.push({id:id++,tags:{highway:'residential'},width:7,points:[{x:anchor.x-440,z},{x:anchor.x+440,z}]});
 }}
 for(const d of DISTRICTS){const c=geo(d.lat,d.lon);for(let i=-4;i<=4;i++)for(let j=-4;j<=4;j++){
  if(Math.abs(i)<1&&Math.abs(j)<1)continue;
  const x=c.x+i*78+37,z=c.z+j*78+35;
  const ww=21+hash(id)*19,dd=20+hash(id+17)*20;
  const points=[{x:x-ww/2,z:z-dd/2},{x:x+ww/2,z:z-dd/2},{x:x+ww/2,z:z+dd/2},{x:x-ww/2,z:z+dd/2},{x:x-ww/2,z:z-dd/2}];
  data.buildings.push({id:id++,tags:{'building:levels':String(Math.floor(rand(4,d.id==='gulshan'?27:15,id+3)))},points});
 }}
 // Simulated waterway to keep the fallback scenic; not sourced map geometry.
 const waterStart=geo(23.786,90.408),wx=waterStart.x,wz=waterStart.z;
 data.waters.push({id:id++,points:[{x:wx-70,z:wz-450},{x:wx+20,z:wz-450},{x:wx+55,z:wz+350},{x:wx-65,z:wz+350},{x:wx-70,z:wz-450}]});
 return data;
}

function makeLandmarkBillboard(title) {
 const c=document.createElement('canvas');c.width=700;c.height=145;
 const ctx=c.getContext('2d');
 ctx.fillStyle='rgba(6,17,29,.92)';ctx.fillRect(3,3,694,139);
 ctx.strokeStyle='#f1b35f';ctx.lineWidth=4;ctx.strokeRect(5,5,690,135);
 ctx.fillStyle='#f5c57f';ctx.font='700 29px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('DHAKA · BANGLADESH',350,42);
 ctx.fillStyle='#eff4f6';ctx.font='700 44px Arial';ctx.fillText(title,350,97);
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
 const marker=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
 marker.scale.set(62,13,1);return marker;
}
function createDistrictMarkers(){
 for(const d of DISTRICTS){
  const p=geo(d.lat,d.lon),pos=findNearestRoad(p.x,p.z);
  const group=new T.Group();group.position.set(pos.x,0,pos.z);
  const shaft=new T.Mesh(new T.CylinderGeometry(.12,.12,19,8),new T.MeshStandardMaterial({color:0xc6a169,metalness:.63,roughness:.3}));shaft.position.y=9.5;group.add(shaft);
  const sign=makeLandmarkBillboard(d.name);sign.position.set(0,24,0);group.add(sign);
  const halo=new T.Mesh(new T.TorusGeometry(4,.18,8,32),new T.MeshBasicMaterial({color:0xffc267}));halo.rotation.x=-Math.PI/2;halo.position.y=.35;group.add(halo);
  scene.add(group);districtMarkers.push(group);
 }
}
function nearestDistrict(x,z){
 let closest=DISTRICTS[0],least=Infinity;
 for(const d of DISTRICTS){const a=geo(d.lat,d.lon),dist=(x-a.x)**2+(z-a.z)**2;
   if(dist<least){least=dist;closest=d;}}
 return closest;
}
function jumpToDistrict(id){
 if(!state.playing||state.paused||state.loading)return;
 if(game.missionActive||game.wanted>0){toast('QUICK TRAVEL DISABLED DURING MISSIONS OR POLICE CHASE');return;}
 const d=DISTRICTS.find(d=>d.id===id);if(!d)return;
 const p=geo(d.lat,d.lon),near=findNearestRoad(p.x,p.z);
 if(state.inCar){userCar.position.set(near.x,0,near.z);carYaw=near.yaw;userCar.rotation.y=carYaw;carSpeed=0;}
 player.x=near.x;player.z=near.z;player.yaw=near.yaw;
 person.position.set(near.x,0,near.z);person.rotation.y=near.yaw;
 cameraYaw=near.yaw;
 camera.position.set(near.x+11,7,near.z-15);
 cameraTarget.set(near.x,1.7,near.z);
 $('district').textContent=d.name;
 toast('EXPLORING '+d.name+(state.realMap?' · OSM ROADS':' · SAMPLE LAYOUT'));
}
async function loadRealHuman(){
 $('characterStatus').textContent='LOADING RIGGED HUMAN MODEL';
 try {
  const module=await import('./human.js');
  const character=await module.makeAnimatedHuman(T);
  human=character;
  person.remove(person.children[person.children.length-1]); // optional fallback ground shadow
  while(person.children.length)person.remove(person.children[0]);
  person.add(human.model);
  $('characterStatus').textContent=character.label+' · IDLE / WALK / RUN';
  toast('TEXTURED HUMAN MODEL LOADED · WALK / RUN ANIMATIONS');
 }catch(err){
  console.warn('Rigged human unavailable, procedural placeholder used',err);
  humanLoadError=String(err?.message||err);
  $('characterStatus').textContent=humanFallbackLabel;
  toast('3D CHARACTER ASSET UNAVAILABLE · CHECK INTERNET');
 }
}
async function loadDetailedCars(){
 const list=[userCar,...parkedCars.map(v=>v.object),...traffic.map(v=>v.object)];
 const info=$('vehicleStatus');
 if(info)info.textContent='LOADING CC0 DETAILED VEHICLES...';
 try{
  highDetailVehicles=await installDetailedVehicles(T,list,message=>{
   if(info)info.textContent=message.toUpperCase();
   console.info('[Dhaka vehicle graphics]',message);
  });
 }catch(err){
  console.warn('Detailed models offline, keeping drivable fallback vehicles',err);
  if(info)info.textContent='DETAILED VEHICLES OFFLINE · GAME STILL PLAYABLE';
 }
}
async function setupWorld(){
 $('mapStatus').textContent='LOADING GULSHAN / BANANI / MOHAKHALI...';
 try{geometryMap=await fetchRealDhaka();state.realMap=true;$('mapStatus').textContent='REAL OSM ROAD NETWORK';toast('Gulshan, Banani & Mohakhali OSM street data loaded');}
 catch(err){console.warn('OSM unavailable, using clearly labeled sample scene:',err);geometryMap=proceduralFallback();state.realMap=false;$('mapStatus').textContent='MAP SERVICE OFFLINE · APPROXIMATE STREETS';$('district').textContent='3 DISTRICTS · SAMPLE SCENE';$('mapCredit').textContent='Approximate streets — NOT accurate; reload for OpenStreetMap.';}
 createParksAndWaters();addRoads();const buildings=createBuildings();addCityFurniture();
 if(state.realMap)roadNames=addNamedDhakaRoadSigns(T,scene,geometryMap.roads);
 spawnEntities();createDistrictMarkers();addRain();
 // Route across actual connected OSM street nodes when available (not a straight line).
 if(state.realMap)roadRouter=new StreetRouter(geometryMap);
 leafletViewer=createLiveDhakaMap({panel:$('bigMap'),container:$('leafletMap'),canvas:fullCanvas,credit:$('mapCredit'),onStatus:message=>{$('streetMapStatus').textContent=message;},toGeo:inverseGeo,districts:DISTRICTS});
 urban=setupStreetLife(T,scene,{makeCar,findNearestRoad,geo,anchors:DISTRICTS,collidesWithBuilding});
 refreshGameplayHUD();
 try{
  const stats=decorateBuildingFacades(T,scene,renderedBuildings,DISTRICTS,geo);
  const street=placeDhakaStreetDetails(T,scene,DISTRICTS,geo,findNearestRoad);
  console.info('Improved building facades and Dhaka street details',stats,street);
 }catch(err){console.warn('Extra city detail skipped: original buildings still available',err);}
 // External assets never block movement, entering the city, or map navigation.
 void loadDetailedCars();
 void loadReflectionEnvironment(T,scene,renderer).then(()=>{
  const node=$('environmentStatus');if(node)node.textContent='URBAN HDR REFLECTIONS ACTIVE';
 }).catch(error=>{
  console.warn('Urban HDR map unavailable; built-in lighting remains active',error);
  const node=$('environmentStatus');if(node)node.textContent='BUILT-IN LIGHTING · HDR OFFLINE';
 });
 // Start player-model loading immediately, without blocking city navigation.
 void loadRealHuman();
 state.loading=false;$('district').textContent=state.realMap?'BANANI / GULSHAN / MOHAKHALI':'BANANI / GULSHAN / MOHAKHALI · APPROXIMATE';
 if(state.realMap)console.info(`OSM city: ${geometryMap.roads.length} roads, ${buildings} 3D buildings`);
 drawMap(mapCtx,310,310,true);drawMap(fullCtx,920,660,false);
}
function onResize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}
function toggleMap(){
 state.largeMap=!state.largeMap;
 $('bigMap').classList.toggle('hidden',!state.largeMap);
 if(state.largeMap){
  drawMap(fullCtx,920,660,false);
  if(leafletViewer)void leafletViewer.open(player,missionTarget,routeInfo);
 }
}
function pause(v){state.paused=v;$('pause').classList.toggle('hidden',!v);if(v&&document.pointerLockElement)document.exitPointerLock()}
function handleKeyDown(e){const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys[k]=true;
 if(held[k])return;held[k]=true;
 if(k==='escape'){if(jobsOpen){closeJobs();return}if(state.largeMap){toggleMap();return}if(state.playing)pause(!state.paused);return}
 if(!state.playing||state.paused)return;
 if(k==='j'){toggleJobs();return;}
 if(jobsOpen){if(k==='n')startNextMission();return;}
 if(k==='n'){startNextMission();return;}
 if(k==='g'){garageAction(false);return;}
 if(k==='u'){garageAction(true);return;}
 if(k==='h'){clinicAction();return;}
 if(k==='k'){toast(game.save(player)?'PROGRESS SAVED ON THIS BROWSER':'BROWSER STORAGE UNAVAILABLE');return;}
 if(k==='b'){if(state.inCar)horn();return;}
 if(k==='x'){talkToPedestrian();return;}
 if(k==='c'){if(!state.inCar){crouched=!crouched;toast(crouched?'CROUCH MODE':'STANDING');}return;}
 if(k===' '&&!state.inCar&&jumpHeight===0){jumpVelocity=7.5;return;}
 if(k==='f'){startCarjacking();return;}
 if(k==='e')enterExitVehicle();
 if(k==='t'){state.night=!state.night;toast(state.night?'NIGHT MODE · DHAKA AFTER DARK':'GOLDEN HOUR · EVENING')}
 if(k==='r'){state.rain=!state.rain;rainMesh.visible=state.rain;$('weatherText').textContent=state.rain?'MONSOON RAIN':'CLEAR';toast(state.rain?'MONSOON WEATHER ENABLED':'SKIES CLEARED')}
 if(k==='v'){state.wideCamera=!state.wideCamera;toast(state.wideCamera?'WIDE CAMERA':'CLOSE FOLLOW CAMERA')}
 if(k==='m')toggleMap();
 if(k==='1')jumpToDistrict('gulshan');
 if(k==='2')jumpToDistrict('banani');
 if(k==='3')jumpToDistrict('mohakhali');
 if(k==='4')jumpToDistrict('gulshan1');
}

/* Street carjacking: F starts a 2.2s close-range interaction.
 * The occupied AI car stops, its driver runs away, and the player takes control.
 * This is fictional videogame behavior, not a simulation of real crime. */
function startCarjacking(){
 if(!state.playing||state.paused||state.loading||state.largeMap||jobsOpen)return;
 if(state.inCar){toast('EXIT YOUR CURRENT CAR BEFORE HIJACKING ANOTHER');return;}
 const result=carjacking.begin(player,traffic);
 toast(result.reason);
 $('carjackProgress')?.classList.toggle('hidden',!result.ok);
}
function updateCarjacking(dt){
 const had=!!carjacking.active;
 const status=carjacking.update(dt,{player,traffic,inCar:state.inCar});
 if(had){
  const fill=$('carjackFill');
  if(fill)fill.style.width=Math.round((status.progress||0)*100)+'%';
 }
 if(status.done){
  $('carjackProgress')?.classList.add('hidden');
  completeCarjack(status.record);
 }else if(status.cancelled){
  $('carjackProgress')?.classList.add('hidden');
  toast(status.reason);
 }else if(!carjacking.active){
  $('carjackProgress')?.classList.add('hidden');
 }
}
function completeCarjack(record){
 if(!record||state.inCar)return;
 const idx=traffic.indexOf(record);
 if(idx<0)return;
 traffic.splice(idx,1);
 const vehicle=record.object;
 launchEscapingDriver(vehicle);
 userCar=vehicle;state.inCar=true;person.visible=false;
 carSpeed=0;carYaw=vehicle.rotation.y;player.x=vehicle.position.x;player.z=vehicle.position.z;player.yaw=carYaw;
 person.position.set(player.x,0,player.z);
 crouched=false;jumpHeight=0;jumpVelocity=0;person.scale.y=1;
 game.carHealth=carDurability.get(vehicle)??100;
 vehicle.userData.stolen=true;
 game.registerCarjack();
 game.save(player);
 $('modeLabel').textContent=vehicle.userData.kind.toUpperCase()+' · STOLEN';
 refreshGameplayHUD();
 toast('CAR SNATCHED · DRIVER ESCAPED · ★★ POLICE ALERT');
}
function launchEscapingDriver(vehicle){
 const npc=makeCharacter();
 npc.scale.setScalar(.94);
 const angle=vehicle.rotation.y;
 npc.position.set(vehicle.position.x+Math.cos(angle)*2.4,0,vehicle.position.z-Math.sin(angle)*2.4);
 npc.rotation.y=angle;
 scene.add(npc);
 const awayX=npc.position.x-player.x,awayZ=npc.position.z-player.z;
 const length=Math.hypot(awayX,awayZ)||1;
 fleeingDrivers.push({model:npc,x:awayX/length,z:awayZ/length,time:0});
}
function updateFleeingDrivers(dt,elapsed){
 for(let i=fleeingDrivers.length-1;i>=0;i--){
  const driver=fleeingDrivers[i];
  driver.time+=dt;
  const npc=driver.model,speed=5.5;
  const nextX=npc.position.x+driver.x*speed*dt,nextZ=npc.position.z+driver.z*speed*dt;
  if(!collidesWithBuilding(nextX,nextZ))npc.position.set(nextX,Math.abs(Math.sin(elapsed*14))*.04,nextZ);
  npc.rotation.y=Math.atan2(driver.x,driver.z);
  const stride=Math.sin(elapsed*13+i)*.55;
  if(npc.userData.legs?.length>=2){npc.userData.legs[0].rotation.x=stride;npc.userData.legs[1].rotation.x=-stride;}
  if(npc.userData.arms?.length>=2){npc.userData.arms[0].rotation.x=-stride*.65;npc.userData.arms[1].rotation.x=stride*.65;}
  if(driver.time>8){scene.remove(npc);fleeingDrivers.splice(i,1);}
 }
}

// E enters parked/empty vehicles; F forcibly takes an occupied traffic vehicle.
function closestBoardableVehicle(){
 if(state.inCar)return null;
 let best=null,dist=14;
 const check=(vehicle,source,record)=>{
  const d=Math.hypot(vehicle.position.x-player.x,vehicle.position.z-player.z);
  if(d<dist){dist=d;best={vehicle,source,record,d};}
 };
 for(const p of parkedCars)check(p.object,'parked',p);
 // Occupied traffic is intentionally NOT boardable with E. Use carjacking F.
 return best;
}
function enterExitVehicle(){
 if(!state.inCar){
  if(carjacking.active){toast('FINISH OR MOVE AWAY TO CANCEL THE CARJACKING');return;}
  const near=closestBoardableVehicle();
  if(!near){toast('E: EMPTY PARKED CAR · F: SNATCH OCCUPIED TRAFFIC CAR');return;}
  const idx=parkedCars.indexOf(near.record);if(idx>=0)parkedCars.splice(idx,1);
  userCar=near.vehicle;state.inCar=true;player.x=userCar.position.x;player.z=userCar.position.z;
  carYaw=userCar.rotation.y;person.visible=false;carSpeed=0;
  crouched=false;jumpHeight=0;jumpVelocity=0;person.scale.y=1;
  game.carHealth=carDurability.get(userCar)??100;
  // Ordinary parked cars remain usable without a carjacking timer.
  toast('ENTERED '+userCar.userData.kind.toUpperCase()+' · ↑/↓ ACCELERATE · ←/→ STEER · E EXIT');
 }else{
  if(Math.abs(carSpeed)>1.4){toast('Stop the car before getting out');return;}
  state.inCar=false;person.visible=true;
  const sideX=Math.cos(carYaw)*3,sideZ=-Math.sin(carYaw)*3;
  player.x=userCar.position.x+sideX;player.z=userCar.position.z+sideZ;
  if(collidesWithBuilding(player.x,player.z)){player.x=userCar.position.x-sideX;player.z=userCar.position.z-sideZ;}
  person.position.set(player.x,0,player.z);person.rotation.y=carYaw;carSpeed=0;
  carDurability.set(userCar,game.carHealth);
  parkedCars.push({object:userCar,type:userCar.userData.kind.toUpperCase()});
  toast('EXITED VEHICLE · PRESS E NEAR ANY STOPPED CAR');
 }
 $('modeLabel').textContent=state.inCar?userCar.userData.kind.toUpperCase()+' · DRIVE':'ON FOOT';
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
 for(const t of traffic){
  if(t.snatching){t.stoppedFor=Math.max(t.stoppedFor,2.5);t.actualSpeed=0;continue;}
  t.stopCooldown-=dt;
  if(t.stoppedFor>0){t.stoppedFor=Math.max(0,t.stoppedFor-dt);t.actualSpeed=0;}
  else if(t.stopCooldown<=0){t.stoppedFor=3.8+hash(t.length+t.progress)*3.5;t.stopCooldown=17+hash(t.progress+t.length)*20;t.actualSpeed=0;}
  else {t.actualSpeed=t.speed;t.progress+=t.speed*dt*t.forward;}if(t.progress>t.length){t.progress=t.length;t.forward=-1}if(t.progress<0){t.progress=0;t.forward=1}
  let left=t.progress;const pts=t.path.points;let a=pts[0],b=pts[1]||pts[0];for(let i=1;i<pts.length;i++){
   const d=Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z);if(left<=d){a=pts[i-1];b=pts[i];break}left-=d;
  }
  const len=Math.max(.001,Math.hypot(b.x-a.x,b.z-a.z)),r=clamp(left/len,0,1),x=lerp(a.x,b.x,r),z=lerp(a.z,b.z,r);
  t.object.position.set(x,0,z);t.object.rotation.y=Math.atan2((b.x-a.x)*t.forward,(b.z-a.z)*t.forward);
 }
}
function updateControls(dt,elapsed){
 if(!state.playing||state.paused||state.largeMap||state.loading||jobsOpen)return;
 const fw=(keys['w']||keys['arrowup']?1:0)-(keys['s']||keys['arrowdown']?1:0);
 const strafe=(keys['d']||keys['arrowright']?1:0)-(keys['a']||keys['arrowleft']?1:0);
 if(state.inCar){
  const accel=(fw>0?17:fw<0?-23:-8*Math.sign(carSpeed))*(game.carHealth<=0?0:.38+game.carHealth*.0062);
  carSpeed+=accel*dt;
  if(game.carHealth<=0)carSpeed=0;
  carSpeed=clamp(carSpeed,-9,(keys['shift']?42:29)*(1+game.garageLevel*.14));
  if(!fw)carSpeed=Math.abs(carSpeed)<.08?0:carSpeed;
  if(keys[' '])carSpeed*=Math.pow(.80,dt*60);
  const steer=strafe;
  const steerFactor=clamp(Math.abs(carSpeed)/7,0,1);
  // Camera views vehicles from behind: increasing yaw is screen-left, so invert steering.
  carYaw=steerVehicleYaw(carYaw,steer,dt,carSpeed,steerFactor);
  const nx=userCar.position.x+Math.sin(carYaw)*carSpeed*dt,nz=userCar.position.z+Math.cos(carYaw)*carSpeed*dt;
  if(Math.abs(nx)<CITY_RADIUS&&Math.abs(nz)<CITY_RADIUS&&!collidesWithBuilding(nx,nz)){userCar.position.set(nx,0,nz);player.x=nx;player.z=nz;}
  else {if(Math.abs(carSpeed)>5&&impactCooldown<=0){registerImpact(Math.abs(carSpeed)*.8,false);impactCooldown=1.2;}carSpeed*=-.24;}
  checkTrafficImpact();
  userCar.rotation.y=carYaw;player.yaw=carYaw;
  if(!mouseDown)cameraYaw=smoothAngle(cameraYaw,carYaw,dt*1.75);
  walkSpeed=Math.abs(carSpeed)*3.6;
 }else{
  // Camera-right vector is (-cos(yaw), +sin(yaw)) in this third-person setup.
  const direction=cameraRelativeMove(cameraYaw,fw,strafe);
  let mx=direction.x,mz=direction.z;
  const mag=Math.hypot(mx,mz),speed=crouched?1.9:keys['shift']&&game.stamina>5?8.1:4.2;walkSpeed=mag?speed*3.6:0;
  if(mag>0){mx/=mag;mz/=mag;const nx=player.x+mx*speed*dt,nz=player.z+mz*speed*dt;
   if(Math.abs(nx)<CITY_RADIUS&&Math.abs(nz)<CITY_RADIUS&&!collidesWithBuilding(nx,nz)){player.x=nx;player.z=nz;}
   player.yaw=smoothAngle(player.yaw,Math.atan2(mx,mz),Math.min(1,dt*13));
  }
  person.position.set(player.x,0,player.z);person.rotation.y=player.yaw;
  const phase=elapsed*(keys['shift']?14:9),stride=mag?Math.sin(phase)*.67:0;person.userData.legs[0].rotation.x=stride;person.userData.legs[1].rotation.x=-stride;
  person.userData.arms[0].rotation.x=-stride*.72;person.userData.arms[1].rotation.x=stride*.72;
  jumpHeight+=jumpVelocity*dt;
  if(jumpHeight>0||jumpVelocity>0){jumpVelocity-=19*dt;if(jumpHeight<0){jumpHeight=0;jumpVelocity=0;}}
  else jumpHeight=0;
  person.scale.y=crouched?.76:1;
  person.position.y=jumpHeight+(human?0:Math.abs(stride)*.055);
  if(human)human.update(dt,mag>.05&&jumpHeight<.2,!!keys['shift']&&!crouched);
 }
 if(keys['q'])cameraYaw-=dt*1.65;
 if(keys['f'])cameraYaw+=dt*1.65;
 const dist=state.wideCamera?25:state.inCar?13:5.7;
 const height=state.wideCamera?14:state.inCar?6.4:3.7;
 sun.position.set(player.x-150,290,player.z-100);sun.target.position.set(player.x,0,player.z);const target=vec(player.x,state.inCar?1.8:crouched?1.15:1.62+jumpHeight*.3,player.z);
 cameraTarget.lerp(target,1-Math.exp(-dt*8));
 const dest=vec(target.x-Math.sin(cameraYaw)*dist,height,target.z-Math.cos(cameraYaw)*dist);
 camera.position.lerp(dest,1-Math.exp(-dt*4.4));camera.lookAt(cameraTarget);
 const kms=Math.round(walkSpeed);$('speed').textContent=String(kms).padStart(2,'0');$('speedBar').style.width=clamp(kms/145*100,0,100)+'%';
 const nearby=closestBoardableVehicle();
 const prompt=$('interactionPrompt');
 if(prompt){
   if(state.inCar){prompt.innerHTML='<b>E</b> EXIT VEHICLE <small>STOP FIRST</small>';prompt.classList.add('show');}
   else if(carjacking.active){prompt.innerHTML='<b>F</b> TAKING CAR <small>'+Math.round(carjacking.progress/carjacking.duration*100)+'% · STAY CLOSE</small>';prompt.classList.add('show');}
   else if(nearby){prompt.innerHTML='<b>E</b> ENTER '+nearby.vehicle.userData.kind.toUpperCase()+' <small>'+Math.ceil(nearby.d)+'m AWAY</small>';prompt.classList.add('show');}
   else if(carjacking.closest(player,traffic,9)){prompt.innerHTML='<b>F</b> SNATCH OCCUPIED CAR <small>2.2s · POLICE ALERT</small>';prompt.classList.add('show');}
   else if(urban?.nearestService(player)?.distance<22){const service=urban.nearestService(player).service;prompt.textContent=service.id==='garage'?'G REPAIR · U ENGINE UPGRADE — BANANI GARAGE':'H HEAL — MOHAKHALI CLINIC';prompt.classList.add('show');}
   else{const npc=pedestrians.find(p=>Math.hypot(p.object.position.x-player.x,p.object.position.z-player.z)<6);if(npc){prompt.textContent='X · TALK TO PEDESTRIAN';prompt.classList.add('show');}else prompt.classList.remove('show');}
 }
 // Calculate a path along the available OSM road network. A straight-line
 // bearing is only shown when live network data cannot produce a connected route.
 if(state.realMap&&roadRouter&&navTick++%35===0){
  routeInfo=roadRouter.route({x:player.x,z:player.z},missionTarget);
  leafletViewer?.sync({x:player.x,z:player.z},missionTarget,routeInfo);
 }
 const heading=routeInfo?.bearing??Math.atan2(missionTarget.x-player.x,missionTarget.z-player.z);
 const navArrow=$('navArrow'),navMeters=$('navMeters'),navStreet=$('navStreet');
 if(navArrow)navArrow.style.transform='rotate('+gpsArrowRotationDegrees(heading,cameraYaw)+'deg)';
 if(navMeters)navMeters.textContent=Math.ceil(routeInfo?.distance??Math.hypot(player.x-missionTarget.x,player.z-missionTarget.z))+' m';
 if(navStreet)navStreet.textContent=DISTRICTS.find(d=>d.id===game.mission.area).name;
 const district=nearestDistrict(player.x,player.z);
 $('district').textContent=district.name+(state.realMap?'':' · APPROX.');
 const gp=inverseGeo(player.x,player.z);$('coords').textContent=`${gp.lat.toFixed(5)}° N, ${gp.lon.toFixed(5)}° E`;
 const distance=Math.hypot(player.x-missionTarget.x,player.z-missionTarget.z);
 $('missionDistance').textContent=Math.ceil(routeInfo?.distance??distance)+' m '+(routeInfo?.roadBased?'BY ROAD':'STRAIGHT-LINE');
 if(distance<11&&game.missionActive){
  const result=game.completeMission({distance,inCar:state.inCar,stolenCar:!!(state.inCar&&userCar?.userData?.stolen)});
  if(result.ok){state.cash=game.cash;state.missionIndex=game.missionIndex;game.save(player);toast(result.reason);setMission();renderJobBoard();}
  else if(result.reason!==game._checkpointHint){game._checkpointHint=result.reason;toast(result.reason);}
 }else if(distance>20)game._checkpointHint=null;
 if(missionMarker){missionHalo.rotation.z+=dt*.65;missionMarker.children[1].position.y=8.2+Math.sin(elapsed*2)*.45;}
 if(rainMesh?.visible){rainMesh.position.set(player.x,0,player.z);const p=rainMesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++){p.array[i*3+1]-=dt*55;if(p.array[i*3+1]<0)p.array[i*3+1]+=45;}p.needsUpdate=true;
 }
}
function updateLighting(dt){
 const night=state.night;
 if(skyDome){skyDome.position.set(player?.x||0,0,player?.z||0);skyDome.material.uniforms.uNight.value=lerp(skyDome.material.uniforms.uNight.value,night?1:0,dt*.75);skyDome.material.uniforms.uRain.value=lerp(skyDome.material.uniforms.uRain.value,state.rain?1:0,dt*.75);}
 for(const light of cityLights)light.intensity=night?3.1:0;
 if(roadMaterial){roadMaterial.roughness=state.rain?.27:.9;roadMajorMaterial.roughness=state.rain?.27:.88;}
 const bg=new T.Color(night?0x071328:state.rain?0x65717b:0xaebbc5);
 scene.background.lerp(bg,.028);scene.fog.color.lerp(new T.Color(night?0x1b2b38:state.rain?0x76828c:0xa7b1b7),.032);
 hemi.intensity=lerp(hemi.intensity,night?.44:state.rain?1.08:1.55,dt*.9);
 sun.intensity=lerp(sun.intensity,night?.14:state.rain?.95:2.7,dt*.9);
 renderer.toneMappingExposure=lerp(renderer.toneMappingExposure,night?.75:state.rain?1.08:1.16,dt*.9);
 scene.fog.density=lerp(scene.fog.density,night?.00055:state.rain?.00066:.00043,dt*.7);
 $('timeText').textContent=night?'23:20':state.rain?'18:10':'17:40';
}
function drawMap(ctx,w,h,local){
 if(!ctx||!geometryMap.roads.length)return;
 ctx.save();ctx.clearRect(0,0,w,h);
 const center=local?inverseGeo(player.x,player.z):CENTER,zoom=local?15:14;
 const realTiles=tileRadar.draw(ctx,w,h,{lat:center.lat,lon:center.lon,zoom});
 if(!realTiles){ctx.fillStyle='#101d28';ctx.fillRect(0,0,w,h);}
 const px=local?player.x:0,pz=local?player.z:0;
 const scale=realTiles?metersToPixels(center.lat,zoom):(local?.24:Math.min(w/4900,h/3900));
 const ox=w/2,oy=h/2;
 const project=p=>[ox+(p.x-px)*scale,oy+(p.z-pz)*scale];
 if(!local){ctx.lineWidth=1;ctx.strokeStyle='#24323b';for(let i=-600;i<=600;i+=100){const a=project({x:i,z:-700}),b=project({x:i,z:700});ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();}}
 if(!realTiles)for(const park of geometryMap.parks){ctx.fillStyle='#2c4236';ctx.beginPath();park.points.forEach((p,i)=>{const [x,y]=project(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.fill()}
 if(!realTiles)for(const water of geometryMap.waters){ctx.fillStyle='#28505a';ctx.beginPath();water.points.forEach((p,i)=>{const [x,y]=project(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.fill()}
 ctx.lineCap='round';ctx.lineJoin='round';
 if(!realTiles)for(const r of geometryMap.roads){ctx.beginPath();for(let i=0;i<r.points.length;i++){let [x,y]=project(r.points[i]);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.strokeStyle='#4d606b';ctx.lineWidth=Math.max(1,r.width*scale);ctx.stroke();}
 if(!local&&!realTiles){ctx.fillStyle='#25343a';for(let i=0;i<geometryMap.buildings.length;i+=1){let b=geometryMap.buildings[i];ctx.beginPath();b.points.forEach((p,j)=>{let [x,y]=project(p);j?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.fill()}}
 for(const d of DISTRICTS){const pp=geo(d.lat,d.lon),[dx,dy]=project(pp);ctx.fillStyle='#eac285';ctx.beginPath();ctx.arc(dx,dy,3.8,0,Math.PI*2);ctx.fill();if(!local){ctx.fillStyle='#f5f6f7';ctx.font='bold 12px sans-serif';ctx.fillText(d.name,dx+9,dy-7)}}
 urban?.drawMinimap(ctx,project);
 // Solid blue shows a navigable route along connected OSM roads; the dashed
 // amber line is a bearing-only fallback, never misrepresented as a route.
 const routePoints=routeInfo?.roadBased?routeInfo.points:[{x:player.x,z:player.z},missionTarget];
 ctx.save();ctx.beginPath();ctx.setLineDash(routeInfo?.roadBased?[]:(local?[7,5]:[12,8]));
 ctx.strokeStyle=routeInfo?.roadBased?'#56b6fa':'#eab266';ctx.lineWidth=local?3:4;
 routePoints.forEach((p,i)=>{const [x,y]=project(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();ctx.restore();
 const [mx,my]=project(missionTarget);ctx.beginPath();ctx.fillStyle='#eab266';ctx.arc(mx,my,local?5:8,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.strokeStyle='#eab266';ctx.lineWidth=1;ctx.arc(mx,my,local?12:16,0,Math.PI*2);ctx.stroke();
 const [xx,yy]=project({x:player.x,z:player.z});ctx.save();ctx.translate(xx,yy);ctx.rotate(minimapArrowRotation(player.yaw));
 ctx.fillStyle='#91c9ed';ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(6,9);ctx.lineTo(0,5);ctx.lineTo(-6,9);ctx.closePath();ctx.fill();ctx.restore();
 if(!local){ctx.fillStyle='#dfe6e9';ctx.font='600 18px sans-serif';ctx.fillText('DHAKA · GULSHAN / BANANI / MOHAKHALI',25,33);ctx.fillStyle='#abb3b9';ctx.font='13px sans-serif';ctx.fillText(realTiles?'REAL OPENSTREETMAP TILES · '+(state.realMap?'3D OSM GEOMETRY':'3D APPROXIMATION'):state.realMap?(routeInfo?.roadBased?'OSM ROAD PATH':'OSM STREETS · BEARING ONLY'):'SIMULATED 3D MAP',25,53);}
 ctx.restore();
}
let mapTick=0;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),now=clock.elapsedTime;
 if(!state.paused&&!state.largeMap&&!state.loading&&!jobsOpen){
  updateControls(dt,now);
  if(state.playing){
   updateTraffic(dt);updatePedestrians(dt,now);
   updateCarjacking(dt);
   updateFleeingDrivers(dt,now);
   impactCooldown=Math.max(0,impactCooldown-dt);
   if(urban){policeState=urban.update(dt,{position:player,wanted:game.wanted,inCar:state.inCar,speed:carSpeed});
    if(policeState.busted)resetAfterArrest();}
   const tick=game.tick(dt,{inCar:state.inCar,policeDistance:policeState.policeDistance,sprinting:!!keys['shift'],moving:walkSpeed>1});
   if(tick.event){toast(tick.event);renderJobBoard();}
   if(++hudFrame%10===0)refreshGameplayHUD();
   game.autosaveRemaining-=dt;if(game.autosaveRemaining<=0){game.save(player);game.autosaveRemaining=15;}
  }
  updateLighting(dt);
  if(++mapTick%18===0)drawMap(mapCtx,310,310,true);
 }
 if(highDetailVehicles&&state.playing&&!state.paused&&!state.largeMap){
  highDetailVehicles.update(dt,state.inCar?userCar:null,carSpeed,traffic);
 }
 renderer.render(scene,camera);
}

/* STREET LIFE GAMEPLAY — independent mission, economy, and scene interaction. */
function refreshGameplayHUD(){
 const set=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
 const bar=(id,value)=>{const el=$(id);if(el)el.style.width=clamp(value,0,100)+'%';};
 bar('healthBar',game.health);bar('armorBar',game.armor);bar('staminaBar',game.stamina);bar('vehicleBar',game.carHealth);
 set('healthNum',Math.round(game.health));set('armorNum',Math.round(game.armor));
 set('staminaNum',Math.round(game.stamina));set('vehicleNum',Math.round(game.carHealth));
 set('wantedStars','★'.repeat(game.wanted)+'☆'.repeat(5-game.wanted));
 set('walletCash','৳ '+game.cash.toLocaleString());
 set('carSnatchCount',String(game.carSnatches||0));
 set('policeHint',game.wanted?'POLICE PURSUIT':'FREE ROAM');
 set('missionCredits','৳ '+game.cash.toLocaleString());
 set('missionTimer',String(Math.floor(game.remaining/60)).padStart(2,'0')+':'+String(game.remaining%60).padStart(2,'0'));
 set('missionStatus',game.missionActive?'ACTIVE':'PRESS N · START');
 if(!game.missionActive&&$('missionTitle'))$('missionTitle').textContent=game.mission.title;
}
function registerImpact(damage,raiseWanted){
 if(!state.inCar)return;
 game.vehicleDamage(damage);
 game.takeDamage(damage*.17);
 carDurability.set(userCar,game.carHealth);
 if(raiseWanted)game.addWanted(1,'vehicle collision');
 toast(game.carHealth<=0?'ENGINE DISABLED · EXIT THE CAR':'VEHICLE IMPACT · HEALTH '+Math.round(game.carHealth)+'%');
 if(game.health<=0)resetAfterArrest();
}
function checkTrafficImpact(){
 if(!state.inCar||impactCooldown>0||Math.abs(carSpeed)<6)return;
 const near=(obj)=>Math.hypot(obj.position.x-userCar.position.x,obj.position.z-userCar.position.z);
 for(const t of traffic){if(near(t.object)<3.65){registerImpact(13+Math.abs(carSpeed)*.75,true);carSpeed*=-.22;impactCooldown=1.4;return;}}
 for(const p of urban?.police||[]){if(p.active&&near(p.car)<3.65){registerImpact(16+Math.abs(carSpeed)*.8,true);carSpeed*=-.3;impactCooldown=1.4;return;}}
}
function resetAfterArrest(){
 const wasInCar=state.inCar;
 const event=game.registerBusted();
 if(wasInCar){carDurability.set(userCar,100);parkedCars.push({object:userCar,type:userCar.userData.kind.toUpperCase()});}
 state.inCar=false;person.visible=true;carSpeed=0;impactCooldown=2;
 const p=geo(23.79075,90.40503),near=findNearestRoad(p.x,p.z);
 player.x=near.x;player.z=near.z;player.yaw=near.yaw;
 person.position.set(near.x,0,near.z);person.rotation.y=near.yaw;cameraYaw=near.yaw;
 camera.position.set(near.x+9,7,near.z-14);cameraTarget.set(near.x,1.7,near.z);
 setMission();refreshGameplayHUD();toast(event);
}
function garageAction(upgrade=false){
 const near=urban?.nearestService(player,'garage');
 if(!near||near.distance>near.service.radius){toast('FIND THE VIOLET BANANI GARAGE MARKER FIRST');return;}
 if(!state.inCar){toast('ENTER A CAR TO USE THIS GARAGE');return;}
 if(Math.abs(carSpeed)>1.8){toast('STOP THE VEHICLE BEFORE USING THE GARAGE');return;}
 const result=upgrade?game.upgrade():game.repair();
 if(result.ok)carDurability.set(userCar,game.carHealth);
 toast(result.reason);refreshGameplayHUD();
}
function clinicAction(){
 const near=urban?.nearestService(player,'clinic');
 if(!near||near.distance>near.service.radius){toast('FIND THE GREEN MOHAKHALI CLINIC MARKER FIRST');return;}
 if(state.inCar){toast('EXIT YOUR CAR TO VISIT THE CLINIC');return;}
 const result=game.clinic();toast(result.reason);refreshGameplayHUD();
}
function startNextMission(){
 if(game.missionActive){toast('COMPLETE OR FAIL THE CURRENT JOB FIRST');return;}
 const event=game.startMission();setMission();refreshGameplayHUD();closeJobs();toast(event);
}
function renderJobBoard(){
 const list=$('jobList');if(!list)return;
 const current=game.missionIndex%MISSIONS.length;
 list.innerHTML=MISSIONS.map((m,i)=>{
  const status=i===current?'CURRENT JOB':i<Math.min(game.completed,MISSIONS.length)?'COMPLETE':'UPCOMING';
  return '<div class="jobrow '+(i===current?'current':i>current?'locked':'')+'"><span class="number">'+String(i+1).padStart(2,'0')+'</span><div><strong>'+m.title+'</strong><small>'+m.brief+'</small></div><div class="reward">৳'+m.reward.toLocaleString()+'<small>'+status+'</small></div></div>';
 }).join('');
 $('startJob').textContent=game.missionActive?'MISSION IN PROGRESS':'N · START / RETRY';
}
function closeJobs(){jobsOpen=false;$('jobBoard').classList.add('hidden');}
function toggleJobs(){jobsOpen=!jobsOpen;$('jobBoard').classList.toggle('hidden',!jobsOpen);if(jobsOpen)renderJobBoard();}
function talkToPedestrian(){
 if(state.inCar){toast('EXIT YOUR VEHICLE TO TALK');return;}
 let nearest=null,d=7;
 for(let i=0;i<pedestrians.length;i++){
  const p=pedestrians[i],distance=Math.hypot(p.object.position.x-player.x,p.object.position.z-player.z);
  if(distance<d){d=distance;nearest=i;}
 }
 if(nearest===null){toast('MOVE NEAR A PEDESTRIAN AND PRESS X');return;}
 const lines=[
  'DHAKA LOCAL: Banani Road 11 is always busy this evening.',
  'DHAKA LOCAL: Heard there are jobs around the district. Press J.',
  'DHAKA LOCAL: Mohakhali traffic can get serious. Drive carefully.',
  'DHAKA LOCAL: You can visit the garage to repair a damaged car.',
  'DHAKA LOCAL: Try the Gulshan circle. The city looks great at night.'
 ];
 toast(lines[nearest%lines.length]);
}
function horn(){
 try{
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return;
  const ac=horn.context||(horn.context=new AC()),osc1=ac.createOscillator(),osc2=ac.createOscillator(),gain=ac.createGain();
  osc1.type='sawtooth';osc2.type='sawtooth';osc1.frequency.value=185;osc2.frequency.value=233;
  const t=ac.currentTime;gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.055,t+.025);gain.gain.exponentialRampToValueAtTime(.0001,t+.35);
  osc1.connect(gain);osc2.connect(gain);gain.connect(ac.destination);osc1.start(t);osc2.start(t);osc1.stop(t+.37);osc2.stop(t+.37);
 }catch(e){console.warn('Audio unavailable',e);}
}

function bindUI(){
 // On-screen directional buttons support mouse and touch. The same input powers
 // the actual 3D movement/steering simulation (not decorative UI).
 document.querySelectorAll('[data-control]').forEach(btn=>{
   const key=btn.dataset.control;
   const release=e=>{e.preventDefault();keys[key]=false;held[key]=false;btn.classList.remove('pressed');};
   btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture?.(e.pointerId);keys[key]=true;held[key]=true;btn.classList.add('pressed');});
   btn.addEventListener('pointerup',release);
   btn.addEventListener('pointercancel',release);
   btn.addEventListener('lostpointercapture',release);
 });
 $('touchAction')?.addEventListener('click',()=>{if(state.playing&&!state.paused&&!jobsOpen)enterExitVehicle();});
 $('touchHijack')?.addEventListener('click',()=>{if(state.playing&&!state.paused&&!jobsOpen&&!state.largeMap)startCarjacking();});
 $('touchJump')?.addEventListener('pointerdown',event=>{
  event.preventDefault();
  event.currentTarget.setPointerCapture?.(event.pointerId);
  if(!state.playing||state.paused||jobsOpen||state.largeMap)return;
  if(state.inCar){keys[' ']=true;return;}
  if(jumpHeight===0)jumpVelocity=7.5;
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])$('touchJump')?.addEventListener(type,()=>{keys[' ']=false;});
 $('touchInteract')?.addEventListener('click',()=>{
  if(!state.playing||state.paused||jobsOpen)return;
  const close=urban?.nearestService(player);
  if(close&&close.distance<close.service.radius){
   if(close.service.id==='garage')garageAction(false);else clinicAction();
  }else talkToPedestrian();
 });
 $('play').onclick=()=>{if(state.loading){toast('Map is still loading');return}state.playing=true;$('intro').classList.add('hidden');refreshGameplayHUD();toast('FREE ROAM · N STARTS A JOB · J OPENS THE MISSION BOARD')};
 $('resume').onclick=()=>pause(false);$('restart').onclick=()=>location.reload();$('retry').onclick=()=>location.reload();$('closeMap').onclick=toggleMap;
 $('recenterMap')?.addEventListener('click',()=>leafletViewer?.recenter(player));
 $('openJobs')?.addEventListener('click',toggleJobs);
 $('closeJobs')?.addEventListener('click',closeJobs);
 $('startJob')?.addEventListener('click',startNextMission);
 window.addEventListener('beforeunload',()=>{if(player&&state.playing)game.save(player)});
 document.addEventListener('keydown',handleKeyDown);document.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;held[e.key.toLowerCase()]=false});
 document.addEventListener('blur',()=>{for(const k in keys)keys[k]=false;for(const k in held)held[k]=false});
 $('world').addEventListener('mousedown',e=>{if(e.button===0)mouseDown=true;mousePrevX=e.clientX});
 document.addEventListener('mouseup',()=>mouseDown=false);
 document.addEventListener('mousemove',e=>{if(mouseDown&&state.playing&&!state.paused){cameraYaw-=(e.clientX-mousePrevX)*.005;mousePrevX=e.clientX}});
 $('minimapWrap').onclick=()=>{if(state.playing)toggleMap()};
 document.querySelectorAll('[data-district]').forEach(btn=>btn.addEventListener('click',()=>jumpToDistrict(btn.dataset.district)));
}
try{initThree();bindUI();animate();await setupWorld();$('play').disabled=false;}
catch(err){console.error('World setup failed',err);$('mapStatus').textContent='SCENE ERROR';$('intro').classList.add('hidden');$('fatal').classList.remove('hidden');$('fatalText').textContent=String(err?.stack||err);}