import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const lightTools: Tool[] = [
  {
    name: 'createLight',
    description: 'Add a light to the scene.',
    inputSchema: {
      type: 'object',
      properties: {
        lightType: {
          type: 'string',
          enum: ['ambient', 'directional', 'point', 'spot', 'hemisphere'],
          description: 'Type of light',
        },
        id: { type: 'string', description: 'Optional id. Auto-generated if omitted.' },
        color: { type: 'string', description: 'Hex color. Default #ffffff.' },
        intensity: { type: 'number', description: 'Light intensity. Default 1.0.' },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' },
          },
          description: 'Light world position (not needed for ambient)',
        },
        target: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' },
          },
          description: 'Directional/spot target position',
        },
        castShadow: { type: 'boolean', description: 'Enable shadow casting' },
        angle: { type: 'number', description: 'Spot light cone angle in radians' },
        penumbra: { type: 'number', minimum: 0, maximum: 1, description: 'Spot light edge softness' },
        distance: { type: 'number', description: 'Point/spot attenuation distance' },
        groundColor: { type: 'string', description: 'Hemisphere ground color' },
      },
      required: ['lightType'],
    },
  },
  {
    name: 'updateLight',
    description: 'Update an existing light by id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        color: { type: 'string' },
        intensity: { type: 'number' },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' },
          },
        },
        castShadow: { type: 'boolean' },
      },
      required: ['id'],
    },
  },
  {
    name: 'deleteLight',
    description: 'Remove a light from the scene by id.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
];
