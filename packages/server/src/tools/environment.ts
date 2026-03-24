import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const environmentTools: Tool[] = [
  {
    name: 'setEnvironment',
    description: 'Configure the scene environment: background, fog, tone mapping, shadows.',
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
      },
    },
  },
];
