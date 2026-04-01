import { v4 as uuidv4 } from 'uuid';
import {
  SceneState,
  SceneObject,
  SceneLight,
  SceneCamera,
  EnvironmentDef,
  AnimationDef,
  ParticleDef,
  MaterialDef,
  Vec3,
} from '../types.js';
import { UndoStack } from './UndoStack.js';

const DEFAULT_STATE: SceneState = {
  objects: {},
  animations: {},
  particles: {},
  lights: {
    'ambient-default': {
      id: 'ambient-default',
      lightType: 'ambient',
      color: '#ffffff',
      intensity: 0.5,
    },
    'directional-default': {
      id: 'directional-default',
      lightType: 'directional',
      color: '#ffffff',
      intensity: 1.0,
      position: { x: 5, y: 10, z: 5 },
      target: { x: 0, y: 0, z: 0 },
      castShadow: true,
    },
  },
  camera: {
    position: { x: 6, y: 5, z: 6 },
    target: { x: 0, y: 0, z: 0 },
    fov: 60,
    near: 0.1,
    far: 1000,
  },
  environment: {
    background: '#1a1a2e',
    shadows: true,
    toneMapping: 'aces',
    exposure: 1.0,
  },
};

export class SceneStateManager {
  private state: SceneState;
  private undoStack: UndoStack<SceneState>;

  constructor() {
    this.state = this.clone(DEFAULT_STATE);
    this.undoStack = new UndoStack<SceneState>(20);
  }

