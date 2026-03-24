import type { ToolContext } from './toolHandler.js';

const resources = [
  {
    uri: 'maige-3d://scene/state',
    name: 'Current Scene State',
    description: 'Live JSON snapshot of all objects, lights, camera, and environment.',
    mimeType: 'application/json',
  },
  {
    uri: 'maige-3d://server/sessions',
    name: 'Connected Browser Sessions',
    description: 'List of currently connected 3D browser clients.',
    mimeType: 'application/json',
  },
];

export function handleResource(
  action: 'list' | 'read',
  params: { uri?: string } | null,
  ctx: ToolContext,
) {
  if (action === 'list') {
    return { resources };
  }

  const uri = params?.uri;

  if (uri === 'maige-3d://scene/state') {
    const state = ctx.stateManager.getState();
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(state, null, 2),
        },
      ],
    };
  }

  if (uri === 'maige-3d://server/sessions') {
    const sessions = ctx.wsServer.getConnectedSessions();
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(sessions, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource URI: "${uri}"`);
}
