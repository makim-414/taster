// Drives the tone page in a real browser at three widths and fails on any broken step: the nearest four for a spot,
// the pad by keyboard, by pointer or touch and on a dot, the genre filter, the tone tokens reaching a live part, the
// address following the spot, the text for the agent, no sideways scroll, no page error. The capture route is answered
// locally (one picture, one block page), so no outside site is opened.
// Usage: node scripts/check-tone.mjs [base url]   (default http://localhost:3240)
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { axesToTokens, nearestRefs, toneAxes } from '../../engine/tone.mjs';

const BASE = process.argv[2] || 'http://localhost:3240';
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = new URL('../shots/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const catalog = JSON.parse(readFileSync(new URL('../../taxonomy/tone-refs.json', import.meta.url), 'utf8'));
const geek = new Set(catalog.refs.filter((r) => r.genres.includes('geek')).map((r) => r.name));
const picture = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800"><rect width="1280" height="800" fill="#d9d9d6"/></svg>')}`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (existsSync(MAC_CHROME) ? MAC_CHROME : undefined) });
let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`);
  if (!cond) failures++;
};
const noScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const cardNames = (page) => page.$$eval('.ref-card h3', (hs) => hs.map((h) => h.textContent.replace(/^\d+\s*/, '').trim()));
const readout = (page) => page.$eval('.tone-readout', (p) => p.textContent);
const waitFor = async (fn, ms = 8000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
};
// The radius a part inside its stage frame really reads.
async function frameToken(page, id, name) {
  const handle = await page.waitForSelector(`iframe[src*="only=${encodeURIComponent(id)}"]`, { timeout: 15000 });
  const frame = await handle.contentFrame();
  await frame.waitForSelector(`[data-registry-id="${id}"]`, { timeout: 15000 });
  return frame.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
}

try {
  for (const [name, width, height, touch] of [['phone', 390, 844, true], ['tablet', 768, 1024, true], ['desktop', 1280, 900, false]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // The capture route answers by id: the second nearest site is a block page, the third has a banner with no reject
    // button, the rest are pictures.
    const expectedRefs = nearestRefs(catalog, { x: 0.8, y: 0.18 });
    const answer = { [expectedRefs[1].id]: { status: 'blocked' }, [expectedRefs[2].id]: { status: 'consent' } };
    const asked = [];
    await page.route('**/api/tone-shot', async (route) => {
      const ids = JSON.parse(route.request().postData() || '{}').ids || [];
      asked.push(ids);
      await route.fulfill({ json: { shots: Object.fromEntries(ids.map((id) => [id, answer[id] || { status: 'ok', image: picture }])) } });
    });

    // A shared address puts the spot on Kinfolk: it comes first, with three more.
    const res = await page.goto(`${BASE}/tone?x=0.8&y=0.18&theme=light`, { waitUntil: 'networkidle' });
    ok(res.status() === 200, `${name}: tone page opens`);
    ok(await waitFor(async () => (await page.locator('.ref-card').count()) === 4), `${name}: four nearest references`);
    const first = await cardNames(page);
    const expected = expectedRefs.map((r) => r.name);
    ok(first.join('|') === expected.join('|'), `${name}: nearest four in order (${first.join(', ')})`);
    // Sites open only for cards on screen: nothing is asked for a card below the fold until it scrolls in.
    const below = await page.$$eval('.ref-card', (cards) => cards.filter((c) => c.getBoundingClientRect().top > innerHeight + 160).length);
    await page.waitForTimeout(900);
    const askedEarly = new Set(asked.flat());
    ok(askedEarly.size <= 4 - below, `${name}: no site opens for a card off screen (${below} below the fold, ${askedEarly.size} asked)`);
    for (const card of await page.locator('.ref-card').all()) await card.scrollIntoViewIfNeeded();
    ok(await waitFor(async () => new Set(asked.flat()).size === 4), `${name}: each card's site is asked for once it is on screen`);
    ok(asked.flat().length === 4, `${name}: no site is asked for twice (${asked.flat().length} asks)`);
    ok(await waitFor(async () => (await page.locator('.ref-shot img').count()) === 2), `${name}: first screens show in the cards`);
    ok((await page.locator('.ref-shot-note', { hasText: '봇 확인' }).count()) === 1, `${name}: a block page shows as a link only`);
    ok((await page.locator('.ref-shot-note', { hasText: '쿠키 창' }).count()) === 1, `${name}: a banner with no reject button shows as a link only`);
    await page.evaluate(() => scrollTo(0, 0));
    ok((await page.locator('.ref-links a').first().getAttribute('href')) === catalog.refs.find((r) => r.name === first[0]).url, `${name}: the card links to the site`);

    // The parts wear the tokens of the spot, then follow it when it moves.
    const want = (spot, genre) => axesToTokens(toneAxes(spot, genre), { theme: 'light' })['--radius'];
    ok((await frameToken(page, 'marketing/pricing-cards', '--radius')) === want({ x: 0.8, y: 0.18 }), `${name}: the live part wears the spot's radius (${want({ x: 0.8, y: 0.18 })})`);

    // Keyboard: ten steps up raise expression by 20.
    await page.focus('.pad');
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowUp');
    ok((await readout(page)).includes('화려 38'), `${name}: arrow keys move the spot (${await readout(page)})`);
    ok(await waitFor(async () => new URL(page.url()).searchParams.get('y') === '0.38'), `${name}: the address follows the spot`);

    // Pointer or touch near the top left corner: a launch and promotion spot, and the part follows.
    const box = await page.locator('.pad').boundingBox();
    const at = { x: box.x + 14 + 0.1 * (box.width - 28), y: box.y + 14 + 0.06 * (box.height - 28) };
    if (touch) await page.touchscreen.tap(at.x, at.y);
    else await page.mouse.click(at.x, at.y);
    ok(await waitFor(async () => (await readout(page)).includes('출시·프로모션')), `${name}: ${touch ? 'a tap' : 'a click'} on the pad moves the spot (${await readout(page)})`);
    const [mx, my] = (await readout(page)).match(/\d+/g).map((n) => Number(n) / 100);
    ok(await waitFor(async () => (await frameToken(page, 'marketing/pricing-cards', '--radius')) === want({ x: mx, y: my })), `${name}: the live part follows the spot (${want({ x: mx, y: my })})`);

    // A press on a dot lands on that site.
    const govuk = catalog.refs.find((r) => r.id === 'govuk');
    await page.mouse.click(box.x + 14 + govuk.x * (box.width - 28), box.y + 14 + (1 - govuk.y) * (box.height - 28));
    ok(await waitFor(async () => (await cardNames(page))[0] === 'GOV.UK'), `${name}: a press on a dot lands on that site`);

    // The genre narrows the references.
    ok((await page.locator('.tone-genres button').count()) === catalog.genres.length + 1, `${name}: every genre can be picked`);
    await page.click('.tone-genres button:has-text("긱·개발자")');
    ok(await waitFor(async () => (await cardNames(page)).every((n) => geek.has(n))), `${name}: the genre keeps its own references (${(await cardNames(page)).join(', ')})`);
    ok(await waitFor(async () => new URL(page.url()).searchParams.get('genre') === 'geek'), `${name}: the address keeps the genre`);

    // The words for the agent name the spot, the references and the link.
    const message = await page.$eval('.send-text', (p) => p.textContent);
    ok(/톤 지도에서 브랜드 개성 \d+, 화려 \d+/.test(message) && message.includes('/tone?x=') && message.includes('결 긱·개발자'), `${name}: the text for the agent`);

    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
    ok(await noScroll(page), `${name}: no sideways scroll`);
    await page.screenshot({ path: new URL(`tone-${name}.png`, OUT).pathname, fullPage: true });
    ok(errors.length === 0, `${name}: no page error${errors.length ? ` (${errors[0]})` : ''}`);
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(failures ? `TONE_FAIL (${failures})` : 'TONE_OK');
process.exit(failures ? 1 : 0);
