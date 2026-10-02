# m{ai}geXR-3d-mcp

**The multi-framework 3D MCP server that actually works.** Control live **Three.js**, **A-Frame**, **Babylon.js**, and **React Three Fiber** scenes from any MCP-capable AI — GitHub Copilot, Claude Desktop, Cursor, you name it — with **in-world async chat** so you can talk to the AI *from inside the 3D canvas* while it reshapes the world around you.

> All **four** framework clients render matching, visually-aligned output from a single unified scene state. Same prompt, same scene, any engine.

---

## Highlights

- **4 production-ready 3D clients** — Three.js, A-Frame (1.7.0 + bloom), Babylon.js (PBR), React Three Fiber + Zustand — all visually aligned
- **WebXR / VR support** — enter immersive VR in all four clients; floating chat panel follows your gaze so you can talk to the AI from inside the headset
- **9 AI providers** out of the box — OpenAI (GPT-5.2), Anthropic (Claude Sonnet 4.6), Google Gemini 3.1 Pro, Mistral, Groq (Llama 3.3 70B), xAI Grok-4, Cohere Command R+, Together.ai, and local Ollama
- **33 MCP tools** — objects, lights, cameras, animation, behaviors, particles, environment, scene I/O (including save/load to disk and standalone HTML export), arbitrary script execution, undo/redo, screenshots, and in-world chat
- **Persistent animations** — animations survive page reloads; the server stores active animations in scene state and replays them when clients reconnect
- **Concurrent animations** — multiple properties (position, rotation, scale) animate simultaneously on the same object across all engines
- **Per-framework system prompts** — each client tells the AI how to generate geometries, materials, and lighting that look correct in *that* engine (adapted from the iOS maigeXR app)
- **In-world chat** — press **`~`** to talk to the AI without leaving the 3D viewport; it reads your messages and answers in a floating overlay
- **Scene-aware AI** — 20-turn conversation history + live scene state injection ensures the AI makes incremental edits, not destructive rebuilds
- **One command** — `pnpm dev` starts the server + all four clients simultaneously; auto-opens the Three.js client in your browser
- **Hot-swappable AI provider** — change provider mid-session from the client dropdown; no restart needed
- **Live scene controls** — bloom, exposure, fog, background colour and (Three.js) chromatic aberration as sliders in the chat overlay, applied in real time across every connected client

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

> **On pnpm 10 or newer this fails.** A-Frame 1.7.1 pulls `three-bmfont-text`
> from a git repository, and recent pnpm blocks git-resolved subdependencies by
> default:
>
> ```
> ERR_PNPM_EXOTIC_SUBDEP  Exotic dependency "three-bmfont-text"
> (resolved via git-repository) is not allowed in subdependencies
> ```
>
> Install with the check relaxed instead:
>
> ```bash
> pnpm install --config.block-exotic-subdeps=false
> ```
>
> Or add `block-exotic-subdeps=false` to an `.npmrc` in this folder to make it
> stick. You may also be prompted to `pnpm approve-builds` for `esbuild`.

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
| **OpenAI** | `gpt-5.2` | gpt-5.2, gpt-5.2-pro, gpt-4.1, gpt-4.1-mini, gpt-4o, o3, o4-mini | Best general-purpose option |
| **Anthropic** | `claude-sonnet-4-6` | claude-opus-4-6, claude-sonnet-4-6, claude-sonnet-4-5, claude-haiku-4-5 | Strong reasoning |
| **Google Gemini** | `gemini-3.1-pro-preview` | gemini-3.1-pro-preview, gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite | Latest flagship, multimodal |
| **Mistral** | `mistral-large-latest` | mistral-large, mistral-medium, mistral-small, open-mistral-nemo | Fast + capable |
| **Groq** | `llama-3.3-70b-versatile` | llama-3.3-70b, deepseek-r1-distill-llama-70b, llama-3.1-8b-instant, mixtral-8x7b | Blazing inference speed |
| **xAI / Grok** | `grok-4-0709` | grok-4-0709, grok-4-fast-reasoning, grok-3, grok-3-mini, grok-code-fast-1 | Latest Grok 4 |
| **Cohere** | `command-r-plus` | command-r-plus, command-r, command, command-light | Tool-use focused |
| **Together.ai** | `DeepSeek-R1-Distill-Llama-70B-free` | DeepSeek-R1-Distill-70B-free, Llama-3.3-70B-free, Llama-3.3-70B, DeepSeek-R1, Qwen2.5-72B | Free tier available |
| **Ollama** | `llama3.2` | llama3.2, mistral, phi4, gemma3, qwen2.5, deepseek-r1 | Fully local, no API key |

Switch providers from the dropdown in the chat overlay or by changing `CHAT_PROVIDER` in `.env`. Override the model per-provider with `*_MODEL` env vars (see `.env.example`).

---

## Available MCP Tools (33)

### Objects (6)
| Tool | Description |
|---|---|
| `createObject` | Add a mesh — 17 geometry types: box, sphere, cylinder, cone, torus, torusKnot, plane, capsule, ring, circle, tube, line (laser beams / neon streaks), the four platonic solids (dodecahedron, icosahedron, octahedron, tetrahedron), or a glTF model |
| `updateObject` | Partial update: position, rotation, scale, material (color, metalness, roughness, emissive), visibility |
| `deleteObject` | Remove by id |
| `cloneObject` | Duplicate with optional offset |
| `getObject` | Inspect a single object |
| `getSceneState` | Full scene JSON snapshot |

### Lights (3)
`createLight` · `updateLight` · `deleteLight` — ambient, directional, point, spot, hemisphere

### Camera (2)
`setCamera` · `flyToObject`

