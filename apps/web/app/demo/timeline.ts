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
// The camera follows the agents that are at work. It keeps the oldest job still in flight near the top of the window
// (below any bar the page pins there) and every other job in flight above its bottom edge; a job that would not fit in
// that window waits until the jobs far above it are done, so the crew never runs ahead of what the window shows.
//
// Points are in document pixels of the page in the frame; the camera is how far the frame is scrolled. A pinned box
// (an element the page fixes to its window, like a sticky top bar or a fixed side menu) is in pixels of the window
// instead: it stays where it is whatever the camera does.
// No JSON imports and no DOM, so Node can load it for the test.

import { bezier } from './stageshow.ts';

/** The frame both pages are laid out in before they are scaled to fit: a 1300 wide desktop window. */
export const VIEW = { w: 1300, h: 871 };

export type Box = { x: number; y: number; w: number; h: number; pin?: boolean };
export type Point = { x: number; y: number };
/** One element the detector flagged, with every rule it hit there. */
export type Spot = { box: Box; rules: string[] };
/** One box of the after page: an element (chars 0) or one line of text (chars it types), and the layer that holds it. */
export type Layer = { box: Box; chars: number; parent: number };
export type Slider = 'radius' | 'density';
/** normal: the public /demo. fast: about twice as quick, for a short clip. */
export type Pace = 'normal' | 'fast';

export type Input = {
  spots: Spot[];
  /** Rules the detector found on the before page only at another width, so no spot shows them at this one. */
  extra?: string[];
  layers: Layer[];
  beforeH: number;
  afterH: number;
  /** Whether the after page has radius and spacing tokens to move. */
  tune: boolean;
  /** How far a bar the page pins to the top of its window reaches down, on each page (0 when there is none). */
  inset?: { before: number; after: number };
  pace?: Pace;
  /** A clip's opening: the diagnose crew leaves all at once, and the end holds a before and after beat. */
  hook?: boolean;
};

/** One agent's visit: it leaves, arrives at `to`, draws the box by `drawn` (types from typeStart to typeEnd) and is free at `done`. */
export type Job = { agent: number; target: number; leave: number; arrive: number; drawn: number; typeStart: number; typeEnd: number; done: number; to: Point; rest: Point; pin: boolean; bottom: number };
/** `lead`: the first agents of the crew take only the component jobs (see componentsOf); 0 when the crew is not split. */
export type Crew = { count: number; start: number; end: number; jobs: Job[]; home: Point[]; exits: { at: number; to: Point }[]; leaveIn: number; lead: number };
export type Tune = { start: number; atRadius: number; radiusUp: number; radiusDown: number; atDensity: number; densityUp: number; densityDown: number; settled: number; home: number };
export type Plan = {
  diag: Crew & { extraAt: number; chipHold: number };
  cross: { start: number; end: number };
  build: Crew;
  tune: Tune | null;
  end: number;
  /** Seconds the rebuild crew took, at 1x. */
  rebuildSeconds: number;
  focus: { t: number; y: number }[];
  beforeH: number;
  afterH: number;
  inset: { before: number; after: number };
  hook: boolean;
  /** The camera's smoothing scales with the pace, so a quick crew is not left behind. */
  cameraPace: number;
};

// Seconds at the normal pace; the fast pace scales them (see TIMES).
const BASE = {
  diagStart: 0.5,
  diagStagger: 0.2,
  diagDwell: 0.75,
  draw: 0.32,
  textDraw: 0.16,
  chipHold: 1.8,
  hold: 1,
  cross: 0.9,
  cps: 38,
  typeMax: 1.3,
  exit: 0.8,
  rebuildTarget: 11,
  travel: 1,
  tune: 1,
};
type Times = typeof BASE;
const TIMES: Record<Pace, Times> = {
  normal: BASE,
  fast: { diagStart: 0.15, diagStagger: 0.08, diagDwell: 0.2, draw: 0.16, textDraw: 0.08, chipHold: 1, hold: 0.3, cross: 0.4, cps: 110, typeMax: 0.3, exit: 0.4, rebuildTarget: 2.4, travel: 0.45, tune: 0.22 },
};
// A hook opening: the whole diagnose crew is out within a fifth of a second.
const HOOK = { diagStart: 0.05, diagStagger: 0.03 };
const CAMERA_HALF = 0.7;
/** Where the camera keeps the oldest job in flight: this far below the top of the window (or below a pinned bar). */
const HEAD = 90;
/** The least room kept above a job (below a pinned bar) and below one, so its pointer and label stay in the window. */
const TOP_PAD = 24;
const BOTTOM_PAD = 80;
/** A pinned bar taller than this share of the window is taken as a page that pins most of itself, not as a top bar. */
const INSET_MAX = 0.3;

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
const travel = (a: Point, b: Point, k: number): number => k * clamp(0.42 + Math.hypot(b.x - a.x, b.y - a.y) / 2600, 0.42, 1.05);

