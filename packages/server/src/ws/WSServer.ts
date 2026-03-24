import WebSocket, { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  Framework,
  WSMessage,
  HelloMessage,
  StateUpdateMessage,
  UserChatMessage,
  ScreenshotMessage,
  GenericCommand,
} from '../types.js';
import { SceneStateManager } from '../state/SceneStateManager.js';
import { ChatRelay, Provider } from '../chat/ChatRelay.js';
import { IFrameworkAdapter } from './adapters/IFrameworkAdapter.js';
import { ThreeJSAdapter } from './adapters/ThreeJSAdapter.js';
import { AFrameAdapter } from './adapters/AFrameAdapter.js';
import { BabylonAdapter } from './adapters/BabylonAdapter.js';
import { R3FAdapter } from './adapters/R3FAdapter.js';

interface PendingScreenshot {
  resolve: (url: string) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface ClientSession {
  id: string;
  ws: WebSocket;
  framework: Framework;
  adapter: IFrameworkAdapter;
  connectedAt: number;
  lastSeen: number;
  isAlive: boolean;
}

export class WSServer {
  private wss: WebSocketServer;
  private sessions = new Map<string, ClientSession>();
  private stateManager!: SceneStateManager;
  private chatRelay!: ChatRelay;
  private pendingScreenshots = new Map<string, PendingScreenshot>();

  private adapters: Record<Framework, IFrameworkAdapter> = {
    threejs: new ThreeJSAdapter(),
    aframe: new AFrameAdapter(),
    babylonjs: new BabylonAdapter(),
    r3f: new R3FAdapter(),
  };

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.wss.on('connection', (ws: WebSocket) => this.onConnection(ws));

    // Heartbeat — remove stale connections
    const heartbeatTimer = setInterval(() => {
      this.sessions.forEach((session, id) => {
        if (!session.isAlive) {
          session.ws.terminate();
          this.sessions.delete(id);
          return;
        }
        session.isAlive = false;
        session.ws.ping();
      });
    }, 30_000);

    this.wss.on('close', () => clearInterval(heartbeatTimer));
    console.error(`[WSServer] Listening on ws://localhost:${port}`);
  }

  /** Wire in the collaborating services after construction. */
  init(stateManager: SceneStateManager, chatRelay: ChatRelay): void {
    this.stateManager = stateManager;
    this.chatRelay = chatRelay;
  }

  // ─── Connection lifecycle ──────────────────────────────────────────────────

  private onConnection(ws: WebSocket): void {
    const sessionId = uuidv4();

    ws.on('pong', () => {
      const s = this.sessions.get(sessionId);
      if (s) s.isAlive = true;
    });

    ws.on('message', (data: WebSocket.RawData) => {
      const s = this.sessions.get(sessionId);
      if (s) s.lastSeen = Date.now();

      let msg: WSMessage;
      try {
        msg = JSON.parse(data.toString()) as WSMessage;
      } catch {
        console.error('[WSServer] Invalid JSON from', sessionId);
        return;
      }
      this.handleMessage(sessionId, ws, msg);
    });

    ws.on('close', () => {
      this.sessions.delete(sessionId);
      console.error(`[WSServer] Disconnected: ${sessionId}`);
    });

    ws.on('error', (err) => {
      console.error(`[WSServer] Error (${sessionId}):`, err.message);
    });

    // Acknowledge the connection before the hello handshake
    ws.send(JSON.stringify({ type: 'ack', message: 'connected', sessionId }));
  }

  // ─── Message routing ───────────────────────────────────────────────────────

