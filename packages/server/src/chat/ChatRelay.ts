import { PendingMessage } from '../types.js';
import { MessageQueue } from './MessageQueue.js';
import type { WSServer } from '../ws/WSServer.js';
import type { SceneStateManager } from '../state/SceneStateManager.js';
import type { Framework } from '../types.js';
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

// ─── Shared command reference (appended to every framework prompt) ───────────

const COMMAND_REFERENCE = `
When the user asks you to change the scene, respond with a JSON block containing an array of commands.
Wrap the JSON in a \`\`\`json fenced code block so it can be parsed.

## CRITICAL — Incremental Updates Only
- The scene is PERSISTENT. Objects you created in previous turns still exist.
- ONLY create, modify, or delete what the user explicitly asks for.
- Do NOT recreate objects that already exist.
- To modify an existing object, use "updateObject" with its id — do NOT delete + recreate it.
- NEVER use "clearScene" unless the user explicitly asks to "clear", "reset", or "start over".
- The current scene state (object ids, positions, materials, lights) is provided below the conversation so you know what already exists. Reference existing object ids when updating.

Available commands:
- {"action":"createObject", "type":"box|sphere|cylinder|cone|torus|plane|capsule", "position":{"x":0,"y":0,"z":0}, "scale":{"x":1,"y":1,"z":1}, "rotation":{"x":0,"y":0,"z":0}, "material":{"color":"#ff0000","metalness":0.3,"roughness":0.7}}
- {"action":"updateObject", "id":"<id>", "position":{...}, "scale":{...}, "rotation":{...}, "material":{...}, "visible":true}
- {"action":"deleteObject", "id":"<id>"}
- {"action":"createLight", "lightType":"ambient|directional|point|spot|hemisphere", "color":"#ffffff", "intensity":1, "position":{"x":0,"y":5,"z":0}}
- {"action":"updateLight", "id":"<id>", "color":"#ffffff", "intensity":1.5}
- {"action":"deleteLight", "id":"<id>"}
- {"action":"setCamera", "position":{"x":0,"y":5,"z":10}, "target":{"x":0,"y":0,"z":0}, "fov":60}
- {"action":"setEnvironment", "background":"#1a1a2e", "fog":{"color":"#000","near":10,"far":50}}
- {"action":"animateObject", "id":"<id>", "property":"position|rotation|scale", "to":{"x":0,"y":2,"z":0}, "duration":1, "loop":false}
- {"action":"clearScene"}  ← ONLY when user explicitly asks to clear/reset!

You may include multiple commands in one response. Always put them in a JSON array.
Also include a short natural-language explanation outside the code block so the user knows what you did.

Example — ADDING to an existing scene (correct):
The user already has a red cube. They say "add a blue sphere next to it."
\`\`\`json
[
  {"action":"createObject","type":"sphere","position":{"x":2,"y":0.5,"z":0},"material":{"color":"#0066ff"}}
]
\`\`\`
Note: we only create the NEW sphere. The existing red cube is untouched.

If the user just asks a question (not a scene change), reply normally without commands.
Keep explanations concise.`;

// ─── Per-framework system prompts (adapted from maigeXR iOS) ────────────────

