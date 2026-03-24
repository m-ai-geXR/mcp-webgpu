import { AFrameSceneManager } from './scene.js';
import { WSClient } from './ws-client.js';
import { ChatOverlay } from './overlay/ChatOverlay.js';
import { dispatch } from './commands/index.js';

const params = new URLSearchParams(window.location.search);
const WS_PORT  = params.get('wsPort')    ?? '8083';
const WS_URL   = `ws://localhost:${WS_PORT}`;
const FRAMEWORK = 'aframe';

// Wait for A-Frame to be ready before manipulating the scene
function whenReady(cb: () => void) {
  const scene = document.querySelector('a-scene');
  if (!scene) { cb(); return; }
  if ((scene as Element & { hasLoaded?: boolean }).hasLoaded) {
    cb();
  } else {
    scene.addEventListener('loaded', cb, { once: true });
  }
}

whenReady(() => {
  const scene = new AFrameSceneManager();
  let wsClient: WSClient;

  const overlay = new ChatOverlay(
    (message) => { wsClient.sendUserChat(message); },
    (provider, model) => { wsClient.sendSwitchProvider(provider, model); },
    (prompt) => { wsClient.sendSystemPrompt(prompt); },
  );

  wsClient = new WSClient(WS_URL, FRAMEWORK, {
    onCommand: (cmd) => {
      dispatch(cmd, scene, (requestId, dataUrl) => {
        wsClient.sendScreenshot(requestId, dataUrl);
      });
    },
    onAIReply: (message) => {
      overlay.receiveAIReply(message);
    },
    onStatusChange: (status) => {
      overlay.setStatus(status);
    },
    onProviderConfig: (config) => {
      overlay.updateProviderConfig(config as Parameters<typeof overlay.updateProviderConfig>[0]);
    },
  });

  // Periodic state sync safety net
  setInterval(() => {
    wsClient.sendStateUpdate({ _clientSync: true, timestamp: Date.now() });
  }, 5000);

  // ── Clear Scene button ───────────────────────────────────────────────────
  document.getElementById('clear-scene-btn')?.addEventListener('click', () => {
    wsClient.sendClearScene();
  });

  // ── Debug panel (Escape key toggle) ────────────────────────────────────
  const debugPanel = document.getElementById('debug-panel');
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && debugPanel) {
      debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
      if (debugPanel.style.display === 'block') {
        const sceneEl = document.querySelector('a-scene');
        const entities = sceneEl?.querySelectorAll('[id]') ?? [];
        debugPanel.innerHTML = `
          <h3 style="margin:0 0 8px">🛠 Debug Panel</h3>
          <div><b>A-Frame entities:</b> ${entities.length}</div>
          <div><b>Scene loaded:</b> ${(sceneEl as any)?.hasLoaded ?? false}</div>
          <div style="margin-top:6px;font-size:0.8em;opacity:0.7">Press Escape to close</div>
        `;
      }
    }
  });
});
