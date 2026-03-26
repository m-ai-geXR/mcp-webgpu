import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import {
  SceneObject,
  SceneLight,
  SceneCamera,
  EnvironmentDef,
  SceneState,
  MaterialDef,
  Vec3,
  ActiveAnimation,
} from './types.js';

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function applyEasing(t: number, easing: ActiveAnimation['easing']): number {
  switch (easing) {
    case 'easeIn':    return t * t;
    case 'easeOut':   return t * (2 - t);
    case 'easeInOut': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default:          return t; // linear
  }
}

export class SceneManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;

  private objects  = new Map<string, THREE.Object3D>();
  private lights   = new Map<string, THREE.Light>();
  private animations = new Map<string, ActiveAnimation>();
  private loader   = new THREE.TextureLoader();
  private composer: EffectComposer;

  /** Optional callback invoked every frame (for VR panel updates, etc.). */
  onTick: ((time: number) => void) | null = null;

  constructor(container: HTMLElement) {
    // ── Renderer ────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    // ── Scene ────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1a1a2e');

    // Grid removed — clean background only

    // ── Camera ───────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    );
    this.camera.position.set(6, 5, 6);
    this.camera.lookAt(0, 0, 0);

    // ── Controls ─────────────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 200;

    // ── Post-processing ────────────────────────────────────────
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.4,   // strength
      0.4,   // radius
      0.85,  // threshold
    );
    this.composer.addPass(bloomPass);

    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms['resolution'].value.set(
      1 / (container.clientWidth * window.devicePixelRatio),
      1 / (container.clientHeight * window.devicePixelRatio),
    );
    this.composer.addPass(fxaaPass);

    // ── Resize observer ──────────────────────────────────────────
    new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.composer.setSize(w, h);
      fxaaPass.uniforms['resolution'].value.set(
        1 / (w * window.devicePixelRatio),
        1 / (h * window.devicePixelRatio),
      );
    }).observe(container);

    // ── Render loop ──────────────────────────────────────────────
    this.renderer.setAnimationLoop((time) => this.tick(time));
  }

  private tick(time: number): void {
    // Advance animations
    for (const [id, anim] of this.animations) {
      const obj = this.objects.get(id);
      if (!obj) { this.animations.delete(id); continue; }

      let t = Math.min((time - anim.startTime) / anim.duration, 1);
      if (anim.loop && t >= 1) {
        anim.startTime = time;
        t = 0;
      }
      const e = applyEasing(t, anim.easing);
      const prop = obj[anim.property] as THREE.Vector3;
      prop.set(
        anim.fromX + (anim.toX - anim.fromX) * e,
        anim.fromY + (anim.toY - anim.fromY) * e,
        anim.fromZ + (anim.toZ - anim.fromZ) * e,
      );
      if (t >= 1 && !anim.loop) this.animations.delete(id);
    }

    this.controls.update();
    this.composer.render();
    this.onTick?.(time);
  }

  // ─── Object management ────────────────────────────────────────

  createObject(def: SceneObject): void {
    this.deleteObject(def.id); // Replace if id exists

    let mesh: THREE.Object3D;

    if (def.type === 'gltf' && def.url) {
      // Placeholder cube while the GLTF loads
      const ph = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x888888, wireframe: true }),
      );
      ph.name = def.id;
      this.scene.add(ph);
      this.objects.set(def.id, ph);
      this.applyTransform(ph, def);

      import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
        new GLTFLoader().load(def.url!, (gltf) => {
          this.scene.remove(ph);
          const model = gltf.scene;
          model.name = def.id;
          this.applyTransform(model, def);
          this.scene.add(model);
          this.objects.set(def.id, model);
        });
      });
      return;
    }

    const geo = this.buildGeometry(def);
    const mat = this.buildMaterial(def.material ?? {});
    mesh = new THREE.Mesh(geo, mat);
    mesh.name = def.id;
    mesh.castShadow = def.castShadow !== false;
    mesh.receiveShadow = def.receiveShadow !== false;
    mesh.visible = def.visible !== false;

    this.applyTransform(mesh, def);
    this.scene.add(mesh);
    this.objects.set(def.id, mesh);
  }

  updateObject(def: Partial<SceneObject> & { id: string }): void {
    const obj = this.objects.get(def.id);
    if (!obj) { this.createObject(def as SceneObject); return; }

    if (def.position) obj.position.set(def.position.x, def.position.y, def.position.z);
    if (def.rotation) obj.rotation.set(toRad(def.rotation.x), toRad(def.rotation.y), toRad(def.rotation.z));
    if (def.scale)    obj.scale.set(def.scale.x, def.scale.y, def.scale.z);
    if (def.visible !== undefined) obj.visible = def.visible;

    if (def.material && obj instanceof THREE.Mesh) {
      const mat = obj.material as THREE.MeshStandardMaterial;
      this.applyMaterial(mat, def.material);
    }
  }

  deleteObject(id: string): void {
    const obj = this.objects.get(id);
    if (!obj) return;
    this.scene.remove(obj);
    this.disposeObject(obj);
    this.objects.delete(id);
    this.animations.delete(id);
  }

  // ─── Light management ─────────────────────────────────────────

  createLight(def: SceneLight): void {
    this.deleteLight(def.id);

    let light: THREE.Light;
    const color = new THREE.Color(def.color);

    switch (def.lightType) {
      case 'ambient':
        light = new THREE.AmbientLight(color, def.intensity);
        break;
      case 'hemisphere':
        light = new THREE.HemisphereLight(
          color,
          new THREE.Color(def.groundColor ?? '#443344'),
          def.intensity,
        );
        break;
      case 'point': {
        const pl = new THREE.PointLight(color, def.intensity, def.distance ?? 0, def.decay ?? 2);
        pl.castShadow = def.castShadow ?? false;
        light = pl;
        break;
      }
      case 'spot': {
        const sl = new THREE.SpotLight(color, def.intensity, def.distance ?? 0, def.angle ?? Math.PI / 4, def.penumbra ?? 0.1, def.decay ?? 2);
        sl.castShadow = def.castShadow ?? false;
        if (def.target) sl.target.position.set(def.target.x, def.target.y, def.target.z);
        light = sl;
        break;
      }
      default: {
        const dl = new THREE.DirectionalLight(color, def.intensity);
        dl.castShadow = def.castShadow ?? false;
        dl.shadow.mapSize.set(2048, 2048);
        dl.shadow.camera.near = 0.5;
        dl.shadow.camera.far = 100;
        dl.shadow.camera.left = dl.shadow.camera.bottom = -20;
        dl.shadow.camera.right = dl.shadow.camera.top = 20;
        if (def.target) dl.target.position.set(def.target.x, def.target.y, def.target.z);
        light = dl;
      }
    }

    light.name = def.id;
    if (def.position) light.position.set(def.position.x, def.position.y, def.position.z);
    this.scene.add(light);
    this.lights.set(def.id, light);
  }

  updateLight(def: Partial<SceneLight> & { id: string }): void {
    const light = this.lights.get(def.id);
    if (!light) return;
    if (def.color)     light.color.set(def.color);
    if (def.intensity !== undefined) light.intensity = def.intensity;
    if (def.position)  light.position.set(def.position.x, def.position.y, def.position.z);
  }

  deleteLight(id: string): void {
    const light = this.lights.get(id);
    if (!light) return;
    this.scene.remove(light);
    this.lights.delete(id);
  }

  // ─── Camera ───────────────────────────────────────────────────

  setCamera(cam: Partial<SceneCamera>): void {
    if (cam.fov) { this.camera.fov = cam.fov; this.camera.updateProjectionMatrix(); }
    if (cam.near) { this.camera.near = cam.near; this.camera.updateProjectionMatrix(); }
    if (cam.far)  { this.camera.far = cam.far;  this.camera.updateProjectionMatrix(); }
    if (cam.position) this.camera.position.set(cam.position.x, cam.position.y, cam.position.z);
    if (cam.target)   this.controls.target.set(cam.target.x, cam.target.y, cam.target.z);
  }

  flyToObject(id: string, distance = 3, duration = 1): void {
    const obj = this.objects.get(id);
    if (!obj) return;
    const target = new THREE.Vector3();
    obj.getWorldPosition(target);
    const dir = this.camera.position.clone().sub(target).normalize().multiplyScalar(distance);
    const newPos = target.clone().add(dir);
    this.animateCameraTo(newPos, target, duration * 1000);
  }

  private animateCameraTo(newPos: THREE.Vector3, newTarget: THREE.Vector3, duration: number): void {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const start = performance.now();

    const animate = () => {
      const t = Math.min((performance.now() - start) / duration, 1);
      const e = applyEasing(t, 'easeInOut');
      this.camera.position.lerpVectors(startPos, newPos, e);
      this.controls.target.lerpVectors(startTarget, newTarget, e);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  // ─── Animation ────────────────────────────────────────────────

  animateObject(
    id: string,
    property: ActiveAnimation['property'],
    to: Vec3,
    duration: number,
    easing: ActiveAnimation['easing'],
    loop: boolean,
    time: number,
  ): void {
    const obj = this.objects.get(id);
    if (!obj) return;
    const from = obj[property] as THREE.Vector3;
    this.animations.set(id, {
      id, property,
      fromX: from.x, fromY: from.y, fromZ: from.z,
      toX: to.x,    toY: to.y,    toZ: to.z,
      startTime: time,
      duration: duration * 1000,
      easing,
      loop,
    });
  }

  stopAnimation(id: string): void {
    this.animations.delete(id);
  }

  // ─── Environment ──────────────────────────────────────────────

  setEnvironment(env: EnvironmentDef): void {
    if (env.background !== undefined) {
      this.scene.background = new THREE.Color(env.background);
    }
    if (env.fog !== undefined) {
      if (env.fog) {
        this.scene.fog = new THREE.Fog(env.fog.color, env.fog.near, env.fog.far);
      } else {
        this.scene.fog = null;
      }
    }
    if (env.toneMapping !== undefined) {
      const map: Record<string, THREE.ToneMapping> = {
        none: THREE.NoToneMapping,
        linear: THREE.LinearToneMapping,
        reinhard: THREE.ReinhardToneMapping,
        aces: THREE.ACESFilmicToneMapping,
      };
      this.renderer.toneMapping = map[env.toneMapping] ?? THREE.ACESFilmicToneMapping;
    }
    if (env.exposure !== undefined) {
      this.renderer.toneMappingExposure = env.exposure;
    }
    if (env.shadows !== undefined) {
      this.renderer.shadowMap.enabled = env.shadows;
    }
  }

  // ─── Full scene rebuild ───────────────────────────────────────

  loadScene(state: SceneState): void {
    // Clear objects
    for (const id of [...this.objects.keys()]) this.deleteObject(id);
    for (const id of [...this.lights.keys()])  this.deleteLight(id);
    this.animations.clear();

    if (state.environment) this.setEnvironment(state.environment);
    if (state.camera)      this.setCamera(state.camera);
    for (const light  of Object.values(state.lights  ?? {})) this.createLight(light);
    for (const object of Object.values(state.objects ?? {})) this.createObject(object);
  }

  // ─── Screenshot ───────────────────────────────────────────────

  takeScreenshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  // ─── Private helpers ──────────────────────────────────────────

  private applyTransform(obj: THREE.Object3D, def: Partial<SceneObject>): void {
    if (def.position) obj.position.set(def.position.x, def.position.y, def.position.z);
    if (def.rotation) obj.rotation.set(toRad(def.rotation.x), toRad(def.rotation.y), toRad(def.rotation.z));
    if (def.scale)    obj.scale.set(def.scale.x, def.scale.y, def.scale.z);
  }

  private buildGeometry(def: SceneObject): THREE.BufferGeometry {
    const w = def.width ?? 1, h = def.height ?? 1, d = def.depth ?? 1;
    const r = def.radius ?? 0.5;
    const seg = def.segments ?? 32;
    switch (def.type) {
      case 'sphere':   return new THREE.SphereGeometry(r, seg, seg);
      case 'cylinder': return new THREE.CylinderGeometry(def.radiusTop ?? r, def.radiusBottom ?? r, h, seg);
      case 'cone':     return new THREE.ConeGeometry(r, h, seg);
      case 'torus':    return new THREE.TorusGeometry(r, r * 0.4, 16, seg);
      case 'plane':    return new THREE.PlaneGeometry(w, h);
      case 'capsule':  return new THREE.CapsuleGeometry(r, h, 4, seg);
      default:         return new THREE.BoxGeometry(w, h, d);
    }
  }

  private buildMaterial(def: MaterialDef): THREE.Material {
    const color = def.color ?? '#4488ff';
    const base = {
      color: new THREE.Color(color),
      wireframe: def.wireframe ?? false,
      transparent: def.transparent ?? (def.opacity !== undefined && def.opacity < 1),
      opacity: def.opacity ?? 1,
    };

    switch (def.type) {
      case 'phong':  return new THREE.MeshPhongMaterial(base);
      case 'toon':   return new THREE.MeshToonMaterial({ color: base.color, wireframe: base.wireframe });
      case 'basic':  return new THREE.MeshBasicMaterial(base);
      default: {
        const mat = new THREE.MeshStandardMaterial({
          ...base,
          metalness: def.metalness ?? 0.1,
          roughness: def.roughness ?? 0.7,
          emissive: def.emissive ? new THREE.Color(def.emissive) : undefined,
          emissiveIntensity: def.emissiveIntensity ?? 1,
        });
        if (def.textureUrl) mat.map = this.loader.load(def.textureUrl);
        return mat;
      }
    }
  }

  private applyMaterial(mat: THREE.MeshStandardMaterial, def: MaterialDef): void {
    if (def.color)             mat.color.set(def.color);
    if (def.metalness !== undefined) mat.metalness = def.metalness;
    if (def.roughness !== undefined) mat.roughness = def.roughness;
    if (def.opacity !== undefined)   { mat.opacity = def.opacity; mat.transparent = def.opacity < 1; }
    if (def.wireframe !== undefined) mat.wireframe = def.wireframe;
    if (def.emissive)          mat.emissive.set(def.emissive);
    if (def.emissiveIntensity !== undefined) mat.emissiveIntensity = def.emissiveIntensity;
    if (def.textureUrl)        mat.map = this.loader.load(def.textureUrl);
    mat.needsUpdate = true;
  }

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
