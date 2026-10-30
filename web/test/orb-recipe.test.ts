import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeRecipe, encodeRecipe, recipeToCode, sanitizeRecipe } from '../../registry/src/motion/_orb-recipe.ts';

test('a recipe survives a share link', () => {
  const recipe = { state: 'connecting' as const, speed: 0.5, opts: { signals: 2 } };
  assert.deepEqual(decodeRecipe(encodeRecipe(recipe)), recipe);
});

test('a hostile link cannot set anything outside the ranges', () => {
  const bad = sanitizeRecipe({ state: 'working', speed: 1e9, dots: -5, tint: 'url(javascript:alert(1))', opts: { particles: 1e9, evil: 1 }, extra: 'x' });
  assert.deepEqual(bad, { state: 'working', speed: 3, dots: 0.2, opts: { particles: 8 } });
  assert.equal(sanitizeRecipe({ state: 'nope' }), null);
  assert.equal(decodeRecipe('not-base64!!'), null);
  assert.equal(decodeRecipe('A'.repeat(3000)), null);
});

test('the copied code carries what the recipe changed', () => {
  assert.equal(recipeToCode({ state: 'shaping', speed: 0.8, opts: { shape: 2 } }), '<ThinkingOrb state="shaping" size={64} speed={0.8} opts={{shape:2}} />');
});
