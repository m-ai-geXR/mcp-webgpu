/// <reference types="vite/client" />

/**
 * App — top-level React component.
 * Mounts the R3F canvas and wires up WSClient + ChatOverlay.
 */
import { useEffect, useRef } from 'react';
import { SceneCanvas } from './SceneCanvas.js';
import { WSClient }    from './ws-client.js';
import { ChatOverlay } from './overlay/ChatOverlay.js';
import { dispatch }    from './commands/dispatch.js';

const WS_URL    = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:8083';
const FRAMEWORK = 'r3f';

export function App() {
  const wsRef      = useRef<WSClient | null>(null);
  const overlayRef = useRef<ChatOverlay | null>(null);

  useEffect(() => {
    // Chat overlay lives in the DOM (outside React) — instantiate once
    overlayRef.current = new ChatOverlay(
      (msg) => wsRef.current?.sendUserChat(msg),
      (provider, model) => wsRef.current?.sendSwitchProvider(provider, model),
    );

    // WebSocket client
    wsRef.current = new WSClient(WS_URL, FRAMEWORK, {
      onCommand(cmd) {
        dispatch(cmd as Record<string, unknown>);
      },
      onAIReply(message) {
        overlayRef.current?.receiveAIReply(message);
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

    return () => {
      clearInterval(statePing);
      clearInterval(keepAlive);
    };
  }, []);

  const handleScreenshot = (requestId: string, dataUrl: string) => {
    wsRef.current?.sendScreenshot(requestId, dataUrl);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <SceneCanvas onScreenshot={handleScreenshot} />
    </div>
  );
}
