/**
 * Tests for the A-Frame command dispatcher.
 * The AFrameSceneManager is mocked to avoid DOM/A-Frame registration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prevent aframe from registering custom elements in jsdom
vi.mock('aframe', () => ({}));
vi.mock('../scene.js', () => ({ AFrameSceneManager: class {} }));

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

describe('A-Frame dispatch', () => {
  let scene: ReturnType<typeof makeMockScene>;
  const sendScreenshot = vi.fn();

  beforeEach(() => {
    scene = makeMockScene();
    sendScreenshot.mockClear();
  });

  it('createObject routes to scene.createObject', () => {
    dispatch({ action: 'createObject', id: 'el1', type: 'box' }, scene as never, sendScreenshot);
    expect(scene.createObject).toHaveBeenCalledOnce();
  });

  it('updateObject routes to scene.updateObject', () => {
    dispatch({ action: 'updateObject', id: 'el1', visible: false }, scene as never, sendScreenshot);
    expect(scene.updateObject).toHaveBeenCalledOnce();
  });

  it('deleteObject routes to scene.deleteObject with the id', () => {
    dispatch({ action: 'deleteObject', id: 'el1' }, scene as never, sendScreenshot);
    expect(scene.deleteObject).toHaveBeenCalledWith('el1');
  });

  it('createLight routes to scene.createLight', () => {
    dispatch({ action: 'createLight', id: 'l1', lightType: 'ambient', color: '#fff', intensity: 0.5 }, scene as never, sendScreenshot);
    expect(scene.createLight).toHaveBeenCalledOnce();
  });

  it('updateLight routes to scene.updateLight', () => {
    dispatch({ action: 'updateLight', id: 'l1', intensity: 0.8 }, scene as never, sendScreenshot);
    expect(scene.updateLight).toHaveBeenCalledOnce();
  });

  it('deleteLight routes to scene.deleteLight with the id', () => {
    dispatch({ action: 'deleteLight', id: 'l1' }, scene as never, sendScreenshot);
    expect(scene.deleteLight).toHaveBeenCalledWith('l1');
  });

  it('setCamera routes to scene.setCamera', () => {
    dispatch({ action: 'setCamera', position: { x: 0, y: 5, z: 10 } }, scene as never, sendScreenshot);
    expect(scene.setCamera).toHaveBeenCalledOnce();
  });

  it('flyToObject routes to scene.flyToObject with id and optional distance', () => {
    dispatch({ action: 'flyToObject', id: 'el1', distance: 4 }, scene as never, sendScreenshot);
    expect(scene.flyToObject).toHaveBeenCalledWith('el1', 4);
  });

  it('animateObject routes to scene.animateObject', () => {
    dispatch(
      { action: 'animateObject', id: 'el1', property: 'scale', to: { x: 2, y: 2, z: 2 }, duration: 1, easing: 'easeInOut', loop: true },
      scene as never, sendScreenshot,
    );
    expect(scene.animateObject).toHaveBeenCalledWith('el1', 'scale', { x: 2, y: 2, z: 2 }, 1, 'easeInOut', true);
  });

  it('stopAnimation routes to scene.stopAnimation with id', () => {
    dispatch({ action: 'stopAnimation', id: 'el1' }, scene as never, sendScreenshot);
    expect(scene.stopAnimation).toHaveBeenCalledWith('el1');
  });

  it('setEnvironment routes to scene.setEnvironment', () => {
    dispatch({ action: 'setEnvironment', background: '#112233' }, scene as never, sendScreenshot);
    expect(scene.setEnvironment).toHaveBeenCalledOnce();
  });

  it('loadScene routes to scene.loadScene', () => {
    dispatch({ action: 'loadScene', objects: {}, lights: {} }, scene as never, sendScreenshot);
    expect(scene.loadScene).toHaveBeenCalledOnce();
  });

  it('unknown action does not call any scene method', () => {
    dispatch({ action: 'noop' }, scene as never, sendScreenshot);
    for (const fn of Object.values(scene)) {
      if (typeof fn === 'function') expect(fn).not.toHaveBeenCalled();
    }
  });
});
