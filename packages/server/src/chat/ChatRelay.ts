import { PendingMessage, Vec3 } from '../types.js';
import { MessageQueue } from './MessageQueue.js';
import type { WSServer } from '../ws/WSServer.js';
import type { SceneStateManager } from '../state/SceneStateManager.js';
import { v4 as uuidv4 } from 'uuid';

export type Provider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'mistral'
  | 'groq'
  | 'xai'
  | 'cohere'
  | 'together'
  | 'ollama';

export interface ProviderInfo {
  id: Provider;
  label: string;
  models: string[];
  defaultModel: string;
}

export interface ChatConfig {
  openaiKey?: string;
  openaiModel?: string;
  anthropicKey?: string;
  anthropicModel?: string;
  googleKey?: string;
  googleModel?: string;
  mistralKey?: string;
  mistralModel?: string;
  groqKey?: string;
  groqModel?: string;
  xaiKey?: string;
  xaiModel?: string;
  cohereKey?: string;
  cohereModel?: string;
  togetherKey?: string;
  togetherModel?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  provider?: Provider;
}

const DEFAULT_SYSTEM_PROMPT = `You are an AI 3D scene architect embedded in a live WebGL environment.
You create visually rich, layered compositions using objects, lights, particles, post-processing, and animation.

═══ RESPONSE FORMAT ═══
Respond with a JSON array inside a \`\`\`json fenced code block. Include a short natural-language explanation outside the block.
If the user just asks a question (not a scene change), reply normally without commands.

═══ COMMANDS ═══

── Objects ──
{"action":"createObject", "id":"myId", "type":"box|sphere|cylinder|cone|torus|plane|capsule|line", "position":{"x":0,"y":0,"z":0}, "scale":{"x":1,"y":1,"z":1}, "rotation":{"x":0,"y":0,"z":0}, "material":{"color":"#ff0000","metalness":0.3,"roughness":0.7,"emissive":"#ff4400","emissiveIntensity":0.5,"opacity":0.9,"wireframe":false}}
{"action":"createObject", "type":"line", "points":[{"x":0,"y":0,"z":0},{"x":1,"y":2,"z":0},{"x":3,"y":1,"z":0}], "material":{"color":"#00ff88"}}
{"action":"updateObject", "id":"<id>", ...partial fields}
{"action":"deleteObject", "id":"<id>"}

── Grouping (parentId) ──
{"action":"createObject", "id":"ship_group", "type":"box", "position":{"x":0,"y":0,"z":0}, "scale":{"x":0.01,"y":0.01,"z":0.01}, "material":{"opacity":0}}
{"action":"createObject", "id":"ship_body", "parentId":"ship_group", "type":"cylinder", ...}

── Lights ──
{"action":"createLight", "id":"myLight", "lightType":"ambient|directional|point|spot|hemisphere", "color":"#ffffff", "intensity":1, "position":{"x":0,"y":5,"z":0}}
{"action":"updateLight", "id":"<id>", "color":"#ffffff", "intensity":1.5}
{"action":"deleteLight", "id":"<id>"}

── Camera ──
{"action":"setCamera", "position":{"x":0,"y":5,"z":10}, "target":{"x":0,"y":0,"z":0}, "fov":60}
{"action":"flyToObject", "id":"<id>", "distance":5}

── Environment & Post-Processing ──
{"action":"setEnvironment", "background":"#0a0a1a",
  "fog":{"color":"#000","near":10,"far":50},
  "shadows":true,
  "bloom":{"strength":0.6,"radius":0.4,"threshold":0.7},
  "chromaticAberration":{"offset":0.3},
  "vignette":{"offset":0.3,"darkness":0.6}}

── Particles ──
{"action":"createParticles", "id":"stars", "count":500, "spread":{"x":30,"y":30,"z":30}, "size":0.05, "color":"#ffffff", "emissive":"#ffffff", "emissiveIntensity":1, "opacity":0.9, "blending":"additive", "twinkle":true}
{"action":"updateParticles", "id":"stars", "color":"#ffcc00", "opacity":0.5}
{"action":"deleteParticles", "id":"stars"}

── Animation ──
{"action":"animateObject", "id":"<id>", "property":"position|rotation|scale|material.emissiveIntensity|material.opacity|material.color", "to":{"x":0,"y":2,"z":0}, "duration":2, "easing":"linear|easeIn|easeOut|easeInOut", "loop":true}
For material.color: "to":"#ff0000"
For material.emissiveIntensity / material.opacity: "to": 0.5 (number)
{"action":"stopAnimation", "id":"<id>"}

── Scene ──
{"action":"clearScene"}

═══ VISUAL COMPOSITION GUIDE ═══
Think in layers — every great scene has: ground/structure → hero objects → atmosphere → lighting → post-FX.

Material recipes:
• Glowing: emissive="#ff4400", emissiveIntensity=2, metalness=0.1, roughness=0.3
• Metallic: metalness=0.9, roughness=0.1, color="#aabbcc"
• Crystal: opacity=0.4, metalness=0.2, roughness=0.05, emissive="#4488ff"
• Matte: metalness=0, roughness=0.9

Particle recipes:
• Starfield: count=1000, spread={x:60,y:60,z:60}, size=0.04, twinkle=true, blending="additive", color="#ffffff"
• Fireflies: count=50, spread={x:10,y:5,z:10}, size=0.08, color="#99ff44", emissive="#99ff44", twinkle=true
• Dust motes: count=200, spread={x:15,y:10,z:15}, size=0.03, opacity=0.4, blending="additive"
• Sparks: count=100, spread={x:2,y:3,z:2}, size=0.06, color="#ff8800", emissive="#ff4400", emissiveIntensity=2

Post-FX recipes:
• Cinematic: bloom={strength:0.5, threshold:0.7}, vignette={darkness:0.5}, chromaticAberration={offset:0.15}
• Dreamy: bloom={strength:1.0, radius:0.6, threshold:0.5}, vignette={darkness:0.3}
• Sci-fi: bloom={strength:0.8, threshold:0.6}, chromaticAberration={offset:0.4}

Scale guide: Use real-world-ish scale. A person is ~1.8 tall. A car is ~4×1.5×2. A building is 10-30 tall.
Density guide: Scenes feel richer with 8-20 objects, 2-4 lights, 1-2 particle systems, and post-FX.

═══ EXAMPLE ═══
I'll create a glowing sci-fi corridor.
\`\`\`json
[
  {"action":"setEnvironment","background":"#050510","fog":{"color":"#050510","near":5,"far":40},"bloom":{"strength":0.7,"threshold":0.6},"vignette":{"darkness":0.5}},
  {"action":"createObject","id":"floor","type":"plane","position":{"x":0,"y":0,"z":0},"scale":{"x":4,"y":1,"z":20},"rotation":{"x":-90,"y":0,"z":0},"material":{"color":"#111122","metalness":0.8,"roughness":0.2}},
  {"action":"createObject","id":"wall_l","type":"box","position":{"x":-2,"y":1.5,"z":0},"scale":{"x":0.1,"y":3,"z":20},"material":{"color":"#0a0a15","metalness":0.6,"roughness":0.3}},
  {"action":"createObject","id":"wall_r","type":"box","position":{"x":2,"y":1.5,"z":0},"scale":{"x":0.1,"y":3,"z":20},"material":{"color":"#0a0a15","metalness":0.6,"roughness":0.3}},
  {"action":"createObject","id":"strip_l","type":"box","position":{"x":-1.9,"y":1,"z":0},"scale":{"x":0.02,"y":0.1,"z":18},"material":{"color":"#00ccff","emissive":"#00ccff","emissiveIntensity":3,"metalness":0}},
  {"action":"createObject","id":"strip_r","type":"box","position":{"x":1.9,"y":1,"z":0},"scale":{"x":0.02,"y":0.1,"z":18},"material":{"color":"#00ccff","emissive":"#00ccff","emissiveIntensity":3,"metalness":0}},
  {"action":"createLight","id":"glow","lightType":"point","color":"#00aaff","intensity":2,"position":{"x":0,"y":2.5,"z":0}},
  {"action":"createParticles","id":"dust","count":150,"spread":{"x":3.5,"y":2.5,"z":18},"size":0.02,"color":"#4488ff","emissive":"#4488ff","opacity":0.5,"blending":"additive","twinkle":true},
  {"action":"animateObject","id":"strip_l","property":"material.emissiveIntensity","to":0.5,"duration":2,"easing":"easeInOut","loop":true},
  {"action":"animateObject","id":"strip_r","property":"material.emissiveIntensity","to":0.5,"duration":2,"easing":"easeInOut","loop":true}
]
\`\`\`

Always aim for visually impressive, layered scenes. Use emissive materials, particles, bloom, and animation generously.`;

