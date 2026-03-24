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
  SceneLoader,
  Animation,
  CircleEase,
  CubicEase,
  EasingFunction,
  WebXRDefaultExperience,
  DynamicTexture,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

import {
  SceneObject,
  SceneLight,
  SceneCamera,
  EnvironmentDef,
  SceneState,
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
  private shadowGen:     ShadowGenerator | null = null;
  private tweens       = new Map<string, ActiveTween>();

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

    // Default hemisphere light (low intensity — server will add its own)
    const hemi = new HemisphericLight('__hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.3;

    // Arc-rotate camera (orbit controls built in)
    this.camera = new ArcRotateCamera('main-cam', -Math.PI / 4, Math.PI / 3, 10, Vector3.Zero(), this.scene);
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 1;
    this.camera.upperRadiusLimit = 200;

    // Simple grid ground plane
    const grid = MeshBuilder.CreateGround('__grid', { width: 30, height: 30, subdivisions: 30 }, this.scene);
    const gridMat = new StandardMaterial('__gridMat', this.scene);
    gridMat.diffuseColor = new Color3(0.15, 0.15, 0.25);
    gridMat.wireframe = true;
    gridMat.backFaceCulling = false;
    grid.material = gridMat;
    grid.position.y = -0.001;
    grid.isPickable = false;

    // Resize handler
    window.addEventListener('resize', () => this.engine.resize());

    // Render loop
    this.engine.runRenderLoop(() => {
      this.advanceTweens();
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

    const w = def.width  ?? 1;
    const h = def.height ?? 1;
    const d = def.depth  ?? 1;
    const r = def.radius ?? 0.5;

    switch (def.type) {
      case 'sphere':
        mesh = MeshBuilder.CreateSphere(def.id, { diameter: r * 2, segments: 32 }, this.scene);
        break;
      case 'cylinder':
        mesh = MeshBuilder.CreateCylinder(def.id, { height: h, diameter: r * 2, tessellation: 32 }, this.scene);
        break;
      case 'cone':
        mesh = MeshBuilder.CreateCylinder(def.id, { height: h, diameterBottom: r * 2, diameterTop: 0, tessellation: 32 }, this.scene);
        break;
      case 'torus':
        mesh = MeshBuilder.CreateTorus(def.id, { diameter: r * 2, thickness: r * 0.8, tessellation: 32 }, this.scene);
        break;
      case 'plane':
        mesh = MeshBuilder.CreatePlane(def.id, { width: w, height: h }, this.scene);
        break;
      case 'capsule':
        mesh = MeshBuilder.CreateCapsule(def.id, { radius: r, height: h + r * 2, tessellation: 16 }, this.scene);
        break;
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
          this.shadowGen = new ShadowGenerator(1024, dl);
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
    property: 'position' | 'rotation' | 'scale',
    to: Vec3,
    duration: number,
    easing: string,
    loop: boolean,
  ): void {
    const mesh = this.meshes.get(id);
    if (!mesh) return;

    // Use Babylon Animation API for smooth tweening
    this.scene.stopAnimation(mesh);

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

    // from is read from mesh.rotation (already radians) or mesh.position/scaling (no conversion needed)
    const fromVec = new Vector3(from.x, from.y, from.z);

    const totalFrames = Math.round(duration * 60);
    anim.setKeys([
      { frame: 0,           value: fromVec },
      { frame: totalFrames, value: toVec   },
    ]);

    mesh.animations = [anim];
    this.scene.beginAnimation(mesh, 0, totalFrames, loop, 1);
  }

  stopAnimation(id: string): void {
    const mesh = this.meshes.get(id);
    if (mesh) this.scene.stopAnimation(mesh);
    this.tweens.delete(id);
  }

  // ── Environment ──────────────────────────────────────────────────────────────

  setEnvironment(env: EnvironmentDef): void {
    if (env.background) {
      const c = hexToColor3(env.background);
      this.scene.clearColor = new Color4(c.r, c.g, c.b, 1);
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
  }

  // ── Full scene rebuild ────────────────────────────────────────────────────────

  loadScene(state: SceneState): void {
    for (const id of [...this.meshes.keys()]) this.deleteObject(id);
    for (const id of [...this.lights.keys()])  this.deleteLight(id);
    this.tweens.clear();

    if (state.environment) this.setEnvironment(state.environment);
    if (state.camera)      this.setCamera(state.camera);
    for (const light  of Object.values(state.lights  ?? {})) this.createLight(light);
    for (const object of Object.values(state.objects ?? {})) this.createObject(object);
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
    const color = hexToColor3(def.color ?? '#4488ff');

    // Always use PBR to match Three.js MeshStandardMaterial defaults
    const mat = new PBRMaterial(`mat_${mesh.name}`, this.scene);
    mat.albedoColor = color;
    mat.metallic    = def.metalness ?? 0.1;
    mat.roughness   = def.roughness ?? 0.7;
    if (def.emissive) mat.emissiveColor = hexToColor3(def.emissive);
    if (def.emissiveIntensity !== undefined) mat.emissiveIntensity = def.emissiveIntensity;
    if (def.opacity !== undefined) { mat.alpha = def.opacity; }
    if (def.wireframe) mat.wireframe = true;
    if (def.textureUrl) mat.albedoTexture = new Texture(def.textureUrl, this.scene);
    mesh.material = mat;
  }
}
