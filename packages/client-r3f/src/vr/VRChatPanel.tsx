/**
 * VRChatPanel — floating 3D chat panel rendered inside VR.
 *
 * Uses a CanvasTexture on a plane, positioned in front of the camera.
 * Shows the latest chat messages with word-wrapping.
 */
import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
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

function wordWrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function drawPanel(ctx: CanvasRenderingContext2D, messages: ChatMessage[]): void {
  ctx.clearRect(0, 0, TEX_W, TEX_H);

  // Background
  ctx.fillStyle = 'rgba(10, 10, 30, 0.88)';
  ctx.beginPath();
  ctx.roundRect(0, 0, TEX_W, TEX_H, 12);
  ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(100, 120, 200, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Title
  ctx.fillStyle = '#a5b4fc';
  ctx.font = `bold ${FONT_SIZE + 2}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillText('💬 VR Chat', PADDING, PADDING + FONT_SIZE);

  // Messages
  ctx.font = `${FONT_SIZE}px "Segoe UI", system-ui, sans-serif`;
  let y = PADDING + FONT_SIZE + LINE_HEIGHT + 4;
  const maxW = TEX_W - PADDING * 2;
  const last = messages.slice(-MAX_MESSAGES);

  for (const msg of last) {
    ctx.fillStyle = msg.role === 'user' ? '#8090ff' : '#70d0a0';
    const prefix = msg.role === 'user' ? 'You: ' : 'AI: ';
    const lines = wordWrap(ctx, prefix + msg.text, maxW);
    for (const line of lines) {
      if (y + LINE_HEIGHT > TEX_H - PADDING) break;
      ctx.fillText(line, PADDING, y);
      y += LINE_HEIGHT;
    }
    y += 4;
  }
}

export function VRChatPanel({ messages }: { messages: ChatMessage[] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const isPresenting = useXR((s) => s.session != null);

  // Canvas texture
  const { ctx, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = TEX_W;
    c.height = TEX_H;
    const context = c.getContext('2d')!;
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    return { ctx: context, texture: tex };
  }, []);

  // Redraw when messages change
  useEffect(() => {
    drawPanel(ctx, messages);
    texture.needsUpdate = true;
  }, [messages, ctx, texture]);

  // Position panel in front of camera in VR
  useFrame(() => {
    if (!meshRef.current || !isPresenting) return;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    meshRef.current.position.copy(camera.position).add(dir.multiplyScalar(2));
    meshRef.current.position.y -= 0.1; // slightly below eye level
    meshRef.current.quaternion.copy(camera.quaternion);
  });

  if (!isPresenting) return null;

  return (
    <mesh ref={meshRef} renderOrder={9999}>
      <planeGeometry args={[PANEL_WIDTH, PANEL_HEIGHT]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.92}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