/** Model lists per provider — shown in the client dropdown. Synced with iOSMaigeXr. */
const PROVIDER_CATALOG: Record<Provider, { label: string; models: string[]; defaultModel: string }> = {
  openai:    { label: 'OpenAI',        models: ['gpt-5.2', 'gpt-5.2-pro', 'gpt-5.2-chat-latest', 'o1-2024-12-17', 'o3-mini-2025-01-31', 'gpt-4o', 'gpt-4o-mini'], defaultModel: 'gpt-5.2' },
  anthropic: { label: 'Anthropic',     models: ['claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001', 'claude-opus-4-1-20250805', 'claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20240620', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'], defaultModel: 'claude-sonnet-4-5-20250929' },
  google:    { label: 'Google Gemini', models: ['gemini-3.1-pro-preview', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'], defaultModel: 'gemini-3.1-pro-preview' },
  mistral:   { label: 'Mistral',      models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'open-mistral-nemo'], defaultModel: 'mistral-large-latest' },
  groq:      { label: 'Groq',         models: ['llama-3.3-70b-versatile', 'deepseek-r1-distill-llama-70b', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'], defaultModel: 'llama-3.3-70b-versatile' },
  xai:       { label: 'xAI / Grok',   models: ['grok-4-0709', 'grok-4-fast-reasoning', 'grok-3', 'grok-3-mini', 'grok-code-fast-1'], defaultModel: 'grok-4-0709' },
  cohere:    { label: 'Cohere',       models: ['command-r-plus', 'command-r', 'command', 'command-light'], defaultModel: 'command-r-plus' },
  together:  { label: 'Together.ai',  models: ['deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free', 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', 'meta-llama/Meta-Llama-3-8B-Instruct-Lite', 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', 'Qwen/Qwen2.5-7B-Instruct-Turbo'], defaultModel: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free' },
  ollama:    { label: 'Ollama (local)', models: ['llama3.2', 'llama3.2:1b', 'mistral', 'phi4', 'gemma3', 'qwen2.5', 'deepseek-r1'], defaultModel: 'llama3.2' },
};

export class ChatRelay {
  private queue: MessageQueue;
  private wsServer: WSServer;
  private config: ChatConfig;
  private processing = false;
  private activeProvider: Provider;
  private activeModel: string;
  private systemPrompt: string = DEFAULT_SYSTEM_PROMPT;
  private stateManager!: SceneStateManager;

  constructor(queue: MessageQueue, wsServer: WSServer, config: ChatConfig) {
    this.queue = queue;
    this.wsServer = wsServer;
    this.config = config;

    // If the configured provider has no key, fall back to the first available one.
    const preferred = config.provider ?? 'openai';
    if (this.hasKey(preferred)) {
      this.activeProvider = preferred;
    } else {
      const fallback = this.firstAvailableProvider();
      this.activeProvider = fallback ?? preferred;
      if (fallback && fallback !== preferred) {
        console.error(`[ChatRelay] ${preferred} has no API key — falling back to ${fallback}`);
      }
    }
    this.activeModel = this.resolveModel(this.activeProvider);
  }

  /** Check whether a provider has an API key configured. */
  private hasKey(provider: Provider): boolean {
    const keyMap: Record<Provider, boolean> = {
      openai: !!this.config.openaiKey,
      anthropic: !!this.config.anthropicKey,
      google: !!this.config.googleKey,
      mistral: !!this.config.mistralKey,
      groq: !!this.config.groqKey,
      xai: !!this.config.xaiKey,
      cohere: !!this.config.cohereKey,
      together: !!this.config.togetherKey,
      ollama: !!this.config.ollamaBaseUrl,
    };
    return keyMap[provider] ?? false;
  }

  /** Return the first provider that has a key, or undefined. */
  private firstAvailableProvider(): Provider | undefined {
    const all: Provider[] = ['openai', 'anthropic', 'google', 'mistral', 'groq', 'xai', 'cohere', 'together', 'ollama'];
    return all.find((p) => this.hasKey(p));
  }

  /** Resolve the model string for a given provider from config or catalog default. */
  private resolveModel(provider: Provider): string {
    const map: Record<Provider, string | undefined> = {
      openai: this.config.openaiModel,
      anthropic: this.config.anthropicModel,
      google: this.config.googleModel,
      mistral: this.config.mistralModel,
      groq: this.config.groqModel,
      xai: this.config.xaiModel,
      cohere: this.config.cohereModel,
      together: this.config.togetherModel,
      ollama: this.config.ollamaModel,
    };
    return map[provider] ?? PROVIDER_CATALOG[provider].defaultModel;
  }

  /** Inject the SceneStateManager so commands can modify the scene. */
  setStateManager(sm: SceneStateManager): void {
    this.stateManager = sm;
  }

  /** Switch provider and/or model at runtime. */
  switchProvider(provider: Provider, model?: string): void {
    this.activeProvider = provider;
    this.activeModel = model ?? this.resolveModel(provider);
    console.error(`[ChatRelay] Switched to ${provider} / ${this.activeModel}`);
  }

  /** Get the current system prompt. */
  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  /** Update the system prompt at runtime (from the client UI). */
  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
    console.error(`[ChatRelay] System prompt updated (${prompt.length} chars)`);
  }

  /** Return the list of providers that have an API key (or are keyless like ollama). */
  getAvailableProviders(): ProviderInfo[] {
    const available: ProviderInfo[] = [];
    for (const [id, info] of Object.entries(PROVIDER_CATALOG)) {
      if (this.hasKey(id as Provider)) {
        available.push({ id: id as Provider, label: info.label, models: info.models, defaultModel: info.defaultModel });
      }
    }
    return available;
  }

  getActiveProvider(): Provider {
    return this.activeProvider;
  }

  getActiveModel(): string {
    return this.activeModel;
  }

  /** Add a user-sent in-world message to the queue. */
  enqueue(msg: PendingMessage): void {
    this.queue.push(msg);
    if (this.isDirectMode()) {
      this.processNext().catch((err) =>
        console.error('[ChatRelay] Direct mode error:', err),
      );
    }
  }

  /** Whether the server has its own AI key (direct mode). */
  isDirectMode(): boolean {
    return this.hasKey(this.activeProvider);
  }

  /** MCP tool: return all queued messages without removing them. */
  getPending(): PendingMessage[] {
    return this.queue.getAll();
  }

  /** MCP tool: clear all queued messages. */
  clearPending(): void {
    this.queue.clear();
  }

  /** MCP tool: send an AI reply to the browser(s). */
  sendAIReply(message: string, sessionId?: string): void {
    this.wsServer.sendAIReply(message, sessionId);
    const all = this.queue.getAll();
    const idx = all.findIndex((m) => !sessionId || m.sessionId === sessionId);
    if (idx !== -1) {
      const updated = all.filter((_, i) => i !== idx);
      this.queue.clear();
      updated.forEach((m) => this.queue.push(m));
    }
  }

  // ─── Private: direct AI mode ──────────────────────────────────────────────

  private async processNext(): Promise<void> {
    if (this.processing) return;
    const msg = this.queue.peek();
    if (!msg) return;

    this.processing = true;
    try {
      const rawReply = await this.callAI(msg.message);
      this.queue.shift();

      // Parse and execute any scene commands from the AI response
      const { text, commands } = this.parseAIResponse(rawReply);
      if (commands.length > 0) {
        this.executeCommands(commands);
        console.error(`[ChatRelay] Executed ${commands.length} scene command(s)`);
      }

      // Send the full AI response (including code blocks) so the user sees the commands
      this.wsServer.sendAIReply(rawReply, msg.sessionId);
    } catch (err) {
      console.error('[ChatRelay] AI call failed:', err);
      this.queue.shift();
      const errMsg = err instanceof Error ? err.message : String(err);
      this.wsServer.sendAIReply(`⚠️ AI error: ${errMsg}`, msg.sessionId);
    } finally {
      this.processing = false;
      if (this.queue.size() > 0) {
        setTimeout(() => {
          this.processNext().catch(console.error);
        }, 200);
      }
    }
  }

  private async callAI(userMessage: string): Promise<string> {
    switch (this.activeProvider) {
      case 'openai':    return this.callOpenAI(userMessage);
      case 'anthropic': return this.callAnthropic(userMessage);
      case 'google':    return this.callGoogle(userMessage);
      case 'mistral':   return this.callOpenAICompat(userMessage, this.config.mistralKey!, 'https://api.mistral.ai/v1', this.activeModel);
      case 'groq':      return this.callOpenAICompat(userMessage, this.config.groqKey!, 'https://api.groq.com/openai/v1', this.activeModel);
      case 'xai':       return this.callOpenAICompat(userMessage, this.config.xaiKey!, 'https://api.x.ai/v1', this.activeModel);
      case 'cohere':    return this.callOpenAICompat(userMessage, this.config.cohereKey!, 'https://api.cohere.com/compatibility/v1', this.activeModel);
      case 'together':  return this.callOpenAICompat(userMessage, this.config.togetherKey!, 'https://api.together.xyz/v1', this.activeModel);
      case 'ollama':    return this.callOllama(userMessage);
      default:          throw new Error(`No AI provider configured for "${this.activeProvider}"`);
    }
  }

  private async callOpenAI(userMessage: string): Promise<string> {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: this.config.openaiKey });
    const resp = await client.chat.completions.create({
      model: this.activeModel,
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 16384,
    });
    return resp.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.';
  }

  private async callAnthropic(userMessage: string): Promise<string> {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: this.config.anthropicKey });
    const msg = await client.messages.create({
      model: this.activeModel,
      max_tokens: 16384,
      system: this.systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    const block = msg.content[0];
    return block && block.type === 'text'
      ? block.text
      : 'Sorry, I could not generate a response.';
  }

  /** OpenAI-compatible endpoint — works for Mistral, Groq, xAI, Cohere, Together. */
  private async callOpenAICompat(userMessage: string, apiKey: string, baseURL: string, model: string): Promise<string> {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey, baseURL });
    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 16384,
    });
    return resp.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.';
  }

  /** Google Gemini via the REST-based generateContent API (no extra SDK needed). */
  private async callGoogle(userMessage: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.activeModel}:generateContent?key=${this.config.googleKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: this.systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: 16384 },
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Google API ${resp.status}: ${body}`);
    }
    const data = await resp.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sorry, I could not generate a response.';
  }

  /** Ollama local inference via its REST API. */
  private async callOllama(userMessage: string): Promise<string> {
    const base = this.config.ollamaBaseUrl ?? 'http://localhost:11434';
    const resp = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.activeModel,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: false,
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Ollama ${resp.status}: ${body}`);
    }
    const data = await resp.json() as { message?: { content?: string } };
    return data.message?.content ?? 'Sorry, I could not generate a response.';
  }

  // ─── Response parsing & scene command execution ─────────────────────────

  /** Extract text and JSON command blocks from the AI response. */
  private parseAIResponse(raw: string): { text: string; commands: Record<string, unknown>[] } {
    const commands: Record<string, unknown>[] = [];
    // Match ```json ... ``` fenced code blocks
    const fenceRe = /```(?:json)?\s*\n?([\s\S]*?)```/gi;
    let text = raw;
    let match: RegExpExecArray | null;

    while ((match = fenceRe.exec(raw)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed)) {
          commands.push(...parsed);
        } else if (typeof parsed === 'object' && parsed !== null) {
          commands.push(parsed);
        }
      } catch {
        // Not valid JSON — skip
      }
    }

    // Remove the JSON blocks from the text shown to the user
    text = text.replace(fenceRe, '').trim();

    // Also try to parse bare JSON arrays (no fences) if no commands found
    if (commands.length === 0) {
      const bareRe = /\[\s*\{[\s\S]*?\}\s*\]/g;
      while ((match = bareRe.exec(raw)) !== null) {
        try {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed)) {
            commands.push(...parsed);
            text = text.replace(match[0], '').trim();
          }
        } catch {
          // skip
        }
      }
    }

    return { text, commands };
  }

  /** Execute parsed scene commands through the SceneStateManager and broadcast to clients. */
  private executeCommands(commands: Record<string, unknown>[]): void {
    if (!this.stateManager) {
      console.error('[ChatRelay] No stateManager — cannot execute commands');
      return;
    }

    const sm = this.stateManager;
    const ws = this.wsServer;

    for (const cmd of commands) {
      const action = cmd['action'] as string;
      if (!action) continue;

      try {
        switch (action) {
          case 'createObject': {
            const obj = sm.createObject(cmd as Parameters<typeof sm.createObject>[0]);
            ws.sendCommand({ action: 'createObject', commandId: uuidv4(), ...obj });
            break;
          }
          case 'updateObject': {
            const { id, ...props } = cmd as { id: string; [k: string]: unknown };
            const obj = sm.updateObject(id, props);
            if (obj) ws.sendCommand({ action: 'updateObject', commandId: uuidv4(), ...obj });
            break;
          }
          case 'deleteObject': {
            const id = cmd['id'] as string;
            if (sm.deleteObject(id)) ws.sendCommand({ action: 'deleteObject', commandId: uuidv4(), id });
            break;
          }
          case 'createLight': {
            const light = sm.createLight(cmd as Parameters<typeof sm.createLight>[0]);
            ws.sendCommand({ action: 'createLight', commandId: uuidv4(), ...light });
            break;
          }
          case 'updateLight': {
            const { id, ...props } = cmd as { id: string; [k: string]: unknown };
            const light = sm.updateLight(id, props);
            if (light) ws.sendCommand({ action: 'updateLight', commandId: uuidv4(), ...light });
            break;
          }
          case 'deleteLight': {
            const id = cmd['id'] as string;
            if (sm.deleteLight(id)) ws.sendCommand({ action: 'deleteLight', commandId: uuidv4(), id });
            break;
          }
          case 'setCamera': {
            const cam = sm.setCamera(cmd as Parameters<typeof sm.setCamera>[0]);
            ws.sendCommand({ action: 'setCamera', commandId: uuidv4(), ...cam });
            break;
          }
          case 'setEnvironment': {
            const env = sm.setEnvironment(cmd as Parameters<typeof sm.setEnvironment>[0]);
            ws.sendCommand({ action: 'setEnvironment', commandId: uuidv4(), ...env });
            break;
          }
          case 'animateObject': {
            const id = cmd['id'] as string;
            if (sm.getObject(id)) {
              // Persist animation so it survives page reloads
              sm.addAnimation({
                id,
                property: cmd['property'] as 'position' | 'rotation' | 'scale',
                to: cmd['to'] as Vec3,
                duration: (cmd['duration'] as number) ?? 1,
                easing: (cmd['easing'] as string) ?? 'linear',
                loop: (cmd['loop'] as boolean) ?? false,
              });
              ws.sendCommand({ action: 'animateObject', commandId: uuidv4(), ...cmd });
            }
            break;
          }
          case 'clearScene': {
            sm.clearScene();
            const state = sm.getState();
            ws.sendCommand({ action: 'loadScene', commandId: uuidv4(), state });
            break;
          }
          default:
            console.error(`[ChatRelay] Unknown command action: ${action}`);
        }
      } catch (e) {
        console.error(`[ChatRelay] Error executing ${action}:`, e);
      }
    }
  }
}
