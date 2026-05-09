import { z } from 'zod';
import { getSceneUrl, getSceneRegistry, getSceneBySlug } from '../utils/api-client.js';

/**
 * INFERIS LANDER TOOLS
 * 5 tools for Phil's 3 Spline scenes + full lander scaffold
 * Scene IDs are the file UUIDs from app.spline.design
 */

const INFERIS_SCENES = {
  'shadow-blur':       '7bf99578-b033-4eeb-b019-33ea51e27ba1',
  'granular-particle': 'fcb7291a-43a4-43b3-9e29-6bfe3451b51b',
  'scroll-version':    'f75c07a9-111d-4bdd-a39e-072b91972fc0',
};

export const registerLanderTools = (server) => {

  // ── 1. List scenes ────────────────────────────────────────────────────────
  server.tool(
    'listInferisScenes',
    {},
    async () => {
      const registry = getSceneRegistry();
      const lines = Object.entries(registry)
        .map(([id, meta]) =>
          `• ${meta.slug}\n  ID:    ${id}\n  Phase: ${meta.lander_phase}\n  Desc:  ${meta.description}`
        )
        .join('\n\n');
      return {
        content: [{ type: 'text', text: `INFERIS LANDER — 3 SPLINE SCENES\n\n${lines}\n\nEmbed URL format:\nhttps://prod.spline.design/<FILE_ID>/scene.splinecode\n\nPublish scenes in Spline (Share → Publish) to activate prod URLs.` }],
      };
    }
  );

  // ── 2. Embed a scene ──────────────────────────────────────────────────────
  server.tool(
    'embedScene',
    {
      sceneSlug: z.enum(['shadow-blur', 'granular-particle', 'scroll-version'])
        .describe('Which Inferis Spline scene'),
      componentName: z.string().min(1).default('SplineScene')
        .describe('React component name'),
      opacity: z.number().min(0).max(1).default(1)
        .describe('CSS opacity (0.15 for background element)'),
    },
    async ({ sceneSlug, componentName, opacity }) => {
      const fileId = INFERIS_SCENES[sceneSlug];
      const sceneUrl = getSceneUrl(fileId);
      const code = `'use client';
import Spline from '@splinetool/react-spline';
import { useRef, useCallback } from 'react';

// Scene: ${sceneSlug} | Phase: ${getSceneRegistry()[fileId]?.lander_phase}
export default function ${componentName}({ className = '', style = {} }) {
  const splineRef = useRef(null);

  const onLoad = useCallback((splineApp) => {
    splineRef.current = splineApp;
    // Expose ref for parent scroll controller
    if (typeof window !== 'undefined') {
      window.__spline_${sceneSlug.replace(/-/g, '_')} = splineApp;
    }
  }, []);

  return (
    <div
      className={`absolute inset-0 pointer-events-none \${className}\`}
      style={{ opacity: ${opacity}, ...style }}
    >
      <Spline
        scene="${sceneUrl}"
        onLoad={onLoad}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

// Usage:
// import ${componentName} from './${componentName}';
// <${componentName} opacity={0.15} className="z-0" />

// Install: npm install @splinetool/react-spline
`;
      return { content: [{ type: 'text', text: code }] };
    }
  );

  // ── 3. GSAP ScrollTrigger + Spline integration ────────────────────────────
  server.tool(
    'getScrollIntegration',
    {
      scrollPhase: z.enum(['SLOP', 'INTENT', 'PORTAL', 'SANCTUARY'])
        .describe('Lander scroll phase'),
    },
    async ({ scrollPhase }) => {
      const phaseMap = {
        SLOP:      { slug: 'shadow-blur',       start: 'top top',   end: '10% top',  scrub: 2,   opacity: 0.15, desc: 'Dormant — coin-disc compressed, cool face toward camera' },
        INTENT:    { slug: 'granular-particle', start: '10% top',   end: '40% top',  scrub: 1.5, opacity: 0.4,  desc: 'Awakening — DNA slices separate, coral bleeds in' },
        PORTAL:    { slug: 'scroll-version',   start: '40% top',   end: '80% top',  scrub: 1.2, opacity: 0.85, desc: 'Descent — camera Z-pushes through DNA center' },
        SANCTUARY: { slug: 'shadow-blur',      start: '80% top',   end: 'bottom top', scrub: 1, opacity: 1.0,  desc: 'Arrival — bone panel assembles, stair-step wipe reveals gate' },
      };
      const cfg = phaseMap[scrollPhase];
      const fileId = INFERIS_SCENES[cfg.slug];
      const sceneUrl = getSceneUrl(fileId);

      const code = `// INFERIS LANDER — ${scrollPhase} scroll integration
// ${cfg.desc}
// Scene: ${cfg.slug} (${fileId})
// Install: npm install @splinetool/react-spline gsap

'use client';
import { useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function ${scrollPhase}Scene() {
  const splineRef = useRef(null);
  const wrapRef   = useRef(null);

  const onLoad = (splineApp) => {
    splineRef.current = splineApp;
  };

  useEffect(() => {
    if (!wrapRef.current) return;

    const trig = ScrollTrigger.create({
      trigger: wrapRef.current,
      start: '${cfg.start}',
      end:   '${cfg.end}',
      scrub: ${cfg.scrub},
      onUpdate: (self) => {
        const p = self.progress; // 0 → 1

        // Drive Spline variables with scroll progress
        if (splineRef.current) {
${scrollPhase === 'SLOP'      ? 