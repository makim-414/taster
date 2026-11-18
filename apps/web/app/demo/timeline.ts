// The /demo timeline as plain functions of time, so a frame can be drawn for any second (play, pause, 2x, replay, the
// reduced motion end state) and test/demo-timeline.test.ts can check it without a browser. It knows nothing of the
// example: it takes what was measured on a before page and an after page and plans four phases.
//
// 1. Diagnose: a few agents fly out at once to the detector's findings on the before page, outline each and pin its
//    rules. The count climbs to every rule found (plus the rules found only at the narrow width).
// 2. Rebuild: many agents rebuild the after page layer by layer. A layer is a real box of the after page (an element,
//    or one line of its text) in document order; each goes to the next free agent, who flies there, draws the box with
//    its size, and the layer shows (text types in). A layer never shows before the layer that holds it.
// 3. Tune: one system cursor drags the after page's radius and spacing tokens and lets them settle (only when the after
//    page has such tokens).
// 4. End: the card with the agents, the seconds and the rule counts.
//
// Points are in document pixels of the page in the frame; the camera is how far the frame is scrolled.
// No JSON imports and no DOM, so Node can load it for the test.

import { bezier } from './stageshow.ts';

/** The frame both pages are laid out in before they are scaled to fit: a 1300 wide desktop window. */
export const VIEW = { w: 1300, h: 871 };

export type Box = { x: number; y: number; w: number; h: number };
export type Point = { x: number; y: number };
/** One element the detector flagged, with every rule it hit there. */
export type Spot = { box: Box; rules: string[] };
/** One box of the after page: an element (chars 0) or one line of text (chars it types), and the layer that holds it. */
export type Layer = { box: Box; chars: number; parent: number };
export type Slider = 'radius' | 'density';

export type Input = {
  spots: Spot[];
  /** Rules the detector found on the before page only at another width, so no spot shows them at this one. */
  extra?: string[];
  layers: Layer[];
  beforeH: number;
  afterH: number;
  /** Whether the after page has radius and spacing tokens to move. */
  tune: boolean;
};

/** One agent's visit: it leaves, arrives at `to`, draws the box by `drawn` (types from typeStart to typeEnd) and is free at `done`. */
export type Job = { agent: number; target: number; leave: number; arrive: number; drawn: number; typeStart: number; typeEnd: number; done: number; to: Point; rest: Point };
export type Crew = { count: number; start: number; end: number; jobs: Job[]; home: Point[]; exits: { at: number; to: Point }[] };
export type Tune = { start: number; atRadius: number; radiusUp: number; radiusDown: number; atDensity: number; densityUp: number; densityDown: number; settled: number; home: number };
export type Plan = {
  diag: Crew & { extraAt: number };
  cross: { start: number; end: number };
  build: Crew;
  tune: Tune | null;
  end: number;
  /** Seconds the rebuild crew took, at 1x. */
  rebuildSeconds: number;
  focus: { t: number; y: number }[];
  beforeH: number;
  afterH: number;
};

const DIAG_START = 0.5;
const DIAG_STAGGER = 0.2;
const DIAG_DWELL = 0.75;
const DRAW = 0.32;
const TEXT_DRAW = 0.16;
const CHIP_HOLD = 1.8;
const HOLD = 1;
const CROSS = 0.9;
const CPS = 38;
const TYPE_MAX = 1.3;
const EXIT = 0.8;
const CAMERA_HALF = 0.7;
const REBUILD_TARGET = 11;

/** Token multipliers the system cursor goes through, 1 being the after page's own theme. */
export const TOKEN_RANGE = { radius: { min: 0, max: 2.4, step: 0.05 }, density: { min: 0.6, max: 1.6, step: 0.05 } } as const;
const RADIUS_PEAK = 2;
const RADIUS_LOW = 0.3;
const DENSITY_PEAK = 1.5;
const DENSITY_LOW = 0.7;

const house = bezier('house');
/** Slow in and out, for the camera and the token moves. */
export const ease = bezier('camera');
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const progress = (t: number, a: number, b: number): number => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a), 0, 1));
const lerp = (a: number, b: number, p: number): number => a + (b - a) * p;
const mix = (a: Point, b: Point, p: number): Point => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p) });
const travel = (a: Point, b: Point): number => clamp(0.42 + Math.hypot(b.x - a.x, b.y - a.y) / 2600, 0.42, 1.05);

/** How many agents each crew gets for this much work. */
export const diagAgents = (spots: number): number => clamp(Math.ceil(spots / 3), 1, 6);
export const buildAgents = (layers: number): number => Math.min(layers, clamp(Math.round(layers / 5), 6, 24));

