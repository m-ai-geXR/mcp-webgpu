# maige-3d-mcp — Implementation Plan

**Goal:** A multi-framework MCP server that lets an AI control live 3D scenes built with
Three.js, A-Frame, Babylon.js, or React Three Fiber (R3F) — while the user can chat
from *inside* the environment and see changes stream in asynchronously.

---

## 1. What the Original Project Does (three-js-mcp)

| Aspect | Detail |
|---|---|
| Transport | MCP stdio (Claude Desktop / Cursor / Copilot) |
| Bridge | WebSocket server on port 8082 |
| Client | Single vanilla Three.js HTML page |
| Tools | addObject, moveObject, removeObject, startRotation, stopRotation, getSceneState |
| Direction | One-way: AI → MCP server → browser client |
| State | Scene serialized as JSON, sent from browser → MCP on every change |

**Limitations we are solving:**
- Only Three.js is supported.
- No real-time in-world chat; user must leave the 3D view to interact with the AI.
- No framework abstraction — every tool is Three.js-specific.
- No undo/redo, no material editing, no lighting tools, no camera control, no physics.
- No hot-reload; modifications rebuild or flicker the scene.

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────┐
│            AI Client (Copilot / Cursor / Claude)  │
│   Calls MCP tools → reads resources/prompts       │
└───────────────────────┬──────────────────────────┘
                        │ stdio  (MCP protocol)
┌───────────────────────▼──────────────────────────┐
│             MCP SERVER  (Node.js / TypeScript)     │
│                                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │  Tool Registry  (framework-agnostic API)     │  │
│  │  scene · objects · materials · lights ·      │  │
│  │  camera · animation · environment · code     │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │  In-World Chat Relay                         │  │
│  │  • Receives user messages from browser       │  │
│  │  • Queues them as pending prompts            │  │
│  │  • Streams AI responses back to browser      │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │  Scene State Manager                         │  │
│  │  • UUID-keyed object store                   │  │
│  │  • Undo / redo stack  (20 snapshots)         │  │
│  │  • Export / import JSON                      │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │  WebSocket Server  (port 8083)               │  │
│  │  • Handshake identifies framework (header)   │  │
│  │  • Routes commands through correct adapter   │  │
│  │  • Heartbeat / reconnect logic               │  │
│  └─────────────────────────────────────────────┘  │
└───────────────────────┬──────────────────────────┘
                        │ WebSocket
        ┌───────────────┼───────────────────┐
        ▼               ▼                   ▼               ▼
