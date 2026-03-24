import { AFrameSceneManager } from '../scene.js';
import {
  SceneState,
  SceneObject,
  SceneLight,
  SceneCamera,
  EnvironmentDef,
  Vec3,
} from '../types.js';

export function dispatch(
  cmd: Record<string, unknown>,
  scene: AFrameSceneManager,
  sendScreenshot: (requestId: string, dataUrl: string) => void,
): void {
  const action = cmd['action'] as string | undefined;
  if (!action) return;

  try {
    _dispatch(cmd, action, scene, sendScreenshot);
  } catch (err) {
    console.error(`[AFrameClient] Error executing action '${action}':`, err);
  }
}

function _dispatch(
  cmd: Record<string, unknown>,
  action: string,
  scene: AFrameSceneManager,
  sendScreenshot: (requestId: string, dataUrl: string) => void,
): void {
  switch (action) {
    case 'clearScene':
      scene.loadScene({ objects: {}, lights: {} } as SceneState);
      break;
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
        property: 'position' | 'rotation' | 'scale';
        to: Vec3;
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

    case 'setEnvironment':
      scene.setEnvironment(cmd as unknown as EnvironmentDef);
      break;

    case 'loadScene':
      scene.loadScene((cmd['state'] ?? cmd) as SceneState);
      break;

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
