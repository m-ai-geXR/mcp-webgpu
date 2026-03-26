/**
 * Command dispatcher — routes MCP action types to Zustand store mutations.
 * Server sends camelCase actions with data at cmd top-level (no payload wrapper).
 * `wrapCommand()` renames `type` → `objectType` to avoid colliding with the
 * message-level `type: 'command'` field, so we map it back here.
 */
import { useSceneStore } from '../store/sceneStore.js';
import { ActiveAnimation, SceneObject, SceneLight, SceneCamera, EnvironmentDef, SceneState } from '../types.js';

type Cmd = Record<string, unknown>;

/**
 * Dispatch an incoming MCP command to the Zustand store.
 * Returns a requestId if the command is takeScreenshot (so the caller can handle it).
 */
export function dispatch(cmd: Cmd): string | null {
  const store  = useSceneStore.getState();
  const action = cmd.action as string;
  if (!action) return null;

  switch (action) {
    // ── Objects ───────────────────────────────────────────────────────────────
    case 'createObject': {
      const def = { ...cmd } as Cmd;
      if (def['objectType']) def['type'] = def['objectType'];
      store.createObject(def as unknown as SceneObject);
      break;
    }
    case 'updateObject': {
      const def = { ...cmd } as Cmd;
      if (def['objectType']) def['type'] = def['objectType'];
      store.updateObject(def as unknown as Partial<SceneObject> & { id: string });
      break;
    }
    case 'deleteObject':
      store.deleteObject(cmd.id as string);
      break;

    // ── Lights ────────────────────────────────────────────────────────────────
    case 'createLight':
      store.createLight(cmd as unknown as SceneLight);
      break;
    case 'updateLight':
      store.updateLight(cmd as unknown as Partial<SceneLight> & { id: string });
      break;
    case 'deleteLight':
      store.deleteLight(cmd.id as string);
      break;

    // ── Camera ────────────────────────────────────────────────────────────────
    case 'setCamera':
    case 'flyToObject':
      store.setCamera(cmd as unknown as Partial<SceneCamera>);
      break;

    // ── Animation ─────────────────────────────────────────────────────────────
    case 'animateObject': {
      const obj = store.objects[cmd.id as string];
      if (!obj) console.warn(`[R3F] animateObject: object "${cmd.id}" not in store yet, using defaults`);
      const prop = cmd.property as 'position' | 'rotation' | 'scale';
      const from = obj?.[prop] ?? { x: 0, y: 0, z: 0 };
      const to   = cmd.to as { x: number; y: number; z: number };
      const anim: ActiveAnimation = {
        id:        cmd.id       as string,
        property:  prop,
        fromX: (from as {x:number}).x, fromY: (from as {y:number}).y, fromZ: (from as {z:number}).z,
        toX: to.x,  toY: to.y,   toZ: to.z,
        startTime: performance.now(),
        duration:  (cmd.duration as number) * 1000,
        easing:    (cmd.easing   as ActiveAnimation['easing']) ?? 'linear',
        loop:      (cmd.loop     as boolean) ?? false,
      };
      store.startAnimation(anim);
      break;
    }
    case 'stopAnimation':
      store.stopAnimation(cmd.id as string);
      break;

    // ── Environment ───────────────────────────────────────────────────────────
    case 'setEnvironment':
      store.setEnvironment(cmd as unknown as Partial<EnvironmentDef>);
      break;

    // ── Full scene ────────────────────────────────────────────────────────────
    case 'loadScene':
      store.loadScene(((cmd.state ?? cmd) as unknown) as SceneState);
      break;

    // ── Clear scene ───────────────────────────────────────────────────────────
    case 'clearScene':
      store.loadScene({ objects: {}, lights: {}, camera: {}, environment: {} } as SceneState);
      break;

    // ── Screenshot ────────────────────────────────────────────────────────────
    case 'takeScreenshot':
      store.setPendingScreenshot(cmd.requestId as string ?? '');
      return cmd.requestId as string ?? '';

    default:
      console.warn('[R3F Client] Unknown action:', action);
  }
  return null;
}
