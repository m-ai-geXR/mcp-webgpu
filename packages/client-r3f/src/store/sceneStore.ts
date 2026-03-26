/**
 * Zustand store — single source of truth for the R3F scene.
 * Mutations come from the WSClient command dispatcher.
 */
import { create } from 'zustand';
import {
  SceneObject, SceneLight, SceneCamera, EnvironmentDef,
  SceneState, ActiveAnimation,
} from '../types.js';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

export interface SceneStore {
  // Scene data
  objects:     Record<string, SceneObject>;
  lights:      Record<string, SceneLight>;
  camera:      Partial<SceneCamera>;
  environment: Partial<EnvironmentDef>;
  animations:  Record<string, ActiveAnimation>;

  // UI
  wsStatus:          WsStatus;
  aiMessage:         string | null;
  pendingScreenshot: string | null;   // requestId

  // Object mutations
  createObject: (obj: SceneObject) => void;
  updateObject: (obj: Partial<SceneObject> & { id: string }) => void;
  deleteObject: (id: string) => void;

  // Light mutations
  createLight: (light: SceneLight) => void;
  updateLight: (light: Partial<SceneLight> & { id: string }) => void;
  deleteLight: (id: string) => void;

  // Camera + environment
  setCamera:      (cam: Partial<SceneCamera>) => void;
  setEnvironment: (env: Partial<EnvironmentDef>) => void;

  // Full scene reload
  loadScene: (state: SceneState) => void;

  // Animation
  startAnimation: (anim: ActiveAnimation) => void;
  stopAnimation:  (id: string) => void;
  // Called each frame by the useFrame animation loop
  tickAnimation:  (id: string, val: [number, number, number]) => void;

  // UI setters
  setWsStatus:          (s: WsStatus) => void;
  setAIMessage:         (msg: string | null) => void;
  setPendingScreenshot: (requestId: string | null) => void;
}

export const useSceneStore = create<SceneStore>((set, get) => ({
  objects:     {},
  lights:      {},
  camera:      { fov: 60, near: 0.1, far: 2000 },
  environment: { background: '#1a1a2e' },
  animations:  {},

  wsStatus:          'connecting',
  aiMessage:         null,
  pendingScreenshot: null,

  // ── Objects ───────────────────────────────────────────────────────────────
  createObject: (obj) => set((s) => ({ objects: { ...s.objects, [obj.id]: obj } })),

  updateObject: (partial) => set((s) => {
    const existing = s.objects[partial.id];
    if (!existing) return s;
    return { objects: { ...s.objects, [partial.id]: { ...existing, ...partial } } };
  }),

  deleteObject: (id) => set((s) => {
    const { [id]: _, ...rest } = s.objects;
    const { [id]: __, ...anims } = s.animations;
    return { objects: rest, animations: anims };
  }),

  // ── Lights ────────────────────────────────────────────────────────────────
  createLight: (light) => set((s) => ({ lights: { ...s.lights, [light.id]: light } })),

  updateLight: (partial) => set((s) => {
    const existing = s.lights[partial.id];
    if (!existing) return s;
    return { lights: { ...s.lights, [partial.id]: { ...existing, ...partial } } };
  }),

  deleteLight: (id) => set((s) => {
    const { [id]: _, ...rest } = s.lights;
    return { lights: rest };
  }),

  // ── Camera + environment ──────────────────────────────────────────────────
  setCamera: (cam) => set((s) => ({ camera: { ...s.camera, ...cam } })),

  setEnvironment: (env) => set((s) => ({ environment: { ...s.environment, ...env } })),

  // ── Full scene reload ─────────────────────────────────────────────────────
  loadScene: (state) => set(() => ({
    objects:     state.objects     ?? {},
    lights:      state.lights      ?? {},
    camera:      state.camera      ?? {},
    environment: state.environment ?? {},
    animations: {},
  })),

  // ── Animation ─────────────────────────────────────────────────────────────
  startAnimation: (anim) => set((s) => ({ animations: { ...s.animations, [`${anim.id}_${anim.property}`]: anim } })),

  stopAnimation: (id) => set((s) => {
    const animations = { ...s.animations };
    for (const key of Object.keys(animations)) {
      if (key === id || key.startsWith(`${id}_`)) delete animations[key];
    }
    return { animations };
  }),

  tickAnimation: (id, [x, y, z]) => {
    const { animations, objects } = get();
    const anim = animations[id];
    const obj  = objects[id];
    if (!anim || !obj) return;

    const val = { x, y, z } as import('../types.js').Vec3;
    const update = anim.property === 'position'
      ? { position: val }
      : anim.property === 'rotation'
      ? { rotation: val }
      : { scale: val };

    set((s) => ({ objects: { ...s.objects, [id]: { ...s.objects[id], ...update } } }));
  },

  // ── UI ────────────────────────────────────────────────────────────────────
  setWsStatus:          (s) => set(() => ({ wsStatus: s })),
  setAIMessage:         (m) => set(() => ({ aiMessage: m })),
  setPendingScreenshot: (r) => set(() => ({ pendingScreenshot: r })),
}));
