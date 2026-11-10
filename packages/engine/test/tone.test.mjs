import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { launch } from '../diagnose.mjs';
import { loadToneRefs } from '../catalog.mjs';
import { DEMO_BRAND, TONE_AXES, axesToTokens, nearestRefs, pickTone, quadrantOf, readSpot, toneAxes, toneParts, toneUrl } from '../tone.mjs';
import { readFirstScreen } from '../tone-capture.mjs';
import { validateAxes } from '../../../data/taxonomy/axes.mjs';
import taxonomy from '../../../data/taxonomy/taxonomy.json' with { type: 'json' };

const catalog = loadToneRefs();
const fixture = (name) => pathToFileURL(new URL(`./fixtures/${name}`, import.meta.url).pathname).href;
const GRID = [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1];

test('the tone catalog holds places, links and words, never a picture', () => {
  const ids = catalog.refs.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate reference id');
  assert.ok(catalog.refs.length >= 30, `only ${catalog.refs.length} references`);
  const genres = new Set(catalog.genres.map((g) => g.id));
  const hosts = { x: /^(x|twitter)\.com$/, reddit: /^(www\.)?reddit\.com$/, hackernews: /^news\.ycombinator\.com$/ };
  for (const r of catalog.refs) {
    assert.match(r.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.equal(new URL(r.url).protocol, 'https:', `${r.id} url`);
    assert.ok(r.x >= 0 && r.x <= 1 && r.y >= 0 && r.y <= 1, `${r.id} spot`);
    assert.ok(r.note.en.length > 20 && r.note.ko.length > 8, `${r.id} note`);
    for (const g of r.genres) assert.ok(genres.has(g), `${r.id} unknown genre ${g}`);
    if (r.praise) {
      assert.ok(['praise', 'mention'].includes(r.praise.kind), `${r.id} praise.kind`);
      if (r.praise.kind === 'mention') assert.ok(r.praise.caveat?.en && r.praise.caveat?.ko, `${r.id}: a mention says what kind of post it is`);
      assert.match(new URL(r.praise.url).host, hosts[r.praise.on], `${r.id} praise link is not a public post on ${r.praise.on}`);
      assert.match(r.praise.date, /^\d{4}-\d{2}-\d{2}$/);
    }
  }
  // No screen is stored: no picture field and no inlined image anywhere in the file.
  const walk = (v, at) => {
    if (typeof v === 'string') assert.ok(!/^data:|\.(png|jpe?g|webp|gif|avif)$/i.test(v), `${at} looks like a picture`);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) {
      assert.ok(!/^(img|image|images|shot|shots|screenshot|capture|thumbnail)$/i.test(k), `${at}.${k} is a picture field`);
      walk(x, `${at}.${k}`);
    }
  };
  walk(catalog, 'catalog');
  for (const g of catalog.genres) assert.ok(catalog.refs.filter((r) => r.genres.includes(g.id)).length >= 4, `${g.id} needs four references`);
  assert.ok(catalog.genres.some((g) => g.id === 'geek'), 'the first genre is geek and developer');
  assert.equal(catalog.quadrants.length, 4);
});

