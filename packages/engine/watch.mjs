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
// After an `edit` (an agent's PostToolUse hook, `taster live edit`, `taster add`), the hub waits for edits to stop for
// 400ms, opens the same local stage again, lists its elements (packages/engine/domdiff.mjs) and compares them with the
// capture before, retrying for a moment while the dev server has not reloaded yet. Right after a diagnose it loads the
// stage a few times with no edit, and the elements that differ between those loads (a rotating word, a clock, a ticker)
// are left out of every comparison on that stage. It sends stage.patch: the new picture, the regions that changed, the
// findings measured on the new load, and the edit (file and agent) each region goes with. The regions come from that
// comparison, not from tracing the edit to elements. An edit that shows nothing yet does not hold up the next one: when
// a newer edit comes in during its retries, it gets a patch with no change (superseded) and the next change goes to the
// newer edit. When the stage answers with an error (HTTP 5xx, a dev server that is down) after an edit, the hub stops
// retrying once the same error comes back twice and sends stage.error with the status, a short message and the edit
// before it; the viewer shows it on the stage until the next good load.
// The ingest token is in the discovery file only (os.tmpdir()/taster-live-<uid>.json, mode 0600, removed on exit);
// the viewer key is in the URL the hub prints. Every request must name this host and port in Host (DNS rebinding), a
// request from any other origin is refused, and no response carries CORS headers. SECURITY.md has the threat model.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { assignRegions, changedKeys, diffSnapshots } from './domdiff.mjs';
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
// Per edit: wait this long after the last edit, then capture; while nothing changed yet (the dev server is still
// rebuilding), capture again after EDIT_RETRY, up to EDIT_TRIES loads in all.
const EDIT_DEBOUNCE = 400;
const EDIT_RETRY = 700;
const EDIT_TRIES = 4;
const BASELINE_DELAY = 300;
// Loads of the stage right after a diagnose, with no edit between them: what differs between them changes by itself.
const BASELINE_LOADS = 3;
const MAX_EDITS = 20;
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

// What a load that failed says, short: the first line, without the "page.goto: " of a browser error.
const shortError = (text) => Array.from(String(text ?? '').split('\n')[0].replace(/^not diagnosed: /, '').replace(/^[a-z]+\.[a-z]+: /i, '')).slice(0, 160).join('');
/** A load error as the hub sends it: { status, reason, message }. */
export function loadError(e) {
  return {
    status: Number.isInteger(e?.status) ? e.status : null,
    reason: typeof e?.reason === 'string' ? e.reason.slice(0, 40) : 'failed',
    message: shortError(e?.message || 'the page did not load'),
  };
}

/**
 * The default stage refresher: the engine's own browser and detector (packages/engine/diagnose.mjs), loaded on first
 * use, with the browser closed after a minute without work. run() answers { image, type, findings, counts, page, dom }
 * (dom: the element list domdiff.mjs compares), or { error: { status, reason, message } } for a page that did not open
 * as the site (an HTTP error, a dev server that is down). snapshot() is the same call; a refresher that has it turns
 * on the per-edit view.
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
        let run;
        try {
          run = await engine.detectOnce(browser, target, { width, height: height || (width < 768 ? 844 : 900) }, { stageShot: true, domShot: true, ...(colorScheme ? { colorScheme } : {}) });
        } catch (err) {
          return { error: loadError({ reason: 'load', message: err?.message }) };
        }
        if (run.load && !run.load.diagnosed) return { error: loadError({ ...run.load, message: String(run.load.message || '').split('. ')[0] }) };
        if (!run.stage) return null;
        return { image: run.stage.image, type: run.stage.type, shotSize: { width: run.stage.width, height: run.stage.height }, findings: engine.liveFindings(run), counts: run.counts || {}, page: run.page, dom: run.dom || null };
      } finally {
        idle = setTimeout(close, BROWSER_IDLE);
        idle.unref();
      }
    },
    snapshot(stage) {
      return this.run(stage);
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
 * @param {{ port?: number, discovery?: string, viewerDir?: string, onEvent?: (event: object) => void, refresher?: { run: Function, snapshot?: Function, close?: Function } | null, refreshEvery?: number, refreshTries?: number, editDebounce?: number, editRetry?: number, editTries?: number, baselineDelay?: number }} [options]
 *   discovery: where to write the discovery file (default live.mjs discoveryFile()); onEvent sees every event kept;
 *   refresher: opens the last stage again after a change (engineRefresher(); null turns refreshing off), and with a
 *   snapshot() method after each edit too.
 * @returns {Promise<{ port: number, url: string, viewUrl: string, key: string, token: string, publish: (type: string, data: object) => object, shot: (image: Buffer, type?: string) => string, close: () => Promise<void>, events: object[], idle: () => Promise<void> }>}
 */
