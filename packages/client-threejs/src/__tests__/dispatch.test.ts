/**
 * Tests for the Three.js command dispatcher.
 * The SceneManager is mocked — we only verify that dispatch routes each action
 * to the correct SceneManager method with the right arguments.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the scene module so the heavy WebGL import never loads in tests
vi.mock('../scene.js', () => ({
  SceneManager: class {},
}));

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

describe('Three.js dispatch', () => {
  let scene: ReturnType<typeof makeMockScene>;
  const sendScreenshot = vi.fn();
  const now = 0;

  beforeEach(() => {
    scene = makeMockScene();
    sendScreenshot.mockClear();
  });

  it('createObject routes to scene.createObject', () => {
    dispatch({ action: 'createObject', id: 'box1', type: 'box' }, scene as never, now, sendScreenshot);
    expect(scene.createObject).toHaveBeenCalledOnce();
  });

  it('updateObject routes to scene.updateObject', () => {
    dispatch({ action: 'updateObject', id: 'box1', visible: false }, scene as never, now, sendScreenshot);
    expect(scene.updateObject).toHaveBeenCalledOnce();
  });

  it('deleteObject routes to scene.deleteObject with the id', () => {
    dispatch({ action: 'deleteObject', id: 'box1' }, scene as never, now, sendScreenshot);
    expect(scene.deleteObject).toHaveBeenCalledWith('box1');
  });

  it('createLight routes to scene.createLight', () => {
    dispatch({ action: 'createLight', id: 'l1', lightType: 'point', color: '#fff', intensity: 1 }, scene as never, now, sendScreenshot);
    expect(scene.createLight).toHaveBeenCalledOnce();
  });

  it('updateLight routes to scene.updateLight', () => {
    dispatch({ action: 'updateLight', id: 'l1', intensity: 0.5 }, scene as never, now, sendScreenshot);
    expect(scene.updateLight).toHaveBeenCalledOnce();
  });

  it('deleteLight routes to scene.deleteLight with the id', () => {
    dispatch({ action: 'deleteLight', id: 'l1' }, scene as never, now, sendScreenshot);
    expect(scene.deleteLight).toHaveBeenCalledWith('l1');
  });

  it('setCamera routes to scene.setCamera', () => {
    dispatch({ action: 'setCamera', position: { x: 0, y: 5, z: 10 }, target: { x: 0, y: 0, z: 0 } }, scene as never, now, sendScreenshot);
    expect(scene.setCamera).toHaveBeenCalledOnce();
  });

  it('flyToObject routes to scene.flyToObject with id and optional distance', () => {
    dispatch({ action: 'flyToObject', id: 'box1', distance: 3 }, scene as never, now, sendScreenshot);
    expect(scene.flyToObject).toHaveBeenCalledWith('box1', 3, undefined);
  });

  it('animateObject routes to scene.animateObject', () => {
    dispatch(
      { action: 'animateObject', id: 'box1', property: 'position', to: { x: 1, y: 0, z: 0 }, duration: 2, easing: 'easeOut', loop: false },
      scene as never, now, sendScreenshot,
    );
    expect(scene.animateObject).toHaveBeenCalledWith('box1', 'position', { x: 1, y: 0, z: 0 }, 2, 'easeOut', false, now);
  });

  it('stopAnimation routes to scene.stopAnimation with id', () => {
    dispatch({ action: 'stopAnimation', id: 'box1' }, scene as never, now, sendScreenshot);
    expect(scene.stopAnimation).toHaveBeenCalledWith('box1');
  });

  it('setEnvironment routes to scene.setEnvironment', () => {
    dispatch({ action: 'setEnvironment', background: '#000' }, scene as never, now, sendScreenshot);
    expect(scene.setEnvironment).toHaveBeenCalledOnce();
  });

  it('loadScene routes to scene.loadScene', () => {
    dispatch({ action: 'loadScene', state: { objects: {}, lights: {} } }, scene as never, now, sendScreenshot);
    expect(scene.loadScene).toHaveBeenCalledOnce();
  });

  it('unknown action does not call any scene method', () => {
    dispatch({ action: 'unknownAction' }, scene as never, now, sendScreenshot);
    for (const fn of Object.values(scene)) {
      if (typeof fn === 'function') expect(fn).not.toHaveBeenCalled();
    }
  });

  it('missing action field does nothing', () => {
    dispatch({ type: 'command' }, scene as never, now, sendScreenshot);
    for (const fn of Object.values(scene)) {
      if (typeof fn === 'function') expect(fn).not.toHaveBeenCalled();
    }
  });
});
