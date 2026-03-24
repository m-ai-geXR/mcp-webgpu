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
});
