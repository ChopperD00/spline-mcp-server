// lander-tools.js
// 5 MCP tools for the Inferis lander Spline integration.
// No REST API required — pure code-gen + scene registry.

import { z } from 'zod';
import { getSceneUrl, getSceneRegistry, parseSceneUrl } from '../utils/api-client.js';

const SCENES = {
  'shadow-blur':       '7bf99578-b033-4eeb-b019-33ea51e27ba1',
  'granular-particle': 'fcb7291a-43a4-43b3-9e29-6bfe3451b51b',
  'scroll-version':    'f75c07a9-111d-4bdd-a39e-072b91972fc0',
};

const SCENE_ENUM = z.enum(['shadow-blur', 'granular-particle', 'scroll-version']);

export const registerLanderTools = (server) => {

  // ── 1. List scenes ───────────────────────────────────────────────────────
  server.tool('listInferisScenes', {}, async () => {
    const reg = getSceneRegistry();
    const text = Object.entries(reg)
      .map(([id, m]) => `${m.slug}\n  ID:    ${id}\n  Phase: ${m.lander_phase}\n  URL:   ${getSceneUrl(id)}\n  Desc:  ${m.description}`)
      .join('\n\n');
    return { content: [{ type: 'text', text: `INFERIS LANDER — SPLINE SCENES\n\n${text}` }] };
  });

  // ── 2. Embed scene (React component) ─────────────────────────────────────
  server.tool('embedScene', {
    sceneSlug: SCENE_ENUM.describe('Scene slug'),
    componentName: z.string().default('SplineScene'),
    opacity: z.number().min(0).max(1).default(1).describe('CSS opacity'),
    className: z.string().optional(),
  }, async ({ sceneSlug, componentName, opacity, className }) => {
    const id = SCENES[sceneSlug];
    const url = getSceneUrl(id);
    const code = `'use client';
import Spline from '@splinetool/react-spline';
import { useRef, useCallback } from 'react';

export default function ${componentName}({ className = '${className || ''}' }) {
  const splineRef = useRef(null);

  const onLoad = useCallback((app) => {
    splineRef.current = app;
  }, []);

  // Expose ref so parent can call splineRef.current.emitEvent() / setVariable()
  return (
    <div
      className={\`absolute inset-0 \${className}\`}
      style={{ opacity: ${opacity} }}
    >
      <Spline
        scene="${url}"
        onLoad={onLoad}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

export { splineRef };
`;
    return { content: [{ type: 'text', text: code }] };
  });

  // ── 3. GSAP ScrollTrigger integration for a single phase ─────────────────
  server.tool('getScrollIntegration', {
    sceneSlug: SCENE_ENUM.describe('Scene slug'),
    scrollPhase: z.enum(['SLOP', 'INTENT', 'PORTAL', 'SANCTUARY']),
  }, async ({ sceneSlug, scrollPhase }) => {
    const id = SCENES[sceneSlug];
    const url = getSceneUrl(id);

    const phases = {
      SLOP:      { start: 'top top',  end: '10% top',     opacity: 0.15, scrub: 2 },
      INTENT:    { start: '10% top',  end: '40% top',     opacity: 0.45, scrub: 1.5 },
      PORTAL:    { start: '40% top',  end: '80% top',     opacity: 0.9,  scrub: 1 },
      SANCTUARY: { start: '80% top',  end: 'bottom top',  opacity: 1.0,  scrub: 1 },
    };
    const cfg = phases[scrollPhase];

    const code = `// Inferis Lander — ${scrollPhase} phase scroll integration
// Scene: ${sceneSlug} (${id})
// Install: npm i @splinetool/react-spline gsap

'use client';
import { useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export default function ${scrollPhase}Scene() {
  const splineRef = useRef(null);
  const sectionRef = useRef(null);

  const onLoad = (app) => { splineRef.current = app; };

  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: '${cfg.start}',
      end: '${cfg.end}',
      scrub: ${cfg.scrub},
      onUpdate: ({ progress }) => {
        // Pass scroll progress into Spline scene as a variable
        splineRef.current?.setVariable?.('scrollProgress', progress);
${scrollPhase === 'INTENT' ? `
        // Decompress DNA slices as scroll begins
        splineRef.current?.setVariable?.('uCompress', 1 - progress);` : ''}
${scrollPhase === 'PORTAL' ? `
        // Drive camera Z-push through DNA center
        splineRef.current?.setVariable?.('cameraZ', progress * 12);` : ''}
${scrollPhase === 'SANCTUARY' ? `
        // Trigger bone panel reveal at 90%
        if (progress > 0.9) {
          gsap.to('#sanctuary-panel', { opacity: 1, duration: 0.6, ease: 'power3.out' });
        }` : ''}
      },
      onEnter:      () => splineRef.current?.emitEvent?.('mouseDown', 'DNA_Core'),
      onLeave:      () => splineRef.current?.emitEvent?.('mouseOut',  'DNA_Core'),
      onEnterBack:  () => splineRef.current?.emitEvent?.('mouseDown', 'DNA_Core'),
    });
    return () => st.kill();
  }, []);

  return (
    <section ref={sectionRef} className="relative w-full h-screen">
      <Spline
        scene="${url}"
        onLoad={onLoad}
        style={{ position: 'absolute', inset: 0, opacity: ${cfg.opacity} }}
      />
    </section>
  );
}
`;
    return { content: [{ type: 'text', text: code }] };
  });

  // ── 4. Claude Desktop config for UNICRON ─────────────────────────────────
  server.tool('getClaudeDesktopConfig', {
    serverPath: z.string().default('/Users/unicron/spline-mcp-server'),
  }, async ({ serverPath }) => {
    const cfg = {
      mcpServers: {
        'spline-design': {
          command: 'node',
          args: [`${serverPath}/index.js`],
          env: {},
        },
      },
    };
    const text = `Add to ~/.claude.json on UNICRON under mcpServers:\n\n${JSON.stringify(cfg.mcpServers['spline-design'], null, 2)}\n\nKey: "spline-design"\nThen restart Claude Desktop.`;
    return { content: [{ type: 'text', text }] };
  });

  // ── 5. Full lander scaffold — all 3 scenes combined ──────────────────────
  server.tool('getLanderScaffold', {
    typescript: z.boolean().default(true),
  }, async ({ typescript }) => {
    const shadowUrl   = getSceneUrl(SCENES['shadow-blur']);
    const particleUrl = getSceneUrl(SCENES['granular-particle']);
    const scrollUrl   = getSceneUrl(SCENES['scroll-version']);

    const code = `// INFERIS LANDER — Full Spline scroll scaffold
// 3-scene composite: shadow-blur + granular-particle + scroll-version
// Phases: SLOP → INTENT → PORTAL → SANCTUARY
// Install: npm i @splinetool/react-spline gsap

'use client';
import { useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const SCENE_URLS = {
  shadowBlur:      '${shadowUrl}',
  granularParticle:'${particleUrl}',
  scrollVersion:   '${scrollUrl}',
};

export default function InferisLander() {
  const refs = useRef${typescript ? '<Record<string,any>>' : ''}({});
  const rootRef = useRef${typescript ? '<HTMLElement|null>' : ''}(null);

  const onLoad = (key${typescript ? ': string' : ''}) => (app${typescript ? ': any' : ''}) => {
    refs.current[key] = app;
  };

  useEffect(() => {
    const ctx = gsap.context(() => {

      // SLOP → INTENT (0–40%)
      ScrollTrigger.create({
        trigger: '#lander-root',
        start: 'top top', end: '40% top', scrub: 1.5,
        onUpdate: ({ progress }) => {
          refs.current.shadowBlur?.setVariable?.('uCompress', 1 - progress);
          refs.current.granularParticle?.setVariable?.('evolveProgress', progress);
        },
      });

      // PORTAL (40–80%)
      ScrollTrigger.create({
        trigger: '#lander-root',
        start: '40% top', end: '80% top', scrub: 1,
        onUpdate: ({ progress }) => {
          refs.current.scrollVersion?.setVariable?.('cameraZ', progress * 12);
          refs.current.granularParticle?.setVariable?.('particleSpread', progress);
        },
        onEnter: () => refs.current.scrollVersion?.emitEvent?.('mouseDown', 'Camera'),
      });

      // SANCTUARY (80–100%)
      ScrollTrigger.create({
        trigger: '#lander-root',
        start: '80% top', end: 'bottom top', scrub: 1,
        onUpdate: ({ progress }) => {
          if (progress > 0.9) {
            gsap.to('#sanctuary-panel', { opacity: 1, duration: 0.5, ease: 'power3.out' });
          }
        },
      });

    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <main id="lander-root" ref={rootRef} className="relative">
      {/* Coral ambient field */}
      <div className="fixed inset-0 bg-[#FF4D30] opacity-25 pointer-events-none z-0" />

      {/* SLOP / INTENT — background particle layer */}
      <div className="fixed inset-0 z-1 pointer-events-none">
        <Spline scene={SCENE_URLS.shadowBlur}      onLoad={onLoad('shadowBlur')}
          style={{ position:'absolute', inset:0, opacity: 0.15 }} />
        <Spline scene={SCENE_URLS.granularParticle} onLoad={onLoad('granularParticle')}
          style={{ position:'absolute', inset:0, opacity: 0.12 }} />
      </div>

      {/* SLOP — hero panel */}
      <section className="relative h-screen flex items-center justify-center z-10">
        <div style={{ backdropFilter:'blur(24px)', background:'rgba(244,243,240,0.72)',
          padding:'56px 72px', maxWidth: 560 }}>
          <h1 className="font-display text-7xl tracking-tight text-[#1C1B1A]">inferis.</h1>
          <p className="font-mono text-xs text-[#1C1B1A] opacity-40 mt-6 tracking-widest uppercase">
            ↓ Scroll down to rise ↓
          </p>
        </div>
      </section>

      {/* PORTAL — camera push section */}
      <section className="relative h-screen z-10">
        <Spline scene={SCENE_URLS.scrollVersion} onLoad={onLoad('scrollVersion')}
          style={{ position:'absolute', inset:0 }} />
      </section>

      {/* SANCTUARY — gate panel */}
      <section className="relative h-screen z-10 flex items-center justify-center">
        <div id="sanctuary-panel" style={{ opacity:0, background:'#F4F3F0',
          padding:64, maxWidth:480,
          boxShadow:'0 0 80px rgba(255,77,48,0.28)' }}>
          <p className="font-display text-2xl tracking-tight text-[#1C1B1A]">inferis.</p>
          <p className="font-mono text-[11px] text-[#1C1B1A] opacity-50 mt-4 leading-relaxed">
            Generation without intent is just math.<br />Reclaim the canvas.
          </p>
          <div className="mt-8 border-b border-[#1C1B1A]">
            <input
              placeholder="> Request clearance_"
              className="w-full bg-transparent font-mono text-sm text-[#1C1B1A] outline-none py-2"
              style={{ caretColor:'#FF4D30' }}
            />
          </div>
          <button className="mt-6 w-full py-3 bg-[#1C1B1A] text-[#F4F3F0] font-mono text-sm tracking-widest">
            • ENTER
          </button>
          <p className="mt-8 font-mono text-[9px] text-[#1C1B1A] opacity-15">// INITIATIVE_SM_01</p>
        </div>
      </section>
    </main>
  );
}
`;
    return { content: [{ type: 'text', text: code }] };
  });

};
