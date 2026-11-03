'use client';

/* Before/after comparison slider. Adapted from Compare Reveal by Motiq
   (https://motiq.dev/components/compare-reveal), MIT licensed, picked from 21st.dev.
   Kept: the spring that follows the pointer, the one-time intro sweep, keyboard control and
   double-click to centre. Changed for Taster: plain CSS on the registry tokens, no glow, no
   blurred glass chips and no all-caps labels (captions sit under the frame instead). The loop
   stops once the divider is at rest and starts again on pointer or key input; the spring itself
   is in compare-spring.ts. */
// Upstream license: MIT, Copyright (c) 2026 Mahammad Rustamov (https://github.com/RMahammad/motiq). Full text in THIRD_PARTY_NOTICES.md.

import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp, step } from './compare-spring.ts';

type Side = { src: string; alt: string };

const KEY_STEP = 2;
const KEY_STEP_LARGE = 10;

// web/scripts/compare/render.mjs writes each picture at 1600x1072 and a 780px wide copy, <name>-780.jpg, so a phone
// downloads the small one. SIZES follows .page in globals.css: 1120px at most, 16px side padding, 32px from 768px up.
const WIDTH = 1600;
const HEIGHT = 1072;
const SIZES = '(min-width: 1120px) 1056px, (min-width: 768px) calc(100vw - 64px), calc(100vw - 32px)';
const srcSetOf = (src: string) => `${src.replace(/\.jpg$/, '-780.jpg')} 780w, ${src} ${WIDTH}w`;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export function CompareReveal({ before, after, label }: { before: Side; after: Side; label: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const [onScreen, setOnScreen] = useState(false);
  const sim = useRef({ x: 50, v: 0, target: 50, dragging: false, pointerId: null as number | null, introActive: false, introDone: false, introStart: 0 });
  // Starts the animation loop again if it stopped at rest. Null while the loop cannot run (off screen, reduced motion).
  const wake = useRef<(() => void) | null>(null);

  const paint = useCallback(() => {
    const x = clamp(sim.current.x, 0, 100);
    if (topRef.current) topRef.current.style.clipPath = `inset(0 ${(100 - x).toFixed(3)}% 0 0)`;
    if (dividerRef.current) dividerRef.current.style.left = `${x.toFixed(3)}%`;
    handleRef.current?.setAttribute('aria-valuenow', String(Math.round(x)));
    handleRef.current?.setAttribute('aria-valuetext', `전 ${Math.round(x)}%, 후 ${100 - Math.round(x)}%`);
  }, []);

  // Animate only while the frame is on screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => setOnScreen(entries.some((e) => e.isIntersecting)), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    paint();
    const s = sim.current;
    if (reduced || !onScreen) {
      if (reduced) s.introDone = true;
      s.introActive = false;
      return;
    }
    if (!s.introDone) {
      s.introActive = true;
      s.introStart = performance.now() / 1000;
    }
    let raf = 0;
    let last = 0;
    const frame = (ts: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (ts - last) / 1000));
      last = ts;
      const moving = step(s, ts / 1000, dt);
      paint();
      raf = moving ? requestAnimationFrame(frame) : 0;
    };
    wake.current = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    wake.current();
    return () => {
      cancelAnimationFrame(raf);
      wake.current = null;
    };
  }, [reduced, onScreen, paint]);

  const commit = (next: number) => {
    const s = sim.current;
    s.introActive = false;
    s.introDone = true;
    s.target = clamp(next, 0, 100);
    if (reduced) {
      s.x = s.target;
      s.v = 0;
      paint();
    }
    wake.current?.();
  };

  const fromPointer = (clientX: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) commit(((clientX - rect.left) / Math.max(1, rect.width)) * 100);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const base = sim.current.target;
    let next = base;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = base + step;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = base - step;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 100;
    else return;
    e.preventDefault();
    commit(next);
  };

  return (
    <div
      ref={rootRef}
      className="compare"
      role="group"
      aria-label={label}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        sim.current.dragging = true;
        sim.current.pointerId = e.pointerId;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        fromPointer(e.clientX);
      }}
      onPointerMove={(e) => {
        if (sim.current.dragging && e.pointerId === sim.current.pointerId) fromPointer(e.clientX);
      }}
      onPointerUp={() => {
        sim.current.dragging = false;
        sim.current.pointerId = null;
      }}
      onPointerCancel={() => {
        sim.current.dragging = false;
        sim.current.pointerId = null;
      }}
      onDoubleClick={() => commit(50)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="compare-img" src={after.src} srcSet={srcSetOf(after.src)} sizes={SIZES} width={WIDTH} height={HEIGHT} fetchPriority="high" alt={after.alt} draggable={false} />
      <div ref={topRef} className="compare-top" style={{ clipPath: 'inset(0 50% 0 0)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="compare-img" src={before.src} srcSet={srcSetOf(before.src)} sizes={SIZES} width={WIDTH} height={HEIGHT} alt={before.alt} draggable={false} />
      </div>
      <div ref={dividerRef} className="compare-divider" style={{ left: '50%' }}>
        <button
          ref={handleRef}
          type="button"
          role="slider"
          className="compare-handle"
          aria-label="전과 후 나누는 선"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={50}
          aria-valuetext="전 50%, 후 50%"
          onKeyDown={onKeyDown}
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
            <path d="M6 1 L1 7 L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 1 L17 7 L12 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
