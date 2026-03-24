import { SceneManager } from './scene.js';
import { WSClient } from './ws-client.js';
import { ChatOverlay } from './overlay/ChatOverlay.js';
import { dispatch } from './commands/index.js';

// ── Read URL params ──────────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const WS_PORT  = params.get('wsPort')    ?? '8083';
const FRAMEWORK = params.get('framework') ?? 'threejs';
const WS_URL   = `ws://localhost:${WS_PORT}`;

// ── Bootstrap Three.js scene ─────────────────────────────────────────────────
const container = document.getElementById('canvas-container')!;
const scene = new SceneManager(container);

// ── Chat overlay ─────────────────────────────────────────────────────────────
let wsClient: WSClient; // forward-declared, assigned below

const overlay = new ChatOverlay(
  (message) => { wsClient.sendUserChat(message); },
  (provider, model) => { wsClient.sendSwitchProvider(provider, model); },
  (prompt) => { wsClient.sendSystemPrompt(prompt); },
);

// ── WebSocket client ──────────────────────────────────────────────────────────

// currentTime is needed for animateObject; we approximate it with performance.now()
wsClient = new WSClient(WS_URL, FRAMEWORK, {
  onCommand: (cmd) => {
    dispatch(cmd, scene, performance.now(), (requestId, dataUrl) => {
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

// ── Periodic scene-state sync (every 5 s) ────────────────────────────────────
// The server is authoritative, this is just a safety net for round-trip queries.
setInterval(() => {
  if (wsClient) {
    const state = buildStateSnapshot();
    wsClient.sendStateUpdate(state);
  }
}, 5000);

function buildStateSnapshot() {
  // We don't have direct access to the Three.js object list from here,
  // so we return a minimal marker — the real state is kept server-side.
  return { _clientSync: true, timestamp: Date.now() };
}

// ── Clear Scene button ───────────────────────────────────────────────────────
document.getElementById('clear-scene-btn')?.addEventListener('click', () => {
  wsClient.sendClearScene();
});

// ── Debug panel (Escape key toggle) ──────────────────────────────────────────
const debugPanel = document.getElementById('debug-panel');
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && debugPanel) {
    debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
    if (debugPanel.style.display === 'block') refreshDebugPanel();
  }
});

function refreshDebugPanel() {
  if (!debugPanel) return;
  const objs = scene.scene.children.filter(c => c.userData['managed']);
  debugPanel.innerHTML = `
    <h3 style="margin:0 0 8px">🛠 Debug Panel</h3>
    <div><b>Scene children:</b> ${scene.scene.children.length}</div>
    <div><b>Managed objects:</b> ${objs.length}</div>
    <div><b>Camera pos:</b> (${scene.camera.position.x.toFixed(1)}, ${scene.camera.position.y.toFixed(1)}, ${scene.camera.position.z.toFixed(1)})</div>
    <div><b>Renderer size:</b> ${scene.renderer.domElement.width}×${scene.renderer.domElement.height}</div>
    <div style="margin-top:6px;font-size:0.8em;opacity:0.7">Press Escape to close</div>
  `;
}
