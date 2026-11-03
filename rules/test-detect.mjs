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

async function open(file, width) {
  const page = await browser.newPage({ viewport: { width, height: width >= 768 ? 900 : 844 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.goto(pathToFileURL(path.join(here, 'fixtures', file)).href);
  await page.evaluate(() => document.fonts.ready);
  await page.addScriptTag({ path: detectSrc });
  return { page, pageErrors };
}

async function scan(file, width = 1440) {
  const { page, pageErrors } = await open(file, width);
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

// options.rules on its own: a rule that reads other rules' results must still fire when it is the only one asked for.
async function only(file, list) {
  const { page } = await open(file, 1440);
  const result = await page.evaluate((l) => window.tasterDetect({ rules: l }), list);
  await page.close();
  return result;
}

const out = {};
// The clean page runs at both widths and must have zero findings of any level.
for (const w of [1440, 390]) out[`clean.html@${w}`] = await scan('clean.html', w);

// Render integrity rules: every one fires on slop-render.html at a phone width; the touch rule stays off above 1024.
const render390 = await scan('slop-render.html', 390);
const render1440 = await scan('slop-render.html', 1440);

// Every other fixture has a list of rules it must hit in expected-engine.json, checked at both widths the engine uses.
// An empty list means zero findings.
const expectedEngine = JSON.parse(fs.readFileSync(path.join(here, 'fixtures', 'expected-engine.json'), 'utf8'));
const engineOut = {};
for (const f of Object.keys(expectedEngine)) {
  for (const w of [1440, 390]) engineOut[`${f}@${w}`] = await scan(f, w);
}
const alone = {};
for (const [id, needs] of Object.entries({ 'COL-05': ['COL-01', 'COL-03', 'COL-07'], 'LAY-04': ['LAY-02'] })) {
  alone[id] = { needs, result: await only('slop.html', [id]) };
}
await browser.close();

const ids = (r) => Array.from(new Set(r.findings.map((x) => x.ruleId))).sort();
{
  const RENDER = ['RSP-01', 'RSP-02', 'RSP-03', 'RSP-04', 'RSP-05', 'RSP-06', 'COL-08', 'CPY-02'];
  const at390 = ids(render390.result), at1440 = ids(render1440.result);
  const missing = RENDER.filter((i) => !at390.includes(i));
  check(missing.length === 0, `slop-render.html at 390: missing ${missing.join(' ')}`);
  check(!at1440.includes('RSP-06'), 'slop-render.html at 1440: RSP-06 should only run at 1024 and below');
  check(render390.result.errors.length === 0 && render1440.result.errors.length === 0, 'slop-render.html: detect.js rule errors');
  console.log(`slop-render.html@390: ${at390.filter((i) => RENDER.includes(i)).length} of ${RENDER.length} render rules`);
}
Object.assign(out, engineOut);

for (const [f, o] of Object.entries(out)) {
  const r = o.result;
  console.log(`${f}: ${r.findings.length} findings, ${ids(r).length} distinct rules`);
  check(o.pageErrors.length === 0, `${f}: page errors ${o.pageErrors.join(' | ')}`);
  check(r.errors.length === 0, `${f}: detect.js rule errors ${JSON.stringify(r.errors)}`);
  check(!o.mutated, `${f}: highlight and clear changed the DOM`);
  check(o.hl.left === 0, `${f}: ${o.hl.left} outlines left after clear`);
  check(r.findings.length === 0 || o.hl.outlined > 0, `${f}: highlight outlined nothing`);
  check(Array.isArray(r.thirdParty), `${f}: report has no thirdParty list`);
  for (const x of r.findings.concat(r.thirdParty || [])) {
    check(level[x.ruleId] !== undefined, `${f}: unknown rule id ${x.ruleId}`);
    check(typeof x.selector === 'string' && x.selector.length > 0, `${f}: ${x.ruleId} missing selector`);
    check(x.rect && x.rect.w >= 0 && x.rect.h >= 0, `${f}: ${x.ruleId} bad rect`);
    check(x.text.length <= 60, `${f}: ${x.ruleId} text longer than 60`);
  }
  const counted = Object.values(r.counts).reduce((a, b) => a + b, 0);
  check(counted >= r.findings.length, `${f}: counts add up to ${counted}, below ${r.findings.length} findings`);
}

const slop = engineOut['slop.html@1440'].result;
const slopIds = ids(slop);
check(slopIds.length >= 15, `slop.html found only ${slopIds.length} distinct rule ids (need 15)`);
const slopDet = slopIds.filter((i) => level[i] === 'deterministic');
console.log(`slop.html deterministic rules: ${slopDet.length}`);
console.log('slop.html ids: ' + slopIds.join(' '));

// Every measured rule needs a fixture that makes it fire; turning a rule off must fail this script.
const union = new Set([render390, render1440, ...Object.values(engineOut)].flatMap((o) => ids(o.result)));
const measured = rules.filter((r) => r.detect.level !== 'manual').map((r) => r.id);
const uncovered = measured.filter((i) => !union.has(i));
check(uncovered.length === 0, `measured rules without a positive fixture: ${uncovered.join(' ')}`);
console.log(`measured rules with a positive fixture: ${measured.length - uncovered.length} of ${measured.length}`);

for (const w of [1440, 390]) {
  const clean = out[`clean.html@${w}`].result;
  check(clean.findings.length === 0, `clean.html at ${w}: expected 0 findings, got ` + clean.findings.map((x) => `${x.ruleId}@${x.selector}`).join(', '));
}

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

// TYP-05 skips wordmarks (clean-type.html) and reports a heading once, even when each word is its own span.
for (const w of [1440, 390]) {
  const typ = engineOut[`slop-type.html@${w}`].result.findings.filter((x) => x.ruleId === 'TYP-05').map((x) => x.selector).sort();
  const want = ['#t-pct', '#t-split', '#t-story'];
  check(JSON.stringify(typ) === JSON.stringify(want), `slop-type.html at ${w}: TYP-05 on ${typ.join(' ') || 'nothing'}, want ${want.join(' ')}`);
}

// A consent manager's banner is a third-party widget: its findings go to thirdParty, not to the site's counts.
for (const w of [1440, 390]) {
  const r = engineOut[`consent-overlay.html@${w}`].result;
  const tp = r.thirdParty || [];
  check(tp.length > 0 && tp.every((x) => x.thirdParty === 'consent'), `consent-overlay.html at ${w}: expected consent findings in thirdParty, got ${tp.length}`);
  check(Object.keys(r.counts).length === 0, `consent-overlay.html at ${w}: counts should leave out the banner, got ${JSON.stringify(r.counts)}`);
  console.log(`consent-overlay.html@${w}: ${tp.length} third-party findings (${Array.from(new Set(tp.map((x) => x.ruleId))).join(' ')}) kept out of the counts`);
}

// Known gaps: these fixtures record what a rule cannot measure yet. When the rule starts to fire, the gap is closed:
// move the fixture's id into expected-engine.json as a positive one.
for (const [f, id] of Object.entries({ 'gap-col08-backdrop.html': 'COL-08' })) {
  for (const w of [1440, 390]) {
    const hit = engineOut[`${f}@${w}`].result.findings.some((x) => x.ruleId === id);
    check(!hit, `${f} at ${w}: ${id} now fires here, so this gap is closed; make the fixture a positive one`);
  }
}

for (const [id, o] of Object.entries(alone)) {
  const got = Object.keys(o.result.counts).sort();
  check(JSON.stringify(got) === JSON.stringify([id]), `slop.html with rules [${id}]: counts ${JSON.stringify(o.result.counts)}, want only ${id} (it reads ${o.needs.join(' ')})`);
  check(o.result.findings.every((x) => x.ruleId === id), `slop.html with rules [${id}]: reported rules it was not asked for`);
}

if (failures.length) {
  console.log('\nFAILURES');
  for (const m of failures) console.log(' - ' + m);
  process.exit(1);
}
console.log('DETECT OK');