/** Spots in the order the agents take them: whole page findings first, then top to bottom, left to right. */
export function orderSpots(spots: Spot[], pageH = VIEW.h): Spot[] {
  const big = (s: Spot) => s.box.w * s.box.h >= VIEW.w * Math.min(pageH, VIEW.h) * 0.4;
  return [...spots].sort((a, b) => Number(big(b)) - Number(big(a)) || a.box.y - b.box.y || a.box.x - b.box.x);
}

/** Where an agent's pointer lands on a box: just inside its top left corner, never off the page. */
export function landing(box: Box, pageH: number): Point {
  return { x: clamp(box.x + 3, 4, VIEW.w - 24), y: clamp(box.y + 3, 4, Math.max(4, pageH - 24)) };
}

/** Where the camera wants to be to show a box: its top part a little above the middle of the window. */
function want(box: Box, pageH: number): number {
  return clamp(box.y + Math.min(box.h, VIEW.h * 0.6) / 2 - VIEW.h * 0.45, 0, Math.max(0, pageH - VIEW.h));
}

function homes(count: number, y: number): Point[] {
  return Array.from({ length: count }, (_, i) => ({ x: VIEW.w / 2 + (i - (count - 1) / 2) * 28, y }));
}

type Work = { box: Box; chars: number; parent: number };

/** Hands each piece of work, in order, to the agent free first; a piece never lands before the one that holds it. */
function assign(work: Work[], count: number, start: number, gap: number, pageH: number, dwell: number): Job[] {
  const home = homes(count, VIEW.h + 30);
  const free = Array.from({ length: count }, () => start);
  const at = home.map((p) => ({ ...p }));
  const jobs: Job[] = [];
  work.forEach((w, i) => {
    let agent = 0;
    for (let a = 1; a < count; a++) if (free[a] < free[agent]) agent = a;
    const to = landing(w.box, pageH);
    const trip = travel(at[agent], to);
    let leave = Math.max(free[agent], start + i * gap);
    let arrive = leave + trip;
    if (w.parent >= 0 && jobs[w.parent]) {
      const after = jobs[w.parent].arrive + 0.12;
      if (arrive < after) {
        arrive = after;
        leave = arrive - trip;
      }
    }
    const text = w.chars > 0;
    const drawn = arrive + (text ? TEXT_DRAW : DRAW);
    const typeStart = text ? arrive + 0.12 : drawn;
    const typeEnd = text ? typeStart + Math.min(TYPE_MAX, w.chars / CPS) : drawn;
    const done = Math.max(drawn, typeEnd) + dwell;
    // Text: the pointer runs along the line as it types. A box: it drags from corner toward corner.
    const rest = text
      ? { x: clamp(to.x + w.box.w - 6, 4, VIEW.w - 24), y: to.y + Math.min(w.box.h * 0.6, 14) }
      : { x: clamp(to.x + Math.min(w.box.w, 300) - 6, 4, VIEW.w - 24), y: clamp(to.y + Math.min(w.box.h, 180) - 6, 4, Math.max(4, pageH - 24)) };
    jobs.push({ agent, target: i, leave, arrive, drawn, typeStart, typeEnd, done, to, rest });
    free[agent] = done;
    at[agent] = rest;
  });
  return jobs;
}

function crew(jobs: Job[], count: number, start: number): Crew {
  const end = jobs.length ? Math.max(...jobs.map((j) => j.done)) : start;
  return { count, start, end, jobs, home: homes(count, VIEW.h + 30), exits: [] };
}

/** The focus the camera follows: the last place an agent set off to, never moving back up within a phase. */
function focusOf(jobs: Job[], boxes: Box[], pageH: number, from: number, until: number): { t: number; y: number }[] {
  const out = [{ t: from, y: 0 }];
  let y = 0;
  for (const j of [...jobs].sort((a, b) => a.leave - b.leave)) {
    y = Math.max(y, want(boxes[j.target], pageH));
    out.push({ t: j.leave, y });
  }
  out.push({ t: until, y: 0 });
  return out;
}

