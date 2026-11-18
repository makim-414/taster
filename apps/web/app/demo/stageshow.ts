// Upstream license: MIT, Copyright (c) 2026 Benji Taylor. Full text in THIRD_PARTY_NOTICES.md.
// Adapted from Stageshow (https://github.com/benjitaylor/skills, stageshow/kit/ease.ts and stageshow/kit/cursor.tsx):
// the named cursor curves, the cubic-bezier solver that turns one into a function of time, and the solid rounded
// arrowhead the agents draw as their pointer. Changed: only the curves the demo uses, no CSS output, and the arrow as a
// path string the demo puts in its own SVG. No DOM and no JSON imports, so Node can load it for the tests.

export type Bezier = readonly [number, number, number, number];

export const EASE = {
  /** Moves inside a shot (a long cursor trip): peak at about 40%, long soft tail. */
  house: [0.65, 0, 0.1, 1],
  /** A cursor arriving from off frame, already moving. */
  enter: [0.1, 0.8, 0.3, 0.95],
  /** One long trip across the frame. */
  trip: [0.78, 0, 0.17, 1],
  /** The camera following the work down the page. */
  camera: [0.45, 0, 0.1, 1],
} as const satisfies Record<string, Bezier>;

export type EaseName = keyof typeof EASE;

/** cubic-bezier(x1, y1, x2, y2) as a function of time 0..1, as CSS works it out. */
export function bezier(e: EaseName | Bezier): (t: number) => number {
  const [x1, y1, x2, y2] = typeof e === 'string' ? EASE[e] : e;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const x = (u: number) => ((ax * u + bx) * u + cx) * u;
  const dx = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    // Newton, falling back to bisection where the slope is flat
    let u = t;
    for (let i = 0; i < 8; i++) {
      const d = dx(u);
      if (Math.abs(d) < 1e-6) break;
      const next = u - (x(u) - t) / d;
      if (next < 0 || next > 1) break;
      u = next;
    }
    if (Math.abs(x(u) - t) > 1e-6) {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 40; i++) {
        u = (lo + hi) / 2;
        if (x(u) < t) lo = u;
        else hi = u;
      }
    }
    return ((ay * u + by) * u + cy) * u;
  };
}

/** The arrow style's pointer: one solid, rounded arrowhead in a 22 box, tip at ARROW_TIP. */
export const ARROW_PATH = 'M4 3 18.5 9.6 11.8 11.8 9.6 18.5Z';
export const ARROW_TIP = { x: 4, y: 3 } as const;
