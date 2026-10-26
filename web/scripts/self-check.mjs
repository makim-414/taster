// Runs rules/detect.js on this app's own screens at 1440 and 390 wide and fails on any finding.
// Two states: the first screen, and a result that lists every measured rule (the API is
// answered locally with a synthetic report so no outside site is involved).
// Usage: node scripts/self-check.mjs [base url]   (default http://localhost:3240)
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://localhost:3240';
const ROOT = new URL('../../', import.meta.url);
const DETECT = readFileSync(new URL('rules/detect.js', ROOT), 'utf8');
const RULES = JSON.parse(readFileSync(new URL('rules/rules.json', ROOT), 'utf8')).rules;
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
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

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (existsSync(MAC_CHROME) ? MAC_CHROME : undefined) });
let failures = 0;
try {
  for (const width of [1440, 390]) {
    for (const state of ['first', 'result']) {
      const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      if (state === 'result') await page.route('**/api/diagnose', (route) => route.fulfill({ json: synthetic }));
      await page.goto(BASE, { waitUntil: 'networkidle' });
      if (state === 'result') {
        await page.fill('#target', 'example.com');
        await page.click('button[type=submit]');
        await page.waitForSelector('.report');
        await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
      }
      await page.addScriptTag({ content: DETECT });
      const report = await page.evaluate(() => window.tasterDetect({ maxPerRule: 10 }));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      await page.screenshot({ path: new URL(`self-${state}-${width}.png`, OUT).pathname, fullPage: true });
      const line = `${state} at ${width}: ${report.findings.length} findings, pageerror ${errors.length}, horizontal overflow ${overflow}`;
      console.log(line);
      for (const f of report.findings) console.log(`  ${f.ruleId} ${f.selector} ${JSON.stringify(f.evidence || '')}`);
      for (const e of errors) console.log(`  pageerror ${e}`);
      if (report.findings.length || errors.length || overflow) failures++;
      await page.close();
    }
  }
} finally {
  await browser.close();
}
console.log(failures ? `SELF_CHECK_FAIL (${failures})` : 'SELF_CHECK_OK');
process.exit(failures ? 1 : 0);
