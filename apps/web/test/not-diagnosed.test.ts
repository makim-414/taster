// A page that is not the site (a bot check, a block or error page) on the web side. fence.test.ts checks that the
// diagnosis refuses one; this file checks the rest of the way: the brand route refuses it too, the API answers code
// not-diagnosed with the reason and the status, the home says so in words instead of showing that page as the site's
// result, and an address that failed to open leaves only its host in the logs.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { NotDiagnosedError, PageLoadError, hostsOnly, loadFailure, runDiagnosis } from '../lib/diagnose.ts';
import { runBrand } from '../lib/brand.ts';
import { errorText, notDiagnosedText } from '../lib/messages.ts';

const LOAD_FIXTURES = path.resolve(import.meta.dirname, '../../../packages/engine/test/fixtures');

// The fence opens only ports 80, 443, 8080 and 8443, and fence.test.ts holds 8080 while the test files run side by
// side, so these pages are served on 8443.
function serveOn8443(): Promise<{ base: string; close: () => void } | null> {
  const server = http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url || '/', 'http://x');
    if (pathname === '/challenge') return res.writeHead(403, { 'content-type': 'text/html; charset=utf-8' }).end(await readFile(path.join(LOAD_FIXTURES, 'load-403-challenge.html')));
    if (pathname === '/missing') return res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }).end(await readFile(path.join(LOAD_FIXTURES, 'load-404.html')));
    res.writeHead(404).end();
  });
  return new Promise((resolve) => {
    server.once('error', () => resolve(null));
    server.listen(8443, '127.0.0.1', () => resolve({ base: 'http://127.0.0.1:8443', close: () => server.close() }));
  });
}

test('brand reads no tokens from a bot check or an error page, and the API answers not-diagnosed', async (t) => {
  const srv = await serveOn8443();
  if (!srv) return t.skip('port 8443 is busy');
  t.after(() => srv.close());

  const check = await runBrand(`${srv.base}/challenge`, { allowLoopback: true }).then(
    () => assert.fail('a bot check gave brand tokens'),
    (err: unknown) => err,
  );
  assert.ok(check instanceof NotDiagnosedError, `got ${String(check)}`);
  // Still a PageLoadError, so every caller that only knows that class keeps answering 422.
  assert.ok(check instanceof PageLoadError);
  assert.equal(check.notDiagnosed.reason, 'bot-check');
  assert.equal(check.notDiagnosed.status, 403);

  const body = loadFailure(check);
  assert.equal(body.code, 'not-diagnosed');
  assert.equal(body.reason, 'bot-check');
  assert.equal(body.status, 403);
  assert.match(body.message, /^not diagnosed: got a bot check page \(HTTP 403/);
  // What the home shows for that answer.
  const words = notDiagnosedText(body.reason, body.status);
  assert.match(words, /차단 화면\(봇 확인, HTTP 403\)/);
  assert.match(words, /이 결과는 그 사이트의 AI 티가 아닙니다/);

  const missing = await runBrand(`${srv.base}/missing`, { allowLoopback: true }).catch((err: unknown) => err);
  assert.ok(missing instanceof NotDiagnosedError, `got ${String(missing)}`);
  assert.equal(missing.notDiagnosed.reason, 'http-error');
  assert.match(notDiagnosedText(missing.notDiagnosed.reason, missing.notDiagnosed.status), /오류 화면\(찾을 수 없음, HTTP 404\)/);
});

test('a page that did not open stays code load, and the home words every API code in Korean', () => {
  assert.deepEqual(loadFailure(new PageLoadError('the page did not finish loading in time')), { code: 'load', message: 'the page did not finish loading in time' });
  assert.match(errorText('load', 'could not open the page (net::ERR_FAILED at example.com)'), /^페이지를 열지 못했습니다\. \(could not open the page/);
  assert.equal(errorText('private', 'private network addresses are refused'), '내부망 주소는 열 수 없습니다.');
  assert.equal(errorText('scheme', 'only http and https URLs can be opened'), 'http 와 https 주소만 열 수 있습니다.');
  assert.match(errorText('rate-limit', 'too many requests, try again in 2 min', 95), /2분 뒤/);
  // A code the home does not know yet shows the API's own sentence rather than nothing.
  assert.equal(errorText('something-new', 'a new refusal'), 'a new refusal');
  for (const code of ['empty', 'too-long', 'invalid', 'credentials', 'port', 'dns', 'content-type', 'busy', 'internal']) {
    assert.match(errorText(code, 'english'), /[가-힣]/, code);
  }
  assert.match(notDiagnosedText('sign-in', 200), /다른 주소의 로그인 화면\(HTTP 200\)/);
  assert.match(notDiagnosedText('block-page', null), /사이트가 아니라 차단 화면을 받았습니다/);
});

test('an address that did not open leaves only its host in the logs and the answer', async (t) => {
  assert.equal(hostsOnly('page.goto: net::ERR_FAILED at https://shop.example.test/account/reset?token=s3cret'), 'page.goto: net::ERR_FAILED at shop.example.test');
  assert.equal(hostsOnly('no address here'), 'no address here');

  // A server that drops every connection, so the first width fails to open: the log line that used to carry the query.
  const server = http.createServer();
  server.on('connection', (socket) => socket.destroy());
  const listening = await new Promise<boolean>((resolve) => {
    server.once('error', () => resolve(false));
    server.listen(8443, '127.0.0.1', () => resolve(true));
  });
  if (!listening) return t.skip('port 8443 is busy');
  t.after(() => server.close());
  const logged: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => void logged.push(args.map(String).join(' '));
  let thrown: unknown;
  try {
    thrown = await runDiagnosis('http://127.0.0.1:8443/account/reset?token=s3cret', { allowLoopback: true }).catch((err: unknown) => err);
  } finally {
    console.error = original;
  }
  assert.ok(thrown instanceof PageLoadError && !(thrown instanceof NotDiagnosedError), `got ${String(thrown)}`);
  assert.ok(logged.some((l) => l.includes('diagnose load failed') && l.includes('127.0.0.1:8443')), logged.join('\n'));
  for (const text of [...logged, (thrown as Error).message]) {
    assert.ok(!/s3cret|account\/reset/.test(text), `the path or query reached: ${text}`);
  }
});
