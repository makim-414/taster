// Reads a site's brand through the fenced server browser and turns it into tokens with the engine's own brandTheme, so
// the gallery and brand_theme give the same answer. A bot check, an error or a sign-in page is not the site, so its
// colors and fonts are not read as the site's brand (engine/blocked.mjs classifyLoad, the same check diagnose uses).
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Browser, Page, Response } from 'playwright-core';
import { closeBrowser, fencePage, launchBrowser, type Budget } from './browser.ts';
import { hostsOnly, loadEngine, NotDiagnosedError, PageLoadError, type NotDiagnosed } from './diagnose.ts';

export type BrandResult = { source: { name: string | null; color: string | null; dark: boolean }; tokens: Record<string, string>; css: string; notes: string[] };
type BrandModule = { brandTheme: (content: unknown) => BrandResult };
type Load = { diagnosed: true } | ({ diagnosed: false } & NotDiagnosed);
type BlockedModule = { classifyLoad: (load: { status: number | null; headers: Record<string, string>; requestedUrl: string; finalUrl: string; page: Page }) => Promise<Load> };

function engineModule(file: string): string | undefined {
  return [
    process.env.TASTER_ENGINE ? path.join(path.dirname(process.env.TASTER_ENGINE), file) : '',
    path.resolve(process.cwd(), '../../engine', file),
    path.resolve(process.cwd(), 'engine', file),
    path.join('/var/task/engine', file),
  ].filter(Boolean).find((c) => existsSync(c));
}

let brandPromise: Promise<BrandModule> | null = null;
function loadBrand(): Promise<BrandModule> {
  const found = engineModule('brand.mjs');
  if (!found) return Promise.reject(new Error('engine/brand.mjs not found'));
  brandPromise ||= import(/* webpackIgnore: true */ /* turbopackIgnore: true */ pathToFileURL(found).href) as Promise<BrandModule>;
  return brandPromise;
}

let blockedPromise: Promise<BlockedModule> | null = null;
function loadBlocked(): Promise<BlockedModule> {
  const found = engineModule('blocked.mjs');
  if (!found) return Promise.reject(new Error('engine/blocked.mjs not found'));
  blockedPromise ||= import(/* webpackIgnore: true */ /* turbopackIgnore: true */ pathToFileURL(found).href) as Promise<BlockedModule>;
  return blockedPromise;
}

// allowLoopback is for test/ only; the API routes never pass it. deadlineMs counts from the call, browser launch included,
// so a caller can hand in what is left of its own time limit.
export async function runBrand(url: string, { deadlineMs = 45000, allowLoopback = false } = {}): Promise<BrandResult> {
  const started = Date.now();
  const engine = (await loadEngine()) as unknown as { EXTRACT_SOURCE: string };
  const { brandTheme } = await loadBrand();
  const { classifyLoad } = await loadBlocked();
  const browser: Browser = await launchBrowser();
  const budget: Budget = { requests: 0, bytes: 0, blocked: null, allowLoopback };
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new PageLoadError('the page did not finish loading in time')), Math.max(0, deadlineMs - (Date.now() - started)));
  });
  const read = async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, serviceWorkers: 'block', bypassCSP: true });
    const page = await context.newPage();
    await fencePage(page, budget);
    let response: Response | null;
    try {
      response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    } catch (err) {
      if (budget.blocked) throw new PageLoadError(budget.blocked);
      throw new PageLoadError(`could not open the page (${hostsOnly(String((err as Error).message).split('\n')[0]).slice(0, 120)})`);
    }
    await page.waitForLoadState('load', { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready);
    const load = await classifyLoad({ status: response ? response.status() : null, headers: response ? response.headers() : {}, requestedUrl: url, finalUrl: page.url(), page });
    if (!load.diagnosed) throw new NotDiagnosedError(load);
    await page.addScriptTag({ content: engine.EXTRACT_SOURCE });
    const content = await page.evaluate(() => (window as unknown as { tasterExtract: () => unknown }).tasterExtract());
    return brandTheme(content);
  };
  try {
    return await Promise.race([read(), deadline]);
  } finally {
    if (timer) clearTimeout(timer);
    await closeBrowser(browser);
  }
}
