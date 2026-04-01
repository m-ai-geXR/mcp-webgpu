import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const vec3Schema = {
  type: 'object' as const,
  properties: {
    x: { type: 'number' as const },
    y: { type: 'number' as const },
    z: { type: 'number' as const },
  },
};

export const particleTools: Tool[] = [
  {
    name: 'createParticles',
    description:
      'Create a particle system (stars, dust, sparks, snow, fire embers, laser trails). ' +
      'Uses GPU-efficient point sprites with optional drift animation and twinkle.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Optional custom id. Auto-generated if omitted.' },
        position: { ...vec3Schema, description: 'Center position of the particle volume.' },
        count: { type: 'number', description: 'Number of particles (default 500). Up to 10000.' },
        spread: { ...vec3Schema, description: 'Bounding box half-extents {x,y,z} particles spawn within.' },
        size: { type: 'number', description: 'Particle size in world units (default 0.1).' },
        color: { type: 'string', description: 'Hex color e.g. "#ffffff".' },
        emissive: { type: 'string', description: 'Emissive/glow color. Set to same as color for self-illuminated particles.' },
        emissiveIntensity: { type: 'number', description: 'Glow intensity (default 1). Higher = brighter glow with bloom.' },
        opacity: { type: 'number', minimum: 0, maximum: 1, description: 'Particle opacity (default 0.8).' },
        speed: { type: 'number', description: 'Drift speed multiplier (default 0). 0 = static.' },
        drift: { ...vec3Schema, description: 'Normalized drift direction {x,y,z}. Particles move this way * speed.' },
        sizeAttenuation: { type: 'boolean', description: 'Whether particles shrink with distance (default true).' },
        twinkle: { type: 'boolean', description: 'Randomize alpha each frame for star-like shimmer (default false).' },
        blending: { type: 'string', enum: ['additive', 'normal'], description: 'Blend mode. "additive" for glowing particles (default).' },
      },
      required: ['count', 'spread'],
    },
  },
  {
    name: 'updateParticles',
    description: 'Update properties of an existing particle system.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Particle system id.' },
        position: vec3Schema,
        color: { type: 'string' },
        size: { type: 'number' },
        opacity: { type: 'number' },
        speed: { type: 'number' },
        drift: vec3Schema,
        twinkle: { type: 'boolean' },
      },
      required: ['id'],
    },
  },
  {
    name: 'deleteParticles',
    description: 'Remove a particle system from the scene.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
];
