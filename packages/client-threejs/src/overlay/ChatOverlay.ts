interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

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
  private onParametersChange: (temperature: number, topP: number) => void;
  private onEnvironmentChange: (environment: Record<string, unknown>) => void;
  private providerSelect: HTMLSelectElement;
  private modelSelect: HTMLSelectElement;
  private systemPromptTextarea: HTMLTextAreaElement;
  private temperatureSlider: HTMLInputElement;
  private temperatureValue: HTMLElement;
  private toppSlider: HTMLInputElement;
  private toppValue: HTMLElement;
  private providers: ProviderInfo[] = [];

  // Scene control elements
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
  private chromaticAberration: HTMLInputElement;
  private chromaticAberrationValue: HTMLElement;

  constructor(
    onSend: (message: string) => void,
    onSwitch: (provider: string, model?: string) => void,
    onSystemPromptChange: (prompt: string) => void,
    onParametersChange: (temperature: number, topP: number) => void,
    onEnvironmentChange: (environment: Record<string, unknown>) => void,
  ) {
    this.onSend = onSend;
    this.onSwitch = onSwitch;
    this.onSystemPromptChange = onSystemPromptChange;
    this.onParametersChange = onParametersChange;
    this.onEnvironmentChange = onEnvironmentChange;

    this.panel    = document.getElementById('chat-panel')!;
    this.messages = document.getElementById('chat-messages')!;
    this.input    = document.getElementById('chat-input') as HTMLInputElement;
    this.sendBtn  = document.getElementById('chat-send') as HTMLButtonElement;
    this.providerSelect = document.getElementById('provider-select') as HTMLSelectElement;
    this.modelSelect    = document.getElementById('model-select') as HTMLSelectElement;
    this.systemPromptTextarea = document.getElementById('system-prompt') as HTMLTextAreaElement;
    this.temperatureSlider = document.getElementById('temperature-slider') as HTMLInputElement;
    this.temperatureValue = document.getElementById('temperature-value')!;
    this.toppSlider = document.getElementById('topp-slider') as HTMLInputElement;
    this.toppValue = document.getElementById('topp-value')!;

    // Scene control elements
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
    this.chromaticAberration = document.getElementById('chromatic-aberration') as HTMLInputElement;
    this.chromaticAberrationValue = document.getElementById('chromatic-aberration-value')!;

    document.getElementById('chat-header')!.addEventListener('click', (e) => {
      // Don't toggle when clicking dropdowns
      if ((e.target as HTMLElement).closest('.model-selector')) return;
      this.toggleCollapse();
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    this.sendBtn.addEventListener('click', () => this.handleSend());

    // Keyboard shortcut: ~ to toggle
    window.addEventListener('keydown', (e) => {
      if (e.key === '`' || e.key === '~') this.toggleCollapse();
    });

    // Provider/model change handlers
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

    // Toggle scene controls panel
    document.getElementById('scene-controls-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const section = document.getElementById('scene-controls-section');
      if (section) section.style.display = section.style.display === 'none' ? 'block' : 'none';
    });

    // Bloom strength
    this.bloomStrength.addEventListener('input', () => {
      const value = parseFloat(this.bloomStrength.value);
      this.bloomStrengthValue.textContent = value.toFixed(1);
      this.onEnvironmentChange({ bloom: { strength: value } });
    });

    // Bloom threshold
    this.bloomThreshold.addEventListener('input', () => {
      const value = parseFloat(this.bloomThreshold.value);
      this.bloomThresholdValue.textContent = value.toFixed(2);
      this.onEnvironmentChange({ bloom: { threshold: value } });
    });

    // Background color
    this.backgroundColor.addEventListener('input', () => {
      this.onEnvironmentChange({ background: this.backgroundColor.value });
    });

    // Fog near
    this.fogNear.addEventListener('input', () => {
      const value = parseFloat(this.fogNear.value);
      this.fogNearValue.textContent = value.toFixed(0);
      this.onEnvironmentChange({ fog: { near: value } });
    });

    // Fog far
    this.fogFar.addEventListener('input', () => {
      const value = parseFloat(this.fogFar.value);
      this.fogFarValue.textContent = value.toFixed(0);
      this.onEnvironmentChange({ fog: { far: value } });
    });

    // Exposure
    this.exposure.addEventListener('input', () => {
      const value = parseFloat(this.exposure.value);
      this.exposureValue.textContent = value.toFixed(1);
      this.onEnvironmentChange({ exposure: value });
    });

    // Chromatic Aberration
    this.chromaticAberration.addEventListener('input', () => {
      const value = parseFloat(this.chromaticAberration.value);
      this.chromaticAberrationValue.textContent = value.toFixed(3);
      this.onEnvironmentChange({ chromaticAberration: value });
    });
  }

  /** Called when the server sends provider-config. */
  updateProviderConfig(config: { providers: ProviderInfo[]; activeProvider: string; activeModel: string; systemPrompt?: string }): void {
    this.providers = config.providers;

    // Populate provider dropdown
    this.providerSelect.innerHTML = '';
    for (const p of config.providers) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.label;
      this.providerSelect.appendChild(opt);
    }
    this.providerSelect.value = config.activeProvider;

    // Populate model dropdown
    this.updateModelOptions(config.activeProvider);
    this.modelSelect.value = config.activeModel;

    // Show selector row if providers are available
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
    if (!this.panel.classList.contains('collapsed')) {
      this.input.focus();
    }
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
    if (this.thinkingEl) {
      this.thinkingEl.remove();
      this.thinkingEl = null;
    }
  }

  /** Called when an AI reply arrives from the server. */
  receiveAIReply(message: string): void {
    this.removeThinking();
    this.addMessage('ai', message);

    // Auto-expand the panel if it's collapsed
    if (this.panel.classList.contains('collapsed')) {
      this.panel.classList.remove('collapsed');
    }
  }

  /** Update the connection status indicator. */
  setStatus(status: 'connecting' | 'connected' | 'disconnected'): void {
    const el = document.getElementById('status')!;
    el.className = `${status}`;
    el.textContent =
      status === 'connected'    ? '● Connected — Three.js'   :
      status === 'disconnected' ? '● Disconnected' :
                                  '● Connecting…';
  }
}
