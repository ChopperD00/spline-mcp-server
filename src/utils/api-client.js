import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

/**
 * SPLINE API CLIENT — REWRITTEN
 *
 * Spline does NOT have a public REST API for scene object manipulation.
 * The endpoints this file previously called (api.spline.design/scenes/*/objects etc.)
 * do not exist and will always return 404/401.
 *
 * What Spline DOES offer:
 *   1. @splinetool/runtime — embed + control scenes at runtime in the browser
 *   2. @splinetool/react-spline — React wrapper for the runtime
 *   3. Webhooks — Spline POSTs to your server when scene events fire
 *
 * This module now provides:
 *   - Scene registry for known Inferis lander scenes
 *   - URL helpers for prod.spline.design embed URLs
 *   - Backward-compat stubs that return code snippets instead of crashing
 */

// ─── Scene Registry ──────────────────────────────────────────────────────────

export const SCENE_REGISTRY = {
  '7bf99578-b033-4eeb-b019-33ea51e27ba1': {
    slug: 'shadow-blur',
    name: 'Shadow & Blur — depth / hot-cool face',
    lander_phase: 'SLOP → INTENT',
    description: 'Coin-disc DNA with shadow casting and blur depth. Hot-face/cool-face shader duality. uCompress uniform drives slice compression.',
  },
  'fcb7291a-43a4-43b3-9e29-6bfe3451b51b': {
    slug: 'granular-particle',
    name: 'Granular Texture + Particle Movement',
    lander_phase: 'INTENT → PORTAL',
    description: 'Granular noise gradient across DNA slices with particle motion. Core texture skin for the coin-disc geometry.',
  },
  'f75c07a9-111d-4bdd-a39e-072b91972fc0': {
    slug: 'scroll-version',
    name: 'Scrolling Version — camera Z-push',
    lander_phase: 'PORTAL → SANCTUARY',
    description: 'Scroll-driven camera push through the DNA mesh center. GSAP ScrollTrigger maps scroll progress to camera Z position.',
  },
};

// ─── URL Helpers ─────────────────────────────────────────────────────────────

export function getSceneUrl(fileId) {
  return `https://prod.spline.design/${fileId}/scene.splinecode`;
}

export function getSceneRegistry() {
  return SCENE_REGISTRY;
}

export function getSceneBySlug(slug) {
  const entry = Object.entries(SCENE_REGISTRY).find(([, v]) => v.slug === slug);
  return entry ? { id: entry[0], ...entry[1] } : null;
}

export function getAllSceneIds() {
  return Object.keys(SCENE_REGISTRY);
}

// ─── Backward-compat stubs ───────────────────────────────────────────────────
// Tools that previously called apiClient.getScene() etc. now get helpful
// code-gen responses instead of 404 errors.

export class SplineApiClient {
  constructor() {}

  async getScene(sceneId) {
    const meta = SCENE_REGISTRY[sceneId];
    return {
      id: sceneId,
      url: getSceneUrl(sceneId),
      ...(meta ?? { name: 'Unknown scene', description: 'Add this scene to SCENE_REGISTRY in api-client.js' }),
      _note: 'Spline has no public REST API. Use @splinetool/runtime or @splinetool/react-spline to interact with this scene at runtime.',
    };
  }

  async getObjects(sceneId) {
    return {
      _note: 'Object enumeration requires runtime access — Spline has no REST API for this.',
      code: [
        `import { Application } from '@splinetool/runtime';`,
        `const canvas = document.getElementById('canvas3d');`,
        `const spline = new Application(canvas);`,
        `await spline.load('${getSceneUrl(sceneId)}');`,
        `const objects = spline.getObjects();`,
        `console.log(objects.map(o => ({ name: o.name, type: o.type })));`,
      ].join('\n'),
    };
  }

  async getMaterials(sceneId) {
    return {
      _note: 'Material enumeration requires runtime access.',
      code: `// After spline.load(), access materials via:\nconst obj = spline.findObjectByName('YourObject');\nif (obj?.material) console.log(obj.material);`,
    };
  }

  async getStates(sceneId) {
    return {
      _note: 'State enumeration requires runtime access.',
      code: `// Trigger a state via event emission:\nspline.emitEvent('mouseDown', 'StateMachineObject');`,
    };
  }

  async getEvents(sceneId) {
    return {
      _note: 'Event listening requires runtime access.',
      code: `spline.addEventListener('mouseDown', (e) => console.log('Event on:', e.target.name));`,
    };
  }

  // All mutation methods return code snippets
  async updateObject(sceneId, objectId, properties) {
    return {
      _note: 'Use @splinetool/runtime for object manipulation.',
      code: `const obj = spline.findObjectByName('${objectId}');\nif (obj) { Object.assign(obj, ${JSON.stringify(properties, null, 2)}); }`,
    };
  }

  async triggerState(sceneId, stateId) {
    return {
      _note: 'Trigger states via emitEvent.',
      code: `spline.emitEvent('mouseDown', '${stateId}');`,
    };
  }

  async triggerEvent(sceneId, eventId, eventData = {}) {
    return {
      _note: 'Trigger events via emitEvent.',
      code: `spline.emitEvent('${eventId}', '${sceneId}');`,
    };
  }

  // Webhook methods are unchanged — these DO work
  async createWebhook(sceneId, webhookData) {
    return { _note: 'Configure webhooks in the Spline editor UI under Export > Webhooks.' };
  }
}

const apiClient = new SplineApiClient();
export default apiClient;

export async function fetchFromSplineApi(endpoint, options = {}) {
  return {
    _note: `Spline has no public REST API at ${endpoint}. Use the runtime tools instead.`,
  };
}

export async function updateSplineObject(sceneId, objectId, properties) {
  return apiClient.updateObject(sceneId, objectId, properties);
}
