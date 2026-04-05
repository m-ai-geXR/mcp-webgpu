/**
 * Floating chat overlay panel — identical across all framework clients.
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
  private onSwitch: (provider: string, model?: string) => void;
  private onSystemPromptChange: (prompt: string) => void;
  private onParametersChange: (temperature: number, topP: number) => void;
  private onEnvironmentChange: (environment: Record<string, unknown>) => void;
  private providerSelect: HTMLSelectElement;
  private modelSelect: HTMLSelectElement;
  private systemPromptTextarea: HTMLTextAreaElement;
  private temperatureSlider: HTMLInputElement;
  private temperatureValue: HTMLElement;
  private toppSlider: HTMLInputElement;
  private toppValue: HTMLElement;
  private bloomStrength: HTMLInputElement;
  private bloomStrengthValue: HTMLElement;
  private bloomThreshold: HTMLInputElement;
  private bloomThresholdValue: HTMLElement;
  private backgroundColor: HTMLInputElement;
  private fogNear: HTMLInputElement;
  private fogNearValue: HTMLElement;
  private fogFar: HTMLInputElement;
  private fogFarValue: HTMLElement;
  private exposure: HTMLInputElement;
  private exposureValue: HTMLElement;
  private providers: ProviderInfo[] = [];

  constructor(
    private readonly onSend: (msg: string) => void,
    onSwitch: (provider: string, model?: string) => void = () => {},
    onSystemPromptChange: (prompt: string) => void = () => {},
    onParametersChange: (temperature: number, topP: number) => void = () => {},
    onEnvironmentChange: (environment: Record<string, unknown>) => void = () => {},
  ) {
    this.onSwitch = onSwitch;
    this.onSystemPromptChange = onSystemPromptChange;
    this.onParametersChange = onParametersChange;
    this.onEnvironmentChange = onEnvironmentChange;
    this.container = document.getElementById('chat-panel')!;
    this.msgList   = document.getElementById('chat-messages')!;
    this.input     = document.getElementById('chat-input') as HTMLInputElement;
    this.providerSelect = document.getElementById('provider-select') as HTMLSelectElement;
    this.modelSelect    = document.getElementById('model-select') as HTMLSelectElement;
    this.systemPromptTextarea = document.getElementById('system-prompt') as HTMLTextAreaElement;
    this.temperatureSlider = document.getElementById('temperature-slider') as HTMLInputElement;
    this.temperatureValue = document.getElementById('temperature-value')!;
    this.toppSlider = document.getElementById('topp-slider') as HTMLInputElement;
    this.toppValue = document.getElementById('topp-value')!;
    this.bloomStrength = document.getElementById('bloom-strength') as HTMLInputElement;
    this.bloomStrengthValue = document.getElementById('bloom-strength-value')!;
    this.bloomThreshold = document.getElementById('bloom-threshold') as HTMLInputElement;
    this.bloomThresholdValue = document.getElementById('bloom-threshold-value')!;
    this.backgroundColor = document.getElementById('background-color') as HTMLInputElement;
    this.fogNear = document.getElementById('fog-near') as HTMLInputElement;
    this.fogNearValue = document.getElementById('fog-near-value')!;
    this.fogFar = document.getElementById('fog-far') as HTMLInputElement;
    this.fogFarValue = document.getElementById('fog-far-value')!;
    this.exposure = document.getElementById('exposure') as HTMLInputElement;
    this.exposureValue = document.getElementById('exposure-value')!;

    const header = document.getElementById('chat-header')!;
    header.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.model-selector')) return;
      this.toggle();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === '`' || e.key === '~') { e.preventDefault(); this.toggle(); }
    });

    const sendBtn = document.getElementById('chat-send')!;
    sendBtn.addEventListener('click', () => this.handleSend());
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

    // Toggle model parameters panel
    document.getElementById('model-parameters-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const section = document.getElementById('model-parameters-section');
      if (section) section.style.display = section.style.display === 'none' ? 'block' : 'none';
    });

    // Temperature slider
    this.temperatureSlider.addEventListener('input', () => {
      const value = parseFloat(this.temperatureSlider.value);
      this.temperatureValue.textContent = value.toFixed(1);
      this.onParametersChange(value, parseFloat(this.toppSlider.value));
    });

    // Top-p slider
    this.toppSlider.addEventListener('input', () => {
      const value = parseFloat(this.toppSlider.value);
      this.toppValue.textContent = value.toFixed(1);
      this.onParametersChange(parseFloat(this.temperatureSlider.value), value);
    });

    document.getElementById('scene-controls-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const section = document.getElementById('scene-controls-section');
      if (section) section.style.display = section.style.display === 'none' ? 'block' : 'none';
    });

    this.bloomStrength.addEventListener('input', () => {
      const value = parseFloat(this.bloomStrength.value);
      this.bloomStrengthValue.textContent = value.toFixed(1);
      this.onEnvironmentChange({ bloom: { strength: value } });
    });

    this.bloomThreshold.addEventListener('input', () => {
      const value = parseFloat(this.bloomThreshold.value);
      this.bloomThresholdValue.textContent = value.toFixed(2);
      this.onEnvironmentChange({ bloom: { threshold: value } });
    });

    this.backgroundColor.addEventListener('input', () => {
      this.onEnvironmentChange({ background: this.backgroundColor.value });
    });

    this.fogNear.addEventListener('input', () => {
      const value = parseFloat(this.fogNear.value);
      this.fogNearValue.textContent = value.toFixed(0);
      this.onEnvironmentChange({ fog: { near: value } });
    });

    this.fogFar.addEventListener('input', () => {
      const value = parseFloat(this.fogFar.value);
      this.fogFarValue.textContent = value.toFixed(0);
      this.onEnvironmentChange({ fog: { far: value } });
    });

    this.exposure.addEventListener('input', () => {
      const value = parseFloat(this.exposure.value);
      this.exposureValue.textContent = value.toFixed(1);
      this.onEnvironmentChange({ exposure: value });
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
    this.container.classList.toggle('collapsed');
    if (!this.container.classList.contains('collapsed')) this.input.focus();
  }

  private handleSend(): void {
    const msg = this.input.value.trim();
    if (!msg) return;

    this.appendMessage('You', msg, 'user');
    this.onSend(msg);
    this.input.value = '';

    this.appendMessage('AI', 'AI is thinking\u2026', 'ai-thinking');
    if (this.container.classList.contains('collapsed')) this.toggle();
  }

  receiveAIReply(message: string): void {
    const thinking = this.msgList.querySelector('.msg.ai-thinking');
    if (thinking) thinking.remove();

    this.appendMessage('AI', message, 'ai');
    if (this.container.classList.contains('collapsed')) this.toggle();
    this.scrollToBottom();
  }

  setStatus(status: 'connecting' | 'connected' | 'disconnected'): void {
    const el = document.getElementById('status')!;
    el.className = `status ${status}`;
    el.textContent = status === 'connected' ? 'Connected \u2014 Babylon.js'
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
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
