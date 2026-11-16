// The /demo timeline as plain functions of time, so a frame can be drawn for any second (play, pause, replay, the
// reduced motion end state) and test/demo-timeline.test.ts can check it without a browser. Three cursors share it:
// diagnose visits each finding of the detector in the before frame, swap wipes the rebuilt page over it band by band,
// and system moves two token sliders on the rebuilt page and lets them settle. Their jobs overlap in time.
// No JSON imports and no DOM, so Node can load it for the test.

/** The first screen of examples/rebuild, the size both frames are laid out at before they are scaled to fit. */
export const FRAME = { w: 1300, h: 871 };

export type Box = { x: number; y: number; w: number; h: number };
/** One element the detector flagged, with every rule it hit there. */
export type Spot = { box: Box; rules: string[] };
/** A top level block of the before page, the unit the swap cursor replaces at a time. */
export type Band = { top: number; bottom: number };
export type Slider = 'radius' | 'density';

/** Where a cursor is: a point on the frame (frame pixels), on a slider's thumb, or offset from either in screen pixels. */
export type Anchor = { at: 'frame'; x: number; y: number } | { at: 'slider'; which: Slider; value: number; dx?: number; dy?: number };
/** A cursor between two anchors, `p` the eased progress from one to the other. */
export type Pose = { from: Anchor; to: Anchor; p: number };

const DIAG_START = 0.8;
const STEP = 0.7;
const DWELL = 0.3;
const BAND_TRAVEL = 0.7;
const BAND_SWEEP = 2.6;
const OVERLAP = 3.5;
const HOLD = 6.5;

/** Token multipliers the system cursor goes through, 1 being the rebuilt page's own theme. */
export const TOKEN_RANGE = { radius: { min: 0, max: 2.4, step: 0.05 }, density: { min: 0.6, max: 1.6, step: 0.05 } } as const;
const RADIUS_PEAK = 2;
const RADIUS_LOW = 0.3;
const DENSITY_PEAK = 1.5;
const DENSITY_LOW = 0.7;

export type Plan = {
  visits: number[];
  bands: (Band & { start: number; sweep: number; end: number })[];
  swapEnd: number;
  system: { start: number; atRadius: number; radiusUp: number; radiusDown: number; atDensity: number; densityUp: number; densityDown: number; settled: number; home: number };
  end: number;
  loop: number;
};

