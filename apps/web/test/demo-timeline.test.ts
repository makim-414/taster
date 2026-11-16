// The /demo timeline (app/demo/timeline.ts) on spots shaped like the worked rebuild's findings: the loop stays between
// 25 and 35 seconds, the three cursors' jobs overlap, the reveal line never passes a spot before it was drawn, the
// counters end at every rule found and none left, and the tokens come back to the page's own theme.
import test from 'node:test';
import assert from 'node:assert/strict';

import { FRAME, countsAt, orderSpots, plan, revealAt, tokensAt, visitedAt, type Band, type Spot } from '../app/demo/timeline.ts';

const spot = (x: number, y: number, w: number, h: number, ...rules: string[]): Spot => ({ box: { x, y, w, h }, rules });
// Eighteen elements and seventeen rules, like examples/rebuild/before.html at 1300 wide.
const SPOTS = orderSpots([
  spot(0, 0, 1300, 902, 'TYP-01', 'CMP-11'),
  spot(0, 0, 1300, 577, 'COL-01'),
  spot(900, -160, 520, 520, 'BG-01'),
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
]);
const BANDS: Band[] = [
  { top: 0, bottom: 577 },
  { top: 577, bottom: FRAME.h },
];
const RULES = new Set(SPOTS.flatMap((s) => s.rules));
const p = plan(SPOTS, BANDS);

test('the loop runs 25 to 35 seconds and the jobs overlap', () => {
  assert.ok(p.loop >= 25 && p.loop <= 35, `loop ${p.loop}`);
  const diagEnd = p.visits[p.visits.length - 1];
  assert.ok(p.bands[0].start < diagEnd, 'swap starts while diagnose is still visiting');
  assert.ok(p.system.start < p.swapEnd, 'system starts while swap is still wiping');
  assert.ok(p.end < p.loop, 'the end state holds before the loop starts again');
});

test('whole page findings come first, then top to bottom', () => {
  assert.equal(SPOTS[0].box.w * SPOTS[0].box.h, 1300 * 902);
  const rest = SPOTS.slice(2).map((s) => s.box.y);
  assert.deepEqual(rest, [...rest].sort((a, b) => a - b));
});

test('the reveal line never passes a spot the diagnose cursor has not drawn', () => {
  for (let t = 0; t <= p.loop; t += 0.05) {
    const line = revealAt(p, t);
    const seen = visitedAt(p, t);
    SPOTS.forEach((s, i) => {
      if (i > seen) assert.ok(line <= Math.max(0, s.box.y), `at ${t.toFixed(2)}s the line ${line} passed spot ${i} at ${s.box.y}`);
    });
  }
});

test('the counters find every rule and end with none left', () => {
  assert.deepEqual(countsAt(p, SPOTS, 0), { found: 0, remaining: 0 });
  const mid = countsAt(p, SPOTS, p.visits[p.visits.length - 1]);
  assert.equal(mid.found, RULES.size);
  assert.deepEqual(countsAt(p, SPOTS, p.swapEnd), { found: RULES.size, remaining: 0 });
  let last = Infinity;
  for (let t = p.visits[p.visits.length - 1]; t <= p.swapEnd; t += 0.05) {
    const { remaining } = countsAt(p, SPOTS, t);
    assert.ok(remaining <= last, 'the rules left only go down while the swap runs');
    last = remaining;
  }
  assert.equal(revealAt(p, p.swapEnd), FRAME.h);
});

test('a rule the rebuilt page still hits stays in the count to the end', () => {
  const stays = new Set(['CMP-11']);
  assert.deepEqual(countsAt(p, SPOTS, 0, stays), { found: 0, remaining: 0 });
  assert.deepEqual(countsAt(p, SPOTS, p.swapEnd, stays), { found: RULES.size, remaining: 1 });
  assert.equal(countsAt(p, SPOTS, p.swapEnd, new Set(['NEW-01'])).remaining, 1, 'a rule only the rebuilt page hits shows at the end');
});

test('the tokens move and come back to the page theme', () => {
  const seen = { radius: new Set<number>(), density: new Set<number>() };
  for (let t = 0; t <= p.loop; t += 0.25) {
    const v = tokensAt(p, t);
    seen.radius.add(Math.round(v.radius * 10));
    seen.density.add(Math.round(v.density * 10));
  }
  assert.ok(seen.radius.size > 5 && seen.density.size > 5, 'both sliders move');
  assert.deepEqual(tokensAt(p, p.end), { radius: 1, density: 1 });
  assert.deepEqual(tokensAt(p, 0), { radius: 1, density: 1 });
});
