/* Animated human character for the Dhaka After Dark prototype.
   Soldier.glb is a textured, rigged, human-proportioned reference model from the
   three.js example library, with Idle, Walk and Run clips.
   It is NOT a photorealistic GTA-quality character. The basic procedural player
   remains only as an explicit offline/model-loading fallback.
 */
const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.187.0';
const SOURCES = [
  'https://threejs.org/examples/models/gltf/Soldier.glb',
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/models/gltf/Soldier.glb'
];
export async function makeAnimatedHuman(THREE) {
  const { GLTFLoader } = await import(`${THREE_CDN}/examples/jsm/loaders/GLTFLoader.js`);
  const loader = new GLTFLoader();
  let gltf, lastError;
  for (const url of SOURCES) {
    try {
      gltf = await Promise.race([
        loader.loadAsync(url),
        new Promise((_, reject) => setTimeout(() => reject(new Error('3D model load timeout')), 12000))
      ]);
      break;
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
  // The bundled animation model faces +Z after this turn.
  model.rotation.y = Math.PI;
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