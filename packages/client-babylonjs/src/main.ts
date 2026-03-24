/**
 * Entry point for the Babylon.js client.
 */
import { BabylonSceneManager } from './scene.js';
import { WSClient }            from './ws-client.js';
import { ChatOverlay }         from './overlay/ChatOverlay.js';
import { dispatch }            from './commands/index.js';

const WS_URL   = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:8083';
const FRAMEWORK = 'babylonjs';

let wsClient: WSClient;

function main(): void {
  const canvas = document.getElementById('babylon-canvas') as HTMLCanvasElement;
  const scene  = new BabylonSceneManager(canvas);

  const overlay = new ChatOverlay(
    (msg) => wsClient.sendUserChat(msg),
    (provider, model) => wsClient.sendSwitchProvider(provider, model),
  );

  wsClient = new WSClient(WS_URL, FRAMEWORK, {
    onCommand(cmd) {
      const c = cmd as { action: string; payload?: unknown; requestId?: string };

      if (c.action === 'take-screenshot') {
        const dataUrl = scene.takeScreenshot();
        wsClient.sendScreenshot(c.requestId ?? '', dataUrl);
        return;
      }

      dispatch(scene, cmd as Record<string, unknown>);
    },

    onAIReply(message) {
      overlay.receiveAIReply(message);
    },

    onStatusChange(status) {
      overlay.setStatus(status);
    },

    onProviderConfig(config) {
      overlay.updateProviderConfig(config as Parameters<typeof overlay.updateProviderConfig>[0]);
    },
  });

  // Periodic state ping so the server can track active sessions
  setInterval(() => {
    wsClient.sendStateUpdate({ _clientSync: true, framework: FRAMEWORK });
  }, 5000);

  // Keep WebSocket alive during long idle periods
  setInterval(() => wsClient.sendPing(), 25_000);
}

main();
