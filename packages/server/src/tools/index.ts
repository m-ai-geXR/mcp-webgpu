import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { objectTools } from './objects.js';
import { lightTools } from './lights.js';
import { cameraTools } from './camera.js';
import { animationTools } from './animation.js';
import { environmentTools } from './environment.js';
import { sceneTools } from './scene.js';
import { chatTools } from './chat.js';

export const allTools: Tool[] = [
  ...objectTools,
  ...lightTools,
  ...cameraTools,
  ...animationTools,
  ...environmentTools,
  ...sceneTools,
  ...chatTools,
];
