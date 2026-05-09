// lander-tools.js
// 5 MCP tools for the Inferis lander Spline integration.

import { z } from 'zod';
import { getSceneUrl, getSceneRegistry } from '../utils/api-client.js';

// Phil's remixed workspace files
const SCENES = {
  'shadow-blur':       '02fd5870-f14c-4f7b-86d1-176e7e188e8e',
  'granular-particle': '0a38a488-99ce-4bdd-83ab-5a2d5bdb4092',
  'scroll-version':    'b740c3f6-4f55-4433-8e4f-696f326cd16c',
};

const SCENE_ENUM = z.enum(['shadow-blur', 'granular-particle', 'scroll-version']);

export const registerLanderTools = (server) => {

  server.tool('listInferisScenes', {}, async () => {
    const reg = getSceneRegistry();
    const text = Object.entries(reg)
      .map(([id, m]) => `${m.slug}\n  ID:    ${id}\n  Phase: ${m.lander_phase}\n  URL:   ${getSceneUrl(id)}\n  Desc:  ${m.description}`)
      .join('\n\n');
    return { content: [{ type: 'text', text: `INFERIS LANDER — SPLINE SCENES\n\n${text}` }] };
  });

  server.tool('embedScene', {
    sceneSlug: SCENE_ENUM.describe('Scene slug'),
    componentName: z.string().default('SplineScene'),
    opacity: z.number().min(0).max(1).default(1),
    className: z.string().optional(),
  }, async ({ sceneSlug, componentName, opacity, className }) => {
    const url = getSceneUrl(SCENES[sceneSlug]);
    const code = `'use client';
import Spline from '@splinetool/react-spline';
import { useRef, useCallback } from 'react';

export default function ${componentName}({ className = '${className || ''}' }) {
  const splineRef = useRef(null);
  const onLoad = useCallback((app) => { splineRef.current = app; }, []);

  return (
    <div className={\`absolute inset-0 \${className}\`} style={{ opacity: ${opacity} }}>
      <Spline scene="${url}" onLoad={onLoad} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
export { splineRef };
`;
    return { content: [{ type: 'text', text: code }] };
  });

  server.tool('getScrollIntegration', {
    sceneSlug: SCENE_ENUM,
    scrollPhase: z.enum(['SLOP', 'INTENT', 'PORTAL', 'SANCTUARY']),
  }, async ({ sceneSlug, scrollPhase }) => {
    const url = getSceneUrl(SCENES[sceneSlug]);
    const phases = {
      SLOP:      { start: 'top top',  end: '10% top',    opacity: 0.15, scrub: 2   },
      INTENT:    { start: '10% top',  end: '40% top',    opacity: 0.45, scrub: 1.5 },
      PORTAL:    { start: '40% top',  end: '80% top',    opacity: 0.9,  scrub: 1   },
      SANCTUARY: { start: '80% top',  end: 'bottom top', opacity: 1.0,  scrub: 1   },
    };
    const cfg = phases[scrollPhase];
    const code = `// ${scrollPhase} — ${sceneSlug}
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
      start: '${cfg.start}', end: '${cfg.end}', scrub: ${cfg.scrub},
      onUpdate: ({ progress }) => {
        splineRef.current?.setVariable?.('scrollProgress', progress);
${scrollPhase === 'INTENT' ? `        splineRef.current?.setVariable?.('uCompress', 1 - progress);` : ''}
${scrollPhase === 'PORTAL' ? `        splineRef.current?.setVariable?.('cameraZ', progress * 12);` : ''}
${scrollPhase === 'SANCTUARY' ? `        if (progress > 0.9) gsap.to('#sanctuary-panel', { opacity: 1, duration: 0.6, ease: 'power3.out' });` : ''}
      },
      onEnter:     () => splineRef.current?.emitEvent?.('mouseDown', 'DNA_Core'),
      onLeave:     () => splineRef.current?.emitEvent?.('mouseOut',  'DNA_Core'),
      onEnterBack: () => splineRef.current?.emitEvent?.('mouseDown', 'DNA_Core'),
    });
    return () => st.kill();
  }, []);

  return (
    <section ref={sectionRef} className="relative w-full h-screen">
      <Spline scene="${url}" onLoad={onLoad}
        style={{ position: 'absolute', inset: 0, opacity: ${cfg.opacity} }} />
    </section>
  );
}
`;
    return { content: [{ type: 'text', text: code }] };
  });

  server.tool('getClaudeDesktopConfig', {
    serverPath: z.string().default('/Users/unicron/spline-mcp-server'),
  }, async ({ serverPath }) => {
    const text = `Add to ~/.claude.json under mcpServers:\n\n"spline-design": {\n  "command": "node",\n  "args": ["${serverPath}/index.js"],\n  "env": {},\n  "type": "stdio"\n}\n\nThen restart Claude Desktop.`;
    return { content: [{ type: 'text', text }] };
  });

  server.tool('getLanderScaffold', {
    typescript: z.boolean().default(true),
  }, async ({ typescript }) => {
    const shadowUrl   = getSceneUrl(SCENES['shadow-blur']);
    const particleUrl = getSceneUrl(SCENES['granular-particle']);
    const scrollUrl   = getSceneUrl(SCENES['scroll-version']);
    const code = `// INFERIS LANDER — Full Spline scroll scaffold
// SLOP → INTENT → PORTAL → SANCTUARY
// npm i @splinetool/react-spline gsap

'use client';
import { useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const SCENES = {
  shadowBlur:       '${shadowUrl}',
  granularParticle: '${particleUrl}',
  scrollVersion:    '${scrollUrl}',
};

export default function InferisLander() {
  const refs = useRef${typescript ? '<Record<string,any>>' : ''}({});
  const rootRef = useRef${typescript ? '<HTMLElement|null>' : ''}(null);
  const onLoad = (key${typescript ? ': string' : ''}) => (app${typescript ? ': any' : ''}) => { refs.current[key] = app; };

  useEffect(() => {
    const ctx = gsap.context(() => {

      // SLOP → INTENT
      ScrollTrigger.create({
        trigger: '#lander-root', start: 'top top', end: '40% top', scrub: 1.5,
        onUpdate: ({ progress }) => {
          refs.current.shadowBlur?.setVariable?.('uCompress', 1 - progress);
          refs.current.granularParticle?.setVariable?.('evolveProgress', progress);
        },
      });

      // PORTAL
      ScrollTrigger.create({
        trigger: '#lander-root', start: '40% top', end: '80% top', scrub: 1,
        onUpdate: ({ progress }) => {
          refs.current.scrollVersion?.setVariable?.('cameraZ', progress * 12);
        },
        onEnter: () => refs.current.scrollVersion?.emitEvent?.('mouseDown', 'Camera'),
      });

      // SANCTUARY
      ScrollTrigger.create({
        trigger: '#lander-root', start: '80% top', end: 'bottom top', scrub: 1,
        onUpdate: ({ progress }) => {
          if (progress > 0.9) gsap.to('#sanctuary-panel', { opacity: 1, duration: 0.5, ease: 'power3.out' });
        },
      });

    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <main id="lander-root" ref={rootRef} className="relative">
      <div className="fixed inset-0 bg-[#FF4D30] opacity-25 pointer-events-none z-0" />

      <div className="fixed inset-0 z-1 pointer-events-none">
        <Spline scene={SCENES.shadowBlur}       onLoad={onLoad('shadowBlur')}
          style={{ position:'absolute', inset:0, opacity:0.15 }} />
        <Spline scene={SCENES.granularParticle} onLoad={onLoad('granularParticle')}
          style={{ position:'absolute', inset:0, opacity:0.12 }} />
      </div>

      <section className="relative h-screen flex items-center justify-center z-10">
        <div style={{ backdropFilter:'blur(24px)', background:'rgba(244,243,240,0.72)', padding:'56px 72px', maxWidth:560 }}>
          <h1 className="font-display text-7xl tracking-tight text-[#1C1B1A]">inferis.</h1>
          <p className="font-mono text-xs text-[#1C1B1A] opacity-40 mt-6 tracking-widest">↓ SCROLL DOWN TO RISE ↓</p>
        </div>
      </section>

      <section className="relative h-screen z-10">
        <Spline scene={SCENES.scrollVersion} onLoad={onLoad('scrollVersion')}
          style={{ position:'absolute', inset:0 }} />
      </section>

      <section className="relative h-screen z-10 flex items-center justify-center">
        <div id="sanctuary-panel" style={{ opacity:0, background:'#F4F3F0', padding:64, maxWidth:480, boxShadow:'0 0 80px rgba(255,77,48,0.28)' }}>
          <p className="font-display text-2xl text-[#1C1B1A]">inferis.</p>
          <p className="font-mono text-[11px] text-[#1C1B1A] opacity-50 mt-4">
            Generation without intent is just math.<br />Reclaim the canvas.
          </p>
          <div className="mt-8 border-b border-[#1C1B1A]">
            <input placeholder="> Request clearance_"
              className="w-full bg-transparent font-mono text-sm text-[#1C1B1A] outline-none py-2" />
          </div>
          <button className="mt-6 w-full py-3 bg-[#1C1B1A] text-[#F4F3F0] font-mono text-sm tracking-widest">• ENTER</button>
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
