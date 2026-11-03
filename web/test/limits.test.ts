import test from 'node:test';
import assert from 'node:assert/strict';
import { capAnswer, clientIp, createCeiling, gateBudget, takeCallToken, takeShotToken, takeToken, withGate } from '../lib/limits.ts';
import { POST as brandPost } from '../app/api/brand/route.ts';
import { POST as mcpPost } from '../app/api/mcp/route.ts';

test('one IP gets six diagnoses per ten minutes, then waits', () => {
  const t0 = 1_000_000;
  for (let i = 0; i < 6; i++) assert.equal(takeToken('203.0.113.7', t0 + i).ok, true);
  const seventh = takeToken('203.0.113.7', t0 + 10);
  assert.equal(seventh.ok, false);
  assert.ok(seventh.retryAfter > 0);
  assert.equal(takeToken('203.0.113.8', t0 + 10).ok, true);
  assert.equal(takeToken('203.0.113.7', t0 + 10 * 60 * 1000 + 1).ok, true);
});

test('reference screens have their own window of twenty calls', () => {
  const t0 = 2_000_000;
  for (let i = 0; i < 20; i++) assert.equal(takeShotToken('203.0.113.9', t0 + i).ok, true);
  assert.equal(takeShotToken('203.0.113.9', t0 + 30).ok, false);
  assert.equal(takeToken('203.0.113.9', t0 + 30).ok, true, 'a diagnosis is not charged for screens');
});

test('MCP tool calls of any kind get sixty a minute per client', () => {
  const t0 = 3_000_000;
  for (let i = 0; i < 60; i++) assert.equal(takeCallToken('203.0.113.10', t0 + i).ok, true);
  const over = takeCallToken('203.0.113.10', t0 + 100);
  assert.equal(over.ok, false);
  assert.ok(over.retryAfter > 0 && over.retryAfter <= 60, `retry after ${over.retryAfter} s`);
  assert.equal(takeCallToken('203.0.113.10', t0 + 60_001).ok, true, 'the window is a minute, not ten');
});

test('a ceiling across every caller turns away calls past the limit within a minute', () => {
  const take = createCeiling(3);
  const t0 = 5_000_000;
  assert.deepEqual([take(t0), take(t0 + 1), take(t0 + 2), take(t0 + 3)], [true, true, true, false]);
  assert.equal(take(t0 + 60_001), true);
});

test('client IP comes from the platform headers', () => {
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' })), '198.51.100.1');
  assert.equal(clientIp(new Headers({ 'x-real-ip': '198.51.100.2', 'x-forwarded-for': '1.2.3.4' })), '198.51.100.2');
  assert.equal(clientIp(new Headers({})), 'unknown');
});

test('an IPv6 client is its /64, so changing the low bits does not open a new window', () => {
  const key = (ip: string) => clientIp(new Headers({ 'x-real-ip': ip }));
  assert.equal(key('2001:db8:1:2::1'), key('2001:db8:1:2:ffff:ffff:ffff:fffe'));
  assert.equal(key('2001:0db8:0001:0002:abcd::9'), key('2001:db8:1:2::1'), 'written out or shortened, the same /64');
  assert.notEqual(key('2001:db8:1:3::1'), key('2001:db8:1:2::1'), 'the next /64 is another client');
  assert.equal(key('::ffff:198.51.100.3'), '198.51.100.3', 'an IPv4 mapped address counts as that IPv4 address');
  assert.equal(key('x'.repeat(500)).length, 64, 'a header that is not an address is kept short');

  const t0 = 4_000_000;
  for (let i = 1; i <= 6; i++) assert.equal(takeToken(key(`2001:db8:9:9::${i}`), t0 + i).ok, true);
  assert.equal(takeToken(key('2001:db8:9:9:beef::7'), t0 + 10).ok, false);
});

test('the gate runs one diagnosis at a time and turns away a long queue', async () => {
  const budget = { budgetMs: 60_000 };
  let release: () => void = () => {};
  const first = withGate(() => new Promise<string>((r) => (release = () => r('a'))), budget);
  const second = withGate(async () => 'b', budget);
  const third = withGate(async () => 'c', budget);
  assert.equal(await withGate(async () => 'd', budget), null);
  release();
  assert.deepEqual(await Promise.all([first, second, third]), ['a', 'b', 'c']);
});

test('a waiting call whose time runs out leaves the queue busy instead of running past the limit', async () => {
  let release: () => void = () => {};
  const first = withGate(() => new Promise<string>((r) => (release = () => r('a'))), { budgetMs: 60_000 });
  const t0 = Date.now();
  let ran = false;
  // 120 ms in all, and the job needs 80 of them: it gives up after about 40 ms of waiting.
  const late = await withGate(async () => (ran = true), { budgetMs: 120, needMs: 80 });
  const waited = Date.now() - t0;
  assert.equal(late, null);
  assert.equal(ran, false, 'the job never started');
  assert.ok(waited >= 30 && waited < 1000, `gave up after ${waited} ms`);
  // It left its place in the queue, so two more can wait again.
  const left: number[] = [];
  const second = withGate(async (ms) => left.push(ms), { budgetMs: 60_000 });
  const third = withGate(async (ms) => left.push(ms), { budgetMs: 60_000 });
  release();
  assert.equal(await first, 'a');
  await Promise.all([second, third]);
  assert.equal(left.length, 2);
  assert.ok(left.every((ms) => ms > 59_000 && ms <= 60_000), `the job gets what is left of its budget: ${left}`);
});

