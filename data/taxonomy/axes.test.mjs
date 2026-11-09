// node --test data/taxonomy/axes.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import taxonomy from './taxonomy.json' with { type: 'json' };
import { AXIS_IDS, DEFAULTS, STEPS, snapValue, validateAxes, balance, createAxes } from './axes.mjs';
import { classify } from './classify.mjs';

const onGrid = (s) => AXIS_IDS.every((id) => STEPS[id].includes(s[id]));

test('axes come from the taxonomy in declared order', () => {
  assert.deepEqual(AXIS_IDS, taxonomy.axes.map((a) => a.id));
  assert.ok(AXIS_IDS.length >= 6 && AXIS_IDS.length <= 8);
});

test('defaults are valid and on the grid', () => {
  assert.deepEqual(validateAxes(DEFAULTS), []);
  assert.ok(onGrid(DEFAULTS));
});

test('validateAxes reports unknown axes, bad numbers, off-step values and broken constraints', () => {
  const v = validateAxes({ ornament: 1, motion: 'fast', contrast: 0.3, density: 1, 'type-expression': 1 });
  const codes = v.map((x) => x.code);
  assert.ok(codes.includes('unknown-axis'));
  assert.ok(codes.includes('not-a-number'));
  const off = v.find((x) => x.code === 'off-step');
  assert.equal(off.axis, 'contrast');
  assert.equal(off.nearest, 0.25);
  const broken = v.find((x) => x.constraint === 'dense-screens-quiet-type');
  assert.deepEqual(broken.prevents, ['TYP-04', 'TYP-05']);
  assert.ok(validateAxes({ density: 1.5 }).some((x) => x.code === 'out-of-range'));
});

test('missing axes take their defaults', () => {
  assert.deepEqual(validateAxes({}), []);
  assert.deepEqual(balance({}, null), DEFAULTS);
});

test('snapValue goes to the nearest step, ties to the lower step, and clamps', () => {
  assert.equal(snapValue('density', 0.6), 0.5);
  assert.equal(snapValue('density', 0.625), 0.5);
  assert.equal(snapValue('density', 0.63), 0.75);
  assert.equal(snapValue('contrast', 0), 0.25);
  assert.equal(snapValue('motion', 7), 1);
  assert.throws(() => snapValue('ornament', 0.5), /Unknown axis/);
});

test('raising density quiets type and motion by the least amount', () => {
  const r = balance({ ...DEFAULTS, density: 1 }, 'density');
  assert.equal(r.density, 1);
  assert.equal(r['type-expression'], 0.25);
  assert.equal(r.motion, 0.25);
  for (const id of ['contrast', 'roundness', 'color-restraint', 'elevation', 'stroke']) assert.equal(r[id], DEFAULTS[id]);
  assert.deepEqual(validateAxes(r), []);
});

test('radius and depth stay within one material band', () => {
  const r = balance({ ...DEFAULTS, roundness: 1 }, 'roundness');
  assert.equal(r.roundness, 1);
  assert.equal(r.elevation, 0.5);
  assert.deepEqual(validateAxes(r), []);
});

test('poster type forces a restrained palette and an open layout', () => {
  const r = balance({ ...DEFAULTS, 'type-expression': 1, 'color-restraint': 0.5 }, 'type-expression');
  assert.equal(r['type-expression'], 1);
  assert.equal(r['color-restraint'], 1);
  assert.ok(r.density <= 0.25);
  assert.deepEqual(validateAxes(r), []);
});

test('a valid snapped setting comes back unchanged', () => {
  const s = { ...DEFAULTS, stroke: 0.5, motion: 0.25 };
  assert.deepEqual(validateAxes(s), []);
  assert.deepEqual(balance(s, 'stroke'), s);
});

test('off-grid input is snapped, then balanced', () => {
  const r = balance({ density: 0.93, motion: 0.81, contrast: 0.02 }, 'density');
  assert.ok(onGrid(r));
  assert.equal(r.density, 1);
  assert.equal(r.contrast, 0.25);
  assert.deepEqual(validateAxes(r), []);
});

test('balance is deterministic and every step of every axis is reachable', () => {
  for (const id of AXIS_IDS) {
    for (const v of STEPS[id]) {
      const a = balance({ ...DEFAULTS, [id]: v }, id);
      assert.deepEqual(balance({ ...DEFAULTS, [id]: v }, id), a);
      assert.equal(a[id], v);
      assert.deepEqual(validateAxes(a), []);
    }
  }
});

test('balance rejects unknown axes and non-numbers', () => {
  assert.throws(() => balance({ ornament: 1 }, null), /Unknown axis/);
  assert.throws(() => balance(DEFAULTS, 'ornament'), /Unknown axis/);
  assert.throws(() => balance({ density: Number.NaN }, 'density'), /finite number/);
});

test('when the changed axis has no valid partner setting it steps back to the nearest one that works', () => {
  const spec = structuredClone(taxonomy);
  spec.constraints.push({ id: 'test-cap', principle: 'Test only.', terms: { density: 1 }, op: '<=', bound: 0.5, prevents: ['LAY-06'] });
  const ax = createAxes(spec);
  const r = ax.balance({ ...ax.defaults, density: 1 }, 'density');
  assert.equal(r.density, 0.5);
  assert.deepEqual(ax.validateAxes(r), []);
});

test('the decision key gives every part exactly one category', () => {
  assert.equal(classify(['is_page_section', 'is_first_section']).category, 'hero');
  assert.equal(classify(['keeps_a_value', 'floats_above_page']).category, 'form-input');
  assert.equal(classify([]).fallback, true);
  assert.throws(() => classify(['is_shiny']), /Unknown feature/);
});
