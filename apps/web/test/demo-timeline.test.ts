// The /demo timeline (app/demo/timeline.ts) on spots and layers shaped like the worked rebuild: the phases run in order
// and the whole demo stays between 20 and 40 seconds, several agents work at once in both crews, no agent holds two
// jobs at a time, a layer never lands before the layer that holds it, the rule count climbs to every rule found
// (including the ones only the narrow width shows), every layer shows and every line is typed by the end, the camera
// stays on the page, and the tokens come back to the page's own theme.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  VIEW,
  agentAt,
  buildAgents,
  cameraAt,
  diagAgents,
  foundAt,
  layerAt,
  layersShownAt,
  orderSpots,
  phaseAt,
  plan,
  tokensAt,
  type Crew,
  type Layer,
  type Spot,
} from '../app/demo/timeline.ts';
import { bezier } from '../app/demo/stageshow.ts';

const spot = (x: number, y: number, w: number, h: number, ...rules: string[]): Spot => ({ box: { x, y, w, h }, rules });
// Eighteen elements and seventeen rules, like examples/rebuild/before.html at 1300 wide; RSP-01 shows only at 390.
const SPOTS = orderSpots(
  [
    spot(0, 0, 1300, 902, 'TYP-01', 'CMP-11'),
    spot(0, 0, 1300, 577, 'COL-01'),
    spot(900, 0, 400, 360, 'BG-01'),
    spot(534, 113, 232, 35, 'AC-03'),
    spot(548, 127, 8, 8, 'AC-08'),
    spot(64, 176, 1172, 15, 'AC-01'),
    spot(772, 199, 317, 89, 'COL-04', 'TYP-03'),
    spot(160, 205, 980, 157, 'TYP-04', 'TYP-05'),
    spot(485, 280, 273, 87, 'TYP-03'),
    spot(330, 384, 640, 57, 'AC-02', 'AC-03'),
    spot(497, 473, 140, 48, 'AC-16'),
    spot(651, 473, 152, 48, 'COL-03', 'COL-07'),
    ...[91, 488, 886].flatMap((x) => [spot(x, 652, 44, 44, 'AC-03', 'COL-06'), spot(x, 800, 50, 19, 'AC-04', 'COL-06')]),
  ],
  902,
);
const EXTRA = ['RSP-01'];

// A page like after.html: a header with a name and three links, a hero with copy and a panel of three rows, a footer.
// Blocks hold the lines inside them; a line's chars are the characters it types.
function afterLayers(): Layer[] {
  const out: Layer[] = [];
  const add = (x: number, y: number, w: number, h: number, chars: number, parent: number) => out.push({ box: { x, y, w, h }, chars, parent }) - 1;
  const header = add(0, 0, 1300, 65, 0, -1);
  const name = add(114, 10, 110, 44, 0, header);
  add(114, 22, 110, 20, 11, name);
  for (const x of [900, 980, 1060]) {
    const link = add(x, 10, 60, 44, 0, header);
    add(x + 5, 22, 50, 18, 6, link);
  }
  const main = add(0, 65, 1300, 740, 0, -1);
  const copy = add(114, 200, 500, 420, 0, main);
  for (let i = 0; i < 9; i++) add(114, 210 + i * 40, 480, 34, 24 + i * 3, copy);
  const panel = add(670, 160, 516, 520, 0, main);
  for (let r = 0; r < 3; r++) {
    const row = add(702, 420 + r * 80, 452, 70, 0, panel);
    add(718, 430 + r * 80, 200, 20, 14, row);
    add(718, 455 + r * 80, 400, 20, 60, row);
  }
  const footer = add(0, 805, 1300, 66, 0, -1);
  add(114, 826, 380, 22, 52, footer);
  return out;
}
const LAYERS = afterLayers();
const INPUT = { spots: SPOTS, extra: EXTRA, layers: LAYERS, beforeH: 902, afterH: 871, tune: true };
const p = plan(INPUT);
const RULES = new Set([...SPOTS.flatMap((s) => s.rules), ...EXTRA]);

const overlapFree = (c: Crew) => {
  for (let a = 0; a < c.count; a++) {
    const jobs = c.jobs.filter((j) => j.agent === a).sort((x, y) => x.leave - y.leave);
    for (let i = 1; i < jobs.length; i++) assert.ok(jobs[i].leave >= jobs[i - 1].done - 1e-9, `agent ${a} starts a job before finishing the last`);
  }
};

test('the stageshow curve runs from 0 to 1 and eases in and out', () => {
  const f = bezier('house');
  assert.equal(f(0), 0);
  assert.equal(f(1), 1);
  assert.ok(f(0.25) < 0.25 && f(0.75) > 0.75);
});

test('the phases run in order and the whole demo stays between 20 and 40 seconds', () => {
  assert.ok(p.end >= 20 && p.end <= 40, `end ${p.end}`);
  assert.equal(phaseAt(p, 0), 'diagnose');
  assert.equal(phaseAt(p, p.cross.start + 0.01), 'rebuild');
  assert.equal(phaseAt(p, p.tune!.start + 0.01), 'tune');
  assert.equal(phaseAt(p, p.end), 'end');
  assert.ok(p.diag.end <= p.cross.start && p.build.end <= p.tune!.start);
  assert.ok(p.rebuildSeconds > 4 && p.rebuildSeconds < 20, `rebuild ${p.rebuildSeconds}s`);
});

