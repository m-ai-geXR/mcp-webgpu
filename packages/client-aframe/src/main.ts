import { AFrameSceneManager } from './scene.js';
import { WSClient } from './ws-client.js';
import { ChatOverlay } from './overlay/ChatOverlay.js';
import { dispatch } from './commands/index.js';
import { registerBloomSystem } from './postprocessing.js';

// Register fallback bloom post-processing before the scene loads
registerBloomSystem();

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
    (temperature, topP) => { wsClient.sendParameters(temperature, topP); },
    (environment) => { wsClient.sendEnvironment(environment); },
  );

  // ── VR chat panel helpers ──────────────────────────────────────────────
  const vrChatPanel = document.getElementById('vr-chat-panel');
  const vrChatText  = document.getElementById('vr-chat-text');
  const vrChatMessages: string[] = [];
  const MAX_VR_MESSAGES = 6;

  function updateVRChatText(): void {
    if (!vrChatText) return;
    const header = '🎮 VR Chat\n─────────────────\n';
    const body = vrChatMessages.length > 0
      ? vrChatMessages.join('\n')
      : 'Press ~ to type…';
    vrChatText.setAttribute('value', header + body);
  }

  function addVRMessage(role: 'user' | 'ai', text: string): void {
    const prefix = role === 'user' ? '🗣  ' : '🤖 ';
    vrChatMessages.push(prefix + text.slice(0, 80));
    while (vrChatMessages.length > MAX_VR_MESSAGES) vrChatMessages.shift();
    updateVRChatText();
  }

  // ── VR mode events ─────────────────────────────────────────────────────
  const sceneEl = document.querySelector('a-scene') as HTMLElement & { is: (s: string) => boolean };
  sceneEl?.addEventListener('enter-vr', () => {
    if (vrChatPanel) vrChatPanel.setAttribute('visible', 'true');
    // Hide DOM overlays in VR
    document.querySelectorAll('#chat-panel, #status, #debug-panel').forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });
  });
  sceneEl?.addEventListener('exit-vr', () => {
    if (vrChatPanel) vrChatPanel.setAttribute('visible', 'false');
    const chatPanel = document.getElementById('chat-panel');
    if (chatPanel) chatPanel.style.display = '';
    const status = document.getElementById('status');
    if (status) status.style.display = '';
  });

  wsClient = new WSClient(WS_URL, FRAMEWORK, {
    onCommand: (cmd) => {
      dispatch(cmd, scene, (requestId, dataUrl) => {
        wsClient.sendScreenshot(requestId, dataUrl);
      }, (requestId, result, error) => {
        wsClient.sendScriptResult(requestId, result, error);
      });
    },
    onAIReply: (message) => {
      overlay.receiveAIReply(message);
      addVRMessage('ai', message);
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
