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

// The live viewer is browser code with no build; scripts/check-live-viewer.mjs drives it. This keeps its count strings
// from going back to a fixed plural ("1 rules, 1 findings"): every counted noun goes through plural().
test('the viewer counts through plural(), so one is a rule and a finding', () => {
  const src = readFileSync(new URL('../viewer/viewer.js', import.meta.url), 'utf8');
  const fixed = src.match(/\$\{[^}]+\}\s(rules|findings|elements|tokens|screens|files|marks)\b/g) || [];
  assert.deepEqual(fixed, [], 'a count with a fixed plural noun');
  for (const noun of ['rule', 'finding', 'element', 'token', 'screen']) assert.match(src, new RegExp(`plural\\([^)]*'${noun}'\\)`), `${noun} is counted with plural()`);
});

// The per-edit view: after each edit an agent reports, the hub loads the stage again, compares its elements with the
// load before, retries while the dev server has not reloaded yet, and sends one stage.patch with the changed regions
// and the edit each goes with.
test('after an edit the hub captures the stage again and sends the regions that changed, with their edit', async () => {
  const el = (k, p, r, s, extra = {}) => ({ k, p, t: 'div', id: '', c: [], r, s, x: '', ...extra });
  const dom = (hero, cards) => ({
    width: 1440,
    height: 1600,
    truncated: false,
    nodes: [el('html>body:0', -1, [0, 0, 1440, 1600], 'b'), el('html>body:0>header#hero', 0, [0, 0, 1440, 500], hero, { id: 'hero' }), el('html>body:0>section#cards', 0, [0, 900, 1440, 500], cards, { id: 'cards' })],
  });
  const loads = [dom('h1', 'c1'), dom('h1', 'c1'), dom('h2', 'c2'), dom('h2', 'c2'), dom('h2', 'c2')];
  const asked = [];
  const refresher = {
    run: async () => null,
    snapshot: async (stage) => {
      asked.push(stage.url);
      const d = loads.shift() || dom('h2', 'c2');
      return { image: Buffer.from(`${d.nodes[1].s}${d.nodes[2].s}`), type: 'image/jpeg', shotSize: { width: 1440, height: 1600 }, dom: d, findings: [{ id: 0, ruleId: 'AC-01', rect: { x: 0, y: 0, w: 10, h: 10 } }], counts: { 'AC-01': 1 } };
    },
  };
  const hub = await startHub({ port: 0, discovery: discovery(), viewerDir, refresher, editDebounce: 30, editRetry: 20, editTries: 4, baselineDelay: 10, baselineLoads: 1 });
  try {
    const hook = (id, file) => event('edit', { file, tool: 'Edit' }, { agent: { id, kind: 'hook', client: 'claude-code', label: 'site', lane: 0 }, call: null, tool: null });
    // Before any stage, an edit has nothing to capture.
    await ingest(hub, hook('cc-a', 'src/hero.html'));
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(asked.length, 0);

    await fetch(`${hub.url}ingest/shot?id=stage0001`, { method: 'POST', headers: { 'content-type': 'image/jpeg', [live.TOKEN_HEADER]: hub.token }, body: Buffer.from('h1c1') });
    await ingest(hub, event('stage', { url: 'http://localhost:5173/', width: 1440, height: 900, shot: 'stage0001', diagnosed: true }));
    await new Promise((r) => setTimeout(r, 40));
    await hub.idle();
    assert.equal(asked.length, 1, 'a baseline load right after the stage');

    // Two agents edit two files inside one debounce: one capture, and each region goes with its file.
    await ingest(hub, [hook('cc-a', 'src/partials/hero.html'), hook('cc-b', 'src/partials/cards.html')]);
    for (let i = 0; i < 100 && !hub.events.some((e) => e.type === 'stage.patch'); i++) await new Promise((r) => setTimeout(r, 20));
    await hub.idle();
    const patch = hub.events.find((e) => e.type === 'stage.patch');
    assert.ok(patch, 'a patch was sent');
    assert.equal(patch.agent.id, 'hub');
    assert.equal(asked.length, 3, 'the first load after the edit had not changed yet, so it loaded again');
    assert.ok(asked.every((u) => u === 'http://localhost:5173/'));
    const d = patch.data;
    assert.equal(d.of, hub.events.find((e) => e.type === 'stage').seq);
    assert.ok(hub.getShot(d.shot), 'the new picture is kept for the viewer');
    assert.equal(d.compared, true);
    assert.deepEqual(d.edits.map((x) => [x.file, x.agent.id]), [['src/partials/hero.html', 'cc-a'], ['src/partials/cards.html', 'cc-b']]);
    assert.equal(d.file, 'src/partials/cards.html');
    assert.deepEqual(d.changed.map((r) => [r.rect.y, r.kind, r.edit, r.guessed]), [[0, 'changed', 0, true], [900, 'changed', 1, true]]);
    assert.equal(d.findings[0].ruleId, 'AC-01', 'the findings of the same load go with it');

    // An edit that changes nothing visible: a patch with no picture, after the retries.
    const before = asked.length;
    await ingest(hub, hook('cc-a', 'README.md'));
    for (let i = 0; i < 100 && hub.events.filter((e) => e.type === 'stage.patch').length < 2; i++) await new Promise((r) => setTimeout(r, 20));
    await hub.idle();
    const quiet = hub.events.filter((e) => e.type === 'stage.patch')[1];
    assert.ok(quiet);
    assert.equal(quiet.data.shot, null);
    assert.deepEqual(quiet.data.changed, []);
    assert.equal(asked.length - before, 4, 'tried editTries times');
  } finally {
    await hub.close();
  }
});

