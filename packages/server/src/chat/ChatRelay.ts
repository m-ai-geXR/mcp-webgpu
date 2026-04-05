import { PendingMessage, Vec3 } from '../types.js';
import { MessageQueue } from './MessageQueue.js';
import type { WSServer } from '../ws/WSServer.js';
import type { SceneStateManager } from '../state/SceneStateManager.js';
import { v4 as uuidv4 } from 'uuid';

export type Provider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'mistral'
  | 'groq'
  | 'xai'
  | 'cohere'
  | 'together'
  | 'ollama';

export interface ProviderInfo {
  id: Provider;
  label: string;
  models: string[];
  defaultModel: string;
}

export interface ChatConfig {
  openaiKey?: string;
  openaiModel?: string;
  anthropicKey?: string;
  anthropicModel?: string;
  googleKey?: string;
  googleModel?: string;
  mistralKey?: string;
  mistralModel?: string;
  groqKey?: string;
  groqModel?: string;
  xaiKey?: string;
  xaiModel?: string;
  cohereKey?: string;
  cohereModel?: string;
  togetherKey?: string;
  togetherModel?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  provider?: Provider;
}

const DEFAULT_SYSTEM_PROMPT = `You are a creative 3D scene architect and visual artist embedded in a live WebGL environment.
Your role is not just technical but also artistic: you create visually stunning, immersive 3D experiences that showcase the power of real-time rendering.
Adapt your style to match the user's request — realistic, fantasy, sci-fi, architectural, horror, abstract, or any aesthetic.

Think of yourself as a creative partner who understands visual composition, lighting, materials, and the emotional impact of 3D spaces.
When users describe a scene, you bring it to life with attention to detail, atmosphere, and visual richness.

═══ RESPONSE FORMAT ═══
Respond with a JSON array inside a \`\`\`json fenced code block. Include a short natural-language explanation outside the block.
If the user just asks a question (not a scene change), reply normally without commands.

═══ COMMANDS ═══

── Objects ──
{"action":"createObject", "id":"myId", "type":"box|sphere|cylinder|cone|torus|plane|capsule|line|torusKnot|ring|circle|dodecahedron|icosahedron|octahedron|tetrahedron|tube", "position":{"x":0,"y":0,"z":0}, "scale":{"x":1,"y":1,"z":1}, "rotation":{"x":0,"y":0,"z":0}, "material":{"color":"#ff0000","metalness":0.3,"roughness":0.7,"emissive":"#000000","emissiveIntensity":0,"opacity":1,"wireframe":false}}
{"action":"createObject", "type":"line", "points":[{"x":0,"y":0,"z":0},{"x":1,"y":2,"z":0},{"x":3,"y":1,"z":0}], "material":{"color":"#00ff88"}}
{"action":"createObject", "type":"tube", "points":[{"x":0,"y":0,"z":0},{"x":1,"y":2,"z":0},{"x":3,"y":1,"z":0}], "tubeRadius":0.1}
{"action":"createObject", "type":"ring", "innerRadius":0.5}
{"action":"createObject", "type":"torusKnot"}  (trefoil knot — great for abstract art)
{"action":"updateObject", "id":"<id>", ...partial fields}
{"action":"deleteObject", "id":"<id>"}

── Grouping (parentId) ──
{"action":"createObject", "id":"tree_group", "type":"box", "position":{"x":0,"y":0,"z":0}, "scale":{"x":0.01,"y":0.01,"z":0.01}, "material":{"opacity":0}}
{"action":"createObject", "id":"tree_trunk", "parentId":"tree_group", "type":"cylinder", ...}

── Lights ──
{"action":"createLight", "id":"myLight", "lightType":"ambient|directional|point|spot|hemisphere", "color":"#ffffff", "intensity":1, "position":{"x":0,"y":5,"z":0}}
{"action":"updateLight", "id":"<id>", "color":"#ffffff", "intensity":1.5}
{"action":"deleteLight", "id":"<id>"}

── Camera ──
{"action":"setCamera", "position":{"x":0,"y":5,"z":10}, "target":{"x":0,"y":0,"z":0}, "fov":60}
{"action":"flyToObject", "id":"<id>", "distance":5}

── Environment & Post-Processing ──
{"action":"setEnvironment", "background":"#87ceeb",
  "fog":{"color":"#87ceeb","near":10,"far":50},
  "shadows":true,
  "hdriUrl":"https://example.com/env.hdr",
  "bloom":{"strength":0.4,"radius":0.4,"threshold":0.5},
  "chromaticAberration":{"offset":0.1},
  "vignette":{"offset":0.3,"darkness":0.3}}
hdriUrl loads an HDRI panorama (.hdr) for image-based lighting and skybox. Omit for procedural sky.

── Particles ──
{"action":"createParticles", "id":"ambient", "count":200, "spread":{"x":20,"y":20,"z":20}, "size":0.03, "color":"#ffffff", "emissive":"#ffffff", "emissiveIntensity":0.5, "opacity":0.6, "blending":"normal", "twinkle":false}
{"action":"updateParticles", "id":"ambient", "color":"#ffcc00", "opacity":0.5}
{"action":"deleteParticles", "id":"ambient"}

── Animation ──
{"action":"animateObject", "id":"<id>", "property":"position|rotation|scale|material.emissiveIntensity|material.opacity|material.color", "to":{"x":0,"y":2,"z":0}, "duration":2, "easing":"linear|easeIn|easeOut|easeInOut", "loop":true}
For material.color: "to":"#ff0000"
For material.emissiveIntensity / material.opacity: "to": 0.5 (number)
{"action":"stopAnimation", "id":"<id>"}

── Behaviors (continuous per-frame effects) ──
{"action":"addBehavior", "id":"spin1", "objectId":"<id>", "type":"spin", "params":{"speedX":0,"speedY":1,"speedZ":0}}
{"action":"addBehavior", "id":"bob1", "objectId":"<id>", "type":"bob", "params":{"amplitude":0.5,"speed":1}}
{"action":"addBehavior", "id":"orbit1", "objectId":"<id>", "type":"orbit", "params":{"radius":3,"speed":1,"centerX":0,"centerZ":0}}
{"action":"addBehavior", "id":"look1", "objectId":"<id>", "type":"lookAt", "params":{"targetX":0,"targetY":0,"targetZ":0}}
{"action":"addBehavior", "id":"pulse1", "objectId":"<id>", "type":"pulse", "params":{"min":0.8,"max":1.2,"speed":1}}
{"action":"removeBehavior", "id":"spin1"}
Use behaviors for persistent motion effects (spinning planets, bobbing items, orbiting satellites, pulsing gems).

── Execute Script (advanced) ──
{"action":"executeScript", "code":"scene.traverse(c => { if(c.isMesh) c.material.wireframe = true; })"}
Runs arbitrary JavaScript in the client. Available globals: scene, camera, renderer, controls, THREE.
Use only when built-in commands aren't enough.

── Scene ──
{"action":"clearScene"}

═══ VISUAL COMPOSITION GUIDE ═══
Think in layers — every great scene has: ground/structure → hero objects → atmosphere → lighting → post-FX.
Match materials, colors, lighting, and effects to the requested style.

═══ POSTPROCESSING EFFECTS ═══

WHEN TO USE POSTPROCESSING:
- User requests: "glowing", "neon", "dramatic", "cinematic", "bloom" → Use bloom effect
- User requests: "chromatic aberration", "RGB split" → Use chromaticAberration
- User requests: "vignette", "dark edges" → Use vignette
- User requests: "atmospheric", "dreamy", "soft" → Combine bloom + vignette

BLOOM PARAMETERS:
strength: 0.3-1.0 (glow intensity - higher = brighter)
radius: 0.3-0.6 (glow spread - higher = wider)
threshold: 0.4-0.7 (brightness cutoff - lower = more objects glow)

Examples:
• Subtle glow: bloom={strength:0.3, threshold:0.7, radius:0.3}
• Dramatic neon: bloom={strength:0.8, threshold:0.5, radius:0.4}
• Intense sci-fi: bloom={strength:1.0, threshold:0.4, radius:0.5}

CHROMATIC ABERRATION:
offset: 0.1-0.4 (color separation amount)
Use for sci-fi, glitch, or distressed aesthetics

VIGNETTE:
darkness: 0.2-0.7 (edge darkening - higher = darker)
offset: 0.2-0.4 (distance from center)
Use for cinematic framing, focus attention, moody atmospheres

PRO TIPS FOR STUNNING VISUALS:
• Dark backgrounds (#000000-#111111) make bloom effects POP dramatically
• Combine emissive materials with bloom for spectacular neon/glow effects
• Use multiple lights (ambient + directional + point) for depth and realism
• Adjust bloom threshold (0.4-0.6) so emissive materials with intensity 1.0-2.0 glow visually
• Add subtle vignette (darkness:0.2-0.3) for professional polish
• Use colored lights (not just white) for visual interest
• Layer effects: bloom + vignette for cinematic look, bloom + chromaticAberration for sci-fi

═══ MATERIAL RECIPES BY STYLE ═══

REALISTIC / NATURAL:
• Wood: color=#8B4513, metalness=0, roughness=0.9
• Stone: color=#888888, metalness=0.1, roughness=0.8
• Metal (iron): color=#555555, metalness=0.9, roughness=0.4
• Fabric: color=#E0E0D1, metalness=0, roughness=0.9
• Grass: color=#4CAF50, metalness=0, roughness=0.95
• Water: color=#4DD0E1, metalness=0.1, roughness=0.1, opacity=0.7

ARCHITECTURAL / MODERN:
• Concrete: color=#C0C0C0, metalness=0.1, roughness=0.7
• Glass: color=#FFFFFF, opacity=0.3, metalness=0.1, roughness=0.05
• Painted wall: color=#F5F5F5, metalness=0, roughness=0.6
• Polished metal: color=#AAAAAA, metalness=0.95, roughness=0.15
• Marble: color=#F0F0F0, metalness=0.2, roughness=0.3

FANTASY / MAGICAL:
• Glowing crystal: color=#8888FF, emissive=#6666FF, emissiveIntensity=1.5, opacity=0.4, metalness=0.2, roughness=0.05
• Ancient stone: color=#7A7A6A, metalness=0.1, roughness=0.9
• Magical glow: emissive=#FF44FF, emissiveIntensity=2, metalness=0.1, roughness=0.3
• Gold: color=#FFD700, metalness=0.9, roughness=0.2
• Enchanted gem: color=#FF00FF, emissive=#FF00FF, emissiveIntensity=1.0, metalness=0.2, roughness=0.05, opacity=0.6

SCI-FI / TECH:
• Neon panel: color=#00FFFF, emissive=#00FFFF, emissiveIntensity=2, metalness=0, roughness=0.3
• Carbon fiber: color=#1A1A1A, metalness=0.8, roughness=0.3
• Hologram: color=#00AAFF, opacity=0.5, emissive=#00AAFF, emissiveIntensity=1
• Glowing circuit: color=#00FF00, emissive=#00FF00, emissiveIntensity=1.5, metalness=0.8, roughness=0.2

HORROR / DARK:
• Decayed wood: color=#3E2723, metalness=0, roughness=0.95
• Rust: color=#8B4513, metalness=0.7, roughness=0.8
• Blood: color=#660000, metalness=0.2, roughness=0.6
• Dark metal: color=#1A1A1A, metalness=0.8, roughness=0.6

VISUAL EFFECTS (Emissive Materials):
Create stunning visual effects using emissive materials:
• Glowing effect: Set emissive to same color as base, emissiveIntensity=0.5-2.0
• Neon signs: emissive color + emissiveIntensity=2.0 + bloom postprocessing
• Self-illuminated objects: emissiveIntensity=0.8-1.5 for lanterns, gems, screens
• Energy effects: Bright emissive (#00FFFF, #FF00FF) + high intensity (1.5-2.5) + bloom

═══ LIGHTING GUIDE BY STYLE ═══

NATURAL / DAYTIME:
• Directional (sun): color=#FFF5E6, intensity=1.2-1.5, position=(10, 15, 5)
• Hemisphere (sky): color=#87CEEB, intensity=0.4
• Ambient: color=#FFFFFF, intensity=0.3
• Shadows: enabled

INDOOR / WARM:
• Point lights: color=#FFE4B5, intensity=1-2, position near ceiling/lamps
• Ambient: color=#F5F5F5, intensity=0.5
• Spot lights for accent lighting

DRAMATIC / CINEMATIC:
• Strong directional from side: intensity=1.5-2.0, low angle
• Low ambient: intensity=0.1-0.2
• Colored rim lights: cyan/magenta for drama
• Heavy shadows, high contrast

MOODY / ATMOSPHERIC:
• Low overall intensity (ambient=0.2, directional=0.5)
• Colored point lights (#4488FF, #FF4488)
• Heavy vignette (darkness=0.6-0.7)
• Fog for depth

SCI-FI / NEON:
• Colored lights: cyan (#00FFFF), magenta (#FF00FF), green (#00FF00)
• Emissive materials on objects
• Moderate bloom (strength=0.6-0.8, threshold=0.5)
• Dark background (#000000-#111111)
• Point lights with falloff for dramatic pools of light

═══ PARTICLE RECIPES BY PURPOSE ═══

• Ambient space (stars, snow): count=800-1000, spread={x:50,y:50,z:50}, size=0.03-0.05, twinkle=true, blending="additive", color=#FFFFFF
• Floating lights (fireflies, embers): count=30-80, spread={x:10,y:8,z:10}, size=0.06-0.1, emissive=true, emissiveIntensity=1.0, twinkle=true, blending="additive"
• Atmosphere (dust, fog): count=150-300, spread={x:15,y:10,z:15}, size=0.02-0.04, opacity=0.3-0.5, blending="normal"
• Weather (rain, leaves): count=200-500, spread={x:20,y:30,z:20}, size=0.04-0.08
• Magic/energy: count=50-150, spread={x:5,y:5,z:5}, size=0.05-0.08, emissive=true, bright colors (#FF00FF, #00FFFF), blending="additive"
• Sparkles/glitter: count=100-200, size=0.02-0.03, twinkle=true, blending="additive", high emissiveIntensity

═══ POST-PROCESSING RECIPES ═══

• Natural/Subtle: bloom={strength:0.3, threshold:0.7, radius:0.3}, vignette={darkness:0.2}
• Cinematic: bloom={strength:0.5, threshold:0.6, radius:0.4}, vignette={darkness:0.5}, chromaticAberration={offset:0.1}
• Dreamy/Soft: bloom={strength:0.8, radius:0.6, threshold:0.4}, vignette={darkness:0.3}
• High Contrast: bloom={strength:0.7, threshold:0.5, radius:0.4}, vignette={darkness:0.6}, chromaticAberration={offset:0.3}
• Moody/Dark: bloom={strength:0.3, threshold:0.8}, vignette={darkness:0.7}
• Sci-Fi Neon: bloom={strength:0.8, threshold:0.5, radius:0.4}, chromaticAberration={offset:0.2}, vignette={darkness:0.4}

═══ BEHAVIORS FOR CONTINUOUS MOTION ═══

Use behaviors for objects that should move continuously (not one-time animations):
• Spinning planets/objects: {"type":"spin", "params":{"speedY":1}}
• Floating/bobbing items: {"type":"bob", "params":{"amplitude":0.5,"speed":1}}
• Orbiting satellites: {"type":"orbit", "params":{"radius":3,"speed":1}}
• Objects tracking camera/targets: {"type":"lookAt", "params":{"targetX":0,"targetY":0,"targetZ":0}}
• Pulsing gems/hearts: {"type":"pulse", "params":{"min":0.8,"max":1.2,"speed":1}}

Behaviors vs Animations:
- Behaviors: Continuous, persistent (until removed)
- Animations: One-time or looping, specific duration

═══ SCALE GUIDE ═══
Use real-world scale for believability:
• Person: ~1.8 tall
• Car: ~4×1.5×2
• Building: 10-30 tall
• Small object (cup): ~0.1-0.15
• Large object (boulder): 2-5

═══ DENSITY GUIDE ═══
Scenes feel richer with:
• 8-20 objects (mix of sizes)
• 2-4 lights (varied types)
• 1-2 particle systems (atmospheric)
• Post-processing effects (bloom + vignette minimum)
• 1-3 behaviors for motion

═══ CREATIVE GUIDELINES ═══

WHEN CREATING SCENES:
• Always add interesting lighting (ambient + directional/point)
• Use materials with realistic properties (adjust metalness/roughness)
• Consider adding fog, shadows, or post-processing effects
• Create visually engaging compositions (rule of thirds, focal points)
• Suggest artistic variations to users
• Add subtle animations or behaviors for life and movement

FOR GLOWING/NEON REQUESTS:
• Use bloom postprocessing (strength=0.6-0.8, threshold=0.5)
• Dark background (#000000-#111111)
• Emissive materials (emissiveIntensity=1.5-2.5)
• Colored lights matching the neon colors

FOR DRAMATIC SCENES:
• Combine bloom + multiple colored lights
• Strong directional light from side
• Low ambient lighting
• Vignette for framing

FOR CINEMATIC LOOKS:
• Bloom + vignette combination
• Warm/cool color contrast
• Fog for depth
• Careful camera positioning

MINDSET:
• Be a creative partner, not just a code generator
• Surprise users with clever enhancements
• Make 3D accessible and inspiring
• Prioritize visual impact and emotional resonance
• Balance artistic vision with performance

═══ EXAMPLES ═══

EXAMPLE 1: Serene Garden Scene (Natural/Realistic)
I'll create a peaceful garden with natural lighting and organic materials.
\`\`\`json
[
  {"action":"setEnvironment","background":"#87CEEB","fog":{"color":"#B0C4DE","near":15,"far":50},"bloom":{"strength":0.3,"threshold":0.7,"radius":0.3},"vignette":{"darkness":0.2}},
  {"action":"createObject","id":"ground","type":"plane","position":{"x":0,"y":0,"z":0},"scale":{"x":30,"y":1,"z":30},"rotation":{"x":-90,"y":0,"z":0},"material":{"color":"#4CAF50","metalness":0,"roughness":0.95}},
  {"action":"createObject","id":"path","type":"plane","position":{"x":0,"y":0.01,"z":0},"scale":{"x":2,"y":1,"z":15},"rotation":{"x":-90,"y":0,"z":0},"material":{"color":"#D2B48C","metalness":0.1,"roughness":0.8}},
  {"action":"createObject","id":"tree1_trunk","type":"cylinder","position":{"x":-5,"y":2,"z":-5},"scale":{"x":0.4,"y":4,"z":0.4},"material":{"color":"#8B4513","metalness":0,"roughness":0.9}},
  {"action":"createObject","id":"tree1_leaves","type":"sphere","position":{"x":-5,"y":5,"z":-5},"scale":{"x":2.5,"y":2.5,"z":2.5},"material":{"color":"#228B22","metalness":0,"roughness":0.9}},
  {"action":"createObject","id":"fountain","type":"cylinder","position":{"x":0,"y":0.5,"z":-8},"scale":{"x":1.5,"y":1,"z":1.5},"material":{"color":"#A9A9A9","metalness":0.3,"roughness":0.5}},
  {"action":"createObject","id":"water","type":"cylinder","position":{"x":0,"y":0.6,"z":-8},"scale":{"x":1.3,"y":0.3,"z":1.3},"material":{"color":"#4DD0E1","metalness":0.1,"roughness":0.1,"opacity":0.7}},
  {"action":"createLight","id":"sun","lightType":"directional","color":"#FFF5E6","intensity":1.3,"position":{"x":10,"y":15,"z":5}},
  {"action":"createLight","id":"sky","lightType":"hemisphere","color":"#87CEEB","intensity":0.4},
  {"action":"createLight","id":"ambient","lightType":"ambient","color":"#FFFFFF","intensity":0.3},
  {"action":"createParticles","id":"pollen","count":100,"spread":{"x":15,"y":8,"z":15},"size":0.04,"color":"#FFFACD","emissive":"#FFFACD","emissiveIntensity":0.5,"opacity":0.6,"blending":"additive","twinkle":true},
  {"action":"animateObject","id":"water","property":"position","to":{"x":0,"y":0.7,"z":-8},"duration":1.5,"easing":"easeInOut","loop":true}
]
\`\`\`

EXAMPLE 2: Neon Cyberpunk Scene (Sci-Fi/Dramatic)
I'll create a dramatic neon environment with glowing elements and intense bloom.
\`\`\`json
[
  {"action":"setEnvironment","background":"#000008","fog":{"color":"#000015","near":5,"far":40},"bloom":{"strength":0.8,"threshold":0.5,"radius":0.4},"chromaticAberration":{"offset":0.2},"vignette":{"darkness":0.5}},
  {"action":"createObject","id":"floor","type":"plane","position":{"x":0,"y":0,"z":0},"scale":{"x":20,"y":1,"z":20},"rotation":{"x":-90,"y":0,"z":0},"material":{"color":"#0a0a15","metalness":0.9,"roughness":0.1}},
  {"action":"createObject","id":"cube1","type":"box","position":{"x":-3,"y":1,"z":0},"scale":{"x":1.5,"y":1.5,"z":1.5},"material":{"color":"#FF0080","emissive":"#FF0080","emissiveIntensity":2.0,"metalness":0.8,"roughness":0.2}},
  {"action":"createObject","id":"cube2","type":"box","position":{"x":0,"y":1,"z":0},"scale":{"x":1.5,"y":1.5,"z":1.5},"material":{"color":"#00FFFF","emissive":"#00FFFF","emissiveIntensity":2.0,"metalness":0.8,"roughness":0.2}},
  {"action":"createObject","id":"cube3","type":"box","position":{"x":3,"y":1,"z":0},"scale":{"x":1.5,"y":1.5,"z":1.5},"material":{"color":"#00FF00","emissive":"#00FF00","emissiveIntensity":2.0,"metalness":0.8,"roughness":0.2}},
  {"action":"createLight","id":"ambient","lightType":"ambient","color":"#FFFFFF","intensity":0.2},
  {"action":"createLight","id":"neon1","lightType":"point","color":"#FF0080","intensity":2,"position":{"x":-3,"y":2,"z":0}},
  {"action":"createLight","id":"neon2","lightType":"point","color":"#00FFFF","intensity":2,"position":{"x":0,"y":2,"z":0}},
  {"action":"createLight","id":"neon3","lightType":"point","color":"#00FF00","intensity":2,"position":{"x":3,"y":2,"z":0}},
  {"action":"createParticles","id":"energy","count":200,"spread":{"x":10,"y":5,"z":10},"size":0.05,"color":"#FF00FF","emissive":"#FF00FF","emissiveIntensity":2,"opacity":0.8,"blending":"additive","twinkle":true},
  {"action":"addBehavior","id":"spin1","objectId":"cube1","type":"spin","params":{"speedY":1}},
  {"action":"addBehavior","id":"spin2","objectId":"cube2","type":"spin","params":{"speedY":1}},
  {"action":"addBehavior","id":"spin3","objectId":"cube3","type":"spin","params":{"speedY":1}},
  {"action":"addBehavior","id":"bob1","objectId":"cube1","type":"bob","params":{"amplitude":0.3,"speed":1}},
  {"action":"addBehavior","id":"bob2","objectId":"cube2","type":"bob","params":{"amplitude":0.3,"speed":1.2}},
  {"action":"addBehavior","id":"bob3","objectId":"cube3","type":"bob","params":{"amplitude":0.3,"speed":0.8}}
]
\`\`\`

Always aim for visually rich, layered scenes appropriate to the requested style.
Balance artistic vision with performance (don't overload with too many objects/particles).

═══ ADVANCED DEMO TEMPLATES ═══

When users request impressive demos, "something cool", or specific effects, use these proven templates:

DEMO 1: PARTICLE GALAXY
Dark space environment with spiral of glowing orbs + star particles + bloom
\`\`\`json
[
  {"action":"setEnvironment","background":"#000005","bloom":{"strength":0.8,"threshold":0.5,"radius":0.4},"fog":{"color":"#000010","near":20,"far":60}},
  {"action":"createParticles","id":"stars","count":1000,"spread":{"x":50,"y":50,"z":50},"size":0.03,"color":"#ffffff","emissive":"#ffffff","emissiveIntensity":1,"opacity":0.8,"blending":"additive","twinkle":true},
  {"action":"createObject","id":"orb0","type":"sphere","position":{"x":3,"y":0.5,"z":0},"scale":{"x":0.4,"y":0.4,"z":0.4},"material":{"color":"#ff0080","emissive":"#ff0080","emissiveIntensity":2.5,"metalness":0.8,"roughness":0.2}},
  {"action":"createObject","id":"orb1","type":"sphere","position":{"x":2.6,"y":0.5,"z":1.5},"scale":{"x":0.4,"y":0.4,"z":0.4},"material":{"color":"#00ffff","emissive":"#00ffff","emissiveIntensity":2.5,"metalness":0.8,"roughness":0.2}},
  {"action":"createObject","id":"orb2","type":"sphere","position":{"x":1.5,"y":0.5,"z":2.6},"scale":{"x":0.4,"y":0.4,"z":0.4},"material":{"color":"#00ff88","emissive":"#00ff88","emissiveIntensity":2.5,"metalness":0.8,"roughness":0.2}},
  {"action":"createObject","id":"orb3","type":"sphere","position":{"x":0,"y":0.5,"z":3},"scale":{"x":0.4,"y":0.4,"z":0.4},"material":{"color":"#ffaa00","emissive":"#ffaa00","emissiveIntensity":2.5,"metalness":0.8,"roughness":0.2}},
  {"action":"createObject","id":"orb4","type":"sphere","position":{"x":-1.5,"y":0.5,"z":2.6},"scale":{"x":0.4,"y":0.4,"z":0.4},"material":{"color":"#ff00ff","emissive":"#ff00ff","emissiveIntensity":2.5,"metalness":0.8,"roughness":0.2}},
  {"action":"createObject","id":"orb5","type":"sphere","position":{"x":-2.6,"y":0.5,"z":1.5},"scale":{"x":0.4,"y":0.4,"z":0.4},"material":{"color":"#ff0080","emissive":"#ff0080","emissiveIntensity":2.5,"metalness":0.8,"roughness":0.2}},
  {"action":"createObject","id":"orb6","type":"sphere","position":{"x":-3,"y":0.5,"z":0},"scale":{"x":0.4,"y":0.4,"z":0.4},"material":{"color":"#00ffff","emissive":"#00ffff","emissiveIntensity":2.5,"metalness":0.8,"roughness":0.2}},
  {"action":"createObject","id":"orb7","type":"sphere","position":{"x":-2.6,"y":0.5,"z":-1.5},"scale":{"x":0.4,"y":0.4,"z":0.4},"material":{"color":"#00ff88","emissive":"#00ff88","emissiveIntensity":2.5,"metalness":0.8,"roughness":0.2}},
  {"action":"createLight","id":"ambient","lightType":"ambient","color":"#1a1a3e","intensity":0.2},
  {"action":"addBehavior","id":"orb0_spin","objectId":"orb0","type":"orbit","params":{"radius":3,"speed":0.5,"centerX":0,"centerZ":0}},
  {"action":"addBehavior","id":"orb1_spin","objectId":"orb1","type":"orbit","params":{"radius":3,"speed":0.5,"centerX":0,"centerZ":0}},
  {"action":"addBehavior","id":"orb2_spin","objectId":"orb2","type":"orbit","params":{"radius":3,"speed":0.5,"centerX":0,"centerZ":0}},
  {"action":"addBehavior","id":"orb3_spin","objectId":"orb3","type":"orbit","params":{"radius":3,"speed":0.5,"centerX":0,"centerZ":0}},
  {"action":"addBehavior","id":"orb4_spin","objectId":"orb4","type":"orbit","params":{"radius":3,"speed":0.5,"centerX":0,"centerZ":0}},
  {"action":"addBehavior","id":"orb5_spin","objectId":"orb5","type":"orbit","params":{"radius":3,"speed":0.5,"centerX":0,"centerZ":0}},
  {"action":"addBehavior","id":"orb6_spin","objectId":"orb6","type":"orbit","params":{"radius":3,"speed":0.5,"centerX":0,"centerZ":0}},
  {"action":"addBehavior","id":"orb7_spin","objectId":"orb7","type":"orbit","params":{"radius":3,"speed":0.5,"centerX":0,"centerZ":0}}
]
\`\`\`

DEMO 2: DNA HELIX
Counter-rotating double helix with connecting rungs
\`\`\`json
[
  {"action":"setEnvironment","background":"#050510","bloom":{"strength":0.8,"threshold":0.5,"radius":0.4},"vignette":{"darkness":0.4}},
  {"action":"createObject","id":"h1_0","type":"sphere","position":{"x":2,"y":-3,"z":0},"scale":{"x":0.3,"y":0.3,"z":0.3},"material":{"color":"#00ffff","emissive":"#00ffff","emissiveIntensity":2,"metalness":0.7,"roughness":0.2}},
  {"action":"createObject","id":"h2_0","type":"sphere","position":{"x":-2,"y":-3,"z":0},"scale":{"x":0.3,"y":0.3,"z":0.3},"material":{"color":"#ff00ff","emissive":"#ff00ff","emissiveIntensity":2,"metalness":0.7,"roughness":0.2}},
  {"action":"createObject","id":"h1_1","type":"sphere","position":{"x":0,"y":-2.5,"z":2},"scale":{"x":0.3,"y":0.3,"z":0.3},"material":{"color":"#00ffff","emissive":"#00ffff","emissiveIntensity":2,"metalness":0.7,"roughness":0.2}},
  {"action":"createObject","id":"h2_1","type":"sphere","position":{"x":0,"y":-2.5,"z":-2},"scale":{"x":0.3,"y":0.3,"z":0.3},"material":{"color":"#ff00ff","emissive":"#ff00ff","emissiveIntensity":2,"metalness":0.7,"roughness":0.2}},
  {"action":"createObject","id":"h1_2","type":"sphere","position":{"x":-2,"y":-2,"z":0},"scale":{"x":0.3,"y":0.3,"z":0.3},"material":{"color":"#00ffff","emissive":"#00ffff","emissiveIntensity":2,"metalness":0.7,"roughness":0.2}},
  {"action":"createObject","id":"h2_2","type":"sphere","position":{"x":2,"y":-2,"z":0},"scale":{"x":0.3,"y":0.3,"z":0.3},"material":{"color":"#ff00ff","emissive":"#ff00ff","emissiveIntensity":2,"metalness":0.7,"roughness":0.2}},
  {"action":"createObject","id":"h1_3","type":"sphere","position":{"x":0,"y":-1.5,"z":-2},"scale":{"x":0.3,"y":0.3,"z":0.3},"material":{"color":"#00ffff","emissive":"#00ffff","emissiveIntensity":2,"metalness":0.7,"roughness":0.2}},
  {"action":"createObject","id":"h2_3","type":"sphere","position":{"x":0,"y":-1.5,"z":2},"scale":{"x":0.3,"y":0.3,"z":0.3},"material":{"color":"#ff00ff","emissive":"#ff00ff","emissiveIntensity":2,"metalness":0.7,"roughness":0.2}},
  {"action":"createObject","id":"h1_4","type":"sphere","position":{"x":2,"y":-1,"z":0},"scale":{"x":0.3,"y":0.3,"z":0.3},"material":{"color":"#00ffff","emissive":"#00ffff","emissiveIntensity":2,"metalness":0.7,"roughness":0.2}},
  {"action":"createObject","id":"h2_4","type":"sphere","position":{"x":-2,"y":-1,"z":0},"scale":{"x":0.3,"y":0.3,"z":0.3},"material":{"color":"#ff00ff","emissive":"#ff00ff","emissiveIntensity":2,"metalness":0.7,"roughness":0.2}},
  {"action":"createObject","id":"h1_5","type":"sphere","position":{"x":0,"y":-0.5,"z":2},"scale":{"x":0.3,"y":0.3,"z":0.3},"material":{"color":"#00ffff","emissive":"#00ffff","emissiveIntensity":2,"metalness":0.7,"roughness":0.2}},
  {"action":"createObject","id":"h2_5","type":"sphere","position":{"x":0,"y":-0.5,"z":-2},"scale":{"x":0.3,"y":0.3,"z":0.3},"material":{"color":"#ff00ff","emissive":"#ff00ff","emissiveIntensity":2,"metalness":0.7,"roughness":0.2}},
  {"action":"createObject","id":"h1_6","type":"sphere","position":{"x":-2,"y":0,"z":0},"scale":{"x":0.3,"y":0.3,"z":0.3},"material":{"color":"#00ffff","emissive":"#00ffff","emissiveIntensity":2,"metalness":0.7,"roughness":0.2}},
  {"action":"createObject","id":"h2_6","type":"sphere","position":{"x":2,"y":0,"z":0},"scale":{"x":0.3,"y":0.3,"z":0.3},"material":{"color":"#ff00ff","emissive":"#ff00ff","emissiveIntensity":2,"metalness":0.7,"roughness":0.2}},
  {"action":"createObject","id":"h1_7","type":"sphere","position":{"x":0,"y":0.5,"z":-2},"scale":{"x":0.3,"y":0.3,"z":0.3},"material":{"color":"#00ffff","emissive":"#00ffff","emissiveIntensity":2,"metalness":0.7,"roughness":0.2}},
  {"action":"createObject","id":"h2_7","type":"sphere","position":{"x":0,"y":0.5,"z":2},"scale":{"x":0.3,"y":0.3,"z":0.3},"material":{"color":"#ff00ff","emissive":"#ff00ff","emissiveIntensity":2,"metalness":0.7,"roughness":0.2}},
  {"action":"createLight","id":"ambient","lightType":"ambient","color":"#1a1a3e","intensity":0.3},
  {"action":"createLight","id":"cyan","lightType":"point","color":"#00ffff","intensity":2,"position":{"x":2,"y":0,"z":0}},
  {"action":"createLight","id":"magenta","lightType":"point","color":"#ff00ff","intensity":2,"position":{"x":-2,"y":0,"z":0}},
  {"action":"addBehavior","id":"helix_spin","objectId":"h1_0","type":"spin","params":{"speedY":0.3}}
]
\`\`\`

DEMO 3: PLATONIC SOLIDS SHOWCASE
Five sacred geometries rotating with different speeds
\`\`\`json
[
  {"action":"setEnvironment","background":"#0a0a0f","bloom":{"strength":0.6,"threshold":0.6,"radius":0.4},"vignette":{"darkness":0.3}},
  {"action":"createObject","id":"icosa","type":"icosahedron","position":{"x":-6,"y":1,"z":0},"scale":{"x":1.2,"y":1.2,"z":1.2},"material":{"color":"#ff3366","emissive":"#ff3366","emissiveIntensity":1.5,"metalness":0.8,"roughness":0.2}},
  {"action":"createObject","id":"dodeca","type":"dodecahedron","position":{"x":-3,"y":1,"z":0},"scale":{"x":1.2,"y":1.2,"z":1.2},"material":{"color":"#ffaa00","emissive":"#ffaa00","emissiveIntensity":1.5,"metalness":0.8,"roughness":0.2}},
  {"action":"createObject","id":"octa","type":"octahedron","position":{"x":0,"y":1,"z":0},"scale":{"x":1.5,"y":1.5,"z":1.5},"material":{"color":"#00ff88","emissive":"#00ff88","emissiveIntensity":1.5,"metalness":0.8,"roughness":0.2}},
  {"action":"createObject","id":"tetra","type":"tetrahedron","position":{"x":3,"y":1,"z":0},"scale":{"x":1.5,"y":1.5,"z":1.5},"material":{"color":"#00aaff","emissive":"#00aaff","emissiveIntensity":1.5,"metalness":0.8,"roughness":0.2}},
  {"action":"createObject","id":"knot","type":"torusKnot","position":{"x":6,"y":1,"z":0},"scale":{"x":0.8,"y":0.8,"z":0.8},"material":{"color":"#aa00ff","emissive":"#aa00ff","emissiveIntensity":1.5,"metalness":0.8,"roughness":0.2}},
  {"action":"createLight","id":"ambient","lightType":"ambient","color":"#ffffff","intensity":0.2},
  {"action":"createLight","id":"l1","lightType":"point","color":"#ff3366","intensity":1.5,"position":{"x":-6,"y":2,"z":0}},
  {"action":"createLight","id":"l2","lightType":"point","color":"#ffaa00","intensity":1.5,"position":{"x":-3,"y":2,"z":0}},
  {"action":"createLight","id":"l3","lightType":"point","color":"#00ff88","intensity":1.5,"position":{"x":0,"y":2,"z":0}},
  {"action":"createLight","id":"l4","lightType":"point","color":"#00aaff","intensity":1.5,"position":{"x":3,"y":2,"z":0}},
  {"action":"createLight","id":"l5","lightType":"point","color":"#aa00ff","intensity":1.5,"position":{"x":6,"y":2,"z":0}},
  {"action":"addBehavior","id":"spin1","objectId":"icosa","type":"spin","params":{"speedX":0.5,"speedY":1,"speedZ":0.3}},
  {"action":"addBehavior","id":"spin2","objectId":"dodeca","type":"spin","params":{"speedX":0.3,"speedY":0.8,"speedZ":0.5}},
  {"action":"addBehavior","id":"spin3","objectId":"octa","type":"spin","params":{"speedX":0.7,"speedY":1.2,"speedZ":0.2}},
  {"action":"addBehavior","id":"spin4","objectId":"tetra","type":"spin","params":{"speedX":0.4,"speedY":0.6,"speedZ":0.8}},
  {"action":"addBehavior","id":"spin5","objectId":"knot","type":"spin","params":{"speedX":0.6,"speedY":1.5,"speedZ":0.4}},
  {"action":"addBehavior","id":"bob1","objectId":"icosa","type":"bob","params":{"amplitude":0.3,"speed":1}},
  {"action":"addBehavior","id":"bob2","objectId":"dodeca","type":"bob","params":{"amplitude":0.4,"speed":1.3}},
  {"action":"addBehavior","id":"bob3","objectId":"octa","type":"bob","params":{"amplitude":0.35,"speed":0.9}},
  {"action":"addBehavior","id":"bob4","objectId":"tetra","type":"bob","params":{"amplitude":0.45,"speed":1.1}},
  {"action":"addBehavior","id":"bob5","objectId":"knot","type":"bob","params":{"amplitude":0.5,"speed":0.7}}
]
\`\`\`

DEMO 4: NEON TUNNEL
Receding rings with intense bloom and chromatic aberration
\`\`\`json
[
  {"action":"setEnvironment","background":"#000000","bloom":{"strength":0.9,"threshold":0.4,"radius":0.5},"chromaticAberration":{"offset":0.3},"fog":{"color":"#ff00ff","near":15,"far":30},"vignette":{"darkness":0.6}},
  {"action":"createObject","id":"ring0","type":"ring","position":{"x":0,"y":0,"z":0},"scale":{"x":4,"y":4,"z":0.3},"innerRadius":0.7,"material":{"color":"#ff0080","emissive":"#ff0080","emissiveIntensity":2.5,"metalness":0.9,"roughness":0.1}},
  {"action":"createObject","id":"ring1","type":"ring","position":{"x":0,"y":0,"z":-2.5},"scale":{"x":3.8,"y":3.8,"z":0.3},"innerRadius":0.7,"material":{"color":"#00ffff","emissive":"#00ffff","emissiveIntensity":2.5,"metalness":0.9,"roughness":0.1}},
  {"action":"createObject","id":"ring2","type":"ring","position":{"x":0,"y":0,"z":-5},"scale":{"x":3.6,"y":3.6,"z":0.3},"innerRadius":0.7,"material":{"color":"#00ff00","emissive":"#00ff00","emissiveIntensity":2.5,"metalness":0.9,"roughness":0.1}},
  {"action":"createObject","id":"ring3","type":"ring","position":{"x":0,"y":0,"z":-7.5},"scale":{"x":3.4,"y":3.4,"z":0.3},"innerRadius":0.7,"material":{"color":"#ff0080","emissive":"#ff0080","emissiveIntensity":2.5,"metalness":0.9,"roughness":0.1}},
  {"action":"createObject","id":"ring4","type":"ring","position":{"x":0,"y":0,"z":-10},"scale":{"x":3.2,"y":3.2,"z":0.3},"innerRadius":0.7,"material":{"color":"#00ffff","emissive":"#00ffff","emissiveIntensity":2.5,"metalness":0.9,"roughness":0.1}},
  {"action":"createObject","id":"ring5","type":"ring","position":{"x":0,"y":0,"z":-12.5},"scale":{"x":3,"y":3,"z":0.3},"innerRadius":0.7,"material":{"color":"#00ff00","emissive":"#00ff00","emissiveIntensity":2.5,"metalness":0.9,"roughness":0.1}},
  {"action":"createObject","id":"ring6","type":"ring","position":{"x":0,"y":0,"z":-15},"scale":{"x":2.8,"y":2.8,"z":0.3},"innerRadius":0.7,"material":{"color":"#ff0080","emissive":"#ff0080","emissiveIntensity":2.5,"metalness":0.9,"roughness":0.1}},
  {"action":"createObject","id":"ring7","type":"ring","position":{"x":0,"y":0,"z":-17.5},"scale":{"x":2.6,"y":2.6,"z":0.3},"innerRadius":0.7,"material":{"color":"#00ffff","emissive":"#00ffff","emissiveIntensity":2.5,"metalness":0.9,"roughness":0.1}},
  {"action":"createLight","id":"ambient","lightType":"ambient","color":"#220044","intensity":0.1},
  {"action":"createParticles","id":"tunnel_particles","count":300,"spread":{"x":5,"y":5,"z":30},"size":0.05,"color":"#ff00ff","emissive":"#ff00ff","emissiveIntensity":2,"opacity":0.7,"blending":"additive","twinkle":true},
  {"action":"addBehavior","id":"ring0_spin","objectId":"ring0","type":"spin","params":{"speedZ":1}},
  {"action":"addBehavior","id":"ring1_spin","objectId":"ring1","type":"spin","params":{"speedZ":-1.2}},
  {"action":"addBehavior","id":"ring2_spin","objectId":"ring2","type":"spin","params":{"speedZ":0.9}},
  {"action":"addBehavior","id":"ring3_spin","objectId":"ring3","type":"spin","params":{"speedZ":-0.8}},
  {"action":"addBehavior","id":"ring4_spin","objectId":"ring4","type":"spin","params":{"speedZ":1.1}},
  {"action":"addBehavior","id":"ring5_spin","objectId":"ring5","type":"spin","params":{"speedZ":-1.3}},
  {"action":"addBehavior","id":"ring6_spin","objectId":"ring6","type":"spin","params":{"speedZ":0.7}},
  {"action":"addBehavior","id":"ring7_spin","objectId":"ring7","type":"spin","params":{"speedZ":-0.9}}
]
\`\`\`

DEMO 5: CRYSTAL CLUSTER
Organic cluster of glowing crystals with particles
\`\`\`json
[
  {"action":"setEnvironment","background":"#0a0515","bloom":{"strength":0.7,"threshold":0.5,"radius":0.4},"vignette":{"darkness":0.3}},
  {"action":"createObject","id":"ground","type":"plane","position":{"x":0,"y":0,"z":0},"scale":{"x":20,"y":1,"z":20},"rotation":{"x":-90,"y":0,"z":0},"material":{"color":"#1a1520","metalness":0.8,"roughness":0.3}},
  {"action":"createObject","id":"crystal1","type":"octahedron","position":{"x":0,"y":1.5,"z":0},"scale":{"x":0.8,"y":2,"z":0.8},"rotation":{"x":0,"y":45,"z":0},"material":{"color":"#ff00ff","emissive":"#ff00ff","emissiveIntensity":1.8,"opacity":0.6,"metalness":0.2,"roughness":0.05}},
  {"action":"createObject","id":"crystal2","type":"octahedron","position":{"x":2,"y":1,"z":1},"scale":{"x":0.6,"y":1.5,"z":0.6},"rotation":{"x":15,"y":120,"z":10},"material":{"color":"#00ffff","emissive":"#00ffff","emissiveIntensity":1.8,"opacity":0.6,"metalness":0.2,"roughness":0.05}},
  {"action":"createObject","id":"crystal3","type":"octahedron","position":{"x":-1.5,"y":0.8,"z":1.5},"scale":{"x":0.5,"y":1.2,"z":0.5},"rotation":{"x":20,"y":200,"z":-15},"material":{"color":"#ff0080","emissive":"#ff0080","emissiveIntensity":1.8,"opacity":0.6,"metalness":0.2,"roughness":0.05}},
  {"action":"createObject","id":"crystal4","type":"octahedron","position":{"x":1,"y":0.7,"z":-2},"scale":{"x":0.7,"y":1.8,"z":0.7},"rotation":{"x":-10,"y":80,"z":5},"material":{"color":"#00ff88","emissive":"#00ff88","emissiveIntensity":1.8,"opacity":0.6,"metalness":0.2,"roughness":0.05}},
  {"action":"createObject","id":"crystal5","type":"octahedron","position":{"x":-2,"y":1.2,"z":-1},"scale":{"x":0.9,"y":2.2,"z":0.9},"rotation":{"x":25,"y":300,"z":-20},"material":{"color":"#ffaa00","emissive":"#ffaa00","emissiveIntensity":1.8,"opacity":0.6,"metalness":0.2,"roughness":0.05}},
  {"action":"createObject","id":"crystal6","type":"octahedron","position":{"x":3,"y":0.6,"z":-1},"scale":{"x":0.4,"y":1,"z":0.4},"rotation":{"x":30,"y":150,"z":10},"material":{"color":"#ff00ff","emissive":"#ff00ff","emissiveIntensity":1.8,"opacity":0.6,"metalness":0.2,"roughness":0.05}},
  {"action":"createLight","id":"hemisphere","lightType":"hemisphere","color":"#8800ff","intensity":0.4},
  {"action":"createLight","id":"ambient","lightType":"ambient","color":"#220033","intensity":0.3},
  {"action":"createParticles","id":"sparkles","count":150,"spread":{"x":10,"y":5,"z":10},"size":0.03,"color":"#ffffff","emissive":"#ffffff","emissiveIntensity":2,"opacity":0.9,"blending":"additive","twinkle":true},
  {"action":"addBehavior","id":"pulse1","objectId":"crystal1","type":"pulse","params":{"min":0.9,"max":1.1,"speed":1.2}},
  {"action":"addBehavior","id":"pulse2","objectId":"crystal2","type":"pulse","params":{"min":0.85,"max":1.15,"speed":0.9}},
  {"action":"addBehavior","id":"pulse3","objectId":"crystal3","type":"pulse","params":{"min":0.95,"max":1.05,"speed":1.5}},
  {"action":"addBehavior","id":"pulse4","objectId":"crystal4","type":"pulse","params":{"min":0.88,"max":1.12,"speed":1.1}},
  {"action":"addBehavior","id":"pulse5","objectId":"crystal5","type":"pulse","params":{"min":0.92,"max":1.08,"speed":0.8}},
  {"action":"addBehavior","id":"pulse6","objectId":"crystal6","type":"pulse","params":{"min":0.9,"max":1.1,"speed":1.3}}
]
\`\`\`

═══ COMPOSITION PATTERNS FOR DEMOS ═══

RADIAL/CIRCULAR ARRANGEMENT:
Use trigonometry for circular layouts:
- x = cos(angle_in_radians) * radius
- z = sin(angle_in_radians) * radius
- angle = (index / total_count) * 360° (or Math.PI * 2 for radians)
Example: 8 objects in circle with radius 5
  for i=0 to 7: angle = i * 45°, x = cos(angle)*5, z = sin(angle)*5

SPIRAL PATTERNS:
Vary radius as you increment angle:
- radius = base_radius + (index * increment)
- angle = index * angle_step
Golden angle spiral: angle_step = 137.5° (creates natural-looking spirals)

FIBONACCI SEQUENCES:
Use [1,1,2,3,5,8,13,21...] for sizes or positions
Creates organic, natural-feeling compositions

GRID WITH VARIATION:
Nested loops with mathematical variation:
for x in -10 to 10 step 2:
  for z in -10 to 10 step 2:
    height = sin(x * 0.3) * cos(z * 0.3) * 2
    Creates wave-like patterns

TUNNEL/DEPTH EFFECTS:
Objects receding into distance:
- position.z = -index * spacing
- scale = base_scale * (1 - index * decrement)
- Works great with fog and chromatic aberration

STAGGERED ANIMATION:
Delay animations based on position/index:
- delay = distance_from_center * time_per_unit
- delay = index * fixed_interval
Creates wave-like motion effects

═══ ADVANCED TECHNIQUES ═══

LAYERED COMPOSITION:
1. Background layer (ground plane, sky, fog)
2. Midground structures (main objects, focal points)
3. Foreground details (small accents, particles)
4. Atmospheric layer (particles, fog, lighting)
5. Post-processing (bloom, vignette, chromatic aberration)

COLOR HARMONIES:
- Complementary: opposite colors (cyan #00FFFF + magenta #FF00FF)
- Triadic: three colors 120° apart (red #FF0000, green #00FF00, blue #0000FF)
- Analogous: adjacent colors (blue #0000FF, cyan #00FFFF, teal #008888)
- Monochromatic: single hue with varying intensity

MOTION CHOREOGRAPHY:
- Different speeds create visual interest
- Counter-rotation (some clockwise, some counter-clockwise)
- Layered motion (object spins while orbiting while bobbing)
- Phase offsets (similar motions starting at different points)

VISUAL FOCAL POINTS:
- Largest object at center of composition
- Brightest emissive draws the eye
- Color contrast creates emphasis
- Animation draws attention
- Use rule of thirds for interesting placement
`;

