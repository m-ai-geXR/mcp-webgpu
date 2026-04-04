# maige-3d-mcp

> Multi-framework 3D MCP server for AI-powered scene control

Control live **Three.js**, **A-Frame**, **Babylon.js**, and **React Three Fiber** scenes with AI — featuring **in-world chat**, **WebXR VR support**, and **9 AI providers**.

## Features

- 🎨 **4 Framework Clients** — Three.js, A-Frame, Babylon.js, React Three Fiber (all included)
- 🤖 **9 AI Providers** — OpenAI, Anthropic, Google Gemini, Mistral, Groq, xAI, Cohere, Together.ai, Ollama
- 🛠️ **33 MCP Tools** — Complete scene control (objects, lights, camera, animation, behaviors, particles, environment)
- 💬 **In-World Chat** — Type messages from inside the 3D viewport (press `~`)
- 🥽 **WebXR VR Support** — Full immersive mode with floating 3D chat panels
- 🎭 **Creative AI System** — Teaches lighting, composition, color theory, and atmospheric design
- ✅ **30 Passing Tests** — Comprehensive test coverage with 100% TypeScript type safety

## Quick Start

```bash
npx maige-3d-mcp
```

That's it! The server starts and opens the Three.js client at `http://localhost:5173`.

Press `~` (backtick) to open the chat overlay and start talking to AI from inside the scene.

## Installation

### Option 1: npx (Recommended)

```bash
npx maige-3d-mcp
```

No installation needed. Always runs the latest version.

### Option 2: Global Install

```bash
npm install -g maige-3d-mcp
maige-3d-mcp
```

### Option 3: From Source

```bash
git clone https://github.com/m-ai-geXR/maigeXR.git
cd maigeXR/mcp-webgpu
pnpm install
pnpm build:server
pnpm dev
```

## Configuration

Create a `.env` file in your working directory:

```bash
# At least one API key required for in-world chat

# OpenAI (GPT-4, o1, etc.)
OPENAI_API_KEY=sk-...

# Anthropic (Claude Opus, Sonnet, Haiku)
ANTHROPIC_API_KEY=sk-ant-...

# Google AI (Gemini Pro, Flash)
GOOGLE_API_KEY=...

# Together.ai (FREE DeepSeek R1, Llama 3.3)
TOGETHER_API_KEY=...

# Groq (Fast inference)
GROQ_API_KEY=...

# Mistral
MISTRAL_API_KEY=...

# xAI / Grok
XAI_API_KEY=...

# Cohere
COHERE_API_KEY=...

# Ollama (local, no API key needed)
OLLAMA_BASE_URL=http://localhost:11434
```

