# m{ai}geXR-3d-mcp

**The multi-framework 3D MCP server that actually works.** Control live **Three.js**, **A-Frame**, **Babylon.js**, and **React Three Fiber** scenes from any MCP-capable AI — GitHub Copilot, Claude Desktop, Cursor, you name it — with **in-world async chat** so you can talk to the AI *from inside the 3D canvas* while it reshapes the world around you.

> All **four** framework clients render matching, visually-aligned output from a single unified scene state. Same prompt, same scene, any engine.

---

## Highlights

- **4 production-ready 3D clients** — Three.js, A-Frame (1.7.0 + bloom), Babylon.js (PBR), React Three Fiber + Zustand — all visually aligned
- **WebXR / VR support** — enter immersive VR in all four clients; floating chat panel follows your gaze so you can talk to the AI from inside the headset
- **9 AI providers** out of the box — OpenAI (GPT-4.1), Anthropic (Claude Sonnet 4), Google Gemini 2.5 Pro, Mistral, Groq (Llama 3.3 70B), xAI Grok-3, Cohere Command R+, Together.ai, and local Ollama
- **23 MCP tools** — objects, lights, cameras, animation, environment, scene I/O, undo/redo, screenshots, and in-world chat
- **Per-framework system prompts** — each client tells the AI how to generate geometries, materials, and lighting that look correct in *that* engine (adapted from the iOS maigeXR app)
- **In-world chat** — press **`~`** to talk to the AI without leaving the 3D viewport; it reads your messages and answers in a floating overlay
- **Scene-aware AI** — 20-turn conversation history + live scene state injection ensures the AI makes incremental edits, not destructive rebuilds
- **One command** — `pnpm dev` starts the server + all four clients simultaneously; auto-opens the Three.js client in your browser
- **Hot-swappable AI provider** — change provider mid-session from the client dropdown; no restart needed

---

## Quick start

### Option A — npx (no clone needed)

```bash
npx maige-3d-mcp
```

This starts the MCP server via stdio. Point your MCP client (VS Code Copilot, Claude Desktop, Cursor) at the command `npx maige-3d-mcp`.

### Option B — from source

#### 1. Install

```bash
cd mcp-webgpu
pnpm install
```

#### 2. Configure

```bash
cp .env.example .env
```

Add at least one API key. All variables:

| Variable | Default | Purpose |
|---|---|---|
| `WS_PORT` | `8083` | WebSocket bridge port |
| `CHAT_PROVIDER` | `openai` | Active AI provider (`openai` \| `anthropic` \| `google` \| `mistral` \| `groq` \| `xai` \| `cohere` \| `together` \| `ollama`) |
| `OPENAI_API_KEY` | — | OpenAI |
| `ANTHROPIC_API_KEY` | — | Anthropic |
| `GOOGLE_API_KEY` | — | Google Gemini |
| `MISTRAL_API_KEY` | — | Mistral |
| `GROQ_API_KEY` | — | Groq |
| `XAI_API_KEY` | — | xAI / Grok |
| `COHERE_API_KEY` | — | Cohere |
| `TOGETHER_API_KEY` | — | Together.ai |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Local Ollama |
| `AUTO_OPEN_BROWSER` | `true` | Open browser on startup |
| `DEFAULT_FRAMEWORK` | `threejs` | Which client to auto-open (`threejs` \| `aframe` \| `babylonjs` \| `r3f`) |

Each provider also has a `*_MODEL` env var (e.g. `OPENAI_MODEL=gpt-4.1`) — see `.env.example` for all available models.

> **Two chat modes:**
> - **Relay mode** (no key needed): the MCP host AI (Copilot, Claude Desktop) handles in-world chat by polling `getPendingUserMessages`.
> - **Direct mode** (key in `.env`): the server answers chat autonomously using the configured provider.

#### 3. Build & run

```bash
pnpm build:server   # compile TypeScript once
pnpm dev            # start server + all 4 clients
```

Clients open at:

| Framework | URL |
|---|---|
| Three.js | http://localhost:5173 |
| A-Frame | http://localhost:5174 |
| Babylon.js | http://localhost:5175 |
| React Three Fiber | http://localhost:5176 |

#### 4. Register with VS Code Copilot

The `.vscode/mcp.json` is pre-configured. Reload VS Code and `maige-3d-mcp` appears in Copilot agent mode.

Alternatively, add to your global VS Code settings:

```jsonc
// .vscode/mcp.json (already included)
{
  "servers": {
    "maige-3d-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["packages/server/build/main.js"],
      "env": {
        "OPENAI_API_KEY": "${env:OPENAI_API_KEY}",
        "ANTHROPIC_API_KEY": "${env:ANTHROPIC_API_KEY}",
        "GOOGLE_API_KEY": "${env:GOOGLE_API_KEY}"
      }
    }
  }
}
```

---

## Supported AI Providers (9)

