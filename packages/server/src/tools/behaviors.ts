import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const behaviorTools: Tool[] = [
  {
    name: 'addBehavior',
    description:
      'Attach a continuous frame-tick behavior to an object. ' +
      'Behaviors run every frame until removed. Types: ' +
      'spin (rotate continuously), bob (oscillate up/down), ' +
      'orbit (circle around a point), lookAt (always face camera), ' +
      'pulse (rhythmic scale breathing).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Unique behavior id' },
        objectId: { type: 'string', description: 'ID of the object to attach to' },
        type: {
          type: 'string',
          enum: ['spin', 'bob', 'orbit', 'lookAt', 'pulse'],
          description: 'Behavior type',
        },
        params: {
          type: 'object',
          description:
            'Type-specific parameters. ' +
            'spin: {axis:"x"|"y"|"z", speed:number(rad/s, default 1)}. ' +
            'bob: {axis:"x"|"y"|"z", amplitude:number(default 0.5), speed:number(default 1)}. ' +
            'orbit: {center:{x,y,z}, radius:number(default 2), speed:number(default 1), axis:"x"|"y"|"z"(default "y")}. ' +
            'lookAt: {target:"camera"|objectId}. ' +
            'pulse: {min:number(default 0.8), max:number(default 1.2), speed:number(default 1)}.',
        },
      },
      required: ['id', 'objectId', 'type'],
    },
  },
  {
    name: 'removeBehavior',
    description: 'Remove a behavior by its ID, stopping its frame-tick effect.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the behavior to remove' },
      },
      required: ['id'],
    },
  },
];
