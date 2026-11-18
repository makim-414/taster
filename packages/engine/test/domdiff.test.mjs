import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { assignRegions, changedKeys, diffSnapshots, domSnapshot, labelOf, words } from '../domdiff.mjs';

// The per-edit view compares two loads of a page element by element. These hold the comparison to what changed, at
// the topmost changed element, merged with its neighbours, and never to what only moved.
const node = (k, p, r, s, extra = {}) => ({ k, p, t: k.split('>').pop().replace(/[#:].*$/, ''), id: '', c: [], r, s, x: '', ...extra });
const page = (nodes) => ({ width: 1440, height: 2000, truncated: false, nodes });
const base = () => [
  node('html>body:0', -1, [0, 0, 1440, 2000], 'b'),
  node('html>body:0>header#hero', 0, [0, 0, 1440, 600], 'h', { id: 'hero', c: ['hero'] }),
  node('html>body:0>header#hero>h1:0', 1, [100, 100, 800, 120], 't1', { x: 'Close your books' }),
  node('html>body:0>header#hero>p:0', 1, [100, 240, 600, 60], 'p1'),
  node('html>body:0>section#cards', 0, [0, 700, 1440, 800], 'c', { id: 'cards', c: ['cards'] }),
  node('html>body:0>section#cards>div:0', 4, [64, 760, 400, 300], 'k1', { c: ['card'] }),
  node('html>body:0>section#cards>div:1', 4, [520, 760, 400, 300], 'k2', { c: ['card'] }),
  node('html>body:0>section#cards>div:1>span:0', 6, [540, 1000, 80, 24], 'pill', { c: ['pill'], x: 'Beta' }),
];

test('the same page has no regions, and a change to one element is one region at its rect', () => {
  assert.deepEqual(diffSnapshots(page(base()), page(base())), []);
  const next = base();
  next[2] = { ...next[2], s: 't2' };
  const [r, ...rest] = diffSnapshots(page(base()), page(next));
  assert.equal(rest.length, 0);
  assert.deepEqual(r.rect, { x: 100, y: 100, w: 800, h: 120 });
  assert.equal(r.kind, 'changed');
  assert.equal(r.label, 'h1 "Close your books"');
  assert.ok(r.hint.includes('hero'));
});

test('only the topmost changed element of a subtree counts, and an element that only moved is not a change', () => {
  const next = base();
  // The section restyled, so its cards (inherited color) changed with it; the hero only moved down.
  next[4] = { ...next[4], s: 'c2' };
  next[5] = { ...next[5], s: 'k1b' };
  next[6] = { ...next[6], s: 'k2b' };
  next[1] = { ...next[1], r: [0, 40, 1440, 600] };
  next[2] = { ...next[2], r: [100, 140, 800, 120] };
  const regions = diffSnapshots(page(base()), page(next));
  assert.equal(regions.length, 1);
  assert.deepEqual(regions[0].rect, { x: 0, y: 700, w: 1440, h: 800 });
  assert.equal(regions[0].label, 'section#cards');
});

test('added and removed elements are regions of their own kind, near neighbours merge, and far ones do not', () => {
  const removed = base().filter((n) => n.k !== 'html>body:0>section#cards>div:1>span:0');
  const r1 = diffSnapshots(page(base()), page(removed));
  assert.deepEqual(r1.map((r) => [r.kind, r.rect.y]), [['removed', 1000]]);
  const added = [...base(), node('html>body:0>header#hero>a:0', 1, [100, 320, 160, 48], 'cta', { x: 'Start' }), node('html>body:0>header#hero>a:1', 1, [276, 320, 160, 48], 'cta2')];
  const r2 = diffSnapshots(page(base()), page(added));
  assert.equal(r2.length, 1, 'two buttons side by side are one region');
  assert.deepEqual(r2[0].rect, { x: 100, y: 320, w: 336, h: 48 });
  assert.equal(r2[0].kind, 'added');
  assert.equal(r2[0].count, 2);
  const both = [...added.filter((n) => n.k !== 'html>body:0>section#cards>div:1>span:0')];
  assert.deepEqual(diffSnapshots(page(base()), page(both)).map((r) => r.kind), ['added', 'removed']);
});

test('regions are capped, cut to the picture height, and zero size elements are left out', () => {
  const many = [node('html>body:0', -1, [0, 0, 1440, 9000], 'b')];
  for (let i = 0; i < 30; i++) many.push(node(`html>body:0>p:${i}`, 0, [0, i * 300, 400, 20], `p${i}`));
  const after = many.map((n, i) => (i ? { ...n, s: `${n.s}x` } : n));
  assert.equal(diffSnapshots(page(many), page(after), { max: 10 }).length, 10);
  const cut = diffSnapshots(page(many), page(after), { height: 1000 });
  assert.ok(cut.every((r) => r.rect.y < 1000 && r.rect.y + r.rect.h <= 1000));
  const hidden = [...base(), node('html>body:0>i:0', 0, [0, 0, 0, 0], 'z')];
  assert.deepEqual(diffSnapshots(page(base()), page(hidden)), []);
});

test('changedKeys lists every path that differs, and diffSnapshots leaves exactly those paths out', () => {
  const next = base();
  next[2] = { ...next[2], s: 't2' };
  next.push(node('html>body:0>section#cards>div:2', 4, [980, 760, 400, 300], 'k3'));
  const noise = changedKeys(page(base()), page(next));
  assert.deepEqual([...noise].sort(), ['html>body:0>header#hero>h1:0', 'html>body:0>section#cards>div:2']);
  assert.deepEqual(diffSnapshots(page(base()), page(next), { ignore: noise }), []);
  // A real change next to an ignored one still shows, and so does a change to an ignored element's parent.
  const edit = next.map((n) => ({ ...n }));
  edit[3] = { ...edit[3], s: 'p2' };
  edit[1] = { ...edit[1], s: 'h2' };
  const regions = diffSnapshots(page(base()), page(edit), { ignore: noise });
  assert.deepEqual(regions.map((r) => r.label), ['header#hero']);
  assert.equal(regions[0].rect.y, 0, 'the hero itself changed, so its region is the hero');
});

test('assignRegions matches regions to edits by file name words, and the latest edit takes the rest', () => {
  const regions = [{ rect: { x: 0, y: 0, w: 1, h: 1 }, hint: ['hero', 'grad'] }, { rect: { x: 0, y: 9, w: 1, h: 1 }, hint: ['cards', 'card', 'pill'] }, { rect: { x: 0, y: 20, w: 1, h: 1 }, hint: ['footer'] }];
  const edits = [{ file: 'src/partials/hero.html' }, { file: 'src/components/CardGrid.tsx' }, { file: 'src/styles/tokens.css' }];
  assert.deepEqual(assignRegions(regions, edits).map((r) => r.edit), [0, 1, 2]);
  assert.ok(assignRegions(regions, edits).every((r) => r.guessed));
  assert.deepEqual(assignRegions(regions, [edits[0]]).map((r) => [r.edit, r.guessed]), [[0, false], [0, false], [0, false]]);
  assert.deepEqual(words('src/components/PricingCards.tsx'), ['pricing', 'card']);
  assert.equal(labelOf({ t: 'a', id: '', c: ['btn'], x: 'Book a demo with our team today' }), 'a.btn "Book a demo with our tea..."');
});

test('domSnapshot in a real page sees text, style and structure changes, and nothing on a reload', { timeout: 60000 }, async () => {
  const browser = await chromium.launch();
  try {
    const p = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    const html = (hero, pill, extra = '') => `<!doctype html><style>body{margin:0;font:16px sans-serif} .hero{padding:40px} .pill{border-radius:99px;background:${pill}}</style><body><header class="hero" id="hero"><h1>${hero}</h1></header><section id="cards"><div class="card"><span class="pill">Beta</span></div>${extra}</section></body>`;
    const snap = async (content) => {
      await p.setContent(content);
      return p.evaluate(domSnapshot, 4000);
    };
    const a = await snap(html('Close your books', 'rgb(200, 220, 255)'));
    assert.ok(a.nodes.length >= 6 && a.nodes.every((n) => n.k.startsWith('html>body')));
    assert.deepEqual(diffSnapshots(a, await snap(html('Close your books', 'rgb(200, 220, 255)'))), []);
    const text = diffSnapshots(a, await snap(html('Close the month', 'rgb(200, 220, 255)')));
    assert.deepEqual(text.map((r) => r.label), ['h1 "Close the month"']);
    const style = diffSnapshots(a, await snap(html('Close your books', 'transparent')));
    assert.deepEqual(style.map((r) => [r.kind, r.label]), [['changed', 'span.pill "Beta"']]);
    const added = diffSnapshots(a, await snap(html('Close your books', 'rgb(200, 220, 255)', '<div class="card"><p>New</p></div>')));
    assert.deepEqual(added.map((r) => [r.kind, r.label]), [['added', 'div.card']]);
  } finally {
    await browser.close();
  }
});
