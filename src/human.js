/* Animated civilian — "Casual Man" by vinish.dev (CC BY 4.0).
   https://vinish.dev/free-3d-models/people — imported as an external GLB.
   Fallback is the Three.js Soldier example, then a procedural character.
   All characters and locations are independent of GTA intellectual property.
 */
const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.187.0';
const SOURCES = [
  {url:'https://models.vinish.dev/people/casual-man.glb',title:'CASUAL CIVILIAN · CC BY 4.0',turn:0},
  {url:'https://models.vinish.dev/people/business-man.glb',title:'BUSINESS CIVILIAN · CC BY 4.0',turn:0},
  {url:'https://threejs.org/examples/models/gltf/Soldier.glb',title:'SOLDIER EXAMPLE FALLBACK',turn:Math.PI},
  {url:'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/models/gltf/Soldier.glb',title:'SOLDIER EXAMPLE FALLBACK',turn:Math.PI}
];
export async function makeAnimatedHuman(THREE) {
  const { GLTFLoader } = await import(`${THREE_CDN}/examples/jsm/loaders/GLTFLoader.js`);
  const loader = new GLTFLoader();
  let gltf, lastError, selected;
  for (const source of SOURCES) {
    try {
      gltf = await Promise.race([
        loader.loadAsync(source.url),
        new Promise((_, reject) => setTimeout(() => reject(new Error('3D model load timeout')), 12000))
      ]);
      selected=source;break;
    } catch (e) { lastError = e; }
  }
  if (!gltf) throw lastError || Error('Unable to load the rigged human model');
  const model = gltf.scene;
  const bounds = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3(); bounds.getSize(size);
  if (!(size.y > 0)) throw Error('Invalid 3D model dimensions');
  model.scale.setScalar(1.88 / size.y);
  model.updateMatrixWorld(true);
  const corrected = new THREE.Box3().setFromObject(model);
  model.position.y -= corrected.min.y;
  model.rotation.y = selected.turn;
  model.traverse(obj => {
    if (obj.isMesh || obj.isSkinnedMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      if (obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const material of materials) {
          if (material && 'roughness' in material) material.roughness = Math.max(.58, material.roughness || 0);
        }
      }
    }
  });
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const clip of gltf.animations) {
    const key = clip.name.toLowerCase();
    if (key.includes('idle')) actions.idle = mixer.clipAction(clip);
    else if (key.includes('walk')) actions.walk = mixer.clipAction(clip);
    else if (key.includes('run')) actions.run = mixer.clipAction(clip);
  }
  if (!actions.idle || !actions.walk || !actions.run) throw Error('Human animation clips missing');
  let current = 'idle';
  actions[current].play();
  return {
    model,
    label:selected.title,
    sourceUrl:selected.url,
    update(dt, moving, sprinting) {
      const next = moving ? (sprinting ? 'run' : 'walk') : 'idle';
      if (next !== current) {
        actions[current].fadeOut(.2);
        actions[next].reset().fadeIn(.2).play();
        current = next;
      }
      mixer.update(dt);
    }
  };
}