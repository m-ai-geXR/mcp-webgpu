# maige-3d-mcp

Multi-framework 3D MCP server — control live **Three.js**, **A-Frame**, **Babylon.js**, and **R3F** scenes from any MCP-capable AI (GitHub Copilot, Claude Desktop, Cursor, etc.) with **in-world async chat** so you can talk to the AI from inside the 3D canvas while it changes the scene around you.

---

## Quick start

### 1. Install

```bash
cd mcp-webgpu
pnpm install
```

### 2. Configure

Copy and edit the env file:

```bash
cp .env.example .env
```

Key variables in `.env`:

| Variable | Default | Purpose |
|---|---|---|
| `WS_PORT` | `8083` | WebSocket bridge port |
| `AUTO_OPEN_BROWSER` | `true` | Open the 3D client automatically |
| `DEFAULT_FRAMEWORK` | `threejs` | Which client to open |
| `OPENAI_API_KEY` | *(blank)* | Enables **direct** in-world AI chat |
| `ANTHROPIC_API_KEY` | *(blank)* | Alternative AI provider |
| `CHAT_PROVIDER` | `openai` | Which key to prefer |

> **Tip — two chat modes:**
> - **Relay mode** (no key needed): the MCP client AI (Copilot, Claude, etc.) handles in-world chat by polling the `getPendingUserMessages` tool.
> - **Direct mode** (key in `.env`): the server answers in-world chat on its own, independent of the MCP client.

### 3. Build the server

```bash
pnpm build:server
```

### 4. Register with VS Code Copilot

The `.vscode/mcp.json` at the workspace root is already pre-configured. Reload your VS Code window and the `maige-3d` server will appear in Copilot agent mode.

### 5. Start the 3D browser client (dev mode)

```bash
pnpm dev:client
```

Open **http://localhost:5173** — the canvas auto-connects to the MCP WebSocket bridge.

> The server is started by VS Code via the MCP stdio transport. You do **not** need to run it manually.

---

## Available MCP Tools (23 total)

### Object tools
| Tool | Description |
|---|---|
| `createObject` | Add a mesh (box, sphere, cylinder, cone, torus, plane, capsule, gltf) |
| `updateObject` | Partial update: position, rotation, scale, material, visibility |
| `deleteObject` | Remove by id |
| `cloneObject` | Duplicate with optional offset |
| `getObject` | Inspect a single object |
| `getSceneState` | Full scene JSON snapshot |

### Light tools
`createLight` · `updateLight` · `deleteLight` — types: ambient, directional, point, spot, hemisphere

### Camera tools
`setCamera` · `flyToObject`

### Animation tools
`animateObject` · `stopAnimation`

### Environment tools
`setEnvironment` — background color, fog, tone mapping, exposure, shadows

### Scene tools
`clearScene` · `loadScene` · `exportScene` · `undo` · `redo` · `takeScreenshot`

### In-world chat tools
| Tool | Description |
|---|---|
| `getPendingUserMessages` | Get messages typed from inside the 3D canvas |
| `sendChatMessage` | Display AI reply in the floating chat overlay |
| `clearPendingMessages` | Flush the queue |

---

## In-world chat

Press **`~`** (backtick) or click the **AI Chat** panel in the bottom-right corner of the canvas. Type a message and press **Enter**. The AI will receive it on its next turn, act on it, and reply in the overlay — all without leaving the 3D environment.

---

## Project layout

```
mcp-webgpu/
├── .env                          ← your keys go here (gitignored)
├── .env.example                  ← template
├── packages/
│   ├── server/                   ← MCP server (TypeScript/Node)
│   │   └── src/
│   │       ├── main.ts           ← entry point
│   │       ├── tools/            ← 23 MCP tool definitions
│   │       ├── handlers/         ← tool/prompt/resource handlers
│   │       ├── state/            ← SceneStateManager + UndoStack
│   │       ├── chat/             ← MessageQueue + ChatRelay
│   │       └── ws/               ← WebSocket server + 4 adapters
│   └── client-threejs/           ← Vite + Three.js browser client
│       └── src/
│           ├── scene.ts          ← Three.js SceneManager
│           ├── ws-client.ts      ← WebSocket client
│           ├── commands/         ← command dispatcher
│           └── overlay/          ← floating ChatOverlay UI
└── PLAN.md                       ← full architecture plan
```

---

## Roadmap

- [x] Phase 1 — Three.js client + full tool set + in-world chat
- [ ] Phase 2 — A-Frame client + Babylon.js client
- [ ] Phase 3 — React Three Fiber client
- [ ] Phase 4 — WebXR / VR headset support
- [ ] Phase 5 — `npx maige-3d-mcp` one-liner launcher
