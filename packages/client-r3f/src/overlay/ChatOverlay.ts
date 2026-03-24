/**
 * ChatOverlay — mirrors the vanilla TS version but written as a plain DOM
 * manipulator (not a React component) so it can sit outside the React tree,
 * just like in the other clients.
 */

interface ProviderInfo {
  id: string;
  label: string;
  models: string[];
  defaultModel: string;
}

export class ChatOverlay {
  private container: HTMLElement;
  private msgList:   HTMLElement;
  private input:     HTMLInputElement;
  private expanded   = false;
  private onSwitch: (provider: string, model?: string) => void;
  private onSystemPromptChange: (prompt: string) => void;
  private providerSelect: HTMLSelectElement;
  private modelSelect: HTMLSelectElement;
  private systemPromptTextarea: HTMLTextAreaElement;
  private providers: ProviderInfo[] = [];

  constructor(
    private readonly onSend: (msg: string) => void,
    onSwitch: (provider: string, model?: string) => void = () => {},
    onSystemPromptChange: (prompt: string) => void = () => {},
  ) {
    this.onSwitch = onSwitch;
    this.onSystemPromptChange = onSystemPromptChange;
    this.container = document.getElementById('chat-overlay')!;
    this.msgList   = document.getElementById('chat-messages')!;
    this.input     = document.getElementById('chat-input') as HTMLInputElement;
    this.providerSelect = document.getElementById('provider-select') as HTMLSelectElement;
    this.modelSelect    = document.getElementById('model-select') as HTMLSelectElement;
    this.systemPromptTextarea = document.getElementById('system-prompt') as HTMLTextAreaElement;

    document.getElementById('chat-header')!.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.model-selector')) return;
      this.toggle();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === '`' || e.key === '~') { e.preventDefault(); this.toggle(); }
    });

    document.getElementById('chat-send')!.addEventListener('click', () => this.handleSend());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSend(); }
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

  private toggle(): void {
    this.expanded = !this.expanded;
    this.container.classList.toggle('expanded', this.expanded);
    if (this.expanded) this.input.focus();
  }

  private handleSend(): void {
    const msg = this.input.value.trim();
    if (!msg) return;

    this.appendMessage('You', msg, 'user');
    this.onSend(msg);
    this.input.value = '';

    this.appendMessage('AI', 'AI is thinking\u2026', 'ai-thinking');
    if (!this.expanded) this.toggle();
  }

  receiveAIReply(message: string): void {
    const thinking = this.msgList.querySelector('.msg.ai-thinking');
    if (thinking) thinking.remove();
    this.appendMessage('AI', message, 'ai');
    if (!this.expanded) this.toggle();
    this.scrollToBottom();
  }

  setStatus(status: 'connecting' | 'connected' | 'disconnected'): void {
    const el = document.getElementById('status')!;
    el.className  = `status ${status}`;
    el.textContent = status === 'connected'  ? 'Connected'
                   : status === 'connecting' ? 'Connecting\u2026'
                   : 'Disconnected';
  }

  private appendMessage(sender: string, text: string, cssClass: string): void {
    const div = document.createElement('div');
    div.className = `msg ${cssClass}`;
    div.innerHTML = `<span class="sender">${sender}: </span>${escapeHtml(text)}`;
    this.msgList.appendChild(div);
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    this.msgList.scrollTop = this.msgList.scrollHeight;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
