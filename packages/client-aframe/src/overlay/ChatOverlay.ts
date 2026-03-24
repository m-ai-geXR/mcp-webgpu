interface ChatMessage { role: 'user' | 'ai'; text: string; }

interface ProviderInfo {
  id: string;
  label: string;
  models: string[];
  defaultModel: string;
}

export class ChatOverlay {
  private panel: HTMLElement;
  private messages: HTMLElement;
  private input: HTMLInputElement;
  private sendBtn: HTMLButtonElement;
  private thinkingEl: HTMLElement | null = null;
  private history: ChatMessage[] = [];
  private onSend: (message: string) => void;
  private onSwitch: (provider: string, model?: string) => void;
  private onSystemPromptChange: (prompt: string) => void;
  private providerSelect: HTMLSelectElement;
  private modelSelect: HTMLSelectElement;
  private systemPromptTextarea: HTMLTextAreaElement;
  private providers: ProviderInfo[] = [];

  constructor(
    onSend: (message: string) => void,
    onSwitch: (provider: string, model?: string) => void,
    onSystemPromptChange: (prompt: string) => void,
  ) {
    this.onSend = onSend;
    this.onSwitch = onSwitch;
    this.onSystemPromptChange = onSystemPromptChange;
    this.panel    = document.getElementById('chat-panel')!;
    this.messages = document.getElementById('chat-messages')!;
    this.input    = document.getElementById('chat-input') as HTMLInputElement;
    this.sendBtn  = document.getElementById('chat-send') as HTMLButtonElement;
    this.providerSelect = document.getElementById('provider-select') as HTMLSelectElement;
    this.modelSelect    = document.getElementById('model-select') as HTMLSelectElement;
    this.systemPromptTextarea = document.getElementById('system-prompt') as HTMLTextAreaElement;

    document.getElementById('chat-header')!.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.model-selector')) return;
      this.toggleCollapse();
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSend(); }
    });
    this.sendBtn.addEventListener('click', () => this.handleSend());

    window.addEventListener('keydown', (e) => {
      if (e.key === '`' || e.key === '~') this.toggleCollapse();
    });

    this.providerSelect.addEventListener('change', () => {
      const provider = this.providerSelect.value;
      this.updateModelOptions(provider);
      this.onSwitch(provider, this.modelSelect.value);
    });

    this.modelSelect.addEventListener('change', () => {
      this.onSwitch(this.providerSelect.value, this.modelSelect.value);
    });

    // System prompt: save on blur or Ctrl+Enter
    this.systemPromptTextarea.addEventListener('blur', () => {
      this.onSystemPromptChange(this.systemPromptTextarea.value);
    });
    this.systemPromptTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        this.systemPromptTextarea.blur();
      }
    });

    // Toggle system prompt panel
    document.getElementById('system-prompt-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const section = document.getElementById('system-prompt-section');
      if (section) section.style.display = section.style.display === 'none' ? 'block' : 'none';
    });
  }

  updateProviderConfig(config: { providers: ProviderInfo[]; activeProvider: string; activeModel: string; systemPrompt?: string }): void {
    this.providers = config.providers;
    this.providerSelect.innerHTML = '';
    for (const p of config.providers) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.label;
      this.providerSelect.appendChild(opt);
    }
    this.providerSelect.value = config.activeProvider;
    this.updateModelOptions(config.activeProvider);
    this.modelSelect.value = config.activeModel;
    const row = document.getElementById('model-selector-row');
    if (row) row.style.display = config.providers.length > 0 ? 'flex' : 'none';

    // Update system prompt if provided
    if (config.systemPrompt && !this.systemPromptTextarea.dataset['userEdited']) {
      this.systemPromptTextarea.value = config.systemPrompt;
    }
  }

  private updateModelOptions(providerId: string): void {
    const provider = this.providers.find((p) => p.id === providerId);
    this.modelSelect.innerHTML = '';
    if (provider) {
      for (const m of provider.models) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        this.modelSelect.appendChild(opt);
      }
      this.modelSelect.value = provider.defaultModel;
    }
  }

  private toggleCollapse(): void {
    this.panel.classList.toggle('collapsed');
    if (!this.panel.classList.contains('collapsed')) this.input.focus();
  }

  private handleSend(): void {
    const text = this.input.value.trim();
    if (!text) return;
    this.input.value = '';
    this.addMessage('user', text);
    this.showThinking();
    this.onSend(text);
  }

  private addMessage(role: 'user' | 'ai', text: string): void {
    this.history.push({ role, text });
    const el = document.createElement('div');
    el.className = `chat-msg ${role}`;
    el.textContent = text;
    this.messages.appendChild(el);
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  private showThinking(): void {
    this.removeThinking();
    const el = document.createElement('div');
    el.className = 'chat-msg ai thinking';
    el.textContent = 'AI is thinking…';
    this.thinkingEl = el;
    this.messages.appendChild(el);
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  private removeThinking(): void {
    if (this.thinkingEl) { this.thinkingEl.remove(); this.thinkingEl = null; }
  }

  receiveAIReply(message: string): void {
    this.removeThinking();
    this.addMessage('ai', message);
    if (this.panel.classList.contains('collapsed')) this.panel.classList.remove('collapsed');
  }

  setStatus(status: 'connecting' | 'connected' | 'disconnected'): void {
    const el = document.getElementById('status')!;
    el.className = status;
    el.textContent =
      status === 'connected'    ? '● Connected' :
      status === 'disconnected' ? '● Disconnected' :
                                  '● Connecting…';
  }
}
