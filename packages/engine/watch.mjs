// `taster watch`: the local hub the live viewer runs on. Agents running Taster tools (the MCP server, the ACP agent,
// the CLI) send what they do to it through packages/engine/live.mjs; a browser tab opened on it draws the page each
// diagnose measured with a cursor per agent flying to the real findings, swaps, component adds and token tunes.
//
// One process, one port on 127.0.0.1 (default 47474, --port 0 for any free one), no dependencies:
//   GET  /api/hello        { app, v, pid }: how the engine checks the hub in the discovery file is this one
//   POST /ingest           events from the engine (JSON, one or a list), with the ingest token header
//   POST /ingest/shot?id=  a stage picture (JPEG or PNG) for an event to name, with the ingest token header
//   GET  /events?k=        the event stream (SSE) for the viewer, replaying recent events to a late tab
//   GET  /shot/<id>?k=     a stage picture
//   GET  /                 the viewer (packages/engine/viewer/), under a strict content security policy
// After a change (component.add, system.tuned, a plan check) the hub opens the last local stage again every 2.5
// seconds, up to 8 times, until the picture differs, and sends it as stage.refresh with the findings measured on it; the
// viewer crossfades and marks the rules that are gone as resolved. Only local pages (file:, localhost, 127.0.0.1) are
// opened again: that is where the edits land, and a public site is not loaded over and over.
// The ingest token is in the discovery file only (os.tmpdir()/taster-live-<uid>.json, mode 0600, removed on exit);
// the viewer key is in the URL the hub prints. Every request must name this host and port in Host (DNS rebinding), a
// request from any other origin is refused, and no response carries CORS headers. SECURITY.md has the threat model.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { TOKEN_HEADER, VERSION, discoveryFile, readDiscovery } from './live.mjs';

export const DEFAULT_PORT = 47474;
const VIEWER_DIR = fileURLToPath(new URL('./viewer/', import.meta.url));
const MAX_EVENTS = 3000;
const MAX_REPLAY_BYTES = 48 * 1024 * 1024;
const MAX_BODY = 4 * 1024 * 1024;
const MAX_EVENT = 1024 * 1024;
const MAX_SHOT = 8 * 1024 * 1024;
const MAX_SHOTS = 40;
const MAX_CLIENTS = 16;
const HEARTBEAT_MS = 15000;
const REFRESH_EVERY = 2500;
const REFRESH_TRIES = 8;
const BROWSER_IDLE = 60000;
// The events after which the page on the stage has probably changed.
const CHANGES = (e) => e.type === 'component.add' || e.type === 'system.tuned' || (e.type === 'plan' && (e.data?.event === 'check' || e.data?.recorded?.type === 'check'));

// The viewer's own files, and nothing else from disk.
const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/viewer.js': ['viewer.js', 'text/javascript; charset=utf-8'],
  '/viewer.css': ['viewer.css', 'text/css; charset=utf-8'],
};
export const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cross-origin-resource-policy': 'same-origin',
  'cross-origin-opener-policy': 'same-origin',
  'x-frame-options': 'DENY',
};
const TYPE = /^[a-z][a-z0-9]*(\.[a-z0-9]+)*$/;
const SHOT_ID = /^[a-z0-9]{8,64}$/;

const same = (a, b) => {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
};

/** The pid in a discovery file is a live process and its hub answers: a second hub must not take over. */
async function running(file) {
  const info = readDiscovery(file);
  if (!info) return null;
  try {
    const res = await fetch(`http://127.0.0.1:${info.port}/api/hello`, { signal: AbortSignal.timeout(800) });
    const body = await res.json();
    return body?.app === 'taster-watch' && body.pid === info.pid ? info : null;
  } catch {
    return null;
  }
}

