import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import * as live from '../live.mjs';
import { CSP, cleanEvent, engineRefresher, startHub } from '../watch.mjs';

// `taster watch`: the hub's address checks, its token and key, the event stream with replay, and the discovery file.
const dir = mkdtempSync(join(tmpdir(), 'taster-watch-test-'));
const viewerDir = join(dir, 'viewer/');
mkdirSync(viewerDir);
writeFileSync(join(viewerDir, 'index.html'), '<!doctype html><title>viewer</title>');
test.after(() => rmSync(dir, { recursive: true, force: true }));

let n = 0;
const discovery = () => join(dir, `hub-${++n}.json`);
const event = (type, data = {}, extra = {}) => ({ v: 1, n: 1, t: Date.now(), agent: { id: 'mcp-1', kind: 'mcp', client: 'test', label: 'site', lane: 0 }, call: 'c1', tool: 'diagnose', type, data, ...extra });

// A raw request, so the test can set Host and Origin the way another site or a rebinding name would.
function raw(port, { method = 'GET', path = '/', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const ingest = (hub, body, headers = {}) =>
  fetch(`${hub.url}ingest`, { method: 'POST', headers: { 'content-type': 'application/json', [live.TOKEN_HEADER]: hub.token, ...headers }, body: JSON.stringify(body) });

// Reads the event stream until `until` matches what came so far.
async function readStream(url, until, headers = {}) {
  const ac = new AbortController();
  const res = await fetch(url, { headers, signal: ac.signal });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/event-stream/);
  const reader = res.body.getReader();
  let text = '';
  const timer = setTimeout(() => ac.abort(), 5000);
  try {
    while (!until(text)) {
      const { value, done } = await reader.read();
      if (done) break;
      text += new TextDecoder().decode(value);
    }
  } finally {
    clearTimeout(timer);
    ac.abort();
  }
  return text;
}
const dataOf = (text) => text.split('\n\n').filter((b) => b.includes('\ndata: {') && !b.includes('event: ')).map((b) => JSON.parse(b.slice(b.indexOf('data: ') + 6)));

test('the hub writes a private discovery file, answers hello, and removes the file when it stops', async () => {
  const file = discovery();
  const hub = await startHub({ port: 0, discovery: file, viewerDir });
  try {
    const info = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(info.port, hub.port);
    assert.equal(info.token, hub.token);
    assert.equal(info.pid, process.pid);
    if (typeof process.getuid === 'function') assert.equal(statSync(file).mode & 0o777, 0o600);
    assert.deepEqual(live.readDiscovery(file), { port: hub.port, token: hub.token, pid: process.pid });
    const hello = await (await fetch(`${hub.url}api/hello`)).json();
    assert.deepEqual(hello, { app: 'taster-watch', v: 1, pid: process.pid });
    assert.match(hub.viewUrl, new RegExp(`^http://127\\.0\\.0\\.1:${hub.port}/#k=[0-9a-f]{48}$`));
    await assert.rejects(startHub({ port: 0, discovery: file, viewerDir }), /already running/, 'a second hub does not take over');
  } finally {
    await hub.close();
  }
  assert.equal(existsSync(file), false);
});

test('only this host and port, and only same-origin requests, get an answer', async () => {
  const hub = await startHub({ port: 0, discovery: discovery(), viewerDir });
  try {
    assert.equal((await raw(hub.port, { path: '/api/hello', headers: { host: `127.0.0.1:${hub.port}` } })).status, 200);
    assert.equal((await raw(hub.port, { path: '/api/hello', headers: { host: `localhost:${hub.port}` } })).status, 200);
    assert.equal((await raw(hub.port, { path: '/api/hello', headers: { host: `rebound.example:${hub.port}` } })).status, 403, 'a rebinding name is refused');
    assert.equal((await raw(hub.port, { path: '/api/hello', headers: { host: '127.0.0.1:1' } })).status, 403);
    const cross = await raw(hub.port, { path: '/api/hello', headers: { host: `127.0.0.1:${hub.port}`, origin: 'https://evil.example' } });
    assert.equal(cross.status, 403);
    assert.equal(cross.headers['access-control-allow-origin'], undefined, 'no CORS');
    assert.equal((await raw(hub.port, { path: '/api/hello', headers: { host: `127.0.0.1:${hub.port}`, origin: `http://127.0.0.1:${hub.port}` } })).status, 200);
    assert.equal((await raw(hub.port, { path: '/api/hello', headers: { host: `127.0.0.1:${hub.port}`, 'sec-fetch-site': 'cross-site' } })).status, 403);
    // The viewer and nothing else from disk, under the content security policy.
    const page = await fetch(hub.url);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get('content-security-policy'), CSP);
    assert.equal(page.headers.get('x-frame-options'), 'DENY');
    assert.equal((await raw(hub.port, { path: '/../watch.mjs', headers: { host: `127.0.0.1:${hub.port}` } })).status, 404);
    assert.equal((await fetch(`${hub.url}viewer/index.html`)).status, 404);
    assert.equal((await fetch(`${hub.url}viewer.js`)).status, 404, 'a viewer file that is not there is a 404, not a crash');
  } finally {
    await hub.close();
  }
});

