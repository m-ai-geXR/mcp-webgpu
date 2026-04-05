const prompts = [
  {
    name: '3d-world-assistant',
    description:
      'Transform the AI into a creative 3D scene designer with expertise in lighting, ' +
      'composition, and spatial aesthetics. Teaches thoughtful scene creation, not just ' +
      'technical object placement.',
    arguments: [],
  },
  {
    name: 'framework-guide',
    description:
      'Framework-specific creative guidance and technical tips for Three.js, A-Frame, ' +
      'Babylon.js, or React Three Fiber.',
    arguments: [
      {
        name: 'framework',
        description: 'The framework to get tips for (threejs | aframe | babylonjs | r3f)',
        required: false,
      },
    ],
  },
  {
    name: 'demo-showcase',
    description:
      'Instant access to 10+ stunning pre-built demo templates: galaxy, DNA helix, ' +
      'neon tunnel, crystal cluster, platonic solids, particle effects, and more. ' +
      'Perfect for quick impressive visualizations.',
    arguments: [
      {
        name: 'style',
        description: 'Demo style (galaxy | dna | tunnel | crystals | geometries | wave | spiral | orbit | explosion | all)',
        required: false,
      },
    ],
  },
];

const ASSISTANT_PROMPT = `
You are a creative 3D scene designer and spatial artist managing a live WebGL environment.
Think like a cinematographer, lighting designer, and architect combined.

## Your Creative Philosophy

When users ask for scenes, don't just place objects—**craft experiences**:

**Lighting creates emotion:**
- Warm lights (#ff9966) = cozy, inviting, sunset
- Cool lights (#66ccff) = clinical, futuristic, moonlight
- Colored point lights = drama, neon, cyberpunk
- Low ambient + directional = high contrast, cinematic
- Soft ambient + fog = dreamy, mysterious

**Composition creates interest:**
- Use the rule of thirds—don't center everything
- Create depth with foreground, midground, background layers
- Vary object sizes—large anchors, small details
- Group objects with slight randomness, not perfect grids
- Lead the eye with lighting and object placement

**Color theory matters:**
- Complementary colors create vibrance (blue/orange, purple/yellow)
- Analogous colors feel harmonious (blues and purples, reds and oranges)
- Desaturated + one saturated accent = sophisticated focus
- Emissive materials glow beautifully in dark environments

**Atmosphere is everything:**
- Fog adds depth and mystery (near:5, far:30 for dramatic)
- Dark backgrounds (#0a0a0f) make lights pop
- Emissive materials create mood without lights
- Subtle animations add life (slow rotation, gentle bobbing)

## When requests are vague

"Make something cool" → Suggest 2-3 specific themed options:
- "A neon cyberpunk alley with fog and glowing signs?"
- "A serene Japanese garden with cherry blossoms and lanterns?"
- "An abstract art installation with floating geometric shapes?"

Then build whichever they choose (or surprise them with your favorite).

## Example: Instead of boring...

❌ "I'll create a red cube and blue sphere"
\`\`\`
createObject: box, position {0,0.5,0}, material {color: #ff0000}
createObject: sphere, position {2,0.5,0}, material {color: #0000ff}
\`\`\`

✅ "I'll create a mysterious portal scene with ethereal lighting"
\`\`\`
// Dark atmospheric environment
setEnvironment: background #0a0a1e, fog {color:#6600ff, near:8, far:25}

// Portal frame with glow
createObject: torus, position {0,1.5,0}, scale {2,2,0.3}, rotation {90,0,0},
  material {color:#1a1a1a, emissive:#ff00ff, emissiveIntensity:0.8, metalness:0.9}

// Glowing orbs orbiting portal
createObject: sphere, position {2,1.5,0}, scale {0.3,0.3,0.3},
  material {color:#ffffff, emissive:#00ffff, emissiveIntensity:2}
animateObject: <id>, property:rotation, to:{0,360,0}, duration:4, loop:true

// Dramatic lighting
createLight: point, position {0,1.5,0}, color #ff00ff, intensity:3
createLight: point, position {0,1.5,-5}, color #00ffff, intensity:1.5
createLight: ambient, color #1a1a3e, intensity:0.3
\`\`\`

## Workflow (Technical Requirements)

1. **Check messages first** — call \`getPendingUserMessages\` at the start of EVERY turn
2. **Survey the scene** — call \`getSceneState\` before changes to know existing ids/positions
3. **Build with artistry** — use scene tools creatively (objects, lights, camera, environment, animations)
4. **Narrate briefly** — call \`sendChatMessage\` after changes (1-2 sentences, describe the vibe)
5. **Undo gracefully** — if user says "undo"/"revert", call \`undo\` tool

## Technical Constraints

**Object IDs:** Always use ids from \`createObject\` returns or \`getSceneState\`. Never guess.

**Coordinates:**
- Positions/scale in metres (Y is up)
- Rotation in degrees {x, y, z}
- Camera position: 5-15 units away for objects sized 1-2 units

**Best practices:**
- Prefer targeted updates over full scene rebuilds
- Announce significant changes in-world before executing
- Use animations sparingly—reserve for key moments
- Test lighting: too bright washes out, too dark loses form

Remember: A thoughtfully lit sphere beats a dozen randomly colored boxes.

## ADVANCED DEMO RECIPES

When users ask for impressive demos or "something cool", use these proven templates:

### 1. PARTICLE GALAXY
Dark space + 800-1000 particles (stars) + rotating spiral of colored spheres + bloom
\`\`\`
setEnvironment: background #000005, bloom {strength:0.7, threshold:0.5}
createParticles: stars, count:1000, spread {x:50,y:50,z:50}, size:0.03, twinkle:true
// Create spiral arm with 12 glowing orbs
for i=0 to 11:
  angle = i * 30°
  radius = 3 + (i * 0.3)
  x = cos(angle) * radius
  z = sin(angle) * radius
  createObject: sphere, position {x, 0.5, z}, scale {0.4,0.4,0.4},
    emissive: (cycle colors #ff0080, #00ffff, #00ff88), emissiveIntensity: 2
  addBehavior: orbit, radius, speed:0.5
\`\`\`

### 2. DNA HELIX
Two counter-rotating spirals of spheres connected by rungs
\`\`\`
setEnvironment: background #050510, bloom {strength:0.8, threshold:0.5}
// Create two helixes with 16 nodes each
for i=0 to 15:
  y = i * 0.5 - 4
  angle = i * 45°
  // Helix 1 (cyan)
  createObject: sphere, position {cos(angle)*2, y, sin(angle)*2}, scale {0.3,0.3,0.3},
    emissive:#00ffff, emissiveIntensity:2
  // Helix 2 (magenta) - opposite side
  createObject: sphere, position {-cos(angle)*2, y, -sin(angle)*2}, scale {0.3,0.3,0.3},
    emissive:#ff00ff, emissiveIntensity:2
  // Connecting rung (line between them)
  createObject: line, points [{cos(angle)*2,y,sin(angle)*2}, {-cos(angle)*2,y,-sin(angle)*2}],
    color:#666666
addBehavior: group spin, speedY:0.3
\`\`\`

### 3. MORPHING GEOMETRY SHOWCASE
5 different platonic solids that morph and rotate
\`\`\`
setEnvironment: background #0a0a0f, bloom {strength:0.5, threshold:0.6}
createObject: icosahedron, position {-6,1,0}, scale {1.2,1.2,1.2},
  color:#ff3366, emissive:#ff3366, emissiveIntensity:1.5, metalness:0.8
createObject: dodecahedron, position {-3,1,0}, scale {1.2,1.2,1.2},
  color:#ffaa00, emissive:#ffaa00, emissiveIntensity:1.5, metalness:0.8
createObject: octahedron, position {0,1,0}, scale {1.5,1.5,1.5},
  color:#00ff88, emissive:#00ff88, emissiveIntensity:1.5, metalness:0.8
createObject: tetrahedron, position {3,1,0}, scale {1.5,1.5,1.5},
  color:#00aaff, emissive:#00aaff, emissiveIntensity:1.5, metalness:0.8
createObject: torusKnot, position {6,1,0}, scale {0.8,0.8,0.8},
  color:#aa00ff, emissive:#aa00ff, emissiveIntensity:1.5, metalness:0.8
// Animate each with different rotation + bobbing
for each: addBehavior spin (varied speeds), addBehavior bob (varied amplitudes)
\`\`\`

### 4. NEON TUNNEL
Concentric rings receding into distance with glow + chromatic aberration
\`\`\`
setEnvironment: background #000000, bloom {strength:0.9, threshold:0.4},
  chromaticAberration {offset:0.3}, fog {color:#ff00ff, near:15, far:30}
for i=0 to 20:
  z = -i * 2.5
  scale = 4 - (i * 0.1)
  color = cycle [#ff0080, #00ffff, #00ff00]
  createObject: torus, position {0,0,z}, rotation {0,0,0}, scale {scale,scale,0.2},
    emissive: color, emissiveIntensity: 2.5, metalness:0.9
  createLight: point, position {0,0,z}, color, intensity:2
addBehavior: camera drift forward (simulates moving through tunnel)
\`\`\`

### 5. GOLDEN RATIO SPIRAL
Fibonacci spiral of cubes with increasing size
\`\`\`
setEnvironment: background #1a1520, bloom {strength:0.6, threshold:0.5}
fibonacci = [1,1,2,3,5,8,13,21]
angle = 0
for i=0 to 7:
  radius = fibonacci[i] * 0.5
  size = fibonacci[i] * 0.15
  angle += 137.5° (golden angle)
  x = cos(angle) * radius
  z = sin(angle) * radius
  createObject: box, position {x, size/2, z}, scale {size,size,size},
    color:#ffd700, metalness:0.9, roughness:0.2, emissive:#ffaa00, emissiveIntensity:0.5
  createLight: point, position {x, size+1, z}, color:#ffdd88, intensity:1.5
\`\`\`

### 6. WAVE FIELD
Grid of cylinders that pulse in a wave pattern
\`\`\`
setEnvironment: background #000818, bloom {strength:0.5, threshold:0.6}
for x=-10 to 10 step 2:
  for z=-10 to 10 step 2:
    distance = sqrt(x*x + z*z)
    hue = (distance * 15) % 360
    createObject: cylinder, position {x, 1, z}, scale {0.3, 1, 0.3},
      emissive: hsl(hue, 100%, 50%), emissiveIntensity:1.5
    // Stagger animation based on distance from center
    animateObject: scale.y, from:0.5 to:3, duration:2, delay:distance*0.1, loop:true
\`\`\`

### 7. CRYSTAL CLUSTER
Cluster of random-sized crystals (octahedrons) with varied colors
\`\`\`
setEnvironment: background #0a0515, bloom {strength:0.7, threshold:0.5}
colors = [#ff00ff, #00ffff, #ff0080, #00ff88, #ffaa00]
for i=0 to 20:
  angle = random(0, 360)
  radius = random(2, 5)
  height = random(0.5, 3)
  size = random(0.4, 1.2)
  x = cos(angle) * radius
  z = sin(angle) * radius
  color = random from colors
  createObject: octahedron, position {x,height,z},
    rotation {random(0,360), random(0,360), random(0,360)},
    scale {size,size*1.5,size},
    color, emissive:color, emissiveIntensity:1.8, opacity:0.6, metalness:0.2
  addBehavior: pulse, min:0.8, max:1.2, speed:random(0.5,1.5)
createLight: hemisphere, color:#8800ff, intensity:0.4
createParticles: sparkles, count:150, spread:{x:10,y:5,z:10}, size:0.03,
  emissive:#ffffff, twinkle:true
\`\`\`

### 8. ORBITING SATELLITES
Central sun with multiple planets on different orbital paths
\`\`\`
setEnvironment: background #000008, bloom {strength:0.8, threshold:0.5}
createObject: sphere, id:sun, position {0,1,0}, scale {1.5,1.5,1.5},
  emissive:#ffff00, emissiveIntensity:3, metalness:0.8
createLight: point, position {0,1,0}, color:#ffff88, intensity:5

planets = [{r:3, size:0.3, color:#ff6644, speed:1},
           {r:5, size:0.5, color:#4488ff, speed:0.6},
           {r:7, size:0.4, color:#88ff44, speed:0.4},
           {r:9, size:0.35, color:#ff44ff, speed:0.3}]

for each planet:
  createObject: sphere, position {planet.r, 1, 0}, scale {planet.size...},
    color:planet.color, emissive:planet.color, emissiveIntensity:1, metalness:0.7
  addBehavior: orbit, radius:planet.r, speed:planet.speed, centerY:1
  createParticles: trail, count:30, follow planet path, color:planet.color
\`\`\`

### 9. ABSTRACT RING STACK
Stacked rotating rings at different angles creating complex motion
\`\`\`
setEnvironment: background #0f0520, bloom {strength:0.6, threshold:0.5},
  vignette {darkness:0.5}
colors = [#ff0080, #ff8800, #ffff00, #00ff88, #0088ff, #8800ff]
for i=0 to 5:
  y = i * 0.8
  rotation = {i*30, 0, i*15}
  createObject: ring, position {0,y,0}, rotation, scale {3,3,0.2},
    innerRadius:0.6, color:colors[i], emissive:colors[i],
    emissiveIntensity:2, metalness:0.9, roughness:0.1
  addBehavior: spin, speedX:0.2*i, speedY:0.5, speedZ:0.1*i
  createLight: point, position {0,y,0}, color:colors[i], intensity:1.5
\`\`\`

### 10. PARTICLE EXPLOSION
Expanding sphere of particles from center with trails
\`\`\`
setEnvironment: background #000000, bloom {strength:1.0, threshold:0.4}
createObject: sphere, id:core, position {0,1,0}, scale {0.5,0.5,0.5},
  emissive:#ffffff, emissiveIntensity:5
createLight: point, position {0,1,0}, color:#ffffff, intensity:8
createParticles: explosion, count:500, spread:{x:0.1,y:0.1,z:0.1},
  size:0.06, emissive:#ff6600, emissiveIntensity:2, blending:additive
// Animate particles expanding outward
animateObject: explosion, property:spread,
  to:{x:15,y:15,z:15}, duration:3, easing:easeOut
// Core pulses
addBehavior: core pulse, min:0.3, max:0.8, speed:2
\`\`\`

## COMPOSITION PATTERNS

**Radial/Circular:**
- Place objects in a circle: x = cos(angle) * radius, z = sin(angle) * radius
- Vary radius for spirals: radius = baseRadius + (index * increment)
- Golden angle (137.5°) creates natural-looking spirals

**Grid/Matrix:**
- Nested loops: for x in range, for z in range
- Add variation: height = sin(x) * cos(z) for waves
- Stagger timing: delay = (x + z) * 0.1

**Fibonacci/Golden Ratio:**
- Sizes follow [1,1,2,3,5,8,13...]
- Angles increment by 137.5° (golden angle)
- Creates organic, natural-feeling layouts

**Tunnel/Depth:**
- Objects receding: for i, z = -i * spacing
- Scale decreasing: scale = baseScale - (i * decrement)
- Works great with fog and chromatic aberration

**Random/Organic:**
- Random positions within bounds: random(-5,5)
- Random from list: colors = [a,b,c], pick random
- Add slight variation to grids for natural feel
`;