const FRAMEWORK_SYSTEM_PROMPTS: Record<Framework, string> = {
  threejs: `You are an expert Three.js assistant embedded inside a live 3D environment.
You are a **creative Three.js mentor** who helps users bring 3D ideas to life.
Your role is not just technical but also **artistic**: you suggest imaginative variations,
playful enhancements, and visually interesting touches.

You can create, modify, and delete 3D objects, lights, camera, and environment in real time
by responding with JSON scene commands.

## Three.js Tips
- Supported geometry types: box, sphere, cylinder, cone, torus, plane, capsule.
- Materials support PBR properties: color, metalness, roughness, emissive, emissiveIntensity, opacity.
- Use MeshStandardMaterial properties for realistic PBR rendering.
- Animations are handled via the animateObject command with position/rotation/scale tweening.
- Dark backgrounds (e.g. "#0a0a1a") make emissive materials and bloom effects pop dramatically.
- Combine ambient + directional + point lights for depth and realism.
- Use metalness (0-1) and roughness (0-1) for realistic surface appearance.
- Y axis is up. Position and scale use world units (metres by convention).
- Rotation is in degrees {x, y, z}.

## Creative Guidelines
- Even for simple requests like "create a cube", enrich the scene with interesting materials or lighting.
- Suggest imaginative variations and playful enhancements.
- Use multiple colored lights for dramatic effects.
- Consider fog and environment settings for atmosphere.
- Add subtle animations to bring scenes to life.
${COMMAND_REFERENCE}`,

  aframe: `You are an expert A-Frame assistant embedded inside a live 3D/VR environment.
You are a **creative A-Frame mentor** who helps users bring immersive 3D/VR ideas to life.
Your role is not just technical but also **artistic**: you suggest imaginative variations,
interactive VR elements, and immersive experiences.

You can create, modify, and delete 3D objects, lights, camera, and environment in real time
by responding with JSON scene commands.

## A-Frame Tips
- Position/rotation/scale are sent as {x,y,z} from the server; the adapter converts
  them to A-Frame's "x y z" string format automatically.
- Supported geometry types: box, sphere, cylinder, cone, torus, plane, capsule.
- Materials support color, metalness, roughness, opacity.
- A-Frame uses an entity-component architecture under the hood.
- Think in 3D space — objects should surround the user for VR.
- Y axis is up. Rotation is in degrees.

## VR/AR Design Guidelines
- Always think in 3D space — objects should surround the user at comfortable distances.
- Place important objects at eye level (~1.6m height) for VR comfort.
- Use animations to bring the scene to life and guide user attention.
- Create environments that encourage exploration.
- Use lighting to set mood and atmosphere.
- Consider spatial arrangement for immersive experiences.
${COMMAND_REFERENCE}`,

  babylonjs: `You are an expert Babylon.js assistant embedded inside a live 3D environment.
You are a **creative Babylon.js mentor** who helps users bring 3D ideas to life.
Your role is not just technical but also **artistic**: you suggest imaginative variations,
playful enhancements, and visually interesting touches.

You can create, modify, and delete 3D objects, lights, camera, and environment in real time
by responding with JSON scene commands.

## Babylon.js Tips
- Rotation is stored in degrees server-side; the BabylonAdapter converts to radians.
- Supported geometry types: box, sphere, cylinder, cone, torus, plane, capsule.
- Materials support color, metalness, roughness, emissive, opacity.
- Babylon.js MeshBuilder is used under the hood for geometry creation.
- Use StandardMaterial properties (diffuseColor, emissiveColor, specularColor).
- GlowLayer and emissive materials create spectacular glow effects.
- Y axis is up. Position and scale use world units.

## Creative Guidelines
- Even for simple requests like "create a cube", enrich the scene with creative materials.
- Give objects unique materials — vary color, metalness, roughness.
- Add environmental flavor: fog, interesting background colors, varied lighting.
- Use multiple light types (ambient, directional, point) for depth and atmosphere.
- Suggest animations and interactive compositions.
- Encourage exploration with clever spatial arrangements.
${COMMAND_REFERENCE}`,

  r3f: `You are an expert React Three Fiber assistant embedded inside a live 3D environment.
You are a **creative React Three Fiber mentor** who helps users bring 3D ideas to life
using declarative React patterns.
Your role is not just technical but also **artistic**: you suggest imaginative variations,
playful enhancements, and visually interesting touches.

You can create, modify, and delete 3D objects, lights, camera, and environment in real time
by responding with JSON scene commands.

## React Three Fiber Tips
- The R3F client manages scene state in a Zustand store.
- Position/rotation/scale are sent as {x,y,z}; the R3FAdapter converts to tuples.
- Supported geometry types: box, sphere, cylinder, cone, torus, plane, capsule.
- Materials support PBR properties: color, metalness, roughness, opacity.
- React Three Fiber uses declarative JSX components (mesh, boxGeometry, meshStandardMaterial).
- drei helpers (OrbitControls, Environment, Text) enhance the experience.
- Y axis is up. Rotation is in degrees.

## Creative Guidelines
- Use materials with realistic PBR properties (metalness, roughness).
- Add smooth animations with the animateObject command.
- Create interesting compositions with varied object types.
- Use multiple colored lights for dramatic, artistic scenes.
- Consider fog and environment settings for atmosphere.
- Even simple requests deserve creative, visually appealing results.
${COMMAND_REFERENCE}`,
};

const DEFAULT_SYSTEM_PROMPT = FRAMEWORK_SYSTEM_PROMPTS.threejs;

