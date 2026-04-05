/**
 * WebSocket client — identical pattern across all framework clients.
 */

export interface WSHandlers {
  onCommand:      (cmd: unknown) => void;
  onAIReply:      (message: string) => void;
  onStatusChange: (status: 'connecting' | 'connected' | 'disconnected') => void;
  onProviderConfig?: (config: { providers: unknown[]; activeProvider: string; activeModel: string }) => void;
}

export class WSClient {
  private ws:          WebSocket | null = null;
  private retryDelay   = 2000;
  private reconnecting = false;
  private sessionId:   string;

  constructor(
    private readonly url:       string,
    private readonly framework: string,
    private readonly handlers:  WSHandlers,
  ) {
    this.sessionId = crypto.randomUUID();
    this.connect();
  }

  private connect(): void {
    this.handlers.onStatusChange('connecting');

    const ws = new WebSocket(this.url);
    this.ws   = ws;

    ws.onopen = () => {
      this.retryDelay = 2000;
      ws.send(JSON.stringify({ type: 'hello', framework: this.framework, sessionId: this.sessionId }));
    };

    ws.onmessage = (ev) => {
      let msg: { type: string; [k: string]: unknown };
      try { msg = JSON.parse(ev.data as string); }
      catch { return; }

      switch (msg.type) {
        case 'ack':
          this.handlers.onStatusChange('connected');
          break;
        case 'command':
          this.handlers.onCommand(msg);
          break;
        case 'ai-reply':
          this.handlers.onAIReply((msg.message as string) ?? '');
          break;
        case 'provider-config':
          this.handlers.onProviderConfig?.(msg as unknown as { providers: unknown[]; activeProvider: string; activeModel: string });
          break;
        case 'pong':
          break;
        default:
          break;
      }
    };

    ws.onclose = () => {
      this.handlers.onStatusChange('disconnected');
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnecting) return;
    this.reconnecting = true;
    setTimeout(() => {
      this.reconnecting = false;
      this.retryDelay   = Math.min(this.retryDelay * 1.5, 30_000);
      this.connect();
    }, this.retryDelay);
  }

  sendUserChat(message: string): void {
    this.send({ type: 'user-chat', sessionId: this.sessionId, message, timestamp: Date.now() });
  }

  sendScreenshot(requestId: string, dataUrl: string): void {
    this.send({ type: 'screenshot-response', requestId, dataUrl });
  }

  sendScriptResult(requestId: string, result: string, error?: string): void {
    this.send({ type: 'script-result', requestId, result, error });
  }

  sendStateUpdate(state: unknown): void {
    this.send({ type: 'state-update', sessionId: this.sessionId, state });
  }

  sendPing(): void {
    this.send({ type: 'ping' });
  }

  sendSwitchProvider(provider: string, model?: string): void {
    this.send({ type: 'switch-provider', provider, model });
  }

  sendSystemPrompt(prompt: string): void {
    this.send({ type: 'update-system-prompt', prompt });
  }

  sendParameters(temperature: number, topP: number): void {
    this.send({ type: 'update-parameters', temperature, topP });
  }

  sendEnvironment(environment: Record<string, unknown>): void {
    this.send({ type: 'update-environment', environment });
  }

  sendClearScene(): void {
    this.send({ type: 'clear-scene' });
  }

  private send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
