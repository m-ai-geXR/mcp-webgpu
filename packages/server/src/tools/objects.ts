import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const vec3Schema = {
  type: 'object' as const,
  properties: {
    x: { type: 'number' as const },
    y: { type: 'number' as const },
    z: { type: 'number' as const },
  },
};

const materialSchema = {
  type: 'object' as const,
  properties: {
    type: { type: 'string' as const, enum: ['standard', 'phong', 'toon', 'basic'] },
    color: { type: 'string' as const, description: 'Hex color e.g. #ff4400' },
    metalness: { type: 'number' as const, minimum: 0, maximum: 1 },
    roughness: { type: 'number' as const, minimum: 0, maximum: 1 },
    opacity: { type: 'number' as const, minimum: 0, maximum: 1 },
    transparent: { type: 'boolean' as const },
    wireframe: { type: 'boolean' as const },
    emissive: { type: 'string' as const },
    emissiveIntensity: { type: 'number' as const, minimum: 0 },
    textureUrl: { type: 'string' as const },
  },
};

export const objectTools: Tool[] = [
  {
    name: 'createObject',
    description:
      'Add a 3D object to the live scene. Returns the assigned id. Always call getSceneState first to understand what already exists.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane', 'capsule', 'gltf'],
          description: 'Geometry type',
        },
        id: { type: 'string', description: 'Optional custom id. Auto-generated if omitted.' },
        position: { ...vec3Schema, description: 'World position {x,y,z}. Default: origin.' },
        rotation: { ...vec3Schema, description: 'Euler rotation in degrees {x,y,z}.' },
        scale: { ...vec3Schema, description: 'Scale {x,y,z}. Default: 1,1,1.' },
        material: materialSchema,
        width: { type: 'number', description: 'Box width (default 1)' },
        height: { type: 'number', description: 'Box/cylinder height (default 1)' },
        depth: { type: 'number', description: 'Box depth (default 1)' },
        radius: { type: 'number', description: 'Sphere/cylinder/torus radius (default 0.5)' },
        url: { type: 'string', description: 'GLTF model URL (required for type=gltf)' },
      },
      required: ['type'],
    },
  },
  {
    name: 'updateObject',
    description: 'Update any properties of an existing 3D object. Supports partial updates.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        position: vec3Schema,
        rotation: { ...vec3Schema, description: 'Degrees' },
        scale: vec3Schema,
        material: materialSchema,
        visible: { type: 'boolean' },
      },
      required: ['id'],
    },
  },
  {
    name: 'deleteObject',
    description: 'Remove a 3D object from the scene by id.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'cloneObject',
    description: 'Duplicate an object with an optional position offset.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Id of the object to clone' },
        newId: { type: 'string', description: 'Id for the clone. Auto-generated if omitted.' },
        offset: { ...vec3Schema, description: 'Offset added to cloned position' },
      },
      required: ['id'],
    },
  },
  {
    name: 'getObject',
    description: 'Get properties of a single scene object by id.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'getSceneState',
    description:
      'Get the full current scene state: all objects, lights, camera, and environment. Call this first before making any changes.',
    inputSchema: { type: 'object', properties: {} },
  },
];
