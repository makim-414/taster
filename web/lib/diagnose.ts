// Runs the repository's own diagnosis (engine/diagnose.mjs: detectOnce and summarize, which run
// rules/detect.js) inside the fenced server browser. Nothing here measures slop by itself.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Browser, BrowserContext, BrowserContextOptions, Page } from 'playwright-core';
import { closeBrowser, fencePage, launchBrowser, tmpFree, type Budget } from './browser.ts';

type Viewport = { width: number; height: number };
type RawRun = { viewport: Viewport; page: { width: number; height: number }; counts: Record<string, number>; findings: unknown[]; screenshot?: string };
export type RuleHit = {
  ruleId: string;
  name: string;
  severity: 'high' | 'medium' | 'low';
  counts: Record<string, number>;
  fix: string;
  fix_patterns: string[];
  findings: { width: number; selector: string; text?: string; evidence?: unknown }[];
};
export type Summary = { url: string; widths: number[]; measured: number; rulesHit: number; findings: number; rules: RuleHit[]; judgeByEye: string[] };
type Engine = {
  VIEWPORTS: Viewport[];
  detectOnce: (browser: unknown, url: string, viewport: Viewport, opts: Record<string, unknown>) => Promise<RawRun>;
  summarize: (url: string, runs: RawRun[]) => Summary;
};

// The engine is loaded at run time from the repository, not bundled, so it keeps reading
// rules/detect.js and rules/rules.json next to itself exactly as the CLI and MCP server do.
let enginePromise: Promise<Engine> | null = null;
function engineFile(): string {
  const candidates = [
    process.env.TASTER_ENGINE,
    path.resolve(process.cwd(), '../engine/diagnose.mjs'),
    path.resolve(process.cwd(), 'engine/diagnose.mjs'),
    // Vercel keeps the traced repo layout under /var/task.
    '/var/task/engine/diagnose.mjs',
  ].filter(Boolean) as string[];
  const found = candidates.find((c) => existsSync(c));
  if (!found) throw new Error(`engine/diagnose.mjs not found (looked in ${candidates.join(', ')})`);
  return found;
}
export function loadEngine(): Promise<Engine> {
  enginePromise ||= import(/* webpackIgnore: true */ /* turbopackIgnore: true */ pathToFileURL(engineFile()).href) as Promise<Engine>;
  return enginePromise;
}

// Captures stay small enough for one JSON response (4.5 MB on Vercel): JPEG, and a height cap
// per width. The engine asks for up to 8000px; the result page shows the top of the page.
const SHOT_HEIGHT: Record<number, number> = { 1440: 3600, 390: 5600 };
const SHOT_BYTES = 1_400_000;
const SHOT_TIMEOUT_MS = 12000;
// The route gets 90 s in all. On a heavy page one width can take most of a minute (load and idle
// waits, then the capture), so the next width only starts while this much time is left, and a
// diagnosis that runs out of time answers with the widths it did measure.
const WIDTH_BUDGET_MS = 35000;

export type Diagnosis = { report: Summary; shots: Record<string, string>; missed: number[]; requests: number };

export class PageLoadError extends Error {}

function safeHostForLog(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'invalid';
  }
}

function firstLine(err: unknown, max: number): string {
  return String((err as Error)?.message || err).split('\n')[0].slice(0, max);
}

