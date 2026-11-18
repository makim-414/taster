// Records the /demo agents (diagnose, rebuild, tune, end card) on any before page and after page you can open, as a
// video on your own machine. The site's /demo page runs in a local Chromium with the two pages framed in place of the
// worked rebuild; the overlay measures them the same way (the pinned detector at 1300 and 390 wide, the after page's
// own boxes, lines and tokens). Nothing is uploaded: the two pages load from where they are, straight into this browser.
//
// The two pages usually sit on another origin than the site, so this browser is started with web security off for its
// own session (a frame's DOM is then readable across origins) and the two pages' framing headers are dropped on the
// way in. Use it only on pages you own or may record.
//
// Usage:
//   node apps/web/scripts/demo/record.mjs --before <url> --after <url> --out <file.mp4|file.webm>
//     [--site <url>]        the Taster site that serves /demo (default https://taster-six.vercel.app, or http://localhost:3240)
//     [--width 1280] [--height 800] [--scheme dark|light] [--speed 1|2] [--hold 2.5]
// --out is required and may not be inside this repository, so a recording of a private page is never committed. An
// .mp4 is H.264 (yuv420p) through ffmpeg; a .webm is trimmed by ffmpeg when it is installed, else saved as recorded.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else out[key] = argv[++i];
  }
  return out;
}

function fail(message) {
  console.error(message);
  console.error('usage: node apps/web/scripts/demo/record.mjs --before <url> --after <url> --out <file.mp4|file.webm> [--site <url>] [--width 1280] [--height 800] [--scheme dark|light] [--speed 1|2] [--hold 2.5]');
  process.exit(2);
}

const opt = args(process.argv.slice(2));
const httpUrl = (name) => {
  const v = opt[name];
  if (typeof v !== 'string') fail(`--${name} is required`);
  let u;
  try {
    u = new URL(v);
  } catch {
    fail(`--${name} is not a URL: ${v}`);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') fail(`--${name} must be http or https`);
  return u;
};
const before = httpUrl('before');
const after = httpUrl('after');
if (typeof opt.out !== 'string') fail('--out is required (a file outside this repository)');
const out = path.resolve(opt.out);
if (out === REPO || out.startsWith(REPO + path.sep)) fail('--out is inside this repository; write the recording somewhere else so it is never committed');
if (!/\.(mp4|webm)$/i.test(out)) fail('--out must end in .mp4 or .webm');
const site = new URL(typeof opt.site === 'string' ? opt.site : 'https://taster-six.vercel.app');
const width = Number(opt.width ?? 1280);
const height = Number(opt.height ?? 800);
const scheme = opt.scheme === 'light' ? 'light' : 'dark';
const speed = Number(opt.speed) === 2 ? 2 : 1;
const hold = Number(opt.hold ?? 2.5);
const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
if (/\.mp4$/i.test(out) && !hasFfmpeg) fail('an .mp4 needs ffmpeg on the PATH; install it or ask for a .webm');

const tmp = mkdtempSync(path.join(os.tmpdir(), 'taster-record-'));
const browser = await chromium.launch({
  args: ['--disable-web-security', '--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process', '--allow-running-insecure-content'],
});
let code = 0;
try {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: scheme,
    reducedMotion: 'no-preference',
    bypassCSP: true,
    recordVideo: { dir: tmp, size: { width, height } },
  });
  // The two pages are framed by the site, so the headers that forbid framing are dropped on their way in.
  for (const origin of new Set([before.origin, after.origin])) {
    if (origin === site.origin) continue;
    await context.route((u) => u.origin === origin, async (route) => {
      if (route.request().resourceType() !== 'document') return route.continue();
      const res = await route.fetch();
      const headers = { ...res.headers() };
      delete headers['x-frame-options'];
      delete headers['content-security-policy'];
      await route.fulfill({ response: res, headers });
    });
  }
  await context.addInitScript((set) => {
    window.__TASTER_DEMO__ = set;
  }, { before: before.href, after: after.href, record: true, speed });

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const started = Date.now();
  await page.goto(new URL('/demo', site).href, { waitUntil: 'load' });
  await page.waitForSelector('.demo-board:is([data-state="playing"], [data-state="failed"])', { timeout: 60000 });
  if ((await page.getAttribute('.demo-board', 'data-state')) === 'failed') {
    throw new Error('the demo could not measure the two pages (they did not load in a frame, or the detector did not start in them)');
  }
  const playAt = (Date.now() - started) / 1000;
  console.log(`measured both pages; recording from ${playAt.toFixed(1)}s`);
  console.log((await page.locator('.demo-result').innerText()).trim());
  await page.waitForSelector('.demo-board[data-state="end"]', { timeout: 180000 });
  await page.waitForTimeout(hold * 1000);
  const video = page.video();
  await context.close();
  const raw = await video.path();
  if (errors.length) console.log(`page errors: ${errors.join(' | ')}`);

  mkdirSync(path.dirname(out), { recursive: true });
  const from = Math.max(0, playAt - 0.4).toFixed(2);
  if (/\.mp4$/i.test(out)) {
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', from, '-i', raw, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', out], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('ffmpeg could not write the mp4');
  } else if (hasFfmpeg) {
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', from, '-i', raw, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '30', out], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('ffmpeg could not write the webm');
  } else {
    copyFileSync(raw, out);
  }
  if (!existsSync(out)) throw new Error(`nothing was written to ${out}`);
  console.log(`wrote ${out}`);
} catch (e) {
  console.error(e.message);
  code = 1;
} finally {
  await browser.close();
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(code);
