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
    (prompt) => wsClient.sendSystemPrompt(prompt),
  );

  wsClient = new WSClient(WS_URL, FRAMEWORK, {
    onCommand(cmd) {
      const c = cmd as { action: string; requestId?: string };

      if (c.action === 'takeScreenshot') {
        const dataUrl = scene.takeScreenshot();
        wsClient.sendScreenshot(c.requestId ?? '', dataUrl);
        return;
      }

      dispatch(scene, cmd as Record<string, unknown>);
    },

    onAIReply(message) {
      overlay.receiveAIReply(message);
      scene.addVRChatMessage('ai', message);
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

  // ── Clear Scene button ─────────────────────────────────────────────────
  document.getElementById('clear-scene-btn')?.addEventListener('click', () => {
    wsClient.sendClearScene();
  });

  // ── Debug panel (Escape key toggle) ────────────────────────────────────
  const debugPanel = document.getElementById('debug-panel');
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && debugPanel) {
      debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
      if (debugPanel.style.display === 'block') {
        const meshes = scene.scene.meshes.length;
        const lights = scene.scene.lights.length;
        const cam = scene.scene.activeCamera;
        const pos = cam?.position;
        const xrStatus = scene.isPresenting ? '🟢 In VR' : '⚪ Desktop';
        debugPanel.innerHTML = `
          <h3 style="margin:0 0 8px">🛠 Debug Panel</h3>
          <div><b>Meshes:</b> ${meshes}</div>
          <div><b>Lights:</b> ${lights}</div>
          <div><b>Camera pos:</b> (${pos?.x.toFixed(1) ?? '?'}, ${pos?.y.toFixed(1) ?? '?'}, ${pos?.z.toFixed(1) ?? '?'})</div>
          <div><b>XR:</b> ${xrStatus}</div>
          <div style="margin-top:6px;font-size:0.8em;opacity:0.7">Press Escape to close</div>
        `;
      }
    }
  });
}

main();