// A page with parts that change on every load (a rotating word, a clock) and a picture that never repeats (WebGL): the
// hub learns those parts from the loads right after the diagnose, leaves them out, and keeps retrying while only they
// changed, so the region it sends is the edit's.
test('elements that change by themselves are learned after the diagnose and left out of the edit regions', async () => {
  const el = (k, p, r, s, extra = {}) => ({ k, p, t: 'div', id: '', c: [], r, s, x: '', ...extra });
  let tick = 0;
  let edited = false;
  const dom = () => {
    tick++;
    return {
      width: 1440,
      height: 1600,
      truncated: false,
      nodes: [
        el('html>body:0', -1, [0, 0, 1440, 1600], 'b'),
        el('html>body:0>header#hero', 0, [0, 0, 1440, 500], 'h', { id: 'hero' }),
        el('html>body:0>header#hero>span:0', 1, [100, 100, 200, 40], `word${tick % 3}`, { x: ['ChatGPT', 'Gemini', 'Claude'][tick % 3] }),
        el('html>body:0>section#pricing', 0, [0, 900, 1440, 500], edited ? 'p2' : 'p1', { id: 'pricing' }),
        el('html>body:0>footer:0>span:0', 0, [0, 1500, 120, 20], `clock${tick}`),
      ],
    };
  };
  // The dev server picks the edit up on the third load after it.
  let afterEdit = 0;
  const asked = [];
  const refresher = {
    run: async () => null,
    snapshot: async (stage) => {
      asked.push(stage.url);
      if (afterEdit && ++afterEdit > 3) edited = true;
      const d = dom();
      return { image: Buffer.from(`frame${tick}`), type: 'image/jpeg', shotSize: { width: 1440, height: 1600 }, dom: d, findings: [], counts: {} };
    },
  };
  const hub = await startHub({ port: 0, discovery: discovery(), viewerDir, refresher, editDebounce: 30, editRetry: 20, editTries: 5, baselineDelay: 10, baselineLoads: 3 });
  try {
    await fetch(`${hub.url}ingest/shot?id=stage0002`, { method: 'POST', headers: { 'content-type': 'image/jpeg', [live.TOKEN_HEADER]: hub.token }, body: Buffer.from('frame0') });
    await ingest(hub, event('stage', { url: 'http://localhost:5190/', width: 1440, height: 900, shot: 'stage0002', diagnosed: true }));
    await new Promise((r) => setTimeout(r, 40));
    await hub.idle();
    assert.equal(asked.length, 3, 'three loads right after the stage');

    afterEdit = 1;
    await ingest(hub, event('edit', { file: 'components/pricing.tsx', tool: 'Edit' }, { agent: { id: 'cc-a', kind: 'hook', client: 'claude-code', label: 'site', lane: 0 }, call: null, tool: null }));
    for (let i = 0; i < 100 && !hub.events.some((e) => e.type === 'stage.patch'); i++) await new Promise((r) => setTimeout(r, 20));
    await hub.idle();
    const patch = hub.events.find((e) => e.type === 'stage.patch');
    assert.ok(patch, 'a patch was sent');
    assert.equal(asked.length, 6, 'the picture changed on every load, but it kept loading until the elements did');
    assert.deepEqual(patch.data.changed.map((r) => [r.rect.y, r.kind]), [[900, 'changed']], 'only the edited section, not the word or the clock');
    assert.ok(patch.data.shot);
  } finally {
    await hub.close();
  }
});

