import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const sceneTools: Tool[] = [
  {
    name: 'clearScene',
    description: 'Remove all user-created objects from the scene and reset default lighting.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'loadScene',
    description: 'Replace the entire scene with a previously exported scene JSON.',
    inputSchema: {
      type: 'object',
      properties: {
        sceneJson: { type: 'string', description: 'JSON string from exportScene' },
      },
      required: ['sceneJson'],
    },
  },
  {
    name: 'exportScene',
    description: 'Export the current scene as a JSON string (can be stored and re-loaded later).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'undo',
    description: 'Undo the last scene change (up to 20 levels).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'redo',
    description: 'Redo a previously undone scene change.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'takeScreenshot',
    description:
      'Capture the current 3D viewport and return a base-64 PNG data URL. Requires a browser client to be connected.',
    inputSchema: { type: 'object', properties: {} },
  },
];