/** Slow in and out, so a cursor leaves and lands softly. */
export const ease = (p: number): number => {
  const x = Math.min(1, Math.max(0, p));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const progress = (t: number, a: number, b: number): number => (b <= a ? (t >= b ? 1 : 0) : Math.min(1, Math.max(0, (t - a) / (b - a))));
const lerp = (a: number, b: number, p: number): number => a + (b - a) * p;

/** Spots in the order the diagnose cursor visits them: whole page findings first, then top to bottom, left to right. */
export function orderSpots(spots: Spot[]): Spot[] {
  const big = (s: Spot) => s.box.w * s.box.h >= FRAME.w * FRAME.h * 0.4;
  return [...spots].sort((a, b) => Number(big(b)) - Number(big(a)) || a.box.y - b.box.y || a.box.x - b.box.x);
}

/** The timeline for these spots and bands. A band is wiped only after every spot that starts above its bottom was visited. */
export function plan(spots: Spot[], bands: Band[]): Plan {
  const visits = spots.map((_, i) => DIAG_START + (i + 1) * STEP);
  const diagEnd = visits.length ? visits[visits.length - 1] : DIAG_START;
  let at = Math.max(DIAG_START + STEP, diagEnd - OVERLAP);
  const planned = bands.map((band) => {
    const lastAbove = Math.max(0, ...spots.map((s, i) => (s.box.y < band.bottom ? visits[i] + DWELL : 0)));
    // The line may not reach a spot the diagnose cursor has not drawn yet.
    const start = Math.max(at, lastAbove - BAND_TRAVEL);
    const sweep = start + BAND_TRAVEL;
    const end = sweep + BAND_SWEEP;
    at = end;
    return { ...band, start, sweep, end };
  });
  const swapEnd = at;
  const s0 = Math.max(DIAG_START + STEP, swapEnd - OVERLAP + 1);
  const system = { start: s0, atRadius: s0 + 1.1, radiusUp: s0 + 2.6, radiusDown: s0 + 4.1, atDensity: s0 + 5, densityUp: s0 + 6.4, densityDown: s0 + 7.8, settled: s0 + 9, home: s0 + 9.8 };
  const end = Math.max(swapEnd, system.home) + 0.4;
  return { visits, bands: planned, swapEnd, system, end, loop: end + HOLD };
}

/** How far down the rebuilt page shows, in frame pixels. */
export function revealAt(p: Plan, t: number): number {
  let y = 0;
  for (const b of p.bands) {
    if (t >= b.end) y = b.bottom;
    else if (t > b.sweep) return lerp(b.top, b.bottom, ease(progress(t, b.sweep, b.end)));
  }
  return y;
}

/** Index of the last spot the diagnose cursor has reached, or -1. */
export function visitedAt(p: Plan, t: number): number {
  let i = -1;
  while (i + 1 < p.visits.length && p.visits[i + 1] <= t) i++;
  return i;
}

/**
 * The rule counters: rules found so far, and how many of those still show. A rule still shows while one of its spots
 * is below the reveal line, and for good when the rebuilt page hits it too (`stays`, measured in the after frame).
 */
export function countsAt(p: Plan, spots: Spot[], t: number, stays: ReadonlySet<string> = new Set()): { found: number; remaining: number } {
  const seen = visitedAt(p, t);
  const found = new Set<string>();
  for (let i = 0; i <= seen; i++) for (const r of spots[i].rules) found.add(r);
  const line = revealAt(p, t);
  const left = new Set<string>();
  for (let i = 0; i <= seen; i++) {
    const s = spots[i];
    if (Math.min(FRAME.h, s.box.y + s.box.h) > line + 0.5) for (const r of s.rules) left.add(r);
  }
  for (const r of stays) if (found.has(r) || t >= p.swapEnd) left.add(r);
  return { found: found.size, remaining: left.size };
}

/** The two token multipliers at time t. */
export function tokensAt(p: Plan, t: number): Record<Slider, number> {
  const s = p.system;
  const radius =
    t < s.atRadius ? 1 : t < s.radiusUp ? lerp(1, RADIUS_PEAK, ease(progress(t, s.atRadius, s.radiusUp))) : t < s.radiusDown ? lerp(RADIUS_PEAK, RADIUS_LOW, ease(progress(t, s.radiusUp, s.radiusDown))) : t < s.densityDown ? RADIUS_LOW : lerp(RADIUS_LOW, 1, ease(progress(t, s.densityDown, s.settled)));
  const density =
    t < s.atDensity ? 1 : t < s.densityUp ? lerp(1, DENSITY_PEAK, ease(progress(t, s.atDensity, s.densityUp))) : t < s.densityDown ? lerp(DENSITY_PEAK, DENSITY_LOW, ease(progress(t, s.densityUp, s.densityDown))) : lerp(DENSITY_LOW, 1, ease(progress(t, s.densityDown, s.settled)));
  return { radius, density };
}

// Where each cursor rests before and after its job.
const DIAG_HOME: Anchor = { at: 'frame', x: 90, y: 110 };
// Clear of the end card, which sits in the stage's bottom left corner.
const DIAG_DONE: Anchor = { at: 'frame', x: FRAME.w / 2 - 80, y: FRAME.h - 70 };
const SWAP_HOME: Anchor = { at: 'frame', x: FRAME.w - 220, y: 110 };
const SWAP_DONE: Anchor = { at: 'frame', x: FRAME.w - 220, y: FRAME.h - 70 };
const SYSTEM_HOME: Anchor = { at: 'slider', which: 'density', value: 1, dy: 34 };

/** The point a cursor points at on a spot: inside its top left corner, never past the frame. */
export function spotPoint(s: Spot): Anchor {
  const x = Math.min(FRAME.w - 40, Math.max(12, s.box.x + Math.min(s.box.w / 2, 60)));
  const y = Math.min(FRAME.h - 30, Math.max(12, s.box.y + Math.min(s.box.h / 2, 30)));
  return { at: 'frame', x, y };
}

const still = (a: Anchor): Pose => ({ from: a, to: a, p: 1 });
const move = (from: Anchor, to: Anchor, t: number, a: number, b: number): Pose => ({ from, to, p: ease(progress(t, a, b)) });

export function diagnosePose(p: Plan, spots: Spot[], t: number): Pose {
  const n = p.visits.length;
  if (!n || t <= p.visits[0] - STEP + DWELL) return still(DIAG_HOME);
  for (let i = 0; i < n; i++) {
    const leave = i === 0 ? p.visits[0] - STEP + DWELL : p.visits[i - 1] + DWELL;
    const from = i === 0 ? DIAG_HOME : spotPoint(spots[i - 1]);
    if (t <= p.visits[i]) return move(from, spotPoint(spots[i]), t, leave, p.visits[i]);
    if (t <= p.visits[i] + DWELL) return still(spotPoint(spots[i]));
  }
  const last = p.visits[n - 1] + DWELL;
  return move(spotPoint(spots[n - 1]), DIAG_DONE, t, last, last + 1);
}

export function swapPose(p: Plan, t: number): Pose {
  let from: Anchor = SWAP_HOME;
  for (const b of p.bands) {
    const left: Anchor = { at: 'frame', x: 40, y: Math.max(12, b.top) };
    if (t < b.start) return still(from);
    if (t <= b.sweep) return move(from, left, t, b.start, b.sweep);
    if (t <= b.end) {
      const k = ease(progress(t, b.sweep, b.end));
      const at: Anchor = { at: 'frame', x: lerp(40, FRAME.w - 60, k), y: Math.min(FRAME.h - 20, Math.max(12, lerp(b.top, b.bottom, k))) };
      return still(at);
    }
    from = { at: 'frame', x: FRAME.w - 60, y: Math.min(FRAME.h - 20, b.bottom) };
  }
  return move(from, SWAP_DONE, t, p.swapEnd, p.swapEnd + 1);
}

export function systemPose(p: Plan, t: number): Pose {
  const s = p.system;
  const v = tokensAt(p, t);
  if (t < s.start) return still(SYSTEM_HOME);
  if (t < s.atRadius) return move(SYSTEM_HOME, { at: 'slider', which: 'radius', value: 1 }, t, s.start, s.atRadius);
  if (t < s.radiusDown) return still({ at: 'slider', which: 'radius', value: v.radius });
  if (t < s.atDensity) return move({ at: 'slider', which: 'radius', value: RADIUS_LOW }, { at: 'slider', which: 'density', value: 1 }, t, s.radiusDown, s.atDensity);
  if (t < s.densityDown) return still({ at: 'slider', which: 'density', value: v.density });
  return move({ at: 'slider', which: 'density', value: DENSITY_LOW }, SYSTEM_HOME, t, s.densityDown, s.home);
}
