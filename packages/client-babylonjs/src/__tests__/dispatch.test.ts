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

  it('createObject routes to scene.createObject', () => {
    dispatch(scene as never, { action: 'createObject', id: 'box1', type: 'box' });
    expect(scene.createObject).toHaveBeenCalledWith(expect.objectContaining({ id: 'box1', type: 'box' }));
  });

  it('updateObject routes to scene.updateObject', () => {
    dispatch(scene as never, { action: 'updateObject', id: 'box1', visible: false });
    expect(scene.updateObject).toHaveBeenCalledWith(expect.objectContaining({ id: 'box1', visible: false }));
  });

  it('deleteObject routes to scene.deleteObject with id', () => {
    dispatch(scene as never, { action: 'deleteObject', id: 'box1' });
    expect(scene.deleteObject).toHaveBeenCalledWith('box1');
  });

  it('createLight routes to scene.createLight', () => {
    dispatch(scene as never, { action: 'createLight', id: 'l1', lightType: 'point', color: '#fff', intensity: 1 });
    expect(scene.createLight).toHaveBeenCalledWith(expect.objectContaining({ id: 'l1', lightType: 'point' }));
  });

  it('updateLight routes to scene.updateLight', () => {
    dispatch(scene as never, { action: 'updateLight', id: 'l1', intensity: 0.5 });
    expect(scene.updateLight).toHaveBeenCalledWith(expect.objectContaining({ id: 'l1', intensity: 0.5 }));
  });

  it('deleteLight routes to scene.deleteLight with id', () => {
    dispatch(scene as never, { action: 'deleteLight', id: 'l1' });
    expect(scene.deleteLight).toHaveBeenCalledWith('l1');
  });

  it('setCamera routes to scene.setCamera', () => {
    dispatch(scene as never, { action: 'setCamera', position: { x: 0, y: 5, z: 10 }, target: { x: 0, y: 0, z: 0 } });
    expect(scene.setCamera).toHaveBeenCalledWith(expect.objectContaining({ position: expect.any(Object) }));
  });

  it('flyToObject routes to scene.flyToObject with id and distance', () => {
    dispatch(scene as never, { action: 'flyToObject', id: 'box1', distance: 3 });
    expect(scene.flyToObject).toHaveBeenCalledWith('box1', 3);
  });

  it('animateObject routes to scene.animateObject with all params', () => {
    dispatch(scene as never, { action: 'animateObject', id: 'box1', property: 'rotation', to: { x: 0, y: 90, z: 0 }, duration: 2, easing: 'easeOut', loop: false });
    expect(scene.animateObject).toHaveBeenCalledWith('box1', 'rotation', { x: 0, y: 90, z: 0 }, 2, 'easeOut', false);
  });

  it('stopAnimation routes to scene.stopAnimation with id', () => {
    dispatch(scene as never, { action: 'stopAnimation', id: 'box1' });
    expect(scene.stopAnimation).toHaveBeenCalledWith('box1');
  });

  it('setEnvironment routes to scene.setEnvironment', () => {
    dispatch(scene as never, { action: 'setEnvironment', background: '#000011' });
    expect(scene.setEnvironment).toHaveBeenCalledWith(expect.objectContaining({ background: '#000011' }));
  });

  it('loadScene routes to scene.loadScene', () => {
    dispatch(scene as never, { action: 'loadScene', objects: {}, lights: {}, camera: {}, environment: {} });
    expect(scene.loadScene).toHaveBeenCalled();
  });

  it('unknown action calls no scene method', () => {
    dispatch(scene as never, { action: 'mystery' });
    for (const fn of Object.values(scene)) {
      if (typeof fn === 'function') expect(fn).not.toHaveBeenCalled();
    }
  });
});