// allowLoopback is for test/fixtures.test.ts only; the API route never passes it.
export async function runDiagnosis(url: string, { deadlineMs = 75000, widthBudgetMs = WIDTH_BUDGET_MS, allowLoopback = false } = {}): Promise<Diagnosis> {
  const started = Date.now();
  const engine = await loadEngine();
  const browser: Browser = await launchBrowser();
  const budget: Budget = { requests: 0, bytes: 0, blocked: null, allowLoopback };
  const shots: Record<string, string> = {};
  // Once a capture times out the renderer is not painting, and the next width would only wait
  // out the same timeout, so the remaining captures are skipped.
  let paintStalled = false;

  // detectOnce only calls browser.newPage and page.close, so a thin stand-in adds the fence and
  // captures the screenshot as JPEG in memory instead of a file path. All pages share one
  // context that stays open until the browser closes: the serverless Chromium runs with
  // --single-process, where disposing a context can take the whole browser down.
  let context: BrowserContext | null = null;
  const fenced = {
    newPage: async (options: BrowserContextOptions) => {
      context ||= await browser.newContext({ deviceScaleFactor: 1, serviceWorkers: 'block', bypassCSP: true, acceptDownloads: false, locale: 'ko-KR' });
      const page: Page = await context.newPage();
      if (options.viewport) await page.setViewportSize(options.viewport);
      await fencePage(page, budget);
      const width = options.viewport ? options.viewport.width : 0;
      const original = page.screenshot.bind(page);
      page.screenshot = (async (o: { clip?: { x: number; y: number; width: number; height: number } } = {}) => {
        if (paintStalled) return Buffer.alloc(0);
        const cap = SHOT_HEIGHT[width] || 4000;
        const clip = o.clip ? { ...o.clip, width: Math.min(o.clip.width, width * 1.5), height: Math.min(o.clip.height, cap) } : undefined;
        // The findings are already measured when the capture runs, so a page whose renderer will
        // not paint (heavy WebGL, for one) still gets its report, just without this picture.
        try {
          let buf = await original({ type: 'jpeg', quality: 70, fullPage: true, clip, timeout: SHOT_TIMEOUT_MS });
          if (buf.length > SHOT_BYTES && clip) buf = await original({ type: 'jpeg', quality: 45, fullPage: true, clip: { ...clip, height: Math.round(clip.height * 0.6) }, timeout: SHOT_TIMEOUT_MS });
          shots[width] = `data:image/jpeg;base64,${buf.toString('base64')}`;
          return buf;
        } catch (err) {
          paintStalled = true;
          console.error('diagnose capture skipped', width, firstLine(err, 200));
          return Buffer.alloc(0);
        }
      }) as Page['screenshot'];
      // Stop the page instead of closing its target; browser.close() cleans up at the end.
      page.close = (async () => {
        await page.goto('about:blank', { timeout: 5000 }).catch(() => {});
      }) as Page['close'];
      return page;
    },
  };

  // detectOnce returns a whole run or nothing, so runs only ever holds finished widths.
  const runs: RawRun[] = [];
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<'late'>((resolve) => {
    timer = setTimeout(() => resolve('late'), Math.max(0, deadlineMs - (Date.now() - started)));
  });
  try {
    const work = (async () => {
      for (const viewport of engine.VIEWPORTS) {
        if (runs.length && Date.now() - started > deadlineMs - widthBudgetMs) break;
        try {
          runs.push(await engine.detectOnce(fenced, url, viewport, { screenshot: `shot-${viewport.width}.jpg`, timeout: 15000, maxPerRule: 20 }));
        } catch (err) {
          console.error('diagnose load failed', safeHostForLog(url), viewport.width, firstLine(err, 300), await tmpFree());
          if (budget.blocked) throw new PageLoadError(budget.blocked);
          // A later width that fails still leaves the widths already measured to report.
          if (runs.length) break;
          throw new PageLoadError(`페이지를 열지 못했습니다. (${firstLine(err, 120)})`);
        }
      }
      return 'done' as const;
    })();
    // After the deadline the unfinished width rejects once the browser closes; nothing waits on it.
    work.catch(() => {});
    const outcome = await Promise.race([work, deadline]);
    const measured = runs.slice();
    if (!measured.length) throw new PageLoadError('시간 안에 페이지를 다 열지 못했습니다.');
    if (outcome === 'late') console.error('diagnose out of time', safeHostForLog(url), 'measured', measured.map((r) => r.viewport.width).join(','));
    const done = new Set(measured.map((r) => r.viewport.width));
    return {
      report: engine.summarize(url, measured),
      shots: Object.fromEntries(Object.entries(shots).filter(([w]) => done.has(Number(w)))),
      missed: engine.VIEWPORTS.map((v) => v.width).filter((w) => !done.has(w)),
      requests: budget.requests,
    };
  } finally {
    clearTimeout(timer);
    await closeBrowser(browser);
  }
}

// detect.js reports evidence as an object of measured values ({ letterSpacingEm: 0.12 }, ...).
export function evidenceText(evidence: unknown): string | undefined {
  if (evidence === undefined || evidence === null || evidence === '') return undefined;
  if (typeof evidence !== 'object') return String(evidence).slice(0, 200);
  const parts = Object.entries(evidence as Record<string, unknown>).map(([k, v]) => `${k} ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
  return parts.join(', ').slice(0, 200);
}

// Keeps the response small: per rule, up to three distinct places, no rects, evidence as text.
export function trimReport(report: Summary): Summary {
  return {
    ...report,
    rules: report.rules.map((r) => {
      const seen = new Set<string>();
      const findings = r.findings.filter((f) => !seen.has(f.selector) && seen.size < 3 && seen.add(f.selector)).map((f) => ({ width: f.width, selector: f.selector, text: f.text ? Array.from(f.text).slice(0, 60).join('') : undefined, evidence: evidenceText(f.evidence) }));
      return { ...r, findings };
    }),
  };
}
