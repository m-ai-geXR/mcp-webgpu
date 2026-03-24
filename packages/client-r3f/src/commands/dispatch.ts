/**
 * Command dispatcher — routes MCP action types to Zustand store mutations.
 */
import { useSceneStore } from '../store/sceneStore.js';
import { ActiveAnimation, SceneObject, SceneLight, SceneCamera, EnvironmentDef, SceneState } from '../types.js';

type Cmd = Record<string, unknown>;

/**
 * Dispatch an incoming MCP command to the Zustand store.
 * Call this from the WSClient onCommand handler.
 * Returns a requestId if the command is take-screenshot (so the caller can handle it).
 */
export function dispatch(cmd: Cmd): string | null {
  const store  = useSceneStore.getState();
  const action  = cmd.action as string;
  const payload = (cmd.payload ?? {}) as Cmd;

  switch (action) {
    // ── Objects ───────────────────────────────────────────────────────────────
    case 'create-object':
      store.createObject(payload as SceneObject);
      break;
    case 'update-object':
      store.updateObject(payload as Partial<SceneObject> & { id: string });
      break;
    case 'delete-object':
      store.deleteObject(payload.id as string);
      break;

    // ── Lights ────────────────────────────────────────────────────────────────
    case 'create-light':
      store.createLight(payload as unknown as SceneLight);
      break;
    case 'update-light':
      store.updateLight(payload as Partial<SceneLight> & { id: string });
      break;
    case 'delete-light':
      store.deleteLight(payload.id as string);
      break;

    // ── Camera ────────────────────────────────────────────────────────────────
    case 'set-camera':
    case 'fly-to-object':
      store.setCamera(payload as Partial<SceneCamera>);
      break;

    // ── Animation ─────────────────────────────────────────────────────────────
    case 'animate-object': {
      const obj = store.objects[payload.id as string];
      if (!obj) break;
      const prop = payload.property as 'position' | 'rotation' | 'scale';
      const from = obj[prop] ?? { x: 0, y: 0, z: 0 };
      const to   = payload.to as { x: number; y: number; z: number };
      const anim: ActiveAnimation = {
        id:        payload.id       as string,
        property:  prop,
        fromX: (from as {x:number}).x, fromY: (from as {y:number}).y, fromZ: (from as {z:number}).z,
        toX: to.x,  toY: to.y,   toZ: to.z,
        startTime: performance.now(),
        duration:  (payload.duration as number) * 1000,
        easing:    (payload.easing   as ActiveAnimation['easing']) ?? 'easeInOut',
        loop:      (payload.loop     as boolean) ?? false,
      };
      store.startAnimation(anim);
      break;
    }
    case 'stop-animation':
      store.stopAnimation(payload.id as string);
      break;

    // ── Environment ───────────────────────────────────────────────────────────
    case 'set-environment':
      store.setEnvironment(payload as Partial<EnvironmentDef>);
      break;

    // ── Full scene ────────────────────────────────────────────────────────────
    case 'load-scene':
      store.loadScene(payload as unknown as SceneState);
      break;

    // ── Screenshot ────────────────────────────────────────────────────────────
    case 'take-screenshot':
      store.setPendingScreenshot(cmd.requestId as string ?? '');
      return cmd.requestId as string ?? '';

    default:
      console.warn('[R3F Client] Unknown action:', action);
  }
  return null;
}
