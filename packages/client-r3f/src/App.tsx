/// <reference types="vite/client" />

/**
 * App — top-level React component.
 * Mounts the R3F canvas and wires up WSClient + ChatOverlay.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { SceneCanvas, xrStore } from './SceneCanvas.js';
import { WSClient }    from './ws-client.js';
import { ChatOverlay } from './overlay/ChatOverlay.js';
import { dispatch }    from './commands/dispatch.js';
import { useSceneStore } from './store/sceneStore.js';

const WS_URL    = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:8083';
const FRAMEWORK = 'r3f';

export function App() {
  const wsRef      = useRef<WSClient | null>(null);
  const overlayRef = useRef<ChatOverlay | null>(null);
  const [vrMessages, setVrMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([]);
  const [vrSupported, setVrSupported] = useState(false);
  const vrSupportedRef = useRef(false);

  // Check WebXR support
  useEffect(() => {
    if ('xr' in navigator) {
      (navigator as Navigator & { xr: XRSystem }).xr
        .isSessionSupported('immersive-vr')
        .then((ok) => { setVrSupported(ok); vrSupportedRef.current = ok; })
        .catch(() => {});
    }
  }, []);

  const addVrMessage = useCallback((role: 'user' | 'ai', text: string) => {
    setVrMessages((prev) => [...prev.slice(-19), { role, text }]);
  }, []);

  useEffect(() => {
    // Chat overlay lives in the DOM (outside React) — instantiate once
    overlayRef.current = new ChatOverlay(
      (msg) => { wsRef.current?.sendUserChat(msg); addVrMessage('user', msg); },
      (provider, model) => wsRef.current?.sendSwitchProvider(provider, model),
      (prompt) => wsRef.current?.sendSystemPrompt(prompt),
      (temperature, topP) => wsRef.current?.sendParameters(temperature, topP),
      (environment) => wsRef.current?.sendEnvironment(environment),
    );

    // WebSocket client
    wsRef.current = new WSClient(WS_URL, FRAMEWORK, {
      onCommand(cmd) {
        const c = cmd as { action?: string; requestId?: string; code?: string };
        if (c.action === 'executeScript') {
          (async () => {
            try {
              // R3F shares the same Three.js underneath — expose via store
              const THREE = await import('three');
              const fn = new Function('THREE', `return (async () => { ${c.code} })();`);
              const result = await fn(THREE);
              wsRef.current?.sendScriptResult(c.requestId ?? '', result !== undefined ? String(result) : 'undefined');
            } catch (e) {
              wsRef.current?.sendScriptResult(c.requestId ?? '', '', (e as Error).message);
            }
          })();
          return;
        }
        dispatch(cmd as Record<string, unknown>);
      },
      onAIReply(message) {
        overlayRef.current?.receiveAIReply(message);
        addVrMessage('ai', message);
      },
      onStatusChange(status) {
        overlayRef.current?.setStatus(status);
      },
      onProviderConfig(config) {
        overlayRef.current?.updateProviderConfig(config as Parameters<NonNullable<typeof overlayRef.current>['updateProviderConfig']>[0]);
      },
    });

    // Periodic state ping
    const statePing = setInterval(() => {
      wsRef.current?.sendStateUpdate({ _clientSync: true, framework: FRAMEWORK });
    }, 5_000);

    // Keep-alive ping
    const keepAlive = setInterval(() => wsRef.current?.sendPing(), 25_000);

    // Clear Scene button
    const clearBtn = document.getElementById('clear-scene-btn');
    const handleClear = () => wsRef.current?.sendClearScene();
    clearBtn?.addEventListener('click', handleClear);

    // Debug panel (Escape key toggle)
    const debugPanel = document.getElementById('debug-panel');
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && debugPanel) {
        debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
        if (debugPanel.style.display === 'block') {
          const store = useSceneStore.getState();
          const objCount = Object.keys(store.objects).length;
          const lightCount = Object.keys(store.lights).length;
          const cam = store.camera;
          debugPanel.innerHTML = `
            <h3 style="margin:0 0 8px">🛠 Debug Panel</h3>
            <div><b>Objects:</b> ${objCount}</div>
            <div><b>Lights:</b> ${lightCount}</div>
            <div><b>Camera pos:</b> (${cam.position?.x.toFixed(1) ?? '?'}, ${cam.position?.y.toFixed(1) ?? '?'}, ${cam.position?.z.toFixed(1) ?? '?'})</div>
            <div><b>WebXR:</b> ${vrSupportedRef.current ? '✅ Supported' : '❌ Not available'}</div>
            <div style="margin-top:6px;font-size:0.8em;opacity:0.7">Press Escape to close</div>
          `;
        }
      }
    };
    document.addEventListener('keydown', handleEsc);

    return () => {
      clearInterval(statePing);
      clearInterval(keepAlive);
      clearBtn?.removeEventListener('click', handleClear);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [addVrMessage]);

  const handleScreenshot = (requestId: string, dataUrl: string) => {
    wsRef.current?.sendScreenshot(requestId, dataUrl);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <SceneCanvas onScreenshot={handleScreenshot} vrMessages={vrMessages} />
      {vrSupported && (
        <button
          id="vr-button"
          onClick={() => xrStore.enterVR()}
          style={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            zIndex: 110,
            padding: '10px 20px',
            border: '1px solid rgba(100,100,220,0.5)',
            borderRadius: 10,
            background: 'rgba(20,20,50,0.85)',
            color: '#a5b4fc',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: '"Segoe UI", system-ui, sans-serif',
            cursor: 'pointer',
            backdropFilter: 'blur(12px)',
          }}
        >
          🥽 Enter VR
        </button>
      )}
    </div>
  );
}
