import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const scriptTools: Tool[] = [
  {
    name: 'executeScript',
    description:
      'Execute arbitrary JavaScript code in the connected browser scene context. ' +
      'The code runs inside an async function with access to: scene (THREE.Scene), camera, renderer, controls, and a helpers object. ' +
      'Return a value to send it back. Use this for advanced effects the other tools cannot achieve — custom shaders, complex geometry, procedural generation, physics, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description:
            'JavaScript code to execute. Has access to `scene`, `camera`, `renderer`, `controls`, and `THREE` (the Three.js namespace). ' +
            'Example: `const geo = new THREE.TorusKnotGeometry(1,0.3,128,16); const mat = new THREE.MeshStandardMaterial({color:"#ff0000"}); const m = new THREE.Mesh(geo,mat); scene.add(m); return "done";`',
        },
      },
      required: ['code'],
    },
  },
];
