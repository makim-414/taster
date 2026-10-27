// Renders the before/after pair for the first-screen comparison slider from examples/rebuild:
// both pages are run through engine/diagnose.mjs detectOnce at 1440 wide with findings outlined,
// cropped to the same first-screen height, and written to public/compare/.
// Usage: node scripts/compare/render.mjs
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = new URL('../../../', import.meta.url);
const { detectOnce } = await import(new URL('engine/diagnose.mjs', root).href);
const out = new URL('../../public/compare/', import.meta.url);
mkdirSync(out, { recursive: true });
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (existsSync(MAC_CHROME) ? MAC_CHROME : undefined) });
const viewport = { width: 1440, height: 900 };
const HEIGHT = 900;
try {
  for (const side of ['before', 'after']) {
    const tmp = new URL(`${side}-full.png`, out).pathname;
    const page = new URL(`examples/rebuild/${side}.html`, root);
    // detectOnce writes the outlined full page capture; the crop below keeps the first screen.
    const report = await detectOnce(browser, page.href, viewport, { screenshot: tmp });
    const view = await browser.newPage({ viewport: { width: 1440, height: HEIGHT } });
    await view.goto(pathToFileURL(tmp).href);
    await view.screenshot({ path: new URL(`${side}.jpg`, out).pathname, type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: 1440, height: HEIGHT } });
    await view.close();
    rmSync(tmp);
    console.log(`${side}: ${Object.keys(report.counts).length} rules, ${report.findings.length} places`);
  }
} finally {
  await browser.close();
}