const FRAMEWORK_GUIDES: Record<string, string> = {
  threejs: `
## Three.js — Advanced Creative Mastery

### Core Geometries & Extended Shapes
**Basic**: box, sphere, cylinder, cone, torus, plane, capsule
**Advanced**: torusKnot, ring, circle, dodecahedron, icosahedron, octahedron, tetrahedron
**Curves**: line (for trails/connections), tube (for organic pipes/paths)
**External**: gltf for complex models

### Material System - Go Beyond Basic
**PBR Materials** (\`standard\`):
- metalness: 0.0-1.0 (0=dielectric, 1=metal)
- roughness: 0.0-1.0 (0=mirror, 1=matte)
- emissive + emissiveIntensity for self-illumination
- opacity + transparent for glass/holograms

**Stylized** (\`phong\`, \`toon\`):
- phong: shiny plastic, great for toys/stylized art
- toon: cel-shaded, perfect for illustrated looks

**Special Effects** (\`basic\`):
- Unlit, perfect for UI elements and pure glow effects
- Set emissive to full brightness for neon signs

### Advanced Creative Techniques

#### 1. Physics-Inspired Motion (No Physics Engine Needed)
**Gravity simulation:**
- Animate position.y with easing:"easeIn" for natural fall
- Combine with rotation for tumbling effect

**Pendulum swing:**
- Rotate parent object, child swings naturally
- Use behaviors:"spin" with sinusoidal speed variation

**Orbital mechanics:**
- Use "orbit" behavior with varied radius + speed
- Faster orbits for inner objects (Kepler's law simulation)

#### 2. Advanced Shader-Like Effects (Via Material Properties)
**Holographic effect:**
- Low opacity (0.3-0.5)
- High metalness (0.8)
- Cyan/magenta emissive colors
- Animate emissiveIntensity for pulsing

**Force field:**
- Semi-transparent sphere
- Emissive color matching scene theme
- Scale animation for "activate" effect
- Combine with particle emitter at surface

**Fresnel glow (fake):**
- Use low opacity + emissive on edges
- Create inner + outer sphere with different opacities
- Animate scale difference for breathing effect

#### 3. Interactive Visual Patterns
**Click to explode:**
- On interaction: scale object to 0.1, create 8-12 small copies
- Animate copies outward in radial pattern
- Add particle burst at center

**Hover glow:**
- Increase emissiveIntensity on proximity
- Scale up slightly (1.0 → 1.1)
- Add rotating ring around object

**Drag and rotate:**
- Update rotation based on mouse delta
- Use behaviors for momentum (continue spinning after release)

#### 4. Sophisticated Animation Techniques
**Staggered reveals:**
- Create objects off-screen or at scale:0
- Animate into place with delays: delay = index * 0.1
- Use easing:"easeOut" for snappy arrival

**Morphing geometry:**
- Animate scale on different axes
- sphere with scale {1,1,1} → {2,0.5,2} becomes disc
- Combine with rotation for spiral effect

**Trail effects:**
- Use "line" geometry with animated points
- Update points array to follow moving object
- Fade old points with decreasing opacity

**Particle choreography:**
- Create multiple particle systems
- Stagger animations for wave-like motion
- Use different colors/sizes for depth

#### 5. Cinematic Camera Techniques
**Dolly shot:**
- Animate camera position along path
- Keep target fixed on subject
- Use easing for smooth acceleration/deceleration

**Reveal shot:**
- Start camera close (position near object)
- Pull back while adjusting target
- Combine with object scale-in animation

**Orbit inspection:**
- Animate camera in circle around target
- Keep target at center
- Vary height for dynamic angle

**Depth of field (fake):**
- Objects at distance: lower opacity, desaturated color
- Foreground objects: full saturation, sharp
- Use fog to enhance depth perception

#### 6. Advanced Lighting Scenarios

**Studio lighting (3-point):**
- Key light: directional, intensity:1.5, from 45° above
- Fill light: ambient, intensity:0.3, soft shadows
- Rim light: point behind, intensity:1.0, highlights edges

**Dramatic single source:**
- One strong directional, intensity:2.0
- Very low ambient (0.1)
- Heavy vignette + shadows

**Neon nightscape:**
- Multiple colored point lights (cyan, magenta, yellow)
- Dark ambient (0.1)
- High bloom + chr

omaticAberration
- Objects with emissive materials as light sources

**Natural daylight:**
- Hemisphere (sky), color:#87CEEB, intensity:0.5
- Directional (sun), color:#FFF5E6, intensity:1.2
- Soft shadows, light fog

#### 7. Procedural Patterns & Arrangements

**Fibonacci spiral:**
  angle = 137.5° (golden angle)
  for i in 0..20:
    radius = sqrt(i) * 0.5
    create object at (cos(angle*i)*radius, 0, sin(angle*i)*radius)

**Wave grid:**
  for x in -5..5, z in -5..5:
    height = sin(x * 0.5) * cos(z * 0.5) * 2
    create cylinder at (x*2, height, z*2)

**Hexagonal grid:**
  for row, col:
    x = col * 1.5
    z = row * sqrt(3) + (col % 2) * sqrt(3)/2
    create object at (x, 0, z)

**Tunnel/vortex:**
  for i in 0..20:
    radius = 4 - i * 0.15
    rotation.z = i * 15
    create ring at (0, 0, -i * 2)

### Pro Tips for Stunning Visuals

**Layered depth:**
1. Background (fog, sky, distant objects)
2. Mid-ground (main scene elements)
3. Foreground (floating particles, UI elements)
4. Post-processing (bloom, vignette)

**Color harmony:**
- Analogous: blues → cyans → teals (peaceful)
- Complementary: orange vs blue (vibrant)
- Triadic: red, yellow, blue (balanced)
- Monochrome + accent: grays + one bright color (sophisticated)

**Motion choreography:**
- Different speeds create visual interest
- Counter-rotation (some clockwise, some counter)
- Phase offsets (similar motions at different starting points)
- Synchronized climax (all motion peaks together)

**Performance optimization:**
- Reuse geometries via cloning
- Group static objects
- Use LOD for distant objects (lower detail)
- Limit particle counts (< 1000 for smooth performance)

### Example: Physics-Inspired Fountain
\`\`\`
// Create fountain base
createObject: cylinder, position:{0,0.5,0}, scale:{1,1,1}, material:{color:#888,metalness:0.8}

// Create 20 "water" particles
for i=0 to 19:
  angle = i * 18  // 360/20
  create sphere at (0, 1, 0), scale:0.2, color:#4DD0E1, opacity:0.7

  // Arc trajectory (parabola)
  targetX = cos(angle) * 2
  targetZ = sin(angle) * 2
  peakY = 3 + random(-0.5, 0.5)

  // Animate up then down (two animations)
  animate position to {targetX, peakY, targetZ}, duration:1, easing:easeOut
  then animate position to {targetX*1.5, 0, targetZ*1.5}, duration:1, easing:easeIn, loop
\`\`\`

### Example: Interactive Hologram
\`\`\`
// Central hologram
createObject: icosahedron, id:holo, position:{0,1.5,0},
  material:{color:#00ffff, metalness:0.9, roughness:0.1, opacity:0.4, emissive:#00ffff, emissiveIntensity:0.8}

// Rotating rings
createObject: ring, id:ring1, position:{0,1.5,0}, scale:{2,2,0.1}, innerRadius:0.8,
  material:{color:#ff00ff, emissive:#ff00ff, emissiveIntensity:1.5, opacity:0.6}

createObject: ring, id:ring2, position:{0,1.5,0}, scale:{1.5,1.5,0.1}, innerRadius:0.8,
  material:{color:#00ff88, emissive:#00ff88, emissiveIntensity:1.5, opacity:0.6}

// Spin behaviors (counter-rotation)
addBehavior: ring1, type:spin, speedY:2
addBehavior: ring2, type:spin, speedY:-3

// Pulse the core
addBehavior: holo, type:pulse, min:0.9, max:1.1, speed:1.5

// Particles
createParticles: holo_dust, count:100, spread:{x:3,y:3,z:3}, size:0.03,
  emissive:#00ffff, emissiveIntensity:2, twinkle:true, blending:additive
\`\`\`

**With these techniques, you can create:**
✨ Physics simulations without a physics engine
🎨 Shader-like effects using materials
🎬 Cinematic camera movements
🌊 Procedural patterns (spirals, waves, grids)
💫 Interactive visual feedback
🎭 Sophisticated lighting scenarios
🔮 Holographic and sci-fi aesthetics
  `,
  aframe: `
## A-Frame — VR-Ready Scenes

**Special considerations:**
- Everything auto-converts to A-Frame's entity-component format
- Position/rotation/scale become "x y z" strings automatically
- Great for room-scale VR experiences

**Room-scale design:**
- User eye height: ~1.6-1.7 units
- Comfortable reach: 0.5-1.5 units
- Viewing distance: 1-3 units optimal

**VR-specific techniques:**
- Spatial audio for immersion
- Gaze-based interactions (hover effects)
- Teleportation for movement (no nausea)
- Fixed reference points (grid floor)

**Creative opportunities:**
- Build immersive environments users can walk through
- Create interactive galleries (art on walls, pedestals with sculptures)
- Design spatial UI floating in 3D space
- Leverage A-Frame's VR controller support for interactivity

**Performance for VR (90fps target):**
- Limit triangles (< 100k total)
- Use low-poly models
- Reduce particle counts (< 500)
- Bake lighting where possible

**Think room-scale:** Objects sized 1-3 units work well for human-scale spaces.
  `,
  babylonjs: `
## Babylon.js — Game Engine Power & Advanced Rendering

Babylon.js is a full-featured game engine with professional-grade physics, materials, and performance optimization. Use it for realistic simulations, game-like experiences, and GPU-accelerated effects.

### Core Geometry & Technical Notes
- Rotations convert from degrees (server) to radians (client) automatically
- MeshBuilder handles all standard geometry types
- Full physics engine support (Havok, Ammo.js, Cannon.js)
- Real-time shadows with cascaded shadow maps
- Post-processing pipeline (DOF, bloom, SSAO, SSR)

### 1. Physics Systems — Real Collision & Dynamics

Babylon.js has built-in physics engines for true collision, gravity, and constraints.

**Havok Physics (Recommended, Fast):**
- createObject with physics: true enables collision
- Supports compound colliders, ragdolls, vehicles
- Mass, friction, restitution (bounciness)

**Common scenarios:**
- Falling blocks: Create box at y=10, physics enabled, falls naturally
- Bouncing spheres: Set restitution=0.9 for high bounce
- Domino chain: Array of thin boxes (0.1 width), tip first one
- Stacking: Boxes with physics, mass affects stability
- Destruction: Explode object into physics-enabled fragments

**Physics parameters to control:**
  mass: 1.0 (default), higher = harder to move
  friction: 0.5 (default), 0 = ice, 1 = sticky
  restitution: 0.2 (default), 0 = no bounce, 1 = perfect bounce

### 2. Advanced Material System — PBR & Node Materials

**PBR Material (Standard):**
- metalness: 0.0-1.0 (0=dielectric like plastic, 1=metal)
- roughness: 0.0-1.0 (0=mirror, 1=matte)
- emissive + emissiveIntensity: Self-illumination
- clearCoat: Add glossy layer on top (car paint)
- sheen: Fabric-like appearance
- subsurface: Skin, wax, marble translucency

**Material recipes:**
- Chrome: metalness=1.0, roughness=0.1, color=#ffffff
- Gold: metalness=1.0, roughness=0.3, color=#ffd700
- Plastic: metalness=0.0, roughness=0.5, any color
- Rubber: metalness=0.0, roughness=0.9, color=#333333
- Wet surface: roughness=0.2, reflectivity boost
- Glowing core: emissive=#ff6600, emissiveIntensity=3.0

**Advanced techniques:**
- **Iridescence**: Color shifts with viewing angle (soap bubbles, oil slicks)
- **Anisotropy**: Brushed metal, hair, fur (directional reflections)
- **Transmission**: Glass, water (light passes through)

### 3. GPU Particle Systems — 100k+ Particles

Babylon.js can handle massive particle counts via GPU compute.

**Standard particles (CPU, up to 10k):**
  createParticles: id, position, count, spread, size, color

**GPU particles (100k+):**
- Use executeScript to create GPUParticleSystem
- Sub-emitters: Firework explodes into smaller fireworks
- Trail mode: Particles leave streaks
- Custom emitters: Sphere, cone, box, mesh surface

**Particle effects:**
- Fireworks: Emit upward, gravity down, short lifetime, trails
- Magic aura: Emit from character, slow drift, twinkle
- Rainfall: Emit from sky plane, velocity down, long lifetime
- Explosion: Radial emit, fast velocity, fade quickly
- Smoke plume: Upward velocity, grow size over time, fade

### 4. Game Features — Animation & Character Systems

**Animation blending:**
- Transition smoothly between walk/run/idle animations
- Blend weight controls mix (e.g., 70% walk + 30% run)

**Morph targets:**
- Facial expressions: Smile, frown, blink
- Deformation: Inflate, twist, bend meshes
- Each target is a vertex position variation

**Skeletal animation:**
- Bones drive mesh deformation
- IK (inverse kinematics) for foot placement, hand reaching
- Ragdoll: Switch from skeletal to physics on death

**State machines:**
- Idle → Walk → Run transitions based on speed
- Attack → Hit reaction → Death based on events

### 5. Advanced Lighting & Shadows

**Cascaded Shadow Maps (CSM):**
- Directional light with multiple shadow cascades
- Near shadows high-res, far shadows low-res
- Eliminates shadow "pixelation" at distance

**Light types & uses:**
- Ambient: Base illumination, no shadows
- Directional: Sunlight, parallel rays, CSM shadows
- Point: Light bulb, sphere attenuation, shadow cube maps
- Spot: Flashlight, cone shape, angle control
- Hemisphere: Sky (top color) + ground (bottom color)

**Dramatic lighting scenarios:**
- **Sunset**: Hemisphere (orange sky #ff6600, purple ground #6600ff) + warm directional
- **Studio**: 3-point (key + fill + rim), high contrast
- **Horror**: Single low point light, heavy shadows, fog
- **Sci-fi**: Multiple colored point lights (cyan, magenta), bloom
- **Volumetric**: God rays through fog (light scattering)

### 6. Post-Processing Pipeline

**Common effects:**
- Bloom: Bright areas glow, strength + threshold
- DOF (Depth of Field): Blur background/foreground, focus distance
- SSAO (Screen-Space Ambient Occlusion): Contact shadows in crevices
- SSR (Screen-Space Reflections): Real-time reflections without mirrors
- Motion blur: Streak from fast movement
- Chromatic aberration: Color fringing at edges
- Grain: Film-like texture
- Vignette: Darken edges

**Pipeline stacking:**
  setEnvironment with multiple effects:
    bloom: {strength: 0.8, threshold: 0.3}
    vignette: {offset: 0.5, darkness: 0.7}
    chromaticAberration: {offset: 0.5}

### 7. Performance Optimization Techniques

**Instancing:**
- Render 10,000 identical meshes in one draw call
- Use for forests, crowds, debris fields

**Level of Detail (LOD):**
- Switch to simpler mesh at distance
- LOD0: Full detail (< 10 units)
- LOD1: Medium (10-50 units)
- LOD2: Low (> 50 units)

**Frustum culling (automatic):**
- Objects outside camera view aren't rendered

**Octree (manual):**
- Spatial partitioning for fast ray casting
- Speeds up collision detection in large scenes

**Texture atlases:**
- Combine multiple textures into one
- Reduces draw calls

**Optimized particles:**
- Use GPU particles for 10k+
- Limit CPU particles to < 1000

### 8. Complete Example — Physics-Driven Marble Run

Goal: Create an interactive marble run with ramps, obstacles, and particle trails.

**Step 1: Environment**
  setEnvironment:
    background: #1a1a2e
    fog: {color: #1a1a2e, near: 20, far: 100}
    bloom: {strength: 0.6, threshold: 0.4}
    shadows: true

**Step 2: Ramp structure (static physics)**
  createObject: id="ramp1", type="box", position={x:0, y:3, z:0},
    scale={x:8, y:0.2, z:2}, rotation={x:0, y:0, z:-15},
    material={color:#4a5568, metalness:0.3, roughness:0.7},
    physics: true, mass: 0  // mass=0 means static (immovable)

  createObject: id="ramp2", type="box", position={x:5, y:1, z:3},
    scale={x:6, y:0.2, z:2}, rotation={x:0, y:45, z:-10},
    material={color:#4a5568, metalness:0.3, roughness:0.7},
    physics: true, mass: 0

**Step 3: Marbles (dynamic physics)**
  for i in 0..5:
    createObject: id="marble" + i, type="sphere", radius:0.3,
      position={x:-3, y:8, z:0 + i*0.5},
      material={color: rainbow[i], metalness:1.0, roughness:0.1, emissive: rainbow[i], emissiveIntensity:0.5},
      physics: true, mass: 1.0, restitution: 0.7  // bouncy!

**Step 4: Particle trails (follow marbles)**
  for i in 0..5:
    createParticles: id="trail" + i,
      position: {x:-3, y:8, z:0 + i*0.5},  // updated each frame by executeScript
      count: 200, size: 0.1, color: rainbow[i],
      emissive: rainbow[i], emissiveIntensity: 2.0,
      blending: "additive", twinkle: true

**Step 5: Lighting**
  createLight: id="sun", lightType="directional",
    position={x:10, y:20, z:5}, intensity:1.2,
    color:#ffffff, castShadow: true

  createLight: id="ambient", lightType="ambient",
    color:#ffffff, intensity:0.4

**Step 6: Obstacles (dynamic physics)**
  createObject: id="spinner", type="cylinder",
    position={x:2, y:1.5, z:2}, scale={x:0.3, y:4, z:0.3},
    rotation={x:0, y:0, z:90},
    material={color:#ff6600, metalness:0.8, roughness:0.3},
    physics: true, mass: 5.0

  addBehavior: objectId="spinner", type="spin",
    params={axis:"z", speed: 2.0}  // rotating obstacle

**Why this works:**
- Physics handles marble motion naturally (gravity, collisions, bounce)
- Particle trails create visual flow
- PBR materials (metallic marbles) look realistic
- Bloom + emissive = glowing effect
- Dynamic obstacle (spinner) adds interaction
- Shadows ground the scene

**Extensions:**
- Add more ramps with loops, jumps
- Attach particles to marbles via executeScript (update particle position each frame)
- Add sound triggers when marbles hit obstacles
- Increase marble count to 50+ for chaos
- Add domino obstacles that fall when hit

### 9. Advanced Techniques Summary

**When to use Babylon.js:**
- Need real physics (collisions, ragdolls, vehicles)
- Game-like interactions (pickups, triggers, state machines)
- Character animation (skeletal, blending, IK)
- Massive particle counts (100k+ GPU particles)
- Advanced materials (PBR, node materials, subsurface)
- Professional rendering (CSM shadows, SSR, volumetrics)
- VR/AR experiences (WebXR optimized)

**Performance tips:**
- Instancing for repeated meshes
- LOD for distant objects
- GPU particles for 10k+
- Texture atlases for many materials
- Octree for large scenes
- Freeze meshes that don't move (optimization flag)

**Creative possibilities:**
- Build game prototypes with physics puzzles
- Create architectural walkthroughs with realistic lighting
- Design particle-heavy magic effects (explosions, spells)
- Simulate natural phenomena (cloth, water, smoke)
- Develop interactive product showcases with animations
  `,
  r3f: `
## React Three Fiber — Reactive 3D with React Patterns

React Three Fiber (R3F) combines Three.js power with React's declarative component model. Use it for data-driven art, interactive installations, and UI-integrated 3D experiences.

### Architecture & State Management

**Zustand store (global state):**
- Scene objects, lights, particles stored in Zustand
- Commands update store, React components react automatically
- Access via useSceneStore() hook

**React state (local state):**
- Component-specific state (hover, selected, local animations)
- Use useState, useReducer for UI interactions

**Refs for Three.js access:**
- useRef() to access underlying Three.js objects
- Bypass React for performance-critical updates
- Example: useFrame((state, delta) => { meshRef.current.rotation.x += delta })

### 1. React Patterns for 3D Scenes

**Component-based design:**
Instead of imperative createObject calls, think declarative JSX:

  function FloatingCrystal({ position, color }) {
    return (
      <mesh position={position}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} />
      </mesh>
    );
  }

  // Then use: <FloatingCrystal position={[0, 2, 0]} color="#ff00ff" />

**Props-driven scenes:**
- Pass data as props: <Galaxy starCount={1000} radius={10} />
- Reusable components: <Particle /> used 1000 times
- Conditional rendering: {showPortal && <Portal />}

**Context API for shared state:**
- Theme context: <ThemeProvider> wraps scene, children access theme
- Sound context: Audio state shared across interactive objects
- Game context: Score, health, inventory shared globally

**Suspense for async loading:**
  <Suspense fallback={<Spinner />}>
    <Model url="/model.gltf" />
  </Suspense>

  // Model loads in background, Spinner shows until ready

**Error boundaries:**
  <ErrorBoundary fallback={<ErrorMessage />}>
    <ComplexScene />
  </ErrorBoundary>

  // Catches rendering errors, shows fallback UI

### 2. Drei Helpers — Essential R3F Ecosystem Tools

Drei is a collection of ready-made R3F components. Use them!

**Camera controls:**
- <OrbitControls />: Mouse drag to orbit, scroll to zoom
- <FlyControls />: WASD + mouse for flight
- <PointerLockControls />: FPS-style mouse look
- <TrackballControls />: Free rotation without constraints

**Environment & lighting:**
- <Environment preset="sunset" />: Instant HDR background + lighting
- <ContactShadows />: Soft circular shadows under objects
- <Sky />: Procedural sky with sun position
- <Stars />: Starfield background

**Staging helpers:**
- <Stage>: Auto-configures lights + shadows for product showcase
- <Center>: Auto-centers object in view
- <Bounds>: Fit camera to object bounds
- <PresentationControls />: Smooth object rotation on mouse move

**3D text & effects:**
- <Text3D font="/font.json">Hello</Text3D>: Extruded 3D text
- <Text>Flat billboard text</Text>: Always faces camera
- <Float>: Gentle floating motion (y-axis bob)
- <MeshDistortMaterial />: Animated vertex distortion
- <MeshWobbleMaterial />: Wobble/jiggle effect

**Particles & effects:**
- <Sparkles count={100} />: Twinkling particle sparkles
- <Stars radius={100} />: Background starfield
- <Cloud />: Volumetric cloud shapes
- <Trail />: Motion trail behind object

**Performance:**
- <Instances count={1000}>: Instanced rendering for identical objects
- <DetailedMesh distances={[0, 10, 50]}>: LOD switching
- <Merged>: Merge geometries into single draw call

**Post-processing (with @react-three/postprocessing):**
- <Bloom />: Bright areas glow
- <DepthOfField />: Blur background/foreground
- <ChromaticAberration />: Color fringing
- <Vignette />: Darken edges
- <Noise />: Film grain

### 3. Performance Optimization Patterns

**useFrame selective updates:**
  // BAD: Updates every frame even if not needed
  useFrame(() => {
    meshRef.current.rotation.x += 0.01;
  });

  // GOOD: Only update if active
  useFrame(() => {
    if (!isPaused) meshRef.current.rotation.x += 0.01;
  });

**Memoization:**
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ff0000' }), []);

  // Geometry/material created once, not every render

**React.memo for components:**
  const Particle = React.memo(({ position, color }) => (
    <mesh position={position}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  ));

  // Only re-renders if position or color changes

**Instancing for repeated objects:**
  <Instances limit={1000}>
    <sphereGeometry args={[0.1, 8, 8]} />
    <meshStandardMaterial />
    {particles.map((p, i) => (
      <Instance key={i} position={p.position} color={p.color} />
    ))}
  </Instances>

  // 1000 spheres in single draw call

**Web Workers for heavy computation:**
  // Generate complex geometry in worker
  const worker = new Worker('/geometryWorker.js');
  worker.postMessage({ type: 'generateMesh', params: {...} });
  worker.onmessage = (e) => setGeometry(e.data.geometry);

**Dispose of unused resources:**
  useEffect(() => {
    const texture = new THREE.TextureLoader().load('/image.png');
    return () => texture.dispose();  // Cleanup on unmount
  }, []);

### 4. State-Driven Animation Patterns

**Zustand for scene-wide state:**
  const useStore = create((set) => ({
    theme: 'dark',
    setTheme: (theme) => set({ theme }),
    objects: [],
    addObject: (obj) => set((state) => ({ objects: [...state.objects, obj] })),
  }));

  // Components react to state changes:
  const { theme } = useStore();
  <meshStandardMaterial color={theme === 'dark' ? '#333' : '#fff'} />

**React Spring for smooth transitions:**
  import { useSpring, animated } from '@react-spring/three';

  const { scale } = useSpring({
    scale: isHovered ? 1.2 : 1.0,
    config: { tension: 300, friction: 10 }
  });

  <animated.mesh scale={scale}>...</animated.mesh>

**Framer Motion for complex animations:**
  import { motion } from 'framer-motion-3d';

  <motion.mesh
    initial={{ y: 10 }}
    animate={{ y: 0 }}
    transition={{ duration: 1, ease: 'easeOut' }}
  >...</motion.mesh>

**useFrame for continuous animation:**
  useFrame((state, delta) => {
    meshRef.current.rotation.y += delta * 0.5;  // Rotate smoothly
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 2;  // Bob up/down
  });

### 5. Interactive Patterns

**Click handlers:**
  <mesh onClick={(e) => {
    e.stopPropagation();  // Prevent clicks from passing through
    setSelected(e.object.uuid);
  }}>...</mesh>

**Hover effects:**
  const [hovered, setHovered] = useState(false);

  <mesh
    onPointerOver={() => setHovered(true)}
    onPointerOut={() => setHovered(false)}
  >
    <meshStandardMaterial color={hovered ? '#ff6600' : '#ffffff'} />
  </mesh>

**Drag interactions (with @react-three/drei):**
  import { useDrag } from '@react-three/drei';

  const bind = useDrag(({ offset: [x, y] }) => {
    meshRef.current.position.set(x, y, 0);
  });

  <mesh {...bind()}>...</mesh>

**Raycasting (automatic in R3F):**
  // Clicks and hovers use raycasting automatically
  // Access raycaster in useFrame:
  useFrame(({ raycaster, mouse, camera }) => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    // Custom raycast logic
  });

### 6. Data Visualization Patterns

**Mapping data to 3D:**
  const data = [10, 25, 15, 30, 20];

  data.map((value, i) => (
    <mesh key={i} position={[i * 2, value / 2, 0]}>
      <boxGeometry args={[1, value, 1]} />
      <meshStandardMaterial color={getColorForValue(value)} />
    </mesh>
  ));

  // Creates bar chart in 3D

**Live data updates:**
  const [liveData, setLiveData] = useState([]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    ws.onmessage = (msg) => setLiveData(JSON.parse(msg.data));
    return () => ws.close();
  }, []);

  // Scene updates reactively as data arrives

**Parametric surfaces:**
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 100; i++) {
      for (let j = 0; j < 100; j++) {
        const x = (i - 50) / 10;
        const z = (j - 50) / 10;
        const y = Math.sin(x) * Math.cos(z) * 2;  // Wave equation
        pts.push(new THREE.Vector3(x, y, z));
      }
    }
    return pts;
  }, []);

  <points>
    <bufferGeometry attach="geometry">
      <bufferAttribute
        attach="attributes-position"
        count={points.length}
        array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
        itemSize={3}
      />
    </bufferGeometry>
    <pointsMaterial size={0.05} color="#00ffff" />
  </points>

### 7. Complete Example — Interactive Data Dashboard

Goal: 3D bar chart that updates with live data, responds to mouse, integrates with UI.

**Step 1: Zustand store**
  const useDataStore = create((set) => ({
    values: [10, 25, 15, 30, 20, 12, 28],
    selected: null,
    setSelected: (index) => set({ selected: index }),
    updateValue: (index, value) => set((state) => {
      const newValues = [...state.values];
      newValues[index] = value;
      return { values: newValues };
    }),
  }));

**Step 2: Bar component**
  function DataBar({ value, index, position }) {
    const { selected, setSelected } = useDataStore();
    const [hovered, setHovered] = useState(false);
    const isSelected = selected === index;

    const { scale, color } = useSpring({
      scale: hovered || isSelected ? 1.1 : 1.0,
      color: isSelected ? '#ff6600' : hovered ? '#00ffff' : '#4a5568',
    });

    return (
      <animated.mesh
        position={position}
        scale-x={scale}
        scale-z={scale}
        onClick={() => setSelected(index)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[1, value, 1]} />
        <animated.meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </animated.mesh>
    );
  }

**Step 3: Scene composition**
  function Scene() {
    const { values } = useDataStore();

    return (
      <>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1.0} castShadow />
        <OrbitControls />
        <Environment preset="city" />

        {values.map((value, i) => (
          <DataBar
            key={i}
            value={value}
            index={i}
            position={[(i - values.length / 2) * 2, value / 2, 0]}
          />
        ))}

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
      </>
    );
  }

**Step 4: UI overlay (outside canvas)**
  function UI() {
    const { values, selected, updateValue } = useDataStore();

    return (
      <div style={{ position: 'absolute', top: 20, left: 20, color: '#fff' }}>
        <h2>Data Dashboard</h2>
        {selected !== null && (
          <div>
            <p>Selected: Bar {selected}</p>
            <p>Value: {values[selected]}</p>
            <input
              type="range"
              min="5"
              max="50"
              value={values[selected]}
              onChange={(e) => updateValue(selected, parseInt(e.target.value))}
            />
          </div>
        )}
      </div>
    );
  }

**Step 5: App integration**
  function App() {
    return (
      <>
        <Canvas shadows camera={{ position: [0, 10, 20], fov: 50 }}>
          <Scene />
        </Canvas>
        <UI />
      </>
    );
  }

**Why this works:**
- Zustand manages shared state (values, selected)
- React Spring animates scale/color smoothly
- Click/hover handlers update state
- UI updates reactively when bar selected
- Drei helpers (OrbitControls, Environment) simplify setup
- Component-based design makes it maintainable

**Extensions:**
- Add <Sparkles /> above selected bar
- Animate bars growing from 0 on mount
- Add <Text3D> labels for each bar
- Connect to WebSocket for live data
- Add filter/sort UI controls
- Multiple chart types (line, scatter, surface)

### 8. Advanced Patterns Summary

**When to use R3F:**
- Need React ecosystem (hooks, context, components)
- Data-driven scenes (charts, dashboards, live updates)
- UI-integrated 3D (buttons, controls, overlays)
- Rapid prototyping with Drei helpers
- State-driven animations (theme changes, mode switches)
- Generative art (parametric, algorithmic, procedural)

**Performance tips:**
- useMemo for expensive computations
- React.memo for pure components
- <Instances> for repeated objects
- useFrame selectively (check conditions)
- Web Workers for heavy calculations
- Dispose resources on unmount

**Creative possibilities:**
- Build interactive data visualizations
- Create generative art installations
- Design parametric product configurators
- Develop educational simulations with UI controls
- Prototype game ideas with rapid iteration
- Combine 2D UI with 3D scenes seamlessly
  `,
};

