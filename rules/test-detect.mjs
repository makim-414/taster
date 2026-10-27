// Runs detect.js against the fixtures in headless Chrome and checks the results.
// Playwright location: PLAYWRIGHT_CORE (a path to playwright-core), else the default below, else the installed package.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// Chrome: CHROME_PATH, else the macOS Chrome app if it exists, else the Chromium that playwright installed (CI on Linux).
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CHROME = process.env.CHROME_PATH || (fs.existsSync(MAC_CHROME) ? MAC_CHROME : undefined);
const DEFAULT_PW = path.join(os.homedir(), '.claude', 'skills', 'motion-studio', 'node_modules', 'playwright-core');
const ENGINE_PW = path.join(here, '..', 'engine', 'node_modules', 'playwright');

async function loadPlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_CORE) candidates.push(process.env.PLAYWRIGHT_CORE);
  candidates.push(ENGINE_PW, DEFAULT_PW);
  for (const c of candidates) {
    try {
      const pkgPath = path.join(c, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const main = typeof pkg.main === 'string' ? pkg.main : 'index.js';
      const mod = await import(pathToFileURL(path.join(c, main)).href);
      return mod.default || mod;
    } catch (e) {
      // try the next candidate
    }
  }
  for (const name of ['playwright', 'playwright-core']) {
    try {
      const mod = await import(name);
      return mod.default || mod;
    } catch (e) {
      // try the next package name
    }
  }
  throw new Error('playwright not found: run npm install --prefix engine, or set PLAYWRIGHT_CORE');
}

const failures = [];
function check(cond, msg) {
  if (!cond) failures.push(msg);
}

const rules = JSON.parse(fs.readFileSync(path.join(here, 'rules.json'), 'utf8')).rules;
const level = Object.fromEntries(rules.map((r) => [r.id, r.detect.level]));
const detectSrc = path.join(here, 'detect.js');

const pw = await loadPlaywright();
const chromium = pw.chromium;
const browser = await chromium.launch(CHROME ? { executablePath: CHROME, headless: true } : { headless: true });

async function scan(file, width = 1440) {
  const page = await browser.newPage({ viewport: { width, height: width >= 768 ? 900 : 844 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.goto(pathToFileURL(path.join(here, 'fixtures', file)).href);
  await page.evaluate(() => document.fonts.ready);
  await page.addScriptTag({ path: detectSrc });
  const result = await page.evaluate(() => window.tasterDetect({}));

  // highlight then clear must leave the DOM as it was
  const before = await page.evaluate(() => document.body.innerHTML.replace(/ style=""/g, ''));
  const hl = await page.evaluate(() => {
    const r = window.tasterDetect({ highlight: true });
    const outlined = Array.from(document.querySelectorAll('*')).filter((e) => e.style.outline.includes('--taster-outline')).length;
    window.tasterDetect({ clear: true });
    const left = Array.from(document.querySelectorAll('*')).filter((e) => e.style.outline.includes('--taster-outline')).length;
    return { outlined, left, n: r.findings.length };
  });
  const after = await page.evaluate(() => document.body.innerHTML.replace(/ style=""/g, ''));
  await page.close();
  return { result, hl, mutated: before !== after, pageErrors };
}

const out = {};
for (const f of ['slop.html', 'slop-extra.html', 'clean.html']) out[f] = await scan(f);

// The engine fixtures from the other detector (feat/diagnose-engine), run at both widths the engine uses.
const expectedEngine = JSON.parse(fs.readFileSync(path.join(here, 'fixtures', 'expected-engine.json'), 'utf8'));
const engineOut = {};
for (const f of Object.keys(expectedEngine)) {
  for (const w of [1440, 390]) engineOut[`${f}@${w}`] = await scan(f, w);
}
await browser.close();

const ids = (r) => Array.from(new Set(r.findings.map((x) => x.ruleId))).sort();
Object.assign(out, engineOut);

for (const [f, o] of Object.entries(out)) {
  const r = o.result;
  console.log(`${f}: ${r.findings.length} findings, ${ids(r).length} distinct rules`);
  check(o.pageErrors.length === 0, `${f}: page errors ${o.pageErrors.join(' | ')}`);
  check(r.errors.length === 0, `${f}: detect.js rule errors ${JSON.stringify(r.errors)}`);
  check(!o.mutated, `${f}: highlight and clear changed the DOM`);
  check(o.hl.left === 0, `${f}: ${o.hl.left} outlines left after clear`);
  check(r.findings.length === 0 || o.hl.outlined > 0, `${f}: highlight outlined nothing`);
  for (const x of r.findings) {
    check(level[x.ruleId] !== undefined, `${f}: unknown rule id ${x.ruleId}`);
    check(typeof x.selector === 'string' && x.selector.length > 0, `${f}: ${x.ruleId} missing selector`);
    check(x.rect && x.rect.w >= 0 && x.rect.h >= 0, `${f}: ${x.ruleId} bad rect`);
    check(x.text.length <= 60, `${f}: ${x.ruleId} text longer than 60`);
  }
}

const slop = out['slop.html'].result;
const slopIds = ids(slop);
check(slopIds.length >= 15, `slop.html found only ${slopIds.length} distinct rule ids (need 15)`);
const slopDet = slopIds.filter((i) => level[i] === 'deterministic');
console.log(`slop.html deterministic rules: ${slopDet.length}`);
console.log('slop.html ids: ' + slopIds.join(' '));

const union = new Set([...slopIds, ...ids(out['slop-extra.html'].result), ...Object.values(engineOut).flatMap((o) => ids(o.result))]);
const detAll = rules.filter((r) => r.detect.level === 'deterministic').map((r) => r.id);
const heuAll = rules.filter((r) => r.detect.level === 'heuristic').map((r) => r.id);
console.log('deterministic rules not covered by fixtures: ' + (detAll.filter((i) => !union.has(i)).join(' ') || 'none'));
console.log('heuristic rules not covered by fixtures: ' + (heuAll.filter((i) => !union.has(i)).join(' ') || 'none'));

const clean = out['clean.html'].result;
const cleanDet = clean.findings.filter((x) => level[x.ruleId] === 'deterministic');
check(cleanDet.length === 0, `clean.html has ${cleanDet.length} deterministic findings: ` + cleanDet.map((x) => `${x.ruleId}@${x.selector}`).join(', '));
if (clean.findings.length) console.log('clean.html non-deterministic findings: ' + clean.findings.map((x) => `${x.ruleId}@${x.selector}`).join(', '));

for (const [key, o] of Object.entries(engineOut)) {
  const [f, w] = key.split('@');
  const found = new Set(ids(o.result));
  const want = expectedEngine[f];
  const missing = want.filter((i) => !found.has(i));
  check(missing.length === 0, `${f} at ${w}: missing expected rules ${missing.join(' ')}`);
  if (want.length === 0) {
    check(o.result.findings.length === 0, `${f} at ${w}: expected 0 findings, got ${o.result.findings.map((x) => `${x.ruleId}@${x.selector}`).join(', ')}`);
  }
  console.log(`${key}: expected ${want.length}, found ${want.length - missing.length}, total findings ${o.result.findings.length}`);
}

if (failures.length) {
  console.log('\nFAILURES');
  for (const m of failures) console.log(' - ' + m);
  process.exit(1);
}
console.log('DETECT OK');
