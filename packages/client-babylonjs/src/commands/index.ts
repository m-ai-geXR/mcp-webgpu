/**
 * Command dispatcher — routes MCP action types to BabylonSceneManager methods.
 */
import { BabylonSceneManager } from '../scene.js';
import { SceneState, SceneObject, SceneLight, SceneCamera, EnvironmentDef, ParticleDef, BehaviorDef, Vec3 } from '../types.js';

export function dispatch(scene: BabylonSceneManager, cmd: Record<string, unknown>): void {
  const action = cmd.action as string;
  if (!action) return;

  switch (action) {
    // ── Objects ──────────────────────────────────────────────────────────────
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

    // ── Lights ───────────────────────────────────────────────────────────────
    case 'createLight':
      scene.createLight(cmd as unknown as SceneLight);
      break;
    case 'updateLight':
      scene.updateLight(cmd as unknown as Partial<SceneLight> & { id: string });
      break;
    case 'deleteLight':
      scene.deleteLight(cmd['id'] as string);
      break;

    // ── Camera ───────────────────────────────────────────────────────────────
    case 'setCamera':
      scene.setCamera(cmd as unknown as Partial<SceneCamera>);
      break;
    case 'flyToObject': {
      const { id, distance } = cmd as { id: string; distance?: number };
      scene.flyToObject(id, distance);
      break;
    }

    // ── Animations ───────────────────────────────────────────────────────────
    case 'animateObject': {
      const { id, property, to, duration, easing, loop } = cmd as {
        id: string;
        property: string;
        to: Vec3 | number | string;
        duration?: number;
        easing?: string;
        loop?: boolean;
      };
      scene.animateObject(id, property, to, duration ?? 1, easing ?? 'linear', loop ?? false);
      break;
    }
    case 'stopAnimation':
      scene.stopAnimation(cmd['id'] as string);
      break;

    // ── Environment ──────────────────────────────────────────────────────────
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

    // ── Behaviors ────────────────────────────────────────────────────────────
    case 'addBehavior':
      scene.addBehavior(cmd as unknown as BehaviorDef);
      break;
    case 'removeBehavior':
      scene.removeBehavior(cmd['id'] as string);
      break;

    // ── Full scene ───────────────────────────────────────────────────────────
    case 'loadScene': {
      const state = (cmd['state'] ?? cmd) as SceneState;
      scene.loadScene(state);
      // Replay persisted animations
      if (state.animations) {
        for (const anim of Object.values(state.animations)) {
          scene.animateObject(
            anim.id, anim.property,
            anim.to, anim.duration, anim.easing ?? 'linear', anim.loop,
          );
        }
      }
      break;
    }

    // ── Screenshot ───────────────────────────────────────────────────────────
    case 'takeScreenshot': {
      const dataUrl = scene.takeScreenshot();
      // screenshot is handled in main.ts, but accept here as fallback
      console.log('[BabylonClient] takeScreenshot via dispatch');
      break;
    }

    default:
      console.warn('[BabylonClient] Unknown action:', action);
  }
}
