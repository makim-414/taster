// Runs rules/detect.js in Chromium at each viewport, the way references/diagnose.md describes,
// and joins the findings with rules/rules.json (name, severity, fix, fix patterns).
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = new URL('../', import.meta.url);
export const DETECT_SOURCE = readFileSync(new URL('rules/detect.js', ROOT), 'utf8');
export const EXTRACT_SOURCE = readFileSync(new URL('./extract.js', import.meta.url), 'utf8');
export const RULES = JSON.parse(readFileSync(new URL('rules/rules.json', ROOT), 'utf8')).rules;
export const RULE_BY_ID = new Map(RULES.map((r) => [r.id, r]));
export const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];
// --widths responsive: phone, the 767/768 breakpoint pair, portrait and landscape tablet, laptop, desktop.
// Layouts usually break between the two default widths, and the touch size rule (RSP-06) runs at 1024 and below.
export const RESPONSIVE_WIDTHS = [360, 390, 640, 767, 768, 820, 1024, 1280, 1440];
export function viewportFor(width) {
  return VIEWPORTS.find((v) => v.width === width) || { width, height: width < 768 ? 844 : 900 };
}
// Playwright's own Chromium if it was installed, else the system Chrome, so a plugin install works
// without downloading a browser.
export async function launch() {
  try {
    return await chromium.launch();
  } catch (first) {
    try {
      return await chromium.launch({ channel: 'chrome' });
    } catch {
      throw new Error(`No browser found. Install Google Chrome, or run: npx playwright install chromium (${first.message.split('\n')[0]})`);
    }
  }
}
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };
// Annotated captures are JPEG, cover the top 4000px of the page, and no file passes 4 MB, so an agent can take them
// as images (an MCP stdio message is capped at 10 MB, an API image at 5 MB). A capture over the limit is taken again
// as 2000px tiles, and a tile still over it at a lower quality.
const MAX_SHOT_HEIGHT = 4000;
const TILE_HEIGHT = 2000;
export const MAX_SHOT_BYTES = 4 * 1024 * 1024;
const LOAD_WAIT = 15000;
// Local files are opened only as pages. Anything else (notes, keys, configs) is refused, even through a link.
const LOCAL_PAGE = /\.(html?|xhtml|svg)$/i;
// A name that looks like a file is never guessed into a web address: report.md is also a real domain.
const FILE_NAME = /\.(html?|xhtml|svg|md|mdx|markdown|txt|json|xml|csv|ya?ml|[cm]?[jt]sx?|css|vue|svelte|astro)$/i;

function localPage(path) {
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  const real = realpathSync(path);
  if (!statSync(real).isFile() || !LOCAL_PAGE.test(real)) throw new Error(`Only local .html, .htm, .xhtml and .svg files are opened: ${real}`);
  // TASTER_ROOT keeps local reads inside one folder (a project, a shared machine).
  if (process.env.TASTER_ROOT) {
    const root = realpathSync(resolve(process.env.TASTER_ROOT));
    const rel = relative(root, real);
    if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Outside TASTER_ROOT (${root}): ${real}`);
  }
  return pathToFileURL(path).href;
}

// Accepts an http(s) URL, localhost:<port> or 127.0.0.1:<port> (as http), a bare domain (as https), or a local
// HTML file as a path or a file:// URL.
export function toUrl(target) {
  if (/^https?:\/\//i.test(target)) return target;
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?([/?#]|$)/i.test(target)) return `http://${target}`;
  if (/^file:\/\//i.test(target)) return localPage(fileURLToPath(target));
  const path = resolve(target);
  if (existsSync(path) || (FILE_NAME.test(target) && !/^[\w.-]+\.[a-z]{2,}\//i.test(target))) return localPage(path);
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(target)) return `https://${target}`;
  throw new Error(`Not a URL or an existing file: ${target}`);
}

export function explainRule(id) {
  return RULE_BY_ID.get(String(id).toUpperCase()) || null;
}

// The top `height` px of the page as JPEG at `file`, in 2000px tiles (file, file-2, ...) when one image would pass
// MAX_SHOT_BYTES. Returns the files written, top first.
async function capture(page, file, width, height) {
  const take = (path, y, h, quality) => page.screenshot({ path, type: 'jpeg', quality, fullPage: true, clip: { x: 0, y, width, height: h } });
  if ((await take(file, 0, height, 70)).length <= MAX_SHOT_BYTES) return [file];
  const files = [];
  for (let y = 0; y < height; y += TILE_HEIGHT) {
    const path = y ? file.replace(/(\.jpe?g)?$/i, `-${y / TILE_HEIGHT + 1}.jpg`) : file;
    const h = Math.min(TILE_HEIGHT, height - y);
    // A region no taller than a tile was just taken at 70.
    for (const quality of h < height ? [70, 45, 25] : [45, 25]) if ((await take(path, y, h, quality)).length <= MAX_SHOT_BYTES) break;
    files.push(path);
  }
  return files;
}

// One page load at one viewport. Returns the raw detect.js report.
// bypassCSP: many large sites forbid inline scripts, which would block the injected detector.
export async function detectOnce(browser, url, viewport, { highlight = false, screenshot = null, timeout = 30000, maxPerRule = 50 } = {}) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, bypassCSP: true });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    // Heavy pages (video, WebGL) can take minutes to fire load; the layout we measure is there long before.
    await page.waitForLoadState('load', { timeout: LOAD_WAIT }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.addScriptTag({ content: DETECT_SOURCE });
    const report = await page.evaluate((o) => window.tasterDetect(o), { highlight: highlight || !!screenshot, maxPerRule });
    if (screenshot) {
      // Wide overflow is shown up to half a screen past the viewport, the way the web capture does.
      const width = Math.min(Math.max(report.page.width, viewport.width), Math.round(viewport.width * 1.5));
      report.screenshots = await capture(page, screenshot, width, Math.min(report.page.height, MAX_SHOT_HEIGHT));
      report.screenshot = report.screenshots[0];
    }
    return report;
  } finally {
    await page.close();
  }
}

