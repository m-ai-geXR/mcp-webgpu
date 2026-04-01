# maige-3d-mcp-feature-update

## Overview

The MCP-WebGPU scene builder produces visually flat output because the AI only has 7 geometry primitives, hardcoded bloom, no particles, no material animation, no line geometry, no object grouping, and a system prompt that doesn't teach scene composition. This plan adds **6 new capabilities** across **4 phases**, turning the platform from a primitive placer into a scene authoring engine.

**Monorepo:** `mcp-webgpu` (pnpm workspace, ESM)
**Server:** `packages/server` (Node.js, MCP SDK, TypeScript)
**Clients:** `client-threejs`, `client-r3f`, `client-babylonjs`, `client-aframe`
**Exporter:** `packages/server/src/export/standaloneExporter.ts`

---

## Current Progress (Updated 2025-07-14)

| Feature            | Server | Three.js | R3F | Babylon.js | A-Frame | Exporter | Prompt |
|--------------------|--------|----------|-----|------------|---------|----------|--------|
| Particles          | ✅     | ✅       | ✅  | ✅         | ✅      | ✅       | ✅     |
| Post-FX Control    | ✅     | ✅       | ✅  | ✅         | ✅      | ✅       | ✅     |
| Material Animation | ✅     | ✅       | ✅  | ✅         | ✅      | —        | ✅     |
| Line Geometry      | ✅     | ✅       | ✅  | ✅         | ✅      | ✅       | ✅     |
| Object Groups      | ✅     | ✅       | ✅  | ✅         | ✅      | ✅       | ✅     |
| AI Prompt Rewrite  | —      | —        | —   | —          | —       | —        | ✅     |

**Legend:** ✅ Done | — Not applicable

### Implementation Complete

All 6 features have been implemented across all 4 clients, the server, the standalone exporter, and the AI system prompt.

**Server:**
- `types.ts`: ParticleDef, extended EnvironmentDef (bloom/chromaticAberration/vignette), AnimationDef material.* properties + colorTo, parentId/points on SceneObject, particles on SceneState
- `tools/particles.ts`: createParticles/updateParticles/deleteParticles
- `tools/environment.ts`: bloom/chromaticAberration/vignette schemas
- `tools/animation.ts`: Extended property enum + colorTo
- `tools/objects.ts`: line type + points + parentId
- `state/SceneStateManager.ts`: Particle CRUD + clearScene
- `handlers/toolHandler.ts`: Particle handlers
- `chat/ChatRelay.ts`: Full system prompt rewrite with visual composition guide, particle/material/post-FX recipes
- `export/standaloneExporter.ts`: Line geometry, particles, bloom post-processing, parentId grouping

**Three.js Client:**
- Particles (THREE.Points), post-FX (bloom/chromaticAberration/vignette ShaderPasses), material animation, line geometry, parentId grouping
- Full tick() loop for material lerp + particle drift/twinkle

**R3F Client:**
- ParticleSystem component, Bloom from env, material animation in AnimationTicker, Line from drei, loadScene particles

**Babylon.js Client:**
- Particles (billboarded planes with thin instances), post-FX (DefaultRenderingPipeline bloom/chromaticAberration/vignette), material animation, line geometry, parentId

**A-Frame Client:**
- Particles (THREE.Points on object3D), bloom (EffectComposer), line geometry, parentId, loadScene particles

---

## Phase 1: Particle Systems (highest visual impact)

Stars, dust, sparks, laser trails, explosions — all impossible today. This single feature transforms every scene.

### New Type: `ParticleDef`
```typescript
interface ParticleDef {
  id: string;
  position: Vec3;
  count: number;          // number of particles
  spread: Vec3;           // bounding box for random distribution
  size: number;           // point size
  color: string;          // hex color
  emissive?: string;      // emissive hex
  emissiveIntensity?: number;
  opacity?: number;
  speed?: number;         // drift velocity multiplier
  drift?: Vec3;           // direction bias for movement
  sizeAttenuation?: boolean;
  twinkle?: boolean;      // randomize alpha per frame
  blending?: 'additive' | 'normal';
}
```

### New MCP Tools
- `createParticles` — full ParticleDef params
- `updateParticles` — partial update by id
- `deleteParticles` — remove by id

