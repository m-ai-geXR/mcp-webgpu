import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const environmentTools: Tool[] = [
  {
    name: 'setEnvironment',
    description: 'Configure the scene environment: background, fog, tone mapping, shadows, and post-processing effects.',
    inputSchema: {
      type: 'object',
      properties: {
        background: { type: 'string', description: 'CSS color or HDRI URL for the background' },
        fog: {
          type: 'object',
          properties: {
            color: { type: 'string' },
            near: { type: 'number' },
            far: { type: 'number' },
          },
          description: 'Fog settings. Pass null to disable.',
        },
        shadows: { type: 'boolean', description: 'Enable/disable shadow rendering' },
        toneMapping: {
          type: 'string',
          enum: ['none', 'linear', 'reinhard', 'aces'],
          description: 'Tone mapping algorithm',
        },
        exposure: { type: 'number', description: 'Renderer exposure (default 1.0)' },
        bloom: {
          type: 'object',
          properties: {
            strength: { type: 'number', description: 'Bloom intensity 0-3 (default 0.4). Use 1.0-2.5 for neon/vaporwave.' },
            radius: { type: 'number', description: 'Bloom spread 0-1 (default 0.4).' },
            threshold: { type: 'number', description: 'Brightness threshold 0-1 (default 0.85). Lower = more glow.' },
          },
          description: 'Bloom (glow) post-processing. Controls how bright/emissive surfaces bleed light.',
        },
        chromaticAberration: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'RGB channel offset 0-0.05 (default 0). Try 0.01-0.03 for stylized looks.' },
          },
          description: 'Chromatic aberration: splits RGB channels for a lens distortion look.',
        },
        vignette: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Vignette start distance from center 0-2 (default 1).' },
            darkness: { type: 'number', description: 'Edge darkness 0-2 (default 1). Higher = darker edges.' },
          },
          description: 'Vignette: darkens screen edges for a cinematic look.',
        },
      },
    },
  },
];
