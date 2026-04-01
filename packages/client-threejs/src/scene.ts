import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
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
  ParticleDef,
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
  private particles = new Map<string, { points: THREE.Points; def: ParticleDef }>();
  private animations = new Map<string, ActiveAnimation>();
  private loader   = new THREE.TextureLoader();
  private composer: EffectComposer;
  private bloomPass!: UnrealBloomPass;
  private chromaticAberrationPass: ShaderPass | null = null;
  private vignettePass: ShaderPass | null = null;
  private envMap: THREE.Texture | null = null;

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
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // ── Scene ────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1a1a2e');

    // ── Procedural IBL environment map ──────────────────────────
    this.generateEnvironment();

    // ── Default lighting ─────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    ambient.name = '__default_ambient';
    this.scene.add(ambient);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x362907, 0.3);
    hemiLight.name = '__default_hemi';
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.name = '__default_dir';
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    this.scene.add(dirLight);

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

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.4,   // strength
      0.4,   // radius
      0.85,  // threshold
    );
    this.composer.addPass(this.bloomPass);

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
    // Advance animations (keyed by `${id}_${property}` for concurrent support)
    for (const [key, anim] of this.animations) {
      const obj = this.objects.get(anim.id);
      if (!obj) { this.animations.delete(key); continue; }

      let t = Math.min((time - anim.startTime) / anim.duration, 1);
      if (anim.loop && t >= 1) {
        anim.startTime = time;
        t = 0;
      }
      const e = applyEasing(t, anim.easing);

      if (anim.property.startsWith('material.')) {
        // Material property animation
        const mesh = obj instanceof THREE.Mesh ? obj : null;
        if (!mesh) continue;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const subProp = anim.property.split('.')[1];
        if (subProp === 'emissiveIntensity' || subProp === 'opacity') {
          const from = anim.fromScalar ?? 0;
          const to = anim.toScalar ?? 1;
          (mat as any)[subProp] = from + (to - from) * e;
          if (subProp === 'opacity') mat.transparent = mat.opacity < 1;
          mat.needsUpdate = true;
        } else if (subProp === 'color' && anim.fromColor && anim.toColor) {
          const fromC = new THREE.Color(anim.fromColor);
          const toC = new THREE.Color(anim.toColor);
          mat.color.lerpColors(fromC, toC, e);
        }
      } else {
        // Transform animation
        const prop = obj[anim.property as 'position' | 'rotation' | 'scale'] as THREE.Vector3;
        if (prop) {
          prop.set(
            anim.fromX + (anim.toX - anim.fromX) * e,
            anim.fromY + (anim.toY - anim.fromY) * e,
            anim.fromZ + (anim.toZ - anim.fromZ) * e,
          );
        }
      }
      if (t >= 1 && !anim.loop) this.animations.delete(key);
    }

    // Animate particles (drift + twinkle)
    const dt = 0.016; // ~60fps
    for (const [, p] of this.particles) {
      const geo = p.points.geometry;
      const pos = geo.getAttribute('position') as THREE.BufferAttribute;
      if (p.def.speed && p.def.drift) {
        const dx = p.def.drift.x * p.def.speed * dt;
        const dy = p.def.drift.y * p.def.speed * dt;
        const dz = p.def.drift.z * p.def.speed * dt;
        for (let i = 0; i < pos.count; i++) {
          pos.setXYZ(i, pos.getX(i) + dx, pos.getY(i) + dy, pos.getZ(i) + dz);
          // Wrap particles back into spread volume
          if (Math.abs(pos.getX(i)) > p.def.spread.x) pos.setX(i, -pos.getX(i));
          if (Math.abs(pos.getY(i)) > p.def.spread.y) pos.setY(i, -pos.getY(i));
          if (Math.abs(pos.getZ(i)) > p.def.spread.z) pos.setZ(i, -pos.getZ(i));
        }
        pos.needsUpdate = true;
      }
      if (p.def.twinkle) {
        const alphas = geo.getAttribute('alpha') as THREE.BufferAttribute;
        if (alphas) {
          for (let i = 0; i < alphas.count; i++) {
            alphas.setX(i, 0.3 + Math.random() * 0.7);
          }
          alphas.needsUpdate = true;
        }
      }
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

    if (def.type === 'line' && def.points) {
      // Line geometry for lasers, neon streaks, trails
      const lineGeo = new THREE.BufferGeometry().setFromPoints(
        def.points.map(p => new THREE.Vector3(p.x, p.y, p.z)),
      );
      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(def.material?.color ?? '#00ffff'),
        linewidth: 2,
        transparent: true,
        opacity: def.material?.opacity ?? 1,
      });
      mesh = new THREE.Line(lineGeo, lineMat);
    } else {
      mesh = new THREE.Mesh(geo, mat);
      (mesh as THREE.Mesh).castShadow = def.castShadow !== false;
      (mesh as THREE.Mesh).receiveShadow = def.receiveShadow !== false;
    }
    mesh.name = def.id;
    mesh.visible = def.visible !== false;

    this.applyTransform(mesh, def);

    // Parent-child grouping
    if (def.parentId && this.objects.has(def.parentId)) {
      this.objects.get(def.parentId)!.add(mesh);
    } else {
      this.scene.add(mesh);
    }
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
    for (const key of this.animations.keys()) {
      if (key === id || key.startsWith(`${id}_`)) this.animations.delete(key);
    }
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
    property: string,
    to: Vec3 | number | string,
    duration: number,
    easing: ActiveAnimation['easing'],
    loop: boolean,
    time: number,
  ): void {
    const obj = this.objects.get(id);
    if (!obj) return;

    if (property.startsWith('material.')) {
      // Material property animation
      const mesh = obj instanceof THREE.Mesh ? obj : null;
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const subProp = property.split('.')[1];
      if (subProp === 'emissiveIntensity' || subProp === 'opacity') {
        this.animations.set(`${id}_${property}`, {
          id, property,
          fromX: 0, fromY: 0, fromZ: 0, toX: 0, toY: 0, toZ: 0,
          fromScalar: (mat as any)[subProp] ?? 0,
          toScalar: to as number,
          startTime: time, duration: duration * 1000, easing, loop,
        });
      } else if (subProp === 'color') {
        this.animations.set(`${id}_${property}`, {
          id, property,
          fromX: 0, fromY: 0, fromZ: 0, toX: 0, toY: 0, toZ: 0,
          fromColor: '#' + mat.color.getHexString(),
          toColor: to as string,
          startTime: time, duration: duration * 1000, easing, loop,
        });
      }
    } else {
      const from = obj[property as 'position' | 'rotation' | 'scale'] as THREE.Vector3;
      if (!from) return;
      const target = to as Vec3;
      this.animations.set(`${id}_${property}`, {
        id, property,
        fromX: from.x, fromY: from.y, fromZ: from.z,
        toX: target.x, toY: target.y, toZ: target.z,
        startTime: time,
        duration: duration * 1000,
        easing,
        loop,
      });
    }
  }

  stopAnimation(id: string): void {
    for (const key of this.animations.keys()) {
      if (key === id || key.startsWith(`${id}_`)) this.animations.delete(key);
    }
  }

  // ─── Particles ────────────────────────────────────────────────

  createParticles(def: ParticleDef): void {
    this.deleteParticles(def.id);
    const count = def.count;
    const positions = new Float32Array(count * 3);
    const alphas = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 2 * def.spread.x;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2 * def.spread.y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2 * def.spread.z;
      alphas[i] = 1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    const mat = new THREE.PointsMaterial({
      size: def.size,
      color: new THREE.Color(def.color),
      transparent: true,
      opacity: def.opacity ?? 1,
      sizeAttenuation: def.sizeAttenuation !== false,
      blending: def.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    points.position.set(def.position.x, def.position.y, def.position.z);
    this.scene.add(points);
    this.particles.set(def.id, { points, def });
  }

  updateParticles(update: Partial<ParticleDef> & { id: string }): void {
    const entry = this.particles.get(update.id);
    if (!entry) return;
    const mat = entry.points.material as THREE.PointsMaterial;
    if (update.color !== undefined) mat.color.set(update.color);
    if (update.size !== undefined)  mat.size = update.size;
    if (update.opacity !== undefined) mat.opacity = update.opacity;
    if (update.position) entry.points.position.set(update.position.x, update.position.y, update.position.z);
    Object.assign(entry.def, update);
  }

  deleteParticles(id: string): void {
    const entry = this.particles.get(id);
    if (!entry) return;
    this.scene.remove(entry.points);
    entry.points.geometry.dispose();
    (entry.points.material as THREE.PointsMaterial).dispose();
    this.particles.delete(id);
  }

  // ─── Post-processing ──────────────────────────────────────────

  updatePostProcessing(env: EnvironmentDef): void {
    if (env.bloom) {
      if (env.bloom.strength !== undefined) this.bloomPass.strength = env.bloom.strength;
      if (env.bloom.radius !== undefined)   this.bloomPass.radius = env.bloom.radius;
      if (env.bloom.threshold !== undefined) this.bloomPass.threshold = env.bloom.threshold;
    }
    if (env.chromaticAberration) {
      if (!this.chromaticAberrationPass) {
        const caShader = {
          uniforms: { tDiffuse: { value: null }, offset: { value: env.chromaticAberration.offset ?? 0.005 } },
          vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: `uniform sampler2D tDiffuse; uniform float offset; varying vec2 vUv;
            void main() {
              float r = texture2D(tDiffuse, vUv + vec2(offset, 0.0)).r;
              float g = texture2D(tDiffuse, vUv).g;
              float b = texture2D(tDiffuse, vUv - vec2(offset, 0.0)).b;
              gl_FragColor = vec4(r, g, b, 1.0);
            }`,
        };
        this.chromaticAberrationPass = new ShaderPass(caShader);
        // Insert before the last pass (FXAA)
        const passes = this.composer.passes;
        this.composer.insertPass(this.chromaticAberrationPass, passes.length - 1);
      } else {
        this.chromaticAberrationPass.uniforms['offset'].value = env.chromaticAberration.offset;
      }
    }
    if (env.vignette) {
      if (!this.vignettePass) {
        const vigShader = {
          uniforms: {
            tDiffuse: { value: null },
            offset: { value: env.vignette.offset ?? 1.0 },
            darkness: { value: env.vignette.darkness ?? 1.0 },
          },
          vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: `uniform sampler2D tDiffuse; uniform float offset; uniform float darkness; varying vec2 vUv;
            void main() {
              vec4 texel = texture2D(tDiffuse, vUv);
              vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
              gl_FragColor = vec4(mix(texel.rgb, vec3(1.0 - darkness), dot(uv, uv)), texel.a);
            }`,
        };
        this.vignettePass = new ShaderPass(vigShader);
        const passes = this.composer.passes;
        this.composer.insertPass(this.vignettePass, passes.length - 1);
      } else {
        this.vignettePass.uniforms['offset'].value = env.vignette.offset;
        this.vignettePass.uniforms['darkness'].value = env.vignette.darkness;
      }
    }
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
    // Dynamic post-processing updates
    if (env.bloom || env.chromaticAberration || env.vignette) {
      this.updatePostProcessing(env);
    }
  }

  // ─── Full scene rebuild ───────────────────────────────────────

  loadScene(state: SceneState): void {
    // Clear everything
    for (const id of [...this.objects.keys()])   this.deleteObject(id);
    for (const id of [...this.lights.keys()])    this.deleteLight(id);
    for (const id of [...this.particles.keys()]) this.deleteParticles(id);
    this.animations.clear();

    if (state.environment) this.setEnvironment(state.environment);
    if (state.camera)      this.setCamera(state.camera);
    for (const light    of Object.values(state.lights    ?? {})) this.createLight(light);
    for (const object   of Object.values(state.objects   ?? {})) this.createObject(object);
    for (const particle of Object.values(state.particles ?? {})) this.createParticles(particle);
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
    const seg = (def.segments as number | undefined) ?? 64;
    switch (def.type) {
      case 'sphere':   return new THREE.SphereGeometry(r, seg, seg);
      case 'cylinder': return new THREE.CylinderGeometry((def.radiusTop as number | undefined) ?? r, (def.radiusBottom as number | undefined) ?? r, h, seg);
      case 'cone':     return new THREE.ConeGeometry(r, h, seg);
      case 'torus':    return new THREE.TorusGeometry(r, r * 0.4, 24, seg);
      case 'plane':    return new THREE.PlaneGeometry(w, h);
      case 'capsule':  return new THREE.CapsuleGeometry(r, h, 8, seg);
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
          ...(def.emissive ? { emissive: new THREE.Color(def.emissive) } : {}),
          emissiveIntensity: def.emissiveIntensity ?? 1,
          envMap: this.envMap,
          envMapIntensity: 1.0,
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
    if (this.envMap && !mat.envMap) { mat.envMap = this.envMap; mat.envMapIntensity = 1.0; }
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

  /**
   * Generate a procedural studio-style IBL environment map using PMREMGenerator.
   * Gives PBR materials realistic reflections without loading external HDR files.
   */
  private generateEnvironment(): void {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();

    // Build a small scene with gradient lighting to bake into a cube envmap
    const envScene = new THREE.Scene();
    // Hemisphere sky gradient
    const hemiEnv = new THREE.HemisphereLight(0x8899bb, 0x223344, 2.0);
    envScene.add(hemiEnv);
    // Bright key light for specular highlights
    const keyLight = new THREE.DirectionalLight(0xffeedd, 3.0);
    keyLight.position.set(5, 8, 3);
    envScene.add(keyLight);
    // Fill from opposite side
    const fillLight = new THREE.DirectionalLight(0xaabbdd, 1.0);
    fillLight.position.set(-3, 4, -5);
    envScene.add(fillLight);

    this.envMap = pmrem.fromScene(envScene, 0, 0.1, 100).texture;
    this.scene.environment = this.envMap;
    pmrem.dispose();
  }
}