export async function startHub({ port = DEFAULT_PORT, discovery = discoveryFile(), viewerDir = VIEWER_DIR, onEvent, refresher = engineRefresher(), refreshEvery = REFRESH_EVERY, refreshTries = REFRESH_TRIES, editDebounce = EDIT_DEBOUNCE, editRetry = EDIT_RETRY, editTries = EDIT_TRIES, baselineDelay = BASELINE_DELAY, baselineLoads = BASELINE_LOADS } = {}) {
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
      // An edit was captured since the change: it already showed the new page. One being captured will.
      if (editing.lastPatch >= refresh.since) return;
      if (editing.pending.length || editing.busy) continue;
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
      if (got.dom && target === stage) editing.base = got;
      const id = storeShot(`h${Date.now().toString(36)}${randomBytes(6).toString('hex')}`, got.image, got.type || 'image/jpeg');
      publishHub('stage.refresh', { of: target.seq, url: target.url, width: target.width, shot: id, shotSize: got.shotSize || null, page: got.page || null, findings: got.findings || [], counts: got.counts || {}, attempt: refresh.tries });
      return;
    }
  };
  const scheduleRefresh = () => {
    if (!refresher || !stage) return;
    refresh.tries = 0;
    refresh.since = Date.now();
    refresh.running ||= refreshLoop().finally(() => {
      refresh.running = null;
    });
  };
  // ---- per edit: the stage captured again after each edit, compared with the capture before it ----
  // volatile: the paths that changed between loads with no edit; noisyImage: the picture differs between such loads
  // (WebGL, video, a clock), so an unchanged picture cannot tell that the dev server has not reloaded yet.
  const editing = { pending: [], timer: null, chain: Promise.resolve(), base: null, gen: 0, lastPatch: 0, busy: false, seen: 0, volatile: new Set(), noisyImage: false };
  const canSnap = () => Boolean(refresher && typeof refresher.snapshot === 'function');
  const later = (fn, ms) => setTimeout(fn, ms).unref?.();
  const wait = (ms) => new Promise((r) => later(r, ms));
  const inChain = (fn) => {
    editing.chain = editing.chain.then(fn).catch(() => {});
    return editing.chain;
  };
  // A load: the page with its elements, { error } when it answered with an error or did not load, or null.
  const snap = async (target) => {
    try {
      const got = await refresher.snapshot({ url: target.url, width: target.width, height: target.height, colorScheme: target.colorScheme });
      if (got?.error) return { error: loadError(got.error) };
      return got?.image && got.dom ? got : null;
    } catch (err) {
      return { error: loadError({ reason: 'failed', message: err?.message }) };
    }
  };
  const sameError = (a, b) => a.status === b.status && a.reason === b.reason && a.message === b.message;
  // The page as the diagnose left it, to compare the first edit with (the diagnose's own load is not kept), loaded
  // baselineLoads times: what differs between those loads changed by itself and is left out of the comparisons. A load
  // that an edit may have reached (one arrived while it ran) is not used, and stops the learning.
  const takeBaseline = () => {
    const gen = ++editing.gen;
    editing.base = null;
    editing.volatile = new Set();
    editing.noisyImage = false;
    if (!canSnap() || !stage) return;
    later(
      () =>
        inChain(async () => {
          let got = null;
          for (let i = 0; i < Math.max(1, baselineLoads); i++) {
            if (gen !== editing.gen || refresh.closed || !stage || editing.base) return;
            if (got && editing.pending.length) break;
            const seen = editing.seen;
            const next = await snap(stage);
            if (gen !== editing.gen) return;
            if (!next?.image) continue;
            if (got && editing.seen !== seen) break;
            if (got) {
              for (const k of changedKeys(got.dom, next.dom)) editing.volatile.add(k);
              if (hashOf(got.image) !== hashOf(next.image)) editing.noisyImage = true;
            }
            got = next;
          }
          if (got && gen === editing.gen && !editing.base) editing.base = got;
        }),
      baselineDelay,
    );
  };
  // Loads the stage until it differs from base (the dev server may still be rebuilding), editTries times at most.
  // error: the last load answered with an error; the same error twice in a row is the page broken, not still
  // reloading, so the retries stop there. superseded: a newer edit came in while these edits showed nothing, so their
  // wait ends and the next change goes to the newer edit, not to them. edits: the batch; an edit that comes in while a
  // load that shows a change runs joins it, since that load may show either.
  const captureUntilChanged = async (target, base, setRegions, edits) => {
    let got = null;
    let error = null;
    let superseded = false;
    for (let i = 0; i < editTries && !refresh.closed; i++) {
      if (i) await wait(editRetry);
      if (i && editing.pending.length) {
        superseded = true;
        break;
      }
      const seen = editing.seen;
      const next = await snap(target);
      if (next?.error) {
        const again = error && sameError(error, next.error);
        error = next.error;
        if (again) break;
        continue;
      }
      error = null;
      if (!next) continue;
      got = next;
      // With nothing to compare with, the whole new picture is the change.
      if (!base) break;
      const regions = diffSnapshots(base.dom, got.dom, { height: got.shotSize?.height || Infinity, ignore: editing.volatile });
      setRegions(regions);
      // On a page whose picture moves by itself, only the elements can say the reload has landed.
      if (regions.length || (!editing.noisyImage && hashOf(got.image) !== target.hash)) {
        if (editing.seen !== seen) edits.push(...editing.pending.splice(0));
        break;
      }
    }
    return { got, error, superseded };
  };
  const capturePatch = async () => {
    const edits = editing.pending.splice(0);
    const target = stage;
    if (!edits.length || !target || refresh.closed) return;
    const base = editing.base;
    let got = null;
    let error = null;
    let superseded = false;
    let regions = [];
    editing.busy = true;
    try {
      ({ got, error, superseded } = await captureUntilChanged(
        target,
        base,
        (r) => {
          regions = r;
        },
        edits,
      ));
    } finally {
      editing.busy = false;
    }
    if (refresh.closed || target !== stage) return;
    const list = edits.map((e) => ({ file: e.file, tool: e.tool, agent: e.agent }));
    const last = list.at(-1);
    // The page broke after the edit: say so with the edit, and keep the last good load to compare the fix with.
    if (error) {
      publishHub('stage.error', { of: target.seq, url: target.url, width: target.width, status: error.status, reason: error.reason, message: error.message, file: last.file, tool: last.tool, agent: last.agent, edits: list });
      return;
    }
    if (!got && !superseded) return;
    if (got) editing.base = got;
    editing.lastPatch = Date.now();
    const hash = got ? hashOf(got.image) : target.hash;
    const changed = Boolean(got) && (regions.length > 0 || ((!base || !editing.noisyImage) && hash !== target.hash));
    target.hash = hash;
    const shot = changed ? storeShot(`h${Date.now().toString(36)}${randomBytes(6).toString('hex')}`, got.image, got.type || 'image/jpeg') : null;
    publishHub('stage.patch', {
      of: target.seq,
      url: target.url,
      width: target.width,
      shot,
      shotSize: got?.shotSize || null,
      page: got?.page || null,
      file: last.file,
      tool: last.tool,
      agent: last.agent,
      edits: list,
      // Regions found by comparing the two loads; `edit` says which of the edits it is shown for.
      changed: assignRegions(regions, list).map(({ rect, kind, label, count, edit, guessed }) => ({ rect, kind, label, count, edit, guessed })),
      compared: Boolean(base),
      ...(superseded && { superseded: true }),
      ...(shot && { findings: got.findings || [], counts: got.counts || {} }),
    });
  };
  const onEdit = (event) => {
    if (!canSnap() || !stage) return;
    const d = event.data;
    const str = (v, n) => (typeof v === 'string' && v ? v.slice(0, n) : null);
    const file = str(d.file, 200);
    if (!file) return;
    const now = Date.now();
    editing.seen++;
    editing.pending.push({ file, tool: str(d.tool, 40), agent: event.agent, at: now });
    if (editing.pending.length > MAX_EDITS) editing.pending.splice(0, editing.pending.length - MAX_EDITS);
    clearTimeout(editing.timer);
    // Each edit waits for the next one a moment, but a steady stream of edits is still captured every few debounces.
    const delay = Math.max(0, Math.min(editDebounce, editing.pending[0].at + 4 * editDebounce - now));
    editing.timer = later(() => inChain(capturePatch), delay);
  };

  const watchStage = (event) => {
    const d = event.data;
    if (event.type === 'stage') {
      // The widest width of a diagnose is the one the viewer shows first, so it is the one refreshed. A newer
      // diagnose of a page that is not local, or not the site, leaves nothing to refresh.
      if (stage && stage.call === event.call && stage.width >= d.width) return;
      const shot = typeof d.shot === 'string' ? shots.get(d.shot) : null;
      stage = d.diagnosed !== false && shot && isLocalPage(d.url) ? { seq: event.seq, call: event.call, url: d.url, width: d.width, height: d.height, colorScheme: d.colorScheme || null, hash: hashOf(shot.image) } : null;
      takeBaseline();
    } else if (event.type === 'edit') onEdit(event);
    // `taster add` reports its files as an edit too, so with the per-edit view on, that edit shows the change.
    else if (CHANGES(event) && !(event.type === 'component.add' && canSnap())) scheduleRefresh();
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
    clearTimeout(editing.timer);
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
    /** Resolves once the edit captures queued so far are done (tests). */
    idle: () => editing.chain,
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
