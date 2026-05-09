import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Tool registrations ──────────────────────────────────────────────────────
import { registerObjectTools }           from './tools/object-tools.js';
import { registerMaterialTools }         from './tools/material-tools.js';
import { registerStateEventTools }       from './tools/state-event-tools.js';
import { registerApiWebhookTools }       from './tools/api-webhook-tools.js';
import { registerSceneTools }            from './tools/scene-tools.js';
import { registerActionTools }           from './tools/action-tools.js';
import { registerCompleteEventTools }    from './tools/complete-event-tools.js';
import { registerAdvancedMaterialTools } from './tools/advanced-material-tools.js';
import { registerLightingCameraTools }   from './tools/lighting-camera-tools.js';
import { registerDesignTools }           from './tools/design-tools.js';
import { registerRuntimeTools }          from './tools/runtime-tools.js';
import { registerLanderTools }           from './tools/lander-tools.js';   // Inferis lander
import { registerAssetTools }            from './tools/asset-tools.js';    // download + cache

// ── Resource + prompt registrations ────────────────────────────────────────
import { registerSceneResources }    from './resources/scene-resources.js';
import { registerMaterialResources } from './resources/material-resources.js';
import { registerStateEventResources } from './resources/state-event-resources.js';
import { registerCreationPrompts }   from './prompts/creation-prompts.js';
import { registerAnimationPrompts }  from './prompts/animation-prompts.js';
import { registerRuntimePrompts }    from './prompts/runtime-prompts.js';

async function main(options = {}) {
  // Load .env
  try {
    const envPath        = path.resolve(process.cwd(), '.env');
    const projectEnvPath = path.resolve(__dirname, '../.env');
    if      (options.config)                dotenv.config({ path: path.resolve(options.config) });
    else if (fs.existsSync(envPath))        dotenv.config({ path: envPath });
    else if (fs.existsSync(projectEnvPath)) dotenv.config({ path: projectEnvPath });
    else                                    dotenv.config();
  } catch { /* non-fatal */ }

  const server = new McpServer({
    name: 'Spline.design MCP Server',
    version: '1.1.0',
    description: 'Spline code-gen, asset management, and Inferis lander scaffold tools',
  });

  // Register all tools
  registerObjectTools(server);
  registerMaterialTools(server);
  registerStateEventTools(server);
  registerApiWebhookTools(server);
  registerSceneTools(server);
  registerActionTools(server);
  registerCompleteEventTools(server);
  registerAdvancedMaterialTools(server);
  registerLightingCameraTools(server);
  registerDesignTools(server);
  registerRuntimeTools(server);
  registerLanderTools(server);   // ← Inferis lander
  registerAssetTools(server);    // ← download + cache

  // Register resources + prompts
  registerSceneResources(server);
  registerMaterialResources(server);
  registerStateEventResources(server);
  registerCreationPrompts(server);
  registerAnimationPrompts(server);
  registerRuntimePrompts(server);

  const transportType = options.transport || 'stdio';

  if (transportType === 'http') {
    const port = options.port || 3000;
    const app  = express();
    app.use(express.json());
    const transports = {};

    app.post('/mcp', async (req, res) => {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => Math.random().toString(36).substring(2, 15),
        onsessioninitialized: (sid) => { transports[sid] = transport; },
      });
      transport.onclose = () => { if (transport.sessionId) delete transports[transport.sessionId]; };
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });

    const handleSession = async (req, res) => {
      const sid = req.headers['mcp-session-id'];
      if (!sid || !transports[sid]) { res.status(400).send('Invalid session ID'); return; }
      await transports[sid].handleRequest(req, res);
    };
    app.get('/mcp', handleSession);
    app.delete('/mcp', handleSession);
    app.listen(port);
    return { server, app };
  }

  // Default: stdio for Claude Desktop
  const transport = new StdioServerTransport();
  await server.connect(transport);
  return { server, transport };
}

// Fix: use fileURLToPath comparison instead of string matching
const isMainModule = process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  main().catch(err => { console.error('Error starting server:', err); process.exit(1); });
}

export { main };