┌──────────────┐ ┌──────────┐ ┌───────────────┐ ┌──────────────┐
│  Three.js    │ │ A-Frame  │ │  Babylon.js   │ │  R3F / React │
│  Client      │ │  Client  │ │  Client       │ │  Client      │
│              │ │          │ │               │ │              │
│ [3D Scene]   │ │[3D Scene]│ │ [3D Scene]    │ │ [3D Scene]   │
│ [Chat Overlay│ │[Chat Ovl]│ │ [Chat Overlay]│ │ [Chat Overlay│
└──────────────┘ └──────────┘ └───────────────┘ └──────────────┘
```

Each browser client:
1. Renders the 3D scene with its framework.
2. Connects to the MCP server via WebSocket, announces its framework type.
3. Hosts a **floating chat overlay** UI inside the 3D canvas.
4. Listens for commands and applies them without a full scene reload.
5. Sends scene state diffs (not the full state every time) back to the server.

---

## 3. Project Structure (Monorepo)

```
mcp-3d-world/
├── packages/
│   ├── server/                   # MCP server
│   │   ├── src/
│   │   │   ├── main.ts           # Entry point: wires MCP + WebSocket
│   │   │   ├── tools/
│   │   │   │   ├── index.ts      # Tool registry
│   │   │   │   ├── scene.ts      # Scene-level tools
│   │   │   │   ├── objects.ts    # Object CRUD tools
│   │   │   │   ├── materials.ts  # Material tools
│   │   │   │   ├── lights.ts     # Lighting tools
│   │   │   │   ├── camera.ts     # Camera tools
│   │   │   │   ├── animation.ts  # Animation / tween tools
│   │   │   │   ├── environment.ts# Sky, fog, HDRI, background
│   │   │   │   └── code.ts       # runCode escape-hatch tool
│   │   │   ├── handlers/
│   │   │   │   ├── toolHandler.ts
│   │   │   │   ├── promptHandler.ts
│   │   │   │   └── resourceHandler.ts
│   │   │   ├── state/
│   │   │   │   ├── SceneStateManager.ts
│   │   │   │   └── UndoStack.ts
│   │   │   ├── chat/
│   │   │   │   ├── ChatRelay.ts  # Bidirectional message queue
│   │   │   │   └── MessageQueue.ts
│   │   │   └── ws/
│   │   │       ├── WSServer.ts   # WebSocket server + session mgmt
│   │   │       └── adapters/
│   │   │           ├── IFrameworkAdapter.ts  # interface
│   │   │           ├── ThreeJSAdapter.ts
│   │   │           ├── AFrameAdapter.ts
│   │   │           ├── BabylonAdapter.ts
│   │   │           └── R3FAdapter.ts
│   │   └── package.json
│   │
│   ├── client-threejs/           # Vanilla Three.js browser client
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── scene.ts          # Three.js scene setup
│   │   │   ├── ws-client.ts      # WebSocket → command dispatch
│   │   │   ├── commands/         # One file per command type
│   │   │   └── overlay/
│   │   │       └── ChatOverlay.ts
│   │   └── package.json
│   │
│   ├── client-aframe/            # A-Frame HTML + components
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── components/       # a-frame custom components
│   │   │   ├── ws-client.ts
│   │   │   └── overlay/
│   │   │       └── ChatOverlay.ts
│   │   └── package.json
│   │
│   ├── client-babylonjs/         # Babylon.js browser client
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── scene.ts
│   │   │   ├── ws-client.ts
│   │   │   ├── commands/
│   │   │   └── overlay/
│   │   │       └── ChatOverlay.ts
│   │   └── package.json
│   │
│   └── client-r3f/               # React + R3F (Vite)
│       ├── index.html
│       ├── src/
│       │   ├── App.tsx
│       │   ├── SceneCanvas.tsx
│       │   ├── ws-client.ts
│       │   ├── store/            # Zustand store for scene state
│       │   │   └── sceneStore.ts
│       │   ├── components/       # R3F mesh components
│       │   └── overlay/
│       │       └── ChatOverlay.tsx
│       └── package.json
│
├── examples/
├── docs/
└── package.json  (pnpm workspaces)
```

---

## 4. Unified Tool API (Framework-Agnostic)

Every tool works identically regardless of which client is connected. The server-side
adapter translates the generic command into the framework's native format before sending
it via WebSocket.

### 4.1 Object Tools

| Tool | Parameters | Description |
|---|---|---|
| `createObject` | `type, id?, position, rotation?, scale?, properties` | Add a mesh / entity |
| `updateObject` | `id, properties` | Partial update (position, scale, etc.) |
| `deleteObject` | `id` | Remove by id |
| `cloneObject` | `id, newId?, offset?` | Duplicate an object |
| `getSceneState` | — | Full scene snapshot |
| `getObject` | `id` | Single object snapshot |

**Supported types (all frameworks):**
`box, sphere, cylinder, cone, torus, plane, capsule, custom-gltf`

### 4.2 Material Tools

| Tool | Parameters |
|---|---|
| `setMaterial` | `id, type (standard/phong/toon/pbr), color, metalness?, roughness?, opacity?, texture?` |
| `setTexture` | `id, slot (color/normal/roughness), url` |

### 4.3 Light Tools

| Tool | Parameters |
|---|---|
| `createLight` | `id?, lightType (ambient/directional/point/spot/hemisphere), color, intensity, position?, target?` |
| `updateLight` | `id, properties` |
| `deleteLight` | `id` |

### 4.4 Camera Tools

| Tool | Parameters |
|---|---|
| `setCamera` | `position, target, fov?` |
| `orbitCamera` | `target, radius, autoRotate?` |
| `flyToObject` | `id, duration?` |

### 4.5 Animation Tools

| Tool | Parameters |
|---|---|
| `animateObject` | `id, property (position/rotation/scale), to, duration, easing?, loop?` |
| `stopAnimation` | `id` |
| `playGLTFAnimation` | `id, animationName, loop?` |

### 4.6 Environment Tools

| Tool | Parameters |
|---|---|
| `setEnvironment` | `sky (color/hdri-url), fog (color, near, far)?, background?` |
| `setSkybox` | `type (color/gradient/hdri/procedural), ...params` |

### 4.7 Scene Tools

| Tool | Parameters |
|---|---|
| `clearScene` | — |
| `loadScene` | `json` (scene snapshot) |
| `exportScene` | — → returns JSON |
| `undo` | — |
| `redo` | — |
| `takeScreenshot` | — → returns base64 PNG |

### 4.8 Chat / In-World Tools

| Tool | Parameters |
|---|---|
| `getPendingUserMessages` | — → array of queued user chat messages |
| `sendChatMessage` | `message` → display AI text in the in-world chat overlay |
| `clearPendingMessages` | — |

### 4.9 Escape Hatch

| Tool | Parameters |
|---|---|
| `runCode` | `code` (JS string), `framework` → executed in client sandbox |

---

## 5. In-World Async Chat — Design

This is the most differentiating feature.

### Flow

```
User types in overlay
        │
        ▼
Browser WebSocket  ──► MCP Server ChatRelay
                              │
                              ▼  (stored in MessageQueue)
                       AI reads via getPendingUserMessages
                              │
                              ▼  (AI calls scene tools)
                       Scene updates streamed via WebSocket
                              │
                              ▼
                       AI calls sendChatMessage("Done!")
                              │
                              ▼
                       Browser shows AI reply in overlay
```

### Chat Overlay UI (all clients share the same vanilla JS/CSS overlay)

- **Floating panel** anchored bottom-right of the canvas.
- **Collapsed by default** — a small icon. Expands on click / keyboard shortcut `~`.
- **Doesn't block pointer lock** — works in first-person XR mode too.
- Input → Enter sends to server via WebSocket.
- Shows "AI is thinking..." indicator while command is in-flight.
- Renders simple markdown in AI replies (bold, code blocks).

### MessageQueue schema

```ts
interface PendingMessage {
  id: string;          // uuid
  timestamp: number;
  message: string;
  sessionId: string;   // identifies which browser client
  framework: Framework;
}
```

### Polling vs. Push

The AI (via MCP) pulls pending messages by calling `getPendingUserMessages`. This keeps
the MCP protocol purely request/response and avoids any SSE complexity on the server.
The AI should include a **system prompt** (provided via MCP `prompts`) instructing it to
call `getPendingUserMessages` at the start of every conversation turn.

---

## 6. Framework Adapter Interface

```ts
// IFrameworkAdapter.ts
export interface IFrameworkAdapter {
  framework: 'threejs' | 'aframe' | 'babylonjs' | 'r3f';

  /** Translate a generic command to a framework-specific WS message */
  translateCommand(command: GenericCommand): FrameworkCommand;

  /** Parse incoming framework state into the canonical SceneState format */
  parseState(raw: unknown): SceneState;
}
```

Each adapter lives in `packages/server/src/ws/adapters/` and handles the translation
differences:

| Concern | Three.js | A-Frame | Babylon.js | R3F |
|---|---|---|---|---|
| Object type names | `BoxGeometry` | `<a-box>` | `MeshBuilder.CreateBox` | `<Box>` |
| Position format | `{x,y,z}` | `"x y z"` string | `Vector3` | `[x,y,z]` array |
| Material API | `MeshStandardMaterial` | `material` component | `StandardMaterial` | `<meshStandardMaterial>` |
| Animation | `GSAP / AnimationMixer` | `animation` component | `AnimationGroup` | `useSpring` / `@react-spring/three` |

---

## 7. Build Phases

### Phase 1 — Core Server + Three.js Client (MVP)  ✦ Week 1-2

- [x] Monorepo scaffold with pnpm workspaces
- [x] MCP server: stdio transport, WebSocket server, session manager
- [x] `SceneStateManager` + `UndoStack`
- [x] All object/material/light/camera/animation/environment tools (Three.js adapter only)
- [x] Three.js browser client with full command dispatch
- [x] In-world `ChatOverlay` component (shared vanilla TS)
- [x] `MessageQueue` and `ChatRelay` module
- [x] MCP prompt: `3d-world-assistant` with instructions for polling messages

### Phase 2 — A-Frame + Babylon.js Adapters  ✦ Week 3

- [x] `AFrameAdapter` + A-Frame client (`index.html` with custom A-Frame components)
- [x] `BabylonAdapter` + Babylon.js client
- [x] Adapter unit tests (command translation correctness)

### Phase 3 — R3F Client  ✦ Week 4

- [x] Vite + React + R3F client scaffold
- [x] Zustand store for reactive scene state
- [x] `R3FAdapter` on server
- [x] `ChatOverlay.tsx` (React version of shared overlay)

### Phase 4 — XR / Immersive Mode  ✦ Week 5

- [x] WebXR entry point in each client (VR headset support)
- [x] Chat overlay ported to XR spatial panel (all 4 clients)
- [x] `takeScreenshot` tool implemented in all clients
- [x] `loadScene` / `exportScene` round-trip test

### Phase 5 — DX + Docs  ✦ Week 6

- [x] `npx maige-3d-mcp` one-liner launch
- [x] Auto-open browser on server start (Vite `open: true`)
- [x] VS Code extension config snippet for Copilot agent mode (`.vscode/mcp.json`)
- [x] README with architecture docs, provider table, tool reference
- [x] Conversation history (20 turns) + scene state awareness for incremental AI updates

---

## 8. Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| MCP transport | stdio | Standard for Copilot/Cursor/Claude Desktop |
| WS port | 8083 (not 8082 to avoid conflict) | Avoid collision with original project |
| Monorepo tool | pnpm workspaces | Fast, consistent with existing WebMaigeXr |
| Server language | TypeScript / Node.js | Matches original, good SDK support |
| Client bundler | Vite (all clients) | Fast HMR, supports vanilla TS + React |
| State format | Canonical JSON (adapter normalizes) | Single schema for all frameworks |
| Scene diffing | Full snapshot on explicit `getSceneState`, diffs for live updates | Balances bandwidth vs. correctness |
| Chat protocol | WS message type `"user-chat"` / `"ai-reply"` / `"command"` | Simple discriminated union |
| Undo stack | 20 deep JSON snapshots, server-side | Never lose work mid-session |
| Security (runCode) | Sandboxed via `new Function()` in client only, server never evals | No server-side code execution |

---

## 9. WebSocket Message Protocol

All messages are JSON with a `type` discriminator:

```ts
// Client → Server
{ type: "hello",        framework: "threejs" | "aframe" | "babylonjs" | "r3f" }
{ type: "state-update", data: SceneState }
{ type: "state-diff",   patch: JSONPatch[] }
{ type: "user-chat",    sessionId: string, message: string }
{ type: "screenshot",   dataUrl: string }   // response to a screenshot request

// Server → Client
{ type: "command",      action: string, ...params }
{ type: "ai-reply",     message: string }
{ type: "ack",          commandId: string }
{ type: "error",        message: string }
```

---

## 10. MCP Prompts

The server will expose two prompts:

**`3d-world-assistant`** — Injected as the system context. Instructs the AI to:
1. Call `getSceneState()` first to understand what exists.
2. Call `getPendingUserMessages()` at the start of every turn to check for in-world chat.
3. Process user messages and emit scene commands + `sendChatMessage` reply.
4. Use `undo` if user asks to revert.
5. Never call `runCode` unless specifically asked.

**`framework-guide`** — Per-framework tips (which types are available, coordinate system,
naming conventions).

---

## 11. Integration with Existing maigeXR Workspace

The `mcp-webgpu/` folder at the workspace root is the target directory for this project.
Because `WebMaigeXr/` already uses pnpm and Next.js, the MCP project will be self-contained
and not add dependencies to the web app — it is a separate tool that talks to any page via
WebSocket.

**To use with Copilot Agent Mode:**
```json
// .vscode/mcp.json
{
  "servers": {
    "maige-3d": {
      "type": "stdio",
      "command": "node",
      "args": ["mcp-webgpu/packages/server/build/main.js"]
    }
  }
}
```

---

## 12. What We Build First (Next Session)

1. **Scaffold the monorepo** inside `mcp-webgpu/`.
2. **Port and extend the MCP server** with all tool definitions and the `SceneStateManager`.
3. **Build the Three.js client** (MVP — proves the end-to-end loop works).
4. **Add the ChatOverlay + ChatRelay** (in-world async chat).
5. Gates for moving to Phase 2: AI can add/move/delete objects, change materials, control
   the camera, and receive + reply to a user chat message sent from inside the 3D scene.