const DEMO_SHOWCASE: Record<string, string> = {
  galaxy: `
## Particle Galaxy Demo

Create a stunning space scene with orbiting glowing spheres and star particles.

**Commands to use:**
- \`setEnvironment\`: Dark space background (#000005), bloom effect
- \`createParticles\`: 1000 star particles with twinkle
- \`createObject\`: 8-12 glowing spheres in spiral pattern
- \`addBehavior\`: Orbit behaviors for rotation
- \`createLight\`: Ambient space lighting

**Key techniques:**
- Circular arrangement: x = cos(angle) * radius, z = sin(angle) * radius
- Varied colors cycling through spectrum
- High emissiveIntensity (2.0-2.5) for glow
- Bloom strength 0.7-0.8 for dramatic effect
  `,
  dna: `
## DNA Double Helix Demo

Counter-rotating double helix with connecting rungs.

**Commands to use:**
- \`createObject\`: Spheres for helix nodes
- \`createObject\`: Lines for connecting rungs
- \`addBehavior\`: Spin behavior for rotation
- \`createLight\`: Cyan and magenta point lights

**Key techniques:**
- Helix math: x = cos(angle) * radius, y = index * vertical_spacing, z = sin(angle) * radius
- Two helixes offset by 180° (opposite sides)
- Increment angle by 45° per node for smooth helix
- Counter colors: cyan (#00ffff) vs magenta (#ff00ff)
  `,
  tunnel: `
## Neon Tunnel Demo

Receding rings with intense bloom and chromatic aberration.

**Commands to use:**
- \`setEnvironment\`: Black background, bloom (0.9), chromaticAberration, fog, vignette
- \`createObject\`: Ring geometry in series
- \`addBehavior\`: Counter-rotating spin behaviors

**Key techniques:**
- Rings recede: z = -index * 2.5
- Scale decreases: scale = 4 - (index * 0.1)
- Cycle colors: [#ff0080, #00ffff, #00ff00]
- Counter-rotation: alternate between positive/negative spin speeds
- Heavy post-processing for drama
  `,
  crystals: `
## Crystal Cluster Demo

Organic cluster of glowing octahedron crystals with particles.

**Commands to use:**
- \`createObject\`: Octahedrons with random positions, rotations, scales
- \`addBehavior\`: Pulse behaviors (min:0.85, max:1.15)
- \`createParticles\`: Sparkle particles with twinkle
- \`createLight\`: Hemisphere and ambient for atmosphere

**Key techniques:**
- Random placement within bounds (e.g., x: random(-3, 3))
- Random rotations for organic feel
- Varied sizes (scale 0.4-1.2)
- Semi-transparent materials (opacity: 0.6)
- Pulsing animations at different speeds
  `,
  geometries: `
## Platonic Solids Showcase

Five sacred geometries rotating with different speeds.

**Commands to use:**
- \`createObject\`: icosahedron, dodecahedron, octahedron, tetrahedron, torusKnot
- \`addBehavior\`: Spin (multi-axis) and bob behaviors
- \`createLight\`: Point light per geometry

**Key techniques:**
- Space objects evenly (e.g., x: -6, -3, 0, 3, 6)
- Unique color per geometry
- Multi-axis rotation (speedX, speedY, speedZ all different)
- Layered behaviors (spin + bob simultaneously)
- Matching colored lights enhance glow
  `,
  wave: `
## Wave Field Demo

Grid of cylinders pulsing in wave pattern.

**Commands to use:**
- \`createObject\`: Cylinder grid (nested loops)
- \`animateObject\`: Scale animation with staggered delays

**Key techniques:**
- Grid: for x in -10 to 10 step 2, for z in -10 to 10 step 2
- Wave delay: distance = sqrt(x*x + z*z), delay = distance * 0.1
- Color by distance: hue = (distance * 15) % 360
- Animate scale.y from 0.5 to 3.0
- Creates expanding wave from center
  `,
  spiral: `
## Golden Ratio Spiral

Fibonacci spiral of cubes with increasing size.

**Commands to use:**
- \`createObject\`: Boxes following Fibonacci sequence
- \`createLight\`: Point lights at each cube

**Key techniques:**
- Fibonacci sequence: [1,1,2,3,5,8,13,21]
- Golden angle: 137.5° between each element
- Size proportional to Fibonacci number
- Radius increases with Fibonacci number
- Creates natural-looking spiral
  `,
  orbit: `
## Orbiting Satellites Demo

Central sun with planets on different orbital paths.

**Commands to use:**
- \`createObject\`: Central sun (large emissive sphere)
- \`createObject\`: Planet spheres at different radii
- \`addBehavior\`: Orbit behaviors with varied speeds
- \`createLight\`: Central point light (sun)
- \`createParticles\`: Optional orbital trails

**Key techniques:**
- Inner orbits faster (speed inversely proportional to radius)
- Size variety (0.3-0.5 scale)
- Each planet unique color
- Emissive materials for all objects
- Optional particle trails following orbit paths
  `,
  explosion: `
## Particle Explosion Demo

Expanding sphere of particles from center with trails.

**Commands to use:**
- \`createObject\`: Central core (small bright sphere)
- \`createLight\`: Intense point light (intensity: 8)
- \`createParticles\`: Dense particle cluster
- \`animateObject\`: Expand particle spread over time
- \`addBehavior\`: Pulse behavior for core

**Key techniques:**
- Start particles tightly clustered (spread: {x:0.1, y:0.1, z:0.1})
- Animate spread to large values ({x:15, y:15, z:15})
- Duration 3 seconds, easeOut easing
- Additive blending for brightness
- Core pulsing rapidly (speed: 2)
  `,
  fountain: `
## Particle Fountain Demo

Physics-inspired arcing water fountain with particle trails.

**Commands to use:**
- \`createObject\`: Fountain base (cylinder)
- \`createParticles\`: Water particles with upward velocity
- \`animateObject\`: Particles with gravity-like easeIn falling
- \`createLight\`: Blue point light at base

**Key techniques:**
- Create particles at fountain top (y: 2)
- Animate particles upward then fall: y from 2 to 8 to 0 (keyframe animation)
- Use easeOut for rise, easeIn for fall (gravity simulation)
- Spread increases as particles rise (x/z spread from 0.2 to 1.5)
- Semi-transparent blue particles (opacity: 0.7, color: #00aaff)
- Loop animation infinitely
- Additive blending for water effect
  `,
  hologram: `
## Holographic Portal Demo

Interactive hologram with counter-rotating rings and pulsing core.

**Commands to use:**
- \`createObject\`: 3 concentric rings (torusKnot type)
- \`createObject\`: Central sphere core
- \`addBehavior\`: Counter-rotating spins on each ring
- \`addBehavior\`: Pulse on core (min:0.8, max:1.2, speed:1.5)
- \`createParticles\`: Sparkles around portal
- \`setEnvironment\`: Bloom (0.8), dark background

**Key techniques:**
- Rings at same position but different scales (1.5, 2.0, 2.5)
- Semi-transparent materials (opacity: 0.3-0.5)
- High metalness (0.9) + emissive (cyan #00ffff, magenta #ff00ff)
- Counter-rotation: ring1 spin +1, ring2 spin -1.2, ring3 spin +0.8
- EmissiveIntensity: 2.0 for glow
- Additive particle blending with twinkle
- Creates cyberpunk/sci-fi portal effect
  `,
  energyshield: `
## Energy Shield Demo

Pulsing semi-transparent protective dome with particle shimmer.

**Commands to use:**
- \`createObject\`: Large sphere (radius: 3, type: "sphere")
- \`createParticles\`: Surface sparkles
- \`addBehavior\`: Pulse behavior (min:0.95, max:1.05, speed:0.8)
- \`createLight\`: Interior point light

**Key techniques:**
- Semi-transparent material (opacity: 0.25)
- High metalness (0.7) for reflective quality
- Cyan emissive (#00ffff, intensity: 1.5)
- Slow gentle pulse for "energy field" feel
- Particles positioned on sphere surface (radius: 3)
- Particle twinkle for shimmer effect
- Interior light makes shield glow from within
- Force field aesthetic
  `,
  clickexplode: `
## Click-to-Explode Interactive Demo

Cubes that explode into fragments when clicked.

**Commands to use:**
- \`createObject\`: 5-8 cubes in a row
- On click event: Delete clicked cube, create 8-12 smaller cubes radiating outward
- \`animateObject\`: Fragment cubes fly outward then fade (opacity 1 to 0)
- \`createParticles\`: Explosion particles at impact point

**Key techniques:**
- Main cubes: scale 1.0, varied colors
- On click: Remove clicked cube immediately
- Create fragments: scale 0.3, same color as parent
- Fragment positions: Radial pattern (8 directions: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°)
- Animate fragments outward (distance: 3-5 units)
- Fade fragments (opacity 1 to 0 over 1 second)
- Particle burst at explosion center (count: 200, additive blending)
- Interactive pattern: Click triggers visual feedback
  `,
  hoverglow: `
## Hover-Glow Interactive Demo

Spheres that glow when mouse hovers over them.

**Commands to use:**
- \`createObject\`: 10-15 spheres in grid pattern
- On hover: Increase emissiveIntensity from 0.5 to 3.0
- On hover exit: Decrease emissiveIntensity back to 0.5
- \`animateObject\`: Smooth transitions

**Key techniques:**
- Grid layout: 5 columns x 3 rows, spacing 2 units
- Base emissive color varies per sphere (rainbow gradient)
- Base emissiveIntensity: 0.5 (subtle glow)
- Hover emissiveIntensity: 3.0 (bright glow)
- Smooth animation (duration: 0.3s, easeOut)
- Proximity-based interaction feel
- Visual feedback for interactivity
  `,
  cameradolly: `
## Camera Dolly Shot Demo

Smooth forward camera movement revealing scene.

**Commands to use:**
- \`createObject\`: Scene elements (tunnel of rings or path of objects)
- \`setCamera\`: Animate camera position forward
- \`setEnvironment\`: Fog for depth perception

**Key techniques:**
- Place objects receding into distance (z: 0, -5, -10, -15, -20, etc.)
- Camera starts far back (z: 15, y: 2)
- Animate camera forward (z: -20 over 8 seconds, easing: easeInOut)
- Keep camera target fixed ahead (target: {x:0, y:2, z:-20})
- Fog enhances depth (near: 10, far: 30)
- Objects "revealed" as camera passes
- Cinematic forward motion
  `,
  revealanimation: `
## Reveal Animation Demo

Objects fade and scale into view with staggered timing.

**Commands to use:**
- \`createObject\`: 8-12 objects off-screen or scale 0
- \`animateObject\`: Scale from 0 to 1.0, staggered delays
- \`animateObject\`: Opacity from 0 to 1 simultaneously

**Key techniques:**
- Initial state: All objects scale: 0, opacity: 0 (invisible)
- Stagger delay: Object i has delay of i * 0.15 seconds
- Animate scale: 0 to 1.0 (duration: 0.8s, easing: easeOut with slight overshoot)
- Animate opacity: 0 to 1 (duration: 0.5s, easing: linear)
- Creates sequential reveal effect
- Great for intro sequences
- Overshoot easing adds impact (scale briefly to 1.1 then settle to 1.0)
  `,
  dof: `
## Depth-of-Field Demo

Blurred background with sharp foreground subject.

**Commands to use:**
- \`createObject\`: Hero object in foreground (z: 0)
- \`createObject\`: Background elements (z: -10 to -20)
- \`setEnvironment\`: Depth of field effect (focus distance, aperture)
- \`setCamera\`: Position for composition

**Key techniques:**
- Hero object at z: 0 (sharp focus point)
- Background objects spread from z: -10 to -20
- Camera position: {x: 3, y: 2, z: 8}, looking at hero
- DOF focus distance: 8 units (distance to hero)
- DOF aperture: 0.02 (low value = more blur)
- Creates photography-like effect
- Draws attention to hero subject
- Background provides context but doesn't distract
  `,
  all: `
## Demo Showcase - All Templates

You have access to 19 stunning pre-built demo templates across multiple categories. When a user asks for a demo, suggest one of these:

### Space & Cosmic
1. **galaxy** - Orbiting glowing spheres with 1000 star particles
2. **orbit** - Solar system with planets orbiting a central sun
3. **explosion** - Expanding particle sphere with intense core

### Abstract & Geometric
4. **geometries** - Five platonic solids (icosahedron, dodecahedron, octahedron, tetrahedron, torusKnot)
5. **spiral** - Fibonacci golden ratio spiral with increasing cube sizes
6. **wave** - Grid of cylinders pulsing in expanding wave pattern

### Sci-Fi & Neon
7. **tunnel** - Receding neon rings with chromatic aberration
8. **crystals** - Organic cluster of glowing octahedron crystals
9. **dna** - Double helix with counter-rotating spirals
10. **hologram** - Interactive holographic portal with counter-rotating rings
11. **energyshield** - Pulsing protective dome with particle shimmer

### Physics-Inspired
12. **fountain** - Arcing water fountain with gravity-like particle motion

### Interactive
13. **clickexplode** - Cubes that explode into fragments when clicked
14. **hoverglow** - Spheres that glow intensely when mouse hovers over them

### Cinematic
15. **cameradolly** - Smooth forward camera movement through scene
16. **revealanimation** - Objects fade and scale in with staggered timing
17. **dof** - Depth-of-field with blurred background, sharp foreground

### Quick Start Examples

**For "something cool":**
Suggest: "Would you like a **particle galaxy**, **hologram**, or **crystal cluster**?"

**For "impressive/stunning":**
Use: **geometries** (shows all geometry types), **galaxy** (classic), or **tunnel** (intense neon)

**For "sci-fi/futuristic":**
Use: **hologram** (cyberpunk portal), **tunnel** (neon aesthetic), or **energyshield** (force field)

**For "natural/organic":**
Use: **spiral** (Fibonacci), **crystals** (natural cluster), or **fountain** (water physics)

**For "interactive":**
Use: **clickexplode** (click to trigger), **hoverglow** (hover effects), or **hologram** (reactive portal)

**For "cinematic/dramatic":**
Use: **cameradolly** (smooth camera motion), **revealanimation** (sequential unveiling), or **dof** (photography-like focus)

**For "physics/realistic":**
Use: **fountain** (gravity arcs), **explosion** (radial burst), or **energyshield** (pulsing field)

### Demo Categories Summary

**Classic/Proven** (Guaranteed wow): galaxy, tunnel, geometries, crystals
**Advanced** (Cutting-edge): hologram, energyshield, fountain, dof
**Interactive** (User engagement): clickexplode, hoverglow
**Cinematic** (Storytelling): cameradolly, revealanimation, dof

Each demo uses:
- Dark backgrounds for contrast
- Bloom post-processing (0.6-0.9 strength)
- Emissive materials (1.5-2.5 intensity)
- Behaviors for continuous motion
- Thoughtful color palettes
- Optimized performance

All demos are optimized for:
✓ Visual impact (immediate "wow" factor)
✓ Performance (60fps on modern hardware)
✓ Cross-framework compatibility (Three.js, A-Frame, Babylon.js, R3F)
✓ VR readiness (work great in WebXR mode)
✓ Easy customization (colors, scales, speeds)

Ask users which style appeals to them, then build the corresponding demo using the specific template above.
  `,
};

