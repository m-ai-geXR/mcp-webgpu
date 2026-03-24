import { describe, it, expect, beforeEach } from 'vitest';
import { UndoStack } from '../state/UndoStack.js';

describe('UndoStack', () => {
  let stack: UndoStack<string>;

  beforeEach(() => {
    stack = new UndoStack<string>(3);
  });

  it('starts with canUndo and canRedo both false', () => {
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(false);
  });

  it('undo on empty stack returns null', () => {
    expect(stack.undo('current')).toBeNull();
  });

  it('redo on empty stack returns null', () => {
    expect(stack.redo('current')).toBeNull();
  });

  it('push enables canUndo', () => {
    stack.push('state-a');
    expect(stack.canUndo()).toBe(true);
    expect(stack.canRedo()).toBe(false);
  });

  it('undo returns the last pushed snapshot', () => {
    stack.push('state-a');
    const result = stack.undo('state-b');
    expect(result).toBe('state-a');
  });

  it('undo enables canRedo', () => {
    stack.push('state-a');
    stack.undo('state-b');
    expect(stack.canRedo()).toBe(true);
  });

  it('redo returns the state passed to undo', () => {
    stack.push('state-a');
    stack.undo('state-b');
    const result = stack.redo('state-a');
    expect(result).toBe('state-b');
  });

  it('redo clears canRedo when the stack is exhausted', () => {
    stack.push('state-a');
    stack.undo('state-b');
    stack.redo('state-a');
    expect(stack.canRedo()).toBe(false);
  });

  it('a new push after undo clears the redo future', () => {
    stack.push('state-a');
    stack.undo('state-b');
    expect(stack.canRedo()).toBe(true);
    stack.push('state-c');
    expect(stack.canRedo()).toBe(false);
  });

  it('stacks multiple undo levels correctly', () => {
    stack.push('s1');
    stack.push('s2');
    const r2 = stack.undo('current');
    const r1 = stack.undo('s2');
    expect(r2).toBe('s2');
    expect(r1).toBe('s1');
  });

  it('respects maxSize by evicting the oldest entry', () => {
    // maxSize = 3; push 4 entries → first is evicted
    stack.push('a');
    stack.push('b');
    stack.push('c');
    stack.push('d'); // 'a' gets evicted

    // Undo 3 times: d, c, b are in past (LIFO order)
    expect(stack.undo('e')).toBe('d');
    expect(stack.undo('d')).toBe('c');
    expect(stack.undo('c')).toBe('b');
    expect(stack.undo('b')).toBeNull(); // 'a' was evicted
  });

  it('clear() resets both past and future', () => {
    stack.push('state-a');
    stack.undo('state-b');
    stack.clear();
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(false);
  });
});
