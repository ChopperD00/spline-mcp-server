# spline-mcp-server

MCP server for [Spline.design](https://spline.design) — code generation, asset management, and Inferis lander scaffold tools.

> **Important:** Spline has no public REST API. This server generates code using `@splinetool/react-spline` + `@splinetool/runtime` and can download/cache `.splinecode` files. It does **not** attempt to call `api.spline.design`.

## Quick start

```bash
npm install
node index.js          # stdio (Claude Desktop)
node index.js --http   # HTTP on port 3000
```

## Claude Desktop (UNICRON)

Add to `~/.claude.json`:
```json
{
  "mcpServers": {
    "spline-design": {
      "command": "node",
      "args": ["/Users/unicron/spline-mcp-server/index.js"]
    }
  }
}
```

## Tools

### Inferis Lander
| Tool | Description |
|------|-------------|
| `listInferisScenes` | List Phil's 3 registered Spline files with phase + embed URL |
| `embedScene` | Generate React component for a single scene |
| `getScrollIntegration` | Generate GSAP ScrollTrigger + Spline scroll code for a phase |
| `getLanderScaffold` | Full composite lander: all 3 scenes + 4 scroll phases |
| `getClaudeDesktopConfig` | Output the claude.json config for UNICRON |

### Asset Management
| Tool | Description |
|------|-------------|
| `downloadScene` | Download + cache a `.splinecode` file locally |
| `downloadAllInferisScenes` | Download all 3 lander scenes at once |
| `listCachedScenes` | List cached files with sizes |
| `validateScene` | Check if a cached file is valid |
| `clearSceneCache` | Clear the local cache |

### Runtime Code Generation (always worked)
| Tool | Description |
|------|-------------|
| `generateReactComponent` | React component with optional interactivity |
| `generateAnimationCode` | Object animation (rotate/move/scale/color) |
| `generateSceneInteractionCode` | Event listeners, variables, camera, physics |
| `getRuntimeSetup` | Setup boilerplate for `@splinetool/runtime` |

### Webhook Servers
- `webhook-server.js` — receive events FROM Spline scenes
- `simple-webhook-server.js` — minimal webhook receiver
- `enhanced-webhook-server.js` — full webhook with logging

## Inferis Lander Scene Registry

| Slug | File ID | Phase |
|------|---------|-------|
| `shadow-blur` | `7bf99578-...` | SLOP → INTENT |
| `granular-particle` | `fcb7291a-...` | INTENT → PORTAL |
| `scroll-version` | `f75c07a9-...` | PORTAL → SANCTUARY |

Scenes must be **published in Spline** (Share → Publish to Web) before they can be downloaded or embedded.
