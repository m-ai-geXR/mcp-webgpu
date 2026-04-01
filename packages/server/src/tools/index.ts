import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { objectTools } from './objects.js';
import { lightTools } from './lights.js';
import { cameraTools } from './camera.js';
import { animationTools } from './animation.js';
import { environmentTools } from './environment.js';
import { sceneTools } from './scene.js';
import { chatTools } from './chat.js';
import { particleTools } from './particles.js';
import { scriptTools } from './script.js';
import { behaviorTools } from './behaviors.js';

export const allTools: Tool[] = [
  ...objectTools,
  ...lightTools,
  ...cameraTools,
  ...animationTools,
  ...environmentTools,
  ...particleTools,
  ...scriptTools,
  ...behaviorTools,
  ...sceneTools,
  ...chatTools,
];
