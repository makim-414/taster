// Drives the gallery in a real browser at three widths and fails on any broken step: search, filter, pick, board, brand
// color reaching a live component, width switch, the text for the agent, no sideways scroll, no page error.
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
const stageFrame = async (page, id) => {
  const handle = await page.waitForSelector(`iframe[src*="only=${encodeURIComponent(id)}"]`, { timeout: 15000 });
  const frame = await handle.contentFrame();
  await frame.waitForSelector(`[data-registry-id="${id}"]`, { timeout: 15000 });
  return frame;
};

try {
  for (const [name, width, height, touch] of [['phone', 390, 844, true], ['tablet', 768, 1024, true], ['desktop', 1440, 900, false]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
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

    await page.fill('input[type=search]', 'hero');
    const found = await page.locator('.card').count();
    ok(found > 0 && found < total, `${name}: search narrows to ${found}`);
    ok(await page.locator('.card h3', { hasText: 'Banner hero' }).count() === 1, `${name}: search finds Banner hero`);
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
    ok(text.includes('2번 blocks/card') && text.includes('#e4002b'), `${name}: agent text names the pick and brand`);
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