/** How many agents each crew gets for this much work. */
export const diagAgents = (spots: number, pace: Pace = 'normal'): number => (pace === 'fast' ? clamp(Math.ceil(spots / 3), Math.min(spots, 6), 16) : clamp(Math.ceil(spots / 3), 1, 6));
export const buildAgents = (layers: number, pace: Pace = 'normal'): number =>
  Math.min(layers, pace === 'fast' ? clamp(Math.round(layers / 2.5), 10, 24) : clamp(Math.round(layers / 5), 6, 24));

/** The layers that are components: a box (not a line of text) that holds at least two other layers and is no bigger than
 * about a screen and a half, so a card, a panel or a row of controls, not the page or a whole band. */
export function componentsOf(layers: Layer[]): boolean[] {
  const kids = layers.map(() => 0);
  for (const l of layers) if (l.parent >= 0) kids[l.parent]++;
  return layers.map((l, i) => l.chars === 0 && kids[i] >= 2 && l.box.w >= 80 && l.box.w * l.box.h <= VIEW.w * VIEW.h * 1.5);
}

/** How many of the rebuild crew place components: their share of the jobs, so neither part of the crew waits on the
 * other, at least two and leaving at least two, and none on a crew too small to split or a page with no components. */
export const componentAgents = (count: number, components: number, jobs: number): number =>
  count < 6 || components === 0 ? 0 : clamp(Math.round((count * components) / Math.max(1, jobs)), 2, count - 2);

/** Spots in the order the agents take them: whole page findings first, then top to bottom, left to right. A whole page
 * finding is a big box that starts on the first screen; a big box further down (a gradient band above the footer) waits
 * for its turn by height, or the camera would sit at the bottom from the start while the agents work above it. Pinned
 * spots (a fixed top bar, a side menu) are on screen wherever the camera is, so they go with the first screen. */
export function orderSpots<S extends Spot>(spots: S[], pageH = VIEW.h): S[] {
  const big = (s: Spot) => s.box.y < VIEW.h && s.box.w * s.box.h >= VIEW.w * Math.min(pageH, VIEW.h) * 0.4;
  const y = (s: Spot) => (s.box.pin ? 0 : s.box.y);
  return [...spots].sort((a, b) => Number(big(b)) - Number(big(a)) || y(a) - y(b) || a.box.x - b.box.x);
}

/** Where an agent's pointer lands on a box: just inside its top left corner, never off the page (or off the window,
 * for a pinned box). */
export function landing(box: Box, pageH: number): Point {
  const h = box.pin ? VIEW.h : pageH;
  return { x: clamp(box.x + 3, 4, VIEW.w - 24), y: clamp(box.y + 3, 4, Math.max(4, h - 24)) };
}

/** The top bar's reach, capped so a page that pins most of its window still leaves the camera room. */
export const insetOf = (n: number | undefined): number => clamp(n ?? 0, 0, VIEW.h * INSET_MAX);

/** The scroll range that shows every job in a set: its oldest landing below the bar, its lowest point above the bottom
 * edge. Empty (lo > hi) when the set is taller than the window. */
function span(top: number, bottom: number, pageH: number, inset: number): { lo: number; hi: number; want: number } {
  const max = Math.max(0, pageH - VIEW.h);
  return {
    lo: clamp(bottom - VIEW.h + BOTTOM_PAD, 0, max),
    hi: clamp(top - inset - TOP_PAD, 0, max),
    // The work centered in the part of the window below the bar, but never with its oldest job closer to the top than HEAD.
    want: clamp(Math.min(top - inset - HEAD, (top + bottom) / 2 - (VIEW.h + inset) / 2), 0, max),
  };
}

function homes(count: number, y: number): Point[] {
  return Array.from({ length: count }, (_, i) => ({ x: VIEW.w / 2 + (i - (count - 1) / 2) * 28, y }));
}

type Work = { box: Box; chars: number; parent: number };
type Rules = { start: number; gap: number; pageH: number; dwell: number; inset: number; times: Times; lead?: number; component?: boolean[] };

