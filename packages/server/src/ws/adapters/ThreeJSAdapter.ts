import { SceneState, GenericCommand } from '../../types.js';
import { IFrameworkAdapter } from './IFrameworkAdapter.js';

/** Three.js adapter — commands and state use the canonical format directly. */
export class ThreeJSAdapter implements IFrameworkAdapter {
  framework = 'threejs' as const;

  translateCommand(command: GenericCommand): GenericCommand {
    // Three.js client already understands the canonical format
    return command;
  }

  parseState(raw: unknown): Partial<SceneState> {
    if (raw && typeof raw === 'object') {
      return raw as Partial<SceneState>;
    }
    return {};
  }
}
