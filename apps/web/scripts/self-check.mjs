// Runs rules/detect.js on this app's own screens at 1440, 1280 and 390 wide and fails on any finding, page error or
// sideways scroll. The screens: the first screen and a result that lists every measured rule (the API is answered
// locally with a synthetic report so no outside site is involved), the gallery, the page of every component in
// packages/registry/registry.json, the board, the bookmarklet page and the tone page. Three pages run at a time. The 404 screen
// is check-metadata's. A finding listed in self-check-baseline.json, with the reason it stays, is reported and allowed
// up to its count on that screen at every width; one more, or any other finding, fails.
// Usage: node scripts/self-check.mjs [base url]   (default $BASE_URL, else http://localhost:3240)
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || process.env.BASE_URL || 'http://localhost:3240';
const ROOT = new URL('../../../', import.meta.url);
const DETECT = readFileSync(new URL('rules/detect.js', ROOT), 'utf8');
const RULES = JSON.parse(readFileSync(new URL('rules/rules.json', ROOT), 'utf8')).rules;
const IDS = JSON.parse(readFileSync(new URL('packages/registry/registry.json', ROOT), 'utf8')).components.map((c) => c.id);
const BASELINE = JSON.parse(readFileSync(new URL('self-check-baseline.json', import.meta.url), 'utf8')).allow;
const WIDTHS = [1440, 1280, 390];
const PARALLEL = 3;
const OUT = new URL('../shots/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const placeholder = (w, h) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#d9d9d6"/></svg>`)}`;
const measured = RULES.filter((r) => r.detect.level !== 'manual');
const synthetic = {
  report: {
    url: 'https://example.com/',
    widths: [1440, 390],
    measured: measured.length,
    rulesHit: measured.length,
    findings: measured.length * 2,
    rules: measured.map((r, i) => ({
      ruleId: r.id,
      name: r.name,
      severity: r.severity,
      counts: { 1440: (i % 4) + 1, 390: i % 3 },
      fix: r.fix,
      fix_patterns: r.fix_patterns,
      findings: [{ width: 1440, selector: 'body > main > section:nth-of-type(2) > div.card > p', evidence: 'letterSpacingEm 0.12, fontSize 11' }],
    })),
    judgeByEye: RULES.filter((r) => r.detect.level === 'manual').map((r) => r.id),
  },
  shots: { 1440: placeholder(1440, 2400), 390: placeholder(390, 3200) },
};
// Reference screens on the tone page are answered locally: one picture, one block page.
const picture = placeholder(1280, 800);

// The home page in its two states, then the pages around the gallery and the tone page. The components inside frames
// are the registry's business (packages/registry/test-render.mjs, packages/registry/test-a11y.mjs); this measures the page around them.
const screens = [
  { path: '/', state: 'first' },
  { path: '/', state: 'result' },
  ...['/components', ...IDS.map((id) => `/components/${id}`), '/board?ids=blocks/button,blocks/card&brand=e4002b', '/bookmarklet', '/tone?x=0.8&y=0.18', '/tone?x=0.2&y=0.9&genre=geek&theme=light'].map((path) => ({ path })),
];
const jobs = WIDTHS.flatMap((width) => screens.map((s) => ({ ...s, width })));

async function measure(browser, { path, state, width }) {
  const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    if (state === 'result') await page.route('**/api/diagnose', (route) => route.fulfill({ json: synthetic }));
    await page.route('**/api/tone-shot', (route) => {
      const ids = JSON.parse(route.request().postData() || '{}').ids || [];
      return route.fulfill({ json: { shots: Object.fromEntries(ids.map((id, i) => [id, i === 1 ? { status: 'blocked' } : { status: 'ok', image: picture }])) } });
    });
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    if (state === 'result') {
      await page.fill('#target', 'example.com');
      await page.click('button[type=submit]');
      await page.waitForSelector('.report');
    }
    if (path.startsWith('/tone')) {
      // Sites open only once their cards are on screen.
      for (const card of await page.locator('.ref-card').all()) await card.scrollIntoViewIfNeeded();
      await page.waitForSelector('.ref-shot img');
      await page.evaluate(() => scrollTo(0, 0));
    }
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
    await page.addScriptTag({ content: DETECT });
    const report = await page.evaluate(() => window.tasterDetect({ maxPerRule: 10 }));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (state) await page.screenshot({ path: new URL(`self-${state}-${width}.png`, OUT).pathname, fullPage: true });
    return { findings: report.findings, errors, overflow };
  } catch (e) {
    return { findings: [], errors: [...errors, `the page did not load or settle: ${e.message.split('\n')[0]}`], overflow: false };
  } finally {
    await page.close();
  }
}

// Findings beyond the baseline for this screen. Every entry has to say why it stays.
const unexplained = BASELINE.filter((b) => !b.screen || !b.rule || !(b.count > 0) || !(b.reason || '').trim());
if (unexplained.length) throw new Error(`self-check-baseline.json: every entry needs screen, rule, count and reason (${JSON.stringify(unexplained[0])})`);
function beyondBaseline(path, findings) {
  const left = Object.fromEntries(BASELINE.filter((b) => b.screen === path).map((b) => [b.rule, b.count]));
  return findings.filter((f) => !(left[f.ruleId]-- > 0));
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
let failures = 0;
let allowed = 0;
try {
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      const { findings, errors, overflow } = await measure(browser, job);
      const fresh = beyondBaseline(job.path, findings);
      allowed += findings.length - fresh.length;
      const name = job.state ? `${job.state} at ${job.width}` : `${job.path} at ${job.width}`;
      const known = findings.length - fresh.length ? ` (${findings.length - fresh.length} in the baseline)` : '';
      const lines = [`${name}: ${findings.length} findings${known}, pageerror ${errors.length}, horizontal overflow ${overflow}`];
      for (const f of findings) lines.push(`  ${fresh.includes(f) ? '' : '(baseline) '}${f.ruleId} ${f.selector} ${JSON.stringify(f.evidence || '')}`);
      for (const e of errors) lines.push(`  pageerror ${e}`);
      console.log(lines.join('\n'));
      if (fresh.length || errors.length || overflow) failures++;
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
} finally {
  await browser.close();
}
console.log(`${jobs.length} screens checked, ${allowed} findings allowed by self-check-baseline.json`);
console.log(failures ? `SELF_CHECK_FAIL (${failures})` : 'SELF_CHECK_OK');
process.exit(failures ? 1 : 0);