test('both crews work several at a time, never two jobs per agent', () => {
  assert.equal(p.diag.count, diagAgents(SPOTS.length));
  assert.equal(p.build.count, buildAgents(LAYERS.length));
  assert.ok(p.diag.count >= 3 && p.build.count >= 6);
  overlapFree(p.diag);
  overlapFree(p.build);
  const busy = (c: Crew, t: number) => c.jobs.filter((j) => j.leave <= t && t < j.done).length;
  let most = 0;
  for (let t = p.build.start; t < p.build.end; t += 0.1) most = Math.max(most, busy(p.build, t));
  assert.ok(most >= 5, `at most ${most} rebuild agents busy at once`);
  most = 0;
  for (let t = 0; t < p.diag.end; t += 0.1) most = Math.max(most, busy(p.diag, t));
  assert.ok(most >= 3, `at most ${most} diagnose agents busy at once`);
});

test('a layer lands after the layer that holds it, and shows only once its agent is there', () => {
  p.build.jobs.forEach((j, i) => {
    const parent = LAYERS[i].parent;
    if (parent >= 0) assert.ok(j.arrive > p.build.jobs[parent].arrive, `layer ${i} lands before its holder ${parent}`);
    assert.equal(layerAt(p, LAYERS, i, j.arrive - 0.01).shown, false);
  });
});

test('the rule count climbs to every rule found, the narrow ones last', () => {
  assert.equal(foundAt(p, SPOTS, EXTRA, 0).size, 0);
  let last = 0;
  for (let t = 0; t <= p.cross.start; t += 0.05) {
    const n = foundAt(p, SPOTS, EXTRA, t).size;
    assert.ok(n >= last, 'the count only climbs');
    last = n;
  }
  assert.deepEqual(foundAt(p, SPOTS, EXTRA, p.cross.start), RULES);
  assert.ok(!foundAt(p, SPOTS, EXTRA, p.diag.extraAt - 0.01).has('RSP-01'));
});

test('every layer shows and every line is typed by the end of the rebuild', () => {
  assert.equal(layersShownAt(p, LAYERS, p.cross.start), 0);
  assert.equal(layersShownAt(p, LAYERS, p.build.end), LAYERS.length);
  LAYERS.forEach((l, i) => assert.equal(layerAt(p, LAYERS, i, p.build.end).typed, l.chars));
  let last = 0;
  for (let t = p.build.start; t <= p.build.end; t += 0.05) {
    const n = layersShownAt(p, LAYERS, t);
    assert.ok(n >= last);
    last = n;
  }
});

test('agents start and end off the page, and the camera stays on it', () => {
  for (const c of [p.diag, p.build]) {
    for (let a = 0; a < c.count; a++) {
      assert.ok(agentAt(c, a, c.start).at.y > VIEW.h, 'starts below the window');
      assert.ok(!agentAt(c, a, p.end + 1).on, 'gone by the end');
    }
  }
  for (let t = 0; t <= p.end; t += 0.1) {
    const y = cameraAt(p, t);
    assert.ok(y >= 0 && y <= Math.max(902, 871) - VIEW.h + 1e-9, `camera ${y} at ${t}`);
  }
  assert.equal(cameraAt(p, p.end), 0);
});

test('a long page moves the camera down with the work and back to the top', () => {
  const tall = LAYERS.map((l) => ({ ...l, box: { ...l.box, y: l.box.y * 3 } }));
  const q = plan({ ...INPUT, layers: tall, afterH: 871 * 3 });
  let most = 0;
  for (let t = q.build.start; t <= q.build.end; t += 0.1) most = Math.max(most, cameraAt(q, t));
  assert.ok(most > 871, `the camera reached ${most}`);
  assert.equal(cameraAt(q, q.end), 0);
});

test('the tokens move and come back to the page theme, and stay put without tokens', () => {
  const seen = { radius: new Set<number>(), density: new Set<number>() };
  for (let t = 0; t <= p.end; t += 0.25) {
    const v = tokensAt(p, t);
    seen.radius.add(Math.round(v.radius * 10));
    seen.density.add(Math.round(v.density * 10));
  }
  assert.ok(seen.radius.size > 5 && seen.density.size > 5, 'both sliders move');
  assert.deepEqual(tokensAt(p, p.end), { radius: 1, density: 1 });
  assert.deepEqual(tokensAt(p, 0), { radius: 1, density: 1 });
  const q = plan({ ...INPUT, tune: false });
  assert.equal(q.tune, null);
  assert.deepEqual(tokensAt(q, q.end - 1), { radius: 1, density: 1 });
  assert.ok(q.end < p.end);
});

test('a page with many layers keeps the rebuild near the same length with more agents', () => {
  const many: Layer[] = Array.from({ length: 190 }, (_, i) => ({ box: { x: (i % 10) * 120, y: Math.floor(i / 10) * 40, w: 110, h: 30 }, chars: i % 3 ? 20 : 0, parent: -1 }));
  const q = plan({ ...INPUT, layers: many, afterH: 871 });
  assert.equal(q.build.count, 24);
  assert.ok(q.rebuildSeconds < 18, `rebuild ${q.rebuildSeconds}s`);
  assert.equal(layersShownAt(q, many, q.build.end), 190);
});
