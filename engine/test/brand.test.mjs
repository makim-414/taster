import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TASTER_FONT, brandTheme, contrast, hexToOklch, oklchToHex } from '../brand.mjs';

const gap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

test('color conversion round-trips', () => {
  for (const hex of ['#4c1d95', '#16a34a', '#b42318', '#ffffff', '#111111', '#2563eb']) assert.equal(oklchToHex(hexToOklch(hex)), hex);
});

test('a brand with a solid color and a chosen typeface is kept', () => {
  const t = brandTheme({ lang: 'en', brand: { color: '#2563eb', fonts: { heading: 'Fraunces', body: 'Source Sans 3' }, dark: false, logo: { kind: 'image', src: 'https://example.com/logo.svg' } } });
  assert.equal(t.tokens['--brand'], '#2563eb');
  assert.ok(contrast(t.tokens['--brand'], t.tokens['--accent-fg']) >= 4.5);
  assert.match(t.tokens['--font'], /^'Fraunces', 'Source Sans 3', 'IBM Plex Sans KR'/);
  assert.equal(t.tokens['--delta-up'], t.tokens['--success']);
  assert.ok(t.notes.some((n) => /Use the file as is/.test(n)));
  assert.match(t.css, /^\/\* Brand theme[\s\S]*:root \{[\s\S]*--brand: #2563eb;/);
});

test('usual AI faces and stock fonts are replaced, and the note says how to keep them', () => {
  for (const heading of ['Inter', 'Geist', 'Space Grotesk']) {
    const t = brandTheme({ brand: { color: '#2563eb', fonts: { heading, body: heading } } });
    assert.equal(t.tokens['--font'], TASTER_FONT);
    assert.ok(t.notes.some((n) => n.includes(heading) && /set --font back/.test(n)), heading);
  }
  assert.equal(brandTheme({ brand: { fonts: { heading: 'Arial' } } }).tokens['--font'], TASTER_FONT);
});

test('meaning colors move away from a brand hue they would be confused with', () => {
  const green = brandTheme({ brand: { color: '#16a34a' } });
  const greenHue = hexToOklch('#16a34a').h;
  assert.ok(gap(hexToOklch(green.tokens['--success']).h, greenHue) >= 30, 'success too close to a green brand');
  const red = brandTheme({ brand: { color: '#dc2626' } });
  assert.ok(gap(hexToOklch(red.tokens['--danger']).h, hexToOklch('#dc2626').h) >= 30, 'failure too close to a red brand');
  // Negative control: a blue brand leaves both where they were.
  const blue = brandTheme({ brand: { color: '#2563eb' } });
  assert.ok(gap(hexToOklch(blue.tokens['--success']).h, 150) < 5 && gap(hexToOklch(blue.tokens['--danger']).h, 27) < 5);
});

test('no brand color keeps the neutral accent and says so; Korean pages get a Hangul face', () => {
  const t = brandTheme({ lang: 'ko', brand: { color: null, fonts: { heading: 'Fraunces' } } });
  assert.equal(t.tokens['--brand'], undefined);
  assert.ok(t.notes.some((n) => /No solid brand color/.test(n)));
  assert.match(t.tokens['--font'], /IBM Plex Sans KR/);
});
