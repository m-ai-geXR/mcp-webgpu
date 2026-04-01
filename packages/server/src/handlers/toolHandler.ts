import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, readFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SceneStateManager } from '../state/SceneStateManager.js';
import { WSServer } from '../ws/WSServer.js';
import { ChatRelay } from '../chat/ChatRelay.js';
import { SceneState, Vec3, MaterialDef, SceneLight, ParticleDef } from '../types.js';
import { buildStandaloneHTML } from '../export/standaloneExporter.js';

/** Resolve the `scenes/` directory at the monorepo root. */
function getScenesDir(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  // Walk up from dist/ (or src/) inside packages/server to monorepo root
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, 'scenes');
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  // Fallback: create scenes/ next to packages/
  const fallback = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'scenes');
  if (!existsSync(fallback)) mkdirSync(fallback, { recursive: true });
  return fallback;
}

export interface ToolContext {
  stateManager: SceneStateManager;
  wsServer: WSServer;
  chatRelay: ChatRelay;
}

type ToolResult = { content: Array<{ type: 'text'; text: string }> };

const ok = (text: string): ToolResult => ({ content: [{ type: 'text', text }] });
const err = (text: string): ToolResult => ({ content: [{ type: 'text', text: `Error: ${text}` }] });

export async function handleTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const { stateManager: sm, wsServer: ws, chatRelay: chat } = ctx;

  // ─── Object tools ──────────────────────────────────────────────────────────

  if (name === 'createObject') {
    const obj = sm.createObject(input as Parameters<typeof sm.createObject>[0]);
    ws.sendCommand({ action: 'createObject', commandId: uuidv4(), ...obj });
    return ok(`Created ${obj.type} with id "${obj.id}" at ${JSON.stringify(obj.position)}`);
  }

  if (name === 'updateObject') {
    const { id, ...props } = input as { id: string } & Partial<{
      position: Vec3;
      rotation: Vec3;
      scale: Vec3;
      material: MaterialDef;
      visible: boolean;
    }>;
    const obj = sm.updateObject(id, props);
    if (!obj) return err(`Object "${id}" not found`);
    ws.sendCommand({ action: 'updateObject', commandId: uuidv4(), ...obj });
    return ok(`Updated object "${id}"`);
  }

  if (name === 'deleteObject') {
    const { id } = input as { id: string };
    if (!sm.deleteObject(id)) return err(`Object "${id}" not found`);
    ws.sendCommand({ action: 'deleteObject', commandId: uuidv4(), id });
    return ok(`Deleted object "${id}"`);
  }

  if (name === 'cloneObject') {
    const { id, newId, offset } = input as {
      id: string;
      newId?: string;
      offset?: Partial<Vec3>;
    };
    const cloned = sm.cloneObject(id, newId, offset);
    if (!cloned) return err(`Object "${id}" not found`);
    ws.sendCommand({ action: 'createObject', commandId: uuidv4(), ...cloned });
    return ok(`Cloned "${id}" as "${cloned.id}"`);
  }

  if (name === 'getObject') {
    const { id } = input as { id: string };
    const obj = sm.getObject(id);
    if (!obj) return err(`Object "${id}" not found`);
    return ok(JSON.stringify(obj, null, 2));
  }

  if (name === 'getSceneState') {
    return ok(JSON.stringify(sm.getState(), null, 2));
  }

  // ─── Light tools ───────────────────────────────────────────────────────────

  if (name === 'createLight') {
    const light = sm.createLight(input as Parameters<typeof sm.createLight>[0]);
    ws.sendCommand({ action: 'createLight', commandId: uuidv4(), ...light });
    return ok(`Created ${light.lightType} light "${light.id}"`);
  }

  if (name === 'updateLight') {
    const { id, ...props } = input as { id: string } & Partial<SceneLight>;
    const light = sm.updateLight(id, props);
    if (!light) return err(`Light "${id}" not found`);
    ws.sendCommand({ action: 'updateLight', commandId: uuidv4(), ...light });
    return ok(`Updated light "${id}"`);
  }

  if (name === 'deleteLight') {
    const { id } = input as { id: string };
    if (!sm.deleteLight(id)) return err(`Light "${id}" not found`);
    ws.sendCommand({ action: 'deleteLight', commandId: uuidv4(), id });
    return ok(`Deleted light "${id}"`);
  }

  // ─── Camera tools ──────────────────────────────────────────────────────────

  if (name === 'setCamera') {
    const cam = sm.setCamera(input as Parameters<typeof sm.setCamera>[0]);
    ws.sendCommand({ action: 'setCamera', commandId: uuidv4(), ...cam });
    return ok(`Camera moved to ${JSON.stringify(cam.position)}, looking at ${JSON.stringify(cam.target)}`);
  }

  if (name === 'flyToObject') {
    const { id, distance = 3, duration = 1 } = input as {
      id: string;
      distance?: number;
      duration?: number;
    };
    const obj = sm.getObject(id);
    if (!obj) return err(`Object "${id}" not found`);
    ws.sendCommand({ action: 'flyToObject', commandId: uuidv4(), id, distance, duration });
    return ok(`Flying camera to object "${id}"`);
  }

  // ─── Animation tools ───────────────────────────────────────────────────────

  if (name === 'animateObject') {
    const { id, property, to, duration = 1, easing = 'linear', loop = false } = input as {
      id: string;
      property: string;
      to: Vec3 | number | string;
      duration?: number;
      easing?: string;
      loop?: boolean;
    };
    const obj = sm.getObject(id);
    if (!obj) return err(`Object "${id}" not found`);
    // For transform properties, update server state to target
    if (['position', 'rotation', 'scale'].includes(property)) {
      sm.updateObject(id, { [property]: to });
    }
    sm.addAnimation({ id, property: property as any, to, duration, easing, loop });
    ws.sendCommand({
      action: 'animateObject',
      commandId: uuidv4(),
      id,
      property,
      to,
      duration,
      easing,
      loop,
    });
    return ok(`Animating ${property} of "${id}" over ${duration}s`);
  }

  if (name === 'stopAnimation') {
    const { id } = input as { id: string };
    sm.removeAnimation(id);
    ws.sendCommand({ action: 'stopAnimation', commandId: uuidv4(), id });
    return ok(`Stopped animation on "${id}"`);
  }

  // ─── Environment tools ─────────────────────────────────────────────────────

  if (name === 'setEnvironment') {
    const env = sm.setEnvironment(input as Parameters<typeof sm.setEnvironment>[0]);
    ws.sendCommand({ action: 'setEnvironment', commandId: uuidv4(), ...env });
    return ok(`Environment updated: ${JSON.stringify(env)}`);
  }

  // ─── Scene tools ───────────────────────────────────────────────────────────

  if (name === 'clearScene') {
    sm.clearScene();
    const state = sm.getState();
    ws.sendCommand({ action: 'loadScene', commandId: uuidv4(), state });
    return ok('Scene cleared.');
  }

  if (name === 'loadScene') {
    const { sceneJson } = input as { sceneJson: string };
    let parsed: SceneState;
    try {
      parsed = JSON.parse(sceneJson) as SceneState;
    } catch {
      return err('Invalid scene JSON');
    }
    sm.loadScene(parsed);
    ws.sendCommand({ action: 'loadScene', commandId: uuidv4(), state: parsed });
    return ok('Scene loaded.');
  }

  if (name === 'exportScene') {
    return ok(JSON.stringify(sm.getState(), null, 2));
  }

  if (name === 'undo') {
    if (!sm.undo()) return err('Nothing to undo');
    const state = sm.getState();
    ws.sendCommand({ action: 'loadScene', commandId: uuidv4(), state });
    return ok('Undone.');
  }

  if (name === 'redo') {
    if (!sm.redo()) return err('Nothing to redo');
    const state = sm.getState();
    ws.sendCommand({ action: 'loadScene', commandId: uuidv4(), state });
    return ok('Redone.');
  }

  if (name === 'takeScreenshot') {
    if (!ws.hasClients()) return err('No browser client connected');
    try {
      const dataUrl = await ws.requestScreenshot();
      return ok(`Screenshot captured (data URL length: ${dataUrl.length})\n\n${dataUrl}`);
    } catch (e) {
      return err((e as Error).message);
    }
  }

  // ─── Chat tools ────────────────────────────────────────────────────────────

  if (name === 'getPendingUserMessages') {
    const msgs = chat.getPending();
    if (msgs.length === 0) return ok('No pending user messages.');
    return ok(JSON.stringify(msgs, null, 2));
  }

  if (name === 'sendChatMessage') {
    const { message, sessionId } = input as { message: string; sessionId?: string };
    chat.sendAIReply(message, sessionId);
    return ok(`Message sent to ${sessionId ?? 'all clients'}: "${message}"`);
  }

  if (name === 'clearPendingMessages') {
    chat.clearPending();
    return ok('Pending messages cleared.');
  }

  // ─── Scene persistence & export ─────────────────────────────────────────────

  // ─── Particle tools ───────────────────────────────────────────────────

  if (name === 'createParticles') {
    const p = sm.createParticles(input as Parameters<typeof sm.createParticles>[0]);
    ws.sendCommand({ action: 'createParticles', commandId: uuidv4(), ...p });
    return ok(`Created particle system "${p.id}" with ${p.count} particles`);
  }

  if (name === 'updateParticles') {
    const { id, ...props } = input as { id: string } & Partial<ParticleDef>;
    const p = sm.updateParticles(id, props);
    if (!p) return err(`Particle system "${id}" not found`);
    ws.sendCommand({ action: 'updateParticles', commandId: uuidv4(), ...p });
    return ok(`Updated particles "${id}"`);
  }

  if (name === 'deleteParticles') {
    const { id } = input as { id: string };
    if (!sm.deleteParticles(id)) return err(`Particle system "${id}" not found`);
    ws.sendCommand({ action: 'deleteParticles', commandId: uuidv4(), id });
    return ok(`Deleted particles "${id}"`);
  }

  // ─── Scene persistence & export ─────────────────────────────────────────────

  if (name === 'saveScene') {
    const scenesDir = getScenesDir();
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = ((input as { name?: string }).name || `scene-${ts}`) + '.json';
    const filePath = resolve(scenesDir, fileName);
    const state = sm.getState();
    writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
    return ok(`Scene saved to scenes/${fileName}`);
  }

  if (name === 'listScenes') {
    const scenesDir = getScenesDir();
    const files = readdirSync(scenesDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) return ok('No saved scenes found.');
    return ok(`Saved scenes:\n${files.map(f => `  - ${f}`).join('\n')}`);
  }

  if (name === 'loadSceneFromFile') {
    const { name: sceneName } = input as { name: string };
    const scenesDir = getScenesDir();
    const fileName = sceneName.endsWith('.json') ? sceneName : `${sceneName}.json`;
    const filePath = resolve(scenesDir, fileName);
    if (!existsSync(filePath)) return err(`Scene file "${fileName}" not found`);
    let parsed: SceneState;
    try {
      parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as SceneState;
    } catch {
      return err(`Failed to parse scene file "${fileName}"`);
    }
    sm.loadScene(parsed);
    ws.sendCommand({ action: 'loadScene', commandId: uuidv4(), state: parsed });
    return ok(`Scene loaded from scenes/${fileName}`);
  }

  if (name === 'exportStandaloneScene') {
    const scenesDir = getScenesDir();
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = ((input as { name?: string }).name || `export-${ts}`) + '.html';
    const filePath = resolve(scenesDir, fileName);
    const html = buildStandaloneHTML(sm.getState());
    writeFileSync(filePath, html, 'utf-8');
    return ok(`Standalone scene exported to scenes/${fileName} — open it in any browser!`);
  }

  // ─── Script execution ────────────────────────────────────────────────────

  if (name === 'executeScript') {
    const { code } = input as { code: string };
    if (!ws.hasClients()) return err('No browser client connected');
    try {
      const result = await ws.requestScript(code);
      return ok(result);
    } catch (e) {
      return err((e as Error).message);
    }
  }

  // ─── Behaviors ──────────────────────────────────────────────────────────

  if (name === 'addBehavior') {
    const { id, objectId, type, params } = input as { id: string; objectId: string; type: 'spin' | 'bob' | 'orbit' | 'lookAt' | 'pulse'; params?: Record<string, unknown> };
    const def = sm.addBehavior({ id, objectId, type, params });
    ws.sendCommand({ action: 'addBehavior', commandId: uuidv4(), ...def });
    return ok(`Behavior "${id}" (${type}) added to object "${objectId}"`);
  }

  if (name === 'removeBehavior') {
    const { id } = input as { id: string };
    if (!sm.removeBehavior(id)) return err(`Behavior "${id}" not found`);
    ws.sendCommand({ action: 'removeBehavior', commandId: uuidv4(), id });
    return ok(`Behavior "${id}" removed`);
  }

  return err(`Unknown tool: "${name}"`);
}
