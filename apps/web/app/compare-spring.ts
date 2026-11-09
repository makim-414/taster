/* The spring and the one-time intro sweep behind the home page's before/after slider (compare-reveal.tsx), kept apart
   from React so test/compare-spring.test.ts can run it frame by frame. The constants, clamp, lerp and easeInOutCubic
   follow Compare Reveal by Motiq (https://motiq.dev/components/compare-reveal). */
// Upstream license: MIT, Copyright (c) 2026 Mahammad Rustamov (https://github.com/RMahammad/motiq). Full text in THIRD_PARTY_NOTICES.md.

export const SPRING_K = 140;
export const SPRING_C = 18;
export const SWEEP_SECONDS = 2.6;
// Closer than this to the target (in percent of the width) and slower than this (percent per second), the divider is
// still: the loop snaps it onto the target and stops asking for frames until the next pointer or key input.
export const REST = 0.01;

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// 50 -> 92 -> 8 -> 50 over the sweep, one cubic ease per leg.
export function sweepAt(u: number): number {
  if (u < 0.38) return lerp(50, 92, easeInOutCubic(u / 0.38));
  if (u < 0.78) return lerp(92, 8, easeInOutCubic((u - 0.38) / 0.4));
  return lerp(8, 50, easeInOutCubic((u - 0.78) / 0.22));
}

export type Spring = { x: number; v: number; target: number; introActive: boolean; introDone: boolean; introStart: number };

/** One frame at time `ts` (seconds), `dt` seconds after the last one: the intro moves the target, the spring follows
 *  it. Returns false once the divider is at rest on its target, so the caller can stop the animation loop. */
export function step(s: Spring, ts: number, dt: number): boolean {
  if (s.introActive) {
    const u = (ts - s.introStart) / SWEEP_SECONDS;
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
  if (s.introActive || Math.abs(s.target - s.x) >= REST || Math.abs(s.v) >= REST) return true;
  s.x = s.target;
  s.v = 0;
  return false;
}
