// Renders the home page's comparison pair from Taster's own rebuild example: examples/rebuild/before.html with the
// detector's outlines on every finding, and examples/rebuild/after.html, the same content rebuilt to the rules. Both
// are 1600x1072 JPEG (1300x871 at 16/13), the frame app/compare-reveal.tsx shows, plus a 780px wide copy of each
// (<name>-780.jpg, the same page drawn at 0.6) that the slider's srcset gives to phones. Acme Ledger is a made-up product, so
// the pictures hold no real site, logo or mark, and the emoji in before.html are drawn with Noto Color Emoji (OFL) rather
// than the system's own emoji art. Run it again when the example changes.
// Usage: node scripts/compare/render.mjs [out dir]   (default public/compare)
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const root = new URL('../../../../', import.meta.url);
const out = new URL(process.argv[2] ? `file://${process.argv[2].replace(/\/?$/, '/')}` : '../../public/compare/', import.meta.url);
const DETECT = readFileSync(new URL('data/rules/detect.js', root), 'utf8');
const EMOJI_CSS = 'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=block';
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (existsSync(MAC_CHROME) ? MAC_CHROME : undefined) });
// Each picture's file name and the scale it is drawn at: 1300 CSS pixels wide becomes 1600 and 780.
const SIZES = [['', 16 / 13], ['-780', 0.6]];
try {
  for (const [suffix, scale] of SIZES) for (const name of ['before', 'after']) {
    const page = await browser.newPage({ viewport: { width: 1300, height: 871 }, deviceScaleFactor: scale });
    await page.goto(new URL(`examples/rebuild/${name}.html`, root).href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    if (name === 'before') {
      await page.addScriptTag({ content: DETECT });
      const report = await page.evaluate(() => window.tasterDetect({ highlight: true }));
      if (!suffix) console.log(`before.html: ${Object.keys(report.counts).length} rules hit, outlined`);
      // After the measurement, so the detector reads the page's own font stacks: every element gets the open emoji face
      // as its last fallback, ahead of the system's.
      await page.addStyleTag({ url: EMOJI_CSS });
      const drawn = await page.evaluate(async () => {
        for (const el of document.querySelectorAll('body, body *')) el.style.fontFamily = `${getComputedStyle(el).fontFamily}, "Noto Color Emoji"`;
        const text = document.body.innerText;
        await document.fonts.load('20px "Noto Color Emoji"', text);
        await document.fonts.ready;
        return [...document.fonts].some((f) => f.family.includes('Noto Color Emoji') && f.status === 'loaded');
      });
      if (!drawn) throw new Error('Noto Color Emoji did not load; the picture would show the system emoji');
    }
    await page.screenshot({ path: new URL(`${name}${suffix}.jpg`, out).pathname, type: 'jpeg', quality: 82 });
    await page.close();
  }
  console.log(`before.jpg, after.jpg and their -780 copies written to ${out.pathname}`);
} finally {
  await browser.close();
}