  private clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T;
  }

  private snapshot(): void {
    this.undoStack.push(this.clone(this.state));
  }

  getState(): SceneState {
    return this.clone({ ...this.state, timestamp: Date.now() });
  }

  /** Merge an incoming state patch from the browser. */
  updateFromClient(raw: unknown): void {
    if (!raw || typeof raw !== 'object') return;
    const s = raw as Partial<SceneState>;
    if (s.objects) this.state.objects = s.objects;
    if (s.lights) this.state.lights = s.lights;
    if (s.camera) this.state.camera = s.camera;
    if (s.environment) this.state.environment = s.environment;
  }

  // ─── Objects ──────────────────────────────────────────────────────────────

  createObject(params: {
    type: string;
    id?: string;
    position?: Partial<Vec3>;
    rotation?: Partial<Vec3>;
    scale?: Partial<Vec3>;
    material?: MaterialDef;
    [key: string]: unknown;
  }): SceneObject {
    this.snapshot();
    const id = (params.id as string | undefined) ?? `${params.type}-${uuidv4().slice(0, 8)}`;

    const obj: SceneObject = {
      id,
      type: params.type,
      position: { x: 0, y: 0, z: 0, ...(params.position ?? {}) },
      rotation: { x: 0, y: 0, z: 0, ...(params.rotation ?? {}) },
      scale: { x: 1, y: 1, z: 1, ...(params.scale ?? {}) },
      material: params.material ?? { type: 'standard', color: '#4488ff' },
      visible: true,
      castShadow: true,
      receiveShadow: true,
    };

    // Copy extra geometry params
    const skip = new Set(['id', 'type', 'position', 'rotation', 'scale', 'material']);
    for (const [k, v] of Object.entries(params)) {
      if (!skip.has(k)) obj[k] = v;
    }

    this.state.objects[id] = obj;
    return this.clone(obj);
  }

  updateObject(id: string, properties: Partial<SceneObject>): SceneObject | null {
    const obj = this.state.objects[id];
    if (!obj) return null;
    this.snapshot();

    // Deep-merge material
    if (properties.material && obj.material) {
      obj.material = { ...obj.material, ...properties.material };
      const { material: _m, ...rest } = properties;
      void _m;
      Object.assign(obj, rest);
    } else {
      Object.assign(obj, properties);
    }

    return this.clone(obj);
  }

  deleteObject(id: string): boolean {
    if (!this.state.objects[id]) return false;
    this.snapshot();
    delete this.state.objects[id];
    this.removeAnimation(id);
    return true;
  }

  getObject(id: string): SceneObject | null {
    const obj = this.state.objects[id];
    return obj ? this.clone(obj) : null;
  }

  cloneObject(id: string, newId?: string, offset?: Partial<Vec3>): SceneObject | null {
    const obj = this.state.objects[id];
    if (!obj) return null;
    this.snapshot();

    const cloned: SceneObject = this.clone(obj);
    cloned.id = newId ?? `${obj.type}-${uuidv4().slice(0, 8)}`;
    if (offset) {
      cloned.position.x += offset.x ?? 0;
      cloned.position.y += offset.y ?? 0;
      cloned.position.z += offset.z ?? 0;
    }
    this.state.objects[cloned.id] = cloned;
    return this.clone(cloned);
  }

  // ─── Lights ───────────────────────────────────────────────────────────────

  createLight(params: {
    lightType: SceneLight['lightType'];
    id?: string;
    color?: string;
    intensity?: number;
    position?: Partial<Vec3>;
    target?: Partial<Vec3>;
    [key: string]: unknown;
  }): SceneLight {
    this.snapshot();
    const id = (params.id as string | undefined) ?? `${params.lightType}-${uuidv4().slice(0, 8)}`;

    const light: SceneLight = {
      id,
      lightType: params.lightType,
      color: (params.color as string | undefined) ?? '#ffffff',
      intensity: (params.intensity as number | undefined) ?? 1.0,
      position: params.position ? { x: 0, y: 0, z: 0, ...params.position } : undefined,
      target: params.target ? { x: 0, y: 0, z: 0, ...params.target } : undefined,
    };

    const skip = new Set(['id', 'lightType', 'color', 'intensity', 'position', 'target']);
    for (const [k, v] of Object.entries(params)) {
      if (!skip.has(k)) (light as unknown as Record<string, unknown>)[k] = v;
    }

    this.state.lights[id] = light;
    return this.clone(light);
  }

  updateLight(id: string, properties: Partial<SceneLight>): SceneLight | null {
    const light = this.state.lights[id];
    if (!light) return null;
    this.snapshot();
    Object.assign(light, properties);
    return this.clone(light);
  }

  deleteLight(id: string): boolean {
    if (!this.state.lights[id]) return false;
    this.snapshot();
    delete this.state.lights[id];
    return true;
  }

  // ─── Camera ───────────────────────────────────────────────────────────────

  setCamera(params: Partial<SceneCamera>): SceneCamera {
    this.snapshot();
    Object.assign(this.state.camera, params);
    return this.clone(this.state.camera);
  }

  // ─── Environment ──────────────────────────────────────────────────────────

  setEnvironment(params: Partial<EnvironmentDef>): EnvironmentDef {
    this.snapshot();
    Object.assign(this.state.environment, params);
    return this.clone(this.state.environment);
  }

  // ─── Scene ops ────────────────────────────────────────────────────────────

  clearScene(): void {
    this.snapshot();
    this.state.objects = {};
    this.state.animations = {};
    this.state.particles = {};
    this.state.lights = this.clone(DEFAULT_STATE.lights);
  }

  loadScene(sceneJson: SceneState): void {
    this.snapshot();
    this.state = this.clone(sceneJson);
  }

  undo(): boolean {
    const prev = this.undoStack.undo(this.clone(this.state));
    if (!prev) return false;
    this.state = prev;
    return true;
  }

  redo(): boolean {
    const next = this.undoStack.redo(this.clone(this.state));
    if (!next) return false;
    this.state = next;
    return true;
  }

  // ─── Animations ─────────────────────────────────────────────────────────────

  addAnimation(def: AnimationDef): void {
    if (!this.state.animations) this.state.animations = {};
    this.state.animations[`${def.id}_${def.property}`] = def;
  }

  removeAnimation(objectId: string): void {
    if (!this.state.animations) return;
    for (const key of Object.keys(this.state.animations)) {
      if (key === objectId || key.startsWith(`${objectId}_`)) {
        delete this.state.animations[key];
      }
    }
  }

  removeObjectAnimations(objectId: string): void {
    this.removeAnimation(objectId);
  }

  // ─── Particles ─────────────────────────────────────────────────────────────

  createParticles(params: {
    id?: string;
    position?: Partial<Vec3>;
    count?: number;
    spread?: Partial<Vec3>;
    size?: number;
    color?: string;
    emissive?: string;
    emissiveIntensity?: number;
    opacity?: number;
    speed?: number;
    drift?: Partial<Vec3>;
    sizeAttenuation?: boolean;
    twinkle?: boolean;
    blending?: 'additive' | 'normal';
  }): ParticleDef {
    this.snapshot();
    const id = params.id ?? `particles-${uuidv4().slice(0, 8)}`;
    const def: ParticleDef = {
      id,
      position: { x: 0, y: 0, z: 0, ...(params.position ?? {}) },
      count: params.count ?? 500,
      spread: { x: 10, y: 10, z: 10, ...(params.spread ?? {}) },
      size: params.size ?? 0.1,
      color: params.color ?? '#ffffff',
      emissive: params.emissive,
      emissiveIntensity: params.emissiveIntensity,
      opacity: params.opacity ?? 0.8,
      speed: params.speed ?? 0,
      drift: params.drift ? { x: 0, y: 0, z: 0, ...params.drift } : undefined,
      sizeAttenuation: params.sizeAttenuation ?? true,
      twinkle: params.twinkle ?? false,
      blending: params.blending ?? 'additive',
    };
    if (!this.state.particles) this.state.particles = {};
    this.state.particles[id] = def;
    return this.clone(def);
  }

  updateParticles(id: string, properties: Partial<ParticleDef>): ParticleDef | null {
    if (!this.state.particles?.[id]) return null;
    this.snapshot();
    Object.assign(this.state.particles[id], properties);
    return this.clone(this.state.particles[id]);
  }

  deleteParticles(id: string): boolean {
    if (!this.state.particles?.[id]) return false;
    this.snapshot();
    delete this.state.particles[id];
    return true;
  }
}
