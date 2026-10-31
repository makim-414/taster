import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitizeRecipe } from '../../registry/src/motion/_orb-recipe.ts';

test('a recipe cannot set anything outside the ranges', () => {
  const bad = sanitizeRecipe({ state: 'working', speed: 1e9, dots: -5, tint: 'url(javascript:alert(1))', opts: { particles: 1e9, evil: 1 }, extra: 'x' });
  assert.deepEqual(bad, { state: 'working', speed: 3, dots: 0.2, opts: { particles: 8 } });
  assert.equal(sanitizeRecipe({ state: 'nope' }), null);
});
