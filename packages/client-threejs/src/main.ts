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