test('ingest needs the token, takes only well formed events, and the stream replays them to a late viewer', async () => {
  const hub = await startHub({ port: 0, discovery: discovery(), viewerDir });
  try {
    assert.equal((await ingest(hub, [event('stage')], { [live.TOKEN_HEADER]: 'wrong' })).status, 401);
    assert.equal((await fetch(`${hub.url}ingest`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '[]' })).status, 401);
    assert.equal((await ingest(hub, [event('stage')], { 'content-type': 'text/plain' })).status, 415);
    const res = await ingest(hub, [event('stage', { width: 1440 }), event('findings', { width: 1440, findings: [] }), { v: 2, type: 'x' }, event('Bad Type'), event('ok', {}, { agent: {} }), 'nope']);
    assert.deepEqual(await res.json(), { kept: 2 });
    assert.deepEqual(hub.events.map((e) => [e.seq, e.type]), [[1, 'stage'], [2, 'findings']]);

    assert.equal((await fetch(`${hub.url}events`)).status, 403, 'the stream needs the viewer key');
    assert.equal((await fetch(`${hub.url}events?k=${'0'.repeat(48)}`)).status, 403);
    const replay = await readStream(`${hub.url}events?k=${hub.key}`, (t) => t.includes('event: replayed'));
    assert.deepEqual(dataOf(replay).map((e) => e.type), ['stage', 'findings']);
    const after = await readStream(`${hub.url}events?k=${hub.key}`, (t) => t.includes('event: replayed'), { 'last-event-id': '1' });
    assert.deepEqual(dataOf(after).map((e) => e.seq), [2], 'a reconnect gets only what it missed');

    // Events that arrive while a viewer is open reach it at once.
    const stream = readStream(`${hub.url}events?k=${hub.key}`, (t) => t.includes('"type":"swaps"'));
    await new Promise((r) => setTimeout(r, 100));
    await ingest(hub, event('swaps', { items: [] }));
    assert.deepEqual(dataOf(await stream).map((e) => e.type), ['stage', 'findings', 'swaps']);
    assert.equal(hub.publish('stage.refresh', { shot: null }).agent.id, 'hub');
  } finally {
    await hub.close();
  }
});

test('stage pictures go in with the token and come out with the key', async () => {
  const hub = await startHub({ port: 0, discovery: discovery(), viewerDir });
  try {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
    const put = (id, headers = {}) => fetch(`${hub.url}ingest/shot?id=${id}`, { method: 'POST', headers: { 'content-type': 'image/jpeg', [live.TOKEN_HEADER]: hub.token, ...headers }, body: jpeg });
    assert.equal((await put('abc12345', { [live.TOKEN_HEADER]: 'x' })).status, 401);
    assert.equal((await put('../../etc')).status, 400);
    assert.equal((await put('abc12345', { 'content-type': 'text/html' })).status, 415);
    assert.equal((await put('abc12345')).status, 200);
    assert.equal((await fetch(`${hub.url}shot/abc12345`)).status, 403);
    const got = await fetch(`${hub.url}shot/abc12345?k=${hub.key}`);
    assert.equal(got.status, 200);
    assert.equal(got.headers.get('content-type'), 'image/jpeg');
    assert.deepEqual(Buffer.from(await got.arrayBuffer()), jpeg);
    assert.equal((await fetch(`${hub.url}shot/nothere1?k=${hub.key}`)).status, 404);
  } finally {
    await hub.close();
  }
});

test('the engine finds the hub through the discovery file and its events arrive in order', async () => {
  const file = discovery();
  const hub = await startHub({ port: 0, discovery: file, viewerDir });
  const before = process.env.TASTER_LIVE_FILE;
  process.env.TASTER_LIVE_FILE = file;
  live.reset();
  try {
    await live.withCall({ tool: 'diagnose', agent: { id: 'cli-9', kind: 'cli', label: 'site' } }, async () => {
      const shot = live.sendShot(Buffer.from([0xff, 0xd8, 0xff]));
      live.emit('stage', { shot });
      live.emit('findings', { width: 1440 });
    });
    await live.flush();
    const types = hub.events.map((e) => e.type);
    assert.deepEqual(types, ['stage', 'findings']);
    assert.ok(hub.getShot(hub.events[0].data.shot), 'the picture is there before the event that names it');
  } finally {
    process.env.TASTER_LIVE_FILE = before;
    live.reset();
    await hub.close();
  }
});