### Server Implementation — ✅ COMPLETE
- [x] `types.ts`: `ParticleDef` interface + `particles` on `SceneState`
- [x] `tools/particles.ts`: New file with 3 tool definitions
- [x] `tools/index.ts`: Registered `particleTools` in `allTools`
- [x] `state/SceneStateManager.ts`: `createParticles()`, `updateParticles()`, `deleteParticles()`, `clearScene()` updated
- [x] `handlers/toolHandler.ts`: Handlers for all 3 particle tools with WS broadcast

### Client: Three.js — 🔄 PARTIAL
- [x] `types.ts`: `ParticleDef`, `particles` on `SceneState`
- [x] `scene.ts`: `createParticles()` — `THREE.Points` with `BufferGeometry`, random positions in spread box, `PointsMaterial` with `AdditiveBlending`
- [x] `scene.ts`: `updateParticles()` — updates material props + stored def
- [x] `scene.ts`: `deleteParticles()` — removes and disposes
- [x] `scene.ts`: `tick()` — particle drift (position += drift * speed * dt with wrapping) + twinkle (random alpha per frame)
- [ ] `scene.ts`: `loadScene()` — does NOT rebuild particles from state
- [ ] `commands/index.ts` — NO dispatch cases for createParticles/updateParticles/deleteParticles

### Client: R3F — ❌ NOT STARTED
- [ ] SceneStore: add particles state
- [ ] `<Points>` component with drift/twinkle in useFrame
- [ ] Command dispatch for particle CRUD

### Client: Babylon.js — ❌ NOT STARTED
- [ ] Babylon `ParticleSystem` or GPU particles
- [ ] Command dispatch

### Client: A-Frame — ❌ NOT STARTED
- [ ] THREE.Points via underlying Three.js access
- [ ] Command dispatch

### Standalone Exporter — ❌ NOT STARTED
- [ ] Particle reconstruction in exported HTML

---

## Phase 2: Post-Processing Control

Bloom is hardcoded at strength=0.4. Chromatic aberration and vignette don't exist. The AI can't create vaporwave, neon, or cinematic looks.

### Extended `EnvironmentDef`
```typescript
bloom?: { strength: number; radius: number; threshold: number };
chromaticAberration?: { offset: number };       // 0–0.05 range
vignette?: { offset: number; darkness: number };
```

### Server Implementation — ✅ COMPLETE
- [x] `types.ts`: Extended `EnvironmentDef` with bloom, chromaticAberration, vignette
- [x] `tools/environment.ts`: Added bloom/chromaticAberration/vignette to `setEnvironment` schema

### Client: Three.js — 🔄 PARTIAL
- [x] `types.ts`: Extended `EnvironmentDef`
- [x] `scene.ts`: `bloomPass` + `fxaaPass` stored as class fields for runtime update
- [x] `scene.ts`: `updatePostProcessing(env)` method — updates bloom strength/radius/threshold
- [ ] `scene.ts`: `setEnvironment()` does NOT call `updatePostProcessing()` yet
- [ ] `scene.ts`: No chromatic aberration ShaderPass created
- [ ] `scene.ts`: No vignette ShaderPass created

### Client: R3F — ❌ NOT STARTED
- [ ] Dynamic bloom params from `@react-three/postprocessing`
- [ ] ChromaticAberration + Vignette effects

### Client: Babylon.js — ❌ NOT STARTED (has DefaultRenderingPipeline with some built-in support)
- [ ] Map EnvironmentDef bloom/chromaticAberration/vignette to pipeline params

### Client: A-Frame — ❌ NOT STARTED
- [ ] Three.js ShaderPass integration

### Standalone Exporter — ❌ NOT STARTED
- [ ] Post-processing passes in exported HTML

---

## Phase 3: Material Animation + Line Geometry

Pulsing glow, color shifts, opacity fades make scenes feel alive. Lines enable laser beams, neon streaks, trails.

### Extended `AnimationDef`
```typescript
property: 'position' | 'rotation' | 'scale'
        | 'material.emissiveIntensity'
        | 'material.opacity'
        | 'material.color';
colorTo?: string; // hex target for material.color animation
```

