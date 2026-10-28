'use client';

/* Before/after comparison slider. Adapted from Compare Reveal by Motiq
   (https://motiq.dev/components/compare-reveal), MIT licensed, picked from 21st.dev.
   Kept: the spring that follows the pointer, the one-time intro sweep, keyboard control and
   double-click to centre. Changed for Taster: plain CSS on the registry tokens, no glow, no
   blurred glass chips and no all-caps labels (captions sit under the frame instead). */

import { useCallback, useEffect, useRef, useState } from 'react';

type Side = { src: string; alt: string };

const SPRING_K = 140;
const SPRING_C = 18;
const SWEEP_SECONDS = 2.6;
const KEY_STEP = 2;
const KEY_STEP_LARGE = 10;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// 50 -> 92 -> 8 -> 50 over the sweep, one cubic ease per leg.
function sweepAt(u: number): number {
  if (u < 0.38) return lerp(50, 92, easeInOutCubic(u / 0.38));
  if (u < 0.78) return lerp(92, 8, easeInOutCubic((u - 0.38) / 0.4));
  return lerp(8, 50, easeInOutCubic((u - 0.78) / 0.22));
}

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
    let last = performance.now();
    const frame = (ts: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (ts - last) / 1000));
      last = ts;
      if (s.introActive) {
        const u = (ts / 1000 - s.introStart) / SWEEP_SECONDS;
        if (u >= 1) {
          s.introActive = false;
          s.introDone = true;
          s.target = 50;
        } else {
          s.target = sweepAt(u);
        }
      }
      s.v += ((s.target - s.x) * SPRING_K - s.v * SPRING_C) * dt;
      s.x = clamp(s.x + s.v * dt, 0, 100);
      paint();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
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
      <img className="compare-img" src={after.src} alt={after.alt} draggable={false} />
      <div ref={topRef} className="compare-top" style={{ clipPath: 'inset(0 50% 0 0)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="compare-img" src={before.src} alt={before.alt} draggable={false} />
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
