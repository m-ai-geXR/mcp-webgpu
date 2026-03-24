import { SceneState, GenericCommand, Vec3 } from '../../types.js';
import { IFrameworkAdapter } from './IFrameworkAdapter.js';

/**
 * React Three Fiber adapter.
 * R3F uses array tuples [x, y, z] for position / rotation / scale props.
 * We translate from canonical {x,y,z} objects ↔ arrays.
 */
export class R3FAdapter implements IFrameworkAdapter {
  framework = 'r3f' as const;

  private toArr = (v: Vec3): [number, number, number] => [v.x, v.y, v.z];
  private fromArr = (a: unknown): Vec3 | undefined => {
    if (Array.isArray(a) && a.length >= 3) {
      return { x: Number(a[0]), y: Number(a[1]), z: Number(a[2]) };
    }
    return undefined;
  };

  translateCommand(command: GenericCommand): GenericCommand {
    const cmd = { ...command };
    for (const key of ['position', 'rotation', 'scale']) {
      const v = cmd[key] as Vec3 | undefined;
      if (v && typeof v === 'object' && 'x' in v) {
        cmd[key] = this.toArr(v) as unknown as Vec3;
      }
    }
    return cmd;
  }

  parseState(raw: unknown): Partial<SceneState> {
    if (!raw || typeof raw !== 'object') return {};
    const state = raw as Record<string, unknown>;

    const objects = state['objects'] as Record<string, Record<string, unknown>> | undefined;
    if (objects) {
      for (const obj of Object.values(objects)) {
        for (const key of ['position', 'rotation', 'scale']) {
          const v = this.fromArr(obj[key]);
          if (v) obj[key] = v;
        }
      }
    }

    return state as unknown as Partial<SceneState>;
  }
}
