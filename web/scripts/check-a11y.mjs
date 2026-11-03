// Accessibility gate for the site's own pages (the components inside the stage frames are registry/test-a11y.mjs's).
// Three checks, at 390 and 1280 wide:
// - axe-core with the WCAG 2.0 A and AA and 2.1 AA rules on every page: the home page, the gallery, every component's
//   page, the board, the bookmarklet page and the tone page, and the pages that follow the gallery theme in both
//   themes. Frames are left out.
// - Keyboard: Tab through the main pages and compare the pixels around each stop with and without focus. A stop that
//   paints nothing is an invisible focus; a stop inside aria-hidden content is a hidden one.
// - Reduced motion: with prefers-reduced-motion set, two captures 1.5 seconds apart differ by zero pixels outside
//   the frames.
// Every run starts with two control pages served from here, one that each check has to flag and one it must not, so
// a check that stopped seeing anything fails instead of passing (--selftest runs only those).
// What is wrong today is in a11y-baseline.json, counted per page and check. A count above the baseline fails, a count
// below it passes and says the baseline can go down (node scripts/check-a11y.mjs --write-baseline).
// Usage: node scripts/check-a11y.mjs [base url] [--write-baseline | --selftest]   (default $BASE_URL, else http://localhost:3240)
import { readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';
import { compareBaseline, countsOf } from '../../engine/lint.mjs';

const args = process.argv.slice(2);
const WRITE = args.includes('--write-baseline');
const SELFTEST = args.includes('--selftest');
let BASE = args.find((a) => !a.startsWith('--')) || process.env.BASE_URL || 'http://localhost:3240';
const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa'];
const BASELINE_FILE = new URL('a11y-baseline.json', import.meta.url);
const IDS = JSON.parse(readFileSync(new URL('../../registry/registry.json', import.meta.url), 'utf8')).components.map((c) => c.id);
const WIDTHS = [390, 1280];
const PARALLEL = 3;
const BOARD = '/board?ids=blocks/button,blocks/card';

// The gallery, a component page and the board take ?theme= (it changes the stills and the frames they show).
const themed = ['/components', '/components/blocks/button', BOARD].flatMap((p) => ['dark', 'light'].map((t) => `${p}${p.includes('?') ? '&' : '?'}theme=${t}`));
const axePages = ['/', ...themed, ...IDS.filter((id) => id !== 'blocks/button').map((id) => `/components/${id}`), '/bookmarklet', '/tone?x=0.8&y=0.18', '/tone?x=0.2&y=0.9&genre=geek&theme=light'];
const keyboardPages = [['/', 30], ['/components', 40], ['/components/blocks/accordion', 30], [BOARD, 25], ['/bookmarklet', 15], ['/tone', 30]];
const motionPages = ['/', '/components', '/components/motion/marquee', '/components/motion/thinking-orb', '/bookmarklet', '/tone'];

const findings = [];
const add = (page, rule, detail) => findings.push({ file: page, rule, detail });
const picture = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800"><rect width="1280" height="800" fill="#d9d9d6"/></svg>')}`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

// One page in a fresh context (the gallery keeps its theme in storage), with the tone page's capture route answered
// locally so no outside site opens.
async function open(path, width, options = {}) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/tone-shot', (route) => {
    const ids = JSON.parse(route.request().postData() || '{}').ids || [];
    return route.fulfill({ json: { shots: Object.fromEntries(ids.map((id) => [id, { status: 'ok', image: picture }])) } });
  });
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.mouse.move(0, 0);
  return { page, errors, close: () => context.close() };
}

// Pixels that differ between two PNG captures of the same size, compared in a blank page.
let comparer;
async function diffPixels(a, b) {
  comparer ||= await browser.newPage();
  return comparer.evaluate(async ([a, b]) => {
    const load = async (s) => createImageBitmap(await (await fetch(`data:image/png;base64,${s}`)).blob());
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const c = Object.assign(document.createElement('canvas'), { width: ia.width, height: ia.height });
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(ia, 0, 0);
    const da = g.getImageData(0, 0, c.width, c.height).data;
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(ib, 0, 0);
    const db = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 30) n++;
    return n;
  }, [a.toString('base64'), b.toString('base64')]);
}