**Get Free API Keys:**
- [Together.ai](https://api.together.ai/settings/api-keys) — FREE DeepSeek R1 70B + Llama 3.3 70B
- [Google AI Studio](https://aistudio.google.com/apikey) — FREE Gemini 3.1 Pro
- [Ollama](https://ollama.com/) — Run Llama, Mistral, Phi4 locally (no API key)

## Usage

### MCP Host Integration (GitHub Copilot, Claude Desktop, Cursor)

Add to your MCP config (`mcp.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "maige-3d-mcp": {
      "command": "npx",
      "args": ["maige-3d-mcp"]
    }
  }
}
```

The AI can now use all 33 MCP tools to control the scene.

### Standalone Mode

Run without MCP host:

```bash
npx maige-3d-mcp
```

Use **in-world chat** (press `~`) to talk to AI directly from the 3D viewport.

## Available Clients

All four clients auto-start and connect to the server:

- **Three.js** — http://localhost:5173 (vanilla JS, full control)
- **A-Frame** — http://localhost:5174 (declarative HTML, VR-native)
- **Babylon.js** — http://localhost:5175 (PBR materials, enterprise rendering)
- **React Three Fiber** — http://localhost:5176 (React components, Zustand state)

Same prompt, same scene, any engine.

## MCP Tools (33 Total)

### Objects (18 Geometry Types)
- `createObject` — box, sphere, cylinder, cone, torus, plane, capsule, torusKnot, ring, circle, dodecahedron, icosahedron, octahedron, tetrahedron, tube, line, gltf
- `updateObject`, `deleteObject`, `cloneObject`, `getObject`, `getSceneState`

### Lights
- `createLight`, `updateLight`, `deleteLight` — ambient, directional, point, spot, hemisphere

### Camera
- `setCamera`, `flyToObject` — smooth camera animations

### Animation & Behaviors
- `animateObject`, `stopAnimation` — timed A→B transitions
- `addBehavior`, `removeBehavior` — continuous effects (spin, bob, orbit, lookAt, pulse)

### Particles
- `createParticles`, `updateParticles`, `deleteParticles` — GPU particle systems with twinkle/additive blending

### Environment
- `setEnvironment` — background, fog, shadows, bloom, vignette, chromatic aberration, HDRI maps

### Scripting
- `executeScript` — run arbitrary JavaScript in the client (access to scene, camera, renderer, THREE)

### Scene Management
- `clearScene`, `loadScene`, `exportScene` — full scene state I/O
- `saveScene`, `listScenes`, `loadSceneFromFile` — persistent file storage
- `exportStandaloneScene` — export as single self-contained HTML
- `undo`, `redo` — 20-deep snapshot stack
- `takeScreenshot` — export as base64 PNG

### In-World Chat
- `getPendingUserMessages` — retrieve messages from 3D canvas overlay
- `sendChatMessage` — display AI replies in floating panel
- `clearPendingMessages` — flush message queue

## Example: Create a Glowing Portal

From any MCP-capable AI (Copilot, Claude, Cursor):

```typescript
// AI calls these tools automatically:
await createObject({
  id: 'portal',
  type: 'torus',
  position: {x: 0, y: 1.5, z: 0},
  scale: {x: 2, y: 2, z: 0.3},
  rotation: {x: 90, y: 0, z: 0},
  material: {
    color: '#1a1a1a',
    emissive: '#ff00ff',
    emissiveIntensity: 2.0,
    metalness: 0.9
  }
});

await createLight({
  id: 'neon',
  lightType: 'point',
  color: '#ff00ff',
  intensity: 3,
  position: {x: 0, y: 1.5, z: 0}
});

await addBehavior({
  id: 'spin',
  objectId: 'portal',
  type: 'spin',
  params: {speedY: 1}
});

await setEnvironment({
  background: '#0a0a1e',
  fog: {color: '#6600ff', near: 8, far: 25},
  bloom: {strength: 0.8, threshold: 0.5, radius: 0.4}
});
```

**All four clients render the same scene instantly.**

## WebXR / VR Mode

Click the 🥽 **Enter VR** button in any client to step inside the scene. The chat panel becomes a floating 3D canvas in front of you.

Requires:
- WebXR-capable browser (Chrome 79+, Edge 79+, Meta Quest Browser)
- VR headset (or use [WebXR API Emulator](https://chromewebstore.google.com/detail/immersive-web-emulator/cgffilbpcibhmfbgdgebnfbdbanampke))

## Creative AI System

The AI is taught to think like a visual artist:

- **Lighting creates emotion** — Warm (#ff9966) vs cool (#66ccff) vs neon
- **Composition creates interest** — Rule of thirds, depth layers, varied sizes
- **Color theory matters** — Complementary, analogous, accent colors
- **Atmosphere is everything** — Fog, dark backgrounds, emissive materials

When you ask for "something cool," the AI suggests themed experiences:
- "A neon cyberpunk alley with fog and glowing signs?"
- "A serene Japanese garden with cherry blossoms and lanterns?"
- "An abstract art installation with floating geometric shapes?"

## Architecture

```
MCP Host (Copilot/Claude/Cursor)
  ↓ stdio / JSON-RPC
MCP Server (Node.js, port :8083 WebSocket)
  ├─ handlers/ — 33 MCP tool definitions
  ├─ state/    — Canonical scene state + undo stack
  ├─ chat/     — 9 AI provider integrations
  └─ ws/       — WebSocket broadcast + per-framework adapters
       ↓
  WebSocket broadcast to all connected clients
       ↓
┌────────┬────────┬────────┬────────┐
│Three.js│A-Frame │Babylon │ R3F    │
│:5173   │:5174   │:5175   │:5176   │
└────────┴────────┴────────┴────────┘
```

**Key insight:** Server maintains a single source of truth. Clients are views of that state, transformed per-framework.

## Testing

Run the comprehensive test suite:

```bash
cd packages/server
pnpm test
```

**30 tests across:**
- `dispatch.test.ts` — Command routing (13 tests)
- `scene.test.ts` — Utility functions (11 tests)
- `integration.test.ts` — Full pipeline (6 tests)

100% TypeScript type safety. Zero type errors.

## Documentation

- [Full Documentation](https://github.com/m-ai-geXR/maigeXR/tree/main/mcp-webgpu)
- [Architecture Deep Dive](https://github.com/m-ai-geXR/maigeXR/blob/main/blog.html)
- [Client API Reference](https://github.com/m-ai-geXR/maigeXR/tree/main/mcp-webgpu/packages)

## Contributing

We welcome contributions! See [CONTRIBUTING.md](https://github.com/m-ai-geXR/maigeXR/blob/main/CONTRIBUTING.md).

- Add framework support (PlayCanvas, Wonderland Engine, etc.)
- Integrate additional AI providers
- Improve tests and documentation
- Share your 3D creations

## License

MIT © Brendon Smith

## Links

- [GitHub Repository](https://github.com/m-ai-geXR/maigeXR)
- [Issues](https://github.com/m-ai-geXR/maigeXR/issues)
- [Discussions](https://github.com/m-ai-geXR/maigeXR/discussions)
- [npm Package](https://www.npmjs.com/package/maige-3d-mcp)

---

**Made with** ❤️ **by the m{ai}geXR community**

*Talk to AI from inside your 3D world.* 🚀✨
