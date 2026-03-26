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
    name: 'saveScene',
    description: 'Save the current scene to a JSON file in the scenes/ folder. Returns the file path.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'File name (without extension). Defaults to a timestamp-based name.',
        },
      },
    },
  },
  {
    name: 'listScenes',
    description: 'List all saved scene JSON files in the scenes/ folder.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'loadSceneFromFile',
    description: 'Load a previously saved scene from the scenes/ folder by name.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'File name (with or without .json extension) from listScenes.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'exportStandaloneScene',
    description:
      'Export the current scene as a standalone HTML file that plays in any browser without a server. ' +
      'Includes all objects, lights, materials, animations, camera, and environment. No chat UI. ' +
      'Saved to the scenes/ folder. Returns the file path.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'File name (without .html extension). Defaults to a timestamp-based name.',
        },
      },
    },
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
