#!/usr/bin/env node
// Load .env FIRST — before any other imports that might read env vars.
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Walk up from the server package dir to find the workspace-root .env */
function findEnv(): string {
  const explicit = process.env['DOTENV_PATH'];
  if (explicit) return explicit;

  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  return '.env'; // fallback
}

const envPath = findEnv();
config({ path: envPath });
console.error(`[env] Loaded ${envPath}`);

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { SceneStateManager } from './state/SceneStateManager.js';
import { MessageQueue } from './chat/MessageQueue.js';
import { ChatRelay, Provider } from './chat/ChatRelay.js';
import { WSServer } from './ws/WSServer.js';
import { allTools } from './tools/index.js';
import { handleTool } from './handlers/toolHandler.js';
import { handlePrompt } from './handlers/promptHandler.js';
import { handleResource } from './handlers/resourceHandler.js';

// ─── Configuration ────────────────────────────────────────────────────────────

const WS_PORT = parseInt(process.env['WS_PORT'] ?? '8083', 10);
const MCP_SERVER_NAME = process.env['MCP_SERVER_NAME'] ?? 'maige-3d-mcp';
const AUTO_OPEN = process.env['AUTO_OPEN_BROWSER'] !== 'false';
const DEFAULT_FRAMEWORK = process.env['DEFAULT_FRAMEWORK'] ?? 'threejs';
const CLIENT_PORT = parseInt(process.env['CLIENT_PORT'] ?? '5173', 10);

// ─── Initialise services ──────────────────────────────────────────────────────

const stateManager = new SceneStateManager();
const messageQueue = new MessageQueue();
const wsServer = new WSServer(WS_PORT);
const chatRelay = new ChatRelay(messageQueue, wsServer, {
  openaiKey: process.env['OPENAI_API_KEY'],
  openaiModel: process.env['OPENAI_MODEL'] ?? 'gpt-4.1',
  anthropicKey: process.env['ANTHROPIC_API_KEY'],
  anthropicModel: process.env['ANTHROPIC_MODEL'] ?? 'claude-sonnet-4-6',
  googleKey: process.env['GOOGLE_API_KEY'],
  googleModel: process.env['GOOGLE_MODEL'] ?? 'gemini-2.5-flash',
  mistralKey: process.env['MISTRAL_API_KEY'],
  mistralModel: process.env['MISTRAL_MODEL'] ?? 'mistral-large-latest',
  groqKey: process.env['GROQ_API_KEY'],
  groqModel: process.env['GROQ_MODEL'] ?? 'llama-3.3-70b-versatile',
  xaiKey: process.env['XAI_API_KEY'],
  xaiModel: process.env['XAI_MODEL'] ?? 'grok-3',
  cohereKey: process.env['COHERE_API_KEY'],
  cohereModel: process.env['COHERE_MODEL'] ?? 'command-r-plus',
  togetherKey: process.env['TOGETHER_API_KEY'],
  togetherModel: process.env['TOGETHER_MODEL'] ?? 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  ollamaBaseUrl: process.env['OLLAMA_BASE_URL'],
  ollamaModel: process.env['OLLAMA_MODEL'] ?? 'llama3.2',
  provider: (process.env['CHAT_PROVIDER'] as Provider | undefined) ?? 'openai',
});

wsServer.init(stateManager, chatRelay);
chatRelay.setStateManager(stateManager);

const ctx = { stateManager, wsServer, chatRelay };

if (chatRelay.isDirectMode()) {
  console.error('[maige-3d-mcp] In-world chat: DIRECT mode (server-side AI active)');
} else {
  console.error(
    '[maige-3d-mcp] In-world chat: RELAY mode (AI client polls getPendingUserMessages)',
  );
}

// ─── MCP Server ───────────────────────────────────────────────────────────────

const mcpServer = new Server(
  { name: MCP_SERVER_NAME, version: '0.1.0' },
  { capabilities: { prompts: {}, tools: {}, resources: {} } },
);

mcpServer.onerror = (error) => console.error('[MCP Error]', error);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: allTools }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
mcpServer.setRequestHandler(ListPromptsRequestSchema, async () => handlePrompt('list', null) as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
mcpServer.setRequestHandler(GetPromptRequestSchema, async (request) => handlePrompt('get', request.params) as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => handleResource('list', null, ctx) as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request) => handleResource('read', request.params as { uri: string }, ctx) as any);

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: input } = request.params;
  return handleTool(name, (input ?? {}) as Record<string, unknown>, ctx);
});

// ─── Auto-open browser ────────────────────────────────────────────────────────

async function tryOpenBrowser(): Promise<void> {
  if (!AUTO_OPEN) return;
  try {
    const { default: open } = await import('open');
    const url = `http://localhost:${CLIENT_PORT}?framework=${DEFAULT_FRAMEWORK}&wsPort=${WS_PORT}`;
    await open(url);
    console.error(`[maige-3d-mcp] Opened: ${url}`);
  } catch {
    // Non-critical — browser auto-open is best-effort
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);

  console.error(`[maige-3d-mcp] MCP server ready (stdio)`);
  console.error(`[maige-3d-mcp] WebSocket bridge: ws://localhost:${WS_PORT}`);
  console.error(`[maige-3d-mcp] Open the client at: http://localhost:${CLIENT_PORT}`);

  setTimeout(() => void tryOpenBrowser(), 1500);
}

process.on('SIGINT', async () => {
  wsServer.close();
  await mcpServer.close();
  process.exit(0);
});

main().catch((err) => {
  console.error('[maige-3d-mcp] Fatal:', err);
  process.exit(1);
});
