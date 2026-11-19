// Records the /demo agents (diagnose, rebuild, tune, end card) on any before page and after page you can open, as a
// video on your own machine. The site's /demo page runs in a local Chromium with the two pages framed in place of the
// worked rebuild; the overlay measures them the same way (the pinned detector at 1300 and 390 wide, the after page's
// own boxes, lines and tokens). Nothing is uploaded: the two pages load from where they are, straight into this browser.
//
// The two pages usually sit on another origin than the site, so this browser is started with web security off for its
// own session (a frame's DOM is then readable across origins) and the two pages' framing headers are dropped on the
// way in. Use it only on pages you own or may record.
//
// Frames are stepped, not filmed: the demo runs on a manual clock (window.__tasterDemo), and each frame is drawn at
// its own second and captured, 60 per second by default, so none drop however heavy the pages are. The framed pages'
// own clocks follow: their requestAnimationFrame, performance.now and Date.now read the demo's time, and their CSS
// and Web Animations play at the rate frames are captured. While it steps, it checks frames ten times a second: the
// agents drawing have their pointers in the window, the camera never runs past the work, and each outline sits on its
// element. The numbers go to <out>.check.json; --check makes a miss fail the run.
//
// Every run opens on a short arc that tells the whole story in under ten seconds: the first screen of both pages,
// diagnosed all at once, rebuilt, and a before and after beat with the two counts. A full run then plays the page in
// full. --one-screen records only that arc; --pace fast plays the full page quicker after it.
//
// Usage:
//   node apps/web/scripts/demo/record.mjs --before <url> --after <url> --out <file.mp4|file.webm>
//     [--site <url>]        the Taster site that serves /demo (default https://taster-six.vercel.app, or http://localhost:3240)
//     [--width 1280] [--height 800] [--scheme dark|light] [--speed 1|2] [--hold 2.5] [--fps 60]
//     [--one-screen]        only the first screen of both pages, as a short clip
//     [--pace fast]         the full page at about twice the speed, with the clip's opening and closing beat
//     [--no-intro]          start on the full page run, without the short arc in front
//     [--check]             exit 1 when a checked frame misses (under 90% of drawing pointers in the window, the camera
//                           past the work, or an outline more than 3 px off its element)
// --out is required and may not be inside this repository, so a recording of a private page is never committed. An
// .mp4 is H.264 (yuv420p) and a .webm VP9, both through ffmpeg.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const USAGE =
  'usage: node apps/web/scripts/demo/record.mjs --before <url> --after <url> --out <file.mp4|file.webm> [--site <url>] [--width 1280] [--height 800] [--scheme dark|light] [--speed 1|2] [--hold 2.5] [--fps 60] [--one-screen] [--pace fast] [--no-intro] [--check]';

export function args(argv) {
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
  console.error(USAGE);
  process.exit(2);
}

/** The frame checks summed over a run: share of drawing pointers in the window by phase, camera misses, outline gaps. */
export function summarize(samples) {
  const by = {};
  let frontierMisses = 0;
  let aligned = 0;
  let worstGap = 0;
  let worst = '';
  let emptySum = 0;
  let emptyMax = 0;
  for (const s of samples) {
    const p = (by[s.phase] ??= { frames: 0, drawing: 0, inside: 0 });
    p.frames++;
    p.drawing += s.drawing;
    p.inside += s.inside;
    if (!s.frontierOk) frontierMisses++;
    aligned += s.aligned;
    if (s.worstGap > worstGap) worst = `${s.t.toFixed(2)}s ${s.worst}`;
    worstGap = Math.max(worstGap, s.worstGap);
    emptySum += s.empty;
    emptyMax = Math.max(emptyMax, s.empty);
  }
  const share = (p) => (p && p.drawing ? Math.round((p.inside / p.drawing) * 1000) / 10 : null);
  const pct = (v) => Math.round(v * 1000) / 10;
  return { inWindow: { diagnose: share(by.diagnose), rebuild: share(by.rebuild) }, frontierMisses, emptyBelowWork: { average: pct(emptySum / Math.max(1, samples.length)), most: pct(emptyMax) }, aligned, worstGap, worst, phases: by };
}

/** Whether a summary passes --check. */
export const passes = (s) => (s.inWindow.diagnose ?? 100) >= 90 && (s.inWindow.rebuild ?? 100) >= 90 && s.frontierMisses === 0 && s.worstGap <= 3;

