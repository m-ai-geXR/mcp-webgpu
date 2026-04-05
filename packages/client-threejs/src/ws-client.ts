type Status = 'connecting' | 'connected' | 'disconnected';

type Handlers = {
  onCommand: (cmd: Record<string, unknown>) => void;
  onAIReply: (message: string) => void;
  onStatusChange: (status: Status, sessionId?: string) => void;
  onProviderConfig?: (config: { providers: unknown[]; activeProvider: string; activeModel: string }) => void;
};

export class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Handlers;
  private sessionId: string | undefined;
  private reconnectDelay = 2000;
  private maxDelay = 30_000;
  private stopped = false;
  private framework: string;

  constructor(url: string, framework: string, handlers: Handlers) {
    this.url = url;
    this.framework = framework;
    this.handlers = handlers;
    this.connect();
  }

  private connect(): void {
    if (this.stopped) return;
    this.handlers.onStatusChange('connecting');

    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.addEventListener('open', () => {
      // Reset reconnect delay on successful connection
      this.reconnectDelay = 2000;
      // Send hello to identify framework
      this.send({ type: 'hello', framework: this.framework });
    });

    ws.addEventListener('message', (event: MessageEvent<string>) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data) as Record<string, unknown>;
      } catch {
        console.error('[WSClient] Bad JSON:', event.data);
        return;
      }

      const type = msg['type'] as string;

      switch (type) {
        case 'ack':
          this.sessionId = msg['sessionId'] as string | undefined;
          this.handlers.onStatusChange('connected', this.sessionId);
          break;

        case 'command':
          this.handlers.onCommand(msg);
          break;

        case 'ai-reply':
          this.handlers.onAIReply(msg['message'] as string);
          break;

        case 'provider-config':
          this.handlers.onProviderConfig?.(msg as unknown as { providers: unknown[]; activeProvider: string; activeModel: string });
          break;

        case 'pong':
          break;

        default:
          console.debug('[WSClient] Unhandled message type:', type);
      }
    });

    ws.addEventListener('close', () => {
      this.ws = null;
      this.handlers.onStatusChange('disconnected');
      if (!this.stopped) {
        setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxDelay);
          this.connect();
        }, this.reconnectDelay);
      }
    });

    ws.addEventListener('error', () => {
      // close event will follow
    });
  }

  send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  sendUserChat(message: string): void {
    this.send({
      type: 'user-chat',
      sessionId: this.sessionId ?? 'unknown',
      message,
      timestamp: Date.now(),
    });
  }

  sendScreenshot(requestId: string, dataUrl: string): void {
    this.send({ type: 'screenshot', requestId, dataUrl });
  }

  sendScriptResult(requestId: string, result: string, error?: string): void {
    this.send({ type: 'script-result', requestId, result, error });
  }

  sendStateUpdate(state: unknown): void {
    this.send({ type: 'state-update', data: state });
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

  sendClearScene(): void {
    this.send({ type: 'clear-scene' });
  }

  stop(): void {
    this.stopped = true;
    this.ws?.close();
  }
}
