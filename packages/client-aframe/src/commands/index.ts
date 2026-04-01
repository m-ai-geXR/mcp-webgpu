import { AFrameSceneManager } from '../scene.js';
import {
  SceneState,
  SceneObject,
  SceneLight,
  SceneCamera,
  EnvironmentDef,
  ParticleDef,
  BehaviorDef,
  Vec3,
} from '../types.js';

export function dispatch(
  cmd: Record<string, unknown>,
  scene: AFrameSceneManager,
  sendScreenshot: (requestId: string, dataUrl: string) => void,
  sendScriptResult?: (requestId: string, result: string, error?: string) => void,
): void {
  const action = cmd['action'] as string | undefined;
  if (!action) return;

  switch (action) {
    case 'createObject': {
      const createDef = { ...cmd };
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

    case 'createLight':
      scene.createLight(cmd as unknown as SceneLight);
      break;
    case 'updateLight':
      scene.updateLight(cmd as unknown as Partial<SceneLight> & { id: string });
      break;
    case 'deleteLight':
      scene.deleteLight(cmd['id'] as string);
      break;

    case 'setCamera':
      scene.setCamera(cmd as unknown as Partial<SceneCamera>);
      break;
    case 'flyToObject': {
      const { id, distance } = cmd as { id: string; distance?: number };
      scene.flyToObject(id, distance);
      break;
    }

    case 'animateObject': {
      const { id, property, to, duration, easing, loop } = cmd as {
        id: string;
        property: string;
        to: Vec3 | number | string;
        duration?: number;
        easing?: string;
        loop?: boolean;
      };
      scene.animateObject(id, property as any, to as Vec3, duration ?? 1, easing ?? 'linear', loop ?? false);
      break;
    }
    case 'stopAnimation':
      scene.stopAnimation(cmd['id'] as string);
      break;

    case 'setEnvironment':
      scene.setEnvironment(cmd as unknown as EnvironmentDef);
      break;

    // ── Particles ────────────────────────────────────────────────────────────
    case 'createParticles':
      scene.createParticles(cmd as unknown as ParticleDef);
      break;
    case 'updateParticles':
      scene.updateParticles(cmd as unknown as Partial<ParticleDef> & { id: string });
      break;
    case 'deleteParticles':
      scene.deleteParticles(cmd['id'] as string);
      break;

    // ── Behaviors ────────────────────────────────────────────────
    case 'addBehavior':
      scene.addBehavior(cmd as unknown as BehaviorDef);
      break;
    case 'removeBehavior':
      scene.removeBehavior(cmd['id'] as string);
      break;

    case 'loadScene': {
      const state = (cmd['state'] ?? cmd) as SceneState;
      scene.loadScene(state);
      // Replay persisted animations
      if (state.animations) {
        for (const anim of Object.values(state.animations)) {
          scene.animateObject(
            anim.id, anim.property as any,
            anim.to as Vec3, anim.duration, anim.easing ?? 'linear', anim.loop,
          );
        }
      }
      break;
    }

    case 'takeScreenshot': {
      const requestId = cmd['requestId'] as string;
      const dataUrl = scene.takeScreenshot();
      sendScreenshot(requestId, dataUrl);
      break;
    }

    case 'executeScript': {
      const requestId = cmd['requestId'] as string;
      const code = cmd['code'] as string;
      if (sendScriptResult) {
        (async () => {
          try {
            const THREE = await import('three');
            const sceneEl = document.querySelector('a-scene');
            const threeScene = (sceneEl as any)?.object3D;
            const camera = (sceneEl as any)?.camera;
            const renderer = (sceneEl as any)?.renderer;
            const fn = new Function('scene', 'camera', 'renderer', 'THREE',
              `return (async () => { ${code} })();`);
            const result = await fn(threeScene, camera, renderer, THREE);
            sendScriptResult(requestId, result !== undefined ? String(result) : 'undefined');
          } catch (e) {
            sendScriptResult(requestId, '', (e as Error).message);
          }
        })();
      }
      break;
    }

    default:
      console.warn('[commands] Unknown action:', action);
  }
}
