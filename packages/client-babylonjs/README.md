# Babylon.js Client for maige-3d-mcp

WebGL-based 3D scene client using Babylon.js engine with VR support.

## Features

- **Babylon.js 7.0** - Full-featured game engine with PBR rendering
- **WebXR VR Support** - Immersive VR experiences with in-world chat
- **Real-time Updates** - WebSocket connection to MCP server for live scene manipulation
- **Advanced Rendering** - Default rendering pipeline with bloom, vignette, and post-processing
- **Animations & Behaviors** - Smooth tweening and continuous frame-tick behaviors (spin, bob, orbit, etc.)
- **Particle Systems** - GPU-accelerated particle effects

## Quick Start

```bash
# Install dependencies
pnpm install

# Run development server (http://localhost:5175)
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Vite Configuration

The project includes optimized Vite configuration to handle Babylon.js's large dependency size and dynamic shader imports:

```typescript
optimizeDeps: {
  include: ['@babylonjs/core', '@babylonjs/loaders'],
  esbuildOptions: { target: 'esnext' }
}
```

### Common Issues

**"Outdated Optimize Dep" error**: If you see 504 errors for shader files like `default.fragment.js`, clear Vite's cache:

```bash
rm -rf node_modules/.vite
pnpm dev
```

This forces Vite to rebuild its dependency cache.

## Testing

The project includes comprehensive test coverage:

- **dispatch.test.ts** - Command routing tests
- **scene.test.ts** - Utility functions and type conversions
- **integration.test.ts** - Full command pipeline tests

Run tests with:
```bash
pnpm test           # Run once
pnpm test:watch     # Watch mode
```

## Architecture

```
src/
├── scene.ts           # Main BabylonSceneManager class
├── commands/          # Command dispatcher
├── overlay/           # DOM chat/debug UI
├── types.ts           # Shared type definitions
└── __tests__/         # Test suite
```

## Scene Manager API

The `BabylonSceneManager` class provides methods for scene manipulation:

```typescript
// Objects
createObject(def: SceneObject): void
updateObject(updates: Partial<SceneObject> & { id: string }): void
deleteObject(id: string): void

// Lights
createLight(def: SceneLight): void
updateLight(updates: Partial<SceneLight> & { id: string }): void
deleteLight(id: string): void

// Camera
setCamera(camera: Partial<SceneCamera>): void
flyToObject(id: string, distance?: number): void

// Environment
setEnvironment(env: EnvironmentDef): void

// Animations
animateObject(id, property, to, duration, easing, loop): void
stopAnimation(id: string): void

// Particles
createParticles(def: ParticleDef): void
updateParticles(updates: Partial<ParticleDef> & { id: string }): void
deleteParticles(id: string): void

// Behaviors (continuous effects)
addBehavior(def: BehaviorDef): void
removeBehavior(id: string): void

// Scene state
loadScene(state: SceneState): void
takeScreenshot(): string
```

## Material Types

- **standard** - PBR (physically-based rendering) for realistic materials
- **phong** - Classic shiny plastic look
- **toon** - Cel-shaded cartoon style
- **basic** - Unlit flat color (good for UI elements)

## Geometry Types

box, sphere, cylinder, cone, torus, plane, capsule, gltf (3D models)

## VR Mode

Press the VR button in the bottom-right corner to enter immersive mode. In VR:
- Chat panel appears as a floating 3D plane
- Press `~` to type messages (same as desktop)
- Exit VR to return to normal mode

## Development

The client connects to the MCP server via WebSocket at `ws://localhost:3030` by default. Make sure the server is running first:

```bash
# Terminal 1: Start MCP server
cd packages/server
pnpm dev

# Terminal 2: Start Babylon client
cd packages/client-babylonjs
pnpm dev
```

## License

Part of the maige-3d-mcp project.
