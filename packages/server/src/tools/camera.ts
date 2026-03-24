import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const cameraTools: Tool[] = [
  {
    name: 'setCamera',
    description: 'Set the camera position and look-at target.',
    inputSchema: {
      type: 'object',
      properties: {
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' },
          },
          description: 'Camera world position',
        },
        target: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            z: { type: 'number' },
          },
          description: 'Point the camera looks at',
        },
        fov: { type: 'number', description: 'Vertical field of view in degrees' },
      },
    },
  },
  {
    name: 'flyToObject',
    description: 'Smoothly move the camera to look at an object.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Id of the object to fly to' },
        distance: { type: 'number', description: 'Distance to maintain from the object (default 3)' },
        duration: { type: 'number', description: 'Animation duration in seconds (default 1)' },
      },
      required: ['id'],
    },
  },
];
