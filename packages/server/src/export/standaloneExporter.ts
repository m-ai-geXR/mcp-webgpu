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
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';

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

// ── HDRI environment map ──
if (STATE.environment?.hdriUrl) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  new RGBELoader().load(STATE.environment.hdriUrl, (hdrTexture) => {
    const envMap = pmrem.fromEquirectangular(hdrTexture).texture;
    scene.environment = envMap;
    if (STATE.environment?.skyType === 'hdri') {
      scene.background = envMap;
    }
    hdrTexture.dispose();
    pmrem.dispose();
  });
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
  const tr=def.tubeRadius, det=def.detail??0;
  switch(def.type){
    case'sphere':return new THREE.SphereGeometry(r,seg,seg);
    case'cylinder':return new THREE.CylinderGeometry(def.radiusTop??r,def.radiusBottom??r,h,seg);
    case'cone':return new THREE.ConeGeometry(r,h,seg);
    case'torus':return new THREE.TorusGeometry(r,tr??r*0.4,24,seg);
    case'plane':return new THREE.PlaneGeometry(w,h);
    case'capsule':return new THREE.CapsuleGeometry(r,h,8,seg);
    case'torusKnot':return new THREE.TorusKnotGeometry(r,tr??0.2,seg,16);
    case'ring':return new THREE.RingGeometry(def.innerRadius??0.3,r,seg);
    case'circle':return new THREE.CircleGeometry(r,seg);
    case'dodecahedron':return new THREE.DodecahedronGeometry(r,det);
    case'icosahedron':return new THREE.IcosahedronGeometry(r,det);
    case'octahedron':return new THREE.OctahedronGeometry(r,det);
    case'tetrahedron':return new THREE.TetrahedronGeometry(r,det);
    case'tube':{
      if(def.points&&def.points.length>=2){
        const pts=def.points.map(p=>new THREE.Vector3(p.x,p.y,p.z));
        const curve=new THREE.CatmullRomCurve3(pts);
        return new THREE.TubeGeometry(curve,seg,tr??0.2,12,false);
      }
      return new THREE.BoxGeometry(w,h,d);
    }
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
  if (obj.type === 'gltf' && obj.url) continue;

  let mesh;
  if (obj.type === 'line' && obj.points && obj.points.length >= 2) {
    const pts = obj.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({color: obj.material?.color ?? '#ffffff'});
    mesh = new THREE.Line(geom, mat);
  } else {
    mesh = new THREE.Mesh(buildGeometry(obj), buildMaterial(obj.material));
  }
  mesh.name = obj.id;
  if(obj.position) mesh.position.set(obj.position.x,obj.position.y,obj.position.z);
  if(obj.rotation) mesh.rotation.set(toRad(obj.rotation.x),toRad(obj.rotation.y),toRad(obj.rotation.z));
  if(obj.scale) mesh.scale.set(obj.scale.x,obj.scale.y,obj.scale.z);
  mesh.castShadow = obj.castShadow !== false;
  mesh.receiveShadow = obj.receiveShadow !== false;
  if(obj.visible === false) mesh.visible = false;

  // parentId grouping
  if (obj.parentId && objects.has(obj.parentId)) {
    objects.get(obj.parentId).add(mesh);
  } else {
    scene.add(mesh);
  }
  objects.set(obj.id, mesh);
}

// ── Build particles ──
for (const p of Object.values(STATE.particles??{})) {
  const count = p.count ?? 200;
  const spread = p.spread ?? {x:10,y:10,z:10};
  const pos = p.position ?? {x:0,y:0,z:0};
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i*3]   = pos.x + (Math.random()-0.5)*spread.x;
    positions[i*3+1] = pos.y + (Math.random()-0.5)*spread.y;
    positions[i*3+2] = pos.z + (Math.random()-0.5)*spread.z;
  }
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    size: p.size ?? 0.1,
    color: new THREE.Color(p.color ?? '#ffffff'),
    transparent: true,
    opacity: p.opacity ?? 0.8,
    sizeAttenuation: p.sizeAttenuation !== false,
    blending: p.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending,
    depthWrite: false,
  });
  scene.add(new THREE.Points(geom, mat));
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

// ── Post-processing (bloom) ──
let composer = null;
const env = STATE.environment ?? {};
if (env.bloom) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    env.bloom.strength ?? 0.4,
    env.bloom.radius ?? 0.4,
    env.bloom.threshold ?? 0.8,
  );
  composer.addPass(bloom);
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
  if (composer) { composer.render(); } else { renderer.render(scene, camera); }
}
tick();

// ── Resize ──
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
  if (composer) composer.setSize(window.innerWidth,window.innerHeight);
});
</script>
</body>
</html>`;
}