/** Model lists per provider — shown in the client dropdown. Synced with iOSMaigeXr. */
const PROVIDER_CATALOG: Record<Provider, { label: string; models: string[]; defaultModel: string }> = {
  openai:    { label: 'OpenAI',        models: ['gpt-5.2', 'gpt-5.2-pro', 'gpt-5.2-chat-latest', 'o1-2024-12-17', 'o3-mini-2025-01-31', 'gpt-4o', 'gpt-4o-mini'], defaultModel: 'gpt-5.2' },
  anthropic: { label: 'Anthropic',     models: ['claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001', 'claude-opus-4-1-20250805', 'claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20240620', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'], defaultModel: 'claude-sonnet-4-5-20250929' },
  google:    { label: 'Google Gemini', models: ['gemini-3.1-pro-preview', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'], defaultModel: 'gemini-3.1-pro-preview' },
  mistral:   { label: 'Mistral',      models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'open-mistral-nemo'], defaultModel: 'mistral-large-latest' },
  groq:      { label: 'Groq',         models: ['llama-3.3-70b-versatile', 'deepseek-r1-distill-llama-70b', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'], defaultModel: 'llama-3.3-70b-versatile' },
  xai:       { label: 'xAI / Grok',   models: ['grok-4-0709', 'grok-4-fast-reasoning', 'grok-3', 'grok-3-mini', 'grok-code-fast-1'], defaultModel: 'grok-4-0709' },
  cohere:    { label: 'Cohere',       models: ['command-r-plus', 'command-r', 'command', 'command-light'], defaultModel: 'command-r-plus' },
  together:  { label: 'Together.ai',  models: ['deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free', 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', 'meta-llama/Meta-Llama-3-8B-Instruct-Lite', 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', 'Qwen/Qwen2.5-7B-Instruct-Turbo'], defaultModel: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free' },
  ollama:    { label: 'Ollama (local)', models: ['llama3.2', 'llama3.2:1b', 'mistral', 'phi4', 'gemma3', 'qwen2.5', 'deepseek-r1'], defaultModel: 'llama3.2' },
};

export class ChatRelay {
  private queue: MessageQueue;
  private wsServer: WSServer;
  private config: ChatConfig;
  private processing = false;
  private activeProvider: Provider;
  private activeModel: string;
  private systemPrompt: string = DEFAULT_SYSTEM_PROMPT;
  private temperature: number = 0.7;
  private topP: number = 0.9;
  private maxTokens: number = 16384; // Maxed out for full responses
  private stateManager!: SceneStateManager;

  constructor(queue: MessageQueue, wsServer: WSServer, config: ChatConfig) {
    this.queue = queue;
    this.wsServer = wsServer;
    this.config = config;

    // If the configured provider has no key, fall back to the first available one.
    const preferred = config.provider ?? 'openai';
    if (this.hasKey(preferred)) {
      this.activeProvider = preferred;
    } else {
      const fallback = this.firstAvailableProvider();
      this.activeProvider = fallback ?? preferred;
      if (fallback && fallback !== preferred) {
        console.error(`[ChatRelay] ${preferred} has no API key — falling back to ${fallback}`);
      }
    }
    this.activeModel = this.resolveModel(this.activeProvider);
  }

  /** Check whether a provider has an API key configured. */
  private hasKey(provider: Provider): boolean {
    const keyMap: Record<Provider, boolean> = {
      openai: !!this.config.openaiKey,
      anthropic: !!this.config.anthropicKey,
      google: !!this.config.googleKey,
      mistral: !!this.config.mistralKey,
      groq: !!this.config.groqKey,
      xai: !!this.config.xaiKey,
      cohere: !!this.config.cohereKey,
      together: !!this.config.togetherKey,
      ollama: !!this.config.ollamaBaseUrl,
    };
    return keyMap[provider] ?? false;
  }

  /** Return the first provider that has a key, or undefined. */
  private firstAvailableProvider(): Provider | undefined {
    const all: Provider[] = ['openai', 'anthropic', 'google', 'mistral', 'groq', 'xai', 'cohere', 'together', 'ollama'];
    return all.find((p) => this.hasKey(p));
  }

  /** Resolve the model string for a given provider from config or catalog default. */
  private resolveModel(provider: Provider): string {
    const map: Record<Provider, string | undefined> = {
      openai: this.config.openaiModel,
      anthropic: this.config.anthropicModel,
      google: this.config.googleModel,
      mistral: this.config.mistralModel,
      groq: this.config.groqModel,
      xai: this.config.xaiModel,
      cohere: this.config.cohereModel,
      together: this.config.togetherModel,
      ollama: this.config.ollamaModel,
    };
    return map[provider] ?? PROVIDER_CATALOG[provider].defaultModel;
  }

  /** Inject the SceneStateManager so commands can modify the scene. */
  setStateManager(sm: SceneStateManager): void {
    this.stateManager = sm;
  }

  /** Switch provider and/or model at runtime. */
  switchProvider(provider: Provider, model?: string): void {
    this.activeProvider = provider;
    this.activeModel = model ?? this.resolveModel(provider);
    console.error(`[ChatRelay] Switched to ${provider} / ${this.activeModel}`);
  }

  /** Get the current system prompt. */
  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  /** Update the system prompt at runtime (from the client UI). */
  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
    console.error(`[ChatRelay] System prompt updated (${prompt.length} chars)`);
  }

  /** Update temperature at runtime (from the client UI). */
  setTemperature(temp: number): void {
    this.temperature = Math.max(0, Math.min(2, temp)); // Clamp 0-2
    console.error(`[ChatRelay] Temperature set to ${this.temperature.toFixed(1)}`);
  }

  /** Update top_p at runtime (from the client UI). */
  setTopP(topP: number): void {
    this.topP = Math.max(0.1, Math.min(1, topP)); // Clamp 0.1-1.0
    console.error(`[ChatRelay] Top-p set to ${this.topP.toFixed(1)}`);
  }

  /** Get current temperature. */
  getTemperature(): number {
    return this.temperature;
  }

  /** Get current top_p. */
  getTopP(): number {
    return this.topP;
  }

  /** Get max tokens (always maxed out for full responses). */
  getMaxTokens(): number {
    return this.maxTokens;
  }

  /** Return the list of providers that have an API key (or are keyless like ollama). */
  getAvailableProviders(): ProviderInfo[] {
    const available: ProviderInfo[] = [];
    for (const [id, info] of Object.entries(PROVIDER_CATALOG)) {
      if (this.hasKey(id as Provider)) {
        available.push({ id: id as Provider, label: info.label, models: info.models, defaultModel: info.defaultModel });
      }
    }
    return available;
  }

  getActiveProvider(): Provider {
    return this.activeProvider;
  }

  getActiveModel(): string {
    return this.activeModel;
  }

  /** Add a user-sent in-world message to the queue. */
  enqueue(msg: PendingMessage): void {
    this.queue.push(msg);
    if (this.isDirectMode()) {
      this.processNext().catch((err) =>
        console.error('[ChatRelay] Direct mode error:', err),
      );
    }
  }

  /** Whether the server has its own AI key (direct mode). */
  isDirectMode(): boolean {
    return this.hasKey(this.activeProvider);
  }

  /** MCP tool: return all queued messages without removing them. */
  getPending(): PendingMessage[] {
    return this.queue.getAll();
  }

  /** MCP tool: clear all queued messages. */
  clearPending(): void {
    this.queue.clear();
  }

  /** MCP tool: send an AI reply to the browser(s). */
  sendAIReply(message: string, sessionId?: string): void {
    this.wsServer.sendAIReply(message, sessionId);
    const all = this.queue.getAll();
    const idx = all.findIndex((m) => !sessionId || m.sessionId === sessionId);
    if (idx !== -1) {
      const updated = all.filter((_, i) => i !== idx);
      this.queue.clear();
      updated.forEach((m) => this.queue.push(m));
    }
  }

  // ─── Private: direct AI mode ──────────────────────────────────────────────

  /** Build a compact summary of the current scene state for AI context. */
  private buildSceneContext(): string | null {
    if (!this.stateManager) return null;
    const state = this.stateManager.getState();
    const parts: string[] = ['[CURRENT SCENE STATE]'];

    // Objects
    const objs = Object.values(state.objects);
    if (objs.length > 0) {
      parts.push(`Objects (${objs.length}):`);
      for (const o of objs) {
        const pos = `(${o.position.x},${o.position.y},${o.position.z})`;
        const mat = o.material ? ` color=${o.material.color ?? '?'}` : '';
        const parent = o.parentId ? ` parent=${o.parentId}` : '';
        parts.push(`  ${o.id}: ${o.type} at ${pos}${mat}${parent}`);
      }
    } else {
      parts.push('Objects: (none)');
    }

    // Lights
    const lights = Object.values(state.lights);
    if (lights.length > 0) {
      parts.push(`Lights (${lights.length}):`);
      for (const l of lights) {
        parts.push(`  ${l.id}: ${l.lightType} color=${l.color} intensity=${l.intensity}`);
      }
    }

    // Particles
    const particles = Object.values(state.particles ?? {});
    if (particles.length > 0) {
      parts.push(`Particles (${particles.length}):`);
      for (const p of particles) {
        parts.push(`  ${p.id}: count=${p.count} color=${p.color}`);
      }
    }

    // Camera
    const cam = state.camera;
    parts.push(`Camera: pos=(${cam.position.x},${cam.position.y},${cam.position.z}) target=(${cam.target.x},${cam.target.y},${cam.target.z}) fov=${cam.fov ?? 60}`);

    // Environment
    const env = state.environment;
    const envParts: string[] = [];
    if (env.background) envParts.push(`bg=${env.background}`);
    if (env.fog) envParts.push(`fog=${env.fog.color}`);
    if (env.bloom) envParts.push(`bloom=${env.bloom.strength}`);
    if (env.toneMapping) envParts.push(`tone=${env.toneMapping}`);
    parts.push(`Environment: ${envParts.join(' ') || '(default)'}`);

    // Behaviors
    const behaviors = Object.values((state as any).behaviors ?? {});
    if (behaviors.length > 0) {
      parts.push(`Active behaviors (${behaviors.length}):`);
      for (const b of behaviors as any[]) {
        parts.push(`  ${b.objectId}: ${b.type}`);
      }
    }

    return parts.join('\n');
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;
    const msg = this.queue.peek();
    if (!msg) return;

    this.processing = true;
    try {
      // Build scene context so the AI knows what's in the scene
      const sceneContext = this.buildSceneContext();
      const augmentedMessage = sceneContext
        ? `${sceneContext}\n\nUser request: ${msg.message}`
        : msg.message;

      const rawReply = await this.callAI(augmentedMessage);
      this.queue.shift();

      // Parse and execute any scene commands from the AI response
      const { text, commands } = this.parseAIResponse(rawReply);
      if (commands.length > 0) {
        this.executeCommands(commands);
        console.error(`[ChatRelay] Executed ${commands.length} scene command(s)`);
      }

      // Send the full AI response (including code blocks) so the user sees the commands
      this.wsServer.sendAIReply(rawReply, msg.sessionId);
    } catch (err) {
      console.error('[ChatRelay] AI call failed:', err);
      this.queue.shift();
      const errMsg = err instanceof Error ? err.message : String(err);
      this.wsServer.sendAIReply(`⚠️ AI error: ${errMsg}`, msg.sessionId);
    } finally {
      this.processing = false;
      if (this.queue.size() > 0) {
        setTimeout(() => {
          this.processNext().catch(console.error);
        }, 200);
      }
    }
  }

  private async callAI(userMessage: string): Promise<string> {
    switch (this.activeProvider) {
      case 'openai':    return this.callOpenAI(userMessage);
      case 'anthropic': return this.callAnthropic(userMessage);
      case 'google':    return this.callGoogle(userMessage);
      case 'mistral':   return this.callOpenAICompat(userMessage, this.config.mistralKey!, 'https://api.mistral.ai/v1', this.activeModel);
      case 'groq':      return this.callOpenAICompat(userMessage, this.config.groqKey!, 'https://api.groq.com/openai/v1', this.activeModel);
      case 'xai':       return this.callOpenAICompat(userMessage, this.config.xaiKey!, 'https://api.x.ai/v1', this.activeModel);
      case 'cohere':    return this.callOpenAICompat(userMessage, this.config.cohereKey!, 'https://api.cohere.com/compatibility/v1', this.activeModel);
      case 'together':  return this.callOpenAICompat(userMessage, this.config.togetherKey!, 'https://api.together.xyz/v1', this.activeModel);
      case 'ollama':    return this.callOllama(userMessage);
      default:          throw new Error(`No AI provider configured for "${this.activeProvider}"`);
    }
  }

  private async callOpenAI(userMessage: string): Promise<string> {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: this.config.openaiKey });
    const resp = await client.chat.completions.create({
      model: this.activeModel,
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: this.temperature,
      top_p: this.topP,
      max_tokens: this.maxTokens,
    });
    return resp.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.';
  }

  private async callAnthropic(userMessage: string): Promise<string> {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: this.config.anthropicKey });
    const msg = await client.messages.create({
      model: this.activeModel,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      top_p: this.topP,
      system: this.systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    const block = msg.content[0];
    return block && block.type === 'text'
      ? block.text
      : 'Sorry, I could not generate a response.';
  }

  /** OpenAI-compatible endpoint — works for Mistral, Groq, xAI, Cohere, Together. */
  private async callOpenAICompat(userMessage: string, apiKey: string, baseURL: string, model: string): Promise<string> {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey, baseURL });
    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: this.temperature,
      top_p: this.topP,
      max_tokens: this.maxTokens,
    });
    return resp.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.';
  }

  /** Google Gemini via the REST-based generateContent API (no extra SDK needed). */
  private async callGoogle(userMessage: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.activeModel}:generateContent?key=${this.config.googleKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: this.systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: {
          maxOutputTokens: this.maxTokens,
          temperature: this.temperature,
          topP: this.topP,
        },
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Google API ${resp.status}: ${body}`);
    }
    const data = await resp.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sorry, I could not generate a response.';
  }

  /** Ollama local inference via its REST API. */
  private async callOllama(userMessage: string): Promise<string> {
    const base = this.config.ollamaBaseUrl ?? 'http://localhost:11434';
    const resp = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.activeModel,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        options: {
          temperature: this.temperature,
          top_p: this.topP,
          num_predict: this.maxTokens,
        },
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Ollama ${resp.status}: ${body}`);
    }
    const data = await resp.json() as { message?: { content?: string } };
    return data.message?.content ?? 'Sorry, I could not generate a response.';
  }

  // ─── Response parsing & scene command execution ─────────────────────────

  /** Extract text and JSON command blocks from the AI response. */
  private parseAIResponse(raw: string): { text: string; commands: Record<string, unknown>[] } {
    const commands: Record<string, unknown>[] = [];
    // Match ```json ... ``` fenced code blocks
    const fenceRe = /```(?:json)?\s*\n?([\s\S]*?)```/gi;
    let text = raw;
    let match: RegExpExecArray | null;

    while ((match = fenceRe.exec(raw)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed)) {
          commands.push(...parsed);
        } else if (typeof parsed === 'object' && parsed !== null) {
          commands.push(parsed);
        }
      } catch {
        // Not valid JSON — skip
      }
    }

    // Remove the JSON blocks from the text shown to the user
    text = text.replace(fenceRe, '').trim();

    // Also try to parse bare JSON arrays (no fences) if no commands found
    if (commands.length === 0) {
      const bareRe = /\[\s*\{[\s\S]*?\}\s*\]/g;
      while ((match = bareRe.exec(raw)) !== null) {
        try {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed)) {
            commands.push(...parsed);
            text = text.replace(match[0], '').trim();
          }
        } catch {
          // skip
        }
      }
    }

    return { text, commands };
  }

  /** Execute parsed scene commands through the SceneStateManager and broadcast to clients. */
  private executeCommands(commands: Record<string, unknown>[]): void {
    if (!this.stateManager) {
      console.error('[ChatRelay] No stateManager — cannot execute commands');
      return;
    }

    const sm = this.stateManager;
    const ws = this.wsServer;

    for (const cmd of commands) {
      const action = cmd['action'] as string;
      if (!action) continue;

      try {
        switch (action) {
          case 'createObject': {
            const obj = sm.createObject(cmd as Parameters<typeof sm.createObject>[0]);
            ws.sendCommand({ action: 'createObject', commandId: uuidv4(), ...obj });
            break;
          }
          case 'updateObject': {
            const { id, ...props } = cmd as { id: string; [k: string]: unknown };
            const obj = sm.updateObject(id, props);
            if (obj) ws.sendCommand({ action: 'updateObject', commandId: uuidv4(), ...obj });
            break;
          }
          case 'deleteObject': {
            const id = cmd['id'] as string;
            if (sm.deleteObject(id)) ws.sendCommand({ action: 'deleteObject', commandId: uuidv4(), id });
            break;
          }
          case 'createLight': {
            const light = sm.createLight(cmd as Parameters<typeof sm.createLight>[0]);
            ws.sendCommand({ action: 'createLight', commandId: uuidv4(), ...light });
            break;
          }
          case 'updateLight': {
            const { id, ...props } = cmd as { id: string; [k: string]: unknown };
            const light = sm.updateLight(id, props);
            if (light) ws.sendCommand({ action: 'updateLight', commandId: uuidv4(), ...light });
            break;
          }
          case 'deleteLight': {
            const id = cmd['id'] as string;
            if (sm.deleteLight(id)) ws.sendCommand({ action: 'deleteLight', commandId: uuidv4(), id });
            break;
          }
          case 'setCamera': {
            const cam = sm.setCamera(cmd as Parameters<typeof sm.setCamera>[0]);
            ws.sendCommand({ action: 'setCamera', commandId: uuidv4(), ...cam });
            break;
          }
          case 'setEnvironment': {
            const env = sm.setEnvironment(cmd as Parameters<typeof sm.setEnvironment>[0]);
            ws.sendCommand({ action: 'setEnvironment', commandId: uuidv4(), ...env });
            break;
          }
          case 'animateObject': {
            const id = cmd['id'] as string;
            if (sm.getObject(id)) {
              // Persist animation so it survives page reloads
              sm.addAnimation({
                id,
                property: cmd['property'] as 'position' | 'rotation' | 'scale',
                to: cmd['to'] as Vec3,
                duration: (cmd['duration'] as number) ?? 1,
                easing: (cmd['easing'] as string) ?? 'linear',
                loop: (cmd['loop'] as boolean) ?? false,
              });
              ws.sendCommand({ action: 'animateObject', commandId: uuidv4(), ...cmd });
            }
            break;
          }
          case 'clearScene': {
            sm.clearScene();
            const state = sm.getState();
            ws.sendCommand({ action: 'loadScene', commandId: uuidv4(), state });
            break;
          }
          case 'createParticles': {
            const p = sm.createParticles(cmd as Parameters<typeof sm.createParticles>[0]);
            ws.sendCommand({ action: 'createParticles', commandId: uuidv4(), ...p });
            break;
          }
          case 'updateParticles': {
            const { id, ...props } = cmd as { id: string; [k: string]: unknown };
            const p = sm.updateParticles(id, props);
            if (p) ws.sendCommand({ action: 'updateParticles', commandId: uuidv4(), ...p });
            break;
          }
          case 'deleteParticles': {
            const id = cmd['id'] as string;
            if (sm.deleteParticles(id)) ws.sendCommand({ action: 'deleteParticles', commandId: uuidv4(), id });
            break;
          }
          case 'flyToObject': {
            ws.sendCommand({ action: 'flyToObject', commandId: uuidv4(), ...cmd });
            break;
          }
          case 'stopAnimation': {
            const id = cmd['id'] as string;
            sm.removeAnimation(id);
            ws.sendCommand({ action: 'stopAnimation', commandId: uuidv4(), id });
            break;
          }
          case 'executeScript': {
            const code = cmd['code'] as string;
            if (code) {
              ws.requestScript(code).catch(e => console.error('[ChatRelay] Script error:', e));
            }
            break;
          }
          case 'addBehavior': {
            sm.addBehavior(cmd as Parameters<typeof sm.addBehavior>[0]);
            ws.sendCommand({ action: 'addBehavior', commandId: uuidv4(), ...cmd });
            break;
          }
          case 'removeBehavior': {
            const id = cmd['id'] as string;
            sm.removeBehavior(id);
            ws.sendCommand({ action: 'removeBehavior', commandId: uuidv4(), id });
            break;
          }
          default:
            console.error(`[ChatRelay] Unknown command action: ${action}`);
        }
      } catch (e) {
        console.error(`[ChatRelay] Error executing ${action}:`, e);
      }
    }
  }
}
