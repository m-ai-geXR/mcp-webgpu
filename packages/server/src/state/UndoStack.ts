export class UndoStack<T> {
  private past: T[] = [];
  private future: T[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 20) {
    this.maxSize = maxSize;
  }

  /** Call BEFORE making a change, passing the current state snapshot. */
  push(snapshot: T): void {
    this.past.push(snapshot);
    if (this.past.length > this.maxSize) {
      this.past.shift();
    }
    // Any new change discards the redo history
    this.future = [];
  }

  /** Undo: save current state for redo, return the previous state. */
  undo(current: T): T | null {
    if (this.past.length === 0) return null;
    this.future.push(current);
    return this.past.pop()!;
  }

  /** Redo: push current state back to past, return the next state. */
  redo(current: T): T | null {
    if (this.future.length === 0) return null;
    this.past.push(current);
    return this.future.pop()!;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
