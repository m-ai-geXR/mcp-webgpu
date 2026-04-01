// Shared client-side types (matches server types.ts)

export interface Vec3 { x: number; y: number; z: number }

export interface MaterialDef {
  type?: 'standard' | 'phong' | 'toon' | 'basic';
  color?: string;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  transparent?: boolean;
  wireframe?: boolean;
  textureUrl?: string;
  emissive?: string;
  emissiveIntensity?: number;
}

export interface SceneObject {
  id: string;
  type: string;
  position: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  material?: MaterialDef;
  visible?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  url?: string;
  parentId?: string;
  points?: Vec3[];
  [key: string]: unknown;
}

export interface SceneLight {
  id: string;
  lightType: 'ambient' | 'directional' | 'point' | 'spot' | 'hemisphere';
  color: string;
  intensity: number;
  position?: Vec3;
  target?: Vec3;
  castShadow?: boolean;
  angle?: number;
  penumbra?: number;
  decay?: number;
  distance?: number;
  groundColor?: string;
}

export interface SceneCamera {
  position: Vec3;
  target: Vec3;
  fov?: number;
}

export interface EnvironmentDef {
  background?: string;
  fog?: { color: string; near: number; far: number };
  shadows?: boolean;
  bloom?: { strength?: number; radius?: number; threshold?: number };
  chromaticAberration?: { offset?: number };
  vignette?: { offset?: number; darkness?: number };
}

export interface ParticleDef {
  id: string;
  position?: Vec3;
  count?: number;
  spread?: Vec3;
  size?: number;
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  speed?: number;
  drift?: Vec3;
  sizeAttenuation?: boolean;
  twinkle?: boolean;
  blending?: 'additive' | 'normal';
}

export interface SceneState {
  objects: Record<string, SceneObject>;
  lights: Record<string, SceneLight>;
  camera: SceneCamera;
  environment: EnvironmentDef;
  animations?: Record<string, AnimationDef>;
  particles?: Record<string, ParticleDef>;
}

/** Persistent animation definition sent by server in loadScene. */
export interface AnimationDef {
  id: string;
  property: string;
  to: Vec3 | number | string;
  duration: number;  // seconds
  easing: string;
  loop: boolean;
  colorTo?: string;
}