| Provider | Default Model | Available Models | Notes |
|---|---|---|---|
| **OpenAI** | `gpt-4.1` | gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, gpt-4o, gpt-4o-mini, o3, o3-mini, o4-mini | Best general-purpose option |
| **Anthropic** | `claude-sonnet-4-6` | claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5 | Strong reasoning |
| **Google Gemini** | `gemini-2.5-pro` | gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite, gemini-2.0-flash | Large context, multimodal |
| **Mistral** | `mistral-large-latest` | mistral-large, mistral-medium, mistral-small, open-mistral-nemo | Fast + capable |
| **Groq** | `llama-3.3-70b-versatile` | llama-3.3-70b, deepseek-r1-distill-llama-70b, llama-3.1-8b-instant, mixtral-8x7b | Blazing inference speed |
| **xAI / Grok** | `grok-3` | grok-3, grok-3-mini, grok-3-fast, grok-2 | Creative scenes |
| **Cohere** | `command-r-plus` | command-r-plus, command-r, command, command-light | Tool-use focused |
| **Together.ai** | `Llama-3.3-70B-Instruct-Turbo` | Llama-3.3-70B, Llama-3.1-405B, DeepSeek-R1, Qwen2.5-72B | Open-source, fast |
| **Ollama** | `llama3.2` | llama3.2, mistral, phi4, gemma3, qwen2.5, deepseek-r1 | Fully local, no API key |

Switch providers from the dropdown in the chat overlay or by changing `CHAT_PROVIDER` in `.env`. Override the model per-provider with `*_MODEL` env vars (see `.env.example`).

---

## Available MCP Tools (23)

### Objects
| Tool | Description |
|---|---|
| `createObject` | Add a mesh — box, sphere, cylinder, cone, torus, plane, capsule, or glTF model |
| `updateObject` | Partial update: position, rotation, scale, material (color, metalness, roughness, emissive), visibility |
| `deleteObject` | Remove by id |
| `cloneObject` | Duplicate with optional offset |
| `getObject` | Inspect a single object |
| `getSceneState` | Full scene JSON snapshot |

### Lights
`createLight` · `updateLight` · `deleteLight` — ambient, directional, point, spot, hemisphere

### Camera
`setCamera` · `flyToObject`

### Animation
`animateObject` · `stopAnimation` — rotate, bounce, pulse, float, spin, custom keyframes

### Environment
`setEnvironment` — background color, fog, tone mapping, exposure, shadow toggle

### Scene
`clearScene` · `loadScene` · `exportScene` · `undo` · `redo` · `takeScreenshot`

### In-world Chat
| Tool | Description |
|---|---|
| `getPendingUserMessages` | Retrieve messages typed from inside the 3D canvas |
| `sendChatMessage` | Display AI reply in the floating overlay |
| `clearPendingMessages` | Flush the queue |

---

## MCP Resources

| URI | Description |
|---|---|
| `maige-3d://scene/state` | Live JSON snapshot of all objects, lights, camera, and environment |
| `maige-3d://server/sessions` | List of currently connected browser sessions (id, framework, timestamp) |

---

## MCP Prompts

| Prompt | Description |
|---|---|
| `3d-world-assistant` | Full system context for AI assistants — scene tools, chat workflow, incremental update rules |
| `framework-guide` | Per-framework geometry/material/lighting tips. Accepts `framework` argument: `threejs`, `aframe`, `babylonjs`, `r3f` |

---

## WebXR / VR Support

All four clients support immersive VR via WebXR. Click the **🥽 Enter VR** button (bottom-left) to start a session.

| Framework | Implementation |
|---|---|
| **Three.js** | Custom `VRSetup.ts` — WebXR session management, controller ray casters, `VRChatPanel.ts` canvas-texture chat panel |
| **A-Frame** | Native `vr-mode-ui` + `laser-controls`, 3D chat entity with dynamic text |
| **Babylon.js** | `WebXRDefaultExperience` + `DynamicTexture` chat panel |
| **React Three Fiber** | `@react-three/xr` v6 (`createXRStore` + `<XR>` wrapper), React VR chat panel component |

In VR, the chat panel floats in front of you and follows your gaze. AI replies appear in real-time so you can direct the scene from inside the headset.

