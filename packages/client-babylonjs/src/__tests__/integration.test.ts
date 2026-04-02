/**
 * Integration tests for command flow through the Babylon.js client.
 * Tests the full pipeline: command reception -> dispatch -> scene updates.
 */
import { describe, it, expect, vi } from 'vitest';

// Mock Babylon.js to prevent WebGL initialization
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
  },
  Color3: class {
    constructor(public r: number, public g: number, public b: number) {}
  },
  MeshBuilder: {
    CreateBox: vi.fn(() => ({ name: 'box', position: { x: 0, y: 0, z: 0 } })),
  },
  StandardMaterial: vi.fn(() => ({ diffuseColor: { r: 1, g: 1, b: 1 } })),
}));

import { dispatch } from '../commands/index.js';

describe('Command Integration', () => {
  it('should handle complete object lifecycle', () => {
    const mockScene = {
      createObject: vi.fn(),
      updateObject: vi.fn(),
      deleteObject: vi.fn(),
      createLight: vi.fn(),
      updateLight: vi.fn(),
      deleteLight: vi.fn(),
      setCamera: vi.fn(),
      flyToObject: vi.fn(),
      animateObject: vi.fn(),
      stopAnimation: vi.fn(),
      setEnvironment: vi.fn(),
      loadScene: vi.fn(),
      createParticles: vi.fn(),
      updateParticles: vi.fn(),
      deleteParticles: vi.fn(),
      addBehavior: vi.fn(),
      removeBehavior: vi.fn(),
    };

    // Create object
    dispatch(mockScene as never, {
      action: 'createObject',
      id: 'box1',
      type: 'box',
      position: { x: 0, y: 0.5, z: 0 },
    });
    expect(mockScene.createObject).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'box1',
        type: 'box',
      })
    );

    // Update object
    dispatch(mockScene as never, {
      action: 'updateObject',
      id: 'box1',
      position: { x: 1, y: 0.5, z: 0 },
    });
    expect(mockScene.updateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'box1',
        position: { x: 1, y: 0.5, z: 0 },
      })
    );

    // Animate object
    dispatch(mockScene as never, {
      action: 'animateObject',
      id: 'box1',
      property: 'rotation',
      to: { x: 0, y: 180, z: 0 },
      duration: 2,
    });
    expect(mockScene.animateObject).toHaveBeenCalledWith(
      'box1',
      'rotation',
      { x: 0, y: 180, z: 0 },
      2,
      'linear',
      false
    );

    // Delete object
    dispatch(mockScene as never, {
      action: 'deleteObject',
      id: 'box1',
    });
    expect(mockScene.deleteObject).toHaveBeenCalledWith('box1');
  });

  it('should handle scene composition workflow', () => {
    const mockScene = {
      createObject: vi.fn(),
      updateObject: vi.fn(),
      deleteObject: vi.fn(),
      createLight: vi.fn(),
      updateLight: vi.fn(),
      deleteLight: vi.fn(),
      setCamera: vi.fn(),
      flyToObject: vi.fn(),
      animateObject: vi.fn(),
      stopAnimation: vi.fn(),
      setEnvironment: vi.fn(),
      loadScene: vi.fn(),
      createParticles: vi.fn(),
      updateParticles: vi.fn(),
      deleteParticles: vi.fn(),
      addBehavior: vi.fn(),
      removeBehavior: vi.fn(),
    };

    // Set environment
    dispatch(mockScene as never, {
      action: 'setEnvironment',
      background: '#0a0a1e',
      fog: { color: '#ff00ff', near: 5, far: 25 },
    });
    expect(mockScene.setEnvironment).toHaveBeenCalled();

    // Add light
    dispatch(mockScene as never, {
      action: 'createLight',
      id: 'light1',
      lightType: 'point',
      color: '#00ffff',
      intensity: 2,
      position: { x: 2, y: 3, z: 2 },
    });
    expect(mockScene.createLight).toHaveBeenCalled();

    // Position camera
    dispatch(mockScene as never, {
      action: 'setCamera',
      position: { x: 0, y: 5, z: 10 },
      target: { x: 0, y: 0, z: 0 },
    });
    expect(mockScene.setCamera).toHaveBeenCalled();

    // Add object
    dispatch(mockScene as never, {
      action: 'createObject',
      id: 'sphere1',
      type: 'sphere',
      position: { x: 0, y: 1, z: 0 },
      material: {
        color: '#ffffff',
        emissive: '#00ffff',
        emissiveIntensity: 2,
      },
    });
    expect(mockScene.createObject).toHaveBeenCalled();
  });

  it('should handle particle systems', () => {
    const mockScene = {
      createObject: vi.fn(),
      updateObject: vi.fn(),
      deleteObject: vi.fn(),
      createLight: vi.fn(),
      updateLight: vi.fn(),
      deleteLight: vi.fn(),
      setCamera: vi.fn(),
      flyToObject: vi.fn(),
      animateObject: vi.fn(),
      stopAnimation: vi.fn(),
      setEnvironment: vi.fn(),
      loadScene: vi.fn(),
      createParticles: vi.fn(),
      updateParticles: vi.fn(),
      deleteParticles: vi.fn(),
      addBehavior: vi.fn(),
      removeBehavior: vi.fn(),
    };

    // Create particles
    dispatch(mockScene as never, {
      action: 'createParticles',
      id: 'stars',
      position: { x: 0, y: 5, z: 0 },
      count: 1000,
      spread: { x: 10, y: 10, z: 10 },
      size: 0.1,
      color: '#ffffff',
    });
    expect(mockScene.createParticles).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'stars',
        count: 1000,
      })
    );

    // Update particles
    dispatch(mockScene as never, {
      action: 'updateParticles',
      id: 'stars',
      color: '#ffff00',
    });
    expect(mockScene.updateParticles).toHaveBeenCalled();

    // Delete particles
    dispatch(mockScene as never, {
      action: 'deleteParticles',
      id: 'stars',
    });
    expect(mockScene.deleteParticles).toHaveBeenCalledWith('stars');
  });

  it('should handle behaviors', () => {
    const mockScene = {
      createObject: vi.fn(),
      updateObject: vi.fn(),
      deleteObject: vi.fn(),
      createLight: vi.fn(),
      updateLight: vi.fn(),
      deleteLight: vi.fn(),
      setCamera: vi.fn(),
      flyToObject: vi.fn(),
      animateObject: vi.fn(),
      stopAnimation: vi.fn(),
      setEnvironment: vi.fn(),
      loadScene: vi.fn(),
      createParticles: vi.fn(),
      updateParticles: vi.fn(),
      deleteParticles: vi.fn(),
      addBehavior: vi.fn(),
      removeBehavior: vi.fn(),
    };

    // Add behavior
    dispatch(mockScene as never, {
      action: 'addBehavior',
      id: 'spin1',
      objectId: 'box1',
      type: 'spin',
      params: { axis: 'y', speed: 1 },
    });
    expect(mockScene.addBehavior).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'spin1',
        type: 'spin',
      })
    );

    // Remove behavior
    dispatch(mockScene as never, {
      action: 'removeBehavior',
      id: 'spin1',
    });
    expect(mockScene.removeBehavior).toHaveBeenCalledWith('spin1');
  });

  it('should handle scene loading with animations', () => {
    const mockScene = {
      createObject: vi.fn(),
      updateObject: vi.fn(),
      deleteObject: vi.fn(),
      createLight: vi.fn(),
      updateLight: vi.fn(),
      deleteLight: vi.fn(),
      setCamera: vi.fn(),
      flyToObject: vi.fn(),
      animateObject: vi.fn(),
      stopAnimation: vi.fn(),
      setEnvironment: vi.fn(),
      loadScene: vi.fn(),
      createParticles: vi.fn(),
      updateParticles: vi.fn(),
      deleteParticles: vi.fn(),
      addBehavior: vi.fn(),
      removeBehavior: vi.fn(),
    };

    dispatch(mockScene as never, {
      action: 'loadScene',
      state: {
        objects: {
          box1: { id: 'box1', type: 'box', position: { x: 0, y: 0, z: 0 } },
        },
        lights: {},
        camera: { position: { x: 0, y: 5, z: 10 }, target: { x: 0, y: 0, z: 0 } },
        environment: {},
        animations: {
          anim1: {
            id: 'box1',
            property: 'rotation',
            to: { x: 0, y: 360, z: 0 },
            duration: 4,
            easing: 'linear',
            loop: true,
          },
        },
      },
    });

    expect(mockScene.loadScene).toHaveBeenCalled();
    expect(mockScene.animateObject).toHaveBeenCalledWith(
      'box1',
      'rotation',
      { x: 0, y: 360, z: 0 },
      4,
      'linear',
      true
    );
  });

  it('should ignore unknown actions gracefully', () => {
    const mockScene = {
      createObject: vi.fn(),
      updateObject: vi.fn(),
      deleteObject: vi.fn(),
      createLight: vi.fn(),
      updateLight: vi.fn(),
      deleteLight: vi.fn(),
      setCamera: vi.fn(),
      flyToObject: vi.fn(),
      animateObject: vi.fn(),
      stopAnimation: vi.fn(),
      setEnvironment: vi.fn(),
      loadScene: vi.fn(),
      createParticles: vi.fn(),
      updateParticles: vi.fn(),
      deleteParticles: vi.fn(),
      addBehavior: vi.fn(),
      removeBehavior: vi.fn(),
    };

    // Unknown action should not throw
    expect(() => {
      dispatch(mockScene as never, {
        action: 'unknownAction',
        someData: 'value',
      });
    }).not.toThrow();

    // No scene methods should be called
    expect(mockScene.createObject).not.toHaveBeenCalled();
    expect(mockScene.createLight).not.toHaveBeenCalled();
  });
});
