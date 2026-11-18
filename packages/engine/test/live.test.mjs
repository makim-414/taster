import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import * as live from '../live.mjs';

// The event bus behind `taster watch`: silent and cheap with no hub, ordered and tagged with one.
const dir = mkdtempSync(join(tmpdir(), 'taster-live-test-'));
process.env.TASTER_LIVE_FILE = join(dir, 'hub.json');
test.after(() => rmSync(dir, { recursive: true, force: true }));

const TOKEN = 'a'.repeat(48);

// A stand in for the hub: answers /api/hello and keeps what /ingest and /ingest/shot get, in arrival order.
async function fakeHub({ pid = process.pid } = {}) {
  const got = [];
  const server = createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const url = new URL(req.url, 'http://x');
      if (url.pathname === '/api/hello') return res.end(JSON.stringify({ app: 'taster-watch', v: 1, pid }));
      if (req.headers[live.TOKEN_HEADER] !== TOKEN) return res.writeHead(401).end();
      if (url.pathname === '/ingest') got.push(...JSON.parse(Buffer.concat(chunks).toString('utf8')));
      else if (url.pathname === '/ingest/shot') got.push({ shot: url.searchParams.get('id'), bytes: Buffer.concat(chunks).length, type: req.headers['content-type'] });
      res.end('{}');
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  writeFileSync(process.env.TASTER_LIVE_FILE, JSON.stringify({ port, token: TOKEN, pid }), { mode: 0o600 });
  chmodSync(process.env.TASTER_LIVE_FILE, 0o600);
  live.reset();
  return { got, port, close: () => new Promise((r) => server.close(r)) };
}

test('with no hub, emit does nothing and costs nothing', async () => {
  rmSync(process.env.TASTER_LIVE_FILE, { force: true });
  live.reset();
  const started = Date.now();
  assert.equal(await live.active(), false);
  await live.withCall({ tool: 'diagnose' }, async () => {
    for (let i = 0; i < 1000; i++) live.emit('findings', { i });
    assert.equal(live.sendShot(Buffer.from('x')), null);
  });
  await live.flush(200);
  assert.ok(Date.now() - started < 300, `took ${Date.now() - started}ms`);
});

test('events reach the hub in order, tagged with the agent, the call, the tool and a lane per running call', async () => {
  const hub = await fakeHub();
  try {
    assert.equal(await live.active(), true);
    const agent = { id: 'acp-1', kind: 'acp', client: 'zed', label: 'site' };
    let release;
    const gate = new Promise((r) => (release = r));
    const first = live.withCall({ tool: 'diagnose', agent }, async () => {
      live.emit('stage', { width: 1440 });
      await gate;
      live.emit('findings', { width: 1440 });
    });
    const second = live.withCall({ tool: 'extract', agent }, async () => {
      const id = live.sendShot(Buffer.alloc(10, 1));
      assert.ok(id, 'a shot gets an id while the hub is up');
      live.emit('stage', { shot: id });
      release();
    });
    await Promise.all([first, second]);
    live.emit('outside', {});
    await live.flush();

    const events = hub.got.filter((e) => !e.shot);
    assert.deepEqual(events.map((e) => e.type), ['stage', 'stage', 'findings', 'outside']);
    assert.deepEqual(events.slice(0, 3).map((e) => e.n), [1, 2, 3], 'n counts per agent');
    for (const e of events) assert.equal(e.v, 1);
    const [a, b, c] = events;
    assert.equal(a.agent.id, 'acp-1');
    assert.equal(a.agent.kind, 'acp');
    assert.equal(a.agent.client, 'zed');
    assert.equal(a.tool, 'diagnose');
    assert.equal(b.tool, 'extract');
    assert.equal(a.agent.lane, 0);
    assert.equal(b.agent.lane, 1, 'a second call running at the same time gets the next lane');
    assert.equal(c.call, a.call, 'the same call id across awaits');
    assert.notEqual(a.call, b.call);
    assert.equal(events[3].call, null, 'outside a call: no call id');
    assert.notEqual(events[3].agent.id, 'acp-1', 'outside a call: the process agent');

    // The picture goes out before the event that names it.
    const shotAt = hub.got.findIndex((e) => e.shot);
    const namedAt = hub.got.findIndex((e) => e.data?.shot);
    assert.ok(shotAt >= 0 && shotAt < namedAt);
    assert.equal(hub.got[shotAt].bytes, 10);
    assert.equal(hub.got[shotAt].type, 'image/jpeg');
  } finally {
    await hub.close();
  }
});

