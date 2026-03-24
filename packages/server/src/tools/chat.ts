import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const chatTools: Tool[] = [
  {
    name: 'getPendingUserMessages',
    description:
      'Return any in-world chat messages the user has typed from inside the 3D environment. ' +
      'Call this at the start of every turn to check for user input from the canvas.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'sendChatMessage',
    description: 'Display a message in the in-world chat overlay visible to the user inside the 3D view.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The message text to display' },
        sessionId: {
          type: 'string',
          description: 'Optional — target a specific browser session. Omit to broadcast.',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'clearPendingMessages',
    description: 'Clear all queued in-world user messages (useful after processing a batch).',
    inputSchema: { type: 'object', properties: {} },
  },
];
