// Checks what a visitor, a crawler and a link preview get from the running site: every page names its own address and
// preview, the 404 screen is the site's own (zero findings, one noindex), /robots.txt and /sitemap.xml answer, the
// security headers are on, no page or stage frame trips the content security policy, and the bookmarklet's pinned
// overlay still loads into a page on another origin. The API routes are answered locally, so no outside site opens.
// test/metadata.test.ts checks the same headers in next.config.mjs without a server.
// Usage: node scripts/check-metadata.mjs [base url]   (default http://localhost:3240)
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://localhost:3240';
const ROOT = new URL('../../../', import.meta.url);
const DETECT = readFileSync(new URL('rules/detect.js', ROOT), 'utf8');
const IDS = JSON.parse(readFileSync(new URL('registry/registry.json', ROOT), 'utf8')).components.map((c) => c.id);

let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`);
  if (!cond) failures++;
};
const picture = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800"><rect width="1280" height="800" fill="#d9d9d6"/></svg>')}`;
// Each frame writes down the policy violations it sees; Chrome's console line about them is the second witness.
const RECORD = "addEventListener('securitypolicyviolation', (e) => { (window.__csp ||= []).push(`${e.violatedDirective} ${e.blockedURI || 'inline'}`); }, true);";

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

// Opens one page with the API answered locally and returns what the policy and the page said while it ran.
async function visit(path, { width = 1280, act } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  const csp = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => /Content Security Policy/i.test(m.text()) && csp.push(m.text()));
  await page.addInitScript(RECORD);
  await page.route('**/api/tone-shot', async (route) => {
    const ids = JSON.parse(route.request().postData() || '{}').ids || [];
    await route.fulfill({ json: { shots: Object.fromEntries(ids.map((id) => [id, { status: 'ok', image: picture }])) } });
  });
  await page.route('**/api/diagnose', (route) =>
    route.fulfill({ json: { report: { url: 'https://example.com/', widths: [1440, 390], measured: 1, rulesHit: 0, findings: 0, rules: [], judgeByEye: [] }, shots: { 1440: picture, 390: picture } } }),
  );
  const res = await page.goto(BASE + path, { waitUntil: 'networkidle' });
  if (act) await act(page);
  await page.waitForTimeout(300);
  for (const frame of page.frames()) csp.push(...(await frame.evaluate(() => window.__csp || []).catch(() => [])));
  return { page, res, errors, csp: [...new Set(csp)] };
}
const head = (page) =>
  page.evaluate(() => ({
    canonical: document.querySelector('link[rel=canonical]')?.href || '',
    ogUrl: document.querySelector('meta[property="og:url"]')?.content || '',
    ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
    twitterTitle: document.querySelector('meta[name="twitter:title"]')?.content || '',
    robots: [...document.querySelectorAll('meta[name=robots]')].map((m) => m.content),
  }));
const pathOf = (url) => (url ? new URL(url).pathname : '');
// Waits until a live component runs in a stage frame on the page, so the frame's own policy is part of the check.
const stageReady = async (page) => {
  const frame = await (await page.waitForSelector('iframe[src*="only="]', { timeout: 15000 })).contentFrame();
  await frame.waitForSelector('[data-registry-id]', { timeout: 15000 });
};

