/**
 * Tests for the Babylon.js command dispatcher.
 * The BabylonSceneManager is mocked to avoid WebGL/canvas requirements in tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prevent Babylon.js engine code from running during import
vi.mock('../scene.js', () => ({ BabylonSceneManager: class {} }));

import { dispatch } from '../commands/index.js';

function makeMockScene() {
  return {
    createObject:   vi.fn(),
    updateObject:   vi.fn(),
    deleteObject:   vi.fn(),
    createLight:    vi.fn(),
    updateLight:    vi.fn(),
    deleteLight:    vi.fn(),
    setCamera:      vi.fn(),
    flyToObject:    vi.fn(),
    animateObject:  vi.fn(),
    stopAnimation:  vi.fn(),
    setEnvironment: vi.fn(),
    loadScene:      vi.fn(),
    takeScreenshot: vi.fn().mockReturnValue('data:image/png;base64,abc'),
  };
}

describe('Babylon.js dispatch', () => {
  let scene: ReturnType<typeof makeMockScene>;

  beforeEach(() => {
    scene = makeMockScene();
  });

  it('create-object routes to scene.createObject with payload', () => {
    dispatch(scene as never, { action: 'create-object', payload: { id: 'box1', type: 'box' } });
    expect(scene.createObject).toHaveBeenCalledWith({ id: 'box1', type: 'box' });
  });

  it('update-object routes to scene.updateObject with payload', () => {
    const payload = { id: 'box1', visible: false };
    dispatch(scene as never, { action: 'update-object', payload });
    expect(scene.updateObject).toHaveBeenCalledWith(payload);
  });

  it('delete-object routes to scene.deleteObject with payload.id', () => {
    dispatch(scene as never, { action: 'delete-object', payload: { id: 'box1' } });
    expect(scene.deleteObject).toHaveBeenCalledWith('box1');
  });

  it('create-light routes to scene.createLight with payload', () => {
    const payload = { id: 'l1', lightType: 'point', color: '#fff', intensity: 1 };
    dispatch(scene as never, { action: 'create-light', payload });
    expect(scene.createLight).toHaveBeenCalledWith(payload);
  });

  it('update-light routes to scene.updateLight with payload', () => {
    const payload = { id: 'l1', intensity: 0.5 };
    dispatch(scene as never, { action: 'update-light', payload });
    expect(scene.updateLight).toHaveBeenCalledWith(payload);
  });

  it('delete-light routes to scene.deleteLight with payload.id', () => {
    dispatch(scene as never, { action: 'delete-light', payload: { id: 'l1' } });
    expect(scene.deleteLight).toHaveBeenCalledWith('l1');
  });

  it('set-camera routes to scene.setCamera with payload', () => {
    const payload = { position: { x: 0, y: 5, z: 10 }, target: { x: 0, y: 0, z: 0 } };
    dispatch(scene as never, { action: 'set-camera', payload });
    expect(scene.setCamera).toHaveBeenCalledWith(payload);
  });

  it('fly-to-object routes to scene.flyToObject with id and distance', () => {
    dispatch(scene as never, { action: 'fly-to-object', payload: { id: 'box1', distance: 3 } });
    expect(scene.flyToObject).toHaveBeenCalledWith('box1', 3);
  });

  it('animate-object routes to scene.animateObject with all params', () => {
    const payload = { id: 'box1', property: 'rotation', to: { x: 0, y: 90, z: 0 }, duration: 2, easing: 'easeOut', loop: false };
    dispatch(scene as never, { action: 'animate-object', payload });
    expect(scene.animateObject).toHaveBeenCalledWith('box1', 'rotation', { x: 0, y: 90, z: 0 }, 2, 'easeOut', false);
  });

  it('stop-animation routes to scene.stopAnimation with payload.id', () => {
    dispatch(scene as never, { action: 'stop-animation', payload: { id: 'box1' } });
    expect(scene.stopAnimation).toHaveBeenCalledWith('box1');
  });

  it('set-environment routes to scene.setEnvironment with payload', () => {
    const payload = { background: '#000011' };
    dispatch(scene as never, { action: 'set-environment', payload });
    expect(scene.setEnvironment).toHaveBeenCalledWith(payload);
  });

  it('load-scene routes to scene.loadScene with payload', () => {
    const payload = { objects: {}, lights: {}, camera: {}, environment: {} };
    dispatch(scene as never, { action: 'load-scene', payload });
    expect(scene.loadScene).toHaveBeenCalledWith(payload);
  });

  it('unknown action calls no scene method', () => {
    dispatch(scene as never, { action: 'mystery' });
    for (const fn of Object.values(scene)) {
      if (typeof fn === 'function') expect(fn).not.toHaveBeenCalled();
    }
  });
});