test('every spot sets all eight axes on their snap steps, and readability never drops', () => {
  for (const x of GRID) for (const y of GRID) for (const genre of [undefined, ...catalog.genres.map((g) => g.id)]) {
    const axes = toneAxes({ x, y }, genre);
    for (const a of TONE_AXES) assert.ok(a.steps.includes(axes[a.id]), `${a.id} ${axes[a.id]} at ${x},${y}`);
    for (const theme of ['dark', 'light']) {
      const tokens = axesToTokens(axes, { theme });
      for (const [k, v] of Object.entries(tokens)) {
        assert.match(k, /^--[\w-]+$/);
        assert.equal(typeof v, 'string');
        assert.match(v, /^[^{};<>]*$/, `${k} would be dropped by the stage`);
      }
      const muted = Number(/oklch\(([\d.]+)/.exec(tokens['--muted-foreground'])[1]);
      const subtle = Number(/oklch\(([\d.]+)/.exec(tokens['--text-subtle'])[1]);
      if (theme === 'dark') assert.ok(muted >= 0.708 && subtle >= 0.65, `dark muted text dimmer than the default at ${x},${y}`);
      else assert.ok(muted <= 0.46 && subtle <= 0.52, `light muted text paler than the default at ${x},${y}`);
    }
  }
});

test('every spot and genre keeps every design constraint, on the same axes and steps as the taxonomy', () => {
  assert.deepEqual(TONE_AXES.map((a) => a.id), taxonomy.axes.map((a) => a.id));
  for (const a of TONE_AXES) assert.deepEqual([a.steps, a.names], [taxonomy.snap[a.id].steps, taxonomy.snap[a.id].names], `${a.id} steps drifted`);
  let spots = 0;
  for (const x of GRID) for (const y of GRID) for (const genre of [undefined, ...catalog.genres.map((g) => g.id)]) {
    const broken = validateAxes(toneAxes({ x, y }, genre)).filter((c) => c.code === 'constraint');
    assert.deepEqual(broken, [], `${x},${y} ${genre || 'no genre'}: ${broken.map((c) => c.constraint).join(', ')}`);
    spots++;
  }
  assert.equal(spots, GRID.length ** 2 * (catalog.genres.length + 1));
});

test('the map reads the way its labels say', () => {
  const at = (x, y, genre) => toneAxes({ x, y }, genre);
  for (const x of GRID) for (let i = 1; i < GRID.length; i++) {
    const lo = at(x, GRID[i - 1]);
    const hi = at(x, GRID[i]);
    assert.ok(hi.motion >= lo.motion, `motion falls going up at x ${x}`);
    assert.ok(hi['color-restraint'] <= lo['color-restraint'], `more restraint going up at x ${x}`);
  }
  // Corners: clean SaaS is soft and still, a launch page is round and lively, editorial is square and quiet.
  assert.deepEqual([at(0, 0).roundness, at(0, 0).motion, at(0, 0)['color-restraint']], [0.5, 0.25, 1]);
  assert.deepEqual([at(0, 1).roundness, at(0, 1).motion, at(0, 1)['color-restraint']], [0.75, 1, 0.5]);
  assert.deepEqual([at(1, 0).roundness, at(1, 0).motion, at(1, 0).elevation], [0, 0, 0]);
  assert.equal(at(1, 1)['type-expression'], 1);
  // The geek genre is denser, sharper and more lined than the same spot without it; utility is never rounder; every
  // genre changes something at the center of the map.
  for (const x of GRID) for (const y of GRID) {
    const plain = at(x, y);
    const geek = at(x, y, 'geek');
    assert.ok(geek.density >= plain.density && geek.roundness <= plain.roundness && geek.stroke >= plain.stroke, `geek at ${x},${y}`);
    assert.ok(at(x, y, 'utility').roundness <= plain.roundness && at(x, y, 'illustration').roundness >= plain.roundness, `utility and illustration at ${x},${y}`);
  }
  for (const g of catalog.genres) assert.notDeepEqual(at(0.5, 0.5, g.id), at(0.5, 0.5), `${g.id} changes nothing`);
});

test('color comes from the brand, a stand in only when the spot asks for color', () => {
  const quiet = axesToTokens(toneAxes({ x: 0.1, y: 0.1 }));
  assert.equal(quiet['--brand'], undefined);
  // Near the launch corner the spot asks for two hues: the data ramp takes a second hue across the wheel.
  const loud = axesToTokens(toneAxes({ x: 0.1, y: 0.9 }));
  assert.equal(loud['--brand'], DEMO_BRAND);
  assert.match(loud['--chart-2'], /from var\(--brand\)/);
  const branded = axesToTokens(toneAxes({ x: 0.1, y: 0.1 }), { brand: '#e4002b' });
  assert.equal(branded['--brand'], '#e4002b');
  assert.equal(branded['--accent-fg'], '#ffffff');
  const picked = pickTone(catalog, { x: 0.2, y: 0.9, brand: '#ffd400', theme: 'light' });
  assert.equal(picked.demoBrand, false);
  assert.equal(picked.tokens['--accent-fg'], '#111111');
  assert.match(picked.css, /^\/\* Tone tokens[\s\S]*:root, :root\[data-theme\], \.theme-dark, \.theme-light \{/);
});

test('nearest references, quadrants, parts and the page address', () => {
  for (const r of catalog.refs) {
    const [first] = nearestRefs(catalog, r);
    assert.equal(first.distance, 0, `${r.id} is not nearest to its own spot`);
  }
  const geek = nearestRefs(catalog, { x: 0.1, y: 0.9 }, { genre: 'geek', limit: 4 });
  assert.equal(geek.length, 4);
  assert.ok(geek.every((r) => r.genres.includes('geek')));
  assert.equal(nearestRefs(catalog, { x: 0.5, y: 0.5 }, { genre: 'nope' }).length, 4, 'an unknown genre does not empty the list');
  const d = nearestRefs(catalog, { x: 0.3, y: 0.7 }, { limit: 6 }).map((r) => r.distance);
  assert.deepEqual(d, [...d].sort((a, b) => a - b));
  assert.equal(quadrantOf(catalog, { x: 0.2, y: 0.8 }).id, 'launch-promo');
  assert.equal(quadrantOf(catalog, { x: 0.9, y: 0.1 }).id, 'editorial-luxury');
  assert.equal(toneParts({ y: 0.9 }).length, 3);
  assert.deepEqual(readSpot({ x: '2', y: -1 }), { x: 1, y: 0 });
  assert.equal(toneUrl('https://t.example/', { x: 0.8, y: 0.183, genre: 'geek', theme: 'light', brand: '#E4002B' }), 'https://t.example/tone?x=0.8&y=0.18&genre=geek&theme=light&brand=e4002b');
});

function serveStatus(code) {
  const server = http.createServer((req, res) => res.writeHead(code, { 'content-type': 'text/html', connection: 'close' }).end('<!doctype html><title>Denied</title><p>no</p>'));
  const close = () => (server.closeAllConnections(), server.close());
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}/`, close })));
}

test('first screens: reject only, never accept or hide, and no picture of a consent banner or a block page', { timeout: 60000 }, async () => {
  const browser = await launch();
  const denied = await serveStatus(403);
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const both = await readFirstScreen(page, fixture('tone-consent.html'), { settleMs: 50 });
    assert.equal(both.status, 'ok');
    assert.equal(both.rejected, 'Reject all');
    assert.equal(await page.evaluate(() => document.body.dataset.consent), 'rejected');
    assert.ok(both.image.length > 2000 && both.image[0] === 0xff && both.image[1] === 0xd8, 'a JPEG');

    // A banner with no reject button is neither accepted nor hidden: no picture, link only.
    for (const name of ['tone-accept-only.html', 'tone-cookie-layer.html']) {
      const acceptOnly = await readFirstScreen(page, fixture(name), { settleMs: 50 });
      assert.equal(acceptOnly.status, 'consent', name);
      assert.equal(acceptOnly.image, undefined, `${name} has a picture`);
      assert.equal(await page.evaluate(() => document.body.dataset.consent), undefined, `${name}: an accept button was pressed`);
    }
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.querySelector('.notice')).display), 'none', 'the banner was hidden');
    // A fixed header with a button and no cookie words is not a banner.
    assert.equal((await readFirstScreen(page, fixture('tone-fixed-header.html'), { settleMs: 50 })).status, 'ok');

    const check = await readFirstScreen(page, fixture('tone-blocked.html'), { settleMs: 50 });
    assert.equal(check.status, 'blocked');
    assert.equal(check.image, undefined);
    const status = await readFirstScreen(page, denied.url, { settleMs: 50 });
    assert.deepEqual([status.status, status.code], ['blocked', 403]);
  } finally {
    denied.close();
    await browser.close();
  }
});