// Runs inside the site's page: the framed pages read the demo's clock from now on (their animation frames, their
// performance.now and Date.now), so a WebGL scene or a JS animation moves one frame per captured frame.
function slaveClocks() {
  for (const frame of Array.from(document.querySelectorAll('iframe'))) {
    let w;
    try {
      w = frame.contentWindow;
      if (!w || w.__tasterClock) continue;
    } catch {
      continue;
    }
    const perf = w.performance.now.bind(w.performance);
    const date = w.Date.now.bind(w.Date);
    const clock = { base: perf(), dateBase: date(), t: 0 };
    w.__tasterClock = clock;
    w.performance.now = () => clock.base + clock.t * 1000;
    w.Date.now = () => clock.dateBase + clock.t * 1000;
    const raf = w.requestAnimationFrame.bind(w);
    w.requestAnimationFrame = (cb) => raf(() => cb(clock.base + clock.t * 1000));
  }
}

function stepClocks(t) {
  for (const frame of Array.from(document.querySelectorAll('iframe'))) {
    try {
      const c = frame.contentWindow && frame.contentWindow.__tasterClock;
      if (c) c.t = t;
    } catch {
      // a frame this browser cannot reach
    }
  }
}

/** One segment: the demo on a manual clock, stepped and captured frame by frame into ffmpeg. */
async function segment(browser, o, set, file) {
  const context = await browser.newContext({ viewport: { width: o.width, height: o.height }, colorScheme: o.scheme, reducedMotion: 'no-preference', bypassCSP: true });
  try {
    for (const origin of new Set([o.before.origin, o.after.origin])) {
      if (origin === o.site.origin) continue;
      await context.route((u) => u.origin === origin, async (route) => {
        try {
          if (route.request().resourceType() !== 'document') return await route.continue();
          const res = await route.fetch();
          const headers = { ...res.headers() };
          delete headers['x-frame-options'];
          delete headers['content-security-policy'];
          await route.fulfill({ response: res, headers });
        } catch {
          // the context closed while the request was in flight
        }
      });
    }
    if (o.prepare) await o.prepare(context);
    await context.addInitScript((s) => {
      window.__TASTER_DEMO__ = s;
    }, { before: o.before.href, after: o.after.href, record: true, speed: o.speed, clock: 'manual', ...set });
    const page = await context.newPage();
    if (o.onPage) o.onPage(page);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(new URL('/demo', o.site).href, { waitUntil: 'load' });
    await page.waitForSelector('.demo-board:is([data-state="playing"], [data-state="failed"])', { timeout: 90000 });
    if ((await page.getAttribute('.demo-board', 'data-state')) === 'failed') {
      throw new Error('the demo could not measure the two pages (they did not load in a frame, or the detector did not start in them)');
    }
    await page.waitForFunction(() => Boolean(window.__tasterDemo), null, { timeout: 30000 });
    const duration = await page.evaluate(() => window.__tasterDemo.duration);
    const result = (await page.locator('.demo-result').innerText()).trim();
    await page.evaluate(slaveClocks);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Animation.enable');

    const hold = set.hook ? 0.15 : o.hold;
    // A clip opens with the diagnose crew already on its way in, not on the page standing still.
    const from = set.hook ? 0.35 : 0;
    const frames = Math.ceil(((duration - from) / o.speed + hold) * o.fps);
    const webm = /\.webm$/i.test(file);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(o.fps), '-c:v', 'mjpeg', '-i', '-', '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p', ...(webm ? ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '30'] : ['-c:v', 'libx264', '-crf', '18', '-preset', 'medium']), '-r', String(o.fps), file], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((resolve, reject) => ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))));
    const samples = [];
    const phases = {};
    let spent = 0;
    for (let k = 0; k < frames; k++) {
      const t = Math.min(duration, from + (k / o.fps) * o.speed);
      const began = Date.now();
      const check = await page.evaluate(
        ([time, probe]) => {
          window.__tasterDemo.seek(time);
          return probe ? window.__tasterDemo.check(time) : document.querySelector('.demo-board')?.getAttribute('data-phase');
        },
        [t, k % Math.round(o.fps / 10) === 0],
      );
      await page.evaluate(stepClocks, t);
      const phase = typeof check === 'string' ? check : check.phase;
      if (!(phase in phases)) phases[phase] = Math.round((k / o.fps) * 100) / 100;
      if (typeof check === 'object') samples.push({ t, ...check });
      const jpg = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
      // CSS and Web Animations in the frames play at the rate frames are captured, so they keep their speed on video.
      spent += Date.now() - began;
      if (k % 30 === 29) {
        const rate = Math.max(0.02, Math.min(1, 1000 / o.fps / (spent / 30)));
        await cdp.send('Animation.setPlaybackRate', { playbackRate: rate }).catch(() => {});
        spent = 0;
      }
      if (k % (o.fps * 5) === 0) process.stdout.write(`  ${set.screen === 'one' ? 'arc' : 'page'} ${(k / o.fps).toFixed(0)}s / ${(frames / o.fps).toFixed(0)}s\r`);
    }
    ff.stdin.end();
    await done;
    if (errors.length) console.log(`page errors: ${errors.join(' | ')}`);
    return { file, seconds: frames / o.fps, result, phases, summary: summarize(samples), errors };
  } finally {
    await context.close();
  }
}

