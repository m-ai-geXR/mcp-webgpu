/**
 * Babylon.js Scene Manager
 *
 * Drives Babylon.js via its imperative API.
 * The BabylonAdapter on the server side converts degrees→radians and normalises
 * position arrays, so by the time commands arrive here they are plain { x, y, z }
 * objects in world-space degrees (for rotation).
 */

import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  Color3,
  Color4,
  HemisphericLight,
  DirectionalLight,
  PointLight,
  SpotLight,
  ShadowGenerator,
  MeshBuilder,
  StandardMaterial,
  PBRMaterial,
  Texture,
  CubeTexture,
  SceneLoader,
  Animation,
  CircleEase,
  CubicEase,
  Animatable,
  EasingFunction,
  WebXRDefaultExperience,
  DynamicTexture,
  DefaultRenderingPipeline,
  ImageProcessingConfiguration,
  PointsCloudSystem,
  Mesh,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

import {
  SceneObject,
  SceneLight,
  SceneCamera,
  EnvironmentDef,
  SceneState,
  ParticleDef,
  Vec3,
  ActiveTween,
} from './types.js';

function hexToColor3(hex: string): Color3 {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return new Color3(r, g, b);
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function applyEasingFn(animation: Animation, easing: string): void {
  let fn: EasingFunction;
  switch (easing) {
    case 'easeIn':    fn = new CubicEase(); fn.setEasingMode(EasingFunction.EASINGMODE_EASEIN);    break;
    case 'easeOut':   fn = new CircleEase(); fn.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);  break;
    case 'easeInOut': fn = new CubicEase(); fn.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT); break;
    default: return; // linear — no easing function needed
  }
  animation.setEasingFunction(fn);
}

export class BabylonSceneManager {
  readonly engine: Engine;
  readonly scene:  Scene;
  readonly camera: ArcRotateCamera;

  private meshes       = new Map<string, ReturnType<typeof MeshBuilder.CreateBox>>();
  private lights       = new Map<string, HemisphericLight | DirectionalLight | PointLight | SpotLight>();
  private particles    = new Map<string, { pcs: PointsCloudSystem; mesh: Mesh; def: ParticleDef }>();
  private shadowGen:     ShadowGenerator | null = null;
  private tweens       = new Map<string, ActiveTween>();
  private animatables  = new Map<string, Animatable>();
  private pipeline:      DefaultRenderingPipeline | null = null;

  private behaviors = new Map<string, import('./types.js').BehaviorDef>();

  // ── WebXR VR ─────────────────────────────────────────────────────────────
  private xrExperience: WebXRDefaultExperience | null = null;
  private vrChatMesh:   ReturnType<typeof MeshBuilder.CreatePlane> | null = null;
  private vrChatTexture: DynamicTexture | null = null;
  private vrChatMessages: Array<{ role: 'user' | 'ai'; text: string }> = [];
  isPresenting = false;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
    this.scene  = new Scene(this.engine);

    // Background colour
    this.scene.clearColor = new Color4(0.1, 0.1, 0.17, 1);

    // ── Procedural IBL environment for PBR reflections ──────────
    this.scene.environmentTexture = CubeTexture.CreateFromPrefilteredData(
      'https://assets.babylonjs.com/environments/environmentSpecular.env',
      this.scene,
    );
    this.scene.environmentIntensity = 0.6;

