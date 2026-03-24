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
  /** box | sphere | cylinder | cone | torus | plane | capsule | gltf */
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
  shadows?: boolean;
  toneMapping?: 'none' | 'linear' | 'reinhard' | 'aces';
  exposure?: number;
}

export interface SceneState {
  objects: Record<string, SceneObject>;
  lights: Record<string, SceneLight>;
  camera: SceneCamera;
  environment: EnvironmentDef;
  framework?: Framework;
  timestamp?: number;
}

// ─── WebSocket message protocol ────────────────────────────────────────────────

export type WSMessageType =
  | 'hello'
  | 'state-update'
  | 'user-chat'
  | 'screenshot'
  | 'command'
  | 'ai-reply'
  | 'ack'
  | 'error'
  | 'ping'
  | 'pong'
  | 'switch-provider'
  | 'provider-config'
  | 'update-system-prompt';

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
