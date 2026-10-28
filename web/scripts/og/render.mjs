// Renders scripts/og/card.html (registry tokens and the rule count inlined) to public/og.png, the link preview image.
// Run it again whenever rules are added.
// Usage: node scripts/og/render.mjs
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const root = new URL('../../../', import.meta.url);
const tokens = ['registry/src/tokens.css', 'registry/src/themes/light.css'].map((p) => readFileSync(new URL(p, root), 'utf8')).join('\n');
const ruleCount = JSON.parse(readFileSync(new URL('rules/rules.json', root), 'utf8')).rules.length;
const html = readFileSync(new URL('card.html', import.meta.url), 'utf8').replace('/*TOKENS*/', tokens).replace('/*RULES*/', String(ruleCount));
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (existsSync(MAC_CHROME) ? MAC_CHROME : undefined) });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: new URL('../../public/og.png', import.meta.url).pathname });
  console.log('public/og.png written');
} finally {
  await browser.close();
}
