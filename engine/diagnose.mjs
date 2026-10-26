// Runs rules/detect.js in Chromium at each viewport, the way references/diagnose.md describes,
// and joins the findings with rules/rules.json (name, severity, fix, fix patterns).
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
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
const MAX_SHOT_HEIGHT = 8000;

// Accepts an http(s) URL, a file:// URL or a path to a local HTML file.
export function toUrl(target) {
  if (/^https?:\/\//i.test(target) || /^file:\/\//i.test(target)) return target;
  const path = resolve(target);
  if (existsSync(path)) return pathToFileURL(path).href;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(target)) return `https://${target}`;
  throw new Error(`Not a URL or an existing file: ${target}`);
}

export function explainRule(id) {
  return RULE_BY_ID.get(String(id).toUpperCase()) || null;
}

// One page load at one viewport. Returns the raw detect.js report.
export async function detectOnce(browser, url, viewport, { highlight = false, screenshot = null, timeout = 30000, maxPerRule = 50 } = {}) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  try {
    await page.goto(url, { waitUntil: 'load', timeout });
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.addScriptTag({ content: DETECT_SOURCE });
    const report = await page.evaluate((o) => window.tasterDetect(o), { highlight: highlight || !!screenshot, maxPerRule });
    if (screenshot) {
      const height = Math.min(report.page.height, MAX_SHOT_HEIGHT);
      await page.screenshot({ path: screenshot, fullPage: true, clip: { x: 0, y: 0, width: Math.max(report.page.width, viewport.width), height } });
      report.screenshot = screenshot;
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
      const screenshot = outDir ? join(outDir, `annotated-${viewport.width}.png`) : null;
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
    screenshots: runs.map((run) => run.screenshot).filter(Boolean),
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
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'load', timeout });
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

