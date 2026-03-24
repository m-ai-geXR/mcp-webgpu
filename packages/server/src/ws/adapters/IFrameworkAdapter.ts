import { SceneState, GenericCommand, Framework } from '../../types.js';

/**
 * Translates canonical server commands into framework-specific WebSocket
 * payloads and parses incoming framework state into the canonical SceneState.
 *
 * For Phase 1 all clients share the same generic protocol, so each adapter
 * is mostly a pass-through. Add framework-specific transformations here as
 * needed in later phases.
 */
export interface IFrameworkAdapter {
  framework: Framework;

  /**
   * Transform a generic command before sending to this framework's client.
   * Return the object that will be JSON-serialised and sent over the wire.
   */
  translateCommand(command: GenericCommand): GenericCommand;

  /**
   * Parse raw state received from the browser into the canonical SceneState
   * format so the server's SceneStateManager can store it.
   */
  parseState(raw: unknown): Partial<SceneState>;
}
