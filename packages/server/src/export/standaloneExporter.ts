/**
 * Standalone Scene Exporter
 *
 * Generates a self-contained HTML file with embedded Three.js that renders the
 * full scene (objects, lights, camera, materials, animations, environment) in
 * any modern browser — no server, no chat overlay.
 */
import { SceneState } from '../types.js';

/**
 * Build a complete, standalone HTML file from a SceneState snapshot.
 * Uses the Three.js CDN and inlines the scene JSON.
 */
export function buildStandaloneHTML(state: SceneState): string {
  const sceneJson = JSON.stringify(state);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>maigeXR Scene Export</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0d0d1a;overflow:hidden;font-family:system-ui,sans-serif}
canvas{display:block;width:100vw;height:100vh}
#info{position:fixed;bottom:12px;left:12px;color:#8888aa;font-size:11px;opacity:0.7;pointer-events:none}
</style>
</head>
<body>
<div id="info">maigeXR Scene Export — Orbit: drag | Zoom: scroll</div>

<!-- Three.js from CDN (ES module) -->
<script type="importmap">
{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/"}}
</script>
<script type="module">
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

// ── Scene state (embedded at export time) ──
const STATE = ${sceneJson};

// ── Renderer ──
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = STATE.environment?.exposure ?? 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ── Scene ──
const scene = new THREE.Scene();
scene.background = new THREE.Color(STATE.environment?.background ?? '#1a1a2e');

// Fog
if (STATE.environment?.fog) {
  const f = STATE.environment.fog;
  scene.fog = new THREE.Fog(f.color, f.near, f.far);
}

// ── Procedural IBL ──
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene = new THREE.Scene();
  envScene.add(new THREE.HemisphereLight(0x8899bb,0x223344,2.0));
  const key = new THREE.DirectionalLight(0xffeedd,3.0);
  key.position.set(5,8,3);
  envScene.add(key);
  const fill = new THREE.DirectionalLight(0xaabbdd,1.0);
  fill.position.set(-3,4,-5);
  envScene.add(fill);
  scene.environment = pmrem.fromScene(envScene,0,0.1,100).texture;
  pmrem.dispose();
}

// ── Camera ──
const cam = STATE.camera ?? {position:{x:6,y:5,z:6},target:{x:0,y:0,z:0},fov:60};
const camera = new THREE.PerspectiveCamera(cam.fov??60,window.innerWidth/window.innerHeight,cam.near??0.1,cam.far??1000);
camera.position.set(cam.position.x,cam.position.y,cam.position.z);
camera.lookAt(cam.target?.x??0, cam.target?.y??0, cam.target?.z??0);

// ── Controls ──
const controls = new OrbitControls(camera,renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(cam.target?.x??0, cam.target?.y??0, cam.target?.z??0);

// ── Helpers ──
const toRad = d => d * Math.PI / 180;
const loader = new THREE.TextureLoader();
const objects = new Map();

function buildMaterial(m) {
  if (!m) m = {};
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(m.color ?? '#4488ff'),
    metalness: m.metalness ?? 0.1,
    roughness: m.roughness ?? 0.7,
    wireframe: m.wireframe ?? false,
    transparent: m.transparent ?? ((m.opacity??1) < 1),
    opacity: m.opacity ?? 1,
    envMapIntensity: 1.0,
  });
  if (m.emissive) { mat.emissive = new THREE.Color(m.emissive); mat.emissiveIntensity = m.emissiveIntensity ?? 1; }
  if (m.textureUrl) mat.map = loader.load(m.textureUrl);
  return mat;
}

function buildGeometry(def) {
  const w=def.width??1, h=def.height??1, d=def.depth??1, r=def.radius??0.5, seg=64;
  switch(def.type){
    case'sphere':return new THREE.SphereGeometry(r,seg,seg);
    case'cylinder':return new THREE.CylinderGeometry(def.radiusTop??r,def.radiusBottom??r,h,seg);
    case'cone':return new THREE.ConeGeometry(r,h,seg);
    case'torus':return new THREE.TorusGeometry(r,r*0.4,24,seg);
    case'plane':return new THREE.PlaneGeometry(w,h);
    case'capsule':return new THREE.CapsuleGeometry(r,h,8,seg);
    default:return new THREE.BoxGeometry(w,h,d);
  }
}