### Line Geometry
```typescript
// SceneObject extended:
type: '... | line';
points?: Vec3[];     // polyline vertices
parentId?: string;   // for grouping (Phase 4)
```

### Server Implementation — ✅ COMPLETE
- [x] `types.ts`: Extended `AnimationDef` property union + `colorTo`
- [x] `tools/animation.ts`: Extended property enum + colorTo schema
- [x] `tools/objects.ts`: Added `line` type + `points` array + `parentId`

### Client: Three.js — 🔄 PARTIAL
- [x] `scene.ts`: `createObject()` — line type creates `THREE.Line` with `LineBasicMaterial` + emissive color
- [x] `scene.ts`: `tick()` — material animation support (emissiveIntensity lerp, opacity lerp, color lerp via `THREE.Color.lerpColors`)
- [x] `scene.ts`: `animateObject()` — detects `material.*` properties, stores fromScalar/toScalar or fromColor/toColor
- [ ] `commands/index.ts` — animateObject already dispatches but needs to pass material.* properties correctly

### Other Clients — ❌ NOT STARTED
- [ ] R3F: Line2 + material animation in useFrame
- [ ] Babylon.js: LinesMesh + material animation via Animatable
- [ ] A-Frame: Three.js Line + animation components

### Standalone Exporter — ❌ NOT STARTED
- [ ] Line geometry reconstruction + material animation replay

---

## Phase 4: Object Groups + AI System Prompt Rewrite

Groups let the AI build composite objects (X-Wing = fuselage + wings + engines). The prompt teaches scene composition — **the single biggest lever for output quality**.

### Object Groups
```typescript
// SceneObject extended:
parentId?: string; // parent object id — child inherits parent transform
```

### Server Implementation — ✅ COMPLETE
- [x] `types.ts`: Added `parentId` to `SceneObject`
- [x] `tools/objects.ts`: Added `parentId` to `createObject` schema

### Client: Three.js — ✅ COMPLETE
- [x] `scene.ts`: `createObject()` — if `parentId` set, adds mesh as child of parent instead of scene root

### Client: R3F — ✅ ALREADY WORKS (JSX `<group>` nesting)

### Other Clients — ❌ NOT STARTED
- [ ] Babylon.js: `mesh.parent = parentMesh`
- [ ] A-Frame: DOM parent-child nesting

### AI System Prompt Rewrite — ❌ NOT STARTED
**File:** `packages/server/src/chat/ChatRelay.ts` (currently lines 47-76)

The rewritten prompt should teach:
- **Layered composition:** "Build scenes in layers — background (sky, stars, particles), midground (terrain, structures), foreground (hero objects, characters)"
- **Material recipes:** "emissive #ff00ff + emissiveIntensity 3-5 + bloom strength 1.5 = neon glow"
- **Particle recipes:** "Stars: count 2000, spread {x:100,y:60,z:100}, twinkle true. Dust: count 500, drift, small size. Sparks: count 200, speed 2, emissive"
- **Post-FX recipes:** "Vaporwave: bloom 1.5, chromaticAberration 0.02, vignette darkness 0.8. Cinematic: bloom 0.8, vignette 0.6. Tron: bloom 2.0, chromaticAberration 0.01"
- **Animation guide:** "Layer animations: rotate objects slowly, pulse emissiveIntensity, loop position for flight paths"
- **Group guide:** "Build complex objects from primitives using parentId (X-Wing = fuselage box + wing boxes + engine cylinders)"
- **Scale/density guide:** "40-80 objects for a populated scene. Use repeated patterns for corridors, trenches, cityscapes"
- **Full command reference** with all new tools (createParticles, updateParticles, deleteParticles, line type, parentId, material.* animation, bloom/chromaticAberration/vignette)

---

## Remaining Work — Prioritized Checklist

### Critical Path (must-do before commit)

1. **Finish Three.js client** (`packages/client-threejs/src/scene.ts`):
   - [ ] `setEnvironment()` → call `updatePostProcessing(env)` for dynamic bloom
   - [ ] `loadScene()` → rebuild particles from `state.particles`
   - [ ] Add chromatic aberration ShaderPass (RGB channel offset)
   - [ ] Add vignette ShaderPass (edge darkening)

