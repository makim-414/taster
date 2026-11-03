// Renders scripts/og/card.html (registry tokens and the rule counts inlined) to public/og.png, the link preview image,
// and writes the counts it drew to scripts/og/meta.json. Run it again whenever rules are added: test/metadata.test.ts
// fails while meta.json and rules/rules.json disagree.
// Usage: node scripts/og/render.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const root = new URL('../../../', import.meta.url);
const tokens = ['registry/src/tokens.css', 'registry/src/themes/light.css'].map((p) => readFileSync(new URL(p, root), 'utf8')).join('\n');
const rules = JSON.parse(readFileSync(new URL('rules/rules.json', root), 'utf8')).rules;
// Manual rules are judged by eye, so the picture counts the measured ones apart, as app/page.tsx does.
const counts = { rules: rules.length, measured: rules.filter((r) => r.detect.level !== 'manual').length };
const html = readFileSync(new URL('card.html', import.meta.url), 'utf8')
  .replace('/*TOKENS*/', tokens)
  .replace('/*RULES*/', String(counts.rules))
  .replace('/*MEASURED*/', String(counts.measured));
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (existsSync(MAC_CHROME) ? MAC_CHROME : undefined) });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: new URL('../../public/og.png', import.meta.url).pathname });
  writeFileSync(new URL('meta.json', import.meta.url), `${JSON.stringify(counts, null, 2)}\n`);
  console.log(`public/og.png written (${counts.rules} rules, ${counts.measured} measured)`);
} finally {
  await browser.close();
}