export async function diagnose(target, { viewports = VIEWPORTS, outDir = null, timeout = 30000, maxPerRule = 50 } = {}) {
  const url = toUrl(target);
  const browser = await launch();
  try {
    const runs = [];
    for (const viewport of viewports) {
      const screenshot = outDir ? join(outDir, `annotated-${viewport.width}.jpg`) : null;
      runs.push(await detectOnce(browser, url, viewport, { screenshot, timeout, maxPerRule }));
    }
    return summarize(url, runs);
  } finally {
    await browser.close();
  }
}

// Groups findings by rule across widths, most severe and most frequent first.
export function summarize(url, runs) {
  const ids = [...new Set(runs.flatMap((run) => Object.keys(run.counts)))];
  const rules = ids
    .map((id) => {
      const rule = RULE_BY_ID.get(id);
      return {
        ruleId: id,
        name: rule.name,
        severity: rule.severity,
        counts: Object.fromEntries(runs.map((run) => [run.viewport.width, run.counts[id] || 0])),
        fix: rule.fix,
        fix_patterns: rule.fix_patterns,
        findings: runs.flatMap((run) => run.findings.filter((f) => f.ruleId === id).map((f) => ({ width: run.viewport.width, ...f }))),
      };
    })
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || Math.max(...Object.values(b.counts)) - Math.max(...Object.values(a.counts)) || a.ruleId.localeCompare(b.ruleId));
  return {
    url,
    widths: runs.map((run) => run.viewport.width),
    measured: RULES.filter((r) => r.detect.level !== 'manual').length,
    rulesHit: rules.length,
    findings: rules.reduce((n, r) => n + Math.max(...Object.values(r.counts)), 0),
    rules,
    judgeByEye: RULES.filter((r) => r.detect.level === 'manual').map((r) => r.id),
    screenshots: runs.flatMap((run) => run.screenshots || [run.screenshot]).filter(Boolean),
  };
}

export function formatText(report) {
  const out = [report.url, `${report.rulesHit} of ${report.measured} measured rules hit at ${report.widths.join(' and ')} wide`];
  for (const r of report.rules) {
    const counts = report.widths.map((w) => `${r.counts[w]} at ${w}`).join(', ');
    out.push('', `${r.ruleId}  ${r.name}  [${r.severity}]  ${counts}`);
    const seen = new Set();
    for (const f of r.findings) {
      if (seen.has(f.selector) || seen.size >= 3) continue;
      seen.add(f.selector);
      out.push(`  at ${f.selector}${f.text ? `  "${Array.from(f.text).slice(0, 40).join('')}"` : ''}`);
      const evidence = f.evidence && typeof f.evidence === 'object' ? Object.entries(f.evidence).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' ') : f.evidence;
      if (evidence) out.push(`     ${evidence}`);
    }
    out.push(`  fix: ${r.fix}`);
    if (r.fix_patterns.length) out.push(`  patterns: ${r.fix_patterns.join(', ')}`);
  }
  out.push('', `Judge by eye (${report.judgeByEye.length} manual rules): ${report.judgeByEye.join(' ')}`);
  if (report.screenshots.length) out.push('', ...report.screenshots.map((s) => `annotated: ${s}`));
  return out.join('\n');
}

// The page's content (words, links, images, brand color and fonts, nav, footer) in reading order, read at
// desktop width. This is what a rebuild keeps; diagnose() says what it drops.
export async function extract(target, { timeout = 30000, viewport = VIEWPORTS[0] } = {}) {
  const url = toUrl(target);
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1, bypassCSP: true });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    // Heavy pages (video, WebGL) can take minutes to fire load; the layout we measure is there long before.
    await page.waitForLoadState('load', { timeout: LOAD_WAIT }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.addScriptTag({ content: EXTRACT_SOURCE });
    return await page.evaluate(() => window.tasterExtract());
  } finally {
    await browser.close();
  }
}

// Every heading and action label in the original, and whether the rebuild still says it.
export function contentParity(before, after) {
  const norm = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const items = (c) => [
    ...c.sections.flatMap((s) => [s.heading?.text, ...s.subheadings.map((h) => h.text), ...s.actions.map((a) => a.text), ...(s.links || []).map((l) => l.text)]),
    ...c.nav.map((n) => n.text),
  ].filter(Boolean);
  const haystack = norm([...items(after), ...after.sections.flatMap((s) => [...s.text, ...s.lists.flat(), ...s.quotes])].join(' '));
  const expected = [...new Set(items(before))];
  const missing = expected.filter((t) => !haystack.includes(norm(t)));
  return { expected: expected.length, kept: expected.length - missing.length, missing };
}