/** Plays a recording run; returns the checks of each segment. Exported so a local wrapper can add its own steps. */
export async function record(opt, hooks = {}) {
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
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) fail('recording needs ffmpeg on the PATH');
  const o = {
    before,
    after,
    site: new URL(typeof opt.site === 'string' ? opt.site : 'https://taster-six.vercel.app'),
    width: Number(opt.width ?? 1280),
    height: Number(opt.height ?? 800),
    scheme: opt.scheme === 'light' ? 'light' : 'dark',
    speed: Number(opt.speed) === 2 ? 2 : 1,
    hold: Number(opt.hold ?? 2.5),
    fps: Math.max(24, Math.min(60, Number(opt.fps ?? 60))),
    prepare: hooks.prepare,
    onPage: hooks.onPage,
  };
  const one = opt['one-screen'] === true;
  const pace = opt.pace === 'fast' ? 'fast' : 'normal';
  const intro = !one && opt['no-intro'] !== true;

  const tmp = mkdtempSync(path.join(os.tmpdir(), 'taster-record-'));
  const browser = await chromium.launch(hooks.launch ?? { args: ['--disable-web-security', '--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process', '--allow-running-insecure-content'] });
  const ext = path.extname(out);
  const parts = [];
  try {
    if (one || intro) {
      console.log('the arc: first screen, all at once');
      parts.push({ name: 'arc', ...(await segment(browser, o, { screen: 'one', pace: 'fast', hook: true }, path.join(tmp, `arc${ext}`))) });
    }
    if (!one) {
      console.log(`the page: ${pace} pace`);
      parts.push({ name: 'page', ...(await segment(browser, o, { screen: 'page', pace, hook: pace === 'fast' }, path.join(tmp, `page${ext}`))) });
    }
  } finally {
    await browser.close();
  }
  mkdirSync(path.dirname(out), { recursive: true });
  if (parts.length === 1) {
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', parts[0].file, '-c', 'copy', '-movflags', '+faststart', out], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('ffmpeg could not write the video');
  } else {
    const list = path.join(tmp, 'list.txt');
    writeFileSync(list, parts.map((p) => `file '${p.file}'`).join('\n'));
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('ffmpeg could not join the arc and the page run');
  }
  rmSync(tmp, { recursive: true, force: true });
  let offset = 0;
  const report = {
    out,
    fps: o.fps,
    seconds: Math.round(parts.reduce((n, p) => n + p.seconds, 0) * 100) / 100,
    parts: parts.map((p) => {
      const at = offset;
      offset += p.seconds;
      return { name: p.name, startsAt: Math.round(at * 100) / 100, seconds: Math.round(p.seconds * 100) / 100, phases: Object.fromEntries(Object.entries(p.phases).map(([k, v]) => [k, Math.round((v + at) * 100) / 100])), result: p.result, check: p.summary, errors: p.errors };
    }),
  };
  writeFileSync(`${out}.check.json`, JSON.stringify(report, null, 2) + '\n');
  for (const p of report.parts) {
    console.log(`${p.name}: ${p.result}`);
    console.log(`${p.name}: pointers in the window ${JSON.stringify(p.check.inWindow)}, camera past the work ${p.check.frontierMisses}, outlines checked ${p.check.aligned} (worst ${p.check.worstGap} px)`);
  }
  console.log(`wrote ${out} (${report.seconds}s at ${o.fps} fps) and ${out}.check.json`);
  return { report, ok: report.parts.every((p) => passes(p.check) && p.errors.length === 0) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const opt = args(process.argv.slice(2));
  try {
    const { ok } = await record(opt);
    if (opt.check === true && !ok) {
      console.error('a checked frame missed (see the .check.json)');
      process.exit(1);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