/** Hands each piece of work, in order, to the agent free first; a piece never lands before the one that holds it, and
 * never leaves while a job too far above it to share the window with it is still in flight. */
function assign(work: Work[], count: number, { start, gap, pageH, dwell, inset, times, lead = 0, component = [] }: Rules): Job[] {
  const home = homes(count, VIEW.h + 30);
  const free = Array.from({ length: count }, () => start);
  const at = home.map((p) => ({ ...p }));
  const jobs: Job[] = [];
  // The window rule: the jobs still unfinished at t (whatever their agents are doing) and this one fit on one screen.
  const fits = (to: Point, rest: Point, t: number): boolean => {
    let top = to.y;
    let bottom = Math.max(to.y, rest.y);
    for (const j of jobs) {
      if (j.pin || j.done <= t) continue;
      top = Math.min(top, j.to.y);
      bottom = Math.max(bottom, j.to.y, j.rest.y);
    }
    const s = span(top, bottom, pageH, inset);
    return s.lo <= s.hi + 1e-6;
  };
  work.forEach((w, i) => {
    // A split crew: the first `lead` agents take the components, the rest everything else.
    const [from, to_] = lead > 0 ? (component[i] ? [0, lead] : [lead, count]) : [0, count];
    let agent = from;
    for (let a = from + 1; a < to_; a++) if (free[a] < free[agent]) agent = a;
    const to = landing(w.box, pageH);
    const pin = Boolean(w.box.pin);
    const text = w.chars > 0;
    // Text: the pointer runs along the line as it types. A box: it drags from corner toward corner.
    const rest = text
      ? { x: clamp(to.x + w.box.w - 6, 4, VIEW.w - 24), y: to.y + Math.min(w.box.h * 0.6, 14) }
      : { x: clamp(to.x + Math.min(w.box.w, 300) - 6, 4, VIEW.w - 24), y: clamp(to.y + Math.min(w.box.h, 180) - 6, 4, Math.max(4, (pin ? VIEW.h : pageH) - 24)) };
    const trip = travel(at[agent], to, times.travel);
    let leave = Math.max(free[agent], start + i * gap);
    if (!pin && !fits(to, rest, leave)) {
      const ends = jobs.filter((j) => !j.pin && j.done > leave).map((j) => j.done).sort((a, b) => a - b);
      leave = ends.find((t) => fits(to, rest, t)) ?? leave;
    }
    let arrive = leave + trip;
    if (w.parent >= 0 && jobs[w.parent]) {
      const after = jobs[w.parent].arrive + 0.12;
      if (arrive < after) {
        arrive = after;
        leave = arrive - trip;
      }
    }
    const drawn = arrive + (text ? times.textDraw : times.draw);
    const typeStart = text ? arrive + 0.12 * times.travel : drawn;
    const typeEnd = text ? typeStart + Math.min(times.typeMax, w.chars / times.cps) : drawn;
    const done = Math.max(drawn, typeEnd) + dwell;
    jobs.push({ agent, target: i, leave, arrive, drawn, typeStart, typeEnd, done, to, rest, pin, bottom: w.box.y + w.box.h });
    free[agent] = done;
    at[agent] = pin ? { x: rest.x, y: rest.y } : rest;
  });
  return jobs;
}

function crew(jobs: Job[], count: number, start: number, leaveIn: number): Crew {
  const end = jobs.length ? Math.max(...jobs.map((j) => j.done)) : start;
  return { count, start, end, jobs, home: homes(count, VIEW.h + 30), exits: [], leaveIn, lead: 0 };
}

/** The focus the camera follows: at every moment a job leaves or ends, the scroll that keeps the jobs then in flight in
 * the window, the oldest near its top. It moves down as the work does and back up only when a job above needs it. */
function focusOf(jobs: Job[], pageH: number, inset: number, from: number, until: number): { t: number; y: number }[] {
  const out = [{ t: from, y: 0 }];
  let y = 0;
  const times = [...new Set(jobs.flatMap((j) => [j.leave, j.done]))].sort((a, b) => a - b);
  for (const t of times) {
    let top = Infinity;
    let bottom = -Infinity;
    for (const j of jobs) {
      if (j.pin || j.leave > t || j.done <= t) continue;
      top = Math.min(top, j.to.y);
      bottom = Math.max(bottom, j.to.y, j.rest.y);
    }
    if (top === Infinity) continue;
    const s = span(top, bottom, pageH, inset);
    y = s.lo > s.hi ? s.hi : clamp(Math.max(y, s.want), s.lo, s.hi);
    out.push({ t, y });
  }
  out.push({ t: until, y: 0 });
  return out;
}