### Animation (2)
`animateObject` · `stopAnimation` — rotate, bounce, pulse, float, spin, custom keyframes. Animations persist in server state and replay automatically on page reload. Multiple properties animate concurrently per object.

### Behaviors (2)
`addBehavior` · `removeBehavior` — attach a per-frame behavior to an object: `spin`, `bob`, `orbit`, `lookAt` or `pulse`, each with its own params. Unlike animations, behaviors tick every frame and compose with one another.

### Particles (3)
| Tool | Description |
|---|---|
| `createParticles` | Particle volume — up to 10,000 points with position, spread, size, color, emissive glow, opacity, drift direction and speed, size attenuation, twinkle, and additive or normal blending |
| `updateParticles` | Change any property of a live system |
| `deleteParticles` | Remove a system |

### Environment (1)
`setEnvironment` — background color, fog, tone mapping, exposure, shadow toggle, bloom, vignette, chromatic aberration, HDRI maps

### Scene (10)
| Tool | Description |
|---|---|
| `clearScene` | Remove all user-created objects and reset default lighting |
| `exportScene` | Export the scene as a JSON string |
| `loadScene` | Replace the scene from an exported JSON string |
| `saveScene` | Save the scene to a JSON file in `scenes/` |
| `listScenes` | List saved scene files |
| `loadSceneFromFile` | Load a saved scene by name |
| `exportStandaloneScene` | Export a self-contained HTML file that plays in any browser with no server and no chat UI |
| `undo` / `redo` | Walk the 20-deep snapshot stack |
| `takeScreenshot` | Capture the current view |

### Script (1)
`executeScript` — run arbitrary JavaScript in the connected browser's scene context, with access to `scene`, `camera`, `renderer`, `controls` and a `helpers` object. The escape hatch for custom shaders, procedural generation and physics the typed tools don't cover.

### In-world Chat (3)
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
| `3d-world-assistant` | Full system context for AI assistants — scene tools, chat workflow, incremental update rules, **10+ advanced demo recipes** (galaxy, DNA helix, neon tunnel, crystal cluster, etc.) |
| `framework-guide` | Per-framework geometry/material/lighting tips. Accepts `framework` argument: `threejs`, `aframe`, `babylonjs`, `r3f` |
| `demo-showcase` | **NEW**: Instant access to 10+ stunning pre-built demo templates. Perfect for quick impressive visualizations. Accepts `style` argument: `galaxy`, `dna`, `tunnel`, `crystals`, `geometries`, `wave`, `spiral`, `orbit`, `explosion`, `all` |

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
- **Model parameters** — Temperature and Top-p sliders, matching the controls in the m{ai}geXR iOS and desktop apps
- **Scene Controls** — the collapsible post-processing and environment panel described below
- **Clear Scene** button — reset the world instantly
- **Debug panel** — press **Escape** to inspect scene state and connection info

The controls and the message log scroll **independently**, so a long AI response can never push the sliders out of reach.

---

## Scene Controls

The chat overlay carries a collapsible **🎨 Scene Controls** panel. Every slider
updates on `input` — so the scene changes while you drag — and the change is sent
to the server as an `update-environment` message, merged into canonical scene
state, and broadcast to **all** connected clients. Open two frameworks side by
side and they stay in sync.

### Post-processing

| Control | Range | Effect |
|---|---|---|
| **Bloom Strength** | 0–2, step 0.1 | Glow intensity around bright objects |
| **Bloom Threshold** | 0–1, step 0.01 | Minimum brightness that blooms |
| **Exposure** | 0–3, step 0.1 | Overall scene brightness / HDR exposure |
| **Chromatic Aberration** | 0–0.05, step 0.001 | Colour fringing (Three.js only) |

Chromatic aberration's `ShaderPass` is disabled outright at `0`, so returning
the slider to zero costs nothing and leaves no residual effect.

### Environment

| Control | Range | Effect |
|---|---|---|
| **Background Color** | colour picker | Scene background |
| **Fog Near** | 0–100 | Fog start distance |
| **Fog Far** | 0–1000 | Fog end distance |

### Framework support

Controls are framework-specific — each client shows only what its engine can
actually do:

| Effect | Three.js | A-Frame | Babylon.js | R3F |
|---|:---:|:---:|:---:|:---:|
| Bloom (strength / threshold) | ✅ | ✅ | ✅ | ✅ |
| Exposure | ✅ | ✅ | ✅ | ✅ |
| Chromatic aberration | ✅ | — | — | — |
| Background colour | ✅ | ✅ | ✅ | ✅ |
| Fog (near / far) | ✅ | ✅ | ✅ | ✅ |

A-Frame gets the full bloom and exposure set: v1.7.0 runs Three.js
`EffectComposer` + `UnrealBloomPass` underneath.

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
                              │  tools/ ─ 33 tool definitions        │
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
- **Animation persistence** — active animations are stored in scene state and replayed on reconnect, so looping animations survive page reloads

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
│   │       ├── tools/             ← 33 MCP tool definitions
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
- [x] **Phase 6** — Animation persistence, concurrent multi-property animations, enhanced default lighting (ambient + hemisphere + directional with shadows)
- [x] **Phase 7** — Live scene controls (bloom, exposure, fog, background) across all 4 clients, Three.js chromatic aberration, Temperature/Top-p parity with the m{ai}geXR apps, and independently scrolling chat controls

See [CHANGELOG-2026-04-05.md](CHANGELOG-2026-04-05.md) for the detailed Phase 7 notes.

---

## Tests

```bash
cd packages/server
npx vitest run
```

29 tests across 2 files, covering `SceneStateManager` (17) and the `UndoStack`
(12).

---

## License

MIT
