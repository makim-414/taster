// Weighting axes: validation and balancing over taxonomy.axes, taxonomy.snap and taxonomy.constraints.
// Pure functions, no I/O after the JSON import. See taxonomy/SCHEMA.md, "Axes" and "Balance".
//
//   validateAxes({ density: 1, 'type-expression': 1 })
//     -> [{ code: 'constraint', constraint: 'dense-screens-quiet-type', prevents: ['TYP-04', 'TYP-05'], ... }]
//   balance({ ...DEFAULTS, density: 1 }, 'density')
//     -> { density: 1, ..., 'type-expression': 0.25, motion: 0.25, ... }   (snapped, satisfies every constraint)
//
// Settings are plain objects { axisId: number }. Missing axes take the axis default.
import taxonomy from './taxonomy.json' with { type: 'json' };

const EPS = 1e-9;

export function createAxes(spec) {
  const ids = spec.axes.map((a) => a.id);
  const known = new Set(ids);
  const steps = Object.fromEntries(ids.map((id) => [id, [...spec.snap[id].steps].sort((a, b) => a - b)]));
  const defaults = Object.fromEntries(spec.axes.map((a) => [a.id, a.default]));
  const constraints = spec.constraints;

  const lhs = (c, s) => Object.entries(c.terms).reduce((sum, [a, k]) => sum + k * s[a], 0);
  const holds = (c, s) => (c.op === '<=' ? lhs(c, s) <= c.bound + EPS : lhs(c, s) >= c.bound - EPS);

  // Nearest allowed step after clamping to 0..1. An exact tie between two steps goes to the lower one.
  function snapValue(axisId, value) {
    const list = steps[axisId];
    if (!list) throw new Error(`Unknown axis ${axisId}. Known: ${ids.join(', ')}`);
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${axisId} must be a finite number`);
    const v = Math.min(1, Math.max(0, value));
    let best = list[0];
    for (const s of list) if (Math.abs(s - v) < Math.abs(best - v) - EPS) best = s;
    return best;
  }

  function validateAxes(settings = {}) {
    const out = [];
    const full = { ...defaults };
    for (const [axis, value] of Object.entries(settings)) {
      if (!known.has(axis)) { out.push({ code: 'unknown-axis', axis, message: `Unknown axis ${axis}` }); continue; }
      if (typeof value !== 'number' || !Number.isFinite(value)) { out.push({ code: 'not-a-number', axis, value, message: `${axis} must be a finite number` }); continue; }
      full[axis] = value;
      if (value < -EPS || value > 1 + EPS) out.push({ code: 'out-of-range', axis, value, message: `${axis}=${value} is outside 0..1` });
      else if (!steps[axis].some((s) => Math.abs(s - value) <= EPS)) {
        out.push({ code: 'off-step', axis, value, nearest: snapValue(axis, value), message: `${axis}=${value} is between steps ${steps[axis].join(', ')}` });
      }
    }
    for (const c of constraints) {
      if (!holds(c, full)) {
        out.push({ code: 'constraint', constraint: c.id, value: lhs(c, full), op: c.op, bound: c.bound, prevents: c.prevents, message: `${c.id}: ${c.principle}` });
      }
    }
    return out;
  }

  // Exact minimum over the snapped grid with `fixed` axes held. Returns null when nothing satisfies every constraint.
  function search(start, fixed) {
    const free = ids.filter((id) => !fixed.has(id));
    const order = Object.fromEntries(free.map((id) => [id, [...steps[id]].sort((a, b) => {
      const da = Math.abs(a - start[id]), db = Math.abs(b - start[id]);
      return Math.abs(da - db) > EPS ? da - db : a - b; // closer first, then the lower value
    })]));
    // A constraint is checked at the first depth where all its axes are assigned.
    const depthOf = (c) => Math.max(-1, ...Object.keys(c.terms).map((a) => free.indexOf(a)));
    const checkAt = free.map((_, d) => constraints.filter((c) => depthOf(c) === d));
    const checkFirst = constraints.filter((c) => depthOf(c) === -1);
    const cur = { ...start };
    if (!checkFirst.every((c) => holds(c, cur))) return null;
    let best = null, bestKey = null;
    const keyOf = () => {
      const abs = free.map((id) => Math.abs(cur[id] - start[id]));
      const signed = free.map((id) => cur[id] - start[id]);
      return [abs.reduce((a, b) => a + b, 0), abs.filter((d) => d > EPS).length, ...abs, ...signed];
    };
    const less = (a, b) => { for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > EPS) return a[i] < b[i]; return false; };
    (function walk(d, cost) {
      if (bestKey && cost > bestKey[0] + EPS) return;
      if (d === free.length) {
        const key = keyOf();
        if (!bestKey || less(key, bestKey)) { bestKey = key; best = { ...cur }; }
        return;
      }
      const id = free[d];
      for (const v of order[id]) {
        cur[id] = v;
        if (checkAt[d].every((c) => holds(c, cur))) walk(d + 1, cost + Math.abs(v - start[id]));
      }
      cur[id] = start[id];
    })(0, 0);
    return best && Object.fromEntries(ids.map((id) => [id, best[id]]));
  }

  function balance(settings = {}, changedAxis = null) {
    for (const [axis, value] of Object.entries(settings)) {
      if (!known.has(axis)) throw new Error(`Unknown axis ${axis}. Known: ${ids.join(', ')}`);
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${axis} must be a finite number`);
    }
    if (changedAxis !== null && changedAxis !== undefined && !known.has(changedAxis)) {
      throw new Error(`Unknown axis ${changedAxis}. Known: ${ids.join(', ')}`);
    }
    const start = Object.fromEntries(ids.map((id) => [id, snapValue(id, settings[id] ?? defaults[id])]));
    if (!changedAxis) {
      const r = search(start, new Set());
      if (r) return r;
      throw new Error('No snapped setting satisfies the constraints');
    }
    // Keep the changed axis where the person put it. Only if no setting of the other axes can live with that
    // value does the changed axis itself step back, to the nearest value that works.
    const wanted = start[changedAxis];
    const tries = [...steps[changedAxis]].sort((a, b) => {
      const da = Math.abs(a - wanted), db = Math.abs(b - wanted);
      return Math.abs(da - db) > EPS ? da - db : a - b;
    });
    for (const v of tries) {
      const r = search({ ...start, [changedAxis]: v }, new Set([changedAxis]));
      if (r) return r;
    }
    throw new Error('No snapped setting satisfies the constraints');
  }

  return { axes: ids, defaults: { ...defaults }, steps, snapValue, validateAxes, balance };
}

const repo = createAxes(taxonomy);
export const AXIS_IDS = repo.axes;
export const DEFAULTS = repo.defaults;
export const STEPS = repo.steps;
export const snapValue = repo.snapValue;
export const validateAxes = repo.validateAxes;
export const balance = repo.balance;
