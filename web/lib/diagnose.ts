// Runs the repository's own diagnosis (engine/diagnose.mjs: detectOnce and summarize, which run
// rules/detect.js) inside the fenced server browser. Nothing here measures slop by itself.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Browser, BrowserContextOptions, Page } from 'playwright-core';
import { fencePage, launchBrowser, type Budget } from './browser.ts';

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

export type Diagnosis = { report: Summary; shots: Record<string, string>; requests: number };

export class PageLoadError extends Error {}

// allowLoopback is for test/fixtures.test.ts only; the API route never passes it.
export async function runDiagnosis(url: string, { deadlineMs = 50000, allowLoopback = false } = {}): Promise<Diagnosis> {
  const engine = await loadEngine();
  const browser: Browser = await launchBrowser();
  const budget: Budget = { requests: 0, bytes: 0, blocked: null, allowLoopback };
  const shots: Record<string, string> = {};

  // detectOnce only calls browser.newPage, so a thin stand-in adds the fence and captures the
  // screenshot as JPEG in memory instead of a file path.
  const fenced = {
    newPage: async (options: BrowserContextOptions) => {
      const page: Page = await browser.newPage({ ...options, serviceWorkers: 'block', bypassCSP: true, acceptDownloads: false, locale: 'ko-KR' });
      await fencePage(page, budget);
      const width = options.viewport ? options.viewport.width : 0;
      const original = page.screenshot.bind(page);
      page.screenshot = (async (o: { clip?: { x: number; y: number; width: number; height: number } } = {}) => {
        const cap = SHOT_HEIGHT[width] || 4000;
        const clip = o.clip ? { ...o.clip, width: Math.min(o.clip.width, width * 1.5), height: Math.min(o.clip.height, cap) } : undefined;
        let buf = await original({ type: 'jpeg', quality: 70, fullPage: true, clip });
        if (buf.length > SHOT_BYTES && clip) buf = await original({ type: 'jpeg', quality: 45, fullPage: true, clip: { ...clip, height: Math.round(clip.height * 0.6) } });
        shots[width] = `data:image/jpeg;base64,${buf.toString('base64')}`;
        return buf;
      }) as Page['screenshot'];
      return page;
    },
  };

  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new PageLoadError('시간 안에 페이지를 다 열지 못했습니다.')), deadlineMs);
  });
  try {
    const work = (async () => {
      const runs: RawRun[] = [];
      for (const viewport of engine.VIEWPORTS) {
        try {
          runs.push(await engine.detectOnce(fenced, url, viewport, { screenshot: `shot-${viewport.width}.jpg`, timeout: 15000, maxPerRule: 20 }));
        } catch (err) {
          if (budget.blocked) throw new PageLoadError(budget.blocked);
          throw new PageLoadError(`페이지를 열지 못했습니다. (${String((err as Error).message || err).split('\n')[0].slice(0, 120)})`);
        }
      }
      return engine.summarize(url, runs);
    })();
    const report = await Promise.race([work, deadline]);
    return { report, shots, requests: budget.requests };
  } finally {
    clearTimeout(timer);
    await browser.close().catch(() => {});
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