export function plan(input: Input): Plan {
  const { spots, layers, beforeH, afterH } = input;
  const extra = input.extra ?? [];

  const dCount = diagAgents(Math.max(1, spots.length));
  const dJobs = assign(
    spots.map((s) => ({ box: s.box, chars: 0, parent: -1 })),
    dCount,
    DIAG_START,
    DIAG_STAGGER,
    beforeH,
    DIAG_DWELL,
  );
  const diag = crew(dJobs, dCount, DIAG_START);
  const lastDrawn = dJobs.length ? Math.max(...dJobs.map((j) => j.drawn)) : DIAG_START;
  const extraAt = lastDrawn + 0.4;
  const cross = { start: Math.max(diag.end, extraAt) + HOLD, end: 0 };
  cross.end = cross.start + CROSS;

  const bCount = Math.max(1, buildAgents(layers.length));
  const buildStart = cross.end - 0.2;
  const gap = clamp(REBUILD_TARGET / Math.max(1, layers.length), 0.04, 0.2);
  const bJobs = assign(layers, bCount, buildStart, gap, afterH, 0.12);
  const build = crew(bJobs, bCount, buildStart);
  build.end = Math.max(build.end, buildStart) + 0.3;

  const focus = [
    ...focusOf(dJobs, spots.map((s) => s.box), beforeH, 0, cross.start),
    ...focusOf(bJobs, layers.map((l) => l.box), afterH, buildStart, build.end),
  ].sort((a, b) => a.t - b.t);

  let tune: Tune | null = null;
  let end = build.end + 0.6;
  if (input.tune) {
    const s0 = build.end + 0.5;
    tune = { start: s0, atRadius: s0 + 1.1, radiusUp: s0 + 2.5, radiusDown: s0 + 3.9, atDensity: s0 + 4.7, densityUp: s0 + 6, densityDown: s0 + 7.3, settled: s0 + 8.4, home: s0 + 9.1 };
    end = tune.home + 0.3;
  }

  const p: Plan = { diag: { ...diag, extraAt }, cross, build, tune, end, rebuildSeconds: Math.round((build.end - buildStart) * 10) / 10, focus, beforeH, afterH };
  // Each agent leaves the page from where it last worked, back toward the bar it came from.
  const exits = (c: Crew, leaveBy: number): Crew['exits'] =>
    c.home.map((h, a) => {
      const last = c.jobs.filter((j) => j.agent === a).reduce((m, j) => Math.max(m, j.done), c.start);
      const at = Math.min(last, leaveBy - EXIT);
      return { at, to: { x: h.x, y: cameraAt(p, at + EXIT) + VIEW.h + 30 } };
    });
  p.diag.exits = exits(p.diag, cross.end);
  p.build.exits = exits(p.build, build.end + EXIT);
  return p;
}

/** Where the camera wants to be at t, before smoothing. */
function focusAt(p: Plan, t: number): number {
  let y = 0;
  for (const f of p.focus) {
    if (f.t > t) break;
    y = f.y;
  }
  return y;
}

/** How far the frames are scrolled at t: the focus under a triangle filter, so the camera eases and leads a little. */
export function cameraAt(p: Plan, t: number): number {
  const N = 10;
  let sum = 0;
  let weight = 0;
  for (let k = -N; k <= N; k++) {
    const w = N + 1 - Math.abs(k);
    sum += w * focusAt(p, t + (k * CAMERA_HALF) / N);
    weight += w;
  }
  return sum / weight;
}

export type Phase = 'diagnose' | 'rebuild' | 'tune' | 'end';
export function phaseAt(p: Plan, t: number): Phase {
  if (t >= p.end) return 'end';
  if (p.tune && t >= p.tune.start) return 'tune';
  if (t >= p.cross.start) return 'rebuild';
  return 'diagnose';
}

/** The before page fades out while the empty after page fades in over it. */
export function crossAt(p: Plan, t: number): number {
  return ease(progress(t, p.cross.start, p.cross.end));
}

/** Rules found by t: every rule of every spot outlined so far, then the ones found only at the other width. */
export function foundAt(p: Plan, spots: Spot[], extra: string[], t: number): Set<string> {
  const found = new Set<string>();
  for (const j of p.diag.jobs) if (j.drawn <= t) for (const r of spots[j.target].rules) found.add(r);
  if (t >= p.diag.extraAt) for (const r of extra) found.add(r);
  return found;
}

/** A spot's outline: how far it is drawn, and whether its chip shows. */
export function markAt(p: Plan, i: number, t: number): { drawn: number; chip: boolean; fade: number } {
  const j = p.diag.jobs.find((x) => x.target === i);
  if (!j) return { drawn: 0, chip: false, fade: 0 };
  return { drawn: house(progress(t, j.arrive, j.drawn)), chip: t >= j.drawn && t < Math.min(j.drawn + CHIP_HOLD, p.cross.start), fade: 1 - progress(t, p.cross.start, p.cross.end) };
}

