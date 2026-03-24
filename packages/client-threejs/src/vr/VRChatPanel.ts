/**
 * VR Chat Panel — floating 3D panel that shows chat messages in VR.
 *
 * Uses a CanvasTexture mapped onto a plane mesh. Positioned in front of
 * the camera and updated whenever new messages arrive.
 */
import * as THREE from 'three';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

const PANEL_WIDTH  = 1.2;
const PANEL_HEIGHT = 0.8;
const TEX_W = 600;
const TEX_H = 400;
const MAX_MESSAGES = 8;
const FONT_SIZE   = 16;
const LINE_HEIGHT = 20;
const PADDING     = 16;

export class VRChatPanel {
  readonly mesh: THREE.Mesh;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private messages: ChatMessage[] = [];
  private _visible = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width  = TEX_W;
    this.canvas.height = TEX_H;
    this.ctx = this.canvas.getContext('2d')!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;

    const geo = new THREE.PlaneGeometry(PANEL_WIDTH, PANEL_HEIGHT);
    const mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.visible = false;
    this.mesh.renderOrder = 9999;

    this.redraw();
  }

  get visible(): boolean { return this._visible; }

  show(): void {
    this._visible = true;
    this.mesh.visible = true;
  }

  hide(): void {
    this._visible = false;
    this.mesh.visible = false;
  }

  addMessage(role: 'user' | 'ai', text: string): void {
    this.messages.push({ role, text });
    if (this.messages.length > MAX_MESSAGES) {
      this.messages = this.messages.slice(-MAX_MESSAGES);
    }
    this.redraw();
  }

  clear(): void {
    this.messages = [];
    this.redraw();
  }

  /** Position the panel in front of the given camera. */
  followCamera(camera: THREE.Camera): void {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const up  = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const pos = camera.position.clone()
      .add(dir.multiplyScalar(2.0))   // 2m in front
      .add(up.multiplyScalar(-0.3));   // slightly below eye level
    this.mesh.position.copy(pos);
    this.mesh.quaternion.copy(camera.quaternion);
  }

  private redraw(): void {
    const ctx = this.ctx;
    const w = TEX_W;
    const h = TEX_H;

    // Background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(10, 10, 30, 0.88)';
    ctx.beginPath();
    this.roundRect(ctx, 0, 0, w, h, 16);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(100, 100, 220, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.roundRect(ctx, 1, 1, w - 2, h - 2, 15);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#a5b4fc';
    ctx.font = `bold ${FONT_SIZE + 2}px "Segoe UI", system-ui, sans-serif`;
    ctx.fillText('🎮 VR Chat', PADDING, PADDING + FONT_SIZE);

    // Messages
    let y = PADDING + FONT_SIZE + LINE_HEIGHT + 4;
    ctx.font = `${FONT_SIZE}px "Segoe UI", system-ui, sans-serif`;

    for (const msg of this.messages) {
      if (y + LINE_HEIGHT > h - PADDING) break;

      const prefix = msg.role === 'user' ? '🗣  ' : '🤖 ';
      ctx.fillStyle = msg.role === 'user' ? '#c7d2fe' : '#86efac';

      // Word wrap
      const maxW = w - PADDING * 2;
      const lines = this.wrapText(ctx, prefix + msg.text, maxW);
      for (const line of lines) {
        if (y + LINE_HEIGHT > h - PADDING) break;
        ctx.fillText(line, PADDING, y);
        y += LINE_HEIGHT;
      }
      y += 4; // gap between messages
    }

    if (this.messages.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = `italic ${FONT_SIZE}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillText('Press ~ to type a message…', PADDING, y);
    }

    this.texture.needsUpdate = true;
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
