import { SceneState, GenericCommand, Vec3 } from '../../types.js';
import { IFrameworkAdapter } from './IFrameworkAdapter.js';

/**
 * A-Frame adapter.
 * A-Frame uses space-separated string vectors: "x y z".
 * We normalise those to {x,y,z} objects for the canonical format.
 */
export class AFrameAdapter implements IFrameworkAdapter {
  framework = 'aframe' as const;

  translateCommand(command: GenericCommand): GenericCommand {
    // Translate Vec3 position/rotation/scale to A-Frame string format
    const translated = { ...command };
    for (const key of ['position', 'rotation', 'scale'] as const) {
      const v = translated[key] as Vec3 | undefined;
      if (v && typeof v === 'object' && 'x' in v) {
        translated[key] = `${v.x} ${v.y} ${v.z}` as unknown as Vec3;
      }
    }
    return translated;
  }

  parseState(raw: unknown): Partial<SceneState> {
    if (!raw || typeof raw !== 'object') return {};
    const state = raw as Record<string, unknown>;

    // Normalise A-Frame string vectors back to {x,y,z}
    const normaliseVec = (v: unknown): Vec3 | undefined => {
      if (!v) return undefined;
      if (typeof v === 'string') {
        const [x = 0, y = 0, z = 0] = v.split(' ').map(Number);
        return { x, y, z };
      }
      if (typeof v === 'object' && 'x' in (v as object)) return v as Vec3;
      return undefined;
    };

    const objects = state['objects'] as Record<string, Record<string, unknown>> | undefined;
    if (objects) {
      for (const obj of Object.values(objects)) {
        for (const key of ['position', 'rotation', 'scale']) {
          const n = normaliseVec(obj[key]);
          if (n) obj[key] = n;
        }
      }
    }

    return state as unknown as Partial<SceneState>;
  }
}
