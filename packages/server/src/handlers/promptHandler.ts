const prompts = [
  {
    name: '3d-world-assistant',
    description:
      'System context for AI assistants working with the maige-3d-mcp server. ' +
      'Instructs the AI how to use scene tools and handle in-world chat.',
    arguments: [],
  },
  {
    name: 'framework-guide',
    description: 'Per-framework tips for working with the connected 3D client.',
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
You are an AI assistant managing a live 3D scene via the maige-3d-mcp server.

## Workflow — follow this every turn

1. **Check for user messages** — call \`getPendingUserMessages\` at the start of EVERY turn
   to see if the user has typed something from inside the 3D canvas overlay.
2. **Understand the scene** — call \`getSceneState\` before making changes so you know
   existing object ids and positions.
3. **Make changes** — use the available scene tools to create/update/delete objects,
   lights, camera, environment.
4. **Reply in-world** — after making changes, call \`sendChatMessage\` to let the user
   know what you did (keep it concise, 1-2 sentences).
5. **Undo if asked** — if the user says "undo" or "revert", call the \`undo\` tool.

## Object ids
Always use the id returned by \`createObject\` or found in \`getSceneState\` when
targeting existing objects. Never guess ids.

## Units and coordinates
- Position and scale use Three.js world units (metres by convention).
- Rotation is in degrees ({x, y, z}).
- Y is up.

## Coordination
- Prefer small incremental changes over full scene rebuilds.
- Announce what you are about to do in the in-world chat before doing it if the
  change is significant.
`;

const FRAMEWORK_GUIDES: Record<string, string> = {
  threejs: `
## Three.js tips
- Supported geometry types: box, sphere, cylinder, cone, torus, plane, capsule, gltf.
- Materials: standard (PBR), phong, toon, basic.
- Animations are handled by the client via requestAnimationFrame tweening.
  `,
  aframe: `
## A-Frame tips
- Position/rotation/scale are sent as {x,y,z} from the server; the adapter converts
  them to A-Frame's "x y z" string format automatically.
- Custom A-Frame components are registered client-side for advanced effects.
  `,
  babylonjs: `
## Babylon.js tips
- Rotation is stored in degrees server-side; the BabylonAdapter converts to radians.
- Use standard geometry types; Babylon.js MeshBuilder is used under the hood.
  `,
  r3f: `
## React Three Fiber tips
- The R3F client manages scene state in a Zustand store.
- Position/rotation/scale are sent as {x,y,z}; the R3FAdapter converts to tuples.
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