  private handleMessage(sessionId: string, ws: WebSocket, msg: WSMessage): void {
    switch (msg.type) {
      case 'hello': {
        const hello = msg as unknown as HelloMessage;
        const framework: Framework = hello.framework ?? 'threejs';
        const adapter = this.adapters[framework] ?? this.adapters.threejs;

        const session: ClientSession = {
          id: sessionId,
          ws,
          framework,
          adapter,
          connectedAt: Date.now(),
          lastSeen: Date.now(),
          isAlive: true,
        };
        this.sessions.set(sessionId, session);
        console.error(`[WSServer] Hello from ${sessionId} (${framework})`);

        // Push current scene state so the client can bootstrap
        if (this.stateManager) {
          const state = this.stateManager.getState();
          const cmd = adapter.translateCommand({ action: 'loadScene', state, commandId: uuidv4() });
          ws.send(JSON.stringify(this.wrapCommand(cmd)));
        }

        // Send available AI providers/models so the client can build a selector
        if (this.chatRelay) {
          ws.send(JSON.stringify({
            type: 'provider-config',
            providers: this.chatRelay.getAvailableProviders(),
            activeProvider: this.chatRelay.getActiveProvider(),
            activeModel: this.chatRelay.getActiveModel(),
            systemPrompt: this.chatRelay.getSystemPrompt(framework),
          }));
        }
        break;
      }

      case 'state-update': {
        const update = msg as unknown as StateUpdateMessage;
        const session = this.sessions.get(sessionId);
        if (this.stateManager && session) {
          const canonical = session.adapter.parseState(update.data);
          this.stateManager.updateFromClient(canonical);
        }
        break;
      }

      case 'user-chat': {
        const chat = msg as unknown as UserChatMessage;
        const session = this.sessions.get(sessionId);
        if (!session) break;
        console.error(`[WSServer] In-world chat (${sessionId}): ${chat.message}`);
        if (this.chatRelay) {
          this.chatRelay.enqueue({
            id: uuidv4(),
            timestamp: Date.now(),
            message: chat.message,
            sessionId,
            framework: session.framework,
          });
        }
        break;
      }

      case 'screenshot': {
        const shot = msg as unknown as ScreenshotMessage;
        const pending = this.pendingScreenshots.get(shot.requestId);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingScreenshots.delete(shot.requestId);
          pending.resolve(shot.dataUrl);
        }
        break;
      }

      case 'ping': {
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      }

      case 'switch-provider': {
        const provider = (msg as unknown as { provider: string }).provider as Provider;
        const model = (msg as unknown as { model?: string }).model;
        if (this.chatRelay && provider) {
          this.chatRelay.switchProvider(provider, model);
          // Send per-framework system prompt to each client
          for (const s of this.sessions.values()) {
            if (s.ws.readyState === WebSocket.OPEN) {
              s.ws.send(JSON.stringify({
                type: 'provider-config',
                providers: this.chatRelay.getAvailableProviders(),
                activeProvider: this.chatRelay.getActiveProvider(),
                activeModel: this.chatRelay.getActiveModel(),
                systemPrompt: this.chatRelay.getSystemPrompt(s.framework),
              }));
            }
          }
          console.error(`[WSServer] Provider switched to ${provider}/${this.chatRelay.getActiveModel()} by ${sessionId}`);
        }
        break;
      }

      case 'update-system-prompt': {
        const prompt = (msg as unknown as { prompt: string }).prompt;
        const session = this.sessions.get(sessionId);
        if (this.chatRelay && typeof prompt === 'string' && session) {
          this.chatRelay.setSystemPrompt(prompt, session.framework);
          console.error(`[WSServer] System prompt updated for ${session.framework} by ${sessionId}`);
        }
        break;
      }

      case 'clear-scene': {
        if (this.stateManager) {
          this.stateManager.clearScene();
          const state = this.stateManager.getState();
          this.sendCommand({ action: 'loadScene', commandId: uuidv4(), state });
          console.error(`[WSServer] Scene cleared by ${sessionId}`);
        }
        break;
      }

      default:
        console.error(`[WSServer] Unknown message type "${msg.type}" from ${sessionId}`);
    }
  }

  // ─── Outbound helpers ─────────────────────────────────────────────────────

  /** Send a command to one session or broadcast to all. */
  sendCommand(command: GenericCommand, sessionId?: string): void {
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session?.ws.readyState === WebSocket.OPEN) {
        const translated = session.adapter.translateCommand(command);
        session.ws.send(JSON.stringify(this.wrapCommand(translated)));
      }
      return;
    }

    // Broadcast — translate per-session since frameworks differ
    for (const session of this.sessions.values()) {
      if (session.ws.readyState === WebSocket.OPEN) {
        const translated = session.adapter.translateCommand(command);
        session.ws.send(JSON.stringify(this.wrapCommand(translated)));
      }
    }
  }

  /**
   * Wrap a translated command for WS transport.
   * Scene objects have a 'type' field (e.g. 'box', 'torus') that would collide
   * with the WS message 'type' field ('command'). We preserve it as 'objectType'.
   */
  private wrapCommand(translated: GenericCommand): Record<string, unknown> {
    const msg: Record<string, unknown> = { ...translated };
    if ('type' in msg) {
      msg['objectType'] = msg['type'];
    }
    msg['type'] = 'command';
    return msg;
  }

  /** Send an AI chat reply to one session or broadcast. */
  sendAIReply(message: string, sessionId?: string): void {
    const payload = JSON.stringify({ type: 'ai-reply', message });
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session?.ws.readyState === WebSocket.OPEN) {
        session.ws.send(payload);
      }
      return;
    }
    for (const session of this.sessions.values()) {
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(payload);
      }
    }
  }

  /** Request a screenshot from the browser; resolves with a base-64 data URL. */
  async requestScreenshot(sessionId?: string): Promise<string> {
    const requestId = uuidv4();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingScreenshots.delete(requestId);
        reject(new Error('Screenshot request timed out (10 s)'));
      }, 10_000);

      this.pendingScreenshots.set(requestId, { resolve, reject, timer });
      this.sendCommand({ action: 'takeScreenshot', requestId }, sessionId);
    });
  }

  getConnectedSessions(): Array<{ id: string; framework: Framework; connectedAt: number }> {
    return Array.from(this.sessions.values()).map(({ id, framework, connectedAt }) => ({
      id,
      framework,
      connectedAt,
    }));
  }

  hasClients(): boolean {
    return this.sessions.size > 0;
  }

  close(): void {
    this.wss.close();
  }
}
