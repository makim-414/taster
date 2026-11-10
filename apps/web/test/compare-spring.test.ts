// The home page's before/after slider asks for animation frames only while the divider moves: through the intro sweep,
// then until the spring settles, then not at all until the next input. This runs the spring at 60 frames a second
// the way compare-reveal.tsx does and counts the frames it asks for.
import test from 'node:test';
import assert from 'node:assert/strict';

import { REST, SWEEP_SECONDS, step, type Spring } from '../app/compare-spring.ts';

const DT = 1 / 60;

/** Frames run until step() says the divider is at rest, or `limit` frames. */
function run(s: Spring, from = 0, limit = 60 * 60): { frames: number; end: number } {
  let t = from;
  for (let frames = 1; frames <= limit; frames++) {
    t += DT;
    if (!step(s, t, DT)) return { frames, end: t };
  }
  return { frames: limit, end: t };
}

const fresh = (): Spring => ({ x: 50, v: 0, target: 50, introActive: true, introDone: false, introStart: 0 });

test('the loop keeps running through the intro sweep, then stops on the centre', () => {
  const s = fresh();
  const { frames, end } = run(s);
  assert.ok(end >= SWEEP_SECONDS, `stopped at ${end.toFixed(2)}s, inside the ${SWEEP_SECONDS}s sweep`);
  // The spring settles within about two seconds of the sweep ending, so an idle slider stops, not runs for a minute.
  assert.ok(frames < 60 * (SWEEP_SECONDS + 2), `still asking for frames after ${frames} frames`);
  assert.equal(s.introActive, false);
  assert.equal(s.introDone, true);
  assert.equal(s.x, 50);
  assert.equal(s.v, 0);
});

test('at rest, a frame does not move the divider and asks for no more', () => {
  const s: Spring = { x: 50, v: 0, target: 50, introActive: false, introDone: true, introStart: 0 };
  assert.equal(step(s, 10, DT), false);
  assert.equal(s.x, 50);
});

test('a new target from a pointer or a key starts the loop again until the divider reaches it', () => {
  const s: Spring = { x: 50, v: 0, target: 50, introActive: false, introDone: true, introStart: 0 };
  s.target = 80;
  assert.equal(step(s, 10, DT), true, 'the first frame after input should keep the loop running');
  const { frames } = run(s, 10 + DT);
  assert.ok(frames > 1 && frames < 60 * 3, `settled after ${frames} frames`);
  assert.equal(s.x, 80);
  assert.equal(s.v, 0);
});

test('the divider ends within REST of the target at both edges', () => {
  for (const target of [0, 100]) {
    const s: Spring = { x: 50, v: 0, target, introActive: false, introDone: true, introStart: 0 };
    run(s, 0);
    assert.ok(Math.abs(s.x - target) < REST, `x ${s.x} for target ${target}`);
    assert.equal(s.v, 0);
  }
});
