/**
 * Command dispatcher — routes MCP action types to BabylonSceneManager methods.
 */
import { BabylonSceneManager } from '../scene.js';

export function dispatch(scene: BabylonSceneManager, cmd: Record<string, unknown>): void {
  const action = cmd.action as string;
  const payload = (cmd.payload ?? {}) as Record<string, unknown>;

  switch (action) {
    // ── Objects ──────────────────────────────────────────────────────────────
    case 'create-object':
      scene.createObject(payload as Parameters<BabylonSceneManager['createObject']>[0]);
      break;
    case 'update-object':
      scene.updateObject(payload as Parameters<BabylonSceneManager['updateObject']>[0]);
      break;
    case 'delete-object':
      scene.deleteObject(payload.id as string);
      break;

    // ── Lights ───────────────────────────────────────────────────────────────
    case 'create-light':
      scene.createLight(payload as Parameters<BabylonSceneManager['createLight']>[0]);
      break;
    case 'update-light':
      scene.updateLight(payload as Parameters<BabylonSceneManager['updateLight']>[0]);
      break;
    case 'delete-light':
      scene.deleteLight(payload.id as string);
      break;

    // ── Camera ───────────────────────────────────────────────────────────────
    case 'set-camera':
      scene.setCamera(payload as Parameters<BabylonSceneManager['setCamera']>[0]);
      break;
    case 'fly-to-object':
      scene.flyToObject(payload.id as string, payload.distance as number | undefined);
      break;

    // ── Animations ───────────────────────────────────────────────────────────
    case 'animate-object':
      scene.animateObject(
        payload.id       as string,
        payload.property as 'position' | 'rotation' | 'scale',
        payload.to       as { x: number; y: number; z: number },
        payload.duration as number,
        payload.easing   as string,
        payload.loop     as boolean,
      );
      break;
    case 'stop-animation':
      scene.stopAnimation(payload.id as string);
      break;

    // ── Environment ──────────────────────────────────────────────────────────
    case 'set-environment':
      scene.setEnvironment(payload as Parameters<BabylonSceneManager['setEnvironment']>[0]);
      break;

    // ── Full scene ───────────────────────────────────────────────────────────
    case 'load-scene':
      scene.loadScene(payload as Parameters<BabylonSceneManager['loadScene']>[0]);
      break;

    default:
      console.warn('[BabylonClient] Unknown action:', action);
  }
}
