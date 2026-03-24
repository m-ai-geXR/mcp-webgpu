# maige-3d-mcp

**The multi-framework 3D MCP server that actually works.** Control live **Three.js**, **A-Frame**, **Babylon.js**, and **React Three Fiber** scenes from any MCP-capable AI — GitHub Copilot, Claude Desktop, Cursor, you name it — with **in-world async chat** so you can talk to the AI *from inside the 3D canvas* while it reshapes the world around you.

> All **four** framework clients render matching, visually-aligned output from a single unified scene state. Same prompt, same scene, any engine.

---

## Highlights

- **4 production-ready 3D clients** — Three.js, A-Frame (1.7.0 + bloom), Babylon.js (PBR), React Three Fiber + Zustand — all visually aligned
- **9 AI providers** out of the box — OpenAI (GPT-4.1), Anthropic (Claude Sonnet 4), Google Gemini 2.5 Pro, Mistral, Groq (Llama 3.3 70B), xAI Grok-3, Cohere Command R+, Together.ai, and local Ollama
- **23 MCP tools** — objects, lights, cameras, animation, environment, scene I/O, undo/redo, screenshots, and in-world chat
- **Per-framework system prompts** — each client tells the AI how to generate geometries, materials, and lighting that look correct in *that* engine (adapted from the iOS maigeXR app)
- **In-world chat** — press **`~`** to talk to the AI without leaving the 3D viewport; it reads your messages and answers in a floating overlay
- **One command** — `pnpm dev` starts the server + all four clients simultaneously
- **Hot-swappable AI provider** — change provider mid-session from the client dropdown; no restart needed

---

## Quick start

### 1. Install

```bash
cd mcp-webgpu
pnpm install
```

### 2. Configure

```bash
cp .env.example .env
```

Add at least one API key. All variables:

| Variable | Default | Purpose |
|---|---|---|
| `WS_PORT` | `8083` | WebSocket bridge port |
| `CHAT_PROVIDER` | `openai` | Active AI provider for direct chat |
| `OPENAI_API_KEY` | — | OpenAI (GPT-4.1) |
| `ANTHROPIC_API_KEY` | — | Anthropic (Claude Sonnet 4) |
| `GOOGLE_API_KEY` | — | Google Gemini 2.5 Pro |
| `MISTRAL_API_KEY` | — | Mistral Large |
| `GROQ_API_KEY` | — | Groq (Llama 3.3 70B) |
| `XAI_API_KEY` | — | xAI / Grok-3 |
| `COHERE_API_KEY` | — | Cohere Command R+ |
| `TOGETHER_API_KEY` | — | Together.ai (Llama 3.3 70B Turbo) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Local Ollama |

> **Two chat modes:**
> - **Relay mode** (no key needed): the MCP host AI (Copilot, Claude Desktop) handles in-world chat by polling `getPendingUserMessages`.
> - **Direct mode** (key in `.env`): the server answers chat autonomously using the configured provider.

### 3. Build & run

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

### 4. Register with VS Code Copilot

The `.vscode/mcp.json` is pre-configured. Reload VS Code and `maige-3d` appears in Copilot agent mode.

---

## Supported AI Providers (9)

| Provider | Default Model | Notes |
|---|---|---|
| **OpenAI** | `gpt-4.1` | Best general-purpose option |
| **Anthropic** | `claude-sonnet-4-6` | Strong reasoning |
| **Google Gemini** | `gemini-2.5-pro` | Large context, multimodal |
| **Mistral** | `mistral-large-latest` | Fast + capable |
| **Groq** | `llama-3.3-70b-versatile` | Blazing inference speed |
| **xAI / Grok** | `grok-3` | Creative scenes |
| **Cohere** | `command-r-plus` | Tool-use focused |
| **Together.ai** | `Llama-3.3-70B-Instruct-Turbo` | Open-source, fast |
| **Ollama** | `llama3.2` | Fully local, no API key |

Switch providers from the dropdown in the chat overlay or by changing `CHAT_PROVIDER` in `.env`.

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
                    ┌────────────────────┼────────────────────┐
                    │                    │                     │
         ┌──────────┴──┐    ┌───────────┴──┐    ┌────────────┴─┐
         │  Three.js    │    │  A-Frame     │    │  Babylon.js   │
         │  :5173       │    │  :5174       │    │  :5175        │
         └─────────────┘    └──────────────┘    └───────────────┘
                                                        │
                                              ┌─────────┴──────┐
                                              │  React Three   │
                                              │  Fiber :5176   │
                                              └────────────────┘
```

Each client connects via WebSocket to the same MCP server. The server maintains a single canonical scene state and pushes commands through per-framework adapters that translate Vec3 formats, material models, and geometry names into each engine's native representation.

---

## Project Layout

```
mcp-webgpu/
├── .env.example
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
│   │       └── overlay/           ← ChatOverlay UI
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
│           ├── SceneCanvas.tsx    ← R3F canvas + screenshot
│           ├── store/             ← Zustand scene store
│           ├── commands/          ← command dispatcher
│           └── overlay/           ← ChatOverlay UI
```

---

## Roadmap

- [x] **Phase 1** — Three.js client + full tool set + in-world chat
- [x] **Phase 2** — A-Frame client (1.7.0, bloom post-processing) + Babylon.js client (PBR materials)
- [x] **Phase 3** — React Three Fiber client (Zustand state, drei helpers)
- [x] **Phase 3.5** — 9 AI providers, per-framework system prompts, visual alignment across all 4 engines
- [ ] **Phase 4** — WebXR / VR headset support
- [ ] **Phase 5** — `npx maige-3d-mcp` one-liner launcher

---

## License

MIT