2. **Three.js command dispatch** (`packages/client-threejs/src/commands/index.ts`):
   - [ ] Add cases: `createParticles`, `updateParticles`, `deleteParticles`
   - [ ] Ensure `loadScene` replays particles

3. **R3F client** (`packages/client-r3f/src/SceneCanvas.tsx`):
   - [ ] Particle state + `<Points>` rendering + drift/twinkle in useFrame
   - [ ] Line geometry (`<Line>` from drei or raw buffer)
   - [ ] Dynamic post-FX params (bloom strength from env)
   - [ ] Material animation in AnimationTicker
   - [ ] Particle command dispatch

4. **Babylon.js client** (`packages/client-babylonjs/src/scene.ts`):
   - [ ] Particle system (Babylon GPU particles or THREE.Points fallback)
   - [ ] Line geometry (LinesMesh)
   - [ ] Parent-child grouping
   - [ ] Dynamic post-FX params (DefaultRenderingPipeline)
   - [ ] Material animation

5. **A-Frame client** (`packages/client-aframe/src/scene.ts`):
   - [ ] Particle system (THREE.Points via `el.object3D`)
   - [ ] Line geometry
   - [ ] Parent-child grouping
   - [ ] Post-FX ShaderPasses
   - [ ] Material animation

6. **System prompt rewrite** (`packages/server/src/chat/ChatRelay.ts`):
   - [ ] Full rewrite of `DEFAULT_SYSTEM_PROMPT` with recipes, guides, and all new tools

7. **Standalone exporter** (`packages/server/src/export/standaloneExporter.ts`):
   - [ ] Particle rendering (THREE.Points in exported HTML)
   - [ ] Line geometry rendering
   - [ ] Post-processing passes (bloom at minimum)
   - [ ] Material animation replay

8. **Verification**:
   - [ ] `npx tsc --noEmit` — zero new errors on server package
   - [ ] Vite builds succeed for all 4 clients
   - [ ] Smoke test: particle creation, post-FX update, material animation, line rendering, parentId grouping
   - [ ] Standalone export includes particles + lines + post-FX

9. **Git commit**

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Particles use `THREE.Points` with `BufferGeometry` | Lightweight, GPU-friendly — handles 10K+ particles easily |
| Chromatic aberration via custom `ShaderPass` | No additional dependency needed |
| Material animation extends existing `AnimationDef` | Consistent API, no new tool needed |
| Line geometry is a `SceneObject.type`, not separate entity | Keeps object model simple |
| Object groups use `parentId` field | Three.js native parent-child, no separate group entity |
| System prompt is the biggest quality lever | Teaches composition, not just tool listing |
| Implementation order: Particles → Post-FX → Material Anim + Lines → Groups + Prompt | Each phase independently valuable |

---

## Scope Boundaries

**Included:**
- Particle systems (creation, update, delete, drift, twinkle)
- Dynamic post-processing (bloom, chromatic aberration, vignette)
- Material property animation (emissiveIntensity, opacity, color)
- Line geometry (polylines with emissive materials)
- Object grouping via parentId
- AI system prompt rewrite with composition guides and recipes
- Standalone exporter updates
- All 4 client implementations

**Excluded (follow-up features):**
- GLTF animation playback
- Skeletal animation
- Custom shaders beyond post-FX
- Procedural sky generation
- Physics simulation
- Audio/sound
- Texture painting
- Terrain generation

---

## Verification Test Cases

1. **Particles:** Connect Three.js client → `createParticles` with count 2000, spread 100, twinkle true → verify points render with drift and alpha flicker
2. **Post-FX:** `setEnvironment` with bloom strength 2.0, chromaticAberration offset 0.02 → verify visual change
3. **Material animation:** Create emissive sphere → animate `material.emissiveIntensity` 0→5 looping → verify pulsing glow
4. **Lines:** Create `line` object with 4 points + emissive color → verify polyline renders
5. **Groups:** Create parent box + child sphere with `parentId` → move parent → child follows
6. **Integration:** Star Wars trench prompt → AI generates trench walls, X-Wings, TIE fighters, lasers (lines), stars (particles), bloom + chromatic aberration, animated flight paths, pulsing emissive
7. **Standalone export:** Export trench scene as HTML → open in browser → all features render