export function plan(input: Input): Plan {
  const { spots, layers, beforeH, afterH } = input;
  const times = TIMES[input.pace ?? 'normal'];
  const hook = Boolean(input.hook);
  const inset = { before: insetOf(input.inset?.before), after: insetOf(input.inset?.after) };
  const diagStart = hook ? HOOK.diagStart : times.diagStart;

  const dCount = diagAgents(Math.max(1, spots.length), input.pace);
  const dJobs = assign(
    spots.map((s) => ({ box: s.box, chars: 0, parent: -1 })),
    dCount,
    { start: diagStart, gap: hook ? HOOK.diagStagger : times.diagStagger, pageH: beforeH, dwell: times.diagDwell, inset: inset.before, times },
  );
  const diag = crew(dJobs, dCount, diagStart, times.exit);
  const lastDrawn = dJobs.length ? Math.max(...dJobs.map((j) => j.drawn)) : diagStart;
  const extraAt = lastDrawn + 0.4 * times.travel;
  const cross = { start: Math.max(diag.end, extraAt) + times.hold, end: 0 };
  cross.end = cross.start + times.cross;

  const bCount = Math.max(1, buildAgents(layers.length, input.pace));
  const buildStart = cross.end - 0.2 * times.travel;
  const gap = clamp(times.rebuildTarget / Math.max(1, layers.length), 0.04 * times.travel, 0.2 * times.travel);
  const component = componentsOf(layers);
  const lead = componentAgents(bCount, component.filter(Boolean).length, layers.length);
  const bJobs = assign(layers, bCount, { start: buildStart, gap, pageH: afterH, dwell: 0.12 * times.travel, inset: inset.after, times, lead, component });
  const build = { ...crew(bJobs, bCount, buildStart, times.exit), lead };
  build.end = Math.max(build.end, buildStart) + 0.3 * times.travel;

  const focus = [...focusOf(dJobs, beforeH, inset.before, 0, cross.start), ...focusOf(bJobs, afterH, inset.after, buildStart, build.end)].sort((a, b) => a.t - b.t);

  let tune: Tune | null = null;
  let end = build.end + 0.6 * times.travel;
  if (input.tune) {
    const k = times.tune;
    const s0 = build.end + 0.5 * k;
    tune = { start: s0, atRadius: s0 + 1.1 * k, radiusUp: s0 + 2.5 * k, radiusDown: s0 + 3.9 * k, atDensity: s0 + 4.7 * k, densityUp: s0 + 6 * k, densityDown: s0 + 7.3 * k, settled: s0 + 8.4 * k, home: s0 + 9.1 * k };
    end = tune.home + 0.3 * k;
  }

  const p: Plan = { diag: { ...diag, extraAt, chipHold: times.chipHold }, cross, build, tune, end, rebuildSeconds: Math.round((build.end - buildStart) * 10) / 10, focus, beforeH, afterH, inset, hook, cameraPace: times.travel };
  // Each agent leaves the page from where it last worked, back toward the bar it came from.
  const exits = (c: Crew, leaveBy: number): Crew['exits'] =>
    c.home.map((h, a) => {
      const last = c.jobs.filter((j) => j.agent === a).reduce((m, j) => Math.max(m, j.done), c.start);
      const at = Math.min(last, leaveBy - times.exit);
      return { at, to: { x: h.x, y: cameraAt(p, at + times.exit) + VIEW.h + 30 } };
    });
  p.diag.exits = exits(p.diag, cross.end);
  p.build.exits = exits(p.build, build.end + times.exit);
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

/** How far the frames are scrolled at t: the focus under a triangle filter, so the camera eases and leads a little,
 * held to the range that shows every job in flight (leading toward the next job never leaves the current ones). */
export function cameraAt(p: Plan, t: number): number {
  const N = 10;
  let sum = 0;
  let weight = 0;
  for (let k = -N; k <= N; k++) {
    const w = N + 1 - Math.abs(k);
    sum += w * focusAt(p, t + (k * CAMERA_HALF * p.cameraPace) / N);
    weight += w;
  }
  const y = sum / weight;
  const diag = t < p.cross.start;
  const c = diag ? p.diag : p.build;
  let top = Infinity;
  let bottom = -Infinity;
  for (const j of c.jobs) {
    if (j.pin || j.leave > t || j.done <= t) continue;
    top = Math.min(top, j.to.y);
    bottom = Math.max(bottom, j.to.y, j.rest.y);
  }
  if (top === Infinity) return y;
  const s = span(top, bottom, diag ? p.beforeH : p.afterH, diag ? p.inset.before : p.inset.after);
  return s.lo > s.hi ? s.hi : clamp(y, s.lo, s.hi);
}

/** How many pixels of a box's top are under the page's pinned top bar at camera y (0 for a pinned box). */
export function underBar(box: Box, cam: number, inset: number): number {
  if (box.pin || inset <= 0) return 0;
  return clamp(cam + inset - box.y, 0, box.h);
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
  return { drawn: house(progress(t, j.arrive, j.drawn)), chip: t >= j.drawn && t < Math.min(j.drawn + p.diag.chipHold, p.cross.start), fade: 1 - progress(t, p.cross.start, p.cross.end) };
}

/** A layer at t: whether it shows, how many of its characters are typed, and its agent's box (drawn 0..1, off when null). */
export function layerAt(p: Plan, layers: Layer[], i: number, t: number): { shown: boolean; typed: number; box: number | null } {
  const j = p.build.jobs[i];
  const l = layers[i];
  if (!j || !l) return { shown: true, typed: l?.chars ?? 0, box: null };
  if (t >= p.end) return { shown: true, typed: l.chars, box: null };
  const shown = t >= j.arrive + (l.chars ? 0.05 : (j.drawn - j.arrive) * 0.55);
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

/** Where agent `a` of a crew is at t, in page pixels, and whether it is on the page at all. `cam` is the camera at t: a
 * pinned job's points are in window pixels, so they move with it. */
export function agentAt(c: Crew, a: number, t: number, cam = 0): { at: Point; on: boolean } {
  const jobs = c.jobs.filter((j) => j.agent === a);
  const exit = c.exits[a];
  const on = jobs.length > 0 && t >= c.start - 0.1 && (!exit || t <= exit.at + c.leaveIn);
  const page = (pt: Point, pin: boolean): Point => (pin ? { x: pt.x, y: pt.y + cam } : pt);
  let prev = c.home[a];
  for (const j of jobs) {
    const to = page(j.to, j.pin);
    const rest = page(j.rest, j.pin);
    if (t < j.leave) return { at: prev, on };
    if (t < j.arrive) return { at: mix(prev, to, house(progress(t, j.leave, j.arrive))), on };
    if (t < j.done) {
      const moving = j.typeEnd > j.drawn ? progress(t, j.typeStart, j.typeEnd) : house(progress(t, j.arrive, j.drawn));
      return { at: mix(to, rest, moving), on };
    }
    prev = rest;
  }
  if (exit && t > exit.at) return { at: mix(prev, exit.to, house(progress(t, exit.at, exit.at + c.leaveIn))), on };
  return { at: prev, on };
}

/** The job agent `a` is on at t (from leaving to done), if any. */
export function jobAt(c: Crew, a: number, t: number): Job | undefined {
  return c.jobs.find((j) => j.agent === a && j.leave <= t && t < j.done);
}

/**
 * How well the camera follows a crew at t, in the terms record.mjs and the test check: of the agents drawing (arrived,
 * not done), how many have their pointer in the window and not under the pinned bar; the lowest edge of any box a job
 * has left for by t (below it nobody has started, so the window should never sit wholly past it); and the share of the
 * window below that edge.
 */
export function framingAt(p: Plan, c: Crew, t: number): { drawing: number; inside: number; cam: number; frontier: number | null; empty: number } {
  const cam = cameraAt(p, t);
  const inset = c === p.diag ? p.inset.before : p.inset.after;
  let drawing = 0;
  let inside = 0;
  for (let a = 0; a < c.count; a++) {
    const j = jobAt(c, a, t);
    if (!j || t < j.arrive) continue;
    drawing++;
    const y = agentAt(c, a, t, cam).at.y;
    if (j.pin || (y >= cam + inset && y <= cam + VIEW.h)) inside++;
  }
  let frontier: number | null = null;
  for (const j of c.jobs) if (!j.pin && j.leave <= t) frontier = Math.max(frontier ?? -Infinity, j.bottom);
  const empty = frontier === null ? 0 : clamp((cam + VIEW.h - frontier) / VIEW.h, 0, 1);
  return { drawing, inside, cam, frontier, empty };
}

/** Whether the window shows some started work below the pinned bar at t (it never sits wholly past the work). */
export const behindWork = (f: { cam: number; frontier: number | null }, inset: number): boolean => f.frontier === null || f.cam + inset < f.frontier;

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