// A broken page after an edit (a 5xx, a dev server that is down): the hub stops once the same error comes back twice,
// sends stage.error with the status, a short message and the edit, and compares the fix with the last good load.
test('after an edit that breaks the page the hub sends stage.error soon, and the fix is compared with the last good load', async () => {
  const el = (k, p, r, s, extra = {}) => ({ k, p, t: 'div', id: '', c: [], r, s, x: '', ...extra });
  const dom = (hero) => ({ width: 1440, height: 1600, truncated: false, nodes: [el('html>body:0', -1, [0, 0, 1440, 1600], 'b'), el('html>body:0>header#hero', 0, [0, 0, 1440, 500], hero, { id: 'hero' })] });
  const good = (hero) => ({ image: Buffer.from(`img-${hero}`), type: 'image/jpeg', shotSize: { width: 1440, height: 1600 }, dom: dom(hero), findings: [], counts: {} });
  let mode = 'good';
  let hero = 'h1';
  const asked = [];
  const refresher = {
    run: async () => null,
    snapshot: async () => {
      asked.push(mode);
      if (mode === '500') return { error: { status: 500, reason: 'http-error', message: 'not diagnosed: got a server error page (HTTP 500, title "Error") instead of the site at http://localhost:5190/' } };
      if (mode === 'down') throw new Error('page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5190/\nCall log:\n  - navigating');
      return good(hero);
    },
  };
  const hub = await startHub({ port: 0, discovery: discovery(), viewerDir, refresher, editDebounce: 30, editRetry: 20, editTries: 6, baselineDelay: 10, baselineLoads: 1 });
  const hook = (file) => event('edit', { file, tool: 'Edit' }, { agent: { id: 'cc-a', kind: 'hook', client: 'claude-code', label: 'site', lane: 0 }, call: null, tool: null });
  const until = async (fn) => {
    for (let i = 0; i < 200 && !fn(); i++) await new Promise((r) => setTimeout(r, 10));
    await hub.idle();
  };
  try {
    await fetch(`${hub.url}ingest/shot?id=stage0003`, { method: 'POST', headers: { 'content-type': 'image/jpeg', [live.TOKEN_HEADER]: hub.token }, body: Buffer.from('img-h1') });
    await ingest(hub, event('stage', { url: 'http://localhost:5190/', width: 1440, height: 900, shot: 'stage0003', diagnosed: true }));
    await until(() => asked.length >= 1);

    mode = '500';
    const before = asked.length;
    await ingest(hub, hook('app/page.tsx'));
    await until(() => hub.events.some((e) => e.type === 'stage.error'));
    const err = hub.events.find((e) => e.type === 'stage.error');
    assert.ok(err, 'a stage.error was sent');
    assert.equal(asked.length - before, 2, 'it stopped at the second load with the same error, not after editTries');
    assert.equal(err.agent.id, 'hub');
    assert.equal(err.data.of, hub.events.find((e) => e.type === 'stage').seq);
    assert.equal(err.data.status, 500);
    assert.equal(err.data.message, 'got a server error page (HTTP 500, title "Error") instead of the site at http://localhost:5190/');
    assert.deepEqual([err.data.file, err.data.tool, err.data.agent.id], ['app/page.tsx', 'Edit', 'cc-a']);
    assert.deepEqual(err.data.edits.map((x) => x.file), ['app/page.tsx']);
    assert.ok(!hub.events.some((e) => e.type === 'stage.patch'), 'no patch for a page that did not load');

    // A dev server that is down: the browser's error, short.
    mode = 'down';
    await ingest(hub, hook('app/layout.tsx'));
    await until(() => hub.events.filter((e) => e.type === 'stage.error').length >= 2);
    const down = hub.events.filter((e) => e.type === 'stage.error')[1];
    assert.deepEqual([down.data.status, down.data.message, down.data.file], [null, 'net::ERR_CONNECTION_REFUSED at http://localhost:5190/', 'app/layout.tsx']);

    // The fix: compared with the load before the page broke, so the region is the change since then.
    mode = 'good';
    hero = 'h2';
    await ingest(hub, hook('app/page.tsx'));
    await until(() => hub.events.some((e) => e.type === 'stage.patch'));
    const patch = hub.events.find((e) => e.type === 'stage.patch');
    assert.ok(patch?.data.shot, 'the page that loads again is a patch with its picture');
    assert.deepEqual(patch.data.changed.map((r) => [r.rect.y, r.kind]), [[0, 'changed']]);
  } finally {
    await hub.close();
  }
});