export function handlePrompt(
  action: 'list' | 'get',
  params: { name?: string; arguments?: Record<string, string> } | null,
) {
  if (action === 'list') {
    return { prompts };
  }

  if (!params?.name) throw new Error('Prompt name required');

  if (params.name === '3d-world-assistant') {
    return {
      description: prompts[0].description,
      messages: [
        {
          role: 'assistant' as const,
          content: { type: 'text' as const, text: ASSISTANT_PROMPT.trim() },
        },
      ],
    };
  }

  if (params.name === 'framework-guide') {
    const fw = params.arguments?.['framework'] ?? 'threejs';
    const guide = FRAMEWORK_GUIDES[fw] ?? FRAMEWORK_GUIDES.threejs;
    return {
      description: prompts[1].description,
      messages: [
        {
          role: 'assistant' as const,
          content: { type: 'text' as const, text: guide.trim() },
        },
      ],
    };
  }

  if (params.name === 'demo-showcase') {
    const style = params.arguments?.['style'] ?? 'all';
    const demoGuide = DEMO_SHOWCASE[style] ?? DEMO_SHOWCASE.all;
    return {
      description: prompts[2].description,
      messages: [
        {
          role: 'assistant' as const,
          content: { type: 'text' as const, text: demoGuide.trim() },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: "${params.name}"`);
}
