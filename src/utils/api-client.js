// api-client.js — REWRITTEN 2026-05-09
// Spline has NO public REST API for scene object manipulation.

import dotenv from 'dotenv';
dotenv.config();

// ─── Scene Registry ─────────────────────────────────────────────────────────
// Phil's remixed workspace files (app.spline.design/community/file/{uuid})

export const SCENE_REGISTRY = {
  '02fd5870-f14c-4f7b-86d1-176e7e188e8e': {
    slug: 'shadow-blur',
    name: 'Shadow & Blur — depth / hot-cool face',
    lander_phase: 'SLOP → INTENT',
    description: 'Coin-disc DNA with shadow casting and blur depth. Drives the hot-face/cool-face shader duality.',
  },
  '0a38a488-99ce-4bdd-83ab-5a2d5bdb4092': {
    slug: 'granular-particle',
    name: 'Granular Texture + Particle Movement',
    lander_phase: 'INTENT → PORTAL',
    description: 'Granular noise gradient across DNA slices with particle motion. Core texture skin.',
  },
  'b740c3f6-4f55-4433-8e4f-696f326cd16c': {
    slug: 'scroll-version',
    name: 'Scrolling Version — camera Z-push',
    lander_phase: 'PORTAL → SANCTUARY',
    description: 'Scroll-driven camera push through the DNA mesh center.',
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
  return entry ?? null;
}

/** Extract file ID from any Spline URL format */
export function parseSceneUrl(url) {
  const patterns = [
    /app\.spline\.design\/community\/file\/([a-f0-9-]{36})/i,
    /app\.spline\.design\/file\/([a-f0-9-]{36})/i,
    /prod\.spline\.design\/([a-f0-9-]{36})/i,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ─── Backward-compat stubs ───────────────────────────────────────────────────

const NOTE = 'Spline has no public REST API. Use @splinetool/runtime or @splinetool/react-spline.';

export class SplineApiClient {
  async getScene(sceneId) {
    const meta = SCENE_REGISTRY[sceneId];
    return { id: sceneId, embedUrl: getSceneUrl(sceneId), ...(meta || {}), _note: NOTE };
  }
  async getObjects(sceneId) {
    return {
      _note: NOTE,
      hint: 'Use generateSceneInteractionCode with interactionType="explore" to enumerate objects at runtime.',
      code: `import { Application } from '@splinetool/runtime';
const spline = new Application(document.getElementById('canvas3d'));
await spline.load('${getSceneUrl(sceneId)}');
console.log(spline.getObjects().map(o => ({ name: o.name, type: o.type })));`,
    };
  }
  async getMaterials()  { return { _note: NOTE }; }
  async getStates()     { return { _note: NOTE }; }
  async getEvents()     { return { _note: NOTE }; }
  async getWebhooks()   { return { _note: NOTE }; }
  async updateObject()  { return { _note: NOTE }; }
  async createObject()  { return { _note: NOTE }; }
  async deleteObject()  { return { _note: NOTE }; }
  async updateMaterial(){ return { _note: NOTE }; }
  async triggerState()  { return { _note: NOTE }; }
  async triggerEvent()  { return { _note: NOTE }; }
  async createWebhook() { return { _note: NOTE }; }
  async deleteWebhook() { return { _note: NOTE }; }
  async configureApi()  { return { _note: NOTE }; }
  async getApis()       { return { _note: NOTE }; }
  async deleteApi()     { return { _note: NOTE }; }
  async triggerWebhook(){ return { _note: NOTE }; }
}

const apiClient = new SplineApiClient();
export default apiClient;

export async function fetchFromSplineApi(endpoint) {
  return { _note: `Spline has no public REST API. Endpoint '${endpoint}' does not exist.` };
}
export async function updateSplineObject() {
  return { _note: NOTE };
}