test('tracked wraps a handler with call.start and call.end and passes its result and errors through', async () => {
  const hub = await fakeHub();
  try {
    const ok = live.tracked('suggest_swaps', async (args) => ({ content: [{ type: 'text', text: String(args.n) }] }), () => ({ id: 'mcp-x', kind: 'mcp', client: 'claude-code' }));
    const bad = live.tracked('diagnose', async () => ({ isError: true, content: [{ type: 'text', text: 'diagnose failed: https://user:pw@example.com/a?key=1\nmore' }] }));
    const thrown = live.tracked('get_component', async () => {
      throw new Error('boom');
    });
    assert.deepEqual(await ok({ n: 3, target: 'https://me:secret@example.com/p?q=1#h', token: 'abc' }, {}), { content: [{ type: 'text', text: '3' }] });
    assert.equal((await bad({ target: 'x' }, {})).isError, true);
    await assert.rejects(thrown({}, {}), /boom/);
    await live.flush();

    const ends = hub.got.filter((e) => e.type === 'call.end');
    const starts = hub.got.filter((e) => e.type === 'call.start');
    assert.equal(starts.length, 3);
    assert.deepEqual(starts[0].data.args, { n: 3, target: 'https://example.com/p', token: '(hidden)' });
    assert.equal(starts[0].agent.client, 'claude-code');
    assert.deepEqual(ends.map((e) => e.data.ok), [true, false, false]);
    assert.equal(ends[1].data.error, 'diagnose failed: https://example.com/a', 'the error line loses query and user info');
    assert.equal(ends[2].data.error, 'boom');
    for (const e of ends) assert.equal(typeof e.data.ms, 'number');
  } finally {
    await hub.close();
  }
});

test('a hub that stops answering never throws into a call or slows it down', async () => {
  const hub = await fakeHub();
  await hub.close();
  const run = live.tracked('diagnose', async () => ({ content: [] }));
  const started = Date.now();
  await run({ target: 'a.html' }, {});
  for (let i = 0; i < 100; i++) live.emit('findings', {});
  assert.ok(Date.now() - started < 100, `the call itself took ${Date.now() - started}ms`);
  await live.flush(3000);
  assert.equal(await live.active(), false);
});

test('a discovery file other users can read, or one naming another process, is not trusted', { skip: typeof process.getuid !== 'function' }, async () => {
  const hub = await fakeHub();
  try {
    chmodSync(process.env.TASTER_LIVE_FILE, 0o644);
    live.reset();
    assert.equal(live.readDiscovery(), null);
    assert.equal(await live.active(), false);
  } finally {
    await hub.close();
  }
  const other = await fakeHub({ pid: process.pid + 1 });
  try {
    writeFileSync(process.env.TASTER_LIVE_FILE, JSON.stringify({ port: other.port, token: TOKEN, pid: process.pid }), { mode: 0o600 });
    live.reset();
    assert.equal(await live.active(), false, 'the hub answering hello is not the process the file names');
  } finally {
    await other.close();
  }
});

test('stripUrl and safeArgs keep addresses and drop what could be secret', () => {
  assert.equal(live.stripUrl('https://u:p@site.test/path?token=1#frag'), 'https://site.test/path');
  assert.equal(live.stripUrl('localhost:3000/a?b=1'), 'localhost:3000/a');
  assert.equal(live.stripUrl('file:///tmp/a.html?x'), 'file:///tmp/a.html');
  assert.equal(live.stripUrl('./page.html'), './page.html');
  const args = live.safeArgs({ apiKey: 'k', nested: { password: 'p', list: Array.from({ length: 25 }, (_, i) => i) }, long: 'x'.repeat(500), deep: { a: { b: { c: 1 } } } });
  assert.equal(args.apiKey, '(hidden)');
  assert.equal(args.nested.password, '(hidden)');
  assert.equal(args.nested.list.length, 21);
  assert.equal(args.long.length, 200);
  assert.equal(args.deep.a.b, '{...}');
});
