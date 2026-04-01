import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const animationTools: Tool[] = [
  {
    name: 'animateObject',
    description:
      'Animate an object property to a target value. Supports transforms (position, rotation, scale) ' +
      'and material properties (emissiveIntensity, opacity, color) for pulsing glow, fading, color shifts.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Object id to animate' },
        property: {
          type: 'string',
          enum: ['position', 'rotation', 'scale', 'material.emissiveIntensity', 'material.opacity', 'material.color'],
          description: 'Which property to animate. Use material.* for glow/fade effects.',
        },
        to: {
          description: 'Target value. {x,y,z} for transforms, number for intensity/opacity, hex string for color.',
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