> **Requires** a WebXR-capable browser (Chrome 79+, Edge 79+, Meta Quest Browser) and a VR headset or the [WebXR API Emulator](https://chromewebstore.google.com/detail/immersive-web-emulator/cgffilbpcibhmfbgdgebnfbdbanampke) extension for desktop testing.

---

## In-world Chat

Press **`~`** (backtick) or click **AI Chat** in the bottom-right corner. Type a message, hit **Enter**, and the AI receives it, acts on it, and replies — all without leaving the 3D viewport. The chat overlay also includes:

- **Provider selector** — switch AI providers on the fly
- **System prompt editor** — customise the AI's behaviour per session
- **Clear Scene** button — reset the world instantly
- **Debug panel** — press **Escape** to inspect scene state and connection info

---

## Architecture

```
┌─────────────────────────┐
│   MCP Host (Copilot,    │  stdio / JSON-RPC
│   Claude, Cursor, etc.) │◄────────────────────┐
└─────────────────────────┘                     │
                                                 │
                              ┌──────────────────┴──────────────────┐
                              │      MCP Server (Node.js)           │
                              │                                      │
                              │  tools/ ─ 23 tool definitions        │
                              │  state/ ─ SceneStateManager + Undo   │
                              │  chat/  ─ ChatRelay (9 providers)    │
                              │  ws/    ─ WebSocket bridge :8083     │
                              │     └── adapters/ (per-framework)    │
                              └──────────┬───────────────────────────┘
                                         │ WebSocket
        ┌────────────────┬───────────────┼───────────────┬────────────────┐
        ▼                ▼               ▼               ▼                │
┌──────────────┐ ┌──────────────┐ ┌───────────────┐ ┌──────────────┐     │
│  Three.js    │ │  A-Frame     │ │  Babylon.js   │ │  R3F / React │     │
│  :5173       │ │  :5174       │ │  :5175        │ │  :5176       │     │
│ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐  │ │ ┌──────────┐ │     │
│ │VR/WebXR  │ │ │ │VR/WebXR  │ │ │ │VR/WebXR  │  │ │ │VR/WebXR  │ │     │
│ │ChatPanel │ │ │ │ChatPanel │ │ │ │ChatPanel  │  │ │ │ChatPanel │ │     │
│ └──────────┘ │ │ └──────────┘ │ │ └──────────┘  │ │ └──────────┘ │     │
└──────────────┘ └──────────────┘ └───────────────┘ └──────────────┘
```

Each client connects via WebSocket to the same MCP server. The server maintains a single canonical scene state and pushes commands through per-framework adapters that translate Vec3 formats, material models, and geometry names into each engine's native representation.

**Key server features:**
- **Conversation history** — the AI remembers the last 20 turns of dialogue, avoiding destructive scene rebuilds
- **Scene state injection** — every AI call includes a summary of current objects, lights, and environment so the AI knows what already exists
- **Per-framework system prompts** — each client tells the AI how to generate geometries, materials, and lighting that look correct in that specific engine
- **Undo/redo** — 20-deep snapshot stack on the server, triggered via MCP tools

---

## Project Layout

```
mcp-webgpu/
├── .env.example                   ← all env vars + model lists documented
├── .vscode/mcp.json               ← pre-configured for VS Code Copilot agent mode
├── package.json                   ← pnpm workspace root
├── PLAN.md                        ← full architecture plan
├── packages/
│   ├── server/                    ← MCP server (TypeScript / Node)
│   │   └── src/
│   │       ├── main.ts            ← entry + .env discovery
│   │       ├── types.ts           ← shared types
│   │       ├── tools/             ← 23 MCP tool definitions
│   │       ├── handlers/          ← tool / prompt / resource handlers
│   │       ├── state/             ← SceneStateManager + UndoStack
│   │       ├── chat/              ← ChatRelay (9 providers) + MessageQueue
│   │       └── ws/                ← WebSocket server + framework adapters
│   │           └── adapters/      ← ThreeAdapter, AFrameAdapter,
│   │                                 BabylonAdapter, R3FAdapter
│   ├── client-threejs/            ← Three.js (Vite)
│   │   └── src/
│   │       ├── scene.ts           ← SceneManager
│   │       ├── commands/          ← command dispatcher
│   │       ├── overlay/           ← ChatOverlay UI
│   │       └── vr/               ← VRSetup + VRChatPanel (WebXR)
│   ├── client-aframe/             ← A-Frame 1.7.0 + bloom (Vite)
│   │   └── src/
│   │       ├── scene.ts           ← A-Frame SceneManager
│   │       ├── commands/          ← command dispatcher
│   │       └── overlay/           ← ChatOverlay UI
│   ├── client-babylonjs/          ← Babylon.js + PBR (Vite)
│   │   └── src/
│   │       ├── scene.ts           ← Babylon SceneManager
│   │       ├── commands/          ← command dispatcher
│   │       └── overlay/           ← ChatOverlay UI
│   └── client-r3f/                ← React Three Fiber + Zustand (Vite)
│       └── src/
│           ├── App.tsx            ← React app shell
│           ├── SceneCanvas.tsx    ← R3F canvas + XR wrapper
│           ├── store/             ← Zustand scene store
│           ├── commands/          ← command dispatcher
│           ├── overlay/           ← ChatOverlay UI
│           └── vr/               ← VRChatPanel (React XR component)
```

---

## Roadmap

- [x] **Phase 1** — Three.js client + full tool set + in-world chat
- [x] **Phase 2** — A-Frame client (1.7.0, bloom post-processing) + Babylon.js client (PBR materials)
- [x] **Phase 3** — React Three Fiber client (Zustand state, drei helpers)
- [x] **Phase 3.5** — 9 AI providers, per-framework system prompts, visual alignment across all 4 engines
- [x] **Phase 4** — WebXR / VR headset support (all 4 clients + floating VR chat panel)
- [x] **Phase 5** — VS Code MCP config, auto-open browser, conversation history + scene state awareness

---

## License

MIT
