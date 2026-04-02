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
`;

const FRAMEWORK_GUIDES: Record<string, string> = {
  threejs: `
## Three.js — The Foundation

**Available geometry**: box, sphere, cylinder, cone, torus, plane, capsule, gltf
**Materials**:
- \`standard\` (PBR - physically based, use for realistic metals/glass)
- \`phong\` (shiny plastic look, great for stylized)
- \`toon\` (cel-shaded, perfect for illustrated/cartoon style)
- \`basic\` (unlit, good for glowing UI elements)

**Creative opportunities:**
- Combine torus + emissive materials for sci-fi portals
- Use capsules for organic shapes (pills, rounded columns)
- Layer transparent planes with different opacities for glass/water
- GLTFs for complex models (furniture, characters, etc.)

**Animations:** Smooth requestAnimationFrame tweening—great for orbital motion and morphing.
  `,
  aframe: `
## A-Frame — VR-Ready Scenes

**Special considerations:**
- Everything auto-converts to A-Frame's entity-component format
- Position/rotation/scale become "x y z" strings automatically
- Great for room-scale VR experiences

**Creative opportunities:**
- Build immersive environments users can walk through
- Create interactive galleries (art on walls, pedestals with sculptures)
- Design spatial UI floating in 3D space
- Leverage A-Frame's VR controller support for interactivity

**Think room-scale:** Objects sized 1-3 units work well for human-scale spaces.
  `,
  babylonjs: `
## Babylon.js — Game Engine Power

**Technical notes:**
- Rotations convert from degrees (server) to radians (client) automatically
- MeshBuilder handles all standard geometry types
- Full physics engine support available

**Creative opportunities:**
- Build game-like environments with physics interactions
- Create architectural visualizations with PBR materials
- Design particle-heavy effects (explosions, magic, weather)
- Leverage Babylon's advanced shadow systems for dramatic lighting

**Great for:** Realistic scenes, simulations, interactive experiences.
  `,
  r3f: `
## React Three Fiber — Reactive 3D

**Architecture:**
- Zustand store manages scene state reactively
- Coordinates sent as objects {x,y,z}, rendered as React Three Fiber tuples
- Component-based approach makes complex scenes maintainable

**Creative opportunities:**
- Build UI-integrated 3D (dashboards with live 3D data viz)
- Create smooth state-driven animations (color themes, mode switches)
- Design parametric art (scenes that respond to external data)
- Leverage React's component model for reusable scene pieces

**Sweet spot:** Data-driven art, interactive installations, generative design.
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

  throw new Error(`Unknown prompt: "${params.name}"`);
}
