/* Dhaka After Dark — CC0 road vehicle visuals.
 * The logical vehicle Group and driving system remain unchanged: only its mesh
 * children are replaced after all necessary glTF geometry has loaded.
 * Fallback cars stay visible when network/CDN access fails.
 *
 * CC0 vehicle assets from https://3dassets.dev (see README.md for model pages).
 * Do NOT call this method with raw model filenames from user input.
 */
const GLTF_MODULE='https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/loaders/GLTFLoader.js';
const ASSETS={
  sedan:{url:'https://cdn.3dassets.dev/assets/18684/v1/model.glb',length:5.20,targetLength:4.55},
  suv:{url:'https://cdn.3dassets.dev/assets/18686/v1/model.glb',length:5.05,targetLength:4.75},
  bus:{url:'https://cdn.3dassets.dev/assets/34194/v1/model.glb',length:12.14,targetLength:9.5},
  cng:{url:'https://cdn.3dassets.dev/assets/36560/v1/model.glb',length:2.634,targetLength:3.0}
};
function getVariant(group,index){
  const kind=group.userData.kind;
  if(kind==='bus'||kind==='cng')return kind;
  return index%7===2?'suv':'sedan';
}
export async function installDetailedVehicles(THREE,vehicleGroups,onStatus=()=>{}){
  const unique=Array.from(new Set(vehicleGroups)).filter(v=>v?.isGroup&&v.userData?.kind);
  if(!unique.length)return {loaded:0,failed:[],update:()=>{}};
  let GLTFLoader;
  try{
    ({GLTFLoader}=await import(GLTF_MODULE));
  }catch(e){onStatus('Detailed vehicle loader offline · driving fallback active');return {loaded:0,failed:Object.keys(ASSETS),update:()=>{}};}
  const loader=new GLTFLoader();
  const loaded={};
  const failed=[];
  await Promise.all(Object.entries(ASSETS).map(async ([type,data])=>{
    try{
      const model=await Promise.race([
        loader.loadAsync(data.url),
        new Promise((_,reject)=>setTimeout(()=>reject(new Error('vehicle asset timeout')),12000))
      ]);
      if(!model?.scene)throw Error('Empty vehicle scene');
      loaded[type]=model;
    }catch(error){
      failed.push(type);
      console.warn('[Vehicles] Could not load',type,error);
    }
  }));
  const activeAnimations=[];
  let installed=0;
  for(let i=0;i<unique.length;i++){
    const car=unique[i],variant=getVariant(car,i),gltf=loaded[variant];
    if(!gltf)continue; // Original procedural vehicle stays fully functional.
    const source=ASSETS[variant];
    const visual=gltf.scene.clone(true);
    visual.scale.setScalar(source.targetLength/source.length);
    // Asset metadata: +Y up, ground baseline y=0, front faces +Z.
    visual.position.y=0;
    visual.traverse(part=>{
      if(part.isMesh){
        part.castShadow=i<20;
        part.receiveShadow=i<20;
        part.frustumCulled=true;
        const mats=Array.isArray(part.material)?part.material:[part.material];
        for(const mat of mats){if(mat&&'envMapIntensity' in mat)mat.envMapIntensity=.85;}
      }
    });
    // Hide placeholders only when the licensed GLB has successfully loaded.
    car.children.forEach(child=>child.visible=false);
    car.add(visual);
    car.userData.visualQuality='CC0 GLB: '+variant;
    installed++;
    // Wheel animation is limited to 20 nearer/high-priority cars to reduce CPU.
    if(activeAnimations.length<20){
      const clip=gltf.animations?.find(clip=>/wheel|roll/i.test(clip.name));
      if(clip){
        const mixer=new THREE.AnimationMixer(visual);
        mixer.clipAction(clip).play();
        activeAnimations.push({car,mixer});
      }
    }
  }
  onStatus(installed+' detailed GLB cars active'+(failed.length?' · fallback: '+failed.join(', '):''));
  return {
    loaded:installed,failed,
    update(dt,playerCar,playerSpeed,traffic){
      const moving=new Map(traffic.map(t=>[t.object,Math.abs(t.actualSpeed??t.speed)]));
      for(const item of activeAnimations){
        const v=item.car===playerCar?Math.abs(playerSpeed):moving.get(item.car)||0;
        if(v>.05)item.mixer.update(Math.min(.08,dt)*Math.max(.2,v/6));
      }
    }
  };
}
