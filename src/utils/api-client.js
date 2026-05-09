// api-client.js — REWRITTEN 2026-05-09
// Spline has NO public REST API for scene object manipulation.
// The original called https://api.spline.design/scenes/{id}/objects|materials
// — these endpoints do not exist. Every tool that used them returned 404/401.
//
// This module now provides:
//   1. SCENE_REGISTRY — known Inferis lander file IDs + metadata
//   2. URL helpers — prod.spline.design scene URLs
//   3. Backward-compat stubs — return helpful code snippets instead of crashing

import dotenv from 'dotenv';
dotenv.config();

// ─── Scene Registry ────────────────────────────────────────────────────────
// Add your Spline file UUIDs here (from app.spline.design/file/{uuid})

export const SCENE_REGISTRY = {
  '7bf99578-b033-4eeb-b019-33ea51e27ba1': {
    slug: 'shadow-blur',
    name: 'Shadow & Blur — depth / hot-cool face',
    lander_phase: 'SLOP → INTENT',
    description: 'Coin-disc DNA with shadow casting and blur depth. Drives the hot-face/cool-face shader duality.',
  },
  'fcb7291a-43a4-43b3-9e29-6bfe3451b51b': {
    slug: 'granular-particle',
    name: 'Granular Texture + Particle Movement',
    lander_phase: 'INTENT → PORTAL',
    description: 'Granular noise gradient across DNA slices with particle motion. Core texture skin.',
  },
  'f75c07a9-111d-4bdd-a39e-072b91972fc0': {
    slug: 'scroll-version',
    name: 'Scrolling Version — camera Z-push',
    lander_phase: 'PORTAL → SANCTUARY',
    description: 'Scroll-driven camera push through the DNA mesh center.',
  },
};

// ─── URL Helpers ────────────────────────────────────────────────────────────

/** Returns the prod.spline.design scene URL for @splinetool/react-spline */
export function getSceneUrl(fileId) {
  return `https://prod.spline.design/${fileId}/scene.splinecode`;
}

/** Returns the full scene registry */
export function getSceneRegistry() {
  return SCENE_REGISTRY;
}

/** Find a scene entry by slug. Returns [fileId, metadata] or null. */
export function getSceneBySlug(slug) {
  const entry = Object.entries(SCENE_REGISTRY).find(([, v]) => v.slug === slug);
  return entry ?? null;
}

/** Extract file ID from a full Spline URL (app.spline.design or prod.spline.design) */
export function parseSceneUrl(url) {
  const patterns = [
    /app\.spline\.design\/file\/([a-f0-9-]{36})/i,
    /prod\.spline\.design\/([a-f0-9-]{36})/i,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ─── Backward-compat stubs ──────────────────────────────────────────────────
// Tools that previously called apiClient.getObjects() etc now receive
// a helpful message + code snippet instead of a network crash.

const NOTE = 'Spline has no public REST API. Use @splinetool/runtime or @splinetool/react-spline for runtime interaction.';

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