    const hemi = new HemisphericLight('__hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.4;

    // Warmer, more intense directional light (sun-like)
    const defaultDir = new DirectionalLight('__default_dir', new Vector3(-1, -2, -1).normalize(), this.scene);
    defaultDir.position = new Vector3(5, 10, 7);
    defaultDir.intensity = 1.2;  // increased from 0.8
    defaultDir.diffuse = hexToColor3('#FFF5E6');  // warm white instead of pure white

    // Arc-rotate camera (orbit controls built in)
    this.camera = new ArcRotateCamera('main-cam', -Math.PI / 4, Math.PI / 3, 10, Vector3.Zero(), this.scene);
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 1;
    this.camera.upperRadiusLimit = 200;

    // Invisible floor for XR teleportation only
    const floor = MeshBuilder.CreateGround('__grid', { width: 30, height: 30 }, this.scene);
    floor.visibility = 0;
    floor.isPickable = false;

    // ── Post-processing pipeline ─────────────────────────────────────────────
    this.pipeline = new DefaultRenderingPipeline('defaultPipeline', true, this.scene, [this.camera]);
    this.pipeline.bloomEnabled = true;
    this.pipeline.bloomThreshold = 0.5;  // lowered from 0.8 for more visible glow
    this.pipeline.bloomWeight = 0.4;
    this.pipeline.bloomKernel = 64;
    this.pipeline.bloomScale = 0.5;
    this.pipeline.fxaaEnabled = true;
    this.pipeline.imageProcessingEnabled = true;
    this.pipeline.imageProcessing.toneMappingEnabled = true;
    this.pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.pipeline.imageProcessing.vignetteEnabled = true;
    this.pipeline.imageProcessing.vignetteWeight = 1.5;
    this.pipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0, 0);
    this.pipeline.imageProcessing.contrast = 1.1;
    this.pipeline.imageProcessing.exposure = 1.1;

    // Resize handler
    window.addEventListener('resize', () => this.engine.resize());

    // Render loop
    this.engine.runRenderLoop(() => {
      this.advanceTweens();
      this.tickBehaviors();
      this.scene.render();
    });