/** Model lists per provider — shown in the client dropdown. */
const PROVIDER_CATALOG: Record<Provider, { label: string; models: string[]; defaultModel: string }> = {
  openai:    { label: 'OpenAI',       models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'o3', 'o3-mini', 'o4-mini'], defaultModel: 'gpt-4.1' },
  anthropic: { label: 'Anthropic',    models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022'], defaultModel: 'claude-sonnet-4-6' },
  google:    { label: 'Google Gemini', models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'], defaultModel: 'gemini-2.5-pro' },
  mistral:   { label: 'Mistral',      models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'open-mistral-nemo'], defaultModel: 'mistral-large-latest' },
  groq:      { label: 'Groq',         models: ['llama-3.3-70b-versatile', 'deepseek-r1-distill-llama-70b', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'], defaultModel: 'llama-3.3-70b-versatile' },
  xai:       { label: 'xAI / Grok',   models: ['grok-3', 'grok-3-mini', 'grok-3-fast', 'grok-2'], defaultModel: 'grok-3' },
  cohere:    { label: 'Cohere',       models: ['command-r-plus', 'command-r', 'command', 'command-light'], defaultModel: 'command-r-plus' },
  together:  { label: 'Together.ai',  models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', 'deepseek-ai/DeepSeek-R1', 'Qwen/Qwen2.5-72B-Instruct-Turbo'], defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
  ollama:    { label: 'Ollama (local)', models: ['llama3.2', 'llama3.2:1b', 'mistral', 'phi4', 'gemma3', 'qwen2.5', 'deepseek-r1'], defaultModel: 'llama3.2' },
};

export class ChatRelay {
  private queue: MessageQueue;
  private wsServer: WSServer;
  private config: ChatConfig;
  private processing = false;
  private activeProvider: Provider;
  private activeModel: string;
  private systemPrompts: Record<string, string> = { ...FRAMEWORK_SYSTEM_PROMPTS };
  private stateManager!: SceneStateManager;

  /** Conversation history for multi-turn context. Capped to avoid token overflow. */
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private static readonly MAX_HISTORY_TURNS = 20;

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
    this.conversationHistory = []; // fresh start on provider switch
    console.error(`[ChatRelay] Switched to ${provider} / ${this.activeModel}`);
  }

  /** Get the current system prompt for a framework (defaults to threejs). */
  getSystemPrompt(framework?: Framework): string {
    return this.systemPrompts[framework ?? 'threejs'] ?? DEFAULT_SYSTEM_PROMPT;
  }

  /** Update the system prompt at runtime for a specific framework. */
  setSystemPrompt(prompt: string, framework?: Framework): void {
    const fw = framework ?? 'threejs';
    this.systemPrompts[fw] = prompt;
    console.error(`[ChatRelay] System prompt updated for ${fw} (${prompt.length} chars)`);
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

  /** Build a concise summary of the current scene state for the AI context. */
  private buildSceneContext(): string {
    if (!this.stateManager) return '';
    const state = this.stateManager.getState();
    const parts: string[] = ['## Current Scene State'];

    const objKeys = Object.keys(state.objects);
    if (objKeys.length === 0) {
      parts.push('Objects: (none)');
    } else {
      parts.push(`Objects (${objKeys.length}):`);
      for (const obj of Object.values(state.objects)) {
        const pos = obj.position;
        const mat = obj.material;
        const color = mat?.color ?? 'default';
        parts.push(`  - id="${obj.id}" type=${obj.type} pos=(${pos.x},${pos.y},${pos.z}) color=${color}`);
      }
    }

    const lightKeys = Object.keys(state.lights);
    if (lightKeys.length > 0) {
      parts.push(`Lights (${lightKeys.length}):`);
      for (const light of Object.values(state.lights)) {
        parts.push(`  - id="${light.id}" type=${light.lightType} color=${light.color} intensity=${light.intensity}`);
      }
    }

    if (state.environment) {
      parts.push(`Environment: background=${state.environment.background ?? 'default'}`);
    }

    return parts.join('\n');
  }

  /** Get the full system prompt including scene state context. */
  private getFullSystemPrompt(framework?: Framework): string {
    const base = this.getSystemPrompt(framework);
    const sceneCtx = this.buildSceneContext();
    return sceneCtx ? `${base}\n\n${sceneCtx}` : base;
  }

  /** Build the messages array with conversation history for AI calls. */
  private buildMessages(userMessage: string, framework?: Framework): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      { role: 'system', content: this.getFullSystemPrompt(framework) },
    ];
    // Append conversation history (already capped)
    for (const entry of this.conversationHistory) {
      messages.push(entry);
    }
    // Append the current user message
    messages.push({ role: 'user', content: userMessage });
    return messages;
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
      const rawReply = await this.callAI(msg.message, msg.framework);
      this.queue.shift();

      // Record conversation history for multi-turn context
      this.conversationHistory.push({ role: 'user', content: msg.message });
      this.conversationHistory.push({ role: 'assistant', content: rawReply });
      // Cap history to avoid token overflow (keep last N turns = 2*N entries)
      const maxEntries = ChatRelay.MAX_HISTORY_TURNS * 2;
      if (this.conversationHistory.length > maxEntries) {
        this.conversationHistory = this.conversationHistory.slice(-maxEntries);
      }

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

  private async callAI(userMessage: string, framework?: Framework): Promise<string> {
    switch (this.activeProvider) {
      case 'openai':    return this.callOpenAI(userMessage, framework);
      case 'anthropic': return this.callAnthropic(userMessage, framework);
      case 'google':    return this.callGoogle(userMessage, framework);
      case 'mistral':   return this.callOpenAICompat(userMessage, this.config.mistralKey!, 'https://api.mistral.ai/v1', this.activeModel, framework);
      case 'groq':      return this.callOpenAICompat(userMessage, this.config.groqKey!, 'https://api.groq.com/openai/v1', this.activeModel, framework);
      case 'xai':       return this.callOpenAICompat(userMessage, this.config.xaiKey!, 'https://api.x.ai/v1', this.activeModel, framework);
      case 'cohere':    return this.callOpenAICompat(userMessage, this.config.cohereKey!, 'https://api.cohere.com/compatibility/v1', this.activeModel, framework);
      case 'together':  return this.callOpenAICompat(userMessage, this.config.togetherKey!, 'https://api.together.xyz/v1', this.activeModel, framework);
      case 'ollama':    return this.callOllama(userMessage, framework);
      default:          throw new Error(`No AI provider configured for "${this.activeProvider}"`);
    }
  }

  private async callOpenAI(userMessage: string, framework?: Framework): Promise<string> {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: this.config.openaiKey });
    const resp = await client.chat.completions.create({
      model: this.activeModel,
      messages: this.buildMessages(userMessage, framework),
      max_tokens: 8192,
    });
    return resp.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.';
  }

  private async callAnthropic(userMessage: string, framework?: Framework): Promise<string> {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: this.config.anthropicKey });
    const msgs = this.buildMessages(userMessage, framework);
    // Anthropic uses a separate 'system' field; strip it from messages
    const systemContent = msgs[0].content;
    const chatMessages = msgs.slice(1).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    const msg = await client.messages.create({
      model: this.activeModel,
      max_tokens: 8192,
      system: systemContent,
      messages: chatMessages,
    });
    const block = msg.content[0];
    return block && block.type === 'text'
      ? block.text
      : 'Sorry, I could not generate a response.';
  }

  /** OpenAI-compatible endpoint — works for Mistral, Groq, xAI, Cohere, Together. */
  private async callOpenAICompat(userMessage: string, apiKey: string, baseURL: string, model: string, framework?: Framework): Promise<string> {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey, baseURL });
    const resp = await client.chat.completions.create({
      model,
      messages: this.buildMessages(userMessage, framework),
      max_tokens: 8192,
    });
    return resp.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.';
  }

  /** Google Gemini via the REST-based generateContent API (no extra SDK needed). */
  private async callGoogle(userMessage: string, framework?: Framework): Promise<string> {
    const msgs = this.buildMessages(userMessage, framework);
    const systemContent = msgs[0].content;
    // Build Gemini-style contents array from conversation history
    const contents = msgs.slice(1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.activeModel}:generateContent?key=${this.config.googleKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemContent }] },
        contents,
        generationConfig: { maxOutputTokens: 8192 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
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
  private async callOllama(userMessage: string, framework?: Framework): Promise<string> {
    const base = this.config.ollamaBaseUrl ?? 'http://localhost:11434';
    const resp = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.activeModel,
        messages: this.buildMessages(userMessage, framework),
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
