import { SceneState, GenericCommand } from '../../types.js';
import { IFrameworkAdapter } from './IFrameworkAdapter.js';

/**
 * Babylon.js adapter.
 * Babylon uses the same {x, y, z} vector format, so translation is minimal.
 * Rotation arrives in radians from Babylon; we keep degrees in canonical form
 * and convert when sending commands to the client.
 */
export class BabylonAdapter implements IFrameworkAdapter {
  framework = 'babylonjs' as const;

  private toRad = (deg: number) => (deg * Math.PI) / 180;
  private toDeg = (rad: number) => (rad * 180) / Math.PI;

  translateCommand(command: GenericCommand): GenericCommand {
    const cmd = { ...command };
    // Convert canonical degrees → Babylon radians for rotation
    if (cmd['rotation'] && typeof cmd['rotation'] === 'object') {
      const r = cmd['rotation'] as { x: number; y: number; z: number };
      cmd['rotation'] = {
        x: this.toRad(r.x),
        y: this.toRad(r.y),
        z: this.toRad(r.z),
      };
    }
    return cmd;
  }

  parseState(raw: unknown): Partial<SceneState> {
    if (!raw || typeof raw !== 'object') return {};
    const state = raw as Record<string, unknown>;

    // Convert Babylon radians → canonical degrees in object rotations
    const objects = state['objects'] as Record<string, Record<string, unknown>> | undefined;
    if (objects) {
      for (const obj of Object.values(objects)) {
        const rot = obj['rotation'] as { x: number; y: number; z: number } | undefined;
        if (rot) {
          obj['rotation'] = { x: this.toDeg(rot.x), y: this.toDeg(rot.y), z: this.toDeg(rot.z) };
        }
      }
    }

    return state as unknown as Partial<SceneState>;
  }
}
