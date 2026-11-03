// Drives the gallery in a real browser at three widths and fails on any broken step: search, filter, pick, board, brand
// color reaching a live component, width switch, the text for the agent, no sideways scroll, no page error. It also
// measures the focus ring (3:1 on the page, drawn on every side of a segment button), the heading order, and that a
// gallery with every card running downloads the stage document once and pauses the frames out of sight.
// Usage: node scripts/check-gallery.mjs [base url]   (default http://localhost:3240)
import { existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://localhost:3240';
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = new URL('../shots/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (existsSync(MAC_CHROME) ? MAC_CHROME : undefined) });
let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`);
  if (!cond) failures++;
};
const noScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

// The color a button inside a stage frame really paints with.
async function brandInFrame(frame) {
  return frame.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.color = 'var(--brand)';
    document.body.appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
}
// WCAG contrast of two CSS colors, read back as sRGB through a canvas so oklch and lab values compare too.
const contrastOf = (page, a, b) => page.evaluate(([x, y]) => {
  const rgb = (color) => {
    const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
  };
  const lum = (c) => c.map((v) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [hi, lo] = [lum(rgb(x)), lum(rgb(y))].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}, [a, b]);

// Keyboard focus on the first match: the ring's contrast with the page, and which sides of the box it really paints
// (a parent with overflow: hidden clips it). Compares the pixels around the box without and with focus.
async function focusRing(page, selector) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.activeElement?.blur());
  const box = await el.boundingBox();
  const pad = 5;
  const clip = { x: Math.floor(box.x) - pad, y: Math.floor(box.y) - pad, width: Math.ceil(box.width) + pad * 2, height: Math.ceil(box.height) + pad * 2 };
  const before = await page.screenshot({ clip });
  await el.focus();
  await page.keyboard.press('Shift'); // a key press, so the browser treats the focus as keyboard focus
  const visible = await el.evaluate((n) => n.matches(':focus-visible'));
  const after = await page.screenshot({ clip });
  const { color } = await el.evaluate((n) => ({ color: getComputedStyle(n).outlineColor }));
  const ratio = await contrastOf(page, color, await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  const sides = await page.evaluate(async ([a, b, pad]) => {
    const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = `data:image/png;base64,${src}`; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const ctx = Object.assign(document.createElement('canvas'), { width: ia.width, height: ia.height }).getContext('2d');
    ctx.drawImage(ia, 0, 0);
    const da = ctx.getImageData(0, 0, ia.width, ia.height).data;
    ctx.drawImage(ib, 0, 0);
    const db = ctx.getImageData(0, 0, ia.width, ia.height).data;
    const seen = { top: 0, bottom: 0, left: 0, right: 0 };
    for (let y = 0; y < ia.height; y++) {
      for (let x = 0; x < ia.width; x++) {
        const i = (y * ia.width + x) * 4;
        if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) < 30) continue;
        if (y < pad) seen.top++;
        else if (y >= ia.height - pad) seen.bottom++;
        else if (x < pad) seen.left++;
        else if (x >= ia.width - pad) seen.right++;
      }
    }
    return seen;
  }, [before.toString('base64'), after.toString('base64'), pad]);
  await page.evaluate(() => document.activeElement?.blur());
  return { visible, ratio, sides, every: Object.values(sides).every((n) => n > 0) };
}

const stageFrame = async (page, id) => {
  const handle = await page.waitForSelector(`iframe[src*="only=${encodeURIComponent(id)}"]`, { timeout: 15000 });
  const frame = await handle.contentFrame();
  await frame.waitForSelector(`[data-registry-id="${id}"]`, { timeout: 15000 });
  return frame;
};

try {
  // The agent text follows the browser language, so one width runs in a Korean browser and the others in English.
  for (const [name, width, height, touch, locale] of [['phone', 390, 844, true, 'ko-KR'], ['tablet', 768, 1024, true, 'en-US'], ['desktop', 1440, 900, false, 'en-US']]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1, locale });
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // Gallery: every card, then search and filter narrow it down.
    const res = await page.goto(`${BASE}/components`, { waitUntil: 'networkidle' });
    ok(res.status() === 200, `${name}: gallery opens`);
    const total = await page.locator('.card').count();
    ok(total >= 60, `${name}: shows every component (${total})`);
    ok(await noScroll(page), `${name}: gallery has no sideways scroll`);
    const broken = await page.evaluate(async () => {
      const imgs = [...document.querySelectorAll('.card img')].slice(0, 12);
      imgs.forEach((img) => { img.loading = 'eager'; });
      await Promise.all(imgs.map((img) => img.decode().catch(() => {})));
      return imgs.filter((img) => !img.naturalWidth).length;
    });
    ok(broken === 0, `${name}: preview pictures load`);
    await page.screenshot({ path: new URL(`gallery-${name}.png`, OUT).pathname });
    const skipped = await page.evaluate(() => {
      const levels = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1]));
      return levels.filter((level, i) => i > 0 && level - levels[i - 1] > 1).length;
    });
    ok(skipped === 0, `${name}: gallery headings do not skip a level`);
    for (const selector of ['.seg-item:first-child', '.seg-item:last-child', '.site-nav a', 'input[type=search]', '.pick']) {
      const ring = await focusRing(page, selector);
      ok(ring.visible && ring.ratio >= 3, `${name}: focus ring on ${selector} is 3:1 or more (${ring.ratio.toFixed(2)})`);
      if (selector.startsWith('.seg-item')) ok(ring.every, `${name}: focus ring on ${selector} shows on every side ${JSON.stringify(ring.sides)}`);
    }

    await page.fill('input[type=search]', 'hero');
    const found = await page.locator('.card').count();
    ok(found > 0 && found < total, `${name}: search narrows to ${found}`);
    ok(await page.locator('.card h2', { hasText: 'Banner hero' }).count() === 1, `${name}: search finds Banner hero`);
    await page.fill('input[type=search]', 'zzzznothing');
    ok(await page.locator('.empty').count() === 1, `${name}: empty search says so`);
    await page.fill('input[type=search]', '');
    if (width < 640) await page.selectOption('.family-select select', { label: 'Data display' });
    else await page.locator('.chip', { hasText: 'Data display' }).click();
    const data = await page.locator('.card').count();
    ok(data > 0 && data < total, `${name}: family filter narrows to ${data}`);
    if (width < 640) await page.selectOption('.family-select select', 'all');
    else await page.locator('.chip', { hasText: '전체' }).click();
    if (width < 640) {
      const first = await page.locator('.card').first().boundingBox();
      ok(first.y < height, `${name}: the first card is on the first screen (${Math.round(first.y)})`);
    }

    // Pick three; the tray appears and leads to the board.
    for (const label of ['Button 담기', 'Card 담기', 'Banner hero 담기']) await page.getByRole('button', { name: label, exact: true }).click();
    ok((await page.locator('.tray p').innerText()).startsWith('3개'), `${name}: tray counts three picks`);
    await page.locator('.tray a').click();
    await page.waitForURL(/\/board/);
    await page.waitForSelector('.slot iframe');
    ok(await page.locator('.slot').count() === 3, `${name}: board has the three picks`);
    ok(page.url().includes('blocks/button') || page.url().includes('blocks%2Fbutton'), `${name}: board address carries the picks`);

    // Brand color reaches a live component without a reload, and the frame keeps running.
    const frame = await stageFrame(page, 'blocks/button');
    await page.fill('.color-field input[type=text]', '#e4002b');
    await page.waitForFunction(() => location.search.includes('brand=e4002b'));
    await page.waitForTimeout(300);
    const color = await brandInFrame(frame);
    ok(color === 'rgb(228, 0, 43)', `${name}: brand reaches the live frame (${color})`);
    const banner = await stageFrame(page, 'blocks/banner-hero');
    const solid = await banner.evaluate(() => getComputedStyle(document.querySelector('.ds-bhero button')).backgroundColor);
    ok(solid === 'rgb(228, 0, 43)', `${name}: brand reaches a nested dark scope (${solid})`);
    ok((await frame.evaluate(() => document.documentElement.dataset.theme)) === 'dark', `${name}: dark theme applied`);
    await page.getByRole('button', { name: '밝게' }).click();
    await page.waitForTimeout(200);
    ok((await frame.evaluate(() => document.documentElement.dataset.theme)) === 'light', `${name}: theme switch reaches the frame`);
    const lightSolid = await frame.evaluate(() => getComputedStyle(document.querySelector('[data-registry-id] button')).backgroundColor);
    ok(lightSolid === 'rgb(228, 0, 43)', `${name}: brand beats the light theme on a real button (${lightSolid})`);
    ok(await noScroll(page), `${name}: board has no sideways scroll`);

    // Choosing writes the text for the agent.
    await page.getByRole('button', { name: /2번 Card 고르기/ }).click();
    const text = await page.locator('.send-text').innerText();
    const korean = locale.startsWith('ko');
    ok(text.includes(korean ? '2번 blocks/card' : 'I picked #2 blocks/card') && text.includes('#e4002b'), `${name}: agent text names the pick and brand in ${locale} (${text})`);
    ok((await page.locator('.send-text').getAttribute('lang')) === (korean ? null : 'en'), `${name}: agent text carries its language`);
    await page.screenshot({ path: new URL(`board-${name}.png`, OUT).pathname, fullPage: true });

    // A shared link rebuilds the same board on a clean browser.
    const shared = page.url();
    const fresh = await browser.newContext({ viewport: { width, height } });
    const other = await fresh.newPage();
    await other.goto(shared);
    await other.waitForSelector('.slot iframe');
    ok(await other.locator('.slot').count() === 3, `${name}: shared board link shows the same three`);
    await fresh.close();

    // Detail: a real click inside the component works, the width switch narrows the stage, and the install line is there.
    await page.goto(`${BASE}/components/blocks/toggle`, { waitUntil: 'networkidle' });
    const live = await stageFrame(page, 'blocks/toggle');
    const box = live.locator('input[type=checkbox], [role=switch], [role=checkbox]').first();
    const before = await box.evaluate((el) => el.checked ?? el.getAttribute('aria-checked'));
    await box.click({ force: true });
    ok(before !== (await box.evaluate((el) => el.checked ?? el.getAttribute('aria-checked'))), `${name}: the live component responds to a click`);
    if (width > 500) {
      await page.getByRole('button', { name: '휴대폰' }).click();
      await page.waitForTimeout(400);
      const stage = await page.locator('.stage-inner').boundingBox();
      ok(Math.abs(stage.width - 390) < 2, `${name}: phone width narrows the stage (${Math.round(stage.width)})`);
    }
    ok((await page.locator('.code-line code').innerText()).includes('add blocks/toggle'), `${name}: install line names the component`);
    ok(await noScroll(page), `${name}: detail has no sideways scroll`);
    await page.locator('.source summary').click();
    ok((await page.locator('.source code').innerText()).includes('export'), `${name}: source opens`);
    ok(await noScroll(page), `${name}: open source has no sideways scroll`);
    await page.screenshot({ path: new URL(`detail-${name}.png`, OUT).pathname });

    ok(errors.length === 0, `${name}: no page errors ${errors.join(' | ')}`);
    await context.close();
  }

  // Every card running: the frames share one stage address, so the document body comes over the network once (the
  // browser still revalidates it per frame, a 304 with no body, while the site serves it with max-age=0). A frame that
  // leaves the view is paused and kept; half a screen further away it is removed, so a long scroll keeps few frames.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    const stage = new Map();
    cdp.on('Network.requestWillBeSent', (e) => { if (new URL(e.request.url).pathname === '/stage/index.html') stage.set(e.requestId, { url: e.request.url, status: 0 }); });
    // The status that came over the wire: 200 with the body, or 304 for a revalidation.
    cdp.on('Network.responseReceivedExtraInfo', (e) => { if (stage.has(e.requestId)) stage.get(e.requestId).status = e.statusCode; });
    await page.goto(`${BASE}/components`, { waitUntil: 'networkidle' });
    await page.locator('.check-field input').check();
    const firstId = (await page.locator('.card h2 a').first().getAttribute('href')).replace('/components/', '');
    let firstFrame = await stageFrame(page, firstId);
    // A paused stage holds animation frames itself and hands back a negative id; a running one asks the browser.
    const held = (frame) => frame.evaluate(() => { const id = requestAnimationFrame(() => {}); cancelAnimationFrame(id); return id < 0; });
    const ticks = (frame) => frame.evaluate(() => new Promise((done) => {
      let n = 0;
      const tick = () => { n++; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      setTimeout(() => done(n), 600);
    }));
    ok(!(await held(firstFrame)), 'a card frame in sight runs');
    // Just out of sight: the first card's bottom edge 300px above the screen.
    await page.evaluate(() => { const r = document.querySelector('.card').getBoundingClientRect(); scrollTo(0, scrollY + r.bottom + 300); });
    await page.waitForTimeout(800);
    ok(await held(firstFrame), 'a card frame just out of sight is paused and kept');
    for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(250); }
    await page.waitForTimeout(800);
    const kept = await page.locator('.card iframe').count();
    ok(kept > 0 && kept <= 30, `a long scroll keeps only the frames near the view (${kept})`);
    for (let i = 0; i < 20; i++) { await page.mouse.wheel(0, -900); await page.waitForTimeout(150); }
    await page.waitForTimeout(800);
    firstFrame = await stageFrame(page, firstId);
    const ticksBack = await ticks(firstFrame);
    ok(!(await held(firstFrame)) && ticksBack > 5, `the first card runs again when it comes back (${ticksBack} animation frames)`);
    const list = [...stage.values()];
    const urls = new Set(list.map((r) => r.url));
    const bodies = list.filter((r) => r.status === 200).length;
    ok(urls.size === 1, `every card frame asks for one stage address (${urls.size})`);
    ok(bodies === 1, `the stage document body downloads once with every card running (${bodies} downloads, ${list.filter((r) => r.status === 304).length} revalidations)`);
    ok(errors.length === 0, `every card running: no page errors ${errors.join(' | ')}`);
    await context.close();
  }

  // Every stage page answers on the site itself, framed by the same origin only.
  const res = await fetch(`${BASE}/stage/index.html`);
  ok(res.headers.get('x-frame-options') === 'SAMEORIGIN', 'stage can be framed by this site only');
  const home = await fetch(`${BASE}/`);
  ok(home.headers.get('x-frame-options') === 'DENY', 'other pages still refuse frames');
} finally {
  await browser.close();
}
console.log(failures ? `GALLERY_FAIL (${failures})` : 'GALLERY_OK');
process.exit(failures ? 1 : 0);