test('cleanEvent keeps the envelope and cuts what does not belong', () => {
  const e = cleanEvent(event('call.start', { args: {} }, { agent: { id: 'a', kind: 'mcp', client: 'x'.repeat(100), label: 'l', lane: 99 } }));
  assert.equal(e.agent.client.length, 60);
  assert.equal(e.agent.lane, 0);
  assert.equal(cleanEvent({ ...event('x'), data: { big: 'x'.repeat(2 * 1024 * 1024) } }), null);
  assert.equal(cleanEvent(null), null);
});

test('after a change the hub opens the last local stage again until its picture differs, then sends it', async () => {
  const pictures = [Buffer.from('same'), Buffer.from('same'), Buffer.from('changed')];
  const asked = [];
  const refresher = {
    run: async (stage) => {
      asked.push(stage);
      return { image: pictures.shift() || Buffer.from('changed'), findings: [{ id: 0, ruleId: 'AC-01' }], counts: { 'AC-01': 1 } };
    },
  };
  const hub = await startHub({ port: 0, discovery: discovery(), viewerDir, refresher, refreshEvery: 20, refreshTries: 8 });
  try {
    const put = (id, body) => fetch(`${hub.url}ingest/shot?id=${id}`, { method: 'POST', headers: { 'content-type': 'image/jpeg', [live.TOKEN_HEADER]: hub.token }, body });
    await put('first0001', Buffer.from('same'));
    await put('remote001', Buffer.from('other'));
    await ingest(hub, [event('stage', { url: 'http://localhost:3000/', width: 1440, height: 900, shot: 'first0001', diagnosed: true }), event('stage', { url: 'http://localhost:3000/', width: 390, height: 844, shot: 'remote001', diagnosed: true })]);
    await ingest(hub, event('component.add', { ids: ['blocks/button'] }, { tool: 'add', call: 'c2' }));
    for (let i = 0; i < 100 && !hub.events.some((e) => e.type === 'stage.refresh'); i++) await new Promise((r) => setTimeout(r, 20));
    const refreshed = hub.events.find((e) => e.type === 'stage.refresh');
    assert.ok(refreshed, 'a refreshed stage was sent');
    assert.equal(refreshed.agent.id, 'hub');
    assert.equal(refreshed.data.of, 1, 'it refreshes the widest stage of the diagnose');
    assert.equal(refreshed.data.attempt, 3, 'unchanged pictures are not sent');
    assert.deepEqual(asked[0], { url: 'http://localhost:3000/', width: 1440, height: 900, colorScheme: null });
    assert.equal(hub.getShot(refreshed.data.shot).image.toString(), 'changed');
    assert.equal(refreshed.data.findings[0].ruleId, 'AC-01');

    // A public page is never opened again.
    await put('public001', Buffer.from('x'));
    await ingest(hub, event('stage', { url: 'https://example.com/', width: 1440, shot: 'public001', diagnosed: true }, { call: 'c3' }));
    const before = asked.length;
    await ingest(hub, event('system.tuned', { diff: [] }, { call: 'c4' }));
    await new Promise((r) => setTimeout(r, 120));
    assert.equal(asked.length, before);
  } finally {
    await hub.close();
  }
});

test('isLocalPage opens only local files and servers on this machine', async () => {
  const { isLocalPage } = await import('../watch.mjs');
  assert.ok(isLocalPage('file:///tmp/a.html'));
  assert.ok(isLocalPage('http://localhost:3000/'));
  assert.ok(isLocalPage('http://127.0.0.1:8080/x'));
  assert.ok(!isLocalPage('https://example.com/'));
  assert.ok(!isLocalPage('http://localhost.example.com/'));
  assert.ok(!isLocalPage('not a url'));
});

test("the engine refresher takes a clean picture of a local page and measures it", { timeout: 60000 }, async () => {
  const refresher = engineRefresher();
  try {
    const url = pathToFileURL(new URL('../../../data/rules/fixtures/slop.html', import.meta.url).pathname).href;
    const got = await refresher.run({ url, width: 1440, height: 900 });
    assert.ok(got.image.length > 1000);
    assert.deepEqual([...got.image.subarray(0, 2)], [0xff, 0xd8], 'a JPEG');
    assert.equal(got.shotSize.width, 1440);
    assert.ok(got.findings.length > 5 && got.findings.every((f) => f.rect && f.severity));
    await assert.rejects(refresher.run({ url: pathToFileURL(join(dir, 'notes.txt')).href, width: 1440 }), /File not found|Only local/);
  } finally {
    await refresher.close();
  }
});
