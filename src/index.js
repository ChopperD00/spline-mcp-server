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

// Tool registrations
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
import { registerLanderTools }           from './tools/lander-tools.js';

// Resource registrations
import { registerSceneResources }      from './resources/scene-resources.js';
import { registerMaterialResources }   from './resources/material-resources.js';
import { registerStateEventResources } from './resources/state-event-resources.js';

// Prompt registrations
import { registerCreationPrompts }  from './prompts/creation-prompts.js';
import { registerAnimationPrompts } from './prompts/animation-prompts.js';
import { registerRuntimePrompts }   from './prompts/runtime-prompts.js';

async function main(options = {}) {
  // Load env
  try {
    const envPath        = path.resolve(process.cwd(), '.env');
    const projectEnvPath = path.resolve(__dirname, '../.env');
    if (options.config) {
      dotenv.config({ path: path.resolve(options.config) });
    } else if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    } else if (fs.existsSync(projectEnvPath)) {
      dotenv.config({ path: projectEnvPath });
    } else {
      dotenv.config();
    }
  } catch (_) {}

  const server = new McpServer({
    name: 'Spline.design MCP Server',
    version: '2.0.0',
    description: 'Spline runtime code generation + Inferis lander tools. Includes 5 lander-specific tools for the 3 Inferis Spline scenes.',
  });

  // Core tools (code-gen based — no REST API calls)
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

  // Runtime tools — @splinetool/runtime + @splinetool/react-spline code gen
  registerRuntimeTools(server);

  // Inferis lander tools — 5 tools for the 3 Spline scenes
  registerLanderTools(server);

  // Resources + prompts
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
        onsessioninitialized: (sessionId) => { transports[sessionId] = transport; },
      });
      transport.onclose = () => { if (transport.sessionId) delete transports[transport.sessionId]; };
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });

    const handleSession = async (req, res) => {
      const sessionId = req.headers['mcp-session-id'];
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }
      await transports[sessionId].handleRequest(req, res);
    };

    app.get('/mcp',    handleSession);
    app.delete('/mcp', handleSession);

    app.listen(port);
    return { server, app };

  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    return { server, transport };
  }
}

// Fix: use fileURLToPath comparison so this works regardless of how node is invoked
const isMainModule = (() => {
  try {
    return (
      process.argv[1] != null &&
      fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
    );
  } catch (_) {
    return false;
  }
})();

if (isMainModule) {
  main().catch((error) => {
    console.error('Error starting server:', error);
    process.exit(1);
  });
}

export { main };