test('a call that has less time than its job needs is busy at once', async () => {
  let ran = false;
  assert.equal(await withGate(async () => (ran = true), { budgetMs: 10_000, needMs: 30_000 }), null);
  assert.equal(ran, false);
});

test('the wait budget is the route time limit less a margin and what the request already spent', () => {
  assert.equal(gateBudget(60, 1_000, 3_000), 48_000);
  assert.equal(gateBudget(90, 1_000, 1_000), 80_000);
});

// The routes themselves, up to the point where they would open a browser. 1.1.1.1 is a public address, so the fence
// lets it through without DNS; every call below is answered before anything opens it.
const brandCall = (ip: string) =>
  brandPost(new Request('https://taster.test/api/brand', { method: 'POST', headers: { 'content-type': 'application/json', 'x-real-ip': ip }, body: JSON.stringify({ url: 'https://1.1.1.1/' }) }));

test('the seventh brand read from one /64 is refused with 429 and retry-after', async () => {
  const key = clientIp(new Headers({ 'x-real-ip': '2001:db8:42:7::1' }));
  for (let i = 0; i < 6; i++) assert.equal(takeToken(key).ok, true);
  const res = await brandCall('2001:db8:42:7:dead:beef::2');
  assert.equal(res.status, 429);
  const retry = Number(res.headers.get('retry-after'));
  assert.ok(retry > 0 && retry <= 600, `retry-after ${res.headers.get('retry-after')}`);
  assert.equal((await res.json()).error.code, 'rate-limit');
});

test('a brand read that finds the gate full is busy with retry-after', async () => {
  let release: () => void = () => {};
  const first = withGate(() => new Promise<void>((r) => (release = r)), { budgetMs: 60_000 });
  const waiting = [withGate(async () => {}, { budgetMs: 60_000 }), withGate(async () => {}, { budgetMs: 60_000 })];
  const res = await brandCall('198.51.100.77');
  release();
  await Promise.all([first, ...waiting]);
  assert.equal(res.status, 503);
  assert.equal(res.headers.get('retry-after'), '20');
  assert.equal((await res.json()).error.code, 'busy');
});

const mcpCall = (body: unknown, ip = '198.51.100.90') =>
  mcpPost(new Request('https://taster.test/api/mcp', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'x-real-ip': ip }, body: JSON.stringify(body) }));
const call = (id: number) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'browse_components', arguments: {} } });

test('the hosted MCP server refuses a batch before running any of it', async () => {
  const res = await mcpCall([call(1), call(2), call(3)]);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, -32600);
  assert.match(body.error.message, /batch/);
  assert.equal(body.id, null);
});

test('the hosted MCP server answers one message, and a tool call past sixty a minute gets 429', async () => {
  const list = await mcpCall({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
  assert.equal(list.status, 200);
  assert.equal(list.headers.get('cache-control'), 'no-store');
  assert.ok((await list.json()).result.tools.some((t: { name: string }) => t.name === 'diagnose'));

  const ip = '198.51.100.91';
  for (let i = 0; i < 60; i++) assert.equal(takeCallToken(clientIp(new Headers({ 'x-real-ip': ip }))).ok, true);
  const res = await mcpCall(call(7), ip);
  assert.equal(res.status, 429);
  assert.ok(Number(res.headers.get('retry-after')) > 0);
  const body = await res.json();
  assert.equal(body.id, 7, 'the error answers the call it refused');
  assert.match(body.error.message, /^rate-limit: /);
});

test('an MCP answer over the size limit becomes an error for the same call', async () => {
  const big = await capAnswer(new Response('x'.repeat(200), { status: 200, headers: { 'content-type': 'application/json' } }), 9, 100);
  assert.equal(big.status, 200);
  const body = await big.json();
  assert.equal(body.id, 9);
  assert.match(body.error.message, /^too-large: /);

  const small = await capAnswer(new Response('{"ok":1}', { status: 200, headers: { 'content-type': 'application/json' } }), 9, 100);
  assert.equal(await small.text(), '{"ok":1}');
  assert.equal(small.headers.get('cache-control'), 'no-store');
  assert.equal(small.headers.get('content-type'), 'application/json');

  const accepted = await capAnswer(new Response(null, { status: 202 }), null, 100);
  assert.equal(accepted.status, 202);
  assert.equal(await accepted.text(), '');
});