    // ── WebXR VR setup ──────────────────────────────────────────────────────
    this.initXR();
  }

  private async initXR(): Promise<void> {
    try {
      const xr = await this.scene.createDefaultXRExperienceAsync({
        floorMeshes: [this.scene.getMeshByName('__grid')!],
        uiOptions: { sessionMode: 'immersive-vr' },
        optionalFeatures: true,
      });
      this.xrExperience = xr;

      // VR chat panel — dynamic texture on a plane
      this.vrChatMesh = MeshBuilder.CreatePlane('__vr-chat', { width: 1.4, height: 0.9 }, this.scene);
      this.vrChatMesh.position = new Vector3(0, 1.5, -2);
      this.vrChatMesh.isPickable = false;
      this.vrChatMesh.setEnabled(false);

      this.vrChatTexture = new DynamicTexture('__vr-chat-tex', { width: 700, height: 450 }, this.scene, false);
      const mat = new StandardMaterial('__vr-chat-mat', this.scene);
      mat.diffuseTexture = this.vrChatTexture;
      mat.emissiveTexture = this.vrChatTexture;
      mat.backFaceCulling = false;
      mat.disableLighting = true;
      this.vrChatMesh.material = mat;
      this.redrawVRChat();

      // Track session state
      xr.baseExperience.sessionManager.onXRSessionInit.add(() => {
        this.isPresenting = true;
        this.vrChatMesh?.setEnabled(true);
        // Hide DOM overlays
        document.querySelectorAll('#chat-panel, #status, #debug-panel').forEach((el) => {
          (el as HTMLElement).style.display = 'none';
        });
      });

      xr.baseExperience.sessionManager.onXRSessionEnded.add(() => {
        this.isPresenting = false;
        this.vrChatMesh?.setEnabled(false);
        const chatPanel = document.getElementById('chat-panel');
        if (chatPanel) chatPanel.style.display = '';
        const status = document.getElementById('status');
        if (status) status.style.display = '';
      });
    } catch (e) {
      console.warn('[Babylon XR] WebXR not available:', e);
    }
  }

  addVRChatMessage(role: 'user' | 'ai', text: string): void {
    this.vrChatMessages.push({ role, text });
    if (this.vrChatMessages.length > 8) this.vrChatMessages = this.vrChatMessages.slice(-8);
    this.redrawVRChat();
  }

  private redrawVRChat(): void {
    if (!this.vrChatTexture) return;
    const ctx = this.vrChatTexture.getContext();
    const w = 700, h = 450;

    // Background
    ctx.fillStyle = 'rgba(10, 10, 30, 0.95)';
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = 'rgba(100, 100, 220, 0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, w - 4, h - 4);

    // Title
    ctx.fillStyle = '#a5b4fc';
    ctx.font = 'bold 20px Segoe UI, system-ui, sans-serif';
    ctx.fillText('🎮 VR Chat', 16, 30);

    // Messages
    ctx.font = '16px Segoe UI, system-ui, sans-serif';
    let y = 56;
    for (const msg of this.vrChatMessages) {
      if (y > h - 20) break;
      ctx.fillStyle = msg.role === 'user' ? '#c7d2fe' : '#86efac';
      const prefix = msg.role === 'user' ? '🗣  ' : '🤖 ';
      ctx.fillText(prefix + msg.text.slice(0, 60), 16, y);
      y += 24;
    }

    if (this.vrChatMessages.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = 'italic 16px Segoe UI, system-ui, sans-serif';
      ctx.fillText('Press ~ to type a message…', 16, y);
    }

    this.vrChatTexture.update();
  }

  private advanceTweens(): void {
    const now = performance.now();
    for (const [id, tw] of this.tweens) {
      const mesh = this.meshes.get(id);
      if (!mesh) { this.tweens.delete(id); continue; }

      let t = Math.min((now - tw.startMs) / tw.durationMs, 1);
      if (tw.loop && t >= 1) { tw.startMs = now; t = 0; }

      // Cubic ease-in-out approximation for JS tweens
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const lerp = (a: number, b: number) => a + (b - a) * e;

      const x = lerp(tw.fromX, tw.toX);
      const y = lerp(tw.fromY, tw.toY);
      const z = lerp(tw.fromZ, tw.toZ);

      if (tw.property === 'scale') {
        mesh.scaling.set(x, y, z);
      } else if (tw.property === 'rotation') {
        mesh.rotation.set(toRad(x), toRad(y), toRad(z));
      } else {
        mesh.position.set(x, y, z);
      }

      if (t >= 1 && !tw.loop) this.tweens.delete(id);
    }
  }

  // ── Objects ─────────────────────────────────────────────────────────────────

  createObject(def: SceneObject): void {
    this.deleteObject(def.id);

    let mesh: ReturnType<typeof MeshBuilder.CreateBox>;

    if (def.type === 'gltf' && def.url) {
      // Async GLTF load — create placeholder
      const ph = MeshBuilder.CreateBox(def.id, { size: 1 }, this.scene);
      ph.name = def.id;
      this.meshes.set(def.id, ph);
      this.applyTransform(ph, def);

      SceneLoader.ImportMeshAsync('', def.url, '', this.scene).then((result) => {
        ph.dispose();
        const root = result.meshes[0] as ReturnType<typeof MeshBuilder.CreateBox>;
        root.name = def.id;
        this.applyTransform(root, def);
        this.meshes.set(def.id, root);
      }).catch(console.error);
      return;
    }

    // Line geometry
    if (def.type === 'line' && def.points && def.points.length >= 2) {
      const pts = def.points.map(p => new Vector3(p.x, p.y, p.z));
      mesh = MeshBuilder.CreateLines(def.id, { points: pts }, this.scene) as any;
      mesh.color = hexToColor3(def.material?.color ?? '#00ffff');
      mesh.name = def.id;
      this.applyTransform(mesh, def);
      if (def.parentId && this.meshes.has(def.parentId)) {
        mesh.parent = this.meshes.get(def.parentId)!;
      }
      this.meshes.set(def.id, mesh);
      return;
    }

    const w = def.width  ?? 1;
    const h = def.height ?? 1;
    const d = def.depth  ?? 1;
    const r = def.radius ?? 0.5;

    const tr = (def as any).tubeRadius as number | undefined;
    const detail = (def as any).detail as number | undefined;
    switch (def.type) {
      case 'sphere':
        mesh = MeshBuilder.CreateSphere(def.id, { diameter: r * 2, segments: 64 }, this.scene);
        break;
      case 'cylinder':
        mesh = MeshBuilder.CreateCylinder(def.id, { height: h, diameter: r * 2, tessellation: 64 }, this.scene);
        break;
      case 'cone':
        mesh = MeshBuilder.CreateCylinder(def.id, { height: h, diameterBottom: r * 2, diameterTop: 0, tessellation: 64 }, this.scene);
        break;
      case 'torus':
        mesh = MeshBuilder.CreateTorus(def.id, { diameter: r * 2, thickness: tr != null ? tr * 2 : r * 0.8, tessellation: 64 }, this.scene);
        break;
      case 'plane':
        mesh = MeshBuilder.CreatePlane(def.id, { width: w, height: h }, this.scene);
        break;
      case 'capsule':
        mesh = MeshBuilder.CreateCapsule(def.id, { radius: r, height: h + r * 2, tessellation: 32 }, this.scene);
        break;
      case 'torusKnot':
        mesh = MeshBuilder.CreateTorusKnot(def.id, { radius: r, tube: tr ?? 0.2, radialSegments: 64, tubularSegments: 16 }, this.scene);
        break;
      case 'ring': {
        const inner = (def as any).innerRadius ?? 0.3;
        mesh = MeshBuilder.CreateDisc(def.id, { radius: r, tessellation: 64 }, this.scene);
        // Babylon doesn't have a ring primitive — use a disc as approximation
        break;
      }
      case 'circle':
        mesh = MeshBuilder.CreateDisc(def.id, { radius: r, tessellation: 64 }, this.scene);
        break;
      case 'dodecahedron':
        mesh = MeshBuilder.CreatePolyhedron(def.id, { type: 2, size: r }, this.scene);
        break;
      case 'icosahedron':
        mesh = MeshBuilder.CreatePolyhedron(def.id, { type: 3, size: r }, this.scene);
        break;
      case 'octahedron':
        mesh = MeshBuilder.CreatePolyhedron(def.id, { type: 1, size: r }, this.scene);
        break;
      case 'tetrahedron':
        mesh = MeshBuilder.CreatePolyhedron(def.id, { type: 0, size: r }, this.scene);
        break;
      case 'tube': {
        if (def.points && def.points.length >= 2) {
          const path = def.points.map(p => new Vector3(p.x, p.y, p.z));
          mesh = MeshBuilder.CreateTube(def.id, { path, radius: tr ?? 0.2, tessellation: 32, cap: Mesh.CAP_ALL }, this.scene);
        } else {
          mesh = MeshBuilder.CreateBox(def.id, { width: w, height: h, depth: d }, this.scene);
        }
        break;
      }
      default:
        mesh = MeshBuilder.CreateBox(def.id, { width: w, height: h, depth: d }, this.scene);
    }

    mesh.name = def.id;
    mesh.receiveShadows = def.receiveShadow !== false;
    if (def.castShadow !== false && this.shadowGen) {
      this.shadowGen.addShadowCaster(mesh);
    }
    mesh.isVisible = def.visible !== false;

    this.applyMaterial(mesh, def.material ?? {});
    this.applyTransform(mesh, def);

    // Parent-child grouping
    if (def.parentId && this.meshes.has(def.parentId)) {
      mesh.parent = this.meshes.get(def.parentId)!;
    }
    this.meshes.set(def.id, mesh);
  }

  updateObject(def: Partial<SceneObject> & { id: string }): void {
    const mesh = this.meshes.get(def.id);
    if (!mesh) { this.createObject(def as SceneObject); return; }
    this.applyTransform(mesh, def);
    if (def.visible !== undefined) mesh.isVisible = def.visible;
    if (def.material) this.applyMaterial(mesh, def.material);
  }

  deleteObject(id: string): void {
    const mesh = this.meshes.get(id);
    if (!mesh) return;
    mesh.dispose();
    this.meshes.delete(id);
    this.tweens.delete(id);
    for (const [key, animatable] of this.animatables) {
      if (key.startsWith(`${id}_`)) {
        animatable.stop();
        this.animatables.delete(key);
      }
    }
  }

  // ── Lights ──────────────────────────────────────────────────────────────────

  createLight(def: SceneLight): void {
    this.deleteLight(def.id);

    const color = hexToColor3(def.color);
    let light: HemisphericLight | DirectionalLight | PointLight | SpotLight;

    switch (def.lightType) {
      case 'ambient':
      case 'hemisphere': {
        const hl = new HemisphericLight(def.id, new Vector3(0, 1, 0), this.scene);
        hl.diffuse   = color;
        hl.intensity = def.intensity;
        if (def.groundColor) hl.groundColor = hexToColor3(def.groundColor);
        light = hl;
        break;
      }
      case 'point': {
        const pos = def.position ?? { x: 0, y: 5, z: 0 };
        const pl = new PointLight(def.id, new Vector3(pos.x, pos.y, pos.z), this.scene);
        pl.diffuse   = color;
        pl.intensity = def.intensity;
        if (def.distance) pl.range = def.distance;
        light = pl;
        break;
      }
      case 'spot': {
        const pos = def.position ?? { x: 0, y: 5, z: 0 };
        const tgt = def.target ?? { x: 0, y: 0, z: 0 };
        const dir = new Vector3(tgt.x - pos.x, tgt.y - pos.y, tgt.z - pos.z).normalize();
        const sl = new SpotLight(def.id, new Vector3(pos.x, pos.y, pos.z), dir,
          def.angle ?? Math.PI / 4, def.penumbra ?? 2, this.scene);
        sl.diffuse   = color;
        sl.intensity = def.intensity;
        light = sl;
        break;
      }
      default: {
        const pos = def.position ?? { x: 5, y: 10, z: 5 };
        const tgt = def.target   ?? { x: 0, y:  0, z: 0 };
        const dir = new Vector3(tgt.x - pos.x, tgt.y - pos.y, tgt.z - pos.z).normalize();
        const dl = new DirectionalLight(def.id, dir, this.scene);
        dl.diffuse   = color;
        dl.intensity = def.intensity;
        dl.position  = new Vector3(pos.x, pos.y, pos.z);
        if (def.castShadow) {
          this.shadowGen = new ShadowGenerator(2048, dl);
          this.shadowGen.useBlurExponentialShadowMap = true;
        }
        light = dl;
      }
    }

    this.lights.set(def.id, light);
  }

  updateLight(def: Partial<SceneLight> & { id: string }): void {
    const light = this.lights.get(def.id);
    if (!light) return;
    if (def.color)     light.diffuse = hexToColor3(def.color);
    if (def.intensity !== undefined) light.intensity = def.intensity;
    if (def.position && (light instanceof DirectionalLight || light instanceof PointLight || light instanceof SpotLight)) {
      light.position = new Vector3(def.position.x, def.position.y, def.position.z);
    }
  }

  deleteLight(id: string): void {
    const light = this.lights.get(id);
    if (!light) return;
    light.dispose();
    this.lights.delete(id);
  }

  // ── Camera ──────────────────────────────────────────────────────────────────

  setCamera(cam: Partial<SceneCamera>): void {
    if (cam.position) {
      const p = cam.position;
      const radius = Math.sqrt(p.x ** 2 + p.y ** 2 + p.z ** 2);
      this.camera.radius = radius;
      this.camera.alpha  = Math.atan2(p.x, p.z);
      this.camera.beta   = Math.acos(p.y / (radius || 1));
    }
    if (cam.target) {
      this.camera.target = new Vector3(cam.target.x, cam.target.y, cam.target.z);
    }
    if (cam.fov) this.camera.fov = toRad(cam.fov);
    if (cam.near) this.camera.minZ = cam.near;
    if (cam.far)  this.camera.maxZ = cam.far;
  }

  flyToObject(id: string, distance = 3): void {
    const mesh = this.meshes.get(id);
    if (!mesh) return;
    this.camera.target = mesh.position.clone();
    this.camera.radius = distance;
  }

  // ── Animation ────────────────────────────────────────────────────────────────

  animateObject(
    id: string,
    property: string,
    to: Vec3 | number | string,
    duration: number,
    easing: string,
    loop: boolean,
  ): void {
    const mesh = this.meshes.get(id);
    if (!mesh) return;

    // Material property animations (emissiveIntensity, opacity, color)
    if (property.startsWith('material.')) {
      const matProp = property.split('.')[1];
      const mat = mesh.material as import('@babylonjs/core').PBRMaterial | null;
      if (!mat) return;
      // Simple immediate set for Babylon (no per-frame tween for material yet)
      if (matProp === 'emissiveIntensity' && typeof to === 'number') {
        mat.emissiveIntensity = to;
      } else if (matProp === 'opacity' && typeof to === 'number') {
        mat.alpha = to;
      } else if (matProp === 'color' && typeof to === 'string') {
        mat.emissiveColor = hexToColor3(to);
      }
      return;
    }

    // Stop only the animation for this specific property (not all animations on mesh)
    const animKey = `${id}_${property}`;
    const existing = this.animatables.get(animKey);
    if (existing) { existing.stop(); this.animatables.delete(animKey); }

    const prop3D = property === 'scale' ? mesh.scaling : property === 'rotation' ? mesh.rotation : mesh.position;
    const from = { x: prop3D.x, y: prop3D.y, z: prop3D.z };

    const toVec = property === 'rotation'
      ? new Vector3(toRad(to.x), toRad(to.y), toRad(to.z))
      : new Vector3(to.x, to.y, to.z);

    const bProp = property === 'scale' ? 'scaling' : property;

    const anim = new Animation(
      `${id}_${property}`,
      bProp,
      60,
      Animation.ANIMATIONTYPE_VECTOR3,
      loop ? Animation.ANIMATIONLOOPMODE_CYCLE : Animation.ANIMATIONLOOPMODE_CONSTANT,
    );

    applyEasingFn(anim, easing);

    const fromVec = new Vector3(from.x, from.y, from.z);

    const totalFrames = Math.round(duration * 60);
    anim.setKeys([
      { frame: 0,           value: fromVec },
      { frame: totalFrames, value: toVec   },
    ]);

    // Use beginDirectAnimation for reliable playback
    const animatable = this.scene.beginDirectAnimation(mesh, [anim], 0, totalFrames, loop, 1);
    this.animatables.set(animKey, animatable);
  }

  stopAnimation(id: string): void {
    for (const [key, animatable] of this.animatables) {
      if (key === id || key.startsWith(`${id}_`)) {
        animatable.stop();
        this.animatables.delete(key);
      }
    }
    this.tweens.delete(id);
  }

  // ── Environment ──────────────────────────────────────────────────────────────

  setEnvironment(env: EnvironmentDef): void {
    if (env.background) {
      const c = hexToColor3(env.background);
      this.scene.clearColor = new Color4(c.r, c.g, c.b, 1);
    }
    // HDRI environment map for reflections and optionally background
    if (env.hdriUrl) {
      const envTex = CubeTexture.CreateFromPrefilteredData(env.hdriUrl, this.scene);
      this.scene.environmentTexture = envTex;
      if (env.skyType === 'hdri') {
        this.scene.createDefaultSkybox(envTex, true, 1000);
      }
    }
    if (env.fog) {
      this.scene.fogMode  = Scene.FOGMODE_LINEAR;
      this.scene.fogColor = hexToColor3(env.fog.color);
      this.scene.fogStart = env.fog.near;
      this.scene.fogEnd   = env.fog.far;
      this.scene.fogEnabled = true;
    }
    if (env.shadows !== undefined) {
      // Toggle shadow generator visibility
      if (this.shadowGen) {
        this.shadowGen.getShadowMap()!.refreshRate = env.shadows ? 1 : 0;
      }
    }

    // ── Dynamic post-processing via DefaultRenderingPipeline ──
    if (env.bloom || env.chromaticAberration || env.vignette) {
      if (!this.pipeline) {
        this.pipeline = new DefaultRenderingPipeline('default', true, this.scene, [this.camera]);
      }
      const p = this.pipeline;
      if (env.bloom) {
        p.bloomEnabled   = true;
        p.bloomWeight    = env.bloom.strength ?? 0.4;
        p.bloomThreshold = env.bloom.threshold ?? 0.5;  // lowered from 0.8 for more visible glow
        p.bloomKernel    = Math.round((env.bloom.radius ?? 0.4) * 128);
      }
      if (env.chromaticAberration) {
        p.chromaticAberrationEnabled = true;
        p.chromaticAberration.aberrationAmount = env.chromaticAberration.offset ?? 0.5;
      }
      if (env.vignette) {
        p.imageProcessingEnabled = true;
        p.imageProcessing.vignetteEnabled  = true;
        p.imageProcessing.vignetteWeight   = env.vignette.darkness ?? 0.5;
        p.imageProcessing.vignetteCameraFov = env.vignette.offset ?? 0.3;
      }
    }
  }

  // ── Particles ──────────────────────────────────────────────────────────────

  createParticles(def: ParticleDef): void {
    const count  = def.count ?? 200;
    const spread = def.spread ?? { x: 10, y: 10, z: 10 };
    const size   = def.size ?? 0.1;
    const color  = def.color ?? '#ffffff';
    const opacity = def.opacity ?? 0.8;

    // Use a custom mesh with thin instances for point particles
    const base = MeshBuilder.CreatePlane(`particles_${def.id}`, { size }, this.scene);
    base.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const mat = new StandardMaterial(`pmat_${def.id}`, this.scene);
    const c = hexToColor3(color);
    mat.diffuseColor = c;
    mat.emissiveColor = def.emissive ? hexToColor3(def.emissive) : c;
    mat.alpha = opacity;
    mat.disableLighting = true;
    base.material = mat;

    // Create thin instances for performance
    const pos = def.position ?? { x: 0, y: 0, z: 0 };
    const matrices: number[] = [];
    for (let i = 0; i < count; i++) {
      const x = pos.x + (Math.random() - 0.5) * spread.x;
      const y = pos.y + (Math.random() - 0.5) * spread.y;
      const z = pos.z + (Math.random() - 0.5) * spread.z;
      // 4x4 identity matrix with translation
      matrices.push(
        size, 0, 0, 0,
        0, size, 0, 0,
        0, 0, size, 0,
        x, y, z, 1,
      );
    }
    const buf = new Float32Array(matrices);
    base.thinInstanceSetBuffer('matrix', buf, 16);
    base.thinInstanceCount = count;

    this.particles.set(def.id, { pcs: null as any, mesh: base as any, def });
  }

  updateParticles(update: Partial<ParticleDef> & { id: string }): void {
    const entry = this.particles.get(update.id);
    if (!entry) return;
    const mesh = entry.mesh as any;
    const mat = mesh.material as StandardMaterial;
    if (update.color) {
      const c = hexToColor3(update.color);
      mat.diffuseColor = c;
      mat.emissiveColor = c;
    }
    if (update.opacity !== undefined) mat.alpha = update.opacity;
    Object.assign(entry.def, update);
  }

  deleteParticles(id: string): void {
    const entry = this.particles.get(id);
    if (!entry) return;
    entry.mesh.dispose();
    this.particles.delete(id);
  }

  // ─── Behaviors ────────────────────────────────────────────────────────────────

  addBehavior(def: import('./types.js').BehaviorDef): void {
    this.behaviors.set(def.id, { ...def, params: { ...def.params } });
  }

  removeBehavior(id: string): void {
    this.behaviors.delete(id);
  }

  private tickBehaviors(): void {
    const timeSec = performance.now() / 1000;
    for (const [, beh] of this.behaviors) {
      const mesh = this.meshes.get(beh.objectId);
      if (!mesh) continue;
      const p = beh.params;
      const speed = (p.speed as number) ?? 1;
      switch (beh.type) {
        case 'spin': {
          const axis = (p.axis as string) ?? 'y';
          const delta = speed * 0.016;
          if (axis === 'x') mesh.rotation.x += delta;
          else if (axis === 'z') mesh.rotation.z += delta;
          else mesh.rotation.y += delta;
          break;
        }
        case 'bob': {
          const axis = (p.axis as string) ?? 'y';
          const amp = (p.amplitude as number) ?? 0.5;
          const baseVal = (p._basePos as number) ?? mesh.position[axis as 'x'|'y'|'z'];
          if (p._basePos === undefined) (p as any)._basePos = baseVal;
          mesh.position[axis as 'x'|'y'|'z'] = baseVal + Math.sin(timeSec * speed) * amp;
          break;
        }
        case 'orbit': {
          const cx = (p.center as any)?.x ?? 0;
          const cy = (p.center as any)?.y ?? mesh.position.y;
          const cz = (p.center as any)?.z ?? 0;
          const rad = (p.radius as number) ?? 2;
          mesh.position.x = cx + Math.cos(timeSec * speed) * rad;
          mesh.position.z = cz + Math.sin(timeSec * speed) * rad;
          mesh.position.y = cy;
          break;
        }
        case 'lookAt': {
          const target = p.target as string;
          if (target === 'camera') {
            mesh.lookAt(this.camera.position);
          } else {
            const t = this.meshes.get(target);
            if (t) mesh.lookAt(t.position);
          }
          break;
        }
        case 'pulse': {
          const min = (p.min as number) ?? 0.8;
          const max = (p.max as number) ?? 1.2;
          const s = min + (max - min) * (0.5 + 0.5 * Math.sin(timeSec * speed));
          mesh.scaling.set(s, s, s);
          break;
        }
      }
    }
  }

  // ── Full scene rebuild ────────────────────────────────────────────────────────

  loadScene(state: SceneState): void {
    for (const id of [...this.meshes.keys()]) this.deleteObject(id);
    for (const id of [...this.lights.keys()])  this.deleteLight(id);
    for (const id of [...this.particles.keys()]) this.deleteParticles(id);
    this.tweens.clear();
    this.animatables.clear();
    this.behaviors.clear();

    if (state.environment) this.setEnvironment(state.environment);
    if (state.camera)      this.setCamera(state.camera);
    for (const light  of Object.values(state.lights  ?? {})) this.createLight(light);
    for (const object of Object.values(state.objects ?? {})) this.createObject(object);
    for (const p of Object.values(state.particles ?? {})) this.createParticles(p);
  }

  // ── Screenshot ────────────────────────────────────────────────────────────────

  takeScreenshot(): string {
    this.scene.render();
    return this.engine.getRenderingCanvas()?.toDataURL('image/png') ?? '';
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private applyTransform(
    mesh: ReturnType<typeof MeshBuilder.CreateBox>,
    def: Partial<SceneObject>,
  ): void {
    if (def.position) mesh.position.set(def.position.x, def.position.y, def.position.z);
    if (def.rotation) mesh.rotation.set(toRad(def.rotation.x), toRad(def.rotation.y), toRad(def.rotation.z));
    if (def.scale)    mesh.scaling.set(def.scale.x,    def.scale.y,    def.scale.z);
  }

  private applyMaterial(
    mesh: ReturnType<typeof MeshBuilder.CreateBox>,
    def: import('./types.js').MaterialDef,
  ): void {
    const color = hexToColor3(def.color ?? '#cccccc');  // neutral grey instead of blue

    // Always use PBR to match Three.js MeshStandardMaterial defaults
    const mat = new PBRMaterial(`mat_${mesh.name}`, this.scene);
    mat.albedoColor = color;
    mat.metallic    = def.metalness ?? 0.3;  // increased from 0.1 for more realistic PBR
    mat.roughness   = def.roughness ?? 0.6;  // slightly smoother (was 0.7)
    if (def.emissive) mat.emissiveColor = hexToColor3(def.emissive);
    if (def.emissiveIntensity !== undefined) mat.emissiveIntensity = def.emissiveIntensity;
    if (def.opacity !== undefined) { mat.alpha = def.opacity; }
    if (def.wireframe) mat.wireframe = true;
    if (def.textureUrl) mat.albedoTexture = new Texture(def.textureUrl, this.scene);
    // Add normal map and roughness map support
    if (def.normalMapUrl) mat.bumpTexture = new Texture(def.normalMapUrl, this.scene);
    if (def.roughnessMapUrl) mat.metallicTexture = new Texture(def.roughnessMapUrl, this.scene);
    mesh.material = mat;
  }
}
