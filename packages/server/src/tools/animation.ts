import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const animationTools: Tool[] = [
  {
    name: 'animateObject',
    description: 'Animate an object property (position, rotation, or scale) to a target value.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Object id to animate' },
        property: {
          type: 'string',
          enum: ['position', 'rotation', 'scale'],
          description: 'Which property to animate',
        },
        to: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' },
          },
          description: 'Target value {x, y, z}',
        },
        duration: { type: 'number', description: 'Duration in seconds (default 1)' },
        easing: {
          type: 'string',
          enum: ['linear', 'easeIn', 'easeOut', 'easeInOut'],
          description: 'Easing function (default linear)',
        },
        loop: { type: 'boolean', description: 'Loop the animation (default false)' },
      },
      required: ['id', 'property', 'to'],
    },
  },
  {
    name: 'stopAnimation',
    description: 'Stop any running animation on an object.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
];
