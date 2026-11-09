// Renders the pictures for the repository page into assets/ at the repository root: social-preview.png, the 1280x640
// card GitHub shows when the repository is linked (the owner uploads it in the repository settings, Social preview), and
// components.dark.jpg and components.light.jpg, six component stills from registry/previews in three columns and two
// rows (2400x1000) for the README. The pages are social-preview.html and components.html here, with the registry
// tokens inlined as scripts/og/render.mjs does (tokens.css, the dark core, and themes/light.css, which only applies under
// data-theme="light"), so each page defines both modes and the html element picks one; every picture is a data URI.
// The card shows the home page's comparison pair (scripts/compare/render.mjs) and no counts, so adding rules does not
// make it stale. Run it again when the sentence changes or one of the chosen components' stills does. A page error or
// a console error (a font or picture that did not load) fails the run before anything is written.
// Usage: node scripts/readme/render.mjs [--html <dir>]   (--html also writes the filled pages into <dir>, so
// node engine/cli.mjs can measure exactly what was drawn)
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = new URL('../../../../', import.meta.url);
const out = new URL('assets/', root);
const at = process.argv.indexOf('--html');
const htmlDir = at > 0 ? path.resolve(process.argv[at + 1] ?? '.') : null;
const read = (rel) => readFileSync(new URL(rel, root));
const tokens = ['registry/src/tokens.css', 'registry/src/themes/light.css'].map((f) => read(f).toString('utf8')).join('\n');
const jpeg = (rel) => `data:image/jpeg;base64,${read(rel).toString('base64')}`;
// A function replacement, so a $ in the tokens or the base64 is never read as a pattern.
const fill = (file, swaps) => Object.entries(swaps).reduce((t, [k, v]) => t.replace(k, () => v), readFileSync(new URL(file, import.meta.url), 'utf8'));

// Text-led components whose stills hold no photo, logo or real brand and no text cut by the frame. Two of the first
// draft are swapped: content/code-block shows a real tool's config file name (blocks/settings-section instead), and
// the marketing/pricing-cards still cuts its button label at the bottom edge (marketing/plan-table instead).
const PARTS = [
  ['marketing-plan-table', 'Plan table'],
  ['blocks-activity-feed', 'Activity feed'],
  ['chat-chat-thread', 'Chat thread'],
  ['commerce-cart', 'Cart'],
  ['blocks-settings-section', 'Settings section'],
  ['blocks-accordion', 'Accordion'],
];
// GitHub takes a social preview under 1 MB; the grid aims at 400 KB a picture so the README stays light.
const PAGES = [
  {
    name: 'social-preview', width: 1280, height: 640, font: 'Noto Sans KR', limit: 1_000_000,
    shots: [{ type: 'png' }, { type: 'jpeg', quality: 85 }],
    html: fill('social-preview.html', {
      '/*TOKENS*/': tokens,
      '/*BEFORE*/': jpeg('apps/web/public/compare/before-780.jpg'),
      '/*AFTER*/': jpeg('apps/web/public/compare/after-780.jpg'),
    }),
  },
  ...['dark', 'light'].map((theme) => ({
    name: `components.${theme}`, width: 2400, height: 1000, target: 400_000,
    shots: [{ type: 'jpeg', quality: 82 }],
    html: fill('components.html', {
      '/*THEME*/': theme,
      '/*TOKENS*/': tokens,
      '<!--TILES-->': PARTS.map(([id, label]) => `<img src="${jpeg(`registry/previews/${id}.${theme}.jpg`)}" alt="${label} component">`).join(''),
    }),
  })),
];

// Width and height from the written bytes: the PNG IHDR chunk, or the JPEG start-of-frame segment.
function size(b) {
  if (b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  for (let i = 2; i + 8 < b.length; i += 2 + b.readUInt16BE(i + 2)) {
    if (b[i + 1] >= 0xc0 && b[i + 1] <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
  }
  throw new Error('no image size found in the file');
}

const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (existsSync(MAC_CHROME) ? MAC_CHROME : undefined) });
try {
  mkdirSync(out, { recursive: true });
  if (htmlDir) mkdirSync(htmlDir, { recursive: true });
  for (const p of PAGES) {
    if (htmlDir) writeFileSync(path.join(htmlDir, `${p.name}.html`), p.html);
    const page = await browser.newPage({ viewport: { width: p.width, height: p.height } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console error: ${m.text()}`); });
    await page.setContent(p.html, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode()));
    });
    if (p.font && !(await page.evaluate((family) => [...document.fonts].some((f) => f.family.replace(/["']/g, '') === family && f.status === 'loaded'), p.font))) {
      errors.push(`${p.font} did not load; the picture would show a fallback face`);
    }
    if (errors.length) throw new Error(`${p.name}: ${errors.join('; ')}`);
    // The first format that fits the limit wins; only that file is kept, so there is one picture to upload.
    let shot, ext;
    for (const s of p.shots) {
      shot = await page.screenshot(s);
      ext = s.type === 'png' ? 'png' : 'jpg';
      if (!p.limit || shot.length < p.limit) break;
    }
    if (p.limit && shot.length >= p.limit) throw new Error(`${p.name}: ${shot.length} bytes, over the ${p.limit} byte limit in every format`);
    for (const s of p.shots) rmSync(new URL(`${p.name}.${s.type === 'png' ? 'png' : 'jpg'}`, out), { force: true });
    const file = new URL(`${p.name}.${ext}`, out);
    writeFileSync(file, shot);
    await page.close();
    const bytes = readFileSync(file);
    const [w, h] = size(bytes);
    if (w !== p.width || h !== p.height) throw new Error(`${p.name}.${ext} is ${w}x${h}, expected ${p.width}x${p.height}`);
    const over = p.target && bytes.length > p.target ? `, over the ${Math.round(p.target / 1000)} KB target` : '';
    console.log(`assets/${p.name}.${ext} ${w}x${h} ${Math.round(bytes.length / 1000)} KB (${bytes.length} bytes)${over}`);
  }
  console.log('README pictures written, 0 page errors, 0 console errors');
} finally {
  await browser.close();
}
