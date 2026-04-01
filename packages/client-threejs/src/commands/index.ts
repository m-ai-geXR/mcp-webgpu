import { SceneManager } from '../scene.js';
import { SceneState, SceneObject, SceneLight, SceneCamera, EnvironmentDef, AnimationDef, ParticleDef, Vec3 } from '../types.js';

/** Dispatch a raw command (from the server) to the SceneManager. */
export function dispatch(
  cmd: Record<string, unknown>,
  scene: SceneManager,
  currentTime: number,
  sendScreenshot: (requestId: string, dataUrl: string) => void,
): void {
  const action = cmd['action'] as string | undefined;
  if (!action) return;

  switch (action) {
    // ── Objects ─────────────────────────────────────────────────
    case 'createObject': {
      const createDef = { ...cmd };
      // WSServer renames 'type' to 'objectType' to avoid WS message type collision
      if (createDef['objectType']) createDef['type'] = createDef['objectType'];
      scene.createObject(createDef as unknown as SceneObject);
      break;
    }

    case 'updateObject': {
      const updateDef = { ...cmd };
      if (updateDef['objectType']) updateDef['type'] = updateDef['objectType'];
      scene.updateObject(updateDef as unknown as Partial<SceneObject> & { id: string });
      break;
    }

    case 'deleteObject':
      scene.deleteObject(cmd['id'] as string);
      break;

    // ── Lights ──────────────────────────────────────────────────
    case 'createLight':
      scene.createLight(cmd as unknown as SceneLight);
      break;

    case 'updateLight':
      scene.updateLight(cmd as unknown as Partial<SceneLight> & { id: string });
      break;

    case 'deleteLight':
      scene.deleteLight(cmd['id'] as string);
      break;

    // ── Camera ──────────────────────────────────────────────────
    case 'setCamera':
      scene.setCamera(cmd as unknown as Partial<SceneCamera>);
      break;

    case 'flyToObject': {
      const { id, distance, duration } = cmd as { id: string; distance?: number; duration?: number };
      scene.flyToObject(id, distance, duration);
      break;
    }

    // ── Animation ────────────────────────────────────────────────
    case 'animateObject': {
      const { id, property, to, duration, easing, loop } = cmd as {
        id: string;
        property: string;
        to: Vec3 | number | string;
        duration?: number;
        easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
        loop?: boolean;
      };
      scene.animateObject(id, property, to, duration ?? 1, easing ?? 'linear', loop ?? false, currentTime);
      break;
    }

    case 'stopAnimation':
      scene.stopAnimation(cmd['id'] as string);
      break;

    // ── Environment ──────────────────────────────────────────────
    case 'setEnvironment':
      scene.setEnvironment(cmd as unknown as EnvironmentDef);
      break;

    // ── Full scene ───────────────────────────────────────────────
    case 'loadScene': {
      const state = (cmd['state'] ?? cmd) as SceneState;
      scene.loadScene(state);
      // Replay persisted animations
      if (state.animations) {
        for (const anim of Object.values(state.animations)) {
          scene.animateObject(
            anim.id, anim.property,
            anim.to, anim.duration, (anim.easing as 'linear' | 'easeIn' | 'easeOut' | 'easeInOut') ?? 'linear',
            anim.loop, currentTime,
          );
        }
      }
      break;
    }

    // ── Particles ────────────────────────────────────────────────
    case 'createParticles':
      scene.createParticles(cmd as unknown as ParticleDef);
      break;

    case 'updateParticles':
      scene.updateParticles(cmd as unknown as Partial<ParticleDef> & { id: string });
      break;

    case 'deleteParticles':
      scene.deleteParticles(cmd['id'] as string);
      break;

    // ── Screenshot ───────────────────────────────────────────────
    case 'takeScreenshot': {
      const requestId = cmd['requestId'] as string;
      const dataUrl = scene.takeScreenshot();
      sendScreenshot(requestId, dataUrl);
      break;
    }

    default:
      console.warn('[commands] Unknown action:', action);
  }
}