// ── Build lights ──
for (const l of Object.values(STATE.lights??{})) {
  let light;
  const c = new THREE.Color(l.color);
  switch(l.lightType) {
    case'ambient': light=new THREE.AmbientLight(c,l.intensity); break;
    case'hemisphere': light=new THREE.HemisphereLight(c,new THREE.Color(l.groundColor??'#362907'),l.intensity); break;
    case'point':{
      light=new THREE.PointLight(c,l.intensity,l.distance??0,l.decay??2);
      if(l.position) light.position.set(l.position.x,l.position.y,l.position.z);
      light.castShadow=!!l.castShadow;
      if(light.castShadow) light.shadow.mapSize.set(2048,2048);
      break;
    }
    case'spot':{
      light=new THREE.SpotLight(c,l.intensity,l.distance??0,l.angle??Math.PI/4,l.penumbra??0.1,l.decay??2);
      if(l.position) light.position.set(l.position.x,l.position.y,l.position.z);
      if(l.target){const t=new THREE.Object3D();t.position.set(l.target.x,l.target.y,l.target.z);scene.add(t);light.target=t;}
      light.castShadow=!!l.castShadow;
      if(light.castShadow) light.shadow.mapSize.set(2048,2048);
      break;
    }
    default:{
      light=new THREE.DirectionalLight(c,l.intensity);
      if(l.position) light.position.set(l.position.x,l.position.y,l.position.z);
      if(l.target){const t=new THREE.Object3D();t.position.set(l.target.x,l.target.y,l.target.z);scene.add(t);light.target=t;}
      light.castShadow=!!l.castShadow;
      if(light.castShadow) light.shadow.mapSize.set(2048,2048);
    }
  }
  if(light) scene.add(light);
}

// ── Build objects ──
for (const obj of Object.values(STATE.objects??{})) {
  if (obj.type === 'gltf' && obj.url) continue; // GLTF needs loader, skip for standalone

  const mesh = new THREE.Mesh(buildGeometry(obj), buildMaterial(obj.material));
  mesh.name = obj.id;
  if(obj.position) mesh.position.set(obj.position.x,obj.position.y,obj.position.z);
  if(obj.rotation) mesh.rotation.set(toRad(obj.rotation.x),toRad(obj.rotation.y),toRad(obj.rotation.z));
  if(obj.scale) mesh.scale.set(obj.scale.x,obj.scale.y,obj.scale.z);
  mesh.castShadow = obj.castShadow !== false;
  mesh.receiveShadow = obj.receiveShadow !== false;
  if(obj.visible === false) mesh.visible = false;
  scene.add(mesh);
  objects.set(obj.id, mesh);
}

// ── Animations ──
const animations = [];
function applyEasing(t, mode) {
  switch(mode){
    case'easeIn':return t*t*t;
    case'easeOut':return 1-Math.pow(1-t,3);
    case'easeInOut':return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    default:return t;
  }
}

for (const anim of Object.values(STATE.animations??{})) {
  const mesh = objects.get(anim.id);
  if (!mesh) continue;
  const prop = anim.property; // position | rotation | scale
  const from = {
    x: mesh[prop].x,
    y: mesh[prop].y,
    z: mesh[prop].z,
  };
  // For rotation stored in degrees, convert target
  const to = prop === 'rotation'
    ? {x:toRad(anim.to.x),y:toRad(anim.to.y),z:toRad(anim.to.z)}
    : anim.to;
  animations.push({
    mesh, prop, from, to,
    duration: (anim.duration??1)*1000,
    easing: anim.easing??'linear',
    loop: anim.loop??false,
    startTime: performance.now(),
  });
}

// ── Render loop ──
function tick() {
  requestAnimationFrame(tick);
  const now = performance.now();

  for (const a of animations) {
    let elapsed = now - a.startTime;
    let t = Math.min(elapsed / a.duration, 1);
    if (a.loop && t >= 1) { a.startTime = now; t = 0; }
    const e = applyEasing(t, a.easing);
    a.mesh[a.prop].x = a.from.x + (a.to.x - a.from.x) * e;
    a.mesh[a.prop].y = a.from.y + (a.to.y - a.from.y) * e;
    a.mesh[a.prop].z = a.from.z + (a.to.z - a.from.z) * e;
  }

  controls.update();
  renderer.render(scene, camera);
}
tick();

// ── Resize ──
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});
</script>
</body>
</html>`;
}
