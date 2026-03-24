import { describe, it, expect, beforeEach } from 'vitest';
import { SceneStateManager } from '../state/SceneStateManager.js';

describe('SceneStateManager', () => {
  let manager: SceneStateManager;

  beforeEach(() => {
    manager = new SceneStateManager();
  });

  // ── Default state ──────────────────────────────────────────────────────────

  it('getState() returns a default state with two lights', () => {
    const state = manager.getState();
    expect(state.objects).toEqual({});
    expect(Object.keys(state.lights)).toHaveLength(2);
    expect(state.lights['ambient-default']).toBeDefined();
    expect(state.lights['directional-default']).toBeDefined();
  });

  it('getState() returns cloned state (not a reference)', () => {
    const s1 = manager.getState();
    const s2 = manager.getState();
    expect(s1).not.toBe(s2);
    expect(s1.camera).not.toBe(s2.camera);
  });

  // ── createObject ───────────────────────────────────────────────────────────

  it('createObject() adds an object to scene state', () => {
    manager.createObject({ type: 'box', id: 'box1' });
    const state = manager.getState();
    expect(state.objects['box1']).toBeDefined();
    expect(state.objects['box1'].type).toBe('box');
  });

  it('createObject() generates an id when not provided', () => {
    const obj = manager.createObject({ type: 'sphere' });
    expect(obj.id).toMatch(/^sphere-/);
    const state = manager.getState();
    expect(state.objects[obj.id]).toBeDefined();
  });

  it('createObject() applies default position { x:0, y:0, z:0 }', () => {
    const obj = manager.createObject({ type: 'box', id: 'b1' });
    expect(obj.position).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('createObject() applies provided position', () => {
    const obj = manager.createObject({ type: 'box', id: 'b1', position: { x: 1, y: 2, z: 3 } });
    expect(obj.position).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('createObject() applies default material', () => {
    const obj = manager.createObject({ type: 'box', id: 'b1' });
    expect(obj.material).toBeDefined();
    expect(obj.material!.color).toBe('#4488ff');
  });

  it('createObject() passes through extra geometry params (radius, height)', () => {
    const obj = manager.createObject({ type: 'sphere', id: 's1', radius: 2 });
    expect(obj.radius).toBe(2);
  });

  // ── updateObject ───────────────────────────────────────────────────────────

  it('updateObject() merges new properties', () => {
    manager.createObject({ type: 'box', id: 'box1' });
    const updated = manager.updateObject('box1', { position: { x: 5, y: 0, z: 0 } });
    expect(updated).not.toBeNull();
    expect(updated!.position.x).toBe(5);
  });

  it('updateObject() returns null for unknown id', () => {
    const result = manager.updateObject('nonexistent', { visible: false });
    expect(result).toBeNull();
  });

  it('updateObject() deep-merges material', () => {
    manager.createObject({ type: 'box', id: 'box1', material: { color: '#ff0000' } });
    const updated = manager.updateObject('box1', { material: { roughness: 0.3 } });
    expect(updated!.material!.color).toBe('#ff0000');
    expect(updated!.material!.roughness).toBe(0.3);
  });

  // ── deleteObject ───────────────────────────────────────────────────────────

  it('deleteObject() removes the object from state', () => {
    manager.createObject({ type: 'box', id: 'box1' });
    const removed = manager.deleteObject('box1');
    expect(removed).toBe(true);
    expect(manager.getState().objects['box1']).toBeUndefined();
  });

  it('deleteObject() returns false for unknown id', () => {
    expect(manager.deleteObject('ghost')).toBe(false);
  });

  // ── getObject ──────────────────────────────────────────────────────────────

  it('getObject() returns the object by id', () => {
    manager.createObject({ type: 'box', id: 'box1' });
    const obj = manager.getObject('box1');
    expect(obj).not.toBeNull();
    expect(obj!.id).toBe('box1');
  });

  it('getObject() returns null for unknown id', () => {
    expect(manager.getObject('missing')).toBeNull();
  });

  // ── updateFromClient ───────────────────────────────────────────────────────

  it('updateFromClient() merges camera when provided', () => {
    manager.updateFromClient({ camera: { position: { x: 10, y: 5, z: 10 }, target: { x: 0, y: 0, z: 0 } } });
    expect(manager.getState().camera.position.x).toBe(10);
  });

  it('updateFromClient() ignores null/undefined input', () => {
    expect(() => manager.updateFromClient(null)).not.toThrow();
    expect(() => manager.updateFromClient(undefined)).not.toThrow();
  });
});