try {
  // Each page: its own canonical address and preview, at most one robots line, no policy violation in it or its frames.
  const pages = [
    ['/', '/', { act: async (page) => {
      await page.fill('#target', 'example.com');
      await page.click('button[type=submit]');
      await page.waitForSelector('.shot img');
    } }],
    ['/components', '/components', { act: async (page) => {
      await page.getByText('전부 움직이게').click();
      await stageReady(page);
    } }],
    // Its stage draws data: pictures, so the frame's own policy is tested on them too.
    ['/components/blocks/banner-hero', '/components/blocks/banner-hero', { act: stageReady }],
    ['/board?ids=blocks/button,blocks/card', '/board', { act: stageReady }],
    ['/bookmarklet', '/bookmarklet', { act: (page) => page.waitForSelector('a.bookmarklet[href^="javascript:"]') }],
    ['/tone?x=0.8&y=0.18', '/tone', { act: async (page) => {
      for (const card of await page.locator('.ref-card').all()) await card.scrollIntoViewIfNeeded();
      await page.waitForSelector('.ref-shot img');
      await stageReady(page);
    } }],
  ];
  const titles = new Map();
  for (const [path, canonical, options] of pages) {
    const { page, res, errors, csp } = await visit(path, options);
    const h = await head(page);
    ok(res.status() === 200, `${path}: answers 200`);
    ok(pathOf(h.canonical) === canonical && pathOf(h.ogUrl) === canonical, `${path}: canonical and og:url are ${canonical} (${pathOf(h.canonical)}, ${pathOf(h.ogUrl)})`);
    ok(h.ogTitle && h.twitterTitle, `${path}: has its own preview title (${h.ogTitle})`);
    titles.set(path, h.ogTitle);
    ok(h.robots.length <= 1, `${path}: one robots line at most (${h.robots.join(' | ') || 'none'})`);
    if (path.startsWith('/board')) ok(h.robots[0]?.includes('noindex'), `${path}: stays out of search`);
    ok(csp.length === 0, `${path}: no content security policy violation ${csp.join(' | ')}`);
    ok(errors.length === 0, `${path}: no page errors ${errors.join(' | ')}`);
    await page.close();
  }
  ok(new Set(titles.values()).size === titles.size, 'no page borrows another page\'s preview title');

  // The 404 screen: the site's own words, type and links, Next's single noindex, and nothing the detector flags.
  for (const width of [1440, 390]) {
    for (const path of ['/does-not-exist', '/components/blocks/does-not-exist']) {
      const { page, res, errors, csp } = await visit(path, { width });
      const h = await head(page);
      ok(res.status() === 404, `${path} at ${width}: answers 404`);
      ok((await page.locator('h1').allInnerTexts()).join('|') === '찾는 페이지가 없습니다', `${path} at ${width}: says the page is not there`);
      const links = await page.$$eval('main a', (as) => as.map((a) => new URL(a.href).pathname));
      ok(links.includes('/') && links.includes('/components'), `${path} at ${width}: links home and to the gallery (${links.join(', ')})`);
      ok(h.robots.length === 1 && h.robots[0].includes('noindex'), `${path} at ${width}: one noindex robots line (${h.robots.join(' | ')})`);
      await page.addScriptTag({ content: DETECT });
      const report = await page.evaluate(() => window.tasterDetect({ maxPerRule: 10 }));
      ok(report.findings.length === 0, `${path} at ${width}: zero findings ${report.findings.map((f) => `${f.ruleId} ${f.selector}`).join(' | ')}`);
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} at ${width}: no sideways scroll`);
      ok(csp.length === 0 && errors.length === 0, `${path} at ${width}: no policy violation or page error ${[...csp, ...errors].join(' | ')}`);
      await page.close();
    }
  }

  // Crawlers: robots keeps them off the API and the board, the sitemap lists every page and every component.
  const robots = await fetch(`${BASE}/robots.txt`);
  const robotsText = await robots.text();
  ok(robots.status === 200 && /Disallow: \/api\//.test(robotsText) && /Disallow: \/board/.test(robotsText) && /Sitemap: \S+\/sitemap\.xml/.test(robotsText), '/robots.txt keeps crawlers off /api/ and /board and names the sitemap');
  const sitemap = await fetch(`${BASE}/sitemap.xml`);
  const locs = new Set([...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname));
  const want = ['/', '/components', '/tone', '/bookmarklet', ...IDS.map((id) => `/components/${id}`)];
  const missing = want.filter((p) => !locs.has(p));
  ok(sitemap.status === 200 && missing.length === 0 && !locs.has('/board'), `/sitemap.xml lists ${locs.size} pages, every component included ${missing.slice(0, 5).join(', ')}`);

  // Headers on a page, a stage frame and the bookmarklet's files.
  const headers = async (path) => (await fetch(BASE + path)).headers;
  const home = await headers('/');
  ok(/frame-ancestors 'none'/.test(home.get('content-security-policy') || '') && home.get('x-frame-options') === 'DENY', 'pages refuse to be framed');
  ok(/camera=\(\)/.test(home.get('permissions-policy') || ''), 'pages turn off camera, microphone, location and topics');
  const stage = await headers('/stage/index.html');
  ok(/frame-ancestors 'self'/.test(stage.get('content-security-policy') || '') && stage.get('x-frame-options') === 'SAMEORIGIN', 'the stage can be framed by this site only');
  const pin = await (await fetch(`${BASE}/taster/bookmarklet.json`)).json();
  const pinned = await headers(`/taster/${pin.version}/overlay.js`);
  ok(/immutable/.test(pinned.get('cache-control') || '') && pinned.get('access-control-allow-origin') === '*', `/taster/${pin.version}/ is cached for good and open to every origin`);
  const legacy = await headers('/taster/overlay.js');
  ok(/max-age=300/.test(legacy.get('cache-control') || '') && !/immutable/.test(legacy.get('cache-control') || '') && legacy.get('access-control-allow-origin') === '*', '/taster/overlay.js keeps a short cache for old bookmarks');

  // The bookmarklet, run on a page from another origin, as a visitor would: the pinned overlay, its sha384 and CORS.
  const { page: bm } = await visit('/bookmarklet', { act: (page) => page.waitForSelector('a.bookmarklet[href^="javascript:"]') });
  const code = (await bm.getAttribute('a.bookmarklet', 'href')).replace(/^javascript:/, '');
  await bm.close();
  const src = code.match(/s\.src='([^']+)'/)[1];
  const local = code.replace(src, BASE + new URL(src).pathname);
  const fixture = readFileSync(new URL('rules/fixtures/slop.html', ROOT));
  const other = http.createServer((req, res) => res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(fixture));
  await new Promise((resolve) => other.listen(0, '127.0.0.1', resolve));
  try {
    const page = await browser.newPage();
    const alerts = [];
    const failed = [];
    page.on('dialog', (d) => { alerts.push(d.message()); d.dismiss(); });
    page.on('requestfailed', (r) => failed.push(r.url()));
    await page.goto(`http://127.0.0.1:${other.address().port}/`);
    await page.evaluate(local);
    // The overlay's shadow host has no box of its own, so it is waited for in the DOM rather than on screen.
    const shown = await page.waitForSelector('#taster-overlay-host', { state: 'attached', timeout: 15000 }).then(() => true, () => false);
    ok(shown && alerts.length === 0 && failed.length === 0, `the bookmarklet's pinned overlay runs on another origin ${[...alerts, ...failed].join(' | ')}`);
    await page.close();
  } finally {
    other.close();
  }
} finally {
  await browser.close();
}
console.log(failures ? `METADATA_FAIL (${failures})` : 'METADATA_OK');
process.exit(failures ? 1 : 0);
