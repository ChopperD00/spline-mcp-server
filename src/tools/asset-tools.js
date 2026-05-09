// asset-tools.js
// Download + cache .splinecode files locally.
// prod.spline.design scene files ARE publicly accessible — no auth required.
// Borrowed concept from lesleslie/spline-mcp (Python) — ported to Node ESM.

import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { getSceneUrl, getSceneRegistry, parseSceneUrl } from '../utils/api-client.js';

const CACHE_DIR = process.env.SPLINE_CACHE_DIR ||
  path.join(process.env.HOME || '/tmp', '.spline-mcp', 'cache');

function ensureCache() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function cachedPath(fileId) {
  return path.join(CACHE_DIR, `${fileId}.splinecode`);
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

export const registerAssetTools = (server) => {

  // ── Download and cache a scene file ──────────────────────────────────────
  server.tool('downloadScene', {
    sceneId: z.string().describe('File UUID or full Spline URL'),
  }, async ({ sceneId }) => {
    ensureCache();

    // Accept full URLs or bare UUIDs
    const parsed = parseSceneUrl(sceneId);
    const id = parsed || sceneId.replace(/[^a-f0-9-]/gi, '');
    const url = getSceneUrl(id);
    const dest = cachedPath(id);

    if (fs.existsSync(dest)) {
      const stat = fs.statSync(dest);
      return { content: [{ type: 'text',
        text: `Already cached: ${dest} (${(stat.size/1024).toFixed(1)} KB)\nEmbed URL: ${url}` }] };
    }

    try {
      await downloadFile(url, dest);
      const stat = fs.statSync(dest);
      return { content: [{ type: 'text',
        text: `Downloaded: ${dest} (${(stat.size/1024).toFixed(1)} KB)\nEmbed URL: ${url}` }] };
    } catch (err) {
      return { content: [{ type: 'text',
        text: `Download failed: ${err.message}\nURL attempted: ${url}\nCheck that the scene is published in Spline (Share → Publish to Web).` }],
        isError: true };
    }
  });

  // ── Download all 3 Inferis lander scenes at once ──────────────────────────
  server.tool('downloadAllInferisScenes', {}, async () => {
    ensureCache();
    const reg = getSceneRegistry();
    const results = [];

    for (const [id, meta] of Object.entries(reg)) {
      const url = getSceneUrl(id);
      const dest = cachedPath(id);

      if (fs.existsSync(dest)) {
        const stat = fs.statSync(dest);
        results.push(`✅ ${meta.slug} — already cached (${(stat.size/1024).toFixed(1)} KB)`);
        continue;
      }

      try {
        await downloadFile(url, dest);
        const stat = fs.statSync(dest);
        results.push(`✅ ${meta.slug} — downloaded (${(stat.size/1024).toFixed(1)} KB)`);
      } catch (err) {
        results.push(`❌ ${meta.slug} — ${err.message} (publish in Spline first)`);
      }
    }

    return { content: [{ type: 'text',
      text: `INFERIS SCENES DOWNLOAD\nCache: ${CACHE_DIR}\n\n${results.join('\n')}` }] };
  });

  // ── List cached scenes ────────────────────────────────────────────────────
  server.tool('listCachedScenes', {}, async () => {
    ensureCache();
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.splinecode'));
    if (files.length === 0) {
      return { content: [{ type: 'text', text: `Cache empty. Run downloadAllInferisScenes first.\nCache dir: ${CACHE_DIR}` }] };
    }
    const reg = getSceneRegistry();
    const lines = files.map(f => {
      const id = f.replace('.splinecode', '');
      const stat = fs.statSync(path.join(CACHE_DIR, f));
      const meta = reg[id];
      return `${meta ? meta.slug : id}\n  File: ${path.join(CACHE_DIR, f)}\n  Size: ${(stat.size/1024).toFixed(1)} KB\n  URL:  ${getSceneUrl(id)}`;
    });
    return { content: [{ type: 'text', text: `CACHED SCENES (${files.length})\n\n${lines.join('\n\n')}` }] };
  });

  // ── Validate a cached scene ───────────────────────────────────────────────
  server.tool('validateScene', {
    sceneId: z.string().describe('File UUID'),
  }, async ({ sceneId }) => {
    const dest = cachedPath(sceneId);
    if (!fs.existsSync(dest)) {
      return { content: [{ type: 'text',
        text: `Not cached. Run downloadScene first.\nLooked for: ${dest}` }], isError: true };
    }
    const stat = fs.statSync(dest);
    const raw = fs.readFileSync(dest);
    // .splinecode files are ZIP archives — check magic bytes
    const isZip = raw[0] === 0x50 && raw[1] === 0x4B;
    const status = isZip ? '✅ Valid (.splinecode ZIP)' : '⚠️  Unexpected format (not a ZIP)';
    return { content: [{ type: 'text',
      text: `${status}\nFile: ${dest}\nSize: ${(stat.size/1024).toFixed(1)} KB\nEmbed URL: ${getSceneUrl(sceneId)}` }] };
  });

  // ── Clear cache ───────────────────────────────────────────────────────────
  server.tool('clearSceneCache', {
    confirm: z.boolean().describe('Must be true to proceed'),
  }, async ({ confirm }) => {
    if (!confirm) return { content: [{ type: 'text', text: 'Pass confirm: true to clear.' }] };
    ensureCache();
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.splinecode'));
    files.forEach(f => fs.unlinkSync(path.join(CACHE_DIR, f)));
    return { content: [{ type: 'text', text: `Cleared ${files.length} cached scene(s) from ${CACHE_DIR}` }] };
  });

};