async function axe(path, width) {
  const key = `${path} at ${width}`;
  const { page, errors, close } = await open(path, width);
  try {
    await page.waitForTimeout(400);
    await page.evaluate(AXE);
    const violations = await page.evaluate(async (tags) => {
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags }, iframes: false, resultTypes: ['violations'] });
      return r.violations.map((v) => ({ id: v.id, help: v.help, targets: v.nodes.map((n) => n.target.join(' ')) }));
    }, TAGS);
    for (const v of violations) for (const t of v.targets) add(key, `axe ${v.id}`, `${v.help}: ${t}`);
  } finally {
    for (const e of errors) add(key, 'pageerror', e);
    await close();
  }
}

async function keyboard(path, width, max) {
  const key = `${path} at ${width}`;
  const { page, errors, close } = await open(path, width, { reducedMotion: 'reduce' });
  const count = { stops: 0, frames: 0, unseen: 0 };
  try {
    await page.waitForTimeout(600);
    for (let i = 0; i < max; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(150);
      const stop = await page.evaluate(() => {
        const e = document.activeElement;
        if (!e || e === document.body) return null;
        const r = e.getBoundingClientRect();
        const name = (e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent || e.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
        const clip = { x: Math.max(0, r.x - 6), y: Math.max(0, r.y - 6), width: Math.min(innerWidth, r.width + 12), height: Math.min(innerHeight, r.height + 12) };
        return { tag: e.tagName, name, hidden: !!e.closest('[aria-hidden="true"]'), clip, onScreen: r.width > 2 && r.height > 2 && r.top < innerHeight && r.bottom > 0 };
      });
      if (!stop) break;
      count.stops++;
      const label = `${stop.tag.toLowerCase()} "${stop.name}"`;
      if (stop.hidden) add(key, 'focus inside aria-hidden', label);
      // Focus that moved into a frame belongs to the component; off-screen stops have nothing to compare.
      if (stop.tag === 'IFRAME') count.frames++;
      if (stop.tag === 'IFRAME' || !stop.onScreen) continue;
      const focused = await page.screenshot({ clip: stop.clip });
      await page.evaluate(() => { window.__stop = document.activeElement; window.__stop.blur(); });
      await page.waitForTimeout(60);
      const blurred = await page.screenshot({ clip: stop.clip });
      await page.evaluate(() => window.__stop.focus());
      if ((await diffPixels(focused, blurred)) === 0) {
        count.unseen++;
        add(key, 'focus not visible', label);
      }
    }
    console.log(`keyboard ${key}: ${count.stops} tab stops, ${count.frames} into frames, ${count.unseen} without a visible focus`);
  } finally {
    for (const e of errors) add(key, 'pageerror', e);
    await close();
  }
}

async function motion(path, width) {
  const key = `${path} at ${width}`;
  const { page, errors, close } = await open(path, width, { reducedMotion: 'reduce' });
  try {
    await page.addStyleTag({ content: 'iframe { visibility: hidden !important; }' });
    await page.waitForTimeout(2500);
    const first = await page.screenshot();
    await page.waitForTimeout(1500);
    const second = await page.screenshot();
    const moved = await diffPixels(first, second);
    console.log(`reduced motion ${key}: ${moved} pixels moved in 1.5 seconds`);
    if (moved > 0) add(key, 'moves under reduced motion', `${moved} pixels changed in 1.5 seconds`);
  } finally {
    for (const e of errors) add(key, 'pageerror', e);
    await close();
  }
}

// The controls. bad: an image with no text alternative, a button whose focus paints nothing, a link inside
// aria-hidden, a square that spins under reduced motion. good: the same page done right.
const square = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#333"/></svg>')}`;
const control = (title, css, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>body { font: 16px sans-serif; } .spin { width: 40px; height: 40px; background: #333; } @keyframes spin { to { transform: rotate(360deg); } } ${css}</style></head><body><main><h1>${title}</h1>${body}<div class="spin"></div></main></body></html>`;
const CONTROLS = {
  '/bad': control('Bad', 'button:focus { outline: none; } .spin { animation: spin 1s linear infinite; }', `<img src="${square}" width="40" height="40"><button>Go</button><div aria-hidden="true"><a href="#top">Hidden</a></div>`),
  '/good': control('Good', '@media (prefers-reduced-motion: no-preference) { .spin { animation: spin 1s linear infinite; } }', `<img src="${square}" width="40" height="40" alt="A gray square"><button>Go</button><a href="#top">Top</a>`),
};
async function selftest() {
  const site = BASE;
  const server = http.createServer((req, res) => res.writeHead(CONTROLS[req.url] ? 200 : 404, { 'content-type': 'text/html' }).end(CONTROLS[req.url] || ''));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  BASE = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const p of Object.keys(CONTROLS)) {
      await axe(p, 1280);
      await keyboard(p, 1280, 5);
      await motion(p, 1280);
    }
  } finally {
    server.close();
    BASE = site;
  }
  const seen = (page) => new Set(findings.filter((f) => f.file === `${page} at 1280`).map((f) => f.rule));
  const bad = seen('/bad');
  const problems = ['axe image-alt', 'axe aria-hidden-focus', 'focus not visible', 'focus inside aria-hidden', 'moves under reduced motion'].filter((r) => !bad.has(r)).map((r) => `the bad control was not flagged for ${r}`);
  for (const r of seen('/good')) problems.push(`the good control was flagged for ${r}`);
  findings.length = 0;
  return problems;
}

const controls = await selftest();
for (const p of controls) console.log(`CONTROL ${p}`);
if (controls.length || SELFTEST) {
  await browser.close();
  console.log(controls.length ? `A11Y_FAIL (the controls: ${controls.length})` : 'A11Y SELFTEST OK');
  process.exit(controls.length ? 1 : 0);
}

const jobs = [
  ...WIDTHS.flatMap((w) => axePages.map((p) => ({ key: `${p} at ${w}`, run: () => axe(p, w) }))),
  ...WIDTHS.flatMap((w) => keyboardPages.map(([p, max]) => ({ key: `${p} at ${w}`, run: () => keyboard(p, w, max) }))),
  ...WIDTHS.flatMap((w) => motionPages.map((p) => ({ key: `${p} at ${w}`, run: () => motion(p, w) }))),
];
try {
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      try {
        await job.run();
      } catch (e) {
        add(job.key, 'did not load or settle', e.message.split('\n')[0]);
      }
      if (++done % 50 === 0) console.log(`${done} of ${jobs.length} checks`);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
} finally {
  await browser.close();
}

findings.sort((a, b) => a.file.localeCompare(b.file) || a.rule.localeCompare(b.rule) || a.detail.localeCompare(b.detail));
if (WRITE) {
  const note = 'check-a11y baseline: counts per page and check may only go down. Lower it with node web/scripts/check-a11y.mjs --write-baseline.';
  writeFileSync(BASELINE_FILE, `${JSON.stringify({ version: 1, note, counts: countsOf(findings) }, null, 2)}\n`);
  console.log(`baseline written: ${findings.length} findings on ${new Set(findings.map((f) => f.file)).size} pages, ${jobs.length} checks`);
  process.exit(0);
}
const { fresh, fixed } = compareBaseline(findings, JSON.parse(readFileSync(BASELINE_FILE, 'utf8')));
for (const f of fresh) console.log(`NEW ${f.file}: ${f.rule}: ${f.detail}`);
if (fixed.length) console.log(`below the baseline (lower it with --write-baseline): ${fixed.join(', ')}`);
console.log(`${jobs.length} checks, ${findings.length} findings, ${fresh.length} over the baseline`);
console.log(fresh.length ? `A11Y_FAIL (${fresh.length})` : 'A11Y_OK');
process.exit(fresh.length ? 1 : 0);
