/**
 * Tests for the R3F Zustand scene store.
 * The store is pure JS/TS — no canvas or WebGL required.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useSceneStore } from '../store/sceneStore.js';

const RESET = {
  objects:     {},
  lights:      {},
  camera:      { fov: 60, near: 0.1, far: 2000 },
  environment: { background: '#1a1a2e' },
  animations:  {},
  wsStatus:    'connecting' as const,
  aiMessage:   null,
  pendingScreenshot: null,
};

beforeEach(() => {
  useSceneStore.setState(RESET);
});

// ── Objects ──────────────────────────────────────────────────────────────────

describe('sceneStore — objects', () => {
  const obj = {
    id: 'box1', type: 'box',
    position: { x: 0, y: 0, z: 0 },
    material: { color: '#4488ff' },
  };

  it('starts with no objects', () => {
    expect(useSceneStore.getState().objects).toEqual({});
  });

  it('createObject adds the object by id', () => {
    useSceneStore.getState().createObject(obj);
    expect(useSceneStore.getState().objects['box1']).toMatchObject({ id: 'box1', type: 'box' });
  });

  it('updateObject merges partial properties', () => {
    useSceneStore.getState().createObject(obj);
    useSceneStore.getState().updateObject({ id: 'box1', visible: false });
    expect(useSceneStore.getState().objects['box1'].visible).toBe(false);
    // original props remain
    expect(useSceneStore.getState().objects['box1'].type).toBe('box');
  });

  it('updateObject does nothing for unknown id', () => {
    useSceneStore.getState().updateObject({ id: 'ghost', visible: false });
    expect(useSceneStore.getState().objects['ghost']).toBeUndefined();
  });

  it('deleteObject removes the object', () => {
    useSceneStore.getState().createObject(obj);
    useSceneStore.getState().deleteObject('box1');
    expect(useSceneStore.getState().objects['box1']).toBeUndefined();
  });

  it('deleteObject also removes associated animation', () => {
    useSceneStore.getState().createObject(obj);
    useSceneStore.getState().startAnimation({
      id: 'box1', property: 'position',
      fromX: 0, fromY: 0, fromZ: 0,
      toX: 10, toY: 0, toZ: 0,
      startTime: 0, duration: 1000, easing: 'linear', loop: false,
    });
    useSceneStore.getState().deleteObject('box1');
    expect(useSceneStore.getState().animations['box1']).toBeUndefined();
  });
});

// ── Lights ───────────────────────────────────────────────────────────────────

describe('sceneStore — lights', () => {
  const light = { id: 'l1', lightType: 'point' as const, color: '#ffffff', intensity: 1 };

  it('starts with no lights', () => {
    expect(useSceneStore.getState().lights).toEqual({});
  });

  it('createLight adds the light by id', () => {
    useSceneStore.getState().createLight(light);
    expect(useSceneStore.getState().lights['l1']).toMatchObject({ id: 'l1', lightType: 'point' });
  });

  it('updateLight merges partial properties', () => {
    useSceneStore.getState().createLight(light);
    useSceneStore.getState().updateLight({ id: 'l1', intensity: 0.25 });
    expect(useSceneStore.getState().lights['l1'].intensity).toBe(0.25);
    expect(useSceneStore.getState().lights['l1'].color).toBe('#ffffff');
  });

  it('deleteLight removes the light', () => {
    useSceneStore.getState().createLight(light);
    useSceneStore.getState().deleteLight('l1');
    expect(useSceneStore.getState().lights['l1']).toBeUndefined();
  });
});

// ── Camera & environment ──────────────────────────────────────────────────────

describe('sceneStore — camera and environment', () => {
  it('setCamera merges camera properties', () => {
    useSceneStore.getState().setCamera({ fov: 90 });
    expect(useSceneStore.getState().camera.fov).toBe(90);
    // previous values remain
    expect(useSceneStore.getState().camera.near).toBe(0.1);
  });

  it('setEnvironment merges environment properties', () => {
    useSceneStore.getState().setEnvironment({ background: '#ff0000' });
    expect(useSceneStore.getState().environment.background).toBe('#ff0000');
  });
});

// ── Full scene load ───────────────────────────────────────────────────────────

describe('sceneStore — loadScene', () => {
  it('loadScene replaces objects, lights, camera and environment', () => {
    useSceneStore.getState().createObject({
      id: 'old', type: 'box', position: { x: 0, y: 0, z: 0 },
    });

    useSceneStore.getState().loadScene({
      objects:     { newBox: { id: 'newBox', type: 'sphere', position: { x: 1, y: 1, z: 1 } } },
      lights:      {},
      camera:      { position: { x: 3, y: 3, z: 3 }, target: { x: 0, y: 0, z: 0 } },
      environment: { background: '#002244' },
    });

    const state = useSceneStore.getState();
    expect(state.objects['old']).toBeUndefined();
    expect(state.objects['newBox']).toBeDefined();
    expect(state.environment.background).toBe('#002244');
    expect(state.animations).toEqual({});
  });
});

// ── Animations ────────────────────────────────────────────────────────────────

describe('sceneStore — animations', () => {
  const anim = {
    id: 'box1', property: 'position' as const,
    fromX: 0, fromY: 0, fromZ: 0,
    toX: 5, toY: 0, toZ: 0,
    startTime: 1000, duration: 500, easing: 'easeInOut' as const, loop: false,
  };

  it('startAnimation registers the animation', () => {
    useSceneStore.getState().startAnimation(anim);
    expect(useSceneStore.getState().animations['box1']).toMatchObject({ id: 'box1', toX: 5 });
  });

  it('stopAnimation removes the animation', () => {
    useSceneStore.getState().startAnimation(anim);
    useSceneStore.getState().stopAnimation('box1');
    expect(useSceneStore.getState().animations['box1']).toBeUndefined();
  });
});

// ── UI state ──────────────────────────────────────────────────────────────────

describe('sceneStore — UI state', () => {
  it('setWsStatus updates wsStatus', () => {
    useSceneStore.getState().setWsStatus('connected');
    expect(useSceneStore.getState().wsStatus).toBe('connected');
  });

  it('setAIMessage updates aiMessage', () => {
    useSceneStore.getState().setAIMessage('Hello from AI');
    expect(useSceneStore.getState().aiMessage).toBe('Hello from AI');
  });

  it('setAIMessage can be set back to null', () => {
    useSceneStore.getState().setAIMessage('msg');
    useSceneStore.getState().setAIMessage(null);
    expect(useSceneStore.getState().aiMessage).toBeNull();
  });

  it('setPendingScreenshot updates pendingScreenshot', () => {
    useSceneStore.getState().setPendingScreenshot('req-123');
    expect(useSceneStore.getState().pendingScreenshot).toBe('req-123');
  });
});
