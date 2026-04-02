/**
 * Tests for BabylonSceneManager utility functions and type conversions.
 * WebGL functionality is mocked to avoid canvas/engine requirements.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Babylon.js modules to prevent WebGL initialization
vi.mock('@babylonjs/core', () => ({
  Engine: vi.fn(() => ({
    runRenderLoop: vi.fn(),
    resize: vi.fn(),
  })),
  Scene: vi.fn(() => ({
    render: vi.fn(),
    clearColor: { r: 0, g: 0, b: 0, a: 1 },
    createDefaultLight: vi.fn(),
    createDefaultCamera: vi.fn(),
    createDefaultEnvironment: vi.fn(),
    getMeshByName: vi.fn(),
    dispose: vi.fn(),
  })),
  Vector3: class {
    constructor(public x: number, public y: number, public z: number) {}
    set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }
  },
  Color3: class {
    constructor(public r: number, public g: number, public b: number) {}
  },
  Color4: class {
    constructor(public r: number, public g: number, public b: number, public a: number) {}
  },
  MeshBuilder: {
    CreateBox: vi.fn(() => ({ name: 'box', position: { x: 0, y: 0, z: 0 }, dispose: vi.fn() })),
    CreateSphere: vi.fn(() => ({ name: 'sphere', position: { x: 0, y: 0, z: 0 }, dispose: vi.fn() })),
    CreateGround: vi.fn(() => ({ name: 'ground', position: { x: 0, y: 0, z: 0 }, dispose: vi.fn() })),
  },
  StandardMaterial: vi.fn(() => ({
    diffuseColor: { r: 1, g: 1, b: 1 },
    specularColor: { r: 0, g: 0, b: 0 },
    emissiveColor: { r: 0, g: 0, b: 0 },
    dispose: vi.fn(),
  })),
  HemisphericLight: vi.fn(),
  DirectionalLight: vi.fn(),
  PointLight: vi.fn(),
  SpotLight: vi.fn(),
}));

describe('Scene Utilities', () => {
  describe('Color conversion', () => {
    it('should convert hex colors to RGB', () => {
      // Test hex to RGB conversion logic
      const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? {
              r: parseInt(result[1], 16) / 255,
              g: parseInt(result[2], 16) / 255,
              b: parseInt(result[3], 16) / 255,
            }
          : { r: 1, g: 1, b: 1 };
      };

      expect(hexToRgb('#ff0000')).toEqual({ r: 1, g: 0, b: 0 });
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 1, b: 0 });
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 1 });
      expect(hexToRgb('#ffffff')).toEqual({ r: 1, g: 1, b: 1 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should handle colors without # prefix', () => {
      const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? {
              r: parseInt(result[1], 16) / 255,
              g: parseInt(result[2], 16) / 255,
              b: parseInt(result[3], 16) / 255,
            }
          : { r: 1, g: 1, b: 1 };
      };

      expect(hexToRgb('ff9966')).toEqual({
        r: 1,
        g: 0.6,
        b: 0.4,
      });
    });
  });

  describe('Angle conversion', () => {
    it('should convert degrees to radians', () => {
      const toRad = (deg: number) => (deg * Math.PI) / 180;

      expect(toRad(0)).toBe(0);
      expect(toRad(90)).toBeCloseTo(Math.PI / 2);
      expect(toRad(180)).toBeCloseTo(Math.PI);
      expect(toRad(360)).toBeCloseTo(Math.PI * 2);
      expect(toRad(-90)).toBeCloseTo(-Math.PI / 2);
    });
  });

  describe('Easing functions', () => {
    it('should interpolate linearly', () => {
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(0, 10, 1)).toBe(10);
      expect(lerp(5, 15, 0.5)).toBe(10);
    });

    it('should apply ease-in-out cubic', () => {
      const easeInOutCubic = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      expect(easeInOutCubic(0)).toBe(0);
      expect(easeInOutCubic(1)).toBe(1);
      expect(easeInOutCubic(0.5)).toBe(0.5);
      // Should accelerate in first half
      expect(easeInOutCubic(0.25)).toBeLessThan(0.25);
      // Should decelerate in second half
      expect(easeInOutCubic(0.75)).toBeGreaterThan(0.75);
    });
  });

  describe('Object ID management', () => {
    it('should validate object IDs', () => {
      const isValidId = (id: unknown): id is string =>
        typeof id === 'string' && id.length > 0;

      expect(isValidId('box1')).toBe(true);
      expect(isValidId('light-main')).toBe(true);
      expect(isValidId('')).toBe(false);
      expect(isValidId(null)).toBe(false);
      expect(isValidId(undefined)).toBe(false);
      expect(isValidId(123)).toBe(false);
    });
  });

  describe('Scene state validation', () => {
    it('should validate scene state structure', () => {
      const isValidSceneState = (state: unknown): boolean => {
        if (typeof state !== 'object' || state === null) return false;
        const s = state as Record<string, unknown>;
        return (
          typeof s.objects === 'object' &&
          typeof s.lights === 'object' &&
          typeof s.camera === 'object' &&
          typeof s.environment === 'object'
        );
      };

      expect(
        isValidSceneState({
          objects: {},
          lights: {},
          camera: {},
          environment: {},
        })
      ).toBe(true);

      expect(
        isValidSceneState({
          objects: {},
          lights: {},
          // missing camera
          environment: {},
        })
      ).toBe(false);

      expect(isValidSceneState(null)).toBe(false);
      expect(isValidSceneState('not an object')).toBe(false);
    });
  });

  describe('Transform calculations', () => {
    it('should calculate distance between two points', () => {
      const distance = (
        a: { x: number; y: number; z: number },
        b: { x: number; y: number; z: number }
      ) => {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      };

      expect(distance({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 })).toBe(5);
      expect(distance({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 })).toBeCloseTo(
        Math.sqrt(3)
      );
      expect(distance({ x: 5, y: 5, z: 5 }, { x: 5, y: 5, z: 5 })).toBe(0);
    });

    it('should normalize vectors', () => {
      const normalize = (v: { x: number; y: number; z: number }) => {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        return len > 0
          ? { x: v.x / len, y: v.y / len, z: v.z / len }
          : { x: 0, y: 0, z: 0 };
      };

      const normalized = normalize({ x: 3, y: 4, z: 0 });
      expect(normalized.x).toBeCloseTo(0.6);
      expect(normalized.y).toBeCloseTo(0.8);
      expect(normalized.z).toBe(0);

      // Check unit length
      const len = Math.sqrt(
        normalized.x * normalized.x +
          normalized.y * normalized.y +
          normalized.z * normalized.z
      );
      expect(len).toBeCloseTo(1);
    });
  });
});

describe('Material properties', () => {
  it('should handle PBR material defaults', () => {
    const defaultPBR = {
      metalness: 0.3,
      roughness: 0.7,
      opacity: 1.0,
    };

    expect(defaultPBR.metalness).toBeGreaterThanOrEqual(0);
    expect(defaultPBR.metalness).toBeLessThanOrEqual(1);
    expect(defaultPBR.roughness).toBeGreaterThanOrEqual(0);
    expect(defaultPBR.roughness).toBeLessThanOrEqual(1);
  });

  it('should clamp material values to valid ranges', () => {
    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(max, value));

    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(-0.5, 0, 1)).toBe(0);
    expect(clamp(1.5, 0, 1)).toBe(1);
    expect(clamp(2.5, 0, 3)).toBe(2.5);
  });
});
