import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { BLOCK_RE, NotDiagnosedError, classifyLoad } from '../blocked.mjs';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const article = 'A long page of the site itself, with its own words in it. '.repeat(40);

test('classifyLoad: bot checks, block pages, HTTP errors and sign-in on another host are not the site', async () => {
  const site = 'https://shop.example.test/';
  const check = (load) => classifyLoad({ requestedUrl: site, finalUrl: site, title: '', text: article, challenge: false, password: false, ...load });

  assert.equal((await check({ status: 200, title: 'Shop' })).diagnosed, true);
  const cf = await check({ status: 403, headers: { 'cf-mitigated': 'challenge' }, title: 'Just a moment...', text: 'Verifying you are human.' });
  assert.deepEqual([cf.diagnosed, cf.reason, cf.status, cf.title], [false, 'bot-check', 403, 'Just a moment...']);
  assert.match(cf.message, /^not diagnosed: got a bot check page \(HTTP 403, title "Just a moment\.\.\."\) instead of the site at https:\/\/shop\.example\.test\/\. Nothing was measured/);
  assert.equal((await check({ status: 200, text: 'One more step.', challenge: true })).reason, 'bot-check', 'a captcha wall that answers 200');
  assert.equal((await check({ status: 200, title: 'Access denied', text: 'You do not have access.' })).reason, 'block-page');
  assert.equal((await check({ status: 200, text: 'Request blocked. Reference 12' })).reason, 'block-page');
  const missing = await check({ status: 404, title: '404 Not Found', text: '404 Not Found' });
  assert.deepEqual([missing.reason, missing.status], ['http-error', 404]);
  assert.match(missing.message, /got a not found page \(HTTP 404/);
  assert.match((await check({ status: 401 })).message, /got a sign-in or protection page \(HTTP 401\)/);
  assert.match((await check({ status: 503 })).message, /got a server error page \(HTTP 503\)/);
  const login = await check({ status: 200, finalUrl: 'https://login.other.test/sso?next=%2F', title: 'Sign in', password: true });
  assert.deepEqual([login.diagnosed, login.reason, login.finalUrl], [false, 'sign-in', 'https://login.other.test/sso?next=%2F']);
  assert.match(login.message, /at https:\/\/login\.other\.test\/sso\?next=%2F\) instead of the site at https:\/\/shop\.example\.test\//);

  // Negative controls: the site's own pages that only look a little like a wall.
  assert.equal((await check({ status: 200, challenge: true })).diagnosed, true, 'a long page with a captcha in its form');
  assert.equal((await check({ status: 200, title: 'Access denied: a short story', text: article })).diagnosed, true, 'a long page whose title has the words');
  assert.equal((await check({ status: 200, password: true })).diagnosed, true, "the site's own sign-in page");
  assert.equal((await check({ status: 200, finalUrl: 'https://www.shop.example.test/login', password: true })).diagnosed, true, 'www. is the same site');
  // Local files are the builder's own pages: no status, no guessing from their words.
  assert.equal((await classifyLoad({ requestedUrl: 'file:///tmp/blocked.html', title: 'Access denied', text: 'captcha' })).diagnosed, true);
  assert.ok(BLOCK_RE.test('Attention Required! | Cloud service'));
});

// The fixtures served the way a real server answers them, on 127.0.0.1; /account sends the browser to localhost.
async function serve() {
  const clean = readFileSync(new URL('../../rules/fixtures/clean.html', import.meta.url), 'utf8');
  let port;
  const server = createServer((req, res) => {
    const html = (code, body, headers = {}) => res.writeHead(code, { 'content-type': 'text/html; charset=utf-8', ...headers }).end(body);
    const path = new URL(req.url, 'http://x').pathname;
    if (path === '/challenge') return html(403, fixture('load-403-challenge.html'), { 'cf-mitigated': 'challenge' });
    if (path === '/missing') return html(404, fixture('load-404.html'));
    if (path === '/down') return html(503, fixture('load-503.html'));
    if (path === '/captcha') return html(200, fixture('load-captcha.html'));
    if (path === '/account') return res.writeHead(302, { location: `http://localhost:${port}/login?next=%2Faccount` }).end();
    if (path === '/login') return html(200, fixture('load-redirect-login.html'));
    if (path === '/hop') return res.writeHead(302, { location: '/clean' }).end();
    if (path === '/clean') return html(200, clean);
    html(404, '');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
  return { base: `http://127.0.0.1:${port}`, close: () => server.close() };
}

test('diagnose: a block, error or sign-in page is reported as not diagnosed, with no findings', { timeout: 180000 }, async () => {
  const { diagnose, formatText } = await import('../diagnose.mjs');
  const srv = await serve();
  try {
    const one = { viewports: [{ width: 1440, height: 900 }] };
    for (const [path, reason, status] of [['/challenge', 'bot-check', 403], ['/missing', 'http-error', 404], ['/down', 'http-error', 503], ['/captcha', 'bot-check', 200], ['/account', 'sign-in', 200]]) {
      const report = await diagnose(`${srv.base}${path}`, one);
      assert.equal(report.diagnosed, false, path);
      assert.deepEqual([report.notDiagnosed.reason, report.status, report.rulesHit, report.rules.length, report.screenshots.length], [reason, status, 0, 0, 0], path);
      assert.equal(formatText(report), report.notDiagnosed.message, path);
    }
    // The sign-in page is named where the browser ended up, the report stays filed under the address asked for.
    const login = await diagnose(`${srv.base}/account`, one);
    assert.equal(login.url, `${srv.base}/account`);
    assert.match(login.finalUrl, /^http:\/\/localhost:\d+\/login\?next=%2Faccount$/);
    assert.equal(login.redirected, true);

    // Both widths of a block page: it is opened once, not again at the next width.
    assert.deepEqual((await diagnose(`${srv.base}/challenge`)).widths, [1440]);

    const clean = await diagnose(`${srv.base}/clean`);
    assert.deepEqual([clean.diagnosed, clean.status, clean.redirected, clean.rulesHit, clean.widths], [true, 200, false, 0, [1440, 390]]);
    const hop = await diagnose(`${srv.base}/hop`, one);
    assert.deepEqual([hop.diagnosed, hop.redirected, hop.finalUrl], [true, true, `${srv.base}/clean`]);
    assert.equal(formatText(hop).split('\n')[0], `${srv.base}/hop (redirected to ${srv.base}/clean)`);
  } finally {
    srv.close();
  }
});

test('extract (rebuild, brand) refuses a bot check page instead of reading it as the site', { timeout: 90000 }, async () => {
  const { extract } = await import('../diagnose.mjs');
  const srv = await serve();
  try {
    await assert.rejects(extract(`${srv.base}/challenge`), (err) => err instanceof NotDiagnosedError && err.notDiagnosed.reason === 'bot-check' && /^not diagnosed: got a bot check page/.test(err.message));
    await assert.rejects(extract(`${srv.base}/missing`), (err) => err instanceof NotDiagnosedError && err.notDiagnosed.status === 404);
    assert.ok((await extract(`${srv.base}/clean`)).sections.length > 0);
  } finally {
    srv.close();
  }
});