/** A layer at t: whether it shows, how many of its characters are typed, and its agent's box (drawn 0..1, off when null). */
export function layerAt(p: Plan, layers: Layer[], i: number, t: number): { shown: boolean; typed: number; box: number | null } {
  const j = p.build.jobs[i];
  const l = layers[i];
  if (!j || !l) return { shown: true, typed: l?.chars ?? 0, box: null };
  if (t >= p.end) return { shown: true, typed: l.chars, box: null };
  const shown = t >= j.arrive + (l.chars ? 0.05 : DRAW * 0.55);
  const typed = l.chars ? Math.floor(l.chars * progress(t, j.typeStart, j.typeEnd)) : 0;
  const box = t >= j.arrive && t < j.done + 0.3 ? house(progress(t, j.arrive, j.drawn)) : null;
  return { shown, typed, box };
}

/** How many layers show at t. */
export function layersShownAt(p: Plan, layers: Layer[], t: number): number {
  let n = 0;
  for (let i = 0; i < layers.length; i++) if (layerAt(p, layers, i, t).shown) n++;
  return n;
}

/** Where agent `a` of a crew is at t, in page pixels, and whether it is on the page at all. */
export function agentAt(c: Crew, a: number, t: number): { at: Point; on: boolean } {
  const jobs = c.jobs.filter((j) => j.agent === a);
  const exit = c.exits[a];
  const on = jobs.length > 0 && t >= c.start - 0.1 && (!exit || t <= exit.at + EXIT);
  let prev = c.home[a];
  for (const j of jobs) {
    if (t < j.leave) return { at: prev, on };
    if (t < j.arrive) return { at: mix(prev, j.to, house(progress(t, j.leave, j.arrive))), on };
    if (t < j.done) {
      const moving = j.typeEnd > j.drawn ? progress(t, j.typeStart, j.typeEnd) : house(progress(t, j.arrive, j.drawn));
      return { at: mix(j.to, j.rest, moving), on };
    }
    prev = j.rest;
  }
  if (exit && t > exit.at) return { at: mix(prev, exit.to, house(progress(t, exit.at, exit.at + EXIT))), on };
  return { at: prev, on };
}

/** The two token multipliers at time t. */
export function tokensAt(p: Plan, t: number): Record<Slider, number> {
  const s = p.tune;
  if (!s) return { radius: 1, density: 1 };
  const radius =
    t < s.atRadius ? 1 : t < s.radiusUp ? lerp(1, RADIUS_PEAK, ease(progress(t, s.atRadius, s.radiusUp))) : t < s.radiusDown ? lerp(RADIUS_PEAK, RADIUS_LOW, ease(progress(t, s.radiusUp, s.radiusDown))) : t < s.densityDown ? RADIUS_LOW : lerp(RADIUS_LOW, 1, ease(progress(t, s.densityDown, s.settled)));
  const density =
    t < s.atDensity ? 1 : t < s.densityUp ? lerp(1, DENSITY_PEAK, ease(progress(t, s.atDensity, s.densityUp))) : t < s.densityDown ? lerp(DENSITY_PEAK, DENSITY_LOW, ease(progress(t, s.densityUp, s.densityDown))) : lerp(DENSITY_LOW, 1, ease(progress(t, s.densityDown, s.settled)));
  return { radius, density };
}

/** Where the system cursor is: on a slider's thumb at a value, or resting under the sliders, with how far it got there. */
export type Anchor = { which: Slider | 'rest'; value: number };
export function systemAt(p: Plan, t: number): { from: Anchor; to: Anchor; p: number; on: boolean } {
  const s = p.tune;
  const rest: Anchor = { which: 'rest', value: 1 };
  if (!s) return { from: rest, to: rest, p: 1, on: false };
  const on = t >= s.start - 0.2 && t <= s.home + 0.2;
  const v = tokensAt(p, t);
  const still = (a: Anchor) => ({ from: a, to: a, p: 1, on });
  const move = (from: Anchor, to: Anchor, a: number, b: number) => ({ from, to, p: house(progress(t, a, b)), on });
  if (t < s.start) return still(rest);
  if (t < s.atRadius) return move(rest, { which: 'radius', value: 1 }, s.start, s.atRadius);
  if (t < s.radiusDown) return still({ which: 'radius', value: v.radius });
  if (t < s.atDensity) return move({ which: 'radius', value: RADIUS_LOW }, { which: 'density', value: 1 }, s.radiusDown, s.atDensity);
  if (t < s.densityDown) return still({ which: 'density', value: v.density });
  return move({ which: 'density', value: DENSITY_LOW }, rest, s.densityDown, s.home);
}