function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > max) {
        reject(Object.assign(new Error('too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** A page the hub may open again: a local file or a server on this machine. */
export function isLocalPage(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'file:' || (/^https?:$/.test(u.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname));
  } catch {
    return false;
  }
}

/**
 * The default stage refresher: the engine's own browser and detector (packages/engine/diagnose.mjs), loaded on first
 * use, with the browser closed after a minute without work. run() answers { image, type, findings, counts, page }, or
 * null for a page that did not open as the site.
 */
export function engineRefresher() {
  let browser = null;
  let idle = null;
  let engine = null;
  const close = async () => {
    clearTimeout(idle);
    const b = browser;
    browser = null;
    await b?.close().catch(() => {});
  };
  return {
    async run({ url, width, height, colorScheme }) {
      engine ||= await import('./diagnose.mjs');
      // The same checks a target passes in the engine (local files: pages only, inside TASTER_ROOT when set).
      const target = engine.toUrl(url);
      clearTimeout(idle);
      browser ||= await engine.launch();
      try {
        const run = await engine.detectOnce(browser, target, { width, height: height || (width < 768 ? 844 : 900) }, { stageShot: true, ...(colorScheme ? { colorScheme } : {}) });
        if (!run.load?.diagnosed || !run.stage) return null;
        return { image: run.stage.image, type: run.stage.type, shotSize: { width: run.stage.width, height: run.stage.height }, findings: engine.liveFindings(run), counts: run.counts || {}, page: run.page };
      } finally {
        idle = setTimeout(close, BROWSER_IDLE);
        idle.unref();
      }
    },
    close,
  };
}

/** An event from the engine as the hub keeps it, or null when it is not one. */
export function cleanEvent(e) {
  if (!e || typeof e !== 'object' || Array.isArray(e) || e.v !== VERSION) return null;
  if (typeof e.type !== 'string' || e.type.length > 40 || !TYPE.test(e.type)) return null;
  const a = e.agent;
  if (!a || typeof a !== 'object' || typeof a.id !== 'string' || !a.id || a.id.length > 120) return null;
  const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : null);
  const out = {
    v: VERSION,
    n: Number.isInteger(e.n) ? e.n : 0,
    t: Number.isFinite(e.t) ? e.t : Date.now(),
    agent: { id: a.id, kind: str(a.kind, 10) || 'cli', client: str(a.client, 60), label: str(a.label, 60), lane: Number.isInteger(a.lane) && a.lane >= 0 && a.lane < 64 ? a.lane : 0 },
    call: str(e.call, 80),
    tool: str(e.tool, 40),
    type: e.type,
    data: e.data && typeof e.data === 'object' ? e.data : {},
  };
  return Buffer.byteLength(JSON.stringify(out)) <= MAX_EVENT ? out : null;
}

/**
 * Start the hub. Resolves once it listens and the discovery file is written.
 * @param {{ port?: number, discovery?: string, viewerDir?: string, onEvent?: (event: object) => void, refresher?: { run: Function, close?: Function } | null, refreshEvery?: number, refreshTries?: number }} [options]
 *   discovery: where to write the discovery file (default live.mjs discoveryFile()); onEvent sees every event kept;
 *   refresher: opens the last stage again after a change (engineRefresher(); null turns refreshing off).
 * @returns {Promise<{ port: number, url: string, viewUrl: string, key: string, token: string, publish: (type: string, data: object) => object, shot: (image: Buffer, type?: string) => string, close: () => Promise<void>, events: object[] }>}
 */
export async function startHub({ port = DEFAULT_PORT, discovery = discoveryFile(), viewerDir = VIEWER_DIR, onEvent, refresher = engineRefresher(), refreshEvery = REFRESH_EVERY, refreshTries = REFRESH_TRIES } = {}) {
  const other = await running(discovery);
  if (other) throw Object.assign(new Error(`taster watch is already running at http://127.0.0.1:${other.port}/ (pid ${other.pid})`), { code: 'RUNNING' });

  const token = randomBytes(32).toString('hex');
  const key = randomBytes(24).toString('hex');
  const events = [];
  let bytes = 0;
  let seq = 0;
  const shots = new Map();
  const clients = new Set();
  let bound = port;

  const allowedHosts = () => new Set([`127.0.0.1:${bound}`, `localhost:${bound}`]);
  const allowedOrigins = () => new Set([`http://127.0.0.1:${bound}`, `http://localhost:${bound}`]);

  // ---- the stage refresh: the last local stage, opened again after a change until its picture differs ----
  const hashOf = (image) => createHash('sha256').update(image).digest('hex');
  let stage = null;
  const refresh = { tries: 0, running: null, closed: false };
  const refreshLoop = async () => {
    while (!refresh.closed && stage && refresh.tries < refreshTries) {
      refresh.tries++;
      await new Promise((r) => setTimeout(r, refreshEvery).unref?.());
      if (refresh.closed || !stage) return;
      const target = stage;
      let got = null;
      try {
        got = await refresher.run({ url: target.url, width: target.width, height: target.height, colorScheme: target.colorScheme });
      } catch {
        got = null;
      }
      if (!got?.image || refresh.closed) continue;
      const hash = hashOf(got.image);
      if (hash === target.hash) continue;
      target.hash = hash;
      const id = storeShot(`h${Date.now().toString(36)}${randomBytes(6).toString('hex')}`, got.image, got.type || 'image/jpeg');
      publishHub('stage.refresh', { of: target.seq, url: target.url, width: target.width, shot: id, shotSize: got.shotSize || null, page: got.page || null, findings: got.findings || [], counts: got.counts || {}, attempt: refresh.tries });
      return;
    }
  };
  const scheduleRefresh = () => {
    if (!refresher || !stage) return;
    refresh.tries = 0;
    refresh.running ||= refreshLoop().finally(() => {
      refresh.running = null;
    });
  };
  const watchStage = (event) => {
    const d = event.data;
    if (event.type === 'stage') {
      // The widest width of a diagnose is the one the viewer shows first, so it is the one refreshed. A newer
      // diagnose of a page that is not local, or not the site, leaves nothing to refresh.
      if (stage && stage.call === event.call && stage.width >= d.width) return;
      const shot = typeof d.shot === 'string' ? shots.get(d.shot) : null;
      stage = d.diagnosed !== false && shot && isLocalPage(d.url) ? { seq: event.seq, call: event.call, url: d.url, width: d.width, height: d.height, colorScheme: d.colorScheme || null, hash: hashOf(shot.image) } : null;
    } else if (CHANGES(event)) scheduleRefresh();
  };

  const keep = (event) => {
    event.seq = ++seq;
    const text = JSON.stringify(event);
    events.push({ event, text });
    bytes += text.length;
    while (events.length > MAX_EVENTS || bytes > MAX_REPLAY_BYTES) bytes -= events.shift().text.length;
    for (const res of clients) res.write(`id: ${event.seq}\ndata: ${text}\n\n`);
    if (event.agent.id !== 'hub') watchStage(event);
    try {
      onEvent?.(event);
    } catch {
      // a listener's fault is not the hub's
    }
    return event;
  };
  const storeShot = (id, image, type) => {
    shots.set(id, { image, type });
    while (shots.size > MAX_SHOTS) shots.delete(shots.keys().next().value);
    return id;
  };
  const hubAgent = { id: 'hub', kind: 'hub', client: null, label: 'taster watch', lane: 0 };
  const publishHub = (type, data) => keep({ v: VERSION, n: 0, t: Date.now(), agent: hubAgent, call: null, tool: null, type, data });

  const send = (res, status, body, type = 'application/json; charset=utf-8', extra = {}) => {
    res.writeHead(status, { ...HEADERS, 'content-type': type, 'cache-control': 'no-store', ...extra });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };

  const server = http.createServer(async (req, res) => {
    try {
      // DNS rebinding: a page on another name that resolves here still sends its own name in Host.
      if (!allowedHosts().has(String(req.headers.host || '').toLowerCase())) return send(res, 403, { error: 'host not allowed' });
      const origin = req.headers.origin;
      if (origin !== undefined && !allowedOrigins().has(origin)) return send(res, 403, { error: 'origin not allowed' });
      if (req.headers['sec-fetch-site'] === 'cross-site') return send(res, 403, { error: 'cross-site request' });
      const url = new URL(req.url, `http://127.0.0.1:${bound}`);
      const path = url.pathname;

      if (req.method === 'GET' && path === '/api/hello') return send(res, 200, { app: 'taster-watch', v: VERSION, pid: process.pid });

      if (req.method === 'POST' && (path === '/ingest' || path === '/ingest/shot')) {
        if (!same(req.headers[TOKEN_HEADER], token)) return send(res, 401, { error: 'token required' });
        const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        if (path === '/ingest/shot') {
          const id = url.searchParams.get('id') || '';
          if (!SHOT_ID.test(id)) return send(res, 400, { error: 'bad id' });
          if (type !== 'image/jpeg' && type !== 'image/png') return send(res, 415, { error: 'image/jpeg or image/png' });
          const image = await readBody(req, MAX_SHOT);
          storeShot(id, image, type);
          return send(res, 200, { ok: true });
        }
        if (type !== 'application/json') return send(res, 415, { error: 'application/json' });
        let body;
        try {
          body = JSON.parse((await readBody(req, MAX_BODY)).toString('utf8'));
        } catch (err) {
          if (err.status) throw err;
          return send(res, 400, { error: 'bad json' });
        }
        let kept = 0;
        for (const raw of Array.isArray(body) ? body : [body]) {
          const event = cleanEvent(raw);
          if (!event) continue;
          keep(event);
          kept++;
        }
        return send(res, 200, { kept });
      }

      if (req.method === 'GET' && (path === '/events' || path.startsWith('/shot/'))) {
        if (!same(url.searchParams.get('k'), key)) return send(res, 403, { error: 'open the address taster watch printed' });
        if (path.startsWith('/shot/')) {
          const shot = shots.get(path.slice(6));
          if (!shot) return send(res, 404, { error: 'no such picture' });
          return send(res, 200, shot.image, shot.type, { 'cache-control': 'private, max-age=3600, immutable' });
        }
        if (clients.size >= MAX_CLIENTS) return send(res, 503, { error: 'too many viewers' });
        res.writeHead(200, { ...HEADERS, 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', connection: 'keep-alive' });
        res.write('retry: 2000\n\n');
        // A late tab gets what it missed: after Last-Event-ID when it reconnects, else everything still kept.
        const since = Number(req.headers['last-event-id'] ?? url.searchParams.get('since') ?? 0) || 0;
        for (const { event, text } of events) if (event.seq > since) res.write(`id: ${event.seq}\ndata: ${text}\n\n`);
        res.write(`event: replayed\ndata: ${JSON.stringify({ seq })}\n\n`);
        clients.add(res);
        const beat = setInterval(() => res.write(': beat\n\n'), HEARTBEAT_MS);
        beat.unref();
        req.on('close', () => {
          clearInterval(beat);
          clients.delete(res);
        });
        return undefined;
      }

      if (req.method === 'GET' && STATIC[path]) {
        const [file, type] = STATIC[path];
        let body;
        try {
          body = readFileSync(`${viewerDir}${file}`);
        } catch {
          return send(res, 404, 'The viewer files are missing from this install.', 'text/plain; charset=utf-8');
        }
        return send(res, 200, body, type, { 'content-security-policy': CSP });
      }
      return send(res, req.method === 'GET' || req.method === 'POST' ? 404 : 405, { error: 'not found' });
    } catch (err) {
      if (!res.headersSent) send(res, err.status || 500, { error: err.status === 413 ? 'too large' : 'failed' });
      else res.destroy();
      return undefined;
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  bound = server.address().port;

  // The discovery file: a stale one of ours is replaced; 'wx' never writes through a file or link someone else put
  // there, and 0600 keeps the token from other accounts.
  try {
    const st = statSync(discovery);
    if (typeof process.getuid !== 'function' || st.uid === process.getuid()) rmSync(discovery, { force: true });
  } catch {
    // none yet
  }
  try {
    writeFileSync(discovery, JSON.stringify({ port: bound, token, pid: process.pid }), { mode: 0o600, flag: 'wx' });
  } catch (err) {
    await new Promise((r) => server.close(r));
    throw new Error(`Could not write ${discovery}: ${err.message}`);
  }

  // Only our own file is removed: a hub started after this one keeps its own.
  const forget = () => {
    try {
      if (JSON.parse(readFileSync(discovery, 'utf8')).token === token) rmSync(discovery, { force: true });
    } catch {
      // already gone
    }
  };
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    refresh.closed = true;
    forget();
    await refresher?.close?.();
    for (const res of clients) res.end();
    clients.clear();
    await new Promise((r) => server.close(r));
  };

  const url = `http://127.0.0.1:${bound}/`;
  return {
    port: bound,
    url,
    viewUrl: `${url}#k=${key}`,
    key,
    token,
    get events() {
      return events.map((e) => e.event);
    },
    forget,
    /** An event from the hub itself (agent id "hub"), such as a refreshed stage. */
    publish: publishHub,
    /** Keep a picture taken by the hub; returns its id. */
    shot: (image, type = 'image/jpeg') => storeShot(`h${Date.now().toString(36)}${randomBytes(6).toString('hex')}`, image, type),
    getShot: (id) => shots.get(id) || null,
    close,
  };
}

const USAGE = `Usage: taster watch [--port <n>]

Starts the live viewer on http://127.0.0.1:${DEFAULT_PORT}/ (--port 0 picks a free port) and prints its address.
Open that address in a browser, then run Taster tools from an agent (Claude Code, Codex, Cursor over MCP, an editor
over ACP) or the CLI in this account: each call shows up as it happens. Ctrl+C stops it.`;

/** The `taster watch` command. Resolves with the exit code once the hub stops (Ctrl+C), or at once on an error. */
export async function watchCommand(argv = []) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE);
    return 0;
  }
  let port = DEFAULT_PORT;
  const at = argv.indexOf('--port');
  if (at >= 0) {
    port = Number(argv[at + 1]);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      console.error(`taster watch: bad --port ${argv[at + 1] ?? ''}\n\n${USAGE}`);
      return 2;
    }
  }
  let hub;
  try {
    hub = await startHub({ port });
    process.once('exit', hub.forget);
  } catch (err) {
    const busy = err.code === 'EADDRINUSE' ? ` Port ${port} is taken; try --port 0.` : '';
    console.error(`taster watch: ${err.message}${busy}`);
    return 1;
  }
  console.log(`taster watch: open ${hub.viewUrl}`);
  console.log('Waiting for Taster tools to run (MCP server, ACP agent or CLI, as this user). Ctrl+C stops.');
  return new Promise((resolve) => {
    const stop = (code) => () => hub.close().then(() => resolve(code));
    process.once('SIGINT', stop(130));
    process.once('SIGTERM', stop(143));
  });
}
