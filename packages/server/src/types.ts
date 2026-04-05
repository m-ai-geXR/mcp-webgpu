// ─── Shared types used by both the MCP server and browser clients ─────────────

export type Framework = 'threejs' | 'aframe' | 'babylonjs' | 'r3f';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface MaterialDef {
  type?: 'standard' | 'phong' | 'toon' | 'basic';
  color?: string;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  transparent?: boolean;
  wireframe?: boolean;
  textureUrl?: string;
  normalMapUrl?: string;
  roughnessMapUrl?: string;
  emissive?: string;
  emissiveIntensity?: number;
}

export interface SceneObject {
  id: string;
  /** box | sphere | cylinder | cone | torus | plane | capsule | gltf | line */
  type: string;
  position: Vec3;
  /** Euler rotation in degrees */
  rotation?: Vec3;
  scale?: Vec3;
  material?: MaterialDef;
  visible?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  // Geometry overrides
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  radiusTop?: number;
  radiusBottom?: number;
  segments?: number;
  /** GLTF url */
  url?: string;
  /** Line geometry: array of points for polyline or tube path */
  points?: Vec3[];
  /** Parent object id for grouping */
  parentId?: string;
  /** Tube cross-section radius for torus/torusKnot/tube */
  tubeRadius?: number;
  /** Inner radius for ring geometry */
  innerRadius?: number;
  /** Subdivision detail for platonic solids */
  detail?: number;
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
  /** Spot light cone angle (radians) */
  angle?: number;
  penumbra?: number;
  /** Point / spot attenuation */
  decay?: number;
  distance?: number;
  /** Hemisphere only */
  groundColor?: string;
}

export interface SceneCamera {
  position: Vec3;
  target: Vec3;
  fov?: number;
  near?: number;
  far?: number;
}

export interface EnvironmentDef {
  background?: string;
  fog?: { color: string; near: number; far: number };
  skyType?: 'color' | 'gradient' | 'hdri' | 'procedural';
  skyParams?: Record<string, unknown>;
  hdriUrl?: string;
  shadows?: boolean;
  toneMapping?: 'none' | 'linear' | 'reinhard' | 'aces';
  exposure?: number;
  bloom?: { strength: number; radius: number; threshold: number };
  chromaticAberration?: { offset: number };
  vignette?: { offset: number; darkness: number };
}

/** Behavior definition — frame-tick based continuous effect attached to an object */
export interface BehaviorDef {
  id: string;
  objectId: string;
  type: 'spin' | 'bob' | 'orbit' | 'lookAt' | 'pulse';
  params: Record<string, unknown>;
}

export interface SceneState {
  objects: Record<string, SceneObject>;
  lights: Record<string, SceneLight>;
  particles: Record<string, ParticleDef>;
  behaviors: Record<string, BehaviorDef>;
  camera: SceneCamera;
  environment: EnvironmentDef;
  animations?: Record<string, AnimationDef>;
  framework?: Framework;
  timestamp?: number;
}

/** Particle system definition */
export interface ParticleDef {
  id: string;
  position: Vec3;
  count: number;
  spread: Vec3;
  size: number;
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  speed?: number;
  drift?: Vec3;
  sizeAttenuation?: boolean;
  twinkle?: boolean;
  blending?: 'additive' | 'normal';
}

/** Persistent animation definition — survives page reloads via loadScene. */
export interface AnimationDef {
  id: string;
  property: 'position' | 'rotation' | 'scale' | 'material.emissiveIntensity' | 'material.opacity' | 'material.color';
  to: Vec3 | number | string;
  duration: number;  // seconds
  easing: string;
  loop: boolean;
}

// ─── WebSocket message protocol ────────────────────────────────────────────────

export type WSMessageType =
  | 'hello'
  | 'state-update'
  | 'user-chat'
  | 'screenshot'
  | 'script-result'
  | 'command'
  | 'ai-reply'
  | 'ack'
  | 'error'
  | 'ping'
  | 'pong'
  | 'switch-provider'
  | 'provider-config'
  | 'update-system-prompt'
  | 'update-parameters'
  | 'update-environment'
  | 'clear-scene';

export interface WSMessage {
  type: WSMessageType;
  [key: string]: unknown;
}

export interface HelloMessage extends WSMessage {
  type: 'hello';
  framework: Framework;
  sessionId?: string;
}

export interface UserChatMessage extends WSMessage {
  type: 'user-chat';
  sessionId: string;
  message: string;
}

export interface ScreenshotMessage extends WSMessage {
  type: 'screenshot';
  requestId: string;
  dataUrl: string;
}

export interface StateUpdateMessage extends WSMessage {
  type: 'state-update';
  data: SceneState;
}

// ─── Server internal types ─────────────────────────────────────────────────────

export interface PendingMessage {
  id: string;
  timestamp: number;
  message: string;
  sessionId: string;
  framework: Framework;
}

export interface GenericCommand {
  action: string;
  commandId?: string;
  [key: string]: unknown;
}

export interface ClientSession {
  id: string;
  framework: Framework;
  connectedAt: number;
  lastSeen: number;
}