test('the engine refresher answers an error page and a server that is down with the error, not a picture', { timeout: 60000 }, async () => {
  const page503 = readFileSync(new URL('./fixtures/load-503.html', import.meta.url));
  const { createServer } = await import('node:http');
  const srv = createServer((req, res) => res.writeHead(503, { 'content-type': 'text/html; charset=utf-8' }).end(page503));
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const refresher = engineRefresher();
  try {
    const broken = await refresher.snapshot({ url: `http://127.0.0.1:${srv.address().port}/`, width: 1440, height: 900 });
    assert.equal(broken.image, undefined);
    assert.equal(broken.error.status, 503);
    assert.equal(broken.error.reason, 'http-error');
    assert.match(broken.error.message, /^got a server error page \(HTTP 503/);
    assert.ok(broken.error.message.length <= 160);
    const port = srv.address().port;
    await new Promise((r) => srv.close(r));
    const down = await refresher.snapshot({ url: `http://127.0.0.1:${port}/`, width: 1440, height: 900 });
    assert.equal(down.error.status, null);
    assert.match(down.error.message, /ERR_CONNECTION_REFUSED/);
    assert.doesNotMatch(down.error.message, /\n|^page\.goto/);
  } finally {
    srv.close();
    await refresher.close();
  }
});

// Head of line: an edit with no visible change used to run its whole retry window while the next edit waited, and the
// next edit's change, landing during those retries, went to the first edit's file. Now a newer edit ends that wait
// (a no-change patch for the first edit, marked superseded) and the change goes to the newer edit; an edit that comes
// in while the load showing a change runs joins that patch, matched to its regions by file name.
test('a newer edit ends the wait of an edit with no visible change and gets the change itself', async () => {
  const el = (k, p, r, s, extra = {}) => ({ k, p, t: 'div', id: '', c: [], r, s, x: '', ...extra });
  const dom = (pricing, hero = 'h1') => ({
    width: 1440,
    height: 1600,
    truncated: false,
    nodes: [el('html>body:0', -1, [0, 0, 1440, 1600], 'b'), el('html>body:0>header#hero', 0, [0, 0, 1440, 500], hero, { id: 'hero' }), el('html>body:0>section#pricing', 0, [0, 900, 1440, 500], pricing, { id: 'pricing' })],
  });
  let state = { pricing: 'p1', hero: 'h1' };
  let onLoad = null;
  const asked = [];
  const refresher = {
    run: async () => null,
    snapshot: async () => {
      asked.push({ ...state });
      if (onLoad) await onLoad();
      const d = dom(state.pricing, state.hero);
      return { image: Buffer.from(`${state.pricing}${state.hero}`), type: 'image/jpeg', shotSize: { width: 1440, height: 1600 }, dom: d, findings: [], counts: {} };
    },
  };
  const tries = 8;
  const hub = await startHub({ port: 0, discovery: discovery(), viewerDir, refresher, editDebounce: 30, editRetry: 40, editTries: tries, baselineDelay: 10, baselineLoads: 1 });
  const hook = (id, file) => event('edit', { file, tool: 'Edit' }, { agent: { id, kind: 'hook', client: 'claude-code', label: 'site', lane: 0 }, call: null, tool: null });
  const patches = () => hub.events.filter((e) => e.type === 'stage.patch');
  const until = async (fn) => {
    for (let i = 0; i < 300 && !fn(); i++) await new Promise((r) => setTimeout(r, 10));
  };
  try {
    await fetch(`${hub.url}ingest/shot?id=stage0004`, { method: 'POST', headers: { 'content-type': 'image/jpeg', [live.TOKEN_HEADER]: hub.token }, body: Buffer.from('p1h1') });
    await ingest(hub, event('stage', { url: 'http://localhost:5190/', width: 1440, height: 900, shot: 'stage0004', diagnosed: true }));
    await until(() => asked.length >= 1);
    await hub.idle();

    // A changes nothing the page shows. Once its first load is in, B edits the pricing, and the dev server shows it.
    const start = asked.length;
    await ingest(hub, hook('cc-a', 'notes/todo.md'));
    await until(() => asked.length > start);
    state = { ...state, pricing: 'p2' };
    await ingest(hub, hook('cc-b', 'components/pricing.tsx'));
    await until(() => patches().length >= 2);
    await hub.idle();
    const [a, b] = patches();
    assert.deepEqual(a.data.edits.map((x) => x.file), ['notes/todo.md']);
    assert.equal(a.data.shot, null, 'no visible change for the edit that showed none');
    assert.deepEqual(a.data.changed, []);
    assert.equal(a.data.superseded, true);
    assert.deepEqual(b.data.edits.map((x) => x.file), ['components/pricing.tsx']);
    assert.equal(b.data.file, 'components/pricing.tsx');
    assert.equal(b.data.superseded, undefined);
    assert.ok(b.data.shot);
    assert.deepEqual(b.data.changed.map((r) => [r.rect.y, r.edit]), [[900, 0]], 'the pricing region goes with the pricing edit');
    assert.ok(asked.length - start < tries, `the first edit did not run its whole retry window (${asked.length - start} loads)`);

    // C edits the hero; D comes in while the load that shows a change is still running: one patch for both, each
    // region matched to its edit by file name.
    const before = patches().length;
    onLoad = async () => {
      if (state.hero !== 'h1') return;
      onLoad = null;
      state = { ...state, hero: 'h2', pricing: 'p3' };
      await ingest(hub, hook('cc-b', 'components/pricing.tsx'));
    };
    await ingest(hub, hook('cc-a', 'components/hero.tsx'));
    await until(() => patches().length > before);
    await new Promise((r) => setTimeout(r, 120));
    await hub.idle();
    const joined = patches().slice(before);
    assert.equal(joined.length, 1, 'one patch for the two edits');
    assert.deepEqual(joined[0].data.edits.map((x) => x.file), ['components/hero.tsx', 'components/pricing.tsx']);
    assert.deepEqual(joined[0].data.changed.map((r) => [r.rect.y, joined[0].data.edits[r.edit].file]), [[0, 'components/hero.tsx'], [900, 'components/pricing.tsx']]);
  } finally {
    await hub.close();
  }
});
