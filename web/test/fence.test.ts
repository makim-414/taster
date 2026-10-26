// Runs the real server path (engine/diagnose.mjs through the fenced browser) against local
// servers. The fixture server is on loopback, so these tests pass the test-only allowLoopback
// flag; private ranges stay blocked even then, which is what the redirect cases check.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

import { fencePage, launchBrowser, type Budget } from '../lib/browser.ts';
import { loadEngine, runDiagnosis } from '../lib/diagnose.ts';

const FIXTURES = path.resolve(import.meta.dirname, '../../rules/fixtures');


function serve(): Promise<{ base: string; close: () => void }> {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://x');
    if (url.pathname === '/to-metadata') return res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data/' }).end();
    if (url.pathname === '/to-private') return res.writeHead(301, { location: 'http://10.0.0.1/' }).end();
    if (url.pathname === '/to-private-name') return res.writeHead(302, { location: 'http://10.0.0.1.nip.io/' }).end();
    if (url.pathname === '/hop') return res.writeHead(302, { location: '/fixtures/clean.html' }).end();
    if (url.pathname === '/subresource-private') {
      return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><html lang="en"><body><img src="http://169.254.169.254/x.png"><p>hi</p></body></html>');
    }
    if (url.pathname.startsWith('/fixtures/')) {
      try {
        const body = await readFile(path.join(FIXTURES, path.basename(url.pathname)));
        return res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(body);
      } catch {
        return res.writeHead(404).end();
      }
    }
    res.writeHead(404).end();
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, close: () => server.close() })));
}

// Ports outside the allow list (80, 443, 8080, 8443) are refused even in tests, so the local
// server is reached through a small forwarder on 8080.
async function serveOn8080(): Promise<{ base: string; close: () => void } | null> {
  const inner = await serve();
  const port = Number(new URL(inner.base).port);
  const proxy = http.createServer((req, res) => {
    const up = http.request({ host: '127.0.0.1', port, path: req.url, method: req.method, headers: req.headers }, (r) => {
      res.writeHead(r.statusCode || 502, r.headers);
      r.pipe(res);
    });
    up.on('error', () => res.writeHead(502).end());
    req.pipe(up);
  });
  return new Promise((resolve) => {
    proxy.once('error', () => {
      inner.close();
      resolve(null);
    });
    proxy.listen(8080, '127.0.0.1', () => resolve({ base: 'http://127.0.0.1:8080', close: () => (proxy.close(), inner.close()) }));
  });
}

test('fence: redirects into private space and private subresources are blocked', async (t) => {
  const srv = await serveOn8080();
  if (!srv) return t.skip('port 8080 is busy');
  const browser = await launchBrowser();
  try {
    for (const hop of ['/to-metadata', '/to-private', '/to-private-name']) {
      const page = await browser.newPage();
      const budget: Budget = { requests: 0, bytes: 0, blocked: null, allowLoopback: true };
      await fencePage(page, budget);
      await assert.rejects(page.goto(`${srv.base}${hop}`, { timeout: 15000 }), hop);
      assert.ok(budget.blocked, `${hop} should be blocked by the guard, got ${budget.blocked}`);
      await page.close();
    }
    // A same-site redirect is followed and lands on the fixture.
    const page = await browser.newPage();
    const budget: Budget = { requests: 0, bytes: 0, blocked: null, allowLoopback: true };
    await fencePage(page, budget);
    const res = await page.goto(`${srv.base}/hop`, { timeout: 15000 });
    assert.equal(new URL(page.url()).pathname, '/fixtures/clean.html');
    assert.equal(res?.status(), 200);
    // An image pointing at the metadata address fails instead of loading.
    const failed: string[] = [];
    page.on('requestfailed', (r) => failed.push(r.url()));
    await page.goto(`${srv.base}/subresource-private`, { timeout: 15000 });
    assert.ok(failed.some((u) => u.startsWith('http://169.254.169.254/')), `metadata image should fail, failed=${failed.join(',')}`);
    await page.close();
  } finally {
    await browser.close();
    srv.close();
  }

});

test('fence: the browser has no direct network route (dead proxy)', async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await assert.rejects(page.goto('http://example.com/', { timeout: 10000 }));
    await page.close();
  } finally {
    await browser.close();
  }
});

test('engine through the fence: slop.html is hit, clean.html has zero findings', async (t) => {
  const srv = await serveOn8080();
  if (!srv) return t.skip('port 8080 is busy');
  try {
    const engine = await loadEngine();
    assert.equal(typeof engine.detectOnce, 'function');
    const slop = await runDiagnosis(`${srv.base}/fixtures/slop.html`, { allowLoopback: true });
    assert.ok(slop.report.rulesHit >= 15, `slop.html hit only ${slop.report.rulesHit} rules`);
    assert.ok(slop.shots['1440']?.startsWith('data:image/jpeg;base64,'), 'missing 1440 capture');
    assert.ok(slop.shots['390']?.startsWith('data:image/jpeg;base64,'), 'missing 390 capture');
    const clean = await runDiagnosis(`${srv.base}/fixtures/clean.html`, { allowLoopback: true });
    assert.equal(clean.report.rulesHit, 0, `clean.html hit ${clean.report.rules.map((r) => r.ruleId).join(' ')}`);
    console.log(`slop.html: ${slop.report.rulesHit} rules, ${slop.report.findings} places; clean.html: ${clean.report.rulesHit}`);
  } finally {
    srv.close();
  }
});


