// Reads a site's brand through the fenced server browser and turns it into tokens with the engine's own brandTheme, so
// the gallery and brand_theme give the same answer.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Browser } from 'playwright-core';
import { closeBrowser, fencePage, launchBrowser, type Budget } from './browser.ts';
import { loadEngine, PageLoadError } from './diagnose.ts';

export type BrandResult = { source: { name: string | null; color: string | null; dark: boolean }; tokens: Record<string, string>; css: string; notes: string[] };
type BrandModule = { brandTheme: (content: unknown) => BrandResult };

let brandPromise: Promise<BrandModule> | null = null;
function loadBrand(): Promise<BrandModule> {
  const found = [
    process.env.TASTER_ENGINE ? path.join(path.dirname(process.env.TASTER_ENGINE), 'brand.mjs') : '',
    path.resolve(process.cwd(), '../engine/brand.mjs'),
    path.resolve(process.cwd(), 'engine/brand.mjs'),
    '/var/task/engine/brand.mjs',
  ].filter(Boolean).find((c) => existsSync(c));
  if (!found) return Promise.reject(new Error('engine/brand.mjs not found'));
  brandPromise ||= import(/* webpackIgnore: true */ /* turbopackIgnore: true */ pathToFileURL(found).href) as Promise<BrandModule>;
  return brandPromise;
}

// allowLoopback is for test/ only; the API route never passes it.
export async function runBrand(url: string, { deadlineMs = 45000, allowLoopback = false } = {}): Promise<BrandResult> {
  const engine = (await loadEngine()) as unknown as { EXTRACT_SOURCE: string };
  const { brandTheme } = await loadBrand();
  const browser: Browser = await launchBrowser();
  const budget: Budget = { requests: 0, bytes: 0, blocked: null, allowLoopback };
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new PageLoadError('시간 안에 페이지를 다 열지 못했습니다.')), deadlineMs);
  });
  const read = async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, serviceWorkers: 'block', bypassCSP: true });
    const page = await context.newPage();
    await fencePage(page, budget);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    } catch (err) {
      if (budget.blocked) throw new PageLoadError('이 주소는 열 수 없습니다.');
      throw new PageLoadError(`페이지를 열지 못했습니다. ${String((err as Error).message).split('\n')[0]}`);
    }
    await page.waitForLoadState('load', { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready);
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
