/**
 * Command dispatcher — routes MCP action types to Zustand store mutations.
 * Server sends camelCase actions with data at cmd top-level (no payload wrapper).
 * `wrapCommand()` renames `type` → `objectType` to avoid colliding with the
 * message-level `type: 'command'` field, so we map it back here.
 */
import { useSceneStore } from '../store/sceneStore.js';
import { ActiveAnimation, AnimationDef, ParticleDef, BehaviorDef, SceneObject, SceneLight, SceneCamera, EnvironmentDef, SceneState } from '../types.js';

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
      if (!obj) break;
      const prop = cmd.property as string;
      if (prop.startsWith('material.')) {
        // Material animation — store scalar/color values
        const mesh = obj;
        const mat = mesh.material;
        const subProp = prop.split('.')[1];
        const anim: ActiveAnimation = {
          id:        cmd.id as string,
          property:  prop,
          fromX: 0, fromY: 0, fromZ: 0,
          toX: 0, toY: 0, toZ: 0,
          startTime: performance.now(),
          duration:  ((cmd.duration as number) ?? 1) * 1000,
          easing:    (cmd.easing as ActiveAnimation['easing']) ?? 'linear',
          loop:      (cmd.loop as boolean) ?? false,
        };
        if (subProp === 'emissiveIntensity' || subProp === 'opacity') {
          anim.fromScalar = (mat as any)?.[subProp] ?? (subProp === 'opacity' ? 1 : 0);
          anim.toScalar = cmd.to as number;
        } else if (subProp === 'color') {
          anim.fromColor = mat?.color ?? '#ffffff';
          anim.toColor = cmd.to as string;
        }
        store.startAnimation(anim);
      } else {
        const from = obj[prop as 'position' | 'rotation' | 'scale'] ?? { x: 0, y: 0, z: 0 };
        const to   = cmd.to as { x: number; y: number; z: number };
        const anim: ActiveAnimation = {
          id:        cmd.id       as string,
          property:  prop,
          fromX: (from as {x:number}).x, fromY: (from as {y:number}).y, fromZ: (from as {z:number}).z,
          toX: to.x,  toY: to.y,   toZ: to.z,
          startTime: performance.now(),
          duration:  ((cmd.duration as number) ?? 1) * 1000,
          easing:    (cmd.easing   as ActiveAnimation['easing']) ?? 'linear',
          loop:      (cmd.loop     as boolean) ?? false,
        };
        store.startAnimation(anim);
      }
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
    case 'loadScene': {
      const state = ((cmd.state ?? cmd) as unknown) as SceneState;
      store.loadScene(state);
      // Replay persisted animations
      if (state.animations) {
        const freshStore = useSceneStore.getState();
        for (const anim of Object.values(state.animations) as AnimationDef[]) {
          const obj = freshStore.objects[anim.id];
          if (!obj) continue;
          const from = obj[anim.property as 'position' | 'rotation' | 'scale'] ?? { x: 0, y: 0, z: 0 };
          const active: ActiveAnimation = {
            id: anim.id,
            property: anim.property as 'position' | 'rotation' | 'scale',
            fromX: (from as { x: number }).x, fromY: (from as { y: number }).y, fromZ: (from as { z: number }).z,
            toX: anim.to.x, toY: anim.to.y, toZ: anim.to.z,
            startTime: performance.now(),
            duration: (anim.duration ?? 1) * 1000,
            easing: (anim.easing as ActiveAnimation['easing']) ?? 'linear',
            loop: anim.loop ?? false,
          };
          freshStore.startAnimation(active);
        }
      }
      break;
    }

    // ── Clear scene ───────────────────────────────────────────────────────────
    case 'clearScene':
      store.loadScene({ objects: {}, lights: {}, particles: {}, behaviors: {}, camera: {}, environment: {} } as SceneState);
      break;

    // ── Particles ────────────────────────────────────────────────────────
    case 'createParticles':
      store.createParticles(cmd as unknown as ParticleDef);
      break;
    case 'updateParticles':
      store.updateParticles(cmd as unknown as Partial<ParticleDef> & { id: string });
      break;
    case 'deleteParticles':
      store.deleteParticles(cmd.id as string);
      break;

    // ── Behaviors ─────────────────────────────────────────────────────────────
    case 'addBehavior':
      store.addBehavior(cmd as unknown as BehaviorDef);
      break;
    case 'removeBehavior':
      store.removeBehavior(cmd.id as string);
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
