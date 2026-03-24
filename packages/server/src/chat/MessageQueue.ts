import { PendingMessage } from '../types.js';

export class MessageQueue {
  private messages: PendingMessage[] = [];

  push(msg: PendingMessage): void {
    this.messages.push(msg);
  }

  peek(): PendingMessage | undefined {
    return this.messages[0];
  }

  shift(): PendingMessage | undefined {
    return this.messages.shift();
  }

  getAll(): PendingMessage[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }

  size(): number {
    return this.messages.length;
  }
}
